import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import HLSPlayer from "../Pages/StreamPlayer";
import ChannelsSidebar from "./ChannelsSidebar";
import ChannelsDetails from "./ChannelsDetails";
import ChannelNumberDisplay, { findChannelByNumber } from "./Lcn";
import ChannelNumberPad from "./ChannelNumberPad";
import ChannelNotFound from "../error/Modules-Erros/ChannelNotFound";
import ChannelLocked from "../error/Modules-Erros/ChannelLocked";

import useLiveChannelsStore from "../store/LiveChannelsStore";
import { isSubscribed } from "../utils/subscription";
import { useDeviceInformation } from "../server/Deviceinformaction/LG-Devicesinformaction";
import { postTrpData } from "../server/modules-api/trpdata";
import { fetchFreshStream } from "../server/modules-api/StreamApi";
import { fetchStreamAd } from "../server/modules-api/StreamAdsApi";
import { useTapAction } from "../Remote/useTapAction";
import { backFromPlayer } from "../utils/navigation";

// Surf-mode state machine timings (DTH-style hold-to-fast-forward).
//   HOLD_ARM_MS    — 2nd same-direction keydown within this window after the
//                    1st step transitions us into HOLDING (interval-driven).
//   SURF_STEP_MS   — step interval while HOLDING (~5 channels/sec).
//   KEY_ABSENCE_MS — gap with no keydown of the active arrow → release. Covers
//                    webOS firmwares that drop `keyup` events.
//   ZAP_SETTLE_MS  — pause after the last step before HLS commit / park.
//   PARKED_IDLE_MS — continuous idle on a locked-parked channel before the
//                    ChannelLocked modal auto-opens.
// Full design: docs/plans/2026-04-30-dth-channel-surf-hold-design.md
const HOLD_ARM_MS    = 180;
const SURF_STEP_MS   = 200;
const KEY_ABSENCE_MS = 350;
const ZAP_SETTLE_MS  = 250;
const PARKED_IDLE_MS = 1500;

const getStreamUrl = (channel) => {
  if (!channel) return "";
  return (
    channel.streamlink  || channel.stream_link || channel.streamurl  ||
    channel.stream_url  || channel.url         || channel.link       ||
    channel.videourl    || channel.video_url   || channel.hlsurl     ||
    channel.hls_url     || channel.manifest    || channel.manifesturl || ""
  );
};

const INFOBAR_MS = 8000;
const MENU_MS    = 10000;
const NUMPAD_MS  = 10000;

const LivePlayer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { streamlink: initialStreamlink, channelData } = location.state || {};

  const [currentStream,  setCurrentStream]  = useState(initialStreamlink || "");
  const [currentChannel, setCurrentChannel] = useState(channelData || null);
  const [pendingChannel, setPendingChannel] = useState(null);
  const pendingChannelRef = useRef(null);
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [isNumberPadVisible, setIsNumberPadVisible] = useState(false);
  const [channelsList,   setChannelsList]   = useState([]);
  const [localError,     setLocalError]     = useState("");
  const [typedChannelNumber, setTypedChannelNumber] = useState("");
  const [channelNotFound, setChannelNotFound] = useState("");
  const [lockedChannel, setLockedChannel] = useState(null); // ChannelLocked modal payload
  const [streamAd, setStreamAd] = useState(null); // /streamAds overlay payload (BBNL row 21)

  const { fetchChannels, getChannelByNumber } = useLiveChannelsStore();

  const detailsTimer   = useRef(null);
  const sidebarTimer   = useRef(null);
  const numpadTimer    = useRef(null);
  const numberBuffer   = useRef("");
  const numberTimer    = useRef(null);
  const lastTrpStream  = useRef("");

  // ── Surf state-machine refs (DTH-style hold-to-fast-forward) ───────────
  // All refs — zero React state churn during a hold. Drives `pendingChannel`
  // directly; the existing zap-settle effect commits HLS after the last step.
  const surfStateRef         = useRef("idle"); // "idle" | "stepping" | "holding"
  const surfDirRef           = useRef(0);      // +1 | -1 | 0
  const holdArmTimerRef      = useRef(null);
  const surfIntervalRef      = useRef(null);
  const keyAbsenceTimerRef   = useRef(null);
  // Parked-idle popup (option B in the design): land on a locked channel,
  // wait for true idle, only then surface the modal. `popupShownForLockedRef`
  // tracks the chid we already popped so we don't loop the modal after the
  // user dismisses and stays parked.
  const parkedIdleTimerRef   = useRef(null);
  const popupShownForLockedRef = useRef("");

  // Stable refs — keyboard handler reads these, never stale
  const sidebarRef           = useRef(false);
  const detailsRef           = useRef(false);
  const numpadRef            = useRef(false);
  const channelNotFoundRef   = useRef(false);
  const lockedRef            = useRef(false);
  const chListRef            = useRef([]);
  const curChRef             = useRef(null);

  useEffect(() => { sidebarRef.current  = isSidebarOpen; }, [isSidebarOpen]);
  useEffect(() => { detailsRef.current  = isDetailsVisible; }, [isDetailsVisible]);
  useEffect(() => { numpadRef.current   = isNumberPadVisible; }, [isNumberPadVisible]);
  useEffect(() => { channelNotFoundRef.current = !!channelNotFound; }, [channelNotFound]);
  useEffect(() => { lockedRef.current   = !!lockedChannel; }, [lockedChannel]);
  useEffect(() => { chListRef.current  = channelsList; }, [channelsList]);
  useEffect(() => { curChRef.current   = currentChannel; }, [currentChannel]);
  useEffect(() => { pendingChannelRef.current = pendingChannel; }, [pendingChannel]);

  // "Parked on a locked channel" — derived flag, no separate state. True when
  // we have a channel context but no subscription and no active stream. Used
  // to (a) pin the info bar persistently, (b) render the Locked badge, (c)
  // suppress info-bar auto-hide timers and the RIGHT-key info toggle, and
  // (d) skip /streamAds polling.
  const isLockedParked = !!(currentChannel && !isSubscribed(currentChannel) && !currentStream);
  const isLockedParkedRef = useRef(false);
  useEffect(() => { isLockedParkedRef.current = isLockedParked; }, [isLockedParked]);

  // ── Simple timer start/stop ──────────────────────────────────────────────
  const stop = useCallback((ref) => { if (ref.current) { clearTimeout(ref.current); ref.current = null; } }, []);

  // Drop out of any active surf state and clear hold/keyup timers. Leaves
  // `pendingChannel` intact so the zap-settle effect commits whatever channel
  // the user landed on. Called on keyup, on KEY_ABSENCE_MS gap, on direction
  // reversal cleanup, and when any non-UP/DOWN key arrives mid-surf.
  const exitSurfState = useCallback(() => {
    if (surfIntervalRef.current) {
      clearInterval(surfIntervalRef.current);
      surfIntervalRef.current = null;
    }
    stop(holdArmTimerRef);
    stop(keyAbsenceTimerRef);
    surfStateRef.current = "idle";
    surfDirRef.current = 0;
  }, [stop]);

  // ── INFO BAR: show with auto-hide, or just hide ─────────────────────────
  // When parked on a locked channel the bar is pinned by `isLockedParked` in
  // the render block (`visible={isDetailsVisible || isLockedParked}`), so
  // these helpers short-circuit the auto-hide timer and the explicit-hide
  // path. That keeps the bar — and its Locked badge — on screen as long as
  // the user is sitting on an unsubscribed channel.
  const showInfo = useCallback(() => {
    stop(detailsTimer);
    setIsDetailsVisible(true);
    if (isLockedParkedRef.current) return;
    detailsTimer.current = setTimeout(() => {
      setIsDetailsVisible(false);
      detailsTimer.current = null;
    }, INFOBAR_MS);
  }, [stop]);

  const hideInfo = useCallback(() => {
    if (isLockedParkedRef.current) return;
    stop(detailsTimer);
    setIsDetailsVisible(false);
  }, [stop]);

  // ── SIDEBAR: open/close with idle auto-hide ─────────────────────────────
  const startMenuTimer = useCallback(() => {
    stop(sidebarTimer);
    sidebarTimer.current = setTimeout(() => {
      setIsSidebarOpen(false);
      sidebarTimer.current = null;
      // When menu auto-hides, show info bar briefly then hide it
      stop(detailsTimer);
      setIsDetailsVisible(true);
      detailsTimer.current = setTimeout(() => {
        setIsDetailsVisible(false);
        detailsTimer.current = null;
      }, INFOBAR_MS);
    }, MENU_MS);
  }, [stop]);

  const openMenu = useCallback(() => {
    setIsSidebarOpen(true);
    setIsDetailsVisible(true);
    stop(detailsTimer);
    startMenuTimer();
  }, [stop, startMenuTimer]);

  const closeMenu = useCallback(() => {
    setIsSidebarOpen(false);
    stop(sidebarTimer);
    showInfo();
  }, [stop, showInfo]);

  // ── NUMBER PAD ──────────────────────────────────────────────────────────
  const showNumpadDigitMode = useCallback(() => {
    // Used while user is typing digits via the remote (not the on-screen pad).
    // Only the floating ChannelNumberDisplay badge is shown in this mode.
    stop(numpadTimer);
    numpadTimer.current = setTimeout(() => {
      setTypedChannelNumber("");
      numberBuffer.current = "";
      numpadTimer.current = null;
    }, NUMPAD_MS);
  }, [stop]);

  const hideNumpad = useCallback(() => {
    setIsNumberPadVisible(false);
    setTypedChannelNumber("");
    numberBuffer.current = "";
    stop(numpadTimer);
  }, [stop]);

  // ── CHANNEL SELECT ──────────────────────────────────────────────────────
  // Subscription gate: locked channels are PARKED on the player rather than
  // bouncing the user away. We tear down any active HLS, swap the visible
  // channel context to the locked one, and open the modal. Dismissing the
  // modal leaves the user parked here with the info bar pinned (see render
  // block) — they can press OK to open the menu, type digits, channel-up/
  // down, etc., just like a normal channel; only the stream pipe is silent.
  const selectChannelRaw = useCallback((channel) => {
    setPendingChannel(null);
    if (channel && !isSubscribed(channel)) {
      // Re-selecting the locked channel we're already parked on is a no-op,
      // matching the same-URL early-return for subscribed channels below.
      const cur = curChRef.current;
      const sameLocked = cur && !currentStream && (
        (cur.channelid && channel.channelid && String(cur.channelid) === String(channel.channelid)) ||
        (cur.channelno && channel.channelno && String(cur.channelno) === String(channel.channelno))
      );
      if (sameLocked) return;
      setCurrentStream("");
      setCurrentChannel(channel);
      setLockedChannel(channel);
      setLocalError("");
      return;
    }
    const url = getStreamUrl(channel);
    if (!url) { setLocalError("No stream URL found."); return; }
    // PERF: avoid pushing the same URL again — prevents StreamPlayer from
    // tearing down + recreating its HLS instance on a no-op switch.
    if (url === currentStream) {
      setCurrentChannel(channel);
      setLocalError("");
      return;
    }
    setLocalError("");
    setCurrentStream(url);
    setCurrentChannel(channel);
  }, [currentStream]);
  const selectChannel = useTapAction(selectChannelRaw);

  // From sidebar: play channel, close sidebar after 1s, show info bar with timer
  const onSidebarSelect = useCallback((channel) => {
    selectChannel(channel);
    stop(sidebarTimer);
    sidebarTimer.current = setTimeout(() => {
      setIsSidebarOpen(false);
      sidebarTimer.current = null;
      // Now show info bar with auto-hide
      stop(detailsTimer);
      setIsDetailsVisible(true);
      detailsTimer.current = setTimeout(() => {
        setIsDetailsVisible(false);
        detailsTimer.current = null;
      }, INFOBAR_MS);
    }, 1000);
  }, [selectChannel, stop]);

  // ── CHANNEL STEP (up/down arrows) ──────────────────────────────────────
  const findChIndex = (ch) => {
    const list = chListRef.current;
    if (!ch || !list.length) return -1;
    return list.findIndex((item) => {
      if (ch.channelno && item.channelno) return String(item.channelno) === String(ch.channelno);
      if (ch.channelid && item.channelid) return String(item.channelid) === String(ch.channelid);
      return item.streamlink && ch.streamlink && item.streamlink === ch.streamlink;
    });
  };

  // ↑/↓ stepping advances by exactly one position regardless of subscription.
  // The 300 ms zap-settle effect below is the single gate that decides what
  // happens when the user lands somewhere: subscribed → start the stream,
  // locked → park + open modal. Holding the channel key through a stretch of
  // locked channels collapses to ONE modal at the end (the debounce eats all
  // intermediate keypresses) so this is not modal-spammy in practice.
  const stepChannel = useCallback((dir) => {
    const list = chListRef.current;
    if (!list.length) return;
    // Walk from the pending channel if we're mid-zap, otherwise from current.
    const startFromCh = pendingChannelRef.current || curChRef.current;
    const cur = findChIndex(startFromCh);
    const i = cur === -1 ? 0 : (cur + dir + list.length) % list.length;
    setPendingChannel(list[i]);
  }, []);

  // Zap-and-settle: when pendingChannel changes via UP/DOWN, wait
  // ZAP_SETTLE_MS after the last keypress before committing (HLS reload).
  // Holding DOWN through 5 channels = 1 stream load, not 5.
  useEffect(() => {
    if (!pendingChannel) return;
    if (pendingChannel === currentChannel) return;
    const t = setTimeout(() => {
      if (!isSubscribed(pendingChannel)) {
        // Park silently on the locked channel — the info bar stays pinned
        // with the Locked badge, but we do NOT open the modal here. The
        // parked-idle effect surfaces the modal after PARKED_IDLE_MS of true
        // idle, so a hold that scrolls THROUGH locked channels never
        // interrupts. Surf-driven settles only.
        setCurrentStream("");
        setCurrentChannel(pendingChannel);
        setPendingChannel(null);
        setLocalError("");
        return;
      }
      const url = getStreamUrl(pendingChannel);
      if (!url) { setLocalError("No stream URL found."); return; }
      setLocalError("");
      setCurrentChannel(pendingChannel);
      setCurrentStream(url);
      setPendingChannel(null);
    }, ZAP_SETTLE_MS);
    return () => clearTimeout(t);
  }, [pendingChannel, currentChannel]);

  // Show info bar while zapping so the user sees the channel they're
  // scrolling toward (logo, name, number, EPG line) before HLS commits.
  useEffect(() => {
    if (pendingChannel && pendingChannel !== currentChannel) {
      showInfo();
    }
  }, [pendingChannel, currentChannel, showInfo]);

  // Parked-idle popup — option B: when the user lands (and stays) on a
  // locked channel for PARKED_IDLE_MS without any input, surface the
  // ChannelLocked modal. Reset on every keypress (keyboard handler kills
  // `parkedIdleTimerRef` on any key while parked) and on park-channel
  // change. `popupShownForLockedRef` ensures we don't re-pop after the user
  // dismisses and stays sitting on the same locked channel — one shot per
  // landing.
  useEffect(() => {
    if (!isLockedParked || !currentChannel) {
      // Left the locked-park state (channel switched to subscribed, channel
      // cleared, etc). Forget which chid we already popped for — next time
      // the user lands on a locked channel, it should be a fresh shot.
      stop(parkedIdleTimerRef);
      popupShownForLockedRef.current = "";
      return undefined;
    }
    const chKey = String(currentChannel.chid || currentChannel.channelid ||
                         currentChannel.channelno || "");
    if (popupShownForLockedRef.current === chKey) return undefined;
    if (lockedChannel) return undefined; // modal already up

    stop(parkedIdleTimerRef);
    parkedIdleTimerRef.current = setTimeout(() => {
      parkedIdleTimerRef.current = null;
      setLockedChannel(currentChannel);
      // popupShownForLockedRef is set by the lockedChannel-tracker effect
      // below — this keeps the "already shown" bookkeeping in one place
      // regardless of which path opened the modal.
    }, PARKED_IDLE_MS);
    return () => stop(parkedIdleTimerRef);
  }, [isLockedParked, currentChannel, lockedChannel, stop]);

  // Track which channel the modal is currently open for. Any path that opens
  // it (parked-idle timer, mount with locked channelData, explicit
  // sidebar/numpad select) marks the chid as "already shown". The
  // parked-idle effect above bails out while popupShown === chKey, so after
  // the user dismisses, sitting on the same locked channel doesn't re-pop.
  useEffect(() => {
    if (!lockedChannel) return;
    const chKey = String(lockedChannel.chid || lockedChannel.channelid ||
                         lockedChannel.channelno || "");
    popupShownForLockedRef.current = chKey;
  }, [lockedChannel]);

  // ── TRP ─────────────────────────────────────────────────────────────────
  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";
  const deviceInfo = useDeviceInformation();
  const ip = deviceInfo.privateIPv4 && deviceInfo.privateIPv4 !== "Not available"
    ? deviceInfo.privateIPv4
    : deviceInfo.publicIPv4 && deviceInfo.publicIPv4 !== "Not available"
      ? deviceInfo.publicIPv4 : "";

  useEffect(() => {
    const s = String(currentStream || "").trim();
    if (!s || !mobile || !ip) return;
    if (lastTrpStream.current === s) return;
    lastTrpStream.current = s;
    postTrpData({ mobile, ip_address: ip, stream: s }).catch(() => {});
  }, [currentStream, mobile, ip]);

  // ── /streamAds (BBNL spec row 21) ──────────────────────────────────────────
  // Fire ~1.5s after a channel switch so the player has time to start playing.
  // Keyed on chid + grid so any channel change re-requests an ad. The
  // `cancelled` flag suppresses late responses if the user flips channels
  // quickly or unmounts the player.
  const chid = currentChannel?.chid || currentChannel?.channelid || "";
  const grid = currentChannel?.grid || "1";
  useEffect(() => {
    setStreamAd(null);
    // Locked-parked channels have no stream and no ad context — skip the call.
    if (!chid || !userid || !mobile || !ip || isLockedParked) return undefined;

    const macAddr =
      (deviceInfo.wiredMac && deviceInfo.wiredMac !== "Not available" && deviceInfo.wiredMac) ||
      (deviceInfo.wifiMac && deviceInfo.wifiMac !== "Not available" && deviceInfo.wifiMac) ||
      "";
    if (!macAddr) return undefined;

    let cancelled = false;
    const t = setTimeout(() => {
      fetchStreamAd({
        userid,
        mobile,
        ip_address: ip,
        mac_address: macAddr,
        grid,
        chid,
      }).then((res) => {
        if (cancelled) return;
        if (res && res.success && res.ad) setStreamAd(res.ad);
      }).catch(() => { /* fetchStreamAd never throws */ });
    }, 1500);

    return () => { cancelled = true; clearTimeout(t); };
  }, [chid, grid, userid, mobile, ip, deviceInfo.wiredMac, deviceInfo.wifiMac, isLockedParked]);

  // ── Fetch channels ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchChannels({ userid, mobile, grid: "1" }).then((ch) => {
      if (Array.isArray(ch)) setChannelsList(ch);
    });
  }, [fetchChannels, userid, mobile]);

  // ── Lookup helper used by both remote-typing commit and pad onSubmit ─
  const lookupChannelByNumber = useCallback((value) => {
    return (
      getChannelByNumber({ userid, mobile, grid: "1" }, value) ||
      findChannelByNumber(chListRef.current, value)
    );
  }, [getChannelByNumber, userid, mobile]);

  // ── On-screen numpad submit ─────────────────────────────────────────────
  const onNumpadSubmit = useCallback((val) => {
    setIsNumberPadVisible(false);
    setTypedChannelNumber("");
    numberBuffer.current = "";
    stop(numpadTimer);
    if (!val) return;
    const target = lookupChannelByNumber(val);
    if (target) {
      setLocalError("");
      selectChannel(target);
      showInfo();
    } else {
      setChannelNotFound(String(val));
    }
  }, [lookupChannelByNumber, selectChannel, showInfo, stop]);

  const onNumpadClose = useCallback(() => {
    setIsNumberPadVisible(false);
    setTypedChannelNumber("");
    numberBuffer.current = "";
    stop(numpadTimer);
  }, [stop]);

  // ── BACK CASCADE ────────────────────────────────────────────────────────
  // Single source of truth for "what does BACK mean on /player". Dismisses
  // the topmost overlay if any is open; otherwise navigates home. Called
  // from BOTH the keydown handler AND a popstate listener — on some webOS
  // firmwares the BACK button only fires a history pop (popstate) without
  // firing a matching `keyCode 461` / `key === "GoBack"` keydown, so relying
  // on keydown alone leaves overlays stuck open.
  const handleBackCascade = useCallback(() => {
    if (lockedRef.current)          { setLockedChannel(null); return; }
    if (sidebarRef.current)         { closeMenu(); return; }
    if (numpadRef.current)          { hideNumpad(); return; }
    if (channelNotFoundRef.current) { setChannelNotFound(""); return; }
    // While parked on a locked channel the info bar is pinned and not
    // user-dismissible, so skip the hide step and go straight to origin.
    if (detailsRef.current && !isLockedParkedRef.current) { hideInfo(); return; }
    // Return to the screen that launched the player (LiveChannels with its
    // filter state, Home, etc.). Falls back to /home if no origin recorded
    // (cold-launch autoplay, deep-link). See src/utils/navigation.js.
    backFromPlayer(navigate, location.state);
  }, [closeMenu, hideNumpad, hideInfo, navigate, location.state]);

  // popstate-as-BACK fallback. GlobalBackHandler in App.js re-pushes a guard
  // entry for self-handled routes so this listener still has something to
  // pop on every press. Idempotent with the keydown path: when both fire,
  // the cascade runs twice but each step is a no-op the second time.
  useEffect(() => {
    const onPop = () => handleBackCascade();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [handleBackCascade]);

  // ── KEYBOARD HANDLER ────────────────────────────────────────────────────
  useEffect(() => {
    const digit = (e) => {
      if (/^[0-9]$/.test(e.key)) return e.key;
      if (e.code?.startsWith("Digit")) return e.code.replace("Digit", "");
      const c = e.keyCode;
      if (c >= 48 && c <= 57) return String(c - 48);
      if (c >= 96 && c <= 105) return String(c - 96);
      return "";
    };

    const commitNumber = () => {
      const val = numberBuffer.current;
      if (!val) return;
      numberBuffer.current = "";
      setTypedChannelNumber("");
      stop(numberTimer);
      stop(numpadTimer);

      const target = lookupChannelByNumber(val);
      if (target) {
        setLocalError("");
        selectChannel(target);
        showInfo();
      } else {
        setChannelNotFound(String(val));
      }
    };

    const onKey = (e) => {
      const k = e.key;
      const kc = e.keyCode;

      // The on-screen numpad, ChannelNotFound modal, and ChannelLocked modal
      // own all input while open — bail out so we don't double-handle anything.
      if (numpadRef.current) return;
      if (channelNotFoundRef.current) return;
      if (lockedRef.current) return;

      // Sidebar open + arrow keys → reset idle timer (user is browsing)
      if (sidebarRef.current && (kc === 37 || kc === 38 || kc === 39 || kc === 40 ||
          k === "ArrowUp" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowRight")) {
        startMenuTimer();
      }

      // Any key while parked on a locked channel kills the popup-idle
      // fuse — it counts as user interaction and pushes the auto-popup off.
      if (isLockedParkedRef.current) stop(parkedIdleTimerRef);

      // Any non-UP/DOWN key cancels the active surf state. Surf is a
      // strictly UP/DOWN affair; once the user does anything else (digit,
      // LEFT, RIGHT, OK, BACK), the hold is over.
      const isUpDown = (kc === 38 || kc === 40 ||
                        k === "ArrowUp" || k === "ArrowDown");
      if (!isUpDown && surfStateRef.current !== "idle") {
        exitSurfState();
      }

      // DIGITS — type via remote, show floating badge, commit after 2s
      const d = digit(e);
      if (d) {
        e.preventDefault(); e.stopPropagation();
        numberBuffer.current = `${numberBuffer.current}${d}`.slice(0, 4);
        setTypedChannelNumber(numberBuffer.current);
        showNumpadDigitMode();
        stop(numberTimer);
        numberTimer.current = setTimeout(commitNumber, 2000);
        return;
      }

      // BACK (LG remote 461, Backspace 8 while sidebar, Escape) — bulletproof
      if (k === "GoBack" || k === "Back" || kc === 461 || k === "Escape" ||
          (kc === 8 && sidebarRef.current)) {
        e.preventDefault(); e.stopPropagation();
        handleBackCascade();
        return;
      }

      // OK / ENTER → open sidebar (if closed), or let ChannelsSidebar handle it (if open)
      if (k === "Enter" || kc === 13) {
        if (!sidebarRef.current) {
          e.preventDefault(); e.stopPropagation();
          openMenu();
        }
        // sidebar open → ChannelsSidebar handles Enter for channel select
        return;
      }

      // UP / DOWN — DTH-style surf state machine.
      // First press with the info bar hidden just shows the bar (legacy
      // behaviour preserved). Subsequent presses drive `pendingChannel`
      // through the existing zap-settle effect, which commits HLS / park
      // ZAP_SETTLE_MS after the last step. The state machine itself is
      // what makes hold-to-fast-forward feel right on webOS — see
      // docs/plans/2026-04-30-dth-channel-surf-hold-design.md.
      if (k === "ArrowUp" || kc === 38 || k === "ArrowDown" || kc === 40) {
        if (sidebarRef.current) return;
        e.preventDefault(); e.stopPropagation();
        if (!detailsRef.current) {
          showInfo();
          return;
        }

        const dir = (k === "ArrowUp" || kc === 38) ? 1 : -1;

        // Reset/restart absence timer. If no UP/DOWN keydown arrives within
        // KEY_ABSENCE_MS, treat the key as released and drop to settle.
        // This is the keyup-fallback path for webOS firmwares that swallow
        // keyup events in pointer mode.
        stop(keyAbsenceTimerRef);
        keyAbsenceTimerRef.current = setTimeout(() => {
          exitSurfState();
        }, KEY_ABSENCE_MS);

        const state = surfStateRef.current;

        if (state === "idle") {
          // First press — step once, arm hold detection. If a 2nd same-dir
          // keydown arrives within HOLD_ARM_MS, we'll enter HOLDING.
          surfStateRef.current = "stepping";
          surfDirRef.current = dir;
          stepChannel(dir);
          showInfo();
          stop(holdArmTimerRef);
          holdArmTimerRef.current = setTimeout(() => {
            holdArmTimerRef.current = null;
          }, HOLD_ARM_MS);
          return;
        }

        if (state === "stepping") {
          if (dir !== surfDirRef.current) {
            // Mid-burst direction reversal — re-arm in the new direction.
            surfDirRef.current = dir;
            stepChannel(dir);
            showInfo();
            stop(holdArmTimerRef);
            holdArmTimerRef.current = setTimeout(() => {
              holdArmTimerRef.current = null;
            }, HOLD_ARM_MS);
            return;
          }
          if (holdArmTimerRef.current) {
            // 2nd same-dir keydown inside HOLD_ARM_MS → enter HOLDING. We
            // own the rate from here; native auto-repeat keydowns are
            // swallowed (they only serve to keep keyAbsenceTimerRef alive).
            stop(holdArmTimerRef);
            surfStateRef.current = "holding";
            stepChannel(dir);
            showInfo();
            surfIntervalRef.current = setInterval(() => {
              stepChannel(surfDirRef.current);
              showInfo();
            }, SURF_STEP_MS);
            return;
          }
          // Slow tap (gap > HOLD_ARM_MS but < KEY_ABSENCE_MS). Step once.
          stepChannel(dir);
          showInfo();
          return;
        }

        if (state === "holding") {
          if (dir !== surfDirRef.current) {
            // Mid-hold reversal — drop to stepping in the new dir, re-arm.
            if (surfIntervalRef.current) {
              clearInterval(surfIntervalRef.current);
              surfIntervalRef.current = null;
            }
            surfStateRef.current = "stepping";
            surfDirRef.current = dir;
            stepChannel(dir);
            showInfo();
            stop(holdArmTimerRef);
            holdArmTimerRef.current = setTimeout(() => {
              holdArmTimerRef.current = null;
            }, HOLD_ARM_MS);
            return;
          }
          // Same-direction repeat keydown — interval owns the step rate.
          // Swallow it; keyAbsenceTimerRef was already reset above.
          return;
        }
        return;
      }

      // LEFT → custom on-screen number pad
      if (k === "ArrowLeft" || kc === 37) {
        if (sidebarRef.current) return;
        if (numpadRef.current) return;
        e.preventDefault(); e.stopPropagation();
        setIsNumberPadVisible(true);
        return;
      }

      // RIGHT → toggle info bar
      if (k === "ArrowRight" || kc === 39) {
        if (sidebarRef.current) return;
        e.preventDefault(); e.stopPropagation();
        if (detailsRef.current) hideInfo();
        else showInfo();
        return;
      }

      // BACKSPACE / RED → delete a typed digit while building a channel number
      if (kc === 8 || kc === 403) {
        if (numberBuffer.current.length > 0) {
          e.preventDefault(); e.stopPropagation();
          numberBuffer.current = numberBuffer.current.slice(0, -1);
          setTypedChannelNumber(numberBuffer.current);
          if (numberBuffer.current.length === 0) {
            stop(numpadTimer);
          } else {
            showNumpadDigitMode();
          }
        }
      }
    };

    // Primary release path: drop straight to settle on UP/DOWN keyup.
    // The KEY_ABSENCE_MS gap inside `onKey` is the fallback for firmwares
    // that swallow keyup events.
    const onKeyUp = (e) => {
      if (e.keyCode === 38 || e.keyCode === 40 ||
          e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (surfStateRef.current !== "idle") exitSurfState();
      }
    };

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup",   onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup",   onKeyUp, true);
      stop(numberTimer);
    };
  }, [lookupChannelByNumber, selectChannel, stepChannel,
      openMenu, showInfo, hideInfo, showNumpadDigitMode,
      startMenuTimer, handleBackCascade, exitSurfState, stop]);

  // Pause info timer while sidebar is open (don't hide info behind menu)
  useEffect(() => { if (isSidebarOpen) stop(detailsTimer); }, [isSidebarOpen, stop]);

  // Mount-time gate: if Home / LiveChannels navigated here with a locked
  // channel, surface the modal immediately AND clear the stream so the user
  // is parked on the locked channel from the first frame. `currentChannel`
  // was already initialised from the same `channelData` in useState above,
  // so dismissing the modal lands the user here with the info bar pinned.
  useEffect(() => {
    if (channelData && !isSubscribed(channelData)) {
      setLockedChannel(channelData);
      setCurrentStream("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup
  useEffect(() => () => {
    stop(detailsTimer); stop(sidebarTimer); stop(numpadTimer); stop(numberTimer);
    stop(holdArmTimerRef); stop(keyAbsenceTimerRef); stop(parkedIdleTimerRef);
    if (surfIntervalRef.current) {
      clearInterval(surfIntervalRef.current);
      surfIntervalRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Channel-permanently-unavailable handler ─────────────────────────────
  // HLSPlayer calls this when the master manifest comes back HTTP 404 — i.e.
  // the channel's CDN URL is dead, not a transient network problem. We surface
  // the existing ChannelNotFound modal with the channel number, then unmount
  // the player so its retry loop stops. The modal's onClose bounces back so
  // the user lands on the previous screen instead of a black canvas.
  const onChannelUnavailable = useCallback(() => {
    const ch = curChRef.current;
    const label = String(ch?.channelno || ch?.chno || ch?.channelid || ch?.chid || "");
    setCurrentStream("");
    setChannelNotFound(label || "this channel");
  }, []);

  // ── /stream fallback ────────────────────────────────────────────────────
  // Invoked by HLSPlayer ONLY after its fatal-NETWORK_ERROR retry budget
  // (MAX_NETWORK_RETRIES) is exhausted. Resolves with a fresh stream URL on
  // success, `null` otherwise. The player guards this to one attempt per src.
  const onStreamFailed = useCallback(async () => {
    const ch = curChRef.current;
    if (!ch) return null;
    const macAddr =
      (deviceInfo.wiredMac && deviceInfo.wiredMac !== "Not available" && deviceInfo.wiredMac) ||
      (deviceInfo.wifiMac && deviceInfo.wifiMac !== "Not available" && deviceInfo.wifiMac) ||
      "";
    try {
      const res = await fetchFreshStream({
        userid,
        mobile,
        chid: ch.chid || ch.channelid || "",
        chno: ch.chno || ch.channelno || "",
        ip_address: ip,
        mac_address: macAddr,
      });
      if (res && res.success && res.streamlink) return res.streamlink;
    } catch (_) { /* fetchFreshStream never throws, but be defensive */ }
    return null;
  }, [userid, mobile, ip, deviceInfo.wiredMac, deviceInfo.wifiMac]);

  return (
    <div style={{
      background: "#000", width: "100vw", height: "100vh",
      overflow: "hidden", position: "fixed", top: 0, left: 0,
    }}>
      {/* Floating digits badge — only when typing via remote and the on-screen pad is closed */}
      {!isNumberPadVisible && typedChannelNumber && (
        <ChannelNumberDisplay channelNumber={typedChannelNumber} />
      )}

      {/* Custom on-screen number pad (replaces LG system keyboard) */}
      {isNumberPadVisible && (
        <ChannelNumberPad
          onSubmit={onNumpadSubmit}
          onClose={onNumpadClose}
          initialValue={typedChannelNumber}
        />
      )}

      {/* Channel-not-found popup (auto-clears).
          Two triggers: (1) user typed a channel number that doesn't exist —
          modal just clears and the existing stream keeps playing; (2) the
          live stream's master manifest 404'd, so we cleared currentStream
          to stop hls.js retrying — modal close needs to bounce back, since
          staying here leaves a black canvas. */}
      {channelNotFound && (
        <ChannelNotFound
          channelNumber={channelNotFound}
          onClose={() => {
            setChannelNotFound("");
            // Stream is dead and the user has no channel to fall back on —
            // bounce to the originating screen via the navigation service so
            // they don't get stuck on a black canvas. See utils/navigation.js.
            if (!currentStream) backFromPlayer(navigate, location.state);
          }}
        />
      )}

      {/* Subscription-gate modal (Subscription Not Available → Coming Soon).
          On dismiss we keep the user parked on the locked channel — the info
          bar stays pinned with a Locked badge and all normal player chrome
          (OK→sidebar, digits, channel-up/down, LEFT→numpad) keeps working.
          See selectChannelRaw / zap-settle for how we set up the parked
          state before the modal opens. */}
      {lockedChannel && (
        <ChannelLocked
          channel={lockedChannel}
          onClose={() => setLockedChannel(null)}
        />
      )}

      {/* Seamless relay: when the cached `streamlink` fails fatally
          (token expiry, segment 404, edge rotation, etc.), HLSPlayer
          calls `onStreamFailed` after exhausting its short-cycle retry
          budget; it returns a fresh URL via /stream which HLS swaps in
          without a black-screen disconnect. `streamAd` drives the BBNL
          spec row 21 overlay polled per channel switch. The HLS engine
          is mounted ONLY when a stream URL is present — locked-parked
          channels render a black canvas with the chrome on top. */}
      {currentStream && (
        <HLSPlayer
          src={currentStream}
          onStreamFailed={onStreamFailed}
          onChannelUnavailable={onChannelUnavailable}
          streamAd={streamAd}
        />
      )}

      {currentChannel && (
        <ChannelsDetails
          channel={pendingChannel || currentChannel}
          visible={isDetailsVisible || isLockedParked}
          sidebarOpen={isSidebarOpen}
          locked={isLockedParked}
        />
      )}

      {localError && (
        <div style={{
          position: "absolute", bottom: "80px", left: "50%",
          transform: "translateX(-50%)",
          color: "#ffb347", fontSize: "22px",
          background: "rgba(0,0,0,0.85)",
          padding: "14px 32px", borderRadius: "12px",
          zIndex: 35, border: "1px solid rgba(255,180,71,0.3)",
        }}>
          {localError}
        </div>
      )}

      {currentChannel && (
        <div style={{
          position: "absolute", top: 0, left: 0, height: "100%", zIndex: 20,
          display: isSidebarOpen ? "block" : "none",
        }}>
          <ChannelsSidebar
            onChannelSelect={onSidebarSelect}
            currentChannel={currentChannel}
            isOpen={isSidebarOpen}
          />
        </div>
      )}

      {!currentChannel && !currentStream && (
        <div style={{ padding: "24px" }}>
          <p style={{ color: "#ff9a9a" }}>No stream link provided.</p>
          {localError && <p style={{ color: "#ffb347" }}>{localError}</p>}
        </div>
      )}
    </div>
  );
};

export default LivePlayer;

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

const ZAP_SETTLE_MS = 300;

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

  // ── Simple timer start/stop ──────────────────────────────────────────────
  const stop = useCallback((ref) => { if (ref.current) { clearTimeout(ref.current); ref.current = null; } }, []);

  // ── INFO BAR: show with auto-hide, or just hide ─────────────────────────
  const showInfo = useCallback(() => {
    stop(detailsTimer);
    setIsDetailsVisible(true);
    detailsTimer.current = setTimeout(() => {
      setIsDetailsVisible(false);
      detailsTimer.current = null;
    }, INFOBAR_MS);
  }, [stop]);

  const hideInfo = useCallback(() => {
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
  // Subscription gate: locked channels never reach the HLS player. Instead the
  // ChannelLocked modal opens. Caller logic (sidebar close timer, etc.) still
  // runs — only the stream load is suppressed.
  const selectChannelRaw = useCallback((channel) => {
    setPendingChannel(null);
    if (channel && !isSubscribed(channel)) {
      setLockedChannel(channel);
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

  // DTH-standard: ↑/↓ stepping skips locked channels silently — avoids modal
  // spam when the user holds the channel button. Walk in `dir` direction until
  // we land on a subscribed channel or wrap back to the start.
  const stepChannel = useCallback((dir) => {
    const list = chListRef.current;
    if (!list.length) return;
    // Walk from the pending channel if we're mid-zap, otherwise from current.
    const startFromCh = pendingChannelRef.current || curChRef.current;
    const cur = findChIndex(startFromCh);
    let i = cur === -1 ? 0 : (cur + dir + list.length) % list.length;
    for (let guard = 0; guard < list.length; guard++) {
      const candidate = list[i];
      if (candidate && isSubscribed(candidate)) {
        setPendingChannel(candidate);
        return;
      }
      i = (i + dir + list.length) % list.length;
    }
    // No subscribed channel exists at all — silent no-op.
  }, []);

  // Zap-and-settle: when pendingChannel changes via UP/DOWN, wait
  // ZAP_SETTLE_MS after the last keypress before committing (HLS reload).
  // Holding DOWN through 5 channels = 1 stream load, not 5.
  useEffect(() => {
    if (!pendingChannel) return;
    if (pendingChannel === currentChannel) return;
    const t = setTimeout(() => {
      if (!isSubscribed(pendingChannel)) {
        setLockedChannel(pendingChannel);
        setPendingChannel(null);
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
    if (!chid || !userid || !mobile || !ip) return undefined;

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
  }, [chid, grid, userid, mobile, ip, deviceInfo.wiredMac, deviceInfo.wifiMac]);

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
    if (detailsRef.current)         { hideInfo(); return; }
    navigate('/home', { replace: true });
  }, [closeMenu, hideNumpad, hideInfo, navigate]);

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

      // UP / DOWN → step channel (only when no sidebar is open)
      if (k === "ArrowUp" || kc === 38 || k === "ArrowDown" || kc === 40) {
        if (sidebarRef.current) return;
        e.preventDefault(); e.stopPropagation();
        if (!detailsRef.current) {
          showInfo();
        } else {
          stepChannel((k === "ArrowUp" || kc === 38) ? 1 : -1);
          showInfo();
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

    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); stop(numberTimer); };
  }, [lookupChannelByNumber, selectChannel, stepChannel,
      openMenu, showInfo, hideInfo, showNumpadDigitMode,
      startMenuTimer, handleBackCascade, stop]);

  // Pause info timer while sidebar is open (don't hide info behind menu)
  useEffect(() => { if (isSidebarOpen) stop(detailsTimer); }, [isSidebarOpen, stop]);

  // Mount-time gate: if Home navigated here with a locked channel, surface
  // the locked modal immediately and DON'T initialise the HLS stream.
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

      {/* Channel-not-found popup (auto-clears) */}
      {channelNotFound && (
        <ChannelNotFound
          channelNumber={channelNotFound}
          onClose={() => setChannelNotFound("")}
        />
      )}

      {/* Subscription-gate modal (Subscription Not Available → Coming Soon).
          On dismiss: if we never had a valid stream playing (i.e. the user
          arrived here by tapping a locked tile on Home or LiveChannels),
          navigate(-1) to return to that screen with its scroll/filter state
          intact — MemoryRouter preserves the previous Location. If we WERE
          playing something subscribed and just blocked a channel switch
          (sidebar/numpad), stay put — the existing stream keeps playing. */}
      {lockedChannel && (
        <ChannelLocked
          channel={lockedChannel}
          onClose={() => {
            if (!currentStream) navigate(-1);
            else                setLockedChannel(null);
          }}
        />
      )}

      {!currentStream ? (
        <div style={{ padding: "24px" }}>
          <p style={{ color: "#ff9a9a" }}>No stream link provided.</p>
          {localError && <p style={{ color: "#ffb347" }}>{localError}</p>}
        </div>
      ) : (
        <>
          {/* Seamless relay: when the cached `streamlink` fails fatally
              (token expiry, segment 404, edge rotation, etc.), HLSPlayer
              calls `onStreamFailed` after exhausting its short-cycle retry
              budget; it returns a fresh URL via /stream which HLS swaps in
              without a black-screen disconnect. `streamAd` drives the BBNL
              spec row 21 overlay polled per channel switch. */}
          <HLSPlayer
            src={currentStream}
            onStreamFailed={onStreamFailed}
            streamAd={streamAd}
          />

          <ChannelsDetails
            channel={pendingChannel || currentChannel}
            visible={isDetailsVisible}
            sidebarOpen={isSidebarOpen}
          />

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

          <div style={{
            position: "absolute", top: 0, left: 0, height: "100%", zIndex: 20,
            display: isSidebarOpen ? "block" : "none",
          }}>
            <ChannelsSidebar
              onChannelSelect={onSidebarSelect}
              currentChannel={currentChannel}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default LivePlayer;

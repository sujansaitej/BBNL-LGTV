import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import HLSPlayer from "../Pages/StreamPlayer";
import ChannelsSidebar from "./ChannelsSidebar";
import ChannelsDetails from "./ChannelsDetails";
import ChannelNumberDisplay, { findChannelByNumber } from "./Lcn";

import useLiveChannelsStore from "../store/LiveChannelsStore";
import { useDeviceInformation } from "../server/Deviceinformaction/LG-Devicesinformaction";
import { postTrpData } from "../server/modules-api/trpdata";

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
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [isNumberPadVisible, setIsNumberPadVisible] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [channelsList,   setChannelsList]   = useState([]);
  const [localError,     setLocalError]     = useState("");
  const [typedChannelNumber, setTypedChannelNumber] = useState("");

  const { fetchChannels, getChannelByNumber } = useLiveChannelsStore();

  const detailsTimer   = useRef(null);
  const sidebarTimer   = useRef(null);
  const numpadTimer    = useRef(null);
  const numberBuffer   = useRef("");
  const numberTimer    = useRef(null);
  const lastTrpStream  = useRef("");

  // Stable refs — keyboard handler reads these, never stale
  const sidebarRef  = useRef(false);
  const detailsRef  = useRef(false);
  const numpadRef   = useRef(false);
  const chListRef    = useRef([]);
  const curChRef     = useRef(null);
  const keyboardRef  = useRef(false);

  useEffect(() => { sidebarRef.current  = isSidebarOpen; }, [isSidebarOpen]);
  useEffect(() => { detailsRef.current  = isDetailsVisible; }, [isDetailsVisible]);
  useEffect(() => { numpadRef.current   = isNumberPadVisible; }, [isNumberPadVisible]);
  useEffect(() => { keyboardRef.current = isKeyboardOpen; }, [isKeyboardOpen]);
  useEffect(() => { chListRef.current  = channelsList; }, [channelsList]);
  useEffect(() => { curChRef.current   = currentChannel; }, [currentChannel]);

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
  const showNumpad = useCallback(() => {
    setIsNumberPadVisible(true);
    stop(numpadTimer);
    numpadTimer.current = setTimeout(() => {
      setIsNumberPadVisible(false);
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
  const selectChannel = useCallback((channel) => {
    const url = getStreamUrl(channel);
    if (!url) { setLocalError("No stream URL found."); return; }
    setLocalError("");
    setCurrentStream(url);
    setCurrentChannel(channel);
  }, []);

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

  const stepChannel = useCallback((dir) => {
    const list = chListRef.current;
    if (!list.length) return;
    const cur = findChIndex(curChRef.current);
    const next = cur === -1 ? 0 : (cur + dir + list.length) % list.length;
    if (list[next]) selectChannel(list[next]);
  }, [selectChannel]);

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

  // ── Fetch channels ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchChannels({ userid, mobile, grid: "1" }).then((ch) => {
      if (Array.isArray(ch)) setChannelsList(ch);
    });
  }, [fetchChannels, userid, mobile]);

  // ── LG KEYBOARD handlers ─────────────────────────────────────────────────
  const onKeyboardChange = useCallback((val) => {
    // Show digits in existing ChannelNumberDisplay as user types on LG keyboard
    setTypedChannelNumber(val);
    setIsNumberPadVisible(!!val);
  }, []);

  const onKeyboardSubmit = useCallback((value) => {
    setIsKeyboardOpen(false);
    setIsNumberPadVisible(false);
    setTypedChannelNumber("");
    if (!value) return;
    const target =
      getChannelByNumber({ userid, mobile, grid: "1" }, value) ||
      findChannelByNumber(chListRef.current, value);
    if (target) {
      setLocalError("");
      setCurrentStream(getStreamUrl(target));
      setCurrentChannel(target);
      showInfo();
    } else {
      setLocalError(`Channel ${value} not found`);
      setTimeout(() => setLocalError(""), 3000);
    }
  }, [getChannelByNumber, userid, mobile, showInfo]);

  const onKeyboardClose = useCallback(() => {
    setIsKeyboardOpen(false);
    setIsNumberPadVisible(false);
    setTypedChannelNumber("");
  }, []);

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
      setIsNumberPadVisible(false);
      stop(numpadTimer);

      const target =
        getChannelByNumber({ userid, mobile, grid: "1" }, val) ||
        findChannelByNumber(chListRef.current, val);

      if (target) {
        setLocalError("");
        selectChannel(target);
        showInfo();
      } else {
        setLocalError(`Channel ${val} not found`);
        setTimeout(() => setLocalError(""), 3000);
      }
    };

    const onKey = (e) => {
      const k = e.key;
      const kc = e.keyCode;

      // Sidebar open + arrow keys → reset idle timer (user is browsing)
      if (sidebarRef.current && (kc === 37 || kc === 38 || kc === 39 || kc === 40 ||
          k === "ArrowUp" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowRight")) {
        startMenuTimer();
      }

      // DIGITS
      const d = digit(e);
      if (d) {
        e.preventDefault(); e.stopPropagation();
        showNumpad();
        numberBuffer.current = `${numberBuffer.current}${d}`.slice(0, 4);
        setTypedChannelNumber(numberBuffer.current);
        stop(numberTimer);
        numberTimer.current = setTimeout(commitNumber, 2000);
        return;
      }

      // BACK (LG remote 461, Backspace 8, Escape)
      if (k === "GoBack" || k === "Back" || kc === 461 || k === "Escape" ||
          (kc === 8 && sidebarRef.current)) {
        e.preventDefault(); e.stopPropagation();
        if (sidebarRef.current) closeMenu();
        else if (numpadRef.current) hideNumpad();
        else if (detailsRef.current) hideInfo();
        else navigate('/home', { replace: true });
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

      // UP / DOWN
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

      // LEFT / RIGHT → open LG system keyboard for channel number
      if (k === "ArrowLeft" || kc === 37 || k === "ArrowRight" || kc === 39) {
        if (sidebarRef.current) return;
        if (keyboardRef.current) return; // already open
        e.preventDefault(); e.stopPropagation();
        setIsKeyboardOpen(true);
        return;
      }

      // BACKSPACE / RED
      if (kc === 8 || kc === 403) {
        if (numberBuffer.current.length > 0) {
          e.preventDefault(); e.stopPropagation();
          numberBuffer.current = numberBuffer.current.slice(0, -1);
          setTypedChannelNumber(numberBuffer.current);
          numberBuffer.current.length === 0 ? hideNumpad() : showNumpad();
        }
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); stop(numberTimer); };
  }, [getChannelByNumber, userid, mobile, selectChannel, stepChannel,
      openMenu, closeMenu, showInfo, hideInfo, showNumpad, hideNumpad,
      startMenuTimer, navigate]);

  // Pause info timer while sidebar is open (don't hide info behind menu)
  useEffect(() => { if (isSidebarOpen) stop(detailsTimer); }, [isSidebarOpen, stop]);

  // Cleanup
  useEffect(() => () => {
    stop(detailsTimer); stop(sidebarTimer); stop(numpadTimer); stop(numberTimer);
  }, []);

  return (
    <div style={{
      background: "#000", width: "100vw", height: "100vh",
      overflow: "hidden", position: "fixed", top: 0, left: 0,
    }}>
      {/* Single component: shows digits + triggers LG keyboard when Left/Right pressed */}
      {(isNumberPadVisible || isKeyboardOpen) && (
        <ChannelNumberDisplay
          channelNumber={typedChannelNumber}
          keyboardOpen={isKeyboardOpen}
          onChange={onKeyboardChange}
          onSubmit={onKeyboardSubmit}
          onClose={onKeyboardClose}
        />
      )}

      {!currentStream ? (
        <div style={{ padding: "24px" }}>
          <p style={{ color: "#ff9a9a" }}>No stream link provided.</p>
          {localError && <p style={{ color: "#ffb347" }}>{localError}</p>}
        </div>
      ) : (
        <>
          <HLSPlayer src={currentStream} />

          <ChannelsDetails
            channel={currentChannel}
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

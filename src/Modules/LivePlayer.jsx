import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// FIX: Import HLSPlayer directly — "StreamPlayer" was the naming mismatch
// causing channels to not load. Rename your file or adjust this import path.
// ─────────────────────────────────────────────────────────────────────────────
import HLSPlayer from "../PAGES/Channels/StreamPlayer";
import ChannelsSidebar from "./ChannelsSidebar";
import ChannelsDetails from "./ChannelsDetails";
import ChannelNumberDisplay, { findChannelByNumber } from "./Lcn";

import useLiveChannelsStore from "../store/LiveChannelsStore";
import { useMagicRemote } from "../Remote/useMagicRemote";
import { useDeviceInformation } from "../server/Deviceinformaction/LG-Devicesinformaction";
import { postTrpData } from "../server/modules-api/trpdata";

// ── Helper: extract stream URL from any channel shape ────────────────────────
const getStreamUrl = (channel) => {
  if (!channel) return "";
  return (
    channel.streamlink    ||
    channel.stream_link   ||
    channel.streamurl     ||
    channel.stream_url    ||
    channel.url           ||
    channel.link          ||
    channel.videourl      ||
    channel.video_url     ||
    channel.hlsurl        ||
    channel.hls_url       ||
    channel.manifest      ||
    channel.manifesturl   ||
    ""
  );
};

const LivePlayer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { streamlink: initialStreamlink, channelData } = location.state || {};

  const [currentStream,  setCurrentStream]  = useState(initialStreamlink || "");
  const [currentChannel, setCurrentChannel] = useState(channelData || null);
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [channelsList,   setChannelsList]   = useState([]);
  const [localError,     setLocalError]     = useState("");
  const [typedChannelNumber, setTypedChannelNumber] = useState("");

  const { fetchChannels, getChannelByNumber } = useLiveChannelsStore();

  const detailsTimerRef  = useRef(null);
  const numberBufferRef  = useRef("");
  const numberTimerRef   = useRef(null);
  const lastTrpStreamRef = useRef("");
  const isSidebarOpenRef = useRef(false);       // stable ref so key handlers don't go stale
  const isDetailsRef     = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { isSidebarOpenRef.current = isSidebarOpen; }, [isSidebarOpen]);
  useEffect(() => { isDetailsRef.current     = isDetailsVisible; }, [isDetailsVisible]);

  // ── Details banner helpers ─────────────────────────────────────────────────
  const showDetails = useCallback((durationMs = 3000) => {
    if (isSidebarOpenRef.current) return;
    setIsDetailsVisible(true);
    if (detailsTimerRef.current) clearTimeout(detailsTimerRef.current);
    detailsTimerRef.current = setTimeout(() => setIsDetailsVisible(false), durationMs);
  }, []);

  const toggleDetails = useCallback(() => {
    if (isSidebarOpenRef.current) return;
    setIsDetailsVisible((prev) => {
      if (prev) {
        if (detailsTimerRef.current) { clearTimeout(detailsTimerRef.current); detailsTimerRef.current = null; }
        return false;
      }
      if (detailsTimerRef.current) clearTimeout(detailsTimerRef.current);
      detailsTimerRef.current = setTimeout(() => setIsDetailsVisible(false), 3000);
      return true;
    });
  }, []);

  // ── Channel select ─────────────────────────────────────────────────────────
  // Stable ref — state setters never change identity, so no deps needed.
  const handleChannelSelect = useCallback((channel) => {
    const streamUrl = getStreamUrl(channel);
    if (!streamUrl) {
      setLocalError("No stream URL found for this channel.");
      return;
    }
    setLocalError("");
    setCurrentStream(streamUrl);
    setCurrentChannel(channel);
    setIsSidebarOpen(false);
  }, []);

  // ── Channel step (up/down arrow keys) ─────────────────────────────────────
  // FIX: direction was inverted. "up" arrow = higher channel number (+1 index in ascending list).
  // Also using a ref to avoid stale closure on channelsList.
  const channelsListRef = useRef([]);
  const currentChannelRef = useRef(null);
  useEffect(() => { channelsListRef.current = channelsList; }, [channelsList]);
  useEffect(() => { currentChannelRef.current = currentChannel; }, [currentChannel]);

  const findChannelIndex = (channel) => {
    const list = channelsListRef.current;
    if (!channel || list.length === 0) return -1;
    return list.findIndex((item) => {
      if (channel.channelno && item.channelno) return String(item.channelno) === String(channel.channelno);
      if (channel.channelid && item.channelid) return String(item.channelid) === String(channel.channelid);
      if (channel.chid      && item.chid)      return String(item.chid)      === String(channel.chid);
      return item.streamlink && channel.streamlink && item.streamlink === channel.streamlink;
    });
  };

  const handleChannelStep = useCallback((direction) => {
    const list = channelsListRef.current;
    if (list.length === 0) return;
    const currentIndex = findChannelIndex(currentChannelRef.current);
    const nextIndex = currentIndex === -1
      ? 0
      : (currentIndex + direction + list.length) % list.length;
    const nextChannel = list[nextIndex];
    if (nextChannel) {
      handleChannelSelect(nextChannel);
      showDetails();
    }
  }, [showDetails]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Magic remote (LG pointer remote) ─────────────────────────────────────
  useMagicRemote({
    enabled: !isSidebarOpen,
    onOKKey: () => { if (!isSidebarOpenRef.current) toggleDetails(); },
    onBackKey: () => {
      if (isSidebarOpenRef.current) {
        setIsSidebarOpen(false);
      } else if (isDetailsRef.current) {
        setIsDetailsVisible(false);
        if (detailsTimerRef.current) { clearTimeout(detailsTimerRef.current); detailsTimerRef.current = null; }
      } else {
        navigate(-1);
      }
    },
    onArrowKey: (direction) => {
      // up = next channel (higher), down = previous channel (lower)
      if      (direction === "up")   handleChannelStep(1);
      else if (direction === "down") handleChannelStep(-1);
    },
  });

  // ── TRP reporting ──────────────────────────────────────────────────────────
  // FIX: depend on stable string values, not deviceInfo object reference.
  const userid   = localStorage.getItem("userId")    || "";
  const mobile   = localStorage.getItem("userPhone") || "";
  const deviceInfo = useDeviceInformation();

  // Memoize the IP string to avoid re-firing on object identity changes
  const dynamicIp =
    deviceInfo.privateIPv4 && deviceInfo.privateIPv4 !== "Not available"
      ? deviceInfo.privateIPv4
      : deviceInfo.publicIPv4 && deviceInfo.publicIPv4 !== "Not available"
        ? deviceInfo.publicIPv4
        : "";

  useEffect(() => {
    const streamForTrp = String(currentStream || "").trim();
    if (!streamForTrp || !mobile || !dynamicIp) return;
    if (lastTrpStreamRef.current === streamForTrp) return;
    lastTrpStreamRef.current = streamForTrp;

    postTrpData({ mobile, ip_address: dynamicIp, stream: streamForTrp })
      .then((res) => {
        if (res?.success) console.log("[TRP] OK", { mobile, ip_address: dynamicIp, stream: streamForTrp });
        else              console.warn("[TRP] Failed", res?.message);
      })
      .catch((err) => console.error("[TRP] Error", err));
  }, [currentStream, mobile, dynamicIp]);

  // ── Fetch channels list ────────────────────────────────────────────────────
  useEffect(() => {
    const payload = { userid, mobile, grid: "1" };
    fetchChannels(payload).then((channels) => {
      if (Array.isArray(channels)) setChannelsList(channels);
    });
  }, [fetchChannels, userid, mobile]);

  // ── Keyboard handler (digit buffering + arrow left to open sidebar) ────────
  // FIX: Using refs for isSidebarOpen and isDetailsVisible so this effect
  // never needs to re-register (avoids flickering / missed keys on LG).
  useEffect(() => {
    const getDigitFromEvent = (event) => {
      if (/^[0-9]$/.test(event.key)) return event.key;
      if (event.code?.startsWith("Digit")) return event.code.replace("Digit", "");
      const code = event.keyCode;
      if (code >= 48 && code <= 57)  return String(code - 48);
      if (code >= 96 && code <= 105) return String(code - 96);
      return "";
    };

    const commitNumberJump = () => {
      const value = numberBufferRef.current;
      if (!value) return;
      numberBufferRef.current = "";
      setTypedChannelNumber("");
      if (numberTimerRef.current) { clearTimeout(numberTimerRef.current); numberTimerRef.current = null; }

      const target =
        getChannelByNumber({ userid, mobile, grid: "1" }, value) ||
        findChannelByNumber(channelsListRef.current, value);

      if (target) {
        setLocalError("");
        handleChannelSelect(target);
        showDetails();
      } else {
        setLocalError(`Channel ${value} not found.`);
        setTimeout(() => setLocalError(""), 3000);
      }
    };

    const handleKey = (event) => {
      const digit = getDigitFromEvent(event);
      if (digit) {
        event.preventDefault();
        event.stopPropagation();
        numberBufferRef.current = `${numberBufferRef.current}${digit}`.slice(0, 4);
        setTypedChannelNumber(numberBufferRef.current);
        if (numberTimerRef.current) clearTimeout(numberTimerRef.current);
        numberTimerRef.current = setTimeout(commitNumberJump, 2000);
        return;
      }

      // ArrowLeft — open sidebar (only when sidebar is closed and details are hidden)
      if (event.key === "ArrowLeft" && !isSidebarOpenRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setIsSidebarOpen(true);
        return;
      }

      // ArrowRight — close sidebar
      if (event.key === "ArrowRight" && isSidebarOpenRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey, true);
    return () => {
      window.removeEventListener("keydown", handleKey, true);
      if (numberTimerRef.current) clearTimeout(numberTimerRef.current);
    };
  }, [getChannelByNumber, userid, mobile, showDetails]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hide details when sidebar opens ───────────────────────────────────────
  useEffect(() => {
    if (!isSidebarOpen) return;
    setIsDetailsVisible(false);
    if (detailsTimerRef.current) { clearTimeout(detailsTimerRef.current); detailsTimerRef.current = null; }
  }, [isSidebarOpen]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: "#000",
      width: "100vw", height: "100vh",
      overflow: "hidden",
      position: "fixed", top: 0, left: 0,
      margin: 0, padding: 0,
    }}>
      <ChannelNumberDisplay channelNumber={typedChannelNumber} />

      {!currentStream ? (
        <div style={{ padding: "24px" }}>
          <p style={{ color: "#ff9a9a", marginBottom: "8px" }}>No stream link provided.</p>
          {localError && <p style={{ color: "#ffb347" }}>{localError}</p>}
        </div>
      ) : (
        <>
          {/*
            FIX: key is REMOVED from HLSPlayer.
            The old `key={currentStream}` was unmounting+remounting the entire
            dual-buffer player on every channel change, throwing away both
            video elements and destroying the seamless-switch benefit.
            src prop change alone is sufficient — HLSPlayer handles it internally.
          */}
          <HLSPlayer src={currentStream} />

          <ChannelsDetails channel={currentChannel} visible={isDetailsVisible} />

          {localError && (
            <div style={{
              position: "absolute", bottom: "80px", left: "50%",
              transform: "translateX(-50%)",
              color: "#ffb347", fontSize: "18px",
              background: "rgba(0,0,0,0.6)",
              padding: "10px 24px", borderRadius: "8px",
              zIndex: 30,
            }}>
              {localError}
            </div>
          )}

          {/*
            FIX: Sidebar now uses CSS transform instead of display:none.
            display:none causes LG webOS layout recalculation jank and can
            briefly show the sidebar sliding in on every channel change.
            translateX keeps it in the DOM but off-screen.
          */}
          <div style={{
            position: "absolute",
            top: 0, left: 0,
            height: "100%",
            zIndex: 20,
            transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.2s ease",
            willChange: "transform",
          }}>
            <ChannelsSidebar
              onChannelSelect={handleChannelSelect}
              currentChannel={currentChannel}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default LivePlayer;
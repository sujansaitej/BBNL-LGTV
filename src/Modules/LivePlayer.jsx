import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StreamPlayer from "../Pages/Channels/StreamPlayer";
import ChannelsSidebar from "./ChannelsSidebar";
import ChannelsDetails from "./ChannelsDetails";
import ChannelNumberDisplay, { findChannelByNumber } from "./Lcn";

import useLiveChannelsStore from "../store/LiveChannelsStore";
import { useMagicRemote } from "../Remote/useMagicRemote";
import { useDeviceInformation } from "../server/Deviceinformaction/LG-Devicesinformaction";
import { postTrpData } from "../server/modules-api/trpdata";

const LivePlayer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { streamlink: initialStreamlink, channelData } = location.state || {};
  const [currentStream, setCurrentStream] = useState(initialStreamlink || "");
  const [currentChannel, setCurrentChannel] = useState(channelData || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [channelsList, setChannelsList] = useState([]);
  const [localError, setLocalError] = useState("");
  const [typedChannelNumber, setTypedChannelNumber] = useState("");
  const { fetchChannels, getChannelByNumber } = useLiveChannelsStore();
  const sidebarRef = useRef(null);
  const detailsTimerRef = useRef(null);
  const numberBufferRef = useRef("");
  const numberTimerRef = useRef(null);
  const lastTrpStreamRef = useRef("");

  const showDetails = useCallback((durationMs = 3000) => {
    if (isSidebarOpen) return;
    setIsDetailsVisible(true);
    if (detailsTimerRef.current) clearTimeout(detailsTimerRef.current);
    detailsTimerRef.current = setTimeout(() => setIsDetailsVisible(false), durationMs);
  }, [isSidebarOpen]);

  const toggleDetails = useCallback(() => {
    if (isSidebarOpen) return;
    setIsDetailsVisible(prev => {
      if (prev) {
        if (detailsTimerRef.current) { clearTimeout(detailsTimerRef.current); detailsTimerRef.current = null; }
        return false;
      } else {
        if (detailsTimerRef.current) clearTimeout(detailsTimerRef.current);
        detailsTimerRef.current = setTimeout(() => setIsDetailsVisible(false), 3000);
        return true;
      }
    });
  }, [isSidebarOpen]);

  const getStreamUrl = useCallback((channel) =>
    channel?.streamlink || channel?.stream_link || channel?.streamurl || channel?.stream_url ||
    channel?.url || channel?.link || channel?.videourl || channel?.video_url ||
    channel?.hlsurl || channel?.hls_url || channel?.manifest || channel?.manifesturl || "", []);

  const handleChannelSelect = useCallback((channel) => {
    const streamUrl = getStreamUrl(channel);
    if (!streamUrl) { setLocalError("No stream URL found for this channel."); return; }
    setLocalError("");
    setCurrentStream(streamUrl);
    setCurrentChannel(channel);
    setIsSidebarOpen(false);
  }, [getStreamUrl]);

  const handleChannelStep = useCallback((direction) => {
    if (channelsList.length === 0) return;
    const findChannelIndex = (channel) => {
      if (!channel || channelsList.length === 0) return -1;
      return channelsList.findIndex((item) => {
        if (channel.channelno && item.channelno) return String(item.channelno) === String(channel.channelno);
        if (channel.channelid && item.channelid) return String(item.channelid) === String(channel.channelid);
        if (channel.chid && item.chid) return String(item.chid) === String(channel.chid);
        return item.streamlink && channel.streamlink && item.streamlink === channel.streamlink;
      });
    };
    const currentIndex = findChannelIndex(currentChannel);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + direction + channelsList.length) % channelsList.length;
    const nextChannel = channelsList[nextIndex];
    if (nextChannel) { handleChannelSelect(nextChannel); showDetails(); }
  }, [channelsList, currentChannel, showDetails, handleChannelSelect]);

  useMagicRemote({
    enabled: !isSidebarOpen,
    onOKKey: () => { if (!isSidebarOpen) toggleDetails(); },
    onBackKey: () => {
      if (isSidebarOpen) { setIsSidebarOpen(false); }
      else if (isDetailsVisible) {
        setIsDetailsVisible(false);
        if (detailsTimerRef.current) { clearTimeout(detailsTimerRef.current); detailsTimerRef.current = null; }
      } else { navigate(-1); }
    },
    onArrowKey: (direction) => {
      if (direction === "up") handleChannelStep(1);
      else if (direction === "down") handleChannelStep(-1);
    },
  });

  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";
  const deviceInfo = useDeviceInformation();

  useEffect(() => {
    const streamForTrp = String(currentStream || "").trim();
    const dynamicIp =
      deviceInfo.privateIPv4 && deviceInfo.privateIPv4 !== "Not available" ? deviceInfo.privateIPv4
      : deviceInfo.publicIPv4 && deviceInfo.publicIPv4 !== "Not available" ? deviceInfo.publicIPv4
      : "";
    if (!streamForTrp || !mobile || !dynamicIp) return;
    if (lastTrpStreamRef.current === streamForTrp) return;
    lastTrpStreamRef.current = streamForTrp;
    postTrpData({ mobile, ip_address: dynamicIp })
      .then((res) => {
        if (res?.success) console.log("[TRP] Submitted successfully", { mobile, ip_address: dynamicIp, stream: streamForTrp });
        else console.warn("[TRP] Submission failed", { message: res?.message, mobile, ip_address: dynamicIp });
      })
      .catch((err) => console.error("[TRP] Submission error", err));
  }, [currentStream, mobile, deviceInfo.privateIPv4, deviceInfo.publicIPv4]);

  useEffect(() => {
    const payload = { userid, mobile, grid: "1" };
    fetchChannels(payload).then((channels) => { if (Array.isArray(channels)) setChannelsList(channels); });
  }, [fetchChannels, userid, mobile]);

  useEffect(() => {
    const getDigitFromEvent = (event) => {
      if (/^[0-9]$/.test(event.key)) return event.key;
      if (event.code && event.code.startsWith("Digit")) return event.code.replace("Digit", "");
      const code = event.keyCode;
      if (code >= 48 && code <= 57) return String(code - 48);
      if (code >= 96 && code <= 105) return String(code - 96);
      return "";
    };

    const commitNumberJump = () => {
      const value = numberBufferRef.current;
      if (!value) return;
      numberBufferRef.current = "";
      setTypedChannelNumber("");
      if (numberTimerRef.current) { clearTimeout(numberTimerRef.current); numberTimerRef.current = null; }
      const target = getChannelByNumber({ userid, mobile, grid: "1" }, value) || findChannelByNumber(channelsList, value);
      if (target) { setLocalError(""); handleChannelSelect(target); showDetails(); }
      else setLocalError(`Channel ${value} not found.`);
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
      if (event.key === "ArrowLeft" && !isSidebarOpen && !isDetailsVisible) {
        event.preventDefault();
        event.stopPropagation();
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener("keydown", handleKey, true);
    return () => {
      window.removeEventListener("keydown", handleKey, true);
      if (numberTimerRef.current) clearTimeout(numberTimerRef.current);
    };
  }, [isSidebarOpen, isDetailsVisible, channelsList, showDetails, handleChannelSelect, getChannelByNumber, userid, mobile]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    setIsDetailsVisible(false);
    if (detailsTimerRef.current) clearTimeout(detailsTimerRef.current);
  }, [isSidebarOpen]);

  return (
    <div style={{ background: "#000", width: "100vw", height: "100vh", overflow: "hidden", position: "fixed", top: 0, left: 0, margin: 0, padding: 0 }}>
      <ChannelNumberDisplay channelNumber={typedChannelNumber} />
      {!currentStream ? (
        <div style={{ padding: "24px" }}>
          <p style={{ color: "#ff9a9a", marginBottom: "8px" }}>No stream link provided.</p>
          {localError && <p style={{ color: "#ffb347" }}>{localError}</p>}
        </div>
      ) : (
        <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "fixed", top: 0, left: 0, margin: 0, padding: 0 }}>
          <StreamPlayer key={currentStream} src={currentStream} />
          <ChannelsDetails channel={currentChannel} visible={isDetailsVisible} />
          <div
            ref={sidebarRef}
            style={{ position: "absolute", top: 0, left: 0, height: "100%", zIndex: 20, display: isSidebarOpen ? "block" : "none", transform: "translateZ(0)", willChange: "display" }}
          >
            <ChannelsSidebar onChannelSelect={handleChannelSelect} currentChannel={currentChannel} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LivePlayer;

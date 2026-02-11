import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import StreamPlayer from "../Atomic-Module-Componenets/Channels/StreamPlayer";
import ChannelsSidebar from "./ChannelsSidebar";
import ChannelsDetails from "./ChannelsDetails";
import { DEFAULT_USER } from "../Api/config";
import useLiveChannelsStore from "../Global-storage/LiveChannelsStore";

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
  const { channelsCache, fetchChannels } = useLiveChannelsStore();
  const sidebarRef = useRef(null);
  const detailsTimerRef = useRef(null);
  const numberBufferRef = useRef("");
  const numberTimerRef = useRef(null);

  const showDetails = useCallback((durationMs = 5000) => {
    if (isSidebarOpen) return;
    setIsDetailsVisible(true);
    if (detailsTimerRef.current) {
      clearTimeout(detailsTimerRef.current);
    }
    detailsTimerRef.current = setTimeout(() => {
      setIsDetailsVisible(false);
    }, durationMs);
  }, [isSidebarOpen]);

  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || DEFAULT_USER.mobile;

  const payloadBase = {
    userid,
    mobile,
    ip_address: "192.168.101.110",
    mac: "26:F2:AE:D8:3F:99",
  };

  useEffect(() => {
    setCurrentStream(initialStreamlink || "");
    setCurrentChannel(channelData || null);
  }, [initialStreamlink, channelData]);

  useEffect(() => {
    let isMounted = true;

    const key = `${userid}|${mobile}|`;
    const cached = channelsCache[key]?.data;
    if (cached && isMounted) {
      setChannelsList(cached);
    }

    const loadChannels = async () => {
      try {
        const data = await fetchChannels(payloadBase, { key });
        if (isMounted) {
          setChannelsList(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isMounted) {
          setChannelsList([]);
        }
      }
    };

    loadChannels();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, userid]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const focusFirst = () => {
      const container = sidebarRef.current;
      if (!container) return;
      const target = container.querySelector('[tabindex="0"], [role="button"], button, a[href]');
      target?.focus?.();
    };

    const id = requestAnimationFrame(focusFirst);
    return () => cancelAnimationFrame(id);
  }, [isSidebarOpen]);

  useEffect(() => {
    const okKeys = new Set(["Enter", "OK", "Accept", "Select"]);
    const isChannelUpKey = (event) =>
      event.key === "ChannelUp" || event.key === "PageUp" || event.keyCode === 33;
    const isChannelDownKey = (event) =>
      event.key === "ChannelDown" || event.key === "PageDown" || event.keyCode === 34;
    const isBackKey = (event) =>
      event.key === "Backspace" || event.key === "Back" || event.key === "Escape" || event.keyCode === 461;
    const isHomeKey = (event) => event.key === "Home" || event.keyCode === 36;
    const isMenuKey = (event) => event.key === "Menu" || event.key === "ContextMenu" || event.keyCode === 458;
    const isInfoKey = (event) => event.key === "Info" || event.keyCode === 457;
    const getDigitFromEvent = (event) => {
      if (/^[0-9]$/.test(event.key)) return event.key;
      if (event.code && event.code.startsWith("Digit")) return event.code.replace("Digit", "");
      const code = event.keyCode;
      if (code >= 48 && code <= 57) return String(code - 48);
      if (code >= 96 && code <= 105) return String(code - 96);
      return "";
    };

    const findChannelIndex = (channel) => {
      if (!channel || channelsList.length === 0) return -1;
      const matchIndex = channelsList.findIndex((item) => {
        if (channel.channelno && item.channelno) {
          return String(item.channelno) === String(channel.channelno);
        }
        if (channel.channelid && item.channelid) {
          return String(item.channelid) === String(channel.channelid);
        }
        if (channel.chid && item.chid) {
          return String(item.chid) === String(channel.chid);
        }
        return item.streamlink && channel.streamlink && item.streamlink === channel.streamlink;
      });
      return matchIndex;
    };

    const handleChannelStep = (direction) => {
      if (channelsList.length === 0) return;
      const currentIndex = findChannelIndex(currentChannel);
      const nextIndex = currentIndex === -1
        ? 0
        : (currentIndex + direction + channelsList.length) % channelsList.length;
      const nextChannel = channelsList[nextIndex];
      if (!nextChannel) return;
      handleChannelSelect(nextChannel);
      showDetails();
    };

    const commitNumberJump = () => {
      const value = numberBufferRef.current;
      if (!value) return;
      numberBufferRef.current = "";
      if (numberTimerRef.current) {
        clearTimeout(numberTimerRef.current);
        numberTimerRef.current = null;
      }

      const target = channelsList.find((item) => {
        const rawNo =
          item.channelno ||
          item.channel_no ||
          item.chno ||
          item.channelNumber ||
          "";
        if (String(rawNo).trim() === String(value).trim()) return true;
        const parsedRaw = parseInt(rawNo, 10);
        const parsedValue = parseInt(value, 10);
        if (!Number.isNaN(parsedRaw) && !Number.isNaN(parsedValue)) {
          return parsedRaw === parsedValue;
        }
        return false;
      });
      if (target) {
        setLocalError("");
        handleChannelSelect(target);
        showDetails();
      } else {
        setLocalError(`Channel ${value} not found.`);
      }
    };

    const handleKey = (event) => {
      const digit = getDigitFromEvent(event);
      if (digit) {
        event.preventDefault();
        event.stopPropagation();
        numberBufferRef.current = `${numberBufferRef.current}${digit}`.slice(0, 4);
        if (numberTimerRef.current) {
          clearTimeout(numberTimerRef.current);
        }
        numberTimerRef.current = setTimeout(commitNumberJump, 1000);
        return;
      }

      if (isBackKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
          return;
        }
        if (isDetailsVisible) {
          setIsDetailsVisible(false);
          return;
        }
        window.history.back();
        return;
      }

      if (isHomeKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        navigate("/home");
        return;
      }

      if (isMenuKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        setIsSidebarOpen((prev) => !prev);
        return;
      }

      if (isInfoKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        showDetails();
        return;
      }

      if (event.key === "ArrowLeft") {
        if (!isSidebarOpen) {
          event.preventDefault();
          event.stopPropagation();
          setIsSidebarOpen(true);
        }
        return;
      }

      if (okKeys.has(event.key) && isSidebarOpen) {
        const container = sidebarRef.current;
        const activeEl = document.activeElement;
        if (container && activeEl && container.contains(activeEl)) {
          setTimeout(() => setIsSidebarOpen(false), 0);
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setIsSidebarOpen(false);
        return;
      }

      if (okKeys.has(event.key) && !isSidebarOpen) {
        event.preventDefault();
        event.stopPropagation();
        showDetails();
        return;
      }

      if (isChannelUpKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        handleChannelStep(1);
        return;
      }

      if (isChannelDownKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        handleChannelStep(-1);
        return;
      }
    };

    window.addEventListener("keydown", handleKey, true);
    return () => {
      window.removeEventListener("keydown", handleKey, true);
      if (detailsTimerRef.current) {
        clearTimeout(detailsTimerRef.current);
      }
      if (numberTimerRef.current) {
        clearTimeout(numberTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSidebarOpen, isDetailsVisible, channelsList, currentChannel, showDetails, navigate]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    setIsDetailsVisible(false);
    if (detailsTimerRef.current) {
      clearTimeout(detailsTimerRef.current);
    }
  }, [isSidebarOpen]);

  const getStreamUrl = (channel) =>
    channel?.streamlink ||
    channel?.stream_link ||
    channel?.streamurl ||
    channel?.stream_url ||
    channel?.url ||
    channel?.link ||
    channel?.videourl ||
    channel?.video_url ||
    channel?.hlsurl ||
    channel?.hls_url ||
    channel?.manifest ||
    channel?.manifesturl ||
    "";

  const handleChannelSelect = (channel) => {
    const streamUrl = getStreamUrl(channel);
    if (!streamUrl) {
      setLocalError("No stream URL found for this channel.");
      return;
    }
    setLocalError("");
    setCurrentStream(streamUrl);
    setCurrentChannel(channel);
    setIsSidebarOpen(false);
  };

  return (
    <Box sx={{ background: "#000", width: "100vw", height: "100vh", overflow: "hidden", position: "fixed", top: 0, left: 0 }}>
      {!currentStream ? (
        <Box sx={{ p: 3 }}>
          <Typography sx={{ color: "#ff9a9a", mb: 1 }}>No stream link provided.</Typography>
          {localError ? (
            <Typography sx={{ color: "#ffb347" }}>{localError}</Typography>
          ) : null}
        </Box>
      ) : (
        <Box sx={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
          <StreamPlayer key={currentStream} src={currentStream} />
          <ChannelsDetails channel={currentChannel} visible={isDetailsVisible} />
          {isSidebarOpen && (
            <Box
              ref={sidebarRef}
              sx={{ position: "absolute", top: 0, left: 0, height: "100%", zIndex: 20 }}
            >
              <ChannelsSidebar onChannelSelect={handleChannelSelect} currentChannel={currentChannel} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default LivePlayer;
import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import StreamPlayer from "../Atomic-Module-Componenets/Channels/StreamPlayer";
import ChannelsSidebar from "./ChannelsSidebar";
import ChannelsDetails from "./ChannelsDetails";
import { fetchChannels } from "../Api/modules-api/ChannelApi";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../Api/config";

const LivePlayer = () => {
  const location = useLocation();
  const { streamlink: initialStreamlink, channelData } = location.state || {};
  const [currentStream, setCurrentStream] = useState(initialStreamlink || "");
  const [currentChannel, setCurrentChannel] = useState(channelData || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [channelsList, setChannelsList] = useState([]);
  const sidebarRef = useRef(null);
  const detailsTimerRef = useRef(null);

  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || DEFAULT_USER.mobile;

  const payloadBase = {
    userid,
    mobile,
    ip_address: "192.168.101.110",
    mac: "26:F2:AE:D8:3F:99",
  };

  const headers = {
    ...DEFAULT_HEADERS,
  };

  useEffect(() => {
    setCurrentStream(initialStreamlink || "");
    setCurrentChannel(channelData || null);
  }, [initialStreamlink, channelData]);

  useEffect(() => {
    let isMounted = true;

    const loadChannels = async () => {
      try {
        const data = await fetchChannels(payloadBase, headers);
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
    const okKeys = new Set(["Enter", "OK", "Accept"]);
    const isChannelUpKey = (event) =>
      event.key === "ChannelUp" || event.key === "PageUp" || event.keyCode === 33;
    const isChannelDownKey = (event) =>
      event.key === "ChannelDown" || event.key === "PageDown" || event.keyCode === 34;

    const showDetails = (durationMs = 5000) => {
      setIsDetailsVisible(true);
      if (detailsTimerRef.current) {
        clearTimeout(detailsTimerRef.current);
      }
      detailsTimerRef.current = setTimeout(() => {
        setIsDetailsVisible(false);
      }, durationMs);
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

    const handleKey = (event) => {
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
        showDetails();
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

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      if (detailsTimerRef.current) {
        clearTimeout(detailsTimerRef.current);
      }
    };
  }, [isSidebarOpen, channelsList, currentChannel]);

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
    if (!streamUrl) return;
    setCurrentStream(streamUrl);
    setCurrentChannel(channel);
    setIsSidebarOpen(false);
    setIsDetailsVisible(true);
    if (detailsTimerRef.current) {
      clearTimeout(detailsTimerRef.current);
    }
    detailsTimerRef.current = setTimeout(() => {
      setIsDetailsVisible(false);
    }, 5000);
  };

  return (
    <Box sx={{ background: "#000", width: "100vw", height: "100vh", overflow: "hidden", position: "fixed", top: 0, left: 0 }}>
      {!currentStream ? (
        <Box sx={{ p: 3 }}>
          <Typography sx={{ color: "#ff9a9a" }}>No stream link provided.</Typography>
        </Box>
      ) : (
        <Box sx={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
          <StreamPlayer src={currentStream} />
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
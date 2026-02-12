import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import StreamPlayer from "../Atomic-Module-Componenets/Channels/StreamPlayer";
import ChannelsSidebar from "./ChannelsSidebar";
import ChannelsDetails from "./ChannelsDetails";
import ChannelNumberDisplay, { findChannelByNumber } from "./Lcn";
import { DEFAULT_USER } from "../Api/config";
import useLiveChannelsStore from "../Global-storage/LiveChannelsStore";
import { useRemoteNavigation } from "../Atomic-Common-Componenets/useRemoteNavigation";

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

  const showDetails = useCallback((durationMs = 3000) => {
    if (isSidebarOpen) return;
    setIsDetailsVisible(true);
    if (detailsTimerRef.current) {
      clearTimeout(detailsTimerRef.current);
    }
    detailsTimerRef.current = setTimeout(() => {
      setIsDetailsVisible(false);
    }, durationMs);
  }, [isSidebarOpen]);

  const toggleDetails = useCallback(() => {
    if (isSidebarOpen) return;
    
    // Use functional state update for immediate response
    setIsDetailsVisible(prev => {
      if (prev) {
        // If already visible, close it immediately
        if (detailsTimerRef.current) {
          clearTimeout(detailsTimerRef.current);
          detailsTimerRef.current = null;
        }
        return false;
      } else {
        // If not visible, show it and auto-close after 3 seconds
        if (detailsTimerRef.current) {
          clearTimeout(detailsTimerRef.current);
        }
        detailsTimerRef.current = setTimeout(() => {
          setIsDetailsVisible(false);
        }, 3000);
        return true;
      }
    });
  }, [isSidebarOpen]);
  // Helper function to get stream URL from channel data
  const getStreamUrl = useCallback((channel) =>
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
    "", []);

  // Handle channel selection
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
  }, [getStreamUrl]);

  const handleChannelStep = useCallback((direction) => {
    if (channelsList.length === 0) return;
    const findChannelIndex = (channel) => {
      if (!channel || channelsList.length === 0) return -1;
      return channelsList.findIndex((item) => {
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
    };
    
    const currentIndex = findChannelIndex(currentChannel);
    const nextIndex = currentIndex === -1
      ? 0
      : (currentIndex + direction + channelsList.length) % channelsList.length;
    const nextChannel = channelsList[nextIndex];
    if (nextChannel) {
      handleChannelSelect(nextChannel);
      showDetails();
    }
  }, [channelsList, currentChannel, showDetails, handleChannelSelect]);

  // Integrate useRemoteNavigation for standardized remote control
  useRemoteNavigation(1, {
    enabled: !isSidebarOpen,
    onSelect: () => {
      if (!isSidebarOpen) {
        toggleDetails();
      }
    },
    onBack: () => {
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
      } else if (isDetailsVisible) {
        setIsDetailsVisible(false);
        if (detailsTimerRef.current) {
          clearTimeout(detailsTimerRef.current);
          detailsTimerRef.current = null;
        }
      } else {
        navigate(-1);
      }
    },
    onHome: () => navigate("/home"),
    onMenu: () => setIsSidebarOpen(prev => !prev),
    onInfo: () => toggleDetails(),
    onChannelUp: () => handleChannelStep(1),
    onChannelDown: () => handleChannelStep(-1),
  });

  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || DEFAULT_USER.mobile;

  // Load channels once and cache; keep list locally for navigation order
  useEffect(() => {
    const payload = { userid, mobile, grid: "1" };
    fetchChannels(payload).then((channels) => {
      if (Array.isArray(channels)) {
        setChannelsList(channels);
      }
    });
  }, [fetchChannels, userid, mobile]);
// Handle numeric channel jump and left arrow separately (not handled by useRemoteNavigation)
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
      setTypedChannelNumber(""); // Clear display
      if (numberTimerRef.current) {
        clearTimeout(numberTimerRef.current);
        numberTimerRef.current = null;
      }

      const target = getChannelByNumber({ userid, mobile, grid: "1" }, value) || findChannelByNumber(channelsList, value);
      if (target) {
        setLocalError("");
        handleChannelSelect(target);
        showDetails();
      } else {
        setLocalError(`Channel ${value} not found.`);
      }
    };

    const handleKey = (event) => {
      // Handle numeric input for channel jump
      const digit = getDigitFromEvent(event);
      if (digit) {
        event.preventDefault();
        event.stopPropagation();
        numberBufferRef.current = `${numberBufferRef.current}${digit}`.slice(0, 4);
        setTypedChannelNumber(numberBufferRef.current); // Show on screen
        if (numberTimerRef.current) {
          clearTimeout(numberTimerRef.current);
        }
        numberTimerRef.current = setTimeout(commitNumberJump, 2000); // wait 2s after last digit
        return;
      }

      // Handle left arrow to open sidebar
      if (event.key === "ArrowLeft" && !isSidebarOpen && !isDetailsVisible) {
        event.preventDefault();
        event.stopPropagation();
        setIsSidebarOpen(true);
        return;
      }
    };

    window.addEventListener("keydown", handleKey, true);
    return () => {
      window.removeEventListener("keydown", handleKey, true);
      if (numberTimerRef.current) {
        clearTimeout(numberTimerRef.current);
      }
    };
  }, [isSidebarOpen, isDetailsVisible, channelsList, showDetails, handleChannelSelect, getChannelByNumber, userid, mobile]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    setIsDetailsVisible(false);
    if (detailsTimerRef.current) {
      clearTimeout(detailsTimerRef.current);
    }
  }, [isSidebarOpen]);

  return (
    <Box sx={{ background: "#000", width: "100vw", height: "100vh", overflow: "hidden", position: "fixed", top: 0, left: 0, margin: 0, padding: 0 }}>
      {/* Channel Number Display Overlay */}
      <ChannelNumberDisplay channelNumber={typedChannelNumber} />
      {!currentStream ? (
        <Box sx={{ p: 3 }}>
          <Typography sx={{ color: "#ff9a9a", mb: 1 }}>No stream link provided.</Typography>
          {localError ? (
            <Typography sx={{ color: "#ffb347" }}>{localError}</Typography>
          ) : null}
        </Box>
      ) : (
        <Box sx={{ width: "100vw", height: "100vh", overflow: "hidden", position: "fixed", top: 0, left: 0, margin: 0, padding: 0 }}>
          <StreamPlayer key={currentStream} src={currentStream} />
          
          <ChannelsDetails channel={currentChannel} visible={isDetailsVisible} />
          
          <Box
            ref={sidebarRef}
            sx={{ 
              position: "absolute", 
              top: 0, 
              left: 0, 
              height: "100%", 
              zIndex: 20,
              display: isSidebarOpen ? "block" : "none",
              transform: "translateZ(0)",
              willChange: "display",
            }}
          >
            <ChannelsSidebar onChannelSelect={handleChannelSelect} currentChannel={currentChannel} />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default LivePlayer;
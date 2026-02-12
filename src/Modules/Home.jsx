import { Box } from "@mui/material";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../Atomic-Common-Componenets/Headerbar";
import ChannelsView from "../Atomic-Module-Componenets/Home-Modules/ChannelsView";
import HomeAds from "../Atomic-Module-Componenets/Home-Modules/HomeAds";
import SidebarGlass from "./HomeSidebar";
import useLiveChannelsStore from "../Global-storage/LiveChannelsStore";
import { DEFAULT_USER } from "../Api/config";
import { TV_SPACING, TV_COLORS, TV_SAFE_ZONE } from "../styles/tvConstants";

const Home = () => {
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const sidebarRef = useRef(null);
  const contentRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const hasAutoPlayedRef = useRef(false);

  const { channelsCache, fetchChannels } = useLiveChannelsStore();
  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || "";
  const channelsKey = `${userid}|${mobile}|`;
  const channelsEntry = channelsCache[channelsKey] || {};
  const channels = channelsEntry.data || [];

  useEffect(() => {
    const searchEl = headerRef.current?.querySelector('[data-focus-id="header-search"]');
    searchEl?.focus?.();
  }, []);

  // Fetch channels on mount
  useEffect(() => {
    if (mobile && channels.length === 0 && !channelsEntry.isLoading) {
      fetchChannels({ userid, mobile }, { key: channelsKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-play Fo-Fi Info (999) after 5 seconds
  useEffect(() => {
    if (
      channels.length === 0 ||
      hasAutoPlayedRef.current ||
      !mobile
    ) {
      return;
    }

    console.log("[Home] Starting 5-second auto-play timer for Fo-Fi Info (999)...");

    autoPlayTimerRef.current = setTimeout(() => {
      const infoChannel = channels.find(
        (ch) =>
          String(ch.channelno || ch.channelid || ch.channel_no || "").trim() === "999"
      );

      if (infoChannel) {
        console.log("[Home] Auto-playing Fo-Fi Info channel (999)...");
        hasAutoPlayedRef.current = true;
        
        const streamUrl = infoChannel.streamlink || infoChannel.stream_link || 
                          infoChannel.streamurl || infoChannel.stream_url ||
                          infoChannel.url || infoChannel.link;

        if (streamUrl) {
          navigate("/player", { 
            state: { 
              streamlink: streamUrl, 
              title: infoChannel.chtitle, 
              channelData: infoChannel 
            } 
          });
        }
      } else {
        console.warn("[Home] Fo-Fi Info channel (999) not found");
      }
    }, 5000);

    return () => {
      if (autoPlayTimerRef.current) {
        console.log("[Home] Clearing auto-play timer");
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [channels, mobile, navigate]);

  useEffect(() => {
    const focusHeaderSearch = () => {
      const searchEl = headerRef.current?.querySelector('[data-focus-id="header-search"]');
      searchEl?.focus?.();
    };

    const focusHeaderSettings = () => {
      const settingsEl = headerRef.current?.querySelector('[data-focus-id="header-settings"]');
      settingsEl?.focus?.();
    };

    const focusSidebarFirst = () => {
      const target = sidebarRef.current?.querySelector('[tabindex="0"], [role="button"], button, a[href]');
      target?.focus?.();
    };

    const focusChannelsFirst = () => {
      const target = contentRef.current?.querySelector('[data-focusable="true"], [tabindex="0"], [role="button"], button, a[href]');
      target?.focus?.();
    };

    const handleKeyDown = (event) => {
      // Cancel auto-play on any navigation
      if (autoPlayTimerRef.current) {
        console.log("[Home] User interaction detected - canceling auto-play");
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
        hasAutoPlayedRef.current = true;
      }

      const { key } = event;
      const activeEl = document.activeElement;
      if (!activeEl) return;

      const inHeader = headerRef.current?.contains(activeEl);
      const inSidebar = sidebarRef.current?.contains(activeEl);
      const inContent = contentRef.current?.contains(activeEl);
      const isSettings = activeEl.getAttribute("data-focus-id") === "header-settings";

      if (key === "ArrowRight") {
        if (inHeader && isSettings) {
          event.preventDefault();
          focusSidebarFirst();
          return;
        }

        if (inSidebar) {
          event.preventDefault();
          focusChannelsFirst();
          return;
        }
      }

      if (key === "ArrowLeft") {
        if (inContent) {
          event.preventDefault();
          focusSidebarFirst();
          return;
        }

        if (inSidebar) {
          event.preventDefault();
          focusHeaderSettings();
          return;
        }
      }

      if (key === "ArrowDown") {
        if (inHeader) {
          event.preventDefault();
          focusChannelsFirst();
          return;
        }
      }

      if (key === "ArrowUp") {
        if (inContent) {
          event.preventDefault();
          focusHeaderSearch();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return (
    <Box
      sx={{
        bgcolor: TV_COLORS.background.primary,
        minHeight: "100vh",
        color: TV_COLORS.text.primary,
        overflowX: "hidden",
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
      }}
    >
      <Box
        ref={sidebarRef}
        data-focusable-section="home-sidebar"
        sx={{
          flex: "0 0 auto",
        }}
      >
        <SidebarGlass />
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          width: "100%",
        }}
      >
        <Box ref={headerRef} data-focusable-section="home-header">
          <Header />
        </Box>

        <Box
          ref={contentRef}
          data-focusable-section="home-content"
          sx={{
            width: "100%",
            pl: "9rem",
            pr: "4rem",
            pt: "2rem",
            pb: "3rem",
          }}
        >
          <Box sx={{ mb: "3rem" }}>
            <HomeAds/>
          </Box>
          <ChannelsView />
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
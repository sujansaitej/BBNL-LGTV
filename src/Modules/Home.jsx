import { Box } from "@mui/material";
import { useEffect, useRef } from "react";
import Header from "../Atomic-Common-Componenets/Headerbar";
import ChannelsView from "../Atomic-Module-Componenets/Home-Modules/ChannelsView";
import HomeAds from "../Atomic-Module-Componenets/Home-Modules/HomeAds";
import SidebarGlass from "./HomeSidebar";
import { TV_SPACING, TV_COLORS, TV_SAFE_ZONE } from "../styles/tvConstants";

const Home = () => {
  const headerRef = useRef(null);
  const sidebarRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const searchEl = headerRef.current?.querySelector('[data-focus-id="header-search"]');
    searchEl?.focus?.();
  }, []);

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
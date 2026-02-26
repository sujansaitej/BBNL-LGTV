import { AppBar, Toolbar, Typography, IconButton, Box, InputBase } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import { useEffect, useRef, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEnhancedRemoteNavigation } from "../Atomic-Common-Componenets/useMagicRemote";
import SidebarGlass from "./HomeSidebar";
import useLiveChannelsStore from "../Global-storage/LiveChannelsStore";
import useLanguageStore from "../Global-storage/LivePlayersStore";
import useHomeAdsStore from "../Global-storage/ChannelsSearchStore";
import { DEFAULT_USER } from "../Api/config";
import { TV_TYPOGRAPHY, TV_SPACING, TV_RADIUS, TV_COLORS, TV_TIMING, TV_SIZES, TV_SHADOWS } from "../styles/tvConstants";

const Home = () => {
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const sidebarRef = useRef(null);
  const contentRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const hasAutoPlayedRef = useRef(false);

  // ===================== LIVE CHANNELS STORE =====================
  const { channelsCache, fetchChannels } = useLiveChannelsStore();
  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || "";
  const channelsKey = `${userid}|${mobile}|`;
  const channelsEntry = channelsCache[channelsKey] || {};
  const channels = useMemo(() => channelsEntry.data || [], [channelsEntry.data]);

  // ===================== HEADER NAVIGATION =====================
  const headerItems = [
    { id: "search", type: "input" },
    { id: "settings", type: "button", action: () => navigate("/settings") },
  ];
  const {
    focusedIndex: headerFocusedIndex,
    hoveredIndex: headerHoveredIndex,
    getItemProps: getHeaderItemProps,
    magicRemoteReady: headerMagicRemoteReady,
  } = useEnhancedRemoteNavigation(headerItems, {
    orientation: "horizontal",
    useMagicRemotePointer: true,
    focusThreshold: 120,
    onSelect: (index) => {
      if (index === 1) navigate("/settings");
    },
  });

  const iconButtonSx = {
    bgcolor: TV_COLORS.background.tertiary,
    border: `2px solid ${TV_COLORS.glass.light}`,
    color: TV_COLORS.text.primary,
    width: TV_SIZES.icon.large,
    height: TV_SIZES.icon.large,
    "&:hover": { bgcolor: TV_COLORS.glass.light },
  };

  // ===================== CHANNELS VIEW (Language Grid) =====================
  const { languagesCache, error: langError, fetchLanguages } = useLanguageStore();

  useEffect(() => {
    if (!mobile) return;
    fetchLanguages({ userid, mobile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  const langKey = `${userid}|${mobile}`;
  const langEntry = languagesCache[langKey] || {};
  const languages = langEntry.data || [];
  const langLoading = langEntry.isLoading;

  const handleLanguageClick = (langid) => {
    navigate("/live-channels", { state: { filterByLanguage: langid } });
  };

  const {
    focusedIndex: langFocusedIndex,
    hoveredIndex: langHoveredIndex,
    getItemProps: getLangItemProps,
    magicRemoteReady: langMagicRemoteReady,
  } = useEnhancedRemoteNavigation(languages, {
    orientation: "grid",
    columns: 5,
    useMagicRemotePointer: true,
    focusThreshold: 150,
    onSelect: (index) => {
      if (languages[index]) handleLanguageClick(languages[index].langid);
    },
  });

  // ===================== HOME ADS =====================
  const adclient = "fofi";
  const srctype = "image";
  const displayarea = "homepage";
  const displaytype = "multiple";
  const preferForm = false;

  const { adsCache, error: adsError, fetchAds } = useHomeAdsStore();
  const [activeIndex, setActiveIndex] = useState(0);

  const adsKey = `${userid}|${mobile}|${displayarea}|${displaytype}|${adclient}|${srctype}`;
  const adsEntry = adsCache[adsKey] || {};
  const ads = adsEntry.data || [];
  const adsLoading = adsEntry.isLoading;

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [ads.length]);

  useEffect(() => {
    if (!mobile) return;
    fetchAds(
      { userid, mobile, adclient, srctype, displayarea, displaytype },
      { preferForm }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, adclient, srctype, displayarea, displaytype, preferForm]);

  // ===================== MAIN EFFECTS =====================
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
    if (channels.length === 0 || hasAutoPlayedRef.current || !mobile) return;

    console.log("[Home] Starting 5-second auto-play timer for Fo-Fi Info (999)...");

    autoPlayTimerRef.current = setTimeout(() => {
      const infoChannel = channels.find(
        (ch) =>
          String(ch.channelno || ch.channelid || ch.channel_no || "").trim() === "999"
      );

      if (infoChannel) {
        console.log("[Home] Auto-playing Fo-Fi Info channel (999)...");
        hasAutoPlayedRef.current = true;
        const streamUrl =
          infoChannel.streamlink || infoChannel.stream_link ||
          infoChannel.streamurl || infoChannel.stream_url ||
          infoChannel.url || infoChannel.link;
        if (streamUrl) {
          navigate("/player", {
            state: { streamlink: streamUrl, title: infoChannel.chtitle, channelData: infoChannel },
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
    const handleUserInteraction = () => {
      if (autoPlayTimerRef.current) {
        console.log("[Home] User interaction detected - canceling auto-play");
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
        hasAutoPlayedRef.current = true;
      }
    };
    window.addEventListener("keydown", handleUserInteraction, true);
    window.addEventListener("click", handleUserInteraction, true);
    return () => {
      window.removeEventListener("keydown", handleUserInteraction, true);
      window.removeEventListener("click", handleUserInteraction, true);
    };
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
      {/* ===================== SIDEBAR ===================== */}
      <Box ref={sidebarRef} data-focusable-section="home-sidebar" sx={{ flex: "0 0 auto" }}>
        <SidebarGlass />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, width: "100%" }}>
        {/* ===================== HEADER ===================== */}
        <Box ref={headerRef} data-focusable-section="home-header">
          <AppBar
            position="static"
            elevation={0}
            sx={{
              bgcolor: TV_COLORS.background.secondary,
              borderBottom: `2px solid ${TV_COLORS.glass.light}`,
            }}
          >
            <Toolbar sx={{ display: "flex", gap: TV_SPACING.lg, px: TV_SPACING.lg, py: TV_SPACING.sm }}>
              <Box display="flex" alignItems="center" gap={TV_SPACING.md} minWidth="12rem">
                <Typography
                  variant="h6"
                  fontWeight={700}
                  letterSpacing={0.5}
                  sx={{ ...TV_TYPOGRAPHY.h3, color: TV_COLORS.text.primary }}
                >
                  BBNL
                </Typography>
              </Box>

              <Box flex={1} display="flex" alignItems="center">
                <Box
                  {...getHeaderItemProps(0)}
                  data-focus-id="header-search"
                  className={`focusable-input ${headerFocusedIndex === 0 ? "focused" : ""} ${headerHoveredIndex === 0 ? "hovered" : ""}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: TV_SPACING.md,
                    bgcolor: TV_COLORS.glass.light,
                    border:
                      headerFocusedIndex === 0
                        ? `3px solid ${TV_COLORS.accent.primary}`
                        : `2px solid ${TV_COLORS.glass.medium}`,
                    borderRadius: TV_RADIUS.pill,
                    px: TV_SPACING.xl,
                    py: TV_SPACING.sm,
                    height: "3rem",
                    width: "100%",
                    maxWidth: "42rem",
                    transform: headerFocusedIndex === 0 ? "scale(1.02)" : "scale(1)",
                    transition: `all ${TV_TIMING.fast}`,
                    boxShadow: headerFocusedIndex === 0 ? TV_SHADOWS.focus : "none",
                    outline: "none",
                  }}
                >
                  <SearchIcon sx={{ color: TV_COLORS.text.tertiary, fontSize: TV_SIZES.icon.medium }} />
                  <InputBase
                    placeholder="Search for movies, TV shows..."
                    fullWidth
                    sx={{
                      color: TV_COLORS.text.primary,
                      ...TV_TYPOGRAPHY.body1,
                      "& input::placeholder": { color: TV_COLORS.text.tertiary },
                    }}
                    inputProps={{ "aria-label": "Search" }}
                  />
                </Box>
              </Box>

              <Box display="flex" alignItems="center" gap={TV_SPACING.md}>
                <IconButton
                  {...getHeaderItemProps(1)}
                  data-focus-id="header-settings"
                  className={`focusable-icon-button ${headerFocusedIndex === 1 ? "focused" : ""} ${headerHoveredIndex === 1 ? "hovered" : ""}`}
                  onClick={() => navigate("/settings")}
                  sx={{
                    ...iconButtonSx,
                    border:
                      headerFocusedIndex === 1
                        ? `3px solid ${TV_COLORS.accent.primary}`
                        : iconButtonSx.border,
                    transform: headerFocusedIndex === 1 ? "scale(1.15)" : "scale(1)",
                    transition: `all ${TV_TIMING.fast}`,
                    boxShadow: headerFocusedIndex === 1 ? TV_SHADOWS.focus : "none",
                    outline: "none",
                  }}
                  aria-label="Settings"
                >
                  <SettingsIcon sx={{ fontSize: TV_SIZES.icon.medium }} />
                </IconButton>

                {headerMagicRemoteReady && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#43e97b",
                      boxShadow: "0 0 10px rgba(67, 233, 123, 0.8)",
                      animation: "pulse-dot 1.5s ease-in-out infinite",
                    }}
                    title="Magic Remote Connected"
                  />
                )}
              </Box>
            </Toolbar>
          </AppBar>
        </Box>

        {/* ===================== MAIN CONTENT ===================== */}
        <Box
          ref={contentRef}
          data-focusable-section="home-content"
          sx={{ width: "100%", pl: "9rem", pr: "4rem", pt: "2rem", pb: "3rem" }}
        >
          {/* ===== HOME ADS ===== */}
          <Box sx={{ mb: "3rem" }}>
            {adsLoading ? (
              <Box
                sx={{
                  width: "100%",
                  height: "33rem",
                  borderRadius: "1.75rem",
                  background: "#121212",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "1.5rem",
                  color: "#2196f3",
                  fontWeight: 600,
                }}
              >
                Loading ads...
              </Box>
            ) : adsError ? (
              <Box
                sx={{
                  width: "100%",
                  height: "33rem",
                  borderRadius: "1.75rem",
                  background: "#121212",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "1.25rem",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {adsError}
              </Box>
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: "33rem",
                  borderRadius: "1.75rem",
                  overflow: "hidden",
                  background: "#121212",
                  position: "relative",
                  display: "block",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                {ads.map((url, index) => (
                  <Box
                    key={index}
                    sx={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      opacity: index === activeIndex ? 1 : 0,
                      transition: "opacity 0.8s ease-in-out",
                      zIndex: index === activeIndex ? 1 : 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={url}
                      alt={`ad-${index}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center",
                        display: "block",
                        margin: 0,
                        padding: 0,
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* ===== CHANNELS VIEW ===== */}
          <Box sx={{ mb: "3rem" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: "2rem",
              }}
            >
              <Typography sx={{ fontSize: "2rem", fontWeight: 700, color: "#fff" }}>
                TV CHANNELS
              </Typography>
            </Box>

            {langLoading && (
              <Typography sx={{ fontSize: "1.25rem", color: "rgba(255,255,255,0.6)" }}>
                Loading channels...
              </Typography>
            )}

            {langError && langError !== "NO_LOGIN" && (
              <Typography sx={{ fontSize: "1.25rem", color: "#f44336" }}>
                {langError}
              </Typography>
            )}

            {!langLoading && !langError && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))",
                  gap: "3rem",
                }}
              >
                {languages.length === 0 ? (
                  <Typography sx={{ fontSize: "1.25rem", color: "rgba(255,255,255,0.6)" }}>
                    No channels available
                  </Typography>
                ) : (
                  languages.map((lang, index) => {
                    const isFocused = langFocusedIndex === index;
                    const isHovered = langHoveredIndex === index;
                    return (
                      <Box
                        key={index}
                        {...getLangItemProps(index)}
                        className={`focusable-language-card ${isFocused ? "focused" : ""} ${isHovered ? "hovered" : ""}`}
                        role="button"
                        onClick={() => handleLanguageClick(lang.langid)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleLanguageClick(lang.langid);
                          }
                        }}
                        sx={{
                          width: "15rem",
                          borderRadius: "1rem",
                          cursor: "pointer",
                          transition: "all 0.25s ease",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          outline: "none",
                          transform: isFocused
                            ? "scale(1.15)"
                            : isHovered
                            ? "scale(1.08)"
                            : "scale(1)",
                          boxShadow: isFocused
                            ? "0 0 50px rgba(102, 126, 234, 1), 0 16px 50px rgba(0, 0, 0, 0.7)"
                            : isHovered
                            ? "0 8px 32px rgba(102, 126, 234, 0.5)"
                            : "0 4px 16px rgba(0, 0, 0, 0.3)",
                          "&:focus-visible": {
                            transform: "scale(1.15)",
                            outline: "5px solid #667eea",
                            outlineOffset: "8px",
                            boxShadow: TV_SHADOWS.focusGlow,
                          },
                        }}
                      >
                        {lang.langlogo && (
                          <Box
                            sx={{
                              width: "15rem",
                              height: "12rem",
                              overflow: "hidden",
                              borderRadius: "1rem",
                              position: "relative",
                              background: "#121212",
                              backgroundImage: `url(${lang.langlogo})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                              boxShadow: isFocused
                                ? "0 0 30px rgba(102, 126, 234, 0.8)"
                                : "0 4px 16px rgba(0, 0, 0, 0.3)",
                            }}
                          >
                            <Box
                              component="img"
                              src={lang.langlogo}
                              alt={lang.langtitle}
                              sx={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                opacity: 0,
                                pointerEvents: "none",
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.parentElement.style.backgroundImage = "none";
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    );
                  })
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
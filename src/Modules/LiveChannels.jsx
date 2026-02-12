import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, ButtonBase, Button, InputAdornment, IconButton, Skeleton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useInputFocusHandler, useRemoteNavigation, useGridNavigation } from "../Atomic-Common-Componenets/useRemoteNavigation";
import { DEFAULT_USER } from "../Api/config";
import SearchTextField from "../Atomic-Reusable-Componenets/Search";
import ChannelBox from "../Atomic-Reusable-Componenets/ChannelBox";
import useLiveChannelsStore from "../Global-storage/LiveChannelsStore";
import useLanguageStore from "../Global-storage/LivePlayersStore";
import {  TV_TYPOGRAPHY,  TV_SPACING,  TV_RADIUS, TV_COLORS,  TV_SIZES, TV_GRID, TV_SAFE_ZONE, TV_SHADOWS } from "../styles/tvConstants";
import "../styles/focus.css";

const LiveChannels = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("All Channels");
  const [authError, setAuthError] = useState("");
  const [localError, setLocalError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedLanguageId, setSelectedLanguageId] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isChannelsFocused, setIsChannelsFocused] = useState(false);
  const [channelJumpBuffer, setChannelJumpBuffer] = useState("");
  const {
    categories,
    channelsCache,
    isLoadingCategories,
    error,
    fetchCategories,
    fetchChannels,
    clearError,
  } = useLiveChannelsStore();
  const { languagesCache, fetchLanguages } = useLanguageStore();
  const lastAutoPlayKey = useRef("");
  const numberBufferRef = useRef("");
  const numberTimerRef = useRef(null);

  // Get userid + mobile
  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || "";
  const channelsKey = `${userid}|${mobile}|`;
  const channelsEntry = channelsCache[channelsKey] || {};
  const channels = useMemo(() => channelsEntry.data || [], [channelsEntry.data]);
  const isLoadingChannels = !!channelsEntry.isLoading;

  const langKey = `${userid}|${mobile}`;
  const langEntry = languagesCache[langKey] || {};
  const languages = useMemo(() => langEntry.data || [], [langEntry.data]);

  // Calculate columns dynamically based on viewport width
  const getColumnsCount = () => {
    const width = window.innerWidth;
    return TV_GRID.getColumns(width);
  };

  const [columnsCount, setColumnsCount] = useState(getColumnsCount());

  // Handle window resize for responsive columns
  useEffect(() => {
    const handleResize = () => {
      setColumnsCount(getColumnsCount());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const state = location.state || {};
    if (state.filterByLanguage !== undefined && state.filterByLanguage !== null) {
      setSelectedLanguageId(String(state.filterByLanguage));
      setActiveFilter("Language");
      setSearchTerm("");
      return;
    }

    if (state.filter) {
      setSelectedLanguageId("");
      setActiveFilter(state.filter);
      setSearchTerm("");
    }
  }, [location.state]);

  useEffect(() => {
    if (!mobile) return;
    if (!selectedLanguageId) return;
    if (languages.length > 0 || langEntry.isLoading) return;
    fetchLanguages(payloadBase, { key: langKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, selectedLanguageId]);

  // ================= SEARCH + FILTER =================
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const filteredChannels = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase().trim();
    const isNumericTerm = term !== "" && /^\d+$/.test(term);

    const selectedLanguage = languages.find(
      (lang) => String(lang.langid) === String(selectedLanguageId)
    );
    const selectedLanguageTitle = (selectedLanguage?.langtitle || "").toLowerCase();

    const matchesLanguage = (channel) => {
      if (!selectedLanguageId && !selectedLanguageTitle) return true;
      const langIdValue =
        channel.langid ||
        channel.lang_id ||
        channel.languageid ||
        channel.language_id ||
        channel.lang;
      const langTitleValue =
        channel.langtitle ||
        channel.langname ||
        channel.language ||
        channel.language_name;

      if (langIdValue && String(langIdValue) === String(selectedLanguageId)) {
        return true;
      }
      if (langTitleValue && selectedLanguageTitle) {
        return String(langTitleValue).toLowerCase().includes(selectedLanguageTitle);
      }
      return false;
    };

    let baseChannels = channels;
    if (activeFilter !== "All Channels") {
      if (activeFilter === "Subscribed Channels") {
        baseChannels = channels.filter((c) => c.subscribed === "yes");
      } else if (activeFilter === "Language") {
        // Language filter is handled separately by selectedLanguageId below
        baseChannels = channels;
      } else {
        const selectedCategory = categories.find((cat) => cat.title === activeFilter);
        if (selectedCategory) {
          baseChannels = channels.filter((c) => c.grid === selectedCategory.grid);
        }
      }
    }

    if (selectedLanguageId) {
      baseChannels = baseChannels.filter(matchesLanguage);
    }

    if (!term) {
      return baseChannels;
    }

    // Search in channelno and chtitle
    return baseChannels.filter((channel) => {
      const channelNo = (channel.channelno || "").toString().toLowerCase();
      const channelTitle = (channel.chtitle || "").toLowerCase();
      if (isNumericTerm) {
        return channelNo === term;
      }
      return channelTitle.includes(term) || channelNo.includes(term);
    });
  }, [activeFilter, categories, channels, debouncedSearchTerm, languages, selectedLanguageId]);

  // Enhanced categories with custom filters
  const enhancedCategories = useMemo(() => {
    const customCategories = [
      { title: "All Channels", grid: "all" },
      { title: "Subscribed Channels", grid: "subscribed" },
      { title: "Language", grid: "language" },
    ];
    const normalized = [...customCategories, ...categories];
    const seen = new Set();

    return normalized.filter((cat) => {
      const key = String(cat.title || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [categories]);

  // Include Language in remote navigation category list
  const navCategories = useMemo(() => enhancedCategories, [enhancedCategories]);

  const { getItemProps: getCategoryProps } = useRemoteNavigation(navCategories.length, {
    orientation: "horizontal",
    enabled: !isSearchFocused && !isChannelsFocused,
    onSelect: (index) => {
      handleFilter(navCategories[index]);
    },
  });

  const { getItemProps: getChannelProps } = useGridNavigation(filteredChannels.length, columnsCount || 5, {
    enabled: !isSearchFocused && isChannelsFocused,
    onSelect: (index) => {
      const ch = filteredChannels[index];
      if (ch) handleChannelSelect(ch);
    },
  });

  // Handle input focus to prevent scroll issues
  useInputFocusHandler();

  const payloadBase = {
    userid,
    mobile,
  };

  const focusFirstChannel = () => {
    requestAnimationFrame(() => {
      const el = document.querySelector(".channel-card");
      if (el) el.focus();
    });
  };

  const handleCategoryKeyDown = (event, index) => {
    if (index !== navCategories.length - 1) return;

    const key = event.key;
    if (key === "ArrowRight" || key === "ArrowDown" || key === "Right" || key === "Down") {
      event.preventDefault();
      event.stopPropagation();
      focusFirstChannel();
    }
  };

  // Handle channel selection (memoized for remote navigation + effects)
  const handleChannelSelect = useCallback((ch) => {
    // Try to find any stream URL
    let streamUrl = ch.streamlink || ch.stream_link || ch.streamurl || ch.stream_url ||
                    ch.url || ch.link || ch.videourl || ch.video_url ||
                    ch.hlsurl || ch.hls_url || ch.manifest || ch.manifesturl;

    if (streamUrl) {
      navigate("/player", { state: { streamlink: streamUrl, title: ch.chtitle, channelData: ch } });
    } else {
      setLocalError(`No stream URL found for channel: ${ch.chtitle}`);
    }
  }, [navigate]);

  // Handle search input change
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  useEffect(() => {
    if (!mobile) {
      setAuthError("NO_LOGIN");
      return;
    }
    setAuthError("");
    clearError();
    fetchCategories(payloadBase);
    fetchChannels(payloadBase, { key: channelsKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  // ================= FILTER HANDLER =================
  const handleFilter = (cat) => {

    setActiveFilter(cat.title);
    setSearchTerm(""); // Clear search when changing category
    setLocalError("");

    if (cat.title === "Language") {
      navigate("/languagechannels");
      return;
    }

    // Reset language selection when leaving language tab
    setSelectedLanguageId("");
  };

  // Auto-play when the search matches a single channel
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term || filteredChannels.length !== 1) {
      lastAutoPlayKey.current = "";
      return;
    }

    const match = filteredChannels[0];
    const title = (match.chtitle || "").toLowerCase();
    const channelNo = (match.channelno || "").toString().toLowerCase();
    const isExactMatch = term === title || term === channelNo;
    const autoPlayKey = `${match.channelno || ""}-${match.chtitle || ""}`;

    if (isExactMatch && lastAutoPlayKey.current !== autoPlayKey) {
      lastAutoPlayKey.current = autoPlayKey;
      handleChannelSelect(match);
    }
  }, [filteredChannels, debouncedSearchTerm, searchTerm, handleChannelSelect]);

  // ================= NUMERIC CHANNEL JUMP (IPTV FEATURE) =================
  useEffect(() => {
    const getDigitFromEvent = (event) => {
      if (/^[0-9]$/.test(event.key)) return event.key;
      if (event.code && event.code.startsWith("Digit")) return event.code.replace("Digit", "");
      const code = event.keyCode;
      if (code >= 48 && code <= 57) return String(code - 48);
      if (code >= 96 && code <= 105) return String(code - 96);
      return "";
    };

    const commitChannelJump = () => {
      const value = numberBufferRef.current;
      if (!value) return;
      setChannelJumpBuffer("");
      numberBufferRef.current = "";
      if (numberTimerRef.current) {
        clearTimeout(numberTimerRef.current);
        numberTimerRef.current = null;
      }

      const target = filteredChannels.find((item) => {
        const rawNo = item.channelno || item.channel_no || item.chno || "";
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
      } else {
        setLocalError(`Channel ${value} not found.`);
      }
    };

    const handleKey = (event) => {
      const digit = getDigitFromEvent(event);
      if (digit && !isSearchFocused) {
        event.preventDefault();
        event.stopPropagation();
        numberBufferRef.current = `${numberBufferRef.current}${digit}`.slice(0, 4);
        setChannelJumpBuffer(numberBufferRef.current);
        if (numberTimerRef.current) {
          clearTimeout(numberTimerRef.current);
        }
        numberTimerRef.current = setTimeout(commitChannelJump, 1000);
      }
    };

    window.addEventListener("keydown", handleKey, true);
    return () => {
      window.removeEventListener("keydown", handleKey, true);
      if (numberTimerRef.current) {
        clearTimeout(numberTimerRef.current);
      }
    };
  }, [filteredChannels, isSearchFocused, handleChannelSelect]);

  // Handle channel selection
  // Show login required message
  if (authError === "NO_LOGIN") {
    return (
      <Box
        sx={{
          background: TV_COLORS.background.primary,
          minHeight: "100vh",
          color: TV_COLORS.text.primary,
          px: TV_SAFE_ZONE.horizontal,
          py: TV_SAFE_ZONE.vertical,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ ...TV_TYPOGRAPHY.h1, mb: TV_SPACING.lg }}>
          Login Required
        </Typography>
        <Typography sx={{ ...TV_TYPOGRAPHY.body1, mb: TV_SPACING.md, color: TV_COLORS.text.tertiary }}>
          Please log in with your phone number to view TV channels.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/login")}
          sx={{
            ...TV_SIZES.button.large,
            ...TV_TYPOGRAPHY.button,
            background: `linear-gradient(135deg, ${TV_COLORS.accent.primary} 0%, ${TV_COLORS.accent.secondary} 100%)`,
            borderRadius: TV_RADIUS.xl,
            "&:hover": {
              background: `linear-gradient(135deg, ${TV_COLORS.accent.secondary} 0%, ${TV_COLORS.accent.primary} 100%)`,
            },
          }}
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: "#000",
        minHeight: "100vh",
        color: "#fff",
        px: "4rem",
        pt: "4.5rem",
        pb: "3rem",
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        position: "relative",
      }}
    >
      {/* ================= CHANNEL JUMP HUD ================= */}
      {channelJumpBuffer && (
        <Box
          sx={{
            position: "fixed",
            top: "2rem",
            right: "2rem",
            bgcolor: "#667eea",
            color: "#fff",
            px: "2rem",
            py: "1rem",
            borderRadius: "0.75rem",
            fontSize: "1.75rem",
            fontWeight: 700,
            boxShadow: "0 0 20px rgba(102, 126, 234, 0.5)",
            zIndex: 100,
            animation: "pulse 0.6s ease",
            "@keyframes pulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.7 },
            },
          }}
        >
          Channel: {channelJumpBuffer}
        </Box>
      )}
      {/* ================= HEADER WITH BACK BUTTON AND TITLE ================= */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "1.25rem" }}>
        {/* Back Button */}
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            color: "#fff",
            border: "2px solid rgba(255,255,255,0.4)",
            borderRadius: "0.75rem",
            width: "3.5rem",
            height: "3.5rem",
            "&:hover": {
              background: "rgba(255,255,255,0.1)",
            },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: "2rem" }} />
        </IconButton>

        {/* Title */}
        <Typography sx={{ fontSize: "2.5rem", fontWeight: 700, lineHeight: 1.2 }}>
          TV Channels
        </Typography>

        {/* Search Bar */}
        <Box
          sx={{
            width: "26rem",
            display: "flex",
            alignItems: "center",
          }}
        >
          <SearchTextField
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search Channels"
            type="text"
            autoFocus={false}
            maxLength={50}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "28px",
                minHeight: "3.5rem",
                "& fieldset": {
                  borderColor: "rgba(255,255,255,0.3)",
                  borderWidth: "2px",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(255,255,255,0.5)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#667eea",
                  borderWidth: "2px",
                },
              },
              "& .MuiInputBase-input": {
                fontSize: "1.25rem",
                padding: "0.875rem 1rem",
                fontWeight: 500,
              },
              "& .MuiInputBase-input::placeholder": {
                color: "rgba(255,255,255,0.6)",
                opacity: 1,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "rgba(255,255,255,0.5)", fontSize: "1.5rem" }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton onClick={handleClearSearch} size="small" sx={{ color: "#fff" }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* ================= CATEGORY FILTER TABS (WITH LANGUAGE) ================= */}
      <Box className="cat-titlel" sx={{ mb: "2.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", width: "100%", px: "4rem", py: "1rem", background: "#000" }}>
        {isLoadingCategories
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={`cat-skel-${index}`}
                variant="rounded"
                sx={{ width: "10rem", height: "2.75rem", borderRadius: "9999px" }}
              />
            ))
          : navCategories.map((cat, index) => {
              const isActive = activeFilter === cat.title;
              const categoryProps = !isSearchFocused ? getCategoryProps(index) : {};

              return (
                <ButtonBase
                  key={cat.grid || index}
                  {...categoryProps}
                  onClick={() => handleFilter(cat)}
                  onKeyDown={(event) => handleCategoryKeyDown(event, index)}
                  onFocus={(event) => {
                    categoryProps.onFocus?.(event);
                    setIsChannelsFocused(false);
                  }}
                  sx={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    px: "2rem",
                    py: "0.75rem",
                    borderRadius: "9999px",
                    bgcolor: isActive ? "#fff" : "rgba(255,255,255,0.08)",
                    color: isActive ? "#000" : "#fff",
                    transition: "all 0.2s",
                    outline: categoryProps["data-focused"] ? "3px solid #667eea" : "none",
                    outlineOffset: "3px",
                    "&:hover": {
                      bgcolor: isActive ? "#fff" : "rgba(255,255,255,0.12)",
                    },
                    "&:focus-visible": {
                      border: "3px solid #667eea",
                      transform: "scale(1.05)",
                      boxShadow: "0 0 0 4px rgba(102, 126, 234, 0.4)",
                    },
                  }}
                >
                  {cat.title}
                </ButtonBase>
              );
            })}
      </Box>

      {/* ================= ERROR/LOADING STATES ================= */}
      {error && (
        <Typography sx={{ fontSize: "1.25rem", color: "#f44336", mb: "1.5rem" }}>
          {error}
        </Typography>
      )}

      {localError && (
        <Typography sx={{ fontSize: "1.25rem", color: "#ff9800", mb: "1.5rem" }}>
          {localError}
        </Typography>
      )}

      {/* ================= CHANNELS GRID ================= */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${columnsCount || 5}, 1fr)` ,
          gap: "2.5rem",
        }}
      >
        {isLoadingChannels
          ? Array.from({ length: 10 }).map((_, index) => (
              <Skeleton
                key={`channel-skel-${index}`}
                variant="rounded"
                sx={{ width: "100%", height: "9rem", borderRadius: "1rem" }}
              />
            ))
          : filteredChannels.length === 0 ? (
              <Box sx={{ gridColumn: "1 / -1", textAlign: "center", py: "4rem" }}>
                <Typography sx={{ fontSize: "1.75rem", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
                  No channels found
                </Typography>
              </Box>
            ) : (
              filteredChannels.map((channel, index) => {
                const channelProps = getChannelProps(index);
                return (
                  <Box
                    key={`${channel.channelno}-${index}`}
                    {...channelProps}
                    tabIndex={0}
                    className="channel-card"
                    role="button"
                    onClick={() => handleChannelSelect(channel)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleChannelSelect(channel);
                      }
                    }}
                    onFocus={(event) => {
                      channelProps.onFocus?.(event);
                      setIsChannelsFocused(true);
                    }}
                    sx={{
                      outline: "none",
                      "&:focus-visible": {
                        borderRadius: TV_RADIUS.xl,
                        boxShadow: "none",
                      },
                      "&:focus-visible .channel-thumb": {
                        border: "3px solid #667eea",
                        boxShadow: "0 0 0 4px rgba(102, 126, 234, 0.4)",
                        transform: "scale(1.05)",
                      },
                    }}
                  >
                    <ChannelBox
                      logo={channel.chlogo}
                      name={channel.chtitle}
                      channelNo={channel.channelno}
                      onClick={() => handleChannelSelect(channel)}
                    />
                  </Box>
                );
              })
            )}
      </Box>
    </Box>
  );
};

export default LiveChannels;

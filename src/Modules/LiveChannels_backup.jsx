import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Box, Typography, ButtonBase, Button, InputAdornment, IconButton, Skeleton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { useGridNavigation, useInputFocusHandler, useRemoteNavigation } from "../Atomic-Common-Componenets/useRemoteNavigation";
import { DEFAULT_USER } from "../Api/config";
import SearchTextField from "../Atomic-Reusable-Componenets/Search";
import ChannelBox from "../Atomic-Reusable-Componenets/ChannelBox";
import useLiveChannelsStore from "../Global-storage/LiveChannelsStore";
import useLanguageStore from "../Global-storage/LivePlayersStore";

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
  const { categories, channelsCache,error,fetchCategories,fetchChannels,clearError,} = useLiveChannelsStore();
  const { languagesCache, fetchLanguages } = useLanguageStore();
  const lastAutoPlayKey = useRef("");

  // Get userid + mobile (safe for environments without localStorage)
  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || "";
  const channelsKey = `${userid}|${mobile}|`;
  const channelsEntry = channelsCache[channelsKey] || {};
  const channels = channelsEntry.data || [];

  const langKey = `${userid}|${mobile}`;
  const langEntry = languagesCache[langKey] || {};
  const languages = langEntry.data || [];

  // Calculate columns dynamically based on viewport width
  const getColumnsCount = () => {
    const width = window.innerWidth;
    const cardWidth = 280;
    const gap = 32; // 8 units = 8 * 4px = 32px
    const padding = 40; // 5 units padding on each side
    const availableWidth = width - padding * 2;
    return Math.max(3, Math.floor(availableWidth / (cardWidth + gap)));
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

  // Use grid navigation for channel cards
  const { focusedIndex, getItemProps: getChannelProps } = useGridNavigation(
    filteredChannels.length,
    columnsCount,
    {
      enabled: !isSearchFocused,
      onSelect: (index) => {
        const ch = filteredChannels[index];
        if (ch) {
          handleChannelSelect(ch);
        }
      },
    }
  );

  // Use horizontal navigation for category filters
  const { getItemProps: getCategoryProps } = useRemoteNavigation(
    categories.length,
    {
      orientation: "horizontal",
      enabled: !isSearchFocused,
      onSelect: (index) => {
        handleFilter(categories[index]);
      },
    }
  );

  // Handle input focus to prevent scroll issues
  useInputFocusHandler();

  const payloadBase = {
    userid,
    mobile,
  };

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
  }, [filteredChannels, debouncedSearchTerm]);

  // Handle channel selection
  const handleChannelSelect = (ch) => {
    // Try to find any stream URL
    let streamUrl = ch.streamlink || ch.stream_link || ch.streamurl || ch.stream_url || 
                    ch.url || ch.link || ch.videourl || ch.video_url || 
                    ch.hlsurl || ch.hls_url || ch.manifest || ch.manifesturl;
    
    if (streamUrl) {
      navigate("/player", { state: { streamlink: streamUrl, title: ch.chtitle, channelData: ch } });
    } else {
      setLocalError(`No stream URL found for channel: ${ch.chtitle}`);
    }
  };

  // ================= CHANNEL CARD =================

  // Show login required message
  if (authError === "NO_LOGIN") {
    return (
      <Box
        sx={{
          background: "#000",
          minHeight: "100vh",
          color: "#fff",
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontSize: 28, fontWeight: 700, mb: 2 }}>
          Login Required
        </Typography>
        <Typography sx={{ fontSize: 16, mb: 1, color: "#999" }}>
          Please log in with your phone number to view TV channels.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/login")}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: 16,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
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
        p: 5,
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        letterSpacing: "0.3px",
      }}
    >
      {/* ================= HEADER WITH BACK BUTTON AND TITLE ================= */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 5 }}>
        {/* Back Button */}
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            color: "#fff",
            border: "2px solid rgba(255,255,255,0.4)",
            borderRadius: "10px",
            padding: "12px",
            "&:hover": {
              background: "rgba(255,255,255,0.15)",
            },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 28 }} />
        </IconButton>

        {/* Title on Right */}
        <Typography sx={{ fontSize: 38, fontWeight: 700, lineHeight: 1.1, letterSpacing: "0.5px" }}>
          TV Channels
        </Typography>

        {/* Search Bar */}
        <Box
          sx={{
            width: 420,
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
                minHeight: 56,
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
                fontSize: 20,
                padding: "14px 16px",
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
                  <SearchIcon sx={{ color: "rgba(255,255,255,0.5)" }} />
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

      {/* ================= ERROR BOX ================= */}
      {(localError || error) && authError !== "NO_LOGIN" && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            border: "1px solid red",
            background: "rgba(255,0,0,0.15)",
            color: "#ff9a9a",
          }}
        >
          {localError || error}
        </Box>
      )}

      {/* ================= CATEGORY FILTERS ================= */}
      <Box sx={{ display: "flex", gap: 2.5, mb: 5, flexWrap: "wrap", overflowX: "auto", pb: 2 }}>
        {categories.map((cat, i) => {
          const categoryProps = !isSearchFocused ? getCategoryProps(i) : {};
          return (
            <ButtonBase
              key={i}
              {...categoryProps}
              onClick={() => handleFilter(cat)}
              sx={{
                px: 5,
                py: 1.75,
                borderRadius: "26px",
                border: activeFilter === cat.title ? "none" : "2px solid rgba(255,255,255,0.3)",
                color: "#fff",
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: "0.3px",
                background: activeFilter === cat.title 
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                  : "rgba(255,255,255,0.08)",
                transition: "all 0.25s ease",
                outline: categoryProps["data-focused"] ? "3px solid #667eea" : "none",
                outlineOffset: "3px",
                minHeight: 52,
                "&:hover": {
                  background: activeFilter === cat.title
                    ? "linear-gradient(135deg, #764ba2 0%, #667eea 100%)"
                    : "rgba(255,255,255,0.15)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              {cat.title}
            </ButtonBase>
          );
        })}
        
        {/* Language Filter Button */}
        <ButtonBase
          onClick={() => navigate("/languagechannels")}
          sx={{
            px: 5,
            py: 1.75,
            borderRadius: "26px",
            border: activeFilter === "Language" ? "none" : "2px solid rgba(255,255,255,0.3)",
            color: "#fff",
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: "0.3px",
            background: activeFilter === "Language" 
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
              : "rgba(255,255,255,0.08)",
            transition: "all 0.25s ease",
            minHeight: 52,
            "&:hover": {
              background: activeFilter === "Language"
                ? "linear-gradient(135deg, #764ba2 0%, #667eea 100%)"
                : "rgba(255,255,255,0.15)",
              transform: "translateY(-2px)",
            },
          }}
        >
          Language
        </ButtonBase>
      </Box>

      {/* ================= CHANNEL GRID ================= */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 8,
          pb: 5,
          alignContent: "start",
          justifyContent: "start",
          width: "100%",
        }}
      >
        {channelsEntry.isLoading
          ? Array.from({ length: channelsEntry.count || 100}).map((_, i) => (
              <Box key={`skeleton-${i}`}>
                <Skeleton
                  variant="rectangular"
                  width={280}
                  height={160}
                  sx={{ borderRadius: "18px", mb: 2, bgcolor: "rgba(255, 255, 255, 0.57)" }}
                />
                <Skeleton width="70%" height={24} sx={{ bgcolor: "rgba(255, 255, 255, 0.6)" }} />
              </Box>
            ))
          : filteredChannels.map((ch, i) => {
              const channelProps = !isSearchFocused ? getChannelProps(i) : {};
              return (
                <Box key={i} {...channelProps}>
                  <ChannelBox
                    logo={ch.chlogo}
                    name={ch.chtitle}
                    channelNo={ch.channelno}
                    subscribed={ch.subscribed}
                    focused={channelProps["data-focused"] && !isSearchFocused}
                    onClick={() => handleChannelSelect(ch)}
                  />
                </Box>
              );
            })}
      </Box>
    </Box>
  );
};

export default LiveChannels;
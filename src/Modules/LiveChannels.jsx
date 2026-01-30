import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

import { Box, Typography, ButtonBase, Button, InputAdornment, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { fetchCategories, fetchChannels } from "../Api/modules-api/ChannelApi";
import { useGridNavigation, useInputFocusHandler, useRemoteNavigation } from "../Atomic-Common-Componenets/useRemoteNavigation";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../Api/config";
import SearchTextField from "../Atomic-Reusable-Componenets/Search";

const LiveChannels = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All Channels");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // RxJS Subject for search
  const searchSubject = useRef(new Subject());

  // Calculate columns based on grid
  const columnsCount = 5; // Adjust based on your grid layout

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

  // Get userid + mobile (safe for environments without localStorage)
  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || "";

  const payloadBase = {
    userid,
    mobile,
  };

  const headers = {
    ...DEFAULT_HEADERS,
  };

  // ================= RXJS SEARCH SETUP =================
  useEffect(() => {
    const subscription = searchSubject.current
      .pipe(
        debounceTime(300), // Wait 300ms after user stops typing
        distinctUntilChanged() // Only emit if value changed
      )
      .subscribe((searchValue) => {
        performSearch(searchValue);
      });

    return () => subscription.unsubscribe();
  }, [channels, activeFilter]);

  // ================= SEARCH FUNCTION =================
  const performSearch = (searchValue) => {
    const term = searchValue.toLowerCase().trim();
    
    if (!term) {
      // If search is empty, apply current filter
      applyFilter(activeFilter);
      return;
    }

    // Filter based on active category first
    let baseChannels = channels;
    if (activeFilter !== "All Channels") {
      if (activeFilter === "Subscribed Channels") {
        baseChannels = channels.filter((c) => c.subscribed === "yes");
      } else {
        const selectedCategory = categories.find(cat => cat.title === activeFilter);
        if (selectedCategory) {
          baseChannels = channels.filter((c) => c.grid === selectedCategory.grid);
        }
      }
    }

    // Search in channelno and chtitle
    const results = baseChannels.filter((channel) => {
      const channelNo = (channel.channelno || "").toString().toLowerCase();
      const channelTitle = (channel.chtitle || "").toLowerCase();
      return channelNo.includes(term) || channelTitle.includes(term);
    });

    setFilteredChannels(results);
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    searchSubject.current.next(value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    searchSubject.current.next("");
  };


  // ================= FETCH CATEGORIES =================
  const handleFetchCategories = async () => {
    try {
      const formatted = await fetchCategories(payloadBase, headers);
      setCategories(formatted);
    } catch (err) {
      setError("Failed to load categories");
    }
  };

  // ================= FETCH CHANNELS =================
  const handleFetchChannels = async () => {
    try {
      const apiChannels = await fetchChannels(payloadBase, headers, setError);
      setChannels(apiChannels);
      setFilteredChannels(apiChannels);
    } catch (err) {
      setError("Failed to load channels - Network error or invalid credentials.");
    }
  };

  useEffect(() => {
    if (!mobile) {
      setError("NO_LOGIN");
      return;
    }
    handleFetchCategories();
    handleFetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  // ================= FILTER HANDLER =================
  const applyFilter = (filterTitle) => {
    if (filterTitle === "All Channels") {
      setFilteredChannels(channels);
      return;
    }

    if (filterTitle === "Subscribed Channels") {
      setFilteredChannels(channels.filter((c) => c.subscribed === "yes"));
      return;
    }

    const selectedCategory = categories.find(cat => cat.title === filterTitle);
    if (selectedCategory) {
      setFilteredChannels(channels.filter((c) => c.grid === selectedCategory.grid));
    }
  };

  const handleFilter = (cat) => {
    setActiveFilter(cat.title);
    setSearchTerm(""); // Clear search when changing category
    applyFilter(cat.title);
  };

  // Handle channel selection
  const handleChannelSelect = (ch) => {
    // Try to find any stream URL
    let streamUrl = ch.streamlink || ch.stream_link || ch.streamurl || ch.stream_url || 
                    ch.url || ch.link || ch.videourl || ch.video_url || 
                    ch.hlsurl || ch.hls_url || ch.manifest || ch.manifesturl;
    
    if (streamUrl) {
      navigate("/player", { state: { streamlink: streamUrl, title: ch.chtitle, channelData: ch } });
    } else {
      setError(`No stream URL found for channel: ${ch.chtitle}`);
    }
  };

  // ================= CHANNEL CARD =================
  const ChannelBox = ({ logo, name, subscribed, onClick, focused }) => (
    <Box>
      <Box
        sx={{
          width: 200,
          height: 120,
          background: "#fff",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          cursor: onClick ? "pointer" : "default",
          border: focused ? "4px solid #667eea" : "4px solid transparent",
          transform: focused ? "scale(1.1)" : "scale(1)",
          transition: "all 0.2s ease",
          boxShadow: focused ? "0 8px 24px rgba(102, 126, 234, 0.4)" : "none",
          zIndex: focused ? 10 : 1,
        }}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
      >
        {subscribed === "yes" && (
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "red",
              color: "#fff",
              fontSize: 10,
              px: 1.5,
              borderRadius: "10px",
            }}
          >
            Live
          </Box>
        )}

        <img
          src={logo}
          alt={name}
          style={{ width: "80%", height: "80%", objectFit: "contain" }}
          onError={(e) =>
            (e.target.src =
              "http://124.40.244.211/netmon/assets/site_images/chnlnoimage.jpg")
          }
        />
      </Box>

      <Typography sx={{ color: "#fff", fontSize: 14, fontWeight: 600, mt: 1 }}>
        {name}
      </Typography>

      {/* <Typography sx={{ color: "#9b9b9b", fontSize: 12 }}>
        live Channels
      </Typography> */}
    </Box>
  );

  // Show login required message
  if (error === "NO_LOGIN") {
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
    <Box sx={{ background: "#000", minHeight: "100vh", color: "#fff", p: 3 }}>
      {/* ================= HEADER WITH BACK BUTTON AND TITLE ================= */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        {/* Back Button */}
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "8px",
            "&:hover": {
              background: "rgba(255,255,255,0.1)",
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        {/* Title on Right */}
        <Typography sx={{ fontSize: 24, fontWeight: 700 }}>
          TV Channels
        </Typography>

        {/* Search Bar */}
        <Box
          sx={{
            width: 300,
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
                background: "rgba(255,255,255,0.05)",
                borderRadius: "20px",
                "& fieldset": {
                  borderColor: "rgba(255,255,255,0.2)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(255,255,255,0.3)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#667eea",
                },
              },
              "& .MuiInputBase-input::placeholder": {
                color: "rgba(255,255,255,0.5)",
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
      {error && error !== "NO_LOGIN" && (
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
          {error}
        </Box>
      )}

      {/* ================= CATEGORY FILTERS ================= */}
      <Box sx={{ display: "flex", gap: 1.5, mb: 4, flexWrap: "wrap", overflowX: "auto", pb: 1 }}>
        {categories.map((cat, i) => {
          const categoryProps = !isSearchFocused ? getCategoryProps(i) : {};
          return (
            <ButtonBase
              key={i}
              {...categoryProps}
              onClick={() => handleFilter(cat)}
              sx={{
                px: 3,
                py: 1,
                borderRadius: "20px",
                border: activeFilter === cat.title ? "none" : "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
                background: activeFilter === cat.title 
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                  : "rgba(255,255,255,0.05)",
                transition: "all 0.3s ease",
                outline: categoryProps["data-focused"] ? "2px solid #667eea" : "none",
                outlineOffset: "2px",
                "&:hover": {
                  background: activeFilter === cat.title
                    ? "linear-gradient(135deg, #764ba2 0%, #667eea 100%)"
                    : "rgba(255,255,255,0.1)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              {cat.title}
            </ButtonBase>
          );
        })}
      </Box>

      {/* ================= CHANNEL GRID ================= */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 220px)",
          gap: 3,
          pb: 4,
        }}
      >
        {filteredChannels.length === 0 ? (
          <Typography sx={{ color: "#888" }}>
            No channels available
          </Typography>
        ) : (
          filteredChannels.map((ch, i) => {
            const channelProps = !isSearchFocused ? getChannelProps(i) : {};
            return (
              <Box key={i} {...channelProps}>
                <ChannelBox
                  logo={ch.chlogo}
                  name={ch.chtitle}
                  subscribed={ch.subscribed}
                  focused={channelProps["data-focused"] && !isSearchFocused}
                  onClick={() => handleChannelSelect(ch)}
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



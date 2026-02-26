import { useState, useEffect, useMemo } from "react";
import { Box, Typography, List, ListItemButton, Avatar, Tabs, Tab } from "@mui/material";
import { DEFAULT_USER } from "../Api/config";
import useLiveChannelsStore from "../Global-storage/LiveChannelsStore";
import { TV_TYPOGRAPHY, TV_SPACING, TV_RADIUS, TV_COLORS, TV_FOCUS, TV_TIMING } from "../styles/tvConstants";
import { useEnhancedRemoteNavigation } from "../Atomic-Common-Componenets/useMagicRemote";

const ChannelsSidebar = ({ onChannelSelect, currentChannel }) => {
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { categories: cachedCategories, channelsCache, fetchCategories, fetchChannels } = useLiveChannelsStore();
  const [selectedCategory, setSelectedCategory] = useState(0);

  // Get device info from config
  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || DEFAULT_USER.mobile;

  const payloadBase = {
    userid,
    mobile,
    ip_address: "192.168.101.110",
    mac: "26:F2:AE:D8:3F:99",
  };

  const formatPrice = (value) => {
    if (value === undefined || value === null) return "";
    const text = String(value).trim();
    if (!text) return "";
    if (text === "0" || text === "0.0" || text === "0.00") return "Free";
    return /^[0-9]+(\.[0-9]+)?$/.test(text) ? `₹${text}` : text;
  };

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (cachedCategories.length > 0) {
          setCategories([{ title: "All", grid: "" }, ...cachedCategories]);
        }
        const cats = await fetchCategories(payloadBase);
        setCategories([{ title: "All", grid: "" }, ...cats]);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch channels
  useEffect(() => {
    const loadChannels = async () => {
      try {
        setLoading(true);
        setError("");
        const currentGrid = categories[selectedCategory]?.grid || "";
        const payload = {
          ...payloadBase,
          grid: currentGrid,
        };
        const key = `${userid}|${mobile}|${currentGrid}`;
        const cached = channelsCache[key]?.data;
        if (cached) {
          setChannels(cached || []);
        }
        const channelsData = await fetchChannels(payload, { key });
        setChannels(channelsData || []);
      } catch (err) {
        setError("Failed to load channels");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (categories.length > 0) {
      loadChannels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, categories]);

  // Magic Remote Navigation: Categories + Channels combined
  const allNavigableItems = useMemo(() => {
    return [...categories, ...channels];
  }, [categories, channels]);

  const {
    focusedIndex,
    hoveredIndex,
    getItemProps,
    magicRemoteReady,
  } = useEnhancedRemoteNavigation(allNavigableItems, {
    orientation: 'vertical',
    useMagicRemotePointer: true,
    focusThreshold: 150,
    onSelect: (index) => {
      if (index < categories.length) {
        // Category selected
        setSelectedCategory(index);
      } else {
        // Channel selected
        const channelIndex = index - categories.length;
        if (channels[channelIndex] && onChannelSelect) {
          onChannelSelect(channels[channelIndex]);
        }
      }
    },
  });


  return (
    <Box
      sx={{
        width: "28rem",
        bgcolor: "rgba(0, 0, 0, 0.7)",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        pt: TV_SPACING.xl,
        px: TV_SPACING.lg,
      }}
    >
      {/* Magic Remote Status */}
      {magicRemoteReady && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          mb: 2,
          px: '0.75rem',
          py: '0.5rem',
          borderRadius: '8px',
          bgcolor: 'rgba(67, 233, 123, 0.15)',
          border: '2px solid rgba(67, 233, 123, 0.5)',
        }}>
          <Box sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#43e97b',
            boxShadow: '0 0 10px rgba(67, 233, 123, 0.8)',
            animation: 'pulse-dot 1.5s ease-in-out infinite',
          }} />
          <Typography sx={{ fontSize: '0.75rem', color: '#43e97b', fontWeight: 600 }}>
            Magic Remote
          </Typography>
        </Box>
      )}

      <Tabs
          value={selectedCategory}
          onChange={(e, newValue) => setSelectedCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: "3rem",
            "& .MuiTab-root": {
              minHeight: "2.75rem",
              minWidth: "5.5rem",
              ...TV_TYPOGRAPHY.body2,
              color: TV_COLORS.text.tertiary,
              textTransform: "none",
              borderRadius: TV_RADIUS.pill,
              px: TV_SPACING.lg,
              py: TV_SPACING.sm,
              mr: TV_SPACING.sm,
              transition: `all ${TV_TIMING.fast}`,
              "&.Mui-selected": {
                color: "#000",
                bgcolor: "#fff",
                fontWeight: 700,
              },
              "&:focus": {
                ...TV_FOCUS.primary,
              },
            },
            "& .MuiTabs-indicator": {
              display: "none",
            },
          }}
        >
          {categories.map((cat, idx) => {
            const isFocused = focusedIndex === idx;
            const isHovered = hoveredIndex === idx;
            
            return (
              <Tab 
                key={idx} 
                label={cat.title}
                {...getItemProps(idx)}
                className={`focusable-category-tab ${isFocused ? 'focused' : ''} ${isHovered ? 'hovered' : ''}`}
                sx={{
                  border: isFocused ? "2px solid #667eea !important" : undefined,
                  transform: isFocused ? "scale(1.08) !important" : isHovered ? "scale(1.03) !important" : undefined,
                  boxShadow: isFocused ? "0 4px 12px rgba(102, 126, 234, 0.4) !important" : undefined,
                }}
              />
            );
          })}
        </Tabs>

      {/* -------- CHANNEL LIST -------- */}
      <Box sx={{ flex: 1, overflowY: "auto", px: TV_SPACING.md, py: TV_SPACING.md }}>
        {loading && (
          <Typography
            sx={{
              textAlign: "center",
              ...TV_TYPOGRAPHY.body2,
              color: TV_COLORS.text.secondary,
              mt: TV_SPACING.xl,
            }}
          >
            Loading channels...
          </Typography>
        )}

        {error && (
          <Typography
            sx={{
              textAlign: "center",
              ...TV_TYPOGRAPHY.body2,
              color: TV_COLORS.error,
              mt: TV_SPACING.xl,
            }}
          >
            {error}
          </Typography>
        )}

        {!loading && !error && channels.length === 0 && (
          <Typography
            sx={{
              textAlign: "center",
              ...TV_TYPOGRAPHY.body2,
              color: TV_COLORS.text.tertiary,
              mt: TV_SPACING.xl,
            }}
          >
            No channels found
          </Typography>
        )}

        <List sx={{ p: 0 }}>
          {channels.map((channel, index) => {
            const globalIndex = categories.length + index;
            const isFocused = focusedIndex === globalIndex;
            const isHovered = hoveredIndex === globalIndex;
            const isActive = currentChannel?.channelno === channel.channelno;
            const priceLabel = formatPrice(channel.chprice);

            return (
              <ListItemButton
                key={`${channel.channelno}-${index}`}
                {...getItemProps(globalIndex)}
                className={`focusable-sidebar-item ${isFocused ? 'focused' : ''} ${isHovered ? 'hovered' : ''}`}
                onClick={() => onChannelSelect && onChannelSelect(channel)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (onChannelSelect) onChannelSelect(channel);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: TV_SPACING.md,
                  borderRadius: TV_RADIUS.xl,
                  px: TV_SPACING.md,
                  py: TV_SPACING.md,
                  mb: TV_SPACING.sm,
                  bgcolor: isActive
                    ? "rgba(255, 255, 255, 0.18)"
                    : "transparent",
                  transition: `all ${TV_TIMING.fast}`,
                  border: isFocused 
                    ? "3px solid #667eea" 
                    : "2px solid transparent",
                  transform: isFocused 
                    ? "scale(1.05)" 
                    : isHovered 
                    ? "scale(1.02)" 
                    : "scale(1)",
                  boxShadow: isFocused 
                    ? "0 6px 16px rgba(102, 126, 234, 0.4)" 
                    : "none",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.08)",
                  },
                  "&:focus-visible": {
                    outline: "none",
                  },
                }}
              >
                <Avatar
                  src={channel.chlogo}
                  sx={{
                    width: "4rem",
                    height: "4rem",
                    bgcolor: "#fff",
                    borderRadius: TV_RADIUS.lg,
                    border: "2px solid rgba(255, 255, 255, 0.15)",
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      ...TV_TYPOGRAPHY.body2,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {channel.chtitle}
                  </Typography>
                  {priceLabel && (
                    <Typography
                      sx={{
                        ...TV_TYPOGRAPHY.body2,
                        color: TV_COLORS.text.tertiary,
                        mt: 0.25,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {priceLabel}
                    </Typography>
                  )}
                </Box>
                <Typography
                  sx={{
                    ...TV_TYPOGRAPHY.body2,
                    fontWeight: 700,
                    color: TV_COLORS.text.secondary,
                  }}
                >
                  {channel.channelno}
                </Typography>
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default ChannelsSidebar;

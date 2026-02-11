import { useState, useEffect, useMemo } from "react";
import { Box, Typography, InputBase, List, ListItemButton, Avatar, Tabs, Tab,} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { DEFAULT_USER } from "../Api/config";
import useLiveChannelsStore from "../Global-storage/LiveChannelsStore";
import { TV_TYPOGRAPHY, TV_SPACING, TV_RADIUS, TV_SHADOWS, TV_BLUR, TV_COLORS, TV_FOCUS, TV_TIMING, TV_SIZES } from "../styles/tvConstants";

const ChannelsSidebar = ({ onChannelSelect, currentChannel }) => {
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { categories: cachedCategories, channelsCache, fetchCategories, fetchChannels } = useLiveChannelsStore();
  const [searchQuery, setSearchQuery] = useState("");
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

  // Fast filtering using useMemo
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;

    const query = searchQuery.toLowerCase().trim();
    return channels.filter((channel) => {
      const titleMatch = channel.chtitle?.toLowerCase().includes(query);
      const numberMatch = channel.channelno?.toString().includes(query);
      return titleMatch || numberMatch;
    });
  }, [channels, searchQuery]);


  return (
    <Box
      sx={{
        width: "28rem",
        height: "100vh",
        bgcolor: TV_COLORS.background.overlay,
        backdropFilter: TV_BLUR.xl,
        borderRight: "2px solid rgba(255, 255, 255, 0.15)",
        display: "flex",
        flexDirection: "column",
        color: TV_COLORS.text.primary,
      }}
    >
      {/* -------- HEADER WITH SEARCH -------- */}
      <Box
        sx={{
          px: TV_SPACING.lg,
          py: TV_SPACING.lg,
          borderBottom: "2px solid rgba(255, 255, 255, 0.15)",
        }}
      >
        {/* -------- SEARCH BAR -------- */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: TV_SPACING.sm,
            bgcolor: TV_COLORS.glass.light,
            border: "2px solid rgba(255, 255, 255, 0.2)",
            borderRadius: TV_RADIUS.pill,
            px: TV_SPACING.lg,
            py: TV_SPACING.md,
            height: TV_SIZES.input.height,
          }}
        >
          <SearchIcon sx={{ color: TV_COLORS.text.tertiary, fontSize: TV_SIZES.icon.medium }} />
          <InputBase
            placeholder="Search Channel"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            sx={{
              color: TV_COLORS.text.primary,
              ...TV_TYPOGRAPHY.body2,
              "& input::placeholder": {
                color: TV_COLORS.text.tertiary,
              },
            }}
            inputProps={{ "aria-label": "Search Channel" }}
          />
        </Box>
      </Box>

      {/* -------- CATEGORY TABS -------- */}
      <Box
        sx={{
          px: TV_SPACING.lg,
          py: TV_SPACING.md,
          borderBottom: "2px solid rgba(255, 255, 255, 0.15)",
        }}
      >
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
          {categories.map((cat, idx) => (
            <Tab key={idx} label={cat.title} />
          ))}
        </Tabs>
      </Box>

      {/* -------- CHANNEL LIST -------- */}
      <Box sx={{ flex: 1, overflowY: "auto", px: TV_SPACING.md, py: TV_SPACING.md }}>
        {loading && (
          <Typography
            sx={{
              textAlign: "center",
              ...TV_TYPOGRAPHY.body2,
              color: TV_COLORS.text.tertiary,
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
              color: TV_COLORS.accent.error,
              mt: TV_SPACING.xl,
              px: TV_SPACING.lg,
            }}
          >
            {error}
          </Typography>
        )}

        {!loading && !error && filteredChannels.length === 0 && (
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
          {filteredChannels.map((channel, index) => {
            const isActive = currentChannel?.channelno === channel.channelno;

            return (
              <ListItemButton
                key={`${channel.channelno}-${index}`}
                onClick={() => onChannelSelect && onChannelSelect(channel)}
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
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.08)",
                  },
                  "&:focus-visible": {
                    bgcolor: "rgba(255, 255, 255, 0.12)",
                    border: "3px solid rgba(255, 255, 255, 0.4)",
                    transform: "scale(1.02)",
                    boxShadow: TV_SHADOWS.md,
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

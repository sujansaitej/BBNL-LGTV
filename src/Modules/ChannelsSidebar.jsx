import { useState, useEffect, useMemo } from "react";
import { Box, Typography, InputBase, List, ListItemButton, Avatar, Tabs, Tab,} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useRemoteNavigation } from "../Atomic-Common-Componenets/useRemoteNavigation";
import { fetchChannels, fetchCategories } from "../Api/modules-api/ChannelApi";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../Api/config";

const ChannelsSidebar = ({ onChannelSelect, currentChannel }) => {
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  const headers = {
    ...DEFAULT_HEADERS,
  };

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await fetchCategories(payloadBase, headers);
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
        const channelsData = await fetchChannels(payload, headers, setError);
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

  // Remote navigation for channels
  const { getItemProps: getChannelProps } = useRemoteNavigation(
    filteredChannels.length,
    {
      orientation: "vertical",
      onSelect: (index) => {
        const channel = filteredChannels[index];
        if (channel && onChannelSelect) {
          onChannelSelect(channel);
        }
      },
    }
  );

  return (
    <Box
      sx={{
        width: 380,
        height: "100vh",
        bgcolor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
      }}
    >
      {/* -------- HEADER WITH NOW PLAYING -------- */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >

        {/* -------- SEARCH BAR -------- */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "24px",
            px: 2,
            py: 1.2,
          }}
        >
          <SearchIcon sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 20 }} />
          <InputBase
            placeholder="Search Channel"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            sx={{
              color: "#fff",
              fontSize: 13,
              "& input::placeholder": {
                color: "rgba(255, 255, 255, 0.5)",
              },
            }}
            inputProps={{ "aria-label": "Search Channel" }}
          />
        </Box>
      </Box>

      {/* -------- CATEGORY TABS -------- */}
      <Box
        sx={{
          px: 2,
          pt: 2,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Tabs
          value={selectedCategory}
          onChange={(e, newValue) => setSelectedCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            "& .MuiTab-root": {
              minHeight: 36,
              minWidth: 80,
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.6)",
              textTransform: "none",
              borderRadius: "20px",
              px: 2.5,
              py: 0.8,
              mr: 1,
              "&.Mui-selected": {
                color: "#000",
                bgcolor: "#fff",
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
      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, pt: 1 }}>
        {loading && (
          <Typography
            sx={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: 13,
              mt: 3,
            }}
          >
            Loading channels...
          </Typography>
        )}

        {error && (
          <Typography
            sx={{
              textAlign: "center",
              color: "#ff6b6b",
              fontSize: 12,
              mt: 3,
              px: 2,
            }}
          >
            {error}
          </Typography>
        )}

        {!loading && !error && filteredChannels.length === 0 && (
          <Typography
            sx={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: 13,
              mt: 3,
            }}
          >
            No channels found
          </Typography>
        )}

        <List sx={{ p: 0 }}>
          {filteredChannels.map((channel, index) => {
            const props = getChannelProps(index);
            const isFocused = props["data-focused"];
            const isActive = currentChannel?.channelno === channel.channelno;

            return (
              <ListItemButton
                key={`${channel.channelno}-${index}`}
                {...props}
                onClick={() => onChannelSelect && onChannelSelect(channel)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  borderRadius: "12px",
                  p: 1.5,
                  mb: 0.5,
                  bgcolor: isActive
                    ? "rgba(255, 255, 255, 0.15)"
                    : isFocused
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
                  border: isFocused
                    ? "2px solid rgba(255, 255, 255, 0.3)"
                    : "2px solid transparent",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.08)",
                  },
                }}
              >
                <Avatar
                  src={channel.chlogo}
                  sx={{
                    width: 50,
                    height: 50,
                    bgcolor: "#fff",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 14,
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
                    fontSize: 13,
                    fontWeight: 600,
                    color: "rgba(255, 255, 255, 0.7)",
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

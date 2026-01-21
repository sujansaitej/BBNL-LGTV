import {AppBar,Toolbar,Typography,IconButton,Box,InputBase,} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import WifiIcon from "@mui/icons-material/Wifi";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

import { useRemoteNavigation } from "./useRemoteNavigation";
import { useTheme } from "./TheamChange";

const Header = () => {
  const { isDarkMode, toggleTheme, theme } = useTheme();

  // Remote navigation for header buttons: Search, Dark Mode, Network, Settings
  const { getItemProps } = useRemoteNavigation(4, {
    orientation: "horizontal",
    onSelect: (index) => {
      if (index === 1) toggleTheme(!isDarkMode); // Dark mode toggle
    },
  });

  const iconButtonSx = {
    bgcolor: isDarkMode ? "#0e0e0e" : "#e0e0e0",
    border: isDarkMode ? "1px solid #1c1c1c" : "1px solid #ccc",
    color: isDarkMode ? "#e8e8e8" : "#333",
    width: 42,
    height: 42,
    "&:hover": { bgcolor: isDarkMode ? "#141414" : "#d0d0d0" },
  };

  return (
    <AppBar elevation={0} sx={{ bgcolor: isDarkMode ? "#050505" : "#ffffff", borderBottom: isDarkMode ? "1px solid #111" : "1px solid #e0e0e0" }}>
      <Toolbar sx={{ display: "flex", gap: 3, px: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5} minWidth={160}>
          <Typography variant="h6" fontWeight={700} letterSpacing={0.5} sx={{ color: theme.colors.text }}>
            BBNL
          </Typography>
        </Box>

        <Box flex={1} display="flex" alignItems="center">
          <Box
            {...getItemProps(0)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: isDarkMode ? "#0d0d0d" : "#f5f5f5",
              border: getItemProps(0)["data-focused"] ? "2px solid #667eea" : (isDarkMode ? "1px solid #1e1e1e" : "1px solid #ddd"),
              borderRadius: 3,
              px: 2,
              py: 1,
              width: "100%",
              maxWidth: 620,
              transform: getItemProps(0)["data-focused"] ? "scale(1.02)" : "scale(1)",
            }}
          >
            <SearchIcon sx={{ color: isDarkMode ? "#8a8a8a" : "#666" }} />
            <InputBase placeholder="Search for movies, TV shows..." fullWidth sx={{ color: theme.colors.text, "& input::placeholder": { color: isDarkMode ? "#7a7a7a" : "#999" } }} inputProps={{ "aria-label": "Search" }} />
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1.75}>
          <Box
            {...getItemProps(1)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              border: getItemProps(1)["data-focused"] ? "2px solid #667eea" : "2px solid transparent",
              borderRadius: 1,
              px: 1,
              py: 0.5,
              transform: getItemProps(1)["data-focused"] ? "scale(1.05)" : "scale(1)",
              cursor: "pointer",
            }}
            onClick={() => toggleTheme(!isDarkMode)}
          >
            <IconButton size="small" sx={{ color: isDarkMode ? "#667eea" : "#f39c12", transition: "all 0.3s ease" }}>{isDarkMode ? <DarkModeIcon /> : <LightModeIcon />}</IconButton>
          </Box>

          <IconButton {...getItemProps(2)} sx={{ ...iconButtonSx, border: getItemProps(2)["data-focused"] ? "2px solid #667eea" : iconButtonSx.border, transform: getItemProps(2)["data-focused"] ? "scale(1.1)" : "scale(1)", }} aria-label="Network status">
            <WifiIcon />
          </IconButton>

          <IconButton {...getItemProps(3)} sx={{ ...iconButtonSx, border: getItemProps(3)["data-focused"] ? "2px solid #667eea" : iconButtonSx.border, transform: getItemProps(3)["data-focused"] ? "scale(1.1)" : "scale(1)", }} aria-label="Settings">
            <SettingsIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

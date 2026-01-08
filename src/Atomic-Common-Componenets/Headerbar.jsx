import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  InputBase,
  Avatar,
  Switch,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import WifiIcon from "@mui/icons-material/Wifi";
import { useRemoteNavigation } from "./useRemoteNavigation";

const Header = ({ onMenuClick }) => {
  // Remote navigation for header buttons: Menu, Search, Dark Mode, Network, Settings
  const { getItemProps } = useRemoteNavigation(5, {
    orientation: "horizontal",
    onSelect: (index) => {
      if (index === 0 && onMenuClick) onMenuClick(); // Menu button
      // Other actions can be added as needed
    },
  });
  const iconButtonSx = {
    bgcolor: "#0e0e0e",
    border: "1px solid #1c1c1c",
    color: "#e8e8e8",
    width: 42,
    height: 42,
    "&:hover": { bgcolor: "#141414" },
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: "#050505",
        borderBottom: "1px solid #111",
      }}
    >
      <Toolbar sx={{ display: "flex", gap: 3, px: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5} minWidth={160}>
          <Typography variant="h6" fontWeight={700} letterSpacing={0.5}>
            BBNL
          </Typography>
          <IconButton
            {...getItemProps(0)}
            size="small"
            sx={{
              ...iconButtonSx,
              border: getItemProps(0)["data-focused"] ? "2px solid #667eea" : "1px solid #1c1c1c",
              transform: getItemProps(0)["data-focused"] ? "scale(1.1)" : "scale(1)",
            }}
            aria-label="Open menu"
            onClick={onMenuClick}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <Box flex={1} display="flex" alignItems="center">
          <Box
            {...getItemProps(1)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: "#0d0d0d",
              border: getItemProps(1)["data-focused"] ? "2px solid #667eea" : "1px solid #1e1e1e",
              borderRadius: 3,
              px: 2,
              py: 1,
              width: "100%",
              maxWidth: 620,
              transform: getItemProps(1)["data-focused"] ? "scale(1.02)" : "scale(1)",
            }}
          >
            <SearchIcon sx={{ color: "#8a8a8a" }} />
            <InputBase
              placeholder="Search for movies, TV shows..."
              fullWidth
              sx={{
                color: "#f5f5f5",
                "& input::placeholder": { color: "#7a7a7a" },
              }}
              inputProps={{ "aria-label": "Search" }}
            />
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1.75}>
          <Box 
            {...getItemProps(2)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              border: getItemProps(2)["data-focused"] ? "2px solid #667eea" : "2px solid transparent",
              borderRadius: 1,
              px: 1,
              transform: getItemProps(2)["data-focused"] ? "scale(1.05)" : "scale(1)",
            }}
          >
            <Typography fontSize={15} color="#cfcfcf">
              Dark Mode
            </Typography>
            <Switch color="default" size="medium" aria-label="Toggle dark mode" />
          </Box>
          <IconButton 
            {...getItemProps(3)}
            sx={{
              ...iconButtonSx,
              border: getItemProps(3)["data-focused"] ? "2px solid #667eea" : "1px solid #1c1c1c",
              transform: getItemProps(3)["data-focused"] ? "scale(1.1)" : "scale(1)",
            }}
            aria-label="Network status"
          >
            <WifiIcon />
          </IconButton>
          <IconButton 
            {...getItemProps(4)}
            sx={{
              ...iconButtonSx,
              border: getItemProps(4)["data-focused"] ? "2px solid #667eea" : "1px solid #1c1c1c",
              transform: getItemProps(4)["data-focused"] ? "scale(1.1)" : "scale(1)",
            }}
            aria-label="Settings"
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

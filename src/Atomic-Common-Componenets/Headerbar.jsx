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

const Header = ({ onMenuClick }) => {
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
            size="small"
            sx={iconButtonSx}
            aria-label="Open menu"
            onClick={onMenuClick}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <Box flex={1} display="flex" alignItems="center">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: "#0d0d0d",
              border: "1px solid #1e1e1e",
              borderRadius: 3,
              px: 2,
              py: 1,
              width: "100%",
              maxWidth: 620,
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
          <Typography fontSize={15} color="#cfcfcf">
            Dark Mode
          </Typography>
          <Switch color="default" size="medium" aria-label="Toggle dark mode" />
          <IconButton sx={iconButtonSx} aria-label="Network status">
            <WifiIcon />
          </IconButton>
          <IconButton sx={iconButtonSx} aria-label="Settings">
            <SettingsIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

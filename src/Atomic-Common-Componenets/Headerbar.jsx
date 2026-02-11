import {AppBar, Toolbar, Typography, IconButton, Box, InputBase,} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import { useRemoteNavigation } from "./useRemoteNavigation";
import { useNavigate } from "react-router-dom";
import { TV_TYPOGRAPHY, TV_SPACING, TV_RADIUS, TV_COLORS, TV_FOCUS, TV_TIMING, TV_SIZES, TV_SHADOWS } from "../styles/tvConstants";

const Header = () => {
  const navigate = useNavigate();
  
  // Remote navigation for header buttons: Search, Network, Settings
  const { getItemProps } = useRemoteNavigation(3, {
    orientation: "horizontal",
    onSelect: (index) => {
      if (index === 2) {
        navigate("/settings");
      }
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

  return (
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
            sx={{ 
              ...TV_TYPOGRAPHY.h3,
              color: TV_COLORS.text.primary,
            }}
          >
            BBNL
          </Typography>
        </Box>

        <Box flex={1} display="flex" alignItems="center">
          <Box
            {...getItemProps(0)}
            data-focus-id="header-search"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: TV_SPACING.md,
              bgcolor: TV_COLORS.glass.light,
              border: getItemProps(0)["data-focused"] 
                ? `3px solid ${TV_COLORS.accent.primary}` 
                : `2px solid ${TV_COLORS.glass.medium}`,
              borderRadius: TV_RADIUS.pill,
              px: TV_SPACING.xl,
              py: TV_SPACING.sm,
              height: "3rem",
              width: "100%",
              maxWidth: "42rem",
              transform: getItemProps(0)["data-focused"] ? "scale(1.02)" : "scale(1)",
              transition: `all ${TV_TIMING.fast}`,
              boxShadow: getItemProps(0)["data-focused"] ? TV_SHADOWS.focus : "none",
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
            {...getItemProps(2)}
            data-focus-id="header-settings"
            onClick={() => navigate("/settings")}
            sx={{
              ...iconButtonSx,
              border: getItemProps(2)["data-focused"] 
                ? `3px solid ${TV_COLORS.accent.primary}` 
                : iconButtonSx.border,
              transform: getItemProps(2)["data-focused"] ? "scale(1.1)" : "scale(1)",
              transition: `all ${TV_TIMING.fast}`,
              boxShadow: getItemProps(2)["data-focused"] ? TV_SHADOWS.focus : "none",
            }}
            aria-label="Settings"
          >
            <SettingsIcon sx={{ fontSize: TV_SIZES.icon.medium }} />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;


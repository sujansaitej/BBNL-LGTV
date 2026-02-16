import {AppBar, Toolbar, Typography, IconButton, Box, InputBase,} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import { useEnhancedRemoteNavigation } from "./useMagicRemote";
import { useNavigate } from "react-router-dom";
import { TV_TYPOGRAPHY, TV_SPACING, TV_RADIUS, TV_COLORS, TV_FOCUS, TV_TIMING, TV_SIZES, TV_SHADOWS } from "../styles/tvConstants";

const Header = () => {
  const navigate = useNavigate();
  
  // Magic Remote navigation for header items: Search, Settings
  const headerItems = [
    { id: 'search', type: 'input' },
    { id: 'settings', type: 'button', action: () => navigate("/settings") }
  ];

  const { 
    focusedIndex, 
    hoveredIndex,
    getItemProps, 
    magicRemoteReady 
  } = useEnhancedRemoteNavigation(headerItems, {
    orientation: "horizontal",
    useMagicRemotePointer: true,
    focusThreshold: 120,
    onSelect: (index) => {
      if (index === 1) { // Settings button
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
            className={`focusable-input ${focusedIndex === 0 ? 'focused' : ''} ${hoveredIndex === 0 ? 'hovered' : ''}`}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: TV_SPACING.md,
              bgcolor: TV_COLORS.glass.light,
              border: focusedIndex === 0
                ? `3px solid ${TV_COLORS.accent.primary}` 
                : `2px solid ${TV_COLORS.glass.medium}`,
              borderRadius: TV_RADIUS.pill,
              px: TV_SPACING.xl,
              py: TV_SPACING.sm,
              height: "3rem",
              width: "100%",
              maxWidth: "42rem",
              transform: focusedIndex === 0 ? "scale(1.02)" : "scale(1)",
              transition: `all ${TV_TIMING.fast}`,
              boxShadow: focusedIndex === 0 ? TV_SHADOWS.focus : "none",
              outline: "none",
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
            {...getItemProps(1)}
            data-focus-id="header-settings"
            className={`focusable-icon-button ${focusedIndex === 1 ? 'focused' : ''} ${hoveredIndex === 1 ? 'hovered' : ''}`}
            onClick={() => navigate("/settings")}
            sx={{
              ...iconButtonSx,
              border: focusedIndex === 1
                ? `3px solid ${TV_COLORS.accent.primary}` 
                : iconButtonSx.border,
              transform: focusedIndex === 1 ? "scale(1.15)" : "scale(1)",
              transition: `all ${TV_TIMING.fast}`,
              boxShadow: focusedIndex === 1 ? TV_SHADOWS.focus : "none",
              outline: "none",
            }}
            aria-label="Settings"
          >
            <SettingsIcon sx={{ fontSize: TV_SIZES.icon.medium }} />
          </IconButton>
          
          {/* Magic Remote Status Indicator */}
          {magicRemoteReady && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#43e97b',
                boxShadow: '0 0 10px rgba(67, 233, 123, 0.8)',
                animation: 'pulse-dot 1.5s ease-in-out infinite',
              }}
              title="Magic Remote Connected"
            />
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;


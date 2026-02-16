import { Box, List, ListItemButton, ListItemIcon } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { TV_SPACING, TV_RADIUS, TV_SHADOWS, TV_BLUR, TV_COLORS, TV_TIMING, TV_SIZES } from "../styles/tvConstants";
import { useEnhancedRemoteNavigation } from "../Atomic-Common-Componenets/useMagicRemote";
import "../styles/focus.css";

// Icons
import HomeIcon from "@mui/icons-material/Home";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import MovieIcon from "@mui/icons-material/Movie";
import FeedbackIcon from "@mui/icons-material/Feedback";
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

/* -------------------- MENU DATA -------------------- */

const menuItems = [
  { icon: <HomeIcon />, path: "/home", label: "Home" },
  { icon: <LiveTvIcon />, path: "/live-channels", label: "Live TV" },
  { icon: <MovieIcon />, path: "/movies-ott", label: "Movies" },
  { icon: <FeedbackIcon />, path: "/feedback", label: "Feedback" },
  { icon: <FavoriteBorderIcon />, path: "/favorites", label: "Favorites" },
];

/* -------------------- COMPONENT -------------------- */

const SidebarGlass = () => {
  const navigate = useNavigate();

  // Magic Remote Navigation for sidebar menu items
  const {
    focusedIndex,
    hoveredIndex,
    getItemProps,
    magicRemoteReady,
  } = useEnhancedRemoteNavigation(menuItems, {
    orientation: 'vertical',
    useMagicRemotePointer: true,
    focusThreshold: 150,
    onSelect: (index) => {
      if (menuItems[index]?.path) {
        navigate(menuItems[index].path);
      }
    },
  });


  return (
    <Box
      sx={{
        width: "6rem",
        height: "calc(100vh - 20vh)",
        position: "fixed",
        left: TV_SPACING.lg,
        top: "10vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        bgcolor: TV_COLORS.glass.light,
        backdropFilter: TV_BLUR.lg,
        borderRadius: TV_RADIUS.xxl,
        border: "2px solid rgba(255,255,255,0.2)",
        boxShadow: TV_SHADOWS.xl,
        py: TV_SPACING.lg,
        zIndex: 1000,
      }}
    >
      {/* -------- TOP SPACER -------- */}
      <Box sx={{ flex: 1 }} />

      {/* -------- MAGIC REMOTE STATUS -------- */}
      {magicRemoteReady && (
        <Box sx={{
          mb: TV_SPACING.md,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <Box sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: '#43e97b',
            boxShadow: '0 0 10px rgba(67, 233, 123, 0.8)',
            animation: 'pulse-dot 1.5s ease-in-out infinite',
          }} />
        </Box>
      )}

      {/* -------- MAIN MENU -------- */}
      <List sx={{ width: "100%", p: 0 }}>
        {menuItems.map((item, index) => {
          const isFocused = focusedIndex === index;
          const isHovered = hoveredIndex === index;

          return (
            <ListItemButton
              key={item.path || index}
              {...getItemProps(index)}
              className={`focusable-icon-button ${isFocused ? 'focused' : ''} ${isHovered ? 'hovered' : ''}`}
              onClick={() => item.path && navigate(item.path)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (item.path) navigate(item.path);
                }
              }}
              sx={{
                mb: TV_SPACING.md,
                borderRadius: TV_RADIUS.xl,
                justifyContent: "center",
                minWidth: 0,
                p: TV_SPACING.md,
                bgcolor: isFocused ? "#ffffff" : "transparent",
                border: isFocused 
                  ? "3px solid #667eea" 
                  : "3px solid transparent",
                outline: "none",
                transition: `all ${TV_TIMING.fast} ease`,
                transform: isFocused 
                  ? "scale(1.2)" 
                  : isHovered 
                  ? "scale(1.1)" 
                  : "scale(1)",
                boxShadow: isFocused 
                  ? "0 8px 20px rgba(102, 126, 234, 0.5)" 
                  : "none",
                "&:hover": {
                  bgcolor: isHovered ? "rgba(255,255,255,0.1)" : "transparent",
                },
                "&:focus-visible": {
                  outline: "none",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isFocused ? "#000" : TV_COLORS.text.primary,
                  minWidth: 0,
                  fontSize: TV_SIZES.icon.large,
                  transition: `color ${TV_TIMING.fast} ease`,
                }}
              >
                {item.icon}
              </ListItemIcon>
            </ListItemButton>
          );
        })}
      </List>

      {/* -------- BOTTOM SPACER -------- */}
      <Box sx={{ flex: 1 }} />
    </Box>
  );
};

export default SidebarGlass;

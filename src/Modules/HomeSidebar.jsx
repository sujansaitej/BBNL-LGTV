import { Box, List, ListItemButton, ListItemIcon } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { TV_SPACING, TV_RADIUS, TV_SHADOWS, TV_BLUR, TV_COLORS, TV_FOCUS, TV_TIMING, TV_SIZES } from "../styles/tvConstants";

// Icons
import HomeIcon from "@mui/icons-material/Home";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import MovieIcon from "@mui/icons-material/Movie";
import FeedbackIcon from "@mui/icons-material/Feedback";
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

/* -------------------- MENU DATA -------------------- */

const menuItems = [
  { icon: <HomeIcon />, path: "/home" },
  { icon: <LiveTvIcon />, path: "/live-channels" },
  { icon: <MovieIcon />, path: "/movies-ott" },
  { icon: <FeedbackIcon />, path: "/feedback" },
  { icon: <FavoriteBorderIcon />, path: "/favorites" },
];

/* -------------------- COMPONENT -------------------- */

const SidebarGlass = () => {
  const navigate = useNavigate();


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

      {/* -------- MAIN MENU -------- */}
      <List sx={{ width: "100%", p: 0 }}>
        {menuItems.map((item, index) => (
          <ListItemButton
            key={item.path || index}
            onClick={() => item.path && navigate(item.path)}
            sx={{
              mb: TV_SPACING.md,
              borderRadius: TV_RADIUS.xl,
              justifyContent: "center",
              minWidth: 0,
              p: TV_SPACING.md,
              bgcolor: "transparent",
              border: "3px solid transparent",
              outline: "none",
              transition: `all ${TV_TIMING.fast} ease`,
              boxShadow: "none",
              "&:hover": {
                bgcolor: "transparent",
              },
              "&:focus-visible": {
                bgcolor: "#ffffff",
                border: "3px solid #ffffff",
                transform: "scale(1.1)",
                boxShadow: TV_SHADOWS.md,
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: TV_COLORS.text.primary,
                minWidth: 0,
                fontSize: TV_SIZES.icon.large,
                transition: `color ${TV_TIMING.fast} ease`,
                ".MuiListItemButton-root:focus-visible &": {
                  color: "#000",
                },
              }}
            >
              {item.icon}
            </ListItemIcon>
          </ListItemButton>
        ))}
      </List>

      {/* -------- BOTTOM SPACER -------- */}
      <Box sx={{ flex: 1 }} />
    </Box>
  );
};

export default SidebarGlass;

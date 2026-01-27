import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  Divider,
} from "@mui/material";
import { useRemoteNavigation } from "../Atomic-Common-Componenets/useRemoteNavigation";

// Icons
import HomeIcon from "@mui/icons-material/Home";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import MovieIcon from "@mui/icons-material/Movie";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SmsFailedIcon from "@mui/icons-material/SmsFailed";
import FeedbackIcon from "@mui/icons-material/Feedback";

/* -------------------- MENU DATA -------------------- */

const menuItems = [
  { icon: <HomeIcon />, path: "/home" },
  { icon: <LiveTvIcon />, path: "/live-channels" },
  { icon: <MovieIcon />, path: "/movies" },
  { icon: <SubscriptionsIcon />, path: "/subscription" },
  { icon: <NotificationsIcon />, path: "/notification" },
];

const helpDesk = [
  { icon: <SmsFailedIcon />, id: "complaint" },
  { icon: <FeedbackIcon />, id: "feedback" },
];

/* -------------------- COMPONENT -------------------- */

const SidebarGlass = () => {
  const navigate = useNavigate();

  // Remote navigation for menu items
  const { getItemProps: getMenuProps } = useRemoteNavigation(
    menuItems.length,
    {
      orientation: "vertical",
      onSelect: (index) => {
        const item = menuItems[index];
        if (item?.path) navigate(item.path);
      },
    }
  );

  // Remote navigation for help desk items
  const { getItemProps: getHelpProps } = useRemoteNavigation(
    helpDesk.length,
    {
      orientation: "vertical",
    }
  );

  return (
    <Box
      sx={{
        width: 90,
        height: "100vh", // ✅ Full height
        position: "fixed",
        left: 16,
        top: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        bgcolor: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(18px)",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.5)",
        boxShadow: "0px 20px 40px rgba(0,0,0,0.45)",
        py: 3,
        zIndex: 1000,
      }}
    >
      {/* -------- TOP SPACER -------- */}
      <Box sx={{ flex: 1 }} />

      {/* -------- MAIN MENU -------- */}
      <List sx={{ width: "100%", p: 0 }}>
        {menuItems.map((item, index) => {
          const props = getMenuProps(index);

          return (
            <ListItemButton
              key={item.path}
              {...props}
              onClick={() => item.path && navigate(item.path)}
              sx={{
                mb: 1.2,
                borderRadius: "14px",
                justifyContent: "center",
                minWidth: 0,
                p: 1.6,
                border: props["data-focused"]
                  ? "2px solid #667eea"
                  : "1px solid transparent",
                transform: props["data-focused"]
                  ? "scale(1.08)"
                  : "scale(1)",
                transition: "all 0.25s ease",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.22)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "#fff", minWidth: 0, fontSize: 28 }}>
                {item.icon}
              </ListItemIcon>
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ my: 2, width: "70%", borderColor: "rgba(255,255,255,.4)" }} />

      {/* -------- HELP DESK -------- */}
      <List sx={{ width: "100%", p: 0 }}>
        {helpDesk.map((item, index) => {
          const props = getHelpProps(index);

          return (
            <ListItemButton
              key={item.id}
              {...props}
              sx={{
                mb: 1.2,
                borderRadius: "14px",
                justifyContent: "center",
                minWidth: 0,
                p: 1.6,
                border: props["data-focused"]
                  ? "2px solid #667eea"
                  : "1px solid transparent",
                transform: props["data-focused"]
                  ? "scale(1.08)"
                  : "scale(1)",
                transition: "all 0.25s ease",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.2)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "#fff", minWidth: 0, fontSize: 28 }}>
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

import { useNavigate } from "react-router-dom";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from "@mui/material";
import { useRemoteNavigation } from "../Atomic-Common-Componenets/useRemoteNavigation";

import HomeIcon from "@mui/icons-material/Home";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import MovieIcon from "@mui/icons-material/Movie";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import NotificationsIcon from "@mui/icons-material/Notifications";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SmsFailedIcon from "@mui/icons-material/SmsFailed";
import FeedbackIcon from "@mui/icons-material/Feedback";

const menuItems = [
  { text: "Home", icon: <HomeIcon />, path: "/home" },
  { text: "Live Channels", icon: <LiveTvIcon />, path: "/live-channels" },
  { text: "Movies", icon: <MovieIcon />, path: "/home" },
  { text: "Subscription", icon: <SubscriptionsIcon />, path: "/home" },
  { text: "Notification", icon: <NotificationsIcon />, path: "/home" },
];

const helpDesk = [
  { text: "Get Complaint", icon: <SmsFailedIcon /> },
  { text: "Get Feedback", icon: <FeedbackIcon /> },
];

const SidebarGlass = () => {
  const navigate = useNavigate();
  
  // Remote navigation for menu items
  const { getItemProps: getMenuProps } = useRemoteNavigation(
    menuItems.length,
    {
      orientation: "vertical",
      onSelect: (index) => {
        const item = menuItems[index];
        if (item.path) navigate(item.path);
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
        width: 260,
        height: "auto",
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        bgcolor: "rgba(255,255,255,0.06)",        // glass background
        backdropFilter: "blur(18px)",             // blur
        borderRadius: "18px",
        border: "1px solid rgba(255,255,255,0.6)",// white border
        boxShadow: "0px 20px 40px rgba(0,0,0,.4)",
      }}
    >
      <Typography
        sx={{
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          opacity: 0.8,
          pl: 1,
        }}
      >
        Menu
      </Typography>

      <List sx={{ color: "#fff" }}>
        {menuItems.map((item, index) => {
          const menuItemProps = getMenuProps(index);
          return (
            <ListItemButton
              key={item.text}
              {...menuItemProps}
              onClick={() => item.path && navigate(item.path)}
              sx={{
                mb: 1,
                borderRadius: "14px",
                bgcolor: "transparent",
                border: menuItemProps["data-focused"] ? "2px solid #667eea" : "1px solid transparent",
                transform: menuItemProps["data-focused"] ? "scale(1.05)" : "scale(1)",
                transition: "all 0.3s",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.22)",
                  border: "1px solid rgba(255,255,255,0.8)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "#fff", minWidth: 38 }}>
                {item.icon}
              </ListItemIcon>

              <ListItemText
                primary={item.text}
                primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: "rgba(255,255,255,.4)" }} />

      <Typography
        sx={{
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          opacity: 0.9,
          pl: 1,
        }}
      >
        Help Desk
      </Typography>

      <List sx={{ color: "#fff" }}>
        {helpDesk.map((item, index) => {
          const helpItemProps = getHelpProps(index);
          return (
            <ListItemButton
              key={item.text}
              {...helpItemProps}
              sx={{
                mb: 1,
                borderRadius: "14px",
                border: helpItemProps["data-focused"] ? "2px solid #667eea" : "1px solid transparent",
                transform: helpItemProps["data-focused"] ? "scale(1.05)" : "scale(1)",
                transition: "all 0.3s",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.7)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "#fff", minWidth: 38 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
};

export default SidebarGlass;

import { Box, List, ListItemButton, ListItemIcon } from "@mui/material";
import { useRemoteNavigation } from "../Atomic-Common-Componenets/useRemoteNavigation";
import { useNavigate } from "react-router-dom";


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
  { icon: <SmsFailedIcon />, path: "/complaint" },
  { icon: <FeedbackIcon />, path: "/feedback" },
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

  return (
    <Box
      sx={{
        width: 90,
        height: "49vh",
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
        pt: 3,
        pb: 3,
        zIndex: 1000,
        mt: "10vh",
        mr: "3vh",
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
              key={item.path || index}
              {...props}
              onClick={() => item.path && navigate(item.path)}
              sx={{
                mb: 1.2,
                borderRadius: "14px",
                justifyContent: "center",
                minWidth: 0,
                p: 1.6,
                bgcolor: props["data-focused"] ? "#ffffff" : "transparent",
                border: props["data-focused"] ? "2px solid #ffffff" : "1px solid transparent",
                outline: "none",
                transition: "all 0.25s ease",
                "&:hover": {
                  bgcolor: props["data-focused"] ? "#ffffff" : "#ffffff",
                },
                "&:focus": {
                  outline: "none",
                  border: props["data-focused"] ? "2px solid #ffffff" : "1px solid transparent",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: props["data-focused"] ? "#000" : "#fff",
                  minWidth: 0,
                  fontSize: 28,
                  transition: "color 0.25s ease"
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

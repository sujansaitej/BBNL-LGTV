import {AppBar, Toolbar, Typography, IconButton, Box, InputBase,} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import { useRemoteNavigation } from "./useRemoteNavigation";
import { useNavigate } from "react-router-dom";

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
          <Typography variant="h6" fontWeight={700} letterSpacing={0.5} sx={{ color: "#fff" }}>
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
              bgcolor: "#0d0d0d",
              border: getItemProps(0)["data-focused"] ? "2px solid #667eea" : "1px solid #1e1e1e",
              borderRadius: 3,
              px: 2,
              py: 1,
              width: "100%",
              maxWidth: 620,
              transform: getItemProps(0)["data-focused"] ? "scale(1.02)" : "scale(1)",
            }}
          >
            <SearchIcon sx={{ color: "#8a8a8a" }} />
            <InputBase
              placeholder="Search for movies, TV shows..."
              fullWidth
              sx={{
                color: "#fff",
                "& input::placeholder": { color: "#7a7a7a" },
              }}
              inputProps={{ "aria-label": "Search" }}
            />
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1.75}>
          <IconButton 
            {...getItemProps(2)}
            onClick={() => navigate("/settings")}
            sx={{
              ...iconButtonSx,
              border: getItemProps(2)["data-focused"] ? "2px solid #667eea" : iconButtonSx.border,
              transform: getItemProps(2)["data-focused"] ? "scale(1.1)" : "scale(1)",
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


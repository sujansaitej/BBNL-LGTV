import { useState, useEffect } from "react";
import {Box,List,ListItemButton,ListItemIcon,ListItemText,Typography,Button,CircularProgress,} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InfoIcon from "@mui/icons-material/Info";
import { useDeviceInformation } from "../Api/Deviceinformaction/LG-Devicesinformaction";
import { DEFAULT_USER } from "../Api/config";
import useAppVersionStore from "../Global-storage/LogineOttp";
import { useEnhancedRemoteNavigation } from "../Atomic-Common-Componenets/useMagicRemote";
import "../styles/focus.css";

const Setting = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState("about");

  const [appVersionData, setAppVersionData] = useState(null);
  const { versionCache, fetchAppVersion } = useAppVersionStore();
  
  // Get device information
  const deviceInfo = useDeviceInformation();

  const menuItems = [
    { id: "about", label: "About App", icon: <InfoIcon /> },
    { id: "device", label: "Device Info", icon: <InfoIcon /> },
  ];


  // Fetch app version on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadAppVersion = async () => {
      try {
        const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
        const mobile = localStorage.getItem("userPhone") || DEFAULT_USER.mobile;
        
        const payload = {
          userid,
          mobile,
          ip_address: "192.168.101.110",
          device_type: "",
          mac_address: "",
          device_name: "",
          app_package: "com.fofi.fofiboxtv",
        };
        
        const key = `${userid}|${mobile}|${payload.app_package}`;
        const cached = versionCache[key]?.data;
        if (cached) {
          setAppVersionData(cached);
        }
        const versionData = await fetchAppVersion(payload);
        if (versionData) {
          setAppVersionData(versionData);
        }
      } catch (error) {
        console.error("Failed to fetch app version:", error);
      }
    };

    loadAppVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goBack = () => {
    navigate("/home");
  };

  // Magic Remote Navigation for menu items
  const {
    focusedIndex,
    hoveredIndex,
    getItemProps,
  } = useEnhancedRemoteNavigation(menuItems, {
    orientation: 'vertical',
    useMagicRemotePointer: true,
    focusThreshold: 150,
    onSelect: (index) => {
      setCurrentPage(menuItems[index].id);
    },
  });

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        width: "100%",
        bgcolor: "#000",
        color: "#fff",
        p: 5,
        gap: 4,
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        letterSpacing: "0.3px",
      }}
    >
      {/* -------- BACK BUTTON -------- */}
      <Box
        onClick={goBack}
        sx={{
          position: "absolute",
          top: 24,
          left: 36,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          cursor: "pointer",
          color: "#fff",
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: "0.3px",
          "&:hover": {
            opacity: 0.8,
          },
        }}
      >
        <ArrowBackIcon sx={{ fontSize: 26 }} />
        Back
      </Box>

      {/* -------- LEFT SIDEBAR MENU -------- */}
      <Box
        sx={{
          width: "320px",
          display: "flex",
          flexDirection: "column",
          border: "2px solid rgba(255, 255, 255, 0.25)",
          borderRadius: "18px",
          p: 3,
          mt: 10,
        }}
      >

        <List sx={{ width: "100%", p: 0 }}>
          {menuItems.map((item, index) => {
            const isActive = currentPage === item.id;
            const isFocused = focusedIndex === index;
            const isHovered = hoveredIndex === index;

            return (
              <ListItemButton
                key={item.id}
                {...getItemProps(index)}
                className={`focusable-settings-item ${isFocused ? 'focused' : ''} ${isHovered ? 'hovered' : ''}`}
                onClick={() => setCurrentPage(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setCurrentPage(item.id);
                  }
                }}
                sx={{
                  mb: 2,
                  borderRadius: "14px",
                  bgcolor: isActive ? "rgba(255, 255, 255, 0.12)" : "transparent",
                  border: isFocused
                    ? "3px solid #667eea"
                    : isActive
                    ? "2px solid rgba(255, 255, 255, 0.35)"
                    : "2px solid transparent",
                  transition: "all 0.25s ease",
                  p: 2.5,
                  transform: isFocused 
                    ? "scale(1.08)" 
                    : isHovered 
                    ? "scale(1.03)" 
                    : "scale(1)",
                  boxShadow: isFocused 
                    ? "0 8px 20px rgba(102, 126, 234, 0.4)" 
                    : "none",
                  "&:hover": {
                    bgcolor: isActive
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.05)",
                  },
                  "&:focus-visible": {
                    outline: "none",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "#fff", minWidth: 52 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    "& .MuiTypography-root": {
                      fontSize: 20,
                      fontWeight: 600,
                      letterSpacing: "0.3px",
                    },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      {/* -------- MAIN CONTENT -------- */}
      <Box
        sx={{
          flex: 1,
          border: "2px solid rgba(255, 255, 255, 0.25)",
          borderRadius: "18px",
          p: 6,
          mt: 10,
          overflowY: "auto",
        }}
      >
        {/* ====== ABOUT APP ====== */}
        {currentPage === "about" && (
          <Box>
            <Typography sx={{ fontSize: 36, fontWeight: 700, mb: 1.5, lineHeight: 1.1, letterSpacing: "0.4px" }}>
              About App
            </Typography>
            <Typography
              sx={{
                fontSize: 20,
                color: "rgba(255, 255, 255, 0.65)",
                mb: 5,
                letterSpacing: "0.2px",
              }}
            >
              Learn information about our app
            </Typography>

            {/* Software Version */}
            <Box
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.06)",
                border: "2px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "14px",
                p: 4,
                mb: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: 18,
                  color: "rgba(255, 255, 255, 0.65)",
                  mb: 1,
                  letterSpacing: "0.2px",
                }}
              >
                Software Version
              </Typography>
              {versionCache?.[`${localStorage.getItem("userId") || DEFAULT_USER.userid}|${localStorage.getItem("userPhone") || DEFAULT_USER.mobile}|com.fofi.fofiboxtv`]?.isLoading ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.3px" }}>
                  {appVersionData?.appversion || "v2.1.0 - Release"}
                </Typography>
              )}
            </Box>

            {/* Version Message */}
            {appVersionData?.verchngmsg && (
              <Box
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.06)",
                  border: "2px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "14px",
                  p: 4,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 18,
                    color: "rgba(255, 255, 255, 0.65)",
                    mb: 1,
                    letterSpacing: "0.2px",
                  }}
                >
                  Version Message
                </Typography>
                <Typography
                  sx={{
                    fontSize: 20,
                    fontWeight: 500,
                    color: "#4fc3f7",
                    fontStyle: "italic",
                    letterSpacing: "0.2px",
                  }}
                >
                  {appVersionData.verchngmsg}
                </Typography>
              </Box>
            )}

            {/* Software Updates */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                bgcolor: "rgba(255, 255, 255, 0.06)",
                border: "2px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "14px",
                p: 4,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.3px" }}>
                  Software Updates
                </Typography>
                <Typography
                  sx={{
                    fontSize: 18,
                    color: "rgba(255, 255, 255, 0.65)",
                    mt: 0.75,
                    letterSpacing: "0.2px",
                  }}
                >
                  Your App software is up to date
                </Typography>
              </Box>
              <Button
                variant="outlined"
                sx={{
                  borderColor: "rgba(255, 255, 255, 0.4)",
                  borderWidth: "2px",
                  color: "#fff",
                  textTransform: "none",
                  fontSize: 18,
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  ml: 3,
                  letterSpacing: "0.3px",
                  "&:hover": {
                    borderWidth: "2px",
                    borderColor: "rgba(255, 255, 255, 0.6)",
                  },
                }}
              >
                Check
              </Button>
            </Box>
          </Box>
        )}

        {/* ====== DEVICE INFO ====== */}
        {currentPage === "device" && (
          <Box>
            <Typography sx={{ fontSize: 36, fontWeight: 700, mb: 1.5, lineHeight: 1.1, letterSpacing: "0.4px" }}>
              Device Info
            </Typography>
            <Typography
              sx={{
                fontSize: 20,
                color: "rgba(255, 255, 255, 0.65)",
                mb: 5,
                letterSpacing: "0.2px",
              }}
            >
              View your device network and identification information
            </Typography>

            <Box
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.06)",
                border: "2px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "14px",
                px: 4,
                py: 3.5,
                mb: 3,
              }}
            >
              <Typography sx={{ fontSize: 40, fontWeight: 700, mb: 2, letterSpacing: "0.2px" }}>
                TV Information
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: "260px 1fr", rowGap: 2.2, columnGap: 2 }}>
                <Typography sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.55)", fontWeight: 600 }}>
                  TV Model Name
                </Typography>
                <Typography sx={{ fontSize: 32, fontWeight: 700 }}>
                  {deviceInfo.loading ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : (deviceInfo.modelName || "Not available")}
                </Typography>

                <Typography sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.55)", fontWeight: 600 }}>
                  Device ID
                </Typography>
                <Typography sx={{ fontSize: 32, fontWeight: 700 }}>
                  {deviceInfo.loading ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : (deviceInfo.deviceId || "Not available")}
                </Typography>

                <Typography sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.55)", fontWeight: 600 }}>
                  Connection Type
                </Typography>
                <Typography sx={{ fontSize: 32, fontWeight: 700 }}>
                  {deviceInfo.loading ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : (deviceInfo.connectionType || "Unknown")}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.06)",
                border: "2px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "14px",
                px: 4,
                py: 3.5,
              }}
            >
              <Typography sx={{ fontSize: 40, fontWeight: 700, mb: 2, letterSpacing: "0.2px" }}>
                Network Information
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: "260px 1fr", rowGap: 2.2, columnGap: 2 }}>
                <Typography sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.55)", fontWeight: 600 }}>
                  IP v4 Address
                </Typography>
                <Typography sx={{ fontSize: 32, fontWeight: 700 }}>
                  {deviceInfo.loading ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : (deviceInfo.publicIPv4 || "Not available")}
                </Typography>

                <Typography sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.55)", fontWeight: 600 }}>
                  IP v6 Address
                </Typography>
                <Typography sx={{ fontSize: 32, fontWeight: 700 }}>
                  {deviceInfo.loading ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : (deviceInfo.publicIPv6 || "Not available")}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Setting;

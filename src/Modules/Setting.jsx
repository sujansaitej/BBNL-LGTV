import { useState, useEffect } from "react";
import {Box,List,ListItemButton,ListItemIcon,ListItemText,Typography,Button,Card,CircularProgress,} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InfoIcon from "@mui/icons-material/Info";
import { useRemoteNavigation } from "../Atomic-Common-Componenets/useRemoteNavigation";
import { fetchAppVersion } from "../Api/modules-api/AppdetailsApi";
import { useDeviceInformation } from "../Api/Deviceinformaction/LG-Devicesinformaction";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../Api/config";

const Setting = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState("about");

  const [appVersionData, setAppVersionData] = useState(null);
  const [loadingAppVersion, setLoadingAppVersion] = useState(false);
  
  // Get device information
  const deviceInfo = useDeviceInformation();

  const menuItems = [
    { id: "about", label: "About App", icon: <InfoIcon /> },
    { id: "device", label: "Device Info", icon: <InfoIcon /> },
  ];

  const { getItemProps: getMenuProps } = useRemoteNavigation(
    menuItems.length,
    {
      orientation: "vertical",
      onSelect: (index) => {
        setCurrentPage(menuItems[index].id);
      },
    }
  );

  // Fetch app version on component mount
  useEffect(() => {
    const loadAppVersion = async () => {
      try {
        setLoadingAppVersion(true);
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
        
        const versionData = await fetchAppVersion(payload, DEFAULT_HEADERS);
        setAppVersionData(versionData);
      } catch (error) {
        console.error("Failed to fetch app version:", error);
      } finally {
        setLoadingAppVersion(false);
      }
    };

    loadAppVersion();
  }, []);

  const goBack = () => {
    navigate("/home");
  };

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
            const props = getMenuProps(index);
            const isActive = currentPage === item.id;

            return (
              <ListItemButton
                key={item.id}
                {...props}
                onClick={() => setCurrentPage(item.id)}
                sx={{
                  mb: 2,
                  borderRadius: "14px",
                  bgcolor: isActive ? "rgba(255, 255, 255, 0.12)" : "transparent",
                  border: isActive
                    ? "2px solid rgba(255, 255, 255, 0.35)"
                    : "2px solid transparent",
                  transition: "all 0.25s ease",
                  p: 2.5,
                  "&:hover": {
                    bgcolor: isActive
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.05)",
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
              {loadingAppVersion ? (
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

            {/* Public IPv4 Address */}
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
                Public IPv4 Address
              </Typography>
              {deviceInfo.loading ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.3px" }}>
                  {deviceInfo.publicIPv4 || "Not available"}
                </Typography>
              )}
            </Box>

            {/* Public IPv6 Address */}
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
                Public IPv6 Address
              </Typography>
              {deviceInfo.loading ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.3px" }}>
                  {deviceInfo.publicIPv6 || "Not available"}
                </Typography>
              )}
            </Box>

            {/* Device ID */}
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
                Device ID
              </Typography>
              {deviceInfo.loading ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.3px" }}>
                  {deviceInfo.deviceId || "Not available"}
                </Typography>
              )}
            </Box>

            {/* Connection Type */}
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
                Connection Type
              </Typography>
              {deviceInfo.loading ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.3px" }}>
                  {deviceInfo.connectionType || "Unknown"}
                </Typography>
              )}
            </Box>

            {/* Wired MAC Address */}
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
                Wired MAC Address
              </Typography>
              {deviceInfo.loading ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.3px" }}>
                  {deviceInfo.wiredMac || "Not available"}
                </Typography>
              )}
            </Box>

            {/* WiFi MAC Address */}
            <Box
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.06)",
                border: "2px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "14px",
                p: 4,
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
                WiFi MAC Address
              </Typography>
              {deviceInfo.loading ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.3px" }}>
                  {deviceInfo.wifiMac || "Not available"}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Setting;

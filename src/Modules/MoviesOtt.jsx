import { useEffect, useState } from "react";
import { Box, Typography, Card, CardActionArea, CardContent, Avatar, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { fetchOttApps } from "../Api/modules-api/OttAppsApi";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../Api/config";
import { useGridNavigation } from "../Atomic-Common-Componenets/useRemoteNavigation";

const cardStyle = {
  background: "#111",
  borderRadius: "14px",
  width: "240px",
  height: "150px",
  color: "#fff",
  border: "2px solid rgba(255,255,255,.2)",
  transition: "all .2s",
  cursor: "pointer",

  "&:hover": {
    border: "2px solid white",
    transform: "translateY(-3px)",
  },
};

const avatarStyle = {
  width: 100,
  height: 100,
  marginBottom: 1,
  borderRadius: 3,
};

const columnsCount = 5;

export const MoviesOtt = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get device info from config
  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || DEFAULT_USER.mobile;

  const payloadBase = {
    userid,
    mobile,
    ip_address: "192.168.101.110",
    mac: "26:F2:AE:D8:3F:99",
  };

  const headers = {
    ...DEFAULT_HEADERS,
  };

  // Use grid navigation
  const { getItemProps } = useGridNavigation(
    apps.length,
    columnsCount,
    {
      onSelect: (index) => {
        console.log("Selected app:", apps[index]);
      },
    }
  );

  // ================= FETCH OTT APPS =================
  const handleFetchOttApps = async () => {
    try {
      setLoading(true);
      const appsData = await fetchOttApps(payloadBase, headers);
      setApps(appsData || []);
    } catch (err) {
      setError("Failed to load OTT apps");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchOttApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ background: "#000", minHeight: "100vh", color: "#fff", p: 3 }}>
      {/* ================= HEADER WITH BACK BUTTON AND TITLE ================= */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 4 }}>
        {/* Back Button */}
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "8px",
            "&:hover": {
              background: "rgba(255,255,255,0.1)",
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        {/* Title */}
        <Typography sx={{ fontSize: 28, fontWeight: 700 }}>
          All OTT Apps
        </Typography>
      </Box>

      {/* ================= ERROR BOX ================= */}
      {error && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            border: "1px solid red",
            background: "rgba(255,0,0,0.15)",
            color: "#ff9a9a",
          }}
        >
          {error}
        </Box>
      )}

      {/* ================= LOADING STATE ================= */}
      {loading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <Typography sx={{ fontSize: 18, color: "#999" }}>
            Loading OTT apps...
          </Typography>
        </Box>
      )}

      {/* ================= OTT APPS GRID ================= */}
      {!loading && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 240px)",
            gap: "26px",
            pb: 4,
          }}
        >
          {apps.length === 0 ? (
            <Typography sx={{ color: "#888" }}>No OTT apps available</Typography>
          ) : (
            apps.map((app, idx) => {
              const appProps = getItemProps(idx);
              const isFocused = appProps["data-focused"];
              return (
                <Card
                  key={idx}
                  {...appProps}
                  sx={{
                    ...cardStyle,
                    border: isFocused ? "3px solid #667eea" : "2px solid rgba(255,255,255,.2)",
                    transform: isFocused ? "scale(1.08)" : "scale(1)",
                    boxShadow: isFocused ? "0 8px 24px rgba(102, 126, 234, 0.4)" : "none",
                    zIndex: isFocused ? 10 : 1,
                  }}
                >
                  <CardActionArea
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Avatar src={app.icon} sx={avatarStyle} variant="rounded" />
                    <CardContent sx={{ textAlign: "center", p: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                        {app.appname}
                      </Typography>
                      <Typography sx={{ color: "#888", fontSize: 11 }}>
                        Streaming Service
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })
          )}
        </Box>
      )}
    </Box>
  );
};

export default MoviesOtt;

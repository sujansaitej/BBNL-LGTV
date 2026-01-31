import { useEffect, useState } from "react";
import { Box, Typography, Card, CardActionArea, CardContent, Avatar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useRemoteNavigation } from "../../Atomic-Common-Componenets/useRemoteNavigation";
import { fetchOttApps } from "../../Api/modules-api/OttAppsApi";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../../Api/config";

const OTT_CARD_LIMIT = 4;

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
  width: 90,
  height: 90,
  marginBottom: 1,
  borderRadius: 3,
};

const OttViews = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(0);

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
  const { getItemProps } = useRemoteNavigation({ itemCount: OTT_CARD_LIMIT });

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

  const visibleApps = (apps || []).slice(0, OTT_CARD_LIMIT);

  return (
    <Box sx={{ mb: 6 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, mb: 3 }}>
        OTT Apps
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 240px)",
          gap: "103px",
        }}
      >
        {visibleApps.map((app, idx) => {
          const cardProps = getItemProps(idx);
          const isFocused = cardProps["data-focused"];
          return (
            <Card
              key={idx}
              {...cardProps}
              onClick={() => setSelected(idx)}
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
                gap: 2,
                p: 2,
              }}
            >
              <Avatar src={app.icon} sx={avatarStyle} variant="rounded" />
              <CardContent sx={{ textAlign: "center", p: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{app.appname}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
          );
        })}

        <Card sx={cardStyle} onClick={() => navigate("/movies-ott")}>
          <CardActionArea
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Avatar sx={{ ...avatarStyle, bgcolor: "#2a2a2a" }} variant="rounded">
              →
            </Avatar>
            <CardContent sx={{ textAlign: "center", p: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>View All OTT</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Box>
  );
};
export default OttViews;


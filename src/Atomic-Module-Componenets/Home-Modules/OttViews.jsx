import { useEffect, useState } from "react";
import { Box, Typography, Card } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useRemoteNavigation } from "../../Atomic-Common-Componenets/useRemoteNavigation";
import { fetchOttApps } from "../../Api/modules-api/OttAppsApi";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../../Api/config";

const OTT_CARD_LIMIT = 4;

const cardStyle = {
  width: "240px",
  height: "180px",
  backgroundColor: "transparent",
  boxShadow: "none",
};

const avatarStyle = {
  width: "240px",
  height: "120px",
  objectFit: "cover",
  borderRadius: "12px",
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
          gap: "125px",
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
                border: isFocused ? "3px solid #667eea" : "none",
                transform: isFocused ? "scale(1.08)" : "scale(1)",
                boxShadow: isFocused ? "0 8px 24px rgba(102, 126, 234, 0.4)" : "none",
                zIndex: isFocused ? 10 : 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                p: 2,
              }}
            >
              <Box
                sx={{
                  width: "240px",
                  height: "180px",
                  overflow: "hidden",
                  borderRadius: "12px",
                }}
              >
                <img
                  src={app.icon}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  alt={app.appname}
                />
              </Box>
            </Card>
          );
        })}

        <Card
          sx={{
            ...cardStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 0,
          }}
          onClick={() => navigate("/movies-ott")}
        >
          <Box
            sx={{
              width: "240px",
              height: "180px",
              background: "#2a2a2a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 48,
              borderRadius: "12px",
            }}
          >
            →
          </Box>
          
        </Card>
      </Box>
    </Box>
  );
};
export default OttViews;


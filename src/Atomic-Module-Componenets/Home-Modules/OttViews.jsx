import { useEffect, useState } from "react";
import { Box, Typography, Card, CardActionArea, CardContent, Avatar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { fetchDeviceInfo } from "../../Api/utils/deviceInfo";
import { API_ENDPOINTS, DEFAULT_HEADERS, DEFAULT_USER } from "../../Api/config";
import { useRemoteNavigation } from "../../Atomic-Common-Componenets/useRemoteNavigation";

const getUserInfo = () => ({
  userid: localStorage.getItem("userId") || "testiser1",
  mobile: localStorage.getItem("userPhone") || "7800000001",
  ip_address: "192.168.101.110",
  mac_address: "68:1D:EF:14:6C:21",
});

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
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(-1);
  const navigate = useNavigate();

  const visibleApps = apps.slice(0, OTT_CARD_LIMIT);

  // Remote navigation for OTT app cards
  const { getItemProps } = useRemoteNavigation(
    visibleApps.length,
    {
      orientation: "horizontal",
      onSelect: (index) => {
        setSelected(index);
        setTimeout(() => {
          // Navigate to app or handle app launch
          console.log("Selected app:", visibleApps[index]);
        }, 80);
      },
    }
  );

  useEffect(() => {
    const fetchApps = async () => {
      try {
        // Fetch device info
        const deviceInfo = await fetchDeviceInfo();
        
        const payload = {
          userid: localStorage.getItem("userId") || DEFAULT_USER.userid,
          mobile: localStorage.getItem("userPhone") || "7800000001",
        };
        
        // Include device info in payload if available
        if (deviceInfo?.ipAddress) payload.ip_address = deviceInfo.ipAddress;
        if (deviceInfo?.macAddress) payload.mac_address = deviceInfo.macAddress;
        
        // Build device headers
        const headers = {
          ...DEFAULT_HEADERS,
        };
        if (deviceInfo?.ipAddress) headers.devip = deviceInfo.ipAddress;
        if (deviceInfo?.macAddress) headers.devmac = deviceInfo.macAddress;
        if (deviceInfo?.serialNumber) headers.devslno = deviceInfo.serialNumber;
        if (deviceInfo?.deviceId) headers.devid = deviceInfo.deviceId;
        if (deviceInfo?.modelName) headers.devmodel = deviceInfo.modelName;
        
        const res = await axios.post(
          API_ENDPOINTS.ALLOWED_APPS,
          payload,
          { headers }
        );

        if (res?.data?.status?.err_code === 0) setApps(res.data.apps || []);
        else setError("Failed to load apps");
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, []);

  return (
    <Box sx={{ mb: 6 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, mb: 3 }}>
        Your OTT Apps
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 240px)",
          gap: "26px",
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
              }}
            >
              <Avatar src={app.icon} sx={avatarStyle} variant="rounded" />
              <CardContent sx={{ textAlign: "center", p: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{app.appname}</Typography>
                <Typography sx={{ color: "#888", fontSize: 12 }}>
                  Streaming Services
                </Typography>
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
              <Typography sx={{ color: "#888", fontSize: 12 }}>
                Streaming Services
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Box>
  );
};

export default OttViews;




















// import React, { useEffect, useState } from "react";
// import { Box, Typography, Card, CardActionArea, CardContent, Avatar } from "@mui/material";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// const getUserInfo = () => {
// 	return {
// 		userid: localStorage.getItem("userId") || "testiser1",
// 		mobile: localStorage.getItem("userPhone") || "7800000001",
// 		ip_address: "192.168.101.110",
// 		mac_address: "68:1D:EF:14:6C:21",
// 	};
// };

// const OTT_CARD_LIMIT = 4;

// const cardStyle = {
// 	background: "#1a1a1a",
// 	borderRadius: 3,
// 	width: 145,
// 	height: 145,
// 	color: "#fff",
// 	display: "flex",
// 	flexDirection: "column",
// 	alignItems: "center",
// 	justifyContent: "center",
// 	border: "2px solid transparent",
// 	transition: "all 0.2s ease",
// 	cursor: "pointer",
// 	'&:hover': {
// 		border: "2px solid #fff",
// 		transform: "translateY(-2px)",
// 	},
// 	'&.selected': {
// 		border: "2px solid #fff",
// 	},
// };

// const avatarStyle = {
// 	width: 70,
// 	height: 70,
// 	marginBottom: 1.5,
// 	borderRadius: 2,
// };

// const OttView = () => {
// 	const [apps, setApps] = useState([]);
// 	const [loading, setLoading] = useState(true);
// 	const [error, setError] = useState("");
// 	const [selected, setSelected] = useState(-1);
// 	const navigate = useNavigate();

// 	useEffect(() => {
// 		const fetchApps = async () => {
// 			setLoading(true);
// 			setError("");
// 			try {
// 				const res = await axios.post(
// 					"http://124.40.244.211/netmon/cabletvapis/allowedapps",
// 					getUserInfo(),
// 					{ headers: { "Content-Type": "application/json" } }
// 				);
// 				if (res?.data?.status?.err_code === 0) {
// 					setApps(res.data.apps || []);
// 				} else {
// 					setError(res?.data?.status?.err_msg || "Failed to load apps");
// 				}
// 			} catch (err) {
// 				setError(err?.response?.data?.status?.err_msg || "Network error");
// 			} finally {
// 				setLoading(false);
// 			}
// 		};
// 		fetchApps();
// 	}, []);

// 	const handleCardClick = (idx) => {
// 		setSelected(idx);
// 	};

// 	const handleViewAll = () => {
// 		navigate("/movies-ott");
// 	};

// 	const visibleApps = apps.slice(0, OTT_CARD_LIMIT);

// 	return (
// 		<Box sx={{ mb: 6 }}>
// 			<Typography 
// 				sx={{ 
// 					color: "#fff", 
// 					fontSize: 22, 
// 					fontWeight: 600, 
// 					mb: 3,
// 					fontFamily: 'system-ui, -apple-system, sans-serif'
// 				}}
// 			>
// 				Your OTT Apps
// 			</Typography>
// 			{error && (
// 				<Typography sx={{ color: "#f44336", mb: 2 }}>{error}</Typography>
// 			)}
// 			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
// 				{visibleApps.map((app, idx) => (
// 					<Card
// 						key={app.appname}
// 						sx={{
// 							...cardStyle,
// 							border: selected === idx ? "2px solid #fff" : "2px solid transparent",
// 						}}
// 						className={selected === idx ? "selected" : ""}
// 						onClick={() => handleCardClick(idx)}
// 					>
// 						<CardActionArea 
// 							sx={{ 
// 								height: "100%",
// 								display: "flex", 
// 								flexDirection: "column", 
// 								alignItems: "center",
// 								justifyContent: "center",
// 								p: 2 
// 							}}
// 						>
// 							<Avatar 
// 								src={app.icon} 
// 								alt={app.appname} 
// 								sx={avatarStyle}
// 								variant="rounded"
// 							/>
// 							<CardContent sx={{ textAlign: "center", p: 0 }}>
// 								<Typography sx={{ color: "#fff", fontWeight: 600, fontSize: 14, mb: 0.5 }}>
// 									{app.appname}
// 								</Typography>
// 								<Typography sx={{ color: "#888", fontSize: 11 }}>
// 									Streaming Services
// 								</Typography>
// 							</CardContent>
// 						</CardActionArea>
// 					</Card>
// 				))}
				
// 				{/* View All OTT Card */}
// 				<Card
// 					key="view-all-ott"
// 					sx={{
// 						...cardStyle,
// 						border: selected === 99 ? "2px solid #fff" : "2px solid transparent",
// 					}}
// 					className={selected === 99 ? "selected" : ""}
// 					onClick={() => {
// 						setSelected(99);
// 						setTimeout(() => handleViewAll(), 100);
// 					}}
// 				>
// 					<CardActionArea 
// 						sx={{ 
// 							height: "100%",
// 							display: "flex", 
// 							flexDirection: "column", 
// 							alignItems: "center",
// 							justifyContent: "center",
// 							p: 2 
// 						}}
// 					>
// 						<Avatar sx={{ ...avatarStyle, bgcolor: "#2a2a2a" }} variant="rounded">
// 							<Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 28 }}>
// 								→
// 							</Typography>
// 						</Avatar>
// 						<CardContent sx={{ textAlign: "center", p: 0 }}>
// 							<Typography sx={{ color: "#fff", fontWeight: 600, fontSize: 14, mb: 0.5 }}>
// 								View All Ott
// 							</Typography>
// 							<Typography sx={{ color: "#888", fontSize: 11 }}>
// 								Streaming Services
// 							</Typography>
// 						</CardContent>
// 					</CardActionArea>
// 				</Card>
// 			</Box>
// 		</Box>
// 	);
// };

// export default OttView;
import  { useEffect, useState } from "react";
import { Box, Typography, Card, CardActionArea, CardContent, Avatar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { fetchChannels } from "../../Api/modules-api/ChannelApi";
import { fetchDeviceInfo } from "../../Api/utils/deviceInfo";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../../Api/config";
import { useRemoteNavigation } from "../../Atomic-Common-Componenets/useRemoteNavigation";

const CHANNEL_CARD_LIMIT = 4;

const cardStyle = {
	background: "#fff",
	borderRadius: 3,
	width: 145,
	height: 145,
	color: "#111",
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	border: "2px solid transparent",
	transition: "all 0.2s ease",
	cursor: "pointer",
	'&:hover': {
		border: "2px solid #000",
		transform: "translateY(-2px)",
	},
	'&.selected': {
		border: "2px solid #000",
	},
};

const avatarStyle = {
	width: 70,
	height: 70,
	marginBottom: 1.5,
	borderRadius: 2,
};

const fallbackChannels = [
	{ chnl_name: "Udhaya TV", logo: "" },
	{ chnl_name: "Colors Super", logo: "" },
	{ chnl_name: "Zee Kannada", logo: "" },
	{ chnl_name: "Gemini TV", logo: "" },
];

const ChannelsView = () => {
	const [channels, setChannels] = useState([]);
	const [error, setError] = useState("");
	const [selected, setSelected] = useState(-1);
	const [deviceInfo, setDeviceInfo] = useState({});
	const navigate = useNavigate();

	const visibleChannels = (channels.length ? channels : fallbackChannels).slice(
		0,
		CHANNEL_CARD_LIMIT
	);

	// Remote navigation for channel cards
	const { getItemProps } = useRemoteNavigation(
		visibleChannels.length,
		{
			orientation: "horizontal",
			onSelect: (index) => {
				handleCardClick(index);
			},
		}
	);

	const handleCardClick = (idx) => {
		setSelected(idx);
		setTimeout(() => navigate("/live-channels"), 80);
	};

	const handleViewAll = () => {
		navigate("/live-channels");
	};

	useEffect(() => {
		const loadDevice = async () => {
			try {
				const info = await fetchDeviceInfo();
				setDeviceInfo(info);
			} catch (err) {
				console.warn("Device info unavailable", err);
			}
		};
		loadDevice();
	}, []);

	useEffect(() => {
		const loadChannels = async () => {
			setError("");
			try {
				const payload = {
					userid: localStorage.getItem("userId") || DEFAULT_USER.userid,
					mobile: localStorage.getItem("userPhone") || "7800000001",
				};
				
				// Include device info in payload
				if (deviceInfo?.ipAddress) payload.ip_address = deviceInfo.ipAddress;
				if (deviceInfo?.macAddress) payload.mac_address = deviceInfo.macAddress;
				
				// Build headers with device info
				const headers = {
					...DEFAULT_HEADERS,
				};
				
				const apiChannels = await fetchChannels(payload, headers, setError, deviceInfo);
				setChannels(apiChannels || []);
			} catch (err) {
				setError(err.message || "Failed to load channels");
			}
		};
		if (deviceInfo?.ipAddress) {
			loadChannels();
		}
	}, [deviceInfo]);

	return (
		<Box sx={{ mb: 6 }}>
			<Typography 
				sx={{ 
					color: "#fff", 
					fontSize: 22, 
					fontWeight: 600, 
					mb: 3,
					fontFamily: 'system-ui, -apple-system, sans-serif'
				}}
			>
				Live TV Channels
			</Typography>
			{error && (
				<Typography sx={{ color: "#f44336", mb: 2 }}>{error}</Typography>
			)}
			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
			{visibleChannels.map((ch, idx) => {
				const cardProps = getItemProps(idx);
				const isFocused = cardProps["data-focused"];
				return (
					<Card
						key={ch.chnl_id || idx}
						{...cardProps}
						sx={{
							...cardStyle,
							border: isFocused ? "3px solid #667eea" : (selected === idx ? "2px solid #000" : "2px solid transparent"),
							transform: isFocused ? "scale(1.08)" : "scale(1)",
							boxShadow: isFocused ? "0 8px 24px rgba(102, 126, 234, 0.4)" : "none",
							zIndex: isFocused ? 10 : 1,
						}}
						className={selected === idx ? "selected" : ""}
						onClick={() => handleCardClick(idx)}
					>
						<CardActionArea 
							sx={{ 
								height: "100%",
								display: "flex", 
								flexDirection: "column", 
								alignItems: "center",
								justifyContent: "center",
								p: 2 
							}}
						>
							<Avatar 
								src={ch.logo} 
								alt={ch.chnl_name} 
								sx={avatarStyle}
								variant="rounded"
							/>
							<CardContent sx={{ textAlign: "center", p: 0 }}>
								<Typography sx={{ color: "#000", fontWeight: 600, fontSize: 14, mb: 0.5 }}>
									{ch.chnl_name}
								</Typography>
								<Typography sx={{ color: "#666", fontSize: 11 }}>
									live Channels
								</Typography>
							</CardContent>
						</CardActionArea>
					</Card>
				);
			})}
				{/* View All Channels Card */}
				<Card
					key="view-all-channels"
					sx={{
						...cardStyle,
						background: "#1a1a1a",
						color: "#fff",
						border: selected === 99 ? "2px solid #fff" : "2px solid transparent",
						'&:hover': {
							border: "2px solid #fff",
							transform: "translateY(-2px)",
						},
					}}
					className={selected === 99 ? "selected" : ""}
					onClick={() => {
						setSelected(99);
						setTimeout(() => handleViewAll(), 100);
					}}
				>
					<CardActionArea 
						sx={{ 
							height: "100%",
							display: "flex", 
							flexDirection: "column", 
							alignItems: "center",
							justifyContent: "center",
							p: 2 
						}}
					>
						<Avatar sx={{ ...avatarStyle, bgcolor: "#2a2a2a" }} variant="rounded">
							<Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 28 }}>
								→
							</Typography>
						</Avatar>
						<CardContent sx={{ textAlign: "center", p: 0 }}>
							<Typography sx={{ color: "#fff", fontWeight: 600, fontSize: 14, mb: 0.5 }}>
								View All Channel
							</Typography>
							<Typography sx={{ color: "#888", fontSize: 11 }}>
								Live Channels
							</Typography>
						</CardContent>
					</CardActionArea>
				</Card>
			</Box>
		</Box>
	);
};

export default ChannelsView;
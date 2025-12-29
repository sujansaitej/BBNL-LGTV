import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardActionArea, CardContent, Avatar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const getUserInfo = () => {
	return {
		userid: localStorage.getItem("userId") || "testiser1",
		mobile: localStorage.getItem("userPhone") || "7800000001",
		ip_address: "192.168.101.110",
		mac_address: "68:1D:EF:14:6C:21",
	};
};

const OTT_CARD_LIMIT = 4;

const cardStyle = {
	background: "#1a1a1a",
	borderRadius: 3,
	width: 145,
	height: 145,
	color: "#fff",
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	border: "2px solid transparent",
	transition: "all 0.2s ease",
	cursor: "pointer",
	'&:hover': {
		border: "2px solid #fff",
		transform: "translateY(-2px)",
	},
	'&.selected': {
		border: "2px solid #fff",
	},
};

const avatarStyle = {
	width: 70,
	height: 70,
	marginBottom: 1.5,
	borderRadius: 2,
};

const OttView = () => {
	const [apps, setApps] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [selected, setSelected] = useState(-1);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchApps = async () => {
			setLoading(true);
			setError("");
			try {
				const res = await axios.post(
					"http://124.40.244.211/netmon/cabletvapis/allowedapps",
					getUserInfo(),
					{ headers: { "Content-Type": "application/json" } }
				);
				if (res?.data?.status?.err_code === 0) {
					setApps(res.data.apps || []);
				} else {
					setError(res?.data?.status?.err_msg || "Failed to load apps");
				}
			} catch (err) {
				setError(err?.response?.data?.status?.err_msg || "Network error");
			} finally {
				setLoading(false);
			}
		};
		fetchApps();
	}, []);

	const handleCardClick = (idx) => {
		setSelected(idx);
	};

	const handleViewAll = () => {
		navigate("/movies-ott");
	};

	const visibleApps = apps.slice(0, OTT_CARD_LIMIT);

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
				Your OTT Apps
			</Typography>
			{error && (
				<Typography sx={{ color: "#f44336", mb: 2 }}>{error}</Typography>
			)}
			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
				{visibleApps.map((app, idx) => (
					<Card
						key={app.appname}
						sx={{
							...cardStyle,
							border: selected === idx ? "2px solid #fff" : "2px solid transparent",
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
								src={app.icon} 
								alt={app.appname} 
								sx={avatarStyle}
								variant="rounded"
							/>
							<CardContent sx={{ textAlign: "center", p: 0 }}>
								<Typography sx={{ color: "#fff", fontWeight: 600, fontSize: 14, mb: 0.5 }}>
									{app.appname}
								</Typography>
								<Typography sx={{ color: "#888", fontSize: 11 }}>
									Streaming Services
								</Typography>
							</CardContent>
						</CardActionArea>
					</Card>
				))}
				
				{/* View All OTT Card */}
				<Card
					key="view-all-ott"
					sx={{
						...cardStyle,
						border: selected === 99 ? "2px solid #fff" : "2px solid transparent",
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
								View All Ott
							</Typography>
							<Typography sx={{ color: "#888", fontSize: 11 }}>
								Streaming Services
							</Typography>
						</CardContent>
					</CardActionArea>
				</Card>
			</Box>
		</Box>
	);
};

export default OttView;
import { useEffect, useMemo, useState } from "react";
import { Box, Typography, Avatar } from "@mui/material";

const ChannelsDetails = ({ channel, visible = false }) => {
	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 60000);
		return () => clearInterval(id);
	}, []);

	const deviceId =
		localStorage.getItem("deviceId") ||
		localStorage.getItem("devslno") ||
		"N/A";

	const expiryText = useMemo(() => {
		const raw = channel?.expirydate;
		if (!raw) return "Expires: N/A";

		const parsed = new Date(raw);
		if (Number.isNaN(parsed.getTime())) return "Expires: N/A";

		const diffMs = parsed.getTime() - now.getTime();
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
		if (diffDays <= 0) return "Expired";
		return `Expires in ${diffDays} days`;
	}, [channel?.expirydate, now]);

	if (!channel) return null;

	return (
		<Box
			sx={{
				position: "absolute",
				top: 0,
				left: 0,
				width: "100%",
				height: 96,
				px: 4,
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				color: "#fff",
				background: "rgba(0,0,0,0.55)",
				backdropFilter: "blur(18px)",
				opacity: visible ? 1 : 0,
				transform: visible ? "translateY(0)" : "translateY(-10px)",
				transition: "opacity 0.25s ease, transform 0.25s ease",
				pointerEvents: "none",
				zIndex: 30,
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
				<Avatar
					src={channel.chlogo}
					variant="rounded"
					sx={{ width: 58, height: 58, bgcolor: "#fff" }}
				/>
				<Box>
					<Typography sx={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.3px" }}>
						{String(channel.channelno || "--").padStart(3, "0")}
					</Typography>
					<Typography sx={{ fontSize: 18, fontWeight: 700 }}>
						{channel.chtitle || "Unknown Channel"}
					</Typography>
					<Typography sx={{ fontSize: 13, opacity: 0.8 }}>{expiryText}</Typography>
				</Box>
			</Box>

			<Box sx={{ display: "flex", gap: 4, alignItems: "center" }}>
				<Box sx={{ textAlign: "left" }}>
					<Typography sx={{ fontSize: 12, opacity: 0.7 }}>Channels Price $:</Typography>
					<Typography sx={{ fontSize: 14, fontWeight: 700 }}>
						{channel.chprice || "N/A"}
					</Typography>
				</Box>
				<Box sx={{ textAlign: "left" }}>
					<Typography sx={{ fontSize: 12, opacity: 0.7 }}>Device ID:</Typography>
					<Typography sx={{ fontSize: 14, fontWeight: 700 }}>
						{deviceId}
					</Typography>
				</Box>
				<Box sx={{ textAlign: "left" }}>
					<Typography sx={{ fontSize: 12, opacity: 0.7 }}>Subscribed:</Typography>
					<Typography sx={{ fontSize: 14, fontWeight: 700 }}>
						{channel.subscribed ? channel.subscribed.toUpperCase() : "N/A"}
					</Typography>
				</Box>
			</Box>

			<Box sx={{ textAlign: "right" }}>
				<Typography sx={{ fontSize: 14, fontWeight: 700 }}>
					{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
				</Typography>
				<Typography sx={{ fontSize: 12, opacity: 0.7 }}>
					{now.toLocaleDateString("en-US", {
						day: "2-digit",
						month: "short",
						year: "numeric",
					})}
				</Typography>
			</Box>
		</Box>
	);
};

export default ChannelsDetails;

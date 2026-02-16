import { useEffect, useMemo, useState } from "react";
import { Box, Typography, Avatar } from "@mui/material";
import { TV_TYPOGRAPHY, TV_SPACING, TV_RADIUS, TV_SHADOWS, TV_BLUR, TV_COLORS, TV_TIMING } from "../styles/tvConstants";

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
				bottom: TV_SPACING.xl,
				left: "50%",
				transform: "translate(-50%, 0) translateZ(0)",
				width: "80%",
				maxWidth: "1200px",
				minHeight: "7rem",
				px: TV_SPACING.xl,
				py: TV_SPACING.lg,
				display: visible ? "flex" : "none",
				alignItems: "center",
				justifyContent: "space-between",
				gap: TV_SPACING.lg,
				color: TV_COLORS.text.primary,
				background: TV_COLORS.background.overlay,
				backdropFilter: TV_BLUR.lg,
				border: "2px solid rgba(255,255,255,0.2)",
				borderRadius: TV_RADIUS.xxl,
				boxShadow: TV_SHADOWS.xl,
				pointerEvents: "none",
				zIndex: 30,
				willChange: "display",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: TV_SPACING.lg }}>
				<Avatar
					src={channel.chlogo}
					variant="rounded"
					sx={{ 
						width: "5rem", 
						height: "5rem", 
						bgcolor: "#fff",
						borderRadius: TV_RADIUS.lg,
						boxShadow: TV_SHADOWS.md,
					}}
				/>
				<Box>
					<Typography sx={{ 
						...TV_TYPOGRAPHY.body2,
						fontWeight: 700,
						opacity: 0.9,
					}}>
						{String(channel.channelno || "--").padStart(3, "0")}
					</Typography>
					<Typography sx={{ 
						...TV_TYPOGRAPHY.h3,
						mt: 0.5,
					}}>
						{channel.chtitle || "Unknown Channel"}
					</Typography>
					<Typography sx={{ 
						...TV_TYPOGRAPHY.caption,
						opacity: 0.75,
						mt: 0.5,
					}}>
						{expiryText}
					</Typography>
				</Box>
			</Box>

			<Box sx={{ display: "flex", gap: TV_SPACING.xl, alignItems: "center" }}>
				<Box sx={{ textAlign: "left" }}>
					<Typography sx={{ 
						...TV_TYPOGRAPHY.label,
						opacity: 0.7,
						mb: 0.5,
					}}>
						Channel Price:
					</Typography>
					<Typography sx={{ 
						...TV_TYPOGRAPHY.body2,
						fontWeight: 700,
					}}>
						{channel.chprice || "N/A"}
					</Typography>
				</Box>
				<Box sx={{ textAlign: "left" }}>
					<Typography sx={{ 
						...TV_TYPOGRAPHY.label,
						opacity: 0.7,
						mb: 0.5,
					}}>
						Device ID:
					</Typography>
					<Typography sx={{ 
						...TV_TYPOGRAPHY.body2,
						fontWeight: 700,
					}}>
						{deviceId}
					</Typography>
				</Box>
				<Box sx={{ textAlign: "left" }}>
					<Typography sx={{ 
						...TV_TYPOGRAPHY.label,
						opacity: 0.7,
						mb: 0.5,
					}}>
						Subscribed:
					</Typography>
					<Typography sx={{ 
						...TV_TYPOGRAPHY.body2,
						fontWeight: 700,
					}}>
						{channel.subscribed ? channel.subscribed.toUpperCase() : "N/A"}
					</Typography>
				</Box>
			</Box>

			<Box sx={{ textAlign: "right" }}>
				<Typography sx={{ 
					...TV_TYPOGRAPHY.h3,
					fontWeight: 700,
				}}>
					{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
				</Typography>
				<Typography sx={{ 
					...TV_TYPOGRAPHY.caption,
					opacity: 0.75,
					mt: 0.5,
				}}>
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

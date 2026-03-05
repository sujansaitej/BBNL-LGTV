import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchComingSoonImage } from "../Api/OAuthentication-Api/LogoApi";

const Favorites = () => {
	const navigate = useNavigate();
	const [comingSoonImage, setComingSoonImage] = useState("");
	const [imageLoading, setImageLoading] = useState(true);

	useEffect(() => {
		let isMounted = true;
		
		const loadImage = async () => {
			try {
				const result = await fetchComingSoonImage("COMING_SOON_TV_CHANNELS");
				if (isMounted && result?.success && result?.imageUrl) {
					setComingSoonImage(result.imageUrl);
				}
			} catch (error) {
				console.error("[COMING_SOON_TV_CHANNELS] Load error:", error);
			} finally {
				if (isMounted) {
					setImageLoading(false);
				}
			}
		};
		
		loadImage();
		
		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<Box
			sx={{
				minHeight: "100vh",
				width: "100%",
				bgcolor: "#808080",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				p: 3,
			}}
		>
			<Box
				sx={{
					width: "100%",
					maxWidth: "760px",
					bgcolor: "#2f2f36",
					border: "1px solid rgba(255,255,255,0.55)",
					borderRadius: "28px",
					px: 4,
					py: 3.5,
					textAlign: "center",
				}}
			>
				{imageLoading ? (
					<Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
						<CircularProgress sx={{ color: "#f4bf1f" }} size={60} />
					</Box>
				) : (
					<Box
						component="img"
						src={comingSoonImage}
						alt="Coming Soon TV Channels"
						onError={(e) => {
							console.warn("[COMING_SOON_TV_CHANNELS] Image load failed");
							e.currentTarget.style.display = "none";
						}}
						sx={{
							width: "100%",
							maxHeight: "300px",
							objectFit: "contain",
							borderRadius: "20px",
							mb: 3,
							bgcolor: "#f0e9d6",
						}}
					/>
				)}

				<Typography sx={{ color: "#fff", fontSize: "3rem", fontWeight: 700, lineHeight: 1.2, mb: 1.2 }}>
					Coming Soon Liked Favorite Channels
				</Typography>

				<Button
					onClick={() => navigate("/home")}
					sx={{
						minWidth: "220px",
						height: "56px",
						borderRadius: "9999px",
						bgcolor: "#f4bf1f",
						color: "#000",
						fontSize: "1.4rem",
						fontWeight: 700,
						textTransform: "none",
						"&:hover": {
							bgcolor: "#f4bf1f",
						},
					}}
				>
					Go to home
				</Button>
			</Box>
		</Box>
	);
};

export default Favorites;

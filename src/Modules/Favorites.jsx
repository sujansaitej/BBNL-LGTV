import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import favoriteComingSoonImage from "../Asset/Favuroit Comming soon.svg";

const Favorites = () => {
	const navigate = useNavigate();

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
				<Box
					component="img"
					src={favoriteComingSoonImage}
					alt="Coming Soon Liked Favorite Channels"
					sx={{
						width: "100%",
						maxHeight: "300px",
						objectFit: "contain",
						borderRadius: "20px",
						mb: 3,
						bgcolor: "#f0e9d6",
					}}
				/>

				<Typography sx={{ color: "#fff", fontSize: "3rem", fontWeight: 700, lineHeight: 1.2, mb: 1.2 }}>
					Coming Soon Liked Favorite Channels
				</Typography>

				<Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "1.6rem", mb: 3.4, fontWeight: 600 }}>
					New TV channels coming soon. Stay tuned!
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

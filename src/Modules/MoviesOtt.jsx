import { useState, useEffect } from "react";
import axios from "axios";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS, getDefaultHeaders } from "../Api/config";
import { useEnhancedRemoteNavigation } from "../Atomic-Common-Componenets/useMagicRemote";

const FALLBACK_OTT_IMAGE = "http://124.40.244.211/netmon/Cabletvapis/showimg/coming_soon_ott.png";

const MoviesOtt = () => {
	const navigate = useNavigate();

	const [ottImage, setOttImage] = useState(FALLBACK_OTT_IMAGE);
	const [loadingImage, setLoadingImage] = useState(true);

	useEffect(() => {
		let isMounted = true;
		const fetchImage = async () => {
			try {
				const mobile = localStorage.getItem("userPhone") || "0000000000";
				const requestPayload = {
					userid: "lgiptv",
					mobile,
					device_type: "LG TV",
					mac_address: "",
					device_name: "LG TV",
					app_package: "com.lgiptv.bbnl",
				};
				const response = await axios.post(
					API_ENDPOINTS.ERROR_IMAGES,
					requestPayload,
					{ headers: getDefaultHeaders() }
				);
				const errImgs = response?.data?.errImgs || [];
				const item = errImgs.find((i) =>
					Object.prototype.hasOwnProperty.call(i, "COMING_SOON_OTT")
				);
				const url = item?.COMING_SOON_OTT;
				if (isMounted && url) setOttImage(url);
			} catch {
				/* keep fallback */
			} finally {
				if (isMounted) setLoadingImage(false);
			}
		};
		fetchImage();
		return () => { isMounted = false; };
	}, []);

	// Magic Remote Navigation for the single button
	const {
		focusedIndex,
		hoveredIndex,
		getItemProps,
		magicRemoteReady,
	} = useEnhancedRemoteNavigation([{ id: 'home-button' }], {
		orientation: 'vertical',
		useMagicRemotePointer: true,
		focusThreshold: 150,
		onSelect: () => {
			navigate("/home");
		},
	});

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
				{loadingImage ? (
					<Box sx={{ width: "100%", maxHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center", mb: 3, minHeight: 200 }}>
						<CircularProgress sx={{ color: "#f4bf1f" }} size={48} />
					</Box>
				) : (
					<Box
						component="img"
						src={ottImage}
						alt="Coming Soon Movie OTT"
						onError={(e) => { e.currentTarget.src = FALLBACK_OTT_IMAGE; }}
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
					Coming Soon Movie OTT
				</Typography>

				<Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "1.6rem", mb: 3.4, fontWeight: 600 }}>
					New OTT apps content dropping soon. Stay tuned!
				</Typography>

				{/* Magic Remote Status */}
				{magicRemoteReady && (
					<Box sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '0.5rem',
						mb: 2,
					}}>
						<Box sx={{
							width: 8,
							height: 8,
							borderRadius: '50%',
							bgcolor: '#43e97b',
							boxShadow: '0 0 10px rgba(67, 233, 123, 0.8)',
							animation: 'pulse-dot 1.5s ease-in-out infinite',
						}} />
						<Typography sx={{ fontSize: '0.875rem', color: '#43e97b', fontWeight: 600 }}>
							Magic Remote Ready
						</Typography>
					</Box>
				)}

				<Button
					{...getItemProps(0)}
					className={`focusable-button ${focusedIndex === 0 ? 'focused' : ''} ${hoveredIndex === 0 ? 'hovered' : ''}`}
					onClick={() => navigate("/home")}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							navigate("/home");
						}
					}}
					sx={{
						minWidth: "220px",
						height: "56px",
						borderRadius: "9999px",
						bgcolor: "#f4bf1f",
						color: "#000",
						fontSize: "1.4rem",
						fontWeight: 700,
						textTransform: "none",
						border: focusedIndex === 0 ? "3px solid #667eea" : "2px solid transparent",
						transform: focusedIndex === 0 
							? "scale(1.15)" 
							: hoveredIndex === 0 
							? "scale(1.08)" 
							: "scale(1)",
						transition: "all 0.25s ease",
						boxShadow: focusedIndex === 0 
							? "0 12px 30px rgba(102, 126, 234, 0.5)" 
							: "none",
						"&:hover": {
							bgcolor: "#f4bf1f",
						},
						"&:focus-visible": {
							outline: "none",
						},
					}}
				>
					Go to home
				</Button>
			</Box>
		</Box>
	);
};

export default MoviesOtt;

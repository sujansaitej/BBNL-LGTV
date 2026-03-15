import { useEffect, useState } from "react";
import axios from "axios";
import { Box, Paper, Typography, Button, CircularProgress } from "@mui/material";
import { API_ENDPOINTS, API_BASE_URL_PROD, getDefaultHeaders } from "../../server/config";

const FALLBACK_LOGIN_REQUIRED_IMAGE = "http://124.40.244.211/netmon/Cabletvapis/showimg/login_required.png";

const RegisterNumber = ({ onRetry, message }) => {
	const [imageUrl, setImageUrl] = useState(FALLBACK_LOGIN_REQUIRED_IMAGE);
	const [loadingImage, setLoadingImage] = useState(true);

	useEffect(() => {
		let isMounted = true;

		const fetchErrorImages = async () => {
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
				const loginRequiredItem = errImgs.find((item) => Object.prototype.hasOwnProperty.call(item, "LOGIN_REQUIRED"));
				const loginRequiredUrl = loginRequiredItem?.LOGIN_REQUIRED;

				if (isMounted && loginRequiredUrl) {
					setImageUrl(loginRequiredUrl);
				}
			} catch (error) {
				if (isMounted) {
					setImageUrl(FALLBACK_LOGIN_REQUIRED_IMAGE);
				}
			} finally {
				if (isMounted) {
					setLoadingImage(false);
				}
			}
		};

		fetchErrorImages();
		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<Box
			sx={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(15, 23, 42, 0.55)",
				backdropFilter: "blur(18px) saturate(180%)",
				WebkitBackdropFilter: "blur(18px) saturate(180%)",
				zIndex: 9999,
				p: 3,
			}}
		>
			<Paper
				elevation={0}
				sx={{
					width: "100%",
					maxWidth: 900,
					borderRadius: "40px",
					border: "2px solid rgba(255,255,255,0.9)",
					bgcolor: "#2F2F35",
					p: { xs: 3, md: 5 },
				}}
			>
				<Box
					sx={{
						width: "100%",
						minHeight: { xs: 240, md: 360 },
						borderRadius: "30px",
						bgcolor: "#F6F6F2",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						mb: 5,
						overflow: "hidden",
					}}
				>
					{loadingImage ? (
						<CircularProgress sx={{ color: "#111" }} />
					) : (
						<Box
							component="img"
							src={imageUrl || `${API_BASE_URL_PROD}/showimg/login_required.png`}
							alt="Login required"
							onError={(e) => {
								e.currentTarget.onerror = null;
								e.currentTarget.src = FALLBACK_LOGIN_REQUIRED_IMAGE;
							}}
							sx={{
								width: "100%",
								height: "100%",
								objectFit: "contain",
								p: { xs: 1, md: 2 },
							}}
						/>
					)}
				</Box>

				<Typography
					sx={{
						color: "#fff",
						fontSize: { xs: 36, md: 52 },
						fontWeight: 700,
						textAlign: "center",
						mb: 5,
					}}
				>
					{message || "Invalid User / Mobile Number"}
				</Typography>

				<Box sx={{ display: "flex", justifyContent: "center" }}>
					<Button
						onClick={() => onRetry?.()}
						sx={{
							minWidth: { xs: 220, md: 260 },
							height: { xs: 56, md: 64 },
							borderRadius: "40px",
							bgcolor: "#F2BC1B",
							color: "#000",
							fontSize: { xs: 32, md: 36 },
							fontWeight: 700,
							textTransform: "none",
							"&:hover": { bgcolor: "#E3AE14" },
						}}
					>
						Try Again
					</Button>
				</Box>
			</Paper>
		</Box>
	);
};

export default RegisterNumber;

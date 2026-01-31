import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { fetchLanguages } from "../../Api/modules-api/LanguageChannelsApi";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../../Api/config";

const ChannelsView = () => {
	const navigate = useNavigate();
	const [languages, setLanguages] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	// Get userid + mobile
	const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
	const mobile = localStorage.getItem("userPhone") || "";

	const payloadBase = {
		userid,
		mobile,
	};

	const headers = {
		...DEFAULT_HEADERS,
	};

	// ================= FETCH LANGUAGES =================
	const handleFetchLanguages = async () => {
		try {
			setLoading(true);
			const languagesData = await fetchLanguages(payloadBase, headers);
			setLanguages(languagesData || []);
		} catch (err) {
			setError("Failed to load languages");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!mobile) {
			setError("NO_LOGIN");
			return;
		}
		handleFetchLanguages();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mobile]);

	// Handle language card click
	const handleLanguageClick = (langid) => {
		navigate("/live-channels", { state: { filterByLanguage: langid } });
	};

	return (
		<Box sx={{ mb: 6 }}>
			<Typography sx={{ fontSize: 22, fontWeight: 700, mb: 3, color: "#fff" }}>
				TV CHANNELS
			</Typography>

			{/* ================= LOADING STATE ================= */}
			{loading && (
				<Typography sx={{ color: "#999" }}>Loading channels...</Typography>
			)}

			{/* ================= ERROR STATE ================= */}
			{error && error !== "NO_LOGIN" && (
				<Typography sx={{ color: "#ff6b6b" }}>
					{error}
				</Typography>
			)}

			{/* ================= CHANNEL CARDS GRID ================= */}
			{!loading && !error && (
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: "repeat(5, 240px)",
						gap: "103px",
					}}
				>
					{languages.length === 0 ? (
						<Typography sx={{ color: "#888" }}>No channels available</Typography>
					) : (
						languages.map((lang, index) => (
							<Box
								key={index}
								onClick={() => handleLanguageClick(lang.langid)}
								sx={{
									background: "#111",
									borderRadius: "14px",
									padding: "20px 10px",
									cursor: "pointer",
									transition: "all 0.3s ease",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									border: "2px solid rgba(255,255,255,.2)",
									"&:hover": {
										transform: "scale(1.05)",
										boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)",
										borderColor: "#667eea",
									},
								}}
							>
								{/* Language Logo */}
								{lang.langlogo && (
									<img
										src={lang.langlogo}
										alt={lang.langtitle}
										style={{
											width: "90px",
											height: "90px",
											objectFit: "contain",
											marginBottom: "12px",
										}}
										onError={(e) => {
											e.target.style.display = "none";
										}}
									/>
								)}

								{/* Language Title */}
								<Typography
									sx={{
										fontSize: 14,
										fontWeight: 600,
										color: "#fff",
										textAlign: "center",
									}}
								>
									{lang.langtitle}
								</Typography>
							</Box>
						))
					)}
				</Box>
			)}
		</Box>
	);
};

export default ChannelsView;
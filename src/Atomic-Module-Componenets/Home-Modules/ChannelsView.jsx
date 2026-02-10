import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { DEFAULT_USER } from "../../Api/config";
import useLanguageStore from "../../Global-storage/LivePlayersStore";

const ChannelsView = () => {
	const navigate = useNavigate();
	const { languagesCache, error, fetchLanguages } = useLanguageStore();

	// Get userid + mobile
	const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
	const mobile = localStorage.getItem("userPhone") || "";

	const payloadBase = {
		userid,
		mobile,
	};

	// ================= FETCH LANGUAGES =================
	useEffect(() => {
		if (!mobile) {
			return;
		}
		fetchLanguages(payloadBase);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mobile]);

	const langKey = `${userid}|${mobile}`;
	const langEntry = languagesCache[langKey] || {};
	const languages = langEntry.data || [];
	const loading = langEntry.isLoading;

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
						gap: "125px",
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
									width: "240px",
									borderRadius: "14px",
									cursor: "pointer",
									transition: "all 0.3s ease",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									gap: 1,
									"&:hover": {
										transform: "scale(1.05)",
										boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
									},
								}}
							>
								{/* Language Logo */}
								{lang.langlogo && (
									<Box
										sx={{
											width: "240px",
											height: "195px",
											overflow: "hidden",
											borderRadius: "14px",
											position: "relative",
											background: "#111",
											backgroundImage: `url(${lang.langlogo})`,
											backgroundSize: "cover",
											backgroundPosition: "center",
											backgroundRepeat: "no-repeat",
										}}
									>
										<Box
											component="img"
											src={lang.langlogo}
											alt={lang.langtitle}
											sx={{
												position: "absolute",
												inset: 0,
												width: "100%",
												height: "100%",
												opacity: 0,
												pointerEvents: "none",
											}}
											onError={(e) => {
												e.currentTarget.style.display = "none";
												e.currentTarget.parentElement.style.backgroundImage = "none";
											}}
										/>
									</Box>
								)}
							</Box>
						))
					)}
				</Box>
			)}
		</Box>
	);
};

export default ChannelsView;

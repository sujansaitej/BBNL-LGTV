import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { DEFAULT_USER } from "../../Api/config";
import useLanguageStore from "../../Global-storage/LivePlayersStore";
import { useGridNavigation } from "../../Atomic-Common-Componenets/useRemoteNavigation";
import { TV_TYPOGRAPHY, TV_SPACING, TV_RADIUS, TV_SHADOWS, TV_TIMING, TV_COLORS, TV_GRID } from "../../styles/tvConstants";

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

	const columnsCount = useMemo(() => TV_GRID.getColumns(window.innerWidth), []);
	const { getItemProps: getLanguageProps } = useGridNavigation(
		languages.length,
		columnsCount,
		{
			loop: false,
			onSelect: (index) => {
				const lang = languages[index];
				if (lang) {
					handleLanguageClick(lang.langid);
				}
			},
		}
	);

	// Handle language card click
	const handleLanguageClick = (langid) => {
		navigate("/live-channels", { state: { filterByLanguage: langid } });
	};

	return (
		<Box sx={{ mb: "3rem" }}>
			<Typography sx={{ 
				fontSize: "2rem",
				fontWeight: 700,
				mb: "2rem",
				color: "#fff",
			}}>
				TV CHANNELS
			</Typography>

			{/* ================= LOADING STATE ================= */}
			{loading && (
				<Typography sx={{ 
					fontSize: "1.25rem",
					color: "rgba(255,255,255,0.6)",
				}}>
					Loading channels...
				</Typography>
			)}

			{/* ================= ERROR STATE ================= */}
			{error && error !== "NO_LOGIN" && (
				<Typography sx={{ 
					fontSize: "1.25rem",
					color: "#f44336",
				}}>
					{error}
				</Typography>
			)}

			{/* ================= CHANNEL CARDS GRID ================= */}
			{!loading && !error && (
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))",
						gap: "3rem",
					}}
				>
					{languages.length === 0 ? (
						<Typography sx={{ 
							fontSize: "1.25rem",
							color: "rgba(255,255,255,0.6)",
						}}>
							No channels available
						</Typography>
					) : (
						languages.map((lang, index) => {
							const props = getLanguageProps(index);
							return (
								<Box
								key={index}
									{...props}
									data-focusable="true"
									onClick={() => handleLanguageClick(lang.langid)}
								sx={{
									width: "15rem",
									borderRadius: "1rem",
									cursor: "pointer",
									transition: "all 0.3s ease",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
										outline: "none",
										boxShadow: props["data-focused"] ? TV_SHADOWS.focusGlow : "none",
										transform: props["data-focused"] ? "scale(1.06)" : "scale(1)",
									"&:hover": {
										transform: "scale(1.05)",
										boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
									},
									"&:focus": {
										transform: "scale(1.08)",
										outline: "4px solid #667eea",
										boxShadow: "0 0 24px rgba(102, 126, 234, 0.6)",
									},
								}}
							>
								{/* Language Logo */}
								{lang.langlogo && (
									<Box
										sx={{
											width: "15rem",
											height: "12rem",
											overflow: "hidden",
											borderRadius: "1rem",
											position: "relative",
											background: "#121212",
											backgroundImage: `url(${lang.langlogo})`,
											backgroundSize: "cover",
											backgroundPosition: "center",
											backgroundRepeat: "no-repeat",
											boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
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
						);
						})
					)}
				</Box>
			)}
		</Box>
	);
};

export default ChannelsView;

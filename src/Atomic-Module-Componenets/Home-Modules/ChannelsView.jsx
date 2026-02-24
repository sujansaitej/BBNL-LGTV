import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { DEFAULT_USER } from "../../Api/config";
import useLanguageStore from "../../Global-storage/LivePlayersStore";
import { useEnhancedRemoteNavigation } from "../../Atomic-Common-Componenets/useMagicRemote";
import { TV_SHADOWS } from "../../styles/tvConstants";

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

	// Magic Remote Grid Navigation
	const columnsCount = 5; // Adjust based on grid-template-columns
	const {
		focusedIndex,
		hoveredIndex,
		getItemProps,
		magicRemoteReady,
	} = useEnhancedRemoteNavigation(languages, {
		orientation: 'grid',
		columns: columnsCount,
		useMagicRemotePointer: true,
		focusThreshold: 150,
		onSelect: (index) => {
			if (languages[index]) {
				handleLanguageClick(languages[index].langid);
			}
		},
	});

	return (
		<Box sx={{ mb: "3rem" }}>
			<Box sx={{ 
				display: 'flex', 
				alignItems: 'center', 
				justifyContent: 'space-between',
				mb: "2rem",
			}}>
				<Typography sx={{ 
					fontSize: "2rem",
					fontWeight: 700,
					color: "#fff",
				}}>
					TV CHANNELS
				</Typography>
				
				{/* Magic Remote Status */}
				{magicRemoteReady && (
					<Box sx={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.5rem',
						px: '1rem',
						py: '0.5rem',
						borderRadius: '8px',
						bgcolor: 'rgba(67, 233, 123, 0.15)',
						border: '2px solid rgba(67, 233, 123, 0.5)',
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
							Magic Remote
						</Typography>
					</Box>
				)}
			</Box>

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
							const isFocused = focusedIndex === index;
							const isHovered = hoveredIndex === index;

							return (
								<Box
									key={index}
									{...getItemProps(index)}
									className={`focusable-language-card ${isFocused ? 'focused' : ''} ${isHovered ? 'hovered' : ''}`}
									role="button"
									onClick={() => handleLanguageClick(lang.langid)}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											handleLanguageClick(lang.langid);
										}
									}}
									sx={{
										width: "15rem",
										borderRadius: "1rem",
										cursor: "pointer",
										transition: "all 0.25s ease",
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										outline: "none",
										transform: isFocused ? 'scale(1.15)' : isHovered ? 'scale(1.08)' : 'scale(1)',
										boxShadow: isFocused 
											? '0 0 50px rgba(102, 126, 234, 1), 0 16px 50px rgba(0, 0, 0, 0.7)'
											: isHovered
											? '0 8px 32px rgba(102, 126, 234, 0.5)'
											: '0 4px 16px rgba(0, 0, 0, 0.3)',
										"&:focus-visible": {
											transform: "scale(1.15)",
											outline: "5px solid #667eea",
											outlineOffset: "8px",
											boxShadow: TV_SHADOWS.focusGlow,
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
												boxShadow: isFocused 
													? '0 0 30px rgba(102, 126, 234, 0.8)'
													: '0 4px 16px rgba(0, 0, 0, 0.3)',
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

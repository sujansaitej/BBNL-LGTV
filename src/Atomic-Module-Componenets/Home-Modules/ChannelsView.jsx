import  { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { fetchChannels } from "../../Api/modules-api/ChannelApi";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../../Api/config";
import { useRemoteNavigation } from "../../Atomic-Common-Componenets/useRemoteNavigation";
import CommonCard from "../../Atomic-Reusable-Componenets/cards";

const CHANNEL_CARD_LIMIT = 4;

const fallbackChannels = [
	{
		chnl_name: "FoFi Info",
		chlogo: "http://124.40.244.211/netmon/cable-images/ch-fo-fi_info.png",
		streamlink: "https://livestream.bbnl.in/infochan/index.m3u8",
	},
	{
		chnl_name: "Regional Channels",
		chlogo: "http://124.40.244.211/netmon/Cabletvapis/adimage/regionalchannels.jpg",
		streamlink: "https://livestream.bbnl.in/infochan/index.m3u8",
	},
	{
		chnl_name: "Parental Control",
		chlogo: "http://124.40.244.211/netmon/Cabletvapis/adimage/parentalcontrol.jpg",
		streamlink: "https://livestream.bbnl.in/infochan/index.m3u8",
	},
	{
		chnl_name: "Sports",
		chlogo: "http://124.40.244.211/netmon/Cabletvapis/adimage/sports.jpg",
		streamlink: "https://livestream.bbnl.in/infochan/index.m3u8",
	},
];

const ChannelsView = () => {
	const [channels, setChannels] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const { getItemProps } = useRemoteNavigation({ itemCount: CHANNEL_CARD_LIMIT });

	useEffect(() => {
		const fetchChannel = async () => {
			setLoading(true);
			setError("");
			try {
				const apiChannels = await fetchChannels(DEFAULT_USER, DEFAULT_HEADERS);
				setChannels(apiChannels || []);
			} catch (err) {
				setError(err.message || "Failed to load channels");
			} finally {
				setLoading(false);
			}
		};
		fetchChannel();
	}, []);

	const handleCardClick = (idx, streamlink) => {
		navigate("/player", { state: { streamlink } });
	};

	const sourceChannels = channels && channels.length ? channels : fallbackChannels;
	const visibleChannels = sourceChannels.slice(0, CHANNEL_CARD_LIMIT);

	return (
		<Box sx={{ mb: 6 }}>
			<Typography 
				sx={{ 
					color: "#fff", 
					fontSize: 22, 
					fontWeight: 600, 
					mb: 3,
					fontFamily: 'system-ui, -apple-system, sans-serif'
				}}
			>
				Live TV Channels
			</Typography>
			<Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
			{visibleChannels.map((ch, idx) => {
				const cardProps = getItemProps(idx);
				const isFocused = cardProps["data-focused"];
				const streamlink = ch.streamlink || "https://livestream.bbnl.in/infochan/index.m3u8";
				const logo = ch.chlogo || ch.logo || "http://124.40.244.211/netmon/cable-images/ch-fo-fi_info.png";
				const name = ch.chnl_name || ch.name || "Live Channel";
				return (
					<CommonCard
						key={ch.chnl_id || idx}
						{...cardProps}
						ratio="16:9"
						sx={{
							border: isFocused ? "3px solid #fff" : "2px solid transparent",
							transform: isFocused ? "scale(1.05)" : "scale(1)",
							boxShadow: isFocused ? "0 8px 24px #fff" : "none",
							cursor: "pointer",
							maxHeight: 150,
						}}
						onClick={() => handleCardClick(idx, streamlink)}
						alt={name}
						src={logo}
						borderRadius="14px"
					/>
				);
			})}
			</Box>
		</Box>
	);
};

export default ChannelsView;
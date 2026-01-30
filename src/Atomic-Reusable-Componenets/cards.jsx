import PropTypes from "prop-types";
import Card from "@mui/material/Card";

// Common aspect ratios to reuse across the app: posters, banners, tiles
const RATIO_MAP = {
	"2:3": "2 / 3",      // posters
	"3:4": "3 / 4",      // portrait tiles
	"4:3": "4 / 3",      // classic landscape tiles
	"16:9": "16 / 9",    // banners / thumbnails
	"21:9": "21 / 9",    // hero banners
};

/**
 * CommonCard: simple reusable card that preserves aspect ratio.
 * - Accepts `ratio` (string key from RATIO_MAP or custom CSS aspect-ratio string)
 * - Renders an image that covers the card
 * - Optional `children` to overlay content (badges/text)
 */
const CommonCard = ({
	src,
	alt = "",
	ratio = "16:9",
	borderRadius = "16px",
	overlay,
	sx,
	...rest
}) => {
	const aspectRatio = RATIO_MAP[ratio] || ratio;

	return (
		<Card
			sx={{
				width: "100%",
				position: "relative",
				borderRadius,
				overflow: "hidden",
				background: "#111",
				aspectRatio,
				minHeight: 0,
				...sx,
			}}
			elevation={0}
			{...rest}
		>
			{src && (
				<img
					src={src}
					alt={alt}
					style={{
						width: "100%",
						height: "100%",
						objectFit: "cover",
						display: "block",
					}}
				/>
			)}

			{overlay && (
				<div
					style={{
						position: "absolute",
						top: 0,
						right: 0,
						bottom: 0,
						left: 0,
						pointerEvents: "none",
					}}
				>
					{overlay}
				</div>
			)}
		</Card>
	);
};

CommonCard.propTypes = {
	src: PropTypes.string,
	alt: PropTypes.string,
	ratio: PropTypes.string,
	borderRadius: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	overlay: PropTypes.node,
	sx: PropTypes.object,
};

export default CommonCard;

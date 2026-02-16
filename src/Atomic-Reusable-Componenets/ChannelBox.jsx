import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";
import { TV_TYPOGRAPHY, TV_SPACING, TV_RADIUS, TV_SHADOWS, TV_TIMING, TV_COLORS } from "../styles/tvConstants";

const ChannelBox = ({ logo, name, channelNo, price, onClick, focused }) => {
  const priceLabel = (() => {
    if (price === undefined || price === null || price === "") return "";
    const priceString = String(price).trim();
    if (priceString === "0" || priceString === "0.0" || priceString === "0.00") return "Free";
    return /^[0-9]+(\.[0-9]+)?$/.test(priceString) ? `₹${priceString}` : priceString;
  })();

  return (
    <Box sx={{ width: "18rem" }}>
      <Box
        className="channel-thumb"
        sx={{
          width: "18rem",
          height: "10rem",
          background: "#fff",
          borderRadius: TV_RADIUS.xl,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          cursor: onClick ? "pointer" : "default",
          border: focused ? `3px solid #667eea` : "3px solid transparent",
          transform: focused ? "scale(1.05)" : "scale(1)",
          transition: `transform ${TV_TIMING.fast} ease, border-color ${TV_TIMING.fast} ease, box-shadow ${TV_TIMING.fast} ease`,
          boxShadow: focused ? "0 0 0 4px rgba(102, 126, 234, 0.4), " + TV_SHADOWS.lg : TV_SHADOWS.md,
          zIndex: focused ? 10 : 1,
          padding: TV_SPACING.md,
          outline: "none",
        }}
        onClick={onClick}
      >
        {priceLabel && (
          <Box
            sx={{
              position: "absolute",
              top: TV_SPACING.sm,
              left: TV_SPACING.sm,
              bgcolor: "rgba(0,0,0,0.75)",
              color: "#fff",
              px: TV_SPACING.xs,
              py: TV_SPACING.xs,
              borderRadius: "9999px",
              fontSize: "0.85rem",
              fontWeight: 700,
              lineHeight: 1,
              zIndex: 2,
            }}
          >
            {priceLabel}
          </Box>
        )}

        <img
          src={logo}
          alt={name}
          style={{
            width: "94%",
            height: "94%",
            objectFit: "contain",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
          }}
          onError={(e) =>
            (e.target.src =
              "http://124.40.244.211/netmon/assets/site_images/chnlnoimage.jpg")
          }
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mt: TV_SPACING.sm,
          gap: TV_SPACING.xs,
          width: "100%",
        }}
      >
        <Typography
          sx={{
            ...TV_TYPOGRAPHY.body2,
            color: TV_COLORS.text.primary,
            fontWeight: 600,
            lineHeight: 1.3,
            flex: 1,
          }}
        >
          {name}
        </Typography>
        {channelNo && (
          <Typography
            sx={{
              ...TV_TYPOGRAPHY.body2,
              color: TV_COLORS.text.secondary,
              fontWeight: 700,
              minWidth: "2rem",
              textAlign: "right",
            }}
          >
            {channelNo}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

ChannelBox.propTypes = {
  logo: PropTypes.string,
  name: PropTypes.string,
  channelNo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subscribed: PropTypes.string,
  price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClick: PropTypes.func,
  focused: PropTypes.bool,
};

export default ChannelBox;

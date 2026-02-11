import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";
import { TV_TYPOGRAPHY, TV_SPACING, TV_RADIUS, TV_SHADOWS, TV_FOCUS, TV_TIMING, TV_COLORS } from "../styles/tvConstants";

const ChannelBox = ({ logo, name, channelNo, onClick, focused }) => (
  <Box>
    <Box
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
        border: focused ? `4px solid ${TV_COLORS.accent.primary}` : "4px solid transparent",
        transform: focused ? "scale(1.08)" : "scale(1)",
        transition: `transform ${TV_TIMING.fast} ease, border-color ${TV_TIMING.fast} ease, box-shadow ${TV_TIMING.fast} ease`,
        boxShadow: focused ? `${TV_SHADOWS.focusGlow}, ${TV_SHADOWS.lg}` : TV_SHADOWS.md,
        zIndex: focused ? 10 : 1,
        padding: TV_SPACING.md,
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
    >
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
        mt: TV_SPACING.md,
        gap: TV_SPACING.sm,
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
            minWidth: "2.5rem",
            textAlign: "right",
          }}
        >
          {channelNo}
        </Typography>
      )}
    </Box>
  </Box>
);

ChannelBox.propTypes = {
  logo: PropTypes.string,
  name: PropTypes.string,
  channelNo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subscribed: PropTypes.string,
  onClick: PropTypes.func,
  focused: PropTypes.bool,
};

export default ChannelBox;

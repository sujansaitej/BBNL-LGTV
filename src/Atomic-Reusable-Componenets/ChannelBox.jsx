import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";

const ChannelBox = ({ logo, name, subscribed, onClick, focused }) => (
  <Box>
    <Box
      sx={{
        width: 200,
        height: 120,
        background: "#fff",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        border: focused ? "4px solid #667eea" : "4px solid transparent",
        transform: focused ? "scale(1.1)" : "scale(1)",
        transition: "all 0.2s ease",
        boxShadow: focused ? "0 8px 24px rgba(102, 126, 234, 0.4)" : "none",
        zIndex: focused ? 10 : 1,
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
    >
      {subscribed === "yes" && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "red",
            color: "#fff",
            fontSize: 10,
            px: 1.5,
            borderRadius: "10px",
          }}
        >
          Live
        </Box>
      )}

      <img
        src={logo}
        alt={name}
        style={{ width: "90%", height: "90%", objectFit: "contain" }}
        onError={(e) =>
          (e.target.src =
            "http://124.40.244.211/netmon/assets/site_images/chnlnoimage.jpg")
        }
      />
    </Box>

    <Typography sx={{ color: "#fff", fontSize: 14, fontWeight: 600, mt: 1 }}>
      {name}
    </Typography>
  </Box>
);

ChannelBox.propTypes = {
  logo: PropTypes.string,
  name: PropTypes.string,
  subscribed: PropTypes.string,
  onClick: PropTypes.func,
  focused: PropTypes.bool,
};

export default ChannelBox;

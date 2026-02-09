import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";

const ChannelBox = ({ logo, name, channelNo, onClick, focused }) => (
  <Box>
    <Box
      sx={{
        width: 280,
        height: 160,
        background: "#fff",
        borderRadius: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        border: focused ? "5px solid #667eea" : "5px solid transparent",
        transform: focused ? "scale(1.06)" : "scale(1)",
        transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
        boxShadow: focused ? "0 12px 32px rgba(102, 126, 234, 0.5)" : "0 2px 8px rgba(0, 0, 0, 0.15)",
        zIndex: focused ? 10 : 1,
        padding: "10px",
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
    >

      <img
        src={logo}
        alt={name}
        style={{ width: "92%", height: "92%", objectFit: "contain" }}
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
        mt: 2,
        gap: 0.5,
      }}
    >
      <Typography
        sx={{
          color: "#fff",
          fontSize: 20,
          fontWeight: 600,
          lineHeight: 1.3,
          letterSpacing: "0.3px",
          textRendering: "optimizeLegibility",
          flex: 1,
        }}
      >
        {name}
      </Typography>
      {channelNo && (
        <Typography
          sx={{
            color: "rgba(255, 255, 255, 0.75)",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.2px",
            minWidth: 36,
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

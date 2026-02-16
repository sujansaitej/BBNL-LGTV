import { memo } from "react";
import { Box } from "@mui/material";
import PropTypes from "prop-types";

/**
 * ChannelNumberDisplay - LCN (Logical Channel Number) Display Component
 * Shows IPTV-style channel number overlay when user types channel numbers.
 * Memoized to prevent unnecessary re-renders during rapid navigation.
 */
export const ChannelNumberDisplay = memo(({ channelNumber }) => {
  if (!channelNumber) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: "32px",
        right: "32px",
        transform: "translateY(0) translateZ(0)",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        color: "#fff",
        padding: "18px 32px",
        borderRadius: "24px",
        fontSize: "74px",
        fontWeight: "bold",
        zIndex: 9999,
        minWidth: "140px",
        textAlign: "center",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.8)",
        border: "2px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        willChange: "contents",
        backfaceVisibility: "hidden",
      }}
    >
      {channelNumber}
    </Box>
  );
});

ChannelNumberDisplay.displayName = "ChannelNumberDisplay";

ChannelNumberDisplay.propTypes = {
  channelNumber: PropTypes.string,
};

ChannelNumberDisplay.defaultProps = {
  channelNumber: "",
};

/**
 * findChannelByNumber - locate a channel object from API response by number.
 * Accepts multiple field names and trims string/number values.
 */
export const findChannelByNumber = (channels, value) => {
  if (!channels || !Array.isArray(channels) || !value) return null;
  return channels.find((item) => {
    const rawNo =
      item.channelno ||
      item.channel_no ||
      item.chno ||
      item.channelNumber ||
      item.channelid ||
      item.chid ||
      "";
    if (String(rawNo).trim() === String(value).trim()) return true;
    const parsedRaw = parseInt(rawNo, 10);
    const parsedValue = parseInt(value, 10);
    if (!Number.isNaN(parsedRaw) && !Number.isNaN(parsedValue)) {
      return parsedRaw === parsedValue;
    }
    return false;
  }) || null;
};

export default ChannelNumberDisplay;

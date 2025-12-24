import React from "react";
import { Box, Typography, Chip } from "@mui/material";

const ChannelCard = ({
  title,
  logo,
  tag = "Live Channels",
  subscribed = false,
  language = "",
}) => {
  const fallback = title ? title.substring(0, 3).toUpperCase() : "";

  return (
    <Box
      sx={{
        bgcolor: "#0c0c0f",
        borderRadius: 3,
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
        overflow: "hidden",
        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        cursor: "pointer",
        position: "relative",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 16px 36px rgba(75,210,255,0.22)",
          borderColor: "rgba(75,210,255,0.4)",
        },
      }}
    >
      <Box
        sx={{
          height: 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#11131a",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
          }}
        >
          <Chip
            label={tag}
            size="small"
            sx={{
              bgcolor: "rgba(75,210,255,0.12)",
              color: "#8de5ff",
              fontSize: 11,
              borderRadius: "12px",
              height: 22,
            }}
          />
        </Box>

        {logo ? (
          <Box
            component="img"
            src={logo}
            alt={title}
            sx={{ width: 120, height: 120, objectFit: "contain", filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.4))" }}
          />
        ) : (
          <Box
            sx={{
              width: 92,
              height: 92,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ff8a00 0%, #e52e71 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {fallback}
          </Box>
        )}
      </Box>

      <Box sx={{ p: 2 }}>
        <Typography
          component="h3"
          sx={{
            fontSize: 15,
            fontWeight: 700,
            color: "#fff",
            mb: 0.75,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
          title={title}
        >
          {title || "Untitled"}
        </Typography>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {subscribed && (
            <Chip
              label="Subscribed"
              size="small"
              sx={{ bgcolor: "rgba(34,197,94,0.15)", color: "#6ee7b7", fontSize: 11, height: 24 }}
            />
          )}
          {language && (
            <Chip
              label={language}
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: 11, height: 24 }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ChannelCard;

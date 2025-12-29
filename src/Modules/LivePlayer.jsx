import { Box, Typography, Button } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import StreamPlayer from "../Atomic-Module-Componenets/Channels/StreamPlayer";

const LivePlayer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { streamlink, title } = location.state || {};

  return (
    <Box sx={{ background: "#000", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{title || "Player"}</Typography>
        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ color: "#fff", borderColor: "#fff" }}>
          Back
        </Button>
      </Box>

      {!streamlink ? (
        <Box sx={{ p: 3 }}>
          <Typography sx={{ color: "#ff9a9a" }}>No stream link provided.</Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, p: 2 }}>
          <Box sx={{ width: "100%", height: "75vh", borderRadius: 2, overflow: "hidden", border: "1px solid #222" }}>
            <StreamPlayer src={streamlink} />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default LivePlayer;
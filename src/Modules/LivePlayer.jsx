import { Box, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import StreamPlayer from "../Atomic-Module-Componenets/Channels/StreamPlayer";

const LivePlayer = () => {
  const location = useLocation();
  const { streamlink } = location.state || {};

  return (
    <Box sx={{ background: "#000", width: "100vw", height: "100vh", overflow: "hidden", position: "fixed", top: 0, left: 0 }}>
      {!streamlink ? (
        <Box sx={{ p: 3 }}>
          <Typography sx={{ color: "#ff9a9a" }}>No stream link provided.</Typography>
        </Box>
      ) : (
        <Box sx={{ width: "100%", height: "100%", overflow: "hidden" }}>
          <StreamPlayer src={streamlink} />
        </Box>
      )}
    </Box>
  );
};

export default LivePlayer;
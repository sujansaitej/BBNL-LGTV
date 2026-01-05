import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";

const BbnlVideo = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    
    const handleVideoEnd = () => {
      // Navigate to LoginOtp page after video ends
      navigate("/login");
    };

    if (videoElement) {
      videoElement.addEventListener("ended", handleVideoEnd);
      videoElement.play();
    }

    return () => {
      if (videoElement) {
        videoElement.removeEventListener("ended", handleVideoEnd);
      }
    };
  }, [navigate]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100vh",
        backgroundColor: "#000",
      }}
    >
      <video
        ref={videoRef}
        width="100%"
        height="100%"
        style={{
          objectFit: "contain",
          backgroundColor: "#000",
        }}
        autoPlay
        muted
      >
        <source src={require("../Asset/BBNL.mp4")} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </Box>
  );
};

export default BbnlVideo;

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import LockIcon from "@mui/icons-material/Lock";
import PropTypes from "prop-types";

const SubscriptionRequired = ({ 
  channel, 
  onSubscribe, 
  onGoBack,
  visible = true 
}) => {
  const navigate = useNavigate();

  if (!visible) return null;

  const handleSubscribe = () => {
    if (onSubscribe) {
      onSubscribe();
    } else {
      navigate("/home");
    }
  };

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.95)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 25,
        gap: "2rem",
      }}
    >
      <LockIcon sx={{ fontSize: "8rem", color: "#667eea", opacity: 0.9 }} />
      
      <Box sx={{ textAlign: "center", maxWidth: "600px", px: "2rem" }}>
        <Typography sx={{ 
          fontSize: "3rem", 
          fontWeight: 700,
          color: "#fff",
          mb: "1rem",
        }}>
          Subscription Required
        </Typography>
        
        <Typography sx={{ 
          fontSize: "1.5rem", 
          color: "rgba(255,255,255,0.8)",
          mb: "0.5rem",
        }}>
          {channel?.chtitle || "This channel"}
        </Typography>
        
        <Typography sx={{ 
          fontSize: "1.25rem", 
          color: "#667eea",
          fontWeight: 600,
          mb: "2rem",
        }}>
          Price: ${channel?.chprice || "N/A"}
        </Typography>
        
        <Typography sx={{ 
          fontSize: "1.125rem", 
          color: "rgba(255,255,255,0.7)",
          lineHeight: 1.6,
          mb: "3rem",
        }}>
          This is a premium channel. Please subscribe to watch this content.
        </Typography>
        
        <Box sx={{ display: "flex", gap: "1.5rem", justifyContent: "center" }}>
          <Button
            variant="contained"
            sx={{
              fontSize: "1.25rem",
              fontWeight: 600,
              px: "3rem",
              py: "1rem",
              borderRadius: "9999px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                transform: "scale(1.05)",
              },
              transition: "all 0.2s",
            }}
            onClick={handleSubscribe}
          >
            Subscribe Now
          </Button>
          
          <Button
            variant="outlined"
            sx={{
              fontSize: "1.25rem",
              fontWeight: 600,
              px: "3rem",
              py: "1rem",
              borderRadius: "9999px",
              borderColor: "rgba(255,255,255,0.3)",
              color: "#fff",
              "&:hover": {
                borderColor: "#fff",
                background: "rgba(255,255,255,0.1)",
              },
            }}
            onClick={handleGoBack}
          >
            Go Back
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

SubscriptionRequired.propTypes = {
  channel: PropTypes.shape({
    chtitle: PropTypes.string,
    chprice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  onSubscribe: PropTypes.func,
  onGoBack: PropTypes.func,
  visible: PropTypes.bool,
};

export default SubscriptionRequired;
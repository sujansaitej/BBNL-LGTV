import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, TextField, Button, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";

import { submitFeedback } from "../Api/modules-api/FeedBackApi";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../Api/config";

const Feedback = () => {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  // Get device info
  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || DEFAULT_USER.mobile;

  const handleSubmit = async () => {
    // Validation
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    if (!feedback.trim()) {
      setError("Please enter detailed feedback");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        userid: userid,
        mobile: mobile,
        rate_count: rating.toString(),
        feedback: feedback,
        mac_address: "26:F2:AE:D8:3F:99",
        device_name: "rk3368_box",
        device_type: "FOFI",
      };

      const response = await submitFeedback(payload, DEFAULT_HEADERS);

      if (response.status.err_code === 0) {
        setSuccessMessage(response.status.err_msg);
        // Clear form
        setRating(0);
        setFeedback("");
        // Hide message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("");
          navigate(-1);
        }, 3000);
      } else {
        setError(response.status.err_msg || "Failed to submit feedback");
      }
    } catch (err) {
      setError("Failed to submit feedback. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <Box
      sx={{
        background: "#000",
        minHeight: "100vh",
        color: "#fff",
        p: 5,
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        letterSpacing: "0.3px",
      }}
    >
      {/* Back Button */}
      <IconButton
        onClick={() => navigate(-1)}
        sx={{
          color: "#fff",
          mb: 4,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          padding: "12px",
          border: "2px solid rgba(255,255,255,0.4)",
          borderRadius: "10px",
          "&:hover": {
            background: "rgba(255,255,255,0.15)",
          },
        }}
      >
        <ArrowBackIcon sx={{ fontSize: 26 }} />
        <Typography sx={{ ml: 0.5, fontSize: 20, fontWeight: 600, letterSpacing: "0.3px" }}>Back</Typography>
      </IconButton>

      {/* Main Content */}
      <Box
        sx={{
          maxWidth: 880,
          mx: "auto",
          border: "2px solid rgba(255,255,255,0.3)",
          borderRadius: "24px",
          p: 6,
        }}
      >
        {/* Title */}
        <Typography sx={{ fontSize: 38, fontWeight: 700, mb: 1.5, lineHeight: 1.1, letterSpacing: "0.5px" }}>
          Give Feedback
        </Typography>
        <Typography sx={{ fontSize: 20, color: "#999", mb: 5, letterSpacing: "0.2px" }}>
          Help us improving viewer experience
        </Typography>

        {/* Submit Feedback Section */}
        <Box
          sx={{
            border: "2px solid rgba(255,255,255,0.3)",
            borderRadius: "18px",
            p: 4.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                border: "2px solid #fff",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ fontSize: 18 }}>📝</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.3px" }}>
                Submit Feedback
              </Typography>
              <Typography sx={{ fontSize: 18, color: "#999", letterSpacing: "0.2px" }}>
                Tell us about experience
              </Typography>
            </Box>
          </Box>

          {/* Star Rating */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: 19, mb: 1.5, color: "#fff", fontWeight: 600, letterSpacing: "0.2px" }}>
              How would you rate us?
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, mb: 1 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <IconButton
                  key={star}
                  onClick={() => setRating(star)}
                  sx={{
                    color: star <= rating ? "#ffd700" : "rgba(255,255,255,0.3)",
                    p: 0.5,
                  }}
                >
                  {star <= rating ? (
                    <StarIcon sx={{ fontSize: 42 }} />
                  ) : (
                    <StarBorderIcon sx={{ fontSize: 42 }} />
                  )}
                </IconButton>
              ))}
            </Box>
            <Typography sx={{ fontSize: 17, color: "#999", letterSpacing: "0.2px" }}>
              Tap a star to rate
            </Typography>
          </Box>

          {/* Detailed Feedback */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: 19, mb: 1.5, color: "#fff", fontWeight: 600, letterSpacing: "0.2px" }}>
              Detailed Feedback <span style={{ color: "red" }}>*</span>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={5}
              placeholder="What did you like? what can we do better?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#fff",
                  background: "#1a1a1a",
                  borderRadius: "12px",
                  fontSize: 18,
                  "& fieldset": {
                    borderColor: "rgba(255,255,255,0.3)",
                    borderWidth: "2px",
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(255,255,255,0.5)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#667eea",
                    borderWidth: "2px",
                  },
                },
                "& .MuiInputBase-input": {
                  fontSize: 18,
                  letterSpacing: "0.2px",
                },
              }}
            />
          </Box>

          {/* Error Message */}
          {error && (
            <Box
              sx={{
                mb: 3,
                p: 3,
                borderRadius: "12px",
                border: "2px solid red",
                background: "rgba(255,0,0,0.15)",
                color: "#ff6b6b",
              }}
            >
              <Typography sx={{ fontSize: 18, letterSpacing: "0.2px" }}>{error}</Typography>
            </Box>
          )}

          {/* Success Message */}
          {successMessage && (
            <Box
              sx={{
                mb: 3,
                p: 3,
                borderRadius: "12px",
                border: "2px solid #4caf50",
                background: "rgba(76,175,80,0.15)",
                color: "#4caf50",
                textAlign: "center",
              }}
            >
              <Typography sx={{ fontSize: 19, fontWeight: 600, letterSpacing: "0.2px" }}>✓ {successMessage}</Typography>
            </Box>
          )}

          {/* Buttons */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 3 }}>
            <Button
              onClick={handleCancel}
              disabled={loading}
              sx={{
                px: 5,
                py: 2,
                fontSize: 19,
                fontWeight: 600,
                color: "#fff",
                background: "#2a2a2a",
                borderRadius: "12px",
                textTransform: "none",
                letterSpacing: "0.3px",
                minHeight: 52,
                "&:hover": {
                  background: "#3a3a3a",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              sx={{
                px: 5,
                py: 2,
                fontSize: 19,
                fontWeight: 600,
                color: "#fff",
                background: "#0066ff",
                borderRadius: "12px",
                textTransform: "none",
                letterSpacing: "0.3px",
                minHeight: 52,
                "&:hover": {
                  background: "#0052cc",
                },
                "&:disabled": {
                  background: "#555",
                  color: "#999",
                },
              }}
            >
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Feedback;

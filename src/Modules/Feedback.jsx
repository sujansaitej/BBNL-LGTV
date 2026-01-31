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
        p: 3,
      }}
    >
      {/* Back Button */}
      <IconButton
        onClick={() => navigate(-1)}
        sx={{
          color: "#fff",
          mb: 3,
        }}
      >
        <ArrowBackIcon />
        <Typography sx={{ ml: 1, fontSize: 16 }}>Back</Typography>
      </IconButton>

      {/* Main Content */}
      <Box
        sx={{
          maxWidth: 720,
          mx: "auto",
          border: "2px solid rgba(255,255,255,0.2)",
          borderRadius: "20px",
          p: 4,
        }}
      >
        {/* Title */}
        <Typography sx={{ fontSize: 32, fontWeight: 700, mb: 1 }}>
          Give Feedback
        </Typography>
        <Typography sx={{ fontSize: 16, color: "#999", mb: 4 }}>
          Help us improving viewer experience
        </Typography>

        {/* Submit Feedback Section */}
        <Box
          sx={{
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "14px",
            p: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                border: "2px solid #fff",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ fontSize: 14 }}>📝</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                Submit Feedback
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#999" }}>
                Tell us about experience
              </Typography>
            </Box>
          </Box>

          {/* Star Rating */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 14, mb: 1, color: "#fff" }}>
              How would you rate us?
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
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
                    <StarIcon sx={{ fontSize: 32 }} />
                  ) : (
                    <StarBorderIcon sx={{ fontSize: 32 }} />
                  )}
                </IconButton>
              ))}
            </Box>
            <Typography sx={{ fontSize: 12, color: "#999" }}>
              Tap a star to rate
            </Typography>
          </Box>

          {/* Detailed Feedback */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 14, mb: 1, color: "#fff" }}>
              Detailed Feedback <span style={{ color: "red" }}>*</span>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="What did you like? what can we do better?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#fff",
                  background: "#1a1a1a",
                  borderRadius: "8px",
                  "& fieldset": {
                    borderColor: "rgba(255,255,255,0.2)",
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(255,255,255,0.4)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#667eea",
                  },
                },
              }}
            />
          </Box>

          {/* Error Message */}
          {error && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                border: "1px solid red",
                background: "rgba(255,0,0,0.1)",
                color: "#ff6b6b",
              }}
            >
              {error}
            </Box>
          )}

          {/* Success Message */}
          {successMessage && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                border: "1px solid #4caf50",
                background: "rgba(76,175,80,0.1)",
                color: "#4caf50",
                textAlign: "center",
              }}
            >
              ✓ {successMessage}
            </Box>
          )}

          {/* Buttons */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              onClick={handleCancel}
              disabled={loading}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: 16,
                color: "#fff",
                background: "#2a2a2a",
                borderRadius: "8px",
                textTransform: "none",
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
                px: 4,
                py: 1.5,
                fontSize: 16,
                color: "#fff",
                background: "#0066ff",
                borderRadius: "8px",
                textTransform: "none",
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

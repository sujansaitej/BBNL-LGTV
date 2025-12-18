import React, { useState, useEffect } from "react";
import { Box, Paper, Typography, Button, TextField, LinearProgress, Dialog } from "@mui/material";
import NetworkErrorNotification from "../Atomic-ErrorThrow-Componenets/NetworkError";
import axios from "axios";

const PhoneAuthApp = () => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [networkError, setNetworkError] = useState(false);

  // OTP Timer
  const [timer, setTimer] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (step === 2) {
      setTimer(30);
      setIsTimerRunning(true);
    }
  }, [step]);

  useEffect(() => {
    let interval;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    if (timer === 0) setIsTimerRunning(false);

    return () => clearInterval(interval);
  }, [timer, isTimerRunning]);

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      setPhone(value);
      setError("");
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 4) {
      setOtp(value);
      setError("");
    }
  };

  // Check if error is network-related
  const isNetworkError = (err) => {
    return (
      !navigator.onLine ||
      err.code === 'ERR_NETWORK' ||
      err.message === 'Network Error' ||
      err.code === 'ECONNABORTED' ||
      !err.response
    );
  };

  // Step 1: Validate phone and get OTP using /login API
  const handleGetOtp = async () => {
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setNetworkError(false);

    try {
      const response = await axios.post(
        "http://124.40.244.211/netmon/cabletvapis/login",
        {
          userid: "testiser1",
          mobile: phone,
          ip_address: "192.168.101.110",
          mac_address: "68:1D:EF:14:6C:21",
        },
        {
          headers: {
            "Content-Type": "application/json",
            devmac: "68:1D:EF:14:6C:21",
            Authorization: "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
            devslno: "FOFI20191129000336",
          },
          timeout: 10000, // 10 second timeout
        }
      );

      const data = response.data;

      if (data.status.err_code === 0) {
        setSuccess(data.status.err_msg || "OTP sent successfully");
        setStep(2);
      } else {
        setError(data.status.err_msg || "Failed to send OTP");
      }
    } catch (err) {
      if (isNetworkError(err)) {
        setNetworkError(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
      console.error("Login API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP using /loginOtp API
  const handleVerifyOtp = async () => {
    if (otp.length !== 4) {
      setError("Please enter the 4-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setNetworkError(false);

    try {
      const response = await axios.post(
        "http://124.40.244.211/netmon/cabletvapis/loginOtp",
        {
          userid: "testiser1",
          mobile: phone,
          ip_address: "192.168.101.110",
          mac_address: "68:1D:EF:14:6C:21",
          otpcode: otp,
        },
        {
          headers: {
            "Content-Type": "application/json",
            devmac: "68:1D:EF:14:6C:21",
            Authorization: "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
            devslno: "FOFI20191129000336",
          },
          timeout: 10000,
        }
      );

      const data = response.data;

      if (data.status.err_code === 0) {
        setSuccess("Authentication successful!");
        setError("");
        setTimeout(() => alert("Login successful!"), 500);
      } else {
        setError(data.status.err_msg || "Invalid OTP");
        setOtp("");
      }
    } catch (err) {
      if (isNetworkError(err)) {
        setNetworkError(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
      console.error("Verify OTP Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setNetworkError(false);
    setError("");
    setSuccess("");
  };

  const handleBack = () => {
    setStep(1);
    setOtp("");
    setError("");
    setSuccess("");
  };

  // Show network error screen if network error detected
  if (networkError) {
    return <NetworkErrorNotification onRetry={handleRetry} />;
  }

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        bgcolor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Paper
        elevation={10}
        sx={{
          bgcolor: "#111827",
          borderRadius: "24px",
          p: 5,
          width: "100%",
          maxWidth: "600px",
          border: "2px solid #1e40af",
        }}
      >
        <Typography
          variant="h3"
          align="center"
          color="#fff"
          mb={1}
          fontWeight="bold"
        >
          Welcome Back
        </Typography>

        <Typography align="center" color="#9ca3af" mb={5} fontSize="18px">
          {step === 1
            ? "Sign in to continue to your profile"
            : "Enter the OTP sent to your phone"}
        </Typography>

        {/* Progress Indicator */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 3,
            alignItems: "center",
            mb: 5,
          }}
        >
          {/* Step 1 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: step === 1 ? "#2563eb" : "#10b981",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {step === 1 ? "📱" : "✓"}
            </Box>
            <Typography color="#fff">Phone</Typography>
          </Box>

          {/* Divider with LinearProgress */}
          <Box sx={{ width: 120 }}>
            {step === 2 ? (
              <LinearProgress
                variant="determinate"
                value={(30 - timer) * (100 / 30)}
                sx={{ height: 6, borderRadius: 2, bgcolor: "#374151" }}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: 3,
                  borderRadius: 2,
                  bgcolor: "#374151",
                }}
              />
            )}
          </Box>

          {/* Step 2 */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              opacity: step === 1 ? 0.5 : 1,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: step === 2 ? "#2563eb" : "#374151",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✓
            </Box>
            <Typography color={step === 2 ? "#fff" : "#9ca3af"}>
              Verify
            </Typography>
          </Box>
        </Box>

        {/* ERROR */}
        {error && (
          <Box
            sx={{
              bgcolor: "#7f1d1d",
              p: 2,
              borderRadius: "12px",
              mb: 3,
              border: "1px solid #dc2626",
            }}
          >
            <Typography color="#fca5a5">⚠️ {error}</Typography>
          </Box>
        )}

        {/* SUCCESS */}
        {success && (
          <Box
            sx={{
              bgcolor: "#14532d",
              p: 2,
              borderRadius: "12px",
              mb: 3,
              border: "1px solid #16a34a",
            }}
          >
            <Typography color="#86efac">✓ {success}</Typography>
          </Box>
        )}

        {/* -------------------- PHONE STEP -------------------- */}
        {step === 1 ? (
          <>
            <Typography color="#fff" fontWeight={600} mb={1}>
              Phone Number
            </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Button
                variant="contained"
                sx={{
                  height: 60,
                  borderRadius: "30px",
                  px: 3,
                  bgcolor: "#1f2937",
                  color: "#fff",
                }}
              >
                +91▼
              </Button>

              <TextField
                fullWidth
                placeholder="Enter 10 Digit Number"
                value={phone}
                onChange={handlePhoneChange}
                InputProps={{
                  sx: {
                    bgcolor: "#1f2937",
                    borderRadius: "30px",
                    height: 60,
                    color: "#fff",
                    px: 2,
                    "& fieldset": { border: "none" },
                  },
                }}
              />
            </Box>

            <Typography align="right" color="#6b7280" mb={2}>
              {phone.length}/10
            </Typography>

            <Button
              fullWidth
              variant="contained"
              onClick={handleGetOtp}
              disabled={loading || phone.length !== 10}
              sx={{
                height: 60,
                borderRadius: "30px",
                bgcolor: phone.length === 10 ? "#2563eb" : "#374151",
                color: "#fff",
                "&:hover": {
                  bgcolor: phone.length === 10 ? "#1d4ed8" : "#374151",
                },
              }}
            >
              {loading ? "Sending..." : "Get OTP"}
            </Button>
          </>
        ) : (
          <>
            {/* -------------------- OTP STEP -------------------- */}
            <Typography color="#fff" fontWeight={600} mb={1}>
              Enter OTP
            </Typography>

            <TextField
              fullWidth
              placeholder="Enter 4 Digit OTP"
              value={otp}
              onChange={handleOtpChange}
              InputProps={{
                sx: {
                  bgcolor: "#1f2937",
                  borderRadius: "30px",
                  height: 60,
                  color: "#fff",
                  textAlign: "center",
                  fontSize: "24px",
                  letterSpacing: "8px",
                  "& fieldset": { border: "none" },
                  "& input": { textAlign: "center" },
                },
              }}
              sx={{ mb: 2 }}
            />

            <Typography align="right" fontSize="14px" color="#6b7280" mb={2}>
              {isTimerRunning
                ? `Resend OTP in ${timer}s`
                : "Didn't receive OTP?"}
            </Typography>

            {!isTimerRunning && (
              <Button
                fullWidth
                variant="outlined"
                onClick={handleGetOtp}
                sx={{
                  mb: 2,
                  height: 50,
                  borderRadius: "30px",
                  borderColor: "#2563eb",
                  color: "#2563eb",
                  "&:hover": {
                    borderColor: "#1d4ed8",
                    bgcolor: "rgba(37, 99, 235, 0.1)",
                  },
                }}
              >
                Resend OTP
              </Button>
            )}

            <Button
              fullWidth
              variant="contained"
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 4}
              sx={{
                height: 60,
                borderRadius: "30px",
                bgcolor: otp.length === 4 ? "#2563eb" : "#374151",
                color: "#fff",
                "&:hover": {
                  bgcolor: otp.length === 4 ? "#1d4ed8" : "#374151",
                },
              }}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={handleBack}
              sx={{ mt: 2, color: "#9ca3af", "&:hover": { color: "#fff" } }}
            >
              ← Back to Phone Number
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default PhoneAuthApp;

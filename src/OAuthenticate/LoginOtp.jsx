import { useState, useEffect } from "react";
import {  Box,  Paper, Typography, Button, TextField,} from "@mui/material";
import { useNavigate } from "react-router-dom";
import NetworkErrorNotification from "../Atomic-ErrorThrow-Componenets/NetworkError";
import { sendOtp, verifyOtp, resendOtp } from "../Api/OAuthentication-Api/LoginOtpApi";
import { useInputFocusHandler } from "../Atomic-Common-Componenets/useRemoteNavigation";
import SearchTextField from "../Atomic-Reusable-Componenets/Search";
import { useDeviceInformation } from "../Api/Deviceinformaction/LG-Devicesinformaction";

const PhoneAuthApp = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [networkError, setNetworkError] = useState(false);
  
  const [timer, setTimer] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Fetch device information (IP address and Device ID)
  const deviceInfo = useDeviceInformation();

  // Prevent scrolling issues with input focus on webOS TV
  useInputFocusHandler();

  /* ---------------- TIMERS ---------------- */
  useEffect(() => {
    if (step === 2) {
      setTimer(60);
      setIsTimerRunning(true);
    }
  }, [step]);

  useEffect(() => {
    let interval;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    if (timer === 0) setIsTimerRunning(false);
    return () => clearInterval(interval);
  }, [timer, isTimerRunning]);

  /* ---------------- INPUT HANDLERS ---------------- */
  const handlePhoneChange = (e) => {
    const v = e.target.value.replace(/\D/g, "");
    if (v.length <= 10) {
      setPhone(v);
      setError("");
    }
  };

  const handlePhoneKeyDown = (e) => {
    if (e.key === "Enter" && phone.length === 10 && !loading) {
      handleGetOtp();
    }
  };

  const handleOtpChange = (e) => {
    const v = e.target.value.replace(/\D/g, "");
    if (v.length <= 4) {
      setOtp(v);
      setError("");
      // Auto-submit when 4 digits entered
      if (v.length === 4) {
        setTimeout(() => handleVerifyOtp(), 300);
      }
    }
  };

  const handleOtpKeyDown = (e) => {
    if (e.key === "Enter" && otp.length === 4 && !loading) {
      handleVerifyOtp();
    }
    // Allow backspace
    if (e.key === "Backspace" && otp.length === 0) {
      setError("");
    }
  };

  /* ---------------- HELPERS ---------------- */
  const isNetworkError = (err) =>
    !navigator.onLine ||
    err.code === "ERR_NETWORK" ||
    err.message === "Network Error" ||
    !err.response;

  /* ---------------- API CALLS ---------------- */
  const handleGetOtp = async () => {
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    setError("");
    setNetworkError(false);

    try {
      const result = await sendOtp(phone);

      if (result.success) {
        if (result.userId) {
          localStorage.setItem("userId", result.userId);
        }
        setSuccess(result.message);
        setTimeout(() => {
          setStep(2);
          setSuccess("");
        }, 500);
      } else {
        // If server indicates user is already registered on another device, treat as success and proceed
        if (result.message && result.message.includes("User ID already registered")) {
          localStorage.setItem("userId", "testiser1");
          localStorage.setItem("userPhone", phone);
          setSuccess("Logged in (existing registration)");
          setTimeout(() => {
            onLoginSuccess?.();
            navigate("/home");
          }, 300);
          return;
        }

        setError(result.message);
      }
    } catch (e) {
      console.error("OTP Send Error:", e);
      if (isNetworkError(e)) {
        setNetworkError(true);
      } else {
        const errMsg = e.response?.data?.status?.err_msg || "Failed to send OTP. Please try again.";
        if (errMsg && errMsg.includes("User ID already registered")) {
          localStorage.setItem("userId", "testiser1");
          localStorage.setItem("userPhone", phone);
          onLoginSuccess?.();
          navigate("/home");
          return;
        }
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) return setError("Enter 4 digit OTP");

    setLoading(true);
    setError("");

    try {
      const result = await verifyOtp(phone, otp);

      if (result.success) {
        setSuccess(`Login successful!`);
        localStorage.setItem("userId", "testiser1");
        localStorage.setItem("userPhone", phone);
        console.log("Login successful - navigating to home");
        setTimeout(() => {
          onLoginSuccess?.();
          navigate("/home");
        }, 1000);
      } else {
        // Auto-navigate if server reports existing registration
        if (result.message && result.message.includes("User ID already registered")) {
          localStorage.setItem("userId", "testiser1");
          localStorage.setItem("userPhone", phone);
          setSuccess("Logged in (existing registration)");
          setTimeout(() => {
            onLoginSuccess?.();
            navigate("/home");
          }, 300);
          return;
        }

        setError(result.message);
        setOtp("");
      }
    } catch (e) {
      console.error("OTP Verification Error Details:", {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
        headers: e.response?.headers,
      });
      
      if (isNetworkError(e)) {
        setNetworkError(true);
      } else {
        const errorMsg = e.response?.data?.status?.err_msg || e.message || "Invalid OTP. Please try again.";
        if (errorMsg && errorMsg.includes("User ID already registered")) {
          localStorage.setItem("userId", "testiser1");
          localStorage.setItem("userPhone", phone);
          onLoginSuccess?.();
          navigate("/home");
          return;
        }
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await resendOtp(phone);

      if (result.success) {
        setSuccess(result.message);
        setTimer(60);
        setIsTimerRunning(true);
        setOtp("");
      } else {
        setError(result.message);
      }
    } catch (e) {
      isNetworkError(e) ? setNetworkError(true) : setError("Try again");
    } finally {
      setLoading(false);
    }
  };

  if (networkError) {
    return <NetworkErrorNotification onRetry={() => setNetworkError(false)} />;
  }

  /* ======================= UI ======================= */
  return (
    <div>
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        bgcolor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        position: "relative",
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: "100%",
          maxWidth: { xs: 420, sm: 480, md: 520 },
          minHeight: 480,
          p: { xs: 4, md: 6 },
          borderRadius: "24px",
          bgcolor: "#0A0E1A",
          background: "linear-gradient(135deg, #0A0E1A 0%, #141B2D 100%)",
          border: "1px solid rgba(59, 130, 246, 0.1)",
          boxShadow: "0 25px 80px -15px rgba(0,0,0,0.8), 0 0 60px -10px rgba(59, 130, 246, 0.05)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)",
          },
        }}
      >
        {/* Title */}
        <Typography 
          align="center" 
          sx={{
            fontSize: { xs: 26, md: 32 },
            fontWeight: 700,
            color: "#fff",
            mb: 1.5,
            letterSpacing: "-0.02em",
          }}
        >
          {step === 1 ? "Welcome Back" : "Enter Verification Code"}
        </Typography>

        {/* Subtitle */}
        <Typography 
          align="center" 
          sx={{
            color: "#94A3B8",
            fontSize: { xs: 13, md: 15 },
            mb: 5,
            fontWeight: 400,
          }}
        >
          {step === 1
            ? "Sign in to continue to your profile"
            : `We've sent a 4-digit code to your Email/Mobile Number`}
        </Typography>

        {/* Step Indicator */}
        <Box 
          sx={{ 
            display: "flex", 
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            mb: 5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "#2563EB",
              }}
            />
            <Typography sx={{ color: "#2563EB", fontSize: 14, fontWeight: 600 }}>
              Phone
            </Typography>
          </Box>

          <Box 
            sx={{ 
              width: 80, 
              height: 2, 
              bgcolor: step === 2 ? "#2563EB" : "#1E293B",
              borderRadius: 1,
              transition: "all 0.3s ease",
            }} 
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: step === 2 ? "#2563EB" : "#1E293B",
                transition: "all 0.3s ease",
              }}
            />
            <Typography 
              sx={{ 
                color: step === 2 ? "#2563EB" : "#475569",
                fontSize: 14,
                fontWeight: 600,
                transition: "all 0.3s ease",
              }}
            >
              Verify
            </Typography>
          </Box>
        </Box>

        {/* Error Message */}
        {error && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: "12px",
              bgcolor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <Typography sx={{ color: "#F87171", fontSize: 14, textAlign: "center" }}>
              ⚠ {error}
            </Typography>
          </Box>
        )}

        {/* Success Message */}
        {success && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: "12px",
              bgcolor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            <Typography sx={{ color: "#4ADE80", fontSize: 14, textAlign: "center" }}>
              ✓ {success}
            </Typography>
          </Box>
        )}

        {/* ---------------- PHONE INPUT SCREEN ---------------- */}
        {step === 1 && (
          <Box>
            <Typography 
              sx={{ 
                color: "#E2E8F0",
                fontSize: 14,
                fontWeight: 500,
                mb: 1.5,
              }}
            >
              Phone Number
            </Typography>

            <Box 
              sx={{ 
                display: "flex", 
                gap: 2,
                mb: 4,
              }}
            >
              <Box
                sx={{
                  width: 90,
                  height: 56,
                  bgcolor: "#0F172A",
                  border: "1px solid #1E293B",
                  borderRadius: "14px",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                +91
              </Box>

              <SearchTextField
                value={phone}
                onChange={handlePhoneChange}
                onKeyDown={handlePhoneKeyDown}
                placeholder="Enter 10 Digit Number"
              />
            </Box>

            <Button
              fullWidth
              onClick={handleGetOtp}
              disabled={phone.length !== 10 || loading}
              sx={{
                height: 56,
                borderRadius: "14px",
                bgcolor: phone.length === 10 ? "#2563EB" : "#1E293B",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                textTransform: "none",
                transition: "all 0.3s ease",
                "&:hover": {
                  bgcolor: phone.length === 10 ? "#1D4ED8" : "#1E293B",
                  transform: phone.length === 10 ? "translateY(-2px)" : "none",
                  boxShadow: phone.length === 10 ? "0 10px 30px -5px rgba(37, 99, 235, 0.4)" : "none",
                },
                "&:disabled": {
                  bgcolor: "#1E293B",
                  color: "#475569",
                },
              }}
            >
              {loading ? "Sending..." : "Get OTP"}
            </Button>
          </Box>
        )}

        {/* ---------------- OTP INPUT SCREEN WITH UNDERSCORES ---------------- */}
        {step === 2 && (
          <Box>
            {/* OTP Display with Underscores */}
            <Box
              onClick={() => document.getElementById("otp-hidden-input")?.focus()}
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: { xs: 2, md: 3 },
                mb: 5,
                px: 2,
                cursor: "text",
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: { xs: 40, md: 50 },
                    height: { xs: 56, md: 64 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: 32, md: 40 },
                      fontWeight: 700,
                      color: otp[i] ? "#fff" : "#1E293B",
                      fontFamily: "monospace",
                      lineHeight: 1,
                    }}
                  >
                    {otp[i] || "·"}
                  </Typography>
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      bgcolor: otp[i] ? "#2563EB" : "#1E293B",
                      borderRadius: "2px",
                      transition: "all 0.2s ease",
                    }}
                  />
                </Box>
              ))}
            </Box>

            {/* Hidden Input for OTP - MAKE IT FOCUSABLE */}
            <TextField
              id="otp-hidden-input"
              autoFocus
              value={otp}
              onChange={handleOtpChange}
              onKeyDown={handleOtpKeyDown}
              type="tel"
              inputProps={{ 
                maxLength: 4,
                inputMode: "numeric",
                pattern: "[0-9]*",
                autoComplete: "one-time-code",
                "data-webos-input": "true",
              }}
              sx={{ 
                position: "absolute",
                left: "-9999px",
                width: "1px",
                height: "1px",
              }}
            />

            {/* Verify Button */}
            <Button
              fullWidth
              onClick={handleVerifyOtp}
              disabled={otp.length !== 4 || loading}
              sx={{
                height: 56,
                borderRadius: "14px",
                bgcolor: otp.length === 4 ? "#2563EB" : "#1E293B",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                textTransform: "none",
                mb: 3,
                transition: "all 0.3s ease",
                "&:hover": {
                  bgcolor: otp.length === 4 ? "#1D4ED8" : "#1E293B",
                  transform: otp.length === 4 ? "translateY(-2px)" : "none",
                  boxShadow: otp.length === 4 ? "0 10px 30px -5px rgba(37, 99, 235, 0.4)" : "none",
                },
                "&:disabled": {
                  bgcolor: "#1E293B",
                  color: "#475569",
                },
              }}
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>

            {/* Resend Code Section */}
            <Box sx={{ textAlign: "center" }}>
              {isTimerRunning ? (
                <Typography sx={{ color: "#64748B", fontSize: 14 }}>
                  Didn't receive the code? <strong>Resend Code</strong> in{" "}
                  <span style={{ color: "#2563EB", fontWeight: 600 }}>
                    00:{timer < 10 ? `0${timer}` : timer}
                  </span>
                </Typography>
              ) : (
                <>
                  <Typography sx={{ color: "#64748B", fontSize: 14, mb: 2 }}>
                    Didn't receive the code?
                  </Typography>
                  <Button
                    fullWidth
                    onClick={handleResendOtp}
                    disabled={loading}
                    sx={{
                      height: 48,
                      borderRadius: "12px",
                      border: "1px solid #2563EB",
                      color: "#2563EB",
                      fontSize: 15,
                      fontWeight: 600,
                      textTransform: "none",
                      bgcolor: "transparent",
                      "&:hover": {
                        bgcolor: "rgba(37, 99, 235, 0.05)",
                        border: "1px solid #1D4ED8",
                      },
                    }}
                  >
                    Resend Code
                  </Button>
                </>
              )}
            </Box>

            {/* Back Button */}
            <Button
              fullWidth
              onClick={() => {
                setStep(1);
                setOtp("");
                setError("");
                setSuccess("");
              }}
              sx={{
                mt: 2,
                color: "#64748B",
                fontSize: 14,
                fontWeight: 500,
                textTransform: "none",
                "&:hover": {
                  color: "#94A3B8",
                  bgcolor: "transparent",
                },
              }}
            >
              ← Back to Phone Number
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
    
    {/* Device Information Display */}
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        bgcolor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: 2,
        borderRadius: 2,
        fontSize: 12,
        maxWidth: 350,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
        Device Information
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
        IP Address: {deviceInfo.loading ? 'Loading...' : deviceInfo.ipAddress}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
        Device ID: {deviceInfo.loading ? 'Loading...' : deviceInfo.deviceId}
      </Typography>
      {deviceInfo.error && (
        <Typography variant="caption" sx={{ display: 'block', color: '#ff6b6b', mt: 1 }}>
          Error: {deviceInfo.error}
        </Typography>
      )}
    </Box>
    </div>
  );
};

export default PhoneAuthApp;

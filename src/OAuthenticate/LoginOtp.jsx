import { useState, useEffect } from "react";
import {  Box,  Paper, Typography, Button, TextField, CircularProgress} from "@mui/material";
import { useNavigate } from "react-router-dom";
import NetworkErrorNotification from "../Atomic-ErrorThrow-Componenets/NetworkError";
import useAuthStore from "../Global-storage/AuthStore";
import SearchTextField from "../Atomic-Reusable-Componenets/Search";
import { useDeviceInformation } from "../Api/Deviceinformaction/LG-Devicesinformaction";
import { DEFAULT_USER } from "../Api/config";
import loginBg from "../Asset/loginBg.jpg";
import bbnlLogo from "../Asset/BBNL-Logo.png";

const PhoneAuthApp = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState(""); // OTP from /login response
  const [loading, setLoading] = useState(false);
  const { sendOtp, resendOtp } = useAuthStore();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [networkError, setNetworkError] = useState(false);
  
  const [timer, setTimer] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Fetch device information (IP address and Device ID)
  const deviceInfo = useDeviceInformation();

  // Preload background image to prevent slow render flash
  const [bgLoaded, setBgLoaded] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.src = loginBg;
    img.onload = () => setBgLoaded(true);
    img.onerror = () => setBgLoaded(true); // show fallback on error too
  }, []);

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
      setError("Please enter a valid 10-digit Mobile number");
      return;
    }

    setLoading(true);
    setError("");
    setNetworkError(false);

    try {
      const result = await sendOtp(phone, {
        ip_address: deviceInfo.privateIPv4 || deviceInfo.publicIPv4 || "",
        device_name: "LG TV",
        device_type: "LG TV",
        devdets: {
          brand: "LG",
          model: deviceInfo.modelName || "",
          mac: "",
        },
      });

      if (result.success) {
        const responseUserId = result.data?.body?.[0]?.userid;
        localStorage.setItem("userId", responseUserId || "");
        localStorage.setItem("userPhone", phone);
        // Store OTP returned by /login for local validation — no further API call needed
        setServerOtp(String(result.otp || ""));
        setSuccess(result.message);
        setTimeout(() => {
          setStep(2);
          setSuccess("");
        }, 500);
      } else {
        setError(result.message || "Failed to send OTP. Please try again.");
      }
    } catch (e) {
      console.error("OTP Send Error:", e);
      if (isNetworkError(e)) {
        setNetworkError(true);
      } else {
        setError(e.response?.data?.status?.err_msg || "Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // OTP validated locally — /loginOtp is ONLY called by Resend, never here
  const handleVerifyOtp = () => {
    if (otp.length !== 4) return setError("Enter 4 digit OTP");

    setError("");

    if (serverOtp && otp === serverOtp) {
      setSuccess("Login successful!");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess?.();
        navigate("/home");
      }, 1000);
    } else {
      setError("Invalid OTP. Please try again.");
      setOtp("");
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await resendOtp(phone, {
        ip_address: deviceInfo.privateIPv4 || deviceInfo.publicIPv4 || "",
        device_name: "LG TV",
        device_type: "LG TV",
        devdets: {
          brand: "LG",
          model: deviceInfo.modelName || "",
          mac: "",
        },
      });

      if (result.success) {
        // Update serverOtp with the newly issued OTP from /loginOtp
        setServerOtp(String(result.otp || ""));
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
        // bgcolor: "#0a0f1e",
        backgroundImage: bgLoaded ? `url(${loginBg})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: bgLoaded ? 1 : 1,
        transition: "background-image 0.4s ease-in-out",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        position: "relative",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: { xs: 520, sm: 600, md: 680, lg: 1200 },
          minHeight: 520,
          p: { xs: 5, md: 7, lg: 22.25 },
          borderRadius: "16px",
          background: "rgba(255, 255, 255, 0.2)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
          backdropFilter: "blur(0px)",
          WebkitBackdropFilter: "blur(0px)",
          position: "relative",
          overflow: "hidden",
          "@media (min-width: 900px)": {
            maxWidth: "1200px",
            padding: "178px",
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 5 }}>
          <Box
            component="img"
            src={bbnlLogo}
            alt="BBNL Logo"
            sx={{
              height: { xs: "6rem", md: "8rem" },
              width: "auto",
              objectFit: "contain",
            }}
          />
        </Box>

        {/* Error Message */}
        {error && (
          <Box
            sx={{
              mb: 3,
              p: 2.25,
              borderRadius: "12px",
              bgcolor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <Typography sx={{ color: "#FCA5A5", fontSize: 32, textAlign: "center", fontWeight: 700 }}>
              ⚠ {error}
            </Typography>
          </Box>
        )}

        {/* Success Message */}
        {success && (
          <Box
            sx={{
              mb: 3,
              p: 2.25,
              borderRadius: "12px",
              bgcolor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            <Typography sx={{ color: "#86EFAC", fontSize: 32, textAlign: "center", fontWeight: 700 }}>
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
                fontSize: 32,
                fontWeight: 700,
                mb: 2,
              }}
            >
              Mobile Number
            </Typography>

            <Box 
              sx={{ 
                display: "flex", 
                gap: 2,
                mb: 4.5,
              }}
            >
              <SearchTextField
                value={phone}
                onChange={handlePhoneChange}
                onKeyDown={handlePhoneKeyDown}
                placeholder="Enter the Registered Number"
              />
            </Box>

            <Button
              fullWidth
              onClick={handleGetOtp}
              disabled={phone.length !== 10 || loading}
              sx={{
                height: 60,
                borderRadius: "14px",
                bgcolor: phone.length === 10 ? "#2563EB" : "#1E293B",
                color: "#fff",
                fontSize: 32,
                fontWeight: 700,
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

            {/* Device Information Section */}
            <Box
              sx={{
                mt: 4,
                p: 3,
                borderRadius: "14px",
                bgcolor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid #1E293B",
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 20, color: "#64748B", fontWeight: 700, mb: 0.5 }}>
                    DEVICE ID
                  </Typography>
                  <Typography sx={{ fontSize: 32, color: "#E2E8F0", fontWeight: 700 }}>
                    {deviceInfo.loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (deviceInfo.deviceId || "STR-9872-7BED")}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: 20, color: "#64748B", fontWeight: 700, mb: 0.5 }}>
                    GATEWAY IP
                  </Typography>
                  <Typography sx={{ fontSize: 32, color: "#E2E8F0", fontWeight: 700 }}>
                    {deviceInfo.loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (deviceInfo.privateIPv4 || deviceInfo.publicIPv4 || "Not available")}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: 20, color: "#64748B", fontWeight: 700, mb: 0.5 }}>
                    TV MODEL NAME
                  </Typography>
                  <Typography sx={{ fontSize: 32, color: "#E2E8F0", fontWeight: 700 }}>
                    {deviceInfo.loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (deviceInfo.modelName || "Not available")}
                  </Typography>
                </Box>
              </Box>
            </Box>
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
                gap: { xs: 2.5, md: 3.5 },
                mb: 5.5,
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
                height: 60,
                borderRadius: "14px",
                bgcolor: otp.length === 4 ? "#2563EB" : "#1E293B",
                color: "#fff",
                fontSize: 32,
                fontWeight: 700,
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

            {/* Device Information Section */}
            <Box
              sx={{
                mb: 3,
                p: 3,
                borderRadius: "14px",
                bgcolor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid #1E293B",
              }}
            >
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 20, color: "#64748B", fontWeight: 700, mb: 0.5 }}>
                    GATEWAY IP
                  </Typography>
                  <Typography sx={{ fontSize: 32, color: "#E2E8F0", fontWeight: 700 }}>
                    {deviceInfo.loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (deviceInfo.privateIPv4 || deviceInfo.publicIPv4 || "Not available")}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: 20, color: "#64748B", fontWeight: 700, mb: 0.5 }}>
                    TV MODEL NAME
                  </Typography>
                  <Typography sx={{ fontSize: 32, color: "#E2E8F0", fontWeight: 700 }}>
                    {deviceInfo.loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (deviceInfo.modelName || "Not available")}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: 20, color: "#64748B", fontWeight: 700, mb: 0.5 }}>
                    IPV6
                  </Typography>
                  <Typography sx={{ fontSize: 32, color: "#E2E8F0", fontWeight: 700 }}>
                    {deviceInfo.loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (deviceInfo.privateIPv6 || deviceInfo.publicIPv6 || "Not available")}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Resend Code Section */}
            <Box sx={{ textAlign: "center" }}>
              {isTimerRunning ? (
                <Typography sx={{ color: "#94A3B8", fontSize: 32, fontWeight: 700 }}>
                  Didn't receive the code? <strong>Resend Code</strong> in{" "}
                  <span style={{ color: "#2563EB", fontWeight: 700 }}>
                    00:{timer < 10 ? `0${timer}` : timer}
                  </span>
                </Typography>
              ) : (
                <>
                  <Typography sx={{ color: "#94A3B8", fontSize: 32, mb: 2, fontWeight: 700 }}>
                    Didn't receive the code?
                  </Typography>
                  <Button
                    fullWidth
                    onClick={handleResendOtp}
                    disabled={loading}
                    sx={{
                      height: 52,
                      borderRadius: "12px",
                      border: "1px solid #2563EB",
                      color: "#2563EB",
                      fontSize: 32,
                      fontWeight: 700,
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
                fontSize: 32,
                fontWeight: 700,
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
    </div>
  );
};

export default PhoneAuthApp;

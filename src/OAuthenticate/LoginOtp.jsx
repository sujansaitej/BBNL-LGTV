import  { useState, useEffect } from "react";
import { Box, Paper, Typography, Button, TextField, LinearProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import NetworkErrorNotification from "../Atomic-ErrorThrow-Componenets/NetworkError";
import axios from "axios";
import { fetchDeviceInfo } from "../Api/utils/deviceInfo";

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

  const [deviceInfo, setDeviceInfo] = useState({
    isWebOS: false,
    ipAddress: null,
    macAddress: null,
    deviceId: null,
  });

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

  useEffect(() => {
    let cancelled = false;

    const loadDevice = async () => {
      try {
        const info = await fetchDeviceInfo();
        if (!cancelled && info) {
          setDeviceInfo(info);
        }
      } catch (err) {
        console.warn("Device info fetch failed", err);
      }
    };

    loadDevice();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleOtpInputChange = (index, value) => {
    const digit = value.replace(/\D/g, "");
    if (digit.length > 1) return;
    
    const otpArray = otp.split("");
    otpArray[index] = digit;
    const newOtp = otpArray.join("");
    setOtp(newOtp);
    setError("");
    
    // Auto-focus next input
    if (digit && index < 3) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const isNetworkError = (err) => {
    return (
      !navigator.onLine ||
      err.code === 'ERR_NETWORK' ||
      err.message === 'Network Error' ||
      err.code === 'ECONNABORTED' ||
      !err.response
    );
  };

  const buildDevicePayload = () => {
    const meta = {};
    if (deviceInfo?.ipAddress) meta.ip_address = deviceInfo.ipAddress;
    if (deviceInfo?.macAddress) meta.mac_address = deviceInfo.macAddress;
    if (deviceInfo?.deviceId) meta.device_id = deviceInfo.deviceId;
    return meta;
  };

  const buildDeviceHeaders = () => {
    const meta = {};
    if (deviceInfo?.macAddress) meta.devmac = deviceInfo.macAddress;
    if (deviceInfo?.deviceId) meta.devid = deviceInfo.deviceId;
    return meta;
  };

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
      const payload = {
        userid: "testiser1",
        mobile: phone,
        ...buildDevicePayload(),
      };

      const headers = {
        "Content-Type": "application/json",
        Authorization: "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
        devslno: "FOFI20191129000336",
        ...buildDeviceHeaders(),
      };

      const response = await axios.post(
        "http://124.40.244.211/netmon/cabletvapis/login",
        payload,
        {
          headers,
          timeout: 10000,
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
      const payload = {
        userid: "testiser1",
        mobile: phone,
        otpcode: otp,
        ...buildDevicePayload(),
      };

      const headers = {
        "Content-Type": "application/json",
        Authorization: "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
        devslno: "FOFI20191129000336",
        ...buildDeviceHeaders(),
      };

      const response = await axios.post(
        "http://124.40.244.211/netmon/cabletvapis/loginOtp",
        payload,
        {
          headers,
          timeout: 10000,
        }
      );

      const data = response.data;

      if (data.status.err_code === 0) {
        setSuccess("Authentication successful!");
        localStorage.setItem('userPhone', phone);
        localStorage.setItem('userId', data.userid || 'testiser1');
        
        if (onLoginSuccess) {
          onLoginSuccess();  // This updates App.js authentication state
        }
        
        setTimeout(() => {
          navigate('/home');  // Navigate to home after successful OTP
        }, 500);
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
    }}
  >
    <Paper
      elevation={12}
      sx={{
        background: "#0C0F18",
        borderRadius: "24px",
        border: "1px solid rgba(255,255,255,0.08)",
        width: "38vw",
        minWidth: "520px",
        maxWidth: "720px",
        padding: "40px 48px",
        textAlign: "center",
      }}
    >
      {/* Title */}
      <Typography
        sx={{
          color: "#fff",
          fontWeight: 700,
          fontSize: "clamp(20px, 1.8vw, 32px)",
          mb: 1,
        }}
      >
        {step === 1 ? "Welcome Back" : "Enter Verification Code"}
      </Typography>

      {/* Subtitle */}
      <Typography
        sx={{
          color: "#9CA3AF",
          fontSize: "clamp(12px, 1vw, 16px)",
          mb: 5,
        }}
      >
        {step === 1
          ? "Sign in to continue to your profile"
          : "We’ve sent a verification code"}
      </Typography>

      {/* Steps Indicator */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
        <Typography sx={{ color: "#fff", mr: 2 }}>Phone</Typography>
        <Typography sx={{ color: "#6b7280" }}>────</Typography>
        <Typography
          sx={{
            color: step === 2 ? "#3B82F6" : "#6b7280",
            ml: 2,
          }}
        >
          Verify
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Typography
          sx={{
            color: "#f87171",
            mb: 2,
            fontSize: "14px",
          }}
        >
          ⚠ {error}
        </Typography>
      )}

      {/* Success */}
      {success && (
        <Typography
          sx={{
            color: "#4ADE80",
            mb: 2,
            fontSize: "14px",
          }}
        >
          ✓ {success}
        </Typography>
      )}

      {/* PHONE STEP */}
      {step === 1 && (
        <>
          <Typography
            align="left"
            sx={{ color: "#fff", fontSize: "15px", mb: 1 }}
          >
            Phone Number
          </Typography>

          <Box
            sx={{
              background: "#111827",
              display: "flex",
              alignItems: "center",
              borderRadius: "30px",
              border: "1px solid #1F2A44",
              padding: "4px 10px",
            }}
          >
            <Button
              sx={{
                background: "#111827",
                color: "#fff",
                borderRadius: "30px",
                px: 2,
              }}
            >
              +91
            </Button>

            <TextField
              fullWidth
              placeholder="Enter 10 Digit Number"
              value={phone}
              onChange={handlePhoneChange}
              InputProps={{
                sx: {
                  color: "#fff",
                  "& fieldset": { border: "none" },
                },
              }}
            />
          </Box>

          <Button
            fullWidth
            onClick={handleGetOtp}
            disabled={phone.length !== 10 || loading}
            sx={{
              mt: 4,
              height: 55,
              borderRadius: "30px",
              bgcolor: phone.length === 10 ? "#2563EB" : "#1F2937",
              color: "#fff",
              fontWeight: 600,
              "&:hover": {
                bgcolor: phone.length === 10 ? "#1D4ED8" : "#1F2937",
              },
            }}
          >
            {loading ? "Sending..." : "Get OTP"}
          </Button>
        </>
      )}

      {/* OTP STEP */}
      {step === 2 && (
        <>
          <Typography
            align="left"
            sx={{ color: "#fff", fontSize: "15px", mb: 3 }}
          >
            Enter OTP
          </Typography>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 2,
              mb: 3,
            }}
          >
            {[0, 1, 2, 3].map((index) => (
              <TextField
                key={index}
                id={`otp-${index}`}
                value={otp[index] || ""}
                onChange={(e) => handleOtpInputChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                inputProps={{
                  maxLength: 1,
                  style: { textAlign: "center" },
                }}
                sx={{
                  width: "60px",
                  "& .MuiInputBase-root": {
                    color: "#fff",
                    fontSize: "32px",
                    fontWeight: 600,
                    height: "70px",
                  },
                  "& .MuiInput-underline:before": {
                    borderBottom: "2px solid #374151",
                  },
                  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                    borderBottom: "2px solid #4B5563",
                  },
                  "& .MuiInput-underline:after": {
                    borderBottom: "2px solid #3B82F6",
                  },
                }}
                variant="standard"
              />
            ))}
          </Box>

          <Typography sx={{ color: "#9CA3AF", mt: 2, mb: 2 }}>
            {isTimerRunning
              ? `Resend Code in 00:${timer < 10 ? `0${timer}` : timer}`
              : "Didn't receive OTP?"}
          </Typography>

          {!isTimerRunning && (
            <Button
              fullWidth
              onClick={handleGetOtp}
              sx={{
                borderRadius: "30px",
                mb: 2,
                border: "1px solid #2563EB",
                color: "#2563EB",
              }}
            >
              Resend Code
            </Button>
          )}

          <Button
            fullWidth
            onClick={handleVerifyOtp}
            disabled={otp.length !== 4 || loading}
            sx={{
              height: 55,
              borderRadius: "30px",
              bgcolor: otp.length === 4 ? "#2563EB" : "#1F2937",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>

          <Button
            fullWidth
            onClick={handleBack}
            sx={{
              mt: 2,
              color: "#9CA3AF",
              "&:hover": { color: "#fff" },
            }}
          >
            ← Back
          </Button>
        </>
      )}
    </Paper>
  </Box>

  );
};

export default PhoneAuthApp;
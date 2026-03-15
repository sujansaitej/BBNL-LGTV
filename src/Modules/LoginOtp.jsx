import { useState, useEffect } from "react";
import {  Box,  Paper, Typography, Button, TextField, CircularProgress} from "@mui/material";
import { useNavigate } from "react-router-dom";
import NetworkErrorNotification from "../error/Modules-Erros/NetworkError";
import RegisterNumber from "../error/RegisterNumber";
import ValidOTP from "../error/ValidOTP";
import useAuthStore from "../store/AuthStore";
import { useDeviceInformation } from "../server/Deviceinformaction/LG-Devicesinformaction";
import fetchLoginLogo from "../server/OAuthentication-Api/LogoApi";
import { fetchLoginBackground } from "../server/OAuthentication-Api/LogoApi";

const PhoneAuthApp = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState(""); // OTP from /login response
  const [loading, setLoading] = useState(false);
  const { sendOtp, resendOtp } = useAuthStore();

  const [networkError, setNetworkError] = useState(false);
  const [showRegisterError, setShowRegisterError] = useState(false);
  const [registerErrorMsg, setRegisterErrorMsg] = useState("");
  const [showOtpError, setShowOtpError] = useState(false);
  const [timer, setTimer] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [dynamicLogo, setDynamicLogo] = useState("");
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const fallbackBgUrl = "http://124.40.244.211/netmon/Cabletvapis/showimg/lg_iptv_login_bg.png";
  const [bgImage, setBgImage] = useState(fallbackBgUrl);

  // Fetch device information (IP address and Device ID)
  const deviceInfo = useDeviceInformation();

  // Background always ready — file is in public/Asset/

  useEffect(() => {
    let isMounted = true;

    const loadLogo = async () => {
      const result = await fetchLoginLogo({
        device_type: "LG TV",
        device_name: "LG TV",
      });

      if (isMounted && result?.success && result?.logoPath) {
        setDynamicLogo(result.logoPath);
        setLogoLoadFailed(false);
      }
    };

    loadLogo();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadBg = async () => {
      console.log("[LoginOtp] Starting background image load...");
      const result = await fetchLoginBackground();
      console.log("[LoginOtp] fetchLoginBackground result:", result);
      
      if (isMounted) {
        if (result?.success && result?.bgUrl) {
          console.log("[LoginOtp] Setting bgImage state to:", result.bgUrl);
          setBgImage(result.bgUrl);
        } else {
          console.log("[LoginOtp] API failed, keeping fallback URL");
        }
      }
    };
    
    loadBg();
    
    return () => {
      isMounted = false;
    };
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
  };

  /* ---------------- HELPERS ---------------- */
  const isNetworkError = (err) =>
    !navigator.onLine ||
    err.code === "ERR_NETWORK" ||
    err.message === "Network Error" ||
    !err.response;

  /* ---------------- API CALLS ---------------- */
  const handleGetOtp = async () => {
    if (phone.length !== 10) return;

    setLoading(true);
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
        setServerOtp(String(result.otp || ""));
        setTimeout(() => {
          setStep(2);
        }, 500);
      } else {
        setRegisterErrorMsg(result.message || "Invalid User / Mobile Number");
        setShowRegisterError(true);
      }
    } catch (e) {
      console.error("OTP Send Error:", e);
      if (isNetworkError(e)) {
        setNetworkError(true);
      } else {
        setRegisterErrorMsg("Invalid User / Mobile Number");
        setShowRegisterError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // OTP validated locally — /loginOtp is ONLY called by Resend, never here
  const handleVerifyOtp = () => {
    if (otp.length !== 4) return;

    if (serverOtp && otp === serverOtp) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess?.();
        navigate("/home");
      }, 1000);
    } else {
      setShowOtpError(true);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);

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
        setServerOtp(String(result.otp || ""));
        setTimer(60);
        setIsTimerRunning(true);
        setOtp("");
      }
    } catch (e) {
      if (isNetworkError(e)) setNetworkError(true);
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
    <style>{`
      .login-phone-input {
        font-size: 56px !important;
        font-weight: 700 !important;
        line-height: 1.2 !important;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff;
        text-size-adjust: 100%;
        -webkit-text-size-adjust: 100%;
        letter-spacing: 1px;
      }
      .login-phone-input::placeholder {
        font-size: 44px;
        font-weight: 700;
        color: #94A3B8;
        opacity: 1;
      }
    `}</style>
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        bgcolor: "#0f172a",
      }}
    >
      {/* Background image — native img element for better webOS support */}
      <img
        src={bgImage}
        alt="Login Background"
        onError={() => {
          console.warn("[LoginBG] Image load failed for:", bgImage);
          if (bgImage !== fallbackBgUrl) {
            setBgImage(fallbackBgUrl);
          }
        }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
          pointerEvents: "none",
          userSelect: "none",
          opacity: 1,
        }}
      />
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
          zIndex: 1,
          overflow: "hidden",
          "@media (min-width: 900px)": {
            maxWidth: "1200px",
            padding: "178px",
          },
        }}
      >
        {/* public/Asset + logo API */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 5 }}>
          {!logoLoadFailed && (
            <Box
              component="img"
              src={dynamicLogo || "/Asset/BBNL-Logo.png"}
              alt="BBNL Logo"
              onError={(e) => {
                e.currentTarget.onerror = null;
                if (dynamicLogo) {
                  setDynamicLogo("");
                  return;
                }
                setLogoLoadFailed(true);
              }}
              sx={{
                height: { xs: "8rem", md: "11rem", lg: "12rem" },
                width: { xs: "16rem", md: "22rem", lg: "24rem" },
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
          )}
          {logoLoadFailed && (
            <Typography sx={{ color: "#fff", fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>
              BBNL
            </Typography>
          )}
        </Box>

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
              <input
                className="login-phone-input"
                value={phone}
                onChange={handlePhoneChange}
                onKeyDown={handlePhoneKeyDown}
                placeholder="Enter 10-digit mobile number"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                data-webos-input="true"
                autoFocus
                style={{
                  width: "100%",
                  minHeight: "85px",
                  padding: "20px 24px",
                  backgroundColor: "#1E293B",
                  border: "1.5px solid #fff",
                  borderRadius: "14px",
                  fontSize: "48px",
                  lineHeight: 1.1,
                  fontWeight: 650,
                  color: "#fff",
                  caretColor: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
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
                p: { xs: 3, md: 4 },
                borderRadius: "20px",
                bgcolor: "rgba(31, 41, 55, 0.85)",
                border: "1px solid rgba(148, 163, 184, 0.25)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "stretch", justifyContent: "space-between", gap: 3 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 20, color: "#ffffff", fontWeight: 700, mb: 1, letterSpacing: 1 }}>
                    GATEWAY IP
                  </Typography>
                  <Typography sx={{ fontSize: 46, color: "#F8FAFC", fontWeight: 700, lineHeight: 1.05 }}>
                    {deviceInfo.loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (deviceInfo.privateIPv4 || deviceInfo.publicIPv4 || "Not available")}
                  </Typography>
                </Box>

                <Box sx={{ width: "2px", bgcolor: "rgba(148, 163, 184, 0.35)", borderRadius: "99px" }} />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 20, color: "#ffffff", fontWeight: 700, mb: 1, letterSpacing: 1 }}>
                    TV MODEL NAME
                  </Typography>
                  <Typography sx={{ fontSize: 46, color: "#F8FAFC", fontWeight: 700, lineHeight: 1.05 }} noWrap>
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
                p: { xs: 3, md: 4 },
                borderRadius: "20px",
                bgcolor: "rgba(31, 41, 55, 0.85)",
                border: "1px solid rgba(148, 163, 184, 0.25)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "stretch", justifyContent: "space-between", gap: 3 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 20, color: "#9CA3AF", fontWeight: 700, mb: 1, letterSpacing: 1 }}>
                    GATEWAY IP
                  </Typography>
                  <Typography sx={{ fontSize: 46, color: "#F8FAFC", fontWeight: 700, lineHeight: 1.05 }}>
                    {deviceInfo.loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (deviceInfo.privateIPv4 || deviceInfo.publicIPv4 || "Not available")}
                  </Typography>
                </Box>

                <Box sx={{ width: "2px", bgcolor: "rgba(148, 163, 184, 0.35)", borderRadius: "99px" }} />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 20, color: "#9CA3AF", fontWeight: 700, mb: 1, letterSpacing: 1 }}>
                    TV MODEL NAME
                  </Typography>
                  <Typography sx={{ fontSize: 46, color: "#F8FAFC", fontWeight: 700, lineHeight: 1.05 }} noWrap>
                    {deviceInfo.loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (deviceInfo.modelName || "Not available")}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Resend Code Section */}
            <Box sx={{ textAlign: "center" }}>
              {isTimerRunning ? (
                <Typography sx={{ color: "#00214f", fontSize: 32, fontWeight: 700 }}>
                  Didn't receive the code? <strong>Resend Code</strong> in{" "}
                  <span style={{ color: "#2563EB", fontWeight: 700 }}>
                    00:{timer < 10 ? `0${timer}` : timer}
                  </span>
                </Typography>
              ) : (
                <>
                  <Typography sx={{ color: "rgba(15, 23, 42, 0.6)", fontSize: 32, mb: 2, fontWeight: 700 }}>
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
                      color: "#f61134",
                      fontSize: 32,
                      fontWeight: 700,
                      textTransform: "none",
                      bgcolor: "transparent",
                      "&:hover": {
                        bgcolor: "rgba(246, 17, 52, 0.05)",
                        border: "1px solid #f61134",
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
              }}
              sx={{
                mt: 2,
                color: "rgba(15, 23, 42, 0.6)",
                fontSize: 32,
                fontWeight: 700,
                textTransform: "none",
                "&:hover": {
                  color: "rgba(15, 23, 42, 0.6)",
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

      {/* Overlay notifications — rendered on top of the login page */}
      {showRegisterError && (
        <RegisterNumber
          message={registerErrorMsg}
          onRetry={() => {
            setShowRegisterError(false);
            setRegisterErrorMsg("");
            setPhone("");
          }}
        />
      )}
      {showOtpError && (
        <ValidOTP
          onRetry={() => {
            setShowOtpError(false);
            setOtp("");
          }}
        />
      )}
    </div>
  );
};

export default PhoneAuthApp;

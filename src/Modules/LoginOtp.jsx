/**
 * LoginOtp — LG webOS TV Remote Navigation (FIXED)
 *
 * Remote key mapping:
 *   DOWN / UP     → move focus between: [digits] → [Get OTP btn] (step 1)
 *                                        [digits] → [Verify btn] → [Resend/Back] (step 2)
 *   OK / ENTER    → activate focused item
 *   BACK (461)    → step 2 → step 1 (stopPropagation so GlobalBackHandler won't fire)
 *   0-9           → digit input (no HTML <input> focus needed — pure state)
 *   BACKSPACE / RED (403) → delete last digit
 *
 * Fixes applied vs previous version:
 *  ✓ Buttons are NEVER `disabled` (disabled elements can't be DOM-focused)
 *  ✓ tabIndex juggle: only the focused element gets tabIndex=0 (prevents webOS spatial nav conflict)
 *  ✓ digitsRef added so the digit area can also receive real DOM focus
 *  ✓ moveFocus() calls setFocused() + requestAnimationFrame(el.focus()) — works after React re-render
 *  ✓ moveFocusRef stores moveFocus so the zero-dep keydown handler always has the latest copy
 *  ✓ action handlers read phone/otp/loading from S.current (never stale)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NetworkErrorNotification from "../error/Modules-Erros/NetworkError";
import RegisterNumber from "../error/OAuthentication/RegisterNumber";
import ValidOTP from "../error/OAuthentication/ValidOTP";
import useAuthStore from "../store/AuthStore";
import { useDeviceInformation } from "../server/Deviceinformaction/LG-Devicesinformaction";
import fetchLoginLogo from "../server/OAuthentication-Api/LogoApi";

/* ─── tiny spinner ───────────────────────────────────────────────────────── */
const Spinner = ({ size = 22 }) => (
  <span style={{
    display: "inline-block", width: size, height: size,
    border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
    borderRadius: "50%", animation: "_spin 0.9s linear infinite",
    verticalAlign: "middle",
  }} />
);

/* ─── focus-order lists ─────────────────────────────────────────────────── */
const S1        = ["digits", "btn-getotp"];
const S2_TIMER  = ["digits", "btn-verify", "btn-back"];
const S2_RESEND = ["digits", "btn-verify", "btn-resend", "btn-back"];

const getList = (step, isTimerRunning) =>
  step === 1 ? S1 : (isTimerRunning ? S2_TIMER : S2_RESEND);

/* ══════════════════════════════════════════════════════════════════════════ */
const PhoneAuthApp = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  const [step,    setStep]    = useState(1);
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [focused, setFocused] = useState("digits");   // ← single source of truth for focus

  const [serverOtp,        setServerOtp]        = useState("");
  const [loading,          setLoading]          = useState(false);
  const { sendOtp, resendOtp }                  = useAuthStore();

  const [networkError,      setNetworkError]      = useState(false);
  const [showRegisterError, setShowRegisterError] = useState(false);
  const [registerErrorMsg,  setRegisterErrorMsg]  = useState("");
  const [showOtpError,      setShowOtpError]      = useState(false);
  const [timer,             setTimer]             = useState(60);
  const [isTimerRunning,    setIsTimerRunning]    = useState(false);
  const [dynamicLogo,       setDynamicLogo]       = useState("");
  const [logoLoadFailed,    setLogoLoadFailed]    = useState(false);

  const deviceInfo = useDeviceInformation();

  /* ── always-current state snapshot for zero-dep handlers ─────────────── */
  const S = useRef({});
  S.current = { step, phone, otp, focused, loading, serverOtp, isTimerRunning };

  /* ── DOM refs (one per focusable item) ───────────────────────────────── */
  const digitsRef          = useRef(null);
  const hiddenPhoneInputRef = useRef(null);
  const hiddenOtpInputRef   = useRef(null);
  const btnGetOtpRef = useRef(null);
  const btnVerifyRef = useRef(null);
  const btnResendRef = useRef(null);
  const btnBackRef   = useRef(null);

  /* map id → ref so moveFocus can look up the right element.
     digits → hidden <input type="tel"> so DOM focus triggers system keyboard */
  const refsMap = useRef({});
  refsMap.current = {
    digits:        step === 1 ? hiddenPhoneInputRef : hiddenOtpInputRef,
    "btn-getotp":  btnGetOtpRef,
    "btn-verify":  btnVerifyRef,
    "btn-resend":  btnResendRef,
    "btn-back":    btnBackRef,
  };

  /* ── moveFocus: update React state + DOM focus after next paint ───────── */
  /* Stored in a ref so the zero-dep keydown handler can always call it.     */
  const moveFocusRef = useRef(null);
  moveFocusRef.current = (nextId) => {
    setFocused(nextId);
    /* requestAnimationFrame fires after React flushes the setState above,
       so tabIndex will already be 0 on the target element by this time.     */
    requestAnimationFrame(() => {
      refsMap.current[nextId]?.current?.focus({ preventScroll: true });
    });
  };

  /* ── logo ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    fetchLoginLogo({ device_type: "LG TV", device_name: "LG TV" }).then((res) => {
      if (alive && res?.success && res?.logoPath) setDynamicLogo(res.logoPath);
    });
    return () => { alive = false; };
  }, []);

  /* ── OTP timer ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (step === 2) {
      setTimer(60);
      setIsTimerRunning(true);
      moveFocusRef.current("digits");
    }
  }, [step]);

  useEffect(() => {
    if (!isTimerRunning || timer <= 0) { if (timer === 0) setIsTimerRunning(false); return; }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer, isTimerRunning]);

  /* ── auto-focus digits on mount ──────────────────────────────────────── */
  useEffect(() => {
    requestAnimationFrame(() => digitsRef.current?.focus({ preventScroll: true }));
  }, []);

  /* ─── actions (use S.current so they're never stale) ─────────────────── */
  const handleGetOtp = useCallback(async () => {
    const { phone, loading } = S.current;
    if (phone.length !== 10 || loading) return;
    setLoading(true); setNetworkError(false);
    try {
      const result = await sendOtp(phone, {
        ip_address: deviceInfo.privateIPv4 || deviceInfo.publicIPv4 || "",
        device_name: "LG TV", device_type: "LG TV",
        devdets: { brand: "LG", model: deviceInfo.modelName || "", mac: "" },
      });
      if (result.success) {
        localStorage.setItem("userId", result.data?.body?.[0]?.userid || "");
        localStorage.setItem("userPhone", phone);
        setServerOtp(String(result.otp || ""));
        setTimeout(() => setStep(2), 400);
      } else if (result.networkError) {
        setNetworkError(true);
      } else {
        setRegisterErrorMsg(result.message || "Invalid User / Mobile Number");
        setShowRegisterError(true);
      }
    } catch (e) {
      setNetworkError(true);
    } finally { setLoading(false); }
  }, [sendOtp, deviceInfo]);

  const handleVerifyOtp = useCallback(() => {
    const { otp, serverOtp, loading } = S.current;
    if (otp.length !== 4 || loading) return;
    if (serverOtp && otp === serverOtp) {
      setLoading(true);
      setTimeout(() => { setLoading(false); onLoginSuccess?.(); navigate("/home"); }, 800);
    } else {
      setShowOtpError(true);
    }
  }, [onLoginSuccess, navigate]);

  const handleResendOtp = useCallback(async () => {
    const { phone } = S.current;
    setLoading(true);
    try {
      const result = await resendOtp(phone, {
        ip_address: deviceInfo.privateIPv4 || deviceInfo.publicIPv4 || "",
        device_name: "LG TV", device_type: "LG TV",
        devdets: { brand: "LG", model: deviceInfo.modelName || "", mac: "" },
      });
      if (result.success) {
        setServerOtp(String(result.otp || ""));
        setTimer(60); setIsTimerRunning(true); setOtp("");
      }
    } catch (e) { setNetworkError(true); }
    finally { setLoading(false); }
  }, [resendOtp, deviceInfo]);

  /* stable refs for zero-dep keydown handler */
  const getOtpRef    = useRef(handleGetOtp);
  const verifyRef    = useRef(handleVerifyOtp);
  const resendRef    = useRef(handleResendOtp);
  useEffect(() => { getOtpRef.current = handleGetOtp;    }, [handleGetOtp]);
  useEffect(() => { verifyRef.current  = handleVerifyOtp; }, [handleVerifyOtp]);
  useEffect(() => { resendRef.current  = handleResendOtp; }, [handleResendOtp]);

  /* ── auto-verify OTP when 4 digits entered ────────────────────────────── */
  useEffect(() => {
    if (step === 2 && otp.length === 4 && !loading) {
      const t = setTimeout(() => verifyRef.current(), 600);
      return () => clearTimeout(t);
    }
  }, [otp, step, loading]);

  /* ════════════════════════════════════════════════════════════════════════
   *  SINGLE TV REMOTE KEYDOWN HANDLER
   *  — capture phase (fires before browser default & spatial nav)
   *  — zero deps (reads everything via S.current / moveFocusRef / action refs)
   * ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const handle = (e) => {
      const kc = e.keyCode;
      const { step, phone, otp, focused, loading, isTimerRunning } = S.current;

      /* ── prevent browser default for ALL navigation keys immediately ──── */
      const navKeys = [461, 13, 37, 38, 39, 40, 8, 403];
      const isDigit  = (kc >= 48 && kc <= 57) || (kc >= 96 && kc <= 105);
      if (navKeys.includes(kc) || isDigit) e.preventDefault();

      /* ── BACK (461) ─────────────────────────────────────────────────── */
      if (kc === 461 || e.key === "GoBack" || e.key === "Back") {
        if (step === 2) {
          e.stopPropagation();          // block GlobalBackHandler
          setStep(1);
          setOtp("");
          moveFocusRef.current("digits");
        }
        // step 1 → GlobalBackHandler navigates away
        return;
      }

      /* ── OK / ENTER (13) ─────────────────────────────────────────────── */
      if (kc === 13) {
        if (step === 1) {
          if (phone.length === 10 && !loading) getOtpRef.current();
        } else {
          if (focused === "btn-back") {
            setStep(1); setOtp(""); moveFocusRef.current("digits");
          } else if (focused === "btn-resend" && !isTimerRunning && !loading) {
            resendRef.current();
          } else if ((focused === "btn-verify" || focused === "digits") && otp.length === 4 && !loading) {
            verifyRef.current();
          }
        }
        return;
      }

      /* ── DOWN (40) ───────────────────────────────────────────────────── */
      if (kc === 40) {
        const list = getList(step, isTimerRunning);
        const idx  = list.indexOf(focused);
        if (idx !== -1 && idx < list.length - 1) {
          moveFocusRef.current(list[idx + 1]);
        }
        return;
      }

      /* ── UP (38) ─────────────────────────────────────────────────────── */
      if (kc === 38) {
        const list = getList(step, isTimerRunning);
        const idx  = list.indexOf(focused);
        if (idx > 0) {
          moveFocusRef.current(list[idx - 1]);
        }
        return;
      }

      /* ── LEFT (37) — always jump back to digit area ──────────────────── */
      if (kc === 37 && focused !== "digits") {
        moveFocusRef.current("digits");
        return;
      }

      /* ── DIGITS 0-9 (number row 48-57, numpad 96-105) ────────────────── */
      let digit = "";
      if (kc >= 48 && kc <= 57)  digit = String(kc - 48);
      else if (kc >= 96 && kc <= 105) digit = String(kc - 96);

      if (digit) {
        e.stopPropagation();
        if (focused !== "digits") moveFocusRef.current("digits");
        if (step === 1) { if (phone.length < 10) setPhone((p) => p + digit); }
        else            { if (otp.length   < 4)  setOtp  ((o) => o + digit); }
        return;
      }

      /* ── BACKSPACE (8) or RED key (403) ──────────────────────────────── */
      if (kc === 8 || kc === 403) {
        if (focused !== "digits") moveFocusRef.current("digits");
        if (step === 1) setPhone((p) => p.slice(0, -1));
        else            setOtp  ((o) => o.slice(0, -1));
      }
    };

    window.addEventListener("keydown", handle, true);   // capture phase
    return () => window.removeEventListener("keydown", handle, true);
  }, []);   // ← zero deps — all state read via refs

  /* ── helpers ──────────────────────────────────────────────────────────── */
  /* Returns tabIndex for an item: 0 only when it's the focused one.
     CRITICAL: disabled elements can't be focused, so we NEVER use `disabled`.
     Instead we use tabIndex juggle: only 1 element is tabbable at a time,
     so webOS spatial nav can't jump to unintended elements.                 */
  const tb = (id) => (focused === id ? 0 : -1);

  /* Focus ring style — applied to every focusable element */
  const ring = (id) =>
    focused === id
      ? {
          outline:      "3px solid #667eea",
          outlineOffset: "2px",
          boxShadow:    "0 0 0 7px rgba(102,126,234,0.28)",
        }
      : { outline: "none" };

  /* ── phone digits display — formatted with spaces every 5 digits ──────── */
  const phoneDisplay = () => {
    if (!phone) return "";
    return phone.replace(/(\d{5})(\d{0,5})/, "$1 $2").trim();
  };

  if (networkError) return <NetworkErrorNotification onRetry={() => setNetworkError(false)} />;

  /* ════════════════════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════════════════════ */
  return (
    <div>
      <style>{`
        @keyframes _spin  { from { transform: rotate(0) }     to { transform: rotate(360deg) } }
        @keyframes _blink { 0%,100% { opacity: 1 }  50% { opacity: 0 } }
        /* remove browser default focus ring — we draw our own */
        *:focus { outline: none; }
      `}</style>

      {/* ── full-screen backdrop ── */}
      <div style={{
        width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0,
        backgroundColor: "#040304",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>

        {/* ── centre card ── */}
        <div style={{
          width: "52%", minWidth: "520px", maxWidth: "920px",
          backgroundColor: "#152E54", borderRadius: "20px",
          padding: "48px 56px", position: "relative",
        }}>

          {/* logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "88px" }}>
            {!logoLoadFailed ? (
              <img
                src={dynamicLogo || "/icons.png"}
                alt="BBNL"
                onError={(ev) => {
                  ev.currentTarget.onerror = null;
                  if (dynamicLogo) { setDynamicLogo(""); } else { setLogoLoadFailed(true); }
                }}
                style={{ height: "110px", width: "210px", objectFit: "contain" }}
              />
            ) : (
              <span style={{ color: "#fff", fontSize: "36px", fontWeight: 800 }}>BBNL</span>
            )}
          </div>

          {/* ── Hidden inputs — DOM focus triggers LG TV system keyboard ── */}
          <input
            ref={hiddenPhoneInputRef}
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              setPhone(digits);
            }}
            onFocus={() => setFocused("digits")}
            style={{
              position: "absolute", opacity: 0,
              width: "1px", height: "1px", top: 0, left: 0,
              border: "none", padding: 0, margin: 0, overflow: "hidden",
            }}
          />
          <input
            ref={hiddenOtpInputRef}
            type="tel"
            inputMode="numeric"
            value={otp}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
              setOtp(digits);
            }}
            onFocus={() => setFocused("digits")}
            style={{
              position: "absolute", opacity: 0,
              width: "1px", height: "1px", top: 0, left: 0,
              border: "none", padding: 0, margin: 0, overflow: "hidden",
            }}
          />

          {/* ══════ STEP 1 — PHONE ══════ */}
          {step === 1 && (
            <div>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "26px", fontWeight: 600, marginBottom: "15px" }}>
                Mobile Number
              </p>

              {/* ── digit display (focusable div, NOT an <input>) ── */}
              <div
                ref={digitsRef}
                tabIndex={tb("digits")}
                onClick={() => moveFocusRef.current("digits")}
                onFocus={() => setFocused("digits")}
                style={{
                  width: "100%", minHeight: "80px",
                  padding: "16px 24px",
                  backgroundColor: focused === "digits" ? "#0D2140" : "#0B1A2E",
                  borderRadius: "16px", boxSizing: "border-box",
                  marginBottom: "55px",
                  display: "flex", alignItems: "center",
                  justifyContent: phone ? "flex-start" : "center",
                  transition: "all 0.18s",
                  cursor: "text",
                  ...ring("digits"),
                }}
              >
                {phone ? (
                  <>
                    <span style={{
                      fontSize: "44px", fontWeight: 700,
                      letterSpacing: "6px", fontFamily: "monospace",
                      color: "#fff",
                    }}>
                      {phoneDisplay()}
                    </span>
                    {focused === "digits" && phone.length < 10 && (
                      <span style={{
                        display: "inline-block", width: "3px", height: "52px",
                        backgroundColor: "#667eea", marginLeft: "8px",
                        animation: "_blink 1s step-end infinite", borderRadius: "2px",
                      }} />
                    )}
                  </>
                ) : (
                  <span style={{
                    fontSize: "24px", fontWeight: 400,
                    color: "rgba(255,255,255,0.35)",
                    letterSpacing: "0px",
                  }}>
                    Enter 10 Digit Number
                  </span>
                )}
              </div>


              {/* ── Get OTP button — NEVER disabled, visually dimmed instead ── */}
              <button
                ref={btnGetOtpRef}
                tabIndex={tb("btn-getotp")}
                onClick={handleGetOtp}
                onFocus={() => setFocused("btn-getotp")}
                style={{
                  width: "100%", height: "64px", borderRadius: "19px",
                  backgroundColor: phone.length === 10 && !loading ? "#1313EC" : "#0a0a7a",
                  color: "#fff", fontSize: "28px", fontWeight: 700, border: "2px solid transparent",
                  cursor: "pointer", marginBottom: "157px",
                  opacity: phone.length === 10 && !loading ? 1 : 0.45,
                  transition: "all 0.18s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                  ...ring("btn-getotp"),
                }}
              >
                {loading ? <><Spinner /> Sending…</> : "Get OTP"}
              </button>

              

              {/* device info */}
              <div style={{
                backgroundColor: "#0B0B18", borderRadius: "35px",
                padding: "24px 32px", display: "flex", alignItems: "center", gap: "24px",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "18px", color: "#8B9AB5", fontWeight: 600, marginBottom: "4px", letterSpacing: "1px", textTransform: "uppercase" }}>Gateway IP</p>
                  <p style={{ fontSize: "28px", color: "#fff", fontWeight: 700, margin: 0 }}>
                    {deviceInfo.loading ? <Spinner size={18} /> : (deviceInfo.privateIPv4 || deviceInfo.publicIPv4 || "–")}
                  </p>
                </div>
                <div style={{ width: "1px", alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.12)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "18px", color: "#8B9AB5", fontWeight: 600, marginBottom: "4px", letterSpacing: "1px", textTransform: "uppercase" }}>TV Model</p>
                  <p style={{ fontSize: "28px", color: "#fff", fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {deviceInfo.loading ? <Spinner size={18} /> : (deviceInfo.modelName || "–")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══════ STEP 2 — OTP ══════ */}
          {step === 2 && (
            <div>
              <p style={{ color: "#fff", fontSize: "22px", fontWeight: 600, textAlign: "center", marginBottom: "24px" }}>
                Enter the vaild OTP Code
              </p>

              {/* ── OTP digit boxes (focusable container) ── */}
              <div
                ref={digitsRef}
                tabIndex={tb("digits")}
                onClick={() => moveFocusRef.current("digits")}
                onFocus={() => setFocused("digits")}
                style={{
                  display: "flex", justifyContent: "center", gap: "32px",
                  marginBottom: "32px", padding: "20px 28px", borderRadius: "16px",
                  cursor: "text", transition: "all 0.18s",
                  ...ring("digits"),
                }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ width: "64px", height: "80px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", position: "relative" }}>
                    <span style={{
                      fontSize: "52px", fontWeight: 700, fontFamily: "monospace",
                      color: otp[i] ? "#fff" : "rgba(255,255,255,0.15)",
                      marginBottom: "8px",
                    }}>
                      {otp[i] || (focused === "digits" && otp.length === i ? "" : "·")}
                    </span>
                    {/* blinking caret on active slot */}
                    {focused === "digits" && otp.length === i && (
                      <span style={{
                        position: "absolute", top: "50%", left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "3px", height: "46px",
                        backgroundColor: "#667eea",
                        animation: "_blink 1s step-end infinite", borderRadius: "2px",
                      }} />
                    )}
                    {/* underline */}
                    <div style={{
                      width: "100%", height: "3px", borderRadius: "2px",
                      backgroundColor: otp[i] ? "#fff" : "rgba(255,255,255,0.3)",
                      transition: "all 0.2s",
                    }} />
                  </div>
                ))}
              </div>

              {/* ── Verify button ── */}
              <button
                ref={btnVerifyRef}
                tabIndex={tb("btn-verify")}
                onClick={handleVerifyOtp}
                onFocus={() => setFocused("btn-verify")}
                style={{
                  width: "60%", height: "56px", borderRadius: "40px",
                  backgroundColor: "#1313EC",
                  color: "#fff", fontSize: "24px", fontWeight: 700, border: "2px solid transparent",
                  cursor: "pointer", marginBottom: "28px", marginLeft: "20%",
                  opacity: otp.length === 4 ? 1 : 0.5,
                  transition: "all 0.18s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  ...ring("btn-verify"),
                }}
              >
                {loading ? "Verifying OTP" : "Verify OTP"}
              </button>

              {/* ── Resend / Timer ── */}
              <div style={{ marginBottom: "20px", textAlign: "center" }}>
                {isTimerRunning ? (
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "18px" }}>
                    Did&apos;nt receive the code?{" "}
                    <strong style={{ color: "#fff" }}>Resend Code</strong>
                    {" "}in{" "}
                    <strong style={{ color: "#fff" }}>
                      00:{timer < 10 ? `0${timer}` : timer}
                    </strong>
                  </p>
                ) : (
                  <button
                    ref={btnResendRef}
                    tabIndex={tb("btn-resend")}
                    onClick={handleResendOtp}
                    onFocus={() => setFocused("btn-resend")}
                    style={{
                      width: "60%", height: "52px", borderRadius: "40px",
                      border: "2px solid rgba(255,255,255,0.4)", color: "#fff",
                      fontSize: "20px", fontWeight: 600, backgroundColor: "transparent",
                      cursor: "pointer", transition: "all 0.18s", marginLeft: "20%",
                      ...ring("btn-resend"),
                    }}
                  >
                    Resend Code
                  </button>
                )}
              </div>

              {/* ── Back button ── */}
              <button
                ref={btnBackRef}
                tabIndex={tb("btn-back")}
                onClick={() => { setStep(1); setOtp(""); moveFocusRef.current("digits"); }}
                onFocus={() => setFocused("btn-back")}
                style={{
                  width: "60%", height: "52px", borderRadius: "40px",
                  backgroundColor: "#1313EC",
                  border: "none",
                  color: "#fff", fontSize: "20px", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.18s", marginLeft: "20%",
                  ...ring("btn-back"),
                }}
              >
                Exit the Back
              </button>
            </div>
          )}
        </div>
      </div>

      {showRegisterError && (
        <RegisterNumber
          message={registerErrorMsg}
          onRetry={() => { setShowRegisterError(false); setRegisterErrorMsg(""); setPhone(""); }}
        />
      )}
      {showOtpError && (
        <ValidOTP onRetry={() => { setShowOtpError(false); setOtp(""); }} />
      )}
    </div>
  );
};

export default PhoneAuthApp;

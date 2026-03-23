import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { API_ENDPOINTS, API_BASE_URL_PROD, getDefaultHeaders } from "../../server/config";

const FALLBACK_NO_LOGIN_IMAGE = `${API_BASE_URL_PROD}/showimg/no_login.png`;

const ValidOTP = ({ onRetry }) => {
  const [imageUrl, setImageUrl] = useState(FALLBACK_NO_LOGIN_IMAGE);
  const [loadingImage, setLoadingImage] = useState(true);
  const [focused, setFocused] = useState("btn-try-again");
  const btnTryAgainRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchErrorImages = async () => {
      try {
        const mobile = localStorage.getItem("userPhone") || "0000000000";
        const response = await axios.post(API_ENDPOINTS.ERROR_IMAGES, { userid: "lgiptv", mobile, device_type: "LG TV", mac_address: "", device_name: "LG TV", app_package: "com.lgiptv.bbnl" }, { headers: getDefaultHeaders() });
        const errImgs = response?.data?.errImgs || [];
        const noLoginItem = errImgs.find((item) => Object.prototype.hasOwnProperty.call(item, "NO_LOGIN"));
        const noLoginUrl = noLoginItem?.NO_LOGIN;
        if (isMounted && noLoginUrl) setImageUrl(noLoginUrl);
      } catch {
        if (isMounted) setImageUrl(FALLBACK_NO_LOGIN_IMAGE);
      } finally {
        if (isMounted) setLoadingImage(false);
      }
    };
    fetchErrorImages();
    return () => { isMounted = false; };
  }, []);

  /* ── Auto-focus button on mount ── */
  useEffect(() => {
    requestAnimationFrame(() => {
      btnTryAgainRef.current?.focus({ preventScroll: true });
    });
  }, []);

  /* ── Remote key handler for modal (capture phase to intercept all keys) ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      const kc = e.keyCode;

      /* ── Prevent browser defaults for ALL navigation keys ── */
      const navKeys = [461, 13, 37, 38, 39, 40, 8, 403];
      if (navKeys.includes(kc)) {
        e.preventDefault();
        e.stopPropagation();
      }

      /* ── Block ALL digit input to prevent keypad from appearing ── */
      const isDigit = (kc >= 48 && kc <= 57) || (kc >= 96 && kc <= 105);
      if (isDigit) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      /* ── OK / ENTER (13) — Click Try Again button ── */
      if (kc === 13) {
        e.preventDefault();
        e.stopPropagation();
        onRetry?.();
        return;
      }

      /* ── BACK (461) — Don't exit app, just close modal & go back to OTP screen ── */
      if (kc === 461 || e.key === "GoBack" || e.key === "Back") {
        e.preventDefault();
        e.stopPropagation();
        onRetry?.();
        return;
      }

      /* ── UP/DOWN/LEFT/RIGHT — Prevent default behavior ── */
      if (kc === 38 || kc === 40 || kc === 37 || kc === 39) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onRetry]);

  const focusStyle = focused === "btn-try-again"
    ? {
      outline: "3px solid #667eea",
      outlineOffset: "2px",
      boxShadow: "0 0 0 7px rgba(102,126,234,0.28)",
    }
    : { outline: "none" };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.55)", backdropFilter: "blur(18px) saturate(180%)", WebkitBackdropFilter: "blur(18px) saturate(180%)", zIndex: 9999, padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "900px", borderRadius: "40px", border: "2px solid rgba(255,255,255,0.9)", backgroundColor: "#2F2F35", padding: "40px" }}>

        {/* Image area */}
        <div style={{ width: "100%", minHeight: "360px", borderRadius: "30px", backgroundColor: "#F6F6F2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "40px", overflow: "hidden" }}>
          {loadingImage ? (
            <>
              <style>{`@keyframes _spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
              <div style={{ width: "40px", height: "40px", border: "4px solid rgba(0,0,0,0.2)", borderTopColor: "#111", borderRadius: "50%", animation: "_spin 1s linear infinite" }} />
            </>
          ) : (
            <img src={imageUrl} alt="Invalid OTP" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_NO_LOGIN_IMAGE; }} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "16px" }} />
          )}
        </div>

        <p style={{ color: "#fff", fontSize: "52px", fontWeight: 700, textAlign: "center", marginBottom: "40px" }}>Please Enter valid OTP</p>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            ref={btnTryAgainRef}
            tabIndex={0}
            onClick={() => onRetry?.()}
            onFocus={() => setFocused("btn-try-again")}
            style={{
              minWidth: "260px",
              height: "72px",
              borderRadius: "50px",
              backgroundColor: "#F2BC1B",
              color: "#111",
              fontSize: "36px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              ...focusStyle,
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default ValidOTP;

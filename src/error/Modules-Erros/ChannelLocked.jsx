import { useEffect, useRef, useState } from "react";
import { sessionGet } from "../../utils/session";

/**
 * Two-step subscription gate modal — replaces the old "Channel Locked" dialog.
 *
 * Step 1 ("Subscription Not Available"):
 *   - Shows the channel name, the Device ID and User ID, and a "Pay Now" CTA.
 *   - OK on Pay Now advances to Step 2.
 *   - BACK closes the whole flow (returns to the screen the caller was on).
 *
 * Step 2 ("Coming Soon"):
 *   - Subscription portal placeholder. Single "Go Back" CTA.
 *   - OK on Go Back, or BACK key, both close the whole flow and return to
 *     the original screen — they DO NOT re-show Step 1.
 *
 * Public API is unchanged from the previous component:
 *   <ChannelLocked channel={...} onClose={...} />
 *
 * Parents (LivePlayer / Home / LiveChannels) need no changes.
 *
 * Capture-phase keydown is mandatory so the underlying screen handlers
 * (sidebar, numpad, Home tile grid) don't double-process the same key.
 */

const TvSparkleIcon = () => (
  <svg viewBox="0 0 96 96" width="100" height="100" fill="none" aria-hidden="true">
    <rect x="10" y="20" width="76" height="50" rx="6"
          stroke="#F4BF1F" strokeWidth="3" fill="rgba(244,191,31,0.08)" />
    <path d="M30 70 L30 78 M66 70 L66 78 M22 78 H74"
          stroke="#F4BF1F" strokeWidth="3" strokeLinecap="round" />
    <path d="M68 28 L70.5 33.5 L76 36 L70.5 38.5 L68 44 L65.5 38.5 L60 36 L65.5 33.5 Z"
          fill="#F4BF1F" />
    <circle cx="48" cy="48" r="10" stroke="#F4BF1F" strokeWidth="2.5" fill="none" />
    <path d="M44 48 L47 51 L53 44" stroke="#F4BF1F" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const ClockSparkleIcon = () => (
  <svg viewBox="0 0 96 96" width="100" height="100" fill="none" aria-hidden="true">
    <circle cx="48" cy="50" r="30" stroke="#5163ED" strokeWidth="3"
            fill="rgba(81,99,237,0.10)" />
    <path d="M48 32 V50 L60 58" stroke="#5163ED" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round" />
    <path d="M76 18 L78.5 24 L84 26 L78.5 28 L76 34 L73.5 28 L68 26 L73.5 24 Z"
          fill="#5163ED" />
    <path d="M18 70 L19.5 73.5 L23 75 L19.5 76.5 L18 80 L16.5 76.5 L13 75 L16.5 73.5 Z"
          fill="#5163ED" />
  </svg>
);

const ChannelLocked = ({ channel, onClose }) => {
  const [step, setStep] = useState(1);
  const payNowRef = useRef(null);
  const goBackRef = useRef(null);

  const channelName = channel?.chtitle || channel?.channeltitle || "this channel";
  const deviceId = (typeof window !== "undefined" && (
    localStorage.getItem("lgtv_device_id_pinned") ||
    localStorage.getItem("lgtv_device_uuid") ||
    ""
  )) || "—";
  const userId = sessionGet("userId") || "—";

  // Auto-focus the primary CTA on mount and whenever the step changes so the
  // user can press OK immediately without a stray pointer move first.
  useEffect(() => {
    requestAnimationFrame(() => {
      if (step === 1) payNowRef.current?.focus({ preventScroll: true });
      else            goBackRef.current?.focus({ preventScroll: true });
    });
  }, [step]);

  // Capture-phase key handler. Re-binds whenever `step` changes so the OK key
  // does the right thing for the active modal.
  useEffect(() => {
    const onKey = (e) => {
      const kc = e.keyCode;
      const navKeys = [461, 13, 37, 38, 39, 40, 8, 403];
      if (navKeys.includes(kc)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      // Block digit keys so the underlying numpad can't capture them.
      const isDigit = (kc >= 48 && kc <= 57) || (kc >= 96 && kc <= 105);
      if (isDigit) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      const isOk   = kc === 13 || e.key === "Enter";
      const isBack = kc === 461 || e.key === "GoBack" || e.key === "Back";

      if (step === 1) {
        if (isOk)   { setStep(2); return; }
        if (isBack) { onClose?.(); return; }
      } else {
        // Step 2: OK on Go Back, or BACK key, both fully close the flow
        // (per design — never bounce back to Step 1).
        if (isOk || isBack) { onClose?.(); return; }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [step, onClose]);

  const cardBaseStyle = {
    width: "100%",
    maxWidth: "780px",
    background: "#0F1729",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "28px",
    padding: "56px 64px 48px",
    color: "#fff",
    textAlign: "center",
    boxShadow: "0 28px 70px rgba(0,0,0,0.6)",
    fontFamily: "'LG Display GP4', 'LG Smart UI', Roboto, 'Segoe UI', sans-serif",
  };

  const overlayStyle = {
    position: "fixed", inset: 0, zIndex: 10010,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(4,3,4,0.78)",
    backdropFilter: "blur(14px) saturate(160%)",
    WebkitBackdropFilter: "blur(14px) saturate(160%)",
    padding: "24px", pointerEvents: "auto",
  };

  // ── Step 1: Subscription Not Available ────────────────────────────────────
  if (step === 1) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Subscription Not Available"
        onClick={(e) => e.stopPropagation()}
        style={overlayStyle}
      >
        <div onClick={(e) => e.stopPropagation()} style={cardBaseStyle}>
          {/* Illustration badge */}
          <div style={{
            width: "148px", height: "148px",
            borderRadius: "50%",
            margin: "0 auto 28px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(244,191,31,0.10)",
            border: "1px solid rgba(244,191,31,0.30)",
          }}>
            <TvSparkleIcon />
          </div>

          <p style={{ fontSize: "44px", fontWeight: 800, margin: "0 0 14px", letterSpacing: "0.3px" }}>
            Subscription Not Available
          </p>

          <p style={{ fontSize: "38px", fontWeight: 700, color: "#F4BF1F", margin: "0 0 18px" }}>
            {channelName}
          </p>

          <p style={{
            fontSize: "28px", lineHeight: 1.5, color: "#cbd5e0",
            margin: "0 0 32px", maxWidth: "640px",
            marginLeft: "auto", marginRight: "auto",
          }}>
            Please subscribe to watch this channel.
          </p>

          {/* Device ID / User ID row */}
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            gap: "48px", flexWrap: "wrap",
            margin: "0 0 36px",
            fontSize: "24px", lineHeight: 1.4,
          }}>
            <div>
              <span style={{ color: "#8B9AB5", fontWeight: 500 }}>Device ID: </span>
              <span style={{ color: "#fff", fontWeight: 600, wordBreak: "break-all" }}>{deviceId}</span>
            </div>
            <div>
              <span style={{ color: "#8B9AB5", fontWeight: 500 }}>User ID: </span>
              <span style={{ color: "#fff", fontWeight: 600 }}>{userId}</span>
            </div>
          </div>

          <button
            ref={payNowRef}
            tabIndex={0}
            className="focusable-paynow-btn"
            onClick={() => setStep(2)}
            style={{
              minWidth: "260px", height: "76px",
              padding: "0 40px",
              borderRadius: "16px",
              background: "transparent",
              color: "#fff",
              fontSize: "28px", fontWeight: 700,
              border: "2px solid rgba(255,255,255,0.55)",
              cursor: "pointer",
              outline: "none",
              transition: "all 0.18s",
            }}
          >
            Pay Now
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Coming Soon ──────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Coming Soon"
      onClick={(e) => e.stopPropagation()}
      style={overlayStyle}
    >
      <div onClick={(e) => e.stopPropagation()} style={cardBaseStyle}>
        <div style={{
          width: "148px", height: "148px",
          borderRadius: "50%",
          margin: "0 auto 28px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(81,99,237,0.12)",
          border: "1px solid rgba(81,99,237,0.34)",
        }}>
          <ClockSparkleIcon />
        </div>

        <p style={{ fontSize: "52px", fontWeight: 800, margin: "0 0 18px", letterSpacing: "0.3px" }}>
          Coming Soon
        </p>

        <p style={{
          fontSize: "28px", lineHeight: 1.55, color: "#cbd5e0",
          margin: "0 0 40px", maxWidth: "640px",
          marginLeft: "auto", marginRight: "auto",
        }}>
          Online channel subscriptions will be available here shortly. Please contact your service provider to subscribe in the meantime.
        </p>

        <button
          ref={goBackRef}
          tabIndex={0}
          className="focusable-goback-btn"
          onClick={() => onClose?.()}
          style={{
            minWidth: "260px", height: "76px",
            padding: "0 40px",
            borderRadius: "16px",
            background: "#3B4FE8",
            color: "#fff",
            fontSize: "28px", fontWeight: 700,
            border: "2px solid transparent",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.18s",
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default ChannelLocked;

import { useEffect, useRef } from "react";

/**
 * Channel Locked modal — appears when the user attempts to play a channel
 * that isn't part of their current subscription. DTH-style: show what's
 * available, but gate playback behind a subscription with a clear contact path.
 *
 * Props:
 *   channel  : the channel object (used for chtitle / channelno display)
 *   onClose  : called when the user dismisses (OK key, BACK key, or Close click)
 *
 * Capture-phase keydown is mandatory so the underlying LivePlayer/sidebar/Home
 * keydown handlers don't receive the same key. stopImmediatePropagation also
 * prevents same-target capture-phase listeners from re-firing.
 */
const PadlockIcon = () => (
  <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <circle cx="12" cy="16" r="1.4" fill="currentColor" />
  </svg>
);

const ChannelLocked = ({ channel, onClose }) => {
  const okBtnRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      okBtnRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const kc = e.keyCode;
      const navKeys = [461, 13, 37, 38, 39, 40, 8, 403];
      if (navKeys.includes(kc)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      // Block any digit keys so the underlying number-pad can't capture them
      const isDigit = (kc >= 48 && kc <= 57) || (kc >= 96 && kc <= 105);
      if (isDigit) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      // OK / Enter / BACK all dismiss
      if (kc === 13 || kc === 461 || e.key === "GoBack" || e.key === "Back" || e.key === "Enter") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const channelName = channel?.chtitle || channel?.channeltitle || "this channel";
  const channelNo = channel?.channelno || channel?.chno || channel?.channelid || "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Channel locked"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed", inset: 0, zIndex: 10010,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(4,3,4,0.78)", backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        padding: "24px", pointerEvents: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "640px",
          background: "#0F1729",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "44px 48px 36px",
          color: "#fff",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          fontFamily: "'LG Display GP4', 'LG Smart UI', Roboto, 'Segoe UI', sans-serif",
        }}
      >
        {/* Padlock badge */}
        <div style={{
          width: "112px", height: "112px",
          borderRadius: "50%",
          margin: "0 auto 24px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(244,191,31,0.12)",
          border: "1px solid rgba(244,191,31,0.32)",
          color: "#F4BF1F",
        }}>
          <PadlockIcon />
        </div>

        <p style={{ fontSize: "32px", fontWeight: 800, margin: "0 0 10px", letterSpacing: "0.2px" }}>
          Channel Locked
        </p>

        <p style={{ fontSize: "20px", fontWeight: 600, color: "#cbd5e0", margin: "0 0 18px" }}>
          {channelNo ? <span style={{ color: "#fff" }}>Ch {channelNo}</span> : null}
          {channelNo ? "  ·  " : ""}
          <span style={{ color: "#fff" }}>{channelName}</span>
        </p>

        <p style={{ fontSize: "18px", lineHeight: 1.55, color: "#8B9AB5", margin: "0 0 28px", maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
          This channel is not part of your current subscription. To activate it, please contact your service provider.
        </p>

        <button
          ref={okBtnRef}
          tabIndex={0}
          className="focusable-locked-ok"
          onClick={() => onClose?.()}
          style={{
            minWidth: "220px", height: "60px",
            padding: "0 36px",
            borderRadius: "14px",
            background: "#3B4FE8",
            color: "#fff",
            fontSize: "20px", fontWeight: 700,
            border: "2px solid transparent",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.18s",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default ChannelLocked;

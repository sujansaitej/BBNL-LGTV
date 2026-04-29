import { useEffect, useRef } from "react";

/**
 * ChannelNotFound — small modal popup shown when the user enters a channel
 * number that doesn't exist. Auto-closes after 3 seconds; OK or BACK also
 * dismisses it. Capture-phase keydown so the underlying LivePlayer key
 * handler does not also fire.
 */
const ChannelNotFound = ({ channelNumber, onClose }) => {
  const okBtnRef = useRef(null);
  const autoCloseRef = useRef(null);

  // 3-second auto-close
  useEffect(() => {
    autoCloseRef.current = setTimeout(() => {
      if (typeof onClose === "function") onClose();
    }, 3000);
    return () => {
      if (autoCloseRef.current) {
        clearTimeout(autoCloseRef.current);
        autoCloseRef.current = null;
      }
    };
  }, [onClose]);

  // Capture-phase keydown — OK and BACK both close
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key;
      const kc = e.keyCode;

      // BACK
      if (k === "GoBack" || k === "Back" || kc === 461 || k === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        if (typeof onClose === "function") onClose();
        return;
      }

      // OK / ENTER
      if (k === "Enter" || kc === 13 || k === " ") {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        if (typeof onClose === "function") onClose();
        return;
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Apply DOM-attribute focus to the OK button
  useEffect(() => {
    if (okBtnRef.current) {
      okBtnRef.current.setAttribute("data-focused", "true");
    }
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          width: "480px",
          minHeight: "220px",
          background: "rgba(15, 20, 35, 0.95)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: "16px",
          boxShadow: "0 12px 48px rgba(0,0,0,0.7)",
          padding: "32px 28px",
          color: "#fff",
          textAlign: "center",
          fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          backdropFilter: "blur(10px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "18px",
        }}
      >
        <p
          style={{
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "2px",
            color: "#ffb347",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          Not Available
        </p>
        <p
          style={{
            fontSize: "26px",
            fontWeight: 700,
            margin: 0,
            color: "#fff",
            lineHeight: 1.3,
          }}
        >
          Channel {channelNumber} not available
        </p>
        <div
          ref={okBtnRef}
          className="focusable-error-ok"
          role="button"
          tabIndex={-1}
          onClick={() => { if (typeof onClose === "function") onClose(); }}
          style={{
            marginTop: "8px",
            minWidth: "120px",
            padding: "10px 28px",
            fontSize: "22px",
            fontWeight: 700,
            color: "#fff",
            background: "#2563eb",
            border: "2px solid transparent",
            borderRadius: "10px",
            cursor: "pointer",
            outline: "none",
            userSelect: "none",
          }}
        >
          OK
        </div>
      </div>
    </div>
  );
};

export default ChannelNotFound;

import { memo, useRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";

/**
 * ChannelNumberDisplay — shows channel number + hidden input for LG keyboard
 *
 * When `keyboardOpen` is true, hidden <input type="tel"> gets focus
 * → LG webOS system keyboard appears. As user types, digits show in the display.
 */
export const ChannelNumberDisplay = memo(({ channelNumber, keyboardOpen, onChange, onSubmit, onClose }) => {
  const inputRef = useRef(null);

  // Focus hidden input → triggers LG webOS system keyboard
  useEffect(() => {
    if (keyboardOpen && inputRef.current) {
      inputRef.current.value = "";
      requestAnimationFrame(() => {
        if (inputRef.current) inputRef.current.focus();
      });
    }
  }, [keyboardOpen]);

  const handleInput = useCallback((e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    e.target.value = val;
    if (onChange) onChange(val);
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" || e.keyCode === 13) {
      e.preventDefault();
      const val = inputRef.current?.value?.replace(/\D/g, "").trim();
      if (val && onSubmit) onSubmit(val);
      else if (onClose) onClose();
    }
    if (e.key === "GoBack" || e.key === "Back" || e.keyCode === 461) {
      e.preventDefault(); e.stopPropagation();
      if (onClose) onClose();
    }
  }, [onSubmit, onClose]);

  const handleBlur = useCallback(() => {
    const val = inputRef.current?.value?.replace(/\D/g, "").trim();
    if (val && onSubmit) onSubmit(val);
    else if (onClose) onClose();
  }, [onSubmit, onClose]);

  // Show nothing if no number typed and keyboard not open
  if (!channelNumber && !keyboardOpen) return null;

  return (
    <>
      <div style={{ position: "fixed", top: "32px", right: "32px", transform: "translateY(0) translateZ(0)", backgroundColor: "rgba(0,0,0,0.9)", color: "#fff", padding: "18px 32px", borderRadius: "24px", fontSize: "74px", fontWeight: "bold", zIndex: 9999, minWidth: "140px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.8)", border: "2px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", willChange: "contents", backfaceVisibility: "hidden" }}>
        {channelNumber || "---"}
      </div>

      {/* Hidden input — triggers LG system keyboard when focused */}
      {keyboardOpen && (
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoComplete="off"
          style={{
            position: "fixed",
            left: "-9999px", top: "-9999px",
            width: "1px", height: "1px",
            opacity: 0,
          }}
        />
      )}
    </>
  );
});

ChannelNumberDisplay.displayName = "ChannelNumberDisplay";
ChannelNumberDisplay.propTypes = {
  channelNumber: PropTypes.string,
  keyboardOpen: PropTypes.bool,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  onClose: PropTypes.func,
};
ChannelNumberDisplay.defaultProps = { channelNumber: "" };

export const findChannelByNumber = (channels, value) => {
  if (!channels || !Array.isArray(channels) || !value) return null;
  return channels.find((item) => {
    const rawNo = item.channelno || item.channel_no || item.chno || item.channelNumber || item.channelid || item.chid || "";
    if (String(rawNo).trim() === String(value).trim()) return true;
    const parsedRaw = parseInt(rawNo, 10);
    const parsedValue = parseInt(value, 10);
    if (!Number.isNaN(parsedRaw) && !Number.isNaN(parsedValue)) return parsedRaw === parsedValue;
    return false;
  }) || null;
};

export default ChannelNumberDisplay;

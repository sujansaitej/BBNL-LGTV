import { forwardRef, useRef, useState } from "react";

// Try to open the LG webOS on-screen keyboard (Luna API). Auto-pop on `<input>`
// focus is unreliable on real TVs — explicit keyboard.show()/hide() is what
// Setting.jsx and Feedback.jsx already use successfully. Wrapped in try/catch
// so dev-mode browser builds (no window.webOS) don't crash.
const tryShowKeyboard = () => {
  try {
    if (window.webOS && window.webOS.keyboard && typeof window.webOS.keyboard.show === "function") {
      window.webOS.keyboard.show();
    }
  } catch { /* ignore */ }
};

const tryHideKeyboard = () => {
  try {
    if (window.webOS && window.webOS.keyboard && typeof window.webOS.keyboard.hide === "function") {
      window.webOS.keyboard.hide();
    }
  } catch { /* ignore */ }
};

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const ClearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

/**
 * SearchPill — shared focusable search input for /home and /live-channels.
 *
 * Forwards its wrapper ref so the parent can register it in its zone-based
 * focus engine (data-focused attribute). When the parent presses OK on the
 * focused wrapper, it calls `wrapperEl.querySelector('input').focus()` (same
 * pattern as before). The input's onFocus then invokes the LG keyboard via
 * the Luna API, and onBlur dismisses it.
 *
 * BACK while typing is handled globally in App.js: any focused INPUT/TEXTAREA
 * blurs on BACK, returning control to the page's zone navigation without
 * leaving the page.
 */
const SearchPill = forwardRef(function SearchPill(
  {
    value,
    onChange,
    onFocusChange,
    placeholder = "Search...",
    width = "28rem",
    height = "3.5rem",
    maxLength = 50,
  },
  wrapperRef,
) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  return (
    <div
      ref={wrapperRef}
      className="focusable-button"
      role="button"
      tabIndex={-1}
      onClick={() => {
        // Pointer/click path (Magic Remote pointer mode). Focus the input —
        // the input's onFocus handler invokes the on-screen keyboard.
        inputRef.current?.focus();
      }}
      style={{
        width,
        display: "flex",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
        border: focused ? "2px solid #667eea" : "2px solid rgba(255,255,255,0.2)",
        borderRadius: "28px",
        height,
        padding: "0 1.25rem",
        gap: "10px",
        outline: "none",
        flexShrink: 0,
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.5)", display: "flex", flexShrink: 0 }}>
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true);
          onFocusChange?.(true);
          tryShowKeyboard();
        }}
        onBlur={() => {
          setFocused(false);
          onFocusChange?.(false);
          tryHideKeyboard();
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          flex: 1,
          background: "none",
          border: "none",
          outline: "none",
          color: "#fff",
          fontSize: "1.1rem",
          fontWeight: 500,
        }}
      />
      {value && (
        <div
          onClick={(e) => {
            // stopPropagation so the wrapper's onClick (which would re-focus
            // the input) doesn't fire — the user wants the field cleared, not
            // the keyboard re-opened. The input keeps its existing focus
            // state; if it was focused, it stays focused.
            e.stopPropagation();
            onChange("");
          }}
          style={{
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            padding: "4px",
            flexShrink: 0,
          }}
        >
          <ClearIcon />
        </div>
      )}
    </div>
  );
});

export default SearchPill;

import { useEffect, useRef, useCallback } from "react";

/**
 * ChannelNumberPad — custom on-screen numeric keypad shown over the live
 * player, replacing the LG system keyboard (which cannot be auto-hidden).
 *
 * Layout (4×3):
 *   1 2 3
 *   4 5 6
 *   7 8 9
 *   DEL 0 OK
 *
 * Focus uses the project's DOM-attribute pattern (`data-focused="true"`).
 * NO React state for focus index. Capture-phase keydown listener with
 * `stopImmediatePropagation` so LivePlayer's keydown handler doesn't also
 * fire. Idle auto-hide after 10s (any keypress resets the timer).
 */

const KEYS = [
  { v: "1", label: "1", row: 0, col: 0 },
  { v: "2", label: "2", row: 0, col: 1 },
  { v: "3", label: "3", row: 0, col: 2 },
  { v: "4", label: "4", row: 1, col: 0 },
  { v: "5", label: "5", row: 1, col: 1 },
  { v: "6", label: "6", row: 1, col: 2 },
  { v: "7", label: "7", row: 2, col: 0 },
  { v: "8", label: "8", row: 2, col: 1 },
  { v: "9", label: "9", row: 2, col: 2 },
  { v: "DEL", label: "DEL", row: 3, col: 0 },
  { v: "0", label: "0", row: 3, col: 1 },
  { v: "OK", label: "OK", row: 3, col: 2 },
];

const COLS = 3;
const ROWS = 4;
const DEFAULT_FOCUS_INDEX = 4; // [5]
const IDLE_MS = 10000;
const MAX_DIGITS = 4;

const ChannelNumberPad = ({ onSubmit, onClose, initialValue = "" }) => {
  const valueRef = useRef(String(initialValue || "").replace(/\D/g, "").slice(0, MAX_DIGITS));
  const displayRef = useRef(null);
  const keyRefs = useRef([]);
  const focusedRef = useRef(DEFAULT_FOCUS_INDEX);
  const idleTimerRef = useRef(null);

  // ── Idle auto-hide ───────────────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (typeof onClose === "function") onClose();
    }, IDLE_MS);
  }, [onClose]);

  // ── Display refresh (no React state) ─────────────────────────────────────
  const refreshDisplay = useCallback(() => {
    if (displayRef.current) {
      displayRef.current.textContent = valueRef.current || "----";
    }
  }, []);

  // ── DOM-attribute focus ──────────────────────────────────────────────────
  const setFocus = useCallback((newIdx) => {
    const oldIdx = focusedRef.current;
    if (oldIdx !== newIdx) {
      const oldEl = keyRefs.current[oldIdx];
      if (oldEl) oldEl.removeAttribute("data-focused");
    }
    const newEl = keyRefs.current[newIdx];
    if (newEl) newEl.setAttribute("data-focused", "true");
    focusedRef.current = newIdx;
  }, []);

  // ── Activate the currently-focused key ──────────────────────────────────
  const activateKey = useCallback((idx) => {
    const key = KEYS[idx];
    if (!key) return;

    if (key.v === "DEL") {
      if (valueRef.current.length > 0) {
        valueRef.current = valueRef.current.slice(0, -1);
        refreshDisplay();
      }
      return;
    }

    if (key.v === "OK") {
      const val = valueRef.current;
      if (!val) {
        if (typeof onClose === "function") onClose();
        return;
      }
      if (typeof onSubmit === "function") onSubmit(val);
      return;
    }

    // digit
    if (valueRef.current.length < MAX_DIGITS) {
      valueRef.current = `${valueRef.current}${key.v}`;
      refreshDisplay();
    }
  }, [onClose, onSubmit, refreshDisplay]);

  // ── Initial mount: focus default key, kick off idle timer, paint display ─
  useEffect(() => {
    refreshDisplay();
    const el = keyRefs.current[DEFAULT_FOCUS_INDEX];
    if (el) el.setAttribute("data-focused", "true");
    focusedRef.current = DEFAULT_FOCUS_INDEX;
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Capture-phase keydown handler ────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key;
      const kc = e.keyCode;
      const idx = focusedRef.current;
      const row = Math.floor(idx / COLS);
      const col = idx % COLS;

      // Always swallow events while pad is open so LivePlayer doesn't react
      const swallow = () => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
      };

      // BACK / ESC → close
      if (k === "GoBack" || k === "Back" || kc === 461 || k === "Escape") {
        swallow();
        if (typeof onClose === "function") onClose();
        return;
      }

      // ARROWS → grid navigation with wrap-around
      if (k === "ArrowLeft" || kc === 37) {
        swallow();
        const nextCol = (col - 1 + COLS) % COLS;
        setFocus(row * COLS + nextCol);
        resetIdleTimer();
        return;
      }
      if (k === "ArrowRight" || kc === 39) {
        swallow();
        const nextCol = (col + 1) % COLS;
        setFocus(row * COLS + nextCol);
        resetIdleTimer();
        return;
      }
      if (k === "ArrowUp" || kc === 38) {
        swallow();
        const nextRow = (row - 1 + ROWS) % ROWS;
        setFocus(nextRow * COLS + col);
        resetIdleTimer();
        return;
      }
      if (k === "ArrowDown" || kc === 40) {
        swallow();
        const nextRow = (row + 1) % ROWS;
        setFocus(nextRow * COLS + col);
        resetIdleTimer();
        return;
      }

      // OK / ENTER → activate currently-focused key
      if (k === "Enter" || kc === 13 || k === " ") {
        swallow();
        activateKey(focusedRef.current);
        resetIdleTimer();
        return;
      }

      // Direct digit keys (number row / numpad)
      let digit = "";
      if (/^[0-9]$/.test(k)) digit = k;
      else if (e.code && e.code.startsWith("Digit")) digit = e.code.replace("Digit", "");
      else if (kc >= 48 && kc <= 57) digit = String(kc - 48);
      else if (kc >= 96 && kc <= 105) digit = String(kc - 96);

      if (digit) {
        swallow();
        if (valueRef.current.length < MAX_DIGITS) {
          valueRef.current = `${valueRef.current}${digit}`;
          refreshDisplay();
        }
        resetIdleTimer();
        return;
      }

      // BACKSPACE / RED → delete
      if (kc === 8 || kc === 403) {
        swallow();
        if (valueRef.current.length > 0) {
          valueRef.current = valueRef.current.slice(0, -1);
          refreshDisplay();
        }
        resetIdleTimer();
        return;
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [activateKey, onClose, refreshDisplay, resetIdleTimer, setFocus]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          width: "320px",
          height: "420px",
          background: "rgba(15, 20, 35, 0.92)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: "20px",
          boxShadow: "0 12px 48px rgba(0,0,0,0.7)",
          padding: "20px",
          color: "#fff",
          fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          backdropFilter: "blur(10px)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Display strip */}
        <div
          ref={displayRef}
          style={{
            height: "60px",
            borderRadius: "12px",
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            fontWeight: 800,
            letterSpacing: "6px",
            color: "#fff",
          }}
        >
          {valueRef.current || "----"}
        </div>

        {/* 4×3 grid */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            gap: "10px",
          }}
        >
          {KEYS.map((key, idx) => {
            const isAction = key.v === "DEL" || key.v === "OK";
            return (
              <div
                key={key.v}
                ref={(el) => { keyRefs.current[idx] = el; }}
                className="focusable-numpad-key"
                role="button"
                tabIndex={-1}
                onClick={() => { activateKey(idx); resetIdleTimer(); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isAction ? "20px" : "28px",
                  fontWeight: 800,
                  color: "#fff",
                  background: isAction
                    ? (key.v === "OK" ? "#2563eb" : "rgba(255,255,255,0.08)")
                    : "rgba(255,255,255,0.06)",
                  border: "2px solid transparent",
                  borderRadius: "12px",
                  cursor: "pointer",
                  outline: "none",
                  userSelect: "none",
                  willChange: "transform",
                }}
              >
                {key.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChannelNumberPad;

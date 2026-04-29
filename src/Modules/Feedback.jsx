import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useFeedbackStore from "../store/FeedbackStore";
import { TV_KEYS } from "../Remote/useMagicRemote";

const ArrowBackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>;
const StarFilledIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="42" height="42" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>;
const StarOutlineIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="42" height="42" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" /></svg>;

/* ── Inline Success Modal — auto-dismisses after 2s ─────────────────────── */
const SuccessModal = ({ onComplete }) => {
  useEffect(() => {
    const t = setTimeout(onComplete, 2000);
    return () => clearTimeout(t);
  }, [onComplete]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10001 }}>
      <div style={{ background: "#1a1a2e", borderRadius: "20px", padding: "48px 64px", textAlign: "center", border: "2px solid rgba(76,175,80,0.4)", minWidth: "440px" }}>
        <div style={{ width: "96px", height: "96px", margin: "0 auto 20px", borderRadius: "50%", background: "rgba(76,175,80,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" width="56" height="56" fill="#4caf50"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
        </div>
        <p style={{ fontSize: "28px", fontWeight: 700, color: "#fff", margin: 0 }}>Thank you for your feedback!</p>
        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.7)", marginTop: "12px" }}>Your response helps us improve.</p>
      </div>
    </div>
  );
};

/* ── Try to open the LG on-screen keyboard (Luna API). Falls back silently. ── */
const tryShowKeyboard = () => {
  try {
    if (window.webOS && window.webOS.keyboard && typeof window.webOS.keyboard.show === "function") {
      window.webOS.keyboard.show();
    }
  } catch { /* ignore */ }
};

const Feedback = () => {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { isSubmitting, submitFeedback } = useFeedbackStore();
  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";

  /* ── Zoned focus engine — pure DOM, zero re-renders on key press ──
   * Zones: back | stars | textarea | buttons
   */
  const activeZoneRef = useRef("back");
  const focusedStarRef = useRef(0); // 0..4
  const focusedBtnRef = useRef(0);  // 0=Cancel, 1=Submit

  const backBtnRef = useRef(null);
  const starRefs = useRef([]);
  const textareaRef = useRef(null);
  const buttonRefs = useRef([]); // [cancel, submit]

  /* ── Keep stable refs to handlers used inside the keydown listener ── */
  const handleCancel = useCallback(() => {
    navigate("/home", { replace: true });
  }, [navigate]);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) { setError("Please select a rating"); return; }
    if (!feedback.trim()) { setError("Please enter detailed feedback"); return; }
    try {
      setError("");
      const response = await submitFeedback({
        userid, mobile,
        rate_count: rating.toString(),
        feedback,
        mac_address: "26:F2:AE:D8:3F:99",
        device_name: "rk3368_box",
        device_type: "FOFI"
      });
      if (response.success) {
        setRating(0);
        setFeedback("");
        setShowSuccessModal(true);
        // SuccessModal's onComplete navigates to /home
      } else {
        setError(response.message || "Failed to submit feedback");
      }
    } catch (err) {
      setError("Failed to submit feedback. Please try again.");
      console.error(err);
    }
  }, [rating, feedback, userid, mobile, submitFeedback]);

  const handleCancelRef = useRef(handleCancel);
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleCancelRef.current = handleCancel; }, [handleCancel]);
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  /* ── Focus helpers ── */
  const clearFocusedInZone = (zone) => {
    if (zone === "back") { backBtnRef.current?.removeAttribute("data-focused"); return; }
    if (zone === "stars") { starRefs.current[focusedStarRef.current]?.removeAttribute("data-focused"); return; }
    if (zone === "textarea") { textareaRef.current?.removeAttribute("data-focused"); return; }
    if (zone === "buttons") { buttonRefs.current[focusedBtnRef.current]?.removeAttribute("data-focused"); return; }
  };

  const applyFocusedInZone = (zone) => {
    if (zone === "back") { backBtnRef.current?.setAttribute("data-focused", "true"); return; }
    if (zone === "stars") { starRefs.current[focusedStarRef.current]?.setAttribute("data-focused", "true"); return; }
    if (zone === "textarea") { textareaRef.current?.setAttribute("data-focused", "true"); return; }
    if (zone === "buttons") { buttonRefs.current[focusedBtnRef.current]?.setAttribute("data-focused", "true"); return; }
  };

  const switchZone = useCallback((newZone) => {
    const oldZone = activeZoneRef.current;
    if (oldZone === newZone) return;
    clearFocusedInZone(oldZone);
    activeZoneRef.current = newZone;
    applyFocusedInZone(newZone);
  }, []);

  const moveStar = useCallback((delta) => {
    const next = Math.max(0, Math.min(4, focusedStarRef.current + delta));
    if (next === focusedStarRef.current) return;
    starRefs.current[focusedStarRef.current]?.removeAttribute("data-focused");
    focusedStarRef.current = next;
    starRefs.current[next]?.setAttribute("data-focused", "true");
  }, []);

  const moveBtn = useCallback((delta) => {
    const next = Math.max(0, Math.min(1, focusedBtnRef.current + delta));
    if (next === focusedBtnRef.current) return;
    buttonRefs.current[focusedBtnRef.current]?.removeAttribute("data-focused");
    focusedBtnRef.current = next;
    buttonRefs.current[next]?.setAttribute("data-focused", "true");
  }, []);

  /* ── Initial focus on mount: zone "back" ── */
  useEffect(() => {
    backBtnRef.current?.setAttribute("data-focused", "true");
  }, []);

  /* ── Single capture-phase keydown handler ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      const kc = e.keyCode;
      const isBack = kc === TV_KEYS.BACK || e.key === "GoBack" || e.key === "Back";
      const isOK = kc === TV_KEYS.OK || e.key === "Enter";
      const isLeft = kc === TV_KEYS.LEFT || e.key === "ArrowLeft";
      const isRight = kc === TV_KEYS.RIGHT || e.key === "ArrowRight";
      const isUp = kc === TV_KEYS.UP || e.key === "ArrowUp";
      const isDown = kc === TV_KEYS.DOWN || e.key === "ArrowDown";

      const zone = activeZoneRef.current;
      const taActive = document.activeElement === textareaRef.current;

      /* ── BACKSPACE/RED while typing in textarea — delete last char ── */
      if ((kc === TV_KEYS.BACKSPACE || kc === TV_KEYS.RED) && taActive) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setFeedback((f) => f.slice(0, -1));
        return;
      }

      /* ── BACK key — must override GlobalBackHandler in App.js ── */
      if (isBack) {
        // Special case: when textarea is the active element, BACK is dispatched by
        // the on-screen keyboard's Close/Delete buttons. Just blur (close the
        // keyboard) — DO NOT navigate.
        if (taActive) {
          e.preventDefault();
          e.stopImmediatePropagation();
          textareaRef.current?.blur();
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        handleCancelRef.current?.();
        return;
      }

      /* ── Don't intercept arrow keys while user is typing in textarea ── */
      if (taActive) return;

      /* ── Zone "back" ── */
      if (zone === "back") {
        if (isDown) { e.preventDefault(); switchZone("stars"); return; }
        if (isOK) { e.preventDefault(); handleCancelRef.current?.(); return; }
        return;
      }

      /* ── Zone "stars" ── */
      if (zone === "stars") {
        if (isLeft) { e.preventDefault(); moveStar(-1); return; }
        if (isRight) { e.preventDefault(); moveStar(1); return; }
        if (isUp) { e.preventDefault(); switchZone("back"); return; }
        if (isDown) { e.preventDefault(); switchZone("textarea"); return; }
        if (isOK) { e.preventDefault(); setRating(focusedStarRef.current + 1); return; }
        return;
      }

      /* ── Zone "textarea" ── */
      if (zone === "textarea") {
        if (isUp) { e.preventDefault(); switchZone("stars"); return; }
        if (isDown) { e.preventDefault(); switchZone("buttons"); return; }
        if (isOK) {
          e.preventDefault();
          // Focus the textarea then try to summon the on-screen keyboard.
          textareaRef.current?.focus();
          tryShowKeyboard();
          return;
        }
        return;
      }

      /* ── Zone "buttons" ── */
      if (zone === "buttons") {
        if (isLeft) { e.preventDefault(); moveBtn(-1); return; }
        if (isRight) { e.preventDefault(); moveBtn(1); return; }
        if (isUp) { e.preventDefault(); switchZone("textarea"); return; }
        if (isOK) {
          e.preventDefault();
          if (focusedBtnRef.current === 0) handleCancelRef.current?.();
          else handleSubmitRef.current?.();
          return;
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [switchZone, moveStar, moveBtn]);

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "#fff", padding: "40px", fontFamily: '"Roboto","Helvetica","Arial",sans-serif', letterSpacing: "0.3px" }}>
      {/* Back Button — Zone "back" */}
      <button
        ref={backBtnRef}
        tabIndex={-1}
        className="focusable-feedback-back"
        onClick={handleCancel}
        style={{
          color: "#fff",
          marginBottom: "32px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px",
          border: "2px solid rgba(255,255,255,0.4)",
          borderRadius: "10px",
          background: "none",
          cursor: "pointer",
          transition: "all 0.2s"
        }}
      >
        <ArrowBackIcon />
        <span style={{ fontSize: "20px", fontWeight: 600 }}>Back</span>
      </button>

      {/* Main Content */}
      <div style={{ maxWidth: "880px", margin: "0 auto", border: "2px solid rgba(255,255,255,0.3)", borderRadius: "24px", padding: "48px" }}>
        <p style={{ fontSize: "38px", fontWeight: 700, marginBottom: "12px", lineHeight: 1.1 }}>Give Feedback</p>
        <p style={{ fontSize: "20px", color: "#999", marginBottom: "40px" }}>Help us improving viewer experience</p>

        <div style={{ border: "2px solid rgba(255,255,255,0.3)", borderRadius: "18px", padding: "36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
            <div style={{ width: "32px", height: "32px", border: "2px solid #fff", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📝</div>
            <div>
              <p style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>Submit Feedback</p>
              <p style={{ fontSize: "18px", color: "#999", margin: 0 }}>Tell us about experience</p>
            </div>
          </div>

          {/* Star Rating — Zone "stars" */}
          <div style={{ marginBottom: "32px" }}>
            <p style={{ fontSize: "19px", marginBottom: "12px", color: "#fff", fontWeight: 600 }}>How would you rate us?</p>
            <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
              {[1, 2, 3, 4, 5].map((star, i) => (
                <button
                  key={star}
                  ref={(el) => { starRefs.current[i] = el; }}
                  tabIndex={-1}
                  className="focusable-feedback-star"
                  onClick={() => {
                    // Sync focus zone + index to clicked star, then set rating
                    if (activeZoneRef.current !== "stars") switchZone("stars");
                    if (focusedStarRef.current !== i) {
                      starRefs.current[focusedStarRef.current]?.removeAttribute("data-focused");
                      focusedStarRef.current = i;
                      starRefs.current[i]?.setAttribute("data-focused", "true");
                    }
                    setRating(star);
                  }}
                  style={{
                    color: star <= rating ? "#ffd700" : "rgba(255,255,255,0.3)",
                    padding: "4px",
                    outline: "none",
                    border: "2px solid transparent",
                    borderRadius: "8px",
                    background: "none",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {star <= rating ? <StarFilledIcon /> : <StarOutlineIcon />}
                </button>
              ))}
            </div>
            <p style={{ fontSize: "17px", color: "#999" }}>Tap a star to rate</p>
          </div>

          {/* Detailed Feedback — Zone "textarea" */}
          <div style={{ marginBottom: "32px" }}>
            <p style={{ fontSize: "19px", marginBottom: "12px", color: "#fff", fontWeight: 600 }}>Detailed Feedback <span style={{ color: "red" }}>*</span></p>
            <textarea
              ref={textareaRef}
              tabIndex={-1}
              className="focusable-feedback-textarea"
              rows={5}
              placeholder="What did you like? what can we do better?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onClick={() => {
                if (activeZoneRef.current !== "textarea") switchZone("textarea");
              }}
              style={{
                width: "100%",
                color: "#fff",
                background: "#1a1a1a",
                borderRadius: "12px",
                fontSize: "18px",
                outline: "none",
                border: "2px solid rgba(255,255,255,0.3)",
                padding: "16px",
                boxSizing: "border-box",
                resize: "vertical",
                transition: "all 0.2s"
              }}
            />
          </div>

          {error && <div style={{ marginBottom: "24px", padding: "24px", borderRadius: "12px", border: "2px solid red", background: "rgba(255,0,0,0.15)", color: "#ff6b6b" }}><p style={{ fontSize: "18px", margin: 0 }}>{error}</p></div>}

          {/* Buttons — Zone "buttons" */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "24px" }}>
            <button
              ref={(el) => { buttonRefs.current[0] = el; }}
              tabIndex={-1}
              className="focusable-feedback-button"
              onClick={handleCancel}
              style={{
                padding: "0 40px",
                fontSize: "19px",
                fontWeight: 600,
                color: "#fff",
                background: "#2a2a2a",
                borderRadius: "12px",
                minHeight: "52px",
                outline: "none",
                border: "2px solid transparent",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              ref={(el) => { buttonRefs.current[1] = el; }}
              tabIndex={-1}
              className="focusable-feedback-button"
              onClick={handleSubmit}
              style={{
                padding: "0 40px",
                fontSize: "19px",
                fontWeight: 600,
                color: "#fff",
                background: "#0066ff",
                borderRadius: "12px",
                minHeight: "52px",
                outline: "none",
                border: "2px solid transparent",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <SuccessModal onComplete={() => navigate("/home", { replace: true })} />
      )}
    </div>
  );
};

export default Feedback;

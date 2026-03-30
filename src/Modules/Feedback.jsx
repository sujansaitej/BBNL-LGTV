import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useFeedbackStore from "../store/FeedbackStore";
import { useEnhancedRemoteNavigation, TV_KEYS } from "../Remote/useMagicRemote";

const ArrowBackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>;
const StarFilledIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="42" height="42" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>;
const StarOutlineIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="42" height="42" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" /></svg>;

const Feedback = () => {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const { isSubmitting, submitFeedback } = useFeedbackStore();
  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";

  const backBtnRef = useRef(null);
  const textareaRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const submitBtnRef = useRef(null);

  /* ── Interactive items order: back, stars(0-4), textarea, cancel, submit ── */
  const interactiveItems = [
    { type: "button", label: "Back" },
    ...Array(5).fill({ type: "star" }),
    { type: "textarea" },
    { type: "button", label: "Cancel" },
    { type: "button", label: "Submit" }
  ];

  const { getItemProps } = useEnhancedRemoteNavigation(interactiveItems, {
    orientation: "vertical", useMagicRemotePointer: true, focusThreshold: 120,
    onSelect: (index) => {
      if (index === 0) handleCancel();
      else if (index >= 1 && index <= 5) setRating(index);
      else if (index === 6) { /* textarea — focus it for keyboard */ textareaRef.current?.focus(); }
      else if (index === 7) handleCancel();
      else if (index === 8) handleSubmit();
    },
  });

  /* ── Handle submit ── */
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
        setSuccessMessage(response.data?.status?.err_msg || "Thank you for your feedback!");
        setRating(0);
        setFeedback("");
        setTimeout(() => { setSuccessMessage(""); navigate(-1); }, 3000);
      } else {
        setError(response.message || "Failed to submit feedback");
      }
    } catch (err) {
      setError("Failed to submit feedback. Please try again.");
      console.error(err);
    }
  }, [rating, feedback, userid, mobile, submitFeedback, navigate]);

  /* ── Handle cancel ── */
  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  /* ── Remote key handler for textarea focus and key management ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      const kc = e.keyCode;

      /* ── BACK (461) — Go back to previous page ── */
      if (kc === TV_KEYS.BACK || e.key === "GoBack" || e.key === "Back") {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
        return;
      }

      /* ── DELETE/BACKSPACE (8, 403) in textarea — Delete last character ── */
      if ((kc === TV_KEYS.BACKSPACE || kc === TV_KEYS.RED) && document.activeElement === textareaRef.current) {
        e.preventDefault();
        e.stopPropagation();
        setFeedback((f) => f.slice(0, -1));
        return;
      }

      /* ── OK (13) when Submit button focused — Submit feedback ── */
      if (kc === TV_KEYS.OK) {
        if (document.activeElement === submitBtnRef.current) {
          e.preventDefault();
          e.stopPropagation();
          handleSubmit();
          return;
        }
        /* ── OK (13) when Cancel button focused — Cancel ── */
        if (document.activeElement === cancelBtnRef.current) {
          e.preventDefault();
          e.stopPropagation();
          handleCancel();
          return;
        }
        /* ── OK (13) when Back button focused — Go back ── */
        if (document.activeElement === backBtnRef.current) {
          e.preventDefault();
          e.stopPropagation();
          handleCancel();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleCancel, handleSubmit]);

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "#fff", padding: "40px", fontFamily: '"Roboto","Helvetica","Arial",sans-serif', letterSpacing: "0.3px" }}>
      {/* Back Button — Now part of remote navigation */}
      <button
        ref={backBtnRef}
        {...getItemProps(0)}
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

          {/* Star Rating */}
          <div style={{ marginBottom: "32px" }}>
            <p style={{ fontSize: "19px", marginBottom: "12px", color: "#fff", fontWeight: 600 }}>How would you rate us?</p>
            <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  {...getItemProps(star)}
                  onClick={() => setRating(star)}
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

          {/* Detailed Feedback */}
          <div style={{ marginBottom: "32px" }}>
            <p style={{ fontSize: "19px", marginBottom: "12px", color: "#fff", fontWeight: 600 }}>Detailed Feedback <span style={{ color: "red" }}>*</span></p>
            <textarea
              ref={textareaRef}
              {...getItemProps(6)}
              rows={5}
              placeholder="What did you like? what can we do better?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
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
          {successMessage && <div style={{ marginBottom: "24px", padding: "24px", borderRadius: "12px", border: "2px solid #4caf50", background: "rgba(76,175,80,0.15)", color: "#4caf50", textAlign: "center" }}><p style={{ fontSize: "19px", fontWeight: 600, margin: 0 }}>✓ {successMessage}</p></div>}

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "24px" }}>
            <button
              ref={cancelBtnRef}
              {...getItemProps(7)}
              onClick={handleCancel}
              disabled={isSubmitting}
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
              ref={submitBtnRef}
              {...getItemProps(8)}
              onClick={handleSubmit}
              disabled={isSubmitting}
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
    </div>
  );
};

export default Feedback;

import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { fetchLanguages } from "../server/modules-api/LanguageChannelsApi";
import { getDefaultHeaders } from "../server/config";
import { useTapAction } from "../Remote/useTapAction";

const ArrowBackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>;

const COLS = 7;
const KEY_THROTTLE = 80;

const LanguageChannels = () => {
  const navigate = useNavigate();
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";
  const headers = getDefaultHeaders();

  // ── Ref-based zone focus — zero re-renders on keypress ──
  const zoneRef = useRef("grid"); // "back" | "grid"
  const focusIdxRef = useRef(0);
  const itemRefs = useRef([]);
  const backBtnRef = useRef(null);
  const lastKeyTime = useRef(0);
  const languagesRef = useRef([]);
  useEffect(() => { languagesRef.current = languages; }, [languages]);

  const clearFocus = useCallback((zone) => {
    if (zone === "back") {
      if (backBtnRef.current) backBtnRef.current.removeAttribute("data-focused");
    } else {
      const oldEl = itemRefs.current[focusIdxRef.current];
      if (oldEl) oldEl.removeAttribute("data-focused");
    }
  }, []);

  const applyFocus = useCallback((zone, idx) => {
    if (zone === "back") {
      if (backBtnRef.current) {
        backBtnRef.current.setAttribute("data-focused", "true");
        backBtnRef.current.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    } else {
      const newEl = itemRefs.current[idx];
      if (newEl) {
        newEl.setAttribute("data-focused", "true");
        newEl.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      focusIdxRef.current = idx;
    }
  }, []);

  const setGridFocus = useCallback((newIdx) => {
    const oldIdx = focusIdxRef.current;
    if (oldIdx !== newIdx) {
      const oldEl = itemRefs.current[oldIdx];
      if (oldEl) oldEl.removeAttribute("data-focused");
    }
    applyFocus("grid", newIdx);
  }, [applyFocus]);

  const switchZone = useCallback((newZone) => {
    const oldZone = zoneRef.current;
    if (oldZone === newZone) return;
    clearFocus(oldZone);
    zoneRef.current = newZone;
    applyFocus(newZone, focusIdxRef.current);
  }, [clearFocus, applyFocus]);

  // Apply initial focus when languages load
  useEffect(() => {
    if (languages.length > 0) {
      const prevEl = itemRefs.current[focusIdxRef.current];
      if (prevEl) prevEl.removeAttribute("data-focused");
      zoneRef.current = "grid";
      focusIdxRef.current = 0;
      const el = itemRefs.current[0];
      if (el) el.setAttribute("data-focused", "true");
    }
  }, [languages]);

  const handleLanguageClickRaw = useCallback((langid, langtitle) => {
    if (langid === "subs") {
      navigate("/live-channels", { state: { filter: "Subscribed Channels" } });
    } else if (langid === "") {
      navigate("/live-channels", { state: { filter: "All Channels" } });
    } else {
      navigate("/live-channels", { state: { filterByLanguage: langid, languageTitle: langtitle } });
    }
  }, [navigate]);
  const handleLanguageClick = useTapAction(handleLanguageClickRaw);

  // ── Single capture-phase keydown handler ──
  useEffect(() => {
    const handleKey = (e) => {
      const kc = e.keyCode;
      const isArrow = kc >= 37 && kc <= 40;
      const isEnter = kc === 13;
      if (!isArrow && !isEnter) return;

      // Throttle held keys
      const now = Date.now();
      if (isArrow && now - lastKeyTime.current < KEY_THROTTLE) { e.preventDefault(); e.stopPropagation(); return; }
      lastKeyTime.current = now;

      e.preventDefault();
      e.stopPropagation();

      const zone = zoneRef.current;

      if (zone === "back") {
        if (kc === 40) { // DOWN → grid
          if (languagesRef.current.length > 0) switchZone("grid");
        } else if (isEnter) {
          navigate(-1);
        }
      } else {
        const count = languagesRef.current.length;
        if (count === 0) return;
        const cur = focusIdxRef.current;

        if (kc === 39) { // RIGHT
          if (cur + 1 < count) setGridFocus(cur + 1);
        } else if (kc === 37) { // LEFT
          if (cur - 1 >= 0) setGridFocus(cur - 1);
        } else if (kc === 40) { // DOWN
          const next = cur + COLS;
          if (next < count) setGridFocus(next);
        } else if (kc === 38) { // UP
          const next = cur - COLS;
          if (next >= 0) setGridFocus(next);
          else switchZone("back");
        } else if (isEnter) {
          const lang = languagesRef.current[cur];
          if (lang) handleLanguageClick(lang.langid, lang.langtitle);
        }
      }
    };

    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [setGridFocus, switchZone, handleLanguageClick, navigate]);

  // ── Fetch languages ──
  useEffect(() => {
    if (!mobile) { setError("NO_LOGIN"); return; }
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchLanguages({ userid, mobile }, headers);
        setLanguages(data || []);
      } catch (err) {
        setError("Failed to load languages");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  if (error === "NO_LOGIN") {
    return (
      <div style={{ background: "#000", minHeight: "100vh", color: "#fff", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>Login Required</p>
        <p style={{ fontSize: "16px", color: "#999", marginBottom: "8px" }}>Please log in with your phone number to view TV channels.</p>
        <button onClick={() => navigate("/login")} style={{ padding: "12px 32px", fontSize: "16px", fontWeight: 600, background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", marginTop: "16px" }}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="hide-scrollbar" style={{ background: "#000", width: "100%", height: "100vh", overflowY: "auto", overflowX: "hidden", color: "#fff", padding: "24px 32px 32px 32px", fontFamily: '"Roboto","Helvetica","Arial",sans-serif' }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px" }}>
        <div
          ref={backBtnRef}
          className="focusable-button"
          role="button"
          tabIndex={-1}
          onClick={() => navigate(-1)}
          style={{ width: "50px", height: "50px", borderRadius: "12px", border: "2px solid rgba(255,255,255,0.3)", background: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", outline: "none", flexShrink: 0 }}
        >
          <ArrowBackIcon />
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <p style={{ fontSize: "36px", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Select Language</p>
          <p style={{ fontSize: "18px", fontWeight: 400, margin: "6px 0 0 0", color: "#888" }}>Choose a language to filter channels</p>
        </div>
        <div style={{ width: "50px", flexShrink: 0 }} aria-hidden="true" />
      </div>

      {/* Error */}
      {error && error !== "NO_LOGIN" && (
        <div style={{ marginBottom: "24px", padding: "16px", borderRadius: "8px", border: "1px solid red", background: "rgba(255,0,0,0.15)", color: "#ff9a9a" }}>
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <>
          <style>{`@keyframes _shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: "12px", paddingBottom: "32px" }}>
            {Array.from({ length: COLS * 2 }).map((_, i) => (
              <div key={i} style={{ borderRadius: "16px", height: "calc((100vh - 200px) / 2.5)", background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%)", backgroundSize: "400px 100%", animation: "_shimmer 1.4s ease infinite" }} />
            ))}
          </div>
        </>
      )}

      {/* Language items — chrome-free: just logo + label, focus reveals surface */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: "12px", paddingBottom: "32px" }}>
          {languages.map((lang, index) => (
            <div
              key={index}
              ref={(el) => { itemRefs.current[index] = el; }}
              className="focusable-language-card"
              role="button"
              tabIndex={-1}
              onClick={() => handleLanguageClick(lang.langid, lang.langtitle)}
              style={{
                background: "transparent",
                borderRadius: "16px",
                padding: "16px 12px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "calc((100vh - 200px) / 2.5)",
                border: "3px solid transparent",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              {lang.langlogo && (
                <img
                  src={lang.langlogo}
                  alt={lang.langtitle}
                  loading="lazy"
                  decoding="async"
                  style={{ maxWidth: "80%", maxHeight: "55%", objectFit: "contain", marginBottom: "14px" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <p style={{ fontSize: "28px", fontWeight: 600, color: "#fff", textAlign: "center", margin: 0, lineHeight: 1.2, width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lang.langtitle}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && languages.length === 0 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <p style={{ fontSize: "18px", color: "#999" }}>No languages available</p>
        </div>
      )}
    </div>
  );
};

export default LanguageChannels;

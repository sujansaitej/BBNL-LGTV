import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useLiveChannelsStore from "../store/LiveChannelsStore";
import useLanguageStore from "../store/LivePlayersStore";
import { isSubscribed } from "../utils/subscription";

const ChannelsSidebar = ({ onChannelSelect, currentChannel }) => {
  const [allChannels, setAllChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [languageCategories, setLanguageCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { categories: cachedCategories, channelsCache, fetchCategories, fetchChannels } = useLiveChannelsStore();
  const { fetchLanguages } = useLanguageStore();

  // Mutually-exclusive filter mode: "category" | "language"
  const [filterMode, setFilterMode] = useState("category");
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState(-1);

  // ── ALL navigation state in REFS — zero re-renders on keypress ──────────
  const activeZoneRef = useRef("categories"); // "categories" | "languages" | "channels"
  const focusedCatRef = useRef(0);
  const focusedLangRef = useRef(0);
  const focusedChRef = useRef(0);
  const catRefs = useRef([]);
  const langTabsRef = useRef([]);
  const chRefs = useRef([]);
  const channelListRef = useRef(null);
  const channelsRef = useRef([]);       // stable ref for filtered channels
  const categoriesRef = useRef([]);     // stable ref for categories array
  const languagesDataRef = useRef([]);  // stable ref for language tabs array
  const onChannelSelectRef = useRef(onChannelSelect);

  // Keep refs in sync
  useEffect(() => { categoriesRef.current = categories; }, [categories]);
  useEffect(() => { languagesDataRef.current = languageCategories; }, [languageCategories]);
  useEffect(() => { onChannelSelectRef.current = onChannelSelect; }, [onChannelSelect]);

  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";
  const payloadBase = useMemo(() => ({ userid, mobile }), [userid, mobile]);

  const formatPrice = (value) => {
    if (value === undefined || value === null) return "";
    const text = String(value).trim();
    if (!text) return "";
    if (text === "0" || text === "0.0" || text === "0.00") return "Free";
    return /^[0-9]+(\.[0-9]+)?$/.test(text) ? `₹${text}` : text;
  };

  // ── Load categories ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (cachedCategories.length > 0) {
          setCategories(cachedCategories);
        }
        const cats = await fetchCategories(payloadBase);
        setCategories(cats);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load language categories ─────────────────────────────────────────────
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const langs = await fetchLanguages(payloadBase);
        // Filter out catch-alls that duplicate the categories row
        const filtered = (Array.isArray(langs) ? langs : []).filter((l) => {
          const title = String(l?.langtitle || "").trim().toLowerCase();
          return title && title !== "all channels" && title !== "subscribed channels";
        });
        setLanguageCategories(filtered);
      } catch (err) {
        console.error("Failed to fetch languages:", err);
      }
    };
    loadLanguages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load ALL channels once (empty grid = all channels) ─────────────────
  useEffect(() => {
    const loadChannels = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = { ...payloadBase, grid: "" };
        const key = `${userid}|${mobile}|`;
        const cached = channelsCache[key]?.data;
        if (cached) setAllChannels(cached || []);
        const channelsData = await fetchChannels(payload, { key });
        setAllChannels(channelsData || []);
      } catch (err) {
        setError("Failed to load channels");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Client-side filtering ────────────────────────────────────────────────
  const channels = useMemo(() => {
    if (allChannels.length === 0) return allChannels;

    // Language filter wins when explicitly active
    if (filterMode === "language" && selectedLanguage >= 0) {
      const lang = languageCategories[selectedLanguage];
      if (!lang) return allChannels;
      const targetId = String(lang.langid || "").trim();
      if (!targetId) return allChannels;
      return allChannels.filter((c) => String(c.langid || "").trim() === targetId);
    }

    // Otherwise: category filter
    if (categories.length === 0) return allChannels;
    const activeCat = categories[selectedCategory];
    if (!activeCat) return allChannels;
    const activeTitle = activeCat.title;
    const activeGrid = activeCat.grid;

    if (activeTitle === "All Channels" || activeGrid === "") {
      return allChannels;
    }
    if (activeGrid === "subs" || activeTitle === "Subscribed Channels") {
      return allChannels.filter(isSubscribed);
    }
    return allChannels.filter((c) => c.grid === activeGrid);
  }, [allChannels, categories, selectedCategory, languageCategories, selectedLanguage, filterMode]);

  // Keep channelsRef in sync with filtered channels
  useEffect(() => { channelsRef.current = channels; }, [channels]);

  // Reset channel focus when filter changes
  useEffect(() => {
    focusedChRef.current = 0;
    chRefs.current.forEach((el) => { if (el) el.removeAttribute("data-focused"); });
  }, [selectedCategory, selectedLanguage, filterMode]);

  // ── Pure DOM focus — ZERO re-renders ────────────────────────────────────
  const moveFocus = useCallback((zone, newIndex) => {
    const refs = zone === "categories" ? catRefs
               : zone === "languages"  ? langTabsRef
               : chRefs;
    const prevRef = zone === "categories" ? focusedCatRef
                  : zone === "languages"  ? focusedLangRef
                  : focusedChRef;
    const oldIndex = prevRef.current;

    if (oldIndex !== newIndex) {
      const oldEl = refs.current[oldIndex];
      if (oldEl) oldEl.removeAttribute("data-focused");
    }

    const newEl = refs.current[newIndex];
    if (newEl) {
      newEl.setAttribute("data-focused", "true");
      newEl.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    prevRef.current = newIndex;
  }, []);

  // Switch between zones — clear old zone focus, apply new
  const switchZone = useCallback((newZone) => {
    const oldZone = activeZoneRef.current;
    if (oldZone === newZone) return;

    const oldRefs = oldZone === "categories" ? catRefs
                  : oldZone === "languages"  ? langTabsRef
                  : chRefs;
    const oldRef  = oldZone === "categories" ? focusedCatRef
                  : oldZone === "languages"  ? focusedLangRef
                  : focusedChRef;
    const oldEl = oldRefs.current[oldRef.current];
    if (oldEl) oldEl.removeAttribute("data-focused");

    activeZoneRef.current = newZone;

    const newRef = newZone === "categories" ? focusedCatRef
                 : newZone === "languages"  ? focusedLangRef
                 : focusedChRef;
    moveFocus(newZone, newRef.current);
  }, [moveFocus]);

  // ── Apply initial focus when component mounts or sidebar becomes visible
  useEffect(() => {
    if (categories.length > 0) {
      moveFocus("categories", focusedCatRef.current);
    }
  }, [categories.length, moveFocus]);

  // ── SINGLE keyboard handler — registered ONCE, reads from refs ──────────
  useEffect(() => {
    const handleKey = (e) => {
      const key = e.key;
      const kc = e.keyCode;
      const zone = activeZoneRef.current;

      if (zone === "categories") {
        if (key === "ArrowLeft" || kc === 37) {
          e.preventDefault(); e.stopPropagation();
          const next = Math.max(0, focusedCatRef.current - 1);
          if (next !== focusedCatRef.current) moveFocus("categories", next);
        } else if (key === "ArrowRight" || kc === 39) {
          e.preventDefault(); e.stopPropagation();
          const next = Math.min(categoriesRef.current.length - 1, focusedCatRef.current + 1);
          if (next !== focusedCatRef.current) moveFocus("categories", next);
        } else if (key === "ArrowDown" || kc === 40) {
          e.preventDefault(); e.stopPropagation();
          if (languagesDataRef.current.length > 0) {
            switchZone("languages");
          } else if (channelsRef.current.length > 0) {
            switchZone("channels");
          }
        } else if (key === "Enter" || kc === 13 || key === " ") {
          e.preventDefault(); e.stopPropagation();
          setFilterMode("category");
          setSelectedLanguage(-1);
          setSelectedCategory(focusedCatRef.current);
        }
      } else if (zone === "languages") {
        if (key === "ArrowLeft" || kc === 37) {
          e.preventDefault(); e.stopPropagation();
          const next = Math.max(0, focusedLangRef.current - 1);
          if (next !== focusedLangRef.current) moveFocus("languages", next);
        } else if (key === "ArrowRight" || kc === 39) {
          e.preventDefault(); e.stopPropagation();
          const next = Math.min(languagesDataRef.current.length - 1, focusedLangRef.current + 1);
          if (next !== focusedLangRef.current) moveFocus("languages", next);
        } else if (key === "ArrowUp" || kc === 38) {
          e.preventDefault(); e.stopPropagation();
          switchZone("categories");
        } else if (key === "ArrowDown" || kc === 40) {
          e.preventDefault(); e.stopPropagation();
          if (channelsRef.current.length > 0) switchZone("channels");
        } else if (key === "Enter" || kc === 13 || key === " ") {
          e.preventDefault(); e.stopPropagation();
          setFilterMode("language");
          setSelectedLanguage(focusedLangRef.current);
        }
      } else if (zone === "channels") {
        if (key === "ArrowUp" || kc === 38) {
          e.preventDefault(); e.stopPropagation();
          if (focusedChRef.current === 0) {
            if (languagesDataRef.current.length > 0) switchZone("languages");
            else switchZone("categories");
          } else {
            moveFocus("channels", focusedChRef.current - 1);
          }
        } else if (key === "ArrowDown" || kc === 40) {
          e.preventDefault(); e.stopPropagation();
          const next = Math.min(channelsRef.current.length - 1, focusedChRef.current + 1);
          if (next !== focusedChRef.current) moveFocus("channels", next);
        } else if (key === "Enter" || kc === 13 || key === " ") {
          e.preventDefault(); e.stopPropagation();
          const ch = channelsRef.current[focusedChRef.current];
          if (ch && onChannelSelectRef.current) onChannelSelectRef.current(ch);
        }
      }
    };

    // NOT capture phase — so LivePlayer's capture handler runs first
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [moveFocus, switchZone]); // stable deps only — never re-registers

  // ── Render ───────────────────────────────────────────────────────────────
  const isNowPlaying = (ch) => {
    if (!currentChannel || !ch) return false;
    return currentChannel.channelno && ch.channelno &&
      String(currentChannel.channelno) === String(ch.channelno);
  };

  return (
    <div style={{
      width: "400px",
      color: "#fff",
      background: "#0f1423",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      padding: "15px 15px 0",
      fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    }}>

      {/* ── Header ── */}
      <p style={{
        fontSize: "22px", fontWeight: 800, letterSpacing: "3px",
        color: "#a0aec0", margin: "0 0 12px 4px", textTransform: "uppercase",
      }}>
        LIVE TV
      </p>

      {/* ── Category Tabs ── */}
      <div className="hide-scrollbar" style={{
        display: "flex", gap: "10px", overflowX: "auto",
        paddingBottom: "8px", flexShrink: 0,
      }}>
        {categories.map((cat, idx) => {
          const isSelected = filterMode === "category" && selectedCategory === idx;
          return (
            <div
              key={cat.grid || cat.title || idx}
              ref={(el) => { catRefs.current[idx] = el; }}
              className="focusable-category-tab"
              data-selected={isSelected || undefined}
              onClick={() => {
                setFilterMode("category");
                setSelectedLanguage(-1);
                setSelectedCategory(idx);
                focusedCatRef.current = idx;
                activeZoneRef.current = "categories";
                moveFocus("categories", idx);
              }}
              style={{
                height: "40px", padding: "0 20px", fontSize: "20px", fontWeight: 700,
                color: isSelected ? "#fff" : "#a0aec0",
                backgroundColor: isSelected ? "#2563eb" : "transparent",
                borderRadius: "9999px",
                border: isSelected ? "2px solid #2563eb" : "1.5px solid #2d3748",
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, outline: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {cat.title}
            </div>
          );
        })}
      </div>

      {/* ── Language Tabs ── */}
      {languageCategories.length > 0 && (
        <div className="hide-scrollbar" style={{
          display: "flex", gap: "8px", overflowX: "auto",
          paddingTop: "6px", paddingBottom: "10px", flexShrink: 0,
        }}>
          {languageCategories.map((lang, idx) => {
            const isSelected = filterMode === "language" && selectedLanguage === idx;
            return (
              <div
                key={lang.langid || lang.langtitle || idx}
                ref={(el) => { langTabsRef.current[idx] = el; }}
                className="focusable-language-tab"
                data-selected={isSelected || undefined}
                onClick={() => {
                  setFilterMode("language");
                  setSelectedLanguage(idx);
                  focusedLangRef.current = idx;
                  activeZoneRef.current = "languages";
                  moveFocus("languages", idx);
                }}
                style={{
                  height: "34px", padding: "0 16px", fontSize: "17px", fontWeight: 700,
                  color: isSelected ? "#fff" : "#a0aec0",
                  backgroundColor: isSelected ? "#7c3aed" : "transparent",
                  borderRadius: "9999px",
                  border: isSelected ? "2px solid #7c3aed" : "1.5px solid #2d3748",
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, outline: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {lang.langtitle || "—"}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NOW WATCHING ── */}
      {currentChannel && (
        <>
          <p style={{
            fontSize: "18px", fontWeight: 800, letterSpacing: "2.5px",
            color: "#2563eb", margin: "8px 0 10px 4px", textTransform: "uppercase",
          }}>
            WATCHING Now
          </p>
          <div style={{
            display: "flex", alignItems: "center", gap: "14px",
            padding: "14px 16px", borderRadius: "14px",
            border: "1.5px solid #2563eb",
            backgroundColor: "#1a2340",
            marginBottom: "16px", flexShrink: 0,
          }}>
            {currentChannel.chlogo ? (
              <img src={currentChannel.chlogo} alt={currentChannel.chtitle} style={{
                width: "52px", height: "52px", objectFit: "contain", backgroundColor: "#fff",
                borderRadius: "12px", border: "1.5px solid #2d3748", flexShrink: 0,
              }} />
            ) : (
              <div style={{
                width: "52px", height: "52px", backgroundColor: "#1a2340",
                borderRadius: "12px", flexShrink: 0,
              }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: "26px", fontWeight: 700, color: "#fff",
                margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {currentChannel.chtitle}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: "#22c55e", display: "inline-block",
                }} />
                <span style={{ fontSize: "18px", fontWeight: 700, color: "#22c55e" }}>LIVE</span>
              </div>
            </div>
            <span style={{ fontSize: "30px", fontWeight: 800, color: "#60a5fa", flexShrink: 0 }}>
              {currentChannel.channelno}
            </span>
          </div>
        </>
      )}

      {/* ── CHANNELS header ── */}
      <p style={{
        fontSize: "18px", fontWeight: 800, letterSpacing: "2.5px",
        color: "#a0aec0", margin: "0 0 10px 4px", textTransform: "uppercase",
      }}>
        CHANNELS
      </p>

      {/* ── Channel List ── */}
      <div ref={channelListRef} className="hide-scrollbar" style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
        {loading && (
          <p style={{ textAlign: "center", fontSize: "20px", fontWeight: 600, color: "#a0aec0", marginTop: "40px" }}>
            Loading channels...
          </p>
        )}
        {error && (
          <p style={{ textAlign: "center", fontSize: "18px", fontWeight: 600, color: "#f44336", marginTop: "40px" }}>{error}</p>
        )}
        {!loading && !error && channels.length === 0 && (
          <p style={{ textAlign: "center", fontSize: "18px", fontWeight: 600, color: "#718096", marginTop: "40px" }}>
            No channels found
          </p>
        )}

        {channels.map((channel, index) => {
          const isPlaying = isNowPlaying(channel);
          const locked = !isSubscribed(channel);
          const priceLabel = formatPrice(channel.chprice);

          return (
            <div
              // PERF: stable key — channelno → channelid → fallback. Index left
              // out so React can keep <img> elements when the filter changes,
              // preventing logo re-fetches on every category click (B.10/B.11).
              key={channel.channelno || channel.channelid || index}
              ref={(el) => { chRefs.current[index] = el; }}
              className="focusable-sidebar-item"
              onClick={() => {
                if (onChannelSelect) onChannelSelect(channel);
              }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "14px",
                borderRadius: "14px", padding: "12px 14px", marginBottom: "4px",
                backgroundColor: isPlaying ? "#1a2340" : "transparent",
                border: "2px solid transparent",
                cursor: "pointer", textAlign: "left", color: "#fff", outline: "none",
                opacity: locked ? 0.55 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {/* Logo (with padlock overlay if locked) */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                {channel.chlogo ? (
                  <img src={channel.chlogo} alt={channel.chtitle} style={{
                    width: "52px", height: "52px", objectFit: "contain", backgroundColor: "#fff",
                    borderRadius: "12px", border: "1.5px solid #2d3748",
                  }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = "none"; }} />
                ) : (
                  <div style={{
                    width: "52px", height: "52px", backgroundColor: "#1a2340",
                    borderRadius: "12px", border: "1.5px solid #2d3748",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                      <path d="M9 8L9 16L17 12L9 8Z" fill="rgba(255,255,255,0.15)" />
                    </svg>
                  </div>
                )}
                {locked && (
                  <div style={{
                    position: "absolute", right: -4, bottom: -4,
                    width: "24px", height: "24px",
                    borderRadius: "50%",
                    background: "#0F1729",
                    border: "1.5px solid #F4BF1F",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#F4BF1F",
                  }} aria-label="locked">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: "24px", fontWeight: 700, margin: 0,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  color: "#e2e8f0",
                }}>
                  {channel.chtitle}
                </p>
                {priceLabel && (
                  <p style={{
                    fontSize: "20px", fontWeight: 700, margin: "4px 0 0",
                    color: locked ? "#F4BF1F" : "#EC1946",
                  }}>
                    {locked ? `${priceLabel} · Subscribe` : priceLabel}
                  </p>
                )}
              </div>

              {/* Channel Number */}
              <span style={{
                fontSize: "24px", fontWeight: 800, color: "#e2e8f0",
                flexShrink: 0, minWidth: "3rem", textAlign: "right",
              }}>
                {channel.channelno}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChannelsSidebar;

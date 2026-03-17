import { useState, useEffect, useRef, useCallback } from "react";

import useLiveChannelsStore from "../store/LiveChannelsStore";

const ChannelsSidebar = ({ onChannelSelect, currentChannel }) => {
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { categories: cachedCategories, channelsCache, fetchCategories, fetchChannels } = useLiveChannelsStore();
  const [selectedCategory, setSelectedCategory] = useState(0);

  // Navigation: two zones — "categories" (horizontal) and "channels" (vertical)
  const [activeZone, setActiveZone] = useState("categories");
  const [focusedCatIndex, setFocusedCatIndex] = useState(0);
  const [focusedChIndex, setFocusedChIndex] = useState(0);

  const catRefs = useRef([]);
  const chRefs = useRef([]);
  const channelListRef = useRef(null);

  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";
  const payloadBase = { userid, mobile };

  const formatPrice = (value) => {
    if (value === undefined || value === null) return "";
    const text = String(value).trim();
    if (!text) return "";
    if (text === "0" || text === "0.0" || text === "0.00") return "Free";
    return /^[0-9]+(\.[0-9]+)?$/.test(text) ? `\u20B9${text}` : text;
  };

  // ── Load categories ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (cachedCategories.length > 0) {
          setCategories([{ title: "All", grid: "" }, ...cachedCategories]);
        }
        const cats = await fetchCategories(payloadBase);
        setCategories([{ title: "All", grid: "" }, ...cats]);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load channels on category change ─────────────────────────────────────
  useEffect(() => {
    const loadChannels = async () => {
      try {
        setLoading(true);
        setError("");
        const currentGrid = categories[selectedCategory]?.grid || "";
        const payload = { ...payloadBase, grid: currentGrid };
        const key = `${userid}|${mobile}|${currentGrid}`;
        const cached = channelsCache[key]?.data;
        if (cached) setChannels(cached || []);
        const channelsData = await fetchChannels(payload, { key });
        setChannels(channelsData || []);
      } catch (err) {
        setError("Failed to load channels");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (categories.length > 0) loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, categories]);

  // Reset channel focus when category changes
  useEffect(() => {
    setFocusedChIndex(0);
  }, [selectedCategory]);

  // ── Focus helpers (pure DOM) ─────────────────────────────────────────────
  const applyFocus = useCallback((zone, index) => {
    const refs = zone === "categories" ? catRefs : chRefs;
    refs.current.forEach((el) => {
      if (el) {
        el.removeAttribute("data-focused");
        el.setAttribute("tabindex", "-1");
      }
    });
    const el = refs.current[index];
    if (el) {
      el.setAttribute("data-focused", "true");
      el.setAttribute("tabindex", "0");
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (activeZone === "categories") {
      applyFocus("categories", focusedCatIndex);
    } else {
      applyFocus("channels", focusedChIndex);
    }
  }, [activeZone, focusedCatIndex, focusedChIndex, applyFocus]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      const key = e.key;

      if (activeZone === "categories") {
        if (key === "ArrowLeft") {
          e.preventDefault(); e.stopPropagation();
          setFocusedCatIndex((prev) => Math.max(0, prev - 1));
        } else if (key === "ArrowRight") {
          e.preventDefault(); e.stopPropagation();
          setFocusedCatIndex((prev) => Math.min(categories.length - 1, prev + 1));
        } else if (key === "ArrowDown") {
          e.preventDefault(); e.stopPropagation();
          if (channels.length > 0) {
            setActiveZone("channels");
            setFocusedChIndex(0);
          }
        } else if (key === "Enter" || key === " ") {
          e.preventDefault(); e.stopPropagation();
          setSelectedCategory(focusedCatIndex);
        }
      } else if (activeZone === "channels") {
        if (key === "ArrowUp") {
          e.preventDefault(); e.stopPropagation();
          if (focusedChIndex === 0) {
            setActiveZone("categories");
          } else {
            setFocusedChIndex((prev) => prev - 1);
          }
        } else if (key === "ArrowDown") {
          e.preventDefault(); e.stopPropagation();
          setFocusedChIndex((prev) => Math.min(channels.length - 1, prev + 1));
        } else if (key === "Enter" || key === " ") {
          e.preventDefault(); e.stopPropagation();
          const ch = channels[focusedChIndex];
          if (ch && onChannelSelect) onChannelSelect(ch);
        }
      }
    };

    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [activeZone, focusedCatIndex, focusedChIndex, categories.length, channels, onChannelSelect]);

  // ── Check if a channel is the one currently playing ──────────────────────
  const isNowPlaying = (ch) => {
    if (!currentChannel || !ch) return false;
    if (currentChannel.channelno && ch.channelno) return String(currentChannel.channelno) === String(ch.channelno);
    return false;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: "460px",
      background: "linear-gradient(180deg, #0a0e27 0%, #0d1233 50%, #080b1e 100%)",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      padding: "28px 20px 0",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>

      {/* ── Header ── */}
      <p style={{
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "2.5px",
        color: "rgba(255,255,255,0.4)",
        margin: "0 0 16px 4px",
        textTransform: "uppercase",
      }}>
        LIVE TV
      </p>

      {/* ── Category Tabs (LEFT/RIGHT) ── */}
      <div style={{
        display: "flex",
        gap: "10px",
        overflowX: "auto",
        paddingBottom: "20px",
        flexShrink: 0,
      }}>
        {categories.map((cat, idx) => {
          const isSelected = selectedCategory === idx;
          const isFocused = activeZone === "categories" && focusedCatIndex === idx;
          return (
            <button
              key={idx}
              ref={(el) => { catRefs.current[idx] = el; }}
              tabIndex={isFocused ? 0 : -1}
              onClick={() => { setSelectedCategory(idx); setFocusedCatIndex(idx); setActiveZone("categories"); }}
              style={{
                height: "38px",
                padding: "0 20px",
                fontSize: "15px",
                fontWeight: 600,
                color: isSelected ? "#fff" : "rgba(255,255,255,0.5)",
                backgroundColor: isSelected ? "#2563eb" : "transparent",
                borderRadius: "9999px",
                border: isFocused
                  ? "2px solid #60a5fa"
                  : isSelected
                    ? "2px solid #2563eb"
                    : "1.5px solid rgba(255,255,255,0.15)",
                boxShadow: isFocused ? "0 0 14px rgba(96,165,250,0.5)" : "none",
                transform: isFocused ? "scale(1.06)" : "scale(1)",
                transition: "all 0.15s ease",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                outline: "none",
              }}
            >
              {cat.title}
            </button>
          );
        })}
      </div>

      {/* ── NOW WATCHING ── */}
      {currentChannel && (
        <>
          <p style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "2px",
            color: "#2563eb",
            margin: "0 0 10px 4px",
            textTransform: "uppercase",
          }}>
            NOW WATCHING
          </p>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "14px 16px",
            borderRadius: "14px",
            border: "1.5px solid rgba(96,165,250,0.4)",
            backgroundColor: "rgba(37,99,235,0.08)",
            marginBottom: "20px",
            flexShrink: 0,
          }}>
            {currentChannel.chlogo ? (
              <img
                src={currentChannel.chlogo}
                alt={currentChannel.chtitle}
                style={{
                  width: "52px", height: "52px",
                  objectFit: "contain",
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: "52px", height: "52px",
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: "12px",
                flexShrink: 0,
              }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: "18px", fontWeight: 700, color: "#fff",
                margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {currentChannel.chtitle}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                <span style={{
                  width: "7px", height: "7px", borderRadius: "50%",
                  backgroundColor: "#22c55e", display: "inline-block",
                }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#22c55e" }}>LIVE</span>
              </div>
            </div>
            <span style={{
              fontSize: "22px", fontWeight: 800, color: "#60a5fa", flexShrink: 0,
            }}>
              {currentChannel.channelno}
            </span>
          </div>
        </>
      )}

      {/* ── CHANNELS header ── */}
      <p style={{
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "2px",
        color: "rgba(255,255,255,0.3)",
        margin: "0 0 10px 4px",
        textTransform: "uppercase",
      }}>
        CHANNELS
      </p>

      {/* ── Channel List (UP/DOWN) ── */}
      <div ref={channelListRef} style={{
        flex: 1,
        overflowY: "auto",
        paddingRight: "4px",
      }}>
        {loading && (
          <p style={{ textAlign: "center", fontSize: "16px", color: "rgba(255,255,255,0.4)", marginTop: "40px" }}>
            Loading channels...
          </p>
        )}
        {error && (
          <p style={{ textAlign: "center", fontSize: "16px", color: "#f44336", marginTop: "40px" }}>{error}</p>
        )}
        {!loading && !error && channels.length === 0 && (
          <p style={{ textAlign: "center", fontSize: "16px", color: "rgba(255,255,255,0.35)", marginTop: "40px" }}>
            No channels found
          </p>
        )}

        {channels.map((channel, index) => {
          const isFocused = activeZone === "channels" && focusedChIndex === index;
          const isPlaying = isNowPlaying(channel);
          const priceLabel = formatPrice(channel.chprice);

          return (
            <button
              key={`${channel.channelno}-${index}`}
              ref={(el) => { chRefs.current[index] = el; }}
              tabIndex={isFocused ? 0 : -1}
              onClick={() => { if (onChannelSelect) onChannelSelect(channel); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                borderRadius: "14px",
                padding: "12px 14px",
                marginBottom: "6px",
                backgroundColor: isFocused
                  ? "rgba(255,255,255,0.08)"
                  : isPlaying
                    ? "rgba(37,99,235,0.06)"
                    : "transparent",
                border: isFocused
                  ? "1.5px solid rgba(255,255,255,0.25)"
                  : "1.5px solid transparent",
                boxShadow: isFocused ? "0 4px 20px rgba(0,0,0,0.3)" : "none",
                transform: isFocused ? "scale(1.02)" : "scale(1)",
                transition: "all 0.15s ease",
                cursor: "pointer",
                textAlign: "left",
                color: "#fff",
                outline: "none",
              }}
            >
              {/* Logo */}
              {channel.chlogo ? (
                <img
                  src={channel.chlogo}
                  alt={channel.chtitle}
                  style={{
                    width: "52px", height: "52px",
                    objectFit: "contain",
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    border: "1.5px solid rgba(255,255,255,0.08)",
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling && (e.currentTarget.nextSibling.style.display = "flex");
                  }}
                />
              ) : null}
              {!channel.chlogo && (
                <div style={{
                  width: "52px", height: "52px",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderRadius: "12px",
                  border: "1.5px solid rgba(255,255,255,0.08)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
                    <path d="M9 8L9 16L17 12L9 8Z" fill="rgba(255,255,255,0.15)"/>
                  </svg>
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: isFocused ? "#fff" : "rgba(255,255,255,0.85)",
                }}>
                  {channel.chtitle}
                </p>
                {priceLabel && (
                  <p style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: priceLabel === "Free" ? "#22c55e" : "rgba(255,255,255,0.4)",
                    margin: "3px 0 0",
                  }}>
                    {priceLabel}
                  </p>
                )}
              </div>

              {/* Channel Number */}
              <span style={{
                fontSize: "18px",
                fontWeight: 700,
                color: isFocused ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                flexShrink: 0,
                minWidth: "2.5rem",
                textAlign: "right",
              }}>
                {channel.channelno}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChannelsSidebar;

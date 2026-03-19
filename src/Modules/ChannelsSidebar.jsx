import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useLiveChannelsStore from "../store/LiveChannelsStore";

const ChannelsSidebar = ({ onChannelSelect, currentChannel }) => {
  const [allChannels, setAllChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { categories: cachedCategories, channelsCache, fetchCategories, fetchChannels } = useLiveChannelsStore();
  const [selectedCategory, setSelectedCategory] = useState(0);

  // ── ALL navigation state in REFS — zero re-renders on keypress ──────────
  const activeZoneRef = useRef("categories"); // "categories" | "channels"
  const focusedCatRef = useRef(0);
  const focusedChRef = useRef(0);
  const catRefs = useRef([]);
  const chRefs = useRef([]);
  const channelListRef = useRef(null);
  const channelsRef = useRef([]);       // stable ref for filtered channels
  const categoriesRef = useRef([]);       // stable ref for categories array
  const onChannelSelectRef = useRef(onChannelSelect);

  // Keep refs in sync
  useEffect(() => { categoriesRef.current = categories; }, [categories]);
  useEffect(() => { onChannelSelectRef.current = onChannelSelect; }, [onChannelSelect]);

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

  // ── Client-side filtering (same logic as LiveChannels.jsx) ─────────────
  const channels = useMemo(() => {
    if (categories.length === 0) return allChannels;
    const activeCat = categories[selectedCategory];
    if (!activeCat) return allChannels;
    const activeTitle = activeCat.title;
    const activeGrid = activeCat.grid;

    // "All Channels" (grid: "") → show everything
    if (activeTitle === "All Channels" || activeGrid === "") {
      return allChannels;
    }
    // "Subscribed Channels" (grid: "subs") → filter by subscribed field
    if (activeGrid === "subs" || activeTitle === "Subscribed Channels") {
      return allChannels.filter((c) => c.subscribed === "yes");
    }
    // Other categories → filter by matching grid
    return allChannels.filter((c) => c.grid === activeGrid);
  }, [allChannels, categories, selectedCategory]);

  // Keep channelsRef in sync with filtered channels
  useEffect(() => { channelsRef.current = channels; }, [channels]);

  // Reset channel focus when category changes
  useEffect(() => {
    focusedChRef.current = 0;
    // Clear old DOM focus on channel items
    chRefs.current.forEach((el) => {
      if (el) { el.removeAttribute("data-focused"); }
    });
  }, [selectedCategory]);

  // ── Pure DOM focus — ZERO re-renders ────────────────────────────────────
  // Only removes data-focused from the OLD element, sets it on the NEW one.
  // No forEach loop over all refs.
  const moveFocus = useCallback((zone, newIndex) => {
    const refs = zone === "categories" ? catRefs : chRefs;
    const prevRef = zone === "categories" ? focusedCatRef : focusedChRef;
    const oldIndex = prevRef.current;

    // Remove from old
    if (oldIndex !== newIndex) {
      const oldEl = refs.current[oldIndex];
      if (oldEl) {
        oldEl.removeAttribute("data-focused");
      }
    }

    // Apply to new — NO el.focus() to avoid LG native focus ring on adjacent items
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

    // Remove focus from old zone's current item
    const oldRefs = oldZone === "categories" ? catRefs : chRefs;
    const oldRef = oldZone === "categories" ? focusedCatRef : focusedChRef;
    const oldEl = oldRefs.current[oldRef.current];
    if (oldEl) {
      oldEl.removeAttribute("data-focused");
    }

    activeZoneRef.current = newZone;

    // Apply focus in new zone
    const newRef = newZone === "categories" ? focusedCatRef : focusedChRef;
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
          if (channelsRef.current.length > 0) {
            switchZone("channels");
          }
        } else if (key === "Enter" || kc === 13 || key === " ") {
          e.preventDefault(); e.stopPropagation();
          setSelectedCategory(focusedCatRef.current);
        }
      } else if (zone === "channels") {
        if (key === "ArrowUp" || kc === 38) {
          e.preventDefault(); e.stopPropagation();
          if (focusedChRef.current === 0) {
            switchZone("categories");
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
        color: "#a0aec0", margin: "0 0 16px 4px", textTransform: "uppercase",
      }}>
        LIVE TV
      </p>

      {/* ── Category Tabs ── */}
      <div className="hide-scrollbar" style={{
        display: "flex", gap: "10px", overflowX: "auto",
        paddingBottom: "10px", flexShrink: 0,
      }}>
        {categories.map((cat, idx) => {
          const isSelected = selectedCategory === idx;
          return (
            <div
              key={idx}
              ref={(el) => { catRefs.current[idx] = el; }}
              className="focusable-category-tab"
              data-selected={isSelected || undefined}
              onClick={() => {
                setSelectedCategory(idx);
                focusedCatRef.current = idx;
                activeZoneRef.current = "categories";
                moveFocus("categories", idx);
              }}
              style={{
                height: "44px", padding: "0 24px", fontSize: "22px", fontWeight: 700,
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

      {/* ── NOW WATCHING ── */}
      {currentChannel && (
        <>
          <p style={{
            fontSize: "18px", fontWeight: 800, letterSpacing: "2.5px",
            color: "#2563eb", margin: "0 0 10px 4px", textTransform: "uppercase",
          }}>
            WATCHING Now
          </p>
          <div style={{
            display: "flex", alignItems: "center", gap: "14px",
            padding: "14px 16px", borderRadius: "14px",
            border: "1.5px solid #2563eb",
            backgroundColor: "#1a2340",
            marginBottom: "20px", flexShrink: 0,
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
          const priceLabel = formatPrice(channel.chprice);

          return (
            <div
              key={`${channel.channelno}-${index}`}
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
              }}
            >
              {/* Logo */}
              {channel.chlogo ? (
                <img src={channel.chlogo} alt={channel.chtitle} style={{
                  width: "52px", height: "52px", objectFit: "contain", backgroundColor: "#fff",
                  borderRadius: "12px", border: "1.5px solid #2d3748", flexShrink: 0,
                }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = "none"; }} />
              ) : (
                <div style={{
                  width: "52px", height: "52px", backgroundColor: "#1a2340",
                  borderRadius: "12px", border: "1.5px solid #2d3748", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                    <path d="M9 8L9 16L17 12L9 8Z" fill="rgba(255,255,255,0.15)" />
                  </svg>
                </div>
              )}

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
                    color: "#EC1946",
                  }}>
                    {priceLabel}
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

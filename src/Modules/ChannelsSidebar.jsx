import { useState, useEffect, useRef, useCallback, useMemo, forwardRef } from "react";
import useLiveChannelsStore from "../store/LiveChannelsStore";
import useLanguageStore from "../store/LivePlayersStore";
import { isSubscribed } from "../utils/subscription";

// ── Persist last-active tab across sidebar opens ─────────────────────────
const LAST_TAB_KEY = "bbnl_sidebar_last_tab_idx";
const loadLastTab = () => {
  try {
    const v = parseInt(localStorage.getItem(LAST_TAB_KEY) || "0", 10);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  } catch { return 0; }
};
const saveLastTab = (idx) => {
  try { localStorage.setItem(LAST_TAB_KEY, String(idx)); } catch {}
};

// ── Format helpers ───────────────────────────────────────────────────────
const formatPrice = (value) => {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (/^[0-9]+(\.[0-9]+)?$/.test(text)) {
    const n = Number(text);
    return `₹${n.toFixed(2)}`;
  }
  return text;
};

const VIRTUAL_CAT_TITLES = new Set(["all channels", "subscribed channels"]);

// Stable channel-equality for "is this the currently-playing one?". Used both
// for the cyan-dot marker and for auto-focus-on-current-channel when the user
// enters a content area.
const sameChannel = (a, b) => {
  if (!a || !b) return false;
  if (a.channelno && b.channelno) return String(a.channelno) === String(b.channelno);
  if (a.channelid && b.channelid) return String(a.channelid) === String(b.channelid);
  return false;
};

// Drop the categories endpoint's virtual entries so the inner category list
// only contains content categories (Entertainment/Movies/...).
const stripVirtualCategories = (cats) => {
  if (!Array.isArray(cats)) return [];
  return cats.filter((c) => {
    const t = String(c?.title || "").trim().toLowerCase();
    return t && !VIRTUAL_CAT_TITLES.has(t);
  });
};

const ChannelsSidebar = ({ onChannelSelect, currentChannel }) => {
  // ── Data state ───────────────────────────────────────────────────────────
  const [allChannels, setAllChannels] = useState([]);
  const [contentCategories, setContentCategories] = useState([]);
  const [languageOptions, setLanguageOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    categories: cachedCategories,
    channelsCache,
    fetchCategories,
    fetchChannels,
  } = useLiveChannelsStore();
  const { fetchLanguages } = useLanguageStore();

  // ── UI state ─────────────────────────────────────────────────────────────
  // activeTabIdx and expandedCat are the only React-state pieces that
  // influence the render tree. Everything else (focus zones, focus indices)
  // lives in refs to keep arrow-key navigation re-render-free.
  const [activeTabIdx, setActiveTabIdx] = useState(loadLastTab);
  const [expandedCat, setExpandedCat] = useState(-1);

  // ── Focus refs (zero re-renders on keypress) ─────────────────────────────
  const activeZoneRef = useRef("tabnav"); // "tabnav" | "categories" | "channels"
  const focusedCatRef = useRef(0);
  const focusedChRef = useRef(0);

  const tabnavRef = useRef(null);
  const catRefs = useRef([]);
  const chRefs = useRef([]);

  // ── Stable refs for handler reads (avoid stale closures) ────────────────
  const activeTabIdxRef = useRef(activeTabIdx);
  const expandedCatRef = useRef(expandedCat);
  const tabsRef = useRef([]);
  const groupsRef = useRef([]);
  const tabChannelsRef = useRef([]);
  const visibleChannelsRef = useRef([]);
  const currentChannelRef = useRef(currentChannel);
  const onChannelSelectRef = useRef(onChannelSelect);

  useEffect(() => { activeTabIdxRef.current = activeTabIdx; }, [activeTabIdx]);
  useEffect(() => { expandedCatRef.current = expandedCat; }, [expandedCat]);
  useEffect(() => { currentChannelRef.current = currentChannel; }, [currentChannel]);
  useEffect(() => { onChannelSelectRef.current = onChannelSelect; }, [onChannelSelect]);

  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";
  const payloadBase = useMemo(() => ({ userid, mobile }), [userid, mobile]);

  // ── Load categories ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (cachedCategories.length > 0) {
          setContentCategories(stripVirtualCategories(cachedCategories));
        }
        const cats = await fetchCategories(payloadBase);
        if (!cancelled) setContentCategories(stripVirtualCategories(cats));
      } catch {
        // keep going — sidebar still works without categories (only "All Channels" tab usable)
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load languages ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const langs = await fetchLanguages(payloadBase);
        if (cancelled) return;
        const filtered = (Array.isArray(langs) ? langs : []).filter((l) => {
          const title = String(l?.langtitle || "").trim().toLowerCase();
          return title && !VIRTUAL_CAT_TITLES.has(title);
        });
        setLanguageOptions(filtered);
      } catch {
        // languages absent → only Subscribed/All tabs render
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load all channels (one network call, then everything is in-memory) ──
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const key = `${userid}|${mobile}|`;
        const cached = channelsCache[key]?.data;
        if (cached && cached.length > 0) {
          setAllChannels(cached);
          setLoading(false);
        }
        const data = await fetchChannels({ ...payloadBase, grid: "" }, { key });
        if (!cancelled) setAllChannels(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setError("Failed to load channels");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Unified tab list ─────────────────────────────────────────────────────
  const tabs = useMemo(() => {
    const langTabs = languageOptions.map((l) => ({
      kind: "lang",
      title: l.langtitle || "—",
      langid: String(l.langid || "").trim(),
    }));
    return [
      { kind: "subscribed", title: "Subscribed Channels" },
      { kind: "all",        title: "All Channels" },
      ...langTabs,
    ];
  }, [languageOptions]);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);

  // Clamp activeTabIdx if the persisted value is now out of range.
  useEffect(() => {
    if (activeTabIdx >= tabs.length) {
      setActiveTabIdx(0);
    }
  }, [tabs.length, activeTabIdx]);

  const activeTab = tabs[activeTabIdx] || tabs[0];

  // ── Filter channels for the active tab ───────────────────────────────────
  const tabChannels = useMemo(() => {
    if (!activeTab || allChannels.length === 0) return [];
    if (activeTab.kind === "all") return allChannels;
    if (activeTab.kind === "subscribed") return allChannels.filter(isSubscribed);
    if (activeTab.kind === "lang") {
      const id = activeTab.langid;
      if (!id) return [];
      return allChannels.filter((c) => String(c.langid || "").trim() === id);
    }
    return [];
  }, [allChannels, activeTab]);
  useEffect(() => { tabChannelsRef.current = tabChannels; }, [tabChannels]);

  // ── Group channels by content category (skipped for "All Channels") ─────
  // Empty groups dropped so users never see "Sports (0)".
  const groups = useMemo(() => {
    if (!activeTab || activeTab.kind === "all") return [];
    if (contentCategories.length === 0 || tabChannels.length === 0) return [];
    return contentCategories
      .map((cat) => ({
        category: cat,
        channels: tabChannels.filter(
          (c) => String(c.grid || "").trim() === String(cat.grid || "").trim(),
        ),
      }))
      .filter((g) => g.channels.length > 0);
  }, [tabChannels, contentCategories, activeTab]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);

  // ── Channels currently visible to keyboard navigation ───────────────────
  // For "All Channels" → flat list. For grouped tabs → only the channels
  // inside the expanded group.
  const visibleChannels = useMemo(() => {
    if (!activeTab) return [];
    if (activeTab.kind === "all") return tabChannels;
    if (expandedCat < 0 || expandedCat >= groups.length) return [];
    return groups[expandedCat].channels;
  }, [activeTab, tabChannels, groups, expandedCat]);
  useEffect(() => { visibleChannelsRef.current = visibleChannels; }, [visibleChannels]);

  // ── Persist last tab ─────────────────────────────────────────────────────
  useEffect(() => { saveLastTab(activeTabIdx); }, [activeTabIdx]);

  // ── DOM focus helpers (no React re-renders) ─────────────────────────────
  const clearAllFocus = useCallback(() => {
    if (tabnavRef.current) tabnavRef.current.removeAttribute("data-focused");
    catRefs.current.forEach((el) => { if (el) el.removeAttribute("data-focused"); });
    chRefs.current.forEach((el) => { if (el) el.removeAttribute("data-focused"); });
  }, []);

  const focusEl = useCallback((el) => {
    if (!el) return;
    el.setAttribute("data-focused", "true");
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  const applyZoneFocus = useCallback(() => {
    const zone = activeZoneRef.current;
    if (zone === "tabnav") {
      focusEl(tabnavRef.current);
    } else if (zone === "categories") {
      focusEl(catRefs.current[focusedCatRef.current]);
    } else if (zone === "channels") {
      focusEl(chRefs.current[focusedChRef.current]);
    }
  }, [focusEl]);

  // Initial mount → focus the tab navigator.
  useEffect(() => {
    activeZoneRef.current = "tabnav";
    clearAllFocus();
    applyZoneFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After tab change → re-apply focus (refs reattach to fresh DOM nodes).
  useEffect(() => {
    clearAllFocus();
    if (activeZoneRef.current === "channels" && activeTab?.kind !== "all") {
      // Tab switch invalidates channel focus — fall back to tabnav.
      activeZoneRef.current = "tabnav";
    }
    applyZoneFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabIdx]);

  // After accordion change → re-focus into the new context.
  useEffect(() => {
    clearAllFocus();
    applyZoneFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedCat]);

  // ── Keyboard handler ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key;
      const kc = e.keyCode;
      const zone = activeZoneRef.current;
      const tabsNow = tabsRef.current;
      const curTab = tabsNow[activeTabIdxRef.current];
      if (!curTab) return;

      const isLeft  = k === "ArrowLeft"  || kc === 37;
      const isRight = k === "ArrowRight" || kc === 39;
      const isUp    = k === "ArrowUp"    || kc === 38;
      const isDown  = k === "ArrowDown"  || kc === 40;
      const isOk    = k === "Enter"      || kc === 13 || k === " ";

      // ── ZONE: tabnav ────────────────────────────────────────────────────
      if (zone === "tabnav") {
        if (isLeft) {
          e.preventDefault(); e.stopPropagation();
          const idx = activeTabIdxRef.current;
          if (idx > 0) {
            setExpandedCat(-1);
            focusedCatRef.current = 0;
            focusedChRef.current = 0;
            setActiveTabIdx(idx - 1);
          }
          return;
        }
        if (isRight) {
          e.preventDefault(); e.stopPropagation();
          const idx = activeTabIdxRef.current;
          if (idx < tabsNow.length - 1) {
            setExpandedCat(-1);
            focusedCatRef.current = 0;
            focusedChRef.current = 0;
            setActiveTabIdx(idx + 1);
          }
          return;
        }
        if (isDown) {
          e.preventDefault(); e.stopPropagation();
          const cur = currentChannelRef.current;
          if (curTab.kind === "all") {
            // Auto-focus the currently-playing channel when it exists in the
            // flat list — otherwise fall back to the first row.
            const list = tabChannelsRef.current;
            const matchIdx = cur ? list.findIndex((ch) => sameChannel(cur, ch)) : -1;
            if (chRefs.current.length > 0 || list.length > 0) {
              focusedChRef.current = matchIdx >= 0 ? matchIdx : 0;
              activeZoneRef.current = "channels";
              clearAllFocus();
              applyZoneFocus();
            }
          } else {
            // Grouped tab: if the currently-playing channel lives in one of
            // the visible groups, auto-expand that group and focus the
            // matching channel — landing the user exactly where they're at.
            // Otherwise, focus the first category row (default behavior).
            const grps = groupsRef.current;
            let foundGroupIdx = -1;
            let foundChIdx = -1;
            if (cur) {
              for (let g = 0; g < grps.length; g++) {
                const idx = grps[g].channels.findIndex((ch) => sameChannel(cur, ch));
                if (idx >= 0) { foundGroupIdx = g; foundChIdx = idx; break; }
              }
            }
            if (foundGroupIdx >= 0) {
              focusedCatRef.current = foundGroupIdx;
              focusedChRef.current = foundChIdx;
              activeZoneRef.current = "channels";
              // setExpandedCat triggers a re-render; the [expandedCat] effect
              // then fires clearAllFocus + applyZoneFocus once chRefs are
              // populated for the newly expanded group.
              setExpandedCat(foundGroupIdx);
            } else if (catRefs.current.length > 0) {
              focusedCatRef.current = 0;
              activeZoneRef.current = "categories";
              clearAllFocus();
              applyZoneFocus();
            }
          }
          return;
        }
        if (isOk) { e.preventDefault(); e.stopPropagation(); return; }
        return;
      }

      // ── ZONE: categories ────────────────────────────────────────────────
      if (zone === "categories") {
        if (isUp) {
          e.preventDefault(); e.stopPropagation();
          if (focusedCatRef.current === 0) {
            activeZoneRef.current = "tabnav";
            clearAllFocus();
            applyZoneFocus();
          } else {
            const old = catRefs.current[focusedCatRef.current];
            if (old) old.removeAttribute("data-focused");
            focusedCatRef.current -= 1;
            focusEl(catRefs.current[focusedCatRef.current]);
          }
          return;
        }
        if (isDown) {
          e.preventDefault(); e.stopPropagation();
          const next = Math.min(catRefs.current.length - 1, focusedCatRef.current + 1);
          if (next !== focusedCatRef.current) {
            const old = catRefs.current[focusedCatRef.current];
            if (old) old.removeAttribute("data-focused");
            focusedCatRef.current = next;
            focusEl(catRefs.current[next]);
          }
          return;
        }
        if (isOk) {
          e.preventDefault(); e.stopPropagation();
          const idx = focusedCatRef.current;
          if (expandedCatRef.current === idx) {
            // collapse — focus stays on this category row
            setExpandedCat(-1);
          } else {
            // Expand. Jump to the currently-playing channel inside this
            // group when it lives here; otherwise focus the first channel.
            const group = groupsRef.current[idx];
            const cur = currentChannelRef.current;
            let chIdx = 0;
            if (group && cur) {
              const found = group.channels.findIndex((ch) => sameChannel(cur, ch));
              if (found >= 0) chIdx = found;
            }
            focusedChRef.current = chIdx;
            activeZoneRef.current = "channels";
            setExpandedCat(idx);
          }
          return;
        }
        return;
      }

      // ── ZONE: channels ──────────────────────────────────────────────────
      if (zone === "channels") {
        if (isUp) {
          e.preventDefault(); e.stopPropagation();
          if (focusedChRef.current === 0) {
            // Return to parent context: category row for grouped tabs,
            // tab navigator for the flat "All Channels" tab.
            const old = chRefs.current[focusedChRef.current];
            if (old) old.removeAttribute("data-focused");
            if (curTab.kind === "all") {
              activeZoneRef.current = "tabnav";
            } else {
              focusedCatRef.current = expandedCatRef.current >= 0 ? expandedCatRef.current : 0;
              activeZoneRef.current = "categories";
            }
            applyZoneFocus();
          } else {
            const old = chRefs.current[focusedChRef.current];
            if (old) old.removeAttribute("data-focused");
            focusedChRef.current -= 1;
            focusEl(chRefs.current[focusedChRef.current]);
          }
          return;
        }
        if (isDown) {
          e.preventDefault(); e.stopPropagation();
          const next = Math.min(chRefs.current.length - 1, focusedChRef.current + 1);
          if (next !== focusedChRef.current) {
            const old = chRefs.current[focusedChRef.current];
            if (old) old.removeAttribute("data-focused");
            focusedChRef.current = next;
            focusEl(chRefs.current[next]);
          }
          return;
        }
        if (isOk) {
          e.preventDefault(); e.stopPropagation();
          const ch = visibleChannelsRef.current[focusedChRef.current];
          if (ch && onChannelSelectRef.current) onChannelSelectRef.current(ch);
          return;
        }
        return;
      }
    };

    // Non-capture so LivePlayer's capture-phase handler runs first; LivePlayer
    // already returns early when sidebar is open for arrow keys, so this
    // handler still gets the events while sidebar owns the input. Stable
    // deps — the handler reads everything else via refs, so this listener
    // is registered exactly once for the lifetime of the component.
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render helpers ──────────────────────────────────────────────────────
  const isCurrentlyPlaying = (ch) => sameChannel(currentChannel, ch);

  const onChevronClick = (dir) => {
    const idx = activeTabIdx;
    if (dir < 0 && idx > 0) {
      setExpandedCat(-1); focusedCatRef.current = 0; focusedChRef.current = 0;
      setActiveTabIdx(idx - 1);
    } else if (dir > 0 && idx < tabs.length - 1) {
      setExpandedCat(-1); focusedCatRef.current = 0; focusedChRef.current = 0;
      setActiveTabIdx(idx + 1);
    }
  };

  const atLeftEdge  = activeTabIdx <= 0;
  const atRightEdge = activeTabIdx >= tabs.length - 1;

  return (
    <div style={{
      width: "400px",
      height: "100vh",
      background: "#0F1423",
      borderRight: "1px solid rgba(255,255,255,0.10)",
      display: "flex",
      flexDirection: "column",
      color: "#fff",
      fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      overflow: "hidden",
    }}>

      {/* ── Tab Navigator ── */}
      <div style={{ padding: "16px 12px 8px" }}>
        <div
          ref={tabnavRef}
          className="focusable-tabnav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            height: "56px",
            borderRadius: "12px",
            border: "1.5px solid transparent",
            padding: "0 8px",
          }}
        >
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onChevronClick(-1)}
            aria-label="Previous tab"
            style={{
              width: "40px", height: "40px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.08)",
              border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: atLeftEdge ? "default" : "pointer",
              opacity: atLeftEdge ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div style={{
            flex: 1,
            textAlign: "center",
            color: "#22D3EE",
            fontSize: "22px",
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            padding: "0 4px",
          }}>
            {activeTab?.title || ""}
          </div>

          <button
            type="button"
            tabIndex={-1}
            onClick={() => onChevronClick(+1)}
            aria-label="Next tab"
            style={{
              width: "40px", height: "40px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.08)",
              border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: atRightEdge ? "default" : "pointer",
              opacity: atRightEdge ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── CATEGORIES micro-label (hidden on All Channels) ── */}
      {activeTab?.kind !== "all" && (
        <div style={{
          padding: "4px 22px 8px",
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "2px",
          color: "#94A3B8",
          textTransform: "uppercase",
        }}>
          CATEGORIES
        </div>
      )}

      {/* ── Content area ── */}
      <div
        className="hide-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 12px 16px",
        }}
      >
        {loading && allChannels.length === 0 && (
          <div style={{ padding: "20px 8px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                height: "56px",
                marginBottom: "8px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.04)",
              }} />
            ))}
          </div>
        )}

        {error && (
          <p style={{
            textAlign: "center", color: "#f87171",
            fontSize: "16px", fontWeight: 600, marginTop: "32px",
          }}>{error}</p>
        )}

        {/* "All Channels" — flat channel list */}
        {!loading && !error && activeTab?.kind === "all" && (() => {
          chRefs.current = [];
          if (tabChannels.length === 0) {
            return <EmptyState text="No channels available" />;
          }
          return tabChannels.map((ch, idx) => (
            <ChannelCard
              key={ch.channelno || ch.channelid || idx}
              ref={(el) => { chRefs.current[idx] = el; }}
              channel={ch}
              isPlaying={isCurrentlyPlaying(ch)}
              onClick={() => onChannelSelectRef.current && onChannelSelectRef.current(ch)}
            />
          ));
        })()}

        {/* Grouped tab — categories with accordion */}
        {!loading && !error && activeTab && activeTab.kind !== "all" && (() => {
          catRefs.current = [];
          chRefs.current = [];
          if (groups.length === 0) {
            return <EmptyState text="No channels in this tab" />;
          }
          return groups.map((g, gIdx) => {
            const isExpanded = expandedCat === gIdx;
            return (
              <div key={g.category.grid || g.category.title || gIdx}>
                <div
                  ref={(el) => { catRefs.current[gIdx] = el; }}
                  className="focusable-category-row"
                  onClick={() => {
                    focusedCatRef.current = gIdx;
                    activeZoneRef.current = "categories";
                    if (expandedCat === gIdx) {
                      setExpandedCat(-1);
                    } else {
                      focusedChRef.current = 0;
                      activeZoneRef.current = "channels";
                      setExpandedCat(gIdx);
                    }
                  }}
                  style={{
                    height: "56px",
                    padding: "0 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: "12px",
                    border: "1.5px solid transparent",
                    cursor: "pointer",
                    marginBottom: "8px",
                    background: "transparent",
                  }}
                >
                  <span style={{ fontSize: "22px", fontWeight: 600, color: "#fff" }}>
                    {g.category.title}
                  </span>
                  <span style={{ fontSize: "22px", fontWeight: 600, color: "#CBD5E1" }}>
                    ({g.channels.length})
                  </span>
                </div>

                {isExpanded && (
                  <div style={{ marginBottom: "16px" }}>
                    {g.channels.map((ch, cIdx) => (
                      <ChannelCard
                        key={ch.channelno || ch.channelid || cIdx}
                        ref={(el) => { chRefs.current[cIdx] = el; }}
                        channel={ch}
                        isPlaying={isCurrentlyPlaying(ch)}
                        onClick={() => onChannelSelectRef.current && onChannelSelectRef.current(ch)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
};

// ── ChannelCard subcomponent ──────────────────────────────────────────────
// forwardRef so the parent can wire chRefs[idx] via callback ref.
const ChannelCard = forwardRef(({ channel, isPlaying, onClick }, ref) => {
  const locked = !isSubscribed(channel);
  const priceLabel = formatPrice(channel.chprice);

  return (
    <div
      ref={ref}
      className="focusable-channel-card"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        height: "88px",
        padding: "12px",
        marginBottom: "4px",
        borderRadius: "14px",
        border: "1.5px solid transparent",
        cursor: "pointer",
        opacity: locked ? 0.55 : 1,
        background: "transparent",
      }}
    >
      {/* Logo tile */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        {channel.chlogo ? (
          <img
            src={channel.chlogo}
            alt={channel.chtitle || ""}
            loading="lazy"
            style={{
              width: "64px", height: "64px",
              objectFit: "contain",
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div style={{
            width: "64px", height: "64px",
            background: "#1a2340",
            borderRadius: "12px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              <path d="M9 8L9 16L17 12L9 8Z" fill="rgba(255,255,255,0.18)" />
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

      {/* Name + price */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          whiteSpace: "nowrap", overflow: "hidden",
        }}>
          {isPlaying && (
            <span style={{
              width: "8px", height: "8px",
              borderRadius: "50%",
              background: "#22D3EE",
              flexShrink: 0,
            }} aria-label="now playing" />
          )}
          <span style={{
            fontSize: "22px", fontWeight: 600, color: "#fff",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            minWidth: 0,
          }}>
            {channel.chtitle}
          </span>
        </div>
        {priceLabel && (
          <div style={{
            fontSize: "18px", fontWeight: 600, color: "#22C55E",
            marginTop: "4px",
          }}>
            {priceLabel}
          </div>
        )}
      </div>

      {/* Channel number */}
      <span style={{
        fontSize: "24px", fontWeight: 700, color: "#fff",
        flexShrink: 0, minWidth: "3rem", textAlign: "right",
      }}>
        {channel.channelno}
      </span>
    </div>
  );
});
ChannelCard.displayName = "ChannelCard";

// ── EmptyState ────────────────────────────────────────────────────────────
const EmptyState = ({ text }) => (
  <p style={{
    textAlign: "center",
    color: "#94A3B8",
    fontSize: "16px",
    fontWeight: 600,
    marginTop: "40px",
  }}>{text}</p>
);

export default ChannelsSidebar;

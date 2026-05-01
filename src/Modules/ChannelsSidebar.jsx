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

// Filter the global channel list down to a specific tab's view. Mirrors the
// `tabChannels` useMemo inside the component — extracted here so the
// `locateChannel` helper below can reason about any tab without going through
// React state.
const filterChannelsForTab = (tab, allChannels) => {
  if (!tab || !Array.isArray(allChannels) || allChannels.length === 0) return [];
  if (tab.kind === "all") return allChannels;
  if (tab.kind === "subscribed") return allChannels.filter(isSubscribed);
  if (tab.kind === "lang") {
    const id = tab.langid;
    if (!id) return [];
    return allChannels.filter((c) => String(c.langid || "").trim() === id);
  }
  return [];
};

// Build the visible groups for a grouped tab. Mirrors the `groups` useMemo
// inside the component (empty groups dropped). Used by `locateChannel` to
// resolve { groupIdx, chIdx } for the playing channel within a tab.
const buildGroupsForTab = (tab, allChannels, contentCategories) => {
  if (!tab || tab.kind === "all") return [];
  if (!Array.isArray(contentCategories) || contentCategories.length === 0) return [];
  const list = filterChannelsForTab(tab, allChannels);
  if (list.length === 0) return [];
  return contentCategories
    .map((cat) => ({
      category: cat,
      channels: list.filter(
        (c) => String(c.grid || "").trim() === String(cat.grid || "").trim(),
      ),
    }))
    .filter((g) => g.channels.length > 0);
};

// Resolve "where does this channel live inside the given tab".
//   - "All Channels": { groupIdx: -1, chIdx: <flat index in tabChannels> }
//   - Grouped tab:    { groupIdx, chIdxInGroup }
// The two shapes are differentiated by groupIdx === -1. Use itemIdxFor()
// downstream to convert (groupIdx, chIdxInGroup) into a flat item index
// once the expansion state is known.
const locateChannelInTab = (channel, tab, allChannels, contentCategories) => {
  if (!channel || !tab) return null;
  if (tab.kind === "all") {
    const list = filterChannelsForTab(tab, allChannels);
    const chIdx = list.findIndex((ch) => sameChannel(ch, channel));
    return chIdx >= 0 ? { groupIdx: -1, chIdx } : null;
  }
  const groups = buildGroupsForTab(tab, allChannels, contentCategories);
  for (let g = 0; g < groups.length; g++) {
    const inGroupIdx = groups[g].channels.findIndex((ch) => sameChannel(ch, channel));
    if (inGroupIdx >= 0) return { groupIdx: g, chIdxInGroup: inGroupIdx };
  }
  return null;
};

// Flat-item-index calculator for grouped tabs. Walks groups in render order,
// counting one slot per category row plus the group's channel count if that
// group is in the expandedSet. Returns the flat index of the requested item.
//   - target type "cat":  itemIdxFor(groups, expandedSet, gIdx, "cat")
//   - target type "ch":   itemIdxFor(groups, expandedSet, gIdx, "ch", chIdxInGroup)
const itemIdxFor = (groups, expandedSet, gIdx, type, chIdxInGroup = 0) => {
  let idx = 0;
  for (let g = 0; g < gIdx; g++) {
    idx += 1; // category row
    if (expandedSet.has(g)) idx += groups[g].channels.length;
  }
  if (type === "cat") return idx;
  // type === "ch": skip past gIdx's own cat row
  return idx + 1 + chIdxInGroup;
};

// "Where should the menu open?" — single source of truth, called at mount
// time and on L/R from any zone. Resolution order is purely channel-driven
// (last-persisted tab is intentionally NOT a priority — it caused the menu
// to land on a stale tab that didn't reflect what the user is now watching):
//   1. Language tab matching channel.langid (a language-tagged channel
//      always opens in its language category — the most context-relevant
//      view of "what else is on in this language").
//   2. Subscribed tab if the channel is subscribed (no language match,
//      e.g. a generic English channel without a langid).
//   3. All Channels (fallback — covers unsubscribed channels and any
//      channel that doesn't fit the categories above).
// Returns { tabIdx, groupIdx, chIdx } or null.
const locateChannel = (channel, tabs, allChannels, contentCategories) => {
  if (!channel || !Array.isArray(tabs) || tabs.length === 0) return null;

  const tryTab = (idx) => {
    if (idx < 0 || idx >= tabs.length) return null;
    const loc = locateChannelInTab(channel, tabs[idx], allChannels, contentCategories);
    return loc ? { tabIdx: idx, ...loc } : null;
  };

  // 1. Language tab matching channel.langid
  const chLangId = String(channel.langid || "").trim();
  if (chLangId) {
    const langIdx = tabs.findIndex((t) => t.kind === "lang" && String(t.langid || "").trim() === chLangId);
    const fromLang = tryTab(langIdx);
    if (fromLang) return fromLang;
  }

  // 2. Subscribed tab if subscribed
  if (isSubscribed(channel)) {
    const subIdx = tabs.findIndex((t) => t.kind === "subscribed");
    const fromSub = tryTab(subIdx);
    if (fromSub) return fromSub;
  }

  // 3. All Channels — fallback for unsubscribed channels without a language
  // tab match, plus any channel that didn't resolve elsewhere.
  const allIdx = tabs.findIndex((t) => t.kind === "all");
  return tryTab(allIdx);
};

// requestIdleCallback fallback shim for older webOS firmware. webOS 5+
// (Chromium 68+) ships rIC; the setTimeout fallback covers earlier panels.
const scheduleIdle = (cb) => {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    return { id: window.requestIdleCallback(cb), kind: "ric" };
  }
  return { id: setTimeout(cb, 16), kind: "to" };
};
const cancelIdle = (handle) => {
  if (!handle) return;
  if (handle.kind === "ric" && typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(handle.id);
  } else {
    clearTimeout(handle.id);
  }
};

// Initial chunk size when entering "All Channels". When the playing channel
// is at index >= INITIAL_CHUNK, the auto-focus path bumps this to chIdx + 30
// so the focused card is mounted in the very first paint.
const INITIAL_CHUNK = 30;
const CHUNK_INCREMENT = 30;

const ChannelsSidebar = ({ onChannelSelect, currentChannel, isOpen = true }) => {
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
  // activeTabIdx and expandedSet are the React-state pieces that influence
  // the render tree (chunked-render counters too). Focus zones / indices
  // live in refs so arrow-key navigation never causes a re-render.
  const [activeTabIdx, setActiveTabIdx] = useState(loadLastTab);

  // Multi-expand accordion state: a Set of group indices currently open.
  // Default is an empty set ("all collapsed"); the auto-focus mount effect
  // injects the playing channel's groupIdx so the user lands on it. Other
  // groups stay closed until the user clicks/OKs them.
  const [expandedSet, setExpandedSet] = useState(() => new Set());

  // renderedTabIdx lags activeTabIdx by one frame so the tab title pill
  // commits in its own paint while the (potentially expensive) channel
  // tree reconciles. While they differ, the content area shows skeleton
  // rows — never the prior tab's stale list.
  const [renderedTabIdx, setRenderedTabIdx] = useState(loadLastTab);

  // Chunked render budget for "All Channels" (Infinity for grouped tabs).
  // Starts at INITIAL_CHUNK so the first paint is bounded even if the
  // persisted last tab is "All Channels"; rises via requestIdleCallback
  // until the whole list is mounted.
  const [renderedCount, setRenderedCount] = useState(INITIAL_CHUNK);

  // Mount-time auto-focus runs ONCE per (channel-data + categories +
  // languages) load — guards against the channel data arriving after
  // the first render and re-running on every keypress.
  const didAutoFocusRef = useRef(false);

  // ── Focus refs (zero re-renders on keypress) ─────────────────────────────
  // Two zones: "tabnav" (top pill) and "channels" (the unified item list —
  // category rows + channels of expanded categories, in render order).
  // focusedItemRef is the flat index into itemRefs for the active tab.
  const activeZoneRef = useRef("tabnav"); // "tabnav" | "channels"
  const focusedItemRef = useRef(0);

  const tabnavRef = useRef(null);
  // itemRefs[k] = DOM node of the kth focusable item (cat row or channel
  // card) in the active tab's render order.
  const itemRefs = useRef([]);

  // ── Stable refs for handler reads (avoid stale closures) ────────────────
  const activeTabIdxRef = useRef(activeTabIdx);
  const expandedSetRef = useRef(expandedSet);
  const tabsRef = useRef([]);
  const groupsRef = useRef([]);
  const tabChannelsRef = useRef([]);
  // Items visible to keyboard navigation, in render order. Each entry is
  // { type: "cat" | "ch", ... }. Keyboard handler reads this for OK
  // (branch on type) and for "find playing channel" lookups.
  const itemsRef = useRef([]);
  const currentChannelRef = useRef(currentChannel);
  const onChannelSelectRef = useRef(onChannelSelect);

  useEffect(() => { activeTabIdxRef.current = activeTabIdx; }, [activeTabIdx]);
  useEffect(() => { expandedSetRef.current = expandedSet; }, [expandedSet]);
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

  // ── Items: unified focusable list in render order ───────────────────────
  // For "All Channels" → only channel items (sliced by renderedCount).
  // For grouped tabs → category rows interleaved with channels of expanded
  // categories. Keyboard navigation uses a single flat index into items;
  // OK branches on item.type ("cat" toggles expansion, "ch" plays).
  const items = useMemo(() => {
    if (!activeTab) return [];
    if (activeTab.kind === "all") {
      const slice = tabChannels.slice(0, renderedCount);
      return slice.map((ch) => ({ type: "ch", channel: ch }));
    }
    const out = [];
    groups.forEach((g, gIdx) => {
      out.push({ type: "cat", gIdx, group: g });
      if (expandedSet.has(gIdx)) {
        g.channels.forEach((ch, cIdxInGroup) => {
          out.push({ type: "ch", channel: ch, gIdx, cIdxInGroup });
        });
      }
    });
    return out;
  }, [activeTab, tabChannels, renderedCount, groups, expandedSet]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // ── Now-playing markers ──────────────────────────────────────────────────
  // Cyan dot next to the active tab title when this tab contains the
  // playing channel — at-a-glance "you're on the right tab" affordance.
  // Only checks the active tab (not all tabs) to avoid clutter.
  const activeTabHasPlaying = useMemo(() => {
    if (!currentChannel || !activeTab || allChannels.length === 0) return false;
    const list = filterChannelsForTab(activeTab, allChannels);
    return list.some((ch) => sameChannel(ch, currentChannel));
  }, [activeTab, allChannels, currentChannel]);

  // Cyan dot next to the category row count when this group contains
  // the playing channel. Helps the user spot the right category as
  // they scan a tab with multiple groups.
  const playingGroupIdx = useMemo(() => {
    if (!currentChannel || !activeTab || activeTab.kind === "all") return -1;
    return groups.findIndex(
      (g) => g.channels.some((ch) => sameChannel(ch, currentChannel)),
    );
  }, [groups, activeTab, currentChannel]);

  // ── Persist last tab ─────────────────────────────────────────────────────
  useEffect(() => { saveLastTab(activeTabIdx); }, [activeTabIdx]);

  // ── DOM focus helpers (no React re-renders) ─────────────────────────────
  const clearAllFocus = useCallback(() => {
    if (tabnavRef.current) tabnavRef.current.removeAttribute("data-focused");
    itemRefs.current.forEach((el) => { if (el) el.removeAttribute("data-focused"); });
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
    } else if (zone === "channels") {
      focusEl(itemRefs.current[focusedItemRef.current]);
    }
  }, [focusEl]);

  // Sidebar visibility lifecycle. Parent toggles `isOpen` on every open/
  // close (LivePlayer keeps the sidebar mounted under display:none for
  // perf). Resetting the auto-focus guard on close means the next open
  // re-runs the auto-focus effect and lands on whatever channel is
  // playing now — even if it has changed since last open.
  useEffect(() => {
    if (!isOpen) {
      didAutoFocusRef.current = false;
    }
  }, [isOpen]);

  // Re-apply DOM focus when the chunked content area finally catches up
  // to the active tab. The [activeTabIdx] effect runs while the content
  // is still showing the skeleton (refs not yet populated) — once the
  // setTimeout(0) lag commits and refs land, this effect re-applies focus.
  useEffect(() => {
    if (!didAutoFocusRef.current) return;
    if (renderedTabIdx !== activeTabIdx) return;
    clearAllFocus();
    applyZoneFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderedTabIdx]);

  // Initial mount (and every re-open) → land on the currently-playing
  // channel if we can resolve its location. Falls back to tabnav-only
  // focus when there's no current channel or the channel data isn't
  // loaded yet (re-runs on data arrival).
  useEffect(() => {
    if (!isOpen) return;
    if (didAutoFocusRef.current) return;
    if (tabs.length === 0 || allChannels.length === 0) return;

    const cur = currentChannelRef.current;
    const loc = locateChannel(cur, tabs, allChannels, contentCategories);

    if (loc) {
      didAutoFocusRef.current = true;
      const targetTab = tabs[loc.tabIdx];
      if (targetTab?.kind === "all") {
        // "All Channels": loc.chIdx is the flat index in the slice; seed
        // renderedCount so the focused card is in the first paint.
        if (loc.chIdx >= INITIAL_CHUNK) setRenderedCount(loc.chIdx + CHUNK_INCREMENT);
        else setRenderedCount(INITIAL_CHUNK);
        focusedItemRef.current = loc.chIdx;
        // No accordion in All Channels; expandedSet is irrelevant but
        // reset it for cleanliness when re-opening across tab kinds.
        setExpandedSet(new Set());
      } else {
        // Grouped tab: only the playing channel's group expands. Compute
        // the flat item index from (groupIdx, chIdxInGroup, expandedSet)
        // — assumes ONLY loc.groupIdx is in expandedSet, which matches
        // the setExpandedSet call below.
        setRenderedCount(Infinity);
        const nextExpanded = new Set([loc.groupIdx]);
        setExpandedSet(nextExpanded);
        const targetGroups = buildGroupsForTab(targetTab, allChannels, contentCategories);
        focusedItemRef.current = itemIdxFor(targetGroups, nextExpanded, loc.groupIdx, "ch", loc.chIdxInGroup);
      }
      activeZoneRef.current = "channels";
      if (loc.tabIdx !== activeTabIdx) {
        setActiveTabIdx(loc.tabIdx);
      } else {
        // Same tab — the [renderedTabIdx] effect won't fire because
        // activeTabIdx didn't change. Apply focus now; if itemRefs aren't
        // populated yet (data-arrival path), the [renderedTabIdx] effect
        // catches it on the next render.
        clearAllFocus();
        applyZoneFocus();
      }
    } else {
      didAutoFocusRef.current = true;
      activeZoneRef.current = "tabnav";
      clearAllFocus();
      applyZoneFocus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tabs.length, allChannels.length, contentCategories.length]);

  // After tab change → re-apply focus (refs reattach to fresh DOM nodes).
  useEffect(() => {
    clearAllFocus();
    applyZoneFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabIdx]);

  // After accordion toggle → re-apply focus. Toggling a category re-renders
  // items (channels appear/disappear right after the toggled cat row), and
  // itemRefs reattaches. focusedItemRef points to the toggled cat row's
  // index, which is unchanged — re-focus to make sure the data-focused
  // attribute lands on the new DOM node.
  useEffect(() => {
    if (!didAutoFocusRef.current) return;
    if (activeZoneRef.current !== "channels") return;
    clearAllFocus();
    applyZoneFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedSet]);

  // Tab title commits immediately; content reconciles next frame. While the
  // two diverge the content area shows skeleton rows so we never display
  // the prior tab's stale list under a new title.
  useEffect(() => {
    const id = setTimeout(() => setRenderedTabIdx(activeTabIdx), 0);
    return () => clearTimeout(id);
  }, [activeTabIdx]);

  // Chunked progressive render — only for "All Channels". Bumps
  // renderedCount by CHUNK_INCREMENT on every idle tick until the whole
  // list is mounted. For grouped tabs renderedCount stays Infinity so the
  // expanded group renders in one shot.
  useEffect(() => {
    if (activeTab?.kind !== "all") {
      if (renderedCount !== Infinity) setRenderedCount(Infinity);
      return undefined;
    }
    if (renderedCount >= tabChannels.length) return undefined;
    const handle = scheduleIdle(() => {
      setRenderedCount((c) => Math.min(tabChannels.length, c + CHUNK_INCREMENT));
    });
    return () => cancelIdle(handle);
  }, [activeTab?.kind, renderedCount, tabChannels.length]);

  // ── Tab switch with playing-channel auto-focus ──────────────────────────
  // Used by L/R in categories/channels zones AND by chevron click. Picks
  // the next tab (clamped at edges, no wrap), looks up the playing channel
  // in the new tab via locateChannelInTab, and primes refs + state so the
  // [activeTabIdx] effect (and the [renderedTabIdx] re-apply) land focus
  // on the right card after the new tab's itemRefs populate.
  const switchTab = useCallback((dir) => {
    const tabsNow = tabsRef.current;
    const idx = activeTabIdxRef.current;
    const next = idx + dir;
    if (next < 0 || next >= tabsNow.length) return;

    const newTab = tabsNow[next];
    const cur = currentChannelRef.current;
    const loc = locateChannelInTab(cur, newTab, allChannels, contentCategories);

    if (loc) {
      if (newTab.kind === "all") {
        if (loc.chIdx >= INITIAL_CHUNK) setRenderedCount(loc.chIdx + CHUNK_INCREMENT);
        else setRenderedCount(INITIAL_CHUNK);
        focusedItemRef.current = loc.chIdx;
        setExpandedSet(new Set());
      } else {
        setRenderedCount(Infinity);
        const nextExpanded = new Set([loc.groupIdx]);
        setExpandedSet(nextExpanded);
        const targetGroups = buildGroupsForTab(newTab, allChannels, contentCategories);
        focusedItemRef.current = itemIdxFor(targetGroups, nextExpanded, loc.groupIdx, "ch", loc.chIdxInGroup);
      }
      activeZoneRef.current = "channels";
      setActiveTabIdx(next);
    } else {
      // Channel not in the new tab — land on the first item (first cat
      // row for grouped tabs, first channel for "All Channels"). All
      // groups stay collapsed.
      if (newTab.kind === "all") setRenderedCount(INITIAL_CHUNK);
      else setRenderedCount(Infinity);
      setExpandedSet(new Set());
      focusedItemRef.current = 0;
      activeZoneRef.current = "channels";
      setActiveTabIdx(next);
    }
  }, [allChannels, contentCategories]);

  const switchTabRef = useRef(switchTab);
  useEffect(() => { switchTabRef.current = switchTab; }, [switchTab]);

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
        if (isLeft || isRight) {
          e.preventDefault(); e.stopPropagation();
          const idx = activeTabIdxRef.current;
          const next = idx + (isLeft ? -1 : 1);
          if (next < 0 || next >= tabsNow.length) return;
          // Reset renderedCount + collapse all groups in the same setState
          // batch as activeTabIdx so the new tab paints correctly on the
          // first frame. Tabnav L/R is a "cold" tab change — start with a
          // fresh accordion state rather than carrying expansions across.
          setRenderedCount(tabsNow[next].kind === "all" ? INITIAL_CHUNK : Infinity);
          setExpandedSet(new Set());
          focusedItemRef.current = 0;
          setActiveTabIdx(next);
          return;
        }
        if (isDown) {
          e.preventDefault(); e.stopPropagation();
          // Drop into the items zone, landing on the first focusable item.
          // (The auto-focus mount path handles "land on playing channel"
          // semantics; tabnav DOWN is a manual descent — first item is fine.)
          const list = itemsRef.current;
          if (list.length === 0) return;
          focusedItemRef.current = 0;
          activeZoneRef.current = "channels";
          clearAllFocus();
          applyZoneFocus();
          return;
        }
        if (isOk) { e.preventDefault(); e.stopPropagation(); return; }
        return;
      }

      // ── ZONE: channels (unified items: cat rows + channels) ───────────
      if (zone === "channels") {
        if (isLeft || isRight) {
          e.preventDefault(); e.stopPropagation();
          switchTabRef.current(isLeft ? -1 : 1);
          return;
        }
        if (isUp) {
          e.preventDefault(); e.stopPropagation();
          // Top-item UP is a no-op: focus stays on the topmost item. Never
          // escape upward to the tabnav strip — the user uses L/R for tab
          // switches, so there's no reason to leave the items list.
          if (focusedItemRef.current === 0) return;
          const old = itemRefs.current[focusedItemRef.current];
          if (old) old.removeAttribute("data-focused");
          focusedItemRef.current -= 1;
          focusEl(itemRefs.current[focusedItemRef.current]);
          return;
        }
        if (isDown) {
          e.preventDefault(); e.stopPropagation();
          const next = Math.min(itemRefs.current.length - 1, focusedItemRef.current + 1);
          if (next !== focusedItemRef.current) {
            const old = itemRefs.current[focusedItemRef.current];
            if (old) old.removeAttribute("data-focused");
            focusedItemRef.current = next;
            focusEl(itemRefs.current[next]);
          }
          return;
        }
        if (isOk) {
          e.preventDefault(); e.stopPropagation();
          const item = itemsRef.current[focusedItemRef.current];
          if (!item) return;
          if (item.type === "ch") {
            if (onChannelSelectRef.current) onChannelSelectRef.current(item.channel);
          } else if (item.type === "cat") {
            // Toggle expansion. Multi-expand: only this group is affected.
            // The focused item (the cat row itself) stays in place since
            // toggling only changes what comes after it, not the row itself.
            setExpandedSet((prev) => {
              const nextSet = new Set(prev);
              if (nextSet.has(item.gIdx)) nextSet.delete(item.gIdx);
              else nextSet.add(item.gIdx);
              return nextSet;
            });
          }
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

  // Chevron click mirrors keyboard L/R from non-tabnav zones — auto-focuses
  // the playing channel in the new tab. Falls through to tabnav focus when
  // the user is currently in tabnav (preserves existing tabnav L/R semantics
  // where chevrons just step the title without descending into channels).
  const onChevronClick = (dir) => {
    if (activeZoneRef.current === "tabnav") {
      const idx = activeTabIdxRef.current;
      const next = idx + dir;
      if (next < 0 || next >= tabs.length) return;
      setRenderedCount(tabs[next].kind === "all" ? INITIAL_CHUNK : Infinity);
      setExpandedSet(new Set());
      focusedItemRef.current = 0;
      setActiveTabIdx(next);
      return;
    }
    switchTab(dir);
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "#22D3EE",
            fontSize: "22px",
            fontWeight: 700,
            padding: "0 4px",
            minWidth: 0,
          }}>
            <span style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}>
              {activeTab?.title || ""}
            </span>
            {activeTabHasPlaying && (
              <span
                aria-label="now playing in this tab"
                style={{
                  width: "8px", height: "8px",
                  borderRadius: "50%",
                  background: "#22D3EE",
                  flexShrink: 0,
                  boxShadow: "0 0 6px rgba(34,211,238,0.7)",
                }}
              />
            )}
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

        {/* Skeleton flash during tab change reconcile. While activeTabIdx
            and renderedTabIdx differ (the gap is one setTimeout(0) tick on
            fast hardware, longer on slow TVs while React tears down a heavy
            tree), we show 4 placeholder rows instead of either tab's
            content. Prevents stale-content flash and bridges perceived lag. */}
        {!loading && !error && activeTabIdx !== renderedTabIdx && (
          <div style={{ padding: "4px 0" }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                height: "88px",
                marginBottom: "4px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.04)",
              }} />
            ))}
          </div>
        )}

        {/* Unified items render — same for "All Channels" and grouped tabs.
            For "All Channels" items are channel-only (sliced to
            renderedCount); for grouped tabs they're an interleaved list of
            category rows + channels of expanded categories. itemRefs is a
            flat ref array indexed by item position; the keyboard handler
            walks it via focusedItemRef regardless of which tab kind is
            active. Multi-expand: each category toggles independently. */}
        {!loading && !error && activeTabIdx === renderedTabIdx && (() => {
          itemRefs.current = [];
          if (items.length === 0) {
            return (
              <EmptyState
                text={activeTab?.kind === "all" ? "No channels available" : "No channels in this tab"}
              />
            );
          }
          return items.map((item, idx) => {
            if (item.type === "ch") {
              return (
                <ChannelCard
                  key={`ch-${item.channel.channelno || item.channel.channelid || idx}`}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  channel={item.channel}
                  isPlaying={isCurrentlyPlaying(item.channel)}
                  onClick={() => {
                    // Move focus to the clicked channel before invoking
                    // the play handler so that re-renders from the player
                    // (or a no-op same-channel re-click) leave the right
                    // card in the focused state.
                    if (focusedItemRef.current !== idx) {
                      const old = itemRefs.current[focusedItemRef.current];
                      if (old) old.removeAttribute("data-focused");
                      focusedItemRef.current = idx;
                      activeZoneRef.current = "channels";
                      const newEl = itemRefs.current[idx];
                      if (newEl) newEl.setAttribute("data-focused", "true");
                    }
                    if (onChannelSelectRef.current) onChannelSelectRef.current(item.channel);
                  }}
                />
              );
            }
            // type === "cat"
            const isExpanded = expandedSet.has(item.gIdx);
            const groupHasPlaying = playingGroupIdx === item.gIdx;
            return (
              <div
                key={`cat-${item.group.category.grid || item.group.category.title || item.gIdx}`}
                ref={(el) => { itemRefs.current[idx] = el; }}
                className="focusable-category-row"
                onClick={() => {
                  // Mouse click: move focus to this cat row, then toggle.
                  if (focusedItemRef.current !== idx) {
                    const old = itemRefs.current[focusedItemRef.current];
                    if (old) old.removeAttribute("data-focused");
                    focusedItemRef.current = idx;
                    activeZoneRef.current = "channels";
                  }
                  setExpandedSet((prev) => {
                    const nextSet = new Set(prev);
                    if (nextSet.has(item.gIdx)) nextSet.delete(item.gIdx);
                    else nextSet.add(item.gIdx);
                    return nextSet;
                  });
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
                  marginTop: idx === 0 ? 0 : "4px",
                  background: "transparent",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  {/* Chevron rotates when expanded so the user sees the
                      open/closed state at a glance — supplements the
                      visible-channels affordance for collapsed groups. */}
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#94A3B8" strokeWidth="2.4"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{
                      flexShrink: 0,
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span style={{
                    fontSize: "22px", fontWeight: 600, color: "#fff",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    minWidth: 0,
                  }}>
                    {item.group.category.title}
                  </span>
                </span>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "22px",
                  fontWeight: 600,
                  color: "#CBD5E1",
                  flexShrink: 0,
                }}>
                  ({item.group.channels.length})
                  {groupHasPlaying && (
                    <span
                      aria-label="now playing in this category"
                      style={{
                        width: "8px", height: "8px",
                        borderRadius: "50%",
                        background: "#22D3EE",
                        flexShrink: 0,
                        boxShadow: "0 0 6px rgba(34,211,238,0.7)",
                      }}
                    />
                  )}
                </span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
};

// ── ChannelCard subcomponent ──────────────────────────────────────────────
// forwardRef so the parent can wire itemRefs[idx] via callback ref.
const ChannelCard = forwardRef(({ channel, isPlaying, onClick }, ref) => {
  const locked = !isSubscribed(channel);
  const priceLabel = formatPrice(channel.chprice);

  return (
    <div
      ref={ref}
      className="focusable-channel-card"
      data-playing={isPlaying ? "true" : undefined}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        height: "88px",
        padding: "12px",
        marginBottom: "4px",
        borderRadius: "14px",
        cursor: "pointer",
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
          fontSize: "22px", fontWeight: 600, color: "#fff",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          minWidth: 0,
        }}>
          {channel.chtitle}
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

      {/* NOW PLAYING pill — three reinforcing cues (color + shape + text)
          per the color-not-only accessibility rule. The persistent inset
          left rail (CSS .focusable-channel-card[data-playing]) handles
          the always-visible affordance; this pill spells it out for
          users at TV viewing distance who would miss a 6px dot. */}
      {isPlaying && (
        <span
          aria-label="now playing"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 10px",
            borderRadius: "999px",
            background: "#22D3EE",
            color: "#0F1423",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          <span style={{
            width: "6px", height: "6px",
            borderRadius: "50%",
            background: "#0F1423",
          }} />
          Now Playing
        </span>
      )}

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

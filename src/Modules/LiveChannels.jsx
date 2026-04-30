import { useEffect, useMemo, useRef, useState, useCallback, useTransition } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import useLiveChannelsStore from "../store/LiveChannelsStore";
import useLanguageStore from "../store/LivePlayersStore";
import { isSubscribed } from "../utils/subscription";
import ChannelTile from "./components/ChannelTile";
import SearchPill from "./components/SearchPill";
import { useTapAction } from "../Remote/useTapAction";

const ArrowBackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>;

const COLS = 7;
const GRID_GAP = "0.85rem";
const KEY_THROTTLE = 80;

const LiveChannels = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("All Channels");
  const [authError, setAuthError] = useState("");
  const [localError, setLocalError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedLanguageId, setSelectedLanguageId] = useState("");
  const [selectedLanguageTitle, setSelectedLanguageTitle] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [channelJumpBuffer, setChannelJumpBuffer] = useState("");
  const [, startTransition] = useTransition();
  const [renderGrid, setRenderGrid] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      startTransition(() => setRenderGrid(true))
    );
    return () => cancelAnimationFrame(id);
  }, []);
  const { categories, channelsCache, error, fetchCategories, fetchChannels, clearError } = useLiveChannelsStore();
  const { languagesCache, fetchLanguages } = useLanguageStore();
  const lastAutoPlayKey = useRef("");
  const numberBufferRef = useRef("");
  const numberTimerRef = useRef(null);

  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";
  const channelsKey = `${userid}|${mobile}|`;
  const channelsEntry = channelsCache[channelsKey] || {};
  const channels = useMemo(() => channelsEntry.data || [], [channelsEntry.data]);
  const isLoadingChannels = !!channelsEntry.isLoading;

  const langKey = `${userid}|${mobile}`;
  const langEntry = languagesCache[langKey] || {};
  const languages = useMemo(() => langEntry.data || [], [langEntry.data]);

  // ── Remote navigation ──
  const zoneRef = useRef("grid"); // "back" | "search" | "grid"
  const focusIdxRef = useRef(0);
  const cardRefs = useRef([]);
  const setCardRef = useCallback((index, el) => { cardRefs.current[index] = el; }, []);
  const backBtnRef = useRef(null);
  const searchRef = useRef(null);
  const lastKeyTime = useRef(0);
  const filteredRef = useRef([]);
  const searchFocusedRef = useRef(false);
  const handleChannelSelectRef = useRef(null);

  useEffect(() => { searchFocusedRef.current = isSearchFocused; }, [isSearchFocused]);

  const clearFocus = useCallback((zone) => {
    if (zone === "back") { if (backBtnRef.current) backBtnRef.current.removeAttribute("data-focused"); }
    else if (zone === "search") { if (searchRef.current) searchRef.current.removeAttribute("data-focused"); }
    else { const el = cardRefs.current[focusIdxRef.current]; if (el) el.removeAttribute("data-focused"); }
  }, []);

  const applyFocus = useCallback((zone, idx) => {
    if (zone === "back") { if (backBtnRef.current) backBtnRef.current.setAttribute("data-focused", "true"); }
    else if (zone === "search") { if (searchRef.current) searchRef.current.setAttribute("data-focused", "true"); }
    else {
      const el = cardRefs.current[idx];
      if (el) { el.setAttribute("data-focused", "true"); el.scrollIntoView({ block: "nearest", inline: "nearest" }); }
      focusIdxRef.current = idx;
    }
  }, []);

  const setGridFocus = useCallback((newIdx) => {
    const oldEl = cardRefs.current[focusIdxRef.current];
    if (oldEl && focusIdxRef.current !== newIdx) oldEl.removeAttribute("data-focused");
    applyFocus("grid", newIdx);
  }, [applyFocus]);

  const switchZone = useCallback((newZone) => {
    const oldZone = zoneRef.current;
    if (oldZone === newZone) return;
    clearFocus(oldZone);
    zoneRef.current = newZone;
    applyFocus(newZone, focusIdxRef.current);
  }, [clearFocus, applyFocus]);

  // Single capture-phase handler — registered ONCE, reads from refs only
  useEffect(() => {
    const handleKey = (e) => {
      const kc = e.keyCode;
      const isArrow = kc >= 37 && kc <= 40;
      const isEnter = kc === 13;
      if (!isArrow && !isEnter) return;
      if (searchFocusedRef.current) return; // let search input handle keys

      const now = Date.now();
      if (isArrow && now - lastKeyTime.current < KEY_THROTTLE) { e.preventDefault(); e.stopPropagation(); return; }
      lastKeyTime.current = now;
      e.preventDefault(); e.stopPropagation();

      const zone = zoneRef.current;

      if (zone === "back") {
        if (kc === 39) switchZone("search");
        else if (kc === 40) { if (filteredRef.current.length > 0) switchZone("grid"); }
        else if (isEnter) navigate(-1);
      } else if (zone === "search") {
        if (kc === 37) switchZone("back");
        else if (kc === 40) { if (filteredRef.current.length > 0) switchZone("grid"); }
        else if (isEnter) { if (searchRef.current) searchRef.current.querySelector("input")?.focus(); }
      } else {
        const count = filteredRef.current.length;
        if (count === 0) return;
        const cur = focusIdxRef.current;
        if (kc === 39) { if (cur + 1 < count) setGridFocus(cur + 1); }
        else if (kc === 37) { if (cur - 1 >= 0) setGridFocus(cur - 1); }
        else if (kc === 40) { const next = cur + COLS; if (next < count) setGridFocus(next); }
        else if (kc === 38) {
          const next = cur - COLS;
          if (next >= 0) setGridFocus(next);
          else switchZone("back");
        } else if (isEnter) {
          const ch = filteredRef.current[cur];
          if (ch && handleChannelSelectRef.current) handleChannelSelectRef.current(ch);
        }
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [setGridFocus, switchZone, navigate]); // stable deps only — never re-registers

  // ── Data & filters ──
  useEffect(() => {
    const state = location.state || {};
    if (state.filterByLanguage !== undefined && state.filterByLanguage !== null) {
      setSelectedLanguageId(String(state.filterByLanguage));
      if (state.languageTitle) setSelectedLanguageTitle(state.languageTitle);
      setActiveFilter("Language");
      setSearchTerm("");
      return;
    }
    if (state.filter) { setSelectedLanguageId(""); setActiveFilter(state.filter); setSearchTerm(""); }
  }, [location.state]);

  const payloadBase = { userid, mobile };

  useEffect(() => {
    if (!mobile || !selectedLanguageId) return;
    if (languages.length > 0 || langEntry.isLoading) return;
    fetchLanguages(payloadBase, { key: langKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, selectedLanguageId]);

  useEffect(() => {
    if (!selectedLanguageId || languages.length === 0) return;
    const match = languages.find((lang) => String(lang.langid) === String(selectedLanguageId));
    if (match?.langtitle) setSelectedLanguageTitle(match.langtitle);
  }, [languages, selectedLanguageId]);

  // 300ms debounce — matches Home, keeps the grid responsive while typing.
  // Auto-play on exact match (effect below) still gates on length===1, so a
  // shorter window doesn't trigger spurious auto-plays mid-keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredChannels = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase().trim();
    const isNum = term !== "" && /^\d+$/.test(term);
    const selLang = languages.find((l) => String(l.langid) === String(selectedLanguageId));
    const selLangTitle = (selLang?.langtitle || selectedLanguageTitle || "").toLowerCase();

    const matchLang = (ch) => {
      if (!selectedLanguageId && !selectedLanguageTitle) return true;
      const lid = ch.langid || ch.lang_id || ch.languageid || ch.language_id || ch.lang;
      const lt = ch.langtitle || ch.langname || ch.language || ch.language_name;
      if (lid && String(lid) === String(selectedLanguageId)) return true;
      if (lt && selLangTitle) return String(lt).toLowerCase().includes(selLangTitle);
      return false;
    };

    let base = channels;
    if (activeFilter !== "All Channels") {
      if (activeFilter === "Subscribed Channels") base = channels.filter(isSubscribed);
      else if (activeFilter === "Language") base = channels;
      else { const cat = categories.find((c) => c.title === activeFilter); if (cat) base = channels.filter((c) => c.grid === cat.grid); }
    }
    if (selectedLanguageId) base = base.filter(matchLang);
    if (!term) return base;
    return base.filter((ch) => {
      const no = (ch.channelno || "").toString().toLowerCase();
      const title = (ch.chtitle || "").toLowerCase();
      return isNum ? no === term : title.includes(term) || no.includes(term);
    });
  }, [activeFilter, categories, channels, debouncedSearchTerm, languages, selectedLanguageId, selectedLanguageTitle]);

  useEffect(() => { filteredRef.current = filteredChannels; }, [filteredChannels]);

  // Apply initial grid focus when channels load
  useEffect(() => {
    if (filteredChannels.length > 0 && zoneRef.current === "grid") {
      focusIdxRef.current = 0;
      const el = cardRefs.current[0];
      if (el) el.setAttribute("data-focused", "true");
    }
  }, [filteredChannels]);

  const handleChannelSelectRaw = useCallback((ch) => {
    // Always route through /player. LivePlayer owns the subscription gate
    // (mount-time effect surfaces the Subscription Not Available modal when
    // channelData isn't subscribed, suppressing HLS load). Go Back from the
    // modal navigates(-1) back here with filters intact.
    const url = ch.streamlink || ch.stream_link || ch.streamurl || ch.stream_url || ch.url || ch.link || ch.videourl || ch.video_url || ch.hlsurl || ch.hls_url || ch.manifest || ch.manifesturl || "";
    navigate("/player", { state: { streamlink: url, title: ch.chtitle, channelData: ch } });
  }, [navigate]);
  const handleChannelSelect = useTapAction(handleChannelSelectRaw);

  useEffect(() => { handleChannelSelectRef.current = handleChannelSelect; }, [handleChannelSelect]);

  useEffect(() => {
    if (!mobile) { setAuthError("NO_LOGIN"); return; }
    setAuthError(""); clearError();
    fetchCategories(payloadBase);
    fetchChannels(payloadBase, { key: channelsKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  // Auto-play on exact search match
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term || filteredChannels.length !== 1) { lastAutoPlayKey.current = ""; return; }
    const m = filteredChannels[0];
    const isExact = term === (m.chtitle || "").toLowerCase() || term === (m.channelno || "").toString().toLowerCase();
    const key = `${m.channelno || ""}-${m.chtitle || ""}`;
    if (isExact && lastAutoPlayKey.current !== key) { lastAutoPlayKey.current = key; handleChannelSelect(m); }
  }, [filteredChannels, debouncedSearchTerm, searchTerm, handleChannelSelect]);

  // Number key channel jump
  useEffect(() => {
    const digit = (e) => {
      if (/^[0-9]$/.test(e.key)) return e.key;
      const c = e.keyCode;
      if (c >= 48 && c <= 57) return String(c - 48);
      if (c >= 96 && c <= 105) return String(c - 96);
      return "";
    };
    const commit = () => {
      const val = numberBufferRef.current;
      if (!val) return;
      setChannelJumpBuffer(""); numberBufferRef.current = "";
      if (numberTimerRef.current) { clearTimeout(numberTimerRef.current); numberTimerRef.current = null; }
      const t = filteredChannels.find((ch) => {
        const raw = String(ch.channelno || ch.channel_no || "").trim();
        return raw === val.trim() || parseInt(raw, 10) === parseInt(val, 10);
      });
      if (t) { setLocalError(""); handleChannelSelect(t); }
      else setLocalError(`Channel ${val} not found.`);
    };
    const onKey = (e) => {
      const d = digit(e);
      if (d && !isSearchFocused) {
        e.preventDefault(); e.stopPropagation();
        numberBufferRef.current = `${numberBufferRef.current}${d}`.slice(0, 4);
        setChannelJumpBuffer(numberBufferRef.current);
        if (numberTimerRef.current) clearTimeout(numberTimerRef.current);
        numberTimerRef.current = setTimeout(commit, 1000);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); if (numberTimerRef.current) clearTimeout(numberTimerRef.current); };
  }, [filteredChannels, isSearchFocused, handleChannelSelect]);

  if (authError === "NO_LOGIN") {
    return (
      <div style={{ background: "#000", minHeight: "100vh", color: "#fff", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "36px", fontWeight: 700, marginBottom: "20px" }}>Login Required</p>
        <p style={{ fontSize: "20px", color: "#999" }}>Please log in to view TV channels.</p>
        <button onClick={() => navigate("/login")} style={{ padding: "14px 36px", fontSize: "20px", fontWeight: 600, background: "#667eea", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", marginTop: "20px" }}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="hide-scrollbar" style={{ background: "#0a0a0a", width: "100%", height: "100vh", overflow: "hidden", color: "#fff", display: "flex", flexDirection: "column", fontFamily: '"Roboto","Helvetica","Arial",sans-serif' }}>

      {/* Channel Jump HUD */}
      {channelJumpBuffer && (
        <div style={{ position: "fixed", top: "1.5rem", right: "2rem", backgroundColor: "#667eea", color: "#fff", padding: "1rem 1.75rem", borderRadius: "0.75rem", fontSize: "1.875rem", fontWeight: 700, zIndex: 100 }}>
          Channel: {channelJumpBuffer}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "1.5rem 2.5rem", gap: "1.5rem", flexShrink: 0 }}>
        <div
          ref={backBtnRef}
          className="focusable-button"
          role="button"
          tabIndex={-1}
          onClick={() => navigate(-1)}
          style={{ width: "3.5rem", height: "3.5rem", borderRadius: "14px", border: "2px solid rgba(255,255,255,0.25)", background: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", outline: "none", flexShrink: 0 }}
        >
          <ArrowBackIcon />
        </div>

        <p style={{ fontSize: "2.25rem", fontWeight: 700, margin: 0, flex: 1, textAlign: "center" }}>
          {selectedLanguageTitle ? `TV Channels — ${selectedLanguageTitle}` : "TV Channels"}
        </p>

        <SearchPill
          ref={searchRef}
          value={searchTerm}
          onChange={setSearchTerm}
          onFocusChange={setIsSearchFocused}
          placeholder="Search channels..."
          width="22rem"
          height="3.25rem"
        />
      </div>

      {/* Errors */}
      {error && <p style={{ fontSize: "1.4rem", color: "#f44336", margin: "0 2.5rem 1rem" }}>{error}</p>}
      {localError && <p style={{ fontSize: "1.4rem", color: "#ff9800", margin: "0 2.5rem 1rem" }}>{localError}</p>}

      {/* Channels Grid */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "0.5rem 2.5rem 3rem" }}>
        {(!renderGrid || isLoadingChannels) ? (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: GRID_GAP }}>
            {Array.from({ length: COLS * 2 }).map((_, i) => (
              <div key={i} style={{ borderRadius: "14px", aspectRatio: "16/10", background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)", backgroundSize: "400px 100%" }} />
            ))}
          </div>
        ) : filteredChannels.length === 0 ? (
          <div style={{ textAlign: "center", padding: "6rem 0" }}>
            <p style={{ fontSize: "1.875rem", fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>No channels found</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: GRID_GAP }}>
            {filteredChannels.map((channel, index) => (
              <ChannelTile
                key={`${channel.channelno}-${index}`}
                channel={channel}
                index={index}
                setRef={setCardRef}
                onSelect={handleChannelSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChannels;

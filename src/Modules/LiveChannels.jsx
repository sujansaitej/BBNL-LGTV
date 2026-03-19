import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import useLiveChannelsStore from "../store/LiveChannelsStore";
import useLanguageStore from "../store/LivePlayersStore";

const ArrowBackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>;
const ClearIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 8L9 16L17 12L9 8Z" fill="rgba(255,255,255,0.15)" /></svg>;

const COLS = 5;
const KEY_THROTTLE = 80;

const formatPrice = (value) => {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (text === "0" || text === "0.0" || text === "0.00") return "Free";
  return /^[0-9]+(\.[0-9]+)?$/.test(text) ? `₹${text}` : text;
};

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 1500);
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
      if (activeFilter === "Subscribed Channels") base = channels.filter((c) => c.subscribed === "yes");
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

  const handleChannelSelect = useCallback((ch) => {
    const url = ch.streamlink || ch.stream_link || ch.streamurl || ch.stream_url || ch.url || ch.link || ch.videourl || ch.video_url || ch.hlsurl || ch.hls_url || ch.manifest || ch.manifesturl;
    if (url) navigate("/player", { state: { streamlink: url, title: ch.chtitle, channelData: ch } });
    else setLocalError(`No stream URL found for channel: ${ch.chtitle}`);
  }, [navigate]);

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
        <p style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>Login Required</p>
        <p style={{ fontSize: "16px", color: "#999" }}>Please log in to view TV channels.</p>
        <button onClick={() => navigate("/login")} style={{ padding: "12px 32px", fontSize: "16px", fontWeight: 600, background: "#667eea", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", marginTop: "16px" }}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="hide-scrollbar" style={{ background: "#0a0a0a", width: "100%", height: "100vh", overflow: "hidden", color: "#fff", display: "flex", flexDirection: "column", fontFamily: '"Roboto","Helvetica","Arial",sans-serif' }}>

      {/* Channel Jump HUD */}
      {channelJumpBuffer && (
        <div style={{ position: "fixed", top: "1.5rem", right: "2rem", backgroundColor: "#667eea", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "0.75rem", fontSize: "1.5rem", fontWeight: 700, zIndex: 100 }}>
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

        <div
          ref={searchRef}
          className="focusable-button"
          style={{ width: "22rem", display: "flex", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", border: isSearchFocused ? "2px solid #667eea" : "2px solid rgba(255,255,255,0.2)", borderRadius: "28px", height: "3.25rem", padding: "0 1rem", gap: "8px", outline: "none", flexShrink: 0 }}
        >
          <span style={{ color: "rgba(255,255,255,0.4)", display: "flex", flexShrink: 0 }}><SearchIcon /></span>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search channels..."
            maxLength={50}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: "1.1rem", fontWeight: 500 }}
          />
          {searchTerm && (
            <div onClick={() => setSearchTerm("")} style={{ color: "#fff", cursor: "pointer", display: "flex", padding: "4px", flexShrink: 0 }}><ClearIcon /></div>
          )}
        </div>
      </div>

      {/* Errors */}
      {error && <p style={{ fontSize: "1.1rem", color: "#f44336", margin: "0 2.5rem 1rem" }}>{error}</p>}
      {localError && <p style={{ fontSize: "1.1rem", color: "#ff9800", margin: "0 2.5rem 1rem" }}>{localError}</p>}

      {/* Channels Grid */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "0.5rem 2.5rem 3rem" }}>
        {isLoadingChannels ? (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: "1.5rem" }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ borderRadius: "16px", height: "14rem", background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)", backgroundSize: "400px 100%" }} />
            ))}
          </div>
        ) : filteredChannels.length === 0 ? (
          <div style={{ textAlign: "center", padding: "6rem 0" }}>
            <p style={{ fontSize: "1.5rem", fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>No channels found</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: "1.5rem" }}>
            {filteredChannels.map((channel, index) => {
              const price = formatPrice(channel.chprice);
              return (
                <div
                  key={`${channel.channelno}-${index}`}
                  ref={(el) => { cardRefs.current[index] = el; }}
                  className="focusable-button"
                  role="button"
                  tabIndex={-1}
                  onClick={() => handleChannelSelect(channel)}
                  style={{ borderRadius: "16px", overflow: "hidden", cursor: "pointer", outline: "none", border: "3px solid transparent", background: "transparent" }}
                >
                  {/* Logo area */}
                  <div style={{ width: "100%", aspectRatio: "16/9", backgroundColor: "#fff", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {channel.chlogo ? (
                      <img src={channel.chlogo} alt={channel.chtitle} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "10px" }} onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 8L9 16L17 12L9 8Z" fill="rgba(0,0,0,0.1)"/></svg><span style="font-size:12px;color:rgba(0,0,0,0.3);font-weight:600">NO IMAGE</span></div>'; }} />
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                        <PlayIcon />
                        <span style={{ fontSize: "12px", color: "rgba(0,0,0,0.3)", fontWeight: 600 }}>NO IMAGE</span>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: "10px 4px 6px" }}>
                    <p style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{channel.chtitle}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                      <span style={{ fontSize: "0.98rem", color: "rgba(255, 255, 255, 0.94)" }}>{channel.channelno}</span>
                      {price && <span style={{ fontSize: "0.85rem", fontWeight: 700, color: price === "Free" ? "#43e97b" : "#ffd700" }}>{price}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChannels;

import { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import useLiveChannelsStore from "../store/LiveChannelsStore";
import useLanguageStore from "../store/LivePlayersStore";

const ArrowBackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>;
const ClearIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>;

const formatPrice = (value) => {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (text === "0" || text === "0.0" || text === "0.00") return "Free";
  return /^[0-9]+(\.[0-9]+)?$/.test(text) ? `₹${text}` : text;
};

const ChannelCard = memo(({ channel, onClick }) => {
  const priceLabel = formatPrice(channel.chprice);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      style={{ borderRadius: "16px", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.1)", cursor: "pointer", transition: "all 0.25s ease", outline: "none" }}
    >
      <div style={{ width: "100%", aspectRatio: "16/9", backgroundColor: "#111", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {channel.chlogo ? (
          <img src={channel.chlogo} alt={channel.chtitle} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <span style={{ fontSize: "28px", color: "rgba(255,255,255,0.3)" }}>📺</span>
        )}
      </div>
      <div style={{ padding: "12px" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#fff" }}>{channel.chtitle}</p>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Ch {channel.channelno}</span>
          {priceLabel && <span style={{ fontSize: "12px", color: priceLabel === "Free" ? "#43e97b" : "#ffd700", fontWeight: 600 }}>{priceLabel}</span>}
        </div>
      </div>
    </div>
  );
});

const ShimmerCard = () => (
  <>
    <style>{`@keyframes _shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    <div style={{ borderRadius: "16px", overflow: "hidden", background: "linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)", backgroundSize: "400px 100%", animation: "_shimmer 1.4s ease infinite", height: "9rem" }} />
  </>
);

const ShimmerTab = () => (
  <div style={{ width: "10rem", height: "2.75rem", borderRadius: "12px", background: "linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)", backgroundSize: "400px 100%", animation: "_shimmer 1.4s ease infinite", flexShrink: 0 }} />
);

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
  const { categories, channelsCache, isLoadingCategories, error, fetchCategories, fetchChannels, clearError } = useLiveChannelsStore();
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

  const columnsCount = 5;
  // Windowed rendering state (calculations happen after filteredChannels is defined)
  const CARD_ROW_HEIGHT = 220; // px per row (card ~170px + 2.5rem gap ~40px)
  const VISIBLE_ROWS = 3;
  const BUFFER_ROWS = 2;
  const gridContainerRef = useRef(null);
  const [windowStart, setWindowStart] = useState(0);

  const handleGridScroll = useCallback((e) => {
    const row = Math.floor(e.currentTarget.scrollTop / CARD_ROW_HEIGHT);
    setWindowStart((prev) => (prev !== row ? row : prev));
  }, []);

  useEffect(() => {
    const state = location.state || {};
    if (state.filterByLanguage !== undefined && state.filterByLanguage !== null) {
      setSelectedLanguageId(String(state.filterByLanguage));
      if (state.languageTitle) setSelectedLanguageTitle(state.languageTitle);
      setActiveFilter("Language");
      setSearchTerm("");
      return;
    }
    if (state.filter) {
      setSelectedLanguageId("");
      setActiveFilter(state.filter);
      setSearchTerm("");
    }
  }, [location.state]);

  const payloadBase = { userid, mobile };

  useEffect(() => {
    if (!mobile) return;
    if (!selectedLanguageId) return;
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
    const timeoutId = setTimeout(() => setDebouncedSearchTerm(searchTerm), 1500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const filteredChannels = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase().trim();
    const isNumericTerm = term !== "" && /^\d+$/.test(term);
    const selectedLanguage = languages.find((lang) => String(lang.langid) === String(selectedLanguageId));
    const selectedLanguageTitleLower = (selectedLanguage?.langtitle || selectedLanguageTitle || "").toLowerCase();

    const matchesLanguage = (channel) => {
      if (!selectedLanguageId && !selectedLanguageTitle) return true;
      const langIdValue = channel.langid || channel.lang_id || channel.languageid || channel.language_id || channel.lang;
      const langTitleValue = channel.langtitle || channel.langname || channel.language || channel.language_name;
      if (langIdValue && String(langIdValue) === String(selectedLanguageId)) return true;
      if (langTitleValue && selectedLanguageTitleLower) return String(langTitleValue).toLowerCase().includes(selectedLanguageTitleLower);
      return false;
    };

    let baseChannels = channels;
    if (activeFilter !== "All Channels") {
      if (activeFilter === "Subscribed Channels") {
        baseChannels = channels.filter((c) => c.subscribed === "yes");
      } else if (activeFilter === "Language") {
        baseChannels = channels;
      } else {
        const selectedCategory = categories.find((cat) => cat.title === activeFilter);
        if (selectedCategory) baseChannels = channels.filter((c) => c.grid === selectedCategory.grid);
      }
    }

    if (selectedLanguageId) baseChannels = baseChannels.filter(matchesLanguage);
    if (!term) return baseChannels;

    return baseChannels.filter((channel) => {
      const channelNo = (channel.channelno || "").toString().toLowerCase();
      const channelTitle = (channel.chtitle || "").toLowerCase();
      if (isNumericTerm) return channelNo === term;
      return channelTitle.includes(term) || channelNo.includes(term);
    });
  }, [activeFilter, categories, channels, debouncedSearchTerm, languages, selectedLanguageId, selectedLanguageTitle]);

  // Windowed rendering — calculated after filteredChannels is defined
  const totalRows = Math.ceil(filteredChannels.length / columnsCount);
  const renderStart = Math.max(0, windowStart - BUFFER_ROWS);
  const renderEnd = Math.min(totalRows, windowStart + VISIBLE_ROWS + BUFFER_ROWS);
  const paddingTop = renderStart * CARD_ROW_HEIGHT;
  const paddingBottom = Math.max(0, (totalRows - renderEnd) * CARD_ROW_HEIGHT);
  const visibleChannels = filteredChannels.slice(renderStart * columnsCount, renderEnd * columnsCount);

  const enhancedCategories = useMemo(() => {
    const customCategories = [
      { title: "All Channels", grid: "all" },
      { title: "Subscribed Channels", grid: "subscribed" },
      { title: "Language", grid: "language" },
    ];
    const normalized = [...customCategories, ...categories];
    const seen = new Set();
    return normalized.filter((cat) => {
      const key = String(cat.title || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [categories]);

  const handleChannelSelect = useCallback((ch) => {
    const streamUrl = ch.streamlink || ch.stream_link || ch.streamurl || ch.stream_url || ch.url || ch.link || ch.videourl || ch.video_url || ch.hlsurl || ch.hls_url || ch.manifest || ch.manifesturl;
    if (streamUrl) {
      navigate("/player", { state: { streamlink: streamUrl, title: ch.chtitle, channelData: ch } });
    } else {
      setLocalError(`No stream URL found for channel: ${ch.chtitle}`);
    }
  }, [navigate]);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleClearSearch = () => setSearchTerm("");

  useEffect(() => {
    if (!mobile) { setAuthError("NO_LOGIN"); return; }
    setAuthError("");
    clearError();
    fetchCategories(payloadBase);
    fetchChannels(payloadBase, { key: channelsKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  const handleFilter = (cat) => {
    setActiveFilter(cat.title);
    setSearchTerm("");
    setLocalError("");
    if (cat.title === "Language") { navigate("/languagechannels"); return; }
    setSelectedLanguageId("");
  };

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term || filteredChannels.length !== 1) { lastAutoPlayKey.current = ""; return; }
    const match = filteredChannels[0];
    const title = (match.chtitle || "").toLowerCase();
    const channelNo = (match.channelno || "").toString().toLowerCase();
    const isExactMatch = term === title || term === channelNo;
    const autoPlayKey = `${match.channelno || ""}-${match.chtitle || ""}`;
    if (isExactMatch && lastAutoPlayKey.current !== autoPlayKey) {
      lastAutoPlayKey.current = autoPlayKey;
      handleChannelSelect(match);
    }
  }, [filteredChannels, debouncedSearchTerm, searchTerm, handleChannelSelect]);

  useEffect(() => {
    const getDigitFromEvent = (event) => {
      if (/^[0-9]$/.test(event.key)) return event.key;
      if (event.code && event.code.startsWith("Digit")) return event.code.replace("Digit", "");
      const code = event.keyCode;
      if (code >= 48 && code <= 57) return String(code - 48);
      if (code >= 96 && code <= 105) return String(code - 96);
      return "";
    };

    const commitChannelJump = () => {
      const value = numberBufferRef.current;
      if (!value) return;
      setChannelJumpBuffer("");
      numberBufferRef.current = "";
      if (numberTimerRef.current) { clearTimeout(numberTimerRef.current); numberTimerRef.current = null; }
      const target = filteredChannels.find((item) => {
        const rawNo = item.channelno || item.channel_no || item.chno || "";
        if (String(rawNo).trim() === String(value).trim()) return true;
        const parsedRaw = parseInt(rawNo, 10);
        const parsedValue = parseInt(value, 10);
        if (!Number.isNaN(parsedRaw) && !Number.isNaN(parsedValue)) return parsedRaw === parsedValue;
        return false;
      });
      if (target) { setLocalError(""); handleChannelSelect(target); }
      else setLocalError(`Channel ${value} not found.`);
    };

    const handleKey = (event) => {
      const digit = getDigitFromEvent(event);
      if (digit && !isSearchFocused) {
        event.preventDefault();
        event.stopPropagation();
        numberBufferRef.current = `${numberBufferRef.current}${digit}`.slice(0, 4);
        setChannelJumpBuffer(numberBufferRef.current);
        if (numberTimerRef.current) clearTimeout(numberTimerRef.current);
        numberTimerRef.current = setTimeout(commitChannelJump, 1000);
      }
    };

    window.addEventListener("keydown", handleKey, true);
    return () => {
      window.removeEventListener("keydown", handleKey, true);
      if (numberTimerRef.current) clearTimeout(numberTimerRef.current);
    };
  }, [filteredChannels, isSearchFocused, handleChannelSelect]);

  if (authError === "NO_LOGIN") {
    return (
      <div style={{ background: "#000", minHeight: "100vh", color: "#fff", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: '"Roboto","Helvetica","Arial",sans-serif' }}>
        <p style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>Login Required</p>
        <p style={{ fontSize: "16px", color: "#999", marginBottom: "8px" }}>Please log in with your phone number to view TV channels.</p>
        <button onClick={() => navigate("/login")} style={{ padding: "12px 32px", fontSize: "16px", fontWeight: 600, background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", marginTop: "16px" }}>Go to Login</button>
      </div>
    );
  }

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "#fff", padding: "4.5rem 4rem 3rem", fontFamily: '"Roboto","Helvetica","Arial",sans-serif', textRendering: "optimizeLegibility", WebkitFontSmoothing: "antialiased", position: "relative" }}>

      {/* Channel Jump HUD */}
      {channelJumpBuffer && (
        <div style={{ position: "fixed", top: "2rem", right: "2rem", backgroundColor: "#667eea", color: "#fff", padding: "1rem 2rem", borderRadius: "0.75rem", fontSize: "1.75rem", fontWeight: 700, boxShadow: "0 0 20px rgba(102,126,234,0.5)", zIndex: 100 }}>
          Channel: {channelJumpBuffer}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => navigate(-1)} style={{ color: "#fff", border: "2px solid rgba(255,255,255,0.4)", borderRadius: "0.75rem", width: "3.5rem", height: "3.5rem", display: "flex", alignItems: "center", justifyContent: "center", background: "none", cursor: "pointer", flexShrink: 0 }}>
          <ArrowBackIcon />
        </button>

        <p style={{ fontSize: "2.5rem", fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
          {selectedLanguageTitle ? `TV Channels - ${selectedLanguageTitle}` : "TV Channels"}
        </p>

        {/* Search Bar */}
        <div style={{ width: "26rem", display: "flex", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", border: isSearchFocused ? "2px solid #667eea" : "2px solid rgba(255,255,255,0.3)", borderRadius: "28px", minHeight: "3.5rem", padding: "0 1rem", gap: "8px" }}>
          <span style={{ color: "rgba(255,255,255,0.5)", display: "flex", flexShrink: 0 }}><SearchIcon /></span>
          <input
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search Channels"
            maxLength={50}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: "1.25rem", fontWeight: 500 }}
          />
          {searchTerm && (
            <button onClick={handleClearSearch} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: "4px", flexShrink: 0 }}><ClearIcon /></button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", width: "100%", padding: "1rem 4rem", background: "#000" }}>
        {isLoadingCategories
          ? Array.from({ length: 4 }).map((_, i) => <ShimmerTab key={i} />)
          : enhancedCategories.map((cat) => {
              const isActive = activeFilter === cat.title;
              const langLabel = cat.title === "Language" && selectedLanguageTitle ? `${cat.title} (${selectedLanguageTitle})` : cat.title;
              return (
                <button
                  key={cat.grid || cat.title}
                  onClick={() => handleFilter(cat)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleFilter(cat); } }}
                  style={{ fontSize: "1rem", fontWeight: 600, padding: "0.65rem 1.75rem", borderRadius: "12px", backgroundColor: isActive ? "#3b5bfe" : "rgba(255,255,255,0.06)", color: isActive ? "#fff" : "rgba(255,255,255,0.7)", border: isActive ? "1px solid rgba(59,91,254,0.4)" : "1px solid rgba(255,255,255,0.08)", transition: "all 0.2s", cursor: "pointer" }}
                >
                  {langLabel}
                </button>
              );
            })}
      </div>

      {/* Errors */}
      {error && <p style={{ fontSize: "1.25rem", color: "#f44336", marginBottom: "1.5rem" }}>{error}</p>}
      {localError && <p style={{ fontSize: "1.25rem", color: "#ff9800", marginBottom: "1.5rem" }}>{localError}</p>}

      {/* Channels Grid — windowed: only renders visible rows + buffer */}
      <div
        ref={gridContainerRef}
        onScroll={handleGridScroll}
        style={{ overflowY: "auto", maxHeight: "520px" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${columnsCount}, 1fr)`, gap: "2.5rem", paddingTop, paddingBottom }}>
          {isLoadingChannels
            ? Array.from({ length: 10 }).map((_, i) => <ShimmerCard key={i} />)
            : filteredChannels.length === 0
            ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "4rem 0" }}>
                <p style={{ fontSize: "1.75rem", fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: 0 }}>No channels found</p>
              </div>
            )
            : visibleChannels.map((channel, i) => {
                const index = renderStart * columnsCount + i;
                return (
                  <ChannelCard key={`${channel.channelno}-${index}`} channel={channel} onClick={() => handleChannelSelect(channel)} />
                );
              })
          }
        </div>
      </div>
    </div>
  );
};

export default LiveChannels;

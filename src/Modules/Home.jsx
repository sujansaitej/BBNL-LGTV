import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useLiveChannelsStore from "../store/LiveChannelsStore";
import useLanguageStore from "../store/LivePlayersStore";
import useHomeAdsStore from "../store/ChannelsSearchStore";

const CATEGORY_COLORS = [
  "rgba(236,25,71,0.98)", "rgba(123,47,247,0.98)", "rgba(42,170,138,0.98)", "rgba(155,89,182,0.98)", "rgba(230,126,34,0.98)",
  "rgba(211,51,132,0.98)", "rgba(39,174,96,0.98)", "rgba(52,152,219,0.98)", "rgba(192,57,43,0.98)", "rgba(127,140,141,0.98)",
  "rgba(230,126,34,0.98)", "rgba(93,173,226,0.98)",
];

const CAT_COLS = 6;
const CH_COLS = 7;
const ROW_COLS = 5; // sports / entertainment row

const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>;
const LiveTvIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z" /></svg>;
const ChannelsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>;
const MovieIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" /></svg>;
const FeedbackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" /></svg>;
const FavoriteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>;

const menuItems = [
  { icon: <HomeIcon />, path: "/home", label: "Home" },
  { icon: <LiveTvIcon />, path: "/live-channels", label: "Live TV" },
  { icon: <ChannelsIcon />, path: "/languagechannels", label: "Language Channels" },
  { icon: <MovieIcon />, path: "/movies-ott", label: "Movies" },
  { icon: <FeedbackIcon />, path: "/feedback", label: "Feedback" },
  { icon: <FavoriteIcon />, path: "/favorites", label: "Favorites" },
  { icon: <SettingsIcon />, path: "/settings", label: "Settings", isBottom: true },
];

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const autoPlayTimerRef = useRef(null);
  const hasAutoPlayedRef = useRef(false);
  const AUTO_PLAY_SESSION_KEY = "home_999_autoplay_handled";

  const { categories, channelsCache, isLoadingCategories, fetchCategories, fetchChannels } = useLiveChannelsStore();
  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";
  const channelsKey = `${userid}|${mobile}|`;
  const channelsEntry = channelsCache[channelsKey] || {};
  const channels = useMemo(() => channelsEntry.data || [], [channelsEntry.data]);

  const sportsChannels = useMemo(() => {
    const names = ["star sports 1 kannada", "star sports 1", "star sports 2", "star sports 1 hd", "star sports 2 hd"];
    return names.map((n) => channels.find((ch) => (ch.chtitle || "").toLowerCase().trim() === n)).filter(Boolean).slice(0, ROW_COLS);
  }, [channels]);

  const entertainmentChannels = useMemo(() => {
    const names = ["colors kannada", "zee kannada hd", "sun tv hd", "zee tamil", "colors kannada hd"];
    return names.map((n) => channels.find((ch) => (ch.chtitle || "").toLowerCase().trim() === n)).filter(Boolean).slice(0, ROW_COLS);
  }, [channels]);

  const handleChannelPlay = useCallback((ch) => {
    const url = ch.streamlink || ch.stream_link || ch.streamurl || ch.stream_url || ch.url || ch.link;
    if (url) navigate("/player", { state: { streamlink: url, title: ch.chtitle, channelData: ch } });
  }, [navigate]);

  const cancelInfoChannelAutoplay = useCallback((reason = "interaction") => {
    if (!autoPlayTimerRef.current) return;
    clearTimeout(autoPlayTimerRef.current);
    autoPlayTimerRef.current = null;
    hasAutoPlayedRef.current = true;
    sessionStorage.setItem(AUTO_PLAY_SESSION_KEY, "1");
  }, [AUTO_PLAY_SESSION_KEY]);

  const handleSidebarNavigate = useCallback((path) => {
    if (!path || location.pathname === path) return;
    navigate(path);
  }, [navigate, location.pathname]);

  // ── Zone-based remote navigation (sidebar / categories / channels) ──
  // All focus is pure DOM — zero React re-renders on every keypress.
  // Zones: sidebar | categories | channels | sports | entertainment
  const activeZoneRef = useRef("sidebar");
  const sidebarIdxRef = useRef(0);
  const catIdxRef = useRef(0);
  const chIdxRef = useRef(0);
  const sportsIdxRef = useRef(0);
  const entIdxRef = useRef(0);
  const sidebarRefs = useRef([]);
  const catRefs = useRef([]);
  const chRefs = useRef([]);
  const sportsRefs = useRef([]);
  const entRefs = useRef([]);
  const scrollContainerRef = useRef(null);
  const enhancedCategoriesRef = useRef([]);
  const languagesRef = useRef([]);
  const sportsRef = useRef([]);
  const entRef = useRef([]);
  const lastKeyTime = useRef(0);
  const mountedRef = useRef(false);
  const KEY_THROTTLE = 80;

  const getZoneRefs = (zone) => {
    switch (zone) {
      case "sidebar": return [sidebarRefs, sidebarIdxRef];
      case "categories": return [catRefs, catIdxRef];
      case "channels": return [chRefs, chIdxRef];
      case "sports": return [sportsRefs, sportsIdxRef];
      case "entertainment": return [entRefs, entIdxRef];
      default: return [sidebarRefs, sidebarIdxRef];
    }
  };

  const setFocus = useCallback((zone, newIdx) => {
    const [refs, idxRef] = getZoneRefs(zone);
    const oldIdx = idxRef.current;
    if (oldIdx !== newIdx) {
      const oldEl = refs.current[oldIdx];
      if (oldEl) oldEl.removeAttribute("data-focused");
    }
    const newEl = refs.current[newIdx];
    if (newEl) {
      newEl.setAttribute("data-focused", "true");
      // Only scroll after initial mount — prevents page jumping past ads on load
      if (mountedRef.current) {
        newEl.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
    idxRef.current = newIdx;
  }, []);

  const switchZone = useCallback((newZone) => {
    const oldZone = activeZoneRef.current;
    if (oldZone === newZone) return;
    const [oldRefs, oldIdxRef] = getZoneRefs(oldZone);
    const oldEl = oldRefs.current[oldIdxRef.current];
    if (oldEl) oldEl.removeAttribute("data-focused");
    activeZoneRef.current = newZone;
    const [, newIdxRef] = getZoneRefs(newZone);
    setFocus(newZone, newIdxRef.current);
    // Scroll content to top when navigating up to categories or sidebar
    if ((newZone === "categories" || newZone === "sidebar") && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [setFocus]);

  // Single capture-phase keydown handler — intercepts BEFORE LG spatial nav
  useEffect(() => {
    const handleKey = (e) => {
      const kc = e.keyCode;
      const isArrow = kc >= 37 && kc <= 40;
      const isEnter = kc === 13;
      if (!isArrow && !isEnter) return;

      // Throttle rapid key repeats (held button on remote)
      const now = Date.now();
      if (isArrow && now - lastKeyTime.current < KEY_THROTTLE) { e.preventDefault(); e.stopPropagation(); return; }
      lastKeyTime.current = now;

      e.preventDefault();
      e.stopPropagation();

      const zone = activeZoneRef.current;

      if (zone === "sidebar") {
        if (kc === 38) { // UP
          const next = Math.max(0, sidebarIdxRef.current - 1);
          if (next !== sidebarIdxRef.current) setFocus("sidebar", next);
        } else if (kc === 40) { // DOWN
          const next = Math.min(menuItems.length - 1, sidebarIdxRef.current + 1);
          if (next !== sidebarIdxRef.current) setFocus("sidebar", next);
        } else if (kc === 39) { // RIGHT → content
          if (enhancedCategoriesRef.current.length > 0) switchZone("categories");
          else if (languagesRef.current.length > 0) switchZone("channels");
        } else if (isEnter) {
          const item = menuItems[sidebarIdxRef.current];
          if (item?.path) handleSidebarNavigate(item.path);
        }
      } else if (zone === "categories") {
        const count = enhancedCategoriesRef.current.length;
        const cur = catIdxRef.current;
        const col = cur % CAT_COLS;
        if (kc === 37) { // LEFT
          if (col === 0) switchZone("sidebar");
          else setFocus("categories", cur - 1);
        } else if (kc === 39) { // RIGHT
          if (cur + 1 < count) setFocus("categories", cur + 1);
        } else if (kc === 38) { // UP
          const next = cur - CAT_COLS;
          if (next >= 0) setFocus("categories", next);
        } else if (kc === 40) { // DOWN
          const next = cur + CAT_COLS;
          if (next < count) setFocus("categories", next);
          else if (languagesRef.current.length > 0) switchZone("channels");
        } else if (isEnter) {
          const el = catRefs.current[cur];
          if (el) el.click();
        }
      } else if (zone === "channels") {
        const count = Math.min(languagesRef.current.length, CH_COLS * 5);
        const cur = chIdxRef.current;
        const col = cur % CH_COLS;
        if (kc === 37) { // LEFT
          if (col === 0) switchZone("sidebar");
          else setFocus("channels", cur - 1);
        } else if (kc === 39) { // RIGHT
          if (cur + 1 < count) setFocus("channels", cur + 1);
        } else if (kc === 38) { // UP
          const next = cur - CH_COLS;
          if (next >= 0) setFocus("channels", next);
          else switchZone("categories");
        } else if (kc === 40) { // DOWN
          const next = cur + CH_COLS;
          if (next < count) setFocus("channels", next);
          else if (sportsRef.current.length > 0) switchZone("sports");
        } else if (isEnter) {
          const el = chRefs.current[cur];
          if (el) el.click();
        }
      } else if (zone === "sports") {
        const count = sportsRef.current.length;
        const cur = sportsIdxRef.current;
        if (kc === 37) { // LEFT
          if (cur === 0) switchZone("sidebar");
          else setFocus("sports", cur - 1);
        } else if (kc === 39) { // RIGHT
          if (cur + 1 < count) setFocus("sports", cur + 1);
        } else if (kc === 38) { // UP
          switchZone("channels");
        } else if (kc === 40) { // DOWN
          if (entRef.current.length > 0) switchZone("entertainment");
        } else if (isEnter) {
          const el = sportsRefs.current[cur];
          if (el) el.click();
        }
      } else if (zone === "entertainment") {
        const count = entRef.current.length;
        const cur = entIdxRef.current;
        if (kc === 37) { // LEFT
          if (cur === 0) switchZone("sidebar");
          else setFocus("entertainment", cur - 1);
        } else if (kc === 39) { // RIGHT
          if (cur + 1 < count) setFocus("entertainment", cur + 1);
        } else if (kc === 38) { // UP
          switchZone("sports");
        } else if (isEnter) {
          const el = entRefs.current[cur];
          if (el) el.click();
        }
      }
    };
    // CAPTURE phase — runs before LG spatial nav and any other handlers
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [setFocus, switchZone, handleSidebarNavigate]);

  // Apply initial sidebar focus on mount, enable scrollIntoView after mount
  useEffect(() => {
    setFocus("sidebar", 0);
    const t = setTimeout(() => { mountedRef.current = true; }, 500);
    return () => clearTimeout(t);
  }, [setFocus]);

  const { languagesCache, error: langError, fetchLanguages } = useLanguageStore();
  useEffect(() => {
    if (!mobile) return;
    fetchLanguages({ userid, mobile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  const langKey = `${userid}|${mobile}`;
  const langEntry = languagesCache[langKey] || {};
  const languages = useMemo(() => {
    const all = langEntry.data || [];
    return all.filter((l) => {
      const title = (l.langtitle || "").toLowerCase();
      return title !== "subscribed channels" && title !== "all channels" && title !== "multilingual";
    });
  }, [langEntry.data]);
  const langLoading = langEntry.isLoading;

  const handleLanguageClick = (langid) => navigate("/live-channels", { state: { filterByLanguage: langid } });

  const adclient = "fofi", srctype = "image", displayarea = "homepage", displaytype = "multiple", preferForm = false;
  const { adsCache, error: adsError, fetchAds } = useHomeAdsStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const adsKey = `${userid}|${mobile}|${displayarea}|${displaytype}|${adclient}|${srctype}`;
  const adsEntry = adsCache[adsKey] || {};
  const ads = adsEntry.data || [];
  const adsLoading = adsEntry.isLoading;

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => setActiveIndex((prev) => (prev + 1) % ads.length), 5000);
    return () => clearInterval(interval);
  }, [ads.length]);

  useEffect(() => {
    if (!mobile) return;
    fetchAds({ userid, mobile, adclient, srctype, displayarea, displaytype }, { preferForm });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);


  useEffect(() => {
    if (mobile && channels.length === 0 && !channelsEntry.isLoading) fetchChannels({ userid, mobile }, { key: channelsKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch categories for filter tabs
  useEffect(() => {
    if (!mobile) return;
    fetchCategories({ userid, mobile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  const enhancedCategories = useMemo(() => {
    const merged = [...categories];
    const seen = new Set();
    return merged.filter((cat) => {
      const key = String(cat.title || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [categories]);

  const handleCategoryClick = useCallback((cat) => {
    navigate("/live-channels", { state: { filter: cat.title } });
  }, [navigate]);

  // Sync data refs for the keyboard handler
  useEffect(() => { enhancedCategoriesRef.current = enhancedCategories; }, [enhancedCategories]);
  useEffect(() => { languagesRef.current = languages; }, [languages]);
  useEffect(() => { sportsRef.current = sportsChannels; }, [sportsChannels]);
  useEffect(() => { entRef.current = entertainmentChannels; }, [entertainmentChannels]);

  useEffect(() => {
    const alreadyHandled = sessionStorage.getItem(AUTO_PLAY_SESSION_KEY) === "1";
    if (channels.length === 0 || hasAutoPlayedRef.current || !mobile || alreadyHandled) return;
    sessionStorage.setItem(AUTO_PLAY_SESSION_KEY, "1");
    autoPlayTimerRef.current = setTimeout(() => {
      const infoChannel = channels.find((ch) => String(ch.channelno || ch.channelid || ch.channel_no || "").trim() === "999");
      if (infoChannel) {
        hasAutoPlayedRef.current = true;
        const streamUrl = infoChannel.streamlink || infoChannel.stream_link || infoChannel.streamurl || infoChannel.stream_url || infoChannel.url || infoChannel.link;
        if (streamUrl) navigate("/player", { state: { streamlink: streamUrl, title: infoChannel.chtitle, channelData: infoChannel } });
      } else {
        hasAutoPlayedRef.current = true;
      }
    }, 5000);
    return () => { if (autoPlayTimerRef.current) { clearTimeout(autoPlayTimerRef.current); autoPlayTimerRef.current = null; } };
  }, [channels, mobile, navigate, AUTO_PLAY_SESSION_KEY]);

  useEffect(() => {
    const handleUserInteraction = () => cancelInfoChannelAutoplay("user-interaction");
    const handleAppHidden = () => { if (document.hidden) cancelInfoChannelAutoplay("app-hidden"); };
    const handlePageHide = () => cancelInfoChannelAutoplay("page-hide");
    const handleWindowBlur = () => cancelInfoChannelAutoplay("window-blur");
    window.addEventListener("keydown", handleUserInteraction, true);
    window.addEventListener("click", handleUserInteraction, true);
    document.addEventListener("visibilitychange", handleAppHidden, true);
    window.addEventListener("pagehide", handlePageHide, true);
    window.addEventListener("blur", handleWindowBlur, true);
    return () => {
      window.removeEventListener("keydown", handleUserInteraction, true);
      window.removeEventListener("click", handleUserInteraction, true);
      document.removeEventListener("visibilitychange", handleAppHidden, true);
      window.removeEventListener("pagehide", handlePageHide, true);
      window.removeEventListener("blur", handleWindowBlur, true);
    };
  }, [cancelInfoChannelAutoplay]);

  const topItems = menuItems.filter((item) => !item.isBottom);
  const bottomItems = menuItems.filter((item) => item.isBottom);

  return (
    <div style={{ backgroundColor: "#0a0a0a", width: "100%", height: "100vh", color: "#fff", overflow: "hidden", display: "flex", flexDirection: "row", alignItems: "flex-start" }}>

      {/* SIDEBAR — disable LG spatial navigation so only our custom system controls focus */}
      <div data-focusable-section="home-sidebar" style={{ flex: "0 0 auto", WebkitSpatialNavigation: "none" }}>
        <div style={{
          width: "100px", height: "100vh", position: "fixed", left: 0, top: 0,
          display: "flex", flexDirection: "column", alignItems: "center",
          backgroundColor: "#0a0a0a",
          padding: "24px 0 28px", zIndex: 1000,
        }}>
          {/* Nav Icons */}
          <nav style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", flex: 1, paddingTop: "20px" }}>
            {topItems.map((item, index) => (
                <div
                  key={item.path || index}
                  ref={(el) => { sidebarRefs.current[index] = el; }}
                  className="focusable-icon-button"
                  role="button"
                  tabIndex={-1}
                  onClick={() => item.path && handleSidebarNavigate(item.path)}
                  title={item.label}
                  style={{
                    width: "60px", height: "60px", display: "flex",
                    justifyContent: "center", alignItems: "center",
                    borderRadius: "16px", border: "none", cursor: "pointer",
                    background: "transparent",
                    color: "#555",
                    outline: "none",
                  }}
                >
                  {item.icon}
                </div>
            ))}
          </nav>

          {/* Divider + Settings at bottom */}
          <div style={{ width: "36px", height: "1px", background: "#333", marginBottom: "20px" }} />
          {bottomItems.map((item) => {
            const globalIndex = menuItems.indexOf(item);
            return (
              <div
                key={item.path}
                ref={(el) => { sidebarRefs.current[globalIndex] = el; }}
                className="focusable-icon-button"
                role="button"
                tabIndex={-1}
                onClick={() => item.path && handleSidebarNavigate(item.path)}
                title={item.label}
                style={{
                  width: "52px", height: "52px", display: "flex",
                  justifyContent: "center", alignItems: "center",
                  borderRadius: "14px", border: "none", cursor: "pointer",
                  background: "transparent", color: "#555", outline: "none",
                }}
              >
                {item.icon}
              </div>
            );
          })}
        </div>
      </div>

      <div ref={scrollContainerRef} className="hide-scrollbar" style={{ display: "flex", flexDirection: "column", flex: 1, height: "100vh", overflowY: "auto", overflowX: "hidden", marginLeft: "100px", width: "calc(100% - 100px)" }}>
        {/* MAIN CONTENT */}
        <div data-focusable-section="home-content" style={{ width: "100%", paddingLeft: "1rem", paddingRight: "1.5rem", paddingTop: "1.5rem", paddingBottom: "3rem" }}>

          {/* HOME ADS */}
          <div style={{ marginBottom: "3rem" }}>
            {adsLoading ? (
              <div style={{ width: "100%", height: "33rem", borderRadius: "1.75rem", background: "#121212", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "1.5rem", color: "#2196f3", fontWeight: 600 }}>Loading ads...</div>
            ) : adsError ? (
              <div style={{ width: "100%", height: "33rem", borderRadius: "1.75rem", background: "#121212", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "1.25rem", color: "rgba(255,255,255,0.6)" }}>{adsError}</div>
            ) : (
              <div style={{ width: "100%", height: "33rem", borderRadius: "1.75rem", overflow: "hidden", background: "#121212", position: "relative", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                {ads.map((url, index) => (
                  <div key={index} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: index === activeIndex ? 1 : 0, transition: "opacity 0.8s ease-in-out", zIndex: index === activeIndex ? 1 : 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={url} alt={`ad-${index}`} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CATEGORY FILTER TABS */}
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", margin: 0 }}>CATEGORY</p>
            </div>
            {isLoadingCategories ? (
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ width: "14rem", height: "5rem", borderRadius: "14px", background: "linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)", backgroundSize: "400px 100%" }} />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${CAT_COLS}, 1fr)`, gap: "1rem" }}>
                {enhancedCategories.map((cat, index) => (
                  <div
                    key={cat.grid || cat.title}
                    ref={(el) => { catRefs.current[index] = el; }}
                    className="focusable-button"
                    role="button"
                    tabIndex={-1}
                    onClick={() => handleCategoryClick(cat)}
                    style={{
                      padding: "0.85rem 0.75rem",
                      borderRadius: "12px",
                      backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "3.75rem",
                      outline: "none",
                      border: "3px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {cat.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CHANNELS VIEW */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", margin: 0 }}>CHANNELS</p>
            </div>
            {langLoading && <p style={{ fontSize: "1.25rem", color: "rgba(255,255,255,0.6)" }}>Loading channels...</p>}
            {langError && langError !== "NO_LOGIN" && <p style={{ fontSize: "1.25rem", color: "#f44336" }}>{langError}</p>}
            {!langLoading && !langError && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${CH_COLS}, 1fr)`, gap: "1rem", overflow: "hidden", maxHeight: "calc(11rem * 5 + 4rem)" }}>
                {languages.length === 0 ? (
                  <p style={{ fontSize: "1.25rem", color: "rgba(255,255,255,0.6)" }}>No channels available</p>
                ) : (
                  languages.slice(0, CH_COLS * 5).map((lang, index) => (
                    <div
                      key={index}
                      ref={(el) => { chRefs.current[index] = el; }}
                      className="focusable-language-card"
                      role="button"
                      onClick={() => handleLanguageClick(lang.langid)}
                      tabIndex={-1}
                      style={{ borderRadius: "0.75rem", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", outline: "none", border: "3px solid transparent", overflow: "hidden" }}
                    >
                      {lang.langlogo && (
                        <div style={{ width: "100%", height: "10rem", overflow: "hidden", borderRadius: "0.75rem", background: "#121212" }}>
                          <img src={lang.langlogo} alt={lang.langtitle} loading="lazy" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "center" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* SPORTS */}
          {sportsChannels.length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", margin: "0 0 1.25rem" }}>SPORTS</p>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${ROW_COLS}, 1fr)`, gap: "1rem" }}>
                {sportsChannels.map((ch, index) => (
                  <div
                    key={ch.channelno || index}
                    ref={(el) => { sportsRefs.current[index] = el; }}
                    className="focusable-button"
                    role="button"
                    tabIndex={-1}
                    onClick={() => handleChannelPlay(ch)}
                    style={{ borderRadius: "0.75rem", cursor: "pointer", overflow: "hidden", outline: "none", border: "3px solid transparent", background: "transparent" }}
                  >
                    <div style={{ width: "100%", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {ch.chlogo ? (
                        <img src={ch.chlogo} alt={ch.chtitle} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ENTERTAINMENT */}
          {entertainmentChannels.length > 0 && (
            <div style={{ marginBottom: "3rem" }}>
              <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", margin: "0 0 1.25rem" }}>ENTERTAINMENT</p>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${ROW_COLS}, 1fr)`, gap: "1rem" }}>
                {entertainmentChannels.map((ch, index) => (
                  <div
                    key={ch.channelno || index}
                    ref={(el) => { entRefs.current[index] = el; }}
                    className="focusable-button"
                    role="button"
                    tabIndex={-1}
                    onClick={() => handleChannelPlay(ch)}
                    style={{ borderRadius: "0.75rem", cursor: "pointer", overflow: "hidden", outline: "none", border: "3px solid transparent", background: "transparent" }}
                  >
                    <div style={{ width: "100%", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {ch.chlogo ? (
                        <img src={ch.chlogo} alt={ch.chtitle} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Home;

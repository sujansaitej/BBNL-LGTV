import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useLiveChannelsStore from "../store/LiveChannelsStore";
import useLanguageStore from "../store/LivePlayersStore";
import useHomeAdsStore from "../store/ChannelsSearchStore";
import { useEnhancedRemoteNavigation } from "../Remote/useMagicRemote";

const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>;
const LiveTvIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z" /></svg>;
const MovieIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" /></svg>;
const FeedbackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" /></svg>;
const FavoriteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" /></svg>;
const TranslateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94zM12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" /></svg>;

const menuItems = [
  { icon: <HomeIcon />, path: "/home", label: "Home" },
  { icon: <LiveTvIcon />, path: "/live-channels", label: "Live TV" },
  { icon: <TranslateIcon />, path: "/languagechannels", label: "Language Channels" },
  { icon: <MovieIcon />, path: "/movies-ott", label: "Movies" },
  { icon: <FeedbackIcon />, path: "/feedback", label: "Feedback" },
  { icon: <FavoriteIcon />, path: "/favorites", label: "Favorites" },
];

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const hasAutoPlayedRef = useRef(false);
  const AUTO_PLAY_SESSION_KEY = "home_999_autoplay_handled";

  const { channelsCache, fetchChannels } = useLiveChannelsStore();
  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";
  const channelsKey = `${userid}|${mobile}|`;
  const channelsEntry = channelsCache[channelsKey] || {};
  const channels = useMemo(() => channelsEntry.data || [], [channelsEntry.data]);

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

  const { getItemProps } = useEnhancedRemoteNavigation(menuItems, {
    orientation: "vertical", useMagicRemotePointer: true, focusThreshold: 150,
    onSelect: (index) => { if (menuItems[index]?.path) handleSidebarNavigate(menuItems[index].path); },
  });

  const { languagesCache, error: langError, fetchLanguages } = useLanguageStore();
  useEffect(() => {
    if (!mobile) return;
    fetchLanguages({ userid, mobile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  const langKey = `${userid}|${mobile}`;
  const langEntry = languagesCache[langKey] || {};
  const languages = langEntry.data || [];
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
    const searchEl = headerRef.current?.querySelector('[data-focus-id="header-search"]');
    searchEl?.focus?.();
  }, []);

  useEffect(() => {
    if (mobile && channels.length === 0 && !channelsEntry.isLoading) fetchChannels({ userid, mobile }, { key: channelsKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#fff", overflowX: "hidden", display: "flex", flexDirection: "row", alignItems: "flex-start" }}>

      {/* SIDEBAR */}
      <div data-focusable-section="home-sidebar" style={{ flex: "0 0 auto" }}>
        <div style={{ width: "6rem", height: "calc(100vh - 20vh)", position: "fixed", left: "16px", top: "10vh", display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "24px", border: "2px solid rgba(255,255,255,0.2)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", padding: "16px 0", zIndex: 1000 }}>
          <div style={{ flex: 1 }} />
          <ul style={{ listStyle: "none", padding: 0, margin: 0, width: "100%" }}>
            {menuItems.map((item, index) => {
              return (
                <li key={item.path || index}>
                  <button
                    {...getItemProps(index)}
                    className="focusable-icon-button"
                    onClick={() => item.path && handleSidebarNavigate(item.path)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (item.path) handleSidebarNavigate(item.path); } }}
                    title={item.label}
                    style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", padding: "16px", marginBottom: "8px", borderRadius: "12px", background: "none", border: "none", color: "#fff", cursor: "pointer", minHeight: "4.2rem" }}
                  >
                    {item.icon}
                  </button>
                </li>
              );
            })}
          </ul>
          <div style={{ flex: 1 }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, width: "100%" }}>
        {/* HEADER */}
        <div ref={headerRef} data-focusable-section="home-header">
          <header style={{ backgroundColor: "#0a0a0a", borderBottom: "2px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: "16px", padding: "8px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", minWidth: "12rem" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>BBNL</span>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div data-focus-id="header-search" style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "9999px", padding: "0 24px", height: "3rem", width: "100%", maxWidth: "42rem" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", display: "flex" }}><SearchIcon /></span>
                <input placeholder="Search for movies, TV shows..." style={{ background: "none", border: "none", outline: "none", color: "#fff", fontSize: "1rem", width: "100%" }} />
              </div>
            </div>
            <button onClick={() => navigate("/settings")} style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", color: "#fff", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Settings">
              <SettingsIcon />
            </button>
          </header>
        </div>

        {/* MAIN CONTENT */}
        <div data-focusable-section="home-content" style={{ width: "100%", paddingLeft: "9rem", paddingRight: "4rem", paddingTop: "2rem", paddingBottom: "3rem" }}>

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

          {/* CHANNELS VIEW */}
          <div style={{ marginBottom: "3rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
              <p style={{ fontSize: "2rem", fontWeight: 700, color: "#fff", margin: 0 }}>TV CHANNELS</p>
            </div>
            {langLoading && <p style={{ fontSize: "1.25rem", color: "rgba(255,255,255,0.6)" }}>Loading channels...</p>}
            {langError && langError !== "NO_LOGIN" && <p style={{ fontSize: "1.25rem", color: "#f44336" }}>{langError}</p>}
            {!langLoading && !langError && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))", gap: "3rem" }}>
                {languages.length === 0 ? (
                  <p style={{ fontSize: "1.25rem", color: "rgba(255,255,255,0.6)" }}>No channels available</p>
                ) : (
                  languages.map((lang, index) => (
                    <div
                      key={index}
                      role="button"
                      onClick={() => handleLanguageClick(lang.langid)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleLanguageClick(lang.langid); } }}
                      tabIndex={0}
                      style={{ width: "15rem", borderRadius: "1rem", cursor: "pointer", transition: "all 0.25s ease", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", outline: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}
                    >
                      {lang.langlogo && (
                        <div style={{ width: "15rem", height: "12rem", overflow: "hidden", borderRadius: "1rem", background: "#121212", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
                          <img src={lang.langlogo} alt={lang.langtitle} loading="lazy" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "center" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useLanguageStore from "../../store/LivePlayersStore";
import { useEnhancedRemoteNavigation } from "../../Remote/useMagicRemote";

const ChannelsView = () => {
  const navigate = useNavigate();
  const { languagesCache, error, fetchLanguages } = useLanguageStore();

  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";

  useEffect(() => {
    if (!mobile) return;
    fetchLanguages({ userid, mobile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  const langKey = `${userid}|${mobile}`;
  const langEntry = languagesCache[langKey] || {};
  const languages = langEntry.data || [];
  const loading = langEntry.isLoading;

  const handleLanguageClick = (langid) => {
    navigate("/live-channels", { state: { filterByLanguage: langid } });
  };

  const columnsCount = 5;
  const { getItemProps } = useEnhancedRemoteNavigation(languages, {
    orientation: "grid", columns: columnsCount, useMagicRemotePointer: true, focusThreshold: 150,
    onSelect: (index) => { if (languages[index]) handleLanguageClick(languages[index].langid); },
  });

  return (
    <div style={{ marginBottom: "3rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <p style={{ fontSize: "2rem", fontWeight: 700, color: "#fff", margin: 0 }}>TV CHANNELS</p>
      </div>

      {loading && <p style={{ fontSize: "1.25rem", color: "rgba(255,255,255,0.6)" }}>Loading channels...</p>}
      {error && error !== "NO_LOGIN" && <p style={{ fontSize: "1.25rem", color: "#f44336" }}>{error}</p>}

      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))", gap: "3rem" }}>
          {languages.length === 0 ? (
            <p style={{ fontSize: "1.25rem", color: "rgba(255,255,255,0.6)" }}>No channels available</p>
          ) : (
            languages.map((lang, index) => {
              return (
                <div
                  key={index}
                  {...getItemProps(index)}
                  className="focusable-language-card"
                  role="button"
                  onClick={() => handleLanguageClick(lang.langid)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleLanguageClick(lang.langid); } }}
                  style={{ width: "15rem", borderRadius: "1rem", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", outline: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                >
                  {lang.langlogo && (
                    <div style={{ width: "15rem", height: "12rem", overflow: "hidden", borderRadius: "1rem", position: "relative", background: "#121212", backgroundImage: `url(${lang.langlogo})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
                      <img src={lang.langlogo} alt={lang.langtitle} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, pointerEvents: "none" }} onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.style.backgroundImage = "none"; }} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ChannelsView;

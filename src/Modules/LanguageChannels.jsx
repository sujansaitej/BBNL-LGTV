import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchLanguages } from "../server/modules-api/LanguageChannelsApi";
import { getDefaultHeaders } from "../server/config";
import { useEnhancedRemoteNavigation } from "../Remote/useMagicRemote";

const ArrowBackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>;

const GRADIENT_COLORS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  "linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)",
  "linear-gradient(135deg, #2e2e78 0%, #662d8c 100%)",
  "linear-gradient(135deg, #1a9be6 0%, #1565c0 100%)",
  "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)",
  "linear-gradient(135deg, #12c2e9 0%, #c471ed 100%)",
  "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
];

const LanguageChannels = () => {
  const navigate = useNavigate();
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";
  const payloadBase = { userid, mobile };
  const headers = getDefaultHeaders();

  const handleFetchLanguages = async () => {
    try {
      setLoading(true);
      const languagesData = await fetchLanguages(payloadBase, headers);
      setLanguages(languagesData || []);
    } catch (err) {
      setError("Failed to load languages");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mobile) { setError("NO_LOGIN"); return; }
    handleFetchLanguages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  const handleLanguageClick = (langid, langtitle) => {
    if (langid === "subs") {
      navigate("/live-channels", { state: { filter: "Subscribed Channels" } });
    } else if (langid === "") {
      navigate("/live-channels", { state: { filter: "All Channels" } });
    } else {
      navigate("/live-channels", { state: { filterByLanguage: langid, languageTitle: langtitle } });
    }
  };

  const columnsCount = 4;
  const { getItemProps } = useEnhancedRemoteNavigation(languages, {
    orientation: "grid",
    columns: columnsCount,
    useMagicRemotePointer: true,
    focusThreshold: 150,
    onSelect: (index) => {
      if (languages[index]) handleLanguageClick(languages[index].langid, languages[index].langtitle);
    },
  });

  if (error === "NO_LOGIN") {
    return (
      <div style={{ background: "#000", minHeight: "100vh", color: "#fff", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: '"Roboto","Helvetica","Arial",sans-serif' }}>
        <p style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>Login Required</p>
        <p style={{ fontSize: "16px", color: "#999", marginBottom: "8px" }}>Please log in with your phone number to view TV channels.</p>
        <button onClick={() => navigate("/login")} style={{ padding: "12px 32px", fontSize: "16px", fontWeight: 600, background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", marginTop: "16px" }}>Go to Login</button>
      </div>
    );
  }

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "#fff", padding: "24px", fontFamily: '"Roboto","Helvetica","Arial",sans-serif' }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "48px" }}>
        <button onClick={() => navigate(-1)} style={{ color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", width: "50px", height: "50px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", cursor: "pointer" }}>
          <ArrowBackIcon />
        </button>

        <p style={{ fontSize: "32px", fontWeight: 700, flex: 1, textAlign: "center", margin: 0 }}>Select Language</p>
      </div>

      {/* Error */}
      {error && error !== "NO_LOGIN" && (
        <div style={{ marginBottom: "24px", padding: "16px", borderRadius: "8px", border: "1px solid red", background: "rgba(255,0,0,0.15)", color: "#ff9a9a" }}>
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <>
          <style>{`@keyframes _shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "24px", paddingBottom: "32px" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ borderRadius: "20px", height: "280px", background: "linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)", backgroundSize: "400px 100%", animation: "_shimmer 1.4s ease infinite" }} />
            ))}
          </div>
        </>
      )}

      {/* Language Cards */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "24px", paddingBottom: "32px" }}>
          {languages.map((lang, index) => {
            return (
              <div
                key={index}
                {...getItemProps(index)}
                className="focusable-language-card"
                role="button"
                tabIndex={0}
                onClick={() => handleLanguageClick(lang.langid, lang.langtitle)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleLanguageClick(lang.langid, lang.langtitle); } }}
                style={{
                  background: GRADIENT_COLORS[index % GRADIENT_COLORS.length],
                  borderRadius: "20px",
                  padding: "30px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "280px",
                  border: "2px solid transparent",
                  outline: "none",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
                }}
              >
                {lang.langlogo && (
                  <img
                    src={lang.langlogo}
                    alt={lang.langtitle}
                    style={{ width: "120px", height: "120px", objectFit: "contain", marginBottom: "20px", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
                <p style={{ fontSize: "24px", fontWeight: 700, color: "#fff", textAlign: "center", textShadow: "0 2px 4px rgba(0,0,0,0.3)", margin: 0 }}>{lang.langtitle}</p>
                {lang.langdetails && lang.langdetails.trim() && (
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: "8px", textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
                    {lang.langdetails.replace(/<[^>]*>/g, "")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && languages.length === 0 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <p style={{ fontSize: "18px", color: "#999" }}>No languages available</p>
        </div>
      )}
    </div>
  );
};

export default LanguageChannels;

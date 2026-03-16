const ChannelCard = ({ title, logo, tag = "Live Channels", subscribed = false, language = "" }) => {
  const fallback = title ? title.substring(0, 3).toUpperCase() : "";

  return (
    <div style={{ backgroundColor: "#0c0c0f", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 12px 32px rgba(0,0,0,0.45)", overflow: "hidden", transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease", cursor: "pointer", position: "relative" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 36px rgba(75,210,255,0.22)"; e.currentTarget.style.borderColor = "rgba(75,210,255,0.4)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.45)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
    >
      <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#11131a", position: "relative" }}>
        <span style={{ position: "absolute", top: "10px", left: "10px", backgroundColor: "rgba(75,210,255,0.12)", color: "#8de5ff", fontSize: "11px", borderRadius: "12px", padding: "2px 8px", lineHeight: "22px", display: "inline-block" }}>
          {tag}
        </span>
        {logo ? (
          <img src={logo} alt={title} style={{ width: "120px", height: "120px", objectFit: "contain", filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.4))" }} />
        ) : (
          <div style={{ width: "92px", height: "92px", borderRadius: "50%", background: "linear-gradient(135deg,#ff8a00 0%,#e52e71 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "18px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {fallback}
          </div>
        )}
      </div>

      <div style={{ padding: "16px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", marginBottom: "6px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }} title={title}>
          {title || "Untitled"}
        </h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {subscribed && (
            <span style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#6ee7b7", fontSize: "11px", height: "24px", lineHeight: "24px", padding: "0 8px", borderRadius: "6px", display: "inline-block" }}>Subscribed</span>
          )}
          {language && (
            <span style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: "11px", height: "24px", lineHeight: "24px", padding: "0 8px", borderRadius: "6px", display: "inline-block" }}>{language}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelCard;

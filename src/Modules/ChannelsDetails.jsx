import { useEffect, useMemo, useState } from "react";

const ChannelsDetails = ({ channel, visible = false }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const deviceId = localStorage.getItem("deviceId") || localStorage.getItem("devslno") || "N/A";

  const expiryText = useMemo(() => {
    const raw = channel?.expirydate;
    if (!raw) return "Expires: N/A";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "Expires: N/A";
    const diffDays = Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Expired";
    return `Expires in ${diffDays} days`;
  }, [channel?.expirydate, now]);

  if (!channel) return null;

  return (
    <div style={{ position: "absolute", bottom: "24px", left: "50%", transform: "translate(-50%, 0) translateZ(0)", width: "80%", maxWidth: "1200px", minHeight: "7rem", padding: "16px 24px", display: visible ? "flex" : "none", alignItems: "center", justifyContent: "space-between", gap: "16px", color: "#fff", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(20px)", border: "2px solid rgba(255,255,255,0.2)", borderRadius: "20px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", pointerEvents: "none", zIndex: 30, willChange: "display" }}>

      {/* Left: logo + channel info */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <img src={channel.chlogo} alt={channel.chtitle} style={{ width: "5rem", height: "5rem", backgroundColor: "#fff", borderRadius: "12px", objectFit: "contain", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <div>
          <p style={{ fontSize: "1rem", fontWeight: 700, opacity: 0.9, margin: 0 }}>{String(channel.channelno || "--").padStart(3, "0")}</p>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, margin: "4px 0 0" }}>{channel.chtitle || "Unknown Channel"}</p>
          <p style={{ fontSize: "0.85rem", opacity: 0.75, margin: "4px 0 0" }}>{expiryText}</p>
        </div>
      </div>

      {/* Middle: price + device ID + subscribed */}
      <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
        {[
          { label: "Channel Price:", value: channel.chprice || "N/A" },
          { label: "Device ID:", value: deviceId },
          { label: "Subscribed:", value: channel.subscribed ? channel.subscribed.toUpperCase() : "N/A" },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: "left" }}>
            <p style={{ fontSize: "0.8rem", opacity: 0.7, marginBottom: "4px" }}>{label}</p>
            <p style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Right: time + date */}
      <div style={{ textAlign: "right" }}>
        <p style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
        <p style={{ fontSize: "0.85rem", opacity: 0.75, marginTop: "4px" }}>{now.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}</p>
      </div>
    </div>
  );
};

export default ChannelsDetails;

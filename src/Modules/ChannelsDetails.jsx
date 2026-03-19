import { useEffect, useMemo, useState } from "react";

const ChannelsDetails = ({ channel, visible = false, sidebarOpen = false }) => {
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

  const formatPrice = (value) => {
    if (value === undefined || value === null) return "N/A";
    const text = String(value).trim();
    if (!text) return "N/A";
    if (text === "0" || text === "0.0" || text === "0.00") return "Free";
    return /^[0-9]+(\.[0-9]+)?$/.test(text) ? `\u20B9${text}` : text;
  };

  if (!channel) return null;

  const leftOffset = sidebarOpen ? "calc(50% + 200px)" : "50%";
  const barWidth = sidebarOpen ? "55%" : "85%";
  const priceLabel = formatPrice(channel.chprice);

  return (
    <div style={{
      position: "absolute",
      bottom: "24px",
      left: leftOffset,
      transform: "translate(-50%, 0) translateZ(0)",
      width: barWidth,
      maxWidth: sidebarOpen ? "800px" : "1200px",
      minHeight: "110px",
      display: visible ? "flex" : "none",
      alignItems: "stretch",
      color: "#fff",
      background: "#0f1423",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      pointerEvents: "none",
      zIndex: 30,
      fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      transition: "left 0.25s ease, width 0.25s ease",
      overflow: "hidden",
    }}>

      {/* ── Left: White card with logo + channel info ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "16px",
        padding: "18px 24px",
        background: "#fff",
        borderRadius: "18px",
        margin: "6px",
        flexShrink: 0,
        minWidth: sidebarOpen ? "280px" : "340px",
      }}>
        <img
          src={channel.chlogo}
          alt={channel.chtitle}
          style={{
            width: "68px", height: "68px",
            backgroundColor: "#f0f0f0", borderRadius: "14px",
            objectFit: "contain",
            border: "1px solid #e0e0e0",
            flexShrink: 0,
          }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: "16px", fontWeight: 700, letterSpacing: "1.5px",
            color: "#2563eb", margin: 0, textTransform: "uppercase",
          }}>
            CHANNEL {String(channel.channelno || "--").padStart(3, "0")}
          </p>
          <p style={{
            fontSize: "26px", fontWeight: 700, margin: "4px 0 0",
            color: "#111", letterSpacing: "0.3px",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {channel.chtitle || "Unknown Channel"}
          </p>
        </div>
      </div>

      {/* ── Middle: Price + Device ID ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0",
        flex: 1, justifyContent: "center",
      }}>
        {/* Channel Price */}
        <div style={{
          textAlign: "center",
          padding: "0 32px",
          borderRight: "1px solid #2d3748",
        }}>
          <p style={{
            fontSize: "14px", fontWeight: 700, letterSpacing: "2px",
            color: "#a0aec0", margin: "0 0 6px", textTransform: "uppercase",
          }}>
            CHANNEL PRICE
          </p>
          <p style={{
            fontSize: "32px", fontWeight: 800, margin: 0,
            color: "#fbbf24",
          }}>
            {priceLabel}
          </p>
          {priceLabel !== "Free" && priceLabel !== "N/A" && (
            <p style={{
              fontSize: "14px", color: "#a0aec0",
              margin: "2px 0 0", fontWeight: 600,
            }}>
              Per month
            </p>
          )}
        </div>

        {/* Device ID */}
        {!sidebarOpen && (
          <div style={{
            textAlign: "center",
            padding: "0 32px",
            borderRight: "1px solid #2d3748",
          }}>
            <p style={{
              fontSize: "14px", fontWeight: 700, letterSpacing: "2px",
              color: "#a0aec0", margin: "0 0 6px", textTransform: "uppercase",
            }}>
              DEVICE ID
            </p>
            <p style={{
              fontSize: "24px", fontWeight: 700, margin: 0,
              color: "#e2e8f0",
              wordBreak: "break-all",
            }}>
              {deviceId}
            </p>
            <p style={{
              fontSize: "14px", color: "#a0aec0",
              margin: "2px 0 0", fontWeight: 600,
            }}>
              {expiryText}
            </p>
          </div>
        )}
      </div>

      {/* ── Right: Time + Date ── */}
      <div style={{
        textAlign: "center", flexShrink: 0,
        padding: "0 28px",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <p style={{
          fontSize: "14px", fontWeight: 700, letterSpacing: "2px",
          color: "#a0aec0", margin: "0 0 6px", textTransform: "uppercase",
        }}>
          TIME
        </p>
        <p style={{ fontSize: "32px", fontWeight: 800, margin: 0, color: "#fff" }}>
          {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p style={{
          fontSize: "15px", color: "#cbd5e0",
          marginTop: "2px", fontWeight: 600,
        }}>
          {now.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </div>
    </div>
  );
};

export default ChannelsDetails;

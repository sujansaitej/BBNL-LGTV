import { useEffect, useMemo, useState } from "react";

/**
 * ChannelsDetails — DTH-style live-TV info bar.
 *
 * Single dark-navy pill anchored to the bottom of the screen, holding:
 *   ┌──────────────────────────────────────────────────────────────────────────┐
 *   │ [logo] 610                CHANNEL PRICE   EXPIRES IN   DEVICE ID    USER ID                  6:27 PM │
 *   │        Star Sports HD 1   ₹19.00          3 days       GQSG…NCD     samsungtestu1            Apr 29, 2026 │
 *   └──────────────────────────────────────────────────────────────────────────┘
 *
 * Visual language (matches reference image, applies ui-ux-pro-max rules):
 *   - background: deep navy `#0a1838` with subtle outer hairline
 *   - hero values white, channel name + "Expires In" value in amber `#f59e0b`,
 *     User ID in cyan `#22d3ee` — every coloured value also carries its label
 *     so meaning is never carried by color alone (`color-not-only`)
 *   - small uppercase tracked labels, larger weight-700 values below
 *   - tabular figures on prices/IDs/time so the bar doesn't jiggle on
 *     content updates (1-px shift on a 1080p panel is visible)
 *   - 1-px hairline dividers between cells (`rgba(255,255,255,0.08)`),
 *     not heavy borders — keeps the bar reading as a single surface
 */

const LockBadge = () => (
  <span
    aria-label="Subscription required"
    title="Subscription required"
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 10px",
      marginLeft: "10px",
      borderRadius: "999px",
      background: "rgba(244,191,31,0.14)",
      border: "1px solid rgba(244,191,31,0.45)",
      color: "#F4BF1F",
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "1.2px",
      textTransform: "uppercase",
      lineHeight: 1,
      flexShrink: 0,
      verticalAlign: "middle",
    }}
  >
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        d="M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm2 0h6V8a3 3 0 0 0-6 0v2Z"
        fill="currentColor"
      />
    </svg>
    Locked
  </span>
);

const ChannelsDetails = ({ channel, visible = false, sidebarOpen = false, locked = false }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Match the deviceID logic used in API headers (src/server/config.jsx)
  const deviceId = useMemo(() => {
    const pinned = localStorage.getItem("lgtv_device_id_pinned");
    if (pinned) return `TV-${pinned}`;
    return localStorage.getItem("lgtv_device_uuid") || "N/A";
  }, []);

  const userId = localStorage.getItem("userId") || "N/A";

  const expiryDays = useMemo(() => {
    const raw = channel?.expirydate;
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    const diffDays = Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [channel?.expirydate, now]);

  const expiryText = useMemo(() => {
    if (expiryDays === null) return "N/A";
    if (expiryDays <= 0) return "Expired";
    if (expiryDays === 1) return "1 day";
    return `${expiryDays} days`;
  }, [expiryDays]);

  const formatPrice = (value) => {
    if (value === undefined || value === null) return "N/A";
    const text = String(value).trim();
    if (!text) return "N/A";
    if (text === "0" || text === "0.0" || text === "0.00") return "Free";
    return /^[0-9]+(\.[0-9]+)?$/.test(text) ? `₹${text}` : text;
  };

  if (!channel) return null;

  const priceLabel = formatPrice(channel.chprice);
  const channelNumber = String(channel.channelno || "--");
  const channelName = channel.chtitle || "Unknown Channel";

  // ── Tokens ───────────────────────────────────────────────────────────────
  const COLOR = {
    surface: "#0a1838",
    surfaceEdge: "rgba(255,255,255,0.10)",
    divider: "rgba(255,255,255,0.08)",
    label: "#94a3b8",      // slate-400 — secondary text
    value: "#ffffff",
    valueDim: "#cbd5e1",   // slate-300 — date below time
    accentWarm: "#f59e0b", // amber — channel name, expires-in
    accentCool: "#22d3ee", // cyan — user-id
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "1.6px",
    color: COLOR.label,
    margin: 0,
    textTransform: "uppercase",
    lineHeight: 1,
  };

  const valueStyle = {
    fontSize: "20px",
    fontWeight: 700,
    margin: "8px 0 0",
    color: COLOR.value,
    lineHeight: 1.1,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  // Stat cell with vertical hairline divider on the LEFT (so cells stack
  // cleanly without a trailing divider on the last item).
  const statCellStyle = {
    padding: sidebarOpen ? "0 18px" : "0 28px",
    borderLeft: `1px solid ${COLOR.divider}`,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  };

  // Sidebar-open shrink: keep all four columns visible by trimming side
  // padding and capping width.
  const barLeft = sidebarOpen ? "calc(50% + 200px)" : "50%";
  const barWidth = sidebarOpen ? "62%" : "92%";
  const barMaxWidth = sidebarOpen ? "1000px" : "1700px";

  return (
    <div
      style={{
        position: "absolute",
        bottom: "32px",
        left: barLeft,
        transform: "translate(-50%, 0) translateZ(0)",
        width: barWidth,
        maxWidth: barMaxWidth,
        height: "108px",
        display: visible ? "flex" : "none",
        alignItems: "stretch",
        color: COLOR.value,
        background: COLOR.surface,
        border: `1px solid ${COLOR.surfaceEdge}`,
        borderRadius: "22px",
        boxShadow: "0 14px 36px rgba(0,0,0,0.55)",
        pointerEvents: "none",
        zIndex: 30,
        fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        transition: "left 0.25s ease, width 0.25s ease",
        overflow: "hidden",
      }}
    >
      {/* ── Channel identity (logo + number + name) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: sidebarOpen ? "0 22px" : "0 28px",
          flexShrink: 0,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: "58px",
            height: "58px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.96)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <img
            src={channel.chlogo}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: "6px",
            }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>

        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p
            style={{
              fontSize: "26px",
              fontWeight: 700,
              margin: 0,
              color: COLOR.value,
              lineHeight: 1,
              letterSpacing: "0.5px",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {channelNumber}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "8px 0 0",
              minWidth: 0,
            }}
          >
            <p
              style={{
                fontSize: "20px",
                fontWeight: 700,
                margin: 0,
                color: COLOR.accentWarm,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: locked
                  ? (sidebarOpen ? "120px" : "180px")
                  : (sidebarOpen ? "200px" : "260px"),
              }}
            >
              {channelName}
            </p>
            {locked && <LockBadge />}
          </div>
        </div>
      </div>

      {/* ── Stat columns ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "stretch",
          minWidth: 0,
        }}
      >
        <div style={statCellStyle}>
          <p style={labelStyle}>CHANNEL PRICE</p>
          <p style={valueStyle}>{priceLabel}</p>
        </div>

        <div style={statCellStyle}>
          <p style={labelStyle}>EXPIRES IN</p>
          <p style={{ ...valueStyle, color: COLOR.accentWarm }}>{expiryText}</p>
        </div>

        <div style={statCellStyle}>
          <p style={labelStyle}>DEVICE ID</p>
          <p
            style={{
              ...valueStyle,
              maxWidth: sidebarOpen ? "180px" : "260px",
            }}
            title={deviceId}
          >
            {deviceId}
          </p>
        </div>

        <div style={statCellStyle}>
          <p style={labelStyle}>USER ID</p>
          <p
            style={{
              ...valueStyle,
              color: COLOR.accentCool,
              maxWidth: sidebarOpen ? "160px" : "240px",
            }}
            title={userId}
          >
            {userId}
          </p>
        </div>
      </div>

      {/* ── Time + Date ── */}
      <div
        style={{
          flexShrink: 0,
          padding: sidebarOpen ? "0 22px 0 18px" : "0 32px 0 24px",
          borderLeft: `1px solid ${COLOR.divider}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "center",
          textAlign: "right",
        }}
      >
        <p
          style={{
            fontSize: "30px",
            fontWeight: 700,
            margin: 0,
            color: COLOR.value,
            lineHeight: 1,
            letterSpacing: "0.5px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p
          style={{
            fontSize: "13px",
            color: COLOR.valueDim,
            margin: "8px 0 0",
            fontWeight: 500,
            letterSpacing: "0.4px",
          }}
        >
          {now.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </div>
    </div>
  );
};

export default ChannelsDetails;

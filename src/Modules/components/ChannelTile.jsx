import { memo } from "react";

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M9 8L9 16L17 12L9 8Z" fill="rgba(0,0,0,0.12)" />
  </svg>
);

const formatPrice = (value) => {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (text === "0" || text === "0.0" || text === "0.00") return "Free";
  return /^[0-9]+(\.[0-9]+)?$/.test(text) ? `₹${text}` : text;
};

function ChannelTileImpl({ channel, index, setRef, onSelect }) {
  const price = formatPrice(channel.chprice);
  const isFree = price === "Free";
  return (
    <div
      ref={(el) => setRef(index, el)}
      className="focusable-button focusable-channel-tile"
      role="button"
      tabIndex={-1}
      onClick={() => onSelect(channel)}
      style={{
        borderRadius: "14px",
        overflow: "hidden",
        cursor: "pointer",
        outline: "none",
        border: "3px solid transparent",
        background: "rgba(255,255,255,0.045)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          backgroundColor: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {channel.chlogo ? (
          <img
            src={channel.chlogo}
            alt={channel.chtitle}
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = document.createElement("div");
                fallback.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px";
                fallback.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 8L9 16L17 12L9 8Z" fill="rgba(0,0,0,0.12)"/></svg><span style="font-size:11px;color:rgba(0,0,0,0.35);font-weight:700;letter-spacing:0.5px">NO LOGO</span>';
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <PlayIcon />
            <span style={{ fontSize: "11px", color: "rgba(0,0,0,0.35)", fontWeight: 700, letterSpacing: "0.5px" }}>NO LOGO</span>
          </div>
        )}

        {channel.channelno != null && String(channel.channelno).trim() !== "" && (
          <div
            style={{
              position: "absolute",
              top: "6px",
              left: "6px",
              padding: "3px 10px",
              background: "rgba(0,0,0,0.78)",
              color: "#fff",
              borderRadius: "7px",
              fontSize: "0.95rem",
              fontWeight: 800,
              letterSpacing: "0.3px",
              lineHeight: 1.2,
            }}
          >
            {channel.channelno}
          </div>
        )}

        {price && (
          <div
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              padding: "3px 9px",
              background: isFree ? "rgba(34,197,94,0.95)" : "rgba(244,191,31,0.95)",
              color: isFree ? "#03110a" : "#1c1100",
              borderRadius: "7px",
              fontSize: "0.85rem",
              fontWeight: 800,
              letterSpacing: "0.3px",
              lineHeight: 1.2,
            }}
          >
            {price}
          </div>
        )}
      </div>

      <div style={{ padding: "8px 10px 9px" }}>
        <p
          style={{
            fontSize: "1.15rem",
            fontWeight: 700,
            margin: 0,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
            letterSpacing: "0.2px",
          }}
        >
          {channel.chtitle}
        </p>
      </div>
    </div>
  );
}

export default memo(
  ChannelTileImpl,
  (prev, next) =>
    prev.channel === next.channel &&
    prev.index === next.index &&
    prev.onSelect === next.onSelect
);

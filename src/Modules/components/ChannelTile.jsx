import { memo } from "react";

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M9 8L9 16L17 12L9 8Z" fill="rgba(0,0,0,0.1)" />
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
  return (
    <div
      ref={(el) => setRef(index, el)}
      className="focusable-button focusable-channel-tile"
      role="button"
      tabIndex={-1}
      onClick={() => onSelect(channel)}
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        cursor: "pointer",
        outline: "none",
        border: "3px solid transparent",
        background: "transparent",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          backgroundColor: "#fff",
          borderRadius: "14px",
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
            style={{ width: "100%", height: "100%", objectFit: "contain", padding: "10px" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 8L9 16L17 12L9 8Z" fill="rgba(0,0,0,0.1)"/></svg><span style="font-size:12px;color:rgba(0,0,0,0.3);font-weight:600">NO IMAGE</span></div>';
              }
            }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <PlayIcon />
            <span style={{ fontSize: "12px", color: "rgba(0,0,0,0.3)", fontWeight: 600 }}>NO IMAGE</span>
          </div>
        )}
      </div>
      <div style={{ padding: "10px 4px 6px" }}>
        <p
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            margin: 0,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {channel.chtitle}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
          <span style={{ fontSize: "0.98rem", color: "rgba(255,255,255,0.94)" }}>{channel.channelno}</span>
          {price && (
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: price === "Free" ? "#43e97b" : "#ffd700",
              }}
            >
              {price}
            </span>
          )}
        </div>
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

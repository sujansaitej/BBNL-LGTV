import { useState, useEffect, useMemo } from "react";

import useLiveChannelsStore from "../store/LiveChannelsStore";
import { useEnhancedRemoteNavigation } from "../Remote/useMagicRemote";

const ChannelsSidebar = ({ onChannelSelect, currentChannel }) => {
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { categories: cachedCategories, channelsCache, fetchCategories, fetchChannels } = useLiveChannelsStore();
  const [selectedCategory, setSelectedCategory] = useState(0);

  const userid = localStorage.getItem("userId") || "";
  const mobile = localStorage.getItem("userPhone") || "";

  const payloadBase = {
    userid,
    mobile,
  };

  const formatPrice = (value) => {
    if (value === undefined || value === null) return "";
    const text = String(value).trim();
    if (!text) return "";
    if (text === "0" || text === "0.0" || text === "0.00") return "Free";
    return /^[0-9]+(\.[0-9]+)?$/.test(text) ? `₹${text}` : text;
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (cachedCategories.length > 0) {
          setCategories([{ title: "All", grid: "" }, ...cachedCategories]);
        }
        const cats = await fetchCategories(payloadBase);
        setCategories([{ title: "All", grid: "" }, ...cats]);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadChannels = async () => {
      try {
        setLoading(true);
        setError("");
        const currentGrid = categories[selectedCategory]?.grid || "";
        const payload = { ...payloadBase, grid: currentGrid };
        const key = `${userid}|${mobile}|${currentGrid}`;
        const cached = channelsCache[key]?.data;
        if (cached) setChannels(cached || []);
        const channelsData = await fetchChannels(payload, { key });
        setChannels(channelsData || []);
      } catch (err) {
        setError("Failed to load channels");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (categories.length > 0) loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, categories]);

  const allNavigableItems = useMemo(() => [...categories, ...channels], [categories, channels]);

  const { getItemProps } = useEnhancedRemoteNavigation(allNavigableItems, {
    orientation: "vertical",
    useMagicRemotePointer: true,
    focusThreshold: 150,
    onSelect: (index) => {
      if (index < categories.length) {
        setSelectedCategory(index);
      } else {
        const channelIndex = index - categories.length;
        if (channels[channelIndex] && onChannelSelect) onChannelSelect(channels[channelIndex]);
      }
    },
  });

  return (
    <div style={{ width: "28rem", backgroundColor: "rgba(0,0,0,0.7)", height: "100vh", display: "flex", flexDirection: "column", paddingTop: "32px", paddingLeft: "16px", paddingRight: "16px" }}>
      {/* Category Tabs */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px", flexShrink: 0 }}>
        {categories.map((cat, idx) => {
          const isSelected = selectedCategory === idx;
          return (
            <button
              key={idx}
              {...getItemProps(idx)}
              className="focusable-category-tab"
              onClick={() => setSelectedCategory(idx)}
              style={{
                minHeight: "2.75rem",
                minWidth: "5.5rem",
                fontSize: "14px",
                fontWeight: 600,
                color: isSelected ? "#000" : "rgba(255,255,255,0.6)",
                backgroundColor: isSelected ? "#fff" : "transparent",
                borderRadius: "9999px",
                padding: "0 20px",
                border: "2px solid transparent",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {cat.title}
            </button>
          );
        })}
      </div>

      {/* Channel List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
        {loading && <p style={{ textAlign: "center", fontSize: "14px", color: "rgba(255,255,255,0.6)", marginTop: "32px" }}>Loading channels...</p>}
        {error && <p style={{ textAlign: "center", fontSize: "14px", color: "#f44336", marginTop: "32px" }}>{error}</p>}
        {!loading && !error && channels.length === 0 && (
          <p style={{ textAlign: "center", fontSize: "14px", color: "rgba(255,255,255,0.5)", marginTop: "32px" }}>No channels found</p>
        )}

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {channels.map((channel, index) => {
            const globalIndex = categories.length + index;
            const isActive = currentChannel?.channelno === channel.channelno;
            const priceLabel = formatPrice(channel.chprice);

            return (
              <li key={`${channel.channelno}-${index}`}>
                <button
                  {...getItemProps(globalIndex)}
                  className="focusable-sidebar-item"
                  onClick={() => onChannelSelect && onChannelSelect(channel)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (onChannelSelect) onChannelSelect(channel); } }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "8px",
                    backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                    border: "2px solid transparent",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "#fff",
                    background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                  }}
                >
                  {channel.chlogo ? (
                    <img
                      src={channel.chlogo}
                      alt={channel.chtitle}
                      style={{ width: "4rem", height: "4rem", objectFit: "contain", backgroundColor: "#fff", borderRadius: "8px", border: "2px solid rgba(255,255,255,0.15)", flexShrink: 0 }}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <div style={{ width: "4rem", height: "4rem", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "8px", border: "2px solid rgba(255,255,255,0.15)", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{channel.chtitle}</p>
                    {priceLabel && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{priceLabel}</p>}
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.55)", flexShrink: 0 }}>{channel.channelno}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ChannelsSidebar;

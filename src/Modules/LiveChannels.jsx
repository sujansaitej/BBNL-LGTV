import React, { useEffect, useState } from "react";
import { Box, Typography, ButtonBase, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const LiveChannels = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All Channels");
  const [error, setError] = useState("");

  // Get userid + mobile from localStorage
  const userid = localStorage.getItem("userId") || "testiser1";
  const mobile = localStorage.getItem("userPhone") || "";

  console.log("[LiveChannels] localStorage check:", {
    userId: localStorage.getItem("userId"),
    userPhone: localStorage.getItem("userPhone"),
    isAuthenticated: localStorage.getItem("isAuthenticated"),
    actualMobileValue: mobile,
    willCallAPI: !!mobile,
  });

  const payload = {
    userid,
    mobile,
    ip_address: "192.168.101.110",
    mac_address: "68:1D:EF:14:6C:21",
  };

  console.log(" Request payload:", payload);

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
    devslno: "FOFI20191129000336",
  };

  // ================= FETCH CATEGORIES =================
  const fetchCategories = async () => {
    try {
      const res = await axios.post(
        "http://124.40.244.211/netmon/cabletvapis/chnl_categlist",
        payload,
        { headers }
      );

      const apiCategories = res?.data?.body?.[0]?.categories || [];

      const formatted = apiCategories.map((c) => ({
        title: c.grtitle,
        grid: c.grid,
      }));

      setCategories(formatted);
    } catch (err) {
      console.error("Category API Error:", err?.response?.data || err.message);
      setError("Failed to load categories");
    }
  };

  // ================= FETCH CHANNELS =================
  const fetchChannels = async () => {
    try {
      const res = await axios.post(
        "http://124.40.244.211/netmon/cabletvapis/chnl_data",
        payload,
        { headers }
      );

      console.log("[LiveChannels] chnl_data response:", res.data);

      if (res?.data?.status?.err_code !== 0) {
        const errMsg = res?.data?.status?.err_msg || "Failed to load channels";
        console.error("[LiveChannels] API returned error:", errMsg);
        setError(`${errMsg} - Please ensure you've logged in with a valid mobile number.`);
        return;
      }

      const apiChannels = res?.data?.body || [];

      setChannels(apiChannels);
      setFilteredChannels(apiChannels);
    } catch (err) {
      console.error("[LiveChannels] Channel API Error:", err?.response?.data || err.message);
      const errMsg = err?.response?.data?.status?.err_msg || "Failed to load channels";
      setError(`${errMsg} - Network error or invalid credentials.`);
    }
  };

  useEffect(() => {
    if (!mobile) {
      setError("NO_LOGIN");
      console.error("[LiveChannels] No mobile number found in localStorage. Please log in first.");
      return;
    }
    fetchCategories();
    fetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  // Show login required message
  if (error === "NO_LOGIN") {
    return (
      <Box
        sx={{
          background: "#000",
          minHeight: "100vh",
          color: "#fff",
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontSize: 28, fontWeight: 700, mb: 2 }}>
          Login Required
        </Typography>
        <Typography sx={{ fontSize: 16, mb: 1, color: "#999" }}>
          Please log in with your phone number to view TV channels.
        </Typography>
        
        {/* Debug info - remove in production */}
        <Box sx={{ fontSize: 12, color: "#666", mb: 3, textAlign: "center" }}>
          <div>localStorage.userPhone: {localStorage.getItem("userPhone") || "(empty)"}</div>
          <div>localStorage.userId: {localStorage.getItem("userId") || "(empty)"}</div>
        </Box>
        
        <Button
          variant="contained"
          onClick={() => navigate("/login")}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: 16,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
            },
          }}
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  // ================= FILTER HANDLER =================
  const handleFilter = (cat) => {
    setActiveFilter(cat.title);

    if (cat.title === "All Channels") {
      setFilteredChannels(channels);
      return;
    }

    if (cat.title === "Subscribed Channels") {
      setFilteredChannels(channels.filter((c) => c.subscribed === "yes"));
      return;
    }

    setFilteredChannels(channels.filter((c) => c.grid === cat.grid));
  };

  // ================= CHANNEL CARD =================
  const ChannelBox = ({ logo, name, subscribed, onClick }) => (
    <Box>
      <Box
        sx={{
          width: 200,
          height: 120,
          background: "#fff",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          cursor: onClick ? "pointer" : "default",
        }}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
      >
        {subscribed === "yes" && (
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "red",
              color: "#fff",
              fontSize: 10,
              px: 1.5,
              borderRadius: "10px",
            }}
          >
            Live
          </Box>
        )}

        <img
          src={logo}
          alt={name}
          style={{ width: "80%", height: "80%", objectFit: "contain" }}
          onError={(e) =>
            (e.target.src =
              "http://124.40.244.211/netmon/assets/site_images/chnlnoimage.jpg")
          }
        />
      </Box>

      <Typography sx={{ color: "#fff", fontSize: 14, fontWeight: 600, mt: 1 }}>
        {name}
      </Typography>

      {/* <Typography sx={{ color: "#9b9b9b", fontSize: 12 }}>
        live Channels
      </Typography> */}
    </Box>
  );

  return (
    <Box sx={{ background: "#000", minHeight: "100vh", color: "#fff", p: 4 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, mb: 2 }}>
        TV Channels
      </Typography>

      {/* ERROR BOX - only for API errors, not for NO_LOGIN */}
      {error && error !== "NO_LOGIN" && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            border: "1px solid red",
            background: "rgba(255,0,0,0.15)",
            color: "#ff9a9a",
          }}
        >
          {error}
        </Box>
      )}

      {/* FILTERS */}
      <Box sx={{ display: "flex", gap: 2, mb: 5, flexWrap: "wrap" }}>
        {categories.map((cat, i) => (
          <ButtonBase
            key={i}
            onClick={() => handleFilter(cat)}
            sx={{
              px: 2.5,
              py: 0.7,
              borderRadius: 20,
              border: "1px solid #fff",
              color: "#fff",
              fontSize: 13,
              background:
                activeFilter === cat.title ? "rgba(255,255,255,0.2)" : "none",
            }}
          >
            {cat.title}
          </ButtonBase>
        ))}
      </Box>

      {/* CHANNEL GRID */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          columnGap: 5,
          rowGap: 6,
        }}
      >
        {filteredChannels.length === 0 ? (
          <Typography sx={{ color: "#888" }}>
            No channels available
          </Typography>
        ) : (
          filteredChannels.map((ch, i) => (
            <ChannelBox
              key={i}
              logo={ch.chlogo}
              name={ch.chtitle}
              subscribed={ch.subscribed}
              onClick={() => {
                if (ch.streamlink) {
                  navigate("/player", { state: { streamlink: ch.streamlink, title: ch.chtitle } });
                } else {
                  console.warn("No streamlink available for channel", ch);
                  setError("No stream available for this channel.");
                }
              }}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default LiveChannels;



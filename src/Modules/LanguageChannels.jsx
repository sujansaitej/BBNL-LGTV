import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, IconButton, Skeleton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { fetchLanguages } from "../Api/modules-api/LanguageChannelsApi";
import { fetchChannels } from "../Api/modules-api/ChannelApi";
import { DEFAULT_HEADERS, DEFAULT_USER } from "../Api/config";

// Gradient colors for each language card (unique gradient pairs)
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
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get userid + mobile
  const userid = localStorage.getItem("userId") || DEFAULT_USER.userid;
  const mobile = localStorage.getItem("userPhone") || "";

  const payloadBase = {
    userid,
    mobile,
  };

  const headers = {
    ...DEFAULT_HEADERS,
  };

  // ================= FETCH LANGUAGES =================
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

  // ================= FETCH CHANNELS =================
  const handleFetchChannels = async () => {
    try {
      const apiChannels = await fetchChannels(payloadBase, headers, setError);
      setChannels(apiChannels || []);
    } catch (err) {
      console.error("Failed to load channels:", err);
    }
  };

  useEffect(() => {
    if (!mobile) {
      setError("NO_LOGIN");
      return;
    }
    handleFetchLanguages();
    handleFetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  // Handle language card click
  const handleLanguageClick = (langid) => {
    if (langid === "subs") {
      navigate("/live-channels", { state: { filter: "Subscribed Channels" } });
    } else if (langid === "") {
      navigate("/live-channels", { state: { filter: "All Channels" } });
    } else {
      // Navigate to channels filtered by language
      navigate("/live-channels", { state: { filterByLanguage: langid } });
    }
  };

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

  return (
    <Box sx={{ background: "#000", minHeight: "100vh", color: "#fff", p: 3 }}>
      {/* ================= HEADER WITH BACK BUTTON AND TITLE ================= */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 6 }}>
        {/* Back Button */}
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "8px",
            width: 50,
            height: 50,
            "&:hover": {
              background: "rgba(255,255,255,0.1)",
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        {/* Title */}
        <Typography sx={{ fontSize: 32, fontWeight: 700, flex: 1, textAlign: "center" }}>
          Select Language
        </Typography>

        {/* Empty space for balance */}
        <Box sx={{ width: 50 }} />
      </Box>

      {/* ================= ERROR BOX ================= */}
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

      {/* ================= LOADING STATE ================= */}
      {loading && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 3,
            pb: 4,
          }}
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={`lang-skel-${index}`}
              variant="rounded"
              sx={{ width: "100%", height: "280px", borderRadius: "20px" }}
            />
          ))}
        </Box>
      )}

      {/* ================= LANGUAGE CARDS GRID ================= */}
      {!loading && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 3,
            pb: 4,
          }}
        >
          {languages.map((lang, index) => (
            <Box
              key={index}
              onClick={() => handleLanguageClick(lang.langid)}
              sx={{
                background: GRADIENT_COLORS[index % GRADIENT_COLORS.length],
                borderRadius: "20px",
                padding: "30px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "280px",
                border: "2px solid transparent",
                "&:hover": {
                  transform: "translateY(-10px)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                  borderColor: "rgba(255,255,255,0.3)",
                },
              }}
            >
              {/* Language Logo */}
              {lang.langlogo && (
                <img
                  src={lang.langlogo}
                  alt={lang.langtitle}
                  style={{
                    width: "120px",
                    height: "120px",
                    objectFit: "contain",
                    marginBottom: "20px",
                    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}

              {/* Language Title */}
              <Typography
                sx={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#fff",
                  textAlign: "center",
                  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                {lang.langtitle}
              </Typography>

              {/* Language Details if available */}
              {lang.langdetails && lang.langdetails.trim() && (
                <Typography
                  sx={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.8)",
                    textAlign: "center",
                    mt: 1,
                    textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}
                >
                  {lang.langdetails.replace(/<[^>]*>/g, "")}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* ================= EMPTY STATE ================= */}
      {!loading && languages.length === 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <Typography sx={{ fontSize: 18, color: "#999" }}>
            No languages available
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default LanguageChannels;

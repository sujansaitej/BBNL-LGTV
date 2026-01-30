import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { fetchIptvAds } from "../../Api/modules-api/HomeAdsApi";

const HomeAds = (props) => {
  const {
    adclient = "fofi",
    srctype = "image",
    displayarea = "homepage",
    displaytype = "multiple",
    preferForm = false,
  } = props || {};

  const userid = (props && props.userid) ?? localStorage.getItem("userId") ?? "testiser1";
  const mobile = (props && props.mobile) ?? localStorage.getItem("userPhone") ?? "";
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-scroll effect
  useEffect(() => {
    if (ads.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [ads.length]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError("");

    if (!mobile) {
      setError("Mobile number required. Please login again");
      setLoading(false);
      return;
    }

    const attempt = async (preferFormAttempt) => {
      try {
        const urls = await fetchIptvAds({
          userid,
          mobile,
          adclient,
          srctype,
          displayarea,
          displaytype,
          signal: controller.signal,
          preferForm: preferFormAttempt,
        });

        if (!cancelled) setAds(urls);
      } catch {
        if (!cancelled) setError("Failed to load ads");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    attempt(preferForm);
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: 400,
          borderRadius: "24px",
          background: "#0a0a0a",
          mb: 6,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#8bdcff",
          fontSize: "16px",
        }}
      >
        Loading ads...
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          width: "100%",
          height: 400,
          borderRadius: "24px",
          background: "#0a0a0a",
          mb: 6,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#aaa",
        }}
      >
        {error}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: 430,
        borderRadius: "24px",
        overflow: "hidden",
        background: "#0a0a0a",
        mb: 6,
        position: "relative",
      }}
    >
      {ads.map((url, index) => (
        <Box
          key={index}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: index === activeIndex ? 1 : 0,
            transition: "opacity 0.8s ease-in-out",
            zIndex: index === activeIndex ? 1 : 0,
          }}
        >
          <img
            src={url}
            alt={`ad-${index}`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

export default HomeAds;
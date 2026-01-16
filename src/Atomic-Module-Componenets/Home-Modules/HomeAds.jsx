import { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, IconButton } from "@mui/material";
import { fetchIptvAds } from "../../Api/modules-api/HomeAdsApi";
import { useRemoteNavigation } from "../../Atomic-Common-Componenets/useRemoteNavigation";

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
  const [active, setActive] = useState(0);

  // Remote navigation for carousel buttons (Previous, Next)
  const { getItemProps } = useRemoteNavigation(2, {
    orientation: "horizontal",
    onSelect: (index) => {
      if (index === 0) {
        // Previous button
        setActive((p) => (p === 0 ? ads.length - 1 : p - 1));
      } else if (index === 1) {
        // Next button
        setActive((p) => (p + 1) % ads.length);
      }
    },
  });

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

  return (
    <Box
      sx={{
        width: "100%",
        height: 400,
        borderRadius: "24px",
        overflow: "hidden",
        position: "relative",
        background: "#0a0a0a",
        mb: 6,
      }}
    >
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <CircularProgress sx={{ color: "#8bdcff" }} />
        </Box>
      )}

      {!loading && error && (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <Typography color="#aaa">{error}</Typography>
        </Box>
      )}

      {!loading &&
        ads.map((url, index) => (
          <Box
            key={index}
            sx={{
              position: "absolute",
              inset: 0,
              opacity: index === active ? 1 : 0,
              transition: "opacity .6s ease",
            }}
          >
            <img
              src={url}
              alt="ad"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Box>
        ))}

      {ads.length > 1 && (
        <>
          <IconButton
            {...getItemProps(0)}
            onClick={() => setActive((p) => (p === 0 ? ads.length - 1 : p - 1))}
            sx={{
              position: "absolute",
              left: 18,
              top: "50%",
              transform: getItemProps(0)["data-focused"] ? "translateY(-50%) scale(1.2)" : "translateY(-50%)",
              background: getItemProps(0)["data-focused"] ? "rgba(102, 126, 234, 0.8)" : "rgba(0,0,0,.6)",
              border: getItemProps(0)["data-focused"] ? "2px solid #667eea" : "none",
            }}
          >
          </IconButton>

          <IconButton
            {...getItemProps(1)}
            onClick={() => setActive((p) => (p + 1) % ads.length)}
            sx={{
              position: "absolute",
              right: 18,
              top: "50%",
              transform: getItemProps(1)["data-focused"] ? "translateY(-50%) scale(1.2)" : "translateY(-50%)",
              background: getItemProps(1)["data-focused"] ? "rgba(102, 126, 234, 0.8)" : "rgba(0,0,0,.6)",
              border: getItemProps(1)["data-focused"] ? "2px solid #667eea" : "none",
            }}
          >
          </IconButton>
        </>
      )}
    </Box>
  );
};

export default HomeAds;
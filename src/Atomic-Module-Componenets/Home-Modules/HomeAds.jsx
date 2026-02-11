import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import useHomeAdsStore from "../../Global-storage/ChannelsSearchStore";
import { TV_SPACING, TV_RADIUS, TV_SHADOWS, TV_COLORS, TV_TYPOGRAPHY } from "../../styles/tvConstants";

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
  const { adsCache, error, fetchAds } = useHomeAdsStore();
  const [activeIndex, setActiveIndex] = useState(0);

  const adsKey = `${userid}|${mobile}|${displayarea}|${displaytype}|${adclient}|${srctype}`;
  const adsEntry = adsCache[adsKey] || {};
  const ads = adsEntry.data || [];
  const loading = adsEntry.isLoading;

  // Auto-scroll effect
  useEffect(() => {
    if (ads.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [ads.length]);

  useEffect(() => {
    if (!mobile) return;
    fetchAds(
      {
        userid,
        mobile,
        adclient,
        srctype,
        displayarea,
        displaytype,
      },
      { preferForm }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, adclient, srctype, displayarea, displaytype, preferForm]);

  if (loading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "33rem",
          borderRadius: "1.75rem",
          background: "#121212",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "1.5rem",
          color: "#2196f3",
          fontWeight: 600,
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
          height: "33rem",
          borderRadius: "1.75rem",
          background: "#121212",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "1.25rem",
          color: "rgba(255,255,255,0.6)",
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
        height: "33rem",
        borderRadius: "1.75rem",
        overflow: "hidden",
        background: "#121212",
        position: "relative",
        display: "block",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={url}
            alt={`ad-${index}`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
              margin: 0,
              padding: 0,
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

export default HomeAds;
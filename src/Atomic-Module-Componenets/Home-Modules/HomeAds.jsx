import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import useHomeAdsStore from "../../Global-storage/ChannelsSearchStore";

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
          height: 540,
          borderRadius: "28px",
          background: "#0a0a0a",
          mb: 6,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#8bdcff",
          fontSize: "20px",
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
          height: 540,
          borderRadius: "28px",
          background: "#0a0a0a",
          mb: 6,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#aaa",
          fontSize: "18px",
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
        height: 540,
        borderRadius: "28px",
        overflow: "hidden",
        background: "#0a0a0a",
        mb: 6,
        position: "relative",
        display: "block",
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
import { useEffect, useState } from "react";
import axios from "axios";
import { Box, Typography, CircularProgress } from "@mui/material";
import { API_ENDPOINTS, getDefaultHeaders } from "../Api/config";

const FALLBACK_IMAGE = "http://124.40.244.211/netmon/Cabletvapis/showimg/service_locked.png";

const ServiceLocked = () => {
  const [imageUrl, setImageUrl] = useState(FALLBACK_IMAGE);
  const [loadingImage, setLoadingImage] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchImage = async () => {
      try {
        const mobile = localStorage.getItem("userPhone") || "0000000000";
        const requestPayload = {
          userid: "lgiptv",
          mobile,
          device_type: "LG TV",
          mac_address: "",
          device_name: "LG TV",
          app_package: "com.lgiptv.bbnl",
        };
        const response = await axios.post(
          API_ENDPOINTS.ERROR_IMAGES,
          requestPayload,
          { headers: getDefaultHeaders() }
        );

        const errImgs = response?.data?.errImgs || [];
        const item = errImgs.find((i) =>
          Object.prototype.hasOwnProperty.call(i, "SERVICE_LOCKED")
        );
        const url = item?.SERVICE_LOCKED;

        if (isMounted && url) setImageUrl(url);
      } catch {
        /* keep fallback */
      } finally {
        if (isMounted) setLoadingImage(false);
      }
    };

    fetchImage();
    return () => { isMounted = false; };
  }, []);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        bgcolor: "#3a3a3a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 4, md: 8 },
        px: { xs: 4, md: 10 },
        zIndex: 99999,
      }}
    >
      {/* Left — text card */}
      <Box
        sx={{
          flex: "0 0 auto",
          width: { xs: "100%", md: 520 },
          bgcolor: "#1a1a1a",
          borderRadius: "24px",
          border: "1.5px solid rgba(255,255,255,0.08)",
          p: { xs: 5, md: 8 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: { xs: 280, md: 380 },
          gap: 4,
        }}
      >
        <Typography
          sx={{
            color: "#ffffff",
            fontSize: { xs: 36, md: 48, lg: 56 },
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          Oops! Service Locked
        </Typography>
        <Typography
          sx={{
            color: "rgba(255,255,255,0.55)",
            fontSize: { xs: 22, md: 28 },
            fontWeight: 500,
            textAlign: "center",
            lineHeight: 1.5,
            maxWidth: 380,
          }}
        >
          We request you to use BBNL network continue enjoying your favorite content
        </Typography>
      </Box>

      {/* Right — image */}
      <Box
        sx={{
          flex: "0 0 auto",
          width: { xs: 260, md: 380, lg: 440 },
          height: { xs: 260, md: 380, lg: 440 },
          borderRadius: "20px",
          overflow: "hidden",
          bgcolor: "#111",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {loadingImage ? (
          <CircularProgress sx={{ color: "#F2BC1B" }} size={48} />
        ) : (
          <Box
            component="img"
            src={imageUrl}
            alt="Service Locked"
            onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default ServiceLocked;

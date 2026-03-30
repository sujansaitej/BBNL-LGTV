import { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../../server/config";

const FALLBACK_IMAGE = "http://124.40.244.211/netmon/Cabletvapis/showimg/service_locked.png";

const ServiceLocked = () => {
  const [imageUrl, setImageUrl] = useState(FALLBACK_IMAGE);
  const [loadingImage, setLoadingImage] = useState(true);

  /* ── Block remote navigation keys from leaking through ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      const kc = e.keyCode;
      const navKeys = [461, 13, 37, 38, 39, 40, 8, 403];
      const isDigit = (kc >= 48 && kc <= 57) || (kc >= 96 && kc <= 105);
      if (navKeys.includes(kc) || isDigit) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      try {
        const mobile = localStorage.getItem("userPhone") || "0000000000";
        const response = await axios.post(API_ENDPOINTS.ERROR_IMAGES, { userid: "lgiptv", mobile, device_type: "LG TV", mac_address: "", device_name: "LG TV", app_package: "com.lgiptv.bbnl" }, { headers: getDefaultHeaders() });
        const errImgs = response?.data?.errImgs || [];
        const item = errImgs.find((i) => Object.prototype.hasOwnProperty.call(i, "SERVICE_LOCKED"));
        const url = item?.SERVICE_LOCKED;
        if (isMounted && url) setImageUrl(url);
      } catch { /* keep fallback */ }
      finally { if (isMounted) setLoadingImage(false); }
    };
    fetchImage();
    return () => { isMounted = false; };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", backgroundColor: "#3a3a3a", display: "flex", alignItems: "center", justifyContent: "center", gap: "64px", padding: "40px 80px", zIndex: 99999 }}>
      {/* Left — text card */}
      <div style={{ flex: "0 0 auto", width: "520px", backgroundColor: "#1a1a1a", borderRadius: "24px", border: "1.5px solid rgba(255,255,255,0.08)", padding: "64px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "380px", gap: "32px" }}>
        <p style={{ color: "#ffffff", fontSize: "48px", fontWeight: 800, textAlign: "center", lineHeight: 1.2, margin: 0 }}>Oops! Service Locked</p>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "28px", fontWeight: 500, textAlign: "center", lineHeight: 1.5, maxWidth: "380px", margin: 0 }}>
          We request you to use BBNL network continue enjoying your favorite content
        </p>
      </div>

      {/* Right — image */}
      <div style={{ flex: "0 0 auto", width: "440px", height: "440px", borderRadius: "20px", overflow: "hidden", backgroundColor: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {loadingImage ? (
          <>
            <style>{`@keyframes _spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            <div style={{ width: "48px", height: "48px", border: "4px solid rgba(242,188,27,0.3)", borderTopColor: "#F2BC1B", borderRadius: "50%", animation: "_spin 1s linear infinite" }} />
          </>
        ) : (
          <img src={imageUrl} alt="Service Locked" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>
    </div>
  );
};

export default ServiceLocked;

import { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS, API_BASE_URL_PROD, getDefaultHeaders } from "../../server/config";

const FALLBACK_LOGIN_REQUIRED_IMAGE = "http://124.40.244.211/netmon/Cabletvapis/showimg/login_required.png";

const RegisterNumber = ({ onRetry, message }) => {
  const [imageUrl, setImageUrl] = useState(FALLBACK_LOGIN_REQUIRED_IMAGE);
  const [loadingImage, setLoadingImage] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchErrorImages = async () => {
      try {
        const mobile = localStorage.getItem("userPhone") || "0000000000";
        const response = await axios.post(API_ENDPOINTS.ERROR_IMAGES, { userid: "lgiptv", mobile, device_type: "LG TV", mac_address: "", device_name: "LG TV", app_package: "com.lgiptv.bbnl" }, { headers: getDefaultHeaders() });
        const errImgs = response?.data?.errImgs || [];
        const loginRequiredItem = errImgs.find((item) => Object.prototype.hasOwnProperty.call(item, "LOGIN_REQUIRED"));
        const loginRequiredUrl = loginRequiredItem?.LOGIN_REQUIRED;
        if (isMounted && loginRequiredUrl) setImageUrl(loginRequiredUrl);
      } catch {
        if (isMounted) setImageUrl(FALLBACK_LOGIN_REQUIRED_IMAGE);
      } finally {
        if (isMounted) setLoadingImage(false);
      }
    };
    fetchErrorImages();
    return () => { isMounted = false; };
  }, []);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.55)", backdropFilter: "blur(18px) saturate(180%)", WebkitBackdropFilter: "blur(18px) saturate(180%)", zIndex: 9999, padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "900px", borderRadius: "40px", border: "2px solid rgba(255,255,255,0.9)", backgroundColor: "#2F2F35", padding: "40px" }}>

        <div style={{ width: "100%", minHeight: "360px", borderRadius: "30px", backgroundColor: "#F6F6F2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "40px", overflow: "hidden" }}>
          {loadingImage ? (
            <>
              <style>{`@keyframes _spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
              <div style={{ width: "40px", height: "40px", border: "4px solid rgba(0,0,0,0.2)", borderTopColor: "#111", borderRadius: "50%", animation: "_spin 1s linear infinite" }} />
            </>
          ) : (
            <img src={imageUrl || `${API_BASE_URL_PROD}/showimg/login_required.png`} alt="Login required" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_LOGIN_REQUIRED_IMAGE; }} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "16px" }} />
          )}
        </div>

        <p style={{ color: "#fff", fontSize: "52px", fontWeight: 700, textAlign: "center", marginBottom: "40px" }}>
          {message || "Invalid User / Mobile Number"}
        </p>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={() => onRetry?.()} style={{ minWidth: "260px", height: "64px", borderRadius: "40px", backgroundColor: "#F2BC1B", color: "#000", fontSize: "36px", fontWeight: 700, border: "none", cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterNumber;

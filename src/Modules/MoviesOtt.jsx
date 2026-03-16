import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS, getDefaultHeaders } from "../server/config";
import { useEnhancedRemoteNavigation } from "../Remote/useMagicRemote";

const FALLBACK_OTT_IMAGE = "http://124.40.244.211/netmon/Cabletvapis/showimg/coming_soon_ott.png";

const MoviesOtt = () => {
  const navigate = useNavigate();
  const [ottImage, setOttImage] = useState(FALLBACK_OTT_IMAGE);
  const [loadingImage, setLoadingImage] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      try {
        const mobile = localStorage.getItem("userPhone") || "0000000000";
        const response = await axios.post(API_ENDPOINTS.ERROR_IMAGES, { userid: "lgiptv", mobile, device_type: "LG TV", mac_address: "", device_name: "LG TV", app_package: "com.lgiptv.bbnl" }, { headers: getDefaultHeaders() });
        const errImgs = response?.data?.errImgs || [];
        const item = errImgs.find((i) => Object.prototype.hasOwnProperty.call(i, "COMING_SOON_OTT"));
        const url = item?.COMING_SOON_OTT;
        if (isMounted && url) setOttImage(url);
      } catch { /* keep fallback */ }
      finally { if (isMounted) setLoadingImage(false); }
    };
    fetchImage();
    return () => { isMounted = false; };
  }, []);

  const { getItemProps } = useEnhancedRemoteNavigation([{ id: "home-button" }], {
    orientation: "vertical", useMagicRemotePointer: true, focusThreshold: 150, onSelect: () => navigate("/home"),
  });

  return (
    <div style={{ minHeight: "100vh", width: "100%", backgroundColor: "#808080", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "760px", backgroundColor: "#2f2f36", border: "1px solid rgba(255,255,255,0.55)", borderRadius: "28px", padding: "28px 32px", textAlign: "center" }}>
        {loadingImage ? (
          <div style={{ width: "100%", minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
            <div style={{ width: "48px", height: "48px", border: "4px solid rgba(244,191,31,0.3)", borderTopColor: "#f4bf1f", borderRadius: "50%", animation: "_spin 1s linear infinite" }} />
          </div>
        ) : (
          <img src={ottImage} alt="Coming Soon Movie OTT" onError={(e) => { e.currentTarget.src = FALLBACK_OTT_IMAGE; }} style={{ width: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "20px", marginBottom: "24px", backgroundColor: "#f0e9d6" }} />
        )}

        <p style={{ color: "#fff", fontSize: "3rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "12px" }}>Coming Soon Movie OTT</p>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.6rem", marginBottom: "28px", fontWeight: 600 }}>New OTT apps content dropping soon. Stay tuned!</p>


        <button
          {...getItemProps(0)}
          className="focusable-button"
          onClick={() => navigate("/home")}
          style={{ minWidth: "220px", height: "56px", borderRadius: "9999px", backgroundColor: "#f4bf1f", color: "#000", fontSize: "1.4rem", fontWeight: 700, border: "2px solid transparent", cursor: "pointer" }}
        >
          Go to home
        </button>
      </div>
      <style>{`@keyframes _spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default MoviesOtt;

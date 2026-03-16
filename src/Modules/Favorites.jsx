import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchComingSoonImage } from "../server/OAuthentication-Api/LogoApi";

const Favorites = () => {
  const navigate = useNavigate();
  const [comingSoonImage, setComingSoonImage] = useState("");
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadImage = async () => {
      try {
        const result = await fetchComingSoonImage("COMING_SOON_TV_CHANNELS");
        if (isMounted && result?.success && result?.imageUrl) setComingSoonImage(result.imageUrl);
      } catch (error) {
        console.error("[COMING_SOON_TV_CHANNELS] Load error:", error);
      } finally {
        if (isMounted) setImageLoading(false);
      }
    };
    loadImage();
    return () => { isMounted = false; };
  }, []);

  return (
    <div style={{ minHeight: "100vh", width: "100%", backgroundColor: "#808080", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "760px", backgroundColor: "#2f2f36", border: "1px solid rgba(255,255,255,0.55)", borderRadius: "28px", padding: "28px 32px", textAlign: "center" }}>
        {imageLoading ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
            <div style={{ width: "60px", height: "60px", border: "4px solid rgba(244,191,31,0.3)", borderTopColor: "#f4bf1f", borderRadius: "50%", animation: "_spin 1s linear infinite" }} />
          </div>
        ) : (
          <img
            src={comingSoonImage}
            alt="Coming Soon TV Channels"
            onError={(e) => { console.warn("[COMING_SOON_TV_CHANNELS] Image load failed"); e.currentTarget.style.display = "none"; }}
            style={{ width: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "20px", marginBottom: "24px", backgroundColor: "#f0e9d6" }}
          />
        )}

        <p style={{ color: "#fff", fontSize: "3rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "12px" }}>Coming Soon Liked Favorite Channels</p>

        <button
          onClick={() => navigate("/home")}
          style={{ minWidth: "220px", height: "56px", borderRadius: "9999px", backgroundColor: "#f4bf1f", color: "#000", fontSize: "1.4rem", fontWeight: 700, border: "none", cursor: "pointer" }}
        >
          Go to home
        </button>
      </div>
      <style>{`@keyframes _spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default Favorites;

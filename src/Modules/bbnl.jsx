import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const VIDEO_SRC = "/Asset/BBNL.mp4";

const BbnlVideo = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const goToLogin = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    videoElement.addEventListener("ended", goToLogin);
    videoElement.play().catch(() => { goToLogin(); });
    return () => { videoElement.removeEventListener("ended", goToLogin); };
  }, [goToLogin]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100vh", backgroundColor: "#000" }}>
      <video
        ref={videoRef}
        width="100%"
        height="100%"
        style={{ objectFit: "contain", backgroundColor: "#000" }}
        autoPlay
        muted
        onError={goToLogin}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default BbnlVideo;

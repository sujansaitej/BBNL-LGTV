import React, { useEffect, useRef, useState } from "react";
import shaka from "shaka-player";

const ShakaPlayer = ({ src, autoPlay = true, onError, onLoaded, textLanguage = "en" }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [initError, setInitError] = useState("");

  useEffect(() => {
    shaka.polyfill.installAll();

    const video = videoRef.current;
    if (!video) {
      setInitError("Video element not available");
      return;
    }

    if (!shaka.Player.isBrowserSupported()) {
      const msg = "Shaka Player not supported in this browser";
      setInitError(msg);
      if (onError) onError(new Error(msg));
      return;
    }

    const player = new shaka.Player(video);
    playerRef.current = player;

    const onPlayerErrorEvent = (event) => {
      const err = event.detail;
      setInitError(err?.message || "Playback error");
      if (onError) onError(err);
    };

    player.addEventListener("error", onPlayerErrorEvent);

    const load = async () => {
      try {
        if (!src) {
          throw new Error("No stream source provided");
        }
        // Optional: set preferred text language
        try {
          player.configure({ preferredTextLanguage: textLanguage });
        } catch (_) {
          // ignore configure errors
        }

        await player.load(src);
        if (onLoaded) onLoaded();
      } catch (error) {
        setInitError(error?.message || "Failed to load stream");
        if (onError) onError(error);
      }
    };

    load();

    return () => {
      player.removeEventListener("error", onPlayerErrorEvent);
      player.destroy().catch(() => {});
    };
  }, [src, onError, onLoaded, textLanguage]);

  return (
    <div style={{ width: "100%", height: "100%", background: "#000" }}>
      {initError && (
        <div style={{ color: "#ff9a9a", padding: "8px", fontSize: 12 }}>
          {initError}
        </div>
      )}
      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay}
        style={{ width: "100%", height: "100%", outline: "none" }}
      />
    </div>
  );
};

export default ShakaPlayer;

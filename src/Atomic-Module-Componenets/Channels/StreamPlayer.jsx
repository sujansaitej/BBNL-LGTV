import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const HLSPlayer = ({ src, autoPlay = true }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [playbackError, setPlaybackError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      setIsLoading(false);
      setShowLoader(false);
      return;
    }

    setPlaybackError("");
    setIsLoading(true);
    setShowLoader(false);

    const loaderTimer = setTimeout(() => {
      setShowLoader(true);
    }, 700);

    if (hlsRef.current) {
      hlsRef.current.stopLoad();
      hlsRef.current.detachMedia();
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Keep the last frame visible while the next stream initializes
    video.pause();

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 5,
        maxBufferLength: 8,
        maxMaxBufferLength: 16,
        maxBufferSize: 50 * 1000 * 1000,
        maxBufferHole: 0.3,
        liveSyncDurationCount: 1,
        liveMaxLatencyDurationCount: 2,
        abrEwmaDefaultEstimate: 8000000,
        startLevel: -1,
        capLevelToPlayerSize: false,
        autoStartLoad: true,
        initialLiveManifestSize: 2,
        manifestLoadingTimeOut: 8000,
        manifestLoadingMaxRetry: 2,
        manifestLoadingRetryDelay: 600,
        levelLoadingTimeOut: 8000,
        levelLoadingMaxRetry: 2,
        levelLoadingRetryDelay: 600,
        fragLoadingTimeOut: 12000,
        fragLoadingMaxRetry: 2,
        fragLoadingRetryDelay: 600,
        debug: false,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.startLoad();
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setShowLoader(false);
        setPlaybackError("");
        if (autoPlay) {
          video.muted = true;
          video.play().catch(() => {
            setPlaybackError("Autoplay blocked - Click to play");
          });
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setIsLoading(false);
        setShowLoader(false);
        if (autoPlay) {
          video.muted = true;
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data?.fatal) return;
        setIsLoading(false);
        setShowLoader(false);

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setPlaybackError("Network error - Cannot load stream");
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          setPlaybackError("Media error - Cannot decode stream");
          hls.recoverMediaError();
        } else {
          setPlaybackError("Cannot play this stream");
          hls.destroy();
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;

      const onLoadedMetadata = () => {
        setIsLoading(false);
        setShowLoader(false);
        if (autoPlay) {
          video.muted = true;
          video.play().catch(() => {});
        }
      };

      const onError = () => {
        setIsLoading(false);
        setShowLoader(false);
        setPlaybackError("Cannot play this stream");
      };

      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("error", onError);

      return () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("error", onError);
        clearTimeout(loaderTimer);
      };
    } else {
      setIsLoading(false);
      setShowLoader(false);
      setPlaybackError("HLS playback not supported on this device");
    }

    return () => {
      clearTimeout(loaderTimer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "fill",
          backgroundColor: "#000",
        }}
        playsInline
        muted={autoPlay}
        controls={false}
      />

      {showLoader && isLoading && !playbackError && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#fff",
            fontSize: "24px",
            fontWeight: "600",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              border: "4px solid rgba(255,255,255,0.3)",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          Loading Stream...
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {playbackError && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "24px 32px",
            background: "rgba(0,0,0,0.9)",
            color: "#ff9a9a",
            borderRadius: "16px",
            fontSize: "20px",
            fontWeight: "600",
            border: "2px solid rgba(255,0,0,0.6)",
            textAlign: "center",
            maxWidth: "80%",
            zIndex: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>!</div>
          <div style={{ marginBottom: "12px" }}>{playbackError}</div>
          <div
            style={{
              fontSize: "16px",
              marginTop: "12px",
              color: "#ffb347",
              fontWeight: "400",
            }}
          >
            Stream URL: {src ? `${src.substring(0, 50)}...` : ""}
          </div>
        </div>
      )}
    </div>
  );
};

export default HLSPlayer;

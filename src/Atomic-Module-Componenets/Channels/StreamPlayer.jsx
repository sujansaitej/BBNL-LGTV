import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const MEDIA_KEY_MAP = new Map([
  ["MediaPlay", "play"],
  ["MediaPause", "pause"],
  ["MediaPlayPause", "playPause"],
  ["Play", "play"],
  ["Pause", "pause"],
  ["Stop", "stop"],
  ["MediaStop", "stop"],
  ["FastForward", "fastForward"],
  ["MediaFastForward", "fastForward"],
  ["Rewind", "rewind"],
  ["MediaRewind", "rewind"],
]);

const MEDIA_KEYCODE_MAP = new Map([
  [415, "play"],
  [19, "pause"],
  [179, "playPause"],
  [413, "stop"],
  [417, "fastForward"],
  [412, "rewind"],
]);

const getMediaAction = (event) => {
  if (!event) return null;
  const fromKey = MEDIA_KEY_MAP.get(event.key);
  if (fromKey) return fromKey;
  if (typeof event.keyCode === "number") {
    return MEDIA_KEYCODE_MAP.get(event.keyCode) || null;
  }
  return null;
};

const MAX_NETWORK_RETRIES = 3;
const STALL_TIMEOUT = 10000; // 10 seconds
const BUFFER_CLEANUP_INTERVAL = 120000; // 2 minutes

const HLSPlayer = ({ src, autoPlay = true }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const networkRetryRef = useRef(0);
  const stallTimerRef = useRef(null);
  const bufferCleanupTimerRef = useRef(null);
  const lastPlaybackTimeRef = useRef(0);
  const [playbackError, setPlaybackError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const handleMediaKeys = (event) => {
      const action = getMediaAction(event);
      if (!action) return;
      const video = videoRef.current;
      if (!video) return;

      event.preventDefault();
      event.stopPropagation();

      if (action === "play") {
        video.play().catch(() => {});
        return;
      }

      if (action === "pause") {
        video.pause();
        return;
      }

      if (action === "playPause") {
        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
        return;
      }

      if (action === "stop") {
        video.pause();
        if (Number.isFinite(video.duration)) {
          video.currentTime = 0;
        }
        return;
      }

      if (action === "fastForward") {
        if (Number.isFinite(video.duration)) {
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
        }
        return;
      }

      if (action === "rewind") {
        if (Number.isFinite(video.duration)) {
          video.currentTime = Math.max(0, video.currentTime - 10);
        }
      }
    };

    window.addEventListener("keydown", handleMediaKeys, true);
    return () => window.removeEventListener("keydown", handleMediaKeys, true);
  }, []);

  // Monitor for playback stalls and recover
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const checkStall = () => {
      if (video.paused) {
        lastPlaybackTimeRef.current = video.currentTime;
        return;
      }

      const currentTime = video.currentTime;
      const timeDiff = currentTime - lastPlaybackTimeRef.current;

      // If video hasn't progressed in last check and not buffering
      if (timeDiff < 0.1 && video.readyState < 3) {
        console.warn("Playback stall detected, attempting recovery...");
        if (hlsRef.current) {
          hlsRef.current.startLoad();
        }
        // Try to nudge playback forward slightly
        if (Number.isFinite(video.duration) && currentTime < video.duration - 1) {
          video.currentTime = currentTime + 0.1;
        }
        video.play().catch(() => {});
      }

      lastPlaybackTimeRef.current = currentTime;
    };

    stallTimerRef.current = setInterval(checkStall, STALL_TIMEOUT);

    return () => {
      if (stallTimerRef.current) {
        clearInterval(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    };
  }, []);

  // Periodic buffer cleanup for long-running sessions
  useEffect(() => {
    const cleanupBuffer = () => {
      const video = videoRef.current;
      const hls = hlsRef.current;
      
      if (!video || !hls) return;

      try {
        // Clear old buffered data to prevent memory buildup
        const currentTime = video.currentTime;
        if (currentTime > 30) {
          // Keep only recent buffer
          const buffered = video.buffered;
          if (buffered.length > 0) {
            console.log("Cleaning old buffer data...");
            hls.trigger(Hls.Events.BUFFER_FLUSHING, {
              startOffset: 0,
              endOffset: currentTime - 10,
              type: 'video'
            });
          }
        }
      } catch (err) {
        console.warn("Buffer cleanup error:", err);
      }
    };

    bufferCleanupTimerRef.current = setInterval(cleanupBuffer, BUFFER_CLEANUP_INTERVAL);

    return () => {
      if (bufferCleanupTimerRef.current) {
        clearInterval(bufferCleanupTimerRef.current);
        bufferCleanupTimerRef.current = null;
      }
    };
  }, []);

  const normalizedSrc = typeof src === "string" ? src.trim() : "";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !normalizedSrc) {
      setIsLoading(false);
      setShowLoader(false);
      return;
    }

    setPlaybackError("");
    setIsLoading(true);
    setShowLoader(false);
    networkRetryRef.current = 0;

    const loaderTimer = setTimeout(() => {
      setShowLoader(true);
    }, 200);

    if (hlsRef.current) {
      hlsRef.current.stopLoad();
      hlsRef.current.detachMedia();
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Reset video element completely to prevent stale data
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load(); // Reset video element
      video.currentTime = 0;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 5,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        maxBufferSize: 30 * 1000 * 1000,
        maxBufferHole: 0.3,
        liveSyncDurationCount: 1,
        liveMaxLatencyDurationCount: 3,
        abrEwmaDefaultEstimate: 5000000,
        startLevel: 0,
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        initialLiveManifestSize: 1,
        manifestLoadingTimeOut: 5000,
        manifestLoadingMaxRetry: 2,
        manifestLoadingRetryDelay: 300,
        levelLoadingTimeOut: 5000,
        levelLoadingMaxRetry: 2,
        levelLoadingRetryDelay: 300,
        fragLoadingTimeOut: 8000,
        fragLoadingMaxRetry: 3,
        fragLoadingRetryDelay: 300,
        debug: false,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 2,
        maxFragLookUpTolerance: 0.2,
        liveDurationInfinity: true,
      });

      // Define video event handlers outside so they can be cleaned up
      const onWaiting = () => {
        console.log("Video waiting for data...");
        setShowLoader(true);
      };

      const onStalled = () => {
        console.warn("Video stalled, attempting recovery...");
        setShowLoader(true);
        if (hlsRef.current) {
          hlsRef.current.startLoad();
        }
      };

      const onPlaying = () => {
        setShowLoader(false);
        setIsLoading(false);
        setPlaybackError("");
        networkRetryRef.current = 0;
      };

      const onCanPlay = () => {
        setShowLoader(false);
        setIsLoading(false);
      };

      const onProgress = () => {
        // Clear loader if video is buffering successfully
        if (video.buffered.length > 0) {
          setShowLoader(false);
        }
      };

      hls.loadSource(normalizedSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.startLoad(-1);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setShowLoader(false);
        setPlaybackError("");
        networkRetryRef.current = 0;
        if (autoPlay) {
          video.muted = false;
          video.volume = 1;
          video.play().catch((err) => {
            console.warn("Autoplay blocked, will retry on buffer:", err);
            // Don't set error immediately, wait for buffer to retry
          });
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setIsLoading(false);
        setShowLoader(false);
        networkRetryRef.current = 0;
        if (autoPlay && video.paused) {
          video.muted = false;
          video.volume = 1;
          video.play()
            .then(() => {
              setPlaybackError("");
            })
            .catch((err) => {
              console.warn("Playback still blocked after buffer:", err);
              // Only show click-to-play after multiple failed attempts
              setTimeout(() => {
                if (video.paused && !playbackError) {
                  setPlaybackError("CLICK_TO_PLAY");
                }
              }, 1000);
            });
        }
      });

      // Add buffer stall detection
      hls.on(Hls.Events.BUFFER_APPENDING, () => {
        setShowLoader(false);
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        setShowLoader(false);
        setIsLoading(false);
      });

      // Handle level switching
      hls.on(Hls.Events.LEVEL_SWITCHED, () => {
        console.log("Quality level switched");
        networkRetryRef.current = 0;
      });

      // Attach video event listeners
      video.addEventListener('waiting', onWaiting);
      video.addEventListener('stalled', onStalled);
      video.addEventListener('playing', onPlaying);
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('progress', onProgress);

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data) return;

        console.log("HLS Error:", data.type, data.details, data.fatal);

        // For non-fatal errors, try to recover
        if (!data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            networkRetryRef.current += 1;
            console.log("Non-fatal network error, retrying...");
            setTimeout(() => {
              if (hlsRef.current) {
                hlsRef.current.startLoad();
              }
            }, 300);
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.log("Non-fatal media error, recovering...");
            hls.recoverMediaError();
          }
          return;
        }

        // Fatal errors - attempt recovery
        setIsLoading(false);
        setShowLoader(false);

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (networkRetryRef.current < MAX_NETWORK_RETRIES) {
            networkRetryRef.current += 1;
            setPlaybackError("Network issue - retrying...");
            setShowLoader(true);
            console.log(`Network error retry ${networkRetryRef.current}/${MAX_NETWORK_RETRIES}`);
            setTimeout(() => {
              if (hlsRef.current) {
                hlsRef.current.startLoad();
              }
            }, 500);
            return;
          }
          setPlaybackError("Network error - Cannot load stream");
          console.error("Max network retries reached");
          hls.stopLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          console.warn("Fatal media error, attempting recovery...");
          setPlaybackError("Media error - Recovering...");
          try {
            hls.recoverMediaError();
            setTimeout(() => {
              setPlaybackError("");
              if (video && autoPlay) {
                video.play().catch(() => {});
              }
            }, 1000);
          } catch (err) {
            console.error("Media error recovery failed:", err);
            setPlaybackError("Cannot decode stream");
          }
        } else {
          console.error("Fatal HLS error:", data.details);
          setPlaybackError("Cannot play this stream");
          try {
            hls.destroy();
          } catch (err) {
            console.error("Error destroying HLS:", err);
          }
        }
      });

      hlsRef.current = hls;

      // Cleanup for HLS branch
      return () => {
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('stalled', onStalled);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('progress', onProgress);
        clearTimeout(loaderTimer);
        if (hlsRef.current) {
          try {
            hlsRef.current.stopLoad();
            hlsRef.current.detachMedia();
            hlsRef.current.destroy();
          } catch (err) {
            console.warn("Error cleaning up HLS:", err);
          }
          hlsRef.current = null;
        }
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = normalizedSrc;

      const onLoadedMetadata = () => {
        setIsLoading(false);
        setShowLoader(false);
        if (autoPlay) {
          video.muted = false;
          video.volume = 1;
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

    // Generic cleanup - only runs if no early return above
    return () => {
      clearTimeout(loaderTimer);
      // Clear all monitoring timers
      if (stallTimerRef.current) {
        clearInterval(stallTimerRef.current);
      }
      if (bufferCleanupTimerRef.current) {
        clearInterval(bufferCleanupTimerRef.current);
      }
    };
  }, [normalizedSrc, autoPlay]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        position: "fixed",
        top: 0,
        left: 0,
        overflow: "hidden",
        margin: 0,
        padding: 0,
      }}
    >
      <video
        ref={videoRef}
        style={{
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          backgroundColor: "#000",
          position: "absolute",
          top: 0,
          left: 0,
          margin: 0,
          padding: 0,
        }}
        playsInline
        muted={false}
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

      {playbackError === "CLICK_TO_PLAY" && (
        <div
          onClick={() => {
            const video = videoRef.current;
            if (video) {
              video.muted = false;
              video.volume = 1;
              video.play()
                .then(() => {
                  setPlaybackError("");
                })
                .catch((err) => {
                  console.error("Manual play failed:", err);
                  setPlaybackError("Cannot play - check permissions");
                });
            }
          }}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "32px 48px",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            borderRadius: "16px",
            fontSize: "24px",
            fontWeight: "600",
            border: "2px solid rgba(255,255,255,0.3)",
            textAlign: "center",
            cursor: "pointer",
            zIndex: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(102, 126, 234, 0.9)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)";
            e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0,0,0,0.85)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
            e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
          }}
        >
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>▶</div>
          <div style={{ marginBottom: "8px" }}>Click to Start Playing</div>
          <div
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,0.7)",
              fontWeight: "400",
            }}
          >
            (Autoplay was blocked by browser)
          </div>
        </div>
      )}

      {playbackError && playbackError !== "CLICK_TO_PLAY" && (
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
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠</div>
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

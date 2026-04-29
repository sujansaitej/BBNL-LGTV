import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import StreamAdOverlay from "./StreamAdOverlay";

const MEDIA_KEY_MAP = new Map([
  ["MediaPlay", "play"], ["MediaPause", "pause"], ["MediaPlayPause", "playPause"],
  ["Play", "play"], ["Pause", "pause"],
  ["Stop", "stop"], ["MediaStop", "stop"],
  ["FastForward", "fastForward"], ["MediaFastForward", "fastForward"],
  ["Rewind", "rewind"], ["MediaRewind", "rewind"],
]);
const MEDIA_KEYCODE_MAP = new Map([
  [415, "play"], [19, "pause"], [179, "playPause"],
  [413, "stop"], [417, "fastForward"], [412, "rewind"],
]);
const getMediaAction = (event) => {
  if (!event) return null;
  const fromKey = MEDIA_KEY_MAP.get(event.key);
  if (fromKey) return fromKey;
  if (typeof event.keyCode === "number") return MEDIA_KEYCODE_MAP.get(event.keyCode) || null;
  return null;
};

// /stream refresh is attempted at every 4th recovery attempt as a
// background try-and-continue — never a terminal fallback. The retry
// loop continues regardless of refresh outcome so live TV never
// surfaces a permanent failure to the user.
const REFRESH_EVERY = 4;

const HLSPlayer = ({ src, autoPlay = true, onStreamFailed = null, streamAd = null, onReady = null }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  const onStreamFailedRef = useRef(onStreamFailed);
  useEffect(() => { onStreamFailedRef.current = onStreamFailed; }, [onStreamFailed]);
  const readyFiredRef = useRef(false);
  useEffect(() => { readyFiredRef.current = false; }, [src]);

  const [overrideSrc, setOverrideSrc] = useState("");
  const refreshInFlightRef = useRef(false);
  useEffect(() => {
    setOverrideSrc("");
    refreshInFlightRef.current = false;
  }, [src]);

  const [adHidden, setAdHidden] = useState(false);
  useEffect(() => { setAdHidden(false); }, [streamAd]);

  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);

  // ── Media keys (Play / Pause / FF / Rewind / Stop) ──────────────────────────
  useEffect(() => {
    const handleMediaKeys = (event) => {
      const action = getMediaAction(event);
      if (!action) return;
      const video = videoRef.current;
      if (!video) return;
      event.preventDefault();
      event.stopPropagation();
      if (action === "play") return void video.play().catch(() => {});
      if (action === "pause") return void video.pause();
      if (action === "playPause") {
        if (video.paused) video.play().catch(() => {});
        else video.pause();
        return;
      }
      if (action === "stop") {
        video.pause();
        if (Number.isFinite(video.duration)) video.currentTime = 0;
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

  const effectiveSrc = overrideSrc || src;
  const normalizedSrc = typeof effectiveSrc === "string" ? effectiveSrc.trim() : "";

  // ── Main HLS init ───────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !normalizedSrc) {
      setLoading(false);
      setShowLoader(false);
      return;
    }

    setLoading(true);
    setShowLoader(false);
    console.log("[HLSPlayer] Loading stream:", normalizedSrc);
    const loaderTimer = setTimeout(() => setShowLoader(true), 200);

    if (!Hls.isSupported()) {
      // Final fallback only when MSE isn't available at all (very rare on
      // Chromium-based webOS). Match Samsung's native-HLS path: just point
      // the <video> element at the URL and let the OS player run.
      video.src = normalizedSrc;
      if (autoPlay) video.play().catch(() => {});
      return () => clearTimeout(loaderTimer);
    }

    // hls.js with the BBNL CDN's expected auth header.
    //
    // IMPORTANT: livestream.bbnl.in's CORS preflight allow-lists
    // `X-App-Package` — and from observed behavior, sending it appears
    // to be REQUIRED for browser clients (Samsung native HLS works
    // without it because native players aren't subject to CORS at all
    // — they're not browser fetches). When we removed this header,
    // requests ran but the server didn't respond with the expected
    // playable content, so hls.js hung in "Loading..." indefinitely.
    //
    // Modest timeout + retry bumps (still well within hls.js sane
    // ranges) account for slow LG webOS cold-load on first manifest.
    const hls = new Hls({
      enableWorker: true,
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 4,
      levelLoadingTimeOut: 10000,
      levelLoadingMaxRetry: 4,
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 6,
      xhrSetup: (xhr) => {
        xhr.setRequestHeader("X-App-Package", "com.lgiptv.bbnl");
      },
    });
    hlsRef.current = hls;

    let recoveryAttempts = 0;
    let recoveryTimer = null;

    const fireReady = () => {
      if (readyFiredRef.current) return;
      readyFiredRef.current = true;
      try { onReadyRef.current?.(); } catch {}
    };

    const onWaiting = () => setShowLoader(true);
    const onStalled = () => setShowLoader(true);
    const onPlaying = () => {
      setShowLoader(false);
      setLoading(false);
      recoveryAttempts = 0;
      fireReady();
    };
    const onCanPlay = () => {
      setShowLoader(false);
      setLoading(false);
      fireReady();
    };
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);

    hls.loadSource(normalizedSrc);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, (_evt, data) => {
      console.log("[HLSPlayer] Manifest parsed:", {
        levels: data && data.levels ? data.levels.length : 0,
      });
      clearTimeout(loaderTimer);
      setLoading(false);
      setShowLoader(false);
      if (autoPlay) {
        video.muted = false;
        video.volume = 1;
        // Don't surface autoplay-block errors to the user — TVs always
        // count remote-key navigation as user interaction so play() will
        // succeed on the second tick.
        video.play().catch(() => {});
      }
    });

    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (!data) return;
      // Always log — non-fatal too — so DevTools shows what's happening.
      console.warn("[HLSPlayer] Error event:", {
        type: data.type,
        details: data.details,
        fatal: data.fatal,
        url: data.url,
        responseStatus: data.response && data.response.code,
        responseText: data.response && data.response.text,
        reason: data.reason,
      });
      if (!data.fatal) {
        // Non-fatal: hls.js handles internally. Do nothing.
        return;
      }

      if (recoveryTimer) {
        clearTimeout(recoveryTimer);
        recoveryTimer = null;
      }

      recoveryAttempts += 1;
      setShowLoader(true);

      // Backoff: 1s, 2s, 4s, 8s, capped at 8s afterwards.
      const exp = Math.min(recoveryAttempts - 1, 3);
      const delay = Math.min(8000, 1000 * Math.pow(2, exp));

      recoveryTimer = setTimeout(() => {
        recoveryTimer = null;
        if (!hlsRef.current) return; // unmounted

        // Every Nth attempt: try a /stream URL refresh in parallel. This
        // covers token expiry / CDN edge rotation. The retry loop keeps
        // running regardless of refresh outcome — refresh just opportunis-
        // tically swaps in a new URL when one is available.
        const shouldTryRefresh =
          recoveryAttempts % REFRESH_EVERY === 0 &&
          typeof onStreamFailedRef.current === "function" &&
          !refreshInFlightRef.current;

        if (shouldTryRefresh) {
          refreshInFlightRef.current = true;
          console.log(`Attempt ${recoveryAttempts} — trying /stream refresh`);
          Promise.resolve()
            .then(() => onStreamFailedRef.current())
            .then((freshUrl) => {
              refreshInFlightRef.current = false;
              if (
                freshUrl &&
                typeof freshUrl === "string" &&
                freshUrl.trim() &&
                freshUrl.trim() !== normalizedSrc
              ) {
                console.log("/stream returned new URL — swapping");
                recoveryAttempts = 0;
                setOverrideSrc(freshUrl.trim());
                return;
              }
              // No usable URL — keep retrying current one.
              try { hls.startLoad(); } catch (_) { /* ignore */ }
            })
            .catch(() => {
              refreshInFlightRef.current = false;
              try { hls.startLoad(); } catch (_) { /* ignore */ }
            });
          return;
        }

        // Plain recovery: startLoad for network/other, recoverMediaError
        // for media. Both keep retrying forever — live TV never surfaces
        // a terminal "cannot play" state.
        try {
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.startLoad();
          }
        } catch (_) { /* ignore */ }
      }, delay);
    });

    return () => {
      clearTimeout(loaderTimer);
      if (recoveryTimer) clearTimeout(recoveryTimer);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
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

      {showLoader && (
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
          {loading ? "Loading Stream..." : "Reconnecting..."}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {streamAd && !adHidden && (
        <StreamAdOverlay ad={streamAd} onDismiss={() => setAdHidden(true)} />
      )}
    </div>
  );
};

export default HLSPlayer;

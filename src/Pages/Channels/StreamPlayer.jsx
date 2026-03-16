import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const PACKAGE_ID  = "com.lgiptv.bbnl";
const APP_NAME    = "LG BBNL iptv";
const PLATFORM    = "LG-TV";
const APP_VERSION = "2.0.0";

// ── Media key maps ────────────────────────────────────────────────────────────
const MEDIA_KEY_MAP = new Map([
  ["MediaPlay","play"],["MediaPause","pause"],["MediaPlayPause","playPause"],
  ["Play","play"],["Pause","pause"],["Stop","stop"],["MediaStop","stop"],
  ["FastForward","fastForward"],["MediaFastForward","fastForward"],
  ["Rewind","rewind"],["MediaRewind","rewind"],
]);
const MEDIA_KEYCODE_MAP = new Map([
  [415,"play"],[19,"pause"],[179,"playPause"],
  [413,"stop"],[417,"fastForward"],[412,"rewind"],
]);
const getMediaAction = (e) => {
  if (!e) return null;
  const fromKey = MEDIA_KEY_MAP.get(e.key);
  if (fromKey) return fromKey;
  return typeof e.keyCode === "number" ? (MEDIA_KEYCODE_MAP.get(e.keyCode) || null) : null;
};

// ── HLS config — tuned for LG webOS slow MSE + IPTV live streams ─────────────
//
// Key choices:
//   startLevel: 0            — always lowest quality → fastest first frame decode
//   maxBufferLength: 2       — tiny buffer = less to fill before first frame
//   backBufferLength: 0      — don't keep past segments (saves LG's limited RAM)
//   startFragPrefetch: true  — begin fetching first segment during manifest parse
//   progressive: true        — push partial segments to MSE as they arrive
//   abrEwmaDefaultEstimate   — optimistic bandwidth so ABR picks quality faster
//   lowLatencyMode: true     — stay at live edge, minimal latency
//
const makeHls = (xhrSetup) => new Hls({
  enableWorker:              true,
  lowLatencyMode:            true,
  xhrSetup,
  backBufferLength:          0,
  maxBufferLength:           2,
  maxMaxBufferLength:        6,
  maxBufferSize:             8 * 1000 * 1000,
  maxBufferHole:             0.5,
  liveSyncDuration:          1,
  liveMaxLatencyDuration:    4,
  abrEwmaDefaultEstimate:    500000,
  startLevel:                0,
  capLevelToPlayerSize:      true,
  autoStartLoad:             true,
  startFragPrefetch:         true,
  progressive:               true,
  initialLiveManifestSize:   1,
  manifestLoadingTimeOut:    8000,
  manifestLoadingMaxRetry:   2,
  manifestLoadingRetryDelay: 500,
  levelLoadingTimeOut:       8000,
  levelLoadingMaxRetry:      2,
  levelLoadingRetryDelay:    500,
  fragLoadingTimeOut:        10000,
  fragLoadingMaxRetry:       3,
  fragLoadingRetryDelay:     500,
  debug:                     false,
  nudgeOffset:               0.2,
  nudgeMaxRetry:             5,
  liveDurationInfinity:      true,
});

// ── Hard-cleanup one slot ─────────────────────────────────────────────────────
const cleanSlot = (hlsRef, videoRef) => {
  const hls = hlsRef.current;
  const video = videoRef.current;
  if (hls) {
    try { hls.stopLoad(); hls.detachMedia(); hls.destroy(); } catch { /* ignore */ }
    hlsRef.current = null;
  }
  if (video) {
    video.muted = true;
    video.pause();
    video.removeAttribute("src");
    try { video.load(); } catch { /* ignore */ }
  }
};

// ── 2-Phase Dual Player HLS component ────────────────────────────────────────
//
// Two <video> elements sit stacked. Only one is visible at a time (opacity 1).
//
// On every src change:
//   Phase 1 — MANIFEST_PARSED (~300–600ms):
//     • Crossfade standby slot into view (user sees new channel instantly).
//     • Standby is still muted — no audio yet. Old slot is also muted.
//     • Spinner dismissed immediately.
//
//   Phase 2 — FRAG_BUFFERED / canplay / playing (~1–3s after Phase 1):
//     • Unmute standby + start play (audio begins).
//     • Destroy old slot 350ms later (after crossfade completes).
//
// Why 2 phases?
//   On LG webOS the MSE pipeline is slow. Waiting for FRAG_BUFFERED before any
//   visual change means 4–8s of black screen. Swapping on MANIFEST_PARSED gives
//   instant visual feedback while audio latency is hidden in the background.
//
const HLSPlayer = ({ src }) => {
  const videoARef = useRef(null);
  const videoBRef = useRef(null);
  const hlsARef   = useRef(null);
  const hlsBRef   = useRef(null);
  const activeRef = useRef("A");  // which slot is currently visible

  const [visibleSlot, setVisibleSlot]     = useState("A");
  const [isLoading, setIsLoading]         = useState(true);
  const [showLoader, setShowLoader]       = useState(false);
  const [playbackError, setPlaybackError] = useState("");

  // XHR setup — attaches app identity headers to every HLS request
  const xhrSetup = (xhr) => {
    const deviceId = localStorage.getItem("deviceId") ||
                     localStorage.getItem("deviceID") || "LGTV-001";
    xhr.setRequestHeader("X-App-Package", PACKAGE_ID);
    xhr.setRequestHeader("X-App-Name",    APP_NAME);
    xhr.setRequestHeader("X-Platform",    PLATFORM);
    xhr.setRequestHeader("X-App-Version", APP_VERSION);
    xhr.setRequestHeader("X-Device-Id",   deviceId);
  };

  // ── Channel switch effect ─────────────────────────────────────────────────
  useEffect(() => {
    const url = typeof src === "string" ? src.trim() : "";
    if (!url) return;

    setIsLoading(true);
    setPlaybackError("");

    // Show spinner only after 500ms — very fast switches (Phase 1 < 500ms) won't show it
    const loaderTimer = setTimeout(() => setShowLoader(true), 500);

    const currentActive = activeRef.current;
    const standby       = currentActive === "A" ? "B" : "A";
    const standbyVideo  = standby === "A" ? videoARef.current : videoBRef.current;
    const standbyHls    = standby === "A" ? hlsARef : hlsBRef;
    const activeHls     = currentActive === "A" ? hlsARef : hlsBRef;
    const activeVideo   = currentActive === "A" ? videoARef.current : videoBRef.current;

    // Wipe whatever was in the standby slot
    cleanSlot(standbyHls, { current: standbyVideo });

    let phase1Done = false;
    let phase2Done = false;
    let stallTimer = null;
    let networkRetries = 0;

    // ── Phase 1: visual swap on MANIFEST_PARSED ───────────────────────────
    // User sees new channel on screen instantly. Audio not yet started.
    const doPhase1 = () => {
      if (phase1Done) return;
      phase1Done = true;
      clearTimeout(loaderTimer);

      // Mute both slots during the visual transition
      if (standbyVideo) standbyVideo.muted = true;
      if (activeVideo)  activeVideo.muted  = true;

      // Flip to standby slot (crossfade)
      activeRef.current = standby;
      setVisibleSlot(standby);
      setIsLoading(false);
      setShowLoader(false);
      setPlaybackError("");
    };

    // ── Phase 2: audio starts on first buffered segment ───────────────────
    // Called when standby has enough data to actually play audio cleanly.
    const doPhase2 = () => {
      if (phase2Done) return;
      phase2Done = true;
      clearInterval(stallTimer);

      if (standbyVideo) {
        standbyVideo.muted  = false;
        standbyVideo.volume = 1;
        standbyVideo.play().catch(() => {});
      }

      // Destroy old active slot after crossfade finishes
      setTimeout(() => {
        if (activeVideo) activeVideo.muted = true;
        cleanSlot(activeHls, { current: activeVideo });
      }, 350);
    };

    // ── Stall recovery (runs every 5s after Phase 1) ──────────────────────
    // If video is visible but paused/stalled, escalate through 3 recovery tiers.
    let stallLevel = 0;
    const startStallWatcher = (hls) => {
      stallTimer = setInterval(() => {
        const video = standbyVideo;
        if (!video || video.paused || video.ended) return;
        if (video.readyState >= 3) { stallLevel = 0; return; } // playing fine

        stallLevel++;
        if (stallLevel === 1) {
          // Tier 1: nudge currentTime
          try { video.currentTime += 0.1; } catch { /* ignore */ }
        } else if (stallLevel === 2) {
          // Tier 2: jump to live edge
          try {
            if (hls && hls.liveSyncPosition) video.currentTime = hls.liveSyncPosition;
            else if (video.seekable.length > 0) video.currentTime = video.seekable.end(0) - 1;
          } catch { /* ignore */ }
        } else {
          // Tier 3: full HLS reset
          stallLevel = 0;
          try { hls.stopLoad(); hls.startLoad(-1); } catch { /* ignore */ }
        }
      }, 5000);
    };

    if (Hls.isSupported()) {
      const hls = makeHls(xhrSetup);
      standbyHls.current = hls;

      if (standbyVideo) standbyVideo.muted = true;
      hls.loadSource(url);
      hls.attachMedia(standbyVideo);

      // Phase 1 trigger — manifest downloaded, stream info known
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        doPhase1();
        startStallWatcher(hls);
      });

      // Phase 2 trigger — first segment buffered, audio can start
      hls.on(Hls.Events.FRAG_BUFFERED, doPhase2);

      // Phase 2 fallback — buffer appended to MSE
      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        if (standbyVideo && standbyVideo.buffered.length > 0) doPhase2();
      });

      // Phase 2 fallback — native video events
      if (standbyVideo) {
        standbyVideo.addEventListener("canplay",  doPhase2, { once: true });
        standbyVideo.addEventListener("playing",  doPhase2, { once: true });
      }

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data) return;

        if (!data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            networkRetries++;
            setTimeout(() => {
              if (standbyHls.current === hls) hls.startLoad();
            }, 500);
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            try { hls.recoverMediaError(); } catch { /* ignore */ }
          }
          return;
        }

        // Fatal error
        clearTimeout(loaderTimer);
        clearInterval(stallTimer);
        phase1Done = true; // prevent further phase1 calls
        phase2Done = true;
        setIsLoading(false);
        setShowLoader(false);

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 3) {
          networkRetries++;
          setPlaybackError("Network issue — retrying...");
          setTimeout(() => {
            if (standbyHls.current === hls) {
              phase1Done = false;
              phase2Done = false;
              setPlaybackError("");
              hls.startLoad();
            }
          }, 1000);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          setPlaybackError("Media error — recovering...");
          try {
            hls.recoverMediaError();
            setTimeout(() => setPlaybackError(""), 1500);
          } catch { setPlaybackError("Cannot decode stream"); }
        } else {
          setPlaybackError("Cannot play this stream");
        }
      });

    } else if (standbyVideo?.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS fallback (Safari / older WebKit)
      standbyVideo.src = url;
      standbyVideo.muted = true;
      standbyVideo.addEventListener("loadedmetadata", doPhase1, { once: true });
      standbyVideo.addEventListener("canplay",        doPhase2, { once: true });
      standbyVideo.addEventListener("error", () => {
        clearTimeout(loaderTimer);
        phase1Done = true;
        phase2Done = true;
        setIsLoading(false);
        setShowLoader(false);
        setPlaybackError("Cannot load stream");
      }, { once: true });
    } else {
      clearTimeout(loaderTimer);
      setIsLoading(false);
      setShowLoader(false);
      setPlaybackError("HLS not supported on this device");
    }

    return () => {
      clearTimeout(loaderTimer);
      clearInterval(stallTimer);
      phase1Done = true;
      phase2Done = true;
    };
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanSlot(hlsARef, videoARef);
      cleanSlot(hlsBRef, videoBRef);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Remote media keys — always target the active slot ────────────────────
  useEffect(() => {
    const handleMediaKeys = (event) => {
      const action = getMediaAction(event);
      if (!action) return;
      const video = activeRef.current === "A" ? videoARef.current : videoBRef.current;
      if (!video) return;
      event.preventDefault();
      event.stopPropagation();
      if (action === "play")           { video.play().catch(() => {}); }
      else if (action === "pause")     { video.pause(); }
      else if (action === "playPause") { video.paused ? video.play().catch(() => {}) : video.pause(); }
      else if (action === "stop")      { video.pause(); if (Number.isFinite(video.duration)) video.currentTime = 0; }
      else if (action === "fastForward") { if (Number.isFinite(video.duration)) video.currentTime = Math.min(video.duration, video.currentTime + 10); }
      else if (action === "rewind")    { if (Number.isFinite(video.duration)) video.currentTime = Math.max(0, video.currentTime - 10); }
    };
    window.addEventListener("keydown", handleMediaKeys, true);
    return () => window.removeEventListener("keydown", handleMediaKeys, true);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const videoStyle = (slot) => ({
    width: "100vw", height: "100vh",
    objectFit: "cover", backgroundColor: "#000",
    position: "absolute", top: 0, left: 0,
    margin: 0, padding: 0,
    transition: "opacity 0.2s ease",
    opacity: visibleSlot === slot ? 1 : 0,
    zIndex:  visibleSlot === slot ? 2 : 1,
  });

  return (
    <div style={{ width:"100vw", height:"100vh", background:"#000", position:"fixed", top:0, left:0, overflow:"hidden" }}>

      {/* ── Player A ── */}
      <video ref={videoARef} style={videoStyle("A")} playsInline controls={false} />

      {/* ── Player B ── */}
      <video ref={videoBRef} style={videoStyle("B")} playsInline controls={false} />

      {/* ── Loading spinner (only shown if manifest hasn't arrived in 500ms) ── */}
      {showLoader && isLoading && !playbackError && (
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", color:"#fff", fontSize:"24px", fontWeight:"600", textAlign:"center", zIndex:10 }}>
          <div style={{ width:"60px", height:"60px", border:"4px solid rgba(255,255,255,0.3)", borderTop:"4px solid #667eea", borderRadius:"50%", animation:"_sp 1s linear infinite", margin:"0 auto 16px" }} />
          Loading Stream...
          <style>{`@keyframes _sp{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  );
};

export default HLSPlayer;

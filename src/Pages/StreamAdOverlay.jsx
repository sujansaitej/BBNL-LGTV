import React, { useEffect, useRef, useState } from "react";

// ── Position map (BBNL /streamAds spec row 21) ───────────────────────────────
// Known: LEFTTOP, RIGHTTOP, LEFTBOT, RIGHTBOT (and possibly center variants).
// Be liberal — unknown values fall back to RIGHTTOP.
const POSITION_STYLES = {
  LEFTTOP:  { top: 16, left: 16 },
  RIGHTTOP: { top: 16, right: 16 },
  LEFTBOT:  { bottom: 16, left: 16 },
  RIGHTBOT: { bottom: 16, right: 16 },
};

const resolvePosition = (position) => {
  const key = typeof position === "string" ? position.trim().toUpperCase() : "";
  return POSITION_STYLES[key] || POSITION_STYLES.RIGHTTOP;
};

const isVideoType = (type) => {
  if (typeof type !== "string") return false;
  const t = type.trim().toUpperCase();
  return t === "VID" || t === "VIDEO";
};

/**
 * StreamAdOverlay — render-only ad overlay positioned over the video.
 *
 * Props:
 *  - ad: { position, duration, type, path, path2 }
 *  - onDismiss: () => void  (called when duration elapses or media fails fully)
 *
 * NOTE: pointerEvents is forced off so remote-key input flows straight through
 * to the underlying player. No focus refs, no key handlers.
 */
const StreamAdOverlay = ({ ad, onDismiss }) => {
  const timerRef = useRef(null);
  // Track which URL the media element currently uses. Starts at `path`,
  // swaps to `path2` once on error if available.
  const [activeSrc, setActiveSrc] = useState(ad?.path || "");
  const [usedFallback, setUsedFallback] = useState(false);

  // Reset src state when the ad object reference changes
  useEffect(() => {
    setActiveSrc(ad?.path || "");
    setUsedFallback(false);
  }, [ad]);

  // Auto-dismiss timer — duration is seconds (string per spec). Default 10s.
  useEffect(() => {
    if (!ad) return undefined;
    const parsed = parseInt(ad.duration, 10);
    const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;

    timerRef.current = setTimeout(() => {
      if (typeof onDismiss === "function") onDismiss();
    }, seconds * 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [ad, onDismiss]);

  if (!ad || !activeSrc) return null;

  const positionStyle = resolvePosition(ad.position);
  const containerStyle = {
    position: "absolute",
    zIndex: 50,
    maxWidth: 320,
    maxHeight: 180,
    borderRadius: 8,
    overflow: "hidden",
    pointerEvents: "none", // remote input must pass through to player
    background: "transparent",
    ...positionStyle,
  };

  const mediaStyle = {
    width: "100%",
    height: "100%",
    maxWidth: 320,
    maxHeight: 180,
    objectFit: "cover",
    display: "block",
    pointerEvents: "none",
  };

  // Try `path2` once on error; if that also fails, dismiss the overlay.
  const handleMediaError = () => {
    if (!usedFallback && ad.path2 && ad.path2 !== activeSrc) {
      setUsedFallback(true);
      setActiveSrc(ad.path2);
      return;
    }
    if (typeof onDismiss === "function") onDismiss();
  };

  return (
    <div style={containerStyle} aria-hidden="true">
      {isVideoType(ad.type) ? (
        <video
          src={activeSrc}
          autoPlay
          muted
          playsInline
          loop={false}
          onError={handleMediaError}
          onEnded={() => {
            if (typeof onDismiss === "function") onDismiss();
          }}
          style={mediaStyle}
        />
      ) : (
        <img
          src={activeSrc}
          alt=""
          onError={handleMediaError}
          style={mediaStyle}
        />
      )}
    </div>
  );
};

export default StreamAdOverlay;

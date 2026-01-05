import React, { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

const VideoJSPlayer = ({ src, autoPlay = true }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const player = videojs(videoRef.current, {
        autoplay: autoPlay,
        controls: false,
        fluid: false,
        fill: true,
        responsive: false,
        preload: "auto",
        html5: {
          vhs: {
            overrideNative: true,
          },
          nativeVideoTracks: false,
          nativeAudioTracks: false,
          nativeTextTracks: false,
        },
      });

      playerRef.current = player;
    }
  }, [autoPlay]);

  useEffect(() => {
    const player = playerRef.current;

    if (player && src) {
      player.src({
        src: src,
        type: src.includes(".m3u8") ? "application/x-mpegURL" : "application/dash+xml",
      });
    }
  }, [src]);

  useEffect(() => {
    return () => {
      const player = playerRef.current;
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

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
      <div data-vjs-player style={{ width: "100%", height: "100%" }}>
        <video
          ref={videoRef}
          className="video-js"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "fill",
          }}
        />
      </div>
    </div>
  );
};

export default VideoJSPlayer;

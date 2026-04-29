import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useLiveChannelsStore from "../store/LiveChannelsStore";

const AUTO_PLAY_SESSION_KEY = "home_999_autoplay_handled";
const SAFETY_MS = 5000;
const INFO_CHANNEL_NUMBER = "999";

const findInfoChannel = (channels) =>
  (channels || []).find((ch) => {
    const n = String(ch.channelno || ch.channelid || ch.channel_no || "").trim();
    return n === INFO_CHANNEL_NUMBER;
  });

const getStreamUrl = (ch) =>
  ch?.streamlink || ch?.stream_link || ch?.streamurl || ch?.stream_url ||
  ch?.url || ch?.link || ch?.videourl || ch?.video_url ||
  ch?.hlsurl || ch?.hls_url || ch?.manifest || ch?.manifesturl || "";

// Boot decision component. Renders nothing — the index.html splash covers the
// screen until we navigate to the destination route, which then owns the
// splash hand-off (LivePlayer hides on first video frame; Home hides on mount).
//
// Reads the channel store via getState() (non-reactive) so this effect runs
// exactly once on mount and is never cancelled by mid-fetch store updates.
const Bootstrap = () => {
  const navigate = useNavigate();
  const decidedRef = useRef(false);

  useEffect(() => {
    if (decidedRef.current) return;
    decidedRef.current = true;

    const userid = localStorage.getItem("userId") || "";
    const mobile = localStorage.getItem("userPhone") || "";
    const cacheKey = `${userid}|${mobile}|`;
    const alreadyHandled = sessionStorage.getItem(AUTO_PLAY_SESSION_KEY) === "1";

    const { fetchChannels, channelsCache } = useLiveChannelsStore.getState();

    const goHome = () => {
      navigate("/home", { replace: true });
    };

    const goPlayer = (channel) => {
      const url = getStreamUrl(channel);
      if (!url) { goHome(); return; }
      sessionStorage.setItem(AUTO_PLAY_SESSION_KEY, "1");
      navigate("/player", {
        replace: true,
        state: { streamlink: url, title: channel.chtitle, channelData: channel },
      });
    };

    if (alreadyHandled) { goHome(); return; }

    const cached = channelsCache?.[cacheKey]?.data;
    if (Array.isArray(cached) && cached.length) {
      const ch999 = findInfoChannel(cached);
      if (ch999) { goPlayer(ch999); return; }
      goHome();
      return;
    }

    let cancelled = false;
    const safety = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      goHome();
    }, SAFETY_MS);

    fetchChannels({ userid, mobile }, { key: cacheKey })
      .then((channels) => {
        if (cancelled) return;
        cancelled = true;
        clearTimeout(safety);
        const ch999 = findInfoChannel(channels);
        if (ch999) { goPlayer(ch999); return; }
        goHome();
      })
      .catch(() => {
        if (cancelled) return;
        cancelled = true;
        clearTimeout(safety);
        goHome();
      });

    return () => { cancelled = true; clearTimeout(safety); };
  }, [navigate]);

  return null;
};

export default Bootstrap;

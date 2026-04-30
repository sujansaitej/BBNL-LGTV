import { useEffect, useRef } from "react";
import { prefetchHomeData } from "./prefetchHome";

// Soft dedupe window: if both webOSRelaunch and visibilitychange fire on the
// same return-to-foreground (common), drop the second.
const THROTTLE_MS = 10_000;

// Stale-while-revalidate trigger for home data. Fires a forced prefetch on:
//   1. cold launch (when the hook first runs with enabled=true), and
//   2. app return from background — webOSRelaunch (webOS Home / Recents) with
//      visibilitychange as fallback for older firmware and dev mode.
// Cached data stays on screen during the background refetch; the store mutates
// data in place on success and subscribed components re-render automatically.
export const useDataRevalidation = ({ enabled, getPayload }) => {
  const lastRunRef = useRef(0);
  const getPayloadRef = useRef(getPayload);

  // Keep the ref pointed at the latest closure so revalidate() always reads
  // current deviceInfo (IP may resolve after initial mount).
  useEffect(() => {
    getPayloadRef.current = getPayload;
  });

  useEffect(() => {
    if (!enabled) return;

    const revalidate = (reason) => {
      const now = Date.now();
      if (now - lastRunRef.current < THROTTLE_MS) return;
      const payload = getPayloadRef.current?.();
      if (!payload?.mobile) return;
      lastRunRef.current = now;
      console.log(`[revalidate] ${reason}`);
      try {
        prefetchHomeData({ ...payload, force: true });
      } catch (err) {
        console.warn(`[revalidate] ${reason} failed`, err);
      }
    };

    revalidate("cold-launch");

    const onRelaunch = () => revalidate("webOSRelaunch");
    const onVisible = () => {
      if (document.visibilityState === "visible") revalidate("visibilitychange");
    };

    document.addEventListener("webOSRelaunch", onRelaunch);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("webOSRelaunch", onRelaunch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
};

export default useDataRevalidation;

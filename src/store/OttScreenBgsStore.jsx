import { create } from "zustand";

import { fetchScreenBackground } from "../server/modules-api/OttScreenBgsApi";

// 2-hour TTL keyed by displayarea (login, channellist, movies, profile, payment).
const SCREEN_BG_TTL_MS = 2 * 60 * 60 * 1000;

const useOttScreenBgsStore = create((set, get) => ({
  bgCache: {},
  error: "",

  /**
   * Fetch the background image URL for the given displayarea.
   * If a cached entry exists and is still within the TTL, returns it
   * without making a network call.
   */
  fetchBg: async (displayarea) => {
    if (!displayarea) {
      return "";
    }

    const entry = get().bgCache[displayarea];
    const isFresh =
      entry?.loadedAt &&
      Date.now() - entry.loadedAt < SCREEN_BG_TTL_MS &&
      !!entry.bgpath;

    if (isFresh) {
      return entry.bgpath;
    }

    const result = await fetchScreenBackground({ displayarea });

    if (result?.success && result?.bgpath) {
      set((prev) => ({
        bgCache: {
          ...prev.bgCache,
          [displayarea]: {
            bgpath: result.bgpath,
            loadedAt: Date.now(),
          },
        },
        error: "",
      }));
      return result.bgpath;
    }

    set({ error: result?.message || "Failed to load screen background" });
    return entry?.bgpath || "";
  },

  /**
   * Synchronous selector: returns cached bgpath for a displayarea, or null.
   */
  getBg: (displayarea) => {
    if (!displayarea) {
      return null;
    }
    const entry = get().bgCache[displayarea];
    return entry?.bgpath || null;
  },
}));

export default useOttScreenBgsStore;

import { create } from "zustand";
import { fetchExpiringChannels } from "../server/modules-api/ExpiringChannelsApi";

// 30-minute TTL — these expire fast, so we deliberately keep the cache short.
const EXPIRING_TTL_MS = 30 * 60 * 1000;

const buildKey = ({ userid, mobile } = {}) => {
  const uid = String(userid || "").trim();
  const mob = String(mobile || "").trim();
  return `${uid}|${mob}`;
};

const useExpiringChannelsStore = create((set, get) => ({
  // { [`${userid}|${mobile}`]: { channels, loadedAt, isLoading, error } }
  cache: {},
  error: "",

  /**
   * Fetch expiring channels for the given user/mobile pair.
   * - Caches with a 30-minute TTL keyed by `${userid}|${mobile}`.
   * - If cached & fresh and not `force`, returns the cached result.
   * - Never throws; errors are surfaced via the returned `success` flag.
   */
  fetchExpiring: async ({ userid, mobile } = {}, { force = false } = {}) => {
    const uid = String(userid || "").trim();
    const mob = String(mobile || "").trim();

    if (!uid || !mob) {
      return {
        success: false,
        message: "userid and mobile required",
        channels: [],
      };
    }

    const key = buildKey({ userid: uid, mobile: mob });
    const entry = get().cache[key];
    const isFresh =
      entry?.loadedAt &&
      Date.now() - entry.loadedAt < EXPIRING_TTL_MS &&
      Array.isArray(entry?.channels);

    if (!force && (isFresh || entry?.isLoading)) {
      return {
        success: Array.isArray(entry?.channels),
        message: entry?.error || "cached",
        channels: entry?.channels || [],
      };
    }

    set((prev) => ({
      cache: {
        ...prev.cache,
        [key]: {
          ...(prev.cache[key] || {}),
          isLoading: true,
          error: "",
        },
      },
      error: "",
    }));

    const result = await fetchExpiringChannels({ userid: uid, mobile: mob });

    if (result.success) {
      set((prev) => ({
        cache: {
          ...prev.cache,
          [key]: {
            channels: Array.isArray(result.channels) ? result.channels : [],
            loadedAt: Date.now(),
            isLoading: false,
            error: "",
          },
        },
      }));
    } else {
      const message = result.message || "Failed to load expiring channels";
      set((prev) => ({
        cache: {
          ...prev.cache,
          [key]: {
            ...(prev.cache[key] || {}),
            channels: prev.cache[key]?.channels || [],
            isLoading: false,
            error: message,
          },
        },
        error: message,
      }));
    }

    return result;
  },

  /**
   * Selector: returns the cached channels array for the given user/mobile,
   * or [] if nothing is cached yet.
   */
  getExpiring: ({ userid, mobile } = {}) => {
    const key = buildKey({ userid, mobile });
    return get().cache[key]?.channels || [];
  },
}));

export default useExpiringChannelsStore;

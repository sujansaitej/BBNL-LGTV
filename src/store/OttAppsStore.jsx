import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import fetchOttApps from "../server/modules-api/OttAppsApi";
import { nowMs } from "./HomeStore";

const APPS_TTL_MS = 30 * 60 * 1000;

const buildAppsKey = (payload) => {
  const user = payload?.userid || "";
  const mobile = payload?.mobile || "";
  return `${user}|${mobile}`;
};

const useOttAppsStore = create(persist((set, get) => ({
  appsCache: {},
  error: "",

  // Synchronous selector mirroring how LiveChannelsStore exposes cache reads.
  getApps: ({ userid, mobile } = {}) => {
    const key = `${userid || ""}|${mobile || ""}`;
    return get().appsCache[key]?.data || [];
  },

  fetchApps: async (payload, options = {}) => {
    const { force = false } = options;
    const key = options.key || buildAppsKey(payload);
    const entry = get().appsCache[key];
    const isFresh =
      entry?.loadedAt &&
      Date.now() - entry.loadedAt < APPS_TTL_MS &&
      (entry.data?.length || 0) > 0;

    if (!force && (isFresh || entry?.isLoading)) {
      return entry?.data || [];
    }

    set((prev) => ({
      appsCache: {
        ...prev.appsCache,
        [key]: {
          ...(prev.appsCache[key] || {}),
          isLoading: true,
          error: "",
        },
      },
      error: "",
    }));

    const startedAt = nowMs();

    try {
      // OttAppsApi returns the apps array directly (not wrapped in body).
      const apps = await fetchOttApps(payload, options.headers);
      const list = Array.isArray(apps) ? apps : [];

      set((prev) => ({
        appsCache: {
          ...prev.appsCache,
          [key]: {
            data: list,
            loadedAt: Date.now(),
            isLoading: false,
            error: "",
            fetchMs: Math.round(nowMs() - startedAt),
          },
        },
      }));

      return list;
    } catch (err) {
      const message = "Failed to load apps";
      set((prev) => ({
        appsCache: {
          ...prev.appsCache,
          [key]: {
            ...(prev.appsCache[key] || {}),
            isLoading: false,
            error: message,
          },
        },
        error: message,
      }));
      return [];
    }
  },
}), {
  name: "bbnl_ott_apps_cache_v1",
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    appsCache: Object.fromEntries(
      Object.entries(state.appsCache).map(([key, entry]) => [key, {
        data: entry?.data || [],
        loadedAt: entry?.loadedAt || 0,
        fetchMs: entry?.fetchMs || 0,
      }])
    ),
  }),
}));

export default useOttAppsStore;

import { create } from "zustand";

import { API_ENDPOINTS } from "../Api/config";
import { nowMs, postJson } from "./HomeStore";

const APP_VERSION_TTL_MS = 2 * 60 * 60 * 1000;

const buildVersionKey = (payload) => {
  const user = payload?.userid || "";
  const mobile = payload?.mobile || "";
  const appPackage = payload?.app_package || "";
  return `${user}|${mobile}|${appPackage}`;
};

const useAppVersionStore = create((set, get) => ({
  versionCache: {},
  error: "",
  fetchAppVersion: async (payload, options = {}) => {
    const { force = false } = options;
    const key = options.key || buildVersionKey(payload);
    const entry = get().versionCache[key];
    const isFresh =
      entry?.loadedAt &&
      Date.now() - entry.loadedAt < APP_VERSION_TTL_MS &&
      entry?.data;

    if (!force && (isFresh || entry?.isLoading)) {
      return entry?.data || null;
    }

    set((prev) => ({
      versionCache: {
        ...prev.versionCache,
        [key]: {
          ...(prev.versionCache[key] || {}),
          isLoading: true,
          error: "",
        },
      },
      error: "",
    }));

    const startedAt = nowMs();

    try {
      const data = await postJson(API_ENDPOINTS.APP_VERSION, payload);
      if (data?.status?.err_code !== 0) {
        throw new Error(data?.status?.err_msg || "Failed to fetch app version");
      }

      const body = data?.body || {};
      set((prev) => ({
        versionCache: {
          ...prev.versionCache,
          [key]: {
            data: body,
            loadedAt: Date.now(),
            isLoading: false,
            error: "",
            fetchMs: Math.round(nowMs() - startedAt),
          },
        },
      }));

      return body;
    } catch (err) {
      const message = err?.message || "Failed to fetch app version";
      set((prev) => ({
        versionCache: {
          ...prev.versionCache,
          [key]: {
            ...(prev.versionCache[key] || {}),
            isLoading: false,
            error: message,
          },
        },
        error: message,
      }));
      return null;
    }
  },
}));

export default useAppVersionStore;

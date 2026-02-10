import { create } from "zustand";

import { API_ENDPOINTS } from "../Api/config";
import { nowMs, postJson } from "./HomeStore";

const LANG_TTL_MS = 2 * 60 * 60 * 1000;

const buildLangKey = (payload) => {
  const user = payload?.userid || "";
  const mobile = payload?.mobile || "";
  return `${user}|${mobile}`;
};

const useLanguageStore = create((set, get) => ({
  languagesCache: {},
  error: "",
  fetchLanguages: async (payload, options = {}) => {
    const { force = false } = options;
    const key = options.key || buildLangKey(payload);
    const entry = get().languagesCache[key];
    const isFresh =
      entry?.loadedAt &&
      Date.now() - entry.loadedAt < LANG_TTL_MS &&
      (entry.data?.length || 0) > 0;

    if (!force && (isFresh || entry?.isLoading)) {
      return entry?.data || [];
    }

    set((prev) => ({
      languagesCache: {
        ...prev.languagesCache,
        [key]: {
          ...(prev.languagesCache[key] || {}),
          isLoading: true,
          error: "",
        },
      },
      error: "",
    }));

    const startedAt = nowMs();

    try {
      const data = await postJson(API_ENDPOINTS.CHANNEL_LANGUAGELIST, payload);
      const languagesData = data?.body?.[0]?.languages || [];
      const languages = Array.isArray(languagesData) ? languagesData : [];

      set((prev) => ({
        languagesCache: {
          ...prev.languagesCache,
          [key]: {
            data: languages,
            loadedAt: Date.now(),
            isLoading: false,
            error: "",
            fetchMs: Math.round(nowMs() - startedAt),
          },
        },
      }));

      return languages;
    } catch (err) {
      const message = "Failed to load languages";
      set((prev) => ({
        languagesCache: {
          ...prev.languagesCache,
          [key]: {
            ...(prev.languagesCache[key] || {}),
            isLoading: false,
            error: message,
          },
        },
        error: message,
      }));
      return [];
    }
  },
}));

export default useLanguageStore;

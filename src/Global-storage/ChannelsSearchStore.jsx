import { create } from "zustand";

import { API_ENDPOINTS } from "../Api/config";
import { nowMs, postForm, postJson } from "./HomeStore";

const ADS_TTL_MS = 10 * 60 * 1000;

const buildAdsKey = (payload) => {
  const user = payload?.userid || "";
  const mobile = payload?.mobile || "";
  const area = payload?.displayarea || "homepage";
  const type = payload?.displaytype || "";
  const client = payload?.adclient || "fofi";
  const src = payload?.srctype || "image";
  return `${user}|${mobile}|${area}|${type}|${client}|${src}`;
};

const useHomeAdsStore = create((set, get) => ({
  adsCache: {},
  error: "",
  fetchAds: async (payload, options = {}) => {
    const { preferForm = false, force = false } = options;
    const key = options.key || buildAdsKey(payload);
    const entry = get().adsCache[key];
    const isFresh =
      entry?.loadedAt &&
      Date.now() - entry.loadedAt < ADS_TTL_MS &&
      (entry.data?.length || 0) > 0;

    if (!force && (isFresh || entry?.isLoading)) {
      return entry?.data || [];
    }

    set((prev) => ({
      adsCache: {
        ...prev.adsCache,
        [key]: {
          ...(prev.adsCache[key] || {}),
          isLoading: true,
          error: "",
        },
      },
      error: "",
    }));

    const startedAt = nowMs();
    const dataPayload = {
      userid: payload?.userid || "testiser1",
      mobile: payload?.mobile || "",
      adclient: payload?.adclient || "fofi",
      srctype: payload?.srctype || "image",
      displayarea: payload?.displayarea || "homepage",
      displaytype: payload?.displaytype || "",
    };

    const doRequest = preferForm ? postForm : postJson;

    try {
      let data;
      try {
        data = await doRequest(API_ENDPOINTS.HOME_ADS, dataPayload);
      } catch (err) {
        const fallback = preferForm ? postJson : postForm;
        data = await fallback(API_ENDPOINTS.HOME_ADS, dataPayload);
      }

      if (data?.status?.err_code !== 0) {
        throw new Error(data?.status?.err_msg || "Failed to load ads");
      }

      const items = Array.isArray(data?.body) ? data.body : [];
      const ads = items.map((i) => i.adpath).filter(Boolean);

      set((prev) => ({
        adsCache: {
          ...prev.adsCache,
          [key]: {
            data: ads,
            loadedAt: Date.now(),
            isLoading: false,
            error: "",
            fetchMs: Math.round(nowMs() - startedAt),
          },
        },
      }));

      return ads;
    } catch (err) {
      const message = err?.message || "Failed to load ads";
      set((prev) => ({
        adsCache: {
          ...prev.adsCache,
          [key]: {
            ...(prev.adsCache[key] || {}),
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

export default useHomeAdsStore;
import { create } from "zustand";
import { fetchPrimaryCustDet } from "../server/modules-api/PrimaryCustDetApi";

// 2-hour TTL for primary customer details cache
const CUST_TTL_MS = 2 * 60 * 60 * 1000;

const usePrimaryCustDetStore = create((set, get) => ({
  cache: {}, // { [userid]: { customer, loadedAt, isLoading, error } }
  error: "",

  /**
   * Fetch primary customer details for `userid`.
   * - Caches with a 2-hour TTL keyed by userid.
   * - If cached & fresh and not `force`, returns the cached result.
   * - Never throws; surfaces errors via the returned `success` flag.
   */
  fetchCust: async (userid, { force = false } = {}) => {
    const id = String(userid || "").trim();
    if (!id) {
      return { success: false, message: "userid required", customer: null };
    }

    const entry = get().cache[id];
    const isFresh =
      entry?.loadedAt &&
      Date.now() - entry.loadedAt < CUST_TTL_MS &&
      entry.customer;

    if (!force && (isFresh || entry?.isLoading)) {
      return {
        success: !!entry?.customer,
        message: entry?.error || "cached",
        customer: entry?.customer || null,
      };
    }

    set((prev) => ({
      cache: {
        ...prev.cache,
        [id]: {
          ...(prev.cache[id] || {}),
          isLoading: true,
          error: "",
        },
      },
      error: "",
    }));

    const result = await fetchPrimaryCustDet({ userid: id });

    if (result.success && result.customer) {
      set((prev) => ({
        cache: {
          ...prev.cache,
          [id]: {
            customer: result.customer,
            loadedAt: Date.now(),
            isLoading: false,
            error: "",
          },
        },
      }));
    } else {
      const message = result.message || "Failed to load customer details";
      set((prev) => ({
        cache: {
          ...prev.cache,
          [id]: {
            ...(prev.cache[id] || {}),
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
   * Selector: returns the cached customer object for `userid`, or null.
   */
  getCust: (userid) => {
    const id = String(userid || "").trim();
    if (!id) return null;
    return get().cache[id]?.customer || null;
  },
}));

export default usePrimaryCustDetStore;

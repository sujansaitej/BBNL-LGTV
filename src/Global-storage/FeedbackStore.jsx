import { create } from "zustand";

import { API_ENDPOINTS } from "../Api/config";
import { postJson } from "./HomeStore";

const useFeedbackStore = create((set) => ({
  isSubmitting: false,
  error: "",
  successMessage: "",

  clearMessages: () => set({ error: "", successMessage: "" }),

  submitFeedback: async (payload) => {
    set({ isSubmitting: true, error: "", successMessage: "" });
    try {
      const data = await postJson(API_ENDPOINTS.FEED_BACK, payload);
      if (data?.status?.err_code === 0) {
        set({
          isSubmitting: false,
          successMessage: data?.status?.err_msg || "Feedback submitted",
        });
        return { success: true, data };
      }

      const message = data?.status?.err_msg || "Failed to submit feedback";
      set({ isSubmitting: false, error: message });
      return { success: false, message };
    } catch (err) {
      const message = err?.message || "Failed to submit feedback";
      set({ isSubmitting: false, error: message });
      return { success: false, message };
    }
  },
}));

export default useFeedbackStore;

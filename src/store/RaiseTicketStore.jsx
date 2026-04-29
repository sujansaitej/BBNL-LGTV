import { create } from "zustand";

import { API_ENDPOINTS } from "../server/config";
import { postJson } from "./HomeStore";

/**
 * RaiseTicket store — mirrors FeedbackStore pattern.
 *
 * State:
 *   - isSubmitting: boolean
 *   - error:        last error message
 *   - successMessage: last success message
 *
 * Actions:
 *   - submit({ userid, mobile, comment }) → { success, message, data }
 *   - clearMessages()
 */
const useRaiseTicketStore = create((set) => ({
  isSubmitting: false,
  error: "",
  successMessage: "",

  clearMessages: () => set({ error: "", successMessage: "" }),

  submit: async ({ userid, mobile, comment } = {}) => {
    const uid = (userid || "").toString().trim();
    const mob = (mobile || "").toString().trim();
    const cmt = (comment || "").toString().trim();

    if (!uid || !mob || !cmt) {
      const message = "All fields required";
      set({ isSubmitting: false, error: message, successMessage: "" });
      return { success: false, message, data: null };
    }

    set({ isSubmitting: true, error: "", successMessage: "" });
    try {
      const data = await postJson(API_ENDPOINTS.RAISE_TICKET, {
        userid: uid,
        mobile: mob,
        comment: cmt,
      });

      if (data?.status?.err_code === 0) {
        const message = data?.status?.err_msg || "Ticket Raised Successfully";
        set({ isSubmitting: false, successMessage: message, error: "" });
        return { success: true, message, data };
      }

      const message = data?.status?.err_msg || "Failed to raise ticket";
      set({ isSubmitting: false, error: message, successMessage: "" });
      return { success: false, message, data };
    } catch (err) {
      const message = err?.message || "Failed to raise ticket";
      set({ isSubmitting: false, error: message, successMessage: "" });
      return { success: false, message, data: null };
    }
  },
}));

export default useRaiseTicketStore;

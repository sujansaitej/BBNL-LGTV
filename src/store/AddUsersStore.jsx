import { create } from "zustand";

import { addUsers } from "../server/modules-api/AddUsersApi";

/**
 * AddUsers store — mirrors RaiseTicketStore pattern.
 *
 * State:
 *   - isSubmitting:    boolean
 *   - error:           last error message
 *   - successMessage:  last success message
 *   - lastResults:     [{ mobileno, avl }, ...] from the last submission
 *
 * Actions:
 *   - submit({ userid, mac_address, mobiles }) → { success, message, results, data }
 *   - clearMessages()
 */
const useAddUsersStore = create((set) => ({
  isSubmitting: false,
  error: "",
  successMessage: "",
  lastResults: [],

  clearMessages: () => set({ error: "", successMessage: "" }),

  submit: async ({ userid, mac_address, mobiles } = {}) => {
    set({ isSubmitting: true, error: "", successMessage: "" });
    const result = await addUsers({ userid, mac_address, mobiles });

    if (result?.success) {
      set({
        isSubmitting: false,
        successMessage: result.message || "User(s) added successfully",
        error: "",
        lastResults: result.results || [],
      });
    } else {
      set({
        isSubmitting: false,
        error: result?.message || "Failed to add user(s)",
        successMessage: "",
        // Even on failure server may include offending mobiles in body
        lastResults: result?.results || [],
      });
    }

    return result;
  },
}));

export default useAddUsersStore;

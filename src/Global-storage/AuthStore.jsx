import { create } from "zustand";

import { API_ENDPOINTS } from "../Api/config";
import { buildAuthPayload, postJson } from "./HomeStore";

const useAuthStore = create((set) => ({
  isLoading: false,
  error: "",
  success: "",

  clearMessages: () => set({ error: "", success: "" }),

  sendOtp: async (phone, options = {}) => {
    set({ isLoading: true, error: "", success: "" });
    try {
      const payload = buildAuthPayload(phone, {
        email: options.email,
        device_name: options.device_name,
        ip_address: options.ip_address,
        device_type: options.device_type,
        getuserdet: options.getuserdet,
        devdets: options.devdets,
      });

      const data = await postJson(API_ENDPOINTS.LOGIN, payload);
      if (data?.status?.err_code === 0) {
        const otpcode = data?.body?.[0]?.otpcode || null;
        const custdet = data?.body?.[0]?.custdet || null;
        set({ isLoading: false, success: data?.status?.err_msg || "OTP sent" });
        return { success: true, message: data?.status?.err_msg, otp: otpcode, custdet, data };
      }

      const message = data?.status?.err_msg || "Failed to send OTP";
      set({ isLoading: false, error: message });
      return { success: false, message, data };
    } catch (err) {
      const message = err?.message || "Network error";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  resendOtp: async (phone, options = {}) => {
    set({ isLoading: true, error: "", success: "" });
    try {
      const payload = buildAuthPayload(phone, {
        email: options.email,
        device_name: options.device_name,
        ip_address: options.ip_address,
        device_type: options.device_type,
        getuserdet: options.getuserdet,
        devdets: options.devdets,
      });

      const data = await postJson(API_ENDPOINTS.RESEND_OTP, payload);
      if (data?.status?.err_code === 0) {
        const otpcode = data?.body?.[0]?.otpcode || null;
        set({ isLoading: false, success: data?.status?.err_msg || "OTP resent" });
        return { success: true, message: data?.status?.err_msg, otp: otpcode, data };
      }

      const message = data?.status?.err_msg || "Failed to resend OTP";
      set({ isLoading: false, error: message });
      return { success: false, message, data };
    } catch (err) {
      const message = err?.message || "Network error";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  verifyOtp: async (phone, otp, options = {}) => {
    set({ isLoading: true, error: "", success: "" });
    try {
      const payload = {
        mobile: phone,
        otp,
      };

      const data = await postJson(API_ENDPOINTS.RESEND_OTP, payload);
      if (data?.status?.err_code === 0) {
        set({ isLoading: false, success: data?.status?.err_msg || "OTP verified" });
        return { success: true, message: data?.status?.err_msg, data };
      }

      const message = data?.status?.err_msg || "Invalid OTP";
      set({ isLoading: false, error: message });
      return { success: false, message, data };
    } catch (err) {
      const message = err?.message || "Network error";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },
}));

export default useAuthStore;

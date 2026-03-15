import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

/**
 * Checks whether the app is locked for the given device/user.
 * Returns { locked: true } when body.lock === "true".
 */
export const checkAppLock = async (payload = {}) => {
  try {
    const reqBody = {
      device_name: payload.device_name || "LG TV",
      device_type: payload.device_type || "LG TV",
      ip_address: payload.ip_address || "",
      mobile: payload.mobile || "",
      devdets: {
        brand: "LG",
        model: payload.model || "",
      },
    };

    const response = await axios.post(API_ENDPOINTS.APP_LOCK, reqBody, {
      headers: getDefaultHeaders(),
    });

    const lock = response?.data?.body?.lock;
    const isLocked = lock === "true" || lock === true;

    return { success: true, locked: isLocked, data: response?.data };
  } catch (error) {
    return {
      success: false,
      locked: false,
      message: error?.message || "Applock check failed",
      data: null,
    };
  }
};

export default checkAppLock;

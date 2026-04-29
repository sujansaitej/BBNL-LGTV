import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

/**
 * Notifies the backend that the user has logged out.
 *
 * Spec (BBNL-IPTV APIs row 20 — POST /userLogout):
 *   Body: { userid, mobile, ip_address, mac_address, useraction }
 *   Positive: status.err_code === 0  ("You have logged out successfully.")
 *   Negative: err_code 1 ("Failed to authenticate" / "Invalid User ID" /
 *                          "User Deactivated")
 *
 * Fire-and-forget from App.handleLogout — never throws.
 */
export const userLogout = async ({
  userid,
  mobile,
  ip_address,
  mac_address,
  useraction = "manual",
} = {}) => {
  try {
    const payload = {
      userid: String(userid || "").trim(),
      mobile: String(mobile || "").trim(),
      ip_address: String(ip_address || "").trim(),
      mac_address: String(mac_address || "").trim(),
      useraction: String(useraction || "manual").trim(),
    };

    const response = await axios.post(API_ENDPOINTS.USE_LOGOUT, payload, {
      headers: getDefaultHeaders(),
    });

    const ok = response?.data?.status?.err_code === 0;
    return {
      success: ok,
      message:
        response?.data?.status?.err_msg ||
        (ok ? "Logged out successfully" : "Logout failed"),
      data: response?.data || null,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error?.response?.data?.status?.err_msg ||
        error?.message ||
        "Logout API error",
      data: error?.response?.data || null,
    };
  }
};

export default userLogout;

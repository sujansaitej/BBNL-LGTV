import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

/**
 * BBNL spec row 31 — POST /ssologin
 *
 * Attempts a single sign-on using device-bound identifiers (serial + MAC + IP).
 * On success the backend returns a non-empty `body[0]` carrying { userid, usertype,
 * usercount, custdet:[{ mobile, email, isprime }] } and `status.err_code = 0`.
 * On failure (including the "Something went wrong(SSO001)" family) the backend
 * returns `body: []` with `err_code: 1` and a human-readable err_msg.
 *
 * This helper NEVER throws — callers (LoginOtp.jsx) just check `success` and
 * fall back to the standard OTP flow when SSO is not eligible.
 *
 * @param {Object} args
 * @param {string} args.serial_no     - webOS device unique ID (LGUDID/NDUID/MAC fallback)
 * @param {string} args.mac_address   - wired MAC preferred; wifi MAC fallback
 * @param {string} [args.device_name] - default "LG TV"
 * @param {string} args.ip_address    - private IPv4 preferred; public IPv4 fallback
 * @param {string} [args.device_type] - default "LG"
 * @returns {Promise<{ success: boolean, customer: Object|null, message: string, data: any }>}
 */
export const attemptSso = async ({
  serial_no,
  mac_address,
  device_name = "LG TV",
  ip_address,
  device_type = "LG",
} = {}) => {
  // Mandatory: serial + MAC. The other three can default.
  if (!serial_no || !mac_address) {
    return {
      success: false,
      customer: null,
      message: "Missing serial/mac",
      data: null,
    };
  }

  const body = {
    serial_no,
    mac_address,
    device_name: device_name || "LG TV",
    ip_address: ip_address || "",
    device_type: device_type || "LG",
  };

  try {
    console.log("[ssologin] →", body);
    const res = await axios.post(API_ENDPOINTS.SSO_LOGIN, body, {
      headers: getDefaultHeaders(),
    });
    console.log("[ssologin] ←", { status: res?.status, data: res?.data });

    const errCode = res?.data?.status?.err_code;
    const errMsg  = res?.data?.status?.err_msg || "";
    const customer = res?.data?.body?.[0] || null;

    if (errCode === 0 && customer) {
      return {
        success: true,
        customer,
        message: errMsg || "SSO success",
        data: res.data,
      };
    }

    return {
      success: false,
      customer: null,
      message: errMsg || "SSO not eligible",
      data: res?.data || null,
    };
  } catch (error) {
    // Never throw — SSO is best-effort. Caller proceeds with OTP fallback.
    console.warn("[ssologin] error:", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    return {
      success: false,
      customer: null,
      message: error?.response?.data?.status?.err_msg || error?.message || "Network error",
      data: error?.response?.data || null,
    };
  }
};

export default attemptSso;

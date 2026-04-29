import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

// ── /streamAds (BBNL spec row 21) ────────────────────────────────────────────
// POST { userid, mobile, ip_address, mac_address, grid, chid }
//
// Positive response shape:
//   { body: { position, duration, type, path, path2 },
//     status: { err_code: 0, err_msg: "Advertisement Available" } }
//
// Negative (no ad available):
//   { body: {}, status: { err_code: 1, err_msg: "..." } }
//
// This helper NEVER throws — failures resolve to { success: false, ad: null }
// so callers can fire-and-forget without try/catch wrapping.
export const fetchStreamAd = async ({
  userid,
  mobile,
  ip_address,
  mac_address,
  grid,
  chid,
} = {}) => {
  // Validate mandatory fields per spec
  if (!userid || !mobile || !ip_address || !mac_address || !grid || !chid) {
    return {
      success: false,
      ad: null,
      message: "Missing required fields",
      data: null,
    };
  }

  const body = { userid, mobile, ip_address, mac_address, grid, chid };

  try {
    const response = await axios.post(API_ENDPOINTS.STREAMADS, body, {
      headers: getDefaultHeaders(),
      timeout: 8000,
    });

    const data = response?.data || null;
    const errCode = data?.status?.err_code;
    const errMsg = data?.status?.err_msg || "";
    const rawBody = data?.body;

    // Treat any non-zero err_code or empty body as "no ad" — no error.
    const hasBody =
      rawBody &&
      typeof rawBody === "object" &&
      !Array.isArray(rawBody) &&
      Object.keys(rawBody).length > 0;

    if (errCode !== 0 || !hasBody) {
      return {
        success: false,
        ad: null,
        message: errMsg || "No advertisement available",
        data,
      };
    }

    return {
      success: true,
      ad: rawBody,
      message: errMsg || "Advertisement Available",
      data,
    };
  } catch (err) {
    // Never throw — log and resolve to "no ad" so the player keeps running.
    console.warn("[StreamAds API] Request failed:", err?.message || err);
    return {
      success: false,
      ad: null,
      message: err?.message || "Request failed",
      data: null,
    };
  }
};

export default fetchStreamAd;

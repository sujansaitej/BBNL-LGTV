import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

/**
 * BBNL spec row 22 — POST /expiringchnl_list
 * Body: { userid, mobile, grid: "", bcid: "", langid: "" }
 * Mandatory: userid, mobile. The other three are optional filters
 * (pass empty strings to fetch the full list).
 *
 * Positive response shape:
 *   { body: [{ channels: [{ chid, bcid, grid, langid, chtitle, chdetails,
 *                          chlogo, chprice, expirydate?, ... }] }],
 *     status: { err_code: 0 } }
 *
 * Negative err_msgs include:
 *   "Failed to authenticate", "Invalid User ID", "User Deactivated".
 *
 * Returns: { success, message, channels, data }
 *   - channels = response?.data?.body?.[0]?.channels || []
 *
 * Never throws. Errors are surfaced via `success: false`.
 */
export const fetchExpiringChannels = async ({
  userid,
  mobile,
  grid = "",
  bcid = "",
  langid = "",
} = {}) => {
  const uid = String(userid || "").trim();
  const mob = String(mobile || "").trim();

  if (!uid || !mob) {
    return {
      success: false,
      message: "userid and mobile required",
      channels: [],
      data: null,
    };
  }

  const body = {
    userid: uid,
    mobile: mob,
    grid: grid || "",
    bcid: bcid || "",
    langid: langid || "",
  };

  try {
    const response = await axios.post(
      API_ENDPOINTS.CHANNEL_EXPIRING,
      body,
      { headers: getDefaultHeaders() }
    );

    const ok = response?.data?.status?.err_code === 0;
    const channels = response?.data?.body?.[0]?.channels || [];

    return {
      success: ok,
      message:
        response?.data?.status?.err_msg ||
        (ok ? "Data Fetched" : "Expiring channels fetch failed"),
      channels: Array.isArray(channels) ? channels : [],
      data: response?.data || null,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error?.response?.data?.status?.err_msg ||
        error?.message ||
        "Expiring channels API error",
      channels: [],
      data: error?.response?.data || null,
    };
  }
};

export default fetchExpiringChannels;

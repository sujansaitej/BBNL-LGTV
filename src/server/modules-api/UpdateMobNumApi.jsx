import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

/**
 * Request a mobile-number update.
 *
 * BBNL spec — POST /updateMobNum
 *   Body: { userid }   ← spec is intentionally minimal: server drives the
 *                        actual mobile-update flow via SMS/email out-of-band.
 *                        The client only *requests* the change.
 *
 *   Positive: { status: { err_code: 0, err_msg: "Mobile number updated!" } }
 *   Negative: { status: { err_code: 1, err_msg: "User ID not found" } }
 *
 * This helper never throws. It always resolves to { success, message, data }.
 */
export const requestMobileUpdate = async ({ userid } = {}) => {
  const uid = (userid || "").toString().trim();

  if (!uid) {
    return { success: false, message: "userid required", data: null };
  }

  try {
    const response = await axios.post(
      API_ENDPOINTS.UPDATE_MOB_NUM,
      { userid: uid },
      { headers: getDefaultHeaders() }
    );
    const data = response?.data;
    const errCode = data?.status?.err_code;
    const errMsg = data?.status?.err_msg;

    if (errCode === 0) {
      return {
        success: true,
        message: errMsg || "Mobile number updated!",
        data,
      };
    }
    return {
      success: false,
      message: errMsg || "User ID not found",
      data,
    };
  } catch (err) {
    return {
      success: false,
      message: err?.message || "Failed to request mobile update",
      data: null,
    };
  }
};

export default requestMobileUpdate;

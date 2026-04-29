import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

/**
 * Submit a support ticket (Help & Support).
 *
 * BBNL spec — POST /raiseTicket
 *   Body: { userid, mobile, comment }
 *   Mandatory: userid, mobile, comment
 *
 *   Positive: { status: { err_code: 0, err_msg: "Ticket Raised Successfully" } }
 *   Negative err_msgs: "Failed to authenticate" | "Invalid User ID" | "Tickets Are Pending"
 *
 * This helper never throws. It always resolves to { success, message, data }.
 */
export const submitTicket = async ({ userid, mobile, comment } = {}) => {
  const uid = (userid || "").toString().trim();
  const mob = (mobile || "").toString().trim();
  const cmt = (comment || "").toString().trim();

  if (!uid || !mob || !cmt) {
    return { success: false, message: "All fields required", data: null };
  }

  try {
    const response = await axios.post(
      API_ENDPOINTS.RAISE_TICKET,
      { userid: uid, mobile: mob, comment: cmt },
      { headers: getDefaultHeaders() }
    );
    const data = response?.data;
    const errCode = data?.status?.err_code;
    const errMsg = data?.status?.err_msg;

    if (errCode === 0) {
      return {
        success: true,
        message: errMsg || "Ticket Raised Successfully",
        data,
      };
    }
    return {
      success: false,
      message: errMsg || "Failed to raise ticket",
      data,
    };
  } catch (err) {
    return {
      success: false,
      message: err?.message || "Failed to raise ticket",
      data: null,
    };
  }
};

export default submitTicket;

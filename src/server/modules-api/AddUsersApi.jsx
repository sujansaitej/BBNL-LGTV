import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

/**
 * Add additional users to a BBNL subscription.
 *
 * BBNL spec — POST /addusers
 *   Body: { userid, mac_address, add_devices: [{ mobile: "..." }, ...] }
 *   Mandatory: userid, mac_address, add_devices (>= 1 entry)
 *
 *   Positive: {
 *     body:   [{ mobileno, avl }, ...],
 *     status: { err_code: 0, err_msg: "User(s) added successfully" }
 *   }
 *     - avl === "false" → newly added now
 *     - avl === "true"  → already existed
 *
 *   Negative err_msgs include: "Failed to authenticate", "Invalid User ID",
 *   "User already exists" (with body listing offending mobiles).
 *
 * This helper never throws. It always resolves to { success, message, results, data }.
 *
 * @param {Object}   args
 * @param {string}   args.userid       — primary user ID (required)
 * @param {string}   args.mac_address  — MAC address of this device (required)
 * @param {string[]} args.mobiles      — list of 10-digit mobile numbers to add
 * @returns {Promise<{ success: boolean, message: string, results: Array<{mobileno: string, avl: string}>, data: any }>}
 */
export const addUsers = async ({ userid, mac_address, mobiles } = {}) => {
  const uid = (userid || "").toString().trim();
  const mac = (mac_address || "").toString().trim();
  const list = Array.isArray(mobiles) ? mobiles.map((m) => (m || "").toString().trim()).filter(Boolean) : [];

  if (!uid) {
    return { success: false, message: "userid required", results: [], data: null };
  }
  if (!mac) {
    return { success: false, message: "mac_address required", results: [], data: null };
  }
  if (list.length === 0) {
    return { success: false, message: "At least one mobile number required", results: [], data: null };
  }

  // Validate each mobile is a 10-digit numeric string
  const tenDigit = /^\d{10}$/;
  const bad = list.find((m) => !tenDigit.test(m));
  if (bad) {
    return {
      success: false,
      message: `Invalid mobile number: ${bad}`,
      results: [],
      data: null,
    };
  }

  const body = {
    userid: uid,
    mac_address: mac,
    add_devices: list.map((m) => ({ mobile: m })),
  };

  try {
    const response = await axios.post(
      API_ENDPOINTS.ADD_USERS,
      body,
      { headers: getDefaultHeaders() }
    );
    const data = response?.data;
    const errCode = data?.status?.err_code;
    const errMsg = data?.status?.err_msg;
    const results = Array.isArray(data?.body) ? data.body : [];

    if (errCode === 0) {
      return {
        success: true,
        message: errMsg || "User(s) added successfully",
        results,
        data,
      };
    }
    return {
      success: false,
      message: errMsg || "Failed to add user(s)",
      results,
      data,
    };
  } catch (err) {
    return {
      success: false,
      message: err?.message || "Failed to add user(s)",
      results: [],
      data: null,
    };
  }
};

export default addUsers;

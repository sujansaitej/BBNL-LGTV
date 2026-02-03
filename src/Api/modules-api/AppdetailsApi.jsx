import axios from "axios";
import { API_ENDPOINTS } from "../config";

/**
 * Fetch app version details
 * @param {Object} payload - Contains userid, mobile, ip_address, device_type, mac_address, device_name, app_package
 * @param {Object} headers - Request headers
 * @returns {Object} App version details including appversion, verchngmsg, appdwnldlink, tvappdwnldlink
 */
export const fetchAppVersion = async (payload, headers) => {
  try {
    const res = await axios.post(API_ENDPOINTS.APP_VERSION, payload, { headers });
    
    if (res?.data?.status?.err_code !== 0) {
      throw new Error(res?.data?.status?.err_msg || "Failed to fetch app version");
    }
    
    return res?.data?.body || {};
  } catch (error) {
    console.error("[AppdetailsApi] Error fetching app version:", error);
    throw error;
  }
};

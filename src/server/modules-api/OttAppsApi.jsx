import axios from "axios";
import { API_ENDPOINTS } from "../config";

/**
 * Fetch OTT apps list from API
 * @param {Object} payload - { userid, mobile, ip_address, mac }
 * @param {Object} headers - Custom headers (devmac, Authorization, devslno)
 * @returns {Promise} - List of OTT apps with appname, icon, pkgid
 */
export const fetchOttApps = async (payload, headers) => {
  try {
    const response = await axios.post(
      API_ENDPOINTS.OTT_APPS,
      payload,
      { headers }
    );

    // Extract apps from response
    if (response.data && response.data.apps) {
      const appsData = response.data.apps;
      return Array.isArray(appsData) ? appsData : [];
    }

    return [];
  } catch (error) {
    console.error("Error fetching OTT apps:", error);
    throw error;
  }
};

export default fetchOttApps;

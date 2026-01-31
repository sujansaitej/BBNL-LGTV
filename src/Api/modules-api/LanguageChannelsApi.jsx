import axios from "axios";
import { API_ENDPOINTS } from "../config";

/**
 * Fetch language list from API
 * @param {Object} payload - { userid, mobile }
 * @param {Object} headers - Custom headers (devmac, Authorization, devslno)
 * @returns {Promise} - List of languages with langid, langtitle, langlogo
 */
export const fetchLanguages = async (payload, headers) => {
  try {
    const response = await axios.post(
      API_ENDPOINTS.CHANNEL_LANGUAGELIST,
      payload,
      { headers }
    );

    // Extract languages from response
    if (response.data && response.data.body && response.data.body[0]) {
      const languagesData = response.data.body[0].languages;
      return Array.isArray(languagesData) ? languagesData : [];
    }

    return [];
  } catch (error) {
    console.error("Error fetching languages:", error);
    throw error;
  }
};

export default fetchLanguages;

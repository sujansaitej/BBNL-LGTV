import axios from "axios";
import { API_ENDPOINTS } from "../config";

/**
 * Submit user feedback
 * @param {Object} payload - { userid, mobile, rate_count, feedback, mac_address, device_name, device_type }
 * @param {Object} headers - Custom headers (devmac, Authorization, devslno)
 * @returns {Promise} - Feedback submission response
 */
export const submitFeedback = async (payload, headers) => {
  try {
    const response = await axios.post(
      API_ENDPOINTS.FEED_BACK,
      payload,
      { headers }
    );

    return response.data;
  } catch (error) {
    console.error("Error submitting feedback:", error);
    throw error;
  }
};

export default submitFeedback;

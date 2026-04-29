import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

/**
 * Allowed display areas for the /ottscreenbgs endpoint, per BBNL spec row 28.
 * Keep in sync with backend valid keys: login, channellist, movies, profile, payment.
 */
const ALLOWED_DISPLAY_AREAS = new Set([
  "login",
  "channellist",
  "movies",
  "profile",
  "payment",
]);

/**
 * Fetch a screen background image from the BBNL /ottscreenbgs endpoint.
 *
 * Spec contract:
 *   POST { bgclient, srctype, displayarea }
 *   Positive response: { body: [{ bgpath: "<url>" }],
 *                        status: { err_code: 0, err_msg: "Background Image Available" } }
 *   Negative response: { status: { err_code: 1, err_msg: "<reason>" } }
 *
 * Validation: `displayarea` must be one of the ALLOWED_DISPLAY_AREAS.
 * Returns a uniform shape { success, bgpath, message, data }; never throws.
 */
export const fetchScreenBackground = async ({
  displayarea,
  bgclient = "fofi",
  srctype = "image",
} = {}) => {
  if (!displayarea || !ALLOWED_DISPLAY_AREAS.has(displayarea)) {
    return {
      success: false,
      bgpath: "",
      message: "Invalid displayarea",
      data: null,
    };
  }

  try {
    const reqBody = {
      bgclient,
      srctype,
      displayarea,
    };

    const response = await axios.post(API_ENDPOINTS.OTT_SCREEN_BGS, reqBody, {
      headers: getDefaultHeaders(),
    });

    const errCode = response?.data?.status?.err_code;
    const errMsg = response?.data?.status?.err_msg || "";
    const bgpath = response?.data?.body?.[0]?.bgpath || "";

    if (errCode === 0 && bgpath) {
      return {
        success: true,
        bgpath,
        message: errMsg || "Background Image Available",
        data: response?.data,
      };
    }

    return {
      success: false,
      bgpath: "",
      message: errMsg || "BG not available",
      data: response?.data,
    };
  } catch (error) {
    return {
      success: false,
      bgpath: "",
      message:
        error?.response?.data?.status?.err_msg ||
        error?.message ||
        "Screen background API error",
      error,
      data: error?.response?.data || null,
    };
  }
};

export default fetchScreenBackground;

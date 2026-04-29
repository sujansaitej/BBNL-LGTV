// Oyo endpoint helpers (spec rows 17-20). Helpers only — no UI surface in the LG build today. Wire into a future Oyo screen if/when product asks.

import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

// Row 17 — POST /oyo_chnl_video
// Body: { userid, mobile, respkey: "Channels" | "Movies" }
export const fetchOyoChannels = async ({ userid, mobile, respkey } = {}) => {
  if (!userid || !mobile || !respkey) {
    return {
      success: false,
      channels: [],
      message: "Missing required field(s): userid, mobile, respkey",
      data: null,
    };
  }

  const body = { userid, mobile, respkey };

  try {
    const response = await axios.post(
      API_ENDPOINTS.OYO_CHNL_VIDEO,
      body,
      { headers: getDefaultHeaders() }
    );

    const errCode = response?.data?.status?.err_code;
    const channels = response?.data?.body?.[0]?.channels || [];

    if (errCode !== 0) {
      return {
        success: false,
        channels: [],
        message: response?.data?.status?.err_msg || "Unknown error",
        data: response?.data ?? null,
      };
    }

    return {
      success: true,
      channels,
      message: response?.data?.status?.err_msg || "OK",
      data: response?.data ?? null,
    };
  } catch (error) {
    return {
      success: false,
      channels: [],
      message: error?.message || "Network error",
      data: error?.response?.data ?? null,
    };
  }
};

// Row 18 — POST /oyo_mediacategs
// Body: { userid, mobile }
export const fetchOyoMediaCategories = async ({ userid, mobile } = {}) => {
  if (!userid || !mobile) {
    return {
      success: false,
      categories: [],
      message: "Missing required field(s): userid, mobile",
      data: null,
    };
  }

  const body = { userid, mobile };

  try {
    const response = await axios.post(
      API_ENDPOINTS.OYO_MEDIA_CATEGS,
      body,
      { headers: getDefaultHeaders() }
    );

    const errCode = response?.data?.status?.err_code;
    const categories = response?.data?.body || [];

    if (errCode !== 0) {
      return {
        success: false,
        categories: [],
        message: response?.data?.status?.err_msg || "Unknown error",
        data: response?.data ?? null,
      };
    }

    return {
      success: true,
      categories,
      message: response?.data?.status?.err_msg || "OK",
      data: response?.data ?? null,
    };
  } catch (error) {
    return {
      success: false,
      categories: [],
      message: error?.message || "Network error",
      data: error?.response?.data ?? null,
    };
  }
};

// Row 19 — POST /oyo_media
// Body: { userid, mobile, langid }
export const fetchOyoMedia = async ({ userid, mobile, langid } = {}) => {
  if (!userid || !mobile || !langid) {
    return {
      success: false,
      media: [],
      message: "Missing required field(s): userid, mobile, langid",
      data: null,
    };
  }

  const body = { userid, mobile, langid };

  try {
    const response = await axios.post(
      API_ENDPOINTS.OYO_MEDIA,
      body,
      { headers: getDefaultHeaders() }
    );

    const errCode = response?.data?.status?.err_code;
    const media = response?.data?.body || [];

    if (errCode !== 0) {
      return {
        success: false,
        media: [],
        message: response?.data?.status?.err_msg || "Unknown error",
        data: response?.data ?? null,
      };
    }

    return {
      success: true,
      media,
      message: response?.data?.status?.err_msg || "OK",
      data: response?.data ?? null,
    };
  } catch (error) {
    return {
      success: false,
      media: [],
      message: error?.message || "Network error",
      data: error?.response?.data ?? null,
    };
  }
};

// Row 20 — POST /oyoads
// Body: { userid, mobile, appclient: "oyo" }
export const fetchOyoAds = async ({ userid, mobile, appclient = "oyo" } = {}) => {
  if (!userid || !mobile) {
    return {
      success: false,
      ads: [],
      message: "Missing required field(s): userid, mobile",
      data: null,
    };
  }

  const body = { userid, mobile, appclient: appclient || "oyo" };

  try {
    const response = await axios.post(
      API_ENDPOINTS.OYO_ADS,
      body,
      { headers: getDefaultHeaders() }
    );

    const errCode = response?.data?.status?.err_code;
    const items = response?.data?.body || [];
    const ads = items.map((a) => a?.adimgurl).filter(Boolean);

    if (errCode !== 0) {
      return {
        success: false,
        ads: [],
        message: response?.data?.status?.err_msg || "Unknown error",
        data: response?.data ?? null,
      };
    }

    return {
      success: true,
      ads,
      message: response?.data?.status?.err_msg || "OK",
      data: response?.data ?? null,
    };
  } catch (error) {
    return {
      success: false,
      ads: [],
      message: error?.message || "Network error",
      data: error?.response?.data ?? null,
    };
  }
};

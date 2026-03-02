// API Configuration

// Base URL for API endpoints
export const API_BASE_URL_PROD = "http://124.40.244.211/netmon/cabletvapis";

// Default headers for all API requests
// Returns headers with deviceID read dynamically from localStorage at call time
export const getDefaultHeaders = () => {
  const pinnedDeviceId = localStorage.getItem("lgtv_device_id_pinned");
  const deviceID = pinnedDeviceId ? `TV-${pinnedDeviceId}` : localStorage.getItem("lgtv_device_uuid") || "unknown-device";

  return {
    "Content-Type": "application/json",
    Authorization: "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
    deviceID,
  };
};

// Default user
export const DEFAULT_USER = {
  mobile: "7800000001",
};

// API Endpoints
export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL_PROD}/login`,
  RESEND_OTP: `${API_BASE_URL_PROD}/loginOtp`,
  Add_MACADDRESS: `${API_BASE_URL_PROD}/addmacnew`,
  USE_LOGOUT: `${API_BASE_URL_PROD}/userLogout`,
  CHANNEL_CATEGORIES: `${API_BASE_URL_PROD}/chnl_categlist`,
  CHANNEL_LANGUAGELIST: `${API_BASE_URL_PROD}/chnl_langlist`,
  CHANNEL_DATA: `${API_BASE_URL_PROD}/chnl_data`,
  CHANNEL_EXPIRING: `${API_BASE_URL_PROD}/expiringchnl_list`,
  HOME_ADS: `${API_BASE_URL_PROD}/iptvads`,
  STREAMADS : `${API_BASE_URL_PROD}/streamAds`,
  OTT_APPS: `${API_BASE_URL_PROD}/allowedapps`,
  RAISE_TICKET: `${API_BASE_URL_PROD}/raiseTicket`,
  FEED_BACK: `${API_BASE_URL_PROD}/feedback`,
  APP_LOCK: `${API_BASE_URL_PROD}/applock`,
  TRP_DATA: `${API_BASE_URL_PROD}/trpdata`,
  APP_VERSION: `${API_BASE_URL_PROD}/appversion`,
};

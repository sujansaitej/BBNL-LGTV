// API Configuration
import axios from "axios";

// Base URL for API endpoints
export const API_BASE_URL_PROD = "http://124.40.244.211/netmon/cabletvapis";

// Reads the pinned device ID from localStorage at call time
const getDeviceID = () => {
  const pinned = localStorage.getItem("lgtv_device_id_pinned");
  return pinned
    ? `TV-${pinned}`
    : localStorage.getItem("lgtv_device_uuid") || "unknown-device";
};

// Default headers for all API requests
export const getDefaultHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
  deviceID: getDeviceID(),
});

// ── Global axios interceptor ─────────────────────────────────────────────────
// Guarantees deviceID + Authorization are on EVERY axios request automatically,
// even if a caller forgets to pass getDefaultHeaders().
axios.interceptors.request.use((config) => {
  config.headers["deviceID"]       = getDeviceID();
  config.headers["Authorization"]  = "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=";
  return config;
});

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
  ERROR_IMAGES: `${API_BASE_URL_PROD}/errorimages`,
  LOGO: `${API_BASE_URL_PROD}/fofitv_logo`,
};

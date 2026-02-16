// API Configuration

// Base URL for API endpoints
export const API_BASE_URL_PROD = "http://124.40.244.211/netmon/cabletvapis";

// Default headers for all API requests
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  // Match headers used in Postman: Basic auth + device headers
  Authorization: "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
  devmac: "26:F2:AE:D8:3F:99",
  devslno: "FOFI20191129000336",
  deviceID : "qwerty1"
};

// Default user information
export const DEFAULT_USER = {
  userid: "testiser1",
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

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
  CHANNEL_CATEGORIES: `${API_BASE_URL_PROD}/channels/categories`,
  CHANNEL_DATA: `${API_BASE_URL_PROD}/channels/data`,
  FAVORITES: `${API_BASE_URL_PROD}/favorites`,
  HOME_ADS: `${API_BASE_URL_PROD}/ads/home`,
  OTT_APPS: `${API_BASE_URL_PROD}/ott-apps`,
  DEFAULT_APPS: `${API_BASE_URL_PROD}/default-apps`,
  SUBSCRIPTION: `${API_BASE_URL_PROD}/subscription`,
};

// API Configuration

// Base URL for API endpoints
export const API_BASE_URL_PROD = "http://61.1.141.130:8000";

// Default headers for all API requests
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Authorization: "Bearer test-token",
};

// Default user information
export const DEFAULT_USER = {
  userid: "testuser1",
  mobile: "9800000001",
};

// API Endpoints
export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL_PROD}/api/v1/login`,
  LOGIN_OTP: `${API_BASE_URL_PROD}/api/v1/verify-otp`,
  VERIFY_OTP: `${API_BASE_URL_PROD}/api/v1/verify-otp`,
  CHANNEL_CATEGORIES: `${API_BASE_URL_PROD}/api/v1/channels/categories`,
  CHANNEL_DATA: `${API_BASE_URL_PROD}/api/v1/channels/data`,
  FAVORITES: `${API_BASE_URL_PROD}/api/v1/favorites`,
  HOME_ADS: `${API_BASE_URL_PROD}/api/v1/ads/home`,
  OTT_APPS: `${API_BASE_URL_PROD}/api/v1/ott-apps`,
  DEFAULT_APPS: `${API_BASE_URL_PROD}/api/v1/default-apps`,
  SUBSCRIPTION: `${API_BASE_URL_PROD}/api/v1/subscription`,
};

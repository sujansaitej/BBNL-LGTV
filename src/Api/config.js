// API Configuration - Central place for all API endpoints and common headers

// Base URLs for different API services
export const API_BASE_URL = "http://124.40.244.211/netmon/cabletvapis";
export const API_BASE_URL_PROD = "https://bbnlnetmon.bbnl.in/prod/cabletvapis";

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication APIs
  LOGIN: `${API_BASE_URL}/login`,
  LOGIN_OTP: `${API_BASE_URL}/loginOtp`,
  
  // Channel APIs
  CHANNEL_CATEGORIES: `${API_BASE_URL}/chnl_categlist`,
  CHANNEL_DATA: `${API_BASE_URL}/chnl_data`,
  
  // App & Content APIs
  ALLOWED_APPS: `${API_BASE_URL}/allowedapps`,
  IPTV_ADS: `${API_BASE_URL_PROD}/iptvads`,
  STREAM_ADS: `${API_BASE_URL}/streamAds`,
};

// Default headers for all API requests
export const DEFAULT_HEADERS = {
  Authorization: "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
  "Content-Type": "application/json",
};

// Default credentials (fallback)
export const DEFAULT_USER = {
  userid: "testiser1",
  devslno: "FOFI20191129000336",
};

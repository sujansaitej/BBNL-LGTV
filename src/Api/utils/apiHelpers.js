// API Helper utilities for consistent device info handling across all APIs

/**
 * Build complete device headers for API requests
 * @param {Object} deviceInfo - Device information from fetchDeviceInfo()
 * @returns {Object} Headers object with all device information
 */
export const buildDeviceHeaders = (deviceInfo = {}) => {
  const headers = {
    Authorization: "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
    "Content-Type": "application/json",
  };

  // Add all available device info to headers
  if (deviceInfo?.ipAddress) headers.devip = deviceInfo.ipAddress;
  if (deviceInfo?.macAddress) headers.devmac = deviceInfo.macAddress;
  if (deviceInfo?.serialNumber) headers.devslno = deviceInfo.serialNumber;
  if (deviceInfo?.deviceId) headers.devid = deviceInfo.deviceId;
  if (deviceInfo?.modelName) headers.devmodel = deviceInfo.modelName;

  return headers;
};

/**
 * Build device payload for API request body
 * Always includes IP address and MAC address when available
 * @param {Object} deviceInfo - Device information from fetchDeviceInfo()
 * @returns {Object} Payload object with device information
 */
export const buildDevicePayload = (deviceInfo = {}) => {
  const payload = {};

  // Include device info in payload
  if (deviceInfo?.ipAddress) payload.ip_address = deviceInfo.ipAddress;
  if (deviceInfo?.macAddress) payload.mac_address = deviceInfo.macAddress;
  if (deviceInfo?.deviceId) payload.device_id = deviceInfo.deviceId;

  return payload;
};

/**
 * Build complete API request config with both headers and payload
 * @param {Object} basePayload - Base payload with userid, mobile, etc.
 * @param {Object} deviceInfo - Device information from fetchDeviceInfo()
 * @returns {Object} Complete request configuration { payload, headers }
 */
export const buildApiConfig = (basePayload = {}, deviceInfo = {}) => {
  return {
    payload: {
      ...basePayload,
      ...buildDevicePayload(deviceInfo),
    },
    headers: buildDeviceHeaders(deviceInfo),
  };
};

/**
 * Get user credentials from localStorage
 * @returns {Object} User credentials { userid, mobile }
 */
export const getUserCredentials = () => {
  return {
    userid: localStorage.getItem("userId") || "testiser1",
    mobile: localStorage.getItem("userPhone") || "7800000001",
  };
};

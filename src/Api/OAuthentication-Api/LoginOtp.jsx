import axios from "axios";
import { API_ENDPOINTS, DEFAULT_HEADERS, DEFAULT_USER } from "../config";

// Helper to build device payload
const buildDevicePayload = (deviceInfo) => {
  const meta = {};
  if (deviceInfo?.ipAddress) meta.ip_address = deviceInfo.ipAddress;
  if (deviceInfo?.macAddress) meta.mac_address = deviceInfo.macAddress;
  if (deviceInfo?.deviceId) meta.device_id = deviceInfo.deviceId;
  return meta;
};

// Helper to build device headers
const buildDeviceHeaders = (deviceInfo) => {
  const meta = {};
  if (deviceInfo?.ipAddress) meta.devip = deviceInfo.ipAddress;
  if (deviceInfo?.macAddress) meta.devmac = deviceInfo.macAddress;
  if (deviceInfo?.serialNumber) meta.devslno = deviceInfo.serialNumber;
  if (deviceInfo?.deviceId) meta.devid = deviceInfo.deviceId;
  if (deviceInfo?.modelName) meta.devmodel = deviceInfo.modelName;
  return meta;
};

// Send OTP to phone number
export const sendOtp = async (phone, deviceInfo = {}) => {
  try {
    const payload = {
      userid: DEFAULT_USER.userid,
      mobile: phone,
      ...buildDevicePayload(deviceInfo),
    };

    console.log("Sending OTP request with payload:", payload);

    const res = await axios.post(API_ENDPOINTS.LOGIN, payload, {
      headers: {
        ...DEFAULT_HEADERS,
        ...buildDeviceHeaders(deviceInfo),
      },
    });

    console.log("OTP API Response:", res.data);

    if (res.data.status.err_code === 0) {
      // Extract userId from response
      let userId = null;
      if (
        res.data.body &&
        res.data.body[0] &&
        res.data.body[0].custdet &&
        res.data.body[0].custdet[0]
      ) {
        userId = res.data.body[0].custdet[0].mobile;
      }

      return {
        success: true,
        message: "OTP sent successfully to your registered number!",
        userId,
        data: res.data,
      };
    } else {
      return {
        success: false,
        message: res.data.status.err_msg || "Failed to send OTP",
        error: res.data.status.err_msg,
      };
    }
  } catch (error) {
    console.error("OTP Send Error:", error);
    throw error;
  }
};

// Verify OTP
export const verifyOtp = async (phone, otp, deviceInfo = {}) => {
  try {
    const payload = {
      userid: DEFAULT_USER.userid,
      mobile: phone,
      otp: otp,
      ...buildDevicePayload(deviceInfo),
    };

    console.log("Verifying OTP with payload:", payload);
    console.log("OTP entered:", otp);
    console.log("Phone:", phone);

    const res = await axios.post(API_ENDPOINTS.LOGIN_OTP, payload, {
      headers: {
        "Content-Type": "application/json",
        ...DEFAULT_HEADERS,
        ...buildDeviceHeaders(deviceInfo),
      },
    });

    console.log("OTP Verification Response:", res.data);
    console.log("Response Status:", res.status);

    if (res.data.status.err_code === 0) {
      return {
        success: true,
        message: "Login successful!",
        data: res.data,
        deviceInfo: {
          ipAddress: deviceInfo.ipAddress || "Unknown IP",
          macAddress: deviceInfo.macAddress || "Unknown MAC",
        },
      };
    } else {
      const errorMsg = res.data.status.err_msg || "Invalid OTP";
      console.error("API Error:", errorMsg);
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }
  } catch (error) {
    console.error("OTP Verification Error Details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });
    throw error;
  }
};

// Resend OTP
export const resendOtp = async (phone, deviceInfo = {}) => {
  try {
    const payload = {
      userid: DEFAULT_USER.userid,
      mobile: phone,
      ...buildDevicePayload(deviceInfo),
    };

    console.log("Resending OTP with payload:", payload);

    const res = await axios.post(API_ENDPOINTS.LOGIN, payload, {
      headers: {
        ...DEFAULT_HEADERS,
        ...buildDeviceHeaders(deviceInfo),
      },
    });

    console.log("Resend OTP Response:", res.data);

    if (res.data.status.err_code === 0) {
      return {
        success: true,
        message: "OTP resent successfully to your registered number!",
        data: res.data,
      };
    } else {
      return {
        success: false,
        message: res.data.status.err_msg || "Failed to resend OTP",
        error: res.data.status.err_msg,
      };
    }
  } catch (error) {
    console.error("Resend OTP Error:", error);
    throw error;
  }
};

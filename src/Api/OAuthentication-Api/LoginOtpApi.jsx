import axios from "axios";
import { API_ENDPOINTS, DEFAULT_HEADERS, DEFAULT_USER } from "../config";
import { 
  getWebOSSystemInfo, 
  getWebOSDeviceID, 
  getWebOSNetworkInfo, 
  getWebOSMacAddresses 
} from "../../utils/webos";

/**
 * Gather webOS TV device information and send OTP request
 * Collects: modelName, device unique ID, IP address, MAC address from Luna APIs
 */
export const sendOtpWithWebOSInfo = async (phone, options = {}) => {
  try {
    console.log("📱 Gathering webOS device information...");

    // Collect all device information from webOS Luna APIs in parallel
    const [systemInfo, deviceID, networkInfo, macAddresses] = await Promise.all([
      getWebOSSystemInfo(['modelName', 'firmwareVersion', 'sdkVersion', 'boardType']),
      getWebOSDeviceID(),
      getWebOSNetworkInfo(),
      getWebOSMacAddresses(),
    ]);

    // Prepare device details object
    const devdets = {
      brand: "LG",
      model: systemInfo?.modelName || "Unknown",
      mac: macAddresses?.wifiMac || macAddresses?.wiredMac || DEFAULT_HEADERS.devmac,
    };

    // Select the best MAC address (WiFi preferred, then Wired)
    const macAddress = macAddresses?.wifiMac || macAddresses?.wiredMac || DEFAULT_HEADERS.devmac;

    // Build the complete payload
    const payload = {
      userid: options.userid || DEFAULT_USER.userid,
      mobile: phone,
      mac_address: macAddress,
      device_name: deviceID || options.device_name || "LG TV",
      ip_address: networkInfo?.ipv4 || options.ip_address || "124.40.244.233",
      device_type: options.device_type || "LG TV",
      getuserdet: options.getuserdet || "",
      devdets: devdets,
    };

    console.log("✅ Device Information Collected:", {
      modelName: systemInfo?.modelName,
      deviceID: deviceID,
      ipAddress: networkInfo?.ipv4,
      connectionType: networkInfo?.connectionType,
      wifiMac: macAddresses?.wifiMac,
      wiredMac: macAddresses?.wiredMac,
    });

    console.log("📤 Sending OTP request with webOS device info:", payload);

    const res = await axios.post(API_ENDPOINTS.LOGIN, payload, { 
      headers: { ...DEFAULT_HEADERS } 
    });

    console.log("✅ Login API full response:", { 
      status: res.status, 
      headers: res.headers, 
      data: res.data 
    });

    if (res && res.data && res.data.status && res.data.status.err_code === 0) {
      const otpcode = res.data.body && res.data.body[0] ? res.data.body[0].otpcode : null;
      const custdet = res.data.body && res.data.body[0] ? res.data.body[0].custdet : null;

      return {
        success: true,
        message: res.data.status.err_msg || "OTP sent successfully to your registered number!",
        otp: otpcode,
        custdet,
        deviceInfo: {
          modelName: systemInfo?.modelName,
          deviceID: deviceID,
          ipAddress: networkInfo?.ipv4,
          macAddress: macAddress,
        },
        data: res.data,
      };
    }

    return {
      success: false,
      message: (res && res.data && res.data.status && res.data.status.err_msg) || "Failed to send OTP",
      error: res && res.data && res.data.status ? res.data.status.err_msg : "Unknown error",
      data: res ? res.data : null,
    };
  } catch (error) {
    console.error("❌ OTP Send with webOS Info Error:", {
      message: error.message,
      code: error.code,
      responseData: error.response ? error.response.data : null,
      responseStatus: error.response ? error.response.status : null,
    });

    return {
      success: false,
      message: error.response?.data?.status?.err_msg || error.message || "Network error",
      error: error,
      response: error.response?.data || null,
    };
  }
};

// Send OTP to phone number
export const sendOtp = async (phone, options = {}) => {
  try {
    const payload = {
      userid: options.userid || DEFAULT_USER.userid,
      mobile: phone,
      email: options.email || "",
      mac_address: options.mac_address || "26:F2:AE:D8:3F:99",
      device_name: options.device_name || "rk3368_box",
      ip_address: options.ip_address || "124.40.244.233",
      device_type: options.device_type || "FOFI",
    };

    console.log("Sending OTP request with payload:", payload);
    const res = await axios.post(API_ENDPOINTS.LOGIN, payload, { headers: { ...DEFAULT_HEADERS } });
    console.log("OTP API full response:", { status: res.status, headers: res.headers, data: res.data });

    if (res && res.data && res.data.status && res.data.status.err_code === 0) {
      // Try to extract otp code and customer details if present
      const otpcode = res.data.body && res.data.body[0] ? res.data.body[0].otpcode : null;
      const custdet = res.data.body && res.data.body[0] ? res.data.body[0].custdet : null;

      return {
        success: true,
        message: res.data.status.err_msg || "OTP sent successfully to your registered number!",
        otp: otpcode,
        custdet,
        data: res.data,
      };
    }

    return {
      success: false,
      message: (res && res.data && res.data.status && res.data.status.err_msg) || "Failed to send OTP",
      error: res && res.data && res.data.status ? res.data.status.err_msg : "Unknown error",
      data: res ? res.data : null,
    };
  } catch (error) {
    console.error("OTP Send Error:", {
      message: error.message,
      code: error.code,
      responseData: error.response ? error.response.data : null,
      responseStatus: error.response ? error.response.status : null,
      responseHeaders: error.response ? error.response.headers : null,
    });
    // Return a structured failure so callers can display useful info
    return {
      success: false,
      message: error.response?.data?.status?.err_msg || error.message || "Network error",
      error: error,
      response: error.response?.data || null,
    };
  }
};

// Resend OTP
export const resendOtp = async (phone, options = {}) => {
  try {
    const payload = {
      userid: options.userid || DEFAULT_USER.userid,
      mobile: phone,
      email: options.email || "",
      mac_address: options.mac_address || "26:F2:AE:D8:3F:99",
      device_name: options.device_name || "rk3368_box",
      ip_address: options.ip_address || "124.40.244.233",
      device_type: options.device_type || "FOFI",
    };

    console.log("Resending OTP with payload:", payload);

    console.log("Resending OTP with payload:", payload);
    const res = await axios.post(API_ENDPOINTS.RESEND_OTP, payload, { headers: { ...DEFAULT_HEADERS } });
    console.log("Resend OTP full response:", { status: res.status, headers: res.headers, data: res.data });

    if (res.data && res.data.status && res.data.status.err_code === 0) {
      const otpcode = res.data.body && res.data.body[0] ? res.data.body[0].otpcode : null;
      return {
        success: true,
        message: res.data.status.err_msg || "OTP resent successfully to your registered number!",
        otp: otpcode,
        data: res.data,
      };
    }

    return {
      success: false,
      message: (res && res.data && res.data.status && res.data.status.err_msg) || "Failed to resend OTP",
      error: res && res.data && res.data.status ? res.data.status.err_msg : "Unknown error",
      data: res ? res.data : null,
    };
  } catch (error) {
    console.error("Resend OTP Error:", {
      message: error.message,
      responseData: error.response ? error.response.data : null,
      responseStatus: error.response ? error.response.status : null,
    });
    return {
      success: false,
      message: error.response?.data?.status?.err_msg || error.message || "Network error",
      error: error,
      response: error.response?.data || null,
    };
  }
};

// Verify OTP (uses same /login endpoint for verification in this app flow)
export const verifyOtp = async (phone, otp, options = {}) => {
  try {
    const payload = {
      userid: options.userid || DEFAULT_USER.userid,
      mobile: phone,
      otp: otp,
    };

    console.log("Verifying OTP with payload:", payload);

    console.log("Verifying OTP with payload:", payload);
    const res = await axios.post(API_ENDPOINTS.LOGIN, payload, { headers: { ...DEFAULT_HEADERS } });
    console.log("OTP Verification full response:", { status: res?.status, headers: res?.headers, data: res?.data });

    if (res.data && res.data.status && res.data.status.err_code === 0) {
      return {
        success: true,
        message: res.data.status.err_msg || "OTP verified successfully",
        data: res.data,
      };
    }

    return {
      success: false,
      message: (res.data && res.data.status && res.data.status.err_msg) || "Invalid OTP",
      error: res.data && res.data.status ? res.data.status.err_msg : "Unknown error",
    };
  } catch (error) {
    console.error("OTP Verification Error:", {
      message: error.message,
      responseData: error.response ? error.response.data : null,
      responseStatus: error.response ? error.response.status : null,
    });
    return {
      success: false,
      message: error.response?.data?.status?.err_msg || error.message || "Network error",
      error: error,
      response: error.response?.data || null,
    };
  }
};

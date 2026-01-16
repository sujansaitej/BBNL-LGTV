import axios from "axios";
import { API_ENDPOINTS, DEFAULT_HEADERS, DEFAULT_USER } from "../config";

// Send OTP to phone number
export const sendOtp = async (phone) => {
  try {
    const payload = {
      userid: DEFAULT_USER.userid,
      mobile: phone,
    };

    console.log("Sending OTP request with payload:", payload);

    const res = await axios.post(API_ENDPOINTS.LOGIN, payload, {
      headers: {
        ...DEFAULT_HEADERS,
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
export const verifyOtp = async (phone, otp) => {
  try {
    const payload = {
      userid: DEFAULT_USER.userid,
      mobile: phone,
      otp: otp,
    };

    console.log("Verifying OTP with payload:", payload);
    console.log("OTP entered:", otp);
    console.log("Phone:", phone);

    const res = await axios.post(API_ENDPOINTS.LOGIN_OTP, payload, {
      headers: {
        "Content-Type": "application/json",
        ...DEFAULT_HEADERS,
      },
    });

    console.log("OTP Verification Response:", res.data);
    console.log("Response Status:", res.status);

    if (res.data.status.err_code === 0) {
      return {
        success: true,
        message: "Login successful!",
        data: res.data,
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
export const resendOtp = async (phone) => {
  try {
    const payload = {
      userid: DEFAULT_USER.userid,
      mobile: phone,
    };

    console.log("Resending OTP with payload:", payload);

    const res = await axios.post(API_ENDPOINTS.LOGIN, payload, {
      headers: {
        ...DEFAULT_HEADERS,
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

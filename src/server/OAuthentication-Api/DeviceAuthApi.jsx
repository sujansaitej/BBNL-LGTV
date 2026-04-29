/**
 * DeviceAuthApi.jsx — RSA device authentication helpers.
 *
 * Spec rows:
 *   33. /getdeviceid — register the device's RSA public key, receive `devid`.
 *   34. /devAuth     — prove device identity by signing a payload with the
 *                      persisted private key and submitting `hash` (base64
 *                      signature).
 *
 * IMPORTANT — these are MANUAL-TRIGGER ONLY building blocks. Do NOT wire them
 * into the auth pipeline / boot flow until the server team confirms:
 *   - the exact string the client must sign for /devAuth
 *   - the signature algorithm (PKCS1-v1_5 vs PSS) and hash
 *   - the signature transit encoding (base64 std vs base64url)
 * See deviceCrypto.js header comment for full details.
 */

import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";
import {
  exportPublicKeyBase64,
  signPayload,
} from "../../utils/deviceCrypto";

const isFilled = (v) => v !== undefined && v !== null && String(v).length > 0;

/**
 * Register the device's RSA public key with the BBNL backend.
 * Generates a keypair on first call (persisted in IndexedDB).
 *
 * @param {Object} args
 * @param {string} args.userid
 * @param {string} args.mobile
 * @param {string} args.serialno
 * @param {string} args.mac_address
 * @returns {Promise<{success:boolean, devid:(string|null), message:string, data:any}>}
 */
export const registerDevicePubkey = async ({
  userid,
  mobile,
  serialno,
  mac_address,
} = {}) => {
  try {
    if (
      !isFilled(userid) ||
      !isFilled(mobile) ||
      !isFilled(serialno) ||
      !isFilled(mac_address)
    ) {
      return {
        success: false,
        devid: null,
        message: "Missing required fields",
        data: null,
      };
    }

    let pubB64;
    try {
      pubB64 = await exportPublicKeyBase64();
    } catch (cryptoErr) {
      return {
        success: false,
        devid: null,
        message:
          cryptoErr?.message || "Failed to generate/load device keypair",
        data: null,
      };
    }

    const reqBody = {
      userid,
      mobile,
      serialno,
      mac_address,
      pubkey: pubB64,
    };

    const response = await axios.post(API_ENDPOINTS.GET_DEVICE_ID, reqBody, {
      headers: getDefaultHeaders(),
    });

    const data = response?.data;
    const devid = data?.body?.devid || null;
    const errCode = data?.status?.err_code;
    const errMsg = data?.status?.err_msg || "";
    const success = errCode === 0 || errCode === "0";

    return {
      success,
      devid,
      message: errMsg || (success ? "Public key added" : "Request failed"),
      data,
    };
  } catch (error) {
    return {
      success: false,
      devid: null,
      message:
        error?.response?.data?.status?.err_msg ||
        error?.message ||
        "registerDevicePubkey failed",
      data: error?.response?.data || null,
    };
  }
};

/**
 * Sign a payload string with the persisted device private key and submit it
 * to /devAuth as `hash`.
 *
 * If `payload` is not supplied, defaults to `${userid}|${devid}|${Date.now()}`
 * — this is a SYNTHETIC string for development only. The backend has not yet
 * confirmed what payload format /devAuth expects (likely a server-issued
 * nonce). The chosen string is returned in `signedPayload` so the caller can
 * inspect / log it for debugging.
 *
 * @param {Object} args
 * @param {string} args.userid
 * @param {string} args.mobile
 * @param {string} args.devid
 * @param {string} args.mac_address
 * @param {string} [args.payload] - exact UTF-8 string to sign
 * @returns {Promise<{success:boolean, message:string, signedPayload:string, signature:string|null, data:any}>}
 */
export const verifyDeviceSignature = async ({
  userid,
  mobile,
  devid,
  mac_address,
  payload,
} = {}) => {
  try {
    if (
      !isFilled(userid) ||
      !isFilled(mobile) ||
      !isFilled(devid) ||
      !isFilled(mac_address)
    ) {
      return {
        success: false,
        message: "Missing required fields",
        signedPayload: typeof payload === "string" ? payload : "",
        signature: null,
        data: null,
      };
    }

    const stringToSign =
      typeof payload === "string" && payload.length > 0
        ? payload
        : `${userid}|${devid}|${Date.now()}`;

    let signatureB64;
    try {
      signatureB64 = await signPayload(stringToSign);
    } catch (cryptoErr) {
      return {
        success: false,
        message:
          cryptoErr?.message || "Failed to sign payload with device key",
        signedPayload: stringToSign,
        signature: null,
        data: null,
      };
    }

    const reqBody = {
      userid,
      mobile,
      devid,
      mac_address,
      hash: signatureB64,
    };

    const response = await axios.post(API_ENDPOINTS.DEV_AUTH, reqBody, {
      headers: getDefaultHeaders(),
    });

    const data = response?.data;
    const errCode = data?.status?.err_code;
    const errMsg = data?.status?.err_msg || "";
    const success = errCode === 0 || errCode === "0";

    return {
      success,
      message: errMsg || (success ? "Device Authorised" : "Request failed"),
      signedPayload: stringToSign,
      signature: signatureB64,
      data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error?.response?.data?.status?.err_msg ||
        error?.message ||
        "verifyDeviceSignature failed",
      signedPayload:
        typeof payload === "string" && payload.length > 0 ? payload : "",
      signature: null,
      data: error?.response?.data || null,
    };
  }
};

const DeviceAuthApi = { registerDevicePubkey, verifyDeviceSignature };
export default DeviceAuthApi;

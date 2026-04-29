import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

/**
 * Upload diagnostic logs (zip) to /ottlogs.
 *
 * Spec contract (BBNL-IPTV row 32):
 *   POST multipart/form-data fields:
 *     - userid       (mandatory)
 *     - mac_address  (mandatory)
 *     - mobileno     (mandatory)
 *     - logfile      (mandatory; zip blob)
 *     - ip_address
 *
 * Positive: { status: { err_code: 0, err_msg: "Log file uploaded successfully" } }
 * Negative err_msgs include "Failed to authenticate", "Please input required values",
 * "Invalid User ID", "User ID Deactivated!", "Sorry, only zip files are allowed",
 * "Error while uploading logs".
 *
 * @param {Object}  args
 * @param {string}  args.userid
 * @param {string}  args.mobile
 * @param {string}  args.mac_address
 * @param {string}  [args.ip_address]
 * @param {Blob}    args.logBlob       Zip blob/File of the diagnostic bundle
 * @param {string}  [args.filename="ott_log.zip"]
 * @returns {Promise<{success:boolean, message:string, data:any}>}
 */
export const uploadOttLogs = async ({
  userid,
  mobile,
  mac_address,
  ip_address,
  logBlob,
  filename = "ott_log.zip",
} = {}) => {
  // Mandatory field validation
  if (!userid || !mobile || !mac_address || !logBlob) {
    return {
      success: false,
      message: "Missing mandatory fields",
      data: null,
    };
  }

  // Best-effort zip-content validation
  const looksLikeZip =
    (logBlob && logBlob.type === "application/zip") ||
    (typeof filename === "string" && /\.zip$/i.test(filename));

  if (!looksLikeZip) {
    return {
      success: false,
      message: "Only zip files allowed",
      data: null,
    };
  }

  try {
    const fd = new FormData();
    fd.append("userid", userid || "");
    fd.append("mac_address", mac_address || "");
    fd.append("mobileno", mobile || "");
    fd.append("ip_address", ip_address || "");
    fd.append("logfile", logBlob, filename);

    // Mirror Applock.jsx style: spread getDefaultHeaders().
    // Override Content-Type so axios' multipart-boundary handling kicks in
    // (axios deletes a "multipart/form-data" header without boundary and
    // re-applies the correct one for FormData payloads).
    const response = await axios.post(API_ENDPOINTS.OTT_LOGS, fd, {
      headers: {
        ...getDefaultHeaders(),
        "Content-Type": "multipart/form-data",
      },
    });

    const errCode = response?.data?.status?.err_code;
    const errMsg = response?.data?.status?.err_msg;
    const ok = errCode === 0;

    return {
      success: ok,
      message: errMsg || (ok ? "Log file uploaded successfully" : "Log upload failed"),
      data: response?.data || null,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error?.response?.data?.status?.err_msg ||
        error?.message ||
        "Error while uploading logs",
      data: error?.response?.data || null,
    };
  }
};

export default uploadOttLogs;

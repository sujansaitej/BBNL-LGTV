import axios from "axios";
import { fetchDeviceInfo } from "../utils/deviceInfo";
import { API_BASE_URL_PROD, DEFAULT_HEADERS } from "../config";

const api = axios.create({
  baseURL: API_BASE_URL_PROD,
  timeout: 10000,
});

// Add request interceptor to include the same auth headers as LoginOtp
api.interceptors.request.use(
  async (config) => {
    // Fetch device info and add all device headers
    const deviceInfo = await fetchDeviceInfo();
    
    config.headers["Authorization"] = DEFAULT_HEADERS.Authorization;
    if (deviceInfo?.ipAddress) config.headers["devip"] = deviceInfo.ipAddress;
    if (deviceInfo?.macAddress) config.headers["devmac"] = deviceInfo.macAddress;
    if (deviceInfo?.serialNumber) config.headers["devslno"] = deviceInfo.serialNumber;
    if (deviceInfo?.deviceId) config.headers["devid"] = deviceInfo.deviceId;
    if (deviceInfo?.modelName) config.headers["devmodel"] = deviceInfo.modelName;

    console.log("[IPTV Ads API] Request:", {
      url: config.baseURL + config.url,
      method: config.method,
      contentType: config.headers["Content-Type"],
      hasAuthHeaders: !!config.headers["Authorization"],
      payload: config.data,
    });
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    // console.log("[IPTV Ads API] Response:", response.data);
    return response;
  },
  (error) => {
    console.error("[IPTV Ads API] Error:", {
      message: error.message,
      response: error.response?.data,
    });
    return Promise.reject(error);
  }
);

const postJson = async (payload, config) => {
  return api.post("/iptvads", payload, {
    ...config,
    headers: { "Content-Type": "application/json", ...config?.headers },
  });
};

const postForm = async (payload, config) => {
  const form = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  return api.post("/iptvads", form, {
    ...config,
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...config?.headers },
  });
};

export const fetchIptvAds = async ({
  userid,
  mobile,
  ip_address,
  mac_address,
  adclient,
  srctype,
  displayarea,
  displaytype = "",
  signal,
  withCredentials = false,
  preferForm = false,
}) => {
  if (!mobile) {
    throw new Error("Missing required field: mobile");
  }

  let resolvedIp = ip_address;
  let resolvedMac = mac_address;

  if (!resolvedIp || !resolvedMac) {
    try {
      const info = await fetchDeviceInfo();
      resolvedIp = resolvedIp || info?.ipAddress || null;
      resolvedMac = resolvedMac || info?.macAddress || null;
    } catch (err) {
      console.warn("[IPTV Ads API] Device info unavailable", err);
    }
  }

  const payload = {
    userid: userid || "testiser1",
    mobile,
    adclient: adclient || "fofi",
    srctype: srctype || "image",
    displayarea: displayarea || "homepage",
    displaytype: displaytype || "",
  };

  // Include network identifiers only if available (webOS) to avoid simulator errors
  if (resolvedIp) payload.ip_address = resolvedIp;
  if (resolvedMac) payload.mac_address = resolvedMac;

//   console.log("[IPTV Ads API] Payload being sent:", payload);

  const resolvedHeaders = {
    ...(resolvedMac ? { devmac: resolvedMac } : {}),
  };

  const config = { 
    signal, 
    withCredentials: true,
    headers: resolvedHeaders,
  };

  const doRequest = preferForm ? postForm : postJson;
  let data;
  try {
    ({ data } = await doRequest(payload, config));
  } catch (e) {
    console.warn("[IPTV Ads API] First attempt failed, retrying with alternate format:", e.message);
    // If JSON failed, try form-encoded; if form failed, try JSON
    const alternateRequest = preferForm ? postJson : postForm;
    ({ data } = await alternateRequest(payload, config));
  }

  const errCode = data?.status?.err_code;
  if (errCode !== 0) {
    const msg = data?.status?.err_msg || "Unknown error";
    const error = new Error(msg);
    error.code = errCode;
    error.response = data;
    // console.error("[IPTV Ads API] Server error:", msg);
    throw error;
  }

  const items = Array.isArray(data?.body) ? data.body : [];
//   console.log("[IPTV Ads API] Ad URLs received:", items);
  return items.map((i) => i.adpath).filter(Boolean);
};


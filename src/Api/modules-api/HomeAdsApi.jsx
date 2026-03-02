import axios from "axios";
import { API_BASE_URL_PROD, getDefaultHeaders } from "../config";

const api = axios.create({
  baseURL: API_BASE_URL_PROD,
  timeout: 10000,
});

// Add request interceptor to include auth headers
api.interceptors.request.use(
  async (config) => {
    const headers = getDefaultHeaders();
    config.headers["Authorization"] = headers.Authorization;
    config.headers["devmac"] = headers.devmac;
    config.headers["devslno"] = headers.devslno;
    config.headers["deviceID"] = headers.deviceID;

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

  const payload = {
    userid: userid || "testiser1",
    mobile,
    adclient: adclient || "fofi",
    srctype: srctype || "image",
    displayarea: displayarea || "homepage",
    displaytype: displaytype || "",
  };

//   console.log("[IPTV Ads API] Payload being sent:", payload);

  const config = { 
    signal, 
    withCredentials: true,
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


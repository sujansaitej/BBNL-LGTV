import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

// Verified against the BBNL test backend on 2026-04-29: this endpoint requires
// application/x-www-form-urlencoded — JSON returns "Invalid User ID" even for a
// valid user. Also, the response `body` is a single object (not an array as the
// spec example suggests), with these keys:
// userid, op_id, fname, lname, mobile, email, address, provider, provider_compname,
// usertype, platform, addresby (object).
export const fetchPrimaryCustDet = async ({ userid } = {}) => {
  const id = String(userid || "").trim();

  if (!id) {
    return {
      success: false,
      message: "userid required",
      customer: null,
      data: null,
    };
  }

  try {
    const form = new URLSearchParams();
    form.append("userid", id);

    const response = await axios.post(
      API_ENDPOINTS.PRIMARY_CUST_DET,
      form,
      {
        headers: {
          ...getDefaultHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const ok = response?.data?.status?.err_code === 0;
    const body = response?.data?.body;
    // Server returns body as object on success, [] on error — normalise to object|null.
    const customer = body && !Array.isArray(body) ? body : null;

    return {
      success: ok,
      message:
        response?.data?.status?.err_msg ||
        (ok ? "Data Fetched" : "Primary customer fetch failed"),
      customer,
      data: response?.data || null,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error?.response?.data?.status?.err_msg ||
        error?.message ||
        "Primary customer API error",
      customer: null,
      data: error?.response?.data || null,
    };
  }
};

export default fetchPrimaryCustDet;

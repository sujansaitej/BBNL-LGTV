import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

export const postTrpData = async ({ mobile, ip_address }) => {
	const payload = {
		mobile: String(mobile || "").trim(),
		ip_address: String(ip_address || "").trim(),
	};

	if (!payload.mobile || !payload.ip_address) {
		return {
			success: false,
			message: "Missing mobile or ip_address for TRP data",
			data: null,
		};
	}

	try {
		const response = await axios.post(API_ENDPOINTS.TRP_DATA, payload, {
			headers: getDefaultHeaders(),
		});

		const ok = response?.data?.status?.err_code === 0;
		return {
			success: ok,
			message: response?.data?.status?.err_msg || (ok ? "TRP submitted" : "TRP submit failed"),
			data: response?.data || null,
		};
	} catch (error) {
		return {
			success: false,
			message:
				error?.response?.data?.status?.err_msg ||
				error?.message ||
				"TRP API error",
			data: error?.response?.data || null,
			error,
		};
	}
};

export default postTrpData;

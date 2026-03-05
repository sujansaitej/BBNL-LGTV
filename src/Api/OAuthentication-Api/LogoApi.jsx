import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

export const fetchLoginLogo = async (payload = {}) => {
	try {
		const reqBody = {
			device_type: payload.device_type || "LG TV",
			device_name: payload.device_name || "LG TV",
		};

		const response = await axios.post(API_ENDPOINTS.LOGO, reqBody, {
			headers: getDefaultHeaders(),
		});

		if (response?.data?.status?.err_code === 0) {
			return {
				success: true,
				logoPath: response?.data?.body?.logo_path || "",
				message: response?.data?.status?.err_msg || "Logo available",
				data: response?.data,
			};
		}

		return {
			success: false,
			logoPath: "",
			message: response?.data?.status?.err_msg || "Logo not available",
			data: response?.data,
		};
	} catch (error) {
		return {
			success: false,
			logoPath: "",
			message: error?.response?.data?.status?.err_msg || error?.message || "Logo API error",
			error,
			data: error?.response?.data || null,
		};
	}
};

export default fetchLoginLogo;

// No need for fetchImageViaPost - image URLs from API can be used directly with GET
// The errorimages API returns direct image file URLs that support standard GET requests

export const fetchLoginBackground = async () => {
	try {
		console.log("[LoginBG] Starting fetchLoginBackground...");
		// Use placeholder mobile for login page (before user enters phone)
		const mobile = localStorage.getItem("userPhone") || "0000000000";
		const requestPayload = {
			userid: "lgiptv",
			mobile,
			device_type: "LG TV",
			mac_address: "",
			device_name: "LG TV",
			app_package: "com.lgiptv.bbnl",
		};
		
		const response = await axios.post(
			API_ENDPOINTS.ERROR_IMAGES,
			requestPayload,
			{ headers: getDefaultHeaders() }
		);

		console.log("[LoginBG] API endpoint:", API_ENDPOINTS.ERROR_IMAGES);
		console.log("[LoginBG] Request payload:", requestPayload);
		console.log("[LoginBG] Raw response status:", response?.status);
		console.log("[LoginBG] Raw response data:", response?.data);

		// Check for API error response
		if (response?.data?.status?.err_code !== 0) {
			console.error("[LoginBG] API returned error:", response?.data?.status);
			return { success: false, bgUrl: "" };
		}

		const errImgs = response?.data?.errImgs || [];
		console.log("[LoginBG] errImgs array:", errImgs);
		
		const bgItem = errImgs.find((item) =>
			Object.prototype.hasOwnProperty.call(item, "LG_IPTV_LOGIN_BG")
		);
		const bgUrl = bgItem?.LG_IPTV_LOGIN_BG;

		console.log("[LoginBG] Found bgItem:", bgItem);
		console.log("[LoginBG] Found LG_IPTV_LOGIN_BG URL:", bgUrl);

		if (bgUrl) {
			console.log("[LoginBG] SUCCESS - Image URL from API:", bgUrl);
			console.log("[LoginBG] Image will be fetched via GET request from browser");
			// Return the image URL directly - browser will fetch it via GET
			return { success: true, bgUrl };
		}
		console.log("[LoginBG] FAIL - No bgUrl found, will use fallback");
		return { success: false, bgUrl: "" };
	} catch (error) {
		console.error("[LoginBG] fetchLoginBackground error:", error?.message);
		console.error("[LoginBG] Error response:", error?.response?.data);
		console.error("[LoginBG] Error details:", error);
		return { success: false, bgUrl: "" };
	}
};

export const fetchComingSoonImage = async (imageKey = "COMING_SOON_FAVORITES") => {
	try {
		const mobile = localStorage.getItem("userPhone") || "0000000000";
		const requestPayload = {
			userid: "lgiptv",
			mobile,
			device_type: "LG TV",
			mac_address: "",
			device_name: "LG TV",
			app_package: "com.lgiptv.bbnl",
		};
		
		const response = await axios.post(
			API_ENDPOINTS.ERROR_IMAGES,
			requestPayload,
			{ headers: getDefaultHeaders() }
		);

		const errImgs = response?.data?.errImgs || [];
		const imageItem = errImgs.find((item) =>
			Object.prototype.hasOwnProperty.call(item, imageKey)
		);
		const imageUrl = imageItem?.[imageKey];

		if (imageUrl) {
			console.log(`[${imageKey}] SUCCESS - Image URL from API:`, imageUrl);
			console.log(`[${imageKey}] Image will be fetched via GET request from browser`);
			// Return the image URL directly - browser will fetch it via GET
			return { success: true, imageUrl };
		}
		return { success: false, imageUrl: "" };
	} catch (error) {
		console.error(`[${imageKey}] Fetch error:`, error);
		return { success: false, imageUrl: "" };
	}
};

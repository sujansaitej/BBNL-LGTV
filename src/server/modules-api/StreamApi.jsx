import axios from "axios";
import { API_ENDPOINTS, getDefaultHeaders } from "../config";

/**
 * On-demand stream-link refresh helper (BBNL spec row 15 — POST /stream).
 *
 * Used as a FALLBACK only — when the cached `streamlink` from `/chnl_data`
 * fails to play (e.g. the URL has expired). Do NOT call this on the happy
 * path; the player should always prefer the cached URL first.
 *
 * Body: { userid, mobile, chid, chno, ip_address, mac_address }
 *   - At least one of `chid` / `chno` is required.
 *   - `userid`, `mobile`, `mac_address` are mandatory.
 *   - Missing `ip_address` is a soft warning — pass empty string.
 *
 * Positive response shape:
 *   { body: [{ stream: [{ chid, bcid, grid, langid, chtitle, chlogo,
 *                          streamlink, ... }] }],
 *     status: { err_code: 0 } }
 *
 * Negative err_msgs from server: "Failed to authenticate",
 * "Invalid User ID", "Channel unavailable".
 *
 * Never throws — returns `{ success, streamlink, message, data }`.
 */
export const fetchFreshStream = async ({
	userid,
	mobile,
	chid,
	chno,
	ip_address,
	mac_address,
} = {}) => {
	// MAC fallback chain: caller's value → pinned device ID (raw, not "TV-"
	// prefixed) → empty string. We let the server make the final call on
	// whether an empty/fallback mac_address is acceptable, rather than
	// short-circuiting client-side. Some TVs (dev mode, restricted Luna
	// permissions, slow MAC API resolution) never expose MAC to the JS
	// runtime — refusing to call /stream there meant the seamless-relay
	// path was effectively dead on those devices.
	let resolvedMac = String(mac_address || "").trim();
	if (!resolvedMac && typeof localStorage !== "undefined") {
		const pinned = localStorage.getItem("lgtv_device_id_pinned") || "";
		if (pinned) resolvedMac = pinned;
	}

	const payload = {
		userid: String(userid || "").trim(),
		mobile: String(mobile || "").trim(),
		chid: chid != null ? String(chid).trim() : "",
		chno: chno != null ? String(chno).trim() : "",
		ip_address: String(ip_address || "").trim(),
		mac_address: resolvedMac,
	};

	// Hard-required: userid + mobile (no fallback exists for these).
	if (!payload.userid || !payload.mobile) {
		return {
			success: false,
			streamlink: null,
			message: "Missing required field (userid / mobile)",
			data: null,
		};
	}

	// At least one of chid / chno required.
	if (!payload.chid && !payload.chno) {
		return {
			success: false,
			streamlink: null,
			message: "Either chid or chno must be provided",
			data: null,
		};
	}

	if (!payload.mac_address) {
		console.warn("[StreamApi] /stream called without mac_address — server may reject");
	}
	if (!payload.ip_address) {
		console.warn("[StreamApi] /stream called without ip_address");
	}

	try {
		const response = await axios.post(API_ENDPOINTS.STREAM, payload, {
			headers: getDefaultHeaders(),
		});

		const ok = response?.data?.status?.err_code === 0;
		const streamlink =
			response?.data?.body?.[0]?.stream?.[0]?.streamlink || null;

		return {
			success: ok && !!streamlink,
			streamlink,
			message:
				response?.data?.status?.err_msg ||
				(ok ? "Fresh stream URL fetched" : "Stream refresh failed"),
			data: response?.data || null,
		};
	} catch (error) {
		return {
			success: false,
			streamlink: null,
			message:
				error?.response?.data?.status?.err_msg ||
				error?.message ||
				"Stream API error",
			data: error?.response?.data || null,
			error,
		};
	}
};

export default fetchFreshStream;

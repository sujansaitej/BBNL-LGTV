import { DEFAULT_HEADERS } from "../Api/config";

export const postJson = async (url, payload, headers = {}) => {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...DEFAULT_HEADERS,
			...headers,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	return response.json();
};

export const postForm = async (url, payload, headers = {}) => {
	const form = new URLSearchParams();
	Object.entries(payload).forEach(([k, v]) => {
		if (v !== undefined && v !== null) form.append(k, String(v));
	});

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			...DEFAULT_HEADERS,
			...headers,
		},
		body: form.toString(),
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	return response.json();
};

export const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export const buildAuthPayload = (phone, options = {}) => ({
	userid: options.userid,
	mobile: phone,
	email: options.email || "",
	mac_address: options.mac_address || "26:F2:AE:D8:3F:99",
	device_name: options.device_name || "rk3368_box",
	ip_address: options.ip_address || "124.40.244.233",
	device_type: options.device_type || "FOFI",
});

import { getDefaultHeaders } from "../Api/config";

export const postJson = async (url, payload, headers = {}) => {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			...getDefaultHeaders(),
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
			...getDefaultHeaders(),
			"Content-Type": "application/x-www-form-urlencoded",
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
	mobile: phone,
	email: options.email || "",
	device_name: options.device_name || "LG TV",
	ip_address: options.ip_address || "",
	device_type: options.device_type || "LG TV",
	getuserdet: options.getuserdet || "",
	devdets: options.devdets || { brand: "LG", model: "", mac: "" },
});

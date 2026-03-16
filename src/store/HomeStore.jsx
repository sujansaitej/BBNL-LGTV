import axios from "axios";
import { getDefaultHeaders } from "../server/config";

export const postJson = async (url, payload, extraHeaders = {}) => {
	const response = await axios.post(url, payload, {
		headers: {
			...getDefaultHeaders(),
			...extraHeaders,
		},
	});
	return response.data;
};

export const postForm = async (url, payload, extraHeaders = {}) => {
	const form = new URLSearchParams();
	Object.entries(payload).forEach(([k, v]) => {
		if (v !== undefined && v !== null) form.append(k, String(v));
	});

	const response = await axios.post(url, form, {
		headers: {
			...getDefaultHeaders(),
			"Content-Type": "application/x-www-form-urlencoded",
			...extraHeaders,
		},
	});
	return response.data;
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

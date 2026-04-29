
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import { isSubscribed } from "../../utils/subscription";

// Fetch channel categories
export const fetchCategories = async (payload, headers) => {
	const res = await axios.post(
		API_ENDPOINTS.CHANNEL_CATEGORIES,
		payload,
		{ headers }
	);
	const apiCategories = res?.data?.body?.[0]?.categories || [];
	return apiCategories.map((c) => ({
		title: c.grtitle,
		grid: c.grid,
	}));
};

// Fetch channels
export const fetchChannels = async (payload, headers, setError) => {
	const res = await axios.post(
		API_ENDPOINTS.CHANNEL_DATA,
		payload,
		{ headers }
	);
	if (res?.data?.status?.err_code !== 0) {
		const errMsg = res?.data?.status?.err_msg || "Failed to load channels";
		if (setError) setError(`${errMsg} - Please ensure you've logged in with a valid mobile number.`);
		return [];
	}
	
	// Mirror the LiveChannelsStore filter so any future caller of this helper
	// gets the same subscribed-only contract.
	const all = Array.isArray(res?.data?.body) ? res.data.body : [];
	return all.filter(isSubscribed);
};

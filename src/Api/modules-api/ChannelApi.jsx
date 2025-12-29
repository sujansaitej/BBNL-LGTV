
import axios from "axios";

// Fetch channel categories
export const fetchCategories = async (payload, headers) => {
	const res = await axios.post(
		"http://124.40.244.211/netmon/cabletvapis/chnl_categlist",
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
		"http://124.40.244.211/netmon/cabletvapis/chnl_data",
		payload,
		{ headers }
	);
	if (res?.data?.status?.err_code !== 0) {
		const errMsg = res?.data?.status?.err_msg || "Failed to load channels";
		if (setError) setError(`${errMsg} - Please ensure you've logged in with a valid mobile number.`);
		return [];
	}
	return res?.data?.body || [];
};

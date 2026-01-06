
import axios from "axios";
import { API_ENDPOINTS, DEFAULT_HEADERS } from "../config";

// Helper to build complete device headers
const buildDeviceHeaders = (deviceInfo) => {
  const meta = {
    Authorization: DEFAULT_HEADERS.Authorization,
  };
  if (deviceInfo?.ipAddress) meta.devip = deviceInfo.ipAddress;
  if (deviceInfo?.macAddress) meta.devmac = deviceInfo.macAddress;
  if (deviceInfo?.serialNumber) meta.devslno = deviceInfo.serialNumber;
  if (deviceInfo?.deviceId) meta.devid = deviceInfo.deviceId;
  if (deviceInfo?.modelName) meta.devmodel = deviceInfo.modelName;
  return meta;
};

// Fetch channel categories
export const fetchCategories = async (payload, headers, deviceInfo = {}) => {
	const completeHeaders = { ...buildDeviceHeaders(deviceInfo), ...headers };
	const res = await axios.post(
		API_ENDPOINTS.CHANNEL_CATEGORIES,
		payload,
		{ headers: completeHeaders }
	);
	const apiCategories = res?.data?.body?.[0]?.categories || [];
	return apiCategories.map((c) => ({
		title: c.grtitle,
		grid: c.grid,
	}));
};

// Fetch channels
export const fetchChannels = async (payload, headers, setError, deviceInfo = {}) => {
	const completeHeaders = { ...buildDeviceHeaders(deviceInfo), ...headers };
	const res = await axios.post(
		API_ENDPOINTS.CHANNEL_DATA,
		payload,
		{ headers: completeHeaders }
	);
	if (res?.data?.status?.err_code !== 0) {
		const errMsg = res?.data?.status?.err_msg || "Failed to load channels";
		if (setError) setError(`${errMsg} - Please ensure you've logged in with a valid mobile number.`);
		return [];
	}
	
	const channels = res?.data?.body || [];
	return channels;
};

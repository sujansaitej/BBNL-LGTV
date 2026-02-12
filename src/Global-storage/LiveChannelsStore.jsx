import { create } from "zustand";

import { API_ENDPOINTS } from "../Api/config";
import { nowMs, postJson } from "./HomeStore";

const CHANNELS_TTL_MS = 30 * 60 * 1000;
const CATEGORIES_TTL_MS = 2 * 60 * 60 * 1000;

const buildChannelsKey = (payload) => {
	const user = payload?.userid || "";
	const mobile = payload?.mobile || "";
	const grid = payload?.grid || "";
	return `${user}|${mobile}|${grid}`;
};

const buildChannelMaps = (channels = []) => {
	const byNumber = {};
	const byId = {};
	channels.forEach((ch) => {
		const num = (ch.channelno || ch.channel_no || ch.chno || ch.channelNumber || ch.channelid || ch.chid || "").toString().trim();
		if (num) byNumber[num] = ch;
		if (ch.channelid) byId[String(ch.channelid)] = ch;
		if (ch.chid) byId[String(ch.chid)] = ch;
	});
	return { byNumber, byId };
};

const useLiveChannelsStore = create((set, get) => ({
	categories: [],
	categoriesLoadedAt: 0,
	isLoadingCategories: false,
	channelsCache: {},
	error: "",
	metrics: {
		categoriesFetchMs: 0,
	},

	clearError: () => set({ error: "" }),

	getCachedEntry: (payload) => {
		const key = buildChannelsKey(payload);
		return get().channelsCache[key];
	},

	getChannelByNumber: (payload, value) => {
		const key = buildChannelsKey(payload);
		const entry = get().channelsCache[key];
		if (!entry?.byNumber) return null;
		const trimmed = (value || "").toString().trim();
		return entry.byNumber[trimmed] || null;
	},

	fetchCategories: async (payload, options = {}) => {
		const { force = false } = options;
		const state = get();
		const isFresh =
			state.categoriesLoadedAt &&
			Date.now() - state.categoriesLoadedAt < CATEGORIES_TTL_MS &&
			state.categories.length > 0;

		if (!force && (isFresh || state.isLoadingCategories)) {
			return state.categories;
		}

		set({ isLoadingCategories: true, error: "" });
		const startedAt = nowMs();

		try {
			const data = await postJson(API_ENDPOINTS.CHANNEL_CATEGORIES, payload);
			const apiCategories = data?.body?.[0]?.categories || [];
			const formatted = apiCategories.map((c) => ({
				title: c.grtitle,
				grid: c.grid,
			}));

			set((prev) => ({
				categories: formatted,
				categoriesLoadedAt: Date.now(),
				isLoadingCategories: false,
				metrics: {
					...prev.metrics,
					categoriesFetchMs: Math.round(nowMs() - startedAt),
				},
			}));

			return formatted;
		} catch (err) {
			set({
				isLoadingCategories: false,
				error: "Failed to load categories",
			});
			return [];
		}
	},

	fetchChannels: async (payload, options = {}) => {
		const { force = false } = options;
		const state = get();
		const key = options.key || buildChannelsKey(payload);
		const entry = state.channelsCache[key];
		const isFresh =
			entry?.loadedAt &&
			Date.now() - entry.loadedAt < CHANNELS_TTL_MS &&
			(entry.data?.length || 0) > 0;

		if (!force && (isFresh || entry?.isLoading)) {
			return entry?.data || [];
		}

		set((prev) => ({
			channelsCache: {
				...prev.channelsCache,
				[key]: {
					...(prev.channelsCache[key] || {}),
					isLoading: true,
					error: "",
				},
			},
			error: "",
		}));

		const startedAt = nowMs();

		try {
			const data = await postJson(API_ENDPOINTS.CHANNEL_DATA, payload);
			if (data?.status?.err_code !== 0) {
				const errMsg = data?.status?.err_msg || "Failed to load channels";
				set((prev) => ({
					channelsCache: {
						...prev.channelsCache,
						[key]: {
							...(prev.channelsCache[key] || {}),
							isLoading: false,
							error: `${errMsg} - Please ensure you've logged in with a valid mobile number.`,
						},
					},
					error: `${errMsg} - Please ensure you've logged in with a valid mobile number.`,
				}));
				return [];
			}

			const channels = data?.body || [];
			const maps = buildChannelMaps(channels);
			set((prev) => ({
				channelsCache: {
					...prev.channelsCache,
					[key]: {
						data: channels,
						count: Array.isArray(channels) ? channels.length : 0,
						loadedAt: Date.now(),
						isLoading: false,
						error: "",
						fetchMs: Math.round(nowMs() - startedAt),
						byNumber: maps.byNumber,
						byId: maps.byId,
					},
				},
			}));

			return channels;
		} catch (err) {
			set((prev) => ({
				channelsCache: {
					...prev.channelsCache,
					[key]: {
						...(prev.channelsCache[key] || {}),
						isLoading: false,
						error: "Failed to load channels - Network error or invalid credentials.",
					},
				},
				error: "Failed to load channels - Network error or invalid credentials.",
			}));
			return [];
		}
	},
}));

export default useLiveChannelsStore;

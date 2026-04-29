// Tolerant subscription check. The chnl_data API has historically returned
// the subscribed flag as different shapes across operator backends ("yes",
// "YES", "1", "true", with stray whitespace, sometimes under
// is_subscribed / subscribe_status instead). Treat all of these as truthy
// so the "Subscribed Channels" view stays in sync with the player sidebar.
export const isSubscribed = (channel) => {
  const raw = channel?.subscribed ?? channel?.is_subscribed ?? channel?.subscribe_status;
  if (raw === undefined || raw === null) return false;
  const v = String(raw).trim().toLowerCase();
  return v === "yes" || v === "y" || v === "1" || v === "true" || v === "subscribed";
};

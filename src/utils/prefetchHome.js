import useLiveChannelsStore from "../store/LiveChannelsStore";
import useLanguageStore from "../store/LivePlayersStore";
import useHomeAdsStore from "../store/ChannelsSearchStore";
import useOttAppsStore from "../store/OttAppsStore";

const ADS_DEFAULTS = {
  adclient: "fofi",
  srctype: "image",
  displayarea: "homepage",
  displaytype: "multiple",
};

export const prefetchHomeData = ({ userid, mobile, ip_address = "" } = {}) => {
  if (!mobile) return;

  const channels = useLiveChannelsStore.getState();
  const languages = useLanguageStore.getState();
  const ads = useHomeAdsStore.getState();
  const apps = useOttAppsStore.getState();

  const ignore = () => {};
  channels.fetchChannels({ userid, mobile }).catch(ignore);
  // Warm the all-channels cache (grid:"") used by the in-player ChannelsSidebar.
  // Same /channelData call but with no grid filter so the sidebar can do its
  // tab/category filtering entirely client-side. Cache key uses trailing pipe.
  channels.fetchChannels({ userid, mobile, grid: "" }, { key: `${userid}|${mobile}|` }).catch(ignore);
  channels.fetchCategories({ userid, mobile }).catch(ignore);
  languages.fetchLanguages({ userid, mobile }).catch(ignore);
  ads.fetchAds({ userid, mobile, ...ADS_DEFAULTS }, { preferForm: false }).catch(ignore);
  apps.fetchApps({ userid, mobile, ip_address }).catch(ignore);
};

export default prefetchHomeData;

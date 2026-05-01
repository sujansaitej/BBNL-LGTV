// Navigation service for /player.
//
// MemoryRouter has a real in-memory history stack, but the app's BACK key
// handlers (App.js GlobalBackHandler + LivePlayer's own cascade) used to
// hard-code `navigate('/home')`, which discarded the originating screen and
// its filter state. The user-visible bug: Home → LiveChannels (e.g. "Sports"
// category) → /player → BACK landed on /home instead of returning to the
// Sports list.
//
// goToPlayer stamps the calling pathname + state into player route state.
// backFromPlayer reads them on dismiss and navigates the user back to that
// exact screen, restoring its filter state. Falls back to /home only when
// there is no origin (cold-launch autoplay, deep-link, etc.).

const PLAYER_PATH = '/player';
const HOME_PATH = '/home';

const getStreamUrl = (channel) => {
  if (!channel) return '';
  return (
    channel.streamlink || channel.stream_link || channel.streamurl ||
    channel.stream_url || channel.url || channel.link ||
    channel.videourl || channel.video_url || channel.hlsurl ||
    channel.hls_url || channel.manifest || channel.manifesturl || ''
  );
};

export const goToPlayer = (navigate, location, channel, extra = {}) => {
  const fromPath = location?.pathname || '';
  const fromState = location?.state || null;
  // Don't stamp /player as its own origin — protects against in-player
  // re-navigation (would otherwise loop on BACK).
  const origin = fromPath && fromPath !== PLAYER_PATH ? fromPath : '';
  // If the previous screen was already the player's origin (user is bouncing
  // between routes), inherit its origin chain so BACK still escapes the loop.
  const inheritedOrigin = fromState?.origin && fromPath === PLAYER_PATH ? fromState.origin : '';
  const inheritedOriginState = fromState?.originState && fromPath === PLAYER_PATH ? fromState.originState : null;

  navigate(PLAYER_PATH, {
    state: {
      streamlink: getStreamUrl(channel),
      title: channel?.chtitle || extra.title || '',
      channelData: channel,
      origin: origin || inheritedOrigin,
      originState: origin ? fromState : inheritedOriginState,
      ...extra,
    },
  });
};

export const backFromPlayer = (navigate, locationState) => {
  const { origin, originState } = locationState || {};
  if (origin && origin !== PLAYER_PATH) {
    navigate(origin, { state: originState, replace: true });
    return;
  }
  navigate(HOME_PATH, { replace: true });
};

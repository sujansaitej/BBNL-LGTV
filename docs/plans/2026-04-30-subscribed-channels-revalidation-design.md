# Subscribed Channels Revalidation — Design

**Date:** 2026-04-30
**Status:** Approved, ready for implementation
**Scope:** Refresh the subscribed-channels list (and other home data) without requiring logout / login or app relaunch, while keeping network cost minimal (no polling, no heartbeat).

---

## Problem

Newly-subscribed channels do not appear in the app until the user logs out and logs back in. Even relaunching the app does not refresh the list during the cache TTL window.

## Root cause

`src/store/LiveChannelsStore.jsx` persists the channels cache to `localStorage` under `bbnl_channels_cache_v1`, including the original `loadedAt` timestamp.

```js
const isFresh =
  entry?.loadedAt &&
  Date.now() - entry.loadedAt < CHANNELS_TTL_MS &&  // 30 min
  (entry.data?.length || 0) > 0;

if (!force && (isFresh || entry?.isLoading)) {
  return entry?.data || [];                          // short-circuit — no network
}
```

Cold relaunch rehydrates the *old* `loadedAt` from localStorage, so for up to 30 minutes after the last fetch every relaunch returns stale data. The post-login `prefetchHomeData(...)` is the only call site that effectively forces a refresh — and only because logout clears localStorage. `prefetchHomeData` is never invoked on a cold start of an already-authenticated user; the page-level `useEffect`s in `Home.jsx` and `LiveChannels.jsx` call `fetchChannels` without `force: true`, so they hit the TTL gate.

**Net effect:** the persisted cache + non-forced fetches on app boot = no refresh until 30-min TTL expires or user logs out.

## Goals

- New subscriptions appear when the user returns to the app — either via cold relaunch or via webOS Home → re-launch on a still-running app.
- Zero polling, zero heartbeat.
- ≤ 1 extra `/channelData` request per cold launch and per real foreground return.
- No UI flicker; cached data stays on screen until fresh data is ready (stale-while-revalidate).
- No backend / API changes.

## Non-goals

- Real-time push (WebSocket / SSE). Out of scope — backend doesn't expose it.
- Cache-key cleanup of orphaned entries from previous accounts. Pre-existing, separate problem.
- Refresh of OTT app launch URLs / ads on a different cadence.

---

## Design

### Triggers (two)

1. **Cold launch when authenticated.** A `useEffect` in `App.js` runs once after mount: if `isAuthenticated` is true and `userId` + `userPhone` are in `localStorage`, call `prefetchHomeData({ userid, mobile, ip_address, force: true })`. The persisted cache is rehydrated for instant render; the forced refetch runs in the background and swaps in fresh data when ready.

2. **App return from background.** Two `document` listeners alongside the cold-launch effect:
   - `webOSRelaunch` — webOS-specific event when the user returns to the app via Home / Recents while it was already running.
   - `visibilitychange` — fallback for dev mode and older firmware. Fires when `document.visibilityState === 'visible'`.

   Both call the same forced `prefetchHomeData(...)`. A 10-second soft throttle (`lastRunRef`) drops duplicates if both events fire on the same return.

### Scope of each revalidation

Full `prefetchHomeData` — channels (both grid keys), categories, languages, ads, OTT apps. Matches the post-login prefetch one-to-one for mental-model simplicity.

### Cost

- 1 prefetch on cold launch + 1 prefetch per real foreground return (throttled at 10 s).
- No timers, no polling.
- Login flow is untouched (still calls `prefetchHomeData` post-OTP).

---

## Implementation outline

Three small changes — no new architecture.

### 1. `src/utils/prefetchHome.js` — extend with `force`

Every store fetch method already accepts `{ force }` (verified by grep across `src/store/`). Pass it through:

```js
export const prefetchHomeData = ({ userid, mobile, ip_address = "", force = false } = {}) => {
  if (!mobile) return;
  // ...
  channels.fetchChannels({ userid, mobile }, { force }).catch(ignore);
  channels.fetchChannels({ userid, mobile, grid: "" }, { key: `${userid}|${mobile}|`, force }).catch(ignore);
  channels.fetchCategories({ userid, mobile }, { force }).catch(ignore);
  languages.fetchLanguages({ userid, mobile }, { force }).catch(ignore);
  ads.fetchAds({ userid, mobile, ...ADS_DEFAULTS }, { preferForm: false, force }).catch(ignore);
  apps.fetchApps({ userid, mobile, ip_address }, { force }).catch(ignore);
};
```

### 2. `src/utils/useDataRevalidation.js` — new hook (~40 lines)

```js
import { useEffect, useRef } from 'react';
import { prefetchHomeData } from './prefetchHome';

const THROTTLE_MS = 10_000;

export const useDataRevalidation = ({ enabled, getPayload }) => {
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const revalidate = (reason) => {
      const now = Date.now();
      if (now - lastRunRef.current < THROTTLE_MS) return;
      lastRunRef.current = now;
      const payload = getPayload();
      if (!payload?.mobile) return;
      console.log(`[revalidate] ${reason}`);
      prefetchHomeData({ ...payload, force: true });
    };

    revalidate('cold-launch');
    const onRelaunch = () => revalidate('webOSRelaunch');
    const onVisible = () => {
      if (document.visibilityState === 'visible') revalidate('visibilitychange');
    };
    document.addEventListener('webOSRelaunch', onRelaunch);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('webOSRelaunch', onRelaunch);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);
};
```

### 3. `src/App.js` — call the hook

```js
useDataRevalidation({
  enabled: isAuthenticated,
  getPayload: () => ({
    userid: localStorage.getItem('userId') || '',
    mobile: localStorage.getItem('userPhone') || '',
    ip_address: deviceInfo?.publicIPv4 || deviceInfo?.privateIPv4 || '',
  }),
});
```

---

## Why no UI flicker (verified against existing code)

- Components read channels from `channelsCache[key].data` via zustand. When a forced refetch completes, the store mutates `data` in place; subscribed components re-render with the new list automatically.
- `fetchChannels` sets `isLoading: true` at start, but `Home.jsx:443` and `LiveChannels.jsx:230-236` gate skeletons on `channels.length === 0`, **not** on `isLoading`. With the rehydrated cache populated, no skeleton shows during the background refetch — the old list stays on screen until the new list arrives.
- The Home.jsx `useEffect` "only fetch when length===0" gate stays as-is. The App-level revalidation handles the refresh; the page-level effect covers the empty-cache fallback.

## Error handling — silent failure preserves cached data

- `fetchChannels` error paths (`LiveChannelsStore.jsx:130-141, 172-184`) merge `{ isLoading: false, error: "..."}` into the existing entry without touching `data`. A failed revalidation keeps the previously-cached list visible.
- All `prefetchHomeData` calls already use `.catch(ignore)`. We add a single `console.warn` with reason + error so it shows up in `ares-inspect` without surfacing in UI.

## Edge cases

| Case | Handling |
|---|---|
| `webOSRelaunch` and `visibilitychange` both fire on a real return | 10 s throttle drops the second |
| Cold-launch trigger fires before `visibilitychange` on initial mount | Throttled |
| `mobile` not yet in localStorage (mid-logout) | `prefetchHomeData` early-returns; hook also guards |
| Different account on next login | Cache key includes `userid|mobile|grid`; old entries orphaned but never read |
| Server returns `err_code !== 0` | Error path leaves `data` intact; user keeps stale list; next revalidation retries |
| `webOSRelaunch` not supported in dev mode | `visibilitychange` covers it |

---

## Persistence

No changes. The persisted cache structure stays as-is. The 30-min TTL inside each fetch method also stays — it still prevents redundant in-session refetches when navigating Home → LiveChannels → Home. The persisted cache becomes pure SWR seed data: instant render on cold launch, then forced revalidation overlays fresh data.

## Verification plan (manual, on TV)

1. Log in on TV, note subscribed-channels count.
2. Have operator add/remove a subscription on the backend.
3. **Cold-relaunch test:** kill app via webOS, relaunch. Cached list shows briefly, then new list swaps in. Verify count changed.
4. **Foreground test:** with app already running on Home, press webOS Home key, then re-launch app. Same swap. Console: `[revalidate] webOSRelaunch`.
5. **Throttle test:** rapidly toggle Home key twice within 10 s. Verify only one `[revalidate]` log line.
6. **Network-failure test:** disconnect network, trigger revalidation, verify cached list stays visible.
7. **No-regression test:** within one session, navigate Home → LiveChannels → Home → LiveChannels. Network tab should show zero extra `/channelData` calls between revalidation triggers — TTL still holds.

## Rollout / risk

- All changes are additive; if the new hook misbehaves, removing the call site in `App.js` reverts to today's behavior.
- `webOSRelaunch` is a documented webOS event (webOS 4.x+); `visibilitychange` covers older firmware and dev mode.
- No backend, no schema, no API surface changes. Pure client refactor.

## Files

- **Modify:** `src/utils/prefetchHome.js` (~10 line change)
- **Add:** `src/utils/useDataRevalidation.js` (~40 lines)
- **Modify:** `src/App.js` (~7 lines added)

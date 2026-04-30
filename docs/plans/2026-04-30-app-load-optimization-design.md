# App Load Optimization — Design

**Status:** approved 2026-04-30. Implementing now.
**Problem:** First-time login on production backend takes ~60s before the Home screen is usable. Cause: zero prefetching, ~1.2s of artificial `setTimeout`s in the OTP flow, in-memory-only caches (cold on every app restart), no skeleton UI, double-fired `useDeviceInformation`.

## Strategy

Five changes shipped as one cohesive PR, in dependency order:

### A. Prefetch on `sendOtp` success
- New module `src/utils/prefetchHome.js` exporting `prefetchHomeData({ userid, mobile })` — fires `fetchChannels`, `fetchCategories`, `fetchLanguages`, `fetchAds`, `fetchOttApps` in parallel, fire-and-forget.
- Triggered from `LoginOtp.jsx`:
  - inside `handleGetOtp` success branch (we have `userid` the moment OTP send returns; user spends 10–30s typing OTP — free wall-clock).
  - inside the SSO success branch (already navigates to `/home` instantly).
- Existing `entry?.isLoading` dedupe inside each store means Home's mount-time effects become safe no-ops.

### B. Kill artificial timers in OTP flow
- `LoginOtp.jsx:226` — drop `setTimeout(setStep(2), 400)` (saves 400 ms).
- `LoginOtp.jsx:243` — drop `setTimeout(navigate('/home'), 800)` (saves 800 ms).

### E. De-dupe `useDeviceInformation`
- Currently called independently from `App.js` and `LoginOtp.jsx`, so the parallel Luna + IP-detection bundle runs twice.
- Convert to zustand-backed singleton: first caller triggers fetch, subsequent callers subscribe to same state.
- Hook signature unchanged, so consumers don't change.

### D. Skeleton UI on Home
- Each Home section (categories, channels, sports, apps, entertainment) renders dimmed placeholder tiles when its store reports `isLoading && data.length === 0`.
- Tile dimensions match real tiles → no layout shift.
- Sidebar already renders instantly.

### C. Persist zustand caches to localStorage
- Wrap `LiveChannelsStore`, `LivePlayersStore`, `OttAppsStore`, `ChannelsSearchStore` with zustand `persist` middleware (4.5.7 ships it).
- For `LiveChannelsStore`, exclude `byNumber`/`byId` from persisted shape — rebuild from `channels[]` in `onRehydrateStorage`.
- Existing TTL checks gate freshness on read; stale persisted data triggers normal background refetch.
- AuthStore stays in-memory.

## Trade-offs accepted

- Prefetch wastes 5 requests if user abandons OTP. Acceptable per "aggressive" choice.
- localStorage write of ~250 KB per channel-data update may take 50–200 ms on weak TVs. If we observe jank, fallback is to debounce persistence to `visibilitychange`/Home unmount.

## Verification

Manual on TV:
- Cold login → time to first painted Home with channels visible. Compare against current ~60s baseline.
- App restart → persisted channels visible immediately; background refetch refreshes silently.
- Abandoned OTP at step 2 → `/login` recovers cleanly on next attempt; cache for unrelated mobile is unaffected (cache key includes mobile).
- Prefetch failure → no console errors leak to user; Home's mount-time effects re-fire and surface errors via the existing UI.

# Tap Latency & Mistap Prevention — Design

**Date:** 2026-04-29
**Scope:** App-wide UX hardening for the LG webOS BBNL TV app (`com.lg.bbnl` v2.0.0).
**Status:** Design (validated through brainstorming; not yet implemented).

## Problem

Two related symptoms reported by users:

1. **Perceived latency on screen transitions.** Tapping a category on the Home screen (e.g. "Subscribed Channels") visibly freezes the app for ~3 seconds before the destination screen appears. The same pattern shows up on every screen with a dense grid.
2. **Mistap / double-fire.** Because the app gives no acknowledgement that a tap registered, users tap a second time during the freeze. The action then fires twice — two navigations queued, two API calls, occasional inconsistent state.

## Root causes (mapped from the codebase)

| Symptom | Root cause | File(s) |
| --- | --- | --- |
| Home → "Subscribed Channels" 3 s freeze | `LiveChannels` renders the entire `filteredChannels.map(...)` grid synchronously before the browser yields a paint. Hundreds of `<img>` decodes happen on the same tick. `navigate()` returns instantly but React commits the next screen before unblocking the main thread. | `src/Modules/LiveChannels.jsx:359–397` |
| Channel-zap thrash in player | Every UP/DOWN keypress calls `selectChannel` → `setCurrentStream` → `Hls.js` is destroyed and rebuilt. Holding the arrow = N manifest fetches. | `src/Modules/LivePlayer.jsx:146–210`, `src/Pages/StreamPlayer.jsx:263–308` |
| Settings sub-page double fetch | Menu select sets local state synchronously; the per-sub-page `useEffect` then fires a network request with no in-flight guard. | `src/Modules/Setting.jsx:96–166, 354–418` |
| Universal double-fire | No `onClick` / `onSelect` handler in the codebase has a debounce, throttle, in-flight guard, or `disabled` state. `useMagicRemote.getItemProps` exposes a raw `onClick` that calls the component's `onSelect` with no lock. | `src/Remote/useMagicRemote.js:386–409`, all of `src/Modules/*.jsx` |
| No tap acknowledgement | The only visual feedback is `data-focused` (the focus ring). There is no "pressed / activated" visual, so users have no signal that their tap registered until the next screen actually paints. | `public/index.html` `<style>` block, all `focusable-*` classes |

## Decisions taken during brainstorming

- **(c) Two-pass render now, virtualization later.** The cheap render fix gets ~90 % of the perceived win. Windowing is deferred to a follow-up if channel counts grow.
- **(a) Zap-and-settle in LivePlayer.** UP/DOWN updates the info bar instantly; HLS only reloads 300 ms after the last keypress.
- **Tap-lock release: hybrid.** Lock auto-releases on React Router `location` change OR after 600 ms — whichever fires first.
- **No `React.lazy`, no virtualization, no HLS-config changes** in this pass (per `CLAUDE.md` and out-of-scope decisions).

---

## Design

The design has **four layers**. Layer 1 is universal; Layers 2–4 are screen-specific applications of Layer 1 plus targeted speedups.

### Layer 1 — App-wide tap discipline

**New hook:** `src/Remote/useTapAction.js` (~70 LOC).

```js
// Pseudocode shape
let tapLockedAt = 0;
const LOCK_MS = 600;
const PRESS_FLASH_MS = 120;

// Subscribe once at module load — release the lock on any route change.
window.addEventListener('popstate', () => { tapLockedAt = 0; });

export function useTapAction(fn) {
  return useCallback((eventOrArg, ...rest) => {
    const now = Date.now();
    if (now - tapLockedAt < LOCK_MS) return;       // mistap — silently drop
    tapLockedAt = now;
    setTimeout(() => { tapLockedAt = 0; }, LOCK_MS); // safety release

    const target = eventOrArg?.currentTarget;
    if (target?.setAttribute) {
      target.setAttribute('data-pressed', 'true');
      setTimeout(() => target.removeAttribute('data-pressed'), PRESS_FLASH_MS);
    }
    fn(eventOrArg, ...rest);
  }, [fn]);
}
```

Notes:
- Lock state is **module-scoped**, not React state — no re-renders, and OK key + `onClick` share the same flag.
- Auto-release on `location` change is wired by subscribing inside `App.js` (after `Router` mounts) and forwarding to a setter exported from the module. `popstate` covers webOS BACK.
- The 120 ms press flash is applied via `data-pressed="true"` on `event.currentTarget`. For OK-key activations (no `currentTarget`), `useMagicRemote` applies the same attribute to the focused ref.

**`useMagicRemote.js` changes:**
- The internal OK-key handler and `getItemProps.onClick` both call through `useTapAction`'s lock check.
- After OK, the focused element gets `data-pressed="true"` for 120 ms.

**CSS — added to `public/index.html` `<style>` block** (alongside existing `data-focused` rules):

```css
.focusable-button[data-pressed="true"],
.focusable-sidebar-item[data-pressed="true"],
.focusable-language-card[data-pressed="true"],
.focusable-category[data-pressed="true"],
.focusable-channel-tile[data-pressed="true"] {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.18);
}

[data-disabled="true"] {
  opacity: 0.5;
  pointer-events: none;
}
```

No `transform` / `scale` — those are forbidden on focused elements per `magicRemoteUIStability.js`.

**Handlers wrapped with `useTapAction`:**

| File | Handlers |
| --- | --- |
| `Home.jsx` | `handleSidebarNavigate`, `handleCategoryClick`, `handleChannelPlay` |
| `LiveChannels.jsx` | `handleChannelSelect`, filter/category select, search submit |
| `LanguageChannels.jsx`, `MoviesOtt.jsx`, `Favorites.jsx`, `Feedback.jsx` | sidebar / grid select handlers |
| `Setting.jsx` | menu select, mobile/support/add-users submits |
| `LivePlayer.jsx` | sidebar channel select (zap path is separate — see Layer 3) |

### Layer 2 — LiveChannels render speedup (and similar dense grids)

**(2a) Two-pass render via React 19 `useTransition`** in `LiveChannels.jsx`:

```js
const [isPending, startTransition] = useTransition();
const [renderGrid, setRenderGrid] = useState(false);

useEffect(() => {
  // Yield one frame so chrome paints, then mount the grid under a transition.
  const id = requestAnimationFrame(() =>
    startTransition(() => setRenderGrid(true))
  );
  return () => cancelAnimationFrame(id);
}, []);
```

Below the filter bar:
- `!renderGrid || isLoadingChannels` → render skeleton (10 cards, existing code).
- `renderGrid && !isLoading && filtered.length === 0` → empty state.
- `renderGrid && filtered.length > 0` → real grid.

**(2b) Lazy / async images** on every `<img>` for a channel logo:

```jsx
<img src={channel.chlogo} alt={channel.chtitle}
     loading="lazy" decoding="async" ... />
```

**(2c) Memoized tile** — extract the inline tile JSX into `src/Modules/components/ChannelTile.jsx`, wrap in `React.memo` with a custom comparator that checks `channel.channelno + index + isPressed/focusable class`. Stops the entire grid from re-rendering on filter / search input changes.

**Same recipe applied to:**
- `Home.jsx` channel rows (Sports, Entertainment, etc.)
- `Favorites.jsx`
- `LanguageChannels.jsx`
- `MoviesOtt.jsx`

### Layer 3 — LivePlayer zap-and-settle

In `LivePlayer.jsx`, split state into "what the user sees" vs. "what's actually loaded":

```js
const [pendingChannel, setPendingChannel] = useState(null);
const [currentChannel, setCurrentChannel] = useState(null);
// currentStream stays as-is.

// Arrow handler (and number-pad live update) updates pending only.
const stepChannel = useCallback((dir) => {
  // ...existing logic to find next subscribed channel...
  setPendingChannel(candidate);
}, []);

// Debounced commit: 300 ms after pending settles, do the real work.
const ZAP_SETTLE_MS = 300;
useEffect(() => {
  if (!pendingChannel) return;
  if (pendingChannel === currentChannel) return;
  const t = setTimeout(() => {
    const url = getStreamUrl(pendingChannel);
    if (!url) { setLocalError('No stream URL found.'); return; }
    setCurrentChannel(pendingChannel);
    setCurrentStream(url); // ← only this triggers HLS reload
  }, ZAP_SETTLE_MS);
  return () => clearTimeout(t);
}, [pendingChannel]);
```

**Visual contract during the 300 ms window:**
- Info bar (logo / name / number / EPG line) updates from `pendingChannel` instantly.
- Video keeps showing the previous channel — no black flash.
- On commit, a small spinner overlay appears until `Hls.Events.MEDIA_ATTACHED` fires the first frame.

**Other entry points that bypass zap (intentional — explicit user choice):**
- Sidebar channel row OK → calls `selectChannel(ch)` directly (still goes through Layer 1 lock).
- Number-pad full commit → same.

### Layer 4 — Settings async guards

In `Setting.jsx`:

**(4a) Menu select goes through `useTapAction`** (already covered by Layer 1).

**(4b) Per-sub-page in-flight flag.** For each async path:

```js
const submittingRef = useRef(false);
const handleSupportSubmit = useTapAction(async () => {
  if (submittingRef.current) return;
  submittingRef.current = true;
  try {
    const res = await submitTicket(...);
    // ...
  } finally {
    submittingRef.current = false;
  }
});
```

For sub-pages with their own data-fetching `useEffect` (`account`, `expiring`), gate the effect with the same ref so re-entering the page mid-fetch doesn't kick off a second request.

**(4c) Submit-button visual state.** While `submittingRef.current === true`, the button gets `data-disabled="true"` (the new CSS rule above). Re-pressing OK / clicking does nothing.

---

## Files touched

**New (2):**
- `src/Remote/useTapAction.js`
- `src/Modules/components/ChannelTile.jsx`

**Edited (~10):**
- `src/Remote/useMagicRemote.js` — OK-key + `onClick` route through tap lock; press flash on focused ref.
- `src/Modules/Home.jsx` — wrap handlers, two-pass + lazy-img on channel rows.
- `src/Modules/LiveChannels.jsx` — wrap handler, two-pass render, lazy-img, `ChannelTile`.
- `src/Modules/LivePlayer.jsx` — pending/current split + debounced commit.
- `src/Modules/Setting.jsx` — wrap handlers + per-handler in-flight flags + `data-disabled`.
- `src/Modules/LanguageChannels.jsx`, `MoviesOtt.jsx`, `Favorites.jsx`, `Feedback.jsx` — wrap handlers, lazy-img on grids.
- `public/index.html` — `[data-pressed]` and `[data-disabled]` rules.
- `src/App.js` — wire `useTapAction` route-change auto-release after `Router` mounts.

## Verification (manual on TV — `ares-inspect`)

1. **Home → "Subscribed Channels"** once: chrome paints <100 ms, grid fills <500 ms, no main-thread freeze (visible in DevTools Performance).
2. **Home → "Subscribed Channels"** triple-tap rapidly: exactly one navigation, exactly one set of network requests in DevTools.
3. **LivePlayer**: hold DOWN through 10 channels in ~2 s — info bar scrolls smoothly, exactly **one** HLS manifest request fires when you stop.
4. **Settings** → tap "Account Info" five times in a row: exactly one `getCustomerDetails` request.
5. **Press flash** appears (gold border + tinted bg) on every focusable element when tapped/OK'd.
6. **Submit button** in Help & Support / Add User dims while submitting; re-tap is a no-op.
7. **Regression**: Magic Remote BACK still works on every screen; existing focus styles unchanged.

## Out of scope (deliberately)

- Grid virtualization / windowing (deferred — track separately if list size grows).
- `<picture>` / AVIF for channel logos (orthogonal optimization).
- Changes to `Hls.js` config in `StreamPlayer.jsx` — already tuned.
- Pre-mounting routes (memory-heavy on TV; `MemoryRouter` choice locks history depth at 1 anyway).
- Skeleton design refresh — using existing skeleton.

## Risks / things to watch

- **`useTransition` on webOS Chromium 53.** React 19 polyfills the scheduler, but transitions can starve on extremely slow CPUs. Mitigated by the explicit `requestAnimationFrame` gate — the chrome paint never depends on the transition completing.
- **`loading="lazy"`** on `<img>` is supported on Chromium ≥77; webOS browserlist target is Chrome ≥53 per `package.json`. The attribute is silently ignored on older browsers (no breakage); on real webOS TVs (24+ → Chromium 87+) it works. For 22-and-older fleets, it's a no-op — still fine.
- **Lock auto-release on `popstate`** must distinguish webOS BACK from forward navigation. Current `GlobalBackHandler` already swallows BACK on sub-pages and routes to `/home`, which fires a `popstate` — the auto-release on `popstate` is the right signal there.
- **Zap-settle 300 ms** may feel slow if user wants single-step. Single tap of UP/DOWN still settles in 300 ms, so the *first* channel switch costs an extra 300 ms latency vs. today. Tradeoff: we accept it because the alternative is HLS thrashing on every press. Tunable.

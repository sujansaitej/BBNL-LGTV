# Tap Latency & Mistap Prevention — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the perceived ~3 s freeze on screen transitions and the universal double-fire on rapid taps, app-wide, in the LG webOS BBNL TV app.

**Architecture:** Three layers stacked. (1) A new `useTapAction` hook adds a 600 ms global tap lock + 120 ms gold press-flash to every action handler in the app — covers both Magic Remote OK and pointer clicks. (2) Dense grids (LiveChannels, Home rows, Favorites, Language, Movies/OTT) switch to a two-pass render so page chrome paints before the grid mounts; `<img>` tags get `loading="lazy"` + `decoding="async"`; tiles are memoized. (3) LivePlayer splits "what the user sees" (`pendingChannel`, instant) from "what's actually loaded" (`currentChannel` / HLS, debounced 300 ms) so holding UP/DOWN doesn't thrash HLS.js. Settings sub-pages get per-handler in-flight flags + `data-disabled` on submit buttons.

**Tech Stack:** React 19 (`useTransition`, `startTransition`), zustand, `react-router-dom` `MemoryRouter`, `hls.js`, react-scripts/Jest, webOS Magic Remote / Luna service APIs.

**Reference design:** `docs/plans/2026-04-29-tap-latency-and-mistaps-design.md` — read it before starting.

**Conventions to honor (from `CLAUDE.md`):**
- No `React.lazy`. Eager imports only.
- No `transform`/`scale` on focused/pressed elements (TV panel blur). Use `border` + `background` only.
- Focus styles are applied via `data-*` attributes from refs, never via React state. The new `data-pressed` follows the same pattern.
- Directory typos `Deviceinformaction`, `Modules-Erros` are load-bearing — do not "fix" them.
- `homepage: "./"` in `package.json` is intentional for IPK packaging — do not change it.

---

## Task 1: Create `useTapAction` hook with a unit test

**Files:**
- Create: `src/Remote/useTapAction.js`
- Create: `src/Remote/useTapAction.test.js`

The hook is a pure JS module with timers + a module-scoped lock flag. It's the only piece of the design that is genuinely unit-testable; everything else is visual/integration.

**Step 1: Write the failing test**

Create `src/Remote/useTapAction.test.js`:

```js
import { renderHook, act } from '@testing-library/react';
import { useTapAction, __resetTapLockForTests } from './useTapAction';

beforeEach(() => {
  jest.useFakeTimers();
  __resetTapLockForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

const makeEvent = () => {
  const target = document.createElement('div');
  return { currentTarget: target, target };
};

test('first tap fires the wrapped fn', () => {
  const fn = jest.fn();
  const { result } = renderHook(() => useTapAction(fn));
  const ev = makeEvent();
  act(() => result.current(ev));
  expect(fn).toHaveBeenCalledTimes(1);
});

test('second tap within lock window is dropped', () => {
  const fn = jest.fn();
  const { result } = renderHook(() => useTapAction(fn));
  act(() => result.current(makeEvent()));
  act(() => { jest.advanceTimersByTime(100); });
  act(() => result.current(makeEvent()));
  expect(fn).toHaveBeenCalledTimes(1);
});

test('tap after the 600ms lock window fires again', () => {
  const fn = jest.fn();
  const { result } = renderHook(() => useTapAction(fn));
  act(() => result.current(makeEvent()));
  act(() => { jest.advanceTimersByTime(601); });
  act(() => result.current(makeEvent()));
  expect(fn).toHaveBeenCalledTimes(2);
});

test('press flash is applied for ~120ms then removed', () => {
  const fn = jest.fn();
  const { result } = renderHook(() => useTapAction(fn));
  const ev = makeEvent();
  act(() => result.current(ev));
  expect(ev.currentTarget.getAttribute('data-pressed')).toBe('true');
  act(() => { jest.advanceTimersByTime(125); });
  expect(ev.currentTarget.getAttribute('data-pressed')).toBeNull();
});

test('manual lock release allows next tap immediately', () => {
  const fn = jest.fn();
  const { result } = renderHook(() => useTapAction(fn));
  act(() => result.current(makeEvent()));
  act(() => __resetTapLockForTests());
  act(() => result.current(makeEvent()));
  expect(fn).toHaveBeenCalledTimes(2);
});
```

**Step 2: Run the test and confirm it fails**

Run:
```
npm test -- --watchAll=false --testPathPattern=useTapAction
```

Expected: failure — `useTapAction` is not yet defined.

**Step 3: Implement `useTapAction.js`**

Create `src/Remote/useTapAction.js`:

```js
import { useCallback } from 'react';

const LOCK_MS = 600;
const PRESS_FLASH_MS = 120;

let tapLockedAt = 0;
let lockTimer = null;

const releaseLock = () => {
  tapLockedAt = 0;
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }
};

/**
 * Module-level helper: route-change auto-release. Wired once from App.js
 * (see Task 3) so that whenever React Router commits a new pathname, the
 * lock clears immediately — taps work the instant the new screen mounts.
 */
export const releaseTapLock = releaseLock;

/**
 * Test-only helper. Not exported via the hook.
 */
export const __resetTapLockForTests = releaseLock;

/**
 * Wraps an action handler with:
 *   1. A global 600ms double-tap lock (auto-released on route change).
 *   2. A 120ms data-pressed flash on the activated element.
 *
 * Both pointer clicks (event.currentTarget) and Magic Remote OK
 * activations (where useMagicRemote applies the flash to the focused
 * ref directly) share the same lock — the lock state is module-scoped.
 */
export function useTapAction(fn) {
  return useCallback((eventOrArg, ...rest) => {
    const now = Date.now();
    if (tapLockedAt && now - tapLockedAt < LOCK_MS) return;

    tapLockedAt = now;
    if (lockTimer) clearTimeout(lockTimer);
    lockTimer = setTimeout(releaseLock, LOCK_MS);

    const target =
      eventOrArg && eventOrArg.currentTarget && eventOrArg.currentTarget.setAttribute
        ? eventOrArg.currentTarget
        : null;
    if (target) {
      target.setAttribute('data-pressed', 'true');
      setTimeout(() => target.removeAttribute('data-pressed'), PRESS_FLASH_MS);
    }

    return fn(eventOrArg, ...rest);
  }, [fn]);
}

/**
 * Imperative version for code paths that don't have a React event
 * (e.g., Magic Remote keydown OK in useMagicRemote). Pass an optional
 * DOM element to receive the press flash.
 */
export function tapActionFire(fn, flashTarget = null) {
  const now = Date.now();
  if (tapLockedAt && now - tapLockedAt < LOCK_MS) return false;
  tapLockedAt = now;
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = setTimeout(releaseLock, LOCK_MS);

  if (flashTarget && flashTarget.setAttribute) {
    flashTarget.setAttribute('data-pressed', 'true');
    setTimeout(() => flashTarget.removeAttribute('data-pressed'), PRESS_FLASH_MS);
  }
  fn?.();
  return true;
}
```

**Step 4: Run the test and confirm it passes**

Run:
```
npm test -- --watchAll=false --testPathPattern=useTapAction
```

Expected: 5 passed.

**Step 5: Commit**

```bash
git add src/Remote/useTapAction.js src/Remote/useTapAction.test.js
git commit -m "feat(remote): add useTapAction hook with global tap lock + press flash"
```

---

## Task 2: Add `data-pressed` and `data-disabled` styles to `public/index.html`

**Files:**
- Modify: `public/index.html` (the existing `<style>` block — same place that hosts the `data-focused` rules)

**Step 1: Locate the style block**

Open `public/index.html` and find the `<style>` block. Identify the existing `[data-focused="true"]` rules — the new rules go directly under them so the visual "stack" is `focused → pressed`.

**Step 2: Add the new rules**

Append inside the same `<style>` block, immediately after the last `data-focused` rule:

```css
/* Tap acknowledgement — applied via useTapAction (120ms flash) and by
   useMagicRemote on OK-key activations. Static colors only — no transform. */
.focusable-button[data-pressed="true"],
.focusable-sidebar-item[data-pressed="true"],
.focusable-language-card[data-pressed="true"],
.focusable-category[data-pressed="true"],
.focusable-channel-tile[data-pressed="true"],
[data-pressed="true"].focusable {
  border-color: #ffd700 !important;
  background: rgba(255, 215, 0, 0.18) !important;
}

/* Submit-button in-flight state — applied to forms in Settings while a
   network request is pending. */
[data-disabled="true"] {
  opacity: 0.5 !important;
  pointer-events: none !important;
}
```

**Step 3: Manual smoke check**

Run:
```
npm start
```

Open `http://localhost:3000`, log in, confirm the existing focus ring still works on Home sidebar items. (No pressed flash visible yet — wired in Task 3+.) Stop the dev server.

**Step 4: Commit**

```bash
git add public/index.html
git commit -m "style: add data-pressed flash and data-disabled rules"
```

---

## Task 3: Wire route-change auto-release in `App.js`

**Files:**
- Modify: `src/App.js`

**Step 1: Add the import**

At the top of `src/App.js`, alongside the other `./server` / `./utils` imports, add:

```js
import { releaseTapLock } from './Remote/useTapAction';
```

**Step 2: Add a small inline component that subscribes to `useLocation`**

Inside `src/App.js`, immediately above the existing `GlobalBackHandler` definition, add:

```js
/**
 * On every React Router pathname change, release the global tap lock so
 * taps work the instant the new screen mounts (don't have to wait for
 * the 600ms safety timer).
 */
const TapLockResetter = () => {
  const location = useLocation();
  useEffect(() => { releaseTapLock(); }, [location.pathname]);
  return null;
};
```

**Step 3: Render `<TapLockResetter />` next to `<GlobalBackHandler />`**

In the `App` component's `return`, find the line:

```jsx
<GlobalBackHandler />
```

Replace it with:

```jsx
<GlobalBackHandler />
<TapLockResetter />
```

**Step 4: Manual smoke check**

Run `npm start`, log in, navigate Home → Settings → back to Home. Open DevTools and confirm no console errors. (No visible behavior change yet.)

**Step 5: Commit**

```bash
git add src/App.js
git commit -m "feat(app): release tap lock on route change"
```

---

## Task 4: Route OK-key + `onClick` through tap lock in `useMagicRemote.js`

**Files:**
- Modify: `src/Remote/useMagicRemote.js`

**Step 1: Add the import at the top of the file**

```js
import { tapActionFire } from './useTapAction';
```

**Step 2: Update `getItemProps.onClick`**

Locate `getItemProps` (around line 386–409 per the design doc). The current `onClick` is:

```js
onClick: () => {
  applyFocus(index);
  onSelectRef.current?.(index);
},
```

Replace with:

```js
onClick: (e) => {
  applyFocus(index);
  const el = itemRefs.current[index] || (e && e.currentTarget) || null;
  tapActionFire(() => onSelectRef.current?.(index), el);
},
```

The lock now applies to mouse clicks on focusable items, and the press flash is applied to the actual focused DOM node (so it lights up alongside the focus ring).

**Step 3: Update the OK-key keydown branch**

Find the keydown handler inside the same hook. Locate the branch that handles OK / Enter (`keyCode === 13` or `key === 'Enter'`). The current branch typically reads `onSelectRef.current?.(focusedIndexRef.current)` (or equivalent). Wrap that call:

```js
// Inside the OK / Enter branch (replace the direct onSelectRef call):
const idx = focusedIndexRef.current;
const el = itemRefs.current[idx] || null;
tapActionFire(() => onSelectRef.current?.(idx), el);
```

If `useMagicRemote` exposes a low-level `onOKKey` callback (the design notes it does — used by pages with custom OK handling), wrap **its** invocation the same way:

```js
// Where the hook calls onOKKey:
tapActionFire(() => onOKKeyRef.current?.(e), document.activeElement || null);
```

**Step 4: Manual smoke check**

Run `npm start`. On the Home screen, click a sidebar item with the mouse. The gold pressed flash should be visible for ~120 ms before the page transitions. Click rapidly 5 times on the same sidebar item — only **one** navigation should occur (verify via DevTools "preserve log" + Network panel).

**Step 5: Commit**

```bash
git add src/Remote/useMagicRemote.js
git commit -m "feat(remote): route OK-key and onClick through tap lock + press flash"
```

---

## Task 5: Apply tap lock + lazy images on `Home.jsx`

**Files:**
- Modify: `src/Modules/Home.jsx`

**Step 1: Add the import**

At the top:

```js
import { useTapAction } from '../Remote/useTapAction';
```

**Step 2: Wrap the three navigation handlers**

Find `handleSidebarNavigate`, `handleCategoryClick`, and `handleChannelPlay` (around lines 74–88, 362–364). Each is a `useCallback`. Wrap **the result** with `useTapAction`:

```js
const handleSidebarNavigateRaw = useCallback((path) => {
  if (!path || location.pathname === path) return;
  navigate(path);
}, [navigate, location.pathname]);
const handleSidebarNavigate = useTapAction(handleSidebarNavigateRaw);

const handleCategoryClickRaw = useCallback((cat) => {
  navigate('/live-channels', { state: { filter: cat.title } });
}, [navigate]);
const handleCategoryClick = useTapAction(handleCategoryClickRaw);

const handleChannelPlayRaw = useCallback((ch) => {
  if (!isSubscribed(ch)) { setLockedChannel(ch); return; }
  const url = ch.streamlink || ch.stream_link /* …existing fallbacks */;
  if (url) navigate('/player', { state: { streamlink: url, title: ch.chtitle, channelData: ch } });
}, [navigate]);
const handleChannelPlay = useTapAction(handleChannelPlayRaw);
```

The component's JSX already calls `handleSidebarNavigate(...)` etc., so no JSX changes are needed.

**Important:** `useTapAction` invokes the wrapped fn with `(eventOrArg, ...rest)`. The existing handlers take `(path)` / `(cat)` / `(ch)` — those are the first arg, so the call site `onClick={() => handleCategoryClick(cat)}` passes `cat` as first arg correctly. The `currentTarget`-based press flash only fires when called with an event (e.g., from `getItemProps` or a real `onClick`). For these explicit-arg handlers, the flash is supplied by `useMagicRemote.getItemProps` (mouse path) or the OK-key path (Task 4) instead.

**Step 3: Add `loading="lazy"` and `decoding="async"` to channel-row images**

In the channel-tile JSX in `Home.jsx` (around lines 579 and 650), find every `<img src={... ch.chlogo ...} />` and add the two attributes:

```jsx
<img
  src={ch.chlogo}
  alt={ch.chtitle}
  loading="lazy"
  decoding="async"
  /* …existing style + onError… */
/>
```

Apply to all channel logos and ad images in `Home.jsx`.

**Step 4: Manual smoke check**

Run `npm start`. On Home, rapid-tap "Subscribed Channels" 5 times — only one navigation, gold flash visible on first tap, subsequent taps silently dropped. Channel-row scrolling visibly snappier (logos decode lazily).

**Step 5: Commit**

```bash
git add src/Modules/Home.jsx
git commit -m "feat(home): wrap handlers with tap lock + lazy-load logo images"
```

---

## Task 6: Two-pass render + `ChannelTile` in `LiveChannels.jsx`

**Files:**
- Create: `src/Modules/components/ChannelTile.jsx`
- Modify: `src/Modules/LiveChannels.jsx`

**Step 1: Create the memoized tile**

Create `src/Modules/components/ChannelTile.jsx`:

```jsx
import { memo } from 'react';

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M9 8L9 16L17 12L9 8Z" fill="rgba(0,0,0,0.1)" />
  </svg>
);

const formatPrice = (value) => {
  if (value == null) return '';
  const text = String(value).trim();
  if (!text) return '';
  if (text === '0' || text === '0.0' || text === '0.00') return 'Free';
  return /^[0-9]+(\.[0-9]+)?$/.test(text) ? `₹${text}` : text;
};

function ChannelTileImpl({ channel, index, setRef, onSelect }) {
  const price = formatPrice(channel.chprice);
  return (
    <div
      ref={(el) => setRef(index, el)}
      className="focusable-button focusable-channel-tile"
      role="button"
      tabIndex={-1}
      onClick={() => onSelect(channel)}
      style={{
        borderRadius: '16px', overflow: 'hidden', cursor: 'pointer',
        outline: 'none', border: '3px solid transparent', background: 'transparent',
      }}
    >
      <div style={{
        width: '100%', aspectRatio: '16/9', backgroundColor: '#fff',
        borderRadius: '14px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', overflow: 'hidden',
      }}>
        {channel.chlogo ? (
          <img
            src={channel.chlogo}
            alt={channel.chtitle}
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 8L9 16L17 12L9 8Z" fill="rgba(0,0,0,0.1)"/></svg><span style="font-size:12px;color:rgba(0,0,0,0.3);font-weight:600">NO IMAGE</span></div>';
              }
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <PlayIcon />
            <span style={{ fontSize: '12px', color: 'rgba(0,0,0,0.3)', fontWeight: 600 }}>NO IMAGE</span>
          </div>
        )}
      </div>
      <div style={{ padding: '10px 4px 6px' }}>
        <p style={{
          fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{channel.chtitle}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.94)' }}>{channel.channelno}</span>
          {price && (
            <span style={{
              fontSize: '0.85rem', fontWeight: 700,
              color: price === 'Free' ? '#43e97b' : '#ffd700',
            }}>{price}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ChannelTileImpl, (prev, next) =>
  prev.channel === next.channel &&
  prev.index === next.index &&
  prev.onSelect === next.onSelect
);
```

**Step 2: Update `LiveChannels.jsx` imports**

At the top of `src/Modules/LiveChannels.jsx`:

```js
import { useEffect, useMemo, useRef, useState, useCallback, useTransition } from 'react';
// …other imports…
import ChannelTile from './components/ChannelTile';
import { useTapAction } from '../Remote/useTapAction';
```

**Step 3: Add the two-pass render gate**

Inside `LiveChannels`, near the top of the component (alongside the other `useState` calls), add:

```js
const [, startTransition] = useTransition();
const [renderGrid, setRenderGrid] = useState(false);

useEffect(() => {
  const id = requestAnimationFrame(() =>
    startTransition(() => setRenderGrid(true))
  );
  return () => cancelAnimationFrame(id);
}, []);
```

**Step 4: Wrap `handleChannelSelect` with `useTapAction`**

Locate `handleChannelSelect` (around lines 217–228). Rename the current `useCallback` to `handleChannelSelectRaw`, then add:

```js
const handleChannelSelect = useTapAction(handleChannelSelectRaw);
```

Add a `setCardRef` helper near the other refs:

```js
const setCardRef = useCallback((index, el) => { cardRefs.current[index] = el; }, []);
```

**Step 5: Replace the inline grid markup with `ChannelTile`**

Find the grid render block (around lines 360–395). Replace the inner `filteredChannels.map(...)` with:

```jsx
{filteredChannels.map((channel, index) => (
  <ChannelTile
    key={`${channel.channelno}-${index}`}
    channel={channel}
    index={index}
    setRef={setCardRef}
    onSelect={handleChannelSelect}
  />
))}
```

**Step 6: Gate the grid on `renderGrid`**

Update the conditional that decides what to render under the filter bar:

```jsx
{(!renderGrid || isLoadingChannels) ? (
  /* existing skeleton — 10 placeholder cards */
) : filteredChannels.length === 0 ? (
  /* existing "No channels found" empty state */
) : (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: '1.5rem' }}>
    {/* mapped <ChannelTile/> from Step 5 */}
  </div>
)}
```

The skeleton briefly flashes for 1 frame before the grid mounts, which gives the user a "the page is here, channels coming" cue instead of a frozen prior screen.

**Step 7: Manual smoke check on TV (or DevTools mobile throttling)**

Run `npm start` with **CPU 6× slowdown** in DevTools Performance tab.
1. Tap Home → "All Channels".
2. Expected: page chrome (back button, header, filter bar) appears within 1–2 frames; skeleton flashes briefly; grid fills in. No 3 s freeze on Home.
3. Rapid-tap 5×: only one navigation; gold press flash visible.

**Step 8: Commit**

```bash
git add src/Modules/components/ChannelTile.jsx src/Modules/LiveChannels.jsx
git commit -m "perf(live-channels): two-pass render + memoized ChannelTile + lazy images"
```

---

## Task 7: Apply same recipe to remaining grid screens

**Files:**
- Modify: `src/Modules/LanguageChannels.jsx`
- Modify: `src/Modules/Favorites.jsx`
- Modify: `src/Modules/MoviesOtt.jsx`
- Modify: `src/Modules/Feedback.jsx`

For each file:

**Step 1: Wrap action handlers with `useTapAction`**

Add the import:

```js
import { useTapAction } from '../Remote/useTapAction';
```

Identify all top-level handlers of the form `const handleX = useCallback(…)` that perform navigation, channel playback, or any state-changing action. For each one:

```js
const handleXRaw = useCallback(/* existing body */);
const handleX = useTapAction(handleXRaw);
```

The component body's call sites already use `handleX(...)`, so no JSX changes required.

**Step 2: Add lazy/async to grid `<img>` tags**

For every channel logo / OTT poster `<img>` in the file, add `loading="lazy" decoding="async"`.

**Step 3: Reuse `ChannelTile` where applicable**

If `LanguageChannels.jsx` or `Favorites.jsx` renders the same channel-tile shape as `LiveChannels.jsx`, replace the inline JSX with `<ChannelTile/>` exactly as in Task 6 Step 5. Do **not** introduce a `ChannelTile` use in `MoviesOtt.jsx` if its tile shape differs (OTT posters are typically taller / different aspect) — just apply the lazy/async + memo locally there.

**Step 4: Add the two-pass render gate** (same shape as Task 6 Step 3) to any of these screens that renders >50 grid items at once. Skip for `Feedback.jsx` (it's a form, not a grid).

**Step 5: Manual smoke check**

Run `npm start`, navigate Home → each of the four screens. No frozen prior screen on transition; no double-fire on rapid taps.

**Step 6: Commit**

```bash
git add src/Modules/LanguageChannels.jsx src/Modules/Favorites.jsx src/Modules/MoviesOtt.jsx src/Modules/Feedback.jsx
git commit -m "perf: apply tap lock + two-pass render to remaining grid screens"
```

---

## Task 8: LivePlayer zap-and-settle

**Files:**
- Modify: `src/Modules/LivePlayer.jsx`

**Step 1: Add imports + constants**

At the top:

```js
import { useTapAction } from '../Remote/useTapAction';

const ZAP_SETTLE_MS = 300;
```

**Step 2: Add `pendingChannel` state**

Alongside the existing `currentChannel` / `currentStream` state, add:

```js
const [pendingChannel, setPendingChannel] = useState(null);
const pendingChannelRef = useRef(null);
useEffect(() => { pendingChannelRef.current = pendingChannel; }, [pendingChannel]);
```

**Step 3: Refactor `stepChannel` to update pending only**

Locate `stepChannel` (around lines 196–210). Replace its body:

```js
const stepChannel = useCallback((dir) => {
  const list = chListRef.current;
  if (!list.length) return;
  const startFromCh = pendingChannelRef.current || curChRef.current;
  const cur = findChIndex(startFromCh);
  let i = cur === -1 ? 0 : (cur + dir + list.length) % list.length;
  for (let guard = 0; guard < list.length; guard++) {
    const candidate = list[i];
    if (candidate && isSubscribed(candidate)) {
      setPendingChannel(candidate); // ← info bar updates instantly; HLS does NOT
      return;
    }
    i = (i + dir + list.length) % list.length;
  }
}, []);
```

**Step 4: Add the debounced commit effect**

Below the existing effects, add:

```js
useEffect(() => {
  if (!pendingChannel) return;
  if (pendingChannel === currentChannel) return;
  const t = setTimeout(() => {
    if (!isSubscribed(pendingChannel)) {
      setLockedChannel(pendingChannel);
      setPendingChannel(null);
      return;
    }
    const url = getStreamUrl(pendingChannel);
    if (!url) {
      setLocalError('No stream URL found.');
      return;
    }
    setLocalError('');
    setCurrentChannel(pendingChannel);
    setCurrentStream(url);
  }, ZAP_SETTLE_MS);
  return () => clearTimeout(t);
}, [pendingChannel, currentChannel]);
```

**Step 5: Update the info bar to read from `pendingChannel ?? currentChannel`**

Find the JSX that renders the info bar (channel logo, name, number, EPG). Wherever it reads `currentChannel`, change to `pendingChannel || currentChannel`. The user always sees the channel they're zapping toward, even before HLS starts loading.

Add a "tuning…" subline that appears when `pendingChannel && pendingChannel !== currentChannel`:

```jsx
{pendingChannel && pendingChannel !== currentChannel && (
  <span style={{ fontSize: '0.8rem', opacity: 0.7, marginLeft: '0.5rem' }}>tuning…</span>
)}
```

**Step 6: Wrap explicit channel-select handlers**

The sidebar channel row OK and number-pad commit (which set the channel directly, not through zap) should still fire HLS immediately — that's the user's explicit choice. Wrap them with `useTapAction`:

```js
const selectChannelRaw = useCallback(/* existing body */);
const selectChannel = useTapAction(selectChannelRaw);
```

When `selectChannel` is called explicitly, also clear `pendingChannel` to avoid a stale tuning message:

```js
const selectChannelRaw = useCallback((channel) => {
  setPendingChannel(null);
  // …existing body unchanged…
}, [/* deps */]);
```

**Step 7: Manual smoke check on dev (`npm start`)**

1. Open the player. Press DOWN once: info bar updates immediately. Wait — within ~300 ms, video tunes to the new channel.
2. Hold DOWN for ~2 s through 10 channels: info bar scrolls smoothly (no flicker), open DevTools Network panel and confirm exactly **one** `.m3u8` request fires after release.
3. Press OK on a channel in the sidebar: tunes immediately (no 300 ms delay — it's an explicit choice, not zap).
4. Rapid-tap the same channel in the sidebar 5×: only one HLS reload (tap lock).

**Step 8: Commit**

```bash
git add src/Modules/LivePlayer.jsx
git commit -m "perf(player): zap-and-settle — debounce HLS reload while channel-zapping"
```

---

## Task 9: Settings tap lock + per-handler in-flight flags

**Files:**
- Modify: `src/Modules/Setting.jsx`

**Step 1: Add the import**

```js
import { useTapAction } from '../Remote/useTapAction';
```

**Step 2: Wrap the menu-select effect**

Inside the keydown handler that fires on Enter (around lines 495–500), wrap the action body:

```js
const handleMenuSelectRaw = useCallback(() => {
  const item = menuItems[focusedMenuRef.current];
  if (!item) return;
  if (item.id === 'logout') setShowLogoutDialog(true);
  else setCurrentPage(item.id);
}, []);
const handleMenuSelect = useTapAction(handleMenuSelectRaw);

// Then in the keydown handler:
else if (isEnter) {
  e.preventDefault();
  handleMenuSelect();
}
```

**Step 3: Add in-flight refs to async submit handlers**

For each of `handleMobileUpdate`, `handleSupportSubmit`, `handleAddUserSubmit` (Settings.jsx lines 141–166, 354–373, 391–418):

```js
const submittingMobileRef = useRef(false);
const handleMobileUpdate = useTapAction(useCallback(async () => {
  if (submittingMobileRef.current) return;
  submittingMobileRef.current = true;
  try {
    /* existing body — fetch + state updates */
  } finally {
    submittingMobileRef.current = false;
  }
}, [/* existing deps */]));
```

Repeat for support and add-users handlers, each with its own `submittingXRef`.

**Step 4: Apply `data-disabled` to submit buttons during submission**

Add component-level state:

```js
const [submittingMobile, setSubmittingMobile] = useState(false);
const [submittingSupport, setSubmittingSupport] = useState(false);
const [submittingAddUser, setSubmittingAddUser] = useState(false);
```

Set these inside the corresponding handlers (around the ref toggle):

```js
submittingMobileRef.current = true;
setSubmittingMobile(true);
try { /* … */ } finally {
  submittingMobileRef.current = false;
  setSubmittingMobile(false);
}
```

On the submit button JSX:

```jsx
<button
  className="focusable-button"
  data-disabled={submittingMobile ? 'true' : undefined}
  onClick={handleMobileUpdate}
>
  {submittingMobile ? 'Submitting…' : 'Update Mobile'}
</button>
```

Same shape for the support and add-user buttons.

**Step 5: Gate the data-fetching effects with the in-flight ref**

For the `account` and `expiring` sub-pages (lines 96–139), add a `fetchingRef` and skip the effect if already in flight:

```js
const fetchingAccountRef = useRef(false);
useEffect(() => {
  if (currentPage !== 'account') return;
  if (fetchingAccountRef.current) return;
  // …existing cached read…
  fetchingAccountRef.current = true;
  let cancelled = false;
  (async () => {
    try {
      const res = await fetchCust(userid);
      if (cancelled) return;
      if (res?.customer) setCustomerData(res.customer);
      setCustomerLoading(false);
    } finally {
      fetchingAccountRef.current = false;
    }
  })();
  return () => { cancelled = true; };
}, [currentPage]);
```

Same shape for `expiring`.

**Step 6: Manual smoke check**

Run `npm start`, log in, go to Settings.
1. Rapid-tap "Account Info" 5× — only one `getCustomerDetails` request in Network panel.
2. Rapid-tap "Expiring Channels" 5× — only one expiring request.
3. Submit the support form once — button shows "Submitting…" + dimmed; cannot be re-tapped until the response returns.
4. Tap the menu items — gold press flash visible on each.

**Step 7: Commit**

```bash
git add src/Modules/Setting.jsx
git commit -m "feat(settings): tap lock + per-handler in-flight guards + data-disabled buttons"
```

---

## Task 10: End-to-end manual verification on TV

**Files:** none (verification only)

**Step 1: Build for production**

```
npm run build
```

Expected: `build/` directory created, no warnings about missing files.

**Step 2: Package the IPK**

```
ares-package build/
```

Expected: `com.lg.bbnl_2.0.0_all.ipk` created in the project root.

**Step 3: Install on the TV**

Assuming `ares-setup-device --add tv <TV_IP>` is already configured:

```
ares-install --device tv com.lg.bbnl_2.0.0_all.ipk
ares-launch --device tv com.lg.bbnl
```

**Step 4: Open DevTools against the TV**

```
ares-inspect --device tv com.lg.bbnl
```

**Step 5: Run the verification matrix**

For each row, both Magic Remote OK and pointer click should behave identically.

| # | Action | Pass criteria |
|---|---|---|
| 1 | Home → tap "Subscribed Channels" once | Page chrome appears <100 ms; grid fills <500 ms; gold press flash on the category card visible for ~120 ms; no Home freeze |
| 2 | Home → tap "Subscribed Channels" 5× rapidly (within 600 ms) | Exactly one navigation; exactly one set of fetches in DevTools Network; only the first tap shows the press flash |
| 3 | Home → channel tile in Sports row | Press flash; navigates to player; HLS manifest fetched |
| 4 | LivePlayer → hold DOWN through 10 channels in ~2 s | Info bar updates smoothly; "tuning…" subline visible; exactly **one** `.m3u8` request fires when key released |
| 5 | LivePlayer → press OK on sidebar channel | Tunes immediately (no 300 ms delay) |
| 6 | LivePlayer → rapid-tap same sidebar channel 5× | Exactly one HLS reload |
| 7 | Settings → tap "Account Info" 5× rapidly | Exactly one `getCustomerDetails` request; press flash on first tap |
| 8 | Settings → submit Support form once | Button shows "Submitting…" + dimmed (`data-disabled`); cannot be re-tapped while in flight |
| 9 | LiveChannels search box → type "star" rapidly | No double-trigger; existing 1500 ms debounce intact |
| 10 | Magic Remote BACK on every screen | Returns to /home (existing behavior preserved) |
| 11 | DevTools Performance recording on Home → "All Channels" | No long task >300 ms on the main thread |

**Step 6: If anything fails, do not commit. Report the failing case and stop.**

**Step 7: If all pass, final commit**

```bash
git add docs/plans/2026-04-29-tap-latency-and-mistaps-design.md docs/plans/2026-04-29-tap-latency-and-mistaps-plan.md
git commit -m "docs: tap latency & mistap prevention design + plan"
```

---

## Rollback notes

Every task ships in its own commit. To roll back any single layer:

```bash
git revert <commit-sha-of-failing-task>
```

The hook is opt-in — handlers not wrapped with `useTapAction` retain their old behavior. The CSS additions (`data-pressed`, `data-disabled`) are no-ops on elements that don't carry those attributes. The two-pass render is a behavioral change but the skeleton fallback already exists in `LiveChannels.jsx`, so the worst case at any commit is "skeleton briefly flashes" — not a broken screen.

## Out of scope

- Grid windowing/virtualization — deferred per the design doc; revisit only if a category has >300 channels and scrolling feels sluggish.
- `<picture>`/AVIF for channel logos.
- HLS.js config tuning in `StreamPlayer.jsx`.
- Pre-mounting routes (memory-heavy on TV).

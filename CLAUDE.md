# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LG webOS Smart TV IPTV app (`com.lg.bbnl` v2.0.0). React 19 SPA built with `react-scripts`, packaged into `com.lg.bbnl_2.0.0_all.ipk` for webOS deployment.

> The README is partially outdated. Trust this file and `package.json` over the README for stack/architecture details. Notable inaccuracies in README: it lists Material-UI, RxJS, Video.js, Tailwind, and HashRouter — none are used. Actual stack is React 19 + zustand + axios + hls.js + `MemoryRouter`.

## Commands

```bash
npm start           # CRA dev server at http://localhost:3000
npm run build       # production build → ./build (homepage:"./" → relative asset paths for IPK)
npm test            # Jest watch via react-scripts
npm test -- --watchAll=false --testPathPattern=<name>   # run a single test
```

webOS packaging / install (LG `ares-cli` must be installed separately):

```bash
ares-package build/                                  # produce .ipk
ares-setup-device --add tv <TV_IP>
ares-install --device tv com.lg.bbnl_2.0.0_all.ipk
ares-launch --device tv com.lg.bbnl
ares-inspect --device tv com.lg.bbnl                 # Chrome DevTools on TV
```

## Architecture

### Routing — `src/App.js`

Uses **`MemoryRouter`**, not HashRouter or BrowserRouter — this is intentional for webOS. Auth gate is a `localStorage.isAuthenticated` boolean checked synchronously in `useState` initializer; every protected route is wrapped with `isAuthenticated ? <Page/> : <Navigate to="/login"/>`. All page components are imported eagerly — **do not introduce `React.lazy`**, the comment "zero lazy loading = instant page transitions on LG TV" is a deliberate decision.

### `GlobalBackHandler` (App.js)

Critical webOS quirk: with `MemoryRouter`, browser history has only 1 entry, so the webOS BACK key (keyCode `461`) triggers the native "exit app?" dialog on every screen. The fix is a dummy `history.pushState({guard:true}, '')` entry pushed whenever the route is *not* `/`, `/home`, or a self-handled route. `popstate` is caught and rerouted to `/home`. A capture-phase `keydown` listener on `461` / `'GoBack'` / `'Back'` is the fallback.

**Self-handled BACK routes** (own their own capture-phase listener with `e.stopPropagation()`): `/login`, `/player`. If you add another page that needs custom BACK behavior, add it to `selfHandledRoutes` in `App.js` *and* register your own capture-phase listener.

### State — zustand (`src/store/`)

All global state is zustand (`create(...)`). There is no RxJS in the project despite the README. `HomeStore.jsx` is misnamed — it's the **shared HTTP helpers module**, not a store. It exports `postJson`, `postForm`, `buildAuthPayload`, and `nowMs`, which every other store imports. Real stores: `AuthStore`, `LiveChannelsStore`, `LivePlayersStore`, `ChannelsSearchStore`, `FeedbackStore`, `LogineOttp`.

Channel data is cached in `LiveChannelsStore` keyed by `${userid}|${mobile}|${grid}` with a 30-min TTL; categories have a 2-hr TTL. Channel lookup maps (`byNumber`, `byId`) are precomputed at fetch time — use `getChannelByNumber(payload, value)` instead of scanning the channels array.

### API layer — `src/server/`

- `config.jsx` — single `API_BASE_URL_PROD` (`http://124.40.244.211/netmon/cabletvapis`), `API_ENDPOINTS` map, and a **global axios request interceptor** that injects `deviceID` and `Authorization: Basic ...` on every request. The hardcoded Basic auth token and base URL live here; there is no env-based config.
- `Deviceinformaction/LG-Devicesinformaction.jsx` — `useDeviceInformation()` hook fetches device UUID, public/private IPs, MAC addresses, model, firmware in parallel via webOS Luna APIs with 5s timeouts each. Uses `getFormattedDeviceId()` from `utils/deviceStorage.js` (LGUDID → MAC → localStorage UUID fallback).
- `OAuthentication-Api/Applock.jsx` — server-side device lock check. `App.js` calls this after auth + device info are ready; if `result.locked` is true, the `<ServiceLocked/>` component overlays the entire app and blocks interaction.
- `modules-api/trpdata.jsx` — analytics ping called when stream URLs change in `LivePlayer.jsx`.

> Directory names contain typos that are load-bearing for imports: `Deviceinformaction` (not `Deviceinformation`), `Modules-Erros` (not `Modules-Errors`). Don't "fix" them in isolation — every import path will break.

### Remote control & focus engine — `src/Remote/useMagicRemote.js`

Exports two hooks. **Both bypass React state for focus** — this is the core perf design.

- `useMagicRemote({ onOKKey, onBackKey, onArrowKey, onNumberKey, onDeleteKey, onCoordinateChange, ... })` — low-level. Wires keydown for TV keys (LEFT 37, UP 38, RIGHT 39, DOWN 40, OK 13, BACK 461, color/media keys) and subscribes to webOS Magic Remote sensor data via `luna://com.webos.service.mrcu` (`sensor2/getSensorEventData` on webOS 24+, `sensor/getSensorData` otherwise). Coordinates live in a ref, never state.
- `useEnhancedRemoteNavigation(items, { columns, orientation, onSelect, ... })` — high-level grid/list navigation. Returns `getItemProps(index)` to spread on each item. Supports number-key channel jump (`numberJumpField` defaults to `'channelno'`, 1s commit timeout). `orientation` is `'horizontal' | 'vertical' | 'grid'`.

**Focus styling rules — read these before touching any focusable component:**

1. Focus is applied by setting `data-focused="true"` / `data-hovered="true"` attributes directly on DOM nodes from refs. **No `useState` for focused index.** Inline styles based on `focusedIndex` are forbidden — they cause re-renders on every keypress.
2. Visual focus styles live in **`public/index.html`** inside a `<style>` block, scoped via class+attribute selectors like `.focusable-sidebar-item[data-focused="true"]`, `.focusable-button[data-focused="true"]`, `.focusable-language-card[data-focused="true"]`. To style a new focusable widget, add a `focusable-*` class to its element and add a matching `[data-focused="true"]` rule in `public/index.html`.
3. **Never call `.focus()` or set `tabindex="0"`** on items. `getItemProps` forces `tabindex="-1"` to suppress the LG webOS native blue spatial-navigation ring. The HTML root has `style="-webkit-spatial-navigation: none"` and a global `outline: none !important` rule for the same reason.
4. `App.js` wraps everything in `<div data-focusable-container>` — needed by the focus engine.

### webOS environment — `src/utils/`

- `webos.js` — `initializeWebOSEnvironment()` and `preventWebOSDefaults()` are called once from `App.js`. `ensureWebOSService()` shims `window.webOS.service.request` over `PalmServiceBridge` when running in developer mode without `webOSTV.js`. `public/webOSTV.js` is loaded by `index.html` for production.
- `magicRemoteUIStability.js` — adds CSS class hooks (`magic-remote-mode-active`) and a runtime `<style>` block that disables `transform` on focused elements. This is why focus styles in `index.html` use `border` rather than `scale()` — transforms blur text on TV panels and break alignment when the Magic Remote pointer is active.
- `deviceStorage.js` — wraps device-ID retrieval; the resulting ID is read at request time via `localStorage.lgtv_device_id_pinned` (prefixed `TV-`) by `getDefaultHeaders()` in `config.jsx`.

### Stream player — `src/Pages/StreamPlayer.jsx`

`hls.js`-based HLS player. Adds `package_id`, `app_name`, `platform`, `app_version` headers to every `.m3u8` / `.ts` / `.key` request via `xhrSetup`. Implements its own retry/stall/buffer-cleanup logic (`MAX_NETWORK_RETRIES=3`, `STALL_TIMEOUT=10s`, `BUFFER_CLEANUP_INTERVAL=2min`) and handles webOS media keys (Play 415, Pause 19, Stop 413, FF 417, Rewind 412, PlayPause 179).

### Component layering

```
src/Modules/        page-level screens (Home, LiveChannels, LivePlayer, LoginOtp, Setting, ...)
src/Pages/          shared full-page widgets (StreamPlayer)
src/error/          error overlays — Modules-Erros/, OAuthentication/
src/store/          zustand stores + HomeStore.jsx (HTTP helpers, not a store)
src/server/         API endpoints, axios config, device-info hook
src/Remote/         Magic Remote + DOM focus engine
src/utils/          webOS bootstrap, device storage, UI stability
public/index.html   global CSS for focus styles — edit here, not in components
public/appinfo.json webOS app manifest (id, version, supported resolutions, permissions)
```

## webOS specifics worth remembering

- BACK key is `keyCode 461` / `event.key === 'GoBack'` or `'Back'`.
- Required webOS permissions in `appinfo.json`: `deviceid.query`, `networkconnection.query`, `mrcu.operation`.
- Supported resolutions: 720p / 1080p / 4K. Browserlist target is **Chrome >= 53** — avoid syntax/APIs newer than that without verifying transpile output.
- `homepage: "./"` in `package.json` is required so CRA emits relative asset paths the IPK can serve.
- When debugging, `ares-inspect --device tv com.lg.bbnl` opens Chrome DevTools against the running app.

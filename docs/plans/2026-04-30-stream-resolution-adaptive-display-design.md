# Stream Resolution Adaptive Display — Design

**Status:** approved 2026-04-30. Implementing immediately.
**Problem:** Live channel streams arrive at varying source resolutions (SD 720×576, HD 1280×720, FHD 1920×1080, occasionally 4K). The `<video>` element in `src/Pages/StreamPlayer.jsx` is rendered at `100vw × 100vh` with `objectFit: cover`. `cover` crops the long axis whenever stream aspect ≠ panel aspect — 4:3 SD news loses its left/right edges, 21:9 cinematic streams lose top/bottom. There is also no awareness of the panel's actual resolution: hls.js picks ABR levels purely on bandwidth, so a 1080p panel may pull 4K segments and downscale them on-CPU, stuttering on lower-end webOS hardware.

## Strategy

Three changes inside `src/Pages/StreamPlayer.jsx`, one new utility (`src/utils/panelResolution.js`), and one thin Luna wrapper added to `src/utils/webos.js`. No changes to `LivePlayer.jsx`, `appinfo.json`, the API layer, stores, or focus engine. ~80 added lines across two files, one new file (~50 lines).

### A. Panel resolution detection

New `src/utils/panelResolution.js` exports a single memoized async function:

```js
export async function getPanelResolution() { ... }
```

Detection chain (first match wins):

1. **Luna `luna://com.webos.service.tv.systemproperty/getSystemInfo`** with `keys: ['UHD', 'screenWidth', 'screenHeight']`. 1500 ms timeout (matches the existing `LG-Devicesinformaction.jsx` pattern). On LG webOS this returns the panel's native resolution.
2. **`window.screen.width × window.screen.height`** — JS standard, reliable on webOS.
3. **`window.innerWidth × window.innerHeight`** — last-resort fallback (dev-mode browser).

Returns:

```js
{
  width: 1920,
  height: 1080,
  aspect: 1.777,
  tier: 'HD' | 'FHD' | 'UHD',
  source: 'luna' | 'screen' | 'window',
}
```

Tier thresholds: `width ≥ 3000` → UHD, `width ≥ 1700` → FHD, else HD.

Memoized after first call — panels don't change at runtime. Module-level promise cache so the second caller awaits the same in-flight probe rather than firing a duplicate Luna request.

A new `getWebOSDisplayInfo()` helper goes into `src/utils/webos.js`, mirroring the existing `getWebOSSystemInfo` shape and reusing `ensureWebOSService()`.

### B. HLS quality capping in MANIFEST_PARSED

Inside the existing `hls.on(Hls.Events.MANIFEST_PARSED, ...)` handler in `StreamPlayer.jsx:173`, after the existing log + autoplay code:

```js
const panel = panelRef.current;
const levels = data.levels || [];
if (panel && levels.length > 1) {
  const slack = panel.width * 1.05;
  let capIndex = -1;
  for (let i = 0; i < levels.length; i++) {
    const lw = levels[i].width;
    if (typeof lw === 'number' && lw <= slack) {
      if (capIndex === -1 || lw > levels[capIndex].width) capIndex = i;
    }
  }
  // Fallback: every level is larger than the panel — pick the smallest.
  if (capIndex === -1) {
    capIndex = levels.reduce(
      (min, l, i) => (l.width && l.width < (levels[min].width || Infinity) ? i : min),
      0,
    );
  }
  hls.autoLevelCapping = capIndex;
  hls.startLevel = capIndex;
  console.log(
    `[HLSPlayer:Display] panel=${panel.width}x${panel.height} (${panel.tier}) ` +
    `levels=[${levels.map(l => `${l.width || '?'}x${l.height || '?'}`).join(',')}] ` +
    `cap=#${capIndex} (${levels[capIndex].width}x${levels[capIndex].height})`,
  );
}
```

`autoLevelCapping` is hls.js's built-in ABR ceiling. `startLevel` only affects the very first segment but avoids the "first 5 s pixelated, then sharpens" cold-load effect.

What we explicitly do NOT do: override `currentLevel`, force a level, or disable ABR. Capping the ceiling is the only intervention; hls.js still adapts downward freely on bandwidth drops.

### C. Stretch-to-fill rendering

Replace the `<video>` style block (`StreamPlayer.jsx:307`):

```jsx
<video
  ref={videoRef}
  style={{
    width:  panel?.width  ? `${panel.width}px`  : '100vw',
    height: panel?.height ? `${panel.height}px` : '100vh',
    objectFit: 'fill',                  // stretch — no crop, no bars
    backgroundColor: '#000',
    position: 'absolute',
    top: 0,
    left: 0,
    margin: 0,
    padding: 0,
  }}
  playsInline
  muted={false}
  controls={false}
/>
```

Why pixel dimensions instead of `100vw / 100vh`: on some webOS firmwares the CSS viewport reports 1280×720 even on a 1080p panel (CSS-scaled). Under `objectFit: fill` this would render the video at the smaller surface and leave the panel partially black. Detected pixels guarantee we paint to the hardware surface.

The wrapper `<div>` keeps `100vw × 100vh` — it's just the black backdrop and ad-overlay anchor.

Panel detection is async; it's mirrored into a `useState` so a re-render commits exact pixel sizes once detection resolves. Until then (typically <50 ms after mount) the video falls back to `100vw / 100vh` — visually correct in 99% of cases, just imprecise.

## Trade-offs accepted

- **Aspect distortion.** A 4:3 SD stream on a 16:9 panel stretches ~33% horizontally; faces look slightly wider. A 21:9 stream stretches ~33% vertically. This is the cost of "no black bars, ever" — chosen by the product owner over letterboxing.
- **No user-facing picture-mode toggle.** The simpler "always stretch" option was chosen over a Auto/Fit/Stretch/Original toggle. Can be added later without revisiting the layer.
- **Panel detection adds one Luna call at first player mount.** ~10–50 ms in practice; runs in parallel with HLS init, so does not block first frame.

## Out of scope (deferred)

- Picture-mode toggle (Auto / Fit / Stretch / Original).
- Per-channel aspect override (some user apps remember "this channel is 4:3, stretch to 16:9").
- Applying the layer to the OTT/movies module — `MoviesOtt.jsx` does not currently render `<HLSPlayer>` itself; if it ever does, it inherits the layer for free.
- Parallax/black-edge mirroring (the "ambient" filler used by some premium apps to disguise pillarboxing).

## Edge cases handled

- Luna `getDisplayInfo` not available (older webOS / dev mode) → silent fallback to `screen.*`.
- Stream-resolution metadata missing on a level → skip that level in cap selection; never break playback.
- Panel detection takes >1.5 s → timeout fires, fallback used; cached value applies on the next channel switch.
- `videoWidth = 0` (codec failure, not sizing) → existing fatal-error retry path handles it; the display layer is uninvolved.
- Mid-session viewport resize (dev mode only) → optional `window.resize` listener, gated on `!isWebOSTV()`.
- Single-level manifest → `levels.length > 1` guard skips capping; hls.js plays the only variant.

## Diagnostic logging

Single channel: `console.log("[HLSPlayer:Display] ...")`.

- One log on first panel detection: source, dimensions, tier.
- One log per `MANIFEST_PARSED`: levels enumerated, panel size, chosen cap index.
- No new noise on hot paths.

## Test plan

- **Unit:** `panelResolution.test.js` — mock `window.webOS.service.request`, `window.screen`, `window.innerWidth/Height`. Cover Luna success / Luna timeout / Luna failure / `screen.*` path / memoization.
- **Manual on TV (`ares-inspect`):**
  1. SD 4:3 channel on a 1080p panel → fills, horizontal stretch visible, no bars; log shows `panel=1920x1080 cap=#<lower>`.
  2. HD 16:9 channel → pixel-perfect, no visible regression.
  3. Switch through 5 channels rapidly → no flicker, cap log fires once per switch.
  4. Force fatal error (block segment URL in DevTools) → existing recovery path unaffected.
- **Sanity:** before/after data-rate sample on a 1080p panel; capping should drop bytes/min on any channel that previously delivered 4K segments.

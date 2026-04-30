# Stream Buffer & Resilience Tuning — Design

**Status:** revised 2026-04-30 after live diagnostics. Initial hypothesis (memory pressure) was disproved; replaced with a network-resilience tuning targeting the actual bottleneck.

## Diagnostic findings

Captured via Chrome DevTools Protocol against the running app over a 5-minute window (BBNL CDN, residential WiFi):

```
SEGMENT DOWNLOAD TIMINGS  (n=102)
  min=1ms  p50=3223ms  p90=6471ms  p99=10712ms  max=19840ms
  54% of segments took >3 s

ERROR PATTERN              (none fatal — all hls.js non-fatal)
  bufferStalledError    — video element underran the buffer
  levelLoadTimeOut      — master/level .m3u8 took >10 s (our limit)
  fragLoadTimeOut       — segment took >20 s (our limit)
  fragLoadError 404     — CDN aged the segment out before we asked

ERROR DISTRIBUTION OVER 5 MIN      (calm-then-bursty)
  min 0-1: 0 errors    min 1-2: 0 errors    min 2-3: 0 errors
  min 3-4: 4 errors    min 4-5: 3 errors

JS HEAP                  flat (6.2 → 5.9 MB) — memory hypothesis refuted
```

Conclusion: the dominant problem is a flaky CDN/WiFi link where p90 segment download (6.5 s) approaches segment duration (~5 s). When a stall happens, by the time the player asks for the next segment the CDN has aged it out → 404 → cascade into a level reload that also times out. None of this is fatal in hls.js terms, so what the user sees is the loader spinner cycling rather than a true reconnect.

## What we are NOT doing

- **NOT capping buffers tightly.** An earlier hypothesis suggested memory pressure caused 30–60 s reconnects; the heap timeline showed flat 5.9–6.3 MB across 5 minutes. Tight caps would actively hurt resilience on this network.
- **NOT changing the StreamPlayer recovery loop.** No fatal errors fired — the existing exponential-backoff path is never triggered.
- **NOT addressing identity-string drift, persistence, or APIs.** Out of scope.

## What we ARE doing

One surgical edit in `src/Pages/StreamPlayer.jsx` (the `new Hls({...})` config plus the loader-spinner debounce). One file, one commit, one revert.

### A. Resilience-tuned hls.js config

```js
levelLoadingTimeOut: 20000,            // was 10000 — level fetches hit ≥10 s
fragLoadingTimeOut:  30000,            // was 20000 — max segment time 19.8 s
maxBufferLength:     30,               // generous forward buffer
maxMaxBufferLength:  60,               // 1-min hard ceiling (was default 600)
backBufferLength:    30,               // memory hygiene (was default ∞)
liveSyncDurationCount:        4,       // sit ~4 segments (~24 s) behind live
liveMaxLatencyDurationCount: 10,
```

Trade: ~24 s of latency-from-realtime for substantially fewer age-out 404s and stall cascades. Acceptable for IPTV.

### B. Spinner debounce (kept from earlier revision)

`waiting` and `stalled` events fire on every minor buffer top-up; with this network they fire often. Debounce by 600 ms; `playing` / `canplay` cancels the pending show. 600 ms ≈ one healthy segment fetch — real stalls still surface within a second; routine micro-stalls stay invisible. Plus reset `recoveryAttempts = 0` on `canplay` (not just `playing`) so a brief stutter doesn't inflate the backoff for the next fatal error (if one ever happens).

## Verification

Pre/post comparison on a real TV via the existing CDP probe (`docs/plans/stream_probe.mjs`):

1. `npm run build && ares-package build/ && ares-install --device tv com.bbnl.iptv_2.0.0_all.ipk && ares-launch --device tv com.bbnl.iptv`.
2. `ares-inspect --device tv --app com.bbnl.iptv` → grab tunneled localhost URL, then `node docs/plans/stream_probe.mjs ws://localhost:<port>/devtools/page/<id> 300`.
3. Compare against the baseline (`min 3-4: 4 errors, min 4-5: 3 errors, 54% segments >3 s`):
   - `fragLoadError 404` count should drop substantially (the live-edge offset prevents this).
   - `levelLoadTimeOut` count should drop (timeout doubled).
   - `bufferStalledError` may persist — they reflect the link, not config — but each one should resolve sub-second so the spinner debounce hides them.

## Limits

The link is the dominant variable; code can absorb spikes but cannot make them disappear. If post-deployment probe still shows `fragLoadError 404 ≥ 1` per 5 min, the next escalation is to add `lowLatencyMode: false` explicitly and bump `liveSyncDurationCount` to 6. Do not retune ad hoc without a fresh probe capture.

## Rollback

Single commit on top of `f47f7be`. `git revert <sha>` returns to today's exact behavior.

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

---

# Revision 3 — Cascade-recovery (post-deploy audit)

After deploying revisions 1 and 2, a 60-second comprehensive audit (`docs/plans/stream_audit.mjs`) caught the player in a stuck state on `tv9kannada`:

```
STATE SNAPSHOT (60 s apart):
  start   readyState=4  bufferedAhead=5.6 s   currentTime=337.6   bodyText=""
  end     readyState=1  bufferedAhead=0.0 s   currentTime=380.2   bodyText="Reconnecting…"

→ playback advanced 42 s in 60 s → 18 s of dead time
→ ZERO API requests during capture (the /stream refresh path never fired)
```

## Root causes identified, ranked

- **RC-1** (dominant): cascade failure with no recovery. Slow segment → buffer drains → currentTime drifts → CDN ages out next segments → fragLoadError 404 storm. Each 404 is **non-fatal**, so the existing fatal-error retry path never triggers.
- **RC-2**: `/stream` URL refresh only fires every 4th *fatal* recovery attempt. Non-fatal 404 storms never get a fresh URL.
- **RC-3**: `liveMaxLatencyDurationCount: 10` ≈ 60 s — by the time hls.js auto-seeks to live edge, the CDN window has aged out everything.
- **RC-4**: `fragLoadingMaxRetry: 6` retries the same dead segment URL 6 times — wasted time.
- **RC-5**: `levelLoadingMaxRetry: 4 × 20s = 80s` before fatal — `/stream` refresh is too late.
- **RC-6**: BBNL CDN serves only 1 quality per channel. **Server-side gap, cannot fix client-side.**
- **RC-7**: User network is genuinely slow (segment p90 = 13.4 s vs 5 s segment duration). **Cannot fix client-side.**
- **RC-8**: 18 s of cold-launch IPv4/IPv6 detection failures. Out of scope for streaming.
- **RC-9**: ~40k DOM nodes mounted (whole channel sidebar). Out of scope.
- **RC-10**: zero JS exceptions, flat heap. **Code is healthy** — issues are all player-vs-network adaptation.

## Revision 3 changes (RC-1 through RC-5)

### A. Tighter retry budgets

```js
levelLoadingTimeOut: 15000,            // was 20000
levelLoadingMaxRetry: 2,               // was 4   — fatal ≤30 s on dead level
fragLoadingMaxRetry: 2,                // was 6   — don't grind on aged-out segments
liveMaxLatencyDurationCount: 5,        // was 10  — hls.js snaps to live sooner
```

### B. Cascade detector in `Hls.Events.ERROR` handler

Runs on **non-fatal** events too. Tracks frag 404 timestamps in a 30 s sliding window. On ≥3 hits within the window:
1. Seek to live edge (`video.seekable.end - 6 s`) so hls.js requests fresh segments instead of grinding aged-out ones.
2. Trigger `/stream` URL refresh in parallel; swap in the fresh URL if one comes back.
3. Cool down for 15 s so the seek + URL refresh have a chance to take effect before re-firing.

`frag404Timestamps` resets on `playing` / `canplay` so a successful recovery clears the cascade state.

## Verification

Re-run the audit (`docs/plans/stream_audit.mjs`) for 60 s. Expect:
- Cascade detection lines in console (`[HLSPlayer] Cascade detected — N frag 404s …`).
- `/stream` API call appearing in the network log when cascade fires.
- `currentTime` advancing closer to wall-clock seconds (less stalled time).
- `frag404` count dropping over time as recovery breaks the cycle faster.

## What this STILL won't fix

- Server-side single-bitrate (RC-6).
- Genuinely slow user network (RC-7).
- Cold-launch IP detection delay (RC-8).
- DOM node count (RC-9).

---

# Revision 4 — Loader spinner debounce bump

User scope: display the server-provided stream as-is, no client-side modification of how it plays. Adaptive playback rate (a 0.95×/1.0× variant of this revision) was implemented, then **removed** at user request — it manipulates the perceived stream tempo to mask buffer underrun, which counts as a client-side adaptation. Reverted.

What remains in this revision: a single UI tweak that does not touch the stream itself.

### Loader spinner debounce 600 ms → 1500 ms

With the cascade detector now in place, most stalls resolve well under 1.5 s. The spinner becomes a genuine "we're stuck" signal instead of flashing on every blip. 1500 ms is the canonical "user starts noticing something is wrong" threshold from web perf research. Strictly UI; the underlying playback is unchanged.

---

# Revision 5 — Final scope reset (reverted to bug fix + UI only)

User scope: "I want a smooth playback i.e., no our side problem while streaming the app — that's all. Why are you implementing the optimization of video speeds? That is out of scope."

The audits had already proved what mattered:
- Heap is flat — no leak.
- Zero JS exceptions — no code crashes.
- No failed API calls — backend integration is healthy.
- The streaming pain is the network/CDN, not this app.

That makes everything in revisions 1, 2, 3 (buffer caps, retry-budget tightening, live-edge tuning, cascade detector with seek + `/stream` refresh) **client-side adaptation in response to network conditions** — exactly the category the user said is out of scope. **All four reverted.**

## What actually ships from this whole exercise

Two changes, both surgical, neither manipulates how the stream plays:

### A. Dead-manifest fail-fast (real bug fix)

Before: a channel whose CDN master manifest URL returns 404 (e.g. `aakashaath/index.m3u8` — confirmed dead) would put the player into an infinite retry loop because the existing handler comment explicitly says *"live TV never surfaces a permanent failure to the user"*. End state: forever "Reconnecting…" on a black screen with no escape.

After: when `MANIFEST_LOAD_ERROR` + `responseStatus === 404`, mark the src as given-up, stop hls.js, call the parent's `onChannelUnavailable` callback. `LivePlayer` clears `currentStream` (which unmounts the player and its retries) and surfaces the existing `ChannelNotFound` modal with the channel number; on dismiss, `navigate(-1)` so the user lands back on the previous screen instead of a black canvas.

All other fatal errors (transient network, level load failures, segment 404s) keep the existing infinite-retry behavior. The only thing this changes is: when the server says "this channel does not exist", we believe it.

### B. Loader spinner debounce 200 ms → 1500 ms

`waiting` and `stalled` events fire on every minor buffer top-up; with the original 200 ms timer, "Reconnecting…" flashed constantly during normal playback over a flaky link. 1500 ms means the text only appears when something is genuinely stuck for >1.5 s. Strictly a UI text-timing change; the underlying hls.js behavior is untouched.

## What is explicitly NOT shipped

- No buffer caps. hls.js defaults.
- No retry-budget tightening. hls.js defaults.
- No `liveSyncDuration`/`liveMaxLatencyDuration` tuning.
- No cascade detector / seek-to-live / `/stream` refresh on 404 storms.
- No adaptive playback rate.
- No quality / variant / bandwidth-based decisions of any kind.

The player displays exactly what the server delivers, at 1.0× rate, with hls.js's stock recovery behavior — except for the one terminal case (dead manifest) where giving up is the correct answer.

## Files touched (final scope)

- `src/Pages/StreamPlayer.jsx` — adds `onChannelUnavailable` prop, `givenUpRef` + reset on src change, dead-manifest detection in `Hls.Events.ERROR`, spinner debounce timing (200 → 1500 ms), `recoveryAttempts = 0` on `canplay` (small consistency fix tied to the same effect).
- `src/Modules/LivePlayer.jsx` — passes `onChannelUnavailable` to `HLSPlayer`, defines the callback (clears `currentStream`, surfaces `ChannelNotFound` modal), modal `onClose` bounces back when `currentStream` is empty.
- `docs/plans/2026-04-30-stream-buffer-tuning-design.md` — this document, with revisions 1–5 preserved as the honest record of what was tried, why it was rejected, and what actually ships.

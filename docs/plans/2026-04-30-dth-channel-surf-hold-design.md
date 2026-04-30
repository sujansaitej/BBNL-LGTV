# DTH-Style Channel Surf on UP/DOWN Hold — Design

**Date:** 2026-04-30
**Owner:** ramachandraa-ps
**Scope:** `src/Modules/LivePlayer.jsx` (only)
**Branch:** `feat/api-integrations-and-stream-resilience`

## Problem

Holding UP / DOWN on the LG remote is supposed to scroll through channels DTH-style — continuous fast-forward until release, looping past unsubscribed channels without interruption. Two real failures break this today:

1. **Modal interrupt.** If the user pauses for >300 ms while parked over an unsubscribed channel, the `ChannelLocked` modal opens and steals all input. Surf is dead until the user manually dismisses.
2. **"Stops after ~5 s."** We rely entirely on webOS native key-repeat. Different LG firmwares throttle / drop repeated `keydown` events inconsistently. Combined with `<HLSPlayer>` mount jitter on each commit, the surf stalls mid-hold.

## Goal

DTH STB feel: hold UP/DOWN → channels cycle smoothly at ~5 changes/second, looping over the entire list (subscribed + unsubscribed alike), info bar updates per step. On release, the player commits to whatever channel the user landed on. The locked-channel popup appears only after a deliberate idle on a locked channel — not mid-scroll.

## Non-goals

- Skipping locked channels entirely during surf (would contradict "loop through ALL channels").
- Changing the sidebar / numpad / `ChannelLocked` modal behaviour.
- Touching HLS playback, BACK cascade, info bar layout, or `pendingChannel`'s zap-settle structure beyond timing tweaks.

## Design

### State machine

Replace "step on every keydown, debounce 300 ms" with an explicit three-state machine:

```
IDLE ──first UP/DOWN keydown──▶ STEPPING ──same key keydown <180ms──▶ HOLDING
                                     │                                │
                                     │ keyup OR 350 ms keydown gap    │ keyup OR 350 ms keydown gap
                                     ▼                                ▼
                                   SETTLE ◀──────────────────────────┘
                                     │
                          250 ms after last step
                                     ▼
                       commit → load HLS / silently park
```

### Timing constants

| Constant            | Value   | Why                                                                         |
|---------------------|---------|-----------------------------------------------------------------------------|
| `HOLD_ARM_MS`       | 180 ms  | If a 2nd same-direction keydown lands within this window after the 1st step, it's a hold. |
| `SURF_STEP_MS`      | 200 ms  | Hold-mode interval. ~5 channels/sec — the "Medium" DTH feel.                |
| `KEY_ABSENCE_MS`    | 350 ms  | If no keydown of the active arrow arrives within this window, treat as released (keyup-fallback for webOS firmwares that drop keyup). |
| `SETTLE_COMMIT_MS`  | 250 ms  | Time after last step before we commit the destination.                       |
| `PARKED_IDLE_MS`    | 1500 ms | Idle window on an unsubscribed parked channel before the popup auto-opens.  |

### Refs (all new, no React state)

- `surfStateRef` — `'idle' | 'stepping' | 'holding'`.
- `surfDirRef` — `+1 | -1 | 0`.
- `holdArmTimerRef` — first → second keydown window.
- `surfIntervalRef` — `setInterval` handle while `holding`.
- `keyAbsenceTimerRef` — keyup-fallback gap timer; reset on every accepted keydown.
- `commitTimerRef` — replaces the inline `setTimeout` of the existing zap-settle effect for surf-driven settles. (Sidebar / numpad selects keep their existing path.)
- `parkedIdleTimerRef` — 1.5 s fuse for the locked popup.
- `popupShownForLockedRef` — `chid | chno` of the parked channel for which we already auto-opened the popup. Prevents looping the modal after the user dismisses.

### Keyboard handler changes (`LivePlayer.jsx` `onKey`)

The existing UP / DOWN block (lines 478-488) becomes:

1. Same early-return guards as today (sidebar / numpad / NotFound / locked modal open).
2. If `isLockedParkedRef.current` → kill `parkedIdleTimerRef` so any key restarts the idle clock.
3. Compute `dir = isUp ? +1 : -1`.
4. Reset `keyAbsenceTimerRef` with `KEY_ABSENCE_MS` → on fire, drop to SETTLE.
5. Branch on `surfStateRef.current`:
   - **idle** → `surfStateRef = 'stepping'`, `surfDirRef = dir`. Step `pendingChannel` once. Start `holdArmTimerRef` (`HOLD_ARM_MS`).
   - **stepping** AND `surfDirRef === dir` AND `holdArmTimerRef` still pending → user is holding. Cancel hold-arm timer, transition to `'holding'`, step once more, start `surfIntervalRef` at `SURF_STEP_MS`. Subsequent native keydowns are **ignored** (we own the rate).
   - **stepping** AND `surfDirRef !== dir` → direction reversal mid-burst. Cancel hold-arm timer, step once in new dir, restart hold-arm timer with new dir.
   - **stepping** AND hold-arm timer already fired (gap >180 ms but <350 ms) → it's a slow tap, not a hold. Step once and stay in `'stepping'`.
   - **holding** AND same dir → **swallow** (interval owns it). Reset `keyAbsenceTimerRef`.
   - **holding** AND opposite dir → cancel interval, transition to `'stepping'`, step once in new dir, restart hold-arm timer.
6. UP / DOWN handler always calls `showInfo()` so the user sees the channel they're scrolling toward.

`keyup` listener (NEW): if `e.keyCode === 38 || 40`, drop to SETTLE immediately (don't wait for `KEY_ABSENCE_MS`). Best-case path on firmwares that report keyup correctly.

### Settle → commit

On entering SETTLE: clear `surfIntervalRef`, clear `holdArmTimerRef`, clear `keyAbsenceTimerRef`, set `surfStateRef = 'idle'`, set `surfDirRef = 0`. Then start `commitTimerRef` (`SETTLE_COMMIT_MS`).

On commit (the existing zap-settle effect at line 250):
- Subscribed → load HLS exactly as today.
- Unsubscribed → tear down stream, set `currentChannel = pendingChannel`, **do NOT** call `setLockedChannel(pendingChannel)`. Instead start `parkedIdleTimerRef` (`PARKED_IDLE_MS`) → on fire, if `popupShownForLockedRef.current !== chKey`, set `lockedChannel` AND `popupShownForLockedRef.current = chKey`.

If a new keydown arrives during the 250 ms commit window: cancel `commitTimerRef`, transition `idle → stepping`, fold into the surf machine. No commit happens until the user actually rests.

### Parked-idle timer rules

Started: at the moment of locked-park commit (zap-settle effect, locked branch).
Reset: on any keydown while `isLockedParkedRef.current === true`.
Killed: on park-channel change (different chid), on unmount, on `lockedChannel` already being set.
After dismissal: NOT restarted. `popupShownForLockedRef` matches the parked-channel key, so the timer's fire callback no-ops.
Reset of `popupShownForLockedRef`: when `currentChannel?.chid` (or `channelno`) changes — i.e. the user surfs onto a DIFFERENT channel.

### Cleanup

Add the four new timer refs (`holdArmTimerRef`, `surfIntervalRef`, `keyAbsenceTimerRef`, `commitTimerRef`, `parkedIdleTimerRef`) to the existing cleanup `useEffect` at line 547.

## Edge cases (and what we do)

| Case                                                          | Behaviour                                                                                          |
|---------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| Sidebar open + arrow key                                      | Surf machine never starts. `if (sidebarRef.current) return;` guard stays.                          |
| Numpad / `ChannelNotFound` / `ChannelLocked` modal open       | Surf machine never starts. Existing top-of-handler early returns stay.                             |
| Wrap-around (DOWN past last channel → first)                  | Already works via modulo in `stepChannel`. Unchanged.                                              |
| Direction change mid-hold (UP then DOWN without release)      | New direction's keydown re-enters STEPPING for that direction. Interval cleared, restart hold-arm. |
| Non-arrow key during HOLDING (digit, LEFT, OK, BACK)          | Force settle path, then the new key takes its normal effect.                                       |
| `<HLSPlayer>` mount jitter mid-hold                           | Eliminated — HLS only mounts on SETTLE commit, never during STEPPING/HOLDING.                      |
| webOS firmware drops `keyup`                                  | `KEY_ABSENCE_MS` (350 ms) gap detection settles regardless.                                        |
| User explicitly OK-selects locked channel from sidebar/numpad | Existing `selectChannelRaw` path opens modal immediately — unchanged. Deferred timer is surf-only. |
| Popup dismissed → user keeps surfing through more locked      | Each new locked-park landing starts its own 1.5 s timer (different chid → `popupShownForLockedRef` cleared). |
| Same locked channel re-parked after dismiss without leaving   | Won't happen — re-park can only follow a step away and back, which clears `popupShownForLockedRef`. |

## Files touched

- `src/Modules/LivePlayer.jsx` — surf state machine, keyup handler, deferred park modal, cleanup.
- (No other files.)

## Risk / rollback

Risk surface is small: changes are confined to one file's keyboard handler and the zap-settle effect's locked-branch. If the explicit interval misbehaves on some firmware, fallback to the current native-repeat path is a one-flag flip (set `SURF_STEP_MS = 0` and remove the `holding` swallow → degrades to today's behaviour minus the modal interrupt).

Rollback: `git revert <commit>`. No schema, no API, no persisted state.

## Verification

Manual smoke tests on a real LG TV (DevTools via `ares-inspect`):

1. Tap UP once on a subscribed channel → moves one channel, info bar shows new channel, HLS commits at ~250 ms.
2. Hold UP for 3 s → channels cycle at ~5/sec. Info bar updates per step. Stream of the original channel keeps playing throughout.
3. Hold UP across an unsubscribed channel without stopping → surf does NOT pause, no popup.
4. Release UP on an unsubscribed channel → info bar shows Locked badge. Wait 1.5 s without input → popup appears.
5. Release UP on an unsubscribed channel → press DOWN before 1.5 s elapses → popup never appears, surf resumes.
6. Hold DOWN past the end of the list → wraps to channel #1 cleanly.
7. Hold UP, then mid-hold press DOWN without releasing UP first → direction reverses smoothly.
8. Open sidebar, hold UP → sidebar handles it, surf machine stays idle.

## Open questions

None at design close. Implementation can proceed.

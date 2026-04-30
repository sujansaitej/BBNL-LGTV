# Locked-Channel Parking — Design

**Date:** 2026-04-30
**Status:** Approved (brainstorming complete; ready for implementation plan)
**Affects:** `src/Modules/LivePlayer.jsx`, `src/Modules/ChannelsDetails.jsx`, `src/error/Modules-Erros/ChannelLocked.jsx` (comments only)

## Problem

When a user tries to stream an unsubscribed (locked) channel, today's flow:

1. From Home / LiveChannels → tap locked tile → `/player` mounts, `ChannelLocked` modal opens, `currentStream` is forced to `""`.
2. Dismissing the modal calls `navigate(-1)`, bouncing the user back to the previous list screen.

This means the user **cannot park on a locked channel**. Worse, when the modal is dismissed without `navigate(-1)` (e.g. when the locked pick happens via the sidebar mid-session), the player falls into the `!currentStream` branch and surfaces a literal "No stream link provided." message — the "URL problem" the team has reported. The error message is masking the real issue: a locked channel has no playable URL by design, but the app treats "no URL" as an error state.

## Goal

Treat a locked channel as a **valid first-class player state**: the user lands on it, sees the chrome (info bar with channel logo, name, number, EPG line), can press OK to open the menu, type digits, channel-up/down, etc. — exactly like a normal channel — but no HLS engine runs. The lock-modal is the only thing that ever surfaces the "this channel needs a subscription" message; the rest of the screen is a normal player.

## State model

A new derived flag, **no new state variable:**

```js
const isLockedParked = currentChannel && !isSubscribed(currentChannel);
```

When `isLockedParked` is true:

- `currentStream` is forced to `""` (no HLS load).
- `ChannelsDetails` info bar is **persistently visible** (no auto-hide timer).
- A small lock badge renders next to the channel name in the info bar.
- All remote keys behave identically to a normal channel (OK→sidebar, digits→jump, UP/DOWN→step, LEFT→numpad, BACK→home).
- `RIGHT` (info-toggle) becomes a no-op (can't hide a pinned info bar).
- The "No stream link provided." fallback is removed; it was masking this case.

The modal (`ChannelLocked`) keeps its existing 2-step shape (Subscription Not Available → Coming Soon → Go Back). Only the parent's dismiss handler changes: it stops calling `navigate(-1)` and just clears `lockedChannel`. Because the user is already parked on the locked channel, closing the modal lands them where they need to be.

## Behavior matrix

| # | Entry path | Result |
|---|---|---|
| 1 | Home/LiveChannels → tap locked tile | `/player` mounts, `currentChannel=ch`, `currentStream=""`. Modal opens. **Dismiss** → parked on ch, info bar pinned, lock badge. |
| 2 | Home/LiveChannels → tap subscribed tile | Unchanged — stream plays. |
| 3 | On `/player` watching ch5 → sidebar pick locked ch8 | `currentChannel=ch8`, `currentStream=""` (ch5 HLS torn down). Modal opens. **Dismiss** → parked on ch8. |
| 4 | On `/player` watching ch5 → numpad/digit-jump to locked ch8 | Same as #3. |
| 5 | Parked on locked ch8 → press CH UP | `stepChannel(+1)` → `pendingChannel=ch9`. Zap-settle (300 ms). Locked → modal+park. Subscribed → plays. |
| 6 | Parked on locked ch8 → hold CH DOWN through 5 locked channels | pendingChannel advances each press; modal stays closed during rapid zap; after 300 ms idle, modal opens once for the final landed channel. No spam. |
| 7 | Parked on locked ch8 → OK | Sidebar opens. |
| 8 | Parked on locked ch8 → sidebar opens → re-pick same ch8 | No-op. Modal does not re-open. |
| 9 | Parked on locked ch8 → sidebar opens → pick subscribed ch5 | ch5 plays; lock state cleared. |
| 10 | Parked on locked ch8 → BACK (no overlays) | Navigate to `/home` (existing cascade). |
| 11 | Parked on locked ch8 → RIGHT | No-op. Info bar stays pinned. |

## Implementation

### `src/Modules/LivePlayer.jsx`

**Edit 1 — `selectChannelRaw` (lines 152-170):** when locked, park.

```js
if (channel && !isSubscribed(channel)) {
  // Re-selecting the channel we're already parked on is a no-op (matches
  // the same-URL early-return for subscribed channels).
  const cur = curChRef.current;
  const sameLocked = cur && !currentStream && (
    (cur.channelid && channel.channelid && String(cur.channelid) === String(channel.channelid)) ||
    (cur.channelno && channel.channelno && String(cur.channelno) === String(channel.channelno))
  );
  if (sameLocked) return;
  setLockedChannel(channel);
  setCurrentChannel(channel);
  setCurrentStream("");
  return;
}
```

**Edit 2 — Zap-settle effect (lines 225-242):** locked branch parks too.

```js
if (!isSubscribed(pendingChannel)) {
  setLockedChannel(pendingChannel);
  setCurrentChannel(pendingChannel);
  setCurrentStream("");
  setPendingChannel(null);
  return;
}
```

**Edit 3 — `stepChannel` (lines 204-220):** drop the skip-locked filter so UP/DOWN steps into locked channels.

```js
const stepChannel = useCallback((dir) => {
  const list = chListRef.current;
  if (!list.length) return;
  const startFromCh = pendingChannelRef.current || curChRef.current;
  const cur = findChIndex(startFromCh);
  const i = cur === -1 ? 0 : (cur + dir + list.length) % list.length;
  setPendingChannel(list[i]);
}, []);
```

**Edit 4 — Modal dismiss (lines 573-581):** drop the `navigate(-1)` branch.

```jsx
{lockedChannel && (
  <ChannelLocked
    channel={lockedChannel}
    onClose={() => setLockedChannel(null)}
  />
)}
```

**Edit 5 — Render block (lines 583-631):** collapse the `!currentStream ?` ternary. Always render chrome when `currentChannel` exists; only render `HLSPlayer` when `currentStream` is set. Pass `visible={isLockedParked || isDetailsVisible}` and `locked={isLockedParked}` to `ChannelsDetails`. Drop the "No stream link provided." literal.

**Edit 6 — Info-bar timer guards:** when `isLockedParked`, `hideInfo()` is a no-op and `showInfo()` does not arm the auto-hide timer. RIGHT-key info-toggle short-circuits to no-op. Implementation: read `lockedRef.current && !currentStream` (or a derived `isLockedParkedRef`) inside the helpers and the keyboard handler.

**Edit 7 — `/streamAds` polling (lines 276-302):** add `isLockedParked` to the early-return guard. Locked channels have no ad context.

### `src/Modules/ChannelsDetails.jsx`

Add an optional `locked` prop. When true, render a lock-icon badge next to the channel-name column. No structural layout change — the badge sits inline with the existing channel-name container. Visual weight should match existing inline indicators.

### `src/error/Modules-Erros/ChannelLocked.jsx`

No behavioral change. The existing `onClose` contract is preserved by Edit 4; the modal does not need to know that the parent now keeps the user parked.

## Edge cases

- **Mount with no `location.state`** — `currentChannel=null`, `currentStream=""`. The fallback "No stream link provided." line stays for this branch only. Otherwise unreachable in the app's flows.
- **Locked channel with no `streamlink` field** — common case. New code never reads it; `currentStream=""` is set explicitly.
- **Subscription state changes mid-session** — `isLockedParked` is derived per render, so the next render unlocks naturally.
- **Zap-settle race** — `selectChannelRaw` already clears `pendingChannel`; no change needed.
- **TRP analytics** (lines 261-267) — already guarded by `if (!s) return`. Empty stream = no ping. No change.
- **`StreamPlayer.jsx`** — never receives an empty `src` because the parent only mounts it when `currentStream` is truthy. Confirmed by reading the file: `StreamPlayer` itself has no terminal error UI; the "unable to play" message was always coming from `LivePlayer`'s `!currentStream` branch.

## Cleanup

- Remove the comment block at `LivePlayer.jsx:566-572` describing `navigate(-1)`.
- Remove the comment block at `LivePlayer.jsx:201-203` ("DTH-standard ↑/↓ stepping skips locked channels"); replace with a comment describing the new walk-freely + zap-settle-gates approach.
- Update the comment at `LivePlayer.jsx:148-151` to describe park-on-locked semantics.

## Testing

Manual on TV / dev (no automated tests in this codebase for player flows):

1. Verify entries 1-11 from the behavior matrix.
2. Verify info bar stays pinned on a locked channel even after 30 s idle.
3. Verify lock badge appears next to channel name on a locked channel and is absent on a subscribed channel.
4. Verify holding CH DOWN through a stretch of 5 locked channels opens the modal exactly once after release.
5. Verify dismissing the modal never produces "No stream link provided." or any black-screen error.
6. Verify `/streamAds` is not requested while parked on a locked channel (DevTools network panel).

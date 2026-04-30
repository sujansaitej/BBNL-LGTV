# Sidebar Menu Redesign — 2026-04-30

Component: `src/Modules/ChannelsSidebar.jsx` + focus styles in `public/index.html`.

## Why

Four user-facing issues with the current sidebar (the in-player menu opened with OK):

1. **Menu doesn't open on the playing channel.** It lands on the tab navigator (`tabnav` zone). The user has to press DOWN to even see channels. Auto-focus on the playing channel only kicks in *if* the user presses DOWN AND the persisted last tab happens to contain the channel.
2. **"All Channels" tab feels slow.** Switching to it freezes briefly because React mounts 1000+ `ChannelCard` nodes in one shot. (The data is already in memory — this is a render cost, not a network cost.)
3. **LEFT/RIGHT only changes tab inside `tabnav`.** Once the user has navigated DOWN into categories or channels, the only way to switch tabs is to UP all the way back to `tabnav`.
4. **Focus highlight is a faint white border on a dark navy background.** Hard to see at TV viewing distance. The "now playing" 8px cyan dot is even worse.

## Decisions

- **Q1 — Mount-time tab choice**: B. Last-used tab if the playing channel exists there, else its language tab, else Subscribed, else All.
- **Q2 — Lazy load**: B. Instant tab-title swap + 4-row skeleton during reconcile + chunked progressive render for "All Channels" only.
- **Q3 — L/R from non-tabnav zones**: A. Mirror Q1's "auto-focus playing channel in the new tab" behavior.
- **Q4 — Highlight redesign**: Direction A. Cyan focus tint + persistent left rail for now-playing + NOW PLAYING pill chip + cyan dot markers on tab title and category row.

## Architecture

### Shared `locateChannel` helper

Single source of truth for "where does this channel live in the tab/group tree":

```js
locateChannel(channel, tabs, allChannels, contentCategories, lastTabIdx) →
  { tabIdx, groupIdx, chIdx }   // groupIdx = -1 for All Channels (flat)
  // or null when channel can't be placed
```

Resolution order:

1. Check the last-persisted tab — if `channel` exists in its filtered list, use it.
2. Find the language tab whose `langid === channel.langid`.
3. If subscribed, fall back to the Subscribed tab.
4. Else fall back to the All Channels tab.

For grouped tabs, also resolves `groupIdx` by matching `channel.grid` against `contentCategories`.

This helper is called at three points:
- Mount-time auto-focus.
- LEFT/RIGHT in `categories` / `channels` zones.
- `onChevronClick` (mouse/touch).

### State changes

```diff
+ const [renderedTabIdx, setRenderedTabIdx]   = useState(activeTabIdx);
+ const [renderedCount,  setRenderedCount]    = useState(Infinity);
+ const playingTabIdxRef  = useRef(-1);
+ const playingGroupIdxRef = useRef(-1);
```

`renderedTabIdx` lags one frame behind `activeTabIdx` so the tab title pill commits before the content reconciles. `renderedCount` is `Infinity` for grouped tabs (render whole expanded group) and a chunked count (30, 60, 90, …) for the "All Channels" tab.

### Mount-time auto-focus

Replace the existing mount effect (`:262-267`) with:

```js
useEffect(() => {
  const cur = currentChannelRef.current;
  const loc = locateChannel(cur, tabsRef.current, allChannels, contentCategories, loadLastTab());
  if (loc) {
    setActiveTabIdx(loc.tabIdx);
    if (loc.groupIdx >= 0) setExpandedCat(loc.groupIdx);
    focusedCatRef.current = Math.max(0, loc.groupIdx);
    focusedChRef.current  = loc.chIdx;
    activeZoneRef.current = "channels";
    // For All Channels with a deep chIdx, seed renderedCount so the target
    // is mounted in the first paint. The [activeTabIdx] effect will run
    // applyZoneFocus once chRefs[chIdx] is populated.
    if (loc.tabIdx === <all-channels-idx> && loc.chIdx >= 30) {
      setRenderedCount(loc.chIdx + 30);
    }
  } else {
    activeZoneRef.current = "tabnav";
    applyZoneFocus();
  }
}, [allChannels, contentCategories, languageOptions]);
```

Re-runs once `allChannels` / `contentCategories` / `languageOptions` finish loading — handles cold start where data isn't available on the first render.

### L/R from `categories` and `channels` zones

```js
// Pseudocode added to existing keydown handler
const switchTab = (dir) => {
  const next = activeTabIdxRef.current + dir;
  if (next < 0 || next >= tabsRef.current.length) return;     // no wrap
  setExpandedCat(-1);
  const cur = currentChannelRef.current;
  // Re-resolve in the context of the new tab
  const loc = locateChannelInTab(cur, tabsRef.current[next], allChannels, contentCategories);
  if (loc && loc.chIdx >= 0) {
    if (loc.groupIdx >= 0) setExpandedCat(loc.groupIdx);
    focusedCatRef.current = Math.max(0, loc.groupIdx);
    focusedChRef.current = loc.chIdx;
    activeZoneRef.current = "channels";
  } else {
    focusedCatRef.current = 0;
    focusedChRef.current = 0;
    activeZoneRef.current = (tabsRef.current[next].kind === "all") ? "channels" : "categories";
  }
  setActiveTabIdx(next);
};
```

Wired to `categories OK` zone's L/R branch and `channels` zone's L/R branch (currently no-ops).

### Relaxed `[activeTabIdx]` effect

Current behavior at `:270-278` resets `zone` to `tabnav` when channels-zone is active and the new tab is grouped. That defeats the L/R-with-auto-focus design. Change:

```js
// Only reset to tabnav if zone is channels AND no group is expanded AND new tab is grouped
if (activeZoneRef.current === "channels"
    && activeTab?.kind !== "all"
    && expandedCatRef.current < 0) {
  activeZoneRef.current = "tabnav";
}
```

### Chunked render for All Channels

```js
useEffect(() => {
  if (activeTab?.kind !== "all") {
    setRenderedCount(Infinity);
    return;
  }
  if (renderedCount >= tabChannels.length) return;
  const schedule = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 0));
  const id = schedule(() => setRenderedCount(c => c + 30));
  return () => {
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    cancel(id);
  };
}, [activeTab?.kind, renderedCount, tabChannels.length]);
```

Render side:

```jsx
{activeTab.kind === "all" && tabChannels.slice(0, renderedCount).map(...)}
```

When `chIdx >= renderedCount`, the auto-focus seeds `renderedCount = chIdx + 30` so the focused card is in the first paint.

### Skeleton flash during tab swap

`renderedTabIdx` lags by one frame. When `activeTabIdx !== renderedTabIdx`, the content area renders 4 placeholder rows instead of either tab's content:

```jsx
{activeTabIdx !== renderedTabIdx
  ? <SkeletonRows count={4} />
  : (… existing content …)
}
```

`SkeletonRows` is a static `[0,1,2,3].map` of empty 88px-tall divs with `rgba(255,255,255,0.04)` bg. No animation (TV-safe).

## Visual highlight (Q4 — Direction A)

### Channel card states

In `public/index.html`, replace the existing `.focusable-channel-card[data-focused="true"]` rule:

```css
/* Focused — gradient cyan tint, no border (cleaner on TV panels) */
.focusable-channel-card[data-focused="true"] {
  background: linear-gradient(90deg,
    rgba(34,211,238,0.20) 0%,
    rgba(34,211,238,0.06) 100%) !important;
  outline: none !important;
}

/* Now playing — persistent left rail via inset shadow (no DOM mutation) */
.focusable-channel-card[data-playing="true"] {
  box-shadow: inset 3px 0 0 #22D3EE !important;
}

/* Now playing + focused — thicker rail + slightly stronger gradient */
.focusable-channel-card[data-playing="true"][data-focused="true"] {
  background: linear-gradient(90deg,
    rgba(34,211,238,0.22) 0%,
    rgba(34,211,238,0.08) 100%) !important;
  box-shadow: inset 4px 0 0 #22D3EE !important;
}
```

Three reinforcing channels (color + shape + text). Passes `color-not-only` accessibility rule. No `transform` (TV-safe per `magicRemoteUIStability.js`).

### NOW PLAYING pill (replaces the easy-to-miss 8px dot)

In `ChannelCard`, replace the cyan dot at `:792-799` with:

```jsx
{isPlaying && (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: "6px",
    padding: "5px 10px", borderRadius: "999px",
    background: "#22D3EE", color: "#0F1423",
    fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px",
    textTransform: "uppercase", lineHeight: 1, flexShrink: 0,
    marginRight: "12px",
  }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0F1423" }} />
    Now Playing
  </span>
)}
```

Placed between the name area and the channel number on the right.

### Tab title + category row dot markers

Compute once with `useMemo`:

```js
const playingTabIdx = useMemo(() => {
  if (!currentChannel) return -1;
  return tabs.findIndex(tab => …in this tab's filtered list…);
}, [tabs, allChannels, currentChannel]);

const playingGroupIdx = useMemo(() => {
  if (!currentChannel || activeTab?.kind === "all") return -1;
  return groups.findIndex(g => g.channels.some(ch => sameChannel(ch, currentChannel)));
}, [groups, activeTab, currentChannel]);
```

Render a 6px cyan dot:
- Next to the tab title in `tabnav` (`:559-561`) when `playingTabIdx === activeTabIdx`.
- Next to the category count `(45)` (`:687-689`) when `playingGroupIdx === gIdx`.

## Edge cases

- **No `currentChannel`** (cold load, parked on locked channel without one): `locateChannel` returns null → fall back to current tabnav-focus mount behavior.
- **Channel exists in multiple language tabs** (rare; same channel id across langid filters): the first match wins, which by tab-order is the user's language preference.
- **Channel data not yet loaded on mount**: the auto-focus effect re-runs when `allChannels`/`contentCategories` populate.
- **Last-persisted tab idx out of range**: existing clamp at `:185-189` already handles this — `locateChannel` receives a clamped value.
- **All Channels chunking + UP from card 31**: the previous chunk is mounted, no flicker.
- **All Channels chunking + DOWN past renderedCount**: handler bumps focusedChRef, but `chRefs.current[next]` is undefined until the next rIC tick. We early-return if the ref is undefined and trigger an immediate `setRenderedCount(focusedChRef.current + 30)` to mount it before the next paint. Worst case: one frame of input lag.

## Testing checklist

- Open menu while playing a Hindi channel → lands on Hindi tab → Movies group expanded → that channel highlighted with rail + pill.
- Open menu while playing a channel that doesn't exist in last-persisted tab → lands on its language tab.
- L/R from inside a category → switches tab and lands on the playing channel in the new tab if present.
- L/R from inside All Channels → if next tab is grouped and contains the playing channel, expands it; else lands on first category row.
- Switch to All Channels → tab title swaps instantly → 4 skeleton rows for ~30ms → first 30 cards render → rest stream in.
- Auto-focus a channel at index 547 in All Channels → first paint includes index 547 (no DOM-not-found).
- Now-playing channel scrolled out of view → still has the cyan rail when scrolled back.
- Tab title shows cyan dot only on the tab containing the playing channel.
- Category row shows cyan dot only on the group containing the playing channel.

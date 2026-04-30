# Channels Sidebar Redesign

**Date:** 2026-04-30
**Status:** Design approved, ready for implementation plan
**Scope:** `src/Modules/ChannelsSidebar.jsx` only (in-player overlay opened on OK during streaming)
**Out of scope:** `src/Modules/LiveChannels.jsx`, `src/Modules/LanguageChannels.jsx` (full-page screens — separate follow-up if desired)

## 1. Why

The current sidebar exposes two parallel filter rows (category pills + language pills) and a "WATCHING NOW" card. The new target UI compresses everything into a single tab navigator at top, with category-grouped channel content below — closer to a DTH EPG and faster to navigate on a TV remote.

## 2. Decisions (confirmed in brainstorm)

| # | Decision |
|---|---|
| 1 | ENTER on a category expands inline; channel cards appear directly under that category row |
| 2 | Single-expand accordion: opening one category collapses the previously open one |
| 3 | Scope is the in-player sidebar only |
| 4 | Locked channels stay visible — dimmed (opacity 0.55) with the existing padlock badge |
| 5 | No separate "WATCHING NOW" card; show a small cyan dot before the channel name on the currently-playing row |
| 6 | Initial focus on open lands on the top tab navigator at the last-used tab |
| 7 | Price color is green/teal `#22C55E`, matching the screenshots |
| 8 | Prefetch `fetchChannels(grid:"")` on app boot |
| 9 | Persist last-active tab across sidebar opens |

## 3. Layout (top-to-bottom inside the 400px overlay)

1. **Tab navigator** — single horizontal strip (~56px tall):
   - Left chevron `<` (40×40, rounded square, `rgba(255,255,255,0.08)` translucent bg).
   - Centered tab title in cyan (`#22D3EE`, 22px, weight 700) — e.g. `Hindi`, `Subscribed Channels`, `All Channels`.
   - Right chevron `>` matching the left.
   - Whole strip is one focus zone (`tabnav`). Chevrons render at 0.4 opacity at list ends (no wrap).
2. **`CATEGORIES` micro-label** (13px uppercase, color `#94A3B8`) — 18px below the navigator. Hidden on `All Channels` tab.
3. **Content area** — mode determined by active tab.

### Category row (collapsed)

- Full-width row, 56px tall, 16px horizontal padding.
- Left: category name (22px white, weight 600).
- Right: `(N)` count (22px white, weight 600, color `#CBD5E1`).
- On focus: 1.5px white outline, 12px radius, subtle inner-glow `rgba(255,255,255,0.05)` bg. No fill when unfocused.
- 8px gap between adjacent category rows.

### Channel card

- 88px tall, 12px padding.
- Left: 64×64 white-tile logo, 12px radius, 1px border `rgba(0,0,0,0.06)`.
- Middle: name (22px, weight 600, white) on top; price (`₹19.00`, 18px, weight 600, green `#22C55E`) on the line below.
- Right: channel number (24px, weight 700, white).
- On focus: 1.5px white outline, 14px radius, subtle inner-glow bg.
- Locked channels: opacity `0.55`, padlock badge bottom-right of the logo (existing pattern preserved).
- 4px gap between adjacent channel cards; 16px gap between a category row and its expanded channels block.

### Currently-playing marker

- Small 8px cyan dot (`#22D3EE`) prepended before the channel name on the row matching `currentChannel`. No separate card.

## 4. Tab model

Unified tab list, built once on mount, ordered:

1. `Subscribed Channels` — virtual; filter `isSubscribed(c) === true`.
2. `All Channels` — virtual; no filter.
3. `…languages…` — from `LivePlayersStore.fetchLanguages()` in API order; filter `c.langid === lang.langid`.

The two virtual tabs are constructed locally (not extracted from `fetchCategories` like today). `fetchCategories` is reused only for the inner content-category list (Entertainment, Movies, Kids, Sports, Infotainment, Music, News, Devotional, Miscellaneous), shared across all tabs.

### Per-tab content shape

- `All Channels` → `{ mode: "flat", channels: allChannels }` (no category grouping).
- All other tabs → `{ mode: "grouped", groups: [{ category, channels: [...] }] }` where each `category` comes from the cached categories list (with virtual entries filtered out) and `channels` is `tabFilter(allChannels).filter(c => c.grid === category.grid)`. Empty groups are dropped.

## 5. Data fetching & caching

Reuses existing infrastructure — no new API calls:

- `fetchCategories(payloadBase)` — already cached 2h in `LiveChannelsStore`.
- `fetchChannels({ ...payloadBase, grid: "" })` — already cached 30m; fetched once on sidebar mount; reused in memory for all tab/category filtering. **Prefetched on app boot** (extend `src/utils/prefetchHome.js`) so the cache is warm by the time the user hits OK on the player.
- `fetchLanguages(payloadBase)` — already cached in `LivePlayersStore`.

`activeTab` index is persisted in `LivePlayersStore` so reopening the sidebar lands the user on the same tab.

## 6. Focus & navigation state machine

Three mutually exclusive zones: `tabnav`, `categories`, `channels`.

State (refs — preserves the no-re-render-on-keypress invariant):
- `activeZoneRef`: current zone.
- `focusedTabRef` / `focusedCatRef` / `focusedChRef`: indices.
- `expandedCatRef`: index of expanded category, or `-1`.

The only real React state (drives accordion render) is `expandedCat` — flips only on ENTER, never on arrow keys.

### Transitions

| Zone | LEFT | RIGHT | UP | DOWN | ENTER |
|---|---|---|---|---|---|
| `tabnav` | prev tab (no wrap) | next tab (no wrap) | — | enter content area: `categories` for grouped tabs, `channels` for `All Channels` | no-op |
| `categories` | — | — | prev cat; if at index 0 → `tabnav` | next cat | toggle: collapse if same as `expandedCat`; otherwise collapse old, expand this, focus moves to first channel |
| `channels` | — | — | prev channel; if at index 0 → parent category in `categories` (or `tabnav` if `All Channels`) | next channel; clamp at end | play channel (calls `onChannelSelect`) |

### Initial focus

- `tabnav` at the last-active tab index (defaults to `Subscribed Channels` on first launch).

### Tab change

- L/R only updates the visible tab and resets `expandedCat = -1` and category focus to 0. No auto-expansion.

### Accordion render

- `expandedCat` swap is a single `setState` per ENTER. React re-renders only the categories-list region; channels of the previously expanded category unmount cleanly. Channels use stable keys (`channelno || channelid`) so `<img>` elements survive within an expand/collapse cycle.

### Locked-channel ENTER

- Passes through to `onChannelSelect`; the existing `LivePlayer` flow opens the `ChannelLocked` modal. No special handling here.

## 7. Performance budget

- Sidebar open → first paint: < 100ms (cache-hit path).
- L/R tab switch: 0 network calls; React re-render confined to content area.
- Arrow-key focus move: 0 React re-renders (DOM `data-focused` attribute toggle only).
- ENTER expand: 1 React re-render of categories region.
- Channel logos use `<img loading="lazy">` to skip loading invisible logos in collapsed groups.

## 8. Empty / loading / error states

- First load: 3 grey shimmer rows in the content area; tab navigator visible immediately.
- API error: inline message above the content area with a retry chip.
- Tab has 0 channels: "No channels in this category" placeholder.

## 9. Focus styles (CSS)

Per CLAUDE.md, focus visuals live in `public/index.html`. Add:

```css
.focusable-tabnav[data-focused="true"]        { /* white outline */ }
.focusable-category-row[data-focused="true"]  { /* white outline + subtle bg */ }
.focusable-channel-card[data-focused="true"]  { /* white outline + subtle bg */ }
```

No transforms (per `magicRemoteUIStability.js` rule); border-only focus.

## 10. Compatibility

`<ChannelsSidebar onChannelSelect={...} currentChannel={...} />` prop signature is unchanged. `LivePlayer.jsx` does not need any changes for this redesign.

## 11. Verification (manual, on-device)

1. Open sidebar from player — focus lands on tab nav at last-used tab.
2. L/R cycles tabs; category-row counts update for the new tab.
3. DOWN enters categories; UP/DOWN walks; ENTER expands and jumps to first channel.
4. UP from the first channel returns to its parent category row.
5. ENTER on an already-expanded category collapses it.
6. Locked-channel ENTER opens the `ChannelLocked` modal.
7. Currently-playing channel shows a cyan dot in its row.
8. BACK closes the sidebar (existing `LivePlayer.handleBackCascade` flow).
9. On a cold launch, sidebar still opens within < 1s (uses prefetched cache when available, otherwise falls back to the 30m cache or fetches).

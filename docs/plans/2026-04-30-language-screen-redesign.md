# Language Screen Redesign

**Date:** 2026-04-30
**Scope:** `src/Modules/LanguageChannels.jsx` + `public/index.html` focus styles
**Status:** Design approved, ready to implement

## Problem

The current "Select Language" screen (third sidebar icon) renders 4 oversized
cards per row, each with a randomly-rotating gradient background pulled from a
16-color palette. Logos are 120×120 dropped on top of the gradient with a
small 24px label. On a 10-ft TV the gradient dominates, the logo gets lost,
and text feels small relative to card size — looks like generic AI-generated
UI rather than a curated TV interface.

## Decision

**Style direction: Option A — pure minimal.** Solid dark cards, no gradients,
let the language logos provide all the color. Pattern matches Apple TV /
Netflix / YouTube TV category tiles.

## Design Spec

### Layout

- Grid: `repeat(7, 1fr)`, gap `16px`
- Container padding: `32px` horizontal, `24px` top, `32px` bottom
- Card aspect ratio: `4 / 5` (portrait) — auto-scales across 720p/1080p/4K
- No fixed `minHeight`

| Resolution | Card width | Card height |
| --- | --- | --- |
| 720p (1280) | 160 | 200 |
| 1080p (1920) | 251 | 314 |
| 4K (3840) | 526 | 657 |

### Card surface

| Property | Value |
| --- | --- |
| background | `#141414` |
| border | `1px solid #2a2a2a` |
| border-radius | `16px` |
| padding | `20px 16px` |

### Logo

- `width: 60%` of card width, `height: 50%` of card height, `object-fit: contain`
- `margin-bottom: 16px`
- No drop-shadow filter
- `onError` hides broken images (kept from current code)

### Label

| Property | Value |
| --- | --- |
| font-size | `30px` |
| font-weight | `600` |
| color | `#ffffff` |
| text-align | `center` |
| line-height | `1.2` |
| overflow | `hidden`, `text-overflow: ellipsis`, `white-space: nowrap` |

No `text-shadow` (was masking poor contrast on gradients — unneeded on solid bg).

### States

| State | Background | Border |
| --- | --- | --- |
| Resting | `#141414` | `1px solid #2a2a2a` |
| Focused (`data-focused="true"`) | `#1a1a1a` | `4px solid #ffffff` |
| Pressed (`data-pressed="true"`) | `#0a0a0a` | `4px solid #ffffff` |

No `transform: scale()` — would blur logo text on TV panels (per CLAUDE.md
focus rules). Border-only focus indicator matches existing
`.focusable-language-card[data-focused]` pattern.

Contrast check: `#ffffff` on `#141414` = 18.1:1 (WCAG AAA, ≥7:1).

### Header

- Back button: `50×50`, `12px` radius, `2px rgba(255,255,255,0.3)` border (unchanged)
- Title: `36px / 700`, centered — "Select Language"
- Subtitle: `18px / 400 / #888` — "Choose a language to filter channels"
- Container: flex, gap `20px`, `marginBottom: 32px`

### Loading skeleton

- 8 placeholders in `repeat(7, 1fr)` grid
- `aspect-ratio: 4/5`, `border-radius: 16px`
- Existing shimmer keyframes reused

### Navigation

- `const COLS = 7` (was 4) — only constant change
- Existing `setGridFocus` / arrow handlers parameterized on `COLS`, no other math changes

### Removed

- `GRADIENT_COLORS` array (16 lines, 16 gradients)
- Per-card `background: GRADIENT_COLORS[index % ...]` lookup
- Logo `filter: drop-shadow(...)`
- Label `textShadow`
- Card `minHeight: 280px`

## Files

| File | Change |
| --- | --- |
| `src/Modules/LanguageChannels.jsx` | Card surface, typography, COLS=7, remove gradient palette, add subtitle |
| `public/index.html` | Update `.focusable-language-card[data-focused]` and `[data-pressed]` rules to match new minimal surface |

## Out of scope

The grid used in `LiveChannels.jsx` and other screens is **not** touched —
this redesign is scoped only to the language picker, per user direction.

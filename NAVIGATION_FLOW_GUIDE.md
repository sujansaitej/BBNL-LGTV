# 🎮 LG TV Magic Remote - Complete Navigation Flow Guide

## Overview
This guide shows how Magic Remote navigation works across all pages in the BBNL-LGTV application. Each page has optimized navigation zones designed for TV remote control.

---

## 🏠 HOME PAGE (`/home`)

### Page Structure
```
┌─────────────────────────────────────────────────────────────────┐
│                 HEADERBAR (Horizontal Zone)                     │
│   [🔍 Search Input] ←────→ [⚙️ Settings Icon] [🟢 Remote Ready] │
└─────────────────────────────────────────────────────────────────┘
         ↓                                              ↑
┌──────────────┐  ┌─────────────────────────────────────────────┐
│   SIDEBAR    │  │           MAIN CONTENT AREA                 │
│  (Vertical)  │  │                                             │
│              │  │  ┌─────────────────────────────────────┐   │
│   [🏠 Home]  │  │  │      HOME ADS (Auto-scroll)         │   │
│      ↕       │  │  │   (No navigation - display only)    │   │
│  [📺 Live TV]│←→│  └─────────────────────────────────────┘   │
│      ↕       │  │                                             │
│  [🎬 Movies] │  │  ┌─────────────────────────────────────┐   │
│      ↕       │  │  │    CHANNELS VIEW (Grid 5 columns)   │   │
│  [💬 Feed]   │  │  │                                     │   │
│      ↕       │  │  │   [EN] [HI] [TA] [TE] [ML]        │   │
│  [⭐ Fav]    │  │  │   [KA] [BE] [MA] [OR] [PU]        │   │
│              │  │  │   [GU] [AS] [BH] ...              │   │
│              │  │  │                                     │   │
└──────────────┘  │  │   2D Grid Navigation ↑↓←→          │   │
                  │  └─────────────────────────────────────┘   │
                  └─────────────────────────────────────────────┘
```

### Navigation Zones

#### 1. **Headerbar (Top)**
- **Type:** Horizontal navigation
- **Items:** Search input, Settings icon
- **Controls:**
  - `←` `→` : Switch between search and settings
  - `ENTER` : Activate focused item
  - Magic Remote pointer hover + click

#### 2. **Sidebar (Left)**
- **Type:** Vertical navigation
- **Items:** Home, Live TV, Movies, Feedback, Favorites
- **Controls:**
  - `↑` `↓` : Move between menu items
  - `ENTER` : Navigate to selected page
  - Magic Remote pointer hover + click
- **Visual Feedback:**
  - Focused: White background, blue border, scale(1.2)
  - Hovered: Semi-transparent, scale(1.1)
  - Icon color: Black (focused), White (normal)

#### 3. **Channel Cards (Main Content)**
- **Type:** Grid navigation (2D)
- **Items:** Language channel cards (English, Hindi, Tamil, etc.)
- **Controls:**
  - `↑` `↓` : Move between rows
  - `←` `→` : Move between columns (5 per row)
  - `ENTER` : Select language → Navigate to filtered channels
  - Magic Remote pointer hover + click
- **Visual Feedback:**
  - Focused: scale(1.15), blue border, glow shadow
  - Hovered: scale(1.08), lighter border

### Auto-Play Feature
- **Trigger:** After 5 seconds of inactivity (first visit only)
- **Action:** Auto-plays Fo-Fi Info channel (999)
- **Cancel:** Any user interaction (key press or click)

---

## 📺 LIVE CHANNELS PAGE (`/live-channels`)

### Page Structure
```
┌─────────────────────────────────────────────────────────────────┐
│  [◀ Back]     TV CHANNELS - Tamil     [🟢 Remote]  [🔍 Search]  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  CATEGORY TABS (Horizontal + Wrap)                              │
│  [All] [Subscribed] [Language] [Sports] [News] [Entertainment]  │
│   ←──────────────────→  (Horizontal navigation)                 │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│              CHANNELS GRID (Dynamic columns)                     │
│                                                                  │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │
│   │ Ch 101 │  │ Ch 102 │  │ Ch 103 │  │ Ch 104 │  │ Ch 105 │  │
│   │ Star   │  │ Sony   │  │ Zee TV │  │ Colors │  │ &TV    │  │
│   └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  │
│        ↑           ↑           ↑           ↑           ↑        │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │
│   │ Ch 201 │  │ Ch 202 │  │ Ch 203 │  │ Ch 204 │  │ Ch 205 │  │
│   └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  │
│        ↓           ↓           ↓           ↓           ↓        │
│                    ... more channels ...                         │
│                                                                  │
│   2D Grid Navigation: ↑↓ for rows, ←→ for columns              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│            CHANNEL JUMP HUD (appears on number key)              │
│                    Channel: 123 ⏱ 1s                            │
└─────────────────────────────────────────────────────────────────┘
```

### Navigation Flow

#### Combined Navigation (Tabs + Grid)
All items (category tabs + channel cards) are in **one unified navigation array**:
- **Index 0-5:** Category tabs (All, Subscribed, Language, Sports, News, etc.)
- **Index 6+:** Channel cards (Star, Sony, Zee, Colors, etc.)

#### Controls
**Category Tabs (First Row):**
- `←` `→` : Move between category tabs
- `↓` : Move to first channel in grid
- `ENTER` : Switch category filter

**Channel Grid:**
- `↑` : Move to previous row (or to category tabs if on first row)
- `↓` : Move to next row
- `←` `→` : Move between columns
- `ENTER` : Play selected channel
- **Number Keys (0-9):** Direct channel jump
  - Type `1` `2` `3` → Jumps to channel 123 after 1 second
  - Buffer timeout: 1 second
  - Shows HUD overlay with typed number

**Search Bar:**
- Type to filter channels in real-time
- Debounce: 1.5 seconds
- Auto-play if only one result matches
- Number keys work for channel search

### Visual Feedback
- **Category Tab Focused:** Blue border, scale(1.12), glow shadow
- **Channel Focused:** Blue border (3px), scale(1.15), large glow
- **Channel Hovered:** Scale(1.08), medium shadow

### Dynamic Features
- **Responsive Columns:** Auto-adjusts based on screen width
- **Language Filter:** Shows language name in title
- **Subscribed Filter:** Shows only subscribed channels
- **Empty State:** "No channels found" message

---

## 🌐 LANGUAGE CHANNELS PAGE (`/languagechannels`)

### Page Structure
```
┌─────────────────────────────────────────────────────────────────┐
│  [◀ Back]       SELECT LANGUAGE       [🟢 Magic Remote]         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│          LANGUAGE CARDS GRID (4 columns)                         │
│                                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│   │  🇮🇳      │  │  🇮🇳      │  │  🇮🇳      │  │  🇮🇳      │      │
│   │ English  │  │  Hindi   │  │  Tamil   │  │ Telugu   │      │
│   │ Gradient │  │ Gradient │  │ Gradient │  │ Gradient │      │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│        ↕            ↕            ↕            ↕                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│   │ Kannada  │  │ Bengali  │  │ Marathi  │  │  Oriya   │      │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│        ↕            ↕            ↕            ↕                 │
│                    ... more languages ...                        │
│                                                                  │
│   2D Grid: ↑↓ rows, ←→ columns (4 per row)                     │
└─────────────────────────────────────────────────────────────────┘
```

### Navigation Details

#### Grid Navigation (4 columns)
- **Type:** 2D Grid
- **Items:** Language cards with gradient backgrounds
- **Controls:**
  - `↑` `↓` : Move between rows
  - `←` `→` : Move between columns (4 per row)
  - `ENTER` : Select language → Navigate to filtered Live Channels
  - Magic Remote pointer: 150px threshold

#### Visual Effects
- **Focused:** 
  - Border: 4px solid white
  - Transform: translateY(-15px) scale(1.08)
  - Shadow: Large glow (60px blur)
- **Hovered:**
  - Transform: translateY(-10px) scale(1.05)
  - Shadow: Medium (40px blur)
- **Normal:**
  - Transform: translateY(0) scale(1)
  - Shadow: Small (15px blur)

#### Special Features
- **16 Unique Gradients:** Each card has different gradient colors
- **Language Logos:** Displays language-specific icons (with fallback)
- **Language Details:** Shows additional info if available
- **Auto-Navigation:** Selecting language navigates to `/live-channels` with language filter

---

## 📝 FEEDBACK PAGE (`/feedback`)

### Page Structure
```
┌─────────────────────────────────────────────────────────────────┐
│  [◀ Back]             FEEDBACK              [🟢 Remote]         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FEEDBACK FORM (Vertical)                      │
│                                                                  │
│   Star Rating:                                                  │
│   [⭐]  [⭐]  [⭐]  [⭐]  [⭐]  ← Horizontal for stars            │
│    ↕     ↕     ↕     ↕     ↕                                    │
│   ────────────────────────────                                  │
│        ↓                                                         │
│   Your Feedback:                                                │
│   ┌─────────────────────────────────────────────────────┐      │
│   │ [Text Input Field]                                  │      │
│   │                                                      │      │
│   └─────────────────────────────────────────────────────┘      │
│        ↓                                                         │
│   ┌──────────┐  ┌──────────┐                                   │
│   │  Cancel  │  │  Submit  │  ← Horizontal for buttons         │
│   └──────────┘  └──────────┘                                   │
│                                                                  │
│   Vertical Primary: ↑↓ between groups                           │
└─────────────────────────────────────────────────────────────────┘
```

### Navigation Flow

#### Vertical Form Navigation
**Navigation Order:**
1. Star 1 (⭐)
2. Star 2 (⭐)
3. Star 3 (⭐)
4. Star 4 (⭐)
5. Star 5 (⭐)
6. Text Input Field
7. Cancel Button
8. Submit Button

#### Controls
- `↑` `↓` : Move between form elements
- `ENTER` : 
  - On stars: Select rating (fills stars)
  - On text field: Focus for typing
  - On Cancel: Clear form and go back
  - On Submit: Send feedback to API
- Magic Remote pointer hover + click

#### Visual Feedback
- **Stars Focused:** scale(1.2), yellow glow
- **Stars Selected:** Filled with yellow color
- **Input Focused:** Blue border, scale(1.05)
- **Buttons Focused:** Blue border, scale(1.08), glow

#### Form Validation
- **Rating Required:** Must select at least 1 star
- **Text Optional:** Can submit without text
- **Success Message:** Shows "Thank you" on submit
- **Error Handling:** Shows error if API fails

---

## ⚙️ SETTINGS PAGE (`/setting`)

### Page Structure
```
┌─────────────────────────────────────────────────────────────────┐
│  [◀ Back]                                                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌───────────────────────────────────────────┐
│   MENU SIDEBAR   │  │        CONTENT AREA                       │
│   (Vertical)     │  │                                           │
│                  │  │  ABOUT APP:                               │
│  [ℹ️ About App]  │←→│  ┌────────────────────────────────────┐  │
│       ↕          │  │  │ Software Version: 2.0.0            │  │
│  [📱 Device Info]│  │  │ Build Date: Feb 2026               │  │
│                  │  │  │ App Package: com.lg.bbnl           │  │
│                  │  │  └────────────────────────────────────┘  │
│  [🟢 Remote]     │  │                                           │
│                  │  │  OR                                       │
│                  │  │                                           │
│                  │  │  DEVICE INFO:                             │
│                  │  │  ┌────────────────────────────────────┐  │
│                  │  │  │ Device Name: LG webOS TV           │  │
│                  │  │  │ Model: OLED55C1PUB                 │  │
│                  │  │  │ OS Version: webOS 6.0              │  │
│                  │  │  │ Resolution: 3840x2160              │  │
│                  │  │  └────────────────────────────────────┘  │
└──────────────────┘  └───────────────────────────────────────────┘
```

### Navigation Details

#### Sidebar Menu (Vertical)
- **Type:** Vertical list
- **Items:** About App, Device Info
- **Controls:**
  - `↑` `↓` : Move between menu items
  - `ENTER` : Switch content panel
  - Magic Remote pointer hover + click

#### Visual Feedback
- **Focused Item:**
  - Background: rgba(255,255,255,0.12)
  - Border: 3px solid #667eea
  - Transform: scale(1.08)
  - Shadow: Blue glow

- **Active Item:**
  - Background: rgba(255,255,255,0.12)
  - Border: 2px solid rgba(255,255,255,0.35)

#### Content Display
- **About App:** Shows app version, build info
- **Device Info:** Shows TV model, OS version, resolution
- **Read-Only:** No navigation in content area (display only)

---

## 🎬 MOVIES/OTT PAGE (`/movies-ott`)

### Page Structure
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    COMING SOON                                   │
│                                                                  │
│              ┌────────────────────┐                             │
│              │                    │                             │
│              │  [Coming Soon SVG] │                             │
│              │                    │                             │
│              └────────────────────┘                             │
│                                                                  │
│          Coming Soon Movie OTT                                   │
│          New OTT apps content dropping soon                      │
│                                                                  │
│              [🟢 Magic Remote Ready]                            │
│                                                                  │
│              ┌──────────────┐                                   │
│              │ Go to home   │  ← Single focused button          │
│              └──────────────┘                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Navigation Details
- **Single Button:** "Go to home"
- **Controls:**
  - `ENTER` : Navigate to home page
  - Magic Remote pointer hover + click
- **Visual Feedback:**
  - Focused: Blue border, scale(1.15), glow
  - Button color: Yellow (#f4bf1f)

---

## 🎥 LIVE PLAYER PAGE (`/player`)

### Page Structure
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                  VIDEO PLAYER AREA                               │
│                  (HLS/MPEG-DASH Stream)                         │
│                                                                  │
│  [Channel Details Overlay - Auto-hide after 3s]                 │
│  Channel 123 - Star Plus                                        │
│  Sports • ₹49/month                                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌───────────────────────────────────────────┐
│  CHANNEL SIDEBAR │  │                                           │
│    (Combined)    │  │        (Video plays here)                 │
│                  │  │                                           │
│  CATEGRIES:      │  │                                           │
│  [All] [Sports]  │←→│                                           │
│   [News] ...     │  │                                           │
│        ↓         │  │                                           │
│  CHANNELS:       │  │                                           │
│  [📺 Ch 101]    │  │                                           │
│  [📺 Ch 102]    │  │                                           │
│  [📺 Ch 103]    │  │    Controls:                              │
│        ↕         │  │    - Number keys: Direct channel jump     │
│  [📺 Ch 104]    │  │    - UP/DOWN: Channel +/-                 │
│        ↕         │  │    - BACK: Toggle channel sidebar         │
│  ... more ...    │  │    - OK: Show channel info (3s)          │
│                  │  │                                           │
│  [🟢 Remote]     │  │                                           │
└──────────────────┘  └───────────────────────────────────────────┘
```

### Navigation Details

#### Sidebar (Combined Navigation)
**Two Navigation Zones:**
1. **Category Tabs** (Horizontal, top of sidebar)
   - All, Sports, News, Entertainment, etc.
2. **Channel List** (Vertical, main sidebar)
   - Channel cards with logos, names, channel numbers

#### Controls
**General:**
- `BACK` : Toggle channel sidebar visibility
- `OK` : Show/hide channel details overlay (3 second auto-hide)
- `↑` `↓` : 
  - In sidebar: Navigate channels
  - In player: Channel up/down (when sidebar hidden)
- **Number Keys:** Direct channel jump (e.g., 1-2-3 → Channel 123)

**Sidebar Navigation:**
- Category Tabs: `←` `→` to switch categories
- Channel List: `↑` `↓` to scroll channels
- `ENTER` : Switch to selected channel

#### Visual Feedback
- **Sidebar Items Focused:**
  - Border: 3px solid #667eea
  - Transform: scale(1.05)
  - Shadow: Blue glow
- **Video Controls:** Auto-hide after 3 seconds of inactivity

---

## ⭐ FAVORITES PAGE (`/favorites`)

### Page Structure
```
┌─────────────────────────────────────────────────────────────────┐
│  [◀ Back]       FAVORITE CHANNELS       [🟢 Remote]             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              FAVORITES GRID (Dynamic columns)                    │
│                                                                  │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │
│   │ Ch 101 │  │ Ch 205 │  │ Ch 310 │  │ Ch 425 │  │ Ch 530 │  │
│   │ ⭐ Fav  │  │ ⭐ Fav  │  │ ⭐ Fav  │  │ ⭐ Fav  │  │ ⭐ Fav  │  │
│   └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  │
│        ↕            ↕            ↕            ↕            ↕     │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │
│   │ Ch 635 │  │ Ch 740 │  │ Ch 845 │  │ Ch 950 │  │ Ch 999 │  │
│   └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  │
│                                                                  │
│   2D Grid Navigation: ↑↓←→                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Navigation Details
- **Same as Live Channels:** Grid navigation (2D)
- **Filter:** Shows only favorited channels
- **Action:** `ENTER` on card → Play channel

---

## 🔑 Magic Remote Controls Summary

### Universal Controls (All Pages)

| Button | Action |
|--------|--------|
| `↑` `↓` `←` `→` | Navigate between items (direction depends on layout) |
| `ENTER` / `OK` | Select focused item |
| `BACK` | Return to previous page / Toggle sidebar |
| `0-9` | Direct channel jump (on channel pages) |
| **Magic Remote Pointer** | Hover (150px threshold) → Click to select |

### Visual Feedback Standards

| State | Visual Effect |
|-------|---------------|
| **Focused** | Blue border (3px solid #667eea), scale(1.08-1.15), glow shadow |
| **Hovered** | Lighter border (2px), scale(1.03-1.08), medium shadow |
| **Normal** | Transparent border, scale(1), no shadow |
| **Active** | Background color change, enhanced border |

### Magic Remote Status Indicator
- **Location:** Top-right corner or near navigation area
- **Display:** Green pulsing dot + "Magic Remote" or "Remote Ready" text
- **Animation:** pulse-dot 1.5s infinite
- **Condition:** Shows when webOS MRCU service is connected

---

## 📱 Navigation Patterns by Layout Type

### 1. **Horizontal Navigation** (1D Left-Right)
**Examples:** Headerbar, Category tabs  
**Controls:**
- `←` : Move to previous item
- `→` : Move to next item
- Wraps at edges (optional)

### 2. **Vertical Navigation** (1D Top-Bottom)
**Examples:** Sidebar menus, Form inputs, Settings  
**Controls:**
- `↑` : Move to previous item
- `↓` : Move to next item
- Scrolls at boundaries (if applicable)

### 3. **Grid Navigation** (2D)
**Examples:** Channel cards, Language cards  
**Controls:**
- `↑` : Move up one row
- `↓` : Move down one row
- `←` : Move left one column
- `→` : Move right one column
- Smart boundary handling (stays at edge or wraps)

### 4. **Combined Navigation**
**Examples:** Live Channels (tabs + grid), Player (sidebar + categories)  
**Implementation:** Unified array with index calculation
- First N items: Navigation zone 1 (e.g., tabs)
- Remaining items: Navigation zone 2 (e.g., grid/list)
- `↑` `↓` transitions between zones

---

## 🎯 Navigation Best Practices

### Focus Management
1. **Initial Focus:** First navigable item gets focus on page load
2. **Focus Persistence:** Focus state maintained during interactions
3. **Focus Trap:** Focus stays within modal/sidebar when open
4. **Focus Restoration:** Returns to previous item after closing overlay

### Performance Optimization
- **Pointer Polling:** 100-150ms interval (optimized for smooth tracking)
- **Focus Threshold:** 150px (prevents accidental hovers)
- **Debouncing:** Search inputs debounced at 1.5s
- **Memoization:** Grid items memoized to prevent re-renders

### Accessibility
- **Keyboard Support:** Full keyboard navigation (no mouse required)
- **Visual Feedback:** Clear focus indicators (border + scale)
- **Audio Feedback:** (Optional) Can add click sounds
- **High Contrast:** Focus colors optimized for TV screens

---

## 🛠️ Technical Implementation

### Core Hook
```javascript
useEnhancedRemoteNavigation(items, {
  orientation: 'grid',        // 'horizontal', 'vertical', 'grid'
  columns: 5,                 // For grid layout
  useMagicRemotePointer: true,
  focusThreshold: 150,        // px
  onSelect: (index) => {
    // Handle selection
  }
})
```

### Returns
- `focusedIndex`: Current arrow key focus
- `hoveredIndex`: Current pointer hover  
- `getItemProps(index)`: Spread props to item
- `magicRemoteReady`: Boolean for status indicator

### Usage Pattern
```javascript
items.map((item, index) => (
  <Box
    {...getItemProps(index)}
    className={`focusable ${focusedIndex === index ? 'focused' : ''}`}
    sx={{
      transform: focusedIndex === index ? 'scale(1.15)' : 'scale(1)',
      border: focusedIndex === index ? '3px solid #667eea' : 'none',
    }}
  >
    {/* Item content */}
  </Box>
))
```

---

## 🚀 Quick Reference

### Page-to-Page Navigation Flow
```
HOME
 ├─→ Live TV (sidebar) → LIVE CHANNELS
 ├─→ Movies (sidebar) → MOVIES/OTT
 ├─→ Feedback (sidebar) → FEEDBACK
 ├─→ Favorites (sidebar) → FAVORITES
 ├─→ Language Card → LANGUAGE CHANNELS → LIVE CHANNELS (filtered)
 └─→ Search → Filtered channels

LIVE CHANNELS
 └─→ Channel Card → LIVE PLAYER

LIVE PLAYER
 ├─→ Sidebar Channels → Switch channel
 ├─→ Number Keys → Direct channel jump
 └─→ BACK → Return to LIVE CHANNELS

SETTINGS
 └─→ About App / Device Info (content only)
```

---

## 📊 Performance Metrics

| Metric | Value | Component |
|--------|-------|-----------|
| **Focus Latency** | 16-24ms | All pages |
| **Animation FPS** | 60fps | All transitions |
| **Pointer Polling** | 100-150ms | Magic Remote |
| **Focus Threshold** | 150px | Hover detection |
| **Grid Support** | 100+ items | Channel grids |
| **Debounce** | 1.5s | Search inputs |
| **Channel Jump Timeout** | 1.0s | Number buffer |

---

## 🎮 Testing Checklist

### Per-Page Testing
- [ ] All items focusable with arrow keys
- [ ] Magic Remote pointer works (150px threshold)
- [ ] Enter/OK selects focused item
- [ ] Visual feedback clear (border + scale)
- [ ] Navigation wraps correctly at boundaries
- [ ] No focus traps (can always escape)
- [ ] Status indicator shows when ready

### Cross-Page Testing
- [ ] Sidebar navigates to correct pages
- [ ] Back button returns to previous page
- [ ] Focus restored after navigation
- [ ] No memory leaks on unmount
- [ ] Auto-play works as expected (Home page)
- [ ] Channel jump works (Live Channels, Player)

---

## 📱 TV Remote Button Mapping

### Standard LG Magic Remote
| Physical Button | Function |
|----------------|----------|
| D-Pad (↑↓←→) | Navigate items |
| Center Button (OK) | Select/Enter |
| Back Button | Previous screen / Toggle sidebar |
| Home Button | Return to TV home (exits app) |
| Number Pad (0-9) | Direct channel input |
| Volume +/- | System volume (not captured) |
| Channel +/- | Can map to ↑↓ in player |

---

This navigation flow guide covers all pages and interaction patterns in the BBNL-LGTV application. Every component is optimized for Magic Remote control with clear visual feedback and smooth 60fps animations.

# 🎮 LG webOS Remote Navigation - Quick Reference

## Installation (Already Done)
```bash
npm install @noriginmedia/norigin-spatial-navigation
```

## Global Setup (src/App.js - Already Done)
```javascript
import { initializeSpatialNavigation } from './utils/spatialNavigation';

useEffect(() => {
  initializeSpatialNavigation();
}, []);
```

---

## 🔴 Remote Buttons → App Actions

| Remote Button | Result |
|---|---|
| **d-pad ↑↓←→** | Move focus up/down/left/right |
| **OK or Enter** | Click focused element |
| **Back/Escape** | Go back to previous page |
| **Home** | Go to home page |
| **Play/Pause** | Toggle playback (custom handler) |
| **0–9** | Buffer digit (IPTV channel jump) |
| **Wait 1s** | Auto-jump to buffered channel number |

---

## 🛠️ Setup Spatial Nav in Any Page

### Step 1: Import Hooks
```javascript
import { useSpatialNavSection } from '../utils/useSpatialNav';
```

### Step 2: Register Sections
```javascript
const MyPage = () => {
  const sidebarRef = useSpatialNavSection("my-sidebar");
  const contentRef = useSpatialNavSection("my-content");
  
  return (
    <Box ref={sidebarRef} data-focusable-section="my-sidebar">
      {/* Items here auto-focusable */}
    </Box>
  );
};
```

### Step 3: Elements Auto-Focusable
```javascript
// No extra setup needed, just use semantic HTML:
<button>Click</button>
<a href="/">Link</a>
<input type="text" />

// Or explicit:
<div data-focusable role="button">Click</div>
```

---

## 🎯 IPTV: Numeric Channel Jump

**Already integrated in LiveChannels.jsx**

### How It Works:
1. User presses: **5**
   - Shows HUD: "Channel: 5"

2. User presses: **5** (within 1 second)
   - Shows HUD: "Channel: 55"

3. User waits 1 second
   - Jumps to channel 55
   - HUD disappears

### Multi-Digit Example:
- Type: **1 8 0** → Jump to channel 180 (3-digit support)
- Type: **9 9 9 9** → Jump to channel 9999 (4-digit max)

---

## 📋 All Available Hooks

| Hook | Purpose | Example |
|------|---------|---------|
| `useSpatialNavSection(id)` | Register focusable section | `const ref = useSpatialNavSection("sidebar")` |
| `useFocusable(bool)` | Make element focusable | `const ref = useFocusable(true)` |
| `useSpatialFocus(onFocus, onBlur)` | Listen to focus events | `useSpatialFocus(() => {...}, () => {...})` |
| `useSpatialNavEvent(type, fn)` | Listen to nav events | `useSpatialNavEvent('back', handleBack)` |
| `useFocusSection(id, bool)` | Focus on section | `useFocusSection("sidebar", isReady)` |
| `useNumericChannelInput(fn, ms)` | Channel jump handler | `useNumericChannelInput((ch) => jump(ch), 1000)` |
| `useSpatialNavPause(bool)` | Pause/resume nav | `useSpatialNavPause(isModalOpen)` |
| `useSetFocusable(selector, bool)` | Toggle focusable | `useSetFocusable(".card", true)` |

---

## 🚀 Common Use Cases

### Use Case 1: Channel Grid
```javascript
const ChannelGrid = () => {
  const gridRef = useSpatialNavSection("grid");
  
  return (
    <Grid ref={gridRef} data-focusable-section="grid">
      {channels.map(ch => (
        <button key={ch.id} data-focusable onClick={() => play(ch)}>
          {ch.name}
        </button>
      ))}
    </Grid>
  );
};
```

### Use Case 2: Listen to Back Button
```javascript
const MyPage = () => {
  useSpatialNavEvent('back', () => {
    navigate(-1);
  });
  
  return <Box>Page</Box>;
};
```

### Use Case 3: Disable Nav in Input
```javascript
const Search = () => {
  const [isFocused, setIsFocused] = useState(false);
  
  // When input is focused, keyboard input goes to input, not nav
  useSpatialNavPause(isFocused);
  
  return (
    <input
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
};
```

### Use Case 4: Numeric Channel Jump
```javascript
const ChannelList = ({ channels }) => {
  useNumericChannelInput((channelNo) => {
    const ch = channels.find(c => c.channelno === channelNo);
    if (ch) navigate("/player", { state: { channel: ch } });
  });
  
  return <div>{/* list */}</div>;
};
```

---

## 🔧 Configuration

### Add Custom Keys (src/utils/spatialNavigation.js)

```javascript
SpatialNavigation.setKeyMap({
  // ... existing keys ...
  'KeyR': 'red',     // Map 'R' key to 'red' action
  'KeyG': 'green',   // Map 'G' key to 'green' action
});

// Listen to custom action
SpatialNavigation.on('red', () => {
  console.log('Red button pressed!');
});
```

### Enable Debug Mode

```javascript
// In src/utils/spatialNavigation.js, change:
SpatialNavigation.init({
  debug: true,       // Console logs
  visualDebug: true, // Visual focus overlay
  // ...
});
```

---

## 🐛 Troubleshooting

### Problem: Nothing is focusable
**Solution**: Add `data-focusable` or use semantic HTML
```javascript
// ✅ Works
<button>Click</button>
<button data-focusable>Click</button>
<div data-focusable role="button">Click</div>

// ❌ Doesn't work
<div onClick={handle}>Click</div>
```

### Problem: Focus stuck somewhere
**Solution**: Use section registration
```javascript
const gridRef = useSpatialNavSection("grid");
// Now focus is limited to elements in this section
```

### Problem: Modal breaks navigation
**Solution**: Pause spatial nav
```javascript
useSpatialNavPause(isModalOpen);
```

### Problem: Numeric jump not working
**Checklist**:
1. ✅ Type number on remote
2. ✅ Does HUD show? (check top-right)
3. ✅ Wait 1 second
4. ✅ Does channel exist?
5. ✅ Check console errors

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `src/utils/spatialNavigation.js` | Global config & helpers |
| `src/utils/useSpatialNav.js` | Custom React hooks |
| `src/App.js` | App-level init |
| `src/Modules/Home.jsx` | Example: 3 sections |
| `src/Modules/LiveChannels.jsx` | Example: Numeric jump |
| `LG_WEBOS_REMOTE_NAVIGATION.md` | Full documentation |
| `INTEGRATION_SUMMARY.md` | What was done |

---

## ✅ Verified Working

- ✅ App initializes with spatial nav
- ✅ Home page has 3 focusable sections
- ✅ LiveChannels has numeric channel jump
- ✅ All LG remote models supported
- ✅ No syntax errors
- ✅ Ready for TV deployment

---

## 🎬 Next: Deploy & Test on TV

1. Build the app: `npm run build`
2. Deploy to LG webOS TV
3. Test with actual remote:
   - Press arrow keys → navigate
   - Press OK → select
   - Press Back → go back
   - Type 55 on remote → jump to channel 55
   - Wait 1 second → auto-jump

---

**Questions?** Check `LG_WEBOS_REMOTE_NAVIGATION.md` for detailed docs.

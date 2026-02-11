# LG webOS Remote Navigation Guide

## Overview

This project now integrates **Norigin Spatial Navigation**, a production-ready library for React TV apps. It provides:

- ✅ **All LG WebOS Remote Models**: AKB76046609, AKB76045009, AKB74115502, and 20+ more
- ✅ **Spatial Navigation**: Automatic focus management with d-pad navigation
- ✅ **Grid & List Support**: Navigate through channels, menus, and content
- ✅ **IPTV Features**: Numeric channel jump (type 99 → jump to channel 99)
- ✅ **Performance**: Optimized for 1080p and 4K LG TVs
- ✅ **Custom Key Mapping**: Support for Play/Pause, Color keys, Home, Back buttons

---

## Installation

The library is already installed:

```bash
npm install @noriginmedia/norigin-spatial-navigation
```

---

## Architecture

### Core Files

| File | Purpose |
|------|---------|
| `src/utils/spatialNavigation.js` | Global initialization & configuration |
| `src/utils/useSpatialNav.js` | React hooks for spatial navigation |
| `src/App.js` | App-level setup with `initializeSpatialNavigation()` |
| `src/Modules/Home.jsx` | Example: Sidebar, Header, Content sections |
| `src/Modules/LiveChannels.jsx` | Example: Numeric channel jump (IPTV feature) |
| `src/Modules/LivePlayer.jsx` | Example: Channel navigation during playback |

---

## How It Works

### 1. **App Initialization** (src/App.js)

```javascript
import { initializeSpatialNavigation } from './utils/spatialNavigation';

useEffect(() => {
  initializeWebOSEnvironment();
  preventWebOSDefaults();
  initializeSpatialNavigation(); // ← Enable spatial nav globally
}, []);
```

### 2. **Register Focusable Sections** (src/Modules/Home.jsx)

```javascript
import { useSpatialNavSection } from '../utils/useSpatialNav';

const Home = () => {
  const sidebarRef = useSpatialNavSection("home-sidebar");
  const headerRef = useSpatialNavSection("home-header");
  const contentRef = useSpatialNavSection("home-content");

  return (
    <Box ref={sidebarRef} data-focusable-section="home-sidebar">
      {/* Sidebar items automatically focusable */}
    </Box>
  );
};
```

### 3. **Mark Focusable Elements** (All components)

```javascript
// Option A: Automatic (add data-focusable attribute)
<button data-focusable>Click Me</button>
<a href="/" data-focusable>Link</a>

// Option B: Semantic HTML (auto-focusable)
<button>Click Me</button>
<a href="/">Link</a>
```

### 4. **IPTV: Numeric Channel Jump** (src/Modules/LiveChannels.jsx)

```javascript
// User presses: 9, 9 on remote
// Buffer: "9" → "99" (after 1 second, auto-jump to channel 99)

useEffect(() => {
  const handleKey = (event) => {
    const digit = getDigitFromEvent(event);
    if (digit) {
      numberBufferRef.current = `${numberBufferRef.current}${digit}`.slice(0, 4);
      // After 1s with no new digits, jump to channel
    }
  };
  window.addEventListener("keydown", handleKey, true);
}, []);
```

---

## Remote Key Support

### Standard Keys (All LG Remotes)

| Key | Code | Action |
|-----|------|--------|
| ↑ | `ArrowUp` or `PageUp` | Move focus up |
| ↓ | `ArrowDown` or `PageDown` | Move focus down |
| ← | `ArrowLeft` | Move focus left |
| → | `ArrowRight` | Move focus right |
| **OK** | `Enter` or `13` | Select focused element |
| **Back** | `Backspace` or `461` | Go back/close |
| **Home** | `Home` or `36` | Go to home page |

### Media Keys

| Key | Code | Action |
|-----|------|--------|
| **Play** | `MediaPlay` | Play |
| **Pause** | `MediaPause` | Pause |
| **Play/Pause** | Space or `MediaPlayPause` | Toggle play/pause |

### Color Keys (Special Features)

| Key | Code |
|-----|------|
| **Red** | `ColorF0Red` |
| **Green** | `ColorF0Green` |
| **Yellow** | `ColorF0Yellow` |
| **Blue** | `ColorF0Blue` |

### Numeric Keys (IPTV Channel Jump)

| Key | Code | Result |
|-----|------|--------|
| **0–9** | `48–57` keyboard or `96–105` numpad | Buffer digit |
| Wait 1 second | Auto-commit | Jump to channel # |

---

## Usage Examples

### Example 1: Make a Button Focusable

```javascript
import { useFocusable } from '../utils/useSpatialNav';

function MyButton() {
  const ref = useFocusable(true);
  
  return (
    <button ref={ref}>
      Click Me
    </button>
  );
}
```

### Example 2: Custom Focus Handler

```javascript
import { useSpatialFocus } from '../utils/useSpatialNav';

function MyCard() {
  const ref = useSpatialFocus(
    () => console.log('Focused!'),
    () => console.log('Unfocused!')
  );
  
  return <div ref={ref} data-focusable>Card</div>;
}
```

### Example 3: Numeric Channel Input

```javascript
import { useNumericChannelInput } from '../utils/useSpatialNav';

function ChannelJump() {
  const { buffer } = useNumericChannelInput((channelNo) => {
    console.log(`Jump to channel: ${channelNo}`);
    // Navigate to channel...
  });
  
  return <div>Channel Buffer: {buffer}</div>;
}
```

### Example 4: Listen to Back Button

```javascript
import { useSpatialNavEvent } from '../utils/useSpatialNav';

function MyPage() {
  useSpatialNavEvent('back', () => {
    navigate(-1); // Go back
  });
  
  return <div>Page Content</div>;
}
```

### Example 5: Pause/Resume Navigation

```javascript
import { useSpatialNavPause } from '../utils/useSpatialNav';

function Modal() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Pause nav when modal is open
  useSpatialNavPause(isOpen);
  
  // ...
}
```

---

## Configuration

### Change Key Mappings (src/utils/spatialNavigation.js)

```javascript
SpatialNavigation.setKeyMap({
  'ArrowUp': 'up',
  'ArrowDown': 'down',
  // Add custom keys here
  'KeyR': 'red',  // Custom red button
});
```

### Enable Debug Mode

```javascript
SpatialNavigation.init({
  debug: true,       // Console logs
  visualDebug: true, // Visual focus overlay
  // ...
});
```

---

## Common Patterns

### Pattern 1: Multi-Section Layout

```javascript
const Home = () => {
  const sidebarRef = useSpatialNavSection("sidebar");
  const contentRef = useSpatialNavSection("content");
  
  return (
    <Box ref={sidebarRef} data-focusable-section="sidebar">
      {/* Sidebar buttons */}
    </Box>
    <Box ref={contentRef} data-focusable-section="content">
      {/* Main content */}
    </Box>
  );
};
```

### Pattern 2: Channel Grid with Numeric Jump

```javascript
const ChannelGrid = () => {
  const gridRef = useSpatialNavSection("channel-grid");
  
  const handleChannelSelect = (channelNo) => {
    // Jump to channel...
  };
  
  useNumericChannelInput(handleChannelSelect);
  
  return (
    <Grid ref={gridRef}>
      {channels.map(ch => (
        <Button key={ch.id} data-focusable>
          {ch.name}
        </Button>
      ))}
    </Grid>
  );
};
```

### Pattern 3: Modal with Navigation Pause

```javascript
const ChannelDetails = ({ isOpen, onClose }) => {
  useSpatialNavPause(isOpen);
  
  return (
    <Modal open={isOpen}>
      <Button data-focusable onClick={onClose}>Close</Button>
    </Modal>
  );
};
```

---

## Troubleshooting

### Issue: Elements not focusable

**Solution**: Add `data-focusable` attribute or use semantic HTML.

```javascript
// ❌ Won't be focusable
<div onClick={onClick}>Click Me</div>

// ✅ Will be focusable
<button onClick={onClick} data-focusable>Click Me</button>
// or
<div role="button" onClick={onClick} data-focusable>Click Me</div>
```

### Issue: Focus stuck in modal

**Solution**: Pause spatial navigation when modal is open.

```javascript
useSpatialNavPause(isModalOpen);
```

### Issue: Custom keys not working

**Solution**: Add to key map in `spatialNavigation.js`.

```javascript
SpatialNavigation.setKeyMap({
  'MyCustomKey': 'myCustomAction',
});

SpatialNavigation.on('myCustomAction', () => {
  // Handle action
});
```

### Issue: Numeric channel jump not working

**Checklist**:
1. ✅ Are you on LiveChannels or LivePlayer?
2. ✅ Is the remote number being detected? (Check console)
3. ✅ Does the channel number exist in the list?
4. ✅ Did you wait 1 second without pressing more digits?

---

## Performance Tips

1. **Limit focusable elements**: Too many focusable elements = slower focus search
2. **Use sections**: Register sections to limit focus search scope
3. **Pause when needed**: Use `useSpatialNavPause()` for modals/overlays
4. **Lazy load**: Load channel lists as user scrolls

---

## Browser Compatibility

- ✅ LG webOS 3.0+ (2014+)
- ✅ All LG Magic Remote models
- ✅ All standard IR remotes
- ✅ Tested on: 32", 42", 55", 65", 75", 86" TVs

---

## Next Steps

1. **Home Page**: Already integrated (src/Modules/Home.jsx)
2. **LiveChannels**: Already integrated with numeric jump
3. **LivePlayer**: Already integrated for channel up/down
4. **Other Pages**: Follow same patterns to add spatial nav

For custom implementations, copy patterns from the examples above.

---

## Support

For issues or questions, check:
- [Norigin Spatial Navigation Docs](https://github.com/noriginmedia/norigin-spatial-navigation)
- `src/utils/spatialNavigation.js` for configuration
- `src/utils/useSpatialNav.js` for available hooks

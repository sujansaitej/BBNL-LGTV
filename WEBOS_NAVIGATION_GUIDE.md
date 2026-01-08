# webOS TV Remote Navigation - Implementation Guide

## Overview
This implementation provides comprehensive LG webOS TV remote control support with proper focus management, grid navigation, and input handling.

## Features Implemented

### 1. **Grid Navigation for Channel Cards**
- ✅ Up/Down/Left/Right arrow key navigation
- ✅ Smooth scrolling and focus transitions
- ✅ Visual focus indicators with scaling and borders
- ✅ Automatic scroll-into-view for off-screen items
- ✅ 5-column grid layout optimized for TV screens

### 2. **Horizontal Navigation for Categories**
- ✅ Left/Right navigation through category filters
- ✅ Focus highlights on active categories
- ✅ Smooth transitions and animations

### 3. **Input Focus Management**
- ✅ Prevents body scrolling when inputs are focused
- ✅ Disables grid navigation during text input
- ✅ Proper focus/blur event handling
- ✅ webOS-specific input attributes

### 4. **Enhanced User Experience**
- ✅ Visual feedback with scale transforms
- ✅ Gradient borders for focused items
- ✅ Box shadows and glow effects
- ✅ Smooth scroll behavior
- ✅ Back button support (Backspace/Escape)

## Files Modified/Created

### Core Navigation Hook
**File:** `src/Atomic-Common-Componenets/useRemoteNavigation.js`

**Functions:**
- `useRemoteNavigation()` - Horizontal/vertical list navigation
- `useGridNavigation()` - 2D grid navigation (NEW)
- `useInputFocusHandler()` - Prevents scroll issues (NEW)
- `isInputFocused()` - Utility to check input focus (NEW)

### LiveChannels Component
**File:** `src/Modules/LiveChannels.jsx`

**Changes:**
- Added `useGridNavigation` for channel cards
- Added `useRemoteNavigation` for category filters
- Added `isSearchFocused` state to disable navigation during search
- Enhanced `ChannelBox` component with focus styling
- Updated grid layout to fixed 5 columns for predictable navigation
- Added `handleChannelSelect` function
- Added focus indicators and animations

### LoginOtp Component
**File:** `src/OAuthenticate/LoginOtp.jsx`

**Changes:**
- Added `useInputFocusHandler` to prevent scroll issues
- Added `data-webos-input` attributes to input fields
- Prevents unwanted body scrolling during input

### Styles
**File:** `src/styles/webos-navigation.css` (NEW)

**Includes:**
- Global focus styles for TV navigation
- Card focus animations
- Input field specific styles
- Scroll container customization
- 4K TV optimizations
- High contrast mode support

### webOS Utilities
**File:** `src/utils/webos.js` (NEW)

**Functions:**
- `isWebOSTV()` - Detect webOS environment
- `initializeWebOSEnvironment()` - Setup body classes
- `preventWebOSDefaults()` - Prevent unwanted behaviors
- `handleWebOSBackButton()` - Back button handler
- `getWebOSTVInfo()` - Get TV information
- And more...

### App Configuration
**File:** `src/App.js`

**Changes:**
- Import and initialize webOS environment
- Call `preventWebOSDefaults()` on mount

**File:** `src/index.js`

**Changes:**
- Import `webos-navigation.css` styles

## Usage Examples

### Grid Navigation (Channel Cards)

```javascript
import { useGridNavigation } from '../path/to/useRemoteNavigation';

const MyComponent = () => {
  const items = [...]; // Your data array
  const columnsCount = 5; // Number of columns in grid

  const { getItemProps, focusedIndex } = useGridNavigation(
    items.length,
    columnsCount,
    {
      onSelect: (index) => {
        // Handle item selection
        console.log('Selected:', items[index]);
      },
      loop: false, // Optional: enable looping
      enabled: true, // Optional: disable navigation
    }
  );

  return (
    <div className="grid">
      {items.map((item, index) => (
        <div
          key={index}
          {...getItemProps(index)}
          data-focused={getItemProps(index)['data-focused']}
        >
          {/* Your item content */}
        </div>
      ))}
    </div>
  );
};
```

### Horizontal Navigation (Filters/Tabs)

```javascript
import { useRemoteNavigation } from '../path/to/useRemoteNavigation';

const Categories = () => {
  const categories = ['All', 'Movies', 'Sports'];

  const { getItemProps } = useRemoteNavigation(
    categories.length,
    {
      orientation: 'horizontal',
      onSelect: (index) => {
        console.log('Selected:', categories[index]);
      },
    }
  );

  return (
    <div className="flex">
      {categories.map((cat, i) => (
        <button key={i} {...getItemProps(i)}>
          {cat}
        </button>
      ))}
    </div>
  );
};
```

### Input Focus Handler

```javascript
import { useInputFocusHandler } from '../path/to/useRemoteNavigation';

const LoginForm = () => {
  // Prevents body scroll when inputs are focused
  useInputFocusHandler();

  return (
    <form>
      <input
        type="text"
        data-webos-input="true" // Add this attribute
      />
    </form>
  );
};
```

## Remote Control Key Mappings

| Remote Key | Action | Behavior |
|------------|--------|----------|
| ↑ (Up) | Navigate Up | Move focus to item above in grid |
| ↓ (Down) | Navigate Down | Move focus to item below in grid |
| ← (Left) | Navigate Left | Move focus to item on left |
| → (Right) | Navigate Right | Move focus to item on right |
| OK/Enter | Select | Execute onSelect callback or click element |
| Back/Backspace | Go Back | Navigate to previous page |
| Escape | Cancel | Same as Back |

## Focus Styling

### Focused Elements
- 4px blue outline (#667eea)
- Scale transform (1.05x - 1.1x)
- Box shadow with glow effect
- Smooth transitions (0.2s ease)

### Channel Cards (Focused)
- 4px border: #667eea
- Scale: 1.1x
- Box shadow with blue glow
- Higher z-index for overlay effect

### Category Filters (Focused)
- 2px outline with offset
- Slight upward transform
- Enhanced background on focus

## TV Screen Optimizations

### Standard HD (1920x1080)
- Default spacing and sizing
- 3px outline width

### 4K (3840x2160)
- Increased spacing (48px gaps)
- 6px outline width
- Larger padding

## Preventing Scroll Issues

### Problem
When an input field is focused on webOS TV, the entire UI would scroll uncontrollably.

### Solution
1. **useInputFocusHandler hook** - Monitors focus events
2. **Body overflow control** - Sets `overflow: hidden` on input focus
3. **Data attributes** - Flags inputs with `data-input-focused`
4. **Navigation disable** - Grid navigation disabled during input focus

### Implementation
```javascript
// In any component with inputs
useInputFocusHandler();

// Add to input elements
<input data-webos-input="true" />
```

## Testing Checklist

- [ ] Channel cards navigate correctly (up/down/left/right)
- [ ] Focus indicators are visible and attractive
- [ ] Smooth scrolling when navigating off-screen items
- [ ] Category filters navigate horizontally
- [ ] Search input doesn't trigger unwanted scrolling
- [ ] Enter/OK key selects focused item
- [ ] Back button navigates to previous page
- [ ] Focus wraps correctly at edges (if loop enabled)
- [ ] Focus styles work in high contrast mode
- [ ] Optimizations work on 4K displays

## Known Limitations

1. **Grid columns** - Currently fixed at 5 columns. Adjust `columnsCount` variable in LiveChannels.jsx for different layouts.
2. **Touch support** - Optimized for remote, may need adjustments for touch screens.
3. **Multiple grids** - Only one grid navigation active at a time.

## Troubleshooting

### Focus not visible
- Check if `webos-navigation.css` is imported
- Verify `data-focused` attribute is being set
- Check z-index conflicts

### Navigation not working
- Ensure `enabled` prop is true
- Check if input is focused (navigation disabled)
- Verify item count matches actual items

### Scrolling issues with inputs
- Add `useInputFocusHandler()` to component
- Add `data-webos-input="true"` to inputs
- Check if focus/blur events are firing

### Grid navigation skipping items
- Verify `columnsCount` matches actual grid columns
- Check CSS grid template columns
- Ensure all items are rendered

## Performance Considerations

1. **Smooth Scrolling** - Uses `scrollIntoView` with `smooth` behavior
2. **Debounced Search** - RxJS debounce prevents excessive filtering
3. **Minimal Re-renders** - Focus state isolated to navigation hook
4. **CSS Transitions** - Hardware-accelerated transforms

## Future Enhancements

- [ ] Dynamic column calculation based on screen size
- [ ] Voice control integration
- [ ] Gesture support for webOS Magic Remote
- [ ] Multi-grid navigation (nested grids)
- [ ] Customizable focus animations
- [ ] Keyboard shortcuts overlay
- [ ] Navigation sound effects

## Support

For issues or questions:
1. Check console for errors
2. Verify webOS environment detection
3. Test on actual LG TV hardware
4. Review network tab for API issues

---

**Last Updated:** January 2026
**webOS Version Tested:** webOS 6.0+
**React Version:** 18.x

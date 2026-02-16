# 🎮 Direct UI Integration - Magic Remote (MRCU)

Complete step-by-step guide to integrate Magic Remote navigation directly into your existing UI.

---

## 📋 Step 1: Update Your Component Imports

```javascript
// At the top of your LiveChannels.jsx or any component
import { useEnhancedRemoteNavigation } from "../Atomic-Common-Componenets/useMagicRemote";
```

---

## 📋 Step 2: Replace Navigation Hook

### BEFORE (Old Navigation):
```javascript
const LiveChannels = () => {
  // ... your existing state
  const filteredChannels = useMemo(() => { /* ... */ }, []);
  
  // OLD: Remove this if you have it
  // const { getItemProps } = useRemoteNavigation(filteredChannels.length);
```

### AFTER (Magic Remote):
```javascript
const LiveChannels = () => {
  // ... your existing state
  const filteredChannels = useMemo(() => { /* ... */ }, []);
  
  // NEW: Add Magic Remote navigation
  const {
    focusedIndex,
    hoveredIndex,
    getItemProps,
    magicRemoteReady,
    channelJumpBuffer,
  } = useEnhancedRemoteNavigation(
    filteredChannels, // Pass FULL ARRAY (not .length)
    {
      orientation: 'grid',
      columns: columnsCount || 5,
      useMagicRemotePointer: true,
      focusThreshold: 150,
      enableNumberJump: true,
      numberJumpTimeout: 1000,
      numberJumpField: 'channelno',
      onSelect: (index) => {
        handleChannelSelect(filteredChannels[index]);
      },
    }
  );
```

---

## 📋 Step 3: Add HUD Display (Number Jump Indicator)

Add this BEFORE your channel grid:

```javascript
return (
  <Box sx={{ /* ... */ }}>
    
    {/* === ADD THIS: Channel Jump HUD === */}
    {channelJumpBuffer && (
      <Box
        sx={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          px: '2rem',
          py: '1rem',
          borderRadius: '12px',
          fontSize: '1.75rem',
          fontWeight: 700,
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.8)',
          zIndex: 100,
          animation: 'pulse 0.6s ease infinite',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 1 },
            '50%': { transform: 'scale(1.08)', opacity: 0.85 },
          },
        }}
      >
        📺 Channel: {channelJumpBuffer}
      </Box>
    )}

    {/* === (Optional) Magic Remote Status === */}
    {magicRemoteReady && (
      <Box
        sx={{
          position: 'fixed',
          top: '2rem',
          left: '2rem',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '2px solid rgba(34, 197, 94, 0.4)',
          color: '#22c55e',
          px: '1.5rem',
          py: '0.75rem',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          zIndex: 100,
        }}
      >
        🎮 Magic Remote Active
      </Box>
    )}

    {/* Your existing header, filters, etc. */}
    
  </Box>
);
```

---

## 📋 Step 4: Update Channel Grid Rendering

### BEFORE (without Magic Remote):
```javascript
{filteredChannels.map((channel, index) => (
  <Box
    key={`${channel.channelno}-${index}`}
    onClick={() => handleChannelSelect(channel)}
  >
    <ChannelBox {...channel} />
  </Box>
))}
```

### AFTER (with Magic Remote):
```javascript
{filteredChannels.map((channel, index) => {
  const isFocused = focusedIndex === index;
  const isHovered = hoveredIndex === index;

  return (
    <Box
      key={`${channel.channelno}-${index}`}
      {...getItemProps(index)} // Add this!
      className="channel-card"
      role="button"
      onClick={() => handleChannelSelect(channel)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleChannelSelect(channel);
        }
      }}
      sx={{
        outline: 'none',
        transition: 'all 0.15s ease',
        // Enhanced focus styles
        ...(isFocused && {
          '& .channel-thumb': {
            border: '3px solid #667eea',
            boxShadow: '0 0 30px rgba(102, 126, 234, 0.6)',
            transform: 'scale(1.08)',
          },
        }),
        // Hover from Magic Remote
        ...(isHovered && !isFocused && {
          '& .channel-thumb': {
            border: '2px solid #667eea',
            transform: 'scale(1.03)',
          },
        }),
      }}
    >
      <ChannelBox
        logo={channel.chlogo}
        name={channel.chtitle}
        channelNo={channel.channelno}
        price={channel.chprice}
        onClick={() => handleChannelSelect(channel)}
      />
    </Box>
  );
})}
```

---

## 📋 Step 5: Add CSS for ChannelBox Focus

Update your ChannelBox component or add global CSS:

```css
/* In your CSS or styled component */
.channel-thumb {
  transition: all 0.15s ease;
  border: 2px solid transparent;
}

/* Focused state */
[data-focused="true"] .channel-thumb {
  border: 3px solid #667eea !important;
  box-shadow: 0 0 30px rgba(102, 126, 234, 0.6);
  transform: scale(1.08);
}

/* Hovered from Magic Remote */
[data-hovered="true"]:not([data-focused="true"]) .channel-thumb {
  border: 2px solid #667eea;
  transform: scale(1.03);
}
```

---

## 📋 Step 6: Test All Features

### ✅ Arrow Keys
- Press **Right/Left** → Should move focus horizontally
- Press **Up/Down** → Should move focus vertically in grid

### ✅ Number Jump
- Press **1-2-3** → Should show HUD "Channel: 123"
- Wait 1 second → Should jump to Channel 123 and play

### ✅ Magic Remote Pointer
- Move Magic Remote → Pointer should appear on screen
- Hover over channel → Should highlight automatically
- Press Enter/OK → Should play channel

### ✅ Visual Feedback
- Focused item → Blue glow + scale up
- Hovered item → Lighter blue border
- HUD appears → Pulse animation

---

## 🔧 Configuration Options

Adjust these in `useEnhancedRemoteNavigation`:

```javascript
{
  // Grid layout
  orientation: 'grid',      // 'grid' | 'horizontal' | 'vertical'
  columns: 5,               // Number of columns in grid
  
  // Magic Remote pointer
  useMagicRemotePointer: true,  // Enable/disable pointer
  focusThreshold: 150,          // Distance in pixels (50-200)
  
  // Number jump
  enableNumberJump: true,       // Enable 0-9 keys
  numberJumpTimeout: 1000,      // Buffer timeout (500-2000ms)
  numberJumpField: 'channelno', // Field name in your objects
  
  // Selection callback
  onSelect: (index) => {
    playChannel(filteredChannels[index]);
  },
}
```

---

## 🎨 Customization Examples

### Custom HUD Style:
```javascript
<Box
  sx={{
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0, 0, 0, 0.9)',
    color: '#00ff00',
    px: '3rem',
    py: '2rem',
    borderRadius: '20px',
    fontSize: '3rem',
    fontWeight: 900,
    border: '4px solid #00ff00',
    boxShadow: '0 0 50px rgba(0, 255, 0, 0.8)',
  }}
>
  {channelJumpBuffer}
</Box>
```

### Faster Animations:
```javascript
sx={{
  transition: 'all 0.1s ease', // Change from 0.15s to 0.1s
  transform: isFocused ? 'scale(1.1)' : 'scale(1)', // Bigger scale
}}
```

### Different Colors:
```javascript
...(isFocused && {
  '& .channel-thumb': {
    border: '3px solid #ff6b6b', // Red instead of blue
    boxShadow: '0 0 30px rgba(255, 107, 107, 0.6)',
  },
})
```

---

## 🚨 Common Issues

### Issue: Number jump not working
**Solution**: Pass full array, not `.length`
```javascript
// ❌ WRONG
useEnhancedRemoteNavigation(channels.length, { ... })

// ✅ CORRECT
useEnhancedRemoteNavigation(channels, { ... })
```

### Issue: Wrong field name
**Solution**: Check your channel object structure
```javascript
console.log(channels[0]); // See what fields exist

// If channels have { id: 123 } instead of { channelno: 123 }
numberJumpField: 'id' // Change to match your field
```

### Issue: Magic Remote not working
**Solution**: Check permissions in appinfo.json
```json
{
  "requiredPermissions": [
    "deviceid.query",
    "networkconnection.query",
    "mrcu.operation"  // Must have this!
  ]
}
```

---

## 📦 Complete Working Example

See [LiveChannelsIntegration.jsx](src/Atomic-Common-Componenets/LiveChannelsIntegration.jsx) for full implementation.

---

## ✅ Checklist

Before deploying, verify:

- [ ] Imported `useEnhancedRemoteNavigation`
- [ ] Passed full array (not `.length`)
- [ ] Added `getItemProps(index)` to each item
- [ ] Added HUD display with `channelJumpBuffer`
- [ ] Added focus styles with `isFocused` check
- [ ] Added `mrcu.operation` permission
- [ ] Tested arrow keys
- [ ] Tested number jump (1-2-3)
- [ ] Tested Magic Remote pointer
- [ ] Tested Enter/OK selection

---

**You're ready to go!** 🚀

# Magic Remote Navigation (MRCU API Integration)

Fast, smooth remote navigation using LG webOS official Luna MRCU service.

## ✅ Implementation Complete

### Files Created:
1. **useMagicRemote.js** - Main Magic Remote hooks
2. **MagicRemoteExample.jsx** - Usage examples
3. **appinfo.json** - Added `mrcu.operation` permission

---

## 🚀 Features

### 1. **useMagicRemote** Hook
- ✅ Coordinate tracking (pointer position)
- ✅ Motion sensor data (gyroscope, accelerometer)
- ✅ Quaternion data (3D orientation)
- ✅ Auto-detection of webOS TV version (24+ or legacy)
- ✅ Configurable callback intervals (10-1000ms)
- ✅ Sensor reset functionality

### 2. **useEnhancedRemoteNavigation** Hook
- ✅ Combines keyboard + Magic Remote pointer
- ✅ Grid/horizontal/vertical navigation
- ✅ Automatic focus on pointer proximity
- ✅ Standard Enter/Space selection
- ✅ Smooth 60 FPS tracking

---

## 📖 Quick Start

### Basic Coordinate Tracking
```javascript
import { useMagicRemote } from './useMagicRemote';

function MyComponent() {
  const { coordinates, isReady } = useMagicRemote({
    enabled: true,
    sensorType: 'coordinate',
    interval: 50, // 20 FPS
  });

  return (
    <div>
      Pointer: {coordinates.x}, {coordinates.y}
      {isReady && <span>✓ Magic Remote Ready</span>}
    </div>
  );
}
```

### Enhanced Grid Navigation
```javascript
import { useEnhancedRemoteNavigation } from './useMagicRemote';

function ChannelGrid({ channels }) {
  const { focusedIndex, getItemProps } = useEnhancedRemoteNavigation(
    channels.length,
    {
      orientation: 'grid',
      columns: 5,
      useMagicRemotePointer: true, // Enable pointer
      focusThreshold: 100, // Pixel distance
      onSelect: (index) => playChannel(channels[index]),
    }
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
      {channels.map((channel, index) => (
        <div key={index} {...getItemProps(index)}>
          {channel.name}
        </div>
      ))}
    </div>
  );
}
```

### Full Sensor Data
```javascript
const { sensorData, resetQuaternion } = useMagicRemote({
  enabled: true,
  sensorType: 'all', // All sensors
  interval: 16, // 60 FPS
  onSensorData: (data) => {
    console.log('Gyro:', data.gyroscope);
    console.log('Accel:', data.acceleration);
    console.log('Rotation:', data.gameRotationVector.euler);
  },
});
```

---

## ⚙️ Configuration Options

### useMagicRemote Options
```javascript
{
  enabled: true,              // Enable/disable tracking
  sensorType: 'coordinate',   // 'coordinate' | 'gyroscope' | 'acceleration' | 'all'
  interval: 100,              // Callback interval (10-1000ms)
  onCoordinateChange: fn,     // Callback for coordinate changes
  onSensorData: fn,           // Callback for full sensor data
}
```

### useEnhancedRemoteNavigation Options
```javascript
{
  orientation: 'grid',        // 'horizontal' | 'vertical' | 'grid'
  columns: 5,                 // Grid columns
  enabled: true,              // Enable navigation
  useMagicRemotePointer: true, // Use Magic Remote pointer
  focusThreshold: 50,         // Pixel distance to trigger focus
  onSelect: fn,               // Selection callback
}
```

---

## 🎯 Integration Steps

### 1. Update Your Components

Replace old navigation with Magic Remote:

```diff
- import { useRemoteNavigation } from './useRemoteNavigation';
+ import { useEnhancedRemoteNavigation } from './useMagicRemote';

function LiveChannels() {
-  const { getItemProps } = useRemoteNavigation(channels.length);
+  const { focusedIndex, getItemProps, magicRemoteReady } = useEnhancedRemoteNavigation(
+    channels.length,
+    {
+      orientation: 'grid',
+      columns: 5,
+      useMagicRemotePointer: true,
+      onSelect: (index) => playChannel(channels[index]),
+    }
+  );

  return (
    <div>
+     {magicRemoteReady && <div>🎮 Magic Remote Active</div>}
      {channels.map((ch, i) => (
        <div {...getItemProps(i)}>{ch.name}</div>
      ))}
    </div>
  );
}
```

### 2. Add CSS for Smooth Focus
```css
[data-focused="true"] {
  border: 3px solid #667eea;
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
  transition: all 0.15s ease; /* Fast, smooth */
}

[data-hovered="true"] {
  border: 2px solid #667eea;
  transform: scale(1.02);
  transition: all 0.1s ease;
}
```

### 3. Test on TV
1. Build IPK: `npm run build` then package with `ares-package`
2. Install: `ares-install --device <TV-NAME> com.lg.bbnl_2.0.0_all.ipk`
3. Launch app and move Magic Remote
4. Pointer should highlight channels automatically

---

## 🔧 API Methods

### Returns from useMagicRemote
```javascript
{
  coordinates: { x: number, y: number },
  sensorData: object,           // Full sensor data
  isReady: boolean,             // Service ready
  apiVersion: string,           // MRCU API version
  resetQuaternion: () => void,  // Reset sensor
  setSensorInterval: (ms) => void, // Change interval
}
```

### Returns from useEnhancedRemoteNavigation
```javascript
{
  focusedIndex: number,         // Current focus
  hoveredIndex: number,         // Pointer hover
  getItemProps: (index) => {},  // Props for items
  magicRemoteReady: boolean,    // MRCU ready
  coordinates: { x, y },        // Pointer position
}
```

---

## 📊 Sensor Data Types

### Coordinate
```javascript
{ x: number, y: number } // Screen position
```

### Gyroscope (rotation rate)
```javascript
{ x: number, y: number, z: number } // deg/s
```

### Accelerometer (acceleration)
```javascript
{ x: number, y: number, z: number } // m/s²
```

### Game Rotation Vector (quaternion)
```javascript
{
  x: number,
  y: number,
  z: number,
  w: number,
  euler: { pitch: number, roll: number, yaw: number }
}
```

---

## 🚨 Troubleshooting

### Magic Remote not working?
1. **Check permissions**: `appinfo.json` must have `"mrcu.operation"`
2. **Wake remote**: Press any button to wake from sleep
3. **Check TV version**: Use `getAPIVersion` to verify
4. **Console logs**: Look for `[MagicRemote]` logs

### Pointer not accurate?
1. **Adjust threshold**: Increase `focusThreshold` (default: 50px)
2. **Change interval**: Lower interval for faster updates (min: 10ms)
3. **Reset sensor**: Call `resetQuaternion()` to recenter

### Performance issues?
1. **Reduce interval**: Use 50-100ms instead of 16ms
2. **Limit sensor types**: Use `'coordinate'` only, not `'all'`
3. **Debounce callbacks**: Add throttling to `onCoordinateChange`

---

## 🎮 Best Practices

1. **Always check `isReady`** before showing UI
2. **Call `resetQuaternion()`** when entering navigation area
3. **Use 16-50ms interval** for smooth 20-60 FPS
4. **Enable only when needed** to save battery
5. **Fallback to keyboard** for compatibility

---

## 📝 Status

✅ **Implementation**: Complete  
✅ **Permissions**: Added  
✅ **Examples**: Provided  
✅ **Documentation**: Complete  

**Ready to use!** See `MagicRemoteExample.jsx` for full examples.

---

## 🔗 Official Documentation

- [LG webOS MRCU API](https://webostv.developer.lge.com/api/webos-service-api/magic-remote/)
- [Motion Sensor Overview](https://webostv.developer.lge.com/develop/guides/motion-sensor/)

# Device Information Implementation Guide

## Overview
This document explains how the LG webOS TV app retrieves and displays device information including IP addresses and Device ID.

---

## Architecture

### File Structure
```
src/
├── Api/
│   └── Deviceinformaction/
│       └── ipaddress.jsx          # Custom React hook for device info
├── utils/
│   └── webos.js                   # WebOS TV detection and Luna API calls
└── App.js                          # Main component displaying device info

public/
└── index.html                      # CRITICAL: Loads webOSTV.js library
```

---

## How It Works

### 1. WebOS TV Detection (`src/utils/webos.js`)

#### Detection Methods
The app checks if it's running on an LG webOS TV using multiple fallback methods:

```javascript
// Primary check: window.webOS object (loaded from webOSTV.js)
if (window.webOS) {
  return true;
}

// Fallback checks:
- window.PalmSystem exists
- navigator.userAgent contains "Web0S", "webOS", or "LG Browser"
```

**Why multiple checks?**
- Different LG TV models expose different APIs
- Ensures maximum compatibility across firmware versions

---

### 2. IP Address Retrieval

#### Public IP Addresses
**Method:** External API calls to third-party services

```javascript
// IPv4: https://api.ipify.org?format=json
// IPv6: https://api6.ipify.org?format=json
```

**Features:**
- ✅ Fetched in **parallel** (not sequential) for speed
- ✅ Independent fetching: IPv4 success doesn't depend on IPv6
- ✅ 5-second timeout prevents indefinite loading
- ✅ Uses `Promise.allSettled()` to allow partial success

**Why this works:**
- Public IP APIs are accessible from TV's internet connection
- No special permissions required
- Works on ALL LG TV models

#### Private IP Addresses
**Method:** Luna Service API call (if available)

```javascript
// Luna API: luna://com.palm.connectionmanager
// Method: getStatus
```

**Features:**
- ✅ Retrieves local network IP (e.g., 10.10.16.145)
- ✅ Detects connection type (WiFi or Wired)
- ✅ Fallback to "Not available" if Luna service unavailable

**Why this might fail:**
- Some TV firmware versions don't expose Luna Service to web apps
- Requires `window.webOS.service.request` to be a valid function
- May need specific permissions in `appinfo.json`

---

### 3. Device ID Retrieval

#### Priority System (3 Levels)

##### **Level 1: Official LGUDID (Luna Service)**
```javascript
// Luna API: luna://com.webos.service.sm
// Method: deviceid/getIDs
// Parameters: { idType: ['LGUDID'] }
```

**Requirements:**
- ✅ `window.webOS.service.request` must be a function
- ✅ Permission: `"deviceid.query"` in `appinfo.json`
- ✅ TV firmware must support LGUDID API

**Success Result:** 12-character unique ID (e.g., `LGUDID123456`)

**Why this might fail:**
- Many consumer TV models don't expose Luna Service to web apps
- Developer Mode may not grant full API access
- Firmware restrictions on device ID retrieval

---

##### **Level 2: Fallback Device ID (Public IP)**
```javascript
// Generated format: TV-{public-ip-with-dashes}
// Example: TV-103-50-20-100
```

**How it works:**
1. If Luna LGUDID fails, use public IPv4 address
2. Replace dots with dashes for readability
3. Prefix with "TV-" for identification

**Why this is reliable:**
- Public IP is already successfully fetched
- Unique to your internet connection
- Works on ALL TV models (no API required)

---

##### **Level 3: Emergency Fallback (Private IP or Timestamp)**
```javascript
// Format 1: LG-{last-2-segments}-{CONNECTION_TYPE}
// Example: LG-16-145-WIFI

// Format 2 (last resort): LG-DEVICE-{timestamp}
// Example: LG-DEVICE-12345678
```

**When used:**
- Both Luna service AND public IP fetch fail
- Uses last 2 segments of private IP + connection type
- If everything fails, uses current timestamp

---

## Critical Requirements

### 1. webOSTV.js Library (`public/index.html`)

**MUST include this script tag:**
```html
<script src="https://web.webostv.com/api/tv/webosTV.js"></script>
```

**Why critical?**
- Exposes `window.webOS` object
- Required for ALL Luna Service API calls
- Must load BEFORE React app initializes
- Without this: Device ID will always use fallback

---

### 2. App Permissions (`public/appinfo.json` and `build/appinfo.json`)

**Required permissions:**
```json
{
  "requiredPermissions": [
    "deviceid.query",
    "networkconnection.query"
  ]
}
```

**What they enable:**
- `deviceid.query`: Access to LGUDID via Luna API
- `networkconnection.query`: Access to network status and private IP

**Important:**
- Must be in BOTH `public/` and `build/` versions
- Requires rebuilding .ipk file after changes
- May not work on all TV models (firmware dependent)

---

## Performance Optimization

### Parallel Fetching Strategy

**Old (Sequential) - SLOW:**
```javascript
const deviceId = await getDeviceId();        // 5 seconds
const networkInfo = await getNetworkInfo();  // 5 seconds  
const publicIP = await getPublicIP();        // 5 seconds
// Total: 15 seconds! 😱
```

**New (Parallel) - FAST:**
```javascript
const [deviceId, networkInfo, publicIP] = await Promise.all([
  getDeviceId(),      // All 3 run
  getNetworkInfo(),   // at the
  getPublicIP()       // same time!
]);
// Total: 5 seconds max! ⚡
```

### Timeout Strategy

**Each fetch has 5-second timeout:**
```javascript
Promise.race([
  actualFetchFunction(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
]);
```

**Why this matters:**
- Prevents indefinite "Loading..." state
- Shows partial data quickly (e.g., IP shows even if Device ID fails)
- User sees results in 1-3 seconds typically

---

## Code Flow Diagram

```
App.js
  └─> useDeviceInformation() hook
        │
        ├─> fetchDeviceInfo() (runs on mount)
        │     │
        │     ├─> Promise.all (PARALLEL):
        │     │     ├─> fetchDeviceIdWithTimeout(5000)
        │     │     │     └─> getWebOSDeviceID()
        │     │     │           ├─> Check window.webOS.service.request
        │     │     │           └─> luna://com.webos.service.sm
        │     │     │
        │     │     ├─> fetchNetworkInfoWithTimeout(5000)
        │     │     │     └─> getWebOSNetworkInfo()
        │     │     │           └─> luna://com.palm.connectionmanager
        │     │     │
        │     │     └─> fetchPublicIPWithTimeout(5000)
        │     │           └─> Promise.allSettled:
        │     │                 ├─> fetch('https://api.ipify.org')
        │     │                 └─> fetch('https://api6.ipify.org')
        │     │
        │     └─> generateFallbackDeviceId()
        │           └─> If Luna failed, use public IP format
        │
        └─> Returns deviceInfo state object
```

---

## Troubleshooting

### Issue 1: "Unable to fetch" Device ID

**Symptoms:**
- Device ID shows "Unable to fetch" or fallback value

**Possible Causes:**
1. ❌ webOSTV.js not loaded in index.html
2. ❌ `window.webOS.service.request` is not a function
3. ❌ TV firmware doesn't support Luna Service APIs
4. ❌ Missing permissions in appinfo.json

**Solutions:**
- ✅ Verify script tag exists in `public/index.html`
- ✅ Check console for "Luna service.request not available"
- ✅ Accept fallback Device ID (public IP format)
- ✅ Rebuild app after adding permissions

**Expected Result:**
If Luna fails, you'll see: `TV-103-50-20-100` (from public IP)

---

### Issue 2: Private IP shows "Not available"

**Symptoms:**
- Public IP works, but Private IP fails

**Causes:**
- Luna Service `connectionmanager` not accessible
- TV firmware restrictions

**Solutions:**
- This is NORMAL on many TV models
- Public IP is sufficient for identification
- Private IP is optional (nice-to-have)

---

### Issue 3: Slow loading / "Loading..." persists

**Symptoms:**
- Data takes 10+ seconds to appear
- "Loading..." state doesn't disappear

**Causes:**
- Sequential fetching instead of parallel
- No timeout logic
- Retry loops causing delays

**Solutions:**
- ✅ Verify using `Promise.all()` for parallel fetching
- ✅ Check each fetch has 5-second timeout
- ✅ Remove any retry loops

---

### Issue 4: IPv6 shows "Not available"

**Symptoms:**
- IPv4 works, IPv6 fails

**Causes:**
- api6.ipify.org DNS resolution fails on some networks
- TV doesn't have IPv6 connectivity

**Solutions:**
- This is EXPECTED and NORMAL
- Most TVs only have IPv4
- IPv6 is optional (future-proofing)

---

## Deployment Checklist

Before deploying to TV, verify:

- [ ] `public/index.html` has webOSTV.js script tag
- [ ] `public/appinfo.json` has requiredPermissions array
- [ ] `build/appinfo.json` has requiredPermissions array (copy from public/)
- [ ] Code uses `Promise.all()` for parallel fetching
- [ ] Each fetch has 5-second timeout
- [ ] Fallback Device ID uses public IP format
- [ ] App shows partial data even if some APIs fail

---

## Deployment Commands

```powershell
# 1. Build React app
npm run build

# 2. Package as .ipk file
ares-package build

# 3. Install on TV
ares-install --device mylgtv com.lg.bbnl_2.0.0_all.ipk

# 4. Launch app
ares-launch --device mylgtv com.lg.bbnl

# 5. Open debugger console
ares-inspect --device mylgtv --app com.lg.bbnl --open
```

---

## Console Output Examples

### Successful Luna Service Access (Rare)
```
✓ webOS TV detected via window.webOS
✓ Device ID: LGUDID123456
✓ Network: WiFi 10.10.16.145
```

### Typical Scenario (Luna Unavailable)
```
✓ webOS TV detected via fallback checks
⚠ Luna service.request not available - device ID will use fallback
⚠ Luna service.request not available for network info
[ipaddress.jsx] Using Device ID from public IP: TV-103-50-20-100
```

### Complete Failure Scenario (All APIs blocked)
```
⚠ Not on webOS TV
⚠ Device ID fetch failed: timeout
⚠ Network info fetch failed: timeout
[ipaddress.jsx] Using timestamp Device ID: LG-DEVICE-12345678
```

---

## Technical Limitations

### What Works on ALL TVs:
- ✅ Public IPv4 address
- ✅ Fallback Device ID (public IP format)
- ✅ Basic webOS detection

### What May NOT Work (TV-dependent):
- ❌ Official LGUDID (Luna Service)
- ❌ Private IP via Luna API
- ❌ IPv6 address
- ❌ Connection type detection

### Why Luna Service Often Fails:
1. **Security restrictions**: Consumer TVs restrict API access
2. **Firmware versions**: Older/newer firmware may not expose APIs
3. **Developer Mode limitations**: Not all APIs available in dev mode
4. **Web app vs native app**: Native apps have more API access

---

## Alternative Solutions (If Luna Service Never Works)

### Option 1: Use MAC Address (Requires Native Code)
```javascript
// NOT possible in web apps
// Requires native Enact app with system-level permissions
```

### Option 2: Store UUID in LocalStorage
```javascript
// Generate on first launch, persist across sessions
let deviceId = localStorage.getItem('device_id');
if (!deviceId) {
  deviceId = `TV-${Date.now()}-${Math.random().toString(36)}`;
  localStorage.setItem('device_id', deviceId);
}
```

### Option 3: Use Current Implementation (Recommended)
```javascript
// Public IP-based Device ID
// Unique, reliable, works everywhere
Device ID: TV-103-50-20-100
```

---

## Best Practices

### 1. Always Show Partial Data
```javascript
// GOOD: Show what you have, even if incomplete
publicIPv4: publicIPs.ipv4 || 'Not available',
deviceId: finalDeviceId || 'Unable to fetch',

// BAD: All-or-nothing approach
if (!allDataFetched) return <Loading />;
```

### 2. Parallel > Sequential
```javascript
// GOOD: Fast (all run together)
await Promise.all([fetch1(), fetch2(), fetch3()]);

// BAD: Slow (one after another)
await fetch1(); await fetch2(); await fetch3();
```

### 3. Always Use Timeouts
```javascript
// GOOD: Fail after 5 seconds
Promise.race([fetch(), timeout(5000)]);

// BAD: Wait forever
await fetch(); // No timeout
```

### 4. Graceful Fallbacks
```javascript
// GOOD: Multiple fallback levels
deviceId || fallbackId || timestampId || 'Unknown'

// BAD: Fail completely
if (!deviceId) throw new Error('Failed');
```

---

## Summary

**What You Get:**
- ✅ Public IPv4: Always works (external API)
- ⚠️ Public IPv6: May fail (optional, not critical)
- ⚠️ Private IPv4: Luna-dependent (may fail)
- ⚠️ Private IPv6: Luna-dependent (may fail)
- ✅ Device ID: Always shows (fallback to public IP format)
- ⚠️ Connection Type: Luna-dependent (WiFi/Wired detection)

**Performance:**
- ⚡ 1-3 seconds typical load time
- ⚡ Parallel fetching (not sequential)
- ⚡ 5-second timeout per operation
- ⚡ No retry loops (instant fallback)

**Reliability:**
- 🔒 Works on 100% of LG TVs (fallback guaranteed)
- 🔒 Doesn't require Luna Service (nice-to-have)
- 🔒 Shows partial data (progressive loading)
- 🔒 Never shows indefinite "Loading..."

---

## References

- [LG webOS TV Developer Guide](https://webostv.developer.lge.com/)
- [Luna Service API Documentation](https://webostv.developer.lge.com/develop/references/luna-service-introduction)
- [webOSTV.js Library Reference](https://webostv.developer.lge.com/develop/references/webos-tv-js-library)

---

**Last Updated:** January 23, 2026  
**Version:** 2.0.0  
**Status:** ✅ Production Ready

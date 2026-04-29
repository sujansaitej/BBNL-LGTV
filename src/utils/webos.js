/**
 * webOS TV Detection and Configuration Utilities
 */

/**
 * Check if the app is running on LG webOS TV
 * Checks multiple indicators for webOS detection
 */
export const isWebOSTV = () => {
  // Primary check: window.webOS object (loaded from webOSTV.js)
  if (window.webOS) {
    console.log('✓ webOS TV detected via window.webOS');
    return true;
  }

  // Fallback checks for detection (including PalmServiceBridge on device)
  const checks = [
    !!window.PalmSystem,
    !!window.PalmServiceBridge,
    navigator.userAgent.includes("Web0S"),
    navigator.userAgent.includes("webOS"),
    navigator.userAgent.includes("LG Browser"),
    window.location.hostname === 'localhost' && /webos|tv|lg/i.test(navigator.userAgent)
  ];

  if (checks.some(check => check)) {
    console.log('✓ webOS TV detected via fallback checks');
    return true;
  }

  console.warn('⚠ webOS TV not detected. Make sure you are running on an LG TV and webOSTV.js is loaded.');
  return false;
};

/**
 * Ensure webOS.service.request exists; if not, shim using PalmServiceBridge (developer mode)
 * Returns true if service.request is available after this call
 */
export const ensureWebOSService = () => {
  if (window.webOS?.service?.request && typeof window.webOS.service.request === 'function') {
    return true;
  }

  // Developer-mode fallback: create minimal webOS.service.request using PalmServiceBridge
  if (typeof window.PalmServiceBridge === 'function') {
    window.webOS = window.webOS || {};
    window.webOS.service = window.webOS.service || {};

    window.webOS.service.request = (uri, options = {}) => {
      const bridge = new window.PalmServiceBridge();
      const { method = 'get', parameters = {}, onSuccess, onFailure } = options;

      const payload = typeof parameters === 'string' ? parameters : JSON.stringify(parameters);

      bridge.onservicecallback = (msg) => {
        try {
          const res = typeof msg === 'string' ? JSON.parse(msg) : msg;
          if (res?.returnValue === false || res?.errorCode) {
            onFailure?.(res);
          } else {
            onSuccess?.(res);
          }
        } catch (e) {
          onFailure?.({ errorText: e.message });
        }
      };

      try {
        bridge.call(`${uri}/${method}`, payload);
      } catch (e) {
        console.warn('⚠ PalmServiceBridge call failed:', e.message);
        onFailure?.({ errorText: e.message });
      }

      return bridge;
    };

    console.log('✓ webOS.service.request shimmed via PalmServiceBridge');
    return true;
  }

  return false;
};

/**
 * Install window.__BBNL_UPLOAD_LOGS__ — a console-friendly diagnostic upload hook.
 *
 * Reads userid/mobile from localStorage; reads MAC + IP lazily from
 * window.__BBNL_DEVICE_INFO__ if the React device-info hook has populated it,
 * else falls back to localStorage's pinned device id (used as MAC) and empty IP.
 *
 * Lazy-imports the helpers so this util file stays free of axios/JSX deps at
 * module-eval time (initializeWebOSEnvironment is called once at boot from App.js).
 */
const installLogUploadHook = () => {
  if (typeof window === "undefined") return;
  if (typeof window.__BBNL_UPLOAD_LOGS__ === "function") return;

  window.__BBNL_UPLOAD_LOGS__ = async () => {
    try {
      const [{ collectDiagnosticBundleAsZip }, { uploadOttLogs }] = await Promise.all([
        import("./diagnosticBundle.js"),
        import("../server/modules-api/OttLogsApi.jsx"),
      ]);

      let userid = "";
      let mobile = "";
      try { userid = localStorage.getItem("userid") || ""; } catch { /* ignore */ }
      try { mobile = localStorage.getItem("mobile") || localStorage.getItem("mobileno") || ""; } catch { /* ignore */ }

      const devInfo = window.__BBNL_DEVICE_INFO__ || {};
      let mac_address =
        devInfo.macAddress ||
        devInfo.mac ||
        devInfo.wifiMac ||
        devInfo.wiredMac ||
        "";
      if (!mac_address) {
        try {
          mac_address = localStorage.getItem("lgtv_device_id_pinned") || "";
        } catch { /* ignore */ }
      }
      const ip_address = devInfo.publicIp || devInfo.privateIp || devInfo.ip || "";

      const logBlob = await collectDiagnosticBundleAsZip();
      const result = await uploadOttLogs({
        userid,
        mobile,
        mac_address,
        ip_address,
        logBlob,
        filename: "ott_log.zip",
      });

      console.log("[__BBNL_UPLOAD_LOGS__] result:", result);
      return result;
    } catch (err) {
      const result = {
        success: false,
        message: err?.message || "Diagnostic upload failed",
        data: null,
      };
      console.warn("[__BBNL_UPLOAD_LOGS__] error:", err);
      return result;
    }
  };
};

/**
 * Initialize webOS TV environment
 * Sets up body classes and event listeners
 */
export const initializeWebOSEnvironment = () => {
  // Install the diagnostic-log upload hook regardless of TV detection so it's
  // also reachable from the dev-mode browser console.
  installLogUploadHook();

  // Install the manual device-auth DevTools hook (window.__BBNL_DEVICE_AUTH__).
  // Lazy-imported so the crypto/axios code only loads if the file is actually
  // pulled in — and never throws synchronously even if the import fails.
  try {
    import("./deviceAuthGlobals.js").catch(() => { /* ignore — manual-trigger only */ });
  } catch { /* ignore */ }

  if (isWebOSTV()) {
    document.body.classList.add("webos-app");
    document.body.classList.add("tv-navigation-active");

    // Detect if using mouse vs remote
    let usingMouse = false;

    const handleMouseMove = () => {
      if (!usingMouse) {
        usingMouse = true;
        document.body.classList.add("using-mouse");
      }
    };

    const handleKeyDown = () => {
      if (usingMouse) {
        usingMouse = false;
        document.body.classList.remove("using-mouse");
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup function
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }
};

/**
 * Get webOS TV information
 */
export const getWebOSTVInfo = async () => {
  if (!isWebOSTV() || !window.webOS) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      window.webOS.deviceInfo((info) => {
        resolve({
          modelName: info.modelName || "Unknown",
          version: info.version || "Unknown",
          sdkVersion: info.sdkVersion || "Unknown",
        });
      });
    } catch (error) {
      console.warn("Failed to get webOS TV info:", error);
      resolve(null);
    }
  });
};

/**
 * Get TV system properties (model, firmware, sdkVersion, boardType)
 * Service: luna://com.webos.service.tv.systemproperty/getSystemInfo
 */
export const getWebOSSystemInfo = async (keys = ['modelName', 'firmwareVersion', 'sdkVersion', 'boardType']) => {
  if (!isWebOSTV()) return null;
  if (!ensureWebOSService()) return null;

  return new Promise((resolve) => {
    try {
      window.webOS.service.request('luna://com.webos.service.tv.systemproperty', {
        method: 'getSystemInfo',
        parameters: { keys },
        onSuccess: (resp) => {
          if (resp?.returnValue === false) return resolve(null);
          resolve({
            modelName: resp?.modelName || null,
            firmwareVersion: resp?.firmwareVersion || null,
            sdkVersion: resp?.sdkVersion || null,
            boardType: resp?.boardType || null,
            raw: resp,
          });
        },
        onFailure: () => resolve(null),
      });
    } catch (err) {
      console.warn('⚠ getSystemInfo failed:', err.message);
      resolve(null);
    }
  });
};

/**
 * Handle back button for webOS TV
 */
export const handleWebOSBackButton = (callback) => {
  if (!isWebOSTV()) return;

  const handleKeyDown = (event) => {
    if (event.key === "Backspace" || event.key === "Back" || event.keyCode === 461) {
      event.preventDefault();
      callback?.();
    }
  };

  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
};

/**
 * Optimize video playback for webOS TV
 */
export const getWebOSVideoConfig = () => {
  if (!isWebOSTV()) {
    return {};
  }

  return {
    mediaTransportType: "URI",
    option: {
      externalStreamingInfo: {
        contents: {
          audioCodec: "aac",
          videoCodec: "h264",
        },
      },
    },
  };
};

/**
 * Request fullscreen on webOS TV
 */
export const requestWebOSFullscreen = (element) => {
  if (!isWebOSTV()) {
    // Fallback to standard fullscreen API
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    }
    return;
  }

  // webOS specific fullscreen
  if (window.webOS && window.webOS.platformBack) {
    // Already in fullscreen on webOS apps
    return;
  }
};

/**
 * Exit fullscreen on webOS TV
 */
export const exitWebOSFullscreen = () => {
  if (!isWebOSTV()) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    }
    return;
  }

  // webOS handles fullscreen differently
  // App is always fullscreen, just navigate back
  window.history.back();
};

/**
 * Prevent default webOS behaviors
 */
export const preventWebOSDefaults = () => {
  if (!isWebOSTV()) return;

  // Prevent zoom on webOS
  document.addEventListener("wheel", (event) => {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  }, { passive: false });
};

/**
 * Log app activity for webOS TV (useful for debugging)
 */
export const logWebOSActivity = (activity) => {
  if (!isWebOSTV() || !window.webOS) return;

  try {
    if (window.webOS.service && window.webOS.service.request) {
      window.webOS.service.request("luna://com.webos.service.applicationmanager", {
        method: "logActivity",
        parameters: { activity },
        onSuccess: () => console.log("Activity logged:", activity),
        onFailure: (err) => console.warn("Failed to log activity:", err),
      });
    }
  } catch (error) {
    console.warn("Failed to log webOS activity:", error);
  }
};

/**
 * Get LG webOS Device Unique ID (Hardware IDs)
 * Official API: luna://com.webos.service.sm/deviceid/getIDs
 * Tries multiple idTypes and returns the most stable one
 * Priority: NDUID → LGUDID → SERIALNUMBER → DID → WIFI_MAC → BLUETOOTH_MAC
 * 
 * @returns {Promise<string|null>} Best hardware ID or null if not available
 */
export const getWebOSDeviceID = () => {
  return new Promise((resolve) => {
    if (!isWebOSTV()) {
      console.warn('⚠ Not on webOS TV');
      return resolve(null);
    }

    if (!ensureWebOSService()) {
      console.warn('⚠ Luna service.request not available - device ID will use fallback');
      return resolve(null);
    }

    const idPriority = ['NDUID', 'LGUDID', 'SERIALNUMBER', 'DID', 'WIFI_MAC', 'BLUETOOTH_MAC'];

    try {
      window.webOS.service.request('luna://com.webos.service.sm', {
        method: 'deviceid/getIDs',
        parameters: { idType: idPriority },
        onSuccess: (response) => {
          if (!response?.returnValue || !Array.isArray(response?.idList)) {
            console.warn('⚠ deviceid/getIDs returned empty');
            return resolve(null);
          }

          const byType = Object.fromEntries(
            response.idList
              .filter(item => item?.idType && item?.idValue)
              .map(item => [item.idType.toUpperCase(), item.idValue])
          );

          for (const key of idPriority) {
            if (byType[key]) {
              console.log(`✓ Device ID (${key}):`, byType[key]);
              return resolve(byType[key]);
            }
          }

          console.warn('⚠ No usable ID found in deviceid/getIDs');
          return resolve(null);
        },
        onFailure: (error) => {
          console.warn('⚠ Device ID Luna call failed:', error?.errorCode || error?.errorText || 'unknown error');
          return resolve(null);
        }
      });
    } catch (error) {
      console.warn('⚠ Device ID exception:', error.message);
      return resolve(null);
    }
  });
};

/**
 * Make a Luna service.request and resolve with the response (or null on failure).
 * Uniform wrapper used by the network/MAC probes below.
 */
const lunaRequest = (uri, method, parameters = {}) => new Promise((resolve) => {
  try {
    window.webOS.service.request(uri, {
      method,
      parameters,
      onSuccess: (response) => resolve(response || null),
      onFailure: () => resolve(null),
    });
  } catch {
    resolve(null);
  }
});

/**
 * Match a valid IPv6 address (compressed or full form). Excludes the unspecified
 * `::` and pure-`0` strings. Captures global, ULA (fc00::/7), and link-local (fe80::).
 */
const IPV6_REGEX = /\b((?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{0,4}|::1|::ffff:\d+\.\d+\.\d+\.\d+)\b/i;

const isValidIpv6 = (v) => {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s || s === '::' || s === '0:0:0:0:0:0:0:0') return false;
  return IPV6_REGEX.test(s);
};

/**
 * Deep-walk an arbitrary object/array and return the first valid IPv6 string found.
 * Handles webOS firmwares that bury IPv6 in unexpected nested fields
 * (e.g. inside addressInfo[], routeInfo[], etc.) that we wouldn't know to check directly.
 *
 * Preference order: global > ULA (fc/fd) > link-local (fe80) > any.
 */
const findIpv6InTree = (root) => {
  if (!root) return null;
  const found = [];
  const walk = (node, depth = 0) => {
    if (depth > 6 || !node) return;          // bound recursion
    if (typeof node === 'string') {
      const m = node.match(IPV6_REGEX);
      if (m && isValidIpv6(m[1])) found.push(m[1]);
      return;
    }
    if (Array.isArray(node)) { node.forEach((n) => walk(n, depth + 1)); return; }
    if (typeof node === 'object') {
      for (const k in node) walk(node[k], depth + 1);
    }
  };
  walk(root);
  if (!found.length) return null;
  // Prefer global > ULA > link-local
  const score = (ip) => {
    const lower = ip.toLowerCase();
    if (lower.startsWith('fe80')) return 1;
    if (/^f[cd]/.test(lower)) return 2;
    return 3;
  };
  found.sort((a, b) => score(b) - score(a));
  return found[0];
};

/**
 * Extract local IPv4/IPv6 host addresses via a WebRTC RTCPeerConnection ICE-candidate probe.
 *
 * This is the "WebRTC IP leak" technique — every Chromium-based runtime (which webOS uses)
 * generates ICE candidates that contain the device's actual interface IPs, even when the
 * OS Luna APIs don't expose them. STUN is included to bypass mDNS isolation if it's active.
 *
 * Returns { ipv4, ipv6 } — either may be null. Resolves within 2.5s max.
 */
const getNetworkIPsViaWebRTC = () => new Promise((resolve) => {
  const result = { ipv4: null, ipv6: null };
  const RTC = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  if (!RTC) return resolve(result);

  let pc;
  try {
    // STUN server forces generation of server-reflexive candidates that bypass mDNS
    // anonymization on browsers that enable it. Falls back to host-only if STUN unreachable.
    pc = new RTC({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  } catch {
    return resolve(result);
  }

  const seenV6 = [];

  const finish = () => {
    try { pc.close(); } catch { /* ignore */ }
    if (!result.ipv6 && seenV6.length) {
      const score = (ip) => {
        const lower = ip.toLowerCase();
        if (lower.startsWith('fe80')) return 1;
        if (/^f[cd]/.test(lower)) return 2;
        return 3;
      };
      seenV6.sort((a, b) => score(b) - score(a));
      result.ipv6 = seenV6[0];
    }
    resolve(result);
  };

  const timer = setTimeout(finish, 2500);

  pc.onicecandidate = (event) => {
    if (!event.candidate) {
      clearTimeout(timer);
      finish();
      return;
    }
    const line = event.candidate.candidate || '';
    // candidate: "candidate:foundation comp proto pri ip port typ ..."
    const parts = line.split(' ');
    const ip = parts[4];
    if (!ip || ip.endsWith('.local')) return; // skip mDNS anonymized
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
      if (!result.ipv4) result.ipv4 = ip;
    } else if (isValidIpv6(ip)) {
      seenV6.push(ip);
    }
  };

  // Need a data channel to trigger ICE gathering
  try { pc.createDataChannel('probe'); } catch { /* ignore */ }
  pc.createOffer()
    .then((offer) => pc.setLocalDescription(offer))
    .catch(() => { clearTimeout(timer); finish(); });
});

/**
 * Get LG webOS Network Information.
 *
 * Primary source (documented):
 *   luna://com.webos.service.connectionmanager/getStatus
 *   https://webostv.developer.lge.com/develop/references/connection-manager
 *
 * The documented schema returns: state, interfaceName, ipAddress, netmask, gateway,
 * dns1/2/3, method, ssid (wifi), onInternet — NO ipv6 field. Some firmwares include
 * an undocumented ipv6Address/ipv6Info, so we probe for it; if missing we degrade.
 *
 * Fallbacks for IPv6 only (firmware-specific, not in public docs):
 *   1. com.webos.service.connectionmanager/getInfo
 *   2. com.palm.connectionmanager/getStatus (legacy alias on older firmware)
 *
 * @returns {Promise<Object>} { ipv4, ipv6, connectionType, interfaceName }
 */
export const getWebOSNetworkInfo = async () => {
  if (!isWebOSTV() || !ensureWebOSService()) {
    return { ipv4: null, ipv6: null, connectionType: 'Unknown', interfaceName: null };
  }

  // Run all sources in parallel — each has its own timeout/failure handling.
  const [modern, legacy, info, lowerInfo, sysProp, webrtc] = await Promise.all([
    lunaRequest('luna://com.webos.service.connectionmanager', 'getStatus'),
    lunaRequest('luna://com.palm.connectionmanager', 'getStatus'),
    lunaRequest('luna://com.webos.service.connectionmanager', 'getInfo'),
    lunaRequest('luna://com.webos.service.connectionmanager', 'getinfo'),  // some firmwares need lowercase
    lunaRequest('luna://com.webos.service.tv.systemproperty', 'getSystemInfo', {
      keys: ['ipv6Address', 'wifiIpv6Address', 'wiredIpv6Address'],
    }),
    getNetworkIPsViaWebRTC(),
  ]);

  const status = modern || legacy;
  let ipv4 = null, ipv6 = null, connectionType = 'Unknown', interfaceName = null;

  const wired = status?.wired;
  const wifi  = status?.wifi;
  if (wired?.state === 'connected') {
    connectionType = 'Wired';
    ipv4 = wired.ipAddress || null;
    interfaceName = wired.interfaceName || null;
  } else if (wifi?.state === 'connected') {
    connectionType = 'WiFi';
    ipv4 = wifi.ipAddress || null;
    interfaceName = wifi.interfaceName || null;
  }

  // IPv6 priority: deep-walk every Luna response → systemproperty → WebRTC ICE.
  // Each call to findIpv6InTree returns the highest-quality IPv6 it finds (global > ULA > link-local).
  ipv6 = findIpv6InTree(modern)
      || findIpv6InTree(legacy)
      || findIpv6InTree(info)
      || findIpv6InTree(lowerInfo)
      || findIpv6InTree(sysProp)
      || webrtc?.ipv6
      || null;

  // If WebRTC found a v4 host candidate but Luna didn't (rare), accept it as a fallback.
  if (!ipv4 && webrtc?.ipv4) ipv4 = webrtc.ipv4;

  console.log(`[webos] network: ${connectionType} ipv4=${ipv4 || 'n/a'} ipv6=${ipv6 || 'n/a'} iface=${interfaceName || 'n/a'}`);
  return { ipv4, ipv6, connectionType, interfaceName };
};

/**
 * Format MAC Address for consistent display
 * Ensures MAC address is in uppercase with colons (XX:XX:XX:XX:XX:XX)
 * 
 * @param {string} mac - MAC address to format
 * @returns {string} Formatted MAC address
 */
export const formatMacAddress = (mac) => {
  if (!mac) return null;
  
  // Remove any existing separators and convert to uppercase
  const cleanMac = mac.replace(/[:\s-]/g, '').toUpperCase();
  
  // Check if valid MAC (12 hex characters)
  if (!/^[A-F0-9]{12}$/.test(cleanMac)) {
    console.warn('Invalid MAC address format:', mac);
    return mac; // Return original if invalid
  }
  
  // Format as XX:XX:XX:XX:XX:XX
  return cleanMac.match(/.{1,2}/g).join(':');
};

/**
 * Pick the first plausible MAC string out of candidate fields on any object.
 * Returns the formatted MAC (XX:XX:XX:XX:XX:XX) or null.
 */
const pickMac = (obj) => {
  if (!obj) return null;
  const candidates = [
    obj.macAddress, obj.macaddress, obj.mac,
    obj.hardwareAddress, obj.hwAddress, obj.MAC,
  ];
  for (const v of candidates) {
    const formatted = formatMacAddress(v);
    if (formatted && /^[0-9A-F:]{17}$/.test(formatted)) return formatted;
  }
  return null;
};

/**
 * Get LG webOS MAC Addresses (Wired + WiFi).
 *
 * IMPORTANT: The official LG documentation for connection-manager/getStatus
 * (https://webostv.developer.lge.com/develop/references/connection-manager) does
 * NOT include MAC address in the public schema. The fields below are
 * firmware-specific and undocumented; we probe a disciplined chain and
 * gracefully degrade to null when the platform genuinely doesn't expose them.
 *
 * Probe order (stops as soon as both MACs are found, or all sources exhausted):
 *   1. com.webos.service.connectionmanager / getInfo  — commercial / signage TVs
 *   2. com.webos.service.connectionmanager / getStatus — modern; may have macAddress on some firmwares
 *   3. com.palm.connectionmanager        / getStatus  — legacy alias
 *   4. com.webos.service.wifi            / getStatus  — wifi MAC only on some firmwares
 *   5. getMacAddress by interface name (wlan0/eth0)   — last-resort
 *
 * @returns {Promise<Object>} { wiredMac, wifiMac }
 */
export const getWebOSMacAddresses = async () => {
  if (!isWebOSTV() || !ensureWebOSService()) {
    return { wiredMac: null, wifiMac: null };
  }

  // Merge two partial results, preferring already-found values.
  const merge = (a, b) => ({
    wiredMac: a.wiredMac || b.wiredMac || null,
    wifiMac:  a.wifiMac  || b.wifiMac  || null,
  });

  const isComplete = (r) => !!(r.wiredMac && r.wifiMac);

  // Extract wired+wifi MAC from a generic response. Tries top-level keys first
  // (wiredInfo/wifiInfo) then nested (.wired/.wifi) then ethernet alias.
  const extract = (resp) => ({
    wiredMac: pickMac(resp?.wiredInfo) || pickMac(resp?.wired) || pickMac(resp?.ethernet),
    wifiMac:  pickMac(resp?.wifiInfo)  || pickMac(resp?.wifi),
  });

  let result = { wiredMac: null, wifiMac: null };

  // 0. Long shot: lowercase `getinfo` method as referenced in the LG dev forum
  //    https://forum.webostv.developer.lge.com/t/help-retrieving-mac-address-and-lgudid-on-webos-in-development-mode/24692
  //    Also try applicationManager and config services — these sometimes have it
  //    on commercial / signage firmware variants.
  const earlyProbes = await Promise.all([
    lunaRequest('luna://com.webos.service.connectionmanager', 'getinfo'),
    lunaRequest('luna://com.webos.applicationManager', 'getInfo'),
    lunaRequest('luna://com.webos.service.config', 'getConfigs', { configNames: ['tv.config.macAddress', 'tv.config.wifiMacAddress', 'tv.config.wiredMacAddress'] }),
  ]);
  for (const probe of earlyProbes) {
    if (!probe) continue;
    const e = extract(probe);
    if (e.wiredMac && !result.wiredMac) result.wiredMac = e.wiredMac;
    if (e.wifiMac  && !result.wifiMac)  result.wifiMac  = e.wifiMac;
    // Also try the configs response shape
    const cfg = probe?.configs;
    if (cfg && typeof cfg === 'object') {
      const wired = formatMacAddress(cfg['tv.config.wiredMacAddress'] || cfg['tv.config.macAddress']);
      const wifi  = formatMacAddress(cfg['tv.config.wifiMacAddress']);
      if (wired && !result.wiredMac) result.wiredMac = wired;
      if (wifi  && !result.wifiMac)  result.wifiMac  = wifi;
    }
  }
  if (isComplete(result)) return result;

  // 1. systemproperty/getSystemInfo — works on many consumer LG webOS firmwares.
  //    Keys differ across firmware revisions; query the union.
  const sysProp = await lunaRequest('luna://com.webos.service.tv.systemproperty', 'getSystemInfo', {
    keys: ['macAddress', 'macAddressWifi', 'macAddressWired', 'wifiMac', 'wiredMac', 'ethernetMacAddress', 'wifiMacAddress'],
  });
  if (sysProp) {
    const wiredFromSys = formatMacAddress(sysProp.macAddressWired || sysProp.wiredMac || sysProp.ethernetMacAddress);
    const wifiFromSys  = formatMacAddress(sysProp.macAddressWifi  || sysProp.wifiMac  || sysProp.wifiMacAddress);
    // Some firmwares only return a single `macAddress`; treat it as wifi by convention if no wired connection
    const fallbackMac  = formatMacAddress(sysProp.macAddress);
    if (wiredFromSys) result.wiredMac = wiredFromSys;
    if (wifiFromSys)  result.wifiMac  = wifiFromSys;
    if (fallbackMac && !result.wifiMac && !result.wiredMac) result.wifiMac = fallbackMac;
    if (isComplete(result)) {
      console.log(`[webos] mac (sysprop): wired=${result.wiredMac} wifi=${result.wifiMac}`);
      return result;
    }
  }

  // 2. webOSDev.deviceId() — wrapper from public/webOSTV.js that on older firmwares
  //    surfaces a MAC-like ID even when raw Luna calls don't.
  if ((!result.wifiMac || !result.wiredMac) && window.webOSDev?.deviceId) {
    try {
      const devId = await new Promise((resolve) => {
        window.webOSDev.deviceId({
          onSuccess: (r) => resolve(r),
          onFailure: () => resolve(null),
        });
      });
      const m = formatMacAddress(devId?.id || devId?.deviceId || devId?.macAddress);
      if (m && !result.wifiMac) result.wifiMac = m;
    } catch { /* swallow */ }
  }

  // 3. getInfo on modern service
  const info = await lunaRequest('luna://com.webos.service.connectionmanager', 'getInfo');
  result = merge(result, extract(info));
  if (isComplete(result)) return result;

  // 4. getStatus on modern service
  const status = await lunaRequest('luna://com.webos.service.connectionmanager', 'getStatus');
  result = merge(result, extract(status));
  if (isComplete(result)) return result;

  // 5. legacy palm alias
  if (!result.wiredMac || !result.wifiMac) {
    const palm = await lunaRequest('luna://com.palm.connectionmanager', 'getStatus');
    result = merge(result, extract(palm));
    if (isComplete(result)) return result;
  }

  // 6. wifi service for wifi MAC specifically
  if (!result.wifiMac) {
    const wifi = await lunaRequest('luna://com.webos.service.wifi', 'getStatus');
    result = merge(result, extract(wifi));
  }

  // 7. Last resort: explicit getMacAddress by interface name
  if (!result.wifiMac || !result.wiredMac) {
    const wifiIface = status?.wifi?.interfaceName || 'wlan0';
    const wiredIface = status?.wired?.interfaceName || 'eth0';

    if (!result.wifiMac) {
      const r = await lunaRequest('luna://com.webos.service.connectionmanager', 'getMacAddress', { interfaceName: wifiIface });
      const mac = formatMacAddress(r?.macAddress || r?.mac);
      if (mac) result.wifiMac = mac;
    }
    if (!result.wiredMac) {
      const r = await lunaRequest('luna://com.webos.service.connectionmanager', 'getMacAddress', { interfaceName: wiredIface });
      const mac = formatMacAddress(r?.macAddress || r?.mac);
      if (mac) result.wiredMac = mac;
    }
  }

  console.log(`[webos] mac: wired=${result.wiredMac || 'n/a'} wifi=${result.wifiMac || 'n/a'}`);
  return result;
};


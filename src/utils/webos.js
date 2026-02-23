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
 * Initialize webOS TV environment
 * Sets up body classes and event listeners
 */
export const initializeWebOSEnvironment = () => {
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

  // Prevent default back button behavior
  document.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" || event.keyCode === 461) {
      const activeElement = document.activeElement;
      const isInput =
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.getAttribute("contenteditable") === "true";

      if (!isInput) {
        event.preventDefault();
      }
    }
  });

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
 * Get LG webOS Network Information (Private IP Address)
 * Official API: luna://com.palm.connectionmanager/getStatus
 * FAST VERSION - No retry logic, instant results
 * 
 * @returns {Promise<Object>} Network info object with ipv4, ipv6, and connectionType
 */
export const getWebOSNetworkInfo = () => {
  return new Promise((resolve) => {
    if (!isWebOSTV()) {
      console.warn('⚠ Not on webOS TV');
      return resolve({ ipv4: null, ipv6: null, connectionType: 'Unknown' });
    }

    // Check if Luna service is properly available
    if (!ensureWebOSService()) {
      console.warn('⚠ Luna service.request not available for network info');
      return resolve({ ipv4: null, ipv6: null, connectionType: 'Unknown' });
    }

    try {
      window.webOS.service.request('luna://com.palm.connectionmanager', {
        method: 'getStatus',
        parameters: {},
        onSuccess: (response) => {
          let ipv4 = null, ipv6 = null, connectionType = 'Unknown';

          // Check wired first
          if (response?.wired?.state === 'connected') {
            connectionType = 'Wired';
            ipv4 = response.wired.ipAddress || null;
            ipv6 = response.wired.ipv6Address || null;
          }
          // Then check WiFi
          else if (response?.wifi?.state === 'connected') {
            connectionType = 'WiFi';
            ipv4 = response.wifi.ipAddress || null;
            ipv6 = response.wifi.ipv6Address || null;
          }

          console.log('✓ Network:', connectionType, ipv4);
          resolve({ ipv4, ipv6, connectionType });
        },
        onFailure: (error) => {
          console.warn('⚠ Network Luna call failed:', error?.errorCode || 'unknown error');
          resolve({ ipv4: null, ipv6: null, connectionType: 'Unknown' });
        }
      });
    } catch (error) {
      console.warn('⚠ Network exception:', error.message);
      resolve({ ipv4: null, ipv6: null, connectionType: 'Unknown' });
    }
  });
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
 * Get LG webOS MAC Addresses (Wired and WiFi)
 * Tries multiple Luna services and response field combinations
 * Returns both wired and WiFi MAC addresses
 * 
 * @returns {Promise<Object>} MAC addresses object with wiredMac and wifiMac
 */
export const getWebOSMacAddresses = () => {
  const extractMacs = (response) => {
    console.log('🔍 Extracting MACs from response:', JSON.stringify(response, null, 2));
    
    const wiredMac = formatMacAddress(
      response?.wiredInfo?.macAddress ||
      response?.wired?.macAddress ||
      response?.wired?.macaddress ||
      response?.wired?.mac ||
      response?.wired?.hardwareAddress ||
      response?.wiredInfo?.hardwareAddress ||
      response?.ethernet?.macAddress ||
      response?.ethernet?.mac ||
      response?.wired?.hwAddress ||
      response?.wired?.bssid
    );
    const wifiMac = formatMacAddress(
      response?.wifiInfo?.macAddress ||
      response?.wifi?.macAddress ||
      response?.wifi?.macaddress ||
      response?.wifi?.mac ||
      response?.wifi?.hardwareAddress ||
      response?.wifiInfo?.hardwareAddress ||
      response?.wifi?.hwAddress ||
      response?.wifi?.bssid
    );
    
    console.log('📋 Extracted - Wired:', wiredMac, 'WiFi:', wifiMac);
    return { wiredMac, wifiMac };
  };

  const requestMac = (serviceUri, method = 'getStatus', parameters = {}) => new Promise((resolve) => {
    try {
      console.log(`🔍 Trying ${serviceUri}/${method}...`);
      window.webOS.service.request(serviceUri, {
        method,
        parameters,
        onSuccess: (response) => {
          console.log(`✅ ${serviceUri}/${method} response:`, response);
          resolve(extractMacs(response));
        },
        onFailure: (error) => {
          console.warn(`⚠ ${serviceUri}/${method} failed:`, error?.errorCode || error?.errorText || 'unknown error');
          resolve({ wiredMac: null, wifiMac: null });
        }
      });
    } catch (error) {
      console.warn(`⚠ ${serviceUri}/${method} exception:`, error.message);
      resolve({ wiredMac: null, wifiMac: null });
    }
  });

  // Dedicated call to get MAC by interface name if available
  const requestMacByInterface = async (iface) => {
    if (!iface) return { wiredMac: null, wifiMac: null };
    const resp = await requestMac('luna://com.webos.service.connectionmanager', 'getMacAddress', { interfaceName: iface });
    return resp;
  };

  return new Promise(async (resolve) => {
    if (!isWebOSTV()) {
      console.warn('⚠ Not on webOS TV - MAC addresses not available');
      return resolve({ wiredMac: null, wifiMac: null });
    }

    if (!ensureWebOSService()) {
      console.warn('⚠ Luna service.request not available for MAC addresses');
      return resolve({ wiredMac: null, wifiMac: null });
    }

    console.log('🔍 Starting MAC address detection...');

    // First pass: getStatus to capture interface names
    const status = await requestMac('luna://com.webos.service.connectionmanager', 'getStatus');
    if (status.wiredMac || status.wifiMac) {
      return resolve(status);
    }

    // Try legacy palm connectionmanager
    const palmStatus = await requestMac('luna://com.palm.connectionmanager', 'getStatus');
    if (palmStatus.wiredMac || palmStatus.wifiMac) {
      return resolve(palmStatus);
    }

    // Try wifi service getStatus
    const wifiStatus = await requestMac('luna://com.webos.service.wifi', 'getStatus');
    if (wifiStatus.wiredMac || wifiStatus.wifiMac) {
      return resolve(wifiStatus);
    }

    // Try explicit getMacAddress calls if we have interface names
    try {
      const ifaceStatus = await requestMac('luna://com.webos.service.connectionmanager', 'getStatus');
      const wifiIface = ifaceStatus?.wifi?.interfaceName || 'wlan0';
      const wiredIface = ifaceStatus?.wired?.interfaceName || 'eth0';

      const wifiMacResp = await requestMacByInterface(wifiIface);
      if (wifiMacResp.wifiMac || wifiMacResp.wiredMac) return resolve(wifiMacResp);

      const wiredMacResp = await requestMacByInterface(wiredIface);
      if (wiredMacResp.wiredMac || wiredMacResp.wifiMac) return resolve(wiredMacResp);
    } catch (e) {
      console.warn('⚠ getMacAddress by interface failed:', e.message);
    }

    console.warn('❌ MAC addresses NOT FOUND in any Luna service');
    resolve({ wiredMac: null, wifiMac: null });
  });
};


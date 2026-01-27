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

  // Fallback checks for detection
  const checks = [
    !!window.PalmSystem,
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
 * Get LG webOS Device Unique ID (LGUDID)
 * Official API: luna://com.webos.service.sm/deviceid/getIDs
 * FAST VERSION - No retries, instant timeout
 * 
 * @returns {Promise<string|null>} Device ID (LGUDID) or null if failed
 */
export const getWebOSDeviceID = () => {
  return new Promise((resolve) => {
    // Check if running on webOS TV
    if (!isWebOSTV()) {
      console.warn('⚠ Not on webOS TV');
      return resolve(null);
    }

    // Check if Luna service is properly available
    if (!window.webOS?.service?.request || typeof window.webOS.service.request !== 'function') {
      console.warn('⚠ Luna service.request not available - device ID will use fallback');
      return resolve(null);
    }

    try {
      // Call Luna API immediately - NO RETRY LOGIC
      window.webOS.service.request('luna://com.webos.service.sm', {
        method: 'deviceid/getIDs',
        parameters: { idType: ['LGUDID'] },
        onSuccess: (response) => {
          if (response?.returnValue && response?.idList?.[0]?.idValue) {
            console.log('✓ Device ID:', response.idList[0].idValue);
            return resolve(response.idList[0].idValue);
          }
          return resolve(null);
        },
        onFailure: (error) => {
          console.warn('⚠ Device ID Luna call failed:', error?.errorCode || 'unknown error');
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
    if (!window.webOS?.service?.request || typeof window.webOS.service.request !== 'function') {
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

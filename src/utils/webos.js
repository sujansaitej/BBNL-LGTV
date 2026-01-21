/**
 * webOS TV Detection and Configuration Utilities
 */

/**
 * Check if the app is running on LG webOS TV
 */
export const isWebOSTV = () => {
  return !!(
    window.webOS ||
    window.PalmSystem ||
    navigator.userAgent.includes("Web0S") ||
    navigator.userAgent.includes("webOS")
  );
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
 * 
 * IMPORTANT: Before using this API, you must get user agreement for using their personal information.
 * This API only works on webOS 3.0+ and NOT in the emulator.
 * 
 * @returns {Promise<string|null>} Device ID (LGUDID) or null if failed
 */
export const getWebOSDeviceID = () => {
  if (!isWebOSTV() || !window.webOS) {
    console.warn("getWebOSDeviceID: Not running on webOS TV");
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    try {
      if (!window.webOS.service || !window.webOS.service.request) {
        console.warn("webOS.service.request not available");
        return resolve(null);
      }

      window.webOS.service.request('luna://com.webos.service.sm', {
        method: 'deviceid/getIDs',
        parameters: {
          idType: ['LGUDID'],
        },
        onSuccess: function (inResponse) {
          console.log('Device ID API Response:', inResponse);
          
          if (inResponse.returnValue && inResponse.idList && inResponse.idList.length > 0) {
            const deviceId = inResponse.idList[0].idValue;
            console.log('Device ID (LGUDID) retrieved:', deviceId);
            resolve(deviceId);
          } else {
            console.warn('Device ID not found in response');
            resolve(null);
          }
        },
        onFailure: function (inError) {
          console.error('Failed to get Device ID:', inError);
          console.error('[' + inError.errorCode + ']: ' + inError.errorText);
          
          // Handle specific error codes
          switch (inError.errorCode) {
            case 'ERR.001':
              console.error('Invalid Parameters provided to deviceid/getIDs');
              break;
            case 'ERR.002':
              console.error('Security Manager Internal Error');
              break;
            case 'ERR.801':
              console.error('Unsupported Device ID Type');
              break;
            default:
              console.error('Unknown error occurred');
          }
          
          reject(inError);
        },
      });
    } catch (error) {
      console.error('Exception while fetching Device ID:', error);
      reject(error);
    }
  });
};

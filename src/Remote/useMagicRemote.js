import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Magic Remote Hook - Official LG webOS MRCU Service Integration
 * 
 * Provides fast, smooth remote navigation using Luna API:
 * - Coordinate tracking (pointer position)
 * - Motion sensor data (gyroscope, accelerometer)
 * - Quaternion data for 3D orientation
 * 
 * Supports webOS TV 24+ with sensor2 API and fallback to legacy sensor API
 */

export const useMagicRemote = (options = {}) => {
  const {
    enabled = true,
    sensorType = 'coordinate', // 'coordinate' | 'gyroscope' | 'acceleration' | 'all'
    interval = 100, // Callback interval in ms (10-1000ms range)
    onCoordinateChange = null,
    onSensorData = null,
  } = options;

  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const [sensorData, setSensorData] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [apiVersion, setApiVersion] = useState(null);
  const subscriptionRef = useRef(null);
  const isWebOSTV24Plus = useRef(false);

  // Check MRCU API Version
  useEffect(() => {
    if (!window.webOS) return;

    const checkAPIVersion = () => {
      try {
        window.webOS.service.request('luna://com.webos.service.mrcu', {
          method: 'getAPIVersion',
          parameters: {},
          onSuccess: (response) => {
            console.log('[MagicRemote] API Version:', response.version);
            setApiVersion(response.version);
            isWebOSTV24Plus.current = parseFloat(response.version) >= 1.0;
            setIsReady(true);
          },
          onFailure: (error) => {
            console.warn('[MagicRemote] API Version check failed, using legacy mode:', error);
            isWebOSTV24Plus.current = false;
            setIsReady(true);
          },
        });
      } catch (error) {
        console.error('[MagicRemote] Failed to check API version:', error);
        setIsReady(true);
      }
    };

    checkAPIVersion();
  }, []);

  // Set sensor interval (webOS TV 24+)
  const setSensorInterval = useCallback((newInterval) => {
    if (!window.webOS || !isWebOSTV24Plus.current) return;

    window.webOS.service.request('luna://com.webos.service.mrcu', {
      method: 'sensor2/setSensorInterval',
      parameters: { interval: Math.max(10, Math.min(1000, newInterval)) },
      onSuccess: () => {
        console.log('[MagicRemote] Interval updated to:', newInterval);
      },
      onFailure: (error) => {
        console.error('[MagicRemote] Failed to set interval:', error);
      },
    });
  }, []);

  // Reset quaternion sensor (recenter)
  const resetQuaternion = useCallback(() => {
    if (!window.webOS) return;

    const method = isWebOSTV24Plus.current ? 'sensor2/resetQuaternion' : 'sensor/resetQuaternion';
    
    window.webOS.service.request('luna://com.webos.service.mrcu', {
      method,
      parameters: {},
      onSuccess: () => {
        console.log('[MagicRemote] Quaternion reset');
      },
      onFailure: (error) => {
        console.error('[MagicRemote] Failed to reset quaternion:', error);
      },
    });
  }, []);

  // Subscribe to sensor data
  useEffect(() => {
    if (!window.webOS || !enabled || !isReady) return;

    const subscribeSensorData = () => {
      try {
        if (isWebOSTV24Plus.current) {
          // Modern API (webOS TV 24+)
          console.log('[MagicRemote] Using sensor2 API (webOS TV 24+)');
          subscriptionRef.current = window.webOS.service.request('luna://com.webos.service.mrcu', {
            method: 'sensor2/getSensorEventData',
            parameters: {
              sensorType,
              subscribe: true,
            },
            onSuccess: (response) => {
              if (response.subscribed) {
                console.log('[MagicRemote] Subscribed successfully');
                return;
              }

              // Coordinate data
              if (response.coordinate) {
                const { x, y } = response.coordinate;
                setCoordinates({ x, y });
                onCoordinateChange?.({ x, y });
              }

              // Full sensor data
              if (onSensorData) {
                setSensorData(response);
                onSensorData(response);
              }
            },
            onFailure: (error) => {
              console.error('[MagicRemote] Subscription failed:', error);
            },
          });
        } else {
          // Legacy API (webOS TV < 24)
          console.log('[MagicRemote] Using legacy sensor API');
          const callbackInterval = interval <= 10 ? 1 : interval <= 20 ? 2 : interval <= 50 ? 3 : 4;

          subscriptionRef.current = window.webOS.service.request('luna://com.webos.service.mrcu', {
            method: 'sensor/getSensorData',
            parameters: {
              callbackInterval,
              subscribe: true,
            },
            onSuccess: (response) => {
              if (response.subscribed) {
                console.log('[MagicRemote] Subscribed successfully (legacy)');
                return;
              }

              if (response.coordinate) {
                const { x, y } = response.coordinate;
                setCoordinates({ x, y });
                onCoordinateChange?.({ x, y });
              }

              if (onSensorData) {
                setSensorData(response);
                onSensorData(response);
              }
            },
            onFailure: (error) => {
              console.error('[MagicRemote] Legacy subscription failed:', error);
            },
          });
        }

        // Set interval after subscription (webOS TV 24+)
        if (isWebOSTV24Plus.current) {
          setTimeout(() => setSensorInterval(interval), 100);
        }
      } catch (error) {
        console.error('[MagicRemote] Failed to subscribe:', error);
      }
    };

    subscribeSensorData();

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.cancel();
          console.log('[MagicRemote] Unsubscribed');
        } catch (error) {
          console.error('[MagicRemote] Failed to unsubscribe:', error);
        }
      }

      // Cancel all subscriptions (webOS TV 24+)
      if (isWebOSTV24Plus.current && window.webOS) {
        window.webOS.service.request('luna://com.webos.service.mrcu', {
          method: 'sensor2/cancelSensorDataSubscribe',
          parameters: {},
          onSuccess: () => console.log('[MagicRemote] All subscriptions cancelled'),
          onFailure: (error) => console.error('[MagicRemote] Cancel failed:', error),
        });
      }
    };
  }, [enabled, isReady, sensorType, interval, onCoordinateChange, onSensorData, setSensorInterval]);

  return {
    coordinates,
    sensorData,
    isReady,
    apiVersion,
    resetQuaternion,
    setSensorInterval,
  };
};

/**
 * Enhanced Remote Navigation Hook with Magic Remote Support
 * 
 * Combines standard keyboard navigation with Magic Remote coordinate tracking
 * for ultra-smooth, fast navigation in IPTV apps
 * 
 * NEW: Number key channel jump support (0-9)
 */
export const useEnhancedRemoteNavigation = (items, options = {}) => {
  const {
    columns = 1,
    orientation = 'horizontal', // 'horizontal' | 'vertical' | 'grid'
    enabled = true,
    onSelect = null,
    useMagicRemotePointer = true,
    focusThreshold = 50, // Pixel distance to trigger focus
    enableNumberJump = true, // Enable number key channel jump
    numberJumpTimeout = 1000, // Timeout for number input (ms)
    numberJumpField = 'channelno', // Field to match (e.g., 'channelno', 'id')
  } = options;

  const itemCount = Array.isArray(items) ? items.length : items;
  const itemsArray = Array.isArray(items) ? items : null;

  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef([]);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [channelJumpBuffer, setChannelJumpBuffer] = useState('');
  const numberBufferRef = useRef('');
  const numberTimerRef = useRef(null);

  // Track coordinates from Magic Remote
  const { coordinates, isReady } = useMagicRemote({
    enabled: useMagicRemotePointer && enabled,
    sensorType: 'coordinate',
    interval: 16, // ~60 FPS for smooth pointer tracking
    onCoordinateChange: useCallback((coords) => {
      if (!useMagicRemotePointer || !enabled) return;

      // Prevent layout shift - use requestAnimationFrame for non-blocking updates
      requestAnimationFrame(() => {
        // Find closest element to pointer
        let closestIndex = -1;
        let minDistance = Infinity;

        itemRefs.current.forEach((ref, index) => {
          if (!ref) return;

          const rect = ref.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const distance = Math.sqrt(
            Math.pow(coords.x - centerX, 2) + Math.pow(coords.y - centerY, 2)
          );

          if (distance < minDistance && distance < focusThreshold) {
            minDistance = distance;
            closestIndex = index;
          }
        });

        // Only update if significantly closer to prevent jitter
        if (closestIndex !== -1 && closestIndex !== hoveredIndex && minDistance < focusThreshold * 0.8) {
          setHoveredIndex(closestIndex);
          setFocusedIndex(closestIndex);
        }
      });
    }, [enabled, useMagicRemotePointer, focusThreshold, hoveredIndex]),
  });

  // Number key channel jump functionality
  useEffect(() => {
    if (!enabled || !enableNumberJump) return;

    const getDigitFromEvent = (event) => {
      if (/^[0-9]$/.test(event.key)) return event.key;
      if (event.code && event.code.startsWith('Digit')) return event.code.replace('Digit', '');
      const code = event.keyCode;
      if (code >= 48 && code <= 57) return String(code - 48);
      if (code >= 96 && code <= 105) return String(code - 96);
      return '';
    };

    const commitChannelJump = () => {
      const value = numberBufferRef.current;
      if (!value) return;

      setChannelJumpBuffer('');
      numberBufferRef.current = '';
      if (numberTimerRef.current) {
        clearTimeout(numberTimerRef.current);
        numberTimerRef.current = null;
      }

      // Find matching item
      let targetIndex = -1;

      if (itemsArray) {
        // Search in array of objects
        targetIndex = itemsArray.findIndex((item) => {
          const fieldValue = item[numberJumpField];
          if (!fieldValue) return false;

          const rawValue = String(fieldValue).trim();
          const inputValue = String(value).trim();

          if (rawValue === inputValue) return true;

          const parsedRaw = parseInt(rawValue, 10);
          const parsedInput = parseInt(inputValue, 10);

          return !Number.isNaN(parsedRaw) && 
                 !Number.isNaN(parsedInput) && 
                 parsedRaw === parsedInput;
        });
      } else {
        // Direct index jump for simple arrays
        const index = parseInt(value, 10) - 1;
        if (index >= 0 && index < itemCount) {
          targetIndex = index;
        }
      }

      if (targetIndex !== -1) {
        setFocusedIndex(targetIndex);
        itemRefs.current[targetIndex]?.focus();
        onSelect?.(targetIndex);
      }
    };

    const handleNumberKey = (event) => {
      const digit = getDigitFromEvent(event);
      if (digit && enabled) {
        event.preventDefault();
        event.stopPropagation();

        numberBufferRef.current = `${numberBufferRef.current}${digit}`.slice(0, 4);
        setChannelJumpBuffer(numberBufferRef.current);

        if (numberTimerRef.current) {
          clearTimeout(numberTimerRef.current);
        }
        numberTimerRef.current = setTimeout(commitChannelJump, numberJumpTimeout);
      }
    };

    window.addEventListener('keydown', handleNumberKey, true);
    return () => {
      window.removeEventListener('keydown', handleNumberKey, true);
      if (numberTimerRef.current) {
        clearTimeout(numberTimerRef.current);
      }
    };
  }, [enabled, enableNumberJump, itemsArray, itemCount, numberJumpField, numberJumpTimeout, onSelect]);

  // Standard keyboard navigation
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      const key = event.key;

      let newIndex = focusedIndex;

      if (orientation === 'horizontal' || orientation === 'vertical') {
        if (key === 'ArrowRight' || key === 'Right') {
          event.preventDefault();
          newIndex = Math.min(focusedIndex + 1, itemCount - 1);
        } else if (key === 'ArrowLeft' || key === 'Left') {
          event.preventDefault();
          newIndex = Math.max(focusedIndex - 1, 0);
        } else if (orientation === 'vertical') {
          if (key === 'ArrowDown' || key === 'Down') {
            event.preventDefault();
            newIndex = Math.min(focusedIndex + 1, itemCount - 1);
          } else if (key === 'ArrowUp' || key === 'Up') {
            event.preventDefault();
            newIndex = Math.max(focusedIndex - 1, 0);
          }
        }
      } else if (orientation === 'grid') {
        if (key === 'ArrowRight' || key === 'Right') {
          event.preventDefault();
          newIndex = focusedIndex % columns === columns - 1
            ? focusedIndex
            : Math.min(focusedIndex + 1, itemCount - 1);
        } else if (key === 'ArrowLeft' || key === 'Left') {
          event.preventDefault();
          newIndex = focusedIndex % columns === 0
            ? focusedIndex
            : Math.max(focusedIndex - 1, 0);
        } else if (key === 'ArrowDown' || key === 'Down') {
          event.preventDefault();
          newIndex = Math.min(focusedIndex + columns, itemCount - 1);
        } else if (key === 'ArrowUp' || key === 'Up') {
          event.preventDefault();
          newIndex = Math.max(focusedIndex - columns, 0);
        }
      }

      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        onSelect?.(focusedIndex);
      }

      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex);
        itemRefs.current[newIndex]?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, focusedIndex, itemCount, columns, orientation, onSelect]);

  const getItemProps = useCallback((index) => ({
    ref: (el) => { itemRefs.current[index] = el; },
    tabIndex: index === focusedIndex ? 0 : -1,
    'data-focused': index === focusedIndex,
    'data-hovered': index === hoveredIndex,
    onFocus: () => setFocusedIndex(index),
    onClick: () => onSelect?.(index),
  }), [focusedIndex, hoveredIndex, onSelect]);

  return {
    focusedIndex,
    hoveredIndex,
    getItemProps,
    magicRemoteReady: isReady,
    coordinates,
    channelJumpBuffer, // Current number being typed
  };
};

export default useMagicRemote;

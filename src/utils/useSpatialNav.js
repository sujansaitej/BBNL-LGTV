/**
 * Custom hooks for integrating Norigin Spatial Navigation in React components
 */

import { useEffect, useRef, useCallback } from 'react';
import SpatialNavigation from '@noriginmedia/norigin-spatial-navigation';

/**
 * Hook to register and manage a focusable section
 * @param {string} sectionId - Unique identifier for the section
 * @param {object} options - Configuration options for the section
 */
export const useSpatialNavSection = (sectionId, options = {}) => {
  const sectionRef = useRef(null);

  useEffect(() => {
    // Register section with spatial navigation
    SpatialNavigation.add(sectionId, {
      selector: options.selector || '[data-focusable]',
      straightOverlapThreshold: options.straightOverlapThreshold ?? 0.5,
      wrap: options.wrap ?? true,
      rememberSource: options.rememberSource ?? false,
      enterTo: options.enterTo ?? '',
      ...options,
    });

    return () => {
      SpatialNavigation.remove(sectionId);
    };
  }, [sectionId, options]);

  return sectionRef;
};

/**
 * Hook to make individual elements focusable
 * @param {boolean} focusable - Whether the element should be focusable
 */
export const useFocusable = (focusable = true) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    if (focusable) {
      ref.current.setAttribute('data-focusable', 'true');
      ref.current.setAttribute('tabindex', '0');
    } else {
      ref.current.removeAttribute('data-focusable');
      ref.current.setAttribute('tabindex', '-1');
    }
  }, [focusable]);

  return ref;
};

/**
 * Hook to handle focus changes
 * @param {function} onFocus - Callback when element receives focus
 * @param {function} onBlur - Callback when element loses focus
 */
export const useSpatialFocus = (onFocus, onBlur) => {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = (e) => onFocus?.();
    const handleBlur = (e) => onBlur?.();

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, [onFocus, onBlur]);

  return ref;
};

/**
 * Hook to listen to spatial navigation events
 * @param {string} eventType - Type of event (e.g., 'willfocus', 'unfocus', 'enter-down')
 * @param {function} callback - Callback function
 */
export const useSpatialNavEvent = (eventType, callback) => {
  useEffect(() => {
    SpatialNavigation.on(eventType, callback);

    return () => {
      SpatialNavigation.off(eventType, callback);
    };
  }, [eventType, callback]);
};

/**
 * Hook to focus on a specific section
 * @param {string} sectionId - ID of the section to focus
 * @param {boolean} shouldFocus - Whether to focus (useful for conditional logic)
 */
export const useFocusSection = (sectionId, shouldFocus = true) => {
  useEffect(() => {
    if (shouldFocus && sectionId) {
      const timer = setTimeout(() => {
        SpatialNavigation.focus(sectionId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [sectionId, shouldFocus]);
};

/**
 * Hook for numeric channel input (IPTV feature)
 * @param {function} onChannelEnter - Callback with the channel number
 * @param {number} timeoutMs - Time in ms to wait before committing (default 1000ms)
 */
export const useNumericChannelInput = (onChannelEnter, timeoutMs = 1000) => {
  const bufferRef = useRef('');
  const timerRef = useRef(null);

  const commitChannel = useCallback(() => {
    if (bufferRef.current) {
      onChannelEnter?.(bufferRef.current);
      bufferRef.current = '';
    }
  }, [onChannelEnter]);

  useEffect(() => {
    const handleNumeric = (event) => {
      const digit = event?.detail?.key || '';
      if (/^[0-9]$/.test(digit)) {
        bufferRef.current = `${bufferRef.current}${digit}`.slice(0, 4);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(commitChannel, timeoutMs);
      }
    };

    window.addEventListener('spatialnavigation:numeric', handleNumeric);

    return () => {
      window.removeEventListener('spatialnavigation:numeric', handleNumeric);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [commitChannel, timeoutMs]);

  return { buffer: bufferRef.current };
};

/**
 * Hook to pause/resume spatial navigation
 * @param {boolean} isPaused - Whether spatial navigation should be paused
 */
export const useSpatialNavPause = (isPaused = false) => {
  useEffect(() => {
    if (isPaused) {
      SpatialNavigation.pause();
    } else {
      SpatialNavigation.resume();
    }

    return () => {
      SpatialNavigation.resume();
    };
  }, [isPaused]);
};

/**
 * Hook to set elements as focusable/unfocusable
 * @param {string} selector - CSS selector for elements
 * @param {boolean} focusable - Whether elements should be focusable
 */
export const useSetFocusable = (selector, focusable = true) => {
  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      SpatialNavigation.setNodeFocusable(focusable, el);
    });
  }, [selector, focusable]);
};

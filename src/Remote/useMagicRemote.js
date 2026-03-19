import { useEffect, useRef, useState, useCallback } from 'react';

export const TV_KEYS = {
  LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
  OK: 13,
  BACK: 461,
  RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406,
  PLAY: 415, PAUSE: 19, FF: 417, REWIND: 412, STOP: 413,
  BACKSPACE: 8,
};

/**
 * Magic Remote Hook
 * PERF: coordinates stored in ref (not state) — zero re-renders from 60fps sensor.
 */
export const useMagicRemote = (options = {}) => {
  const {
    enabled = true,
    sensorType = 'coordinate',
    interval = 100,
    onCoordinateChange = null,
    onSensorData = null,
    onOKKey = null,
    onBackKey = null,
    onArrowKey = null,
    onNumberKey = null,
    onDeleteKey = null,
  } = options;

  const coordinatesRef = useRef({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const [apiVersion, setApiVersion] = useState(null);
  const subscriptionRef = useRef(null);
  const isWebOSTV24Plus = useRef(false);

  const onOKKeyRef = useRef(onOKKey);
  const onBackKeyRef = useRef(onBackKey);
  const onArrowKeyRef = useRef(onArrowKey);
  const onNumberKeyRef = useRef(onNumberKey);
  const onDeleteKeyRef = useRef(onDeleteKey);
  const onCoordinateChangeRef = useRef(onCoordinateChange);
  const onSensorDataRef = useRef(onSensorData);
  useEffect(() => { onOKKeyRef.current = onOKKey; }, [onOKKey]);
  useEffect(() => { onBackKeyRef.current = onBackKey; }, [onBackKey]);
  useEffect(() => { onArrowKeyRef.current = onArrowKey; }, [onArrowKey]);
  useEffect(() => { onNumberKeyRef.current = onNumberKey; }, [onNumberKey]);
  useEffect(() => { onDeleteKeyRef.current = onDeleteKey; }, [onDeleteKey]);
  useEffect(() => { onCoordinateChangeRef.current = onCoordinateChange; }, [onCoordinateChange]);
  useEffect(() => { onSensorDataRef.current = onSensorData; }, [onSensorData]);

  useEffect(() => {
    if (!enabled) return;
    const hasAnyCallback = onOKKeyRef.current || onBackKeyRef.current ||
      onArrowKeyRef.current || onNumberKeyRef.current || onDeleteKeyRef.current;
    if (!hasAnyCallback) return;

    const handleKeyDown = (e) => {
      const kc = e.keyCode;
      if ((kc === TV_KEYS.BACK || e.key === 'GoBack' || e.key === 'Back') && onBackKeyRef.current) {
        e.preventDefault(); e.stopPropagation(); onBackKeyRef.current(e); return;
      }
      if (kc === TV_KEYS.OK && onOKKeyRef.current) { onOKKeyRef.current(e); return; }
      if (onArrowKeyRef.current) {
        if (kc === TV_KEYS.LEFT)  { e.preventDefault(); onArrowKeyRef.current('left', e);  return; }
        if (kc === TV_KEYS.UP)    { e.preventDefault(); onArrowKeyRef.current('up', e);    return; }
        if (kc === TV_KEYS.RIGHT) { e.preventDefault(); onArrowKeyRef.current('right', e); return; }
        if (kc === TV_KEYS.DOWN)  { e.preventDefault(); onArrowKeyRef.current('down', e);  return; }
      }
      if (onNumberKeyRef.current) {
        let digit = '';
        if (kc >= 48 && kc <= 57) digit = String(kc - 48);
        else if (kc >= 96 && kc <= 105) digit = String(kc - 96);
        if (digit) { onNumberKeyRef.current(digit, e); return; }
      }
      if ((kc === TV_KEYS.BACKSPACE || kc === TV_KEYS.RED) && onDeleteKeyRef.current) {
        e.preventDefault(); onDeleteKeyRef.current(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled]);

  useEffect(() => {
    if (!window.webOS) return;
    try {
      window.webOS.service.request('luna://com.webos.service.mrcu', {
        method: 'getAPIVersion', parameters: {},
        onSuccess: (r) => { setApiVersion(r.version); isWebOSTV24Plus.current = parseFloat(r.version) >= 1.0; setIsReady(true); },
        onFailure: () => { isWebOSTV24Plus.current = false; setIsReady(true); },
      });
    } catch { setIsReady(true); }
  }, []);

  const setSensorInterval = useCallback((newInterval) => {
    if (!window.webOS || !isWebOSTV24Plus.current) return;
    window.webOS.service.request('luna://com.webos.service.mrcu', {
      method: 'sensor2/setSensorInterval',
      parameters: { interval: Math.max(10, Math.min(1000, newInterval)) },
      onSuccess: () => {}, onFailure: () => {},
    });
  }, []);

  const resetQuaternion = useCallback(() => {
    if (!window.webOS) return;
    const method = isWebOSTV24Plus.current ? 'sensor2/resetQuaternion' : 'sensor/resetQuaternion';
    window.webOS.service.request('luna://com.webos.service.mrcu', { method, parameters: {}, onSuccess: () => {}, onFailure: () => {} });
  }, []);

  useEffect(() => {
    if (!window.webOS || !enabled || !isReady) return;

    const onSensorEvent = (response) => {
      if (response.subscribed) return;
      if (response.coordinate) {
        const { x, y } = response.coordinate;
        coordinatesRef.current = { x, y };
        onCoordinateChangeRef.current?.({ x, y });
      }
      if (onSensorDataRef.current) onSensorDataRef.current(response);
    };

    try {
      if (isWebOSTV24Plus.current) {
        subscriptionRef.current = window.webOS.service.request('luna://com.webos.service.mrcu', {
          method: 'sensor2/getSensorEventData',
          parameters: { sensorType, subscribe: true },
          onSuccess: onSensorEvent, onFailure: () => {},
        });
        setTimeout(() => setSensorInterval(interval), 100);
      } else {
        const callbackInterval = interval <= 10 ? 1 : interval <= 20 ? 2 : interval <= 50 ? 3 : 4;
        subscriptionRef.current = window.webOS.service.request('luna://com.webos.service.mrcu', {
          method: 'sensor/getSensorData',
          parameters: { callbackInterval, subscribe: true },
          onSuccess: onSensorEvent, onFailure: () => {},
        });
      }
    } catch { /* silently fail */ }

    return () => {
      if (subscriptionRef.current) { try { subscriptionRef.current.cancel(); } catch { /* ignore */ } }
      if (isWebOSTV24Plus.current && window.webOS) {
        window.webOS.service.request('luna://com.webos.service.mrcu', {
          method: 'sensor2/cancelSensorDataSubscribe',
          parameters: {}, onSuccess: () => {}, onFailure: () => {},
        });
      }
    };
  }, [enabled, isReady, sensorType, interval, setSensorInterval]);

  return { coordinates: coordinatesRef.current, isReady, apiVersion, resetQuaternion, setSensorInterval };
};

/**
 * DOM Focus Engine
 *
 * Zero React re-renders during navigation.
 * Focus is applied by directly setting data-focused / data-hovered attributes
 * on DOM elements. CSS in index.html handles all visual styles via attribute selectors.
 *
 * Components must NOT use focusedIndex/hoveredIndex for inline styles.
 * All focus styles live in global CSS: [data-focused="true"], [data-hovered="true"]
 */
export const useEnhancedRemoteNavigation = (items, options = {}) => {
  const {
    columns = 1,
    orientation = 'horizontal',
    enabled = true,
    onSelect = null,
    useMagicRemotePointer = true,
    focusThreshold = 50,
    enableNumberJump = true,
    numberJumpTimeout = 1000,
    numberJumpField = 'channelno',
  } = options;

  const itemCount = Array.isArray(items) ? items.length : items;
  const itemsArray = Array.isArray(items) ? items : null;

  // DOM state — never triggers React re-renders
  const focusedIndexRef = useRef(0);
  const hoveredIndexRef = useRef(null);
  const itemRefs = useRef([]);
  const numberBufferRef = useRef('');
  const numberTimerRef = useRef(null);

  // Only channel jump buffer needs state (displayed in UI)
  const [channelJumpBuffer, setChannelJumpBuffer] = useState('');

  // Stable refs for mutable options
  const itemCountRef = useRef(itemCount);
  const columnsRef = useRef(columns);
  const orientationRef = useRef(orientation);
  const onSelectRef = useRef(onSelect);
  const itemsArrayRef = useRef(itemsArray);
  useEffect(() => { itemCountRef.current = itemCount; }, [itemCount]);
  useEffect(() => { columnsRef.current = columns; }, [columns]);
  useEffect(() => { orientationRef.current = orientation; }, [orientation]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { itemsArrayRef.current = itemsArray; }, [itemsArray]);

  // Reset focus to 0 when item list changes size (e.g. filter change)
  const prevItemCount = useRef(itemCount);
  useEffect(() => {
    if (prevItemCount.current !== itemCount) {
      prevItemCount.current = itemCount;
      // Remove focus from old focused element
      const oldEl = itemRefs.current[focusedIndexRef.current];
      if (oldEl) { oldEl.removeAttribute('data-focused'); }
      focusedIndexRef.current = 0;
      // Apply focus to index 0 if it exists
      const newEl = itemRefs.current[0];
      if (newEl) { newEl.setAttribute('data-focused', 'true'); }
    }
  }, [itemCount]);

  // ── DOM manipulation helpers ────────────────────────────────────────────

  // Apply focus to newIndex — pure DOM, zero React re-render
  const applyFocus = useCallback((newIndex) => {
    const oldIndex = focusedIndexRef.current;

    if (oldIndex !== newIndex) {
      const oldEl = itemRefs.current[oldIndex];
      if (oldEl) {
        oldEl.removeAttribute('data-focused');
      }
    }

    const newEl = itemRefs.current[newIndex];
    if (newEl) {
      newEl.setAttribute('data-focused', 'true');
      // Never call .focus() or set tabindex=0 — prevents LG native blue focus ring
      newEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }

    focusedIndexRef.current = newIndex;
  }, []);

  // Apply hover — pure DOM, zero React re-render
  const applyHover = useCallback((newIndex) => {
    const oldIndex = hoveredIndexRef.current;
    if (oldIndex !== null && oldIndex !== newIndex) {
      const oldEl = itemRefs.current[oldIndex];
      if (oldEl) oldEl.removeAttribute('data-hovered');
    }
    if (newIndex !== null) {
      const newEl = itemRefs.current[newIndex];
      if (newEl) newEl.setAttribute('data-hovered', 'true');
    }
    hoveredIndexRef.current = newIndex;
  }, []);

  // ── Magic Remote coordinate tracking ───────────────────────────────────

  const { isReady } = useMagicRemote({
    enabled: useMagicRemotePointer && enabled,
    sensorType: 'coordinate',
    interval: 100,
    onCoordinateChange: useCallback((coords) => {
      if (!useMagicRemotePointer || !enabled) return;
      requestAnimationFrame(() => {
        let closestIndex = -1;
        let minDistance = Infinity;
        itemRefs.current.forEach((ref, index) => {
          if (!ref) return;
          const rect = ref.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const d = Math.sqrt((coords.x - cx) ** 2 + (coords.y - cy) ** 2);
          if (d < minDistance && d < focusThreshold) { minDistance = d; closestIndex = index; }
        });
        if (closestIndex !== -1 && minDistance < focusThreshold * 0.8) {
          if (closestIndex !== hoveredIndexRef.current) applyHover(closestIndex);
          if (closestIndex !== focusedIndexRef.current) applyFocus(closestIndex);
        }
      });
    }, [enabled, useMagicRemotePointer, focusThreshold, applyFocus, applyHover]),
  });

  // ── Number key channel jump ─────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !enableNumberJump) return;

    const getDigit = (event) => {
      if (/^[0-9]$/.test(event.key)) return event.key;
      if (event.code?.startsWith('Digit')) return event.code.replace('Digit', '');
      const kc = event.keyCode;
      if (kc >= 48 && kc <= 57) return String(kc - 48);
      if (kc >= 96 && kc <= 105) return String(kc - 96);
      return '';
    };

    const commitJump = () => {
      const value = numberBufferRef.current;
      if (!value) return;
      setChannelJumpBuffer('');
      numberBufferRef.current = '';
      if (numberTimerRef.current) { clearTimeout(numberTimerRef.current); numberTimerRef.current = null; }
      const arr = itemsArrayRef.current;
      let targetIndex = -1;
      if (arr) {
        targetIndex = arr.findIndex((item) => {
          const fv = item[numberJumpField];
          if (!fv) return false;
          const raw = String(fv).trim();
          const inp = String(value).trim();
          if (raw === inp) return true;
          const pr = parseInt(raw, 10);
          const pi = parseInt(inp, 10);
          return !Number.isNaN(pr) && !Number.isNaN(pi) && pr === pi;
        });
      } else {
        const idx = parseInt(value, 10) - 1;
        if (idx >= 0 && idx < itemCountRef.current) targetIndex = idx;
      }
      if (targetIndex !== -1) { applyFocus(targetIndex); onSelectRef.current?.(targetIndex); }
    };

    const handleNumberKey = (event) => {
      const digit = getDigit(event);
      if (digit) {
        event.preventDefault(); event.stopPropagation();
        numberBufferRef.current = `${numberBufferRef.current}${digit}`.slice(0, 4);
        setChannelJumpBuffer(numberBufferRef.current);
        if (numberTimerRef.current) clearTimeout(numberTimerRef.current);
        numberTimerRef.current = setTimeout(commitJump, numberJumpTimeout);
      }
    };

    window.addEventListener('keydown', handleNumberKey, true);
    return () => {
      window.removeEventListener('keydown', handleNumberKey, true);
      if (numberTimerRef.current) clearTimeout(numberTimerRef.current);
    };
  }, [enabled, enableNumberJump, numberJumpField, numberJumpTimeout, applyFocus]);

  // ── Keyboard navigation ─────────────────────────────────────────────────
  // PERF: deps = [enabled, applyFocus] only. Both are stable.
  // Event listener is registered ONCE, never torn down on keypress.

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      const key = event.key;
      const kc = event.keyCode;
      const cur = focusedIndexRef.current;
      const count = itemCountRef.current;
      const cols = columnsRef.current;
      const orient = orientationRef.current;
      let next = cur;

      if (orient === 'horizontal') {
        if (kc === TV_KEYS.RIGHT || key === 'ArrowRight') { event.preventDefault(); next = Math.min(cur + 1, count - 1); }
        else if (kc === TV_KEYS.LEFT || key === 'ArrowLeft') { event.preventDefault(); next = Math.max(cur - 1, 0); }
      } else if (orient === 'vertical') {
        if (kc === TV_KEYS.DOWN || key === 'ArrowDown') { event.preventDefault(); next = Math.min(cur + 1, count - 1); }
        else if (kc === TV_KEYS.UP || key === 'ArrowUp') { event.preventDefault(); next = Math.max(cur - 1, 0); }
        else if (kc === TV_KEYS.RIGHT || key === 'ArrowRight') { event.preventDefault(); next = Math.min(cur + 1, count - 1); }
        else if (kc === TV_KEYS.LEFT || key === 'ArrowLeft') { event.preventDefault(); next = Math.max(cur - 1, 0); }
      } else if (orient === 'grid') {
        if (kc === TV_KEYS.RIGHT || key === 'ArrowRight') { event.preventDefault(); next = cur % cols === cols - 1 ? cur : Math.min(cur + 1, count - 1); }
        else if (kc === TV_KEYS.LEFT || key === 'ArrowLeft') { event.preventDefault(); next = cur % cols === 0 ? cur : Math.max(cur - 1, 0); }
        else if (kc === TV_KEYS.DOWN || key === 'ArrowDown') { event.preventDefault(); next = Math.min(cur + cols, count - 1); }
        else if (kc === TV_KEYS.UP || key === 'ArrowUp') { event.preventDefault(); next = Math.max(cur - cols, 0); }
      }

      if (kc === TV_KEYS.OK || key === 'Enter' || key === ' ') {
        event.preventDefault();
        onSelectRef.current?.(cur);
      }

      if (next !== cur) applyFocus(next);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, applyFocus]);

  // ── getItemProps — STABLE, deps=[applyFocus] only ──────────────────────
  // Components spread this onto their list items.
  // The ref callback restores data-focused/data-hovered on remount.

  const getItemProps = useCallback((index) => ({
    ref: (el) => {
      itemRefs.current[index] = el;
      if (!el) return;
      // Restore focus/hover state when element remounts (e.g. after filter change)
      // Always tabindex=-1 to prevent LG spatial navigation from stealing focus
      el.setAttribute('tabindex', '-1');
      if (index === focusedIndexRef.current) {
        el.setAttribute('data-focused', 'true');
      } else {
        el.removeAttribute('data-focused');
      }
      if (index === hoveredIndexRef.current) {
        el.setAttribute('data-hovered', 'true');
      } else {
        el.removeAttribute('data-hovered');
      }
    },
    tabIndex: -1,
    onClick: () => {
      applyFocus(index);
      onSelectRef.current?.(index);
    },
  }), [applyFocus]);

  return {
    // These return ref values — they will NOT trigger re-renders when focus changes.
    // Components must NOT use these for inline style conditions.
    // All focus styling is handled by CSS [data-focused="true"] selectors in index.html.
    focusedIndex: focusedIndexRef.current,
    hoveredIndex: hoveredIndexRef.current,
    getItemProps,
    magicRemoteReady: isReady,
    coordinates: { x: 0, y: 0 },
    channelJumpBuffer,
  };
};

export default useMagicRemote;

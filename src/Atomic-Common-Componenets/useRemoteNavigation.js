import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Enhanced Remote Navigation Hook for webOS TV
 * Supports both horizontal and grid-based navigation
 */

const OK_KEYS = new Set(["Enter", "OK", "Accept", "Select"]);
const REMOTE_KEY_MAP = new Map([
  ["ArrowUp", "up"],
  ["ArrowDown", "down"],
  ["ArrowLeft", "left"],
  ["ArrowRight", "right"],
  ["Enter", "enter"],
  ["OK", "enter"],
  ["Accept", "enter"],
  ["Select", "enter"],
  ["Backspace", "back"],
  ["Escape", "back"],
  ["Back", "back"],
  ["Home", "home"],
  ["ContextMenu", "menu"],
  ["Menu", "menu"],
  ["Info", "info"],
  ["PageUp", "channelUp"],
  ["PageDown", "channelDown"],
  ["MediaTrackNext", "channelUp"],
  ["MediaTrackPrevious", "channelDown"],
  ["AudioVolumeUp", "volumeUp"],
  ["AudioVolumeDown", "volumeDown"],
  ["VolumeUp", "volumeUp"],
  ["VolumeDown", "volumeDown"],
  ["AudioVolumeMute", "mute"],
  ["Mute", "mute"],
  ["MediaPlay", "play"],
  ["MediaPause", "pause"],
  ["MediaPlayPause", "playPause"],
  ["Play", "play"],
  ["Pause", "pause"],
  ["Stop", "stop"],
  ["MediaStop", "stop"],
  ["FastForward", "fastForward"],
  ["MediaFastForward", "fastForward"],
  ["Rewind", "rewind"],
  ["MediaRewind", "rewind"],
  ["ColorF0Red", "red"],
  ["ColorF1Green", "green"],
  ["ColorF2Yellow", "yellow"],
  ["ColorF3Blue", "blue"],
]);

const REMOTE_KEYCODE_MAP = new Map([
  [37, "left"],
  [38, "up"],
  [39, "right"],
  [40, "down"],
  [13, "enter"],
  [461, "back"],
  [27, "back"],
  [36, "home"],
  [33, "channelUp"],
  [34, "channelDown"],
  [447, "volumeUp"],
  [448, "volumeDown"],
  [449, "mute"],
  [415, "play"],
  [19, "pause"],
  [413, "stop"],
  [417, "fastForward"],
  [412, "rewind"],
  [179, "playPause"],
  [403, "red"],
  [404, "green"],
  [405, "yellow"],
  [406, "blue"],
  [457, "info"],
  [458, "menu"],
]);

const getRemoteAction = (event) => {
  if (!event) return null;
  const fromKey = REMOTE_KEY_MAP.get(event.key);
  if (fromKey) return fromKey;
  if (typeof event.keyCode === "number") {
    return REMOTE_KEYCODE_MAP.get(event.keyCode) || null;
  }
  return null;
};

/**
 * Hook for horizontal/vertical list navigation
 */
export const useRemoteNavigation = (
  itemCount,
  {
    orientation = "horizontal",
    onSelect,
    onBack,
    onHome,
    onMenu,
    onInfo,
    onChannelUp,
    onChannelDown,
    onVolumeUp,
    onVolumeDown,
    onMute,
    onPlay,
    onPause,
    onPlayPause,
    onStop,
    onFastForward,
    onRewind,
    onColor,
    loop = false,
  } = {}
) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const refs = useRef([]);

  const clamp = useCallback(
    (index) => {
      if (itemCount === 0) return 0;
      if (loop) {
        if (index < 0) return itemCount - 1;
        if (index >= itemCount) return 0;
        return index;
      }
      if (index < 0) return 0;
      if (index > itemCount - 1) return itemCount - 1;
      return index;
    },
    [itemCount, loop]
  );

  useEffect(() => {
    const el = refs.current[focusedIndex];
    if (el) {
      el.focus({ preventScroll: false });
      // Smooth scroll into view for TV navigation
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }, [focusedIndex]);

  useEffect(() => {
    setFocusedIndex((prev) => clamp(prev));
  }, [itemCount, clamp]);

  useEffect(() => {
    const handleKey = (event) => {
      // Don't handle if input is focused
      if (isInputFocused()) return;

      const { key } = event;
      const action = getRemoteAction(event);
      let nextIndex = null;

      if (orientation === "horizontal") {
        if (action === "right" || key === "ArrowRight") nextIndex = clamp(focusedIndex + 1);
        if (action === "left" || key === "ArrowLeft") nextIndex = clamp(focusedIndex - 1);
        if (action === "channelUp") nextIndex = clamp(focusedIndex - 1);
        if (action === "channelDown") nextIndex = clamp(focusedIndex + 1);
      } else {
        if (action === "down" || key === "ArrowDown") nextIndex = clamp(focusedIndex + 1);
        if (action === "up" || key === "ArrowUp") nextIndex = clamp(focusedIndex - 1);
        if (action === "channelUp") nextIndex = clamp(focusedIndex - 1);
        if (action === "channelDown") nextIndex = clamp(focusedIndex + 1);
      }

      if (nextIndex !== null && nextIndex !== focusedIndex) {
        event.preventDefault();
        event.stopPropagation();
        setFocusedIndex(nextIndex);
        return;
      }

      if (action === "enter" || OK_KEYS.has(key) || key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        onSelect?.(focusedIndex);
        refs.current[focusedIndex]?.click?.();
      }

      if (action === "back") {
        event.preventDefault();
        event.stopPropagation();
        if (onBack) {
          onBack();
        } else {
          window.history.back();
        }
      }

      if (action === "home") {
        event.preventDefault();
        event.stopPropagation();
        onHome?.();
      }

      if (action === "menu") {
        event.preventDefault();
        event.stopPropagation();
        onMenu?.();
      }

      if (action === "info") {
        event.preventDefault();
        event.stopPropagation();
        onInfo?.();
      }

      if (action === "channelUp") {
        event.preventDefault();
        event.stopPropagation();
        onChannelUp?.();
      }

      if (action === "channelDown") {
        event.preventDefault();
        event.stopPropagation();
        onChannelDown?.();
      }

      if (action === "volumeUp") {
        event.preventDefault();
        event.stopPropagation();
        onVolumeUp?.();
      }

      if (action === "volumeDown") {
        event.preventDefault();
        event.stopPropagation();
        onVolumeDown?.();
      }

      if (action === "mute") {
        event.preventDefault();
        event.stopPropagation();
        onMute?.();
      }

      if (action === "play") {
        event.preventDefault();
        event.stopPropagation();
        onPlay?.();
      }

      if (action === "pause") {
        event.preventDefault();
        event.stopPropagation();
        onPause?.();
      }

      if (action === "playPause") {
        event.preventDefault();
        event.stopPropagation();
        onPlayPause?.();
      }

      if (action === "stop") {
        event.preventDefault();
        event.stopPropagation();
        onStop?.();
      }

      if (action === "fastForward") {
        event.preventDefault();
        event.stopPropagation();
        onFastForward?.();
      }

      if (action === "rewind") {
        event.preventDefault();
        event.stopPropagation();
        onRewind?.();
      }

      if (action === "red" || action === "green" || action === "yellow" || action === "blue") {
        event.preventDefault();
        event.stopPropagation();
        onColor?.(action);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    focusedIndex,
    clamp,
    orientation,
    onSelect,
    onBack,
    onHome,
    onMenu,
    onInfo,
    onChannelUp,
    onChannelDown,
    onVolumeUp,
    onVolumeDown,
    onMute,
    onPlay,
    onPause,
    onPlayPause,
    onStop,
    onFastForward,
    onRewind,
    onColor,
  ]);

  const registerItem = useCallback(
    (index) => (el) => {
      refs.current[index] = el;
    },
    []
  );

  const getItemProps = useCallback(
    (index, extraProps = {}) => ({
      tabIndex: index === focusedIndex ? 0 : -1,
      role: "button",
      ref: registerItem(index),
      onFocus: () => setFocusedIndex(index),
      "data-focused": index === focusedIndex,
      ...extraProps,
    }),
    [focusedIndex, registerItem]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    getItemProps,
    refs,
  };
};

/**
 * Hook for grid-based navigation (e.g., channel cards in a grid)
 * Supports up, down, left, right navigation in a grid layout
 */
export const useGridNavigation = (
  itemCount,
  columnsCount = 4,
  {
    onSelect,
    onBack,
    onHome,
    onMenu,
    onInfo,
    onChannelUp,
    onChannelDown,
    onVolumeUp,
    onVolumeDown,
    onMute,
    onPlay,
    onPause,
    onPlayPause,
    onStop,
    onFastForward,
    onRewind,
    onColor,
    loop = false,
    enabled = true,
  } = {}
) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const refs = useRef([]);
  const containerRef = useRef(null);

  const getRowCol = useCallback(
    (index) => {
      const row = Math.floor(index / columnsCount);
      const col = index % columnsCount;
      return { row, col };
    },
    [columnsCount]
  );

  const getIndex = useCallback(
    (row, col) => {
      return row * columnsCount + col;
    },
    [columnsCount]
  );

  const clamp = useCallback(
    (index) => {
      if (itemCount === 0) return 0;
      if (index < 0) return loop ? itemCount - 1 : 0;
      if (index >= itemCount) return loop ? 0 : itemCount - 1;
      return index;
    },
    [itemCount, loop]
  );

  useEffect(() => {
    const el = refs.current[focusedIndex];
    if (el && enabled) {
      el.focus({ preventScroll: false });
      // Smooth scroll into view with better positioning for TV
      el.scrollIntoView({ 
        behavior: "smooth", 
        block: "nearest", 
        inline: "nearest" 
      });
    }
  }, [focusedIndex, enabled]);

  useEffect(() => {
    setFocusedIndex((prev) => clamp(prev));
  }, [itemCount, clamp]);

  useEffect(() => {
    if (!enabled) return;

    const handleKey = (event) => {
      // Don't handle if input is focused
      if (isInputFocused()) return;

      const { key } = event;
      const action = getRemoteAction(event);
      const { row, col } = getRowCol(focusedIndex);
      let nextIndex = null;

      switch (action || key) {
        case "ArrowRight":
        case "right":
          if (col < columnsCount - 1 || loop) {
            nextIndex = getIndex(row, col + 1);
            if (nextIndex >= itemCount) {
              nextIndex = loop ? getIndex(row, 0) : focusedIndex;
            }
          }
          break;

        case "ArrowLeft":
        case "left":
          if (col > 0 || loop) {
            nextIndex = getIndex(row, col - 1);
            if (nextIndex < 0) {
              nextIndex = loop ? getIndex(row, columnsCount - 1) : focusedIndex;
            }
          }
          break;

        case "ArrowDown":
        case "down":
          nextIndex = getIndex(row + 1, col);
          if (nextIndex >= itemCount) {
            nextIndex = loop ? getIndex(0, col) : focusedIndex;
          }
          break;

        case "ArrowUp":
        case "up":
          if (row > 0 || loop) {
            nextIndex = getIndex(row - 1, col);
            if (nextIndex < 0) {
              const lastRow = Math.floor((itemCount - 1) / columnsCount);
              nextIndex = loop ? getIndex(lastRow, col) : focusedIndex;
            }
          }
          break;
        case "channelUp":
          if (row > 0 || loop) {
            nextIndex = getIndex(row - 1, col);
            if (nextIndex < 0) {
              const lastRow = Math.floor((itemCount - 1) / columnsCount);
              nextIndex = loop ? getIndex(lastRow, col) : focusedIndex;
            }
          }
          break;
        case "channelDown":
          nextIndex = getIndex(row + 1, col);
          if (nextIndex >= itemCount) {
            nextIndex = loop ? getIndex(0, col) : focusedIndex;
          }
          break;
        default:
          break;
      }

      if (nextIndex !== null && nextIndex !== focusedIndex && nextIndex >= 0 && nextIndex < itemCount) {
        event.preventDefault();
        event.stopPropagation();
        setFocusedIndex(nextIndex);
        return;
      }

      if (action === "enter" || OK_KEYS.has(key) || key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        onSelect?.(focusedIndex);
        refs.current[focusedIndex]?.click?.();
      }

      if (action === "back") {
        event.preventDefault();
        event.stopPropagation();
        if (onBack) {
          onBack();
        } else {
          window.history.back();
        }
      }

      if (action === "home") {
        event.preventDefault();
        event.stopPropagation();
        onHome?.();
      }

      if (action === "menu") {
        event.preventDefault();
        event.stopPropagation();
        onMenu?.();
      }

      if (action === "info") {
        event.preventDefault();
        event.stopPropagation();
        onInfo?.();
      }

      if (action === "channelUp") {
        event.preventDefault();
        event.stopPropagation();
        onChannelUp?.();
      }

      if (action === "channelDown") {
        event.preventDefault();
        event.stopPropagation();
        onChannelDown?.();
      }

      if (action === "volumeUp") {
        event.preventDefault();
        event.stopPropagation();
        onVolumeUp?.();
      }

      if (action === "volumeDown") {
        event.preventDefault();
        event.stopPropagation();
        onVolumeDown?.();
      }

      if (action === "mute") {
        event.preventDefault();
        event.stopPropagation();
        onMute?.();
      }

      if (action === "play") {
        event.preventDefault();
        event.stopPropagation();
        onPlay?.();
      }

      if (action === "pause") {
        event.preventDefault();
        event.stopPropagation();
        onPause?.();
      }

      if (action === "playPause") {
        event.preventDefault();
        event.stopPropagation();
        onPlayPause?.();
      }

      if (action === "stop") {
        event.preventDefault();
        event.stopPropagation();
        onStop?.();
      }

      if (action === "fastForward") {
        event.preventDefault();
        event.stopPropagation();
        onFastForward?.();
      }

      if (action === "rewind") {
        event.preventDefault();
        event.stopPropagation();
        onRewind?.();
      }

      if (action === "red" || action === "green" || action === "yellow" || action === "blue") {
        event.preventDefault();
        event.stopPropagation();
        onColor?.(action);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    focusedIndex,
    columnsCount,
    getRowCol,
    getIndex,
    itemCount,
    onSelect,
    onBack,
    onHome,
    onMenu,
    onInfo,
    onChannelUp,
    onChannelDown,
    onVolumeUp,
    onVolumeDown,
    onMute,
    onPlay,
    onPause,
    onPlayPause,
    onStop,
    onFastForward,
    onRewind,
    onColor,
    loop,
    clamp,
    enabled,
  ]);

  const registerItem = useCallback(
    (index) => (el) => {
      refs.current[index] = el;
    },
    []
  );

  const getItemProps = useCallback(
    (index, extraProps = {}) => ({
      tabIndex: index === focusedIndex ? 0 : -1,
      role: "button",
      ref: registerItem(index),
      onFocus: () => setFocusedIndex(index),
      "data-focused": index === focusedIndex,
      ...extraProps,
    }),
    [focusedIndex, registerItem]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    getItemProps,
    refs,
    containerRef,
  };
};

/**
 * Hook to prevent body scroll when input is focused on webOS
 */
export const useInputFocusHandler = () => {
  useEffect(() => {
    const handleFocus = (event) => {
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        // Prevent body scroll when input is focused
        document.body.style.overflow = "hidden";
        
        // Add a flag to prevent remote navigation
        target.setAttribute("data-input-focused", "true");
      }
    };

    const handleBlur = (event) => {
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        // Restore body scroll
        document.body.style.overflow = "auto";
        
        // Remove the flag
        target.removeAttribute("data-input-focused");
      }
    };

    document.addEventListener("focus", handleFocus, true);
    document.addEventListener("blur", handleBlur, true);

    return () => {
      document.removeEventListener("focus", handleFocus, true);
      document.removeEventListener("blur", handleBlur, true);
      document.body.style.overflow = "auto";
    };
  }, []);
};

/**
 * Check if an input is currently focused
 */
export const isInputFocused = () => {
  const activeElement = document.activeElement;
  return (
    activeElement &&
    (activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.getAttribute("data-input-focused") === "true" ||
      activeElement.getAttribute("contenteditable") === "true")
  );
};

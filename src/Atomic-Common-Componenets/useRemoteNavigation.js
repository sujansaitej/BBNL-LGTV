import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Enhanced Remote Navigation Hook for webOS TV
 * Supports both horizontal and grid-based navigation
 */

const OK_KEYS = new Set(["Enter", "OK", "Accept"]);

/**
 * Hook for horizontal/vertical list navigation
 */
export const useRemoteNavigation = (
  itemCount,
  { orientation = "horizontal", onSelect, loop = false } = {}
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
      let nextIndex = null;

      if (orientation === "horizontal") {
        if (key === "ArrowRight") nextIndex = clamp(focusedIndex + 1);
        if (key === "ArrowLeft") nextIndex = clamp(focusedIndex - 1);
      } else {
        if (key === "ArrowDown") nextIndex = clamp(focusedIndex + 1);
        if (key === "ArrowUp") nextIndex = clamp(focusedIndex - 1);
      }

      if (nextIndex !== null && nextIndex !== focusedIndex) {
        event.preventDefault();
        event.stopPropagation();
        setFocusedIndex(nextIndex);
        return;
      }

      if (OK_KEYS.has(key) || key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        onSelect?.(focusedIndex);
        refs.current[focusedIndex]?.click?.();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focusedIndex, clamp, orientation, onSelect]);

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
  { onSelect, loop = false, enabled = true } = {}
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
      const { row, col } = getRowCol(focusedIndex);
      let nextIndex = null;

      switch (key) {
        case "ArrowRight":
          if (col < columnsCount - 1 || loop) {
            nextIndex = getIndex(row, col + 1);
            if (nextIndex >= itemCount) {
              nextIndex = loop ? getIndex(row, 0) : focusedIndex;
            }
          }
          break;

        case "ArrowLeft":
          if (col > 0 || loop) {
            nextIndex = getIndex(row, col - 1);
            if (nextIndex < 0) {
              nextIndex = loop ? getIndex(row, columnsCount - 1) : focusedIndex;
            }
          }
          break;

        case "ArrowDown":
          nextIndex = getIndex(row + 1, col);
          if (nextIndex >= itemCount) {
            nextIndex = loop ? getIndex(0, col) : focusedIndex;
          }
          break;

        case "ArrowUp":
          if (row > 0 || loop) {
            nextIndex = getIndex(row - 1, col);
            if (nextIndex < 0) {
              const lastRow = Math.floor((itemCount - 1) / columnsCount);
              nextIndex = loop ? getIndex(lastRow, col) : focusedIndex;
            }
          }
          break;
      }

      if (nextIndex !== null && nextIndex !== focusedIndex && nextIndex >= 0 && nextIndex < itemCount) {
        event.preventDefault();
        event.stopPropagation();
        setFocusedIndex(nextIndex);
        return;
      }

      if (OK_KEYS.has(key) || key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        onSelect?.(focusedIndex);
        refs.current[focusedIndex]?.click?.();
      }

      // Back button support
      if (key === "Backspace" || key === "Back" || key === "Escape") {
        event.preventDefault();
        window.history.back();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focusedIndex, columnsCount, getRowCol, getIndex, itemCount, onSelect, loop, clamp, enabled]);

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

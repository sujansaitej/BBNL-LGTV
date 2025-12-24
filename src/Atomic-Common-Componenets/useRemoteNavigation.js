import { useCallback, useEffect, useRef, useState } from "react";

const OK_KEYS = new Set(["Enter", "OK", "Accept"]);

export const useRemoteNavigation = (
  itemCount,
  { orientation = "horizontal", onSelect } = {}
) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const refs = useRef([]);

  const clamp = useCallback(
    (index) => {
      if (itemCount === 0) return 0;
      if (index < 0) return 0;
      if (index > itemCount - 1) return itemCount - 1;
      return index;
    },
    [itemCount]
  );

  useEffect(() => {
    const el = refs.current[focusedIndex];
    if (el) el.focus({ preventScroll: true });
  }, [focusedIndex]);

  useEffect(() => {
    setFocusedIndex((prev) => clamp(prev));
  }, [itemCount, clamp]);

  useEffect(() => {
    const handleKey = (event) => {
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
        setFocusedIndex(nextIndex);
        return;
      }

      if (OK_KEYS.has(key) || key === "Enter") {
        event.preventDefault();
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
      ...extraProps,
    }),
    [focusedIndex, registerItem]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    getItemProps,
  };
};

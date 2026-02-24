/**
 * Magic Remote UI Stability Utilities
 * Provides global functions to maintain perfect UI alignment during Magic Remote pointer tracking
 */

/**
 * Lock all elements during Magic Remote tracking to prevent unintended zoom/alignment shifts
 * Call this at app initialization or when Magic Remote is active
 */
export const lockUIForMagicRemote = () => {
  // Add global lock class to prevent transforms
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('magic-remote-mode-active');
    document.body.classList.add('magic-remote-mode-active');
    
    // Lock root container
    const root = document.getElementById('root');
    if (root) {
      root.style.overflow = 'hidden';
      root.style.position = 'fixed';
      root.style.width = '100vw';
      root.style.height = '100vh';
      root.style.top = '0';
      root.style.left = '0';
      root.style.zoom = '1';
    }
  }
};

/**
 * Disable automatic focus scaling on Magic Remote pointer movement
 */
export const disableFocusScaling = () => {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.id = 'magic-remote-focus-lock';
  style.textContent = `
    *:focus,
    *:focus-visible,
    [data-focused="true"],
    [data-hovered="true"] {
      transform: none !important;
    }
  `;
  
  if (!document.getElementById('magic-remote-focus-lock')) {
    document.head.appendChild(style);
  }
};

/**
 * Safe coordinate transformation that doesn't cause layout shifts
 * Use this when displaying Magic Remote cursor on screen
 */
export const getStableCoordinates = (coords, containerRect) => {
  if (!coords || !containerRect) return { x: 0, y: 0 };

  return {
    x: Math.max(0, Math.min(coords.x, containerRect.width)),
    y: Math.max(0, Math.min(coords.y, containerRect.height)),
  };
};

/**
 * Prevent pointer events from triggering unintended layout changes
 * Apply to elements that should be safely focused by Magic Remote
 */
export const makeMagicRemoteSafe = (element) => {
  if (!element) return;

  // Ensure element doesn't scale on focus
  element.style.transform = 'none';
  element.style.willChange = 'auto';
  
  // Override focus styles
  element.setAttribute('data-magic-remote-safe', 'true');
};

/**
 * Batch apply Magic Remote safety to multiple elements
 */
export const makeMagicRemoteSafeElements = (selector) => {
  if (typeof document === 'undefined') return;

  const elements = document.querySelectorAll(selector);
  elements.forEach((el) => makeMagicRemoteSafe(el));
};

/**
 * Get focus threshold based on element size for optimal Magic Remote interaction
 */
export const getAdaptiveFocusThreshold = (element) => {
  if (!element) return 100;

  const rect = element.getBoundingClientRect();
  const avgSize = (rect.width + rect.height) / 2;
  
  // Return threshold as percentage of element size
  return Math.max(50, avgSize * 0.5);
};

/**
 * Prevent layout thrashing during rapid Magic Remote pointer movement
 * Debounces focus updates to critical updates only
 */
export const createStableFocusUpdater = (callback, threshold = 100) => {
  let lastUpdate = 0;
  let lastIndex = -1;

  return (index) => {
    const now = Date.now();
    
    // Only update if changed AND sufficient time has passed
    if (index !== lastIndex && now - lastUpdate > threshold) {
      lastUpdate = now;
      lastIndex = index;
      callback(index);
    }
  };
};

/**
 * Fix element that's experiencing zoom/alignment issues
 */
export const fixElementZoom = (element) => {
  if (!element) return;

  element.style.transform = 'none !important';
  element.style.zoom = '1';
  element.style.willChange = 'auto';
  element.style.perspective = 'none';
  element.style.perspective = 'initial';
};

/**
 * Batch fix all elements with zoom issues
 */
export const fixAllZoomIssues = () => {
  if (typeof document === 'undefined') return;

  // Fix all focused/hovered elements
  const problematicElements = document.querySelectorAll(
    '[data-focused="true"], [data-hovered="true"], :focus, .focused, .hovered'
  );

  problematicElements.forEach((el) => fixElementZoom(el));
};

/**
 * Initialize global Magic Remote UI stability
 * Call this once at app startup
 */
export const initializeMagicRemoteUIStability = () => {
  lockUIForMagicRemote();
  disableFocusScaling();
  makeMagicRemoteSafeElements('[role="button"], button, [role="menuitem"], .channel-card, .tv-card');
  
  // Fix zoom issues periodically during active use
  if (typeof window !== 'undefined') {
    window.magicRemoteUIFixer = setInterval(() => {
      fixAllZoomIssues();
    }, 500);
  }
};

/**
 * Clean up Magic Remote UI stability helpers
 */
export const cleanupMagicRemoteUIStability = () => {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.remove('magic-remote-mode-active');
  document.body.classList.remove('magic-remote-mode-active');

  if (typeof window !== 'undefined' && window.magicRemoteUIFixer) {
    clearInterval(window.magicRemoteUIFixer);
  }
};

/**
 * Create a stable focus handler that prevents zoom during Magic Remote tracking
 */
export const createMagicRemoteFocusHandler = (onFocus) => {
  return (index) => {
    // Prevent default focus scaling
    if (typeof document !== 'undefined') {
      const focused = document.querySelector('[data-focused="true"]');
      if (focused) {
        focused.style.transform = 'none';
      }
    }

    // Call user's handler
    onFocus?.(index);
  };
};

/**
 * Safe pointer event handler that won't cause layout shifts
 */
export const createSafePointerHandler = (onPointer) => {
  return (coords) => {
    // Use requestAnimationFrame to prevent layout thrashing
    requestAnimationFrame(() => {
      onPointer?.(coords);
    });
  };
};

/**
 * Validate that UI hasn't shifted and fix if needed
 */
export const validateUIAlignment = (expectedLayout) => {
  if (typeof window === 'undefined') return true;

  const root = document.getElementById('root');
  if (!root) return true;

  const style = window.getComputedStyle(root);
  const hasShifted = style.zoom !== '1' || style.transform !== 'none';

  if (hasShifted) {
    fixElementZoom(root);
    return false;
  }

  return true;
};

/**
 * Spatial Navigation Configuration for LG webOS TVs
 * Compatible with all LG Magic Remote and Standard Remote models
 * 
 * Supported Remotes:
 * - AKB76046609, AKB76045009, AKB74115502, AKB75675312
 * - AKB74115501, AKB76037606, EBX64329215, AKB73755488
 * - AKB76043109, AKB76039908, AKB76037605, AKB75675326
 * - AKB75455602, AKB75455601, AKB75095359, AKB75055702
 * - AKB76039702, AKB75055701, AKB75675325, AKB75615301, AKB75375609
 */

import SpatialNavigation from '@noriginmedia/norigin-spatial-navigation';

// Initialize spatial navigation
export const initializeSpatialNavigation = () => {
  try {
    SpatialNavigation.init({
      /* Debugging */
      debug: false,
      visualDebug: false,

      /* Selector for focusable elements */
      selector: '[data-focusable], button, a, input, [tabindex], [role="button"]',

      /* Smoothness animation */
      straightOverlapThreshold: 0.5,
      straightOverlapThresholdPercentage: 80,

      /* Wrap around */
      wrap: true,
      
      /* Restrict navigation within sections */
      restrictedNavigation: false,

      /* Distancing algorithm */
      distanceAlgorithm: 'weighted',
      diagonalDistanceAlgorithm: 'Chebyshev',

      /* Micromanaging */
      rememberSource: false,
      enterTo: '',
      leaveFor: {},
      isSelfFocusable: false,

      /* Customized ID mapping */
      idMap: [],

      /* Media queries */
      shouldFocusOnlyKey: false,
    });

    SpatialNavigation.setKeyMap({
      // Standard d-pad keys
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',

      // webOS remote keys (all models support these)
      '33': 'up',       // PageUp / ChannelUp
      '34': 'down',     // PageDown / ChannelDown

      // OK / Enter key (all models)
      'Enter': 'enter',
      'Escape': 'back',
      'Home': 'home',
    });

    // Register event listeners safely
    SpatialNavigation.on('willfocus', (element) => {
      try {
        if (element) {
          element.setAttribute('data-focused', 'true');
          element.style.outline = 'none';
        }
      } catch (e) {
        console.debug('Focus event error:', e);
      }
    });

    SpatialNavigation.on('unfocus', (element) => {
      try {
        if (element) {
          element.removeAttribute('data-focused');
        }
      } catch (e) {
        console.debug('Unfocus event error:', e);
      }
    });

    SpatialNavigation.on('enter-down', (element) => {
      try {
        if (element) {
          element.click?.();
        }
      } catch (e) {
        console.debug('Click event error:', e);
      }
    });

    console.log('✓ Spatial Navigation init complete');
  } catch (error) {
    console.warn('⚠ Spatial Navigation setup error:', error.message);
    throw error;
  }
};

// Register a focusable section
export const registerSection = (sectionId, options = {}) => {
  SpatialNavigation.add(sectionId, {
    selector: options.selector || '[data-focusable]',
    straightOverlapThreshold: options.straightOverlapThreshold ?? 0.5,
    wrap: options.wrap ?? true,
    rememberSource: options.rememberSource ?? false,
    ...options,
  });
};

// Focus on a specific section
export const focusSection = (sectionId) => {
  SpatialNavigation.focus(sectionId);
};

// Move focus in a direction
export const moveFocus = (direction) => {
  SpatialNavigation.move(direction);
};

// Set unvisible (prevent focus)
export const setUnvisible = (selector) => {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el) => {
    SpatialNavigation.setNodeFocusable(false, el);
  });
};

// Set visible (allow focus)
export const setVisible = (selector) => {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el) => {
    SpatialNavigation.setNodeFocusable(true, el);
  });
};

// Pause spatial navigation (useful for modal dialogs)
export const pauseSpatialNav = () => {
  SpatialNavigation.pause();
};

// Resume spatial navigation
export const resumeSpatialNav = () => {
  SpatialNavigation.resume();
};

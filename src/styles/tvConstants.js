/**
 * LG webOS TV UI Design System
 * Optimized for 32" to 86" screens with proper TV-safe zones
 * Distance-optimized sizing and clarity
 */

// ==================== TV SAFE ZONES ====================
// Industry standard: 5% margin on all sides for TV-safe area
export const TV_SAFE_ZONE = {
  horizontal: '5%', // Left & Right margins
  vertical: '5%',   // Top & Bottom margins
  
  // Precise pixel values for common TV resolutions
  HD: { x: 96, y: 54 },      // 1920x1080: 5% = 96px horizontal, 54px vertical
  UHD: { x: 192, y: 108 },   // 3840x2160: 5% = 192px horizontal, 108px vertical
};

// ==================== TYPOGRAPHY SCALES ====================
// Optimized for 10-foot viewing distance (industry standard)
export const TV_TYPOGRAPHY = {
  // Hero/Display text
  hero: {
    fontSize: '3.5rem',      // 56px - Main titles, app name
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: '0.02em',
  },
  
  // Page headers
  h1: {
    fontSize: '2.75rem',     // 44px - Page titles
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '0.01em',
  },
  
  h2: {
    fontSize: '2.25rem',     // 36px - Section headers
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: '0.01em',
  },
  
  h3: {
    fontSize: '1.875rem',    // 30px - Subsection headers
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '0.01em',
  },
  
  // Body text
  body1: {
    fontSize: '1.5rem',      // 24px - Primary body text
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0.02em',
  },
  
  body2: {
    fontSize: '1.25rem',     // 20px - Secondary body text
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0.02em',
  },
  
  // UI Elements
  button: {
    fontSize: '1.375rem',    // 22px - Button text
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.03em',
  },
  
  caption: {
    fontSize: '1.125rem',    // 18px - Small labels, captions
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: '0.02em',
  },
  
  label: {
    fontSize: '1rem',        // 16px - Tiny labels (minimum readable)
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '0.03em',
  },
};

// ==================== SPACING SYSTEM ====================
// Based on 8px base unit (industry standard)
export const TV_SPACING = {
  xs: '0.5rem',    // 8px
  sm: '1rem',      // 16px
  md: '1.5rem',    // 24px
  lg: '2rem',      // 32px
  xl: '3rem',      // 48px
  xxl: '4rem',     // 64px
  xxxl: '6rem',    // 96px
  
  // Semantic spacing
  cardGap: '2rem',          // 32px - Gap between cards
  sectionGap: '3rem',       // 48px - Gap between sections
  containerPadding: '3rem', // 48px - Container padding
  
  // TV-safe container
  safeContainer: {
    paddingX: '5%',
    paddingY: '5%',
  },
};

// ==================== COMPONENT SIZES ====================
export const TV_SIZES = {
  // Buttons - minimum 44x44px touch target
  button: {
    small: { height: '3rem', px: '2rem' },    // 48px x 32px padding
    medium: { height: '3.5rem', px: '2.5rem' }, // 56px x 40px padding
    large: { height: '4rem', px: '3rem' },     // 64px x 48px padding
  },
  
  // Icons - clearly visible from distance
  icon: {
    small: '2rem',    // 32px
    medium: '2.5rem', // 40px
    large: '3rem',    // 48px
    xlarge: '4rem',   // 64px
  },
  
  // Cards & Media
  card: {
    channelLogo: { width: '18rem', height: '10rem' },     // 288px x 160px
    channelSidebar: { width: '3.5rem', height: '3.5rem' }, // 56px x 56px
    moviePoster: { width: '15rem', height: '22.5rem' },    // 240px x 360px (16:9)
    heroBanner: { width: '100%', height: '35rem' },        // 560px height
  },
  
  // Input fields
  input: {
    height: '3.5rem',  // 56px - comfortable for d-pad navigation
    fontSize: '1.5rem', // 24px
  },
  
  // Sidebar/Navigation
  sidebar: {
    collapsed: '6rem',   // 96px - icon-only mode
    expanded: '24rem',   // 384px - full menu
  },
  
  // Header/Footer
  header: {
    height: '5rem', // 80px
  },
  
  footer: {
    height: '4rem', // 64px
  },
};

// ==================== BORDER RADIUS ====================
export const TV_RADIUS = {
  none: '0',
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.25rem',   // 20px
  xxl: '1.75rem',  // 28px
  round: '50%',
  pill: '9999px',
};

// ==================== FOCUS STYLES ====================
// High contrast focus indicators for remote navigation
export const TV_FOCUS = {
  // Primary focus ring
  primary: {
    border: '4px solid #667eea',
    boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.3)',
    outline: 'none',
    transform: 'scale(1.05)',
    transition: 'all 0.2s ease-in-out',
  },
  
  // Secondary/subtle focus
  secondary: {
    border: '3px solid rgba(255, 255, 255, 0.7)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    outline: 'none',
    transform: 'scale(1.03)',
    transition: 'all 0.2s ease-in-out',
  },
  
  // Focus for text/subtle elements
  subtle: {
    border: '2px solid #667eea',
    outline: 'none',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    transition: 'all 0.2s ease-in-out',
  },
};

// ==================== ANIMATION TIMINGS ====================
export const TV_TIMING = {
  instant: '0.1s',
  fast: '0.2s',
  normal: '0.3s',
  slow: '0.5s',
  verySlow: '0.8s',
};

// ==================== RESPONSIVE BREAKPOINTS ====================
// Based on common LG TV sizes
export const TV_BREAKPOINTS = {
  small: '768px',      // 32" and smaller (HD Ready)
  medium: '1366px',    // 42"-50" (HD/FHD)
  large: '1920px',     // 55"-65" (Full HD)
  xlarge: '2560px',    // 70"-77" (QHD)
  xxlarge: '3840px',   // 86"+ (4K UHD)
};

// ==================== COLOR SYSTEM ====================
export const TV_COLORS = {
  // Background layers (pure black for OLED burn-in prevention)
  background: {
    primary: '#000000',           // True black
    secondary: '#0a0a0a',         // Slightly raised
    tertiary: '#121212',          // Cards/panels
    overlay: 'rgba(0, 0, 0, 0.85)', // Modal/overlay
  },
  
  // Text colors (high contrast for readability)
  text: {
    primary: '#ffffff',           // Main text
    secondary: 'rgba(255, 255, 255, 0.85)',
    tertiary: 'rgba(255, 255, 255, 0.6)',
    disabled: 'rgba(255, 255, 255, 0.38)',
  },
  
  // Accent colors
  accent: {
    primary: '#667eea',           // Primary brand
    secondary: '#764ba2',         // Secondary brand
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
  },
  
  // Glass morphism
  glass: {
    light: 'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(255, 255, 255, 0.12)',
    dark: 'rgba(0, 0, 0, 0.6)',
  },
};

// ==================== GRID SYSTEM ====================
export const TV_GRID = {
  // Auto-responsive column calculation
  getColumns: (screenWidth) => {
    if (screenWidth < 1366) return 3;       // Small TVs: 3 columns
    if (screenWidth < 1920) return 4;       // Medium TVs: 4 columns
    if (screenWidth < 2560) return 5;       // Large TVs: 5 columns
    if (screenWidth < 3840) return 6;       // XLarge TVs: 6 columns
    return 7;                                // 4K+ TVs: 7 columns
  },
  
  // Pre-defined grid templates
  columns: {
    small: 'repeat(3, 1fr)',
    medium: 'repeat(4, 1fr)',
    large: 'repeat(5, 1fr)',
    xlarge: 'repeat(6, 1fr)',
    xxlarge: 'repeat(7, 1fr)',
  },
  
  gap: {
    xs: '1rem',   // 16px
    sm: '1.5rem', // 24px
    md: '2rem',   // 32px
    lg: '2.5rem', // 40px
    xl: '3rem',   // 48px
  },
};

// ==================== Z-INDEX LAYERS ====================
export const TV_Z_INDEX = {
  background: 0,
  content: 1,
  header: 10,
  sidebar: 15,
  dropdown: 20,
  overlay: 30,
  modal: 40,
  notification: 50,
  tooltip: 60,
};

// ==================== SHADOW SYSTEM ====================
export const TV_SHADOWS = {
  none: 'none',
  sm: '0 2px 8px rgba(0, 0, 0, 0.2)',
  md: '0 4px 16px rgba(0, 0, 0, 0.3)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.4)',
  xl: '0 12px 48px rgba(0, 0, 0, 0.5)',
  
  // Focus shadows
  focus: '0 0 0 4px rgba(102, 126, 234, 0.4)',
  focusGlow: '0 0 24px rgba(102, 126, 234, 0.6)',
};

// ==================== BACKDROP BLUR ====================
export const TV_BLUR = {
  none: 'blur(0)',
  sm: 'blur(8px)',
  md: 'blur(16px)',
  lg: 'blur(24px)',
  xl: 'blur(40px)',
};

// ==================== UTILITY FUNCTIONS ====================
export const tvUtils = {
  // Calculate TV-safe bounds
  getSafeAreaPadding: (resolution = 'HD') => {
    return TV_SAFE_ZONE[resolution] || TV_SAFE_ZONE.HD;
  },
  
  // Get responsive columns based on screen width
  getResponsiveColumns: (width) => TV_GRID.getColumns(width),
  
  // Create focus state object
  createFocusState: (type = 'primary') => TV_FOCUS[type],
  
  // Media query helper
  mediaQuery: (breakpoint) => `@media (min-width: ${TV_BREAKPOINTS[breakpoint]})`,
  
  // CSS variable scaling functions for responsive sizing
  scale: (value) => `calc(${value} * var(--tv-scale, 1))`,
  scaleFont: (value) => `calc(${value} * var(--tv-font-scale, 1))`,
  scaleSpacing: (value) => `calc(${value} * var(--tv-spacing-scale, 1))`,
  
  // Get responsive value based on screen size
  getResponsiveValue: (small, medium, large, xlarge, xxlarge) => ({
    '@media (max-width: 1365px)': small,
    '@media (min-width: 1366px) and (max-width: 1919px)': medium,
    '@media (min-width: 1920px) and (max-width: 2559px)': large,
    '@media (min-width: 2560px) and (max-width: 3839px)': xlarge,
    '@media (min-width: 3840px)': xxlarge,
  }),
  
  // Apply responsive scaling to MUI sx prop
  responsiveSx: (styles) => ({
    ...styles,
    fontSize: styles.fontSize ? `calc(${styles.fontSize} * var(--tv-font-scale, 1))` : undefined,
    padding: styles.padding ? `calc(${styles.padding} * var(--tv-spacing-scale, 1))` : undefined,
    margin: styles.margin ? `calc(${styles.margin} * var(--tv-spacing-scale, 1))` : undefined,
    width: styles.width && typeof styles.width === 'string' && styles.width.includes('rem') 
      ? `calc(${styles.width} * var(--tv-scale, 1))` : styles.width,
    height: styles.height && typeof styles.height === 'string' && styles.height.includes('rem')
      ? `calc(${styles.height} * var(--tv-scale, 1))` : styles.height,
  }),
};

// ==================== CSS VARIABLE EXPORTS ====================
// Export CSS custom properties as strings for easy component usage
export const TV_CSS_VARS = {
  scale: 'var(--tv-scale, 1)',
  fontScale: 'var(--tv-font-scale, 1)',
  spacingScale: 'var(--tv-spacing-scale, 1)',
  safeZoneX: 'var(--tv-safe-zone-x, 5%)',
  safeZoneY: 'var(--tv-safe-zone-y, 5%)',
};

// ==================== RESPONSIVE SIZE PRESETS ====================
// Pre-calculated responsive sizes for common UI elements
export const TV_RESPONSIVE_SIZES = {
  // Buttons with automatic scaling
  button: {
    small: {
      height: `calc(3rem * var(--tv-scale, 1))`,
      px: `calc(2rem * var(--tv-spacing-scale, 1))`,
      fontSize: `calc(1.125rem * var(--tv-font-scale, 1))`,
    },
    medium: {
      height: `calc(3.5rem * var(--tv-scale, 1))`,
      px: `calc(2.5rem * var(--tv-spacing-scale, 1))`,
      fontSize: `calc(1.375rem * var(--tv-font-scale, 1))`,
    },
    large: {
      height: `calc(4rem * var(--tv-scale, 1))`,
      px: `calc(3rem * var(--tv-spacing-scale, 1))`,
      fontSize: `calc(1.5rem * var(--tv-font-scale, 1))`,
    },
  },
  
  // Icons with automatic scaling
  icon: {
    small: `calc(2rem * var(--tv-scale, 1))`,
    medium: `calc(2.5rem * var(--tv-scale, 1))`,
    large: `calc(3rem * var(--tv-scale, 1))`,
    xlarge: `calc(4rem * var(--tv-scale, 1))`,
  },
  
  // Cards with automatic scaling
  card: {
    padding: `calc(1.5rem * var(--tv-spacing-scale, 1))`,
    borderRadius: `calc(1rem * var(--tv-scale, 1))`,
    gap: `calc(2rem * var(--tv-spacing-scale, 1))`,
  },
  
  // Header with automatic scaling
  header: {
    height: `calc(5rem * var(--tv-scale, 1))`,
    padding: `calc(1rem * var(--tv-spacing-scale, 1))`,
  },
  
  // Sidebar with automatic scaling
  sidebar: {
    collapsed: `calc(6rem * var(--tv-scale, 1))`,
    expanded: `calc(24rem * var(--tv-scale, 1))`,
  },
};

// ==================== RESPONSIVE TYPOGRAPHY EXPORTS ====================
// Typography with CSS variable scaling applied
export const TV_RESPONSIVE_TYPOGRAPHY = {
  hero: {
    fontSize: `calc(3.5rem * var(--tv-font-scale, 1))`,
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: '0.02em',
  },
  h1: {
    fontSize: `calc(2.75rem * var(--tv-font-scale, 1))`,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '0.01em',
  },
  h2: {
    fontSize: `calc(2.25rem * var(--tv-font-scale, 1))`,
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: '0.01em',
  },
  h3: {
    fontSize: `calc(1.875rem * var(--tv-font-scale, 1))`,
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '0.01em',
  },
  body1: {
    fontSize: `calc(1.5rem * var(--tv-font-scale, 1))`,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0.02em',
  },
  body2: {
    fontSize: `calc(1.25rem * var(--tv-font-scale, 1))`,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0.02em',
  },
  button: {
    fontSize: `calc(1.375rem * var(--tv-font-scale, 1))`,
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.03em',
  },
  caption: {
    fontSize: `calc(1.125rem * var(--tv-font-scale, 1))`,
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: '0.02em',
  },
  label: {
    fontSize: `calc(1rem * var(--tv-font-scale, 1))`,
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '0.03em',
  },
};

const tvConstantsExport = {
  TV_SAFE_ZONE,
  TV_TYPOGRAPHY,
  TV_SPACING,
  TV_SIZES,
  TV_RADIUS,
  TV_FOCUS,
  TV_TIMING,
  TV_BREAKPOINTS,
  TV_COLORS,
  TV_GRID,
  TV_Z_INDEX,
  TV_SHADOWS,
  TV_BLUR,
  TV_CSS_VARS,
  TV_RESPONSIVE_SIZES,
  TV_RESPONSIVE_TYPOGRAPHY,
  tvUtils,
};

export default tvConstantsExport;

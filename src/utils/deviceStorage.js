/**
 * Device Storage Utilities
 * Manages persistent device identification via localStorage
 * Each TV gets a unique UUID on first launch that never changes
 */

/**
 * Generate a UUID v4 (random unique identifier)
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * @returns {string} UUID string
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Get or create a unique Device UUID
 * First call generates and stores UUID in localStorage
 * Subsequent calls return the same stored UUID
 * 
 * @returns {string} Device UUID (e.g., "a7b3c9d2-4f1e-8a6b-2c5d-f9e1a3b7c9d2")
 */
export const getDeviceUUID = () => {
  const STORAGE_KEY = 'lgtv_device_uuid';
  
  try {
    // Check if UUID already exists in localStorage
    let storedUUID = localStorage.getItem(STORAGE_KEY);
    
    if (!storedUUID) {
      // First time: generate new UUID
      storedUUID = generateUUID();
      localStorage.setItem(STORAGE_KEY, storedUUID);
      console.log('✓ Generated new Device UUID:', storedUUID);
    } else {
      console.log('✓ Retrieved stored Device UUID:', storedUUID);
    }
    
    return storedUUID;
  } catch (error) {
    // localStorage not available (shouldn't happen on webOS TV)
    console.warn('⚠ localStorage not available, generating temporary UUID:', error.message);
    return generateUUID();
  }
};

/**
 * Format Device UUID for display
 * Adds "TV-" prefix for easy identification
 * 
 * @returns {string} Formatted Device ID (e.g., "TV-a7b3c9d2-4f1e-8a6b")
 */
export const getFormattedDeviceId = () => {
  const uuid = getDeviceUUID();
  return `TV-${uuid}`;
};

/**
 * Reset Device UUID (for testing only)
 * Clears localStorage and generates new UUID
 * Use only in development/debugging
 * 
 * @returns {string} New Device UUID
 */
export const resetDeviceUUID = () => {
  const STORAGE_KEY = 'lgtv_device_uuid';
  localStorage.removeItem(STORAGE_KEY);
  console.warn('⚠ Device UUID cleared, generating new one...');
  return getDeviceUUID();
};

/**
 * Get device storage info for debugging
 * @returns {Object} Device storage details
 */
export const getDeviceStorageInfo = () => {
  try {
    const uuid = getDeviceUUID();
    const storageAvailable = localStorage.length > 0;
    
    return {
      uuid,
      formattedId: getFormattedDeviceId(),
      storageAvailable,
      localStorage: {
        lgtv_device_uuid: localStorage.getItem('lgtv_device_uuid')
      }
    };
  } catch (error) {
    return {
      error: error.message,
      storageAvailable: false
    };
  }
};

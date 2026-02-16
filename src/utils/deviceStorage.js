/**
 * Device Storage Utilities
 * Manages persistent device identification using HARDWARE-BASED identifiers
 * 
 * CRITICAL: For subscription security (one phone → one device)
 * Uses multi-layer approach:
 * 1. LGUDID (LG Unique Device ID) - Hardware-based, NEVER changes
 * 2. MAC Address - Hardware-based backup
 * 3. localStorage UUID - Only as last resort fallback
 */

import { getWebOSDeviceID, getWebOSMacAddresses } from './webos';

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
 * Hash a string to create a stable device ID
 * Used for converting MAC address to device ID format
 * @param {string} str - String to hash
 * @returns {string} UUID-like string
 */
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert hash to hex and pad to create UUID-like format
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0,8)}-${hex.slice(0,4)}-4${hex.slice(0,3)}-a${hex.slice(0,3)}-${hex.slice(0,12)}`;
};

/**
 * Get HARDWARE-BASED Device ID (NEVER CHANGES)
 * 
 * Priority:
 * 1. LGUDID from Luna API (best - official hardware ID)
 * 2. MAC Address (backup - hardware ID)
 * 3. localStorage UUID (last resort - can change in dev mode)
 * 
 * @returns {Promise<string>} Stable Device ID
 */
export const getDeviceUUID = async () => {
  const STORAGE_KEY = 'lgtv_device_uuid'; // legacy fallback
  const LGUDID_CACHE_KEY = 'lgtv_lgudid_cache'; // legacy cache
  const PINNED_KEY = 'lgtv_device_id_pinned'; // first-success permanent selection
  
  try {
    // 0. If we ever pinned an ID, always return it (prevents flip-flop)
    const pinned = localStorage.getItem(PINNED_KEY);
    if (pinned) {
      console.log('✅ Using PINNED device ID:', pinned);
      return pinned;
    }

    // 1. Try hardware IDs (multiple types)
    console.log('🔍 Attempting to get hardware IDs (NDUID/LGUDID/SERIAL/DID)...');
    const hardwareId = await getWebOSDeviceID();
    
    if (hardwareId) {
      console.log('✅ Using hardware ID (pinned):', hardwareId);
      localStorage.setItem(PINNED_KEY, hardwareId);
      localStorage.setItem(LGUDID_CACHE_KEY, hardwareId);
      return hardwareId;
    }
    
    // 2. Try cached hardware ID (legacy cache) if any
    const cachedLGUDID = localStorage.getItem(LGUDID_CACHE_KEY);
    if (cachedLGUDID) {
      console.log('✅ Using cached hardware ID:', cachedLGUDID);
      localStorage.setItem(PINNED_KEY, cachedLGUDID);
      return cachedLGUDID;
    }
    
    // 3. Try MAC Address - BACKUP OPTION (still hardware)
    console.log('🔍 Hardware ID unavailable, trying MAC address...');
    const { wiredMac, wifiMac } = await getWebOSMacAddresses();
    const macAddress = wiredMac || wifiMac;
    
    if (macAddress) {
      const macBasedId = simpleHash(macAddress);
      console.log('✅ Using MAC-based ID (pinned):', macBasedId, 'from MAC:', macAddress);
      localStorage.setItem(PINNED_KEY, macBasedId);
      return macBasedId;
    }
    
    // 4. FALLBACK: localStorage UUID (dev only)
    console.warn('⚠️ Using localStorage UUID (fallback)');
    let storedUUID = localStorage.getItem(STORAGE_KEY);
    
    if (!storedUUID) {
      storedUUID = generateUUID();
      localStorage.setItem(STORAGE_KEY, storedUUID);
      console.log('⚠️ Generated NEW localStorage UUID:', storedUUID);
    } else {
      console.log('⚠️ Retrieved localStorage UUID:', storedUUID);
    }
    
    localStorage.setItem(PINNED_KEY, storedUUID);
    return storedUUID;
    
  } catch (error) {
    console.error('❌ Error getting device UUID:', error.message);
    return generateUUID();
  }
};

/**
 * Format Device UUID for display
 * Adds "TV-" prefix for easy identification
 * 
 * @returns {Promise<string>} Formatted Device ID (e.g., "TV-a7b3c9d2-4f1e-8a6b")
 */
export const getFormattedDeviceId = async () => {
  const uuid = await getDeviceUUID();
  return `TV-${uuid}`;
};

/**
 * Reset Device UUID (for testing only)
 * Clears localStorage cache BUT hardware IDs remain unchanged
 * Use only in development/debugging
 * 
 * @returns {Promise<string>} Device UUID (will still return hardware ID)
 */
export const resetDeviceUUID = async () => {
  const STORAGE_KEY = 'lgtv_device_uuid';
  const LGUDID_CACHE_KEY = 'lgtv_lgudid_cache';
  const PINNED_KEY = 'lgtv_device_id_pinned';
  
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LGUDID_CACHE_KEY);
  localStorage.removeItem(PINNED_KEY);
  console.warn('⚠️ Device UUID cache cleared (hardware IDs will still be used)...');
  return await getDeviceUUID();
};

/**
 * Get device storage info for debugging
 * @returns {Promise<Object>} Device storage details
 */
export const getDeviceStorageInfo = async () => {
  try {
    const uuid = await getDeviceUUID();
    const formattedId = await getFormattedDeviceId();
    const storageAvailable = localStorage.length > 0;
    const PINNED_KEY = 'lgtv_device_id_pinned';
    
    // Get all available IDs for debugging
    const lgudid = await getWebOSDeviceID();
    const { wiredMac, wifiMac } = await getWebOSMacAddresses();
    
    return {
      uuid,
      formattedId,
      storageAvailable,
      hardwareIds: {
        lgudid: lgudid || 'Not available',
        wiredMac: wiredMac || 'Not available',
        wifiMac: wifiMac || 'Not available',
      },
      localStorage: {
        lgtv_device_uuid: localStorage.getItem('lgtv_device_uuid'),
        lgtv_lgudid_cache: localStorage.getItem('lgtv_lgudid_cache'),
        lgtv_device_id_pinned: localStorage.getItem(PINNED_KEY),
      },
      source: lgudid ? 'Hardware ID (NDUID/LGUDID/SERIAL/DID)' : (wiredMac || wifiMac) ? 'MAC Address (hardware)' : 'localStorage (fallback)'
    };
  } catch (error) {
    return {
      error: error.message,
      storageAvailable: false
    };
  }
};

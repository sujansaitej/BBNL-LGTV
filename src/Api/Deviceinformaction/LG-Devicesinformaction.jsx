import { useState, useEffect } from 'react';
import { getWebOSDeviceID, getWebOSNetworkInfo, getWebOSMacAddresses, getWebOSSystemInfo } from '../../utils/webos';
import { getFormattedDeviceId } from '../../utils/deviceStorage';

/**
 * Custom hook to fetch device information including public IP address and HARDWARE-BASED Device ID
 * 
 * CRITICAL FOR SECURITY: Device ID uses hardware-based identifiers that NEVER change:
 * 1. LGUDID (LG Unique Device ID) - Official hardware ID from Luna API
 * 2. MAC Address - Network hardware ID (backup)
 * 3. localStorage UUID - Only as last resort fallback
 * 
 * This ensures one phone number → one device subscription enforcement
 * 
 * @returns {Object} Device information object containing ipAddress, deviceId (PERMANENT), loading, and error states
 */
export const useDeviceInformation = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    publicIPv4: null,
    publicIPv6: null,
    privateIPv4: null,
    privateIPv6: null,
    deviceId: null,
    wiredMac: null,
    wifiMac: null,
    connectionType: null,
    modelName: null,
    firmwareVersion: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        setDeviceInfo(prev => ({ ...prev, loading: true, error: null }));

        // Get HARDWARE-BASED Device UUID (NEVER changes per TV)
        // Priority: LGUDID → MAC Address → localStorage fallback
        const deviceUUID = await getFormattedDeviceId();
        
        // Fetch ALL data in PARALLEL (not sequential) - MUCH FASTER
        const [deviceId, networkInfo, publicIPs, macAddresses, systemInfo] = await Promise.all([
          fetchDeviceIdWithTimeout(5000),  // 5 second timeout
          fetchNetworkInfoWithTimeout(5000),
          fetchPublicIPWithTimeout(5000),
          fetchMacAddressesWithTimeout(5000),
          fetchSystemInfoWithTimeout(5000),
        ]);

        setDeviceInfo({
          publicIPv4: publicIPs.ipv4 || 'Not available',
          publicIPv6: publicIPs.ipv6 || 'Not available',
          privateIPv4: networkInfo.ipv4 || 'Not available',
          privateIPv6: networkInfo.ipv6 || 'Not available',
          deviceId: deviceUUID, // HARDWARE-BASED - Never changes
          wiredMac: macAddresses.wiredMac || 'Not available',
          wifiMac: macAddresses.wifiMac || 'Not available',
          connectionType: networkInfo.connectionType || 'Unknown',
          modelName: systemInfo.modelName || 'Not available',
          firmwareVersion: systemInfo.firmwareVersion || 'Not available',
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('[ipaddress.jsx] Error fetching device information:', error);
        // Even on error, try to get hardware-based device ID
        const fallbackDeviceId = await getFormattedDeviceId().catch(() => 'Not available');
        setDeviceInfo({
          publicIPv4: 'Not available',
          publicIPv6: 'Not available',
          privateIPv4: 'Not available',
          privateIPv6: 'Not available',
          deviceId: fallbackDeviceId,
          wiredMac: 'Not available',
          wifiMac: 'Not available',
          connectionType: 'Unknown',
          modelName: 'Not available',
          firmwareVersion: 'Not available',
          loading: false,
          error: error.message,
        });
      }
    };

    fetchDeviceInfo();
  }, []);

  return deviceInfo;
};

/**
 * Fetch Device ID with timeout
 * Note: This is OPTIONAL extra info - the HARDWARE UUID is the primary device identifier
 * Luna LGUDID is now fetched directly in deviceStorage.js
 */
const fetchDeviceIdWithTimeout = async (timeoutMs) => {
  try {
    return await Promise.race([
      getWebOSDeviceID(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Device ID timeout')), timeoutMs)
      )
    ]);
  } catch (err) {
    console.warn('[ipaddress.jsx] Luna LGUDID unavailable (using UUID instead):', err.message);
    return null; // Fallback to UUID is already handled
  }
};

/**
 * Fetch Network Info with timeout
 */
const fetchNetworkInfoWithTimeout = async (timeoutMs) => {
  try {
    return await Promise.race([
      getWebOSNetworkInfo(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network info timeout')), timeoutMs)
      )
    ]);
  } catch (err) {
    console.error('[ipaddress.jsx] Network info fetch failed:', err.message);
    return { ipv4: null, ipv6: null, connectionType: 'Unknown' };
  }
};

/**
 * Fetch MAC Addresses with timeout
 */
const fetchMacAddressesWithTimeout = async (timeoutMs) => {
  try {
    return await Promise.race([
      getWebOSMacAddresses(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MAC address timeout')), timeoutMs)
      )
    ]);
  } catch (err) {
    console.error('[ipaddress.jsx] MAC address fetch failed:', err.message);
    return { wiredMac: null, wifiMac: null };
  }
};

/**
 * Fetch System Info (modelName, firmware) with timeout
 */
const fetchSystemInfoWithTimeout = async (timeoutMs) => {
  try {
    return await Promise.race([
      getWebOSSystemInfo(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('System info timeout')), timeoutMs))
    ]) || { modelName: null, firmwareVersion: null };
  } catch (err) {
    console.error('[ipaddress.jsx] System info fetch failed:', err.message);
    return { modelName: null, firmwareVersion: null };
  }
};

/**
 * Fetch Public IP with timeout
 */
const fetchPublicIPWithTimeout = async (timeoutMs) => {
  const result = { ipv4: null, ipv6: null };

  const fetchWithTimeout = (url, ms, parser = 'json') => {
    return Promise.race([
      fetch(url, { cache: 'no-store' }).then((r) => {
        if (!r.ok) throw new Error(`${url} status ${r.status}`);
        return parser === 'text' ? r.text() : r.json();
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${url} timeout`)), ms)),
    ]);
  };

  // Fetch IPv4 and IPv6 in parallel with timeouts
  try {
    const ipv4Promise = fetchWithTimeout('https://api.ipify.org?format=json', timeoutMs, 'json');
    const ipv6Primary = fetchWithTimeout('https://api6.ipify.org?format=json', timeoutMs, 'json');
    const ipv6Alt = fetchWithTimeout('https://ipv6.icanhazip.com', timeoutMs, 'text');

    const [ipv4Data, ipv6PrimaryData, ipv6AltData] = await Promise.allSettled([
      ipv4Promise,
      ipv6Primary,
      ipv6Alt,
    ]);

    if (ipv4Data.status === 'fulfilled' && ipv4Data.value?.ip) {
      result.ipv4 = ipv4Data.value.ip;
    }

    if (ipv6PrimaryData.status === 'fulfilled' && ipv6PrimaryData.value?.ip) {
      result.ipv6 = ipv6PrimaryData.value.ip;
    } else if (ipv6AltData.status === 'fulfilled' && ipv6AltData.value) {
      // icanhazip returns plain text with newline
      result.ipv6 = String(ipv6AltData.value).trim();
    }

    return result;
  } catch (err) {
    console.error('[ipaddress.jsx] Public IP fetch error:', err.message);
    return result;
  }
};

export default useDeviceInformation;
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
        const [, networkInfo, publicIPs, macAddresses, systemInfo] = await Promise.all([
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
 * Uses multiple fallback services to handle blocked APIs on LG TV
 */
const fetchPublicIPWithTimeout = async (timeoutMs) => {
  const result = { ipv4: null, ipv6: null };

  const fetchWithTimeout = (url, ms, parser = 'json') => {
    return Promise.race([
      fetch(url, { cache: 'no-store', mode: 'cors' }).then((r) => {
        if (!r.ok) throw new Error(`${url} status ${r.status}`);
        return parser === 'text' ? r.text() : r.json();
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${url} timeout`)), ms)),
    ]);
  };

  // IPv4 fallback chain
  const ipv4Services = [
    { url: 'https://api.ipify.org?format=json', parser: 'json', key: 'ip' },
    { url: 'https://api4.seeip.org/jsonip', parser: 'json', key: 'ip' },
    { url: 'https://ipv4.icanhazip.com', parser: 'text', key: null },
    { url: 'https://checkip.amazonaws.com', parser: 'text', key: null },
  ];

  // IPv6 fallback chain
  const ipv6Services = [
    { url: 'https://api6.ipify.org?format=json', parser: 'json', key: 'ip' },
    { url: 'https://ipv6.seeip.org/jsonip', parser: 'json', key: 'ip' },
    { url: 'https://ipv6.icanhazip.com', parser: 'text', key: null },
  ];

  // Try IPv4 services in sequence
  for (const service of ipv4Services) {
    try {
      const data = await fetchWithTimeout(service.url, Math.min(timeoutMs, 3000), service.parser);
      const ip = service.key ? data?.[service.key] : String(data).trim();
      if (ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        result.ipv4 = ip;
        break;
      }
    } catch (err) {
      console.warn(`[ipaddress.jsx] IPv4 service failed (${service.url}):`, err.message);
    }
  }

  // Try IPv6 services in sequence
  for (const service of ipv6Services) {
    try {
      const data = await fetchWithTimeout(service.url, Math.min(timeoutMs, 3000), service.parser);
      const ip = service.key ? data?.[service.key] : String(data).trim();
      if (ip && ip.includes(':')) {
        result.ipv6 = ip;
        break;
      }
    } catch (err) {
      console.warn(`[ipaddress.jsx] IPv6 service failed (${service.url}):`, err.message);
    }
  }

  return result;
};

export default useDeviceInformation;
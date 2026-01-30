import { useState, useEffect } from 'react';
import { getWebOSDeviceID, getWebOSNetworkInfo } from '../../utils/webos';
import { getFormattedDeviceId } from '../../utils/deviceStorage';

/**
 * Custom hook to fetch device information including public IP address and Device ID
 * @returns {Object} Device information object containing ipAddress, deviceId, loading, and error states
 */
export const useDeviceInformation = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    publicIPv4: null,
    publicIPv6: null,
    privateIPv4: null,
    privateIPv6: null,
    deviceId: null,
    connectionType: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        setDeviceInfo(prev => ({ ...prev, loading: true, error: null }));

        // Get unique Device UUID (static, never changes per TV)
        const deviceUUID = getFormattedDeviceId();
        
        // Fetch ALL data in PARALLEL (not sequential) - MUCH FASTER
        const [deviceId, networkInfo, publicIPs] = await Promise.all([
          fetchDeviceIdWithTimeout(5000),  // 5 second timeout
          fetchNetworkInfoWithTimeout(5000),
          fetchPublicIPWithTimeout(5000)
        ]);

        setDeviceInfo({
          publicIPv4: publicIPs.ipv4 || 'Not available',
          publicIPv6: publicIPs.ipv6 || 'Not available',
          privateIPv4: networkInfo.ipv4 || 'Not available',
          privateIPv6: networkInfo.ipv6 || 'Not available',
          deviceId: deviceUUID, // Always use the static UUID
          connectionType: networkInfo.connectionType || 'Unknown',
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('[ipaddress.jsx] Error fetching device information:', error);
        setDeviceInfo({
          publicIPv4: 'Not available',
          publicIPv6: 'Not available',
          privateIPv4: 'Not available',
          privateIPv6: 'Not available',
          deviceId: getFormattedDeviceId(), // Fallback to UUID
          connectionType: 'Unknown',
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
 * Note: This is now optional - UUID from localStorage is the primary Device ID
 * Luna Service is kept as optional extra info but not required
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
 * Fetch Public IP with timeout
 */
const fetchPublicIPWithTimeout = async (timeoutMs) => {
  const result = { ipv4: null, ipv6: null };

  // Fetch IPv4 and IPv6 in parallel with timeouts
  try {
    const ipv4Promise = Promise.race([
      fetch('https://api.ipify.org?format=json').then(r => r.json()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('IPv4 timeout')), timeoutMs))
    ]);

    const ipv6Promise = Promise.race([
      fetch('https://api6.ipify.org?format=json').then(r => r.json()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('IPv6 timeout')), timeoutMs))
    ]);

    const [ipv4Data, ipv6Data] = await Promise.allSettled([ipv4Promise, ipv6Promise]);

    if (ipv4Data.status === 'fulfilled' && ipv4Data.value?.ip) {
      result.ipv4 = ipv4Data.value.ip;
    }
    if (ipv6Data.status === 'fulfilled' && ipv6Data.value?.ip) {
      result.ipv6 = ipv6Data.value.ip;
    }

    return result;
  } catch (err) {
    console.error('[ipaddress.jsx] Public IP fetch error:', err.message);
    return result;
  }
};

export default useDeviceInformation;
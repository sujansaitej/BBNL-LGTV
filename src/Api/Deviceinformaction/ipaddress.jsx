import { useState, useEffect } from 'react';
import { getWebOSDeviceID } from '../../utils/webos';

/**
 * Custom hook to fetch device information including IP address and Device ID
 * @returns {Object} Device information object containing ipAddress, deviceId, loading, and error states
 */
export const useDeviceInformation = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    ipAddress: null,
    deviceId: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        setDeviceInfo(prev => ({ ...prev, loading: true, error: null }));

        // Fetch Device ID (LGUDID)
        let deviceId = null;
        try {
          deviceId = await getWebOSDeviceID();
        } catch (err) {
          console.warn('Failed to fetch Device ID:', err);
        }

        // Fetch IP Address using multiple methods
        let ipAddress = null;
        try {
          ipAddress = await getIPAddress();
        } catch (err) {
          console.warn('Failed to fetch IP Address:', err);
        }

        setDeviceInfo({
          ipAddress: ipAddress || 'Unable to fetch',
          deviceId: deviceId || 'Unable to fetch',
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching device information:', error);
        setDeviceInfo({
          ipAddress: 'Error',
          deviceId: 'Error',
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
 * Get local IP address using multiple methods
 * @returns {Promise<string|null>} IP address or null if failed
 */
const getIPAddress = async () => {
  // Method 1: Try WebRTC
  try {
    const ip = await getIPAddressViaWebRTC();
    if (ip) return ip;
  } catch (err) {
    console.warn('WebRTC IP fetch failed:', err);
  }

  // Method 2: Try external API as fallback
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      timeout: 5000,
    });
    const data = await response.json();
    if (data.ip) return data.ip;
  } catch (err) {
    console.warn('External API IP fetch failed:', err);
  }

  return null;
};

/**
 * Get IP address using WebRTC
 * @returns {Promise<string|null>}
 */
const getIPAddressViaWebRTC = () => {
  return new Promise((resolve, reject) => {
    const rtc = new RTCPeerConnection({ iceServers: [] });
    
    rtc.createDataChannel('');
    
    rtc.onicecandidate = (event) => {
      if (!event || !event.candidate) {
        rtc.close();
        return;
      }
      
      const candidate = event.candidate.candidate;
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
      const ipMatch = candidate.match(ipRegex);
      
      if (ipMatch && ipMatch[1]) {
        resolve(ipMatch[1]);
        rtc.close();
      }
    };
    
    rtc.createOffer()
      .then(offer => rtc.setLocalDescription(offer))
      .catch(reject);
    
    // Timeout after 3 seconds
    setTimeout(() => {
      rtc.close();
      reject(new Error('WebRTC timeout'));
    }, 3000);
  });
};

export default useDeviceInformation;
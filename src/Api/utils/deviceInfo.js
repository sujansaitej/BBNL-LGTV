// Helper functions to fetch device/network identifiers on webOS; fall back gracefully elsewhere.
export const isWebOS = () => {
  if (typeof window === "undefined") return false;
  return !!(window.webOS || window.PalmSystem);
};

const safeResolve = (resolver) => {
  try {
    return resolver();
  } catch (err) {
    return undefined;
  }
};

const requestWebOS = (service, method, parameters = {}) => {
  return new Promise((resolve) => {
    if (!isWebOS()) {
      resolve(null);
      return;
    }

    const webOS = window.webOS;
    if (!webOS?.service?.request) {
      resolve(null);
      return;
    }

    webOS.service.request(service, {
      method,
      parameters,
      onSuccess: (res) => resolve(res || null),
      onFailure: () => resolve(null),
    });
  });
};

const parseNetworkStatus = (res) => {
  if (!res) return { ipAddress: null, macAddress: null, networkType: null };

  const wired = safeResolve(() => res.wired) || {};
  const wifi = safeResolve(() => res.wifi) || {};

  const ipAddress =
    res.ipAddress ||
    wired.ipAddress ||
    wifi.ipAddress ||
    safeResolve(() => wifi.ip || wifi.ipv4 || wifi.ipAddress) ||
    null;

  const macAddress =
    wired.macAddress ||
    wifi.macAddress ||
    safeResolve(() => wifi.wifiAddress) ||
    res.macAddress ||
    null;

  return {
    ipAddress,
    macAddress,
    networkType: res.type || res.networkType || null,
  };
};

const parseSystemInfo = (res) => {
  if (!res) return { modelName: null, firmwareVersion: null, serialNumber: null };
  return {
    modelName: res.modelName || res.model || null,
    firmwareVersion: res.firmwareVersion || res.swVersion || null,
    serialNumber: res.serialNumber || null,
  };
};

// Public helper to gather network + device identifiers.
export const fetchDeviceInfo = async () => {
  if (!isWebOS()) {
    return {
      isWebOS: false,
      networkType: null,
      ipAddress: null,
      macAddress: null,
      modelName: null,
      firmwareVersion: null,
      serialNumber: null,
      deviceId: null,
      source: "browser",
    };
  }

  // 1) Network info
  const netRaw = await requestWebOS(
    "luna://com.palm.connectionmanager",
    "getStatus",
    { subscribe: false }
  );
  const net = parseNetworkStatus(netRaw);

  // 2) System info
  const sysRaw = await requestWebOS(
    "luna://com.webos.service.tv.systemproperty",
    "getSystemInfo",
    { keys: ["modelName", "firmwareVersion", "serialNumber"] }
  );
  const sys = parseSystemInfo(sysRaw);

  // 3) Device unique ID
  const devIdRaw = await requestWebOS(
    "luna://com.webos.service.sm",
    "getDeviceId",
    {}
  );
  const deviceId = devIdRaw?.id || devIdRaw?.deviceId || null;

  return {
    isWebOS: true,
    ...net,
    ...sys,
    deviceId,
    source: "webos",
  };
};

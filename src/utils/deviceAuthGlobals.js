/**
 * deviceAuthGlobals.js — DevTools console hook for manual device-auth triggers.
 *
 * Side-effect import: installs `window.__BBNL_DEVICE_AUTH__` exposing the
 * BBNL `/getdeviceid` and `/devAuth` helpers plus key-management utilities.
 * No automatic API calls happen here — the developer / QA invokes them
 * explicitly from the Chrome DevTools console (when running via
 * `ares-inspect --device tv com.lg.bbnl`).
 *
 * Usage examples (DevTools):
 *   window.__BBNL_DEVICE_AUTH__.exportPublicKeyBase64()
 *     .then(pk => console.log("pub:", pk));
 *
 *   window.__BBNL_DEVICE_AUTH__.registerDevicePubkey({
 *     userid: "...", mobile: "...", serialno: "...", mac_address: "..."
 *   }).then(console.log);
 *
 *   window.__BBNL_DEVICE_AUTH__.verifyDeviceSignature({
 *     userid: "...", mobile: "...", devid: "...", mac_address: "...",
 *     // optional payload — defaults to `${userid}|${devid}|${Date.now()}`
 *     payload: "server-issued-nonce-here",
 *   }).then(console.log);
 *
 *   window.__BBNL_DEVICE_AUTH__.resetDeviceKeypair();   // testing only
 *
 * The helpers themselves are imported lazily so the crypto + axios code does
 * NOT load until first DevTools call. This file is itself imported lazily
 * from `webos.js → initializeWebOSEnvironment()`.
 */

const installDeviceAuthHook = () => {
  if (typeof window === "undefined") return;
  if (window.__BBNL_DEVICE_AUTH__ && typeof window.__BBNL_DEVICE_AUTH__ === "object") {
    return; // already installed
  }

  // Lazy importers: each returns a thenable that resolves to the actual fn.
  // We avoid pulling the module graph at install time so a developer who
  // never invokes the hook pays zero crypto cost.
  const lazyApi = () => import("../server/OAuthentication-Api/DeviceAuthApi.jsx");
  const lazyCrypto = () => import("./deviceCrypto.js");

  window.__BBNL_DEVICE_AUTH__ = {
    registerDevicePubkey: async (args) => {
      try {
        const mod = await lazyApi();
        return mod.registerDevicePubkey(args);
      } catch (err) {
        return {
          success: false,
          devid: null,
          message: err?.message || "registerDevicePubkey load failed",
          data: null,
        };
      }
    },
    verifyDeviceSignature: async (args) => {
      try {
        const mod = await lazyApi();
        return mod.verifyDeviceSignature(args);
      } catch (err) {
        return {
          success: false,
          message: err?.message || "verifyDeviceSignature load failed",
          signedPayload: "",
          signature: null,
          data: null,
        };
      }
    },
    exportPublicKeyBase64: async () => {
      const mod = await lazyCrypto();
      return mod.exportPublicKeyBase64();
    },
    resetDeviceKeypair: async () => {
      const mod = await lazyCrypto();
      return mod.resetDeviceKeypair();
    },
  };
};

installDeviceAuthHook();

export default installDeviceAuthHook;

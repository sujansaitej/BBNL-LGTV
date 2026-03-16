/**
 * webOSTV.js  — Local bundle for LG webOS TV
 *
 * Priority order:
 * 1. Native webOS with service.request  → use as-is (real TV, modern webOS)
 * 2. Native webOS WITHOUT service       → add PalmServiceBridge shim (older webOS)
 * 3. No webOS but PalmServiceBridge     → build webOS from bridge (very old webOS)
 * 4. Nothing available                  → browser dev stub (ares-inspect / PC browser)
 */
(function () {
  'use strict';

  /* ── 1. Full native webOS already available ────────────────────────────── */
  if (window.webOS && window.webOS.service && typeof window.webOS.service.request === 'function') {
    console.log('[webOSTV] Native webOS.service detected — using OS APIs');
    return;
  }

  /* ── PalmServiceBridge request factory ─────────────────────────────────── */
  function makePalmRequest(uri, options) {
    options = options || {};
    var bridge = new window.PalmServiceBridge();
    var method = options.method || '';
    var params = options.parameters || {};
    var payload = typeof params === 'string' ? params : JSON.stringify(params);

    bridge.onservicecallback = function (msg) {
      try {
        var res = typeof msg === 'string' ? JSON.parse(msg) : msg;
        if (res && res.returnValue === false) {
          options.onFailure && options.onFailure(res);
        } else {
          options.onSuccess && options.onSuccess(res || {});
        }
      } catch (e) {
        options.onFailure && options.onFailure({ errorText: e.message });
      }
    };

    try {
      bridge.call(uri + '/' + method, payload);
    } catch (e) {
      console.warn('[webOSTV] PalmServiceBridge.call failed:', e.message);
      options.onFailure && options.onFailure({ errorText: e.message });
    }

    return { cancel: function () {} };
  }

  /* ── 2. Native webOS exists but no service → add shim ──────────────────── */
  if (window.webOS) {
    if (typeof window.PalmServiceBridge === 'function') {
      window.webOS.service = { request: makePalmRequest };
      console.log('[webOSTV] PalmServiceBridge shim added to native webOS');
    } else {
      /* Native webOS without service and no bridge — add no-op to prevent errors */
      window.webOS.service = {
        request: function (uri, options) {
          console.warn('[webOSTV] Luna not available:', uri);
          setTimeout(function () {
            options && options.onFailure && options.onFailure({ errorCode: -1, errorText: 'Luna service not available' });
          }, 0);
          return { cancel: function () {} };
        }
      };
      console.warn('[webOSTV] No PalmServiceBridge — Luna calls will fail');
    }
    return;
  }

  /* ── 3. No webOS object but PalmServiceBridge exists ───────────────────── */
  if (typeof window.PalmServiceBridge === 'function') {
    window.webOS = {
      platformBack: function () { window.history.length > 1 ? window.history.back() : undefined; },
      deviceInfo: function (cb) { cb && cb({ modelName: 'LG TV', version: '0.0.0', sdkVersion: '0.0.0' }); },
      service: { request: makePalmRequest }
    };
    console.log('[webOSTV] Built webOS from PalmServiceBridge');
    return;
  }

  /* ── 4. Browser / ares-inspect dev stub ────────────────────────────────── */
  console.warn('[webOSTV] webOS not detected — loading browser stub (dev/inspect mode)');
  window.webOS = {
    platformBack: function () {
      if (window.history && window.history.length > 1) window.history.back();
    },
    deviceInfo: function (cb) {
      cb && cb({ modelName: 'Browser Dev', version: '0.0.0', sdkVersion: '0.0.0' });
    },
    service: {
      request: function (uri, options) {
        var method = options && options.method ? options.method : '';
        console.warn('[webOS stub] service.request →', uri + '/' + method);
        var handle = { cancelled: false, cancel: function () { this.cancelled = true; } };
        setTimeout(function () {
          if (!handle.cancelled && options && typeof options.onFailure === 'function') {
            options.onFailure({ errorCode: -1, errorText: 'webOS service not available (browser stub)' });
          }
        }, 0);
        return handle;
      }
    }
  };
})();

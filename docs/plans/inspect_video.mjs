// One-shot inspection of the running <video> element on the TV.
// Dumps every platform-specific property/attribute we might be able to use to
// force aspect-fill on the LG hardware video plane.
// Usage:  node inspect_video.mjs <wsUrl>

import WebSocket from "ws";

const WS_URL = process.argv[2];
if (!WS_URL) { console.error("usage: node inspect_video.mjs <wsUrl>"); process.exit(1); }

const ws = new WebSocket(WS_URL);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const reqId = ++id;
    pending.set(reqId, resolve);
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });

ws.on("message", (raw) => {
  let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
});

ws.on("open", async () => {
  await send("Runtime.enable");

  const expr = `
    (() => {
      const v = document.querySelector('video');
      if (!v) return { found: false };

      const out = {
        attrs: {},
        platformProps: {},
        webOSGlobals: {},
        ancestors: [],
      };

      // All HTML attributes on the video element
      for (const a of v.attributes) out.attrs[a.name] = a.value;

      // Probe known LG/webOS property names directly on the element
      const probes = [
        'mediaOption','setMediaOption','getMediaOption',
        'apertureMode','aspectRatio','aspectMode','displayMode',
        'webOSDOMVideoElementMediaOption','__videoSink__','__media__',
        'fullscreenMode','presentationMode','videoTracks','audioTracks',
        'webkitDisplayingFullscreen','webkitDecodedFrameCount',
      ];
      for (const k of probes) {
        if (k in v) {
          try { out.platformProps[k] = String(v[k]).slice(0, 200); }
          catch (e) { out.platformProps[k] = '[err: ' + e.message + ']'; }
        }
      }

      // webOS-related globals
      const globals = ['webOS','webOSDev','webOSSystem','PalmServiceBridge','luna'];
      for (const g of globals) {
        if (g in window) out.webOSGlobals[g] = typeof window[g];
      }
      if (window.webOS && window.webOS.platform) {
        out.webOSGlobals.platformInfo = JSON.stringify(window.webOS.platform);
      }
      if (window.webOS && window.webOS.deviceInfo) {
        try {
          out.webOSGlobals.deviceInfo = '(callable)';
        } catch (_) {}
      }

      // Parent chain — anything CSS-significant
      let n = v.parentElement;
      while (n && n !== document.body) {
        const cs = getComputedStyle(n);
        out.ancestors.push({
          tag: n.tagName,
          width: cs.width, height: cs.height,
          transform: cs.transform,
          objectFit: cs.objectFit || '(n/a)',
          overflow: cs.overflow,
          position: cs.position,
        });
        n = n.parentElement;
      }

      // Enumerate ALL own property descriptors on HTMLVideoElement.prototype
      // chain to see if there are LG-specific extensions
      const nonStandard = [];
      let proto = Object.getPrototypeOf(v);
      while (proto && proto !== Object.prototype) {
        for (const k of Object.getOwnPropertyNames(proto)) {
          // Skip well-known HTMLVideoElement / HTMLMediaElement props
          if (/^(addEventListener|removeEventListener|dispatchEvent|play|pause|load|src|currentTime|duration|videoWidth|videoHeight|paused|ended|muted|volume|playbackRate|defaultPlaybackRate|seeking|seekable|buffered|played|error|networkState|readyState|crossOrigin|preload|poster|controls|autoplay|loop|defaultMuted|controller|mediaGroup|disableRemotePlayback|sinkId|setSinkId|preservesPitch|textTracks|audioTracks|videoTracks|requestVideoFrameCallback|cancelVideoFrameCallback|getVideoPlaybackQuality|requestPictureInPicture|disablePictureInPicture|webkitEnterFullScreen|webkitExitFullScreen|webkitSupportsFullscreen|webkitDisplayingFullscreen|webkitPresentationMode|webkitDecodedFrameCount|webkitDroppedFrameCount|onencrypted|mediaKeys|setMediaKeys|onwaitingforkey|captureStream|mozCaptureStream|webkitCaptureStream|currentSrc|srcObject)$/.test(k)) continue;
          nonStandard.push(proto.constructor.name + '#' + k);
        }
        proto = Object.getPrototypeOf(proto);
      }
      out.nonStandardProps = nonStandard.slice(0, 30);

      return out;
    })()
  `;

  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  console.log(JSON.stringify(r.result?.value, null, 2));
  ws.close();
  process.exit(0);
});

ws.on("error", (e) => { console.error("ws error:", e.message); process.exit(2); });

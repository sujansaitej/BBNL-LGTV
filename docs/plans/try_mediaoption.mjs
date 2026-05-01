// Live experimentation: set the LG-specific HTMLMediaElement.mediaOption on
// the running <video> element and call updateSrc() to apply. Tries one config
// per invocation so the user can report which (if any) made the picture
// visibly stretch.
// Usage:  node try_mediaoption.mjs <wsUrl> <variant>
//   variants: 1..N (see VARIANTS below) or "show" to dump current mediaOption

import WebSocket from "ws";

const WS_URL = process.argv[2];
const VARIANT = process.argv[3] || "show";
if (!WS_URL) { console.error("usage: node try_mediaoption.mjs <wsUrl> <variant|show>"); process.exit(1); }

// Documented + speculative formats for LG webOS adaptive aspect control.
// We'll cycle through these one at a time to find what the device honors.
const VARIANTS = {
  "1": { option: { adaptiveStreaming: { apertureModeOption: 2 } } },
  "2": { option: { adaptiveStreaming: { apertureModeOption: 4 } } },
  "3": { option: { adaptiveStreaming: { apertureModeOption: 1 } } },
  "4": { option: { adaptiveStreaming: { apertureModeOption: 3 } } },
  "5": { option: { aspectRatio: { aperture: "stretch" } } },
  "6": { option: { aspectRatio: { aperture: "fill" } } },
  "7": { option: { videoOption: { aspectRatioMode: "stretch" } } },
  "8": { option: { transmission: { playMode: "PLAY_MODE_LIVE" }, adaptiveStreaming: { apertureModeOption: 2 } } },
  "9": { aspectRatio: "16:9" },
  "10": { apertureMode: 2 },
  "clear": "",
};

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

const evalJs = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  return r.result?.value;
};

ws.on("open", async () => {
  await send("Runtime.enable");

  if (VARIANT === "show") {
    const cur = await evalJs(`(() => { const v = document.querySelector('video'); return { mediaOption: v?.mediaOption, mediaId: v?.mediaId, hasUpdateSrc: typeof v?.updateSrc, src: v?.src?.slice(0, 80) }; })()`);
    console.log("Current state:", JSON.stringify(cur, null, 2));
    ws.close(); process.exit(0);
  }

  const cfg = VARIANTS[VARIANT];
  if (cfg === undefined) {
    console.error("Unknown variant. Available:", Object.keys(VARIANTS).join(", "));
    ws.close(); process.exit(1);
  }
  const json = typeof cfg === "string" ? cfg : JSON.stringify(cfg);
  console.log(`\n>> Variant ${VARIANT}: setting mediaOption = ${json || '(empty)'}\n`);

  const expr = `
    (() => {
      const v = document.querySelector('video');
      if (!v) return { ok: false, why: 'no video' };
      const before = { mediaOption: v.mediaOption, currentTime: v.currentTime, paused: v.paused };
      v.mediaOption = ${JSON.stringify(json)};
      // Also try as HTML attribute since some firmwares only honor it via attribute
      v.setAttribute('mediaOption', ${JSON.stringify(json)});
      let updateOk = 'skipped (was reloading the app)';
      const after = {
        mediaOption: v.mediaOption,
        styleTransform: v.style.transform,
        styleObjectFit: v.style.objectFit,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
      };
      return { ok: true, before, after, updateOk };
    })()
  `;
  const result = await evalJs(expr);
  console.log("Result:", JSON.stringify(result, null, 2));
  console.log("\n>> Now look at the TV. Did the picture stretch to fill 16:9 (no pillar bars)?");
  ws.close(); process.exit(0);
});

ws.on("error", (e) => { console.error("ws error:", e.message); process.exit(2); });

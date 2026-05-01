// Focused capture of [Stretch:*] diagnostic logs from the running app on TV.
// Connects to the CDP websocket exposed by ares-inspect and dumps:
//   - all console events that mention "[Stretch:"
//   - the live <video> element state at start and end (videoWidth/Height,
//     getBoundingClientRect, inline transform), so we can see whether the
//     CSS transform is landing on the element on the device.
// Usage:  node stretch_capture.mjs <wsUrl> [seconds]

import WebSocket from "ws";

const WS_URL = process.argv[2];
const SECONDS = Number(process.argv[3] || 30);
if (!WS_URL) { console.error("usage: node stretch_capture.mjs <wsUrl> [seconds]"); process.exit(1); }

const ws = new WebSocket(WS_URL);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const reqId = ++id;
    pending.set(reqId, { resolve, reject });
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });

const consoleLines = [];
const stretchLines = [];

const unfurl = async (objectId) => {
  try {
    const r = await send("Runtime.getProperties", { objectId, ownProperties: true });
    const out = {};
    for (const p of (r.result || [])) {
      if (!p.value) continue;
      if (p.value.value !== undefined) out[p.name] = p.value.value;
      else if (p.value.description) out[p.name] = p.value.description;
    }
    return out;
  } catch { return "[unfurl failed]"; }
};

ws.on("message", async (raw) => {
  let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id).resolve(msg.result); pending.delete(msg.id); return; }

  if (msg.method === "Runtime.consoleAPICalled") {
    const args = msg.params.args || [];
    const argStrs = [];
    for (const a of args) {
      if (a.value !== undefined) argStrs.push(String(a.value));
      else if (a.type === "object" && a.objectId) {
        const obj = await unfurl(a.objectId);
        argStrs.push(JSON.stringify(obj));
      } else if (a.description) argStrs.push(a.description);
    }
    const line = argStrs.join(" ");
    consoleLines.push(`[${msg.params.type}] ${line}`);
    if (line.includes("[Stretch:") || line.includes("[panelResolution]") || line.includes("[HLSPlayer")) {
      stretchLines.push(line);
      console.log(line);
    }
  }
});

const snapshotVideo = async (label) => {
  const expr = `
    (() => {
      const v = document.querySelector('video');
      if (!v) return { found: false };
      const r = v.getBoundingClientRect();
      const cs = window.getComputedStyle(v);
      return {
        found: true,
        intrinsic: v.videoWidth + 'x' + v.videoHeight,
        renderedRect: Math.round(r.width) + 'x' + Math.round(r.height) + ' @ (' + Math.round(r.x) + ',' + Math.round(r.y) + ')',
        styleWidth: v.style.width || '(unset)',
        styleHeight: v.style.height || '(unset)',
        styleTransform: v.style.transform || '(unset)',
        styleObjectFit: v.style.objectFit || '(unset)',
        computedTransform: cs.transform,
        computedObjectFit: cs.objectFit,
        readyState: v.readyState,
        paused: v.paused,
        currentSrc: (v.currentSrc || '').slice(0, 100),
      };
    })()
  `;
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  console.log(`\n=== VIDEO STATE @ ${label} ===`);
  console.log(JSON.stringify(r.result?.value, null, 2));
};

const snapshotPanel = async () => {
  const expr = `
    (() => ({
      screen: window.screen.width + 'x' + window.screen.height,
      window: window.innerWidth + 'x' + window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      hash: location.hash,
    }))()
  `;
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  console.log("\n=== ENV ===");
  console.log(JSON.stringify(r.result?.value, null, 2));
};

ws.on("open", async () => {
  await send("Runtime.enable");
  console.log(`[capture] connected, capturing for ${SECONDS}s...\n`);
  await snapshotPanel();
  await snapshotVideo("START");
  console.log("\n=== LIVE STRETCH/PANEL/HLS LOG LINES ===");

  setTimeout(async () => {
    await snapshotVideo("END");
    console.log(`\n=== ALL CAPTURED LINES (${consoleLines.length}) ===`);
    for (const l of consoleLines.slice(-60)) console.log(l);
    console.log(`\n=== STRETCH/PANEL LINES (${stretchLines.length}) ===`);
    for (const l of stretchLines) console.log(l);
    ws.close();
    process.exit(0);
  }, SECONDS * 1000);
});

ws.on("error", (e) => { console.error("ws error:", e.message); process.exit(2); });

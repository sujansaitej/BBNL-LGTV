// Capture a screenshot of the currently running webOS app via CDP and save
// it next to this script. Single-shot, no logging.
// Usage:  node screenshot.mjs <wsUrl> <outFile>

import WebSocket from "ws";
import fs from "node:fs";

const WS_URL = process.argv[2];
const OUT = process.argv[3] || "screenshot.png";
if (!WS_URL) { console.error("usage: node screenshot.mjs <wsUrl> [out.png]"); process.exit(1); }

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
  await send("Page.enable");
  const r = await send("Page.captureScreenshot", { format: "png" });
  if (r && r.data) {
    fs.writeFileSync(OUT, Buffer.from(r.data, "base64"));
    console.log(`Saved ${OUT} (${fs.statSync(OUT).size} bytes)`);
  } else {
    console.error("No screenshot data returned");
  }
  ws.close();
  process.exit(0);
});

ws.on("error", (e) => { console.error("ws error:", e.message); process.exit(2); });

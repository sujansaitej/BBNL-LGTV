// Comprehensive live diagnostic against the running BBNL IPTV app.
// v3 (audit): captures EVERYTHING needed to find all root causes
//   - state snapshot at start + end (video element, hls instance, location)
//   - all console events (not just hls)
//   - all network requests (HLS, API calls, anything)
//   - runtime exceptions / unhandled rejections
//   - JS heap timeline
// Designed for a single 60s pass; output is verbose by design.

import WebSocket from "ws";

const WS_URL = process.argv[2];
const SECONDS = Number(process.argv[3] || 60);
if (!WS_URL) { console.error("usage: node stream_audit.mjs <wsUrl> [seconds]"); process.exit(1); }

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
const exceptions = [];
const allRequests = []; // every URL touched
const apiRequests = []; // /netmon/cabletvapis/*, /chnl_data, /stream, /trpdata, etc.
const hlsRequests = []; // .m3u8 / .ts / .key
const failedRequests = [];
const heapSamples = [];
const inflight = new Map();

const unfurl = async (objectId) => {
  const r = await send("Runtime.getProperties", { objectId, ownProperties: true, generatePreview: false });
  const out = {};
  for (const p of (r.result || [])) {
    if (!p.value) continue;
    if (p.value.type === "object" && p.value.objectId) {
      try {
        const inner = await send("Runtime.getProperties", { objectId: p.value.objectId, ownProperties: true });
        const innerOut = {};
        for (const ip of (inner.result || [])) {
          if (ip.value && ip.value.value !== undefined) innerOut[ip.name] = ip.value.value;
          else if (ip.value && ip.value.description) innerOut[ip.name] = ip.value.description;
        }
        out[p.name] = innerOut;
      } catch { out[p.name] = "[unfurl failed]"; }
    } else if (p.value.value !== undefined) out[p.name] = p.value.value;
    else if (p.value.description) out[p.name] = p.value.description;
  }
  return out;
};

ws.on("message", async (raw) => {
  let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id).resolve(msg.result); pending.delete(msg.id); return; }

  if (msg.method === "Runtime.consoleAPICalled") {
    const t = new Date(msg.params.timestamp).toISOString().slice(11, 23);
    const args = msg.params.args || [];
    const argStrs = [];
    for (const a of args) {
      if (a.value !== undefined) argStrs.push(String(a.value));
      else if (a.type === "object" && a.objectId) {
        try { const obj = await unfurl(a.objectId); argStrs.push(JSON.stringify(obj)); }
        catch { argStrs.push("[obj]"); }
      } else if (a.description) argStrs.push(a.description);
    }
    consoleLines.push(`${t} [${msg.params.type}] ${argStrs.join(" ").slice(0, 600)}`);
    return;
  }

  if (msg.method === "Runtime.exceptionThrown") {
    const e = msg.params.exceptionDetails;
    exceptions.push(`${e.text || ""} | ${e.exception?.description?.slice(0, 300) || ""} | ${e.url || ""}:${e.lineNumber}`);
    return;
  }

  if (msg.method === "Network.requestWillBeSent") {
    const url = msg.params.request?.url || "";
    if (!url) return;
    inflight.set(msg.params.requestId, { url, started: Date.now(), method: msg.params.request?.method });
    return;
  }
  if (msg.method === "Network.responseReceived") {
    const cur = inflight.get(msg.params.requestId); if (!cur) return;
    cur.status = msg.params.response?.status;
    cur.fromCache = !!msg.params.response?.fromDiskCache || !!msg.params.response?.fromServiceWorker;
    cur.timing = msg.params.response?.timing;
    return;
  }
  if (msg.method === "Network.loadingFinished") {
    const cur = inflight.get(msg.params.requestId); if (!cur) return;
    const dt = Date.now() - cur.started;
    const rec = { url: cur.url, ms: dt, status: cur.status, method: cur.method };
    allRequests.push(rec);
    if (/\.(m3u8|ts|key|m4s|mp4)(\?|$)/i.test(cur.url)) hlsRequests.push(rec);
    else if (/cabletvapis|netmon|bbnl/i.test(cur.url) && !/livestream/.test(cur.url)) apiRequests.push(rec);
    if (cur.status >= 400) failedRequests.push(`HTTP ${cur.status} ${cur.method} ${cur.url} (${dt}ms)`);
    inflight.delete(msg.params.requestId);
    return;
  }
  if (msg.method === "Network.loadingFailed") {
    const cur = inflight.get(msg.params.requestId); if (!cur) return;
    failedRequests.push(`FAIL ${msg.params.errorText} ${cur.method} ${cur.url}`);
    inflight.delete(msg.params.requestId);
    return;
  }
});

const snapshotState = async (label) => {
  const expr = `
    (() => {
      const v = document.querySelector('video');
      const buffered = [];
      try {
        if (v && v.buffered) {
          for (let i = 0; i < v.buffered.length; i++) {
            buffered.push([v.buffered.start(i), v.buffered.end(i)]);
          }
        }
      } catch (_) {}
      return {
        href: location.href,
        hash: location.hash,
        readyState: v ? v.readyState : -1,
        networkState: v ? v.networkState : -1,
        paused: v ? v.paused : null,
        ended: v ? v.ended : null,
        currentTime: v ? v.currentTime : null,
        duration: v ? v.duration : null,
        videoWidth: v ? v.videoWidth : null,
        videoHeight: v ? v.videoHeight : null,
        srcAttr: v ? v.getAttribute('src') : null,
        srcProp: v ? v.src : null,
        buffered,
        bufferedAhead: v && v.buffered && v.buffered.length
          ? Math.max(0, v.buffered.end(v.buffered.length - 1) - v.currentTime).toFixed(1)
          : null,
        spinnerVisible: !!document.querySelector('div[style*="rotate"]'),
        modalVisible: !!document.querySelector('.focusable-error-ok'),
        // hls.js internals — only available if window-attached (it isn't, but try)
        hlsAttached: !!(window.Hls && window.__hls),
        bodyTextSnippet: (document.body && document.body.innerText || '').slice(0, 200),
      };
    })()
  `;
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  console.log(`\n=== STATE SNAPSHOT: ${label} ===`);
  console.log(JSON.stringify(r.result?.value, null, 2));
};

ws.on("open", async () => {
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Performance.enable");
  await send("Log.enable");
  console.log(`[audit] connected, capturing for ${SECONDS}s...`);
  await snapshotState("AT START");
  const startedAt = Date.now();

  const interval = setInterval(async () => {
    try {
      const r = await send("Performance.getMetrics");
      const m = Object.fromEntries((r.metrics || []).map((x) => [x.name, x.value]));
      heapSamples.push({
        t: Math.round((Date.now() - startedAt) / 1000),
        heap: ((m.JSHeapUsedSize || 0) / 1048576).toFixed(1),
        nodes: m.Nodes || 0,
      });
    } catch {}
  }, 3000);

  setTimeout(async () => {
    clearInterval(interval);
    await snapshotState("AT END");

    console.log(`\n=== EXCEPTIONS (${exceptions.length}) ===`);
    for (const e of exceptions) console.log(e);

    console.log(`\n=== CONSOLE LOG (last 80 of ${consoleLines.length}) ===`);
    for (const l of consoleLines.slice(-80)) console.log(l);

    console.log(`\n=== API REQUESTS (${apiRequests.length}) ===`);
    for (const r of apiRequests) console.log(`${r.status} ${r.method} ${r.url.slice(-90)} (${r.ms}ms)`);

    console.log(`\n=== HLS REQUESTS (${hlsRequests.length}) ===`);
    if (hlsRequests.length) {
      const sorted = [...hlsRequests.map((r) => r.ms)].sort((a, b) => a - b);
      const pct = (p) => sorted[Math.floor((sorted.length - 1) * p)];
      console.log(`  timing: min=${sorted[0]}  p50=${pct(0.5)}  p90=${pct(0.9)}  max=${sorted[sorted.length-1]}`);
      const fails = hlsRequests.filter((r) => r.status >= 400);
      console.log(`  status counts: 200=${hlsRequests.filter(r=>r.status===200).length}  404=${hlsRequests.filter(r=>r.status===404).length}  5xx=${hlsRequests.filter(r=>r.status>=500).length}  fail=${hlsRequests.filter(r=>!r.status).length}`);
      for (const r of hlsRequests.slice(-30)) {
        console.log(`  ${r.status||'-'}  ${r.ms}ms  ${r.url.slice(-90)}`);
      }
    }

    console.log(`\n=== FAILED REQUESTS (${failedRequests.length}) ===`);
    for (const f of failedRequests) console.log(f);

    console.log(`\n=== HEAP TIMELINE ===`);
    for (const s of heapSamples) console.log(`+${String(s.t).padStart(2)}s  heap=${s.heap}MB  nodes=${s.nodes}`);

    console.log(`\n=== SUMMARY ===`);
    console.log(`  capture: ${SECONDS}s`);
    console.log(`  console events: ${consoleLines.length}, exceptions: ${exceptions.length}`);
    console.log(`  network: total=${allRequests.length}, hls=${hlsRequests.length}, api=${apiRequests.length}, failed=${failedRequests.length}`);

    ws.close();
    process.exit(0);
  }, SECONDS * 1000);
});

ws.on("error", (e) => { console.error("ws error:", e.message); process.exit(2); });

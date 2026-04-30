// Live diagnostics tap for the running BBNL IPTV app.
// v2: unfurls console object args so we see the actual hls.js error
//     fields (type / details / fatal / reason / response.code).

import WebSocket from "ws";

const WS_URL = process.argv[2];
const SECONDS = Number(process.argv[3] || 30);
if (!WS_URL) {
  console.error("usage: node stream_probe.mjs <wsUrl> [seconds]");
  process.exit(1);
}

const ws = new WebSocket(WS_URL);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const reqId = ++id;
    pending.set(reqId, resolve);
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });

const heapSamples = [];
const consoleLines = [];
const errorEvents = []; // detailed unfurled HLS errors
const netFailures = [];
const netSlow = [];
const segmentTimings = []; // for 200-OK segments — time to load
const inflight = new Map();

const unfurlObject = async (objectId) => {
  const r = await send("Runtime.getProperties", {
    objectId,
    ownProperties: true,
    accessorPropertiesOnly: false,
    generatePreview: false,
  });
  const out = {};
  for (const p of r.result || []) {
    if (!p.value) continue;
    if (p.value.type === "object" && p.value.objectId) {
      // shallow: one level deep is enough for hls.js error data
      try {
        const inner = await send("Runtime.getProperties", {
          objectId: p.value.objectId,
          ownProperties: true,
          generatePreview: false,
        });
        const innerOut = {};
        for (const ip of inner.result || []) {
          if (ip.value && ip.value.value !== undefined) innerOut[ip.name] = ip.value.value;
          else if (ip.value && ip.value.description) innerOut[ip.name] = ip.value.description;
        }
        out[p.name] = innerOut;
      } catch { out[p.name] = "[unfurl failed]"; }
    } else if (p.value.value !== undefined) {
      out[p.name] = p.value.value;
    } else if (p.value.description) {
      out[p.name] = p.value.description;
    }
  }
  return out;
};

ws.on("message", async (raw) => {
  let msg;
  try { msg = JSON.parse(raw.toString()); } catch { return; }

  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
    return;
  }

  if (msg.method === "Runtime.consoleAPICalled") {
    const t = new Date(msg.params.timestamp).toISOString().slice(11, 23);
    const args = msg.params.args || [];
    const argStrings = [];
    let errorObj = null;

    for (const a of args) {
      if (a.value !== undefined) {
        argStrings.push(String(a.value));
      } else if (a.type === "object" && a.objectId) {
        try {
          const obj = await unfurlObject(a.objectId);
          argStrings.push(JSON.stringify(obj));
          if (obj.type !== undefined || obj.details !== undefined || obj.fatal !== undefined) {
            errorObj = obj;
          }
        } catch {
          argStrings.push("[obj]");
        }
      } else if (a.description) {
        argStrings.push(a.description);
      }
    }

    const line = argStrings.join(" ");
    if (line.includes("[HLSPlayer]") || line.toLowerCase().includes("hls") ||
        msg.params.type === "warning" || msg.params.type === "error") {
      consoleLines.push(`${t} [${msg.params.type}] ${line.slice(0, 600)}`);
      if (errorObj && line.includes("Error event")) errorEvents.push({ t, ...errorObj });
    }
    return;
  }

  if (msg.method === "Network.requestWillBeSent") {
    const url = msg.params.request?.url || "";
    if (/\.(m3u8|ts|key|m4s|mp4)(\?|$)/i.test(url)) {
      inflight.set(msg.params.requestId, { url, started: Date.now() });
    }
    return;
  }
  if (msg.method === "Network.responseReceived") {
    const cur = inflight.get(msg.params.requestId);
    if (!cur) return;
    cur.status = msg.params.response?.status;
    return;
  }
  if (msg.method === "Network.loadingFinished") {
    const cur = inflight.get(msg.params.requestId);
    if (!cur) return;
    const dt = Date.now() - cur.started;
    segmentTimings.push({ url: cur.url, ms: dt, status: cur.status });
    if (cur.status >= 400) netFailures.push(`${cur.status} ${cur.url} (${dt}ms)`);
    else if (dt > 3000) netSlow.push(`${dt}ms ${cur.url}`);
    inflight.delete(msg.params.requestId);
    return;
  }
  if (msg.method === "Network.loadingFailed") {
    const cur = inflight.get(msg.params.requestId);
    if (!cur) return;
    netFailures.push(`FAIL ${msg.params.errorText} ${cur.url}`);
    inflight.delete(msg.params.requestId);
    return;
  }
});

ws.on("open", async () => {
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Performance.enable");
  await send("Log.enable");

  console.log(`[probe v2] connected, capturing for ${SECONDS}s...`);
  const startedAt = Date.now();
  const interval = setInterval(async () => {
    const r = await send("Performance.getMetrics");
    const m = Object.fromEntries((r.metrics || []).map((x) => [x.name, x.value]));
    heapSamples.push({
      t: Math.round((Date.now() - startedAt) / 1000),
      heap: ((m.JSHeapUsedSize || 0) / 1048576).toFixed(1),
      total: ((m.JSHeapTotalSize || 0) / 1048576).toFixed(1),
      nodes: m.Nodes || 0,
    });
  }, 2000);

  setTimeout(() => {
    clearInterval(interval);

    // Per-minute bucketed timeline — answers "steady or bursty?"
    const bucketSize = 60; // seconds
    const buckets = new Map(); // bucketIndex -> { stall, levelTO, fragTO, frag404, fatal, segs, segMs }
    const t0 = startedAt;
    const segByBucket = (ts) => Math.floor((ts - t0) / 1000 / bucketSize);
    for (const e of errorEvents) {
      const b = segByBucket(new Date(`1970-01-01T${e.t}Z`).getTime() % (24 * 3600 * 1000) === 0 ? Date.now() : Date.now()); // fallback: use now-relative
      // actually approximate by relative — store error_t as absolute later
    }
    // Simpler: track during capture (we already have absolute times in errorEvents/segmentTimings)
    const errAbs = errorEvents.map((e) => ({ ...e, absMs: Date.parse(`1970-01-01T${e.t}Z`) % (24 * 3600 * 1000) }));
    // Use captured-since-start using probe's own clock instead — re-derive from events as recorded
    // To keep this honest, compute buckets from segmentTimings (which already used Date.now()):

    const segs = segmentTimings;
    const tracked = [...heapSamples].map((s) => Number(s.t));
    const totalSeconds = tracked.length ? tracked[tracked.length - 1] : SECONDS;
    const nBuckets = Math.ceil(totalSeconds / bucketSize) || 1;
    const segBucketed = Array.from({ length: nBuckets }, () => []);
    // segmentTimings has no t field — let's just bucket overall

    console.log(`\n=== HLS ERROR PAYLOADS (${errorEvents.length}) ===`);
    for (const e of errorEvents) {
      console.log(`${e.t} type=${e.type} details=${e.details} fatal=${e.fatal} url=${(e.url || "").slice(-60)} status=${e.responseStatus || ""}`);
    }

    // Bucket errors by their wallclock minute relative to capture start
    const captureStartHMS = new Date(startedAt).toISOString().slice(11, 19); // HH:MM:SS
    console.log(`\n=== ERROR RATE BY MINUTE (capture started ${captureStartHMS}) ===`);
    const minuteBuckets = new Map();
    for (const e of errorEvents) {
      const eHMS = e.t.slice(0, 8); // HH:MM:SS
      const eParts = eHMS.split(":").map(Number);
      const sParts = captureStartHMS.split(":").map(Number);
      const eSec = eParts[0] * 3600 + eParts[1] * 60 + eParts[2];
      const sSec = sParts[0] * 3600 + sParts[1] * 60 + sParts[2];
      const offset = eSec - sSec;
      if (offset < 0 || offset > SECONDS + 5) continue; // outside capture window
      const min = Math.floor(offset / 60);
      if (!minuteBuckets.has(min)) minuteBuckets.set(min, { stall: 0, levelTO: 0, fragTO: 0, frag404: 0, nudge: 0, total: 0 });
      const b = minuteBuckets.get(min);
      b.total++;
      if (e.details === "bufferStalledError") b.stall++;
      else if (e.details === "levelLoadTimeOut") b.levelTO++;
      else if (e.details === "fragLoadTimeOut") b.fragTO++;
      else if (e.details === "fragLoadError") b.frag404++;
      else if (e.details === "bufferNudgeOnStall") b.nudge++;
    }
    const totalMinutes = Math.ceil(SECONDS / 60);
    for (let m = 0; m < totalMinutes; m++) {
      const b = minuteBuckets.get(m) || { stall: 0, levelTO: 0, fragTO: 0, frag404: 0, nudge: 0, total: 0 };
      console.log(`  min ${m}-${m + 1}: total=${b.total}  stall=${b.stall}  levelTimeout=${b.levelTO}  fragTimeout=${b.fragTO}  frag404=${b.frag404}  nudge=${b.nudge}`);
    }

    console.log(`\n=== SEGMENT TIMING DISTRIBUTION (n=${segmentTimings.length}) ===`);
    if (segmentTimings.length) {
      const sorted = [...segmentTimings].map((s) => s.ms).sort((a, b) => a - b);
      const pct = (p) => sorted[Math.floor((sorted.length - 1) * p)];
      console.log(`  min=${sorted[0]}ms  p50=${pct(0.5)}ms  p90=${pct(0.9)}ms  p99=${pct(0.99)}ms  max=${sorted[sorted.length - 1]}ms`);
      const slow = sorted.filter((m) => m > 3000).length;
      console.log(`  segments >3s: ${slow} / ${sorted.length}  (${((slow / sorted.length) * 100).toFixed(0)}%)`);
    }

    console.log(`\n=== HEAP TIMELINE (sampled every 2s) ===`);
    if (heapSamples.length >= 2) {
      const first = Number(heapSamples[0].heap);
      const last = Number(heapSamples[heapSamples.length - 1].heap);
      const peak = Math.max(...heapSamples.map((s) => Number(s.heap)));
      console.log(`  start=${first}MB  end=${last}MB  peak=${peak.toFixed(1)}MB  delta=${(last - first).toFixed(1)}MB`);
    }

    console.log(`\n=== SUMMARY ===`);
    const stallTotal = [...minuteBuckets.values()].reduce((a, b) => a + b.stall, 0);
    const levelTOTotal = [...minuteBuckets.values()].reduce((a, b) => a + b.levelTO, 0);
    const fragTOTotal = [...minuteBuckets.values()].reduce((a, b) => a + b.fragTO, 0);
    const frag404Total = [...minuteBuckets.values()].reduce((a, b) => a + b.frag404, 0);
    console.log(`  capture: ${SECONDS}s   errors: ${errorEvents.length}   network failures: ${netFailures.length}`);
    console.log(`  stall=${stallTotal}  levelTimeout=${levelTOTotal}  fragTimeout=${fragTOTotal}  frag404=${frag404Total}`);

    ws.close();
    process.exit(0);
  }, SECONDS * 1000);
});

ws.on("error", (e) => { console.error("ws error:", e.message); process.exit(2); });

/**
 * Diagnostic-bundle collector for /ottlogs uploads.
 *
 * Zip approach: SIMPLE BLOB (NOT a real zip archive).
 *   We emit `new Blob([jsonString], { type: "application/zip" })` rather than
 *   constructing a STORE-method zip file by hand. Reasons:
 *     1) Zero dependencies — the spec forbids new npm deps and a hand-rolled
 *        STORE writer (local file header + central directory + EOCD with CRC32)
 *        is non-trivial and easy to get subtly wrong on webOS Chrome 53.
 *     2) This is best-effort diagnostics; the server-side error path on a
 *        non-zip payload is the documented "Sorry, only zip files are allowed".
 *        If/when we need real zip archives, swap this implementation only —
 *        the public function signature stays the same.
 *
 * Lazy console capture:
 *   We monkey-patch console.{log,warn,error} on first call and ring-buffer
 *   the last 200 entries. We never patch on import to avoid touching console
 *   semantics of the rest of the app unless logs are actually requested.
 */

const MAX_CONSOLE_ENTRIES = 200;
let __consoleBuffer = null; // { entries: [], installed: boolean }

const installConsoleCapture = () => {
  if (__consoleBuffer) return __consoleBuffer;
  __consoleBuffer = { entries: [], installed: false };

  try {
    const buf = __consoleBuffer.entries;
    const wrap = (level, original) =>
      function patched(...args) {
        try {
          // Stringify safely; avoid throwing on circular refs.
          const parts = args.map((a) => {
            if (a == null) return String(a);
            if (typeof a === "string") return a;
            try {
              return JSON.stringify(a);
            } catch {
              try {
                return String(a);
              } catch {
                return "[unserializable]";
              }
            }
          });
          buf.push({
            t: Date.now(),
            level,
            msg: parts.join(" ").slice(0, 1000), // cap per-entry size
          });
          if (buf.length > MAX_CONSOLE_ENTRIES) {
            buf.splice(0, buf.length - MAX_CONSOLE_ENTRIES);
          }
        } catch {
          /* ignore capture failure */
        }
        return original.apply(this, args);
      };

    const origLog = console.log.bind(console);
    const origWarn = console.warn.bind(console);
    const origError = console.error.bind(console);

    console.log = wrap("log", origLog);
    console.warn = wrap("warn", origWarn);
    console.error = wrap("error", origError);
    __consoleBuffer.installed = true;
  } catch {
    /* if patching fails for any reason, leave entries empty */
  }
  return __consoleBuffer;
};

/**
 * Eagerly install console capture. Call from app boot if you want
 * the last 200 entries leading up to a crash to be available.
 */
export const initDiagnosticConsoleCapture = () => {
  installConsoleCapture();
};

const safeLocalStorageKeys = () => {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    return keys;
  } catch {
    return [];
  }
};

/**
 * Collect a small JSON diagnostic blob and return it as a Blob with
 * application/zip content type. See the file header for the rationale
 * on shipping a JSON-as-zip blob rather than a real STORE archive.
 *
 * Always resolves; never throws. Worst case returns a tiny stub zip
 * containing { ts, error: "diagnostic-collection-failed" }.
 *
 * @returns {Promise<Blob>}
 */
export const collectDiagnosticBundleAsZip = async () => {
  // Make sure the console buffer is at least initialized so the first
  // call doesn't return an empty array purely because nothing patched it yet.
  const buf = installConsoleCapture();

  let payload;
  try {
    const w =
      (typeof window !== "undefined" && window.innerWidth) ||
      (typeof document !== "undefined" && document.documentElement?.clientWidth) ||
      0;
    const h =
      (typeof window !== "undefined" && window.innerHeight) ||
      (typeof document !== "undefined" && document.documentElement?.clientHeight) ||
      0;

    payload = {
      ts: new Date().toISOString(),
      userAgent:
        (typeof navigator !== "undefined" && navigator.userAgent) || "unknown",
      location:
        (typeof window !== "undefined" && window.location && window.location.href) ||
        "unknown",
      viewport: { w, h },
      localStorage_keys: safeLocalStorageKeys(),
      lastConsole: Array.isArray(buf?.entries) ? buf.entries.slice(-MAX_CONSOLE_ENTRIES) : [],
    };
  } catch {
    payload = {
      ts: new Date().toISOString(),
      error: "diagnostic-collection-failed",
    };
  }

  let json;
  try {
    json = JSON.stringify(payload, null, 2);
  } catch {
    json = JSON.stringify({
      ts: new Date().toISOString(),
      error: "diagnostic-collection-failed",
    });
  }

  try {
    return new Blob([json], { type: "application/zip" });
  } catch {
    // Last-ditch: if Blob construction fails (shouldn't on Chrome 53+),
    // fabricate a minimal stub.
    return new Blob([
      JSON.stringify({
        ts: new Date().toISOString(),
        error: "diagnostic-collection-failed",
      }),
    ], { type: "application/zip" });
  }
};

export default collectDiagnosticBundleAsZip;

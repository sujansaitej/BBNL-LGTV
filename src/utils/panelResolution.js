import { getWebOSDisplayInfo } from './webos';

/**
 * Detect the TV panel's actual display resolution and aspect ratio.
 *
 * Detection chain (first usable result wins):
 *   1. Luna systemproperty `getSystemInfo` (UHD + screenWidth/screenHeight)
 *      with a 1500ms timeout — matches the existing pattern in
 *      LG-Devicesinformaction.jsx.
 *   2. window.screen.width × window.screen.height
 *   3. window.innerWidth × window.innerHeight
 *
 * Memoized via a module-level promise. The first call probes; subsequent
 * callers either await the in-flight probe or get the cached result
 * synchronously. Panels do not change at runtime so we never re-detect.
 *
 * Returns:
 *   {
 *     width:  Number,           // raw panel pixels
 *     height: Number,
 *     aspect: Number,           // width / height
 *     tier:   'HD' | 'FHD' | 'UHD',
 *     source: 'luna' | 'screen' | 'window',
 *   }
 */

const LUNA_TIMEOUT_MS = 1500;

const tierFor = (width) => {
  if (width >= 3000) return 'UHD';
  if (width >= 1700) return 'FHD';
  return 'HD';
};

const finish = (width, height, source) => {
  const w = Math.round(width);
  const h = Math.round(height);
  return {
    width: w,
    height: h,
    aspect: h > 0 ? w / h : 16 / 9,
    tier: tierFor(w),
    source,
  };
};

const fromScreen = () => {
  const w = Number(window?.screen?.width);
  const h = Number(window?.screen?.height);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return finish(w, h, 'screen');
  }
  return null;
};

const fromWindow = () => {
  const w = Number(window?.innerWidth);
  const h = Number(window?.innerHeight);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return finish(w, h, 'window');
  }
  // Last-ditch: assume FHD 16:9. Better to return something than null.
  return finish(1920, 1080, 'window');
};

const probeLuna = async () => {
  try {
    const info = await Promise.race([
      getWebOSDisplayInfo(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('panelResolution: Luna timeout')), LUNA_TIMEOUT_MS),
      ),
    ]);
    if (info && info.width && info.height) {
      return finish(info.width, info.height, 'luna');
    }
    return null;
  } catch {
    return null;
  }
};

let cached = null;
let inflight = null;

export async function getPanelResolution() {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const result =
      (await probeLuna()) ||
      fromScreen() ||
      fromWindow();
    cached = result;
    inflight = null;
    console.log(
      `[panelResolution] ${result.width}x${result.height} ` +
      `aspect=${result.aspect.toFixed(3)} tier=${result.tier} source=${result.source}`,
    );
    return result;
  })();

  return inflight;
}

/**
 * Synchronous accessor — returns the cached result if detection has already
 * run, else falls back to screen/window without awaiting Luna. Used by render
 * paths that cannot block on a Promise (e.g. the very first <video> render
 * before getPanelResolution has resolved).
 */
export function getPanelResolutionSync() {
  if (cached) return cached;
  return fromScreen() || fromWindow();
}

/** Test-only: clear the memoized result. */
export function __resetPanelResolutionCache() {
  cached = null;
  inflight = null;
}

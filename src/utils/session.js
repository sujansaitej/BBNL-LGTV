/**
 * Defense-in-depth session persistence for the BBNL IPTV webOS app.
 *
 * Why this exists:
 * - localStorage is the primary store, but on webOS it can occasionally be wiped:
 *   firmware updates, factory-reset of the Chrome settings cache, or — most
 *   commonly during dev — when the IPK is removed-then-installed (which counts
 *   as a fresh install and clears app storage).
 * - Cookies live in the same Chromium profile but have a different eviction
 *   lifecycle. When localStorage is empty but cookies still hold the session
 *   data, restoreSessionToLocalStorage() copies it back, restoring the session.
 *
 * Public API:
 *   sessionSet(key, value)     — write to localStorage AND cookie
 *   sessionGet(key)            — read from localStorage; fall back to cookie
 *   sessionRemove(key)         — delete from both
 *   sessionClear()             — full wipe (used by Logout)
 *   isSessionValid()           — true iff isAuthenticated + userId + userPhone all present
 *   restoreSessionToLocalStorage() — sync-recover localStorage from cookies on app start
 *   logSessionState(label?)    — diagnostic dump to console (used in App.js mount)
 */

const SESSION_KEYS = ['isAuthenticated', 'userId', 'userPhone'];
const COOKIE_DAYS = 365;

// ── Cookie helpers ─────────────────────────────────────────────────────────

const writeCookie = (key, value, days = COOKIE_DAYS) => {
  try {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch { /* ignore — cookies may be disabled in some contexts */ }
};

const readCookie = (key) => {
  try {
    const k = encodeURIComponent(key);
    const m = document.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
};

const deleteCookie = (key) => {
  try {
    document.cookie = `${encodeURIComponent(key)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  } catch { /* ignore */ }
};

// ── localStorage helpers (safe wrappers) ──────────────────────────────────

const lsSet = (key, value) => {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
};
const lsGet = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const lsRemove = (key) => {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
};

// ── Public API ─────────────────────────────────────────────────────────────

export const sessionSet = (key, value) => {
  const v = value == null ? '' : String(value);
  lsSet(key, v);
  writeCookie(key, v);
};

export const sessionGet = (key) => {
  const fromLs = lsGet(key);
  if (fromLs !== null && fromLs !== undefined) return fromLs;
  return readCookie(key);
};

export const sessionRemove = (key) => {
  lsRemove(key);
  deleteCookie(key);
};

export const sessionClear = () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }
  SESSION_KEYS.forEach(deleteCookie);
};

export const isSessionValid = () => {
  return sessionGet('isAuthenticated') === 'true'
      && !!sessionGet('userId')
      && !!sessionGet('userPhone');
};

/**
 * Run on app startup. If localStorage is missing any session key but the
 * matching cookie still holds the value, copy it back. This is the "recovery"
 * path that protects against the localStorage-wiped-but-cookies-survive case.
 */
export const restoreSessionToLocalStorage = () => {
  SESSION_KEYS.forEach((k) => {
    const lsValue = lsGet(k);
    if (lsValue !== null && lsValue !== undefined && lsValue !== '') return;
    const cookieValue = readCookie(k);
    if (cookieValue) lsSet(k, cookieValue);
  });
};

export const logSessionState = (label = 'session') => {
  try {
    const ls = {};
    const ck = {};
    SESSION_KEYS.forEach((k) => {
      ls[k] = lsGet(k);
      ck[k] = readCookie(k);
    });
    console.log(`[${label}] localStorage=`, ls, 'cookies=', ck, 'valid=', isSessionValid());
  } catch { /* ignore */ }
};

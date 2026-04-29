import { useCallback } from 'react';

const LOCK_MS = 600;
const PRESS_FLASH_MS = 120;

let tapLockedAt = 0;
let lockTimer = null;

const releaseLock = () => {
  tapLockedAt = 0;
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }
};

/**
 * Module-level helper: route-change auto-release. Wired once from App.js
 * (see Task 3) so that whenever React Router commits a new pathname, the
 * lock clears immediately — taps work the instant the new screen mounts.
 */
export const releaseTapLock = releaseLock;

/**
 * Test-only helper. Not exported via the hook.
 */
export const __resetTapLockForTests = releaseLock;

/**
 * Wraps an action handler with:
 *   1. A global 600ms double-tap lock (auto-released on route change).
 *   2. A 120ms data-pressed flash on the activated element.
 *
 * Both pointer clicks (event.currentTarget) and Magic Remote OK
 * activations (where useMagicRemote applies the flash to the focused
 * ref directly) share the same lock — the lock state is module-scoped.
 */
export function useTapAction(fn) {
  return useCallback((eventOrArg, ...rest) => {
    const now = Date.now();
    if (tapLockedAt && now - tapLockedAt < LOCK_MS) return;

    tapLockedAt = now;
    if (lockTimer) clearTimeout(lockTimer);
    lockTimer = setTimeout(releaseLock, LOCK_MS);

    const target =
      eventOrArg && eventOrArg.currentTarget && eventOrArg.currentTarget.setAttribute
        ? eventOrArg.currentTarget
        : null;
    if (target) {
      target.setAttribute('data-pressed', 'true');
      setTimeout(() => target.removeAttribute('data-pressed'), PRESS_FLASH_MS);
    }

    return fn(eventOrArg, ...rest);
  }, [fn]);
}

/**
 * Imperative version for code paths that don't have a React event
 * (e.g., Magic Remote keydown OK in useMagicRemote). Pass an optional
 * DOM element to receive the press flash.
 */
export function tapActionFire(fn, flashTarget = null) {
  const now = Date.now();
  if (tapLockedAt && now - tapLockedAt < LOCK_MS) return false;
  tapLockedAt = now;
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = setTimeout(releaseLock, LOCK_MS);

  if (flashTarget && flashTarget.setAttribute) {
    flashTarget.setAttribute('data-pressed', 'true');
    setTimeout(() => flashTarget.removeAttribute('data-pressed'), PRESS_FLASH_MS);
  }
  fn?.();
  return true;
}

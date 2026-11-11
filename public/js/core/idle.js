// @ts-check
/**
 * Idle timeout: after `timeoutMs` without a click or key press the session ends. `warnBeforeMs` earlier a warning is shown
 * (Session Timeout Warning, CM-P06). While the warning is open, ordinary activity does NOT quietly extend the session –
 * the person must choose "Stay signed in" (extend) or "Sign out".
 */

/**
 * @param {Object} o
 * @param {number} o.timeoutMs
 * @param {number} o.warnBeforeMs
 * @param {(remainingMs: number) => void} o.onWarn  called once when the warning starts
 * @param {() => void} o.onExpire                   called once when time is up
 * @param {() => void} [o.onActivity]               called for activity while active (e.g. to touch the session)
 * @param {() => number} [o.now]                    clock (tests pass a fake one)
 */
export function createIdleWatcher(o) {
  const now = o.now ?? Date.now;
  let last = now();
  /** @type {"active" | "warning" | "expired"} */
  let state = "active";
  let timer = 0;
  /** @type {Array<[string, EventListener]>} */
  const listeners = [];

  const remainingMs = () => Math.max(0, last + o.timeoutMs - now());

  function tick() {
    if (state === "expired") return state;
    const idle = now() - last;
    if (idle >= o.timeoutMs) {
      state = "expired";
      o.onExpire();
    } else if (state === "active" && idle >= o.timeoutMs - o.warnBeforeMs) {
      state = "warning";
      o.onWarn(remainingMs());
    }
    return state;
  }

  function activity() {
    if (state !== "active") return; // a warning must be answered on purpose
    last = now();
    o.onActivity?.();
  }

  /** "Stay signed in". */
  function extend() {
    if (state === "expired") return;
    state = "active";
    last = now();
    o.onActivity?.();
  }

  return {
    state: () => state,
    remainingMs,
    tick,
    activity,
    extend,
    /** Show the warning now (developer panel). */
    forceWarn() {
      last = now() - (o.timeoutMs - o.warnBeforeMs);
      tick();
    },
    start() {
      for (const ev of ["pointerdown", "keydown", "wheel", "touchstart"]) {
        const fn = () => activity();
        document.addEventListener(ev, fn, { passive: true });
        listeners.push([ev, fn]);
      }
      timer = window.setInterval(tick, 1000);
    },
    stop() {
      clearInterval(timer);
      for (const [ev, fn] of listeners) document.removeEventListener(ev, fn);
      listeners.length = 0;
    },
  };
}

// @ts-check
/**
 * In-app event bus. Mock services emit events on every write; the UI listens
 * (notifications, dashboard counts, channel push). A WebSocket can replace the source later.
 */

/** @typedef {{ id: number, name: string, payload: any, at: string }} BusEvent */

/** @type {Map<string, Set<(payload: any, event: BusEvent) => void>>} */
const listeners = new Map();
/** @type {BusEvent[]} */
const log = [];
const LOG_LIMIT = 200;
let seq = 0;

/**
 * Listen for an event ("*" listens to everything). Returns an unsubscribe function.
 * @param {string} name
 * @param {(payload: any, event: BusEvent) => void} fn
 * @returns {() => void}
 */
export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  /** @type {Set<any>} */ (listeners.get(name)).add(fn);
  return () => off(name, fn);
}

/**
 * @param {string} name
 * @param {(payload: any, event: BusEvent) => void} fn
 */
export function off(name, fn) {
  listeners.get(name)?.delete(fn);
}

/**
 * @param {string} name
 * @param {(payload: any, event: BusEvent) => void} fn
 */
export function once(name, fn) {
  const stop = on(name, (p, e) => {
    stop();
    fn(p, e);
  });
  return stop;
}

/**
 * Fire an event. A failing listener never stops the others.
 * @param {string} name e.g. "reservation.created"
 * @param {any} [payload]
 * @returns {BusEvent}
 */
export function emit(name, payload = {}) {
  /** @type {BusEvent} */
  const event = { id: ++seq, name, payload, at: new Date().toISOString() };
  log.push(event);
  if (log.length > LOG_LIMIT) log.shift();
  for (const key of [name, "*"]) {
    for (const fn of listeners.get(key) ?? []) {
      try {
        fn(payload, event);
      } catch (err) {
        console.error(`Event listener for "${key}" failed`, err);
      }
    }
  }
  return event;
}

/** Recent events (newest last) – shown in the Developer panel. */
export const recentEvents = () => log.slice();

/** Remove all listeners and the log (tests only). */
export function _resetForTests() {
  listeners.clear();
  log.length = 0;
  seq = 0;
}

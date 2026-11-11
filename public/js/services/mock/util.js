// @ts-check
/**
 * Shared helpers for mock services: simulated network delay and API-style errors.
 */
import { MOCK_DELAY } from "../../config.js";

/** Error shape the real API will also use. */
export class ServiceError extends Error {
  /**
   * @param {string} code machine-readable, e.g. "VALIDATION", "NOT_FOUND", "FORBIDDEN", "SOLD_OUT"
   * @param {string} message plain-English text safe to show to the user
   * @param {Record<string, string>} [fields] field name → message
   */
  constructor(code, message, fields = {}) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.fields = fields;
  }
}

// ?mockDelay=0 in the page address removes the simulated network delay (automated checks use it to run fast)
let delayScale = new URLSearchParams(globalThis.location?.search ?? "").get("mockDelay") === "0" ? 0 : 1;
/** Tests set this to 0 so they run instantly. */
export const _setDelayScale = (/** @type {number} */ s) => { delayScale = s; };

/** @returns {Promise<void>} */
export function delay() {
  const ms = (MOCK_DELAY.min + Math.random() * (MOCK_DELAY.max - MOCK_DELAY.min)) * delayScale;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a service function the way a network call behaves: wait, then resolve or reject.
 * @template T
 * @param {() => T} fn
 * @returns {Promise<T>}
 */
export async function respond(fn) {
  await delay();
  return fn();
}

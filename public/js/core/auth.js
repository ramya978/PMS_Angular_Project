// @ts-check
/**
 * The signed-in session (kept in sessionStorage, so it ends when the tab closes) and the "remember this device" list.
 * Signing in itself is done by the auth service (js/services/mock/auth.js); this file only holds what the pages need to know.
 */

const SESSION_KEY = "avivpms.session";
const TRUSTED_KEY = "avivpms.trusted";

/**
 * @typedef {Object} SessionUser
 * @property {string} id
 * @property {string} name
 * @property {string} role        role name for display, e.g. "Reservation Manager"
 * @property {string} [roleId]       role used for permissions (can differ from realRoleId when an Admin tries another role)
 * @property {string} [realRoleId]   the person's own role
 * @property {string[]} [permissions] role permission patterns ("RS-*", "RSS-08.view", "*")
 * @property {string} [propertyId]
 * @property {string} [signedInAt]
 * @property {number} [lastActive]  ms since 1970 of the last click / key press
 */

/** @returns {SessionUser | null} */
export function currentUser() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

/** @param {SessionUser | null} user */
export function setSession(user) {
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* blocked storage: session lives in this page only */ }
}

export const clearSession = () => setSession(null);
export const isSignedIn = () => currentUser() !== null;

let lastWrite = 0;
/** Note that the person is active (called by the idle timer; writes at most every 5 s). */
export function touchSession() {
  const now = Date.now();
  if (now - lastWrite < 5000) return;
  lastWrite = now;
  const s = currentUser();
  if (s) setSession({ ...s, lastActive: now });
}

/* ── trusted devices: skip the second step for 30 days ── */

/** @returns {Record<string, number>} user id → expiry (ms) */
function trusted() {
  try {
    return JSON.parse(localStorage.getItem(TRUSTED_KEY) || "{}");
  } catch {
    return {};
  }
}

/** @param {string} userId */
export const isTrustedDevice = (userId) => (trusted()[userId] ?? 0) > Date.now();

/** @param {string} userId @param {number} [days] */
export function trustDevice(userId, days = 30) {
  try {
    localStorage.setItem(TRUSTED_KEY, JSON.stringify({ ...trusted(), [userId]: Date.now() + days * 86400000 }));
  } catch { /* not remembered */ }
}

/** @param {string} [userId] omit to forget every device */
export function forgetDevice(userId) {
  try {
    if (!userId) return localStorage.removeItem(TRUSTED_KEY);
    const t = trusted();
    delete t[userId];
    localStorage.setItem(TRUSTED_KEY, JSON.stringify(t));
  } catch { /* ignore */ }
}

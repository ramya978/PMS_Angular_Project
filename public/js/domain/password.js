// @ts-check
/** Password and one-time-code rules (used by sign-in, password reset and the user form). */

/**
 * Plain-English problems with a new password (empty list = good).
 * @param {string} pw
 * @param {{ email?: string }} [ctx]
 * @returns {string[]}
 */
export function passwordProblems(pw, ctx = {}) {
  const out = [];
  if (pw.length < 10) out.push("Use at least 10 characters.");
  if (!/[a-z]/.test(pw)) out.push("Add a lowercase letter.");
  if (!/[A-Z]/.test(pw)) out.push("Add a capital letter.");
  if (!/\d/.test(pw)) out.push("Add a number.");
  if (!/[^A-Za-z0-9]/.test(pw)) out.push("Add a symbol such as @ or #.");
  const local = ctx.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && pw.toLowerCase().includes(local)) out.push("Do not use your email name in the password.");
  return out;
}

/** @param {string} code @param {number} length */
export const isCodeShape = (code, length) => new RegExp(`^\\d{${length}}$`).test(code);

/**
 * SHA-256 of salt + password as hex (stored instead of the password; the real backend will use a slow hash such as Argon2).
 * @param {string} password
 * @param {string} salt
 */
export async function hashPassword(password, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

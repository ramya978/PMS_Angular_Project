// @ts-check
/**
 * Money and date helpers.
 * Money is ALWAYS integer paise (never floats). Dates are "YYYY-MM-DD" strings; no timezone maths.
 */

/* ───────────── Money ───────────── */

/**
 * Group digits the Indian way: 1234567 → "12,34,567".
 * @param {string} digits only 0-9
 */
function indianGroup(digits) {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/**
 * Format integer paise as ₹ with Indian grouping. Paise shown only when non-zero.
 * @param {number} paise integer
 * @param {{ symbol?: boolean, alwaysDecimals?: boolean }} [opts]
 * @returns {string} e.g. 12345600 → "₹1,23,456"
 */
export function formatMoney(paise, opts = {}) {
  if (!Number.isInteger(paise)) throw new TypeError(`formatMoney expects integer paise, got ${paise}`);
  const { symbol = true, alwaysDecimals = false } = opts;
  const abs = Math.abs(paise);
  const rupees = Math.trunc(abs / 100);
  const p = abs % 100;
  let out = indianGroup(String(rupees));
  if (p || alwaysDecimals) out += `.${String(p).padStart(2, "0")}`;
  return `${paise < 0 ? "-" : ""}${symbol ? "₹" : ""}${out}`;
}

/**
 * Convert a rupee amount typed by a person ("7,999", "7999.50", "₹ 1,23,456") into integer paise.
 * Returns null when the text is not a valid amount.
 * @param {string | number} input
 * @returns {number | null}
 */
export function parseMoney(input) {
  const text = String(input).replace(/[₹,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) return null;
  const neg = text.startsWith("-");
  const [r, f = ""] = text.replace("-", "").split(".");
  const paise = Number(r) * 100 + Number(f.padEnd(2, "0"));
  return neg ? -paise : paise;
}

/**
 * Whole rupees → paise (for seed data and constants).
 * @param {number} rupees integer
 */
export const rupees = (whole) => {
  if (!Number.isInteger(whole)) throw new TypeError("rupees() expects whole rupees; use parseMoney for decimals");
  return whole * 100;
};

/**
 * Apply a percentage (up to 2 decimals, e.g. 2.5) to integer paise, rounded half-up to the nearest paisa.
 * @param {number} paise
 * @param {number} percent
 */
export function percentOf(paise, percent) {
  const bps = Math.round(percent * 100); // basis points, integer
  return Math.round((paise * bps) / 10000);
}

/* ───────────── Dates (ISO strings) ───────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 86400000;

/**
 * @param {string} iso
 * @returns {boolean} true for a real calendar date written YYYY-MM-DD
 */
export function isISODate(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** @param {string} iso */
function toUTC(iso) {
  if (!isISODate(iso)) throw new RangeError(`Invalid date "${iso}" (expected YYYY-MM-DD)`);
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** @param {number} ms */
const fromUTC = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * The computer's real calendar date (only used to seed the business date).
 * @returns {string}
 */
export function realToday() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

/**
 * @param {string} iso
 * @param {number} days may be negative
 */
export const addDays = (iso, days) => fromUTC(toUTC(iso) + days * DAY_MS);

/**
 * Whole days from a to b (b - a).
 * @param {string} a
 * @param {string} b
 */
export const diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / DAY_MS);

/**
 * Number of nights between check-in and check-out.
 * @param {string} checkIn
 * @param {string} checkOut
 */
export const nightsBetween = (checkIn, checkOut) => diffDays(checkIn, checkOut);

/**
 * 0 = Sunday … 6 = Saturday.
 * @param {string} iso
 */
export const weekday = (iso) => new Date(toUTC(iso)).getUTCDay();

/**
 * Every date from `from` (inclusive) to `to` (exclusive) – the nights of a stay.
 * @param {string} from
 * @param {string} to
 * @returns {string[]}
 */
export function dateRange(from, to) {
  const out = [];
  for (let d = from; d < to; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * @param {string} iso
 * @param {"short" | "long" | "month"} [style]
 * @returns {string} short "22 Oct 2026", long "Thu, 22 Oct 2026", month "Oct 2026"
 */
export function formatDate(iso, style = "short") {
  const [y, m, d] = iso.split("-").map(Number);
  if (!isISODate(iso)) return iso;
  if (style === "month") return `${MONTHS[m - 1]} ${y}`;
  const base = `${d} ${MONTHS[m - 1]} ${y}`;
  return style === "long" ? `${DAYS[weekday(iso)]}, ${base}` : base;
}

/**
 * @param {string} iso
 * @param {string} [prefix]
 */
export function formatDateShort(iso, prefix = "") {
  if (!isISODate(iso)) return iso;
  const [, m, d] = iso.split("-").map(Number);
  return `${prefix}${DAYS[weekday(iso)]} ${d} ${MONTHS[m - 1]}`;
}

/**
 * Financial year label for a date (April–March): "2026-27".
 * @param {string} iso
 */
export function financialYear(iso) {
  const [y, m] = iso.split("-").map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/**
 * "Good morning" / "Good afternoon" / "Good evening" for an hour 0-23.
 * @param {number} hour
 */
export const greeting = (hour) => (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

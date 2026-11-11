// @ts-check
/**
 * Pure date helpers for the calendar widgets (testable without a browser). Dates are "YYYY-MM-DD" strings.
 */
import { addDays, isISODate, weekday, nightsBetween } from "../core/format.js";

const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_ABBR = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export const monthName = (/** @type {number} */ monthIndex) => MONTHS_FULL[monthIndex];

/**
 * 6 weeks × 7 days for a month, weeks starting Monday. Days outside the month are included (for filling the grid).
 * @param {number} year
 * @param {number} month 0-11
 * @returns {string[][]}
 */
export function monthGrid(year, month) {
  const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const offset = (weekday(first) + 6) % 7; // Monday = 0
  const start = addDays(first, -offset);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

/**
 * Move a date by whole months, keeping the day where possible (31 Jan + 1 month → 28/29 Feb).
 * @param {string} iso
 * @param {number} months
 */
export function addMonths(iso, months) {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/**
 * Understand what a person types: 2026-10-22, 22/10/2026, 22-10-2026, "22 Oct 2026", "22 oct" (current year of `ref`).
 * @param {string} text
 * @param {string} ref a date used to fill a missing year (the business date)
 * @returns {string | null} ISO date or null
 */
export function parseDateInput(text, ref) {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (isISODate(t)) return t;
  let m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/.exec(t);
  /** @type {number | undefined} */ let d, mo, y;
  if (m) {
    d = Number(m[1]); mo = Number(m[2]); y = Number(m[3]);
    if (m[3].length === 2) y += 2000;
  } else if ((m = /^(\d{1,2})\s+([a-z]{3,9})\.?(?:,?\s+(\d{4}))?$/.exec(t))) {
    d = Number(m[1]);
    mo = MONTH_ABBR.indexOf(m[2].slice(0, 3)) + 1;
    y = m[3] ? Number(m[3]) : Number(ref.slice(0, 4));
    if (mo === 0) return null;
  } else return null;
  const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return isISODate(iso) ? iso : null;
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {string} "3 nights"
 */
export function nightsLabel(from, to) {
  const n = nightsBetween(from, to);
  return `${n} night${n === 1 ? "" : "s"}`;
}

/** Parse "15:00", "3pm", "1530", "9.30 am" → "HH:mm" or null. @param {string} text */
export function parseTimeInput(text) {
  const t = text.trim().toLowerCase().replace(/\./g, ":");
  const m = /^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/.exec(t);
  if (!m) return null;
  let hh = Number(m[1]);
  const mm = m[2] ? Number(m[2]) : 0;
  if (m[3]) {
    if (hh < 1 || hh > 12) return null;
    if (m[3] === "pm" && hh < 12) hh += 12;
    if (m[3] === "am" && hh === 12) hh = 0;
  }
  if (hh > 23 || mm > 59) return null;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * @param {number} stepMinutes
 * @returns {string[]} ["00:00", "00:30", …]
 */
export function timeSlots(stepMinutes = 30) {
  const out = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return out;
}

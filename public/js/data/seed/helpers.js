// @ts-check
/** Small helpers shared by the seed modules. */
import { addDays } from "../../core/format.js";

export { addDays };

/** @param {number} n @param {number} [width] */
export const pad = (n, width = 2) => String(n).padStart(width, "0");

/**
 * ISO date-time in the hotel's time zone (IST, +05:30) for a date and a time of day.
 * @param {string} date YYYY-MM-DD
 * @param {number} [hh]
 * @param {number} [mm]
 */
export const at = (date, hh = 10, mm = 0) => `${date}T${pad(hh)}:${pad(mm)}:00+05:30`;

/** Year of a date. @param {string} iso */
export const yearOf = (iso) => Number(iso.slice(0, 4));

/**
 * Financial-year label used in number formats ("26-27" for April 2026 – March 2027).
 * @param {string} iso
 */
export function fyShort(iso) {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const start = m >= 4 ? y : y - 1;
  return `${pad(start % 100)}-${pad((start + 1) % 100)}`;
}

/** Capitalised words: "front-office" → "Front Office". @param {string} s */
export const titleCase = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

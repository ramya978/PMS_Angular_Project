// @ts-check
/**
 * Field-level rules used by schemas and by forms. Each rule returns null when the value is fine,
 * otherwise a plain-English message. Empty values pass (use `required` in the schema for that).
 */
import { isISODate, diffDays, addDays } from "../core/format.js";

const GST_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** GST state codes (01–38) with their names – used for state detection (Kerala 32 = CGST + SGST, others = IGST). */
export const GST_STATES = /** @type {const} */ ({
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
  "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam",
  "19": "West Bengal", "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "28": "Andhra Pradesh (old)", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
});

/**
 * The 15th character of a GSTIN (checksum over the first 14).
 * @param {string} first14
 */
export function gstinCheckChar(first14) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = GST_ALPHABET.indexOf(first14[i]);
    const product = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GST_ALPHABET[(36 - (sum % 36)) % 36];
}

/**
 * Build a valid GSTIN (used for demo companies).
 * @param {string} stateCode two digits
 * @param {string} pan ten characters, e.g. AACCE1226H
 * @param {number} [entity] 1–9 registration number of the same PAN in that state
 */
export function makeGstin(stateCode, pan, entity = 1) {
  const first14 = `${stateCode}${pan}${entity}Z`;
  return first14 + gstinCheckChar(first14);
}

/** @param {string} v */
export const stateCodeOfGstin = (v) => (typeof v === "string" ? v.slice(0, 2) : "");

/** @param {any} v @returns {string | null} */
export function gstin(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(s)) return "A GSTIN has 15 characters, for example 32AACCE1226H1Z9.";
  if (!(stateCodeOfGstin(s) in GST_STATES)) return "The first two digits of the GSTIN are not a valid state code.";
  if (gstinCheckChar(s.slice(0, 14)) !== s[14]) return "This GSTIN does not pass the check-digit test – please re-check the number.";
  return null;
}

/** @param {any} v @returns {string | null} */
export function pan(v) {
  if (v === undefined || v === null || v === "") return null;
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(String(v).toUpperCase()) ? null : "A PAN has 10 characters, for example AACCE1226H.";
}

/** @param {any} v @returns {string | null} */
export function email(v) {
  if (v === undefined || v === null || v === "") return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v)) ? null : "Enter a full email address, for example name@example.com.";
}

/** Phone with country code: "+91 9876543210" (digits and spaces after the code). @param {any} v @returns {string | null} */
export function phone(v) {
  if (v === undefined || v === null || v === "") return null;
  const m = /^\+(\d{1,3}) ?([\d ]{6,14})$/.exec(String(v));
  const digits = m ? m[2].replace(/\s/g, "") : "";
  if (!m || digits.length < 6 || digits.length > 12) return "Enter a phone number with country code, for example +91 98765 43210.";
  if (m[1] === "91" && !/^[6-9]\d{9}$/.test(digits)) return "An Indian mobile number has 10 digits and starts with 6, 7, 8 or 9.";
  return null;
}

/** Any international number: +CC then 6 to 12 digits (landlines allowed). @param {any} v @returns {string | null} */
export function phoneAny(v) {
  if (v === undefined || v === null || v === "") return null;
  return /^\+\d{1,3} ?[\d ]{6,14}$/.test(String(v)) ? null : "Enter a phone number with country code, for example +91 484 266 8888.";
}

/** @param {any} v @returns {string | null} */
export function indianPincode(v) {
  if (v === undefined || v === null || v === "") return null;
  return /^[1-9]\d{5}$/.test(String(v)) ? null : "An Indian PIN code has 6 digits.";
}

/** Short code such as GDLX, BAR-CP, FK. @param {any} v @returns {string | null} */
export function code(v) {
  if (v === undefined || v === null || v === "") return null;
  return /^[A-Z0-9][A-Z0-9_-]{0,15}$/.test(String(v)) ? null : "Use capital letters, digits, - or _ (up to 16 characters).";
}

/** Room number like 101 or 1204 or 5A. @param {any} v @returns {string | null} */
export function roomNumber(v) {
  if (v === undefined || v === null || v === "") return null;
  return /^[0-9]{3,4}[A-Z]?$/.test(String(v)) ? null : "A room number has 3 or 4 digits, for example 305.";
}

/** @param {number} min @param {number} max */
export const percentBetween = (min = 0, max = 100) => (/** @type {any} */ v) => {
  if (v === undefined || v === null || v === "") return null;
  return typeof v === "number" && v >= min && v <= max ? null : `Enter a percentage from ${min} to ${max}.`;
};

/**
 * A person must be at least `minAge` years old on `onDate`.
 * @param {number} minAge
 * @param {string} onDate
 */
export const adultOn = (minAge, onDate) => (/** @type {any} */ dob) => {
  if (!dob) return null;
  if (!isISODate(dob)) return "Enter a real date of birth.";
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = onDate.split("-").map(Number);
  const years = ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0); // birthday not reached yet this year
  return years >= minAge ? null : `The guest must be at least ${minAge} years old.`;
};

/**
 * Check-out must be after check-in.
 * @param {string | undefined} arrival
 * @param {string | undefined} departure
 * @returns {string | null}
 */
export function stayDates(arrival, departure) {
  if (!arrival || !departure) return null;
  if (!isISODate(arrival) || !isISODate(departure)) return "Enter real dates.";
  return departure > arrival ? null : "Check-out must be after check-in.";
}

/**
 * Child age rules from the hotel parameters: up to `freeUpTo` years stay free with existing beds, older children count as adults.
 * @param {number[]} ages
 * @param {{ childFreeMaxAge: number, childFreeMaxCount: number }} params
 * @returns {{ free: number, asAdults: number }}
 */
export function classifyChildren(ages, params) {
  let free = 0;
  let asAdults = 0;
  for (const age of [...ages].sort((a, b) => a - b)) {
    if (age <= params.childFreeMaxAge && free < params.childFreeMaxCount) free++;
    else asAdults++; // 12 and over, or a third young child, is charged as an adult
  }
  return { free, asAdults };
}

/** Date `n` days after `iso` as text – kept here so seed and forms share one helper. @param {string} iso @param {number} n */
export const plusDays = (iso, n) => addDays(iso, n);

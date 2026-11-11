// @ts-check
/**
 * Mock database kept in localStorage under one versioned key (see js/config.js).
 * Collections are arrays of plain objects that each have a string `id`.
 * ONLY mock services may import this file – pages go through js/services/.
 */
import { STORE_KEY, SCHEMA_VERSION } from "../config.js";
import { buildSeed } from "../data/seed.js";

/**
 * @typedef {Object} Database
 * @property {number} version
 * @property {Record<string, any>} meta
 * @property {Record<string, Array<{id: string} & Record<string, any>>>} collections
 */

let storageKey = STORE_KEY;
/** @type {Database | null} */
let db = null;
/** @type {Map<string, Map<string, any>>} id lookup caches, cleared on write */
const indexes = new Map();

// When another tab / frame of this app changes the saved data, forget our in-memory copy and re-read it.
window.addEventListener("storage", (ev) => {
  if (ev.key === storageKey) {
    db = null;
    indexes.clear();
  }
});

/** @returns {Storage | null} */
function storage() {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked storage: app still works in memory
  }
}

/** Demo surnames replaced on 2026-11-04 (same map as js/data/seed/); data saved before that still holds the old ones. */
const RENAMED_SURNAMES = {
  Nair: "Nathan", Menon: "Mohan", Pillai: "Prem", Kurup: "Krish", Panicker: "Pranav", Varma: "Vijay", Namboothiri: "Nirav", Iyer: "Ishaan",
  Das: "Dev", Warrier: "Wilson", Unnithan: "Uday", Sharma: "Sagar", Verma: "Vihaan", Gupta: "Gautam", Singh: "Siddharth", Patel: "Pavan",
  Shah: "Sahil", Mehta: "Manav", Reddy: "Rishi", Rao: "Ranjan", Naidu: "Neil", Iyengar: "Ivan", Chatterjee: "Chirag", Banerjee: "Bijoy",
  Kapoor: "Kabir", Malhotra: "Mihir", Desai: "Dhruv", Joshi: "Jatin", Kulkarni: "Kunal", Shetty: "Shaan", Hegde: "Harsh",
};

/** Replace the old surnames in names and in email addresses built from them ("vikram.nair@…"). @param {Database} data @returns {Database} */
function renameSurnames(data) {
  const old = Object.keys(RENAMED_SURNAMES).join("|");
  const text = JSON.stringify(data)
    .replace(new RegExp(`\\b(${old})\\b`, "g"), (m) => RENAMED_SURNAMES[m])
    .replace(new RegExp(`\\.(${old.toLowerCase()})(\\d*)@`, "g"), (_, name, digits) => {
      const key = name[0].toUpperCase() + name.slice(1);
      return `.${RENAMED_SURNAMES[key].toLowerCase()}${digits}@`;
    });
  return JSON.parse(text);
}

/**
 * Upgrade data saved by an older version of the app.
 *  - Versions before 3 only held a counter and a few notifications, so they are replaced by the full Aviv Kochi demo data
 *    (around the business date that was saved).
 *  - Later versions keep everything the person already has and add any collection / meta key the new seed has.
 *  - Versions before 4 also get the new demo surnames.
 * Add a step here whenever SCHEMA_VERSION goes up.
 */
export function migrate(/** @type {Database} */ saved) {
  if ((saved.version ?? 0) < 3) return buildSeed(saved.meta?.businessDate);
  const data = saved.version < 4 ? renameSurnames(saved) : saved;
  const fresh = buildSeed(data.meta?.businessDate);
  for (const [name, rows] of Object.entries(fresh.collections)) data.collections[name] ??= rows;
  for (const [key, value] of Object.entries(fresh.meta)) data.meta[key] ??= value;
  data.version = SCHEMA_VERSION;
  return data;
}

/** @returns {Database} */
function load() {
  if (db) return db;
  let loaded = null;
  try {
    const raw = storage()?.getItem(storageKey);
    if (raw) loaded = JSON.parse(raw);
  } catch (err) {
    console.error("Saved data could not be read – restoring the demo data.", err);
  }
  if (loaded && typeof loaded.version === "number" && loaded.collections) {
    db = loaded.version === SCHEMA_VERSION ? loaded : migrate(loaded);
    if (db.version !== loaded.version || loaded !== db) persist();
  } else {
    db = buildSeed();
    persist();
  }
  return /** @type {Database} */ (db);
}

function persist() {
  indexes.clear();
  try {
    storage()?.setItem(storageKey, JSON.stringify(db));
  } catch (err) {
    console.error("Could not save data (storage full?).", err);
  }
}

/** @param {string} name */
function col(name) {
  const data = load();
  if (!data.collections[name]) data.collections[name] = [];
  return data.collections[name];
}

/** @param {string} name */
function index(name) {
  let idx = indexes.get(name);
  if (!idx) {
    idx = new Map(col(name).map((r) => [r.id, r]));
    indexes.set(name, idx);
  }
  return idx;
}

/** Deep copy so callers can never mutate the database by accident. */
const copy = (/** @type {any} */ v) => (v === undefined ? v : structuredClone(v));

/**
 * @param {string} name collection
 * @returns {any[]}
 */
export const all = (name) => copy(col(name));

/**
 * @param {string} name
 * @param {string} id
 */
export const get = (name, id) => copy(index(name).get(id));

/**
 * @param {string} name
 * @param {(record: any) => boolean} predicate
 */
export const find = (name, predicate) => copy(col(name).find(predicate));

/**
 * @param {string} name
 * @param {(record: any) => boolean} [predicate]
 */
export const filter = (name, predicate = () => true) => copy(col(name).filter(predicate));

/** @param {string} name */
export const count = (name) => col(name).length;

/**
 * Next id such as "RES-000123" for a prefix. Uses a counter kept in the database.
 * @param {string} prefix
 * @param {number} [pad]
 */
export function nextId(prefix, pad = 6) {
  const data = load();
  data.meta.idCounters ??= {};
  const n = (data.meta.idCounters[prefix] ?? 0) + 1;
  data.meta.idCounters[prefix] = n;
  return `${prefix}-${String(n).padStart(pad, "0")}`;
}

/**
 * @param {string} name
 * @param {Record<string, any>} record  `id` is generated when missing
 */
export function insert(name, record) {
  const rows = col(name);
  const row = copy(record);
  row.id ??= nextId(name.slice(0, 3).toUpperCase());
  if (index(name).has(row.id)) throw new Error(`Duplicate id "${row.id}" in ${name}`);
  rows.push(row);
  persist();
  return copy(row);
}

/**
 * Merge `patch` into a record.
 * @param {string} name
 * @param {string} id
 * @param {Record<string, any>} patch
 */
export function update(name, id, patch) {
  const row = index(name).get(id);
  if (!row) throw new Error(`${name} "${id}" not found`);
  Object.assign(row, copy(patch), { id });
  persist();
  return copy(row);
}

/**
 * Replace a whole record (fields missing from `record` are removed).
 * @param {string} name
 * @param {string} id
 * @param {Record<string, any>} record
 */
export function replace(name, id, record) {
  const rows = col(name);
  const at = rows.findIndex((r) => r.id === id);
  if (at < 0) throw new Error(`${name} "${id}" not found`);
  rows[at] = { ...copy(record), id };
  persist();
  return copy(rows[at]);
}

/**
 * @param {string} name
 * @param {string} id
 * @returns {boolean} true when something was removed
 */
export function remove(name, id) {
  const rows = col(name);
  const at = rows.findIndex((r) => r.id === id);
  if (at < 0) return false;
  rows.splice(at, 1);
  persist();
  return true;
}

/**
 * Replace a whole collection (seed, imports, bulk updates).
 * @param {string} name
 * @param {Array<{id: string}>} rows
 */
export function replaceAll(name, rows) {
  load().collections[name] = copy(rows);
  persist();
}

/**
 * Filter, sort and paginate – what a real list endpoint does.
 * @template T
 * @param {string} name
 * @param {{ where?: (r: any) => boolean, sort?: string, dir?: "asc" | "desc", page?: number, pageSize?: number }} [q]
 * @returns {{ items: any[], total: number, page: number, pageSize: number, pages: number }}
 */
export function query(name, q = {}) {
  const { where = () => true, sort, dir = "asc", page = 1, pageSize = 25 } = q;
  let rows = col(name).filter(where);
  if (sort) {
    const sign = dir === "desc" ? -1 : 1;
    rows = rows.slice().sort((a, b) => {
      const x = a[sort], y = b[sort];
      if (x === y) return 0;
      if (x === undefined || x === null) return 1;
      if (y === undefined || y === null) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en", { numeric: true })) * sign;
    });
  }
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * pageSize;
  return { items: copy(rows.slice(start, start + pageSize)), total, page: safePage, pageSize, pages };
}

/** @param {string} key */
export const getMeta = (key) => copy(load().meta[key]);

/**
 * @param {string} key
 * @param {any} value
 */
export function setMeta(key, value) {
  load().meta[key] = copy(value);
  persist();
}

/**
 * Throw away saved data and restore the demo seed.
 * @param {string} [aroundDate] build the demo bookings around this business date (default: today)
 */
export function reset(aroundDate) {
  db = buildSeed(aroundDate);
  persist();
}

/** Number of records in every collection. @returns {Record<string, number>} */
export const counts = () => Object.fromEntries(Object.entries(load().collections).map(([k, v]) => [k, v.length]));

/** The live collections WITHOUT copying – for read-only checks (integrity, reports). Never change what it returns. @returns {Record<string, any[]>} */
export const peekAll = () => load().collections;

/** The whole database as text (for backups). */
export const snapshot = () => JSON.stringify(load());

/**
 * Put a backup back. The text must be a database made by snapshot().
 * @param {string} json
 */
export function restore(json) {
  const data = JSON.parse(json);
  if (!data || typeof data.version !== "number" || !data.collections) throw new Error("That is not a Aviv PMS backup.");
  db = data.version === SCHEMA_VERSION ? data : migrate(data);
  persist();
}

/** Approximate size of the saved database in bytes. */
export const sizeBytes = () => JSON.stringify(load()).length;

/** Use a separate storage key (tests only) and forget the in-memory copy. */
export function _useKeyForTests(/** @type {string} */ key) {
  storageKey = key;
  db = null;
  indexes.clear();
}
export function _dropForTests() {
  try {
    storage()?.removeItem(storageKey);
  } catch { /* ignore */ }
  db = null;
  indexes.clear();
}

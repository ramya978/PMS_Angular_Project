// @ts-check
/**
 * Backup (CM-X03, simulated). Daily the whole demo database is copied to a second storage slot in this browser.
 * Only the latest backup is kept (the browser allows about 5 MB). The real system will back up the server database.
 */
import * as store from "../../core/store.js";
import { emit } from "../../core/events.js";
import { ServiceError, respond } from "./util.js";
import { recordAudit } from "./write.js";

const KEY = "avivpms.backup";

/** @returns {{ at: string, businessDate: string, bytes: number, records: number } | null} */
function info() {
  try {
    const b = JSON.parse(localStorage.getItem(KEY) || "null");
    return b ? { at: b.at, businessDate: b.businessDate, bytes: b.bytes, records: b.records } : null;
  } catch {
    return null;
  }
}

/** Compress text with gzip and return it as base64 (about 10 times smaller, so a backup fits next to the live data). @param {string} text */
async function pack(text) {
  const blob = await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))).blob();
  const url = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(/** @type {string} */ (r.result)); r.readAsDataURL(blob); });
  return String(url).slice(String(url).indexOf(",") + 1);
}

/** @param {string} base64 */
async function unpack(base64) {
  const blob = await (await fetch(`data:application/gzip;base64,${base64}`)).blob();
  return new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

/** Run a backup now. @returns {Promise<{ at: string, businessDate: string, bytes: number, records: number }>} */
export const runBackup = () =>
  respond(async () => {
    const text = store.snapshot();
    const counts = store.counts();
    const entry = { at: new Date().toISOString(), businessDate: store.getMeta("businessDate"), bytes: text.length, records: Object.values(counts).reduce((a, b) => a + b, 0), encoding: "gzip-base64", data: await pack(text) };
    try {
      localStorage.setItem(KEY, JSON.stringify(entry));
    } catch {
      throw new ServiceError("STORAGE_FULL", "The backup did not fit in the browser's storage. Reset the demo data or clear old backups.");
    }
    store.setMeta("lastBackupOn", entry.businessDate);
    recordAudit({ entity: "system", entityId: "backup", action: "create", note: `Backup of ${entry.records.toLocaleString("en-IN")} records (${Math.round(entry.bytes / 1024)} KB)` });
    emit("backup.completed", { bytes: entry.bytes, records: entry.records });
    const { data: _d, encoding: _e, ...summary } = entry;
    return summary;
  });

/** Last backup, if any. */
export const getBackupInfo = () => respond(() => info());

/** Put the last backup back (replaces the current data). */
export const restoreBackup = () =>
  respond(async () => {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(KEY) || "null");
    } catch { /* fall through */ }
    if (!raw?.data) throw new ServiceError("NOT_FOUND", "There is no backup to restore yet.");
    store.restore(raw.encoding === "gzip-base64" ? await unpack(raw.data) : raw.data);
    emit("system.reset", { restoredFrom: raw.at });
    return { restoredFrom: raw.at, records: raw.records };
  });

/** Back up once per business date (called when the app starts). @returns {Promise<boolean>} true when a backup ran */
export const ensureDailyBackup = async () => {
  if (store.getMeta("lastBackupOn") === store.getMeta("businessDate")) return false;
  await runBackup();
  return true;
};

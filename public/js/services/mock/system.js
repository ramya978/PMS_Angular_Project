// @ts-check
/**
 * System service: property, business date, demo counter, reset.
 * (Business date = the hotel's working date; it is changed from dev-tools/dev-panel and drives every screen.)
 */
import * as store from "../../core/store.js";
import { emit } from "../../core/events.js";
import { isISODate } from "../../core/format.js";
import { checkIntegrity } from "../../domain/integrity.js";
import { ServiceError, respond } from "./util.js";

/** @returns {Promise<any>} */
export const getProperty = () => respond(() => store.all("property")[0]);

/** @returns {Promise<string>} YYYY-MM-DD */
export const getBusinessDate = () => respond(() => store.getMeta("businessDate"));

/**
 * @param {string} iso YYYY-MM-DD
 * @returns {Promise<string>}
 */
export const setBusinessDate = (iso) =>
  respond(() => {
    if (!isISODate(iso)) throw new ServiceError("VALIDATION", "Enter a real date.", { businessDate: "Enter a real date." });
    const old = store.getMeta("businessDate");
    store.setMeta("businessDate", iso);
    emit("system.businessDateChanged", { old, new: iso });
    return iso;
  });

/** @returns {Promise<number>} */
export const getCounter = () => respond(() => store.get("demo", "counter").value);

/** Demo write used by the welcome page to prove data survives a reload. */
export const bumpCounter = () =>
  respond(() => {
    const row = store.get("demo", "counter");
    const updated = store.update("demo", "counter", { value: row.value + 1 });
    emit("demo.counterChanged", { value: updated.value });
    return updated.value;
  });

/**
 * Restore the demo seed.
 * @param {{ aroundDate?: string }} [opts] build the demo bookings around this business date instead of today
 */
export const resetData = (opts = {}) =>
  respond(() => {
    if (opts.aroundDate !== undefined && !isISODate(opts.aroundDate)) throw new ServiceError("VALIDATION", "Enter a real date.", { aroundDate: "Enter a real date." });
    store.reset(opts.aroundDate);
    emit("system.reset", {});
  });

/** @returns {Promise<{ bytes: number }>} size of the saved demo database */
export const storageInfo = () => respond(() => ({ bytes: store.sizeBytes() }));

/** @returns {Promise<{ counts: Record<string, number>, bytes: number }>} records per collection (developer panel) */
export const getDataSummary = () => respond(() => ({ counts: store.counts(), bytes: store.sizeBytes() }));

/** Run the whole-database check (schemas, references, totals, rooms, inventory). @returns {Promise<{ ok: boolean, records: number, issues: Array<{ rule: string, collection: string, id: string, message: string }> }>} */
export const checkDataIntegrity = () => respond(() => checkIntegrity(store.peekAll()));

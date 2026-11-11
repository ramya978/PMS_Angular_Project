// @ts-check
/**
 * GST on room tariff. Slabs and rates come from the Taxes setup (taxSlabs collection) – never hard-coded.
 * The slab is chosen by the declared room tariff per room per night (≤ ₹7,500 → 5%, above → 18% in the Aviv Kochi setup)
 * and by the stay date (effective dates). Kerala guests / parties pay CGST + SGST; other states pay IGST.
 */
import { percentOf } from "../core/format.js";

/**
 * The slab that applies to a nightly tariff on a date. Newest effective slab wins when two overlap.
 * @param {import("./models.js").TaxSlab[]} slabs
 * @param {number} tariffPaise room tariff per room per night (after discount)
 * @param {string} date night of stay
 * @returns {import("./models.js").TaxSlab | null}
 */
export function findSlab(slabs, tariffPaise, date) {
  const hits = slabs.filter(
    (s) => s.active && s.effectiveFrom <= date && (!s.effectiveTo || date <= s.effectiveTo) && tariffPaise >= s.minRate && (s.maxRate === undefined || s.maxRate === null || tariffPaise <= s.maxRate)
  );
  return hits.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null;
}

/** @param {string} hotelStateCode @param {string | undefined} partyStateCode */
export const isInterState = (hotelStateCode, partyStateCode) => !!partyStateCode && partyStateCode !== hotelStateCode;

/**
 * Tax on an amount. CGST is rounded to the paisa and SGST is the rest, so CGST + SGST always equals the total.
 * @param {number} amountPaise taxable amount
 * @param {import("./models.js").TaxSlab | null} slab
 * @param {boolean} [interState] true → IGST instead of CGST + SGST
 * @returns {{ pct: number, cgst: number, sgst: number, igst: number, total: number }}
 */
export function computeGst(amountPaise, slab, interState = false) {
  if (!slab || amountPaise <= 0) return { pct: slab?.ratePct ?? 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
  if (interState) {
    const igst = percentOf(amountPaise, slab.igstPct);
    return { pct: slab.igstPct, cgst: 0, sgst: 0, igst, total: igst };
  }
  const total = percentOf(amountPaise, slab.ratePct);
  const cgst = percentOf(amountPaise, slab.cgstPct);
  return { pct: slab.ratePct, cgst, sgst: total - cgst, igst: 0, total };
}

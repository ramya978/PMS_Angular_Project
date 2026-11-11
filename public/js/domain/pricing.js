// @ts-check
/**
 * Price of one room for one night: rate for the guests, extra person / extra bed charges, discount, then GST by slab.
 * (Stage 05 builds restrictions, overrides with approval and multi-night totals on top of this.)
 */
import { percentOf } from "../core/format.js";
import { classifyChildren } from "./fieldrules.js";
import { computeGst, findSlab, isInterState } from "./gst.js";
import { resolveRate } from "./rates.js";

/**
 * @typedef {Object} NightInput
 * @property {string} roomTypeId
 * @property {string} ratePlanId
 * @property {string} date                night of stay
 * @property {number} adults
 * @property {number[]} [childAges]
 * @property {boolean} [extraBed]
 * @property {number} [discountPct]       % off the room charge
 * @property {number} [rateOverride]      paise – replaces the plan rate (needs approval above the user's limit; checked elsewhere)
 * @property {string} [partyStateCode]    GST state of the paying party; other than the hotel's state → IGST
 *
 * @typedef {Object} NightPrice
 * @property {string} date
 * @property {number} baseRate     room rate for the persons charged
 * @property {number} extraPersons extra adult charge in paise
 * @property {number} extraBed
 * @property {number} extras       extraPersons + extraBed
 * @property {number} discount
 * @property {number} net          taxable amount = baseRate + extras − discount
 * @property {number} taxPct
 * @property {{ cgst: number, sgst: number, igst: number, total: number }} tax
 * @property {number} total        net + tax
 * @property {boolean} overridden
 */

/**
 * @param {import("./rates.js").PricingContext} ctx
 * @param {NightInput} n
 * @returns {NightPrice | null} null when the plan has no price that night
 */
export function priceNight(ctx, n) {
  const plan = ctx.plans.get(n.ratePlanId);
  if (!plan) return null;
  const kids = classifyChildren(n.childAges ?? [], ctx.params);
  const persons = n.adults + kids.asAdults;
  const rate2 = resolveRate(ctx, n.roomTypeId, n.ratePlanId, n.date, 2);
  const rate1 = resolveRate(ctx, n.roomTypeId, n.ratePlanId, n.date, 1);
  if (rate1 === null || rate2 === null) return null;

  const overridden = n.rateOverride !== undefined;
  const baseRate = overridden ? /** @type {number} */ (n.rateOverride) : persons >= 2 ? rate2 : rate1;
  const extraPersons = Math.max(0, persons - 2) * plan.extraAdultCharge;
  const extraBed = n.extraBed ? plan.extraBedCharge || ctx.params.extraBedCharge : 0;
  const discount = percentOf(baseRate + extraPersons, n.discountPct ?? 0);
  const net = baseRate + extraPersons + extraBed - discount;

  const slab = findSlab(ctx.taxSlabs, net, n.date);
  const gst = computeGst(net, slab, isInterState(ctx.hotelStateCode, n.partyStateCode));
  return {
    date: n.date, baseRate, extraPersons, extraBed, extras: extraPersons + extraBed, discount, net, taxPct: gst.pct,
    tax: { cgst: gst.cgst, sgst: gst.sgst, igst: gst.igst, total: gst.total }, total: net + gst.total, overridden,
  };
}

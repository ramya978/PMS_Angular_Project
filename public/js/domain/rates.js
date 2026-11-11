// @ts-check
/**
 * Rate engine (pure functions). Prices are integer paise per room per night.
 *
 * Only BASE rate plans (BAR-CP in the Aviv Kochi setup) store prices per date (rateCalendar cells: rate1 = single, rate2 = double).
 * Every other plan is DERIVED: its base plan's rate, adjusted for the meal-plan difference (per person) and then by a % or ₹ amount.
 * A stored cell for a derived plan is a manual override and wins over the derivation. This is the logic behind RSS-X01 "Rate derivation engine".
 */
import { addDays, percentOf, weekday } from "../core/format.js";

/** @param {number} paise @returns {number} nearest whole rupee */
export const roundToRupee = (paise) => Math.round(paise / 100) * 100;

/**
 * Hotel-style price ending: nearest ₹100 minus ₹1 (₹8,799, ₹7,999).
 * @param {number} paise
 */
export const psychRound = (paise) => Math.max(9900, Math.round(paise / 10000) * 10000 - 100);

/**
 * @typedef {Object} DateFactorInput
 * @property {import("./models.js").Season[]} seasons
 * @property {import("./models.js").SpecialDate[]} specialDates
 * @property {number[]} weekendDays  weekdays whose NIGHT is a weekend night (0 = Sunday … 6 = Saturday)
 * @property {number} weekendUpliftPct
 */

/**
 * Price multiplier for a night: weekend uplift × the narrowest season covering the date × every special date covering it.
 * @param {string} date
 * @param {DateFactorInput} ctx
 * @returns {number}
 */
export function dateFactor(date, ctx) {
  let factor = ctx.weekendDays.includes(weekday(date)) ? 1 + ctx.weekendUpliftPct / 100 : 1;
  const seasons = ctx.seasons.filter((s) => s.from <= date && date <= s.to);
  if (seasons.length) {
    const narrowest = seasons.reduce((a, b) => (spanOf(b) < spanOf(a) ? b : a));
    factor *= 1 + narrowest.adjustmentPct / 100;
  }
  for (const sp of ctx.specialDates) if (sp.from <= date && date <= sp.to && sp.adjustmentPct) factor *= 1 + sp.adjustmentPct / 100;
  return factor;
}
const spanOf = (/** @type {{ from: string, to: string }} */ s) => Date.parse(s.to) - Date.parse(s.from);

/**
 * Stored base prices for a night: double occupancy from the room type's base price, single about 8% lower.
 * @param {number} baseDouble room type base price (regular weekday, CP, double occupancy)
 * @param {string} date
 * @param {DateFactorInput} ctx
 * @returns {{ rate1: number, rate2: number }}
 */
export function baseRatesForNight(baseDouble, date, ctx) {
  const factor = dateFactor(date, ctx);
  const rate2 = factor === 1 ? baseDouble : psychRound(baseDouble * factor); // a plain weekday keeps the exact base price
  const rate1 = psychRound(rate2 * 0.92);
  return { rate1: Math.min(rate1, rate2), rate2 };
}

/** Cost of the meals a plan includes, per person per day. @param {import("./models.js").MealPlan} m */
export const mealCost = (m) => (m.includesBreakfast ? m.breakfast : 0) + (m.includesLunch ? m.lunch : 0) + (m.includesDinner ? m.dinner : 0);

/**
 * Lookup tables used by the rate and price functions.
 * @typedef {Object} PricingContext
 * @property {Map<string, import("./models.js").RatePlan>} plans
 * @property {Map<string, import("./models.js").MealPlan>} meals
 * @property {(roomTypeId: string, ratePlanId: string, date: string) => import("./models.js").RateCalendarCell | undefined} cell
 * @property {import("./models.js").TaxSlab[]} taxSlabs
 * @property {import("./models.js").ReservationParameters} params
 * @property {string} hotelStateCode
 */

/**
 * @param {{ ratePlans: import("./models.js").RatePlan[], mealPlans: import("./models.js").MealPlan[], rateCalendar: import("./models.js").RateCalendarCell[], taxSlabs: import("./models.js").TaxSlab[], params: import("./models.js").ReservationParameters, hotelStateCode: string }} src
 * @returns {PricingContext}
 */
export function createPricingContext(src) {
  const cells = new Map(src.rateCalendar.map((c) => [`${c.roomTypeId}|${c.ratePlanId}|${c.date}`, c]));
  return {
    plans: new Map(src.ratePlans.map((p) => [p.id, p])),
    meals: new Map(src.mealPlans.map((m) => [m.id, m])),
    cell: (rt, rp, d) => cells.get(`${rt}|${rp}|${d}`),
    taxSlabs: src.taxSlabs,
    params: src.params,
    hotelStateCode: src.hotelStateCode,
  };
}

/**
 * Rate of a plan for one room, one night and 1 or 2 persons (more guests are handled by the price function as extra-person charges).
 * @param {PricingContext} ctx
 * @param {string} roomTypeId
 * @param {string} ratePlanId
 * @param {string} date
 * @param {1 | 2} persons
 * @returns {number | null} paise, or null when the plan has no price for that night
 */
export function resolveRate(ctx, roomTypeId, ratePlanId, date, persons) {
  const plan = ctx.plans.get(ratePlanId);
  if (!plan) return null;
  const stored = ctx.cell(roomTypeId, ratePlanId, date);
  if (stored) return persons === 1 ? stored.rate1 : stored.rate2;
  if (!plan.derivation || plan.isBase) return null;
  const base = ctx.plans.get(plan.derivation.baseRatePlanId);
  if (!base) return null;
  const baseRate = resolveRate(ctx, roomTypeId, base.id, date, persons);
  if (baseRate === null) return null;
  const mine = ctx.meals.get(plan.mealPlanId);
  const theirs = ctx.meals.get(base.mealPlanId);
  if (!mine || !theirs) return null;
  let rate = baseRate + (mealCost(mine) - mealCost(theirs)) * persons;
  if (plan.derivation.mode === "percent") rate += percentOf(rate, plan.derivation.value);
  else if (plan.derivation.mode === "amount") rate += plan.derivation.value;
  return Math.max(0, roundToRupee(rate));
}

/**
 * Prices for every night of a date range, for a quick availability / rate sheet.
 * @param {PricingContext} ctx
 * @param {string} roomTypeId
 * @param {string} ratePlanId
 * @param {string} from
 * @param {number} nights
 * @returns {Array<{ date: string, rate1: number | null, rate2: number | null }>}
 */
export function rateSheet(ctx, roomTypeId, ratePlanId, from, nights) {
  return Array.from({ length: nights }, (_, i) => {
    const date = addDays(from, i);
    return { date, rate1: resolveRate(ctx, roomTypeId, ratePlanId, date, 1), rate2: resolveRate(ctx, roomTypeId, ratePlanId, date, 2) };
  });
}

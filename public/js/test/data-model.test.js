// @ts-check
/** Data model – validators, rate / GST / pricing engines, inventory, the Aviv Kochi seed and the mock database. */
import { describe, test, expect } from "./runner.js";
import { createRandom } from "../core/random.js";
import { validate, f } from "../domain/schema.js";
import * as rule from "../domain/fieldrules.js";
import { validateEntity, validateStay } from "../domain/validators.js";
import { SCHEMAS, COLLECTION_NAMES } from "../domain/schemas.js";
import { findSlab, computeGst, isInterState } from "../domain/gst.js";
import { psychRound, roundToRupee, dateFactor, createPricingContext, resolveRate, mealCost } from "../domain/rates.js";
import { priceNight } from "../domain/pricing.js";
import { computeInventory, availability } from "../domain/inventory.js";
import { checkIntegrity } from "../domain/integrity.js";
import { buildSeed } from "../data/seed.js";
import { rupees, formatMoney, addDays, diffDays, isISODate } from "../core/format.js";
import * as store from "../core/store.js";
import { SCHEMA_VERSION } from "../config.js";
import { _setDelayScale } from "../services/mock/util.js";
import * as system from "../services/mock/system.js";

const TODAY = "2026-10-22";
/** @type {import("../core/store.js").Database | undefined} */
let cached;
/** The seed built around a fixed date (so hand-checked numbers never change). */
const seed = () => (cached ??= buildSeed(TODAY));
const col = (/** @type {string} */ name) => /** @type {any[]} */ (seed().collections[name]);

describe("random – seeded and repeatable", () => {
  test("the same seed gives the same numbers, another seed gives different ones", () => {
    const a = createRandom("x"), b = createRandom("x"), c = createRandom("y");
    const seqA = Array.from({ length: 5 }, () => a.next()), seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(Array.from({ length: 5 }, () => c.next())).not.toEqual(seqA);
  });
  test("int stays in range, weighted follows the weights, shuffle keeps every item", () => {
    const r = createRandom(1);
    const ints = Array.from({ length: 500 }, () => r.int(3, 6));
    expect(Math.min(...ints)).toBe(3);
    expect(Math.max(...ints)).toBe(6);
    const picks = Array.from({ length: 2000 }, () => r.weighted([["a", 90], ["b", 10]]));
    const share = picks.filter((p) => p === "a").length / 2000;
    expect(share).toBeGreaterThan(0.85);
    expect(share).toBeLessThan(0.95);
    expect(r.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("schema engine", () => {
  const schema = { name: f.string({ required: true, min: 2 }), rate: f.money({ min: 0 }), kind: f.enum(["a", "b"], { required: true }), on: f.date(), tags: f.array(f.string(), { max: 2 }), box: f.object({ w: f.int({ required: true }) }) };
  test("a good record passes", () => {
    expect(validate({ name: "Aviv", rate: 799900, kind: "a", on: "2026-10-22", tags: ["x"], box: { w: 3 } }, schema).ok).toBe(true);
  });
  test("plain-English messages per field", () => {
    const r = validate({ name: "", kind: "z", rate: 79.99, on: "2026-02-30", tags: ["a", "b", "c"], box: {} }, schema);
    expect(r.errors.name).toBe("Enter name.");
    expect(r.errors.kind).toContain("must be one of");
    expect(r.errors.rate).toContain("whole number of paise");
    expect(r.errors.on).toContain("real date");
    expect(r.errors.tags).toContain("at most 2");
    expect(r.errors["box.w"]).toBe("Enter w.");
  });
  test("floats are never accepted as money and unknown fields are reported", () => {
    expect(validate({ name: "Aviv", kind: "a", rate: 10.5 }, schema).ok).toBe(false);
    expect(validate({ name: "Aviv", kind: "a", surprise: 1 }, schema).errors.surprise).toContain("Unknown field");
    expect(validate({ name: "Aviv", kind: "a", surprise: 1 }, schema, { allowExtra: true }).ok).toBe(true);
  });
  test("optional fields may be empty; required ones may not", () => {
    expect(validate({ name: "Aviv", kind: "a", on: null, rate: undefined }, schema).ok).toBe(true);
    expect(validate({ name: null, kind: "a" }, schema).ok).toBe(false);
  });
  test("custom checks run after the type check", () => {
    const s = { to: f.date({ check: (v, r) => rule.stayDates(r.from, v) }), from: f.date() };
    expect(validate({ from: "2026-10-22", to: "2026-10-22" }, s).errors.to).toBe("Check-out must be after check-in.");
    expect(validate({ from: "2026-10-22", to: "2026-10-23" }, s).ok).toBe(true);
  });
});

describe("field rules", () => {
  test("the hotel's GSTIN passes the check-digit test; a changed digit does not", () => {
    expect(rule.gstin("32AACCE1226H1Z9")).toBeNull();
    expect(rule.gstin("32AACCE1226H1Z8")).toContain("check-digit");
    expect(rule.gstin("99AACCE1226H1Z9")).toContain("state code");
    expect(rule.gstin("abc")).toContain("15 characters");
    expect(rule.gstin("")).toBeNull();
  });
  test("makeGstin produces valid numbers and state is read from the first two digits", () => {
    const g = rule.makeGstin("29", "AABCS1234F", 1);
    expect(rule.gstin(g)).toBeNull();
    expect(rule.stateCodeOfGstin(g)).toBe("29");
    expect(rule.GST_STATES["32"]).toBe("Kerala");
  });
  test("email, phone, PIN, code and room number", () => {
    expect(rule.email("priya.nathan@example.com")).toBeNull();
    expect(rule.email("priya@")).toContain("full email");
    expect(rule.phone("+91 9876543210")).toBeNull();
    expect(rule.phone("+91 5876543210")).toContain("starts with 6, 7, 8 or 9");
    expect(rule.phone("9876543210")).toContain("country code");
    expect(rule.phone("+44 7700900123")).toBeNull();
    expect(rule.phoneAny("+91 4842668888")).toBeNull();
    expect(rule.indianPincode("682003")).toBeNull();
    expect(rule.indianPincode("68200")).toContain("6 digits");
    expect(rule.code("BAR-CP")).toBeNull();
    expect(rule.code("bar cp")).toContain("capital letters");
    expect(rule.roomNumber("305")).toBeNull();
    expect(rule.roomNumber("5")).toContain("3 or 4 digits");
  });
  test("minimum age 18 on the day of stay", () => {
    const check = rule.adultOn(18, "2026-10-22");
    expect(check("2008-10-22")).toBeNull(); // exactly 18
    expect(check("2008-10-23")).toContain("at least 18");
    expect(check("")).toBeNull();
  });
  test("children: up to 11 are free (max 2); 12 and over, or a third young child, count as adults", () => {
    const p = { childFreeMaxAge: 11, childFreeMaxCount: 2 };
    expect(rule.classifyChildren([5, 11], p)).toEqual({ free: 2, asAdults: 0 });
    expect(rule.classifyChildren([11, 12], p)).toEqual({ free: 1, asAdults: 1 });
    expect(rule.classifyChildren([3, 4, 5], p)).toEqual({ free: 2, asAdults: 1 });
    expect(rule.classifyChildren([], p)).toEqual({ free: 0, asAdults: 0 });
  });
});

describe("validators – entities and stays", () => {
  test("every collection has a schema and a type in models.js", async () => {
    const models = await (await fetch("/js/domain/models.js")).text();
    expect(COLLECTION_NAMES.length).toBe(70);
    expect((models.match(/@typedef \{Object\}/g) ?? []).length).toBe(70);
    for (const name of ["Property", "RoomType", "Room", "MealPlan", "TaxSlab", "RatePlan", "RateCalendarCell", "Reservation", "ReservationRoom", "ReservationNight", "InventoryDay", "AuditLog", "Notification", "ApprovalLimit", "GuestProfile"]) {
      expect(models.includes(`@typedef {Object} ${name}\n`)).toBe(true);
    }
  });
  test("validateEntity checks a record against its collection's schema", () => {
    const good = { id: "R-101", number: "101", floor: 1, roomTypeId: "rt-wgr", view: "garden", bed: "king", featureIds: [], status: "ready", active: true };
    expect(validateEntity("rooms", good).ok).toBe(true);
    const bad = validateEntity("rooms", { ...good, number: "7", status: "broken" });
    expect(bad.errors.number).toContain("3 or 4 digits");
    expect(bad.errors.status).toContain("must be one of");
    expect(() => validateEntity("nope", {})).toThrow("No schema");
  });
  test("validateStay: dates, nights, occupancy, extra bed", () => {
    const wgr = col("roomTypes")[0];
    const params = col("reservationParameters")[0];
    const ok = validateStay({ arrival: "2026-11-01", departure: "2026-11-04", adults: 2, childAges: [5] }, wgr, params, TODAY);
    expect(ok).toEqual({});
    expect(validateStay({ arrival: "2026-11-04", departure: "2026-11-04", adults: 2, childAges: [] }, wgr, params, TODAY).departure).toBe("Check-out must be after check-in.");
    expect(validateStay({ arrival: "2026-10-01", departure: "2026-10-03", adults: 2, childAges: [] }, wgr, params, TODAY).arrival).toContain("before today");
    expect(validateStay({ arrival: "2026-11-01", departure: "2026-12-15", adults: 2, childAges: [] }, wgr, params, TODAY).departure).toContain("at most 30 nights");
    expect(validateStay({ arrival: "2026-11-01", departure: "2026-11-02", adults: 4, childAges: [] }, wgr, params, TODAY).adults).toContain("at most 3 adults");
    expect(validateStay({ arrival: "2026-11-01", departure: "2026-11-02", adults: 3, childAges: [14] }, wgr, params, TODAY).adults).toContain("at most 3 adults"); // 14-year-old counts as an adult
    expect(validateStay({ arrival: "2026-11-01", departure: "2026-11-02", adults: 0, childAges: [] }, wgr, params, TODAY).adults).toContain("At least one adult");
    expect(validateStay({ arrival: "2027-12-01", departure: "2027-12-02", adults: 2, childAges: [] }, wgr, params, TODAY).arrival).toContain("365 days ahead");
  });
});

describe("GST by slab (hand-checked)", () => {
  const slabs = () => col("taxSlabs");
  test("₹7,500 is 5%, ₹7,501 is 18% – the boundary", () => {
    expect(findSlab(slabs(), rupees(7500), "2026-11-10")?.id).toBe("tx-5");
    expect(findSlab(slabs(), rupees(7500) + 1, "2026-11-10")?.id).toBe("tx-18");
    expect(findSlab(slabs(), rupees(7501), "2026-11-10")?.id).toBe("tx-18");
    expect(findSlab(slabs(), rupees(1000), "2026-11-10")?.id).toBe("tx-5");
  });
  test("₹7,999 → 18%: ₹1,439.82 = CGST ₹719.91 + SGST ₹719.91", () => {
    const g = computeGst(rupees(7999), findSlab(slabs(), rupees(7999), "2026-11-10"));
    expect(g).toEqual({ pct: 18, cgst: 71991, sgst: 71991, igst: 0, total: 143982 });
  });
  test("₹6,401 → 5% = ₹320.05; CGST + SGST always equals the total even when halves round", () => {
    const g = computeGst(rupees(6401), findSlab(slabs(), rupees(6401), "2026-11-10"));
    expect(g.total).toBe(32005);
    expect(g.cgst + g.sgst).toBe(32005);
    expect(g).toEqual({ pct: 5, cgst: 16003, sgst: 16002, igst: 0, total: 32005 });
  });
  test("other-state party pays IGST instead", () => {
    const g = computeGst(rupees(7999), findSlab(slabs(), rupees(7999), "2026-11-10"), isInterState("32", "29"));
    expect(g).toEqual({ pct: 18, cgst: 0, sgst: 0, igst: 143982, total: 143982 });
    expect(isInterState("32", "32")).toBe(false);
    expect(isInterState("32", undefined)).toBe(false);
  });
  test("effective dates: a new slab applies only from its date; nothing is hard-coded", () => {
    const withNew = [...slabs(), { id: "tx-new", name: "New 12%", minRate: rupees(1001), maxRate: rupees(7500), ratePct: 12, cgstPct: 6, sgstPct: 6, igstPct: 12, effectiveFrom: "2027-04-01", active: true }];
    expect(findSlab(withNew, rupees(5000), "2027-03-31")?.id).toBe("tx-5");
    expect(findSlab(withNew, rupees(5000), "2027-04-01")?.id).toBe("tx-new"); // newest effective slab wins
    expect(findSlab(slabs(), rupees(5000), "2025-09-21")).toBeNull(); // before the first slab
    expect(findSlab(slabs().map((s) => ({ ...s, active: false })), rupees(5000), "2026-11-10")).toBeNull();
  });
  test("no tax on a zero amount", () => {
    expect(computeGst(0, slabs()[0]).total).toBe(0);
  });
});

describe("rate engine (derived rates, hand-checked)", () => {
  const ctx = () => createPricingContext({ ratePlans: col("ratePlans"), mealPlans: col("mealPlans"), rateCalendar: col("rateCalendar"), taxSlabs: col("taxSlabs"), params: col("reservationParameters")[0], hotelStateCode: "32" });
  const D = "2026-11-18"; // a regular Wednesday: no weekend, no special date
  const rate = (/** @type {string} */ plan, /** @type {1 | 2} */ p = 2, /** @type {string} */ rt = "rt-wgr", /** @type {string} */ d = D) => resolveRate(ctx(), rt, plan, d, p);
  test("price endings and rounding helpers", () => {
    expect(psychRound(rupees(7990))).toBe(rupees(7999));
    expect(psychRound(rupees(8777))).toBe(rupees(8799));
    expect(psychRound(rupees(11878.5 | 0))).toBe(rupees(11899));
    expect(roundToRupee(719910)).toBe(719900);
    expect(roundToRupee(719950)).toBe(720000);
    expect(mealCost(col("mealPlans")[1])).toBe(rupees(799));
  });
  test("base plan: the sample prices of the brief on a regular weekday", () => {
    expect(rate("rp-bar-cp")).toBe(rupees(7999));
    expect(rate("rp-bar-cp", 2, "rt-fcr")).toBe(rupees(8499));
    expect(rate("rp-bar-cp", 2, "rt-fcs")).toBe(rupees(14500));
    expect(rate("rp-bar-cp", 2, "rt-fps")).toBe(rupees(24000));
    expect(rate("rp-bar-cp", 1)).toBe(rupees(7399)); // single occupancy ≈ 8% lower
  });
  test("meal plans move the price by the meal values per person (EP −2×799, MAP +2×1,399, AP +2×2,598)", () => {
    expect(rate("rp-bar-ep")).toBe(rupees(6401));
    expect(rate("rp-bar-map")).toBe(rupees(10797));
    expect(rate("rp-bar-ap")).toBe(rupees(13195));
    expect(rate("rp-bar-ep", 1)).toBe(rupees(6600)); // one person: −799 only
  });
  test("linked plans follow the base: Aviv Club −10%, advance −15%, corporate −12%, agent −18%, group −20%, complimentary free", () => {
    expect(rate("rp-club")).toBe(rupees(7199));
    expect(rate("rp-adv15")).toBe(rupees(6799));
    expect(rate("rp-corp")).toBe(rupees(7039));
    expect(rate("rp-agent")).toBe(rupees(6559));
    expect(rate("rp-group")).toBe(rupees(6399));
    expect(rate("rp-comp")).toBe(0);
    expect(rate("rp-ayur")).toBe(rupees(14597)); // MAP price + ₹3,800 therapy supplement
  });
  test("a stored cell on a derived plan is a manual override and wins", () => {
    const cells = [...col("rateCalendar"), { id: "x", roomTypeId: "rt-wgr", ratePlanId: "rp-club", date: D, rate1: 600000, rate2: 650000 }];
    const c = createPricingContext({ ratePlans: col("ratePlans"), mealPlans: col("mealPlans"), rateCalendar: cells, taxSlabs: col("taxSlabs"), params: col("reservationParameters")[0], hotelStateCode: "32" });
    expect(resolveRate(c, "rt-wgr", "rp-club", D, 2)).toBe(650000);
    expect(resolveRate(c, "rt-wgr", "rp-club", addDays(D, 1), 2)).toBe(roundToRupee(resolveRate(c, "rt-wgr", "rp-bar-cp", addDays(D, 1), 2) * 0.9));
  });
  test("dates without a price give null instead of a wrong number", () => {
    expect(rate("rp-bar-cp", 2, "rt-wgr", addDays(TODAY, 900))).toBeNull();
    expect(rate("rp-bar-ep", 2, "rt-wgr", addDays(TODAY, 900))).toBeNull();
    expect(rate("nope")).toBeNull();
  });
  test("season, weekend and special-date factors", () => {
    const dc = { seasons: col("seasons"), specialDates: col("specialDates"), weekendDays: [5, 6], weekendUpliftPct: 10 };
    expect(dateFactor("2026-11-18", dc)).toBe(1);
    expect(dateFactor("2026-11-20", dc)).toBeCloseTo(1.1, 5); // Friday night
    expect(dateFactor("2027-07-14", dc)).toBeCloseTo(0.85, 5); // monsoon
    expect(dateFactor("2026-12-24", dc)).toBeCloseTo(1.35 * 1.1, 5); // peak × Christmas
    expect(dateFactor("2026-11-08", dc)).toBeCloseTo(1.15, 5); // Diwali (Sunday)
  });
  test("calendar: Christmas Eve, monsoon and a weekend in the stored base prices", () => {
    expect(rate("rp-bar-cp", 2, "rt-wgr", "2026-12-24")).toBe(rupees(11899));
    expect(rate("rp-bar-cp", 2, "rt-wgr", "2027-07-14")).toBe(rupees(6799));
    expect(rate("rp-bar-cp", 2, "rt-wgr", "2026-11-20")).toBe(rupees(8799)); // Friday: 7,999 × 1.10 → 8,799
  });
});

describe("nightly price with GST", () => {
  const ctx = () => createPricingContext({ ratePlans: col("ratePlans"), mealPlans: col("mealPlans"), rateCalendar: col("rateCalendar"), taxSlabs: col("taxSlabs"), params: col("reservationParameters")[0], hotelStateCode: "32" });
  const base = { roomTypeId: "rt-wgr", ratePlanId: "rp-bar-cp", date: "2026-11-18", adults: 2 };
  test("Garden Deluxe Room, breakfast, 2 adults: ₹7,999 + 18% = ₹9,438.82", () => {
    const p = /** @type {any} */ (priceNight(ctx(), base));
    expect(p.net).toBe(rupees(7999));
    expect(p.taxPct).toBe(18);
    expect(p.tax).toEqual({ cgst: 71991, sgst: 71991, igst: 0, total: 143982 });
    expect(formatMoney(p.total)).toBe("₹9,438.82");
  });
  test("room only is below the slab boundary, so 5%: ₹6,401 + ₹320.05", () => {
    const p = /** @type {any} */ (priceNight(ctx(), { ...base, ratePlanId: "rp-bar-ep" }));
    expect(p.net).toBe(rupees(6401));
    expect(p.taxPct).toBe(5);
    expect(formatMoney(p.total)).toBe("₹6,721.05");
  });
  test("an extra bed adds ₹1,500 to the taxable amount: ₹9,499 → GST ₹1,709.82", () => {
    const p = /** @type {any} */ (priceNight(ctx(), { ...base, adults: 3, extraBed: true }));
    expect(p.extras).toBe(rupees(1800) + rupees(1500)); // third adult + extra bed
    const q = /** @type {any} */ (priceNight(ctx(), { ...base, extraBed: true }));
    expect(q.net).toBe(rupees(9499));
    expect(q.tax.total).toBe(170982);
  });
  test("children: age 11 stays free, age 12 is charged as a third adult", () => {
    const free = /** @type {any} */ (priceNight(ctx(), { ...base, childAges: [11, 6] }));
    expect(free.net).toBe(rupees(7999));
    const adult = /** @type {any} */ (priceNight(ctx(), { ...base, childAges: [12] }));
    expect(adult.extraPersons).toBe(rupees(1800));
    expect(adult.net).toBe(rupees(9799));
  });
  test("single occupancy uses the single rate", () => {
    expect(/** @type {any} */ (priceNight(ctx(), { ...base, adults: 1 })).net).toBe(rupees(7399));
  });
  test("a 10% discount is taken before tax, and the slab follows the price actually charged: ₹7,199.10 is in the 5% slab → ₹359.96", () => {
    const p = /** @type {any} */ (priceNight(ctx(), { ...base, discountPct: 10 }));
    expect(p.discount).toBe(79990);
    expect(p.net).toBe(719910);
    expect(p.taxPct).toBe(5);
    expect(p.tax).toEqual({ cgst: 17998, sgst: 17998, igst: 0, total: 35996 });
    const small = /** @type {any} */ (priceNight(ctx(), { ...base, discountPct: 5 })); // ₹7,599.05 is still above ₹7,500
    expect(small.taxPct).toBe(18);
  });
  test("other-state company: IGST only", () => {
    const p = /** @type {any} */ (priceNight(ctx(), { ...base, partyStateCode: "29" }));
    expect(p.tax).toEqual({ cgst: 0, sgst: 0, igst: 143982, total: 143982 });
  });
  test("rate override: ₹7,500 is taxed at 5%, ₹7,501 at 18%", () => {
    const a = /** @type {any} */ (priceNight(ctx(), { ...base, rateOverride: rupees(7500) }));
    const b = /** @type {any} */ (priceNight(ctx(), { ...base, rateOverride: rupees(7501) }));
    expect(a.overridden).toBe(true);
    expect(a.taxPct).toBe(5);
    expect(b.taxPct).toBe(18);
  });
  test("complimentary plan: nothing to pay; unknown plan or date: null", () => {
    const p = /** @type {any} */ (priceNight(ctx(), { ...base, ratePlanId: "rp-comp" }));
    expect(p.total).toBe(0);
    expect(priceNight(ctx(), { ...base, date: addDays(TODAY, 900) })).toBeNull();
    expect(priceNight(ctx(), { ...base, ratePlanId: "zzz" })).toBeNull();
  });
});

describe("inventory (rooms free per night)", () => {
  const rooms = [1, 2, 3].map((n) => ({ id: `R${n}`, roomTypeId: "A", active: true }));
  const types = [{ id: "A", code: "A" }];
  const res = (/** @type {string} */ id, /** @type {string} */ status, /** @type {string} */ arrival, /** @type {string} */ departure, /** @type {string} [groupId] */ groupId) => ({ id, status, arrival, departure, ...(groupId ? { groupId } : {}) });
  const line = (/** @type {string} */ id, /** @type {string} */ reservationId) => ({ id, reservationId, roomTypeId: "A" });
  const day = (/** @type {import("../domain/models.js").InventoryDay[]} */ rows, /** @type {string} */ d) => /** @type {any} */ (rows.find((r) => r.date === d));

  test("counts rooms night by night; check-out day is free again", () => {
    const rows = computeInventory({ rooms, outOfOrderPeriods: [], reservations: [res("a", "confirmed", "2026-11-01", "2026-11-03")], reservationRooms: [line("l1", "a")], groupBlocks: [], overbookingLimits: [] }, "2026-11-01", "2026-11-04", types);
    expect([1, 2, 3, 4].map((n) => day(rows, `2026-11-0${n}`).sold)).toEqual([1, 1, 0, 0]);
    expect(availability(day(rows, "2026-11-01"))).toEqual({ free: 2, sellable: 2 });
  });
  test("cancelled and no-show bookings give the room back; checked-out still counts for history", () => {
    const rows = computeInventory({
      rooms, outOfOrderPeriods: [], overbookingLimits: [], groupBlocks: [],
      reservations: [res("a", "cancelled", "2026-11-01", "2026-11-02"), res("b", "no-show", "2026-11-01", "2026-11-02"), res("c", "checked-out", "2026-11-01", "2026-11-02"), res("d", "tentative", "2026-11-01", "2026-11-02")],
      reservationRooms: [line("l1", "a"), line("l2", "b"), line("l3", "c"), line("l4", "d")],
    }, "2026-11-01", "2026-11-01", types);
    expect(day(rows, "2026-11-01").sold).toBe(2);
  });
  test("out-of-order blocks every night from its start to its end date, both included", () => {
    const rows = computeInventory({ rooms, outOfOrderPeriods: [{ id: "o", roomId: "R1", from: "2026-11-02", to: "2026-11-03" }], reservations: [], reservationRooms: [], groupBlocks: [], overbookingLimits: [] }, "2026-11-01", "2026-11-04", types);
    expect([1, 2, 3, 4].map((n) => day(rows, `2026-11-0${n}`).outOfOrder)).toEqual([0, 1, 1, 0]);
    expect(availability(day(rows, "2026-11-02")).free).toBe(2);
  });
  test("a group block holds rooms until members are picked: unpicked = block − released − picked", () => {
    const rows = computeInventory({
      rooms, outOfOrderPeriods: [], overbookingLimits: [], reservations: [res("m1", "confirmed", "2026-11-01", "2026-11-02", "G1")], reservationRooms: [line("l1", "m1")],
      groupBlocks: [{ groupId: "G1", roomTypeId: "A", date: "2026-11-01", rooms: 2, released: 0 }],
    }, "2026-11-01", "2026-11-01", types);
    const d = day(rows, "2026-11-01");
    expect(d).toMatchObject({ sold: 1, groupUnpicked: 1 });
    expect(availability(d).free).toBe(1); // 3 rooms − 1 sold − 1 still held for the group
  });
  test("overbooking allowance adds to what may be sold, never to what is free", () => {
    const rows = computeInventory({ rooms, outOfOrderPeriods: [], reservations: [], reservationRooms: [], groupBlocks: [], overbookingLimits: [{ roomTypeId: "A", from: "2026-11-01", to: "2026-11-30", kind: "overbooking", rooms: 2 }, { roomTypeId: "A", from: "2026-11-01", to: "2026-11-30", kind: "hold", rooms: 1 }] }, "2026-11-01", "2026-11-01", types);
    expect(availability(day(rows, "2026-11-01"))).toEqual({ free: 3, sellable: 5 });
  });
});

describe("the Aviv Kochi demo data (built around 22 Oct 2026)", () => {
  test("loads fast and stays small", () => {
    const t0 = performance.now();
    const s = buildSeed("2026-12-01");
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(1000);
    expect(JSON.stringify(s).length).toBeLessThan(3_000_000);
  });
  test("the same date always gives exactly the same data", () => {
    expect(JSON.stringify(buildSeed(TODAY))).toBe(JSON.stringify(seed()));
  });
  test("every collection in the model has data (except the optional ones) and a schema", () => {
    const empty = COLLECTION_NAMES.filter((n) => !(seed().collections[n]?.length));
    expect(empty).toEqual([]);
    expect(Object.keys(seed().collections).filter((n) => !SCHEMAS[n])).toEqual([]);
  });
  test("property: GSTIN, address, financial year, 92 rooms", () => {
    const p = col("property")[0];
    expect(p.gstin).toBe("32AACCE1226H1Z9");
    expect(p.address).toContain("Bristow Road");
    expect(p.financialYearStartMonth).toBe(4);
    expect(p.rooms).toBe(92);
  });
  test("92 rooms: 48 Garden Deluxe, 40 Deluxe, 3 suites, 1 premium suite", () => {
    const byType = Object.fromEntries(col("roomTypes").map((t) => [t.code, col("rooms").filter((r) => r.roomTypeId === t.id).length]));
    expect(byType).toEqual({ GDLX: 48, PDLX: 40, DLXS: 3, PRMS: 1 });
    expect(col("rooms")).toHaveLength(92);
    expect(new Set(col("rooms").map((r) => r.number)).size).toBe(92);
    expect(col("rooms").filter((r) => r.view === "garden").every((r) => r.roomTypeId === "rt-wgr")).toBe(true);
  });
  test("setup values from the brief: meals, extra bed, check-in / out, children, transfer, taxes", () => {
    const params = col("reservationParameters")[0];
    expect(col("mealPlans").map((m) => m.code)).toEqual(["EP", "CP", "MAP", "AP"]);
    expect(col("mealPlans")[1].breakfast).toBe(rupees(799));
    expect(params).toMatchObject({ checkInTime: "15:00", checkOutTime: "12:00", extraBedCharge: rupees(1500), childFreeMaxAge: 11, childFreeMaxCount: 2, minGuestAge: 18, petsAllowed: false });
    expect(col("addOns").find((a) => a.code === "TRANSFER").price).toBe(rupees(1940));
    expect(col("taxSlabs").map((t) => t.ratePct)).toEqual([5, 18]);
    expect(col("cancellationPolicies")[0].rules[0]).toEqual({ minHoursBefore: 72, penaltyType: "none", penaltyValue: 0 });
    expect(col("rooms").filter((r) => r.featureIds.includes("ft-accessible"))).toHaveLength(2);
  });
  test("rate plans: BAR in four meal plans, Aviv Club, advance purchase, corporate, agent, group, package, complimentary; only BAR-CP stores prices", () => {
    expect(col("ratePlans").map((p) => p.code)).toEqual(["BAR-CP", "BAR-EP", "BAR-MAP", "BAR-AP", "CLUB", "ADV15", "CORP", "AGENT", "GROUP", "PKG-AYUR", "COMP"]);
    expect(new Set(col("rateCalendar").map((c) => c.ratePlanId))).toEqual(new Set(["rp-bar-cp"]));
    const future = col("rateCalendar").filter((c) => c.date >= TODAY && c.roomTypeId === "rt-wgr");
    expect(future.length).toBeGreaterThanOrEqual(365);
    expect(col("ratePlans").filter((p) => p.derivation).every((p) => p.isBase === false)).toBe(true);
  });
  test("guests, companies, groups and the rest of the demo operations", () => {
    expect(col("guests")).toHaveLength(400);
    expect(col("guests").filter((g) => g.nationality !== "IN").length).toBeGreaterThan(40);
    expect(col("guests").filter((g) => g.blacklisted)).toHaveLength(3);
    expect(col("accounts")).toHaveLength(30);
    expect(new Set(col("accounts").map((a) => a.type))).toEqual(new Set(["company", "travel-agent", "government", "airline"]));
    expect(col("groups").map((g) => g.type)).toEqual(["wedding", "conference"]);
    expect(col("groups")[1].hallIds).toEqual(["ol-periyar"]);
    expect(col("roles")).toHaveLength(8);
    expect(col("users").filter((u) => u.active).length).toBe(10);
    expect(col("waitlist").length).toBeGreaterThanOrEqual(4);
    expect(col("enquiries").length).toBeGreaterThanOrEqual(20);
    expect(col("channelMessages").filter((m) => m.status === "failed")).toHaveLength(2);
  });
  test("about 250 bookings in every status; 18 arrivals today; about 60 rooms occupied", () => {
    const r = col("reservations");
    expect(r.length).toBeGreaterThan(235);
    expect(r.length).toBeLessThan(265);
    expect(new Set(r.map((x) => x.status))).toEqual(new Set(["tentative", "confirmed", "guaranteed", "checked-in", "checked-out", "cancelled", "no-show"]));
    expect(r.filter((x) => x.arrival === TODAY && !["cancelled", "no-show"].includes(x.status))).toHaveLength(18);
    const occupied = col("rooms").filter((x) => x.status === "occupied").length;
    expect(occupied).toBeGreaterThan(54);
    expect(occupied).toBeLessThan(66);
    expect(r.every((x) => x.arrival >= addDays(TODAY, -35) && x.arrival <= addDays(TODAY, 100))).toBe(true);
    expect(col("rooms").filter((x) => x.status === "out-of-order")).toHaveLength(1);
  });
  test("room-type inventory equals the bookings for every night and is never negative", () => {
    const bad = col("inventoryDays").filter((d) => availability(d).free < 0);
    expect(bad).toEqual([]);
    const inv = computeInventory({ rooms: col("rooms"), outOfOrderPeriods: col("outOfOrderPeriods"), reservations: col("reservations"), reservationRooms: col("reservationRooms"), groupBlocks: col("groupBlocks"), overbookingLimits: col("overbookingLimits") }, addDays(TODAY, -45), addDays(TODAY, 365), col("roomTypes"));
    expect(inv).toEqual(col("inventoryDays"));
  });
  test("the suites are sold out on the waitlist dates", () => {
    const d = (/** @type {string} */ rt, /** @type {number} */ n) => /** @type {any} */ (col("inventoryDays").find((x) => x.id === `${rt}|${addDays(TODAY, n)}`));
    for (const n of [12, 13, 14]) {
      expect(availability(d("rt-fcs", n)).free).toBe(0);
      expect(availability(d("rt-fps", n)).free).toBe(0);
    }
    expect(col("waitlist").some((w) => w.status === "waiting" && w.roomTypeId === "rt-fcs" && w.from === addDays(TODAY, 12))).toBe(true);
  });
  test("group blocks hold rooms that are not yet picked", () => {
    const wedding = col("groupBlocks").filter((b) => b.groupId === "GRP-0001");
    expect(wedding).toHaveLength(6); // 2 room types × 3 nights
    const night = col("inventoryDays").find((d) => d.id === `rt-wgr|${addDays(TODAY, 32)}`);
    expect(night.groupUnpicked).toBeGreaterThan(0);
  });
  test("totals add up: nights, GST per night, advances, receipts continue without gaps", () => {
    const r = col("reservations").find((x) => x.status === "guaranteed" && x.roomCount === 1);
    const nights = col("reservationNights").filter((n) => n.reservationId === r.id);
    expect(nights).toHaveLength(r.nights);
    expect(nights.every((n) => n.total === n.net + n.tax)).toBe(true);
    const receipts = col("payments").map((p) => p.receiptNo).filter(Boolean).sort();
    expect(new Set(receipts).size).toBe(receipts.length);
    expect(receipts[0]).toBe("RC-26-27-00001");
    const nextBooking = col("numberSeries").find((s) => s.code === "BOOKING").next;
    expect(nextBooking).toBe(Math.max(...col("reservations").map((x) => Number(x.number.slice(3)))) + 1);
  });
  test("whole-database check: schemas, references, totals, rooms, inventory – zero problems", () => {
    const result = checkIntegrity(seed().collections);
    expect(result.issues.map((i) => `${i.rule} ${i.collection} ${i.id}: ${i.message}`)).toEqual([]);
    expect(result.records).toBeGreaterThan(7000);
  });
  test("the same checks pass for other business dates (summer and spring)", () => {
    for (const d of ["2027-03-05", "2026-06-15"]) {
      const r = checkIntegrity(buildSeed(d).collections);
      expect(r.issues.map((i) => `${i.rule} ${i.collection} ${i.id}: ${i.message}`)).toEqual([]);
    }
  });
  test("the integrity check really catches problems", () => {
    const copy = structuredClone(seed().collections);
    copy.reservations[0].guestId = "GP-9999"; // dangling reference
    copy.reservations[1].total += 100; // total no longer adds up
    copy.rooms[0].number = "7"; // bad room number
    const ruleSet = new Set(checkIntegrity(copy).issues.map((i) => i.rule));
    expect(ruleSet.has("reference")).toBe(true);
    expect(ruleSet.has("totals") || ruleSet.has("balance")).toBe(true);
    expect(ruleSet.has("schema")).toBe(true);
    const twin = structuredClone(seed().collections);
    const taken = twin.reservationRooms.find((l) => l.roomId && twin.reservations.find((r) => r.id === l.reservationId).status === "checked-in");
    const other = twin.reservationRooms.find((l) => l.id !== taken.id && l.roomId && l.roomTypeId === taken.roomTypeId && twin.reservations.find((r) => r.id === l.reservationId).status === "checked-in");
    other.roomId = taken.roomId;
    expect(checkIntegrity(twin).issues.some((i) => i.rule === "double-assignment")).toBe(true);
  });
});

describe("mock database with the full demo data", () => {
  const fresh = () => { store._useKeyForTests("avivpms.test3"); store._dropForTests(); };
  test("first load builds the demo data; business date is today's date", () => {
    fresh();
    expect(store.count("rooms")).toBe(92);
    expect(store.count("reservations")).toBeGreaterThan(235);
    expect(isISODate(store.getMeta("businessDate"))).toBe(true);
    store._dropForTests();
  });
  test("changes survive a reload and reset restores the seed", () => {
    fresh();
    const original = store.get("rooms", "R-101").status;
    store.update("rooms", "R-101", { status: "out-of-order" });
    store._useKeyForTests("avivpms.test3");
    expect(store.get("rooms", "R-101").status).toBe("out-of-order");
    store.reset();
    expect(store.get("rooms", "R-101").status).toBe(original);
    store._dropForTests();
  });
  test("reset around another date rebuilds bookings, rates and the business date", () => {
    fresh();
    store.reset("2027-01-10");
    expect(store.getMeta("businessDate")).toBe("2027-01-10");
    expect(store.filter("reservations", (r) => r.arrival === "2027-01-10").length).toBeGreaterThan(10);
    expect(store.get("rateCalendar", `rt-wgr|rp-bar-cp|2027-01-10`)).toBeTruthy();
    store._dropForTests();
  });
  test("query, counts and read-only access work on the large collections", () => {
    fresh();
    const page = store.query("guests", { sort: "lastName", pageSize: 25, page: 2 });
    expect(page.total).toBe(400);
    expect(page.items).toHaveLength(25);
    expect(store.counts().guests).toBe(400);
    expect(Object.keys(store.peekAll()).length).toBeGreaterThan(60);
    store._dropForTests();
  });
  test("migrate: old saved data (versions before 3) is replaced by the full demo data around the saved date; version 3+ keeps changes", () => {
    const old = store.migrate({ version: 2, meta: { businessDate: "2026-12-01" }, collections: { demo: [{ id: "counter", value: 7 }] } });
    expect(old.version).toBe(SCHEMA_VERSION);
    expect(old.meta.businessDate).toBe("2026-12-01");
    expect(old.collections.rooms).toHaveLength(92);
    const keep = store.migrate({ version: 3, meta: { businessDate: "2026-12-01" }, collections: { rooms: [{ id: "R-1", number: "101" }], extra: [{ id: "x" }] } });
    expect(keep.collections.rooms).toHaveLength(1);
    expect(keep.collections.extra).toHaveLength(1);
    expect(keep.collections.guests).toHaveLength(400); // missing collections are added
  });
  test("system service: data summary, integrity check, rebuild around a date", async () => {
    _setDelayScale(0);
    fresh();
    const sum = await system.getDataSummary();
    expect(sum.counts.rooms).toBe(92);
    expect(sum.bytes).toBeLessThan(3_000_000);
    const check = await system.checkDataIntegrity();
    expect(check.issues).toEqual([]);
    expect(check.ok).toBe(true);
    await system.resetData({ aroundDate: "2026-11-15" });
    expect(await system.getBusinessDate()).toBe("2026-11-15");
    await expect(() => system.resetData({ aroundDate: "2026-02-30" })).rejects("VALIDATION");
    store._dropForTests();
    store._useKeyForTests("avivpms.v1");
    _setDelayScale(1);
  });
});

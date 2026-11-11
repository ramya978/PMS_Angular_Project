// @ts-check
/**
 * Reservation-setup demo data for The Aviv Kochi: property, rooms, meal plans, taxes, rate plans and the 365-day rate calendar,
 * seasons, restrictions, policies, parameters, sources / channels, add-ons, lists, templates, numbering and payment modes.
 * Prices are SAMPLE values from the build brief – the hotel replaces them in Reservation Setup. Everything is derived from `today`.
 */
import { rupees, addDays, dateRange } from "../../core/format.js";
import { GST_STATES } from "../../domain/fieldrules.js";
import { baseRatesForNight } from "../../domain/rates.js";
import { yearOf } from "./helpers.js";

export const PROPERTY_ID = "prop-aviv-kochi";
export const HOTEL_STATE = "32"; // Kerala

/** Floors and how many rooms of each type they hold: [GDLX, PDLX, DLXS, PRMS] → 48 / 40 / 3 / 1 = 92 rooms. */
const FLOOR_PLAN = [
  { floor: 1, name: "First floor", counts: [19, 0, 0, 0] },
  { floor: 2, name: "Second floor", counts: [19, 0, 0, 0] },
  { floor: 3, name: "Third floor", counts: [10, 9, 0, 0] },
  { floor: 4, name: "Fourth floor", counts: [0, 18, 0, 0] },
  { floor: 5, name: "Fifth floor", counts: [0, 13, 3, 1] },
];

/** @param {string} today */
export function buildMasters(today) {
  const year = yearOf(today);

  /* ── property ── */
  const property = [{
    id: PROPERTY_ID, name: "The Aviv Kochi", shortName: "The Aviv Kochi",
    address: "Bristow Road, Willingdon Island, Kochi 682 003, Kerala", city: "Kochi", state: "Kerala", pin: "682003", country: "IN",
    phone: "+91 4842668888", email: "reservations@avivkochi.example", website: "https://avivkochi.example", gstin: "32AACCE1226H1Z9", pan: "AACCE1226H", gstStateCode: HOTEL_STATE,
    rooms: 92, checkInTime: "15:00", checkOutTime: "12:00", auditTime: "02:00", financialYearStartMonth: 4, timezone: "Asia/Kolkata", currency: "INR", centralCode: "", clubEnabled: true,
  }];

  /* ── blocks, floors, features ── */
  const blocks = [{ id: "blk-main", code: "MAIN", name: "Main building" }];
  const floors = FLOOR_PLAN.map((f) => ({ id: `fl-${f.floor}`, number: f.floor, name: f.name, blockId: "blk-main" }));
  const roomFeatures = [
    ["garden-view", "Garden view", "view"], ["pool-view", "Pool view", "view"], ["king-bed", "King bed", "bed"], ["twin-beds", "Twin beds", "bed"],
    ["bathtub", "Bathtub", "comfort"], ["balcony", "Balcony", "comfort"], ["workdesk", "Work desk", "comfort"], ["lounge", "Lounge area", "comfort"],
    ["accessible", "Accessible room", "access"], ["connecting", "Connecting door", "access"],
  ].map(([code, name, category]) => ({ id: `ft-${code}`, code: code.toUpperCase(), name, category }));

  /* ── room types ── */
  const roomTypes = [
    { id: "rt-wgr", code: "GDLX", name: "Garden Deluxe Room", description: "Calm garden-facing room with a king or twin bed and a work desk.", baseOccupancy: 2, maxAdults: 3, maxChildren: 2, maxOccupancy: 4, extraBedAllowed: true, bedOptions: ["King", "Twin"], amenities: ["Wi-Fi", "Air conditioning", "Tea / coffee maker", "Work desk", "Garden view"], photos: [], sortOrder: 1, active: true },
    { id: "rt-fcr", code: "PDLX", name: "Pool Deluxe Room", description: "Spacious room overlooking the pool, with a king or twin bed and a seating nook.", baseOccupancy: 2, maxAdults: 3, maxChildren: 2, maxOccupancy: 4, extraBedAllowed: true, bedOptions: ["King", "Twin"], amenities: ["Wi-Fi", "Air conditioning", "Tea / coffee maker", "Seating nook", "Pool view"], photos: [], sortOrder: 2, active: true },
    { id: "rt-fcs", code: "DLXS", name: "Deluxe Suite", description: "Suite with a separate lounge, bathtub and pool view.", baseOccupancy: 2, maxAdults: 3, maxChildren: 2, maxOccupancy: 4, extraBedAllowed: true, bedOptions: ["King"], amenities: ["Wi-Fi", "Air conditioning", "Separate lounge", "Bathtub", "Pool view"], photos: [], sortOrder: 3, active: true },
    { id: "rt-fps", code: "PRMS", name: "Premium Suite", description: "Our largest suite: lounge, dining nook, bathtub and the best view of the pool.", baseOccupancy: 2, maxAdults: 4, maxChildren: 2, maxOccupancy: 5, extraBedAllowed: true, bedOptions: ["King"], amenities: ["Wi-Fi", "Air conditioning", "Separate lounge", "Dining nook", "Bathtub", "Pool view"], photos: [], sortOrder: 4, active: true },
  ];
  const typeIds = ["rt-wgr", "rt-fcr", "rt-fcs", "rt-fps"];

  /* ── rooms: 92 ── */
  /** @type {import("../../domain/models.js").Room[]} */
  const rooms = [];
  for (const fl of FLOOR_PLAN) {
    let n = 0;
    fl.counts.forEach((count, ti) => {
      for (let i = 0; i < count; i++) {
        n++;
        const number = `${fl.floor}${String(n).padStart(2, "0")}`;
        const typeId = typeIds[ti];
        const view = ti === 0 ? "garden" : "pool";
        const bed = ti >= 2 ? "king" : n % 5 < 3 ? "king" : "twin";
        const featureIds = [view === "garden" ? "ft-garden-view" : "ft-pool-view", bed === "king" ? "ft-king-bed" : "ft-twin-beds"];
        if (ti === 2 || ti === 3) featureIds.push("ft-bathtub", "ft-lounge");
        if (ti === 1 && n % 4 === 0) featureIds.push("ft-balcony");
        if (ti === 0) featureIds.push("ft-workdesk");
        rooms.push({ id: `R-${number}`, number, floor: fl.floor, roomTypeId: typeId, view, bed, featureIds, lockId: `LK-${number}`, status: "ready", active: true });
      }
    });
  }
  // a few accessible and connecting rooms
  for (const num of ["101", "102"]) {
    const r = /** @type {any} */ (rooms.find((x) => x.number === num));
    r.featureIds.push("ft-accessible");
  }
  for (const [a, b] of [["301", "302"], ["411", "412"]]) {
    const ra = /** @type {any} */ (rooms.find((x) => x.number === a));
    const rb = /** @type {any} */ (rooms.find((x) => x.number === b));
    ra.connectingRoomId = rb.id; rb.connectingRoomId = ra.id;
    ra.featureIds.push("ft-connecting"); rb.featureIds.push("ft-connecting");
  }

  /* ── meal plans ── */
  const mealPlans = [
    { id: "mp-ep", code: "EP", name: "Room only", description: "No meals included.", breakfast: rupees(799), lunch: rupees(1199), dinner: rupees(1399), includesBreakfast: false, includesLunch: false, includesDinner: false, active: true },
    { id: "mp-cp", code: "CP", name: "Room with breakfast", description: "Breakfast for every guest.", breakfast: rupees(799), lunch: rupees(1199), dinner: rupees(1399), includesBreakfast: true, includesLunch: false, includesDinner: false, active: true },
    { id: "mp-map", code: "MAP", name: "Breakfast and dinner", description: "Breakfast and dinner for every guest.", breakfast: rupees(799), lunch: rupees(1199), dinner: rupees(1399), includesBreakfast: true, includesLunch: false, includesDinner: true, active: true },
    { id: "mp-ap", code: "AP", name: "All meals", description: "Breakfast, lunch and dinner for every guest.", breakfast: rupees(799), lunch: rupees(1199), dinner: rupees(1399), includesBreakfast: true, includesLunch: true, includesDinner: true, active: true },
  ];

  /* ── taxes (GST on room tariff per room per night) ── */
  const taxSlabs = [
    { id: "tx-5", name: "GST 5% – room tariff up to ₹7,500", minRate: 0, maxRate: rupees(7500), ratePct: 5, cgstPct: 2.5, sgstPct: 2.5, igstPct: 5, effectiveFrom: "2025-09-22", active: true },
    { id: "tx-18", name: "GST 18% – room tariff above ₹7,500", minRate: rupees(7500) + 1, ratePct: 18, cgstPct: 9, sgstPct: 9, igstPct: 18, effectiveFrom: "2025-09-22", active: true },
  ];

  /* ── policies ── */
  const cancellationPolicies = [
    { id: "cp-std", code: "STD", name: "Standard – free until 72 hours", rules: [{ minHoursBefore: 72, penaltyType: "none", penaltyValue: 0 }, { minHoursBefore: 0, penaltyType: "nights", penaltyValue: 1 }], noShowPenalty: { type: "nights", value: 1 }, nonRefundable: false, guestText: "Free cancellation until 72 hours before arrival. After that, the first night is charged. A no-show is charged the first night.", active: true },
    { id: "cp-peak", code: "PEAK", name: "Peak season – free until 7 days", rules: [{ minHoursBefore: 168, penaltyType: "none", penaltyValue: 0 }, { minHoursBefore: 72, penaltyType: "nights", penaltyValue: 1 }, { minHoursBefore: 0, penaltyType: "nights", penaltyValue: 2 }], noShowPenalty: { type: "nights", value: 2 }, nonRefundable: false, guestText: "Peak season: free cancellation until 7 days before arrival. Between 7 and 3 days one night is charged; inside 3 days two nights are charged.", active: true },
    { id: "cp-nr", code: "NONREF", name: "Non-refundable", rules: [{ minHoursBefore: 0, penaltyType: "percent", penaltyValue: 100 }], noShowPenalty: { type: "percent", value: 100 }, nonRefundable: true, guestText: "This rate is non-refundable. The full stay is charged if you cancel, change or do not arrive.", active: true },
    { id: "cp-group", code: "GROUP", name: "Group – staged charges", rules: [{ minHoursBefore: 720, penaltyType: "none", penaltyValue: 0 }, { minHoursBefore: 336, penaltyType: "percent", penaltyValue: 50 }, { minHoursBefore: 0, penaltyType: "percent", penaltyValue: 100 }], noShowPenalty: { type: "percent", value: 100 }, nonRefundable: false, guestText: "Groups: free until 30 days before arrival, 50% of the block between 30 and 14 days, full charge inside 14 days.", active: true },
  ];
  const depositPolicies = [
    { id: "dp-std", code: "STD", name: "Standard – one night advance", kind: "nights", value: 1, dueRule: "days-after-booking", dueDays: 3, ifUnpaid: "alert", acceptedGuarantees: ["card", "advance", "company", "agent"], guestText: "One night's charge is due within 3 days of booking to guarantee the room.", active: true },
    { id: "dp-nr", code: "FULL", name: "Full payment at booking", kind: "percent", value: 100, dueRule: "on-booking", dueDays: 0, ifUnpaid: "cancel", acceptedGuarantees: ["advance", "card"], guestText: "The full amount is charged when you book.", active: true },
    { id: "dp-group", code: "GROUP", name: "Group – 25% at confirmation", kind: "percent", value: 25, dueRule: "days-after-booking", dueDays: 7, ifUnpaid: "release", acceptedGuarantees: ["advance", "company"], guestText: "25% of the room block is due within 7 days of confirmation; the balance is due before arrival.", active: true },
    { id: "dp-credit", code: "CREDIT", name: "Company credit – no advance", kind: "none", value: 0, dueRule: "on-booking", dueDays: 0, ifUnpaid: "alert", acceptedGuarantees: ["company", "agent"], guestText: "Billed to the company account on departure.", active: true },
  ];

  /* ── reservation parameters ── */
  const reservationParameters = [{
    id: "params", checkInTime: "15:00", checkOutTime: "12:00", minGuestAge: 18, childFreeMaxAge: 11, childFreeMaxCount: 2, extraBedCharge: rupees(1500), maxExtraBedsPerRoom: 1,
    defaultOptionDays: 3, maxAdvanceBookingDays: 365, maxStayNights: 30, maxRoomsPerBooking: 5, petsAllowed: false, sessionTimeoutMinutes: 20,
    defaultSourceId: "src-phone", defaultSegmentId: "seg-leisure", gstStateCode: HOTEL_STATE, currency: "INR", auditTime: "02:00", weekendDays: [5, 6], weekendUpliftPct: 10,
  }];

  /* ── channels, sources, segments, mapping ── */
  const channels = [
    { id: "ch-app", code: "APP", name: "Aviv mobile app (CRS)", type: "brand", commissionPct: 0, protocol: "Central reservation system (CRS)", active: true },
    { id: "ch-website", code: "WEBSITE", name: "Aviv website booking engine", type: "website", commissionPct: 0, protocol: "Direct", active: true },
    { id: "ch-booking", code: "BOOKING", name: "Booking.com", type: "ota", commissionPct: 15, protocol: "Channel manager", active: true },
    { id: "ch-agoda", code: "AGODA", name: "Agoda", type: "ota", commissionPct: 18, protocol: "Channel manager", active: true },
    { id: "ch-expedia", code: "EXPEDIA", name: "Expedia", type: "ota", commissionPct: 18, protocol: "Channel manager", active: true },
    { id: "ch-mmt", code: "MMT", name: "MakeMyTrip / Goibibo", type: "ota", commissionPct: 17, protocol: "Channel manager", active: true },
    { id: "ch-eamt", code: "EASEMYTRIP", name: "EaseMyTrip", type: "ota", commissionPct: 15, protocol: "Channel manager", active: true },
    { id: "ch-trip", code: "TRIP", name: "Trip.com", type: "ota", commissionPct: 15, protocol: "Channel manager", active: true },
  ].map((c) => ({ ...c, contactEmail: `${c.code.toLowerCase()}@channels.avivkochi.example` }));

  const sources = [
    { id: "src-app", code: "APP", name: "Aviv mobile app", type: "brand", channelId: "ch-app" },
    { id: "src-website", code: "WEBSITE", name: "Aviv website", type: "direct", channelId: "ch-website" },
    { id: "src-booking", code: "BOOKING", name: "Booking.com", type: "ota", channelId: "ch-booking" },
    { id: "src-agoda", code: "AGODA", name: "Agoda", type: "ota", channelId: "ch-agoda" },
    { id: "src-expedia", code: "EXPEDIA", name: "Expedia", type: "ota", channelId: "ch-expedia" },
    { id: "src-mmt", code: "MMT", name: "MakeMyTrip / Goibibo", type: "ota", channelId: "ch-mmt" },
    { id: "src-eamt", code: "EASEMYTRIP", name: "EaseMyTrip", type: "ota", channelId: "ch-eamt" },
    { id: "src-trip", code: "TRIP", name: "Trip.com", type: "ota", channelId: "ch-trip" },
    { id: "src-walkin", code: "WALKIN", name: "Walk-in", type: "walk-in" },
    { id: "src-phone", code: "PHONE", name: "Phone", type: "direct" },
    { id: "src-email", code: "EMAIL", name: "Email", type: "direct" },
    { id: "src-whatsapp", code: "WHATSAPP", name: "WhatsApp", type: "direct" },
    { id: "src-agent", code: "AGENT", name: "Travel agent", type: "agent" },
    { id: "src-company", code: "COMPANY", name: "Company booking", type: "corporate" },
  ].map((s) => ({ ...s, active: true }));

  const segments = [
    ["seg-leisure", "LEISURE", "Leisure (FIT)"], ["seg-corporate", "CORPORATE", "Corporate"], ["seg-mice", "MICE", "Conference & events"], ["seg-wedding", "WEDDING", "Wedding"],
    ["seg-agent", "AGENT", "Travel agent"], ["seg-ota", "OTA", "Online travel agency"], ["seg-club", "CLUB", "Club member"], ["seg-govt", "GOVT", "Government"],
    ["seg-longstay", "LONGSTAY", "Long stay"], ["seg-comp", "COMP", "Complimentary"],
  ].map(([id, code, name]) => ({ id, code, name, active: true }));

  /* ── rate plans ── */
  const plan = (/** @type {Partial<import("../../domain/models.js").RatePlan> & { id: string, code: string, name: string, type: any, mealPlanId: string }} */ o) => ({
    description: "", isBase: false, roomTypeIds: typeIds, extraAdultCharge: rupees(1800), extraChildCharge: 0, extraBedCharge: rupees(1500), inclusions: [],
    cancellationPolicyId: "cp-std", depositPolicyId: "dp-std", channelIds: channels.map((c) => c.id), bookingWindow: { minAdvanceDays: 0, maxAdvanceDays: 365 }, visibility: "public",
    sortOrder: 0, active: true, ...o,
  });
  /** @type {import("../../domain/models.js").RatePlan[]} */
  const ratePlans = [
    plan({ id: "rp-bar-cp", code: "BAR-CP", name: "Best available rate – with breakfast", type: "bar", mealPlanId: "mp-cp", isBase: true, inclusions: ["Breakfast", "Wi-Fi"], description: "Base rate. Every other rate follows it.", sortOrder: 1 }),
    plan({ id: "rp-bar-ep", code: "BAR-EP", name: "Best available rate – room only", type: "bar", mealPlanId: "mp-ep", derivation: { baseRatePlanId: "rp-bar-cp", mode: "none", value: 0 }, inclusions: ["Wi-Fi"], sortOrder: 2 }),
    plan({ id: "rp-bar-map", code: "BAR-MAP", name: "Best available rate – breakfast and dinner", type: "bar", mealPlanId: "mp-map", derivation: { baseRatePlanId: "rp-bar-cp", mode: "none", value: 0 }, inclusions: ["Breakfast", "Dinner", "Wi-Fi"], sortOrder: 3 }),
    plan({ id: "rp-bar-ap", code: "BAR-AP", name: "Best available rate – all meals", type: "bar", mealPlanId: "mp-ap", derivation: { baseRatePlanId: "rp-bar-cp", mode: "none", value: 0 }, inclusions: ["Breakfast", "Lunch", "Dinner", "Wi-Fi"], sortOrder: 4 }),
    plan({ id: "rp-club", code: "CLUB", name: "Member rate", type: "member", mealPlanId: "mp-cp", derivation: { baseRatePlanId: "rp-bar-cp", mode: "percent", value: -10 }, visibility: "members", inclusions: ["Breakfast", "Wi-Fi", "Late check-out on request"], sortOrder: 5 }),
    plan({ id: "rp-adv15", code: "ADV15", name: "Advance purchase – 15% off", type: "advance", mealPlanId: "mp-cp", derivation: { baseRatePlanId: "rp-bar-cp", mode: "percent", value: -15 }, cancellationPolicyId: "cp-nr", depositPolicyId: "dp-nr", bookingWindow: { minAdvanceDays: 14, maxAdvanceDays: 365 }, inclusions: ["Breakfast", "Wi-Fi"], sortOrder: 6 }),
    plan({ id: "rp-corp", code: "CORP", name: "Corporate rate", type: "corporate", mealPlanId: "mp-cp", derivation: { baseRatePlanId: "rp-bar-cp", mode: "percent", value: -12 }, visibility: "corporate", depositPolicyId: "dp-credit", inclusions: ["Breakfast", "Wi-Fi"], sortOrder: 7 }),
    plan({ id: "rp-agent", code: "AGENT", name: "Travel agent net rate", type: "agent", mealPlanId: "mp-cp", derivation: { baseRatePlanId: "rp-bar-cp", mode: "percent", value: -18 }, visibility: "agents", depositPolicyId: "dp-credit", inclusions: ["Breakfast", "Wi-Fi"], sortOrder: 8 }),
    plan({ id: "rp-group", code: "GROUP", name: "Group rate", type: "group", mealPlanId: "mp-cp", derivation: { baseRatePlanId: "rp-bar-cp", mode: "percent", value: -20 }, visibility: "hidden", cancellationPolicyId: "cp-group", depositPolicyId: "dp-group", inclusions: ["Breakfast", "Wi-Fi"], sortOrder: 9 }),
    plan({ id: "rp-ayur", code: "PKG-AYUR", name: "Ayurveda retreat package", type: "package", mealPlanId: "mp-map", derivation: { baseRatePlanId: "rp-bar-cp", mode: "amount", value: rupees(3800) }, packageId: "pkg-ayur", minStay: 3, inclusions: ["Breakfast", "Dinner", "Daily Ayurveda therapy", "Wi-Fi"], sortOrder: 10 }),
    plan({ id: "rp-comp", code: "COMP", name: "Complimentary", type: "complimentary", mealPlanId: "mp-cp", derivation: { baseRatePlanId: "rp-bar-cp", mode: "percent", value: -100 }, visibility: "hidden", depositPolicyId: "dp-credit", channelIds: [], sortOrder: 11 }),
  ];
  // sell the base plan to every channel; hide package / member from OTAs
  const own = ["ch-app", "ch-website"];
  for (const p of ratePlans) {
    if (["rp-club", "rp-corp", "rp-agent", "rp-group", "rp-ayur"].includes(p.id)) p.channelIds = p.id === "rp-club" ? own : p.id === "rp-ayur" ? own : [];
  }

  /* ── seasons and special dates ── */
  /** @type {import("../../domain/models.js").Season[]} */
  const seasons = [];
  for (let y = year - 1; y <= year + 2; y++) {
    seasons.push(
      { id: `ss-regular-a-${y}`, name: "Regular season", kind: "regular", from: `${y}-01-06`, to: `${y}-03-31`, adjustmentPct: 0, notes: "" },
      { id: `ss-shoulder-${y}`, name: "Summer shoulder", kind: "shoulder", from: `${y}-04-01`, to: `${y}-05-31`, adjustmentPct: -5, notes: "" },
      { id: `ss-monsoon-${y}`, name: "Monsoon", kind: "monsoon", from: `${y}-06-01`, to: `${y}-09-30`, adjustmentPct: -15, notes: "Kerala monsoon – lower demand" },
      { id: `ss-regular-b-${y}`, name: "Regular season", kind: "regular", from: `${y}-10-01`, to: `${y}-12-19`, adjustmentPct: 0, notes: "" },
      { id: `ss-peak-${y}`, name: "Christmas – New Year peak", kind: "peak", from: `${y}-12-20`, to: `${y + 1}-01-05`, adjustmentPct: 35, notes: "Peak of the tourist season" },
    );
  }
  /** @type {import("../../domain/models.js").SpecialDate[]} */
  const specialDates = [];
  const diwali = { 2025: "2025-10-20", 2026: "2026-11-08", 2027: "2027-10-29", 2028: "2028-10-17" };
  const onam = { 2025: ["2025-09-03", "2025-09-07"], 2026: ["2026-08-24", "2026-08-28"], 2027: ["2027-09-10", "2027-09-14"], 2028: ["2028-08-29", "2028-09-02"] };
  for (let y = year - 1; y <= year + 2; y++) {
    const dw = /** @type {Record<number, string>} */ (diwali)[y];
    if (dw) specialDates.push({ id: `sd-diwali-${y}`, name: "Diwali", kind: "festival", from: dw, to: addDays(dw, 1), adjustmentPct: 15, minStay: 2, approximate: true, notes: "Dates to be confirmed by the hotel" });
    const on = /** @type {Record<number, string[]>} */ (onam)[y];
    if (on) specialDates.push({ id: `sd-onam-${y}`, name: "Onam week", kind: "festival", from: on[0], to: on[1], adjustmentPct: 20, approximate: true, notes: "Dates to be confirmed by the hotel" });
    specialDates.push(
      { id: `sd-vishu-${y}`, name: "Vishu", kind: "festival", from: `${y}-04-14`, to: `${y}-04-15`, adjustmentPct: 10, approximate: true, notes: "Dates to be confirmed by the hotel" },
      { id: `sd-christmas-${y}`, name: "Christmas", kind: "holiday", from: `${y}-12-24`, to: `${y}-12-26`, adjustmentPct: 10, minStay: 2, approximate: false, notes: "" },
      { id: `sd-nye-${y}`, name: "New Year's Eve gala", kind: "event", from: `${y}-12-30`, to: `${y}-12-31`, adjustmentPct: 15, minStay: 2, approximate: false, notes: "Gala dinner on 31 December" },
    );
  }
  const dateCtx = { seasons, specialDates, weekendDays: [5, 6], weekendUpliftPct: 10 };

  /* ── rate calendar: stored only for the base plan (BAR-CP); other plans are derived ── */
  const basePrice = { "rt-wgr": rupees(7999), "rt-fcr": rupees(8499), "rt-fcs": rupees(14500), "rt-fps": rupees(24000) };
  /** @type {import("../../domain/models.js").RateCalendarCell[]} */
  const rateCalendar = [];
  for (const d of dateRange(addDays(today, -45), addDays(today, 366))) { // 45 days of history (for past bookings) + a full year ahead
    for (const rt of typeIds) {
      const { rate1, rate2 } = baseRatesForNight(/** @type {Record<string, number>} */ (basePrice)[rt], d, dateCtx);
      rateCalendar.push({ id: `${rt}|rp-bar-cp|${d}`, roomTypeId: rt, ratePlanId: "rp-bar-cp", date: d, rate1, rate2 });
    }
  }

  /* ── restrictions and overbooking ── */
  const restrictions = [
    { id: "rs-nye", roomTypeId: undefined, ratePlanId: undefined, from: `${year}-12-30`, to: `${year}-12-31`, minStay: 2, closedToArrival: false, closedToDeparture: false, stopSell: false, reason: "New Year's Eve gala – minimum 2 nights", createdBy: "u-arjun" },
    { id: "rs-xmas", roomTypeId: undefined, ratePlanId: undefined, from: `${year}-12-24`, to: `${year}-12-25`, minStay: 2, closedToArrival: false, closedToDeparture: false, stopSell: false, reason: "Christmas – minimum 2 nights", createdBy: "u-arjun" },
    { id: "rs-adv-wknd", roomTypeId: undefined, ratePlanId: "rp-adv15", from: today, to: addDays(today, 365), daysOfWeek: [5, 6], closedToArrival: true, closedToDeparture: false, stopSell: false, reason: "Advance-purchase rate is not sold for weekend arrivals", createdBy: "u-arjun" },
    { id: "rs-fps-maint", roomTypeId: "rt-fps", ratePlanId: undefined, from: addDays(today, 60), to: addDays(today, 63), closedToArrival: false, closedToDeparture: false, stopSell: true, reason: "Premium Suite closed for deep cleaning", createdBy: "u-arjun" },
    { id: "rs-long-min", roomTypeId: "rt-fcs", ratePlanId: undefined, from: addDays(today, 20), to: addDays(today, 27), minStay: 2, closedToArrival: false, closedToDeparture: false, stopSell: false, reason: "Suites: minimum 2 nights in the next fortnight", createdBy: "u-arjun" },
  ].map((r) => stripUndefined(r));
  const overbookingLimits = [
    { id: "ob-wgr", roomTypeId: "rt-wgr", from: today, to: addDays(today, 365), kind: "overbooking", rooms: 2, notes: "Usual no-show cover" },
    { id: "ob-fcr", roomTypeId: "rt-fcr", from: today, to: addDays(today, 365), kind: "overbooking", rooms: 1, notes: "Usual no-show cover" },
  ].map((r) => stripUndefined(r));

  /* ── outlets and add-ons ── */
  const outlets = [
    { id: "ol-travancore", code: "TRAVANCORE", name: "Travancore Restaurant", type: "restaurant", capacity: 90, active: true },
    { id: "ol-seafood", code: "SEAFOOD", name: "Seafood Grill", type: "restaurant", seasonFromMonth: 10, seasonToMonth: 3, capacity: 40, active: true },
    { id: "ol-bar", code: "TRADEBAR", name: "Cochin Trade Bar", type: "bar", capacity: 45, active: true },
    { id: "ol-irdining", code: "IRD", name: "In-room Dining", type: "room-service", active: true },
    { id: "ol-ayur", code: "AYUR", name: "Ayurvedic Centre", type: "spa", capacity: 8, active: true },
    { id: "ol-periyar", code: "PERIYAR", name: "Periyar Hall", type: "hall", capacity: 220, active: true },
    { id: "ol-meenachil", code: "MEENACHIL", name: "Meenachil Hall", type: "hall", capacity: 120, active: true },
  ].map((o) => stripUndefined(o));
  const addOns = [
    { id: "ao-extrabed", code: "EXTRABED", name: "Extra bed", description: "Roll-away bed with bedding", price: rupees(1500), unit: "per-night", taxPct: 18, department: "housekeeping", postingRule: "daily", maxQuantity: 1 },
    { id: "ao-breakfast", code: "BKFAST", name: "Breakfast", description: "Buffet breakfast, Travancore Restaurant", price: rupees(799), unit: "per-person-per-night", taxPct: 5, department: "f&b", outletId: "ol-travancore", postingRule: "daily" },
    { id: "ao-transfer", code: "TRANSFER", name: "Airport transfer (one way)", description: "Cochin airport to hotel or back", price: rupees(1940), unit: "per-item", taxPct: 18, department: "transport", postingRule: "on-date", maxQuantity: 4 },
    { id: "ao-gala", code: "GALA", name: "Gala dinner", description: "Christmas Eve / New Year's Eve gala", price: rupees(4500), unit: "per-person", taxPct: 5, department: "f&b", outletId: "ol-travancore", postingRule: "on-date" },
    { id: "ao-ayur", code: "AYURSESS", name: "Ayurveda therapy session", description: "60-minute therapy, Ayurvedic Centre", price: rupees(3500), unit: "per-person", taxPct: 18, department: "spa", outletId: "ol-ayur", postingRule: "on-date" },
    { id: "ao-seafood", code: "SEAFOOD", name: "Seafood Grill dinner", description: "Set dinner (October to March)", price: rupees(2800), unit: "per-person", taxPct: 5, department: "f&b", outletId: "ol-seafood", postingRule: "on-date" },
    { id: "ao-earlyci", code: "EARLYCI", name: "Early check-in", description: "Room from 09:00 (subject to availability)", price: rupees(2000), unit: "per-stay", taxPct: 18, department: "front-office", postingRule: "on-checkin", maxQuantity: 1 },
    { id: "ao-latecout", code: "LATECO", name: "Late check-out (until 18:00)", description: "Subject to availability", price: rupees(2500), unit: "per-stay", taxPct: 18, department: "front-office", postingRule: "on-checkout", maxQuantity: 1 },
    { id: "ao-cake", code: "CAKE", name: "Celebration cake", description: "Cake and flowers in the room", price: rupees(1800), unit: "per-item", taxPct: 5, department: "f&b", outletId: "ol-irdining", postingRule: "on-date" },
  ].map((a) => stripUndefined({ ...a, active: true }));
  const packages = [
    { id: "pkg-ayur", code: "AYUR", name: "Ayurveda retreat", description: "Stay with daily Ayurveda therapy, breakfast and dinner.", roomTypeIds: ["rt-wgr", "rt-fcr", "rt-fcs"], items: [{ addOnId: "ao-ayur", quantity: 3 }], minNights: 3, active: true },
    { id: "pkg-romance", code: "ROMANCE", name: "Romantic escape", description: "Suite stay with celebration cake and a seafood dinner for two.", roomTypeIds: ["rt-fcs", "rt-fps"], items: [{ addOnId: "ao-cake", quantity: 1 }, { addOnId: "ao-seafood", quantity: 2 }], minNights: 2, active: true },
    { id: "pkg-gala", code: "GALA", name: "New Year's gala stay", description: "Two nights with the gala dinner for two.", roomTypeIds: typeIds, items: [{ addOnId: "ao-gala", quantity: 2 }], minNights: 2, validFrom: `${year}-12-30`, validTo: `${year}-12-31`, active: true },
  ].map((p) => stripUndefined(p));

  /* ── lists and codes ── */
  const vipLevels = [["vip-a", "VIP-A", "Owner / General Manager guest"], ["vip-b", "VIP-B", "Government dignitary"], ["vip-c", "VIP-C", "Repeat guest (5+ stays)"], ["vip-d", "VIP-D", "Travel media / influencer"]].map(([id, code, name]) => ({ id, code, name, active: true }));
  const preferenceCodes = [
    ["pf-highfloor", "HIGHFLOOR", "High floor", "room"], ["pf-quiet", "QUIET", "Quiet room", "room"], ["pf-king", "KING", "King bed", "room"], ["pf-twin", "TWIN", "Twin beds", "room"],
    ["pf-nonsmoking", "NOSMOKE", "Non-smoking", "room"], ["pf-pillows", "PILLOWS", "Extra pillows", "service"], ["pf-cot", "COT", "Baby cot", "family"], ["pf-veg", "VEG", "Vegetarian meals", "food"],
    ["pf-jain", "JAIN", "Jain meals", "food"], ["pf-nuts", "NUTALLERGY", "Nut allergy", "food"], ["pf-early", "EARLYCI", "Early check-in", "service"], ["pf-late", "LATECO", "Late check-out", "service"],
  ].map(([id, code, name, category]) => ({ id, code, name, category, active: true }));
  const titles = ["Mr", "Ms", "Mrs", "Miss", "Dr", "Prof", "Capt", "Mx"].map((t) => ({ id: `ti-${t.toLowerCase()}`, code: t, name: t, active: true }));
  const COUNTRIES = [["IN", "India", "+91"], ["US", "United States", "+1"], ["GB", "United Kingdom", "+44"], ["AE", "United Arab Emirates", "+971"], ["DE", "Germany", "+49"], ["FR", "France", "+33"], ["AU", "Australia", "+61"], ["SG", "Singapore", "+65"], ["CA", "Canada", "+1"], ["SA", "Saudi Arabia", "+966"], ["QA", "Qatar", "+974"], ["LK", "Sri Lanka", "+94"], ["NP", "Nepal", "+977"], ["NL", "Netherlands", "+31"], ["IT", "Italy", "+39"], ["RU", "Russia", "+7"], ["JP", "Japan", "+81"], ["CH", "Switzerland", "+41"], ["SE", "Sweden", "+46"], ["BD", "Bangladesh", "+880"]];
  const countries = COUNTRIES.map(([code, name, dialCode]) => ({ id: `co-${code.toLowerCase()}`, code, name, dialCode, active: true }));
  const ABBR = /** @type {Record<string, string>} */ ({ "01": "JK", "02": "HP", "03": "PB", "04": "CH", "05": "UK", "06": "HR", "07": "DL", "08": "RJ", "09": "UP", "10": "BR", "11": "SK", "12": "AR", "13": "NL", "14": "MN", "15": "MZ", "16": "TR", "17": "ML", "18": "AS", "19": "WB", "20": "JH", "21": "OD", "22": "CG", "23": "MP", "24": "GJ", "26": "DD", "27": "MH", "29": "KA", "30": "GA", "31": "LD", "32": "KL", "33": "TN", "34": "PY", "35": "AN", "36": "TG", "37": "AP", "38": "LA" });
  const states = Object.entries(GST_STATES).filter(([c]) => c !== "28").map(([gst, name]) => ({ id: `st-in-${ABBR[gst].toLowerCase()}`, countryCode: "IN", code: ABBR[gst], name, gstStateCode: gst, active: true }));
  const specialRequestCodes = [
    ["sr-flowers", "FLOWERS", "Flowers in room", "housekeeping"], ["sr-cake", "CAKE", "Birthday / anniversary cake", "f&b"], ["sr-cot", "COT", "Baby cot", "housekeeping"], ["sr-pickup", "PICKUP", "Airport pickup", "transport"],
    ["sr-earlyci", "EARLYCI", "Early check-in", "front-office"], ["sr-lateco", "LATECO", "Late check-out", "front-office"], ["sr-highfloor", "HIGHFLOOR", "High floor", "front-office"], ["sr-quiet", "QUIET", "Quiet room", "front-office"],
    ["sr-diet", "DIET", "Special diet", "f&b"], ["sr-honeymoon", "HONEYMOON", "Honeymoon set-up", "housekeeping"], ["sr-ayur", "AYURBOOK", "Book Ayurveda session", "spa"], ["sr-adjoining", "ADJOIN", "Adjoining rooms", "front-office"],
  ].map(([id, code, name, department]) => ({ id, code, name, department, notify: true, active: true }));
  const reasonCodes = [
    ["cancellation", "CHANGEPLAN", "Change of plans", false], ["cancellation", "FOUNDBETTER", "Found a better price", false], ["cancellation", "ILLNESS", "Illness or emergency", true], ["cancellation", "FLIGHT", "Flight cancelled", false], ["cancellation", "DUPLICATE", "Duplicate booking", false],
    ["discount", "LOYALTY", "Loyal guest", false], ["discount", "MATCH", "Price match", true], ["discount", "SERVICE", "Service recovery", true],
    ["rate-change", "CORRECTION", "Rate correction", false], ["rate-change", "NEGOTIATED", "Negotiated rate", true],
    ["upgrade", "VIPUP", "VIP upgrade", false], ["upgrade", "OVERSOLD", "Room type oversold", false],
    ["lost-enquiry", "PRICE", "Price too high", false], ["lost-enquiry", "NOAVAIL", "No availability", false], ["lost-enquiry", "COMPETITOR", "Booked elsewhere", false], ["lost-enquiry", "NORESP", "No response", false],
    ["refund", "CANCELLED", "Booking cancelled", false], ["refund", "EXCESS", "Excess payment", false], ["waiver", "GOODWILL", "Goodwill gesture", true], ["waiver", "MEDICAL", "Medical reason", true],
    ["no-show", "NOARRIVE", "Guest did not arrive", false], ["overbooking", "WALKGUEST", "Re-accommodate guest", true], ["blacklist", "CHARGEBACK", "Payment dispute", true], ["out-of-order", "REPAIR", "Repair", false], ["out-of-order", "RENOVATION", "Renovation", false],
  ].map(([type, code, name, remarksRequired], i) => ({ id: `rc-${i + 1}`, type, code, name, remarksRequired, active: true }));

  /* ── message templates (English) ── */
  const T = (/** @type {string} */ id, /** @type {string} */ code, /** @type {string} */ name, /** @type {string} */ kind, /** @type {string} */ channel, /** @type {string | undefined} */ subject, /** @type {string} */ body) =>
    stripUndefined({ id, code, name, kind, channel, language: "en", subject, body, active: true });
  const footer = "\n\nThe Aviv Kochi\nBristow Road, Willingdon Island, Kochi 682 003\n+91 484 266 8888";
  const messageTemplates = [
    T("mt-quote-w", "QUOTE-WA", "Quote – WhatsApp", "quote", "whatsapp", undefined, "Dear {{guest.name}}, thank you for your enquiry. For {{stay.arrival}} to {{stay.departure}} ({{stay.nights}} nights) we can offer {{room.type}} at {{price.total}} including taxes. This quote is valid for 48 hours. Reply to book." + footer),
    T("mt-quote-e", "QUOTE-EMAIL", "Quote – Email", "quote", "email", "Your quote from The Aviv Kochi", "Dear {{guest.name}},\n\nThank you for your interest in The Aviv Kochi. Your quote for {{stay.arrival}} to {{stay.departure}}: {{room.type}}, {{price.total}} including taxes.\n\nWe would be delighted to host you." + footer),
    T("mt-conf-e", "CONF-EMAIL", "Booking confirmation – Email", "confirmation", "email", "Booking confirmed: {{reservation.number}}", "Dear {{guest.name}},\n\nYour booking {{reservation.number}} is confirmed.\nArrival {{stay.arrival}} from 15:00 · Departure {{stay.departure}} by 12:00\n{{room.type}} · {{price.total}} including taxes\n\n{{policy.cancellation}}" + footer),
    T("mt-conf-w", "CONF-WA", "Booking confirmation – WhatsApp", "confirmation", "whatsapp", undefined, "Hello {{guest.name}}! Your stay {{reservation.number}} at The Aviv Kochi is confirmed for {{stay.arrival}} – {{stay.departure}}. Check-in from 15:00. See you soon!" + footer),
    T("mt-tent-e", "TENT-EMAIL", "Tentative booking – Email", "tentative", "email", "Tentative booking {{reservation.number}}", "Dear {{guest.name}},\n\nWe are holding {{reservation.number}} until {{option.date}}. Please pay the advance of {{advance.amount}} to confirm." + footer),
    T("mt-amend-e", "AMEND-EMAIL", "Amendment – Email", "amendment", "email", "Booking {{reservation.number}} updated", "Dear {{guest.name}},\n\nYour booking {{reservation.number}} has been updated. New stay: {{stay.arrival}} to {{stay.departure}}, {{price.total}} including taxes." + footer),
    T("mt-cancel-e", "CANCEL-EMAIL", "Cancellation – Email", "cancellation", "email", "Booking {{reservation.number}} cancelled", "Dear {{guest.name}},\n\nYour booking {{reservation.number}} has been cancelled. Cancellation charge: {{cancellation.penalty}}. Refund due: {{cancellation.refund}}." + footer),
    T("mt-receipt-e", "RECEIPT-EMAIL", "Advance receipt – Email", "receipt", "email", "Receipt {{receipt.number}}", "Dear {{guest.name}},\n\nThank you for your payment of {{payment.amount}} received on {{payment.date}} for booking {{reservation.number}}. Receipt {{receipt.number}} is attached." + footer),
    T("mt-paylink-w", "PAYLINK-WA", "Payment link – WhatsApp", "payment-link", "whatsapp", undefined, "Dear {{guest.name}}, please pay {{payment.amount}} to secure booking {{reservation.number}}: {{payment.link}} (valid for 24 hours)." + footer),
    T("mt-advrem-w", "ADVREM-WA", "Advance reminder – WhatsApp", "advance-reminder", "whatsapp", undefined, "Dear {{guest.name}}, a reminder that the advance of {{advance.amount}} for {{reservation.number}} is due on {{advance.due}}. Pay with the link: {{payment.link}}" + footer),
    T("mt-prearr-w", "PREARR-WA", "Pre-arrival – WhatsApp", "pre-arrival", "whatsapp", undefined, "Welcome in advance, {{guest.name}}! We look forward to seeing you tomorrow. Check-in is from 15:00. Tell us your arrival time and any requests." + footer),
    T("mt-wait-w", "WAITLIST-WA", "Room available (waitlist) – WhatsApp", "waitlist", "whatsapp", undefined, "Good news, {{guest.name}} – a {{room.type}} is now available for {{stay.arrival}} to {{stay.departure}}. Reply within 12 hours to book it." + footer),
    T("mt-optexp-e", "OPTEXP-EMAIL", "Option date expiry – Email", "option-expiry", "email", "Your tentative booking expires today", "Dear {{guest.name}},\n\nBooking {{reservation.number}} expires today. Reply or pay the advance to keep your room." + footer),
    T("mt-grp-e", "GRPCONF-EMAIL", "Group confirmation – Email", "group-confirmation", "email", "Group booking {{group.number}} confirmed", "Dear {{guest.name}},\n\nYour group {{group.name}} ({{group.number}}) is confirmed: {{group.rooms}} rooms from {{stay.arrival}} to {{stay.departure}}. Cut-off date for the rooming list: {{group.cutoff}}." + footer),
  ];

  /* ── payment modes and currencies ── */
  const paymentModes = [
    ["pm-cash", "CASH", "Cash", "cash", [], false, true], ["pm-card", "CARD", "Credit / debit card", "card", ["Visa", "Mastercard", "Amex", "RuPay"], true, true], ["pm-upi", "UPI", "UPI", "upi", [], true, true],
    ["pm-link", "LINK", "Payment link", "link", [], true, true], ["pm-bank", "BANK", "Bank transfer (NEFT / RTGS)", "bank", [], true, true], ["pm-cheque", "CHEQUE", "Cheque", "cheque", [], true, false],
    ["pm-credit", "CREDIT", "Company credit (bill to company)", "credit", [], false, false], ["pm-ota", "OTAPAID", "OTA prepaid / virtual card", "prepaid", [], true, false], ["pm-corpprepaid", "CORPPAID", "Corporate prepaid", "prepaid", [], true, false],
    ["pm-voucher", "VOUCHER", "Gift voucher", "voucher", [], true, false],
  ].map(([id, code, name, type, cardTypes, requiresReference, allowsRefund]) => ({ id, code, name, type, cardTypes, requiresReference, allowsRefund, active: true }));
  const currencies = [
    ["INR", "Indian rupee", "₹", true], ["USD", "US dollar", "$", false], ["EUR", "Euro", "€", false], ["GBP", "British pound", "£", false], ["AED", "UAE dirham", "AED", false], ["SGD", "Singapore dollar", "S$", false], ["AUD", "Australian dollar", "A$", false],
  ].map(([code, name, symbol, isBase]) => ({ id: `cu-${String(code).toLowerCase()}`, code, name, symbol, decimals: 2, isBase, active: true }));
  const DEMO_RATES = /** @type {Record<string, number>} */ ({ USD: 8800, EUR: 9600, GBP: 11200, AED: 2400, SGD: 6500, AUD: 5800 });
  const exchangeRates = Object.entries(DEMO_RATES).map(([c, r]) => ({ id: `fx-${c}-${today}`, currencyCode: c, date: today, ratePaise: r, source: "Demo rate – enter the hotel's daily rate" }));

  /* ── pricing rules (optional module, off by default) ── */
  const pricingRules = [
    { id: "pr-high", name: "Last rooms premium", metric: "occupancy", operator: "above", threshold: 85, windowDays: 14, adjustmentType: "percent", adjustmentValue: 10, ceiling: rupees(30000), roomTypeIds: typeIds, mode: "suggest", enabled: false },
    { id: "pr-low", name: "Soft demand discount", metric: "occupancy", operator: "below", threshold: 40, windowDays: 7, adjustmentType: "percent", adjustmentValue: -5, floor: rupees(5000), roomTypeIds: ["rt-wgr", "rt-fcr"], mode: "suggest", enabled: false },
  ];

  return {
    collections: {
      property, blocks, floors, roomFeatures, roomTypes, rooms, mealPlans, taxSlabs, cancellationPolicies, depositPolicies, reservationParameters, channels, sources, segments, ratePlans,
      seasons, specialDates, rateCalendar, restrictions, overbookingLimits, outlets, addOns, packages, vipLevels, preferenceCodes, titles, countries, states, specialRequestCodes,
      reasonCodes, messageTemplates, paymentModes, currencies, exchangeRates, pricingRules,
    },
    /** Values the operations seed needs (not stored as collections). */
    aux: { typeIds, dateCtx, basePrice: /** @type {Record<string, number>} */ (basePrice) },
  };
}

/** Remove keys whose value is undefined so records match their schema exactly. @template T @param {T} o @returns {T} */
function stripUndefined(o) {
  for (const k of Object.keys(/** @type {any} */ (o))) if (/** @type {any} */ (o)[k] === undefined) delete (/** @type {any} */ (o))[k];
  return o;
}

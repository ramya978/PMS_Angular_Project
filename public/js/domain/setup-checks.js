// @ts-check
/**
 * Setup checklist (RSS-01): looks at the setup data and says, for each setup screen, whether it is Done, Needs attention
 * or Not started, with a plain-English reason and any warnings (for example “Deluxe Suite has no rates after 15 Jan 2027”).
 * Pure functions – no storage, no screen code – so they are easy to test.
 */
import { addDays, formatDate } from "../core/format.js";

/**
 * @typedef {"done" | "attention" | "not-started"} StepStatus
 * @typedef {Object} SetupStep
 * @property {string} code            screen code, e.g. "RSS-04"
 * @property {string} title
 * @property {string} group           same group names as the sidebar
 * @property {string} why             why it matters (one line)
 * @property {boolean} optional       optional steps never hold back the progress figure
 * @property {StepStatus} status
 * @property {string} summary         what was found, e.g. "92 of 92 rooms entered"
 * @property {string[]} warnings
 *
 * @typedef {Object} SetupReport
 * @property {SetupStep[]} steps
 * @property {{ done: number, attention: number, notStarted: number, required: number, requiredDone: number, percent: number }} totals
 * @property {Array<{ code: string, title: string, text: string }>} warnings   every warning of every step, in step order
 */

/** How far ahead rates must be loaded before we warn (days). */
export const RATE_HORIZON_DAYS = 90;

/** Reason types the reservation screens ask for. */
export const REQUIRED_REASON_TYPES = /** @type {const} */ (["cancellation", "discount", "rate-change", "no-show", "refund", "waiver"]);

/** Message kinds a hotel needs before taking bookings. */
export const REQUIRED_TEMPLATE_KINDS = /** @type {const} */ (["quote", "confirmation", "amendment", "cancellation", "receipt"]);

/** Number series a hotel needs before taking bookings. */
export const REQUIRED_SERIES = /** @type {const} */ (["BOOKING", "ENQUIRY", "RECEIPT", "CANCEL"]);

const active = (/** @type {any[] | undefined} */ rows) => (rows ?? []).filter((r) => r.active !== false);
const plural = (/** @type {number} */ n, /** @type {string} */ one, /** @type {string} */ many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * @param {Partial<SetupStep> & { code: string, title: string, group: string, why: string }} s
 * @returns {SetupStep}
 */
function step(s) {
  return { optional: false, status: "not-started", summary: "", warnings: [], ...s };
}

/**
 * Decide the status from a count and a list of problems.
 * @param {number} count  how many items exist
 * @param {string[]} warnings
 * @returns {StepStatus}
 */
const statusOf = (count, warnings) => (count === 0 ? "not-started" : warnings.length ? "attention" : "done");

/**
 * @param {Record<string, any[]>} data  all collections (store.peekAll())
 * @param {string} today                business date, YYYY-MM-DD
 * @returns {SetupReport}
 */
export function evaluateSetup(data, today) {
  const rows = (/** @type {string} */ n) => /** @type {any[]} */ (data[n] ?? []);
  const property = rows("property")[0];
  /** @type {SetupStep[]} */
  const steps = [];

  // RSS-02 Hotel details
  {
    const needed = /** @type {Array<[string, string]>} */ ([["name", "hotel name"], ["address", "address"], ["gstin", "GSTIN"], ["phone", "phone"], ["email", "email"], ["checkInTime", "check-in time"], ["checkOutTime", "check-out time"], ["auditTime", "night-audit time"]]);
    const missing = property ? needed.filter(([k]) => !property[k]).map(([, label]) => label) : [];
    const warnings = property ? (missing.length ? [`Missing: ${missing.join(", ")}.`] : []) : [];
    steps.push(step({
      code: "RSS-02", title: "Hotel details", group: "Property", why: "Name, GSTIN and contacts print on every invoice, confirmation and message.",
      status: property ? statusOf(1, warnings) : "not-started", summary: property ? `${property.shortName ?? property.name} · GSTIN ${property.gstin ?? "missing"}` : "No hotel details yet", warnings,
    }));
  }

  // RSS-03 Room types
  const roomTypes = active(rows("roomTypes"));
  const roomsAll = active(rows("rooms"));
  {
    const empty = roomTypes.filter((t) => !roomsAll.some((r) => r.roomTypeId === t.id));
    const warnings = empty.map((t) => `${t.name} has no rooms.`);
    steps.push(step({
      code: "RSS-03", title: "Room types", group: "Property", why: "Availability, pricing and room assignment are all counted by room type.",
      status: statusOf(roomTypes.length, warnings), summary: roomTypes.length ? plural(roomTypes.length, "room type") : "No room types yet", warnings,
    }));
  }

  // RSS-04 Rooms
  {
    const expected = property?.rooms ?? 0;
    const warnings = [];
    if (roomsAll.length && expected && roomsAll.length !== expected) warnings.push(`${roomsAll.length} rooms entered but the hotel details say ${expected}.`);
    const numbers = new Map();
    for (const r of roomsAll) numbers.set(r.number, (numbers.get(r.number) ?? 0) + 1);
    for (const [num, n] of numbers) if (n > 1) warnings.push(`Room number ${num} is used ${n} times.`);
    steps.push(step({
      code: "RSS-04", title: "Rooms", group: "Property", why: "Every room you can sell needs a number, floor and type.",
      status: statusOf(roomsAll.length, warnings), summary: roomsAll.length ? `${roomsAll.length}${expected ? ` of ${expected}` : ""} rooms entered` : "No rooms yet", warnings,
    }));
  }

  // RSS-05 Meal plans
  {
    const plans = active(rows("mealPlans"));
    const codes = new Set(plans.map((p) => p.code));
    const warnings = ["EP", "CP"].filter((c) => !codes.has(c)).map((c) => `Meal plan ${c} is missing.`);
    steps.push(step({
      code: "RSS-05", title: "Meal plans", group: "Rates & availability", why: "Rate plans need a meal plan, and it decides what the breakfast charge is.",
      status: statusOf(plans.length, warnings), summary: plans.length ? plans.map((p) => p.code).join(", ") : "No meal plans yet", warnings,
    }));
  }

  // RSS-06 Taxes
  {
    const slabs = active(rows("taxSlabs"));
    const current = slabs.filter((s) => s.effectiveFrom <= today && (!s.effectiveTo || s.effectiveTo >= today));
    const warnings = [];
    if (slabs.length && !current.length) warnings.push("No GST slab is in force today.");
    for (const s of current) if (Math.abs(s.cgstPct + s.sgstPct - s.ratePct) > 0.001) warnings.push(`${s.name}: CGST + SGST should add up to ${s.ratePct}%.`);
    // slabs in force today must not leave a gap or overlap between each other
    const sorted = [...current].sort((a, b) => a.minRate - b.minRate);
    for (let i = 1; i < sorted.length; i++) if (sorted[i].minRate !== (sorted[i - 1].maxRate ?? Infinity) + 1 && sorted[i].minRate !== sorted[i - 1].maxRate) warnings.push(`There is a gap or overlap between “${sorted[i - 1].name}” and “${sorted[i].name}”.`);
    steps.push(step({
      code: "RSS-06", title: "Taxes", group: "Rates & availability", why: "GST is worked out per room per night from these slabs – nothing is hard-coded.",
      status: statusOf(slabs.length, warnings), summary: slabs.length ? `${plural(current.length, "slab")} in force today (${current.map((s) => `${s.ratePct}%`).join(", ")})` : "No tax slabs yet", warnings,
    }));
  }

  // RSS-07 Rate plans
  const ratePlans = active(rows("ratePlans"));
  {
    const warnings = [];
    if (ratePlans.length && !ratePlans.some((p) => p.isBase)) warnings.push("No base rate plan is marked – derived plans have nothing to follow.");
    for (const p of ratePlans) if (!p.roomTypeIds?.length) warnings.push(`${p.name} is not sold in any room type.`);
    const mealIds = new Set(rows("mealPlans").map((m) => m.id));
    for (const p of ratePlans) if (!mealIds.has(p.mealPlanId)) warnings.push(`${p.name} points to a meal plan that does not exist.`);
    steps.push(step({
      code: "RSS-07", title: "Rate plans", group: "Rates & availability", why: "A room can only be sold on a rate plan: BAR, Aviv Club, corporate, packages and so on.",
      status: statusOf(ratePlans.length, warnings), summary: ratePlans.length ? plural(ratePlans.length, "rate plan") : "No rate plans yet", warnings,
    }));
  }

  // RSS-08 Rate calendar
  {
    const baseIds = ratePlans.filter((p) => p.isBase).map((p) => p.id);
    const calendar = rows("rateCalendar");
    const lastBy = new Map(); // roomTypeId → last date with a base-plan rate
    for (const r of calendar) if (baseIds.includes(r.ratePlanId) && r.date > (lastBy.get(r.roomTypeId) ?? "")) lastBy.set(r.roomTypeId, r.date);
    const horizon = addDays(today, RATE_HORIZON_DAYS);
    const warnings = [];
    if (calendar.length) {
      for (const t of roomTypes) {
        const last = lastBy.get(t.id);
        if (!last) warnings.push(`${t.name} has no rates at all.`);
        else if (last < horizon) warnings.push(`${t.name} has no rates after ${formatDate(last, "long")}.`);
      }
    }
    steps.push(step({
      code: "RSS-08", title: "Rate calendar", group: "Rates & availability", why: `Prices per room type, rate plan and date. Keep at least ${RATE_HORIZON_DAYS} days ahead loaded.`,
      status: statusOf(calendar.length, warnings), summary: calendar.length ? `${calendar.length.toLocaleString("en-IN")} dated rates, loaded to ${formatDate([...lastBy.values()].sort()[0] ?? today, "long")}` : "No rates loaded yet", warnings,
    }));
  }

  // RSS-09 Seasons & special dates
  {
    const seasons = rows("seasons");
    const specials = rows("specialDates");
    const warnings = [];
    if (seasons.length && !seasons.some((s) => s.to >= today)) warnings.push("Every season has already ended – add the coming seasons.");
    steps.push(step({
      code: "RSS-09", title: "Seasons & special dates", group: "Rates & availability", why: "Peak, regular and monsoon seasons and festival dates lift or lower prices and minimum stays.",
      status: statusOf(seasons.length + specials.length, warnings), summary: `${plural(seasons.length, "season")}, ${plural(specials.length, "special date")}`, warnings,
    }));
  }

  // RSS-10 Restrictions (optional)
  {
    const r = rows("restrictions");
    steps.push(step({
      code: "RSS-10", title: "Restrictions", group: "Rates & availability", optional: true, why: "Minimum stay, closed-to-arrival and stop-sell keep the best nights for the best guests.",
      status: r.length ? "done" : "not-started", summary: r.length ? plural(r.length, "restriction") : "None set – every night can be sold freely",
    }));
  }

  // RSS-11 Inventory & overbooking (optional)
  {
    const o = rows("overbookingLimits");
    steps.push(step({
      code: "RSS-11", title: "Inventory & overbooking", group: "Rates & availability", optional: true, why: "Allowances for overbooking, rooms held back and rooms promised to channels.",
      status: o.length ? "done" : "not-started", summary: o.length ? plural(o.length, "rule") : "No overbooking or allotment rules",
    }));
  }

  // RSS-12 Cancellation policies
  const cancellation = active(rows("cancellationPolicies"));
  {
    const policyIds = new Set(cancellation.map((p) => p.id));
    const warnings = ratePlans.filter((p) => !policyIds.has(p.cancellationPolicyId)).map((p) => `${p.name} has no active cancellation policy.`);
    steps.push(step({
      code: "RSS-12", title: "Cancellation & no-show policies", group: "Policies", why: "Decides the penalty when a guest cancels or does not arrive, and what the guest is told.",
      status: statusOf(cancellation.length, warnings), summary: cancellation.length ? plural(cancellation.length, "policy", "policies") : "No cancellation policies yet", warnings,
    }));
  }

  // RSS-13 Advance & guarantee policies
  {
    const deposits = active(rows("depositPolicies"));
    const ids = new Set(deposits.map((p) => p.id));
    const warnings = ratePlans.filter((p) => !ids.has(p.depositPolicyId)).map((p) => `${p.name} has no active advance / guarantee policy.`);
    steps.push(step({
      code: "RSS-13", title: "Advance & guarantee policies", group: "Policies", why: "How much advance is due, by when, and what happens if it is not paid.",
      status: statusOf(deposits.length, warnings), summary: deposits.length ? plural(deposits.length, "policy", "policies") : "No advance policies yet", warnings,
    }));
  }

  // RSS-14 Reservation parameters
  {
    const p = rows("reservationParameters")[0];
    const warnings = [];
    if (p && property && p.checkInTime !== property.checkInTime) warnings.push(`Check-in is ${p.checkInTime} here but ${property.checkInTime} in the hotel details.`);
    if (p && property && p.checkOutTime !== property.checkOutTime) warnings.push(`Check-out is ${p.checkOutTime} here but ${property.checkOutTime} in the hotel details.`);
    steps.push(step({
      code: "RSS-14", title: "Reservation parameters", group: "Policies", why: "Check-in and check-out times, child and extra-bed rules, option days and booking limits.",
      status: p ? statusOf(1, warnings) : "not-started", summary: p ? `Check-in ${p.checkInTime}, check-out ${p.checkOutTime}, minimum age ${p.minGuestAge}` : "No parameters yet", warnings,
    }));
  }

  // RSS-15 Sources, segments & channels
  const channels = active(rows("channels"));
  {
    const sources = active(rows("sources")), segments = active(rows("segments"));
    const warnings = [];
    if (!sources.length) warnings.push("No booking sources.");
    if (!segments.length) warnings.push("No business segments.");
    if (!channels.length) warnings.push("No channels.");
    steps.push(step({
      code: "RSS-15", title: "Sources, segments & channels", group: "Distribution", why: "Every booking records where it came from – needed for reports and commission.",
      status: statusOf(sources.length + segments.length + channels.length, warnings), summary: `${plural(sources.length, "source")}, ${plural(segments.length, "segment")}, ${plural(channels.length, "channel")}`, warnings,
    }));
  }

  // RSS-16 Channel mapping
  {
    const maps = active(rows("channelMappings"));
    const otas = channels.filter((c) => c.type === "ota" || c.type === "brand");
    const warnings = otas.filter((c) => !maps.some((m) => m.channelId === c.id)).map((c) => `${c.name} has no room / rate mapping.`);
    steps.push(step({
      code: "RSS-16", title: "Channel mapping", group: "Distribution", why: "Links each channel's room and rate codes to your room types and rate plans, so bookings land correctly.",
      status: statusOf(maps.length, warnings), summary: maps.length ? `${plural(maps.length, "mapping")} across ${plural(new Set(maps.map((m) => m.channelId)).size, "channel")}` : "Nothing mapped yet", warnings,
    }));
  }

  // RSS-17 Add-ons & packages
  {
    const addOns = active(rows("addOns")), packages = active(rows("packages"));
    steps.push(step({
      code: "RSS-17", title: "Add-ons & packages", group: "Lists & codes", why: "Extra bed, breakfast, airport transfer, dinners and Ayurveda – sold with a room.",
      status: addOns.length ? "done" : "not-started", summary: `${plural(addOns.length, "add-on")}, ${plural(packages.length, "package")}`,
    }));
  }

  // RSS-18 Guest lists
  {
    const lists = /** @type {Array<[string, string]>} */ ([["vipLevels", "VIP levels"], ["preferenceCodes", "preferences"], ["titles", "titles"], ["countries", "countries"], ["states", "states"]]);
    const warnings = lists.filter(([n]) => !active(rows(n)).length).map(([, label]) => `No ${label}.`);
    const count = lists.reduce((n, [k]) => n + active(rows(k)).length, 0);
    steps.push(step({
      code: "RSS-18", title: "Guest lists", group: "Lists & codes", why: "VIP levels, preferences, titles, countries and states used on every guest profile.",
      status: statusOf(count, warnings), summary: `${plural(active(rows("vipLevels")).length, "VIP level")}, ${plural(active(rows("countries")).length, "country", "countries")}, ${plural(active(rows("states")).length, "state")}`, warnings,
    }));
  }

  // RSS-19 Special request codes
  {
    const codes = active(rows("specialRequestCodes"));
    steps.push(step({
      code: "RSS-19", title: "Special request codes", group: "Lists & codes", why: "Each request goes to the right department (housekeeping, F&B, transport).",
      status: codes.length ? "done" : "not-started", summary: codes.length ? plural(codes.length, "request code") : "No request codes yet",
    }));
  }

  // RSS-20 Reason codes
  {
    const reasons = active(rows("reasonCodes"));
    const types = new Set(reasons.map((r) => r.type));
    const warnings = REQUIRED_REASON_TYPES.filter((t) => !types.has(t)).map((t) => `No “${t}” reasons – staff cannot complete that action.`);
    steps.push(step({
      code: "RSS-20", title: "Reason codes", group: "Lists & codes", why: "Cancelling, discounting or refunding always asks for a reason – these are the choices.",
      status: statusOf(reasons.length, warnings), summary: reasons.length ? `${plural(reasons.length, "reason")} in ${plural(types.size, "group")}` : "No reasons yet", warnings,
    }));
  }

  // RSS-21 Templates
  {
    const templates = active(rows("messageTemplates"));
    const kinds = new Set(templates.map((t) => t.kind));
    const warnings = REQUIRED_TEMPLATE_KINDS.filter((k) => !kinds.has(k)).map((k) => `No ${k} template.`);
    steps.push(step({
      code: "RSS-21", title: "Message & document templates", group: "Documents & payments", why: "Quote, confirmation, amendment, cancellation and receipt are sent from these.",
      status: statusOf(templates.length, warnings), summary: templates.length ? plural(templates.length, "template") : "No templates yet", warnings,
    }));
  }

  // RSS-22 Numbering series
  {
    const series = active(rows("numberSeries"));
    const codes = new Set(series.map((s) => s.code));
    const warnings = REQUIRED_SERIES.filter((c) => !codes.has(c)).map((c) => `Numbering series ${c} is missing.`);
    steps.push(step({
      code: "RSS-22", title: "Numbering series", group: "Documents & payments", why: "Booking, receipt, enquiry and cancellation numbers must never repeat.",
      status: statusOf(series.length, warnings), summary: series.length ? plural(series.length, "series", "series") : "No numbering yet", warnings,
    }));
  }

  // RSS-23 Payment modes & currencies
  {
    const modes = active(rows("paymentModes")), currencies = active(rows("currencies"));
    const warnings = [];
    if (modes.length && !modes.some((m) => m.type === "cash")) warnings.push("No cash payment mode.");
    if (currencies.length && currencies.filter((c) => c.isBase).length !== 1) warnings.push("Exactly one currency must be the base currency.");
    steps.push(step({
      code: "RSS-23", title: "Payment modes & currencies", group: "Documents & payments", why: "Receipts and refunds can only use a mode that is set up here.",
      status: statusOf(modes.length + currencies.length, warnings), summary: `${plural(modes.length, "payment mode")}, ${plural(currencies.length, "currency", "currencies")}`, warnings,
    }));
  }

  // RSS-24 Users & roles
  {
    const users = active(rows("users")), roles = rows("roles");
    const roleIds = new Set(roles.map((r) => r.id));
    const warnings = users.filter((u) => !roleIds.has(u.roleId)).map((u) => `${u.name} has no valid role.`);
    if (users.length && !users.some((u) => roles.find((r) => r.id === u.roleId)?.permissions.includes("*"))) warnings.push("Nobody has full access (General Manager or Admin).");
    steps.push(step({
      code: "RSS-24", title: "Users & roles", group: "People", why: "Who can sign in and what each role may open or change.",
      status: statusOf(users.length, warnings), summary: `${plural(users.length, "active user")}, ${plural(roles.length, "role")}`, warnings,
    }));
  }

  // RSS-25 Approval limits
  {
    const limits = rows("approvalLimits");
    const roleIds = new Set(rows("roles").map((r) => r.id));
    const warnings = limits.filter((l) => l.nextApproverRoleId && !roleIds.has(l.nextApproverRoleId)).map((l) => `The limit “${l.action}” escalates to a role that no longer exists.`);
    steps.push(step({
      code: "RSS-25", title: "Approval limits", group: "People", why: "How far each role can go on discounts, rate changes and refunds before a manager must approve.",
      status: statusOf(limits.length, warnings), summary: limits.length ? plural(limits.length, "limit") : "No approval limits yet", warnings,
    }));
  }

  // RSS-26 Pricing rules (optional)
  {
    const rules = rows("pricingRules");
    steps.push(step({
      code: "RSS-26", title: "Pricing rules", group: "Rates & availability", optional: true, why: "Optional: suggest or apply price changes automatically when occupancy is high or low.",
      status: rules.length ? "done" : "not-started", summary: rules.length ? `${plural(rules.length, "rule")}, ${rules.filter((r) => r.enabled).length} switched on` : "No automatic pricing",
    }));
  }

  return { steps, totals: totals(steps), warnings: steps.flatMap((s) => s.warnings.map((text) => ({ code: s.code, title: s.title, text }))) };
}

/** @param {SetupStep[]} steps */
export function totals(steps) {
  const required = steps.filter((s) => !s.optional);
  const requiredDone = required.filter((s) => s.status === "done").length;
  return {
    done: steps.filter((s) => s.status === "done").length,
    attention: steps.filter((s) => s.status === "attention").length,
    notStarted: steps.filter((s) => s.status === "not-started").length,
    required: required.length,
    requiredDone,
    percent: required.length ? Math.round((requiredDone / required.length) * 100) : 100,
  };
}

/** Plain-English label for a status. @param {StepStatus} s */
export const statusLabel = (s) => (s === "done" ? "Done" : s === "attention" ? "Needs attention" : "Not started");

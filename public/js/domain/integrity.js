// @ts-check
/**
 * Data integrity check for the whole mock database: every record matches its schema, every reference points at something,
 * booking totals add up, rooms are never double-assigned and inventory equals what the bookings say.
 * Used by dev-tools/tests and by the "Check data" button in dev-tools/dev-panel.
 */
import { SCHEMAS } from "./schemas.js";
import { validate } from "./schema.js";
import { computeInventory, availability } from "./inventory.js";
import { diffDays, dateRange, percentOf } from "../core/format.js";
import { INVENTORY_STATUSES } from "./schemas.js";

/** [collection, field, target collection, key]; the key defaults to `id`; a field that is an array is checked item by item. */
const REFS = /** @type {const} */ ([
  ["floors", "blockId", "blocks"], ["rooms", "roomTypeId", "roomTypes"], ["rooms", "connectingRoomId", "rooms"], ["rooms", "featureIds", "roomFeatures"],
  ["outOfOrderPeriods", "roomId", "rooms"], ["outOfOrderPeriods", "reasonId", "reasonCodes"], ["outOfOrderPeriods", "createdBy", "users"],
  ["ratePlans", "mealPlanId", "mealPlans"], ["ratePlans", "roomTypeIds", "roomTypes"], ["ratePlans", "cancellationPolicyId", "cancellationPolicies"], ["ratePlans", "depositPolicyId", "depositPolicies"],
  ["ratePlans", "channelIds", "channels"], ["ratePlans", "packageId", "packages"],
  ["rateCalendar", "roomTypeId", "roomTypes"], ["rateCalendar", "ratePlanId", "ratePlans"],
  ["restrictions", "roomTypeId", "roomTypes"], ["restrictions", "ratePlanId", "ratePlans"], ["overbookingLimits", "roomTypeId", "roomTypes"], ["overbookingLimits", "channelId", "channels"],
  ["sources", "channelId", "channels"], ["channelMappings", "channelId", "channels"], ["channelMappings", "roomTypeId", "roomTypes"], ["channelMappings", "ratePlanId", "ratePlans"],
  ["addOns", "outletId", "outlets"], ["packages", "roomTypeIds", "roomTypes"], ["states", "countryCode", "countries", "code"],
  ["users", "roleId", "roles"], ["users", "propertyIds", "property"], ["approvalLimits", "roleId", "roles"], ["approvalLimits", "nextApproverRoleId", "roles"],
  ["guests", "vipLevelId", "vipLevels"], ["guests", "preferenceIds", "preferenceCodes"], ["guests", "accountId", "accounts"], ["accounts", "ratePlanId", "ratePlans"],
  ["contracts", "accountId", "accounts"], ["contracts", "roomTypeId", "roomTypes"], ["contracts", "ratePlanId", "ratePlans"],
  ["enquiries", "guestId", "guests"], ["enquiries", "sourceId", "sources"], ["enquiries", "roomTypeId", "roomTypes"], ["enquiries", "assignedTo", "users"], ["enquiries", "lostReasonId", "reasonCodes"], ["enquiries", "reservationId", "reservations"],
  ["reservations", "sourceId", "sources"], ["reservations", "segmentId", "segments"], ["reservations", "channelId", "channels"], ["reservations", "accountId", "accounts"], ["reservations", "guestId", "guests"],
  ["reservations", "ratePlanId", "ratePlans"], ["reservations", "mealPlanId", "mealPlans"], ["reservations", "groupId", "groups"], ["reservations", "enquiryId", "enquiries"], ["reservations", "createdBy", "users"],
  ["reservations", "specialRequestIds", "specialRequestCodes"], ["reservations", "cancellationId", "cancellations"],
  ["reservationRooms", "reservationId", "reservations"], ["reservationRooms", "roomTypeId", "roomTypes"], ["reservationRooms", "roomId", "rooms"], ["reservationRooms", "ratePlanId", "ratePlans"], ["reservationRooms", "mealPlanId", "mealPlans"],
  ["reservationNights", "reservationId", "reservations"], ["reservationNights", "roomLineId", "reservationRooms"], ["reservationNights", "roomTypeId", "roomTypes"],
  ["sharers", "reservationId", "reservations"], ["sharers", "roomLineId", "reservationRooms"], ["billingInstructions", "reservationId", "reservations"], ["billingInstructions", "accountId", "accounts"],
  ["reservationAddOns", "reservationId", "reservations"], ["reservationAddOns", "addOnId", "addOns"], ["reservationAddOns", "roomLineId", "reservationRooms"],
  ["specialRequests", "reservationId", "reservations"], ["specialRequests", "codeId", "specialRequestCodes"], ["notes", "reservationId", "reservations"], ["notes", "createdBy", "users"],
  ["attachments", "reservationId", "reservations"], ["payments", "reservationId", "reservations"], ["payments", "groupId", "groups"], ["payments", "modeId", "paymentModes"], ["payments", "receivedBy", "users"],
  ["paymentLinks", "reservationId", "reservations"], ["refunds", "reservationId", "reservations"], ["refunds", "modeId", "paymentModes"], ["refunds", "reasonId", "reasonCodes"], ["refunds", "approvalId", "approvalRequests"],
  ["cancellations", "reservationId", "reservations"], ["cancellations", "reasonId", "reasonCodes"], ["cancellations", "policyId", "cancellationPolicies"], ["cancellations", "byUserId", "users"],
  ["groups", "accountId", "accounts"], ["groups", "ratePlanId", "ratePlans"], ["groups", "hallIds", "outlets"], ["groups", "salesPersonId", "users"],
  ["groupBlocks", "groupId", "groups"], ["groupBlocks", "roomTypeId", "roomTypes"], ["waitlist", "roomTypeId", "roomTypes"], ["waitlist", "guestId", "guests"],
  ["approvalRequests", "reservationId", "reservations"], ["approvalRequests", "requestedBy", "users"], ["approvalRequests", "roleNeededId", "roles"], ["approvalRequests", "decidedBy", "users"], ["approvalRequests", "reasonId", "reasonCodes"],
  ["messageLogs", "reservationId", "reservations"], ["messageLogs", "guestId", "guests"], ["messageLogs", "enquiryId", "enquiries"], ["messageLogs", "templateId", "messageTemplates"],
  ["channelMessages", "channelId", "channels"], ["channelMessages", "reservationId", "reservations"], ["channelSyncLogs", "channelId", "channels"],
  ["inventoryDays", "roomTypeId", "roomTypes"], ["auditLog", "userId", "users"],
]);

/**
 * @typedef {{ rule: string, collection: string, id: string, message: string }} Issue
 *
 * @param {Record<string, any[]>} data collection name → rows
 * @param {{ maxPerRule?: number, skipSchema?: boolean }} [opts]
 * @returns {{ ok: boolean, issues: Issue[], records: number }}
 */
export function checkIntegrity(data, opts = {}) {
  const cap = opts.maxPerRule ?? 8;
  /** @type {Issue[]} */ const issues = [];
  /** @type {Map<string, number>} */ const perRule = new Map();
  const add = (/** @type {string} */ rule, /** @type {string} */ collection, /** @type {string} */ id, /** @type {string} */ message) => {
    const k = `${rule}|${collection}`;
    const n = (perRule.get(k) ?? 0) + 1;
    perRule.set(k, n);
    if (n <= cap) issues.push({ rule, collection, id, message });
    else if (n === cap + 1) issues.push({ rule, collection, id: "…", message: "more of the same problem (not listed)" });
  };
  let records = 0;

  /* 1 – schema, unique ids */
  /** @type {Record<string, Set<string>>} */ const ids = {};
  for (const [name, rows] of Object.entries(data)) {
    ids[name] = new Set();
    records += rows.length;
    const schema = SCHEMAS[name];
    if (!schema) { add("unknown-collection", name, "", `Collection “${name}” has no schema.`); continue; }
    for (const row of rows) {
      if (ids[name].has(row.id)) add("duplicate-id", name, row.id, "Two records share this id.");
      ids[name].add(row.id);
      if (!opts.skipSchema) {
        const r = validate(row, schema);
        if (!r.ok) add("schema", name, row.id, Object.entries(r.errors).map(([k, v]) => `${k}: ${v}`).join("; "));
      }
    }
  }

  /* 2 – references */
  for (const [collection, field, target, key] of /** @type {ReadonlyArray<readonly [string, string, string, string?]>} */ (REFS)) {
    const targetIds = key ? new Set((data[target] ?? []).map((r) => r[key])) : ids[target];
    if (!targetIds) { add("reference", collection, "", `Target collection “${target}” is missing.`); continue; }
    for (const row of data[collection] ?? []) {
      const v = row[field];
      if (v === undefined || v === null || v === "") continue;
      for (const one of Array.isArray(v) ? v : [v]) if (!targetIds.has(one)) add("reference", collection, row.id, `${field} “${one}” does not exist in ${target}.`);
    }
  }

  /* 3 – rooms */
  const rooms = data.rooms ?? [];
  const active = rooms.filter((r) => r.active);
  if (active.length !== (data.property?.[0]?.rooms ?? 92)) add("room-count", "rooms", "", `Expected ${data.property?.[0]?.rooms} active rooms, found ${active.length}.`);
  const numbers = new Set();
  for (const r of rooms) { if (numbers.has(r.number)) add("room-number", "rooms", r.id, "Duplicate room number."); numbers.add(r.number); }

  /* 4 – reservations add up */
  const lines = data.reservationRooms ?? [];
  const nightsRows = data.reservationNights ?? [];
  const addOns = data.reservationAddOns ?? [];
  const payments = data.payments ?? [];
  const refunds = data.refunds ?? [];
  const linesByRes = groupBy(lines, (l) => l.reservationId);
  const nightsByRes = groupBy(nightsRows, (n) => n.reservationId);
  const addOnsByRes = groupBy(addOns, (a) => a.reservationId);
  const payByRes = groupBy(payments.filter((p) => p.status === "received"), (p) => p.reservationId);
  const refByRes = groupBy(refunds.filter((x) => x.status === "paid"), (x) => x.reservationId);
  const cancelById = new Map((data.cancellations ?? []).map((c) => [c.id, c]));
  const numbersSeen = new Set();
  for (const r of data.reservations ?? []) {
    const myLines = linesByRes.get(r.id) ?? [];
    const myNights = nightsByRes.get(r.id) ?? [];
    if (numbersSeen.has(r.number)) add("booking-number", "reservations", r.id, "Duplicate booking number."); numbersSeen.add(r.number);
    if (r.nights !== diffDays(r.arrival, r.departure)) add("nights", "reservations", r.id, `nights is ${r.nights} but the dates give ${diffDays(r.arrival, r.departure)}.`);
    if (r.roomCount !== myLines.length) add("room-count", "reservations", r.id, `roomCount ${r.roomCount} ≠ ${myLines.length} room lines.`);
    if (r.adults !== myLines.reduce((s, l) => s + l.adults, 0)) add("pax", "reservations", r.id, "Adults do not match the room lines.");
    if (myNights.length !== myLines.length * r.nights) add("night-rows", "reservations", r.id, `Expected ${myLines.length * r.nights} night rows, found ${myNights.length}.`);
    const cancelled = r.status === "cancelled" || r.status === "no-show";
    const net = myNights.reduce((s, n) => s + n.net, 0) + (addOnsByRes.get(r.id) ?? []).reduce((s, a) => s + a.total, 0);
    const tax = myNights.reduce((s, n) => s + n.tax, 0) + (addOnsByRes.get(r.id) ?? []).reduce((s, a) => s + percentOf(a.total, a.taxPct), 0);
    if (cancelled) {
      const c = cancelById.get(r.cancellationId);
      if (!c) add("cancellation", "reservations", r.id, "A cancelled booking needs a cancellation record.");
      else if (r.total !== c.penalty) add("totals", "reservations", r.id, `Cancelled booking total ${r.total} ≠ penalty ${c.penalty}.`);
    } else {
      if (r.subtotal !== net) add("totals", "reservations", r.id, `subtotal ${r.subtotal} ≠ nights + add-ons ${net}.`);
      if (r.taxTotal !== tax) add("totals", "reservations", r.id, `taxTotal ${r.taxTotal} ≠ ${tax}.`);
      if (r.total !== r.subtotal + r.taxTotal) add("totals", "reservations", r.id, "total ≠ subtotal + tax.");
    }
    const paid = (payByRes.get(r.id) ?? []).reduce((s, p) => s + p.amount, 0) - (refByRes.get(r.id) ?? []).reduce((s, x) => s + x.amount, 0);
    if (r.paid !== paid) add("paid", "reservations", r.id, `paid ${r.paid} ≠ payments − refunds ${paid}.`);
    if (r.balance !== r.total - r.paid) add("balance", "reservations", r.id, "balance ≠ total − paid.");
    if (r.status === "tentative" && !r.optionDate) add("option-date", "reservations", r.id, "A tentative booking needs an option date.");
    if (r.status === "guaranteed" && r.guaranteeType === "none") add("guarantee", "reservations", r.id, "A guaranteed booking needs a guarantee type.");
  }
  for (const n of nightsRows) {
    const gross = n.net + n.tax;
    if (n.total !== gross) add("night-total", "reservationNights", n.id, `total ${n.total} ≠ net + tax ${gross}.`);
    if (n.net !== n.baseRate + n.extras - n.discount) add("night-net", "reservationNights", n.id, "net ≠ base + extras − discount.");
  }
  const recNos = new Set();
  for (const p of payments) {
    if (p.receiptNo) { if (recNos.has(p.receiptNo)) add("receipt-number", "payments", p.id, "Duplicate receipt number."); recNos.add(p.receiptNo); }
  }

  const approvalById = new Map((data.approvalRequests ?? []).map((a) => [a.id, a]));
  for (const x of refunds) {
    if ((x.status === "pending-approval" || x.status === "approved") && !approvalById.has(x.approvalId)) add("refund-approval", "refunds", x.id, "A refund waiting for approval (or approved) needs its approval request.");
  }

  /* 5 – rooms are never double-assigned, match the room type and are not out of order */
  const resById = new Map((data.reservations ?? []).map((r) => [r.id, r]));
  /** @type {Map<string, string>} */ const roomNight = new Map();
  const oooByRoom = groupBy(data.outOfOrderPeriods ?? [], (p) => p.roomId);
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  for (const l of lines) {
    if (!l.roomId) continue;
    const r = resById.get(l.reservationId);
    if (!r || !(/** @type {readonly string[]} */ (INVENTORY_STATUSES)).includes(r.status)) continue;
    if (roomById.get(l.roomId)?.roomTypeId !== l.roomTypeId) add("room-type", "reservationRooms", l.id, "The assigned room is of a different room type.");
    for (const d of dateRange(r.arrival, r.departure)) {
      const k = `${l.roomId}|${d}`;
      if (roomNight.has(k)) add("double-assignment", "reservationRooms", l.id, `Room ${l.roomId} is also assigned to ${roomNight.get(k)} on ${d}.`);
      roomNight.set(k, l.id);
      if ((oooByRoom.get(l.roomId) ?? []).some((p) => p.from <= d && d <= p.to)) add("out-of-order", "reservationRooms", l.id, `Room ${l.roomId} is out of order on ${d}.`);
    }
  }

  /* 6 – inventory = what the bookings say, and never negative */
  const invRows = data.inventoryDays ?? [];
  if (invRows.length && data.roomTypes && data.reservations) {
    const dates = invRows.map((d) => d.date).sort();
    const expected = computeInventory({
      rooms: rooms.map((r) => ({ id: r.id, roomTypeId: r.roomTypeId, active: r.active })), outOfOrderPeriods: data.outOfOrderPeriods ?? [], reservations: data.reservations,
      reservationRooms: lines, groupBlocks: data.groupBlocks ?? [], overbookingLimits: data.overbookingLimits ?? [],
    }, dates[0], dates.at(-1) ?? dates[0], data.roomTypes);
    const have = new Map(invRows.map((d) => [d.id, d]));
    for (const e of expected) {
      const h = have.get(e.id);
      if (!h) { add("inventory-missing", "inventoryDays", e.id, "No inventory row for this night."); continue; }
      for (const k of /** @type {const} */ (["total", "outOfOrder", "sold", "groupUnpicked", "overbooking"])) if (h[k] !== e[k]) add("inventory-mismatch", "inventoryDays", e.id, `${k} is ${h[k]} but the bookings give ${e[k]}.`);
      if (availability(h).free < 0) add("inventory-negative", "inventoryDays", e.id, `More rooms sold than exist (${availability(h).free}).`);
    }
  }

  /* 7 – groups: picked rooms never exceed the block */
  /** @type {Map<string, number>} */ const picked = new Map();
  for (const l of lines) {
    const r = resById.get(l.reservationId);
    if (!r?.groupId || !(/** @type {readonly string[]} */ (INVENTORY_STATUSES)).includes(r.status)) continue;
    for (const d of dateRange(r.arrival, r.departure)) { const k = `${r.groupId}|${l.roomTypeId}|${d}`; picked.set(k, (picked.get(k) ?? 0) + 1); }
  }
  for (const b of data.groupBlocks ?? []) if ((picked.get(`${b.groupId}|${b.roomTypeId}|${b.date}`) ?? 0) > b.rooms - b.released) add("group-over-pick", "groupBlocks", b.id, "More rooms picked than the block holds.");

  /* 8 – number series continue after the highest used number */
  const booking = (data.numberSeries ?? []).find((s) => s.code === "BOOKING");
  if (booking) {
    const max = Math.max(0, ...(data.reservations ?? []).map((r) => Number(String(r.number).replace("FK-", ""))));
    if (booking.next <= max) add("number-series", "numberSeries", booking.id, `Next booking number ${booking.next} is not above the highest used (${max}).`);
  }
  return { ok: issues.length === 0, issues, records };
}

/** @template T @param {T[]} rows @param {(r: T) => string} key @returns {Map<string, T[]>} */
function groupBy(rows, key) {
  /** @type {Map<string, T[]>} */ const m = new Map();
  for (const r of rows) { const k = key(r); if (k === undefined) continue; if (!m.has(k)) m.set(k, []); /** @type {T[]} */ (m.get(k)).push(r); }
  return m;
}

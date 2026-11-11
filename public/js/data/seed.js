// @ts-check
/**
 * Demo data for The Aviv Kochi – generated with a seeded random generator, so it is identical every time.
 * Built in layers (js/data/seed/): setup masters → people → guests and accounts → bookings → extras (enquiries, approvals, channels).
 * Business date = the computer's date when the data is created (change it in dev-tools/dev-panel).
 */
import { SCHEMA_VERSION } from "../config.js";
import { realToday, addDays } from "../core/format.js";
import { createRandom } from "../core/random.js";
import { computeInventory } from "../domain/inventory.js";
import { buildMasters } from "./seed/masters.js";
import { buildPeople } from "./seed/people.js";
import { buildGuests, buildAccounts } from "./seed/guests.js";
import { buildBookings } from "./seed/bookings.js";
import { buildExtras } from "./seed/extras.js";

/**
 * @param {string} [today] business date to build around (default: the computer's date)
 * @returns {import("../core/store.js").Database}
 */
export function buildSeed(today = realToday()) {
  const masters = buildMasters(today);
  const people = buildPeople(today);
  const guests = buildGuests(today);
  const { accounts, contracts } = buildAccounts(today);
  const M = masters.collections;

  const bookings = buildBookings({ today, masters: M, aux: masters.aux, guests, accounts, contracts });
  const B = bookings.collections;
  const extras = buildExtras({ today, masters: M, bookings: B, guests });

  /* ── room status (clean / dirty / occupied / out of order) ── */
  const rooms = /** @type {any[]} */ (M.rooms);
  const occupiedNow = new Set(B.reservationRooms.filter((l) => { const r = B.reservations.find((x) => x.id === l.reservationId); return r?.status === "checked-in" && l.roomId; }).map((l) => l.roomId));
  const rng = createRandom("aviv-room-status-v1");
  for (const r of rooms) {
    if (r.status === "out-of-order") continue;
    r.status = occupiedNow.has(r.id) ? "occupied" : "ready";
  }
  for (const r of rng.sample(rooms.filter((x) => x.status === "ready"), 7)) r.status = "dirty";

  /* ── guest history: earlier stays (before the demo window) plus the seeded bookings ── */
  const stayStats = new Map();
  for (const r of B.reservations) {
    if (!["checked-in", "checked-out"].includes(r.status)) continue;
    const s = stayStats.get(r.guestId) ?? { stays: 0, nights: 0, last: "" };
    s.stays++; s.nights += r.nights; if (r.departure > s.last) s.last = r.departure;
    stayStats.set(r.guestId, s);
  }
  const histRng = createRandom("aviv-guest-history-v1");
  for (const g of guests) {
    const prior = histRng.weighted([[0, 45], [1, 25], [2, 14], [3, 8], [5, 5], [8, 3]]);
    const s = stayStats.get(g.id);
    g.stays = prior + (s?.stays ?? 0);
    g.nights = prior * histRng.int(2, 3) + (s?.nights ?? 0);
    if (s) g.lastStay = s.last > today ? today : s.last;
    else if (prior > 0) g.lastStay = addDays(today, -histRng.int(45, 600));
  }

  /* ── inventory per room type per night: 45 days back to one year ahead ── */
  const inventoryDays = computeInventory({
    rooms: rooms.map((r) => ({ id: r.id, roomTypeId: r.roomTypeId, active: r.active })),
    outOfOrderPeriods: B.outOfOrderPeriods, reservations: B.reservations, reservationRooms: B.reservationRooms, groupBlocks: B.groupBlocks, overbookingLimits: M.overbookingLimits,
  }, addDays(today, -45), addDays(today, 365), M.roomTypes);

  const auditLog = [...B.auditLog, ...extras.auditLog].sort((a, b) => a.at.localeCompare(b.at)).map((a, i) => ({ ...a, id: `AU-${String(i + 1).padStart(6, "0")}` }));
  const messageLogs = [...B.messageLogs, ...extras.enquiryMessages].sort((a, b) => a.at.localeCompare(b.at));

  return {
    version: SCHEMA_VERSION,
    meta: { businessDate: today, idCounters: { AU: auditLog.length }, seededOn: today },
    collections: {
      ...M, rooms,
      permissions: people.permissions, roles: people.roles, users: people.users, approvalLimits: people.approvalLimits,
      guests, accounts, contracts,
      groups: B.groups, groupBlocks: B.groupBlocks, outOfOrderPeriods: B.outOfOrderPeriods,
      reservations: B.reservations, reservationRooms: B.reservationRooms, reservationNights: B.reservationNights, sharers: B.sharers, billingInstructions: B.billingInstructions,
      reservationAddOns: B.reservationAddOns, specialRequests: B.specialRequests, notes: B.notes, attachments: B.attachments, payments: B.payments, paymentLinks: B.paymentLinks,
      refunds: B.refunds, cancellations: B.cancellations,
      enquiries: extras.enquiries, waitlist: extras.waitlist, approvalRequests: extras.approvalRequests, channelMappings: extras.channelMappings, channelMessages: extras.channelMessages,
      channelSyncLogs: extras.channelSyncLogs, numberSeries: extras.numberSeries, messageLogs, inventoryDays, auditLog, notifications: extras.notifications,
      demo: [{ id: "counter", value: 0 }],
    },
  };
}

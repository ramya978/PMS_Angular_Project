// @ts-check
/**
 * Room-type inventory per night (InventoryDay), computed from the bookings.
 *
 *   free      = total rooms − out of order − sold − group rooms still unpicked
 *   sellable  = free + overbooking allowance            (never offer more than this)
 *
 * "sold" counts every room line of a booking whose status uses a room (tentative, confirmed, guaranteed, checked in, checked out).
 * Cancelled and no-show bookings give the room back. An out-of-order period blocks the room on every night from its start date to its end date, both included.
 */
import { addDays, dateRange } from "../core/format.js";
import { INVENTORY_STATUSES } from "./schemas.js";

/**
 * @typedef {Object} InventorySource
 * @property {Array<{ id: string, roomTypeId: string, active: boolean }>} rooms
 * @property {Array<{ id: string, roomId: string, from: string, to: string }>} outOfOrderPeriods
 * @property {Array<{ id: string, status: string, arrival: string, departure: string, groupId?: string }>} reservations
 * @property {Array<{ id: string, reservationId: string, roomTypeId: string }>} reservationRooms
 * @property {Array<{ groupId: string, roomTypeId: string, date: string, rooms: number, released: number }>} groupBlocks
 * @property {Array<{ roomTypeId: string, from: string, to: string, kind: string, rooms: number }>} overbookingLimits
 */

/**
 * Night-by-night counts of sold rooms and group pickup.
 * @param {InventorySource} src
 * @returns {{ sold: Map<string, number>, picked: Map<string, number> }} keyed "roomTypeId|date"
 */
export function countSold(src) {
  const byId = new Map(src.reservations.map((r) => [r.id, r]));
  /** @type {Map<string, number>} */ const sold = new Map();
  /** @type {Map<string, number>} */ const picked = new Map();
  for (const line of src.reservationRooms) {
    const r = byId.get(line.reservationId);
    if (!r || !(/** @type {readonly string[]} */ (INVENTORY_STATUSES)).includes(r.status)) continue;
    for (const d of dateRange(r.arrival, r.departure)) {
      const key = `${line.roomTypeId}|${d}`;
      sold.set(key, (sold.get(key) ?? 0) + 1);
      if (r.groupId) {
        const gk = `${r.groupId}|${key}`;
        picked.set(gk, (picked.get(gk) ?? 0) + 1);
      }
    }
  }
  return { sold, picked };
}

/**
 * Full inventory for a date range.
 * @param {InventorySource} src
 * @param {string} from first night
 * @param {string} to last night (included)
 * @param {Array<{ id: string, code: string }>} roomTypes
 * @returns {import("./models.js").InventoryDay[]}
 */
export function computeInventory(src, from, to, roomTypes) {
  const { sold, picked } = countSold(src);
  const roomType = new Map(src.rooms.map((r) => [r.id, r.roomTypeId]));
  const totalByType = new Map(roomTypes.map((t) => [t.id, src.rooms.filter((r) => r.active && r.roomTypeId === t.id).length]));
  const dates = dateRange(from, addDays(to, 1));
  /** @type {import("./models.js").InventoryDay[]} */
  const out = [];
  for (const t of roomTypes) {
    const periods = src.outOfOrderPeriods.filter((p) => roomType.get(p.roomId) === t.id);
    const blocks = src.groupBlocks.filter((b) => b.roomTypeId === t.id);
    const over = src.overbookingLimits.filter((o) => o.roomTypeId === t.id && o.kind === "overbooking");
    for (const d of dates) {
      let unpicked = 0;
      for (const b of blocks) if (b.date === d) unpicked += Math.max(0, b.rooms - b.released - (picked.get(`${b.groupId}|${t.id}|${d}`) ?? 0));
      out.push({
        id: `${t.id}|${d}`, roomTypeId: t.id, date: d, total: totalByType.get(t.id) ?? 0,
        outOfOrder: periods.filter((p) => p.from <= d && d <= p.to).length,
        sold: sold.get(`${t.id}|${d}`) ?? 0, groupUnpicked: unpicked,
        overbooking: over.filter((o) => o.from <= d && d <= o.to).reduce((s, o) => s + o.rooms, 0),
      });
    }
  }
  return out;
}

/**
 * @param {import("./models.js").InventoryDay} day
 * @returns {{ free: number, sellable: number }}
 */
export function availability(day) {
  const free = day.total - day.outOfOrder - day.sold - day.groupUnpicked;
  return { free, sellable: Math.max(0, free + day.overbooking) };
}

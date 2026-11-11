// @ts-check
/** Global search service: looks through bookings, guests, rooms, companies / agents and enquiries (only what the person may open). */
import * as store from "../../core/store.js";
import { currentUser } from "../../core/auth.js";
import { can } from "../../core/permissions.js";
import { searchAll } from "../../domain/search.js";
import { ServiceError, respond } from "./util.js";

/** Which screen a kind of result opens, and the permission needed to see it. */
export const KIND_SCREEN = /** @type {const} */ ({ booking: "RS-07", guest: "RS-18", room: "FD-07", account: "RS-19", enquiry: "RS-03" });

/**
 * @param {{ q: string, perKind?: number }} o
 * @returns {Promise<{ query: string, total: number, groups: Record<"booking" | "guest" | "room" | "account" | "enquiry", import("../../domain/search.js").Hit[]> }>}
 */
export const search = (o) =>
  respond(() => {
    const q = (o.q ?? "").trim();
    if (q.length < 2) throw new ServiceError("VALIDATION", "Type at least 2 characters to search.", { q: "Type at least 2 characters." });
    const data = store.peekAll();
    const groups = searchAll({ reservations: data.reservations, guests: data.guests, rooms: data.rooms, roomTypes: data.roomTypes, accounts: data.accounts, enquiries: data.enquiries }, q, { perKind: o.perKind ?? 50 });
    // hide what the person is not allowed to open (rooms lead to the Front Desk phase, so they are always shown)
    if (currentUser()) {
      for (const kind of /** @type {Array<keyof typeof KIND_SCREEN>} */ (Object.keys(groups))) {
        if (kind !== "room" && !can(`${KIND_SCREEN[kind]}.view`)) groups[kind] = [];
      }
    }
    return { query: q, total: Object.values(groups).reduce((n, g) => n + g.length, 0), groups };
  });

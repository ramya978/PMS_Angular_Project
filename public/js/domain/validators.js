// @ts-check
/**
 * Validators: the one place forms and mock services ask "is this allowed?".
 *  - field rules (GSTIN, email, phone …) are re-exported from fieldrules.js
 *  - validateEntity() checks a whole record against its schema
 *  - booking rules (stay dates, occupancy, minimum age …) are in validateStay()
 */
import { SCHEMAS } from "./schemas.js";
import { validate } from "./schema.js";
import { diffDays, isISODate } from "../core/format.js";
import { classifyChildren, stayDates } from "./fieldrules.js";

export * from "./fieldrules.js";

/**
 * Validate a record of a collection.
 * @param {string} collection e.g. "rooms"
 * @param {any} record
 * @param {{ allowExtra?: boolean }} [opts]
 * @returns {{ ok: boolean, errors: Record<string, string> }}
 */
export function validateEntity(collection, record, opts) {
  const schema = SCHEMAS[collection];
  if (!schema) throw new Error(`No schema for collection "${collection}"`);
  return validate(record, schema, opts);
}

/**
 * Booking-level rules that need the hotel parameters and room type limits.
 * @param {{ arrival: string, departure: string, adults: number, childAges: number[], extraBed?: boolean }} stay one room
 * @param {{ maxAdults: number, maxChildren: number, maxOccupancy: number, extraBedAllowed: boolean, baseOccupancy: number }} roomType
 * @param {import("./models.js").ReservationParameters} params
 * @param {string} businessDate
 * @returns {Record<string, string>} field → message (empty when fine)
 */
export function validateStay(stay, roomType, params, businessDate) {
  /** @type {Record<string, string>} */
  const e = {};
  const dates = stayDates(stay.arrival, stay.departure);
  if (dates) e.departure = dates;
  else if (isISODate(stay.arrival) && isISODate(stay.departure)) {
    if (stay.arrival < businessDate) e.arrival = "Check-in cannot be before today's business date.";
    const nights = diffDays(stay.arrival, stay.departure);
    if (nights > params.maxStayNights) e.departure = `A booking can be at most ${params.maxStayNights} nights. For longer stays, split the booking.`;
    if (diffDays(businessDate, stay.arrival) > params.maxAdvanceBookingDays) e.arrival = `Bookings can be made up to ${params.maxAdvanceBookingDays} days ahead.`;
  }
  if (!(stay.adults >= 1)) e.adults = "At least one adult is needed in every room.";
  const kids = classifyChildren(stay.childAges, params);
  const adultsCharged = stay.adults + kids.asAdults;
  if (stay.childAges.length > roomType.maxChildren + kids.asAdults) e.children = `This room type takes at most ${roomType.maxChildren} children.`;
  if (adultsCharged > roomType.maxAdults) e.adults = `This room type takes at most ${roomType.maxAdults} adults (children over ${params.childFreeMaxAge} count as adults).`;
  if (adultsCharged + kids.free > roomType.maxOccupancy) e.adults = `This room type sleeps at most ${roomType.maxOccupancy} people.`;
  if (stay.extraBed && !roomType.extraBedAllowed) e.extraBed = "An extra bed cannot be added to this room type.";
  return e;
}

// @ts-check
/**
 * Runtime schema of every collection in the mock database (see models.js for the matching JSDoc types).
 * `SCHEMAS[collection]` is used by validateEntity(), by every mock-service write, and by the tests that check the whole seed.
 */
import { f } from "./schema.js";
import * as rule from "./fieldrules.js";

/** @param {(v: any) => string | null} fn @returns {{ check: (v: any) => string | null }} */
const via = (fn) => ({ check: (v) => fn(v) });

const id = f.string({ required: true, min: 1, max: 40, label: "id" });
const str = (/** @type {Partial<import("./schema.js").FieldSpec>} */ o = {}) => f.string({ max: 500, ...o });
const ids = f.array(f.string());
const paise = (/** @type {Partial<import("./schema.js").FieldSpec>} */ o = {}) => f.money({ min: 0, ...o });
const pct = (/** @type {Partial<import("./schema.js").FieldSpec>} */ o = {}) => f.number({ min: -100, max: 100, ...o });
const active = f.bool();
const code = f.string({ required: true, ...via(rule.code), label: "code" });

export const RESERVATION_STATUSES = /** @type {const} */ (["tentative", "confirmed", "guaranteed", "checked-in", "checked-out", "cancelled", "no-show"]);
/** Statuses whose room-nights use up inventory. */
export const INVENTORY_STATUSES = /** @type {const} */ (["tentative", "confirmed", "guaranteed", "checked-in", "checked-out"]);
export const ROOM_STATUSES = /** @type {const} */ (["ready", "dirty", "occupied", "out-of-order"]);
export const GUARANTEE_TYPES = /** @type {const} */ (["none", "card", "advance", "company", "agent"]);
export const DEPARTMENTS = /** @type {const} */ (["front-office", "housekeeping", "f&b", "transport", "spa", "engineering", "concierge", "sales"]);
export const APPROVAL_TYPES = /** @type {const} */ (["discount", "rate-override", "refund", "penalty-waiver", "overbooking", "complimentary", "void-payment"]);

const address = f.object({
  line1: str(), city: str(), state: str(), pin: f.string({ ...via(rule.indianPincode) }), country: f.string({ min: 2, max: 2 }),
});

/** @type {Record<string, import("./schema.js").Schema>} */
export const SCHEMAS = {
  /* ───────── Reservation setup ───────── */
  property: {
    id, name: str({ required: true }), shortName: str({ required: true }), address: str({ required: true }), city: str(), state: str(), pin: f.string({ ...via(rule.indianPincode) }),
    country: f.string({ min: 2, max: 2 }), phone: f.string({ ...via(rule.phoneAny) }), email: f.string({ ...via(rule.email) }), website: str(),
    gstin: f.string({ required: true, ...via(rule.gstin) }), pan: f.string({ ...via(rule.pan) }), gstStateCode: f.string({ pattern: /^\d{2}$/ }),
    rooms: f.int({ required: true, min: 1, max: 2000 }), checkInTime: f.time(), checkOutTime: f.time(), auditTime: f.time(),
    financialYearStartMonth: f.int({ min: 1, max: 12 }), timezone: str(), currency: f.string({ min: 3, max: 3 }), centralCode: str(), clubEnabled: f.bool(),
  },
  blocks: { id, code, name: str({ required: true }) },
  floors: { id, number: f.int({ required: true, min: 0, max: 60 }), name: str({ required: true }), blockId: f.string() },
  roomFeatures: { id, code, name: str({ required: true }), category: f.enum(["view", "bed", "comfort", "access"], { required: true }) },
  roomTypes: {
    id, code, name: str({ required: true }), description: str({ max: 1000 }), baseOccupancy: f.int({ required: true, min: 1, max: 6 }),
    maxAdults: f.int({ required: true, min: 1, max: 8 }), maxChildren: f.int({ required: true, min: 0, max: 4 }), maxOccupancy: f.int({ required: true, min: 1, max: 10 }),
    extraBedAllowed: f.bool({ required: true }), bedOptions: ids, amenities: ids, photos: ids, sortOrder: f.int({ min: 0 }), active,
  },
  rooms: {
    id, number: f.string({ required: true, ...via(rule.roomNumber) }), floor: f.int({ required: true, min: 0, max: 60 }), roomTypeId: f.string({ required: true }),
    view: f.enum(["garden", "pool", "city", "backwater"], { required: true }), bed: f.enum(["king", "twin"], { required: true }), featureIds: ids,
    connectingRoomId: f.string(), lockId: f.string(), status: f.enum(ROOM_STATUSES, { required: true }), active,
  },
  outOfOrderPeriods: { id, roomId: f.string({ required: true }), from: f.date({ required: true }), to: f.date({ required: true, check: (v, r) => rule.stayDates(r.from, v) }), reasonId: f.string(), notes: str(), createdBy: f.string() },
  mealPlans: {
    id, code, name: str({ required: true }), description: str(), breakfast: paise({ required: true }), lunch: paise({ required: true }), dinner: paise({ required: true }),
    includesBreakfast: f.bool(), includesLunch: f.bool(), includesDinner: f.bool(), active,
  },
  taxSlabs: {
    id, name: str({ required: true }), minRate: paise({ required: true }), maxRate: paise({ min: 1 }), ratePct: f.number({ required: true, min: 0, max: 50 }),
    cgstPct: f.number({ required: true, min: 0, max: 25 }), sgstPct: f.number({ required: true, min: 0, max: 25 }), igstPct: f.number({ required: true, min: 0, max: 50 }),
    effectiveFrom: f.date({ required: true }), effectiveTo: f.date(), active,
  },
  ratePlans: {
    id, code, name: str({ required: true }), type: f.enum(["bar", "member", "advance", "corporate", "agent", "package", "group", "complimentary"], { required: true }),
    description: str(), mealPlanId: f.string({ required: true }), isBase: f.bool({ required: true }),
    derivation: f.object({ baseRatePlanId: f.string({ required: true }), mode: f.enum(["none", "percent", "amount"], { required: true }), value: f.number({ required: true }) }),
    roomTypeIds: f.array(f.string(), { required: true, min: 1 }), extraAdultCharge: paise(), extraChildCharge: paise(), extraBedCharge: paise(),
    inclusions: ids, cancellationPolicyId: f.string({ required: true }), depositPolicyId: f.string({ required: true }), channelIds: ids,
    bookingWindow: f.object({ minAdvanceDays: f.int({ min: 0 }), maxAdvanceDays: f.int({ min: 0 }) }), promoCode: str(),
    visibility: f.enum(["public", "members", "agents", "corporate", "hidden"], { required: true }), minStay: f.int({ min: 1 }), sellFrom: f.date(), sellTo: f.date(),
    packageId: f.string(), sortOrder: f.int({ min: 0 }), active,
  },
  rateCalendar: { id, roomTypeId: f.string({ required: true }), ratePlanId: f.string({ required: true }), date: f.date({ required: true }), rate1: paise({ required: true }), rate2: paise({ required: true }) },
  seasons: { id, name: str({ required: true }), kind: f.enum(["peak", "regular", "monsoon", "shoulder"], { required: true }), from: f.date({ required: true }), to: f.date({ required: true, check: (v, r) => (v >= r.from ? null : "The season must end on or after it starts.") }), adjustmentPct: pct({ required: true }), notes: str() },
  specialDates: { id, name: str({ required: true }), kind: f.enum(["festival", "event", "holiday"], { required: true }), from: f.date({ required: true }), to: f.date({ required: true, check: (v, r) => (v >= r.from ? null : "The special date must end on or after it starts.") }), adjustmentPct: pct(), minStay: f.int({ min: 1 }), approximate: f.bool(), notes: str() },
  restrictions: {
    id, roomTypeId: f.string(), ratePlanId: f.string(), from: f.date({ required: true }), to: f.date({ required: true, check: (v, r) => (v >= r.from ? null : "The restriction must end on or after it starts.") }),
    daysOfWeek: f.array(f.int({ min: 0, max: 6 })), minStay: f.int({ min: 1, max: 60 }), maxStay: f.int({ min: 1, max: 365 }),
    closedToArrival: f.bool({ required: true }), closedToDeparture: f.bool({ required: true }), stopSell: f.bool({ required: true }), reason: str(), createdBy: f.string(),
  },
  overbookingLimits: { id, roomTypeId: f.string({ required: true }), from: f.date({ required: true }), to: f.date({ required: true, check: (v, r) => (v >= r.from ? null : "The period must end on or after it starts.") }), kind: f.enum(["overbooking", "allotment", "hold"], { required: true }), rooms: f.int({ required: true, min: 0, max: 100 }), channelId: f.string(), notes: str() },
  cancellationPolicies: {
    id, code, name: str({ required: true }),
    rules: f.array(f.object({ minHoursBefore: f.int({ required: true, min: 0 }), penaltyType: f.enum(["none", "nights", "percent", "amount"], { required: true }), penaltyValue: f.number({ required: true, min: 0 }) }), { required: true, min: 1 }),
    noShowPenalty: f.object({ type: f.enum(["none", "nights", "percent", "amount"], { required: true }), value: f.number({ required: true, min: 0 }) }, { required: true }),
    nonRefundable: f.bool({ required: true }), guestText: str({ required: true, max: 1000 }), active,
  },
  depositPolicies: {
    id, code, name: str({ required: true }), kind: f.enum(["none", "nights", "percent", "amount"], { required: true }), value: f.number({ required: true, min: 0 }),
    dueRule: f.enum(["on-booking", "days-after-booking", "days-before-arrival", "option-date"], { required: true }), dueDays: f.int({ min: 0, max: 365 }),
    ifUnpaid: f.enum(["alert", "release", "cancel"], { required: true }), acceptedGuarantees: f.array(f.enum(GUARANTEE_TYPES), { required: true, min: 1 }), guestText: str({ max: 1000 }), active,
  },
  reservationParameters: {
    id, checkInTime: f.time({ required: true }), checkOutTime: f.time({ required: true }), minGuestAge: f.int({ required: true, min: 1, max: 30 }), childFreeMaxAge: f.int({ required: true, min: 0, max: 17 }),
    childFreeMaxCount: f.int({ required: true, min: 0, max: 6 }), extraBedCharge: paise({ required: true }), maxExtraBedsPerRoom: f.int({ required: true, min: 0, max: 3 }),
    defaultOptionDays: f.int({ required: true, min: 0, max: 30 }), maxAdvanceBookingDays: f.int({ required: true, min: 1, max: 1000 }), maxStayNights: f.int({ required: true, min: 1, max: 365 }),
    maxRoomsPerBooking: f.int({ required: true, min: 1, max: 100 }), petsAllowed: f.bool({ required: true }), sessionTimeoutMinutes: f.int({ required: true, min: 1, max: 240 }),
    defaultSourceId: f.string(), defaultSegmentId: f.string(), gstStateCode: f.string({ required: true, pattern: /^\d{2}$/ }), currency: f.string({ required: true, min: 3, max: 3 }),
    auditTime: f.time({ required: true }), weekendDays: f.array(f.int({ min: 0, max: 6 })), weekendUpliftPct: f.number({ min: 0, max: 100 }),
  },
  sources: { id, code, name: str({ required: true }), type: f.enum(["direct", "brand", "ota", "agent", "corporate", "walk-in"], { required: true }), channelId: f.string(), active },
  segments: { id, code, name: str({ required: true }), active },
  channels: { id, code, name: str({ required: true }), type: f.enum(["brand", "website", "ota"], { required: true }), commissionPct: f.number({ required: true, min: 0, max: 40 }), protocol: str(), contactEmail: f.string({ ...via(rule.email) }), lastSyncAt: f.datetime(), active },
  channelMappings: { id, channelId: f.string({ required: true }), externalRoomCode: str({ required: true }), externalRoomName: str(), externalRateCode: str({ required: true }), roomTypeId: f.string({ required: true }), ratePlanId: f.string({ required: true }), active },
  outlets: { id, code, name: str({ required: true }), type: f.enum(["restaurant", "bar", "spa", "hall", "room-service"], { required: true }), seasonFromMonth: f.int({ min: 1, max: 12 }), seasonToMonth: f.int({ min: 1, max: 12 }), capacity: f.int({ min: 0 }), active },
  addOns: {
    id, code, name: str({ required: true }), description: str(), price: paise({ required: true }),
    unit: f.enum(["per-night", "per-person", "per-person-per-night", "per-stay", "per-item"], { required: true }), taxPct: f.number({ required: true, min: 0, max: 40 }),
    department: f.enum(DEPARTMENTS, { required: true }), outletId: f.string(), postingRule: f.enum(["daily", "on-checkin", "on-date", "on-checkout"], { required: true }), maxQuantity: f.int({ min: 1 }), active,
  },
  packages: { id, code, name: str({ required: true }), description: str({ max: 1000 }), roomTypeIds: f.array(f.string(), { required: true, min: 1 }), items: f.array(f.object({ addOnId: f.string({ required: true }), quantity: f.int({ required: true, min: 1 }) })), minNights: f.int({ required: true, min: 1 }), validFrom: f.date(), validTo: f.date(), active },
  vipLevels: { id, code, name: str({ required: true }), active },
  preferenceCodes: { id, code, name: str({ required: true }), category: f.enum(["room", "food", "service", "family"], { required: true }), active },
  titles: { id, code: f.string({ required: true, max: 10 }), name: str({ required: true }), active },
  countries: { id, code: f.string({ required: true, min: 2, max: 2 }), name: str({ required: true }), dialCode: f.string({ required: true, pattern: /^\+\d{1,4}$/ }), active },
  states: { id, countryCode: f.string({ required: true, min: 2, max: 2 }), code: f.string({ required: true, max: 6 }), name: str({ required: true }), gstStateCode: f.string({ pattern: /^\d{2}$/ }), active },
  specialRequestCodes: { id, code, name: str({ required: true }), department: f.enum(DEPARTMENTS, { required: true }), notify: f.bool({ required: true }), active },
  reasonCodes: { id, type: f.enum(["cancellation", "discount", "rate-change", "upgrade", "lost-enquiry", "refund", "waiver", "no-show", "overbooking", "blacklist", "out-of-order"], { required: true }), code, name: str({ required: true }), remarksRequired: f.bool({ required: true }), active },
  messageTemplates: {
    id, code, name: str({ required: true }), kind: f.enum(["quote", "confirmation", "tentative", "amendment", "cancellation", "receipt", "payment-link", "advance-reminder", "pre-arrival", "waitlist", "option-expiry", "group-confirmation"], { required: true }),
    channel: f.enum(["whatsapp", "email", "sms"], { required: true }), language: f.string({ required: true, min: 2, max: 5 }), subject: str(), body: f.string({ required: true, max: 3000 }), active,
  },
  numberSeries: {
    id, code, name: str({ required: true }), prefix: f.string({ required: true, max: 8 }), includeYear: f.enum(["none", "calendar", "financial"], { required: true }), padding: f.int({ required: true, min: 1, max: 10 }),
    next: f.int({ required: true, min: 1 }), resetPolicy: f.enum(["never", "calendar-year", "financial-year"], { required: true }), lastResetOn: f.date(), active,
  },
  paymentModes: { id, code, name: str({ required: true }), type: f.enum(["cash", "card", "upi", "link", "bank", "cheque", "credit", "prepaid", "voucher"], { required: true }), cardTypes: ids, requiresReference: f.bool({ required: true }), allowsRefund: f.bool({ required: true }), active },
  currencies: { id, code: f.string({ required: true, min: 3, max: 3 }), name: str({ required: true }), symbol: f.string({ required: true, max: 4 }), decimals: f.int({ required: true, min: 0, max: 3 }), isBase: f.bool({ required: true }), active },
  exchangeRates: { id, currencyCode: f.string({ required: true, min: 3, max: 3 }), date: f.date({ required: true }), ratePaise: f.int({ required: true, min: 1 }), source: str() },
  pricingRules: {
    id, name: str({ required: true }), metric: f.enum(["occupancy"], { required: true }), operator: f.enum(["above", "below"], { required: true }), threshold: f.int({ required: true, min: 0, max: 100 }), windowDays: f.int({ required: true, min: 0, max: 365 }),
    adjustmentType: f.enum(["percent", "amount"], { required: true }), adjustmentValue: f.number({ required: true }), floor: paise(), ceiling: paise(), roomTypeIds: ids, mode: f.enum(["suggest", "apply"], { required: true }), enabled: f.bool({ required: true }),
  },

  /* ───────── People ───────── */
  roles: { id, name: str({ required: true }), description: str(), permissions: f.array(f.string(), { required: true, min: 1 }), isSystem: f.bool() },
  permissions: { id, screen: f.string(), action: f.string({ required: true }), description: str({ required: true }) },
  users: {
    id, name: str({ required: true }), email: f.string({ required: true, ...via(rule.email) }), phone: f.string({ ...via(rule.phone) }), roleId: f.string({ required: true }),
    propertyIds: f.array(f.string(), { required: true, min: 1 }), mfaMethod: f.enum(["otp", "pin"], { required: true }), locked: f.bool({ required: true }), lastLoginAt: f.datetime(), createdAt: f.datetime({ required: true }), active,
  },
  approvalLimits: {
    id, roleId: f.string({ required: true }), action: f.enum(["discount-percent", "rate-override-percent", "refund-amount", "penalty-waiver-amount", "overbooking-rooms", "complimentary-nights", "void-payment"], { required: true }),
    limit: f.number({ required: true, min: 0 }), unit: f.enum(["percent", "paise", "rooms", "nights", "count"], { required: true }), escalateAfterMinutes: f.int({ required: true, min: 1, max: 10080 }), nextApproverRoleId: f.string(),
  },

  /* ───────── Reservation ───────── */
  guests: {
    id, title: f.string({ max: 10 }), firstName: str({ required: true }), lastName: str({ required: true }), gender: f.enum(["female", "male", "other"]), dateOfBirth: f.date(),
    nationality: f.string({ min: 2, max: 2 }), email: f.string({ ...via(rule.email) }), phone: f.string({ ...via(rule.phone) }), address,
    vipLevelId: f.string(), clubNumber: str({ max: 20 }), clubTier: f.enum(["member", "silver", "gold", "platinum", "diamond", "signature"]), preferenceIds: ids,
    gstin: f.string({ ...via(rule.gstin) }), companyName: str(), accountId: f.string(), blacklisted: f.bool({ required: true }), blacklistReason: str(),
    consent: f.object({ marketing: f.bool(), whatsapp: f.bool(), email: f.bool(), sms: f.bool(), dataProcessing: f.bool() }), stays: f.int({ required: true, min: 0 }), nights: f.int({ required: true, min: 0 }), lastStay: f.date(), notes: str({ max: 1000 }), createdAt: f.datetime({ required: true }),
  },
  accounts: {
    id, code, name: str({ required: true }), type: f.enum(["company", "travel-agent", "government", "airline"], { required: true }), gstin: f.string({ ...via(rule.gstin) }), pan: f.string({ ...via(rule.pan) }), stateCode: f.string({ pattern: /^\d{2}$/ }),
    address, contacts: f.array(f.object({ name: str({ required: true }), role: str(), email: f.string({ ...via(rule.email) }), phone: f.string({ ...via(rule.phone) }) })), creditLimit: paise({ required: true }), creditDays: f.int({ required: true, min: 0, max: 180 }),
    commissionPct: f.number({ min: 0, max: 40 }), status: f.enum(["active", "on-hold", "blacklisted"], { required: true }), ratePlanId: f.string(), createdAt: f.datetime({ required: true }), notes: str(),
  },
  contracts: { id, accountId: f.string({ required: true }), roomTypeId: f.string(), ratePlanId: f.string({ required: true }), discountPct: pct(), fixedRate: paise(), validFrom: f.date({ required: true }), validTo: f.date({ required: true, check: (v, r) => (v >= r.validFrom ? null : "The contract must end on or after it starts.") }), notes: str() },
  enquiries: {
    id, number: f.string({ required: true }), guestName: str({ required: true }), email: f.string({ ...via(rule.email) }), phone: f.string({ ...via(rule.phone) }), guestId: f.string(), sourceId: f.string({ required: true }),
    from: f.date({ required: true }), to: f.date({ required: true, check: (v, r) => rule.stayDates(r.from, v) }), adults: f.int({ required: true, min: 1 }), children: f.int({ required: true, min: 0 }), rooms: f.int({ required: true, min: 1 }),
    roomTypeId: f.string(), ratePlanId: f.string(), quotedAmount: paise(), status: f.enum(["open", "quoted", "converted", "lost"], { required: true }), followUpOn: f.date(), assignedTo: f.string({ required: true }),
    lostReasonId: f.string(), notes: str({ max: 1000 }), createdAt: f.datetime({ required: true }), reservationId: f.string(),
  },
  reservations: {
    id, number: f.string({ required: true, pattern: /^FK-\d{5,}$/, message: "A booking number looks like FK-10234." }), status: f.enum(RESERVATION_STATUSES, { required: true }), guaranteeType: f.enum(GUARANTEE_TYPES, { required: true }),
    sourceId: f.string({ required: true }), segmentId: f.string({ required: true }), channelId: f.string(), externalRef: str({ max: 40 }), accountId: f.string(), billTo: f.enum(["guest", "company", "agent"], { required: true }),
    bookerGuestId: f.string(), guestId: f.string({ required: true }), arrival: f.date({ required: true }), departure: f.date({ required: true, check: (v, r) => rule.stayDates(r.arrival, v) }),
    nights: f.int({ required: true, min: 1, max: 365 }), roomCount: f.int({ required: true, min: 1, max: 100 }), adults: f.int({ required: true, min: 1 }), children: f.int({ required: true, min: 0 }),
    ratePlanId: f.string({ required: true }), mealPlanId: f.string({ required: true }), subtotal: paise({ required: true }), taxTotal: paise({ required: true }), total: paise({ required: true }),
    paid: paise({ required: true }), balance: f.money({ required: true }), optionDate: f.date(), groupId: f.string(), enquiryId: f.string(), vip: f.bool({ required: true }), locked: f.bool({ required: true }), notes: str({ max: 1000 }),
    specialRequestIds: ids, preferenceIds: ids, createdAt: f.datetime({ required: true }), createdBy: f.string({ required: true }), updatedAt: f.datetime({ required: true }), cancelledAt: f.datetime(), cancellationId: f.string(),
  },
  reservationRooms: {
    id, reservationId: f.string({ required: true }), lineNo: f.int({ required: true, min: 1 }), roomTypeId: f.string({ required: true }), roomId: f.string(), adults: f.int({ required: true, min: 1 }), children: f.int({ required: true, min: 0 }),
    childAges: f.array(f.int({ min: 0, max: 17 })), ratePlanId: f.string({ required: true }), mealPlanId: f.string({ required: true }), extraBed: f.bool({ required: true }), discountPct: pct({ min: 0 }), discountReasonId: f.string(),
  },
  reservationNights: {
    id, reservationId: f.string({ required: true }), roomLineId: f.string({ required: true }), date: f.date({ required: true }), roomTypeId: f.string({ required: true }),
    baseRate: paise({ required: true }), extras: paise({ required: true }), discount: paise({ required: true }), net: paise({ required: true }), taxPct: f.number({ required: true, min: 0, max: 40 }), tax: paise({ required: true }), total: paise({ required: true }), overridden: f.bool({ required: true }),
  },
  sharers: { id, reservationId: f.string({ required: true }), roomLineId: f.string({ required: true }), guestId: f.string(), name: str({ required: true }), age: f.int({ min: 0, max: 120 }), relation: str() },
  billingInstructions: { id, reservationId: f.string({ required: true }), window: f.int({ required: true, min: 1, max: 9 }), payerType: f.enum(["guest", "company", "agent"], { required: true }), accountId: f.string(), charges: f.array(f.enum(["room", "tax", "food", "extras", "all"]), { required: true, min: 1 }), notes: str() },
  reservationAddOns: { id, reservationId: f.string({ required: true }), roomLineId: f.string(), addOnId: f.string({ required: true }), date: f.date({ required: true }), quantity: f.int({ required: true, min: 1 }), unitPrice: paise({ required: true }), total: paise({ required: true }), taxPct: f.number({ required: true, min: 0, max: 40 }), status: f.enum(["planned", "posted"], { required: true }) },
  specialRequests: { id, reservationId: f.string({ required: true }), codeId: f.string({ required: true }), department: f.enum(DEPARTMENTS, { required: true }), notes: str(), status: f.enum(["open", "done"], { required: true }) },
  notes: { id, reservationId: f.string(), guestId: f.string(), kind: f.enum(["guest", "internal"], { required: true }), text: f.string({ required: true, max: 1000 }), createdBy: f.string({ required: true }), createdAt: f.datetime({ required: true }) },
  attachments: { id, reservationId: f.string({ required: true }), name: str({ required: true }), type: str({ required: true }), sizeKb: f.int({ required: true, min: 0 }), uploadedBy: f.string({ required: true }), at: f.datetime({ required: true }) },
  payments: {
    id, receiptNo: f.string(), reservationId: f.string(), groupId: f.string(), kind: f.enum(["advance", "deposit", "balance"], { required: true }), amount: paise({ required: true, min: 1 }), modeId: f.string({ required: true }),
    status: f.enum(["received", "pending", "voided", "failed"], { required: true }), reference: str({ max: 60 }), receivedAt: f.datetime({ required: true }), receivedBy: f.string({ required: true }), currencyCode: f.string({ min: 3, max: 3 }), notes: str(),
  },
  paymentLinks: { id, reservationId: f.string({ required: true }), amount: paise({ required: true, min: 1 }), status: f.enum(["sent", "paid", "expired", "cancelled"], { required: true }), url: str({ required: true }), sentTo: str({ required: true }), channel: f.enum(["whatsapp", "email", "sms"], { required: true }), createdAt: f.datetime({ required: true }), expiresAt: f.datetime({ required: true }) },
  refunds: { id, reservationId: f.string({ required: true }), paymentId: f.string(), amount: paise({ required: true, min: 1 }), modeId: f.string({ required: true }), status: f.enum(["pending-approval", "approved", "paid", "rejected"], { required: true }), reasonId: f.string({ required: true }), approvalId: f.string(), at: f.datetime({ required: true }) },
  cancellations: { id, reservationId: f.string({ required: true }), at: f.datetime({ required: true }), byUserId: f.string({ required: true }), reasonId: f.string({ required: true }), policyId: f.string({ required: true }), penalty: paise({ required: true }), refundDue: paise({ required: true }), waived: f.bool({ required: true }), notes: str() },
  groups: {
    id, name: str({ required: true }), type: f.enum(["wedding", "conference", "tour", "corporate"], { required: true }), accountId: f.string(), contactName: str({ required: true }), contactPhone: f.string({ ...via(rule.phone) }), contactEmail: f.string({ ...via(rule.email) }),
    from: f.date({ required: true }), to: f.date({ required: true, check: (v, r) => rule.stayDates(r.from, v) }), status: f.enum(["tentative", "definite", "cancelled"], { required: true }), cutOffDate: f.date({ required: true }), ratePlanId: f.string({ required: true }),
    hallIds: ids, salesPersonId: f.string({ required: true }), notes: str({ max: 1000 }), createdAt: f.datetime({ required: true }),
  },
  groupBlocks: { id, groupId: f.string({ required: true }), roomTypeId: f.string({ required: true }), date: f.date({ required: true }), rooms: f.int({ required: true, min: 0 }), released: f.int({ required: true, min: 0 }) },
  waitlist: { id, guestName: str({ required: true }), phone: f.string({ ...via(rule.phone) }), email: f.string({ ...via(rule.email) }), guestId: f.string(), roomTypeId: f.string({ required: true }), from: f.date({ required: true }), to: f.date({ required: true, check: (v, r) => rule.stayDates(r.from, v) }), rooms: f.int({ required: true, min: 1 }), adults: f.int({ required: true, min: 1 }), status: f.enum(["waiting", "notified", "converted", "expired", "removed"], { required: true }), createdAt: f.datetime({ required: true }), notes: str() },
  approvalRequests: {
    id, type: f.enum(APPROVAL_TYPES, { required: true }), reservationId: f.string(), requestedBy: f.string({ required: true }), requestedAt: f.datetime({ required: true }), roleNeededId: f.string({ required: true }),
    amount: f.number({ min: 0 }), unit: f.enum(["percent", "paise", "rooms", "nights", "count"]), reasonId: f.string(), reasonNote: str(), status: f.enum(["pending", "approved", "rejected", "escalated"], { required: true }),
    decidedBy: f.string(), decidedAt: f.datetime(), decisionNote: str(), escalateAt: f.datetime(), payload: f.any(),
  },
  messageLogs: { id, reservationId: f.string(), guestId: f.string(), enquiryId: f.string(), templateId: f.string({ required: true }), channel: f.enum(["whatsapp", "email", "sms"], { required: true }), to: str({ required: true }), subject: str(), preview: str({ max: 200 }), status: f.enum(["queued", "sent", "delivered", "read", "failed"], { required: true }), at: f.datetime({ required: true }) },
  channelMessages: {
    id, channelId: f.string({ required: true }), type: f.enum(["booking", "modification", "cancellation"], { required: true }), externalRef: str({ required: true, max: 40 }), receivedAt: f.datetime({ required: true }), status: f.enum(["queued", "processed", "failed"], { required: true }),
    reservationId: f.string(), error: str(), summary: f.object({ guest: str(), from: f.date(), to: f.date(), roomCode: str(), rateCode: str(), amount: paise() }),
  },
  channelSyncLogs: { id, channelId: f.string({ required: true }), kind: f.enum(["rates", "availability", "restrictions"], { required: true }), from: f.date(), to: f.date(), status: f.enum(["success", "partial", "failed"], { required: true }), records: f.int({ required: true, min: 0 }), at: f.datetime({ required: true }), message: str() },
  inventoryDays: { id, roomTypeId: f.string({ required: true }), date: f.date({ required: true }), total: f.int({ required: true, min: 0 }), outOfOrder: f.int({ required: true, min: 0 }), sold: f.int({ required: true, min: 0 }), groupUnpicked: f.int({ required: true, min: 0 }), overbooking: f.int({ required: true, min: 0 }) },

  /* ───────── Common ───────── */
  auditLog: { id, at: f.datetime({ required: true }), userId: f.string({ required: true }), entity: f.string({ required: true }), entityId: f.string({ required: true }), action: f.enum(["create", "update", "delete", "status", "login"], { required: true }), changes: f.array(f.object({ field: f.string({ required: true }), old: f.any(), new: f.any() })), note: str() },
  notifications: { id, kind: f.enum(["approval", "alert", "reminder"], { required: true }), title: str({ required: true }), body: str({ required: true }), at: f.datetime({ required: true }), read: f.bool({ required: true }), href: f.string(), refId: f.string(), roleId: f.string(), userId: f.string() },
  demo: { id, value: f.int({ required: true }) },
};

/** Names of all collections, in a sensible order for dev screens. */
export const COLLECTION_NAMES = Object.keys(SCHEMAS);

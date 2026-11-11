// @ts-check
/**
 * Reservation Setup service. RSS-01 (Setup Home) reads the checklist and the setup change log from here; the other
 * setup screens add their own functions to this module as they are built.
 */
import * as store from "../../core/store.js";
import { evaluateSetup } from "../../domain/setup-checks.js";
import { respond } from "./util.js";

/** Audit entities that belong to Reservation Setup, with the screen that edits each one. */
export const SETUP_ENTITIES = /** @type {Record<string, { label: string, screen: string }>} */ ({
  property: { label: "Hotel details", screen: "RSS-02" },
  roomTypes: { label: "Room type", screen: "RSS-03" },
  rooms: { label: "Room", screen: "RSS-04" },
  outOfOrderPeriods: { label: "Out-of-order period", screen: "RSS-04" },
  mealPlans: { label: "Meal plan", screen: "RSS-05" },
  taxSlabs: { label: "Tax slab", screen: "RSS-06" },
  ratePlans: { label: "Rate plan", screen: "RSS-07" },
  rateCalendar: { label: "Rate", screen: "RSS-08" },
  seasons: { label: "Season", screen: "RSS-09" },
  specialDates: { label: "Special date", screen: "RSS-09" },
  restrictions: { label: "Restriction", screen: "RSS-10" },
  overbookingLimits: { label: "Overbooking rule", screen: "RSS-11" },
  cancellationPolicies: { label: "Cancellation policy", screen: "RSS-12" },
  depositPolicies: { label: "Advance policy", screen: "RSS-13" },
  reservationParameters: { label: "Reservation parameters", screen: "RSS-14" },
  sources: { label: "Source", screen: "RSS-15" },
  segments: { label: "Segment", screen: "RSS-15" },
  channels: { label: "Channel", screen: "RSS-15" },
  channelMappings: { label: "Channel mapping", screen: "RSS-16" },
  addOns: { label: "Add-on", screen: "RSS-17" },
  packages: { label: "Package", screen: "RSS-17" },
  vipLevels: { label: "VIP level", screen: "RSS-18" },
  preferenceCodes: { label: "Preference", screen: "RSS-18" },
  titles: { label: "Title", screen: "RSS-18" },
  countries: { label: "Country", screen: "RSS-18" },
  states: { label: "State", screen: "RSS-18" },
  specialRequestCodes: { label: "Request code", screen: "RSS-19" },
  reasonCodes: { label: "Reason code", screen: "RSS-20" },
  messageTemplates: { label: "Template", screen: "RSS-21" },
  numberSeries: { label: "Numbering series", screen: "RSS-22" },
  paymentModes: { label: "Payment mode", screen: "RSS-23" },
  currencies: { label: "Currency", screen: "RSS-23" },
  exchangeRates: { label: "Exchange rate", screen: "RSS-23" },
  users: { label: "User", screen: "RSS-24" },
  roles: { label: "Role", screen: "RSS-24" },
  approvalLimits: { label: "Approval limit", screen: "RSS-25" },
  pricingRules: { label: "Pricing rule", screen: "RSS-26" },
});

/**
 * The setup checklist for the business date.
 * @returns {Promise<import("../../domain/setup-checks.js").SetupReport & { asOf: string }>}
 */
export const getSetupStatus = () =>
  respond(() => {
    const asOf = store.getMeta("businessDate");
    return { ...evaluateSetup(/** @type {any} */ (store.peekAll()), asOf), asOf };
  });

/**
 * @typedef {Object} SetupChange
 * @property {string} id
 * @property {string} at           ISO date-time
 * @property {string} userId
 * @property {string} userName
 * @property {string} entity       collection name
 * @property {string} entityLabel  e.g. "Room type"
 * @property {string} screen       setup screen that edits it
 * @property {string} entityId
 * @property {string} action       create / update / delete / status
 * @property {string} what         one-line summary of the change
 */

/**
 * Every audited change to setup data, newest first (Setup change audit report RSS-O06).
 * @param {{ from?: string, to?: string, entity?: string, userId?: string, limit?: number }} [q]  `from` / `to` are dates (YYYY-MM-DD, inclusive)
 * @returns {Promise<{ items: SetupChange[], total: number }>}
 */
export const listSetupChanges = (q = {}) =>
  respond(() => {
    const users = new Map(store.filter("users").map((u) => [u.id, u.name]));
    const rows = store.filter("auditLog", (a) =>
      a.entity in SETUP_ENTITIES && (!q.entity || a.entity === q.entity) && (!q.userId || a.userId === q.userId) &&
      (!q.from || a.at.slice(0, 10) >= q.from) && (!q.to || a.at.slice(0, 10) <= q.to));
    rows.sort((x, y) => y.at.localeCompare(x.at) || y.id.localeCompare(x.id));
    const items = rows.slice(0, q.limit ?? 500).map((a) => {
      const meta = SETUP_ENTITIES[a.entity];
      const fields = a.changes.map((c) => c.field).filter((f) => f !== "id");
      const what = a.action === "create" ? "Added" : a.action === "delete" ? "Deleted" : a.note ?? (fields.length ? `Changed ${fields.slice(0, 4).join(", ")}${fields.length > 4 ? ` and ${fields.length - 4} more` : ""}` : "Updated");
      return { id: a.id, at: a.at, userId: a.userId, userName: users.get(a.userId) ?? "System", entity: a.entity, entityLabel: meta.label, screen: meta.screen, entityId: a.entityId, action: a.action, what };
    });
    return { items, total: rows.length };
  });

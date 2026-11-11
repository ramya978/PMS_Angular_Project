// @ts-check
/**
 * The ONE way mock services change data. Every write:
 *   1. checks the permission of the signed-in person (when someone is signed in),
 *   2. validates the whole record against its schema (plain-English messages),
 *   3. updates the mock database,
 *   4. writes the audit log (who, when, which fields changed from what to what),
 *   5. fires an event on the bus ("rooms.updated", "reservations.created" …).
 * These functions are synchronous; services wrap them in respond() to add the simulated network delay.
 */
import * as store from "../../core/store.js";
import { emit } from "../../core/events.js";
import { currentUser } from "../../core/auth.js";
import { can, deniedReason } from "../../core/permissions.js";
import { diffRecords } from "../../domain/diff.js";
import { validateEntity } from "../../domain/validators.js";
import { SCHEMAS } from "../../domain/schemas.js";
import { ServiceError } from "./util.js";

/** Id of the person making the change ("u-system" for background jobs and tests without a session). */
export const actorId = () => currentUser()?.id ?? "u-system";

/** @param {string} [permission] e.g. "RSS-04.edit" */
export function requirePermission(permission) {
  if (permission && currentUser() && !can(permission)) throw new ServiceError("FORBIDDEN", deniedReason(permission));
}

/**
 * A new id that no existing record uses (also for data saved before a counter existed).
 * @param {string} collection
 * @param {string} prefix
 * @param {number} [pad]
 */
export function freshId(collection, prefix, pad = 6) {
  let id = store.nextId(prefix, pad);
  while (store.get(collection, id)) id = store.nextId(prefix, pad);
  return id;
}

/**
 * Add an audit entry.
 * @param {{ entity: string, entityId: string, action: "create" | "update" | "delete" | "status" | "login", changes?: Array<{ field: string, old: any, new: any }>, note?: string, userId?: string }} e
 */
export function recordAudit(e) {
  /** @type {any} */
  const row = { id: freshId("auditLog", "AU"), at: new Date().toISOString(), userId: e.userId ?? actorId(), entity: e.entity, entityId: e.entityId, action: e.action, changes: e.changes ?? [] };
  if (e.note) row.note = e.note;
  store.insert("auditLog", row);
  return row;
}

/** @param {{ ok: boolean, errors: Record<string, string> }} r */
function throwIfInvalid(r) {
  if (r.ok) return;
  const [firstField, firstMessage] = Object.entries(r.errors)[0];
  void firstField;
  throw new ServiceError("VALIDATION", firstMessage, r.errors);
}

/** Collection name → id prefix for generated ids. */
const PREFIX = /** @type {Record<string, string>} */ ({ guests: "GP", accounts: "AC", enquiries: "EQ", payments: "PAY", notifications: "ntf", approvalRequests: "AP", messageLogs: "MSG", waitlist: "WL", notes: "NT" });
export const idPrefix = (/** @type {string} */ collection) => PREFIX[collection] ?? collection.slice(0, 3).toUpperCase();

/**
 * Create a record.
 * @param {string} collection
 * @param {Record<string, any>} record  `id` is generated when missing
 * @param {{ permission?: string, note?: string, audit?: boolean }} [opts]
 */
export function createRecord(collection, record, opts = {}) {
  requirePermission(opts.permission);
  const row = { ...record };
  row.id ??= freshId(collection, idPrefix(collection));
  if (SCHEMAS[collection]) throwIfInvalid(validateEntity(collection, row));
  if (store.get(collection, row.id)) throw new ServiceError("CONFLICT", `A record with id “${row.id}” already exists.`);
  const saved = store.insert(collection, row);
  if (opts.audit !== false) recordAudit({ entity: collection, entityId: saved.id, action: "create", changes: diffRecords(null, saved), note: opts.note });
  emit(`${collection}.created`, { id: saved.id });
  return saved;
}

/**
 * Change fields of a record. Nothing is written (and nothing is logged) when no value actually changes.
 * @param {string} collection
 * @param {string} id
 * @param {Record<string, any>} patch
 * @param {{ permission?: string, note?: string, action?: "update" | "status", audit?: boolean }} [opts]
 */
export function updateRecord(collection, id, patch, opts = {}) {
  requirePermission(opts.permission);
  const before = store.get(collection, id);
  if (!before) throw new ServiceError("NOT_FOUND", "That record no longer exists. Refresh the page and try again.");
  const merged = { ...before, ...patch, id };
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
  if ("updatedAt" in SCHEMAS[collection] && !("updatedAt" in patch)) merged.updatedAt = new Date().toISOString();
  if (SCHEMAS[collection]) throwIfInvalid(validateEntity(collection, merged));
  const changes = diffRecords(before, merged);
  if (!changes.length) return before;
  // fields set to undefined in the patch are removed
  const saved = store.replace(collection, id, merged);
  if (opts.audit !== false) recordAudit({ entity: collection, entityId: id, action: opts.action ?? "update", changes, note: opts.note });
  emit(`${collection}.updated`, { id, changes });
  return saved;
}

/**
 * Delete a record (only for things that were never used; used items are deactivated instead).
 * @param {string} collection
 * @param {string} id
 * @param {{ permission?: string, note?: string }} [opts]
 */
export function deleteRecord(collection, id, opts = {}) {
  requirePermission(opts.permission);
  const before = store.get(collection, id);
  if (!before) throw new ServiceError("NOT_FOUND", "That record no longer exists.");
  store.remove(collection, id);
  recordAudit({ entity: collection, entityId: id, action: "delete", changes: diffRecords(before, null), note: opts.note });
  emit(`${collection}.deleted`, { id });
  return true;
}

/**
 * Deactivate instead of delete once an item has been used.
 * @param {string} collection
 * @param {string} id
 * @param {{ permission?: string, note?: string }} [opts]
 */
export const deactivateRecord = (collection, id, opts = {}) => updateRecord(collection, id, { active: false }, { ...opts, note: opts.note ?? "Deactivated" });

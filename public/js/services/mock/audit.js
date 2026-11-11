// @ts-check
/**
 * Audit log (read side). The write side is recordAudit() in write.js, called automatically by every createRecord /
 * updateRecord / deleteRecord. History tabs show the result with the auditTimeline component.
 */
import * as store from "../../core/store.js";
import { respond } from "./util.js";

/**
 * @typedef {{ entity?: string, entityId?: string, userId?: string, action?: string, from?: string, to?: string, limit?: number, offset?: number }} AuditQuery
 */

/**
 * Newest first. `entityId` + `entity` gives the History tab of one record; booking history also includes its payments, notes and so on
 * when you pass `include: ["payments", …]` records' ids through `related`.
 * @param {AuditQuery & { related?: Array<{ entity: string, entityId: string }> }} [q]
 * @returns {Promise<{ items: import("../../domain/models.js").AuditLog[], total: number }>}
 */
export const listAudit = (q = {}) =>
  respond(() => {
    const wanted = q.related ?? [];
    const rows = store.filter("auditLog", (a) =>
      (!q.entity || a.entity === q.entity) && (!q.entityId || a.entityId === q.entityId || wanted.some((w) => w.entity === a.entity && w.entityId === a.entityId)) &&
      (!q.userId || a.userId === q.userId) && (!q.action || a.action === q.action) && (!q.from || a.at >= q.from) && (!q.to || a.at <= q.to));
    rows.sort((x, y) => y.at.localeCompare(x.at) || y.id.localeCompare(x.id));
    const offset = q.offset ?? 0;
    return { items: rows.slice(offset, offset + (q.limit ?? 50)), total: rows.length };
  });

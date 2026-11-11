// @ts-check
/**
 * In-app notifications (approvals, alerts, reminders). A notification can be for everyone (no role / user),
 * for a role (`roleId`) or for one person (`userId`). The General Manager sees every role's notifications.
 */
import * as store from "../../core/store.js";
import { emit } from "../../core/events.js";
import { currentUser } from "../../core/auth.js";
import { canDecide } from "../../domain/approvals.js";
import { ServiceError, respond } from "./util.js";
import { freshId } from "./write.js";

/**
 * @typedef {import("../../domain/models.js").Notification} Notification
 */

/** Is this notification meant for the signed-in person? (no session → everything, e.g. tests) @param {Notification} n */
function visible(n) {
  const me = currentUser();
  if (!me) return true;
  if (n.userId) return n.userId === me.id;
  if (!n.roleId) return true;
  return n.roleId === me.roleId || me.roleId === "role-gm" || canDecide(me.roleId ?? "", n.roleId, store.all("approvalLimits"));
}

/**
 * Create a notification (called by other services, synchronous).
 * @param {{ kind: "approval" | "alert" | "reminder", title: string, body: string, href?: string, refId?: string, roleId?: string, userId?: string }} n
 */
export function addNotification(n) {
  const row = store.insert("notifications", { id: freshId("notifications", "ntf", 4), at: new Date().toISOString(), read: false, ...n });
  emit("notification.changed", { id: row.id });
  return row;
}

/** @returns {Promise<Notification[]>} newest first, only the ones meant for me */
export const listNotifications = () => respond(() => store.all("notifications").filter(visible).sort((a, b) => b.at.localeCompare(a.at)));

/** @param {string} id */
export const markNotificationRead = (id) =>
  respond(() => {
    if (!store.get("notifications", id)) throw new ServiceError("NOT_FOUND", "That notification no longer exists.");
    store.update("notifications", id, { read: true });
    emit("notification.changed", { id });
  });

export const markAllNotificationsRead = () =>
  respond(() => {
    for (const n of store.filter("notifications", (x) => !x.read && visible(x))) store.update("notifications", n.id, { read: true });
    emit("notification.changed", {});
  });

/**
 * Badge numbers for the sidebar and bell, worked out from the real data for the signed-in person:
 *  - unread: notifications meant for me that are not read
 *  - approvals: requests waiting for a decision that I may decide
 *  - arrivals: bookings arriving on the business date that are still to come or just checked in
 * @returns {Promise<{ unread: number, approvals: number, arrivals: number }>}
 */
export const navCounts = () =>
  respond(() => {
    const today = store.getMeta("businessDate");
    const me = currentUser();
    const limits = store.all("approvalLimits");
    return {
      unread: store.filter("notifications", (n) => !n.read && visible(n)).length,
      approvals: store.filter("approvalRequests", (a) => (a.status === "pending" || a.status === "escalated") && (!me || (a.requestedBy !== me.id && (me.roleId === "role-gm" || canDecide(me.roleId ?? "", a.roleNeededId, limits))))).length,
      arrivals: store.filter("reservations", (r) => r.arrival === today && ["tentative", "confirmed", "guaranteed", "checked-in"].includes(r.status)).length,
    };
  });

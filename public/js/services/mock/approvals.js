// @ts-check
/**
 * Approvals engine (mock). An action above a person's limit becomes an ApprovalRequest instead of failing:
 *   checkApprovalLimit()  → is it inside my limit? who must approve?
 *   requestApproval()     → creates the request, tells the approver, remembers what to do on approval
 *   decideApproval()      → approve (runs the registered handler that applies the change) or reject; tells the requester
 *   escalateOverdue()     → requests nobody decided in time move to the next approver (a timer calls this)
 */
import * as store from "../../core/store.js";
import { emit } from "../../core/events.js";
import { currentUser } from "../../core/auth.js";
import { can } from "../../core/permissions.js";
import { formatMoney } from "../../core/format.js";
import { TYPE_RULES, checkLimit, canDecide, describeValue } from "../../domain/approvals.js";
import { ServiceError, respond } from "./util.js";
import { actorId, createRecord, updateRecord, recordAudit } from "./write.js";
import { addNotification } from "./notifications.js";

/** @type {Map<string, (request: any) => void | Promise<void>>} */
const handlers = new Map();

/**
 * Register what happens when a request of a type is approved (e.g. "discount" → apply the discount to the booking).
 * Services of later stages call this once.
 * @param {string} type
 * @param {(request: import("../../domain/models.js").ApprovalRequest) => void | Promise<void>} fn
 */
export function registerApprovalHandler(type, fn) {
  handlers.set(type, fn);
}

const myRoleId = () => currentUser()?.roleId ?? "role-gm";
const limits = () => store.all("approvalLimits");

/**
 * Is `value` inside the signed-in person's limit?
 * @param {{ type: keyof typeof TYPE_RULES, value: number }} o
 */
export const checkApprovalLimit = (o) =>
  respond(() => {
    const r = checkLimit({ roleId: myRoleId(), type: o.type, value: o.value, limits: limits() });
    const approver = r.approverRoleId ? store.get("roles", r.approverRoleId) : null;
    return { ...r, approverRoleName: approver?.name ?? null };
  });

/**
 * Ask for approval.
 * @param {{ type: keyof typeof TYPE_RULES, value: number, reservationId?: string, reasonId?: string, reasonNote?: string, payload?: any }} o
 * @returns {Promise<import("../../domain/models.js").ApprovalRequest>}
 */
export const requestApproval = (o) =>
  respond(() => {
    const rule = TYPE_RULES[o.type];
    if (!rule) throw new ServiceError("VALIDATION", "That kind of approval does not exist.");
    if (!(o.value >= 0)) throw new ServiceError("VALIDATION", "Enter how much you are asking for.", { value: "Enter how much you are asking for." });
    const reason = o.reasonId ? store.get("reasonCodes", o.reasonId) : null;
    if (reason?.remarksRequired && !o.reasonNote?.trim()) throw new ServiceError("VALIDATION", "Please add a short note – this reason needs one.", { reasonNote: "Please add a short note." });
    if (!o.reasonId && !o.reasonNote?.trim()) throw new ServiceError("VALIDATION", "Choose a reason or write a note.", { reasonId: "Choose a reason." });
    const lim = checkLimit({ roleId: myRoleId(), type: o.type, value: o.value, limits: limits() });
    if (lim.allowed) throw new ServiceError("NOT_NEEDED", "This is inside your limit – no approval is needed.");
    const approverRoleId = /** @type {string} */ (lim.approverRoleId ?? "role-gm");
    const now = new Date();
    /** @type {Record<string, any>} */
    const record = {
      type: o.type, requestedBy: actorId(), requestedAt: now.toISOString(), roleNeededId: approverRoleId, amount: o.value, unit: rule.unit, status: "pending",
      escalateAt: new Date(now.getTime() + lim.escalateAfterMinutes * 60000).toISOString(),
    };
    if (o.reservationId) record.reservationId = o.reservationId;
    if (o.reasonId) record.reasonId = o.reasonId;
    if (o.reasonNote?.trim()) record.reasonNote = o.reasonNote.trim();
    if (o.payload !== undefined) record.payload = o.payload;
    const saved = createRecord("approvalRequests", record, { note: `${rule.label} of ${describeValue(o.type, o.value, formatMoney)} above the limit` });
    const res = o.reservationId ? store.get("reservations", o.reservationId) : null;
    addNotification({ kind: "approval", title: "Approval needed", body: `${rule.label} ${describeValue(o.type, o.value, formatMoney)}${res ? ` on ${res.number}` : ""} needs your decision.`, href: "RS-20", refId: saved.id, roleId: approverRoleId });
    emit("approval.requested", { id: saved.id, roleId: approverRoleId });
    return saved;
  });

/**
 * Approve or reject.
 * @param {{ id: string, decision: "approve" | "reject", note?: string }} o
 */
export const decideApproval = (o) =>
  respond(async () => {
    const req = store.get("approvalRequests", o.id);
    if (!req) throw new ServiceError("NOT_FOUND", "That request no longer exists.");
    if (req.status !== "pending" && req.status !== "escalated") throw new ServiceError("CONFLICT", `This request was already ${req.status}.`);
    const me = currentUser();
    if (me && !can("RS-20.approve")) throw new ServiceError("FORBIDDEN", "Your role cannot approve or reject requests.");
    if (me && req.requestedBy === me.id) throw new ServiceError("FORBIDDEN", "You cannot decide your own request.");
    if (me && !canDecide(me.roleId ?? "", req.roleNeededId, limits()) && me.roleId !== "role-gm") throw new ServiceError("FORBIDDEN", "This request needs a more senior approver.");
    if (o.decision === "reject" && !o.note?.trim()) throw new ServiceError("VALIDATION", "Please say why you are rejecting it.", { note: "Please say why." });

    if (o.decision === "approve") {
      const fn = handlers.get(req.type);
      if (fn) {
        try {
          await fn(req);
        } catch (err) {
          throw new ServiceError("HANDLER_FAILED", `The request could not be applied: ${/** @type {Error} */ (err).message}`);
        }
      }
    }
    const saved = updateRecord("approvalRequests", req.id, {
      status: o.decision === "approve" ? "approved" : "rejected", decidedBy: actorId(), decidedAt: new Date().toISOString(), ...(o.note?.trim() ? { decisionNote: o.note.trim() } : {}),
    }, { action: "status", note: o.decision === "approve" ? "Approved" : "Rejected" });
    // other approvers no longer need to see it; the requester is told
    for (const n of store.filter("notifications", (x) => x.refId === req.id && !x.read)) updateRecord("notifications", n.id, { read: true }, { audit: false });
    const rule = TYPE_RULES[/** @type {keyof typeof TYPE_RULES} */ (req.type)];
    addNotification({
      kind: "approval", title: o.decision === "approve" ? "Request approved" : "Request rejected",
      body: `${rule?.label ?? "Your request"} ${describeValue(/** @type {any} */ (req.type), req.amount ?? 0, formatMoney)} was ${o.decision === "approve" ? "approved" : "rejected"}${o.note?.trim() ? `: ${o.note.trim()}` : "."}`,
      href: "RS-20", refId: req.id, userId: req.requestedBy,
    });
    emit(`approval.${o.decision === "approve" ? "approved" : "rejected"}`, { id: req.id, type: req.type });
    return saved;
  });

/**
 * Move requests that nobody decided in time to the next approver (simulated timer – also run from the developer panel).
 * @param {string} [nowIso] pretend "now" (tests)
 * @returns {Promise<Array<{ id: string, from: string, to: string }>>}
 */
export const escalateOverdue = (nowIso) =>
  respond(() => {
    const now = nowIso ?? new Date().toISOString();
    /** @type {Array<{ id: string, from: string, to: string }>} */
    const moved = [];
    for (const req of store.filter("approvalRequests", (r) => (r.status === "pending" || r.status === "escalated") && r.escalateAt && r.escalateAt <= now)) {
      const row = limits().find((l) => l.roleId === req.roleNeededId && l.nextApproverRoleId);
      const next = row?.nextApproverRoleId;
      if (!next) continue; // already at the top
      const nextRow = limits().find((l) => l.roleId === next);
      updateRecord("approvalRequests", req.id, { roleNeededId: next, status: "escalated", escalateAt: new Date(Date.parse(now) + (nextRow?.escalateAfterMinutes ?? 60) * 60000).toISOString() }, { action: "status", note: "Escalated – not decided in time" });
      addNotification({ kind: "approval", title: "Approval escalated", body: `A ${TYPE_RULES[/** @type {keyof typeof TYPE_RULES} */ (req.type)]?.label.toLowerCase() ?? "request"} was not decided in time and now needs you.`, href: "RS-20", refId: req.id, roleId: next });
      addNotification({ kind: "reminder", title: "Your request was escalated", body: "Nobody decided it in time, so it moved to the next approver.", href: "RS-20", refId: req.id, userId: req.requestedBy });
      moved.push({ id: req.id, from: req.roleNeededId, to: next });
    }
    return moved;
  });

/**
 * Lists for the Approvals screen.
 * @param {{ scope: "pending-for-me" | "mine" | "history" | "all" }} o
 * @returns {Promise<import("../../domain/models.js").ApprovalRequest[]>} newest first
 */
export const listApprovals = (o) =>
  respond(() => {
    const me = currentUser();
    const open = (/** @type {any} */ r) => r.status === "pending" || r.status === "escalated";
    let rows = store.all("approvalRequests");
    if (o.scope === "pending-for-me") rows = rows.filter((r) => open(r) && (!me || r.requestedBy !== me.id) && (!me || me.roleId === "role-gm" || canDecide(me.roleId ?? "", r.roleNeededId, limits())));
    else if (o.scope === "mine") rows = rows.filter((r) => me && r.requestedBy === me.id);
    else if (o.scope === "history") rows = rows.filter((r) => !open(r));
    return rows.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  });

void recordAudit;

/** Reason code types offered for each kind of approval. */
const REASON_TYPES = /** @type {Record<string, string[]>} */ ({
  discount: ["discount"], "rate-override": ["rate-change", "discount"], refund: ["refund"], "penalty-waiver": ["waiver"], overbooking: ["overbooking"], complimentary: ["discount", "upgrade"], "void-payment": ["refund"],
});

/**
 * Reasons the person can pick when asking for an approval.
 * @param {{ type: string }} o
 * @returns {Promise<import("../../domain/models.js").ReasonCode[]>}
 */
export const listReasons = (o) => respond(() => store.filter("reasonCodes", (r) => r.active && (REASON_TYPES[o.type] ?? []).includes(r.type)));

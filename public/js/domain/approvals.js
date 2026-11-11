// @ts-check
/**
 * Approval rules (pure): does an action fit inside a role's limit, and if not, who must approve it?
 * Limits come from the `approvalLimits` collection (Reservation Setup → Approval Limits).
 * Chain: Reservation Agent → Reservation Manager → Front Office Manager → General Manager (via `nextApproverRoleId`).
 */

/** What each approval type measures. */
export const TYPE_RULES = /** @type {const} */ ({
  discount: { action: "discount-percent", unit: "percent", label: "Discount" },
  "rate-override": { action: "rate-override-percent", unit: "percent", label: "Rate override" },
  refund: { action: "refund-amount", unit: "paise", label: "Refund" },
  "penalty-waiver": { action: "penalty-waiver-amount", unit: "paise", label: "Penalty waiver" },
  overbooking: { action: "overbooking-rooms", unit: "rooms", label: "Overbooking" },
  complimentary: { action: "complimentary-nights", unit: "nights", label: "Complimentary stay" },
  "void-payment": { action: "void-payment", unit: "count", label: "Void a payment" },
});

/**
 * @typedef {Object} LimitResult
 * @property {boolean} allowed          the acting role may do it alone
 * @property {number} limit             the acting role's limit (0 when the role has no row)
 * @property {string | null} approverRoleId  first role up the chain whose limit covers the value (null when allowed)
 * @property {number} escalateAfterMinutes   how long the approver has before it moves up
 * @property {string[]} chain           roles that may be asked, in order
 */

/**
 * @param {Object} o
 * @param {string} o.roleId acting role
 * @param {keyof typeof TYPE_RULES} o.type
 * @param {number} o.value  percent, paise, rooms, nights or count
 * @param {Array<{ roleId: string, action: string, limit: number, escalateAfterMinutes: number, nextApproverRoleId?: string }>} o.limits
 * @returns {LimitResult}
 */
export function checkLimit({ roleId, type, value, limits }) {
  const action = TYPE_RULES[type].action;
  const row = (/** @type {string} */ r) => limits.find((l) => l.roleId === r && l.action === action);
  const mine = row(roleId);
  const limit = mine?.limit ?? 0;
  if (value <= limit) return { allowed: true, limit, approverRoleId: null, escalateAfterMinutes: mine?.escalateAfterMinutes ?? 60, chain: [] };

  // walk up the chain: the approver is the first role whose own limit covers the value
  /** @type {string[]} */ const chain = [];
  const seen = new Set([roleId]);
  let next = mine?.nextApproverRoleId ?? limits.find((l) => l.roleId === roleId)?.nextApproverRoleId;
  let approver = null;
  let minutes = mine?.escalateAfterMinutes ?? 60;
  while (next && !seen.has(next)) {
    seen.add(next);
    chain.push(next);
    const r = row(next);
    if (r && value <= r.limit) { approver = next; break; }
    minutes = r?.escalateAfterMinutes ?? minutes;
    next = r?.nextApproverRoleId;
  }
  approver ??= chain.at(-1) ?? null; // nobody is high enough: ask the top of the chain
  const approverRow = approver ? row(approver) : undefined;
  return { allowed: false, limit, approverRoleId: approver, escalateAfterMinutes: approverRow?.escalateAfterMinutes ?? mine?.escalateAfterMinutes ?? 60, chain };
}

/**
 * Can this role decide a request that needs `roleNeededId`? The needed role and every role above it in the chain may.
 * @param {string} roleId
 * @param {string} roleNeededId
 * @param {Array<{ roleId: string, nextApproverRoleId?: string }>} limits
 */
export function canDecide(roleId, roleNeededId, limits) {
  if (roleId === roleNeededId) return true;
  const seen = new Set([roleNeededId]);
  let next = limits.find((l) => l.roleId === roleNeededId)?.nextApproverRoleId;
  while (next && !seen.has(next)) {
    if (next === roleId) return true;
    seen.add(next);
    next = limits.find((l) => l.roleId === next)?.nextApproverRoleId;
  }
  return false;
}

/**
 * Human text for an amount of a type: "12%", "₹18,000", "1 room".
 * @param {keyof typeof TYPE_RULES} type
 * @param {number} value
 * @param {(paise: number) => string} money
 */
export function describeValue(type, value, money) {
  const unit = TYPE_RULES[type].unit;
  if (unit === "percent") return `${value}%`;
  if (unit === "paise") return money(value);
  const noun = unit === "rooms" ? "room" : unit === "nights" ? "night" : "time";
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

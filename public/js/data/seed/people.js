// @ts-check
/**
 * Roles, permissions, users and approval limits.
 * Permission keys are "<screen code>.<action>" such as "RS-05.create" or "RSS-08.edit". Roles hold patterns:
 * "*" = everything, "RS-*" = every action on every reservation screen, "RS-*.view" = view on every reservation screen.
 * Passwords are NOT stored here – the mock sign-in (Stage 03) uses the demo password and OTP from the build notes.
 */
import { SCREENS } from "../../core/screens.js";
import { rupees, addDays } from "../../core/format.js";
import { PROPERTY_ID } from "./masters.js";
import { at, titleCase } from "./helpers.js";

/** Actions beyond view / create / edit that need their own switch. */
const SPECIAL_ACTIONS = [
  ["RS-05", "override-rate", "Override a room rate"], ["RS-05", "give-discount", "Give a discount"], ["RS-05", "complimentary", "Create a complimentary booking"],
  ["RS-05", "overbook", "Book above available rooms"], ["RS-05", "override-blacklist", "Book a blacklisted guest"], ["RS-08", "reprice", "Re-price a booking"],
  ["RS-09", "upgrade", "Upgrade a room type"], ["RS-10", "refund", "Refund a payment"], ["RS-10", "void", "Void a payment"], ["RS-12", "waive-penalty", "Waive a cancellation penalty"],
  ["RS-13", "reinstate", "Reinstate a no-show"], ["RS-20", "approve", "Approve or reject requests"], ["RS-23", "unlock-ota", "Edit a locked OTA booking"],
  ["RS-18", "blacklist", "Blacklist a guest"], ["RS-18", "merge", "Merge guest profiles"], ["RS-21", "schedule", "Schedule reports by email"],
];

/** @param {string} today */
export function buildPeople(today) {
  /** @type {import("../../domain/models.js").Permission[]} */
  const permissions = [];
  for (const s of SCREENS) {
    const isSetup = s.module === "setup";
    const actions = s.module === "common" ? ["view"] : isSetup ? ["view", "edit"] : ["view", "create", "edit"];
    for (const a of actions) permissions.push({ id: `${s.code}.${a}`, screen: s.code, action: a, description: `${titleCase(a)} – ${s.title}` });
  }
  for (const [screen, action, description] of SPECIAL_ACTIONS) permissions.push({ id: `${screen}.${action}`, screen, action, description });

  /** @type {import("../../domain/models.js").Role[]} */
  const roles = [
    { id: "role-gm", name: "General Manager", description: "Everything, with the highest approval limits.", permissions: ["*"], isSystem: true },
    { id: "role-admin", name: "Admin", description: "Setup, users and the developer panel.", permissions: ["*"], isSystem: true },
    { id: "role-fom", name: "Front Office Manager", description: "Runs the front office; approves most requests.", permissions: ["RS-*", "RSS-*.view", "CM-*"], isSystem: false },
    { id: "role-rm", name: "Reservation Manager", description: "Runs the reservation desk; approves within limits.", permissions: ["RS-*", "RSS-*.view", "CM-*"], isSystem: false },
    { id: "role-ra", name: "Reservation Agent", description: "Takes and changes bookings; asks for approval above limits.", permissions: ["RS-*.view", "RS-0[1-9].create", "RS-0[1-9].edit", "RS-1[0-9].create", "RS-1[0-9].edit", "RS-05.give-discount", "RSS-04.view", "RSS-08.view", "CM-*"], isSystem: false },
    { id: "role-rev", name: "Revenue Manager", description: "Owns rates, restrictions and inventory.", permissions: ["RSS-07", "RSS-08", "RSS-09", "RSS-10", "RSS-11", "RSS-26", "RSS-*.view", "RS-*.view", "RS-05.override-rate", "RS-05.give-discount", "RS-20.view", "RS-20.approve", "CM-*"], isSystem: false },
    { id: "role-sm", name: "Sales Manager", description: "Enquiries, groups and company accounts.", permissions: ["RS-02", "RS-03", "RS-04", "RS-05", "RS-14", "RS-15", "RS-16", "RS-18", "RS-19", "RS-21", "RS-*.view", "RS-05.give-discount", "RSS-*.view", "CM-*"], isSystem: false },
    { id: "role-acc", name: "Accounts", description: "Payments, refunds and company credit.", permissions: ["RS-10", "RS-19", "RS-21", "RS-*.view", "RS-10.refund", "RS-10.void", "RSS-06.view", "RSS-23.view", "CM-*"], isSystem: false },
  ];

  /** @type {(id: string, name: string, roleId: string, phone: string, mfa?: "otp" | "pin", daysAgo?: number) => import("../../domain/models.js").User} */
  const user = (id, name, roleId, phone, mfa = "otp", daysAgo = 400) => ({
    id, name, email: `${name.toLowerCase().replace(/[^a-z ]/g, "").replace(/ +/g, ".")}@avivkochi.example`, phone, roleId, propertyIds: [PROPERTY_ID], mfaMethod: mfa, locked: false,
    lastLoginAt: at(today, 9, 5), createdAt: at(addDays(today, -daysAgo), 10, 0), active: true,
  });
  const users = [
    user("u-gm", "Vikram Nathan", "role-gm", "+91 9847011001"),
    user("u-fom", "Meera Prem", "role-fom", "+91 9847011002"),
    user("u-anita", "Anita Mohan", "role-rm", "+91 9847011003"),
    user("u-rahul", "Rahul Vijay", "role-ra", "+91 9847011004", "pin"),
    user("u-sneha", "Sneha Joseph", "role-ra", "+91 9847011005"),
    user("u-thomas", "Thomas Kurian", "role-ra", "+91 9847011006", "pin", 250),
    user("u-arjun", "Arjun Dev", "role-rev", "+91 9847011007"),
    user("u-farah", "Farah Khan", "role-sm", "+91 9847011008"),
    user("u-george", "George Mathew", "role-acc", "+91 9847011009"),
    user("u-admin", "System Admin", "role-admin", "+91 9847011010", "otp", 600),
  ];
  // the user written into audit entries made by channels and background jobs (cannot sign in)
  const system = { ...user("u-system", "Aviv PMS (automatic)", "role-admin", "+91 9847011011"), email: "system@avivkochi.example" };
  delete (/** @type {any} */ (system)).lastLoginAt;
  system.active = false;
  users.push(system);

  /** @type {import("../../domain/models.js").ApprovalLimit[]} */
  const approvalLimits = [];
  /** @param {string} roleId @param {import("../../domain/models.js").ApprovalLimit["action"]} action @param {number} lim @param {import("../../domain/models.js").ApprovalLimit["unit"]} unit @param {number} mins @param {string} [next] */
  const limit = (roleId, action, lim, unit, mins, next) => {
    /** @type {import("../../domain/models.js").ApprovalLimit} */
    const row = { id: `al-${roleId.slice(5)}-${action}`, roleId, action, limit: lim, unit, escalateAfterMinutes: mins };
    if (next) row.nextApproverRoleId = next;
    approvalLimits.push(row);
  };
  // agent → reservation manager → front office manager → general manager
  limit("role-ra", "discount-percent", 5, "percent", 30, "role-rm");
  limit("role-ra", "rate-override-percent", 0, "percent", 30, "role-rm");
  limit("role-ra", "refund-amount", 0, "paise", 30, "role-rm");
  limit("role-ra", "penalty-waiver-amount", 0, "paise", 30, "role-rm");
  limit("role-ra", "overbooking-rooms", 0, "rooms", 30, "role-rm");
  limit("role-ra", "complimentary-nights", 0, "nights", 30, "role-rm");
  limit("role-rm", "discount-percent", 15, "percent", 60, "role-fom");
  limit("role-rm", "rate-override-percent", 15, "percent", 60, "role-fom");
  limit("role-rm", "refund-amount", rupees(20000), "paise", 60, "role-fom");
  limit("role-rm", "penalty-waiver-amount", rupees(10000), "paise", 60, "role-fom");
  limit("role-rm", "overbooking-rooms", 2, "rooms", 60, "role-fom");
  limit("role-rm", "complimentary-nights", 1, "nights", 60, "role-fom");
  limit("role-rm", "void-payment", 0, "count", 60, "role-fom");
  limit("role-fom", "discount-percent", 25, "percent", 120, "role-gm");
  limit("role-fom", "rate-override-percent", 25, "percent", 120, "role-gm");
  limit("role-fom", "refund-amount", rupees(75000), "paise", 120, "role-gm");
  limit("role-fom", "penalty-waiver-amount", rupees(50000), "paise", 120, "role-gm");
  limit("role-fom", "overbooking-rooms", 5, "rooms", 120, "role-gm");
  limit("role-fom", "complimentary-nights", 3, "nights", 120, "role-gm");
  limit("role-fom", "void-payment", 1, "count", 120, "role-gm");
  limit("role-rev", "discount-percent", 30, "percent", 120, "role-gm");
  limit("role-rev", "rate-override-percent", 30, "percent", 120, "role-gm");
  limit("role-gm", "discount-percent", 100, "percent", 240);
  limit("role-gm", "rate-override-percent", 100, "percent", 240);
  limit("role-gm", "refund-amount", rupees(1000000), "paise", 240);
  limit("role-gm", "penalty-waiver-amount", rupees(1000000), "paise", 240);
  limit("role-gm", "overbooking-rooms", 20, "rooms", 240);
  limit("role-gm", "complimentary-nights", 30, "nights", 240);
  limit("role-gm", "void-payment", 10, "count", 240);
  limit("role-acc", "refund-amount", rupees(50000), "paise", 120, "role-fom");

  return { permissions, roles, users, approvalLimits };
}

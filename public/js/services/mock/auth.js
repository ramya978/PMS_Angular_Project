// @ts-check
/**
 * Sign-in service (mock). Behaves like the real one will:
 *   email + password  →  second step (OTP or PIN, unless this device is remembered)  →  session
 * Wrong passwords are counted (5 → the account is locked); wrong second-step codes are counted (3 → start again).
 * Passwords are never stored: a salted SHA-256 hash is kept in the database metadata the first time someone signs in.
 *
 * DEMO CREDENTIALS (this is a demo – there is no real security here):
 *   password  Aviv@2026     OTP  123456     PIN  2026
 */
import * as store from "../../core/store.js";
import { emit } from "../../core/events.js";
import { setSession, currentUser, clearSession, isTrustedDevice, trustDevice } from "../../core/auth.js";
import { hashPassword, passwordProblems, isCodeShape } from "../../domain/password.js";
import { ServiceError, respond } from "./util.js";
import { recordAudit, updateRecord } from "./write.js";

export const DEMO_PASSWORD = "Aviv@2026";
export const DEMO_OTP = "123456";
export const DEMO_PIN = "2026";
export const MAX_PASSWORD_ATTEMPTS = 5;
export const MAX_CODE_ATTEMPTS = 3;

/** @param {string} email */
const findUser = (email) => store.find("users", (u) => u.email.toLowerCase() === email.trim().toLowerCase());

/** Create the stored password hash the first time a user is seen. @param {string} userId */
async function credentialOf(userId) {
  const creds = store.getMeta("credentials") ?? {};
  if (!creds[userId]) {
    const salt = `salt-${userId}`;
    creds[userId] = { salt, hash: await hashPassword(DEMO_PASSWORD, salt), changedAt: new Date().toISOString() };
    store.setMeta("credentials", creds);
  }
  return creds[userId];
}

/** @param {string} phone */
const maskPhone = (phone) => (phone ? `${phone.slice(0, 3)} ${"•".repeat(5)}${phone.slice(-4)}` : "your registered phone");

/** @param {string} email @param {number} n */
function setAttempts(email, n) {
  const all = store.getMeta("loginAttempts") ?? {};
  if (n) all[email.toLowerCase()] = n; else delete all[email.toLowerCase()];
  store.setMeta("loginAttempts", all);
}
const getAttempts = (/** @type {string} */ email) => (store.getMeta("loginAttempts") ?? {})[email.toLowerCase()] ?? 0;

/**
 * Build and save the session for a user (used after sign-in, and by tests / the developer panel).
 * @param {string} userId
 * @param {{ roleId?: string }} [opts] sign in "as" another role (developer panel)
 */
export function startSession(userId, opts = {}) {
  const user = store.get("users", userId);
  if (!user) throw new ServiceError("NOT_FOUND", "That user does not exist.");
  const role = store.get("roles", opts.roleId ?? user.roleId);
  const now = new Date();
  setSession({ id: user.id, name: user.name, role: role.name, roleId: role.id, realRoleId: user.roleId, permissions: role.permissions, propertyId: user.propertyIds[0], signedInAt: now.toISOString(), lastActive: now.getTime() });
  updateRecord("users", user.id, { lastLoginAt: now.toISOString() }, { audit: false });
  recordAudit({ entity: "users", entityId: user.id, action: "login", userId: user.id, note: opts.roleId ? `Signed in (testing as ${role.name})` : "Signed in" });
  emit("auth.signedIn", { userId: user.id });
  return currentUser();
}

/**
 * Step 1: email + password.
 * @param {{ email: string, password: string }} o
 * @returns {Promise<{ status: "second-step", userId: string, method: "otp" | "pin", sentTo: string } | { status: "signed-in", userId: string }>}
 */
export const login = (o) =>
  respond(async () => {
    const email = (o.email ?? "").trim();
    if (!email) throw new ServiceError("VALIDATION", "Enter your email.", { email: "Enter your email." });
    if (!o.password) throw new ServiceError("VALIDATION", "Enter your password.", { password: "Enter your password." });
    const user = findUser(email);
    if (user?.locked) throw new ServiceError("LOCKED", "This account is locked after too many wrong attempts. Please ask an administrator to unlock it.");
    const bad = () => {
      const n = getAttempts(email) + 1;
      setAttempts(email, n);
      if (user && n >= MAX_PASSWORD_ATTEMPTS) {
        updateRecord("users", user.id, { locked: true }, { note: "Locked after too many wrong passwords" });
        throw new ServiceError("LOCKED", "Too many wrong attempts – this account is now locked. Please ask an administrator to unlock it.");
      }
      const left = MAX_PASSWORD_ATTEMPTS - n;
      throw new ServiceError("INVALID_CREDENTIALS", `The email or password is not right.${left <= 2 ? ` ${left} more attempt${left === 1 ? "" : "s"} before the account is locked.` : ""}`);
    };
    if (!user || !user.active) return bad();
    const cred = await credentialOf(user.id);
    if ((await hashPassword(o.password, cred.salt)) !== cred.hash) return bad();
    setAttempts(email, 0);
    if (isTrustedDevice(user.id)) {
      startSession(user.id);
      return { status: "signed-in", userId: user.id };
    }
    return { status: "second-step", userId: user.id, method: user.mfaMethod, sentTo: user.mfaMethod === "otp" ? maskPhone(user.phone) : "your 4-digit PIN" };
  });

/** @type {Map<string, number>} wrong second-step codes per user (in memory: a page reload starts again) */
const codeFails = new Map();

/**
 * Step 2: the one-time code or PIN.
 * @param {{ userId: string, code: string, rememberDevice?: boolean }} o
 */
export const verifySecondStep = (o) =>
  respond(() => {
    const user = store.get("users", o.userId);
    if (!user) throw new ServiceError("NOT_FOUND", "Please sign in again.", {});
    const len = user.mfaMethod === "otp" ? 6 : 4;
    const code = (o.code ?? "").trim();
    if (!isCodeShape(code, len)) throw new ServiceError("VALIDATION", `Enter the ${len}-digit ${user.mfaMethod === "otp" ? "code" : "PIN"}.`, { code: `Enter the ${len}-digit ${user.mfaMethod === "otp" ? "code" : "PIN"}.` });
    const ok = code === (user.mfaMethod === "otp" ? DEMO_OTP : DEMO_PIN);
    if (!ok) {
      const n = (codeFails.get(user.id) ?? 0) + 1;
      codeFails.set(user.id, n);
      if (n >= MAX_CODE_ATTEMPTS) {
        codeFails.delete(user.id);
        throw new ServiceError("RESTART", "That was the third wrong code. Please sign in again to get a new one.");
      }
      throw new ServiceError("INVALID_CODE", `That ${user.mfaMethod === "otp" ? "code" : "PIN"} is not right. ${MAX_CODE_ATTEMPTS - n} more ${MAX_CODE_ATTEMPTS - n === 1 ? "try" : "tries"}.`, { code: "Not right." });
    }
    codeFails.delete(user.id);
    if (o.rememberDevice) trustDevice(user.id, 30);
    startSession(user.id);
    return { status: "signed-in", userId: user.id };
  });

/**
 * Send a new code (the demo always sends 123456).
 * @param {{ userId: string }} o
 */
export const resendCode = (o) =>
  respond(() => {
    const user = store.get("users", o.userId);
    if (!user) throw new ServiceError("NOT_FOUND", "Please sign in again.");
    emit("message.sent", { channel: "sms", to: user.phone, kind: "otp" });
    return { sentTo: maskPhone(user.phone) };
  });

/**
 * Password reset, step 1. The answer is the same whether or not the email exists (so nobody can find out who has an account).
 * @param {{ email: string }} o
 */
export const requestPasswordReset = (o) =>
  respond(() => {
    if (!o.email?.trim()) throw new ServiceError("VALIDATION", "Enter your email.", { email: "Enter your email." });
    const user = findUser(o.email);
    if (user) {
      recordAudit({ entity: "users", entityId: user.id, action: "update", userId: user.id, note: "Password reset requested" });
      emit("message.sent", { channel: "sms", to: user.phone, kind: "otp" });
    }
    return { sent: true, message: "If this email is registered, a 6-digit code has been sent to the phone on file." };
  });

/**
 * Password reset, step 2: the code and the new password.
 * @param {{ email: string, code: string, newPassword: string }} o
 */
export const resetPassword = (o) =>
  respond(async () => {
    const user = findUser(o.email ?? "");
    if (!user || o.code !== DEMO_OTP) throw new ServiceError("INVALID_CODE", "That code is not right or has expired. Request a new one.", { code: "Not right." });
    const problems = passwordProblems(o.newPassword ?? "", { email: user.email });
    if (problems.length) throw new ServiceError("VALIDATION", problems[0], { newPassword: problems.join(" ") });
    const salt = `salt-${user.id}-${Date.now()}`;
    const creds = store.getMeta("credentials") ?? {};
    creds[user.id] = { salt, hash: await hashPassword(o.newPassword, salt), changedAt: new Date().toISOString() };
    store.setMeta("credentials", creds);
    setAttempts(user.email, 0);
    if (user.locked) updateRecord("users", user.id, { locked: false }, { note: "Unlocked by password reset" });
    recordAudit({ entity: "users", entityId: user.id, action: "update", userId: user.id, changes: [{ field: "password", old: "••••", new: "changed" }], note: "Password reset with a one-time code" });
    return { ok: true };
  });

/** Sign out: ends the session and writes it to the audit log. */
export const signOut = () =>
  respond(() => {
    const s = currentUser();
    if (s) recordAudit({ entity: "users", entityId: s.id, action: "login", userId: s.id, note: "Signed out" });
    clearSession();
    emit("auth.signedOut", { userId: s?.id });
  });

/** Accounts shown in the "demo accounts" helper on the sign-in page. @returns {Promise<Array<{ email: string, name: string, role: string, method: string }>>} */
export const listDemoAccounts = () =>
  respond(() => {
    const roles = new Map(store.all("roles").map((r) => [r.id, r.name]));
    return store.filter("users", (u) => u.active).map((u) => ({ email: u.email, name: u.name, role: roles.get(u.roleId) ?? "", method: u.mfaMethod }));
  });

/** Credentials of the demo (shown on the sign-in page of this demo only). */
export const demoCredentials = () => ({ password: DEMO_PASSWORD, otp: DEMO_OTP, pin: DEMO_PIN });

/** Idle timeout from Reservation Parameters, in minutes. @returns {Promise<number>} */
export const getSessionTimeoutMinutes = () => respond(() => store.get("reservationParameters", "params")?.sessionTimeoutMinutes ?? 20);

/**
 * Developer panel: use the app as another role without signing out (needs an Admin or General Manager session).
 * @param {string} roleId
 */
export const switchRole = (roleId) =>
  respond(() => {
    const s = currentUser();
    if (!s) throw new ServiceError("FORBIDDEN", "Sign in first.");
    const real = store.get("users", s.id);
    if (!["role-admin", "role-gm"].includes(real?.roleId)) throw new ServiceError("FORBIDDEN", "Only an Admin or the General Manager can try other roles.");
    startSession(s.id, { roleId });
    return currentUser();
  });

/**
 * Hotels the signed-in person may work in.
 * @returns {Promise<{ properties: Array<{ id: string, name: string, city?: string }>, currentId: string }>}
 */
export const listMyProperties = () =>
  respond(() => {
    const s = currentUser();
    const user = s ? store.get("users", s.id) : null;
    const ids = user?.propertyIds ?? store.all("property").map((p) => p.id);
    const list = store.all("property").filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, name: p.name, city: p.city }));
    return { properties: list, currentId: s?.propertyId ?? list[0]?.id ?? "" };
  });

/** @param {string} propertyId */
export const setProperty = (propertyId) =>
  respond(() => {
    const s = currentUser();
    const user = s ? store.get("users", s.id) : null;
    if (!s || !user?.propertyIds.includes(propertyId)) throw new ServiceError("FORBIDDEN", "You do not have access to that hotel.");
    setSession({ ...s, propertyId });
    emit("auth.propertyChanged", { propertyId });
  });

/** Roles for the developer panel's role switcher. @returns {Promise<Array<{ id: string, name: string }>>} */
export const listRoles = () => respond(() => store.all("roles").map((r) => ({ id: r.id, name: r.name })));

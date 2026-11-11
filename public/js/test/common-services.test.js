// @ts-check
/** Common services – permissions, sessions, sign-in, audit, approvals, notifications, search, backup, idle timeout and the common pop-ups. */
import { describe, test, expect } from "./runner.js";
import * as store from "../core/store.js";
import { currentUser, setSession, clearSession, isTrustedDevice, trustDevice, forgetDevice } from "../core/auth.js";
import { matchesPattern, can, applyPermissions, deniedReason } from "../core/permissions.js";
import { createIdleWatcher } from "../core/idle.js";
import { on, _resetForTests as resetEvents } from "../core/events.js";
import { diffRecords } from "../domain/diff.js";
import { passwordProblems, hashPassword, isCodeShape } from "../domain/password.js";
import { checkLimit, canDecide, describeValue, TYPE_RULES } from "../domain/approvals.js";
import { searchAll, parseQuery, highlightParts } from "../domain/search.js";
import { buildSeed } from "../data/seed.js";
import { rupees, formatMoney } from "../core/format.js";
import { _setDelayScale } from "../services/mock/util.js";
import * as W from "../services/mock/write.js";
import * as authSvc from "../services/mock/auth.js";
import * as approvalsSvc from "../services/mock/approvals.js";
import * as notifSvc from "../services/mock/notifications.js";
import * as auditSvc from "../services/mock/audit.js";
import * as searchSvc from "../services/mock/search.js";
import * as backupSvc from "../services/mock/backup.js";
import { hasProcess, runProcess } from "../core/processes.js";
import { confirmAction } from "../components/confirm.js";
import { openUnsavedChanges, guardClose } from "../components/unsaved.js";
import { openSessionWarning, clock } from "../components/session-warning.js";
import { openExportOptions } from "../components/export-options.js";
import { openPropertySwitcher } from "../components/property-switcher.js";
import { requestApprovalDialog, guardLimit } from "../components/request-approval.js";
import { auditTimeline, auditValue, fieldLabel } from "../components/audit-timeline.js";
import { button } from "../components/button.js";

const wait = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));
const TODAY = "2026-10-22";
/** @type {import("../core/store.js").Database | undefined} */
let cached;
const seed = () => (cached ??= buildSeed(TODAY));
const col = (/** @type {string} */ n) => /** @type {any[]} */ (seed().collections[n]);

/** A session for a role of the demo data (no database writes). @param {string} userId @param {string} [roleId] */
function sessionFor(userId, roleId) {
  const u = col("users").find((x) => x.id === userId);
  const r = col("roles").find((x) => x.id === (roleId ?? u.roleId));
  return { id: u.id, name: u.name, role: r.name, roleId: r.id, realRoleId: u.roleId, permissions: r.permissions, propertyId: u.propertyIds[0], lastActive: Date.now() };
}
const signInAs = (/** @type {string} */ userId, /** @type {string} */ roleId) => setSession(sessionFor(userId, roleId));

/**
 * Run a test on its own fresh copy of the demo database (own storage key, no network delay) and put everything back afterwards.
 * @param {() => Promise<void> | void} fn
 */
async function isolated(fn) {
  const previous = currentUser();
  _setDelayScale(0);
  store._useKeyForTests("avivpms.test4");
  store._dropForTests();
  resetEvents();
  clearSession();
  try {
    await fn();
  } finally {
    store._dropForTests();
    store._useKeyForTests("avivpms.v1");
    _setDelayScale(1);
    setSession(previous);
    resetEvents();
  }
}

describe("permissions – patterns", () => {
  test("a key is covered by * , by a screen pattern, by an action pattern and by a range", () => {
    expect(matchesPattern("*", "RS-05.create")).toBe(true);
    expect(matchesPattern("RS-*", "RS-05.create")).toBe(true);
    expect(matchesPattern("RS-*", "RSS-08.edit")).toBe(false); // RS-* is the reservation module only
    expect(matchesPattern("RSS-*.view", "RSS-08.view")).toBe(true);
    expect(matchesPattern("RSS-*.view", "RSS-08.edit")).toBe(false);
    expect(matchesPattern("RS-0[1-9].create", "RS-05.create")).toBe(true);
    expect(matchesPattern("RS-0[1-9].create", "RS-10.create")).toBe(false);
    expect(matchesPattern("RS-1[0-9].edit", "RS-12.edit")).toBe(true);
    expect(matchesPattern("RS-05", "RS-05.override-rate")).toBe(true);
    expect(matchesPattern("RS-05.give-discount", "RS-05.override-rate")).toBe(false);
    expect(matchesPattern("RS-05.create", "RS-05.create.extra")).toBe(false);
  });
  test("nothing is allowed without a session", () => {
    expect(can("RS-05.create", null)).toBe(false);
    expect(can("RS-05.create", { permissions: [] })).toBe(false);
  });
  test("each demo role gets what it should (and nothing more)", () => {
    const allow = (/** @type {string} */ role, /** @type {string[]} */ yes, /** @type {string[]} */ no) => {
      const s = { permissions: col("roles").find((r) => r.id === role).permissions };
      for (const k of yes) expect([role, k, can(k, s)]).toEqual([role, k, true]);
      for (const k of no) expect([role, k, can(k, s)]).toEqual([role, k, false]);
    };
    allow("role-gm", ["RS-05.create", "RSS-08.edit", "RS-10.refund", "RS-20.approve"], []);
    allow("role-ra", ["RS-05.create", "RS-07.view", "RS-08.edit", "RS-10.create", "RS-05.give-discount", "RSS-08.view", "CM-02.view"], ["RS-10.refund", "RS-12.waive-penalty", "RSS-08.edit", "RS-20.approve", "RSS-24.view", "RS-05.override-rate"]);
    allow("role-rm", ["RS-05.create", "RS-10.refund", "RS-20.approve", "RSS-08.view"], ["RSS-08.edit", "RSS-24.edit"]);
    allow("role-rev", ["RSS-08.edit", "RSS-10.edit", "RS-05.override-rate", "RS-20.approve", "RS-04.view"], ["RS-10.refund", "RSS-24.edit", "RS-05.create"]);
    allow("role-acc", ["RS-10.refund", "RS-10.void", "RS-19.edit", "RSS-06.view"], ["RS-05.create", "RSS-08.edit", "RS-20.approve"]);
    allow("role-sm", ["RS-14.edit", "RS-02.create", "RS-21.view"], ["RS-10.refund", "RS-09.edit", "RSS-08.edit"]);
  });
  test("every permission key the roles grant by name exists in the catalogue", () => {
    const keys = new Set(col("permissions").map((p) => p.id));
    const named = col("roles").flatMap((r) => r.permissions).filter((p) => !/[*[\]]/.test(p) && p.includes("."));
    expect(named.filter((k) => !keys.has(k))).toEqual([]);
  });
  test("data-permission switches elements off with a reason, hides on request and switches back on", () => {
    signInAs("u-rahul");
    const box = document.createElement("div");
    document.body.append(box);
    box.innerHTML = '<button id="a" data-permission="RS-10.refund">Refund</button><button id="b" data-permission="RS-05.create">New</button><a id="c" href="#" data-permission="RSS-24.edit" data-permission-mode="hide">Users</a>';
    const n = applyPermissions(box);
    const a = /** @type {HTMLButtonElement} */ (box.querySelector("#a"));
    expect(n).toBe(2);
    expect(a.disabled).toBe(true);
    expect(a.getAttribute("aria-disabled")).toBe("true");
    expect(a.title).toContain("Reservation Agent");
    expect(a.title).toContain("refund");
    expect(/** @type {HTMLButtonElement} */ (box.querySelector("#b")).disabled).toBe(false);
    expect(/** @type {HTMLElement} */ (box.querySelector("#c")).hidden).toBe(true);
    signInAs("u-gm");
    applyPermissions(box);
    expect(a.disabled).toBe(false);
    expect(/** @type {HTMLElement} */ (box.querySelector("#c")).hidden).toBe(false);
    expect(a.title).toBe("");
    box.remove();
    clearSession();
  });
  test("the denied message names the role and the action in plain words", () => {
    signInAs("u-rahul");
    expect(deniedReason("RS-12.waive-penalty")).toBe("Your role (Reservation Agent) cannot waive penalty here. Ask a manager if you need this.");
    clearSession();
  });
});

describe("audit diff", () => {
  test("creates, changes, nested fields and removals", () => {
    expect(diffRecords(null, { a: 1, b: { c: 2 } })).toEqual([{ field: "a", old: null, new: 1 }, { field: "b.c", old: null, new: 2 }]);
    expect(diffRecords({ a: 1, b: { c: 2 }, t: ["x"] }, { a: 1, b: { c: 3 }, t: ["x", "y"] })).toEqual([{ field: "b.c", old: 2, new: 3 }, { field: "t", old: ["x"], new: ["x", "y"] }]);
    expect(diffRecords({ a: 1 }, null)).toEqual([{ field: "a", old: 1, new: null }]);
  });
  test("unchanged records and ignored fields give no changes", () => {
    expect(diffRecords({ a: 1, updatedAt: "x" }, { a: 1, updatedAt: "y" })).toEqual([]);
    expect(diffRecords({ a: 1, n: "x" }, { a: 2, n: "x" }, { ignore: ["a"] })).toEqual([]);
  });
});

describe("passwords and codes", () => {
  test("policy tells what is missing, in plain words", () => {
    expect(passwordProblems("Aviv@2026x")).toEqual([]);
    expect(passwordProblems("short")).toContain("Use at least 10 characters.");
    expect(passwordProblems("alllowercase1!")).toContain("Add a capital letter.");
    expect(passwordProblems("NoNumbersHere!")).toContain("Add a number.");
    expect(passwordProblems("NoSymbols12345")).toContain("Add a symbol such as @ or #.");
    expect(passwordProblems("Anita.Mohan@2026", { email: "anita.mohan@avivkochi.example" })).toContain("Do not use your email name in the password.");
  });
  test("hashes are repeatable, salted and not the password", async () => {
    const a = await hashPassword("Aviv@2026", "s1");
    expect(a).toBe(await hashPassword("Aviv@2026", "s1"));
    expect(a).not.toBe(await hashPassword("Aviv@2026", "s2"));
    expect(a.includes("Aviv")).toBe(false);
    expect(a).toHaveLength(64);
    expect(isCodeShape("123456", 6)).toBe(true);
    expect(isCodeShape("12345", 6)).toBe(false);
    expect(isCodeShape("12a456", 6)).toBe(false);
  });
});

describe("approval rules (the chain Agent → Manager → Front Office Manager → GM)", () => {
  const limits = () => col("approvalLimits");
  test("inside the limit nobody needs to approve", () => {
    expect(checkLimit({ roleId: "role-ra", type: "discount", value: 5, limits: limits() }).allowed).toBe(true);
    expect(checkLimit({ roleId: "role-rm", type: "discount", value: 15, limits: limits() }).allowed).toBe(true);
    expect(checkLimit({ roleId: "role-ra", type: "discount", value: 0, limits: limits() }).allowed).toBe(true);
  });
  test("above the limit the first role whose own limit covers it must approve", () => {
    const r = (/** @type {string} */ role, /** @type {any} */ type, /** @type {number} */ v) => checkLimit({ roleId: role, type, value: v, limits: limits() });
    expect(r("role-ra", "discount", 12).approverRoleId).toBe("role-rm");
    expect(r("role-ra", "discount", 22).approverRoleId).toBe("role-fom");
    expect(r("role-ra", "discount", 30).approverRoleId).toBe("role-gm");
    expect(r("role-ra", "refund", rupees(18000)).approverRoleId).toBe("role-rm");
    expect(r("role-ra", "refund", rupees(60000)).approverRoleId).toBe("role-fom");
    expect(r("role-rm", "overbooking", 3).approverRoleId).toBe("role-fom");
    expect(r("role-ra", "overbooking", 1).chain).toEqual(["role-rm"]);
    expect(r("role-ra", "discount", 12).limit).toBe(5);
    expect(r("role-ra", "discount", 12).escalateAfterMinutes).toBe(60); // the manager has an hour before it moves up
  });
  test("agents may not override rates or refund at all (limit 0); a role without a row needs help for anything", () => {
    expect(checkLimit({ roleId: "role-ra", type: "rate-override", value: 1, limits: limits() }).allowed).toBe(false);
    expect(checkLimit({ roleId: "role-sm", type: "refund", value: 100, limits: limits() }).allowed).toBe(false);
  });
  test("the top of the chain is asked when nobody's limit is high enough", () => {
    expect(checkLimit({ roleId: "role-ra", type: "refund", value: rupees(5000000), limits: limits() }).approverRoleId).toBe("role-gm");
  });
  test("who may decide: the needed role and everyone above it", () => {
    expect(canDecide("role-rm", "role-rm", limits())).toBe(true);
    expect(canDecide("role-fom", "role-rm", limits())).toBe(true);
    expect(canDecide("role-gm", "role-rm", limits())).toBe(true);
    expect(canDecide("role-ra", "role-rm", limits())).toBe(false);
    expect(canDecide("role-rm", "role-fom", limits())).toBe(false);
  });
  test("values read naturally", () => {
    expect(describeValue("discount", 12, formatMoney)).toBe("12%");
    expect(describeValue("refund", rupees(18000), formatMoney)).toBe("₹18,000");
    expect(describeValue("overbooking", 1, formatMoney)).toBe("1 room");
    expect(describeValue("complimentary", 2, formatMoney)).toBe("2 nights");
    expect(Object.keys(TYPE_RULES)).toHaveLength(7);
  });
});

describe("search (pure)", () => {
  const data = () => ({ reservations: col("reservations"), guests: col("guests"), rooms: col("rooms"), roomTypes: col("roomTypes"), accounts: col("accounts"), enquiries: col("enquiries") });
  test("a booking number, with or without FK-, finds that booking first", () => {
    const r = searchAll(data(), "FK-10005");
    expect(r.booking[0].title.startsWith("FK-10005")).toBe(true);
    expect(searchAll(data(), "10005").booking[0].title.startsWith("FK-10005")).toBe(true);
  });
  test("every word must match; names find guests; phone digits find the guest", () => {
    const g = col("guests")[10];
    const byName = searchAll(data(), `${g.firstName} ${g.lastName}`);
    expect(byName.guest.some((h) => h.id === g.id)).toBe(true);
    const digits = g.phone.replace(/\D/g, "").slice(-8);
    expect(searchAll(data(), digits).guest.some((h) => h.id === g.id)).toBe(true);
    expect(searchAll(data(), `${g.firstName} zzzzzz`).guest).toEqual([]);
  });
  test("rooms by number, companies by name and GSTIN, nothing for an empty query", () => {
    expect(searchAll(data(), "305").room[0].title).toBe("Room 305");
    const a = col("accounts")[0];
    expect(searchAll(data(), a.name.split(" ")[0]).account.some((h) => h.id === a.id)).toBe(true);
    expect(searchAll(data(), a.gstin).account[0].id).toBe(a.id);
    expect(searchAll(data(), "   ").booking).toEqual([]);
  });
  test("accents are ignored and results are capped per kind", () => {
    expect(parseQuery("  Müller  ").tokens).toEqual(["muller"]);
    expect(searchAll(data(), "a", { perKind: 3 }).guest.length).toBeLessThan(4);
  });
  test("highlighting splits the text around every matching word", () => {
    expect(highlightParts("Priya Nathan FK-10234", ["nathan", "10234"]).filter((p) => p.match).map((p) => p.text)).toEqual(["Nathan", "10234"]);
    expect(highlightParts("a.b (c)", ["a.b", "(c)"]).filter((p) => p.match)).toHaveLength(2);
    expect(highlightParts("plain", [])).toEqual([{ text: "plain", match: false }]);
  });
});

describe("idle timeout", () => {
  const make = () => {
    let t = 0;
    const log = /** @type {string[]} */ ([]);
    const w = createIdleWatcher({ timeoutMs: 20 * 60000, warnBeforeMs: 60000, now: () => t, onWarn: (ms) => log.push(`warn ${ms}`), onExpire: () => log.push("expire"), onActivity: () => log.push("activity") });
    return { w, log, at: (/** @type {number} */ ms) => { t = ms; return w.tick(); } };
  };
  test("warns one minute before the end, then signs out", () => {
    const { w, log, at } = make();
    expect(at(10 * 60000)).toBe("active");
    expect(at(19 * 60000 - 1)).toBe("active");
    expect(at(19 * 60000)).toBe("warning");
    expect(at(19 * 60000 + 30000)).toBe("warning");
    expect(w.remainingMs()).toBe(30000);
    expect(at(20 * 60000)).toBe("expired");
    expect(log).toEqual(["warn 60000", "expire"]);
  });
  test("activity before the warning restarts the clock; during the warning it does not (the person must choose)", () => {
    const { w, log, at } = make();
    at(18 * 60000);
    w.activity(); // restarts from 18 min
    expect(at(19 * 60000 + 30000)).toBe("active");
    expect(at(37 * 60000)).toBe("warning");
    w.activity();
    expect(at(38 * 60000)).toBe("expired");
    expect(log.filter((x) => x === "activity")).toHaveLength(1);
  });
  test("“Stay signed in” (extend) cancels the warning; an expired session cannot be revived", () => {
    const { w, at } = make();
    at(19 * 60000 + 10);
    expect(w.state()).toBe("warning");
    w.extend();
    expect(w.state()).toBe("active");
    expect(at(19 * 60000 + 20)).toBe("active");
    at(40 * 60000);
    expect(w.state()).toBe("expired");
    w.extend();
    expect(w.state()).toBe("expired");
  });
  test("forceWarn shows the warning right away (developer panel)", () => {
    const { w } = make();
    w.forceWarn();
    expect(w.state()).toBe("warning");
  });
});

describe("services – the single write path", () => {
  test("createRecord validates in plain English, writes, audits and fires an event", async () => {
    await isolated(() => {
      signInAs("u-anita");
      /** @type {any[]} */ const events = [];
      on("*", (_p, e) => events.push(e.name));
      const bad = (() => { try { W.createRecord("guests", { firstName: "A" }); } catch (e) { return /** @type {any} */ (e); } })();
      expect(bad.code).toBe("VALIDATION");
      expect(Object.keys(bad.fields)).toContain("lastName");
      expect(store.count("guests")).toBe(400);
      const g = W.createRecord("guests", { firstName: "Asha", lastName: "Mohan", blacklisted: false, stays: 0, nights: 0, createdAt: "2026-10-22T10:00:00+05:30" });
      expect(g.id).toMatch(/^GP-/);
      expect(store.count("guests")).toBe(401);
      const entries = store.filter("auditLog", (a) => a.entityId === g.id);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ action: "create", userId: "u-anita", entity: "guests" });
      expect(entries[0].changes.some((c) => c.field === "firstName" && c.new === "Asha")).toBe(true);
      expect(events).toContain("guests.created");
      expect(() => W.createRecord("guests", g)).toThrow("already exists");
    });
  });
  test("updateRecord logs old → new, does nothing when nothing changed, rejects bad values", async () => {
    await isolated(() => {
      signInAs("u-anita");
      const before = store.count("auditLog");
      const original = store.get("rooms", "R-201").status;
      const r = W.updateRecord("rooms", "R-201", { status: "out-of-order" }, { permission: "RS-09.edit" });
      expect(r.status).toBe("out-of-order");
      const last = store.all("auditLog").at(-1);
      expect(last.changes).toEqual([{ field: "status", old: original, new: "out-of-order" }]);
      expect(store.count("auditLog")).toBe(before + 1);
      W.updateRecord("rooms", "R-201", { status: "out-of-order" }); // no change
      expect(store.count("auditLog")).toBe(before + 1);
      expect(() => W.updateRecord("rooms", "R-201", { status: "flying" })).toThrow("must be one of");
      expect(() => W.updateRecord("rooms", "R-999", { status: "ready" })).toThrow("no longer exists");
    });
  });
  test("ids stay unique even for data saved before the counters existed", async () => {
    await isolated(() => {
      signInAs("u-anita");
      store.setMeta("idCounters", {}); // an older saved database without counters
      W.updateRecord("rooms", "R-203", { status: "out-of-order" });
      W.updateRecord("rooms", "R-203", { status: "ready" });
      const ids = store.all("auditLog").map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.at(-1)).toMatch(/^AU-\d{6}$/);
    });
  });
  test("a missing permission stops the write and leaves no trace", async () => {
    await isolated(() => {
      signInAs("u-rahul"); // reservation agent
      const before = store.count("auditLog");
      let err = /** @type {any} */ (null);
      try { W.updateRecord("roomTypes", "rt-wgr", { name: "X" }, { permission: "RSS-03.edit" }); } catch (e) { err = e; }
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("Reservation Agent");
      expect(store.get("roomTypes", "rt-wgr").name).toBe("Garden Deluxe Room");
      expect(store.count("auditLog")).toBe(before);
    });
  });
  test("delete and deactivate are audited", async () => {
    await isolated(() => {
      signInAs("u-admin");
      W.deactivateRecord("vipLevels", "vip-d");
      expect(store.get("vipLevels", "vip-d").active).toBe(false);
      expect(store.all("auditLog").at(-1).note).toBe("Deactivated");
      W.deleteRecord("vipLevels", "vip-d");
      expect(store.get("vipLevels", "vip-d")).toBe(undefined);
      expect(store.all("auditLog").at(-1)).toMatchObject({ action: "delete", entityId: "vip-d" });
    });
  });
  test("the audit service lists history of one record, newest first", async () => {
    await isolated(async () => {
      signInAs("u-anita");
      W.updateRecord("rooms", "R-202", { status: "out-of-order" });
      W.updateRecord("rooms", "R-202", { status: "ready" });
      const h = await auditSvc.listAudit({ entity: "rooms", entityId: "R-202" });
      expect(h.total).toBe(2);
      expect(h.items[0].changes[0].new).toBe("ready");
      const mine = await auditSvc.listAudit({ userId: "u-anita", limit: 1 });
      expect(mine.items).toHaveLength(1);
    });
  });
});

describe("services – sign-in", () => {
  const login = (/** @type {string} */ pw = "Aviv@2026", /** @type {string} */ email = "anita.mohan@avivkochi.example") => authSvc.login({ email, password: pw });
  test("right password → second step with the phone masked; the session starts only after the code", async () => {
    await isolated(async () => {
      const r = /** @type {any} */ (await login());
      expect(r.status).toBe("second-step");
      expect(r.method).toBe("otp");
      expect(r.sentTo).toContain("•");
      expect(r.sentTo.endsWith("1003")).toBe(true);
      expect(currentUser()).toBeNull();
      const done = await authSvc.verifySecondStep({ userId: r.userId, code: "123456" });
      expect(done.status).toBe("signed-in");
      const s = currentUser();
      expect(s).toMatchObject({ id: "u-anita", role: "Reservation Manager", roleId: "role-rm", realRoleId: "role-rm" });
      expect(s?.permissions).toContain("RS-*");
      expect(store.get("users", "u-anita").lastLoginAt).toBeTruthy();
      expect(store.all("auditLog").at(-1)).toMatchObject({ action: "login", userId: "u-anita", note: "Signed in" });
    });
  });
  test("PIN users get a 4-digit PIN step", async () => {
    await isolated(async () => {
      const r = /** @type {any} */ (await login("Aviv@2026", "rahul.vijay@avivkochi.example"));
      expect(r.method).toBe("pin");
      await expect(() => authSvc.verifySecondStep({ userId: r.userId, code: "12" })).rejects("VALIDATION");
      expect((await authSvc.verifySecondStep({ userId: r.userId, code: "2026" })).status).toBe("signed-in");
    });
  });
  test("wrong passwords are counted; the message never says whether the email exists", async () => {
    await isolated(async () => {
      const wrong = await authSvc.login({ email: "anita.mohan@avivkochi.example", password: "nope" }).catch((e) => e);
      const unknown = await authSvc.login({ email: "nobody@example.com", password: "nope" }).catch((e) => e);
      expect(wrong.code).toBe("INVALID_CREDENTIALS");
      expect(unknown.code).toBe("INVALID_CREDENTIALS");
      expect(wrong.message.split(".")[0]).toBe(unknown.message.split(".")[0]);
    });
  });
  test("five wrong passwords lock the account (and it says so); a correct password then still fails", async () => {
    await isolated(async () => {
      for (let i = 1; i <= 4; i++) expect((await login("bad", "george.mathew@avivkochi.example").catch((e) => e)).code).toBe("INVALID_CREDENTIALS");
      const fifth = await login("bad", "george.mathew@avivkochi.example").catch((e) => e);
      expect(fifth.code).toBe("LOCKED");
      expect(store.get("users", "u-george").locked).toBe(true);
      expect((await login("Aviv@2026", "george.mathew@avivkochi.example").catch((e) => e)).code).toBe("LOCKED");
      expect(store.all("auditLog").some((a) => a.entityId === "u-george" && a.note === "Locked after too many wrong passwords")).toBe(true);
    });
  });
  test("three wrong codes → start again; the right code works before that", async () => {
    await isolated(async () => {
      const r = /** @type {any} */ (await login());
      const a = await authSvc.verifySecondStep({ userId: r.userId, code: "111111" }).catch((e) => e);
      const b = await authSvc.verifySecondStep({ userId: r.userId, code: "222222" }).catch((e) => e);
      const c = await authSvc.verifySecondStep({ userId: r.userId, code: "333333" }).catch((e) => e);
      expect([a.code, b.code, c.code]).toEqual(["INVALID_CODE", "INVALID_CODE", "RESTART"]);
      expect(currentUser()).toBeNull();
    });
  });
  test("remember this device skips the second step next time (and can be forgotten)", async () => {
    await isolated(async () => {
      forgetDevice();
      const r = /** @type {any} */ (await login());
      await authSvc.verifySecondStep({ userId: r.userId, code: "123456", rememberDevice: true });
      expect(isTrustedDevice("u-anita")).toBe(true);
      clearSession();
      const again = /** @type {any} */ (await login());
      expect(again.status).toBe("signed-in");
      expect(currentUser()?.id).toBe("u-anita");
      forgetDevice("u-anita");
      expect(isTrustedDevice("u-anita")).toBe(false);
      clearSession();
      trustDevice("u-anita", -1); // expired
      expect(isTrustedDevice("u-anita")).toBe(false);
      forgetDevice();
    });
  });
  test("no password is ever saved in the database", async () => {
    await isolated(async () => {
      await login();
      const raw = store.snapshot();
      expect(raw.includes("Aviv@2026")).toBe(false);
      expect(raw.includes("123456")).toBe(false);
    });
  });
  test("forgot password gives the same answer for unknown emails; reset enforces the policy, then the new password works and the old one does not", async () => {
    await isolated(async () => {
      expect((await authSvc.requestPasswordReset({ email: "nobody@example.com" })).sent).toBe(true);
      expect((await authSvc.requestPasswordReset({ email: "anita.mohan@avivkochi.example" })).sent).toBe(true);
      await expect(() => authSvc.resetPassword({ email: "anita.mohan@avivkochi.example", code: "000000", newPassword: "Another@Pass1" })).rejects("INVALID_CODE");
      await expect(() => authSvc.resetPassword({ email: "anita.mohan@avivkochi.example", code: "123456", newPassword: "weak" })).rejects("VALIDATION");
      await authSvc.resetPassword({ email: "anita.mohan@avivkochi.example", code: "123456", newPassword: "Another@Pass1" });
      expect((await login("Aviv@2026").catch((e) => e)).code).toBe("INVALID_CREDENTIALS");
      expect(/** @type {any} */ (await login("Another@Pass1")).status).toBe("second-step");
      expect(store.all("auditLog").some((a) => a.note?.startsWith("Password reset with"))).toBe(true);
    });
  });
  test("a locked account is unlocked by a password reset", async () => {
    await isolated(async () => {
      for (let i = 0; i < 5; i++) await login("bad", "george.mathew@avivkochi.example").catch(() => {});
      expect(store.get("users", "u-george").locked).toBe(true);
      await authSvc.resetPassword({ email: "george.mathew@avivkochi.example", code: "123456", newPassword: "Fresh@Start99" });
      expect(store.get("users", "u-george").locked).toBe(false);
      expect(/** @type {any} */ (await login("Fresh@Start99", "george.mathew@avivkochi.example")).status).toBe("second-step");
    });
  });
  test("sign out ends the session and is logged; roles can be tried only by Admin or GM", async () => {
    await isolated(async () => {
      authSvc.startSession("u-anita");
      await expect(() => authSvc.switchRole("role-gm")).rejects("FORBIDDEN");
      await authSvc.signOut();
      expect(currentUser()).toBeNull();
      expect(store.all("auditLog").at(-1).note).toBe("Signed out");
      authSvc.startSession("u-admin");
      await authSvc.switchRole("role-ra");
      expect(currentUser()).toMatchObject({ role: "Reservation Agent", roleId: "role-ra", realRoleId: "role-admin" });
      expect(can("RS-10.refund")).toBe(false);
      expect(can("RS-05.create")).toBe(true);
    });
  });
  test("session timeout comes from Reservation Parameters", async () => {
    await isolated(async () => {
      expect(await authSvc.getSessionTimeoutMinutes()).toBe(20);
      const props = await authSvc.listDemoAccounts();
      expect(props).toHaveLength(10);
      expect(props.every((p) => p.email.endsWith("@avivkochi.example"))).toBe(true);
    });
  });
  test("hotels: one property now; switching to a hotel you cannot access is refused", async () => {
    await isolated(async () => {
      authSvc.startSession("u-anita");
      const mine = await authSvc.listMyProperties();
      expect(mine.properties).toHaveLength(1);
      expect(mine.currentId).toBe("prop-aviv-kochi");
      await expect(() => authSvc.setProperty("prop-other")).rejects("FORBIDDEN");
    });
  });
});

describe("services – approvals engine", () => {
  test("a request above the limit is created for the right approver, with a notification and an audit entry", async () => {
    await isolated(async () => {
      signInAs("u-rahul");
      const res = store.all("reservations").find((r) => r.status === "confirmed");
      const req = await approvalsSvc.requestApproval({ type: "discount", value: 12, reservationId: res.id, reasonId: "rc-6", payload: { discountPct: 12 } });
      expect(req).toMatchObject({ type: "discount", status: "pending", roleNeededId: "role-rm", requestedBy: "u-rahul", amount: 12, unit: "percent" });
      expect(new Date(req.escalateAt).getTime()).toBeGreaterThan(Date.now());
      const n = store.all("notifications").at(-1);
      expect(n).toMatchObject({ kind: "approval", roleId: "role-rm", refId: req.id, read: false });
      expect(n.body).toContain(res.number);
      expect(store.all("auditLog").some((a) => a.entityId === req.id && a.action === "create")).toBe(true);
    });
  });
  test("inside the limit no request is made; a reason (or note) is required; some reasons need a note", async () => {
    await isolated(async () => {
      signInAs("u-rahul");
      await expect(() => approvalsSvc.requestApproval({ type: "discount", value: 4, reasonId: "rc-6" })).rejects("NOT_NEEDED");
      await expect(() => approvalsSvc.requestApproval({ type: "discount", value: 12 })).rejects("VALIDATION");
      await expect(() => approvalsSvc.requestApproval({ type: "discount", value: 12, reasonId: "rc-7" })).rejects("VALIDATION"); // “Price match” needs a note
      const ok = await approvalsSvc.requestApproval({ type: "discount", value: 12, reasonId: "rc-7", reasonNote: "Competitor quoted ₹7,100" });
      expect(ok.reasonNote).toContain("₹7,100");
    });
  });
  test("approving runs the registered handler, tells the requester and clears the approver's notification", async () => {
    await isolated(async () => {
      signInAs("u-rahul");
      let applied = /** @type {any} */ (null);
      approvalsSvc.registerApprovalHandler("discount", (r) => { applied = r.payload; });
      const req = await approvalsSvc.requestApproval({ type: "discount", value: 12, reasonId: "rc-6", payload: { discountPct: 12 } });
      signInAs("u-anita");
      const done = await approvalsSvc.decideApproval({ id: req.id, decision: "approve", note: "OK" });
      expect(done).toMatchObject({ status: "approved", decidedBy: "u-anita", decisionNote: "OK" });
      expect(applied).toEqual({ discountPct: 12 });
      expect(store.filter("notifications", (n) => n.refId === req.id && n.roleId === "role-rm" && !n.read)).toHaveLength(0);
      const back = store.all("notifications").at(-1);
      expect(back).toMatchObject({ userId: "u-rahul", title: "Request approved", read: false });
      await expect(() => approvalsSvc.decideApproval({ id: req.id, decision: "reject", note: "x" })).rejects("CONFLICT");
      approvalsSvc.registerApprovalHandler("discount", () => {});
    });
  });
  test("rejecting needs a reason; nobody decides their own request; a junior role cannot decide a senior request", async () => {
    await isolated(async () => {
      signInAs("u-anita"); // manager asks for a 20% discount (limit 15) → front office manager
      const req = await approvalsSvc.requestApproval({ type: "discount", value: 20, reasonId: "rc-6" });
      expect(req.roleNeededId).toBe("role-fom");
      await expect(() => approvalsSvc.decideApproval({ id: req.id, decision: "approve" })).rejects("FORBIDDEN"); // own request
      signInAs("u-sneha");
      await expect(() => approvalsSvc.decideApproval({ id: req.id, decision: "approve" })).rejects("FORBIDDEN"); // agent
      signInAs("u-arjun");
      await expect(() => approvalsSvc.decideApproval({ id: req.id, decision: "approve" })).rejects("FORBIDDEN"); // revenue manager is not in the chain
      signInAs("u-fom");
      await expect(() => approvalsSvc.decideApproval({ id: req.id, decision: "reject" })).rejects("VALIDATION");
      const r = await approvalsSvc.decideApproval({ id: req.id, decision: "reject", note: "Not this time" });
      expect(r.status).toBe("rejected");
      expect(store.all("notifications").at(-1).body).toContain("Not this time");
    });
  });
  test("if applying the change fails the request stays pending", async () => {
    await isolated(async () => {
      signInAs("u-rahul");
      approvalsSvc.registerApprovalHandler("refund", () => { throw new Error("room is sold"); });
      const req = await approvalsSvc.requestApproval({ type: "refund", value: rupees(18000), reasonId: "rc-17" });
      signInAs("u-anita");
      await expect(() => approvalsSvc.decideApproval({ id: req.id, decision: "approve" })).rejects("HANDLER_FAILED");
      expect(store.get("approvalRequests", req.id).status).toBe("pending");
      approvalsSvc.registerApprovalHandler("refund", () => {});
    });
  });
  test("overdue requests move up the chain, with notifications for the new approver and the requester", async () => {
    await isolated(async () => {
      signInAs("u-rahul");
      const req = await approvalsSvc.requestApproval({ type: "discount", value: 12, reasonId: "rc-6" }); // → manager, 60 minutes
      const none = await approvalsSvc.escalateOverdue(new Date(Date.now() + 30 * 60000).toISOString());
      expect(none.filter((m) => m.id === req.id)).toEqual([]);
      const moved = await approvalsSvc.escalateOverdue(new Date(Date.now() + 90 * 60000).toISOString());
      expect(moved.find((m) => m.id === req.id)).toEqual({ id: req.id, from: "role-rm", to: "role-fom" });
      expect(store.get("approvalRequests", req.id)).toMatchObject({ status: "escalated", roleNeededId: "role-fom" });
      expect(store.all("notifications").some((n) => n.refId === req.id && n.roleId === "role-fom" && n.title === "Approval escalated")).toBe(true);
      expect(store.all("notifications").some((n) => n.refId === req.id && n.userId === "u-rahul")).toBe(true);
      const again = await approvalsSvc.escalateOverdue(new Date(Date.now() + 4 * 3600000).toISOString());
      expect(again.find((m) => m.id === req.id)?.to).toBe("role-gm");
      const top = await approvalsSvc.escalateOverdue(new Date(Date.now() + 40 * 3600000).toISOString());
      expect(top.find((m) => m.id === req.id)).toBe(undefined); // the GM is the end of the chain
    });
  });
  test("lists: pending for me / mine / history; the badge counts only what I may decide", async () => {
    await isolated(async () => {
      signInAs("u-anita");
      const mine = await approvalsSvc.listApprovals({ scope: "pending-for-me" });
      expect(mine.every((r) => ["pending", "escalated"].includes(r.status))).toBe(true);
      expect(mine.some((r) => r.id === "AP-0001")).toBe(true); // the seeded 12% rate override waits for the Reservation Manager
      const hist = await approvalsSvc.listApprovals({ scope: "history" });
      expect(hist.every((r) => !["pending", "escalated"].includes(r.status))).toBe(true);
      const counts = await notifSvc.navCounts();
      expect(counts.approvals).toBe(mine.length);
      signInAs("u-rahul");
      expect((await notifSvc.navCounts()).approvals).toBe((await approvalsSvc.listApprovals({ scope: "pending-for-me" })).length);
      expect((await approvalsSvc.listReasons({ type: "discount" })).every((r) => r.type === "discount")).toBe(true);
    });
  });
});

describe("services – notifications, search, backup, processes", () => {
  test("notifications are shown to the role they are for (GM sees all), and counts follow", async () => {
    await isolated(async () => {
      notifSvc.addNotification({ kind: "approval", title: "T", body: "for front office managers", roleId: "role-fom" });
      notifSvc.addNotification({ kind: "reminder", title: "T2", body: "just for Rahul", userId: "u-rahul" });
      signInAs("u-rahul");
      const rahul = await notifSvc.listNotifications();
      expect(rahul.some((n) => n.body === "just for Rahul")).toBe(true);
      expect(rahul.some((n) => n.body === "for front office managers")).toBe(false);
      signInAs("u-fom");
      expect((await notifSvc.listNotifications()).some((n) => n.body === "for front office managers")).toBe(true);
      expect((await notifSvc.listNotifications()).some((n) => n.body === "just for Rahul")).toBe(false);
      signInAs("u-gm");
      expect((await notifSvc.listNotifications()).some((n) => n.body === "for front office managers")).toBe(true);
      const before = (await notifSvc.navCounts()).unread;
      await notifSvc.markAllNotificationsRead();
      expect(before).toBeGreaterThan(0);
      expect((await notifSvc.navCounts()).unread).toBe(0);
    });
  });
  test("search service: needs 2 characters and hides what the role may not open", async () => {
    await isolated(async () => {
      signInAs("u-gm");
      await expect(() => searchSvc.search({ q: "a" })).rejects("VALIDATION");
      const full = await searchSvc.search({ q: "Nathan" });
      expect(full.groups.guest.length).toBeGreaterThan(0);
      setSession({ ...sessionFor("u-rahul"), permissions: ["RS-07.view"] }); // may open bookings only
      const limited = await searchSvc.search({ q: "Nathan" });
      expect(limited.groups.guest).toEqual([]);
      expect(limited.groups.booking.length).toBeGreaterThan(0);
      expect(limited.total).toBe(Object.values(limited.groups).reduce((n, g) => n + g.length, 0));
    });
  });
  test("backup: saves a copy, restores it, once per business date", async () => {
    await isolated(async () => {
      localStorage.removeItem("avivpms.backup");
      expect(await backupSvc.getBackupInfo()).toBeNull();
      expect(await backupSvc.ensureDailyBackup()).toBe(true);
      expect(await backupSvc.ensureDailyBackup()).toBe(false); // already done for this date
      const info = /** @type {any} */ (await backupSvc.getBackupInfo());
      expect(info.records).toBeGreaterThan(7000);
      store.update("rooms", "R-101", { status: "out-of-order" });
      await backupSvc.restoreBackup();
      expect(store.get("rooms", "R-101").status).not.toBe("out-of-order");
      store.setMeta("businessDate", "2030-01-01");
      expect(await backupSvc.ensureDailyBackup()).toBe(true); // a new day → a new backup
      localStorage.removeItem("avivpms.backup");
      await expect(() => backupSvc.restoreBackup()).rejects("NOT_FOUND");
    });
  });
  test("the simulated processes CM-X01, CM-X02 and CM-X03 are registered and report what they did", async () => {
    await isolated(async () => {
      for (const c of ["CM-X01", "CM-X02", "CM-X03"]) expect(hasProcess(c)).toBe(true);
      signInAs("u-rahul");
      const x1 = await runProcess("CM-X01");
      expect(x1).toMatchObject({ signedIn: true, role: "Reservation Agent" });
      const x2 = await runProcess("CM-X02");
      expect(x2.screensHidden).toBeGreaterThan(5); // an agent cannot open the user and rate screens
      expect(x2.permissionsAllowed).toBeGreaterThan(40);
      expect(x2.permissionsDenied).toBeGreaterThan(20);
      signInAs("u-gm");
      expect((await runProcess("CM-X02")).screensHidden).toBe(0);
      localStorage.removeItem("avivpms.backup");
      const x3 = await runProcess("CM-X03");
      expect(x3.records).toBeGreaterThan(7000);
      localStorage.removeItem("avivpms.backup");
    });
  });
});

describe("pop-ups CM-P04 … CM-P09 and the history timeline", () => {
  /** @param {string} code */
  const dlg = (code) => /** @type {HTMLDialogElement | null} */ (document.querySelector(`dialog[data-code="${code}"]`));
  const clickIn = (/** @type {HTMLElement} */ root, /** @type {string} */ text) => /** @type {HTMLElement} */ ([...root.querySelectorAll("button")].find((b) => b.textContent?.trim() === text)).click();

  test("CM-P07 Confirm Action: yes / no, and a typed word for very destructive actions", async () => {
    const p = confirmAction({ title: "Cancel booking?", danger: true, confirmLabel: "Cancel booking", cancelLabel: "Keep" });
    clickIn(/** @type {HTMLElement} */ (dlg("CM-P07")), "Cancel booking");
    expect(await p).toBe(true);
    const q = confirmAction({ title: "Cancel booking?" });
    clickIn(/** @type {HTMLElement} */ (dlg("CM-P07")), "Cancel");
    expect(await q).toBe(false);
    const t = confirmAction({ title: "Delete all rates?", typeToConfirm: "DELETE", confirmLabel: "Delete" });
    const d = /** @type {HTMLDialogElement} */ (dlg("CM-P07"));
    clickIn(d, "Delete");
    expect(d.querySelector(".field__error")?.textContent).toContain("DELETE");
    await wait(10); // the button ignores clicks while its handler is still running (double-click protection)
    const input = /** @type {HTMLInputElement} */ (d.querySelector("input"));
    input.value = "delete";
    clickIn(d, "Delete");
    expect(await t).toBe(true);
  });
  test("CM-P05 Unsaved Changes: keep editing / discard / save, and the dialog guard", async () => {
    for (const [label, expected] of /** @type {Array<[string, string]>} */ ([["Keep editing", "cancel"], ["Discard changes", "discard"], ["Save and leave", "save"]])) {
      const p = openUnsavedChanges();
      clickIn(/** @type {HTMLElement} */ (dlg("CM-P05")), label);
      expect(await p).toBe(expected);
    }
    const guard = guardClose(() => true);
    const g = guard();
    clickIn(/** @type {HTMLElement} */ (dlg("CM-P05")), "Keep editing");
    expect(await g).toBe(false);
    expect(await guardClose(() => false)()).toBe(true);
    const only = openUnsavedChanges({ canSave: false });
    expect([...(/** @type {HTMLElement} */ (dlg("CM-P05"))).querySelectorAll("button")].some((b) => b.textContent === "Save and leave")).toBe(false);
    clickIn(/** @type {HTMLElement} */ (dlg("CM-P05")), "Keep editing");
    await only;
  });
  test("CM-P06 Session Timeout Warning: countdown, cannot be dismissed with Esc, buttons call back", async () => {
    expect(clock(59000)).toBe("0:59");
    expect(clock(125000)).toBe("2:05");
    let ms = 59000, stayed = 0, out = 0;
    const w = openSessionWarning({ remainingMs: () => ms, onStay: () => { stayed++; }, onSignOut: () => { out++; } });
    const d = /** @type {HTMLDialogElement} */ (dlg("CM-P06"));
    expect(d.textContent).toContain("0:59");
    ms = 41000;
    await wait(700);
    expect(d.textContent).toContain("0:41");
    d.dispatchEvent(new Event("cancel", { cancelable: true }));
    await wait(20);
    expect(d.open).toBe(true); // Esc does nothing: the person must choose
    clickIn(d, "Stay signed in");
    await wait(20);
    expect([stayed, out]).toEqual([1, 0]);
    const w2 = openSessionWarning({ remainingMs: () => 1000, onStay() {}, onSignOut: () => { out++; } });
    clickIn(/** @type {HTMLElement} */ (dlg("CM-P06")), "Sign out");
    await wait(20);
    expect(out).toBe(1);
    w.close();
    w2.close();
  });
  test("CM-P08 Export / Print: Excel gives a spreadsheet-safe CSV of the chosen columns and rows", async () => {
    const original = HTMLAnchorElement.prototype.click;
    /** @type {{ name: string, href: string } | null} */ let download = null;
    HTMLAnchorElement.prototype.click = function () { download = { name: this.download, href: this.href }; };
    try {
      const rows = [{ a: "Room 1", b: 7999 }, { a: "=SUM(A1)", b: 8499 }, { a: 'Say "hi", ok', b: 1 }];
      const p = openExportOptions({ title: "Rooms list", columns: [{ key: "a", label: "Name" }, { key: "b", label: "Rate", align: "right" }], rows, selectedRows: [rows[0]] });
      const d = /** @type {HTMLDialogElement} */ (dlg("CM-P08"));
      expect(d.textContent).toContain("Only the 1 selected");
      const scopeAll = /** @type {HTMLInputElement} */ (d.querySelector('input[name="export-scope"][value="all"]'));
      scopeAll.click();
      const colBoxes = /** @type {HTMLInputElement[]} */ ([...d.querySelectorAll(".export__cols input")]);
      expect(colBoxes).toHaveLength(2);
      clickIn(d, "Export");
      const result = await p;
      expect(result).toEqual({ format: "excel", rows: 3, columns: 2 });
      expect(/** @type {any} */ (download).name).toMatch(/^rooms-list-\d{4}-\d{2}-\d{2}\.csv$/);
      const text = await (await fetch(/** @type {any} */ (download).href)).text();
      expect(text).toContain("Name,Rate");
      expect(text).toContain("'=SUM(A1)"); // formula guard
      expect(text).toContain('"Say ""hi"", ok"');
    } finally {
      HTMLAnchorElement.prototype.click = original;
    }
  });
  test("CM-P08 Export / Print: needs at least one column; PDF / Print builds a print view and calls the browser's print", async () => {
    const realPrint = window.print;
    let printed = 0;
    /** @type {string} */ let printedHtml = "";
    window.print = () => { printed++; printedHtml = document.getElementById("print-root")?.innerHTML ?? ""; };
    try {
      const p = openExportOptions({ title: "Arrivals", columns: [{ key: "n", label: "Guest" }, { key: "t", label: "Total", align: "right" }], rows: [{ n: "Priya", t: "₹9,438.82" }, { n: "Rahul", t: "₹6,721.05" }] });
      const d = /** @type {HTMLDialogElement} */ (dlg("CM-P08"));
      for (const cb of /** @type {HTMLInputElement[]} */ ([...d.querySelectorAll(".export__cols input")])) cb.click();
      clickIn(d, "Export");
      expect(d.querySelector('[role="alert"]')?.textContent).toBe("Tick at least one column.");
      await wait(10); // the button ignores clicks while its handler is still running
      for (const cb of /** @type {HTMLInputElement[]} */ ([...d.querySelectorAll(".export__cols input")])) cb.click();
      /** @type {HTMLInputElement} */ (d.querySelector('input[name="export-format"][value="pdf"]')).click();
      clickIn(d, "Export");
      expect(await p).toEqual({ format: "pdf", rows: 2, columns: 2 });
      await wait(20); // printing starts right after the dialog has closed
      expect(printed).toBe(1);
      expect(printedHtml).toContain("Priya");
      expect(printedHtml).toContain("₹6,721.05");
      expect(printedHtml).toContain("The Aviv Kochi");
      expect(document.getElementById("print-page-style")?.textContent).toContain("A4 portrait");
      expect(document.body.classList.contains("is-printing")).toBe(true);
      window.dispatchEvent(new Event("afterprint"));
      expect(document.body.classList.contains("is-printing")).toBe(false);
      expect(document.getElementById("print-root")).toBeNull();
    } finally {
      window.print = realPrint;
      document.body.classList.remove("is-printing");
    }
  });
  test("CM-P09 Property Switcher: lists my hotel, nothing to switch to yet", async () => {
    await isolated(async () => {
      authSvc.startSession("u-anita");
      const p = openPropertySwitcher();
      await wait(30);
      const d = /** @type {HTMLDialogElement} */ (dlg("CM-P09"));
      expect(d.textContent).toContain("The Aviv Kochi");
      expect(d.textContent).toContain("one hotel");
      clickIn(d, "Close");
      expect(await p).toBeNull();
    });
  });
  test("CM-P04 Request Approval: reason is required, the request is sent to the right role and the dialog closes with it", async () => {
    await isolated(async () => {
      signInAs("u-rahul");
      const p = requestApprovalDialog({ type: "discount", value: 12, summary: "12% discount on FK-10001", approverName: "Reservation Manager", limitText: "5%" });
      await wait(30);
      const d = /** @type {HTMLDialogElement} */ (dlg("CM-P04"));
      expect(d.textContent).toContain("12% discount on FK-10001");
      expect(d.textContent).toContain("Reservation Manager");
      clickIn(d, "Send request");
      await wait(20);
      expect(d.querySelector(".field__error:not([hidden])")?.textContent).toContain("Choose a reason");
      const sel = /** @type {HTMLSelectElement} */ (d.querySelector("select"));
      expect(sel.options.length).toBeGreaterThan(2);
      sel.value = sel.options[1].value;
      clickIn(d, "Send request");
      const req = await p;
      expect(req).toMatchObject({ status: "pending", roleNeededId: "role-rm", requestedBy: "u-rahul" });
      expect([...document.querySelectorAll(".toast")].at(-1)?.textContent).toContain("Request sent");
    });
  });
  test("guardLimit: inside the limit it just allows; above it opens CM-P04 and returns what happened", async () => {
    await isolated(async () => {
      signInAs("u-rahul");
      expect(await guardLimit({ type: "discount", value: 3 })).toEqual({ allowed: true });
      const p = guardLimit({ type: "discount", value: 12, summary: "x" });
      await wait(40);
      clickIn(/** @type {HTMLElement} */ (dlg("CM-P04")), "Cancel");
      expect(await p).toEqual({ allowed: false, cancelled: true });
    });
  });
  test("history timeline: who, when, old → new, money shown as ₹", () => {
    expect(auditValue("rate2", 799900)).toBe("₹7,999");
    expect(auditValue("status", "ready")).toBe("ready");
    expect(auditValue("x", null)).toBe("–");
    expect(auditValue("active", false)).toBe("no");
    expect(fieldLabel("bookingWindow.minAdvanceDays")).toBe("Booking window › min advance days");
    const el = auditTimeline([{ id: "AU-1", at: "2026-10-22T10:30:00+05:30", userId: "u-anita", entity: "rooms", entityId: "R-101", action: "update", changes: [{ field: "status", old: "ready", new: "dirty" }, { field: "rate2", old: 799900, new: 849900 }], note: "Housekeeping" }], { "u-anita": "Anita Mohan" });
    expect(el.textContent).toContain("Changed by Anita Mohan");
    expect(el.textContent).toContain("Housekeeping");
    expect(el.textContent).toContain("₹7,999");
    expect(el.textContent).toContain("₹8,499");
    expect(el.querySelectorAll(".chip")).toHaveLength(4);
    expect(auditTimeline([]).textContent).toContain("No changes recorded yet.");
    void button;
  });
});

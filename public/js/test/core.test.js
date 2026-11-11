// @ts-check
import { describe, test, expect } from "./runner.js";
import {
  formatMoney, parseMoney, rupees, percentOf,
  isISODate, addDays, diffDays, nightsBetween, weekday, dateRange, formatDate, formatDateShort, financialYear, greeting,
} from "../core/format.js";
import { h } from "../core/dom.js";
import { on, once, emit, recentEvents, _resetForTests as resetEvents } from "../core/events.js";
import * as store from "../core/store.js";
import { SCHEMA_VERSION } from "../config.js";
import { _setDelayScale } from "../services/mock/util.js";
import * as system from "../services/mock/system.js";

describe("format – money (integer paise, Indian grouping)", () => {
  test("formats rupees with Indian digit grouping", () => {
    expect(formatMoney(12345600)).toBe("₹1,23,456");
    expect(formatMoney(799900)).toBe("₹7,999");
    expect(formatMoney(100)).toBe("₹1");
    expect(formatMoney(0)).toBe("₹0");
    expect(formatMoney(1234567800)).toBe("₹1,23,45,678");
  });
  test("shows paise only when present", () => {
    expect(formatMoney(150050)).toBe("₹1,500.50");
    expect(formatMoney(150005)).toBe("₹1,500.05");
    expect(formatMoney(150000, { alwaysDecimals: true })).toBe("₹1,500.00");
  });
  test("negative amounts and no-symbol option", () => {
    expect(formatMoney(-250000)).toBe("-₹2,500");
    expect(formatMoney(250000, { symbol: false })).toBe("2,500");
  });
  test("rejects floats", () => {
    expect(() => formatMoney(10.5)).toThrow("integer paise");
  });
  test("parseMoney reads what people type", () => {
    expect(parseMoney("7,999")).toBe(799900);
    expect(parseMoney("₹ 1,23,456")).toBe(12345600);
    expect(parseMoney("7999.5")).toBe(799950);
    expect(parseMoney("0.07")).toBe(7);
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("12.345")).toBeNull();
  });
  test("rupees() converts whole rupees only", () => {
    expect(rupees(1940)).toBe(194000);
    expect(() => rupees(19.4)).toThrow();
  });
  test("percentOf rounds half-up to the paisa (GST maths)", () => {
    expect(percentOf(799900, 5)).toBe(39995); // 5% of ₹7,999 = ₹399.95
    expect(percentOf(799900, 2.5)).toBe(19998); // 19997.5 → 19998
    expect(percentOf(1450000, 18)).toBe(261000);
    expect(percentOf(0, 18)).toBe(0);
  });
});

describe("format – dates (YYYY-MM-DD strings)", () => {
  test("validates real calendar dates", () => {
    expect(isISODate("2026-02-28")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2028-02-29")).toBe(true);
    expect(isISODate("2026-2-3")).toBe(false);
    expect(isISODate("")).toBe(false);
  });
  test("addDays crosses month and year ends, forwards and back", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  test("diffDays / nightsBetween", () => {
    expect(nightsBetween("2026-10-22", "2026-10-25")).toBe(3);
    expect(diffDays("2026-10-25", "2026-10-22")).toBe(-3);
    expect(nightsBetween("2026-03-28", "2026-04-02")).toBe(5);
  });
  test("weekday: 2026-10-22 is a Thursday", () => {
    expect(weekday("2026-10-22")).toBe(4);
  });
  test("dateRange gives the nights of a stay (check-out day excluded)", () => {
    expect(dateRange("2026-10-22", "2026-10-25")).toEqual(["2026-10-22", "2026-10-23", "2026-10-24"]);
    expect(dateRange("2026-10-22", "2026-10-22")).toEqual([]);
  });
  test("formatting", () => {
    expect(formatDate("2026-10-22")).toBe("22 Oct 2026");
    expect(formatDate("2026-10-22", "long")).toBe("Thu, 22 Oct 2026");
    expect(formatDate("2026-10-22", "month")).toBe("Oct 2026");
    expect(formatDateShort("2026-10-22")).toBe("Thu 22 Oct");
  });
  test("financial year runs April to March", () => {
    expect(financialYear("2026-03-31")).toBe("2025-26");
    expect(financialYear("2026-04-01")).toBe("2026-27");
    expect(financialYear("2099-12-01")).toBe("2099-00");
  });
  test("greeting by hour", () => {
    expect(greeting(8)).toBe("Good morning");
    expect(greeting(13)).toBe("Good afternoon");
    expect(greeting(20)).toBe("Good evening");
  });
  test("invalid dates throw instead of silently drifting", () => {
    expect(() => addDays("2026-13-01", 1)).toThrow("Invalid date");
  });
});

describe("dom – h() helper is safe", () => {
  test("builds elements with class, attrs, dataset and children", () => {
    const el = h("button", { class: "btn", dataset: { code: "X" }, attrs: { "aria-label": "Go" } }, "Save", " now");
    expect(el.className).toBe("btn");
    expect(el.dataset.code).toBe("X");
    expect(el.getAttribute("aria-label")).toBe("Go");
    expect(el.textContent).toBe("Save now");
  });
  test("user text is never parsed as HTML", () => {
    const el = h("div", {}, '<img src=x onerror="alert(1)">');
    expect(el.children.length).toBe(0);
    expect(el.textContent).toBe('<img src=x onerror="alert(1)">');
  });
  test("event handlers and nested arrays", () => {
    let clicks = 0;
    const el = h("ul", {}, [h("li", {}, "a"), [h("li", {}, "b"), null, false]]);
    const btn = h("button", { onclick: () => clicks++ });
    btn.click();
    expect(el.children.length).toBe(2);
    expect(clicks).toBe(1);
  });
});

describe("events – bus", () => {
  test("delivers payloads, supports once and wildcard, unsubscribes", () => {
    resetEvents();
    const seen = [];
    const stop = on("a.b", (p) => seen.push(p.n));
    once("a.b", (p) => seen.push(`once${p.n}`));
    on("*", (_p, e) => seen.push(`*${e.name}`));
    emit("a.b", { n: 1 });
    emit("a.b", { n: 2 });
    stop();
    emit("a.b", { n: 3 });
    expect(seen).toEqual([1, "once1", "*a.b", 2, "*a.b", "*a.b"]);
    expect(recentEvents()).toHaveLength(3);
  });
  test("a failing listener does not stop the others", () => {
    resetEvents();
    const original = console.error;
    console.error = () => {}; // expected error, keep the console clean
    let reached = false;
    on("x", () => { throw new Error("boom"); });
    on("x", () => { reached = true; });
    emit("x");
    console.error = original;
    expect(reached).toBe(true);
  });
});

describe("store – mock database (isolated test key)", () => {
  const fresh = () => { store._useKeyForTests("avivpms.test"); store._dropForTests(); };

  test("seed loads: property with GSTIN and 92 rooms", () => {
    fresh();
    const p = store.all("property")[0];
    expect(p.gstin).toBe("32AACCE1226H1Z9");
    expect(p.rooms).toBe(92);
  });
  test("insert / get / update / remove", () => {
    fresh();
    const row = store.insert("things", { id: "t1", name: "A" });
    expect(row.id).toBe("t1");
    store.update("things", "t1", { name: "B" });
    expect(store.get("things", "t1").name).toBe("B");
    expect(store.remove("things", "t1")).toBe(true);
    expect(store.get("things", "t1")).toBe(undefined);
    expect(store.remove("things", "t1")).toBe(false);
  });
  test("duplicate ids and unknown updates are rejected", () => {
    fresh();
    store.insert("things", { id: "t1" });
    expect(() => store.insert("things", { id: "t1" })).toThrow("Duplicate");
    expect(() => store.update("things", "nope", {})).toThrow("not found");
  });
  test("returned records are copies – callers cannot corrupt the database", () => {
    fresh();
    store.insert("things", { id: "t1", tags: ["a"] });
    const copy = store.get("things", "t1");
    copy.tags.push("b");
    expect(store.get("things", "t1").tags).toEqual(["a"]);
  });
  test("data survives a reload (reads back from localStorage)", () => {
    fresh();
    store.insert("things", { id: "keep", v: 42 });
    store._useKeyForTests("avivpms.test"); // forget memory, keep storage
    expect(store.get("things", "keep").v).toBe(42);
  });
  test("reset restores the seed", () => {
    fresh();
    store.insert("things", { id: "t1" });
    store.reset();
    expect(store.count("things")).toBe(0);
    expect(store.all("property")).toHaveLength(1);
  });
  test("nextId counts per prefix and pads", () => {
    fresh();
    expect(store.nextId("RES")).toBe("RES-000001");
    expect(store.nextId("RES")).toBe("RES-000002");
    expect(store.nextId("GRP", 4)).toBe("GRP-0001");
  });
  test("query filters, sorts (numeric-aware) and paginates", () => {
    fresh();
    for (const n of ["Room 10", "Room 2", "Room 1"]) store.insert("sortables", { id: n, name: n });
    const asc = store.query("sortables", { sort: "name" });
    expect(asc.items.map((r) => r.name)).toEqual(["Room 1", "Room 2", "Room 10"]);
    const desc = store.query("sortables", { sort: "name", dir: "desc", pageSize: 2, page: 2 });
    expect(desc.items.map((r) => r.name)).toEqual(["Room 1"]);
    expect(desc.total).toBe(3);
    expect(desc.pages).toBe(2);
    expect(store.query("sortables", { where: (r) => r.name.endsWith("2") }).total).toBe(1);
  });
  test("migrate stamps the current version and keeps data that is already current", () => {
    const m = store.migrate({ version: SCHEMA_VERSION - 1 + 1, meta: { businessDate: "2030-01-01" }, collections: { things: [{ id: "t" }] } });
    expect(m.version).toBe(SCHEMA_VERSION);
    expect(m.meta.businessDate).toBe("2030-01-01");
    expect(m.collections.things).toHaveLength(1);
    expect(m.collections.notifications.length).toBeGreaterThan(0);
  });
  test("migrate replaces the old demo surnames in saved data and keeps other words", () => {
    const m = store.migrate({ version: 3, meta: {}, collections: { users: [
      { id: "u-gm", name: "Vikram Nair", email: "vikram.nair@avivkochi.example" },
      { id: "u-das", name: "Arjun Das", email: "arjun.das12@example.com", note: "das module, Dashboards" },
    ] } });
    expect(m.version).toBe(SCHEMA_VERSION);
    expect(m.collections.users[0].name).toBe("Vikram Nathan");
    expect(m.collections.users[0].email).toBe("vikram.nathan@avivkochi.example");
    expect(m.collections.users[1].id).toBe("u-das");
    expect(m.collections.users[1].name).toBe("Arjun Dev");
    expect(m.collections.users[1].email).toBe("arjun.dev12@example.com");
    expect(m.collections.users[1].note).toBe("das module, Dashboards");
  });
  test("demo seed is small (well under 5 MB)", () => {
    fresh();
    expect(store.sizeBytes()).toBeLessThan(5_000_000);
  });
  test("cleanup test storage", () => {
    store._dropForTests();
    store._useKeyForTests("avivpms.v1");
    expect(true).toBe(true);
  });
});

describe("services – mock system service", () => {
  test("setBusinessDate validates and stores", async () => {
    _setDelayScale(0);
    store._useKeyForTests("avivpms.test");
    store._dropForTests();
    await system.setBusinessDate("2026-12-25");
    expect(await system.getBusinessDate()).toBe("2026-12-25");
    await expect(() => system.setBusinessDate("2026-02-30")).rejects("VALIDATION");
    expect(await system.getBusinessDate()).toBe("2026-12-25");
  });
  test("counter writes persist and emit an event; reset clears them", async () => {
    resetEvents();
    let got = 0;
    on("demo.counterChanged", (p) => { got = p.value; });
    await system.bumpCounter();
    await system.bumpCounter();
    expect(await system.getCounter()).toBe(2);
    expect(got).toBe(2);
    await system.resetData();
    expect(await system.getCounter()).toBe(0);
    store._dropForTests();
    store._useKeyForTests("avivpms.v1");
    _setDelayScale(1);
  });
});

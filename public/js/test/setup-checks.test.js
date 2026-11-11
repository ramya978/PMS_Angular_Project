// @ts-check
/** Reservation Setup – setup checklist rules (RSS-01) and the setup service. */
import { describe, test, expect } from "./runner.js";
import * as store from "../core/store.js";
import { currentUser, setSession, clearSession } from "../core/auth.js";
import { _resetForTests as resetEvents } from "../core/events.js";
import { buildSeed } from "../data/seed.js";
import { evaluateSetup, totals, statusLabel, RATE_HORIZON_DAYS } from "../domain/setup-checks.js";
import { _setDelayScale } from "../services/mock/util.js";
import * as W from "../services/mock/write.js";
import * as setupSvc from "../services/mock/setup.js";

const TODAY = "2026-10-22";
/** A fresh copy of the demo data for every call, so a test can break it freely. */
const fresh = () => /** @type {Record<string, any[]>} */ (structuredClone(buildSeed(TODAY).collections));
const step = (/** @type {ReturnType<typeof evaluateSetup>} */ r, /** @type {string} */ code) => /** @type {import("../domain/setup-checks.js").SetupStep} */ (r.steps.find((s) => s.code === code));

/** @param {() => Promise<void> | void} fn */
async function isolated(fn) {
  const previous = currentUser();
  _setDelayScale(0);
  store._useKeyForTests("avivpms.test5");
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

describe("setup checklist (RSS-01) – rules", () => {
  test("the demo data is fully set up: 25 steps, 22 required, 100%, no warnings", () => {
    const r = evaluateSetup(fresh(), TODAY);
    expect(r.steps).toHaveLength(25);
    expect(r.totals).toMatchObject({ required: 22, requiredDone: 22, percent: 100, attention: 0, notStarted: 0 });
    expect(r.warnings).toEqual([]);
  });
  test("steps follow the screen codes RSS-02 … RSS-26 once each", () => {
    const codes = evaluateSetup(fresh(), TODAY).steps.map((s) => s.code);
    expect(codes).toEqual(Array.from({ length: 25 }, (_, i) => `RSS-${String(i + 2).padStart(2, "0")}`));
  });
  test("an empty database has nothing started and 0% progress", () => {
    const r = evaluateSetup({}, TODAY);
    expect(r.totals.percent).toBe(0);
    expect(r.steps.every((s) => s.status === "not-started")).toBe(true);
  });
  test("rooms: a different count from the hotel details, or a repeated number, needs attention", () => {
    const d = fresh();
    d.rooms = d.rooms.slice(0, 90);
    expect(step(evaluateSetup(d, TODAY), "RSS-04").status).toBe("attention");
    expect(step(evaluateSetup(d, TODAY), "RSS-04").summary).toBe("90 of 92 rooms entered");
    const e = fresh();
    e.rooms[1].number = e.rooms[0].number;
    expect(step(evaluateSetup(e, TODAY), "RSS-04").warnings.join(" ")).toMatch(/used 2 times/);
  });
  test("room types without rooms are called out by name", () => {
    const d = fresh();
    d.rooms = d.rooms.filter((r) => r.roomTypeId !== "rt-fps");
    const s = step(evaluateSetup(d, TODAY), "RSS-03");
    expect(s.status).toBe("attention");
    expect(s.warnings[0]).toMatch(/Premium Suite has no rooms/);
  });
  test("rates: warns with the room type and date when rates stop before the look-ahead window", () => {
    const d = fresh();
    const cutoff = "2027-02-15";
    d.rateCalendar = d.rateCalendar.filter((r) => r.roomTypeId !== "rt-fcs" || r.date <= cutoff);
    const s = step(evaluateSetup(d, TODAY), "RSS-08");
    expect(s.status).toBe("done"); // rates run past today + 90 days (20 Jan 2027)
    expect(RATE_HORIZON_DAYS).toBe(90);
    d.rateCalendar = fresh().rateCalendar.filter((r) => r.roomTypeId !== "rt-fcs" || r.date <= "2026-12-01");
    const w = step(evaluateSetup(d, TODAY), "RSS-08");
    expect(w.status).toBe("attention");
    expect(w.warnings[0]).toMatch(/Deluxe Suite has no rates after .*2026/);
  });
  test("rates: no rates at all is not started; a room type without any rates is a warning", () => {
    const d = fresh();
    d.rateCalendar = [];
    expect(step(evaluateSetup(d, TODAY), "RSS-08").status).toBe("not-started");
    const e = fresh();
    e.rateCalendar = e.rateCalendar.filter((r) => r.roomTypeId !== "rt-wgr");
    expect(step(evaluateSetup(e, TODAY), "RSS-08").warnings[0]).toMatch(/Garden Deluxe Room has no rates at all/);
  });
  test("taxes: CGST + SGST must equal the slab, and a slab must be in force today", () => {
    const d = fresh();
    d.taxSlabs[0].sgstPct = 1;
    expect(step(evaluateSetup(d, TODAY), "RSS-06").warnings.join(" ")).toMatch(/CGST \+ SGST should add up to 5%/);
    const e = fresh();
    for (const s of e.taxSlabs) s.effectiveFrom = "2027-04-01";
    expect(step(evaluateSetup(e, TODAY), "RSS-06").warnings).toContain("No GST slab is in force today.");
  });
  test("reason codes: a missing group is named", () => {
    const d = fresh();
    d.reasonCodes = d.reasonCodes.filter((r) => r.type !== "refund");
    const s = step(evaluateSetup(d, TODAY), "RSS-20");
    expect(s.status).toBe("attention");
    expect(s.warnings.join(" ")).toMatch(/“refund”/);
  });
  test("deactivated items do not count; a rate plan pointing at a deactivated policy is flagged", () => {
    const d = fresh();
    const id = d.ratePlans[0].cancellationPolicyId;
    d.cancellationPolicies.find((p) => p.id === id).active = false;
    const s = step(evaluateSetup(d, TODAY), "RSS-12");
    expect(s.status).toBe("attention");
    expect(s.warnings.length).toBeGreaterThan(0);
  });
  test("optional steps never lower the progress figure", () => {
    const d = fresh();
    d.restrictions = [];
    d.overbookingLimits = [];
    d.pricingRules = [];
    const r = evaluateSetup(d, TODAY);
    expect(["RSS-10", "RSS-11", "RSS-26"].every((c) => step(r, c).optional && step(r, c).status === "not-started")).toBe(true);
    expect(r.totals.percent).toBe(100);
  });
  test("totals: percent is required steps done / required steps, rounded", () => {
    const mk = (/** @type {boolean} */ optional, /** @type {any} */ status) => ({ code: "X", title: "", group: "", why: "", optional, status, summary: "", warnings: [] });
    expect(totals([mk(false, "done"), mk(false, "attention"), mk(false, "not-started"), mk(true, "not-started")]).percent).toBe(33);
    expect(totals([]).percent).toBe(100);
  });
  test("status labels are plain English", () => {
    expect([statusLabel("done"), statusLabel("attention"), statusLabel("not-started")]).toEqual(["Done", "Needs attention", "Not started"]);
  });
});

describe("setup service", () => {
  test("getSetupStatus returns the checklist for the business date", async () => {
    await isolated(async () => {
      const r = await setupSvc.getSetupStatus();
      expect(r.steps).toHaveLength(25);
      expect(r.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
  test("a change to setup data shows up in the change report, with who and what; other data does not", async () => {
    await isolated(async () => {
      setSession({ id: "u-anita", name: "Anita Mohan", role: "General Manager", roleId: "role-gm", realRoleId: "role-gm", permissions: ["*"], propertyId: "prop-aviv-kochi", lastActive: Date.now() });
      W.updateRecord("roomTypes", "rt-fcs", { description: "Two-room suite with a lounge." });
      W.updateRecord("guests", store.filter("guests")[0].id, { notes: "Prefers a high floor" });
      const { items, total } = await setupSvc.listSetupChanges({ limit: 5 });
      expect(items[0]).toMatchObject({ entity: "roomTypes", entityId: "rt-fcs", userName: "Anita Mohan", screen: "RSS-03", entityLabel: "Room type", action: "update" });
      expect(items[0].what).toMatch(/Changed description/);
      expect(items.every((i) => i.entity in setupSvc.SETUP_ENTITIES)).toBe(true);
      expect(total).toBeGreaterThan(0);
      const only = await setupSvc.listSetupChanges({ entity: "roomTypes" });
      expect(only.items.every((i) => i.entity === "roomTypes")).toBe(true);
      const none = await setupSvc.listSetupChanges({ from: "2999-01-01" });
      expect(none.total).toBe(0);
    });
  });
});

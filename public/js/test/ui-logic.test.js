// @ts-check
/** UI logic – fuzzy search, shortcuts, date logic, chart maths, table logic, screen registry, palette, contrast. */
import { describe, test, expect } from "./runner.js";
import { fuzzyScore, fuzzyFilter } from "../core/fuzzy.js";
import { parseKeys, stepMatches, formatKeys, registerShortcut, listShortcuts, _resetForTests as resetShortcuts } from "../core/shortcuts.js";
import { monthGrid, addMonths, parseDateInput, nightsLabel, parseTimeInput, timeSlots } from "../components/date-logic.js";
import { niceScale, scaleLinear, linePath, donutSlicePath, sliceAngles } from "../components/chart-math.js";
import { applyQuery, toCsv } from "../components/table-logic.js";
import { SCREENS, screenByCode, screenUrl, navLabel, NAV_GROUPS } from "../core/screens.js";
import { commandsFor } from "../core/palette.js";
import { priceLevel } from "../components/calendar-grid.js";

describe("fuzzy search", () => {
  test("matches codes without punctuation and words in order", () => {
    expect(fuzzyScore("rs05", "RS-05 New Reservation")).toBeGreaterThan(0);
    expect(fuzzyScore("newres", "New Reservation")).toBeGreaterThan(0);
    expect(fuzzyScore("zzz", "New Reservation")).toBe(-1);
  });
  test("prefix beats substring beats scattered letters", () => {
    const prefix = fuzzyScore("rate", "Rate Calendar");
    const sub = fuzzyScore("rate", "Pricing Rate Plans");
    const scattered = fuzzyScore("rate", "Room Availability Test Export");
    expect(prefix).toBeGreaterThan(sub);
    expect(sub).toBeGreaterThan(scattered);
  });
  test("fuzzyFilter orders best first and keeps everything for an empty query", () => {
    const items = ["Room Calendar", "Rate Calendar", "Setup Home"];
    expect(fuzzyFilter(items, "", (x) => x)).toEqual(items);
    expect(fuzzyFilter(items, "rate", (x) => x)[0]).toBe("Rate Calendar");
    expect(fuzzyFilter(items, "qqq", (x) => x)).toEqual([]);
  });
});

describe("keyboard shortcuts", () => {
  const ev = (/** @type {Partial<KeyboardEvent>} */ o) => ({ key: "", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...o });
  test("parses combos and chords", () => {
    expect(parseKeys("Ctrl+K")).toEqual([{ key: "k", mod: true, shift: false, alt: false }]);
    expect(parseKeys("g d")).toHaveLength(2);
    expect(parseKeys("?")[0].key).toBe("?");
  });
  test("Ctrl+K matches Ctrl or Command, not plain k or Ctrl+Shift+K", () => {
    const [step] = parseKeys("Ctrl+K");
    expect(stepMatches(step, ev({ key: "k", ctrlKey: true }))).toBe(true);
    expect(stepMatches(step, ev({ key: "K", metaKey: true }))).toBe(true);
    expect(stepMatches(step, ev({ key: "k" }))).toBe(false);
    expect(stepMatches(step, ev({ key: "k", ctrlKey: true, shiftKey: true }))).toBe(false);
  });
  test("“?” works although it needs Shift", () => {
    const [step] = parseKeys("?");
    expect(stepMatches(step, ev({ key: "?", shiftKey: true }))).toBe(true);
  });
  test("labels read naturally", () => {
    expect(formatKeys("g d")).toBe("G then D");
    expect(formatKeys("Ctrl+K")).toContain("K");
  });
  test("registry add / list / remove", () => {
    resetShortcuts();
    const off = registerShortcut({ id: "t", keys: "x", description: "Test", run: () => {} });
    expect(listShortcuts()).toHaveLength(1);
    off();
    expect(listShortcuts()).toHaveLength(0);
  });
});

describe("date picker logic", () => {
  test("month grid is 6 weeks starting Monday", () => {
    const g = monthGrid(2026, 9); // October 2026
    expect(g).toHaveLength(6);
    expect(g[0][0]).toBe("2026-09-28"); // Monday before Thu 1 Oct
    expect(g[0][3]).toBe("2026-10-01");
    expect(g[5][6]).toBe("2026-11-08");
  });
  test("addMonths clamps to month end", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-01-15", -2)).toBe("2025-11-15");
  });
  test("parses typed dates in common formats", () => {
    expect(parseDateInput("2026-12-25", "2026-10-22")).toBe("2026-12-25");
    expect(parseDateInput("25/12/2026", "2026-10-22")).toBe("2026-12-25");
    expect(parseDateInput("5-1-27", "2026-10-22")).toBe("2027-01-05");
    expect(parseDateInput("24 Dec", "2026-10-22")).toBe("2026-12-24");
    expect(parseDateInput("24 December 2027", "2026-10-22")).toBe("2027-12-24");
    expect(parseDateInput("31/02/2026", "2026-10-22")).toBeNull();
    expect(parseDateInput("hello", "2026-10-22")).toBeNull();
  });
  test("nights label", () => {
    expect(nightsLabel("2026-10-22", "2026-10-23")).toBe("1 night");
    expect(nightsLabel("2026-10-22", "2026-10-25")).toBe("3 nights");
  });
  test("time parsing", () => {
    expect(parseTimeInput("15:00")).toBe("15:00");
    expect(parseTimeInput("3pm")).toBe("15:00");
    expect(parseTimeInput("1530")).toBe("15:30");
    expect(parseTimeInput("12 am")).toBe("00:00");
    expect(parseTimeInput("9.30 am")).toBe("09:30");
    expect(parseTimeInput("25:00")).toBeNull();
    expect(parseTimeInput("13pm")).toBeNull();
    expect(timeSlots(30)).toHaveLength(48);
  });
});

describe("chart maths", () => {
  test("niceScale gives round maximums and ticks from zero", () => {
    expect(niceScale(94)).toEqual({ max: 100, step: 25, ticks: [0, 25, 50, 75, 100] });
    expect(niceScale(0).ticks).toEqual([0, 1]);
    expect(niceScale(7)).toEqual({ max: 8, step: 2, ticks: [0, 2, 4, 6, 8] });
    expect(niceScale(2300).max).toBe(3000);
    expect(niceScale(2300).ticks).toEqual([0, 1000, 2000, 3000]);
  });
  test("scaleLinear maps and inverts ranges", () => {
    const y = scaleLinear([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(y(100)).toBe(0);
  });
  test("linePath and slice angles", () => {
    expect(linePath([[0, 0], [10, 5]])).toBe("M0 0 L10 5");
    const a = sliceAngles([1, 1, 2]);
    expect(a[2][1]).toBeLessThan(Math.PI * 2 + 1e-9);
    expect(Math.round((a[1][1] - a[1][0]) * 1000)).toBe(Math.round((Math.PI / 2) * 1000));
  });
  test("donut path survives a single 100% slice", () => {
    expect(donutSlicePath(50, 50, 40, 25, 0, Math.PI * 2)).toContain("A40 40");
  });
});

describe("table logic", () => {
  const cols = [{ key: "name", label: "Name", sortable: true }, { key: "rate", label: "Rate", sortable: true }, { key: "type", label: "Type", sortable: true }];
  const rows = [
    { id: "1", name: "Room 10", rate: 8000, type: "PDLX" },
    { id: "2", name: "Room 2", rate: 7000, type: "GDLX" },
    { id: "3", name: "Room 1", rate: null, type: "GDLX" },
    { id: "4", name: "Suite", rate: 14500, type: "DLXS" },
  ];
  test("search needs every word, any column, case-insensitive", () => {
    expect(applyQuery(rows, cols, { search: "room gdlx" }).total).toBe(2);
    expect(applyQuery(rows, cols, { search: "SUITE" }).total).toBe(1);
    expect(applyQuery(rows, cols, { search: "nothing" }).total).toBe(0);
  });
  test("filters by exact value or custom match", () => {
    expect(applyQuery(rows, cols, { filters: { type: "GDLX" } }).total).toBe(2);
    expect(applyQuery(rows, cols, { filters: { rate: "high" } }, [{ key: "rate", match: (r, v) => v === "high" && r.rate > 10000 }]).total).toBe(1);
  });
  test("sorts numeric-aware with empty values always last", () => {
    expect(applyQuery(rows, cols, { sort: { key: "name", dir: "asc" } }).items.map((r) => r.name)).toEqual(["Room 1", "Room 2", "Room 10", "Suite"]);
    expect(applyQuery(rows, cols, { sort: { key: "rate", dir: "asc" } }).items.map((r) => r.rate)).toEqual([7000, 8000, 14500, null]);
    expect(applyQuery(rows, cols, { sort: { key: "rate", dir: "desc" } }).items.map((r) => r.rate)).toEqual([14500, 8000, 7000, null]);
  });
  test("paginates and clamps the page", () => {
    const r = applyQuery(rows, cols, { pageSize: 3, page: 2 });
    expect(r.items).toHaveLength(1);
    expect(r.pages).toBe(2);
    expect(applyQuery(rows, cols, { pageSize: 3, page: 99 }).page).toBe(2);
  });
  test("CSV quotes values and blocks spreadsheet formulas", () => {
    const csv = toCsv([{ key: "a", label: "A" }, { key: "b", label: "B" }], [{ a: 'He said "hi", ok', b: "=SUM(A1)" }, { a: "-12.5", b: "plain" }]);
    expect(csv).toBe('A,B\r\n"He said ""hi"", ok",\'=SUM(A1)\r\n-12.5,plain');
  });
});

describe("screen registry", () => {
  test("has every main screen of the build (51, RS-24 Service View added 2026-10-31) with unique codes and existing icons", () => {
    expect(SCREENS.length).toBe(51);
    expect(new Set(SCREENS.map((s) => s.code)).size).toBe(51);
    expect(SCREENS.every((s) => s.title && s.file.startsWith("/") && s.purpose)).toBe(true);
  });
  test("file names follow <code>-<name>.html in the right folder", () => {
    expect(screenByCode("RS-05")?.file).toBe("/reservation/rs-05-new-reservation/");
    expect(screenByCode("RSS-08")?.file).toBe("/setup/rss-08-rate-calendar/");
    expect(screenByCode("CM-01")?.file).toBe("/common/cm-01-login/");
  });
  test("unbuilt screens open the Coming-next placeholder with the code; static pages link to their page", () => {
    expect(screenUrl("RS-05")).toBe("/reservation/rs-05-new-reservation/");
    expect(screenUrl("RS-07", { id: "FK-10234" })).toBe("/reservation/rs-07-reservation-details/?id=FK-10234");
    expect(screenUrl("XX-99")).toBe("/common/coming-next/?code=XX-99");
  });
  test("sidebar labels are short and every nav screen belongs to a nav group", () => {
    expect(navLabel("RS-01")).toBe("Dashboard");
    const groups = new Set(NAV_GROUPS.flatMap((g) => g.groups));
    expect(SCREENS.filter((s) => s.nav).every((s) => groups.has(s.group))).toBe(true);
  });
  test("icons used by the registry exist in the sprite", async () => {
    const svg = await (await fetch("/assets/icons/sprite.svg")).text();
    const missing = [...new Set(SCREENS.map((s) => s.icon))].filter((i) => !svg.includes(`id="${i}"`));
    expect(missing).toEqual([]);
  });
});

describe("command palette", () => {
  test("empty query shows actions and screens", () => {
    const cmds = commandsFor("");
    expect(cmds.some((c) => c.label === "New reservation")).toBe(true);
    expect(cmds.filter((c) => c.section === "Screens").length).toBeGreaterThan(40);
  });
  test("finds screens by name or code", () => {
    expect(commandsFor("rate calendar").slice(0, 3).some((c) => c.hint === "RSS-08")).toBe(true);
    expect(commandsFor("rs05")[0].label).toContain("Reservation");
  });
  test("a booking number offers “Open booking” first", () => {
    const [first] = commandsFor("FK-10234");
    expect(first.label).toBe("Open booking FK-10234");
    expect(commandsFor("10234")[0].label).toBe("Open booking FK-10234");
  });
  test("any text can be searched across bookings and guests", () => {
    expect(commandsFor("Nathan").some((c) => c.id === "d-search")).toBe(true);
  });
});

describe("calendar grid helpers", () => {
  test("priceLevel spreads values over levels 0–4", () => {
    const lvl = priceLevel([100, 200, 300, 400, 500]);
    expect([100, 200, 300, 400, 500].map(lvl)).toEqual([0, 1, 2, 3, 4]);
    expect(priceLevel([5, 5])(5)).toBe(0);
  });
});

/* ───────── Colour contrast (WCAG AA) read straight from css/aviv/aviv.css ───────── */
/** @param {string} hex */
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** @param {string} a @param {string} b */
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("accessibility – colour contrast (AA 4.5:1 for text)", () => {
  /** The design system (css/aviv/aviv.css) has one light theme; its tokens live in the first :root block. */
  const loadTokens = async () => {
    const css = await (await fetch("/css/aviv/aviv.css")).text();
    const start = css.indexOf(":root {");
    const body = css.slice(start, css.indexOf("\n}", start));
    /** @type {Record<string, string>} */
    const tokens = {};
    for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
    for (let pass = 0; pass < 3; pass++) for (const k of Object.keys(tokens)) tokens[k] = tokens[k].replace(/var\(--([\w-]+)\)/g, (_, n) => tokens[n] ?? "");
    return tokens;
  };
  /** @type {Array<[string, string]>} text token, background token */
  const TEXT_PAIRS = [
    ["ink", "bg"], ["ink", "surface-2"], ["ink-2", "surface"], ["ink-2", "sunken"], ["ink-3", "surface"], ["ink-3", "surface-2"],
    ["ok", "surface"], ["warn", "surface"], ["bad", "surface"], ["info", "surface"],
    ["ok", "ok-bg"], ["warn", "warn-bg"], ["bad", "bad-bg"], ["info", "info-bg"],
  ];
  test("every text / background pair passes", async () => {
    const v = await loadTokens();
    const fails = TEXT_PAIRS.map(([fg, bg]) => ({ pair: `${fg} on ${bg}`, ratio: contrast(v[fg], v[bg]) })).filter((p) => !(p.ratio >= 4.5));
    expect(fails.map((f) => `${f.pair} = ${f.ratio.toFixed(2)}`)).toEqual([]);
  });
  test("white text on the primary fills (buttons, count badges) passes", async () => {
    const v = await loadTokens();
    expect(contrast("#ffffff", v["em-600"])).toBeGreaterThan(4.5);
    expect(contrast("#ffffff", v["em-800"])).toBeGreaterThan(4.5);
    expect(contrast("#ffffff", v["br-700"])).toBeGreaterThan(4.5);
  });
  test("primary fill is visible (≥3:1) on page and cards", async () => {
    const v = await loadTokens();
    expect(contrast(v["em-600"], v.bg)).toBeGreaterThan(3);
    expect(contrast(v["em-600"], v.surface)).toBeGreaterThan(3);
  });
  test("focus ring colour is visible (≥3:1) on page and card backgrounds", async () => {
    const v = await loadTokens();
    expect(contrast(v["br-500"], v.bg)).toBeGreaterThan(3);
    expect(contrast(v["br-500"], v.surface)).toBeGreaterThan(3);
  });
});

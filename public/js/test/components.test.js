// @ts-check
/** Components – behaviour in a real browser DOM (keyboard, ARIA, values). */
import { describe, test, expect } from "./runner.js";
import { initContext } from "../core/context.js";
import * as store from "../core/store.js";
import { _setDelayScale } from "../services/mock/util.js";
import * as notifications from "../services/mock/notifications.js";
import { button } from "../components/button.js";
import { field, textInput, select, checkbox, radioGroup, switchControl, currencyInput, phoneInput, numberStepper } from "../components/fields.js";
import { combobox, multiSelect } from "../components/combobox.js";
import { datePicker, dateRangePicker, timePicker, calendar } from "../components/datepicker.js";
import { tabs, stepper, accordion } from "../components/nav.js";
import { openDialog } from "../components/dialog.js";
import { toast } from "../components/toast.js";
import { setUiState } from "../core/prefs.js";
import { statusPill, avatar, moneyText, dateText, emptyState, keyValue, STATUS } from "../components/display.js";
import { dataTable } from "../components/table.js";
import { calendarGrid } from "../components/calendar-grid.js";
import { barChart, donutChart, sparkline } from "../components/charts.js";

await initContext();
const mount = (/** @type {Node} */ n) => { const box = document.createElement("div"); document.body.append(box); box.append(n); return box; };
const key = (/** @type {Element} */ el, /** @type {string} */ k, /** @type {KeyboardEventInit} */ o = {}) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...o }));
const wait = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

describe("components – fields", () => {
  test("field() links label, hint and error to the input for screen readers", () => {
    const f = field({ label: "Guest name", control: textInput(), hint: "As on ID", required: true });
    const box = mount(f.el);
    const input = /** @type {HTMLInputElement} */ (box.querySelector("input"));
    const label = /** @type {HTMLLabelElement} */ (box.querySelector("label"));
    expect(label.htmlFor).toBe(input.id);
    expect(input.getAttribute("aria-required")).toBe("true");
    expect(input.getAttribute("aria-describedby")?.split(" ").length).toBe(2);
    f.setError("Enter the guest name.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(box.querySelector(".field__error")?.textContent).toBe("Enter the guest name.");
    expect(/** @type {HTMLElement} */ (box.querySelector(".field__error")).hidden).toBe(false);
    f.setError("");
    expect(input.getAttribute("aria-invalid")).toBe("false");
    box.remove();
  });
  test("select, checkbox, radio, switch return and accept values", () => {
    const sel = select({ options: [{ value: "EP", label: "EP" }, { value: "CP", label: "CP" }], value: "CP" });
    expect(sel.getValue()).toBe("CP");
    sel.setValue("EP");
    expect(sel.getValue()).toBe("EP");
    const cb = checkbox({ label: "x", checked: true });
    expect(cb.getValue()).toBe(true);
    cb.setValue(false);
    expect(cb.getValue()).toBe(false);
    const rg = radioGroup({ name: "g1", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }], value: "a" });
    rg.setValue("b");
    expect(rg.getValue()).toBe("b");
    const sw = switchControl({ label: "on", checked: false });
    let seen = null;
    sw.onChange((v) => (seen = v));
    /** @type {HTMLElement} */ (sw.el).click();
    expect(sw.getValue()).toBe(true);
    expect(seen).toBe(true);
    expect(sw.el.getAttribute("aria-checked")).toBe("true");
  });
  test("currency input returns integer paise and formats on blur", () => {
    const c = currencyInput({ value: 799900 });
    const input = /** @type {HTMLInputElement} */ (c.input);
    expect(input.value).toBe("7,999");
    input.value = "1,23,456.50";
    input.dispatchEvent(new Event("input"));
    expect(c.getValue()).toBe(12345650);
    input.value = "abc";
    expect(c.getValue()).toBeNull();
    input.value = "12000";
    input.dispatchEvent(new Event("blur"));
    expect(input.value).toBe("12,000");
    input.value = "";
    expect(c.getValue()).toBeNull();
  });
  test("phone input keeps digits only and returns +91 style value", () => {
    const p = phoneInput({ value: "+44 7700 900123" });
    expect(p.getValue()).toBe("+44 7700 900123");
    const input = /** @type {HTMLInputElement} */ (p.input);
    input.value = "98a76-54";
    input.dispatchEvent(new Event("input"));
    expect(input.value).toBe("987654"); // letters and dashes removed
    const q = phoneInput();
    expect(q.getValue()).toBe("");
  });
  test("number stepper respects min / max and keyboard arrows", () => {
    const s = numberStepper({ label: "Adults", value: 2, min: 1, max: 3 });
    const [dec, inc] = /** @type {HTMLButtonElement[]} */ ([...s.el.querySelectorAll("button")]);
    inc.click(); inc.click();
    expect(s.getValue()).toBe(3);
    expect(inc.disabled).toBe(true);
    key(s.input, "ArrowDown");
    expect(s.getValue()).toBe(2);
    dec.click(); dec.click();
    expect(s.getValue()).toBe(1);
    expect(dec.disabled).toBe(true);
  });
  test("button shows a spinner while an async handler runs and ignores double clicks", async () => {
    let calls = 0;
    const b = button({ label: "Save", onclick: async () => { calls++; await wait(30); } });
    mount(b);
    b.click(); b.click();
    expect(b.getAttribute("aria-busy")).toBe("true");
    await wait(60);
    expect(b.getAttribute("aria-busy")).toBe("false");
    expect(calls).toBe(1);
  });
});

describe("components – combobox and multi-select (keyboard)", () => {
  const options = [{ value: "GDLX", label: "Garden Deluxe Room" }, { value: "PDLX", label: "Pool Deluxe Room" }, { value: "DLXS", label: "Deluxe Suite" }];
  test("opens, filters while typing, ↓ + Enter picks, ARIA state updates", () => {
    const c = combobox({ options });
    const box = mount(c.el);
    const input = /** @type {HTMLInputElement} */ (c.input);
    input.focus();
    input.click();
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("role")).toBe("combobox");
    input.value = "suite";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const list = /** @type {HTMLElement} */ (document.getElementById(/** @type {string} */ (input.getAttribute("aria-controls"))));
    expect(list.querySelectorAll('[role="option"]')).toHaveLength(1);
    key(input, "Enter");
    expect(c.getValue()).toBe("DLXS");
    expect(input.value).toBe("Deluxe Suite");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    box.remove();
  });
  test("Escape closes without choosing; blur restores the chosen label", () => {
    const c = combobox({ options, value: "GDLX" });
    const box = mount(c.el);
    const input = /** @type {HTMLInputElement} */ (c.input);
    input.focus(); input.click();
    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    key(input, "Escape");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    input.dispatchEvent(new Event("blur"));
    expect(input.value).toBe("Garden Deluxe Room");
    expect(c.getValue()).toBe("GDLX");
    box.remove();
  });
  test("multi-select adds chips, removes with Backspace and with the chip button", () => {
    const m = multiSelect({ options, values: ["GDLX"] });
    const box = mount(m.el);
    const input = /** @type {HTMLInputElement} */ (m.input);
    input.focus(); input.click();
    key(input, "ArrowDown");
    key(input, "Enter");
    expect(m.getValue().length).toBe(2);
    expect(box.querySelectorAll(".chip")).toHaveLength(2);
    key(input, "Backspace");
    expect(m.getValue()).toEqual(["GDLX"]);
    /** @type {HTMLElement} */ (box.querySelector(".chip__x")).click();
    expect(m.getValue()).toEqual([]);
    box.remove();
  });
});

describe("components – date pickers", () => {
  test("calendar: arrow keys move focus by day / week and PageDown by month", () => {
    const cal = calendar({ value: "2026-10-22", onPick: () => {} });
    const box = mount(cal);
    const focused = () => /** @type {HTMLElement} */ (box.querySelector('[tabindex="0"]')).dataset.date;
    expect(focused()).toBe("2026-10-22");
    key(/** @type {Element} */ (box.querySelector('[tabindex="0"]')), "ArrowRight");
    expect(focused()).toBe("2026-10-23");
    key(/** @type {Element} */ (box.querySelector('[tabindex="0"]')), "ArrowDown");
    expect(focused()).toBe("2026-10-30");
    key(/** @type {Element} */ (box.querySelector('[tabindex="0"]')), "PageDown");
    expect(focused()).toBe("2026-11-30");
    expect(box.querySelector(".cal__title")?.textContent).toBe("November 2026");
    box.remove();
  });
  test("calendar marks weekends, special dates and the business date", () => {
    const cal = calendar({ value: "2026-10-22", specialDates: new Map([["2026-10-24", "Peak"]]), onPick: () => {} });
    const box = mount(cal);
    expect(box.querySelector('[data-date="2026-10-24"]')?.classList.contains("is-weekend")).toBe(true);
    expect(box.querySelector('[data-date="2026-10-24"]')?.classList.contains("is-special")).toBe(true);
    expect(box.querySelectorAll(".is-today")).toHaveLength(1); // business date (today in tests = seeded real date)
    box.remove();
  });
  test("date input understands typed dates and rejects nonsense", () => {
    const d = datePicker({ value: "2026-10-22" });
    mount(d.el);
    const input = /** @type {HTMLInputElement} */ (d.input);
    expect(input.value).toBe("22 Oct 2026");
    input.value = "25/12/2026";
    input.dispatchEvent(new Event("change"));
    expect(d.getValue()).toBe("2026-12-25");
    expect(input.value).toBe("25 Dec 2026");
    input.value = "99/99/2026";
    input.dispatchEvent(new Event("change"));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(d.getValue()).toBe("2026-12-25");
  });
  test("range input shows nights and pushes check-out forward when check-in passes it", () => {
    const r = dateRangePicker({ from: "2026-10-22", to: "2026-10-25" });
    const box = mount(r.el);
    expect(box.querySelector(".range__nights")?.textContent).toBe("3 nights");
    const [from] = /** @type {HTMLInputElement[]} */ ([...box.querySelectorAll("input")]);
    from.value = "30 Oct 2026";
    from.dispatchEvent(new Event("change"));
    expect(r.getValue()).toEqual({ from: "2026-10-30", to: "2026-10-31", nights: 1 });
    box.remove();
  });
  test("time input understands 3pm and rejects 25:00", () => {
    const t = timePicker({ value: "15:00" });
    mount(t.el);
    const input = /** @type {HTMLInputElement} */ (t.input);
    input.value = "9.30 am";
    input.dispatchEvent(new Event("change"));
    expect(t.getValue()).toBe("09:30");
    input.value = "25:00";
    input.dispatchEvent(new Event("change"));
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("components – tabs, stepper, accordion", () => {
  test("tabs: ARIA roles, arrow keys switch, panels are built lazily", () => {
    let built = 0;
    const t = tabs({ label: "Sections", tabs: [
      { id: "a", label: "A", panel: () => { built++; return document.createTextNode("panel a"); } },
      { id: "b", label: "B", panel: () => { built++; return document.createTextNode("panel b"); } }] });
    const box = mount(t.el);
    const [ta, tb] = /** @type {HTMLElement[]} */ ([...box.querySelectorAll('[role="tab"]')]);
    expect(ta.getAttribute("aria-selected")).toBe("true");
    expect(built).toBe(1);
    key(ta, "ArrowRight");
    expect(tb.getAttribute("aria-selected")).toBe("true");
    expect(built).toBe(2);
    expect(/** @type {HTMLElement} */ (box.querySelectorAll('[role="tabpanel"]')[0]).hidden).toBe(true);
    key(tb, "Home");
    expect(t.selected()).toBe("a");
    box.remove();
  });
  test("stepper marks done / current / todo with text, not colour alone", () => {
    const box = mount(stepper({ steps: ["One", "Two", "Three"], current: 1 }));
    const items = [...box.querySelectorAll("li")];
    expect(items[0].textContent).toContain("(done)");
    expect(items[1].getAttribute("aria-current")).toBe("step");
    expect(items[2].classList.contains("is-todo")).toBe(true);
    box.remove();
  });
  test("accordion toggles aria-expanded and only one is open unless multiple", () => {
    const a = accordion({ items: [{ id: "1", title: "One", content: document.createTextNode("x"), open: true }, { id: "2", title: "Two", content: document.createTextNode("y") }] });
    const box = mount(a);
    const [h1, h2] = /** @type {HTMLElement[]} */ ([...box.querySelectorAll("button")]);
    expect(h1.getAttribute("aria-expanded")).toBe("true");
    h2.click();
    expect(h2.getAttribute("aria-expanded")).toBe("true");
    expect(h1.getAttribute("aria-expanded")).toBe("false");
    box.remove();
  });
});

describe("components – dialog and toast", () => {
  test("dialog opens modally, resolves with the clicked action and returns focus", async () => {
    const opener = button({ label: "Open" });
    mount(opener);
    opener.focus();
    const d = openDialog({ code: "T-DLG", title: "Cancel booking?", body: "Are you sure?", actions: [{ label: "No", value: "no" }, { label: "Yes", variant: "danger", value: "yes" }] });
    expect(d.el.open).toBe(true);
    expect(d.el.getAttribute("aria-labelledby")).toBeTruthy();
    expect(d.el.dataset.code).toBe("T-DLG");
    /** @type {HTMLElement} */ ([...d.el.querySelectorAll(".dialog__footer button")].at(-1)).click();
    expect(await d.result).toBe("yes");
    expect(document.querySelector('dialog[data-code="T-DLG"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
  test("Esc (cancel event) closes and resolves undefined; a beforeClose guard can keep it open", async () => {
    const d = openDialog({ title: "Edit", body: "x" });
    d.el.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(await d.result).toBe(undefined);
    let allow = false;
    const g = openDialog({ title: "Unsaved", body: "x", beforeClose: () => allow });
    g.el.dispatchEvent(new Event("cancel", { cancelable: true }));
    await wait(10);
    expect(g.el.open).toBe(true); // guard said no
    allow = true;
    await g.close();
    expect(g.el.open).toBe(false);
  });
  test("toast announces politely, errors assertively, Undo runs its action", async () => {
    let undone = false;
    const t = toast({ message: "Cancelled FK-10234", action: { label: "Undo", onClick: () => { undone = true; } } });
    expect(t.el.getAttribute("role")).toBe("status");
    /** @type {HTMLElement} */ (t.el.querySelector(".toast__action")).click();
    await wait(10);
    expect(undone).toBe(true);
    const e = toast({ message: "Failed", type: "error" });
    expect(e.el.getAttribute("role")).toBe("alert");
    e.dismiss();
    await wait(220);
    expect(e.el.isConnected).toBe(false);
  });
});

describe("components – display", () => {
  test("status pills always carry an icon and a text label", () => {
    for (const k of Object.keys(STATUS)) {
      const p = statusPill(/** @type {keyof typeof STATUS} */ (k));
      expect(p.querySelector("svg")).toBeTruthy();
      expect((p.textContent ?? "").trim().length).toBeGreaterThan(2);
    }
  });
  test("avatar initials and stable colour", () => {
    expect(avatar("Anita Mohan").textContent).toBe("AM");
    expect(avatar("Anita Mohan").getAttribute("style")).toBe(avatar("Anita Mohan").getAttribute("style"));
  });
  test("money and date text use tabular figures and Indian formats", () => {
    expect(moneyText(12345600).textContent).toBe("₹1,23,456");
    expect(moneyText(12345600).classList.contains("num")).toBe(true);
    expect(dateText("2026-10-22").textContent).toBe("22 Oct 2026");
  });
  test("empty state has a heading, a decorative image and one action", () => {
    const e = emptyState({ title: "Nothing yet", message: "Add one", action: { label: "Add", onClick: () => {} } });
    expect(e.querySelector("h3")?.textContent).toBe("Nothing yet");
    expect(e.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(e.querySelectorAll("button")).toHaveLength(1);
  });
  test("key-value renders a definition list", () => {
    const kv = keyValue([["Guest", "Priya"], ["Room", null]]);
    expect(kv.tagName).toBe("DL");
    expect(kv.textContent).toContain("–");
  });
  test("charts carry an accessible summary", () => {
    const bar = barChart({ label: "Occupancy", data: [{ label: "Mon", value: 60 }] });
    expect(bar.querySelector("svg")?.getAttribute("aria-label")).toContain("Mon 60");
    const donut = donutChart({ label: "Sources", slices: [{ label: "OTA", value: 1 }, { label: "Direct", value: 3 }] });
    expect(donut.querySelector("svg")?.getAttribute("aria-label")).toContain("Direct 75%");
    expect(sparkline([1, 2, 3]).getAttribute("role")).toBe("img");
  });
});

describe("components – DataTable", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ id: `r${i + 1}`, room: String(100 + i), type: i % 2 ? "PDLX" : "GDLX", rate: 7000 + i * 100 }));
  const make = (/** @type {Partial<import("../components/table.js").TableOptions>} */ extra = {}) =>
    dataTable({ id: `test-${Math.random()}`, label: "Rooms", rows, pageSize: 10, selectable: true, exportName: "rooms",
      filters: [{ key: "type", label: "Types", options: [{ value: "GDLX", label: "GDLX" }, { value: "PDLX", label: "PDLX" }] }],
      columns: [{ key: "room", label: "Room", sortable: true, required: true }, { key: "type", label: "Type", sortable: true }, { key: "rate", label: "Rate", sortable: true, align: "right" }], ...extra });
  const bodyRows = (/** @type {HTMLElement} */ el) => [...el.querySelectorAll("tbody tr")];

  test("renders a labelled table page by page with counts", async () => {
    const t = make();
    mount(t.el);
    await wait(20);
    expect(bodyRows(t.el)).toHaveLength(10);
    expect(t.el.querySelector(".dt__count")?.textContent).toBe("1–10 of 30");
    expect(t.el.querySelector("table")?.getAttribute("aria-label")).toBe("Rooms");
    t.el.remove();
  });
  test("sorting cycles asc → desc → none and sets aria-sort", async () => {
    const t = make();
    mount(t.el);
    await wait(20);
    const sortBtn = () => /** @type {HTMLElement} */ (t.el.querySelectorAll(".dt__sort")[2]);
    sortBtn().click(); await wait(10);
    expect(t.el.querySelectorAll("th")[3].getAttribute("aria-sort")).toBe("ascending");
    sortBtn().click(); await wait(10);
    expect(t.el.querySelectorAll("th")[3].getAttribute("aria-sort")).toBe("descending");
    expect(bodyRows(t.el)[0].textContent).toContain("9900"); // highest rate first when descending
    t.el.remove();
  });
  test("search and filter narrow the rows; a no-match state offers to clear", async () => {
    const t = make();
    mount(t.el);
    await wait(20);
    const search = /** @type {HTMLInputElement} */ (t.el.querySelector(".dt__search"));
    search.value = "pdlx 129";
    search.dispatchEvent(new Event("input"));
    await wait(260);
    expect(t.el.querySelector(".dt__count")?.textContent).toBe("1–1 of 1");
    search.value = "zzz";
    search.dispatchEvent(new Event("input"));
    await wait(260);
    expect(t.el.querySelector(".empty__title")?.textContent).toBe("Nothing matches");
    /** @type {HTMLElement} */ (t.el.querySelector(".empty .btn")).click();
    await wait(20);
    expect(t.el.querySelector(".dt__count")?.textContent).toBe("1–10 of 30");
    const sel = /** @type {HTMLSelectElement} */ (t.el.querySelector(".dt__filter"));
    sel.value = "GDLX";
    sel.dispatchEvent(new Event("change"));
    await wait(20);
    expect(t.el.querySelector(".dt__count")?.textContent).toBe("1–10 of 15");
    t.el.remove();
  });
  test("selection survives paging; bulk bar shows the count", async () => {
    const t = make();
    mount(t.el);
    await wait(20);
    /** @type {HTMLInputElement} */ (t.el.querySelector("tbody input[type=checkbox]")).click();
    /** @type {HTMLElement} */ ([...t.el.querySelectorAll(".dt__pager button")].at(-1)).click();
    await wait(20);
    /** @type {HTMLInputElement} */ (t.el.querySelector("tbody input[type=checkbox]")).click();
    expect(t.el.querySelector(".dt__bulk-count")?.textContent).toBe("2 selected");
    expect(t.getSelected().map((r) => r.id)).toEqual(["r1", "r11"]);
    t.clearSelection();
    expect(/** @type {HTMLElement} */ (t.el.querySelector(".dt__bulk")).hidden).toBe(true);
    t.el.remove();
  });
  test("async load mode shows a skeleton, then rows; an error shows Try again", async () => {
    let fail = true;
    const t = dataTable({ id: `test-load-${Math.random()}`, label: "Remote", columns: [{ key: "room", label: "Room" }],
      load: async () => { await wait(30); if (fail) throw new Error("boom"); return { items: rows.slice(0, 3), total: 3 }; } });
    mount(t.el);
    expect(t.el.querySelectorAll(".dt__row--skeleton").length).toBeGreaterThan(0);
    const original = console.error;
    console.error = () => {}; // the failure is expected
    await wait(70);
    console.error = original;
    expect(t.el.querySelector(".empty__title")?.textContent).toBe("Something went wrong");
    fail = false;
    /** @type {HTMLElement} */ (t.el.querySelector(".empty .btn")).click();
    await wait(80);
    expect(bodyRows(t.el)).toHaveLength(3);
    t.el.remove();
  });
  test("empty table shows the supplied empty state", async () => {
    const t = dataTable({ id: `test-empty-${Math.random()}`, label: "Nothing", rows: [], columns: [{ key: "a", label: "A" }], empty: { title: "No rooms", message: "Add your first room" } });
    mount(t.el);
    await wait(20);
    expect(t.el.querySelector(".empty__title")?.textContent).toBe("No rooms");
    t.el.remove();
  });
  test("rows with a click handler are keyboard reachable (Enter)", async () => {
    let opened = "";
    const t = make({ onRowClick: (r) => { opened = r.id; } });
    mount(t.el);
    await wait(20);
    const tr = /** @type {HTMLElement} */ (bodyRows(t.el)[2]);
    expect(tr.tabIndex).toBe(0);
    tr.focus();
    key(tr, "Enter");
    expect(opened).toBe("r3");
    t.el.remove();
  });
  test("column chooser hides a column and remembers it", async () => {
    const id = `test-cols-${Math.random()}`;
    const mk = () => dataTable({ id, label: "R", rows, pageSize: 5, columns: [{ key: "room", label: "Room", required: true }, { key: "type", label: "Type" }] });
    const t = mk();
    mount(t.el);
    await wait(20);
    /** @type {HTMLElement} */ ([...t.el.querySelectorAll(".dt__toolbar button")].find((b) => b.textContent?.includes("Columns"))).click();
    const boxes = /** @type {HTMLInputElement[]} */ ([...document.querySelectorAll('.menu input[type="checkbox"]')]);
    expect(boxes[0].disabled).toBe(true); // required
    boxes[1].click();
    expect(t.el.querySelectorAll("thead th")).toHaveLength(1);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    t.el.remove();
    const again = mk();
    mount(again.el);
    await wait(20);
    expect(again.el.querySelectorAll("thead th")).toHaveLength(1);
    again.el.remove();
    setUiState(`table.${id}.hidden`, undefined); // do not leave test data in the saved UI state
  });
});

describe("components – calendar grid", () => {
  const rowsG = [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C", sub: "derived" }];
  const mkGrid = (/** @type {(s: any) => void} */ onSelect) =>
    calendarGrid({ label: "Rates", rows: rowsG, start: "2026-10-22", days: 7, renderCell: (r, d) => `${r.id}${d.slice(8)}`, isReadOnly: (r) => r.id === "c", onSelect });
  test("renders rows × days with a column header per date and a today marker", () => {
    const g = mkGrid(() => {});
    const box = mount(g.el);
    expect(box.querySelectorAll('[role="columnheader"]').length).toBe(8);
    expect(box.querySelectorAll(".cg__cell")).toHaveLength(21);
    expect(box.querySelectorAll('.cg__colhead.is-today').length).toBeLessThan(2);
    box.remove();
  });
  test("Shift+arrows extend a block; Enter reports rows and dates", () => {
    /** @type {any} */ let got = null;
    const g = mkGrid((s) => { got = s; });
    const box = mount(g.el);
    const first = /** @type {HTMLElement} */ (box.querySelector('.cg__cell[data-r="0"][data-c="0"]'));
    first.focus();
    key(first, "ArrowRight", { shiftKey: true });
    const second = /** @type {HTMLElement} */ (box.querySelector('.cg__cell[data-r="0"][data-c="1"]'));
    key(second, "ArrowDown", { shiftKey: true });
    const third = /** @type {HTMLElement} */ (box.querySelector('.cg__cell[data-r="1"][data-c="1"]'));
    key(third, "Enter");
    expect(got).toEqual({ rowIds: ["a", "b"], from: "2026-10-22", to: "2026-10-23" });
    expect(box.querySelectorAll(".cg__cell.is-selected")).toHaveLength(4);
    key(third, "Escape");
    expect(box.querySelectorAll(".cg__cell.is-selected")).toHaveLength(0);
    box.remove();
  });
  test("read-only cells cannot start a drag selection", () => {
    /** @type {any} */ let got = null;
    const g = mkGrid((s) => { got = s; });
    const box = mount(g.el);
    const ro = /** @type {HTMLElement} */ (box.querySelector('.cg__cell[data-r="2"][data-c="0"]'));
    expect(ro.getAttribute("aria-readonly")).toBe("true");
    ro.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointerup"));
    expect(got).toBeNull();
    box.remove();
  });
  test("mouse drag selects a rectangle", () => {
    /** @type {any} */ let got = null;
    const g = mkGrid((s) => { got = s; });
    const box = mount(g.el);
    const c = (/** @type {number} */ r, /** @type {number} */ col) => /** @type {HTMLElement} */ (box.querySelector(`.cg__cell[data-r="${r}"][data-c="${col}"]`));
    c(0, 1).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    c(1, 3).dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointerup"));
    expect(got).toEqual({ rowIds: ["a", "b"], from: "2026-10-23", to: "2026-10-25" });
    box.remove();
  });
});

describe("services – notifications", () => {
  test("list newest first; unread count; approvals and arrivals come from the real data; mark one / all read", async () => {
    _setDelayScale(0);
    store._useKeyForTests("avivpms.test2");
    store._dropForTests();
    const list = await notifications.listNotifications();
    expect(list).toHaveLength(5);
    expect(list[0].at >= list.at(-1)?.at).toBe(true);
    const before = await notifications.navCounts();
    expect(before.unread).toBe(3);
    expect(before.approvals).toBe(3); // two pending requests + one escalated
    expect(before.arrivals).toBe(18); // today's arrivals in the demo data
    await notifications.markNotificationRead("ntf-1");
    expect((await notifications.navCounts()).unread).toBe(2);
    expect((await notifications.navCounts()).approvals).toBe(3); // still waiting for a decision
    await notifications.markAllNotificationsRead();
    expect((await notifications.navCounts()).unread).toBe(0);
    await expect(() => notifications.markNotificationRead("nope")).rejects("NOT_FOUND");
    store._dropForTests();
    store._useKeyForTests("avivpms.v1");
    _setDelayScale(1);
  });
});

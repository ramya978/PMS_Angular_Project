// @ts-check
/**
 * Calendar grid for the Rate Calendar and the Room Calendar: rows (room types / rooms) × date columns.
 * Sticky header and first column, weekend and special-date shading, today marker (business date),
 * drag-select (mouse) or Shift+arrows (keyboard) to pick a block of cells, roving tabindex keyboard navigation.
 */
import { h } from "../core/dom.js";
import { addDays, dateRange, formatDateShort, weekday } from "../core/format.js";
import { businessDate } from "../core/context.js";

/**
 * @typedef {Object} GridRow
 * @property {string} id
 * @property {string} label
 * @property {string} [sub]
 * @property {string} [group]  rows with the same group are shown under one group heading
 *
 * @typedef {Object} GridOptions
 * @property {string} label                 accessible name
 * @property {GridRow[]} rows
 * @property {string} start                 first date (ISO)
 * @property {number} days                  how many date columns
 * @property {(row: GridRow, date: string) => Node | string | null} renderCell
 * @property {(row: GridRow, date: string) => string} [cellClass]
 * @property {(row: GridRow, date: string) => boolean} [isReadOnly]  read-only cells cannot be selected (e.g. derived rates)
 * @property {Map<string, string>} [specialDates]
 * @property {(sel: { rowIds: string[], from: string, to: string }) => void} [onSelect]  fired when a block is chosen
 * @property {(row: GridRow, date: string, ev: Event) => void} [onCellClick]
 * @property {string} [cellWidth]
 */

/**
 * @param {GridOptions} o
 * @returns {{ el: HTMLElement, setRange: (start: string, days: number) => void, clearSelection: () => void, getSelection: () => { rowIds: string[], from: string, to: string } | null, repaint: () => void }}
 */
export function calendarGrid(o) {
  let start = o.start;
  let days = o.days;
  /** @type {{ r0: number, r1: number, c0: number, c1: number } | null} */
  let sel = null;
  let anchor = /** @type {{ r: number, c: number } | null} */ (null);
  let dragging = false;
  let focus = { r: 0, c: 0 };
  const root = h("div", { class: "cg", attrs: { role: "grid", "aria-label": o.label, "aria-rowcount": o.rows.length + 1 } });
  const scroller = h("div", { class: "cg__scroll", style: `--cg-w:${o.cellWidth ?? "76px"}` });
  root.append(scroller);

  const dates = () => dateRange(start, addDays(start, days));
  const today = () => businessDate();

  function paint() {
    const ds = dates();
    const t = today();
    scroller.textContent = "";
    scroller.style.setProperty("--cg-cols", String(ds.length));
    const header = h("div", { class: "cg__row cg__row--head", attrs: { role: "row" } },
      h("div", { class: "cg__corner", attrs: { role: "columnheader" } }, "Room type / rate plan"),
      ds.map((d) => {
        const wd = weekday(d);
        return h("div", { class: `cg__colhead${wd === 0 || wd === 6 ? " is-weekend" : ""}${d === t ? " is-today" : ""}${o.specialDates?.has(d) ? " is-special" : ""}`, attrs: { role: "columnheader", title: o.specialDates?.get(d) ?? null } },
          h("span", { class: "cg__dow" }, formatDateShort(d).split(" ")[0]),
          h("span", { class: "cg__dom num" }, String(Number(d.slice(8)))),
          h("span", { class: "cg__mon" }, formatDateShort(d).split(" ")[2]));
      }));
    scroller.append(header);

    let lastGroup = "";
    o.rows.forEach((row, r) => {
      if (row.group && row.group !== lastGroup) {
        lastGroup = row.group;
        scroller.append(h("div", { class: "cg__group", attrs: { role: "row" } }, h("div", { class: "cg__group-label", attrs: { role: "rowheader" } }, row.group)));
      }
      scroller.append(
        h("div", { class: "cg__row", attrs: { role: "row", "aria-rowindex": r + 2 } },
          h("div", { class: "cg__rowhead", attrs: { role: "rowheader" } }, h("span", { class: "cg__rowlabel" }, row.label), row.sub ? h("span", { class: "cg__rowsub" }, row.sub) : null),
          ds.map((d, c) => {
            const wd = weekday(d);
            const ro = o.isReadOnly?.(row, d) ?? false;
            const inSel = sel && r >= sel.r0 && r <= sel.r1 && c >= sel.c0 && c <= sel.c1;
            const cell = h("div", {
              class: `cg__cell${wd === 0 || wd === 6 ? " is-weekend" : ""}${d === t ? " is-today" : ""}${o.specialDates?.has(d) ? " is-special" : ""}${ro ? " is-readonly" : ""}${inSel ? " is-selected" : ""} ${o.cellClass?.(row, d) ?? ""}`,
              dataset: { r: String(r), c: String(c), date: d, row: row.id },
              tabindex: r === focus.r && c === focus.c ? 0 : -1,
              attrs: { role: "gridcell", "aria-colindex": c + 2, "aria-selected": inSel ? "true" : null, "aria-readonly": ro ? "true" : null },
            }, o.renderCell(row, d));
            return cell;
          })));
    });
  }

  /** @param {number} r @param {number} c */
  const cellAt = (r, c) => /** @type {HTMLElement | null} */ (scroller.querySelector(`.cg__cell[data-r="${r}"][data-c="${c}"]`));

  function select(/** @type {number} */ r0, /** @type {number} */ c0, /** @type {number} */ r1, /** @type {number} */ c1) {
    sel = { r0: Math.min(r0, r1), r1: Math.max(r0, r1), c0: Math.min(c0, c1), c1: Math.max(c0, c1) };
    scroller.querySelectorAll(".cg__cell").forEach((el) => {
      const e = /** @type {HTMLElement} */ (el);
      const r = Number(e.dataset.r), c = Number(e.dataset.c);
      const on = !!sel && r >= sel.r0 && r <= sel.r1 && c >= sel.c0 && c <= sel.c1;
      e.classList.toggle("is-selected", on);
      if (on) e.setAttribute("aria-selected", "true"); else e.removeAttribute("aria-selected");
    });
  }

  const current = () => {
    if (!sel) return null;
    const ds = dates();
    return { rowIds: o.rows.slice(sel.r0, sel.r1 + 1).map((x) => x.id), from: ds[sel.c0], to: ds[sel.c1] };
  };
  const finish = () => {
    const s = current();
    if (s && o.onSelect) o.onSelect(s);
  };

  /** @param {Event} ev */
  const cellFromEvent = (ev) => /** @type {HTMLElement | null} */ ((/** @type {HTMLElement} */ (ev.target)).closest?.(".cg__cell"));

  scroller.addEventListener("pointerdown", (ev) => {
    const el = cellFromEvent(ev);
    if (!el || el.classList.contains("is-readonly")) return;
    dragging = true;
    anchor = { r: Number(el.dataset.r), c: Number(el.dataset.c) };
    focus = { ...anchor };
    select(anchor.r, anchor.c, anchor.r, anchor.c);
  });
  scroller.addEventListener("pointerover", (ev) => {
    if (!dragging || !anchor) return;
    const el = cellFromEvent(ev);
    if (el) select(anchor.r, anchor.c, Number(el.dataset.r), Number(el.dataset.c));
  });
  window.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    finish();
  });
  scroller.addEventListener("click", (ev) => {
    const el = cellFromEvent(ev);
    if (el && o.onCellClick) o.onCellClick(o.rows[Number(el.dataset.r)], el.dataset.date ?? "", ev);
  });

  scroller.addEventListener("keydown", (ev) => {
    const el = cellFromEvent(ev);
    if (!el) return;
    const r = Number(el.dataset.r), c = Number(el.dataset.c);
    const delta = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[/** @type {"ArrowLeft"} */ (ev.key)];
    if (delta) {
      ev.preventDefault();
      const nr = Math.min(o.rows.length - 1, Math.max(0, r + delta[0]));
      const nc = Math.min(days - 1, Math.max(0, c + delta[1]));
      if (ev.shiftKey) {
        anchor ??= { r, c };
        select(anchor.r, anchor.c, nr, nc);
      } else anchor = null;
      cellAt(r, c)?.setAttribute("tabindex", "-1");
      focus = { r: nr, c: nc };
      const next = cellAt(nr, nc);
      next?.setAttribute("tabindex", "0");
      next?.focus();
    } else if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      if (!sel) select(r, c, r, c);
      finish();
    } else if (ev.key === "Escape") {
      clear();
    }
  });

  function clear() {
    sel = null;
    anchor = null;
    scroller.querySelectorAll(".cg__cell.is-selected").forEach((e) => { e.classList.remove("is-selected"); e.removeAttribute("aria-selected"); });
  }

  paint();
  return {
    el: root,
    setRange(s, d) { start = s; days = d; sel = null; focus = { r: 0, c: 0 }; paint(); },
    clearSelection: clear,
    getSelection: current,
    repaint: paint,
  };
}

/**
 * Colour level 0–4 for a value inside a set (used to shade rate cells from cheapest to dearest).
 * @param {number[]} values
 * @returns {(v: number) => number}
 */
export function priceLevel(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  const min = Math.min(...nums), max = Math.max(...nums);
  return (v) => (max === min ? 0 : Math.min(4, Math.floor(((v - min) / (max - min)) * 5)));
}

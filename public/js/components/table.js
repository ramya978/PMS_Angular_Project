// @ts-check
/**
 * DataTable: search, filters, sort, column chooser, saved views, sticky header, row selection, pagination, CSV export,
 * loading skeleton, empty state and error-with-retry. Works on in-memory rows (`rows`) or a service call (`load`).
 */
import { h } from "../core/dom.js";
import { getUiState, setUiState } from "../core/prefs.js";
import { icon } from "./icons.js";
import { button } from "./button.js";
import { openPopover } from "./overlay.js";
import { emptyState, errorState } from "./display.js";
import { toast } from "./toast.js";
import { openExportOptions } from "./export-options.js";
import { applyQuery, cellText, toCsv } from "./table-logic.js";
import { nextId } from "./fields.js";

/** @typedef {import("./table-logic.js").Column} Column */

/**
 * @typedef {Object} TableOptions
 * @property {string} id                      stable id – saved views and chosen columns are remembered under it
 * @property {string} label                   accessible name of the table
 * @property {Column[]} columns
 * @property {any[]} [rows]                   in-memory rows
 * @property {(q: import("./table-logic.js").Query) => Promise<{ items: any[], total: number }>} [load]  server-style loading
 * @property {(row: any) => string} [getRowId]
 * @property {number} [pageSize]
 * @property {boolean} [selectable]
 * @property {string} [searchPlaceholder]
 * @property {Array<{ key: string, label: string, options: Array<{ value: string, label: string }>, match?: (row: any, value: string) => boolean }>} [filters]
 * @property {Array<{ label: string, icon?: string, onClick: (rows: any[]) => void }>} [bulkActions]
 * @property {(row: any) => void} [onRowClick]
 * @property {string} [exportName]            enables CSV export (file name without .csv)
 * @property {{ title: string, message?: string, action?: { label: string, onClick?: () => void, href?: string } }} [empty]
 * @property {Node[]} [toolbar]               extra controls placed in the toolbar
 * @property {{ key: string, dir: "asc" | "desc" } | null} [sort]
 */

/**
 * @param {TableOptions} o
 */
export function dataTable(o) {
  const uiKey = (/** @type {string} */ s) => `table.${o.id}.${s}`;
  const getId = o.getRowId ?? ((/** @type {any} */ r) => String(r.id));
  const hiddenSaved = /** @type {string[] | undefined} */ (getUiState(uiKey("hidden")));
  const state = {
    search: "",
    filters: /** @type {Record<string, string>} */ ({}),
    sort: o.sort ?? null,
    page: 1,
    pageSize: o.pageSize ?? 25,
    hidden: new Set(hiddenSaved ?? o.columns.filter((c) => c.hidden).map((c) => c.key)),
    selected: new Set(/** @type {string[]} */ ([])),
    /** rows ever selected, by id (so selections survive paging) */
    cache: new Map(/** @type {Array<[string, any]>} */ ([])),
    status: /** @type {"loading" | "ready" | "error"} */ ("loading"),
    rows: o.rows ?? [],
    pageRows: /** @type {any[]} */ ([]),
    total: 0,
    filteredRows: /** @type {any[]} */ ([]),
  };
  const root = h("div", { class: "dt", dataset: { table: o.id } });
  const toolbar = h("div", { class: "dt__toolbar" });
  const bulk = h("div", { class: "dt__bulk", attrs: { hidden: true, role: "status" } });
  const scroller = h("div", { class: "dt__scroll", attrs: { tabindex: "0", role: "region", "aria-label": `${o.label} (scrollable)` } });
  const footer = h("div", { class: "dt__footer" });
  root.append(toolbar, bulk, scroller, footer);

  const visibleCols = () => o.columns.filter((c) => !state.hidden.has(c.key));

  const selectedRows = () => [...state.selected].map((id) => state.cache.get(id)).filter(Boolean);

  /* ── data ── */
  async function refresh() {
    state.status = "loading";
    paint();
    try {
      if (o.load) {
        const r = await o.load({ search: state.search, filters: state.filters, sort: state.sort, page: state.page, pageSize: state.pageSize });
        state.pageRows = r.items;
        state.total = r.total;
        state.filteredRows = r.items;
      } else {
        const r = applyQuery(state.rows, o.columns, { search: state.search, filters: state.filters, sort: state.sort, page: state.page, pageSize: state.pageSize }, o.filters);
        state.pageRows = r.items;
        state.total = r.total;
        state.page = r.page;
        state.filteredRows = r.filtered;
      }
      state.status = "ready";
    } catch (err) {
      console.error("Table failed to load", err);
      state.status = "error";
    }
    paint();
  }

  /* ── toolbar ── */
  const searchInput = h("input", { class: "field__input dt__search", type: "search", placeholder: o.searchPlaceholder ?? "Search…", attrs: { "aria-label": `Search ${o.label}`, autocomplete: "off" } });
  let searchTimer = 0;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => { state.search = searchInput.value; state.page = 1; void refresh(); }, 180);
  });
  const filterEls = (o.filters ?? []).map((f) => {
    const sel = h("select", { class: "field__input field__input--select dt__filter", attrs: { "aria-label": `Filter by ${f.label}` } },
      h("option", { value: "" }, `All ${f.label.toLowerCase()}`), f.options.map((op) => h("option", { value: op.value }, op.label)));
    sel.addEventListener("change", () => { state.filters[f.key] = sel.value; state.page = 1; void refresh(); });
    return { key: f.key, sel };
  });

  const colBtn = button({ label: "Columns", icon: "columns", onclick: () => openColumnChooser(colBtn) });
  const viewsBtn = button({ label: "Views", icon: "eye", onclick: () => openViews(viewsBtn) });
  const exportBtn = o.exportName ? button({ label: "Export / print", icon: "download", onclick: () => void exportCsv() }) : null;
  toolbar.append(
    h("div", { class: "dt__search-wrap" }, icon("search", { class: "field__icon" }), searchInput),
    ...filterEls.map((f) => f.sel),
    ...(o.toolbar ?? []),
    h("div", { class: "dt__spacer" }), viewsBtn, colBtn, exportBtn);

  function openColumnChooser(/** @type {HTMLElement} */ anchor) {
    const box = h("div", { class: "menu", attrs: { role: "group", "aria-label": "Choose columns" } },
      h("div", { class: "menu__title" }, "Show columns"),
      o.columns.map((c) => {
        const id = nextId("col");
        const cb = h("input", { type: "checkbox", id, checked: !state.hidden.has(c.key), disabled: !!c.required });
        cb.addEventListener("change", () => {
          if (cb.checked) state.hidden.delete(c.key); else state.hidden.add(c.key);
          setUiState(uiKey("hidden"), [...state.hidden]);
          paint();
        });
        return h("label", { class: "menu__check", attrs: { for: id } }, cb, c.label);
      }));
    openPopover({ anchor, content: box, label: "Choose columns" });
  }

  function openViews(/** @type {HTMLElement} */ anchor) {
    /** @type {Array<{ name: string, search: string, filters: Record<string, string>, sort: any, hidden: string[] }>} */
    let views = getUiState(uiKey("views"), []);
    const nameInput = h("input", { class: "field__input", type: "text", placeholder: "Name this view", attrs: { "aria-label": "View name" } });
    const list = h("ul", { class: "menu__list" });
    const draw = () => {
      list.textContent = "";
      if (!views.length) list.append(h("li", { class: "menu__empty" }, "No saved views yet."));
      views.forEach((v, i) =>
        list.append(h("li", { class: "menu__row" },
          h("button", { class: "menu__item", type: "button", onclick: () => { apply(v); pop.close(); } }, v.name),
          h("button", { class: "btn btn--ghost btn--icon", type: "button", attrs: { "aria-label": `Delete view ${v.name}` }, onclick: () => { views.splice(i, 1); setUiState(uiKey("views"), views); draw(); } }, icon("trash")))));
    };
    const save = () => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.setAttribute("aria-invalid", "true"); nameInput.focus(); return; }
      views = [...views.filter((v) => v.name !== name), { name, search: state.search, filters: { ...state.filters }, sort: state.sort, hidden: [...state.hidden] }];
      setUiState(uiKey("views"), views);
      toast({ message: `View “${name}” saved` });
      pop.close();
    };
    draw();
    const pop = openPopover({
      anchor, label: "Saved views",
      content: h("div", { class: "menu" }, h("div", { class: "menu__title" }, "Saved views"), list,
        h("div", { class: "menu__save" }, nameInput, button({ label: "Save current", variant: "primary", onclick: save }))),
    });
  }

  /** @param {{ search: string, filters: Record<string, string>, sort: any, hidden: string[] }} v */
  function apply(v) {
    state.search = v.search;
    state.filters = { ...v.filters };
    state.sort = v.sort;
    state.hidden = new Set(v.hidden);
    state.page = 1;
    searchInput.value = v.search;
    filterEls.forEach((f) => { f.sel.value = state.filters[f.key] ?? ""; });
    void refresh();
  }

  /** Opens Export / Print Options (CM-P08) for what is on the screen (the filtered list, or the ticked rows). */
  function exportCsv() {
    return openExportOptions({ title: o.label, fileName: o.exportName, columns: visibleCols(), rows: o.load ? state.pageRows : state.filteredRows, selectedRows: selectedRows() });
  }

  /* ── table body ── */
  function paint() {
    scroller.textContent = "";
    const cols = visibleCols();
    if (state.status === "error") {
      scroller.append(errorState({ onRetry: () => void refresh() }));
      footer.textContent = "";
      return;
    }
    const thead = h("thead", {}, h("tr", {},
      o.selectable ? h("th", { class: "dt__check", scope: "col" }, headerCheckbox()) : null,
      cols.map((c) => {
        const sorted = state.sort?.key === c.key ? state.sort.dir : null;
        return h("th", {
          scope: "col", class: `dt__th dt__th--${c.align ?? "left"}`, attrs: { "aria-sort": sorted ? (sorted === "asc" ? "ascending" : "descending") : c.sortable ? "none" : null, style: c.width ? `width:${c.width}` : null },
        }, c.sortable
          ? h("button", { class: "dt__sort", type: "button", onclick: () => toggleSort(c.key) }, c.label, icon(sorted === "asc" ? "arrow-up" : sorted === "desc" ? "arrow-down" : "arrow-up-down", { size: 14, class: sorted ? "is-on" : "" }))
          : c.label);
      })));
    const tbody = h("tbody");
    if (state.status === "loading") {
      for (let i = 0; i < Math.min(state.pageSize, 6); i++) {
        tbody.append(h("tr", { class: "dt__row dt__row--skeleton" }, o.selectable ? h("td", {}) : null,
          cols.map(() => h("td", {}, h("div", { class: "skeleton skeleton--line", attrs: { style: "width:70%" } })))));
      }
    } else {
      state.pageRows.forEach((row, i) => {
        const id = getId(row);
        const tr = h("tr", { class: `dt__row${state.selected.has(id) ? " is-selected" : ""}${o.onRowClick ? " is-clickable" : ""}`, dataset: { rowId: id }, attrs: { style: `--i:${Math.min(i, 12)}` } },
          o.selectable ? h("td", { class: "dt__check" }, rowCheckbox(row)) : null,
          cols.map((c) => {
            const v = c.render ? c.render(row) : cellText(c, row);
            return h("td", { class: `dt__td dt__td--${c.align ?? "left"}${c.align === "right" ? " num" : ""}` }, v);
          }));
        if (o.onRowClick) {
          tr.tabIndex = 0;
          tr.addEventListener("click", (ev) => { if (!(/** @type {HTMLElement} */ (ev.target)).closest("a, button, input, select, label")) o.onRowClick?.(row); });
          tr.addEventListener("keydown", (ev) => { if ((ev.key === "Enter" || ev.key === " ") && ev.target === tr) { ev.preventDefault(); o.onRowClick?.(row); } });
        }
        tbody.append(tr);
      });
    }
    scroller.append(h("table", { class: "dt__table", attrs: { "aria-label": o.label, "aria-busy": String(state.status === "loading") } }, thead, tbody));
    if (state.status === "ready" && !state.pageRows.length) {
      const filtered = !!state.search || Object.values(state.filters).some(Boolean);
      scroller.append(filtered
        ? emptyState({ kind: "search", title: "Nothing matches", message: "Try a different search or clear the filters.", action: { label: "Clear search and filters", onClick: clearFilters } })
        : emptyState({ kind: "list", title: o.empty?.title ?? "Nothing here yet", message: o.empty?.message, action: o.empty?.action }));
    }
    paintFooter();
    paintBulk();
  }

  function clearFilters() {
    state.search = "";
    state.filters = {};
    searchInput.value = "";
    filterEls.forEach((f) => { f.sel.value = ""; });
    state.page = 1;
    void refresh();
  }

  /** @param {string} key */
  function toggleSort(key) {
    const cur = state.sort;
    state.sort = !cur || cur.key !== key ? { key, dir: "asc" } : cur.dir === "asc" ? { key, dir: "desc" } : null;
    state.page = 1;
    void refresh();
  }

  function headerCheckbox() {
    const ids = state.pageRows.map(getId);
    const all = ids.length > 0 && ids.every((id) => state.selected.has(id));
    const some = ids.some((id) => state.selected.has(id));
    const cb = h("input", { type: "checkbox", checked: all, attrs: { "aria-label": "Select all rows on this page" } });
    cb.indeterminate = some && !all;
    cb.addEventListener("change", () => {
      state.pageRows.forEach((r) => { const id = getId(r); if (cb.checked) { state.selected.add(id); state.cache.set(id, r); } else state.selected.delete(id); });
      paint();
    });
    return cb;
  }
  function rowCheckbox(/** @type {any} */ row) {
    const id = getId(row);
    const cb = h("input", { type: "checkbox", checked: state.selected.has(id), attrs: { "aria-label": `Select row ${id}` } });
    cb.addEventListener("change", () => {
      if (cb.checked) { state.selected.add(id); state.cache.set(id, row); } else state.selected.delete(id);
      paint();
    });
    return cb;
  }

  function paintBulk() {
    const n = state.selected.size;
    bulk.hidden = n === 0;
    bulk.textContent = "";
    if (!n) return;
    bulk.append(
      h("span", { class: "dt__bulk-count" }, `${n} selected`),
      ...(o.bulkActions ?? []).map((a) => button({ label: a.label, icon: a.icon, onclick: () => a.onClick(selectedRows()) })),
      o.exportName ? button({ label: "Export / print selected", icon: "download", onclick: () => void exportCsv() }) : null,
      button({ label: "Clear", variant: "ghost", onclick: () => { state.selected.clear(); paint(); } }));
  }

  function paintFooter() {
    footer.textContent = "";
    const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
    const from = state.total ? (state.page - 1) * state.pageSize + 1 : 0;
    const to = Math.min(state.total, state.page * state.pageSize);
    const size = h("select", { class: "field__input field__input--select dt__size", attrs: { "aria-label": "Rows per page" } },
      [10, 25, 50, 100].map((n) => h("option", { value: String(n), selected: n === state.pageSize }, `${n} / page`)));
    size.addEventListener("change", () => { state.pageSize = Number(size.value); state.page = 1; void refresh(); });
    footer.append(
      h("span", { class: "dt__count num", attrs: { "aria-live": "polite" } }, state.total ? `${from}–${to} of ${state.total}` : "0 results"),
      h("div", { class: "dt__pager" }, size,
        button({ icon: "chevron-left", ariaLabel: "Previous page", variant: "ghost", disabled: state.page <= 1, onclick: () => { state.page--; void refresh(); } }),
        h("span", { class: "dt__page num" }, `Page ${state.page} of ${pages}`),
        button({ icon: "chevron-right", ariaLabel: "Next page", variant: "ghost", disabled: state.page >= pages, onclick: () => { state.page++; void refresh(); } })));
  }

  void refresh();

  return {
    el: root,
    /** Replace the rows (in-memory mode) and redraw. @param {any[]} rows */
    setRows(rows) { state.rows = rows; void refresh(); },
    refresh,
    getSelected: selectedRows,
    clearSelection: () => { state.selected.clear(); paint(); },
    state,
  };
}

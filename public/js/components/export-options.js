// @ts-check
/**
 * Export / Print Options (CM-P08) for any list or report:
 *   Excel  → a .csv file that opens in Excel (UTF-8, spreadsheet-safe)
 *   PDF    → the browser's print dialog with "Save as PDF" (styled by css/print.css)
 *   Print  → the same print dialog for a printer
 * Choose which rows and columns, the paper and the orientation. No library is used.
 */
import { h } from "../core/dom.js";
import { formatDate } from "../core/format.js";
import { businessDate, property, user } from "../core/context.js";
import { cellText, toCsv } from "./table-logic.js";
import { openDialog } from "./dialog.js";
import { field, select, checkbox, radioGroup } from "./fields.js";
import { toast } from "./toast.js";

/**
 * @typedef {Object} ExportOptionsInput
 * @property {string} title                    heading of the printout and base of the file name
 * @property {string} [fileName]               without extension
 * @property {import("./table-logic.js").Column[]} columns
 * @property {any[]} rows                      rows to export (the filtered list)
 * @property {any[]} [selectedRows]            when some rows are ticked
 * @property {boolean} [print]                 test hook: replace window.print
 */

/** Download text as a file (Excel-friendly CSV starts with a byte-order mark). @param {string} name @param {string} text @param {string} [type] */
export function downloadText(name, text, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿", text], { type });
  const a = h("a", { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * Print a table through the browser (body gets `is-printing`; css/print.css shows only #print-root).
 * @param {{ title: string, columns: import("./table-logic.js").Column[], rows: any[], paper: string, orientation: string, header: boolean }} p
 */
export function printTable(p) {
  document.getElementById("print-root")?.remove();
  const root = h("div", { id: "print-root", class: "print-only" },
    p.header ? h("header", { class: "print-head" }, h("h1", {}, p.title), h("p", {}, `${property()?.name ?? "The Aviv Kochi"} · ${formatDate(businessDate(), "long")} · printed by ${user().name}`)) : h("h1", {}, p.title),
    h("table", { class: "print-table" },
      h("thead", {}, h("tr", {}, p.columns.map((c) => h("th", {}, c.label)))),
      h("tbody", {}, p.rows.map((r) => h("tr", {}, p.columns.map((c) => h("td", { class: c.align === "right" ? "num" : "" }, cellText(c, r))))))),
    h("footer", { class: "print-foot" }, `${p.rows.length} row${p.rows.length === 1 ? "" : "s"}`));
  const style = h("style", { id: "print-page-style" }, `@page { size: ${p.paper} ${p.orientation}; margin: 12mm; }`);
  document.head.append(style);
  document.body.append(root);
  document.body.classList.add("is-printing");
  const done = () => {
    document.body.classList.remove("is-printing");
    root.remove();
    style.remove();
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
  // some browsers do not fire afterprint when the dialog is cancelled quickly
  setTimeout(() => document.body.classList.contains("is-printing") && done(), 60000);
}

/**
 * @param {ExportOptionsInput} o
 * @returns {Promise<{ format: "excel" | "pdf" | "print", rows: number, columns: number } | null>} what was done, or null when cancelled
 */
export async function openExportOptions(o) {
  const hasSelection = !!o.selectedRows?.length;
  const format = radioGroup({ name: "export-format", legend: "Format", value: "excel", options: [
    { value: "excel", label: "Excel", hint: "a .csv file" }, { value: "pdf", label: "PDF", hint: "choose “Save as PDF” in the print window" }, { value: "print", label: "Print" }] });
  const scope = radioGroup({ name: "export-scope", legend: "Rows", value: hasSelection ? "selected" : "all", options: [
    { value: "all", label: `All ${o.rows.length} row${o.rows.length === 1 ? "" : "s"} in this list` },
    ...(hasSelection ? [{ value: "selected", label: `Only the ${o.selectedRows?.length} selected` }] : [])] });
  const cols = o.columns.map((c) => ({ c, box: checkbox({ label: c.label, checked: true }) }));
  const paper = field({ label: "Paper", control: select({ options: [{ value: "A4", label: "A4" }, { value: "A3", label: "A3" }, { value: "letter", label: "Letter" }], value: "A4" }) });
  const orientation = field({ label: "Orientation", control: select({ options: [{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }], value: o.columns.length > 6 ? "landscape" : "portrait" }) });
  const header = checkbox({ label: "Add hotel name, date and my name at the top", checked: true });
  const layout = h("div", { class: "form-section__grid", dataset: { for: "print" } }, paper.el, orientation.el, header.el);
  const colBox = h("div", { class: "export__cols" }, cols.map((x) => x.box.el));
  const err = h("p", { class: "field__error", attrs: { role: "alert", hidden: true } });
  const toggleLayout = () => { layout.hidden = format.getValue() === "excel"; };
  format.onChange(toggleLayout);
  toggleLayout();

  const body = h("div", { class: "stack" },
    h("fieldset", { class: "form-section" }, h("legend", { class: "form-section__title" }, "Format"), format.el),
    h("fieldset", { class: "form-section" }, h("legend", { class: "form-section__title" }, "Rows"), scope.el),
    h("fieldset", { class: "form-section" }, h("legend", { class: "form-section__title" }, "Columns"), colBox),
    layout, err);

  const dlg = openDialog({
    code: "CM-P08", title: "Export or print", description: o.title, body, size: "md",
    actions: [
      { label: "Cancel", variant: "secondary", value: null },
      {
        label: "Export", variant: "primary", keepOpen: true,
        onClick: async () => {
          const columns = cols.filter((x) => x.box.getValue()).map((x) => x.c);
          if (!columns.length) { err.textContent = "Tick at least one column."; err.hidden = false; return; }
          const rows = scope.getValue() === "selected" && o.selectedRows ? o.selectedRows : o.rows;
          const fmt = /** @type {"excel" | "pdf" | "print"} */ (format.getValue());
          const stamp = businessDate();
          if (fmt === "excel") {
            downloadText(`${o.fileName ?? o.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${stamp}.csv`, toCsv(columns, rows));
            toast({ message: `Exported ${rows.length} row${rows.length === 1 ? "" : "s"} to Excel (CSV)` });
          } else {
            await dlg.close({ format: fmt, rows: rows.length, columns: columns.length });
            printTable({ title: o.title, columns, rows, paper: paper.control.getValue(), orientation: orientation.control.getValue(), header: header.getValue() });
            return;
          }
          await dlg.close({ format: fmt, rows: rows.length, columns: columns.length });
        },
      },
    ],
  });
  return (await dlg.result) ?? null;
}

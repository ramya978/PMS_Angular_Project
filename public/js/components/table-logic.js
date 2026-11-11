// @ts-check
/**
 * Pure logic behind DataTable: search, filter, sort, paginate, CSV.
 *
 * @typedef {Object} Column
 * @property {string} key
 * @property {string} label
 * @property {boolean} [sortable]
 * @property {"left" | "right" | "center"} [align]
 * @property {(row: any) => string} [text]        plain text of the cell (search + CSV)
 * @property {(row: any) => any} [sortValue]
 * @property {(row: any) => Node | string | number | null} [render]
 * @property {boolean} [hidden]                   hidden by default (can be turned on in the column chooser)
 * @property {boolean} [required]                 cannot be hidden
 * @property {string} [width]
 *
 * @typedef {Object} Query
 * @property {string} [search]
 * @property {Record<string, string>} [filters]
 * @property {{ key: string, dir: "asc" | "desc" } | null} [sort]
 * @property {number} [page]
 * @property {number} [pageSize]
 */

/** @param {Column} c @param {any} row */
export const cellText = (c, row) => (c.text ? c.text(row) : row[c.key] === null || row[c.key] === undefined ? "" : String(row[c.key]));

/**
 * @param {any[]} rows
 * @param {Column[]} columns
 * @param {Query} q
 * @param {Array<{ key: string, match?: (row: any, value: string) => boolean }>} [filterDefs]
 * @returns {{ items: any[], total: number, page: number, pages: number, pageSize: number, filtered: any[] }}
 */
export function applyQuery(rows, columns, q, filterDefs = []) {
  let out = rows;
  const terms = (q.search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length) {
    out = out.filter((row) => {
      const hay = columns.map((c) => cellText(c, row)).join(" ").toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }
  for (const [key, value] of Object.entries(q.filters ?? {})) {
    if (!value) continue;
    const def = filterDefs.find((f) => f.key === key);
    out = out.filter((row) => (def?.match ? def.match(row, value) : String(row[key]) === value));
  }
  if (q.sort) {
    const col = columns.find((c) => c.key === q.sort?.key);
    const sign = q.sort.dir === "desc" ? -1 : 1;
    const val = (/** @type {any} */ row) => (col?.sortValue ? col.sortValue(row) : row[/** @type {string} */ (q.sort?.key)]);
    out = out.slice().sort((a, b) => {
      const x = val(a), y = val(b);
      if (x === y) return 0;
      if (x === null || x === undefined || x === "") return 1; // empty values always last
      if (y === null || y === undefined || y === "") return -1;
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en", { numeric: true, sensitivity: "base" });
      return cmp * sign;
    });
  }
  const pageSize = q.pageSize ?? 25;
  const total = out.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, q.page ?? 1), pages);
  return { items: out.slice((page - 1) * pageSize, page * pageSize), total, page, pages, pageSize, filtered: out };
}

/**
 * CSV text (RFC 4180 quoting). Cells that start with = + - @ are prefixed with ' so spreadsheets never run them as formulas.
 * @param {Column[]} columns
 * @param {any[]} rows
 */
export function toCsv(columns, rows) {
  const esc = (/** @type {string} */ s) => {
    const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [columns.map((c) => esc(c.label)).join(","), ...rows.map((r) => columns.map((c) => esc(cellText(c, r))).join(","))].join("\r\n");
}

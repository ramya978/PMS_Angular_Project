// @ts-check
/**
 * Old → new differences for the audit log. Nested objects are flattened to dotted field names
 * ("bookingWindow.minAdvanceDays"); lists are compared as a whole.
 */

/**
 * @param {any} value
 * @param {string} prefix
 * @param {Record<string, any>} out
 */
function flatten(value, prefix, out) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
    if (!Object.keys(value).length && prefix) out[prefix] = {};
  } else out[prefix] = value;
}

/**
 * Changed fields between two records.
 * @param {Record<string, any> | null | undefined} before  null for a new record
 * @param {Record<string, any> | null | undefined} after   null for a deleted record
 * @param {{ ignore?: string[] }} [opts] fields never logged (e.g. "updatedAt")
 * @returns {Array<{ field: string, old: any, new: any }>}
 */
export function diffRecords(before, after, opts = {}) {
  const ignore = new Set(opts.ignore ?? ["updatedAt"]);
  /** @type {Record<string, any>} */ const a = {};
  /** @type {Record<string, any>} */ const b = {};
  flatten(before ?? {}, "", a);
  flatten(after ?? {}, "", b);
  const fields = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => k && !ignore.has(k));
  /** @type {Array<{ field: string, old: any, new: any }>} */
  const changes = [];
  for (const field of fields) {
    const o = a[field] === undefined ? null : a[field];
    const n = b[field] === undefined ? null : b[field];
    if (JSON.stringify(o) !== JSON.stringify(n)) changes.push({ field, old: o, new: n });
  }
  return changes;
}

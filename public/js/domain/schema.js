// @ts-check
/**
 * A tiny schema checker (no library). Every entity has a schema in schemas.js; `validate()` returns plain-English
 * messages per field, the same shape the real API will return (`fields: { name: "message" }`).
 *
 * Field spec: { type, required?, min?, max?, pattern?, values?, items?, shape?, label?, message?, check? }
 *   types: "string" | "int" | "money" (integer paise) | "number" | "bool" | "date" | "time" | "datetime" | "enum" | "array" | "object" | "any"
 */
import { isISODate } from "../core/format.js";

/**
 * @typedef {Object} FieldSpec
 * @property {"string" | "int" | "money" | "number" | "bool" | "date" | "time" | "datetime" | "enum" | "array" | "object" | "any"} type
 * @property {boolean} [required]   must be present and not empty
 * @property {number} [min]         min length (string / array) or min value (numbers)
 * @property {number} [max]
 * @property {RegExp} [pattern]
 * @property {readonly string[]} [values]  allowed values for "enum"
 * @property {FieldSpec} [items]    item spec for "array"
 * @property {Record<string, FieldSpec>} [shape]  fields of an "object"
 * @property {string} [label]       friendly name used in messages (default: the field name)
 * @property {string} [message]     replaces the default message for a pattern / check failure
 * @property {(value: any, record: any) => string | null} [check]  extra rule; return a message or null
 */

/** @typedef {Record<string, FieldSpec>} Schema */

/** Short helper constructors so schemas stay readable. */
export const f = {
  /** @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  string: (o = {}) => ({ type: "string", ...o }),
  /** @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  int: (o = {}) => ({ type: "int", ...o }),
  /** integer paise @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  money: (o = {}) => ({ type: "money", ...o }),
  /** @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  number: (o = {}) => ({ type: "number", ...o }),
  /** @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  bool: (o = {}) => ({ type: "bool", ...o }),
  /** @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  date: (o = {}) => ({ type: "date", ...o }),
  /** @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  time: (o = {}) => ({ type: "time", ...o }),
  /** @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  datetime: (o = {}) => ({ type: "datetime", ...o }),
  /** @param {readonly string[]} values @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  enum: (values, o = {}) => ({ type: "enum", values, ...o }),
  /** @param {FieldSpec} items @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  array: (items, o = {}) => ({ type: "array", items, ...o }),
  /** @param {Record<string, FieldSpec>} shape @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  object: (shape, o = {}) => ({ type: "object", shape, ...o }),
  /** @param {Partial<FieldSpec>} [o] @returns {FieldSpec} */
  any: (o = {}) => ({ type: "any", ...o }),
};

/** @param {string} name */
const humanize = (name) => name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[._-]+/g, " ").toLowerCase();

/**
 * @param {any} value
 * @param {FieldSpec} spec
 * @param {string} path
 * @param {any} record
 * @param {Record<string, string>} errors
 */
function check(value, spec, path, record, errors) {
  const label = spec.label ?? humanize(path.split(".").at(-1) ?? path);
  const missing = value === undefined || value === null || value === "";
  if (missing) {
    if (spec.required) errors[path] = `Enter ${label}.`; // optional fields may be left empty (undefined, null or "")
    return;
  }
  const fail = (/** @type {string} */ msg) => { errors[path] = spec.message ?? msg; };

  switch (spec.type) {
    case "string":
      if (typeof value !== "string") return fail(`${cap(label)} must be text.`);
      if (spec.min !== undefined && value.length < spec.min) return fail(`${cap(label)} must be at least ${spec.min} characters.`);
      if (spec.max !== undefined && value.length > spec.max) return fail(`${cap(label)} can be at most ${spec.max} characters.`);
      if (spec.pattern && !spec.pattern.test(value)) return fail(`${cap(label)} is not in the right format.`);
      break;
    case "int":
    case "money":
      if (!Number.isInteger(value)) return fail(spec.type === "money" ? `${cap(label)} must be a whole number of paise (no decimals).` : `${cap(label)} must be a whole number.`);
      if (spec.min !== undefined && value < spec.min) return fail(`${cap(label)} cannot be less than ${spec.min}.`);
      if (spec.max !== undefined && value > spec.max) return fail(`${cap(label)} cannot be more than ${spec.max}.`);
      break;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return fail(`${cap(label)} must be a number.`);
      if (spec.min !== undefined && value < spec.min) return fail(`${cap(label)} cannot be less than ${spec.min}.`);
      if (spec.max !== undefined && value > spec.max) return fail(`${cap(label)} cannot be more than ${spec.max}.`);
      break;
    case "bool":
      if (typeof value !== "boolean") return fail(`${cap(label)} must be yes or no.`);
      break;
    case "date":
      if (!isISODate(value)) return fail(`${cap(label)} must be a real date (YYYY-MM-DD).`);
      break;
    case "time":
      if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return fail(`${cap(label)} must be a time such as 15:00.`);
      break;
    case "datetime":
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return fail(`${cap(label)} must be a date and time.`);
      break;
    case "enum":
      if (!spec.values?.includes(value)) return fail(`${cap(label)} must be one of: ${spec.values?.join(", ")}.`);
      break;
    case "array":
      if (!Array.isArray(value)) return fail(`${cap(label)} must be a list.`);
      if (spec.min !== undefined && value.length < spec.min) return fail(`Add at least ${spec.min} ${label}.`);
      if (spec.max !== undefined && value.length > spec.max) return fail(`${cap(label)} can have at most ${spec.max} items.`);
      if (spec.items) value.forEach((item, i) => check(item, { ...spec.items, required: true }, `${path}[${i}]`, record, errors));
      break;
    case "object":
      if (typeof value !== "object" || Array.isArray(value)) return fail(`${cap(label)} is not valid.`);
      for (const [k, sub] of Object.entries(spec.shape ?? {})) check(value[k], sub, `${path}.${k}`, record, errors);
      break;
    case "any":
      break;
  }
  if (!errors[path] && spec.check) {
    const msg = spec.check(value, record);
    if (msg) errors[path] = msg;
  }
}

/** @param {string} s */
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Check a record against a schema. Unknown fields are reported too, so typos in seed data or forms are caught.
 * @param {any} record
 * @param {Schema} schema
 * @param {{ allowExtra?: boolean }} [opts]
 * @returns {{ ok: boolean, errors: Record<string, string> }}
 */
export function validate(record, schema, opts = {}) {
  /** @type {Record<string, string>} */
  const errors = {};
  if (record === null || typeof record !== "object") return { ok: false, errors: { _: "Nothing to save." } };
  for (const [name, spec] of Object.entries(schema)) check(record[name], spec, name, record, errors);
  if (!opts.allowExtra) {
    for (const key of Object.keys(record)) if (!(key in schema)) errors[key] = `Unknown field “${key}”.`;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

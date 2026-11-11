// @ts-check
/**
 * Form controls. Every control returns a Control:
 *   { el, input, getValue(), setValue(v), onChange(fn) }
 * where `el` is what you put in the page and `input` is the focusable element the label points at.
 * Wrap controls with field() to get a label, hint, required mark and an inline error.
 */
import { h } from "../core/dom.js";
import { formatMoney, parseMoney } from "../core/format.js";
import { icon } from "./icons.js";

/**
 * @template [V=string]
 * @typedef {Object} Control
 * @property {HTMLElement} el
 * @property {HTMLElement} input
 * @property {() => V} getValue
 * @property {(v: V) => void} setValue
 * @property {(fn: (v: V) => void) => void} onChange
 */

let uid = 0;
export const nextId = (/** @type {string} */ prefix = "f") => `${prefix}-${++uid}`;

/**
 * Label + control + hint + inline error.
 * @param {Object} o
 * @param {string} o.label
 * @param {Control<any>} o.control
 * @param {string} [o.hint]
 * @param {boolean} [o.required]
 * @param {boolean} [o.optional] show “(optional)” instead of a required mark
 * @param {string} [o.class]
 * @returns {{ el: HTMLElement, control: Control<any>, setError: (message: string) => void, getError: () => string }}
 */
export function field(o) {
  const id = o.control.input.id || nextId("fld");
  o.control.input.id = id;
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const err = h("p", { class: "field__error", id: errId, attrs: { hidden: true } });
  const hint = o.hint ? h("p", { class: "field__hint", id: hintId }, o.hint) : null;
  const describedBy = [hint ? hintId : "", errId].filter(Boolean).join(" ");
  o.control.input.setAttribute("aria-describedby", describedBy);
  if (o.required) o.control.input.setAttribute("aria-required", "true");

  const el = h("div", { class: `field${o.class ? ` ${o.class}` : ""}` },
    h("label", { class: "field__label", attrs: { for: id } },
      o.label,
      o.required ? h("span", { class: "field__req", attrs: { "aria-hidden": "true" } }, " *") : null,
      o.optional ? h("span", { class: "field__opt" }, " (optional)") : null),
    o.control.el, hint, err);

  return {
    el,
    control: o.control,
    setError(message) {
      err.textContent = message;
      err.hidden = !message;
      el.classList.toggle("has-error", !!message);
      o.control.input.setAttribute("aria-invalid", message ? "true" : "false");
    },
    getError: () => err.textContent ?? "",
  };
}

/**
 * Wire a native input / textarea / select into a Control.
 * @template {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement} E
 * @param {E} input
 * @param {HTMLElement} [el]
 * @returns {Control<string>}
 */
function nativeControl(input, el = input) {
  return {
    el, input,
    getValue: () => input.value,
    setValue: (v) => { input.value = v ?? ""; },
    onChange: (fn) => input.addEventListener("input", () => fn(input.value)),
  };
}

/**
 * @param {{ type?: string, value?: string, placeholder?: string, name?: string, maxLength?: number, autocomplete?: string, inputMode?: "text" | "numeric" | "decimal" | "email" | "tel", disabled?: boolean, readOnly?: boolean, icon?: string }} [o]
 * @returns {Control<string>}
 */
export function textInput(o = {}) {
  const input = h("input", {
    class: "field__input", type: o.type ?? "text", value: o.value ?? "", placeholder: o.placeholder ?? "",
    name: o.name, maxLength: o.maxLength, disabled: o.disabled, readOnly: o.readOnly,
    attrs: { autocomplete: o.autocomplete ?? "off", inputmode: o.inputMode ?? null },
  });
  if (!o.icon) return nativeControl(input);
  const wrap = h("div", { class: "field__wrap" }, icon(o.icon, { class: "field__icon" }), input);
  wrap.classList.add("field__wrap--icon");
  return nativeControl(input, wrap);
}

/** @param {{ value?: string, placeholder?: string, rows?: number, maxLength?: number, name?: string }} [o] */
export function textarea(o = {}) {
  const input = h("textarea", { class: "field__input field__input--area", value: o.value ?? "", placeholder: o.placeholder ?? "", rows: o.rows ?? 3, maxLength: o.maxLength, name: o.name });
  return nativeControl(input);
}

/**
 * Native select (fast, accessible, works with every keyboard and screen reader).
 * @param {{ options: Array<{ value: string, label: string, disabled?: boolean }>, value?: string, placeholder?: string, name?: string }} o
 */
export function select(o) {
  const input = h("select", { class: "field__input field__input--select", name: o.name });
  if (o.placeholder !== undefined) input.append(h("option", { value: "" }, o.placeholder));
  for (const opt of o.options) input.append(h("option", { value: opt.value, disabled: opt.disabled }, opt.label));
  input.value = o.value ?? (o.placeholder !== undefined ? "" : o.options[0]?.value ?? "");
  const wrap = h("div", { class: "field__wrap field__wrap--select" }, input, icon("chevron-down", { class: "field__chevron" }));
  const c = nativeControl(input, wrap);
  c.onChange = (fn) => input.addEventListener("change", () => fn(input.value));
  return c;
}

/**
 * Checkbox with its own label (not wrapped by field()).
 * @param {{ label: string, checked?: boolean, name?: string, hint?: string }} o
 * @returns {Control<boolean>}
 */
export function checkbox(o) {
  const input = h("input", { type: "checkbox", class: "check__input", checked: !!o.checked, name: o.name });
  const el = h("label", { class: "check" }, input, h("span", { class: "check__box", attrs: { "aria-hidden": "true" } }, icon("check")), h("span", { class: "check__label" }, o.label));
  return {
    el, input,
    getValue: () => input.checked,
    setValue: (v) => { input.checked = !!v; },
    onChange: (fn) => input.addEventListener("change", () => fn(input.checked)),
  };
}

/**
 * Radio group.
 * @param {{ name: string, options: Array<{ value: string, label: string, hint?: string, disabled?: boolean }>, value?: string, legend?: string }} o
 * @returns {Control<string>}
 */
export function radioGroup(o) {
  const inputs = o.options.map((opt) =>
    h("input", { type: "radio", class: "check__input", name: o.name, value: opt.value, checked: opt.value === o.value, disabled: opt.disabled })
  );
  const el = h("div", { class: "radio-group", attrs: { role: "radiogroup", "aria-label": o.legend ?? null } },
    o.options.map((opt, i) =>
      h("label", { class: "check check--radio" }, inputs[i],
        h("span", { class: "check__box", attrs: { "aria-hidden": "true" } }),
        h("span", { class: "check__label" }, opt.label, opt.hint ? h("span", { class: "field__hint" }, ` ${opt.hint}`) : null))));
  return {
    el, input: inputs[0],
    getValue: () => inputs.find((i) => i.checked)?.value ?? "",
    setValue: (v) => inputs.forEach((i) => { i.checked = i.value === v; }),
    onChange: (fn) => inputs.forEach((i) => i.addEventListener("change", () => i.checked && fn(i.value))),
  };
}

/**
 * On/off switch (role="switch").
 * @param {{ label: string, checked?: boolean }} o
 * @returns {Control<boolean>}
 */
export function switchControl(o) {
  let on = !!o.checked;
  /** @type {Array<(v: boolean) => void>} */
  const listeners = [];
  const input = h("button", { class: "switch", type: "button", attrs: { role: "switch", "aria-checked": String(on) } },
    h("span", { class: "switch__track", attrs: { "aria-hidden": "true" } }, h("span", { class: "switch__thumb" })),
    h("span", { class: "switch__label" }, o.label));
  const set = (/** @type {boolean} */ v) => {
    on = v;
    input.setAttribute("aria-checked", String(v));
  };
  input.addEventListener("click", () => {
    set(!on);
    listeners.forEach((fn) => fn(on));
  });
  return { el: input, input, getValue: () => on, setValue: set, onChange: (fn) => listeners.push(fn) };
}

/**
 * Rupee amount. getValue() returns integer paise (or null when empty / invalid). Shows Indian grouping on blur.
 * @param {{ value?: number | null, placeholder?: string, allowNegative?: boolean }} [o]
 * @returns {Control<number | null>}
 */
export function currencyInput(o = {}) {
  const input = h("input", { class: "field__input num field__input--money", type: "text", placeholder: o.placeholder ?? "0", attrs: { inputmode: "decimal", autocomplete: "off" } });
  const el = h("div", { class: "field__wrap field__wrap--money" }, h("span", { class: "field__prefix", attrs: { "aria-hidden": "true" } }, "₹"), input);
  /** @type {Array<(v: number | null) => void>} */
  const listeners = [];
  const read = () => (input.value.trim() === "" ? null : parseMoney(input.value));
  const set = (/** @type {number | null} */ paise) => {
    input.value = paise === null || paise === undefined ? "" : formatMoney(paise, { symbol: false });
  };
  set(o.value ?? null);
  input.addEventListener("blur", () => {
    const v = read();
    if (v !== null) set(v);
  });
  input.addEventListener("input", () => listeners.forEach((fn) => fn(read())));
  return { el, input, getValue: read, setValue: set, onChange: (fn) => listeners.push(fn) };
}

export const DIAL_CODES = [
  { code: "+91", label: "India +91" }, { code: "+1", label: "USA / Canada +1" }, { code: "+44", label: "UK +44" },
  { code: "+971", label: "UAE +971" }, { code: "+65", label: "Singapore +65" }, { code: "+61", label: "Australia +61" },
  { code: "+49", label: "Germany +49" }, { code: "+33", label: "France +33" }, { code: "+966", label: "Saudi Arabia +966" },
  { code: "+974", label: "Qatar +974" }, { code: "+94", label: "Sri Lanka +94" }, { code: "+977", label: "Nepal +977" },
];

/**
 * Phone number with country code (+91 default). getValue() → "+91 9876543210"; digits only in the number part.
 * @param {{ value?: string }} [o]
 * @returns {Control<string>}
 */
export function phoneInput(o = {}) {
  const dial = h("select", { class: "field__input field__input--select phone__code", attrs: { "aria-label": "Country code" } },
    DIAL_CODES.map((d) => h("option", { value: d.code }, d.label)));
  const input = h("input", { class: "field__input num", type: "tel", placeholder: "98765 43210", attrs: { inputmode: "tel", autocomplete: "tel-national" } });
  const el = h("div", { class: "phone" }, dial, input);
  /** @type {Array<(v: string) => void>} */
  const listeners = [];
  const read = () => (input.value ? `${dial.value} ${input.value}` : "");
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^\d\s]/g, "");
    listeners.forEach((fn) => fn(read()));
  });
  dial.addEventListener("change", () => listeners.forEach((fn) => fn(read())));
  const set = (/** @type {string} */ v) => {
    const m = /^(\+\d{1,3})\s*(.*)$/.exec(v ?? "");
    if (m && DIAL_CODES.some((d) => d.code === m[1])) {
      dial.value = m[1];
      input.value = m[2];
    } else input.value = v ?? "";
  };
  set(o.value ?? "");
  return { el, input, getValue: read, setValue: set, onChange: (fn) => listeners.push(fn) };
}

/**
 * Small − / + counter for adults, children, rooms.
 * @param {{ value?: number, min?: number, max?: number, label: string }} o
 * @returns {Control<number>}
 */
export function numberStepper(o) {
  const min = o.min ?? 0;
  const max = o.max ?? 99;
  const input = h("input", { class: "stepper-input__value num", type: "text", value: String(o.value ?? min), attrs: { inputmode: "numeric", role: "spinbutton", "aria-label": o.label, "aria-valuemin": min, "aria-valuemax": max } });
  /** @type {Array<(v: number) => void>} */
  const listeners = [];
  const clamp = (/** @type {number} */ n) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  const set = (/** @type {number} */ n) => {
    const v = clamp(n);
    input.value = String(v);
    input.setAttribute("aria-valuenow", String(v));
    dec.disabled = v <= min;
    inc.disabled = v >= max;
  };
  const bump = (/** @type {number} */ d) => {
    set(Number(input.value) + d);
    listeners.forEach((fn) => fn(Number(input.value)));
  };
  const dec = h("button", { class: "stepper-input__btn", type: "button", attrs: { "aria-label": `Decrease ${o.label}` }, onclick: () => bump(-1) }, icon("minus"));
  const inc = h("button", { class: "stepper-input__btn", type: "button", attrs: { "aria-label": `Increase ${o.label}` }, onclick: () => bump(1) }, icon("plus"));
  input.addEventListener("change", () => bump(0));
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowUp") { ev.preventDefault(); bump(1); }
    if (ev.key === "ArrowDown") { ev.preventDefault(); bump(-1); }
  });
  set(o.value ?? min);
  return { el: h("div", { class: "stepper-input" }, dec, input, inc), input, getValue: () => Number(input.value), setValue: set, onChange: (fn) => listeners.push(fn) };
}

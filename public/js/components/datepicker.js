// @ts-check
/**
 * DatePicker, DateRangePicker (stay dates with nights count) and TimePicker.
 * Today is the hotel BUSINESS date. Weekends and special dates are highlighted.
 * Calendar keys: arrows move a day / week, PageUp/PageDown change month, Home/End jump to week start/end, Enter picks, Esc closes.
 */
import { h } from "../core/dom.js";
import { addDays, formatDate, isISODate, weekday } from "../core/format.js";
import { businessDate } from "../core/context.js";
import { icon } from "./icons.js";
import { openPopover } from "./overlay.js";
import { addMonths, monthGrid, monthName, nightsLabel, parseDateInput, parseTimeInput, timeSlots } from "./date-logic.js";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * @typedef {Object} CalendarOptions
 * @property {string} [value]            selected date (single mode)
 * @property {string} [from]             range start
 * @property {string} [to]               range end (check-out)
 * @property {"single" | "range"} [mode]
 * @property {string} [min]
 * @property {string} [max]
 * @property {Map<string, string>} [specialDates]  ISO date → label (festivals, peak dates)
 * @property {(a: { value?: string, from?: string, to?: string }) => void} onPick
 */

/**
 * The calendar grid itself (used inside the pickers' popovers and available on its own).
 * @param {CalendarOptions} o
 * @returns {HTMLElement}
 */
export function calendar(o) {
  const mode = o.mode ?? "single";
  const today = businessDate();
  let focus = o.value ?? o.from ?? today;
  let from = o.from;
  let to = o.to;
  let hover = /** @type {string | null} */ (null);
  const root = h("div", { class: "cal", attrs: { role: "application", "aria-label": "Calendar" } });
  const live = h("div", { class: "visually-hidden", attrs: { "aria-live": "polite" } });

  const disabled = (/** @type {string} */ d) => (o.min && d < o.min) || (o.max && d > o.max);

  function pick(/** @type {string} */ d) {
    if (disabled(d)) return;
    if (mode === "single") return o.onPick({ value: d });
    if (!from || (from && to)) {
      from = d;
      to = undefined;
      paint();
      live.textContent = `Check-in ${formatDate(d, "long")}. Now choose check-out.`;
    } else if (d <= from) {
      from = d; // clicking earlier than check-in restarts the range
      paint();
    } else {
      to = d;
      o.onPick({ from, to });
    }
  }

  function paint(keepFocus = false) {
    const [y, m] = focus.split("-").map(Number);
    const grid = monthGrid(y, m - 1);
    const previewTo = to ?? (from && hover && hover > from ? hover : undefined);
    root.textContent = "";
    root.append(
      h("div", { class: "cal__head" },
        h("button", { class: "btn btn--ghost btn--icon", type: "button", attrs: { "aria-label": "Previous month" }, onclick: () => { focus = addMonths(focus, -1); paint(); } }, icon("chevron-left")),
        h("div", { class: "cal__title", attrs: { "aria-live": "polite" } }, `${monthName(m - 1)} ${y}`),
        h("button", { class: "btn btn--ghost btn--icon", type: "button", attrs: { "aria-label": "Next month" }, onclick: () => { focus = addMonths(focus, 1); paint(); } }, icon("chevron-right"))),
      h("div", { class: "cal__grid", attrs: { role: "grid", "aria-label": `${monthName(m - 1)} ${y}` } },
        h("div", { class: "cal__row", attrs: { role: "row" } }, WEEKDAYS.map((d) => h("div", { class: "cal__dow", attrs: { role: "columnheader" } }, d))),
        grid.map((week) =>
          h("div", { class: "cal__row", attrs: { role: "row" } },
            week.map((d) => {
              const inMonth = d.startsWith(`${y}-${String(m).padStart(2, "0")}`);
              const wd = weekday(d);
              const sp = o.specialDates?.get(d);
              const isFrom = d === from;
              const isTo = d === to;
              const inRange = !!from && !!previewTo && d > from && d < previewTo;
              const selectedSingle = mode === "single" && d === o.value;
              const cls = ["cal__day",
                !inMonth && "is-outside", d === today && "is-today", (wd === 0 || wd === 6) && "is-weekend", sp && "is-special",
                (isFrom || isTo || selectedSingle) && "is-selected", isFrom && "is-range-start", isTo && "is-range-end", inRange && "is-in-range",
                disabled(d) && "is-disabled"].filter(Boolean).join(" ");
              return h("button", {
                class: cls, type: "button", dataset: { date: d },
                tabindex: d === focus ? 0 : -1,
                attrs: {
                  role: "gridcell", "aria-selected": String(isFrom || isTo || selectedSingle || inRange),
                  "aria-disabled": disabled(d) ? "true" : null, "aria-current": d === today ? "date" : null,
                  "aria-label": `${formatDate(d, "long")}${d === today ? ", business date" : ""}${sp ? `, ${sp}` : ""}`,
                  title: sp ?? null,
                },
                onclick: () => pick(d),
                onmouseenter: () => { if (mode === "range" && from && !to) { hover = d; paintRangePreview(); } },
              }, String(Number(d.slice(8))), sp ? h("span", { class: "cal__dot", attrs: { "aria-hidden": "true" } }) : null);
            })))),
      o.mode === "range" && from && !to ? h("p", { class: "cal__hint" }, "Choose check-out date") : "",
      from && to ? h("p", { class: "cal__hint" }, `${formatDate(from)} → ${formatDate(to)} · ${nightsLabel(from, to)}`) : "",
      live);
    if (keepFocus) /** @type {HTMLElement | null} */ (root.querySelector(`[data-date="${focus}"]`))?.focus();
  }

  function paintRangePreview() {
    if (!from || to || !hover) return;
    root.querySelectorAll(".cal__day").forEach((b) => {
      const d = /** @type {HTMLElement} */ (b).dataset.date ?? "";
      b.classList.toggle("is-in-range", d > from && d < /** @type {string} */ (hover));
    });
  }

  root.addEventListener("keydown", (ev) => {
    const move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[/** @type {"ArrowLeft"} */ (ev.key)];
    if (move !== undefined) {
      ev.preventDefault();
      focus = addDays(focus, move);
      paint(true);
    } else if (ev.key === "PageDown" || ev.key === "PageUp") {
      ev.preventDefault();
      focus = addMonths(focus, ev.key === "PageDown" ? 1 : -1);
      paint(true);
    } else if (ev.key === "Home" || ev.key === "End") {
      ev.preventDefault();
      const offset = (weekday(focus) + 6) % 7;
      focus = ev.key === "Home" ? addDays(focus, -offset) : addDays(focus, 6 - offset);
      paint(true);
    }
  });
  paint();
  return root;
}

/**
 * Single date input with a calendar popup. Typed text is understood in several formats.
 * @param {{ value?: string, min?: string, max?: string, specialDates?: Map<string, string>, placeholder?: string }} [o]
 * @returns {import("./fields.js").Control<string>}
 */
export function datePicker(o = {}) {
  let value = o.value ?? "";
  /** @type {Array<(v: string) => void>} */
  const listeners = [];
  const input = h("input", { class: "field__input num", type: "text", placeholder: o.placeholder ?? "dd mmm yyyy", attrs: { autocomplete: "off", inputmode: "text" } });
  const btn = h("button", { class: "field__btn", type: "button", attrs: { "aria-label": "Open calendar" } }, icon("calendar"));
  const el = h("div", { class: "field__wrap field__wrap--btn" }, input, btn);
  const show = () => { input.value = value ? formatDate(value) : ""; };
  const set = (/** @type {string} */ v, notify = false) => {
    value = v;
    show();
    input.removeAttribute("aria-invalid");
    if (notify) listeners.forEach((fn) => fn(value));
  };
  show();

  input.addEventListener("change", () => {
    if (!input.value.trim()) return set("", true);
    const parsed = parseDateInput(input.value, businessDate());
    if (parsed && !(o.min && parsed < o.min) && !(o.max && parsed > o.max)) set(parsed, true);
    else {
      input.setAttribute("aria-invalid", "true");
      input.title = "Enter a valid date, for example 22 Oct 2026";
    }
  });

  /** @type {ReturnType<typeof openPopover> | null} */
  let pop = null;
  const toggle = () => {
    if (pop) return pop.close();
    pop = openPopover({
      anchor: btn, label: "Choose date", placement: "bottom-end",
      content: calendar({ value, min: o.min, max: o.max, specialDates: o.specialDates, onPick: ({ value: v }) => { set(/** @type {string} */ (v), true); pop?.close(); input.focus(); } }),
      onClose: () => { pop = null; },
    });
    /** @type {HTMLElement | null} */ (pop.el.querySelector('[tabindex="0"]'))?.focus();
  };
  btn.addEventListener("click", toggle);
  input.addEventListener("keydown", (ev) => { if (ev.key === "ArrowDown" && ev.altKey) toggle(); });

  return { el, input, getValue: () => value, setValue: (v) => set(v), onChange: (fn) => listeners.push(fn) };
}

/**
 * Stay dates: check-in + check-out with one calendar, nights count, weekends and special dates highlighted.
 * getValue() → { from, to, nights }.
 * @param {{ from?: string, to?: string, min?: string, specialDates?: Map<string, string> }} [o]
 * @returns {import("./fields.js").Control<{ from: string, to: string, nights: number }>}
 */
export function dateRangePicker(o = {}) {
  let from = o.from ?? "";
  let to = o.to ?? "";
  /** @type {Array<(v: { from: string, to: string, nights: number }) => void>} */
  const listeners = [];
  const mk = (/** @type {string} */ label) => h("input", { class: "field__input num", type: "text", placeholder: "dd mmm yyyy", attrs: { autocomplete: "off", "aria-label": label } });
  const inFrom = mk("Check-in date");
  const inTo = mk("Check-out date");
  const nights = h("span", { class: "range__nights", attrs: { "aria-live": "polite" } });
  const btn = h("button", { class: "field__btn", type: "button", attrs: { "aria-label": "Open calendar" } }, icon("calendar"));
  const el = h("div", { class: "range" }, h("div", { class: "field__wrap field__wrap--btn" }, inFrom, btn), icon("arrow-right", { class: "range__arrow" }), inTo, nights);

  const value = () => ({ from, to, nights: from && to ? Math.round((Date.parse(to) - Date.parse(from)) / 86400000) : 0 });
  const paint = () => {
    inFrom.value = from ? formatDate(from) : "";
    inTo.value = to ? formatDate(to) : "";
    nights.textContent = from && to && to > from ? nightsLabel(from, to) : "";
  };
  const commit = (/** @type {boolean} */ notify) => {
    paint();
    if (notify) listeners.forEach((fn) => fn(value()));
  };
  paint();

  /** @param {HTMLInputElement} inp @param {"from" | "to"} which */
  const typed = (inp, which) => inp.addEventListener("change", () => {
    const parsed = parseDateInput(inp.value, businessDate());
    const ok = !!parsed && isISODate(parsed) && !(o.min && /** @type {string} */ (parsed) < o.min);
    if (!ok && inp.value.trim()) return inp.setAttribute("aria-invalid", "true");
    inp.removeAttribute("aria-invalid");
    if (which === "from") { from = parsed ?? ""; if (to && from && to <= from) to = addDays(from, 1); }
    else to = parsed ?? "";
    if (from && to && to <= from) { inp.setAttribute("aria-invalid", "true"); return; }
    commit(true);
  });
  typed(inFrom, "from");
  typed(inTo, "to");

  /** @type {ReturnType<typeof openPopover> | null} */
  let pop = null;
  btn.addEventListener("click", () => {
    if (pop) return pop.close();
    pop = openPopover({
      anchor: btn, label: "Choose stay dates", placement: "bottom-end",
      content: calendar({ mode: "range", from: from || undefined, to: to || undefined, min: o.min, specialDates: o.specialDates, onPick: ({ from: f, to: t }) => { from = /** @type {string} */ (f); to = /** @type {string} */ (t); commit(true); pop?.close(); inTo.focus(); } }),
      onClose: () => { pop = null; },
    });
    /** @type {HTMLElement | null} */ (pop.el.querySelector('[tabindex="0"]'))?.focus();
  });

  return {
    el, input: inFrom,
    getValue: value,
    setValue: (v) => { from = v.from; to = v.to; paint(); },
    onChange: (fn) => listeners.push(fn),
  };
}

/**
 * Time input (24 h, understands "3pm", "1530", "9.30 am") with a list of slots.
 * @param {{ value?: string, step?: number }} [o]
 * @returns {import("./fields.js").Control<string>}
 */
export function timePicker(o = {}) {
  let value = o.value ?? "";
  /** @type {Array<(v: string) => void>} */
  const listeners = [];
  const input = h("input", { class: "field__input num", type: "text", placeholder: "HH:mm", value, attrs: { autocomplete: "off", inputmode: "numeric" } });
  const btn = h("button", { class: "field__btn", type: "button", attrs: { "aria-label": "Choose time" } }, icon("clock"));
  const el = h("div", { class: "field__wrap field__wrap--btn" }, input, btn);
  const set = (/** @type {string} */ v, notify = false) => {
    value = v;
    input.value = v;
    input.removeAttribute("aria-invalid");
    if (notify) listeners.forEach((fn) => fn(v));
  };
  input.addEventListener("change", () => {
    if (!input.value.trim()) return set("", true);
    const t = parseTimeInput(input.value);
    if (t) set(t, true);
    else input.setAttribute("aria-invalid", "true");
  });

  /** @type {ReturnType<typeof openPopover> | null} */
  let pop = null;
  btn.addEventListener("click", () => {
    if (pop) return pop.close();
    const slots = timeSlots(o.step ?? 30);
    const list = h("ul", { class: "listbox listbox--static", attrs: { role: "listbox", "aria-label": "Times" } },
      slots.map((t) => h("li", {
        class: `listbox__opt${t === value ? " is-active" : ""}`, tabindex: -1, attrs: { role: "option", "aria-selected": String(t === value) },
        onclick: () => { set(t, true); pop?.close(); input.focus(); },
        onkeydown: (/** @type {KeyboardEvent} */ ev) => {
          const li = /** @type {HTMLElement} */ (ev.currentTarget);
          if (ev.key === "Enter") li.click();
          if (ev.key === "ArrowDown") { ev.preventDefault(); /** @type {HTMLElement | null} */ (li.nextElementSibling)?.focus(); }
          if (ev.key === "ArrowUp") { ev.preventDefault(); /** @type {HTMLElement | null} */ (li.previousElementSibling)?.focus(); }
        },
      }, t)));
    pop = openPopover({ anchor: btn, label: "Choose time", placement: "bottom-end", content: list, focusFirst: false, onClose: () => { pop = null; } });
    const target = /** @type {HTMLElement | undefined} */ ([...list.children].find((c) => c.textContent === value) ?? list.children[Math.floor(slots.length / 3)]);
    target?.focus();
    target?.scrollIntoView({ block: "center" });
  });
  return { el, input, getValue: () => value, setValue: (v) => set(v), onChange: (fn) => listeners.push(fn) };
}

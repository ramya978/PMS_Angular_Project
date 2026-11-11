// @ts-check
/**
 * Searchable Combobox and MultiSelect (WAI-ARIA 1.2 combobox with a listbox popup).
 * Keys: ↓ ↑ move, Enter picks, Esc closes, Home / End jump, typing filters with fuzzy matching.
 */
import { h } from "../core/dom.js";
import { fuzzyFilter } from "../core/fuzzy.js";
import { icon } from "./icons.js";
import { nextId } from "./fields.js";

/**
 * @typedef {{ value: string, label: string, hint?: string, disabled?: boolean }} Option
 */

/**
 * Shared listbox behaviour for combobox and multiSelect.
 * @param {HTMLInputElement} input
 * @param {() => Option[]} getOptions
 * @param {(opt: Option) => void} onPick
 * @param {(opt: Option) => boolean} isSelected
 * @param {HTMLElement} anchor the box the list drops from
 */
function attachListbox(input, getOptions, onPick, isSelected, anchor) {
  const listId = nextId("lb");
  const list = h("ul", { class: "listbox", id: listId, attrs: { role: "listbox", hidden: true } });
  document.body.append(list);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", listId);

  let shown = /** @type {Option[]} */ ([]);
  let active = -1;
  let open = false;

  const place = () => {
    const r = anchor.getBoundingClientRect();
    const dlg = anchor.closest("dialog[open]");
    if (dlg && list.parentElement !== dlg) dlg.append(list);
    list.style.position = "fixed";
    list.style.minWidth = `${r.width}px`;
    list.style.left = `${r.left}px`;
    const below = window.innerHeight - r.bottom;
    list.style.maxHeight = `${Math.max(140, Math.min(300, below - 12))}px`;
    list.style.top = `${r.bottom + 4}px`;
  };

  const render = () => {
    shown = fuzzyFilter(getOptions(), input.value && !input.dataset.pristine ? input.value : "", (o) => `${o.label} ${o.hint ?? ""}`);
    list.textContent = "";
    if (!shown.length) list.append(h("li", { class: "listbox__empty", attrs: { role: "presentation" } }, "No matches"));
    shown.forEach((opt, i) => {
      list.append(
        h("li", {
          class: "listbox__opt", id: `${listId}-${i}`,
          attrs: { role: "option", "aria-selected": String(isSelected(opt)), "aria-disabled": opt.disabled ? "true" : null },
          onmousedown: (/** @type {Event} */ ev) => { ev.preventDefault(); if (!opt.disabled) onPick(opt); },
        },
        h("span", {}, opt.label), opt.hint ? h("span", { class: "listbox__hint" }, opt.hint) : null,
        isSelected(opt) ? icon("check", { class: "listbox__check" }) : null));
    });
    setActive(shown.findIndex((o) => !o.disabled));
  };

  /** @param {number} i */
  const setActive = (i) => {
    active = i;
    list.querySelectorAll(".listbox__opt").forEach((li, idx) => li.classList.toggle("is-active", idx === i));
    if (i >= 0) {
      input.setAttribute("aria-activedescendant", `${listId}-${i}`);
      list.querySelector(`#${listId}-${i}`)?.scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  };

  const show = () => {
    if (open) return;
    open = true;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    render();
    place();
  };
  const hide = () => {
    open = false;
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };

  input.addEventListener("input", () => {
    delete input.dataset.pristine;
    if (!open) show();
    else render();
  });
  input.addEventListener("focus", () => { input.dataset.pristine = "1"; });
  input.addEventListener("click", () => show());
  input.addEventListener("blur", () => setTimeout(hide, 0));
  input.addEventListener("keydown", (ev) => {
    const enabled = shown.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      if (!open) return show();
      const pos = enabled.indexOf(active);
      const next = ev.key === "ArrowDown" ? enabled[Math.min(enabled.length - 1, pos + 1)] : enabled[Math.max(0, pos - 1)];
      setActive(next ?? -1);
    } else if (ev.key === "Home" && open) { ev.preventDefault(); setActive(enabled[0] ?? -1); }
    else if (ev.key === "End" && open) { ev.preventDefault(); setActive(enabled.at(-1) ?? -1); }
    else if (ev.key === "Enter" && open && active >= 0) { ev.preventDefault(); onPick(shown[active]); }
    else if (ev.key === "Escape" && open) { ev.stopPropagation(); hide(); }
  });
  window.addEventListener("resize", () => open && place());

  return { show, hide, rerender: () => open && render(), isOpen: () => open, destroy: () => list.remove() };
}

/**
 * Single-choice searchable combobox.
 * @param {{ options: Option[], value?: string, placeholder?: string, name?: string }} o
 * @returns {import("./fields.js").Control<string>}
 */
export function combobox(o) {
  const input = h("input", { class: "field__input", type: "text", placeholder: o.placeholder ?? "Search…", name: o.name, attrs: { autocomplete: "off", spellcheck: "false" } });
  const box = h("div", { class: "field__wrap field__wrap--select" }, input, icon("chevron-down", { class: "field__chevron" }));
  let value = o.value ?? "";
  /** @type {Array<(v: string) => void>} */
  const listeners = [];
  const labelOf = (/** @type {string} */ v) => o.options.find((x) => x.value === v)?.label ?? "";
  input.value = labelOf(value);

  const lb = attachListbox(input, () => o.options, (opt) => {
    value = opt.value;
    input.value = opt.label;
    lb.hide();
    listeners.forEach((fn) => fn(value));
  }, (opt) => opt.value === value, box);

  input.addEventListener("blur", () => {
    input.value = labelOf(value); // revert unfinished typing
  });

  return {
    el: box, input,
    getValue: () => value,
    setValue: (v) => { value = v; input.value = labelOf(v); },
    onChange: (fn) => listeners.push(fn),
  };
}

/**
 * Multi-choice with removable chips.
 * @param {{ options: Option[], values?: string[], placeholder?: string }} o
 * @returns {import("./fields.js").Control<string[]>}
 */
export function multiSelect(o) {
  let values = [...(o.values ?? [])];
  /** @type {Array<(v: string[]) => void>} */
  const listeners = [];
  const input = h("input", { class: "multi__input", type: "text", placeholder: o.placeholder ?? "Add…", attrs: { autocomplete: "off", "aria-label": o.placeholder ?? "Add" } });
  const chips = h("span", { class: "multi__chips" });
  const box = h("div", { class: "field__input multi" }, chips, input);
  box.addEventListener("click", () => input.focus());

  const emit = () => listeners.forEach((fn) => fn([...values]));
  const paint = () => {
    chips.textContent = "";
    for (const v of values) {
      const label = o.options.find((x) => x.value === v)?.label ?? v;
      chips.append(
        h("span", { class: "chip" }, label,
          h("button", {
            class: "chip__x", type: "button", attrs: { "aria-label": `Remove ${label}` },
            onclick: (/** @type {Event} */ ev) => { ev.stopPropagation(); values = values.filter((x) => x !== v); paint(); lb.rerender(); emit(); },
          }, icon("x"))));
    }
  };
  const lb = attachListbox(input, () => o.options, (opt) => {
    values = values.includes(opt.value) ? values.filter((x) => x !== opt.value) : [...values, opt.value];
    input.value = "";
    paint();
    lb.rerender();
    emit();
  }, (opt) => values.includes(opt.value), box);

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Backspace" && !input.value && values.length) {
      values = values.slice(0, -1);
      paint();
      emit();
    }
  });
  paint();
  return { el: box, input, getValue: () => [...values], setValue: (v) => { values = [...v]; paint(); }, onChange: (fn) => listeners.push(fn) };
}

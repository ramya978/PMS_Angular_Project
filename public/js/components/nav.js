// @ts-check
/**
 * Tabs, Stepper (wizards) and Accordion.
 */
import { h } from "../core/dom.js";
import { icon } from "./icons.js";
import { nextId } from "./fields.js";

/**
 * WAI-ARIA tabs with arrow-key navigation. Panels are shown/hidden; `onChange` fires with the tab id.
 * @param {{ tabs: Array<{ id: string, label: string, count?: number, panel: Node | (() => Node) }>, selected?: string, label?: string, onChange?: (id: string) => void }} o
 * @returns {{ el: HTMLElement, select: (id: string) => void, selected: () => string }}
 */
export function tabs(o) {
  const base = nextId("tabs");
  let current = o.selected ?? o.tabs[0].id;
  const rendered = new Set();
  const list = h("div", { class: "tabs__list", attrs: { role: "tablist", "aria-label": o.label ?? null } });
  const panels = h("div", { class: "tabs__panels" });
  const btns = o.tabs.map((t) =>
    h("button", {
      class: "tabs__tab", type: "button", id: `${base}-${t.id}`, dataset: { tab: t.id },
      attrs: { role: "tab", "aria-controls": `${base}-${t.id}-p` },
      onclick: () => select(t.id),
    }, t.label, t.count !== undefined ? h("span", { class: "tabs__count" }, String(t.count)) : null));
  const panelEls = o.tabs.map((t) => h("div", { class: "tabs__panel", id: `${base}-${t.id}-p`, attrs: { role: "tabpanel", "aria-labelledby": `${base}-${t.id}`, tabindex: "0", hidden: true } }));
  list.append(...btns);
  panels.append(...panelEls);

  function select(/** @type {string} */ id, focus = false) {
    current = id;
    o.tabs.forEach((t, i) => {
      const on = t.id === id;
      btns[i].setAttribute("aria-selected", String(on));
      btns[i].tabIndex = on ? 0 : -1;
      panelEls[i].hidden = !on;
      if (on && !rendered.has(t.id)) {
        rendered.add(t.id);
        panelEls[i].append(typeof t.panel === "function" ? t.panel() : t.panel); // panels are built when first opened
      }
      if (on && focus) btns[i].focus();
    });
    o.onChange?.(id);
  }
  list.addEventListener("keydown", (ev) => {
    const i = o.tabs.findIndex((t) => t.id === current);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: o.tabs.length - 1 }[/** @type {"Home"} */ (ev.key)];
    if (next === undefined) return;
    ev.preventDefault();
    select(o.tabs[(next + o.tabs.length) % o.tabs.length].id, true);
  });
  select(current);
  return { el: h("div", { class: "tabs" }, list, panels), select: (id) => select(id, false), selected: () => current };
}

/**
 * Step indicator for wizards (Import Rooms, Rate Plan form…).
 * @param {{ steps: string[], current: number }} o  `current` is 0-based
 */
export function stepper(o) {
  return h("ol", { class: "steps", attrs: { "aria-label": "Progress" } }, o.steps.map((label, i) => {
    const state = i < o.current ? "done" : i === o.current ? "current" : "todo";
    return h("li", { class: `steps__item is-${state}`, attrs: { "aria-current": state === "current" ? "step" : null } },
      h("span", { class: "steps__dot", attrs: { "aria-hidden": "true" } }, state === "done" ? icon("check", { size: 14 }) : String(i + 1)),
      h("span", { class: "steps__label" }, label, h("span", { class: "visually-hidden" }, state === "done" ? " (done)" : state === "current" ? " (current step)" : "")));
  }));
}

/**
 * Accordion: one or many panels open. Each header is a real button with aria-expanded.
 * @param {{ items: Array<{ id: string, title: string, content: Node | (() => Node), open?: boolean }>, multiple?: boolean }} o
 */
export function accordion(o) {
  const base = nextId("acc");
  const root = h("div", { class: "accordion" });
  const items = o.items.map((it) => {
    const body = h("div", { class: "accordion__body", id: `${base}-${it.id}`, attrs: { role: "region", hidden: true } });
    let built = false;
    const head = h("button", {
      class: "accordion__head", type: "button", attrs: { "aria-expanded": "false", "aria-controls": `${base}-${it.id}` },
      onclick: () => toggle(it.id),
    }, h("span", {}, it.title), icon("chevron-down", { class: "accordion__chev" }));
    const el = h("div", { class: "accordion__item" }, h("h3", { class: "accordion__h" }, head), body);
    const set = (/** @type {boolean} */ open) => {
      head.setAttribute("aria-expanded", String(open));
      body.hidden = !open;
      el.classList.toggle("is-open", open);
      if (open && !built) { built = true; body.append(typeof it.content === "function" ? it.content() : it.content); }
    };
    return { id: it.id, el, set, isOpen: () => head.getAttribute("aria-expanded") === "true" };
  });
  function toggle(/** @type {string} */ id) {
    for (const it of items) {
      if (it.id === id) it.set(!it.isOpen());
      else if (!o.multiple) it.set(false);
    }
  }
  items.forEach((it, i) => it.set(!!o.items[i].open));
  root.append(...items.map((i) => i.el));
  return root;
}

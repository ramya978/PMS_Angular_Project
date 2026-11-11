// @ts-check
/**
 * Dropdown menu (role="menu") opened from a button: arrow keys, Home/End, Enter, Esc, type-to-focus is not needed.
 */
import { h } from "../core/dom.js";
import { formatKeys } from "../core/shortcuts.js";
import { icon } from "./icons.js";
import { openPopover } from "./overlay.js";

/**
 * @typedef {Object} MenuItem
 * @property {string} [label]
 * @property {string} [icon]
 * @property {string} [href]
 * @property {() => void} [onClick]
 * @property {string} [keys]       shortcut shown on the right
 * @property {boolean} [disabled]
 * @property {boolean} [separator]
 * @property {string} [title]      small group title row
 */

/**
 * @param {HTMLElement} anchor
 * @param {MenuItem[]} items
 * @param {{ label: string, placement?: "bottom-start" | "bottom-end" }} o
 */
export function openMenu(anchor, items, o) {
  const pop = openPopover({
    anchor, label: o.label, role: "menu", placement: o.placement ?? "bottom-start", focusFirst: false,
    content: () =>
      h("div", { class: "menu" }, items.map((it) => {
        if (it.separator) return h("hr", { class: "menu__sep", attrs: { role: "separator" } });
        if (it.title) return h("div", { class: "menu__title", attrs: { role: "presentation" } }, it.title);
        const content = [it.icon ? icon(it.icon) : null, h("span", {}, it.label), it.keys ? h("kbd", { class: "kbd" }, formatKeys(it.keys)) : null];
        const common = { class: "menu__item", attrs: { role: "menuitem", tabindex: "-1", "aria-disabled": it.disabled ? "true" : null } };
        return it.href && !it.disabled
          ? h("a", { ...common, href: it.href }, content)
          : h("button", { ...common, type: "button", onclick: () => { if (it.disabled) return; pop.close(); it.onClick?.(); } }, content);
      })),
  });
  const entries = /** @type {HTMLElement[]} */ ([...pop.el.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')]);
  entries[0]?.focus();
  pop.el.addEventListener("keydown", (ev) => {
    const i = entries.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    if (ev.key === "ArrowDown") { ev.preventDefault(); entries[(i + 1) % entries.length]?.focus(); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); entries[(i - 1 + entries.length) % entries.length]?.focus(); }
    else if (ev.key === "Home") { ev.preventDefault(); entries[0]?.focus(); }
    else if (ev.key === "End") { ev.preventDefault(); entries.at(-1)?.focus(); }
    else if (ev.key === "Tab") pop.close();
  });
  return pop;
}

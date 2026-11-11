// @ts-check
import { h } from "../core/dom.js";
import { icon } from "./icons.js";
import { tooltip } from "./overlay.js";

/**
 * Button. Variants: primary (Forest Green), secondary, ghost, gold (accent), danger. `loading` shows a spinner and blocks clicks.
 * @param {Object} o
 * @param {string} [o.label]
 * @param {"primary" | "secondary" | "ghost" | "danger" | "gold"} [o.variant]
 * @param {string} [o.icon] sprite icon name
 * @param {string} [o.ariaLabel] required for icon-only buttons
 * @param {string} [o.tip] tooltip text
 * @param {string} [o.keys] shortcut shown in the tooltip
 * @param {boolean} [o.loading]
 * @param {boolean} [o.disabled]
 * @param {"button" | "submit"} [o.type]
 * @param {(ev: MouseEvent) => void | Promise<void>} [o.onclick] may be async – the button shows loading until it settles
 * @param {string} [o.class]
 * @returns {HTMLButtonElement & { setLoading: (on: boolean) => void }}
 * @example button({ label: "Save", variant: "primary", onclick: save })
 */
export function button(o) {
  const variant = o.variant ?? "secondary";
  const iconOnly = !o.label;
  const el = /** @type {HTMLButtonElement & { setLoading: (on: boolean) => void }} */ (
    h("button", {
      class: `btn${variant === "secondary" ? "" : ` btn--${variant}`}${iconOnly ? " btn--icon" : ""}${o.class ? ` ${o.class}` : ""}`,
      type: o.type ?? "button",
      attrs: { "aria-label": o.ariaLabel ?? null },
    })
  );
  if (o.icon) el.append(icon(o.icon));
  if (o.label) el.append(h("span", { class: "btn__label" }, o.label));
  if (o.disabled) el.disabled = true;

  el.setLoading = (on) => {
    el.classList.toggle("is-loading", on);
    el.setAttribute("aria-busy", String(on));
    el.querySelector(".spinner")?.remove();
    if (on) el.prepend(h("span", { class: "spinner", attrs: { "aria-hidden": "true" } }));
  };
  if (o.loading) el.setLoading(true);

  if (o.onclick) {
    const handler = o.onclick;
    el.addEventListener("click", async (ev) => {
      if (el.classList.contains("is-loading")) return;
      const out = handler(ev);
      if (out instanceof Promise) {
        el.setLoading(true);
        try {
          await out;
        } finally {
          el.setLoading(false);
        }
      }
    });
  }
  if (o.tip) tooltip(el, o.tip, o.keys);
  return el;
}

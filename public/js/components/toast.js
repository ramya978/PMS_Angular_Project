// @ts-check
import { h } from "../core/dom.js";
import { icon } from "./icons.js";

/**
 * @typedef {Object} ToastOptions
 * @property {string} message
 * @property {"success" | "error" | "info" | "warning"} [type]
 * @property {{ label: string, onClick: () => void | Promise<void> }} [action]  e.g. Undo
 * @property {number} [duration] ms before it closes itself (default 5000; 8000 with an action; errors stay until closed)
 *
 * @typedef {{ dismiss: () => void, el: HTMLElement }} ToastHandle
 */

const ICONS = { success: "check-circle", error: "x-circle", info: "info", warning: "alert" };

/** @returns {HTMLElement} */
function region() {
  let r = document.getElementById("toast-region");
  if (!r) {
    r = h("div", { id: "toast-region", class: "toast-region", attrs: { "aria-live": "polite", "aria-atomic": "false", role: "region", "aria-label": "Notifications" } });
    document.body.append(r);
  }
  return r;
}

/**
 * Show a toast. Use `action` for Undo on reversible actions.
 * @param {ToastOptions} o
 * @returns {ToastHandle}
 * @example toast({ message: "Booking cancelled", action: { label: "Undo", onClick: restore } })
 */
export function toast(o) {
  const type = o.type ?? "success";
  let timer = 0;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.add("is-leaving");
    setTimeout(() => el.remove(), 180);
  };
  const el = h("div", { class: `toast toast--${type}`, attrs: { role: type === "error" ? "alert" : "status" } },
    h("span", { class: "toast__icon" }, icon(ICONS[type])),
    h("span", { class: "toast__msg" }, o.message),
    o.action
      ? h("button", {
          class: "toast__action", type: "button",
          onclick: async () => {
            await o.action?.onClick();
            dismiss();
          },
        }, o.action.label)
      : null,
    h("button", { class: "toast__close", type: "button", attrs: { "aria-label": "Dismiss notification" }, onclick: dismiss }, icon("x"))
  );
  region().append(el);

  const duration = o.duration ?? (type === "error" ? 0 : o.action ? 8000 : 5000);
  const start = () => {
    if (duration > 0) timer = window.setTimeout(dismiss, duration);
  };
  el.addEventListener("mouseenter", () => clearTimeout(timer));
  el.addEventListener("mouseleave", start);
  start();
  return { dismiss, el };
}

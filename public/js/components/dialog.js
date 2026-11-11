// @ts-check
/**
 * Dialog and Drawer built on the native <dialog> element (focus trap and Esc come from the browser).
 * Pop-ups written in a page's HTML as <dialog data-code="RS-05a"> open from any [data-opens="RS-05a"] button
 * through initDeclarativeDialogs().
 */
import { h, append } from "../core/dom.js";
import { icon } from "./icons.js";
import { button } from "./button.js";

/**
 * @typedef {Object} DialogAction
 * @property {string} label
 * @property {"primary" | "secondary" | "ghost" | "danger" | "gold"} [variant]
 * @property {any} [value]       what the dialog's result resolves to
 * @property {boolean} [keepOpen] run onClick but do not close
 * @property {(ev: Event) => void | Promise<void>} [onClick]
 *
 * @typedef {Object} DialogOptions
 * @property {string} [code]       screen code, written to data-code
 * @property {string} title
 * @property {string} [description]
 * @property {Node | string | (() => Node)} body
 * @property {DialogAction[]} [actions] rendered in the footer, last one is the main action
 * @property {"sm" | "md" | "lg" | "xl"} [size]
 * @property {"dialog" | "drawer"} [kind]
 * @property {boolean} [dismissible]  Esc / backdrop click close it (default true)
 * @property {() => boolean | Promise<boolean>} [beforeClose]  return false to keep it open (unsaved-changes guard)
 * @property {HTMLElement | null} [returnFocus]
 *
 * @typedef {Object} DialogHandle
 * @property {HTMLDialogElement} el
 * @property {Promise<any>} result resolves with the action value (undefined when dismissed)
 * @property {(value?: any) => Promise<void>} close
 */

let uid = 0;

/**
 * Open a modal dialog (or a right-hand drawer with kind: "drawer").
 * @param {DialogOptions} o
 * @returns {DialogHandle}
 */
export function openDialog(o) {
  const kind = o.kind ?? "dialog";
  const titleId = `dlg-title-${++uid}`;
  const dlg = /** @type {HTMLDialogElement} */ (
    h("dialog", { class: `dialog dialog--${o.size ?? "md"} ${kind === "drawer" ? "drawer" : ""}`, attrs: { "aria-labelledby": titleId } })
  );
  if (o.code) dlg.dataset.code = o.code;

  const opener = o.returnFocus ?? /** @type {HTMLElement | null} */ (document.activeElement);
  /** @type {any} */
  let outcome;
  let resolveResult = /** @type {(v: any) => void} */ (() => {});
  const result = new Promise((res) => (resolveResult = res));

  const close = async (/** @type {any} */ value) => {
    if (o.beforeClose && value === undefined && (await o.beforeClose()) === false) return;
    outcome = value;
    dlg.close();
    finish(); // do not wait for the native "close" event – the result is ready as soon as we close it
  };
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    dlg.remove();
    opener?.focus?.();
    resolveResult(outcome);
  };

  const body = h("div", { class: "dialog__body" });
  const content = typeof o.body === "function" ? o.body() : o.body;
  append(body, content);

  dlg.append(
    h("header", { class: "dialog__header" },
      h("div", {},
        h("h2", { class: "dialog__title", id: titleId }, o.title),
        o.description ? h("p", { class: "dialog__desc" }, o.description) : null),
      h("button", { class: "btn btn--ghost btn--icon", type: "button", attrs: { "aria-label": "Close" }, onclick: () => close() }, icon("x"))),
    body,
    o.actions?.length
      ? h("footer", { class: "dialog__footer" },
          o.actions.map((a) =>
            button({
              label: a.label,
              variant: a.variant ?? "secondary",
              onclick: async (ev) => {
                await a.onClick?.(ev);
                if (!a.keepOpen) await close(Object.hasOwn(a, "value") ? a.value : a.label); // value: null is a real answer (“cancelled”)
              },
            })))
      : null
  );

  dlg.addEventListener("cancel", (ev) => {
    ev.preventDefault(); // Esc: go through close() so the guard runs
    if (o.dismissible !== false) void close();
  });
  dlg.addEventListener("click", (ev) => {
    if (ev.target === dlg && o.dismissible !== false) void close(); // backdrop
  });
  dlg.addEventListener("close", finish); // closed by something other than close() (e.g. a form method="dialog")

  document.body.append(dlg);
  dlg.showModal();
  const auto = /** @type {HTMLElement | null} */ (dlg.querySelector("[autofocus]"));
  auto?.focus();
  return { el: dlg, result, close: async (v) => close(v ?? undefined) };
}

/**
 * Right-hand side panel.
 * @param {Omit<DialogOptions, "kind">} o
 */
export const openDrawer = (o) => openDialog({ ...o, kind: "drawer", size: o.size ?? "md" });

/**
 * Wire up dialogs written in the page HTML: any [data-opens="CODE"] element opens <dialog data-code="CODE">,
 * [data-close] inside a dialog closes it, Esc and backdrop clicks close it.
 * @param {ParentNode} [root]
 */
export function initDeclarativeDialogs(root = document) {
  root.addEventListener("click", (ev) => {
    const t = /** @type {HTMLElement} */ (ev.target);
    const trigger = t.closest?.("[data-opens]");
    if (trigger) {
      const dlg = /** @type {HTMLDialogElement | null} */ (document.querySelector(`dialog[data-code="${trigger.getAttribute("data-opens")}"]`));
      if (dlg && !dlg.open) {
        dlg.showModal();
        /** @type {HTMLElement | null} */ (dlg.querySelector("[autofocus]"))?.focus();
      }
      return;
    }
    const closer = t.closest?.("[data-close]");
    if (closer) /** @type {HTMLDialogElement | null} */ (closer.closest("dialog"))?.close();
    if (t instanceof HTMLDialogElement && t.open && t.dataset.code) t.close(); // backdrop click
  });
}

// @ts-check
/**
 * Confirm Action (CM-P07) – "Are you sure?" for cancelling, voiding or deleting. Only for destructive or hard-to-undo actions
 * (reversible ones use a toast with Undo instead).
 */
import { h } from "../core/dom.js";
import { openDialog } from "./dialog.js";
import { field, textInput } from "./fields.js";

/**
 * @param {Object} o
 * @param {string} o.title                 e.g. "Cancel reservation FK-10234?"
 * @param {string} [o.message]
 * @param {Node} [o.details]               extra content (what will happen, amounts)
 * @param {string} [o.confirmLabel]        e.g. "Cancel booking"
 * @param {string} [o.cancelLabel]         e.g. "Keep booking"
 * @param {boolean} [o.danger]             red confirm button
 * @param {string} [o.typeToConfirm]       the person must type this word first (for very destructive actions)
 * @returns {Promise<boolean>} true only when the person confirmed
 */
export async function confirmAction(o) {
  const typed = o.typeToConfirm ? field({ label: `Type ${o.typeToConfirm} to confirm`, control: textInput({ autocomplete: "off" }) }) : null;
  const body = h("div", { class: "stack" }, o.message ? h("p", {}, o.message) : null, o.details ?? null, typed?.el ?? null);
  const dlg = openDialog({
    code: "CM-P07", title: o.title, body, size: "sm",
    actions: [
      { label: o.cancelLabel ?? "Cancel", variant: "secondary", value: false },
      {
        label: o.confirmLabel ?? "Confirm", variant: o.danger ? "danger" : "primary", value: true, keepOpen: !!typed,
        onClick: async () => {
          if (!typed) return;
          if (typed.control.getValue().trim().toLowerCase() !== o.typeToConfirm?.toLowerCase()) {
            typed.setError(`Type ${o.typeToConfirm} exactly to continue.`);
            typed.control.input.focus();
            return;
          }
          await dlg.close(true);
        },
      },
    ],
  });
  return (await dlg.result) === true;
}

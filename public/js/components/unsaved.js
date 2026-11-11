// @ts-check
/**
 * Unsaved Changes (CM-P05). On a form with unsaved edits, leaving the page (a link, Back, closing the tab) asks:
 * Save and leave · Discard changes · Keep editing.
 *
 *   const guard = trackUnsaved({ isDirty: () => form.dirty, save: async () => { await saveForm(); } });
 *   // after a successful save you can leave freely; call guard.release() when the form is closed
 */
import { h } from "../core/dom.js";
import { openDialog } from "./dialog.js";

/**
 * @returns {Promise<"save" | "discard" | "cancel">}
 * @param {{ title?: string, message?: string, canSave?: boolean }} [o]
 */
export async function openUnsavedChanges(o = {}) {
  const actions = /** @type {import("./dialog.js").DialogAction[]} */ ([
    { label: "Keep editing", variant: "secondary", value: "cancel" },
    { label: "Discard changes", variant: "danger", value: "discard" },
  ]);
  if (o.canSave !== false) actions.push({ label: "Save and leave", variant: "primary", value: "save" });
  const dlg = openDialog({ code: "CM-P05", title: o.title ?? "Leave without saving?", body: h("p", {}, o.message ?? "You have changes that are not saved yet. If you leave now, they will be lost."), size: "sm", actions });
  const r = await dlg.result;
  return r === "save" || r === "discard" ? r : "cancel";
}

/**
 * A guard for the `beforeClose` option of openDialog(): asks before closing a dialog with unsaved edits.
 * @param {() => boolean} isDirty
 * @returns {() => Promise<boolean>}
 */
export const guardClose = (isDirty) => async () => (isDirty() ? (await openUnsavedChanges({ canSave: false })) === "discard" : true);

/**
 * Watch a form: in-page links and closing the tab ask first while `isDirty()` is true.
 * @param {{ isDirty: () => boolean, save?: () => Promise<void> | void }} o
 * @returns {{ release: () => void }}
 */
export function trackUnsaved(o) {
  /** @param {BeforeUnloadEvent} ev */
  const onBeforeUnload = (ev) => {
    if (!o.isDirty()) return;
    ev.preventDefault();
    ev.returnValue = "";
  };
  /** @param {MouseEvent} ev */
  const onClick = async (ev) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || !o.isDirty()) return;
    const a = /** @type {HTMLAnchorElement | null} */ ((/** @type {HTMLElement} */ (ev.target)).closest?.("a[href]"));
    if (!a || a.target === "_blank" || a.hasAttribute("download") || a.origin !== location.origin || a.getAttribute("href")?.startsWith("#")) return;
    ev.preventDefault();
    const choice = await openUnsavedChanges({ canSave: !!o.save });
    if (choice === "cancel") return;
    if (choice === "save") {
      try {
        await o.save?.();
      } catch {
        return; // saving failed: stay on the page so nothing is lost
      }
    }
    window.removeEventListener("beforeunload", onBeforeUnload);
    location.assign(a.href);
  };
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("click", onClick, true);
  return {
    release() {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    },
  };
}

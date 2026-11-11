// @ts-check
/** Session Timeout Warning (CM-P06): a countdown with "Stay signed in" and "Sign out". It cannot be dismissed by accident. */
import { h } from "../core/dom.js";
import { openDialog } from "./dialog.js";

/** @param {number} ms */
export const clock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

/**
 * @param {{ remainingMs: () => number, onStay: () => void, onSignOut: () => void }} o
 * @returns {{ close: () => void, el: HTMLDialogElement }}
 */
export function openSessionWarning(o) {
  const count = h("strong", { class: "num", attrs: { "aria-hidden": "true" } }, clock(o.remainingMs()));
  const live = h("span", { class: "visually-hidden", attrs: { role: "timer", "aria-live": "polite" } }, "");
  const body = h("div", { class: "stack" }, h("p", {}, "You have been inactive for a while. For your security you will be signed out in ", count, ". Unsaved changes will be lost."), live);
  const dlg = openDialog({
    code: "CM-P06", title: "Are you still there?", body, size: "sm", dismissible: false,
    actions: [
      { label: "Sign out", variant: "secondary", value: "out", onClick: () => o.onSignOut() },
      { label: "Stay signed in", variant: "primary", value: "stay", onClick: () => o.onStay() },
    ],
  });
  let lastSpoken = -1;
  const timer = window.setInterval(() => {
    const ms = o.remainingMs();
    count.textContent = clock(ms);
    const step = Math.floor(ms / 15000); // announce every 15 seconds, not every second
    if (step !== lastSpoken) { lastSpoken = step; live.textContent = `You will be signed out in ${Math.ceil(ms / 1000)} seconds.`; }
  }, 500);
  void dlg.result.then(() => clearInterval(timer));
  return { close: () => void dlg.close("closed"), el: dlg.el };
}

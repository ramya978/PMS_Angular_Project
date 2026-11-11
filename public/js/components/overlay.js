// @ts-check
/**
 * Popover and tooltip. Popovers are positioned with fixed coordinates, flip when there is no room,
 * close on Esc or outside click, and live inside the nearest open <dialog> (anything outside a modal dialog is inert).
 */
import { h } from "../core/dom.js";
import { formatKeys } from "../core/shortcuts.js";

/**
 * Place `pop` next to `anchor`.
 * @param {HTMLElement} anchor
 * @param {HTMLElement} pop
 * @param {{ placement?: "bottom-start" | "bottom-end" | "top-start" | "right-start", gap?: number, matchWidth?: boolean }} [opts]
 */
export function positionPopover(anchor, pop, opts = {}) {
  const { placement = "bottom-start", gap = 6, matchWidth = false } = opts;
  const a = anchor.getBoundingClientRect();
  if (matchWidth) pop.style.minWidth = `${a.width}px`;
  pop.style.position = "fixed";
  pop.style.left = "0px";
  pop.style.top = "0px";
  const p = pop.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  let top = placement.startsWith("top") ? a.top - p.height - gap : a.bottom + gap;
  let left = placement === "bottom-end" ? a.right - p.width : placement === "right-start" ? a.right + gap : a.left;
  if (placement === "right-start") top = a.top;
  // flip vertically when it would leave the screen
  if (top + p.height > vh - 8 && a.top - p.height - gap > 8) top = a.top - p.height - gap;
  if (top < 8) top = 8;
  left = Math.max(8, Math.min(left, vw - p.width - 8));
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
  pop.style.maxHeight = `${Math.max(160, vh - top - 12)}px`;
}

/**
 * Open a popover next to an anchor.
 * @param {Object} o
 * @param {HTMLElement} o.anchor
 * @param {Node | (() => Node)} o.content
 * @param {string} [o.label] accessible name
 * @param {string} [o.role] default "dialog"
 * @param {"bottom-start" | "bottom-end" | "top-start" | "right-start"} [o.placement]
 * @param {boolean} [o.matchWidth]
 * @param {boolean} [o.focusFirst] move focus into the popover (default true)
 * @param {() => void} [o.onClose]
 * @returns {{ el: HTMLElement, close: () => void, reposition: () => void }}
 */
export function openPopover(o) {
  const el = h("div", { class: "popover", attrs: { role: o.role ?? "dialog", "aria-label": o.label ?? null, tabindex: "-1" } });
  el.append(typeof o.content === "function" ? o.content() : o.content);
  (o.anchor.closest("dialog[open]") ?? document.body).append(el);

  const reposition = () => positionPopover(o.anchor, el, { placement: o.placement, matchWidth: o.matchWidth });
  reposition();

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
    el.remove();
    o.onClose?.();
  };
  /** @param {PointerEvent} ev */
  function onOutside(ev) {
    const t = /** @type {Node} */ (ev.target);
    if (!el.contains(t) && !o.anchor.contains(t)) close();
  }
  /** @param {KeyboardEvent} ev */
  function onKey(ev) {
    if (ev.key === "Escape") {
      ev.stopPropagation();
      ev.preventDefault();
      close();
      o.anchor.focus?.();
    }
  }
  document.addEventListener("pointerdown", onOutside, true);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);

  if (o.focusFirst !== false) {
    const first = /** @type {HTMLElement | null} */ (el.querySelector('[autofocus], input, button, [href], [tabindex]:not([tabindex="-1"]), [role="option"]'));
    (first ?? el).focus({ preventScroll: true });
  }
  return { el, close, reposition };
}

/* ───────────── Tooltip ───────────── */

let tipEl = /** @type {HTMLElement | null} */ (null);
let tipTimer = 0;

function ensureTip() {
  if (!tipEl) {
    tipEl = h("div", { class: "tooltip", attrs: { role: "tooltip", id: "aviv-tooltip", hidden: true } });
    document.body.append(tipEl);
  }
  return tipEl;
}

/** @param {HTMLElement} target @param {string} text @param {string} [keys] */
function showTip(target, text, keys) {
  const tip = ensureTip();
  tip.textContent = text;
  if (keys) tip.append(h("kbd", { class: "kbd" }, formatKeys(keys)));
  tip.hidden = false;
  positionPopover(target, tip, { placement: "bottom-start", gap: 8 });
}
function hideTip() {
  clearTimeout(tipTimer);
  if (tipEl) tipEl.hidden = true;
}

/**
 * Show a tooltip on hover and keyboard focus. Adds aria-describedby (not a replacement for a visible label).
 * @param {HTMLElement} el
 * @param {string} text
 * @param {string} [keys] shortcut to show, e.g. "Ctrl+K"
 * @returns {HTMLElement} the same element
 */
export function tooltip(el, text, keys) {
  ensureTip();
  el.setAttribute("aria-describedby", "aviv-tooltip");
  el.addEventListener("mouseenter", () => {
    clearTimeout(tipTimer);
    tipTimer = window.setTimeout(() => showTip(el, text, keys), 350);
  });
  el.addEventListener("focus", () => showTip(el, text, keys));
  el.addEventListener("mouseleave", hideTip);
  el.addEventListener("blur", hideTip);
  el.addEventListener("keydown", (ev) => ev.key === "Escape" && hideTip());
  el.addEventListener("click", hideTip);
  return el;
}

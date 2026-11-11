// @ts-check
/**
 * Display components: Card, StatusPill, Avatar, StatTile, KeyValue, Timeline, Breadcrumb, PageHeader, FormSection,
 * MoneyText, DateText, EmptyState, Skeleton.
 */
import { h } from "../core/dom.js";
import { formatDate, formatMoney } from "../core/format.js";
import { icon } from "./icons.js";
import { sparkline } from "./charts.js";

/**
 * @param {{ title?: string, description?: string, actions?: Node | Node[], class?: string }} o
 * @param {...any} children
 */
export function card(o, ...children) {
  return h("section", { class: `card${o.class ? ` ${o.class}` : ""}` },
    o.title || o.actions
      ? h("header", { class: "card__head" },
          h("div", {}, o.title ? h("h2", { class: "card__title" }, o.title) : null, o.description ? h("p", { class: "card__desc" }, o.description) : null),
          o.actions ? h("div", { class: "row" }, o.actions) : null)
      : null,
    children);
}

/** Status → label, icon and colour class. Status is never shown by colour alone (icon + label always). */
export const STATUS = /** @type {const} */ ({
  ready: { label: "Ready", icon: "check-circle", cls: "ready" },
  clean: { label: "Clean", icon: "check-circle", cls: "ready" },
  dirty: { label: "Dirty", icon: "alert", cls: "dirty" },
  occupied: { label: "Occupied", icon: "user", cls: "occupied" },
  "out-of-order": { label: "Out of order", icon: "lock", cls: "ooo" },
  tentative: { label: "Tentative", icon: "clock", cls: "tentative" },
  confirmed: { label: "Confirmed", icon: "check", cls: "ready" },
  guaranteed: { label: "Confirmed – Guaranteed", icon: "shield-check", cls: "ready" },
  "checked-in": { label: "Checked in", icon: "key", cls: "occupied" },
  "checked-out": { label: "Checked out", icon: "log-out", cls: "ooo" },
  cancelled: { label: "Cancelled", icon: "x-circle", cls: "cancelled" },
  "no-show": { label: "No-show", icon: "user-x", cls: "cancelled" },
  waitlisted: { label: "Waitlisted", icon: "clock", cls: "tentative" },
  vip: { label: "VIP", icon: "star", cls: "vip" },
});

/**
 * @param {keyof typeof STATUS} status
 * @param {{ label?: string }} [o]
 */
export function statusPill(status, o = {}) {
  const s = STATUS[status];
  return h("span", { class: `pill pill--${s.cls}`, dataset: { status } }, icon(s.icon, { size: 14 }), o.label ?? s.label);
}

/**
 * Initials in a coloured circle (colour is derived from the name so the same guest always looks the same).
 * @param {string} name
 * @param {{ size?: number }} [o]
 */
export function avatar(name, o = {}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  const size = o.size ?? 32;
  return h("span", {
    class: "avatar", attrs: { "aria-hidden": "true", style: `--av-h:${hash};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px` },
  }, initials);
}

/**
 * KPI tile with optional trend and sparkline. Numbers count up (skipped with reduced motion).
 * @param {{ label: string, value: number, format?: (n: number) => string, delta?: number, deltaLabel?: string, trend?: number[], href?: string, icon?: string }} o
 */
export function statTile(o) {
  const fmt = o.format ?? ((/** @type {number} */ n) => String(n));
  const valueEl = h("div", { class: "stat__value num" }, fmt(0));
  const el = h(o.href ? "a" : "div", { class: "stat", href: o.href },
    h("div", { class: "stat__label" }, o.icon ? icon(o.icon, { size: 16 }) : null, o.label),
    valueEl,
    o.delta !== undefined
      ? h("div", { class: `stat__delta ${o.delta >= 0 ? "is-up" : "is-down"}` },
          icon(o.delta >= 0 ? "trending-up" : "trending-down", { size: 14 }),
          `${o.delta >= 0 ? "+" : ""}${o.delta}%`, o.deltaLabel ? h("span", { class: "stat__delta-label" }, ` ${o.deltaLabel}`) : null)
      : null,
    o.trend ? h("div", { class: "stat__spark" }, sparkline(o.trend, { width: 120, height: 32, label: `${o.label} trend` })) : null);

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce || o.value === 0) valueEl.textContent = fmt(o.value);
  else {
    const t0 = performance.now();
    const dur = 700;
    const tick = (/** @type {number} */ now) => {
      const p = Math.min(1, (now - t0) / dur);
      valueEl.textContent = fmt(Math.round(o.value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  return el;
}

/**
 * Definition list.
 * @param {Array<[string, Node | string | number | null]>} pairs
 */
export function keyValue(pairs) {
  return h("dl", { class: "kv" }, pairs.map(([k, v]) => h("div", { class: "kv__row" }, h("dt", {}, k), h("dd", {}, v ?? "–"))));
}

/**
 * Vertical timeline (history, audit trail).
 * @param {Array<{ title: string, meta?: string, body?: string | Node, icon?: string }>} items
 */
export function timeline(items) {
  return h("ol", { class: "timeline" }, items.map((it) =>
    h("li", { class: "timeline__item" },
      h("span", { class: "timeline__dot", attrs: { "aria-hidden": "true" } }, it.icon ? icon(it.icon, { size: 12 }) : null),
      h("div", {}, h("div", { class: "timeline__title" }, it.title, it.meta ? h("span", { class: "timeline__meta" }, ` · ${it.meta}`) : null), it.body ? h("div", { class: "timeline__body" }, it.body) : null))));
}

/**
 * @param {Array<{ label: string, href?: string }>} items last item is the current page
 */
export function breadcrumb(items) {
  return h("nav", { class: "breadcrumb", attrs: { "aria-label": "Breadcrumb" } },
    h("ol", {}, items.map((it, i) => {
      const last = i === items.length - 1;
      return h("li", {}, it.href && !last ? h("a", { href: it.href }, it.label) : h("span", { attrs: { "aria-current": last ? "page" : null } }, it.label),
        last ? null : icon("chevron-right", { size: 14 }));
    })));
}

/**
 * Page title in Fraunces, one-line description, primary action top-right, screen-code chip.
 * @param {{ title: string, description?: string, code?: string, actions?: Node | Node[], breadcrumb?: Array<{ label: string, href?: string }>, headingLevel?: 1 | 2 | 3 }} o  `headingLevel` is 1 for a real page, higher for a demo inside a page
 */
export function pageHeader(o) {
  return h("header", { class: "page-header" },
    o.breadcrumb ? breadcrumb(o.breadcrumb) : null,
    h("div", { class: "page-header__row" },
      h("div", { class: "page-header__text" },
        h(`h${o.headingLevel ?? 1}`, { class: "page-header__title" }, o.title),
      ),
      h("div", { class: "page-header__actions" }, o.code ? h("span", { class: "code-chip", attrs: { title: "Screen code" } }, o.code) : null, o.actions)));
}

/**
 * Group of related fields with a heading.
 * @param {{ title: string, description?: string }} o
 * @param {...any} children
 */
export function formSection(o, ...children) {
  return h("fieldset", { class: "form-section" },
    h("legend", { class: "form-section__title" }, o.title),
    o.description ? h("p", { class: "form-section__desc" }, o.description) : null,
    h("div", { class: "form-section__grid" }, children));
}

/**
 * Money from integer paise, tabular figures, Indian grouping.
 * @param {number} paise
 * @param {{ strong?: boolean, muted?: boolean }} [o]
 */
export function moneyText(paise, o = {}) {
  return h("span", { class: `num money${o.strong ? " is-strong" : ""}${o.muted ? " is-muted" : ""}`, dataset: { paise: String(paise) } }, formatMoney(paise));
}

/**
 * Date text (hotel dates, tabular figures).
 * @param {string} iso
 * @param {"short" | "long" | "month"} [style]
 */
export function dateText(iso, style = "short") {
  return h("time", { class: "num", attrs: { datetime: iso } }, formatDate(iso, style));
}

const ILLUSTRATIONS = { list: "empty-list", search: "empty-search", error: "empty-error" };

/**
 * Empty state: illustration + one clear next step.
 * @param {{ title: string, message?: string, kind?: "list" | "search" | "error", headingLevel?: 2 | 3, action?: { label: string, onClick?: () => void, href?: string } }} o  `headingLevel` 2 when the empty state is the main content of a page
 */
export function emptyState(o) {
  const a = o.action;
  return h("div", { class: "empty", attrs: { role: "status" } },
    h("img", { class: "empty__art", src: `/assets/illustrations/${ILLUSTRATIONS[o.kind ?? "list"]}.svg`, alt: "", width: 160, height: 120 }),
    h(`h${o.headingLevel ?? 3}`, { class: "empty__title" }, o.title),
    o.message ? h("p", { class: "empty__msg" }, o.message) : null,
    a ? h(a.href ? "a" : "button", { class: "btn btn--primary", href: a.href, type: a.href ? undefined : "button", onclick: a.onClick }, a.label) : null);
}

/**
 * Error with a retry button.
 * @param {{ message?: string, onRetry: () => void, headingLevel?: 2 | 3 }} o
 */
export function errorState(o) {
  return emptyState({ headingLevel: o.headingLevel, kind: "error", title: "Something went wrong", message: o.message ?? "We could not load this. Please try again.", action: { label: "Try again", onClick: o.onRetry } });
}

/**
 * Loading placeholder.
 * @param {{ lines?: number, block?: boolean, height?: number }} [o]
 */
export function skeleton(o = {}) {
  if (o.block) return h("div", { class: "skeleton", attrs: { style: `height:${o.height ?? 120}px`, "aria-hidden": "true" } });
  return h("div", { class: "skeleton-lines", attrs: { role: "status", "aria-label": "Loading" } },
    Array.from({ length: o.lines ?? 3 }, (_, i) => h("div", { class: "skeleton skeleton--line", attrs: { style: `width:${100 - (i % 3) * 18}%` } })));
}

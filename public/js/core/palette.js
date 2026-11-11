// @ts-check
/**
 * Command palette (Ctrl/⌘ + K): fuzzy search over every screen (by name or code), actions, booking numbers,
 * with recent items and full keyboard use (↑ ↓ Enter Esc).
 */
import { h } from "./dom.js";
import { fuzzyFilter } from "./fuzzy.js";
import { SCREENS, screenUrl } from "./screens.js";
import { getUiState, setUiState, toggleTheme, toggleDensity } from "./prefs.js";
import { icon } from "../components/icons.js";
import { shortcutLabel } from "./shortcuts.js";

/**
 * @typedef {{ id: string, label: string, hint?: string, icon: string, section: string, keywords?: string, run: () => void }} Command
 */

/** @type {{ toggleSidebar: () => void, openHelp: () => void, openShortcuts: () => void }} */
const hooks = { toggleSidebar: () => {}, openHelp: () => {}, openShortcuts: () => {} };
/** Shell registers the actions only it can perform. @param {Partial<typeof hooks>} h2 */
export const setPaletteHooks = (h2) => Object.assign(hooks, h2);

const go = (/** @type {string} */ url) => () => location.assign(url);

/** Remember a visited screen for the “Recent” list. @param {string} code */
export function rememberScreen(code) {
  if (!SCREENS.some((s) => s.code === code)) return;
  const recent = /** @type {string[]} */ (getUiState("recent", [])).filter((c) => c !== code);
  setUiState("recent", [code, ...recent].slice(0, 6));
}

/** @returns {Command[]} */
function baseCommands() {
  /** @type {Command[]} */
  const cmds = [
    { id: "a-new-res", label: "New reservation", icon: "plus-circle", section: "Actions", keywords: "book booking create", run: go(screenUrl("RS-05")) },
    { id: "a-new-enq", label: "New enquiry", icon: "message-square", section: "Actions", keywords: "quote lead", run: go(screenUrl("RS-02")) },
    { id: "a-new-grp", label: "New group booking", icon: "users", section: "Actions", keywords: "block wedding conference", run: go(screenUrl("RS-14")) },
    { id: "a-rate-fcs", label: "Rate calendar for Deluxe Suite", icon: "calendar-range", section: "Actions", keywords: "prices suite DLXS", run: go(screenUrl("RSS-08", { roomType: "DLXS" })) },
    { id: "a-theme", label: "Switch light / dark theme", icon: "moon", section: "Actions", hint: shortcutLabel("theme"), run: () => toggleTheme() },
    { id: "a-density", label: "Switch Comfortable / Compact density", icon: "rows", section: "Actions", hint: shortcutLabel("density"), run: () => toggleDensity() },
    { id: "a-sidebar", label: "Collapse / expand sidebar", icon: "sidebar", section: "Actions", hint: shortcutLabel("sidebar"), run: () => hooks.toggleSidebar() },
    { id: "a-help", label: "Help for this screen", icon: "help", section: "Actions", hint: shortcutLabel("help"), run: () => hooks.openHelp() },
    { id: "a-keys", label: "Keyboard shortcuts", icon: "keyboard", section: "Actions", hint: "?", run: () => hooks.openShortcuts() },
  ];
  for (const s of SCREENS.filter((x) => x.code !== "CM-01")) {
    cmds.push({ id: `s-${s.code}`, label: s.title, hint: s.code, icon: s.icon, section: "Screens", keywords: `${s.code} ${s.purpose} ${s.group}`, run: go(screenUrl(s.code)) });
  }
  return cmds;
}

/**
 * Commands shown for a query (exported for tests).
 * @param {string} query
 * @returns {Command[]}
 */
export function commandsFor(query) {
  const all = baseCommands();
  const q = query.trim();
  if (!q) {
    const recent = /** @type {string[]} */ (getUiState("recent", []))
      .map((code) => all.find((c) => c.id === `s-${code}`))
      .filter(/** @returns {c is Command} */ (c) => !!c)
      .map((c) => ({ ...c, section: "Recent" }));
    return [...recent, ...all.filter((c) => c.section === "Actions").slice(0, 5), ...all.filter((c) => c.section === "Screens")];
  }
  /** @type {Command[]} */
  const dynamic = [];
  const booking = /^(?:fk)?[-\s]?(\d{3,7})$/i.exec(q);
  if (booking) {
    const num = `FK-${booking[1]}`;
    dynamic.push({ id: "d-booking", label: `Open booking ${num}`, hint: "RS-07", icon: "file-text", section: "Go to", run: go(screenUrl("RS-07", { id: num })) });
  }
  dynamic.push({ id: "d-search", label: `Search bookings, guests and rooms for “${q}”`, hint: "CM-02", icon: "search", section: "Go to", run: go(screenUrl("CM-02", { q })) });
  const matches = fuzzyFilter(all, q, (c) => `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`).slice(0, 14);
  return booking ? [...dynamic, ...matches] : [...matches, ...dynamic]; // a booking number goes first
}

let current = /** @type {HTMLDialogElement | null} */ (null);

export function openPalette() {
  if (current?.open) return;
  const dlg = /** @type {HTMLDialogElement} */ (h("dialog", { class: "palette", dataset: { code: "SYS-PALETTE" }, attrs: { "aria-label": "Command palette" } }));
  const input = h("input", { class: "palette__input", type: "text", placeholder: "Search screens, actions or a booking number…", attrs: { role: "combobox", "aria-expanded": "true", "aria-controls": "palette-list", "aria-autocomplete": "list", autocomplete: "off", spellcheck: "false", "aria-label": "Search commands" } });
  const list = h("ul", { class: "palette__list", id: "palette-list", attrs: { role: "listbox", "aria-label": "Results" } });
  const foot = h("div", { class: "palette__foot" }, h("span", {}, h("kbd", { class: "kbd" }, "↑↓"), " move"), h("span", {}, h("kbd", { class: "kbd" }, "Enter"), " open"), h("span", {}, h("kbd", { class: "kbd" }, "Esc"), " close"));
  dlg.append(h("div", { class: "palette__head" }, icon("search"), input), list, foot);

  /** @type {Command[]} */
  let items = [];
  let active = 0;

  const draw = () => {
    items = commandsFor(input.value);
    list.textContent = "";
    let section = "";
    items.forEach((c, i) => {
      if (c.section !== section) {
        section = c.section;
        list.append(h("li", { class: "palette__section", attrs: { role: "presentation" } }, section));
      }
      list.append(h("li", {
        class: "palette__item", id: `pal-${i}`, attrs: { role: "option", "aria-selected": String(i === active) },
        onclick: () => choose(i), onmousemove: () => { if (active !== i) setActive(i, false); },
      }, icon(c.icon), h("span", { class: "palette__label" }, c.label), c.hint ? h("span", { class: "palette__hint" }, c.hint) : null));
    });
    if (!items.length) list.append(h("li", { class: "palette__empty", attrs: { role: "presentation" } }, "Nothing found. Try a screen name or a code such as RS-05."));
    setActive(Math.min(active, Math.max(0, items.length - 1)), true);
  };
  const setActive = (/** @type {number} */ i, /** @type {boolean} */ scroll) => {
    active = i;
    list.querySelectorAll(".palette__item").forEach((el, idx) => el.setAttribute("aria-selected", String(idx === i)));
    input.setAttribute("aria-activedescendant", `pal-${i}`);
    if (scroll) list.querySelector(`#pal-${i}`)?.scrollIntoView({ block: "nearest" });
  };
  const choose = (/** @type {number} */ i) => {
    const c = items[i];
    if (!c) return;
    dlg.close();
    c.run();
  };

  input.addEventListener("input", () => { active = 0; draw(); });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown") { ev.preventDefault(); setActive((active + 1) % Math.max(1, items.length), true); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setActive((active - 1 + items.length) % Math.max(1, items.length), true); }
    else if (ev.key === "Enter") { ev.preventDefault(); choose(active); }
  });
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
  dlg.addEventListener("close", () => { dlg.remove(); current = null; opener?.focus?.(); });

  const opener = /** @type {HTMLElement | null} */ (document.activeElement);
  document.body.append(dlg);
  current = dlg;
  dlg.showModal();
  draw();
  input.focus();
}

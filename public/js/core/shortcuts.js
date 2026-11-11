// @ts-check
/**
 * Keyboard shortcut registry. Keys are written "Ctrl+K" (Ctrl on Windows, ⌘ on Mac), "Shift+/", "?", or a
 * chord of steps separated by a space: "g d" (press g, then d). Shortcuts are ignored while typing in a field,
 * except those with Ctrl/⌘ or Esc.
 */

/**
 * @typedef {Object} Shortcut
 * @property {string} id
 * @property {string} keys
 * @property {string} description
 * @property {string} [group]
 * @property {() => void} run
 */

/** @type {Map<string, Shortcut>} */
const registry = new Map();
let pending = /** @type {string[]} */ ([]);
let pendingTimer = 0;
let installed = false;

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * @typedef {{ key: string, mod: boolean, shift: boolean, alt: boolean }} Step
 */

/**
 * Parse "Ctrl+Shift+K" into a step.
 * @param {string} step
 * @returns {Step}
 */
export function parseStep(step) {
  const parts = step.split("+");
  // a literal "+" key is written "Ctrl++" → parts end with ["", ""]
  const key = parts.at(-1) === "" ? "+" : /** @type {string} */ (parts.at(-1));
  const mods = parts.slice(0, -1).map((m) => m.toLowerCase());
  return {
    key: key.toLowerCase(),
    mod: mods.includes("ctrl") || mods.includes("cmd") || mods.includes("mod") || mods.includes("meta"),
    shift: mods.includes("shift"),
    alt: mods.includes("alt"),
  };
}

/** @param {string} keys */
export const parseKeys = (keys) => keys.trim().split(/\s+/).map(parseStep);

/**
 * Does a keyboard event match one step?
 * @param {Step} step
 * @param {{ key: string, ctrlKey: boolean, metaKey: boolean, shiftKey: boolean, altKey: boolean }} ev
 */
export function stepMatches(step, ev) {
  const key = ev.key.toLowerCase();
  if (key !== step.key) return false;
  if (step.mod !== (ev.ctrlKey || ev.metaKey)) return false;
  if (step.alt !== ev.altKey) return false;
  // Characters like "?" already need Shift; only compare Shift for letters/named keys and explicit Shift steps
  const needsShiftCheck = step.shift || /^[a-z]$/.test(step.key) || step.key.length > 1;
  return !needsShiftCheck || step.shift === ev.shiftKey;
}

/**
 * Human text for a key combo: "Ctrl K" / "⌘K", "G then D".
 * @param {string} keys
 */
export function formatKeys(keys) {
  const mac = isMac();
  return keys
    .trim()
    .split(/\s+/)
    .map((step) =>
      step
        .split("+")
        .map((p) => {
          const l = p.toLowerCase();
          if (l === "ctrl" || l === "mod" || l === "cmd") return mac ? "⌘" : "Ctrl";
          if (l === "shift") return mac ? "⇧" : "Shift";
          if (l === "alt") return mac ? "⌥" : "Alt";
          return p.length === 1 ? p.toUpperCase() : p;
        })
        .join(mac ? "" : " ")
    )
    .join(" then ");
}

/** @param {Shortcut} s */
export function registerShortcut(s) {
  registry.set(s.id, s);
  return () => registry.delete(s.id);
}

/** @returns {Shortcut[]} */
export const listShortcuts = () => [...registry.values()];

/** Visible text for the first shortcut with this id (used in tooltips). */
export const shortcutLabel = (/** @type {string} */ id) => {
  const s = registry.get(id);
  return s ? formatKeys(s.keys) : "";
};

/** @param {EventTarget | null} t */
function isTyping(t) {
  const el = /** @type {HTMLElement | null} */ (t);
  if (!el || !el.tagName) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/** @param {KeyboardEvent} ev */
function onKeyDown(ev) {
  if (ev.defaultPrevented || ev.isComposing) return;
  if (["Shift", "Control", "Alt", "Meta"].includes(ev.key)) return;
  const typing = isTyping(ev.target);

  const candidates = listShortcuts().map((s) => ({ s, steps: parseKeys(s.keys) }));
  const index = pending.length;
  const hits = candidates.filter(({ s, steps }) => {
    if (steps.length <= index) return false;
    // earlier chord steps must have matched
    for (let i = 0; i < index; i++) if (pending[i] !== JSON.stringify(steps[i])) return false;
    if (!stepMatches(steps[index], ev)) return false;
    if (typing && !steps[index].mod && ev.key !== "Escape") return false;
    void s;
    return true;
  });

  if (!hits.length) {
    pending = [];
    return;
  }
  const complete = hits.find(({ steps }) => steps.length === index + 1);
  if (complete) {
    ev.preventDefault();
    pending = [];
    clearTimeout(pendingTimer);
    complete.s.run();
  } else {
    // waiting for the next key of a chord
    ev.preventDefault();
    pending = [...pending, JSON.stringify(hits[0].steps[index])];
    clearTimeout(pendingTimer);
    pendingTimer = window.setTimeout(() => (pending = []), 1200);
  }
}

/** Attach the single global key listener (safe to call more than once). */
export function initShortcuts() {
  if (installed) return;
  installed = true;
  document.addEventListener("keydown", onKeyDown);
}

/** Tests only. */
export function _resetForTests() {
  registry.clear();
  pending = [];
}

// @ts-check
/**
 * Per-viewer interface preferences (theme, density, sidebar). Kept apart from the mock database
 * because they belong to the person using the screen, not to the hotel data.
 */

const KEY = "avivpms.prefs";

/** @typedef {{ theme?: "light" | "dark", density?: "comfortable" | "compact", sidebarCollapsed?: boolean }} Prefs */

/** @returns {Prefs} */
export function getPrefs() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

/** @param {Prefs} patch */
export function setPrefs(patch) {
  const next = { ...getPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* storage blocked: preference lasts for this page only */ }
  applyPrefs(next, true); // an explicit change (toggle button) beats a ?theme= override
  return next;
}

/**
 * Put the saved theme / density on the page. A ?theme= / ?density= value in the address wins for that page view
 * (demos, screenshots, tests) without being saved.
 * @param {Prefs} [prefs]
 * @param {boolean} [ignoreQuery]
 */
export function applyPrefs(prefs = getPrefs(), ignoreQuery = false) {
  const root = document.documentElement;
  const q = ignoreQuery ? new URLSearchParams() : new URLSearchParams(location.search);
  const theme = q.get("theme") || prefs.theme;
  const density = q.get("density") || prefs.density;
  if (theme) root.setAttribute("data-theme", theme);
  if (density) root.setAttribute("data-density", density);
}

const UI_KEY = "avivpms.ui";

/**
 * Remember small UI things per viewer (table columns, saved table views, last tab…).
 * @param {string} key
 * @param {any} [fallback]
 */
export function getUiState(key, fallback = undefined) {
  try {
    const all = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
    return key in all ? all[key] : fallback;
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {any} value
 */
export function setUiState(key, value) {
  try {
    const all = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
    all[key] = value;
    localStorage.setItem(UI_KEY, JSON.stringify(all));
  } catch { /* storage blocked: not remembered */ }
}

/** @returns {"light" | "dark"} */
export const currentTheme = () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");

/** Flip between light and dark and remember it. */
export function toggleTheme() {
  return setPrefs({ theme: currentTheme() === "dark" ? "light" : "dark" }).theme;
}

/** Flip between Comfortable and Compact density and remember it. */
export function toggleDensity() {
  const compact = document.documentElement.getAttribute("data-density") === "compact";
  return setPrefs({ density: compact ? "comfortable" : "compact" }).density;
}

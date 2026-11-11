// @ts-check
/**
 * Automated accessibility checks run on every page by dev-tools/verify (and on dev-tools/design-gallery by dev-tools/tests).
 * They catch the mechanical problems – names, labels, landmarks, duplicate ids, contrast of rendered text.
 * They do not replace a keyboard / screen-reader walkthrough.
 */

/** @typedef {{ rule: string, detail: string }} Issue */

/** @param {Element} el */
const visible = (el) => {
  const win = /** @type {Window} */ (el.ownerDocument.defaultView);
  for (let n = /** @type {Element | null} */ (el); n; n = n.parentElement) {
    const cs = win.getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden" || n.hasAttribute("hidden")) return false;
  }
  return true;
};

/** @param {Element} el */
function accessibleName(el) {
  const doc = el.ownerDocument;
  const aria = el.getAttribute("aria-label");
  if (aria?.trim()) return aria.trim();
  const by = el.getAttribute("aria-labelledby");
  if (by) {
    const t = by.split(/\s+/).map((id) => doc.getElementById(id)?.textContent ?? "").join(" ").trim();
    if (t) return t;
  }
  // (no instanceof: the page may live in an iframe, which has its own HTMLInputElement class)
  const nativeLabels = /** @type {NodeListOf<HTMLLabelElement> | undefined} */ (/** @type {any} */ (el).labels);
  if (nativeLabels?.length) {
    const labels = [...nativeLabels].map((l) => l.textContent ?? "").join(" ").trim();
    if (labels) return labels;
  }
  const own = (el.textContent ?? "").trim();
  if (own) return own;
  const img = el.querySelector("img[alt]:not([alt=''])");
  if (img) return img.getAttribute("alt") ?? "";
  const svgLabel = el.querySelector("svg[aria-label], svg[role=img]");
  if (svgLabel?.getAttribute("aria-label")) return svgLabel.getAttribute("aria-label") ?? "";
  return (el.getAttribute("title") ?? "").trim();
}

/* ── colour helpers ── */
/** @param {string} css @returns {[number, number, number, number] | null} r g b 0-255, alpha 0-1 */
function parseColor(css) {
  let m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.%]+))?\s*\)$/.exec(css);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [Number(m[1]), Number(m[2]), Number(m[3]), a];
  }
  m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)$/.exec(css);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [Number(m[1]) * 255, Number(m[2]) * 255, Number(m[3]) * 255, a];
  }
  return null;
}
/** @param {[number, number, number, number]} top @param {[number, number, number]} under */
const blend = (top, under) => /** @type {[number, number, number]} */ ([0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])));
/** @param {[number, number, number]} c */
const luminance = (c) => {
  const [r, g, b] = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** @param {[number, number, number]} a @param {[number, number, number]} b */
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Effective background colour behind an element (alpha layers blended up to the page).
 * @param {Element} el
 * @returns {[number, number, number] | null} null when a gradient / image makes it unknowable
 */
function backgroundOf(el) {
  const win = /** @type {Window} */ (el.ownerDocument.defaultView);
  /** @type {Array<[number, number, number, number]>} */
  const layers = [];
  for (let n = /** @type {Element | null} */ (el); n; n = n.parentElement) {
    const cs = win.getComputedStyle(n);
    if (cs.backgroundImage !== "none" && !cs.backgroundImage.startsWith("repeating")) return null;
    const c = parseColor(cs.backgroundColor);
    if (c && c[3] > 0) {
      layers.push(c);
      if (c[3] >= 1) break;
    }
  }
  let out = /** @type {[number, number, number]} */ ([255, 255, 255]);
  const page = parseColor(win.getComputedStyle(el.ownerDocument.body).backgroundColor);
  if (page) out = [page[0], page[1], page[2]];
  for (const l of layers.reverse()) out = blend(l, out);
  return out;
}

/**
 * Contrast of every piece of visible text against its background.
 * @param {Document} doc
 * @returns {Issue[]}
 */
export function auditContrast(doc) {
  const win = /** @type {Window} */ (doc.defaultView);
  /** @type {Issue[]} */
  const issues = [];
  const seen = new Set();
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? "").trim();
    const el = node.parentElement;
    if (!text || !el || ["SCRIPT", "STYLE", "TITLE"].includes(el.tagName)) continue;
    if (el.closest("[disabled], [aria-disabled='true'], .is-disabled, .is-muted, .cal__day.is-outside, .visually-hidden, .skeleton")) continue;
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = win.getComputedStyle(el);
    const fg = parseColor(cs.color);
    const bg = backgroundOf(el);
    if (!fg || !bg) continue;
    const effective = blend(/** @type {[number, number, number, number]} */ ([fg[0], fg[1], fg[2], fg[3] * Number(cs.opacity)]), bg);
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const got = ratio(effective, bg);
    if (got < need) {
      const key = `${el.className}|${cs.color}|${text.slice(0, 20)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({ rule: "contrast", detail: `“${text.slice(0, 40)}” ${got.toFixed(2)}:1 (needs ${need}) in <${el.tagName.toLowerCase()} class="${el.className}">` });
    }
  }
  return issues;
}

/**
 * Structural checks.
 * @param {Document} doc
 * @returns {Issue[]}
 */
export function auditStructure(doc) {
  /** @type {Issue[]} */
  const issues = [];
  const add = (/** @type {string} */ rule, /** @type {string} */ detail) => issues.push({ rule, detail });
  const q = (/** @type {string} */ s) => [...doc.querySelectorAll(s)];

  if (!doc.documentElement.lang) add("html-lang", "<html> has no lang attribute");
  if (!doc.title.trim()) add("page-title", "the page has no <title>");
  if (q("main").length !== 1) add("landmark-main", `expected exactly one <main>, found ${q("main").length}`);
  if (q("h1").filter(visible).length !== 1) add("heading-h1", `expected exactly one visible <h1>, found ${q("h1").filter(visible).length}`);

  for (const img of q("img")) if (!img.hasAttribute("alt")) add("img-alt", `image without alt: ${img.getAttribute("src")}`);

  for (const el of q("button, a[href], [role=button], [role=menuitem], [role=tab], [role=switch], [role=option]").filter(visible)) {
    if (!accessibleName(el)) add("name", `<${el.tagName.toLowerCase()} class="${el.className}"> has no accessible name`);
  }
  for (const el of q("input:not([type=hidden]), select, textarea").filter(visible)) {
    if (!accessibleName(el)) add("label", `<${el.tagName.toLowerCase()} class="${el.className}"> has no label`);
  }
  for (const d of q("dialog")) if (!accessibleName(d) && !d.getAttribute("aria-labelledby")) add("dialog-name", `dialog ${d.getAttribute("data-code") ?? ""} has no name`);
  for (const el of q("[role=img], svg[role=img]")) if (!accessibleName(el)) add("img-name", "role=img element without a name");

  const ids = new Map();
  for (const el of q("[id]")) ids.set(el.id, (ids.get(el.id) ?? 0) + 1);
  for (const [id, n] of ids) if (n > 1) add("duplicate-id", `id "${id}" used ${n} times`);

  for (const el of q("[aria-controls], [aria-describedby], [aria-labelledby]")) {
    for (const attr of ["aria-controls", "aria-describedby", "aria-labelledby"]) {
      for (const id of (el.getAttribute(attr) ?? "").split(/\s+/).filter(Boolean)) {
        if (!doc.getElementById(id)) add("aria-ref", `${attr}="${id}" points to nothing`);
      }
    }
  }
  for (const el of q("[tabindex]")) if (Number(el.getAttribute("tabindex")) > 0) add("tabindex", "positive tabindex breaks natural tab order");
  for (const nav of q("nav")) if (!nav.getAttribute("aria-label") && !nav.getAttribute("aria-labelledby")) add("nav-name", "<nav> without aria-label");
  for (const el of q("[aria-hidden='true']")) if (el.querySelector("button, a[href], input, select, textarea, [tabindex='0']")) add("aria-hidden-focusable", `aria-hidden element contains focusable content (${el.className})`);

  // heading order: no jumps down by more than one level
  let prev = 0;
  for (const h of q("h1, h2, h3, h4, h5, h6").filter(visible)) {
    const level = Number(h.tagName[1]);
    if (prev && level > prev + 1) add("heading-order", `heading jumps from h${prev} to h${level}: “${(h.textContent ?? "").trim().slice(0, 30)}”`);
    prev = level;
  }
  return issues;
}

/** @param {Document} doc */
export const auditDocument = (doc) => [...auditStructure(doc), ...auditContrast(doc)];

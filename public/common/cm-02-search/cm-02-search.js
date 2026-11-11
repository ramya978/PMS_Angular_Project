// @ts-check
/**
 * CM-02 – Global Search Results. Bookings, guests, rooms, companies / agents and enquiries found by the top-bar search.
 * Arrow keys move between results, Enter opens one. Results lead to RS-07 (booking), RS-18 (guest) and FD-07 (room – Front Desk, next phase).
 */
import { bootPage } from "/js/core/shell.js";
import { h } from "/js/core/dom.js";
import { param, setParams } from "/js/core/router.js";
import { screenUrl, isBuilt } from "/js/core/screens.js";
import { parseQuery, highlightParts } from "/js/domain/search.js";
import { search } from "/js/services/index.js";
import { pageHeader, emptyState, errorState, skeleton, statusPill, STATUS } from "/js/components/display.js";
import { icon } from "/js/components/icons.js";
import { button } from "/js/components/button.js";
import { textInput } from "/js/components/fields.js";

const { main } = await bootPage();

const KINDS = /** @type {const} */ ([
  ["booking", "Bookings", "file-text", "RS-07"],
  ["guest", "Guests", "user", "RS-18"],
  ["room", "Rooms", "door", "FD-07"],
  ["account", "Companies & agents", "building", "RS-19"],
  ["enquiry", "Enquiries", "message-square", "RS-03"],
]);

let query = param("q") ?? "";
let active = param("type") ?? "all";
/** @type {Awaited<ReturnType<typeof search.search>> | null} */
let result = null;

const resultsBox = h("div", { class: "sr__results", attrs: { "aria-live": "polite" } });
const searchBox = textInput({ type: "search", value: query, icon: "search", placeholder: "Search bookings, guests, rooms, companies…" });
const input = searchBox.input;
input.setAttribute("aria-label", "Search bookings, guests, rooms, companies and enquiries");
const form = h("form", { class: "sr__form", attrs: { role: "search", "aria-label": "Search" }, onsubmit: (/** @type {Event} */ ev) => {
  ev.preventDefault();
  query = searchBox.getValue().trim();
  setParams({ q: query, type: null });
  active = "all";
  void run();
} }, searchBox.el, button({ label: "Search", variant: "primary", type: "submit" }));

main.append(pageHeader({ title: "Search results", description: "Bookings, guests, rooms, companies and enquiries.", code: "CM-02", breadcrumb: [{ label: "Home", href: "/" }, { label: "Search" }] }), form, resultsBox);

/** @param {string} text */
function marked(text) {
  const parts = highlightParts(text, parseQuery(query).tokens);
  return parts.map((p) => (p.match ? h("mark", {}, p.text) : p.text));
}

/** @param {import("/js/domain/search.js").Hit} hit @param {typeof KINDS[number]} kind */
function row(hit, kind) {
  const code = kind[3];
  const placeholder = !isBuilt(code);
  const href = screenUrl(code, { id: hit.id });
  const pill = hit.status && hit.status in STATUS ? statusPill(/** @type {keyof typeof STATUS} */ (hit.status)) : hit.status === "blacklisted" ? statusPill("cancelled", { label: "Blacklisted" }) : null;
  return h("li", {},
    h("a", { class: "sr__item", href, dataset: { leadsTo: code, kind: hit.kind }, attrs: { "data-placeholder": placeholder ? "" : null } },
      h("span", { class: "sr__icon" }, icon(kind[2])),
      h("span", { class: "sr__text" }, h("span", { class: "sr__title" }, marked(hit.title)), h("span", { class: "sr__sub" }, marked(hit.subtitle))),
      pill, placeholder ? h("span", { class: "sr__note" }, "Front Desk – next phase") : null, icon("chevron-right", { class: "sr__go" })));
}

function paint() {
  resultsBox.textContent = "";
  if (!result) return;
  const total = result.total;
  const chips = h("div", { class: "sr__chips", attrs: { role: "group", "aria-label": "Filter results" } },
    [["all", "All", total], ...KINDS.map(([k, label]) => [k, label, result?.groups[k].length ?? 0])].map(([k, label, n]) =>
      h("button", { class: "sr__chip", type: "button", attrs: { "aria-pressed": String(active === k) }, onclick: () => { active = String(k); setParams({ type: active === "all" ? null : active }); paint(); } },
        String(label), h("span", { class: "tabs__count" }, String(n)))));
  resultsBox.append(h("p", { class: "visually-hidden", attrs: { role: "status" } }, `${total} result${total === 1 ? "" : "s"} for ${result.query}`), chips);

  if (!total) {
    resultsBox.append(emptyState({ headingLevel: 2, kind: "search", title: `No results for “${result.query}”`, message: "Check the spelling, try a booking number (FK-10234), a guest's phone number or a room number.", action: { label: "New enquiry", href: screenUrl("RS-02") } }));
    return;
  }
  for (const kind of KINDS) {
    const hits = result.groups[kind[0]];
    if (!hits.length || (active !== "all" && active !== kind[0])) continue;
    resultsBox.append(h("section", { class: "sr__group", dataset: { group: kind[0] } },
      h("h2", {}, kind[1], h("span", { class: "sr__count" }, `${hits.length}${hits.length >= 50 ? "+" : ""}`)),
      h("ul", { class: "sr__list" }, hits.map((hit) => row(hit, kind)))));
  }
}

async function run() {
  resultsBox.textContent = "";
  if (query.length < 2) {
    resultsBox.append(emptyState({ headingLevel: 2, kind: "search", title: "Search for anything", message: "Type at least 2 characters: a guest name, phone number, booking number, company or room number." }));
    document.body.dataset.ready = "1";
    return;
  }
  resultsBox.append(skeleton({ lines: 5 }));
  try {
    result = await search.search({ q: query });
    document.title = `“${query}” · Search · Aviv PMS`;
    paint();
  } catch (err) {
    resultsBox.textContent = "";
    const e = /** @type {any} */ (err);
    resultsBox.append(e.code === "VALIDATION" ? emptyState({ headingLevel: 2, kind: "search", title: "Search for anything", message: e.message }) : errorState({ onRetry: () => void run(), headingLevel: 2 }));
  }
  document.body.dataset.ready = "1";
}

// arrow keys move between results; Home / End jump to the first / last
resultsBox.addEventListener("keydown", (ev) => {
  const links = /** @type {HTMLElement[]} */ ([...resultsBox.querySelectorAll("a.sr__item")]);
  const i = links.indexOf(/** @type {HTMLElement} */ (document.activeElement));
  if (i < 0) return;
  const to = ev.key === "ArrowDown" ? i + 1 : ev.key === "ArrowUp" ? i - 1 : ev.key === "Home" ? 0 : ev.key === "End" ? links.length - 1 : null;
  if (to === null) return;
  ev.preventDefault();
  links[Math.max(0, Math.min(links.length - 1, to))]?.focus();
});
input.addEventListener("keydown", (ev) => {
  if (ev.key === "ArrowDown") { ev.preventDefault(); /** @type {HTMLElement | null} */ (resultsBox.querySelector("a.sr__item"))?.focus(); }
});

await run();

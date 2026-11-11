// @ts-check
/**
 * App shell: sidebar, glass top bar, notifications panel, help drawer, shortcut overlay, command palette.
 * Every page calls `bootPage()` once; the shell wraps the page's <main> – never copy shell markup into pages.
 */
import { h } from "./dom.js";
import { applyPrefs, getPrefs, setPrefs, getUiState, setUiState, toggleTheme, toggleDensity, currentTheme } from "./prefs.js";
import { SCREENS, screenByCode, screenUrl } from "./screens.js";
import { NAV, NEW_MENU, navParent, navGroupOf } from "./nav.js";
import { emptyState } from "../components/display.js";
import { initContext, businessDate, property, user } from "./context.js";
import { initShortcuts, registerShortcut, listShortcuts, formatKeys } from "./shortcuts.js";
import { openPalette, setPaletteHooks, rememberScreen } from "./palette.js";
import { on } from "./events.js";
import { formatDate } from "./format.js";
import { icon } from "../components/icons.js";
import { avatar } from "../components/display.js";
import { openDialog, openDrawer, initDeclarativeDialogs } from "../components/dialog.js";
import { openMenu } from "../components/menu.js";
import { tooltip } from "../components/overlay.js";
import { toast } from "../components/toast.js";
import { notifications, auth, backup } from "../services/index.js";
import { currentUser, touchSession } from "./auth.js";
import { can, applyPermissions, watchPermissions, deniedReason } from "./permissions.js";
import { createIdleWatcher } from "./idle.js";
import { openSessionWarning } from "../components/session-warning.js";
import { openPropertySwitcher } from "../components/property-switcher.js";

/** Helper kept for pages that do not use the full shell (welcome, dev): theme / density buttons only. */
export function initBasicChrome() {
  applyPrefs();
  document.querySelectorAll('[data-action="toggle-theme"]').forEach((btn) =>
    btn.addEventListener("click", () => btn.setAttribute("aria-pressed", String(toggleTheme() === "dark"))));
  document.querySelectorAll('[data-action="toggle-density"]').forEach((btn) =>
    btn.addEventListener("click", () => btn.setAttribute("aria-pressed", String(toggleDensity() === "compact"))));
}

const SIDEBAR_AUTO_COLLAPSE_BELOW = 1100;
/** At this width and below the sidebar is a slide-in menu (css/aviv/responsive.css): "expanded" means open. */
const SIDEBAR_DRAWER_MQ = "(max-width: 1024px)";

/** @type {HTMLElement} */ let sidebarEl;
/** @type {HTMLElement} */ let bellBadge;

export const isSidebarCollapsed = () => document.body.dataset.sidebar === "collapsed";

/** @param {boolean} [collapsed] */
export function setSidebarCollapsed(collapsed = !isSidebarCollapsed(), remember = true) {
  document.body.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  document.querySelector('[data-action="toggle-sidebar"]')?.setAttribute("aria-expanded", String(!collapsed));
  // the open / closed state of the phone and tablet menu is not a preference
  if (remember && !window.matchMedia(SIDEBAR_DRAWER_MQ).matches) setPrefs({ sidebarCollapsed: collapsed });
}

/**
 * Show a count on a sidebar item.
 * @param {string} code screen code, e.g. "RS-20"
 * @param {number} n 0 hides it
 */
export function setBadge(code, n) {
  const el = sidebarEl?.querySelector(`[data-nav="${code}"] .badge`);
  if (!el) return;
  el.textContent = n > 99 ? "99+" : String(n);
  /** @type {HTMLElement} */ (el).hidden = n <= 0;
  const link = /** @type {HTMLElement} */ (el.parentElement);
  link.setAttribute("aria-label", `${screenByCode(code)?.title ?? code}${n > 0 ? `, ${n} waiting` : ""}`);
}

/* ───────── Sidebar ───────── */
/** @param {string} activeCode */
function buildSidebar(activeCode) {
  // Same menu as every static page: entry screens only, defined once in js/core/nav.js (brief Part C1)
  const openGroups = new Set(/** @type {string[]} */ (getUiState("navOpen", [])));
  const highlight = navParent(activeCode);
  openGroups.add(navGroupOf(activeCode));

  /** @param {import("./nav.js").NavItem} i */
  const item = (i) =>
    h("a", {
      class: `nav__item${i.code === highlight ? " is-active" : ""}`, href: i.href ?? screenUrl(i.code), dataset: { nav: i.code },
      attrs: { "aria-current": i.code === activeCode ? "page" : null },
    }, icon(i.icon), h("span", { class: "nav__label" }, i.label), h("span", { class: "badge", attrs: { hidden: true } }, "0"));

  /** Old screens keep their permission check; Front Desk screens have no permission keys yet (shown to everyone). */
  const visible = (/** @type {import("./nav.js").NavItem} */ i) => !SCREENS.some((s) => s.code === i.code) || can(`${i.code}.view`);
  const home = NAV.find((g) => g.id === "home");
  const rest = NAV.filter((g) => g.id !== "home");
  const activeGroup = navGroupOf(activeCode);
  const ordered = [...rest.filter((g) => g.id === activeGroup), ...rest.filter((g) => g.id !== activeGroup)];
  const sections = ordered.map((sec) => {
    const items = sec.items.filter(visible);
    if (!items.length) return null;
    const id = `navg-${sec.id}`;
    const open = openGroups.has(sec.id);
    const list = h("div", { class: "nav__list", id, attrs: { hidden: !open } }, items.map(item));
    const toggle = h("button", { class: "nav__item nav__group", type: "button", attrs: { "aria-expanded": String(open), "aria-controls": id } },
      h("span", { class: "nav__label" }, sec.label), icon("chevron-down", { class: "nav__chev" }));
    toggle.addEventListener("click", () => {
      const now = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(now));
      list.hidden = !now;
      const set = new Set(/** @type {string[]} */ (getUiState("navOpen", [])));
      if (now) set.add(sec.id); else set.delete(sec.id);
      setUiState("navOpen", [...set]);
    });
    return h("div", { class: `nav__sub${open ? " is-open" : ""}`, dataset: { group: sec.id } }, toggle, list);
  });
  const front = h("div", { class: "nav__section" }, h("div", { class: "nav__list" }, home.items.map(item)));

  const collapseBtn = h("button", { class: "btn btn--ghost btn--icon sidebar__collapse", type: "button", dataset: { action: "toggle-sidebar" }, attrs: { "aria-label": "Collapse sidebar", "aria-expanded": "true" }, onclick: () => setSidebarCollapsed() }, icon("chevrons-left"));
  tooltip(collapseBtn, "Collapse sidebar", "Ctrl+B");

  const aside = h("aside", { class: "sidebar", attrs: { "aria-label": "Sidebar" } },
    h("div", { class: "sidebar__brand" },
      h("a", { class: "sidebar__logo", href: screenUrl("CM-06"), attrs: { "aria-label": "Aviv PMS home" } },
        h("span", { class: "sidebar__mark" }, icon("leaf", { size: 20 })), h("span", { class: "sidebar__name" }, "Aviv PMS")),
      collapseBtn),
    h("nav", { class: "nav", attrs: { "aria-label": "Main" } }, front, sections));

  // Tooltips on icons when the sidebar is collapsed
  aside.querySelectorAll(".nav__item[data-nav]").forEach((a) => {
    const label = a.querySelector(".nav__label")?.textContent ?? "";
    a.addEventListener("mouseenter", () => { if (isSidebarCollapsed()) a.setAttribute("title", label); else a.removeAttribute("title"); });
  });
  return aside;
}

/* ───────── Top bar ───────── */
function buildTopbar() {
  const prop = property();
  const searchInput = h("input", { class: "topbar__search-input", type: "search", name: "q", placeholder: "Search bookings, guests…", attrs: { "aria-label": "Search bookings, guests and rooms", autocomplete: "off", id: "global-search" } });
  const search = h("form", { class: "topbar__search", attrs: { role: "search" }, onsubmit: (/** @type {Event} */ ev) => {
    ev.preventDefault();
    const q = searchInput.value.trim();
    if (q) location.assign(screenUrl("CM-02", { q }));
  } }, icon("search"), searchInput, h("kbd", { class: "kbd" }, "/"));

  const newBtn = h("button", { class: "btn btn--primary", type: "button", attrs: { "aria-haspopup": "menu" } }, icon("plus"), h("span", { class: "btn__label" }, "New"));
  newBtn.addEventListener("click", () =>
    openMenu(newBtn, NEW_MENU.map((m, n) => ({ label: m.label, icon: m.icon, href: m.href ?? screenUrl(m.code), ...(n === 0 ? { keys: "g n" } : {}) })),
      { label: "Create new", placement: "bottom-end" }));

  const iconBtn = (/** @type {string} */ ic, /** @type {string} */ label, /** @type {() => void} */ fn, /** @type {string} */ keys = "") => {
    const b = h("button", { class: "btn btn--ghost btn--icon", type: "button", attrs: { "aria-label": label }, onclick: fn }, icon(ic));
    tooltip(b, label, keys || undefined);
    return b;
  };

  bellBadge = h("span", { class: "badge topbar__bell-badge", attrs: { hidden: true, "aria-hidden": "true" } }, "0");
  const bell = h("button", { class: "btn btn--ghost btn--icon topbar__bell", type: "button", attrs: { "aria-label": "Notifications" }, onclick: openNotifications }, icon("bell"), bellBadge);
  tooltip(bell, "Notifications");

  const themeBtn = iconBtn(currentTheme() === "dark" ? "sun" : "moon", "Switch light / dark theme", () => {
    const t = toggleTheme();
    themeBtn.replaceChildren(icon(t === "dark" ? "sun" : "moon"));
    themeBtn.setAttribute("aria-pressed", String(t === "dark"));
  }, "Alt+T");
  themeBtn.setAttribute("aria-pressed", String(currentTheme() === "dark"));
  const densityBtn = iconBtn("rows", "Switch Comfortable / Compact density", () => {
    densityBtn.setAttribute("aria-pressed", String(toggleDensity() === "compact"));
  }, "Alt+D");
  densityBtn.setAttribute("aria-pressed", String(document.documentElement.dataset.density === "compact"));

  const u = user();
  const userBtn = h("button", { class: "topbar__user", type: "button", attrs: { "aria-haspopup": "menu", "aria-label": `${u.name}, ${u.role}. Account menu` } },
    avatar(u.name, { size: 32 }), h("span", { class: "topbar__user-text" }, h("span", { class: "topbar__user-name" }, u.name), h("span", { class: "topbar__user-role" }, u.role)), icon("chevron-down", { size: 14 }));
  userBtn.addEventListener("click", () =>
    openMenu(userBtn, [
      { title: `${u.name} · ${u.role}` },
      { label: "Keyboard shortcuts", icon: "keyboard", keys: "?", onClick: openShortcuts },
      { label: "Help for this screen", icon: "help", keys: "Ctrl+/", onClick: openHelp },
      { separator: true },
      { label: "Sign out", icon: "log-out", onClick: () => void signOutAndLeave() },
    ], { label: "Account", placement: "bottom-end" }));

  return h("header", { class: "topbar" },
    iconBtn("menu", "Toggle sidebar", () => setSidebarCollapsed(), "Ctrl+B"),
    h("button", { class: "topbar__prop", type: "button", attrs: { title: "Change hotel", "aria-haspopup": "dialog", "aria-label": `Hotel: ${prop?.shortName ?? "The Aviv Kochi"}. Change hotel` }, onclick: () => void openPropertySwitcher() }, icon("building-2", { size: 16 }), h("span", {}, prop?.shortName ?? "The Aviv Kochi")),
    h("div", { class: "topbar__date", attrs: { title: "Business date – the hotel's working date" } }, icon("calendar", { size: 16 }),
      h("span", { class: "visually-hidden" }, "Business date: "), h("time", { class: "num", id: "business-date-chip", attrs: { datetime: businessDate() } }, formatDate(businessDate(), "long"))),
    search,
    h("div", { class: "topbar__spacer" }),
    // Setup Home has no palette button or + New (user 2026-11-04); Ctrl+K still opens the palette.
    document.body.dataset.screen === "RSS-01" ? null : iconBtn("command", "Command palette", openPalette, "Ctrl+K"),
    document.body.dataset.screen === "RSS-01" ? null : newBtn,
    iconBtn("help", "Help for this screen", openHelp, "Ctrl+/"),
    bell, themeBtn, densityBtn, userBtn);
}

/* ───────── Notifications panel (CM-P03) ───────── */
const KIND = /** @type {const} */ ({ approval: ["shield-check", "Approvals"], alert: ["alert", "Alerts"], reminder: ["clock", "Reminders"] });

/** @param {string} iso */
function ago(iso) {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const hrs = Math.round(m / 60);
  return hrs < 24 ? `${hrs} h ago` : `${Math.round(hrs / 24)} d ago`;
}

async function refreshBell() {
  try {
    const c = await notifications.navCounts();
    bellBadge.textContent = String(c.unread);
    bellBadge.hidden = c.unread === 0;
    document.querySelector(".topbar__bell")?.setAttribute("aria-label", c.unread ? `Notifications, ${c.unread} unread` : "Notifications");
    setBadge("RS-20", c.approvals);
    setBadge("RS-01", c.arrivals);
  } catch (err) {
    console.error("Could not load notification counts", err);
  }
}

export async function openNotifications() {
  const body = h("div", { class: "notif", attrs: { "aria-live": "polite" } });
  const drawer = openDrawer({
    code: "CM-P03", title: "Notifications", description: "Approvals, alerts and reminders for you.", body,
    actions: [{ label: "Mark all as read", variant: "secondary", keepOpen: true, onClick: async () => { await notifications.markAllNotificationsRead(); await draw(); } }, { label: "Close", variant: "primary" }],
  });
  async function draw() {
    const list = await notifications.listNotifications();
    body.textContent = "";
    if (!list.length) {
      body.append(h("p", { class: "notif__empty" }, "You are all caught up."));
      return;
    }
    for (const kind of /** @type {Array<keyof typeof KIND>} */ (["approval", "alert", "reminder"])) {
      const rows = list.filter((n) => n.kind === kind);
      if (!rows.length) continue;
      body.append(h("h3", { class: "notif__group" }, KIND[kind][1]),
        h("ul", { class: "notif__list" }, rows.map((n) =>
          h("li", {},
            h("a", {
              class: `notif__item${n.read ? "" : " is-unread"}`, href: n.href ? screenUrl(n.href) : "#",
              onclick: async (/** @type {Event} */ ev) => { if (!n.read) { await notifications.markNotificationRead(n.id); } if (!n.href) { ev.preventDefault(); await draw(); } },
            },
            h("span", { class: `notif__icon notif__icon--${kind}` }, icon(KIND[kind][0])),
            h("span", { class: "notif__text" }, h("strong", {}, n.title, n.read ? null : h("span", { class: "visually-hidden" }, " (unread)")), h("span", {}, n.body), h("time", { class: "notif__time" }, ago(n.at))),
            n.read ? null : h("span", { class: "notif__dot", attrs: { "aria-hidden": "true" } }))))));
    }
  }
  await draw();
  return drawer;
}

/* ───────── Help drawer + shortcuts overlay ───────── */
export function openHelp() {
  const code = document.body.dataset.nav ?? document.body.dataset.screen ?? "";
  const s = screenByCode(code);
  const clean = (/** @type {string} */ t) => t.replace(/\*\(.*?\)\*/g, "").trim();
  const body = h("div", { class: "help" },
    h("p", { class: "help__purpose" }, s?.purpose || document.title.replace(" · Aviv PMS", "")),
    s ? h("dl", { class: "kv" },
      h("div", { class: "kv__row" }, h("dt", {}, "Screen code"), h("dd", {}, h("span", { class: "code-chip" }, s.code))),
      s.openedFrom ? h("div", { class: "kv__row" }, h("dt", {}, "Opened from"), h("dd", {}, clean(s.openedFrom))) : null,
      s.leadsTo ? h("div", { class: "kv__row" }, h("dt", {}, "Leads to"), h("dd", {}, clean(s.leadsTo))) : null) : h("p", {}, h("span", { class: "code-chip" }, code || "–")),
    h("h3", { class: "help__h" }, "Quick tips"),
    h("ul", { class: "help__tips" },
      h("li", {}, "Press ", h("kbd", { class: "kbd" }, formatKeys("Ctrl+K")), " to jump to any screen or action."),
      h("li", {}, "Press ", h("kbd", { class: "kbd" }, "?"), " to see every keyboard shortcut."),
      h("li", {}, "Switch to Compact density from the top bar for busy reservation desks."),
      h("li", {}, "Dates always follow the hotel's business date shown at the top.")));
  return openDrawer({ code: "SYS-HELP", title: s ? `Help · ${s.title}` : "Help", body, actions: [{ label: "Keyboard shortcuts", variant: "secondary", onClick: () => setTimeout(openShortcuts, 0) }, { label: "Close", variant: "primary" }] });
}

export function openShortcuts() {
  const groups = Map.groupBy(listShortcuts(), (s) => s.group ?? "General");
  const body = h("div", { class: "shortcuts" }, [...groups].map(([g, items]) =>
    h("section", {}, h("h3", { class: "help__h" }, g),
      h("dl", { class: "shortcuts__list" }, items.map((s) => h("div", { class: "shortcuts__row" }, h("dt", {}, s.description), h("dd", {}, h("kbd", { class: "kbd" }, formatKeys(s.keys)))))))));
  return openDialog({ code: "SYS-SHORTCUTS", title: "Keyboard shortcuts", description: "Shortcuts are ignored while you type in a field (except Ctrl + key and Esc).", body, size: "lg", actions: [{ label: "Close", variant: "primary" }] });
}

/* ───────── Boot ───────── */
function registerShellShortcuts() {
  const nav = (/** @type {string} */ code, /** @type {Record<string, string>} */ q = {}) => () => location.assign(screenUrl(code, q));
  /** @type {Array<[string, string, string, () => void, string?]>} */
  const defs = [
    ["palette", "Ctrl+K", "Open the command palette", openPalette, "General"],
    ["shortcuts", "?", "Show keyboard shortcuts", () => void openShortcuts(), "General"],
    ["help", "Ctrl+/", "Help for this screen", () => void openHelp(), "General"],
    ["search", "/", "Focus global search", () => /** @type {HTMLElement | null} */ (document.getElementById("global-search"))?.focus(), "General"],
    ["sidebar", "Ctrl+B", "Collapse / expand the sidebar", () => setSidebarCollapsed(), "General"],
    ["theme", "Alt+T", "Switch light / dark theme", () => /** @type {HTMLElement | null} */ (document.querySelector('[aria-label="Switch light / dark theme"]'))?.click(), "General"],
    ["density", "Alt+D", "Switch Comfortable / Compact density", () => /** @type {HTMLElement | null} */ (document.querySelector('[aria-label="Switch Comfortable / Compact density"]'))?.click(), "General"],
    ["go-dash", "g d", "Go to Reservation Dashboard", nav("RS-01"), "Go to"],
    ["go-new", "g n", "Go to New Reservation", nav("RS-05"), "Go to"],
    ["go-avail", "g a", "Go to Availability & Rate Search", nav("RS-04"), "Go to"],
    ["go-list", "g r", "Go to Reservation list", nav("RS-06"), "Go to"],
    ["go-cal", "g c", "Go to Room Calendar", nav("RS-17"), "Go to"],
    ["go-appr", "g p", "Go to Approvals", nav("RS-20"), "Go to"],
    ["go-setup", "g s", "Go to Setup Home", nav("RSS-01"), "Go to"],
  ];
  for (const [id, keys, description, run, group] of defs) registerShortcut({ id, keys, description, run, group });
}

let booted = false;

/**
 * Wrap the page in the app shell. Call once from every page script: `await bootPage()`.
 * @returns {Promise<{ main: HTMLElement }>}
 */
/** Where to go after sign-in for a role. @param {string | undefined} roleId */
export const homeFor = (roleId) => screenUrl("CM-06"); // the welcome page; the start page is a hotel-setup option (RSS-02)

/** Go to the sign-in page, remembering where the person wanted to be. */
export function goToLogin() {
  const next = `${location.pathname}${location.search}`;
  location.replace(`/common/cm-01-login/${next && next !== "/common/cm-01-login/" ? `?next=${encodeURIComponent(next)}` : ""}`);
}

export async function signOutAndLeave() {
  idle?.stop();
  await auth.signOut();
  location.assign("/common/cm-01-login/");
}

/** @type {ReturnType<typeof createIdleWatcher> | null} */
let idle = null;

/** Timeout settings; the developer panel can shorten them for testing (kept for this tab only). @param {number} minutes */
function idleSettings(minutes) {
  try {
    const t = JSON.parse(sessionStorage.getItem("avivpms.idleTest") || "null");
    if (t?.timeoutMs) return { timeoutMs: Number(t.timeoutMs), warnBeforeMs: Number(t.warnBeforeMs) };
  } catch { /* use the real setting */ }
  return { timeoutMs: minutes * 60000, warnBeforeMs: Math.min(60000, minutes * 30000) };
}

async function startIdleWatch() {
  const { timeoutMs, warnBeforeMs } = idleSettings(await auth.getSessionTimeoutMinutes());
  let warning = /** @type {{ close: () => void } | null} */ (null);
  idle = createIdleWatcher({
    timeoutMs, warnBeforeMs,
    onActivity: () => touchSession(),
    onWarn: () => {
      warning = openSessionWarning({
        remainingMs: () => idle?.remainingMs() ?? 0,
        onStay: () => idle?.extend(),
        onSignOut: () => void signOutAndLeave(),
      });
    },
    onExpire: () => { warning?.close(); toast({ message: "You were signed out because of inactivity.", type: "info" }); void signOutAndLeave(); },
  });
  idle.start();
}

/** For the developer panel / tests. */
export const idleWatcher = () => idle;

/** Page shown instead of the content when the role may not open the screen (CM-X02). @param {HTMLElement} main @param {string} code */
function showAccessDenied(main, code) {
  main.textContent = "";
  main.append(
    h("div", { dataset: { code: "SYS-DENIED" } },
      emptyState({ kind: "error", title: "You do not have access to this screen", message: `${deniedReason(`${code}.view`)} Your administrator can change this in Users & Roles.`, headingLevel: 1, action: { label: "Go to my home page", href: homeFor(currentUser()?.roleId) } })));
}

/**
 * Wrap the page in the app shell. Call once from every page script: `await bootPage()`.
 * Signed-out visitors are sent to the sign-in page; people without permission see an "access" message.
 * @returns {Promise<{ main: HTMLElement }>}
 */
export async function bootPage() {
  applyPrefs();
  if (!currentUser()) {
    goToLogin();
    return new Promise(() => {}); // the page is being replaced; never continue
  }
  await initContext();
  if (booted) return { main: /** @type {HTMLElement} */ (document.querySelector("main")) };
  booted = true;

  // Placeholder pages stand in for another screen: data-nav says which sidebar item to light up
  const code = document.body.dataset.nav ?? document.body.dataset.screen ?? "";
  const main = /** @type {HTMLElement} */ (document.querySelector("main"));
  const screen = screenByCode(code);
  if (screen && !document.title.includes(screen.title)) document.title = `${screen.title} · Aviv PMS`;
  main.id = "main";
  main.tabIndex = -1;
  main.classList.add("app__content", "page-in");

  sidebarEl = buildSidebar(code);
  const body = h("div", { class: "app__body" }, buildTopbar());
  main.before(h("a", { class: "skip-link", href: "#main" }, "Skip to main content"));
  const scrim = h("div", { class: "nav-scrim", attrs: { "aria-hidden": "true" }, onclick: () => setSidebarCollapsed(true) });
  const app = h("div", { class: "app" }, sidebarEl, scrim, body);
  main.before(app);
  body.append(main);

  const prefs = getPrefs();
  const drawer = window.matchMedia(SIDEBAR_DRAWER_MQ).matches;
  setSidebarCollapsed(drawer || (prefs.sidebarCollapsed ?? window.innerWidth < SIDEBAR_AUTO_COLLAPSE_BELOW), false);

  setPaletteHooks({ toggleSidebar: () => setSidebarCollapsed(), openHelp: () => void openHelp(), openShortcuts: () => void openShortcuts() });
  registerShellShortcuts();
  initShortcuts();
  initDeclarativeDialogs();
  rememberScreen(code);

  on("system.businessDateChanged", (p) => {
    const chip = document.getElementById("business-date-chip");
    if (chip) { chip.textContent = formatDate(p.new, "long"); chip.setAttribute("datetime", p.new); }
    toast({ message: `Business date is now ${formatDate(p.new, "long")}`, type: "info" });
  });
  on("notification.changed", () => void refreshBell());
  on("approval.requested", () => void refreshBell());
  void refreshBell();

  // what the person may not do is switched off (with a reason), what they may not open is hidden
  applyPermissions(document);
  watchPermissions();
  const viewKey = `${code}.view`;
  if (screen && !can(viewKey)) showAccessDenied(main, code);

  void startIdleWatch();
  void backup.ensureDailyBackup().catch(() => {}); // CM-X03: one backup per business date

  document.body.dataset.shell = "1";
  return { main };
}

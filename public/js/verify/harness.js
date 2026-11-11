// @ts-check
/**
 * Screen verification harness (Part A4). For a built screen it:
 *  1. loads the page in an iframe and waits for body[data-ready];
 *  2. checks body[data-screen] and every expected [data-code] (own code, sub-screens, pop-ups, outputs);
 *  3. clicks every [data-opens="CODE"] trigger and checks the matching <dialog data-code> opens;
 *  4. checks every [data-leads-to] link points to an existing page or is a "Coming next" placeholder;
 *  5. runs the screen's scripted scenario (fill, click, read data through the services);
 *  6. fails on any console error / warning / failed resource captured from the iframe.
 */
import { ALL_ENTRIES } from "./registry.js";
import { BUILT, SCENARIOS, PROCESSES_BUILT, SIGNED_OUT } from "./built.js";
import { setSession, clearSession } from "../core/auth.js";
import * as services from "../services/index.js";
import { hasProcess } from "../core/processes.js";
import { auditStructure, auditContrast } from "./a11y.js";

/**
 * @typedef {Object} Check
 * @property {string} name
 * @property {boolean} ok
 * @property {string} [detail]
 *
 * @typedef {Object} ScreenResult
 * @property {string} code
 * @property {string} name
 * @property {string | null} page
 * @property {"pass" | "fail" | "not-built"} status
 * @property {Check[]} checks
 * @property {number} ms
 *
 * @typedef {Object} Ctx
 * @property {Window} win
 * @property {Document} doc
 * @property {typeof services} services
 * @property {(name: string, ok: boolean, detail?: string) => void} check
 * @property {(selector: string) => void} click
 * @property {(selector: string, value: string) => void} fill
 * @property {(ms: number) => Promise<void>} wait
 * @property {(predicate: () => boolean, timeoutMs?: number) => Promise<boolean>} waitFor
 */

/** Session used while the harness opens pages: a General Manager who may open everything. */
export const TEST_SESSION = Object.freeze({ id: "u-gm", name: "Vikram Nathan", role: "General Manager", roleId: "role-gm", realRoleId: "role-gm", permissions: ["*"], propertyId: "prop-aviv-kochi", signedInAt: "2026-01-01T09:00:00+05:30", lastActive: Date.now() + 86400000 });
export const useTestSession = () => setSession({ ...TEST_SESSION, lastActive: Date.now() });

/** @type {Map<Element, {type: string, message: string}[]>} */
const issuesByFrame = new Map();

// boot.js in every page calls this (through window.parent) for each console error / warning / load failure.
/** @type {any} */ (window).__verifyCapture = (/** @type {Window} */ win, /** @type {any} */ item) => {
  const frame = win.frameElement;
  if (!frame) return;
  if (!issuesByFrame.has(frame)) issuesByFrame.set(frame, []);
  /** @type {any[]} */ (issuesByFrame.get(frame)).push(item);
};

const wait = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {() => boolean} predicate
 * @param {number} [timeoutMs]
 */
async function waitFor(predicate, timeoutMs = 4000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      if (predicate()) return true;
    } catch { /* not ready yet */ }
    await wait(40);
  }
  return false;
}

/**
 * Open a page in a fresh iframe inside `host` and wait until it says it is ready.
 * @param {string} page e.g. "reservation/rs-05-new-reservation/" (may include ?query)
 * @param {HTMLElement} host
 */
async function openFrame(page, host) {
  const frame = document.createElement("iframe");
  frame.className = "report__frame";
  frame.title = `Page under test: ${page}`;
  frame.style.width = "1280px";
  host.append(frame);
  const loaded = new Promise((resolve) => frame.addEventListener("load", resolve, { once: true }));
  frame.src = `/${page.replace(/^\//, "")}`;
  await loaded;
  const win = /** @type {Window} */ (frame.contentWindow);
  const ready = await waitFor(() => win.document.body?.dataset.ready === "1", 8000);
  return { frame, win, doc: win.document, ready };
}

/** @param {string} href */
async function pageExists(href) {
  try {
    const res = await fetch(href, { method: "GET", cache: "no-store" });
    return res.ok && (res.headers.get("content-type") ?? "").includes("html");
  } catch {
    return false;
  }
}

/** @param {string} code */
export const entryByCode = (code) => ALL_ENTRIES.find((e) => e.code === code);

/** Main screen of any code (a sub-screen / pop-up resolves to its parent). */
function mainOf(/** @type {string} */ code) {
  let e = entryByCode(code);
  while (e && e.parent) e = entryByCode(e.parent);
  return e;
}

/**
 * Verify one main screen.
 * @param {import("./registry.js").Entry} entry
 * @param {HTMLElement} host where the iframe is mounted
 * @returns {Promise<ScreenResult>}
 */
export async function verifyScreen(entry, host) {
  const t0 = performance.now();
  /** @type {Check[]} */
  const checks = [];
  const check = (/** @type {string} */ name, /** @type {boolean} */ ok, /** @type {string} */ detail) => checks.push({ name, ok, detail });
  const done = (/** @type {ScreenResult["status"]} */ status) => ({ code: entry.code, name: entry.name, page: entry.page, status, checks, ms: Math.round(performance.now() - t0) });

  if (!BUILT.includes(entry.code) || !entry.page) return done("not-built");

  if (!(await pageExists(`/${entry.page}`))) {
    check("page file exists and is served", false, `/${entry.page}`);
    return done("fail");
  }
  check("page file exists and is served", true, `/${entry.page}`);

  if (SIGNED_OUT.includes(entry.code)) clearSession(); else useTestSession();
  const { frame, win, doc, ready } = await openFrame(entry.page, host);
  check("page finished loading (body[data-ready])", ready);
  check(`body[data-screen="${entry.code}"]`, doc.body.dataset.screen === entry.code, `found "${doc.body.dataset.screen}"`);
  check(`[data-code="${entry.code}"] present`, !!doc.querySelector(`[data-code="${entry.code}"]`));

  // Children: sub-screens, pop-ups, outputs
  const children = ALL_ENTRIES.filter((e) => e.parent === entry.code && e.kind !== "process");
  for (const child of children) {
    const found = doc.querySelector(`[data-code="${child.code}"]`);
    check(`${child.kind} ${child.code} “${child.name}” exists`, !!found);
    if (child.kind === "popup") {
      const trigger = /** @type {HTMLElement | null} */ (doc.querySelector(`[data-opens="${child.code}"]`));
      if (!trigger) {
        // pop-ups that open as a result of an action (e.g. after a successful password) are opened by the screen's scenario
        if (!SCENARIOS.includes(entry.code)) check(`${child.code} has a [data-opens] trigger`, false);
        continue;
      }
      trigger.click();
      const dlg = /** @type {HTMLDialogElement | null} */ (doc.querySelector(`dialog[data-code="${child.code}"]`));
      const opened = await waitFor(() => !!dlg && (dlg.open || dlg.hasAttribute("open")), 1500);
      check(`${child.code} opens from its trigger`, opened);
      if (dlg?.open) {
        dlg.dispatchEvent(new Event("cancel", { cancelable: true }));
        if (dlg.open) dlg.close();
      }
    }
  }

  // Links out
  for (const link of /** @type {HTMLAnchorElement[]} */ ([...doc.querySelectorAll("[data-leads-to]")])) {
    const target = link.dataset.leadsTo ?? "";
    const placeholder = link.hasAttribute("data-placeholder");
    const href = link.getAttribute("href");
    if (placeholder) check(`leads to ${target} → “Coming next” placeholder`, true);
    else check(`leads to ${target} → ${href}`, !!href && (await pageExists(href)));
  }

  // Accessibility basics: names, labels, landmarks, ids, and contrast of rendered text (light theme as loaded; done before the scenario, which may navigate away)
  const structure = auditStructure(doc);
  check("accessibility: names, labels, landmarks, ids", structure.length === 0, structure.map((i) => `${i.rule}: ${i.detail}`).join(" | "));
  const contrast = auditContrast(doc);
  check("accessibility: text contrast (AA)", contrast.length === 0, contrast.map((i) => i.detail).join(" | "));

  // Scripted scenario
  if (SCENARIOS.includes(entry.code)) {
    try {
      const mod = await import(`./scenarios/${entry.code}.js`);
      /** @type {Ctx} */
      const ctx = {
        win, doc, services,
        check,
        click: (sel) => {
          const el = /** @type {HTMLElement | null} */ (doc.querySelector(sel));
          if (!el) check(`click target ${sel} exists`, false);
          else el.click();
        },
        fill: (sel, value) => {
          const el = /** @type {HTMLInputElement | null} */ (doc.querySelector(sel));
          if (!el) return check(`field ${sel} exists`, false);
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        },
        wait, waitFor,
      };
      await mod.default(ctx);
    } catch (err) {
      check("scenario ran without throwing", false, String(/** @type {any} */ (err)?.message ?? err));
    }
  }

  // Console must be clean (errors AND warnings)
  const issues = issuesByFrame.get(frame) ?? /** @type {any[]} */ (win.__consoleIssues ?? []);
  check("console: zero errors and zero warnings", issues.length === 0, issues.map((i) => `${i.type}: ${i.message}`).join(" | "));

  frame.remove();
  issuesByFrame.delete(frame);
  useTestSession(); // scenarios may sign in / out
  return done(checks.every((c) => c.ok) ? "pass" : "fail");
}

/**
 * Work out what to run from the query string: ?screen=CODE | ?stage=04 | ?all=1
 * @param {URLSearchParams} qs
 */
export function selectEntries(qs) {
  const mains = ALL_ENTRIES.filter((e) => e.kind === "main");
  if (qs.get("screen")) {
    const m = mainOf(/** @type {string} */ (qs.get("screen")));
    return m ? [m] : [];
  }
  if (qs.get("stage")) return mains.filter((e) => e.stage === qs.get("stage"));
  return mains.filter((e) => BUILT.includes(e.code)); // all = every built screen
}

/** How much of the inventory exists, by kind (informational – the Final Gate demands 100%). */
export function coverage(/** @type {ScreenResult[]} */ results) {
  const total = { main: 0, sub: 0, popup: 0, output: 0, process: 0 };
  const built = { main: 0, sub: 0, popup: 0, output: 0, process: 0 };
  for (const e of ALL_ENTRIES.filter((x) => !x.code.startsWith("SYS-"))) {
    total[e.kind]++;
    if (e.kind === "process") {
      if (PROCESSES_BUILT.includes(e.code) && hasProcess(e.code)) built.process++;
    } else {
      const main = mainOf(e.code);
      const r = main && results.find((x) => x.code === main.code);
      // shared pop-ups (CM-P03 …) have no parent screen: any screen scenario may have verified them
      const childCheck = (e.parent === null ? results.flatMap((x) => x.checks) : r?.checks ?? []).find((c) => c.name.includes(e.code) && c.name.endsWith("exists"));
      if (e.kind === "main" ? r?.status === "pass" : childCheck?.ok) built[e.kind]++;
    }
  }
  return { total, built };
}

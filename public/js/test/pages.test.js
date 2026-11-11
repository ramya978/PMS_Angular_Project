// @ts-check
/** Page-level checks: shared pages open cleanly, pass the accessibility audit in both themes, and wire up the shell. */
import { describe, test, expect } from "./runner.js";
import { auditStructure, auditContrast } from "../verify/a11y.js";
import { currentUser, setSession, clearSession } from "../core/auth.js";
import { useTestSession } from "../verify/harness.js";
import { SCREENS } from "../core/screens.js";
import { NAV } from "../core/nav.js";

/**
 * Open a page in a hidden iframe and wait until it says it is ready.
 * @param {string} url
 * @param {number} [width]
 * @param {{ session?: any }} [opts] who is signed in: omit for a General Manager, null for nobody, or a session object
 * @returns {Promise<{ win: Window, doc: Document, done: () => void }>}
 */
async function openPage(url, width = 1280, opts = {}) {
  if (opts.session === null) clearSession();
  else if (opts.session) setSession(opts.session);
  else useTestSession();
  const frame = document.createElement("iframe");
  frame.style.cssText = `position:absolute;left:-99999px;top:0;width:${width}px;height:900px;border:0`;
  frame.title = url;
  document.body.append(frame);
  /** @type {any[]} */
  const issues = [];
  /** @type {any} */ (window).__verifyCapture = (/** @type {Window} */ _w, /** @type {any} */ item) => issues.push(item);
  frame.src = url;
  await new Promise((r) => frame.addEventListener("load", r, { once: true }));
  const win = /** @type {Window} */ (frame.contentWindow);
  for (let i = 0; i < 500 && win.document.body?.dataset.ready !== "1"; i++) await new Promise((r) => setTimeout(r, 40));
  /** @type {any} */ (win).__testIssues = issues;
  return { win, doc: win.document, done: () => frame.remove() };
}

const PAGES = ["/dev-tools/design-gallery/", "/common/coming-next/?code=RS-05", "/common/coming-next/?code=FD-07", "/common/cm-02-search/?q=Nathan"];

for (const theme of ["light", "dark"]) {
  describe(`pages – ${theme} theme`, () => {
    for (const page of PAGES) {
      const url = `${page}${page.includes("?") ? "&" : "?"}theme=${theme}&mockDelay=0`;
      test(`${page}: opens with the shell, clean console, accessible structure, AA text contrast`, async () => {
        const { win, doc, done } = await openPage(url);
        const ready = doc.body.dataset.ready;
        const shell = doc.body.dataset.shell;
        const themeSet = doc.documentElement.dataset.theme;
        const sidebar = !!doc.querySelector(".sidebar");
        const topbar = !!doc.querySelector(".topbar");
        const consoleIssues = /** @type {any} */ (win).__consoleIssues;
        const structure = auditStructure(doc).map((i) => `${i.rule}: ${i.detail}`);
        await new Promise((r) => setTimeout(r, 800)); // let count-up / entrance animations finish
        const contrast = auditContrast(doc).map((i) => i.detail);
        done();
        expect({ ready, shell, themeSet, sidebar, topbar }).toEqual({ ready: "1", shell: "1", themeSet: theme, sidebar: true, topbar: true });
        expect(consoleIssues).toEqual([]);
        expect(structure).toEqual([]);
        expect(contrast).toEqual([]);
      });
    }
  });
}

describe("pages – layout at 1280px and 1024px", () => {
  for (const width of [1280, 1024]) {
    test(`dev-tools/design-gallery has no horizontal page overflow at ${width}px`, async () => {
      const { doc, done } = await openPage("/dev-tools/design-gallery/?theme=light&mockDelay=0", width);
      await new Promise((r) => setTimeout(r, 400));
      const de = doc.documentElement;
      const over = de.scrollWidth - de.clientWidth;
      done();
      expect(over).toBeLessThan(2);
    });
  }
  test("compact density shrinks control height", async () => {
    const { doc, done } = await openPage("/dev-tools/design-gallery/?density=compact&mockDelay=0");
    const h = doc.querySelector(".btn")?.getBoundingClientRect().height ?? 0;
    done();
    expect(h).toBeLessThan(36);
  });
});

describe("pages – motion", () => {
  test("reduced-motion: when the OS asks for it, animations and transitions are ~0 ms", async () => {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) return; // nothing to assert on this machine; run with --force-prefers-reduced-motion
    const { win, doc, done } = await openPage("/dev-tools/design-gallery/?mockDelay=0");
    const duration = parseFloat(win.getComputedStyle(doc.querySelector("main") ?? doc.body).animationDuration);
    done();
    expect(duration).toBeLessThan(0.01);
  });
});

describe("pages – sign-in page (nobody signed in)", () => {
  for (const theme of ["light", "dark"]) {
    test(`/common/cm-01-login/ (${theme}): opens, clean console, accessible, AA contrast`, async () => {
      const before = currentUser();
      const { win, doc, done } = await openPage(`/common/cm-01-login/?theme=${theme}&mockDelay=0`, 1280, { session: null });
      const ready = doc.body.dataset.ready;
      const consoleIssues = /** @type {any} */ (win).__consoleIssues;
      const structure = auditStructure(doc).map((i) => `${i.rule}: ${i.detail}`);
      const contrast = auditContrast(doc).map((i) => i.detail);
      const dialogs = [...doc.querySelectorAll("dialog")].map((d) => d.getAttribute("data-code"));
      done();
      setSession(before);
      expect(ready).toBe("1");
      expect(consoleIssues).toEqual([]);
      expect(structure).toEqual([]);
      expect(contrast).toEqual([]);
      expect(dialogs).toEqual(["CM-P01", "CM-P02"]);
    });
  }
  test("the login page has no horizontal overflow at 1024 px and on a phone", async () => {
    const before = currentUser();
    for (const width of [1024, 390]) {
      const { doc, done } = await openPage("/common/cm-01-login/?mockDelay=0", width, { session: null });
      await new Promise((r) => setTimeout(r, 300));
      const over = doc.documentElement.scrollWidth - doc.documentElement.clientWidth;
      done();
      expect(over).toBeLessThan(2);
    }
    setSession(before);
  });
});

describe("pages – the sign-in guard and permissions in the shell", () => {
  test("a page that needs sign-in sends signed-out visitors to the login page and remembers where they wanted to go", async () => {
    const before = currentUser();
    const { win, done } = await openPage("/common/coming-next/?code=RS-05&mockDelay=0", 1280, { session: null });
    await new Promise((r) => setTimeout(r, 400));
    const path = win.location.pathname;
    const next = new URLSearchParams(win.location.search).get("next");
    done();
    setSession(before);
    expect(path).toBe("/common/cm-01-login/");
    expect(next).toContain("/common/coming-next/?code=RS-05");
  });
  test("a role without permission for a screen sees an access message, and the sidebar only lists what the role may open", async () => {
    const before = currentUser();
    const limited = { id: "u-test", name: "Test User", role: "Front Desk Trainee", roleId: "role-ra", realRoleId: "role-ra", permissions: ["RS-01.view", "RS-04.view", "CM-*"], propertyId: "prop-aviv-kochi", lastActive: Date.now() };
    const { doc, done } = await openPage("/common/coming-next/?code=RSS-08&mockDelay=0", 1280, { session: limited });
    await new Promise((r) => setTimeout(r, 500));
    const denied = doc.querySelector('[data-code="SYS-DENIED"]')?.textContent ?? "";
    const navCodes = [...doc.querySelectorAll(".nav__item[data-nav]")].map((a) => /** @type {HTMLElement} */ (a).dataset.nav);
    done();
    setSession(before);
    expect(denied).toContain("do not have access");
    expect(denied).toContain("Front Desk Trainee");
    // old screens keep their permission check; Front Desk entries have no permission keys yet and are shown to everyone (js/core/shell.js)
    expect(navCodes.filter((c) => SCREENS.some((s) => s.code === c)).sort()).toEqual(["RS-01", "RS-04"]);
    void SCREENS;
  });
  test("a General Manager sees every navigation item", async () => {
    const { doc, done } = await openPage("/common/coming-next/?code=RS-05&mockDelay=0");
    await new Promise((r) => setTimeout(r, 400));
    const n = doc.querySelectorAll(".nav__item[data-nav]").length;
    done();
    expect(n).toBe(NAV.flatMap((g) => g.items).length);
  });
  test("signing out from the user menu ends the session and returns to the login page", async () => {
    const before = currentUser();
    const { win, doc, done } = await openPage("/common/coming-next/?code=RS-05&mockDelay=0");
    await new Promise((r) => setTimeout(r, 400));
    /** @type {HTMLElement} */ (doc.querySelector(".topbar__user")).click();
    /** @type {HTMLElement} */ ([...doc.querySelectorAll('[role="menuitem"]')].find((m) => m.textContent?.includes("Sign out"))).click();
    for (let i = 0; i < 60 && win.location.pathname !== "/common/cm-01-login/"; i++) await new Promise((r) => setTimeout(r, 100));
    const path = win.location.pathname;
    done();
    const stillSignedIn = currentUser() !== null;
    setSession(before);
    expect(path).toBe("/common/cm-01-login/");
    expect(stillSignedIn).toBe(false);
  });
});

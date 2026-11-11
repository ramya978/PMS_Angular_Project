// @ts-check
/**
 * Scenario for CM-02 Global Search Results, and for the shared pop-ups CM-P03 … CM-P09 (they are opened inside the page
 * under test and must show up as real dialogs).
 */

/** @param {import("../harness.js").Ctx} ctx */
export default async function scenario(ctx) {
  const $ = (/** @type {string} */ s) => /** @type {HTMLElement | null} */ (ctx.doc.querySelector(s));
  const $$ = (/** @type {string} */ s) => /** @type {HTMLElement[]} */ ([...ctx.doc.querySelectorAll(s)]);
  const win = /** @type {any} */ (ctx.win);

  // empty state first
  ctx.check("no query: shows the “Search for anything” hint", /Search for anything/.test($(".sr__results")?.textContent ?? ""));

  // a booking number
  ctx.fill(".sr__form input", "FK-10001");
  ctx.click(".sr__form button[type=submit]");
  await ctx.waitFor(() => !!$('[data-group="booking"]'), 4000);
  const first = $('[data-group="booking"] a.sr__item');
  ctx.check("booking number: the booking comes first", /FK-10001/.test(first?.textContent ?? ""), first?.textContent ?? "none");
  ctx.check("booking result leads to RS-07 with its id", first?.getAttribute("data-leads-to") === "RS-07" && /id=FK-10001/.test(first?.getAttribute("href") ?? ""), first?.getAttribute("href") ?? "");
  ctx.check("the match is highlighted", !!first?.querySelector("mark"));
  ctx.check("the URL keeps the query (deep link)", /q=FK-10001/.test(ctx.win.location.search), ctx.win.location.search);

  // a guest by name (take a real one from the data)
  const guests = await ctx.services.search.search({ q: "Nathan", perKind: 5 });
  ctx.check("data flow: guests named Nathan are found through the search service", guests.groups.guest.length > 0 && guests.groups.guest.every((g) => /nathan/i.test(g.title)));
  ctx.fill(".sr__form input", "Nathan");
  ctx.click(".sr__form button[type=submit]");
  await ctx.waitFor(() => !!$('[data-group="guest"]'), 4000);
  ctx.check("guest result leads to RS-18", $('[data-group="guest"] a.sr__item')?.getAttribute("data-leads-to") === "RS-18");

  // filter chips
  const chip = $$(".sr__chip").find((c) => /Guests/.test(c.textContent ?? ""));
  chip?.click();
  await ctx.wait(50);
  ctx.check("filter chip shows only guests", $$(".sr__group").length === 1 && $(".sr__group")?.getAttribute("data-group") === "guest");

  // rooms lead to the in-house guests screen
  ctx.fill(".sr__form input", "305");
  ctx.click(".sr__form button[type=submit]");
  await ctx.waitFor(() => !!$('[data-group="room"]'), 4000);
  const room = $('[data-group="room"] a.sr__item');
  ctx.check("room result leads to FD-07 (In-house Guests)", room?.getAttribute("data-leads-to") === "FD-07" && !room?.hasAttribute("data-placeholder") && /fd-07-in-house-guests/.test(room?.getAttribute("href") ?? ""), room?.getAttribute("href") ?? "");

  // keyboard: ArrowDown from the search box goes to the first result, Enter would follow the link
  /** @type {HTMLInputElement | null} */ ($(".sr__form input"))?.focus();
  ctx.doc.dispatchEvent(new Event("noop"));
  $(".sr__form input")?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  ctx.check("keyboard: ArrowDown moves focus to the first result", ctx.doc.activeElement?.classList.contains("sr__item") === true);

  // nothing found
  ctx.fill(".sr__form input", "zzzzqqq");
  ctx.click(".sr__form button[type=submit]");
  await ctx.waitFor(() => /No results/.test($(".sr__results")?.textContent ?? ""), 4000);
  ctx.check("no match: friendly empty state with a next step", /No results for/.test($(".sr__results")?.textContent ?? "") && !!$(".sr__results .empty .btn"));

  // ── shared pop-ups, opened inside the page under test ──
  /** @type {Array<[string, string, string]>} code, name, script that opens it (not awaited) */
  const POPUPS = [
    ["CM-P03", "Notifications Panel", 'import("/js/core/shell.js").then((m) => m.openNotifications())'],
    ["CM-P04", "Request Approval", 'import("/js/components/request-approval.js").then((m) => m.requestApprovalDialog({ type: "discount", value: 12, summary: "12% discount on FK-10001", approverName: "Reservation Manager", limitText: "5%" }))'],
    ["CM-P05", "Unsaved Changes", 'import("/js/components/unsaved.js").then((m) => m.openUnsavedChanges())'],
    ["CM-P06", "Session Timeout Warning", 'import("/js/components/session-warning.js").then((m) => m.openSessionWarning({ remainingMs: () => 59000, onStay() {}, onSignOut() {} }))'],
    ["CM-P07", "Confirm Action", 'import("/js/components/confirm.js").then((m) => m.confirmAction({ title: "Cancel reservation FK-10001?", message: "This releases the room.", danger: true }))'],
    ["CM-P08", "Export / Print Options", 'import("/js/components/export-options.js").then((m) => m.openExportOptions({ title: "Rooms", columns: [{ key: "a", label: "A" }], rows: [{ a: 1 }] }))'],
    ["CM-P09", "Property Switcher", 'import("/js/components/property-switcher.js").then((m) => m.openPropertySwitcher())'],
  ];
  for (const [code, name, script] of POPUPS) {
    win.eval(script);
    const open = await ctx.waitFor(() => /** @type {HTMLDialogElement | null} */ (ctx.doc.querySelector(`dialog[data-code="${code}"]`))?.open === true, 4000);
    ctx.check(`popup ${code} “${name}” exists`, open);
    const dlg = /** @type {HTMLDialogElement | null} */ (ctx.doc.querySelector(`dialog[data-code="${code}"]`));
    if (dlg) {
      ctx.check(`${code} has an accessible name and a Close / Cancel way out`, !!dlg.getAttribute("aria-labelledby") && !!dlg.querySelector("button"));
      dlg.dispatchEvent(new Event("cancel", { cancelable: true })); // Esc
      await ctx.waitFor(() => !ctx.doc.querySelector(`dialog[data-code="${code}"]`), 1500);
      if (ctx.doc.querySelector(`dialog[data-code="${code}"]`)) ctx.doc.querySelector(`dialog[data-code="${code}"]`)?.remove(); // CM-P06 cannot be dismissed on purpose
    }
  }
}

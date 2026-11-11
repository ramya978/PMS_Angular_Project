// @ts-check
/** Scenario for RSS-01 Setup Home: checklist cards, filters, links to the setup screens, and the two reports (RSS-O01, RSS-O06). */

/** @param {import("../harness.js").Ctx} ctx */
export default async function scenario(ctx) {
  const $ = (/** @type {string} */ s) => /** @type {HTMLElement | null} */ (ctx.doc.querySelector(s));
  const $$ = (/** @type {string} */ s) => /** @type {HTMLElement[]} */ ([...ctx.doc.querySelectorAll(s)]);

  const loaded = await ctx.waitFor(() => $$(".sh__step").length > 0, 4000);
  ctx.check("the checklist loads one card per setup screen", loaded && $$(".sh__step").length === 25, `${$$(".sh__step").length} cards`);

  // data flow: the cards agree with the service
  const status = await ctx.services.setup.getSetupStatus();
  ctx.check("data flow: card count equals the steps from the setup service", $$(".sh__step").length === status.steps.length);
  ctx.check("progress ring shows the service's percentage", ($(".sh__ring-num")?.textContent ?? "") === `${status.totals.percent}%`, $(".sh__ring-num")?.textContent ?? "none");
  ctx.check("every card shows a status with an icon and a label (never colour alone)", $$(".sh__step .pill").every((p) => !!p.querySelector("svg") && (p.textContent ?? "").trim().length > 3));

  // links
  const rss02 = $('.sh__step a[data-leads-to="RSS-02"]');
  ctx.check("each card links to its setup screen", $$(".sh__step a[data-leads-to]").length === 25 && !!rss02);
  ctx.check("static setup screens link to their HTML page (no placeholder)", (rss02?.getAttribute("href") ?? "") === "/setup/rss-02-hotel-details/" && rss02?.hasAttribute("data-placeholder") === false);

  // filters
  const chip = (/** @type {RegExp} */ re) => $$(".sh__chip").find((c) => re.test(c.textContent ?? ""));
  chip(/Not started/)?.click();
  await ctx.wait(50);
  ctx.check("filter “Not started” shows only those cards", $$(".sh__step").length === status.totals.notStarted, `${$$(".sh__step").length} cards`);
  chip(/Done/)?.click();
  await ctx.wait(50);
  ctx.check("filter “Done” shows the done cards", $$(".sh__step").length === status.totals.done);
  chip(/All steps/)?.click();
  await ctx.wait(50);
  ctx.check("filter “All steps” shows every card again", $$(".sh__step").length === status.steps.length);

  // outputs
  ctx.check("RSS-O01 checklist report lists every step", $$('[data-code="RSS-O01"] tbody tr').length === status.steps.length);
  const audit = await ctx.waitFor(() => $$('[data-code="RSS-O06"] tbody tr').length > 0, 4000);
  const changes = await ctx.services.setup.listSetupChanges({ limit: 1000 });
  ctx.check("RSS-O06 audit report shows setup changes from the audit log", audit && changes.total > 0, `${changes.total} changes`);
  ctx.check("data flow: audit rows are only setup records", changes.items.every((c) => !!c.screen && /^RSS-/.test(c.screen)));

  // export button opens CM-P08
  const exportBtn = $$('[data-code="RSS-O01"] button').find((b) => /Export or print/.test(b.textContent ?? ""));
  exportBtn?.click();
  const opened = await ctx.waitFor(() => /** @type {HTMLDialogElement | null} */ ($('dialog[data-code="CM-P08"]'))?.open === true, 3000);
  ctx.check("Export or print opens CM-P08", opened);
  const dlg = /** @type {HTMLDialogElement | null} */ ($('dialog[data-code="CM-P08"]'));
  dlg?.dispatchEvent(new Event("cancel", { cancelable: true }));
  await ctx.waitFor(() => !$('dialog[data-code="CM-P08"]'), 1500);
}

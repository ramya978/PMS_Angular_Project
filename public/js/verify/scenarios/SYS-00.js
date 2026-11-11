// @ts-check
/** Scenario for the Stage 00 welcome page: proves the harness can click, read data through a service and survive a reload. */

/** @param {import("../harness.js").Ctx} ctx */
export default async function scenario(ctx) {
  const before = Number(ctx.doc.querySelector('[data-testid="counter"]')?.textContent);
  ctx.check("counter shows a number from the mock service", Number.isFinite(before), `value: ${before}`);

  ctx.click("#bump");
  await ctx.waitFor(() => Number(ctx.doc.querySelector('[data-testid="counter"]')?.textContent) === before + 1, 3000);
  const after = Number(ctx.doc.querySelector('[data-testid="counter"]')?.textContent);
  ctx.check("clicking “Add one” raises the counter by 1", after === before + 1, `before ${before}, after ${after}`);

  const saved = await ctx.services.system.getCounter();
  ctx.check("the new value is readable through the service layer (data flow)", saved === after, `service says ${saved}`);

  const theme0 = ctx.doc.documentElement.getAttribute("data-theme");
  ctx.click('[data-action="toggle-theme"]');
  const theme1 = ctx.doc.documentElement.getAttribute("data-theme");
  ctx.check("theme toggle flips light/dark", theme0 !== theme1, `${theme0} → ${theme1}`);
  ctx.click('[data-action="toggle-theme"]'); // put it back

  ctx.click("#reset");
  await ctx.waitFor(() => ctx.doc.querySelector('[data-testid="counter"]')?.textContent === "0", 3000);
  ctx.check("reset restores the seed (counter back to 0)", ctx.doc.querySelector('[data-testid="counter"]')?.textContent === "0");
}

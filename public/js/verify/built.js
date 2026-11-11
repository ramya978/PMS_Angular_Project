// @ts-check
/**
 * Codes the harness should treat as built. A main screen is added here when its build starts being verified
 * (the harness then also demands its page file, its sub-screens / pop-ups / outputs and a clean console).
 * Add a code to SCENARIOS when js/verify/scenarios/<code>.js exists.
 */

/** Main-screen codes whose page exists. */
export const BUILT = ["SYS-00", "CM-01", "CM-02", "RSS-01"];

/** Process codes (…-X…) that are registered in js/core/processes.js. */
export const PROCESSES_BUILT = /** @type {string[]} */ (["CM-X01", "CM-X02", "CM-X03"]);

/** Codes that have a scripted scenario module in js/verify/scenarios/. */
export const SCENARIOS = /** @type {string[]} */ (["SYS-00", "CM-01", "CM-02"]); // RSS-01 is a static page since 2026-11-04

/** Screens the harness opens while nobody is signed in (the sign-in page). */
export const SIGNED_OUT = ["CM-01"];

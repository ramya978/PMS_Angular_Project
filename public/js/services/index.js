// @ts-check
/**
 * Picks the mock or http implementation from js/config.js.
 * Pages import services from here and never know which one they got.
 */
import { DATA_MODE } from "../config.js";

const impl = DATA_MODE === "mock" ? await import("./mock/index.js") : await import("./http/index.js");

export const system = impl.system;
export const notifications = impl.notifications;
export const auth = impl.auth;
export const audit = impl.audit;
export const approvals = impl.approvals;
export const search = impl.search;
export const backup = impl.backup;
export const setup = impl.setup;

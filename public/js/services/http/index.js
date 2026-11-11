// @ts-check
/**
 * Real-API implementations go here (same function names and return shapes as ../mock/).
 * Empty on purpose: the backend team fills this in using docs/API_CONTRACT.md.
 */
const notBuilt = (/** @type {string} */ name) => () => Promise.reject(new Error(`HTTP service "${name}" is not built yet – set DATA_MODE to "mock".`));

export const system = new Proxy({}, { get: (_t, fn) => notBuilt(`system.${String(fn)}`) });
export const notifications = new Proxy({}, { get: (_t, fn) => notBuilt(`notifications.${String(fn)}`) });
export const auth = new Proxy({}, { get: (_t, fn) => notBuilt(`auth.${String(fn)}`) });
export const audit = new Proxy({}, { get: (_t, fn) => notBuilt(`audit.${String(fn)}`) });
export const approvals = new Proxy({}, { get: (_t, fn) => notBuilt(`approvals.${String(fn)}`) });
export const search = new Proxy({}, { get: (_t, fn) => notBuilt(`search.${String(fn)}`) });
export const backup = new Proxy({}, { get: (_t, fn) => notBuilt(`backup.${String(fn)}`) });
export const setup = new Proxy({}, { get: (_t, fn) => notBuilt(`setup.${String(fn)}`) });

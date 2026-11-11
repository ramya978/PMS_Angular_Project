// @ts-check
/**
 * Registry of the simulated off-screen processes (the "X" codes: RS-X11 option-date expiry, RSS-X03 channel push …).
 * Mock services register their process here; dev-tools/dev-panel lists them and can trigger each one;
 * dev-tools/verify checks that every process code of a finished stage is registered.
 */
import { emit } from "./events.js";

/**
 * @typedef {Object} ProcessDef
 * @property {string} name
 * @property {string} runsWhen  plain-English schedule, e.g. "Daily / night audit"
 * @property {(args?: any) => Promise<any> | any} run  does the work and returns a short result for the UI / log
 */

/** @type {Map<string, ProcessDef>} */
const registry = new Map();

/**
 * @param {string} code e.g. "RS-X11"
 * @param {ProcessDef} def
 */
export function registerProcess(code, def) {
  registry.set(code, def);
}

/** @returns {Array<{ code: string } & ProcessDef>} */
export const listProcesses = () => [...registry].map(([code, def]) => ({ code, ...def }));

/** @param {string} code */
export const hasProcess = (code) => registry.has(code);

/**
 * Trigger a process by hand (dev-tools/dev-panel) or from the simulated scheduler.
 * @param {string} code
 * @param {any} [args]
 */
export async function runProcess(code, args) {
  const def = registry.get(code);
  if (!def) throw new Error(`Process ${code} is not registered`);
  const result = await def.run(args);
  emit("process.ran", { code, name: def.name, result });
  return result;
}

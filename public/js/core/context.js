// @ts-check
/**
 * Small shared state every screen needs synchronously: the property, the hotel business date and the signed-in user.
 * `initContext()` loads it once (through the services); components such as date pickers then read it without waiting.
 */
import { system } from "../services/index.js";
import { currentUser } from "./auth.js";
import { on } from "./events.js";
import { realToday } from "./format.js";

const state = {
  /** @type {any} */ property: null,
  businessDate: realToday(),
  user: /** @type {{ id: string, name: string, role: string }} */ (currentUser() ?? { id: "", name: "Not signed in", role: "" }),
};
let loaded = false;

export async function initContext() {
  if (loaded) return state;
  const [property, businessDate] = await Promise.all([system.getProperty(), system.getBusinessDate()]);
  state.property = property;
  state.businessDate = businessDate;
  state.user = currentUser() ?? state.user;
  loaded = true;
  return state;
}

on("system.businessDateChanged", (p) => {
  state.businessDate = p.new;
});

/** The hotel's working date (YYYY-MM-DD) – never the computer date. */
export const businessDate = () => state.businessDate;
export const property = () => state.property;
/** The signed-in person. */
export const user = () => currentUser() ?? state.user;

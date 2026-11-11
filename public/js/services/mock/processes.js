// @ts-check
/**
 * Off-screen processes of the common module, simulated. Each can be run from the developer panel (dev-tools/dev-panel) and writes
 * a line to the event log; the effect is also visible in the app (session, hidden buttons, backup date).
 */
import { registerProcess } from "../../core/processes.js";
import { currentUser } from "../../core/auth.js";
import { can } from "../../core/permissions.js";
import { SCREENS } from "../../core/screens.js";
import * as store from "../../core/store.js";
import { runBackup } from "./backup.js";

registerProcess("CM-X01", {
  name: "Login & session service",
  runsWhen: "Login / every click (idle timer)",
  run: () => {
    const s = currentUser();
    if (!s) return { signedIn: false };
    const minutes = store.get("reservationParameters", "params")?.sessionTimeoutMinutes ?? 20;
    const idleMinutes = Math.round((Date.now() - (s.lastActive ?? Date.now())) / 60000);
    return { signedIn: true, user: s.name, role: s.role, idleMinutes, timesOutIn: `${Math.max(0, minutes - idleMinutes)} min` };
  },
});

registerProcess("CM-X02", {
  name: "Permission check",
  runsWhen: "Every screen and button",
  run: () => {
    const s = currentUser();
    const keys = store.all("permissions").map((p) => p.id);
    const allowed = keys.filter((k) => can(k)).length;
    const screens = SCREENS.filter((sc) => can(`${sc.code}.view`)).length;
    return { role: s?.role ?? "nobody signed in", permissionsAllowed: allowed, permissionsDenied: keys.length - allowed, screensVisible: screens, screensHidden: SCREENS.length - screens };
  },
});

registerProcess("CM-X03", {
  name: "Backup",
  runsWhen: "Daily (and from the developer panel)",
  run: async () => {
    const b = await runBackup();
    return { records: b.records, kb: Math.round(b.bytes / 1024), businessDate: b.businessDate };
  },
});

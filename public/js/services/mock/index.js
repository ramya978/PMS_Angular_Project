// @ts-check
/** Mock implementations (Promises with simulated delay). One module per area is added as screens need it. */
import * as system from "./system.js";
import * as notifications from "./notifications.js";
import * as auth from "./auth.js";
import * as audit from "./audit.js";
import * as approvals from "./approvals.js";
import * as search from "./search.js";
import * as backup from "./backup.js";
import * as setup from "./setup.js";
import "./processes.js"; // registers the simulated processes (CM-X01 … CM-X03)

export { system, notifications, auth, audit, approvals, search, backup, setup };

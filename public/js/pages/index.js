// @ts-check
/** Entry point: signed-in people go to their home page, everyone else to the sign-in page. */
import { currentUser } from "../core/auth.js";
import { screenUrl } from "../core/screens.js";

const s = currentUser();
location.replace(s ? screenUrl("CM-06") : "/common/cm-01-login/");

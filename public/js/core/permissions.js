// @ts-check
/**
 * Permissions. A key is "<screen code>.<action>", for example "RS-05.create", "RSS-08.edit", "RS-10.refund".
 * Roles hold PATTERNS: "*" (everything), "RS-*" (every action on every reservation screen), "RS-*.view",
 * "RS-0[1-9].create" (a range), "RSS-08.edit". A pattern without an action covers every action of those screens.
 * Elements can carry data-permission="RS-05.create" – applyPermissions() disables (or hides) them with a tooltip that says why.
 */
import { currentUser } from "./auth.js";

/** @type {Map<string, RegExp>} */
const cache = new Map();

/** @param {string} glob */
function globToRegex(glob) {
  let re = "";
  for (const ch of glob) re += ch === "*" ? ".*" : "[]-".includes(ch) ? ch : /[.+?^${}()|\\]/.test(ch) ? `\\${ch}` : ch;
  return new RegExp(`^${re}$`);
}

/**
 * Does a pattern cover a key?
 * @param {string} pattern
 * @param {string} key
 */
export function matchesPattern(pattern, key) {
  if (pattern === "*") return true;
  const dot = pattern.indexOf(".");
  const [pScreen, pAction] = dot < 0 ? [pattern, "*"] : [pattern.slice(0, dot), pattern.slice(dot + 1)];
  const kd = key.indexOf(".");
  const [kScreen, kAction] = kd < 0 ? [key, ""] : [key.slice(0, kd), key.slice(kd + 1)];
  const rx = (/** @type {string} */ g) => cache.get(g) ?? (cache.set(g, globToRegex(g)), /** @type {RegExp} */ (cache.get(g)));
  return rx(pScreen).test(kScreen) && rx(pAction).test(kAction);
}

/**
 * @param {string} permission
 * @param {{ permissions?: string[] } | null} [user] defaults to the signed-in user
 * @returns {boolean}
 */
export function can(permission, user = currentUser()) {
  if (!user?.permissions) return false;
  return user.permissions.some((p) => matchesPattern(p, permission));
}

/** Plain-English reason shown when something is switched off. @param {string} permission */
export function deniedReason(permission) {
  const role = currentUser()?.role ?? "Your role";
  const action = permission.split(".")[1] ?? "do this";
  return `${role === "Your role" ? role : `Your role (${role})`} cannot ${action.replace(/-/g, " ")} here. Ask a manager if you need this.`;
}

/**
 * Switch off (default) or hide every [data-permission] element inside `root` that the person may not use.
 * Use data-permission-mode="hide" to remove it from view instead.
 * @param {ParentNode} [root]
 * @returns {number} how many elements were affected
 */
export function applyPermissions(root = document) {
  let n = 0;
  for (const el of /** @type {HTMLElement[]} */ ([...root.querySelectorAll("[data-permission]")])) {
    const key = el.dataset.permission ?? "";
    const ok = can(key);
    if (ok) {
      if (el.dataset.permissionApplied) {
        el.removeAttribute("aria-disabled");
        el.removeAttribute("title");
        if ("disabled" in el) /** @type {any} */ (el).disabled = false;
        el.hidden = false;
        delete el.dataset.permissionApplied;
      }
      continue;
    }
    n++;
    if (el.dataset.permissionApplied) continue;
    el.dataset.permissionApplied = "1";
    if (el.dataset.permissionMode === "hide") el.hidden = true;
    else {
      el.setAttribute("aria-disabled", "true");
      if ("disabled" in el) /** @type {any} */ (el).disabled = true;
      el.title = deniedReason(key);
    }
  }
  return n;
}

/** Keep newly added elements in line with the person's permissions. */
export function watchPermissions() {
  const mo = new MutationObserver((records) => {
    for (const r of records) for (const node of r.addedNodes) if (node instanceof HTMLElement) {
      if (node.dataset?.permission) applyPermissions(/** @type {any} */ ({ querySelectorAll: () => [node] }));
      if (node.querySelector?.("[data-permission]")) applyPermissions(node);
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  return () => mo.disconnect();
}

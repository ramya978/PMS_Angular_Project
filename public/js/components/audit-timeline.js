// @ts-check
/**
 * History tab: who changed what and when, as a timeline with old → new chips. Used by every record's History tab.
 *   const { items } = await audit.listAudit({ entity: "reservations", entityId: "FK-10234" });
 *   el.append(auditTimeline(items, userNames));
 */
import { h } from "../core/dom.js";
import { formatMoney } from "../core/format.js";
import { timeline } from "./display.js";

const MONEY_FIELD = /(rate\d*|total|amount|price|paid|balance|penalty|subtotal|tax|charge|limit|breakfast|lunch|dinner|discount)$/i;

/** @param {string} field */
export const fieldLabel = (field) => field.replace(/\./g, " › ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/^./, (c) => c.toUpperCase());

/**
 * Text for one side of a change. Money fields (integer paise) are shown as ₹; empty is “–”.
 * @param {string} field
 * @param {any} v
 */
export function auditValue(field, v) {
  if (v === null || v === undefined || v === "") return "–";
  if (typeof v === "number" && Number.isInteger(v) && MONEY_FIELD.test(field.split(".").at(-1) ?? "") && Math.abs(v) >= 100) return formatMoney(v);
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "–";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const ACTION_TEXT = /** @type {Record<string, [string, string]>} */ ({ create: ["Created", "plus"], update: ["Changed", "pencil"], delete: ["Deleted", "trash"], status: ["Status changed", "refresh"], login: ["Account activity", "user"] });

/**
 * @param {import("../domain/models.js").AuditLog[]} entries newest first
 * @param {Map<string, string> | Record<string, string>} [userNames] user id → name
 */
export function auditTimeline(entries, userNames = {}) {
  const name = (/** @type {string} */ id) => (userNames instanceof Map ? userNames.get(id) : userNames[id]) ?? id;
  if (!entries.length) return h("p", { class: "dev__meta" }, "No changes recorded yet.");
  return timeline(entries.map((e) => {
    const [verb, icon] = ACTION_TEXT[e.action] ?? ["Changed", "pencil"];
    const when = new Date(e.at);
    const stamp = `${when.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · ${when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    return {
      title: `${verb} by ${name(e.userId)}`, meta: stamp, icon,
      body: h("div", { class: "audit" },
        e.note ? h("p", { class: "audit__note" }, e.note) : null,
        e.changes.slice(0, 12).map((c) => h("p", { class: "audit__change" }, h("span", { class: "audit__field" }, fieldLabel(c.field)), " ", h("span", { class: "chip" }, auditValue(c.field, c.old)), " → ", h("span", { class: "chip chip--new" }, auditValue(c.field, c.new)))),
        e.changes.length > 12 ? h("p", { class: "audit__note" }, `…and ${e.changes.length - 12} more fields`) : null),
    };
  }));
}

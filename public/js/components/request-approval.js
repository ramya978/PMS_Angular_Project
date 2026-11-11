// @ts-check
/**
 * Request Approval (CM-P04). When an action is above the person's limit the screen calls guardLimit():
 *   const r = await guardLimit({ type: "discount", value: 12, reservationId: "FK-10234", summary: "12% discount on FK-10234" });
 *   if (r.allowed) applyNow();          // inside the limit
 *   else if (r.request) …               // a request was sent; the change waits for the approver
 *   else …                               // the person cancelled
 */
import { h } from "../core/dom.js";
import { formatMoney } from "../core/format.js";
import { approvals } from "../services/index.js";
import { TYPE_RULES, describeValue } from "../domain/approvals.js";
import { openDialog } from "./dialog.js";
import { field, select, textarea } from "./fields.js";
import { keyValue } from "./display.js";
import { toast } from "./toast.js";

/**
 * Ask for approval in a pop-up.
 * @param {{ type: keyof typeof TYPE_RULES, value: number, reservationId?: string, summary?: string, payload?: any, approverName?: string, limitText?: string }} o
 * @returns {Promise<import("../domain/models.js").ApprovalRequest | null>} the request, or null when cancelled
 */
export function requestApprovalDialog(o) {
  const rule = TYPE_RULES[o.type];
  const reasonSel = field({ label: "Reason", control: select({ options: [], placeholder: "Choose a reason" }), required: true });
  const note = field({ label: "Note for the approver", control: textarea({ rows: 3, placeholder: "Anything that helps them decide quickly" }), optional: true });
  const status = h("p", { class: "field__error", attrs: { role: "alert", hidden: true } });
  const body = h("div", { class: "stack" },
    keyValue([
      ["Request", `${rule.label}: ${describeValue(o.type, o.value, formatMoney)}`],
      ...(o.summary ? /** @type {Array<[string, string]>} */ ([["For", o.summary]]) : []),
      ...(o.limitText ? /** @type {Array<[string, string]>} */ ([["Your limit", o.limitText]]) : []),
      ["Will be decided by", o.approverName ?? "your approver"],
    ]),
    reasonSel.el, note.el, status);

  // fill the reasons once they arrive
  void approvals.listReasons({ type: o.type }).then((list) => {
    const sel = /** @type {HTMLSelectElement} */ (reasonSel.control.input);
    for (const r of list) sel.append(h("option", { value: r.id, dataset: { remarks: String(r.remarksRequired) } }, r.name));
  });

  const dlg = openDialog({
    code: "CM-P04", title: "Ask for approval", description: "This is above your limit, so a manager has to approve it first.", body, size: "md",
    actions: [
      { label: "Cancel", variant: "secondary", value: null },
      {
        label: "Send request", variant: "primary", keepOpen: true,
        onClick: async () => {
          reasonSel.setError("");
          note.setError("");
          status.hidden = true;
          const reasonId = reasonSel.control.getValue();
          try {
            const req = await approvals.requestApproval({ type: o.type, value: o.value, reservationId: o.reservationId, reasonId: reasonId || undefined, reasonNote: note.control.getValue(), payload: o.payload });
            toast({ message: `Request sent to ${o.approverName ?? "your approver"}. You will be told when it is decided.` });
            await dlg.close(req);
          } catch (err) {
            const e = /** @type {any} */ (err);
            if (e.fields?.reasonId) reasonSel.setError(e.fields.reasonId);
            else if (e.fields?.reasonNote) note.setError(e.fields.reasonNote);
            else { status.textContent = e.message ?? "The request could not be sent."; status.hidden = false; }
          }
        },
      },
    ],
  });
  return dlg.result.then((v) => v ?? null);
}

/**
 * Check the person's limit and, when it is exceeded, open the request pop-up.
 * @param {{ type: keyof typeof TYPE_RULES, value: number, reservationId?: string, summary?: string, payload?: any }} o
 * @returns {Promise<{ allowed: boolean, request?: import("../domain/models.js").ApprovalRequest, cancelled?: boolean }>}
 */
export async function guardLimit(o) {
  const check = await approvals.checkApprovalLimit({ type: o.type, value: o.value });
  if (check.allowed) return { allowed: true };
  const limitText = describeValue(o.type, check.limit, formatMoney);
  const request = await requestApprovalDialog({ ...o, approverName: check.approverRoleName ?? undefined, limitText });
  return request ? { allowed: false, request } : { allowed: false, cancelled: true };
}

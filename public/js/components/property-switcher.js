// @ts-check
/** Property Switcher (CM-P09): pick the hotel to work in (for groups with more than one property). */
import { h } from "../core/dom.js";
import { auth } from "../services/index.js";
import { openDialog } from "./dialog.js";
import { radioGroup } from "./fields.js";
import { toast } from "./toast.js";

/** @returns {Promise<string | null>} id of the chosen property, or null when nothing changed */
export async function openPropertySwitcher() {
  const { properties, currentId } = await auth.listMyProperties();
  const many = properties.length > 1;
  const choice = radioGroup({
    name: "property", legend: "Hotel", value: currentId,
    options: properties.map((p) => ({ value: p.id, label: p.name, hint: p.city ? `· ${p.city}` : "" })),
  });
  const body = h("div", { class: "stack" },
    many ? h("p", {}, "Choose the hotel you want to work in. Everything you see afterwards belongs to that hotel.") : h("p", {}, "You work in one hotel. If your group adds more hotels and you are given access, you will be able to switch here."),
    choice.el);
  const dlg = openDialog({
    code: "CM-P09", title: "Change hotel", body, size: "sm",
    actions: many
      ? [{ label: "Cancel", variant: "secondary", value: null }, { label: "Switch", variant: "primary", keepOpen: true, onClick: async () => { const id = choice.getValue(); if (id !== currentId) { await auth.setProperty(id); toast({ message: "Hotel changed" }); } await dlg.close(id === currentId ? null : id); } }]
      : [{ label: "Close", variant: "primary", value: null }],
  });
  return (await dlg.result) ?? null;
}

// @ts-check
/** SYS-COMING – placeholder for screens that are not built yet (and Front Desk screens, which belong to the next phase). */
import { bootPage } from "/js/core/shell.js";
import { param } from "/js/core/router.js";
import { screenByCode } from "/js/core/screens.js";
import { pageHeader, emptyState } from "/js/components/display.js";

const code = param("code") ?? "";
document.body.dataset.nav = code; // light up the sidebar item of the screen that is coming
const { main } = await bootPage();
const screen = screenByCode(code);
const frontDesk = /^FDS?-/.test(code);

document.title = `${screen?.title ?? "Coming next"} · Aviv PMS`;
main.append(
  pageHeader({
    title: screen?.title ?? (frontDesk ? "Front Desk" : "Coming next"),
    description: frontDesk ? "Front Desk – coming in the next phase." : screen?.purpose || "This screen is being built.",
    code: code || undefined,
  }),
  emptyState({
    kind: "list",
    headingLevel: 2,
    title: frontDesk ? "Front Desk – coming in the next phase" : "Coming next",
    message: frontDesk
      ? "Check-in, the room board and the folio belong to the next phase of Aviv PMS. Reservations already produce the data they will need."
      : "This screen is planned for an upcoming build step. Everything it links to is already wired, so it will open here as soon as it is ready.",
    action: { label: "Back to the start", href: "/" },
  }));
document.body.dataset.ready = "1";

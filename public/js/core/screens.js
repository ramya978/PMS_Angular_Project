// @ts-check
/**
 * Screen registry – code, title, file, module, nav group, icon, permission, help text.
 * Used by the sidebar, command palette, breadcrumbs and help drawer. Generated from the screen cards in
 * docs/BUILD_INSTRUCTIONS.md; `built` is the set of screens whose page file exists (others open the “Coming next” page).
 *
 * @typedef {{ code: string, title: string, file: string, module: "common" | "reservation" | "setup", group: string, icon: string,
 *   nav: boolean, permission: string, purpose: string, openedFrom: string, leadsTo: string }} Screen
 */

import { FD_SCREENS, FD_BUILT } from "./screens-fd.js";

/** Codes whose page file exists. Add a code here when its page is created. */
const BUILT = new Set(/** @type {string[]} */ (["CM-01", "CM-02", "RSS-01"]));

/** Static screens (HTML + CSS only, no JavaScript – see docs/STATIC_SCREENS.md). Add a code here when its page is stamped. */
const STATIC = ["RS-25", "RS-26", "RS-27", "RS-28", "RSS-02", "RSS-03", "RSS-04", "RSS-05", "RSS-06", "RSS-07", "RSS-08", "RSS-09", "RSS-10", "RSS-11", "RSS-12", "RSS-13", "RSS-14", "RSS-15", "RSS-16", "RSS-17", "RSS-18", "RSS-19", "RSS-20", "RSS-21", "RSS-22", "RSS-23", "RSS-24", "RSS-25", "RSS-26", "RS-01", "RS-02", "RS-03", "RS-04", "RS-05", "RS-06", "RS-07", "RS-08", "RS-09", "RS-10", "RS-11", "RS-12", "RS-13", "RS-14", "RS-15", "RS-16", "RS-17", "RS-18", "RS-19", "RS-20", "RS-21", "RS-23", "RS-24"];
for (const code of STATIC) BUILT.add(code);

/** @type {Screen[]} */
export const SCREENS = [
 { "code": "CM-01", "title": "Login", "file": "/common/cm-01-login/", "module": "common", "group": "Common", "icon": "log-in", "nav": false, "permission": "CM-01.view", "purpose": "Username, password, OTP or PIN", "openedFrom": "Start", "leadsTo": "Module home" },
 { "code": "CM-02", "title": "Global Search Results", "file": "/common/cm-02-search/", "module": "common", "group": "Common", "icon": "search", "nav": false, "permission": "CM-02.view", "purpose": "Bookings, guests, rooms found by search", "openedFrom": "Top bar", "leadsTo": "RS-07, RS-18, FD-07 *(Front Desk screens → \"coming in the next phase\" placeholder)*" },
 { "code": "RSS-01", "title": "Setup Home (checklist)", "file": "/setup/rss-01-setup-home-checklist/", "module": "setup", "group": "Setup", "icon": "clipboard-check", "nav": true, "permission": "RSS-01.view", "purpose": "Shows what is set up and what is missing (e.g. rooms without rates)", "openedFrom": "Settings menu", "leadsTo": "All RSS screens" },
 { "code": "RSS-02", "title": "Hotel Details", "file": "/setup/rss-02-hotel-details/", "module": "setup", "group": "Property", "icon": "building", "nav": true, "permission": "RSS-02.view", "purpose": "Name, address, GSTIN 32AACCE1226H1Z9, contacts, Aviv Club, financial year, audit time", "openedFrom": "RSS-01", "leadsTo": "RSS-01" },
 { "code": "RSS-03", "title": "Room Types", "file": "/setup/rss-03-room-types/", "module": "setup", "group": "Property", "icon": "bed", "nav": true, "permission": "RSS-03.view", "purpose": "Garden Deluxe, Deluxe, Deluxe Suite, Premium Suite – list", "openedFrom": "RSS-01", "leadsTo": "RSS-03a" },
 { "code": "RSS-04", "title": "Rooms", "file": "/setup/rss-04-rooms/", "module": "setup", "group": "Property", "icon": "door", "nav": true, "permission": "RSS-04.view", "purpose": "All 92 rooms: number, floor, type, view, beds, features", "openedFrom": "RSS-01, RSS-03", "leadsTo": "RSS-04a" },
 { "code": "RSS-05", "title": "Meal Plans", "file": "/setup/rss-05-meal-plans/", "module": "setup", "group": "Rates & availability", "icon": "utensils", "nav": true, "permission": "RSS-05.view", "purpose": "EP, CP, MAP, AP with meal values", "openedFrom": "RSS-01", "leadsTo": "Pop-up form" },
 { "code": "RSS-06", "title": "Taxes", "file": "/setup/rss-06-taxes/", "module": "setup", "group": "Rates & availability", "icon": "percent", "nav": true, "permission": "RSS-06.view", "purpose": "GST slabs (5% / 18%), CGST-SGST / IGST, effective dates", "openedFrom": "RSS-01", "leadsTo": "RSS-06a" },
 { "code": "RSS-07", "title": "Rate Plans", "file": "/setup/rss-07-rate-plans/", "module": "setup", "group": "Rates & availability", "icon": "tag", "nav": true, "permission": "RSS-07.view", "purpose": "BAR, Aviv Club, advance purchase, corporate, agent, packages, group – list", "openedFrom": "RSS-01", "leadsTo": "RSS-07a–e" },
 { "code": "RSS-08", "title": "Rate Calendar", "file": "/setup/rss-08-rate-calendar/", "module": "setup", "group": "Rates & availability", "icon": "calendar-range", "nav": true, "permission": "RSS-08.view", "purpose": "Price per room type × rate plan × date × occupancy", "openedFrom": "RSS-01, RSS-07", "leadsTo": "Bulk update pop-ups" },
 { "code": "RSS-09", "title": "Seasons & Special Dates", "file": "/setup/rss-09-seasons-and-special-dates/", "module": "setup", "group": "Rates & availability", "icon": "sun", "nav": true, "permission": "RSS-09.view", "purpose": "Peak / regular / monsoon; Onam, Christmas–New Year, Biennale", "openedFrom": "RSS-01", "leadsTo": "Pop-up form" },
 { "code": "RSS-10", "title": "Restrictions", "file": "/setup/rss-10-restrictions/", "module": "setup", "group": "Rates & availability", "icon": "lock", "nav": true, "permission": "RSS-10.view", "purpose": "Min / max stay, closed to arrival / departure, stop-sell by date", "openedFrom": "RSS-01, RSS-08", "leadsTo": "Pop-up form" },
 { "code": "RSS-11", "title": "Inventory & Overbooking", "file": "/setup/rss-11-inventory-and-overbooking/", "module": "setup", "group": "Rates & availability", "icon": "layers", "nav": true, "permission": "RSS-11.view", "purpose": "Overbooking allowance, rooms per channel, rooms held back", "openedFrom": "RSS-01", "leadsTo": "Pop-up form" },
 { "code": "RSS-12", "title": "Cancellation & No-show Policies", "file": "/setup/rss-12-cancellation-and-no-show-policies/", "module": "setup", "group": "Policies", "icon": "shield", "nav": true, "permission": "RSS-12.view", "purpose": "Rules by days before arrival; policy text", "openedFrom": "RSS-01", "leadsTo": "RSS-12a" },
 { "code": "RSS-13", "title": "Advance & Guarantee Policies", "file": "/setup/rss-13-advance-and-guarantee-policies/", "module": "setup", "group": "Policies", "icon": "wallet", "nav": true, "permission": "RSS-13.view", "purpose": "Advance amount, due date, what happens if unpaid", "openedFrom": "RSS-01", "leadsTo": "RSS-13a" },
 { "code": "RSS-14", "title": "Reservation Parameters", "file": "/setup/rss-14-reservation-parameters/", "module": "setup", "group": "Policies", "icon": "sliders", "nav": true, "permission": "RSS-14.view", "purpose": "Check-in 3 pm / out 12 noon, children ≤11 free, extra bed ₹1,500, option days, max stay", "openedFrom": "RSS-01", "leadsTo": "RSS-01" },
 { "code": "RSS-15", "title": "Sources, Segments & Channels", "file": "/setup/rss-15-sources-segments-and-channels/", "module": "setup", "group": "Distribution", "icon": "globe", "nav": true, "permission": "RSS-15.view", "purpose": "Booking sources, business types, channels with commission", "openedFrom": "RSS-01", "leadsTo": "Tabs" },
 { "code": "RSS-16", "title": "Channel Mapping", "file": "/setup/rss-16-channel-mapping/", "module": "setup", "group": "Distribution", "icon": "link", "nav": true, "permission": "RSS-16.view", "purpose": "Central reservation system (CRS) / OTA room and rate codes ↔ hotel room types and rate plans", "openedFrom": "RSS-01, RS-23", "leadsTo": "Pop-up form" },
 { "code": "RSS-17", "title": "Add-ons & Packages", "file": "/setup/rss-17-add-ons-and-packages/", "module": "setup", "group": "Lists & codes", "icon": "gift", "nav": true, "permission": "RSS-17.view", "purpose": "Extra bed, breakfast ₹799, airport transfer ₹1,940, gala dinner, Ayurveda", "openedFrom": "RSS-01", "leadsTo": "RSS-17a" },
 { "code": "RSS-18", "title": "Guest Lists", "file": "/setup/rss-18-guest-lists/", "module": "setup", "group": "Lists & codes", "icon": "star", "nav": true, "permission": "RSS-18.view", "purpose": "VIP levels, preferences, titles, countries and states", "openedFrom": "RSS-01", "leadsTo": "Tabs" },
 { "code": "RSS-19", "title": "Special Request Codes", "file": "/setup/rss-19-special-request-codes/", "module": "setup", "group": "Lists & codes", "icon": "message-square", "nav": true, "permission": "RSS-19.view", "purpose": "Requests linked to departments", "openedFrom": "RSS-01", "leadsTo": "Pop-up form" },
 { "code": "RSS-20", "title": "Reason Codes", "file": "/setup/rss-20-reason-codes/", "module": "setup", "group": "Lists & codes", "icon": "list", "nav": true, "permission": "RSS-20.view", "purpose": "Cancellation, discount, rate change, upgrade, lost, refund, waiver", "openedFrom": "RSS-01", "leadsTo": "Pop-up form" },
 { "code": "RSS-21", "title": "Message & Document Templates", "file": "/setup/rss-21-message-and-document-templates/", "module": "setup", "group": "Documents & payments", "icon": "mail", "nav": true, "permission": "RSS-21.view", "purpose": "Quote, confirmation, amendment, cancellation, receipt, reminders", "openedFrom": "RSS-01", "leadsTo": "RSS-21a" },
 { "code": "RSS-22", "title": "Numbering Series", "file": "/setup/rss-22-numbering-series/", "module": "setup", "group": "Documents & payments", "icon": "hash", "nav": true, "permission": "RSS-22.view", "purpose": "Booking, receipt, enquiry, group, cancellation number formats", "openedFrom": "RSS-01", "leadsTo": "Pop-up form" },
 { "code": "RSS-23", "title": "Payment Modes & Currencies", "file": "/setup/rss-23-payment-modes-and-currencies/", "module": "setup", "group": "Documents & payments", "icon": "credit-card", "nav": true, "permission": "RSS-23.view", "purpose": "Cash, cards, UPI, links, OTA / Corporate prepaid; currencies and rates", "openedFrom": "RSS-01", "leadsTo": "Tabs" },
 { "code": "RSS-24", "title": "Users & Roles", "file": "/setup/rss-24-users-and-roles/", "module": "setup", "group": "People", "icon": "users", "nav": true, "permission": "RSS-24.view", "purpose": "Staff logins, roles, screen permissions", "openedFrom": "RSS-01", "leadsTo": "RSS-24a, 24b" },
 { "code": "RSS-25", "title": "Approval Limits", "file": "/setup/rss-25-approval-limits/", "module": "setup", "group": "People", "icon": "shield-check", "nav": true, "permission": "RSS-25.view", "purpose": "Limits per role, escalation time, next approver", "openedFrom": "RSS-01", "leadsTo": "Pop-up form" },
 { "code": "RSS-26", "title": "Pricing Rules (optional)", "file": "/setup/rss-26-pricing-rules-optional/", "module": "setup", "group": "Rates & availability", "icon": "sparkles", "nav": true, "permission": "RSS-26.view", "purpose": "Automatic price changes by occupancy", "openedFrom": "RSS-01", "leadsTo": "Pop-up form" },
 { "code": "RS-01", "title": "Reservation Dashboard", "file": "/reservation/rs-01-reservation-dashboard/", "module": "reservation", "group": "Reservations", "icon": "layout-dashboard", "nav": true, "permission": "RS-01.view", "purpose": "Today's arrivals, departures, occupancy, free rooms; pending work; quick actions", "openedFrom": "Main menu (home page)", "leadsTo": "RS-02, 03, 04, 05, 06, 09, 14, 16, 17, 20, 21, 23" },
 { "code": "RS-02", "title": "Enquiry Entry", "file": "/reservation/rs-02-enquiry-entry/", "module": "reservation", "group": "Reservations", "icon": "message-square", "nav": true, "permission": "RS-02.view", "purpose": "Record an enquiry, quote a rate, set follow-up, convert or mark lost", "openedFrom": "RS-01, RS-03, RS-04", "leadsTo": "RS-04, RS-05, RS-16, RS-18" },
 { "code": "RS-03", "title": "Enquiry List", "file": "/reservation/rs-03-enquiry-list/", "module": "reservation", "group": "Reservations", "icon": "inbox", "nav": true, "permission": "RS-03.view", "purpose": "All enquiries with follow-up status and filters", "openedFrom": "RS-01, menu", "leadsTo": "RS-02, RS-05" },
 { "code": "RS-04", "title": "Availability Chart", "file": "/reservation/rs-04-availability-and-rate-search/", "module": "reservation", "group": "Reservations", "icon": "search", "nav": true, "permission": "RS-04.view", "purpose": "Free rooms and prices by room type, meal plan and date", "openedFrom": "RS-01, RS-02, RS-05, menu", "leadsTo": "RS-05, RS-02, RS-16, RS-17" },
 { "code": "RS-05", "title": "New Reservation", "file": "/reservation/rs-05-new-reservation/", "module": "reservation", "group": "Reservations", "icon": "plus-circle", "nav": true, "permission": "RS-05.view", "purpose": "Create a single or multi-room booking (stay, guest, rooms, rate, billing, extras, requests)", "openedFrom": "RS-01, RS-02, RS-04, RS-16, RS-17, menu", "leadsTo": "RS-07, RS-09, RS-10, RS-11, RS-20" },
 { "code": "RS-06", "title": "Reservation Search / List", "file": "/reservation/rs-06-reservation-search-list/", "module": "reservation", "group": "Reservations", "icon": "list", "nav": true, "permission": "RS-06.view", "purpose": "Find bookings; ready lists (arrivals, departures, unpaid advances…)", "openedFrom": "RS-01, global search, menu", "leadsTo": "RS-07, RS-05, RS-09, RS-11, RS-12" },
 { "code": "RS-07", "title": "Reservation Details", "file": "/reservation/rs-07-reservation-details/", "module": "reservation", "group": "Reservations", "icon": "file-text", "nav": false, "permission": "RS-07.view", "purpose": "Everything about one booking; starting point for every action", "openedFrom": "RS-05, RS-06, RS-17, RS-20, RS-23", "leadsTo": "RS-08 to RS-13, RS-18, FD-03 *(Front Desk screens → \"coming in the next phase\" placeholder)*" },
 { "code": "RS-08", "title": "Modify Reservation", "file": "/reservation/rs-08-modify-reservation/", "module": "reservation", "group": "Reservations", "icon": "pencil", "nav": false, "permission": "RS-08.view", "purpose": "Change dates, rooms, guests, rate, billing", "openedFrom": "RS-07, RS-17", "leadsTo": "RS-07, RS-11, RS-20" },
 { "code": "RS-09", "title": "Room Assignment", "file": "/reservation/rs-09-room-assignment/", "module": "reservation", "group": "Reservations", "icon": "key", "nav": true, "permission": "RS-09.view", "purpose": "Assign, change, upgrade, swap or auto-assign rooms", "openedFrom": "RS-01, RS-05, RS-06, RS-07, RS-17", "leadsTo": "RS-07" },
 { "code": "RS-10", "title": "Payments & Deposits", "file": "/reservation/rs-10-payments-and-deposits/", "module": "reservation", "group": "Reservations", "icon": "wallet", "nav": false, "permission": "RS-10.view", "purpose": "Record advance, payment link, receipt, refund, void, transfer", "openedFrom": "RS-05, RS-07, RS-12", "leadsTo": "RS-07, RS-20" },
 { "code": "RS-11", "title": "Confirmation & Voucher", "file": "/reservation/rs-11-confirmation-and-voucher/", "module": "reservation", "group": "Reservations", "icon": "send", "nav": false, "permission": "RS-11.view", "purpose": "Preview, send and print confirmation, amendment, cancellation note, pro-forma", "openedFrom": "RS-05, RS-07, RS-08, RS-12", "leadsTo": "RS-07" },
 { "code": "RS-12", "title": "Cancellation", "file": "/reservation/rs-12-cancellation/", "module": "reservation", "group": "Reservations", "icon": "x-circle", "nav": false, "permission": "RS-12.view", "purpose": "Cancel all or some rooms; penalty and refund worked out", "openedFrom": "RS-07, RS-06", "leadsTo": "RS-10, RS-11, RS-20" },
 { "code": "RS-13", "title": "No-show & Reinstate", "file": "/reservation/rs-13-no-show-and-reinstate/", "module": "reservation", "group": "Reservations", "icon": "user-x", "nav": false, "permission": "RS-13.view", "purpose": "Mark no-shows with charge; restore cancelled / no-show bookings", "openedFrom": "RS-07, RS-06, night audit", "leadsTo": "RS-07, RS-20" },
 { "code": "RS-14", "title": "Group Reservation", "file": "/reservation/rs-14-group-reservation/", "module": "reservation", "group": "Reservations", "icon": "users", "nav": true, "permission": "RS-14.view", "purpose": "Group master, room block, group rate, billing, cut-off", "openedFrom": "RS-01, menu", "leadsTo": "RS-15, RS-07, RS-10, RS-11, RS-12" },
 { "code": "RS-15", "title": "Rooming List", "file": "/reservation/rs-15-rooming-list/", "module": "reservation", "group": "Reservations", "icon": "clipboard-list", "nav": false, "permission": "RS-15.view", "purpose": "Import or type guest names and create member bookings", "openedFrom": "RS-14", "leadsTo": "RS-14" },
 { "code": "RS-16", "title": "Waitlist", "file": "/reservation/rs-16-waitlist/", "module": "reservation", "group": "Reservations", "icon": "clock", "nav": true, "permission": "RS-16.view", "purpose": "Requests waiting for full dates; alert when rooms free up", "openedFrom": "RS-01, RS-02, RS-04, menu", "leadsTo": "RS-05" },
 { "code": "RS-17", "title": "Room Calendar (Tape Chart)", "file": "/reservation/rs-17-room-calendar-tape-chart/", "module": "reservation", "group": "Reservations", "icon": "calendar", "nav": true, "permission": "RS-17.view", "purpose": "All 92 rooms by date; drag to move, change dates, assign", "openedFrom": "RS-01, RS-04, menu", "leadsTo": "RS-05, RS-07, RS-08, RS-09" },
 { "code": "RS-18", "title": "Guest Profile", "file": "/reservation/rs-18-guest-profile/", "module": "reservation", "group": "Reservations", "icon": "user", "nav": true, "permission": "RS-18.view", "purpose": "Guest details, preferences, Aviv Club number, stay history, blacklist", "openedFrom": "RS-05a, RS-07, menu", "leadsTo": "RS-05" },
 { "code": "RS-19", "title": "Corporate", "file": "/reservation/rs-19-company-travel-agent-account/", "module": "reservation", "group": "Reservations", "icon": "building", "nav": true, "permission": "RS-19.view", "purpose": "Contract rates, credit limit, commission, production", "openedFrom": "RS-05, menu", "leadsTo": "RS-05" },
 { "code": "RS-20", "title": "Approvals", "file": "/reservation/rs-20-approvals/", "module": "reservation", "group": "Reservations", "icon": "shield-check", "nav": true, "permission": "RS-20.view", "purpose": "Approve or reject requests above limits, from any device", "openedFrom": "RS-01, notifications, menu", "leadsTo": "RS-07" },
 { "code": "RS-21", "title": "Reservation Reports", "file": "/reservation/rs-21-reservation-reports/", "module": "reservation", "group": "Reports", "icon": "bar-chart", "nav": true, "permission": "RS-21.view", "purpose": "Report list and report viewer with export and scheduling", "openedFrom": "RS-01, menu", "leadsTo": "Report viewer" },
 { "code": "RS-23", "title": "Channel Booking Queue", "file": "/reservation/rs-23-channel-booking-queue/", "module": "reservation", "group": "Reservations", "icon": "refresh", "nav": true, "permission": "RS-23.view", "purpose": "Aviv mobile app, Aviv website and OTA bookings needing attention; sync log; rate parity", "openedFrom": "RS-01, alerts, menu", "leadsTo": "RS-07, RS-20" },
 { "code": "RS-24", "title": "Service View", "file": "/reservation/rs-24-service-view/", "module": "reservation", "group": "Reservations", "icon": "utensils", "nav": true, "permission": "RS-24.view", "purpose": "Breakfast, lunch and dinner covers per day from the meal plans and meal add-ons booked with the room", "openedFrom": "menu, RS-01", "leadsTo": "RS-07, RS-08, FD-08, RS-04" },
 { "code": "RS-25", "title": "Room Allocation", "file": "/reservation/rs-25-room-allocation/", "module": "reservation", "group": "Reservations", "icon": "door-open", "nav": true, "permission": "RS-25.view", "purpose": "Allocate, swap and un-allocate rooms for coming arrivals before they check in", "openedFrom": "menu, RS-01", "leadsTo": "RS-07, RS-09, RS-10, RS-18, FD-03" },
 { "code": "RS-26", "title": "Expected Arrivals", "file": "/reservation/rs-26-expected-arrivals/", "module": "reservation", "group": "Reservations", "icon": "log-in", "nav": true, "permission": "RS-26.view", "purpose": "Bookings arriving in any date range, with filters, print and export", "openedFrom": "menu, RS-01, RS-21", "leadsTo": "RS-07, RS-25" },
 { "code": "RS-27", "title": "Pick-up Performance", "file": "/reservation/rs-27-pick-up-performance/", "module": "reservation", "group": "Reservations", "icon": "trending-up", "nav": true, "permission": "RS-27.view", "purpose": "Room nights picked up by stay date, room type, source and account, against last year, budget and forecast", "openedFrom": "menu, RS-21", "leadsTo": "RS-21, RS-07" },
 { "code": "RS-28", "title": "Shift Handover", "file": "/reservation/rs-28-shift-handover/", "module": "reservation", "group": "Reservations", "icon": "message-circle", "nav": true, "permission": "RS-28.view", "purpose": "Handover notes between shifts: tag staff, assign an owner, send to the mobile app, escalate if nobody answers", "openedFrom": "menu, RS-01", "leadsTo": "RS-05, RS-14, DAS-01" }
];

/** @param {string} code */
export const screenByCode = (code) => SCREENS.find((s) => s.code === code);

/** Short names for the sidebar (full titles are used everywhere else). */
const NAV_LABELS = /** @type {Record<string, string>} */ ({
  "RS-01": "Dashboard", "RS-02": "New Enquiry", "RS-03": "Enquiries", "RS-04": "Availability & Rates", "RS-05": "New Reservation",
  "RS-06": "Reservations", "RS-09": "Room Assignment", "RS-14": "Groups", "RS-16": "Waitlist", "RS-17": "Room Calendar",
  "RS-18": "Guests", "RS-19": "Corporate", "RS-20": "Approvals", "RS-21": "Reports", "RS-23": "Channel Queue", "RS-24": "Service View", "RS-25": "Room Allocation", "RS-26": "Expected Arrivals", "RS-27": "Pick-up Performance", "RS-28": "Shift Handover",
  "RSS-01": "Setup Home", "RSS-12": "Cancellation & No-show", "RSS-13": "Advance & Guarantee", "RSS-14": "Parameters",
  "RSS-15": "Sources & Channels", "RSS-17": "Add-ons & Packages", "RSS-19": "Request Codes", "RSS-21": "Templates",
  "RSS-22": "Numbering", "RSS-23": "Payments & Currencies", "RSS-24": "Users & Roles", "RSS-26": "Pricing Rules",
  "RSS-09": "Seasons & Dates", "RSS-11": "Inventory", "RSS-16": "Channel Mapping",
});

/** @param {string} code */
export const navLabel = (code) => NAV_LABELS[code] ?? screenByCode(code)?.title ?? code;

/** @param {string} code */
export const isBuilt = (code) => BUILT.has(code) || FD_BUILT.includes(code);

/**
 * Where a screen link should go: the real page, or the “Coming next” placeholder when it is not built yet.
 * @param {string} code
 * @param {Record<string, string | number | null | undefined>} [query]
 */
export function screenUrl(code, query = {}) {
  const s = screenByCode(code) ?? FD_SCREENS.find((x) => x.code === code);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== null && v !== undefined && v !== "") qs.set(k, String(v));
  if (s && isBuilt(code)) return qs.size ? `${s.file}?${qs}` : s.file;
  qs.set("code", code);
  return `/common/coming-next/?${qs}`;
}

/** Sidebar order of nav groups. */
export const NAV_GROUPS = [
  { module: "reservation", label: "Reservations", groups: ["Reservations"] },
  { module: "reservation", label: "Reports", groups: ["Reports"] },
  { module: "setup", label: "Reservation Setup", groups: ["Setup", "Property", "Rates & availability", "Policies", "Distribution", "Lists & codes", "Documents & payments", "People"] },
];

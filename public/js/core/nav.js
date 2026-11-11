// @ts-check
/**
 * Sidebar menu for the whole app – ENTRY screens only (spec §3.1 of the Front Desk specification, brief Part C1).
 * One definition, used by docs/tools/stamp-static-pages.mjs (static pages) and js/core/shell.js (the few JavaScript pages),
 * so the menu is identical everywhere. Action screens (check-in, folio, reservation details …) are never listed here:
 * they open from buttons and highlight their entry screen through PARENT.
 *
 * @typedef {{ code: string, label: string, icon: string, href?: string }} NavItem
 * @typedef {{ id: string, label: string, items: NavItem[] }} NavGroup
 */

/** @type {NavGroup[]} */
export const NAV = [
  { id: "home", label: "Home", items: [
    { code: "CM-06", label: "Home Launcher", icon: "home" },
  ] },
  { id: "front-desk", label: "Front Desk", items: [
    { code: "FD-01", label: "Home", icon: "layout-dashboard" },
    { code: "FD-02", label: "Arrivals", icon: "log-in" },
    { code: "FD-06", label: "Room Board", icon: "door" },
    { code: "FD-07", label: "In-house", icon: "bed" },
    { code: "FD-14", label: "Departures", icon: "log-out" },
    { code: "FD-32", label: "House Status", icon: "gauge" },
    { code: "FD-20", label: "Form III Register", icon: "id-card" },
    { code: "FD-27", label: "Log Book", icon: "book-open" },
  ] },
  { id: "guest-services", label: "Guest Services", items: [
    { code: "FD-11", label: "Requests & Complaints", icon: "message-square" },
    { code: "FD-12", label: "Messages & Wake-up", icon: "bell-ring" },
    { code: "FD-28", label: "Traces", icon: "clipboard-list" },
    { code: "FD-30", label: "Concierge & Services", icon: "car" },
    { code: "FD-31", label: "Loyalty Desk", icon: "star" },
    { code: "FD-38", label: "Guest Communication", icon: "send" },
    { code: "FD-23", label: "Lost & Found", icon: "search" },
    { code: "FD-24", label: "Left Luggage", icon: "luggage" },
    { code: "FD-25", label: "Lockers", icon: "lock" },
    { code: "FD-26", label: "Visitor Register", icon: "users" },
  ] },
  { id: "cashier", label: "Cashier & Billing", items: [
    { code: "FD-18", label: "Cashier Shift", icon: "wallet" },
    { code: "FD-36", label: "Cash Book", icon: "banknote" },
    { code: "FD-19", label: "Foreign Exchange", icon: "coins" },
    { code: "FD-16", label: "Invoices & Credit Notes", icon: "receipt" },
    { code: "FD-17", label: "Company Billing", icon: "building" },
    { code: "FD-33", label: "Paymaster", icon: "briefcase" },
    { code: "FD-34", label: "Folio History", icon: "history" },
    { code: "FD-35", label: "Advance Deposits", icon: "credit-card" },
  ] },
  { id: "night-audit", label: "Night Audit", items: [
    { code: "FD-21", label: "Night Audit Console", icon: "moon" },
    { code: "FD-37", label: "Account Posting", icon: "send" },
  ] },
  { id: "fd-reports", label: "Reports", items: [
    { code: "FD-22", label: "Front Desk Reports", icon: "bar-chart" },
  ] },
  { id: "reservations", label: "Reservations", items: [
    { code: "RS-01", label: "Dashboard", icon: "layout-dashboard" },
    { code: "RS-06", label: "Reservations", icon: "list" },
    { code: "RS-04", label: "Availability", icon: "search" },
    { code: "RS-17", label: "Room Calendar", icon: "calendar" },
    { code: "RS-24", label: "Service View", icon: "utensils" },
    { code: "RS-03", label: "Enquiries", icon: "inbox" },
    { code: "RS-14", label: "Groups", icon: "users" },
    { code: "RS-16", label: "Waitlist", icon: "clock" },
    { code: "RS-23", label: "Channel Queue", icon: "refresh" },
    { code: "RS-20", label: "Approvals", icon: "shield-check" },
    { code: "RS-18", label: "Guests", icon: "user" },
    { code: "RS-19", label: "Corporate", icon: "building-2" },
    { code: "RS-21", label: "Reports", icon: "bar-chart" },
  ] },
  { id: "setup", label: "Setup", items: [
    { code: "CM-07", label: "Home Launcher Setup", icon: "image", href: "/common/cm-07-home-launcher-setup/" },
    { code: "RSS-01", label: "Reservation Setup", icon: "clipboard-check" },
    { code: "FDS-01", label: "Front Desk Setup", icon: "sliders" },
    { code: "HKS-01", label: "Housekeeping Setup", icon: "broom", href: "/housekeeping-setup/hks-01-housekeeping-setup-home/" },
    { code: "LAS-01", label: "Laundry Setup", icon: "layers", href: "/laundry-setup/las-01-laundry-setup-home/" },
    { code: "MBS-01", label: "Minibar Setup", icon: "minibar", href: "/minibar-setup/mbs-01-minibar-setup-home/" },
    { code: "LNS-01", label: "Linen Setup", icon: "bed", href: "/linen-and-amenities-setup/lns-01-linen-and-amenities-setup-home/" },
    { code: "LFS-01", label: "Lost & Found Setup", icon: "archive", href: "/lost-and-found-setup/lfs-01-lost-and-found-setup-home/" },
    { code: "MTS-01", label: "Engineering Setup", icon: "wrench", href: "/engineering-setup/mts-01-engineering-setup-home/" },
    { code: "RTS-01", label: "Restaurant POS Setup", icon: "utensils", href: "/restaurant-pos-setup/rts-01-pos-setup-home/" },
    { code: "KTS-01", label: "Kitchen Display Setup", icon: "monitor", href: "/kitchen-display-setup/kts-01-stations-and-screens/" },
    { code: "BQS-01", label: "Banquets Setup", icon: "calendar-range", href: "/banquets-and-events-setup/bqs-01-venues-and-set-ups/" },
    { code: "PRS-01", label: "Purchase Setup", icon: "package", href: "/purchase-setup/prs-01-vendor-master/" },
    { code: "STS-01", label: "Stores Setup", icon: "warehouse", href: "/stores-setup/sts-01-item-master/" },
    { code: "CCS-01", label: "Cost Control Setup", icon: "percent", href: "/cost-control-setup/ccs-01-targets-and-tolerances/" },
    { code: "FNS-01", label: "Finance Setup", icon: "banknote", href: "/finance-setup/fns-01-bank-accounts/" },
    { code: "ACS-01", label: "General Ledger Setup", icon: "book-open", href: "/general-ledger-setup/acs-01-chart-of-accounts/" },
    { code: "TXS-01", label: "Tax Setup", icon: "percent", href: "/tax-setup/txs-01-gst-registrations/" },
    { code: "HRS-01", label: "HR & Payroll Setup", icon: "users", href: "/hr-and-payroll-setup/hrs-01-establishment/" },
    { code: "RVS-01", label: "Revenue Setup", icon: "trending-up", href: "/revenue-management-setup/rvs-01-segments-and-channel-groups/" },
    { code: "DAS-01", label: "Approvals Setup", icon: "clipboard-check", href: "/dashboards-and-approvals-setup/das-01-approval-types-and-escalation/" },
    { code: "ANS-01", label: "Reports Setup", icon: "file-text", href: "/analytics-and-reports-setup/ans-01-report-registry/" },
    { code: "MSS-01", label: "MIS Setup", icon: "bar-chart", href: "/mis-and-budgeting-setup/mss-01-statement-lines-and-mapping/" },
    { code: "OWS-01", label: "Owner App Setup", icon: "building-2", href: "/owner-app-and-multi-property-setup/ows-01-property-groups/" },
  ] },
  { id: "housekeeping", label: "Housekeeping", items: [
    { code: "HK-01", label: "Dashboard", icon: "layout-dashboard", href: "/housekeeping/hk-01-housekeeping-dashboard/" },
    { code: "HK-02", label: "Room Status", icon: "door", href: "/housekeeping/hk-02-room-status-board/" },
    { code: "HK-04", label: "Allocation", icon: "users", href: "/housekeeping/hk-04-room-allocation/" },
    { code: "HK-08", label: "Inspection", icon: "clipboard-check", href: "/housekeeping/hk-08-inspection-queue/" },
    { code: "HK-10", label: "Discrepancies", icon: "alert", href: "/housekeeping/hk-10-room-discrepancies/" },
    { code: "HK-11", label: "Out of Order", icon: "wrench", href: "/housekeeping/hk-11-out-of-order-out-of-service/" },
    { code: "HK-12", label: "Guest Service", icon: "bell-ring", href: "/housekeeping/hk-12-guest-service-status/" },
    { code: "HK-15", label: "Public Areas", icon: "map-pin", href: "/housekeeping/hk-15-public-area-cleaning/" },
    { code: "HK-16", label: "Deep Cleaning", icon: "broom", href: "/housekeeping/hk-16-deep-cleaning-and-projects/" },
    { code: "HK-17", label: "Requests", icon: "message-square", href: "/housekeeping/hk-17-housekeeping-requests/" },
    { code: "HK-18", label: "Planning", icon: "calendar-range", href: "/housekeeping/hk-18-occupancy-and-staffing-forecast/" },
    { code: "HK-19", label: "Log Book", icon: "book-open", href: "/housekeeping/hk-19-log-book-and-handover/" },
    { code: "HK-21", label: "Reports", icon: "bar-chart", href: "/housekeeping/hk-21-housekeeping-reports/" },
  ] },
  { id: "laundry", label: "Laundry", items: [
    { code: "LA-01", label: "Dashboard", icon: "layout-dashboard", href: "/laundry/la-01-laundry-dashboard/" },
    { code: "LA-02", label: "Guest Laundry", icon: "package", href: "/laundry/la-02-guest-laundry-orders/" },
    { code: "LA-04", label: "Production", icon: "layers", href: "/laundry/la-04-production-board/" },
    { code: "LA-05", label: "Delivery", icon: "send", href: "/laundry/la-05-delivery-and-billing/" },
    { code: "LA-06", label: "House Linen", icon: "bed", href: "/laundry/la-06-house-linen-exchange/" },
    { code: "LA-08", label: "Vendor Laundry", icon: "building-2", href: "/laundry/la-08-vendor-laundry-challans/" },
    { code: "LA-09", label: "Uniforms", icon: "id-card", href: "/laundry/la-09-uniform-exchange/" },
    { code: "LA-10", label: "Machines", icon: "gauge", href: "/laundry/la-10-machines-and-run-log/" },
    { code: "LA-11", label: "Reports", icon: "bar-chart", href: "/laundry/la-11-laundry-reports/" },
  ] },
  { id: "minibar", label: "Minibar", items: [
    { code: "MB-01", label: "Dashboard", icon: "layout-dashboard", href: "/minibar/mb-01-minibar-dashboard/" },
    { code: "MB-02", label: "Rooms", icon: "door", href: "/minibar/mb-02-room-minibar-status/" },
    { code: "MB-03", label: "Posting Queue", icon: "receipt", href: "/minibar/mb-03-posting-queue/" },
    { code: "MB-04", label: "Replenishment", icon: "refresh", href: "/minibar/mb-04-replenishment/" },
    { code: "MB-05", label: "Minibar Store", icon: "archive", href: "/minibar/mb-05-minibar-store-and-cart-stock/" },
    { code: "MB-06", label: "Expiry", icon: "clock", href: "/minibar/mb-06-expiry-tracking/" },
    { code: "MB-07", label: "Locks", icon: "lock", href: "/minibar/mb-07-locked-and-alcohol-free-rooms/" },
    { code: "MB-08", label: "Stock Count", icon: "clipboard-list", href: "/minibar/mb-08-minibar-stock-count/" },
    { code: "MB-09", label: "Reports", icon: "bar-chart", href: "/minibar/mb-09-minibar-reports/" },
  ] },
  { id: "linen", label: "Linen", items: [
    { code: "LN-01", label: "Dashboard", icon: "layout-dashboard", href: "/linen-and-amenities/ln-01-linen-and-amenities-dashboard/" },
    { code: "LN-02", label: "Stock", icon: "layers", href: "/linen-and-amenities/ln-02-stock-by-location/" },
    { code: "LN-03", label: "Pantry Issue", icon: "send", href: "/linen-and-amenities/ln-03-pantry-par-issue/" },
    { code: "LN-04", label: "Amenities", icon: "gift", href: "/linen-and-amenities/ln-04-amenity-issues/" },
    { code: "LN-05", label: "Discard", icon: "file-minus", href: "/linen-and-amenities/ln-05-linen-discard/" },
    { code: "LN-06", label: "Counts", icon: "clipboard-list", href: "/linen-and-amenities/ln-06-physical-count/" },
    { code: "LN-07", label: "Par & Reorder", icon: "gauge", href: "/linen-and-amenities/ln-07-par-monitor-and-reorder/" },
    { code: "LN-08", label: "Requisitions", icon: "inbox", href: "/linen-and-amenities/ln-08-store-requisitions/" },
    { code: "LN-09", label: "Consumption", icon: "bar-chart", href: "/linen-and-amenities/ln-09-amenity-consumption/" },
    { code: "LN-10", label: "Uniform Room", icon: "id-card", href: "/linen-and-amenities/ln-10-uniform-room/" },
    { code: "LN-11", label: "Reports", icon: "file-text", href: "/linen-and-amenities/ln-11-linen-and-amenities-reports/" },
  ] },
  { id: "lostfound", label: "Lost & Found", items: [
    { code: "LF-01", label: "Dashboard", icon: "layout-dashboard", href: "/lost-and-found/lf-01-lost-and-found-dashboard/" },
    { code: "LF-02", label: "Found Items", icon: "archive", href: "/lost-and-found/lf-02-found-items-register/" },
    { code: "LF-04", label: "Lost Reports", icon: "message-square", href: "/lost-and-found/lf-04-lost-reports/" },
    { code: "LF-05", label: "Matching", icon: "link", href: "/lost-and-found/lf-05-matching/" },
    { code: "LF-06", label: "Storage", icon: "layers", href: "/lost-and-found/lf-06-storage-and-locations/" },
    { code: "LF-07", label: "Disposal", icon: "file-minus", href: "/lost-and-found/lf-07-disposal/" },
    { code: "LF-08", label: "Safe Log", icon: "lock", href: "/lost-and-found/lf-08-valuables-safe-log/" },
    { code: "LF-09", label: "Reports", icon: "file-text", href: "/lost-and-found/lf-09-lost-and-found-reports/" },
  ] },
  { id: "engineering", label: "Engineering", items: [
    { code: "MT-01", label: "Dashboard", icon: "layout-dashboard", href: "/engineering-and-maintenance/mt-01-engineering-dashboard/" },
    { code: "MT-02", label: "Work Queue", icon: "columns", href: "/engineering-and-maintenance/mt-02-work-queue/" },
    { code: "MT-14", label: "My Jobs", icon: "smartphone", href: "/engineering-and-maintenance/mt-14-technician-my-jobs/" },
    { code: "MT-04", label: "Work Orders", icon: "clipboard-list", href: "/engineering-and-maintenance/mt-04-work-orders/" },
    { code: "MT-05", label: "Preventive", icon: "calendar", href: "/engineering-and-maintenance/mt-05-preventive-maintenance-calendar/" },
    { code: "MT-06", label: "Room PM", icon: "bed", href: "/engineering-and-maintenance/mt-06-guest-room-pm/" },
    { code: "MT-07", label: "Assets", icon: "wrench", href: "/engineering-and-maintenance/mt-07-asset-register/" },
    { code: "MT-09", label: "Meters", icon: "gauge", href: "/engineering-and-maintenance/mt-09-utility-meter-readings/" },
    { code: "MT-10", label: "Contracts", icon: "briefcase", href: "/engineering-and-maintenance/mt-10-contractors-and-amc/" },
    { code: "MT-11", label: "Compliance", icon: "shield-check", href: "/engineering-and-maintenance/mt-11-statutory-compliance-register/" },
    { code: "MT-12", label: "Shift Log", icon: "book-open", href: "/engineering-and-maintenance/mt-12-engineering-shift-log/" },
    { code: "MT-13", label: "Reports", icon: "file-text", href: "/engineering-and-maintenance/mt-13-engineering-reports/" },
  ] },
  { id: "restaurant", label: "Restaurant", items: [
    { code: "RT-01", label: "POS Home", icon: "home", href: "/restaurant-pos/rt-01-pos-home/" },
    { code: "RT-02", label: "Tables", icon: "layout-dashboard", href: "/restaurant-pos/rt-02-table-layout/" },
    { code: "RT-03", label: "Order", icon: "utensils", href: "/restaurant-pos/rt-03-order-entry/" },
    { code: "RT-05", label: "Bills", icon: "receipt", href: "/restaurant-pos/rt-05-bill-and-settlement/" },
    { code: "RT-06", label: "Room Service", icon: "bell-ring", href: "/restaurant-pos/rt-06-room-service-orders/" },
    { code: "RT-07", label: "Takeaway", icon: "package", href: "/restaurant-pos/rt-07-takeaway-counter-order/" },
    { code: "RT-08", label: "Table Booking", icon: "calendar", href: "/restaurant-pos/rt-08-table-booking/" },
    { code: "RT-09", label: "Open Checks", icon: "clipboard-list", href: "/restaurant-pos/rt-09-open-checks/" },
    { code: "RT-10", label: "Day Close", icon: "lock", href: "/restaurant-pos/rt-10-day-close/" },
    { code: "RT-11", label: "Reports", icon: "file-text", href: "/restaurant-pos/rt-11-outlet-reports/" },
  ] },
  { id: "kitchen", label: "Kitchen", items: [
    { code: "KT-02", label: "Station", icon: "monitor", href: "/kitchen-display/kt-02-station-display/" },
    { code: "KT-03", label: "Expo", icon: "check-circle", href: "/kitchen-display/kt-03-expo-pass-display/" },
    { code: "KT-04", label: "All-day", icon: "list", href: "/kitchen-display/kt-04-all-day-count/" },
    { code: "KT-05", label: "Availability", icon: "x-circle", href: "/kitchen-display/kt-05-item-availability/" },
    { code: "KT-06", label: "Banquet Production", icon: "users", href: "/kitchen-display/kt-06-banquet-production-list/" },
    { code: "KT-07", label: "Recall", icon: "undo", href: "/kitchen-display/kt-07-recall/" },
    { code: "KT-08", label: "Reports", icon: "bar-chart", href: "/kitchen-display/kt-08-kitchen-performance/" },
  ] },
  { id: "banquets", label: "Banquets", items: [
    { code: "BQ-01", label: "Dashboard", icon: "layout-dashboard", href: "/banquets-and-events/bq-01-banquet-dashboard/" },
    { code: "BQ-02", label: "Enquiries", icon: "inbox", href: "/banquets-and-events/bq-02-enquiries/" },
    { code: "BQ-03", label: "Diary", icon: "calendar-range", href: "/banquets-and-events/bq-03-venue-diary/" },
    { code: "BQ-04", label: "Bookings", icon: "list", href: "/banquets-and-events/bq-04-event-bookings/" },
    { code: "BQ-06", label: "BEO", icon: "clipboard-list", href: "/banquets-and-events/bq-06-banquet-event-orders/" },
    { code: "BQ-07", label: "Event Day", icon: "clipboard-check", href: "/banquets-and-events/bq-07-event-day-sheet/" },
    { code: "BQ-08", label: "Billing", icon: "receipt", href: "/banquets-and-events/bq-08-banquet-billing/" },
    { code: "BQ-09", label: "Reports", icon: "bar-chart", href: "/banquets-and-events/bq-09-banquet-reports/" },
  ] },
  { id: "purchase", label: "Purchase", items: [
    { code: "PR-01", label: "Dashboard", icon: "layout-dashboard", href: "/purchase/pr-01-purchase-dashboard/" },
    { code: "PR-02", label: "Requisitions", icon: "clipboard-list", href: "/purchase/pr-02-purchase-requisitions/" },
    { code: "PR-04", label: "Approvals", icon: "user-check", href: "/purchase/pr-04-my-approvals/" },
    { code: "PR-05", label: "Quotations", icon: "columns", href: "/purchase/pr-05-quotations-and-comparison/" },
    { code: "PR-06", label: "Purchase Orders", icon: "file-text", href: "/purchase/pr-06-purchase-orders/" },
    { code: "PR-08", label: "Rate Contracts", icon: "tag", href: "/purchase/pr-08-rate-contracts/" },
    { code: "PR-09", label: "Service Billing", icon: "clipboard-check", href: "/purchase/pr-09-service-billing/" },
    { code: "PR-10", label: "Status", icon: "history", href: "/purchase/pr-10-pr-mr-po-status/" },
    { code: "PR-11", label: "Analysis", icon: "bar-chart", href: "/purchase/pr-11-purchase-analysis/" },
  ] },
  { id: "stores", label: "Stores", items: [
    { code: "ST-01", label: "Dashboard", icon: "layout-dashboard", href: "/stores-and-inventory/st-01-stores-dashboard/" },
    { code: "ST-02", label: "Requisitions", icon: "clipboard-list", href: "/stores-and-inventory/st-02-material-requisitions/" },
    { code: "ST-03", label: "Goods Received", icon: "package", href: "/stores-and-inventory/st-03-goods-received-note/" },
    { code: "ST-04", label: "Issues", icon: "send", href: "/stores-and-inventory/st-04-issue/" },
    { code: "ST-05", label: "Transfers & Returns", icon: "arrow-left-right", href: "/stores-and-inventory/st-05-transfers-and-returns/" },
    { code: "ST-06", label: "Stock", icon: "layers", href: "/stores-and-inventory/st-06-stock-on-hand/" },
    { code: "ST-07", label: "Verification", icon: "clipboard-check", href: "/stores-and-inventory/st-07-physical-verification/" },
    { code: "ST-08", label: "Cash Book", icon: "banknote", href: "/stores-and-inventory/st-08-stores-cash-book/" },
    { code: "ST-09", label: "Documents", icon: "file-text", href: "/stores-and-inventory/st-09-document-detail-view/" },
    { code: "ST-10", label: "Month Close", icon: "lock", href: "/stores-and-inventory/st-10-inventory-month-close/" },
  ] },
  { id: "cost-control", label: "Cost Control", items: [
    { code: "CC-01", label: "Dashboard", icon: "layout-dashboard", href: "/cost-control/cc-01-cost-control-dashboard/" },
    { code: "CC-02", label: "Recipes", icon: "book-open", href: "/cost-control/cc-02-recipe-cards/" },
    { code: "CC-03", label: "Daily Cost", icon: "calendar", href: "/cost-control/cc-03-daily-fandb-cost/" },
    { code: "CC-04", label: "Monthly Cost", icon: "calendar-range", href: "/cost-control/cc-04-monthly-fandb-cost/" },
    { code: "CC-05", label: "Variance", icon: "bar-chart", href: "/cost-control/cc-05-consumption-variance/" },
    { code: "CC-06", label: "Beverage", icon: "gauge", href: "/cost-control/cc-06-beverage-control/" },
    { code: "CC-07", label: "Wastage & Meals", icon: "utensils", href: "/cost-control/cc-07-wastage-staff-meals-and-transfers/" },
    { code: "CC-08", label: "Menu Engineering", icon: "star", href: "/cost-control/cc-08-menu-engineering/" },
    { code: "CC-09", label: "Expenses", icon: "wallet", href: "/cost-control/cc-09-expense-analysis/" },
  ] },
  { id: "finance", label: "Finance", items: [
    { code: "FN-01", label: "Dashboard", icon: "layout-dashboard", href: "/receivables-payables-and-banking/fn-01-finance-dashboard/" },
    { code: "FN-02", label: "City Ledger", icon: "building-2", href: "/receivables-payables-and-banking/fn-02-city-ledger/" },
    { code: "FN-04", label: "Receipts", icon: "receipt", href: "/receivables-payables-and-banking/fn-04-receipt/" },
    { code: "FN-05", label: "Bill Passing", icon: "file-text", href: "/receivables-payables-and-banking/fn-05-bill-passing/" },
    { code: "FN-06", label: "Payments", icon: "send", href: "/receivables-payables-and-banking/fn-06-payments/" },
    { code: "FN-07", label: "Banking", icon: "banknote", href: "/receivables-payables-and-banking/fn-07-bank-reconciliation/" },
    { code: "FN-08", label: "Petty Cash", icon: "wallet", href: "/receivables-payables-and-banking/fn-08-petty-cash-and-cash-handovers/" },
    { code: "FN-09", label: "Ageing", icon: "clock", href: "/receivables-payables-and-banking/fn-09-ageing/" },
    { code: "FN-10", label: "Reports", icon: "bar-chart", href: "/receivables-payables-and-banking/fn-10-finance-reports/" },
  ] },
  { id: "general-ledger", label: "General Ledger", items: [
    { code: "AC-01", label: "Dashboard", icon: "layout-dashboard", href: "/general-ledger/ac-01-gl-dashboard/" },
    { code: "AC-02", label: "Postings", icon: "refresh", href: "/general-ledger/ac-02-automatic-postings/" },
    { code: "AC-03", label: "Vouchers", icon: "file-text", href: "/general-ledger/ac-03-vouchers/" },
    { code: "AC-05", label: "Adjustments", icon: "sliders", href: "/general-ledger/ac-05-ledger-adjustments/" },
    { code: "AC-06", label: "Ledgers", icon: "book-open", href: "/general-ledger/ac-06-account-ledger-summary/" },
    { code: "AC-07", label: "Trial Balance", icon: "columns", href: "/general-ledger/ac-07-trial-balance/" },
    { code: "AC-08", label: "Books", icon: "list", href: "/general-ledger/ac-08-day-book-cash-book-and-bank-book/" },
    { code: "AC-09", label: "Fixed Assets", icon: "building", href: "/general-ledger/ac-09-fixed-asset-register/" },
    { code: "AC-10", label: "Period Lock", icon: "lock", href: "/general-ledger/ac-10-transaction-lock-and-month-close/" },
    { code: "AC-11", label: "Year End", icon: "calendar", href: "/general-ledger/ac-11-financial-year-closing/" },
    { code: "AC-12", label: "Export", icon: "upload", href: "/general-ledger/ac-12-export-to-external-package/" },
  ] },
  { id: "tax", label: "Tax & Compliance", items: [
    { code: "TX-01", label: "Dashboard", icon: "layout-dashboard", href: "/tax-and-compliance/tx-01-tax-dashboard/" },
    { code: "TX-02", label: "GST Sales", icon: "receipt", href: "/tax-and-compliance/tx-02-gst-outward-register/" },
    { code: "TX-03", label: "GST Purchases", icon: "package", href: "/tax-and-compliance/tx-03-gst-inward-register/" },
    { code: "TX-04", label: "GSTR-1 / 3B", icon: "file-text", href: "/tax-and-compliance/tx-04-gstr-1-and-gstr-3b-data/" },
    { code: "TX-05", label: "ITC Reconciliation", icon: "arrow-left-right", href: "/tax-and-compliance/tx-05-itc-reconciliation-gstr-2b/" },
    { code: "TX-06", label: "E-invoices", icon: "qr-code", href: "/tax-and-compliance/tx-06-e-invoice-register/" },
    { code: "TX-07", label: "TDS", icon: "percent", href: "/tax-and-compliance/tx-07-tds-deducted-challans-and-returns/" },
    { code: "TX-08", label: "TDS Receivable", icon: "coins", href: "/tax-and-compliance/tx-08-tds-receivable-26as-ais/" },
    { code: "TX-09", label: "Reports", icon: "bar-chart", href: "/tax-and-compliance/tx-09-tax-reports/" },
  ] },
  { id: "hr", label: "HR & Payroll", items: [
    { code: "HR-01", label: "Dashboard", icon: "layout-dashboard", href: "/hr-and-payroll/hr-01-hr-dashboard/" },
    { code: "HR-02", label: "Employees", icon: "users", href: "/hr-and-payroll/hr-02-employees/" },
    { code: "HR-04", label: "Joining & Exit", icon: "user-plus", href: "/hr-and-payroll/hr-04-joining-and-exit/" },
    { code: "HR-05", label: "Roster", icon: "calendar-range", href: "/hr-and-payroll/hr-05-duty-roster/" },
    { code: "HR-06", label: "Attendance", icon: "clock", href: "/hr-and-payroll/hr-06-attendance/" },
    { code: "HR-07", label: "Leave", icon: "calendar", href: "/hr-and-payroll/hr-07-leave/" },
    { code: "HR-08", label: "Advances", icon: "wallet", href: "/hr-and-payroll/hr-08-advances-and-loans/" },
    { code: "HR-09", label: "Payroll", icon: "banknote", href: "/hr-and-payroll/hr-09-payroll-run/" },
    { code: "HR-10", label: "Statutory", icon: "shield-check", href: "/hr-and-payroll/hr-10-statutory/" },
    { code: "HR-11", label: "Self-service", icon: "smartphone", href: "/hr-and-payroll/hr-11-employee-self-service/" },
    { code: "HR-12", label: "Reports", icon: "bar-chart", href: "/hr-and-payroll/hr-12-hr-reports/" },
  ] },
  { id: "rv", label: "Revenue Management", items: [
    { code: "RV-01", label: "Dashboard", icon: "layout-dashboard", href: "/revenue-management/rv-01-revenue-dashboard/" },
    { code: "RV-02", label: "On the Books", icon: "layers", href: "/revenue-management/rv-02-business-on-the-books/" },
    { code: "RV-03", label: "Pickup & Pace", icon: "trending-up", href: "/revenue-management/rv-03-pickup-and-pace/" },
    { code: "RV-04", label: "Forecast", icon: "gauge", href: "/revenue-management/rv-04-forecast/" },
    { code: "RV-05", label: "Demand Calendar", icon: "calendar", href: "/revenue-management/rv-05-demand-calendar/" },
    { code: "RV-06", label: "Rate Grid", icon: "banknote", href: "/revenue-management/rv-06-rate-grid/" },
    { code: "RV-07", label: "Restrictions", icon: "sliders", href: "/revenue-management/rv-07-restrictions-and-overbooking/" },
    { code: "RV-08", label: "Competitors", icon: "building-2", href: "/revenue-management/rv-08-competitor-rates/" },
    { code: "RV-09", label: "Parity", icon: "arrow-left-right", href: "/revenue-management/rv-09-rate-parity/" },
    { code: "RV-10", label: "Group Evaluation", icon: "users", href: "/revenue-management/rv-10-group-evaluation/" },
    { code: "RV-11", label: "Recommendations", icon: "sparkles", href: "/revenue-management/rv-11-pricing-recommendations/" },
    { code: "RV-12", label: "Reports", icon: "bar-chart", href: "/revenue-management/rv-12-revenue-reports/" },
  ] },
  { id: "da", label: "Dashboards & Approvals", items: [
    { code: "DA-01", label: "My Dashboard", icon: "layout-dashboard", href: "/dashboards-and-approvals/da-01-my-dashboard/" },
    { code: "DA-02", label: "GM Dashboard", icon: "gauge", href: "/dashboards-and-approvals/da-02-gm-dashboard/" },
    { code: "DA-03", label: "Approvals", icon: "clipboard-check", href: "/dashboards-and-approvals/da-03-approvals-inbox/" },
    { code: "DA-05", label: "Alerts", icon: "bell-ring", href: "/dashboards-and-approvals/da-05-alerts/" },
    { code: "DA-06", label: "Scorecards", icon: "bar-chart", href: "/dashboards-and-approvals/da-06-kpi-scorecards/" },
    { code: "DA-07", label: "Delegation", icon: "users", href: "/dashboards-and-approvals/da-07-delegation/" },
    { code: "DA-08", label: "Briefing", icon: "mail", href: "/dashboards-and-approvals/da-08-daily-management-briefing/" },
    { code: "DA-09", label: "Reports", icon: "file-text", href: "/dashboards-and-approvals/da-09-approval-reports/" },
  ] },
  { id: "an", label: "Analytics & Reports", items: [
    { code: "AN-01", label: "Library", icon: "folder", href: "/analytics-and-reports/an-01-report-library/" },
    { code: "AN-02", label: "Viewer", icon: "file-text", href: "/analytics-and-reports/an-02-report-viewer/" },
    { code: "AN-03", label: "Flash Report", icon: "sparkles", href: "/analytics-and-reports/an-03-flash-report/" },
    { code: "AN-04", label: "Manager's Report", icon: "briefcase", href: "/analytics-and-reports/an-04-manager-s-report/" },
    { code: "AN-05", label: "Statistics", icon: "bar-chart", href: "/analytics-and-reports/an-05-occupancy-and-revenue-statistics/" },
    { code: "AN-06", label: "Guests", icon: "users", href: "/analytics-and-reports/an-06-guest-statistics/" },
    { code: "AN-07", label: "Collections", icon: "coins", href: "/analytics-and-reports/an-07-collections-and-outstanding/" },
    { code: "AN-08", label: "Audit Trail", icon: "history", href: "/analytics-and-reports/an-08-audit-trail-reports/" },
    { code: "AN-09", label: "Schedules", icon: "clock", href: "/analytics-and-reports/an-09-my-scheduled-reports/" },
    { code: "AN-10", label: "Analysis", icon: "layers", href: "/analytics-and-reports/an-10-ad-hoc-analysis/" },
  ] },
  { id: "ms", label: "MIS & Budgeting", items: [
    { code: "MS-01", label: "MIS Dashboard", icon: "layout-dashboard", href: "/mis-and-budgeting/ms-01-mis-dashboard/" },
    { code: "MS-02", label: "Budget", icon: "wallet", href: "/mis-and-budgeting/ms-02-budget-versions/" },
    { code: "MS-04", label: "Reforecast", icon: "trending-up", href: "/mis-and-budgeting/ms-04-reforecast/" },
    { code: "MS-05", label: "Statements", icon: "file-text", href: "/mis-and-budgeting/ms-05-financial-statements/" },
    { code: "MS-06", label: "Variance", icon: "bar-chart", href: "/mis-and-budgeting/ms-06-budget-vs-actual/" },
    { code: "MS-07", label: "Ratios", icon: "percent", href: "/mis-and-budgeting/ms-07-kpi-ratios/" },
    { code: "MS-08", label: "MIS Pack", icon: "send", href: "/mis-and-budgeting/ms-08-monthly-mis-pack/" },
  ] },
  { id: "ow", label: "Owner App", items: [
    { code: "OW-01", label: "Owner Home", icon: "home", href: "/owner-app-and-multi-property/ow-01-owner-home/" },
    { code: "OW-02", label: "Revenue", icon: "trending-up", href: "/owner-app-and-multi-property/ow-02-revenue-and-statistics/" },
    { code: "OW-03", label: "On the Books", icon: "calendar-range", href: "/owner-app-and-multi-property/ow-03-business-on-the-books/" },
    { code: "OW-04", label: "Money", icon: "wallet", href: "/owner-app-and-multi-property/ow-04-money/" },
    { code: "OW-05", label: "Approvals", icon: "inbox", href: "/owner-app-and-multi-property/ow-05-owner-approvals/" },
    { code: "OW-06", label: "Alerts", icon: "bell-ring", href: "/owner-app-and-multi-property/ow-06-owner-alerts/" },
    { code: "OW-07", label: "Owner Pack", icon: "folder", href: "/owner-app-and-multi-property/ow-07-owner-pack-and-documents/" },
    { code: "OW-08", label: "Portfolio", icon: "building-2", href: "/owner-app-and-multi-property/ow-08-portfolio-view/" },
    { code: "OW-09", label: "Group Reports", icon: "bar-chart", href: "/owner-app-and-multi-property/ow-09-group-reports/" },
  ] },
  { id: "lg", label: "User & Access", items: [
    { code: "LG-01", label: "Super Admin Home", icon: "shield", href: "/user-and-access-management/lg-01-super-admin-home/" },
    { code: "LG-02", label: "Users", icon: "users", href: "/user-and-access-management/lg-02-users/" },
    { code: "LG-04", label: "Roles", icon: "id-card", href: "/user-and-access-management/lg-04-roles/" },
    { code: "LG-06", label: "Limits", icon: "sliders", href: "/user-and-access-management/lg-06-limits-by-role/" },
    { code: "LG-07", label: "Login Policy", icon: "lock", href: "/user-and-access-management/lg-07-login-policy/" },
    { code: "LG-08", label: "Devices", icon: "smartphone", href: "/user-and-access-management/lg-08-devices/" },
    { code: "LG-09", label: "Sessions", icon: "monitor", href: "/user-and-access-management/lg-09-active-sessions/" },
    { code: "LG-10", label: "Access Review", icon: "shield-check", href: "/user-and-access-management/lg-10-access-review/" },
    { code: "LG-11", label: "Activity", icon: "history", href: "/user-and-access-management/lg-11-login-and-activity-history/" },
  ] },
  { id: "ad", label: "Property Admin", items: [
    { code: "AD-01", label: "Properties", icon: "building-2", href: "/property-administration/ad-01-properties/" },
    { code: "AD-03", label: "Parameters", icon: "sliders", href: "/property-administration/ad-03-property-parameters/" },
    { code: "AD-04", label: "Modules", icon: "layers", href: "/property-administration/ad-04-modules-and-licence/" },
    { code: "AD-05", label: "Common Masters", icon: "list", href: "/property-administration/ad-05-common-masters/" },
    { code: "AD-06", label: "Number Series", icon: "hash", href: "/property-administration/ad-06-number-series-registry/" },
    { code: "AD-07", label: "Templates", icon: "file-text", href: "/property-administration/ad-07-template-library/" },
    { code: "AD-08", label: "Go-live", icon: "clipboard-check", href: "/property-administration/ad-08-go-live-checklist/" },
    { code: "AD-09", label: "Data Import", icon: "upload", href: "/property-administration/ad-09-data-import-centre/" },
  ] },
  { id: "in", label: "Integrations", items: [
    { code: "IN-01", label: "Catalogue", icon: "layers", href: "/integrations/in-01-integration-catalogue/" },
    { code: "IN-02", label: "Connection", icon: "link", href: "/integrations/in-02-connection-setup/" },
    { code: "IN-03", label: "Mappings", icon: "arrow-left-right", href: "/integrations/in-03-code-mappings/" },
    { code: "IN-04", label: "Health", icon: "gauge", href: "/integrations/in-04-integration-health/" },
    { code: "IN-05", label: "Message Log", icon: "list", href: "/integrations/in-05-message-log/" },
    { code: "IN-06", label: "Error Queue", icon: "alert", href: "/integrations/in-06-error-queue/" },
    { code: "IN-07", label: "API & Webhooks", icon: "key", href: "/integrations/in-07-api-keys-and-webhooks/" },
  ] },
  { id: "sy", label: "System & Audit", items: [
    { code: "SY-01", label: "Dashboard", icon: "monitor", href: "/system-and-audit/sy-01-system-dashboard/" },
    { code: "SY-02", label: "Audit Log", icon: "history", href: "/system-and-audit/sy-02-audit-log-search/" },
    { code: "SY-03", label: "Retention", icon: "archive", href: "/system-and-audit/sy-03-retention-schedules/" },
    { code: "SY-04", label: "Privacy", icon: "shield-check", href: "/system-and-audit/sy-04-privacy-centre/" },
    { code: "SY-05", label: "Backups", icon: "download", href: "/system-and-audit/sy-05-backups/" },
    { code: "SY-06", label: "Jobs", icon: "timer", href: "/system-and-audit/sy-06-scheduled-jobs/" },
    { code: "SY-07", label: "Licence & Releases", icon: "key", href: "/system-and-audit/sy-07-licence-and-releases/" },
    { code: "SY-08", label: "Announcements", icon: "bell-ring", href: "/system-and-audit/sy-08-announcements/" },
  ] },
  { id: "tools", label: "Tools", items: [
    { code: "CM-03", label: "Address Book", icon: "book-open" },
    { code: "CM-04", label: "Help & Support", icon: "help" },
  ] },
];

/**
 * Which sidebar item to highlight on a screen that is not in the sidebar.
 * Any RSS-nn → RSS-01 and FDS-nn → FDS-01 are handled by navParent() without listing them here.
 * @type {Record<string, string>}
 */
export const PARENT = {
  "RS-02": "RS-03", "RS-05": "RS-06", "RS-07": "RS-06", "RS-08": "RS-06", "RS-09": "RS-06", "RS-10": "RS-06", "RS-11": "RS-06",
  "RS-12": "RS-06", "RS-13": "RS-06", "RS-15": "RS-14",
  "CM-02": "", "CM-05": "",
  "FD-03": "FD-02", "FD-04": "FD-02", "FD-05": "FD-02", "FD-29": "FD-02",
  "FD-08": "FD-07", "FD-09": "FD-07", "FD-10": "FD-07", "FD-13": "FD-07",
  "FD-15": "FD-14",
  "LA-03": "LA-02", "LA-07": "LA-06",
};

/** @param {string} code  e.g. "FD-03-2" or "RSS-04" → code of the sidebar item to highlight ("" = none) */
export function navParent(code) {
  const main = code.replace(/^((?:FD|FDS|SY|IN|AD|LG|OW|OWS|MS|MSS|AN|ANS|DA|DAS|RV|RVS|HRS|HR|TXS|TX|ACS|AC|FNS|FN|CCS|CC|STS|ST|PRS|PR|BQS|BQ|KTS|KT|RTS|RT|MTS|MT|LFS|LF|LNS|LN|HKS|HK|LAS|LA|MBS|MB|RSS|RS|CM)-\d+)(?:-.*|[a-z])?$/, "$1");
  if (NAV.some((g) => g.items.some((i) => i.code === main))) return main;
  if (main in PARENT) return PARENT[main];
  if (main.startsWith("RSS-")) return "RSS-01";
  if (main.startsWith("FDS-")) return "FDS-01";
  if (main.startsWith("HKS-")) return "HKS-01";
  if (main.startsWith("LAS-")) return "LAS-01";
  if (main.startsWith("MBS-")) return "MBS-01";
  if (main.startsWith("LNS-")) return "LNS-01";
  if (main.startsWith("LFS-")) return "LFS-01";
  if (main.startsWith("MTS-")) return "MTS-01";
  if (main.startsWith("RTS-")) return "RTS-01";
  if (main.startsWith("KTS-")) return "KTS-01";
  if (main.startsWith("BQS-")) return "BQS-01";
  if (main.startsWith("PRS-")) return "PRS-01";
  if (main.startsWith("STS-")) return "STS-01";
  if (main.startsWith("CCS-")) return "CCS-01";
  if (main.startsWith("FNS-")) return "FNS-01";
  if (main.startsWith("ACS-")) return "ACS-01";
  if (main.startsWith("TXS-")) return "TXS-01";
  if (main.startsWith("HRS-")) return "HRS-01";
  if (main.startsWith("RVS-")) return "RVS-01";
  if (main.startsWith("DAS-")) return "DAS-01";
  if (main.startsWith("ANS-")) return "ANS-01";
  if (main.startsWith("MSS-")) return "MSS-01";
  if (main.startsWith("OWS-")) return "OWS-01";
  if (main.startsWith("HK-")) return "HK-01";
  if (main.startsWith("LA-")) return "LA-01";
  if (main.startsWith("MB-")) return "MB-01";
  if (main.startsWith("LN-")) return "LN-01";
  if (main.startsWith("LF-")) return "LF-01";
  if (main.startsWith("MT-")) return "MT-01";
  if (main.startsWith("RT-")) return "RT-01";
  if (main.startsWith("KT-")) return "KT-02";
  if (main.startsWith("ST-")) return main;
  if (main.startsWith("AC-")) return main === "AC-04" ? "AC-03" : main;
  if (main.startsWith("TX-")) return main;
  if (main.startsWith("HR-")) return main === "HR-03" ? "HR-02" : main;
  if (main.startsWith("AC-")) return main === "AC-04" ? "AC-03" : main;
  if (main.startsWith("FN-")) return main === "FN-03" ? "FN-02" : main;
  if (main.startsWith("CC-")) return main;
  if (main.startsWith("PR-")) return main === "PR-03" ? "PR-02" : main === "PR-07" ? "PR-06" : main;
  if (main.startsWith("BQ-")) return main === "BQ-05" ? "BQ-04" : main;
  return "";
}

/** The group that holds the item to highlight (used to open that group first). @param {string} code */
export function navGroupOf(code) {
  const p = navParent(code);
  return NAV.find((g) => g.items.some((i) => i.code === p))?.id ?? "";
}

/** Items of the top-bar “+ New” menu (spec §3.1). */
export const NEW_MENU = [
  { code: "RS-05", label: "New Reservation", icon: "plus-circle" },
  { code: "RS-02", label: "New Enquiry", icon: "message-square" },
  { code: "FD-04", label: "Walk-in", icon: "log-in" },
  { code: "FD-P20", label: "New Request", icon: "bell-ring", href: "/front-desk/fd-11-requests-complaints/#FD-P20" },
];

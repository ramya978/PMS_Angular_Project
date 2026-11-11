// @ts-check
/**
 * Everything around the bookings: enquiries, waitlist, approval requests and notifications, channel mappings / messages / sync logs,
 * number series and the audit trail of setup changes. Built after the bookings so it can point at real reservations.
 */
import { createRandom } from "../../core/random.js";
import { addDays, diffDays, rupees, formatMoney } from "../../core/format.js";
import { at, pad, fyShort } from "./helpers.js";

/**
 * @param {Object} src
 * @param {string} src.today
 * @param {Record<string, any[]>} src.masters
 * @param {Record<string, any[]>} src.bookings collections built by bookings.js (reservations are modified here: enquiryId, pending refund)
 * @param {any[]} src.guests
 */
export function buildExtras(src) {
  const { today, masters: M, bookings: B, guests } = src;
  const rng = createRandom("aviv-extras-v1");
  const reservations = B.reservations;
  const fy = fyShort(today);
  const guestById = new Map(guests.map((g) => [g.id, g]));
  const sourceById = new Map(M.sources.map((s) => [s.id, s]));
  const resById = new Map(reservations.map((r) => [r.id, r]));

  /* ───────── enquiries (26) with quotes ───────── */
  const enqSources = ["src-phone", "src-email", "src-whatsapp", "src-website", "src-agent", "src-company"];
  /** @type {any[]} */ const enquiries = [];
  const statusPlan = /** @type {Array<[string, number]>} */ ([["open", 8], ["quoted", 8], ["converted", 5], ["lost", 5]]);
  let n = 0;
  const futureConfirmed = reservations.filter((r) => ["confirmed", "guaranteed"].includes(r.status) && r.arrival > today && !r.channelId && !r.groupId);
  for (const [status, count] of statusPlan) {
    for (let i = 0; i < count; i++) {
      n++;
      const g = rng.pick(guests);
      const created = addDays(today, -rng.int(0, 20));
      const from = addDays(today, rng.int(5, 70));
      const nights = rng.int(1, 5);
      const rt = rng.weighted([["rt-wgr", 45], ["rt-fcr", 35], ["rt-fcs", 15], ["rt-fps", 5]]);
      const quoted = status !== "open";
      /** @type {any} */
      const e = {
        id: `EQ-${fy}-${pad(n, 4)}`, number: `EQ-${fy}-${pad(n, 4)}`, guestName: `${g.firstName} ${g.lastName}`, email: g.email, phone: g.phone, guestId: g.id, sourceId: rng.pick(enqSources),
        from, to: addDays(from, nights), adults: rng.weighted([[1, 20], [2, 60], [3, 15], [4, 5]]), children: rng.chance(0.2) ? 1 : 0, rooms: rng.weighted([[1, 80], [2, 15], [3, 5]]), roomTypeId: rt,
        status, assignedTo: rng.pick(["u-rahul", "u-sneha", "u-anita", "u-farah"]), notes: rng.pick(["Asked about pool view rooms.", "Wants breakfast included.", "Comparing with another hotel in Fort Kochi.", "Family trip – needs extra bed.", "Corporate offsite, flexible on dates.", "Honeymoon couple.", ""]),
        createdAt: at(created, rng.int(9, 19), rng.int(0, 59)),
      };
      if (!e.notes) delete e.notes;
      if (quoted) e.quotedAmount = rupees(rng.int(2, 18) * 1000 + 999);
      if (status === "open") e.followUpOn = addDays(today, rng.int(-1, 2));
      if (status === "quoted") e.followUpOn = addDays(today, rng.int(-2, 4));
      if (status === "lost") e.lostReasonId = rng.pick(M.reasonCodes.filter((r) => r.type === "lost-enquiry")).id;
      if (status === "converted") {
        const r = futureConfirmed.splice(rng.int(0, futureConfirmed.length - 1), 1)[0];
        if (r) {
          e.reservationId = r.id; e.guestName = `${guestById.get(r.guestId).firstName} ${guestById.get(r.guestId).lastName}`; e.guestId = r.guestId; e.from = r.arrival; e.to = r.departure; e.roomTypeId = B.reservationRooms.find((l) => l.reservationId === r.id).roomTypeId;
          e.adults = r.adults; e.children = r.children; e.rooms = r.roomCount; r.enquiryId = e.id;
          e.createdAt = at(addDays(r.createdAt.slice(0, 10), -rng.int(1, 4)), 11, 20);
        } else e.status = "quoted";
      }
      enquiries.push(e);
    }
  }
  // quote messages for quoted / converted enquiries
  /** @type {any[]} */ const enquiryMessages = [];
  enquiries.filter((e) => e.status !== "open").forEach((e, i) => {
    enquiryMessages.push({ id: `MSG-E${pad(i + 1, 4)}`, enquiryId: e.id, guestId: e.guestId, templateId: i % 2 ? "mt-quote-e" : "mt-quote-w", channel: i % 2 ? "email" : "whatsapp", to: i % 2 ? e.email : e.phone, ...(i % 2 ? { subject: "Your quote from The Aviv Kochi" } : {}), preview: `Quote ${formatMoney(e.quotedAmount ?? 0)} for ${e.from} to ${e.to}`, status: rng.pick(["delivered", "read", "sent"]), at: at(e.createdAt.slice(0, 10), 15, 30) });
  });

  /* ───────── waitlist for the sold-out suites ───────── */
  const soldOutFrom = addDays(today, 12);
  const wl = (/** @type {string} */ name, /** @type {string} */ rt, /** @type {string} */ status, /** @type {number} */ daysAgo, /** @type {number} */ shiftDays = 0, /** @type {number} */ nights = 3) => {
    const g = rng.pick(guests);
    return { id: `WL-${pad(0, 1)}`, guestName: name, phone: g.phone, email: g.email, guestId: g.id, roomTypeId: rt, from: addDays(soldOutFrom, shiftDays), to: addDays(soldOutFrom, shiftDays + nights), rooms: 1, adults: 2, status, createdAt: at(addDays(today, -daysAgo), rng.int(9, 20), rng.int(0, 59)) };
  };
  const waitlist = [
    wl("Rekha Prem", "rt-fcs", "waiting", 3), wl("Daniel Hughes", "rt-fcs", "waiting", 2, 0, 2), wl("Arvind Shaan", "rt-fcs", "waiting", 1, 1, 2), wl("Meenakshi Ishaan", "rt-fps", "waiting", 4),
    wl("Thomas Abraham", "rt-fcs", "notified", 6), wl("Sandra Mueller", "rt-fps", "expired", 14, -9),
  ].map((w, i) => ({ ...w, id: `WL-${pad(i + 1, 4)}` }));

  /* ───────── approval requests and notifications ───────── */
  /** @type {any[]} */ const approvalRequests = [];
  /** @type {any[]} */ const notifications = [];
  const futureRes = reservations.filter((r) => ["confirmed", "guaranteed", "tentative"].includes(r.status) && r.arrival >= addDays(today, 5) && !r.channelId && !r.groupId);
  const pickRes = (/** @type {(r: any) => boolean} */ f) => { const hit = reservations.filter(f); return hit.length ? rng.pick(hit) : rng.pick(reservations); };

  const overrideRes = rng.pick(futureRes);
  const sold = (/** @type {number} */ min) => at(today, 9, min);
  approvalRequests.push({ id: "AP-0001", type: "rate-override", reservationId: overrideRes.id, requestedBy: "u-rahul", requestedAt: sold(5), roleNeededId: "role-rm", amount: 12, unit: "percent", reasonId: "rc-10", reasonNote: "Repeat corporate guest asked for a matching rate.", status: "pending", escalateAt: at(today, 10, 5), payload: { reservationId: overrideRes.id, discountPct: 12 } });
  notifications.push({ id: "ntf-1", kind: "approval", title: "Approval needed", body: `Rate override on ${overrideRes.number} (−12%) needs your decision.`, at: sold(5), read: false, href: "RS-20", refId: "AP-0001", roleId: "role-rm" });

  // pending refund
  let refund = B.refunds.find((r) => r.status === "pending-approval");
  if (!refund) {
    refund = B.refunds.find((r) => r.status === "paid");
    if (refund) { // turn a paid refund into a pending one (the money has not left yet)
      refund.status = "pending-approval";
      const r = resById.get(refund.reservationId);
      r.paid += refund.amount; r.balance = r.total - r.paid;
    }
  }
  if (refund) {
    const rr = resById.get(refund.reservationId);
    refund.approvalId = "AP-0002";
    approvalRequests.push({ id: "AP-0002", type: "refund", reservationId: rr.id, requestedBy: "u-george", requestedAt: sold(20), roleNeededId: refund.amount > rupees(20000) ? "role-fom" : "role-rm", amount: refund.amount, unit: "paise", reasonId: refund.reasonId, status: "pending", escalateAt: at(today, 11, 20) });
    notifications.push({ id: "ntf-2", kind: "approval", title: "Approval needed", body: `Refund of ${formatMoney(refund.amount)} for ${rr.number} is waiting.`, at: sold(20), read: false, href: "RS-20", refId: "AP-0002", roleId: refund.amount > rupees(20000) ? "role-fom" : "role-rm" });
  }

  // any other refund still waiting gets an approved request (the money has not been paid out yet)
  B.refunds.filter((x) => x.status === "pending-approval" && x !== refund).forEach((x, i) => {
    const id = `AP-${pad(8 + i, 4)}`;
    x.status = "approved";
    x.approvalId = id;
    approvalRequests.push({ id, type: "refund", reservationId: x.reservationId, requestedBy: "u-george", requestedAt: at(addDays(today, -1), 15, 10 + i), roleNeededId: x.amount > rupees(20000) ? "role-fom" : "role-rm", amount: x.amount, unit: "paise", reasonId: x.reasonId, status: "approved", decidedBy: "u-anita", decidedAt: at(addDays(today, -1), 16, 0), decisionNote: "Approved – refund to the original payment mode." });
  });
  const r3 = pickRes((r) => r.status === "confirmed" && r.arrival > today);
  const r4 = pickRes((r) => r.status === "cancelled");
  const r5 = pickRes((r) => r.status === "guaranteed" && r.arrival > today);
  const r6 = pickRes((r) => r.status === "checked-out");
  approvalRequests.push(
    { id: "AP-0003", type: "overbooking", requestedBy: "u-sneha", requestedAt: at(addDays(today, -1), 16, 30), roleNeededId: "role-fom", amount: 1, unit: "rooms", reasonId: "rc-22", reasonNote: "Walk-in family; one suite guest is expected to cancel.", status: "escalated", escalateAt: at(addDays(today, -1), 17, 30) },
    { id: "AP-0004", type: "discount", reservationId: r3.id, requestedBy: "u-rahul", requestedAt: at(addDays(today, -2), 12, 10), roleNeededId: "role-rm", amount: 12, unit: "percent", reasonId: "rc-6", status: "approved", decidedBy: "u-anita", decidedAt: at(addDays(today, -2), 12, 40), decisionNote: "Loyal guest – approved." },
    { id: "AP-0005", type: "penalty-waiver", reservationId: r4.id, requestedBy: "u-sneha", requestedAt: at(addDays(today, -4), 10, 0), roleNeededId: "role-rm", amount: rupees(8000), unit: "paise", reasonId: "rc-20", status: "rejected", decidedBy: "u-anita", decidedAt: at(addDays(today, -4), 11, 15), decisionNote: "Outside the 72-hour window; policy applies." },
    { id: "AP-0006", type: "complimentary", reservationId: r5.id, requestedBy: "u-anita", requestedAt: at(addDays(today, -6), 14, 0), roleNeededId: "role-fom", amount: 1, unit: "nights", reasonId: "rc-11", status: "approved", decidedBy: "u-fom", decidedAt: at(addDays(today, -6), 14, 45), decisionNote: "Upgrade night for a travel-media guest." },
    { id: "AP-0007", type: "void-payment", reservationId: r6.id, requestedBy: "u-george", requestedAt: at(addDays(today, -9), 17, 5), roleNeededId: "role-fom", amount: 1, unit: "count", reasonId: "rc-18", status: "approved", decidedBy: "u-fom", decidedAt: at(addDays(today, -9), 17, 50), decisionNote: "Duplicate payment entry." },
  );
  // alerts and reminders
  /** @type {any[]} */ const channelMessages = [];
  notifications.push(
    { id: "ntf-3", kind: "alert", title: "Channel booking failed", body: "A Booking.com reservation could not be matched to a room type.", at: at(today, 8, 50), read: false, href: "RS-23", refId: "CMSG-F1" },
    { id: "ntf-4", kind: "reminder", title: "Advance due tomorrow", body: `${reservations.filter((r) => ["tentative", "confirmed"].includes(r.status) && r.arrival > today).length > 3 ? 3 : 1} tentative bookings have an advance due.`, at: at(addDays(today, -1), 17, 0), read: true, href: "RS-06" },
  );
  const expiring = reservations.find((r) => r.status === "tentative" && r.optionDate === today) ?? reservations.find((r) => r.status === "tentative");
  notifications.push({ id: "ntf-5", kind: "reminder", title: "Option date expiring", body: `${expiring ? expiring.number : "A tentative booking"} expires today.`, at: at(addDays(today, -1), 12, 0), read: true, href: "RS-06", ...(expiring ? { refId: expiring.id } : {}) });

  /* ───────── channel mappings, messages and sync logs ───────── */
  const ROOM_CODES = /** @type {Record<string, [string, string]>} */ ({ "rt-wgr": ["DLX-GDN", "Deluxe Garden View"], "rt-fcr": ["DLX-POOL", "Deluxe Pool View"], "rt-fcs": ["STE-CLS", "Classic Suite"], "rt-fps": ["STE-PRM", "Premium Suite"] });
  const RATE_CODES = /** @type {Record<string, string>} */ ({ "rp-bar-cp": "BAR-BF", "rp-bar-ep": "BAR-RO", "rp-bar-map": "BAR-HB", "rp-adv15": "ADV-NR" });
  /** @type {any[]} */ const channelMappings = [];
  for (const ch of M.channels) {
    for (const [rt, [code, name]] of Object.entries(ROOM_CODES)) {
      for (const [rp, rate] of Object.entries(RATE_CODES)) {
        if (ch.type === "ota" && (rp === "rp-bar-map")) continue;
        if (ch.id === "ch-booking" && rt === "rt-fps" && rp === "rp-bar-ep") continue; // deliberately missing → the failed Booking.com message
        if (ch.id === "ch-trip" && rp === "rp-adv15") continue;
        channelMappings.push({ id: `cm-${ch.code.toLowerCase()}-${code.toLowerCase()}-${rate.toLowerCase()}`, channelId: ch.id, externalRoomCode: `${ch.code.slice(0, 3)}-${code}`, externalRoomName: name, externalRateCode: rate, roomTypeId: rt, ratePlanId: rp, active: true });
      }
    }
  }
  reservations.filter((r) => r.channelId).forEach((r, i) => {
    const line = B.reservationRooms.find((l) => l.reservationId === r.id);
    channelMessages.push({
      id: `CMSG-${pad(i + 1, 4)}`, channelId: r.channelId, type: "booking", externalRef: r.externalRef, receivedAt: r.createdAt, status: "processed", reservationId: r.id,
      summary: { guest: `${guestById.get(r.guestId).firstName} ${guestById.get(r.guestId).lastName}`, from: r.arrival, to: r.departure, roomCode: ROOM_CODES[line.roomTypeId][0], rateCode: RATE_CODES[r.ratePlanId] ?? "BAR-BF", amount: r.total },
    });
    if (r.status === "cancelled") channelMessages.push({ id: `CMSG-C${pad(i + 1, 3)}`, channelId: r.channelId, type: "cancellation", externalRef: r.externalRef, receivedAt: r.cancelledAt ?? r.updatedAt, status: "processed", reservationId: r.id, summary: { guest: `${guestById.get(r.guestId).firstName} ${guestById.get(r.guestId).lastName}`, from: r.arrival, to: r.departure } });
  });
  channelMessages.push(
    { id: "CMSG-F1", channelId: "ch-booking", type: "booking", externalRef: "BO-481920377", receivedAt: at(today, 8, 48), status: "failed", error: "Room code BOO-STE-PRM with rate code BAR-RO is not mapped to a hotel room type and rate plan.", summary: { guest: "Hannah Brooks", from: addDays(today, 18), to: addDays(today, 21), roomCode: "BOO-STE-PRM", rateCode: "BAR-RO", amount: rupees(76800) } },
    { id: "CMSG-F2", channelId: "ch-agoda", type: "booking", externalRef: "AG-770215964", receivedAt: at(addDays(today, -1), 21, 14), status: "failed", error: "Rate code PKG-DINNER is not mapped to a hotel rate plan.", summary: { guest: "Kunal Manav", from: addDays(today, 9), to: addDays(today, 11), roomCode: "AGO-DLX-POOL", rateCode: "PKG-DINNER", amount: rupees(21400) } },
    { id: "CMSG-Q1", channelId: "ch-mmt", type: "modification", externalRef: "MM-559103482", receivedAt: at(today, 9, 40), status: "queued", summary: { guest: "Swathi Ranjan", from: addDays(today, 6), to: addDays(today, 8), roomCode: "MMT-DLX-GDN", rateCode: "BAR-BF" } },
  );
  /** @type {any[]} */ const channelSyncLogs = [];
  let ls = 0;
  for (const ch of M.channels) {
    for (let back = 0; back < 3; back++) {
      for (const kind of ["rates", "availability", "restrictions"]) {
        channelSyncLogs.push({ id: `SYN-${pad(++ls, 4)}`, channelId: ch.id, kind, from: addDays(today, 0), to: addDays(today, 365), status: "success", records: kind === "availability" ? 4 * 365 : kind === "rates" ? 8 * 365 : 5, at: at(addDays(today, -back), 6 + back, 0) });
      }
    }
  }
  const lastSync = new Map();
  for (const l of channelSyncLogs) if (!lastSync.has(l.channelId) || l.at > lastSync.get(l.channelId)) lastSync.set(l.channelId, l.at);
  const agoda = channelSyncLogs.find((l) => l.channelId === "ch-agoda" && l.kind === "rates");
  if (agoda) { agoda.status = "partial"; agoda.records = 8 * 365 - 24; agoda.message = "24 dates were rejected: rate below the channel minimum."; }
  const exp = channelSyncLogs.find((l) => l.channelId === "ch-expedia" && l.kind === "availability" && l.at.startsWith(addDays(today, -1)));
  if (exp) { exp.status = "failed"; exp.records = 0; exp.message = "The channel did not answer in time (timeout). It will be retried."; }
  for (const ch of M.channels) ch.lastSyncAt = lastSync.get(ch.id);

  /* ───────── number series (next numbers continue the seeded documents) ───────── */
  const maxNum = (/** @type {any[]} */ rows, /** @type {RegExp} */ re) => rows.reduce((m, r) => { const x = re.exec(String(r.number ?? r.id)); return x ? Math.max(m, Number(x[1])) : m; }, 0);
  const numberSeries = [
    { id: "ns-booking", code: "BOOKING", name: "Booking number", prefix: "FK-", includeYear: "none", padding: 5, next: maxNum(reservations, /^FK-(\d+)$/) + 1, resetPolicy: "never" },
    { id: "ns-enquiry", code: "ENQUIRY", name: "Enquiry number", prefix: "EQ-", includeYear: "financial", padding: 4, next: n + 1, resetPolicy: "financial-year", lastResetOn: `${Number(today.slice(5, 7)) >= 4 ? today.slice(0, 4) : Number(today.slice(0, 4)) - 1}-04-01` },
    { id: "ns-receipt", code: "RECEIPT", name: "Receipt number", prefix: "RC-", includeYear: "financial", padding: 5, next: B.payments.length + 1, resetPolicy: "financial-year" },
    { id: "ns-group", code: "GROUP", name: "Group number", prefix: "GRP-", includeYear: "none", padding: 4, next: 3, resetPolicy: "never" },
    { id: "ns-cancel", code: "CANCEL", name: "Cancellation number", prefix: "CN-", includeYear: "none", padding: 5, next: maxNum(B.cancellations, /^CN-(\d+)$/) + 1, resetPolicy: "never" },
    { id: "ns-refund", code: "REFUND", name: "Refund number", prefix: "RF-", includeYear: "none", padding: 4, next: B.refunds.length + 1, resetPolicy: "never" },
    { id: "ns-paylink", code: "PAYLINK", name: "Payment link number", prefix: "PL-", includeYear: "none", padding: 4, next: B.paymentLinks.length + 1, resetPolicy: "never" },
    { id: "ns-quote", code: "QUOTE", name: "Quote number", prefix: "QT-", includeYear: "financial", padding: 4, next: enquiryMessages.length + 1, resetPolicy: "financial-year" },
  ].map((s) => ({ ...s, active: true }));

  /* ───────── audit trail of setup changes (shown in the setup audit report) ───────── */
  const setupAudit = [
    ["u-arjun", "rateCalendar", "rt-wgr|rp-bar-cp", "update", [{ field: "rate2", old: rupees(7499), new: rupees(7999) }], "Base rate for the Garden Deluxe Room raised for the new season", -35],
    ["u-arjun", "restrictions", "rs-nye", "create", [{ field: "minStay", old: null, new: 2 }], "New Year's Eve minimum stay", -28],
    ["u-fom", "outOfOrderPeriods", "ooo-1", "create", [{ field: "roomId", old: null, new: "R-214" }], "Air-conditioning repair", -3],
    ["u-admin", "users", "u-sneha", "create", [{ field: "roleId", old: null, new: "role-ra" }], "New reservation agent", -60],
    ["u-admin", "approvalLimits", "al-rm-discount-percent", "update", [{ field: "limit", old: 10, new: 15 }], "Reservation Manager discount limit raised", -45],
    ["u-arjun", "ratePlans", "rp-adv15", "update", [{ field: "bookingWindow.minAdvanceDays", old: 7, new: 14 }], "Advance purchase now needs 14 days", -20],
    ["u-anita", "messageTemplates", "mt-conf-e", "update", [{ field: "body", old: "Dear guest…", new: "Dear {{guest.name}},…" }], "Confirmation e-mail wording updated", -12],
    ["u-arjun", "overbookingLimits", "ob-wgr", "update", [{ field: "rooms", old: 1, new: 2 }], "No-show cover for Garden Deluxe Rooms", -9],
    ["u-george", "paymentModes", "pm-upi", "update", [{ field: "requiresReference", old: false, new: true }], "UPI payments now need a reference", -7],
    ["u-admin", "taxSlabs", "tx-5", "update", [{ field: "effectiveFrom", old: "2025-04-01", new: "2025-09-22" }], "GST slab dates updated after the GST rate change", -30],
    ["u-arjun", "seasons", `ss-peak-${today.slice(0, 4)}`, "update", [{ field: "adjustmentPct", old: 30, new: 35 }], "Peak season uplift raised to 35%", -16],
    ["u-fom", "reservationParameters", "params", "update", [{ field: "defaultOptionDays", old: 2, new: 3 }], "Tentative bookings are held for 3 days", -22],
  ].map(([userId, entity, entityId, action, changes, note, daysAgo], i) => ({ id: `AU-S${pad(i + 1, 4)}`, at: at(addDays(today, Number(daysAgo)), 10 + (i % 6), (i * 7) % 60), userId, entity, entityId, action, changes, note }));
  // enquiry creation entries
  const enquiryAudit = enquiries.map((e, i) => ({ id: `AU-E${pad(i + 1, 4)}`, at: e.createdAt, userId: e.assignedTo, entity: "enquiries", entityId: e.id, action: "create", changes: [{ field: "status", old: null, new: "open" }] }));
  const approvalAudit = approvalRequests.map((a, i) => ({ id: `AU-A${pad(i + 1, 4)}`, at: a.requestedAt, userId: a.requestedBy, entity: "approvalRequests", entityId: a.id, action: "create", changes: [{ field: "status", old: null, new: "pending" }] }));

  return {
    enquiries, waitlist, approvalRequests, notifications, channelMappings, channelMessages, channelSyncLogs, numberSeries, enquiryMessages,
    auditLog: [...setupAudit, ...enquiryAudit, ...approvalAudit],
    refundsChanged: true,
    sourceById,
    diffDays,
  };
}

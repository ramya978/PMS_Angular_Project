// @ts-check
/**
 * Demo bookings: ~250 reservations over the past 30 and next 90 days in every status, 2 groups, in-house guests, today's arrivals,
 * payments, cancellations, refunds, messages. Generated with a seeded random generator and kept CONSISTENT with room capacity:
 * a booking is only placed when every night has a free room, so inventory is never negative.
 */
import { createRandom } from "../../core/random.js";
import { addDays, dateRange, diffDays, percentOf, rupees } from "../../core/format.js";
import { createPricingContext } from "../../domain/rates.js";
import { priceNight } from "../../domain/pricing.js";
import { validateStay } from "../../domain/validators.js";
import { dateFactor } from "../../domain/rates.js";
import { at, pad } from "./helpers.js";

/**
 * @typedef {Object} Line
 * @property {string} rt room type id
 * @property {number} adults
 * @property {number[]} childAges
 * @property {boolean} extraBed
 * @property {string | null} roomId assigned room
 *
 * @typedef {Object} Draft
 * @property {string} status
 * @property {string} arrival
 * @property {string} departure
 * @property {Line[]} lines
 * @property {any} head fields of the reservation (without id / totals)
 * @property {any[]} nights priced nights per line: { line, date, price }
 * @property {any[]} addOns
 * @property {any[]} payments
 * @property {any} [cancellation]
 * @property {any[]} requests
 * @property {any[]} notes
 * @property {any[]} sharers
 * @property {any[]} billing
 * @property {any[]} messages
 * @property {any[]} attachments
 * @property {string} createdAt
 */

/**
 * @param {Object} src
 * @param {string} src.today
 * @param {Record<string, any[]>} src.masters collections of the masters seed
 * @param {{ typeIds: string[], dateCtx: any }} src.aux
 * @param {any[]} src.guests
 * @param {any[]} src.accounts
 * @param {any[]} src.contracts
 */
export function buildBookings(src) {
  const { today, masters: M, aux, guests, accounts } = src;
  const rng = createRandom("aviv-bookings-v1");
  const params = M.reservationParameters[0];
  const rooms = /** @type {any[]} */ (M.rooms);
  const roomTypes = /** @type {any[]} */ (M.roomTypes);
  const typeById = new Map(roomTypes.map((t) => [t.id, t]));
  const plansById = new Map(M.ratePlans.map((p) => [p.id, p]));
  const sourcesById = new Map(M.sources.map((s) => [s.id, s]));
  const pctx = createPricingContext({ ratePlans: M.ratePlans, mealPlans: M.mealPlans, rateCalendar: M.rateCalendar, taxSlabs: M.taxSlabs, params, hotelStateCode: params.gstStateCode });
  const stateByGst = new Map(M.states.map((s) => [s.gstStateCode, s]));
  void stateByGst;

  /* ───────── capacity bookkeeping ───────── */
  const total = new Map(roomTypes.map((t) => [t.id, rooms.filter((r) => r.roomTypeId === t.id).length]));
  /** @type {Map<string, number>} */ const sold = new Map();
  /** @type {Map<string, Set<string>>} */ const busy = new Map(rooms.map((r) => [r.id, new Set()]));
  /** @type {Map<string, number>} */ const oooCount = new Map();
  /** @type {Map<string, number>} */ const blockLeft = new Map(); // "group|rt|date" → rooms still unpicked
  /** @type {Map<string, number>} */ const unpicked = new Map(); // "rt|date" → unpicked rooms of all groups

  // out-of-order periods (also block assignment)
  const room = (/** @type {string} */ number) => /** @type {any} */ (rooms.find((r) => r.number === number));
  const outOfOrderPeriods = [
    { id: "ooo-1", roomId: room("214").id, from: addDays(today, -3), to: addDays(today, 4), reasonId: "rc-24", notes: "Air-conditioning compressor replacement", createdBy: "u-fom" },
    { id: "ooo-2", roomId: room("405").id, from: addDays(today, 10), to: addDays(today, 16), reasonId: "rc-25", notes: "Bathroom refurbishment", createdBy: "u-fom" },
    { id: "ooo-3", roomId: room("512").id, from: addDays(today, 40), to: addDays(today, 44), reasonId: "rc-24", notes: "Carpet replacement", createdBy: "u-fom" },
  ];
  for (const p of outOfOrderPeriods) {
    const r = rooms.find((x) => x.id === p.roomId);
    for (const d of dateRange(p.from, addDays(p.to, 1))) {
      busy.get(p.roomId)?.add(d);
      const k = `${r.roomTypeId}|${d}`;
      oooCount.set(k, (oooCount.get(k) ?? 0) + 1);
    }
    if (p.from <= today && today <= p.to) r.status = "out-of-order";
  }

  const free = (/** @type {string} */ rt, /** @type {string} */ d) => (total.get(rt) ?? 0) - (oooCount.get(`${rt}|${d}`) ?? 0) - (sold.get(`${rt}|${d}`) ?? 0) - (unpicked.get(`${rt}|${d}`) ?? 0);

  /* ───────── groups and room blocks ───────── */
  const groups = [
    { id: "GRP-0001", name: "Vijay–Nathan wedding", type: "wedding", contactName: "Sunil Vijay", contactPhone: "+91 9847012345", contactEmail: "sunil.vijay@example.com", from: addDays(today, 31), to: addDays(today, 34), status: "definite", cutOffDate: addDays(today, 17), ratePlanId: "rp-group", hallIds: ["ol-meenachil"], salesPersonId: "u-farah", notes: "Two-day wedding celebrations with a reception in Meenachil Hall. Vegetarian catering for most guests.", createdAt: at(addDays(today, -26), 11, 30), blocks: { "rt-wgr": 14, "rt-fcr": 8 } },
    { id: "GRP-0002", name: "Backwater Analytics annual conference", type: "conference", accountId: "AC-003", contactName: "Preethi Ishaan", contactPhone: "+91 9847054321", contactEmail: "events@example.com", from: addDays(today, 46), to: addDays(today, 48), status: "tentative", cutOffDate: addDays(today, 30), ratePlanId: "rp-group", hallIds: ["ol-periyar"], salesPersonId: "u-farah", notes: "Two-day conference for 80 delegates in Periyar Hall. Rooming list expected before cut-off.", createdAt: at(addDays(today, -14), 15, 10), blocks: { "rt-wgr": 20, "rt-fcr": 15 } },
  ];
  /** @type {any[]} */ const groupBlocks = [];
  for (const g of groups) {
    for (const [rt, n] of Object.entries(g.blocks)) {
      for (const d of dateRange(g.from, g.to)) {
        groupBlocks.push({ id: `${g.id}|${rt}|${d}`, groupId: g.id, roomTypeId: rt, date: d, rooms: n, released: 0 });
        blockLeft.set(`${g.id}|${rt}|${d}`, n);
        unpicked.set(`${rt}|${d}`, (unpicked.get(`${rt}|${d}`) ?? 0) + n);
      }
    }
  }

  /* ───────── room assignment ───────── */
  const freeRoomFor = (/** @type {string} */ rt, /** @type {string[]} */ dates) => {
    const candidates = rooms.filter((r) => r.roomTypeId === rt && dates.every((d) => !busy.get(r.id)?.has(d)));
    return candidates.length ? rng.pick(candidates) : null;
  };

  /* ───────── helpers for guests / accounts ───────── */
  const guestPool = guests.filter((g) => !g.blacklisted);
  const companies = accounts.filter((a) => a.type === "company" && a.status === "active");
  const agents = accounts.filter((a) => a.type === "travel-agent" && a.status === "active");
  const pickGuest = () => rng.pick(guestPool);

  const SOURCE_WEIGHTS = /** @type {Array<[string, number]>} */ ([["src-app", 14], ["src-website", 10], ["src-booking", 12], ["src-agoda", 6], ["src-expedia", 3], ["src-mmt", 9], ["src-eamt", 3], ["src-trip", 2], ["src-phone", 10], ["src-email", 5], ["src-whatsapp", 6], ["src-agent", 8], ["src-company", 8], ["src-walkin", 4]]);

  /** @type {Draft[]} */
  const drafts = [];
  let linePlanBias = 0;
  void linePlanBias;

  /**
   * Try to place one booking. Returns the draft, or null when there is no room.
   * @param {{ arrival: string, nights: number, status: string, assign: "must" | "try" | "no", sourceId?: string, groupId?: string, lines?: number, forceType?: string, guest?: any, createdAt?: string }} s
   */
  function place(s) {
    const departure = addDays(s.arrival, s.nights);
    const dates = dateRange(s.arrival, departure);
    const usesRoom = !["cancelled", "no-show"].includes(s.status);
    const group = s.groupId ? groups.find((g) => g.id === s.groupId) : undefined;

    // --- what is booked ---
    const sourceId = s.sourceId ?? (group ? "src-email" : rng.weighted(SOURCE_WEIGHTS));
    const source = sourcesById.get(sourceId);
    const lineCount = s.lines ?? rng.weighted([[1, 82], [2, 13], [3, 5]]);
    /** @type {Line[]} */
    const lines = [];
    for (let i = 0; i < lineCount; i++) {
      const rt = s.forceType ?? (i > 0 && rng.chance(0.7) ? lines[0].rt : rng.weighted([["rt-wgr", 50], ["rt-fcr", 38], ["rt-fcs", 9], ["rt-fps", 3]]));
      const adults = rng.weighted([[1, 20], [2, 62], [3, 14], [4, 4]]);
      const kids = rng.chance(0.2) ? rng.int(1, 2) : 0;
      const childAges = Array.from({ length: kids }, () => rng.int(2, 14));
      const t = typeById.get(rt);
      const problems = validateStay({ arrival: s.arrival, departure, adults, childAges, extraBed: false }, t, params, today);
      delete problems.arrival; // past stays are fine for history
      const ok = Object.keys(problems).length === 0;
      const finalAdults = ok ? adults : 2;
      const finalKids = ok ? childAges : [];
      const persons = finalAdults + finalKids.filter((a) => a > params.childFreeMaxAge).length;
      lines.push({ rt, adults: finalAdults, childAges: finalKids, extraBed: persons >= 3 && t.extraBedAllowed && rng.chance(0.7), roomId: null });
    }
    if (group) { for (const l of lines) l.rt = rng.pick(Object.keys(group.blocks)); }

    // --- capacity ---
    if (usesRoom) {
      /** @type {Map<string, number>} */ const need = new Map();
      for (const l of lines) need.set(l.rt, (need.get(l.rt) ?? 0) + 1);
      for (const [rt, n] of need) {
        for (const d of dates) {
          if (group) { if ((blockLeft.get(`${group.id}|${rt}|${d}`) ?? 0) < n) return null; }
          else if (free(rt, d) < n) return null;
        }
      }
      // rooms (must have one free room for every night; "try" leaves it empty when none is free)
      if (s.assign !== "no") {
        /** @type {Set<string>} */ const taken = new Set();
        for (const l of lines) {
          const candidates = rooms.filter((r) => r.roomTypeId === l.rt && !taken.has(r.id) && dates.every((d) => !busy.get(r.id)?.has(d)));
          if (candidates.length) { const r = rng.pick(candidates); l.roomId = r.id; taken.add(r.id); }
          else if (s.assign === "must") return null;
        }
      }
      // take the rooms
      for (const l of lines) {
        for (const d of dates) {
          sold.set(`${l.rt}|${d}`, (sold.get(`${l.rt}|${d}`) ?? 0) + 1);
          if (group) {
            const k = `${group.id}|${l.rt}|${d}`;
            blockLeft.set(k, (blockLeft.get(k) ?? 0) - 1);
            unpicked.set(`${l.rt}|${d}`, (unpicked.get(`${l.rt}|${d}`) ?? 0) - 1);
          }
          if (l.roomId) busy.get(l.roomId)?.add(d);
        }
      }
    }

    // --- who, how, which plan ---
    const guest = s.guest ?? pickGuest();
    /** @type {any} */ let account = null;
    let planId = "rp-bar-cp";
    let segmentId = "seg-leisure";
    let billTo = "guest";
    let guarantee = "none";
    let channelId, externalRef, locked = false;
    if (source?.type === "ota" || source?.type === "brand") {
      channelId = source.channelId;
      externalRef = source.type === "ota" ? `${source.code.slice(0, 2)}-${rng.int(100000000, 999999999)}` : `MR-${rng.int(10000000, 99999999)}`;
      locked = true;
      segmentId = source.type === "ota" ? "seg-ota" : guest.clubTier ? "seg-club" : "seg-leisure";
      if (source.type === "brand" && guest.clubTier) planId = "rp-club";
      else planId = rng.weighted([["rp-bar-cp", 60], ["rp-bar-ep", 40]]);
      guarantee = "card";
    } else if (sourceId === "src-company") {
      account = rng.pick(companies); planId = "rp-corp"; segmentId = "seg-corporate"; billTo = "company"; guarantee = "company";
    } else if (sourceId === "src-agent") {
      account = rng.pick(agents); planId = "rp-agent"; segmentId = "seg-agent"; billTo = "agent"; guarantee = "agent";
    } else if (group) {
      planId = "rp-group"; segmentId = group.type === "wedding" ? "seg-wedding" : "seg-mice"; billTo = "company"; guarantee = "company";
      if (group.accountId) account = accounts.find((a) => a.id === group.accountId);
    } else {
      const lead = diffDays(String(s.createdAt ?? today).slice(0, 10), s.arrival);
      planId = rng.weighted([["rp-bar-cp", 52], ["rp-bar-ep", 14], ["rp-bar-map", 9], ["rp-bar-ap", 3], ["rp-adv15", lead >= 14 ? 12 : 0], ["rp-club", guest.clubTier ? 10 : 0]]);
      if (planId === "rp-club") segmentId = "seg-club";
      if (planId === "rp-adv15") guarantee = "advance";
    }
    const plan = plansById.get(planId);
    const partyState = account?.stateCode ?? (guest.gstin ? guest.gstin.slice(0, 2) : undefined);
    const discountPct = !group && !account && rng.chance(0.07) ? rng.pick([5, 5, 8, 10]) : 0;

    // --- price every night of every line ---
    /** @type {any[]} */ const nights = [];
    for (const [li, l] of lines.entries()) {
      for (const d of dates) {
        let p = priceNight(pctx, { roomTypeId: l.rt, ratePlanId: planId, date: d, adults: l.adults, childAges: l.childAges, extraBed: l.extraBed, discountPct, partyStateCode: partyState });
        if (!p) p = /** @type {any} */ (priceNight(pctx, { roomTypeId: l.rt, ratePlanId: "rp-bar-cp", date: d, adults: l.adults, childAges: l.childAges, extraBed: l.extraBed, discountPct, partyStateCode: partyState }));
        nights.push({ line: li, date: d, price: p });
      }
    }

    // --- add-ons ---
    /** @type {any[]} */ const addOns = [];
    const persons = lines.reduce((n, l) => n + l.adults + l.childAges.filter((a) => a > params.childFreeMaxAge).length, 0);
    const addOn = (/** @type {string} */ id, /** @type {string} */ date, /** @type {number} */ qty, /** @type {number | undefined} */ li) => {
      const a = M.addOns.find((x) => x.id === id);
      addOns.push({ addOnId: id, date, quantity: qty, unitPrice: a.price, total: a.price * qty, taxPct: a.taxPct, line: li });
    };
    if (plan?.mealPlanId === "mp-ep" && rng.chance(0.3)) addOn("ao-breakfast", s.arrival, persons * Math.min(s.nights, 3), 0);
    if (rng.chance(0.18)) addOn("ao-transfer", s.arrival, rng.int(1, 2), undefined);
    if (rng.chance(0.08) && s.arrival.slice(5, 7) >= "10" || s.arrival.slice(5, 7) <= "03") { if (rng.chance(0.1)) addOn("ao-seafood", addDays(s.arrival, 1), Math.min(persons, 2), undefined); }
    if (rng.chance(0.05)) addOn("ao-ayur", addDays(s.arrival, 1), Math.min(persons, 2), undefined);
    if (rng.chance(0.06)) addOn("ao-cake", addDays(s.arrival, Math.min(1, s.nights - 1)), 1, undefined);
    for (const [li, l] of lines.entries()) if (l.extraBed && rng.chance(0.2)) void li;

    // --- requests, notes, sharers, billing, attachments ---
    const requests = rng.chance(0.3) ? rng.sample(M.specialRequestCodes, rng.int(1, 2)).map((c) => ({ codeId: c.id, department: c.department, notes: undefined })) : [];
    const notes = rng.chance(0.12) ? [{ kind: rng.pick(["guest", "internal"]), text: rng.pick(["Guest prefers a ground-floor room if possible.", "Arriving by the late flight – keep dinner available.", "Celebrating a wedding anniversary.", "Please keep the invoice in the company name.", "Guest is a regular – greet by name.", "Airport pick-up arranged by the guest."]) }] : [];
    const sharers = lines.flatMap((l, li) => (l.adults >= 2 && rng.chance(0.45) ? [{ line: li, name: `${rng.pick(["Anu", "Meena", "Sajan", "Reshma", "Alex", "Divya", "Joby"])} ${guest.lastName}`, relation: rng.pick(["Spouse", "Partner", "Friend", "Colleague"]) }] : []));
    const billing = billTo === "guest" ? [] : [{ window: 1, payerType: billTo, accountId: account?.id, charges: ["room", "tax"] }, { window: 2, payerType: "guest", charges: ["food", "extras"] }];
    const attachments = rng.chance(0.04) ? [{ name: rng.pick(["Booking-voucher.pdf", "Company-authorisation.pdf", "Passport-copy.pdf"]), type: "application/pdf", sizeKb: rng.int(80, 900) }] : [];

    const draft = /** @type {Draft} */ ({
      status: s.status, arrival: s.arrival, departure, lines, nights, addOns, payments: [], requests, notes, sharers, billing, messages: [], attachments, createdAt: s.createdAt ?? at(today),
      head: { sourceId, segmentId, channelId, externalRef, accountId: account?.id, billTo, guestId: guest.id, ratePlanId: planId, mealPlanId: plan?.mealPlanId, guaranteeType: guarantee, locked, groupId: s.groupId, vip: !!guest.vipLevelId, discountPct, groupName: group?.name },
    });
    drafts.push(draft);
    return draft;
  }

  /* ───────── helpers: created time, lead time ───────── */
  const createdFor = (/** @type {string} */ arrival, /** @type {boolean} */ pastArrival) => {
    const lead = rng.weighted([[rng.int(1, 3), 20], [rng.int(4, 14), 35], [rng.int(15, 45), 30], [rng.int(46, 110), 15]]);
    let day = addDays(arrival, -lead);
    if (!pastArrival || day > today) day = day > today ? addDays(today, -rng.int(0, 12)) : day;
    if (day > today) day = today;
    if (day < addDays(today, -150)) day = addDays(today, -150);
    return at(day, rng.int(9, 20), rng.int(0, 59));
  };

  /* ───────── phase 1: group members ───────── */
  for (const g of groups) {
    const members = g.id === "GRP-0001" ? 12 : 18;
    for (let i = 0; i < members; i++) {
      const lateArrival = rng.chance(0.25);
      const arrival = lateArrival ? addDays(g.from, 1) : g.from;
      const nights = diffDays(arrival, g.to);
      place({ arrival, nights, status: "confirmed", assign: "no", sourceId: "src-email", groupId: g.id, lines: 1, createdAt: createdFor(g.from, false) });
    }
  }

  /* ───────── phase 2: in-house (checked in), not leaving today ───────── */
  let inHouseLines = 0;
  for (let guard = 0; guard < 400 && inHouseLines < 48; guard++) {
    const back = rng.int(1, 5);
    const stayMore = rng.int(1, 4);
    const d = place({ arrival: addDays(today, -back), nights: back + stayMore, status: "checked-in", assign: "must", sourceId: rng.chance(0.08) ? "src-walkin" : undefined, createdAt: createdFor(addDays(today, -back), true) });
    if (d) inHouseLines += d.lines.length;
  }
  /* ───────── phase 3: departing today (still checked in until 12:00) ───────── */
  let departingLines = 0;
  for (let guard = 0; guard < 300 && departingLines < 12; guard++) {
    const nights = rng.int(1, 4);
    const d = place({ arrival: addDays(today, -nights), nights, status: "checked-in", assign: "must", createdAt: createdFor(addDays(today, -nights), true) });
    if (d) departingLines += d.lines.length;
  }
  /* ───────── phase 4: arriving today (18 reservations) ───────── */
  let arrivalsToday = 0;
  for (let guard = 0; guard < 300 && arrivalsToday < 18; guard++) {
    const status = rng.weighted([["guaranteed", 45], ["confirmed", 40], ["tentative", 15]]);
    const d = place({ arrival: today, nights: rng.int(1, 5), status, assign: rng.chance(0.6) ? "try" : "no", createdAt: createdFor(today, false) });
    if (d) arrivalsToday++;
  }
  /* ───────── phase 5: past stays (departed) ───────── */
  let pastCount = 0;
  for (let guard = 0; guard < 600 && pastCount < 45; guard++) {
    const nights = rng.int(1, 5);
    const arrival = addDays(today, -rng.int(nights + 1, 32));
    const d = place({ arrival, nights, status: "checked-out", assign: "must", createdAt: createdFor(arrival, true) });
    if (d) pastCount++;
  }
  /* ───────── phase 6: future bookings with seasonal weights ───────── */
  let futureCount = 0;
  for (let guard = 0; guard < 1500 && futureCount < 85; guard++) {
    const arrival = addDays(today, rng.int(1, 95));
    const weight = dateFactor(arrival, aux.dateCtx);
    if (!rng.chance(Math.min(1, weight / 1.3))) continue;
    const status = rng.weighted([["confirmed", 40], ["guaranteed", 40], ["tentative", 20]]);
    const near = diffDays(today, arrival) <= 3;
    const d = place({ arrival, nights: rng.weighted([[1, 15], [2, 35], [3, 25], [4, 12], [5, 7], [7, 4], [10, 2]]), status, assign: near && rng.chance(0.6) ? "try" : "no", createdAt: createdFor(arrival, false) });
    if (d) futureCount++;
  }
  /* ───────── phase 7: sold-out suites (waitlist demo): fill Deluxe Suite and the Premium Suite ───────── */
  const soldOutFrom = addDays(today, 12);
  for (let guard = 0; guard < 12; guard++) {
    if (!place({ arrival: soldOutFrom, nights: 3, status: "guaranteed", assign: "no", forceType: "rt-fcs", lines: 1, sourceId: guard % 3 === 0 ? "src-app" : undefined, createdAt: createdFor(soldOutFrom, false) })) break;
  }
  place({ arrival: soldOutFrom, nights: 3, status: "guaranteed", assign: "no", forceType: "rt-fps", lines: 1, sourceId: "src-website", createdAt: createdFor(soldOutFrom, false) });
  // make sure each of those nights is completely sold out for both suite types (single-night bookings fill any gaps)
  for (const rt of ["rt-fcs", "rt-fps"]) {
    for (let k = 0; k < 3; k++) {
      const night = addDays(soldOutFrom, k);
      for (let guard = 0; guard < 6 && free(rt, night) > 0; guard++) place({ arrival: night, nights: 1, status: "guaranteed", assign: "no", forceType: rt, lines: 1, sourceId: "src-phone", createdAt: createdFor(night, false) });
    }
  }
  /* ───────── phase 8: cancelled and no-show (do not use rooms) ───────── */
  for (let i = 0; i < 12; i++) {
    const future = i % 3 !== 0;
    const nights = rng.int(1, 4);
    const arrival = future ? addDays(today, rng.int(2, 60)) : addDays(today, -rng.int(nights + 1, 28));
    place({ arrival, nights, status: "cancelled", assign: "no", createdAt: createdFor(arrival, !future) });
  }
  for (let i = 0; i < 5; i++) {
    const nights = rng.int(1, 3);
    const arrival = addDays(today, -rng.int(nights + 1, 20));
    place({ arrival, nights, status: "no-show", assign: "no", createdAt: createdFor(arrival, true) });
  }

  /* ───────── number the bookings in creation order ───────── */
  drafts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  drafts.forEach((d, i) => { d.head.number = `FK-${10001 + i}`; });
  /** @type {Map<string, any>} */ const byNumber = new Map(drafts.map((d) => [d.head.number, d]));
  void byNumber;

  /* ───────── build the rows ───────── */
  /** @type {Record<string, any[]>} */
  const out = { reservations: [], reservationRooms: [], reservationNights: [], sharers: [], billingInstructions: [], reservationAddOns: [], specialRequests: [], notes: [], attachments: [], payments: [], paymentLinks: [], refunds: [], cancellations: [], messageLogs: [], auditLog: [] };
  const cancelReasons = M.reasonCodes.filter((r) => r.type === "cancellation");
  const noShowReason = M.reasonCodes.find((r) => r.type === "no-show");
  const refundReason = M.reasonCodes.find((r) => r.code === "CANCELLED" && r.type === "refund");
  const mode = (/** @type {string} */ id) => id;
  const users = ["u-anita", "u-rahul", "u-sneha", "u-thomas"];
  let paySeq = 0, linkSeq = 0, msgSeq = 0, refSeq = 0, noteSeq = 0, auditSeq = 0, forcedRefunds = 0;
  const audit = (/** @type {string} */ when, /** @type {string} */ userId, /** @type {string} */ entity, /** @type {string} */ entityId, /** @type {string} */ action, /** @type {any[]} */ changes, /** @type {string | undefined} */ note) => {
    const row = { id: `AU-${pad(++auditSeq, 6)}`, at: when, userId, entity, entityId, action, changes, note };
    if (!note) delete row.note;
    out.auditLog.push(row);
  };

  for (const d of drafts) {
    const num = d.head.number;
    const h = d.head;
    const channelBooking = !!h.channelId;
    const creator = channelBooking ? "u-system" : rng.pick(users);
    const createdAt = d.createdAt;

    // lines and nights
    const lineIds = d.lines.map((_, i) => `${num}-L${i + 1}`);
    d.lines.forEach((l, i) => {
      out.reservationRooms.push({ id: lineIds[i], reservationId: num, lineNo: i + 1, roomTypeId: l.rt, ...(l.roomId ? { roomId: l.roomId } : {}), adults: l.adults, children: l.childAges.length, childAges: l.childAges, ratePlanId: h.ratePlanId, mealPlanId: h.mealPlanId, extraBed: l.extraBed, discountPct: h.discountPct });
    });
    let subtotal = 0, taxTotal = 0;
    for (const n of d.nights) {
      const p = n.price;
      out.reservationNights.push({ id: `${lineIds[n.line]}|${n.date}`, reservationId: num, roomLineId: lineIds[n.line], date: n.date, roomTypeId: d.lines[n.line].rt, baseRate: p.baseRate, extras: p.extras, discount: p.discount, net: p.net, taxPct: p.taxPct, tax: p.tax.total, total: p.total, overridden: p.overridden });
      subtotal += p.net; taxTotal += p.tax.total;
    }
    d.addOns.forEach((a, k) => {
      const tax = percentOf(a.total, a.taxPct);
      out.reservationAddOns.push({ id: `${num}-AO${k + 1}`, reservationId: num, ...(a.line !== undefined ? { roomLineId: lineIds[a.line] } : {}), addOnId: a.addOnId, date: a.date, quantity: a.quantity, unitPrice: a.unitPrice, total: a.total, taxPct: a.taxPct, status: a.date <= today ? "posted" : "planned" });
      subtotal += a.total; taxTotal += tax;
    });
    d.requests.forEach((r, k) => out.specialRequests.push({ id: `${num}-SR${k + 1}`, reservationId: num, codeId: r.codeId, department: r.department, status: d.arrival < today ? "done" : "open" }));
    d.notes.forEach((n) => out.notes.push({ id: `NT-${pad(++noteSeq, 5)}`, reservationId: num, kind: n.kind, text: n.text, createdBy: creator === "u-system" ? "u-anita" : creator, createdAt }));
    d.sharers.forEach((s, k) => out.sharers.push({ id: `${num}-SH${k + 1}`, reservationId: num, roomLineId: lineIds[s.line], name: s.name, relation: s.relation }));
    d.billing.forEach((b, k) => out.billingInstructions.push({ id: `${num}-BI${k + 1}`, reservationId: num, window: b.window, payerType: b.payerType, ...(b.accountId ? { accountId: b.accountId } : {}), charges: b.charges }));
    d.attachments.forEach((a, k) => out.attachments.push({ id: `${num}-AT${k + 1}`, reservationId: num, name: a.name, type: a.type, sizeKb: a.sizeKb, uploadedBy: creator === "u-system" ? "u-anita" : creator, at: createdAt }));

    const grand = subtotal + taxTotal;
    const firstNight = d.nights.filter((n) => n.line === 0)[0]?.price.total ?? 0;
    const plan = plansById.get(h.ratePlanId);
    const isNonRef = plan?.cancellationPolicyId === "cp-nr";
    const creditBilling = h.billTo !== "guest";
    const payMode = () => rng.weighted([["pm-card", 35], ["pm-upi", 40], ["pm-link", 15], ["pm-bank", 5], ["pm-cash", 5]]);
    const addPay = (/** @type {string} */ kind, /** @type {number} */ amount, /** @type {string} */ when, /** @type {string} */ modeId, /** @type {string} */ by) => {
      if (amount <= 0) return;
      d.payments.push({ kind, amount, at: when, modeId: mode(modeId), by, ref: modeId === "pm-cash" ? undefined : `${modeId === "pm-upi" ? "UPI" : modeId === "pm-card" ? "TXN" : modeId === "pm-bank" ? "NEFT" : "PL"}${rng.int(100000000, 999999999)}` });
    };

    let status = h.status ?? d.status;
    const arrival = d.arrival;
    const stayDays = dateRange(d.arrival, d.departure);
    void stayDays;
    const advanceDue = isNonRef ? grand : Math.min(grand, Math.round(firstNight / 100) * 100);
    const payTime = (/** @type {number} */ afterHours) => {
      const base = Date.parse(createdAt) + afterHours * 3600000;
      const limit = Date.parse(at(today, 23, 0));
      return new Date(Math.min(base, limit)).toISOString();
    };
    const iso = (/** @type {string} */ t) => at(t.slice(0, 10), Number(t.slice(11, 13)), Number(t.slice(14, 16)));
    void iso;
    const ist = (/** @type {number} */ ms) => {
      const dt = new Date(ms + 330 * 60000); // shift to IST for the text
      return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:00+05:30`;
    };
    const stamp = (/** @type {number} */ hours) => ist(Date.parse(createdAt) + Math.min(hours * 3600000, Date.parse(at(today, 23, 0)) - Date.parse(createdAt)));

    // payments by status
    if (status === "checked-out") {
      if (creditBilling) addPay("balance", grand, at(d.departure, 11, 20), "pm-credit", "u-george");
      else {
        const adv = rng.chance(0.55) ? advanceDue : 0;
        addPay("advance", adv, stamp(2), payMode(), creator);
        addPay("balance", grand - adv, at(d.departure, 11, rng.int(0, 50)), payMode(), "u-thomas");
      }
    } else if (status === "checked-in") {
      if (!creditBilling && !channelBooking && rng.chance(0.5)) addPay("advance", advanceDue, stamp(3), payMode(), creator);
      if (channelBooking && h.sourceId !== "src-app" && rng.chance(0.4)) addPay("advance", grand, stamp(1), "pm-ota", "u-system");
    } else if (status === "guaranteed") {
      if (h.guaranteeType === "advance" || (!creditBilling && !channelBooking)) { addPay("advance", advanceDue, stamp(rng.int(1, 30)), payMode(), creator); h.guaranteeType = "advance"; }
      else if (channelBooking && rng.chance(0.5)) addPay("advance", grand, stamp(1), h.sourceId === "src-app" ? "pm-corpprepaid" : "pm-ota", "u-system");
      else if (!creditBilling) h.guaranteeType = "card";
    } else if (status === "confirmed") {
      h.guaranteeType = creditBilling ? h.guaranteeType : "none";
      if (channelBooking && rng.chance(0.3)) { addPay("advance", grand, stamp(1), "pm-ota", "u-system"); status = "guaranteed"; h.guaranteeType = "card"; }
    } else if (status === "tentative") {
      h.guaranteeType = "none";
    }
    // status ⇒ guarantee rule: guaranteed needs a guarantee
    if (status === "guaranteed" && h.guaranteeType === "none") h.guaranteeType = "card";
    if (status === "confirmed" && creditBilling) status = "guaranteed";

    // cancellation / no-show records
    let penalty = 0;
    let cancellationId;
    if (status === "cancelled" || status === "no-show") {
      // the first few cancellations with a normal guest are made early and had an advance, so the refund / approval demo always exists
      const canRefund = !creditBilling && !channelBooking && status === "cancelled" && advanceDue > 0;
      const forced = canRefund && forcedRefunds < 6;
      if (forced) forcedRefunds++;
      const policy = forced ? M.cancellationPolicies[0] : M.cancellationPolicies.find((c) => c.id === plan?.cancellationPolicyId) ?? M.cancellationPolicies[0];
      const latestCancel = Math.min(Date.parse(at(addDays(today, -rng.int(0, 3)), 12, 0)), Date.parse(at(d.arrival, 8, 0)) - (forced ? 5 : rng.int(0, 7)) * 86400000);
      const cancelAt = status === "no-show" ? at(d.arrival, 23, 30) : ist(Math.max(latestCancel, Date.parse(createdAt) + 2 * 3600000)); // never before the booking was made
      const hoursBefore = (Date.parse(at(d.arrival, 15, 0)) - Date.parse(cancelAt)) / 3600000;
      const nightRate = d.nights.filter((n) => n.line === 0)[0]?.price.total ?? 0;
      const fullStay = grand;
      const rule = status === "no-show" ? { penaltyType: policy.noShowPenalty.type, penaltyValue: policy.noShowPenalty.value } : policy.rules.slice().sort((a, b) => b.minHoursBefore - a.minHoursBefore).find((r) => hoursBefore >= r.minHoursBefore) ?? policy.rules.at(-1);
      const t = rule.penaltyType ?? rule.type;
      penalty = t === "nights" ? nightRate * rule.penaltyValue * d.lines.length : t === "percent" ? percentOf(fullStay, rule.penaltyValue) : t === "amount" ? rule.penaltyValue : 0;
      penalty = Math.min(penalty, fullStay);
      cancellationId = `CN-${num.slice(3)}`;
      // guests who had paid an advance
      if (canRefund && (forced || rng.chance(0.55))) addPay("advance", advanceDue, stamp(rng.int(1, 24)), payMode(), creator);
      const paidSoFar = d.payments.reduce((s, p) => s + p.amount, 0);
      out.cancellations.push({ id: cancellationId, reservationId: num, at: cancelAt, byUserId: status === "no-show" ? "u-system" : rng.pick(users), reasonId: status === "no-show" ? noShowReason.id : rng.pick(cancelReasons).id, policyId: policy.id, penalty, refundDue: Math.max(0, paidSoFar - penalty), waived: false, ...(status === "no-show" ? { notes: "Marked as no-show at night audit" } : {}) });
      d.cancelAt = cancelAt;
    }

    // payment rows
    let received = 0;
    d.payments.forEach((p) => {
      received += p.amount;
      const row = { id: `PAY-${pad(++paySeq, 5)}`, reservationId: num, kind: p.kind, amount: p.amount, modeId: p.modeId, status: "received", ...(p.ref ? { reference: p.ref } : {}), receivedAt: p.at, receivedBy: p.by, currencyCode: "INR" };
      out.payments.push(row);
    });

    // refund after cancellation (paid → refund due)
    let refunded = 0;
    if (cancellationId) {
      const c = out.cancellations.find((x) => x.id === cancellationId);
      const due = Math.max(0, received - penalty);
      if (due > 0 && c) {
        const paidOut = rng.chance(0.6);
        out.refunds.push({ id: `RF-${pad(++refSeq, 4)}`, reservationId: num, amount: due, modeId: "pm-upi", status: paidOut ? "paid" : "pending-approval", reasonId: refundReason.id, at: ist(Math.min(Date.parse(c.at) + 86400000, Date.parse(at(today, 22, 0)))), _pending: !paidOut });
        if (paidOut) refunded = due;
      }
    }

    // totals
    let totalAmount = grand;
    let sub = subtotal, tax = taxTotal;
    if (status === "cancelled" || status === "no-show") { totalAmount = penalty; sub = penalty; tax = 0; }
    const paid = received - refunded;

    // payment links for tentative / confirmed with advance pending
    if (["tentative", "confirmed"].includes(status) && diffDays(today, d.arrival) >= 0 && rng.chance(0.4) && !creditBilling) {
      const g = guests.find((x) => x.id === h.guestId);
      const sent = stamp(rng.int(2, 40));
      const paidLink = false;
      out.paymentLinks.push({ id: `PL-${pad(++linkSeq, 4)}`, reservationId: num, amount: advanceDue, status: paidLink ? "paid" : "sent", url: `https://pay.avivkochi.example/l/${num.toLowerCase()}`, sentTo: g.phone, channel: "whatsapp", createdAt: sent, expiresAt: ist(Date.parse(sent) + 86400000) });
    }

    const updatedAt = status === "checked-out" ? at(d.departure, 11, 30) : status === "checked-in" ? at(d.arrival, 14, 30) : d.cancelAt ?? createdAt;
    const reservation = {
      id: num, number: num, status, guaranteeType: h.guaranteeType, sourceId: h.sourceId, segmentId: h.segmentId, ...(h.channelId ? { channelId: h.channelId } : {}), ...(h.externalRef ? { externalRef: h.externalRef } : {}),
      ...(h.accountId ? { accountId: h.accountId } : {}), billTo: h.billTo, guestId: h.guestId, arrival: d.arrival, departure: d.departure, nights: diffDays(d.arrival, d.departure), roomCount: d.lines.length,
      adults: d.lines.reduce((n, l) => n + l.adults, 0), children: d.lines.reduce((n, l) => n + l.childAges.length, 0), ratePlanId: h.ratePlanId, mealPlanId: h.mealPlanId,
      subtotal: sub, taxTotal: tax, total: totalAmount, paid, balance: totalAmount - paid,
      ...(status === "tentative" ? { optionDate: addDays(d.arrival, -Math.max(1, Math.min(params.defaultOptionDays, diffDays(today, d.arrival)))) } : {}),
      ...(h.groupId ? { groupId: h.groupId } : {}), vip: h.vip, locked: h.locked, ...(d.notes[0] && d.notes[0].kind === "internal" ? {} : {}),
      specialRequestIds: d.requests.map((r) => r.codeId), preferenceIds: [], createdAt, createdBy: creator, updatedAt, ...(d.cancelAt ? { cancelledAt: d.cancelAt, cancellationId } : {}),
    };
    // option dates in the past are moved to today so "expiring" lists are meaningful
    if (reservation.optionDate && reservation.optionDate < today) reservation.optionDate = today;
    out.reservations.push(reservation);

    // audit entries
    audit(createdAt, creator, "reservations", num, "create", [{ field: "status", old: null, new: "tentative" === status ? "tentative" : "confirmed" }], channelBooking ? `Received from ${sourcesById.get(h.sourceId)?.name}` : undefined);
    if (status === "checked-in" || status === "checked-out") audit(at(d.arrival, 15, rng.int(0, 59)), "u-thomas", "reservations", num, "status", [{ field: "status", old: "guaranteed", new: "checked-in" }]);
    if (status === "checked-out") audit(at(d.departure, 11, 30), "u-thomas", "reservations", num, "status", [{ field: "status", old: "checked-in", new: "checked-out" }]);
    if (status === "cancelled" || status === "no-show") audit(d.cancelAt, status === "no-show" ? "u-system" : "u-anita", "reservations", num, "status", [{ field: "status", old: "confirmed", new: status }]);

    // messages
    const g = guests.find((x) => x.id === h.guestId);
    const msg = (/** @type {string} */ template, /** @type {string} */ channel, /** @type {string} */ when, /** @type {string} */ preview, /** @type {string | undefined} */ subject) => {
      const stateRoll = rng.weighted([["delivered", 55], ["read", 30], ["sent", 12], ["failed", 3]]);
      out.messageLogs.push({ id: `MSG-${pad(++msgSeq, 5)}`, reservationId: num, guestId: g.id, templateId: template, channel, to: channel === "email" ? g.email : g.phone, ...(subject ? { subject } : {}), preview, status: stateRoll, at: when });
    };
    if (status === "tentative") msg("mt-tent-e", "email", stamp(0.2), `Tentative booking ${num} – held until ${reservation.optionDate ?? ""}`, `Tentative booking ${num}`);
    else if (status !== "cancelled" && status !== "no-show") {
      if (rng.chance(0.8)) msg("mt-conf-e", "email", stamp(0.1), `Booking confirmed: ${num} · ${d.arrival} to ${d.departure}`, `Booking confirmed: ${num}`);
      if (rng.chance(0.55)) msg("mt-conf-w", "whatsapp", stamp(0.15), `Hello ${g.firstName}! Your stay ${num} is confirmed.`);
    } else if (status === "cancelled") msg("mt-cancel-e", "email", d.cancelAt, `Booking ${num} cancelled`, `Booking ${num} cancelled`);
    if (d.payments.length && !channelBooking && status !== "cancelled") msg("mt-receipt-e", "email", d.payments[0].at, `Receipt for ${num}`, "Receipt");
    if (d.arrival === addDays(today, 1) && !["cancelled", "no-show"].includes(status)) msg("mt-prearr-w", "whatsapp", at(today, 9, 0), `Welcome in advance, ${g.firstName}!`);
  }

  // continuous receipt numbers in time order (RC-<financial year>-<running number>)
  const fy = (() => {
    const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
    const s = m >= 4 ? y : y - 1;
    return `${pad(s % 100)}-${pad((s + 1) % 100)}`;
  })();
  const byTime = out.payments.slice().sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  byTime.forEach((p, i) => { p.receiptNo = `RC-${fy}-${pad(i + 1, 5)}`; });
  // refunds: drop helper flag
  for (const r of out.refunds) delete r._pending;

  // group payments (deposits taken at group level)
  out.payments.push(
    { id: `PAY-${pad(++paySeq, 5)}`, groupId: "GRP-0001", kind: "deposit", amount: rupees(250000), modeId: "pm-bank", status: "received", reference: "NEFT774120655", receivedAt: at(addDays(today, -20), 12, 15), receivedBy: "u-george", currencyCode: "INR", receiptNo: `RC-${fy}-${pad(out.payments.length + 1, 5)}`, notes: "25% deposit for the wedding block" },
  );

  return {
    collections: { groups: groups.map(({ blocks: _b, ...g }) => g), groupBlocks, outOfOrderPeriods, ...out },
    rooms, // statuses may have changed
    meta: { drafts: drafts.length, inHouseLines, departingLines, arrivalsToday },
  };
}

// @ts-check
/**
 * Global search (pure): bookings, guests, rooms, companies / agents and enquiries.
 * Every word you type must be found (start of a word scores higher than the middle); numbers match booking numbers,
 * phone numbers (digits only), room numbers and GSTINs.
 */
import { formatDate } from "../core/format.js";

/** @typedef {"booking" | "guest" | "room" | "account" | "enquiry"} Kind */
/** @typedef {{ kind: Kind, id: string, title: string, subtitle: string, status?: string, score: number }} Hit */

/** @param {string} s */
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
/** @param {string} s */
const digitsOf = (s) => s.replace(/\D/g, "");

/**
 * @param {string} q
 * @returns {{ raw: string, tokens: string[] }}
 */
export function parseQuery(q) {
  const raw = q.trim();
  return { raw, tokens: norm(raw).split(/[\s,]+/).filter(Boolean) };
}

/**
 * How well one word matches a piece of text: 0 = not at all, 3 = whole value, 2 = start of a word, 1 = inside.
 * @param {string} token
 * @param {string} text
 */
function matchLevel(token, text) {
  const t = norm(text);
  if (!t) return 0;
  if (t === token) return 3;
  if (t.startsWith(token) || t.split(/[\s\-/@.,]+/).some((w) => w.startsWith(token))) return 2;
  return t.includes(token) ? 1 : 0;
}

/**
 * Score a record: every token must match at least one field. Fields: [text, weight].
 * @param {string[]} tokens
 * @param {Array<[string | undefined, number]>} fields
 * @returns {number} 0 when a token is missing
 */
function scoreRecord(tokens, fields) {
  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const [text, weight] of fields) {
      if (!text) continue;
      const lvl = matchLevel(token, text);
      if (lvl) best = Math.max(best, lvl * weight);
      // phone numbers / booking digits: compare digits only
      if (/^\d{3,}$/.test(token) && digitsOf(text).includes(token)) best = Math.max(best, 2 * weight);
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}

/**
 * @param {{ reservations: any[], guests: any[], rooms: any[], roomTypes: any[], accounts: any[], enquiries: any[] }} data
 * @param {string} query
 * @param {{ perKind?: number }} [opts]
 * @returns {Record<Kind, Hit[]>}
 */
export function searchAll(data, query, opts = {}) {
  const { tokens, raw } = parseQuery(query);
  const cap = opts.perKind ?? 50;
  /** @type {Record<Kind, Hit[]>} */
  const out = { booking: [], guest: [], room: [], account: [], enquiry: [] };
  if (!tokens.length) return out;

  const guestById = new Map(data.guests.map((g) => [g.id, g]));
  const typeById = new Map(data.roomTypes.map((t) => [t.id, t]));
  const accountById = new Map(data.accounts.map((a) => [a.id, a]));
  const fullName = (/** @type {any} */ g) => (g ? `${g.title ? `${g.title} ` : ""}${g.firstName} ${g.lastName}` : "");

  // booking number typed in full or as digits only: exact match goes first
  const asNumber = /^(?:fk)?[-\s]?(\d{4,7})$/i.exec(raw);

  for (const r of data.reservations) {
    const g = guestById.get(r.guestId);
    const acc = r.accountId ? accountById.get(r.accountId) : undefined;
    let score = scoreRecord(tokens, [[r.number, 100], [r.externalRef, 90], [g ? `${g.firstName} ${g.lastName}` : "", 60], [g?.phone, 50], [g?.email, 30], [acc?.name, 40], [r.status, 5]]);
    if (asNumber && r.number === `FK-${asNumber[1]}`) score += 1000;
    if (!score) continue;
    out.booking.push({
      kind: "booking", id: r.id, title: `${r.number} · ${fullName(g)}`, status: r.status, score,
      subtitle: `${formatDate(r.arrival)} → ${formatDate(r.departure)} · ${r.roomCount} room${r.roomCount === 1 ? "" : "s"}${acc ? ` · ${acc.name}` : ""}`,
    });
  }
  for (const g of data.guests) {
    const score = scoreRecord(tokens, [[`${g.firstName} ${g.lastName}`, 70], [g.phone, 60], [g.email, 50], [g.clubNumber, 80], [g.companyName, 30], [g.address?.city, 10]]);
    if (!score) continue;
    out.guest.push({ kind: "guest", id: g.id, title: fullName(g), status: g.blacklisted ? "blacklisted" : g.vipLevelId ? "vip" : undefined, score, subtitle: `${g.stays} stay${g.stays === 1 ? "" : "s"} · ${g.phone ?? g.email ?? ""}${g.address?.city ? ` · ${g.address.city}` : ""}` });
  }
  for (const r of data.rooms) {
    const t = typeById.get(r.roomTypeId);
    const score = scoreRecord(tokens, [[r.number, 100], [t?.name, 30], [t?.code, 40], [`floor ${r.floor}`, 10], [r.view, 10]]);
    if (!score) continue;
    out.room.push({ kind: "room", id: r.id, title: `Room ${r.number}`, status: r.status, score, subtitle: `${t?.name ?? ""} · floor ${r.floor} · ${r.view} view` });
  }
  for (const a of data.accounts) {
    const score = scoreRecord(tokens, [[a.name, 70], [a.code, 80], [a.gstin, 90], [a.address?.city, 10], [a.contacts?.[0]?.name, 30]]);
    if (!score) continue;
    out.account.push({ kind: "account", id: a.id, title: a.name, status: a.status === "active" ? undefined : a.status, score, subtitle: `${a.type === "travel-agent" ? "Travel agent" : a.type === "company" ? "Company" : a.type} · ${a.address?.city ?? ""}${a.gstin ? ` · ${a.gstin}` : ""}` });
  }
  for (const e of data.enquiries) {
    const score = scoreRecord(tokens, [[e.number, 100], [e.guestName, 60], [e.phone, 50], [e.email, 30]]);
    if (!score) continue;
    out.enquiry.push({ kind: "enquiry", id: e.id, title: `${e.number} · ${e.guestName}`, status: e.status, score, subtitle: `${formatDate(e.from)} → ${formatDate(e.to)} · ${e.rooms} room${e.rooms === 1 ? "" : "s"}` });
  }
  for (const k of /** @type {Kind[]} */ (Object.keys(out))) out[k] = out[k].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, cap);
  return out;
}

/**
 * Split text into pieces so the matching words can be highlighted.
 * @param {string} text
 * @param {string[]} tokens normalised query words (see parseQuery)
 * @returns {Array<{ text: string, match: boolean }>}
 */
export function highlightParts(text, tokens) {
  const words = tokens.filter((t) => t.length > 0).map(escapeRegex);
  if (!words.length) return [{ text, match: false }];
  const split = new RegExp(`(${words.join("|")})`, "gi");
  const whole = new RegExp(`^(?:${words.join("|")})$`, "i");
  return text.split(split).filter((p) => p !== "").map((p) => ({ text: p, match: whole.test(p) }));
}

/** @param {string} t */
const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

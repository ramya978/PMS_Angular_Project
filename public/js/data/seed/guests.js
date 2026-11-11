// @ts-check
/**
 * Demo guests (400), companies / travel agents (30) and their contracts. All names are invented.
 * Phone numbers and emails use reserved demo formats (example.com / example domains) and are not real contacts.
 */
import { createRandom } from "../../core/random.js";
import { addDays, rupees } from "../../core/format.js";
import { makeGstin } from "../../domain/fieldrules.js";
import { at, pad } from "./helpers.js";

const MALAYALI_M = ["Arun", "Anil", "Biju", "Deepak", "Gopan", "Harikrishnan", "Jayan", "Kiran", "Manoj", "Nikhil", "Prakash", "Rajesh", "Sanjay", "Suresh", "Vishnu", "Abhilash", "Sreejith", "Unni", "Vivek", "Rahul", "Arjun", "Jithin", "Dileep", "Shibu"];
const MALAYALI_F = ["Anjali", "Divya", "Lakshmi", "Maya", "Neethu", "Parvathy", "Rekha", "Sreelakshmi", "Meera", "Sindhu", "Aswathy", "Athira", "Remya", "Deepthi", "Gayathri", "Anitha", "Sheela", "Nimisha"];
const MALAYALI_L = ["Nathan", "Mohan", "Prem", "Krish", "Pranav", "Vijay", "Nirav", "Ishaan", "Mathew", "Thomas", "Joseph", "George", "Varghese", "Kurian", "Abraham", "Philip", "Jacob", "Rahman", "Khan", "Dev", "Wilson", "Uday"];
const OTHER_M = ["Rohit", "Amit", "Sandeep", "Vikas", "Karthik", "Sunil", "Naveen", "Ravi", "Ajay", "Manish", "Rakesh", "Prasad", "Srinivas", "Ganesh", "Faisal", "Imran"];
const OTHER_F = ["Priya", "Neha", "Pooja", "Kavita", "Sunita", "Swathi", "Radhika", "Shruti", "Nandini", "Ayesha", "Farah", "Isha", "Ritu", "Jyoti"];
const OTHER_L = ["Sagar", "Vihaan", "Gautam", "Siddharth", "Pavan", "Sahil", "Manav", "Rishi", "Ranjan", "Neil", "Ivan", "Chirag", "Bijoy", "Kabir", "Mihir", "Dhruv", "Jatin", "Kunal", "Shaan", "Harsh"];
const FOREIGN = [
  ["US", "James", "Carter", "male"], ["US", "Emily", "Brooks", "female"], ["GB", "Oliver", "Hughes", "male"], ["GB", "Charlotte", "Fraser", "female"], ["DE", "Hans", "Mueller", "male"], ["DE", "Anna", "Schneider", "female"],
  ["FR", "Claire", "Dubois", "female"], ["FR", "Luc", "Moreau", "male"], ["AU", "Liam", "Walker", "male"], ["AU", "Olivia", "Clark", "female"], ["AE", "Omar", "Al Farsi", "male"], ["AE", "Fatima", "Al Mansoori", "female"],
  ["SG", "Wei", "Tan", "male"], ["SG", "Mei", "Lim", "female"], ["CA", "Ethan", "Anderson", "male"], ["NL", "Sophie", "de Vries", "female"], ["IT", "Marco", "Rossi", "male"], ["SE", "Elsa", "Lindberg", "female"],
  ["CH", "Lukas", "Keller", "male"], ["JP", "Yuki", "Tanaka", "female"], ["LK", "Nimal", "Perera", "male"], ["QA", "Khalid", "Al Thani", "male"], ["SA", "Noura", "Al Saud", "female"], ["RU", "Irina", "Petrova", "female"],
];
/** @type {Array<[string, string, string, string]>} city, state name, pin, GST state code */
const CITIES = [
  ["Kochi", "Kerala", "682001", "32"], ["Kochi", "Kerala", "682016", "32"], ["Thiruvananthapuram", "Kerala", "695001", "32"], ["Kozhikode", "Kerala", "673001", "32"], ["Thrissur", "Kerala", "680001", "32"],
  ["Kottayam", "Kerala", "686001", "32"], ["Bengaluru", "Karnataka", "560001", "29"], ["Chennai", "Tamil Nadu", "600001", "33"], ["Mumbai", "Maharashtra", "400001", "27"], ["Pune", "Maharashtra", "411001", "27"],
  ["New Delhi", "Delhi", "110001", "07"], ["Hyderabad", "Telangana", "500001", "36"], ["Kolkata", "West Bengal", "700001", "19"], ["Ahmedabad", "Gujarat", "380001", "24"], ["Coimbatore", "Tamil Nadu", "641001", "33"],
];

/**
 * @param {string} today
 */
export function buildGuests(today) {
  const rng = createRandom("aviv-guests-v1");
  /** @type {import("../../domain/models.js").GuestProfile[]} */
  const guests = [];
  const FOREIGN_CITY = /** @type {Record<string, string>} */ ({ US: "New York", GB: "London", DE: "Berlin", FR: "Paris", AU: "Sydney", AE: "Dubai", SG: "Singapore", CA: "Toronto", NL: "Amsterdam", IT: "Milan", SE: "Stockholm", CH: "Zurich", JP: "Tokyo", LK: "Colombo", QA: "Doha", SA: "Riyadh", RU: "Moscow" });
  const DIAL = /** @type {Record<string, string>} */ ({ IN: "+91", US: "+1", GB: "+44", DE: "+49", FR: "+33", AU: "+61", AE: "+971", SG: "+65", CA: "+1", NL: "+31", IT: "+39", SE: "+46", CH: "+41", JP: "+81", LK: "+94", QA: "+974", SA: "+966", RU: "+7" });
  const used = new Set();
  const tiers = /** @type {const} */ (["member", "silver", "gold", "platinum", "diamond", "signature"]);

  for (let i = 1; i <= 400; i++) {
    const foreign = rng.chance(0.22);
    let first, last, gender, country;
    if (foreign) {
      const [c, f, l, g] = rng.pick(FOREIGN);
      [country, first, last, gender] = [c, f, l, g];
    } else {
      country = "IN";
      const malayali = rng.chance(0.55);
      gender = rng.chance(0.5) ? "male" : "female";
      first = rng.pick(malayali ? (gender === "male" ? MALAYALI_M : MALAYALI_F) : gender === "male" ? OTHER_M : OTHER_F);
      last = rng.pick(malayali ? MALAYALI_L : OTHER_L);
    }
    const city = foreign ? [FOREIGN_CITY[country] ?? "Capital", "", "", ""] : rng.pick(CITIES);
    // avoid exact same full name twice (the duplicate-check demo is added deliberately below)
    let name = `${first} ${last}`;
    while (used.has(name)) name = `${first} ${last}${String.fromCharCode(65 + rng.int(0, 25))}`;
    used.add(name);
    const dial = DIAL[country] ?? "+44";
    const digits = foreign ? String(rng.int(700000000, 799999999)) : String(rng.int(6, 9) * 1000000000 + rng.int(10000000, 99999999));
    const stays = rng.weighted([[1, 55], [2, 22], [3, 10], [4, 6], [6, 4], [9, 3]]);
    const titleOf = gender === "male" ? "Mr" : rng.pick(["Ms", "Mrs", "Ms", "Dr"]);
    const emailName = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
    const tier = rng.chance(0.28) ? rng.weighted([[tiers[0], 40], [tiers[1], 20], [tiers[2], 20], [tiers[3], 12], [tiers[4], 6], [tiers[5], 2]]) : undefined;
    /** @type {import("../../domain/models.js").GuestProfile} */
    const g = {
      id: `GP-${pad(i, 4)}`, title: titleOf, firstName: first, lastName: last, gender, nationality: country,
      email: `${emailName}${i}@example.com`, phone: `${dial} ${digits}`,
      address: foreign ? { city: city[0], country } : { line1: `${rng.int(1, 120)}, ${rng.pick(["MG Road", "Lake View Road", "Temple Road", "Park Avenue", "Church Street", "Beach Road", "Station Road"])}`, city: city[0], state: city[1], pin: city[2], country },
      preferenceIds: rng.chance(0.35) ? rng.sample(["pf-highfloor", "pf-quiet", "pf-king", "pf-twin", "pf-nonsmoking", "pf-pillows", "pf-veg", "pf-early", "pf-late"], rng.int(1, 2)) : [],
      blacklisted: false, consent: { marketing: rng.chance(0.5), whatsapp: rng.chance(0.8), email: rng.chance(0.85), sms: rng.chance(0.4), dataProcessing: true },
      stays: 0, nights: 0, createdAt: at(addDays(today, -rng.int(5, 700)), rng.int(9, 18), rng.int(0, 59)),
    };
    if (tier) { g.clubTier = tier; g.clubNumber = `AC${rng.int(100000000, 999999999)}`; }
    if (rng.chance(0.5)) g.dateOfBirth = `${rng.int(1955, 2000)}-${pad(rng.int(1, 12))}-${pad(rng.int(1, 28))}`;
    void stays;
    guests.push(g);
  }

  // VIP flags
  const vipIds = [3, 17, 42, 58, 91, 120, 155, 203, 240, 311];
  vipIds.forEach((n, k) => { guests[n - 1].vipLevelId = ["vip-a", "vip-b", "vip-c", "vip-c", "vip-d", "vip-c", "vip-b", "vip-c", "vip-d", "vip-c"][k]; });
  // blacklist demo (3 guests)
  const blacklist = [[12, "Payment dispute – chargeback in the previous year"], [77, "Damage to room property"], [248, "Abusive behaviour towards staff"]];
  for (const [n, reason] of blacklist) { guests[Number(n) - 1].blacklisted = true; guests[Number(n) - 1].blacklistReason = String(reason); }
  // duplicate-check demo: the same person twice (same phone, similar name)
  const dupSource = guests[28];
  guests[299].firstName = dupSource.firstName;
  guests[299].lastName = dupSource.lastName.slice(0, -1) + (dupSource.lastName.endsWith("n") ? "m" : "n");
  guests[299].phone = dupSource.phone;
  guests[299].nationality = dupSource.nationality;
  guests[299].notes = "Possible duplicate of " + dupSource.id;
  return guests;
}

const ACCOUNT_SPECS = [
  // [name, type, stateCode, city, state, pin]
  ["Malabar Spice Exports Pvt Ltd", "company", "32", "Kochi", "Kerala", "682002"], ["Cochin Marine Services Ltd", "company", "32", "Kochi", "Kerala", "682003"],
  ["Periyar Infotech Solutions", "company", "32", "Kochi", "Kerala", "682030"], ["Willingdon Logistics LLP", "company", "32", "Kochi", "Kerala", "682003"],
  ["Backwater Analytics Pvt Ltd", "company", "32", "Kochi", "Kerala", "682042"], ["Kerala Heritage Foods Ltd", "company", "32", "Thrissur", "Kerala", "680001"],
  ["Ernakulam Pharma Distributors", "company", "32", "Kochi", "Kerala", "682011"], ["Arabian Sea Shipping Agency", "company", "32", "Kochi", "Kerala", "682009"],
  ["Spice Route Hospitality Consultants", "company", "29", "Bengaluru", "Karnataka", "560001"], ["TechPark Kochi Systems", "company", "32", "Kochi", "Kerala", "682037"],
  ["Sahyadri Textiles Ltd", "company", "29", "Bengaluru", "Karnataka", "560025"], ["Coir Craft Industries", "company", "32", "Alappuzha", "Kerala", "688001"],
  ["Vypin Engineering Works", "company", "33", "Chennai", "Tamil Nadu", "600032"], ["Thevara Motors Pvt Ltd", "company", "32", "Kochi", "Kerala", "682013"],
  ["Deccan Capital Advisors", "company", "27", "Mumbai", "Maharashtra", "400051"],
  ["Periyar Tours & Travels", "travel-agent", "32", "Kochi", "Kerala", "682016"], ["Backwater Holidays", "travel-agent", "32", "Alappuzha", "Kerala", "688001"],
  ["Kerala Trails Travel Co", "travel-agent", "32", "Kochi", "Kerala", "682018"], ["Spice Coast Journeys", "travel-agent", "32", "Kochi", "Kerala", "682001"],
  ["Heritage Routes Travel", "travel-agent", "29", "Bengaluru", "Karnataka", "560034"], ["Bluewave Travel Mart", "travel-agent", "33", "Chennai", "Tamil Nadu", "600017"],
  ["Munnar Mist Holidays", "travel-agent", "32", "Munnar", "Kerala", "685612"], ["Gateway Kochi Travels", "travel-agent", "32", "Kochi", "Kerala", "682016"],
  ["Sunrise Tours India", "travel-agent", "07", "New Delhi", "Delhi", "110001"], ["Fort Kochi Experiences", "travel-agent", "32", "Kochi", "Kerala", "682001"],
  ["Global Pathways DMC", "travel-agent", "27", "Mumbai", "Maharashtra", "400001"], ["Southern Skies Travel", "travel-agent", "36", "Hyderabad", "Telangana", "500081"],
  ["Kerala State Delegation Office", "government", "32", "Thiruvananthapuram", "Kerala", "695001"], ["Skyline Airways Crew Desk", "airline", "32", "Kochi", "Kerala", "683111"],
  ["Monsoon Escapes Travel", "travel-agent", "32", "Kozhikode", "Kerala", "673001"],
];

/**
 * @param {string} today
 * @returns {{ accounts: import("../../domain/models.js").Account[], contracts: import("../../domain/models.js").Contract[] }}
 */
export function buildAccounts(today) {
  const rng = createRandom("aviv-accounts-v1");
  const typeLetter = "CPHFATBLJG";
  /** @type {import("../../domain/models.js").Account[]} */
  const accounts = ACCOUNT_SPECS.map(([name, type, stateCode, city, state, pin], i) => {
    const letters = "ABCDEFGHJKLMNPRSTUVW";
    const pan = `${rng.pick(letters.split(""))}${rng.pick(letters.split(""))}${rng.pick(letters.split(""))}${type === "government" ? "G" : rng.pick(["C", "F", "C", "C"])}${name[0].toUpperCase()}${pad(rng.int(1000, 9999), 4)}${rng.pick(letters.split(""))}`;
    void typeLetter;
    const company = type === "company" || type === "airline" || type === "government";
    /** @type {import("../../domain/models.js").Account} */
    const a = {
      id: `AC-${pad(i + 1, 3)}`, code: `AC${pad(i + 1, 3)}`, name, type: /** @type {any} */ (type), gstin: makeGstin(stateCode, pan, 1), pan, stateCode,
      address: { line1: `${rng.int(1, 90)}/${rng.int(1, 12)}, ${rng.pick(["MG Road", "Marine Drive", "Palarivattom Junction", "Kaloor Road", "Edappally Bypass", "Church Landing Road"])}`, city, state, pin, country: "IN" },
      contacts: [{ name: `${rng.pick(["Ravi", "Suma", "Joseph", "Preethi", "Kabir", "Leena", "Anand"])} ${rng.pick(["Mohan", "Ishaan", "Thomas", "Vijay", "Nathan", "Ranjan"])}`, role: company ? "Travel desk" : "Reservations", email: `bookings${i + 1}@example.com`, phone: `+91 ${rng.int(6, 9) * 1000000000 + rng.int(10000000, 99999999)}` }],
      creditLimit: company ? rupees(rng.pick([100000, 250000, 500000, 750000, 1000000])) : rupees(rng.pick([0, 50000, 150000])), creditDays: company ? rng.pick([15, 30, 45]) : rng.pick([0, 15, 30]),
      status: "active", createdAt: at(addDays(today, -rng.int(60, 900)), 11, 0),
    };
    if (type === "travel-agent") { a.commissionPct = rng.pick([8, 10, 10, 12]); a.ratePlanId = "rp-agent"; }
    else if (type === "company") a.ratePlanId = "rp-corp";
    return a;
  });
  accounts[4].status = "on-hold"; // credit hold demo
  accounts[4].notes = "Credit on hold until outstanding invoice is cleared";
  accounts[20].status = "blacklisted";
  accounts[20].notes = "Unpaid commission disputes – do not book without manager approval";

  // contracts for the first 10 companies: one financial year
  const m = Number(today.slice(5, 7));
  const fyStart = `${m >= 4 ? today.slice(0, 4) : Number(today.slice(0, 4)) - 1}-04-01`;
  const fyEnd = `${Number(fyStart.slice(0, 4)) + 1}-03-31`;
  /** @type {import("../../domain/models.js").Contract[]} */
  const contracts = [];
  accounts.filter((a) => a.type === "company").slice(0, 10).forEach((a, i) => {
    if (i % 3 === 0) contracts.push({ id: `CT-${pad(i + 1, 3)}`, accountId: a.id, roomTypeId: "rt-fcr", ratePlanId: "rp-corp", fixedRate: rupees(6900), validFrom: fyStart, validTo: fyEnd, notes: "Fixed corporate rate for Pool Deluxe Room (CP)" });
    else contracts.push({ id: `CT-${pad(i + 1, 3)}`, accountId: a.id, ratePlanId: "rp-corp", discountPct: -[12, 14, 15, 18][i % 4], validFrom: fyStart, validTo: fyEnd, notes: "Negotiated discount on the best available rate" });
  });
  return { accounts, contracts };
}

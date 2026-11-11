// @ts-check
/**
 * Small fuzzy matcher for the command palette and comboboxes.
 * Letters must appear in order; matches at the start of a word or in a row score higher.
 * Punctuation and spaces are ignored, so "rs05" finds "RS-05 New Reservation".
 */

/** @param {string} s */
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * @param {string} query
 * @param {string} text
 * @returns {number} -1 when it does not match, otherwise higher = better
 */
export function fuzzyScore(query, text) {
  const q = norm(query);
  if (!q) return 0;
  const lower = text.toLowerCase();
  const flat = norm(text);
  if (!flat.includes(q[0])) return -1;

  // Exact / prefix / substring beat scattered letters
  if (flat === q) return 1000;
  if (flat.startsWith(q)) return 800 - flat.length;
  const at = flat.indexOf(q);
  if (at >= 0) {
    // bonus when the substring starts a word of the original text
    const wordStart = new RegExp(`(^|[^a-z0-9])${q.split("").join("[^a-z0-9]*")}`).test(lower);
    return (wordStart ? 600 : 400) - at - flat.length / 10;
  }

  // Subsequence
  let ti = 0;
  let score = 0;
  let streak = 0;
  for (const ch of q) {
    const found = flat.indexOf(ch, ti);
    if (found < 0) return -1;
    streak = found === ti ? streak + 1 : 0;
    score += 10 + streak * 5 - (found - ti);
    ti = found + 1;
  }
  return Math.max(1, score);
}

/**
 * @template T
 * @param {T[]} items
 * @param {string} query
 * @param {(item: T) => string} getText
 * @returns {T[]} best matches first (all items, in original order, when the query is empty)
 */
export function fuzzyFilter(items, query, getText) {
  if (!norm(query)) return items.slice();
  return items
    .map((item, i) => ({ item, i, score: fuzzyScore(query, getText(item)) }))
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((r) => r.item);
}

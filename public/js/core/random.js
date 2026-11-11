// @ts-check
/**
 * Seeded random numbers (mulberry32) – the demo data is generated with this so it is exactly the same every time.
 * No faker library, no Math.random().
 */

/**
 * @param {number | string} seed number, or any text (hashed to a number)
 */
export function createRandom(seed) {
  let a = typeof seed === "number" ? seed >>> 0 : hashString(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    /** Float in [0, 1). */
    next,
    /** Whole number from min to max, both included. @param {number} min @param {number} max */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /** True with the given probability (0–1). @param {number} p */
    chance: (p) => next() < p,
    /** One item of a list. @template T @param {readonly T[]} list @returns {T} */
    pick: (list) => list[Math.floor(next() * list.length)],
    /**
     * One item chosen by weight: [[item, weight], …].
     * @template T
     * @param {ReadonlyArray<readonly [T, number]>} table
     * @returns {T}
     */
    weighted(table) {
      const total = table.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [item, w] of table) {
        r -= w;
        if (r < 0) return item;
      }
      return table[table.length - 1][0];
    },
    /** New shuffled copy. @template T @param {readonly T[]} list @returns {T[]} */
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    /** `n` different items. @template T @param {readonly T[]} list @param {number} n @returns {T[]} */
    sample(list, n) {
      return this.shuffle(list).slice(0, n);
    },
  };
}

/** @typedef {ReturnType<typeof createRandom>} Random */

/** @param {string} s */
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

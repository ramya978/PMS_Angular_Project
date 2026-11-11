// @ts-check
/**
 * A tiny in-browser test runner (no libraries): test(), expect(), runAll(), renderReport().
 */

/** @typedef {{ name: string, fn: () => void | Promise<void>, group: string }} TestCase */
/** @typedef {{ name: string, group: string, ok: boolean, error?: string, ms: number }} TestResult */

/** @type {TestCase[]} */
const cases = [];
let currentGroup = "General";

/**
 * Group the tests defined inside `body`.
 * @param {string} name
 * @param {() => void} body
 */
export function describe(name, body) {
  const previous = currentGroup;
  currentGroup = name;
  body();
  currentGroup = previous;
}

/**
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
export function test(name, fn) {
  cases.push({ name, fn, group: currentGroup });
}

/** @param {any} v */
const show = (v) => {
  try {
    return typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
};

/**
 * @param {any} actual
 */
export function expect(actual) {
  /** @param {boolean} ok @param {string} msg */
  const check = (ok, msg) => {
    if (!ok) throw new Error(msg);
  };
  const api = {
    toBe: (/** @type {any} */ expected) => check(Object.is(actual, expected), `Expected ${show(actual)} to be ${show(expected)}`),
    toEqual: (/** @type {any} */ expected) => check(show(actual) === show(expected), `Expected ${show(actual)} to equal ${show(expected)}`),
    toBeTruthy: () => check(!!actual, `Expected ${show(actual)} to be truthy`),
    toBeFalsy: () => check(!actual, `Expected ${show(actual)} to be falsy`),
    /** Every field of `expected` must be equal in the actual object (extra fields are fine). */
    toMatchObject: (/** @type {Record<string, any>} */ expected) => {
      const diff = Object.keys(expected).filter((k) => show(actual?.[k]) !== show(expected[k]));
      check(diff.length === 0, `Expected ${show(Object.fromEntries(diff.map((k) => [k, actual?.[k]])))} to equal ${show(Object.fromEntries(diff.map((k) => [k, expected[k]])))}`);
    },
    toMatch: (/** @type {RegExp} */ rx) => check(typeof actual === "string" && rx.test(actual), `Expected ${show(actual)} to match ${rx}`),
    toBeNull: () => check(actual === null, `Expected ${show(actual)} to be null`),
    toContain: (/** @type {any} */ item) => check(actual?.includes?.(item), `Expected ${show(actual)} to contain ${show(item)}`),
    toBeGreaterThan: (/** @type {number} */ n) => check(actual > n, `Expected ${show(actual)} to be greater than ${n}`),
    toBeGreaterThanOrEqual: (/** @type {number} */ n) => check(actual >= n, `Expected ${show(actual)} to be at least ${n}`),
    toBeLessThanOrEqual: (/** @type {number} */ n) => check(actual <= n, `Expected ${show(actual)} to be at most ${n}`),
    toBeCloseTo: (/** @type {number} */ n, /** @type {number} */ digits = 2) => check(Math.abs(actual - n) < Math.pow(10, -digits) / 2, `Expected ${show(actual)} to be close to ${n}`),
    /** The opposite of toBe / toEqual. */
    not: {
      toBe: (/** @type {any} */ expected) => check(!Object.is(actual, expected), `Expected ${show(actual)} not to be ${show(expected)}`),
      toEqual: (/** @type {any} */ expected) => check(show(actual) !== show(expected), `Expected ${show(actual)} not to equal ${show(expected)}`),
    },
    toBeLessThan: (/** @type {number} */ n) => check(actual < n, `Expected ${show(actual)} to be less than ${n}`),
    toHaveLength: (/** @type {number} */ n) => check(actual?.length === n, `Expected length ${actual?.length} to be ${n}`),
    toThrow: (/** @type {string | RegExp} [match] */ match) => {
      let thrown = null;
      try {
        actual();
      } catch (e) {
        thrown = e;
      }
      check(thrown !== null, "Expected the function to throw");
      if (match) {
        const msg = String(/** @type {any} */ (thrown)?.message ?? thrown);
        check(typeof match === "string" ? msg.includes(match) : match.test(msg), `Expected error "${msg}" to match ${match}`);
      }
    },
    /** For async functions: resolves when the promise rejects (optionally with a code). */
    rejects: async (/** @type {string} [code] */ code) => {
      let err = null;
      try {
        await (typeof actual === "function" ? actual() : actual);
      } catch (e) {
        err = e;
      }
      check(err !== null, "Expected the promise to reject");
      if (code) check(/** @type {any} */ (err).code === code, `Expected error code ${code}, got ${/** @type {any} */ (err).code}`);
    },
  };
  return api;
}

/**
 * Run every registered test in order.
 * @returns {Promise<TestResult[]>}
 */
export async function runAll() {
  /** @type {TestResult[]} */
  const results = [];
  for (const c of cases) {
    const t0 = performance.now();
    if (typeof document !== "undefined") document.body.dataset.running = `${c.group} › ${c.name}`; // shows where a hung test stopped
    try {
      await c.fn();
      results.push({ name: c.name, group: c.group, ok: true, ms: performance.now() - t0 });
    } catch (e) {
      results.push({ name: c.name, group: c.group, ok: false, error: String(/** @type {any} */ (e)?.message ?? e), ms: performance.now() - t0 });
    }
  }
  return results;
}

/**
 * Draw the green/red report and a machine-readable JSON copy in <pre id="results">.
 * @param {TestResult[]} results
 * @param {HTMLElement} root
 */
export function renderReport(results, root) {
  const failed = results.filter((r) => !r.ok);
  const summary = document.createElement("p");
  summary.className = failed.length ? "report__summary report__summary--fail" : "report__summary report__summary--pass";
  summary.textContent = failed.length
    ? `${failed.length} of ${results.length} tests failed`
    : `All ${results.length} tests passed`;
  summary.setAttribute("role", "status");
  root.append(summary);

  const groups = Map.groupBy(results, (r) => r.group);
  for (const [group, items] of groups) {
    const section = document.createElement("section");
    section.className = "report__group";
    const title = document.createElement("h2");
    const bad = items.filter((i) => !i.ok).length;
    title.textContent = `${group} (${items.length - bad}/${items.length})`;
    section.append(title);
    const list = document.createElement("ul");
    for (const r of items) {
      const li = document.createElement("li");
      li.className = r.ok ? "report__item report__item--pass" : "report__item report__item--fail";
      li.textContent = `${r.ok ? "✓" : "✗"} ${r.name}`;
      if (!r.ok) {
        const err = document.createElement("div");
        err.className = "report__error";
        err.textContent = r.error ?? "";
        li.append(err);
      }
      list.append(li);
    }
    section.append(list);
    root.append(section);
  }

  const pre = document.createElement("pre");
  pre.id = "results";
  pre.hidden = true;
  pre.textContent = JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length, failures: failed });
  root.append(pre);
}

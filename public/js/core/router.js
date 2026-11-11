// @ts-check
/**
 * Links and query strings. Every page is a real HTML file; deep links use ?id=… so a reload reopens the same record.
 */

/**
 * Read a query-string value of the current page.
 * @param {string} name
 * @returns {string | null}
 */
export const param = (name) => new URLSearchParams(location.search).get(name);

/** All query-string values of the current page. */
export const params = () => Object.fromEntries(new URLSearchParams(location.search));

/**
 * Build a link to a page with query values (null/undefined/"" are left out).
 * @param {string} path e.g. "/reservation/rs-07-reservation-details/"
 * @param {Record<string, string | number | null | undefined>} [query]
 */
export function url(path, query = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== null && v !== undefined && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

/**
 * Go to a page.
 * @param {string} path
 * @param {Record<string, string | number | null | undefined>} [query]
 */
export function go(path, query) {
  location.assign(url(path, query));
}

/** Update the query string of the current page without reloading (keeps deep links in sync). */
export function setParams(/** @type {Record<string, string | number | null | undefined>} */ query) {
  const current = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(query)) {
    if (v === null || v === undefined || v === "") current.delete(k);
    else current.set(k, String(v));
  }
  const s = current.toString();
  history.replaceState(null, "", s ? `${location.pathname}?${s}` : location.pathname);
}

/** Browser back, or `fallback` when there is no history (e.g. a deep link opened in a new tab). */
export function back(fallback = "/") {
  if (history.length > 1) history.back();
  else go(fallback);
}

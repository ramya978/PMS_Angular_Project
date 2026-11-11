// @ts-check
/**
 * Line icons from assets/icons/sprite.svg.
 * @example icon("search")  → <svg class="icon" aria-hidden="true">…</svg>
 */
const SVG_NS = "http://www.w3.org/2000/svg";
export const SPRITE_URL = "/assets/icons/sprite.svg";

/**
 * @param {string} name id of a <symbol> in the sprite
 * @param {{ size?: number, class?: string, label?: string }} [opts] `label` makes the icon meaningful for screen readers
 * @returns {SVGSVGElement}
 */
export function icon(name, opts = {}) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", `icon${opts.class ? ` ${opts.class}` : ""}`);
  svg.setAttribute("viewBox", "0 0 24 24");
  if (opts.size) {
    svg.setAttribute("width", String(opts.size));
    svg.setAttribute("height", String(opts.size));
  }
  if (opts.label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", opts.label);
  } else {
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
  }
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `${SPRITE_URL}#${name}`);
  svg.append(use);
  return svg;
}

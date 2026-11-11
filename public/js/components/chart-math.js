// @ts-check
/** Pure maths for the hand-written SVG charts (testable without a browser). */

/**
 * A "nice" axis: round maximum and evenly spaced ticks starting at 0.
 * @param {number} max largest data value
 * @param {number} [tickCount]
 * @returns {{ max: number, step: number, ticks: number[] }}
 */
export function niceScale(max, tickCount = 4) {
  if (!(max > 0)) return { max: 1, step: 1, ticks: [0, 1] };
  const rough = max / tickCount;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  const step = niceFrac * pow;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 1000; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { max: top, step, ticks };
}

/**
 * Linear mapping from a domain to a range.
 * @param {[number, number]} domain
 * @param {[number, number]} range
 * @returns {(v: number) => number}
 */
export function scaleLinear([d0, d1], [r0, r1]) {
  const span = d1 - d0 || 1;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

/**
 * SVG path "M x y L x y …" through points.
 * @param {Array<[number, number]>} pts
 */
export const linePath = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${round(x)} ${round(y)}`).join(" ");

/** @param {number} n */
const round = (n) => Math.round(n * 100) / 100;

/**
 * Arc path for a donut slice (angles in radians, 0 = top, clockwise).
 * @param {number} cx @param {number} cy @param {number} rOuter @param {number} rInner @param {number} a0 @param {number} a1
 */
export function donutSlicePath(cx, cy, rOuter, rInner, a0, a1) {
  // a full circle cannot be drawn with one arc; shave a hair off
  if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
  const pt = (/** @type {number} */ r, /** @type {number} */ a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = pt(rOuter, a0), [x1, y1] = pt(rOuter, a1), [x2, y2] = pt(rInner, a1), [x3, y3] = pt(rInner, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${round(x0)} ${round(y0)} A${rOuter} ${rOuter} 0 ${large} 1 ${round(x1)} ${round(y1)} L${round(x2)} ${round(y2)} A${rInner} ${rInner} 0 ${large} 0 ${round(x3)} ${round(y3)} Z`;
}

/**
 * Turn values into [start, end] angles.
 * @param {number[]} values
 * @returns {Array<[number, number]>}
 */
export function sliceAngles(values) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let a = 0;
  return values.map((v) => {
    const start = a;
    a += (v / total) * Math.PI * 2;
    return [start, a];
  });
}

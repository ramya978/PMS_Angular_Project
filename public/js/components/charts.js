// @ts-check
/**
 * Hand-written SVG charts (no chart library): barChart, lineChart, donutChart, sparkline.
 * Colours come from --chart-1…6 tokens so they follow light/dark. Every chart has a text summary for screen readers.
 */
import { h } from "../core/dom.js";
import { donutSlicePath, linePath, niceScale, scaleLinear, sliceAngles } from "./chart-math.js";

const NS = "http://www.w3.org/2000/svg";

/**
 * @param {string} tag
 * @param {Record<string, string | number>} [attrs]
 * @param {...(Node | string)} children
 * @returns {SVGElement}
 */
function svgEl(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.append(c);
  return /** @type {SVGElement} */ (el);
}

export const chartColor = (/** @type {number} */ i) => `var(--chart-${(i % 6) + 1})`;

/**
 * Tiny trend line.
 * @param {number[]} values
 * @param {{ width?: number, height?: number, label?: string }} [o]
 */
export function sparkline(values, o = {}) {
  const w = o.width ?? 100, ht = o.height ?? 28, pad = 3;
  const min = Math.min(...values), max = Math.max(...values);
  const x = scaleLinear([0, Math.max(1, values.length - 1)], [pad, w - pad]);
  const y = scaleLinear([min, max === min ? min + 1 : max], [ht - pad, pad]);
  const pts = /** @type {Array<[number, number]>} */ (values.map((v, i) => [x(i), y(v)]));
  const last = pts.at(-1) ?? [0, 0];
  return svgEl("svg", { class: "chart chart--spark", viewBox: `0 0 ${w} ${ht}`, width: w, height: ht, role: "img", "aria-label": `${o.label ?? "Trend"}: from ${values[0]} to ${values.at(-1)}` },
    svgEl("path", { d: `${linePath(pts)} L${w - pad} ${ht} L${pad} ${ht} Z`, class: "chart__area" }),
    svgEl("path", { d: linePath(pts), class: "chart__line", style: "stroke: var(--chart-1)" }),
    svgEl("circle", { cx: last[0], cy: last[1], r: 2.5, fill: "var(--chart-1)" }));
}

/**
 * Vertical bars.
 * @param {{ data: Array<{ label: string, value: number }>, height?: number, format?: (n: number) => string, label: string, color?: string }} o
 */
export function barChart(o) {
  const W = 600, H = o.height ?? 240, m = { t: 12, r: 12, b: 28, l: 44 };
  const fmt = o.format ?? String;
  const scale = niceScale(Math.max(...o.data.map((d) => d.value), 0));
  const y = scaleLinear([0, scale.max], [H - m.b, m.t]);
  const bw = (W - m.l - m.r) / o.data.length;
  const svg = svgEl("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${o.label}. ${o.data.map((d) => `${d.label} ${fmt(d.value)}`).join(", ")}` });
  for (const t of scale.ticks) {
    svg.append(svgEl("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: "chart__grid" }));
    const label = svgEl("text", { x: m.l - 8, y: y(t) + 4, class: "chart__tick", "text-anchor": "end" });
    label.textContent = fmt(t);
    svg.append(label);
  }
  o.data.forEach((d, i) => {
    const x = m.l + i * bw + bw * 0.2;
    const bar = svgEl("rect", { x, y: y(d.value), width: bw * 0.6, height: Math.max(0, H - m.b - y(d.value)), rx: 4, fill: o.color ?? "var(--chart-1)", class: "chart__bar" });
    bar.append(svgEl("title", {}, `${d.label}: ${fmt(d.value)}`));
    svg.append(bar);
    const t = svgEl("text", { x: x + bw * 0.3, y: H - 8, class: "chart__tick", "text-anchor": "middle" });
    t.textContent = d.label;
    svg.append(t);
  });
  return h("figure", { class: "chart-fig" }, svg);
}

/**
 * Lines (optionally several series) over shared labels.
 * @param {{ labels: string[], series: Array<{ name: string, values: number[] }>, height?: number, format?: (n: number) => string, label: string }} o
 */
export function lineChart(o) {
  const W = 600, H = o.height ?? 240, m = { t: 12, r: 16, b: 28, l: 44 };
  const fmt = o.format ?? String;
  const scale = niceScale(Math.max(...o.series.flatMap((s) => s.values), 0));
  const y = scaleLinear([0, scale.max], [H - m.b, m.t]);
  const x = scaleLinear([0, Math.max(1, o.labels.length - 1)], [m.l, W - m.r]);
  const svg = svgEl("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${o.label}. ${o.series.map((s) => `${s.name}: ${s.values.map(fmt).join(", ")}`).join(". ")}` });
  for (const t of scale.ticks) {
    svg.append(svgEl("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: "chart__grid" }));
    const tx = svgEl("text", { x: m.l - 8, y: y(t) + 4, class: "chart__tick", "text-anchor": "end" });
    tx.textContent = fmt(t);
    svg.append(tx);
  }
  const every = Math.ceil(o.labels.length / 8);
  o.labels.forEach((l, i) => {
    if (i % every) return;
    const tx = svgEl("text", { x: x(i), y: H - 8, class: "chart__tick", "text-anchor": "middle" });
    tx.textContent = l;
    svg.append(tx);
  });
  o.series.forEach((s, si) => {
    const pts = /** @type {Array<[number, number]>} */ (s.values.map((v, i) => [x(i), y(v)]));
    svg.append(svgEl("path", { d: linePath(pts), class: "chart__line", style: `stroke: ${chartColor(si)}` }));
    pts.forEach(([px, py], i) => {
      const dot = svgEl("circle", { cx: px, cy: py, r: 3.5, fill: chartColor(si), class: "chart__dot" });
      dot.append(svgEl("title", {}, `${s.name} · ${o.labels[i]}: ${fmt(s.values[i])}`));
      svg.append(dot);
    });
  });
  const legend = o.series.length > 1
    ? h("ul", { class: "chart-legend" }, o.series.map((s, i) => h("li", {}, h("span", { class: "chart-legend__swatch", attrs: { style: `background:${chartColor(i)}` } }), s.name)))
    : null;
  return h("figure", { class: "chart-fig" }, svg, legend);
}

/**
 * Donut with a centre label and a legend (colour is never the only cue – each slice is listed with its value).
 * @param {{ slices: Array<{ label: string, value: number }>, centerValue?: string, centerLabel?: string, size?: number, label: string }} o
 */
export function donutChart(o) {
  const S = o.size ?? 180, c = S / 2, r = c - 4, ri = r * 0.62;
  const total = o.slices.reduce((a, s) => a + s.value, 0) || 1;
  const angles = sliceAngles(o.slices.map((s) => s.value));
  const svg = svgEl("svg", { class: "chart chart--donut", viewBox: `0 0 ${S} ${S}`, width: S, height: S, role: "img", "aria-label": `${o.label}. ${o.slices.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(", ")}` });
  o.slices.forEach((s, i) => {
    if (s.value <= 0) return;
    const p = svgEl("path", { d: donutSlicePath(c, c, r, ri, angles[i][0], angles[i][1]), fill: chartColor(i), class: "chart__slice" });
    p.append(svgEl("title", {}, `${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`));
    svg.append(p);
  });
  if (o.centerValue) {
    const v = svgEl("text", { x: c, y: c + 2, "text-anchor": "middle", class: "chart__center" });
    v.textContent = o.centerValue;
    svg.append(v);
    if (o.centerLabel) {
      const l = svgEl("text", { x: c, y: c + 20, "text-anchor": "middle", class: "chart__tick" });
      l.textContent = o.centerLabel;
      svg.append(l);
    }
  }
  return h("figure", { class: "chart-fig chart-fig--donut" }, svg,
    h("ul", { class: "chart-legend chart-legend--col" }, o.slices.map((s, i) =>
      h("li", {}, h("span", { class: "chart-legend__swatch", attrs: { style: `background:${chartColor(i)}` } }), `${s.label} `, h("span", { class: "num chart-legend__val" }, `${Math.round((s.value / total) * 100)}%`)))));
}

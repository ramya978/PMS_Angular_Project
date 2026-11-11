/* Aviv Theme Studio (user request 2026-11-03)
   One small shared script for every screen. It gives the person at the desk
     · a colour theme – 12 ready palettes, or any brand and accent colour from a picker (the whole product follows),
     · a menu layout – the classic vertical sidebar or a horizontal mega-menu,
     · a navigation style (deep / brand / light) and the corner roundness.
   The choice is saved on this device (localStorage "avivpms.theme") and applied by js/theme/theme-boot.js before the page paints.
   The horizontal menu is built here from the sidebar that every page already carries, so no page markup changes.
   Plain JavaScript, no library. */
(function () {
  "use strict";
  if (window.__avivThemeStudio) return;
  window.__avivThemeStudio = true;

  var KEY = "avivpms.theme";
  var root = document.documentElement;
  var SPRITE = "/assets/icons/sprite.svg#";

  /* ───────── tiny helpers ───────── */
  var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html; // only static strings of this file go through here
    return n;
  }
  function ico(name, size) {
    size = size || 18;
    return '<svg class="icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="' + SPRITE + name + '"/></svg>';
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  var SVG = {
    palette: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.5-1.9-.3-1 .4-2.1 1.5-2.1H17a4 4 0 0 0 4-4c0-5-4-10-9-10Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>',
    dice: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/></svg>',
    drop: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 7 3 3"/><path d="M20.7 5.3a2.4 2.4 0 0 0-3.4-3.4l-3.3 3.3-1-1-2 2 1 1-7.4 7.4a2 2 0 0 0-.6 1.4V19h2.6a2 2 0 0 0 1.4-.6l7.4-7.4 1 1 2-2-1-1Z"/></svg>',
    layoutV: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>',
    layoutH: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9.5h18"/></svg>',
    chev: ico("chevron-down", 14),
    x: ico("x", 18),
    check: ico("check", 14)
  };

  /* ───────── colour maths (sRGB ⇄ OKLab/OKLCH, so shades stay even in every hue) ───────── */
  function hexToRgb(h) {
    h = String(h).replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (v) { return clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"); }).join("");
  }
  var toLin = function (c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  var fromLin = function (c) { c = clamp(c, 0, 1); return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055); };
  function hexToOk(hex) {
    var c = hexToRgb(hex), l = toLin(c[0]), m = toLin(c[1]), s = toLin(c[2]);
    var L = Math.cbrt(0.4122214708 * l + 0.5363325363 * m + 0.0514459929 * s);
    var M = Math.cbrt(0.2119034982 * l + 0.6806995451 * m + 0.1073969566 * s);
    var S = Math.cbrt(0.0883024619 * l + 0.2817188376 * m + 0.6299787005 * s);
    var a = 1.9779984951 * L - 2.428592205 * M + 0.4505937099 * S;
    var b = 0.0259040371 * L + 0.7827717662 * M - 0.808675766 * S;
    return { L: 0.2104542553 * L + 0.793617785 * M - 0.0040720468 * S, C: Math.hypot(a, b), h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 };
  }
  function okLin(L, C, h) {
    var a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
    var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    var m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    var s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  /** OKLCH → hex; chroma is lowered until the colour fits the screen's colour range */
  function okHex(L, C, h) {
    var rgb = okLin(L, C, h), i = 0;
    while (i++ < 24 && rgb.some(function (v) { return v < -0.0005 || v > 1.0005; })) { C *= 0.92; rgb = okLin(L, C, h); }
    return rgbToHex(fromLin(rgb[0]), fromLin(rgb[1]), fromLin(rgb[2]));
  }
  var triple = function (hex) { return hexToRgb(hex).join(" "); };
  function lum(hex) {
    var c = hexToRgb(hex);
    return 0.2126 * toLin(c[0]) + 0.7152 * toLin(c[1]) + 0.0722 * toLin(c[2]);
  }
  function contrast(a, b) {
    var x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function hexToHsv(hex) {
    var c = hexToRgb(hex).map(function (v) { return v / 255; }), mx = Math.max.apply(null, c), mn = Math.min.apply(null, c), d = mx - mn, h = 0;
    if (d) {
      if (mx === c[0]) h = ((c[1] - c[2]) / d) % 6; else if (mx === c[1]) h = (c[2] - c[0]) / d + 2; else h = (c[0] - c[1]) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return { h: h, s: mx ? d / mx : 0, v: mx };
  }
  function hsvToHex(h, s, v) {
    var f = function (n) { var k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return rgbToHex(f(5) * 255, f(3) * 255, f(1) * 255);
  }
  var isHex = function (s) { return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s).trim()); };
  var normHex = function (s) { s = String(s).trim().replace("#", ""); if (s.length === 3) s = s.replace(/./g, "$&$&"); return "#" + s.toLowerCase(); };

  /* ───────── the palettes ───────── */
  var DEFAULT_PRIMARY = "#1f5c4b", DEFAULT_ACCENT = "#c8a96a";
  var PRESETS = [
    { id: "aviv", name: "Aviv Emerald", primary: null, accent: null },
    // 2026-11-03: only muted, deep primaries with one soft metallic / mineral accent (the Slate and Graphite look)
    { id: "midnight", name: "Midnight Navy", primary: "#243b6b", accent: "#d8b878" },
    { id: "petrol", name: "Petrol Blue", primary: "#1f5360", accent: "#d9b48a" },
    { id: "sage", name: "Sage Garden", primary: "#5a7566", accent: "#dba98c" },
    { id: "olive", name: "Olive Grove", primary: "#5c6a3a", accent: "#dcbc6a" },
    { id: "slate", name: "Slate Steel", primary: "#3f566b", accent: "#7cc4e8" },
    { id: "graphite", name: "Graphite", primary: "#3b3f46", accent: "#d4af37" },
    { id: "espresso", name: "Espresso Bronze", primary: "#5a4535", accent: "#d8b07a" },
    { id: "clay", name: "Clay Terracotta", primary: "#9a5a40", accent: "#e6cba6" },
    { id: "rosewood", name: "Rosewood Blush", primary: "#8a4f62", accent: "#e8cfa8" },
    { id: "bordeaux", name: "Bordeaux Wine", primary: "#6a2b3a", accent: "#d6bd90" },
    { id: "mulberry", name: "Mulberry Dusk", primary: "#5f4170", accent: "#a9d6cc" }
  ];
  var QUICK_BRAND = ["#1f5c4b", "#0f766e", "#0e7490", "#0369a1", "#1f5f99", "#2f4fc4", "#4a46b8", "#5b21b6",
    "#6b3fa0", "#8a3ea0", "#b0356b", "#be123c", "#b02a37", "#c2561c", "#a8641a", "#8a6d1c",
    "#4d7c0f", "#2f6b3a", "#166534", "#7a4a2b", "#6d2a4f", "#3f566b", "#3b3f46", "#1e293b"];
  var QUICK_ACCENT = ["#c8a96a", "#d4af37", "#f0b429", "#e3a857", "#f2b36b", "#d98c3d", "#e29a74", "#f08a8a",
    "#e8b4a0", "#e29ac0", "#cfa95e", "#d9b779", "#a3d977", "#6ec9b5", "#2f9e8f", "#7cc4e8",
    "#9fb6c9", "#b9a2ec", "#e6b655", "#f5d76e", "#ffffff", "#d6b25e", "#c9b8a0", "#8fd3c8"];
  var RADII = {
    sharp: { "--r-sm": "3px", "--r-md": "4px", "--r-lg": "6px", "--r-xl": "9px" },
    round: { "--r-sm": "12px", "--r-md": "14px", "--r-lg": "20px", "--r-xl": "28px" }
  };

  /* ───────── state, variables, saving ───────── */
  var DEFAULT_STATE = { v: 1, preset: "aviv", primary: null, accent: null, menu: "vertical", nav: "deep", radius: "soft", surf: "dark", vars: {} };
  var state = load();
  var appliedKeys = [];
  // ?menu= / ?nav= / ?radius= in the address win for this page view only (demos, screenshots); a click in the studio drops them
  var ov = (function () {
    var q = new URLSearchParams(location.search), ok = { menu: ["vertical", "horizontal"], nav: ["deep", "brand", "tint", "light"], radius: ["sharp", "soft", "round"], surf: ["dark", "light"] }, o = {};
    Object.keys(ok).forEach(function (k) { if (ok[k].indexOf(q.get(k)) >= 0) o[k] = q.get(k); });
    return o;
  })();
  var eff = function (k) { return ov[k] || state[k]; };

  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { s = {}; }
    var out = Object.assign({}, DEFAULT_STATE, s);
    out.primary = s.primary || null;
    out.accent = s.accent || null;
    // a colour theme that was withdrawn (Ocean, Indigo, Violet, Orchid, Ruby, Copper, Teal, Spruce, Plum) falls back to the Aviv default
    if (out.preset !== "custom" && !PRESETS.some(function (p) { return p.id === out.preset; })) {
      out.preset = "aviv"; out.primary = null; out.accent = null; out.vars = {};
    }
    return out;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* blocked: the theme lasts for this page only */ }
  }

  /** every CSS variable a theme changes, from the chosen brand and accent colour */
  function buildVars(st) {
    var v = {}, p, a;
    if (st.primary) {
      p = hexToOk(st.primary);
      var h = p.h, C = Math.min(p.C, 0.15), L5 = clamp(p.L, 0.44, 0.56);
      var tone = function (dl, k) { return okHex(clamp(L5 + dl, 0.1, 0.98), C * k, h); };
      v["--em-500"] = okHex(L5, C * 0.95, h);
      v["--em-600"] = tone(-0.08, 0.95);
      v["--em-700"] = tone(-0.13, 0.9);
      v["--em-800"] = tone(-0.18, 0.85);
      v["--em-900"] = tone(-0.24, 0.8);
      v["--em-950"] = tone(-0.31, 0.75);
      v["--em-200"] = okHex(0.87, C * 0.32, h);
      v["--em-100"] = okHex(0.93, C * 0.18, h);
      v["--em-50"] = okHex(0.965, C * 0.1, h);
      ["500", "800", "900", "950"].forEach(function (k) { v["--em-" + k + "-rgb"] = triple(v["--em-" + k]); });
      v["--forest"] = v["--em-800"]; v["--forest-2"] = v["--em-700"]; v["--forest-rgb"] = triple(v["--em-800"]);
      var dc = clamp(C * 0.5, 0.02, 0.05);
      v["--deep"] = okHex(0.205, dc, h); v["--deep-2"] = okHex(0.165, dc, h); v["--deep-rgb"] = triple(v["--deep"]);
      var n = 0.009; // neutrals take a whisper of the brand hue
      v["--surface-2"] = okHex(0.978, n * 0.5, h); v["--sunken"] = okHex(0.953, n * 0.7, h);
      v["--line"] = okHex(0.93, n * 0.8, h); v["--line-2"] = okHex(0.955, n * 0.6, h);
      v["--line-strong"] = okHex(0.88, n, h); v["--input"] = okHex(0.77, n * 1.2, h);
      v["--ink"] = okHex(0.25, n * 1.6, h); v["--ink-2"] = okHex(0.43, n * 1.4, h);
      v["--ink-3"] = okHex(0.54, n * 1.2, h); v["--ink-4"] = okHex(0.7, n, h);
    }
    if (st.accent) {
      a = hexToOk(st.accent);
      var ah = a.h, AC = Math.min(a.C, 0.17), A5 = clamp(a.L, 0.58, 0.72);
      var at = function (dl, k) { return okHex(clamp(A5 + dl, 0.1, 0.99), AC * k, ah); };
      v["--br-500"] = okHex(A5, AC, ah);
      v["--br-600"] = at(-0.1, 0.95); v["--br-700"] = at(-0.18, 0.9);
      v["--br-400"] = at(0.07, 0.95); v["--br-300"] = at(0.17, 0.8);
      v["--br-200"] = okHex(0.89, AC * 0.45, ah); v["--br-100"] = okHex(0.94, AC * 0.28, ah); v["--br-50"] = okHex(0.975, AC * 0.14, ah);
      ["500", "400", "300"].forEach(function (k) { v["--br-" + k + "-rgb"] = triple(v["--br-" + k]); });
      v["--gold"] = okHex(clamp(a.L, 0.66, 0.78), AC * 0.9, ah); v["--gold-rgb"] = triple(v["--gold"]);
      v["--gold-light"] = okHex(clamp(a.L + 0.12, 0.84, 0.9), AC * 0.55, ah);
    }
    return v;
  }

  function applyVars(vars) {
    appliedKeys.forEach(function (k) { if (!(k in vars)) root.style.removeProperty(k); });
    appliedKeys = Object.keys(vars);
    appliedKeys.forEach(function (k) { root.style.setProperty(k, vars[k]); });
  }

  /** put the whole state on the page and (optionally) save it */
  function apply(persist) {
    var vars = buildVars(state);
    var r = RADII[eff("radius")];
    if (r) for (var k in r) vars[k] = r[k];
    state.vars = vars;
    applyVars(vars);
    root.setAttribute("data-menu", eff("menu"));
    root.setAttribute("data-nav", eff("nav"));
    root.setAttribute("data-radius", eff("radius"));
    root.setAttribute("data-surf", eff("surf"));
    if (persist) save();
    syncUi();
    positionInk();
  }

  var currentColors = function () {
    var v = state.vars || {};
    return {
      p: state.primary || DEFAULT_PRIMARY, a: state.accent || DEFAULT_ACCENT,
      ramp: ["950", "900", "800", "700", "600", "500", "200", "100", "50"].map(function (k) {
        return v["--em-" + k] || ({ 950: "#061c16", 900: "#0b2a22", 800: "#103a2f", 700: "#174a3c", 600: "#1f5c4b", 500: "#2b7561", 200: "#bcd9cc", 100: "#dcebe3", 50: "#eef5f1" })[k];
      }),
      em600: v["--em-600"] || "#1f5c4b", em800: v["--em-800"] || "#103a2f"
    };
  };

  /* ═════════════ the horizontal mega-menu (built from the sidebar the page already has) ═════════════ */
  var CATS = [
    { id: "res", label: "Reservations", icon: "calendar", groups: ["reservations"], blurb: "Bookings, availability, groups and guest records." },
    { id: "fo", label: "Front Desk", icon: "door", groups: ["front-desk", "guest-services", "cashier", "night-audit", "fd-reports"], blurb: "Arrivals, in-house guests, the cashier and the night audit." },
    { id: "hk", label: "Housekeeping", icon: "broom", groups: ["housekeeping", "laundry", "linen", "minibar", "lostfound"], blurb: "Rooms, laundry, linen, minibar and lost & found." },
    { id: "eng", label: "Engineering", icon: "wrench", groups: ["engineering"], blurb: "Work orders, preventive maintenance, assets and compliance." },
    { id: "fb", label: "F&B", icon: "utensils", groups: ["restaurant", "kitchen", "banquets"], blurb: "Restaurant POS, kitchen display and banquet events." },
    { id: "bo", label: "Back Office", icon: "briefcase", groups: ["purchase", "stores", "cost-control", "finance", "general-ledger", "tax", "hr"], blurb: "Purchasing, stores, cost control, finance, tax and HR." },
    { id: "mg", label: "Management", icon: "trending-up", groups: ["rv", "da", "an", "ms", "ow"], blurb: "Revenue, dashboards and approvals, analytics, MIS and budgets, owner app." },
    { id: "setup", label: "Setup", icon: "sliders", groups: ["setup"], blurb: "Rates, rooms, taxes and the rules of the hotel." },
    { id: "tools", label: "Admin", icon: "shield", groups: ["lg", "tools", "ad", "in", "sy"], blurb: "Users and access (Super Admin), address book, help and support." }
  ];

  var menu = null;      // { home, cats:[{…, groups:[{title, items}], count}] }
  var ui = {};          // elements
  var openId = null, hoverId = null;

  function readSidebar() {
    var nav = document.querySelector(".sidebar .nav");
    if (!nav || !nav.querySelector(".nav__sub a.nav__item")) return null;
    var byId = {}, order = [];
    nav.querySelectorAll(".nav__sub").forEach(function (sub, i) {
      var id = sub.getAttribute("data-group") || "g" + i;
      var head = sub.querySelector(".nav__group");
      var items = [];
      sub.querySelectorAll("a.nav__item").forEach(function (a) {
        var use = a.querySelector("use");
        items.push({
          href: a.getAttribute("href"), icon: use ? (use.getAttribute("href") || "").split("#")[1] || "list" : "list",
          label: ((a.querySelector(".nav__label") || a).textContent || "").trim(), title: a.getAttribute("title") || "",
          active: a.classList.contains("is-active")
        });
      });
      byId[id] = { id: id, title: head ? head.textContent.replace(/\s+/g, " ").trim() : id, items: items };
      order.push(id);
    });
    var home = nav.querySelector(".nav__section a.nav__item");
    var used = {}, cats = [];
    CATS.forEach(function (c) {
      var groups = c.groups.filter(function (g) { return byId[g]; }).map(function (g) { used[g] = 1; return byId[g]; });
      if (groups.length) cats.push(Object.assign({}, c, { groups: groups }));
    });
    var rest = order.filter(function (g) { return !used[g]; }).map(function (g) { return byId[g]; });
    if (rest.length) cats.push({ id: "more", label: "More", icon: "more", groups: rest, blurb: "Everything else in Aviv PMS." });
    cats.forEach(function (c) {
      c.count = c.groups.reduce(function (n, g) { return n + g.items.length; }, 0);
      c.current = c.groups.some(function (g) { return g.items.some(function (i) { return i.active; }); });
    });
    return { home: home ? home.getAttribute("href") : "/common/cm-06-home-launcher/", cats: cats };
  }

  function buildMenu() {
    if (ui.root) return;
    menu = readSidebar();
    if (!menu) return;
    var wrap = el("div", "hnroot");
    wrap.setAttribute("data-zt-ui", "");
    var bar = el("div", "hnav");
    bar.innerHTML =
      '<a class="hnav__brand" href="' + esc(menu.home) + '" aria-label="Aviv PMS home"><span class="hnav__mark">' + ico("leaf", 18) + '</span><span class="hnav__name">Aviv PMS</span></a>' +
      '<span class="hnav__sep" aria-hidden="true"></span>' +
      '<nav class="hnav__tabs" aria-label="Main menu"></nav>' +
      '<div class="hnav__end">' +
      '<button class="hnav__find" type="button" data-zt="find" aria-label="Jump to any screen">' + ico("search", 16) + '<span>Jump to…</span><kbd>Ctrl /</kbd></button>' +
      '<button class="hnav__btn" type="button" data-zt="vertical" title="Switch to the vertical menu" aria-label="Switch to the vertical menu">' + SVG.layoutV + '</button>' +
      '</div>';
    var tabs = bar.querySelector(".hnav__tabs");
    var ink = el("span", "hnav__ink");
    ink.setAttribute("aria-hidden", "true");
    var panels = el("div", "hnav__panels");
    var scrim = el("div", "hnav__scrim");
    scrim.addEventListener("click", closePanel);

    menu.cats.forEach(function (c) {
      var t = el("button", "hnav__tab" + (c.current ? " is-current" : ""));
      t.type = "button"; t.id = "hn-t-" + c.id; t.setAttribute("aria-expanded", "false"); t.setAttribute("aria-controls", "hn-p-" + c.id);
      t.setAttribute("data-cat", c.id);
      t.innerHTML = ico(c.icon, 17) + "<span>" + esc(c.label) + "</span>" + SVG.chev;
      t.addEventListener("click", function () { openId === c.id ? closePanel() : openPanel(c.id); });
      t.addEventListener("pointerenter", function (e) { hoverId = c.id; positionInk(); if (openId && openId !== c.id && e.pointerType === "mouse") openPanel(c.id, true); });
      t.addEventListener("pointerleave", function () { hoverId = null; positionInk(); });
      t.addEventListener("keydown", function (e) { tabKeys(e, c.id); });
      tabs.appendChild(t);

      var p = el("section", "hp"); p.id = "hn-p-" + c.id; p.hidden = true; p.setAttribute("aria-labelledby", t.id);
      var rail = '<aside class="hp__rail"><span class="hp__ic">' + ico(c.icon, 26) + '</span><h2>' + esc(c.label) + '</h2><p>' + esc(c.blurb) + '</p><span class="hp__count">' + c.count + ' screens</span></aside>';
      var single = c.groups.length === 1;
      var cols = single ? clamp(Math.ceil(c.count / 7), 1, 3) : clamp(c.groups.length, 2, c.count > 28 ? 4 : 3);
      var body = c.groups.map(function (g) {
        return '<div class="hp__group"><h3>' + esc(g.title) + '</h3><ul>' + g.items.map(function (i) {
          return '<li><a class="hp__link' + (i.active ? " is-active" : "") + '" href="' + esc(i.href) + '"' + (i.active ? ' aria-current="page"' : "") +
            (i.title ? ' title="' + esc(i.title) + '"' : "") + '><span class="hp__lic">' + ico(i.icon, 16) + "</span><span>" + esc(i.label) + "</span></a></li>";
        }).join("") + "</ul></div>";
      }).join("");
      p.style.setProperty("--cols", cols);
      p.innerHTML = rail + '<div class="hp__scroll"><div class="hp__cols' + (single ? " is-single" : "") + '">' + body + "</div></div>";
      p.addEventListener("keydown", panelKeys);
      panels.appendChild(p);
    });
    tabs.appendChild(ink);
    wrap.appendChild(bar); wrap.appendChild(scrim); wrap.appendChild(panels);
    document.body.appendChild(wrap);
    ui.root = wrap; ui.bar = bar; ui.tabs = tabs; ui.ink = ink; ui.panels = panels; ui.scrim = scrim;

    bar.querySelector('[data-zt="find"]').addEventListener("click", openFinder);
    bar.querySelector('[data-zt="vertical"]').addEventListener("click", function () { setMenu("vertical"); });
    document.addEventListener("pointerdown", function (e) {
      if (openId && !wrap.contains(e.target)) closePanel();
    });
    window.addEventListener("resize", function () { if (openId) placePanel(openId); positionInk(); });
    // a link inside a panel is a normal navigation; close first so a back-forward cache restore starts clean
    panels.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a")) closePanel(true); });
    window.addEventListener("pageshow", function () { closePanel(true); });
    positionInk();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(positionInk);
  }

  function tabKeys(e, id) {
    var tabs = [].slice.call(ui.tabs.querySelectorAll(".hnav__tab")), i = tabs.findIndex(function (t) { return t.getAttribute("data-cat") === id; }), n = null;
    if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
    else if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === "ArrowDown") { e.preventDefault(); openPanel(id); var l = document.querySelector("#hn-p-" + id + " .hp__link"); if (l) l.focus(); return; }
    else if (e.key === "Home") n = tabs[0]; else if (e.key === "End") n = tabs[tabs.length - 1];
    if (n) { e.preventDefault(); n.focus(); if (openId) openPanel(n.getAttribute("data-cat"), true); }
  }
  function panelKeys(e) {
    var p = e.currentTarget, links = [].slice.call(p.querySelectorAll(".hp__link")), i = links.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); (links[i + 1] || links[0]).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (i > 0 ? links[i - 1] : links[links.length - 1]).focus(); }
    else if (e.key === "Escape") { e.stopPropagation(); closePanel(); var t = document.getElementById("hn-t-" + openId); if (t) t.focus(); }
  }

  function openPanel(id, keepFocus) {
    if (!ui.root) return;
    closeFinder();
    openId = id;
    ui.tabs.querySelectorAll(".hnav__tab").forEach(function (t) {
      var on = t.getAttribute("data-cat") === id;
      t.classList.toggle("is-open", on); t.setAttribute("aria-expanded", String(on));
    });
    ui.panels.querySelectorAll(".hp").forEach(function (p) { p.hidden = p.id !== "hn-p-" + id; });
    ui.root.classList.add("is-open");
    placePanel(id);
    positionInk();
  }
  function closePanel(quiet) {
    if (!ui.root || !openId && !quiet) return;
    openId = null;
    ui.tabs.querySelectorAll(".hnav__tab").forEach(function (t) { t.classList.remove("is-open"); t.setAttribute("aria-expanded", "false"); });
    ui.panels.querySelectorAll(".hp").forEach(function (p) { p.hidden = true; });
    ui.root.classList.remove("is-open");
    positionInk();
  }
  /** the panel sits under its tab, and is pulled back inside the window when it would stick out */
  function placePanel(id) {
    var p = document.getElementById("hn-p-" + id), t = document.getElementById("hn-t-" + id);
    if (!p || !t) return;
    var bar = ui.bar.getBoundingClientRect(), tb = t.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    p.style.top = Math.round(bar.bottom) + "px";
    p.style.maxHeight = Math.max(240, window.innerHeight - bar.bottom - 14) + "px";
    p.style.left = "0px";
    var w = p.offsetWidth; // not the drawn width: the opening animation scales it a little
    p.style.left = clamp(Math.round(tb.left - 14), 12, Math.max(12, vw - w - 12)) + "px";
    var scroll = p.querySelector(".hp__scroll");
    p.style.setProperty("--hp-arrow", clamp(tb.left + tb.width / 2 - parseFloat(p.style.left), 24, w - 24) + "px");
    if (scroll) scroll.scrollTop = 0;
  }
  /** the gold "ink" line slides under the open, hovered or current tab */
  function positionInk() {
    if (!ui.ink) return;
    var id = openId || hoverId || (menu && (menu.cats.filter(function (c) { return c.current; })[0] || {}).id);
    var t = id && document.getElementById("hn-t-" + id);
    if (!t || !ui.tabs.offsetParent) { ui.ink.style.opacity = "0"; return; }
    ui.ink.style.opacity = "1";
    ui.ink.style.setProperty("--ix", t.offsetLeft + 12 + "px");
    ui.ink.style.setProperty("--iw", Math.max(12, t.offsetWidth - 24) + "px");
  }

  function setMenu(m) {
    delete ov.menu;
    state.menu = m;
    state.preset = state.preset || "aviv";
    closePanel(true);
    apply(true);
  }

  /* ───────── "Jump to…" finder over every menu entry ───────── */
  function openFinder() {
    if (!menu) return;
    closePanel(true);
    if (!ui.finder) {
      var f = el("div", "zf");
      f.setAttribute("data-zt-ui", "");
      f.hidden = true;
      f.innerHTML = '<div class="zf__back"></div><div class="zf__box" role="dialog" aria-label="Jump to a screen"><label class="zf__in">' + ico("search", 18) +
        '<input type="search" placeholder="Jump to a screen – try “room board”, “invoices”, “work orders”" autocomplete="off" spellcheck="false" aria-label="Jump to a screen"><kbd>Esc</kbd></label><ul class="zf__list" role="listbox"></ul><p class="zf__hint"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></p></div>';
      document.body.appendChild(f);
      ui.finder = f; ui.fin = f.querySelector("input"); ui.fl = f.querySelector(".zf__list");
      f.querySelector(".zf__back").addEventListener("click", closeFinder);
      ui.fin.addEventListener("input", renderFinder);
      f.addEventListener("keydown", finderKeys);
    }
    ui.finder.hidden = false;
    ui.fin.value = "";
    renderFinder();
    ui.fin.focus();
  }
  function closeFinder() { if (ui.finder && !ui.finder.hidden) ui.finder.hidden = true; }
  var finderIdx = 0;
  function renderFinder() {
    var q = ui.fin.value.trim().toLowerCase(), terms = q.split(/\s+/).filter(Boolean), res = [], seen = {};
    menu.cats.forEach(function (c) {
      c.groups.forEach(function (g) {
        g.items.forEach(function (i) {
          if (seen[i.href]) return;
          var hay = (i.label + " " + i.title + " " + g.title + " " + c.label).toLowerCase(), score = 0;
          if (terms.every(function (t) { return hay.indexOf(t) >= 0; })) {
            score = 1 + (q && i.label.toLowerCase().indexOf(q) === 0 ? 4 : 0) + (q && i.label.toLowerCase().indexOf(q) > 0 ? 2 : 0) + (i.active ? -1 : 0);
            seen[i.href] = 1;
            res.push({ i: i, g: g, c: c, s: score });
          }
        });
      });
    });
    res.sort(function (a, b) { return b.s - a.s; });
    res = res.slice(0, q ? 14 : 8);
    finderIdx = 0;
    ui.fl.innerHTML = res.length ? res.map(function (r, n) {
      return '<li role="option" class="' + (n === 0 ? "is-on" : "") + '"><a href="' + esc(r.i.href) + '"><span class="zf__ic">' + ico(r.i.icon, 17) + '</span><span class="zf__tx"><b>' + esc(r.i.label) + "</b><small>" + esc(r.c.label) + " · " + esc(r.g.title) + "</small></span>" + (r.i.active ? '<em>You are here</em>' : ico("arrow-right", 15)) + "</a></li>";
    }).join("") : '<li class="zf__none">No screen matches “' + esc(ui.fin.value) + "”.</li>";
  }
  function finderKeys(e) {
    var items = [].slice.call(ui.fl.querySelectorAll("li[role=option]"));
    if (e.key === "Escape") { e.stopPropagation(); closeFinder(); return; }
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      finderIdx = (finderIdx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach(function (li, n) { li.classList.toggle("is-on", n === finderIdx); });
      items[finderIdx].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      var a = items[finderIdx].querySelector("a");
      if (a) location.href = a.getAttribute("href");
    }
  }

  /* ═════════════ the Theme Studio ═════════════ */
  var studio = null, handle = null, target = "primary", hsv = { h: 160, s: 0.6, v: 0.4 };

  function presetCard(p) {
    var pr = p.primary || DEFAULT_PRIMARY, ac = p.accent || DEFAULT_ACCENT;
    return '<button class="zt-pre" type="button" role="radio" aria-checked="false" data-preset="' + p.id + '" style="--p:' + pr + ";--a:" + ac + '" title="' + esc(p.name) + '">' +
      '<span class="zt-pre__dot"><i></i>' + SVG.check + "</span><span class=\"zt-pre__n\">" + esc(p.name.split(" ")[0]) + "</span></button>";
  }
  function navCard(id, name, note) {
    return '<button class="zt-card zt-card--nav" type="button" data-nav="' + id + '" aria-pressed="false"><span class="zt-mini zt-mini--' + id + '"><i></i><i></i><i></i><b></b></span><strong>' + name + "</strong><small>" + note + "</small></button>";
  }

  function buildStudio() {
    if (studio) return;
    handle = el("button", "zt-handle",
      '<span class="zt-orb" aria-hidden="true"><i></i></span><span class="zt-handle__t">Theme</span>');
    handle.type = "button"; handle.setAttribute("aria-label", "Open Theme Studio: colours, menu layout and style"); handle.setAttribute("aria-expanded", "false"); handle.setAttribute("aria-controls", "zt-panel");
    handle.setAttribute("data-zt-ui", "");
    handle.title = "Theme Studio (Alt + T)";
    handle.addEventListener("click", function () { toggleStudio(); });

    studio = el("section", "zt-panel");
    studio.id = "zt-panel"; studio.hidden = true; studio.setAttribute("role", "dialog"); studio.setAttribute("aria-label", "Theme Studio"); studio.setAttribute("data-zt-ui", "");
    studio.innerHTML =
      '<header class="zt-hd"><span class="zt-hd__art" aria-hidden="true"></span>' +
      '<div class="zt-hd__tx"><span class="zt-eyebrow">Personalise</span><h2>Theme Studio</h2><p>Colours, menu layout and style. Changes show instantly and stay on this device.</p></div>' +
      '<button class="zt-x" type="button" data-zt="close" aria-label="Close Theme Studio">' + SVG.x + "</button></header>" +
      '<div class="zt-body">' +
      '<section class="zt-sec"><h3>Menu layout</h3><div class="zt-opts">' +
      '<button class="zt-card" type="button" data-menu="vertical" aria-pressed="false"><span class="zt-wire zt-wire--v"><i></i><i></i><i></i><i></i></span><strong>Vertical</strong><small>Sidebar on the left</small></button>' +
      '<button class="zt-card" type="button" data-menu="horizontal" aria-pressed="false"><span class="zt-wire zt-wire--h"><i></i><i></i><i></i><i></i></span><strong>Horizontal</strong><small>Mega-menu across the top</small></button>' +
      "</div><p class=\"zt-note\" data-zt=\"menu-note\">The horizontal menu needs a screen at least 1025 px wide; narrower screens keep the slide-in menu.</p></section>" +
      '<section class="zt-sec"><h3>Menu colour <span class="zt-cur" data-zt="navname"></span></h3><div class="zt-opts zt-opts--4">' +
      navCard("tint", "Light", "Tinted by theme") + navCard("light", "White", "Plain white") + navCard("brand", "Brand", "Theme colour") + navCard("deep", "Deep", "Dark, tinted") + "</div>" +
      '<p class="zt-note">Applies to the sidebar and the horizontal menu. Light follows the colour theme you pick.</p>' +
      '<h3 class="zt-sub">Banners &amp; dark panels</h3><div class="zt-seg zt-seg--2" role="radiogroup" aria-label="Banners and dark panels">' +
      '<button type="button" role="radio" data-surf="light" aria-checked="false"><i class="zt-sw2 zt-sw2--light"></i>Light</button>' +
      '<button type="button" role="radio" data-surf="dark" aria-checked="false"><i class="zt-sw2 zt-sw2--dark"></i>Dark</button></div></section>' +
      '<section class="zt-sec"><h3>Colour theme <span class="zt-cur" data-zt="curname"></span></h3><div class="zt-presets" role="radiogroup" aria-label="Colour themes">' + PRESETS.map(presetCard).join("") + "</div></section>" +
      '<section class="zt-sec"><h3>Custom palette</h3>' +
      '<div class="zt-targets" role="tablist"><button type="button" role="tab" data-target="primary" aria-selected="true"><i></i><span>Brand colour</span><code></code></button><button type="button" role="tab" data-target="accent" aria-selected="false"><i></i><span>Accent</span><code></code></button></div>' +
      '<div class="zt-sv" data-zt="sv" role="slider" tabindex="0" aria-label="Saturation and brightness"><i class="zt-sv__t"></i></div>' +
      '<input class="zt-hue" type="range" min="0" max="360" step="1" value="160" aria-label="Hue">' +
      '<div class="zt-hexrow"><label><span>Hex</span><input class="zt-hex" type="text" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex colour"></label>' +
      '<button class="zt-btn" type="button" data-zt="eyedrop" hidden title="Pick a colour from the screen">' + SVG.drop + "<span>Pick</span></button></div>" +
      '<div class="zt-swatches" role="group" aria-label="Quick colours"></div>' +
      '<div class="zt-ramp" aria-label="Shades generated from your colour"></div>' +
      '<p class="zt-contrast" data-zt="contrast" aria-live="polite"></p></section>' +
      '<section class="zt-sec"><h3>Corners</h3><div class="zt-seg" role="radiogroup" aria-label="Corner roundness">' +
      '<button type="button" role="radio" data-radius="sharp" aria-checked="false"><i class="zt-rad zt-rad--sharp"></i>Sharp</button>' +
      '<button type="button" role="radio" data-radius="soft" aria-checked="false"><i class="zt-rad zt-rad--soft"></i>Soft</button>' +
      '<button type="button" role="radio" data-radius="round" aria-checked="false"><i class="zt-rad zt-rad--round"></i>Round</button></div></section>' +
      "</div>" +
      '<footer class="zt-ft"><button class="zt-btn" type="button" data-zt="reset" title="Back to the Aviv look">' + ico("refresh", 16) + "<span>Reset</span></button>" +
      '<button class="zt-btn" type="button" data-zt="random" title="A fresh harmonious palette">' + SVG.dice + "<span>Surprise me</span></button>" +
      '<button class="zt-btn zt-btn--primary" type="button" data-zt="close"><span>Done</span></button></footer>';
    document.body.appendChild(studio);
    document.body.appendChild(handle);

    var ramp = studio.querySelector(".zt-ramp");
    for (var i = 0; i < 9; i++) ramp.appendChild(el("span", "zt-ramp__c"));
    renderSwatches();
    wireStudio();
    var userPv = document.getElementById("pv-user");
    if (userPv && !userPv.querySelector("[data-zt-open]")) {
      var b = el("button", "pv__item", SVG.palette.replace('width="20" height="20"', 'width="16" height="16"') + "<span>Theme &amp; layout</span>");
      b.type = "button"; b.setAttribute("data-zt-open", "");
      b.addEventListener("click", function () { try { userPv.hidePopover(); } catch (e) { /* not a popover */ } openStudio(); });
      var after = userPv.querySelector("a.pv__item");
      after ? after.insertAdjacentElement("afterend", b) : userPv.appendChild(b);
    }
    syncUi();
  }

  function renderSwatches() {
    var set = target === "primary" ? QUICK_BRAND : QUICK_ACCENT, box = studio.querySelector(".zt-swatches");
    box.innerHTML = set.map(function (c) { return '<button type="button" class="zt-sw" data-c="' + c + '" style="--c:' + c + '" title="' + c + '" aria-label="' + c + '"></button>'; }).join("");
  }

  function activeHex() { return target === "primary" ? (state.primary || DEFAULT_PRIMARY) : (state.accent || DEFAULT_ACCENT); }

  function setColor(hex, from) {
    hex = normHex(hex);
    if (target === "primary") state.primary = hex; else state.accent = hex;
    if (state.primary == null) state.primary = DEFAULT_PRIMARY;
    if (state.accent == null) state.accent = DEFAULT_ACCENT;
    state.preset = "custom";
    if (from !== "sv") hsv = hexToHsv(hex);
    apply(true);
  }

  function wireStudio() {
    studio.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.zt === "close") closeStudio();
      else if (b.dataset.zt === "reset") resetAll();
      else if (b.dataset.zt === "random") surprise();
      else if (b.dataset.zt === "eyedrop") eyedrop();
      else if (b.dataset.menu) setMenu(b.dataset.menu);
      else if (b.dataset.nav) { delete ov.nav; delete ov.surf; state.nav = b.dataset.nav; state.surf = b.dataset.nav === "tint" || b.dataset.nav === "light" ? "light" : "dark"; apply(true); }
      else if (b.dataset.surf) { delete ov.surf; state.surf = b.dataset.surf; apply(true); }
      else if (b.dataset.radius) { delete ov.radius; state.radius = b.dataset.radius; apply(true); }
      else if (b.dataset.preset) {
        var p = PRESETS.filter(function (x) { return x.id === b.dataset.preset; })[0];
        state.preset = p.id; state.primary = p.primary; state.accent = p.accent;
        hsv = hexToHsv(activeHex());
        apply(true);
      } else if (b.dataset.target) { target = b.dataset.target; hsv = hexToHsv(activeHex()); renderSwatches(); syncUi(); }
      else if (b.classList.contains("zt-sw")) setColor(b.dataset.c);
    });
    // saturation / brightness square
    var sv = studio.querySelector(".zt-sv"), drag = false;
    var move = function (e) {
      var r = sv.getBoundingClientRect();
      hsv.s = clamp((e.clientX - r.left) / r.width, 0, 1);
      hsv.v = 1 - clamp((e.clientY - r.top) / r.height, 0, 1);
      setColor(hsvToHex(hsv.h, hsv.s, hsv.v), "sv");
    };
    sv.addEventListener("pointerdown", function (e) { drag = true; sv.setPointerCapture(e.pointerId); move(e); });
    sv.addEventListener("pointermove", function (e) { if (drag) move(e); });
    sv.addEventListener("pointerup", function () { drag = false; });
    sv.addEventListener("keydown", function (e) {
      var d = e.shiftKey ? 0.1 : 0.02, k = e.key;
      if (k === "ArrowLeft") hsv.s = clamp(hsv.s - d, 0, 1); else if (k === "ArrowRight") hsv.s = clamp(hsv.s + d, 0, 1);
      else if (k === "ArrowUp") hsv.v = clamp(hsv.v + d, 0, 1); else if (k === "ArrowDown") hsv.v = clamp(hsv.v - d, 0, 1); else return;
      e.preventDefault(); setColor(hsvToHex(hsv.h, hsv.s, hsv.v), "sv");
    });
    studio.querySelector(".zt-hue").addEventListener("input", function (e) {
      hsv.h = +e.target.value; if (hsv.s < 0.05) hsv.s = 0.5; if (hsv.v < 0.15) hsv.v = 0.5;
      setColor(hsvToHex(hsv.h, hsv.s, hsv.v), "sv");
    });
    var hx = studio.querySelector(".zt-hex");
    hx.addEventListener("input", function () { if (isHex(hx.value) && /^#?[0-9a-f]{6}$/i.test(hx.value.trim())) setColor(hx.value); });
    hx.addEventListener("blur", function () { hx.value = activeHex().toUpperCase(); });
    if (window.EyeDropper) studio.querySelector('[data-zt="eyedrop"]').hidden = false;
  }

  function eyedrop() {
    try {
      new window.EyeDropper().open().then(function (r) { setColor(r.sRGBHex); }).catch(function () { /* cancelled */ });
    } catch (e) { /* not available */ }
  }
  function surprise() {
    var h = Math.random() * 360;
    state.primary = okHex(0.44 + Math.random() * 0.1, 0.09 + Math.random() * 0.07, h);
    state.accent = okHex(0.72 + Math.random() * 0.05, 0.1 + Math.random() * 0.04, (h + 140 + Math.random() * 90) % 360);
    state.preset = "custom";
    hsv = hexToHsv(activeHex());
    apply(true);
  }
  function resetAll() {
    var m = state.menu;
    ov = {};
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    state.menu = m; // the layout is a separate choice: reset keeps it, the studio has its own switch
    target = "primary"; hsv = hexToHsv(DEFAULT_PRIMARY);
    renderSwatches();
    apply(true);
  }

  /** reflect the state in every control of the studio and the bar */
  function syncUi() {
    if (!studio) return;
    var cur = PRESETS.filter(function (p) { return p.id === state.preset; })[0];
    studio.querySelector('[data-zt="curname"]').textContent = cur ? cur.name : "Custom";
    studio.querySelectorAll("[data-preset]").forEach(function (b) {
      var on = b.dataset.preset === state.preset; b.classList.toggle("is-on", on); b.setAttribute("aria-checked", String(on));
    });
    studio.querySelectorAll("[data-menu]").forEach(function (b) { var on = b.dataset.menu === eff("menu"); b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
    studio.querySelectorAll("[data-nav]").forEach(function (b) { var on = b.dataset.nav === eff("nav"); b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
    studio.querySelectorAll("[data-surf]").forEach(function (b) { var on = b.dataset.surf === eff("surf"); b.classList.toggle("is-on", on); b.setAttribute("aria-checked", String(on)); });
    studio.querySelectorAll("[data-radius]").forEach(function (b) { var on = b.dataset.radius === eff("radius"); b.classList.toggle("is-on", on); b.setAttribute("aria-checked", String(on)); });
    var NAVN = { tint: "Light", light: "White", brand: "Brand", deep: "Deep" };
    studio.querySelector('[data-zt="navname"]').textContent = NAVN[eff("nav")] || "";
    var cs = currentColors(), pHex = cs.p, aHex = cs.a;
    studio.querySelectorAll("[data-target]").forEach(function (b) {
      var isP = b.dataset.target === "primary", hex = isP ? pHex : aHex;
      b.setAttribute("aria-selected", String(b.dataset.target === target)); b.classList.toggle("is-on", b.dataset.target === target);
      b.querySelector("i").style.background = hex; b.querySelector("code").textContent = hex.toUpperCase();
    });
    var hex = target === "primary" ? pHex : aHex, hx = studio.querySelector(".zt-hex");
    if (document.activeElement !== hx) hx.value = hex.toUpperCase();
    var sv = studio.querySelector(".zt-sv");
    sv.style.setProperty("--hue", hsv.h);
    sv.style.setProperty("--tx", hsv.s * 100 + "%"); sv.style.setProperty("--ty", (1 - hsv.v) * 100 + "%");
    sv.setAttribute("aria-valuetext", "Saturation " + Math.round(hsv.s * 100) + "%, brightness " + Math.round(hsv.v * 100) + "%");
    studio.querySelector(".zt-hue").value = Math.round(hsv.h);
    studio.querySelectorAll(".zt-sw").forEach(function (b) { b.classList.toggle("is-on", b.dataset.c === hex.toLowerCase()); });
    studio.querySelectorAll(".zt-ramp__c").forEach(function (c, i) { c.style.background = cs.ramp[i]; c.title = ["950", "900", "800", "700", "600", "500", "200", "100", "50"][i] + " " + cs.ramp[i]; });
    var c1 = contrast(cs.em600, "#ffffff"), c2 = contrast(cs.em800, "#ffffff"), low = Math.min(c1, c2);
    var p = studio.querySelector('[data-zt="contrast"]');
    p.className = "zt-contrast " + (low >= 7 ? "is-aaa" : low >= 4.5 ? "is-aa" : "is-low");
    p.innerHTML = ico(low >= 4.5 ? "check-circle" : "alert", 15) + "<span>White text on buttons: <b>" + low.toFixed(1) + ":1</b> · " + (low >= 7 ? "AAA, very readable" : low >= 4.5 ? "AA, readable" : "low contrast") + ". Shades are adjusted so text stays readable.</span>";
    var note = studio.querySelector('[data-zt="menu-note"]');
    note.hidden = eff("menu") === "horizontal";
  }

  function openStudio() {
    buildStudio();
    studio.hidden = false;
    handle.setAttribute("aria-expanded", "true");
    root.classList.add("zt-open");
    requestAnimationFrame(function () { studio.classList.add("is-in"); });
    hsv = hexToHsv(activeHex());
    syncUi();
    var x = studio.querySelector(".zt-x"); if (x) x.focus({ preventScroll: true });
  }
  function closeStudio() {
    if (!studio || studio.hidden) return;
    studio.classList.remove("is-in");
    root.classList.remove("zt-open");
    handle.setAttribute("aria-expanded", "false");
    setTimeout(function () { if (!studio.classList.contains("is-in")) studio.hidden = true; }, 240);
    handle.focus({ preventScroll: true });
  }
  function toggleStudio() { studio && !studio.hidden && studio.classList.contains("is-in") ? closeStudio() : openStudio(); }

  /* ───────── keys, other tabs, start ───────── */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (ui.finder && !ui.finder.hidden) { closeFinder(); return; }
      if (openId) { var t = document.getElementById("hn-t-" + openId); closePanel(); if (t) t.focus(); return; }
      if (studio && !studio.hidden) closeStudio();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      if (menu && root.getAttribute("data-menu") === "horizontal") { e.preventDefault(); openFinder(); }
    } else if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyT") { // Alt + T (Alt + Shift + T is taken by Chrome)
      e.preventDefault(); toggleStudio();
    }
  });
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    state = load(); apply(false);
  });

  function start() {
    // address-bar demo hooks (nothing is saved):  ?preset=midnight  ?zt=studio  ?zt=find  ?zt=panel:fo
    var q = new URLSearchParams(location.search), pre = PRESETS.filter(function (x) { return x.id === q.get("preset"); })[0], hook = q.get("zt");
    if (pre) { state.preset = pre.id; state.primary = pre.primary; state.accent = pre.accent; }
    // the saved vars are already on <html> (theme-boot.js); recompute so a newer colour engine always wins
    apply(false);
    if (hook) setTimeout(function () {
      if (hook === "studio") openStudio(); else if (hook === "find") openFinder(); else if (hook.indexOf("panel:") === 0) openPanel(hook.slice(6));
    }, 500);
    buildStudio();
    var tries = 0;
    (function waitForSidebar() {
      buildMenu();
      if (!ui.root && tries++ < 40) setTimeout(waitForSidebar, 150); // the JavaScript screens build their sidebar a little later
      else if (ui.root) apply(false);
    })();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

/*
 * Classic (non-module) script loaded first in <head> of every page.
 * 1. Applies the saved theme / density before first paint (no flash).
 * 2. Captures console errors / warnings and load failures so tests and dev-tools/verify can read them.
 * Kept dependency-free on purpose.
 */
(function () {
  "use strict";
  var root = document.documentElement;

  try {
    var prefs = JSON.parse(localStorage.getItem("avivpms.prefs") || "{}");
    var q = new URLSearchParams(location.search); // ?theme=dark&density=compact – handy for demos and screenshots, not saved
    var theme = q.get("theme") || prefs.theme || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-density", q.get("density") || prefs.density || "comfortable");
  } catch (e) {
    root.setAttribute("data-theme", "light");
    root.setAttribute("data-density", "comfortable");
  }

  /** @type {{type:string, message:string}[]} */
  var captured = [];
  window.__consoleIssues = captured;

  function record(type, message) {
    var item = { type: type, message: String(message).slice(0, 500) };
    captured.push(item);
    try {
      if (window.parent !== window && typeof window.parent.__verifyCapture === "function") {
        window.parent.__verifyCapture(window, item);
      }
    } catch (e) { /* cross-origin parent: ignore */ }
  }

  ["error", "warn"].forEach(function (level) {
    var original = console[level];
    console[level] = function () {
      record("console." + level, Array.prototype.map.call(arguments, String).join(" "));
      return original.apply(console, arguments);
    };
  });

  window.addEventListener("error", function (ev) {
    var t = /** @type {any} */ (ev.target);
    if (t && t !== window && (t.src || t.href)) {
      record("load-failure", (t.src || t.href));
    } else {
      record("uncaught", ev.message + " (" + (ev.filename || "").split("/").pop() + ":" + ev.lineno + ")");
    }
  }, true);

  window.addEventListener("unhandledrejection", function (ev) {
    record("unhandled-rejection", ev.reason && ev.reason.message ? ev.reason.message : ev.reason);
  });
})();

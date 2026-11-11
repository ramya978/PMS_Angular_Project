/* Home Launcher choice (CM-07 Home Launcher Setup, user 2026-11-04).
   The choice is saved on this device until the backend is connected:
     localStorage "avivpms.home"            { mode: "default" | "custom", kind: "design" | "wallpaper", design, fit, pos, dim }
     localStorage "avivpms.home.wallpaper"  the uploaded picture, already reduced to a JPEG data URL
   With nothing saved, or anything invalid, the page keeps the default scene already in its HTML.
   Loaded by CM-06 (with data-apply, which shows the choice) and CM-07 (for the live preview). */
(function () {
  var script = document.currentScript;
  var SCENE_BASE = "/common/cm-06-home-launcher/scenes/";
  var DESIGNS = ["lobby", "pool", "blueprint", "papercut", "cutaway"];
  var JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
  var one = function (value, allowed) { return allowed.indexOf(value) < 0 ? allowed[0] : value; };

  function load() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem("avivpms.home") || "null"); } catch (e) { /* blocked or broken: default */ }
    saved = saved && typeof saved === "object" ? saved : {};
    return {
      mode: one(saved.mode, ["default", "custom"]),
      kind: one(saved.kind, ["design", "wallpaper"]),
      design: one(saved.design, DESIGNS),
      fit: one(saved.fit, ["fill", "whole"]),
      pos: one(saved.pos, ["center", "top", "bottom"]),
      dim: one(saved.dim, ["none", "soft", "strong"])
    };
  }

  function loadWallpaper() {
    var data = null;
    try { data = localStorage.getItem("avivpms.home.wallpaper"); } catch (e) { /* blocked: no wallpaper */ }
    return data && JPEG.test(data) ? data : null;
  }

  function frame(name) {
    var f = document.createElement("iframe");
    f.className = "zhl-frame";
    f.src = SCENE_BASE + name + ".html";
    f.title = "";
    f.tabIndex = -1;
    f.setAttribute("aria-hidden", "true");
    return f;
  }

  /* Fills host with a scene or the wallpaper. wallpaper = data URL, or null. */
  function render(host, choice, wallpaper) {
    host.replaceChildren();
    if (choice.mode === "custom" && choice.kind === "wallpaper" && wallpaper && JPEG.test(wallpaper)) {
      var url = 'url("' + wallpaper + '")';
      var wall = document.createElement("div");
      wall.className = "zhl-wall";
      wall.dataset.fit = choice.fit;
      wall.dataset.pos = choice.pos;
      wall.dataset.dim = choice.dim;
      ["zhl-wall__back", "zhl-wall__img", "zhl-wall__dim"].forEach(function (cls) {
        var layer = document.createElement("span");
        layer.className = cls;
        if (cls !== "zhl-wall__dim") layer.style.backgroundImage = url;
        wall.appendChild(layer);
      });
      host.appendChild(wall);
    } else if (choice.mode === "custom" && choice.kind === "design") {
      host.appendChild(frame(choice.design));
    } else {
      host.appendChild(frame("backwaters"));
    }
  }

  window.avivHome = { designs: DESIGNS, load: load, loadWallpaper: loadWallpaper, render: render, jpeg: JPEG };

  if (!script || !script.hasAttribute("data-apply")) return;
  var choice = load();
  if (choice.mode !== "custom") return;
  var wallpaper = choice.kind === "wallpaper" ? loadWallpaper() : null;
  if (choice.kind === "wallpaper" && !wallpaper) return;
  document.documentElement.setAttribute("data-home", choice.kind);
  document.addEventListener("DOMContentLoaded", function () {
    var main = document.getElementById("main");
    if (!main) return;
    var host = document.createElement("div");
    host.className = "zhl";
    host.setAttribute("aria-hidden", "true");
    render(host, choice, wallpaper);
    main.appendChild(host);
  });
})();

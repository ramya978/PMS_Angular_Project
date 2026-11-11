/* Aviv theme loader – runs in <head> before the page paints, so a saved theme never flashes the default look.
   Reads the choice saved by the Theme Studio (js/theme/theme-studio.js) and puts it on <html>:
     data-menu   vertical | horizontal      data-nav   deep | brand | tint | light      data-radius   sharp | soft | round      data-surf   dark | light (hero banners and dark cards)
   plus the colour variables (--em-*, --br-*, --deep …). ?menu= / ?nav= / ?radius= in the address win for that page view only. */
(function () {
  var root = document.documentElement;
  var theme = null;
  try {
    theme = JSON.parse(localStorage.getItem("avivpms.theme") || "null");
  } catch (e) { /* storage blocked: the default look */ }
  var q = new URLSearchParams(location.search);
  var one = function (name, allowed, fallback) {
    var v = q.get(name) || (theme && theme[name]) || fallback;
    return allowed.indexOf(v) < 0 ? fallback : v;
  };
  root.setAttribute("data-menu", one("menu", ["vertical", "horizontal"], "vertical"));
  root.setAttribute("data-nav", one("nav", ["deep", "brand", "tint", "light"], "deep"));
  root.setAttribute("data-radius", one("radius", ["sharp", "soft", "round"], "soft"));
  root.setAttribute("data-surf", one("surf", ["dark", "light"], "dark"));
  if (theme && theme.vars) {
    for (var k in theme.vars) {
      if (Object.prototype.hasOwnProperty.call(theme.vars, k)) root.style.setProperty(k, theme.vars[k]);
    }
  }
})();

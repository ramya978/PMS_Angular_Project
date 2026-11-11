/* A launcher design runs in its own frame. When the Theme Studio saves a new theme in the page around it,
   reload so the scene picks up the new colours too. */
(function () {
  if (/[?&]thumb/.test(location.search)) document.documentElement.classList.add("thumb"); // small preview on CM-07
  var timer = 0;
  addEventListener("storage", function (e) {
    if (e.key !== "avivpms.theme") return;
    clearTimeout(timer);
    timer = setTimeout(function () { location.reload(); }, 250);
  });
})();

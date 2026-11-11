// @ts-check
/* CM-07 Home Launcher Setup. A script is needed here: reading an uploaded picture and remembering the choice cannot be done in HTML + CSS.
   The picture is reduced in the browser (longest side 2560 px, JPEG) so it fits in device storage; the backend will store it later. */
(function () {
  const home = /** @type {any} */ (window).avivHome;
  const form = /** @type {HTMLFormElement} */ (document.getElementById("hls-form"));
  const screen = /** @type {HTMLElement} */ (document.getElementById("hls-screen"));
  const nameEl = /** @type {HTMLElement} */ (document.getElementById("hls-name"));
  const status = /** @type {HTMLElement} */ (document.getElementById("hls-status"));
  const custom = /** @type {HTMLElement} */ (document.getElementById("hls-custom"));
  const paneDesign = /** @type {HTMLElement} */ (document.getElementById("hls-pane-design"));
  const paneWall = /** @type {HTMLElement} */ (document.getElementById("hls-pane-wall"));
  const drop = /** @type {HTMLElement} */ (document.getElementById("hls-drop"));
  const file = /** @type {HTMLInputElement} */ (document.getElementById("hls-input"));
  const card = /** @type {HTMLElement} */ (document.getElementById("hls-filecard"));
  const pic = /** @type {HTMLElement} */ (document.getElementById("hls-pic"));
  const fileName = /** @type {HTMLElement} */ (document.getElementById("hls-filename"));
  const fileMeta = /** @type {HTMLElement} */ (document.getElementById("hls-filemeta"));
  const msg = /** @type {HTMLElement} */ (document.getElementById("hls-msg"));
  const adjust = /** @type {HTMLFieldSetElement} */ (document.getElementById("hls-adjust"));

  const MAX_BYTES = 25 * 1024 * 1024;
  const TYPES = ["image/jpeg", "image/png", "image/webp"];
  // Largest first; the first that fits under the storage limit is kept.
  const SIZES = [[2560, 0.85], [1920, 0.8], [1600, 0.74], [1280, 0.7]];
  const STORE_LIMIT = 3200000; // characters of the data URL

  const NAMES = {
    lobby: "The Grand Lobby",
    pool: "Infinity Pool at Sunset",
    blueprint: "Architect's Blueprint",
    papercut: "Tropical Papercut",
    cutaway: "Hotel Cutaway"
  };

  let savedChoice = home.load();
  let savedWall = home.loadWallpaper();
  let wall = savedWall;
  let wallName = savedWall ? "Saved wallpaper" : "";
  let wallSize = "";
  let shown = "";

  const value = (/** @type {string} */ name) => {
    const el = form.elements.namedItem(name);
    return el instanceof RadioNodeList ? el.value : "";
  };
  const setValue = (/** @type {string} */ name, /** @type {string} */ v) => {
    const el = form.elements.namedItem(name);
    if (el instanceof RadioNodeList) el.value = v;
  };

  function draft() {
    return {
      mode: value("mode"), kind: value("kind"), design: value("design"),
      fit: value("fit"), pos: value("pos"), dim: value("dim")
    };
  }

  function say(/** @type {string} */ text, /** @type {string} */ kind = "error") {
    msg.textContent = text;
    msg.dataset.kind = kind;
    msg.hidden = !text;
  }

  function label(/** @type {any} */ c) {
    if (c.mode !== "custom") return "Default · Backwaters at Blue Hour";
    if (c.kind === "wallpaper") return wall ? "Your wallpaper" : "Your wallpaper · no picture yet";
    return /** @type {any} */ (NAMES)[c.design];
  }

  function isChanged(/** @type {any} */ c) {
    if (wall !== savedWall) return true;
    return JSON.stringify(c) !== JSON.stringify(savedChoice);
  }

  function setStatus(/** @type {string} */ state, /** @type {string} */ text) {
    status.dataset.state = state;
    status.textContent = text;
  }

  function refresh() {
    const c = draft();
    custom.hidden = c.mode !== "custom";
    paneDesign.hidden = c.kind !== "design";
    paneWall.hidden = c.kind !== "wallpaper";
    adjust.disabled = !wall;
    card.hidden = !wall;
    if (wall) {
      pic.style.backgroundImage = 'url("' + wall + '")';
      fileName.textContent = wallName;
      fileMeta.textContent = wallSize || "Saved on this device";
    }
    nameEl.textContent = label(c);
    // Do not restart an animated scene when nothing visible has changed.
    const key = c.mode !== "custom" ? "default" : c.kind === "design" ? "d:" + c.design : wall ? "w:" + wall.length + c.fit + c.pos + c.dim : "empty";
    if (key !== shown) {
      shown = key;
      if (key === "empty") {
        screen.replaceChildren();
      } else {
        const host = document.createElement("div");
        host.className = "zhl";
        home.render(host, c, wall);
        screen.replaceChildren(host);
      }
    }
    if (isChanged(c)) setStatus("changed", "Not saved yet");
    else setStatus("saved", "Showing on the Home Launcher");
  }

  /** @returns {Promise<{url: string, w: number, h: number}>} */
  function shrink(/** @type {File} */ f) {
    return new Promise((resolve, reject) => {
      const src = URL.createObjectURL(f);
      const img = new Image();
      img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("decode")); };
      img.onload = () => {
        URL.revokeObjectURL(src);
        const w0 = img.naturalWidth, h0 = img.naturalHeight;
        if (!w0 || !h0) { reject(new Error("decode")); return; }
        for (const [edge, quality] of SIZES) {
          const k = Math.min(1, edge / Math.max(w0, h0));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(w0 * k);
          canvas.height = Math.round(h0 * k);
          const ctx = canvas.getContext("2d");
          if (!ctx) break;
          ctx.fillStyle = "#fff"; // a transparent PNG becomes white, not black
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const url = canvas.toDataURL("image/jpeg", quality);
          if (url.length <= STORE_LIMIT) { resolve({ url, w: w0, h: h0 }); return; }
        }
        reject(new Error("size"));
      };
      img.src = src;
    });
  }

  async function take(/** @type {File|undefined} */ f) {
    if (!f) return;
    say("");
    if (!TYPES.includes(f.type)) { say("Please choose a JPG, PNG or WebP picture."); return; }
    if (f.size > MAX_BYTES) { say("That picture is larger than 25 MB. Please choose a smaller one."); return; }
    try {
      const { url, w, h } = await shrink(f);
      wall = url;
      wallName = f.name;
      wallSize = w + " × " + h + " px";
      if (w < 1280) say("This picture is small, so it may look soft on a large screen. 1920 × 1080 px or larger looks best.", "warn");
      else if (h > w) say("This picture is upright. A wide (landscape) picture fills the screen better.", "warn");
      refresh();
    } catch (e) {
      say(e instanceof Error && e.message === "size" ? "That picture is too detailed to store on this device. Please try a smaller one." : "That file could not be opened as a picture. Please try another one.");
    }
  }

  function save() {
    const c = draft();
    say("");
    if (c.mode === "custom" && c.kind === "wallpaper" && !wall) {
      say("Upload a picture first, or choose one of the designs.");
      setStatus("error", "Not saved");
      return;
    }
    try {
      if (wall !== savedWall) {
        if (wall) localStorage.setItem("avivpms.home.wallpaper", wall);
        else localStorage.removeItem("avivpms.home.wallpaper");
      }
      localStorage.setItem("avivpms.home", JSON.stringify(c));
    } catch (e) {
      say("This device has no room left to store the picture. Please try a smaller one.");
      setStatus("error", "Not saved");
      return;
    }
    savedChoice = home.load();
    savedWall = wall;
    refresh();
  }

  // Put the saved choice on the form.
  setValue("mode", savedChoice.mode);
  setValue("kind", savedChoice.kind);
  setValue("design", savedChoice.design);
  setValue("fit", savedChoice.fit);
  setValue("pos", savedChoice.pos);
  setValue("dim", savedChoice.dim);
  savedChoice = draft();

  form.addEventListener("change", (e) => {
    if (e.target === file) {
      take(file.files ? file.files[0] : undefined);
      file.value = "";
      return;
    }
    say("");
    refresh();
  });
  form.addEventListener("submit", (e) => { e.preventDefault(); save(); });
  document.getElementById("hls-remove")?.addEventListener("click", () => {
    wall = null;
    wallName = wallSize = "";
    say("");
    refresh();
  });

  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", (e) => { const dt = /** @type {DragEvent} */ (e).dataTransfer; take(dt && dt.files ? dt.files[0] : undefined); });

  // Leaving with unsaved changes would lose them quietly.
  addEventListener("beforeunload", (e) => { if (isChanged(draft())) e.preventDefault(); });

  refresh();
})();

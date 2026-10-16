// Contra Web Port — boot logic. Dual-mode cartridge loading:
//   1. local copy  : roms/Contra (USA).nes sits next to the page -> auto-load
//   2. hosted copy : the repo carries no ROM, so the visitor supplies their own
//                    .nes once; it is kept in IndexedDB and auto-loads next visit.
// The picked file never leaves the browser — it is read locally, never uploaded.
(() => {
  "use strict";

  const chip = document.getElementById("status-chip");
  const runState = document.getElementById("run-state");
  const bootLayer = document.getElementById("screen-boot");
  const crtToggle = document.getElementById("crt-toggle");
  const scanlines = document.getElementById("scanlines");
  const launchBtn = document.getElementById("launch-btn");
  const mount = document.getElementById("game");
  const picker = document.getElementById("rom-picker");
  const fileInput = document.getElementById("rom-file");
  const dropZone = document.getElementById("drop-zone");
  const swapBtn = document.getElementById("swap-cart");
  const crtFrame = document.querySelector(".crt-frame");

  const setStatus = (cls, label) => {
    chip.className = `status-chip ${cls}`;
    chip.textContent = label;
    runState.textContent = label;
  };

  const crtOn = () => {
    scanlines.classList.remove("off");
    crtToggle.classList.add("is-active");
  };

  const crtOff = () => {
    scanlines.classList.add("off");
    crtToggle.classList.remove("is-active");
  };

  crtToggle.addEventListener("click", () => {
    scanlines.classList.contains("off") ? crtOn() : crtOff();
  });

  // Safety net: hide the attract layer as soon as the chip reads RUNNING,
  // regardless of which callback name the emulator build actually calls.
  new MutationObserver(() => {
    if (chip.classList.contains("is-running")) bootLayer.classList.add("off");
  }).observe(chip, { attributes: true, attributeFilter: ["class"] });

  // Second net, version-independent: the moment a canvas exists in the mount,
  // the emulation is visually live — clear the overlay. Deadline sweep covers
  // any build that renders without muting the chip.
  new MutationObserver(() => {
    if (mount.querySelector("canvas, .ejs_canvas, iframe")) bootLayer.classList.add("off");
  }).observe(mount, { childList: true, subtree: true });
  setInterval(() => {
    if (launchBtn.disabled && mount.querySelector("canvas, iframe")) bootLayer.classList.add("off");
  }, 800);

  // ---------- cartridge store (IndexedDB) ----------

  const DB_NAME = "contra-port";
  const STORE = "cartridges";
  const KEY = "cart";

  const idbOpen = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  async function idbRun(mode, action) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = action(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  const readCart = () => idbRun("readonly", (s) => s.get(KEY)).catch(() => null);
  const writeCart = (name, buffer) =>
    idbRun("readwrite", (s) => s.put({ name, buffer, saved: Date.now() }, KEY)).catch(() => null);
  const clearCart = () => idbRun("readwrite", (s) => s.delete(KEY)).catch(() => null);

  // NES header magic: "NES\x1a"
  const isNes = (buffer) => {
    const b = new Uint8Array(buffer.slice(0, 4));
    return b[0] === 0x4e && b[1] === 0x45 && b[2] === 0x53 && b[3] === 0x1a;
  };

  const cartUrl = (cart) =>
    URL.createObjectURL(new Blob([cart.buffer], { type: "application/octet-stream" }));

  const cartLabel = (name) => (name || "cartridge").replace(/\.nes$/i, "");

  // ---------- cartridge sources ----------

  async function localRomUrl() {
    try {
      const r = await fetch("roms/Contra%20(USA).nes", { method: "HEAD" });
      if (r.ok) return "roms/Contra%20(USA).nes";
    } catch (_) { /* hosted build: no ROM next to the page — expected */ }
    return null;
  }

  async function acquireCartridge() {
    const local = await localRomUrl();
    if (local) return { url: local, name: "Contra" };

    const stored = await readCart();
    if (stored && stored.buffer) return { url: cartUrl(stored), name: cartLabel(stored.name) };

    return null; // ask the visitor
  }

  // ---------- visitor-supplied cartridge ----------

  function openPicker() {
    picker.hidden = false;
    setStatus("is-standby", "INSERT CART");
    launchBtn.style.display = "none";
  }

  async function acceptFile(file) {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    if (!isNes(buffer)) {
      setStatus("is-standby", "BAD CART");
      dropZone.classList.add("reject");
      setTimeout(() => dropZone.classList.remove("reject"), 1200);
      return;
    }
    await writeCart(file.name, buffer);
    powerOn(cartUrl({ buffer }), cartLabel(file.name));
  }

  fileInput.addEventListener("change", () => acceptFile(fileInput.files[0]));

  ["dragenter", "dragover"].forEach((ev) =>
    crtFrame.addEventListener(ev, (e) => {
      if (picker.hidden) return;
      e.preventDefault();
      dropZone.classList.add("over");
    }));
  ["dragleave", "drop"].forEach((ev) =>
    crtFrame.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.remove("over");
    }));
  crtFrame.addEventListener("drop", (e) => {
    if (picker.hidden) return;
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) acceptFile(file);
  });

  swapBtn.addEventListener("click", async () => {
    await clearCart();
    if (mount.childElementCount > 0) location.reload();
  });

  // ---------- power-on ----------

  launchBtn.addEventListener("click", async () => {
    launchBtn.disabled = true;
    setStatus("is-loading", "LOADING");
    const cart = await acquireCartridge();
    if (cart) return powerOn(cart.url, cart.name);
    launchBtn.disabled = false;
    launchBtn.style.display = "none";
    openPicker();
  }, { once: true });

  function powerOn(romUrl, romName) {
    // EmulatorJS reads its config from window globals at loader time.
    // defaultControllers: P1 — NES honoured buttons are indices 0..7.
    window.EJS_player = "#game";
    window.EJS_core = "nes";                     // -> fceumm core (bundled in emulator/data/cores)
    window.EJS_pathtodata = "emulator/data/";
    window.EJS_gameUrl = romUrl;
    window.EJS_gameName = romName;
    window.EJS_startOnLoaded = true;
    window.EJS_color = "#e8442d";
    window.EJS_volume = 0.5;
    window.EJS_defaultOptions = { "save-state-location": "browser" };
    window.EJS_defaultControllers = {
      0: {
        0: { value: "x", value2: "BUTTON_2" },           // A (jump)
        1: { value: "z", value2: "BUTTON_4" },           // B (fire)
        2: { value: "v", value2: "SELECT" },
        3: { value: "enter", value2: "START" },
        4: { value: "up arrow", value2: "DPAD_UP" },
        5: { value: "down arrow", value2: "DPAD_DOWN" },
        6: { value: "left arrow", value2: "DPAD_LEFT" },
        7: { value: "right arrow", value2: "DPAD_RIGHT" }
      }
    };
    window.EJS_Ready = () => {
      bootLayer.classList.add("off");
      setStatus("is-loading", "LOADING");
    };
    window.EJS_onGameStart = () => {
      bootLayer.classList.add("off");
      setStatus("is-running", "RUNNING");
    };

    const loader = document.createElement("script");
    loader.src = "emulator/data/loader.js?v=2";
    loader.onerror = () => setStatus("is-standby", "ERROR");
    document.body.appendChild(loader);

    setStatus("is-loading", "LOADING");
  }
})();

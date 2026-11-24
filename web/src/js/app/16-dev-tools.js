/* Entwickler-Werkzeuge: Spur der letzten Schritte, Wischgesten ohne Wirkung, Fingerspur, FPS, Entwickler-Menü */
const DBG = {
  log: [],
  errs: [],
  g: null,
  trails: [],
  raf: 0,
  fpsRaf: 0,
  lastView: null,
  taps: [],
};
const dbgLS = (k, v) => {
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch (_) {
    return null;
  }
};
DBG.on = dbgLS("hb-dev") === "1";
DBG.touch = DBG.on && dbgLS("hb-dev-touch") === "1";
DBG.fps = DBG.on && dbgLS("hb-dev-fps") === "1";
try {
  DBG.errs = JSON.parse(dbgLS("hb-dev-errs") || "[]").slice(-20);
} catch (_) {
  DBG.errs = [];
}
function dbgEl(n) {
  if (!n || n.nodeType !== 1) return "?";
  const out = [];
  for (
    let e = n, i = 0;
    e && e !== document.body && e !== document.documentElement && i < 3;
    e = e.parentElement, i++
  ) {
    let s = e.tagName.toLowerCase();
    if (e.id && !/^[0-9a-f-]{20,}$/.test(e.id)) {
      out.unshift(s + "#" + e.id);
      break;
    }
    const d = ["go", "spgo", "view", "hb", "fbk", "ci", "fbpg", "acx", "openshop", "hbclose"].find(
      (k) => e.dataset && e.dataset[k] != null
    );
    if (d) s += `[data-${d}=${String(e.dataset[d]).slice(0, 24)}]`;
    else if (e.classList.length) s += "." + [...e.classList].slice(0, 2).join(".");
    out.unshift(s);
  }
  return out.join(" › ");
}
function dbgAdd(k, s) {
  const now = Date.now();
  DBG.log.push({
    t: now,
    k,
    s: String(s || "").slice(0, 180),
  });
  while (DBG.log.length > 300 || (DBG.log.length && now - DBG.log[0].t > 180000)) DBG.log.shift();
  if (DBG.on && $("devBg") && !$("devBg").hidden) devLogRender();
}
function dbgSince(ms) {
  const now = Date.now();
  return DBG.log
    .filter((x) => now - x.t <= ms)
    .map((x) => `${((x.t - now) / 1000).toFixed(1).padStart(6)} s  ${x.k.padEnd(6)} ${x.s}`)
    .join("\n");
}
function dbgSig(el) {
  const st = el && el.closest && el.closest(".astack,.srail");
  let sc = 0;
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    if (e.scrollWidth > e.clientWidth + 2) sc += e.scrollLeft;
  }
  return [
    typeof ui !== "undefined" && ui.view,
    typeof ui !== "undefined" && ui.cardIdx,
    typeof ui !== "undefined" && ui.zkIdx,
    typeof ui !== "undefined" && ui.ym,
    document.querySelectorAll(".backdrop:not([hidden]),.hobg:not([hidden])").length,
    st
      ? [...st.children]
          .slice(0, 8)
          .map((c) => c.style.transform)
          .join(",")
      : "",
    Math.round(sc),
    scrollY >> 3,
  ].join("|");
}
const DBG_NOSWIPE =
  "input,textarea,select,.sheet,.backdrop,.hobg,[data-noswipe],.bt3,.bubbles,.fxchips,#monthpill,.tabs,nav,.tmview,#tourBg,.pcfbsheet";
function dbgDead(g, dx, dy, dt) {
  const want = g.el.closest(".astack:not(.one),.srail")
    ? "Karten/Leiste"
    : !IS_PC && !g.el.closest(DBG_NOSWIPE) && !document.body.classList.contains("locked")
      ? "Seitenwechsel"
      : null;
  if (!want) return;
  const info = `Erwartet: ${want}\nElement: ${dbgEl(g.el)}\nAnsicht: ${(typeof ui !== "undefined" && ui.view) || "?"}\nStrecke: dx ${Math.round(dx)} / dy ${Math.round(dy)} px in ${Math.round(dt)} ms`;
  dbgAdd("tot", `${want} – ${dbgEl(g.el)}`);
  g.dead = true;
  if (typeof window.hbAutoReport === "function")
    window.hbAutoReport(`Verdacht: Wischgeste ohne Wirkung (${want})`, info);
}
document.addEventListener(
  "pointerdown",
  (e) => {
    if (!e.isPrimary) return;
    const g = (DBG.g = {
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      el: e.target,
      touch: e.pointerType === "touch",
      max: 0,
      lx: e.clientX,
      ly: e.clientY,
      sig: null,
      pts: [[e.clientX, e.clientY]],
    });
    /* Zustand erst im nächsten Bild lesen: dbgSig misst Scroll-Breiten, und das würde hier
       beim Aufsetzen des Fingers ein komplettes Neu-Layout erzwingen */
    requestAnimationFrame(() => {
      g.sig = dbgSig(g.el);
    });
    if (DBG.touch) dbgTrail(DBG.g);
  },
  {
    capture: true,
    passive: true,
  }
);
document.addEventListener(
  "pointermove",
  (e) => {
    const g = DBG.g;
    if (!g || !e.isPrimary) return;
    g.lx = e.clientX;
    g.ly = e.clientY;
    g.max = Math.max(g.max, Math.hypot(e.clientX - g.x, e.clientY - g.y));
    if (DBG.touch && g.pts.length < 400) {
      g.pts.push([e.clientX, e.clientY]);
      dbgDraw();
    }
  },
  {
    capture: true,
    passive: true,
  }
);
const dbgUp = (e) => {
  const g = DBG.g;
  if (!g || !e.isPrimary) return;
  DBG.g = null;
  if (e.type === "pointerup" && (e.clientX || e.clientY)) {
    g.lx = e.clientX;
    g.ly = e.clientY;
    g.max = Math.max(g.max, Math.hypot(g.lx - g.x, g.ly - g.y));
  }
  g.cx = e.type === "pointercancel";
  const dx = g.lx - g.x,
    dy = g.ly - g.y,
    dt = performance.now() - g.t;
  if (g.max < 12) {
    dbgAdd("tipp", dbgEl(g.el));
    g.kind = "tap";
  } else {
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "←" : "→") : dy < 0 ? "↑" : "↓";
    dbgAdd("wisch", `${dir} ${Math.round(Math.hypot(dx, dy))} px${g.cx ? " (abgebrochen)" : ""} · ${dbgEl(g.el)}`);
    g.kind = "swipe";
    const ax = Math.abs(dx),
      cardish = g.el && g.el.closest && g.el.closest(".astack:not(.one),.srail"),
      far = cardish ? ax > 90 : ax > innerWidth * 0.4 || (ax / Math.max(1, dt) > 0.75 && ax > innerWidth * 0.2);
    /* nur melden, wenn die Geste auch wirklich hätte wechseln müssen (kurze, langsame Wischer wechseln absichtlich nicht) */
    if (g.touch && far && Math.abs(dy) < ax * 0.5 && dt < 900)
      setTimeout(() => {
        if (g.sig !== null && dbgSig(g.el) === g.sig) dbgDead(g, dx, dy, dt);
      }, 900);
  }
  g.end = performance.now();
  if (DBG.touch) dbgDraw();
};
document.addEventListener("pointerup", dbgUp, {
  capture: true,
  passive: true,
});
document.addEventListener(
  "pointercancel",
  (e) => {
    const g = DBG.g;
    if (g) {
      g.cancel = true;
      dbgUp(e);
    }
  },
  {
    capture: true,
    passive: true,
  }
);
setInterval(() => {
  const v = typeof ui !== "undefined" && ui.view;
  if (v && v !== DBG.lastView) {
    if (DBG.lastView) dbgAdd("seite", v);
    DBG.lastView = v;
  }
}, 600);
function dbgErr(msg) {
  dbgAdd("fehler", msg);
  DBG.errs.push({
    t: Date.now(),
    m: String(msg).slice(0, 300),
    v: typeof ui !== "undefined" && ui.view,
  });
  DBG.errs = DBG.errs.slice(-20);
  dbgLS("hb-dev-errs", JSON.stringify(DBG.errs));
}
addEventListener("error", (e) => dbgErr(e.message || "Fehler"));
addEventListener("unhandledrejection", (e) => {
  const r = e.reason;
  dbgErr((r && r.message) || String(r));
});
/* Fingerspur */
function dbgCanvas() {
  let c = $("devTouch");
  if (!c) {
    c = document.createElement("canvas");
    c.id = "devTouch";
    c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
  }
  return c;
}
function dbgTrail(g) {
  DBG.trails.push(g);
  if (DBG.trails.length > 6) DBG.trails.shift();
  dbgDraw();
}
function dbgDraw() {
  if (DBG.raf) return;
  DBG.raf = requestAnimationFrame(dbgFrame);
}
function dbgFrame() {
  DBG.raf = 0;
  const c = dbgCanvas(),
    dpr = devicePixelRatio || 1,
    W = innerWidth,
    H = innerHeight;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  const x = c.getContext("2d");
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement),
    acc = (cs.getPropertyValue("--accent") || "#1a7a5c").trim(),
    bad = "#e5484d",
    now = performance.now();
  let alive = false;
  DBG.trails = DBG.trails.filter((g) => !g.end || now - g.end < 1600);
  for (const g of DBG.trails) {
    const age = g.end ? (now - g.end) / 1600 : 0,
      a = 1 - age;
    alive = true;
    const col = g.dead ? bad : acc;
    x.globalAlpha = Math.max(0, a);
    x.strokeStyle = col;
    x.fillStyle = col;
    x.lineWidth = 5;
    x.lineCap = "round";
    x.lineJoin = "round";
    x.beginPath();
    g.pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
    x.stroke();
    const [sx, sy] = g.pts[0];
    x.globalAlpha = Math.max(0, a * 0.35);
    x.beginPath();
    x.arc(sx, sy, 18 + (g.end ? age * 26 : Math.sin(now / 160) * 4), 0, 7);
    x.fill();
    if (g.end) {
      const [ex, ey] = g.pts[g.pts.length - 1];
      const lab = g.dead ? uiText("dev_k_tot") : g.kind === "tap" ? uiText("dev_k_tipp") : uiText("dev_k_wisch");
      x.globalAlpha = Math.max(0, a);
      x.font = "600 12px system-ui,sans-serif";
      const w = x.measureText(lab).width + 14;
      const lx = Math.min(W - w - 6, Math.max(6, ex - w / 2)),
        ly = Math.max(8, ey - 40);
      x.fillStyle = col;
      x.beginPath();
      x.roundRect ? x.roundRect(lx, ly, w, 22, 11) : x.rect(lx, ly, w, 22);
      x.fill();
      x.fillStyle = "#fff";
      x.fillText(lab, lx + 7, ly + 15);
    }
  }
  x.globalAlpha = 1;
  if (alive) DBG.raf = requestAnimationFrame(dbgFrame);
}
/* Ruckel-Anzeige */
function dbgFpsOn(on) {
  let el = $("devFps");
  cancelAnimationFrame(DBG.fpsRaf);
  DBG.fpsRaf = 0;
  if (!on) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("div");
    el.id = "devFps";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  let n = 0,
    t0 = performance.now(),
    last = t0,
    worst = 0;
  const loop = (t) => {
    n++;
    worst = Math.max(worst, t - last);
    last = t;
    if (t - t0 >= 1000) {
      const f = Math.round((n * 1000) / (t - t0));
      el.innerHTML = `<b>${f}</b> FPS<small>${Math.round(worst)} ms</small>`;
      el.className = f < 40 || worst > 80 ? "bad" : f < 55 ? "mid" : "";
      n = 0;
      t0 = t;
      worst = 0;
    }
    DBG.fpsRaf = requestAnimationFrame(loop);
  };
  DBG.fpsRaf = requestAnimationFrame(loop);
}
/* Entwickler-Menü – 7× auf die Versionsnummer tippen */
document.addEventListener("click", (e) => {
  const v = e.target.closest(".appfoot small,#pcVer");
  if (!v) return;
  if (DBG.on) {
    devOpen();
    return;
  }
  const now = Date.now();
  DBG.taps = DBG.taps.filter((t) => now - t < 3000);
  DBG.taps.push(now);
  const left = 7 - DBG.taps.length;
  v.animate(
    [
      {
        transform: "scale(1)",
      },
      {
        transform: "scale(1.12)",
      },
      {
        transform: "scale(1)",
      },
    ],
    {
      duration: 220,
    }
  );
  if (left <= 0) {
    DBG.taps = [];
    DBG.on = true;
    dbgLS("hb-dev", "1");
    toast(uiText("dev_on"));
    devOpen();
  } else if (left <= 3)
    toast(
      uiText("dev_more", {
        n: left,
      }),
      null,
      null,
      1200
    );
});
function dbgStore() {
  let b = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      b += (k.length + (localStorage.getItem(k) || "").length) * 2;
    }
  } catch (_) {}
  return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.round(b / 1024) + " KB";
}
function devOpen() {
  const body = hbSheet("devBg", uiText("dev_t"));
  body.innerHTML = devHtml();
  devLogRender();
}
/* Inhalt der Fehlersuche – im Fenster und auf der Entwickler-Seite am PC */
function devHtml() {
  const dev = window.AndroidBridge ? (IS_DESK ? "PC" : IS_TAB ? "Tablet" : "Android") : "Browser";
  const kv = [
    [uiText("dev_ver"), "v" + curVerShort()],
    [uiText("dev_dev"), `${dev} · ${devModel()}`],
    [uiText("dev_scr"), `${innerWidth}×${innerHeight} @${(devicePixelRatio || 1).toFixed(2)}`],
    [uiText("dev_view"), (ui.view || "?") + " · " + LANG],
    [uiText("dev_mem"), dbgStore()],
  ];
  const sw = (k, on, t, s, i) =>
    `<label class="devsw" style="--i:${i}"><span class="devswt"><b>${t}</b><small>${s}</small></span><input type="checkbox" data-devsw="${k}" ${on ? "checked" : ""}><span class="devtg" aria-hidden="true"></span></label>`;
  return `<div class="devwrap">
    <div class="devh" style="--i:0">${uiText("dev_info")}</div><div class="devkv" style="--i:1">${kv.map(([k, v]) => `<div><small>${escHtml(k)}</small><b>${escHtml(v)}</b></div>`).join("")}</div>
    <button class="pvdevbtn" data-pvopen="1" style="--i:2"><span class="pvwr" aria-hidden="true">${PV_WR}</span><span><b>${escHtml(uiText("pv_t"))}</b><small>${escHtml(uiText("pv_btn_s"))}</small></span></button>
    <div class="devh" style="--i:2">${uiText("dev_show")}</div>
    ${sw("touch", DBG.touch, uiText("dev_touch"), uiText("dev_touch_s"), 3)}${sw("fps", DBG.fps, uiText("dev_fps"), uiText("dev_fps_s"), 4)}
    <div class="devh" style="--i:5">${uiText("dev_act")}</div>
    <div class="devbtns" style="--i:6"><button class="btn" data-devact="tours">${svgIcon("spark", 16)}${uiText("dev_tours")}</button><button class="btn" data-devact="sync">${svgIcon("repeat", 16)}${uiText("dev_sync")}</button><button class="btn" data-devact="test">${svgIcon("send", 16)}${uiText("dev_test")}</button></div>
    <div class="devh" style="--i:7">${uiText("dev_log")}<span class="devhb"><button class="link small" data-devact="copy">${uiText("dev_copy")}</button><button class="link small" data-devact="clear">${uiText("dev_clear")}</button></span></div>
    <div class="devlog" id="devLog" style="--i:8"></div>
    <div class="devh" style="--i:9">${uiText("dev_errs")}</div>
    <div class="devlog" id="devErrs" style="--i:10"></div>
    <button class="btn devoff" data-devact="off" style="--i:11">${svgIcon("x", 16)}${uiText("dev_off")}</button></div>`;
}
function devLogRender() {
  const el = $("devLog");
  if (!el) return;
  const now = Date.now(),
    L = DBG.log.slice(-40).reverse();
  el.innerHTML = L.length
    ? L.map(
        (x) =>
          `<div class="devli k-${x.k}"><span class="devlt">${((x.t - now) / 1000).toFixed(1)} s</span><span class="devlk">${uiText("dev_k_" + x.k)}</span><span class="devls">${escHtml(x.s)}</span></div>`
      ).join("")
    : `<p class="muted small">${uiText("dev_log0")}</p>`;
  const er = $("devErrs");
  if (er)
    er.innerHTML = DBG.errs.length
      ? DBG.errs
          .slice()
          .reverse()
          .map(
            (x) =>
              `<div class="devli k-fehler"><span class="devlt">${new Date(x.t).toLocaleString(cLoc(), {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}</span><span class="devls">${escHtml(x.m)}${x.v ? ` <small>(${escHtml(x.v)})</small>` : ""}</span></div>`
          )
          .join("")
      : `<p class="muted small">${uiText("dev_errs0")}</p>`;
}
document.addEventListener("change", (e) => {
  if (e.target.id === "fbRec") {
    ui.fbRec = e.target.checked;
    return;
  }
  if (e.target.id === "fbShotOn") {
    ui.fbShotOn = e.target.checked;
    renderFeedback();
    return;
  }
  const s = e.target.closest("[data-devsw]");
  if (!s) return;
  const k = s.dataset.devsw,
    on = s.checked;
  if (k === "touch") {
    DBG.touch = on;
    dbgLS("hb-dev-touch", on ? "1" : null);
    if (!on) {
      DBG.trails = [];
      const c = $("devTouch");
      if (c) c.remove();
    }
  }
  if (k === "fps") {
    DBG.fps = on;
    dbgLS("hb-dev-fps", on ? "1" : null);
    dbgFpsOn(on);
  }
});
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-devact]");
  if (!b) return;
  const a = b.dataset.devact;
  if (a === "tours") {
    ["hb-ptour", "hb-tour", "hb-tourdone", "hb-seen-tour"].forEach((k) => dbgLS(k, null));
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (/^hb-(p?tour)/.test(k)) localStorage.removeItem(k);
      }
    } catch (_) {}
    toast(uiText("dev_tours_ok"));
  }
  if (a === "sync") {
    try {
      await syncNow();
    } catch (_) {}
  }
  if (a === "test") {
    if (typeof window.hbAutoReport === "function")
      window.hbAutoReport("Testbericht aus dem Entwickler-Menü", "Absichtlich ausgelöst – alles gut.", true);
    toast(uiText("dev_test_ok"));
  }
  if (a === "copy") {
    const t = `Finanz MAMI ${verFull()} · ${devModel()} · ${innerWidth}×${innerHeight}\n\nLetzte Schritte:\n${dbgSince(180000)}\n\nFehler:\n${DBG.errs.map((x) => new Date(x.t).toISOString() + "  " + x.m).join("\n") || "–"}`;
    try {
      await navigator.clipboard.writeText(t);
      toast(uiText("dev_copied"));
    } catch (_) {
      if (window.AndroidBridge && AndroidBridge.copySecret) AndroidBridge.copySecret(t, 300);
      toast(uiText("dev_copied"));
    }
  }
  if (a === "clear") {
    DBG.log = [];
    DBG.errs = [];
    dbgLS("hb-dev-errs", null);
    devLogRender();
  }
  if (a === "off") {
    DBG.on = false;
    DBG.touch = false;
    DBG.fps = false;
    ["hb-dev", "hb-dev-touch", "hb-dev-fps"].forEach((k) => dbgLS(k, null));
    dbgFpsOn(false);
    const c = $("devTouch");
    if (c) c.remove();
    hbSheetClose("devBg");
  }
});
if (DBG.fps) setTimeout(() => dbgFpsOn(true), 1500);
/* Bildschirmfoto für Fehlermeldungen (Android / PC-App) */
async function hbShot() {
  try {
    const B = window.AndroidBridge;
    if (!B || !B.screenshot) return null;
    const r = B.desktop
      ? await B.screenshot()
      : await new Promise((res) => {
          const t = setTimeout(() => res(null), 2500);
          window.hbShotCb = (d) => {
            clearTimeout(t);
            window.hbShotCb = null;
            res(d);
          };
          B.screenshot();
        });
    return typeof r === "string" && r.startsWith("data:image/") ? r : null;
  } catch (_) {
    return null;
  }
}
/* Absturz der Android-App beim letzten Mal? */
setTimeout(() => {
  try {
    const B = window.AndroidBridge;
    if (B && B.lastCrash) {
      const c = B.lastCrash();
      if (c && typeof window.hbAutoReport === "function")
        window.hbAutoReport("Android-App ist abgestürzt (beim letzten Start)", c);
    }
  } catch (_) {}
}, 6000);
/* Abstürze melden sich selbst */
(function () {
  const send = (msg, where, force) => {
    try {
      msg = String(msg || "").slice(0, 600);
      if (
        !msg ||
        /^Script error\.?$/i.test(msg) ||
        /ResizeObserver loop|Extension context|chrome-extension:/.test(msg + where)
      )
        return;
      if (window.claude || !window.AndroidBridge || !pairUrl()) return;
      const day = new Date().toISOString().slice(0, 10),
        key = (msg + "|" + String(where || "").split("\n")[0]).slice(0, 200);
      let st = {};
      try {
        st = JSON.parse(localStorage.getItem("hb-crash") || "{}");
      } catch (_) {}
      if (st.d !== day)
        st = {
          d: day,
          n: 0,
          k: {},
        };
      if (!force && (st.k[key] || st.n >= 10)) return;
      st.k[key] = 1;
      st.n++;
      try {
        localStorage.setItem("hb-crash", JSON.stringify(st));
      } catch (_) {}
      const info = `Finanz MAMI ${verFull()} · ${IS_DESK ? "PC" : IS_TAB ? "Tablet" : "Android"} · ${devModel()} · Ansicht: ${(typeof ui !== "undefined" && ui.view) || "?"}`;
      const steps = typeof dbgSince === "function" ? dbgSince(30000) : "";
      setTimeout(
        () =>
          fbPost({
            kind: "absturz",
            text: `${msg}\n\n${String(where || "").slice(0, 3000)}${steps ? `\n\nLetzte Schritte (30 s):\n${steps.slice(-2500)}` : ""}\n\n---\n${info}`,
          }).catch(() => {}),
        2500
      );
    } catch (_) {}
  };
  addEventListener("error", (e) =>
    send(e.message, (e.error && e.error.stack) || (e.filename ? e.filename + ":" + e.lineno + ":" + e.colno : ""))
  );
  addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    send((r && r.message) || String(r), (r && r.stack) || "");
  });
  window.hbAutoReport = send;
})();
/* Versions-Ping */
function verPing() {
  try {
    if (window.claude || !window.AndroidBridge || !pairUrl()) return;
    const day = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("hb-ping") === day + "|" + curVerShort()) return;
    pairCall("ping", "", {
      dev: devId(),
      ver: curVerShort(),
      form: devForm(),
      role: verRole(),
    })
      .then(() => {
        try {
          localStorage.setItem("hb-ping", day + "|" + curVerShort());
        } catch (_) {}
      })
      .catch(() => {});
  } catch (_) {}
}
setTimeout(verPing, 15000);
setInterval(verPing, 6 * 3600e3);

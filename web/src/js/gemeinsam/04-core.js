/* ===== Bewegung: lebhaft, sanft (Standard) oder aus ===== */
const MOTION_KEY = "hb-motion";
function motionMode() {
  let m = null;
  try {
    m = localStorage.getItem(MOTION_KEY);
  } catch (_) {}
  if (m === "live" || m === "soft" || m === "off") return m;
  return matchMedia("(prefers-reduced-motion: reduce)").matches ? "off" : "soft";
}
const motionOff = () => motionMode() === "off";
function motionApply() {
  document.documentElement.dataset.motion = motionMode();
}
function motionSet(m) {
  try {
    localStorage.setItem(MOTION_KEY, m);
  } catch (_) {}
  motionApply();
}
motionApply();
/* Federnde Kurven (Überschwinger) werden bei „sanft“ auf ein Fünftel gedämpft,
   bei „aus“ laufen Animationen ohne Dauer – Ereignisse wie finish feuern trotzdem. */
(() => {
  const orig = Element.prototype.animate;
  if (!orig) return;
  const soften = (v) => (+v > 1 ? (1 + (+v - 1) * 0.2).toFixed(3) : v);
  const calm = (e) =>
    typeof e === "string"
      ? e.replace(
          /cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g,
          (_, a, b, c, d) => `cubic-bezier(${a},${soften(b)},${c},${soften(d)})`
        )
      : e;
  Element.prototype.animate = function (kf, opt) {
    const m = document.documentElement.dataset.motion;
    if (m === "soft" || m === "off") {
      if (opt && typeof opt === "object") {
        opt = { ...opt, easing: calm(opt.easing) };
        if (m === "off") Object.assign(opt, { duration: 0, delay: 0, endDelay: 0 });
      } else if (m === "off" && typeof opt === "number") opt = 0;
      if (Array.isArray(kf)) kf = kf.map((f) => (f && f.easing ? { ...f, easing: calm(f.easing) } : f));
    }
    return orig.call(this, kf, opt);
  };
})();
/* State */
const store = {
  settings: clone(DEFAULT_SETTINGS),
  tx: [],
  txSingle: [],
  txb: {},
  fixed: [],
  months: {},
  debts: [],
};
const WIDE = matchMedia("(min-width:1000px)");
const ui = {
  view: "home",
  ym: ymOf(new Date()),
  kind: "ausgabe",
  cat: null,
  editId: null,
  fixEdit: false,
  debtEdit: false,
  filter: "alle",
  q: "",
  get wide() {
    return WIDE.matches;
  },
};
let db = null,
  mem = false;
const NATIVE = !!window.AndroidBridge;
const BG_RUN = (() => {
  try {
    return !!(window.AndroidBridge && window.AndroidBridge.bgMode && window.AndroidBridge.bgMode());
  } catch (e) {
    return false;
  }
})();
/* Verschlüsselung */
const sealedKey = (k) => SEALED.has(k) || String(k).startsWith("hb-sp-");
const SEALED = new Set([
    "haushaltsbuch-v1",
    "haushaltsbuch-sync-v1",
    "hb-pair",
    "haushaltsbuch-lock",
    "haushaltsbuch-cloud",
    "hb-lock-tries",
  ]),
  SEAL_BAD = new Set();
let SEAL_ON = false;
(function () {
  const B = window.AndroidBridge;
  if (!B || typeof B.seal !== "function" || typeof B.unseal !== "function") return;
  try {
    if (String(B.seal("x")).slice(0, 3) !== "v1:") return;
  } catch (e) {
    return;
  }
  const P = Storage.prototype,
    g = P.getItem,
    st = P.setItem;
  SEAL_ON = true;
  P.getItem = function (k) {
    const v = g.call(this, k);
    if (this !== window.localStorage || v == null || !sealedKey(k) || v.slice(0, 3) !== "v1:") return v;
    const r = B.unseal(v);
    if (r === "\u0000fail") {
      SEAL_BAD.add(k);
      return null;
    }
    return r;
  };
  P.setItem = function (k, v) {
    if (this !== window.localStorage || !sealedKey(k)) return st.call(this, k, v);
    if (SEAL_BAD.has(k)) throw new Error("sealed");
    const e = B.seal(String(v));
    if (!e || e.slice(0, 3) !== "v1:") throw new Error("seal failed");
    return st.call(this, k, e);
  };
  const all = new Set(SEALED);
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (sealedKey(k)) all.add(k);
    }
  } catch (e) {}
  for (const k of all) {
    try {
      const v = g.call(window.localStorage, k);
      if (v != null && v.slice(0, 3) !== "v1:") window.localStorage.setItem(k, v);
    } catch (e) {}
  }
  setTimeout(() => {
    if (SEAL_BAD.size)
      toast(
        "Deine gespeicherten Daten ließen sich nicht entschlüsseln. Es wird nichts überschrieben – hol sie per Abgleich oder Backup zurück.",
        null,
        null,
        12000
      );
  }, 3000);
})();
const META_SERVER = (document.querySelector('meta[name="hb-server"]') || {}).content || "";
const SERVER_KEY = "haushaltsbuch-server";
const META_CLOUD = (document.querySelector('meta[name="hb-cloud"]') || {}).content || "";
const MODE_KEY = "haushaltsbuch-mode",
  CLOUD_KEY = "haushaltsbuch-cloud";
const lsGet = (k) => {
  try {
    return localStorage.getItem(k) || "";
  } catch (e) {
    return "";
  }
};
const META_PAIR = (document.querySelector('meta[name="hb-pair"]') || {}).content || "";
let MODE =
  lsGet(MODE_KEY) ||
  (META_CLOUD && !lsGet(SERVER_KEY)
    ? "cloud"
    : /"token":"[a-f0-9]{20,}"/.test(lsGet("haushaltsbuch-sync-v1"))
      ? "nas"
      : META_PAIR
        ? "pair"
        : "nas");
const cloudUrl = () => META_CLOUD || lsGet(CLOUD_KEY);
const nasUrl = () => (NATIVE && lsGet(SERVER_KEY)) || META_SERVER;
let SERVER = MODE === "cloud" ? cloudUrl() : MODE === "pair" ? pairUrl() : nasUrl();
const SYNCABLE = NATIVE || !!META_SERVER || !!META_CLOUD || !!META_PAIR;
const LOCAL = SYNCABLE;
const LS_KEY = "haushaltsbuch-v1";
const SYNC_KEY = "haushaltsbuch-sync-v1";
let DREV = 0;
const freshKey = () =>
  DREV +
  "|" +
  ui.ym +
  "|" +
  LANG +
  "|" +
  new Date().toDateString() +
  "|" +
  (document.documentElement.dataset.theme || "");
const FRESH = {};
function persistLocal() {
  DREV++;
  if (!LOCAL || PV) return; /* Profil-Vorschau speichert nichts */
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        version: 1,
        settings: store.settings,
        ...memStore,
      })
    );
  } catch (e) {
    toast("Speichern auf dem Handy fehlgeschlagen");
  }
}
function backupData() {
  if (mem)
    return {
      version: 1,
      settings: clone(store.settings),
      ...clone(memStore),
    };
  const o = {
    version: 1,
    settings: clone(store.settings),
    tx: {},
    txb: {},
    fixed: {},
    months: {},
    debts: {},
  };
  for (const t of store.txSingle) {
    const r = {
      ...t,
    };
    delete r.id;
    o.tx[t.id] = r;
  }
  for (const [b, items] of Object.entries(store.txb))
    o.txb[b] = {
      items: clone(items),
    };
  for (const f of store.fixed) {
    const r = {
      ...f,
    };
    delete r.id;
    o.fixed[f.id] = r;
  }
  for (const [k, v] of Object.entries(store.months)) o.months[k] = clone(v);
  for (const d of store.debts) {
    const r = {
      ...d,
    };
    delete r.id;
    o.debts[d.id] = r;
  }
  return o;
}
/* Start */
function renderWipe(step) {
  const b = $("wipeBox");
  if (!b) return;
  if (!step) {
    b.innerHTML = `<b>Neu anfangen</b><span class="small muted">Löscht alle Buchungen, Fixkosten, Schulden, Sparziele, Belegfotos und Einstellungen – auf diesem Gerät, auf dem PC und auf dem Server.</span><button class="btn wipebtn" id="wipeStart">Alle Daten löschen …</button>`;
    return;
  }
  const n = store.tx.length,
    f = store.fixed.length,
    d = store.debts.length,
    r = RCPT.ids.size;
  b.innerHTML = `<b>Wirklich alles löschen?</b>
    <div class="notice bad"><span>Gelöscht werden <b>${n} Buchungen</b>, <b>${f} Fixkosten</b>, <b>${d} Schulden</b>, ${r} Belegfotos, alle Sparziele, Budgets, Kategorien, Farben und Einstellungen – auf allen Geräten. <b>Das lässt sich nicht rückgängig machen.</b></span></div>
    <span class="small">Tipp: Speichere vorher ein Backup – dann kannst du alles über „Laden“ zurückholen.</span>
    <button class="btn" id="wipeBk">${svgIcon("arrowDown", 16)} Erst Backup speichern</button>
    <label class="small" for="wipeWord">Zum Bestätigen <b>LÖSCHEN</b> eintippen:</label><input class="in" id="wipeWord" autocomplete="off" placeholder="LÖSCHEN">
    <div class="row-btns"><button class="btn" id="wipeCancel">Abbrechen</button><button class="btn wipego" id="wipeGo" disabled>Endgültig löschen</button></div>`;
}
async function wipeAll() {
  const keep = {
    updKey: store.settings.updKey,
  };
  for (const k of ["tx", "txb", "fixed", "months", "debts"]) {
    for (const id of Object.keys(memStore[k])) enqueue(k, id, null);
    memStore[k] = {};
  }
  if (SYNC.token)
    for (const id of Object.keys(memStore.acct))
      SYNC.queue.push({
        col: "app",
        id: "acct-" + id,
        data: null,
      });
  memStore.acct = {};
  for (const id of [...RCPT.ids]) {
    try {
      await rcptDel(id);
    } catch (e) {}
  }
  store.settings = {
    ...clone(DEFAULT_SETTINGS),
    ...(keep.updKey ? keep : {}),
  };
  if (SYNC.token) {
    SYNC.queue.push({
      col: "app",
      id: "settings",
      data: clone(store.settings),
    });
    saveSync();
  }
  for (const k of ["hb-wiz-skip", "hb-notify"])
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  persistLocal();
  flushSoon(0);
  ui.view = "home";
  ui.sp = null;
  ui.wiz = null;
  if (typeof spSheetClose === "function")
    try {
      spSheetClose();
    } catch (e) {}
  rebuildMem();
  window.scrollTo({
    top: 0,
  });
  toast("Alles gelöscht – willkommen zum Neustart");
  setTimeout(() => {
    if (wizShould()) wizOpen();
  }, 600);
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("#wipeStart")) {
    renderWipe(1);
    return;
  }
  if (t.closest("#wipeCancel")) {
    renderWipe(0);
    return;
  }
  if (t.closest("#wipeBk")) {
    const b = $("backupSave");
    if (b) b.click();
    return;
  }
  if (t.closest("#wipeGo")) {
    if (($("wipeWord").value || "").trim().toUpperCase() !== "LÖSCHEN") return;
    wipeAll();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "wzName") {
    const sp = document.querySelector("#wzAv span");
    if (sp) sp.textContent = (e.target.value.trim()[0] || "?").toUpperCase();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "wipeWord") $("wipeGo").disabled = e.target.value.trim().toUpperCase() !== "LÖSCHEN";
});
function loadBackupObj(o, fromFile) {
  if (!o || o.version !== 1 || typeof o.fixed !== "object") throw new Error("bad");
  for (const k of ["tx", "txb", "fixed", "months", "debts", "acct"]) memStore[k] = clone(o[k] || {});
  const m = {
    ...clone(DEFAULT_SETTINGS),
    ...clone(o.settings || {}),
  };
  m.cats = {
    ...clone(DEFAULT_SETTINGS.cats),
    ...((o.settings && o.settings.cats) || {}),
  };
  if (!m.updKey && store.settings && store.settings.updKey) m.updKey = store.settings.updKey;
  store.settings = m;
  persistLocal();
  rebuildMem();
  if (fromFile && SYNC.token) {
    for (const k of ["tx", "txb", "fixed", "months", "debts"])
      for (const [id, d] of Object.entries(memStore[k]))
        SYNC.queue.push({
          col: k,
          id,
          data: d,
        });
    for (const [id, d] of Object.entries(memStore.acct))
      SYNC.queue.push({
        col: "app",
        id: "acct-" + id,
        data: d,
      });
    SYNC.rq = [...RCPT.ids];
    SYNC.queue.push({
      col: "app",
      id: "settings",
      data: clone(store.settings),
    });
    saveSync();
    flushSoon(0);
  }
}
const memStore = {
  tx: {},
  txb: {},
  fixed: {},
  months: {},
  debts: {},
  acct: {},
};

/* Helfer */
function clone(o) {
  return JSON.parse(JSON.stringify(o));
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function ymOf(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1);
}
function isoOf(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function isoToday() {
  return isoOf(new Date());
}
function isoDaysAgo(k) {
  const d = new Date();
  d.setDate(d.getDate() - k);
  return isoOf(d);
}
function ymParts(ym) {
  return [Number(ym.slice(0, 4)), Number(ym.slice(5, 7))];
}
function shiftYm(ym, k) {
  const [y, m] = ymParts(ym);
  return ymOf(new Date(y, m - 1 + k, 1));
}
function daysIn(ym) {
  const [y, m] = ymParts(ym);
  return new Date(y, m, 0).getDate();
}
function monthName(ym) {
  const [y, m] = ymParts(ym);
  return MONTHS[m - 1] + " " + y;
}
const fmtE = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const fmtE0 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
/* Einzahl/Mehrzahl: „1 Buchung“, „2 Buchungen“ */
function plural(n, one, many) {
  return `${n} ${Number(n) === 1 ? one : many}`;
}
function round2(v) {
  return Math.round(v * 100) / 100;
}
/* „-0,00 €“ vermeiden: winzige Minusreste werden zu 0 */
function fmtEur(v) {
  return fmtE.format(round2(v || 0) || 0);
}
function fmtEur0(v) {
  v = Number(v) || 0;
  return fmtE0.format(Math.sign(v) * Math.round(Math.abs(v)) || 0);
}
function numStr(v) {
  return v === undefined || v === null || v === "" ? "" : String(round2(v)).replace(".", ",");
}
function parseAmt(s) {
  if (typeof s === "number") return s;
  s = String(s || "")
    .trim()
    .replace(/\s|€|eur\b/gi, "")
    .replace(/[,.][-–]+$/, "")
    .replace(/^\+/, "")
    .replace(/^[−–]/, "-");
  if (!s) return NaN;
  /* „1,234.56“ (englische Schreibweise): der letzte Trenner ist das Komma für Cent */
  if (s.includes(",") && s.lastIndexOf(".") > s.lastIndexOf(",")) s = s.replace(/,/g, "");
  else if (/^-?\d{1,3}(,\d{3}){2,}$/.test(s)) s = s.replace(/,/g, ""); /* „1,234,567“ */
  else if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); /* „1.234“ = tausendzweihundertvierunddreißig */
  const v = Number(s);
  return isFinite(v) ? v : NaN;
}
function escHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]
  );
}
function sum(a, f) {
  let t = 0;
  for (const x of a) t += Number(f ? f(x) : x) || 0;
  return t;
}
function dayLabel(iso) {
  if (iso === isoToday()) return "Heute";
  if (iso === isoDaysAgo(1)) return "Gestern";
  const d = new Date(iso + "T12:00");
  return d.toLocaleDateString(localeTag(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function shortDate(iso) {
  const [y, m, d] = String(iso || "").split("-");
  if (!m) return "";
  if (typeof LANG !== "undefined" && LANG !== "de") {
    try {
      return new Date(+y, +m - 1, +(d || 1)).toLocaleDateString(cLoc(), {
        day: "numeric",
        month: "short",
      });
    } catch (_) {}
  }
  return Number(d) + ". " + MSHORT[Number(m) - 1];
}
const $ = (id) => document.getElementById(id);
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

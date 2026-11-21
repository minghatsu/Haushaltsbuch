/* Sync */
const SYNC = {
  token: "",
  rev: 0,
  queue: [],
  state: "off",
  last: 0,
  busy: false,
  skipped: false,
  setup: false,
};
function loadSync() {
  try {
    Object.assign(SYNC, JSON.parse(localStorage.getItem(SYNC_KEY) || "{}"));
  } catch (e) {}
  SYNC.busy = false;
  SYNC.rq = SYNC.rq || [];
}
function saveSync() {
  try {
    localStorage.setItem(
      SYNC_KEY,
      JSON.stringify({
        token: SYNC.token,
        rev: SYNC.rev,
        queue: SYNC.queue,
        rq: SYNC.rq || [],
        last: SYNC.last,
        skipped: SYNC.skipped,
        asked: !!SYNC.asked,
        email: SYNC.email || "",
      })
    );
  } catch (e) {}
}
function rqAdd(id) {
  if (!SERVER || !SYNC.token) return;
  SYNC.rq = (SYNC.rq || []).filter((x) => x !== id);
  SYNC.rq.push(id);
  saveSync();
  flushSoon();
}
function enqueue(col, id, data) {
  if (!SERVER || !SYNC.token) return;
  SYNC.queue = SYNC.queue.filter((o) => !(o.col === col && o.id === id));
  SYNC.queue.push({
    col,
    id,
    data: data === null ? null : clone(data),
  });
  saveSync();
  flushSoon();
}
let flushTimer = null;
function flushSoon(ms) {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(syncNow, ms === undefined ? 400 : ms);
}
const httpWaiting = {};
window.hbHttpDone = (id, status, text) => {
  const done = httpWaiting[id];
  if (done) {
    delete httpWaiting[id];
    done({
      status,
      text,
    });
  }
};
async function request(url, body, certHost) {
  if (NATIVE && window.AndroidBridge.http) {
    const r = await new Promise((res) => {
      const id = newId();
      httpWaiting[id] = res;
      const B = window.AndroidBridge,
        a = [
          id,
          body ? "POST" : "GET",
          url,
          SYNC.token ? "Bearer " + SYNC.token : "",
          body ? JSON.stringify(body) : "",
        ];
      setTimeout(() => {
        if (httpWaiting[id]) {
          delete httpWaiting[id];
          res({
            status: 0,
            text: "ERR:Zeitüberschreitung (keine Antwort nach 60 s)",
          });
        }
      }, 60000);
      if (certHost) B.httpAs(...a, certHost);
      else B.http(...a);
    });
    if (!r.status)
      throw new Error(/^ERR:/.test(r.text || "") ? "Verbindung: " + netWhy(r.text.slice(4)) : "Keine Verbindung");
    return r;
  }
  const r = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: Object.assign(
      {
        "Content-Type": "application/json",
      },
      SYNC.token
        ? {
            Authorization: "Bearer " + SYNC.token,
          }
        : {}
    ),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return {
    status: r.status,
    text: await r.text(),
  };
}
const SERVER_ALT_KEY = "haushaltsbuch-server-alt";
function serverAlt() {
  try {
    if (!NATIVE || MODE !== "nas") return "";
    const own = localStorage.getItem(SERVER_ALT_KEY) || "";
    if (own) return own;
    return META_PAIR && /^https:/.test(META_PAIR) && /^http:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(SERVER)
      ? META_PAIR.replace(/pair\.php.*$/, "api.php")
      : "";
  } catch (e) {
    return "";
  }
}
let VIA_ALT = false,
  NET_LAST = lsGet("hb-net-last");
const apiUrl = (base, action, qs) => base + (base.includes("?") ? "&" : "?") + "a=" + action + (qs || "");
const isLanHttp = (u) => /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)[0-9.]+[/:]/.test(u || "");
const TLS_OK_KEY = "hb-tls-ok";
function netRoutes() {
  const alt = serverAlt(),
    host = ((alt || META_PAIR).match(/^https:\/\/([^/:]+)/) || [])[1] || "",
    B = window.AndroidBridge,
    out = [];
  const lanS =
    isLanHttp(SERVER) && host && B && typeof B.httpAs === "function"
      ? {
          base: SERVER.replace(/^http:/, "https:"),
          cert: host,
          k: "lan-https",
        }
      : null;
  if (lanS) out.push(lanS);
  if (alt)
    out.push({
      base: alt,
      cert: "",
      k: "alt",
    });
  if (!isLanHttp(SERVER) || !(lanS || alt) || !lsGet(TLS_OK_KEY))
    out.push({
      base: SERVER,
      cert: "",
      k: "plain",
    });
  const i = out.findIndex((r) => r.k === NET_LAST);
  if (i > 0) out.unshift(out.splice(i, 1)[0]);
  return out;
}
function netWhy(t) {
  const x = String(t || "");
  const w = /Timeout|timed out/i.test(x)
    ? "Zeitüberschreitung"
    : /UnknownHost|resolve/i.test(x)
      ? "Adresse nicht gefunden"
      : /SSL|Certificate|CertPath|Handshake/i.test(x)
        ? "Zertifikat abgelehnt"
        : /ConnectException|refused|unreachable|ENETUNREACH/i.test(x)
          ? "Server lehnt ab / nicht erreichbar"
          : /OutOfMemory/i.test(x)
            ? "Antwort zu groß"
            : "Fehler";
  return w + " [" + x.slice(0, 80) + "]";
}
async function requestAny(action, qs, body) {
  let last;
  for (const rt of netRoutes()) {
    try {
      const r = await request(apiUrl(rt.base, action, qs), body, rt.cert);
      if (r.status === 0) throw new Error("Keine Verbindung");
      if (NET_LAST !== rt.k) {
        NET_LAST = rt.k;
        try {
          localStorage.setItem("hb-net-last", rt.k);
        } catch (_) {}
      }
      VIA_ALT = rt.k === "alt";
      if (rt.k !== "plain" && isLanHttp(SERVER) && !lsGet(TLS_OK_KEY))
        try {
          localStorage.setItem(TLS_OK_KEY, "1");
        } catch (_) {}
      return r;
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error("Keine Verbindung");
}
async function api(action, opts = {}) {
  const r = await requestAny(action, opts.qs, opts.body);
  let j = {};
  try {
    j = JSON.parse(r.text);
  } catch (e) {}
  if (r.status < 200 || r.status >= 300) {
    const err = new Error(j.error || "HTTP " + r.status);
    err.status = r.status;
    err.data = j;
    throw err;
  }
  return j;
}
async function syncNow() {
  if (!SERVER || !SYNC.token || SYNC.busy) return;
  SYNC.busy = true;
  try {
    renderHero();
  } catch (e) {}
  try {
    if (SYNC.queue.length) {
      const ops = SYNC.queue.slice(0, MODE === "pair" ? 150 : 400);
      await api("push", {
        body: {
          ops: MODE === "pair" ? await pairEncOps(ops) : ops,
        },
      });
      SYNC.queue = SYNC.queue.filter((o) => !ops.includes(o));
      saveSync();
    }
    if (SYNC.rq && SYNC.rq.length) {
      const ids = SYNC.rq.slice(0, 4),
        ops = [];
      for (const id of ids) {
        const img = await rcptGet(id);
        ops.push({
          col: "app",
          id: "rcpt-" + id,
          data: img
            ? {
                img,
              }
            : null,
        });
      }
      await api("push", {
        body: {
          ops: MODE === "pair" ? await pairEncOps(ops) : ops,
        },
      });
      SYNC.rq = SYNC.rq.filter((x) => !ids.includes(x));
      saveSync();
    }
    const res = await api("pull", {
      qs: "&since=" + SYNC.rev,
    });
    if (MODE === "pair") res.docs = await pairDecDocs(res.docs);
    const pending = new Set([
      ...SYNC.queue.map((o) => o.col + "/" + o.id),
      ...(SYNC.rq || []).map((id) => "app/rcpt-" + id),
    ]);
    let changed = false;
    for (const d of res.docs || []) {
      if (pending.has(d.col + "/" + d.id)) continue;
      changed = true;
      if (d.col === "app" && d.id.startsWith("rcpt-")) {
        const k = d.id.slice(5);
        try {
          if (d.data && d.data.img) await rcptPut(k, d.data.img, true);
          else await rcptDel(k, true);
        } catch (e) {}
        continue;
      }
      if (d.col === "app" && d.id.startsWith("dev-")) {
        devStore(d.id.slice(4), d.data);
        continue;
      }
      if (d.col === "app" && d.id.startsWith("acct-")) {
        const k = d.id.slice(5);
        if (d.data === null) delete memStore.acct[k];
        else memStore.acct[k] = d.data;
        continue;
      }
      if (d.col === "app") {
        if (d.id === "settings" && d.data) {
          const m = {
            ...clone(DEFAULT_SETTINGS),
            ...d.data,
          };
          m.cats = {
            ...clone(DEFAULT_SETTINGS.cats),
            ...(d.data.cats || {}),
          };
          if (!m.updKey && store.settings && store.settings.updKey) m.updKey = store.settings.updKey;
          try {
            if (zMerge(store.settings, m)) ZSYNC.push = true;
          } catch (_) {}
          store.settings = m;
        }
        continue;
      }
      if (!memStore[d.col]) continue;
      if (d.data === null) delete memStore[d.col][d.id];
      else memStore[d.col][d.id] = d.data;
    }
    SYNC.rev = res.rev || SYNC.rev;
    SYNC.last = Date.now();
    SYNC.err = "";
    SYNC.state = SYNC.queue.length || (SYNC.rq || []).length ? "pending" : "ok";
    saveSync();
    if (changed) {
      persistLocal();
      BG_RENDER = true;
      try {
        rebuildMem();
      } finally {
        BG_RENDER = false;
      }
    } else renderSyncDot();
    if (ZSYNC.push) {
      ZSYNC.push = false;
      enqueue("app", "settings", store.settings);
      flushSoon(400);
    }
    if (changed) {
      try {
        zTripCheck();
        zDevOutCheck();
      } catch (_) {}
    }
    if (SYNC.queue.length || (SYNC.rq || []).length || res.more) flushSoon(200);
    checkUpdate();
  } catch (e) {
    let healed = false;
    if (e.status === 401 && MODE === "pair" && pairState()) {
      try {
        const K = await pairKeys();
        await api("create", {
          body: {
            vault: K.vault,
            auth: K.auth,
          },
        });
        SYNC.token = await pairToken();
        SYNC.rev = 0;
        syncQueueAll();
        SYNC.state = "pending";
        saveSync();
        toast("Der Server hatte deine Kopplung verloren – deine Daten werden neu hochgeladen", null, null, 8000);
        flushSoon(300);
        healed = true;
      } catch (_) {}
    }
    if (healed) {
    } else if (e.status === 401) {
      SYNC.token = "";
      SYNC.state = "login";
      saveSync();
      toast("Abgleich abgemeldet – bitte neu anmelden", () => showLogin(), "Anmelden", 8000);
    } else SYNC.state = navigator.onLine === false ? "offline" : "error";
    SYNC.err =
      e && e.status
        ? `${e.message || "Fehler"} (${e.status})`
        : e && e.message && !/Keine Verbindung/.test(e.message)
          ? e.message
          : "";
    renderSyncDot();
  } finally {
    SYNC.busy = false;
  }
}
/* Selbst-Update */
const VER_BASE = {
  app: 88,
  pc: 142,
  tab: 115,
};
const mneg = (v) => (Math.abs(+v || 0) < 0.005 ? escHtml(fmtEur(0)) : "− " + escHtml(fmtEur(v)));
function verName(n) {
  n = n | 0;
  if (!n) return "Testversion";
  const m = Math.max(0, n - VER_BASE.app);
  return `v0.${Math.floor(m / 10)}.${m % 10}`;
}
const GH_REL = "https://api.github.com/repos/minghatsu/Haushaltsbuch/releases/tags/neueste";
const GH_REL_PUB = "https://api.github.com/repos/minghatsu/finanz-mami/releases/tags/neueste";
const UPD = {
  msg: "",
  ts: 0,
  busy: false,
  last: 0,
  started: Date.now(),
};
const ghWait = {};
window.hbGhDone = (id, res, err) => {
  const f = ghWait[id];
  if (f) {
    delete ghWait[id];
    f(res, err);
  }
};
const canGh = () => !!(window.AndroidBridge && window.AndroidBridge.ghFetch);
const updKey = () => String((store.settings && store.settings.updKey) || "");
function ghFetch(url, kind) {
  return new Promise((ok, no) => {
    const id = newId();
    ghWait[id] = (r, e) => (e ? no(new Error(e)) : ok(r));
    window.AndroidBridge.ghFetch(id, url, updKey(), kind);
  });
}
async function ghCheck(manual, auto) {
  if (!canGh() || UPD.busy) return;
  if (!manual && Date.now() - UPD.last < 4 * 60 * 1000) return;
  UPD.busy = true;
  UPD.last = Date.now();
  if (manual) {
    UPD.msg = "Prüfe …";
    renderUpd();
  }
  try {
    const rel = JSON.parse(await ghFetch(updKey() ? GH_REL : GH_REL_PUB, "json")),
      body = String(rel.body || "");
    const num = (k) => {
      const m = body.match(new RegExp("\\b" + k + "=(\\d+)"));
      return m ? +m[1] : 0;
    };
    const ALT = {
      "Haushaltsbuch.apk": "Finanz-MAMI.apk",
      "Haushaltsbuch-Setup.exe": "Finanz-MAMI-Setup.exe",
    };
    const asset = (n) => (rel.assets || []).find((a) => a.name === n || a.name === ALT[n]);
    const desk = !!window.AndroidBridge.desktop,
      mine = +(window.AndroidBridge.nativeRev() || 0),
      theirs = num(desk ? "exe" : "apk");
    const wk = IS_DESK ? "webp" : IS_TAB ? "webt" : "web",
      web = () => num(wk) || num("web");
    const page = () =>
      (rel.assets || []).find((a) => a.name === (IS_DESK ? "app-pc.html" : IS_TAB ? "app-tab.html" : "app.html")) ||
      asset("app.html");
    const rv = () => verName(web());
    UPD.relName = rv();
    let apkNew = false;
    if (theirs > mine) {
      const a = asset(desk ? "Haushaltsbuch-Setup.exe" : "Haushaltsbuch.apk");
      if (a) {
        if (desk) {
          const go = async () => {
            toast("Update wird geladen – Finanz MAMI startet gleich neu", null, null, 30000);
            UPD.dl = true;
            try {
              await ghFetch(a.url, "exe");
            } catch (e) {
              toast(e.message);
            } finally {
              UPD.dl = false;
            }
          };
          if (Date.now() - UPD.started < 2 * 60 * 1000 || manual) await go();
          else {
            toast("Neue PC-Version ist da", go, "Jetzt installieren", 20000);
            UPD.avail = {
              t: "Neue PC-Version ist da",
              s: "Tippe auf Installieren – Finanz MAMI startet danach neu.",
              go,
            };
          }
        } else {
          const go = async () => {
            toast("Update wird geladen …", null, null, 20000);
            UPD.dl = true;
            try {
              const r = await ghFetch(a.url, "apk");
              UPD.dl = false;
              if (r === "permission")
                toast(
                  "Bitte „Apps aus dieser Quelle zulassen“ einschalten und dann noch einmal tippen",
                  go,
                  "Installieren",
                  20000
                );
            } catch (e) {
              UPD.dl = false;
              toast(e.message);
            }
          };
          if (auto) go();
          else toast("Neue App-Version ist da", go, "Installieren", 20000);
          UPD.avail = {
            t: "Neue App-Version ist da",
            s: "Tippe auf Installieren – deine Daten bleiben erhalten.",
            go,
          };
        }
        UPD.msg = "Neue Version " + rv() + " ist da";
        if (desk) return;
        apkNew = true;
      }
    }
    if (web() > HB_VERSION) {
      const a = page();
      if (a && ["saved", "same"].includes(await ghFetch(a.url, "app"))) {
        UPD.ready = true;
        if (apkNew) return;
        if (rv() === "v" + curVerShort()) {
          UPD.msg = "Aktuell – v" + curVerShort();
          return;
        }
        UPD.avail = {
          t: "Neue Version liegt bereit",
          s: rv() + " – wird beim nächsten Öffnen aktiv.",
          go: () => window.AndroidBridge.reloadApp(),
          lbl: "Jetzt laden",
        };
        if (auto) {
          window.AndroidBridge.reloadApp();
          return;
        }
        toast("Neue Version ist da", () => window.AndroidBridge.reloadApp(), "Jetzt laden", 15000);
        UPD.msg = rv() + " ist bereit – wird beim nächsten Öffnen aktiv";
        return;
      }
    }
    if (!apkNew) UPD.msg = "Aktuell – v" + curVerShort();
  } catch (e) {
    UPD.msg = e.message || "Prüfen hat nicht geklappt";
  } finally {
    UPD.busy = false;
    UPD.ts = Date.now();
    renderUpd();
    updateBell();
  }
}
function renderUpd() {
  if (window.pcRelPaint) window.pcRelPaint();
  const card = $("updCard");
  if (!card) return;
  if (!window.AndroidBridge) {
    card.style.display = "none";
    return;
  }
  const body = $("updBody"),
    st = $("updState");
  if (!canGh()) {
    st.textContent = "Diese App-Version kann sich noch nicht selbst aktualisieren – einmal die neue App installieren.";
    body.innerHTML = "";
    return;
  }
  const has = !!updKey();
  let waiting = "";
  try {
    const v = JSON.parse(window.AndroidBridge.appVersions ? window.AndroidBridge.appVersions() : "{}");
    if ((v.cached | 0) > HB_VERSION) waiting = " · " + (UPD.relName || "Neue Version") + " liegt bereit";
  } catch (e) {}
  const when =
    waiting +
    (UPD.ts
      ? " · geprüft " +
        new Date(UPD.ts).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "");
  st.textContent = (UPD.msg || "An – die App prüft regelmäßig auf neue Versionen, auch wenn sie zu ist.") + when;
  if (document.activeElement && document.activeElement.id === "updKey") return;
  body.innerHTML = has
    ? `<div class="bkb"><button class="btn primary" id="updNow">Jetzt prüfen</button>${/Schlüssel/.test(UPD.msg) ? `<button class="btn" id="updChange">Neuen Schlüssel eingeben</button>` : ""}</div>${relCardHtml()}`
    : ui.updKeyForm
      ? `<div class="field"><label for="updKey">Entwickler-Schlüssel (GitHub, nur Lesen)</label><input class="in" id="updKey" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></div>
       <div class="bkb"><button class="btn primary" id="updSave">Speichern</button></div>
       <span class="small muted">Nur für den Entwickler – alle anderen bekommen Updates ohne Schlüssel.</span>`
      : `<div class="bkb"><button class="btn primary" id="updNow">Jetzt prüfen</button></div><button class="link small" id="updKeyShow" style="margin-top:6px">Entwickler-Schlüssel</button>`;
}
/* Entwickler */
const REL = {
  mine: "",
  all: "",
  allBody: "",
  mineBody: "",
  busy: false,
  arm: false,
  msg: "",
  t: 0,
  sel: {
    handy: true,
    tablet: true,
    pc: true,
  },
};
const relShort = (n) => String(n || "").replace(/^Finanz MAMI · /, "");
async function relLoad(force) {
  if (!updKey() || !canGh() || REL.busy || (!force && Date.now() - REL.t < 60e3)) return;
  REL.t = Date.now();
  try {
    const a = JSON.parse(await ghFetch(GH_REL, "json")),
      b = JSON.parse(await ghFetch(GH_REL_PUB, "json"));
    REL.mine = a.name || "";
    REL.all = b.name || "";
    REL.mineBody = a.body || "";
    REL.allBody = b.body || "";
  } catch (_) {}
  renderUpd();
}
const relNum = (body, k) => {
  const m = String(body || "").match(new RegExp("\\b" + k + "=(\\d+)"));
  return m ? +m[1] : 0;
};
function relCardHtml() {
  if (!updKey()) return "";
  setTimeout(() => relLoad(), 0);
  const mine = relNum(REL.mineBody, "web"),
    ow = relNum(REL.allBody, "web"),
    D = [
      ["handy", "Handy", ow],
      ["tablet", "Tablet", relNum(REL.allBody, "webt") || ow],
      ["pc", "PC", relNum(REL.allBody, "webp") || ow],
    ];
  const any = D.some(([k]) => REL.sel[k]),
    loaded = !!mine;
  return `<div class="relbox"><b>Für alle freigeben</b>
    <span class="small muted">Bei dir: ${mine ? verName(mine) : "…"}</span>
    <div class="relsel">${D.map(([k, l, n]) => {
      const same = n && n === mine;
      return `<label class="${same ? "same" : ""}"><input type="checkbox" data-relsel="${k}" ${REL.sel[k] ? "checked" : ""}><span><b>${l}</b><small>bei allen: ${n ? verName(n) : "…"}${same ? " ✓" : ""}</small></span></label>`;
    }).join("")}</div>
    <button class="btn ${REL.arm ? "danger" : "primary"}" id="relGo" ${REL.busy || !any || !loaded ? "disabled" : ""}>${
      REL.busy
        ? "Wird freigegeben …"
        : REL.arm
          ? "Wirklich freigeben?"
          : `${verName(mine)} freigeben für: ${
              D.filter(([k]) => REL.sel[k])
                .map(([, l]) => l)
                .join(", ") || "–"
            }`
    }</button>
    ${REL.msg ? `<span class="small" style="color:${/geklappt|unterwegs/.test(REL.msg) ? "var(--good)" : "var(--bad)"}">${escHtml(REL.msg)}</span>` : ""}</div>`;
}
document.addEventListener("change", (e) => {
  const c = e.target.closest("[data-relsel]");
  if (!c) return;
  REL.sel[c.dataset.relsel] = c.checked;
  REL.arm = false;
  renderUpd();
});
async function relFree() {
  const url = "https://api.github.com/repos/minghatsu/Haushaltsbuch/actions/workflows/freigeben.yml/dispatches";
  const r = await new Promise((res) => {
    const id = newId();
    httpWaiting[id] = res;
    setTimeout(() => {
      if (httpWaiting[id]) {
        delete httpWaiting[id];
        res({
          status: 0,
        });
      }
    }, 30000);
    window.AndroidBridge.http(
      id,
      "POST",
      url,
      "Bearer " + updKey(),
      JSON.stringify({
        ref: "main",
        inputs: {
          handy: String(!!REL.sel.handy),
          tablet: String(!!REL.sel.tablet),
          pc: String(!!REL.sel.pc),
        },
      })
    );
  });
  if (r.status === 204 || r.status === 200) return;
  if (r.status === 403 || r.status === 404)
    throw new Error(
      "Dein Entwickler-Schlüssel darf das noch nicht. Gib ihm bei GitHub unter „Actions“ das Recht „Read and write“."
    );
  if (!r.status) throw new Error("Keine Verbindung – bist du online?");
  throw new Error("GitHub antwortet mit " + r.status);
}
document.addEventListener("click", async (e) => {
  if (!e.target.closest("#relGo")) return;
  if (!REL.arm) {
    REL.arm = true;
    REL.msg = "";
    renderUpd();
    setTimeout(() => {
      if (REL.arm) {
        REL.arm = false;
        renderUpd();
      }
    }, 6000);
    return;
  }
  REL.arm = false;
  REL.busy = true;
  renderUpd();
  try {
    await relFree();
    REL.msg = "Hat geklappt – in 1–2 Minuten bekommen alle das Update.";
    setTimeout(() => relLoad(true), 90e3);
  } catch (x) {
    REL.msg = x.message;
  } finally {
    REL.busy = false;
    renderUpd();
  }
});
document.addEventListener("click", async (e) => {
  if (e.target.closest("#updSave")) {
    const v = ($("updKey").value || "").trim();
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(v)) {
      toast("Das sieht nicht wie ein GitHub-Schlüssel aus");
      return;
    }
    store.settings.updKey = v;
    ui.updKeyForm = false;
    await saveSettings();
    renderUpd();
    ghCheck(true);
    return;
  }
  if (e.target.closest("#updNow")) {
    ghCheck(true);
    return;
  }
  if (e.target.closest("#updKeyShow")) {
    ui.updKeyForm = true;
    renderUpd();
    return;
  }
  if (e.target.closest("#updChange")) {
    ui.updKeyForm = true;
    delete store.settings.updKey;
    await saveSettings();
    UPD.msg = "";
    renderUpd();
    setTimeout(() => $("updKey") && $("updKey").focus(), 30);
  }
});
window.hbUpdTap = () => ghCheck(true, true);
{
  let tap = false;
  try {
    tap = !!(window.AndroidBridge && window.AndroidBridge.takeUpdTap && window.AndroidBridge.takeUpdTap());
  } catch (e) {}
  setTimeout(() => (tap ? ghCheck(true, true) : ghCheck()), tap ? 1500 : 20000);
}
setInterval(
  () => {
    if (document.visibilityState === "visible") ghCheck();
  },
  5 * 60 * 1000
);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") ghCheck();
  else if (UPD.ready && canGh()) {
    UPD.ready = false;
    window.AndroidBridge.reloadApp();
  }
});
/* Updates */
const HB_VERSION = +((document.querySelector('meta[name="hb-version"]') || {}).content || 0);
let updLast = 0,
  updSeen = 0;
async function checkUpdate(force) {
  if (!SERVER || !HB_VERSION) return;
  if (!force && Date.now() - updLast < 10 * 60 * 1000) return;
  updLast = Date.now();
  try {
    const v = (await api("version")).version | 0;
    if (v <= HB_VERSION || v <= updSeen) return;
    if (NATIVE) {
      if (!window.AndroidBridge.saveApp) return;
      const r = await requestAny("app");
      if (r.status !== 200 || !window.AndroidBridge.saveApp(r.text)) return;
    }
    updSeen = v;
    const go = () => {
      if (NATIVE) window.AndroidBridge.reloadApp();
      else location.reload();
    };
    toast("Neue Version ist da – wird beim nächsten Start aktiv", go, "Jetzt laden", 15000);
  } catch (e) {}
}
let syncTimers = false;
function startSync() {
  if (MODE !== "pair" && META_PAIR) {
    const had = !!SYNC.token;
    MODE = "pair";
    SERVER = pairUrl();
    if (!pairState()) {
      SYNC.token = "";
      SYNC.queue = [];
      SYNC.rq = [];
      SYNC.rev = 0;
    }
    SYNC.state = "off";
    saveSync();
    try {
      localStorage.setItem(MODE_KEY, "pair");
    } catch (e) {}
    if (had && !pairState())
      setTimeout(
        () =>
          toast(
            "Der Abgleich mit Passwort wurde abgeschaltet. Koppel dieses Gerät per QR-Code – deine Daten bleiben erhalten.",
            () => showLogin(),
            "Koppeln",
            15000
          ),
        1500
      );
  }
  renderSyncDot();
  if (!SYNC.token && MODE === "pair" && pairState() && cryptoCan()) {
    pairToken()
      .then((t) => {
        if (t && !SYNC.token) {
          SYNC.token = t;
          SYNC.state = "pending";
          saveSync();
          startSync();
        }
      })
      .catch(() => {});
    return;
  }
  if (!SYNC.token) {
    if (!SYNC.skipped && !SYNC.asked && !SYNC.last) {
      SYNC.asked = true;
      saveSync();
      showLogin();
    }
    return;
  }
  syncNow();
  if (syncTimers) return;
  syncTimers = true;
  setInterval(() => {
    if (document.visibilityState === "visible") syncNow();
  }, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncNow();
  });
  window.addEventListener("online", () => syncNow());
}
function normServer(v) {
  v = (v || "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "http://" + v;
  try {
    const u = new URL(v);
    let p = u.pathname.replace(/\/+$/, "");
    if (!/\.php$/i.test(p)) p = (p ? p : "/haushaltsbuch") + "/api.php";
    return u.origin + p;
  } catch (e) {
    return "";
  }
}
let loginChecked = "";
function loginModeUi() {
  const cloud = MODE === "cloud",
    pair = MODE === "pair";
  $("loginSeg").hidden = true;
  $("loginSeg").querySelector('[data-lm="cloud"]').hidden = !(NATIVE || META_CLOUD);
  $("loginPair").hidden = !pair;
  for (const id of ["loginText", "loginPwRow", "loginGo", "loginUrlRow", "loginCodeRow", "loginPw2Row"])
    if ($(id) && pair) $(id).hidden = true;
  if (!pair) {
    $("loginText").hidden = false;
    $("loginGo").hidden = false;
  }
  if (pair) {
    $("loginCloudRow").hidden = true;
    $("loginEmailRow").hidden = true;
    $("loginLinks").hidden = true;
    $("loginRCodeRow").hidden = true;
    return;
  }
  $("loginSeg")
    .querySelectorAll("[data-lm]")
    .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lm === MODE)));
  $("loginCloudRow").hidden = !cloud || !!META_CLOUD;
  $("loginEmailRow").hidden = !cloud;
  $("loginLinks").hidden = !cloud;
  if (!cloud) {
    $("loginRCodeRow").hidden = true;
    $("loginPwRow").hidden = false;
    $("loginPwLbl").textContent = "Passwort";
    $("loginGo").textContent = "Verbinden";
  }
}
async function showLogin() {
  if (BG_RUN) return;
  if (MODE === "pair") {
    pairShow("start");
    return;
  }
  const bg = $("loginBg");
  bg.hidden = false;
  $("loginErr").textContent = "";
  loginModeUi();
  if (MODE === "cloud") return cloudShow();
  $("loginUrlRow").hidden = !NATIVE;
  if (NATIVE && document.activeElement !== $("loginUrl")) $("loginUrl").value = SERVER;
  loginChecked = "";
  if (!SERVER) {
    $("loginText").textContent = "Gib die Adresse deines Servers ein und tippe auf „Verbinden“.";
    $("loginGo").disabled = false;
    return;
  }
  $("loginText").textContent = "Verbindung wird geprüft …";
  $("loginGo").disabled = true;
  try {
    const st = await api("status");
    SYNC.setup = !!st.setup;
    SYNC.reset = !!st.reset;
    loginChecked = SERVER;
  } catch (e) {
    $("loginText").textContent = NATIVE
      ? "Unter dieser Adresse ist der Server gerade nicht erreichbar. Prüfe die Adresse oder mach erst einmal ohne Abgleich weiter."
      : "Die Server ist gerade nicht erreichbar. Du kannst erst einmal ohne Abgleich weitermachen.";
    $("loginGo").disabled = false;
    return;
  }
  $("loginGo").disabled = false;
  $("loginPw2Row").hidden = !SYNC.setup;
  $("loginTitle").textContent = SYNC.reset
    ? "Neues Passwort festlegen"
    : SYNC.setup
      ? "Passwort festlegen"
      : "Mit deinem Server verbinden";
  $("loginText").textContent = SYNC.reset
    ? "Auf des Servers liegt die Datei passwort-zuruecksetzen.txt. Leg jetzt ein neues Passwort fest – deine Daten bleiben erhalten, alle anderen Geräte melden sich neu an, die Zwei-Faktor-Anmeldung ist danach aus."
    : SYNC.setup
      ? "Lege ein Passwort für deinen Server fest (mindestens 8 Zeichen). Damit meldest du dich auf jedem Gerät einmal an."
      : "Gib dein Passwort für den Server ein. Danach siehst du auf diesem Gerät dieselben Daten wie überall.";
  setTimeout(() => $("loginPw").focus(), 50);
}
async function doLogin() {
  if (MODE === "cloud") return cloudGo();
  if (NATIVE) {
    const u = normServer($("loginUrl").value);
    if (!u) {
      $("loginErr").textContent = "Bitte gib die Adresse deines Servers ein.";
      return;
    }
    if (u !== SERVER || loginChecked !== SERVER) {
      SERVER = u;
      $("loginUrl").value = u;
      try {
        localStorage.setItem(SERVER_KEY, u);
      } catch (e) {}
      await showLogin();
      if (loginChecked === SERVER && !$("loginPw").value) return;
      if (loginChecked !== SERVER) return;
    }
  }
  const pw = $("loginPw").value;
  if (SYNC.setup && pw !== $("loginPw2").value) {
    $("loginErr").textContent = "Die beiden Passwörter sind nicht gleich.";
    return;
  }
  $("loginGo").disabled = true;
  $("loginErr").textContent = "";
  try {
    const code = $("loginCode").value.trim();
    const r = await api(SYNC.setup ? "setup" : "login", {
      body: SYNC.setup
        ? {
            password: pw,
          }
        : code
          ? {
              password: pw,
              code,
            }
          : {
              password: pw,
            },
    });
    const firstSetup = SYNC.setup && !SYNC.reset;
    SYNC.reset = false;
    loginDone(r.token, firstSetup);
  } catch (e) {
    if (e.status === 401 && e.data && e.data.need2fa) {
      $("loginCodeRow").hidden = false;
      $("loginErr").textContent = "";
      $("loginText").textContent =
        "Zwei-Faktor-Anmeldung ist an: Gib den 6-stelligen Code aus deiner Authenticator-App ein.";
      setTimeout(() => $("loginCode").focus(), 30);
    } else
      $("loginErr").textContent =
        e.status === 403 ? e.message || "Falsches Passwort." : e.message || "Verbindung fehlgeschlagen.";
  } finally {
    $("loginGo").disabled = false;
  }
}
function loginDone(token, firstSetup, msg) {
  SND.play("pair");
  $("loginCodeRow").hidden = true;
  $("loginCode").value = "";
  try {
    localStorage.setItem(MODE_KEY, MODE);
    if (MODE === "cloud" && !META_CLOUD) localStorage.setItem(CLOUD_KEY, SERVER);
  } catch (e) {}
  ui.tfa = undefined;
  SYNC.token = token;
  SYNC.rev = 0;
  SYNC.skipped = false;
  SYNC.queue = [];
  if (firstSetup) {
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
  } else {
    for (const k of ["tx", "txb", "fixed", "months", "debts", "acct"]) memStore[k] = {};
  }
  saveSync();
  $("loginBg").hidden = true;
  $("loginPw").value = "";
  $("loginPw2").value = "";
  $("loginRCode").value = "";
  toast(msg || (firstSetup ? "Passwort gespeichert, Daten werden hochgeladen" : "Verbunden"));
  startSync();
  setTimeout(() => {
    try {
      devPing(true);
    } catch (e) {}
  }, 1500);
}
/* Konto */
function normCloud(v) {
  v = (v || "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "http://" + v;
  try {
    const u = new URL(v);
    let p = u.pathname.replace(/\/+$/, "");
    if (!/\.php$/i.test(p)) p = (p ? p : "/haushaltsbuch") + "/cloud.php";
    return u.origin + p;
  } catch (e) {
    return "";
  }
}
let cloudChecked = "";
const CLOUD_TXT = {
  login: [
    "Anmelden",
    "Melde dich mit deinem Konto an. Danach siehst du auf diesem Gerät dieselben Daten wie auf deinen anderen Geräten.",
    "Anmelden",
  ],
  register: [
    "Konto erstellen",
    "Mit einem Konto gleichen sich Handy und PC automatisch ab. Was du schon eingetragen hast, wird mitgenommen.",
    "Konto erstellen",
  ],
  forgot: [
    "Passwort vergessen",
    "Gib deine E-Mail-Adresse ein. Wir schicken dir einen Code, mit dem du ein neues Passwort festlegst.",
    "Code schicken",
  ],
  reset: ["Neues Passwort", "", "Passwort speichern"],
};
function cloudUi() {
  const st = ui.lstep || "login",
    t = CLOUD_TXT[st];
  $("loginTitle").textContent = t[0];
  if (st !== "reset") $("loginText").textContent = t[1];
  $("loginGo").textContent = t[2];
  $("loginPwRow").hidden = st === "forgot";
  $("loginPwLbl").textContent =
    st === "register"
      ? "Passwort (mind. 10 Zeichen)"
      : st === "reset"
        ? "Neues Passwort (mind. 10 Zeichen)"
        : "Passwort";
  $("loginPw").autocomplete = st === "login" ? "current-password" : "new-password";
  $("loginPw2Row").hidden = !(st === "register" || st === "reset");
  $("loginRCodeRow").hidden = st !== "reset";
  $("loginEmail").disabled = st === "reset";
  if (st !== "login") {
    $("loginCodeRow").hidden = true;
    $("loginCode").value = "";
  }
  $("loginToggle").textContent = st === "login" ? "Neu hier? Konto erstellen" : "Zurück zur Anmeldung";
  $("loginForgot").hidden = st !== "login";
}
function cloudShow() {
  $("loginUrlRow").hidden = true;
  $("loginGo").disabled = false;
  if (!META_CLOUD && document.activeElement !== $("loginCloud")) $("loginCloud").value = lsGet(CLOUD_KEY);
  if (SYNC.email && !$("loginEmail").value) $("loginEmail").value = SYNC.email;
  cloudUi();
  setTimeout(() => {
    const f =
      !META_CLOUD && !$("loginCloud").value
        ? "loginCloud"
        : !$("loginEmail").value
          ? "loginEmail"
          : ui.lstep === "reset"
            ? "loginRCode"
            : "loginPw";
    $(f) && $(f).focus();
  }, 50);
}
async function cloudCheck() {
  const u = META_CLOUD || normCloud($("loginCloud").value);
  if (!u) {
    $("loginErr").textContent = "Bitte gib die Adresse des Abgleich-Servers ein.";
    return false;
  }
  if (u === SERVER && cloudChecked === u) return true;
  SERVER = u;
  if (!META_CLOUD) $("loginCloud").value = u;
  try {
    const st = await api("status");
    if (!st.cloud) {
      $("loginErr").textContent = "Unter dieser Adresse läuft kein Konto-Server (cloud.php).";
      return false;
    }
  } catch (e) {
    $("loginErr").textContent =
      "Der Abgleich-Server ist gerade nicht erreichbar. Prüfe die Internetverbindung oder mach erst einmal ohne Abgleich weiter.";
    return false;
  }
  cloudChecked = u;
  return true;
}
async function cloudGo() {
  const st = ui.lstep || "login",
    email = $("loginEmail").value.trim(),
    pw = $("loginPw").value,
    err = (m) => ($("loginErr").textContent = m);
  err("");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("Bitte gib deine E-Mail-Adresse ein.");
  if (st !== "forgot" && !pw) return err("Bitte gib dein Passwort ein.");
  if ((st === "register" || st === "reset") && pw.length < 10)
    return err("Das Passwort braucht mindestens 10 Zeichen.");
  if ((st === "register" || st === "reset") && pw !== $("loginPw2").value)
    return err("Die beiden Passwörter sind nicht gleich.");
  if (st === "reset" && !$("loginRCode").value.trim()) return err("Bitte gib den Code aus der E-Mail ein.");
  $("loginGo").disabled = true;
  try {
    if (!(await cloudCheck())) return;
    if (st === "forgot") {
      await api("forgot", {
        body: {
          email,
        },
      });
      ui.lstep = "reset";
      cloudUi();
      $("loginText").textContent =
        `Falls es für ${email} ein Konto gibt, ist jetzt ein Code unterwegs (gilt 15 Minuten). Schau auch im Spam-Ordner nach.`;
      setTimeout(() => $("loginRCode").focus(), 30);
      return;
    }
    if (st === "register") {
      const r = await api("register", {
        body: {
          email,
          password: pw,
        },
      });
      SYNC.email = email.toLowerCase();
      ui.lstep = "login";
      loginDone(r.token, true, "Konto erstellt – deine Daten werden hochgeladen");
      return;
    }
    if (st === "reset") {
      const r = await api("reset", {
        body: {
          email,
          code: $("loginRCode").value.trim(),
          password: pw,
        },
      });
      SYNC.email = email.toLowerCase();
      ui.lstep = "login";
      loginDone(r.token, false, "Neues Passwort gespeichert");
      return;
    }
    const code = $("loginCode").value.trim();
    const r = await api("login", {
      body: code
        ? {
            email,
            password: pw,
            code,
          }
        : {
            email,
            password: pw,
          },
    });
    SYNC.email = email.toLowerCase();
    loginDone(r.token, false);
  } catch (e) {
    if (e.status === 401 && e.data && e.data.need2fa) {
      $("loginCodeRow").hidden = false;
      $("loginText").textContent =
        "Zwei-Faktor-Anmeldung ist an: Gib den 6-stelligen Code aus deiner Authenticator-App ein (oder einen Wiederherstellungscode).";
      setTimeout(() => $("loginCode").focus(), 30);
    } else if (e.status === 409) {
      err(e.message);
      ui.lstep = "login";
      cloudUi();
    } else err(e.message && !/^HTTP /.test(e.message) ? e.message : "Verbindung fehlgeschlagen.");
  } finally {
    $("loginGo").disabled = false;
  }
}
$("loginToggle").onclick = () => {
  ui.lstep = (ui.lstep || "login") === "login" ? "register" : "login";
  $("loginErr").textContent = "";
  cloudUi();
};
$("loginForgot").onclick = () => {
  ui.lstep = "forgot";
  $("loginErr").textContent = "";
  cloudUi();
  setTimeout(() => $("loginEmail").focus(), 30);
};
$("loginSeg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lm]");
  if (!b || b.dataset.lm === MODE) return;
  MODE = b.dataset.lm;
  SERVER =
    MODE === "cloud"
      ? META_CLOUD || normCloud($("loginCloud").value) || lsGet(CLOUD_KEY)
      : MODE === "pair"
        ? pairUrl()
        : nasUrl();
  if (MODE !== "pair") {
    $("loginPwRow").hidden = false;
  }
  loginChecked = "";
  cloudChecked = "";
  ui.lstep = "login";
  $("loginCodeRow").hidden = true;
  $("loginPw2Row").hidden = true;
  showLogin();
});
$("loginGo").onclick = doLogin;
["loginPw", "loginPw2", "loginEmail", "loginRCode", "loginCode", "loginCloud"].forEach((id) =>
  $(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  })
);
(function () {
  const ORDER = ["home", "beruf", "zukunft", "shop"],
    RENDER = {
      beruf: () => renderBeruf(),
      zukunft: () => {
        renderZukunft();
        if (!IS_PC) initStack("zstack", "zkIdx", "zdots");
      },
      shop: () => renderShop(),
      home: () => renderHome(),
      list: () => renderList(),
      fix: () => renderFix(),
      year: () => renderYear(),
      ziele: () => renderZiele(),
      more: () => {
        renderMore();
        renderSpPages();
      },
    };
  const main = document.querySelector("main.wrap");
  const hScroll = (t) => {
    for (let n = t; n && n !== document.body; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 2) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === "auto" || ox === "scroll") return true;
      }
    }
    return false;
  };
  const blocked = (t) =>
    t.closest(
      "#moBg,#mbBg,#tourBg,.hobg,.sheet,.backdrop,.fan,.docrev,.pfed,#lockBg,#loginBg,#astack,#zstack,.srail,.bt3,.bubbles,.fxchips,input[type=range],input:focus,select:focus,textarea:focus,.wiz,[data-noswipe]"
    ) ||
    hScroll(t) ||
    document.querySelector(".backdrop:not([hidden])");
  const sec = (k) => document.querySelector(`[data-view="${k}"]`);
  let x0 = 0,
    y0 = 0,
    t0 = 0,
    on = false,
    lock = null,
    dir = 0,
    cur = null,
    nbKey = null,
    W = 1,
    p = 0,
    busy = false,
    lastX = 0,
    lastT = 0,
    vx = 0;
  let stage = null,
    fC = null,
    fN = null,
    shC = null,
    shN = null,
    sY = 0,
    nY = 0;
  const MEM = {};
  function face(srcSec, top, trim = true) {
    const f = document.createElement("div");
    f.className = "cubeface";
    const c = srcSec.cloneNode(true);
    c.hidden = false;
    c.removeAttribute("data-view");
    c.querySelectorAll("[id],[data-view]").forEach((e) => {
      e.removeAttribute("id");
      e.removeAttribute("data-view");
    });
    c.classList.add("cubing");
    const r = cur.getBoundingClientRect();
    Object.assign(c.style, {
      position: "absolute",
      left: r.left + "px",
      width: r.width + "px",
      top: top + "px",
      margin: "0",
    });
    const SC = ".srail,.stabs,.acards,.filters,.rings,.jars,.bubbles,.table-wrap,.tlchips",
      a = srcSec.querySelectorAll(SC),
      b = c.querySelectorAll(SC);
    for (let i = 0; i < a.length && i < b.length; i++)
      if (a[i].scrollLeft)
        [...b[i].children].forEach((ch) => (ch.style.transform = `translateX(${-a[i].scrollLeft}px)`));
    const sr = srcSec.getBoundingClientRect(),
      H = stage.clientHeight || innerHeight,
      kids = [...srcSec.children],
      ck = [...c.children];
    if (trim)
      kids.forEach((k, i) => {
        const r = k.getBoundingClientRect(),
          y = top + (r.top - sr.top);
        if (ck[i] && (y + r.height < -40 || y > H + 40)) {
          ck[i].style.height = r.height + "px";
          ck[i].style.overflow = "hidden";
          ck[i].style.contentVisibility = "hidden";
        }
      });
    const sh = document.createElement("div");
    sh.className = "cubeshade";
    f.appendChild(c);
    f.appendChild(sh);
    stage.appendChild(f);
    return [f, sh];
  }
  let PREP = null,
    prepT = 0,
    dirty = true;
  const neighbour = (v, d) => {
    const i = ORDER.indexOf(v),
      n = ORDER.length;
    return ORDER[(i + (d < 0 ? 1 : -1) + n) % n];
  };
  function headTop() {
    const hb = document.querySelector("header.top") || document.querySelector(".top"),
      hr = hb
        ? hb.getBoundingClientRect()
        : {
            bottom: 0,
          };
    return Math.max(0, Math.round(hr.bottom));
  }
  function build(dirs, full) {
    const sTop = headTop(),
      H = innerHeight - sTop;
    W = innerWidth;
    stage = document.createElement("div");
    stage.className = "cubestage";
    Object.assign(stage.style, {
      top: sTop + "px",
      height: H + "px",
      perspective: Math.round(W * 2.6) + "px",
      perspectiveOrigin: `50% ${H / 2}px`,
    });
    if (full) stage.style.visibility = "hidden";
    document.body.appendChild(stage);
    const c0 = sec(ui.view),
      top0 = c0.getBoundingClientRect().top + scrollY;
    cur = c0;
    const fc = face(c0, c0.getBoundingClientRect().top - sTop, !full);
    const out = {
      view: ui.view,
      key: freshKey(),
      sTop,
      W,
      stage,
      cur: fc,
      nb: {},
    };
    for (const d of dirs) {
      const k = neighbour(ui.view, d);
      if (!k || out.nb[k]) continue;
      const nb = sec(k);
      nb.hidden = false;
      try {
        if (FRESH[k] !== freshKey()) {
          try {
            RENDER[k]();
            FRESH[k] = freshKey();
          } catch (e) {}
        }
        const maxY = Math.max(
            0,
            Math.round(document.documentElement.scrollHeight - c0.offsetHeight + nb.offsetHeight - innerHeight)
          ),
          y = Math.min(MEM[k] || 0, maxY);
        const fn = face(nb, top0 - sTop - y);
        if (full) fn[0].style.visibility = "hidden";
        out.nb[k] = {
          f: fn,
          nY: y,
        };
      } finally {
        nb.hidden = k !== ui.view;
      }
    }
    return out;
  }
  function prep() {
    prepT = 0;
    if (IS_PC || !ORDER.includes(ui.view)) return;
    /* Gerade offen oder in Bewegung: später nochmal versuchen, sonst baut erst das nächste Wischen
       die Seiten zusammen – und das ruckelt */
    if (on || busy || stage || document.querySelector(".backdrop:not([hidden])")) {
      prepT = setTimeout(prep, 800);
      return;
    }
    if (PREP) {
      PREP.stage.remove();
      PREP = null;
    }
    try {
      PREP = build([-1, 1], true);
    } catch (e) {
      console.warn("cube prep", e);
      if (stage) stage.remove();
      PREP = null;
    }
    stage = null;
    cur = null;
    dirty = false;
    mo.takeRecords();
  }
  function schedule() {
    dirty = true;
    if (PREP) {
      PREP.stage.remove();
      PREP = null;
    }
    clearTimeout(prepT);
    prepT = setTimeout(() => {
      (window.requestIdleCallback || setTimeout)(prep, {
        timeout: 1500,
      });
    }, 500);
  }
  const mo = new MutationObserver((list) => {
    if (on || busy) return;
    if (list.some((m) => !m.target.closest || !m.target.closest(".cubestage"))) schedule();
  });
  if (main)
    mo.observe(main, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden"],
    });
  addEventListener("resize", schedule);
  schedule();
  function setup(d) {
    dir = d;
    nbKey = neighbour(ui.view, d);
    W = innerWidth;
    const ok =
      PREP &&
      !dirty &&
      PREP.view === ui.view &&
      PREP.key === freshKey() &&
      PREP.sTop === headTop() &&
      PREP.W === W &&
      PREP.nb[nbKey];
    if (ok) {
      stage = PREP.stage;
      cur = sec(ui.view);
      [fC, shC] = PREP.cur;
      fC.firstChild.style.top = cur.getBoundingClientRect().top - PREP.sTop + "px";
      for (const [k, v] of Object.entries(PREP.nb)) v.f[0].style.visibility = k === nbKey ? "" : "hidden";
      [fN, shN] = PREP.nb[nbKey].f;
      nY = PREP.nb[nbKey].nY;
      stage.style.visibility = "";
    } else {
      if (PREP) {
        PREP.stage.remove();
        PREP = null;
      }
      const b = build([d], false);
      mo.takeRecords();
      [fC, shC] = b.cur;
      [fN, shN] = b.nb[nbKey].f;
      nY = b.nb[nbKey].nY;
    }
    PREP = null;
    cur.style.opacity = "0";
    sY = scrollY;
    draw();
  }
  function draw() {
    const a = Math.min(1, Math.abs(p));
    if (!nbKey) {
      fC.style.transform = `translateX(${p * W * 0.25}px)`;
      return;
    }
    const s = dir < 0 ? -1 : 1,
      h = W / 2,
      th = s * a * 90;
    fC.style.transform = `translateZ(${-h}px) rotateY(${th}deg) translateZ(${h}px)`;
    shC.style.opacity = String(a * 0.6);
    fN.style.transform = `translateZ(${-h}px) rotateY(${th - s * 90}deg) translateZ(${h}px)`;
    shN.style.opacity = String((1 - a) * 0.6);
  }
  function reset() {
    if (stage) stage.remove();
    if (cur) {
      cur.style.opacity = "";
      if (Math.abs(scrollY - sY) > 1)
        window.scrollTo({
          top: sY,
        });
    }
    stage = fC = fN = shC = shN = cur = nbKey = null;
    p = 0;
    dir = 0;
    schedule();
  }
  function settle(go) {
    busy = true;
    [fC, fN].filter(Boolean).forEach((el) => (el.style.transition = "transform .3s cubic-bezier(.2,.8,.2,1)"));
    [shC, shN].filter(Boolean).forEach((el) => (el.style.transition = "opacity .3s"));
    const target = go && nbKey;
    p = target ? (dir < 0 ? -1 : 1) : 0;
    draw();
    setTimeout(() => {
      const k = nbKey;
      if (target) {
        MEM[ui.view] = sY;
        ui.view = k;
        if (window.ANIM) ANIM.skip = true;
        UX.quiet = true;
        render.keep = true;
        render();
        sY = nY;
        window.scrollTo({
          top: nY,
        });
      }
      requestAnimationFrame(() => {
        reset();
        busy = false;
      });
    }, 310);
  }
  window.hbCubeGo = (d) => {
    if (
      busy ||
      on ||
      stage ||
      !ORDER.includes(ui.view) ||
      (ui.view === "more" && ui.sp && !spsOpen()) ||
      document.querySelector(".backdrop:not([hidden])")
    )
      return false;
    try {
      setup(d > 0 ? -1 : 1);
    } catch (e) {
      reset();
      return false;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => settle(true)));
    return true;
  };
  document.addEventListener(
    "touchstart",
    (e) => {
      on = false;
      if (
        IS_PC ||
        busy ||
        e.touches.length !== 1 ||
        !ORDER.includes(ui.view) ||
        (ui.view === "more" && ui.sp && !spsOpen()) ||
        blocked(e.target)
      )
        return;
      const x = e.touches[0].clientX;
      if (x < 18 || x > innerWidth - 18) return;
      x0 = lastX = x;
      y0 = e.touches[0].clientY;
      t0 = lastT = Date.now();
      vx = 0;
      lock = null;
      on = true;
    },
    {
      passive: true,
    }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (!on) return;
      if (e.touches.length !== 1) {
        if (lock === "x" && cur) settle(false);
        on = false;
        return;
      }
      const cx = e.touches[0].clientX,
        dx = cx - x0,
        dy = e.touches[0].clientY - y0,
        now = Date.now();
      if (lock === null) {
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
        lock = Math.abs(dx) > Math.abs(dy) * 1.3 && window.scrollX === 0 ? "x" : "y";
        if (lock === "x") {
          x0 = cx;
          setup(dx < 0 ? -1 : 1);
        }
      }
      if (lock !== "x") return;
      if (e.cancelable) e.preventDefault();
      const ddx = cx - x0;
      if (ddx !== 0 && (ddx < 0 ? -1 : 1) !== dir) {
        reset();
        setup(ddx < 0 ? -1 : 1);
      }
      if (now > lastT) {
        vx = 0.7 * vx + (0.3 * (cx - lastX)) / (now - lastT);
        lastX = cx;
        lastT = now;
      }
      p = Math.max(-1, Math.min(1, (ddx / W) * (nbKey ? 1 : 0.5)));
      if (!draw.q) {
        draw.q = requestAnimationFrame(() => {
          draw.q = 0;
          if (fC) draw();
        });
      }
    },
    {
      passive: false,
    }
  );
  const end = (e) => {
    if (!on) return;
    on = false;
    if (lock !== "x" || !cur) return;
    /* Auf langsamen Geräten gehen Zwischen-Bewegungen verloren – die Stelle, an der der Finger loslässt, zählt mit */
    const ct = e && e.type === "touchend" && e.changedTouches && e.changedTouches[0];
    if (ct) {
      const cx = ct.clientX,
        ddx = cx - x0,
        now = Date.now();
      if (ddx !== 0 && (ddx < 0 ? -1 : 1) === dir) {
        const np = Math.max(-1, Math.min(1, (ddx / W) * (nbKey ? 1 : 0.5)));
        if (Math.abs(np) > Math.abs(p)) {
          if (now > lastT) vx = 0.5 * vx + (0.5 * (cx - lastX)) / (now - lastT);
          p = np;
        }
      }
    }
    const fling = Math.abs(vx) > 0.6 && (vx < 0 ? -1 : 1) === dir && Math.abs(p) > 0.15;
    settle(Math.abs(p) > 0.35 || fling);
  };
  document.addEventListener("touchend", end);
  document.addEventListener("touchcancel", end);
})();
(function () {
  const el = $("ptr"),
    MAX = 110,
    GO = 70;
  let y0 = 0,
    x0 = 0,
    d = 0,
    on = false,
    decided = false,
    busy = false;
  const blocked = (t) =>
    t.closest(
      "#moBg,#mbBg,#tourBg,.hobg,.sheet,.backdrop,.fan,.docrev,.pfed,#lockBg,#loginBg,.srail,.stack,.bt3,input[type=range],textarea,.wiz"
    ) || document.querySelector(".backdrop:not([hidden])");
  const set = (v, rot) => {
    el.style.transform = `translateY(${v - 50}px) rotate(${rot}deg)`;
    el.style.opacity = String(Math.min(1, v / GO));
  };
  document.addEventListener(
    "touchstart",
    (e) => {
      if (busy || e.touches.length !== 1 || window.scrollY > 0 || blocked(e.target)) {
        on = false;
        return;
      }
      y0 = e.touches[0].clientY;
      x0 = e.touches[0].clientX;
      d = 0;
      on = true;
      decided = false;
      el.classList.remove("back");
    },
    {
      passive: true,
    }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (!on) return;
      const dy = e.touches[0].clientY - y0,
        dx = e.touches[0].clientX - x0;
      if (!decided) {
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        decided = true;
        /* nur eindeutig nach unten – schräge Wischer gehören dem Seitenwechsel */
        if (dy <= 0 || Math.abs(dx) * 1.5 > dy || window.scrollY > 0) {
          on = false;
          return;
        }
      }
      d = Math.min(MAX, dy * 0.5);
      set(d + 20, d * 3);
      if (e.cancelable) e.preventDefault();
    },
    {
      passive: false,
    }
  );
  const end = async () => {
    if (!on || !decided) {
      on = false;
      return;
    }
    on = false;
    el.classList.add("back");
    if (d < GO) {
      el.style.transform = "";
      el.style.opacity = "";
      return;
    }
    busy = true;
    set(70, 0);
    el.classList.add("spin");
    try {
      navigator.vibrate && navigator.vibrate(10);
    } catch (x) {}
    try {
      if (SYNC.token) await syncNow();
      render();
      if (typeof renderSyncInfo === "function") renderSyncInfo();
      ghCheck(true);
    } catch (x) {}
    setTimeout(() => {
      el.classList.remove("spin");
      el.style.transform = "";
      el.style.opacity = "";
      busy = false;
      toast(
        SYNC.token
          ? SYNC.state === "ok"
            ? "Aktualisiert"
            : "Aktualisiert – Abgleich gerade nicht möglich"
          : "Aktualisiert"
      );
    }, 400);
  };
  document.addEventListener("touchend", end);
  document.addEventListener("touchcancel", end);
})();
(function () {
  const CLOSERS = {
    loginBg: "#loginX",
    artBg: "[data-artclose]",
    tcBg: "[data-tcclose]",
    addBg: "[data-addclose]",
    hintBg: "[data-hintclose]",
    anaBg: "[data-anaclose]",
    spBg: "[data-spclose]",
    sheetBg: "#sheetClose",
  };
  Object.keys(CLOSERS).forEach((id) => {
    const bg = $(id),
      sh = bg && bg.querySelector(".sheet");
    if (!sh) return;
    let y0 = 0,
      x0 = 0,
      dy = 0,
      t0 = 0,
      on = false,
      decided = false,
      tgt = null;
    const scrolled = (t) => {
      for (let n = t; n && n !== bg; n = n.parentElement) if (n.scrollTop > 0) return true;
      return false;
    };
    sh.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        const t = e.target;
        if (t.closest("input[type=range],.srail,.kpad,textarea")) return;
        y0 = e.touches[0].clientY;
        x0 = e.touches[0].clientX;
        dy = 0;
        t0 = Date.now();
        tgt = t;
        on = !scrolled(t);
        decided = false;
      },
      {
        passive: true,
      }
    );
    sh.addEventListener(
      "touchmove",
      (e) => {
        if (!on) return;
        const d = e.touches[0].clientY - y0,
          dx = e.touches[0].clientX - x0;
        if (!decided) {
          if (Math.abs(d) < 8 && Math.abs(dx) < 8) return;
          decided = true;
          if (d <= 0 || Math.abs(dx) > Math.abs(d) || scrolled(tgt)) {
            on = false;
            return;
          }
          sh.classList.add("dragging");
        }
        dy = Math.max(0, d);
        sh.style.transform = `translateY(${dy}px)`;
        bg.style.opacity = String(Math.max(0.35, 1 - dy / 600));
        if (e.cancelable) e.preventDefault();
      },
      {
        passive: false,
      }
    );
    const end = () => {
      if (!on || !decided) {
        on = false;
        return;
      }
      on = false;
      const fast = dy > 50 && dy / (Date.now() - t0) > 0.5;
      sh.classList.remove("dragging");
      if (dy > Math.min(140, sh.offsetHeight * 0.3) || fast) {
        sh.style.transition = "transform .2s ease-in";
        sh.style.transform = `translateY(${sh.offsetHeight}px)`;
        setTimeout(() => {
          const c = sh.querySelector(CLOSERS[id]);
          if (c) c.click();
          sh.style.transition = "";
          sh.style.transform = "";
          bg.style.opacity = "";
        }, 190);
      } else {
        sh.style.transform = "";
        bg.style.opacity = "";
      }
      dy = 0;
    };
    sh.addEventListener("touchend", end);
    sh.addEventListener("touchcancel", end);
  });
})();
$("syncMoreBtn").onclick = () => {
  const m = $("syncMore"),
    open = m.hidden;
  m.hidden = !open;
  $("syncMoreBtn").setAttribute("aria-expanded", String(open));
};
$("loginX").onclick = () => {
  if (SYNC.token) {
    $("loginBg").hidden = true;
    ui.pstep = "start";
    pairRecvStop();
    renderSyncInfo();
  } else $("loginSkip").click();
};
$("loginSkip").onclick = () => {
  if (actNeed()) {
    $("loginBg").hidden = true;
    actGate();
    return;
  }
  SYNC.skipped = true;
  saveSync();
  $("loginBg").hidden = true;
  renderSyncDot();
  if (wizShould())
    setTimeout(() => {
      if (wizShould()) wizOpen();
    }, 300);
  toast("Ohne Abgleich – anmelden kannst du dich unter Einstellungen");
};
function renderSyncDot() {
  const b = $("settingsBtn");
  if (!SYNCABLE) {
    return;
  }
  const col = !SYNC.token
    ? "var(--faint)"
    : SYNC.state === "ok"
      ? "var(--good)"
      : SYNC.state === "pending"
        ? "var(--warn)"
        : "var(--bad)";
  b.style.boxShadow = `var(--shadow), inset 0 0 0 2px ${col}`;
  const td = document.querySelector(".tset");
  if (td) {
    td.style.setProperty("--sdot", col);
    td.classList.toggle("dot", !!SYNC.token && SYNC.state !== "ok");
  }
  if (ui.view === "more") {
    renderSyncInfo();
    if (!ui.sp) renderSetHome();
  }
}
const SVG_PHONE =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>';
const SVG_PC =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/></svg>';
const SVG_SRV =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3.5" width="16" height="7" rx="2"/><rect x="4" y="13.5" width="16" height="7" rx="2"/><path d="M8 7h.01M8 17h.01"/></svg>';
const SVG_CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const SVG_SYNC =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/></svg>';
const SVG_DOWN =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M6.5 11 12 16.5 17.5 11M5 20h14"/></svg>';
const SVG_ALERT =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5M12 16.5h.01"/><circle cx="12" cy="12" r="9"/></svg>';
const SVG_LINK =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
function heroState() {
  let u = {};
  try {
    u = UPD;
  } catch (e) {}
  const t = SYNC.last
    ? new Date(SYNC.last).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  if (u.dl)
    return {
      k: "upd",
      busy: 1,
      ic: SVG_DOWN,
      t: "Update wird geladen …",
      s: "Gleich ist die neue Version da",
    };
  if (u.busy)
    return {
      k: "upd",
      busy: 1,
      ic: SVG_DOWN,
      t: "Suche nach Updates …",
      s: "Die App fragt nach einer neuen Version",
    };
  if ((ui.precv || (typeof SHORT !== "undefined" && SHORT)) && !$("loginBg").hidden)
    return {
      k: "pair",
      busy: 1,
      ic: SVG_LINK,
      t: "Warte auf das andere Gerät …",
      s: "Code eintippen oder QR-Code scannen",
    };
  if (!SYNC.token)
    return {
      k: "off",
      ic: SVG_LINK,
      t: "Noch nicht gekoppelt",
      s: "Koppel Handy und PC – ohne Konto",
    };
  if (SYNC.busy) heroState.until = Date.now() + 1400;
  if (SYNC.busy || Date.now() < (heroState.until || 0))
    return {
      k: "sync",
      busy: 1,
      ic: SVG_SYNC,
      t: "Wird abgeglichen …",
      s: "Deine Daten gehen verschlüsselt hin und her",
    };
  if (SYNC.state === "ok")
    return {
      k: "ok",
      ic: SVG_CHECK,
      t: "Alles abgeglichen",
      s: t ? "zuletzt heute um " + t : "",
    };
  if (SYNC.state === "pending")
    return {
      k: "wait",
      ic: SVG_SYNC,
      t: `${SYNC.queue.length} ${SYNC.queue.length === 1 ? "Änderung wartet" : "Änderungen warten"}`,
      s: "Wird gleich abgeglichen",
    };
  if (SYNC.state === "offline")
    return {
      k: "wait",
      ic: SVG_ALERT,
      t: "Offline",
      s: "Wird nachgeholt, sobald du online bist",
    };
  return {
    k: "bad",
    ic: SVG_ALERT,
    t: "Server nicht erreichbar",
    s: SYNC.err ? "Fehler: " + SYNC.err : "Tippe auf „Jetzt abgleichen“, um es nochmal zu versuchen",
  };
}
let HERO_KEY = "",
  HERO_T = 0;
function renderHero(force) {
  const el = $("syncHero");
  if (!el) return;
  const h = heroState(),
    key = JSON.stringify(h);
  if (!force && key === HERO_KEY) return;
  HERO_KEY = key;
  const me = IS_DESK ? ["PC", SVG_PC] : ["Handy", SVG_PHONE],
    other = IS_DESK ? ["Handy", SVG_PHONE] : ["PC", SVG_PC];
  el.className = `shero s-${h.k}${h.busy ? " busy" : ""}`;
  el.innerHTML = `<div class="hic">${h.ic}</div><b>${escHtml(h.t)}</b><span class="hsub">${escHtml(h.s || "")}</span>
    <div class="chain" aria-hidden="true"><span class="nd on">${me[1]}${escHtml(me[0])}</span><span class="ln l1"><i></i><i></i></span><span class="nd">${SVG_SRV}Server</span><span class="ln l2"><i></i><i></i></span><span class="nd">${other[1]}${escHtml(other[0])}</span></div>`;
  if (I18N && LANG !== "de") I18N.walk(el);
}
function heroTick() {
  clearInterval(HERO_T);
  HERO_T = 0;
  if ($("syncBox") && !$("syncBox").hidden)
    HERO_T = setInterval(() => {
      if ($("syncBox").hidden) {
        clearInterval(HERO_T);
        HERO_T = 0;
        return;
      }
      renderHero();
    }, 300);
}
function renderSyncInfo() {
  $("syncBox").hidden = !SYNCABLE || ui.view !== "more" || !ACC.open.has("sync");
  if (!SYNCABLE) return;
  document.querySelectorAll("#syncBox i[data-ic]").forEach((i) => {
    if (!i.firstChild) i.innerHTML = svgIcon(i.dataset.ic, i.closest(".sact") ? 20 : 16);
  });
  const st = !SYNC.token
    ? "Nicht angemeldet"
    : SYNC.state === "ok"
      ? "Abgeglichen"
      : SYNC.state === "pending"
        ? `${SYNC.queue.length} Änderungen warten`
        : SYNC.state === "offline"
          ? "Offline – wird nachgeholt"
          : SYNC.err
            ? "Server-Fehler: " + SYNC.err
            : "Server nicht erreichbar";
  $("syncState").textContent = st;
  $("syncMoreBtn").hidden = !SYNC.token || MODE === "pair";
  $("syncMore").hidden = SYNC.token ? $("syncMoreBtn").getAttribute("aria-expanded") !== "true" : true;
  $("syncNow").disabled = !SYNC.token;
  $("syncActs").hidden = !SYNC.token;
  $("syncConnect").hidden = !!SYNC.token;
  $("syncBadge").hidden = MODE !== "pair" || !SYNC.token;
  $("syncLogout").textContent = SYNC.token ? "Auf diesem Gerät abmelden" : "Anmelden";
  renderSyncSec();
  $("syncLogout").classList.toggle("primary", !SYNC.token);
  renderHero(true);
  heroTick();
  try {
    renderGeraete();
  } catch (e) {}
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#syncNow")) {
    const why = !SERVER ? "keine Server-Adresse" : !SYNC.token ? "nicht angemeldet" : SYNC.busy ? "läuft noch" : "";
    syncNow().then(() => {
      renderSyncInfo();
      toast(
        SYNC.state === "ok"
          ? "Abgeglichen"
          : "Abgleich gerade nicht möglich" + (why ? " – " + why : SYNC.err ? " – " + SYNC.err : ""),
        null,
        null,
        9000
      );
    });
  }
  if (e.target.closest("#syncConnect")) {
    showLogin();
    return;
  }
  if (e.target.closest("#syncLogout")) {
    if (!SYNC.token) {
      showLogin();
      return;
    }
    const b = e.target.closest("#syncLogout");
    if (b.dataset.armed !== "1") {
      b.dataset.armed = "1";
      b.textContent = "Wirklich abmelden?";
      setTimeout(() => {
        b.dataset.armed = "";
        renderSyncInfo();
      }, 3000);
      return;
    }
    if (MODE !== "pair")
      api("logout", {
        body: {},
      }).catch(() => {});
    else pairSave(null);
    SYNC.token = "";
    SYNC.queue = [];
    SYNC.state = "off";
    saveSync();
    renderSyncInfo();
    renderSyncDot();
  }
});

/* Koppeln */
const PAIR_KEY = "hb-pair";
function pairState() {
  try {
    return JSON.parse(localStorage.getItem(PAIR_KEY) || "null");
  } catch (e) {
    return null;
  }
}
function pairSave(p) {
  try {
    if (p) localStorage.setItem(PAIR_KEY, JSON.stringify(p));
    else localStorage.removeItem(PAIR_KEY);
  } catch (e) {}
  PAIR_K = null;
}
function pairUrl() {
  const p = pairState();
  return (p && p.s) || META_PAIR || (META_SERVER ? META_SERVER.replace(/api\.php.*$/, "pair.php") : "");
}
const b64u = (bytes) => {
  let s = "";
  const u = new Uint8Array(bytes);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64u = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const b = atob(s),
    u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
};
const toHex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
let PAIR_K = null;
async function pairKeys() {
  if (PAIR_K) return PAIR_K;
  const p = pairState();
  if (!p) throw new Error("nicht gekoppelt");
  const base = await crypto.subtle.importKey("raw", fromB64u(p.k), "HKDF", false, ["deriveKey", "deriveBits"]);
  const prm = (info) => ({
    name: "HKDF",
    hash: "SHA-256",
    salt: new TextEncoder().encode("finanz-mami-v1"),
    info: new TextEncoder().encode(info),
  });
  const enc = await crypto.subtle.deriveKey(
    prm("enc"),
    base,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
  const mac = await crypto.subtle.deriveKey(
    prm("id"),
    base,
    {
      name: "HMAC",
      hash: "SHA-256",
      length: 256,
    },
    false,
    ["sign"]
  );
  const auth = toHex(await crypto.subtle.deriveBits(prm("auth"), base, 256));
  return (PAIR_K = {
    enc,
    mac,
    auth,
    vault: toHex(fromB64u(p.v)),
  });
}
async function pairHid(col, id) {
  const K = await pairKeys();
  return b64u((await crypto.subtle.sign("HMAC", K.mac, new TextEncoder().encode(col + "\u0000" + id))).slice(0, 24));
}
async function pairEnc(obj) {
  const K = await pairKeys(),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    K.enc,
    new TextEncoder().encode(JSON.stringify(obj))
  );
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), 12);
  return b64u(out);
}
async function pairDec(b) {
  const K = await pairKeys(),
    u = fromB64u(b);
  const pt = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: u.slice(0, 12),
    },
    K.enc,
    u.slice(12)
  );
  return JSON.parse(new TextDecoder().decode(pt));
}
async function pairEncOps(ops) {
  const out = [];
  for (const o of ops)
    out.push({
      h: await pairHid(o.col, o.id),
      b: await pairEnc({
        c: o.col,
        i: o.id,
        d: o.data === undefined ? null : o.data,
      }),
    });
  return out;
}
async function pairDecDocs(docs) {
  const out = [];
  for (const d of docs || []) {
    if (!d.b) continue;
    try {
      const o = await pairDec(d.b);
      out.push({
        col: o.c,
        id: o.i,
        data: o.d,
        rev: d.rev,
      });
    } catch (e) {}
  }
  return out;
}
function pairCode() {
  const p = pairState();
  if (!p) return "";
  return "HBP1." + p.v + "." + p.k + (p.s && p.s !== META_PAIR ? "." + b64u(new TextEncoder().encode(p.s)) : "");
}
function pairParse(t) {
  const m = String(t || "")
    .replace(/\s+/g, "")
    .match(/HBP1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})(?:\.([A-Za-z0-9_-]+))?/);
  if (!m) return null;
  let s = "";
  if (m[3])
    try {
      s = new TextDecoder().decode(fromB64u(m[3]));
    } catch (e) {
      return null;
    }
  return {
    v: m[1],
    k: m[2],
    s: s || "",
  };
}
const pairToken = async () => {
  const K = await pairKeys();
  return K.vault + "." + K.auth;
};
/* Backup */
const cryptoCan = () => !!(window.crypto && crypto.subtle);
async function secEnc(K, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    K.enc,
    new TextEncoder().encode(JSON.stringify(obj))
  );
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), 12);
  return "hbv1:" + b64u(out);
}
async function secDec(K, s) {
  const u = fromB64u(String(s).slice(5));
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: u.slice(0, 12),
        },
        K.enc,
        u.slice(12)
      )
    )
  );
}
function syncQueueAll() {
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
  SYNC.rq = [...new Set([...(SYNC.rq || []), ...RCPT.ids])];
  SYNC.queue.push({
    col: "app",
    id: "settings",
    data: clone(store.settings),
  });
}
const backupEnc = () => MODE === "pair" && !!pairState() && cryptoCan();
async function pairBackupKey(k) {
  const base = await crypto.subtle.importKey("raw", fromB64u(k), "HKDF", false, ["deriveKey", "deriveBits"]);
  const prm = (info) => ({
    name: "HKDF",
    hash: "SHA-256",
    salt: new TextEncoder().encode("finanz-mami-v1"),
    info: new TextEncoder().encode(info),
  });
  return {
    enc: await crypto.subtle.deriveKey(
      prm("backup"),
      base,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    ),
    check: toHex(await crypto.subtle.deriveBits(prm("backup-check"), base, 128)),
  };
}
async function backupText() {
  const p = backupEnc() && pairState();
  if (p) {
    const P = await pairBackupKey(p.k);
    return JSON.stringify({
      hbPair: 1,
      check: P.check,
      d: await secEnc(P, backupData()),
    });
  }
  return JSON.stringify(backupData());
}
async function backupOpenPair(o, then) {
  const p = pairState();
  if (p) {
    const P = await pairBackupKey(p.k);
    if (P.check === o.check) {
      then(await secDec(P, o.d));
      return;
    }
  }
  codeSheet(async (raw) => {
    const q = pairParse(raw);
    if (!q) throw new Error("Das ist kein gültiger Wiederherstellungs-Code.");
    const P = await pairBackupKey(q.k);
    if (P.check !== o.check) throw new Error("Dieser Code passt nicht zu diesem Backup.");
    then(await secDec(P, o.d));
  });
}
function codeSheet(done) {
  let el = $("codeBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "codeBg";
    el.className = "backdrop";
    el.innerHTML = `<div class="sheet" role="dialog" aria-label="Wiederherstellungs-Code"></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-cclose]")) codeClose();
    });
  }
  ui.code = {
    done,
    err: "",
    val: "",
  };
  codeRender();
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
}
function codeClose() {
  const el = $("codeBg");
  if (!el) return;
  el.classList.remove("show");
  setTimeout(() => {
    el.hidden = true;
    el.querySelector(".sheet").innerHTML = "";
    ui.code = null;
  }, 200);
}
function codeRender() {
  const el = $("codeBg"),
    C = ui.code;
  if (!el || !C) return;
  el.querySelector(".sheet").innerHTML =
    `<div class="sheet-head"><h2>Wiederherstellungs-Code eingeben</h2><button class="iconbtn" data-cclose="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <p class="small muted" style="margin:0 0 12px">Dieses Backup ist verschlüsselt. Gib den Wiederherstellungs-Code deiner Kopplung ein (oder fotografier seinen QR-Code).</p>
    ${canQrLive() ? `<button class="btn primary block" style="justify-content:center;gap:8px" data-qrlive="code">${svgIcon("camera", 18)} QR-Code scannen</button>` : `<label class="btn primary block" style="justify-content:center;gap:8px">${svgIcon("camera", 18)} Bild mit QR-Code auswählen<input type="file" accept="image/*" id="codeCam" hidden></label>`}
    <label class="lbl" for="codeIn" style="display:block;margin-top:14px">Oder den Code eintippen</label>
    <input class="in" id="codeIn" placeholder="HBP1.…" autocomplete="off" autocapitalize="off" spellcheck="false" value="${escHtml(C.val)}">
    <div class="small" id="codeErr" role="alert" style="color:var(--bad);min-height:18px;margin-top:6px">${escHtml(C.err)}</div>
    <button class="btn primary block" id="codeGo" style="margin-top:8px">Öffnen</button>`;
}
document.addEventListener("click", async (e) => {
  if (!e.target.closest("#codeGo") || !ui.code) return;
  const C = ui.code,
    b = e.target.closest("#codeGo");
  b.disabled = true;
  try {
    const v = (($("codeIn") || {}).value || "").trim();
    if (!v) throw new Error("Bitte den Code eingeben.");
    await C.done(v);
    codeClose();
  } catch (x) {
    C.err = x.message || "Das hat nicht geklappt.";
    C.val = ($("codeIn") || {}).value || "";
    codeRender();
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "codeCam" || !ui.code) return;
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const c = await qrFromFile(f);
    if (!c) {
      ui.code.err = "Kein Code erkannt – näher ran oder den Code eintippen.";
      codeRender();
      return;
    }
    ui.code.val = c.trim();
    ui.code.err = "";
    codeRender();
  } catch (_) {
    ui.code.err = "Das Foto ließ sich nicht lesen.";
    codeRender();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "codeIn") {
    const b = $("codeGo");
    if (b) b.click();
  }
});
async function pairStart() {
  const p = {
    v: b64u(crypto.getRandomValues(new Uint8Array(16))),
    k: b64u(crypto.getRandomValues(new Uint8Array(32))),
    s: "",
  };
  if (!META_PAIR) p.s = pairUrl();
  pairSave(p);
  MODE = "pair";
  SERVER = pairUrl();
  SYNC.token = "";
  const K = await pairKeys();
  await api("create", {
    body: {
      vault: K.vault,
      auth: K.auth,
    },
  });
  try {
    localStorage.setItem("hb-main", "1");
  } catch (_) {}
  loginDone(await pairToken(), true, "Gekoppelt – Daten werden verschlüsselt hochgeladen");
}
const SC_ABC = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const shortNorm = (t) =>
  String(t || "")
    .toUpperCase()
    .replace(/[\s\-–]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
const shortOk = (t) => new RegExp("^[" + SC_ABC + "]{10}$").test(shortNorm(t));
const shortFmt = (c) => c.slice(0, 4) + "-" + c.slice(4, 8) + "-" + c.slice(8);
async function shortBox(code) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(shortNorm(code)), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: new TextEncoder().encode("finanz-mami-short-v1"),
        iterations: 150000,
      },
      base,
      384
    )
  );
  return {
    v: b64u(bits.slice(0, 16)),
    k: b64u(bits.slice(16, 48)),
    s: "",
  };
}
let SHORT = null,
  SHORT_T = 0;
async function shortMake() {
  shortDrop();
  const long = pairCode();
  if (!long) return null;
  const r = crypto.getRandomValues(new Uint8Array(10)),
    code = [...r].map((x) => SC_ABC[x & 31]).join("");
  const box = await shortBox(code),
    K = await spKeys(box);
  await spRequest(box, "create", "", {
    vault: K.vault,
    auth: K.auth,
  });
  await reqHostOpen("pair", box);
  SHORT = {
    code,
    box,
    t0: Date.now(),
  };
  SHORT_T = setTimeout(shortDrop, 10 * 60 * 1000);
  return SHORT;
}
const CTD_LEN = 10 * 60 * 1000;
const ctdHtml = (t0, kind) =>
  `<div class="ctd" data-ctd="${t0 || ""}" data-ctdk="${kind}" ${t0 ? "" : "hidden"}><div class="ctdt"><span>gilt noch</span><b>10:00</b></div><div class="ctdb"><i></i></div></div>`;
function ctdTick() {
  for (const el of document.querySelectorAll("[data-ctd]")) {
    const t0 = +el.dataset.ctd;
    if (!t0) {
      el.hidden = true;
      continue;
    }
    el.hidden = false;
    const left = Math.max(0, CTD_LEN - (Date.now() - t0)),
      m = Math.floor(left / 60000),
      sec = Math.floor(left / 1000) % 60;
    el.querySelector("b").textContent = `${m}:${String(sec).padStart(2, "0")}`;
    el.querySelector(".ctdb i").style.width = `${Math.min(100, (1 - left / CTD_LEN) * 100).toFixed(2)}%`;
    el.classList.toggle("late", left < 60000);
    if (!left && !el.dataset.done) {
      el.dataset.done = "1";
      el.querySelector("span").textContent = "abgelaufen – neuer Code kommt";
      el.querySelector("b").textContent = "";
      if (el.dataset.ctdk === "gm") {
        Object.assign(GMS, {
          code: "",
          v: "",
          box: null,
        });
        if (ui.view === "gemeinsam" || SPS.open === "gemeinsam") renderGemeinsam();
      } else if (el.dataset.ctdk === "pair") {
        shortDrop();
        try {
          pairUi();
        } catch (_) {}
      }
    }
  }
}
setInterval(() => {
  if (document.querySelector("[data-ctd]")) ctdTick();
}, 1000);
const GMS = {
  code: "",
  v: "",
  box: null,
  t0: 0,
  tm: 0,
};
async function gmShortMake(sp) {
  reqHostStop("gm");
  if (GMS.box) spRequest(GMS.box, "wipe", "", {}).catch(() => {});
  clearTimeout(GMS.tm);
  const r = crypto.getRandomValues(new Uint8Array(10)),
    code = [...r].map((x) => SC_ABC[x & 31]).join("");
  const box = await shortBox(code),
    K = await spKeys(box);
  await spRequest(box, "create", "", {
    vault: K.vault,
    auth: K.auth,
  });
  await reqHostOpen("gm", box, {
    sp,
  });
  Object.assign(GMS, {
    code,
    v: sp.v,
    box,
    t0: Date.now(),
  });
  GMS.tm = setTimeout(
    () => {
      reqHostStop("gm");
      if (GMS.box) spRequest(GMS.box, "wipe", "", {}).catch(() => {});
    },
    10 * 60 * 1000
  );
}
function shortDrop() {
  clearTimeout(SHORT_T);
  reqHostStop("pair");
  const s0 = SHORT;
  SHORT = null;
  if (s0) spRequest(s0.box, "wipe", "", {}).catch(() => {});
}
/* Anfrage statt Sofort-Kopplung */
const isMain = () => {
  try {
    return localStorage.getItem("hb-main") === "1";
  } catch (e) {
    return false;
  }
};
async function boxH(K, id) {
  return b64u((await crypto.subtle.sign("HMAC", K.mac, new TextEncoder().encode("sp\u0000" + id))).slice(0, 24));
}
async function boxPut(box, id, d) {
  const K = await spKeys(box);
  await spRequest(box, "push", "", {
    ops: [
      {
        h: await boxH(K, id),
        b: await spEnc(K, {
          i: id,
          d,
        }),
      },
    ],
  });
}
async function boxAll(box) {
  const K = await spKeys(box),
    res = await spRequest(box, "pull", "&since=0"),
    out = {};
  for (const x of res.docs || []) {
    if (!x.b) continue;
    try {
      const o = await spDec(K, x.b);
      if (o && o.i) out[o.i] = o.d;
    } catch (_) {}
  }
  return out;
}
async function myCard(name) {
  const st = store.settings || {};
  let ph = "";
  if (st.photo)
    ph = await new Promise((ok) => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = c.height = 96;
          c.getContext("2d").drawImage(im, 0, 0, 96, 96);
          ok(c.toDataURL("image/jpeg", 0.8));
        } catch (_) {
          ok("");
        }
      };
      im.onerror = () => ok("");
      im.src = st.photo;
    });
  return {
    n: String(name != null ? name : st.name || "")
      .trim()
      .slice(0, 40),
    m: devModel(),
    f: devForm(),
    p: ph,
    main: isMain(),
  };
}
const cardName = (c) => (c && c.n) || (c && c.m) || "Neues Gerät";
function cardAv(c, cls) {
  c = c || {};
  const f = ["phone", "tablet", "pc", "laptop"].includes(c.f) ? c.f : "phone";
  const inner =
    c.p && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(c.p)
      ? `<img src="${c.p}" alt="">`
      : c.n
        ? `<b>${escHtml(String(c.n)[0].toUpperCase())}</b>`
        : devIc(f, 30);
  return `<span class="pav ${cls || ""}">${inner}<i>${devIc(f, 13)}</i>${c.main ? `<em class="pcrown">${svgIcon("crown", 12)}</em>` : ""}</span>`;
}
const NOCODE =
  "Diesen Code gibt es nicht (mehr) – er gilt 10 Minuten. Lass dir auf dem anderen Gerät einen neuen zeigen.";
async function reqAsk(kind, sc, card) {
  const box = await shortBox(sc);
  let all;
  try {
    all = await boxAll(box);
  } catch (e) {
    throw new Error(e.status === 401 ? NOCODE : "Server nicht erreichbar – bist du online?");
  }
  if (all.code && all.code.code && !all.host) {
    spRequest(box, "wipe", "", {}).catch(() => {});
    return all.code.code;
  }
  if (!all.host) throw new Error(NOCODE);
  if ((all.host.k || "pair") !== kind)
    throw new Error(
      kind === "gm"
        ? "Das ist ein Code zum Koppeln eigener Geräte, nicht für „Gemeinsam“."
        : "Das ist ein Code für „Gemeinsam“ – den gibst du unter Gemeinsam › Beitreten ein."
    );
  const W = {
    kind,
    host: all.host,
    box,
    id: b64u(crypto.getRandomValues(new Uint8Array(9))),
    t0: Date.now(),
  };
  ui.rwait = W;
  reqWaitUi();
  try {
    await boxPut(box, "req", {
      id: W.id,
      k: kind,
      card,
      t: Date.now(),
    });
  } catch (e) {
    ui.rwait = null;
    throw new Error("Server nicht erreichbar – bist du online?");
  }
  while (ui.rwait === W) {
    await new Promise((r) => setTimeout(r, 2000));
    if (ui.rwait !== W) break;
    if (Date.now() - W.t0 > 3 * 60e3) {
      ui.rwait = null;
      throw new Error("Keine Antwort bekommen – bitte noch einmal versuchen.");
    }
    let a;
    try {
      a = await boxAll(box);
    } catch (e) {
      if (e.status === 401) {
        ui.rwait = null;
        throw new Error("Die Anfrage ist abgelaufen – bitte noch einmal versuchen.");
      }
      continue;
    }
    if (a.code && a.code.id === W.id) {
      W.ok = true;
      reqWaitUi();
      spRequest(box, "wipe", "", {}).catch(() => {});
      await new Promise((r) => setTimeout(r, 1300));
      ui.rwait = null;
      return a.code.code;
    }
    if (a.deny && a.deny.id === W.id) {
      ui.rwait = null;
      throw new Error(
        a.deny.why === "voll"
          ? kind === "gm"
            ? "Dieser Bereich hat schon 10 Mitglieder."
            : "Dort sind schon 10 Geräte gekoppelt – eins muss erst entfernt werden."
          : "Die Anfrage wurde abgelehnt."
      );
    }
  }
  const e = new Error("");
  e.cancel = true;
  throw e;
}
function reqCancel() {
  const W = ui.rwait;
  ui.rwait = null;
  if (W)
    boxPut(W.box, "req", {
      id: W.id,
      cancel: true,
    }).catch(() => {});
}
function reqWaitUi() {
  if (ui.rwait && ui.rwait.kind === "gm") {
    if (ui.view === "gemeinsam" || SPS.open === "gemeinsam") renderGemeinsam();
  } else pairUi();
}
function reqWaitHtml(W) {
  const h = W.host.card || {},
    gm = W.kind === "gm";
  return `<div class="pwait ${W.ok ? "ok" : ""}">
    <div class="plink">${cardAv(h, "big")}<span class="pline"><i></i><b>✓</b></span>${
      gm
        ? `<span class="pav big gmav"><b>${escHtml(String(W.host.a || "G")[0].toUpperCase())}</b></span>`
        : cardAv(
            {
              f: devForm(),
              m: devModel(),
            },
            "big"
          )
    }</div>
    <b class="pwt">${W.ok ? (gm ? "Du bist dabei!" : "Bestätigt – Daten werden geladen …") : "Warte auf Bestätigung …"}</b>
    <p class="small muted">${W.ok ? "" : gm ? `<b>${escHtml(cardName(h))}</b> muss auf dem eigenen Gerät „Zulassen“ tippen – dann bist du in „${escHtml(W.host.a || "Gemeinsam")}“.` : `Tippe auf <b>${escHtml(cardName(h))}</b>${h.m && h.n ? ` (${escHtml(h.m)})` : ""} auf „Zulassen“.`}</p>
    ${W.ok ? "" : `<button class="btn" data-reqx="1">Abbrechen</button>`}</div>`;
}
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-reqx]")) return;
  reqCancel();
  if (ui.pstep === "wait") {
    ui.pstep = "join";
    pairUi();
  } else if (ui.view === "gemeinsam") {
    ui.gmStep = "join";
    renderGemeinsam();
  }
});
const RQH = {};
async function reqHostOpen(kind, box, extra) {
  reqHostStop(kind);
  const H = Object.assign(
    {
      kind,
      box,
      seen: {},
    },
    extra || {}
  );
  RQH[kind] = H;
  await boxPut(box, "host", {
    k: kind,
    card: await myCard(kind === "gm" ? currentMember().name : undefined),
    a: H.sp ? H.sp.n || "Gemeinsam" : "",
  });
  reqHostPoll(H);
  return H;
}
function reqHostStop(kind) {
  const H = RQH[kind];
  if (H) {
    H.stop = true;
    delete RQH[kind];
  }
}
function reqHostPoll(H) {
  setTimeout(async () => {
    if (H.stop) return;
    try {
      const a = await boxAll(H.box),
        q = a.req;
      if (q && q.id) {
        if (q.cancel) {
          if (ui.preq && ui.preq.q.id === q.id) {
            ui.preq = null;
            preqRender();
            toast("Die Anfrage wurde zurückgezogen");
          }
        } else if (!H.seen[q.id]) {
          H.seen[q.id] = 1;
          ui.preq = {
            H,
            q,
          };
          preqRender();
          try {
            navigator.vibrate && navigator.vibrate([30, 60, 30]);
          } catch (_) {}
        }
      }
    } catch (e) {
      if (e.status === 401) {
        H.stop = true;
        if (H.kind === "pair") {
          SHORT = null;
          try {
            if (ui.pstep === "show" && !$("loginBg").hidden) pairUi();
          } catch (_) {}
        }
        return;
      }
    }
    reqHostPoll(H);
  }, 2000);
}
const spMembers = (sp) => Object.keys(spLocal(sp.v).docs).filter((k) => k.startsWith("m-")).length;
function preqRender() {
  let bg = $("preqBg");
  const R = ui.preq;
  if (!R) {
    if (bg) bg.remove();
    return;
  }
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "preqBg";
    bg.className = "preqbg";
    document.body.appendChild(bg);
  }
  const c = R.q.card || {},
    gm = R.H.kind === "gm",
    area = gm ? R.H.sp.n || "Gemeinsam" : "";
  const mine = {
    n: String((gm ? currentMember().name : store.settings.name) || "").trim(),
    f: devForm(),
    p: store.settings.photo || "",
    main: isMain(),
  };
  bg.innerHTML = `<div class="preqbox ${R.done ? "ok" : ""}" role="dialog" aria-modal="true" aria-labelledby="preqT">
    <div class="plink">${cardAv(c, "big")}<span class="pline"><i></i><b>✓</b></span>${gm ? `<span class="pav big gmav"><b>${escHtml(area[0].toUpperCase())}</b></span>` : cardAv(mine, "big")}</div>
    <h2 id="preqT">${R.done ? (gm ? `${escHtml(cardName(c))} ist jetzt dabei` : "Gekoppelt!") : gm ? `${escHtml(cardName(c))} möchte „${escHtml(area)}“ beitreten` : `${escHtml(cardName(c))} möchte sich koppeln`}</h2>
    <p class="small muted">${escHtml(c.m || "")}${c.m ? " · " : ""}gerade eben<br>${gm ? "Sieht danach nur diesen gemeinsamen Bereich – nichts von deinen anderen Daten." : "Bekommt danach alle deine Buchungen und wird mit diesem Gerät abgeglichen."}</p>
    ${R.err ? `<p class="small" style="color:var(--bad);margin:0 0 8px">${escHtml(R.err)}</p>` : ""}
    ${R.done ? "" : `<button class="btn primary block" data-preq="1" ${R.busy ? "disabled" : ""}>Zulassen</button><button class="btn block preqno" data-preq="0" ${R.busy ? "disabled" : ""}>Ablehnen</button>`}</div>`;
}
async function preqAnswer(yes) {
  const R = ui.preq;
  if (!R || R.busy) return;
  R.busy = true;
  R.err = "";
  preqRender();
  const H = R.H;
  try {
    if (yes) {
      const full = H.kind === "gm" ? spMembers(H.sp) >= 10 : zDevs().length >= 10;
      if (full) {
        await boxPut(H.box, "deny", {
          id: R.q.id,
          why: "voll",
        });
        R.busy = false;
        R.err =
          H.kind === "gm"
            ? "Dieser Bereich hat schon 10 Mitglieder."
            : "Es sind schon 10 Geräte gekoppelt – entferne erst eins unter Geräte & Abgleich.";
        preqRender();
        return;
      }
      await boxPut(H.box, "code", {
        id: R.q.id,
        code: H.kind === "gm" ? spCode(H.sp) : pairCode(),
      });
      R.done = true;
      R.busy = false;
      SND.play("pair");
      preqRender();
      setTimeout(() => {
        if (ui.preq === R) {
          ui.preq = null;
          preqRender();
        }
      }, 2200);
      if (H.kind === "pair")
        setTimeout(() => {
          try {
            devPing(true);
            renderGeraete();
          } catch (_) {}
        }, 8000);
    } else {
      await boxPut(H.box, "deny", {
        id: R.q.id,
      });
      ui.preq = null;
      preqRender();
    }
  } catch (e) {
    R.busy = false;
    R.err = "Server nicht erreichbar – bist du online?";
    preqRender();
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-preq]");
  if (b) preqAnswer(b.dataset.preq === "1");
});
async function shortFetch(code) {
  const box = await shortBox(code),
    K = await spKeys(box);
  let res;
  try {
    res = await spRequest(box, "pull", "&since=0");
  } catch (e) {
    throw new Error(
      e.status === 401
        ? "Diesen Code gibt es nicht (mehr) – er gilt 10 Minuten. Lass dir am Handy einen neuen zeigen."
        : "Server nicht erreichbar – bist du online?"
    );
  }
  for (const d of res.docs || []) {
    try {
      const o = await spDec(K, d.b);
      if (o && o.d && o.d.code) {
        spRequest(box, "wipe", "", {}).catch(() => {});
        return o.d.code;
      }
    } catch (_) {}
  }
  throw new Error("Diesen Code gibt es nicht (mehr) – er gilt 10 Minuten. Lass dir am Handy einen neuen zeigen.");
}
async function pairJoin(code) {
  if (!pairParse(code)) {
    const q = String(code || "").match(/HBQ1\.([0-9A-Za-z]{10})/),
      sc = q ? q[1] : code;
    if (/HBG1\./.test(String(code)))
      throw new Error("Das ist ein Code für „Gemeinsam“ – den gibst du unter Gemeinsam › Beitreten ein.");
    if (!shortOk(sc)) throw new Error("Das ist kein gültiger Kopplungs-Code – er hat 10 Zeichen, z. B. 7KF2-QX9M-3T.");
    ui.pstep = "wait";
    try {
      code = await reqAsk("pair", sc, await myCard());
    } catch (e) {
      if (ui.pstep === "wait") {
        ui.pstep = "join";
        pairUi();
      }
      throw e;
    }
  }
  const p = pairParse(code);
  if (!p) throw new Error("Das ist kein gültiger Kopplungs-Code.");
  pairSave(p);
  MODE = "pair";
  SERVER = pairUrl();
  SYNC.token = await pairToken();
  try {
    await api("pull", {
      qs: "&since=999999999",
    });
  } catch (e) {
    SYNC.token = "";
    pairSave(null);
    throw new Error(
      e.status === 401 ? "Dieser Code gehört zu keiner Kopplung (mehr)." : "Server nicht erreichbar – bist du online?"
    );
  }
  try {
    localStorage.removeItem("hb-main");
  } catch (_) {}
  loginDone(SYNC.token, false, "Gekoppelt – Daten werden geladen");
  if (!actGet()) {
    actSet({
      k: "pair",
    });
    const g = $("actBg");
    if (g) g.hidden = true;
    document.body.classList.remove("locked");
    legalGate();
  }
}
async function qrFromFile(file) {
  const bmp = await new Promise((ok, bad) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = bad;
    im.src = URL.createObjectURL(file);
  });
  try {
    if ("BarcodeDetector" in window) {
      const r = await new BarcodeDetector({
        formats: ["qr_code"],
      }).detect(bmp);
      if (r && r[0]) return r[0].rawValue;
    }
  } catch (e) {}
  for (const max of [1200, 800, 1800]) {
    const sc = Math.min(1, max / Math.max(bmp.naturalWidth, bmp.naturalHeight)),
      w = Math.round(bmp.naturalWidth * sc),
      h = Math.round(bmp.naturalHeight * sc);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.drawImage(bmp, 0, 0, w, h);
    const r = jsQR(x.getImageData(0, 0, w, h).data, w, h, {
      inversionAttempts: "attemptBoth",
    });
    if (r && r.data) return r.data;
  }
  return null;
}
function pairUi() {
  const el = $("loginPair");
  if (!el) return;
  const st = ui.pstep || "start",
    hasData = store.tx.length > 0 || store.fixed.length > 0;
  const code = pairCode();
  const meC = {
    n: String(store.settings.name || "").trim(),
    f: devForm(),
    m: devModel(),
    p: store.settings.photo || "",
    main: isMain(),
  };
  const roles = (left, lsub, right, rsub, lc, rc, back) =>
    `<div class="proles ${back ? "back" : ""}"><div>${lc}<b>${left}</b><small>${lsub}</small></div><button class="parr" data-pflip="1" title="Umdrehen" aria-label="Richtung umdrehen"><span>Daten</span>${svgIcon("right", 22)}<small>⇄ umdrehen</small></button><div>${rc}<b>${right}</b><small>${rsub}</small></div></div>`;
  const unknownAv = `<span class="pav big unk"><b>?</b></span>`,
    mainAv = `<span class="pav big"><b>${svgIcon("phone", 26)}</b><em class="pcrown">${svgIcon("crown", 12)}</em></span>`;
  el.innerHTML =
    st === "start"
      ? `<p class="pq">Wo sind deine Daten gerade?</p><div class="pchoice">
      <button class="pbig" data-pstep="first"><span class="pbi">${svgIcon("crown", 24)}</span><span><b>Hier – das wird mein Hauptgerät</b><small>Deine Daten bleiben auf diesem Gerät. Weitere Geräte fragen später hier an und du bestätigst sie.</small></span></button>
      <button class="pbig" data-pstep="join"><span class="pbi">${svgIcon("camera", 22)}</span><span><b>Auf einem anderen Gerät – ich komme dazu</b><small>Dieses Gerät holt sich die Daten von deinem Hauptgerät. Dort zeigst du dafür einen QR-Code an.</small></span></button></div>
      <div class="notice info"><span>${svgIcon("shield", 15)} <b>Kein Konto, keine E-Mail.</b> Deine Daten werden auf dem Gerät verschlüsselt – der Server sieht nur Zahlensalat und kann nichts lesen.</span></div>`
      : st === "first"
        ? `<p class="small" style="margin:0;line-height:1.5">Die App legt einen geheimen Schlüssel an, verschlüsselt deine Daten damit und lädt sie hoch. Danach koppelst du dein zweites Gerät mit dem QR-Code.</p>
      <div class="row-btns"><button class="btn" data-pstep="start">Zurück</button><button class="btn primary" id="pairFirst">Los geht's</button></div>`
        : st === "wait" && ui.rwait
          ? reqWaitHtml(ui.rwait)
          : st === "join"
            ? `${roles(
                "Dieses Gerät",
                "kommt dazu",
                "Hauptgerät",
                "hat deine Daten",
                cardAv(
                  {
                    ...meC,
                    main: false,
                  },
                  "big"
                ),
                mainAv,
                true
              )}
      <ol class="psteps"><li>${trBold("Öffne auf dem Hauptgerät **Einstellungen › Geräte › Gerät hinzufügen**.")}</li><li>Scanne hier den QR-Code von dort – oder tippe den Code ein.</li><li>Bestätige auf dem Hauptgerät die Anfrage.</li></ol>
      ${qrBtn("join", true)}
      <div class="field" style="margin:0"><label for="pairCode">… oder den Code vom Hauptgerät eintippen</label><input class="in" id="pairCode" placeholder="z. B. 7KF2-QX9M-3T" autocapitalize="characters" autocomplete="off" spellcheck="false" style="font:700 20px var(--f-display);letter-spacing:.08em;text-align:center"></div>
      ${hasData ? `<div class="notice warn"><span>${trBold("Auf **diesem** Gerät sind schon Daten. Sie werden durch die vom Hauptgerät ersetzt. Mach vorher ein Backup, wenn du unsicher bist.")}</span></div>` : ""}
      <button class="link small" id="pairRecv" style="margin:2px auto 0;display:block">Scannen klappt nicht? Andersherum: hier einen QR-Code zeigen und mit dem Hauptgerät scannen</button>
      <div class="row-btns"><button class="btn" data-pstep="start">Zurück</button><button class="btn primary" id="pairJoin">Anfrage senden</button></div>
      <p class="small muted" style="text-align:center;margin:0"><button class="link small" data-pstep="${SYNC.token && pairState() ? "show" : "first"}">${trBold("Moment – meine Daten sind auf **diesem** Gerät")}</button></p>`
            : st === "recv"
              ? `<p class="small" style="margin:0;line-height:1.5">Öffne auf dem Handy <b>Einstellungen › Abgleich › Weiteres Gerät koppeln</b>, tippe auf <b>„QR-Code vom anderen Gerät scannen“</b> und fotografiere diesen Code:</p>
      <div class="pqr">${ui.precv && ui.precv.v ? qrSvg("HBR1." + ui.precv.v + "." + ui.precv.k, 300) : `<div class="small muted" style="padding:90px 0">Wird vorbereitet …</div>`}</div>
      <p class="small" style="margin:0;text-align:center">… oder am Handy diesen Code eintippen:</p>
      <div class="pshort">${ui.precv ? escHtml(shortFmt(ui.precv.code)) : "…"}</div>
      <div class="notice info"><span id="pairRecvSt">Warte auf das Handy …</span></div>
      <div class="row-btns"><button class="btn" data-pstep="join">Zurück</button></div>`
              : `${roles("Dieses Gerät", isMain() ? "Hauptgerät · hat deine Daten" : "hat deine Daten", "Neues Gerät", "kommt dazu", cardAv(meC, "big"), unknownAv)}
      <ol class="psteps"><li>${trBold("Öffne Finanz MAMI auf dem **neuen** Gerät.")}</li><li>${trBold("Wähle dort **„Auf einem anderen Gerät – ich komme dazu“**.")}</li><li>Scanne diesen QR-Code oder tippe den Code darunter ein.</li><li>${trBold("Hier erscheint die Anfrage – tippe auf **Zulassen**.")}</li></ol>
      <div class="pqr" id="pairQr">${SHORT ? qrSvg("HBQ1." + SHORT.code, 230) : `<div class="small muted" style="padding:80px 0">Wird vorbereitet …</div>`}</div>
      <div class="pshort" id="pairShort">${SHORT ? escHtml(shortFmt(SHORT.code)) : "…"}</div>
      <div id="pairCtd">${ctdHtml(SHORT ? SHORT.t0 : 0, "pair")}</div>
      <p class="small muted" style="margin:0;text-align:center"><button class="link small" id="pairShortNew">Neuer Code</button></p>
      <details class="pmore"><summary>Das neue Gerät zeigt selbst einen QR-Code?</summary>${qrBtn("send", false)}
        <div class="field" style="margin:8px 0 0"><label for="pairSendCode">… oder dessen Code eingeben</label><div style="display:flex;gap:8px"><input class="in" id="pairSendCode" placeholder="z. B. 7KF2-QX9M-3T" autocapitalize="characters" autocomplete="off" spellcheck="false" style="font:700 18px var(--f-display);letter-spacing:.06em;text-align:center;flex:1;min-width:0"><button class="btn primary" id="pairSendGo">Koppeln</button></div></div></details>
      <details class="pmore" ${ui.pmoreOpen ? "open" : ""}><summary>QR-Code und Wiederherstellungs-Code</summary>
      <div class="pqr">${code ? qrSvg(code, 230) : ""}</div>
      <div class="pcode">${escHtml(code.replace(/(.{5})/g, "$1 ").trim())}</div>
      <div class="notice warn"><span><b>Halte diesen Code geheim</b> – wer ihn hat, sieht deine Finanzen. Heb ihn trotzdem gut auf (ausdrucken oder im Passwort-Manager): Gehen alle Geräte verloren, kommst du nur damit wieder an deine Daten.</span></div>
      </details>
      <div class="row-btns"><button class="btn" id="pairCopy">Langen Code kopieren</button><button class="btn primary" id="pairDone">Fertig</button></div>`;
  const t = $("loginTitle");
  if (t)
    t.textContent =
      st === "show"
        ? "Gerät hinzufügen"
        : st === "wait"
          ? "Anfrage gesendet"
          : st === "join" || st === "recv"
            ? "Zum Hauptgerät dazukommen"
            : "Geräte koppeln";
  const sk = $("loginSkip");
  if (sk) sk.hidden = !!SYNC.token;
  if (st === "recv") pairRecvRun();
  else pairRecvStop();
  if (st === "show" && !SHORT && !ui.pshortBusy) {
    ui.pshortBusy = true;
    shortMake()
      .then(() => {
        const e = $("pairShort");
        if (e && SHORT) e.textContent = shortFmt(SHORT.code);
        const q = $("pairQr");
        if (q && SHORT) q.innerHTML = qrSvg("HBQ1." + SHORT.code, 230);
        const c = document.querySelector("#pairCtd [data-ctd]");
        if (c && SHORT) {
          c.dataset.ctd = SHORT.t0;
          delete c.dataset.done;
          ctdTick();
        }
      })
      .catch(() => {
        const e = $("pairShort");
        if (e) e.textContent = "Server nicht erreichbar";
      })
      .finally(() => {
        ui.pshortBusy = false;
      });
  }
}
let PRECV_T = 0;
const canQrLive = () =>
  !IS_DESK &&
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
  (!!window.AndroidBridge || /Android|iPhone|iPad/i.test(navigator.userAgent));
function qrBtn(kind, primary) {
  const cls = `btn ${primary ? "primary " : ""}block`,
    st = 'style="justify-content:center;gap:8px"';
  if (canQrLive())
    return `<button class="${cls}" ${st} data-qrlive="${kind}">${svgIcon("camera", 18)} QR-Code vom anderen Gerät scannen</button>`;
  return `<label class="${cls}" ${st}>${svgIcon("camera", 18)} Bild mit QR-Code auswählen<input type="file" accept="image/*" id="${kind === "send" ? "pairSendCam" : "pairCam"}" hidden></label>`;
}
async function qrLive(want) {
  const bg = document.createElement("div");
  bg.className = "qrlive";
  bg.innerHTML = `<video playsinline muted autoplay></video><div class="qrframe"></div><p>Halte die Kamera auf den QR-Code</p><button class="btn" data-qrstop>Abbrechen</button>`;
  document.body.appendChild(bg);
  const v = bg.querySelector("video");
  let stream = null,
    done = false,
    det = null;
  const stop = () => {
    done = true;
    try {
      stream && stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    bg.remove();
  };
  bg.querySelector("[data-qrstop]").onclick = () => {
    stop();
    bg.res && bg.res(null);
  };
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: "environment",
        },
        width: {
          ideal: 1920,
        },
        height: {
          ideal: 1080,
        },
      },
      audio: false,
    });
    try {
      const tr = stream.getVideoTracks()[0],
        cap = tr.getCapabilities ? tr.getCapabilities() : {};
      if ((cap.focusMode || []).includes("continuous"))
        await tr.applyConstraints({
          advanced: [
            {
              focusMode: "continuous",
            },
          ],
        });
    } catch (_) {}
  } catch (e) {
    stop();
    throw new Error("Die Kamera konnte nicht geöffnet werden. Erlaube den Kamera-Zugriff für Finanz MAMI.");
  }
  v.srcObject = stream;
  try {
    await v.play();
  } catch (_) {}
  try {
    if ("BarcodeDetector" in window)
      det = new BarcodeDetector({
        formats: ["qr_code"],
      });
  } catch (_) {}
  const c = document.createElement("canvas"),
    x = c.getContext("2d", {
      willReadFrequently: true,
    });
  let pass = 0;
  return await new Promise((res) => {
    bg.res = res;
    const tick = async () => {
      if (done) return;
      if (v.videoWidth) {
        let t = null;
        try {
          if (det) {
            const r = await det.detect(v);
            if (r && r[0]) t = r[0].rawValue;
          }
        } catch (_) {
          det = null;
        }
        if (!t) {
          const W = v.videoWidth,
            H = v.videoHeight,
            mid = pass++ % 2 === 1;
          const sw = mid ? Math.round(Math.min(W, H) * 0.6) : W,
            sh = mid ? sw : H,
            sx = (W - sw) / 2,
            sy = (H - sh) / 2,
            k = Math.min(1, (mid ? 900 : 800) / Math.max(sw, sh));
          c.width = Math.round(sw * k);
          c.height = Math.round(sh * k);
          x.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
          const r = jsQR(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height, {
            inversionAttempts: "attemptBoth",
          });
          if (r && r.data) t = r.data;
        }
        if (t && want.test(t)) {
          try {
            navigator.vibrate && navigator.vibrate(30);
          } catch (_) {}
          stop();
          res(t);
          return;
        }
      }
      setTimeout(tick, 120);
    };
    tick();
  });
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-qrlive]");
  if (!b) return;
  const kind = b.dataset.qrlive;
  $("loginErr").textContent = "";
  if (kind === "gm" || kind === "code") {
    try {
      const t = await qrLive(kind === "gm" ? /HBS1\.|HBG1\./ : /\S/);
      if (!t) return;
      if (kind === "gm") {
        const c = $("gmCode");
        if (c) c.value = t;
        const g = $("gmJoinGo");
        if (g) g.click();
      } else if (ui.code) {
        ui.code.val = t.trim();
        ui.code.err = "";
        codeRender();
      }
    } catch (x) {
      toast(x.message);
    }
    return;
  }
  try {
    const t = await qrLive(kind === "send" ? /HBR1\./ : /HBP1\.|HBQ1\./);
    if (!t) return;
    if (kind === "send") {
      await pairSendTo(t);
      toast("Gesendet – das andere Gerät koppelt sich jetzt");
      $("loginBg").hidden = true;
      ui.pstep = "start";
    } else {
      $("pairCode").value = t;
      await pairJoin(t);
      ui.pstep = "start";
    }
  } catch (x) {
    if (!x.cancel) $("loginErr").textContent = x.message || "Das hat nicht geklappt.";
  }
});
function pairRecvStop() {
  clearTimeout(PRECV_T);
  PRECV_T = 0;
  const m = ui.precv;
  ui.precv = null;
  if (m && m.made) spRequest(m, "wipe", "", {}).catch(() => {});
}
async function pairRecvRun() {
  if (ui.precv) return;
  const r = crypto.getRandomValues(new Uint8Array(10)),
    code = [...r].map((x) => SC_ABC[x & 31]).join("");
  const m = {
    code,
    t0: Date.now(),
  };
  ui.precv = m;
  Object.assign(m, await shortBox(code));
  try {
    const K = await spKeys(m);
    await spRequest(m, "create", "", {
      vault: K.vault,
      auth: K.auth,
    });
    m.made = true;
  } catch (e) {
    ui.precv = null;
    $("loginErr").textContent = "Server nicht erreichbar – bist du online?";
    return;
  }
  if (ui.precv !== m) return;
  pairUi();
  const poll = async () => {
    if (ui.precv !== m || $("loginBg").hidden) return pairRecvStop();
    if (Date.now() - m.t0 > 10 * 60 * 1000) {
      const st = $("pairRecvSt");
      if (st) st.textContent = "Zeit abgelaufen – tippe auf Zurück und versuch es nochmal.";
      return pairRecvStop();
    }
    try {
      const K = await spKeys(m),
        res = await spRequest(m, "pull", "&since=0");
      for (const d of res.docs || []) {
        if (!d.b) continue;
        let o = null;
        try {
          o = await spDec(K, d.b);
        } catch (_) {}
        const code = o && o.d && o.d.code;
        if (code && pairParse(code)) {
          const st = $("pairRecvSt");
          if (st)
            st.textContent =
              (o.d.card ? cardName(o.d.card) + " gefunden" : "Handy gefunden") + " – Daten werden geladen …";
          pairRecvStop();
          try {
            await pairJoin(code);
            ui.pstep = "start";
          } catch (x) {
            $("loginErr").textContent = x.message;
            ui.pstep = "join";
            pairUi();
          }
          return;
        }
      }
    } catch (_) {}
    PRECV_T = setTimeout(poll, 2000);
  };
  PRECV_T = setTimeout(poll, 1500);
}
async function pairSendTo(t) {
  const m = String(t || "")
    .replace(/\s+/g, "")
    .match(/HBR1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})/);
  if (!m && !shortOk(t)) throw new Error("Das ist kein gültiger Code – er hat 10 Zeichen, z. B. 7KF2-QX9M-3T.");
  const code = pairCode();
  if (!code) throw new Error("Dieses Gerät ist noch nicht gekoppelt.");
  const box = m
      ? {
          v: m[1],
          k: m[2],
          s: "",
        }
      : await shortBox(t),
    K = await spKeys(box);
  const op = {
    h: b64u((await crypto.subtle.sign("HMAC", K.mac, new TextEncoder().encode("sp\u0000code"))).slice(0, 24)),
    b: await spEnc(K, {
      i: "code",
      d: {
        code,
        card: await myCard(),
      },
    }),
  };
  if (zDevs().length >= 10)
    throw new Error("Es sind schon 10 Geräte gekoppelt – entferne erst eins unter Geräte & Abgleich.");
  try {
    await spRequest(box, "push", "", {
      ops: [op],
    });
  } catch (e) {
    throw new Error(
      e.status === 401
        ? "Dieser Code ist abgelaufen – lass dir am anderen Gerät einen neuen zeigen."
        : "Server nicht erreichbar – bist du online?"
    );
  }
  return true;
}
function pairShow(step) {
  ui.pstep = step || ui.pstep || "start";
  const bg = $("loginBg");
  bg.hidden = false;
  $("loginErr").textContent = "";
  loginModeUi();
  pairUi();
}
document.addEventListener("click", async (e) => {
  const s = e.target.closest("[data-pstep]");
  if (s) {
    ui.pstep = s.dataset.pstep;
    $("loginErr").textContent = "";
    pairUi();
    return;
  }
  const fl = e.target.closest("[data-pflip]");
  if (fl) {
    const box = fl.closest(".proles");
    if (box) box.classList.add("flip");
    setTimeout(() => {
      const st = ui.pstep;
      $("loginErr").textContent = "";
      ui.pstep = st === "show" ? "join" : SYNC.token && pairState() ? "show" : "first";
      if (ui.pstep === "join") shortDrop();
      pairUi();
      const nb = document.querySelector("#loginPair .proles");
      if (nb) {
        nb.classList.add("flipin");
        setTimeout(() => nb.classList.remove("flipin"), 450);
      }
    }, 320);
    return;
  }
  if (e.target.closest("#pairFirst")) {
    const b = e.target.closest("#pairFirst");
    b.disabled = true;
    b.textContent = "Wird eingerichtet …";
    if (actNeed()) {
      $("loginBg").hidden = true;
      actGate();
      return;
    }
    try {
      await pairStart();
      $("loginBg").hidden = false;
      ui.pstep = "show";
      loginModeUi();
      pairUi();
    } catch (x) {
      console.warn("pair", x);
      pairSave(null);
      SYNC.token = "";
      $("loginErr").textContent = !(window.crypto && crypto.subtle)
        ? "Koppeln geht nur in der Handy- oder PC-App."
        : x.status === 429
          ? x.message
          : "Server nicht erreichbar – bist du online?";
      b.disabled = false;
      b.textContent = "Los geht's";
    }
    return;
  }
  if (e.target.closest("#pairJoin")) {
    const b = e.target.closest("#pairJoin");
    b.disabled = true;
    try {
      await pairJoin($("pairCode").value);
      ui.pstep = "start";
    } catch (x) {
      if (!x.cancel) $("loginErr").textContent = x.message;
    } finally {
      b.disabled = false;
    }
    return;
  }
  if (e.target.closest("#pairCopy")) {
    try {
      await copySecret(pairCode());
      toast("Code kopiert – nach einer Minute wird er aus der Zwischenablage gelöscht");
    } catch (_) {
      toast("Bitte den Code markieren und kopieren");
    }
    return;
  }
  if (e.target.closest("#pairDone")) {
    ui.pmoreOpen = false;
    $("loginBg").hidden = true;
    ui.pstep = "start";
    renderSyncInfo();
    return;
  }
  if (e.target.closest("#pairShortNew")) {
    shortDrop();
    pairUi();
    return;
  }
  if (e.target.closest("#pairMore")) {
    if (zDevs().length >= 10) {
      toast(
        "Es sind schon 10 Geräte gekoppelt – entferne erst ein altes unter Einstellungen › Geräte",
        null,
        null,
        7000
      );
      return;
    }
    if (SYNC.token && pairState()) pairShow("show");
    else showLogin();
    return;
  }
  if (e.target.closest("#pairOther")) {
    if (!ui.pairOtherArm) {
      ui.pairOtherArm = true;
      renderGeraete();
      setTimeout(() => {
        ui.pairOtherArm = false;
        renderGeraete();
      }, 6000);
      return;
    }
    ui.pairOtherArm = false;
    renderGeraete();
    pairShow("join");
    return;
  }
  if (e.target.closest("#syncCode")) {
    ui.pmoreOpen = true;
    pairShow("show");
    return;
  }
  if (e.target.closest("#pairWipe")) {
    const b = e.target.closest("#pairWipe");
    if (b.dataset.armed !== "1") {
      b.dataset.armed = "1";
      b.textContent = "Wirklich? Alle gekoppelten Daten auf dem Server löschen";
      setTimeout(() => {
        b.dataset.armed = "";
        renderSyncSec();
      }, 5000);
      return;
    }
    try {
      await api("wipe", {
        body: {},
      });
    } catch (_) {}
    pairSave(null);
    SYNC.token = "";
    SYNC.queue = [];
    SYNC.rq = [];
    SYNC.state = "off";
    saveSync();
    toast("Kopplung gelöscht – deine Daten bleiben auf diesem Gerät");
    renderSyncInfo();
    renderSyncDot();
    renderGeraete();
    return;
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "pairSendCam") return;
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  $("loginErr").textContent = "QR-Code wird gelesen …";
  try {
    const t = await qrFromFile(f);
    if (!t || !/HBR1\./.test(t)) {
      $("loginErr").textContent = "Kein Kopplungs-Code erkannt. Halte das Handy ruhig und näher an den Bildschirm.";
      return;
    }
    await pairSendTo(t);
    $("loginErr").textContent = "";
    toast("Gesendet – das andere Gerät koppelt sich jetzt");
    $("loginBg").hidden = true;
    ui.pstep = "start";
  } catch (x) {
    $("loginErr").textContent = x.message || "Server nicht erreichbar – bist du online?";
  }
});
document.addEventListener("click", async (e) => {
  const b = e.target.closest("#pairSendGo");
  if (!b) return;
  b.disabled = true;
  $("loginErr").textContent = "";
  try {
    await pairSendTo($("pairSendCode").value);
    toast("Gesendet – das andere Gerät koppelt sich jetzt");
    $("loginBg").hidden = true;
    ui.pstep = "start";
  } catch (x) {
    $("loginErr").textContent =
      x.status === 401
        ? "Diesen Code gibt es nicht (mehr) – er gilt 10 Minuten."
        : x.message || "Das hat nicht geklappt.";
  } finally {
    b.disabled = false;
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "pairSendCode") {
    const b = $("pairSendGo");
    if (b) b.click();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "pairCode") {
    const b = $("pairJoin");
    if (b) b.click();
  }
});
document.addEventListener("click", (e) => {
  if (e.target.closest("#pairRecv")) {
    ui.pstep = "recv";
    $("loginErr").textContent = "";
    pairUi();
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "pairCam") return;
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  $("loginErr").textContent = "QR-Code wird gelesen …";
  try {
    const t = await qrFromFile(f);
    if (!t || !(pairParse(t) || /HBQ1\./.test(t))) {
      $("loginErr").textContent =
        "Kein Kopplungs-Code erkannt. Halte das Handy ruhig und näher an den Bildschirm – oder füge den Code ein.";
      return;
    }
    $("pairCode").value = t;
    $("loginErr").textContent = "";
    await pairJoin(t);
    ui.pstep = "start";
  } catch (x) {
    $("loginErr").textContent = x.message || "Das hat nicht geklappt.";
  }
});

/* Gemeinsam */
async function makeKeys(kB64, vB64) {
  const base = await crypto.subtle.importKey("raw", fromB64u(kB64), "HKDF", false, ["deriveKey", "deriveBits"]);
  const prm = (info) => ({
    name: "HKDF",
    hash: "SHA-256",
    salt: new TextEncoder().encode("finanz-mami-v1"),
    info: new TextEncoder().encode(info),
  });
  return {
    enc: await crypto.subtle.deriveKey(
      prm("enc"),
      base,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    ),
    mac: await crypto.subtle.deriveKey(
      prm("id"),
      base,
      {
        name: "HMAC",
        hash: "SHA-256",
        length: 256,
      },
      false,
      ["sign"]
    ),
    auth: toHex(await crypto.subtle.deriveBits(prm("auth"), base, 256)),
    vault: toHex(fromB64u(vB64)),
  };
}
const SPK = {};
const spList = () => store.settings.shared || [];
function spLocal(v) {
  try {
    return (
      JSON.parse(localStorage.getItem("hb-sp-" + v) || "null") || {
        docs: {},
        rev: 0,
        queue: [],
      }
    );
  } catch (e) {
    return {
      docs: {},
      rev: 0,
      queue: [],
    };
  }
}
function spLocalSave(v, o) {
  try {
    localStorage.setItem("hb-sp-" + v, JSON.stringify(o));
  } catch (e) {}
}
function currentMember() {
  const m = store.settings.me || {};
  if (!m.id) {
    m.id = newId();
    m.name = m.name || store.settings.name || "";
    store.settings.me = m;
    setTimeout(saveSettings, 0);
  }
  return m;
}
async function spKeys(sp) {
  return SPK[sp.v] || (SPK[sp.v] = await makeKeys(sp.k, sp.v));
}
async function spRequest(sp, action, qs, body) {
  const K = await spKeys(sp),
    url = apiUrl(sp.s || pairUrl(), action, qs),
    auth = "Bearer " + K.vault + "." + K.auth;
  let r;
  if (NATIVE && window.AndroidBridge.http) {
    r = await new Promise((res) => {
      const id = newId();
      httpWaiting[id] = res;
      window.AndroidBridge.http(id, body ? "POST" : "GET", url, auth, body ? JSON.stringify(body) : "");
    });
    if (!r.status) throw new Error("offline");
  } else {
    const f = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    r = {
      status: f.status,
      text: await f.text(),
    };
  }
  let j = {};
  try {
    j = JSON.parse(r.text);
  } catch (e) {}
  if (r.status < 200 || r.status >= 300) {
    const e = new Error(j.error || "HTTP " + r.status);
    e.status = r.status;
    throw e;
  }
  return j;
}
async function spEnc(K, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12)),
    ct = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      K.enc,
      new TextEncoder().encode(JSON.stringify(obj))
    );
  const o = new Uint8Array(12 + ct.byteLength);
  o.set(iv);
  o.set(new Uint8Array(ct), 12);
  return b64u(o);
}
async function spDec(K, b) {
  const u = fromB64u(b);
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: u.slice(0, 12),
        },
        K.enc,
        u.slice(12)
      )
    )
  );
}
function spPut(sp, id, data) {
  const L = spLocal(sp.v);
  if (data === null) delete L.docs[id];
  else L.docs[id] = data;
  L.queue = (L.queue || []).filter((o) => o.i !== id);
  L.queue.push({
    i: id,
    d: data,
  });
  spLocalSave(sp.v, L);
  spSyncSoon();
}
let SP_BUSY = false,
  spTimer = null;
function spSyncSoon(ms) {
  clearTimeout(spTimer);
  spTimer = setTimeout(spSyncAll, ms == null ? 500 : ms);
}
async function spSyncAll() {
  if (SP_BUSY || !spList().length || !(window.crypto && crypto.subtle)) return;
  SP_BUSY = true;
  let changed = false;
  try {
    for (const sp of spList()) {
      try {
        const K = await spKeys(sp),
          L = spLocal(sp.v);
        spPublish(sp, L);
        if (L.queue && L.queue.length) {
          const q = L.queue.slice(0, 200),
            ops = [];
          for (const o of q)
            ops.push({
              h: b64u(
                (await crypto.subtle.sign("HMAC", K.mac, new TextEncoder().encode("sp\u0000" + o.i))).slice(0, 24)
              ),
              b: await spEnc(K, {
                i: o.i,
                d: o.d,
              }),
            });
          await spRequest(sp, "push", "", {
            ops,
          });
          L.queue = L.queue.filter((o) => !q.includes(o));
        }
        const res = await spRequest(sp, "pull", "&since=" + (L.rev || 0));
        const pend = new Set((L.queue || []).map((o) => o.i));
        for (const d of res.docs || []) {
          if (!d.b) continue;
          try {
            const o = await spDec(K, d.b);
            if (pend.has(o.i)) continue;
            if (o.d === null) delete L.docs[o.i];
            else L.docs[o.i] = o.d;
            changed = true;
          } catch (e) {}
        }
        L.rev = res.rev || L.rev;
        L.ok = Date.now();
        spLocalSave(sp.v, L);
        if (res.more) spSyncSoon(200);
      } catch (e) {
        if (e.status === 401) {
          sp.lost = true;
        }
      }
    }
  } finally {
    SP_BUSY = false;
  }
  if (changed && (ui.view === "gemeinsam" || ui.view === "home")) {
    BG_RENDER = true;
    try {
      render();
    } finally {
      BG_RENDER = false;
    }
  }
}
setInterval(() => {
  if (document.visibilityState === "visible") spSyncAll();
}, 15000);
setTimeout(spSyncAll, 4000);
function spSel(v) {
  const a = store.settings.shareSel || {};
  return (
    a[v] || {
      bud: {},
      goal: {},
      fix: "none",
    }
  );
}
function spSelSet(v, fn) {
  const a = {
    ...(store.settings.shareSel || {}),
  };
  const s = JSON.parse(JSON.stringify(spSel(v)));
  fn(s);
  a[v] = s;
  store.settings.shareSel = a;
  saveSettings();
}
function spPubData(v) {
  const sel = spSel(v),
    ym = ymOf(new Date()),
    out = {
      budgets: [],
      goals: [],
      fixed: null,
      ts: ym,
    };
  const spent = {};
  for (const t of monthCalc(ym).tx) if (t.kind === "ausgabe") spent[t.cat] = (spent[t.cat] || 0) + t.amount;
  for (const [c, on] of Object.entries(sel.bud || {}))
    if (on && (store.settings.budgets || {})[c])
      out.budgets.push({
        c,
        b: Number(store.settings.budgets[c]) || 0,
        s: round2(spent[c] || 0),
      });
  for (const g of store.settings.goals || [])
    if ((sel.goal || {})[g.id])
      out.goals.push({
        n: g.name,
        t: Number(g.target) || 0,
        v: round2(goalSaved(g).v),
      });
  if (sel.fix === "sum" || sel.fix === "list") {
    const fx = fixedForMonth(ym, true).filter((f) => !debtFor(f.id)),
      items = fx.map((f) => ({
        n: f.name,
        a: round2(planAmt(f, ym)),
      }));
    out.fixed =
      sel.fix === "sum"
        ? {
            sum: round2(sum(items, (x) => x.a)),
          }
        : {
            sum: round2(sum(items, (x) => x.a)),
            items,
          };
  }
  return out;
}
function spPublish(sp, L) {
  const m = currentMember(),
    id = "pub-" + m.id,
    d = spPubData(sp.v),
    cur = L.docs[id];
  if (!cur || JSON.stringify(cur) !== JSON.stringify(d)) {
    L.docs[id] = d;
    L.queue = (L.queue || []).filter((o) => o.i !== id);
    L.queue.push({
      i: id,
      d,
    });
  }
  const mm = L.docs["m-" + m.id];
  if (!mm || mm.name !== (m.name || "Ich")) {
    const md = {
      name: m.name || "Ich",
      c: (mm && mm.c) || MCOL[Object.keys(L.docs).filter((k) => k.startsWith("m-")).length % MCOL.length],
    };
    L.docs["m-" + m.id] = md;
    L.queue.push({
      i: "m-" + m.id,
      d: md,
    });
  }
}
const MCOL = ["#1a7a5c", "#c2410c", "#2f7fb8", "#7a5bc2", "#c27c0e", "#0f766e"];
function spCode(sp) {
  return "HBS1." + sp.v + "." + sp.k + (sp.s && sp.s !== META_PAIR ? "." + b64u(new TextEncoder().encode(sp.s)) : "");
}
function spParse(t) {
  const m = String(t || "")
    .replace(/\s+/g, "")
    .match(/HBS1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})(?:\.([A-Za-z0-9_-]+))?/);
  if (!m) return null;
  let s = "";
  if (m[3])
    try {
      s = new TextDecoder().decode(fromB64u(m[3]));
    } catch (e) {
      return null;
    }
  return {
    v: m[1],
    k: m[2],
    s,
  };
}
async function spCreate(name) {
  const sp = {
    v: b64u(crypto.getRandomValues(new Uint8Array(16))),
    k: b64u(crypto.getRandomValues(new Uint8Array(32))),
    s: META_PAIR ? "" : pairUrl(),
    n: name,
  };
  const K = await spKeys(sp);
  await spRequest(sp, "create", "", {
    vault: K.vault,
    auth: K.auth,
  });
  store.settings.shared = [...spList(), sp];
  saveSettings();
  spPut(sp, "meta", {
    name,
  });
  ui.gmSel = sp.v;
  return sp;
}
async function spJoin(code) {
  const p = spParse(code);
  if (!p) throw new Error("Das ist kein Code für einen gemeinsamen Bereich.");
  if (spList().some((x) => x.v === p.v)) throw new Error("Diesem Bereich bist du schon beigetreten.");
  await spRequest(p, "pull", "&since=999999999").catch((e) => {
    throw new Error(
      e.status === 401 ? "Diesen Bereich gibt es nicht (mehr)." : "Server nicht erreichbar – bist du online?"
    );
  });
  p.n = "Gemeinsam";
  store.settings.shared = [...spList(), p];
  saveSettings();
  ui.gmSel = p.v;
  await spSyncAll();
  const L = spLocal(p.v);
  if (L.docs.meta && L.docs.meta.name) {
    p.n = L.docs.meta.name;
    saveSettings();
  }
  if (Object.keys(L.docs).filter((k) => k.startsWith("m-") && k !== "m-" + currentMember().id).length >= 10) {
    spLeave(p.v);
    throw new Error("Dieser Bereich hat schon 10 Mitglieder.");
  }
  return p;
}
function spLeave(v) {
  const sp = spList().find((x) => x.v === v);
  if (!sp) return;
  spPut(sp, "m-" + currentMember().id, null);
  spPut(sp, "pub-" + currentMember().id, null);
  setTimeout(() => {
    store.settings.shared = spList().filter((x) => x.v !== v);
    saveSettings();
    try {
      localStorage.removeItem("hb-sp-" + v);
    } catch (e) {}
    ui.gmSel = null;
    render();
  }, 2500);
}
function spBalance(L) {
  const mem = Object.keys(L.docs)
      .filter((k) => k.startsWith("m-"))
      .map((k) => k.slice(2)),
    net = {};
  for (const m of mem) net[m] = 0;
  for (const [k, x] of Object.entries(L.docs))
    if (k.startsWith("x-")) {
      const a = Number(x.a) || 0;
      if (x.settle) {
        net[x.p] = (net[x.p] || 0) + a;
        net[x.to] = (net[x.to] || 0) - a;
      } else {
        const who = x.for && x.for.length ? x.for : mem;
        net[x.p] = (net[x.p] || 0) + a;
        for (const m of who) net[m] = (net[m] || 0) - a / who.length;
      }
    }
  return net;
}
function spName(L, id) {
  const m = L.docs["m-" + id];
  return id === currentMember().id ? "Du" : (m && m.name) || "Jemand";
}
function spAv(L, id) {
  const m = L.docs["m-" + id] || {};
  return `<span class="gav" style="background:${m.c || "#5b6472"}">${escHtml(((m.name || "?").trim()[0] || "?").toUpperCase())}</span>`;
}
function gemeinsamCard() {
  if (!spList().length)
    return `<div class="card gmcard"><div class="card-head"><h2>${headIcon("user")}Gemeinsam</h2></div><p class="small muted" style="margin:0 0 10px">Mit Partner oder WG: gemeinsame Ausgaben, Sparziele und Einkaufsliste – jeder behält sein eigenes Konto.</p><button class="btn" data-go="gemeinsam">Ausprobieren</button></div>`;
  return `<div class="card gmcard"><div class="card-head"><h2>${headIcon("user")}Gemeinsam</h2><button class="link" data-go="gemeinsam">Öffnen ${svgIcon("right", 16)}</button></div>${spList()
    .map((sp) => {
      const L = spLocal(sp.v),
        net = spBalance(L),
        mine = net[currentMember().id] || 0;
      return `<button class="gmrow" data-go="gemeinsam" data-gmsel="${escHtml(sp.v)}"><b>${escHtml(sp.n || "Gemeinsam")}</b><span class="${Math.abs(mine) < 0.01 ? "muted" : mine > 0 ? "pos" : "neg"}">${Math.abs(mine) < 0.01 ? "ausgeglichen" : mine > 0 ? `du bekommst ${escHtml(fmtEur(mine))}` : `du gibst ${escHtml(fmtEur(-mine))}`}</span></button>`;
    })
    .join("")}</div>`;
}
function renderGemeinsam() {
  const el = $("v-gemeinsam");
  if (!el) return;
  if (el.contains(document.activeElement) && typingNow()) return;
  const step = ui.gmStep || "",
    list = spList(),
    m = currentMember();
  if (step === "wait" && ui.rwait && ui.rwait.kind === "gm") {
    el.innerHTML = `<div class="card">${reqWaitHtml(ui.rwait)}</div>`;
    return;
  }
  if (!(window.crypto && crypto.subtle)) {
    el.innerHTML = `<div class="card"><p>Gemeinsame Bereiche gehen nur in der Handy- oder PC-App.</p></div>`;
    return;
  }
  if (step === "new" || step === "join" || (!list.length && step !== "invite")) {
    const join = step === "join";
    el.innerHTML = `<div class="card gmintro"><span class="lgic">${svgIcon("user", 26)}</span><h2>${join ? "Einem Bereich beitreten" : list.length ? "Neuer gemeinsamer Bereich" : "Gemeinsam statt einsam"}</h2>
      ${!list.length && !step ? `<p class="small muted" style="margin:0 0 12px;line-height:1.5">Teile mit Partner, Familie oder WG nur das, was ihr gemeinsam habt: Ausgaben mit automatischem Ausgleich, Sparziele, eine Einkaufsliste – und auf Wunsch einzelne Budgets oder Fixkosten. Konten und alles andere bleiben privat. Ende-zu-Ende verschlüsselt, ohne Konto.</p>` : ""}
      <div class="field"><label for="gmMe">Dein Name (sehen die anderen)</label><input class="in" id="gmMe" value="${escHtml(m.name || store.settings.name || "")}" placeholder="z. B. Sascha"></div>
      ${
        join
          ? `<ol class="psteps"><li>${trBold("Wer dich einlädt, öffnet **Gemeinsam › Einladen**.")}</li><li>Du scannst den QR-Code oder tippst den Code ein.</li><li>Die andere Person bestätigt deine Anfrage – dann bist du dabei.</li></ol>${canQrLive() ? `<button class="btn primary block" style="justify-content:center;gap:8px" data-qrlive="gm">${svgIcon("camera", 18)} QR-Code scannen</button>` : `<label class="btn primary block" style="justify-content:center;gap:8px">${svgIcon("camera", 18)} Bild mit QR-Code auswählen<input type="file" accept="image/*" id="gmCam" hidden></label>`}
        <div class="field"><label for="gmCode">… oder Code eintippen</label><input class="in" id="gmCode" placeholder="z. B. 7KF2-QX9M-3T" autocapitalize="characters" autocomplete="off" spellcheck="false" style="font-family:ui-monospace,monospace;letter-spacing:.08em;font-size:18px;text-align:center"></div>
        <div class="row-btns"><button class="btn" data-gmstep="">Zurück</button><button class="btn primary" id="gmJoinGo">Anfrage senden</button></div>`
          : step === "new"
            ? `<div class="field"><label for="gmName">Name des Bereichs</label><input class="in" id="gmName" placeholder="z. B. Wir zwei, WG, Familie"></div>
        <div class="row-btns"><button class="btn" data-gmstep="">Zurück</button><button class="btn primary" id="gmNewGo">Anlegen</button></div>`
            : `<div class="row-btns" style="justify-content:stretch"><button class="btn primary" data-gmstep="new">Bereich anlegen</button><button class="btn" data-gmstep="join">Beitreten</button></div>`
      }
      <span class="small" id="gmErr" style="color:var(--bad)"></span></div>`;
    return;
  }
  const sp = list.find((x) => x.v === ui.gmSel) || list[0];
  ui.gmSel = sp.v;
  const L = spLocal(sp.v),
    tab = ui.gmTab || "over";
  const mem = Object.keys(L.docs)
      .filter((k) => k.startsWith("m-"))
      .map((k) => k.slice(2)),
    net = spBalance(L),
    mine = net[m.id] || 0;
  const chips = `<div class="gmchips">${list.map((x) => `<button class="chip ${x.v === sp.v ? "on" : ""}" data-gmsel="${escHtml(x.v)}">${escHtml(x.n || "Gemeinsam")}</button>`).join("")}<button class="chip" data-gmstep="new">+ Neu</button><button class="chip" data-gmstep="join">Beitreten</button></div>`;
  if (step === "invite") {
    el.innerHTML =
      chips +
      `<div class="card"><h2 style="margin:0 0 6px">Jemanden einladen</h2><p class="small" style="margin:0 0 10px;line-height:1.5">${trBold("Die andere Person öffnet **Gemeinsam › Beitreten** und scannt diesen Code. Dann bekommst du hier eine **Anfrage** mit ihrem Namen – erst wenn du zulässt, ist sie dabei. Sie sieht nur diesen Bereich, nichts von deinen anderen Daten.")}</p>
    <div class="pqr" id="gmQr">${GMS.code && GMS.v === sp.v ? qrSvg("HBG1." + GMS.code, 230) : `<div class="small muted" style="padding:80px 0">Wird vorbereitet …</div>`}</div>
    <div class="small muted" style="text-align:center;margin-top:12px">Ohne Kamera, z. B. am PC – diesen Code eintippen:</div>
    <div class="pcode gmshort" id="gmShort" style="margin-top:6px;text-align:center;font-size:26px;letter-spacing:.12em;font-family:ui-monospace,monospace">${GMS.code && GMS.v === sp.v ? escHtml(shortFmt(GMS.code)) : "…"}</div>
    <div id="gmCtd">${ctdHtml(GMS.code && GMS.v === sp.v ? GMS.t0 : 0, "gm")}</div>
    <div class="row-btns" style="margin-top:12px"><button class="btn" id="gmCopy">Code kopieren</button><button class="btn primary" data-gmstep="">Fertig</button></div></div>`;
    if (!(GMS.code && GMS.v === sp.v && Date.now() - GMS.t0 < CTD_LEN - 5000))
      gmShortMake(sp)
        .then(() => {
          const e = $("gmShort");
          if (e) e.textContent = GMS.code ? shortFmt(GMS.code) : "– (offline)";
          const q = $("gmQr");
          if (q && GMS.code) q.innerHTML = qrSvg("HBG1." + GMS.code, 230);
          const c = document.querySelector("#gmCtd [data-ctd]");
          if (c && GMS.code) {
            c.dataset.ctd = GMS.t0;
            delete c.dataset.done;
            ctdTick();
          }
        })
        .catch(() => {
          const e = $("gmShort");
          if (e) e.textContent = "– (offline)";
        });
    return;
  }
  const TABS = [
    ["over", "Übersicht"],
    ["exp", "Ausgaben"],
    ["goal", "Sparziele"],
    ["shop", "Einkauf"],
    ["share", "Freigaben"],
  ];
  const exps = Object.entries(L.docs)
    .filter(([k]) => k.startsWith("x-"))
    .map(([k, x]) => ({
      id: k,
      ...x,
    }))
    .sort((a, b) => (b.d || "").localeCompare(a.d || ""));
  const goals = Object.entries(L.docs)
      .filter(([k]) => k.startsWith("g-"))
      .map(([k, x]) => ({
        id: k,
        ...x,
      })),
    contr = Object.entries(L.docs)
      .filter(([k]) => k.startsWith("c-"))
      .map(([k, x]) => ({
        id: k,
        ...x,
      }));
  const shop = Object.entries(L.docs)
    .filter(([k]) => k.startsWith("s-"))
    .map(([k, x]) => ({
      id: k,
      ...x,
    }))
    .sort((a, b) => a.done - b.done || (a.ts || 0) - (b.ts || 0));
  const pubs = mem
    .map((id) => ({
      id,
      p: L.docs["pub-" + id],
    }))
    .filter((x) => x.p);
  const balHtml =
    mem.length < 2
      ? `<p class="small muted" style="margin:0">Noch allein hier – lade jemanden ein.</p><button class="btn primary" data-gmstep="invite" style="margin-top:10px">Jemanden einladen</button>`
      : `<div class="gmbal ${Math.abs(mine) < 0.01 ? "" : mine > 0 ? "pos" : "neg"}">${Math.abs(mine) < 0.01 ? "Alles ausgeglichen" : mine > 0 ? `Du bekommst ${escHtml(fmtEur(mine))}` : `Du gibst ${escHtml(fmtEur(-mine))}`}</div>
      ${mem
        .filter((id) => id !== m.id)
        .map(
          (id) =>
            `<div class="gmmem">${spAv(L, id)}<span>${escHtml(spName(L, id))}</span><b class="${(net[id] || 0) > 0.005 ? "pos" : (net[id] || 0) < -0.005 ? "neg" : "muted"}">${(net[id] || 0) > 0.005 ? "bekommt " : (net[id] || 0) < -0.005 ? "gibt " : ""}${escHtml(fmtEur(Math.abs(net[id] || 0)))}</b></div>`
        )
        .join("")}
      ${
        mine < -0.005
          ? `<div class="row-btns" style="margin-top:10px">${mem
              .filter((id) => (net[id] || 0) > 0.005)
              .map(
                (id) =>
                  `<button class="btn" data-gmsettle="${escHtml(id)}" data-amt="${Math.min(-mine, net[id]).toFixed(2)}">${escHtml(fmtEur(Math.min(-mine, net[id])))} an ${escHtml(spName(L, id))} gezahlt</button>`
              )
              .join("")}</div>`
          : ""
      }`;
  const goalHtml = (g) => {
    const cs = contr.filter((c) => c.g === g.id),
      tot = sum(cs, (c) => Number(c.a) || 0),
      by = {};
    for (const c of cs) by[c.m] = (by[c.m] || 0) + (Number(c.a) || 0);
    return `<div class="gmgoal"><div class="abl"><b>${escHtml(g.n)}</b><span>${escHtml(fmtEur0(tot))} / ${escHtml(fmtEur0(g.t))}</span></div><span class="bpbar"><i style="width:${Math.min(100, (tot / (g.t || 1)) * 100)}%;background:${tot >= g.t ? "var(--good)" : "var(--accent)"}"></i></span>
      <div class="gmby">${Object.entries(by)
        .map(([id, v]) => `${spAv(L, id)}<span>${escHtml(fmtEur0(v))}</span>`)
        .join(
          ""
        )}</div>${tab === "goal" ? `<div class="gmadd"><input class="in" inputmode="decimal" placeholder="Betrag €" data-gmcin="${escHtml(g.id)}"><button class="btn" data-gmcadd="${escHtml(g.id)}">Eingezahlt</button><button class="icon-btn" data-gmdel="${escHtml(g.id)}" aria-label="Ziel löschen">×</button></div>` : ""}</div>`;
  };
  const pubHtml = pubs
    .map(({ id, p }) => {
      const parts = [];
      for (const b of p.budgets || [])
        parts.push(
          aBar(
            `${escHtml(b.c)} <span class="muted small">Budget</span>`,
            b.s,
            b.b,
            b.s > b.b ? "var(--bad)" : "var(--accent)",
            `${escHtml(fmtEur0(b.s))} / ${escHtml(fmtEur0(b.b))}`
          )
        );
      for (const g of p.goals || [])
        parts.push(
          aBar(
            `${escHtml(g.n)} <span class="muted small">Sparziel</span>`,
            g.v,
            g.t,
            "var(--good)",
            `${escHtml(fmtEur0(g.v))} / ${escHtml(fmtEur0(g.t))}`
          )
        );
      if (p.fixed)
        parts.push(
          p.fixed.items
            ? p.fixed.items
                .map((f) => `<div class="abl"><b>${escHtml(f.n)}</b><span>${escHtml(fmtEur(f.a))}</span></div>`)
                .join("") +
                `<div class="abl"><b>Fixkosten gesamt</b><span>${escHtml(fmtEur0(p.fixed.sum))}</span></div>`
            : `<div class="abl"><b>Fixkosten im Monat</b><span>${escHtml(fmtEur0(p.fixed.sum))}</span></div>`
        );
      return parts.length
        ? `<div class="gmpub"><div class="gmmem">${spAv(L, id)}<b>${escHtml(spName(L, id))} teilt</b></div>${parts.join("")}</div>`
        : "";
    })
    .join("");
  const body =
    tab === "over"
      ? `<div class="card"><div class="card-head"><h2>Ausgleich</h2>${mem.length > 1 ? `<button class="link" data-gmstep="invite">Einladen</button>` : ""}</div>${balHtml}</div>
      ${goals.length ? `<div class="card"><div class="card-head"><h2>Gemeinsame Sparziele</h2><button class="link" data-gmtab="goal">Alle</button></div>${goals.map(goalHtml).join("")}</div>` : ""}
      ${pubHtml ? `<div class="card"><div class="card-head"><h2>Freigegeben</h2></div>${pubHtml}</div>` : ""}
      ${shop.filter((s) => !s.done).length ? `<div class="card"><div class="card-head"><h2>Einkaufsliste</h2><button class="link" data-gmtab="shop">${shop.filter((s) => !s.done).length} offen</button></div></div>` : ""}`
      : tab === "exp"
        ? `<div class="card"><h2 style="margin:0 0 10px">Ausgabe eintragen</h2><div class="grid2"><input class="in" id="gxT" placeholder="Wofür? z. B. Rewe"><input class="in" id="gxA" inputmode="decimal" placeholder="Betrag €"></div>
        <div class="grid2" style="margin-top:8px"><select class="in" id="gxP">${mem.map((id) => `<option value="${escHtml(id)}" ${id === m.id ? "selected" : ""}>bezahlt von ${escHtml(spName(L, id))}</option>`).join("")}</select><input class="in" type="date" id="gxD" value="${isoToday()}"></div>
        <button class="btn primary block" id="gxAdd" style="margin-top:10px">Eintragen – wird gleich aufgeteilt</button></div>
      <div class="card">${
        exps.length
          ? exps
              .slice(0, 60)
              .map(
                (x) =>
                  `<div class="gmexp">${spAv(L, x.p)}<span class="n"><b>${x.settle ? `Ausgleich an ${escHtml(spName(L, x.to))}` : escHtml(x.t || "Ausgabe")}</b><small>${escHtml(new Date((x.d || isoToday()) + "T12:00").toLocaleDateString("de-DE"))} · ${escHtml(spName(L, x.p))}${x.settle ? "" : " hat bezahlt"}</small></span><b>${escHtml(fmtEur(x.a))}</b>${x.by === m.id ? `<button class="icon-btn" data-gmdel="${escHtml(x.id)}" aria-label="Löschen">×</button>` : ""}</div>`
              )
              .join("")
          : `<p class="small muted" style="margin:0">Noch keine gemeinsamen Ausgaben.</p>`
      }</div>`
        : tab === "goal"
          ? `<div class="card"><h2 style="margin:0 0 10px">Neues gemeinsames Sparziel</h2><div class="grid2"><input class="in" id="ggN" placeholder="z. B. Urlaub"><input class="in" id="ggT" inputmode="decimal" placeholder="Ziel €"></div><button class="btn primary block" id="ggAdd" style="margin-top:10px">Anlegen</button></div>
      <div class="card">${goals.length ? goals.map(goalHtml).join("") : `<p class="small muted" style="margin:0">Noch kein gemeinsames Sparziel.</p>`}</div>`
          : tab === "shop"
            ? `<div class="card"><div class="gmadd"><input class="in" id="gsT" placeholder="z. B. Milch"><button class="btn primary" id="gsAdd">Hinzufügen</button></div>
      ${shop.map((s) => `<div class="gmshop ${s.done ? "done" : ""}"><button class="gmck" data-gmshop="${escHtml(s.id)}" aria-label="${s.done ? "Wieder offen" : "Erledigt"}">${s.done ? "✓" : ""}</button><span>${escHtml(s.t)}</span><button class="icon-btn" data-gmdel="${escHtml(s.id)}" aria-label="Löschen">×</button></div>`).join("")}
      ${shop.some((s) => s.done) ? `<button class="link small" id="gsClear" style="margin-top:8px">Erledigte entfernen</button>` : ""}</div>`
            : (() => {
                const sel = spSel(sp.v),
                  bud = Object.entries(store.settings.budgets || {}).filter(([c, v]) => v > 0);
                return `<div class="card"><h2 style="margin:0 0 4px">Was die anderen von dir sehen</h2><p class="small muted" style="margin:0 0 10px">Alles, was hier nicht an ist, bleibt privat. Konten, Kontostand und Buchungen werden nie geteilt.</p>
        <div class="section-title" style="font-size:14px;margin-top:4px">Budgets</div>${bud.length ? bud.map(([c, v]) => `<div class="switch"><label><b>${escHtml(c)}</b><br><span class="small muted">${escHtml(fmtEur0(v))} im Monat – die anderen sehen Budget und was du davon ausgegeben hast</span></label><input type="checkbox" data-gmsb="${escHtml(c)}" ${(sel.bud || {})[c] ? "checked" : ""}></div>`).join("") : `<p class="small muted">Noch keine Budgets angelegt.</p>`}
        <div class="section-title" style="font-size:14px">Sparziele</div>${(store.settings.goals || []).length ? (store.settings.goals || []).map((g) => `<div class="switch"><label><b>${escHtml(g.name)}</b><br><span class="small muted">Stand und Ziel</span></label><input type="checkbox" data-gmsg="${escHtml(g.id)}" ${(sel.goal || {})[g.id] ? "checked" : ""}></div>`).join("") : `<p class="small muted">Noch keine eigenen Sparziele.</p>`}
        <div class="section-title" style="font-size:14px">Fixkosten</div><div class="seg" role="group">${[
          ["none", "privat"],
          ["sum", "nur Summe"],
          ["list", "einzeln"],
        ]
          .map(([k, l]) => `<button data-gmsf="${k}" aria-pressed="${(sel.fix || "none") === k}">${l}</button>`)
          .join("")}</div></div>
        <div class="card"><div class="row-btns"><button class="btn" data-gmstep="invite">Jemanden einladen</button><button class="btn danger" id="gmLeave">Bereich verlassen</button></div></div>`;
              })();
  el.innerHTML =
    chips +
    `<div class="gmhead"><h2>${escHtml(sp.n || "Gemeinsam")}</h2><span class="gmavs">${mem.map((id) => spAv(L, id)).join("")}</span></div>
    <div class="gmtabs">${TABS.map(([k, l]) => `<button class="fchip" data-gmtab="${k}" aria-pressed="${tab === k}">${l}</button>`).join("")}</div>` +
    body;
}
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (!t.closest) return;
  if (
    t.closest("#v-gemeinsam button, #v-home .gmcard") &&
    document.activeElement &&
    document.activeElement.blur &&
    document.activeElement !== document.body
  )
    document.activeElement.blur();
  const st = t.closest("[data-gmstep]");
  if (st) {
    ui.gmStep = st.dataset.gmstep;
    renderGemeinsam();
    window.scrollTo({
      top: 0,
    });
    return;
  }
  const se = t.closest("[data-gmsel]");
  if (se) {
    ui.gmSel = se.dataset.gmsel;
    ui.gmStep = "";
    if (ui.view === "gemeinsam" || SPS.open === "gemeinsam") renderGemeinsam();
    return;
  }
  const tb = t.closest("[data-gmtab]");
  if (tb) {
    ui.gmTab = tb.dataset.gmtab;
    renderGemeinsam();
    return;
  }
  if (!t.closest("#v-gemeinsam")) return;
  const sp = spList().find((x) => x.v === ui.gmSel),
    err = (m) => {
      const x = $("gmErr");
      if (x) x.textContent = m;
      else toast(m);
    };
  const saveMe = () => {
    const n = ($("gmMe") || {}).value;
    if (n != null) {
      const mm = currentMember();
      mm.name = n.trim().slice(0, 30);
      store.settings.me = mm;
    }
  };
  if (t.closest("#gmNewGo")) {
    const n = $("gmName").value.trim() || "Gemeinsam";
    saveMe();
    if (!currentMember().name) {
      err("Bitte deinen Namen eintragen");
      return;
    }
    t.closest("#gmNewGo").disabled = true;
    try {
      await spCreate(n.slice(0, 40));
      ui.gmStep = "invite";
      render();
    } catch (x) {
      err("Server nicht erreichbar – bist du online?");
      t.closest("#gmNewGo").disabled = false;
    }
    return;
  }
  if (t.closest("#gmJoinGo")) {
    let code = $("gmCode").value;
    saveMe();
    if (!currentMember().name) {
      err("Bitte deinen Namen eintragen");
      return;
    }
    try {
      if (!spParse(code)) {
        const q = String(code || "").match(/HBG1\.([0-9A-Za-z]{10})/),
          sc = q ? q[1] : code;
        if (/HBQ1\./.test(String(code)))
          throw new Error(
            "Das ist ein Code zum Koppeln eigener Geräte – den gibst du unter Einstellungen › Geräte & Abgleich ein."
          );
        if (!shortOk(sc)) throw new Error("Der Code hat 10 Zeichen, z. B. 7KF2-QX9M-3T.");
        ui.gmStep = "wait";
        try {
          code = await reqAsk("gm", sc, await myCard(currentMember().name));
        } catch (e) {
          if (ui.gmStep === "wait") {
            ui.gmStep = "join";
            renderGemeinsam();
          }
          if (e.cancel) return;
          throw e;
        }
      }
      if (!spParse(code)) throw new Error("Das ist kein Code für einen gemeinsamen Bereich.");
      await spJoin(code);
      ui.gmStep = "";
      render();
      toast("Du bist dabei!");
    } catch (x) {
      err(String(x.message || x).replace("Lass dir am Handy einen neuen zeigen.", "Lass dir einen neuen zeigen."));
    }
    return;
  }
  if (t.closest("#gmCopy") && sp) {
    if (!(GMS.code && GMS.v === sp.v)) {
      toast("Der Code wird noch vorbereitet");
      return;
    }
    try {
      await copySecret(shortFmt(GMS.code));
      toast("Code kopiert – er gilt 10 Minuten");
    } catch (_) {
      toast("Bitte markieren und kopieren");
    }
    return;
  }
  if (!sp) return;
  if (t.closest("#gxAdd")) {
    const a = parseAmt($("gxA").value);
    if (!(a > 0)) {
      toast("Bitte einen Betrag eintragen");
      return;
    }
    spPut(sp, "x-" + newId(), {
      t: $("gxT").value.trim().slice(0, 60) || "Ausgabe",
      a: round2(a),
      p: $("gxP").value,
      d: $("gxD").value || isoToday(),
      by: currentMember().id,
    });
    toast("Eingetragen");
    renderGemeinsam();
    return;
  }
  const stl = t.closest("[data-gmsettle]");
  if (stl) {
    spPut(sp, "x-" + newId(), {
      settle: true,
      a: Number(stl.dataset.amt),
      p: currentMember().id,
      to: stl.dataset.gmsettle,
      d: isoToday(),
      by: currentMember().id,
    });
    toast("Ausgleich eingetragen");
    renderGemeinsam();
    return;
  }
  if (t.closest("#ggAdd")) {
    const n = $("ggN").value.trim(),
      a = parseAmt($("ggT").value);
    if (!n || !(a > 0)) {
      toast("Bitte Name und Ziel eintragen");
      return;
    }
    spPut(sp, "g-" + newId(), {
      n: n.slice(0, 40),
      t: a,
    });
    renderGemeinsam();
    return;
  }
  const ca = t.closest("[data-gmcadd]");
  if (ca) {
    const inp = document.querySelector(`[data-gmcin="${ca.dataset.gmcadd}"]`),
      a = parseAmt(inp && inp.value);
    if (!(a > 0)) {
      toast("Bitte einen Betrag eintragen");
      return;
    }
    spPut(sp, "c-" + newId(), {
      g: ca.dataset.gmcadd,
      m: currentMember().id,
      a: round2(a),
      d: isoToday(),
    });
    toast("Eingezahlt");
    renderGemeinsam();
    return;
  }
  if (t.closest("#gsAdd")) {
    const v = $("gsT").value.trim();
    if (!v) return;
    spPut(sp, "s-" + newId(), {
      t: v.slice(0, 60),
      done: false,
      ts: Date.now(),
    });
    renderGemeinsam();
    setTimeout(() => {
      const i = $("gsT");
      if (i) i.focus();
    }, 30);
    return;
  }
  const sh = t.closest("[data-gmshop]");
  if (sh) {
    const L = spLocal(sp.v),
      x = L.docs[sh.dataset.gmshop];
    if (x)
      spPut(sp, sh.dataset.gmshop, {
        ...x,
        done: !x.done,
      });
    renderGemeinsam();
    return;
  }
  if (t.closest("#gsClear")) {
    const L = spLocal(sp.v);
    for (const [k, x] of Object.entries(L.docs)) if (k.startsWith("s-") && x.done) spPut(sp, k, null);
    renderGemeinsam();
    return;
  }
  const dl = t.closest("[data-gmdel]");
  if (dl) {
    spPut(sp, dl.dataset.gmdel, null);
    if (dl.dataset.gmdel.startsWith("g-")) {
      const L = spLocal(sp.v);
      for (const [k, x] of Object.entries(L.docs))
        if (k.startsWith("c-") && x.g === dl.dataset.gmdel) spPut(sp, k, null);
    }
    renderGemeinsam();
    return;
  }
  const sf = t.closest("[data-gmsf]");
  if (sf) {
    spSelSet(sp.v, (s) => {
      s.fix = sf.dataset.gmsf;
    });
    spSyncSoon();
    renderGemeinsam();
    return;
  }
  if (t.closest("#gmLeave")) {
    const b = t.closest("#gmLeave");
    if (b.dataset.armed !== "1") {
      b.dataset.armed = "1";
      b.textContent = "Wirklich verlassen?";
      setTimeout(() => {
        b.dataset.armed = "";
        b.textContent = "Bereich verlassen";
      }, 4000);
      return;
    }
    spLeave(sp.v);
    toast("Bereich verlassen");
    return;
  }
});
document.addEventListener("change", async (e) => {
  const t = e.target;
  if (!t.closest || !t.closest("#v-gemeinsam")) return;
  const sp = spList().find((x) => x.v === ui.gmSel);
  if (t.id === "gmCam") {
    const f = t.files && t.files[0];
    t.value = "";
    if (!f) return;
    const x = $("gmErr");
    if (x) x.textContent = "QR-Code wird gelesen …";
    try {
      const c = await qrFromFile(f);
      if (!c || !(spParse(c) || /HBG1\./.test(c))) {
        if (x) x.textContent = "Kein Code erkannt – näher ran oder Code einfügen.";
        return;
      }
      $("gmCode").value = c;
      if (x) x.textContent = "";
      const g = $("gmJoinGo");
      if (g) g.click();
    } catch (_) {
      if (x) x.textContent = "Das Foto ließ sich nicht lesen.";
    }
    return;
  }
  if (!sp) return;
  if (t.dataset.gmsb != null) {
    spSelSet(sp.v, (s) => {
      s.bud = s.bud || {};
      s.bud[t.dataset.gmsb] = t.checked;
    });
    spSyncSoon();
  } else if (t.dataset.gmsg != null) {
    spSelSet(sp.v, (s) => {
      s.goal = s.goal || {};
      s.goal[t.dataset.gmsg] = t.checked;
    });
    spSyncSoon();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "gsT") {
    const b = $("gsAdd");
    if (b) b.click();
  }
});

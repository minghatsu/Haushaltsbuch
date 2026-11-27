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
        ...(SYNC.sBase ? { sBase: SYNC.sBase } : {}),
        ...(typeof SYNC.bad === "number" ? { bad: SYNC.bad } : {}),
      })
    );
  } catch (e) {}
}
/* Einstellungen sind ein einziges Dokument. Ändern zwei Geräte vor dem Abgleich verschiedene Dinge
   (z. B. Handy das Budget, PC den Namen), gewann bisher das zuletzt hochgeladene – das andere war weg.
   Jetzt: Vor dem Hochladen wird der Stand vom Server geholt und zusammengeführt. Es zählt jeweils,
   was auf diesem Gerät seit dem letzten Abgleich (SYNC.sBase) wirklich geändert wurde. */
const setJ = (v) => JSON.stringify(v === undefined ? null : v);
const setObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const setCl = (v) => (v === undefined ? undefined : clone(v));
const setIdList = (a) => Array.isArray(a) && a.length > 0 && a.every((x) => x && typeof x === "object" && x.id != null);
function setMerge3(base, loc, rem, depth) {
  if (setJ(loc) === setJ(base)) return setCl(rem);
  if (setJ(rem) === setJ(base) || setJ(rem) === setJ(loc)) return setCl(loc);
  if (depth < 3 && setObj(base) && setObj(loc) && setObj(rem)) {
    const out = {};
    for (const k of new Set([...Object.keys(base), ...Object.keys(loc), ...Object.keys(rem)])) {
      const v = setMerge3(base[k], loc[k], rem[k], depth + 1);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  /* Listen mit id (Sparziele, Konten …): je Eintrag zusammenführen */
  if (depth < 3 && Array.isArray(base) && (setIdList(loc) || setIdList(rem)) && (Array.isArray(loc) || loc == null) && (Array.isArray(rem) || rem == null)) {
    const by = (a) => new Map((a || []).filter((x) => x && x.id != null).map((x) => [String(x.id), x])),
      B = by(base),
      L = by(loc),
      R = by(rem),
      out = [];
    const order = [...(rem || []), ...(loc || [])].map((x) => x && x.id != null && String(x.id)).filter(Boolean);
    for (const id of [...new Set(order)]) {
      const inB = B.has(id),
        inL = L.has(id),
        inR = R.has(id);
      if (inB && !inL && (!inR || setJ(R.get(id)) === setJ(B.get(id)))) continue; /* hier gelöscht */
      if (inB && !inR && (!inL || setJ(L.get(id)) === setJ(B.get(id)))) continue; /* dort gelöscht */
      const v = setMerge3(B.get(id), L.get(id), R.get(id), depth + 1);
      if (v) out.push(v);
    }
    return out;
  }
  return setCl(loc); /* beide haben dasselbe geändert: dieses Gerät gewinnt (wie bisher) */
}
async function syncSetPre() {
  const op = SYNC.queue.find((o) => o.col === "app" && o.id === "settings");
  if (!op || !SYNC.sBase || !op.data) return;
  let since = SYNC.rev,
    remote = null;
  for (let n = 0; n < 8; n++) {
    const res = await api("pull", { qs: "&since=" + since });
    if (MODE === "pair" && res.moved) return;
    const docs = MODE === "pair" ? await pairDecDocs(res.docs) : res.docs || [];
    for (const d of docs) if (d.col === "app" && d.id === "settings" && d.data) remote = d.data;
    if (!res.more || !res.rev || res.rev === since) break;
    since = res.rev;
  }
  if (!remote || setJ(remote) === setJ(SYNC.sBase)) return;
  const m = setMerge3(SYNC.sBase, store.settings, remote, 0);
  m.cats = { ...clone(DEFAULT_SETTINGS.cats), ...(m.cats || {}) };
  try {
    zMerge(store.settings, m);
  } catch (_) {}
  if (!m.updKey && store.settings && store.settings.updKey) m.updKey = store.settings.updKey;
  store.settings = m;
  op.data = clone(m);
  SYNC.sBase = clone(remote);
  persistLocal();
  saveSync();
  try {
    BG_RENDER = true;
    render();
  } catch (_) {
  } finally {
    BG_RENDER = false;
  }
}
function rqAdd(id) {
  if (!SERVER || !SYNC.token) return;
  SYNC.rq = (SYNC.rq || []).filter((x) => x !== id);
  SYNC.rq.push(id);
  saveSync();
  flushSoon();
}
function enqueue(col, id, data) {
  if (!SERVER || !SYNC.token || PV) return;
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
    try {
      await syncSetPre();
    } catch (e) {
      if (e && e.status) throw e;
    }
    if (SYNC.queue.length) {
      const ops = SYNC.queue.slice(0, MODE === "pair" ? 150 : 400);
      await api("push", {
        body: {
          ops: MODE === "pair" ? await pairEncOps(ops) : ops,
        },
      });
      SYNC.queue = SYNC.queue.filter((o) => !ops.includes(o));
      const so = ops.find((o) => o.col === "app" && o.id === "settings");
      if (so && so.data) SYNC.sBase = clone(so.data);
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
    /* Alter Speicher eingefroren (ein Gerät wurde entfernt): umziehen */
    if (MODE === "pair" && res.moved) {
      SYNC.busy = false;
      return pairMovedCheck();
    }
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
        try {
          secDevSeen(d.id.slice(4), d.data);
        } catch (_) {}
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
          SYNC.sBase = clone(d.data);
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
    try {
      secBadSeen(res);
    } catch (_) {}
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
    if (e.status === 409 && e.data && e.data.moved && MODE === "pair") {
      SYNC.busy = false;
      return pairMovedCheck();
    }
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

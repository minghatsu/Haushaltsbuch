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

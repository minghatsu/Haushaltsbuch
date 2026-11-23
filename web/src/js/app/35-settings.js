/* Einstellungen */
var ACC = {
  tab: "geld",
  open: new Set(),
  nodes: {},
  built: "",
  q: "",
};
const ACC_TABS = [
  ["geld", "Geld"],
  ["anpassen", "Anpassen"],
  ["sicherheit", "Sicherheit"],
  ["hilfe", "Hilfe"],
];
function accTabKeys(t) {
  if (t === "geld")
    return [
      "konten",
      "budgets",
      "schulden",
      ...(isJobless() ? ["amt"] : hasProfile() ? ["amt", "steuer"] : ["steuer"]),
      "invest",
      "export",
    ];
  if (t === "anpassen") return ["dark", "toene", "farben", "sprache", "kategorien", "start", "laeden"];
  if (t === "sicherheit")
    return [
      "sicherheit",
      ...(SYNCABLE || window.AndroidBridge ? ["sync", "geraete"] : []),
      "backup",
      ...(CAN_NOTIFY ? ["notify"] : []),
      "speicher",
    ];
  return ["neu", "hilfe", "wiz", ...(canShare() ? ["weiter"] : []), "recht"];
}
const accTabOf = (k) => (ACC_TABS.find(([t]) => accTabKeys(t).includes(k)) || ["geld"])[0];
const ACC_COL = {
  toene: "#6d5bd0",
  invest: "#c98a12",
  konten: "#3d63a8",
  budgets: "#c27c0e",
  schulden: "#7a5bc2",
  steuer: "#d4813a",
  amt: "#3d63a8",
  abos: "#0f766e",
  export: "#047857",
  dark: "#34413b",
  farben: "#d14d72",
  sprache: "#65a30d",
  kategorien: "#c0497a",
  start: "#1a7a5c",
  laeden: "#0f8a8a",
  sicherheit: "#b23a3a",
  sync: "#2f7fb8",
  geraete: "#0e7490",
  backup: "#2e9c74",
  notify: "#e0902b",
  speicher: "#4b5563",
  neu: "#15803d",
  hilfe: "#0e7490",
  wiz: "#1a7a5c",
  feedback: "#4d7c0f",
  recht: "#4b5563",
};
function accTitle(k) {
  return k === "weiter"
    ? "App weitergeben"
    : k === "dark"
      ? "Dunkelmodus"
      : k === "wiz"
        ? "Einrichtung & Rundgang"
        : k === "farben"
          ? "Farben"
          : (SP_PAGES[k] || [k])[0];
}
function accIcon(k) {
  return k === "weiter" ? "phone" : k === "dark" ? "spark" : k === "wiz" ? "check" : (SP_PAGES[k] || [, "dots"])[1];
}
function accSub(k) {
  const st = store.settings;
  if (k === "dark") return document.documentElement.dataset.theme === "dark" ? "an" : "aus";
  if (k === "wiz") return "Noch einmal Schritt für Schritt einrichten";
  if (k === "weiter") return "Für jeden Tester ein eigener Code";
  if (k === "sync")
    return !SYNC.token
      ? "Abgleich aus"
      : SYNC.state === "ok"
        ? "Abgeglichen" +
          (SYNC.last
            ? " · " +
              new Date(SYNC.last).toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "")
        : SYNC.state === "pending"
          ? "wartet"
          : "nicht erreichbar";
  if (k === "sprache")
    return `${(LANGS.find((x) => x[0] === LANG) || LANGS[0])[1]} · €${st.cur2 ? " · " + st.cur2 : ""}`;
  if (k === "invest") {
    const g = (st.inv && st.inv.goals) || [];
    return g.length ? `${g.length} Anlage-${g.length === 1 ? "Ziel" : "Ziele"}` : "Zinseszins · Vergleich · Ziele";
  }
  if (k === "abos") {
    const n = Object.values(st.abos || {}).filter((a) => a && a.end).length;
    return n ? `${n} mit Kündigungsfrist` : "Fristen im Blick";
  }
  if (k === "export") return "Bericht · Excel";
  if (k === "neu") return verFull();
  if (k === "hilfe") return "Fragen und Antworten";
  if (k === "feedback") return "Fehler oder Wunsch melden";
  if (k === "recht") return "Datenschutz · Impressum · Lizenzen";
  if (k === "speicher") return RCPT.ids.size + " Belegfotos";
  if (k === "geraete") {
    const n = Math.max(1, Object.keys(devList()).length);
    return (SYNC.token ? "Abgleich an" : "Abgleich aus") + " · " + (n === 1 ? "1 Gerät" : n + " Geräte");
  }
  if (k === "backup") {
    try {
      return abCfg().on && CAN_AUTOBK
        ? "wöchentlich" + (backupEnc() ? " · verschlüsselt" : "")
        : "Datei sichern oder laden";
    } catch (e) {
      return "Datei";
    }
  }
  return spSummary(k) || "";
}
const liveSp = (k) =>
  [...document.querySelectorAll(k ? `#v-more [data-sp="${k}"]` : "#v-more [data-sp]")].filter(
    (el) => !el.closest(".cubestage")
  );
function renderSpName() {
  const el = $("spNameEd"),
    opts = SPN_OPT[LANG];
  if (!el) return;
  el.hidden = !opts;
  if (!opts) return;
  el.innerHTML = `<label>${escHtml(uiText("spn_h"))}</label><div class="erseg spnseg">${opts
    .map(
      ([k, t]) =>
        `<button type="button" class="${(SPN || "") === k ? "on" : ""}" data-spname="${k}" aria-pressed="${(SPN || "") === k}">${escHtml(t)}</button>`
    )
    .join("")}</div><span class="small muted">${escHtml(uiText("spn_s"))}</span>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-spname]");
  if (!b) return;
  I18N.setSpace(b.dataset.spname);
  SND.play("tick");
  renderSpName();
  render();
});
function accPrep(k) {
  if (k === "konten") renderSpName();
  if (k === "sync") renderUpd();
  if (k === "farben") renderColorEd();
  if (k === "amt") renderAmtEd();
  if (k === "recht") renderRecht();
  if (k === "abos") renderAbos();
  if (k === "invest") renderInvest();
  if (k === "export") renderExport();
  if (k === "sprache") renderSprache();
  if (k === "neu") renderNeu();
  if (k === "hilfe") renderHilfe();
  if (k === "feedback") renderFeedback();
  if (k === "toene") renderSndEd();
  if (k === "speicher") renderSpeicher();
  if (k === "geraete") renderGeraete();
}
function accMount(k) {
  const body = $("sab-" + k);
  if (!body || ACC.nodes[k]) return;
  try {
    accPrep(k);
  } catch (e) {
    console.warn("acc", k, e);
  }
  const els = liveSp(k).filter(
    (el) => !el.closest(".sabody") && !(el.id === "syncBox" && !SYNCABLE) && !el.dataset.off
  );
  ACC.nodes[k] = els.map((el) => {
    const ph = document.createComment("sp");
    el.parentNode.insertBefore(ph, el);
    el.hidden = false;
    body.appendChild(el);
    return [el, ph];
  });
  if (k === "sync") {
    try {
      renderSyncInfo();
    } catch (e) {}
  }
}
function accUnmount(k) {
  (ACC.nodes[k] || []).forEach(([el, ph]) => {
    el.hidden = true;
    if (ph.parentNode) ph.replaceWith(el);
  });
  delete ACC.nodes[k];
}
function accRestoreAll() {
  Object.keys(ACC.nodes).forEach(accUnmount);
}
const accHasBody = (k) => !["dark", "wiz", "weiter"].includes(k);
function accItem(k) {
  const open = ACC.open.has(k),
    col = themeCol(ACC_COL[k] || "#1a7a5c"),
    dark = document.documentElement.dataset.theme === "dark";
  const right =
    k === "dark"
      ? `<button class="tg ${dark ? "on" : ""}" data-qdark="1" role="switch" aria-checked="${dark}" aria-label="Dunkelmodus"></button>`
      : k === "wiz"
        ? `<button class="btn small" data-qwiz="1">Starten</button>`
        : k === "weiter"
          ? `<button class="btn small" data-invopen="1">Öffnen</button>`
          : `<span class="sach">${svgIcon(open ? "up" : "down", 18)}</span>`;
  const head = `<span class="saic" style="background:${col}">${svgIcon(accIcon(k), 18)}</span><span class="sat"><b>${escHtml(accTitle(k))}</b><small data-accsub="${k}">${escHtml(accSub(k))}</small></span>${right}`;
  return `<div class="sacc ${open ? "open" : ""}" data-acc="${k}">${accHasBody(k) ? `<button class="sahd" data-acctg="${k}" aria-expanded="${open}">${head}</button><div class="sabody" id="sab-${k}" ${open ? "" : "hidden"}></div>` : `<div class="sahd">${head}</div>`}</div>`;
}
function accBuild() {
  accRestoreAll();
  const list = $("setList");
  if (!list) return;
  const q = ACC.q.trim().toLowerCase();
  if (q) {
    const hits = [];
    for (const [t] of ACC_TABS)
      for (const k of accTabKeys(t)) {
        const txt = (
          accTitle(k) +
          " " +
          accSub(k) +
          " " +
          liveSp(k)
            .map((el) => el.textContent)
            .join(" ")
        ).toLowerCase();
        if (txt.includes(q)) hits.push([t, k]);
      }
    list.innerHTML = hits.length
      ? `<div class="sgl">${hits.length} ${hits.length === 1 ? "Treffer" : "Treffer"}</div>` +
        hits
          .map(
            ([t, k]) =>
              `<button class="sahit" data-accgo="${k}"><span class="saic" style="background:${themeCol(ACC_COL[k] || "#1a7a5c")}">${svgIcon(accIcon(k), 16)}</span><span class="sat"><b>${escHtml(accTitle(k))}</b><small>${escHtml((ACC_TABS.find((x) => x[0] === t) || [, ""])[1])}</small></span><span class="sach">${svgIcon("right", 16)}</span></button>`
          )
          .join("")
      : `<p class="small muted" style="text-align:center;margin:24px 0">Nichts gefunden für „${escHtml(ACC.q)}“.</p>`;
    ACC.built = "q:" + q;
    return;
  }
  const ks = accTabKeys(ACC.tab);
  list.innerHTML =
    ks.map(accItem).join("") +
    (ACC.tab === "hilfe"
      ? `<div class="appfoot"><b>Finanz MAMI</b><span>Die App, die sich um dich kümmert</span><small>${escHtml(verFull())}</small></div>`
      : "");
  ks.filter((k) => ACC.open.has(k) && accHasBody(k)).forEach(accMount);
  ACC.built = ACC.tab;
}
/* Handy */
const PH_SYNC = () => accTabKeys("sicherheit").includes("sync");
const phPageKeys = (k) => (k === "geraete" && PH_SYNC() ? ["sync", "geraete"] : [k]);
const phTitle = (k) =>
  k === "geraete" && PH_SYNC() ? "Geräte & Abgleich" : k === "sicherheit" ? "App-Sperre & Sicherheit" : accTitle(k);
const PH_GROUPS = () => [
  ["Geld", "#6b8e23", accTabKeys("geld")],
  ["Anpassen", "#1a7a5c", accTabKeys("anpassen").filter((k) => k !== "dark")],
  ["Sicherheit & Geräte", "#3d63a8", accTabKeys("sicherheit").filter((k) => k !== "sync" && k !== "notify")],
  ["Hilfe", "#c27c0e", accTabKeys("hilfe")],
];
const CHEV = '<svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="m9 6 6 6-6 6"/></svg>';
function phRow(k, c) {
  const col = themeCol(ACC_COL[k] || c);
  const act = k === "wiz" ? `data-qwiz="1"` : k === "weiter" ? `data-invopen="1"` : `data-accgo="${k}"`;
  return `<button class="phr" ${act}><span class="saic" style="background:${col}">${svgIcon(accIcon(k), 18)}</span><span class="sat"><b>${escHtml(phTitle(k))}</b><small data-accsub="${k}">${escHtml(accSub(k))}</small></span><span class="phch">${CHEV}</span></button>`;
}
function quickSw() {
  const dark = document.documentElement.dataset.theme === "dark",
    sec = lsGet("hb-scrsec") !== "0",
    nf = CAN_NOTIFY && !!notifyCfg().on,
    lg = store.settings.logos === true;
  return [
    ...(IS_TAB ? [] : [["dark", "Dunkel", dark, dark ? "an" : "aus"]]),
    ...(CAN_NOTIFY ? [["notify", "Erinnerungen", nf, nf ? "an" : "aus"]] : []),
    ...(window.AndroidBridge && typeof window.AndroidBridge.setSecure === "function"
      ? [["secure", "Bildschirmschutz", sec, sec ? "keine Screenshots" : "aus"]]
      : []),
    ["sound", "Töne", SND.on(), SND.on() ? "an" : "aus"],
    ["logos", "Läden-Logos laden", lg, lg ? "an" : "aus"],
  ];
}
let QS_N = 0;
function qsIcon(k) {
  const u = "qs" + ++QS_N;
  if (k === "dark")
    return `<svg viewBox="0 0 24 24" class="qsm"><defs><mask id="${u}"><rect x="-10" y="-10" width="44" height="44" fill="#fff"/><circle class="bite" cx="30" cy="-6" r="7" fill="#000"/></mask></defs><g mask="url(#${u})"><circle class="core" cx="12" cy="12" r="5"/></g><g class="rays"><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></g></svg>`;
  if (k === "notify")
    return `<svg viewBox="0 0 24 24"><g class="bell"><path d="M12 3a6 6 0 0 0-6 6c0 5-2 6.5-2 6.5h16S18 14 18 9a6 6 0 0 0-6-6z"/><circle cx="12" cy="19" r="2.2"/></g><line class="slash" x1="3" y1="3" x2="21" y2="21"/></svg><span class="note">♪</span><span class="note n2">♫</span><span class="note n3">♪</span>`;
  if (k === "sound")
    return `<svg viewBox="0 0 24 24"><path class="spk" d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path class="w1" d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path class="w2" d="M18 6.8a7.4 7.4 0 0 1 0 10.4"/><line class="slash" x1="16" y1="9" x2="21.5" y2="15"/><line class="slash s2" x1="21.5" y1="9" x2="16" y2="15"/></svg>`;
  if (k === "secure")
    return `<svg viewBox="0 0 24 24"><path class="l" d="M12 2 4 5v6c0 5 3.4 9.3 8 11V2z"/><path class="r" d="M12 2l8 3v6c0 5-3.4 9.3-8 11V2z"/><path class="ck" d="M8.5 12.2l2.4 2.4 4.6-4.8"/></svg>`;
  return `<svg viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="12" rx="1.5" class="wall"/><rect class="win" x="6.5" y="12" width="5" height="4" rx=".6"/><rect x="13.5" y="12" width="4" height="9" rx=".6" class="door"/><path class="aw" d="M3 9l2-5h14l2 5c0 1.3-1.2 2-2.3 2s-2.2-.7-2.2-2c0 1.3-1.1 2-2.2 2S12 10.3 12 9c0 1.3-1.1 2-2.2 2S7.5 10.3 7.5 9c0 1.3-1.1 2-2.2 2S3 10.3 3 9z"/><g class="shut"><rect x="4" y="9" width="16" height="12"/><path d="M4 12h16M4 15h16M4 18h16"/></g></svg><span class="sign">24</span>`;
}
const qsText = (k, on) =>
  k === "dark" ? [on ? "Dunkel" : "Hell", on ? "Tippen für Hell" : "Tippen für Dunkel"] : null;
function qsTile([k, l, on, sub]) {
  const t = qsText(k, on) || [l, sub];
  return `<button class="qs ${on ? "on" : ""}" data-phsw="${k}" role="switch" aria-checked="${on}" aria-label="${escHtml(l)}"><span class="qtop"><span class="qic qi-${k}">${qsIcon(k)}</span><span class="qtg"><i>${k === "dark" ? qsIcon("dark") : `<b class="v">✓</b><b class="x">✕</b>`}</i></span></span><span class="qtx"><b>${escHtml(t[0])}</b><small>${escHtml(t[1])}</small></span></button>`;
}
/* Hell/Dunkel wie am PC: sofort umschalten, die neue Farbe wächst als Kreis vom Knopf aus */
function themeFlip(t, x, y, el) {
  SND.play("glide");
  const apply = () => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("hb-theme", t);
    } catch (_) {}
    try {
      renderDarkBtn();
    } catch (_) {}
    try {
      render();
    } catch (_) {}
  };
  if (el && el.animate && !reducedMotion())
    el.animate(
      [
        {
          transform: "rotate(0) scale(1)",
        },
        {
          transform: "rotate(-25deg) scale(.86)",
          offset: 0.4,
        },
        {
          transform: "rotate(0) scale(1)",
        },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(.3,.7,.3,1)",
      }
    );
  if (document.startViewTransition && !reducedMotion()) {
    const vt = document.startViewTransition(apply);
    vt.ready
      .then(() => {
        const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`],
          },
          {
            duration: 650,
            easing: "cubic-bezier(.4,0,.2,1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      })
      .catch(() => {});
  } else apply();
}
const SND_ST = [
  ["sanft", "Sanft", "Weich wie ein Xylofon aus Holz"],
  ["glas", "Glas", "Hell und klar wie ein kleines Glöckchen"],
  ["holz", "Holz", "Kurz und trocken, wie ein Klopfen"],
];
function sndSet(on, tile) {
  try {
    localStorage.setItem("hb-snd", on ? "1" : "0");
  } catch (_) {}
  if (on) {
    SND.last = {};
    SND.play("income", true);
  }
  renderSndEd();
  if (!tile)
    try {
      renderSetHome();
    } catch (_) {}
}
function renderSndEd() {
  const el = $("sndEd");
  if (!el) return;
  const on = SND.on(),
    st = SND.style(),
    v = SND.vol() < 1 ? "leise" : "normal";
  el.innerHTML = `<div class="sndhd"><span class="sndic ${on ? "on" : ""}" aria-hidden="true">${qsIcon("sound")}</span><span class="grow"><b>Töne in der App</b><small>${on ? "Leise Klänge beim Speichern, Abhaken und bei Mami" : "Die App bleibt still"}</small></span><button class="tg ${on ? "on" : ""}" data-sndtg role="switch" aria-checked="${on}" aria-label="Töne in der App"></button></div>
  <div class="sndbody ${on ? "" : "off"}"><div class="sndlbl">Klang</div><div class="sndst" role="radiogroup" aria-label="Klang">${SND_ST.map(([k, l, d], i) => `<button class="${k === st ? "on" : ""}" role="radio" aria-checked="${k === st}" data-sndst="${k}" style="--i:${i}" ${on ? "" : "disabled"}><span class="sndw" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><b>${escHtml(l)}</b><small>${escHtml(d)}</small></button>`).join("")}</div>
  <div class="sndlbl">Lautstärke</div><div class="seg sndvol">${[
    ["leise", "Leise"],
    ["normal", "Normal"],
  ]
    .map(
      ([k, l]) =>
        `<button class="${k === v ? "on" : ""}" data-sndvol="${k}" ${on ? "" : "disabled"}>${escHtml(l)}</button>`
    )
    .join("")}</div>
  <p class="small muted sndnote">Töne gibt es dort, wo etwas passiert: Speichern, Abhaken, Ziele, Löschen und Rückgängig, Seitenwechsel, Plus-Menü, Kassenbon, Import, Koppeln, Rückblick, Hinweise und Mami. Ist dein Handy auf lautlos oder Vibration, bleibt die App still.</p></div>`;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-sndtg]")) {
    const on = !SND.on();
    sndSet(on);
    const ic = document.querySelector("#sndEd .sndic");
    if (ic && on) {
      ic.classList.add("ring");
      setTimeout(() => ic.classList.remove("ring"), 1400);
    }
    return;
  }
  const a = e.target.closest("[data-sndst]");
  if (a) {
    try {
      localStorage.setItem("hb-sndst", a.dataset.sndst);
    } catch (_) {}
    renderSndEd();
    const b = document.querySelector(`#sndEd [data-sndst="${a.dataset.sndst}"]`);
    if (b) {
      b.classList.add("play");
      setTimeout(() => b.classList.remove("play"), 900);
    }
    SND.last = {};
    SND.play("done", true);
    try {
      renderSetHome();
    } catch (_) {}
    return;
  }
  const vb = e.target.closest("[data-sndvol]");
  if (vb) {
    try {
      localStorage.setItem("hb-sndvol", vb.dataset.sndvol);
    } catch (_) {}
    renderSndEd();
    SND.last = {};
    SND.play("save", true);
    try {
      renderSetHome();
    } catch (_) {}
    return;
  }
});
function quickToggle(k, btn) {
  if (btn) {
    const on = !btn.classList.contains("on");
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-checked", String(on));
    const t = qsText(k, on) || [null, k === "secure" ? (on ? "keine Screenshots" : "aus") : on ? "an" : "aus"];
    if (t[0]) btn.querySelector(".qtx b").textContent = t[0];
    btn.querySelector(".qtx small").textContent = t[1];
    if (k === "notify" && on) {
      btn.classList.add("qring");
      setTimeout(() => btn.classList.remove("qring"), 2400);
    }
    if (k === "sound") {
      sndSet(on, true);
      if (on) {
        btn.classList.add("qring");
        setTimeout(() => btn.classList.remove("qring"), 1400);
      }
      return;
    }
    if (k === "dark") {
      const kn = btn.querySelector(".qtg i") || btn,
        r = kn.getBoundingClientRect();
      themeFlip(on ? "dark" : "light", r.left + r.width / 2, r.top + r.height / 2, kn);
      return;
    }
    setTimeout(() => quickToggle(k), 250);
    return;
  }
  if (k === "dark") {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("hb-theme", t);
    } catch (_) {}
    try {
      render();
    } catch (_) {}
    return;
  }
  if (k === "notify") {
    const c = notifyCfg();
    if (c.on) {
      c.on = false;
      notifySave(c);
      toast("Erinnerungen aus");
    } else {
      c.on = true;
      notifySave(c);
      try {
        AndroidBridge.notifyAsk();
        if (AndroidBridge.desktop) window.hbNotifyPerm(true);
      } catch (_) {}
      toast("Erinnerungen an");
    }
  } else if (k === "secure") {
    const on = lsGet("hb-scrsec") === "0";
    try {
      localStorage.setItem("hb-scrsec", on ? "1" : "0");
    } catch (_) {}
    try {
      window.AndroidBridge.setSecure(on);
    } catch (_) {}
    toast(on ? "Bildschirmschutz an" : "Bildschirmschutz aus – Screenshots sind jetzt möglich");
  } else if (k === "logos") {
    store.settings.logos = !(store.settings.logos === true);
    saveSettings();
    toast(store.settings.logos ? "Läden-Logos werden online geladen" : "Läden-Logos nur noch eingebaute");
  }
  try {
    const sl = $("sLogos");
    if (sl) sl.checked = store.settings.logos === true;
    const mf = $("sMoneyFx");
    if (mf) mf.checked = store.settings.moneyFx !== false;
  } catch (_) {}
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-phsw]");
  if (b) quickToggle(b.dataset.phsw, b);
});
function phHomeHtml() {
  const n = String(store.settings.name || "").trim(),
    p = store.settings.photo,
    f = devForm(),
    dark = document.documentElement.dataset.theme === "dark";
  const av = p ? `<img src="${escHtml(p)}" alt="">` : n ? `<b>${escHtml(n[0].toUpperCase())}</b>` : devIc(f, 26);
  const q = quickSw().map(qsTile);
  return `<div class="card phprof"><button class="phav" data-spgo="profil" aria-label="Profil">${av}<span class="avdev">${devIc(f, 11)}</span></button><div class="sat"><b>${escHtml(n || devModel())}</b><small>${escHtml([n ? devModel() : "", verFull()].filter(Boolean).join(" · "))}</small></div><button class="btn small" data-spgo="profil">Profil</button></div>
    <div class="phqs">${q.join("")}</div>
    ${PH_GROUPS()
      .map(
        ([g, c, ks]) =>
          `<div class="card phg" style="--gc:${c}"><h3><span class="saic" style="background:${c}">${svgIcon(accIcon(ks[0]), 15)}</span>${escHtml(g)}</h3>${ks.map((k) => phRow(k, c)).join("")}</div>`
      )
      .join("")}
    <div class="appfoot"><b>Finanz MAMI</b><span>Die App, die sich um dich kümmert</span><small>${escHtml(verFull())}</small></div>`;
}
function phSetRender(el) {
  if (ACC.page) {
    const k = ACC.page;
    if (el.dataset.page !== k) {
      accRestoreAll();
      el.dataset.page = k;
      const col = themeCol(ACC_COL[k] || "#1a7a5c");
      el.innerHTML = `<button class="phback" data-phback="1"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="m15 6-6 6 6 6"/></svg> Einstellungen</button>
        <div class="phph"><span class="saic" style="background:${col}">${svgIcon(accIcon(k), 20)}</span><h2>${escHtml(phTitle(k))}</h2></div>${phPageKeys(
          k
        )
          .map((x) => `<div class="sabody phbody" id="sab-${x}"></div>`)
          .join("")}`;
      ACC.nodes = {};
      phPageKeys(k).forEach((x) => accMount(x));
      window.scrollTo({
        top: 0,
      });
    }
    return;
  }
  if (el.dataset.page !== "home" || !$("setQ")) {
    accRestoreAll();
    el.dataset.page = "home";
    el.innerHTML = `<div class="settop"><label class="setsrch"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><input id="setQ" type="search" placeholder="Einstellung suchen …" autocomplete="off" aria-label="Einstellung suchen"></label></div><div id="phHome"></div><div id="setList"></div>`;
    ACC.built = "";
  }
  const q = ACC.q.trim();
  $("phHome").hidden = !!q;
  $("setList").hidden = !q;
  if (q) {
    if (ACC.built !== "q:" + q.toLowerCase()) accBuild();
    return;
  }
  $("phHome").innerHTML = phHomeHtml();
}
function phPageClose() {
  accRestoreAll();
  ACC.page = null;
  const el = $("setHome");
  if (el) el.dataset.page = "";
  renderSetHome();
  window.scrollTo({
    top: 0,
  });
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-phback]")) phPageClose();
});
var PH_SET = true; /* Einstellungen am PC wie am Handy */
function renderSetHome() {
  const el = $("setHome");
  if (!el) return;
  if (!IS_PC || PH_SET) return phSetRender(el);
  if (!$("setList")) {
    el.innerHTML = `<div class="settop"><label class="setsrch"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><input id="setQ" type="search" placeholder="Einstellung suchen …" autocomplete="off" aria-label="Einstellung suchen"></label><button class="setav" data-spgo="profil" aria-label="Profil" id="setAv"></button></div>
      <div class="settabs" role="tablist" id="setTabs"></div><div id="setList"></div>`;
    ACC.built = "";
  }
  const name = store.settings.name || "",
    av = $("setAv");
  if (av)
    av.innerHTML = store.settings.photo
      ? `<img src="${escHtml(store.settings.photo)}" alt="">`
      : name.trim()
        ? escHtml(name.trim()[0].toUpperCase())
        : svgIcon("user", 20);
  $("setTabs").innerHTML = ACC_TABS.map(
    ([t, l]) =>
      `<button role="tab" data-acctab="${t}" aria-selected="${!ACC.q && ACC.tab === t}" class="${!ACC.q && ACC.tab === t ? "on" : ""}">${l}</button>`
  ).join("");
  const want = ACC.q.trim() ? "q:" + ACC.q.trim().toLowerCase() : ACC.tab;
  if (ACC.built !== want || !$("setList").children.length) accBuild();
  else
    document.querySelectorAll("#setList [data-accsub]").forEach((s) => {
      const t = accSub(s.dataset.accsub);
      if (s.textContent !== t) s.textContent = t;
    });
}
function accGo(k) {
  if (k === "feedback") {
    fbQuickGo();
    return;
  }
  if (k === "profil") {
    spSheetOpen("profil");
    return;
  }
  if (k === "weiter") {
    invOpen();
    return;
  }
  if (!SP_PAGES[k] && !["dark", "wiz"].includes(k)) return;
  if (!IS_PC || PH_SET) {
    if (k === "dark" || k === "wiz") return;
    ACC.q = "";
    ACC.page = k === "sync" ? "geraete" : k;
    if (ui.view !== "more") {
      ui.view = "more";
      render();
    } else renderSetHome();
    return;
  }
  ACC.q = "";
  const q = $("setQ");
  if (q) q.value = "";
  ACC.tab = accTabOf(k);
  if (accHasBody(k)) ACC.open.add(k);
  if (ui.view !== "more") {
    ui.view = "more";
    render();
  }
  ACC.built = "";
  renderSetHome();
  setTimeout(() => {
    const a = document.querySelector(`[data-acc="${k}"]`);
    if (a)
      a.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
  }, 60);
}
document.addEventListener("click", (e) => {
  const tb = e.target.closest("[data-acctab]");
  if (tb) {
    ACC.tab = tb.dataset.acctab;
    ACC.q = "";
    const q = $("setQ");
    if (q) q.value = "";
    renderSetHome();
    window.scrollTo({
      top: 0,
    });
    return;
  }
  const g = e.target.closest("[data-accgo]");
  if (g) {
    accGo(g.dataset.accgo);
    return;
  }
  const h = e.target.closest("[data-acctg]");
  if (h) {
    const k = h.dataset.acctg,
      box = h.closest(".sacc"),
      body = $("sab-" + k);
    if (ACC.open.has(k)) {
      ACC.open.delete(k);
      accUnmount(k);
      if (body) body.hidden = true;
      box.classList.remove("open");
      h.setAttribute("aria-expanded", "false");
      h.querySelector(".sach").innerHTML = svgIcon("down", 18);
    } else {
      ACC.open.add(k);
      if (body) body.hidden = false;
      accMount(k);
      box.classList.add("open");
      h.setAttribute("aria-expanded", "true");
      h.querySelector(".sach").innerHTML = svgIcon("up", 18);
    }
    return;
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "setQ") return;
  ACC.q = e.target.value;
  renderSetHome();
});
function renderSpPages() {
  if (ui.sp && !spsOpen()) {
    const k = ui.sp;
    ui.sp = null;
    if (k === "profil") {
      spSheetOpen("profil");
      return;
    }
    if (SP_PAGES[k]) {
      if (!IS_PC || PH_SET) ACC.page = k === "sync" ? "geraete" : k;
      else {
        ACC.tab = accTabOf(k);
        if (accHasBody(k)) ACC.open.add(k);
        ACC.built = "";
      }
    }
  }
  $("spHead").hidden = true;
  $("setHome").hidden = false;
  const hero = $("spHero");
  if (hero) hero.hidden = true;
  const sk = spsOpen() ? ui.sp : null;
  liveSp().forEach((el) => {
    if (!el.closest(".sabody")) el.hidden = !(sk && el.dataset.sp === sk);
  });
  document.querySelectorAll("#spBody [data-sp]").forEach((el) => (el.hidden = el.dataset.sp !== sk));
  renderSetHome();
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-qwiz]")) {
    const w = $("wizAgain");
    if (w) w.click();
    return;
  }
  if (!e.target.closest("[data-qdark]")) return;
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("hb-theme", t);
  } catch (_) {}
  if ((!IS_PC || PH_SET) && ui.view === "more" && !ACC.page)
    try {
      renderSetHome();
    } catch (_) {}
  const tg = document.querySelector('[data-acc="dark"] .tg');
  if (tg) {
    tg.classList.toggle("on", t === "dark");
    tg.setAttribute("aria-checked", String(t === "dark"));
  }
  renderSetHome();
  try {
    render();
  } catch (_) {}
});
document.addEventListener("change", (e) => {
  if (e.target.id !== "sDark") return;
  const t = e.target.checked ? "dark" : "light";
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("hb-theme", t);
  } catch (_) {}
  renderSetHome();
  if (typeof renderHome === "function")
    try {
      render();
    } catch (_) {}
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-spgo]");
  if (b) {
    accGo(b.dataset.spgo);
    return;
  }
  if (e.target.closest("#spBack")) {
    ui.sp = null;
    renderSpPages();
    window.scrollTo({
      top: 0,
    });
  }
});
var SPS = {
  open: null,
  nodes: [],
};
function spsOpen() {
  return !!(SPS && SPS.open);
}
function spUseSheet() {
  return !matchMedia("(min-width:1000px)").matches;
}
const SHEET_SP = ["profil", "budgets", "abos", "invest", "schulden"];
function spSubRender(k) {
  try {
    if (k === "abos") renderAbos();
    else if (k === "invest") renderInvest();
  } catch (_) {}
}
document.addEventListener("click", (e) => {
  const o = e.target.closest("[data-spopen]");
  if (o) {
    e.preventDefault();
    spSheetOpen(o.dataset.spopen);
  }
});
function spSheetOpen(k) {
  if (!SP_PAGES[k]) return;
  if (!SHEET_SP.includes(k)) {
    ui.sp = null;
    accGo(k);
    return;
  }
  if (k !== "profil" && ui.view !== "more") {
    try {
      renderMore();
    } catch (_) {}
  }
  if (SPS.open) spSheetRestore();
  SPS.open = k;
  ui.sp = k;
  renderSpPages();
  spSubRender(k);
  const body = $("spBody");
  body.innerHTML = "";
  const els = [$("spHero"), ...liveSp(k)].filter((el) => el && !el.hidden);
  SPS.nodes = els.map((el) => {
    const ph = document.createComment("sp");
    el.parentNode.insertBefore(ph, el);
    body.appendChild(el);
    return [el, ph];
  });
  $("spSheetTitle").textContent = SP_PAGES[k][0];
  const bg = $("spBg");
  bg.dataset.k = SPS.open || "";
  bg.querySelector(".sheet").scrollTop = 0;
  bg.hidden = false;
  requestAnimationFrame(() => bg.classList.add("show"));
}
function spSheetRestore() {
  SPS.nodes.forEach(([el, ph]) => {
    if (ph.parentNode) ph.replaceWith(el);
    if (el.id === "v-gemeinsam") el.hidden = ui.view !== "gemeinsam";
  });
  SPS.nodes = [];
}
function gmSheetOpen() {
  if (ui.view === "gemeinsam") {
    ui.view = "home";
    render();
  }
  if (SPS.open && SPS.open !== "gemeinsam") spSheetRestore();
  const gm = $("v-gemeinsam"),
    body = $("spBody");
  if (!gm || !body) return;
  if (SPS.open !== "gemeinsam") {
    body.innerHTML = "";
    const ph = document.createComment("gm");
    gm.parentNode.insertBefore(ph, gm);
    body.appendChild(gm);
    SPS.nodes = [[gm, ph]];
  }
  SPS.open = "gemeinsam";
  gm.hidden = false;
  gm.classList.add("gmsheet");
  renderGemeinsam();
  $("spSheetTitle").textContent = uiText("gm_title");
  const bg = $("spBg");
  bg.dataset.k = SPS.open || "";
  bg.querySelector(".sheet").scrollTop = 0;
  bg.hidden = false;
  requestAnimationFrame(() => bg.classList.add("show"));
}
function spSheetClose() {
  if (!SPS.open) return;
  const bg = $("spBg");
  bg.classList.remove("show");
  setTimeout(() => {
    bg.hidden = true;
    spSheetRestore();
    SPS.open = null;
    ui.sp = null;
    if (ui.view === "more") renderSpPages();
  }, 200);
}
$("spBg").addEventListener("click", (e) => {
  if (e.target === $("spBg") || e.target.closest("[data-spclose]")) spSheetClose();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("spBg").hidden) spSheetClose();
});
const TABDEF = {
  home: ["Haushalt", "#1a7a5c", "home"],
  beruf: ["Beruf", "#c2410c", "case"],
  zukunft: ["Sparen", "#2f6fd0", "piggy"],
  list: ["Buchungen", "#3d63a8", "check"],
  fix: ["Fixkosten", "#c27c0e", "list"],
  shop: ["Einkauf", "#0f8a8a", "cart"],
  year: ["Analyse", "#d14d72", "chart"],
  more: ["Optionen", "#5b6472", "sliders"],
};
const PACK_MAIN = {
  gruen: ["#147A5B", "#2e9c74"],
  ozean: ["#0369a1", "#0891b2"],
  sonne: ["#ea580c", "#db2777"],
  beere: ["#7c3aed", "#be185d"],
  erde: ["#8a5a3a", "#a16207"],
  wald: ["#166534", "#3f6212"],
  nacht: ["#4338ca", "#1e293b"],
  pastell: ["#6b9bd1", "#d17ba6"],
  mono: ["#374151", "#6b7280"],
};
function applyPack() {
  const r = document.documentElement,
    t = (store.settings && store.settings.theme) || "gruen",
    P = PACK_MAIN[t];
  if (!P) {
    r.removeAttribute("data-pack");
    r.style.removeProperty("--pk");
    r.style.removeProperty("--pk2");
    return;
  }
  r.setAttribute("data-pack", t);
  r.style.setProperty("--pk", P[0]);
  r.style.setProperty("--pk2", P[1]);
  packCols()
    .slice(0, 6)
    .forEach((c, i) => r.style.setProperty("--pkc" + i, c));
}
function applyTabColors() {
  const ks = Object.keys(TABDEF);
  applyPack();
  ks.forEach((k, i) => {
    const c = userCol("tab", k) || (isGreen() ? themeCol(TABDEF[k][1], i) : "");
    if (c) document.documentElement.style.setProperty("--pg-" + k, c);
    else document.documentElement.style.removeProperty("--pg-" + k);
  });
  document.querySelectorAll(".tabs .tab[data-go]").forEach((b) => {
    const k = b.dataset.go,
      c = userCol("tab", k) || (isGreen() && TABDEF[k] ? themeCol(TABDEF[k][1], ks.indexOf(k)) : "");
    if (c) b.style.setProperty("--tcol", c);
    else b.style.removeProperty("--tcol");
  });
}
function renderColorEd() {
  const el = $("colorEd");
  if (!el) return;
  let accts = [...new Set([...(ui.acctNames || []), ...accountNames()])];
  if (!accts.length) accts = ["Hauptkonto"];
  const open = ui.colOpen || "";
  const row = (group, key, label, cur, icon, isAcct) => {
    const own = userCol(group, key),
      c = own || cur,
      id = group + "|" + key;
    return `<div class="colrow ${open === id ? "open" : ""}"><button class="colhead" data-colopen="${escHtml(id)}">${isAcct ? `<span class="colcard" style="background:linear-gradient(150deg, ${c}, color-mix(in srgb, ${c} 62%, #000))"></span>` : `<span class="colic" style="background:color-mix(in srgb, ${c} 16%, transparent);color:${c}">${svgIcon(icon, 18)}</span>`}<b>${escHtml(label)}</b>${own ? `<small>eigene Farbe</small>` : ""}<i class="colsw" style="background:${c}"></i></button>
      ${open === id ? colPicker(id, c, isAcct, icon) : ""}</div>`;
  };
  const acctDef = (n) => {
    const i = (ui.acctNames || []).indexOf(n);
    return i > 0 && isGreen() ? acgCol(i - 1) : i > 0 ? "#34413b" : "#1a7a5c";
  };
  el.innerHTML = `<div class="colsec"><h3>Farbpaket</h3><div class="colpkg">${Object.entries(PACKS)
    .map(([k, [n, P]]) => {
      const on = (store.settings.theme || "gruen") === k;
      const g = P ? P.slice(0, 4).join(",") : "#3d63a8,#d14d72,#c27c0e,#7a5bc2";
      return `<button data-cpkg="${k}" aria-pressed="${on}"><i style="background:linear-gradient(90deg,${g})"></i>${n}</button>`;
    })
    .join(
      ""
    )}</div><p class="small muted">Gilt für alle Kacheln und Symbole, die du nicht selbst eingefärbt hast.</p></div>
    <div class="colsec"><h3>Konten</h3><p class="small muted">Die großen Karten oben auf der Startseite.</p>${accts.map((n) => row("acct", n, n, acctDef(n), "wallet", true)).join("")}</div>
    <div class="colsec"><h3>Ausgaben</h3>${cats("ausgabe")
      .map((n) =>
        row(
          "cat",
          "ausgabe|" + n,
          n,
          catColor("ausgabe", n).startsWith("#") ? catColor("ausgabe", n) : cssVar(catColor("ausgabe", n)),
          iconFor("ausgabe", n)
        )
      )
      .join("")}</div>
    <div class="colsec"><h3>Einnahmen</h3>${incCats()
      .map((c) => c.name)
      .map((n) =>
        row(
          "cat",
          "einnahme|" + n,
          n,
          catColor("einnahme", n).startsWith("#") ? catColor("einnahme", n) : cssVar(catColor("einnahme", n)),
          iconFor("einnahme", n)
        )
      )
      .join("")}</div>
    <div class="colsec"><h3>Leiste unten</h3>${Object.entries(TABDEF)
      .map(([k, [l, d, i]], n) => row("tab", k, l, themeCol(d, n), i))
      .join("")}</div>
    <button class="btn" data-colresetall="1" style="margin-top:6px">Alle Farben zurücksetzen</button>`;
}
function hexToHsl(hex) {
  let r = 0,
    g = 0,
    b = 0;
  const m = /^#?([\da-f]{6})$/i.exec(String(hex).trim());
  if (m) {
    const n = parseInt(m[1], 16);
    r = ((n >> 16) & 255) / 255;
    g = ((n >> 8) & 255) / 255;
    b = (n & 255) / 255;
  }
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    l = (mx + mn) / 2;
  let h = 0,
    s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12,
    a = s * Math.min(l, 1 - l),
    f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return (
    "#" +
    [f(0), f(8), f(4)]
      .map((x) =>
        Math.round(x * 255)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}
function colPicker(id, cur, isAcct, icon) {
  if (!ui.colHSL || ui.colHSL.id !== id) {
    const c = cur.startsWith("#") ? cur : cssVar(cur);
    ui.colHSL = {
      id,
      ...hexToHsl(c),
    };
  }
  const { h, s, l } = ui.colHSL,
    rec = (store.settings.colRecent || []).slice(0, 8);
  return `<div class="colpk" data-pk="${escHtml(id)}" style="--h:${h};--s:${s}%;--l:${l}%">
    <div class="pkprev"><span class="pkic">${svgIcon(icon, 20)}</span><span class="pkcard"><b>${isAcct ? "123,00 €" : "Vorschau"}</b></span><code class="pkhex">${hslToHex(h, s, l)}</code></div>
    <label>Farbe<input type="range" min="0" max="360" value="${h}" data-pkk="h" class="pkr pkh"></label>
    <label>Kräftig<input type="range" min="0" max="100" value="${s}" data-pkk="s" class="pkr pks"></label>
    <label>Hell / Dunkel<input type="range" min="8" max="92" value="${l}" data-pkk="l" class="pkr pkl"></label>
    ${rec.length ? `<div class="pkrec"><small>Zuletzt</small>${rec.map((x) => `<button style="background:${x}" data-pkrec="${x}" aria-label="${x}"></button>`).join("")}</div>` : ""}
    <div class="pkbtns"><button class="btn" data-colset="${escHtml(id)}|">Standard</button><button class="btn primary" data-pkok="${escHtml(id)}">Übernehmen</button></div>
  </div>`;
}
function pkUpdate(box) {
  const { h, s, l } = ui.colHSL;
  box.style.setProperty("--h", h);
  box.style.setProperty("--s", s + "%");
  box.style.setProperty("--l", l + "%");
  const x = box.querySelector(".pkhex");
  if (x) x.textContent = hslToHex(h, s, l);
}
document.addEventListener("input", (e) => {
  const r = e.target.closest("[data-pkk]");
  if (!r || !ui.colHSL) return;
  ui.colHSL[r.dataset.pkk] = Number(r.value);
  pkUpdate(r.closest(".colpk"));
});
document.addEventListener("click", (e) => {
  const rc = e.target.closest("[data-pkrec]");
  if (rc && ui.colHSL) {
    Object.assign(ui.colHSL, hexToHsl(rc.dataset.pkrec));
    const box = rc.closest(".colpk");
    box.querySelectorAll("[data-pkk]").forEach((i) => (i.value = ui.colHSL[i.dataset.pkk]));
    pkUpdate(box);
    return;
  }
  const ok = e.target.closest("[data-pkok]");
  if (ok && ui.colHSL) {
    const hex = hslToHex(ui.colHSL.h, ui.colHSL.s, ui.colHSL.l);
    store.settings.colRecent = [hex, ...(store.settings.colRecent || []).filter((x) => x !== hex)].slice(0, 8);
    ui.colOpen = "";
    ui.colHSL = null;
    setUserCol(ok.dataset.pkok, hex);
    toast("Farbe übernommen");
  }
});
function cssVar(v) {
  const m = /var\((--[\w-]+)\)/.exec(v);
  return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || "#888" : v;
}
function exChips() {
  const w = store.settings.work || "beides";
  return extraFor(w)
    .map(
      ([k, t]) =>
        `<button class="fchip" data-exset="${k}" aria-pressed="${hasExtra(k)}">${hasExtra(k) ? "✓ " : ""}${t}</button>`
    )
    .join("");
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-exset]");
  if (!b) return;
  const k = b.dataset.exset,
    cur = store.settings.extra || [];
  setExtra(cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]).then(() => {
    if (typeof renderAmtEd === "function") renderAmtEd();
  });
});
function setUserCol(id, hex) {
  const [group, ...rest] = id.split("|"),
    key = rest.join("|"),
    c = (store.settings.colors = store.settings.colors || {});
  c[group] = c[group] || {};
  if (hex) c[group][key] = hex;
  else delete c[group][key];
  saveSettings();
  applyTabColors();
  renderColorEd();
  if (ui.tedId === id) {
    tedClose();
    if (ui.view === "year") renderYear();
    else if (ui.view === "more") renderSetHome();
  }
}
document.addEventListener("click", (e) => {
  const o = e.target.closest("[data-colopen]");
  if (o) {
    ui.colOpen = ui.colOpen === o.dataset.colopen ? "" : o.dataset.colopen;
    ui.colHSL = null;
    renderColorEd();
    return;
  }
  const s = e.target.closest("[data-colset]");
  if (s) {
    const v = s.dataset.colset,
      i = v.lastIndexOf("|");
    ui.colHSL = null;
    if (!v.slice(i + 1)) ui.colOpen = "";
    setUserCol(v.slice(0, i), v.slice(i + 1));
    return;
  }
  const th = e.target.closest("[data-cpkg]");
  if (th) {
    store.settings.theme = th.dataset.cpkg;
    saveSettings();
    applyTabColors();
    renderColorEd();
    render();
    return;
  }
  if (e.target.closest("[data-colresetall]")) {
    store.settings.colors = {};
    ui.colOpen = "";
    saveSettings();
    applyTabColors();
    renderColorEd();
    toast("Alle Farben wieder Standard");
  }
});
document.addEventListener("change", (e) => {
  const t = e.target.closest("[data-colin]");
  if (t) setUserCol(t.dataset.colin, t.value);
});
/* Kachelfarben */
var TED = {
  year: {},
  more: {},
};
function tedOpen(page, k) {
  const d = TED[page][k];
  if (!d) return;
  const grp = page === "year" ? "ana" : "set",
    id = grp + "|" + k;
  ui.colHSL = null;
  ui.tedId = id;
  $("tcTitle").textContent = d[0];
  $("tcBody").innerHTML = colPicker(id, userCol(grp, k) || d[1], false, d[2]);
  const bg = $("tcBg");
  bg.hidden = false;
  requestAnimationFrame(() => bg.classList.add("show"));
}
function tedClose() {
  const bg = $("tcBg");
  if (bg.hidden) return;
  bg.classList.remove("show");
  ui.tedId = null;
  setTimeout(() => {
    bg.hidden = true;
    $("tcBody").innerHTML = "";
  }, 200);
}
$("tcBg").addEventListener("click", (e) => {
  if (e.target === $("tcBg") || e.target.closest("[data-tcclose]")) tedClose();
});
document.addEventListener(
  "click",
  (e) => {
    const b = e.target.closest("[data-tedit]");
    if (b) {
      ui.tileEdit = b.dataset.tedit || "";
      if (ui.view === "year") renderYear();
      else renderSetHome();
      return;
    }
    if (ui.tileEdit && ui.tileEdit === ui.view) {
      const t = e.target.closest(".tediting [data-tk]");
      if (t) {
        e.preventDefault();
        e.stopImmediatePropagation();
        tedOpen(ui.view, t.dataset.tk);
      }
    }
  },
  true
);
function renderMore() {
  if (!(ui.debtEdit && $("debtCard").contains(document.activeElement) && document.activeElement.tagName !== "BUTTON")) {
    const total = sum(store.debts, (d) => debtState(d).remaining);
    const fxOpts = (sel) =>
      `<option value="">– keine –</option>` +
      fixedSorted()
        .map(
          (f) =>
            `<option value="${escHtml(f.id)}" ${f.id === sel ? "selected" : ""}>${escHtml(f.name)} (${escHtml(fmtEur(f.amount))})</option>`
        )
        .join("");
    if (ui.debtEdit) {
      $("debtCard").innerHTML =
        `<div class="card-head"><h2>Kredite & Schulden bearbeiten</h2><button class="btn primary" id="debtDone">Fertig</button></div>
        <p class="small muted" style="margin:-4px 0 6px">„Stand“ ist der Betrag zum angegebenen Monat. Jede Rate der verknüpften Fixkosten wird ab dann abgezogen – mit Zinssatz teilt die App sie in Zinsen und Tilgung auf. Hast du einen Tilgungsplan der Bank, lade ihn hoch oder trag ihn ein: dann rechnet die App genau damit.</p>
        ${store.debts
          .map((d) => {
            const s = debtState(d),
              plan = debtPlan(d),
              ex = debtExtras(d);
            return `<div class="debt" data-did="${escHtml(d.id)}" style="display:flex;flex-direction:column;gap:10px">
          <div class="field"><label>Art</label><div class="dart">${DEBT_ART.map(([k, l, , e]) => `<button class="${debtArt(d) === k ? "on" : ""}" data-dart="${escHtml(d.id)}|${k}" aria-pressed="${debtArt(d) === k}">${svgIcon(e, 15)}${escHtml(l)}</button>`).join("")}</div></div>
          <div class="grid2"><div class="field"><label for="dn-${escHtml(d.id)}">Name</label><input class="in" id="dn-${escHtml(d.id)}" data-df="name" value="${escHtml(d.name)}"></div><div class="field"><label for="ds-${escHtml(d.id)}">Stand (€)</label><input class="in" id="ds-${escHtml(d.id)}" data-df="start" inputmode="decimal" value="${escHtml(numStr(d.start))}"></div></div>
          <div class="grid2"><div class="field"><label for="dm-${escHtml(d.id)}">Stand vom Monat</label><input class="in" type="month" id="dm-${escHtml(d.id)}" data-df="since" value="${escHtml(d.since || "")}"></div><div class="field"><label for="df-${escHtml(d.id)}">Rate aus Fixkosten</label><select class="in" id="df-${escHtml(d.id)}" data-df="fixedId">${fxOpts(d.fixedId)}</select></div></div>
          <div class="grid2"><div class="field"><label for="dz-${escHtml(d.id)}">Zinssatz (% im Jahr)</label><input class="in" id="dz-${escHtml(d.id)}" data-df="zins" inputmode="decimal" placeholder="0 = zinslos" value="${d.zins ? escHtml(numStr(d.zins)) : ""}"></div><div class="field"><label for="de-${escHtml(d.id)}">Laufzeit laut Vertrag bis</label><input class="in" type="month" id="de-${escHtml(d.id)}" data-df="end" value="${escHtml(d.end || "")}"></div></div>
          <div class="field"><label for="do-${escHtml(d.id)}">Ursprünglich geliehen (€)</label><input class="in" id="do-${escHtml(d.id)}" data-df="orig" inputmode="decimal" placeholder="für den Fortschrittsbalken – leer = Stand" value="${d.orig ? escHtml(numStr(d.orig)) : ""}"></div>
          <div class="switch" style="padding:4px 0"><label for="da-${escHtml(d.id)}"><b>Raten auch ohne Abhaken zählen</b><br><span class="small muted">Für Raten, die sicher jeden Monat abgebucht werden</span></label><input type="checkbox" id="da-${escHtml(d.id)}" data-df="auto" ${d.auto ? "checked" : ""}></div>
          <div class="field"><label>Sondertilgungen</label>
            ${ex.length ? ex.map((x, i) => `<div class="meta-row" style="padding:4px 0"><span>${escHtml(x.d ? shortDate(x.d) : "")}${x.note ? " · " + escHtml(x.note) : ""}</span><span style="display:flex;gap:8px;align-items:center"><b>${escHtml(fmtEur(x.a))}</b><button class="icon-btn" data-dexdel="${escHtml(d.id)}|${i}" aria-label="Sondertilgung löschen">×</button></span></div>`).join("") : `<span class="small muted">Noch keine</span>`}
            ${ui.extraAdd === d.id ? `<div class="grid2" style="margin-top:6px"><input class="in" type="date" id="dxd-${escHtml(d.id)}" value="${escHtml(isoOf(new Date()))}" aria-label="Datum"><input class="in" id="dxa-${escHtml(d.id)}" inputmode="decimal" placeholder="Betrag €" aria-label="Betrag"></div><div class="row-btns" style="margin-top:6px"><button class="btn" data-dexcancel="1">Abbrechen</button><button class="btn primary" data-dexsave="${escHtml(d.id)}">Speichern</button></div>` : `<div><button class="chip" data-dexadd="${escHtml(d.id)}" style="margin-top:6px">+ Sondertilgung</button></div>`}
          </div>
          <div class="field"><label>Tilgungsplan</label>
            <span class="small muted">${plan.length ? `${plan.length} Raten von ${escHtml(monthName(plan[0].ym))} bis ${escHtml(monthName(plan[plan.length - 1].ym))} – die App rechnet mit diesem Plan.` : "Kein Plan – die App rechnet selbst mit Rate und Zinssatz."}</span>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="chip" data-dplanload="${escHtml(d.id)}">Plan hochladen (CSV/PDF)</button>${plan.length ? `<button class="chip" data-dplanedit="${escHtml(d.id)}">${ui.planEdit === d.id ? "Plan zuklappen" : "Plan ansehen & ändern"}</button><button class="chip" data-dplandel="${escHtml(d.id)}">Plan löschen</button>` : `<button class="chip" data-dplanmake="${escHtml(d.id)}">Plan selbst eintragen</button>`}</div>
            ${ui.planEdit === d.id && plan.length ? planEditor(d, plan) : ""}
          </div>
          <div><button class="btn danger" data-ddel="${escHtml(d.id)}">Löschen</button></div></div>`;
          })
          .join("")}
        <button class="btn" id="debtAdd" style="margin-top:12px">+ Kredit oder Schuld</button>`;
    } else {
      $("debtCard").innerHTML =
        `<div class="card-head"><h2>Kredite & Schulden</h2><button class="link" id="debtEditBtn">Bearbeiten</button></div>${loanBanner()}
        ${
          store.debts.length
            ? `<div class="eyebrow">Insgesamt offen</div><div style="font-family:var(--f-display);font-weight:800;font-size:30px;letter-spacing:-.03em;margin:2px 0 14px">${escHtml(fmtEur(total))}</div>
        ${store.debts
          .map((d) => {
            const s = debtState(d);
            return `<div class="debt"><div class="debt-top"><span><span class="dartb" title="${escHtml(debtArtName(d))}">${debtArtIcon(d)}</span>${escHtml(d.name)}</span><span>${escHtml(fmtEur(s.remaining))}</span></div><div class="track" style="margin:8px 0 6px;height:9px"><div class="fill" style="width:${s.pct * 100}%;background:var(--accent)"></div></div><div class="small muted">${debtLine(d, s)}</div></div>`;
          })
          .join("")}`
            : emptyState("piggy", "Keine Schulden eingetragen", "")
        }`;
    }
  }
  const st = store.settings,
    y = ui.ym.slice(0, 4);
  $("sStartYear").textContent = y;
  setVal("sStart", st.startBalance && y in st.startBalance ? numStr(st.startBalance[y]) : "");
  setVal("sRate", numStr(st.reserveRate));
  setVal("sKUlimit", numStr(st.kuLimit));
  setVal("sVat", numStr(st.vatRate));
  setVal("sVors", numStr(st.vorsorge));
  setVal("sAbz", numStr(st.abzuege));
  setVal("sPartner", numStr(st.partnerZvE));
  if (!$("sLand").options.length)
    $("sLand").innerHTML = LAENDER.map(([k, n]) => `<option value="${k}">${n}</option>`).join("");
  const ly = (st.lohn || {})[y] || {};
  $("sLohnYear").textContent = "· " + y;
  const lj = lohnYear(y);
  {
    const md = store.settings.mindest || {},
      yy = ui.ym.slice(0, 4),
      v = yearLimits(yy);
    $("sMind").checked = !!md.on;
    $("sMindHF").hidden = !md.on;
    setVal("sMindH", md.h ? numStr(md.h) : "");
    $("sLohnM").disabled = !!md.on;
    $("sMindInfo").textContent =
      md.on && md.h
        ? `${fmt2(v.ml)} € × ${numStr(md.h)} Std. = ${fmtEur(mindestMonat(yy))} im Monat (${yy})${YV[Number(yy) + 1] ? ` · ab ${Number(yy) + 1}: ${fmt2(YV[Number(yy) + 1].ml)} €` : ""}`
        : `${yy}: ${fmt2(v.ml)} € pro Stunde – das Gehalt steigt jedes Jahr automatisch mit`;
  }
  setVal(
    "sLohnM",
    mindestMonat(ui.ym.slice(0, 4)) > 0 ? numStr(mindestMonat(ui.ym.slice(0, 4))) : lj.monat ? numStr(lj.monat) : ""
  );
  setVal("sUrlaub", lj.urlaub ? numStr(lj.urlaub) : "");
  setVal("sWeih", lj.weihnacht ? numStr(lj.weihnacht) : "");
  setVal("sBonus", lj.bonus ? numStr(lj.bonus) : "");
  if (document.activeElement !== $("sLohnN")) $("sLohnN").value = String(lj.n);
  $("sLohnSum").hidden = !(lj.brutto > 0);
  $("sLohnSum").innerHTML =
    lj.brutto > 0
      ? `<span>Bruttolohn ${escHtml(y)}: <b>${escHtml(fmtEur(lj.brutto))}</b>${lj.sonderzahl > 0 ? ` – davon ${escHtml(fmtEur(lj.sonderzahl))} Sonderzahlungen (13. Gehalt, Urlaubsgeld …). Die zählen in voller Höhe in dem Jahr, in dem sie kommen, und werden nicht auf die Monate verteilt.` : ""}</span>`
      : "";
  setVal("sLSt", ly.lst != null && ly.lst !== "" ? numStr(ly.lst) : "");
  setVal("sWK", st.werbungskosten ? numStr(st.werbungskosten) : "");
  setVal("sHebe", st.hebesatz ? numStr(st.hebesatz) : "");
  if (document.activeElement !== $("sKlasse")) $("sKlasse").value = String(st.steuerklasse || 1);
  if (document.activeElement !== $("sKinder")) $("sKinder").value = String(st.kinder || 0);
  if (document.activeElement !== $("sLand")) $("sLand").value = st.land || "NW";
  $("sLogos").checked = st.logos === true;
  $("sMoneyFx").checked = st.moneyFx !== false;
  $("sKirche").checked = !!st.kirche;
  $("sGew").checked = !!st.gewerbe;
  $("hebeField").hidden = !st.gewerbe;
  $("rulesInfo").textContent = rulesInfoText();
  $("backupLoadRow").hidden = !LOCAL;
  renderSyncInfo();
  renderSpaces();
  renderAccounts();
  renderShopEd();
  renderLockEd();
  renderBudgetEd();
  renderHomeEd();
  if (document.activeElement !== $("sName")) $("sName").value = store.settings.name || "";
  $("sKU").checked = !!st.kleinunternehmer;
  $("sSplit").checked = !!st.splitting;
  $("partnerField").hidden = !st.splitting;
  const ymNow = ymOf(new Date()),
    spent = (k, n) =>
      sum(
        store.tx.filter((t) => t.kind === k && t.cat === n && t.date.startsWith(ymNow)),
        (t) => Math.abs(t.amount)
      );
  const xBtn = (k, n) =>
    `<button class="icon-btn" data-catdel="${k}|${escHtml(n)}" aria-label="${escHtml(n)} entfernen"><svg class="i" viewBox="0 0 24 24" style="width:15px;height:15px"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
  $("catMon").textContent = "Ausgaben im " + MONTHS[new Date().getMonth()];
  for (const k of ["ausgabe", "betrieb"]) {
    const list = cats(k),
      vals = list.map((n) => spent(k, n)),
      max = Math.max(1, ...vals);
    $("catEd-" + k).innerHTML =
      list
        .map((n, i) => {
          const c = catColor(k, n);
          return `<div class="crow">${tile(k, n)}<div class="f1"><b>${escHtml(n)}</b><span class="cbar"><i style="width:${Math.round((vals[i] / max) * 100)}%;background:${c}"></i></span></div><span class="camt">${vals[i] ? fmtEur(vals[i]) : "–"}</span>${xBtn(k, n)}</div>`;
        })
        .join("") + `<button class="cadd" data-catadd="${k}">+ Neue Kategorie</button>`;
  }
  $("catEd-einnahme").innerHTML =
    incCats()
      .map(
        (c) =>
          `<div class="crow">${tile("einnahme", c.name)}<div class="f1"><b>${escHtml(c.name)}</b></div><button class="artbtn" data-artpick="${escHtml(c.name)}" aria-label="Art von ${escHtml(c.name)}"><span>${escHtml(artLabel(c.art))}</span>${svgIcon("down", 16)}</button>${xBtn("einnahme", c.name)}</div>`
      )
      .join("") + `<button class="cadd" data-catadd="einnahme">+ Neue Einnahme-Art</button>`;
  const w = store.settings.work || "beides";
  if (document.activeElement !== $("sWork"))
    $("sWork").innerHTML = WGROUPS.map(
      ([g, gt]) =>
        `<optgroup label="${gt}">${WORK.filter((x) => x[3] === g)
          .map(([k, t]) => `<option value="${k}" ${k === w ? "selected" : ""}>${t}</option>`)
          .join("")}</optgroup>`
    ).join("");
  $("sWorkInfo").textContent =
    (WORK.find((x) => x[0] === w) || WORK[3])[2] +
    (!hasJob() && !hasSelf() && !isJobless() ? " – Steuer-Felder sind ausgeblendet." : "") +
    (GPROF[w]
      ? ` – die Startseite zeigt Zahltag${GPROF[w].pots ? ", Töpfe" : ""} und Termine. Einstellungen dazu unter „${GPROF[w].tile}“.`
      : w === "angestellt"
        ? " – Rücklage, Betrieb, Umsatzsteuer und EÜR sind ausgeblendet."
        : w === "selbst"
          ? " – die Felder für Gehalt sind ausgeblendet."
          : "");
  $("sExtra").innerHTML = exChips();
  $("sJobBox").hidden = !hasJob();
  $("sSelfBox").hidden = !hasSelf();
  $("catBetField").hidden = !hasSelf();
  renderNotifyEd();
  renderAutoBk();
  renderSpPages();
}
function txPayee(t) {
  return String(t.note || "").replace(/ · brutto.*$/, "");
}
function spaceMatches() {
  const sp = new Set((store.settings.spaces || []).map(normText));
  return sp.size ? store.tx.filter((t) => t.source === "n26" && sp.has(normText(txPayee(t)))) : [];
}
function renderSpaces() {
  $("spaceEd").innerHTML =
    (store.settings.spaces || [])
      .map(
        (n) =>
          `<span class="chip">${escHtml(n)}<button class="x" data-spdel="${escHtml(n)}" aria-label="${escHtml(n)} entfernen">×</button></span>`
      )
      .join("") + `<button class="chip" id="spAdd">+ Neu</button>`;
  const m = spaceMatches();
  $("spaceClean").innerHTML = m.length
    ? `<div class="notice warn" style="margin-top:6px"><span>${m.length} importierte Buchungen sind Umbuchungen zwischen diesen Konten.</span><button class="btn" id="spClean">Entfernen</button></div>`
    : "";
}
async function cleanSpaces() {
  const m = spaceMatches();
  if (!m.length) return;
  const byDoc = {};
  const single = [];
  for (const t of m) {
    if (t._b) (byDoc[t._b] = byDoc[t._b] || []).push(t.id);
    else single.push(t.id);
  }
  const tasks = Object.entries(byDoc).map(([b, ids]) => () => {
    const items = clone(store.txb[b] || {});
    ids.forEach((id) => delete items[id]);
    return saveDoc("txb", b, {
      items,
    });
  });
  single.forEach((id) => tasks.push(() => deleteDoc("tx", id)));
  try {
    await runLimited(tasks, 4, () => {});
  } catch (e) {
    reportErr(e);
    return;
  }
  store.settings.ignoredKeys = [
    ...new Set([...(store.settings.ignoredKeys || []), ...m.map((t) => t.importKey).filter(Boolean)]),
  ].slice(-5000);
  await saveSettings();
  renderMore();
  toast(`${m.length} Umbuchungen entfernt`);
}
function rulesInfoText() {
  return `${(store.settings.rules || []).length} Empfänger gemerkt, ${(store.settings.ignoredKeys || []).length} Buchungen übersprungen`;
}
function setVal(id, v) {
  const el = $(id);
  if (document.activeElement !== el) el.value = v;
}

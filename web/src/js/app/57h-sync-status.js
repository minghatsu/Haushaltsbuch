/* Abgleich-Status: Punkt oben, Übersicht, Geräte */
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

/* Entwickler: die App als anderes Profil ansehen (Schule, Bürgergeld, Rente …).
   Nur Vorschau – solange sie läuft, wird nichts gespeichert und nichts abgeglichen.
   „Beenden“ lädt die App neu, dann ist alles wie vorher. */
var PV = null;
const PV_WR = `<svg class="i" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L4 16.7 7.3 20l5.3-5.3a4 4 0 0 0 5.1-5.4l-2.4 2.4-2.4-.6-.6-2.4z"/></svg>`;
const pvDev = () => !!((typeof DBG !== "undefined" && DBG.on) || (IS_DESK && updKey()));
const pvTr = (s) => (I18N.tr ? I18N.tr(s) : s);
const pvName = (w) => pvTr((WORK.find((x) => x[0] === w) || [, w])[1]);
function pvPaint() {
  const body = document.querySelector("#pvBg .hobody");
  if (!body) return;
  const sel = ui.pvSel,
    ex = ui.pvEx || [];
  const groups = WGROUPS.map(([g, t]) => {
    const ks = WORK.filter((w) => w[3] === g);
    return `<div class="pvg">${escHtml(pvTr(t))}</div><div class="pvgrid">${ks
      .map(
        ([k, l]) =>
          `<button type="button" class="${k === sel ? "on" : ""}" data-pvw="${k}" aria-pressed="${k === sel}">${escHtml(pvTr(l))}</button>`
      )
      .join("")}</div>`;
  }).join("");
  const extra = extraFor(sel)
    .map(
      ([k, l]) =>
        `<button type="button" class="${ex.includes(k) ? "on" : ""}" data-pvx="${k}" aria-pressed="${ex.includes(k)}">${ex.includes(k) ? svgIcon("check", 14) : ""}${escHtml(pvTr(l))}</button>`
    )
    .join("");
  body.innerHTML = `<p class="pvs">${escHtml(uiText("pv_s"))}</p>${groups}<div class="pvg">${escHtml(uiText("pv_extra"))}</div><div class="pvex">${extra}</div>
    <div class="pvbtns">${PV ? `<button type="button" class="btn" data-pvend="1">${escHtml(uiText("pv_end"))}</button>` : `<button type="button" class="btn" data-hbclose="pvBg">${escHtml(pvTr("Abbrechen"))}</button>`}<button type="button" class="btn pvgo" data-pvgo="1">${PV_WR}${escHtml(uiText("pv_go"))}</button></div>`;
}
function pvOpen() {
  if (!pvDev()) return;
  const cur = PV ? PV.base : store.settings;
  ui.pvSel = PV ? PV.work : store.settings.work || "beides";
  ui.pvEx = PV ? [...PV.extra] : [...(cur.extra || [])];
  try {
    hbSheetClose("devBg");
  } catch (_) {}
  hbSheet("pvBg", uiText("pv_t"));
  pvPaint();
}
async function pvApply(w, ex) {
  if (!PV) PV = { base: clone(store.settings) };
  PV.work = w;
  PV.extra = ex.filter((k) => extraFor(w).some((x) => x[0] === k));
  store.settings = clone(PV.base);
  await setWork(w);
  await setExtra(PV.extra);
  pvBar();
  render();
}
/* Während der Vorschau: nur ein runder Knopf mit dem Werkzeug – Tippen öffnet die Auswahl mit „Beenden“ */
function pvBar() {
  let el = $("pvFab");
  if (!PV) {
    if (el) el.remove();
    document.documentElement.classList.remove("pvon");
    return;
  }
  if (!el) {
    el = document.createElement("button");
    el.type = "button";
    el.id = "pvFab";
    el.className = "pvfab";
    el.dataset.pvopen = "1";
    el.dataset.noi18n = "";
    el.innerHTML = PV_WR;
    document.body.appendChild(el);
  }
  document.documentElement.classList.add("pvon");
  const ex = PV.extra.map((k) => pvTr((EXTRA.find((x) => x[0] === k) || [, k])[1]));
  const t = uiText("pv_on", { n: [pvName(PV.work), ...ex].join(" + ") });
  el.title = t;
  el.setAttribute("aria-label", t);
}
function pvEnd() {
  PV = null;
  try {
    location.reload();
  } catch (_) {}
}
document.addEventListener("click", (e) => {
  const o = e.target.closest("[data-pvopen]");
  if (o) {
    pvOpen();
    return;
  }
  if (e.target.closest("[data-pvend]")) {
    pvEnd();
    return;
  }
  const w = e.target.closest("[data-pvw]");
  if (w) {
    ui.pvSel = w.dataset.pvw;
    ui.pvEx = (ui.pvEx || []).filter((k) => extraFor(ui.pvSel).some((x) => x[0] === k));
    SND.play("tick");
    pvPaint();
    return;
  }
  const x = e.target.closest("[data-pvx]");
  if (x) {
    const k = x.dataset.pvx,
      cur = ui.pvEx || [];
    ui.pvEx = cur.includes(k) ? cur.filter((y) => y !== k) : [...cur, k];
    SND.play("tick");
    pvPaint();
    return;
  }
  if (e.target.closest("[data-pvgo]")) {
    hbSheetClose("pvBg");
    pvApply(ui.pvSel, ui.pvEx || []);
    toast(uiText("pv_on", { n: pvName(ui.pvSel) }));
  }
});
/* Am PC: Strg + Umschalt + P */
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || (e.key || "").toLowerCase() !== "p" || !pvDev()) return;
  e.preventDefault();
  pvOpen();
});

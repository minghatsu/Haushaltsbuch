/* ===== Schnell buchen: Favoriten-Knöpfe auf der Startseite + Vorschläge „wie letztes Mal“ =====
   store.settings.favs = [ { id, n: Name, cat, kind, a: Betrag oder null, pay: "karte"|"bar" } ]
   Mit Betrag bucht ein Tipp sofort (mit Rückgängig), ohne Betrag öffnet sich das Fenster vorausgefüllt. */

const favList = () => (store.settings.favs || []).filter((f) => f && f.cat);
const FAV = { sort: false, ed: null };
/* Alte Kategorie aus der Geschichte, die nicht mehr in der Liste steht: wieder aufnehmen */
function favEnsureCat(kind, cat) {
  if (!cat || cats(kind).includes(cat) || (cgOn(kind) && cgOf(kind, cat))) return;
  const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats);
  if (kind === "einnahme") return;
  c[kind] = [...(c[kind] || []), cat];
  store.settings.cats = c;
  saveSettings();
}
/* ---------- Vorschläge aus der eigenen Geschichte ---------- */
function favSuggest(kind, n) {
  const now = new Date(),
    wd = now.getDay(),
    hr = now.getHours(),
    since = isoOf(new Date(Date.now() - 150 * 864e5)),
    by = {};
  for (const t of store.tx) {
    if (t.kind !== kind || !t.cat || t.date < since || t.sp || isWithdrawCat(t.cat) || t.um) continue;
    const label = (t.note || "").replace(/\s*·.*$/, "").trim().slice(0, 40),
      key = (label.toLowerCase() || "§") + "|" + t.cat;
    const x = (by[key] = by[key] || { label, cat: t.cat, kind, n: 0, wd: 0, hr: 0, last: null, dates: [], pay: {} });
    x.n++;
    const d = new Date(t.date + "T12:00");
    if (d.getDay() === wd) x.wd++;
    if (t.ts && Math.abs(new Date(t.ts).getHours() - hr) <= 2) x.hr++;
    x.dates.push(t.date);
    x.pay[t.pay === "bar" ? "bar" : "karte"] = (x.pay[t.pay === "bar" ? "bar" : "karte"] || 0) + 1;
    if (!x.last || t.date > x.last.date || (t.date === x.last.date && (t.ts || 0) > (x.last.ts || 0))) x.last = t;
  }
  const today = isoToday();
  return Object.values(by)
    .filter((x) => x.n >= 2)
    .map((x) => {
      const ago = Math.max(0, Math.round((new Date(today + "T12:00") - new Date(x.last.date + "T12:00")) / 864e5));
      /* Häufigkeit zählt, aber passender Wochentag und Uhrzeit zählen mehr */
      x.score = Math.log2(x.n + 1) * 2 + (x.wd >= 2 ? (x.wd / x.n) * 6 : 0) + (x.hr >= 2 ? (x.hr / x.n) * 4 : 0) - ago / 14;
      x.dates.sort();
      const gaps = x.dates.slice(1).map((d, i) => Math.round((new Date(d + "T12:00") - new Date(x.dates[i] + "T12:00")) / 864e5)).filter((g) => g > 0);
      const avg = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
      x.why =
        x.wd >= 3 && x.wd >= x.n * 0.6
          ? uiText("fv_every", { d: now.toLocaleDateString(cLoc(), { weekday: "long" }) })
          : gaps.length >= 2 && avg >= 2 && avg <= 45 && gaps.every((g) => Math.abs(g - avg) <= Math.max(2, avg * 0.35))
            ? uiText("fv_gap", { n: String(Math.round(avg)) })
            : ago === 0
              ? uiText("fv_today")
              : uiText("fv_ago", { n: String(ago) });
      x.a = round2(x.last.amount);
      x.payMost = (x.pay.bar || 0) > (x.pay.karte || 0) ? "bar" : "karte";
      return x;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n || 3);
}
/* Im Fenster „Neue Buchung“ */
function favSugRender() {
  const w = $("sugWrap");
  if (!w) return;
  const show = !ui.editId && ["ausgabe", "betrieb", "einnahme"].includes(ui.kind) && !$("fAmount").value && !ui.sugUsed;
  const S = show ? favSuggest(ui.kind, 3) : [];
  w.hidden = !S.length;
  if (!S.length) {
    w.innerHTML = "";
    return;
  }
  const E = escHtml,
    favKeys = new Set(favList().map((f) => (f.n || "").toLowerCase() + "|" + f.cat));
  ui.sugList = S;
  w.innerHTML = `<span class="lbl" data-noi18n>${E(uiText("fv_sug", { d: new Date().toLocaleDateString(cLoc(), { weekday: "long" }), h: String(new Date().getHours()) }))}</span>${S.map(
    (x, i) =>
      `<div class="sugrow ${i === 0 ? "top" : ""}"><button type="button" class="sugb" data-sug="${i}">${tile(x.kind, x.cat)}<span class="grow"><b data-noi18n>${E(x.label ? x.label + " · " + x.cat : x.cat)}</b><small data-noi18n>${E(x.why + " · " + uiText("fv_last", { a: fmtEur(x.a) }))}</small></span><b class="sugv" dir="ltr">${E(fmtEur(x.a))}</b></button>${
        favKeys.has((x.label || x.cat).toLowerCase() + "|" + x.cat) ? "" : `<button type="button" class="sugstar" data-sugfav="${i}" aria-label="${E(uiText("fv_star"))}" title="${E(uiText("fv_star"))}">${svgIcon("spark", 16)}</button>`
      }</div>`
  ).join("")}`;
}
document.addEventListener("click", (e) => {
  const t = e.target.closest && e.target.closest("#sugWrap [data-sug],#sugWrap [data-sugfav]");
  if (!t) return;
  const x = (ui.sugList || [])[Number(t.dataset.sug != null ? t.dataset.sug : t.dataset.sugfav)];
  if (!x) return;
  if (t.dataset.sugfav != null) {
    favAdd({ n: x.label || x.cat, cat: x.cat, kind: x.kind, a: x.a, pay: x.payMost });
    toast(uiText("fv_added", { n: x.label || x.cat }));
    favSugRender();
    return;
  }
  favEnsureCat(x.kind, x.cat);
  $("fAmount").value = numStr(x.a);
  $("fNote").value = x.label || "";
  ui.cat = x.cat;
  ui.pay = x.last.pay === "bar" ? "bar" : "karte";
  if (x.last.acct) ui.acct = x.last.acct;
  ui.sugUsed = true;
  renderSheet();
  try {
    $("fAmount").dispatchEvent(new Event("input", { bubbles: true }));
  } catch (_) {}
  const a = $("fAmount");
  if (a && !reducedMotion()) a.animate([{ background: "var(--accent-soft)" }, { background: "transparent" }], { duration: 700 });
  try {
    SND.play("tick");
  } catch (_) {}
});

/* ---------- Favoriten auf der Startseite ---------- */
const FAV_MAX = 12;
function favAdd(f) {
  if (favList().length >= FAV_MAX) return toast(uiText("fv_full", { n: String(FAV_MAX) }));
  const L = [...favList(), { id: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), n: f.n, cat: f.cat, kind: f.kind || "ausgabe", a: f.a > 0 ? round2(f.a) : null, pay: f.pay || "karte" }];
  store.settings.favs = L;
  saveSettings();
}
function favCard() {
  const L = favList().filter((f) => !simpleOn() || (f.kind || "ausgabe") === "ausgabe"),
    E = escHtml;
  if (!L.length && store.settings.favHide) return "";
  const sug = L.length ? [] : favSuggest("ausgabe", 4);
  const tiles = L.map(
    (f) =>
      `<button type="button" class="favt ${FAV.sort ? "wig" : ""}" data-fav="${E(f.id)}" aria-label="${E(f.n + (f.a ? " " + fmtEur(f.a) : ""))}">${FAV.sort ? `<span class="favh" aria-hidden="true">${svgIcon("dots", 14)}</span>` : ""}${tile(f.kind, f.cat)}<span class="favn" data-noi18n>${E(f.n)}</span><b class="fava" dir="ltr">${f.a ? E(fmtEur(f.a)) : "?"}</b></button>`
  ).join("");
  const empty = !L.length
    ? `<p class="small muted favhint">${E(uiText(sug.length ? "fv_empty_s" : "fv_empty"))}</p>${
        sug.length ? `<div class="favsug">${sug.map((x, i) => `<button type="button" class="cgs" data-favsug="${i}">${svgIcon("plus", 13)} <span data-noi18n>${E((x.label || x.cat) + " " + fmtEur(x.a))}</span></button>`).join("")}</div>` : ""
      }`
    : "";
  FAV.sug = sug;
  return `<div class="card favcard" data-noi18n><div class="card-head"><h2>${headIcon("bolt")}${E(uiText("fv_h"))}</h2>${
    L.length ? `<button type="button" class="link small" data-favsort>${E(uiText(FAV.sort ? "fv_done" : "fv_sort"))}</button>` : ""
  }</div>${L.length ? `<div class="favgrid ${FAV.sort ? "sorting" : ""}" id="favGrid" ${FAV.sort ? "data-noswipe" : ""}>${tiles}${FAV.sort || favList().length >= FAV_MAX ? "" : `<button type="button" class="favt add" data-favnew>${svgIcon("plus", 20)}<span class="favn">${E(uiText("fv_new"))}</span></button>`}</div>` : empty + `<button type="button" class="btn favaddb" data-favnew>${svgIcon("plus", 16)} ${E(uiText("fv_new_l"))}</button>`}${
    L.length && !FAV.sort ? `<p class="small muted favhint">${E(uiText("fv_hint"))}</p>` : ""
  }</div>`;
}
/* Sofort buchen */
async function favBook(f) {
  favEnsureCat(f.kind || "ausgabe", f.cat);
  if (!f.a) {
    openSheet(f.kind || "ausgabe");
    ui.cat = f.cat;
    ui.pay = f.pay || "karte";
    ui.sugUsed = true;
    $("fNote").value = f.n === f.cat ? "" : f.n;
    renderSheet();
    setTimeout(() => $("fAmount").focus({ preventScroll: true }), 80);
    return;
  }
  const doc = { date: isoToday(), amount: round2(f.a), kind: f.kind || "ausgabe", cat: f.cat, note: f.n === f.cat ? "" : f.n, ts: Date.now() };
  if (f.pay === "bar" && cashOn()) doc.pay = "bar";
  if (doc.pay !== "bar" && kaOn()) {
    const a = kaFor(doc.cat);
    if (a && a !== "Hauptkonto") doc.acct = a;
  }
  try {
    cgEnsureCat(doc.kind, doc.cat);
  } catch (_) {}
  const id = mem ? newId() : db.collection("tx").doc().id;
  if (!(await safe(() => saveTxDoc(id, doc, null)))) return;
  try {
    SND.play(budCrossed(doc) ? "warn" : "save");
    navigator.vibrate && navigator.vibrate(12);
  } catch (_) {}
  const el = document.querySelector(`[data-fav="${CSS.escape(f.id)}"]`);
  if (el && !reducedMotion()) el.animate([{ transform: "scale(.92)" }, { transform: "scale(1.04)" }, { transform: "none" }], { duration: 360, easing: "cubic-bezier(.2,.9,.3,1)" });
  toast(uiText("fv_booked", { n: f.n, a: fmtEur(f.a) }), async () => {
    const t = store.tx.find((x) => x.id === id);
    if (t) await safe(() => delTxDoc(t));
    render();
  });
  render();
}
/* Bearbeiten-Fenster */
function favEdit(id, pre) {
  const f = (id && favList().find((x) => x.id === id)) || { id: "", n: "", cat: "", kind: "ausgabe", a: null, pay: "karte", ...(pre || {}) };
  FAV.ed = { ...f };
  favEdRender();
}
function favEdRender() {
  const f = FAV.ed,
    E = escHtml,
    b = hbSheet("favBg", uiText(f.id ? "fv_edit" : "fv_new_l")),
    list = cats(f.kind);
  if (!f.cat) f.cat = list[0] || "";
  b.innerHTML = `<div class="card agcard"><label class="hlf"><span>${E(uiText("fv_name"))}</span><input class="in" id="favN" value="${E(f.n)}" placeholder="${E(uiText("fv_name_ph"))}"></label>
    <label class="hlf"><span>${E(uiText("fv_amt"))}</span><input class="in" id="favA" inputmode="decimal" dir="ltr" value="${f.a ? E(numStr(f.a)) : ""}" placeholder="${E(uiText("fv_amt_ph"))}"></label>
    <label class="hlf"><span>${E(uiText("sp_cat"))}</span><select class="in" id="favC">${list.map((c) => `<option value="${E(c)}" ${c === f.cat ? "selected" : ""}>${E(c)}</option>`).join("")}</select></label>
    <div class="agtabs favpay"><button type="button" class="${f.pay !== "bar" ? "on" : ""}" data-favpay="karte">💳 ${E(uiText("fv_card"))}</button><button type="button" class="${f.pay === "bar" ? "on" : ""}" data-favpay="bar">💶 ${E(uiText("fv_cash"))}</button></div>
    <p class="small muted" style="margin:6px 0 0">${E(uiText("fv_amt_s"))}</p></div>
    <button type="button" class="btn primary block favsave" data-favsave>${E(uiText("ag_az_save"))}</button>
    ${f.id ? `<button type="button" class="link agsetl favdel" data-favdel>${E(uiText("fv_del"))}</button>` : ""}`;
}
document.addEventListener("click", (e) => {
  const t = e.target.closest && e.target.closest("[data-fav],[data-favnew],[data-favsort],[data-favsug],#favBg [data-favpay],#favBg [data-favsave],#favBg [data-favdel]");
  if (!t) return;
  if (t.dataset.fav) {
    if (FAV.sort || FAV.lp) return;
    const f = favList().find((x) => x.id === t.dataset.fav);
    if (f) favBook(f);
  } else if (t.hasAttribute("data-favnew")) favEdit(null);
  else if (t.hasAttribute("data-favsort")) {
    FAV.sort = !FAV.sort;
    render();
  } else if (t.dataset.favsug != null) {
    const x = (FAV.sug || [])[Number(t.dataset.favsug)];
    if (x) {
      favAdd({ n: x.label || x.cat, cat: x.cat, kind: x.kind, a: x.a, pay: x.payMost });
      toast(uiText("fv_added", { n: x.label || x.cat }));
    }
  } else if (t.dataset.favpay) {
    FAV.ed.n = $("favN").value;
    FAV.ed.a = parseAmt($("favA").value) || null;
    FAV.ed.cat = $("favC").value;
    FAV.ed.pay = t.dataset.favpay;
    favEdRender();
  } else if (t.hasAttribute("data-favsave")) {
    const f = FAV.ed,
      n = $("favN").value.trim(),
      a = parseAmt($("favA").value),
      c = $("favC").value;
    if (!c) return;
    const nf = { id: f.id || "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), n: n || c, cat: c, kind: f.kind || "ausgabe", a: a > 0 ? round2(a) : null, pay: f.pay || "karte" };
    const L = favList();
    const i = L.findIndex((x) => x.id === nf.id);
    if (i >= 0) L[i] = nf;
    else if (L.length >= FAV_MAX) return toast(uiText("fv_full", { n: String(FAV_MAX) }));
    else L.push(nf);
    store.settings.favs = L;
    saveSettings();
    hbSheetClose("favBg");
    try {
      SND.play("save");
    } catch (_) {}
  } else if (t.hasAttribute("data-favdel")) {
    store.settings.favs = favList().filter((x) => x.id !== FAV.ed.id);
    saveSettings();
    hbSheetClose("favBg");
  }
});
/* Lange drücken (oder Rechtsklick) = bearbeiten */
document.addEventListener("contextmenu", (e) => {
  const t = e.target.closest && e.target.closest("[data-fav]");
  if (!t) return;
  e.preventDefault();
  if (!FAV.sort) favEdit(t.dataset.fav);
});
document.addEventListener(
  "touchstart",
  (e) => {
    const t = e.target.closest && e.target.closest("[data-fav]");
    if (!t || FAV.sort) return;
    clearTimeout(FAV.lpT);
    FAV.lp = false;
    const p = e.touches[0],
      x0 = p.clientX,
      y0 = p.clientY;
    FAV.lpXY = [x0, y0];
    FAV.lpT = setTimeout(() => {
      FAV.lp = true;
      try {
        navigator.vibrate && navigator.vibrate(12);
      } catch (_) {}
      favEdit(t.dataset.fav);
      setTimeout(() => (FAV.lp = false), 600);
    }, 520);
  },
  { passive: true }
);
document.addEventListener(
  "touchmove",
  (e) => {
    if (!FAV.lpT || !FAV.lpXY) return;
    const p = e.touches[0];
    if (Math.hypot(p.clientX - FAV.lpXY[0], p.clientY - FAV.lpXY[1]) > 10) clearTimeout(FAV.lpT);
  },
  { passive: true }
);
["touchend", "touchcancel"].forEach((ev) => document.addEventListener(ev, () => clearTimeout(FAV.lpT)));

/* Sortieren: im Sortier-Modus Kacheln ziehen (Maus und Finger) */
const FVD = {};
function favDragDown(x, y, el) {
  const r = el.getBoundingClientRect(),
    gh = el.cloneNode(true);
  gh.classList.add("favghost");
  Object.assign(gh.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  document.body.appendChild(gh);
  el.classList.add("favph");
  Object.assign(FVD, { on: true, el, gh, dx: x - r.left, dy: y - r.top, grid: el.parentElement });
}
function favDragMove(x, y) {
  const { gh, el, grid, dx, dy } = FVD;
  gh.style.left = x - dx + "px";
  gh.style.top = y - dy + "px";
  const items = [...grid.querySelectorAll("[data-fav]")].filter((n) => n !== el);
  let before = null;
  for (const n of items) {
    const r = n.getBoundingClientRect();
    if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) {
      before = n;
      break;
    }
  }
  if (el.nextElementSibling !== before) cgFlip(items, () => grid.insertBefore(el, before));
}
function favDragUp() {
  const { gh, el, grid } = FVD;
  gh.remove();
  el.classList.remove("favph");
  FVD.on = false;
  const ids = [...grid.querySelectorAll("[data-fav]")].map((n) => n.dataset.fav),
    L = favList();
  /* ausgeblendete Knöpfe (z. B. Einnahmen im Nur-Ausgaben-Modus) bleiben hinten erhalten */
  store.settings.favs = [...ids.map((id) => L.find((f) => f.id === id)).filter(Boolean), ...L.filter((f) => !ids.includes(f.id))];
  saveSettings();
  try {
    SND.play("tick");
  } catch (_) {}
}
document.addEventListener("pointerdown", (e) => {
  if (!FAV.sort || e.pointerType !== "mouse") return;
  const el = e.target.closest && e.target.closest("#favGrid [data-fav]");
  if (el) {
    e.preventDefault();
    favDragDown(e.clientX, e.clientY, el);
  }
});
document.addEventListener("pointermove", (e) => {
  if (FVD.on && e.pointerType === "mouse") favDragMove(e.clientX, e.clientY);
});
document.addEventListener("pointerup", (e) => {
  if (FVD.on && e.pointerType === "mouse") favDragUp();
});
document.addEventListener(
  "touchstart",
  (e) => {
    if (!FAV.sort) return;
    const el = e.target.closest && e.target.closest("#favGrid [data-fav]");
    if (el) favDragDown(e.touches[0].clientX, e.touches[0].clientY, el);
  },
  { passive: true }
);
document.addEventListener(
  "touchmove",
  (e) => {
    if (!FVD.on) return;
    e.preventDefault();
    favDragMove(e.touches[0].clientX, e.touches[0].clientY);
  },
  { passive: false }
);
["touchend", "touchcancel"].forEach((ev) =>
  document.addEventListener(ev, () => {
    if (FVD.on) favDragUp();
  })
);

/* Sobald ein Betrag getippt wird, Vorschläge ausblenden */
document.addEventListener("input", (e) => {
  if (e.target.id !== "fAmount") return;
  const w = $("sugWrap");
  if (w && e.target.value) w.hidden = true;
});

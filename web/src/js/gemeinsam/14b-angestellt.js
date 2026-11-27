/* ===== Angestellt: Helfer für alle, die ein Gehalt bekommen =====
   - Lohnabrechnung hochladen (ein Knopf)
   - Mami schätzt, ob sich die Steuererklärung lohnt
   - Arbeitszeit & Überstunden und Arbeitsweg teilen sich EINE Tages-Liste:
     store.settings.az = { soll: Stunden/Woche, url: Urlaubstage/Jahr, ot0: Überstunden-Übertrag,
                           d: { "JJJJ-MM-TT": { h: Stunden, t: "b" Betrieb | "h" Homeoffice | "u" Urlaub | "k" krank } } }
     Wer Stunden einträgt, hat damit auch die Arbeitstage für die Pendlerpauschale.
   - Netto-Verlauf aus Lohnabrechnungen oder Gehaltseingängen
   - Extras vom Arbeitgeber, eine Karte nach der anderen */

/* ---------- Tages-Liste ---------- */
function agAz() {
  const a = (store.settings.az = store.settings.az || {});
  a.d = a.d || {};
  return a;
}
const agSoll = () => Number(agAz().soll) || 0;
const agDayTarget = () => agSoll() / 5;
function agSet(iso, v) {
  const d = agAz().d;
  if (!v || (!v.t && !(v.h > 0))) delete d[iso];
  else d[iso] = { ...(v.h > 0 ? { h: round2(v.h) } : {}), t: v.t || "b" };
  clearTimeout(agSet._t);
  agSet._t = setTimeout(() => saveSettings(), 400);
}
function agCount(y, t) {
  let n = 0;
  for (const [iso, v] of Object.entries(agAz().d)) if (iso.startsWith(y + "-") && v.t === t) n++;
  return n;
}
/* Wurden für dieses Jahr schon Tage eingetragen? Dann zählt der Kalender statt der Hand-Zahl */
const agUsed = (y) => Object.keys(agAz().d).some((k) => k.startsWith(y + "-"));
const agHomeDays = (y) =>
  Object.entries(agAz().d)
    .filter(([k, v]) => k.startsWith(y + "-") && v.t === "h")
    .map(([k]) => k);
const agMon = (iso) => {
  const d = new Date(iso + "T12:00"),
    wd = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - wd);
  return isoOf(d);
};
const agWd = (iso) => (new Date(iso + "T12:00").getDay() + 6) % 7;
/* Überstunden-Konto: nur Wochen, in denen etwas eingetragen ist; die laufende Woche anteilig bis heute.
   Urlaub und Krankheit an Werktagen zählen wie ein normaler Arbeitstag. */
function agSaldo() {
  const A = agAz(),
    soll = agSoll();
  if (!soll) return 0;
  const today = isoToday(),
    weeks = {};
  for (const [iso, v] of Object.entries(A.d)) {
    if (iso > today) continue;
    const w = agMon(iso);
    const x = (weeks[w] = weeks[w] || { ist: 0 });
    if (v.t === "u" || v.t === "k") x.ist += agWd(iso) < 5 ? soll / 5 : 0;
    else x.ist += Number(v.h) || 0;
  }
  let s = Number(A.ot0) || 0;
  const curW = agMon(today);
  for (const [w, x] of Object.entries(weeks)) {
    const due = w === curW ? (soll * Math.min(5, agWd(today) + 1)) / 5 : soll;
    s += x.ist - due;
  }
  return round2(s);
}
function agWeekIst(mon) {
  let s = 0;
  for (let i = 0; i < 7; i++) {
    const iso = addDays(mon, i),
      v = agAz().d[iso];
    if (v && v.t !== "u" && v.t !== "k") s += Number(v.h) || 0;
  }
  return round2(s);
}
const agUrlLeft = (y) => (Number(agAz().url) || 0) - agCount(y, "u");
const agH = (h) => {
  const m = Math.round((Number(h) || 0) * 60),
    s = m < 0 ? "−" : "";
  const a = Math.abs(m);
  return "\u2066" + s + Math.floor(a / 60) + ":" + String(a % 60).padStart(2, "0") + " h\u2069";
};
/* Zahl + „h“ als ein Block (sonst springt das Vorzeichen im Arabischen nach hinten) */
const agHd = (h) => "\u2066" + (Math.round((Number(h) || 0) * 10) / 10).toLocaleString(cLoc(), { maximumFractionDigits: 1 }) + " h\u2069";
const agSg = (h) => (h > 0 ? "\u2066+" + agHd(h).slice(1) : agHd(h));

/* ---------- Kacheln und Bereiche auf „Beruf“ ---------- */
const AG_SHARED = /data-anaopen="tax"|data-stbopen|data-bropen|data-hoopen/;
function agTile(icn, title, sub, attr, cls) {
  return areaTile(svgIcon(icn, 22), escHtml(title), escHtml(sub), attr).replace('class="atile"', `class="atile ${cls || ""}"`);
}
function agSlipBtn() {
  return `<button type="button" class="agslip" data-slipup><span class="agsi">${svgIcon("docin", 21)}</span><span class="grow"><b>${escHtml(uiText("ag_slip"))}</b><small>${escHtml(uiText("ag_slip_s"))}</small></span>${svgIcon("plus", 20)}</button>`;
}
/* 1B: Lohnt sich die Steuererklärung? */
function agTaxHint(y) {
  try {
    const T = taxCalc(y),
      W = wkCalc(y),
      P = TAX26.anPausch,
      back = -T.due,
      over = W.total > P;
    if (!(back >= 25) && !over) return "";
    const mx = Math.max(P * 1.35, W.total * 1.05),
      pct = Math.min(100, (W.total / mx) * 100),
      mk = (P / mx) * 100;
    return `<button type="button" class="agtax" data-anaopen="tax"><span class="agtm">${mamiAvatar ? mamiAvatar(null) : ""}</span><span class="grow"><b>${escHtml(
      back >= 25 ? uiText("ag_tx_t", { a: fmtEur0(back) }) : uiText("ag_tx_t2")
    )}</b><small>${escHtml(uiText(over ? "ag_tx_over" : "ag_tx_lst"))}</small><span class="agbar" aria-hidden="true"><i style="width:${pct.toFixed(1)}%"></i><em style="left:${mk.toFixed(1)}%"></em></span><small>${escHtml(
      uiText("ag_tx_bar", { a: fmtEur0(W.total), p: fmtEur0(P) })
    )} · ${escHtml(hasSelf() ? uiText("ag_tx_due", { y: String(Number(y) + 1) }) : uiText("ag_tx_free"))}</small></span></button>`;
  } catch (_) {
    return "";
  }
}
/* Job-Seite: Knopf, Mami-Hinweis, Kacheln. Gibt [Kopf, Kacheln] zurück */
function agJobParts(y) {
  const sl = slipsOf(y).length,
    W = wkCalc(y),
    sal = agSaldo(),
    A = agAz(),
    ex = agExState(),
    nt = agNetSeries(y),
    last = [...nt].reverse().find((x) => x.v > 0),
    tiles = [
      agTile("wallet", uiText("ag_lohn_t"), sl ? uiText("ag_lohn_n", { n: String(sl) }) : uiText("ag_lohn_0"), 'data-anaopen="lohn"'),
      agTile("doc", uiText("ag_wk_t"), uiText("ag_wk_s", { a: fmtEur0(W.total) }), 'data-anaopen="wk"'),
      agTile("clock", uiText("ag_az"), A.soll ? uiText("ag_az_s", { a: agSg(sal) }) : uiText("ag_az_s0"), "data-agaz"),
      agTile("car", uiText("ag_aw"), W.km ? uiText("ag_aw_s", { k: String(W.km), n: String(W.days) }) : uiText("ag_aw_s0"), "data-agaw"),
      agTile("chart", uiText("ag_nt"), last ? uiText("ag_nt_s", { a: fmtEur0(last.v) }) : uiText("ag_nt_s0"), "data-agnt"),
      agTile("gift", uiText("ag_ex"), ex.yes ? uiText("ag_ex_s", { n: String(ex.yes), m: String(AG_EX.length) }) : uiText("ag_ex_s0", { m: String(AG_EX.length) }), "data-agex"),
    ];
  const ask = AG_EX.filter((x) => ex.a[x.k] === "frag");
  const head =
    agSlipBtn() +
    agTaxHint(y) +
    (ask.length
      ? `<button type="button" class="ahint agask" data-agex>${svgIcon("bell", 16)} <span data-noi18n>${escHtml(uiText("ag_ex_ask", { n: ask.map((x) => uiText(x.t)).join(", ") }))}</span></button>`
      : "");
  return [head, tiles];
}
function agShared(list, both) {
  if (!list.length) return "";
  return `<section class="agshared"><h3 class="agsh">${escHtml(uiText(both ? "ag_shared" : "ag_shared1"))}</h3><div class="agrid">${list.join("")}</div></section>`;
}
document.addEventListener("click", (e) => {
  const t = e.target.closest && e.target.closest("[data-slipup],[data-agaz],[data-agaw],[data-agnt],[data-agex]");
  if (!t) return;
  if (t.hasAttribute("data-slipup")) {
    const i = $("slipFile");
    if (i) {
      i.value = "";
      i.click();
    }
  } else if (t.hasAttribute("data-agaz")) agAzOpen();
  else if (t.hasAttribute("data-agaw")) agAwOpen();
  else if (t.hasAttribute("data-agnt")) agNtOpen();
  else if (t.hasAttribute("data-agex")) agExOpen();
  try {
    SND.play("tick");
  } catch (_) {}
});

/* ---------- 5: Arbeitszeit (schnell eintragen + Woche + Monat) ---------- */
const AGZ = { sel: "", tab: "w", h: null, t: null };
function agAzOpen(iso) {
  AGZ.sel = iso || AGZ.sel || isoToday();
  const v = agAz().d[AGZ.sel];
  AGZ.h = v && v.h != null ? v.h : agDayTarget() || 8;
  AGZ.t = v ? v.t : "b";
  agAzRender(true);
}
function agAzSetup() {
  const A = agAz();
  return `<div class="card agcard"><b class="agct">${escHtml(uiText("ag_az_set_t"))}</b>
    <label class="hlf"><span>${escHtml(uiText("ag_az_set_soll"))}</span><input class="in" id="agSoll" inputmode="decimal" value="${A.soll ? escHtml(numStr(A.soll)) : ""}" placeholder="40"></label>
    <label class="hlf"><span>${escHtml(uiText("ag_az_set_url"))}</span><input class="in" id="agUrl" inputmode="numeric" value="${A.url ? escHtml(String(A.url)) : ""}" placeholder="30"></label>
    <label class="hlf"><span>${escHtml(uiText("ag_az_set_ot"))}</span><input class="in" id="agOt0" inputmode="decimal" value="${A.ot0 ? escHtml(numStr(A.ot0)) : ""}" placeholder="0"></label>
    <button type="button" class="btn primary block agj" data-agsetup>${escHtml(uiText("ag_az_set_go"))}</button></div>`;
}
function agAzRender(first) {
  const A = agAz(),
    E = escHtml,
    b = hbSheet("agAzBg", uiText("ag_az_h"));
  if (!A.soll || AGZ.setup) {
    b.innerHTML = agAzSetup();
    return;
  }
  const y = AGZ.sel.slice(0, 4),
    sal = agSaldo(),
    mon = agMon(isoToday()),
    wk = agWeekIst(mon),
    isToday = AGZ.sel === isoToday(),
    lab = fxDate(AGZ.sel, { weekday: "long", day: "numeric", month: "short" });
  const tgt = agDayTarget(),
    presets = [...new Set([tgt, 4, 6, 8].map((x) => round2(x)).filter((x) => x > 0))].slice(0, 4);
  const chip = (attr, txt, on) => `<button type="button" class="agchip ${on ? "on" : ""}" ${attr}>${E(txt)}</button>`;
  const work = AGZ.t === "b" || AGZ.t === "h";
  const editor = `<div class="card agcard agedit"><span class="agk">${E(isToday ? uiText("ag_az_today", { d: lab }) : lab)}</span>
    <div class="agstep"><button type="button" data-agstep="-0.5" aria-label="−30 min" ${work ? "" : "disabled"}>−</button><b>${work ? E(agH(AGZ.h)) : E(uiText(AGZ.t === "u" ? "ag_az_u" : "ag_az_k"))}</b><button type="button" data-agstep="0.5" aria-label="+30 min" ${work ? "" : "disabled"}>+</button></div>
    <div class="agchips">${presets.map((p) => chip(`data-agh="${p}"`, agH(p), work && Math.abs(AGZ.h - p) < 0.01)).join("")}</div>
    <div class="agchips">${chip('data-agt="b"', uiText("ag_az_b"), AGZ.t === "b")}${chip('data-agt="h"', uiText("ag_az_ho"), AGZ.t === "h")}${chip('data-agt="u"', uiText("ag_az_u"), AGZ.t === "u")}${chip('data-agt="k"', uiText("ag_az_k"), AGZ.t === "k")}${
      A.d[AGZ.sel] ? chip("data-agdel", uiText("ag_az_free"), false) : ""
    }</div>
    <button type="button" class="btn primary block agj" data-agsave>${E(uiText("ag_az_save"))}</button></div>`;
  const tabs = `<div class="agtabs" role="tablist"><button type="button" role="tab" aria-selected="${AGZ.tab === "w"}" class="${AGZ.tab === "w" ? "on" : ""}" data-agtab="w">${E(uiText("ag_az_tw"))}</button><button type="button" role="tab" aria-selected="${AGZ.tab === "m"}" class="${AGZ.tab === "m" ? "on" : ""}" data-agtab="m">${E(uiText("ag_az_tm"))}</button></div>`;
  b.innerHTML = `<div class="agacc"><div><b class="${sal >= 0 ? "agpos" : "agneg"}">${E(agSg(sal))}</b><small>${E(uiText("ag_az_over"))}</small></div><div><b>${E(String(agUrlLeft(isoToday().slice(0, 4))))}</b><small>${E(uiText("ag_az_url"))}</small></div><div><b>${E(agHd(wk))}</b><small>${E(uiText("ag_az_week", { s: agHd(A.soll) }))}</small></div></div>
    ${editor}${tabs}<div class="card agcard">${AGZ.tab === "w" ? agWeekHtml(agMon(AGZ.sel)) : agMonthHtml(AGZ.sel.slice(0, 7), "az")}</div>
    <p class="small muted agnote">${E(uiText(AGZ.tab === "m" ? "ag_az_tap" : "ag_az_link"))}</p>
    <button type="button" class="link agsetl" data-agsetupopen>${svgIcon("sliders", 15)} ${E(uiText("ag_az_set_edit"))}</button>`;
  if (first && !reducedMotion())
    try {
      stbAnim(b, ".agacc>div,.agcard,.agtabs");
    } catch (_) {}
}
function agWeekHtml(mon) {
  const tgt = agDayTarget(),
    dn = Array.from({ length: 7 }, (_, i) => fxDate(addDays(mon, i), { weekday: "short" }));
  let max = Math.max(8, tgt * 1.6);
  const days = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(mon, i),
      v = agAz().d[iso] || {};
    const h = v.t === "u" || v.t === "k" ? 0 : Number(v.h) || 0;
    max = Math.max(max, h);
    return { iso, h, t: v.t };
  });
  const wl = fxDate(mon, { day: "numeric", month: "short" }) + " – " + fxDate(addDays(mon, 6), { day: "numeric", month: "short" });
  return `<div class="agwh"><button type="button" class="agnav" data-agwk="-7" aria-label="‹">${svgIcon("chevron", 16)}</button><b>${escHtml(wl)}</b><button type="button" class="agnav r" data-agwk="7" aria-label="›">${svgIcon("chevron", 16)}</button></div>
  <div class="agdays">${days
    .map((d, i) => {
      const over = tgt && d.h > tgt ? ((d.h - tgt) / d.h) * 100 : 0;
      return `<button type="button" class="${d.iso === AGZ.sel ? "sel" : ""}" data-agday="${d.iso}" aria-label="${escHtml(dn[i] + " " + agH(d.h))}"><i class="${d.t === "u" ? "u" : d.t === "k" ? "k" : ""}" style="height:${d.t === "u" || d.t === "k" ? 22 : (d.h / max) * 100}%;--o:${over.toFixed(0)}%"></i><span>${escHtml(dn[i])}</span></button>`;
    })
    .join("")}${tgt ? `<em class="agsoll" style="bottom:calc(22px + ${((tgt / max) * 100 * 0.78).toFixed(1)}%)"></em>` : ""}</div>
  <div class="aglg"><span><i class="j"></i>${escHtml(uiText("ag_az_hrs"))}</span><span><i class="o"></i>${escHtml(uiText("ag_az_ot"))}</span><span><i class="u"></i>${escHtml(uiText("ag_az_u"))}</span></div>`;
}
/* Monatskalender – für Arbeitszeit (Stunden) und Arbeitsweg (Art des Tages) */
function agMonthHtml(ym, mode) {
  const [Y, M] = ym.split("-").map(Number),
    first = new Date(Y, M - 1, 1),
    lead = (first.getDay() + 6) % 7,
    n = new Date(Y, M, 0).getDate(),
    hd = Array.from({ length: 7 }, (_, i) => fxDate(addDays("2026-11-02", i), { weekday: "narrow" }));
  let cells = hd.map((x) => `<span class="aghd">${escHtml(x)}</span>`).join("") + '<span class="agpad"></span>'.repeat(lead);
  for (let d = 1; d <= n; d++) {
    const iso = ym + "-" + pad(d),
      v = agAz().d[iso],
      t = v ? v.t : "",
      sub = !v ? "" : t === "u" ? "U" : t === "k" ? "K" : mode === "az" ? (Math.round((v.h || 0) * 10) / 10).toLocaleString(cLoc()) : t === "h" ? "⌂" : "";
    cells += `<button type="button" class="agc ${t ? "t" + t : ""} ${mode === "az" && iso === AGZ.sel ? "sel" : ""} ${iso === isoToday() ? "now" : ""}" data-${mode === "az" ? "agday" : "agcyc"}="${iso}" aria-label="${escHtml(fxDate(iso, { day: "numeric", month: "long" }))}">${d}${sub ? `<small>${escHtml(sub)}</small>` : ""}</button>`;
  }
  const ml = fxDate(ym + "-01", { month: "long", year: "numeric" });
  return `<div class="agwh"><button type="button" class="agnav" data-agmo="-1" data-mode="${mode}" aria-label="‹">${svgIcon("chevron", 16)}</button><b>${escHtml(ml)}</b><button type="button" class="agnav r" data-agmo="1" data-mode="${mode}" aria-label="›">${svgIcon("chevron", 16)}</button></div><div class="agcal">${cells}</div>`;
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (!t.closest || !t.closest("#agAzBg,#agAwBg")) return;
  const q = (s) => t.closest(s);
  let x;
  if (q("[data-agsetupopen]")) {
    AGZ.setup = 1;
    agAzRender();
    return;
  }
  if (q("[data-agsetup]")) {
    const A = agAz(),
      soll = parseAmt($("agSoll").value);
    if (!(soll > 0 && soll <= 80)) {
      toast(uiText("ag_az_set_soll"));
      return;
    }
    A.soll = round2(soll);
    A.url = Math.max(0, Math.round(parseAmt($("agUrl").value) || 0));
    A.ot0 = round2(parseAmt($("agOt0").value) || 0);
    AGZ.setup = 0;
    saveSettings();
    agAzOpen();
    return;
  }
  if ((x = q("[data-agstep]"))) {
    AGZ.h = Math.max(0, Math.min(24, round2((AGZ.h || 0) + Number(x.dataset.agstep))));
    if (AGZ.t !== "h") AGZ.t = "b";
    agAzRender();
    return;
  }
  if ((x = q("[data-agh]"))) {
    AGZ.h = Number(x.dataset.agh);
    if (AGZ.t !== "h") AGZ.t = "b";
    agAzRender();
    return;
  }
  if ((x = q("[data-agt]"))) {
    AGZ.t = x.dataset.agt;
    if ((AGZ.t === "b" || AGZ.t === "h") && !(AGZ.h > 0)) AGZ.h = agDayTarget() || 8;
    agAzRender();
    return;
  }
  if (q("[data-agdel]")) {
    agSet(AGZ.sel, null);
    AGZ.h = agDayTarget() || 8;
    AGZ.t = "b";
    agAzRender();
    agRefresh();
    return;
  }
  if (q("[data-agsave]")) {
    agSet(AGZ.sel, AGZ.t === "u" || AGZ.t === "k" ? { t: AGZ.t } : { h: AGZ.h, t: AGZ.t });
    toast(uiText("ag_az_saved"));
    try {
      SND.play("save");
    } catch (_) {}
    agAzRender();
    agRefresh();
    return;
  }
  if ((x = q("[data-agtab]"))) {
    AGZ.tab = x.dataset.agtab;
    agAzRender();
    return;
  }
  if ((x = q("[data-agwk]"))) {
    agAzOpen(addDays(AGZ.sel, Number(x.dataset.agwk)));
    return;
  }
  if ((x = q("[data-agmo]"))) {
    const base = x.dataset.mode === "aw" ? AGW.ym + "-01" : AGZ.sel.slice(0, 7) + "-01",
      d = new Date(base + "T12:00");
    d.setMonth(d.getMonth() + Number(x.dataset.agmo));
    if (x.dataset.mode === "aw") {
      AGW.ym = isoOf(d).slice(0, 7);
      agAwRender();
    } else agAzOpen(isoOf(d));
    return;
  }
  if ((x = q("[data-agday]"))) {
    agAzOpen(x.dataset.agday);
    const s = document.querySelector("#agAzBg .hobody");
    if (s) s.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    return;
  }
  /* Arbeitsweg: Tag antippen = Betrieb → Homeoffice → Urlaub → Krank → frei */
  if ((x = q("[data-agcyc]"))) {
    const iso = x.dataset.agcyc,
      v = agAz().d[iso],
      order = ["", "b", "h", "u", "k"],
      nx = order[(order.indexOf(v ? v.t : "") + 1) % order.length];
    agSet(iso, nx ? { t: nx, h: nx === "b" || nx === "h" ? (v && v.h) || agDayTarget() || 0 : 0 } : null);
    agAwRender();
    agRefresh();
    try {
      SND.play("tick");
    } catch (_) {}
  }
});
/* Seite „Beruf“ im Hintergrund auffrischen */
function agRefresh() {
  try {
    if (ui.view === "beruf") {
      BG_RENDER = true;
      render();
    }
  } catch (_) {
  } finally {
    BG_RENDER = false;
  }
}

/* ---------- 2C: Arbeitsweg mit Kalender ---------- */
const AGW = { ym: "" };
function agAwOpen() {
  AGW.ym = AGW.ym || String(ui.ym || isoToday()).slice(0, 7);
  agAwRender(true);
}
function agAwRender(first) {
  const ym = AGW.ym,
    y = ym.slice(0, 4),
    W = wkCalc(y),
    E = escHtml,
    b = hbSheet("agAwBg", uiText("ag_aw_h", { y }));
  const cnt = { b: 0, h: 0, u: 0, k: 0 };
  for (const [iso, v] of Object.entries(agAz().d)) if (iso.startsWith(ym + "-") && cnt[v.t] != null) cnt[v.t]++;
  const km = Number(W.km) || 0,
    perDay = Number(y) >= 2026 ? km * 0.38 : Math.min(km, 20) * 0.3 + Math.max(0, km - 20) * 0.38,
    mn = fxDate(ym + "-01", { month: "long" });
  b.innerHTML = `<div class="card agcard"><label class="hlf"><span>${E(uiText("ag_aw_km"))}</span><input class="in" id="agKm" inputmode="decimal" value="${km ? E(numStr(km)) : ""}" placeholder="0"></label></div>
    <div class="card agcard">${agMonthHtml(ym, "aw")}<div class="aglg"><span><i class="j"></i>${E(uiText("ag_aw_lb", { n: String(cnt.b) }))}</span><span><i class="h"></i>${E(uiText("ag_aw_lh", { n: String(cnt.h) }))}</span><span><i class="u"></i>${E(uiText("ag_aw_lu", { n: String(cnt.u) }))}</span>${
      cnt.k ? `<span><i class="k"></i>${E(uiText("ag_aw_lk", { n: String(cnt.k) }))}</span>` : ""
    }</div></div>
    <div class="card agcard"><div class="agrow"><span>${E(uiText("ag_aw_trips", { m: mn }))}</span><b>${E(cnt.b + " × " + numStr(km) + " km")}</b></div><div class="agrow"><span>${E(uiText("ag_aw_pend"))}</span><b>${E(fmtEur(round2(perDay * cnt.b)))}</b></div><div class="agrow"><span>${E(uiText("ag_aw_ho"))}</span><b>${E(fmtEur(round2(cnt.h * 6)))}</b></div><div class="agrow tot"><span>${E(uiText("ag_aw_year", { y }))}</span><b>${E(fmtEur(W.fahrt))}</b></div></div>
    <p class="small muted agnote">${E(uiText("ag_aw_tap"))}</p><p class="small muted agnote">${E(uiText("ag_aw_rule"))}</p>`;
  if (first && !reducedMotion())
    try {
      stbAnim(b, ".agcard");
    } catch (_) {}
}
document.addEventListener("change", (e) => {
  if (e.target.id !== "agKm") return;
  const y = AGW.ym.slice(0, 4),
    v = parseAmt(e.target.value);
  wkSet(y, { km: v > 0 ? round2(v) : 0 }).then(() => {
    agAwRender();
    agRefresh();
  });
});

/* ---------- 3C: Netto im Jahresverlauf ---------- */
function agNetSeries(y) {
  const sl = Object.fromEntries(slipsOf(y).map((s) => [s.ym, s])),
    lc = new Set(
      incCats()
        .filter((c) => c.art === "lohn")
        .map((c) => c.name)
    ),
    cur = ymOf(new Date()),
    out = [];
  for (let m = 1; m <= 12; m++) {
    const ym = y + "-" + pad(m);
    if (ym > cur) break;
    const s = sl[ym];
    let v = 0,
      src = "";
    if (s) {
      v = Number(s.netto) > 0 ? Number(s.netto) : Math.max(0, (Number(s.brutto) || 0) - ["lst", "soli", "kist", "kv", "rv"].reduce((a, k) => a + (Number(s[k]) || 0), 0));
      src = "slip";
    }
    if (!(v > 0)) {
      v = sum(
        store.tx.filter((t) => t.kind === "einnahme" && lc.has(t.cat) && (t.date || "").startsWith(ym)),
        (t) => t.amount
      );
      src = v > 0 ? "tx" : "";
    }
    out.push({ ym, v: round2(v), src, s });
  }
  return out;
}
function agNetFlags(L) {
  const vals = L.filter((x) => x.v > 0)
    .map((x) => x.v)
    .sort((a, b) => a - b);
  if (vals.length < 3) return { med: vals[Math.floor(vals.length / 2)] || 0, f: {} };
  const med = vals[Math.floor(vals.length / 2)],
    lim = Math.max(25, med * 0.02),
    f = {};
  let prev = null;
  for (const x of L) {
    if (x.v > 0 && Math.abs(x.v - med) >= lim) {
      let r = "ag_nt_r_tx";
      if (x.s && prev && prev.s) {
        const d = (k) => (Number(x.s[k]) || 0) - (Number(prev.s[k]) || 0);
        if (Math.abs(d("brutto")) > (Number(prev.s.brutto) || 0) * 0.01) r = d("brutto") > 0 ? "ag_nt_r_bplus" : "ag_nt_r_bminus";
        else if (Math.abs(d("lst")) >= 5) r = "ag_nt_r_lst";
        else if (Math.abs(d("kv") + d("rv")) >= 5) r = "ag_nt_r_sv";
      } else if (x.s) r = x.v > med ? "ag_nt_r_bplus" : "ag_nt_r_lst";
      f[x.ym] = { d: round2(x.v - med), r };
    }
    if (x.v > 0) prev = x;
  }
  return { med, f };
}
function agNtOpen() {
  const y = String(ui.ym || isoToday()).slice(0, 4),
    L = agNetSeries(y),
    F = agNetFlags(L),
    E = escHtml,
    b = hbSheet("agNtBg", uiText("ag_nt_h", { y })),
    last = [...L].reverse().find((x) => x.v > 0);
  if (!last) {
    b.innerHTML = `<div class="card agcard"><p class="small muted" style="margin:0 0 12px">${E(uiText("ag_nt_empty"))}</p>${agSlipBtn()}</div>`;
    return;
  }
  const max = Math.max(...L.map((x) => x.v)) * 1.08,
    lf = F.f[last.ym];
  b.innerHTML = `<div class="card agcard"><span class="agk">${E(uiText("ag_nt_k"))}</span><div class="agbig">${E(fmtEur0(last.v))}</div><small class="${lf ? (lf.d < 0 ? "agneg" : "agpos") : "muted"}">${E(
    lf ? uiText(lf.d < 0 ? "ag_nt_less" : "ag_nt_more", { a: fmtEur0(Math.abs(lf.d)) }) : uiText("ag_nt_same")
  )} · ${E(fxDate(last.ym + "-01", { month: "long" }))}</small>
    <div class="agspark" role="img" aria-label="${E(uiText("ag_nt_h", { y }))}">${L.map((x) => {
      const fl = F.f[x.ym];
      return `<i class="${fl ? (fl.d < 0 ? "dip" : "up") : ""} ${x === last ? "cur" : ""}" style="height:${x.v > 0 ? Math.max(4, (x.v / max) * 100) : 2}%"><em>${E(fxDate(x.ym + "-01", { month: "short" }).replace(".", ""))}</em></i>`;
    }).join("")}</div></div>
    ${
      Object.keys(F.f).length
        ? `<div class="card agcard">${Object.entries(F.f)
            .map(([ym, fl]) => `<div class="agrow"><span>${E(fxDate(ym + "-01", { month: "long" }))}</span><b class="${fl.d < 0 ? "agneg" : "agpos"}">${E((fl.d > 0 ? "+" : "−") + fmtEur0(Math.abs(fl.d)))} · ${E(uiText(fl.r))}</b></div>`)
            .join("")}</div>`
        : ""
    }<p class="small muted agnote">${E(uiText("ag_nt_src"))}</p>${agSlipBtn()}`;
  if (!reducedMotion())
    try {
      stbAnim(b, ".agcard,.agspark i");
    } catch (_) {}
}

/* ---------- 4B: Extras vom Arbeitgeber ---------- */
const AG_EX = [
  { k: "vl", ic: "piggy", t: "ag_x_vl", p: "ag_x_vl_p" },
  { k: "jt", ic: "card", t: "ag_x_jt", p: "ag_x_jt_p" },
  { k: "sb", ic: "gift", t: "ag_x_sb", p: "ag_x_sb_p" },
  { k: "bav", ic: "shield", t: "ag_x_bav", p: "ag_x_bav_p" },
  { k: "rad", ic: "bolt", t: "ag_x_rad", p: "ag_x_rad_p" },
  { k: "ess", ic: "food", t: "ag_x_ess", p: "ag_x_ess_p" },
  { k: "tel", ic: "phone", t: "ag_x_tel", p: "ag_x_tel_p" },
];
function agExState() {
  const a = (store.settings.agEx = store.settings.agEx || {});
  return { a, yes: AG_EX.filter((x) => a[x.k] === "ja").length, done: AG_EX.filter((x) => a[x.k]).length };
}
const AGX = { all: 0 };
function agExOpen() {
  AGX.all = 0;
  agExRender(true);
}
function agExRender(first) {
  const S = agExState(),
    E = escHtml,
    b = hbSheet("agExBg", uiText("ag_ex_h")),
    next = AG_EX.find((x) => !S.a[x.k]);
  if (next && !AGX.all) {
    const i = AG_EX.indexOf(next);
    b.innerHTML = `<p class="small muted agof">${E(uiText("ag_ex_of", { n: String(i + 1), m: String(AG_EX.length) }))}</p>
      <div class="agstack">${i < AG_EX.length - 1 ? '<div class="agcd back"></div>' : ""}<div class="agcd" data-k="${next.k}"><span class="agci">${svgIcon(next.ic, 30)}</span><b>${E(uiText(next.t))}</b><p>${E(uiText(next.p))}</p></div></div>
      <div class="agyn"><button type="button" class="btn" data-agans="nein">${E(uiText("ag_ex_no"))}</button><button type="button" class="btn" data-agans="frag">${svgIcon("bell", 15)} ${E(uiText("ag_ex_ask_b"))}</button><button type="button" class="btn primary agj" data-agans="ja">${E(uiText("ag_ex_yes"))}</button></div>
      ${S.done ? `<button type="button" class="link agsetl" data-agexall>${E(uiText("ag_ex_list"))}</button>` : ""}`;
    if (!reducedMotion()) {
      const c = b.querySelector(".agcd:not(.back)");
      c && c.animate([{ opacity: 0, transform: "translateY(16px) scale(.97)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: "cubic-bezier(.2,.9,.3,1)" });
    }
    return;
  }
  const lbl = { ja: "ag_ex_yes", frag: "ag_ex_ask_b", nein: "ag_ex_no" };
  b.innerHTML = `${next ? "" : `<div class="card agcard agdone"><b>${E(uiText("ag_ex_done_t"))}</b><p class="small muted">${E(uiText("ag_ex_done_p"))}</p></div>`}<div class="card agcard">${AG_EX.map(
    (x) =>
      `<div class="agexr"><span class="agci s">${svgIcon(x.ic, 18)}</span><span class="grow"><b>${E(uiText(x.t))}</b><small>${E(uiText(x.p))}</small></span><span class="agseg">${["ja", "frag", "nein"]
        .map((v) => `<button type="button" class="${S.a[x.k] === v ? "on " + v : ""}" data-agset="${x.k}:${v}">${E(uiText(lbl[v]))}</button>`)
        .join("")}</span></div>`
  ).join("")}</div>`;
  if (first && !reducedMotion())
    try {
      stbAnim(b, ".agcard,.agexr");
    } catch (_) {}
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (!t.closest || !t.closest("#agExBg")) return;
  let x;
  if ((x = t.closest("[data-agans]"))) {
    const c = document.querySelector("#agExBg .agcd:not(.back)");
    if (!c) return;
    agExState().a[c.dataset.k] = x.dataset.agans;
    saveSettings();
    const go = () => {
      agExRender();
      agRefresh();
    };
    if (reducedMotion()) go();
    else {
      const dir = x.dataset.agans === "ja" ? 1 : x.dataset.agans === "nein" ? -1 : 0;
      c.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${dir * 120}%, ${dir ? 0 : -30}px) rotate(${dir * 8}deg)`, opacity: 0 }], { duration: 260, easing: "ease-in", fill: "forwards" }).finished.then(go, go);
    }
    try {
      SND.play(x.dataset.agans === "ja" ? "done" : "tick");
    } catch (_) {}
    return;
  }
  if (t.closest("[data-agexall]")) {
    AGX.all = 1;
    agExRender(true);
    return;
  }
  if ((x = t.closest("[data-agset]"))) {
    const [k, v] = x.dataset.agset.split(":"),
      a = agExState().a;
    a[k] = a[k] === v ? undefined : v;
    if (!a[k]) delete a[k];
    saveSettings();
    AGX.all = 1;
    agExRender();
    agRefresh();
  }
});

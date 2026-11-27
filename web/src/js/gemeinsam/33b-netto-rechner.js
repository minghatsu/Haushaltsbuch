/* ===== Brutto-Netto-Treppe: vom Brutto Schritt für Schritt zum Netto =====
   Steuerklasse, Kinder und Kirche kommen aus den Steuer-Einstellungen (store.settings.steuerklasse/kinder/kirche).
   store.settings.nr = { zus: Zusatzbeitrag in %, b: Brutto von Hand, ex: { lst, rv, kv, pa } genaue Beträge }
   Hat der Monat eine Lohnabrechnung, nimmt Mami deren Zahlen. Midijob und Minijob werden mitgerechnet. */

const NR = { ym: "", ed: "", opt: false };
const NR_OG = 2000; /* Obergrenze Übergangsbereich (Midijob) */
function nrSet() {
  return (store.settings.nr = store.settings.nr || {});
}
/* Brutto für einen Monat: Abrechnung > Mindestlohn-Schätzung > Vertrag > von Hand */
function nrBrutto(ym) {
  const s = slipsOf(ym.slice(0, 4)).find((x) => x.ym === ym);
  if (s && Number(s.brutto) > 0) return { v: Number(s.brutto), src: "slip", s };
  const m = typeof mindestYm === "function" ? mindestYm(ym) : 0;
  if (m > 0) return { v: m, src: "mind" };
  const N = nrSet();
  if (Number(N.b) > 0) return { v: Number(N.b), src: "hand" };
  const vt = store.settings.vt;
  if (vt && vt.f && vt.f.brutto > 0) return { v: Number(vt.f.brutto), src: "vt" };
  return { v: 0, src: "" };
}
function nrCalc(ym) {
  const B = nrBrutto(ym),
    b = B.v,
    st = store.settings,
    N = nrSet(),
    ex = N.ex || {},
    y = Number(ym.slice(0, 4)),
    mj = (yearLimits(y) || {}).mj || 603,
    kl = Number(st.steuerklasse) || 1,
    z = Number(st.kinder) || 0,
    zus = N.zus != null && N.zus !== "" ? Number(N.zus) : 2.9;
  const r = { b, src: B.src, kl, zus, mini: false, midi: false, rows: {} };
  if (!(b > 0)) return r;
  /* Sozialabgaben: Arbeitnehmer-Anteil */
  const kvB = Math.min(b, TAX26.bbgKV / 12),
    rvB = Math.min(b, TAX26.bbgRV / 12);
  let base = (x) => x;
  if (b <= mj) r.mini = true;
  else if (b <= NR_OG) {
    r.midi = true;
    /* Übergangsbereich: Arbeitnehmer zahlt nur auf einen Teil, der von 0 auf das volle Brutto ansteigt */
    base = () => (NR_OG / (NR_OG - mj)) * (b - mj);
  }
  const pv = 1.8 + (z === 0 ? 0.6 : z >= 2 ? -0.25 * Math.min(4, z - 1) : 0);
  const sv = r.mini
    ? { rv: b * 0.036, kv: 0, pa: 0 }
    : {
        rv: (base(rvB) * 9.3) / 100,
        kv: (base(kvB) * (7.3 + zus / 2)) / 100,
        pa: (base(kvB) * pv) / 100 + (base(rvB) * 1.3) / 100,
      };
  /* Lohnsteuer (Schätzung über das Jahr) + Soli + Kirche */
  let lst = 0;
  if (!r.mini) {
    const yl = lstEstimate(b * 12, kl),
      soli = soliOf(yl, kl === 3),
      kist = st.kirche ? yl * kistRate() : 0;
    lst = (yl + soli + kist) / 12;
  }
  const s = B.s;
  const pick = (k, calc, fromSlip) => {
    if (s && fromSlip != null) return { v: round2(fromSlip), src: "slip" };
    if (ex[k] != null && ex[k] !== "") return { v: Number(ex[k]), src: "ex" };
    return { v: round2(calc), src: "calc" };
  };
  const slipLst = s ? (Number(s.lst) || 0) + (Number(s.soli) || 0) + (Number(s.kist) || 0) : null;
  r.rows.lst = pick("lst", lst, s && (s.lst != null || s.soli != null) ? slipLst : null);
  r.rows.rv = pick("rv", sv.rv, s && s.rv != null && s.rv !== "" ? Number(s.rv) : null);
  r.rows.kv = pick("kv", sv.kv, s && s.kv != null && s.kv !== "" ? Number(s.kv) : null);
  const restSlip = s && Number(s.netto) > 0 ? Math.max(0, b - Number(s.netto) - r.rows.lst.v - r.rows.rv.v - r.rows.kv.v) : null;
  r.rows.pa = pick("pa", sv.pa, restSlip);
  r.net = round2(s && Number(s.netto) > 0 ? Number(s.netto) : b - r.rows.lst.v - r.rows.rv.v - r.rows.kv.v - r.rows.pa.v);
  r.pv = pv;
  return r;
}
function nrCard(y) {
  const E = escHtml,
    cur = ymOf(new Date());
  if (!NR.ym || NR.ym.slice(0, 4) !== String(y)) NR.ym = String(y) === cur.slice(0, 4) ? cur : y + "-12";
  const ym = NR.ym,
    R = nrCalc(ym),
    st = store.settings,
    mon = fxDate(ym + "-01", { month: "long", year: "numeric" });
  const kls = [1, 2, 3, 4, 5, 6]
    .map((k) => `<button type="button" class="nrkl ${R.kl === k ? "on" : ""}" data-nrkl="${k}" aria-pressed="${R.kl === k}">${["I", "II", "III", "IV", "V", "VI"][k - 1]}</button>`)
    .join("");
  const nav = `<div class="nrnav"><button type="button" class="agnav" data-nrmo="-1" aria-label="‹">${svgIcon("chevron", 15)}</button><b>${E(mon)}</b><button type="button" class="agnav r" data-nrmo="1" aria-label="›">${svgIcon("chevron", 15)}</button></div>`;
  const opts = `<button type="button" class="nropt" data-nropt>${E(
    uiText("nr_opts", {
      k: st.kirche ? uiText("nr_kirche_j") : uiText("nr_kirche_n"),
      z: String(Number(st.kinder) || 0),
      p: numStr(R.zus),
    })
  )} ${svgIcon("sliders", 14)}</button>${
    NR.opt
      ? `<div class="nrform"><label class="nrf"><span>${E(uiText("nr_f_kirche"))}</span><input type="checkbox" class="tg" data-nrf="kirche" ${st.kirche ? "checked" : ""}></label><label class="nrf"><span>${E(uiText("nr_f_kinder"))}</span><input class="in" data-nrf="kinder" inputmode="numeric" value="${E(String(Number(st.kinder) || 0))}"></label><label class="nrf"><span>${E(uiText("nr_f_zus"))}</span><input class="in" data-nrf="zus" inputmode="decimal" value="${E(numStr(R.zus))}"></label></div>`
      : ""
  }`;
  if (!(R.b > 0))
    return `<div class="card flat nrcard" data-noi18n>${nav}<p class="small muted" style="margin:6px 0 10px">${E(uiText("nr_empty"))}</p><label class="nrf"><span>${E(uiText("nr_b_hand"))}</span><input class="in" data-nrf="b" inputmode="decimal" placeholder="0"></label></div>`;
  const pct = (v) => Math.max(0, Math.min(100, (v / R.b) * 100));
  let left = 100;
  const step = (k, label, sub) => {
    const x = R.rows[k],
      w = pct(x.v);
    left -= w;
    const tag =
      x.src === "slip"
        ? `<span class="nrsrc">${E(uiText("nr_src_slip"))}</span>`
        : `<button type="button" class="nrex ${x.src === "ex" ? "on" : ""}" data-nred="${k}">${E(x.src === "ex" ? uiText("nr_exact_on") : uiText("nr_exact"))}</button>`;
    const edit =
      NR.ed === k
        ? `<div class="nredit"><input class="in" data-nrex="${k}" inputmode="decimal" value="${x.src === "ex" ? E(numStr(x.v)) : ""}" placeholder="${E(numStr(x.v))}" aria-label="${E(label)}"><button type="button" class="btn primary agj" data-nrsave="${k}">${E(uiText("ag_az_save"))}</button>${x.src === "ex" ? `<button type="button" class="link" data-nrclr="${k}">${E(uiText("nr_reset"))}</button>` : ""}</div>`
        : "";
    return `<div class="nrst"><span class="grow"><b>${E(label)}</b>${sub ? `<small>${E(sub)}</small>` : ""}</span>${tag}<b class="nrv">−&nbsp;${E(fmtEur0(x.v))}</b></div><div class="nrbar"><i style="inset-inline-start:${left.toFixed(1)}%;width:${w.toFixed(1)}%" class="${k === "lst" ? "t" : ""}"></i></div>${edit}`;
  };
  const srcB = { slip: "nr_bs_slip", mind: "nr_bs_mind", vt: "nr_bs_vt", hand: "nr_bs_hand" }[R.src];
  const rows =
    step("lst", uiText("nr_lst"), R.mini ? uiText("nr_mini_lst") : uiText("nr_lst_s", { k: ["I", "II", "III", "IV", "V", "VI"][R.kl - 1] }) + (st.kirche ? " · " + uiText("nr_kirche_j") : "")) +
    step("rv", uiText("nr_rv"), R.mini ? uiText("nr_mini_rv") : R.midi ? uiText("nr_midi") : "9,3 %") +
    (R.mini ? "" : step("kv", uiText("nr_kv"), (7.3 + R.zus / 2).toLocaleString(cLoc(), { maximumFractionDigits: 2 }) + " % · " + uiText("nr_kv_s"))) +
    (R.mini ? "" : step("pa", uiText("nr_pa"), R.pv.toLocaleString(cLoc(), { maximumFractionDigits: 2 }) + " % + 1,3 %"));
  return `<div class="card flat nrcard" data-noi18n>${nav}<div class="nrkls" role="group" aria-label="${E(uiText("nr_kl"))}"><span class="agk">${E(uiText("nr_kl"))}</span>${kls}</div>${opts}
    <div class="nrst nrtop"><span class="grow"><b>${E(uiText("nr_brutto"))}</b>${srcB ? `<small>${E(uiText(srcB))}</small>` : ""}</span>${R.src === "slip" ? "" : `<button type="button" class="nrex" data-nred="b">${E(uiText("nr_change"))}</button>`}<b class="nrv">${E(fmtEur0(R.b))}</b></div><div class="nrbar"><i class="b" style="inset-inline-start:0;width:100%"></i></div>
    ${NR.ed === "b" ? `<div class="nredit"><input class="in" data-nrex="b" inputmode="decimal" value="${E(numStr(R.b))}" aria-label="${E(uiText("nr_brutto"))}"><button type="button" class="btn primary agj" data-nrsave="b">${E(uiText("ag_az_save"))}</button></div>` : ""}
    ${rows}
    <div class="nrst nrnet"><span class="grow"><b>${E(uiText("nr_net"))}</b><small>${E(R.src === "slip" && Number((R.rows.lst || {}).v) >= 0 && slipsOf(ym.slice(0, 4)).some((s) => s.ym === ym && Number(s.netto) > 0) ? uiText("nr_net_slip") : uiText("nr_net_s"))}</small></span><b class="nrv">${E(fmtEur0(R.net))}</b></div><div class="nrbar"><i class="n" style="inset-inline-start:0;width:${pct(R.net).toFixed(1)}%"></i></div>
    <p class="small muted nrnote">${E(R.src === "slip" ? uiText("nr_note_slip") : R.mini ? uiText("nr_note_mini", { a: fmtEur0((yearLimits(ym.slice(0, 4)) || {}).mj || 603) }) : R.midi ? uiText("nr_note_midi") : uiText("nr_note"))}</p></div>`;
}
/* Eingaben */
document.addEventListener("click", (e) => {
  const t = e.target.closest && e.target.closest("[data-nrkl],[data-nrmo],[data-nropt],[data-nred],[data-nrsave],[data-nrclr]");
  if (!t) return;
  const N = nrSet();
  if (t.dataset.nrkl) {
    store.settings.steuerklasse = Number(t.dataset.nrkl);
    nrRerender();
    saveSettings();
  } else if (t.dataset.nrmo) {
    const d = new Date(NR.ym + "-01T12:00");
    d.setMonth(d.getMonth() + Number(t.dataset.nrmo));
    const ny = isoOf(d).slice(0, 7);
    if (ny.slice(0, 4) === NR.ym.slice(0, 4)) NR.ym = ny;
    nrRerender();
  } else if (t.hasAttribute("data-nropt")) {
    NR.opt = !NR.opt;
    nrRerender();
  } else if (t.dataset.nred) {
    NR.ed = NR.ed === t.dataset.nred ? "" : t.dataset.nred;
    nrRerender();
    setTimeout(() => {
      const i = document.querySelector(`[data-nrex="${NR.ed}"]`);
      i && i.focus();
    }, 30);
  } else if (t.dataset.nrsave) {
    const k = t.dataset.nrsave,
      i = document.querySelector(`[data-nrex="${k}"]`),
      v = i ? parseAmt(i.value) : NaN;
    if (k === "b") {
      if (v > 0) N.b = round2(v);
      else delete N.b;
    } else {
      N.ex = N.ex || {};
      if (isFinite(v) && v >= 0) N.ex[k] = round2(v);
      else delete N.ex[k];
    }
    NR.ed = "";
    nrRerender();
    saveSettings();
    try {
      SND.play("save");
    } catch (_) {}
  } else if (t.dataset.nrclr) {
    if (N.ex) delete N.ex[t.dataset.nrclr];
    NR.ed = "";
    nrRerender();
    saveSettings();
  }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (!t.dataset || !t.dataset.nrf) return;
  const k = t.dataset.nrf,
    N = nrSet(),
    st = store.settings;
  if (k === "kirche") st.kirche = t.checked;
  else if (k === "kinder") st.kinder = Math.max(0, Math.min(12, Math.round(parseAmt(t.value) || 0)));
  else if (k === "zus") {
    const v = parseAmt(t.value);
    if (isFinite(v) && v >= 0 && v <= 6) N.zus = v;
  } else if (k === "b") {
    const v = parseAmt(t.value);
    if (v > 0) N.b = round2(v);
  }
  nrRerender();
  saveSettings();
});
/* Nur das Rechner-Kästchen neu zeichnen (Monat wechseln, aufklappen) – ohne die ganze Seite */
function nrRerender() {
  const c = document.querySelector(".nrcard");
  if (!c) return;
  const y = NR.ym.slice(0, 4),
    w = document.createElement("div");
  w.innerHTML = nrCard(y);
  const n = w.firstElementChild;
  n.classList.add("nrnoanim");
  c.replaceWith(n);
}

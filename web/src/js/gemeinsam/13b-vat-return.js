/* Umsatzsteuer-Voranmeldung: Zahllast pro Monat oder Quartal und die ELSTER-Kennzahlen */
const UST = {
  key: null,
  more: false,
};
const UST_ZERO = /versicherung|gebühr|gebuehr|bank|konto|zins|porto|steuer|beitrag|miete|kammer|rundfunk/i,
  UST_LOW = /buch|bücher|zeitung|zeitschrift|fachliteratur|lebensmittel/i;
function ustCfg() {
  const s = store.settings;
  return { q: s.ustPeriod === "q", dfv: !!s.ustDfv, done: s.ustDone || {} };
}
function ustKeyOf(ym, q) {
  const [y, m] = ymParts(ym);
  return q ? `${y}-Q${Math.ceil(m / 3)}` : ym;
}
function ustMonths(key) {
  const m = key.match(/^(\d{4})-Q(\d)$/);
  if (!m) return [key];
  return [1, 2, 3].map((i) => `${m[1]}-${pad((Number(m[2]) - 1) * 3 + i)}`);
}
function ustPeriods(n) {
  const q = ustCfg().q,
    out = [];
  let ym = isoToday().slice(0, 7);
  while (out.length < n) {
    const k = ustKeyOf(ym, q);
    if (!out.includes(k)) out.push(k);
    ym = shiftYm(ym, -1);
  }
  return out.reverse();
}
function ustDue(key) {
  const last = ustMonths(key).pop(),
    [y, m] = ymParts(shiftYm(last, ustCfg().dfv ? 2 : 1));
  return `${y}-${pad(m)}-10`;
}
function ustLabel(key, long) {
  const M = ustMonths(key),
    [y, m] = ymParts(M[0]);
  if (M.length === 3) return `Q${Math.ceil(m / 3)}${long ? " " + y : ""}`;
  return fxDate(M[0] + "-15", long ? { month: "long", year: "numeric" } : { month: "short" });
}
function ustGuessRate(name) {
  const def = Number(store.settings.vatRate) || 19;
  if (UST_ZERO.test(name || "")) return 0;
  if (UST_LOW.test(name || "")) return 7;
  return def;
}
const ustVat = (gross, r) => round2(gross - gross / (1 + r / 100));

/* Ausgangs- und Vorsteuer eines Zeitraums */
function ustCalc(key) {
  const M = ustMonths(key),
    inP = (d) => M.includes(String(d || "").slice(0, 7)),
    def = Number(store.settings.vatRate) || 19,
    out = {},
    vst = [];
  const addOut = (r, net, vat) => {
    const o = (out[r] = out[r] || { net: 0, vat: 0 });
    o.net = round2(o.net + net);
    o.vat = round2(o.vat + vat);
  };
  const inv = new Map();
  for (const i of rchList()) {
    if (!i.doc) continue;
    if (i.paidTx) inv.set(i.paidTx, i);
    for (const p of i.parts || []) if (p.tx) inv.set(p.tx, i);
  }
  for (const t of store.tx) {
    if (!inP(t.date)) continue;
    if (t.kind === "einnahme" && incArt(t.cat) === "selbst") {
      const net = t.net != null ? Number(t.net) || 0 : round2(t.amount / (1 + def / 100)),
        vat = round2(t.amount - net),
        i = inv.get(t.id),
        G = i ? rvSum(i.doc).groups.filter((g) => g.net) : [];
      const tot = G.reduce((s, g) => s + Math.abs(g.net), 0);
      if (G.length > 1 && tot) {
        let restN = net,
          restV = vat;
        G.forEach((g, k) => {
          const share = Math.abs(g.net) / tot,
            last = k === G.length - 1,
            n = last ? restN : round2(net * share),
            v = last ? restV : round2(vat * share);
          restN = round2(restN - n);
          restV = round2(restV - v);
          addOut(g.rate, n, v);
        });
      } else addOut(G.length ? G[0].rate : def, net, vat);
    }
  }
  const erTx = new Set();
  for (const i of erList()) {
    if (i.tx) erTx.add(i.tx);
    if (!i.paid || !inP(i.paid) || i.typ === "g") continue;
    vst.push({ k: "er:" + i.id, name: i.from || i.nr, gross: i.pay, vat: round2(i.vat), fixed: true });
  }
  for (const t of store.tx) {
    if (!inP(t.date) || t.kind !== "betrieb" || erTx.has(t.id)) continue;
    const r = t.vr != null ? Number(t.vr) : ustGuessRate(t.cat + " " + (t.note || ""));
    vst.push({
      k: "t:" + t.id,
      name: t.note || t.cat,
      gross: t.amount,
      r,
      vat: ustVat(t.amount, r),
      guess: t.vr == null,
    });
  }
  for (const ym of M) {
    const paid = (store.months[ym] && store.months[ym].paid) || {};
    for (const [fid, amt] of Object.entries(paid)) {
      const f = store.fixed.find((x) => x.id === fid);
      if (!f || f.kind !== "betrieb") continue;
      const r = f.vr != null ? Number(f.vr) : ustGuessRate(f.name + " " + (f.cat || ""));
      vst.push({
        k: "f:" + fid,
        name: f.name,
        gross: Number(amt) || 0,
        r,
        vat: ustVat(Number(amt) || 0, r),
        guess: f.vr == null,
      });
    }
  }
  const n19 = Math.floor((out[19] && out[19].net) || 0),
    n7 = Math.floor((out[7] && out[7].net) || 0),
    v66 = round2(vst.reduce((s, x) => s + x.vat, 0)),
    other = Object.keys(out)
      .map(Number)
      .filter((r) => r !== 19 && r !== 7 && out[r].vat);
  return {
    out,
    vst,
    v66,
    kz81: n19,
    kz86: n7,
    kz83: round2(n19 * 0.19 + n7 * 0.07 - v66),
    other,
    outVat: round2(Object.values(out).reduce((s, o) => s + o.vat, 0)),
  };
}

/* Ansicht im Steuer-Reiter */
function ustPanel() {
  const st = store.settings,
    cfg = ustCfg(),
    P = ustPeriods(cfg.q ? 4 : 4);
  if (!UST.key || !P.includes(UST.key)) UST.key = P[P.length - 2] || P[0];
  const key = UST.key,
    c = ustCalc(key),
    due = ustDue(key),
    done = cfg.done[key],
    days = daysTo(due),
    E = (v) => escHtml(fmtEur(v)),
    open = key === P[P.length - 1],
    kz = (n, label, v, cents) =>
      `<div class="ustkz"><span><small>Kz ${n} · ${escHtml(uiText(label))}</small><b data-noi18n>${escHtml(cents ? v.toFixed(2).replace(".", ",") : String(v))}</b></span><button type="button" class="btn sm" data-ustcopy="${escHtml(cents ? v.toFixed(2).replace(".", ",") : String(v))}">${svgIcon("copy", 13)} ${escHtml(uiText("er_copy"))}</button></div>`;
  return `<div class="txr">
    <div class="ustbar"><div class="erseg ustseg">${P.map((k) => `<button type="button" class="${k === key ? "on" : ""}" data-ustk="${k}">${escHtml(ustLabel(k))}${cfg.done[k] ? " ✓" : ""}</button>`).join("")}</div>
    <button type="button" class="btn sm ghost" data-ustq>${escHtml(uiText(cfg.q ? "ust_q" : "ust_m"))}</button></div>
    <div class="erpos ustsum"><div class="h"><span>${escHtml(ustLabel(key, true))}${open ? " · " + escHtml(uiText("ust_running")) : ""}</span><span></span></div>
      <div><span>${escHtml(uiText("ust_out"))}</span><span>+ ${E(c.outVat)}</span></div>
      <div><span>${escHtml(uiText("ust_in"))}</span><span>− ${E(c.v66)}</span></div>
      <div class="t"><b>${escHtml(uiText(c.kz83 < 0 ? "ust_back" : "ust_pay"))}</b><b>${E(Math.abs(c.kz83))}</b></div></div>
    <div class="ustdue ${done ? "ok" : days < 0 ? "od" : days <= 5 ? "due" : ""}"><span class="eric">${svgIcon(done ? "check" : "cal", 20)}</span><span class="ern"><b>${escHtml(done ? uiText("ust_done_on", { d: fxDate(done, { day: "numeric", month: "long" }) }) : uiText("ust_due", { d: fxDate(due, { day: "numeric", month: "long" }) }))}</b><small>${escHtml(uiText(done ? "ust_done_s" : open ? "ust_open_s" : "ust_due_s"))}</small></span></div>
    <div class="sec-mini">${escHtml(uiText("ust_elster"))}</div>
    <p class="small muted ustp">${escHtml(uiText("ust_elster_s"))}</p>
    ${kz(81, "ust_k81", c.kz81)}${c.kz86 || (c.out[7] && c.out[7].net) ? kz(86, "ust_k86", c.kz86) : ""}${kz(66, "ust_k66", c.v66, 1)}${kz(83, "ust_k83", c.kz83, 1)}
    ${c.other.length ? `<div class="notice warn"><span>${escHtml(uiText("ust_other", { r: c.other.join(" %, ") + " %" }))}</span></div>` : ""}
    <button type="button" class="ustmore" data-ustmore aria-expanded="${UST.more}"><b>${escHtml(uiText("ust_vst_h", { n: String(c.vst.length) }))}</b>${c.vst.some((x) => x.guess) ? `<small>${escHtml(uiText("ust_vst_guess"))}</small>` : ""}${svgIcon(UST.more ? "up" : "down", 16)}</button>
    ${
      UST.more
        ? `<div class="ustvl">${
            c.vst
              .map(
                (x) =>
                  `<div class="ustv"><span><b data-noi18n>${escHtml(x.name || "–")}</b><small>${E(x.gross)} → ${escHtml(uiText("ust_vst"))} ${E(x.vat)}</small></span>${
                    x.fixed
                      ? `<em>${escHtml(uiText("er_fmt_xr"))}</em>`
                      : `<span class="ustr ${x.guess ? "guess" : ""}">${[19, 7, 0].map((r) => `<button type="button" class="${x.r === r ? "on" : ""}" data-ustr="${escHtml(x.k)}" data-r="${r}">${r} %</button>`).join("")}</span>`
                  }</div>`
              )
              .join("") || `<p class="small muted">${escHtml(uiText("ust_vst_none"))}</p>`
          }</div>`
        : ""
    }
    <label class="ustdfv"><input type="checkbox" data-ustdfv ${cfg.dfv ? "checked" : ""}> <span>${escHtml(uiText("ust_dfv"))}</span></label>
    ${open ? "" : `<button type="button" class="btn ${done ? "" : "primary"} block" data-ustdone>${escHtml(uiText(done ? "ust_undo" : "ust_mark"))}</button>`}
    <p class="small muted ustp">${escHtml(uiText("ust_foot"))}</p></div>`;
}
function ustRefresh() {
  const p = document.querySelector('.txp[data-txp="ust"]');
  if (p) p.innerHTML = ustPanel();
}
async function ustSetRate(k, r) {
  const [kind, id] = k.split(":");
  if (kind === "t") {
    const t = store.tx.find((x) => x.id === id);
    if (t) await safe(() => saveTxDoc(t.id, { ...plainTx(t), vr: r }, t));
  } else if (kind === "f") {
    const f = store.fixed.find((x) => x.id === id);
    if (f) {
      const d = { ...f, vr: r };
      delete d.id;
      await safe(() => saveDoc("fixed", id, d));
    }
  }
}
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("[data-ustopen]")) {
    ui.txTab = "ust";
    anaOpen("tax");
    return;
  }
  if (!t.closest('.txp[data-txp="ust"]')) return;
  const k = t.closest("[data-ustk]"),
    r = t.closest("[data-ustr]"),
    cp = t.closest("[data-ustcopy]");
  if (k) {
    UST.key = k.dataset.ustk;
    SND.play("tick");
  } else if (t.closest("[data-ustq]")) {
    store.settings.ustPeriod = ustCfg().q ? "m" : "q";
    UST.key = null;
    await saveSettings();
  } else if (t.closest("[data-ustmore]")) UST.more = !UST.more;
  else if (r) await ustSetRate(r.dataset.ustr, Number(r.dataset.r));
  else if (cp) {
    try {
      await navigator.clipboard.writeText(cp.dataset.ustcopy);
      toast(uiText("va_copied"));
    } catch (_) {}
    return;
  } else if (t.closest("[data-ustdone]")) {
    const d = { ...(store.settings.ustDone || {}) };
    if (d[UST.key]) delete d[UST.key];
    else d[UST.key] = isoToday();
    store.settings.ustDone = d;
    await saveSettings();
    SND.play(d[UST.key] ? "done" : "untick");
  } else return;
  ustRefresh();
});
document.addEventListener("change", async (e) => {
  if (!e.target.matches("[data-ustdfv]")) return;
  store.settings.ustDfv = e.target.checked;
  await saveSettings();
  ustRefresh();
});

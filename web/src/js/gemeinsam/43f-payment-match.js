/* Zahlungen zu Rechnungen zuordnen: die App schlägt vor, du bestätigst */
const PM_STOP = /^(gmbh|mbh|und|the|ltd|gbr|ohg|kg|ug|haftungsbeschr|firma|herr|frau)$/;
const pmNorm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]/g, "");
function pmWord(name) {
  return (
    String(name || "")
      .toLowerCase()
      .split(/[\s,.&/+-]+/)
      .find((w) => w.length >= 4 && !PM_STOP.test(w)) || ""
  );
}
function pmUsed() {
  const s = new Set();
  for (const i of rchList()) {
    if (i.paidTx) s.add(i.paidTx);
    for (const p of i.parts || []) if (p.tx) s.add(p.tx);
  }
  for (const i of erList()) if (i.tx) s.add(i.tx);
  return s;
}
function pmOpenItems() {
  return [
    ...rchList()
      .filter((i) => !i.paid && !i.storno && i.typ !== "s" && i.typ !== "g" && i.amt > 0)
      .map((i) => ({ dir: "in", inv: i, rest: rchRest(i), nr: i.nr, who: i.kunde, date: i.date })),
    ...erOpenList().map((i) => ({ dir: "out", inv: i, rest: i.pay, nr: i.nr, who: i.from, date: i.date })),
  ];
}
function pmScore(o, t) {
  const raw = `${t.note || ""} ${t.ref || ""}`.toLowerCase(),
    nr = pmNorm(o.nr),
    byNr = nr.length >= 3 && pmNorm(raw).includes(nr),
    w = pmWord(o.who),
    byName = !!w && raw.includes(w),
    named = byNr || byName,
    diff = round2(o.rest - t.amount);
  if (Math.abs(diff) < 0.01) return { lvl: named ? "sure" : "maybe", s: (byNr ? 7 : 0) + (byName ? 3 : 0) + 2 };
  if (!named || diff < 0) return null;
  if (diff <= o.rest * 0.031) return { lvl: "skonto", s: (byNr ? 5 : 3) + 1, diff };
  if (o.dir === "in") return { lvl: "part", s: byNr ? 4 : 2, diff };
  return null;
}
function pmFind() {
  if (!hasSelf()) return [];
  const used = pmUsed(),
    cands = [];
  for (const o of pmOpenItems()) {
    const no = new Set(o.inv.no || []),
      from = addDays(o.date, -7),
      to = addDays(o.date, 180);
    for (const t of store.tx || []) {
      if (!t.date || t.date < from || t.date > to || used.has(t.id) || no.has(t.id)) continue;
      if (o.dir === "in" ? t.kind !== "einnahme" : t.kind !== "betrieb" && t.kind !== "ausgabe") continue;
      const sc = pmScore(o, t);
      if (sc) cands.push({ ...sc, o, t });
    }
  }
  cands.sort((a, c) => c.s - a.s || a.t.date.localeCompare(c.t.date));
  const tk = new Set(),
    ik = new Set();
  return cands.filter((c) => {
    if (tk.has(c.t.id) || ik.has(c.o.inv.id)) return false;
    tk.add(c.t.id);
    ik.add(c.o.inv.id);
    return true;
  });
}
function pmApply(c) {
  const i = c.o.inv,
    t = c.t;
  if (c.o.dir === "out") {
    i.paid = t.date;
    i.tx = t.id;
    if (t.cat) i.cat = t.cat;
    return;
  }
  if (c.lvl === "part") {
    (i.parts = i.parts || []).push({ d: t.date, a: t.amount, tx: t.id });
    rvLog("part", i.nr, fmtEur(t.amount));
    if (rchRest(i) <= 0.005) i.paid = t.date;
    return;
  }
  i.paid = t.date;
  i.paidTx = t.id;
  if (c.lvl === "skonto") i.skonto = c.diff;
  rvLog("paid", i.nr, c.lvl === "skonto" ? "skonto " + fmtEur(c.diff) : "");
}
function pmReject(c) {
  const i = c.o.inv;
  i.no = [...(i.no || []), c.t.id].slice(-50);
}

/* --- Fenster --- */
const PM = { L: [] };
function pmOpen() {
  PM.L = pmFind();
  if (!PM.L.length) return;
  pmRender(true);
}
function pmRender(first) {
  const n = PM.L.length,
    b = hbSheet("pmBg", uiText(n === 1 ? "pm_h1" : "pm_h", { n: String(n) })),
    D = (d) => fxDate(d, { day: "numeric", month: "short" });
  b.innerHTML = `<div class="pml">${PM.L.map((c, k) => {
    const inc = c.o.dir === "in",
      badge =
        c.lvl === "part"
          ? uiText("pm_part", { a: fmtEur(c.diff) })
          : c.lvl === "skonto"
            ? uiText("pm_skonto", { a: fmtEur(c.diff) })
            : uiText(c.lvl === "sure" ? "pm_sure" : "pm_maybe");
    return `<div class="pmc ${c.lvl}" data-pmk="${k}"><div class="pmt"><span class="pmi ${inc ? "in" : "out"}">${svgIcon(inc ? "arrowDown" : "arrowUp", 18)}</span><span class="pmn"><b data-noi18n>${escHtml(c.o.who || "–")}</b><small data-noi18n>${escHtml(
      uiText("pm_to", { a: (inc ? "+" : "−") + fmtEur(c.t.amount), d: D(c.t.date), n: c.o.nr || "–" })
    )}</small>${c.t.ref ? `<small class="pmref" data-noi18n>${escHtml(c.t.ref)}</small>` : ""}<em class="pmb">${escHtml(badge)}</em></span></div><div class="pma"><button type="button" class="btn" data-pmno="${k}">${escHtml(uiText("pm_no"))}</button><button type="button" class="btn primary" data-pmyes="${k}">${svgIcon("check", 15)} ${escHtml(uiText("pm_yes"))}</button></div></div>`;
  }).join("")}</div>
    <button type="button" class="btn primary block pmall" data-pmall>${escHtml(uiText("pm_all"))}</button>
    <p class="small muted pmhint">${escHtml(uiText("pm_hint"))}</p>`;
  if (first && !reducedMotion()) stbAnim(b, ".pmc,.pmall,.pmhint");
}
async function pmDecide(k, yes) {
  const c = PM.L[k],
    card = document.querySelector(`#pmBg [data-pmk="${k}"]`);
  if (!c) return;
  if (yes) pmApply(c);
  else pmReject(c);
  await saveSettings();
  SND.play(yes ? "done" : "untick");
  const next = () => {
    PM.L = pmFind();
    if (!PM.L.length) {
      hbSheetClose("pmBg");
      toast(uiText("pm_done"));
      pmRefresh();
      return;
    }
    pmRender();
  };
  if (card && !reducedMotion())
    card
      .animate(
        [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: `translateX(${yes ? 40 : -40}px) scale(.96)` },
        ],
        { duration: 260, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" }
      )
      .finished.then(next);
  else next();
}
async function pmAll() {
  for (const c of PM.L) pmApply(c);
  await saveSettings();
  SND.play("done");
  hbSheetClose("pmBg");
  toast(uiText("pm_done"));
  pmRefresh();
}
function pmRefresh() {
  render();
  if ($("rchBg") && !$("rchBg").hidden) rchOpen2();
  if ($("erBg") && !$("erBg").hidden) erOpen();
}
function pmBanner() {
  const n = pmFind().length;
  return n
    ? `<button type="button" class="pmban" data-pmopen><span>${svgIcon("bank", 18)}</span><b>${escHtml(uiText(n === 1 ? "pm_ban1" : "pm_ban", { n: String(n) }))}</b>${svgIcon("right", 16)}</button>`
    : "";
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("[data-pmopen]")) {
    pmOpen();
    return;
  }
  if (!t.closest("#pmBg")) return;
  const y = t.closest("[data-pmyes]"),
    n = t.closest("[data-pmno]");
  if (y) pmDecide(Number(y.dataset.pmyes), true);
  else if (n) pmDecide(Number(n.dataset.pmno), false);
  else if (t.closest("[data-pmall]")) pmAll();
});

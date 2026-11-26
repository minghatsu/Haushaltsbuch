/* ===== Dranbleiben – fair statt Druck =====
   Drei kleine Helfer, damit man mit dem Haushaltsbuch dranbleibt, ohne Tracking und ohne Schuldgefühle:
   1. Erinnerung zur passenden Zeit: Die Uhrzeit ergibt sich nur aus deinen eigenen Einträgen (wann du sie angelegt hast).
      Es wird nichts zusätzlich gespeichert oder verschickt.
   2. Sanfter Wiedereinstieg: Nach ein paar Tagen ohne Eintrag eine freundliche Karte – nachholen oder einfach weiter.
   3. Ehrlicher Monats-Check: Am Monatsanfang drei nützliche Punkte zum vergangenen Monat. Keine Serien, keine Ranglisten. */

/* ---------- 1. Gelernte Uhrzeit ---------- */
/* Median der Uhrzeiten, zu denen du zuletzt von Hand eingetragen hast (auf 15 Minuten gerundet). Ab 5 Einträgen. */
function dbLearned() {
  const mins = store.tx
    .filter((t) => t.ts && !t.source && !t.importKey && !t._b)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 40)
    .map((t) => {
      const d = new Date(t.ts);
      return d.getHours() * 60 + d.getMinutes();
    })
    /* Einträge mitten in der Nacht nicht als Gewohnheit lernen */
    .filter((m) => m >= 6 * 60 && m <= 23 * 60);
  if (mins.length < 5) return null;
  mins.sort((a, b) => a - b);
  const mid = mins[Math.floor(mins.length / 2)],
    r = Math.round(mid / 15) * 15;
  return { h: Math.floor(r / 60), m: r % 60, n: mins.length };
}
const dbHm = (x) => String(x.h).padStart(2, "0") + ":" + String(x.m).padStart(2, "0");
/* Zeit für die tägliche Erinnerung: gelernt, sonst 19 Uhr */
function dbDailyAt() {
  return dbLearned() || { h: 19, m: 0 };
}
/* Heute schon etwas eingetragen? Dann heute nicht erinnern */
function dbDoneToday() {
  const d = isoToday();
  return store.tx.some((t) => t.ts && isoOf(new Date(t.ts)) === d && !t.source && !t.importKey);
}
function dbLearnInfo() {
  const L = dbLearned();
  return `<div class="dbinfo">
    <div><span>${escHtml(uiText("db_l_time"))}</span><b>${escHtml(L ? uiText("db_l_ca", { t: dbHm(L) }) : uiText("db_l_none"))}</b></div>
    <div><span>${escHtml(uiText("db_l_to"))}</span><b>${escHtml(uiText("db_l_nobody"))}</b></div>
    <p class="small muted">${escHtml(uiText(L ? "db_l_how" : "db_l_how0", { n: String(L ? L.n : 5) }))}</p>
  </div>`;
}

/* ---------- 2. Sanfter Wiedereinstieg ---------- */
/* Letzter Eintrag liegt mindestens 5 Tage zurück (und nicht in der Zukunft) */
function dbGap() {
  const today = isoToday();
  let last = "";
  for (const t of store.tx) if (t.date && t.date <= today && t.date > last) last = t.date;
  if (!last) return null;
  const days = Math.round((new Date(today + "T12:00").getTime() - new Date(last + "T12:00").getTime()) / 864e5);
  if (days < 5 || store.settings.wbSkip === last) return null;
  return { last, days };
}
function wbCard() {
  const g = dbGap();
  if (!g) return "";
  const E = escHtml;
  return `<div class="card wbcard" data-noi18n>
    <div class="wbtop">${mamiAvatar()}<div><b>${E(uiText("wb_t"))}</b><span>${E(uiText(g.days >= 14 ? "wb_p_long" : "wb_p", { n: String(g.days) }))}</span></div></div>
    <button class="btn primary block" data-go="import" data-wbskip="${E(g.last)}">${E(uiText("wb_imp"))}</button>
    <button class="btn block wbhand" data-add="ausgabe" data-wbskip="${E(g.last)}">${E(uiText("wb_hand"))}</button>
    <button class="link wbok" data-wbskip="${E(g.last)}">${E(uiText("wb_ok"))}</button>
  </div>`;
}
document.addEventListener(
  "click",
  (e) => {
    const b = e.target.closest("[data-wbskip]");
    if (!b) return;
    store.settings.wbSkip = b.dataset.wbskip;
    try {
      saveSettings();
    } catch (_) {}
    if (!b.dataset.go && !b.dataset.add)
      try {
        const c = b.closest(".wbcard");
        if (c && !reducedMotion()) {
          c.classList.add("out");
          setTimeout(() => renderHome(), 260);
        } else renderHome();
      } catch (_) {}
  },
  true
);

/* ---------- 3. Ehrlicher Monats-Check ---------- */
function mcFacts(ym) {
  const prev = shiftYm(ym, -1),
    c = monthCalc(ym),
    pc = monthCalc(prev),
    facts = [];
  const byCat = (tx) => {
    const o = {};
    for (const t of tx) if (t.kind === "ausgabe" || t.kind === "betrieb") o[t.cat || "Sonstiges"] = (o[t.cat || "Sonstiges"] || 0) + t.amount;
    return o;
  };
  /* a) größte Veränderung einer Kategorie zum Vormonat – ehrlich in beide Richtungen */
  if (pc.tx.length >= 5) {
    const a = byCat(c.tx),
      b = byCat(pc.tx);
    let best = null;
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = (a[k] || 0) - (b[k] || 0);
      if (Math.abs(d) < 20 || Math.abs(d) < (b[k] || 0) * 0.1) continue;
      /* Weniger ausgegeben zählt mehr als mehr ausgegeben – aber beides wird gesagt */
      const w = d < 0 ? -d * 1.5 : d;
      if (!best || w > best.w) best = { k, d, w };
    }
    if (best)
      facts.push({
        ic: best.d < 0 ? "check" : "alert",
        good: best.d < 0,
        t: uiText(best.d < 0 ? "mc_less" : "mc_more", { c: best.k, a: fmtEur0(Math.abs(best.d)) }),
        s: uiText("mc_vs", { m: monName(prev) }),
      });
  }
  /* b) nächste größere Zahlung, die nicht jeden Monat kommt (Versicherung, Kfz-Steuer …) */
  const now = ymOf(new Date());
  outer: for (let k = 0; k <= 3; k++) {
    const m = shiftYm(now, k);
    for (const f of store.fixed) {
      if (!Array.isArray(f.months) || !f.months.length || f.months.length >= 12 || !dueIn(f, m)) continue;
      const paid = (store.months[m] && store.months[m].paid) || {};
      if (f.id in paid) continue;
      const amt = listAmt(f, m);
      if (!(amt >= 50)) continue;
      const left = Math.max(1, k),
        per = Math.ceil(amt / left);
      facts.push({
        ic: "cal",
        t: uiText("mc_due", { n: f.name || uiText("dk_sonst"), m: monName(m), a: fmtEur0(amt) }),
        s: k <= 0 ? uiText("mc_due_now") : k === 1 ? uiText("mc_due_next") : uiText("mc_due_plan", { a: fmtEur0(per) }),
      });
      break outer;
    }
  }
  /* c) Sparziel */
  const goal = (store.settings.goals || []).find((g) => Number(g.target) > 0);
  if (goal) {
    const v = Math.max(0, goalSaved(goal).v || 0),
      p = Math.min(1, v / Number(goal.target));
    facts.push({
      ic: "piggy",
      t: uiText("mc_goal", { n: goal.name || "", v: fmtEur0(v), z: fmtEur0(Number(goal.target)) }),
      bar: p,
    });
  }
  /* sonst: was übrig blieb */
  if (facts.length < 3) {
    const net = c.income - c.expenses;
    if (c.income > 0)
      facts.push({
        ic: net >= 0 ? "check" : "alert",
        good: net >= 0,
        t: uiText(net >= 0 ? "mc_left" : "mc_minus", { a: fmtEur0(Math.abs(net)) }),
        s: uiText("mc_left_s"),
      });
  }
  return { facts: facts.slice(0, 3), net: c.income - c.expenses, c };
}
function mcOpen(ym) {
  const F = mcFacts(ym),
    E = escHtml,
    nm = (store.settings.name || "").trim();
  const head = uiText(F.net >= 0 ? (nm ? "mc_h_good_n" : "mc_h_good") : nm ? "mc_h_bad_n" : "mc_h_bad", { n: nm });
  const b = hbSheet("mcBg", uiText("mc_title", { m: monName(ym) }));
  b.innerHTML = `<div class="mcwrap">
    <h3 class="mch">${E(head)}</h3>
    <p class="small muted">${E(uiText("mc_sub"))}</p>
    ${F.facts
      .map(
        (f) => `<div class="mcf ${f.good === true ? "good" : f.good === false ? "warn" : ""}"><span class="mci">${svgIcon(f.ic, 18)}</span><div class="grow"><b>${E(f.t)}</b>${f.s ? `<small>${E(f.s)}</small>` : ""}${
          f.bar != null ? `<div class="mcbar"><i style="width:${Math.round(f.bar * 100)}%"></i></div>` : ""
        }</div></div>`
      )
      .join("")}
    <button class="btn primary block" data-hbclose="mcBg" style="margin-top:14px">${E(uiText("mc_thanks"))}</button>
    ${hlShould() === ym ? `<button class="link mchl" data-mchl="${E(ym)}">${E(uiText("mc_hl"))}</button>` : ""}
  </div>`;
  if (!reducedMotion())
    try {
      stbAnim(b, ".mcf");
    } catch (_) {}
}
/* Einmal am Monatsanfang von selbst – nur wenn der Vormonat genug Einträge hat und nichts anderes offen ist */
function mcMaybe() {
  try {
    const p = hlShould();
    if (!p || store.settings.mcSeen === p || ui.view !== "home") return;
    if (document.querySelector(".backdrop:not([hidden]),#tourBg:not([hidden]),.hobg:not([hidden]),#lockBg:not([hidden]),#actBg:not([hidden])") || TOUR.i >= 0)
      return;
    if (mcFacts(p).facts.length < 2) return;
    store.settings.mcSeen = p;
    saveSettings();
    mcOpen(p);
  } catch (_) {}
}
document.addEventListener("click", (e) => {
  const h = e.target.closest("[data-mchl]");
  if (!h) return;
  hbSheetClose("mcBg");
  setTimeout(() => hlOpen(h.dataset.mchl), 260);
});
setTimeout(mcMaybe, 4000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) setTimeout(mcMaybe, 2500);
});

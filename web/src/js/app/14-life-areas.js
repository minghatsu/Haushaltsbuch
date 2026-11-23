/* Lebensbereiche: Haushalt · Beruf · Sparen · Einkauf */
const AREA_PARENT = {
  home: "home",
  list: "home",
  fix: "home",
  year: "home",
  import: "home",
  belege: "home",
  gemeinsam: "home",
  beruf: "beruf",
  zukunft: "zukunft",
  ziele: "zukunft",
  shop: "shop",
  more: "",
};
const AREA_SUB = new Set(["list", "fix", "year", "import", "belege", "gemeinsam", "ziele"]);
const AREA_HOME_OUT = new Set(["tax", "goals", "invest", "debts", "fix", "budgets", "gemeinsam"]);
const BERUF_LBL = {
  angestellt: "Beruf",
  beamte: "Beruf",
  beides: "Beruf",
  selbst: "Beruf",
  minijob: "Minijob",
  azubi: "Ausbildung",
  alg: "Amt",
  grusi: "Amt",
  studium: "Studium",
  schule: "Schule",
  rente: "Rente",
  eltern: "Elternzeit",
  krank: "Krankengeld",
};
const BERUF_IC = {
  schule: "book",
  studium: "book",
  azubi: "book",
  rente: "heart",
  eltern: "gift",
  krank: "health",
  alg: "doc",
  grusi: "doc",
};
function berufLbl() {
  return BERUF_LBL[store.settings && store.settings.work] || "Beruf";
}
function areaTabs() {
  const b = document.querySelector('.tabs .tab[data-go="beruf"]');
  if (!b) return;
  const l = berufLbl();
  if (b.dataset.lbl === l) return;
  b.dataset.lbl = l;
  b.setAttribute("aria-label", l);
  const n = b.querySelector(".tname");
  if (n) {
    n.textContent = l;
    n.classList.toggle("sm", l.length > 8);
  }
  const s = b.querySelector("svg");
  if (s) s.outerHTML = svgIcon(BERUF_IC[store.settings.work] || "case");
}
function areaHead(title, gearK, gearL) {
  return `<div class="areahd"><span>${title}</span>${gearK ? `<button type="button" class="areagear" data-accgo="${gearK}" aria-label="${escHtml(gearL || "Einstellungen")}" title="${escHtml(gearL || "Einstellungen")}">${svgIcon("dots", 18)}<span>${escHtml(gearL || "Einstellungen")}</span></button>` : ""}</div>`;
}
function areaTile(icn, title, sub, attr) {
  return `<button type="button" class="atile" ${attr}><span class="aic">${typeof icn === "string" && icn.length < 4 ? `<span class="aemo">${icn}</span>` : icn}</span><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</button>`;
}
function homeHub(ym, c) {
  let t;
  const fx = fixedForMonth(ym, true).length,
    done = fx - c.openCount,
    n = c.tx.length;
  const ab = (() => {
    try {
      return store.fixed.filter((f) =>
        /abo|netflix|spotify|stream|prime|disney|handy|vertrag/i.test((f.name || "") + " " + (f.cat || ""))
      ).length;
    } catch (_) {
      return 0;
    }
  })();
  t = [
    areaTile(svgIcon("list", 22), "Fixkosten", fx ? `${done} / ${fx} abgehakt` : "anlegen", 'data-go="fix"'),
    areaTile(svgIcon("check", 22), "Buchungen", n === 1 ? "1 im Monat" : `${n} im Monat`, 'data-go="list"'),
    areaTile(svgIcon("chart", 22), "Auswertung", "Wohin dein Geld geht", 'data-go="year"'),
    areaTile(
      svgIcon("tag", 22),
      "Budgets",
      Object.values(store.settings.budgets || {}).filter((v) => +v > 0).length
        ? `${Object.values(store.settings.budgets || {}).filter((v) => +v > 0).length} aktiv`
        : "festlegen",
      'data-spopen="budgets"'
    ),
    areaTile(svgIcon("repeat", 22), "Abos & Verträge", ab ? `${ab}` : "", 'data-spopen="abos"'),
    areaTile(svgIcon("user", 22), "Gemeinsam", "Partner, WG", 'data-go="gemeinsam"'),
  ];
  if (!(hasExtra("partner") || spList().length) && (hasExtra("kinder") || kidsList().length)) t.pop();
  if (hasExtra("kinder") || kidsList().length) {
    const kg = kidsSum(Number(ym.slice(0, 4)));
    t.splice(
      5,
      0,
      areaTile(
        svgIcon("kids", 22),
        "Kinder",
        kidsList().length ? `Kindergeld ${escHtml(fmtEur0(kg))}` : "eintragen",
        "data-kidsopen"
      )
    );
  }
  return `<div class="card areacard">${areaHead("Alles im Haushalt", "konten", "Einstellungen Haushalt")}<div class="agrid">${t.join("")}</div></div>`;
}
/* ===== Beruf: Job und Geschäft getrennt (wer angestellt UND selbstständig ist) =====
     PC + Tablet quer: zwei Bereiche nebeneinander. Handy + Tablet hochkant: Job vorne, Geschäft versetzt dahinter –
     nach unten wischen (oder auf den hinteren Balken tippen) tauscht; die Kacheln gehen nach links raus, die anderen kommen von rechts. */
const BF_BIZ = ["euer", "ruecklage", "kunden"];
function bfSide() {
  try {
    return localStorage.getItem("hb-bfside") === "b" ? "b" : "j";
  } catch (_) {
    return "j";
  }
}
function bfMonth(ym) {
  let job = 0,
    biz = 0,
    cost = 0;
  for (const t of store.tx) {
    if (!(t.date || "").startsWith(ym)) continue;
    const a = Math.abs(Number(t.amount) || 0);
    if (t.kind === "einnahme") {
      const r = incArt(t.cat);
      if (r === "lohn" || r === "sonderzahlung") job += a;
      else if (r === "selbst") biz += a;
    } else if (t.kind === "betrieb") cost += a;
  }
  return {
    job,
    biz: Math.max(0, biz - cost),
    rev: biz,
  };
}
function kdTile() {
  const n = rvKunden().length;
  return areaTile(
    svgIcon("user", 22),
    escHtml(uiText("kd_h")),
    escHtml(n ? uiText(n === 1 ? "kd_n1" : "kd_n", { n: String(n) }) : uiText("kd_tile_none")),
    `data-kdopen`
  );
}
/* Geschäft: die drei dringendsten Aufgaben, mit einem Tipp erledigt */
function bizNext() {
  const L = [],
    E = (v) => fmtEur0(v),
    D = (iso) => fxDate(iso, { day: "numeric", month: "short" });
  const add = (prio, t, s, btn, attr) => L.push({ prio, t, s, btn, attr });
  try {
    const od = rchOver();
    if (od.length)
      add(
        0,
        uiText(od.length === 1 ? "bn_over1" : "bn_over", { n: String(od.length) }),
        E(od.reduce((s, i) => s + rchRest(i), 0)),
        uiText("bn_look"),
        "data-rchopen"
      );
  } catch (_) {}
  try {
    for (const r of rvRecDue().slice(0, 2))
      add(1, uiText("bn_rec", { n: r.kunde || "–" }), `${E(r.amt || 0)} · ${D(r.next)}`, uiText("bn_send"), `data-rvrec="${escHtml(r.id)}"`);
  } catch (_) {}
  try {
    const n = pmFind().length;
    if (n) add(1, uiText(n === 1 ? "pm_ban1" : "pm_ban", { n: String(n) }), "", uiText("bn_check"), "data-pmopen");
  } catch (_) {}
  try {
    if (!store.settings.kleinunternehmer) {
      const k = ustPeriods(2).find((x) => !ustCfg().done[x] && x !== ustPeriods(1)[0]),
        d = k && ustDue(k);
      if (d && daysTo(d) <= 14)
        add(daysTo(d) <= 3 ? 0 : 2, uiText("bn_ust", { d: D(d) }), uiText("bn_ust_s", { a: E(Math.max(0, ustCalc(k).kz83)) }), uiText("bn_look"), "data-ustopen");
    }
  } catch (_) {}
  try {
    const eo = erOpenList().filter((i) => i.due && daysTo(i.due) <= 7);
    if (eo.length)
      add(
        eo.some((i) => daysTo(i.due) < 0) ? 0 : 2,
        uiText(eo.length === 1 ? "bn_er1" : "bn_er", { n: String(eo.length) }),
        E(eo.reduce((s, i) => s + i.pay, 0)),
        uiText("bn_look"),
        "data-eropen"
      );
  } catch (_) {}
  try {
    const ao = anList().filter((o) => o.st === "open" && daysTo(o.valid) >= 0 && daysTo(o.valid) <= 3);
    if (ao.length) add(3, uiText("bn_an", { n: ao[0].kunde || "–" }), D(ao[0].valid), uiText("bn_look"), "data-anopen");
  } catch (_) {}
  if (!L.length) return "";
  const top = L.sort((a, b) => a.prio - b.prio).slice(0, 3);
  return `<div class="bfnext" role="list"><div class="bfnh"><span class="bfnm">${mamiAvatar ? mamiAvatar(null) : ""}</span><b data-noi18n>${escHtml(uiText("bn_h"))}</b></div>${top
    .map(
      (x) =>
        `<div class="bfni" role="listitem"><span class="grow"><b data-noi18n>${escHtml(x.t)}</b>${x.s ? `<small data-noi18n>${escHtml(x.s)}</small>` : ""}</span><button type="button" class="btn sm primary" ${x.attr}>${escHtml(x.btn)}</button></div>`
    )
    .join("")}</div>`;
}
const BF_MAIN = /data-(rchopen|anopen|eropen|kdopen)\b/;
function berufDuo(el, tiles, T, exJ, exB, hints) {
  const tl = (t) =>
    t.k === "kunden"
      ? kdTile()
      : areaTile(
          svgIcon(t.icon, 22),
          typeof TL_ !== "undefined" && TL_[t.k] ? TL_[t.k][0] : t.title,
          t.short ? escHtml(String(t.short)) : "",
          `data-anaopen="${escHtml(t.k)}"`
        );
  const keysB = new Set(BF_BIZ),
    J = tiles
      .filter((t) => !keysB.has(t.k))
      .map(tl)
      .concat(exJ),
    Bk = [...BF_BIZ]
      .map((k) => T.find((t) => t.k === k))
      .filter(Boolean)
      .map(tl);
  const all = exB.concat(Bk),
    rest = all.filter((h) => !BF_MAIN.test(h)),
    B = [
      bizNext(),
      ...all.filter((h) => BF_MAIN.test(h)),
      rest.length
        ? `<div class="bflist"><h3 class="bflh">${uiText("bn_tax")}</h3>${rest.map((h) => h.replace('class="atile"', 'class="bfrow"').replace(/<\/button>$/, `${svgIcon("right", 16)}</button>`)).join("")}</div>`
        : "",
    ];
  hints = hints.filter((h) => !/data-rvrec=/.test(h));
  const M = bfMonth(ui.ym),
    mn = fxDate(ui.ym + "-01", {
      month: "long",
    }),
    tot = M.job + M.biz,
    side = bfSide(),
    E = (v) => escHtml(fmtEur0(v));
  const band = (k, icn, t, sub, btn) =>
    `<div class="bfband bf${k}" data-bfband="${k}" role="button" tabindex="0" aria-label="${escHtml(t)}"><span class="bfbi">${svgIcon(icn, 20)}</span><span class="bfbt"><b data-noi18n>${escHtml(t)}</b><small data-noi18n>${escHtml(sub)}</small></span>${btn}</div>`;
  const bJ = band(
    "j",
    "case",
    uiText("bf_job"),
    uiText("bf_job_s", {
      n: fmtEur0(M.job),
      m: mn,
    }),
    ""
  );
  const bB = band(
    "b",
    "store",
    uiText("bf_biz"),
    uiText("bf_biz_s", {
      n: fmtEur0(M.rev),
      m: mn,
    }),
    ""
  );
  el.innerHTML = `<div class="bftop"><div class="card bfinc"><div class="bfih">${svgIcon("chart", 17)}<b data-noi18n>${escHtml(
    uiText("bf_inc", {
      m: mn,
    })
  )}</b><span data-noi18n>${E(tot)}</span></div>
    <div class="bfbar" role="img" aria-label="${escHtml(uiText("bf_inc_job"))} ${E(M.job)}, ${escHtml(uiText("bf_inc_biz"))} ${E(M.biz)}"><i class="j" style="--w:${tot ? (M.job / tot) * 100 : 50}%"></i><i class="b" style="--w:${tot ? (M.biz / tot) * 100 : 50}%"></i></div>
    <div class="bfleg" data-noi18n><span><i class="j"></i>${escHtml(uiText("bf_inc_job"))} <b>${E(M.job)}</b></span><span><i class="b"></i>${escHtml(uiText("bf_inc_biz"))} <b>${E(M.biz)}</b></span></div>${hints.length ? `<div class="bfhl" role="list" aria-label="${escHtml(uiText("bf_todo"))}">${hints.slice(0, 3).join("")}</div>` : ""}</div></div>
  <div class="bfsw ${side === "b" ? "sb" : "sj"}" id="bfsw"><div class="bfbands">${bJ}${bB}</div><div class="bfhint" aria-hidden="true">${svgIcon("chev", 14)}<span data-noi18n>${escHtml(uiText("bf_swipe"))}</span></div>
   <div class="bfgrids"><div class="agrid bfg bfgj">${J.join("")}</div><div class="agrid bfg bfgb">${B.join("")}</div></div></div>
`;
  try {
    if (localStorage.getItem("hb-bfside")) $("bfsw").classList.add("known");
  } catch (_) {}
  bfWire();
}
function bfSwap(to, anim) {
  const w = $("bfsw");
  if (!w) return;
  const cur = w.classList.contains("sb") ? "b" : "j";
  to = to || (cur === "j" ? "b" : "j");
  if (to === cur) return;
  try {
    localStorage.setItem("hb-bfside", to);
  } catch (_) {}
  const duo = getComputedStyle(w).getPropertyValue("--bfduo").trim() === "1",
    still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (duo || still || !anim || !document.body.animate) {
    w.classList.toggle("sb", to === "b");
    w.classList.toggle("sj", to === "j");
    return;
  }
  if (w._busy) return;
  w._busy = 1;
  SND.play("whoosh");
  try {
    navigator.vibrate && navigator.vibrate(8);
  } catch (_) {}
  const front = w.querySelector(cur === "j" ? ".bfj" : ".bfb"),
    back = w.querySelector(cur === "j" ? ".bfb" : ".bfj"),
    gOut = w.querySelector(cur === "j" ? ".bfgj" : ".bfgb"),
    gIn = w.querySelector(cur === "j" ? ".bfgb" : ".bfgj");
  const E = "cubic-bezier(.32,.72,.2,1)";
  front.animate(
    [
      {
        transform: "translateY(var(--bfdy,0px)) scale(1)",
        opacity: 1,
      },
      {
        transform: "translateY(var(--bfoff)) scale(.92)",
        opacity: 0.42,
      },
    ],
    {
      duration: 520,
      easing: E,
    }
  );
  back.animate(
    [
      {
        transform: "translateY(var(--bfoff)) scale(.92)",
        opacity: 0.42,
      },
      {
        transform: "translateY(calc(var(--bfoff) + 14px)) scale(.95)",
        opacity: 0.7,
        offset: 0.35,
      },
      {
        transform: "translateY(0) scale(1)",
        opacity: 1,
      },
    ],
    {
      duration: 560,
      easing: E,
    }
  );
  setTimeout(() => {
    w.classList.toggle("sb", to === "b");
    w.classList.toggle("sj", to === "j");
  }, 260);
  gOut.style.visibility = "visible";
  gIn.style.visibility = "visible";
  [...gOut.children].forEach((c, k) =>
    c.animate(
      [
        {
          transform: "none",
          opacity: 1,
        },
        {
          transform: "translateX(-115%) rotate(-5deg)",
          opacity: 0,
        },
      ],
      {
        duration: 360,
        delay: k * 32,
        easing: "cubic-bezier(.55,0,.8,.2)",
        fill: "both",
      }
    )
  );
  const n = gIn.children.length;
  [...gIn.children].forEach((c, k) =>
    c.animate(
      [
        {
          transform: "translateX(115%) rotate(5deg)",
          opacity: 0,
        },
        {
          transform: "translateX(-4%) rotate(-.6deg)",
          opacity: 1,
          offset: 0.75,
        },
        {
          transform: "none",
          opacity: 1,
        },
      ],
      {
        duration: 560,
        delay: 140 + k * 38,
        easing: "cubic-bezier(.2,.8,.3,1)",
        fill: "both",
      }
    )
  );
  setTimeout(
    () => {
      [...gOut.children, ...gIn.children].forEach((c) => c.getAnimations().forEach((a) => a.cancel()));
      gOut.style.visibility = "";
      gIn.style.visibility = "";
      w._busy = 0;
    },
    140 + n * 38 + 600
  );
}
function bfWire() {
  const w = $("bfsw");
  if (!w) return;
  const bands = w.querySelector(".bfbands");
  let y0 = null,
    dy = 0,
    id = null;
  bands.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".bfbtn")) return;
    y0 = e.clientY;
    dy = 0;
    id = e.pointerId;
  });
  bands.addEventListener("pointermove", (e) => {
    if (y0 == null || e.pointerId !== id) return;
    dy = Math.max(0, e.clientY - y0);
    if (dy > 4) {
      const f = w.querySelector(w.classList.contains("sb") ? ".bfb" : ".bfj");
      f.style.setProperty("--bfdy", Math.min(60, dy) * 0.55 + "px");
      f.classList.add("drag");
    }
  });
  const up = (e) => {
    if (y0 == null) return;
    const f = w.querySelector(".bfband.drag");
    if (f) {
      f.classList.remove("drag");
      f.style.removeProperty("--bfdy");
    }
    const t = e.target.closest(".bfband"),
      backTap = dy < 6 && t && !t.classList.contains(w.classList.contains("sb") ? "bfb" : "bfj");
    if (dy > 34 || backTap) {
      bfSwap(null, true);
    }
    y0 = null;
  };
  bands.addEventListener("pointerup", up);
  bands.addEventListener("pointercancel", () => {
    y0 = null;
    const f = w.querySelector(".bfband.drag");
    if (f) {
      f.classList.remove("drag");
      f.style.removeProperty("--bfdy");
    }
  });
  bands.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      const t = e.target.closest(".bfband");
      if (t) {
        e.preventDefault();
        bfSwap(t.dataset.bfband, true);
      }
    }
  });
}
function renderBeruf() {
  const el = document.querySelector(`[data-view="beruf"]`);
  if (!el) return;
  const y = Number(ui.ym.slice(0, 4)),
    g = anaGrp();
  try {
    const keep = ui.anaSel;
    ui.anaSel = "";
    renderYear();
    ui.anaSel = keep;
  } catch (e) {
    console.warn("beruf", e);
  }
  const T = ui.anaTiles || [],
    keys = [...g[1]];
  if (hasSelf()) for (const k of ["kunden", "euer"]) if (!keys.includes(k)) keys.push(k);
  const tiles = [...new Set(keys)].map((k) => T.find((t) => t.k === k)).filter(Boolean);
  const W = store.settings.work,
    staat = W === "alg" || W === "grusi",
    J = staat ? jlCfg() : null;
  const showTax =
      keys.includes("tax") &&
      (hasSelf() || ["angestellt", "beamte", "beides"].includes(store.settings.work || "beides")),
    tax = showTax ? taxCalc(y) : null,
    E = (v) => escHtml(fmtEur0(v));
  const hero = tax
    ? `<button type="button" class="ahero beruf ${tax.due > 0.5 ? "due" : ""}" data-anaopen="tax"><small>Steuer ${y} · Schätzung</small><b>${Math.abs(tax.due) < 1 ? "± 0 €" : tax.due < 0 ? `+${E(-tax.due)} zurück` : `${E(tax.due)} nachzahlen`}</b><span>${hasSelf() ? `<span>Gewinn ${E(tax.gewinn)}</span>${tax.resBal ? ` · <span>Rücklage ${E(tax.resBal)}</span>` : ""}` : "Tippen für die Rechnung"}</span></button>`
    : staat
      ? `<button type="button" class="ahero beruf amt" data-accgo="amt"><small>${escHtml((GPROF[W] || {}).amt || g[0])}</small><b>${Number(J.amount) > 0 ? E(J.amount) : "Betrag eintragen"}</b><span>${Number(J.amount) > 0 ? "im Monat" : "Tippen zum Eintragen"}</span></button>`
      : tiles[0]
        ? `<button type="button" class="ahero beruf" data-anaopen="${escHtml(tiles[0].k)}"><small>${g[0]}</small><b>${tiles[0].short ? escHtml(String(tiles[0].short)) : tiles[0].title}</b><span>${tiles[0].sub || ""}</span></button>`
        : "";
  const hints = [];
  if (staat) {
    const td = isoToday(),
      up = (J.terms || [])
        .filter((t) => t.d >= td)
        .sort((a, b) => a.d.localeCompare(b.d))
        .filter((t) => dLeft(t.d) <= 14);
    for (const t of up.slice(0, 2))
      hints.push(
        `<button type="button" class="ahint" data-anaopen="terms">📅 <span><span>${escHtml(t.n)}</span> · <span>${escHtml(kDate(t.d))}</span></span></button>`
      );
    if (up.length && W === "grusi")
      hints.push(
        `<div class="ahint g">ℹ️ <span>Termin verpasst ohne wichtigen Grund? Dann kann das Geld gekürzt werden – sag lieber vorher ab.</span></div>`
      );
  }
  if (tax && tax.AF && tax.AF.open.length)
    hints.push(
      `<button type="button" class="ahint" data-afaopen="${escHtml(tax.AF.open[0].id)}">📦 <span>${tax.AF.open.length === 1 ? "1 größere Anschaffung prüfen" : `${tax.AF.open.length} größere Anschaffungen prüfen`}</span></button>`
    );
  if (hasSelf()) {
    try {
      for (const r of rvRecDue().slice(0, 2))
        hints.push(
          `<button type="button" class="ahint" data-rvrec="${escHtml(r.id)}">${svgIcon("repeat", 16)} <span data-noi18n>${escHtml(
            uiText("rv_rec_due", {
              n: r.kunde || "–",
            })
          )}</span></button>`
        );
    } catch (_) {}
  }
  if (hasSelf()) {
    const K = kundenOf(y);
    if (K.list.length && K.tot > 0 && K.list[0].sum / K.tot > 0.5)
      hints.push(
        `<button type="button" class="ahint" data-anaopen="kunden">👥 <span>${Math.round((K.list[0].sum / K.tot) * 100)} % deiner Einnahmen kommen von einem Kunden</span></button>`
      );
  }
  if ((hasSelf() || hasJob()) && !hoCfg(y).on && y === new Date().getFullYear())
    hints.push(
      `<button type="button" class="ahint g" data-hoopen>${svgIcon("home", 16)} <span>Arbeitest du zu Hause? Homeoffice eintragen</span></button>`
    );
  const extra = [];
  if (staat) {
    const m = bwMonth(ymOf(new Date())),
      g2 = Number(bwCfg().goal) || 0,
      wj = jlCfg(),
      wn = wj.bwzEnd ? daysTo(wj.bwzEnd) : null;
    extra.push(
      areaTile(
        svgIcon("repeat", 22),
        escHtml(uiText("wb_h")),
        wj.bwzEnd
          ? wj.wbDone === wj.bwzEnd
            ? "✓"
            : escHtml(
                fxDate(wj.bwzEnd, {
                  day: "numeric",
                  month: "short",
                })
              )
          : escHtml(uiText("wb_end")),
        "data-wbopen"
      )
    );
    extra.push(
      areaTile(svgIcon("send", 22), "Bewerbungen", `${m.length}${g2 ? " / " + g2 : ""} im Monat`, "data-bwopen")
    );
  }
  if (isJobless()) {
    const j = jlCfg(),
      up = (j.terms || []).filter((t) => !t.done && t.d >= isoToday()).sort((a, c) => a.d.localeCompare(c.d))[0],
      mini = Number(j.mini) || 0;
    extra.push(
      areaTile(
        svgIcon("clock", 22),
        "Termine & Fristen",
        up
          ? escHtml(
              dLong(up.d, {
                day: "numeric",
                month: "short",
              })
            )
          : "keine offen",
        "data-tmopen"
      ),
      areaTile(
        svgIcon("cashplus", 22),
        "Zuverdienst",
        mini ? "+" + escHtml(fmtEur0(jlKeep(mini))) : "Rechner",
        "data-zvopen"
      ),
      areaTile(
        svgIcon("doccheck", 22),
        "Bescheid-Check",
        (j.bescheide || []).length
          ? escHtml(
              fmtEur0(
                (j.bescheide.slice().sort((a, c) => (c.from || "").localeCompare(a.from || ""))[0] || {}).total || 0
              )
            )
          : "scannen",
        "data-bsopen"
      )
    );
  }
  const duo = hasJob() && hasSelf() && !staat,
    exB = [],
    exJ = [];
  if (hasSelf()) {
    const io = rchList().filter((i) => !i.paid),
      od = rchOver().length;
    (duo ? exB : extra).push(
      areaTile(
        svgIcon("docout", 22),
        escHtml(uiText("rch_h")),
        od
          ? escHtml(
              uiText("rch_over_n", {
                n: String(od),
              })
            )
          : io.length
            ? `${io.length} · ${escHtml(fmtEur0(io.reduce((s, i) => s + i.amt, 0)))}`
            : escHtml(uiText("rch_new")),
        "data-rchopen"
      )
    );
    const ao = anList().filter((o) => o.st === "open");
    (duo ? exB : extra).push(
      areaTile(
        svgIcon("doc", 22),
        escHtml(uiText("an_h")),
        ao.length ? `${ao.length} · ${escHtml(fmtEur0(ao.reduce((s, o) => s + o.amt, 0)))}` : escHtml(uiText("an_new")),
        "data-anopen"
      )
    );
    const eo = erOpenList(),
      eod = eo.filter((i) => i.due && daysTo(i.due) < 0).length;
    (duo ? exB : extra).push(
      areaTile(
        svgIcon("docin", 22),
        escHtml(uiText("er_h")),
        eod
          ? escHtml(uiText("rch_over_n", { n: String(eod) }))
          : eo.length
            ? `${eo.length} · ${escHtml(fmtEur0(eo.reduce((s, i) => s + i.pay, 0)))}`
            : escHtml(uiText("er_tile_s0")),
        "data-eropen"
      )
    );
    if (!store.settings.kleinunternehmer) {
      const uk = ustPeriods(2).find((k) => !ustCfg().done[k] && k !== ustPeriods(1)[0]);
      (duo ? exB : extra).push(
        areaTile(
          svgIcon("doctax", 22),
          escHtml(uiText("tx_tab_ust")),
          uk
            ? escHtml(
                uiText("ust_tile", {
                  a: fmtEur0(Math.max(0, ustCalc(uk).kz83)),
                  d: fxDate(ustDue(uk), { day: "numeric", month: "short" }),
                })
              )
            : escHtml(uiText("ust_tile_ok")),
          "data-ustopen"
        )
      );
    }
    (duo ? exB : extra).push(
      areaTile(svgIcon("bank", 22), escHtml(uiText("dv_h")), escHtml(uiText("dv_tile_s")), "data-dvopen")
    );
  }
  {
    const BL = brList().filter((x) => !x.done),
      bn = BL.map(brNext).filter(Boolean).sort()[0];
    (duo ? exJ : extra).push(
      areaTile(
        svgIcon("mail", 22),
        escHtml(uiText("br_title")),
        BL.length
          ? `${BL.length} ${escHtml(uiText("br_open"))}${
              bn
                ? " · " +
                  escHtml(
                    fxDate(bn, {
                      day: "numeric",
                      month: "short",
                    })
                  )
                : ""
            }`
          : escHtml(uiText("br_tile_s0")),
        "data-bropen"
      )
    );
  }
  if (hasSelf() || hasJob()) {
    const SL = stbSorted(),
      l0 = SL[0],
      v0 = l0 ? stbAmt(l0) : 0;
    (duo ? exJ : extra).push(
      areaTile(
        svgIcon("doctax", 22),
        escHtml(uiText("stb_title")),
        l0
          ? `${v0 > 0 ? "+" : v0 < 0 ? "−" : "±"}${escHtml(fmtEur0(Math.abs(v0)))} · ${escHtml(String(l0.year))}`
          : escHtml(uiText("stb_tile_s0")),
        "data-stbopen"
      )
    );
    for (const x of SL) {
      const w = dLeft(stbWid(x));
      if (w != null && w >= 0 && w <= 14) {
        hints.unshift(
          `<button type="button" class="ahint" data-stbopen>${svgIcon("doctax", 16)} <span data-noi18n>${escHtml(
            uiText("stb_h_ein", {
              y: String(x.year),
              n: String(w),
            })
          )}</span></button>`
        );
        break;
      }
    }
  }
  if (
    hasSelf() ||
    ["angestellt", "beamte", "beides", "azubi"].includes(store.settings.work || "beides") ||
    hasExtra("angestellt")
  ) {
    const H = hoCalc(y);
    (duo ? exJ : extra).push(
      areaTile(svgIcon("home", 22), "Homeoffice", H.on ? escHtml(fmtEur0(H.amt)) : "eintragen", "data-hoopen")
    );
  }
  if (duo) return berufDuo(el, tiles, T, exJ, exB, hints);
  el.innerHTML = `${hero}${hints.length ? `<div class="ahints">${hints.slice(0, 3).join("")}</div>` : ""}
    <div class="card areacard">${areaHead(g[0], hasJob() || hasSelf() ? "steuer" : "amt", "Einstellungen")}<div class="agrid">${tiles
      .filter((t) => !(tax && t.k === "tax" && false))
      .map((t) =>
        t.k === "kunden"
          ? kdTile()
          : areaTile(
              svgIcon(t.icon, 22),
              typeof TL_ !== "undefined" && TL_[t.k] ? TL_[t.k][0] : t.title,
              t.short ? escHtml(String(t.short)) : "",
              `data-anaopen="${escHtml(t.k)}"`
            )
      )
      .join("")}${extra.join("")}</div></div>`;
}
function zukSaved() {
  const goals = store.settings.goals || [],
    g = sum(goals, (x) => goalSaved(x).v) || 0,
    td = isoOf(new Date());
  let sp = 0,
    nsp = 0;
  try {
    const known = new Set(accountNames());
    for (const n of Object.keys(store.settings.accountAnchors || {})) {
      if (n === "Hauptkonto" || !known.has(n)) continue;
      const v = accountBalance(n, td) || 0;
      if (v > 0) {
        sp += v;
        nsp++;
      }
    }
  } catch (_) {}
  let iv = 0;
  try {
    for (const x of investState().goals || []) {
      const r = (x.real || []).slice().sort((a, b) => a.d.localeCompare(b.d));
      if (r.length) iv += Number(r[r.length - 1].v) || 0;
    }
  } catch (_) {}
  const parts = [];
  if (goals.length)
    parts.push(
      uiText(goals.length === 1 ? "zk_p_goal1" : "zk_p_goals", {
        n: String(goals.length),
        a: fmtEur0(g),
      })
    );
  if (nsp)
    parts.push(
      uiText("zk_p_spaces", {
        a: fmtEur0(sp),
      })
    );
  if (iv > 0)
    parts.push(
      uiText("zk_p_inv", {
        a: fmtEur0(iv),
      })
    );
  return {
    tot: g + sp + iv,
    parts,
  };
}
function renderZukunft() {
  const el = document.querySelector(`[data-view="zukunft"]`);
  if (!el) return;
  const goals = store.settings.goals || [],
    saved = sum(goals, (g) => goalSaved(g).v),
    debts = sum(store.debts, (d) => debtState(d).remaining),
    E = (v) => escHtml(fmtEur0(v));
  const sv = zukSaved(),
    dS = store.debts.map((d) => ({
      d,
      s: debtState(d),
    })),
    rate = sum(dS, (x) => x.s.rate || 0),
    net = sv.tot - debts,
    V = store.settings.zukHero || "C";
  const cardS = `<div class="acard zsave" data-ci="0"><div class="l">${escHtml(uiText("zk_saved"))}</div><div class="b">${E(sv.tot)}</div><div class="m"><span>${escHtml(sv.parts.join(" · ") || uiText("zk_saved0"))}</span></div></div>`;
  const cardD = `<div class="acard zdebt ${debts > 0 ? "minus" : "zdone"}" data-ci="1"><div class="l">${escHtml(uiText("zk_debts"))}</div><div class="b">${debts > 0 ? "−" + E(debts) : E(0)}</div><div class="m"><span>${
    debts > 0
      ? escHtml(
          uiText((rate > 0 ? "zk_debts_s" : "zk_debts_c") + (store.debts.length === 1 ? "1" : ""), {
            n: String(store.debts.length),
            r: fmtEur0(rate),
          })
        )
      : escHtml(uiText("zk_debts0"))
  }</span></div></div>`;
  const cardN = `<div class="acard alt znet" data-ci="2"><div class="l">${escHtml(uiText("zk_net"))}</div><div class="b">${Math.abs(net) < 0.005 ? "" : net > 0 ? "+" : "−"}${E(Math.abs(net))}</div><div class="m"><span>${escHtml(uiText(sv.tot < 0.005 && debts < 0.005 ? "zk_net_0" : net >= 0 ? "zk_net_p" : "zk_net_m"))}</span></div></div>`;
  const cards = V === "C" ? [cardS, cardD, cardN] : [cardS, cardD];
  const netBar =
    V === "B" && debts > 0
      ? `<div class="znetbar"><span>${escHtml(uiText("zk_net"))}</span><b class="${net >= 0 ? "pos" : "neg"}">${net >= 0 ? "+" : "−"}${E(Math.abs(net))}</b><i><em style="width:${Math.max(4, Math.min(100, (sv.tot / Math.max(1, sv.tot + debts)) * 100)).toFixed(1)}%"></em></i></div>`
      : "";
  el.innerHTML = `<div class="zhero ${IS_PC ? "pc" : ""} v${V}">${IS_PC ? `<div class="zgrid">${cards.join("")}</div>` : `<div class="astack" id="zstack" tabindex="0" aria-label="${escHtml(uiText("zk_swipe"))}">${cards.join("")}</div><div class="adots" id="zdots">${cards.map((_, i) => `<button data-cdot="${i}" aria-label="${i + 1}"><i></i></button>`).join("")}</div>`}${netBar}</div>
<div class="card areacard">${areaHead("Sparen &amp; Schulden", "invest", "Einstellungen Sparen")}<div class="agrid">
      ${areaTile(svgIcon("piggy", 22), "Ziele", goals.length ? `${goals.length}` : "anlegen", 'data-go="ziele"')}
      ${areaTile(svgIcon("chart", 22), uiText("zk_invest_t"), "Zinseszins & Vergleich", 'data-spopen="invest"')}
      ${areaTile(svgIcon("bank", 22), "Schulden", debts > 0 ? E(debts) : "keine", 'data-spopen="schulden"')}
      ${(() => {
        const tt = srTotal(),
          on = SR_DEF.some(([k]) => (srCfg()[k] || {}).on);
        return areaTile(svgIcon("coins", 22), "Sparregeln", on ? E(tt) : "einschalten", "data-sropen");
      })()}</div></div>
    ${goalsRings()}${ui.goalsOpen || ui.goalEdit ? goalsCard() : ""}${(store.debts || []).length ? debtRings() : ""}${invTile()}`;
}

/* Bausteine: Kinder */
const KG_Y = {
  2024: 250,
  2025: 255,
  2026: 259,
};
function kgRate(y) {
  y = Number(y);
  const ks = Object.keys(KG_Y).map(Number).sort();
  let v = KG_Y[ks[0]];
  for (const k of ks) if (y >= k) v = KG_Y[k];
  return v;
}
function kidsList() {
  return (store.settings.kids || []).filter((k) => k && (k.born || k.name));
}
function kgEnd(k) {
  const b = Number(k.born) || 0;
  if (!b) return null;
  return b + (k.edu ? 25 : 18);
}
function kidsSum(y) {
  y = y || new Date().getFullYear();
  const r = kgRate(y);
  return (
    kidsList().filter((k) => {
      const e = kgEnd(k);
      return !e || e >= y;
    }).length * r
  );
}
const KUI = {
  d: null,
};
function kidsOpen() {
  KUI.d = clone(store.settings.kids || []);
  if (!KUI.d.length)
    KUI.d = [
      {
        name: "",
        born: "",
      },
    ];
  let bg = $("kidBg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "kidBg";
    bg.className = "hobg";
    bg.innerHTML = `<div class="hosh" role="dialog" aria-modal="true"><div class="hohd"><b>Kinder & Kindergeld</b><button class="hox" data-kidclose aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="hobody" id="kidBody"></div></div>`;
    document.body.appendChild(bg);
  }
  bg.hidden = false;
  KUI.lk = !document.body.classList.contains("locked");
  document.body.classList.add("locked");
  kidsRender();
  requestAnimationFrame(() => bg.classList.add("show"));
}
function kidsClose(save) {
  const bg = $("kidBg");
  if (!bg) return;
  if (save) {
    store.settings.kids = KUI.d.filter((k) => (k.name || "").trim() || k.born);
    saveSettings();
    render();
  }
  bg.classList.remove("show");
  if (KUI.lk) document.body.classList.remove("locked");
  setTimeout(() => {
    bg.hidden = true;
  }, 200);
}
function kidsRender() {
  const b = $("kidBody");
  if (!b) return;
  const y = new Date().getFullYear(),
    r = kgRate(y),
    E = (v) => escHtml(fmtEur0(v));
  const act = KUI.d.filter((k) => {
    const e = kgEnd(k);
    return (k.name || k.born) && (!e || e >= y);
  }).length;
  b.innerHTML = `<p class="hosub">Kindergeld ${y}: ${E(r)} pro Kind und Monat</p>
    ${KUI.d
      .map((k, i) => {
        const e = kgEnd(k);
        return `<div class="hocard kidc"><div class="hofr"><input class="in" data-kidn="${i}" value="${escHtml(k.name || "")}" placeholder="Name" aria-label="Name"><input class="in" data-kidb="${i}" inputmode="numeric" maxlength="4" value="${escHtml(k.born || "")}" placeholder="Geburtsjahr" aria-label="Geburtsjahr"><button type="button" class="hox" data-kiddel="${i}" aria-label="Entfernen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <label class="kidedu"><input type="checkbox" data-kide="${i}" ${k.edu ? "checked" : ""}> <span>In Ausbildung / Studium (Kindergeld bis 25)</span></label>
      ${e ? `<p class="small muted" style="margin:4px 0 6px">Kindergeld bis ${e}${e < y ? " – schon vorbei" : ""}</p>` : ""}</div>`;
      })
      .join("")}
    <button type="button" class="hosug" data-kidadd>+ Kind hinzufügen</button>
    <div class="hores"><span><small>Kindergeld im Monat</small>${act === 1 ? "1 Kind" : `${act} Kinder`}</span><b>${E(act * r)}</b></div>
    ${store.settings.work === "grusi" ? `<div class="notice warn" style="margin-top:10px"><span>Bei Grundsicherung wird das Kindergeld beim Kind als Einkommen angerechnet – rechne nicht mit zusätzlichem Geld.</span></div>` : ""}
    <div class="afabtns"><button type="button" class="btn" data-kidclose>Abbrechen</button><button type="button" class="btn primary" data-kidok>Speichern</button></div>`;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-kidsopen]")) {
    e.preventDefault();
    kidsOpen();
    return;
  }
  const bg = $("kidBg");
  if (!bg || bg.hidden) return;
  if (e.target === bg || e.target.closest("[data-kidclose]")) {
    kidsClose(false);
    return;
  }
  if (e.target.closest("[data-kidok]")) {
    kidsClose(true);
    toast("Gespeichert");
    return;
  }
  if (e.target.closest("[data-kidadd]")) {
    KUI.d.push({
      name: "",
      born: "",
    });
    kidsRender();
    return;
  }
  const d = e.target.closest("[data-kiddel]");
  if (d) {
    KUI.d.splice(+d.dataset.kiddel, 1);
    kidsRender();
    return;
  }
});
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.kidn != null) {
    KUI.d[+t.dataset.kidn].name = t.value;
  } else if (t.dataset.kidb != null) {
    KUI.d[+t.dataset.kidb].born = t.value.replace(/\D/g, "").slice(0, 4);
  }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.kidb != null || t.dataset.kide != null) {
    if (t.dataset.kide != null) KUI.d[+t.dataset.kide].edu = t.checked;
    kidsRender();
  }
});

/* Bewerbungen (Arbeitslos / Grundsicherung) */
const BW_ST = [
  ["sent", "Gesendet", "📨"],
  ["talk", "Gespräch", "🗣️"],
  ["no", "Absage", "❌"],
  ["yes", "Zusage", "🎉"],
];
function bwCfg() {
  return (
    store.settings.bewerb || {
      goal: 0,
      list: [],
    }
  );
}
function bwMonth(ym) {
  return (bwCfg().list || []).filter((x) => (x.d || "").startsWith(ym));
}
const BUI = {};
function bwOpen() {
  let bg = $("bwBg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "bwBg";
    bg.className = "hobg";
    bg.innerHTML = `<div class="hosh" role="dialog" aria-modal="true"><div class="hohd"><b>Bewerbungen</b><button class="hox" data-bwclose aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="hobody" id="bwBody"></div></div>`;
    document.body.appendChild(bg);
  }
  bg.hidden = false;
  BUI.lk = !document.body.classList.contains("locked");
  document.body.classList.add("locked");
  bwRender();
  requestAnimationFrame(() => bg.classList.add("show"));
}
function bwClose() {
  const bg = $("bwBg");
  if (!bg) return;
  bg.classList.remove("show");
  if (BUI.lk) document.body.classList.remove("locked");
  setTimeout(() => {
    bg.hidden = true;
  }, 200);
  render();
}
async function bwSave(c) {
  store.settings.bewerb = c;
  await saveSettings();
}
function bwRender() {
  const b = $("bwBody");
  if (!b) return;
  const c = bwCfg(),
    ym = ymOf(new Date()),
    m = bwMonth(ym),
    g = Number(c.goal) || 0,
    mn = cCap(
      new Intl.DateTimeFormat(cLoc(), {
        month: "long",
      }).format(new Date())
    );
  const list = (c.list || []).slice().sort((a, b) => (b.d || "").localeCompare(a.d || ""));
  b.innerHTML = `<div class="hocard"><div class="hofr"><span><b>${mn}: ${m.length}${g ? ` <span>von ${g}</span>` : ""}</b><br><span class="small muted">Ziel aus deiner Vereinbarung mit dem Amt</span></span><span class="afayr"><button type="button" data-bwgoal="-1" aria-label="Ziel weniger">−</button><b>${g || "–"}</b><button type="button" data-bwgoal="1" aria-label="Ziel mehr">+</button></span></div>${g ? `<div class="hoprog"><i style="width:${Math.min(100, (m.length / g) * 100)}%"></i></div>` : ""}</div>
    <div class="hocard"><div class="hofr"><input class="in" id="bwFirm" placeholder="Firma" aria-label="Firma" style="max-width:none;text-align:start"><button type="button" class="btn primary" data-bwadd style="flex:none">+ Neu</button></div></div>
    <div class="hosec">Alle Bewerbungen</div>
    ${
      list.length
        ? list
            .map(
              (
                x
              ) => `<div class="hocard bwr"><div class="hofr"><span><b>${escHtml(x.f)}</b><br><span class="small muted">${escHtml(kDate(x.d))}</span></span><button type="button" class="hox" data-bwdel="${escHtml(x.id)}" aria-label="Löschen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <div class="hoseg bwseg">${BW_ST.map(([k, l, i]) => `<button type="button" class="${x.s === k ? "on" : ""}" data-bwst="${escHtml(x.id)}|${k}">${i} ${l}</button>`).join("")}</div></div>`
            )
            .join("")
        : `<p class="small muted" style="margin:6px 4px">Noch keine Bewerbung eingetragen. Die Liste hilft dir auch als Nachweis fürs Amt.</p>`
    }
    <p class="small muted" style="margin:10px 4px 0">Tipp: Fahrt- und Bewerbungskosten kann dir das Amt oft erstatten – frag vorher nach.</p>`;
}
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-bwopen]")) {
    e.preventDefault();
    bwOpen();
    return;
  }
  const bg = $("bwBg");
  if (!bg || bg.hidden) return;
  if (e.target === bg || e.target.closest("[data-bwclose]")) {
    bwClose();
    return;
  }
  const c = clone(bwCfg());
  c.list = c.list || [];
  const gl = e.target.closest("[data-bwgoal]");
  if (gl) {
    c.goal = Math.max(0, Math.min(40, (Number(c.goal) || 0) + Number(gl.dataset.bwgoal)));
    await bwSave(c);
    bwRender();
    return;
  }
  if (e.target.closest("[data-bwadd]")) {
    const f = ($("bwFirm").value || "").trim();
    if (!f) {
      $("bwFirm").focus();
      return;
    }
    c.list.push({
      id: newId(),
      f,
      d: isoToday(),
      s: "sent",
    });
    await bwSave(c);
    bwRender();
    return;
  }
  const st = e.target.closest("[data-bwst]");
  if (st) {
    const [id, k] = st.dataset.bwst.split("|"),
      x = c.list.find((y) => y.id === id);
    if (x) x.s = k;
    await bwSave(c);
    bwRender();
    return;
  }
  const dl = e.target.closest("[data-bwdel]");
  if (dl) {
    c.list = c.list.filter((y) => y.id !== dl.dataset.bwdel);
    await bwSave(c);
    bwRender();
    return;
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "bwFirm") {
    e.preventDefault();
    const b = document.querySelector("[data-bwadd]");
    if (b) b.click();
  }
});

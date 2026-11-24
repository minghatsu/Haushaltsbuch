/* Render */
WIDE.addEventListener("change", () => render());
let BG_RENDER = false;
function typingNow() {
  const a = document.activeElement;
  return (
    !!a &&
    (a.tagName === "TEXTAREA" ||
      a.tagName === "SELECT" ||
      (a.tagName === "INPUT" && !/^(checkbox|radio|button|submit|file)$/i.test(a.type)))
  );
}
document.addEventListener("focusout", () => {
  if (ui.renderPending)
    setTimeout(() => {
      if (ui.renderPending && !typingNow()) {
        ui.renderPending = false;
        render();
      }
    }, 150);
});
function render() {
  if (BG_RENDER && typingNow()) {
    ui.renderPending = true;
    return;
  }
  if (SND._v && SND._v !== ui.view) SND.play("nav");
  SND._v = ui.view;
  $("greet").innerHTML = greetHTML();
  renderAvatar();
  try {
    dupWatch();
  } catch (_) {}
  TITLES.beruf = berufLbl();
  $("viewTitle").textContent = TITLES[ui.view];
  areaTabs();
  {
    const sub = AREA_SUB.has(ui.view);
    $("backBtn").hidden = !sub;
    document.body.classList.toggle("subview", sub);
  }
  fillMonthPill();
  $("monthpill").style.visibility = ui.view === "more" || ui.view === "import" ? "hidden" : "visible";
  document.body.classList.toggle("nomonth", ui.view === "more" || ui.view === "import");
  $("settingsBtn").setAttribute("aria-pressed", String(ui.view === "more"));
  document
    .querySelectorAll(".tab[data-go]")
    .forEach((b) => b.setAttribute("aria-selected", String(b.dataset.go === (AREA_PARENT[ui.view] ?? ui.view))));
  try {
    navPill(true);
  } catch (_) {}
  document
    .querySelectorAll("[data-view]:not(.cubing)")
    .forEach((s) => (s.hidden = s.dataset.view !== ui.view && !(s.id === "v-gemeinsam" && SPS.open === "gemeinsam")));
  $("banner").innerHTML =
    mem && !LOCAL
      ? `<div class="notice warn" style="margin-bottom:14px"><span>Speichern ist hier gerade nicht möglich. Öffne die App bitte neu.</span></div>`
      : "";
  if (!(render.keep && FRESH[ui.view] === freshKey()))
    ({
      beruf: renderBeruf,
      zukunft: () => {
        renderZukunft();
        geraetRuf("sparenGezeichnet");
      },
      home: renderHome,
      list: renderList,
      fix: renderFix,
      year: renderYear,
      ziele: renderZiele,
      shop: renderShop,
      more: renderMore,
      import: renderImport,
      belege: renderBelege,
      gemeinsam: renderGemeinsam,
    })[ui.view]();
  render.keep = false;
  FRESH[ui.view] = freshKey();
  if (!$("sheetBg").hidden) renderSheet();
  applyTabColors();
  if (ui.tileEdit && ui.tileEdit !== ui.view) ui.tileEdit = "";
  if (ui.view === "more" && ui.sp && !spsOpen() && SP_PAGES[ui.sp]) {
    const k = ui.sp;
    ui.sp = null;
    accGo(k);
  } else if (SPS.open === "gemeinsam") {
    if (ui.view !== "gemeinsam")
      try {
        renderGemeinsam();
      } catch (_) {}
  } else if (ui.view !== "more" && spsOpen() && SPS.open !== "profil" && SHEET_SP.includes(SPS.open)) {
    try {
      renderMore();
    } catch (_) {}
    spSubRender(SPS.open);
  } else if (ui.view !== "more" && spsOpen()) {
    $("spBg").hidden = true;
    $("spBg").classList.remove("show");
    spSheetRestore();
    SPS.open = null;
    ui.sp = null;
  }
  notifyPlanSoon();
  if (dankeShould())
    setTimeout(() => {
      if (dankeShould()) dankeOpen();
    }, 500);
  if (wizShould())
    setTimeout(() => {
      if (wizShould()) wizOpen();
    }, 400);
  try {
    if (TOUR.i >= 0 && TOUR.page && PTOUR[TOUR.page] && TOUR.page !== ui.view && !["danke", "mami"].includes(TOUR.page))
      tourCloseNow();
  } catch (_) {}
  try {
    ptourBtn();
    ptourAuto();
  } catch (e) {
    console.warn("ptour", e);
  }
  try {
    if (store.tx.length || store.fixed.length) mbAuto();
  } catch (e) {
    console.warn("mb", e);
  }
  try {
    uxEnter();
  } catch (e) {}
}
function tlRow(t, when) {
  const isIn = t.kind === "einnahme" || (t.kind === "umbuchung" && t._k0 === "einnahme"),
    title = t.note || t.cat || KIND_LABEL[t.kind];
  const sub = [
    when || "",
    t.note ? t.cat : "",
    t.kind === "betrieb"
      ? "Betrieblich"
      : t.kind === "vorauszahlung"
        ? "aus Rücklage"
        : t.kind === "abhebung"
          ? "→ Bargeld"
          : t.kind === "umbuchung"
            ? "Umschuldung · zählt nicht"
            : "",
    t.pay === "bar" ? "💶 bar" : "",
    isIn && t.net != null && Math.abs(t.net - t.amount) > 0.004 ? `netto ${fmtEur(t.net)}` : "",
    t.acct && t.acct !== "Hauptkonto" ? t.acct : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `<button class="tlrow ${isIn ? "inc" : ""} k-${escHtml(t.kind)}" data-edit="${escHtml(t.id)}"><span class="grow"><b>${escHtml(title)}${t.nobon && !hasReceipt(t.id) ? ` <span class="nobon">BON FEHLT</span>` : ""}${hasReceipt(t.id) ? ` <svg class="i clip" viewBox="0 0 24 24" style="width:13px;height:13px;vertical-align:-1px" aria-label="mit Beleg"><path d="M16.5 7.5 9 15a2.1 2.1 0 0 1-3-3l8-8a3.5 3.5 0 0 1 5 5l-8.5 8.5a5 5 0 0 1-7-7L11 3.5"/></svg>` : ""}</b>${sub ? `<span class="small muted">${escHtml(sub)}</span>` : ""}</span><span class="amt ${isIn ? "pos" : ""}">${isIn ? "+" : "−"} ${escHtml(fmtEur(t.amount))}</span></button>`;
}
function sortTx(list) {
  return list.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.ts || 0) - (a.ts || 0));
}
function emptyState(iconName, title, text, btn) {
  return `<div class="empty"><span class="ictile">${svgIcon(iconName, 24)}</span><div><b>${title}</b><br><span class="small">${text}</span></div>${btn || ""}</div>`;
}
function donut(items, total) {
  const R = 52,
    C = 2 * Math.PI * R;
  let off = 0;
  const segs = items.slice(0, 6).map((x, i) => {
    const v = (x.v / total) * C,
      col = ["var(--c5)", "var(--c1)", "var(--c2)", "var(--c4)", "var(--c3)", "var(--c6)"][i];
    const el = `<circle r="${R}" cx="68" cy="68" fill="none" stroke="${col}" stroke-width="20" stroke-dasharray="${Math.max(0, v - 1.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 68 68)"/>`;
    off += v;
    return {
      el,
      col,
      x,
    };
  });
  const rest = items.slice(6);
  if (rest.length) {
    const v = (sum(rest, (x) => x.v) / total) * C;
    segs.push({
      el: `<circle r="${R}" cx="68" cy="68" fill="none" stroke="var(--line)" stroke-width="20" stroke-dasharray="${v} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 68 68)"/>`,
      col: "var(--line)",
      x: {
        label: "Rest",
        v: sum(rest, (x) => x.v),
      },
    });
  }
  return `<div class="donutwrap"><svg class="donut" viewBox="0 0 136 136" role="img" aria-label="Ausgaben nach Kategorie"><circle r="${R}" cx="68" cy="68" fill="none" stroke="var(--sunk)" stroke-width="20"/>${segs.map((s) => s.el).join("")}<text x="68" y="66" text-anchor="middle" font-size="17" font-weight="800" fill="var(--fg)" font-family="Inter, sans-serif">${escHtml(fmtEur0(total))}</text><text x="68" y="84" text-anchor="middle" font-size="12.5" fill="var(--muted)" font-family="Inter, sans-serif">ausgegeben</text></svg>
    <div class="dleg">${segs.map((s) => `<div><i style="background:${s.col}"></i><span>${escHtml(s.x.label || s.x.cat)}</span><b>${escHtml(fmtEur0(s.x.v))}</b></div>`).join("")}</div></div>`;
}
function monthGroups(ym) {
  const c = monthCalc(ym),
    groups = {};
  for (const t of c.tx) {
    if (t.kind === "ausgabe" || t.kind === "betrieb") {
      const k = t.kind + "|" + (t.cat || "Sonstiges");
      (groups[k] = groups[k] || {
        v: 0,
        kind: t.kind,
        cat: t.cat || "Sonstiges",
      }).v += t.amount;
    }
  }
  if (c.fixPaid)
    groups["fix"] = {
      v: c.fixPaid,
      kind: "fix",
      cat: "Fixkosten",
      label: "Fixkosten",
    };
  if (c.vz)
    groups["vz"] = {
      v: c.vz,
      kind: "vorauszahlung",
      cat: "Steuer",
      label: "Steuer-Vorauszahlung",
    };
  const budgets = store.settings.budgets || {};
  for (const [cat, b] of Object.entries(budgets))
    if (b > 0 && cats("ausgabe").includes(cat) && !groups["ausgabe|" + cat])
      groups["ausgabe|" + cat] = {
        v: 0,
        kind: "ausgabe",
        cat,
      };
  for (const x of Object.values(groups)) if (x.kind === "ausgabe" && budgets[x.cat] > 0) x.budget = budgets[x.cat];
  return Object.values(groups).sort((a, b) => b.v - a.v || (b.budget || 0) - (a.budget || 0));
}
function insightLine(ym) {
  const cur = ymOf(new Date()),
    prev = shiftYm(ym, -1),
    dayNow = new Date().getDate();
  const per = (y, cut) => {
    const o = {};
    for (const t of monthCalc(y).tx) {
      if (t.kind !== "ausgabe" && t.kind !== "betrieb") continue;
      if (cut && Number(t.date.slice(8, 10)) > dayNow) continue;
      o[t.cat || "Sonstiges"] = (o[t.cat || "Sonstiges"] || 0) + t.amount;
    }
    return o;
  };
  const a = per(ym, false),
    b = per(prev, ym === cur);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (!Object.keys(b).length || !Object.keys(a).length) return "";
  const d = [...keys]
    .map((k) => [k, (a[k] || 0) - (b[k] || 0)])
    .filter((x) => Math.abs(x[1]) >= 10)
    .sort((x, y) => x[1] - y[1]);
  if (!d.length) return "";
  const pm = MONTHS[ymParts(prev)[1] - 1],
    down = d[0][1] < 0 ? d[0] : null,
    up = d[d.length - 1][1] > 0 ? d[d.length - 1] : null;
  const bit = (x) => `${fmtEur0(Math.abs(x[1]))} ${x[1] < 0 ? "weniger" : "mehr"} für ${x[0]}`;
  if (down && up)
    return `<b>${escHtml(bit(down))}</b> als im ${escHtml(pm)}${ym === cur ? " (bis heute)" : ""} – dafür ${escHtml(bit(up))}.`;
  return `<b>${escHtml(bit(down || up))}</b> als im ${escHtml(pm)}${ym === cur ? " (bis heute)" : ""}.`;
}
function sparkPath(name, asOf) {
  const end = new Date(asOf + "T12:00:00"),
    pts = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const v = accountBalance(name, isoOf(d));
    if (v === null) return "";
    pts.push(v);
  }
  const mn = Math.min(...pts),
    mx = Math.max(...pts),
    rg = mx - mn || 1;
  if (mx - mn < 0.01) return "";
  return pts
    .map((v, i) => `${i ? "L" : "M"}${((i / 29) * 300).toFixed(1)} ${(40 - ((v - mn) / rg) * 34).toFixed(1)}`)
    .join(" ");
}
function budgetStreak(ym) {
  const budgets = store.settings.budgets || {},
    B = sum(
      Object.entries(budgets).filter(([c, b]) => b > 0 && cats("ausgabe").includes(c)),
      (x) => Number(x[1])
    );
  if (!(B > 0)) return null;
  const D = daysIn(ym),
    today = new Date().getDate(),
    per = new Array(D + 1).fill(0);
  for (const t of monthCalc(ym).tx)
    if (t.kind === "ausgabe" && budgets[t.cat] > 0) per[Number(t.date.slice(8, 10))] += t.amount;
  const ok = [];
  let cum = 0;
  for (let d = 1; d <= today; d++) {
    cum += per[d];
    ok[d] = cum <= (B * d) / D + 0.005;
  }
  let n = 0;
  for (let d = today; d >= 1 && ok[d]; d--) n++;
  let best = n;
  try {
    best = Math.max(n, Number(localStorage.getItem("hb-streak-best")) || 0);
    localStorage.setItem("hb-streak-best", String(best));
  } catch (e) {}
  return {
    n,
    best,
    ok,
    today,
  };
}
function moneyFlowCard(ym) {
  const c = monthCalc(ym),
    cur = ymOf(new Date()),
    g = monthGroups(ym),
    gTot = sum(g, (x) => x.v) || 1,
    gMax = g.length && g[0].v ? g[0].v : 1;
  const bColor = (x) => (x.v > x.budget ? "var(--bad)" : x.v >= x.budget * 0.8 ? "var(--warn)" : "var(--accent)");
  const days = ym === cur ? daysIn(ym) - new Date().getDate() + 1 : ym > cur ? daysIn(ym) : 1;
  return `<div class="card">
      <div class="card-head"><h2>${headIcon("chart")}Wohin dein Geld fließt</h2><span class="small muted">${escHtml(monthName(ym))}</span></div>
      ${
        g.some((x) => x.v > 0)
          ? donut(
              g.filter((x) => x.v > 0),
              gTot
            )
          : ""
      }
      ${g.length ? g.map((x) => (x.budget ? `<div class="catrow">${tile(x.kind, x.cat)}<div class="grow"><div class="top-l"><span>${escHtml(x.label || x.cat)}</span><span>${escHtml(fmtEur(x.v))} <span class="small muted">von ${escHtml(fmtEur0(x.budget))}</span></span></div><div class="sub"><div class="track"><div class="fill" style="width:${Math.max(x.v ? 3 : 0, Math.min(100, (x.v / x.budget) * 100))}%;background:${bColor(x)}"></div></div><span class="pct" style="${x.v >= x.budget * 0.8 ? `color:${bColor(x)};font-weight:800` : ""}">${Math.round((x.v / x.budget) * 100)} %</span></div>${x.v > x.budget ? `<div class="small" style="color:var(--bad);margin-top:3px">${escHtml(fmtEur(x.v - x.budget))} über dem Budget</div>` : ym === cur && days ? `<div class="small muted" style="margin-top:3px">noch ${escHtml(fmtEur(x.budget - x.v))} · ${escHtml(fmtEur(Math.max(0, x.budget - x.v) / days))} pro Tag</div>` : ""}</div></div>` : `<div class="catrow">${tile(x.kind, x.cat)}<div class="grow"><div class="top-l"><span>${escHtml(x.label || x.cat)}${x.kind === "betrieb" ? ` <span class="small muted">· Betrieb</span>` : ""}</span><span>${escHtml(fmtEur(x.v))}</span></div><div class="sub"><div class="track"><div class="fill" style="width:${Math.max(3, (x.v / gMax) * 100)}%;background:${catColor(x.kind, x.cat)}"></div></div><span class="pct">${Math.round((x.v / gTot) * 100)} %</span></div></div></div>`)).join("") : emptyState("basket", "Noch nichts ausgegeben", "Tipp auf das Plus, um deine erste Ausgabe einzutragen.")}
    </div>`;
}

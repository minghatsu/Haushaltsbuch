/* Sparen & Anlegen */
const INV_DEF = {
  calc: {
    P: 1000,
    m: 100,
    r: 5,
    y: 20,
  },
  plan: {
    T: 20000,
    y: 8,
    r: 5,
    P: 0,
  },
  cmp: {
    m: 100,
    y: 15,
    r: [0.5, 2.5, 7],
    cost: false,
    tax: true,
  },
  goals: [],
};
function investState() {
  const s = store.settings.inv || {};
  return {
    calc: {
      ...INV_DEF.calc,
      ...(s.calc || {}),
    },
    plan: {
      ...INV_DEF.plan,
      ...(s.plan || {}),
    },
    cmp: {
      ...INV_DEF.cmp,
      ...(s.cmp || {}),
      r: (s.cmp && s.cmp.r) || INV_DEF.cmp.r,
    },
    goals: s.goals || [],
  };
}
let invSaveT = null;
function invSet(fn, now) {
  const v = investState();
  fn(v);
  store.settings.inv = v;
  clearTimeout(invSaveT);
  invSaveT = setTimeout(
    () => {
      saveSettings();
    },
    now ? 0 : 700
  );
}
function invRun(P, m, r, y) {
  const q = (Number(r) || 0) / 1200;
  let s = Number(P) || 0,
    inn = s;
  const out = [[inn, s]];
  for (let k = 1; k <= Math.round(y * 12); k++) {
    s = s * (1 + q) + (Number(m) || 0);
    inn += Number(m) || 0;
    if (k % 12 === 0) out.push([inn, s]);
  }
  return out;
}
function invRate(T, P, r, months) {
  const q = (Number(r) || 0) / 1200,
    n = Math.max(1, months);
  if (!q) return Math.max(0, (T - P) / n);
  const g = Math.pow(1 + q, n);
  return Math.max(0, ((T - P * g) * q) / (g - 1));
}
const invTax = (gain, etf) => Math.max(0, gain * (etf ? 0.7 : 1) - 1000) * 0.26375;
const invE = (v) => fmtEur0(Math.round(v));
const invPct = (v) => String(Math.round(v * 10) / 10).replace(".", ",");
function invArea(d, W, H) {
  const mx = Math.max(1, d[d.length - 1][1]) * 1.04,
    X = (i) => (i / (d.length - 1 || 1)) * W,
    Y = (v) => H - (v / mx) * H;
  const pts = (k) => d.map((p, i) => `L${X(i).toFixed(1)} ${Y(p[k]).toFixed(1)}`).join(" ");
  return `<path d="M0 ${H} ${pts(1)} L${W} ${H} Z" fill="#c98a12" opacity=".78"/><path d="M0 ${H} ${pts(0)} L${W} ${H} Z" fill="var(--accent)"/>`;
}
const INV_COL = ["#9ca3af", "#3d63a8", "var(--accent)"],
  INV_NAME = ["Sparbuch", "Tagesgeld", "ETF-Sparplan"];
function invCmpData(c) {
  return c.r.map((r, i) => {
    const eff = r - (c.cost && i === 2 ? 0.2 : 0),
      d = invRun(0, c.m, eff, c.y),
      L = d[d.length - 1];
    let end = L[1];
    if (c.tax) end -= invTax(L[1] - L[0], i === 2);
    return {
      i,
      r,
      d,
      end,
      inn: L[0],
    };
  });
}
function invLines(D, W, H, withPaid) {
  const mx = Math.max(1, ...D.map((x) => x.d[x.d.length - 1][1])) * 1.06,
    X = (i, n) => (i / (n - 1 || 1)) * W,
    Y = (v) => H - (v / mx) * H;
  return (
    D.map(
      (x) =>
        `<polyline fill="none" stroke="${INV_COL[x.i]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${x.d.map((p, i) => `${X(i, x.d.length).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ")}"/>`
    ).join("") +
    (withPaid
      ? `<polyline fill="none" stroke="var(--muted)" stroke-dasharray="3 4" stroke-width="1.5" points="${D[0].d.map((p, i) => `${X(i, D[0].d.length).toFixed(1)},${Y(p[0]).toFixed(1)}`).join(" ")}"/>`
      : "")
  );
}
const ymNum = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + m - 1;
};
const numYm = (n) => `${Math.floor(n / 12)}-${pad((n % 12) + 1)}`;
function invGoal(g) {
  const now = ymNum(ymOf(new Date())),
    s = ymNum(g.from || ymOf(new Date())),
    e = Math.max(s + 1, ymNum(g.until)),
    n = e - s,
    m = invRate(g.T, g.P || 0, g.r, n);
  const planAt = (k) => {
    const q = (Number(g.r) || 0) / 1200;
    let v = g.P || 0;
    for (let i = 0; i < k; i++) v = v * (1 + q) + m;
    return v;
  };
  const real = (g.real || []).slice().sort((a, b) => a.d.localeCompare(b.d)),
    last =
      (real.length ? real[real.length - 1].v : g.P || 0) + invTxSum(g.id, real.length ? real[real.length - 1].d : ""),
    passed = Math.max(0, Math.min(n, now - s)),
    pl = planAt(passed);
  const miles = [0.25, 0.5, 0.75, 1].map((f) => {
    let k = 0;
    while (k < n && planAt(k) < g.T * f) k++;
    return {
      v: g.T * f,
      ym: numYm(s + k),
      done: last >= g.T * f,
    };
  });
  return {
    m,
    n,
    s,
    e,
    planAt,
    real,
    last,
    pl,
    ok: last >= pl * 0.97,
    miles,
    left: e - now,
  };
}
const ymLabel = (ym) => `${MSHORT[ymParts(ym)[1] - 1]} ${ym.slice(0, 4)}`;
function invGoalChart(g, G, W, H) {
  const mx = g.T * 1.08,
    X = (k) => (k / G.n) * W,
    Y = (v) => H - (Math.min(v, mx) / mx) * H;
  let pl = "";
  for (let k = 0; k <= G.n; k += Math.max(1, Math.round(G.n / 40)))
    pl += `${X(k).toFixed(1)},${Y(G.planAt(k)).toFixed(1)} `;
  pl += `${W},${Y(G.planAt(G.n)).toFixed(1)}`;
  const rp = [[0, g.P || 0], ...G.real.map((r) => [Math.max(0, ymNum(r.d.slice(0, 7)) - G.s), r.v])];
  return `<line x1="0" x2="${W}" y1="${Y(g.T)}" y2="${Y(g.T)}" stroke="#c98a12" stroke-dasharray="4 4"/><polyline fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4" opacity=".7" points="${pl}"/>${G.real.length ? `<polyline fill="none" stroke="var(--accent)" stroke-width="3.5" stroke-linecap="round" points="${rp.map(([k, v]) => `${X(k).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}"/>` : ""}`;
}
const invRange = (key, val, min, max, step, unit, label) =>
  `<div class="invsl"><label><span>${label}</span><span class="invv"><input class="invnum" data-inv="${key}" value="${invPct(val)}" inputmode="decimal" aria-label="${label}"> ${unit}</span></label><input type="range" data-inv="${key}" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${label}"></div>`;
function invCalcOut(c) {
  const d = invRun(c.P, c.m, c.r, c.y),
    L = d[d.length - 1];
  return `<div class="invbig">${invE(L[1])}</div><div class="small muted">nach ${c.y} ${c.y == 1 ? "Jahr" : "Jahren"} bei ${invPct(c.r)} % Zins</div><svg class="invch" viewBox="0 0 300 110" preserveAspectRatio="none">${invArea(d, 300, 110)}</svg><div class="invleg"><span><i style="background:var(--accent)"></i>eingezahlt <b>${invE(L[0])}</b></span><span><i style="background:#c98a12"></i>Zinsen <b>${invE(L[1] - L[0])}</b></span></div>`;
}
function invPlanOut(p) {
  const n = Math.round(p.y * 12),
    m = invRate(p.T, p.P, p.r, n),
    inn = (p.P || 0) + m * n;
  if (m <= 0)
    return `<div class="small muted">Gute Nachricht</div><div class="invbig" style="color:var(--accent)">Schon erreicht</div><div class="small muted">Dein vorhandenes Geld wächst bei ${invPct(p.r)} % in ${p.y} ${p.y == 1 ? "Jahr" : "Jahren"} von allein auf ${invE(invRun(p.P, 0, p.r, p.y).pop()[1])} – ganz ohne monatliche Rate.</div>`;
  return `<div class="small muted">Dafür brauchst du</div><div class="invbig" style="color:var(--accent)">${invE(m)} <small>im Monat</small></div><div class="small muted">Eingezahlt ${invE(inn)} · Zinsen ${invE(Math.max(0, p.T - inn))}</div><button class="btn small" data-invgoalfrom="1" style="margin-top:10px">+ Als Anlage-Ziel speichern</button>`;
}
function invCmpOut(c) {
  const D = invCmpData(c);
  return `<svg class="invch" viewBox="0 0 300 120" preserveAspectRatio="none">${invLines(D, 300, 120, true)}</svg><div class="small muted" style="margin:2px 0 8px">- - - eingezahlt ${invE(D[0].inn)}</div>${D.map((x) => `<div class="invrow"><i style="background:${INV_COL[x.i]}"></i><span class="grow"><b>${INV_NAME[x.i]}</b><small><input class="invnum s" data-inv="cmp.r.${x.i}" value="${invPct(x.r)}" inputmode="decimal" aria-label="Zins ${INV_NAME[x.i]}"> % pro Jahr</small></span><b>${invE(x.end)}</b></div>`).join("")}`;
}
function invGoalsHtml(v) {
  const G = v.goals;
  return `${G.map((g, gi) => {
    const R = invGoal(g);
    return `<div class="invgoal"><div class="invgh"><b>${escHtml(g.name || "Anlage-Ziel")}</b><span class="invchip ${R.ok ? "ok" : "warn"}">${R.ok ? "im Plan ✓" : "hinter dem Plan"}</span><button class="invdel" data-invgdel="${gi}" aria-label="Ziel löschen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <div class="small muted">${invE(g.T)} bis ${ymLabel(numYm(R.e))} · ${invPct(g.r)} % Zins · <b style="color:var(--accent)">${invE(R.m)} im Monat</b></div>
      <svg class="invch" viewBox="0 0 300 90" preserveAspectRatio="none">${invGoalChart(g, R, 300, 90)}</svg>
      <div class="invleg"><span>- - Plan</span><span><i style="background:var(--accent)"></i>wirklich angelegt</span></div>
      <div class="invmiles">${R.miles.map((x) => `<span class="${x.done ? "on" : ""}"><i></i>${invE(x.v)}<small>${ymLabel(x.ym)}</small></span>`).join("")}</div>
      <div class="invreal"><span class="small muted">Was ist heute drin?</span><input class="in" data-invreal="${gi}" inputmode="decimal" placeholder="${escHtml(numStr(Math.round(R.last)))}" aria-label="Heutiger Wert"><button class="btn small" data-invrealok="${gi}">Eintragen</button></div></div>`;
  }).join("")}
    ${ui.invNewGoal ? `<div class="invgoal invform"><b>Neues Anlage-Ziel</b><label>Name<input class="in" id="invgN" placeholder="z. B. Eigenkapital Wohnung" value="${escHtml(ui.invNewGoal.name || "")}"></label><div class="grid2"><label>Ziel<input class="in" id="invgT" inputmode="decimal" value="${escHtml(numStr(ui.invNewGoal.T || 10000))}"></label><label>Bis<input class="in" id="invgU" type="month" value="${escHtml(ui.invNewGoal.until || numYm(ymNum(ymOf(new Date())) + 60))}"></label><label>Zins % pro Jahr<input class="in" id="invgR" inputmode="decimal" value="${escHtml(invPct(ui.invNewGoal.r ?? 4))}"></label><label>Schon angelegt<input class="in" id="invgP" inputmode="decimal" value="${escHtml(numStr(ui.invNewGoal.P || 0))}"></label></div><div class="row-btns"><button class="btn" data-invgcancel="1">Abbrechen</button><button class="btn primary" data-invgsave="1">Anlegen</button></div></div>` : `<button class="invnew" data-invgnew="1">+ Anlage-Ziel anlegen</button>`}`;
}
function renderInvest() {
  const el = $("investEd");
  if (!el) return;
  if ((el.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName)) || pdHold(el))
    return;
  const v = investState(),
    t = ui.invTab || "calc",
    sub = ui.invSub || "calc";
  const alles = geraetRuf("anlegenAllesZeigen");
  el.innerHTML = `<div class="invtabs" role="tablist" ${alles ? "hidden" : ""}>${[
    ["calc", "Zinseszins"],
    ["cmp", "Vergleich"],
    ["goals", "Anlage-Ziele"],
  ]
    .map(
      ([k, l]) =>
        `<button role="tab" data-invtab="${k}" aria-selected="${t === k}" class="${t === k ? "on" : ""}">${l}</button>`
    )
    .join("")}</div>
    <div class="invbody">${(() => {
      const secCalc = `<div class="invsub">${[
        ["calc", "Was wird daraus?"],
        ["plan", "Ziel planen"],
      ]
        .map(([k, l]) => `<button data-invsub="${k}" class="${sub === k ? "on" : ""}">${l}</button>`)
        .join("")}</div>
      ${sub === "calc" ? `<div class="invgrid"><div class="invout" id="invOutA">${invCalcOut(v.calc)}</div><div class="invin">${invRange("calc.P", v.calc.P, 0, 100000, 500, "€", "Startbetrag")}${invRange("calc.m", v.calc.m, 0, 2000, 10, "€", "Pro Monat")}${invRange("calc.r", v.calc.r, 0, 12, 0.1, "%", "Zins pro Jahr")}${invRange("calc.y", v.calc.y, 1, 50, 1, "J.", "Jahre")}</div></div>` : `<div class="invgrid"><div class="invout" id="invOutA">${invPlanOut(v.plan)}</div><div class="invin">${invRange("plan.T", v.plan.T, 1000, 500000, 500, "€", "Ich möchte")}${invRange("plan.y", v.plan.y, 1, 40, 1, "J.", "in Jahren")}${invRange("plan.r", v.plan.r, 0, 12, 0.1, "%", "Zins pro Jahr")}${invRange("plan.P", v.plan.P, 0, 100000, 500, "€", "Schon vorhanden")}</div></div>`}`;
      const secCmp = `<div class="invgrid"><div class="invout" id="invOutB">${invCmpOut(v.cmp)}</div><div class="invin">${invRange("cmp.m", v.cmp.m, 10, 2000, 10, "€", "Pro Monat")}${invRange("cmp.y", v.cmp.y, 1, 40, 1, "J.", "Jahre")}
          <label class="invck"><input type="checkbox" data-invck="cost" ${v.cmp.cost ? "checked" : ""}> ETF-Kosten 0,2 % pro Jahr abziehen</label><label class="invck"><input type="checkbox" data-invck="tax" ${v.cmp.tax ? "checked" : ""}> Steuer beim Verkauf abziehen (vereinfacht)</label></div></div>`;
      if (alles)
        return `<div class="invpc"><section><h3>Zinseszins</h3>${secCalc}</section><section><h3>Anlagen im Vergleich</h3>${secCmp}</section><section><h3>Anlage-Ziele</h3>${invGoalsHtml(v)}</section></div>`;
      return t === "calc" ? secCalc : t === "cmp" ? secCmp : invGoalsHtml(v);
    })()}</div>
    <p class="small muted invnote">Rechenbeispiele ohne Gewähr – keine Anlageberatung. Zinsen und Kurse schwanken, bei Aktien und ETFs sind auch Verluste möglich.</p>`;
}
function invTile() {
  const v = investState(),
    t = ui.invTileTab === "goals" ? "calc" : ui.invTileTab || "calc";
  let body = "";
  if (t === "goals" && v.goals.length) {
    const g = v.goals[0],
      R = invGoal(g);
    body = `<div class="invgh"><b>${escHtml(g.name || "Anlage-Ziel")}</b><span class="invchip ${R.ok ? "ok" : "warn"}">${R.ok ? "im Plan ✓" : "hinter dem Plan"}</span></div><div class="small muted">${invE(R.last)} von ${invE(g.T)} · ${invE(R.m)} im Monat</div><div class="track" style="margin-top:8px;height:9px"><div class="fill" style="width:${Math.min(100, (R.last / g.T) * 100)}%;background:var(--accent)"></div></div>`;
  } else if (t === "cmp") {
    const D = invCmpData(v.cmp);
    body = `<div class="small muted">${invE(v.cmp.m)} im Monat · ${v.cmp.y} Jahre</div><div class="invbig s">${invE(Math.min(...D.map((x) => x.end)))} – ${invE(Math.max(...D.map((x) => x.end)))}</div><svg class="invch s" viewBox="0 0 300 60" preserveAspectRatio="none">${invLines(D, 300, 60, true)}</svg><div class="invleg">${D.map((x) => `<span><i style="background:${INV_COL[x.i]}"></i>${INV_NAME[x.i]}</span>`).join("")}</div>`;
  } else {
    const c = v.calc,
      d = invRun(c.P, c.m, c.r, c.y),
      L = d[d.length - 1];
    body = `<div class="invbig s">${invE(L[1])}</div><div class="small muted">${invE(c.m)} im Monat · ${c.y} Jahre · ${invPct(c.r)} % · davon ${invE(L[1] - L[0])} Zinsen</div><svg class="invch s" viewBox="0 0 300 56" preserveAspectRatio="none">${invArea(d, 300, 56)}</svg>`;
  }
  return `<div class="card invtile"><div class="card-head"><h2>${headIcon("piggy")}Sparen &amp; Anlegen</h2><button class="link" data-anlopen="1">Öffnen ${svgIcon("right", 16)}</button></div>
    <div class="invsub s">${[
      ["calc", "Zinseszins"],
      ["cmp", "Vergleich"],
    ]
      .map(
        ([k, l]) =>
          `<button data-invtile="${k}" class="${t === k || (k === "calc" && t === "goals" && !v.goals.length) ? "on" : ""}">${l}</button>`
      )
      .join("")}</div>
    ${t === "goals" && !v.goals.length ? `<p class="small muted" style="margin:6px 0">Noch kein Anlage-Ziel. Leg eins an, dann siehst du hier Plan gegen Wirklichkeit.</p><button class="btn small" data-anlopen="goals">+ Ziel anlegen</button>` : body}</div>`;
}
const INV_LIM = {
  P: [0, 10000000],
  m: [0, 100000],
  r: [0, 30],
  y: [1, 60],
  T: [1, 100000000],
};
function invLive(key, raw) {
  let v = parseAmt(String(raw));
  if (!isFinite(v)) return;
  const f = key.split(".")[1],
    lim = INV_LIM[f] || [0, 30];
  v = Math.min(lim[1], Math.max(lim[0], v));
  if (f === "y") v = Math.round(v);
  invSet((o) => {
    const [a, b, c] = key.split(".");
    if (c != null) o[a][b][+c] = v;
    else o[a][b] = v;
  });
  document.querySelectorAll(`[data-inv="${key}"]`).forEach((x) => {
    if (x !== document.activeElement || x.type === "range") {
      if (x.type === "range") x.value = v;
      else if (x !== document.activeElement) x.value = invPct(v);
    }
  });
  const w = investState(),
    o = $(key.startsWith("cmp") ? "invOutB" : "invOutA");
  if (o)
    o.innerHTML = key.startsWith("calc")
      ? invCalcOut(w.calc)
      : key.startsWith("plan")
        ? invPlanOut(w.plan)
        : invCmpOut(w.cmp);
}
document.addEventListener("input", (e) => {
  const k = e.target.dataset && e.target.dataset.inv;
  if (!k) return;
  if (e.target.type === "range") invLive(k, e.target.value);
  else if (!/cmp\.r\./.test(k)) invLive(k, e.target.value);
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.inv) {
    invLive(t.dataset.inv, t.value);
    if (t.type !== "range") {
      const k = t.dataset.inv.split("."),
        o = investState(),
        v = k[2] != null ? o[k[0]][k[1]][+k[2]] : o[k[0]][k[1]];
      t.value = invPct(v);
      t.blur();
    }
    invSet(() => {}, true);
    return;
  }
  if (t.dataset && t.dataset.invck) {
    invSet((o) => {
      o.cmp[t.dataset.invck] = t.checked;
    }, true);
    const o = $("invOutB");
    if (o) o.innerHTML = invCmpOut(investState().cmp);
    return;
  }
});
document.addEventListener("click", async (e) => {
  const inInv = e.target.closest("#investEd");
  if (inInv && document.activeElement && inInv.contains(document.activeElement) && !e.target.closest("input,select"))
    document.activeElement.blur();
  const tb = e.target.closest("[data-invtab]");
  if (tb) {
    ui.invTab = tb.dataset.invtab;
    renderInvest();
    return;
  }
  const sb = e.target.closest("[data-invsub]");
  if (sb) {
    ui.invSub = sb.dataset.invsub;
    renderInvest();
    return;
  }
  const tt = e.target.closest("[data-invtile]");
  if (tt) {
    ui.invTileTab = tt.dataset.invtile;
    const c = tt.closest(".invtile");
    if (c) c.outerHTML = invTile();
    return;
  }
  const op = e.target.closest("[data-anlopen]");
  if (op) {
    ui.invTab =
      op.dataset.anlopen === "goals"
        ? "goals"
        : ui.invTileTab === "goals"
          ? "goals"
          : ui.invTileTab === "cmp"
            ? "cmp"
            : "calc";
    if (op.dataset.anlopen === "goals") ui.invNewGoal = {};
    spSheetOpen("invest");
    return;
  }
  if (e.target.closest("[data-invgnew]")) {
    ui.invNewGoal = {};
    renderInvest();
    setTimeout(() => {
      const n = $("invgN");
      if (n) n.focus();
    }, 30);
    return;
  }
  if (e.target.closest("[data-invgcancel]")) {
    ui.invNewGoal = null;
    renderInvest();
    return;
  }
  if (e.target.closest("[data-invgoalfrom]")) {
    const p = investState().plan;
    ui.invTab = "goals";
    ui.invNewGoal = {
      T: p.T,
      r: p.r,
      P: p.P,
      until: numYm(ymNum(ymOf(new Date())) + Math.round(p.y * 12)),
    };
    renderInvest();
    setTimeout(() => {
      const n = $("invgN");
      if (n) n.focus();
    }, 30);
    return;
  }
  if (e.target.closest("[data-invgsave]")) {
    const T = parseAmt($("invgT").value),
      r = parseAmt($("invgR").value),
      P = parseAmt($("invgP").value || "0"),
      U = $("invgU").value;
    if (!(T > 0)) {
      toast("Bitte ein Ziel in Euro eingeben");
      return;
    }
    if (!U || U <= ymOf(new Date())) {
      toast("Bitte einen Monat in der Zukunft wählen");
      return;
    }
    const g = {
      id: newId(),
      name: $("invgN").value.trim() || "Anlage-Ziel",
      T: round2(T),
      until: U,
      r: isFinite(r) ? r : 0,
      P: isFinite(P) ? P : 0,
      from: ymOf(new Date()),
      real: [],
    };
    document.activeElement && document.activeElement.blur();
    ui.invNewGoal = null;
    invSet((o) => {
      o.goals = [...o.goals, g];
    }, true);
    renderInvest();
    toast("Anlage-Ziel angelegt");
    return;
  }
  const gd = e.target.closest("[data-invgdel]");
  if (gd) {
    if (gd.dataset.armed !== "1") {
      gd.dataset.armed = "1";
      gd.classList.add("arm");
      gd.textContent = "Löschen?";
      setTimeout(() => {
        if (gd.isConnected) {
          gd.dataset.armed = "";
          gd.classList.remove("arm");
          gd.textContent = "✕";
        }
      }, 3000);
      return;
    }
    const i = +gd.dataset.invgdel;
    invSet((o) => {
      o.goals = o.goals.filter((_, k) => k !== i);
    }, true);
    renderInvest();
    toast("Ziel gelöscht");
    return;
  }
  const ro = e.target.closest("[data-invrealok]");
  if (ro) {
    const i = +ro.dataset.invrealok,
      inp = document.querySelector(`[data-invreal="${i}"]`),
      v = parseAmt(inp && inp.value);
    if (!isFinite(v)) {
      toast("Bitte den heutigen Wert eingeben");
      return;
    }
    inp.blur();
    invSet((o) => {
      const g = o.goals[i];
      const d = isoToday();
      g.real = [
        ...(g.real || []).filter((x) => x.d !== d),
        {
          d,
          v: round2(v),
        },
      ];
    }, true);
    renderInvest();
    toast("Eingetragen");
    return;
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.dataset && e.target.dataset.invreal != null) {
    e.preventDefault();
    const b = document.querySelector(`[data-invrealok="${e.target.dataset.invreal}"]`);
    if (b) b.click();
  }
  if (e.key === "Enter" && e.target.closest && e.target.closest(".invform")) {
    e.preventDefault();
    const b = document.querySelector("[data-invgsave]");
    if (b) b.click();
  }
});

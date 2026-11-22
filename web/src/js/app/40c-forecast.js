/* ---------- Vorschau / Kontostand-Kurve ---------- */
function fcMainBal() {
  const has = (store.settings.accountAnchors || {})["Hauptkonto"];
  if (has) {
    const b = accountBalance("Hauptkonto", isoToday());
    if (b != null) return b;
  }
  return yearCum(ymOf(new Date())).balance;
}
/* Was in die Vorschau einfließt – selbst wählbar (Standard: alles außer Spaces) */
function fcCfg() {
  return Object.assign(
    {
      spaces: false,
      fix: true,
      inc: true,
      alltag: true,
      shop: true,
      biz: true,
      stb: true,
      inv: false,
    },
    store.settings.fcCfg || {}
  );
}
function fcSpaces() {
  const td = isoToday(),
    L = [];
  for (const n of Object.keys(store.settings.accountAnchors || {})) {
    if (n === "Hauptkonto") continue;
    const b = accountBalance(n, td);
    if (b != null)
      L.push({
        n,
        v: b,
      });
  }
  return L;
}
function fcCalc() {
  const ym = ymOf(new Date()),
    dim = daysIn(ym),
    d0 = new Date().getDate(),
    CF = fcCfg(),
    SP = fcSpaces(),
    spSum = sum(SP, (x) => x.v),
    bal0 = fcMainBal() + (CF.spaces ? spSum : 0),
    c = monthCalc(ym),
    paid = (store.months[ym] && store.months[ym].paid) || {};
  const sg = (t) =>
    t.kind === "einnahme" || (t.kind === "umbuchung" && t._k0 === "einnahme")
      ? t.amount
      : ["ausgabe", "betrieb", "vorauszahlung"].includes(t.kind)
        ? -t.amount
        : 0;
  const delta = Array(dim + 2).fill(0);
  for (const t of c.tx) {
    const d = Number(t.date.slice(8, 10));
    if (d <= d0) delta[d] += sg(t);
  }
  for (const [fid, amt] of Object.entries(paid)) {
    const f = store.fixed.find((x) => x.id === fid);
    const d = Math.min(d0, (f && payDay(f, ym)) || 1);
    delta[d] -= Number(amt) || 0;
  }
  const pts = [];
  let b = bal0;
  const past = [];
  for (let d = d0; d >= 1; d--) {
    past[d] = b;
    b -= delta[d];
  }
  for (let d = 1; d <= d0; d++)
    pts.push({
      d,
      v: past[d],
      f: false,
    });
  const typ = (L) => {
    const a = L.map((t) => t.amount)
      .filter((v) => v > 0)
      .sort((x, y) => x - y);
    if (!a.length) return 0;
    const med = a[Math.floor(a.length / 2)],
      cap = Math.max(60, med * 4);
    return sum(
      a.filter((v) => v <= cap),
      (v) => v
    );
  };
  const upto = (t) => Number(t.date.slice(8, 10)) <= d0,
    isA = (t) => t.kind === "ausgabe" && !t.fixId && !isShopTx(t) && !isInvTx(t),
    isI = (t) => isInvTx(t) && !t.fixId,
    isS = (t) => t.kind === "ausgabe" && !t.fixId && isShopTx(t),
    isB = (t) => t.kind === "betrieb" && !t.fixId;
  let aA = typ(c.tx.filter((t) => isA(t) && upto(t))) / Math.max(1, d0),
    sA =
      sum(
        c.tx.filter((t) => isS(t) && upto(t)),
        (t) => t.amount
      ) / Math.max(1, d0),
    bA = typ(c.tx.filter((t) => isB(t) && upto(t))) / Math.max(1, d0);
  if (d0 < 6) {
    const pm = shiftYm(ym, -1),
      p = monthCalc(pm),
      dp = daysIn(pm);
    aA = Math.max(aA, typ(p.tx.filter(isA)) / dp);
    sA = Math.max(sA, sum(p.tx.filter(isS), (t) => t.amount) / dp);
    bA = Math.max(bA, typ(p.tx.filter(isB)) / dp);
  }
  const iSum = sum(
      c.tx.filter((t) => isI(t) && upto(t)),
      (t) => t.amount
    ),
    iA = iSum / Math.max(1, d0);
  const avg = (CF.alltag ? aA : 0) + (CF.shop ? sA : 0) + (CF.biz ? bA : 0) + (CF.inv ? iA : 0);
  const fut = Array(dim + 2).fill(0),
    fixL = [];
  for (const f of fixedForMonth(ym, true)) {
    if (f.id in paid) continue;
    if (!CF.spaces && fxAcct(f) !== "Hauptkonto") continue;
    let d = payDay(f, ym) || d0 + 1;
    if (d <= d0) d = Math.min(dim, d0 + 1);
    const a = planAmt(f, ym);
    if (CF.fix) fut[d] -= a;
    fixL.push({
      d,
      a,
      n: f.name,
    });
  }
  const inc = [];
  const prev = monthCalc(shiftYm(ym, -1)).tx.filter((t) => t.kind === "einnahme" && t.amount >= 50);
  for (const t of prev) {
    const got = c.tx.some(
      (x) => x.kind === "einnahme" && x.cat === t.cat && Math.abs(x.amount - t.amount) < t.amount * 0.3
    );
    if (got) continue;
    let d = Math.min(dim, Number(t.date.slice(8, 10)));
    if (d <= d0) {
      if (d0 - d > 10 || d0 >= dim) continue;
      d = d0 + 1;
    }
    if (CF.inc) fut[d] += t.amount;
    inc.push({
      d,
      v: t.amount,
      n: t.cat || "",
      k: "inc",
    });
  }
  try {
    for (const x of store.settings.stb || []) {
      if (x.res !== "ref" || !(Number(x.amt) > 0) || !x.date || x.got) continue;
      const exp = addDays(x.date, 21),
        last = addDays(x.date, 70),
        td = isoToday();
      if (td > last) continue;
      const arrived = store.tx.some(
        (t) => t.kind === "einnahme" && t.date >= x.date && Math.abs(t.amount - x.amt) <= Math.max(2, x.amt * 0.02)
      );
      if (arrived) continue;
      let d;
      if (exp <= td) d = d0 + 1;
      else if (exp.slice(0, 7) === ym) d = Number(exp.slice(8, 10));
      else continue;
      if (d > dim) continue;
      if (CF.stb) fut[d] += Number(x.amt);
      inc.push({
        d,
        v: Number(x.amt),
        n: uiText("stb_ref") + " " + (x.year || ""),
        k: "stb",
      });
    }
  } catch (_) {}
  b = bal0;
  for (let d = d0 + 1; d <= dim; d++) {
    b += fut[d] - avg;
    pts.push({
      d,
      v: b,
      f: true,
    });
  }
  const future = pts.filter((p) => p.f);
  let min = null;
  for (const p of future) if (!min || p.v < min.v) min = p;
  const thr = 100,
    warn = !!(min && min.v < thr),
    end = pts[pts.length - 1].v;
  let allow = null;
  if (warn) {
    const before = CF.fix
        ? sum(
            fixL.filter((x) => x.d <= min.d),
            (x) => x.a
          )
        : 0,
      daysTo = Math.max(1, min.d - d0);
    allow = Math.max(0, (bal0 - before - thr) / daysTo);
  }
  const incI = inc.filter((x) => x.k !== "stb"),
    stbI = inc.filter((x) => x.k === "stb"),
    left = dim - d0;
  const parts = {
    main: fcMainBal(),
    sp: SP,
    spSum,
    fix: sum(fixL, (x) => x.a),
    fixN: fixL.length,
    inc: sum(incI, (x) => x.v),
    incN: incI.length,
    stb: sum(stbI, (x) => x.v),
    stbN: stbI.length,
    aA,
    sA,
    bA,
    iA,
    iSum,
    left,
  };
  return {
    ym,
    dim,
    d0,
    bal0,
    pts,
    end,
    min,
    inc: inc.filter((x) => (x.k === "stb" ? CF.stb : CF.inc)).sort((a, b) => b.v - a.v),
    thr,
    warn,
    allow,
    avg,
    cf: CF,
    parts,
    fixL,
    has: store.tx.length > 0,
  };
}
function fcParts(F) {
  const P = F.parts,
    CF = F.cf,
    E = (v) => fmtEur0(v),
    row = (k, t, sub, v, cls, sw) =>
      `<div class="fcpr ${sw && !CF[k] ? "off" : ""}"><span class="grow"><b>${escHtml(t)}</b><small>${escHtml(sub)}</small></span>${v != null ? `<span class="fcpv ${cls}" data-noi18n>${escHtml(v)}</span>` : ""}${sw ? `<button type="button" class="fcsw ${CF[k] ? "on" : ""}" role="switch" aria-checked="${!!CF[k]}" aria-label="${escHtml(t)}" data-fcsw="${k}"><i></i></button>` : `<span class="fcsw fix" aria-hidden="true"></span>`}</div>`;
  const L = [
    row(
      "main",
      uiText("fcp_start"),
      uiText("fcp_start_s", {
        v: E(P.main),
      }),
      null,
      "",
      false
    ),
  ];
  if (P.sp.length)
    L.push(
      row(
        "spaces",
        uiText("fcp_sp"),
        P.sp.map((x) => `${x.n} ${E(x.v)}`).join(" · "),
        (P.spSum >= 0 ? "+" : "−") + E(Math.abs(P.spSum)),
        P.spSum < 0 ? "n" : "p",
        true
      )
    );
  L.push(
    row(
      "fix",
      uiText("fcp_fix"),
      uiText(P.fixN === 1 ? "fcp_n1" : "fcp_n", {
        n: String(P.fixN),
      }),
      "−" + E(P.fix),
      "n",
      true
    )
  );
  L.push(row("inc", uiText("fcp_inc"), P.incN ? uiText("fcp_inc_s") : uiText("fcp_none"), "+" + E(P.inc), "p", true));
  L.push(
    row(
      "alltag",
      uiText("fcp_day"),
      uiText("fcp_pd", {
        v: E(P.aA),
        n: String(P.left),
      }),
      "−" + E(P.aA * P.left),
      "n",
      true
    )
  );
  if (P.sA > 0)
    L.push(
      row(
        "shop",
        uiText("fcp_shop"),
        uiText("fcp_pd", {
          v: E(P.sA),
          n: String(P.left),
        }),
        "−" + E(P.sA * P.left),
        "n",
        true
      )
    );
  if (P.bA > 0)
    L.push(
      row(
        "biz",
        uiText("fcp_biz"),
        uiText("fcp_pd", {
          v: E(P.bA),
          n: String(P.left),
        }),
        "−" + E(P.bA * P.left),
        "n",
        true
      )
    );
  if (P.iSum > 0)
    L.push(
      row(
        "inv",
        uiText("fcp_inv"),
        uiText("fcp_inv_s", {
          v: E(P.iSum),
        }),
        "−" + E(P.iA * P.left),
        "n",
        true
      )
    );
  if (P.stbN) L.push(row("stb", uiText("fcp_stb"), uiText("fcp_stb_s"), "+" + E(P.stb), "p", true));
  return `<div class="vak">${escHtml(uiText("fcp_h"))}</div><div class="vacard fcparts">${L.join("")}</div>`;
}
function fcPath(pts, X, Y) {
  if (!pts.length) return "";
  let s = `M${X(pts[0].d).toFixed(1)} ${Y(pts[0].v).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)],
      p1 = pts[i - 1],
      p2 = pts[i],
      p3 = pts[Math.min(pts.length - 1, i + 1)];
    const c1x = X(p1.d) + (X(p2.d) - X(p0.d)) / 6,
      c1y = Y(p1.v) + (Y(p2.v) - Y(p0.v)) / 6,
      c2x = X(p2.d) - (X(p3.d) - X(p1.d)) / 6,
      c2y = Y(p2.v) - (Y(p3.v) - Y(p1.v)) / 6;
    s += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${X(p2.d).toFixed(1)} ${Y(p2.v).toFixed(1)}`;
  }
  return s;
}
function fcScale(F, W, H, pad) {
  const vs = F.pts.map((p) => p.v).concat([F.thr * 0.5]);
  let lo = Math.min(...vs),
    hi = Math.max(...vs);
  if (hi - lo < 50) hi = lo + 50;
  const r = hi - lo;
  lo -= r * 0.1;
  hi += r * 0.12;
  pad = pad || 0;
  return {
    X: (d) => pad + ((d - 1) / (F.dim - 1)) * (W - pad * 2),
    Y: (v) => H - ((v - lo) / (hi - lo)) * H,
    lo,
    hi,
  };
}
function fcMini() {
  if (!store.tx.length) return "";
  const F = fcCalc();
  if (!F.pts.length) return "";
  const W = 120,
    H = 40,
    { X, Y } = fcScale(F, W, H, 2),
    pa = F.pts.filter((p) => !p.f),
    fu = F.pts.filter((p) => p.f || p.d === F.d0);
  return `<button type="button" class="fcmini ${F.warn ? "warn" : ""}" data-fcopen data-noi18n><span class="fct"><small>${escHtml(
    uiText("fc_end", {
      d: fxDate(lastDayOf(F.ym)),
    })
  )}</small><b>${escHtml(fmtEur0(F.end))}</b>${
    F.warn
      ? `<em>${svgIcon("alert", 13)} ${escHtml(
          uiText("fc_tight", {
            d: fxDate(F.ym + "-" + pad(F.min.d)),
          })
        )}</em>`
      : `<em class="ok">${escHtml(uiText("fc_ok"))}</em>`
  }</span>
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path d="${fcPath(pa, X, Y)}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/><path d="${fcPath(fu, X, Y)}" fill="none" stroke="${F.warn ? "var(--bad)" : "var(--accent)"}" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>${F.warn ? `<circle cx="${X(F.min.d).toFixed(1)}" cy="${Y(F.min.v).toFixed(1)}" r="3.2" fill="var(--bad)"/>` : ""}</svg><span class="fcchev">›</span></button>`;
}
const FC = {};
function fcOpen(quick) {
  FC.quick = !!quick;
  const F = fcCalc();
  FC.F = F;
  const b = hbSheet("fcBg", uiText("fc_title")),
    keepY = quick ? b.scrollTop : 0;
  const W = 330,
    H = 190,
    { X, Y, lo, hi } = fcScale(F, W, H, 0);
  const pa = F.pts.filter((p) => !p.f),
    fu = F.pts.filter((p) => p.f || p.d === F.d0),
    thrY = Math.min(H, Math.max(0, Y(F.thr))),
    today = F.pts.find((p) => p.d === F.d0),
    x0 = X(F.d0);
  const pc = (v) => ((v / W) * 100).toFixed(2) + "%",
    pv = (v) => ((v / H) * 100).toFixed(2) + "%",
    I = F.inc[0];
  b.innerHTML = `<div class="fccard"><small>${escHtml(
    uiText("fc_end", {
      d: fxDate(lastDayOf(F.ym), {
        day: "numeric",
        month: "long",
      }),
    })
  )}</small><div class="fcbig"><span id="fcN">${escHtml(fmtEur0(F.end))}</span></div>
    <div class="fcwrap" id="fcW"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="fcsvg">
      <defs><linearGradient id="fcga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient>
      <linearGradient id="fcgz" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--bad)" stop-opacity=".35"/><stop offset="1" stop-color="var(--bad)" stop-opacity=".08"/></linearGradient>
      <clipPath id="fcca"><rect id="fcCA" x="0" y="0" width="${reducedMotion() || quick ? x0 + 2 : 0}" height="${H}"/></clipPath><clipPath id="fccf"><rect id="fcCF" x="${x0}" y="0" width="${reducedMotion() || quick ? W : 0}" height="${H}"/></clipPath></defs>
      ${F.warn || (F.min && F.min.v < F.thr * 3) ? `<rect id="fcZ" x="0" y="${reducedMotion() || quick ? thrY : H}" width="${W}" height="${reducedMotion() || quick ? Math.max(0, H - thrY) : 0}" fill="url(#fcgz)"/>` : ""}
      <g clip-path="url(#fcca)"><path d="${fcPath(pa, X, Y)} L${X(F.d0)} ${H} L0 ${H}Z" fill="url(#fcga)"/><path id="fcP" d="${fcPath(pa, X, Y)}" fill="none" stroke="var(--accent)" stroke-width="3.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></g>
      <g clip-path="url(#fccf)"><path id="fcF" d="${fcPath(fu, X, Y)}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" vector-effect="non-scaling-stroke"/></g>
      <line x1="${x0}" x2="${x0}" y1="0" y2="${H}" class="fctl" vector-effect="non-scaling-stroke"/></svg>
      ${
        F.warn || (F.min && F.min.v < F.thr * 3)
          ? `<span class="fczl" style="top:${pv(thrY)}">${escHtml(
              uiText("fc_under", {
                n: fmtEur0(F.thr),
              })
            )}</span>`
          : ""
      }
      <span class="fchead" id="fcH" style="left:0;top:${pv(Y(F.pts[0].v))}"></span>
      <span class="fcchip dk" id="fcT" style="left:${pc(x0)};top:0">${escHtml(uiText("fc_today"))}</span>
      ${I ? `<span class="fcchip gn" id="fcI" style="left:${pc(X(I.d))};top:${pv(Math.max(18, Y(Math.max(...F.pts.filter((p) => p.d >= I.d).map((p) => p.v)))))}">${svgIcon("case", 12)} +${escHtml(fmtEur0(I.v))}</span>` : ""}
      ${F.warn ? `<span class="fcmin" id="fcM" style="left:${pc(X(F.min.d))};top:${pv(Y(F.min.v))}"><i></i></span>` : ""}
      <div class="fcscr" id="fcS"><span class="fctip" id="fcTip"></span></div></div>
    <div class="fcax"><span>${escHtml(fxDate(F.ym + "-01"))}</span><span>${escHtml(uiText("fc_today"))}</span><span>${escHtml(fxDate(lastDayOf(F.ym)))}</span></div>
    <p class="fchint"><svg class="i" viewBox="0 0 24 24" style="width:15px;height:15px;vertical-align:-3px"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-.6a5 5 0 0 1-4-2L4.6 14.6a1.5 1.5 0 0 1 2.2-2L9 14.5"/></svg> ${escHtml(uiText(IS_PC ? "fc_scrub_pc" : "fc_scrub"))}</p></div>
    ${
      F.warn
        ? `<div class="fcwarn" id="fcWarn"><b>${svgIcon("alert", 15)} ${escHtml(
            uiText("fc_tight", {
              d: fxDate(F.ym + "-" + pad(F.min.d), {
                day: "numeric",
                month: "long",
              }),
            })
          )}</b><span>${escHtml(
            F.min.v < 0
              ? uiText("fc_tight_neg", {
                  n: fmtEur0(Math.abs(F.min.v)),
                })
              : uiText("fc_tight_s", {
                  n: fmtEur0(F.min.v),
                })
          )}</span></div>`
        : `<div class="fcgood" id="fcWarn"><b>✓ ${escHtml(uiText("fc_good"))}</b><span>${escHtml(
            uiText("fc_good_s", {
              n: fmtEur0(F.end),
            })
          )}</span></div>`
    }
    <div class="fcmami" id="fcMa">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub"><span id="fcMt"></span></div></div>
    ${fcParts(F)}
    <div class="fcrows"><div class="vak">${escHtml(uiText("fc_next"))}</div>${fcNextRows(F)}</div>
    <p class="small muted" style="margin:10px 4px 0">${escHtml(
      uiText("fc_how2", {
        n: fmtEur0(F.avg),
      })
    )}</p>`;
  if (quick) b.scrollTop = keepY;
  fcAnim(F, X, Y, W, H);
  fcScrub(F, X, Y, W);
}
document.addEventListener("click", async (e) => {
  const t = e.target.closest && e.target.closest("[data-fcsw]");
  if (!t) return;
  const k = t.dataset.fcsw,
    cf = fcCfg();
  cf[k] = !cf[k];
  store.settings.fcCfg = cf;
  SND.play("tick");
  const old = FC.F ? FC.F.end : 0;
  t.classList.toggle("on", cf[k]);
  t.setAttribute("aria-checked", String(cf[k]));
  await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 180));
  fcOpen(true);
  const n = $("fcN");
  if (n && !reducedMotion()) {
    n._s = fmtEur0(old);
    n.textContent = fmtEur0(old);
    hbOdo(n, fmtEur0(FC.F.end), 600);
  }
  saveSettings();
  try {
    render();
  } catch (_) {}
});
function fcNextRows(F) {
  const ym = F.ym,
    paid = (store.months[ym] && store.months[ym].paid) || {},
    L = [];
  if (!F.cf || F.cf.fix)
    for (const f of fixedForMonth(ym, true)) {
      if (f.id in paid) continue;
      let d = payDay(f, ym) || F.d0 + 1;
      if (d <= F.d0) d = Math.min(F.dim, F.d0 + 1);
      L.push({
        d,
        n: tr(f.name),
        v: -planAmt(f, ym),
      });
    }
  for (const i of F.inc)
    L.push({
      d: i.d,
      n: tr(i.n || "Einnahme"),
      v: i.v,
    });
  L.sort((a, b) => a.d - b.d);
  if (!L.length) return `<p class="small muted">${escHtml(uiText("fc_none"))}</p>`;
  return `<div class="vacard">${L.slice(0, 8)
    .map(
      (x) =>
        `<div class="fcr"><span class="fcd">${escHtml(
          fxDate(ym + "-" + pad(x.d), {
            day: "numeric",
            month: "short",
          })
        )}</span><span class="grow">${escHtml(x.n)}</span><b class="${x.v < 0 ? "neg" : "pos"}">${x.v < 0 ? "−" : "+"}${escHtml(fmtEur(Math.abs(x.v)))}</b></div>`
    )
    .join("")}</div>`;
}
async function fcAnim(F, X, Y, W, H) {
  const tok = (FC.tok = (FC.tok || 0) + 1),
    live = () => FC.tok === tok && !$("fcBg").hidden,
    w = (ms) => new Promise((r) => setTimeout(r, ms));
  const tip = F.warn
    ? (F.allow || 0) < 5
      ? uiText("fc_mami_w0")
      : uiText("fc_mami_w", {
          n: fmtEur0(F.allow || 0),
          d: fxDate(F.ym + "-" + pad(F.min.d), {
            day: "numeric",
            month: "long",
          }),
        })
    : uiText("fc_mami_ok", {
        n: fmtEur0(F.end),
      });
  if (reducedMotion() || FC.quick) {
    $("fcMt").textContent = mFill(tip);
    if (FC.quick && !reducedMotion()) $("fcN").textContent = fmtEur0(F.end);
    ["fcT", "fcI", "fcM", "fcWarn", "fcMa"].forEach((i) => {
      const e = $(i);
      if (e) e.classList.add("on");
    });
    return;
  }
  hbOdo($("fcN"), fmtEur0(F.pts.find((p) => p.d === F.d0).v));
  await w(350);
  const P = $("fcP"),
    H0 = $("fcH"),
    pa = F.pts.filter((p) => !p.f),
    fu = F.pts.filter((p) => p.f || p.d === F.d0),
    x0 = X(F.d0);
  const along = (arr, k) => {
    const tx = X(arr[0].d) + (X(arr[arr.length - 1].d) - X(arr[0].d)) * k;
    let i = 1;
    while (i < arr.length - 1 && X(arr[i].d) < tx) i++;
    const a = arr[i - 1],
      b = arr[i] || a,
      q = b === a ? 0 : (tx - X(a.d)) / (X(b.d) - X(a.d));
    return [tx, Y(a.v + (b.v - a.v) * q)];
  };
  const run = (ms, f) =>
    new Promise((r) => {
      const t0 = performance.now(),
        g = (t) => {
          if (!live()) return r();
          const k = Math.min(1, (t - t0) / ms);
          f(k);
          if (k < 1) requestAnimationFrame(g);
          else r();
        };
      requestAnimationFrame(g);
    });
  H0.classList.add("on");
  await run(1100, (k) => {
    const e = 1 - Math.pow(1 - k, 3),
      [x, y] = along(pa.length > 1 ? pa : [pa[0], pa[0]], e);
    $("fcCA").setAttribute("width", Math.max(0, x + 2));
    H0.style.left = (x / W) * 100 + "%";
    H0.style.top = (y / H) * 100 + "%";
  });
  if (!live()) return;
  $("fcT").classList.add("on");
  await w(300);
  hbOdo($("fcN"), fmtEur0(F.end));
  await run(1500, (k) => {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2,
      [x, y] = along(fu.length > 1 ? fu : [fu[0], fu[0]], e);
    $("fcCF").setAttribute("width", Math.max(0, x - x0 + 2));
    H0.style.left = (x / W) * 100 + "%";
    H0.style.top = (y / H) * 100 + "%";
  });
  if (!live()) return;
  H0.classList.remove("on");
  const Z = $("fcZ");
  if (Z) {
    const thrY = Math.min(H, Math.max(0, Y(F.thr)));
    await run(650, (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      Z.setAttribute("y", H - (H - thrY) * e);
      Z.setAttribute("height", (H - thrY) * e);
    });
  }
  if ($("fcM")) $("fcM").classList.add("on");
  await w(F.warn ? 650 : 100);
  if ($("fcI")) $("fcI").classList.add("on");
  await w(400);
  const wn = $("fcWarn");
  if (wn) {
    wn.classList.add("on");
    if (F.warn) {
      await w(450);
      wn.classList.add("shake");
    }
  }
  await w(500);
  if (!live()) return;
  $("fcMa").classList.add("on");
  await w(350);
  const mt = $("fcMt"),
    s = mFill(tip);
  mt.classList.add("typ");
  for (const ch of s) {
    if (!live()) return;
    mt.textContent += ch;
    await w(18);
  }
  mt.classList.remove("typ");
}
function fcScrub(F, X, Y, W) {
  const wr = $("fcW"),
    sc = $("fcS"),
    tp = $("fcTip");
  if (!wr) return;
  const show = (cx) => {
    const r = wr.getBoundingClientRect(),
      k = Math.max(0, Math.min(1, (cx - r.left) / r.width)),
      d = Math.max(1, Math.min(F.dim, Math.round(1 + k * (F.dim - 1)))),
      p = F.pts.find((x) => x.d === d) || F.pts[F.pts.length - 1];
    sc.style.left = (X(d) / W) * 100 + "%";
    sc.classList.add("on");
    tp.textContent = `${fmtEur0(p.v)} · ${fxDate(F.ym + "-" + pad(d))}`;
    tp.className = "fctip" + (p.v < F.thr ? " bad" : p.f ? "" : " past");
  };
  wr.addEventListener("pointerdown", (e) => {
    wr.setPointerCapture(e.pointerId);
    show(e.clientX);
  });
  wr.addEventListener("pointermove", (e) => {
    if (e.buttons || e.pointerType === "mouse") show(e.clientX);
  });
  wr.addEventListener("pointerleave", () => sc.classList.remove("on"));
  wr.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") setTimeout(() => sc.classList.remove("on"), 1200);
  });
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-fcopen]")) {
    e.preventDefault();
    fcOpen();
  }
});

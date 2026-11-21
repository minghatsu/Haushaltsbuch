/* Fixkosten: von welchem Konto/Space wird abgebucht? (f.acct, sonst Hauptkonto) */
/* Eigene, gut unterscheidbare Farbe je Konto (die Kontofarbe, wenn sie sich vom Hauptkonto abhebt) */
function fxCol(n) {
  const P = ["#8a4fb5", "#c47a12", "#3d63a8", "#b42318", "#0f8a8a", "#a0522d"];
  if (n === "Hauptkonto") return "var(--accent)";
  const L = kaAll().filter((x) => x !== "Hauptkonto");
  return P[Math.max(0, L.indexOf(n)) % P.length];
}
function fxAcctOn() {
  try {
    return kaNames().length > 1;
  } catch (_) {
    return false;
  }
}
function fxAcct(f) {
  const n = f && f.acct;
  try {
    return n && kaAll().includes(n) ? n : "Hauptkonto";
  } catch (_) {
    return "Hauptkonto";
  }
}
async function fxSetAcct(fid, acc) {
  const f = store.fixed.find((x) => x.id === fid);
  if (!f || fxAcct(f) === acc) return;
  const before = {
    ...f,
  };
  delete before.id;
  const d = {
    ...before,
  };
  if (acc === "Hauptkonto") delete d.acct;
  else d.acct = acc;
  if (await safe(() => saveDoc("fixed", fid, d)))
    toast(`${f.name} → ${acc}`, () => safe(() => saveDoc("fixed", fid, before)), "Rückgängig");
}
function fxAcctStats(ym) {
  const paid = (store.months[ym] && store.months[ym].paid) || {},
    all = fixedSorted().filter((f) => dueIn(f, ym) || f.id in paid),
    by = {};
  for (const f of all) {
    const a = fxAcct(f),
      amt = f.id in paid ? Number(paid[f.id]) || 0 : planAmt(f, ym),
      o = (by[a] = by[a] || {
        n: a,
        total: 0,
        open: 0,
        openN: 0,
        items: [],
        first: 99,
      });
    o.total += amt;
    o.items.push(f);
    if (!(f.id in paid)) {
      o.open += amt;
      o.openN++;
      const d = payDay(f, ym);
      if (d && d < o.first) o.first = d;
    }
  }
  for (const n of kaNames(ym))
    if (!by[n])
      by[n] = {
        n,
        total: 0,
        open: 0,
        openN: 0,
        items: [],
        first: 99,
      };
  return Object.values(by).sort(
    (a, b) => (b.n === "Hauptkonto") - (a.n === "Hauptkonto") || b.total - a.total || a.n.localeCompare(b.n, "de")
  );
}
function fxAcctCard(ym) {
  if (!fxAcctOn())
    return (store.fixed || []).length
      ? `<p class="small muted" style="margin:-4px 4px 12px">${escHtml(uiText("fxa_multi"))} <button class="link small" data-fxaplan>${escHtml(uiText("fxa_new"))} ›</button></p>`
      : "";
  const L = fxAcctStats(ym).filter((x) => x.items.length || x.n === "Hauptkonto"),
    tot = sum(L, (x) => x.total) || 1,
    cur = ym === ymOf(new Date()),
    td = isoToday();
  let warn = "";
  if (cur)
    for (const x of L) {
      if (x.n === "Hauptkonto" || !x.open) continue;
      const b = accountBalance(x.n, td);
      if (b == null || b >= x.open - 0.005) continue;
      warn = `<div class="fxaw">${svgIcon("bell", 15)}<span>${escHtml(
        uiText("fxa_warn", {
          a: x.n,
          b: fmtEur0(b),
          m: fmtEur0(x.open - b),
          d: x.first < 99 ? String(x.first) : "–",
        })
      )} <button class="link" data-fxamove="${escHtml(x.n)}" data-amt="${(Math.ceil((x.open - b) * 100) / 100).toFixed(2)}">${escHtml(uiText("fxa_move"))} ›</button></span></div>`;
      break;
    }
  return `<div class="card fxacc"><div class="card-head"><h2>${headIcon("bank")}${escHtml(uiText("fxa_t"))}</h2><button class="link" data-fxaplan>${escHtml(uiText("fxa_plan"))} ${svgIcon("right", 16)}</button></div>
    <div class="fxabar">${L.filter((x) => x.total > 0)
      .map((x) => `<i style="width:${((x.total / tot) * 100).toFixed(1)}%;background:${fxCol(x.n)}"></i>`)
      .join("")}</div>
    ${L.map(
      (x) =>
        `<div class="fxar"><span><i class="fxad" style="background:${fxCol(x.n)}"></i>${escHtml(x.n)}</span><span><b>${escHtml(fmtEur0(x.total))}</b>${
          x.open
            ? ` · <span class="muted">${escHtml(
                uiText("fxa_open", {
                  v: fmtEur0(x.open),
                })
              )}</span>`
            : ""
        }</span></div>`
    ).join("")}${warn}</div>`;
}
/* Konten-Plan: Fixkosten zwischen Konten verschieben (gedrückt halten & ziehen, oder antippen & Konto wählen) */
function fxPlanOpen() {
  hbSheet("fxpBg", uiText("fxa_plan"));
  fxPlanRender();
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("[data-fxaplan]")) {
    fxPlanOpen();
    return;
  }
  const nw = t.closest("[data-fxpnew]");
  if (nw) {
    const inp = document.createElement("input");
    inp.className = "in";
    inp.placeholder = uiText("fxa_new_ph");
    inp.maxLength = 40;
    nw.replaceWith(inp);
    inp.focus();
    inp.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") inp.blur();
      if (ev.key === "Escape") {
        inp.value = "";
        inp.blur();
      }
    });
    inp.addEventListener(
      "blur",
      () => {
        const n = inp.value.trim();
        if (n && !kaAll().some((x) => normText(x) === normText(n))) {
          store.settings.spaces = [...(store.settings.spaces || []), n];
          saveSettings();
          toast(
            uiText("fxa_added", {
              a: n,
            })
          );
        }
        setTimeout(fxPlanRender, 0);
      },
      {
        once: true,
      }
    );
    return;
  }
  const mv = t.closest("[data-fxamove]");
  if (mv) {
    try {
      mvOpen();
      const L = mvList(),
        a = L.find((x) => x.label === "Hauptkonto"),
        b = L.find((x) => x.label === mv.dataset.fxamove);
      if (a && b) {
        mvSheet(a.i, b.i);
        setTimeout(() => {
          const i = $("mvAmt");
          if (i) {
            i.value = String(mv.dataset.amt).replace(".", ",");
            i.dispatchEvent(
              new Event("input", {
                bubbles: true,
              })
            );
          }
        }, 60);
      }
    } catch (_) {}
    return;
  }
  const ch = t.closest("[data-fxpick]");
  if (ch) {
    const [fid, acc] = ch.dataset.fxpick.split("|");
    fxSetAcct(fid, acc).then(fxPlanRender);
    return;
  }
  const pp = t.closest("[data-fxpp]");
  if (pp && !FXD.moved) {
    const was = pp.nextElementSibling && pp.nextElementSibling.classList.contains("fxpick");
    document.querySelectorAll("#fxpBg .fxpick").forEach((x) => x.remove());
    if (was) return;
    const fid = pp.dataset.fxpp,
      f = store.fixed.find((x) => x.id === fid);
    pp.insertAdjacentHTML(
      "afterend",
      `<div class="fxpick">${kaNames()
        .filter((n) => n !== fxAcct(f))
        .map(
          (n) => `<button data-fxpick="${escHtml(fid)}|${escHtml(n)}" style="--c:${fxCol(n)}">→ ${escHtml(n)}</button>`
        )
        .join("")}</div>`
    );
  }
});
const FXD = {
  moved: false,
};
document.addEventListener("pointerdown", (e) => {
  const pp = e.target.closest("#fxpBg [data-fxpp]");
  if (!pp || e.button > 0) return;
  FXD.moved = false;
  const x0 = e.clientX,
    y0 = e.clientY;
  let ghost = null,
    over = null;
  const t = setTimeout(() => {
    const r = pp.getBoundingClientRect();
    ghost = pp.cloneNode(true);
    ghost.classList.add("fxghost");
    Object.assign(ghost.style, {
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
    });
    document.body.appendChild(ghost);
    pp.classList.add("fxsrc");
    try {
      navigator.vibrate && navigator.vibrate(12);
    } catch (_) {}
  }, 280);
  const mvH = (ev) => {
    if (!ghost) {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) clearTimeout(t);
      return;
    }
    ev.preventDefault();
    FXD.moved = true;
    ghost.style.transform = `translate(${ev.clientX - x0}px,${ev.clientY - y0}px) rotate(-3deg)`;
    const el = document.elementFromPoint(ev.clientX, ev.clientY),
      ln = el && el.closest("[data-fxlane]");
    if (over !== ln) {
      if (over) over.classList.remove("over");
      over = ln;
      if (ln) ln.classList.add("over");
    }
  };
  const up = () => {
    clearTimeout(t);
    removeEventListener("pointermove", mvH);
    removeEventListener("pointerup", up);
    removeEventListener("pointercancel", up);
    pp.classList.remove("fxsrc");
    if (ghost) {
      ghost.remove();
      if (over) {
        over.classList.remove("over");
        fxSetAcct(pp.dataset.fxpp, over.dataset.fxlane).then(fxPlanRender);
      }
      setTimeout(() => {
        FXD.moved = false;
      }, 50);
    }
  };
  addEventListener("pointermove", mvH, {
    passive: false,
  });
  addEventListener("pointerup", up);
  addEventListener("pointercancel", up);
});
function fxPlanRender() {
  const bg = $("fxpBg");
  if (!bg) return;
  const body = bg.querySelector(".hobody"),
    ym = ui.ym,
    paid = (store.months[ym] && store.months[ym].paid) || {},
    L = fxAcctStats(ym);
  body.innerHTML = `<div class="fxpl">${L.map(
    (
      x
    ) => `<div class="fxpln" data-fxlane="${escHtml(x.n)}" style="--c:${fxCol(x.n)}"><h4><i class="fxad" style="background:${fxCol(x.n)}"></i>${escHtml(x.n)}</h4><small>${escHtml(
      uiText("fxa_pm", {
        v: fmtEur0(x.total),
      })
    )}</small>
    ${x.items.map((f) => `<button class="fxpp" data-fxpp="${escHtml(f.id)}"><span>${escHtml(f.name)}</span><b>${escHtml(fmtEur0(f.id in paid ? Number(paid[f.id]) || 0 : planAmt(f, ym)))}</b></button>`).join("") || `<p class="small muted fxpe">${escHtml(uiText("fxa_empty"))}</p>`}</div>`
  ).join(
    ""
  )}<div class="fxpln fxpadd"><button class="link" data-fxpnew>+ ${escHtml(uiText("fxa_new"))}</button></div></div>
    <p class="small muted" style="margin:10px 2px 0">${escHtml(uiText("fxa_hint"))}</p>`;
}
function analyseTop(ym) {
  const c = monthCalc(ym),
    cur = ymOf(new Date()),
    prevYm = shiftYm(ym, -1),
    dayNow = new Date().getDate();
  const prevExp =
    sum(
      monthCalc(prevYm).tx.filter(
        (t) => (t.kind === "ausgabe" || t.kind === "betrieb") && (ym !== cur || Number(t.date.slice(8, 10)) <= dayNow)
      ),
      (t) => t.amount
    ) + (ym !== cur ? monthCalc(prevYm).fixPaid : 0);
  const curExp =
    ym === cur
      ? sum(
          c.tx.filter((t) => t.kind === "ausgabe" || t.kind === "betrieb"),
          (t) => t.amount
        )
      : c.expenses;
  const expDelta = prevExp > 0 ? (curExp / prevExp - 1) * 100 : 0;
  const topTx = c.tx.filter((t) => t.kind === "ausgabe" || t.kind === "betrieb").sort((a, b) => b.amount - a.amount)[0];
  const ins = insightLine(ym);
  return `<div class="cols"><div class="col">
    ${ins ? `<div class="tipline"><span class="e">${svgIcon("spark", 19)}</span><span>${ins}</span></div>` : ""}
    ${moneyFlowCard(ym)}
    </div><div class="col">
    <div class="card">
      <div class="card-head"><h2>${headIcon("insight")}Auf einen Blick</h2><span class="small muted">${escHtml(MONTHS[ymParts(ym)[1] - 1])}</span></div>
      <div class="insights">
        <div class="ins"><span class="eyebrow">Saldo</span><b class="${c.net < 0 ? "neg" : "pos"}">${c.net >= 0 ? "+" : "−"} ${escHtml(fmtEur0(Math.abs(c.net)))}</b><span class="small muted">${c.income ? `${Math.round((Math.max(0, c.net) / c.income) * 100)} % gespart` : "Einnahmen − Ausgaben"}</span></div>
        <div class="ins"><span class="eyebrow">Ø pro Tag</span><b>${escHtml(fmtEur0(dayAvg(ym + "-01", ym === cur ? isoToday() : lastDayOf(ym), ym === cur ? new Date().getDate() : daysIn(ym))))}</b><span class="small muted">im Alltag</span></div>
        <div class="ins"><span class="eyebrow">Vormonat</span>${prevExp > 0 ? `<b class="${expDelta > 0 ? "neg" : "pos"}">${expDelta > 0 ? "+" : "−"} ${Math.abs(Math.round(expDelta))} %</b><span class="small muted">${ym === cur ? "bis heute " : ""}${expDelta > 0 ? "mehr" : "weniger"} als ${escHtml(MSHORT[ymParts(prevYm)[1] - 1])}</span>` : `<b>–</b><span class="small muted">keine Daten</span>`}</div>
        <div class="ins"><span class="eyebrow">Größte Ausgabe</span>${topTx ? `<b>${escHtml(fmtEur0(topTx.amount))}</b><span class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(topTx.note || topTx.cat || "")}</span>` : `<b>–</b><span class="small muted">noch keine</span>`}</div>
      </div>
      <div class="duo" style="margin-top:14px"><div><span class="eyebrow">Einnahmen</span><div class="v pos">${escHtml(fmtEur(c.income))}</div></div><div><span class="eyebrow">Ausgaben</span><div class="v">${escHtml(fmtEur(c.expenses))}</div></div></div>
    </div>
    </div></div>
    <h2 class="section-h">Jahr ${escHtml(ym.slice(0, 4))}</h2>`;
}
function planQuarters(rows, cur) {
  const curQ = rows.findIndex((r) => r.ym === cur) >= 0 ? Math.floor(rows.findIndex((r) => r.ym === cur) / 3) : -1;
  ui.planQ = ui.planQ || {};
  const sg = (v) => (v > 0.005 ? "+" : "") + fmtEur0(v),
    cl = (v) => (v < -0.005 ? "neg" : v > 0.005 ? "pos" : "muted");
  return `<div class="pq">${[0, 1, 2, 3]
    .map((q) => {
      const ms = rows.slice(q * 3, q * 3 + 3),
        has = ms.some((r) => r.c.income || r.c.expenses);
      const ii = sum(ms, (r) => r.c.income),
        aa = sum(ms, (r) => r.c.expenses),
        nn = sum(ms, (r) => r.c.net);
      const open = q in ui.planQ ? ui.planQ[q] : q === curQ;
      const cats = incCats()
        .map((c) => [
          c.name,
          sum(ms, (r) =>
            sum(
              r.c.tx.filter((t) => t.kind === "einnahme" && t.cat === c.name),
              (t) => t.amount
            )
          ),
        ])
        .filter((x) => x[1] > 0.005);
      const priv = sum(ms, (r) => r.c.aus + r.c.fixPaidPriv),
        bet = sum(ms, (r) => r.c.bet + r.c.fixPaidBet);
      return `<div class="pqc ${open ? "open" : ""}">
      <button class="pqh" data-planq="${q}" aria-expanded="${open}"><b>${q + 1}. Quartal</b><span class="pqs ${has ? cl(nn) : "muted"}">${has ? escHtml(sg(nn)) : "–"}</span><span class="pqch">${svgIcon("chevron", 18)}</span><small>${MONTHS[q * 3]} bis ${MONTHS[q * 3 + 2]}${has ? ` · ${escHtml(fmtEur0(ii))} rein · ${escHtml(fmtEur0(aa))} raus` : " · noch keine Buchungen"}</small></button>
      ${
        open
          ? `<div class="pqb">
        ${ms
          .map((r) => {
            const e = r.c.income || r.c.expenses;
            return `<button class="pqm ${r.ym === cur ? "cur" : ""}" data-open="${r.ym}"><span>${MONTHS[r.i - 1]}</span><b class="${e ? cl(r.c.net) : "muted"}">${e ? escHtml(sg(r.c.net)) : "–"}</b><small>${e ? `${escHtml(fmtEur0(r.c.income))} rein · ${escHtml(fmtEur0(r.c.expenses))} raus` : "noch offen"}</small></button>`;
          })
          .join("")}
        ${has ? `<div class="pqd">${cats.map(([n, v]) => `<span>${escHtml(n)}</span><span>${escHtml(fmtEur(v))}</span>`).join("")}<span class="muted">Ausgaben privat</span><span class="muted">${mneg(priv)}</span><span class="muted">Ausgaben betrieblich</span><span class="muted">${mneg(bet)}</span></div>` : ""}
      </div>`
          : ""
      }
    </div>`;
    })
    .join("")}</div>`;
}

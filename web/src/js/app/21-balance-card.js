/* Nur in der Test-App „MAMI Test“ (Debug-Build): Lese-Zugriff für automatische Tests */
try {
  if (window.AndroidBridge && AndroidBridge.isTest && AndroidBridge.isTest())
    window.__hbt = {
      dbg: (ms) => {
        try {
          return dbgSince(ms || 60000);
        } catch (e) {
          return String(e);
        }
      },
      at: (x, y) => {
        const e = document.elementFromPoint(x, y);
        try {
          return dbgEl(e);
        } catch (_) {
          return e ? e.tagName + "." + e.className : "-";
        }
      },
      view: () => ui.view,
      idx: (k) => ui[k],
      go: (v) => {
        ui.view = v;
        render();
      },
      legal: () => LEGAL_VER,
      log: () => CHANGELOG[0][0],
      seed: () => {
        const d = isoToday();
        store.settings.accountAnchors = {
          Hauptkonto: {
            date: d,
            balance: 1200,
            ts: Date.now(),
          },
          Tagesgeld: {
            date: d,
            balance: 400,
            ts: Date.now(),
          },
        };
        store.settings.name = "Test";
        ui.ym = ymOf(new Date());
        render();
      },
    };
  if (window.__hbt && localStorage.getItem("hb-testseed") === "1") {
    localStorage.setItem("hb-testseed", "2");
    setTimeout(() => {
      try {
        window.__hbt.seed();
        if (typeof saveSettings === "function") saveSettings();
      } catch (_) {}
    }, 2500);
  }
} catch (_) {}
function initStack(id, key, dotsId) {
  id = id || "astack";
  key = key || "cardIdx";
  dotsId = dotsId || "adots";
  const st = $(id);
  if (!st) return;
  const cards = [...st.querySelectorAll(".acard")],
    n = cards.length,
    dots = $(dotsId);
  if (!(ui[key] >= 0 && ui[key] < n)) ui[key] = 0;
  const rel = (i) => {
    let d = (i - ui[key] + n) % n;
    if (d > n / 2) d -= n;
    if (n === 2 && d === -1) d = 1;
    return d;
  };
  let last = cards.map((_, i) => rel(i));
  const place = (dx = 0, anim = true) => {
    const fc = st.querySelector(".acard"),
      w = (fc && fc.offsetWidth) || st.clientWidth * 0.8;
    cards.forEach((c, i) => {
      const d = rel(i),
        jump = Math.abs(d - last[i]) > 1,
        side = Math.abs(d);
      c.style.transition = !anim || jump ? "none" : "";
      const x = d * w * 0.6 + dx,
        sc =
          side === 0
            ? 1 - Math.min(0.14, (Math.abs(dx) / w) * 0.14)
            : 0.86 + Math.min(0.14, ((d * dx < 0 ? Math.abs(dx) : 0) / w) * 0.14);
      c.style.transform = `translateX(${x}px) scale(${sc})`;
      c.style.opacity = side === 0 ? "1" : side === 1 ? ".5" : "0";
      c.style.filter = side === 0 ? "" : "saturate(.7)";
      c.style.boxShadow = side === 0 ? "0 18px 34px -14px rgba(0,0,0,.55)" : "";
      c.classList.toggle("side", side !== 0);
      c.style.zIndex = String(10 - side);
      c.setAttribute("aria-hidden", String(d !== 0));
    });
    last = cards.map((_, i) => rel(i));
    if (dots) [...dots.children].forEach((b, i) => b.classList.toggle("on", i === ui[key]));
  };
  place(0, false);
  st.style.height = Math.max(...cards.map((c) => c.offsetHeight)) + 16 + "px";
  if (n < 2) return;
  const go = (dir) => {
    ui[key] = (ui[key] + dir + n) % n;
    SND.play("page");
    place();
  };
  let x0 = null,
    y0 = 0,
    dx = 0,
    lock = null,
    t0 = 0;
  st.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    x0 = e.clientX;
    y0 = e.clientY;
    dx = 0;
    lock = null;
    t0 = Date.now();
  });
  st.addEventListener("pointermove", (e) => {
    if (x0 === null) return;
    const mx = e.clientX - x0,
      my = e.clientY - y0;
    if (lock === null && (Math.abs(mx) > 6 || Math.abs(my) > 6)) {
      lock = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      if (lock === "x") {
        try {
          st.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    }
    if (lock !== "x") return;
    dx = mx;
    if (!st._raf)
      st._raf = requestAnimationFrame(() => {
        st._raf = 0;
        if (lock === "x") place(dx, false);
      });
  });
  const end = () => {
    if (x0 === null) return;
    if (lock === "x") st._drag = Date.now();
    const fast = Math.abs(dx) / Math.max(1, Date.now() - t0) > 0.45;
    if (lock === "x" && (Math.abs(dx) > st.clientWidth * 0.18 || (fast && Math.abs(dx) > 25))) go(dx < 0 ? 1 : -1);
    else if (lock === "x") place();
    x0 = null;
    lock = null;
  };
  st.addEventListener("pointerup", end);
  st.addEventListener("pointercancel", end);
  st.addEventListener("click", (e) => {
    const c = e.target.closest(".acard");
    if (!c || lock || (st._drag && Date.now() - st._drag < 450)) return;
    const d = rel(cards.indexOf(c));
    if (d) go(d > 0 ? 1 : -1);
  });
  st.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      go(1);
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      go(-1);
      e.preventDefault();
    }
  });
  if (dots)
    dots.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cdot]");
      if (b) {
        ui[key] = Number(b.dataset.cdot);
        SND.play("page");
        place();
      }
    });
}
/* Kontostand direkt auf der Karte ändern (Karte dreht sich um) */
function acFlip(card, mid, done) {
  const base = card.style.transform || "",
    R = reducedMotion && reducedMotion();
  if (R) {
    mid();
    done && done();
    return;
  }
  const a = card.animate(
    [
      {
        transform: `perspective(1000px) ${base} rotateY(0deg)`,
      },
      {
        transform: `perspective(1000px) ${base} rotateY(90deg)`,
      },
    ],
    {
      duration: 170,
      easing: "ease-in",
    }
  );
  a.onfinish = () => {
    mid();
    const b = card.animate(
      [
        {
          transform: `perspective(1000px) ${base} rotateY(-90deg)`,
        },
        {
          transform: `perspective(1000px) ${base} rotateY(0deg)`,
        },
      ],
      {
        duration: 220,
        easing: "cubic-bezier(.2,.9,.3,1.25)",
      }
    );
    b.onfinish = () => done && done();
  };
}
function acEditOpen(card) {
  const i = +card.dataset.ci,
    m = (ui.acctEd || [])[i];
  if (!m && !card.querySelector(".aback")) {
    toast(uiText("ac_sum"));
    return;
  }
  if (!m || card.querySelector(".aback")) return;
  document.querySelectorAll(".aback").forEach((x) => acEditClose(x.closest(".acard")));
  const v = round2(m.bal);
  acFlip(
    card,
    () => {
      card.classList.add("acflip");
      card.insertAdjacentHTML(
        "beforeend",
        `<form class="aback" data-acform="${i}" onsubmit="return false"><b>${escHtml(
          uiText("ac_t", {
            n: m.label,
          })
        )}</b><small>${escHtml(uiText(m.cash ? "ac_s_cash" : "ac_s"))}</small>
    <div class="acin"><input class="in" inputmode="decimal" enterkeyhint="done" value="${escHtml(v.toFixed(2).replace(".", ","))}" aria-label="${escHtml(
      uiText("ac_t", {
        n: m.label,
      })
    )}"><span>€</span></div>
    <div class="acbt"><button type="button" class="btn" data-acx>${escHtml(uiText("sh_cancel"))}</button><button type="submit" class="btn primary" data-acok>${escHtml(uiText("ac_ok"))}</button></div></form>`
      );
      const f = card.querySelector(".aback");
      ["pointerdown", "touchstart", "mousedown"].forEach((ev) => f.addEventListener(ev, (e) => e.stopPropagation()));
    },
    () => {
      const inp = card.querySelector(".aback input");
      if (inp) {
        inp.focus({
          preventScroll: true,
        });
        try {
          inp.select();
        } catch (_) {}
      }
    }
  );
}
function acEditClose(card, after) {
  if (!card) return;
  const f = card.querySelector(".aback");
  if (!f) return;
  if (document.activeElement && f.contains(document.activeElement)) document.activeElement.blur();
  acFlip(
    card,
    () => {
      f.remove();
      card.classList.remove("acflip");
    },
    after
  );
}
function acEditSave(card) {
  const i = +card.dataset.ci,
    m = (ui.acctEd || [])[i],
    inp = card.querySelector(".aback input");
  if (!m || !inp) return;
  const v = parseAmt(inp.value);
  if (!isFinite(v)) {
    toast(uiText("ac_err"));
    inp.focus();
    return;
  }
  const nv = round2(v),
    td = isoToday();
  if (m.cash) {
    const cs = store.settings.cash;
    if (!cs) return;
    const now = cashBal(td);
    store.settings.cash = {
      ...cs,
      start: round2((Number(cs.start) || 0) + (nv - now)),
      checked: true,
    };
  } else
    store.settings.accountAnchors = {
      ...(store.settings.accountAnchors || {}),
      [m.name]: {
        date: td,
        balance: nv,
        ts: Date.now(),
      },
    };
  acEditClose(card, () => {
    saveSettings();
    render();
    toast(
      uiText("ac_done", {
        n: m.label,
        v: fmtEur(nv),
      })
    );
  });
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("[data-acx]")) {
    acEditClose(t.closest(".acard"));
    return;
  }
  if (t.closest("[data-acok]")) {
    acEditSave(t.closest(".acard"));
    return;
  }
  if (t.closest(".aback")) return;
  const c = t.closest("#astack .acard[data-ci]");
  if (!c) return;
  const st = c.closest("#astack");
  if (c.classList.contains("side") || (st && st._drag && Date.now() - st._drag < 450)) return;
  acEditOpen(c);
});
document.addEventListener("keydown", (e) => {
  const f = e.target.closest && e.target.closest(".aback");
  if (!f) return;
  if (e.key === "Enter") {
    e.preventDefault();
    acEditSave(f.closest(".acard"));
  } else if (e.key === "Escape") {
    e.preventDefault();
    acEditClose(f.closest(".acard"));
  }
});
function renderHome() {
  if (
    ($("v-home").contains(document.activeElement) && /^(INPUT|SELECT)$/.test(document.activeElement.tagName)) ||
    pdHold($("v-home"))
  )
    return;
  const ym = ui.ym,
    c = monthCalc(ym),
    cum = yearCum(ym),
    cur = ymOf(new Date());
  const free = cum.balance - cum.reserveAcc - c.fixOpen;
  let days = 0,
    dayNote = "";
  if (ym === cur) {
    days = daysIn(ym) - new Date().getDate() + 1;
    dayNote = `noch ${days} ${days === 1 ? "Tag" : "Tage"}`;
  } else if (ym > cur) {
    days = daysIn(ym);
    dayNote = `${days} Tage`;
  }
  const y = ym.slice(0, 4);
  const needStart = !(store.settings.startBalance && y in store.settings.startBalance);
  const groups = {};
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
  const g = Object.values(groups).sort((a, b) => b.v - a.v || (b.budget || 0) - (a.budget || 0));
  const gTot = sum(g, (x) => x.v) || 1,
    gMax = g.length && g[0].v ? g[0].v : 1;
  const budgetWarn =
    ym === cur
      ? g.filter((x) => x.budget && x.v >= x.budget * 0.8).sort((a, b) => b.v / b.budget - a.v / a.budget)
      : [];
  const bColor = (x) =>
    x.v > x.budget ? "var(--bad)" : x.v >= x.budget * 0.8 ? "var(--warn)" : catColor(x.kind, x.cat);
  const fx = fixedForMonth(ym, true).length,
    fxDone = fx - c.openCount;
  const debtsTotal = sum(store.debts, (d) => debtState(d).remaining);
  const incW = c.income + c.expenses > 0 ? (c.income / (c.income + c.expenses)) * 100 : 50;
  const prevYm = shiftYm(ym, -1),
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
  const asOf = ym === cur ? isoOf(new Date()) : lastDayOf(ym);
  const known = new Set(accountNames());
  const anchored =
    ym <= cur
      ? Object.keys(store.settings.accountAnchors || {})
          .filter((n) => (known.has(n) || ym === cur) && acctOn(n, ym))
          .sort((a, b) => (b === "Hauptkonto") - (a === "Hauptkonto") || a.localeCompare(b, "de"))
      : [];
  const mainName = anchored.includes("Hauptkonto") ? "Hauptkonto" : "";
  const mainBal = mainName ? accountBalance(mainName, asOf) : cum.balance;
  const others = anchored.filter((n) => n !== mainName);
  const acctLine =
    mainName || others.length
      ? `<div class="acctline">${mainName ? `<span>Gesamt mit Spaces <b>${escHtml(fmtEur(mainBal + sum(others, (n) => accountBalance(n, asOf) || 0)))}</b></span>` : ""}${others.map((n) => `<span>${escHtml(n)} <b>${escHtml(fmtEur(accountBalance(n, asOf)))}</b></span>`).join("")}</div>`
      : "";
  const accts = [
    {
      name: mainName || "Kontostand",
      bal: mainBal,
      main: true,
    },
    ...others.map((n) => ({
      name: n,
      bal: accountBalance(n, asOf),
    })),
  ];
  if (mainName) {
    const open = [...known].filter((n) => n !== mainName && !others.includes(n) && !/paypal/i.test(n) && acctOn(n, ym));
    const rest = round2(cum.balance - mainBal - sum(others, (n) => accountBalance(n, asOf) || 0));
    if (open.length === 1)
      accts.push({
        name: open[0],
        bal: rest,
        guess: true,
        how: "Gesamt minus Hauptkonto",
      });
    else if (open.length > 1) {
      const est = open.map((n) => ({
        name: n,
        bal: round2(
          sum(
            ledgerRows(n).filter((r) => r.date <= asOf),
            (r) => r.v
          )
        ),
        moves: ledgerRows(n).length,
      }));
      const diff = round2(rest - sum(est, (x) => x.bal));
      if (Math.abs(diff) >= 0.01) {
        const big = est.slice().sort((a, b) => b.moves - a.moves)[0];
        big.bal = round2(big.bal + diff);
        big.adj = true;
      }
      for (const x of est)
        accts.push({
          name: x.name,
          bal: x.bal,
          guess: true,
          how: x.adj ? "aus Umsätzen, abgeglichen mit Gesamt" : "aus deinen Umsätzen",
        });
    } else if (Math.abs(rest) >= 0.01 && others.length === 0)
      accts.push({
        name: "Spaces",
        bal: rest,
        guess: true,
        how: "Gesamt minus Hauptkonto",
      });
    if (accts.length > 1)
      accts.push({
        name: "Gesamt mit Spaces",
        bal: round2(sum(accts, (a) => Number(a.bal) || 0)),
        total: true,
      });
  }
  if (cashOn() && ym <= cur && asOf >= store.settings.cash.since) {
    if (!mainName) accts[0].bal = round2(accts[0].bal - cashFlows(asOf) - cashMoves(asOf));
    accts.splice(1, 0, {
      name: "Bargeld",
      bal: cashBal(asOf),
      cash: true,
    });
  }
  const spark = mainName && ym <= cur ? sparkPath(mainName, asOf) : "";
  const when =
    ym === cur
      ? "heute"
      : ym < cur
        ? "Ende " + MONTHS[ymParts(ym)[1] - 1]
        : "voraussichtlich Ende " + MONTHS[ymParts(ym)[1] - 1];
  ui.acctNames = accts.map((a) => a.name);
  ui.acctEd = accts.map((a) =>
    ym !== cur || a.total || (a.guess && a.name === "Spaces")
      ? null
      : {
          name: a.cash ? "Bargeld" : a.main && !mainName ? "Hauptkonto" : a.name,
          label: a.name,
          cash: !!a.cash,
          bal: Number(a.bal) || 0,
        }
  );
  const acol = (a, i) => {
    const c = acctColor(a.name, i);
    return c ? ` style="background:linear-gradient(150deg, ${c}, color-mix(in srgb, ${c} 62%, #000))"` : "";
  };
  const acardHtml = accts
    .map(
      (
        a,
        i
      ) => `<div class="acard ${i ? "alt" : ""} ${a.cash ? "cashc" : ""} ${a.total ? "tot" : ""} ${a.bal < 0 && !acctColor(a.name, i) ? "minus" : ""}" data-ci="${i}"${acol(a, i)}>${ym === cur && !a.total && !(a.guess && a.name === "Spaces") ? `<i class="aced" aria-hidden="true">${svgIcon("pen", 14)}</i>` : ""}<div class="l">${escHtml(a.name)} · ${escHtml(when)}</div><div class="b">${escHtml(fmtEur(a.bal))}</div>${fxLine(a.bal)}
      ${a.main && spark ? `<svg class="spark" viewBox="0 0 300 46" preserveAspectRatio="none" aria-hidden="true"><path d="${spark}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2.2" stroke-linejoin="round"/></svg>` : ""}
      <div class="m">${
        a.main
          ? `<span>${c.net >= 0 ? "↑" : "↓"} ${escHtml(fmtEur0(Math.abs(c.net)))} ${c.net >= 0 ? "übrig" : "mehr ausgegeben"} im ${escHtml(MONTHS[ymParts(ym)[1] - 1])}</span>${
              mainName
                ? `<span>Mit Spaces ${escHtml(
                    fmtEur(
                      (
                        accts.find((x) => x.total) || {
                          bal: cum.balance,
                        }
                      ).bal
                    )
                  )}</span>`
                : ""
            }`
          : a.cash
            ? `<span>💶 im Portemonnaie</span>`
            : a.total
              ? `<span>Hauptkonto und alle Spaces</span>`
              : a.guess
                ? `<span>Space · ${escHtml(a.how || "")}</span>`
                : `<span>Space</span>`
      }</div></div>`
    )
    .join("");
  const over = budgetWarn.find((x) => x.v > x.budget),
    near = budgetWarn.find((x) => x.v <= x.budget);
  let tip,
    tipCls = "";
  if (mainBal < 0 && ym <= cur) {
    tipCls = "bad";
    tip = `<b>Dein Konto ist im Minus.</b> ${c.openCount ? `Und es sind noch ${c.openCount} Fixkosten offen (${escHtml(fmtEur(c.fixOpen))}).` : ""}`;
  } else if (over) {
    tipCls = "bad";
    tip = `<b>${escHtml(over.cat)} ist ${escHtml(fmtEur0(over.v - over.budget))} über dem Budget.</b>${days ? ` Noch ${days} ${days === 1 ? "Tag" : "Tage"} bis Monatsende.` : ""}`;
  } else if (near) {
    tipCls = "warn";
    tip = `<b>${escHtml(near.cat)}: ${Math.round((near.v / near.budget) * 100)} % vom Budget verbraucht.</b> Noch ${escHtml(fmtEur(near.budget - near.v))} für ${days} ${days === 1 ? "Tag" : "Tage"}.`;
  } else if (ym >= cur) {
    if (free >= 0)
      tip = `<b>Du liegst im Plan.</b> ${days && free > 0 ? `Noch ${escHtml(fmtEur(free / days))} pro Tag frei.` : ""}${c.openCount ? ` ${c.openCount} Fixkosten noch offen (${escHtml(fmtEur(c.fixOpen))}).` : ""}`;
    else {
      tipCls = "warn";
      tip =
        cum.reserveAcc > 0 && cum.balance >= 0
          ? `<b>Deine Steuer-Rücklage (${escHtml(fmtEur0(cum.reserveAcc))}) ist größer als dein Guthaben.</b> Plane für die Steuer etwas mehr ein.`
          : `<b>Bis Monatsende fehlen ${escHtml(fmtEur0(-free))}.</b> Noch ${c.openCount} Fixkosten offen (${escHtml(fmtEur0(c.fixOpen))}).`;
    }
  } else {
    tip = `<b>${escHtml(MONTHS[ymParts(ym)[1] - 1])}: ${c.net >= 0 ? "+" : "−"} ${escHtml(fmtEur(Math.abs(c.net)))}</b> ${c.net >= 0 ? "mehr eingenommen als ausgegeben." : "mehr ausgegeben als eingenommen."}`;
    if (c.net < 0) tipCls = "warn";
  }
  const hints = [];
  if (mainBal < 0 && ym <= cur)
    hints.push({
      k: "minus",
      lvl: "bad",
      t: "Dein Konto ist im Minus",
      s: `${mainName || "Kontostand"}: ${fmtEur(mainBal)}`,
    });
  for (const x of budgetWarn)
    hints.push(
      x.v > x.budget
        ? {
            k: "budget",
            lvl: "bad",
            t: `${x.cat}: ${fmtEur0(x.v - x.budget)} über dem Budget`,
            s: days ? `Noch ${days} ${days === 1 ? "Tag" : "Tage"} bis Monatsende.` : "",
          }
        : {
            k: "budget",
            lvl: "warn",
            t: `${x.cat}: ${Math.round((x.v / x.budget) * 100)} % vom Budget verbraucht`,
            s: `Noch ${fmtEur(x.budget - x.v)} für ${days} ${days === 1 ? "Tag" : "Tage"}.`,
          }
    );
  const onAcc = (
      accts.find((x) => x.total) || {
        bal: mainBal,
      }
    ).bal,
    freeC = onAcc - cum.reserveAcc - c.fixOpen;
  if (ym >= cur && freeC < 0)
    hints.push(
      cum.reserveAcc > 0 && onAcc >= c.fixOpen
        ? {
            k: "reserve",
            lvl: "warn",
            t: uiText("ra_hint_t"),
            s: uiText("ra_hint_s", {
              a: fmtEur0(cum.reserveAcc),
              b: fmtEur0(onAcc),
            }),
            act: "resaway",
            lbl: uiText("ra_btn"),
          }
        : {
            k: "reserve",
            lvl: "warn",
            t: `Bis Monatsende fehlen ${fmtEur0(-freeC)}`,
            s: `Auf deinen Konten: ${fmtEur0(onAcc)} · noch nicht abgehakte Fixkosten: ${fmtEur0(c.fixOpen)}${cum.reserveAcc > 0 ? ` · Steuer-Rücklage: ${fmtEur0(cum.reserveAcc)}` : ""}. Sind Fixkosten schon abgebucht, hake sie unter „Fixkosten“ ab.`,
          }
    );
  for (const d of store.debts) {
    const st = debtState(d);
    if (st.noCover)
      hints.push({
        k: "debt",
        lvl: "warn",
        t: `${d.name}: Rate deckt die Zinsen nicht`,
        s: "Die Schuld wird so nicht kleiner.",
      });
  }
  for (const gl of store.settings.goals || []) {
    const sv = goalSaved(gl);
    if (gl.target > 0 && sv.v >= gl.target)
      hints.push({
        k: "goal",
        lvl: "good",
        t: `Sparziel „${gl.name}“ erreicht`,
        s: fmtEur(sv.v),
      });
  }
  if (!hints.some((h) => h.lvl !== "good"))
    hints.unshift({
      lvl: "good",
      t:
        ym >= cur
          ? "Du liegst im Plan"
          : `${MONTHS[ymParts(ym)[1] - 1]}: ${c.net >= 0 ? "+" : "−"} ${fmtEur(Math.abs(c.net))}`,
      s:
        ym >= cur
          ? days && free > 0
            ? `Noch ${fmtEur(free / days)} pro Tag frei.`
            : ""
          : c.net >= 0
            ? "mehr eingenommen als ausgegeben"
            : "mehr ausgegeben als eingenommen",
    });
  if (hasProfile()) {
    const td = isoToday(),
      tm = isoOf(new Date(Date.now() + 864e5));
    for (const t of (store.settings.jl && store.settings.jl.terms) || [])
      if (t.d === td || t.d === tm)
        hints.unshift({
          k: "term",
          lvl: "warn",
          t: `${t.d === td ? "Heute" : "Morgen"}: ${t.n}`,
          s: t.t ? `um ${t.t} Uhr` : "",
        });
    const P = prof(),
      end = profEnd();
    if (P.cd && end) {
      const dl = Math.round((new Date(end + "T12:00") - new Date(td + "T12:00")) / 864e5);
      if (dl >= 0 && dl <= 60)
        hints.unshift({
          k: "profend",
          lvl: "warn",
          t: `${P.cd} in ${dl} ${dl === 1 ? "Tag" : "Tagen"}`,
          s: `am ${new Date(end + "T12:00").toLocaleDateString("de-DE")} – plan rechtzeitig, wie es danach weitergeht.`,
        });
    }
    if (P.side === "beihilfe") {
      const old = (store.settings.jl.beihilfe || []).filter(
        (x) => !x.done && x.d && (Date.now() - new Date(x.d + "T12:00")) / 864e5 > 42
      );
      if (old.length)
        hints.push({
          k: "beihilfe",
          lvl: "warn",
          t: `${old.length} Beihilfe-${old.length === 1 ? "Antrag" : "Anträge"} seit über 6 Wochen offen`,
          s: "Nachfragen lohnt sich.",
        });
    }
  }
  {
    const ny = new Date().getFullYear(),
      nm = new Date().getMonth(),
      a = YV[ny],
      b = YV[ny - 1];
    if (nm <= 1 && a && b && ym >= cur) {
      const md = store.settings.mindest || {};
      if (md.on && md.h && a.ml !== b.ml) {
        const plus = ((a.ml - b.ml) * md.h * 13) / 3;
        hints.unshift({
          k: "mindest",
          lvl: "good",
          t: `Neu ab ${ny}: Mindestlohn ${fmt2(a.ml)} €`,
          s: `Du bekommst ca. ${fmtEur0(plus)} mehr brutto im Monat. Prüf, ob es auf deiner Abrechnung steht.`,
        });
      }
      if (
        a.mj !== b.mj &&
        (["minijob", "studium", "schule", "alg", "grusi"].includes(store.settings.work) || hasExtra("minijob"))
      )
        hints.push({
          k: "mjgrenze",
          lvl: "warn",
          t: `Neu ab ${ny}: Minijob-Grenze ${a.mj} €`,
          s: `vorher ${b.mj} € im Monat`,
        });
    }
  }
  {
    const nb = store.tx.filter((t) => t.nobon && !hasReceipt(t.id)).length;
    if (nb)
      hints.push({
        lvl: "warn",
        t: `${nb} ${nb === 1 ? "Einkauf" : "Einkäufe"} ohne Kassenbon`,
        s: "Öffne die Buchung und fotografier den Bon nach – oder tipp dort „Bon gibt’s nicht“.",
      });
  }
  aboHints(hints);
  try {
    tmHints(hints);
  } catch (_) {}
  try {
    stbHints(hints);
  } catch (_) {}
  try {
    brHints(hints);
  } catch (_) {}
  ui.hints = hints;
  updateBell();
  if (ym === cur) notifyAlerts(hints);
  const bt = g
    .filter((x) => x.budget)
    .sort((a, b) => b.v / b.budget - a.v / a.budget)
    .slice(0, 3);
  let streak = ym === cur ? budgetStreak(ym) : null;
  if (streak && !streak.best) streak = null;
  const openFx = [];
  $("v-home").innerHTML = `
    ${ym === cur ? hlCard() : ""}${ym === cur && document.documentElement.classList.contains("pc") ? `<div class="fcpcw">${fcMini()}</div>` : ""}
    ${store.settings.work === undefined ? `<div class="card workq"><b>Wie verdienst du dein Geld?</b><span class="small muted">Dann zeigt die App nur, was zu dir passt.</span>${workPicker("", ui.workGrp || "", "setwork")}</div>` : store.settings.extra === undefined && store.settings.work !== undefined && ui.askExtra ? `<div class="card workq"><b>Verdienst du noch etwas dazu?</b><span class="small muted">Du kannst mehreres anhaken.</span>${extraPicker(store.settings.work, ui.exSel || [], "homeextra")}<button class="btn primary" data-homeexok="1" style="margin-top:10px">Fertig</button></div>` : ""}
    ${
      needStart
        ? `<div class="notice info"><span data-noi18n>${escHtml(
            uiText("start_hint", {
              y,
            })
          )}</span><button class="btn primary" data-go="more" data-scroll="sStart">Eintragen</button></div>`
        : ""
    }
    ${hasProfile() ? joblessTop(ym, free, c) : ""}
    <div class="homeTop" style="display:flex;flex-direction:column;gap:10px" ${isJobless() ? "hidden" : ""}>
      <div class="astack ${accts.length > 1 ? "" : "one"}" id="astack" ${accts.length > 1 ? `tabindex="0" aria-label="Konten – wischen zum Blättern"` : ""}>${acardHtml}</div>
      ${accts.length > 1 ? `<div class="adots" id="adots">${accts.map((_, i) => `<button data-cdot="${i}" aria-label="Karte ${i + 1}"><i></i></button>`).join("")}</div>` : ""}
      ${ym === cur && (ui.acctEd || []).filter(Boolean).length > 1 ? `<button class="mvopen" data-mvopen aria-label="${escHtml(uiText("mv_open"))}">${svgIcon("down", 18)}<span>${escHtml(uiText("mv_open"))}</span></button>` : ""}
      <div class="hkpi one">
        ${
          ym === cur
            ? (() => {
                const { left, v } = freePerDay(ym, mainBal, c);
                return `<button data-go="year" aria-label="Noch ${fmtEur0(v)} pro Tag für ${left} Tage"><span class="hki" style="--tc:${themeCol("#c27c0e", 3)}">${svgIcon("chart", 18)}</span><span><small><span>Noch pro Tag</span> · <span>${left} ${left === 1 ? "Tag" : "Tage"}</span></small><b>${escHtml(fmtEur0(v))}</b></span></button>`;
              })()
            : `<button data-go="year"><span class="hki" style="--tc:${themeCol("#c27c0e", 3)}">${svgIcon("chart", 18)}</span><span><small>Ø pro Tag im Alltag</small><b>${escHtml(fmtEur0(dayAvg(ym + "-01", lastDayOf(ym), daysIn(ym))))}</b></span></button>`
        }
      </div>
      ${ym === cur ? fcMini() : ""}
    </div>
    ${homeHub(ym, c)}
    ${homeBlocks({
      tip: `<div class="tipline ${tipCls}"><span class="e">${svgIcon(tipCls ? "alert" : "check", 19)}</span><span>${tip}</span></div>`,
      quick: `<div class="quick4">
      <button data-add="ausgabe"><span class="ic">${svgIcon("minus", 22)}</span>Ausgabe</button>
      <button data-add="einnahme"><span class="ic">${svgIcon("plusIn", 22)}</span>Einnahme</button>
      <button data-scanquick="1"><span class="ic">${svgIcon("camera", 22)}</span>Beleg</button>
      <button data-go="import"><span class="ic">${svgIcon("arrowDown", 22)}</span>Import</button>
    </div>`,
      cash: cashBlock(),
      budgets: bt.length
        ? budgetPlanCard(
            ym,
            g.filter((x) => x.budget),
            streak
          )
        : budgetPlanEmpty(),
      fix: fixedAreas(ym),
      gemeinsam: gemeinsamCard(),
      tax: taxGauge(ym),
      goals: goalsRings() + (ui.goalsOpen || ui.goalEdit ? goalsCard() : ""),
      invest: invTile(),
      debts: debtRings(),
      recent: recentTimeline(c),
      offers: offersCard(),
      ...homeExtra({
        ym,
        cur,
        c,
        g,
        mainName,
        mainBal,
        asOf,
      }),
    })}
    <div style="text-align:center;margin:4px 0 8px"><button class="link small" data-go="more" data-scroll="homeEd">${svgIcon("sliders", 15)} Startseite anpassen</button></div>`;
  initStack();
  initShopRail();
  if (IS_PC && typeof pcHome === "function")
    try {
      pcHome({
        ym,
        cur,
        c,
        accts,
        mainBal,
        mainName,
      });
    } catch (e) {
      console.warn("pc", e);
    }
}

/* So berechnet */
function waterfall(ym, cum, c, mainName) {
  const y = ym.slice(0, 4),
    cur = ymOf(new Date()),
    mon = ui.calcMode === "month";
  let start, label;
  if (mon) {
    const m = ymParts(ym)[1];
    const pc = m > 1 ? yearCum(shiftYm(ym, -1)) : null;
    start = pc ? pc.balance : startBal(y);
    label = `Stand 1. ${MONTHS[m - 1]}`;
    var outV = cum.outSum - (pc ? pc.outSum : 0);
  } else {
    start = startBal(y);
    label = `Stand 1.1.${y}`;
    var outV = cum.outSum;
  }
  const inV = cum.balance - start + outV,
    total = cum.balance;
  const steps = [
    {
      l: label,
      from: 0,
      to: start,
      kind: "base",
      v: start,
    },
    {
      l: "+ Einnahmen",
      from: start,
      to: start + inV,
      kind: "in",
      v: inV,
    },
    {
      l: "− Ausgaben",
      from: start + inV,
      to: total,
      kind: "out",
      v: -outV,
    },
    {
      l: `= ${mainName ? "Gesamt" : "Kontostand"} ${ym === cur ? "heute" : ym < cur ? "Monatsende" : "voraussichtlich"}`,
      from: 0,
      to: total,
      kind: "sum",
      v: total,
      sep: true,
    },
  ];
  let run = total;
  if (ym >= cur && c.fixOpen) {
    steps.push({
      l: `− Fixkosten offen (${c.openCount})`,
      from: run,
      to: run - c.fixOpen,
      kind: "out",
      v: -c.fixOpen,
    });
    run -= c.fixOpen;
  }
  if (cum.reserveAcc) {
    steps.push({
      l: "− Steuer-Rücklage",
      from: run,
      to: run - cum.reserveAcc,
      kind: "out",
      v: -cum.reserveAcc,
    });
    run -= cum.reserveAcc;
  }
  if (run !== total)
    steps.push({
      l: "= Frei verfügbar",
      from: 0,
      to: run,
      kind: "sum",
      v: run,
      sep: true,
    });
  const vals = steps.flatMap((s) => [s.from, s.to]),
    lo = Math.min(0, ...vals),
    hi = Math.max(1, ...vals),
    sc = (v) => ((v - lo) / (hi - lo)) * 100;
  const col = {
    base: "var(--faint)",
    in: "var(--accent)",
    out: "var(--bad-soft-strong)",
    sum: "var(--fg)",
  };
  return `<div class="wfall">
    <div class="wseg" role="group" aria-label="Zeitraum"><button data-calcmode="year" aria-pressed="${!mon}">Seit 1. Januar</button><button data-calcmode="month" aria-pressed="${mon}">Nur ${escHtml(MONTHS[ymParts(ym)[1] - 1])}</button></div>
    ${steps
      .map((s) => {
        const a = sc(Math.min(s.from, s.to)),
          w = Math.max(0.8, Math.abs(sc(s.to) - sc(s.from)));
        return `<div class="wrow k-${s.kind} ${s.sep ? "sep" : ""}"><span class="wl">${escHtml(s.l)}</span><span class="wt">${lo < 0 ? `<i class="zero" style="left:${sc(0)}%"></i>` : ""}<i style="left:${a}%;width:${w}%;background:${s.v < 0 && s.kind === "sum" ? "var(--bad)" : col[s.kind]}"></i></span><span class="wv ${s.kind === "in" ? "pos" : s.kind === "out" || s.v < 0 ? "neg" : ""}">${s.kind === "in" ? "+ " : s.kind === "out" ? "− " : s.v < 0 ? "− " : ""}${escHtml(fmtEur0(Math.abs(s.v)))}</span></div>`;
      })
      .join("")}
  </div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-calcmode]");
  if (!b) return;
  e.preventDefault();
  ui.calcMode = b.dataset.calcmode;
  ui.anaSel = "calc";
  render();
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-debtgo]")) return;
  ui.view = "more";
  ui.sp = "schulden";
  render();
  window.scrollTo({
    top: 0,
  });
});
/* Glocke */
const FW = {
  rot: 0,
  target: 0,
  t: 0,
  open: false,
  raf: 0,
  drag: false,
  moved: false,
};
const fanWheel = () => !(typeof IS_DESK !== "undefined" && IS_DESK);
function fanItems() {
  return [...$("fanBg").querySelectorAll(".fanb:not([hidden])")];
}
function fanGeo() {
  const pl = document.querySelector(".tab.plus"),
    r = pl.getBoundingClientRect(),
    tab = document.documentElement.classList.contains("istab");
  return {
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2 - (tab ? 96 : 80),
    R: tab ? 150 : Math.min(122, (innerWidth - 96) / 2),
  };
}
function fanDraw() {
  const fan = $("fanBg"),
    items = fanItems(),
    N = items.length,
    ST = 360 / N,
    { cx, cy, R } = fanGeo(),
    k = 1 - Math.pow(1 - Math.min(1, FW.t), 3);
  items.forEach((b, i) => {
    const a = 90 - (i - 1) * ST + FW.rot,
      d = ((((a - 90) % 360) + 540) % 360) - 180,
      far = Math.abs(d) > 92,
      ad = far ? 92 + (Math.abs(d) - 92) * 0.35 : Math.abs(d),
      rad = ((90 + Math.sign(d) * ad) * Math.PI) / 180;
    const peek = far ? Math.max(0, Math.min(1, (165 - Math.abs(d)) / 45)) : 1,
      vis = far ? 0.6 * peek : 1,
      x = cx + Math.cos(rad) * R * k,
      y = cy - Math.sin(rad) * R * k * 0.92,
      sc = (0.35 + 0.65 * k) * (far ? 0.6 : 1);
    b.style.left = x + "px";
    b.style.top = y + "px";
    b.style.transform = `scale(${sc.toFixed(3)})`;
    b.style.opacity = (k * vis).toFixed(3);
    b.style.pointerEvents = FW.open && peek > 0.3 ? "auto" : "none";
    b.style.zIndex = far ? 1 : 3;
    b.dataset.d = d.toFixed(1);
    b.classList.toggle("peek", far);
  });
  const idx = ((Math.round(FW.rot / ST) % N) + N) % N;
  [...$("fanDw").children].forEach((x, i) => x.classList.toggle("on", i === idx));
}
function fanLoop() {
  let busy = false;
  if (FW.open && FW.t < 1) {
    FW.t = Math.min(1, FW.t + 0.07);
    busy = true;
  }
  if (!FW.open && FW.t > 0) {
    FW.t = Math.max(0, FW.t - 0.1);
    busy = true;
  }
  if (!FW.drag) {
    const d = FW.target - FW.rot;
    if (Math.abs(d) > 0.05) {
      FW.rot += d * 0.2;
      busy = true;
    } else FW.rot = FW.target;
  }
  fanDraw();
  if (busy || FW.drag) FW.raf = requestAnimationFrame(fanLoop);
  else {
    FW.raf = 0;
    if (!FW.open) {
      $("fanBg").hidden = true;
    }
  }
}
function fanKick() {
  if (!FW.raf) FW.raf = requestAnimationFrame(fanLoop);
}
function fanOpen() {
  const pl = document.querySelector(".tab.plus"),
    r = pl.getBoundingClientRect(),
    fan = $("fanBg");
  ["#3d63a8", "#d14d72", "#c27c0e"].forEach((c, i) =>
    fan.children[i].style.setProperty("--fc", themeCol(c, [6, 1, 3][i]))
  );
  if (!fanWheel()) {
    const R = Math.min(118, innerWidth * 0.29);
    fan.style.setProperty("--cx", r.left + r.width / 2 + "px");
    fan.style.setProperty("--cy", r.top + r.height / 2 + "px");
    [150, 90, 30].forEach((a, i) => {
      const b = fan.children[i],
        t = (a * Math.PI) / 180;
      b.style.setProperty("--dx", Math.round(Math.cos(t) * R) + "px");
      b.style.setProperty("--dy", Math.round(-Math.sin(t) * R - 26) + "px");
    });
    SND.play("whoosh");
    fan.classList.remove("closing");
    fan.hidden = false;
    pl.classList.add("open");
    requestAnimationFrame(() => requestAnimationFrame(() => fan.classList.add("show")));
    return;
  }
  fan.classList.add("wheel");
  {
    const q = fan.querySelector('[data-addpick="qr"]');
    if (q) q.hidden = !canShare();
  }
  const dw = $("fanDw");
  if (dw.children.length !== fanItems().length)
    dw.innerHTML = fanItems()
      .map(() => "<i></i>")
      .join("");
  SND.play("whoosh");
  FW.open = true;
  FW.rot = FW.target = 0;
  fan.hidden = false;
  pl.classList.add("open");
  requestAnimationFrame(() => fan.classList.add("show"));
  fanKick();
  let n = 0;
  try {
    n = Number(localStorage.getItem("hb-fanhint")) || 0;
    localStorage.setItem("hb-fanhint", String(n + 1));
  } catch (_) {}
  $("fanHint").classList.toggle("on", n < 3);
  if (n < 3)
    setTimeout(() => {
      if (!FW.open || FW.drag) return;
      FW.target = 14;
      fanKick();
      setTimeout(() => {
        if (!FW.drag) {
          FW.target = 0;
          fanKick();
        }
      }, 380);
    }, 650);
  try {
    navigator.vibrate && navigator.vibrate(8);
  } catch (e) {}
}
function fanClose() {
  const fan = $("fanBg");
  if (fan.hidden) return;
  SND.play("whooshin");
  document.querySelector(".tab.plus").classList.remove("open");
  if (!fan.classList.contains("wheel")) {
    fan.classList.add("closing");
    fan.classList.remove("show");
    setTimeout(() => {
      fan.hidden = true;
      fan.classList.remove("closing");
    }, 260);
    return;
  }
  FW.open = false;
  fan.classList.remove("show");
  fanKick();
}
(function () {
  const fan = $("fanBg");
  let x0 = 0,
    r0 = 0,
    lx = 0,
    lt = 0,
    v = 0;
  fan.addEventListener("pointerdown", (e) => {
    if (!FW.open || !fan.classList.contains("wheel")) return;
    FW.drag = true;
    FW.moved = false;
    x0 = lx = e.clientX;
    r0 = FW.rot;
    lt = performance.now();
    v = 0;
    fanKick();
  });
  fan.addEventListener("pointermove", (e) => {
    if (!FW.drag) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 6) {
      if (!FW.moved) $("fanHint").classList.remove("on");
      FW.moved = true;
    }
    const now = performance.now();
    v = (e.clientX - lx) / Math.max(1, now - lt);
    lx = e.clientX;
    lt = now;
    FW.rot = r0 - dx * 0.55;
    FW.target = FW.rot;
  });
  const up = () => {
    if (!FW.drag) return;
    FW.drag = false;
    const ST = 360 / fanItems().length,
      t = Math.round((FW.rot - v * 120) / ST) * ST;
    if (t !== FW.target) {
      try {
        navigator.vibrate && navigator.vibrate(6);
      } catch (_) {}
      SND.play("detent");
    }
    FW.target = t;
    fanKick();
    setTimeout(() => {
      FW.moved = false;
    }, 60);
  };
  fan.addEventListener("pointerup", up);
  fan.addEventListener("pointercancel", up);
  fan.addEventListener(
    "click",
    (e) => {
      if (FW.moved) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
      }
      const b = e.target.closest(".fanb.peek");
      if (b) {
        e.stopImmediatePropagation();
        FW.target += (Number(b.dataset.d) > 0 ? -1 : 1) * (360 / fanItems().length);
        fanKick();
        try {
          navigator.vibrate && navigator.vibrate(6);
        } catch (_) {}
        SND.play("detent");
      }
    },
    true
  );
})();
function openAddMenu() {
  if (!WIDE.matches) {
    if ($("fanBg").hidden) fanOpen();
    else fanClose();
    return;
  }
  $("addBg").hidden = false;
  requestAnimationFrame(() => $("addBg").classList.add("show"));
}
function closeAddMenu() {
  fanClose();
  if ($("addBg").hidden) return;
  $("addBg").classList.remove("show");
  setTimeout(() => {
    $("addBg").hidden = true;
  }, 200);
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-addmenu]")) {
    openAddMenu();
    return;
  }
  if (e.target === $("addBg") || e.target === $("fanBg") || e.target.closest("[data-addclose]")) {
    closeAddMenu();
    return;
  }
  const p = e.target.closest("[data-addpick]");
  if (!p) return;
  const k = p.dataset.addpick;
  closeAddMenu();
  if (k === "settings") {
    ui.view = "more";
    ui.sp = null;
    render();
    window.scrollTo({
      top: 0,
    });
    return;
  }
  if (k === "profil") {
    ui.view = "more";
    ui.sp = "profil";
    render();
    renderSpPages();
    window.scrollTo({
      top: 0,
    });
    return;
  }
  if (k === "hilfe") {
    setTimeout(() => mamiOpen(), 150);
    return;
  }
  if (k === "qr") {
    setTimeout(() => invOpen(), 150);
    return;
  }
  if (k === "hand") setTimeout(() => openSheet("ausgabe"), 120);
  else if (k === "receipt") setTimeout(() => smartScan(), 120);
  else {
    ui.view = "import";
    render();
    window.scrollTo({
      top: 0,
    });
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && (!$("addBg").hidden || !$("fanBg").hidden)) closeAddMenu();
});
function hintKey(h) {
  return h.lvl + "|" + h.t;
}
function seenHints() {
  try {
    return new Set(JSON.parse(localStorage.getItem("hb-hints-seen") || "[]"));
  } catch (e) {
    return new Set();
  }
}
const allHints = () => {
  let u = null;
  try {
    u = UPD.avail;
  } catch (e) {}
  return [
    ...(u
      ? [
          {
            k: "upd",
            lvl: "warn",
            t: u.t,
            s: u.s,
            act: "upd",
            lbl: u.lbl || "Installieren",
          },
        ]
      : []),
    ...(ui.hints || []),
  ];
};
function updateBell() {
  try {
    mbBadge();
  } catch (_) {}
  const b = $("bellBtn");
  if (!b) return;
  const hs = allHints(),
    seen = seenHints();
  const n = hs.filter((h) => h.lvl !== "good" && !seen.has(hintKey(h))).length,
    warn = hs.some((h) => h.lvl !== "good");
  if (SND._bell != null && n > SND._bell) SND.play("bell");
  SND._bell = n;
  b.querySelector(".badge").textContent = n;
  b.querySelector(".badge").hidden = !n;
  b.classList.toggle("warn", warn);
  b.classList.toggle("ring", n > 0);
  b.setAttribute("aria-label", n ? `Hinweise, ${n} neu` : "Hinweise");
}
function openHints() {
  const hs = allHints();
  $("hintList").innerHTML =
    hs
      .map(
        (h) =>
          `<div class="hn ${h.lvl}"><span class="e">${svgIcon(h.act === "upd" ? "arrowDown" : h.lvl === "good" ? "check" : "alert", 17)}</span><div><b>${escHtml(h.t)}</b>${h.s ? `<span class="small muted">${escHtml(h.s)}</span>` : ""}${h.act ? `<button class="btn primary" data-hintact="${h.act}" style="margin-top:8px;min-height:38px;padding:8px 14px">${escHtml(h.lbl)}</button>` : ""}</div></div>`
      )
      .join("") || `<span class="small muted">Gerade gibt es nichts zu beachten.</span>`;
  $("hintBg").hidden = false;
  requestAnimationFrame(() => $("hintBg").classList.add("show"));
  try {
    localStorage.setItem("hb-hints-seen", JSON.stringify(hs.map(hintKey)));
  } catch (e) {}
  updateBell();
}
$("bellBtn").addEventListener("click", openHints);
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-hintact]");
  if (!a) return;
  if (a.dataset.hintact === "upd" && UPD.avail) {
    const g = UPD.avail.go;
    closeHints();
    g();
  }
  if (a.dataset.hintact === "resaway") {
    closeHints();
    resAwayOpen();
  }
});
function closeHints() {
  $("hintBg").classList.remove("show");
  setTimeout(() => {
    $("hintBg").hidden = true;
  }, 200);
}
$("hintBg").addEventListener("click", (e) => {
  if (e.target === $("hintBg") || e.target.closest("[data-hintclose]")) closeHints();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("hintBg").hidden) closeHints();
});

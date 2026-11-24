/* Budgets */
function budgetPlanEmpty() {
  return `<div class="card bplan empty" style="order:2"><div class="bpe"><span class="bpi" style="background:${themeCol("#c27c0e", 3)}">${svgIcon("target", 22)}</span><span class="n"><b>Budget planen</b><small>Leg fest, wie viel du pro Monat für Essen, Freizeit & Co. ausgeben willst – die App zeigt dir hier, wie du liegst.</small></span></div><button class="btn primary" data-go="more" data-sp="budgets">Budgets festlegen</button></div>`;
}
function budgetPlanCard(ym, list, streak) {
  const cur = ymOf(new Date()),
    dim = daysIn(ym),
    day = ym === cur ? new Date().getDate() : ym < cur ? dim : 0,
    pace = day / dim;
  const tot = sum(list, (x) => x.budget),
    used = sum(list, (x) => Math.min(x.v, x.budget * 3)),
    left = tot - used,
    daysLeft = ym === cur ? dim - day + 1 : ym > cur ? dim : 0;
  const pct = Math.min(1, used / (tot || 1)),
    R = 34,
    C = 2 * Math.PI * R,
    over = used > tot,
    ahead = !over && pct > pace + 0.08;
  const col = over ? "var(--bad)" : ahead ? "var(--warn)" : "var(--good)";
  const rows = list.slice().sort((a, b) => b.v / b.budget - a.v / a.budget);
  const show = ui.bpAll ? rows : rows.slice(0, 4);
  return `<div class="card bplan" style="order:2">
    <div class="card-head"><h2>${headIcon("target")}Budget ${escHtml(MONTHS[ymParts(ym)[1] - 1])}</h2><button class="link" data-go="more" data-sp="budgets">Planen ${svgIcon("right", 16)}</button></div>
    <div class="bph">
      <svg class="bpring" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${R}" fill="none" stroke="var(--sunk)" stroke-width="10"/>
        <circle cx="42" cy="42" r="${R}" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 42 42)"/>
        ${day ? `<line x1="42" y1="3" x2="42" y2="13" stroke="var(--fg)" stroke-width="2.5" stroke-linecap="round" transform="rotate(${pace * 360} 42 42)"/>` : ""}
        <text x="42" y="47" text-anchor="middle" font-size="16" font-weight="800" fill="var(--fg)" font-family="Inter, sans-serif">${Math.round((used / (tot || 1)) * 100)}%</text></svg>
      <div class="bpt"><small>${over ? "Drüber" : "Noch frei"}</small><b class="${over ? "neg" : ""}">${escHtml(fmtEur0(Math.abs(left)))}</b>
        <span>${escHtml(fmtEur0(used))} von ${escHtml(fmtEur0(tot))}${daysLeft && !over ? ` · <b>${escHtml(fmtEur0(left / daysLeft))}</b> pro Tag` : ""}</span>
        <em class="${over ? "bad" : ahead ? "warn" : "good"}">${over ? "Budget überschritten" : ahead ? "Etwas schneller als geplant" : day ? "Du liegst im Plan" : "Monat noch nicht begonnen"}</em></div>
    </div>
    <div class="bprows">${show
      .map((x) => {
        const r = x.v / x.budget,
          ov = x.v > x.budget,
          nr = !ov && r > pace + 0.1 && r >= 0.5,
          c = catColor("ausgabe", x.cat);
        return `<div class="bpr"><span class="bpic" style="--bc:${c}">${svgIcon(iconFor("ausgabe", x.cat), 16)}</span><span class="bpm"><span class="bpl"><b>${escHtml(x.cat)}</b><span class="${ov ? "neg" : nr ? "warnc" : "muted"}">${ov ? `${escHtml(fmtEur0(x.v - x.budget))} drüber` : `${escHtml(fmtEur0(x.budget - x.v))} frei`}</span></span>
        <span class="bpbar"><i style="width:${Math.min(100, Math.max(x.v ? 3 : 0, r * 100))}%;background:${ov ? "var(--bad)" : nr ? "var(--warn)" : c}"></i>${day ? `<u style="left:${pace * 100}%"></u>` : ""}</span></span></div>`;
      })
      .join("")}</div>
    ${rows.length > 4 ? `<button class="link small bpmore" data-bpall="1">${ui.bpAll ? "Weniger" : "Alle " + rows.length + " Budgets"}</button>` : ""}
    ${streak ? `<div class="bpstreak">${budgetStreakHtml(streak)}</div>` : ""}
  </div>`;
}
function budgetStreakHtml(streak) {
  return `<div>${`<div class="streak" style=""><span class="f">${svgIcon("flame", 19)}</span><div class="grow" style="min-width:0;flex:1"><b>${streak.n} ${streak.n === 1 ? "Tag" : "Tage"} im Budget</b> <span class="small muted">· Rekord ${streak.best}</span><div class="bars">${Array.from(
    {
      length: Math.min(14, streak.today),
    },
    (_, k) => {
      const d = streak.today - Math.min(14, streak.today) + 1 + k;
      return `<i class="${streak.ok[d] ? "on" : ""}"></i>`;
    }
  ).join("")}</div></div></div>`}</div>`;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-bpall]")) {
    ui.bpAll = !ui.bpAll;
    render();
  }
});
function catColor(kind, name) {
  const own = userCol("cat", (kind === "einnahme" ? "einnahme" : "ausgabe") + "|" + name);
  if (own) return own;
  if (kind === "fix" || kind === "vorauszahlung") return "var(--c6)";
  const list = kind === "einnahme" ? incCats().map((c) => c.name) : cats(kind);
  let i = list.indexOf(name);
  if (i < 0) i = 5;
  if (kind === "betrieb") i = (i + 3) % 6;
  if (kind === "einnahme") i = i === 0 ? 2 : 0;
  return "var(" + PALETTE[i % 6] + ")";
}

/* Speicher */
async function saveDoc(col, id, data) {
  if (mem) {
    memStore[col][id] = clone(data);
    persistLocal();
    enqueue(col, id, data);
    rebuildMem();
    return;
  }
  await db.collection(col).doc(id).set(data);
}
async function deleteDoc(col, id) {
  if (mem) {
    delete memStore[col][id];
    persistLocal();
    enqueue(col, id, null);
    rebuildMem();
    return;
  }
  await db.collection(col).doc(id).delete();
}
async function saveSettings() {
  if (PV) {
    render();
    return;
  }
  if (mem) {
    persistLocal();
    enqueue("app", "settings", store.settings);
    render();
    return;
  }
  try {
    await db.doc("app/settings").set(clone(store.settings));
  } catch (e) {
    reportErr(e);
  }
}
let migrating = false;
const SELF_KEYS = [
  "kq4rvnm1q",
  "k1hjxxkv1i",
  "k16qwhxn1b",
  "k43eyen1d",
  "k14vux5o1u",
  "k8569lg1b",
  "k10r8mgd1r",
  "k3nfzsk1b",
  "k1nf4o991n",
  "k170l0kz1d",
  "kw7lynt18",
  "kwa7ovx1t",
  "k6wzukm1r",
  "k9bb3t71r",
  "kkgnvr41r",
  "kohkb1318",
  "k1acmnxd1h",
  "k16h99wa1e",
  "kl2evjg1r",
  "k1w4gghj18",
  "klbtkj41r",
  "kr9kbip18",
  "kub6sxy1f",
  "kp7c4as27",
  "kd456g326",
  "k1tpxnwh1r",
];
async function runMigrations() {
  if (!mem || migrating) return;
  if (!store.settings.migHauptkonto) {
    store.settings.migHauptkonto = 1;
    if (!(store.settings.accountAnchors || {}).Hauptkonto)
      store.settings.accountAnchors = {
        ...(store.settings.accountAnchors || {}),
        Hauptkonto: {
          date: "2026-10-29",
          balance: 123,
        },
      };
    await saveSettings();
  }
  if (!store.settings.migLohn) {
    store.settings.migLohn = 1;
    const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats),
      names = c.einnahme.map((x) => (typeof x === "string" ? x : x.name));
    if (!names.includes("Gehalt"))
      c.einnahme.push({
        name: "Gehalt",
        art: "lohn",
      });
    if (!names.includes("Sonderzahlung"))
      c.einnahme.push({
        name: "Sonderzahlung",
        art: "sonderzahlung",
      });
    store.settings.cats = c;
    await saveSettings();
  }
  if (!store.settings.migSelbst) {
    const keys = new Set(SELF_KEYS),
      sc = incCats().find((c) => c.art === "selbst"),
      vat = (Number(store.settings.vatRate) || 0) / 100;
    const hits = store.tx.filter((x) => x.kind === "einnahme" && keys.has(x.importKey) && sc && x.cat !== sc.name);
    if (sc) {
      migrating = true;
      try {
        const byB = {};
        for (const x of hits) {
          const doc = plainTx(x);
          doc.cat = sc.name;
          if (!store.settings.kleinunternehmer) doc.net = round2(x.amount / (1 + vat));
          if (x._b) (byB[x._b] = byB[x._b] || {})[x.id] = doc;
          else await saveDoc("tx", x.id, doc);
        }
        for (const [b, docs] of Object.entries(byB)) {
          const items = clone(store.txb[b] || {});
          Object.assign(items, docs);
          await saveDoc("txb", b, {
            items,
          });
        }
        store.settings.migSelbst = 1;
        await saveSettings();
      } catch (e) {
        console.error(e);
      } finally {
        migrating = false;
      }
    }
  }
  if (!store.settings.migIncMerge) {
    const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats),
      inc = (c.einnahme || []).map((x) =>
        typeof x === "string"
          ? {
              name: x,
              art: "sonstige",
            }
          : x
      );
    const OLD = ["Sonstige Einnahme", "Erstattungen & Sonstiges"],
      NEW = "Sonstiges & Erstattungen",
      has = inc.filter((x) => OLD.includes(x.name));
    if (has.length >= 2) {
      migrating = true;
      try {
        const at = inc.findIndex((x) => OLD.includes(x.name));
        const rest = inc.filter((x) => !OLD.includes(x.name));
        rest.splice(Math.min(at, rest.length), 0, {
          name: NEW,
          art: "sonstige",
        });
        c.einnahme = rest;
        store.settings.cats = c;
        const byB = {};
        for (const x of store.tx.filter((t) => t.kind === "einnahme" && OLD.includes(t.cat))) {
          const doc = plainTx(x);
          doc.cat = NEW;
          if (x._b) (byB[x._b] = byB[x._b] || {})[x.id] = doc;
          else await saveDoc("tx", x.id, doc);
        }
        for (const [b, docs] of Object.entries(byB)) {
          const items = clone(store.txb[b] || {});
          Object.assign(items, docs);
          await saveDoc("txb", b, {
            items,
          });
        }
        const col = store.settings.colors && store.settings.colors.cat;
        if (col) {
          for (const o of OLD) {
            if (col["einnahme|" + o] && !col["einnahme|" + NEW]) col["einnahme|" + NEW] = col["einnahme|" + o];
            delete col["einnahme|" + o];
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        migrating = false;
      }
    }
    store.settings.migIncMerge = 1;
    await saveSettings();
  }
  const t = store.tx.find(
    (x) => x.importKey === "k1uhc12s2g" && x.kind === "vorauszahlung" && Math.abs(x.amount - 25101) < 0.01
  );
  if (!t) return;
  migrating = true;
  try {
    const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats);
    if (!c.ausgabe.includes("Steuerschulden")) {
      c.ausgabe.push("Steuerschulden");
      store.settings.cats = c;
      await saveSettings();
    }
    const doc = plainTx(t);
    doc.kind = "ausgabe";
    doc.cat = "Steuerschulden";
    doc.note = "Finanzamt D-Dorf Nord · Steuerschulden 2022";
    await saveTxDoc(t.id, doc, t);
  } catch (e) {
    console.error(e);
  } finally {
    migrating = false;
  }
}
function rebuildMem() {
  DREV++;
  store.txSingle = Object.entries(memStore.tx).map(([id, d]) => ({
    id,
    ...d,
  }));
  store.txb = {};
  for (const [id, d] of Object.entries(memStore.txb)) store.txb[id] = (d && d.items) || {};
  rebuildTx();
  store.fixed = Object.entries(memStore.fixed).map(([id, d]) => ({
    id,
    ...d,
  }));
  store.months = {};
  for (const [id, d] of Object.entries(memStore.months)) store.months[id] = d;
  store.debts = Object.entries(memStore.debts).map(([id, d]) => ({
    id,
    ...d,
  }));
  render();
  setTimeout(runMigrations, 0);
  clearTimeout(window.__abT);
  window.__abT = setTimeout(autoBackupCheck, 15000);
}
function reportErr(e) {
  const c = e && e.code;
  toast(
    c === "quota_exceeded"
      ? "Speicher ist voll – bitte alte Einträge löschen"
      : c === "invalid_argument"
        ? "Keine Berechtigung zum Speichern"
        : "Speichern hat nicht geklappt – bitte nochmal"
  );
  console.error(e);
}
async function safe(fn) {
  try {
    await fn();
    return true;
  } catch (e) {
    reportErr(e);
    return false;
  }
}

/* Berechnungen */
function fixedSorted() {
  return store.fixed.slice().sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (b.amount || 0) - (a.amount || 0));
}
const RHYTHMS = [
  ["monatlich", "Monatlich"],
  ["quartal", "Vierteljährlich"],
  ["halbjahr", "Halbjährlich"],
  ["jahr", "Jährlich"],
  ["monate", "Bestimmte Monate"],
];
function dueIn(f, ym) {
  if ((f.from && ym < f.from) || (f.until && ym > f.until)) return false;
  return !Array.isArray(f.months) || !f.months.length || f.months.includes(Number(ym.slice(5, 7)));
}
function rhythmMonths(r, start) {
  const st = Number(start) || 1,
    step = {
      quartal: 3,
      halbjahr: 6,
      jahr: 12,
    }[r];
  if (!step) return null;
  const out = [];
  for (let k = 0; k < 12 / step; k++) out.push(((st - 1 + k * step) % 12) + 1);
  return out.sort((a, b) => a - b);
}
function rhythmText(f) {
  if (!Array.isArray(f.months) || !f.months.length) return "";
  const names = f.months
    .slice()
    .sort((a, b) => a - b)
    .map((m) => MSHORT[m - 1])
    .join(", ");
  const r = {
    quartal: "vierteljährlich",
    halbjahr: "halbjährlich",
    jahr: "jährlich",
  }[f.rhythm];
  return r ? `${r} · ${names}` : names;
}
function monthAmounts(ym) {
  return (store.months[ym] && store.months[ym].amounts) || {};
}
function planAmt(f, ym) {
  const o = monthAmounts(ym);
  return f.id in o ? Number(o[f.id]) || 0 : listAmt(f, ym);
}
function listAmt(f, ym) {
  const p = Array.isArray(f.prices) ? f.prices : [];
  if (!p.length) return f.amount || 0;
  let a = p[0].amount;
  for (const e of p) {
    if (e.from <= ym) a = e.amount;
    else break;
  }
  return Number(a) || 0;
}
function withPrice(f, from, v) {
  let p = (
    Array.isArray(f.prices) && f.prices.length
      ? f.prices
      : [
          {
            from: "0000-00",
            amount: f.amount || 0,
          },
        ]
  ).filter((e) => e.from < from);
  if (!p.length)
    p = [
      {
        from: "0000-00",
        amount: v,
      },
    ];
  else if (Math.abs(p[p.length - 1].amount - v) > 0.004)
    p.push({
      from,
      amount: v,
    });
  return {
    prices: p.length > 1 ? p : undefined,
    amount: p[p.length - 1].amount,
  };
}
function priceNote(f) {
  const p = Array.isArray(f.prices) ? f.prices : [];
  if (p.length < 2) return "";
  const last = p[p.length - 1],
    prev = p[p.length - 2],
    [y, m] = ymParts(last.from);
  return `seit ${MSHORT[m - 1]} ${y}: ${fmtEur(last.amount)} · vorher ${fmtEur(prev.amount)}`;
}
function fixedForMonth(ym, all) {
  const paid = (store.months[ym] && store.months[ym].paid) || {};
  if (all) return store.fixed.filter((f) => dueIn(f, ym) || f.id in paid);
  return store.fixed.filter((f) => f.id in paid);
}
function monthCalc(ym) {
  const tx = store.tx.filter((t) => (t.date || "").startsWith(ym));
  const by = (k) => tx.filter((t) => t.kind === k);
  const inc = by("einnahme");
  const income = sum(inc, (t) => t.amount);
  const selfInc = sum(
    inc.filter((t) => incArt(t.cat) === "selbst"),
    (t) => (t.net != null ? Number(t.net) || 0 : t.amount)
  );
  const ersatz = sum(
      inc.filter((t) => ["lohnersatz", "elterngeld"].includes(incArt(t.cat))),
      (t) => t.amount
    ),
    rente = sum(
      inc.filter((t) => incArt(t.cat) === "rente"),
      (t) => t.amount
    );
  const aus = sum(by("ausgabe"), (t) => t.amount),
    bet = sum(by("betrieb"), (t) => t.amount),
    vz = sum(by("vorauszahlung"), (t) => t.amount);
  const paid = (store.months[ym] && store.months[ym].paid) || {};
  let fixPaidPriv = 0,
    fixPaidBet = 0,
    fixOpen = 0,
    fixTotal = 0,
    openCount = 0;
  for (const [fid, amt] of Object.entries(paid)) {
    const f = store.fixed.find((x) => x.id === fid);
    if (f && f.kind === "betrieb") fixPaidBet += Number(amt) || 0;
    else fixPaidPriv += Number(amt) || 0;
  }
  for (const f of fixedForMonth(ym, true)) {
    const a = f.id in paid ? Number(paid[f.id]) || 0 : planAmt(f, ym);
    fixTotal += a;
    if (!(f.id in paid)) {
      fixOpen += planAmt(f, ym);
      openCount++;
    }
  }
  const fixPaid = fixPaidPriv + fixPaidBet;
  const expenses = aus + bet + vz + fixPaid;
  const neu = sum(by("umbuchung"), (t) => (t._k0 === "einnahme" ? t.amount : -t.amount));
  const rate = hasSelf() ? (Number(store.settings.reserveRate) || 0) / 100 : 0;
  return {
    tx,
    income,
    selfInc,
    ersatz,
    rente,
    aus,
    bet,
    vz,
    fixPaidPriv,
    fixPaidBet,
    fixPaid,
    fixOpen,
    fixTotal,
    openCount,
    expenses,
    reserve: selfInc * rate,
    net: income - expenses + neu,
    neu,
    paid,
  };
}
/* Rücklage, die nicht auf den eigenen Konten liegt (z. B. bei der Partnerin) */
function resAway() {
  const o = store.settings.reserveAway || {};
  return {
    amt: Math.max(0, Number(o.amt) || 0),
    where: String(o.where || ""),
  };
}
function startBal(y) {
  const v = store.settings.startBalance && store.settings.startBalance[String(y)];
  return Number(v) || 0;
}
function yearCum(ym) {
  const [y, m] = ymParts(ym);
  let bal = startBal(y),
    rin = 0,
    rout = 0;
  let out = 0;
  for (let i = 1; i <= m; i++) {
    const c = monthCalc(y + "-" + pad(i));
    bal += c.net;
    rin += c.reserve;
    rout += c.vz;
    out += c.expenses;
  }
  const rb = Math.max(0, rin - rout),
    ra = Math.min(rb, resAway().amt);
  return {
    balance: bal,
    outSum: out,
    reserveIn: rin,
    reserveOut: rout,
    reserveBal: rb,
    reserveAway: ra,
    reserveAcc: rb - ra,
  };
}
/* Schulden */
function debtExtras(d) {
  return (Array.isArray(d.extra) ? d.extra : []).filter((x) => x && Number(x.a) > 0);
}
function debtPlan(d) {
  return (Array.isArray(d.plan) ? d.plan : [])
    .filter((r) => r && /^\d{4}-\d{2}$/.test(r.ym))
    .sort((a, b) => a.ym.localeCompare(b.ym));
}
function debtPayment(d, f, ym, cur) {
  const m = store.months[ym];
  if (m && m.paid && d.fixedId in m.paid) return Number(m.paid[d.fixedId]) || 0;
  if (d.auto && f && ym <= cur && dueIn(f, ym)) {
    if (ym === cur) {
      const dd = payDay(f, ym);
      if (dd && new Date().getDate() < dd) return 0;
    }
    return planAmt(f, ym);
  }
  return 0;
}
function payDay(f, ym) {
  let d = null;
  if (Array.isArray(f.days)) for (const e of f.days) if (e.from <= ym) d = e.day;
  if (d == null && f.day >= 1) d = f.day;
  return d >= 1 ? Math.min(daysIn(ym), d | 0) : null;
}
function debtState(d) {
  const cur = ymOf(new Date()),
    f = store.fixed.find((x) => x.id === d.fixedId),
    start = Number(d.start) || 0;
  const extras = debtExtras(d),
    extraSum = sum(extras, (x) => Number(x.a) || 0),
    plan = debtPlan(d),
    z = (Number(d.zins) || 0) / 100 / 12;
  let bal,
    zinsSum = 0,
    tilgSum = 0,
    rate = f ? listAmt(f, cur) : 0,
    zinsNow = 0,
    freeAt = null,
    noCover = false,
    fromPlan = false;
  if (plan.length) {
    fromPlan = true;
    const done = plan.filter((r) => r.ym <= cur),
      last = done[done.length - 1];
    const first = plan[0],
      startBal = first.rest != null && first.tilg != null ? Number(first.rest) + Number(first.tilg) : start;
    zinsSum = sum(done, (r) => Number(r.zins) || 0);
    if (last && last.rest != null) bal = Number(last.rest);
    else bal = startBal - sum(done, (r) => Number(r.tilg) || 0);
    bal = Math.max(0, bal - extraSum);
    tilgSum = Math.max(0, startBal - bal);
    const next = plan.find((r) => r.ym > cur) || last;
    if (next) {
      if (next.rate) rate = Number(next.rate);
      zinsNow = Number(next.zins) || 0;
    }
    const end = plan.find((r) => r.rest != null && Number(r.rest) <= 0.005) || plan[plan.length - 1];
    if (bal > 0.005) freeAt = end.ym;
    const o0 = Number(d.orig) || 0;
    return {
      paid: round2(o0 > bal ? o0 - bal : tilgSum),
      remaining: round2(bal),
      rate,
      zinsNow: round2(zinsNow),
      zinsSum: round2(zinsSum),
      extraSum: round2(extraSum),
      freeAt,
      end: d.end || "",
      fromPlan,
      noCover,
      pct: o0 > bal ? Math.min(1, (o0 - bal) / o0) : bal + tilgSum > 0 ? Math.min(1, tilgSum / (bal + tilgSum)) : 0,
    };
  }
  bal = start;
  const since = d.since || cur;
  let until = cur;
  if (d.fixedId)
    for (const [ym, m] of Object.entries(store.months)) if (ym > until && m.paid && d.fixedId in m.paid) until = ym;
  const exBy = {};
  for (const x of extras) {
    const k = String(x.d || "").slice(0, 7) || since;
    exBy[k] = (exBy[k] || 0) + Number(x.a);
  }
  for (let ym = since, n = 0; ym <= until && n < 600; ym = shiftYm(ym, 1), n++) {
    const pay = d.fixedId ? debtPayment(d, f, ym, cur) : 0;
    const zi = bal * z;
    zinsSum += zi;
    bal = bal + zi - pay - (exBy[ym] || 0);
    if (bal <= 0) {
      bal = 0;
      break;
    }
  }
  for (const [k, v] of Object.entries(exBy)) if (k < since || k > until) bal = Math.max(0, bal - v);
  tilgSum = Math.max(0, start - bal);
  zinsNow = bal * z;
  if (bal > 0.005 && f) {
    let b = bal,
      ym = cur,
      ok = false;
    for (let n = 0; n < 600; n++) {
      ym = shiftYm(ym, 1);
      if (!dueIn(f, ym)) {
        b += b * z;
        continue;
      }
      const pay = listAmt(f, ym);
      const zi = b * z;
      if (pay <= zi + 0.004) {
        noCover = true;
        break;
      }
      b = b + zi - pay;
      if (b <= 0.005) {
        ok = true;
        break;
      }
    }
    if (ok) freeAt = ym;
  }
  const o0 = Number(d.orig) || 0;
  return {
    paid: round2(o0 > bal ? o0 - bal : tilgSum),
    remaining: round2(bal),
    rate,
    zinsNow: round2(zinsNow),
    zinsSum: round2(zinsSum),
    extraSum: round2(extraSum),
    freeAt,
    end: d.end || "",
    fromPlan,
    noCover,
    pct: o0 > bal ? Math.min(1, (o0 - bal) / o0) : start > 0 ? Math.min(1, tilgSum / start) : 0,
  };
}
function makePlan(d) {
  const f = store.fixed.find((x) => x.id === d.fixedId),
    z = (Number(d.zins) || 0) / 100 / 12,
    out = [];
  let b = Number(d.start) || 0,
    ym = d.since || ymOf(new Date());
  for (let n = 0; n < 480 && b > 0.005; n++, ym = shiftYm(ym, 1)) {
    const rate = f ? (dueIn(f, ym) ? listAmt(f, ym) : 0) : 0;
    if (!f || (rate <= b * z + 0.004 && rate > 0)) break;
    const zi = round2(b * z);
    let pay = rate;
    if (pay > b + zi) pay = round2(b + zi);
    const tilg = round2(pay - zi);
    b = round2(b - tilg);
    out.push({
      ym,
      rate: round2(pay),
      zins: zi,
      tilg,
      rest: Math.max(0, b),
    });
  }
  return out;
}
const PLAN_COLS = {
  ym: ["datum", "fälligkeit", "faelligkeit", "fällig", "termin", "monat", "zahltag", "zahlungsdatum", "periode"],
  rate: ["rate", "monatsrate", "annuität", "annuitaet", "zahlung", "zahlbetrag", "leistung", "betrag"],
  zins: ["zinsen", "zins", "zinsanteil", "zinsbetrag"],
  tilg: ["tilgung", "tilgungsanteil", "tilgungsbetrag"],
  rest: ["restschuld", "rest", "restkapital", "darlehensrest", "saldo", "restbetrag", "offen", "kapital"],
};
const MON_DE = {
  jan: 1,
  feb: 2,
  mär: 3,
  mar: 3,
  apr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  okt: 10,
  oct: 10,
  nov: 11,
  dez: 12,
  dec: 12,
};
function planYm(s) {
  s = String(s || "")
    .trim()
    .toLowerCase();
  let m;
  if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)))
    return (m[3].length === 2 ? "20" + m[3] : m[3]) + "-" + pad(m[2]);
  if ((m = s.match(/^(\d{4})-(\d{1,2})/))) return m[1] + "-" + pad(m[2]);
  if ((m = s.match(/^(\d{1,2})[./](\d{4})$/))) return m[2] + "-" + pad(m[1]);
  if ((m = s.match(/^([a-zäö]{3})[a-zäö]*\.?\s*(\d{2,4})$/)) && MON_DE[m[1]])
    return (m[2].length === 2 ? "20" + m[2] : m[2]) + "-" + pad(MON_DE[m[1]]);
  return null;
}
function planNum(s) {
  s = String(s || "").replace(/[€\s]|EUR/g, "");
  if (!/\d/.test(s)) return null;
  const v = parseBankAmt(s);
  return isFinite(v) ? Math.abs(v) : null;
}
function planFromTable(rows, startYm) {
  let hi = -1,
    map = null;
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const h = rows[i].map(normText);
    const mp = {};
    for (const [k, c] of Object.entries(PLAN_COLS)) {
      let j = -1;
      for (const w of c) {
        j = h.findIndex((x) => x === w);
        if (j >= 0) break;
      }
      if (j < 0)
        for (const w of c) {
          j = h.findIndex((x) => x.includes(w));
          if (j >= 0) break;
        }
      mp[k] = j;
    }
    const idx = ["rate", "zins", "tilg", "rest"].map((k) => mp[k]).filter((j) => j >= 0);
    const n = new Set(idx).size;
    if (rows[i].length >= 3 && n >= 2 && n === idx.length) {
      hi = i;
      map = mp;
      break;
    }
  }
  const out = [];
  let idx = 0;
  for (const r of rows.slice(hi + 1)) {
    let ym = map && map.ym >= 0 ? planYm(r[map.ym]) : null;
    if (!ym) ym = r.map(planYm).find(Boolean) || null;
    const nums = map ? null : r.map(planNum).filter((v) => v != null);
    let row;
    if (map) {
      const g = (k) => (map[k] >= 0 ? planNum(r[map[k]]) : null);
      row = {
        rate: g("rate"),
        zins: g("zins"),
        tilg: g("tilg"),
        rest: g("rest"),
      };
    } else row = planGuess(nums);
    if (!row || [row.rate, row.zins, row.tilg, row.rest].filter((v) => v != null).length < 2) continue;
    if (!ym) {
      if (!startYm) continue;
      ym = shiftYm(startYm, idx);
    }
    idx++;
    if (row.rate == null && row.zins != null && row.tilg != null) row.rate = round2(row.zins + row.tilg);
    if (row.tilg == null && row.rate != null && row.zins != null) row.tilg = round2(row.rate - row.zins);
    if (row.zins == null && row.rate != null && row.tilg != null) row.zins = round2(row.rate - row.tilg);
    out.push({
      ym,
      ...row,
    });
  }
  if (out.length && out.every((x) => x.rest == null) && out.every((x) => x.tilg != null)) {
    let left = 0;
    for (let i = out.length - 1; i >= 0; i--) {
      out[i].rest = round2(left);
      left += out[i].tilg;
    }
  }
  return out;
}
function planGuess(a) {
  if (!a || a.length < 3) return null;
  a = a.slice(-4);
  if (a.length === 4) {
    const [p, q, r, t] = a;
    if (Math.abs(q + r - p) < 0.02)
      return {
        rate: p,
        zins: q,
        tilg: r,
        rest: t,
      };
    if (Math.abs(p + q - r) < 0.02)
      return {
        rate: r,
        zins: p,
        tilg: q,
        rest: t,
      };
    if (Math.abs(p + r - q) < 0.02)
      return {
        rate: q,
        zins: p,
        tilg: r,
        rest: t,
      };
    return {
      rate: p,
      zins: q,
      tilg: r,
      rest: t,
    };
  }
  const [p, q, r] = a;
  if (Math.abs(p + q - r) < 0.02)
    return {
      zins: p,
      tilg: q,
      rate: r,
      rest: null,
    };
  return {
    zins: p,
    tilg: q,
    rest: r,
    rate: round2(p + q),
  };
}
async function loadPlanFile(file, d) {
  let rows;
  if (/\.pdf$/i.test(file.name || "") || file.type === "application/pdf") {
    const lines = await pdfLines(await file.arrayBuffer());
    rows = lines.map((l) => l.cells.map((c) => c.s));
  } else rows = parseCSV(await readFileText(file));
  return planFromTable(rows, d.since || ymOf(new Date()));
}
function incomeTax(x) {
  x = Math.floor(Math.max(0, x));
  if (x <= 12348) return 0;
  if (x <= 17799) {
    const y = (x - 12348) / 10000;
    return Math.floor((914.51 * y + 1400) * y);
  }
  if (x <= 69878) {
    const z = (x - 17799) / 10000;
    return Math.floor((173.1 * z + 2397) * z + 1034.87);
  }
  if (x <= 277825) return Math.floor(0.42 * x - 11135.63);
  return Math.floor(0.45 * x - 19470.38);
}
const estSplit = (x) => 2 * incomeTax(x / 2);
/* Einkommensteuer */
const TAX26 = {
  kinderFB: 9756,
  kindergeld: 3108,
  soliFG: 20350,
  anPausch: 1230,
  sonderPausch: 36,
  entlastung: 4260,
  entlastungKind: 240,
  gewFB: 24500,
  bbgKV: 69750,
  bbgRV: 101400,
};
const LAENDER = [
  ["BW", "Baden-Württemberg"],
  ["BY", "Bayern"],
  ["BE", "Berlin"],
  ["BB", "Brandenburg"],
  ["HB", "Bremen"],
  ["HH", "Hamburg"],
  ["HE", "Hessen"],
  ["MV", "Mecklenburg-Vorpommern"],
  ["NI", "Niedersachsen"],
  ["NW", "Nordrhein-Westfalen"],
  ["RP", "Rheinland-Pfalz"],
  ["SL", "Saarland"],
  ["SN", "Sachsen"],
  ["ST", "Sachsen-Anhalt"],
  ["SH", "Schleswig-Holstein"],
  ["TH", "Thüringen"],
];
const kistRate = () => (["BY", "BW"].includes(store.settings.land || "NW") ? 0.08 : 0.09);
function soliOf(t, joint) {
  const fg = TAX26.soliFG * (joint ? 2 : 1);
  return t <= fg ? 0 : Math.min(t * 0.055, (t - fg) * 0.119);
}
function est56(x) {
  x = Math.max(0, x);
  return Math.max(Math.floor(2 * (incomeTax(1.25 * x) - incomeTax(0.75 * x))), Math.floor(x * 0.14));
}
function lstEstimate(brutto, kl) {
  if (!(brutto > 0)) return 0;
  const vp =
    store.settings.work === "beamte"
      ? Math.min(brutto * 0.12, 1900)
      : Math.min(brutto, TAX26.bbgRV) * 0.093 + Math.min(brutto, TAX26.bbgKV) * 0.1055;
  const zv = Math.max(0, brutto - vp - (kl === 6 ? 0 : TAX26.anPausch + TAX26.sonderPausch));
  if (kl === 3) return estSplit(zv);
  if (kl === 2) return incomeTax(zv - TAX26.entlastung);
  if (kl === 5 || kl === 6) return est56(zv);
  return incomeTax(zv);
}
function estFull(zve, joint, z, ersatz, anrMax) {
  const T = (x) => (joint ? estSplit(x) : incomeTax(x));
  const tarif = (x) => {
    const b = x + ersatz;
    return x > 0 && b > 0 ? Math.floor(x * (T(b) / b)) : 0;
  };
  const kfb = z * TAX26.kinderFB,
    kg = z * TAX26.kindergeld;
  const t0 = tarif(zve),
    t1 = tarif(Math.max(0, zve - kfb)),
    useFB = z > 0 && t0 - t1 > kg;
  let e = useFB ? t1 + Math.round(kg) : t0;
  const anr = Math.min(anrMax || 0, e);
  e -= anr;
  const base = Math.max(0, t1 - anr);
  const soli = round2(soliOf(base, joint)),
    kist = store.settings.kirche ? round2(base * kistRate()) : 0;
  return {
    est: e,
    soli,
    kist,
    total: e + soli + kist,
    useFB,
    anr,
    kg,
  };
}
function lohnYear(year) {
  const ly = (store.settings.lohn || {})[year] || {};
  const n = Number(ly.n) || 12,
    extra = ["urlaub", "weihnacht", "bonus"].reduce((a, k) => a + (Number(ly[k]) || 0), 0);
  const mm = mindestMonat(year);
  const monat =
    mm > 0
      ? mm
      : ly.monat != null && ly.monat !== ""
        ? Number(ly.monat) || 0
        : Number(ly.brutto) > 0
          ? round2(Number(ly.brutto) / 12)
          : 0;
  const legacy = !(mm > 0) && ly.monat == null && Number(ly.brutto) > 0;
  const brutto = legacy
    ? Number(ly.brutto)
    : mindYear(year) > 0
      ? round2(mindYear(year) + extra)
      : round2(monat * n + extra);
  const base = {
    monat,
    n,
    urlaub: Number(ly.urlaub) || 0,
    weihnacht: Number(ly.weihnacht) || 0,
    bonus: Number(ly.bonus) || 0,
    extra,
    brutto,
    sonderzahl: legacy ? 0 : round2(monat * (n - 12) + extra),
    lst: ly.lst,
  };
  const sl = slipsOf(year);
  if (sl.length) {
    const avg = (k) => sum(sl, (x) => Number(x[k]) || 0) / sl.length,
      miss = 12 - sl.length,
      est = monat > 0 ? monat : avg("brutto");
    base.slips = sl.length;
    base.estMonth = est;
    const slipYm = new Set(sl.map((x) => x.ym)),
      estMiss = mindPer().length
        ? Array.from(
            {
              length: 12,
            },
            (_, i) => year + "-" + pad(i + 1)
          )
            .filter((ym) => !slipYm.has(ym))
            .reduce((a, ym) => a + mindestYm(ym), 0)
        : miss * est;
    base.brutto = round2(sum(sl, (x) => Number(x.brutto) || 0) + estMiss);
    base.sonderzahl = 0;
    const r = monat > 0 && avg("brutto") > 0 ? est / avg("brutto") : 1;
    base.slipLst = round2(sum(sl, (x) => Number(x.lst) || 0) + miss * avg("lst") * r);
    base.slipSoli = round2(sum(sl, (x) => Number(x.soli) || 0) + miss * avg("soli") * r);
    base.slipKist = round2(sum(sl, (x) => Number(x.kist) || 0) + miss * avg("kist") * r);
    base.slipSv = round2(
      sum(sl, (x) => (Number(x.kv) || 0) + (Number(x.rv) || 0)) + miss * (avg("kv") + avg("rv")) * r
    );
  }
  return base;
}
function slipsOf(year) {
  return Object.entries(store.settings.slips || {})
    .filter(([ym]) => ym.startsWith(year + "-"))
    .map(([ym, v]) => ({
      ym,
      ...v,
    }))
    .sort((a, b) => a.ym.localeCompare(b.ym));
}
function wkCfg(year) {
  return (store.settings.wk || {})[year] || {};
}
function wkCalc(year) {
  const c = wkCfg(year),
    HO = hoCalc(year),
    home = HO.on ? (hasSelf() ? 0 : HO.amt) : Math.min(1260, (Number(c.home) || 0) * 6),
    km = Number(c.km) || 0,
    days = Number(c.days) || 0;
  const perDay = Number(year) >= 2026 ? km * 0.38 : Math.min(km, 20) * 0.3 + Math.max(0, km - 20) * 0.38;
  const fahrt = round2(perDay * days);
  const txs = store.tx.filter((t) => t.wk && (t.date || "").startsWith(year + "-"));
  const mittel = sum(txs, (t) => t.amount),
    own = c.items || [],
    eigene = sum(own, (x) => Number(x.amount) || 0);
  const total = round2(home + fahrt + mittel + eigene);
  return {
    HO,
    home,
    homeDays: HO.on ? HO.days : Number(c.home) || 0,
    km,
    days,
    fahrt,
    txs,
    mittel,
    own,
    eigene,
    total,
    used: total > 0,
  };
}
function rentAnteil(y) {
  y = Number(y) || 2026;
  if (y <= 2005) return 50;
  if (y <= 2020) return 50 + 2 * (y - 2005);
  if (y <= 2022) return 80 + (y - 2020);
  return Math.min(100, 82.5 + 0.5 * (y - 2023));
}
function taxStatus(y, tax) {
  const w = store.settings.work;
  const sal =
    tax.brutto > 0 ||
    store.tx.some(
      (t) =>
        t.kind === "einnahme" &&
        (t.date || "").startsWith(String(y)) &&
        ["lohn", "sonderzahlung"].includes(incArt(t.cat))
    );
  if (hasSelf())
    return {
      show: true,
      sal,
      kind: "self",
    };
  const jobMain = ["angestellt", "beamte", "azubi"].includes(w) || hasExtra("angestellt");
  const minijobOnly = (w === "minijob" || hasExtra("minijob")) && !jobMain && tax.brutto <= 0;
  let kind = "none",
    why = "";
  if (tax.ersatz > 410 && sal) {
    kind = "pflicht";
    why =
      w === "eltern"
        ? "Elterngeld"
        : w === "krank"
          ? "Krankengeld"
          : w === "alg"
            ? "Arbeitslosengeld"
            : "Lohnersatz (z. B. ALG I, Krankengeld, Elterngeld)";
  } else if (tax.rente > 0 && tax.due >= 1) {
    kind = "pflicht";
    why = "rente";
  } else if (sal && tax.due <= -1) kind = "erstattung";
  else if (sal && tax.due >= 1) kind = "nach";
  const show = jobMain || kind !== "none" || (!minijobOnly && (sal || tax.rente > 0));
  return {
    show,
    sal,
    kind,
    why,
    jobMain,
  };
}
function taxCalc(year) {
  let self = 0,
    betr = 0,
    ersatz = 0,
    vz = 0,
    resIn = 0,
    rente = 0;
  for (let i = 1; i <= 12; i++) {
    const c = monthCalc(year + "-" + pad(i));
    self += c.selfInc;
    betr += c.bet + c.fixPaidBet;
    ersatz += c.ersatz;
    vz += c.vz;
    resIn += c.reserve;
    rente += c.rente;
  }
  const st = store.settings,
    joint = !!st.splitting,
    kl = Number(st.steuerklasse) || 1,
    z = Number(st.kinder) || 0,
    ly = (st.lohn || {})[year] || {};
  const AF = afaYear(year);
  betr = round2(betr - AF.removed);
  const HO = hoCalc(year),
    ho = hasSelf() ? HO.amt : 0;
  const gewinn = self - betr - AF.afa - ho;
  const LY = lohnYear(year),
    WKc = wkCalc(year);
  const brutto = LY.brutto,
    wk = Math.max(TAX26.anPausch, WKc.used ? WKc.total : Number(st.werbungskosten) || 0),
    lohnEink = brutto > 0 ? Math.max(0, brutto - wk) : 0;
  const vorsorge = Number(st.vorsorge) || 0,
    sonder = Math.max(TAX26.sonderPausch, Number(st.abzuege) || 0);
  const entl = kl === 2 ? TAX26.entlastung + Math.max(0, Math.ceil(z) - 1) * TAX26.entlastungKind : 0;
  const rStart = Number(st.rentStart) || year,
    rAnteil = rentAnteil(rStart),
    renteSt = rente > 0 ? Math.max(0, round2((rente * rAnteil) / 100 - 102)) : 0;
  const zve = Math.max(0, gewinn + lohnEink + renteSt - vorsorge - sonder - entl);
  let gewst = 0,
    anrMax = 0;
  if (st.gewerbe && gewinn > TAX26.gewFB) {
    const mb = Math.floor((gewinn - TAX26.gewFB) / 100) * 100 * 0.035;
    gewst = round2((mb * (Number(st.hebesatz) || 400)) / 100);
    anrMax = Math.min(4 * mb, gewst);
  }
  const partner = joint ? Math.max(0, Number(st.partnerZvE) || 0) : 0;
  const all = estFull(zve + partner, joint, z, ersatz, anrMax);
  const pAlone = joint
    ? estFull(partner, false, 0, 0, 0)
    : {
        est: 0,
        soli: 0,
        kist: 0,
        total: 0,
      };
  const mine = {
    est: Math.max(0, all.est - pAlone.est),
    soli: Math.max(0, all.soli - pAlone.soli),
    kist: Math.max(0, all.kist - pAlone.kist),
  };
  mine.total = mine.est + mine.soli + mine.kist;
  const fromSlips = LY.slips > 0;
  const lstEst = brutto > 0 && !fromSlips && !(ly.lst >= 0 && ly.lst !== "" && ly.lst != null);
  const lst =
    brutto > 0
      ? fromSlips
        ? LY.slipLst
        : lstEst
          ? LY.monat > 0 && LY.n < 12
            ? round2((lstEstimate(LY.monat * 12, kl) * LY.n) / 12)
            : lstEstimate(brutto, kl)
          : Number(ly.lst) || 0
      : 0;
  const soliL = fromSlips ? LY.slipSoli : round2(soliOf(lst, kl === 3)),
    kistL = fromSlips ? LY.slipKist : st.kirche ? round2(lst * kistRate()) : 0;
  const paid = lst + soliL + kistL + vz;
  const due = round2(mine.total - paid);
  return {
    AF,
    afa: AF.afa,
    HO,
    ho,
    rente,
    rStart,
    rAnteil,
    renteSt,
    self,
    betr,
    gewinn,
    brutto,
    wk,
    lohnEink,
    vorsorge,
    sonder,
    entl,
    zve,
    partner,
    ersatz,
    z,
    kl,
    joint,
    all,
    pAlone,
    mine,
    tax: mine.total,
    gewst,
    anr: all.anr,
    lst,
    lstEst,
    soliL,
    kistL,
    vz,
    paid,
    due,
    resIn,
    resBal: Math.max(0, resIn - vz),
  };
}

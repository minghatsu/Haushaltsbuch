/* Kontostände */
function recordAccounts(items) {
  if (!mem || !items || !items.some((it) => it.acct)) return;
  const byMonth = {};
  for (const it of items) {
    if (!it.acct) continue;
    (byMonth[it.date.slice(0, 7)] = byMonth[it.date.slice(0, 7)] || []).push(it);
  }
  for (const [ym, list] of Object.entries(byMonth)) {
    const doc = clone(
      memStore.acct[ym] || {
        rows: {},
      }
    );
    doc.rows = doc.rows || {};
    let changed = false;
    for (const it of list) {
      const v = [it.acct, round2(it.amount), it.date];
      const o = doc.rows[it.key];
      if (!o || o[0] !== v[0] || o[1] !== v[1] || o[2] !== v[2]) {
        doc.rows[it.key] = v;
        changed = true;
      }
    }
    if (changed) {
      memStore.acct[ym] = doc;
      enqueue("app", "acct-" + ym, doc);
    }
  }
  persistLocal();
}
function ledgerRows(name) {
  const out = [];
  for (const d of Object.values(memStore.acct))
    for (const [acc, v, date] of Object.values(d.rows || {}))
      if (acc === name)
        out.push({
          v,
          date,
        });
  return out;
}
function accountNames() {
  const n = new Set();
  for (const d of Object.values(memStore.acct)) for (const r of Object.values(d.rows || {})) n.add(r[0]);
  return [...n].sort((a, b) => (b === "Hauptkonto") - (a === "Hauptkonto") || a.localeCompare(b, "de"));
}
/* Selbst eingetippte Buchungen (nicht aus dem Kontoauszug, nicht bar) verändern den Hauptkonto-Stand */
function manualSign(t) {
  if (!t || t.importKey || t.pay === "bar" || t.source === "bank") return 0;
  const k = t.kind;
  if (k === "einnahme") return 1;
  if (k === "ausgabe" || k === "betrieb" || k === "vorauszahlung") return -1;
  return 0;
}
function manualDelta(a, lastImp, asOf, name) {
  const at = a.ts || 0;
  let d = 0;
  let cut = "";
  if (lastImp) {
    const x = new Date(lastImp + "T12:00:00");
    x.setDate(x.getDate() - 10);
    cut = isoOf(x);
  }
  for (const t of store.tx || []) {
    const sg = manualSign(t);
    if (!sg || !t.date || t.date > asOf || t.date <= cut || (t.acct || "Hauptkonto") !== (name || "Hauptkonto"))
      continue;
    const ad = a.date > asOf ? asOf : a.date;
    const after = t.date > ad || (t.date === ad && (!at || (t.ts || 0) > at || a.date > asOf));
    if (after) d += sg * (Number(t.amount) || 0);
  }
  return d;
}
/* Buchung einem Space zugeordnet, die Bank hat aber vom Hauptkonto abgebucht:
     Space sinkt, Hauptkonto bekommt es zurück – bis du in der Bank umbuchst (wird am Kontoauszug erkannt). */
const POT = {
  tok: null,
  c: {},
  rk: null,
  rkn: -1,
};
function rowAcctMap() {
  let n = 0;
  for (const d of Object.values(memStore.acct || {})) n += Object.keys(d.rows || {}).length;
  if (POT.rk && POT.rkn === n) return POT.rk;
  const m = new Map();
  for (const d of Object.values(memStore.acct || {})) for (const [k, r] of Object.entries(d.rows || {})) m.set(k, r[0]);
  POT.rk = m;
  POT.rkn = n;
  return m;
}
function bankAcctOf(t) {
  if (!t || !t.importKey) return null;
  const m = rowAcctMap();
  return m.get(t.importKey) || (t.keys2 || []).map((k) => m.get(k)).find(Boolean) || t.bacct || null;
}
function potCache() {
  let n = 0;
  for (const d of Object.values(memStore.acct || {})) n += Object.keys(d.rows || {}).length;
  if (POT.tok && POT.tok[0] === store.tx && POT.tok[1] === n) return POT.c;
  const out = {},
    known = new Set(kaAll()),
    dd = (a, b) => Math.abs((new Date(a + "T12:00:00") - new Date(b + "T12:00:00")) / 864e5);
  for (const t of store.tx || []) {
    if (!t.importKey || !t.acct || !t.date) continue;
    const P = t.acct,
      B = bankAcctOf(t);
    if (!B || P === B || P === "Hauptkonto" || !known.has(P) || !known.has(B)) continue;
    const k = t.kind,
      sg = k === "ausgabe" || k === "betrieb" || k === "vorauszahlung" ? 1 : k === "einnahme" ? -1 : 0;
    if (!sg) continue;
    (out[P] = out[P] || {
      bank: B,
      ev: [],
    }).ev.push({
      d: t.date,
      v: sg * (Number(t.amount) || 0),
    });
  }
  for (const [P, o] of Object.entries(out)) {
    const first = o.ev.reduce((m, e) => (!m || e.d < m ? e.d : m), ""),
      pr = ledgerRows(P).filter((r) => r.v < 0 && r.date >= first),
      br = ledgerRows(o.bank).filter((r) => r.v > 0),
      used = new Set();
    for (const r of pr) {
      const j = br.findIndex((x, ix) => !used.has(ix) && Math.abs(x.v + r.v) < 0.005 && dd(x.date, r.date) <= 1);
      if (j >= 0) {
        used.add(j);
        o.ev.push({
          d: r.date,
          v: r.v,
          st: 1,
        });
      }
    }
    o.ev.sort((a, b) => a.d.localeCompare(b.d) || (a.st ? 1 : 0) - (b.st ? 1 : 0));
  }
  POT.tok = [store.tx, n];
  POT.c = out;
  return out;
}
function potOpen(P, asOf) {
  const o = potCache()[P];
  if (!o) return 0;
  const dn = (store.settings.potDone || {})[P];
  let open = 0;
  for (const e of o.ev) {
    if (e.d > asOf) break;
    open = e.st ? Math.max(0, open + e.v) : open + e.v;
  }
  /* „Erledigt“: bis dahin offener Betrag zählt nicht mehr (in der Bank umgebucht oder bewusst so gelassen) */
  if (dn && asOf >= dn.d) open -= Number(dn.v) || 0;
  return Math.max(0, round2(open));
}
function potSettle(P) {
  const td = isoToday(),
    o = potCache()[P];
  if (!o) return;
  let raw = 0;
  for (const e of o.ev) {
    if (e.d > td) break;
    raw = e.st ? Math.max(0, raw + e.v) : raw + e.v;
  }
  store.settings.potDone = {
    ...(store.settings.potDone || {}),
    [P]: {
      d: td,
      v: round2(Math.max(0, raw)),
    },
  };
}
function potList() {
  const out = [],
    td = isoToday();
  for (const [P, o] of Object.entries(potCache())) {
    const v = potOpen(P, td);
    if (v >= 0.01)
      out.push({
        p: P,
        bank: o.bank,
        v,
      });
  }
  return out;
}
function accountBalance(name, asOf) {
  const a = (store.settings.accountAnchors || {})[name];
  if (!a) return null;
  let b = Number(a.balance) || 0,
    last = "";
  for (const d of Object.values(memStore.acct))
    for (const [acc, v, date] of Object.values(d.rows || {})) {
      if (acc !== name) continue;
      if (date > last) last = date;
      if (date > a.date && date <= asOf) b += v;
      else if (date <= a.date && date > asOf) b -= v;
    }
  b += manualDelta(a, last, asOf, name);
  /* Von Hand abgehakte Fixkosten: das Geld ist weg, auch wenn noch kein Kontoauszug da ist (bis die Bank-Buchung kommt) */
  {
    let cut = "";
    if (last) {
      const x = new Date(last + "T12:00:00");
      x.setDate(x.getDate() - 10);
      cut = isoOf(x);
    }
    for (const [ym, m] of Object.entries(store.months || {})) {
      if (!m || !m.man) continue;
      for (const [fid, x] of Object.entries(m.man)) {
        if (!x || !(fid in (m.paid || {})) || !x.d || x.d > asOf || x.d <= cut) continue;
        if (fxAcct(store.fixed.find((f) => f.id === fid)) !== name) continue;
        if (x.d > a.date || (x.d === a.date && (x.ts || 0) > (a.ts || 0))) b -= Number(m.paid[fid]) || 0;
      }
    }
  }
  /* In der App umgebuchtes Geld (ziehen & senden) – bis die Bank-Umbuchung im Kontoauszug auftaucht */
  for (const m of store.settings.moves || []) {
    if (m.from !== name && m.to !== name) continue;
    if (!m.date || m.date > asOf) continue;
    if (!(m.date > a.date || (m.date === a.date && (m.ts || 0) > (a.ts || 0)))) continue;
    if (moveInBank(m)) continue;
    b += (m.to === name ? 1 : -1) * (Number(m.amt) || 0);
  }
  /* Offene Space-Umbuchungen nur ab dem eingetragenen Stand rechnen – der eingetippte Stand enthält alles davor schon */
  try {
    const po = potCache(),
      dv = (P) => potOpen(P, asOf) - potOpen(P, a.date);
    if (po[name]) b -= dv(name);
    for (const [P, o] of Object.entries(po)) if (o.bank === name) b += dv(P);
  } catch (_) {}
  return round2(b);
}
/* Steht die Umbuchung schon im Kontoauszug? (Abgang und Eingang, gleicher Betrag, bis 5 Tage danach) */
function moveInBank(m) {
  const lim = new Date(m.date + "T12:00:00");
  lim.setDate(lim.getDate() + 5);
  const end = isoOf(lim),
    amt = Number(m.amt) || 0;
  const hit = (n, sg) =>
    n === "Bargeld" || ledgerRows(n).some((r) => r.date >= m.date && r.date <= end && Math.abs(r.v - sg * amt) < 0.005);
  return hit(m.from, -1) && hit(m.to, 1);
}
function lastDayOf(ym) {
  return ym + "-" + pad(daysIn(ym));
}
function renderAccounts() {
  const el = $("acctEd");
  if (!el || el.contains(document.activeElement)) return;
  const names = accountNames();
  el.innerHTML =
    (names.length
      ? acctRows(names)
      : `<span class="small muted">Importier einmal deine Kontoauszüge. Dann erscheinen hier deine Konten (bei N26 auch Hauptkonto und Spaces).</span>`) +
    acctYearBlock();
}
function acctRows(names) {
  const today = isoOf(new Date());
  return names
    .map((n) => {
      const b = accountBalance(n, today),
        a = (store.settings.accountAnchors || {})[n];
      return `<div class="edit-row acct-row"><span><b>${escHtml(n)}</b><br><span class="small muted">${b === null ? "Stand noch nicht eingetragen" : `heute ${escHtml(fmtEur(b))}${a && a.date !== today ? ` · eingetragen am ${escHtml(shortDate(a.date))}` : ""}`}</span></span><input class="in" data-acctbal="${escHtml(n)}" inputmode="decimal" placeholder="${b === null ? "Stand heute" : "ändern"}" aria-label="Kontostand ${escHtml(n)} heute" value=""></div>`;
    })
    .join("");
}
document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-acctbal]");
  if (!el) return;
  const raw = el.value.trim();
  const s = {
    ...(store.settings.accountAnchors || {}),
  };
  if (raw === "") {
    return;
  }
  const v = parseAmt(raw);
  if (!isFinite(v)) {
    toast("Bitte eine Zahl eingeben");
    return;
  }
  s[el.dataset.acctbal] = {
    date: isoOf(new Date()),
    balance: round2(v),
    ts: Date.now(),
  };
  store.settings.accountAnchors = s;
  el.value = "";
  el.blur();
  saveSettings();
  toast("Gespeichert");
  render();
});
/* Doppelte Buchungen: selbst eingetragen + später aus dem Kontoauszug */
const DUP_STOP =
  /^(gmbh|markt|mark|und|der|die|das|sagt|danke|filiale|ohg|kg|ag|se|co|sepa|lastschrift|kartenzahlung|zahlung|einkauf|vom|von|bei|fil|nr|ec|pos|online|de|com|www)$/;
function txNameKey(x) {
  const b = brandFor(x || "");
  if (b && (b.domain || b.t)) return "b:" + (b.domain || b.t);
  return normText(x || "")
    .replace(/[^a-z0-9äöüß]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 2 && !DUP_STOP.test(w) && !/^\d+$/.test(w));
}
function txSameName(a, b) {
  const x = txNameKey(a),
    y = txNameKey(b);
  if (typeof x === "string" || typeof y === "string") return x === y;
  return x.length > 0 && y.length > 0 && x.some((w) => y.some((v) => v.startsWith(w) || w.startsWith(v)));
}
function dupPairs() {
  const day = (d) => new Date(d + "T12:00:00").getTime() / 864e5,
    ok = new Set(store.settings.dupOk || []),
    lim = day(isoToday()) - 60;
  const rc = (id) => {
    try {
      return hasReceipt(id);
    } catch (_) {
      return false;
    }
  };
  const out = [],
    used = new Set();
  /* gleicher Bank-Schlüssel zweimal (z. B. nach Sync) – immer doppelt */
  const byKey = new Map();
  for (const t of store.tx)
    if (t.importKey) {
      if (!byKey.has(t.importKey)) byKey.set(t.importKey, []);
      byKey.get(t.importKey).push(t);
    }
  for (const L of byKey.values())
    if (L.length > 1) {
      const keep = L.slice().sort(
        (a, b) => rc(b.id) - rc(a.id) || (a._b ? 1 : 0) - (b._b ? 1 : 0) || String(a.date).localeCompare(String(b.date))
      )[0];
      for (const t of L)
        if (t !== keep) {
          used.add(t.id);
          used.add(keep.id);
          out.push({
            m: keep,
            i: t,
            sure: true,
            same: true,
          });
        }
    }
  const man = store.tx.filter(
    (t) => t.date && !used.has(t.id) && t.kind !== "umbuchung" && t.kind !== "abhebung" && (!t.importKey || rc(t.id))
  );
  const imp = store.tx
    .filter((t) => t.importKey && t.date && !used.has(t.id) && t.kind !== "umbuchung" && t.kind !== "abhebung")
    .sort((a, b) => a.date.localeCompare(b.date));
  const byAmt = new Map();
  for (const m of man) {
    const k = Math.round(Number(m.amount) * 100);
    if (!byAmt.has(k)) byAmt.set(k, []);
    byAmt.get(k).push(m);
  }
  for (const i of imp) {
    const di = day(i.date);
    let best = null,
      bs = 99,
      bsame = false;
    for (const m of byAmt.get(Math.round(Number(i.amount) * 100)) || []) {
      if (
        used.has(m.id) ||
        m.id === i.id ||
        (m.importKey &&
          (rc(i.id) || !txSameName(m.note || "", (i.note || "") + " " + (i.bank || "") + " " + (i.ref || ""))))
      )
        continue;
      if ((m.kind === "einnahme") !== (i.kind === "einnahme")) continue;
      if (ok.has(m.id + "|" + i.id)) continue;
      const g = di - day(m.date);
      if (g < -2 || g > 5) continue;
      const same = txSameName(m.note || "", (i.note || "") + " " + (i.bank || "") + " " + (i.ref || ""));
      if (!same && (Math.min(di, day(m.date)) < lim || g < -1 || g > 4)) continue;
      const sc = Math.abs(g) + (same ? -3 : 0);
      if (sc < bs) {
        bs = sc;
        best = m;
        bsame = same;
      }
    }
    if (best) {
      used.add(best.id);
      out.push({
        m: best,
        i,
        sure: bsame && !best.importKey,
      });
    }
  }
  return out;
}
async function dupMerge(pr) {
  const { m, i } = pr;
  const d = plainTx(m);
  if (d.importKey && d.importKey !== i.importKey)
    d.keys2 = [...new Set([...(d.keys2 || []), i.importKey, ...(i.keys2 || [])])];
  else d.importKey = i.importKey;
  if (i.bank || i.note) d.bank = String(i.bank || i.note).slice(0, 80);
  if (!d.ref && i.ref) d.ref = i.ref;
  if (i.source) d.source = i.source;
  await saveTxDoc(m.id, d, m);
  await delTxDoc(i);
}
const DUP = {
  t: 0,
  busy: false,
};
async function dupAuto() {
  if (DUP.busy || ui.imp || ui.importing) return;
  let L;
  try {
    L = dupPairs().filter((p) => p.sure);
  } catch (_) {
    return;
  }
  if (!L.length) return;
  DUP.busy = true;
  let n = 0;
  try {
    for (const p of L) {
      await dupMerge(p);
      n++;
    }
  } catch (e) {
    reportErr(e);
  }
  DUP.busy = false;
  if (n) {
    toast(
      uiText(n === 1 ? "dup_auto1" : "dup_auto", {
        n: String(n),
      })
    );
    render();
  }
}
function dupSoon() {
  clearTimeout(DUP.t);
  DUP.t = setTimeout(dupAuto, 1500);
}
function dupWatch() {
  const sig = store.tx.length + "|" + store.tx.reduce((a, t) => a + (t.importKey ? 1 : 0), 0);
  if (sig !== DUP.sig) {
    DUP.sig = sig;
    dupSoon();
  }
}
function dupRender() {
  const el = $("dupCard");
  if (!el) return;
  let L = [];
  try {
    L = dupPairs().filter((p) => !p.sure);
  } catch (_) {}
  if (!L.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const row = (
    p,
    k
  ) => `<div class="duprow" style="--d:${k * 60}ms"><div class="dupx"><span>${escHtml(p.m.note || p.m.cat || "–")}<small>${escHtml(shortDate(p.m.date))} · ${escHtml(uiText("dup_own"))}</small></span><span>${escHtml(p.i.note || p.i.bank || "–")}<small>${escHtml(shortDate(p.i.date))} · ${escHtml(uiText("dup_bank"))}</small></span></div><b class="amt">${escHtml(fmtEur(p.m.amount))}</b>
    <div class="dupb"><button class="btn primary" data-dupm="${escHtml(p.m.id)}|${escHtml(p.i.id)}">${escHtml(uiText("dup_merge"))}</button><button class="btn" data-dupk="${escHtml(p.m.id)}|${escHtml(p.i.id)}">${escHtml(uiText("dup_keep"))}</button></div></div>`;
  el.hidden = false;
  el.className = "card dupcard";
  el.innerHTML = `<div class="duph">${svgIcon("insight", 20)}<div><b>${escHtml(
    uiText(L.length === 1 ? "dup_t1" : "dup_t", {
      n: String(L.length),
    })
  )}</b><small>${escHtml(uiText("dup_s"))}</small></div></div>${L.map(row).join("")}`;
}
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-dupm],[data-dupk]");
  if (!a) return;
  const [mi, ii] = (a.dataset.dupm || a.dataset.dupk).split("|");
  const r = a.closest(".duprow");
  if (a.dataset.dupk) {
    store.settings.dupOk = [...(store.settings.dupOk || []), mi + "|" + ii].slice(-500);
    saveSettings();
    if (r) r.classList.add("gone");
    setTimeout(() => {
      dupRender();
    }, 320);
    return;
  }
  const m = store.tx.find((t) => t.id === mi),
    i = store.tx.find((t) => t.id === ii);
  if (!m || !i) return;
  a.disabled = true;
  try {
    await dupMerge({
      m,
      i,
    });
    if (r) r.classList.add("gone");
    toast(uiText("dup_done"));
    setTimeout(() => render(), 320);
  } catch (err) {
    a.disabled = false;
    reportErr(err);
  }
});
function mergeMatch(items) {
  const day = (d) => new Date(d + "T12:00:00").getTime() / 864e5,
    used = new Set();
  const pool = store.tx.filter((t) => !t.importKey && t.date && t.kind !== "umbuchung" && t.kind !== "abhebung");
  const cand = items.filter((it) => !it.dup && !it.internal && !it.ppDup).sort((a, b) => a.date.localeCompare(b.date));
  for (const it of cand) {
    const a = Math.abs(it.amount),
      d = day(it.date);
    let best = null,
      bd = 9;
    for (const t of pool) {
      if (used.has(t) || Math.abs(Number(t.amount) - a) > 0.005) continue;
      if (it.amount > 0 !== (t.kind === "einnahme")) continue;
      const g = d - day(t.date);
      if (g < -2 || g > 5) continue;
      const same = txSameName(t.note || "", (it.alias || "") + " " + (it.payee || "") + " " + (it.ref || ""));
      if (t.pay === "bar" && !same) continue;
      if (!same && (g < -1 || g > 4)) continue;
      const sc = Math.abs(g) + (same ? -3 : 0);
      if (sc < bd) {
        bd = sc;
        best = t;
      }
    }
    if (best) {
      used.add(best);
      it.merge = {
        id: best.id,
        note: best.note || best.cat || "Buchung",
        date: best.date,
      };
      it.target = "merge|" + best.id;
      it.sure = true;
      it.maybeDup = false;
    }
  }
}
function ppMatch(items, isPP) {
  const RX = /paypal/,
    day = (d) => new Date(d + "T12:00:00").getTime() / 864e5,
    used = new Set();
  const pool = store.tx.filter((t) => t.kind !== "einnahme" && t.date);
  for (const it of items) {
    if (it.dup || it.internal || it.amount >= 0 || it.target === "skip|") continue;
    const bankPP = !isPP && RX.test(normText(it.payee + " " + it.ref));
    if (!isPP && !bankPP) continue;
    const a = Math.abs(it.amount),
      d = day(it.date);
    const t = pool.find((t) => {
      if (used.has(t) || Math.abs(Number(t.amount) - a) > 0.005) return false;
      const tPP = t.source === "paypal",
        tBankPP = !tPP && RX.test(normText((t.note || "") + " " + (t.ref || "")));
      const gap = isPP ? day(t.date) - d : d - day(t.date);
      return gap >= -1 && gap <= 5 && (isPP ? tBankPP : tPP || !tBankPP);
    });
    if (t) {
      used.add(t);
      it.ppDup = isPP ? "bank" : "paypal";
      it.ppWith = t.note || "";
      it.target = "skip|";
      it.sure = true;
    }
  }
}
function buildItems() {
  const imp = ui.imp,
    m = imp.map;
  if (m.date < 0 || m.amount < 0) {
    imp.items = null;
    return;
  }
  const keys = knownKeys(),
    ignored = new Set(store.settings.ignoredKeys || []),
    seen = new Set(),
    items = [];
  const spaces = new Set();
  if (m.account >= 0)
    for (const r of imp.raw) {
      const a = normText(r[m.account]);
      if (a) spaces.add(a);
    }
  for (const n of store.settings.spaces || []) spaces.add(normText(n));
  imp.spaces = spaces;
  const soft = {};
  if (imp.pdf)
    for (const t of store.tx) {
      const sk = t.date + "|" + Number(t.amount).toFixed(2);
      soft[sk] = (soft[sk] || 0) + 1;
    }
  const dts = imp.raw.map((r) => parseDate(r[m.date])).filter(Boolean),
    desc = dts.length > 1 && dts[0] > dts[dts.length - 1];
  for (const [ri, r] of imp.raw.entries()) {
    const date = parseDate(r[m.date]);
    let amount = parseBankAmt(r[m.amount]);
    if (m.soll >= 0 && m.haben >= 0 && (m.amount === m.soll || !String(r[m.amount] || "").trim())) {
      const so = parseBankAmt(r[m.soll]),
        ha = parseBankAmt(r[m.haben]);
      amount = (isFinite(ha) ? Math.abs(ha) : 0) - (isFinite(so) ? Math.abs(so) : 0);
    }
    if (m.sh >= 0 && isFinite(amount)) {
      const sh = normText(r[m.sh]);
      if (sh === "s" || sh === "soll") amount = -Math.abs(amount);
      else if (sh === "h" || sh === "haben") amount = Math.abs(amount);
    }
    if (!date || !isFinite(amount) || amount === 0) continue;
    if (m.status >= 0 && /vorgemerkt|pending|ausstehend|offen|storniert|abgelehnt/.test(normText(r[m.status])))
      continue;
    const payee =
      amount > 0 && m.payer >= 0 && String(r[m.payer] || "").trim() ? r[m.payer] : m.payee >= 0 ? r[m.payee] : "";
    const it = {
      date,
      amount,
      payee: payee || "",
      ref: (m.ref >= 0 ? r[m.ref] : "") || "",
      type: (m.type >= 0 ? r[m.type] : "") || "",
      acct: m.account >= 0 ? String(r[m.account] || "").trim() : "",
    };
    let key = hashKey(date + "|" + amount.toFixed(2) + "|" + normText(it.payee) + "|" + normText(it.ref).slice(0, 60));
    while (seen.has(key)) key += "b";
    seen.add(key);
    it.ord = desc ? imp.raw.length - ri : ri;
    it.key = key;
    it.ignored = ignored.has(key) && !keys.has(key);
    it.dup = keys.has(key) || (it.ignored && !imp.showIgnored);
    if (imp.pdf && !it.dup) {
      const sk = date + "|" + Math.abs(amount).toFixed(2);
      if ((soft[sk] || 0) > 0) {
        soft[sk]--;
        it.maybeDup = true;
      }
    }
    const ppInternal =
      m.paypal &&
      /bankgutschrift|bankkonto|vom nutzer eingeleitete abbuchung|abbuchung auf bankkonto|einzahlung|währungsumrechnung|waehrungsumrechnung|currency conversion|bank deposit|withdrawal|general authorization|allgemeine autorisierung/.test(
        normText(it.type + " " + it.ref)
      );
    {
      const al = (store.settings.payeeAlias || {})[normText(it.payee)];
      if (al) it.alias = al;
    }
    const s =
      spaces.has(normText(it.payee)) || ppInternal
        ? {
            target: "skip|",
            sure: true,
            internal: true,
          }
        : suggest(
            it.alias && !(store.settings.rules || []).some((r) => r.match === normText(it.payee))
              ? {
                  ...it,
                  payee: it.alias,
                }
              : it
          );
    it.internal = !!s.internal;
    it.target = s.target;
    it.sure = s.sure;
    it.learned = !!s.learned;
    it.remember = false;
    if (it.maybeDup) {
      it.target = "skip|";
      it.sure = true;
    }
    items.push(it);
  }
  ppMatch(items, !!m.paypal);
  mergeMatch(items);
  items.sort((a, b) => b.date.localeCompare(a.date));
  imp.items = items;
  refBackfill(items);
}
const ordTs = (it) => new Date(it.date + "T00:00:00").getTime() + (Number(it.ord) || 0);
async function refBackfill(items) {
  const byKey = new Map(),
    ordBy = new Map();
  for (const it of items)
    if (it.dup) {
      ordBy.set(it.key, ordTs(it));
      if (it.ref && String(it.ref).trim()) byKey.set(it.key, String(it.ref).replace(/\s+/g, " ").trim().slice(0, 120));
    }
  if (!ordBy.size) return;
  const bund = {};
  for (const t of store.tx) {
    if (!t.importKey || !ordBy.has(t.importKey) || !t._b) continue;
    if (t.ref && t.ts === ordBy.get(t.importKey)) continue;
    (bund[t._b] = bund[t._b] || []).push(t);
  }
  let n = 0;
  for (const [b, ts] of Object.entries(bund)) {
    const items2 = clone(store.txb[b] || {});
    let ch = 0,
      chr = 0;
    for (const t of ts) {
      const x = items2[t.id];
      if (!x) continue;
      if (!x.ref && byKey.has(t.importKey)) {
        x.ref = byKey.get(t.importKey);
        ch++;
        chr++;
      }
      if (x.ts !== ordBy.get(t.importKey)) {
        x.ts = ordBy.get(t.importKey);
        ch++;
      }
    }
    if (
      ch &&
      (await safe(() =>
        saveDoc("txb", b, {
          items: items2,
        })
      ))
    )
      n += chr;
  }
  if (n) {
    RECUR_TOLD = false;
    LOAN_TOLD = new Set();
    setTimeout(() => {
      loanCheck();
      recurCheck();
    }, 600);
  }
}
function renderImport() {
  const v = $("v-import"),
    imp = ui.imp;
  if (!imp) {
    v.innerHTML = `
      <div class="drop" id="drop">
        <span class="ictile" style="width:56px;height:56px;border-radius:18px;background:var(--accent-soft);color:var(--accent)">${svgIcon("arrowDown", 26)}</span>
        <div><b style="font-size:16px">Kontoauszug auswählen (CSV oder PDF)</b><br><span class="small muted">oder hierher ziehen</span></div>
        <button class="btn primary" id="pickCsv">Datei auswählen</button>
      </div>
      ${bankGuide()}
      <div class="card"><h2 style="margin-bottom:10px">Gut zu wissen</h2>
        <p class="small muted" style="margin:0 0 10px">Die App erkennt auch die CSV-Exporte von Sparkasse, Volksbank/Raiffeisenbank, ING, DKB, Commerzbank, comdirect, Postbank und PayPal. Den Export findest du meist im Online-Banking im Browser unter <b>Umsätze</b> › <b>Exportieren</b> bzw. <b>Download</b> › <b>CSV</b> (bei der Sparkasse „CSV-CAMT“).</p>
        <p class="small muted" style="margin:0 0 10px"><b>PDF-Kontoauszüge</b> gehen auch. Die App liest Datum, Empfänger und Betrag aus dem Auszug. Weil jede Bank ihre PDFs anders gestaltet, kurz drüberschauen. Am genauesten bleibt die CSV-Datei. Buchungen, die mit gleichem Tag und Betrag schon drin sind, werden als „schon vorhanden?“ übersprungen.</p>
        <p class="small muted" style="margin:0">PayPal: Aufladungen von deinem Bankkonto werden übersprungen, die stehen schon im Kontoauszug der Bank. Zahlst du per PayPal, steht die Zahlung dann aber in beiden Dateien – stell die PayPal-Abbuchungen im Bank-Import auf „Nicht übernehmen“, wenn du beide importierst.</p>
      </div>
      <button class="btn" data-go="list">Zurück zu den Buchungen</button>`;
    const dz = $("drop");
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("over");
    });
    dz.addEventListener("dragleave", () => dz.classList.remove("over"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("over");
      loadCsv(e.dataTransfer.files[0]);
    });
    return;
  }
  if (ui.importing) {
    const pr = ui.importing,
      pct = Math.round((pr.done / Math.max(1, pr.total)) * 100);
    v.innerHTML = `<div class="card" style="text-align:center;padding:32px 20px"><span class="ictile" style="margin:0 auto 12px;width:56px;height:56px;border-radius:18px;background:var(--accent-soft);color:var(--accent)">${svgIcon("arrowDown", 26)}</span><h2>Buchungen werden übernommen …</h2><div class="progress-big" style="margin:18px 0 8px"><div class="fill" style="width:${pct}%"></div></div><div class="small muted">${pct} % · bitte die App kurz offen lassen</div></div>`;
    return;
  }
  if ((v.contains(document.activeElement) && document.activeElement.tagName === "SELECT") || pdHold(v)) return;
  const colSel = (k, label, req) =>
    `<div class="field"><label for="map-${k}">${label}${req ? "" : " (optional)"}</label><select class="in" id="map-${k}" data-map="${k}"><option value="-1">–</option>${imp.headers.map((h, i) => `<option value="${i}" ${imp.map[k] === i ? "selected" : ""}>${escHtml(h || "Spalte " + (i + 1))}</option>`).join("")}</select></div>`;
  const mapping = `<div class="card"><div class="card-head"><h2>Spalten zuordnen</h2></div>
    <p class="small muted" style="margin:-4px 0 12px">${imp.items ? "Erkannt. Nur ändern, wenn etwas falsch aussieht." : "Die Spalten konnten nicht automatisch erkannt werden. Wähle bitte aus, welche Spalte was enthält."}</p>
    <div class="grid2">${colSel("date", "Datum", true)}${colSel("amount", "Betrag", true)}${colSel("payee", "Empfänger/Absender")}${colSel("ref", "Verwendungszweck")}</div></div>`;
  if (!imp.items) {
    v.innerHTML = `<div class="notice warn"><span>Datei: <b>${escHtml(imp.fileName)}</b></span></div>${mapping}<div class="row-btns"><button class="btn" id="impCancel">Abbrechen</button></div>`;
    return;
  }
  const fresh = imp.items.filter((i) => !i.dup),
    dups = imp.items.length - fresh.length;
  const nIgn = imp.items.filter((i) => i.ignored).length;
  const take = fresh.filter((i) => !i.target.startsWith("skip"));
  const unsure = fresh.filter((i) => !i.sure).length;
  const nFix = take.filter((i) => i.target.startsWith("fix|")).length;
  const vat = (Number(store.settings.vatRate) || 0) / 100;
  v.innerHTML = `
    <div class="card">
      <div class="small muted" style="margin-bottom:12px">${escHtml(imp.fileName)}</div>
      <div class="sumgrid"><div><b>${take.length - nFix}</b><span class="small muted">neue Buchungen</span></div><div><b>${nFix}</b><span class="small muted">Fixkosten abhaken</span></div><div><b>${dups}</b><span class="small muted">schon importiert</span></div></div>
      ${nIgn && !imp.showIgnored ? `<div class="notice info" style="margin-top:14px"><span>${nIgn} davon hast du früher bewusst übersprungen.</span><button class="btn" id="impShowIgn">Wieder anzeigen</button></div>` : ""}
      ${imp.photo ? stmtCheck(imp) + `<button class="btn" id="stmtMore" style="margin-top:10px">${svgIcon("camera", 17)} Weitere Seite fotografieren</button>` : ""}
      ${imp.pdf && !imp.photo ? `<div class="notice info" style="margin-top:14px"><span>Aus einer PDF gelesen. Prüf kurz Beträge und Vorzeichen.${imp.items.some((i) => i.maybeDup && !i.dup) ? ` <b>${imp.items.filter((i) => i.maybeDup && !i.dup).length}</b> mit gleichem Tag und Betrag gibt es schon – die werden übersprungen, außer du stellst sie um.` : ""}</span></div>` : ""}
      ${((n) => (n ? `<div class="notice info" style="margin-top:14px"><span>${trBold(imp.map.paypal ? (n === 1 ? "**1** PayPal-Zahlung steht schon aus dem Bank-Import drin und wird übersprungen, damit nichts doppelt zählt." : `**${n}** PayPal-Zahlungen stehen schon aus dem Bank-Import drin und werden übersprungen, damit nichts doppelt zählt.`) : n === 1 ? "**1** PayPal-Zahlung steht schon aus dem PayPal-Import drin und wird übersprungen, damit nichts doppelt zählt." : `**${n}** PayPal-Zahlungen stehen schon aus dem PayPal-Import drin und werden übersprungen, damit nichts doppelt zählt.`)}</span></div>` : ""))(imp.items.filter((i) => i.ppDup && !i.dup && i.target === "skip|").length)}
      ${unsure ? `<div class="notice warn" style="margin-top:14px"><span><b>${unsure}</b> ${unsure === 1 ? "Buchung ist" : "Buchungen sind"} unsicher zugeordnet und gelb markiert. Kurz prüfen, dann importieren.</span></div>` : ""}
    </div>
    ${(() => {
      const names = [...new Set(imp.items.map((i) => i.acct).filter(Boolean))].sort(
        (a, b) => (b === "Hauptkonto") - (a === "Hauptkonto") || a.localeCompare(b, "de")
      );
      return names.length && mem
        ? `<div class="card"><div class="card-head"><h2>Kontostände</h2><span class="small muted">aus dieser Datei</span></div><p class="small muted" style="margin:-6px 0 8px">Trag ein, was heute auf dem Konto ist. Den Rest rechnet die App aus.</p>${acctRows(names)}</div>`
        : "";
    })()}
    <div class="card">
      <div class="card-head"><h2>Buchungen prüfen</h2><span class="small muted">${fresh.length} neu</span></div>
      ${fresh.some((i) => i.payee) ? `<label class="rem" style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;padding:10px 12px;margin-bottom:6px;background:var(--sunk);border-radius:12px;cursor:pointer"><input type="checkbox" id="impAll" data-impall="1" style="width:19px;height:19px;accent-color:var(--accent)" ${fresh.filter((i) => i.payee).every((i) => i.remember) ? "checked" : ""}>Alle markieren <span class="small muted" style="font-weight:600">(alle Empfänger merken)</span></label>` : ""}
      ${
        fresh.length
          ? fresh
              .map((it) => {
                const idx = imp.items.indexOf(it),
                  pos = it.amount > 0;
                const selfNote =
                  it.target.startsWith("einnahme|") &&
                  incArt(it.target.slice(9)) === "selbst" &&
                  !store.settings.kleinunternehmer
                    ? `<span class="small muted">davon netto: ${escHtml(fmtEur(it.amount / (1 + vat)))}</span>`
                    : "";
                return `<div class="imp" data-imp="${idx}"><div style="min-width:0"><div class="who">${escHtml(it.alias || it.payee || it.ref || "Ohne Namen")}${it.alias ? ` <span class="small muted" style="font-weight:500">(${escHtml(it.payee)})</span>` : ""}</div><div class="ref">${escHtml(shortDate(it.date))}${it.ref && it.payee ? " · " + escHtml(it.ref) : ""}</div></div>
          <div class="amt ${pos ? "inc" : ""}" style="text-align:right">${pos ? "+" : "−"} ${escHtml(fmtEur(Math.abs(it.amount)))}</div>
          <div class="ctl"><select class="in" id="imp-${idx}" data-imptarget="${idx}" aria-label="Zuordnung" style="${it.sure ? "" : "border-color:var(--warn)"}">${targetOptions(it.target, pos, it.merge)}</select>
          ${it.merge && it.target.startsWith("merge|") ? `<span class="pill ok">mit „${escHtml(it.merge.note)}“ verknüpft</span>` : it.ppDup && it.target === "skip|" ? `<span class="pill warn" title="${escHtml(it.ppWith)}">schon über ${it.ppDup === "bank" ? "die Bank" : "PayPal"} drin</span>` : it.maybeDup && it.target === "skip|" ? `<span class="pill warn">schon vorhanden?</span>` : it.internal ? `<span class="pill">Umbuchung Space</span>` : it.learned ? `<span class="pill ok">gemerkt</span>` : !it.sure ? `<span class="pill warn">prüfen</span>` : ""}
          ${it.payee ? `<label class="rem"><input type="checkbox" data-impremember="${idx}" ${it.remember ? "checked" : ""}>${escHtml(it.payee.length > 22 ? it.payee.slice(0, 22) + "…" : it.payee)} merken</label>` : ""}${selfNote}</div></div>`;
              })
              .join("")
          : emptyState("check", "Alles schon importiert", "In dieser Datei sind keine neuen Buchungen.")
      }
    </div>
    ${imp.pdf ? "" : mapping}
    <div class="row-btns stickybar"><button class="btn" id="impCancel" style="background:var(--surface);box-shadow:var(--shadow)">Abbrechen</button>${take.length ? `<button class="btn primary" id="impGo" style="flex:2;box-shadow:var(--shadow)">${take.length} übernehmen</button>` : `<button class="btn primary" id="impDone" style="flex:2;box-shadow:var(--shadow)">Fertig</button>`}</div>`;
}
async function runLimited(tasks, n, onDone) {
  let i = 0;
  const workers = [];
  for (let w = 0; w < n; w++)
    workers.push(
      (async () => {
        while (i < tasks.length) {
          const t = tasks[i++];
          await withRetry(t);
          onDone();
        }
      })()
    );
  await Promise.all(workers);
}
async function withRetry(fn) {
  for (let a = 0; ; a++) {
    try {
      return await fn();
    } catch (e) {
      const c = e && e.code;
      if (a < 3 && (c === "unavailable" || c === "resource_exhausted")) {
        await new Promise((r) => setTimeout(r, 800 * (a + 1) + Math.random() * 400));
        continue;
      }
      throw e;
    }
  }
}
async function commitImport() {
  const imp = ui.imp;
  if (!imp || !imp.items || ui.importing) return;
  const fresh = imp.items.filter((i) => !i.dup),
    vat = (Number(store.settings.vatRate) || 0) / 100;
  const months = {},
    bundles = {},
    edits = {},
    tasks0 = [],
    alias = {
      ...(store.settings.payeeAlias || {}),
    };
  let nTx = 0,
    nFix = 0,
    nMerge = 0,
    lastYm = null;
  const mRules = [];
  for (const it of fresh) {
    const [k, v] = it.target.split("|");
    if (k === "skip") continue;
    if (k === "merge") {
      const t = store.tx.find((x) => x.id === v);
      if (!t) continue;
      const d = plainTx(t);
      d.importKey = it.key;
      if (it.payee) d.bank = String(it.payee).trim().slice(0, 80);
      if (it.acct && d.acct && it.acct !== d.acct) d.bacct = it.acct;
      const ref = String(it.ref || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
      if (ref && !d.ref) d.ref = ref;
      if (t._b) (edits[t._b] = edits[t._b] || {})[t.id] = d;
      else tasks0.push(() => saveDoc("tx", t.id, d));
      const pk = normText(it.payee || ""),
        tn = String(t.note || "").trim();
      if (pk && tn && !pk.includes(normText(tn).split(" ")[0] || "~")) alias[pk] = tn.slice(0, 40);
      if (pk && t.cat && ["ausgabe", "betrieb", "einnahme"].includes(t.kind)) mRules.push([pk, t.kind + "|" + t.cat]);
      nMerge++;
      continue;
    }
    const ym = it.date.slice(0, 7);
    if (!lastYm || ym > lastYm) lastYm = ym;
    if (k === "fix") {
      const m =
        months[ym] ||
        (months[ym] = clone(
          store.months[ym] || {
            paid: {},
          }
        ));
      m.paid = m.paid || {};
      m.paidKeys = m.paidKeys || {};
      m._fresh = m._fresh || {};
      m.paid[v] = round2((m._fresh[v] ? m.paid[v] || 0 : 0) + Math.abs(it.amount));
      m.paidKeys[v] = it.key;
      m.importKeys = [...(m.importKeys || []), it.key];
      m._fresh[v] = true;
      if (m.man) delete m.man[v];
      nFix++;
    } else {
      let amount = Math.abs(it.amount),
        note = (it.alias || it.payee || "").trim().slice(0, 80);
      const doc = {
        date: it.date,
        amount: round2(amount),
        kind: k === "vz" ? "vorauszahlung" : k,
        cat: k === "vz" ? "Steuer-Vorauszahlung" : v,
        note,
        ts: ordTs(it),
        importKey: it.key,
        source: imp.map.paypal ? "paypal" : "n26",
      };
      const ref = String(it.ref || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
      if (ref) doc.ref = ref;
      if (k === "einnahme" && incArt(v) === "selbst" && !store.settings.kleinunternehmer)
        doc.net = round2(amount / (1 + vat));
      (bundles[ym] = bundles[ym] || {})[newId() + nTx.toString(36)] = doc;
      nTx++;
    }
  }
  const tasks = [...tasks0];
  for (const b of Object.keys(edits)) if (!bundles[b]) bundles[b] = {};
  for (const [ym, add] of Object.entries(bundles)) {
    let part = 1,
      docId = ym,
      items = clone(store.txb[docId] || {});
    for (const [eb, ed] of Object.entries(edits)) if (eb === docId) Object.assign(items, ed);
    for (const [id, doc] of Object.entries(add)) {
      items[id] = doc;
      if (JSON.stringify(items).length > 200000) {
        delete items[id];
        const full = items,
          fid = docId;
        tasks.push(() =>
          saveDoc("txb", fid, {
            items: full,
          })
        );
        part++;
        docId = ym + "_" + part;
        items = clone(store.txb[docId] || {});
        items[id] = doc;
      }
    }
    const last = items,
      lid = docId;
    tasks.push(() =>
      saveDoc("txb", lid, {
        items: last,
      })
    );
  }
  for (const [ym, m] of Object.entries(months)) {
    delete m._fresh;
    tasks.push(() => saveDoc("months", ym, m));
  }
  const rules = clone(store.settings.rules || []);
  for (const it of fresh) {
    if (!it.remember || !it.payee || it.internal || it.target.startsWith("merge") || (!it.sure && !it.userSet))
      continue;
    const match = normText(it.payee);
    const i = rules.findIndex((r) => r.match === match);
    if (i >= 0) rules[i].target = it.target;
    else
      rules.push({
        match,
        target: it.target,
      });
  }
  for (const [m, tg] of mRules)
    if (!rules.some((r) => r.match === m))
      rules.push({
        match: m,
        target: tg,
      });
  const skipped = fresh.filter((i) => i.target.startsWith("skip")).map((i) => i.key);
  ui.importing = {
    done: 0,
    total: tasks.length + 1,
  };
  renderImport();
  try {
    await runLimited(tasks, 4, () => {
      ui.importing.done++;
      renderImport();
    });
    store.settings.rules = rules.slice(-400);
    if (nMerge) store.settings.payeeAlias = Object.fromEntries(Object.entries(alias).slice(-500));
    const takenKeys = new Set(fresh.filter((i) => !i.target.startsWith("skip")).map((i) => i.key));
    store.settings.ignoredKeys = [
      ...new Set([...(store.settings.ignoredKeys || []).filter((k) => !takenKeys.has(k)), ...skipped]),
    ].slice(-3000);
    if (!mem) await withRetry(() => db.doc("app/settings").set(clone(store.settings)));
    ui.importing = null;
    ui.imp = null;
    ui.view = "list";
    if (lastYm) ui.ym = lastYm;
    render();
    window.scrollTo({
      top: 0,
    });
    toast(
      [
        plural(nTx, "Buchung übernommen", "Buchungen übernommen"),
        nFix ? `${nFix} Fixkosten abgehakt` : "",
        nMerge ? `${nMerge} mit vorhandenen verknüpft` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    );
    setTimeout(() => {
      try {
        if (recurCands().length) {
          RECUR_TOLD = true;
          recurSheet();
        }
      } catch (e) {}
    }, 900);
    dupSoon();
  } catch (e) {
    ui.importing = null;
    reportErr(e);
    buildKeepChoices();
    renderImport();
  }
}
function buildKeepChoices() {
  const imp = ui.imp;
  if (!imp || !imp.items) return;
  const keys = knownKeys();
  for (const it of imp.items) it.dup = keys.has(it.key);
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#pickCsv")) $("csvFile").click();
  if (e.target.closest("#impCancel")) {
    ui.imp = null;
    ui.view = "list";
    render();
  }
  if (e.target.closest("#impGo")) Promise.resolve(commitImport()).then(() => SND.play("ping"));
  const spd = e.target.closest("[data-spdel]");
  if (spd) {
    store.settings.spaces = (store.settings.spaces || []).filter((n) => n !== spd.dataset.spdel);
    saveSettings();
    renderMore();
    return;
  }
  if (e.target.closest("#spClean")) {
    cleanSpaces();
    return;
  }
  if (e.target.closest("#spAdd")) {
    const btn = e.target.closest("#spAdd");
    const inp = document.createElement("input");
    inp.className = "in";
    inp.style.width = "190px";
    inp.id = "newspace";
    inp.placeholder = "Name, dann Enter";
    btn.replaceWith(inp);
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
        if (n && !(store.settings.spaces || []).some((x) => normText(x) === normText(n))) {
          store.settings.spaces = [...(store.settings.spaces || []), n];
          saveSettings();
        }
        setTimeout(renderMore, 0);
      },
      {
        once: true,
      }
    );
    return;
  }
  if (e.target.closest("#backupSave")) {
    saveBackup();
    return;
  }
  if (e.target.closest("#backupLoad")) {
    const b = e.target.closest("#backupLoad");
    if (b.dataset.armed !== "1") {
      b.dataset.armed = "1";
      b.textContent = "Alles ersetzen?";
      setTimeout(() => {
        b.dataset.armed = "";
        b.textContent = "Laden";
      }, 4000);
      return;
    }
    b.dataset.armed = "";
    b.textContent = "Laden";
    $("backupFile").click();
    return;
  }
  if (e.target.closest("#impDone")) {
    ui.imp = null;
    ui.view = "home";
    render();
    window.scrollTo({
      top: 0,
    });
    return;
  }
  if (e.target.closest("#impShowIgn") && ui.imp) {
    ui.imp.showIgnored = true;
    buildItems();
    renderImport();
  }
  if (e.target.closest("#rulesReset")) {
    const b = e.target.closest("#rulesReset");
    if (b.dataset.armed !== "1") {
      b.dataset.armed = "1";
      b.textContent = "Wirklich zurücksetzen?";
      setTimeout(() => {
        b.dataset.armed = "";
        b.textContent = "Zurücksetzen";
      }, 3000);
      return;
    }
    store.settings.rules = [];
    store.settings.ignoredKeys = [];
    saveSettings();
    renderMore();
    toast("Gemerkte Zuordnungen gelöscht");
  }
});
$("csvFile").addEventListener("change", (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  loadCsv(f);
});
$("planFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  const o = store.debts.find((x) => x.id === ui.planFor);
  if (!file || !o) return;
  if (file.size > 15 * 1024 * 1024) {
    toast("Die Datei ist zu groß");
    return;
  }
  toast("Tilgungsplan wird gelesen …");
  let plan;
  try {
    plan = await loadPlanFile(file, o);
  } catch (err) {
    toast(err && /PDF-Leser/.test(err.message) ? err.message : "Die Datei konnte nicht gelesen werden");
    return;
  }
  if (!plan.length) {
    toast("Im Plan wurden keine Raten erkannt. Du kannst ihn auch selbst eintragen.");
    return;
  }
  const d = {
    ...o,
  };
  delete d.id;
  const prev = clone(d);
  d.plan = plan;
  if (plan[0].rest != null) {
    d.start = round2(Number(plan[0].rest) + (Number(plan[0].tilg) || 0));
    d.since = plan[0].ym;
  }
  ui.planEdit = o.id;
  if (await safe(() => saveDoc("debts", o.id, d)))
    toast(`${plan.length} Raten übernommen`, () => safe(() => saveDoc("debts", o.id, prev)));
});
$("v-import").addEventListener("change", (e) => {
  const imp = ui.imp;
  if (!imp) return;
  const mp = e.target.closest("[data-map]");
  if (mp) {
    imp.map[mp.dataset.map] = Number(mp.value);
    buildItems();
    renderImport();
    return;
  }
  const tg = e.target.closest("[data-imptarget]");
  if (tg) {
    const it = imp.items[Number(tg.dataset.imptarget)];
    it.target = tg.value;
    it.sure = true;
    it.userSet = true;
    if (it.payee) it.remember = true;
    tg.blur();
    renderImport();
    return;
  }
  const all = e.target.closest("[data-impall]");
  if (all) {
    for (const it of imp.items) if (!it.dup && it.payee) it.remember = all.checked;
    renderImport();
    return;
  }
  const rm = e.target.closest("[data-impremember]");
  if (rm) {
    imp.items[Number(rm.dataset.impremember)].remember = rm.checked;
    const a = $("impAll");
    if (a) a.checked = imp.items.filter((i) => !i.dup && i.payee).every((i) => i.remember);
  }
});
async function saveTextFile(name, text, mime, okMsg) {
  if (NATIVE) {
    try {
      const r = window.AndroidBridge.saveFile(name, text);
      toast(r ? okMsg + " (Downloads)" : "Datei konnte nicht gespeichert werden");
    } catch (e) {
      toast("Datei konnte nicht gespeichert werden");
    }
    return;
  }
  if (LOCAL || !window.claude) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([text], {
        type: mime,
      })
    );
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
    toast(okMsg);
    return;
  }
  let dl = null;
  try {
    dl = await window.claude.use("downloads");
  } catch (e) {}
  if (!dl) {
    toast("Speichern ist in dieser Ansicht nicht möglich");
    return;
  }
  try {
    const r = await dl.save({
      filename: name,
      data: text,
    });
    if (r && r.status === "saved") toast(okMsg);
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Datei konnte nicht gespeichert werden");
  }
}

/* Fixkosten erkennen */
function recurCands() {
  const seen = new Set(store.settings.recurSeen || []),
    known = new Set(store.fixed.map((f) => loanKey(f.name)).filter(Boolean)),
    rules = store.settings.rules || [];
  const groups = {};
  for (const t of store.tx) {
    if (!["ausgabe", "betrieb", "vorauszahlung"].includes(t.kind) || t.um || !(t.amount > 0) || isWithdrawCat(t.cat))
      continue;
    const k = loanKey(t.note);
    if (!k || seen.has(k) || known.has(k)) continue;
    if (rules.some((r) => String(r.target).startsWith("fix|") && r.match === normText(t.note))) continue;
    (groups[k] = groups[k] || []).push(t);
  }
  const out = [];
  for (const [k, ts] of Object.entries(groups)) {
    if (ts.length < 2) continue;
    const med = median(ts.map((t) => t.amount)),
      tol = Math.max(1.5, med * 0.08);
    const near = ts.filter((t) => Math.abs(t.amount - med) <= tol).sort((a, b) => a.date.localeCompare(b.date));
    if (near.length < 2 || near.length < ts.length * 0.6) continue;
    const yms = [...new Set(near.map((t) => t.date.slice(0, 7)))];
    if (yms.length < near.length * 0.8) continue;
    const mi = (ym) => {
        const [y, m] = ymParts(ym);
        return y * 12 + m;
      },
      gaps = [];
    for (let i = 1; i < yms.length; i++) gaps.push(mi(yms[i]) - mi(yms[i - 1]));
    const g = median(gaps);
    let rhythm = null;
    if (g === 1 && yms.length >= 3) rhythm = "monatlich";
    else if (g === 3 && yms.length >= 2) rhythm = "quartal";
    else if (g === 6 && yms.length >= 2) rhythm = "halbjahr";
    else if (g === 12 && yms.length >= 2) rhythm = "jahr";
    if (!rhythm) continue;
    if (near.some((t) => t.kind === "vorauszahlung") && rhythm !== "monatlich") continue;
    if (
      store.fixed.some(
        (f) =>
          Number(f.amount) > 0 &&
          Math.abs(Number(f.amount) - med) <= Math.max(1, med * 0.03) &&
          yms.filter((ym) => ((store.months[ym] || {}).paid || {})[f.id] != null).length >= yms.length * 0.5
      )
    )
      continue;
    if (rhythm === "monatlich" && gaps.filter((x) => x === 1).length < gaps.length * 0.6) continue;
    const last = yms[yms.length - 1],
      lastM = Number(last.slice(5, 7)),
      txt = near.map((t) => (t.note || "") + " " + (t.ref || "")).join(" ");
    const tax = LOAN_TAX.test(txt),
      raten = /klarna|ratepay|ratenkauf|teilzahlung|ratenzahlung/i.test(txt),
      edu = LOAN_EDU.test(txt),
      baf = LOAN_BAF.test(txt),
      person = !tax && !edu && near.filter((t) => looksPerson(t.note)).length > near.length / 2,
      privHint = person && LOAN_PRIV.test(txt),
      loan = tax || raten || edu || privHint || LOAN_BANK.test(txt) || LOAN_WORD.test(txt);
    const nm = String(near[near.length - 1].note || "")
      .replace(/\b(gmbh|ag|se|kg|mbh|co|b\.?v\.?|s\.?a\.?|ltd|inc|international|deutschland|europe)\b\.?/gi, "")
      .replace(/[^\wäöüÄÖÜß&+\- ]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 3)
      .join(" ");
    out.push({
      key: k,
      name: nm || loanName(near[0].note),
      amount: round2(median(near.map((t) => t.amount))),
      rhythm,
      months: rhythm === "monatlich" ? null : rhythmMonths(rhythm, lastM),
      items: near,
      n: near.length,
      loan,
      tax,
      raten,
      edu,
      baf,
      person,
      since: yms[0],
      betrieb: near.filter((t) => t.kind === "betrieb").length > near.length / 2,
      day: Math.round(median(near.map((t) => Number(t.date.slice(8, 10))))),
    });
  }
  return out.sort((a, b) => b.amount - a.amount);
}
const recurArt = (x) =>
  x.tax
    ? "tax"
    : x.edu
      ? "bafoeg"
      : x.raten
        ? "ratenkauf"
        : x.person &&
            !LOAN_BANK.test(x.items.map((t) => t.note).join(" ")) &&
            !LOAN_WORD.test(x.items.map((t) => (t.note || "") + " " + (t.ref || "")).join(" "))
          ? "privat"
          : "kredit";
const RC_ART_TXT = {
  tax: "Steuerschuld in Raten",
  bafoeg: "BAföG / Studienkredit",
  ratenkauf: "Ratenkauf",
  kredit: "Kreditrate",
  privat: "Privat geliehen",
};
function recurChips(x) {
  const base = recurArt(x) === "privat" ? "kredit" : recurArt(x);
  return x.person ? [...new Set(["privat", base])] : [base];
}
const recurRhythm = (c) =>
  c.rhythm === "monatlich"
    ? `jeden Monat · ${c.n} Mal`
    : c.rhythm === "quartal"
      ? `alle 3 Monate · ${c.n} Mal`
      : c.rhythm === "halbjahr"
        ? `alle 6 Monate · ${c.n} Mal`
        : `jährlich · ${c.n} Mal`;
function recurSheet() {
  const c = recurCands();
  if (!c.length) {
    toast("Keine neuen wiederkehrenden Zahlungen gefunden");
    return;
  }
  ui.recur = {
    c,
    on: new Set(c.map((x) => x.key)),
    names: {},
    loan: Object.fromEntries(c.map((x) => [x.key, x.loan ? recurArt(x) : ""])),
    open: {},
  };
  let el = $("recurBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "recurBg";
    el.className = "backdrop";
    el.innerHTML = `<div class="sheet" role="dialog" aria-label="Fixkosten gefunden"></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-rcclose]")) recurClose();
    });
  }
  recurRender();
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
}
function recurClose() {
  const el = $("recurBg");
  if (!el) return;
  el.classList.remove("show");
  setTimeout(() => {
    el.hidden = true;
    ui.recur = null;
  }, 200);
}
function recurRender() {
  const el = $("recurBg"),
    R = ui.recur;
  if (!el || !R) return;
  const n = R.on.size;
  el.querySelector(".sheet").innerHTML =
    `<div class="sheet-head"><h2>${R.c.length} Fixkosten gefunden</h2><button class="iconbtn" data-rcclose="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="notice warn" style="margin:0 0 10px"><span><b>Diese Zahlungen kommen regelmäßig.</b> Als Fixkosten übernehmen? Die passenden Buchungen werden dann abgehakt – nichts zählt doppelt.</span></div>
    <div class="rclist">${R.c
      .map(
        (
          x
        ) => `<label class="rcrow"><input type="checkbox" data-rckey="${escHtml(x.key)}" ${R.on.has(x.key) ? "checked" : ""}><span class="rcn"><input class="rcname" data-rcname="${escHtml(x.key)}" value="${escHtml(R.names[x.key] || x.name)}" aria-label="Name"><small>${escHtml(recurRhythm(x))} · seit ${escHtml(monthName(x.since))}${x.betrieb ? " · betrieblich" : ""}</small></span><b>${escHtml(fmtEur(x.amount))}</b></label>
      <div class="rcloan">${recurChips(x)
        .map(
          (a) =>
            `<button class="rclt ${R.loan[x.key] === a ? "on" : ""}" data-rcloan="${escHtml(x.key)}|${a}" aria-pressed="${R.loan[x.key] === a}">${R.loan[x.key] === a ? "✓ " : ""}${RC_ART_TXT[a]}</button>`
        )
        .join("")}
        ${R.loan[x.key] ? `<input class="in rcopen" data-rcopen="${escHtml(x.key)}" inputmode="decimal" placeholder="noch offen (€)" value="${escHtml(R.open[x.key] || "")}" aria-label="Noch offen in Euro">` : ""}</div>`
      )
      .join("")}</div>
    ${R.c.some((x) => R.loan[x.key]) ? `<p class="small muted" style="margin:8px 0 0">Bei Kreditraten und Rückzahlungen legt die App die Schuld unter „Kredite & Schulden“ an. Trag ein, was <b>heute noch offen</b> ist (steht im Online-Banking oder auf dem Kontoauszug des Kredits).</p>` : ""}
    <div class="row-btns" style="margin-top:12px"><button class="btn" id="recurNo">Keine davon</button><button class="btn primary" id="recurOk" ${n ? "" : "disabled"}>${n} als Fixkosten übernehmen</button></div>`;
}
async function recurApply() {
  const R = ui.recur;
  if (!R) return;
  const take = R.c.filter((x) => R.on.has(x.key)),
    skip = R.c.filter((x) => !R.on.has(x.key));
  const btn = $("recurOk");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Wird übernommen …";
  }
  const months = {},
    dels = {},
    rules = (store.settings.rules || []).slice();
  let order = store.fixed.length;
  for (const x of take) {
    const id = newId(),
      name = (R.names[x.key] || x.name).trim() || x.name,
      f = {
        name,
        amount: x.amount,
        kind: x.betrieb ? "betrieb" : "privat",
        order: order++,
      };
    if (x.rhythm !== "monatlich") {
      f.rhythm = x.rhythm;
      f.months = x.months;
    }
    if (!(await safe(() => saveDoc("fixed", id, f)))) return;
    for (const t of x.items) {
      const ym = t.date.slice(0, 7);
      const m =
        months[ym] ||
        (months[ym] = clone(
          store.months[ym] || {
            paid: {},
          }
        ));
      m.paid = m.paid || {};
      m.paid[id] = round2((Number(m.paid[id]) || 0) + t.amount);
      (dels[t._b || "_"] = dels[t._b || "_"] || []).push(t);
    }
    const open = parseAmt(R.open[x.key] || "");
    const art = R.loan[x.key];
    if (art && open > 0) {
      const dn =
        art === "tax"
          ? "Steuerschulden (" + name + ")"
          : art === "privat"
            ? "Schulden bei " + name
            : art === "bafoeg"
              ? x.baf
                ? "BAföG-Rückzahlung"
                : "Studienkredit (" + name + ")"
              : name;
      await safe(() =>
        saveDoc("debts", newId(), {
          name: dn,
          art: art === "tax" ? "sonst" : art,
          start: round2(open),
          since: shiftYm(ymOf(new Date()), 1),
          zins: 0,
          fixedId: id,
          auto: true,
        })
      );
    }
    const match = normText(x.items[x.items.length - 1].note);
    if (match && !rules.some((r) => r.match === match))
      rules.push({
        match,
        target: "fix|" + id,
      });
  }
  for (const [ym, m] of Object.entries(months)) await safe(() => saveDoc("months", ym, m));
  for (const [b, ts] of Object.entries(dels)) {
    if (b === "_") {
      for (const t of ts) await safe(() => deleteDoc("tx", t.id));
      continue;
    }
    const items = clone(store.txb[b] || {});
    for (const t of ts) delete items[t.id];
    await safe(() =>
      saveDoc("txb", b, {
        items,
      })
    );
  }
  store.settings.rules = rules.slice(-400);
  store.settings.recurSeen = [...new Set([...(store.settings.recurSeen || []), ...skip.map((x) => x.key)])].slice(-500);
  await saveSettings();
  const nd = take.filter((x) => R.loan[x.key] && parseAmt(R.open[x.key] || "") > 0).length;
  recurClose();
  toast(`${take.length} Fixkosten übernommen${nd ? `, ${nd} ${nd === 1 ? "Kredit" : "Kredite"} angelegt` : ""}`);
  render();
}
document.addEventListener("click", async (e) => {
  if (e.target.closest("#recurOk")) {
    recurApply();
    return;
  }
  if (e.target.closest("#recurNo")) {
    const R = ui.recur;
    if (!R) return;
    store.settings.recurSeen = [...new Set([...(store.settings.recurSeen || []), ...R.c.map((x) => x.key)])].slice(
      -500
    );
    await saveSettings();
    recurClose();
    toast("Okay – diese werden nicht mehr vorgeschlagen");
    return;
  }
  if (e.target.closest("[data-recuropen]")) {
    recurSheet();
    return;
  }
});
document.addEventListener("change", (e) => {
  const c = e.target.closest("[data-rckey]");
  if (!c || !ui.recur) return;
  if (c.checked) ui.recur.on.add(c.dataset.rckey);
  else ui.recur.on.delete(c.dataset.rckey);
  const b = $("recurOk");
  if (b) {
    const n = ui.recur.on.size;
    b.disabled = !n;
    b.textContent = `${n} als Fixkosten übernehmen`;
  }
});
document.addEventListener("input", (e) => {
  if (!ui.recur) return;
  const c = e.target.closest("[data-rcname]");
  if (c) ui.recur.names[c.dataset.rcname] = c.value;
  const o = e.target.closest("[data-rcopen]");
  if (o) ui.recur.open[o.dataset.rcopen] = o.value;
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-rcloan]");
  if (!b || !ui.recur) return;
  const [k, a] = b.dataset.rcloan.split("|");
  ui.recur.loan[k] = ui.recur.loan[k] === a ? "" : a;
  const y = $("recurBg").querySelector(".sheet").scrollTop;
  recurRender();
  $("recurBg").querySelector(".sheet").scrollTop = y;
});
document.addEventListener(
  "click",
  (e) => {
    if (e.target.closest(".rcname")) e.preventDefault();
  },
  true
);
var RECUR_TOLD = false;
function recurCheck() {
  if (RECUR_TOLD) return;
  try {
    const c = recurCands();
    if (!c.length) return;
    RECUR_TOLD = true;
    toast(`${c.length} Fixkosten in deinen Buchungen gefunden`, () => recurSheet(), "Ansehen", 14000);
  } catch (e) {}
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-dart]");
  if (!b) return;
  const [id, k] = b.dataset.dart.split("|"),
    o = store.debts.find((x) => x.id === id);
  if (!o) return;
  const d = {
    ...o,
  };
  delete d.id;
  d.art = k;
  await safe(() => saveDoc("debts", id, d));
});
function debtLine(d, s) {
  if (s.remaining <= 0.005) return `<b class="pos">Abbezahlt</b>`;
  const a = [];
  a.push(s.rate ? `${fmtEur(s.rate)} pro Monat` : "Keine Rate verknüpft");
  if (s.rate && s.zinsNow > 0)
    a.push(`${fmtEur(s.zinsNow)} Zinsen, ${fmtEur(Math.max(0, s.rate - s.zinsNow))} Tilgung`);
  if (s.noCover) a.push(`⚠ Die Rate deckt nicht einmal die Zinsen`);
  else if (s.freeAt) a.push(`schuldenfrei ${s.fromPlan ? "laut Plan" : "ca."} ${monthName(s.freeAt)}`);
  if (s.end) {
    a.push(`Vertrag bis ${monthName(s.end)}`);
    if (s.freeAt && !s.fromPlan && s.freeAt > s.end) a.push(`⚠ mit der Rate später fertig als im Vertrag`);
  }
  if (s.paid) a.push(`${fmtEur(s.paid)} getilgt`);
  if (s.zinsSum > 0) a.push(`${fmtEur(s.zinsSum)} Zinsen bisher`);
  if (s.extraSum > 0) a.push(`davon ${fmtEur(s.extraSum)} Sondertilgung`);
  return a.map((x) => `<span>${escHtml(x)}</span>`).join(" · ");
}
function planEditor(d, plan) {
  const n = (v) => (v == null ? "" : escHtml(numStr(v))),
    cur = ymOf(new Date());
  let from = 0,
    to = plan.length;
  if (!ui.planAll && plan.length > 14) {
    const i = plan.findIndex((r) => r.ym >= cur);
    from = Math.max(0, (i < 0 ? plan.length : i) - 2);
    to = Math.min(plan.length, from + 12);
  }
  const rows = plan.map((r, i) => [r, i]).slice(from, to);
  return `<div style="overflow-x:auto;margin-top:10px"><table class="plantbl" style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr><th style="text-align:left">Monat</th><th>Rate</th><th>Zinsen</th><th>Tilgung</th><th>Restschuld</th><th></th></tr></thead><tbody>
    ${rows.map(([r, i]) => `<tr data-prow="${i}" style="${r.ym === cur ? "background:var(--accent-soft)" : ""}"><td><input class="in" data-pf="ym" value="${escHtml(r.ym.slice(5) + "/" + r.ym.slice(0, 4))}" style="text-align:left;min-width:86px" aria-label="Monat"></td><td><input class="in" data-pf="rate" inputmode="decimal" value="${n(r.rate)}"></td><td><input class="in" data-pf="zins" inputmode="decimal" value="${n(r.zins)}"></td><td><input class="in" data-pf="tilg" inputmode="decimal" value="${n(r.tilg)}"></td><td><input class="in" data-pf="rest" inputmode="decimal" value="${n(r.rest)}"></td><td><button class="icon-btn" data-prdel="${i}" aria-label="Zeile löschen">×</button></td></tr>`).join("")}
    </tbody></table></div><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="chip" data-pradd="${escHtml(d.id)}">+ Zeile</button>${plan.length > 14 ? `<button class="chip" data-prall="1">${ui.planAll ? "Nur Ausschnitt zeigen" : `Alle ${plan.length} Raten zeigen`}</button>` : ""}</div>`;
}

/* Umschuldung erkennen */
const LOAN_BANK =
  /santander|creditplus|auxmoney|smava|targobank|barclays|consors ?finanz|bnp paribas|cofidis|oney|bank11|skg bank|younited|easybank|finanzcheck|verivox|check24|ferratum|bon-?kredit|maxda|kreditprivat|teambank|easycredit|ratenkredit/i;
const LOAN_WORD = /darle?he?n|kredit|finanzierung|tilgung|annuität|annuitaet/i;
const LOAN_TAX =
  /finanzamt|finanzkasse|steuerverwaltung|landeshauptkasse|bundeskasse|staatsoberkasse|stadtkasse|gemeindekasse|steuerkasse/i;
const LOAN_EDU =
  /bundesverwaltungsamt|\bbva\b|baf(ö|oe|o)g|darlehenskasse|studienkredit|bildungskredit|studienfinanz|kfw/i;
const LOAN_BAF = /bundesverwaltungsamt|\bbva\b|baf(ö|oe|o)g/i;
const LOAN_PRIV =
  /schulden|zurück|zurueck|rückzahl|rueckzahl|geliehen|leihe|abzahl|darlehen privat|rate \d+ ?(von|\/)/i;
const LOAN_FIRM =
  /gmbh|\bag\b|\bkg\b|\bse\b|e\.?\s?v\.?\b|mbh|bank|sparkasse|versicher|stadtwerke|telekom|vodafone|amazon|paypal|klarna|markt|shop|service|verlag|zentrale|kasse|amt\b|\bstadt\b|gemeinde|verein|club|studio|praxis|apotheke|tankstelle|ltd|inc|group|online|energie|immobilien|hausverwaltung/i;
const looksPerson = (s) => {
  s = String(s || "").trim();
  if (!s || /\d/.test(s) || LOAN_FIRM.test(s) || LOAN_TAX.test(s) || LOAN_BANK.test(s)) return false;
  const w = s.replace(/[,.]/g, " ").split(/\s+/).filter(Boolean);
  return (
    w.length >= 2 &&
    w.length <= 4 &&
    w.every((x) => /^[A-ZÄÖÜ][a-zäöüß\-]+$/.test(x) || /^(von|van|de|der|und|u|&)$/.test(x))
  );
};
const LOAN_OFF = /ablös|abloes|umschuld|vorzeitige.{0,12}rückzahl|restschuld/i;
const LOAN_STOP = new Set([
  "gmbh",
  "ag",
  "kg",
  "se",
  "sa",
  "bank",
  "und",
  "der",
  "die",
  "das",
  "rate",
  "darlehen",
  "darlehn",
  "darlehnsrate",
  "darlehensrate",
  "kredit",
  "auszahlung",
  "nr",
  "vom",
  "fuer",
  "für",
  "zahlung",
  "lastschrift",
  "gutschrift",
  "sepa",
  "konto",
  "vertrag",
  "ratenkredit",
  "europe",
  "deutschland",
  "germany",
]);
function loanWords(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-zäöüß ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !LOAN_STOP.has(w));
}
const loanKey = (s) => loanWords(s).slice(0, 2).join(" ");
const loanName = (s) => {
  const w = loanWords(s).slice(0, 2);
  return w.length ? w.map((x) => x[0].toUpperCase() + x.slice(1)).join(" ") : "Kredit";
};
const median = (a) => {
  const b = a.slice().sort((x, y) => x - y),
    m = b.length >> 1;
  return b.length ? (b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2) : 0;
};
function loanCands() {
  const seen = new Set(store.settings.loanSeen || []),
    out = [];
  for (const p of store.tx) {
    if (p.kind !== "einnahme" || p.um || seen.has(p.id) || !(p.amount >= 500)) continue;
    const txt = (p.note || "") + " " + (p.ref || "") + " " + (p.cat || "");
    if (!(LOAN_WORD.test(txt) || (LOAN_BANK.test(txt) && p.amount >= 1000))) continue;
    const lim = isoOf(new Date(new Date(p.date + "T12:00").getTime() + 21 * 864e5)),
      key = loanKey(p.note);
    const off =
      store.tx
        .filter(
          (t) =>
            t !== p &&
            !t.um &&
            ["ausgabe", "betrieb", "vorauszahlung"].includes(t.kind) &&
            t.date >= p.date &&
            t.date <= lim &&
            t.amount >= p.amount * 0.4 &&
            t.amount <= p.amount * 1.05 &&
            (LOAN_TAX.test(t.note || "") ||
              LOAN_OFF.test((t.note || "") + " " + (t.ref || "")) ||
              t.kind === "vorauszahlung")
        )
        .sort((a, b) => b.amount - a.amount)[0] || null;
    const pays = key
      ? store.tx.filter(
          (t) =>
            t.kind !== "einnahme" &&
            t !== off &&
            t.date > p.date &&
            loanKey(t.note) === key &&
            t.amount < p.amount * 0.3
        )
      : [];
    const fixed = key ? store.fixed.find((f) => loanKey(f.name) === key || loanKey(f.note) === key) : null;
    const rate = pays.length >= 2 ? round2(median(pays.map((t) => t.amount))) : fixed ? Number(fixed.amount) || 0 : 0;
    const tax = off && (LOAN_TAX.test(off.note || "") || off.kind === "vorauszahlung");
    const oldDebt = off
      ? store.debts.find((d) =>
          tax ? /steuer|finanzamt/i.test(d.name || "") : d.art !== "kredit" || LOAN_OFF.test(d.name || "")
        ) || null
      : null;
    out.push({
      p,
      off,
      tax,
      pays,
      rate,
      fixed,
      oldDebt,
      name: loanName(p.note),
      day: pays.length ? Number(median(pays.map((t) => Number(t.date.slice(8, 10))))) : 1,
    });
  }
  return out;
}
function loanSim(P, rate, zins, since) {
  const z = (Number(zins) || 0) / 100 / 12,
    cur = ymOf(new Date());
  let b = P,
    ym = shiftYm(since, 1),
    n = 0;
  for (; ym <= cur && n < 600 && b > 0.005; ym = shiftYm(ym, 1), n++) {
    b = b + b * z - rate;
  }
  const rest = Math.max(0, b);
  let free = null;
  if (rate > 0 && rest > 0.005) {
    let bb = rest,
      y2 = cur;
    for (let i = 0; i < 600; i++) {
      y2 = shiftYm(y2, 1);
      if (rate <= bb * z + 0.004) break;
      bb = bb + bb * z - rate;
      if (bb <= 0.005) {
        free = y2;
        break;
      }
    }
  }
  return {
    rest: round2(rest),
    free,
    cover: !(rate > 0 && rate <= P * z),
  };
}
function loanBanner() {
  const c = loanCands();
  if (!c.length) return "";
  return c
    .map(
      (x, i) =>
        `<div class="loanhint"><span class="lhi">💡</span><span class="lht"><b>${x.off ? "Umschuldung erkannt" : "Kredit erkannt"}</b><small>+ ${escHtml(fmtEur(x.p.amount))} von ${escHtml(x.name)} am ${escHtml(shortDate(x.p.date))}${x.off ? ` · danach − ${escHtml(fmtEur(x.off.amount))} an ${escHtml(x.tax ? "das Finanzamt" : loanName(x.off.note))}` : ""}</small></span><button class="btn primary small" data-loanopen="${i}">Ansehen</button></div>`
    )
    .join("");
}
function loanSheet(i) {
  const x = loanCands()[i];
  if (!x) return;
  ui.loan = {
    id: x.p.id,
    name: x.name,
    rate: x.rate ? numStr(x.rate) : "",
    zins: "",
    offOn: !!x.off,
    old: x.oldDebt ? x.oldDebt.id : "",
    mkFix: !x.fixed,
  };
  let el = $("loanBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "loanBg";
    el.className = "backdrop";
    el.innerHTML = `<div class="sheet" role="dialog" aria-label="Umschuldung"></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-loanclose]")) loanClose();
    });
  }
  loanRender();
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
}
function loanClose() {
  const el = $("loanBg");
  if (!el) return;
  el.classList.remove("show");
  setTimeout(() => {
    el.hidden = true;
    ui.loan = null;
  }, 200);
}
function loanX() {
  return ui.loan && loanCands().find((c) => c.p.id === ui.loan.id);
}
function loanRender() {
  const el = $("loanBg"),
    L = ui.loan,
    x = loanX();
  if (!el || !L || !x) {
    if (el && !x) loanClose();
    return;
  }
  const rate = parseAmt(L.rate) || 0,
    sim = loanSim(x.p.amount, rate, parseAmt(L.zins) || 0, x.p.date.slice(0, 7));
  const fixTxt =
    (x.fixed
      ? `Verknüpft mit deinen Fixkosten „${escHtml(x.fixed.name)}“`
      : `<label class="lchk"><input type="checkbox" data-lf="mkFix" ${L.mkFix ? "checked" : ""}> Rate als Fixkosten anlegen (jeden Monat)</label>`) +
    (x.pays.length && (x.fixed || L.mkFix)
      ? `<div class="small muted" style="margin-top:6px">Die ${x.pays.length} Abbuchungen werden dort als bezahlte Raten abgehakt – so zählt keine doppelt.</div>`
      : "");
  el.querySelector(".sheet").innerHTML =
    `<div class="sheet-head"><h2>${x.off ? "Umschuldung erkannt" : "Kredit erkannt"}</h2><button class="iconbtn" data-loanclose="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="lflow">${x.off ? `<div class="lbox bad"><b>${escHtml(x.tax ? "Finanzamt" : loanName(x.off.note))}</b>${escHtml(fmtEur(x.off.amount))} bezahlt<br>am ${escHtml(shortDate(x.off.date))}</div><span class="larr">→</span>` : ""}<div class="lbox ok"><b>${escHtml(L.name)}</b>${escHtml(fmtEur(x.p.amount))} Kredit<br>seit ${escHtml(shortDate(x.p.date))}</div></div>
    <p class="small muted" style="margin:10px 0 4px">${x.off ? "Beides ist nur durchlaufendes Geld: Die Auszahlung zählt nicht als Einnahme, die Zahlung nicht als Ausgabe. Übrig bleibt der Kredit." : "Die Auszahlung ist kein Einkommen – sie zählt nicht als Einnahme. Dafür legt die App den Kredit an."}</p>
    <div class="grid2"><div class="field"><label for="lfName">Name</label><input class="in" id="lfName" data-lf="name" value="${escHtml(L.name)}"></div>
      <div class="field"><label for="lfRate">Monatsrate (€)</label><input class="in" id="lfRate" data-lf="rate" inputmode="decimal" value="${escHtml(L.rate)}" placeholder="z. B. 250"></div></div>
    <p class="small muted" style="margin:-4px 0 8px">${x.pays.length >= 2 ? `Aus ${x.pays.length} Abbuchungen an ${escHtml(x.name)} gefunden.` : "Keine Abbuchungen gefunden – bitte die Rate aus dem Vertrag eintragen."}</p>
    <div class="field"><label for="lfZins">Zinssatz (% im Jahr)</label><input class="in" id="lfZins" data-lf="zins" inputmode="decimal" value="${escHtml(L.zins)}" placeholder="aus dem Kreditvertrag – leer = 0"></div>
    <div class="lkv"><span>Noch offen heute ca.</span><b>${escHtml(fmtEur(sim.rest))}</b></div>
    <div class="lkv"><span>Schuldenfrei ca.</span><b>${sim.free ? escHtml(monthName(sim.free)) : rate ? "–" : "Rate fehlt"}</b></div>
    ${!sim.cover ? `<div class="notice bad" style="margin:8px 0 0"><span>Die Rate deckt nicht einmal die Zinsen – bitte Rate und Zinssatz prüfen.</span></div>` : ""}
    <div class="lkv" style="display:block">${fixTxt}</div>
    ${x.off ? `<label class="lchk"><input type="checkbox" data-lf="offOn" ${L.offOn ? "checked" : ""}> Zahlung ans ${escHtml(x.tax ? "Finanzamt" : "alte Konto")} zählt nicht als Ausgabe</label>` : ""}
    ${store.debts.length ? `<div class="field" style="margin-top:8px"><label for="lfOld">Diese Schuld ist damit erledigt</label><select class="in" id="lfOld" data-lf="old"><option value="">– keine –</option>${store.debts.map((d) => `<option value="${escHtml(d.id)}" ${L.old === d.id ? "selected" : ""}>${escHtml(d.name)} (${escHtml(fmtEur(debtState(d).remaining))})</option>`).join("")}</select></div>` : ""}
    <div class="row-btns" style="margin-top:14px"><button class="btn" id="loanSkip">Nicht mehr zeigen</button><button class="btn primary" id="loanOk">Übernehmen</button></div>`;
}
async function loanApply() {
  const L = ui.loan,
    x = loanX();
  if (!L || !x) return;
  const rate = round2(parseAmt(L.rate) || 0),
    zins = parseAmt(L.zins) || 0;
  if (!(zins >= 0 && zins < 100)) {
    toast("Zinssatz ungültig");
    return;
  }
  const mark = async (t) => {
    const doc = {
      ...plainTx(t),
      um: 1,
    };
    await saveTxDoc(t.id, doc, t);
  };
  if (!(await safe(() => mark(x.p)))) return;
  if (x.off && L.offOn) await safe(() => mark(x.off));
  let fixedId = x.fixed ? x.fixed.id : "";
  if (!fixedId && L.mkFix && rate > 0) {
    fixedId = newId();
    await safe(() =>
      saveDoc("fixed", fixedId, {
        name: L.name || x.name,
        amount: rate,
        kind: "privat",
        order: store.fixed.length,
      })
    );
  }
  if (fixedId)
    for (const t of x.pays) {
      const ym = t.date.slice(0, 7),
        m = clone(
          store.months[ym] || {
            paid: {},
          }
        );
      m.paid = m.paid || {};
      m.paid[fixedId] = round2((Number(m.paid[fixedId]) || 0) + t.amount);
      if (await safe(() => saveDoc("months", ym, m))) await safe(() => delTxDoc(t));
    }
  await safe(() =>
    saveDoc("debts", newId(), {
      name: L.name || x.name,
      art: "kredit",
      start: x.p.amount,
      since: shiftYm(x.p.date.slice(0, 7), 1),
      zins,
      fixedId,
      auto: true,
    })
  );
  if (L.old) {
    const o = store.debts.find((d) => d.id === L.old);
    if (o) {
      const d = {
        ...o,
      };
      delete d.id;
      d.start = 0;
      d.fixedId = "";
      d.plan = [];
      d.closed = isoToday();
      d.note = "abgelöst durch " + (L.name || x.name);
      await safe(() => saveDoc("debts", o.id, d));
    }
  }
  store.settings.loanSeen = [...(store.settings.loanSeen || []), x.p.id];
  await saveSettings();
  loanClose();
  toast(`${L.name || x.name} als Kredit angelegt`);
  render();
}
document.addEventListener("click", async (e) => {
  const o = e.target.closest("[data-loanopen]");
  if (o) {
    loanSheet(Number(o.dataset.loanopen));
    return;
  }
  if (e.target.closest("#loanOk")) {
    loanApply();
    return;
  }
  if (e.target.closest("#loanSkip")) {
    const L = ui.loan;
    if (!L) return;
    store.settings.loanSeen = [...(store.settings.loanSeen || []), L.id];
    await saveSettings();
    loanClose();
    render();
    return;
  }
});
document.addEventListener("input", (e) => {
  const f = e.target.closest("[data-lf]");
  if (!f || !ui.loan || f.type === "checkbox" || f.tagName === "SELECT") return;
  ui.loan[f.dataset.lf] = f.value;
  if (f.dataset.lf !== "name") {
    const pos = f.selectionStart,
      id = f.id;
    loanRender();
    const n = $(id);
    if (n) {
      n.focus();
      try {
        n.setSelectionRange(pos, pos);
      } catch (_) {}
    }
  }
});
document.addEventListener("change", (e) => {
  const f = e.target.closest("[data-lf]");
  if (!f || !ui.loan) return;
  if (f.type === "checkbox") ui.loan[f.dataset.lf] = f.checked;
  else if (f.tagName === "SELECT") ui.loan[f.dataset.lf] = f.value;
});
var LOAN_TOLD = new Set();
function loanCheck() {
  try {
    const c = loanCands();
    const i = c.findIndex((x) => !LOAN_TOLD.has(x.p.id));
    if (i < 0) return;
    c.forEach((x) => LOAN_TOLD.add(x.p.id));
    toast(
      c[i].off ? "Umschuldung erkannt – sieh sie dir an" : "Kredit erkannt – sieh ihn dir an",
      () => loanSheet(i),
      "Ansehen",
      12000
    );
  } catch (e) {}
}

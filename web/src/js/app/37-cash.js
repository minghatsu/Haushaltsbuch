/* Bargeld */
const isWithdrawCat = (c) => /bargeld|geldautomat|abhebung/i.test(c || "");
const cashOn = () => !!(store.settings && store.settings.cash && store.settings.cash.since);
function markWithdrawals(list) {
  const cs = store.settings && store.settings.cash;
  if (!cs || !cs.since) return;
  for (const t of list)
    if (t.kind === "ausgabe" && isWithdrawCat(t.cat) && (t.date || "") >= cs.since) t.kind = "abhebung";
}
function cashFlows(asOf) {
  const cs = store.settings.cash;
  if (!cs) return 0;
  let f = 0;
  for (const t of store.tx) {
    const d = t.date || "";
    if (d < cs.since || d > asOf) continue;
    if (t.kind === "abhebung") f += t.amount;
    else if (t.pay === "bar") {
      if (t.kind === "einnahme") f += t.amount;
      else if (t.kind === "ausgabe" || t.kind === "betrieb") f -= t.amount;
    }
  }
  return round2(f);
}
/* Ohne eingetragenen Kontostand: in die Kasse umgebuchtes Geld fehlt auf dem Konto (sonst entstünde es doppelt) */
function cashMoves(asOf) {
  const cs = store.settings.cash;
  if (!cs) return 0;
  let f = 0;
  for (const m of store.settings.moves || []) {
    if (!m.date || m.date > asOf || m.date < cs.since) continue;
    const toC = m.to === "Bargeld",
      frC = m.from === "Bargeld";
    if (toC === frC) continue;
    f += (toC ? 1 : -1) * (Number(m.amt) || 0);
  }
  return round2(f);
}
const cashBal = (asOf) => round2((Number(store.settings.cash.start) || 0) + cashFlows(asOf));
async function cashActivate(since, start) {
  store.settings.cash = {
    since,
    start: round2(Number(start) || 0),
    checked: start != null,
  };
  await saveSettings();
  rebuildTx();
  render();
}
function cashBlock() {
  if (!cashOn())
    return `<div class="card cashcard"><div class="card-head"><h2>${headIcon("cash")}Bargeld</h2></div>
    <p class="small muted" style="margin:0 0 10px">Behalte dein Portemonnaie im Blick: Wie viel Bargeld hast du gerade?</p>
    <div class="cashset"><input class="in" id="cashStart" inputmode="decimal" placeholder="0,00" aria-label="Bargeld"><span>€</span><button class="btn primary" id="cashGo">Los</button></div>${IS_PC ? "" : `<button class="link small cashno" data-cashno="1" data-noi18n>${escHtml(uiText("hc_no"))}</button>`}</div>`;
  const today = isoToday(),
    bal = cashBal(today),
    cs = store.settings.cash;
  const mv = store.tx
    .filter((t) => (t.date || "") >= cs.since && (t.kind === "abhebung" || t.pay === "bar"))
    .sort((a, b) => (b.date + (b.ts || "")).localeCompare(a.date + (a.ts || "")))
    .slice(0, 4);
  return `<div class="card cashcard"><div class="card-head"><h2>${headIcon("cash")}Bargeld</h2><button class="link small" data-cashcount="1">Kassensturz</button></div>
    <div class="cashbal"><span class="coin">${svgIcon("wallet", 22)}</span><div><b class="${bal < 0 ? "neg" : ""}">${escHtml(fmtEur(bal))}</b><small class="muted">${cs.checked ? "im Portemonnaie" : "noch nicht gezählt – tippe auf Kassensturz"}</small></div></div>
    ${
      mv.length
        ? `<div class="cashmv">${mv
            .map((t) => {
              const inn = t.kind === "abhebung" || t.kind === "einnahme";
              return `<button class="cmv" data-edit="${escHtml(t.id)}"><span>${escHtml(t.kind === "abhebung" ? "Abgehoben" : t.note || t.cat || "Bar")}</span><small>${escHtml(shortDate(t.date))}</small><b class="${inn ? "pos" : "neg"}">${inn ? "+" : "−"} ${escHtml(fmtEur(t.amount))}</b></button>`;
            })
            .join("")}</div>`
        : `<p class="small muted" style="margin:8px 0 0">Noch keine Bar-Buchungen. Beim Eintragen einfach „Bar“ wählen.</p>`
    }
    <div class="cashbtns"><button class="btn" data-cashwd="1">+ Abgehoben</button><button class="btn" data-cashcount="1">Kassensturz</button></div></div>`;
}
function cashAsk(mode) {
  let el = $("cashBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "cashBg";
    el.className = "backdrop";
    el.innerHTML = `<div class="sheet cashsheet" role="dialog" aria-label="Bargeld"></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-cashclose]")) cashAskClose();
    });
  }
  ui.cashMode = mode;
  const cnt = mode === "count",
    bal = cashOn() ? cashBal(isoToday()) : 0;
  el.querySelector(".sheet").innerHTML =
    `<div class="sheet-head"><h2>${cnt ? "Kassensturz" : "Geld abgehoben"}</h2><button class="icon-btn" data-cashclose="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <p class="small muted" style="margin:0 0 12px">${cnt ? `Zähl dein Bargeld und trag ein, wie viel es ist. Laut App: <b>${escHtml(fmtEur(bal))}</b>.` : "Wie viel hast du am Automaten abgehoben? Es geht vom Konto ab und kommt ins Portemonnaie."}</p>
    <div class="cashset"><input class="in" id="cashAmt" inputmode="decimal" placeholder="0,00" aria-label="Betrag"><span>€</span></div>
    ${cnt ? "" : `<label class="lbl" for="cashDate" style="display:block;margin-top:10px">Datum</label><input class="in" type="date" id="cashDate" value="${isoToday()}">`}
    <button class="btn primary block" id="cashOk" style="margin-top:14px">${cnt ? "Stand übernehmen" : "Eintragen"}</button>`;
  el.hidden = false;
  requestAnimationFrame(() => {
    el.classList.add("show");
    setTimeout(() => $("cashAmt") && $("cashAmt").focus(), 60);
  });
}
function cashAskClose() {
  const el = $("cashBg");
  if (!el) return;
  el.classList.remove("show");
  setTimeout(() => {
    el.hidden = true;
  }, 200);
}
async function cashAskOk() {
  const v = parseAmt(($("cashAmt") || {}).value || "");
  if (!(v >= 0) || ($("cashAmt").value || "").trim() === "") {
    toast("Bitte einen Betrag eintragen");
    return;
  }
  const today = isoToday();
  if (ui.cashMode === "count") {
    if (!cashOn()) {
      await cashActivate(today, v);
      cashAskClose();
      toast(`Bargeld: ${fmtEur(v)}`);
      return;
    }
    const cs = store.settings.cash,
      diff = round2(v - cashBal(today));
    if (!cs.checked) {
      cs.start = round2((Number(cs.start) || 0) + diff);
      cs.checked = true;
      await saveSettings();
      cashAskClose();
      toast(`Bargeld: ${fmtEur(v)}`);
      return;
    }
    if (Math.abs(diff) < 0.005) {
      cashAskClose();
      toast("Stimmt genau ✓");
      return;
    }
    const id = mem ? newId() : db.collection("tx").doc().id,
      out = diff < 0;
    const doc = {
      date: today,
      amount: Math.abs(diff),
      kind: out ? "ausgabe" : "einnahme",
      cat: out
        ? cats("ausgabe").find((c) => /sonstig/i.test(c)) || cats("ausgabe")[0] || ""
        : (incCats().find((c) => c.art === "sonstige") || {}).name || "",
      note: out ? "Bar – nicht notiert" : "Bar – mehr gezählt",
      pay: "bar",
      ts: Date.now(),
    };
    if (await safe(() => saveTxDoc(id, doc, null))) {
      cashAskClose();
      toast(`${out ? "−" : "+"} ${fmtEur(Math.abs(diff))} ausgeglichen – Bargeld jetzt ${fmtEur(v)}`);
    }
    return;
  }
  if (!(v > 0)) {
    toast("Bitte einen Betrag eintragen");
    return;
  }
  const date = ($("cashDate") || {}).value || today;
  if (!cashOn()) await cashActivate(date, null);
  const cat = cats("ausgabe").find(isWithdrawCat) || "Bargeldabhebung";
  if (!cats("ausgabe").includes(cat)) {
    const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats);
    c.ausgabe = [...(c.ausgabe || []), cat];
    store.settings.cats = c;
    await saveSettings();
  }
  const id = mem ? newId() : db.collection("tx").doc().id;
  if (
    await safe(() =>
      saveTxDoc(
        id,
        {
          date,
          amount: round2(v),
          kind: "ausgabe",
          cat,
          note: "Abgehoben",
          ts: Date.now(),
        },
        null
      )
    )
  ) {
    cashAskClose();
    toast(`${fmtEur(v)} ins Portemonnaie`);
  }
}
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("[data-cashwd]")) {
    cashAsk("wd");
    return;
  }
  if (t.closest("[data-cashcount]")) {
    cashAsk("count");
    return;
  }
  if (t.closest("#cashOk")) {
    cashAskOk();
    return;
  }
  if (t.closest("[data-cashno]")) {
    store.settings.cashHide = true;
    saveSettings();
    render();
    toast(uiText("hc_gone"));
    return;
  }
  if (t.closest("#cashGo")) {
    const v = parseAmt(($("cashStart") || {}).value || "");
    if (!(v >= 0)) {
      toast("Bitte einen Betrag eintragen");
      return;
    }
    await cashActivate(isoToday(), v);
    toast(`Bargeld: ${fmtEur(v)}`);
    return;
  }
  const p = t.closest("[data-pay]");
  if (p && t.closest("#sheetBg")) {
    ui.pay = p.dataset.pay;
    renderPay();
    return;
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "cashAmt") cashAskOk();
});
document.addEventListener("change", (e) => {
  if (e.target.id !== "sCashHome") return;
  store.settings.cashHide = !e.target.checked;
  saveSettings();
});

/* ===== Einfach-Modus „Nur Ausgaben“ + Monatsgeld =====
   store.settings.simple = 1  → nur Ausgaben: Startseite zeigt „Ausgegeben“ statt Kontostand,
                                Einnahmen/Anlegen, Beruf und Sparen sind ausgeblendet (Daten bleiben).
   store.settings.monthMoney   → Geld für den Monat (z. B. Haushaltsgeld): Ring „noch übrig“. */

const simpleOn = () => !!(store.settings && store.settings.simple);
function simpleApply() {
  const on = simpleOn();
  document.documentElement.classList.toggle("simple", on);
  if (on && (ui.view === "beruf" || ui.view === "zukunft")) ui.view = "home";
}
/* Was zählt als ausgegeben: private (und betriebliche) Ausgaben ohne Abhebungen und Umbuchungen */
function simpleSpent(ym) {
  return round2(
    sum(
      store.tx.filter((t) => (t.kind === "ausgabe" || t.kind === "betrieb") && (t.date || "").startsWith(ym) && !t.um && !isWithdrawCat(t.cat)),
      (t) => t.amount
    )
  );
}
function simpleHero(ym) {
  const E = escHtml,
    cur = ymOf(new Date()),
    spent = simpleSpent(ym),
    prev = simpleSpent(shiftYm(ym, -1)),
    mm = Number(store.settings.monthMoney) || 0,
    D = daysIn(ym),
    day = ym === cur ? new Date().getDate() : D,
    left = ym === cur ? D - day + 1 : 0,
    mon = MONTHS[ymParts(ym)[1] - 1];
  /* Vergleich mit dem Vormonat bis zum gleichen Tag */
  const prevSame =
    ym === cur
      ? round2(sum(store.tx.filter((t) => (t.kind === "ausgabe" || t.kind === "betrieb") && (t.date || "").startsWith(shiftYm(ym, -1)) && Number(t.date.slice(8, 10)) <= day && !t.um && !isWithdrawCat(t.cat)), (t) => t.amount))
      : prev;
  const diff = round2(spent - prevSame),
    cmp = prevSame > 0 ? uiText(diff <= 0 ? "sm_less" : "sm_more", { a: fmtEur0(Math.abs(diff)), m: MONTHS[ymParts(shiftYm(ym, -1))[1] - 1] }) : "";
  if (mm > 0) {
    const rest = round2(mm - spent),
      p = Math.max(0, Math.min(1, spent / mm)),
      perDay = left > 0 ? Math.max(0, rest) / left : 0,
      R = 54,
      C = 2 * Math.PI * R;
    return `<div class="smhero ${rest < 0 ? "over" : ""}" data-noi18n><small>${E(uiText(rest >= 0 ? "sm_left_t" : "sm_over_t", { m: mon }))}</small>
      <div class="smring"><svg viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="${R}" class="bg"/><circle cx="66" cy="66" r="${R}" class="fg" stroke-dasharray="${(C * (1 - p)).toFixed(1)} ${C.toFixed(1)}"${p >= 1 ? ' stroke-opacity="0"' : ""} transform="rotate(-90 66 66)"/></svg><div><b dir="ltr">${E(fmtEur0(Math.abs(rest)))}</b><small>${E(uiText(rest < 0 ? "sm_over_of" : "sm_of", { a: fmtEur0(mm) }))}</small></div></div>
      <small>${E(
        ym === cur ? (rest >= 0 ? uiText("sm_perday", { n: String(left), a: fmtEur0(perDay) }) : uiText("sm_overby", { a: fmtEur0(-rest) })) : uiText("sm_spent", { a: fmtEur0(spent) })
      )}</small><button type="button" class="smedit" data-smmoney>${svgIcon("pen", 13)} ${E(uiText("sm_change"))}</button></div>`;
  }
  return `<div class="smhero" data-noi18n><small>${E(uiText("sm_spent_t", { m: mon }))}</small><div class="smbig" dir="ltr">${E(fmtEur0(spent))}</div><small>${E(
    uiText("sm_avg", { a: fmtEur0(spent / Math.max(1, day)) }) + (cmp ? " · " + cmp : "")
  )}</small><button type="button" class="smedit" data-smmoney>${svgIcon("plus", 13)} ${E(uiText("sm_set"))}</button></div>`;
}
/* Hinweise im Nur-Ausgaben-Modus: nichts zu Kontostand, Einnahmen, Beruf oder Sparen –
   stattdessen ein Hinweis, wenn das Monatsgeld überschritten ist */
const SM_DROP = new Set(["minus", "reserve", "debt", "goal", "term", "profend", "beihilfe", "mindest", "mjgrenze"]);
function simpleHints(hints, ym, cur) {
  const keep = hints.filter((h) => !SM_DROP.has(h.k) && !(h.lvl === "good" && !h.k));
  const mm = Number(store.settings.monthMoney) || 0,
    spent = simpleSpent(ym),
    mon = MONTHS[ymParts(ym)[1] - 1];
  if (mm > 0 && spent > mm && ym === cur) keep.unshift({ k: "smover", lvl: "warn", t: uiText("sm_over_t", { m: mon }), s: uiText("sm_overby", { a: fmtEur0(spent - mm) }) });
  if (!keep.some((h) => h.lvl !== "good"))
    keep.unshift({ lvl: "good", t: ym >= cur ? uiText("sm_ok_t") : uiText("sm_spent_t", { m: mon }), s: ym >= cur && mm > 0 ? uiText("sm_of", { a: fmtEur0(mm) }) + " · " + uiText("sm_spent", { a: fmtEur0(spent) }) : uiText("sm_spent", { a: fmtEur0(spent) }) });
  hints.splice(0, hints.length, ...keep);
}
/* Einstellungen → Startseite */
function simpleEdHtml() {
  const E = escHtml,
    mm = Number(store.settings.monthMoney) || 0;
  return `<div class="card" data-noi18n><div class="switch"><label for="sSimple"><b>${E(uiText("sm_sw"))}</b><br><span class="small muted">${E(uiText("sm_sw_s"))}</span></label><input type="checkbox" id="sSimple" ${simpleOn() ? "checked" : ""}></div>
    <div class="field" style="margin-top:12px"><label for="sMoney">${E(uiText("sm_money"))}</label><input class="in" id="sMoney" inputmode="decimal" value="${mm ? E(numStr(mm)) : ""}" placeholder="${E(uiText("sm_money_ph"))}"></div>
    <p class="small muted" style="margin:6px 0 0">${E(uiText("sm_money_s"))}</p></div>`;
}
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "sSimple") {
    store.settings.simple = t.checked ? 1 : 0;
    simpleApply();
    saveSettings();
    toast(uiText(t.checked ? "sm_on" : "sm_off"));
  } else if (t.id === "sMoney") {
    const v = parseAmt(t.value);
    store.settings.monthMoney = v > 0 ? round2(v) : 0;
    saveSettings();
  }
});
/* Monatsgeld direkt auf der Startseite festlegen */
document.addEventListener("click", (e) => {
  const t = e.target.closest && e.target.closest("[data-smmoney],#smBg [data-smsave],#smBg [data-smclear]");
  if (!t) return;
  if (t.hasAttribute("data-smmoney")) {
    const b = hbSheet("smBg", uiText("sm_money")),
      mm = Number(store.settings.monthMoney) || 0;
    b.innerHTML = `<div class="card agcard"><p class="small muted" style="margin:0 0 10px">${escHtml(uiText("sm_money_s"))}</p><div class="smin"><input class="in" id="smV" inputmode="decimal" dir="ltr" value="${mm ? escHtml(numStr(mm)) : ""}" placeholder="0"><span>€</span></div></div>
      <button type="button" class="btn primary block favsave" data-smsave>${escHtml(uiText("ag_az_save"))}</button>${mm ? `<button type="button" class="link agsetl" data-smclear>${escHtml(uiText("sm_clear"))}</button>` : ""}`;
    setTimeout(() => $("smV") && $("smV").focus(), 80);
  } else {
    const v = t.hasAttribute("data-smclear") ? 0 : parseAmt($("smV").value);
    store.settings.monthMoney = v > 0 ? round2(v) : 0;
    saveSettings();
    hbSheetClose("smBg");
    try {
      SND.play("save");
    } catch (_) {}
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "smV") {
    e.preventDefault();
    const b = document.querySelector("#smBg [data-smsave]");
    b && b.click();
  }
});

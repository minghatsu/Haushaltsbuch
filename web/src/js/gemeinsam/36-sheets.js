/* Monat / Datum */
function yearList(extra) {
  const cy = new Date().getFullYear(),
    ys = new Set([cy - 2, cy - 1, cy, cy + 1]);
  for (const t of store.tx) if (t.date) ys.add(Number(t.date.slice(0, 4)));
  for (const e of extra || []) if (e) ys.add(Number(e));
  return [...ys].filter(Boolean).sort((a, b) => a - b);
}
function fillMonthPill() {
  const [y, m] = ymParts(ui.ym);
  $("selM").innerHTML = MONTHS.map(
    (n, i) => `<option value="${i + 1}" ${i + 1 === m ? "selected" : ""}>${n}</option>`
  ).join("");
  $("selY").innerHTML = yearList([y])
    .map((v) => `<option value="${v}" ${v === y ? "selected" : ""}>${v}</option>`)
    .join("");
  $("selM").hidden = false;
}
function setYmFromPill() {
  ui.ym = $("selY").value + "-" + pad($("selM").value);
  render();
}
$("selM").addEventListener("change", setYmFromPill);
$("selY").addEventListener("change", setYmFromPill);
function fillDateSelects() {
  const iso = $("fDate").value || isoToday();
  const y = Number(iso.slice(0, 4)),
    m = Number(iso.slice(5, 7)),
    d = Number(iso.slice(8, 10));
  const dim = new Date(y, m, 0).getDate();
  $("dD").innerHTML = Array.from(
    {
      length: dim,
    },
    (_, i) => `<option value="${i + 1}" ${i + 1 === d ? "selected" : ""}>${i + 1}.</option>`
  ).join("");
  $("dM").innerHTML = MONTHS.map(
    (n, i) => `<option value="${i + 1}" ${i + 1 === m ? "selected" : ""}>${n}</option>`
  ).join("");
  $("dY").innerHTML = yearList([y])
    .map((v) => `<option value="${v}" ${v === y ? "selected" : ""}>${v}</option>`)
    .join("");
}
function dateFromSelects() {
  const y = Number($("dY").value),
    m = Number($("dM").value),
    dim = new Date(y, m, 0).getDate();
  const d = Math.min(Number($("dD").value), dim);
  $("fDate").value = y + "-" + pad(m) + "-" + pad(d);
  renderSheet();
}
["dD", "dM", "dY"].forEach((id) => $(id).addEventListener("change", dateFromSelects));

/* Sheet */
function openSheet(kind, tx) {
  /* Aufgeteilte Buchung: direkt die Aufteilung öffnen */
  if (tx && tx.sp && tx.sp.g && typeof splOpen === "function" && splParts(tx.sp.g).length > 1) {
    splOpen(tx.sp.g);
    return;
  }
  ui.scanItems = null;
  ui.sugUsed = false;
  $("fWk").checked = !!(tx && tx.wk);
  ui.pay = tx ? tx.pay || "karte" : null;
  ui.acct = tx ? kaOf(tx) : null;
  ui.kaManual = !!tx;
  ui.kaOpen = false;
  if (tx) {
    ui.editId = tx.id;
    ui.kind = tx.kind === "abhebung" ? "ausgabe" : tx.kind === "umbuchung" ? tx._k0 || "ausgabe" : tx.kind;
    ui.cat = tx.cat;
    if (isInvTx(tx)) {
      ui.kind = "anlage";
      const g = ((store.settings.inv && store.settings.inv.goals) || []).find((x) => x.id === tx.inv);
      ui.cat = g ? g.name : INV_CAT;
    }
    $("fAmount").value = numStr(tx.amount);
    $("fNote").value = tx.note || "";
    $("fDate").value = tx.date;
  } else {
    ui.editId = null;
    ui.kind = kind || "ausgabe";
    ui.cat = null;
    $("fAmount").value = "";
    $("fNote").value = "";
    $("fDate").value = ui.ym === ymOf(new Date()) ? isoToday() : ui.ym + "-01";
  }
  $("delBtn").textContent = "Löschen";
  $("fCur").value = "EUR";
  $("fCur").hidden = !!tx;
  fxSheetHint();
  const bg = $("sheetBg");
  bg.hidden = false;
  document.body.classList.add("locked");
  renderSheet();
  rcptSheetInit();
  requestAnimationFrame(() => {
    bg.classList.add("show");
    if (!tx)
      setTimeout(
        () =>
          $("fAmount").focus({
            preventScroll: true,
          }),
        60
      );
  });
  try {
    motSheet();
  } catch (_) {}
}
function closeSheet() {
  const bg = $("sheetBg");
  bg.classList.remove("show");
  document.body.classList.remove("locked");
  setTimeout(() => {
    bg.hidden = true;
  }, 220);
  ui.editId = null;
}
function renderSheet() {
  setTimeout(renderPay, 0);
  $("wkRow").hidden = !(ui.kind === "ausgabe" && hasJob());
  document.querySelectorAll("#kindSeg button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.kind === ui.kind));
    b.hidden =
      (!hasSelf() && (b.dataset.kind === "betrieb" || b.dataset.kind === "vorauszahlung") && ui.kind !== b.dataset.kind) ||
      (simpleOn() && b.dataset.kind !== "ausgabe" && ui.kind !== b.dataset.kind);
  });
  const list =
    ui.kind === "einnahme"
      ? incCats().map((c) => c.name)
      : ui.kind === "vorauszahlung"
        ? []
        : ui.kind === "anlage"
          ? [...invGoalNames(), INV_CAT]
          : cats(ui.kind);
  if (ui.cat && !list.includes(ui.cat) && !(cgOn(ui.kind) && cgOf(ui.kind, ui.cat))) ui.cat = null;
  if (!ui.cat && list.length) ui.cat = list[0];
  $("catWrap").hidden = !list.length;
  $("catGrid").innerHTML = list
    .map(
      (n) =>
        `<button class="cat" data-cat="${escHtml(n)}" aria-pressed="${n === ui.cat}">${ui.kind === "anlage" ? `<span class="ictile" style="background:color-mix(in srgb, var(--accent) 16%, transparent);color:var(--accent)">${svgIcon(n === INV_CAT ? "chart" : "piggy")}</span>` : tile(ui.kind, n)}${escHtml(n === INV_CAT && invGoalNames().length ? uiText("inv_nogoal") : n)}</button>`
    )
    .join("");
  /* Private Ausgaben: Gruppen mit Unterkategorien */
  {
    let af = $("cgAfter");
    if (!af) {
      af = document.createElement("div");
      af.id = "cgAfter";
      $("catGrid").after(af);
    }
    if (cgOn(ui.kind) && list.length) {
      const C = cgSheetGrid(ui.kind);
      $("catGrid").innerHTML = C.tiles;
      af.innerHTML = C.after;
      af.hidden = !C.after;
    } else {
      af.innerHTML = "";
      af.hidden = true;
    }
  }
  let hint = "";
  if (ui.kind === "einnahme" && incArt(ui.cat) === "selbst")
    hint =
      (store.settings.kleinunternehmer ? "" : "Betrag ohne Umsatzsteuer. ") +
      `${store.settings.reserveRate} % davon legst du für Steuern zurück.`;
  if (ui.kind === "einnahme" && incArt(ui.cat) === "sonderzahlung")
    hint = "Zählt in voller Höhe in diesem Monat – wird nicht aufs Jahr verteilt.";
  if (ui.kind === "vorauszahlung") hint = "Wird aus deiner Steuer-Rücklage bezahlt.";
  if (ui.kind === "anlage") hint = uiText("inv_hint_sheet");
  $("amountHint").textContent = hint;
  $("amountHint").hidden = !hint;
  $("sheetTitle").textContent = ui.editId ? "Buchung ändern" : "Neue Buchung";
  $("saveBtn").textContent = ui.editId ? "Änderung speichern" : "Speichern";
  $("editBtns").hidden = !ui.editId;
  {
    const sb = $("splBtn"),
      et = ui.editId && store.tx.find((t) => t.id === ui.editId);
    if (sb) {
      sb.hidden = !(et && splCanSplit(et) && (ui.kind === "ausgabe" || ui.kind === "betrieb"));
      sb.lastChild.textContent = " " + uiText("sp_btn");
    }
  }
  $("sheetImport").hidden = true;
  $("scanRow").hidden = !!ui.editId;
  $("scanPick").hidden = !NATIVE_SCAN;
  if (!NATIVE_SCAN) {
    $("scanTitle").textContent = "Quittung einlesen";
  }
  try {
    favSugRender();
  } catch (_) {}
  const d = $("fDate").value;
  fillDateSelects();
  document
    .querySelectorAll("#dateChips .dchip")
    .forEach((b) => b.setAttribute("aria-pressed", String(isoDaysAgo(Number(b.dataset.day)) === d)));
}

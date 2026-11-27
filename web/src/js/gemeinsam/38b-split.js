/* ===== Buchung aufteilen: ein Einkauf, mehrere Kategorien =====
   Gespeichert als mehrere Buchungen mit gleichem sp.g (Gruppe). So zählt jeder Teil in seiner Kategorie,
   alle Auswertungen funktionieren ohne Sonderfall. In der Liste erscheint die Gruppe als EINE Zeile.
   sp = { g: Gruppen-ID, t: Gesamtbetrag, i: Nummer des Teils } – Teil 0 behält ID, Beleg, Importschlüssel. */

const SPL = { g: "", base: null, rows: [], touched0: false, kind: "ausgabe", date: "", note: "" };
const splParts = (g) =>
  store.tx
    .filter((t) => t.sp && t.sp.g === g)
    .sort((a, b) => (a.sp.i || 0) - (b.sp.i || 0));
const splCanSplit = (t) => t && (t.kind === "ausgabe" || t.kind === "betrieb") && !t.um && !t.inv && !isWithdrawCat(t.cat);
/* Aus der Buchung heraus (Knopf im Bearbeiten-Fenster) */
function splFromTx(id) {
  const t = store.tx.find((x) => x.id === id);
  if (!t) return;
  if (t.sp) return splOpen(t.sp.g);
  SPL.g = "";
  SPL.base = t;
  SPL.kind = t.kind;
  SPL.touched0 = false;
  SPL.date = t.date;
  SPL.note = t.note || "";
  const other = cats(t.kind).find((c) => c !== t.cat) || "";
  SPL.rows = [
    { cat: t.cat || cats(t.kind)[0] || "", a: round2(t.amount) },
    { cat: other, a: 0 },
  ];
  closeSheet();
  setTimeout(() => splRender(true), 60);
}
function splOpen(g) {
  const P = splParts(g);
  if (!P.length) return;
  SPL.g = g;
  SPL.base = P[0];
  SPL.kind = P[0].kind;
  SPL.touched0 = true;
  SPL.date = P[0].date;
  SPL.note = P[0].note || "";
  SPL.rows = P.map((t) => ({ cat: t.cat, a: round2(t.amount), id: t.id }));
  splRender(true);
}
const splTotal = () => round2(SPL.g ? Number((SPL.base.sp || {}).t) || sum(SPL.rows, (r) => r.a) : SPL.base.amount);
function splRender(first) {
  const E = escHtml,
    t = SPL.base,
    tot = splTotal(),
    b = hbSheet("splBg", uiText("sp_h")),
    list = cats(SPL.kind),
    done = round2(sum(SPL.rows, (r) => Number(r.a) || 0)),
    diff = round2(tot - done),
    ok = Math.abs(diff) < 0.005 && SPL.rows.length >= 2 && SPL.rows.every((r) => r.cat && r.a > 0);
  const rows = SPL.rows
    .map((r, i) => {
      const opts = [...new Set([r.cat, ...list].filter(Boolean))].map((c) => `<option value="${E(c)}" ${c === r.cat ? "selected" : ""}>${E(c)}</option>`).join("");
      return `<div class="splrow" data-spli="${i}">${tile(SPL.kind, r.cat || list[0] || "")}<select class="in splcat" data-splcat="${i}" aria-label="${E(uiText("sp_cat"))}">${r.cat ? "" : `<option value="" selected>${E(uiText("sp_pick"))}</option>`}${opts}</select><input class="in splamt" data-splamt="${i}" inputmode="decimal" dir="ltr" value="${r.a > 0 ? E(numStr(r.a)) : ""}" placeholder="0,00" aria-label="${E(uiText("sp_amt"))}">${
        SPL.rows.length > 2 ? `<button type="button" class="spldel" data-spldel="${i}" aria-label="${E(uiText("sp_del"))}">${svgIcon("x", 15)}</button>` : ""
      }</div>`;
    })
    .join("");
  const bar = SPL.rows
    .map((r) => (r.a > 0 ? `<i style="width:${Math.min(100, (r.a / Math.max(tot, done, 0.01)) * 100).toFixed(2)}%;background:${catColor(SPL.kind, r.cat)}"></i>` : ""))
    .join("");
  b.innerHTML = `<div class="card agcard splhd"><span class="grow"><span class="agk">${t.acct ? E(t.acct) : E(uiText("sp_tot"))}</span><input class="in splnote" id="splNote" value="${E(SPL.note)}" placeholder="${E(t.cat || "")}" aria-label="${E(uiText("sp_notel"))}"></span><span class="splhr"><b class="spltot" dir="ltr">${E(fmtEur(tot))}</b><input class="in spldate" id="splDate" type="date" dir="ltr" value="${E(SPL.date)}" aria-label="${E(uiText("sp_datel"))}"></span></div>
    <div class="card agcard">${rows}<button type="button" class="link spladd" data-spladd>${svgIcon("plus", 15)} ${E(uiText("sp_add"))}</button>
      <div class="splbar" aria-hidden="true">${bar}</div>
      <div class="splrest ${ok ? "ok" : diff < 0 ? "over" : ""}"><span>${E(uiText("sp_done"))}</span><b dir="ltr">${E(
        ok ? uiText("sp_ok", { a: fmtEur(done), t: fmtEur(tot) }) : diff > 0 ? uiText("sp_left", { a: fmtEur(diff) }) : uiText("sp_over", { a: fmtEur(-diff) })
      )}</b></div>
      ${diff > 0.004 ? `<button type="button" class="link splrestb" data-splrest>${E(uiText("sp_rest", { a: fmtEur(diff) }))}</button>` : ""}
    </div>
    <button type="button" class="btn primary block splgo" data-splgo ${ok ? "" : "disabled"}>${E(uiText("sp_save"))}</button>
    ${SPL.g ? `<button type="button" class="link agsetl" data-spljoin>${E(uiText("sp_join"))}</button>` : ""}
    <p class="small muted agnote">${E(uiText("sp_note"))}</p>`;
  if (first && !reducedMotion())
    try {
      stbAnim(b, ".agcard,.splrow");
    } catch (_) {}
}
/* Nur Balken und Rest neu zeichnen, damit das Tippen im Feld nicht unterbrochen wird */
function splSoft() {
  const a = document.activeElement,
    k = a && a.dataset ? a.dataset.splamt : null,
    pos = a && a.selectionStart;
  splRender();
  if (k != null) {
    const n = document.querySelector(`#splBg [data-splamt="${k}"]`);
    if (n) {
      n.focus();
      try {
        n.setSelectionRange(pos, pos);
      } catch (_) {}
    }
  }
}
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "splNote") SPL.note = t.value;
  else if (t.id === "splDate" && t.value) SPL.date = t.value;
  if (!t.dataset || t.dataset.splamt == null || !t.closest("#splBg")) return;
  const i = Number(t.dataset.splamt),
    v = parseAmt(t.value);
  SPL.rows[i].a = isFinite(v) && v > 0 ? round2(v) : 0;
  if (i === 0) SPL.touched0 = true;
  /* Solange der erste Teil nicht von Hand geändert wurde, bekommt er automatisch den Rest */
  else if (!SPL.touched0) {
    const rest = round2(splTotal() - sum(SPL.rows.slice(1), (r) => r.a));
    SPL.rows[0].a = Math.max(0, rest);
    const f = document.querySelector('#splBg [data-splamt="0"]');
    if (f) f.value = SPL.rows[0].a > 0 ? numStr(SPL.rows[0].a) : "";
  }
  clearTimeout(splSoft._t);
  splSoft._t = setTimeout(splSoft, 350);
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "splDate" && t.value) SPL.date = t.value;
  if (!t.dataset || t.dataset.splcat == null || !t.closest("#splBg")) return;
  SPL.rows[Number(t.dataset.splcat)].cat = t.value;
  splRender();
});
document.addEventListener("click", async (e) => {
  const t = e.target.closest && e.target.closest("#splBg [data-spladd],#splBg [data-spldel],#splBg [data-splrest],#splBg [data-splgo],#splBg [data-spljoin],[data-splfrom]");
  if (!t) return;
  if (t.hasAttribute("data-splfrom")) {
    if (ui.editId) splFromTx(ui.editId);
    return;
  }
  if (t.hasAttribute("data-spladd")) {
    const used = new Set(SPL.rows.map((r) => r.cat));
    SPL.rows.push({ cat: cats(SPL.kind).find((c) => !used.has(c)) || "", a: 0 });
    splRender();
    const n = document.querySelector(`#splBg [data-splamt="${SPL.rows.length - 1}"]`);
    n && n.focus();
  } else if (t.hasAttribute("data-spldel")) {
    SPL.rows.splice(Number(t.dataset.spldel), 1);
    splRender();
  } else if (t.hasAttribute("data-splrest")) {
    const i = SPL.rows.findIndex((r) => !(r.a > 0)),
      j = i >= 0 ? i : SPL.rows.length - 1;
    SPL.rows[j].a = round2(SPL.rows[j].a + splTotal() - sum(SPL.rows, (r) => r.a));
    splRender();
  } else if (t.hasAttribute("data-splgo")) await splSave();
  else if (t.hasAttribute("data-spljoin")) await splJoin();
});
async function splSave() {
  const base = SPL.base,
    tot = splTotal(),
    g = SPL.g || "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    old = SPL.g ? splParts(SPL.g) : [base],
    keep = new Set();
  const btn = document.querySelector("#splBg [data-splgo]");
  if (btn) btn.disabled = true;
  const ok = await safe(async () => {
    for (let i = 0; i < SPL.rows.length; i++) {
      const r = SPL.rows[i],
        prev = r.id ? old.find((x) => x.id === r.id) : i === 0 ? base : null,
        src = prev || base,
        doc = plainTx(src);
      doc.cat = r.cat;
      doc.amount = round2(r.a);
      if (SPL.date) doc.date = SPL.date;
      doc.note = SPL.note.trim();
      doc.sp = { g, t: tot, i };
      /* Teil einer Bank-Buchung: zählt nicht noch einmal als selbst eingetippt (Kontostand) */
      if (base.importKey || (base.sp && base.sp.imp)) doc.sp.imp = 1;
      /* Nur der erste Teil behält Importschlüssel, Kassenbon-Positionen und Beleg */
      if (i > 0 && !prev) {
        delete doc.importKey;
        delete doc.items;
        delete doc.ishop;
        delete doc.nobon;
      }
      if (i === 0) delete doc.nobonDone;
      const id = prev ? prev.id : mem ? newId() : db.collection("tx").doc().id;
      keep.add(id);
      await saveTxDoc(id, doc, prev || null);
    }
    for (const x of old) if (!keep.has(x.id)) await delTxDoc(x);
  });
  if (!ok) {
    if (btn) btn.disabled = false;
    return;
  }
  hbSheetClose("splBg");
  toast(uiText("sp_saved", { n: String(SPL.rows.length) }));
  try {
    SND.play("save");
  } catch (_) {}
  render();
}
/* Aufteilung aufheben: wieder eine Buchung (erste Kategorie, ganzer Betrag) */
async function splJoin() {
  const P = splParts(SPL.g);
  if (!P.length) return;
  const first = P[0],
    doc = plainTx(first);
  doc.amount = round2(Number(first.sp.t) || sum(P, (t) => t.amount));
  delete doc.sp;
  const ok = await safe(async () => {
    await saveTxDoc(first.id, doc, first);
    for (const x of P.slice(1)) await delTxDoc(x);
  });
  if (!ok) return;
  hbSheetClose("splBg");
  render();
  toast(uiText("sp_joined"));
  setTimeout(() => {
    const t = store.tx.find((x) => x.id === first.id);
    if (t) openSheet(null, t);
  }, 260);
}
/* Liste: Teile einer Gruppe zu einer Zeile zusammenfassen */
function splGroup(list) {
  const seen = {},
    out = [];
  for (const t of list) {
    if (!t.sp) {
      out.push(t);
      continue;
    }
    const g = t.sp.g;
    if (seen[g]) {
      seen[g]._spp.push(t);
      continue;
    }
    const row = { ...t, _spp: [t] };
    seen[g] = row;
    out.push(row);
  }
  /* Nur zusammenfassen, was auch in der Liste steht: bei Suche/Filter zählt nur der passende Teil */
  for (const r of Object.values(seen)) {
    const all = splParts(r.sp.g),
      whole = all.length > 0 && r._spp.length >= all.length;
    if (whole) r._spp = all;
    r.id = r._spp[0].id;
    r.cat = r._spp[0].cat;
    r.amount = whole ? round2(Number(r.sp.t) || sum(r._spp, (x) => x.amount)) : round2(sum(r._spp, (x) => x.amount));
    r._spn = r._spp.length;
  }
  return out.map((r) => (r._spp && r._spn === 1 ? r._spp[0] : r));
}

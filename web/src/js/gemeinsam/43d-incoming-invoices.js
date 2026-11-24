/* Eingangsrechnungen: E-Rechnungen (XRechnung, ZUGFeRD) empfangen */
const ER = {
  tab: "open",
  sel: null,
  busy: false,
};
function erList() {
  return (store.settings.ers = store.settings.ers || []);
}

/* --- XML lesen --- */
const xKid = (el, n) => (el ? [...el.children].find((c) => c.localName === n) || null : null);
const xAll = (el, n) => (el ? [...el.getElementsByTagNameNS("*", n)] : []);
function xPath(el, path) {
  for (const n of path.split("/")) {
    if (!el) return null;
    el = xKid(el, n) || xAll(el, n)[0] || null;
  }
  return el;
}
const xTxt = (el, path) => {
  const e = path ? xPath(el, path) : el;
  return e ? e.textContent.trim() : "";
};
const xNum = (el, path) => {
  const v = parseFloat(xTxt(el, path));
  return isFinite(v) ? round2(v) : 0;
};
const xDate = (s) => {
  s = (s || "").trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
};

function einvUbl(r) {
  const credit = r.localName === "CreditNote",
    sup = xPath(r, "AccountingSupplierParty/Party"),
    tot = xKid(r, "LegalMonetaryTotal"),
    tax = xKid(r, "TaxTotal");
  return {
    typ: credit ? "g" : "r",
    nr: xTxt(xKid(r, "ID")),
    date: xDate(xTxt(xKid(r, "IssueDate"))),
    due: xDate(xTxt(xKid(r, "DueDate")) || xTxt(r, "PaymentMeans/PaymentDueDate")),
    cur: xTxt(xKid(r, "DocumentCurrencyCode")) || "EUR",
    from: xTxt(sup, "PartyLegalEntity/RegistrationName") || xTxt(sup, "PartyName/Name"),
    street: xTxt(sup, "PostalAddress/StreetName"),
    city: xTxt(sup, "PostalAddress/CityName"),
    net: xNum(tot, "TaxExclusiveAmount"),
    vat: xNum(tax, "TaxAmount"),
    gross: xNum(tot, "TaxInclusiveAmount"),
    pay: xNum(tot, "PayableAmount"),
    rates: xAll(tax, "TaxSubtotal").map((s) => [parseFloat(xTxt(s, "TaxCategory/Percent")) || 0, xNum(s, "TaxAmount")]),
    iban: xTxt(r, "PaymentMeans/PayeeFinancialAccount/ID").replace(/\s/g, ""),
    items: xAll(r, credit ? "CreditNoteLine" : "InvoiceLine").map((l) => ({
      n: xTxt(l, "Item/Name"),
      q: parseFloat(xTxt(l, credit ? "CreditedQuantity" : "InvoicedQuantity")) || 1,
      a: xNum(l, "LineExtensionAmount"),
    })),
  };
}
function einvCii(r) {
  const doc = xKid(r, "ExchangedDocument"),
    tr = xKid(r, "SupplyChainTradeTransaction"),
    st = xKid(tr, "ApplicableHeaderTradeSettlement"),
    sel = xPath(tr, "ApplicableHeaderTradeAgreement/SellerTradeParty"),
    sum = xKid(st, "SpecifiedTradeSettlementHeaderMonetarySummation");
  return {
    typ: xTxt(doc, "TypeCode") === "381" ? "g" : "r",
    nr: xTxt(doc, "ID"),
    date: xDate(xTxt(doc, "IssueDateTime/DateTimeString")),
    due: xDate(xTxt(st, "SpecifiedTradePaymentTerms/DueDateDateTime/DateTimeString")),
    cur: xTxt(st, "InvoiceCurrencyCode") || "EUR",
    from: xTxt(sel, "Name"),
    street: xTxt(sel, "PostalTradeAddress/LineOne"),
    city: xTxt(sel, "PostalTradeAddress/CityName"),
    net: xNum(sum, "TaxBasisTotalAmount"),
    vat: xNum(sum, "TaxTotalAmount"),
    gross: xNum(sum, "GrandTotalAmount"),
    pay: xNum(sum, "DuePayableAmount"),
    rates: (st ? [...st.children] : [])
      .filter((t) => t.localName === "ApplicableTradeTax")
      .map((t) => [parseFloat(xTxt(t, "RateApplicablePercent")) || 0, xNum(t, "CalculatedAmount")]),
    iban: xTxt(st, "SpecifiedTradeSettlementPaymentMeans/PayeePartyCreditorFinancialAccount/IBANID").replace(/\s/g, ""),
    items: xAll(tr, "IncludedSupplyChainTradeLineItem").map((l) => ({
      n: xTxt(l, "SpecifiedTradeProduct/Name"),
      q: parseFloat(xTxt(l, "SpecifiedLineTradeDelivery/BilledQuantity")) || 1,
      a: xNum(l, "SpecifiedLineTradeSettlement/SpecifiedTradeSettlementLineMonetarySummation/LineTotalAmount"),
    })),
  };
}
function einvParse(xml) {
  const d = new DOMParser().parseFromString(xml, "application/xml"),
    r = d.documentElement;
  if (!r || d.getElementsByTagName("parsererror").length) return null;
  const inv =
    r.localName === "CrossIndustryInvoice"
      ? einvCii(r)
      : r.localName === "Invoice" || r.localName === "CreditNote"
        ? einvUbl(r)
        : null;
  if (!inv) return null;
  inv.gross = inv.gross || round2(inv.net + inv.vat);
  inv.pay = inv.pay || inv.gross;
  return (inv.nr || inv.from) && inv.pay > 0 ? inv : null;
}
async function einvFromPdf(buf) {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({
    data: new Uint8Array(buf),
    isEvalSupported: false,
  }).promise;
  const att = (await doc.getAttachments()) || {};
  for (const a of Object.values(att))
    if (/\.xml$/i.test(a.filename || "")) {
      const inv = einvParse(new TextDecoder().decode(a.content));
      if (inv) return inv;
    }
  return null;
}
const isXmlF = (f) => /xml/i.test(f.type || "") || /\.xml$/i.test(f.name || "");
async function einvRead(file) {
  const buf = await file.arrayBuffer(),
    xml = isXmlF(file);
  let inv = null;
  if (xml) inv = einvParse(new TextDecoder().decode(buf));
  else if (isPdfF(file))
    try {
      inv = await einvFromPdf(buf.slice(0));
    } catch (_) {}
  if (!inv) return null;
  inv.fmt = xml ? "xr" : "zf";
  inv.mime = xml ? "application/xml" : "application/pdf";
  inv.fname = file.name || inv.nr + (xml ? ".xml" : ".pdf");
  inv.buf = buf;
  return inv;
}
function b64Of(buf) {
  const u = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}

/* --- Ablage --- */
async function erAdd(inv) {
  const key = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\s+/g, "");
  if (erList().some((x) => key(x.nr) === key(inv.nr) && key(x.from) === key(inv.from))) {
    toast(uiText("er_dup"));
    return null;
  }
  const { buf, mime, ...rest } = inv,
    rec = {
      ...rest,
      id: newId(),
      added: isoToday(),
      paid: null,
    };
  await rcptPut("er-" + rec.id, `data:${mime};base64,${b64Of(buf)}`);
  erList().push(rec);
  await saveSettings();
  return rec;
}
async function erTake(files) {
  const rest = [],
    got = [];
  for (const f of files) {
    if (!isXmlF(f) && !isPdfF(f)) {
      rest.push(f);
      continue;
    }
    const inv = await einvRead(f).catch(() => null);
    if (!inv) {
      if (isXmlF(f)) toast(uiText("er_none"));
      else rest.push(f);
      continue;
    }
    const rec = await erAdd(inv);
    if (rec) got.push(rec);
  }
  if (got.length) {
    SND.play("pop");
    toast(uiText("er_added", { n: got[0].from || got[0].nr }));
    ER.tab = "open";
    ER.sel = got.length === 1 ? got[0].id : null;
    erOpen();
  }
  return rest;
}
function erUsedTx() {
  return new Set(
    erList()
      .filter((x) => x.tx)
      .map((x) => x.tx)
  );
}
function addDays(iso, n) {
  const d = new Date(iso + "T12:00");
  d.setDate(d.getDate() + n);
  return isoOf(d);
}
const erOpenList = () => erList().filter((i) => !i.paid && i.typ !== "g");
function erState(i) {
  if (i.paid)
    return [
      "ok",
      uiText("er_paid_on", {
        d: fxDate(i.paid, {
          day: "numeric",
          month: "short",
        }),
      }),
    ];
  if (i.typ === "g") return ["", uiText("er_credit")];
  if (!i.due) return ["", uiText("er_no_due")];
  const n = daysTo(i.due);
  if (n < 0) return ["od", uiText("er_over", { n: String(-n) })];
  if (n === 0) return ["due", uiText("er_due_today")];
  return [n <= 7 ? "due" : "", uiText("er_due_in", { n: String(n) })];
}

/* --- Fenster --- */
function erOpen() {
  const b = hbSheet("erBg", uiText("er_h"));
  b.innerHTML = ER.sel ? erDetail(erList().find((x) => x.id === ER.sel)) : erListHtml();
  if (!reducedMotion())
    stbAnim(b, ER.sel ? ".erhead,.erbox,.erpos,.eriban,.eracts" : ".ersum>div,.erseg,.err,.rvwrite,.erhint");
}
function erListHtml() {
  const ym = isoToday().slice(0, 7),
    open = erOpenList(),
    paidM = erList().filter((i) => i.paid && i.paid.slice(0, 7) === ym && i.typ !== "g"),
    L = erList()
      .filter((i) =>
        ER.tab === "open" ? !i.paid && i.typ !== "g" : ER.tab === "paid" ? i.paid || i.typ === "g" : true
      )
      .sort((a, c) =>
        ER.tab === "open"
          ? (a.due || "9").localeCompare(c.due || "9")
          : (c.paid || c.date || "").localeCompare(a.paid || a.date || "")
      ),
    tab = (k, t) =>
      `<button type="button" class="${ER.tab === k ? "on" : ""}" data-ertab="${k}">${escHtml(uiText(t))}</button>`;
  return `${pmBanner()}<div class="ersum"><div><small>${escHtml(uiText("er_open"))}</small><b>${escHtml(fmtEur(open.reduce((s, i) => s + i.pay, 0)))}</b><small class="ercnt">${escHtml(cntTxt(open.length, "re"))}</small></div><div><small>${escHtml(uiText("er_sum_paid"))}</small><b>${escHtml(fmtEur(paidM.reduce((s, i) => s + i.pay, 0)))}</b><small class="ercnt">${escHtml(cntTxt(paidM.length, "re"))}</small></div></div>
    <div class="erseg" role="tablist">${tab("open", "er_open")}${tab("paid", "er_paid")}${tab("all", "er_all")}</div>
    <div class="erl">${
      L.map((i) => {
        const [c, s] = erState(i);
        return `<button type="button" class="err ${i.paid ? "paid" : ""}" data-ersel="${escHtml(i.id)}"><span class="eric">${svgIcon("docin", 20)}</span><span class="ern"><b data-noi18n>${escHtml(i.from || "–")}</b><small data-noi18n>${escHtml(i.nr || "")} · ${escHtml(uiText(i.fmt === "zf" ? "er_fmt_zf" : "er_fmt_xr"))}</small></span><span class="era"><b>${i.typ === "g" ? "+" : ""}${escHtml(fmtEur(i.pay))}</b><small class="${c}">${escHtml(s)}</small></span></button>`;
      }).join("") || `<p class="small muted erempty">${escHtml(uiText("er_empty"))}</p>`
    }</div>
    <button type="button" class="rvwrite" data-eradd><span class="rwi">${svgIcon("docin", 24)}</span><span class="rwt"><b>${escHtml(uiText("er_add"))}</b><small>${escHtml(uiText("er_add_s"))}</small></span><span class="rwgo">${svgIcon("right", 18)}</span></button>
    <input type="file" id="erFile" accept=".xml,application/xml,text/xml,application/pdf,.pdf" multiple hidden>
    <p class="small muted erhint">${escHtml(uiText(IS_DESK ? "er_hint_pc" : "er_hint"))}</p>`;
}
function erDetail(i) {
  if (!i) {
    ER.sel = null;
    return erListHtml();
  }
  const [c, s] = erState(i),
    E = (v) => escHtml(fmtEur(v)),
    D = (d) => escHtml(fxDate(d, { day: "numeric", month: "short", year: "numeric" }));
  return `<div class="erhead"><button type="button" class="erback" data-erback aria-label="${escHtml(uiText("er_back"))}">${svgIcon("right", 18)}</button><b data-noi18n>${escHtml(i.nr || "")}</b><span class="erfmt">${escHtml(uiText(i.fmt === "zf" ? "er_fmt_zf" : "er_fmt_xr"))}</span></div>
    <div class="erbox"><div><small>${escHtml(uiText("er_from"))}</small><b data-noi18n>${escHtml(i.from || "–")}</b>${i.city ? `<span data-noi18n>${escHtml([i.street, i.city].filter(Boolean).join(" · "))}</span>` : ""}</div><div class="r"><small>${escHtml(uiText(i.paid ? "er_paid" : "er_due_h"))}</small><b class="${c}">${i.paid ? D(i.paid) : i.due ? D(i.due) : "–"}</b><span>${escHtml(s)}</span></div></div>
    <div class="erpos"><div class="h"><span>${escHtml(uiText("er_pos"))}</span><span>${escHtml(uiText("er_amt"))}</span></div>${(
      i.items || []
    )
      .map(
        (p) =>
          `<div><span data-noi18n>${p.q !== 1 ? escHtml(String(p.q).replace(".", ",")) + " × " : ""}${escHtml(p.n || "–")}</span><span>${E(p.a)}</span></div>`
      )
      .join("")}<div class="s"><span>${escHtml(uiText("er_net"))}</span><span>${E(i.net)}</span></div>${(i.rates.length
      ? i.rates
      : [[0, i.vat]]
    )
      .map(
        ([p, a]) =>
          `<div class="s"><span>${escHtml(uiText("er_vat", { p: String(p).replace(".", ",") }))}</span><span>${E(a)}</span></div>`
      )
      .join("")}<div class="t"><b>${escHtml(uiText("er_total"))}</b><b>${E(i.pay)}</b></div></div>
    ${i.iban && !i.paid ? `<div class="eriban"><span><small>${escHtml(uiText("er_iban"))}</small><b data-noi18n>${escHtml(i.iban.replace(/(.{4})/g, "$1 ").trim())}</b></span><button type="button" class="btn sm" data-eriban>${svgIcon("copy", 14)} ${escHtml(uiText("er_copy"))}</button></div>` : ""}
    <div class="eracts">${
      i.paid
        ? ""
        : i.typ === "g"
          ? `<button type="button" class="btn primary" data-erdone>✓ ${escHtml(uiText("er_done"))}</button>`
          : `<button type="button" class="btn primary" data-erbook>${escHtml(uiText("er_book"))}</button>`
    }<div class="erminor"><button type="button" class="btn" data-erorig>${svgIcon("dl", 15)} ${escHtml(uiText("er_orig"))}</button><button type="button" class="btn ghost" data-erdel>${svgIcon("trash", 15)} ${escHtml(uiText("er_del"))}</button></div></div>`;
}
function erBook(i) {
  hbSheetClose("erBg");
  setTimeout(() => {
    openSheet("betrieb");
    $("fAmount").value = numStr(i.pay);
    $("fNote").value = [i.from, i.nr].filter(Boolean).join(" · ");
    $("fDate").value = isoToday();
    fillDateSelects();
    const last = erList().find((x) => x.from === i.from && x.cat);
    if (last && cats("betrieb").includes(last.cat)) ui.cat = last.cat;
    ER.book = i.id;
    renderSheet();
  }, 240);
}
/* Nach dem Speichern: gebuchte Rechnung abhaken */
function erAfterSave(txId) {
  if (!ER.book) return;
  const i = erList().find((x) => x.id === ER.book),
    t = store.tx.find((x) => x.id === txId);
  ER.book = null;
  if (!i || !t) return;
  i.paid = t.date;
  i.tx = t.id;
  if (t.cat) i.cat = t.cat;
  saveSettings();
}

document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("[data-eropen]")) {
    ER.sel = null;
    erOpen();
    return;
  }
  if (!t.closest("#erBg")) return;
  const tb = t.closest("[data-ertab]");
  if (tb) {
    ER.tab = tb.dataset.ertab;
    erOpen();
    return;
  }
  const s = t.closest("[data-ersel]");
  if (s) {
    ER.sel = s.dataset.ersel;
    erOpen();
    return;
  }
  if (t.closest("[data-erback]")) {
    ER.sel = null;
    erOpen();
    return;
  }
  if (t.closest("[data-eradd]")) {
    $("erFile").click();
    return;
  }
  const i = erList().find((x) => x.id === ER.sel);
  if (!i) return;
  if (t.closest("[data-erbook]")) erBook(i);
  else if (t.closest("[data-erdone]")) {
    i.paid = isoToday();
    await saveSettings();
    SND.play("save");
    erOpen();
  } else if (t.closest("[data-eriban]")) {
    try {
      await navigator.clipboard.writeText(i.iban);
      toast(uiText("er_copied"));
    } catch (_) {}
  } else if (t.closest("[data-erorig]")) {
    const f = await rcptGet("er-" + i.id);
    if (f) await saveBinary(i.fname || i.nr, await (await fetch(f)).blob(), uiText("er_saved"));
  } else if (t.closest("[data-erdel]")) {
    const L = erList(),
      k = L.indexOf(i);
    L.splice(k, 1);
    ER.sel = null;
    await saveSettings();
    erOpen();
    toast(uiText("er_deleted"), async () => {
      L.splice(k, 0, i);
      await saveSettings();
      erOpen();
    });
    setTimeout(() => {
      if (!erList().includes(i)) rcptDel("er-" + i.id).catch(() => {});
    }, 8000);
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "erFile") return;
  const fs = [...(e.target.files || [])];
  e.target.value = "";
  if (!fs.length || ER.busy) return;
  ER.busy = true;
  toast(uiText("er_reading"));
  try {
    const rest = await erTake(fs);
    if (rest.length) toast(uiText("er_none"));
  } finally {
    ER.busy = false;
  }
});

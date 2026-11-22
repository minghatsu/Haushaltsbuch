/* E-Rechnungen erstellen: ZUGFeRD (PDF mit Daten) und XRechnung (XML) */
const RVO = {
  d: null,
  act: "save",
  fmt: "zf",
};
const RV_UNITS = [
  [/^(std|stunden?|h)$/, "HUR"],
  [/^(min|minuten)$/, "MIN"],
  [/^tage?$/, "DAY"],
  [/^(monate?|mon)$/, "MON"],
  [/^(pauschal|pausch|psch)$/, "LS"],
  [/^km$/, "KMT"],
  [/^(qm|m²)$/, "MTK"],
  [/^(lfm|m)$/, "MTR"],
];
function rvUnitCode(u) {
  const s = String(u || "")
    .toLowerCase()
    .replace(/\.$/, "")
    .trim();
  const hit = RV_UNITS.find(([re]) => re.test(s));
  return hit ? hit[1] : "H87";
}
const xEsc = (s) =>
  String(s == null ? "" : s).replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]
  );
const xAmt = (v) => (Math.round((Number(v) || 0) * 100) / 100).toFixed(2);
const xDay = (iso) => String(iso || "").replace(/-/g, "");
function rvPlace(city) {
  const m = String(city || "")
    .trim()
    .match(/^(?:D-?)?(\d{4,5})\s+(.+)$/i);
  return m ? { zip: m[1], city: m[2] } : { zip: "", city: String(city || "").trim() };
}
function rvAddrXml(street, city) {
  const p = rvPlace(city);
  return `<ram:PostalTradeAddress>${p.zip ? `<ram:PostcodeCode>${xEsc(p.zip)}</ram:PostcodeCode>` : ""}${street ? `<ram:LineOne>${xEsc(street)}</ram:LineOne>` : ""}${p.city ? `<ram:CityName>${xEsc(p.city)}</ram:CityName>` : ""}<ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>`;
}

/* Fehlende Angaben je Format */
function rvEinvMissing(d, fmt, lw) {
  if (fmt === "pdf") return [];
  const b = rvBiz(),
    k = d.k || {},
    miss = [];
  const need = (ok, key) => ok || miss.push(uiText(key));
  need(b.name || b.owner, "eo_m_name");
  need(rvPlace(b.city).city, "eo_m_city");
  need(b.vatId || b.taxNo, "eo_m_tax");
  need(k.name, "eo_m_kname");
  if (fmt === "xr") {
    need(rvPlace(b.city).zip, "eo_m_zip");
    need(b.tel, "eo_m_tel");
    need(b.email, "eo_m_mail");
    need(b.iban, "eo_m_iban");
    need(rvPlace(k.city).city, "eo_m_kcity");
    need(k.email, "eo_m_kmail");
    need(String(lw || "").trim(), "eo_m_lw");
  }
  return miss;
}

/* Rechnungsdaten nach EN 16931 (CII-Syntax) */
function rvCii(d, xr, lw) {
  const b = rvBiz(),
    k = d.k || {},
    klein = !!b.klein,
    typ = d.typ || "r",
    sum = rvSum(d),
    rab = sum.rab,
    def = klein ? 0 : Number(d.vat) || 0,
    due = addDays(d.date, Number(d.z) || 14);
  lw = String(lw || "").trim();
  const lines = (d.pos || [])
    .filter((p) => (p.n || "").trim() || Number(p.q) * Number(p.p))
    .map((p, i) => {
      const rate = klein ? 0 : p.v === undefined || p.v === null || p.v === "" ? def : Number(p.v);
      return {
        id: i + 1,
        name: (p.n || "").trim() || "–",
        q: (Number(p.p) < 0 ? -1 : 1) * (Number(p.q) || 0),
        price: Math.abs(Number(p.p) || 0),
        unit: rvUnitCode(p.u),
        rate,
        net: round2((Number(p.q) || 0) * (Number(p.p) || 0)),
      };
    });
  const cat = (r) => (klein ? "E" : r > 0 ? "S" : "Z"),
    A = Math.abs,
    groups = sum.groups.map((g) => ({
      rate: g.rate,
      sum: A(g.sum),
      off: round2(A(g.sum) - A(g.net)),
      base: A(g.net),
      tax: A(g.vat),
    })),
    lineTotal = A(sum.sub),
    offTotal = A(sum.disc),
    basis = A(sum.net),
    taxTotal = A(sum.vat),
    grand = A(sum.gross),
    prepaid = A(sum.ded || 0),
    payable = round2(grand - prepaid);
  const code = typ === "s" || typ === "g" ? "381" : typ === "a" ? "326" : "380",
    why = klein
      ? "<ram:ExemptionReason>Kein Ausweis von Umsatzsteuer, da Kleinunternehmer gemäß § 19 UStG</ram:ExemptionReason>"
      : "",
    terms =
      d.lang === "en"
        ? `Payable within ${Number(d.z) || 14} days without deduction`
        : `Zahlbar innerhalb von ${Number(d.z) || 14} Tagen ohne Abzug`;
  const sellerName = b.name || b.owner || "",
    notes = [
      d.title,
      d.lz ? "Leistungszeitraum: " + d.lz : "",
      klein ? "Kein Ausweis von Umsatzsteuer, da Kleinunternehmer gemäß § 19 UStG." : "",
      d.note,
    ].filter((s) => String(s || "").trim());
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
<rsm:ExchangedDocumentContext>${xr ? "<ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter>" : ""}<ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${xr ? "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0" : "urn:cen.eu:en16931:2017"}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
<rsm:ExchangedDocument><ram:ID>${xEsc(d.nr)}</ram:ID><ram:TypeCode>${code}</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${xDay(d.date)}</udt:DateTimeString></ram:IssueDateTime>${notes.map((n) => `<ram:IncludedNote><ram:Content>${xEsc(n)}</ram:Content></ram:IncludedNote>`).join("")}</rsm:ExchangedDocument>
<rsm:SupplyChainTradeTransaction>
${lines
  .map(
    (l) =>
      `<ram:IncludedSupplyChainTradeLineItem><ram:AssociatedDocumentLineDocument><ram:LineID>${l.id}</ram:LineID></ram:AssociatedDocumentLineDocument><ram:SpecifiedTradeProduct><ram:Name>${xEsc(l.name)}</ram:Name></ram:SpecifiedTradeProduct><ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${l.price.toFixed(4).replace(/0{1,2}$/, "")}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement><ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${l.unit}">${l.q}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery><ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${cat(l.rate)}</ram:CategoryCode><ram:RateApplicablePercent>${l.rate}</ram:RateApplicablePercent></ram:ApplicableTradeTax><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${xAmt(l.net)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>`
  )
  .join("\n")}
<ram:ApplicableHeaderTradeAgreement>${lw || xr ? `<ram:BuyerReference>${xEsc(lw || d.nr)}</ram:BuyerReference>` : ""}<ram:SellerTradeParty><ram:Name>${xEsc(sellerName)}</ram:Name>${
    b.tel || b.email || b.owner
      ? `<ram:DefinedTradeContact>${b.owner ? `<ram:PersonName>${xEsc(b.owner)}</ram:PersonName>` : ""}${b.tel ? `<ram:TelephoneUniversalCommunication><ram:CompleteNumber>${xEsc(b.tel)}</ram:CompleteNumber></ram:TelephoneUniversalCommunication>` : ""}${b.email ? `<ram:EmailURIUniversalCommunication><ram:URIID>${xEsc(b.email)}</ram:URIID></ram:EmailURIUniversalCommunication>` : ""}</ram:DefinedTradeContact>`
      : ""
  }${rvAddrXml(b.street, b.city)}${b.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${xEsc(b.email)}</ram:URIID></ram:URIUniversalCommunication>` : ""}${b.vatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xEsc(String(b.vatId).replace(/\s/g, ""))}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}${b.taxNo ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${xEsc(b.taxNo)}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}</ram:SellerTradeParty><ram:BuyerTradeParty>${k.nr ? `<ram:ID>${xEsc(k.nr)}</ram:ID>` : ""}<ram:Name>${xEsc(k.name)}</ram:Name>${k.person ? `<ram:DefinedTradeContact><ram:PersonName>${xEsc(k.person)}</ram:PersonName></ram:DefinedTradeContact>` : ""}${rvAddrXml(k.street, k.city)}${k.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${xEsc(k.email)}</ram:URIID></ram:URIUniversalCommunication>` : ""}</ram:BuyerTradeParty></ram:ApplicableHeaderTradeAgreement>
<ram:ApplicableHeaderTradeDelivery>${d.lz ? "" : `<ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">${xDay(d.date)}</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent>`}</ram:ApplicableHeaderTradeDelivery>
<ram:ApplicableHeaderTradeSettlement><ram:PaymentReference>${xEsc(d.nr)}</ram:PaymentReference><ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>${
    b.iban
      ? `<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${xEsc(String(b.iban).replace(/\s/g, "").toUpperCase())}</ram:IBANID><ram:AccountName>${xEsc(sellerName)}</ram:AccountName></ram:PayeePartyCreditorFinancialAccount>${b.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${xEsc(String(b.bic).replace(/\s/g, "").toUpperCase())}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ""}</ram:SpecifiedTradeSettlementPaymentMeans>`
      : `<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>1</ram:TypeCode></ram:SpecifiedTradeSettlementPaymentMeans>`
  }${groups
    .map(
      (g) =>
        `<ram:ApplicableTradeTax><ram:CalculatedAmount>${xAmt(g.tax)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>${why}<ram:BasisAmount>${xAmt(g.base)}</ram:BasisAmount><ram:CategoryCode>${cat(g.rate)}</ram:CategoryCode><ram:RateApplicablePercent>${g.rate}</ram:RateApplicablePercent></ram:ApplicableTradeTax>`
    )
    .join("")}${
    rab
      ? groups
          .filter((g) => g.off)
          .map(
            (g) =>
              `<ram:SpecifiedTradeAllowanceCharge><ram:ChargeIndicator><udt:Indicator>false</udt:Indicator></ram:ChargeIndicator><ram:CalculationPercent>${rab}</ram:CalculationPercent><ram:BasisAmount>${xAmt(g.sum)}</ram:BasisAmount><ram:ActualAmount>${xAmt(g.off)}</ram:ActualAmount><ram:Reason>Rabatt</ram:Reason><ram:CategoryTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${cat(g.rate)}</ram:CategoryCode><ram:RateApplicablePercent>${g.rate}</ram:RateApplicablePercent></ram:CategoryTradeTax></ram:SpecifiedTradeAllowanceCharge>`
          )
          .join("")
      : ""
  }<ram:SpecifiedTradePaymentTerms><ram:Description>${xEsc(terms)}</ram:Description><ram:DueDateDateTime><udt:DateTimeString format="102">${xDay(due)}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms><ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${xAmt(lineTotal)}</ram:LineTotalAmount>${rab ? `<ram:AllowanceTotalAmount>${xAmt(offTotal)}</ram:AllowanceTotalAmount>` : ""}<ram:TaxBasisTotalAmount>${xAmt(basis)}</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="EUR">${xAmt(taxTotal)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${xAmt(grand)}</ram:GrandTotalAmount>${prepaid ? `<ram:TotalPrepaidAmount>${xAmt(prepaid)}</ram:TotalPrepaidAmount>` : ""}<ram:DuePayableAmount>${xAmt(payable)}</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>${d.ref ? `<ram:InvoiceReferencedDocument><ram:IssuerAssignedID>${xEsc(d.ref)}</ram:IssuerAssignedID></ram:InvoiceReferencedDocument>` : ""}</ram:ApplicableHeaderTradeSettlement>
</rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

function binStr(s) {
  const u = new TextEncoder().encode(s);
  let r = "";
  for (let i = 0; i < u.length; i += 0x8000) r += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return r;
}
function rvXmp(d) {
  return binStr(`<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xEsc("Rechnung " + (d.nr || ""))}</rdf:li></rdf:Alt></dc:title><dc:creator><rdf:Seq><rdf:li>${xEsc(rvBiz().name || rvBiz().owner || "")}</rdf:li></rdf:Seq></dc:creator></rdf:Description>
<rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/"><pdf:Producer>Finanz MAMI</pdf:Producer></rdf:Description>
<rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#"><fx:DocumentType>INVOICE</fx:DocumentType><fx:DocumentFileName>factur-x.xml</fx:DocumentFileName><fx:Version>1.0</fx:Version><fx:ConformanceLevel>EN 16931</fx:ConformanceLevel></rdf:Description>
</rdf:RDF></x:xmpmeta>
<?xpacket end="w"?>`);
}

/* Datei im gewählten Format */
function rvOutFile(d, fmt, lw) {
  const base = ("Rechnung " + (d.nr || "") + " " + ((d.k && d.k.name) || "")).trim().replace(/[\\/:*?"<>|]+/g, "-");
  if (fmt === "xr")
    return {
      blob: new Blob([rvCii(d, true, lw)], { type: "application/xml" }),
      name: base + ".xml",
      mime: "application/xml",
    };
  return {
    blob: rvPdf(d, fmt === "zf" ? rvCii(d, false, lw) : ""),
    name: base + ".pdf",
    mime: "application/pdf",
  };
}
function rvKundeOf(d) {
  const k = d.k || {};
  return (
    rvKunden().find((x) => x.id === d.kid) ||
    rvKunden().find((x) => (x.name || "").toLowerCase() === (k.name || "").toLowerCase()) ||
    null
  );
}

/* Auswahl vor dem Senden oder Speichern */
function rvFmtAsk(d, act) {
  const c = rvKundeOf(d);
  RVO.d = d;
  RVO.act = act;
  RVO.fmt = (c && c.fmt) || "zf";
  RVO.lw = (c && c.lw) || "";
  rvFmtRender(true);
}
function rvFmtRender(first) {
  const b = hbSheet("rvFmtBg", uiText("eo_h")),
    opt = (k, ic) => {
      const miss = rvEinvMissing(RVO.d, k, RVO.lw);
      return `<button type="button" class="eoopt ${RVO.fmt === k ? "on" : ""}" data-eofmt="${k}" role="radio" aria-checked="${RVO.fmt === k}"><span class="eoic">${svgIcon(ic, 20)}</span><span class="eot"><b>${escHtml(uiText("eo_" + k))}${k === "zf" ? ` <em>${escHtml(uiText("eo_rec"))}</em>` : ""}</b><small>${escHtml(uiText("eo_" + k + "_s"))}</small>${miss.length && RVO.fmt === k ? `<small class="eomiss">${escHtml(uiText("eo_miss", { x: miss.join(", ") }))}</small>` : ""}</span><i class="eodot"></i></button>`;
    },
    miss = rvEinvMissing(RVO.d, RVO.fmt, RVO.lw);
  b.innerHTML = `<div class="eolist" role="radiogroup">${opt("zf", "doccheck")}${opt("xr", "bank")}${opt("pdf", "doc")}</div>
    ${RVO.fmt === "xr" ? `<label class="hlf eolw"><span>${escHtml(uiText("eo_lw"))}</span><input class="in" id="eoLw" value="${escHtml(RVO.lw)}" placeholder="${escHtml(uiText("eo_lw_ph"))}" autocomplete="off" data-noi18n></label>` : ""}
    <p class="small muted eohint">${escHtml(uiText(rvBiz().klein ? "eo_hint_klein" : "eo_hint"))}</p>
    <button type="button" class="btn primary block" data-eogo ${miss.length ? "disabled" : ""}>${svgIcon(RVO.act === "mail" ? "mail" : "dl", 17)} ${escHtml(uiText(RVO.act === "mail" ? "eo_go_mail" : "eo_go_save"))}</button>`;
  if (first && !reducedMotion()) stbAnim(b, ".eoopt,.eohint,.btn");
}
async function rvFmtGo() {
  const d = RVO.d,
    fmt = RVO.fmt,
    lw = RVO.lw.trim(),
    c = rvKundeOf(d);
  if (c) {
    c.fmt = fmt;
    if (fmt === "xr") c.lw = lw;
    await saveSettings();
  }
  hbSheetClose("rvFmtBg");
  const f = rvOutFile(d, fmt, lw);
  if (RVO.act === "mail") rvMail(d, f);
  else rvSavePdf(d, f);
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (!t.closest("#rvFmtBg")) return;
  const o = t.closest("[data-eofmt]");
  if (o) {
    RVO.fmt = o.dataset.eofmt;
    rvFmtRender();
    SND.play("tick");
    return;
  }
  if (t.closest("[data-eogo]")) rvFmtGo();
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "eoLw") return;
  RVO.lw = e.target.value;
  const go = document.querySelector("#rvFmtBg [data-eogo]"),
    miss = rvEinvMissing(RVO.d, RVO.fmt, RVO.lw);
  if (go) go.disabled = !!miss.length;
  const m = document.querySelector("#rvFmtBg .eoopt.on .eomiss");
  if (m) {
    m.textContent = uiText("eo_miss", { x: miss.join(", ") });
    m.hidden = !miss.length;
  }
});

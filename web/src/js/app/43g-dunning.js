/* Zahlungserinnerung und Mahnungen in Stufen, mit Gebühr, Verzugszinsen und Pauschale */
const DN_BASE = [
  ["2026-07-01", 1.52],
  ["2026-01-01", 1.27],
  ["2025-07-01", 1.27],
  ["2025-01-01", 2.27],
];
const DN_FIRM =
  /\b(gmbh|ag|ug|kg|ohg|gbr|e\.\s?k\.?|e\.\s?v\.?|ltd|inc|se|mbh)\b|stadt|gemeinde|kreis|amt|verein|agentur|studio|werke|verlag|schule|klinik/i;
const DN = {
  id: null,
  lvl: 0,
  fee: true,
  int: false,
  flat: false,
  firm: true,
};
function dnBaseRate(iso) {
  return (DN_BASE.find(([d]) => d <= iso) || DN_BASE[DN_BASE.length - 1])[1];
}
function dnHist(i) {
  const h = (i.dun || []).slice();
  if (i.remind && !h.some((x) => x.lvl === 0)) h.unshift({ lvl: 0, d: i.remind });
  return h;
}
function dnNext(i) {
  const h = dnHist(i);
  return Math.min(2, h.length ? Math.max(...h.map((x) => x.lvl)) + 1 : 0);
}
function dnLast(i) {
  const h = dnHist(i);
  return h.length ? h[h.length - 1] : null;
}
function dnCalc(i) {
  const rest = rchRest(i),
    days = Math.max(0, -daysTo(i.due)),
    rate = round2(dnBaseRate(isoToday()) + (DN.firm ? 9 : 5)),
    fee = DN.lvl > 0 && DN.fee ? Number(rvBiz().dunFee) || 5 : 0,
    int = DN.lvl > 0 && DN.int ? round2((rest * rate * days) / 36500) : 0,
    flat = DN.lvl > 0 && DN.flat && DN.firm ? 40 : 0;
  return { rest, days, rate, fee, int, flat, total: round2(rest + fee + int + flat) };
}
function dnText(i) {
  const c = dnCalc(i),
    b = rvBiz(),
    k = (i.doc && i.doc.k) || {},
    nm = b.owner || b.name || String(store.settings.name || "").trim() || "[Dein Name]",
    de = (iso) =>
      new Date(iso + "T12:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }),
    hi = k.person ? `Guten Tag ${k.person},` : "Sehr geehrte Damen und Herren,",
    until = de(addDays(isoToday(), DN.lvl === 2 ? 7 : 10)),
    prev = dnHist(i).filter((x) => x.lvl > 0),
    rows = [
      `Offener Rechnungsbetrag: ${fmtEur(c.rest)}`,
      c.fee ? `Mahngebühr: ${fmtEur(c.fee)}` : "",
      c.int ? `Verzugszinsen (${String(c.rate).replace(".", ",")} % p. a. für ${c.days} Tage): ${fmtEur(c.int)}` : "",
      c.flat ? `Verzugspauschale nach § 288 Abs. 5 BGB: ${fmtEur(c.flat)}` : "",
    ].filter(Boolean),
    table = rows.length > 1 ? `\n\n${rows.join("\n")}\nGesamt: ${fmtEur(c.total)}` : "",
    bank = b.iban
      ? `\n\nBankverbindung: ${String(b.iban)
          .replace(/\s/g, "")
          .replace(/(.{4})/g, "$1 ")
          .trim()}`
      : "",
    ref = `Rechnung Nr. ${i.nr || ""} vom ${de(i.date)} über ${fmtEur(i.amt)}`;
  if (DN.lvl === 0)
    return `Hallo ${k.person || i.kunde || ""},\n\nich hoffe, es geht Ihnen gut! Mir ist aufgefallen, dass meine ${ref} noch offen ist (fällig am ${de(i.due)}).\n\nVielleicht ist sie einfach untergegangen – das passiert. Ich wäre Ihnen dankbar, wenn Sie den Betrag bis zum ${until} überweisen.${bank}\n\nFalls Sie schon bezahlt haben, betrachten Sie diese Nachricht bitte als gegenstandslos.\n\nViele Grüße\n${nm}`;
  if (DN.lvl === 1)
    return `${hi}\n\nleider konnte ich zu meiner ${ref} trotz meiner Zahlungserinnerung noch keinen Zahlungseingang feststellen.\n\nBitte überweisen Sie den offenen Betrag bis zum ${until}.${table}${bank}\n\nSollten Sie die Zahlung inzwischen veranlasst haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.\n\nMit freundlichen Grüßen\n${nm}`;
  return `${hi}\n\ntrotz Zahlungserinnerung${prev.length ? " und Mahnung vom " + de(prev[prev.length - 1].d) : ""} ist meine ${ref} weiterhin offen.\n\nIch fordere Sie hiermit letztmalig auf, den Gesamtbetrag bis zum ${until} zu begleichen.${table}${bank}\n\nNach Ablauf dieser Frist werde ich ohne weitere Ankündigung ein gerichtliches Mahnverfahren einleiten oder ein Inkassobüro beauftragen. Die dadurch entstehenden Kosten gehen zu Ihren Lasten.\n\nMit freundlichen Grüßen\n${nm}`;
}
const DN_KEYS = ["dn_l0", "dn_l1", "dn_l2"];
function dnOpen(id) {
  const i = rchList().find((x) => x.id === id);
  if (!i) return;
  DN.id = id;
  DN.lvl = dnNext(i);
  DN.firm = DN_FIRM.test(i.kunde || "");
  DN.fee = true;
  DN.int = DN.lvl === 2;
  DN.flat = false;
  dnRender(true);
}
function dnRender(first) {
  const i = rchList().find((x) => x.id === DN.id);
  if (!i) return;
  const b = hbSheet("dnBg", uiText(DN_KEYS[DN.lvl] + "_h")),
    c = dnCalc(i),
    sw = (k, label, sub, on, dis) =>
      `<button type="button" class="dnsw ${on ? "on" : ""}" data-dnsw="${k}" role="switch" aria-checked="${on}" ${dis ? "disabled" : ""}><span><b>${escHtml(label)}</b><small>${escHtml(sub)}</small></span><i></i></button>`;
  b.innerHTML = `<div class="dnsteps">${DN_KEYS.map((key, n) => {
    const h = dnHist(i)
      .filter((x) => x.lvl === n)
      .pop();
    return `<button type="button" class="dnst ${n === DN.lvl ? "on" : ""} ${h ? "done" : ""}" data-dnlvl="${n}"><i>${h ? svgIcon("check", 13) : n + 1}</i><span>${escHtml(uiText(key))}</span>${h ? `<small>${escHtml(fxDate(h.d, { day: "numeric", month: "short" }))}</small>` : ""}</button>`;
  }).join("")}</div>
    ${
      DN.lvl > 0
        ? `<div class="dnopts">${sw("firm", uiText("dn_firm"), uiText(DN.firm ? "dn_firm_y" : "dn_firm_n"), DN.firm)}${sw("fee", uiText("dn_fee"), fmtEur(Number(rvBiz().dunFee) || 5), DN.fee)}${sw(
            "int",
            uiText("dn_int"),
            uiText("dn_int_s", {
              r: String(c.rate).replace(".", ","),
              n: String(c.days),
              a: fmtEur(round2((c.rest * c.rate * c.days) / 36500)),
            }),
            DN.int
          )}${DN.firm ? sw("flat", uiText("dn_flat"), "40,00 € · § 288 Abs. 5 BGB", DN.flat) : ""}</div>
          <div class="dntot"><span>${escHtml(uiText("dn_total"))}</span><b>${escHtml(fmtEur(c.total))}</b></div>`
        : ""
    }
    <p class="hosub dnsub">${escHtml(uiText("rch_rem_s"))}</p>
    <textarea class="in valt" id="dnTxt" rows="12" spellcheck="false" data-noi18n>${escHtml(dnText(i))}</textarea>
    <p class="small muted dnnote">${escHtml(uiText("dn_note", { d: fxDate(DN_BASE[0][0], { day: "numeric", month: "long", year: "numeric" }), r: String(DN_BASE[0][1]).replace(".", ",") }))}</p>
    <div class="vabtns"><button type="button" class="btn" data-dncopy>${escHtml(uiText("va_copy"))}</button><button type="button" class="btn primary" data-dnsend>${svgIcon("mail", 16)} ${escHtml(uiText("va_send"))}</button></div>`;
  if (first && !reducedMotion()) stbAnim(b, ".dnsteps,.dnsw,.dntot,.valt,.vabtns");
}
async function dnMark(i) {
  const c = dnCalc(i);
  i.dun = dnHist(i).filter((x) => x.lvl !== DN.lvl);
  i.dun.push({ lvl: DN.lvl, d: isoToday(), fee: c.fee, int: c.int, flat: c.flat });
  i.dun.sort((a, c2) => a.lvl - c2.lvl);
  delete i.remind;
  rvLog("dun", i.nr, String(DN.lvl));
  await saveSettings();
}
async function dnSend(i) {
  const txt = $("dnTxt").value,
    subj = `${uiTextDe(DN_KEYS[DN.lvl] + "_h")} – Rechnung ${i.nr || ""}`;
  await dnMark(i);
  hbSheetClose("dnBg");
  if (i.doc) {
    rvMailGo(i.doc, txt, rvOutFile(i.doc, "pdf"), subj);
  } else {
    try {
      if (navigator.share) await navigator.share({ title: subj, text: txt });
      else location.href = "mailto:?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(txt);
    } catch (_) {}
  }
  setTimeout(() => rchOpen2(i.id), 400);
}
function uiTextDe(k) {
  const a = TEXTS[k];
  return a ? a[0] : k;
}
function dnRowBtn(i) {
  const n = dnNext(i),
    last = dnLast(i);
  return `${last ? `<span class="dnchip">${svgIcon("check", 12)} ${escHtml(uiText("dn_d" + last.lvl))} ${escHtml(fxDate(last.d, { day: "numeric", month: "short" }))}</span>` : ""}<button class="btn sm primary ${n > 0 ? "dnhot" : ""}" data-dnopen="${escHtml(i.id)}">${escHtml(uiText(last && last.lvl === 2 ? "dn_again" : DN_KEYS[n]))}</button>`;
}
document.addEventListener("click", async (e) => {
  const t = e.target,
    o = t.closest("[data-dnopen]");
  if (o) {
    dnOpen(o.dataset.dnopen);
    return;
  }
  if (!t.closest("#dnBg")) return;
  const i = rchList().find((x) => x.id === DN.id);
  if (!i) return;
  const lv = t.closest("[data-dnlvl]"),
    sw = t.closest("[data-dnsw]");
  if (lv) {
    DN.lvl = Number(lv.dataset.dnlvl);
    DN.int = DN.lvl === 2;
    dnRender();
    SND.play("tick");
  } else if (sw) {
    const k = sw.dataset.dnsw;
    DN[k] = !DN[k];
    if (k === "firm" && !DN.firm) DN.flat = false;
    dnRender();
    SND.play(DN[k] ? "tick" : "untick");
  } else if (t.closest("[data-dncopy]")) {
    try {
      await navigator.clipboard.writeText($("dnTxt").value);
      toast(uiText("va_copied"));
    } catch (_) {
      $("dnTxt").select();
    }
    await dnMark(i);
    if ($("rchBg") && !$("rchBg").hidden) rchOpen2(i.id);
  } else if (t.closest("[data-dnsend]")) dnSend(i);
});

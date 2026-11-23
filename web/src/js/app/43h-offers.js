/* Angebote: schreiben, nachhalten und mit einem Tipp in eine Rechnung umwandeln */
const AN = { tab: "open" };
const AN_INTRO = {
  de: "Vielen Dank für Ihre Anfrage. Gerne biete ich Ihnen folgende Leistungen an:",
  en: "Thank you for your enquiry. I am pleased to offer you the following services:",
};
function anList() {
  return (store.settings.offers = store.settings.offers || []);
}
const anValid = (d) => addDays(d.date || isoToday(), Number(d.gv) || 30);
function anNextNr() {
  const y = new Date().getFullYear(),
    re = new RegExp(`^AN-${y}-(\\d+)$`);
  const mx = anList().reduce((m, o) => {
    const h = String(o.nr || "").match(re);
    return h ? Math.max(m, Number(h[1])) : m;
  }, 0);
  return `AN-${y}-${String(mx + 1).padStart(3, "0")}`;
}
function anNew() {
  const d = rvNew();
  return { ...d, typ: "o", nr: anNextNr(), gv: 30, rep: 0, intro: AN_INTRO.de };
}

/* Aus dem Editor */
async function anFinish(d) {
  const sum = rvSum(d),
    rec = {
      nr: d.nr,
      kunde: d.k.name,
      amt: sum.gross,
      date: d.date,
      valid: anValid(d),
      doc: JSON.parse(JSON.stringify({ ...d, id: undefined })),
    };
  let o = d.id && anList().find((x) => x.id === d.id);
  if (o) Object.assign(o, rec);
  else {
    o = { id: "o" + Date.now().toString(36), st: "open", ...rec };
    anList().push(o);
  }
  try {
    localStorage.removeItem("hb-rvdraft");
  } catch (_) {}
  await saveSettings();
  SND.play("done");
  $("rvBg").hidden = true;
  $("rvBg").innerHTML = "";
  document.body.classList.remove("locked");
  AN.tab = "open";
  anOpen();
  toast(uiText("an_saved", { n: d.nr }));
}
function anAccepted(id, inv) {
  const o = anList().find((x) => x.id === id);
  if (!o) return;
  o.st = "ok";
  o.okd = isoToday();
  o.inv = inv.nr;
}
function anToInvoice(o) {
  const lg = o.doc.lang === "en" ? "en" : "de",
    d = JSON.parse(JSON.stringify(o.doc));
  delete d.gv;
  Object.assign(d, {
    id: undefined,
    typ: "r",
    nr: rchNextNr(),
    date: isoToday(),
    title: "",
    intro:
      lg === "en"
        ? "Thank you for your order. I hereby invoice you for the following services:"
        : rvBiz().intro || "Vielen Dank für Ihren Auftrag. Hiermit stelle ich Ihnen folgende Leistungen in Rechnung:",
    note: d.note || rvBiz().outro || "",
    fromOffer: o.id,
  });
  hbSheetClose("anBg");
  setTimeout(() => rvOpen(d), 240);
}

/* Fenster mit allen Angeboten */
function anState(o) {
  if (o.st === "ok") return ["ok", uiText("an_st_ok", { n: o.inv || "" })];
  if (o.st === "no") return ["", uiText("an_st_no")];
  const n = daysTo(o.valid);
  if (n < 0) return ["od", uiText("an_st_exp")];
  if (n <= 3) return ["due", uiText(n === 0 ? "an_st_today" : "an_st_soon", { n: String(n) })];
  return ["", uiText("an_st_left", { n: String(n) })];
}
function anOpen() {
  const L = anList(),
    y = String(new Date().getFullYear()),
    open = L.filter((o) => o.st === "open"),
    okY = L.filter((o) => o.st === "ok" && String(o.okd || "").startsWith(y)),
    show = L.filter((o) => o.st === AN.tab).sort((a, c) => (c.date || "").localeCompare(a.date || "")),
    b = hbSheet("anBg", uiText("an_h")),
    tab = (k, t) =>
      `<button type="button" class="${AN.tab === k ? "on" : ""}" data-antab="${k}">${escHtml(uiText(t))}</button>`;
  b.innerHTML = `<div class="ersum"><div><small>${escHtml(uiText("er_open"))}</small><b>${open.length} · ${escHtml(fmtEur(open.reduce((s, o) => s + o.amt, 0)))}</b></div><div><small>${escHtml(uiText("an_ok_y", { y }))}</small><b>${okY.length} · ${escHtml(fmtEur0(okY.reduce((s, o) => s + o.amt, 0)))}</b></div></div>
    <div class="erseg" role="tablist">${tab("open", "er_open")}${tab("ok", "an_tab_ok")}${tab("no", "an_tab_no")}</div>
    <div class="anl">${
      show
        .map((o) => {
          const [c, s] = anState(o),
            id = escHtml(o.id);
          return `<div class="anc ${o.st}" data-anid="${id}"><div class="ant"><span class="eric">${svgIcon("doc", 20)}</span><span class="ern"><b data-noi18n>${escHtml(o.kunde || "–")}</b><small><span data-noi18n>${escHtml(o.nr)}</span> · <span class="${c}">${escHtml(s)}</span></small></span><span class="era"><b>${escHtml(fmtEur(o.amt))}</b></span></div>
          ${
            o.st === "open"
              ? `<div class="ana"><button type="button" class="btn anno" data-anno="${id}">${escHtml(uiText("an_no"))}</button><button type="button" class="btn primary" data-anok="${id}">${escHtml(uiText("an_ok"))}</button></div>`
              : ""
          }<div class="anx"><button type="button" class="btn sm" data-anpdf="${id}" aria-label="PDF">${svgIcon("dl", 14)}</button><button type="button" class="btn sm" data-anmail="${id}">${svgIcon("mail", 14)} ${escHtml(uiText("an_mail"))}</button>${o.st === "open" ? `<button type="button" class="btn sm" data-anedit="${id}" aria-label="${escHtml(uiText("rv_edit"))}">${svgIcon("pen", 14)}</button>` : ""}${o.st === "no" ? `<button type="button" class="btn sm" data-anre="${id}">${escHtml(uiText("an_reopen"))}</button>` : ""}${o.st !== "ok" ? `<button type="button" class="btn sm ghost" data-andel="${id}" aria-label="${escHtml(uiText("tm_del"))}">${svgIcon("trash", 14)}</button>` : ""}</div></div>`;
        })
        .join("") || `<p class="small muted erempty">${escHtml(uiText("an_empty"))}</p>`
    }</div>
    <button type="button" class="rvwrite" data-annew><span class="rwi">${svgIcon("doc", 24)}</span><span class="rwt"><b>${escHtml(uiText("an_new"))}</b><small>${escHtml(uiText("an_new_s"))}</small></span><span class="rwgo">${svgIcon("right", 18)}</span></button>`;
  if (!reducedMotion()) stbAnim(b, ".ersum>div,.erseg,.anc,.rvwrite");
}
async function anSet(o, st) {
  const prev = { st: o.st, nod: o.nod };
  o.st = st;
  if (st === "no") o.nod = isoToday();
  await saveSettings();
  anOpen();
  render();
  if (st === "no")
    toast(uiText("an_rejected", { n: o.nr }), async () => {
      Object.assign(o, prev);
      await saveSettings();
      anOpen();
    });
}
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("[data-anopen]")) {
    anOpen();
    return;
  }
  if (!t.closest("#anBg")) return;
  const pick = (k) => {
    const el = t.closest(`[data-${k}]`);
    return el ? anList().find((x) => x.id === el.dataset[k]) : null;
  };
  const tb = t.closest("[data-antab]");
  if (tb) {
    AN.tab = tb.dataset.antab;
    anOpen();
    SND.play("tick");
    return;
  }
  if (t.closest("[data-annew]")) {
    hbSheetClose("anBg");
    setTimeout(() => rvOpen(anNew()), 240);
    return;
  }
  let o;
  if ((o = pick("anok"))) anToInvoice(o);
  else if ((o = pick("anno"))) {
    SND.play("untick");
    const card = t.closest(".anc");
    if (card && !reducedMotion())
      await card
        .animate(
          [
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: "translateX(-40px) scale(.96)" },
          ],
          { duration: 240, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" }
        )
        .finished.catch(() => {});
    anSet(o, "no");
  } else if ((o = pick("anre"))) anSet(o, "open");
  else if ((o = pick("anpdf"))) rvSavePdf(o.doc, rvOutFile(o.doc, "pdf"));
  else if ((o = pick("anmail"))) rvMail(o.doc, rvOutFile(o.doc, "pdf"));
  else if ((o = pick("anedit"))) {
    hbSheetClose("anBg");
    setTimeout(() => rvOpen({ ...JSON.parse(JSON.stringify(o.doc)), id: o.id }), 240);
  } else if ((o = pick("andel"))) {
    const L = anList(),
      k = L.indexOf(o);
    L.splice(k, 1);
    await saveSettings();
    anOpen();
    render();
    toast(uiText("an_deleted"), async () => {
      L.splice(k, 0, o);
      await saveSettings();
      anOpen();
      render();
    });
  }
});

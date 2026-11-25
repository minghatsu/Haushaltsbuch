/* ===== Dokumenten-Ablage =====
   Dokumente hochladen (einzeln oder als Stapel), die App erkennt Art und Jahr und legt sie ab.
   Die Ablage zeigt immer das Jahr aus der Kopfzeile. Wo die App mit einem Dokument mehr anfangen kann
   (Bescheid-Check, Steuerbescheid, Rechnung, Kassenbon, Kontoauszug, Briefe vom Amt), bietet sie das an.

   Erkennung: Jede Art hat Merkmale (Wörter, die fast nur in diesem Dokument stehen) mit Gewicht. Die Art mit
   den meisten Punkten gewinnt; liegt sie zu knapp oder zu niedrig, fragt die Prüfliste nach. Das Profil
   (Schule, Bürgergeld, Rente …) entscheidet nur, welche Arten in der Auswahl oben stehen – erkannt wird alles. */

/* [id, Text-Schlüssel, Symbol, Profil-Gruppen, Weiterleitung, Merkmale] – Gruppen wie WGROUPS: job, edu, staat, rente */
const DOK_ARTEN = [
  ["konto", "dk_konto", "bank", [], "konto", [[/kontoauszug/, 6], [/alter kontostand|neuer kontostand/, 6], [/\biban\b/, 1], [/buchungstag|wertstellung|valuta/, 3]]],
  ["lohn", "dk_lohn", "wallet", ["job", "edu"], "", [[/(lohn|gehalts|entgelt|bezüge|verdienst)abrechnung/, 8], [/auszahlungsbetrag|nettobezug|nettoverdienst/, 4], [/gesamtbrutto|steuer-brutto|sv-brutto/, 4], [/personalnummer|personal-nr/, 2]]],
  ["lstb", "dk_lstb", "doctax", ["job"], "", [[/lohnsteuerbescheinigung/, 10], [/elektronischen lohnsteuerbescheinigung/, 4]]],
  ["stb", "dk_stb", "doctax", [], "stb", [[/bescheid für (19|20)\d\d über/, 9], [/einkommensteuerbescheid|einkommensteuer und solidaritätszuschlag/, 7], [/festgesetzt werden|festsetzung/, 3], [/finanzamt/, 3], [/steuernummer/, 1], [/veranlagungszeitraum/, 3]]],
  ["rch", "dk_rch", "docout", ["job"], "rch", [[/\brechnung\b/, 2], [/rechnungs-?\s?(nr|nummer)/, 3], [/zahlbar bis|zahlungsziel|bitte überweisen/, 2]]],
  ["erch", "dk_erch", "docin", [], "beleg", [[/\brechnung\b/, 2], [/rechnungs-?\s?(nr|nummer)/, 3], [/kunden-?\s?(nr|nummer)/, 2], [/zahlbar bis|wird .* abgebucht|lastschrift/, 2]]],
  ["bon", "dk_bon", "receipt", [], "bon", [[/\bsumme\b|\bzu zahlen\b/, 3], [/kartenzahlung|ec-karte|girocard|\bbar\b|rückgeld/, 3], [/mwst|ust\.?\s?\d/, 1], [/bon-?nr|kasse \d|beleg-?nr/, 3]]],
  ["jc", "dk_jc", "doccheck", ["staat"], "bs", [[/jobcenter/, 5], [/bürgergeld|grundsicherung für arbeitsuchende|sgb ii/, 6], [/bewilligungsbescheid|änderungsbescheid|weiterbewilligung/, 4], [/bedarfsgemeinschaft|regelbedarf|kosten der unterkunft/, 4]]],
  ["aa", "dk_aa", "doccheck", ["staat"], "bs", [[/agentur für arbeit|bundesagentur für arbeit/, 5], [/arbeitslosengeld(?! ii)|sgb iii/, 5], [/bewilligung|anspruchsdauer|leistungssatz/, 3]]],
  ["termin", "dk_termin", "mail", ["staat"], "br", [[/einladung/, 4], [/meldetermin|termin am|bitte kommen sie|persönlich vorsprechen/, 5], [/jobcenter|agentur für arbeit|sozialamt/, 2]]],
  ["fam", "dk_fam", "kids", [], "bs", [[/familienkasse/, 7], [/kindergeld|kinderzuschlag/, 6], [/elterngeld|elterngeldstelle/, 7], [/unterhaltsvorschuss/, 6]]],
  ["bafoeg", "dk_bafoeg", "book", ["edu"], "bs", [[/bafög|ausbildungsförderung/, 8], [/studierendenwerk|amt für ausbildungsförderung/, 5], [/bewilligungszeitraum/, 2]]],
  ["rente", "dk_rente", "doccheck", ["rente"], "bs", [[/deutsche rentenversicherung/, 6], [/rentenbescheid|renteninformation|rentenauskunft/, 7], [/erwerbsminderung|altersrente|rentenanpassung/, 5]]],
  ["kk", "dk_kk", "health", [], "", [[/krankenkasse|krankenversicherung/, 4], [/\baok\b|techniker krankenkasse|barmer|\bdak\b|\bikk\b|\bbkk\b/, 4], [/krankengeld|pflegegrad|pflegekasse|mitgliedsbescheinigung/, 5]]],
  ["wohngeld", "dk_wohngeld", "home", [], "bs", [[/wohngeld/, 9], [/wohngeldstelle/, 4]]],
  ["nk", "dk_nk", "home", [], "", [[/nebenkostenabrechnung|betriebskostenabrechnung|heizkostenabrechnung/, 9], [/abrechnungszeitraum/, 2], [/umlageschlüssel|wohnfläche|vorauszahlung/, 2]]],
  ["miete", "dk_miete", "home", [], "", [[/mietvertrag/, 8], [/mieterhöhung|mietanpassung|vergleichsmiete/, 7], [/vermieter(in)?\b|mieter(in)?\b/, 2], [/kaltmiete|warmmiete|kaution/, 3]]],
  ["energie", "dk_energie", "bolt", [], "", [[/stromrechnung|jahresabrechnung|verbrauchsabrechnung/, 5], [/\bkwh\b|zählerstand|zählernummer/, 4], [/abschlag|stadtwerke|grundversorgung/, 3], [/\bgas\b|\bstrom\b|wasser/, 1]]],
  ["vertrag", "dk_vertrag", "repeat", [], "", [[/vertragsbestätigung|auftragsbestätigung|ihre bestellung/, 5], [/kündigung|kündigungsbestätigung/, 5], [/mindestlaufzeit|vertragslaufzeit|tarif/, 3], [/mobilfunk|internet|dsl|glasfaser|streaming/, 2]]],
  ["vers", "dk_vers", "shield", [], "", [[/versicherungsschein|versicherungsnummer|police/, 5], [/haftpflicht|hausrat|kfz-versicherung|berufsunfähigkeit|rechtsschutz/, 4], [/beitragsrechnung|versicherungsbeitrag/, 3]]],
  ["arzt", "dk_arzt", "health", [], "beleg", [[/privatrechnung|privatliquidation|\bgoä\b|\bgoz\b/, 7], [/apotheke|zuzahlung|rezept/, 4], [/diagnose|behandlung|arztpraxis|zahnarzt/, 3]]],
  ["rundfunk", "dk_rundfunk", "tv", [], "", [[/rundfunkbeitrag|beitragsservice/, 9]]],
  ["schule", "dk_schule", "book", ["edu"], "", [[/schulbescheinigung|immatrikulationsbescheinigung|studienbescheinigung/, 9], [/semesterbeitrag|rückmeldung/, 5], [/ausbildungsvertrag|berufsschule/, 4]]],
  ["ksk", "dk_ksk", "doccheck", ["job"], "", [[/künstlersozialkasse/, 9], [/künstlersozialversicherung/, 6]]],
  ["avertrag", "dk_avertrag", "case", ["job", "edu"], "", [[/arbeitsvertrag/, 9], [/arbeitgeber|arbeitnehmer/, 2], [/probezeit|wöchentliche arbeitszeit|urlaubsanspruch/, 3]]],
  ["amt", "dk_amt", "mail", ["staat"], "br", [[/rechtsbehelfsbelehrung|widerspruch/, 4], [/bescheid\b/, 3], [/aktenzeichen|geschäftszeichen|kundennummer bei/, 2], [/landratsamt|bürgeramt|sozialamt|ordnungsamt|stadtverwaltung|rathaus|behörde/, 4]]],
  ["sonst", "dk_sonst", "doc", [], "", []],
];
const DOK = (id) => DOK_ARTEN.find((a) => a[0] === id) || DOK_ARTEN[DOK_ARTEN.length - 1];
/* Die Weiterleitung muss zur Situation passen: eigene Rechnungen nur bei Selbstständigen */
const dokRoute = (id) => {
  const r = DOK(id)[4];
  if (r === "rch" && !hasSelf()) return "";
  return r;
};
const dokList = () => (store.settings.docs = store.settings.docs || []);
const DOKU = { batch: null, open: null };

function dokText(lines) {
  return (lines || [])
    .map((l) => (typeof l === "string" ? l : (l && (l.text || l.t)) || ""))
    .join("\n");
}

/* Datum aus Textstellen wie 12.03.2025, 12.3.25 oder „12. März 2025“ */
const DOK_MON = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
function dokDates(t) {
  const out = [];
  for (const m of t.matchAll(/\b(\d{1,2})\.\s?(\d{1,2})\.\s?((?:19|20)?\d\d)\b/g)) {
    let y = +m[3];
    if (y < 100) y += 2000;
    const mo = +m[2],
      d = +m[1];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1990 && y <= 2100) out.push({ iso: `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`, at: m.index });
  }
  for (const m of t.matchAll(/\b(\d{1,2})\.?\s+(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s+((?:19|20)\d\d)\b/g)) {
    const mo = DOK_MON.indexOf(m[2]) + 1;
    out.push({ iso: `${m[3]}-${String(mo).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`, at: m.index });
  }
  return out.sort((a, b) => a.at - b.at);
}

/* Zu welchem Jahr gehört das Dokument? Je Art die Stelle, die das Jahr wirklich festlegt. */
function dokYear(kind, t, dates) {
  const yr = (re) => {
    const m = t.match(re);
    return m ? m[1] : "";
  };
  let y = "";
  if (kind === "stb" || kind === "lstb")
    y = yr(/(?:bescheid für|veranlagungszeitraum|kalenderjahr|für das jahr|bescheinigung für)\s*((?:19|20)\d\d)/) || yr(/\bfür\s+((?:19|20)\d\d)\b/);
  else if (["jc", "aa", "bafoeg", "wohngeld", "fam", "rente"].includes(kind))
    y = yr(/(?:bewilligungszeitraum|zeitraum|für die zeit|vom)\s*:?\s*\d{1,2}\.\d{1,2}\.((?:19|20)\d\d)/);
  else if (kind === "nk" || kind === "energie")
    y = yr(/abrechnungs(?:zeitraum|jahr)\s*:?\s*(?:\d{1,2}\.\d{1,2}\.)?((?:19|20)\d\d)/) || yr(/abrechnung\s+((?:19|20)\d\d)/);
  else if (kind === "lohn")
    y = yr(/(?:januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s+((?:19|20)\d\d)/) || yr(/abrechnungs(?:monat|zeitraum)\s*:?\s*\d{1,2}[./]((?:19|20)\d\d)/);
  if (y) return { year: y, sure: true };
  /* sonst: das Datum, das bei „Datum“ steht, oder das erste Datum oben auf der Seite */
  const lab = t.match(/(?:datum|ausgestellt am|stand|vom)\s*:?\s*(\d{1,2}\.\s?\d{1,2}\.\s?(?:19|20)?\d\d)/);
  if (lab) {
    const d = dokDates(lab[1])[0];
    if (d) return { year: d.iso.slice(0, 4), date: d.iso, sure: true };
  }
  if (dates.length) return { year: dates[0].iso.slice(0, 4), date: dates[0].iso, sure: dates.length > 0 };
  const any = t.match(/\b(20[0-4]\d)\b/);
  return { year: any ? any[1] : String(ui.ym || isoToday()).slice(0, 4), sure: false };
}

/* Art erkennen. Eigene Rechnung vs. Rechnung an mich: Steht mein Name oben als Absender, ist es meine. */
function dokClassify(lines) {
  const raw = dokText(lines),
    t = raw.toLowerCase(),
    top = t.slice(0, 600);
  const b = typeof rvBiz === "function" ? rvBiz() : {},
    mine = [b.name, b.owner, store.settings.name].filter((x) => x && x.length > 3).map((x) => x.toLowerCase());
  const score = {};
  for (const [id, , , , , rules] of DOK_ARTEN) {
    let s = 0;
    for (const [re, w] of rules) if (re.test(t)) s += w;
    score[id] = s;
  }
  const fromMe = mine.some((m) => top.includes(m));
  if (fromMe) score.erch = 0;
  else score.rch = 0;
  /* Kassenbons sind kurz – lange Dokumente mit „Summe“ sind fast nie ein Bon */
  if (t.length > 2500) score.bon = Math.max(0, score.bon - 4);
  /* ein Termin ist ein Brief vom Amt, aber genauer – ein Bescheid mit Leistung ist mehr als ein Brief */
  if (score.termin >= 7) score.amt = Math.max(0, score.amt - 3);
  const ranked = Object.entries(score)
    .filter(([id]) => id !== "sonst")
    .sort((a, c) => c[1] - a[1]);
  const [best, s1] = ranked[0] || ["sonst", 0],
    s2 = (ranked[1] || [0, 0])[1];
  const kind = s1 >= 5 ? best : "sonst",
    sure = s1 >= 6 && s1 - s2 >= 2;
  const dates = dokDates(t),
    Y = dokYear(kind, t, dates);
  /* Absender: erste kurze Zeile oben, die nicht ich bin */
  const L = raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && s.length < 60);
  const from = L.slice(0, 8).find((s) => !mine.some((m) => s.toLowerCase().includes(m)) && !/\d{5}|\d{1,2}\.\d{1,2}\.\d{2}|@|www\.|tel|fax|seite|datum|^den\b/i.test(s)) || "";
  const amt = (() => {
    const m = raw.match(/(?:gesamtbetrag|endbetrag|zu zahlen|auszahlungsbetrag|erstattung|nachzahlung|summe)[^\d-]{0,30}(-?\d{1,3}(?:\.\d{3})*,\d{2})/i);
    return m ? parseAmt(m[1]) : 0;
  })();
  return { kind, sure: sure && Y.sure, year: Y.year, date: Y.date || (dates[0] && dates[0].iso) || "", from, amt, score: s1 };
}

/* Arten in der Auswahl: zum Profil passende zuerst */
function dokKindsOrdered() {
  const w = (WORK.find((x) => x[0] === (store.settings.work || "beides")) || [])[3] || "job";
  return DOK_ARTEN.slice().sort((a, c) => (c[3].includes(w) ? 1 : 0) - (a[3].includes(w) ? 1 : 0));
}
const dokName = (id) => uiText(DOK(id)[1]);

/* ---------- Hochladen ---------- */
function dokPick() {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "application/pdf,image/*";
  inp.multiple = true;
  inp.onchange = () => {
    const fs = [...(inp.files || [])];
    if (fs.length) dokUpload(fs);
  };
  inp.click();
}
async function dokUpload(files) {
  const fs = [...files].slice(0, 40);
  DOKU.batch = { items: [], n: fs.length, i: 0, busy: true, open: null };
  dokOpen();
  for (const f of fs) {
    if (!DOKU.batch) return;
    DOKU.batch.i++;
    dokRender();
    let R = { lines: [], img: null, pages: 0 };
    try {
      R = await readPages([f]);
    } catch (_) {}
    let lines = R.lines || [];
    if (!dokText(lines).trim() && window.HB_OCRTXT) lines = String(window.HB_OCRTXT).split("\n");
    const c = dokClassify(lines);
    if (!DOKU.batch) return;
    DOKU.batch.items.push({ f, img: R.img, pages: R.pages || 1, ...c });
  }
  if (!DOKU.batch) return;
  DOKU.batch.busy = false;
  dokRender(true);
}
async function dokSaveBatch(routeOne) {
  const B = DOKU.batch;
  if (!B) return;
  const keep = B.items.filter((it) => !it.skip);
  let n = 0;
  for (const it of keep) {
    const id = "d" + Date.now().toString(36) + (n++).toString(36);
    if (it.img)
      try {
        await rcptPut("doc-" + id, it.img);
      } catch (_) {}
    dokList().push({
      id,
      kind: it.kind,
      year: it.year,
      date: it.date || "",
      from: it.from || "",
      amt: it.amt || 0,
      name: it.f.name || "",
      pages: it.pages || 1,
      img: it.img ? 1 : 0,
      added: isoToday(),
    });
  }
  await saveSettings();
  const ys = [...new Set(keep.map((it) => it.year))].sort();
  DOKU.batch = null;
  if (ys.length && !ys.includes(String(ui.ym || "").slice(0, 4))) ui.ym = ys[ys.length - 1] + "-12";
  toast(uiText(keep.length === 1 ? "dk_saved1" : "dk_saved", { n: String(keep.length) }));
  SND.play("done");
  if (routeOne && keep.length === 1 && dokRoute(keep[0].kind)) {
    const r = dokRoute(keep[0].kind);
    let f = keep[0].f;
    /* Bon und Ausgabe lesen nur Bilder – aus einem PDF nehmen wir das Seitenbild */
    if ((r === "bon" || r === "beleg") && isPdfF(f) && keep[0].img) f = await dokImgFile(keep[0].img, f.name);
    hbSheetClose("dokBg");
    return inbRun(r, f, 0, 1);
  }
  dokRender(true);
  try {
    render();
  } catch (_) {}
}

/* ---------- Ansicht ---------- */
function dokOpen() {
  hbSheet("dokBg", uiText("dk_h", { y: String(ui.ym || isoToday()).slice(0, 4) }));
  dokRender(true);
}
function dokRender(fresh) {
  const bg = $("dokBg");
  if (!bg || bg.hidden) return;
  const Y = String(ui.ym || isoToday()).slice(0, 4),
    b = bg.querySelector(".hobody"),
    E = escHtml;
  bg.querySelector(".hbst").textContent = uiText("dk_h", { y: Y });
  const B = DOKU.batch;
  if (B && B.busy) {
    b.innerHTML = `<div class="bsscan"><div class="stbpdf">${svgIcon("doc", 70)}</div><i class="bsbeam"></i><span class="bscorner"></span></div><p class="bsstat"><span class="dots3"><i></i><i></i><i></i></span> ${E(
      uiText("dk_reading", { i: String(B.i), n: String(B.n) })
    )}</p>`;
    return;
  }
  if (B) {
    b.innerHTML = dokBatchHtml();
    if (fresh) b.scrollTop = b.parentElement.scrollTop = 0;
    return;
  }
  const mine = dokList().filter((d) => d.year === Y);
  const groups = DOK_ARTEN.map((a) => [a, mine.filter((d) => d.kind === a[0]).sort((x, z) => (z.date || "").localeCompare(x.date || ""))]).filter(
    ([, l]) => l.length
  );
  b.innerHTML = `<button type="button" class="dkup" data-dkpick><span class="dkupi">${svgIcon("docin", 22)}</span><span><b>${E(uiText("dk_up"))}</b><small>${E(uiText("dk_up_s"))}</small></span></button>
    ${
      groups.length
        ? groups
            .map(
              ([a, l]) =>
                `<div class="dkgrp ${DOKU.open === a[0] ? "open" : ""}"><button type="button" class="dkgh" data-dkgrp="${a[0]}" aria-expanded="${DOKU.open === a[0]}"><span class="dkic">${svgIcon(a[2], 20)}</span><b>${E(
                  uiText(a[1])
                )}</b><span class="dkn">${l.length}</span>${svgIcon(DOKU.open === a[0] ? "up" : "down", 18)}</button>${
                  DOKU.open === a[0]
                    ? `<div class="dkl">${l
                        .map(
                          (d) =>
                            `<div class="dkrow"><button type="button" class="dkrv" data-dkview="${E(d.id)}"><span class="grow"><b>${E(d.from || d.name || uiText(a[1]))}</b><small>${E(
                              [d.date ? fxDate(d.date, { day: "numeric", month: "short", year: "numeric" }) : "", d.amt ? fmtEur(d.amt) : "", d.pages > 1 ? uiText("dk_pages", { n: String(d.pages) }) : ""]
                                .filter(Boolean)
                                .join(" · ")
                            )}</small></span></button>${
                              dokRoute(d.kind) && d.kind !== "konto" && d.img
                                ? `<button type="button" class="btn sm" data-dkuse="${E(d.id)}">${E(uiText("dk_use_" + dokRoute(d.kind)))}</button>`
                                : ""
                            }<button type="button" class="iconbtn" data-dkdel="${E(d.id)}" aria-label="${E(uiText("dk_del"))}">${svgIcon("trash", 16)}</button></div>`
                        )
                        .join("")}</div>`
                    : ""
                }</div>`
            )
            .join("")
        : `<p class="small muted dkempty">${E(uiText(dokList().length ? "dk_none_y" : "dk_none", { y: Y }))}</p>`
    }`;
  if (fresh) b.scrollTop = b.parentElement.scrollTop = 0;
  if (fresh && !reducedMotion()) try {
    stbAnim(b, ".dkup,.dkgrp");
  } catch (_) {}
}
function dokBatchHtml() {
  const B = DOKU.batch,
    E = escHtml,
    keep = B.items.filter((it) => !it.skip).length;
  const row = (it, k) => {
    const a = DOK(it.kind),
      open = B.open === k,
      q = !it.sure && !it.ok;
    const sub = q
      ? uiText(it.kind === "sonst" ? "dk_q_kind" : "dk_q_check")
      : [it.from, it.date ? fxDate(it.date, { day: "numeric", month: "short", year: "numeric" }) : "", it.amt ? fmtEur(it.amt) : ""].filter(Boolean).join(" · ");
    return `<div class="dkbr ${q ? "q" : ""} ${it.skip ? "skip" : ""} ${open ? "open" : ""}"><button type="button" class="dkbh" data-dkbopen="${k}" aria-expanded="${open}"><span class="dkic">${svgIcon(q ? "alert" : a[2], 18)}</span><span class="grow"><b>${E(
      uiText(a[1])
    )}</b><small>${E(sub || it.f.name)}</small></span><span class="dkyr">${E(it.year)}</span></button>${
      open
        ? `<div class="dkbe"><label class="hlf"><span>${E(uiText("dk_kind"))}</span><select class="in" id="dkK">${dokKindsOrdered()
            .map((x) => `<option value="${x[0]}" ${x[0] === it.kind ? "selected" : ""}>${E(uiText(x[1]))}</option>`)
            .join("")}</select></label><label class="hlf"><span>${E(uiText("dk_year"))}</span><input class="in" id="dkY" inputmode="numeric" maxlength="4" value="${E(it.year)}"></label><div class="rbedb"><button type="button" class="btn" data-dkbskip="${k}">${E(
            uiText(it.skip ? "rb_unskip" : "rb_skip")
          )}</button><button type="button" class="btn primary" data-dkbok="${k}">${E(uiText("rb_ok"))}</button></div></div>`
        : ""
    }</div>`;
  };
  const one = B.items.length === 1 && B.items[0],
    r1 = one && dokRoute(one.kind);
  return `${
    one
      ? `<div class="dksay">${mamiAvatar()}<span><b>${E(uiText(one.kind === "sonst" ? "dk_say_q" : "dk_say", { k: dokName(one.kind), y: one.year }))}</b><small>${E(
          [one.from, one.amt ? fmtEur(one.amt) : ""].filter(Boolean).join(" · ")
        )}</small></span></div>`
      : `<div class="rbsum"><small>${E(uiText("dk_found_s"))}</small><b>${E(uiText("dk_found", { n: String(B.items.length) }))}</b></div>`
  }
    <div class="dkbl">${B.items.map(row).join("")}</div>
    <div class="vabtns"><button type="button" class="btn" data-dkbcancel>${E(uiText("tm_cancel"))}</button>${
      r1 ? `<button type="button" class="btn" data-dkbsave>${E(uiText("dk_file"))}</button><button type="button" class="btn primary" data-dkbroute>${E(uiText("dk_use_" + r1))}</button>` : `<button type="button" class="btn primary" data-dkbsave ${keep ? "" : "disabled"}>${E(uiText(keep === 1 ? "dk_file" : "dk_file_n", { n: String(keep) }))}</button>`
    }</div>`;
}

async function dokImgFile(img, name) {
  const bl = await (await fetch(img)).blob();
  return new File([bl], (name || "dokument").replace(/\.pdf$/i, "") + ".jpg", { type: bl.type || "image/jpeg" });
}
async function dokFileFrom(d) {
  const img = await rcptGet("doc-" + d.id);
  return img ? dokImgFile(img, d.name) : null;
}

document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("[data-dkopen]")) {
    DOKU.open = null;
    dokOpen();
    return;
  }
  if (!t.closest("#dokBg")) return;
  if (t.closest("[data-dkpick]")) return dokPick();
  const g = t.closest("[data-dkgrp]");
  if (g) {
    DOKU.open = DOKU.open === g.dataset.dkgrp ? null : g.dataset.dkgrp;
    return dokRender();
  }
  const v = t.closest("[data-dkview]");
  if (v) {
    const img = await rcptGet("doc-" + v.dataset.dkview);
    if (img) tmShow(img);
    else toast(uiText("dk_noimg"));
    return;
  }
  const u = t.closest("[data-dkuse]");
  if (u) {
    const d = dokList().find((x) => x.id === u.dataset.dkuse),
      f = d && (await dokFileFrom(d));
    if (!f) return toast(uiText("dk_noimg"));
    hbSheetClose("dokBg");
    return inbRun(dokRoute(d.kind), f, 0, 1);
  }
  const del = t.closest("[data-dkdel]");
  if (del) {
    const id = del.dataset.dkdel,
      L = dokList(),
      i = L.findIndex((x) => x.id === id);
    if (i < 0) return;
    const [gone] = L.splice(i, 1);
    await saveSettings();
    dokRender();
    let undone = false;
    toast(uiText("dk_deleted"), async () => {
      undone = true;
      L.splice(i, 0, gone);
      await saveSettings();
      dokRender();
    });
    setTimeout(() => {
      if (!undone && !dokList().some((x) => x.id === id)) rcptDel("doc-" + id).catch(() => {});
    }, 6000);
    return;
  }
  const B = DOKU.batch;
  if (!B) return;
  const bo = t.closest("[data-dkbopen]");
  if (bo) {
    const k = Number(bo.dataset.dkbopen);
    B.open = B.open === k ? null : k;
    return dokRender();
  }
  const ok = t.closest("[data-dkbok]");
  if (ok) {
    const it = B.items[Number(ok.dataset.dkbok)];
    it.kind = $("dkK").value;
    const y = ($("dkY").value || "").trim();
    if (/^(19|20)\d\d$/.test(y)) it.year = y;
    it.ok = true;
    it.skip = false;
    B.open = null;
    return dokRender();
  }
  const sk = t.closest("[data-dkbskip]");
  if (sk) {
    const it = B.items[Number(sk.dataset.dkbskip)];
    it.skip = !it.skip;
    B.open = null;
    return dokRender();
  }
  if (t.closest("[data-dkbcancel]")) {
    DOKU.batch = null;
    return dokRender();
  }
  if (t.closest("[data-dkbsave]")) return dokSaveBatch(false);
  if (t.closest("[data-dkbroute]")) return dokSaveBatch(true);
});

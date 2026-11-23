/* DATEV-Export: Buchungsstapel (EXTF 700, Formatversion 13) und ZIP mit allen Belegen für den Steuerberater */
const DV = { m: "q", y: 0, i: 0 };

/* Standardkonten SKR 03 / SKR 04 – Erlöskonten sind Automatikkonten, also ohne BU-Schlüssel */
const DV_BASE = {
  "#bank": [1200, 1800],
  "#e19": [8400, 4400],
  "#e7": [8300, 4300],
  "#e0": [8100, 4100],
  "#ek": [8195, 4185],
};
const DV_EXP = [
  [/büro|material|papier|toner|schreibwar/i, 4930, 6815],
  [/telefon|handy|mobilfunk|internet|dsl|festnetz/i, 4920, 6805],
  [/porto|versand|briefmark|post\b/i, 4910, 6800],
  [/software|lizenz|cloud|hosting|domain|adobe|abo\b|saas|edv/i, 4806, 6495],
  [/werbung|marketing|anzeige|flyer|social ads/i, 4600, 6600],
  [/reise|hotel|bahn|flug|übernacht|taxi/i, 4670, 6650],
  [/bewirtung|restaurant|essen mit/i, 4650, 6640],
  [/versicherung|haftpflicht/i, 4360, 6400],
  [/miete|raumkosten|büroraum|cowork/i, 4210, 6310],
  [/kfz|auto|fahrzeug|tank|benzin|diesel|sprit|laden|ladesäule|werkstatt/i, 4530, 6530],
  [/steuerberat|rechtsanwalt|buchhaltung|beratung/i, 4950, 6825],
  [/fortbildung|seminar|kurs|weiterbildung|schulung/i, 4945, 6821],
  [/fachliteratur|buch|bücher|zeitschrift|zeitung/i, 4940, 6820],
  [/bank|kontoführung|gebühr|paypal|stripe/i, 4970, 6855],
  [/fremdleistung|freelancer|subunternehm/i, 3100, 5900],
  [/computer|laptop|hardware|monitor|kamera|technik|gerät/i, 4855, 6262],
];
const DV_EXP_DEF = [4900, 6300];

function dvCfg() {
  const s = (store.settings.datev = store.settings.datev || {});
  if (!s.skr) s.skr = "03";
  if (!s.map) s.map = {};
  return s;
}
const dvSkr = () => (dvCfg().skr === "04" ? 1 : 0);
function dvAcc(key) {
  const m = dvCfg().map[key];
  if (m) return Number(m);
  if (DV_BASE[key]) return DV_BASE[key][dvSkr()];
  const hit = DV_EXP.find((x) => x[0].test(key));
  return (hit ? hit.slice(1) : DV_EXP_DEF)[dvSkr()];
}
const DV_BU = { 19: "9", 7: "8" };

/* Zeitraum */
function dvInit() {
  if (DV.y) return;
  const d = new Date();
  DV.y = d.getFullYear();
  DV.i = Math.floor(d.getMonth() / 3) - 1;
  if (DV.i < 0) {
    DV.i = 3;
    DV.y--;
  }
}
function dvRange() {
  const y = DV.y,
    last = (m) => new Date(y, m + 1, 0).getDate();
  if (DV.m === "y") return [`${y}-01-01`, `${y}-12-31`];
  const a = DV.m === "q" ? DV.i * 3 : DV.i,
    b = DV.m === "q" ? a + 2 : a;
  return [`${y}-${pad(a + 1)}-01`, `${y}-${pad(b + 1)}-${pad(last(b))}`];
}
function dvLabel() {
  const [f, t] = dvRange(),
    mon = (iso) => fxDate(iso, { month: "long" });
  if (DV.m === "y") return String(DV.y);
  if (DV.m === "m") return `${mon(f)} ${DV.y}`;
  return `${mon(f)} – ${mon(t)} ${DV.y}`;
}
function dvShift(n) {
  const per = DV.m === "q" ? 4 : DV.m === "m" ? 12 : 1;
  if (DV.m === "y") DV.y += n;
  else {
    DV.i += n;
    while (DV.i < 0) {
      DV.i += per;
      DV.y--;
    }
    while (DV.i >= per) {
      DV.i -= per;
      DV.y++;
    }
  }
}

/* Alle betrieblichen Buchungen des Zeitraums */
function dvRows() {
  const [from, to] = dvRange(),
    inP = (d) => d && d >= from && d <= to,
    def = Number(store.settings.vatRate) || 19,
    klein = !!store.settings.kleinunternehmer,
    R = [];
  const short = (id) => String(id || "").slice(-6).toUpperCase();
  const add = (o) => {
    if (!(Math.abs(o.amt) >= 0.005)) return;
    if (o.amt < 0) {
      o.amt = -o.amt;
      o.sh = o.sh === "S" ? "H" : "S";
    }
    R.push(o);
  };
  /* Bruttobetrag auf Steuersätze aufteilen */
  const split = (gross, parts) => {
    const tot = parts.reduce((s, p) => s + Math.abs(p.g), 0);
    let rest = gross;
    return parts.map((p, k) => {
      const v = k === parts.length - 1 ? round2(rest) : round2((gross * Math.abs(p.g)) / tot);
      rest -= v;
      return [p.r, v];
    });
  };
  const inv = new Map();
  for (const i of rchList()) {
    if (!i.doc) continue;
    if (i.paidTx) inv.set(i.paidTx, i);
    for (const p of i.parts || []) if (p.tx) inv.set(p.tx, i);
  }
  for (const t of store.tx) {
    if (!inP(t.date) || t.kind !== "einnahme" || incArt(t.cat) !== "selbst") continue;
    const i = inv.get(t.id),
      G = i ? rvSum(i.doc).groups.filter((g) => g.net) : [],
      parts = klein ? [{ r: "k", g: 1 }] : G.length ? G.map((g) => ({ r: g.rate, g: g.net + g.vat })) : [{ r: def, g: 1 }];
    for (const [r, v] of split(round2(Number(t.amount) || 0), parts))
      add({
        amt: v,
        sh: "S",
        konto: dvAcc("#bank"),
        gegen: dvAcc(r === "k" ? "#ek" : r === 19 ? "#e19" : r === 7 ? "#e7" : "#e0"),
        bu: "",
        date: t.date,
        bf: i ? i.nr : "E-" + short(t.id),
        text: (i ? i.kunde : txPayee(t) || t.cat) || "",
        file: i ? { inv: i.id } : hasReceipt(t.id) ? { rc: t.id } : null,
        tx: t.id,
        typ: "in",
      });
  }
  const erTx = new Set();
  for (const i of erList()) {
    if (i.tx) erTx.add(i.tx);
    if (!inP(i.paid) || i.typ === "g") continue;
    const gross = round2(Number(i.pay) || 0),
      vat = round2(Number(i.vat) || 0),
      net = round2(gross - vat),
      near = (r) => Math.abs(net * (r / 100) - vat) <= 0.02 + net * 0.0005;
    let parts;
    if (klein || vat === 0) parts = [{ r: 0, g: 1 }];
    else if (near(19)) parts = [{ r: 19, g: 1 }];
    else if (near(7)) parts = [{ r: 7, g: 1 }];
    else {
      const x = (vat - 0.07 * net) / 0.12;
      parts = x > 0 && x < net ? [{ r: 19, g: x * 1.19 }, { r: 7, g: (net - x) * 1.07 }] : [{ r: 19, g: 1 }];
    }
    const key = i.cat || i.from || "";
    for (const [r, v] of split(gross, parts))
      add({
        amt: v,
        sh: "S",
        konto: dvAcc(key),
        gegen: dvAcc("#bank"),
        bu: klein ? "" : DV_BU[r] || "",
        date: i.paid,
        bf: i.nr || "ER-" + short(i.id),
        text: i.from || "",
        file: { rc: "er-" + i.id },
        typ: "out",
        cat: key,
      });
  }
  for (const t of store.tx) {
    if (!inP(t.date) || t.kind !== "betrieb" || erTx.has(t.id)) continue;
    const r = klein ? 0 : t.vr != null ? Number(t.vr) : ustGuessRate(t.cat + " " + (t.note || ""));
    add({
      amt: round2(Number(t.amount) || 0),
      sh: "S",
      konto: dvAcc(t.cat || ""),
      gegen: dvAcc("#bank"),
      bu: DV_BU[r] || "",
      date: t.date,
      bf: "B-" + short(t.id),
      text: txPayee(t) || t.cat || "",
      file: hasReceipt(t.id) ? { rc: t.id } : null,
      tx: t.id,
      typ: "out",
      cat: t.cat || "",
    });
  }
  const ymF = from.slice(0, 7),
    ymT = to.slice(0, 7);
  for (const ym of Object.keys(store.months || {})) {
    if (ym < ymF || ym > ymT) continue;
    for (const [fid, amt] of Object.entries(store.months[ym].paid || {})) {
      const f = store.fixed.find((x) => x.id === fid);
      if (!f || f.kind !== "betrieb") continue;
      const r = klein ? 0 : f.vr != null ? Number(f.vr) : ustGuessRate(f.name + " " + (f.cat || "")),
        key = f.cat || f.name || "";
      add({
        amt: round2(Number(amt) || 0),
        sh: "S",
        konto: dvAcc(key),
        gegen: dvAcc("#bank"),
        bu: DV_BU[r] || "",
        date: `${ym}-${pad(payDay(f, ym) || 1)}`,
        bf: "F-" + ym.replace("-", "") + "-" + short(f.id),
        text: f.name || "",
        file: null,
        typ: "out",
        cat: key,
        fixed: 1,
      });
    }
  }
  return R.sort((a, b) => a.date.localeCompare(b.date));
}

/* Datei im DATEV-Format – Zeichensatz ISO-8859-1, Zeilenende CRLF */
const DV_COLS =
  "Umsatz (ohne Soll/Haben-Kz)|Soll/Haben-Kennzeichen|WKZ Umsatz|Kurs|Basisumsatz|WKZ Basisumsatz|Konto|Gegenkonto (ohne BU-Schlüssel)|BU-Schlüssel|Belegdatum|Belegfeld 1|Belegfeld 2|Skonto|Buchungstext|Postensperre|Diverse Adressnummer|Geschäftspartnerbank|Sachverhalt|Zinssperre|Beleglink|Beleginfo - Art 1|Beleginfo - Inhalt 1|Beleginfo - Art 2|Beleginfo - Inhalt 2|Beleginfo - Art 3|Beleginfo - Inhalt 3|Beleginfo - Art 4|Beleginfo - Inhalt 4|Beleginfo - Art 5|Beleginfo - Inhalt 5|Beleginfo - Art 6|Beleginfo - Inhalt 6|Beleginfo - Art 7|Beleginfo - Inhalt 7|Beleginfo - Art 8|Beleginfo - Inhalt 8|KOST1 - Kostenstelle|KOST2 - Kostenstelle|Kost-Menge|EU-Land u. UStID (Bestimmung)|EU-Steuersatz (Bestimmung)|Abw. Versteuerungsart|Sachverhalt L+L|Funktionsergänzung L+L|BU 49 Hauptfunktionstyp|BU 49 Hauptfunktionsnummer|BU 49 Funktionsergänzung|" +
  Array.from({ length: 20 }, (_, k) => `Zusatzinformation - Art ${k + 1}|Zusatzinformation- Inhalt ${k + 1}`).join("|") +
  "|Stück|Gewicht|Zahlweise|Forderungsart|Veranlagungsjahr|Zugeordnete Fälligkeit|Skontotyp|Auftragsnummer|Buchungstyp|USt-Schlüssel (Anzahlungen)|EU-Mitgliedstaat (Anzahlungen)|Sachverhalt L+L (Anzahlungen)|EU-Steuersatz (Anzahlungen)|Erlöskonto (Anzahlungen)|Herkunft-Kz|Leerfeld|KOST-Datum|SEPA-Mandatsreferenz|Skontosperre|Gesellschaftername|Beteiligtennummer|Identifikationsnummer|Zeichnernummer|Postensperre bis|Bezeichnung SoBil-Sachverhalt|Kennzeichen SoBil-Buchung|Festschreibung|Leistungsdatum|Datum Zuord. Steuerperiode|Fälligkeit|Generalumkehr (GU)|Steuersatz|Land|Abrechnungsreferenz|BVV-Position|EU-Land u. UStID (Ursprung)|EU-Steuersatz (Ursprung)|Abw. Skontokonto";

function dvLatin(s) {
  s = String(s ?? "")
    .replace(/€/g, "EUR")
    .replace(/[–—]/g, "-")
    .replace(/[„“”]/g, '"')
    .replace(/[‚‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[\r\n\t]+/g, " ");
  return [...s].map((c) => (c.charCodeAt(0) < 256 ? c : "?")).join("");
}
const dvQ = (s, max) => '"' + dvLatin(s).slice(0, max || 999).replace(/"/g, '""') + '"';
const dvNum = (v) => round2(v).toFixed(2).replace(".", ",");
const dvYmd = (iso) => iso.replace(/-/g, "");

function dvCsv(rows) {
  const c = dvCfg(),
    [from, to] = dvRange(),
    now = new Date(),
    stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}000`,
    head = [
      '"EXTF"', 700, 21, '"Buchungsstapel"', 13, stamp, "", '"FM"', '"Finanz MAMI"', '""',
      Number(c.berater), Number(c.mandant), `${DV.y}0101`, 4, dvYmd(from), dvYmd(to),
      dvQ("Finanz MAMI " + dvLabel(), 30), '""', 1, 0, 0, '"EUR"', "", '""', "", "",
      `"${c.skr === "04" ? "04" : "03"}"`, "", "", '""', '""',
    ],
    cols = DV_COLS.split("|");
  const lines = [head.join(";"), cols.map((x) => dvQ(x)).join(";")];
  for (const r of rows) {
    const f = new Array(cols.length).fill("");
    f[0] = dvNum(r.amt);
    f[1] = `"${r.sh}"`;
    f[2] = '"EUR"';
    f[6] = String(r.konto);
    f[7] = String(r.gegen);
    f[8] = r.bu ? `"${r.bu}"` : "";
    f[9] = r.date.slice(8, 10) + r.date.slice(5, 7);
    f[10] = dvQ(r.bf, 36);
    f[13] = dvQ(r.text, 60);
    f[113] = "0";
    lines.push(f.join(";"));
  }
  const s = lines.join("\r\n") + "\r\n",
    b = new Uint8Array(s.length);
  for (let k = 0; k < s.length; k++) b[k] = s.charCodeAt(k);
  return b;
}
const dvFileBase = () => {
  const [f, t] = dvRange();
  return `${dvYmd(f)}_${dvYmd(t)}`;
};

/* Belege einsammeln – Dateiname = Belegnummer, so findet der Steuerberater jeden Beleg */
async function dvFiles(rows) {
  const out = [],
    seen = new Set(),
    safe = (s) => dvLatin(s).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").slice(0, 60);
  for (const r of rows) {
    if (!r.file || seen.has(r.bf)) continue;
    seen.add(r.bf);
    try {
      if (r.file.inv) {
        const i = rchList().find((x) => x.id === r.file.inv);
        if (!i || !i.doc) continue;
        out.push({ name: `Belege/${safe(r.bf)}.pdf`, data: new Uint8Array(await rvPdf(i.doc).arrayBuffer()) });
      } else {
        const u = await rcptGet(r.file.rc);
        if (!u) continue;
        const mime = (String(u).match(/^data:([^;,]+)/) || [])[1] || "image/jpeg",
          ext = /pdf/.test(mime) ? "pdf" : /xml/.test(mime) ? "xml" : /png/.test(mime) ? "png" : "jpg";
        out.push({ name: `Belege/${safe(r.bf)}_${safe(r.text).slice(0, 30)}.${ext}`, data: b64bytes(u) });
      }
    } catch (_) {}
  }
  return out;
}

function dvNrOk() {
  const c = dvCfg(),
    b = Number(c.berater),
    m = Number(c.mandant);
  return /^\d+$/.test(String(c.berater || "")) && b >= 1001 && b <= 9999999 && /^\d+$/.test(String(c.mandant || "")) && m >= 1 && m <= 99999;
}
function dvReadInputs(b) {
  const c = dvCfg(),
    v = (id) => (b.querySelector("#" + id) || {}).value;
  if (v("dvBer") != null) c.berater = String(v("dvBer")).replace(/\D/g, "");
  if (v("dvMan") != null) c.mandant = String(v("dvMan")).replace(/\D/g, "");
  b.querySelectorAll("[data-dvacc]").forEach((e) => {
    const k = e.dataset.dvacc,
      n = String(e.value).replace(/\D/g, "");
    const auto = DV_BASE[k] ? DV_BASE[k][dvSkr()] : (DV_EXP.find((x) => x[0].test(k)) || [0, ...DV_EXP_DEF]).slice(1)[dvSkr()];
    if (n && Number(n) !== auto) c.map[k] = n;
    else delete c.map[k];
  });
}

async function dvExport(zip, btn) {
  const b = $("dvBg") && $("dvBg").querySelector(".hobody");
  if (b) dvReadInputs(b);
  if (!dvNrOk()) {
    toast(uiText("dv_bad_nr"));
    const e = b && b.querySelector(dvCfg().berater ? "#dvMan" : "#dvBer");
    if (e) e.focus();
    return;
  }
  await saveSettings();
  const rows = dvRows();
  if (!rows.length) {
    toast(uiText("dv_empty"));
    return;
  }
  if (btn) btn.disabled = true;
  try {
    const csv = dvCsv(rows),
      name = `EXTF_Buchungsstapel_${dvFileBase()}.csv`;
    if (!zip) {
      await saveBinary(name, new Blob([csv], { type: "text/csv" }), uiText("dv_saved_csv"));
    } else {
      const files = await dvFiles(rows);
      await saveBinary(
        `DATEV_${dvFileBase()}.zip`,
        makeZip([{ name, data: csv }, ...files]),
        uiText("dv_saved_zip", { n: String(files.length) })
      );
    }
    SND.play("done");
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* Fenster */
function dvOpen() {
  dvInit();
  const c = dvCfg(),
    rows = dvRows(),
    inc = rows.filter((r) => r.typ === "in"),
    exp = rows.filter((r) => r.typ === "out"),
    sum = (L) => L.reduce((s, r) => s + (r.sh === "S" ? r.amt : -r.amt), 0),
    miss = rows.filter((r) => !r.file && !r.fixed),
    withF = rows.filter((r) => r.file).length,
    need = rows.filter((r) => !r.fixed).length,
    b = hbSheet("dvBg", uiText("dv_h")),
    seg = (k, t) => `<button type="button" class="${DV.m === k ? "on" : ""}" data-dvm="${k}">${escHtml(uiText(t))}</button>`,
    skr = (k) => `<button type="button" class="${c.skr === k ? "on" : ""}" data-dvskr="${k}">SKR ${k}</button>`;
  const cats = [...new Set(exp.map((r) => r.cat).filter((x) => x != null))],
    accRow = (k, label) =>
      `<label class="dvacc"><span data-noi18n>${escHtml(label)}</span><input class="in" inputmode="numeric" maxlength="8" data-dvacc="${escHtml(k)}" value="${escHtml(String(dvAcc(k)))}"></label>`;
  b.innerHTML = `<div class="erseg">${seg("m", "dv_m")}${seg("q", "dv_q")}${seg("y", "dv_y")}</div>
    <div class="dvper"><button type="button" class="btn sm ghost" data-dvsh="-1" aria-label="${escHtml(uiText("dv_prev"))}">${svgIcon("right", 16)}</button><b>${escHtml(dvLabel())}</b><button type="button" class="btn sm ghost" data-dvsh="1" aria-label="${escHtml(uiText("dv_next"))}">${svgIcon("right", 16)}</button></div>
    <div class="ersum"><div><small>${escHtml(uiText("dv_in"))}</small><b>${inc.length} · ${escHtml(fmtEur0(sum(inc)))}</b></div><div><small>${escHtml(uiText("dv_out"))}</small><b>${exp.length} · ${escHtml(fmtEur0(sum(exp)))}</b></div></div>
    ${
      need
        ? `<div class="dvrc ${miss.length ? "due" : "ok"}">${svgIcon(miss.length ? "alert" : "check", 16)}<span>${escHtml(miss.length ? uiText("dv_rc", { a: String(withF), b: String(need) }) : uiText("dv_rc_all"))}</span></div>${
            miss.length
              ? `<div class="dvmiss">${miss
                  .slice(0, 4)
                  .map(
                    (r) =>
                      `<button type="button" class="dvmr" ${r.tx ? `data-dvtx="${escHtml(r.tx)}"` : ""}><span data-noi18n>${escHtml(r.text || r.bf)}</span><small>${escHtml(fxDate(r.date, { day: "numeric", month: "short" }))} · ${escHtml(fmtEur(r.amt))}</small></button>`
                  )
                  .join("")}${miss.length > 4 ? `<small class="rvhint">${escHtml(uiText("rq_more", { n: String(miss.length - 4) }))}</small>` : ""}<small class="rvhint">${escHtml(uiText("dv_miss"))}</small></div>`
              : ""
          }`
        : `<p class="small muted erempty">${escHtml(uiText("dv_empty"))}</p>`
    }
    <div class="rsf"><span>${escHtml(uiText("dv_skr"))}</span><div class="erseg">${skr("03")}${skr("04")}</div></div>
    <div class="dvnr"><label class="rsf"><span>${escHtml(uiText("dv_ber"))}</span><input class="in" id="dvBer" inputmode="numeric" maxlength="7" value="${escHtml(c.berater || "")}" placeholder="1234567"></label><label class="rsf"><span>${escHtml(uiText("dv_man"))}</span><input class="in" id="dvMan" inputmode="numeric" maxlength="5" value="${escHtml(c.mandant || "")}" placeholder="10001"></label></div>
    <small class="rvhint dvhint">${escHtml(uiText("dv_nr_s"))}</small>
    <details class="dvaccs"><summary>${escHtml(uiText("dv_acc"))}</summary><div class="dvaccl">${accRow("#bank", uiText("dv_bank"))}${
      store.settings.kleinunternehmer ? accRow("#ek", uiText("dv_inck")) : accRow("#e19", uiText("dv_inc19")) + accRow("#e7", uiText("dv_inc7"))
    }${cats.map((k) => accRow(k, k || uiText("dv_other"))).join("")}</div><small class="rvhint">${escHtml(uiText("dv_acc_s"))}</small></details>
    <p class="small muted dvinfo">${escHtml(uiText("dv_info"))}</p>
    <div class="rqbtn"><button type="button" class="btn" data-dvgo="csv">${escHtml(uiText("dv_csv"))}</button><button type="button" class="btn primary" data-dvgo="zip">${svgIcon("dl", 16)} ${escHtml(uiText("dv_zip"))}</button></div>`;
  if (!reducedMotion()) stbAnim(b, ".erseg,.dvper,.ersum>div,.dvrc,.dvmiss,.rsf,.dvnr,.dvaccs,.rqbtn");
}

document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("[data-dvopen]")) {
    dvOpen();
    return;
  }
  if (!t.closest("#dvBg")) return;
  const b = $("dvBg").querySelector(".hobody"),
    m = t.closest("[data-dvm]"),
    sh = t.closest("[data-dvsh]"),
    sk = t.closest("[data-dvskr]"),
    go = t.closest("[data-dvgo]"),
    tx = t.closest("[data-dvtx]");
  if (m || sh || sk) {
    dvReadInputs(b);
    if (m && DV.m !== m.dataset.dvm) {
      const [f] = dvRange();
      DV.m = m.dataset.dvm;
      DV.i = DV.m === "q" ? Math.floor((Number(f.slice(5, 7)) - 1) / 3) : DV.m === "m" ? Number(f.slice(5, 7)) - 1 : 0;
    }
    if (sh) dvShift(Number(sh.dataset.dvsh));
    if (sk) {
      dvCfg().skr = sk.dataset.dvskr;
      dvCfg().map = {};
    }
    await saveSettings();
    dvOpen();
    SND.play("tick");
  } else if (go) dvExport(go.dataset.dvgo === "zip", go);
  else if (tx) {
    const x = store.tx.find((y) => y.id === tx.dataset.dvtx);
    if (!x) return;
    dvReadInputs(b);
    await saveSettings();
    hbSheetClose("dvBg");
    setTimeout(() => openSheet(x.kind, x), 240);
  }
});

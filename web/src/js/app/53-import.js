/* CSV-Import */
const COLS = {
  date: [
    "booking date",
    "buchungsdatum",
    "buchungstag",
    "buchung",
    "date",
    "datum",
    "value date",
    "wertstellung",
    "wertstellungsdatum",
    "valutadatum",
    "wert",
  ],
  payee: [
    "partner name",
    "payee",
    "name des partners",
    "partnername",
    "name zahlungsbeteiligter",
    "zahlungsbeteiligter",
    "zahlungsempfänger*in",
    "zahlungsempfänger",
    "empfänger",
    "beguenstigter/zahlungspflichtiger",
    "begünstigter/zahlungspflichtiger",
    "begünstigter / auftraggeber",
    "begünstigter/auftraggeber",
    "auftraggeber/empfänger",
    "auftraggeber / empfänger",
    "name",
  ],
  payer: ["zahlungspflichtige*r", "zahlungspflichtiger", "zahlungspflichtige"],
  ref: [
    "payment reference",
    "verwendungszweck",
    "zahlungsreferenz",
    "reference",
    "referenz",
    "artikelbezeichnung",
    "betreff",
    "buchungstext",
    "hinweis",
  ],
  amount: ["amount (eur)", "betrag (eur)", "betrag (€)", "amount", "betrag", "umsatz in eur", "umsatz", "brutto"],
  type: [
    "type",
    "transaction type",
    "transaktionstyp",
    "umsatztyp",
    "umsatzart",
    "buchungsart",
    "vorgang",
    "typ",
    "art",
  ],
  account: [
    "account name",
    "kontoname",
    "konto name",
    "space",
    "bezeichnung auftragskonto",
    "auftragskonto",
    "iban kontoinhaber",
    "konto",
  ],
  status: ["status", "info"],
  sh: ["s/h", "soll/haben"],
  soll: ["soll"],
  haben: ["haben"],
};
const normText = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .trim();
function parseCSV(text) {
  text = text.replace(/^﻿/, "");
  const head = text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, 15);
  const fields = (l, d) => {
    let n = 1,
      q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === d && !q) n++;
    }
    return n;
  };
  const delim = [";", "\t", ","]
    .map((d, i) => {
      const cnt = {};
      for (const l of head) {
        const n = fields(l, d);
        if (n > 1) cnt[n] = (cnt[n] || 0) + 1;
      }
      const best = Object.entries(cnt).sort((x, y) => y[1] - x[1] || y[0] - x[0])[0];
      return [d, best ? best[1] : 0, best ? Number(best[0]) : 0, -i];
    })
    .sort((x, y) => y[1] - x[1] || y[2] - x[2] || y[3] - x[3])[0][0];
  const rows = [];
  let row = [],
    f = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += ch;
      continue;
    }
    if (ch === '"') q = true;
    else if (ch === delim) {
      row.push(f);
      f = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(f);
      f = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else f += ch;
  }
  row.push(f);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}
function findCol(headers, cands) {
  const h = headers.map(normText);
  for (const c of cands) {
    const i = h.indexOf(c);
    if (i >= 0) return i;
  }
  for (const c of cands) {
    const i = h.findIndex((x) => x.includes(c));
    if (i >= 0) return i;
  }
  return -1;
}
function parseDate(s) {
  s = String(s || "").trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + "-" + pad(m[2]) + "-" + pad(m[3]);
  if ((m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/))) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return y + "-" + pad(m[2]) + "-" + pad(m[1]);
  }
  return null;
}
function parseBankAmt(s) {
  s = String(s || "")
    .replace(/[€\s]|eur\b/gi, "")
    .replace(/^\+/, "")
    .replace(/^[−–]/, "-");
  if (/^[\d.,]+[-−]$/.test(s)) s = "-" + s.slice(0, -1);
  if (!s) return NaN;
  /* „2.350“ ist bei Euro-Beträgen immer Tausender (drei Nachkommastellen gibt es nicht) */
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  else s = s.replace(/,/g, "");
  const v = Number(s);
  return isFinite(v) ? v : NaN;
}
function hashKey(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return "k" + (h >>> 0).toString(36) + s.length.toString(36);
}
function knownKeys() {
  const k = new Set();
  for (const t of store.tx) {
    if (t.importKey) k.add(t.importKey);
    if (t.keys2) for (const x of t.keys2) k.add(x);
  }
  for (const m of Object.values(store.months)) {
    if (m.paidKeys) for (const v of Object.values(m.paidKeys)) k.add(v);
    if (m.importKeys) for (const v of m.importKeys) k.add(v);
  }
  return k;
}
const KW = [
  [/ratenzahlung|ratenkauf|teilzahlung|klarna|ratepay|paypal ratenzahlung/, "ausgabe", "raten"],
  [
    /\b(rewe|edeka|aldi|lidl|netto|penny|kaufland|rossmann|dm[- ]drogerie|dm fil|norma|globus|tegut|denns|alnatura|bäckerei|baeckerei)\b/,
    "ausgabe",
    "haushalt",
  ],
  [
    /\b(aral|shell|esso|jet|totalenergies|total|agip|avia|tankstelle|star tankst|parkhaus|parken|apcoa|easypark|contipark|park ?now|q-park)\b/,
    "ausgabe",
    "tank",
  ],
  [/\b(geldautomat|atm|bargeld|cash ?withdrawal|bargeldauszahlung|auszahlung)\b/, "ausgabe", "bargeld"],
  [
    /\b(kino|cinema|steam|playstation|xbox|restaurant|pizzeria|imbiss|döner|doener|gaststätte|trattoria|ristorante|lieferando|wolt|uber eats|mcdonald|burger king|kfc|subway|bar|cafe|café|eventim|ticketmaster)\b/,
    "ausgabe",
    "spaß",
  ],
];
const FIX_ALIAS = {
  ksk: ["künstlersozialkasse", "kuenstlersozialkasse", "ksk"],
  "amazon prime": ["amazon prime", "prime video", "amazon digital", "amzn digital"],
  "handy prepaid": ["prepaid", "aufladung"],
  "mobiles internet": ["datenvolumen", "mobile data"],
  bankgebühren: ["n26 kontoführung", "kontoführung", "n26 smart", "n26 you", "n26 metal", "n26 go"],
  studienkredit: ["kfw", "studienkredit", "bafög", "bafoeg"],
};
function catByWord(kind, word) {
  return cats(kind).find((c) => c.toLowerCase().includes(word)) || null;
}
function suggest(r) {
  const text = normText(r.payee + " " + r.ref + " " + r.type),
    payee = normText(r.payee);
  for (const rule of store.settings.rules || []) {
    if (r.amount > 0 && String(rule.target).startsWith("fix|")) continue;
    if (rule.match && (payee === rule.match || (rule.match.length >= 4 && text.includes(rule.match)))) {
      if (validTarget(rule.target))
        return {
          target: rule.target,
          sure: true,
          learned: true,
        };
    }
  }
  if (r.amount < 0) {
    const a = Math.abs(r.amount);
    for (const f of store.fixed) {
      const nm = f.name.toLowerCase();
      const words = FIX_ALIAS[nm] || [nm, ...(nm.split(" ")[0].length >= 5 ? [nm.split(" ")[0]] : [])];
      if (
        words.some((w) => w && text.includes(w)) &&
        f.amount > 0 &&
        Math.abs(a - f.amount) <= Math.max(1, f.amount * 0.15)
      )
        return {
          target: "fix|" + f.id,
          sure: true,
        };
    }
    if (/finanzamt|steuerverwaltung|bundeskasse/.test(text))
      return {
        target: "vz|",
        sure: false,
      };
    for (const [re, kind, word] of KW) {
      if (re.test(text)) {
        const c = catByWord(kind, word);
        if (c)
          return {
            target: kind + "|" + c,
            sure: true,
          };
      }
    }
    return {
      target: "ausgabe|" + (cats("ausgabe")[0] || ""),
      sure: false,
    };
  }
  if (
    /(^|\D)\d{2,4}\s?[\/\-]\s?20\d\d(\D|$)|(^|\D)\d{3} 20\d\d(\D|$)/.test(normText(r.ref)) &&
    !/\b(lohn|gehalt|rente|bezüge|bezuege|entgelt)\b/.test(text)
  ) {
    const c = incCats().find((c) => c.art === "selbst");
    if (c)
      return {
        target: "einnahme|" + c.name,
        sure: true,
      };
  }
  if (/\b(lohn|gehalt|bezüge|bezuege|entgelt|lohn\/gehalt)\b/.test(text)) {
    const c = incCats().find((c) => c.art === "lohn");
    if (c)
      return {
        target: "einnahme|" + c.name,
        sure: true,
      };
  }
  if (/bundesagentur|arbeitsagentur|agentur für arbeit|agentur fuer arbeit/.test(text)) {
    const c = incCats().find((c) => c.art === "lohnersatz");
    if (c)
      return {
        target: "einnahme|" + c.name,
        sure: true,
      };
  }
  if (/\bspaces?\b/.test(text))
    return {
      target: "skip|",
      sure: false,
    };
  if (
    /weihnachtsgeld|urlaubsgeld|13\.? ?(monats)?gehalt|14\.? ?(monats)?gehalt|sonderzahlung|einmalzahlung|jahressonderzahlung|inflationsausgleich|prämie|praemie|\bbonus\b|tantieme|gratifikation/.test(
      text
    )
  ) {
    const c = incCats().find((c) => c.art === "sonderzahlung");
    if (c)
      return {
        target: "einnahme|" + c.name,
        sure: true,
      };
  }
  if (/\b(lohn|gehalt|salary|entgelt|bezüge|bezuege)\b/.test(text)) {
    const c =
      incCats().find((c) => c.art === "lohn") ||
      incCats().find((c) => c.art !== "selbst" && c.art !== "lohnersatz" && c.art !== "sonderzahlung") ||
      incCats()[0];
    if (c)
      return {
        target: "einnahme|" + c.name,
        sure: !!incCats().find((c) => c.art === "lohn"),
      };
  }
  if (
    /erstattung|rückerstattung|rueckerstattung|refund|gutschrift|storno|rückbuchung|rueckbuchung|cashback|reward|ratenzahlung|equities|bitpanda|crypto|cash26|bareinzahlung|\bn26\b/.test(
      text
    )
  ) {
    const c = refundCat();
    if (c)
      return {
        target: "einnahme|" + c.name,
        sure: true,
      };
  }
  const other =
    incCats().find((c) => /sonstig/i.test(c.name)) || incCats().find((c) => c.art === "selbst") || incCats()[0];
  return other
    ? {
        target: "einnahme|" + other.name,
        sure: false,
      }
    : {
        target: "skip|",
        sure: false,
      };
}
function refundCat() {
  return incCats().find((c) => /erstatt/i.test(c.name)) || incCats().find((c) => /sonstig/i.test(c.name)) || null;
}
function validTarget(t) {
  const [k, v] = String(t || "").split("|");
  if (k === "skip" || k === "vz") return true;
  if (k === "fix") return store.fixed.some((f) => f.id === v);
  if (k === "einnahme") return incCats().some((c) => c.name === v);
  if (k === "ausgabe" || k === "betrieb") return cats(k).includes(v);
  return false;
}
function targetOptions(sel, positive, mg) {
  const o = (v, l) => `<option value="${escHtml(v)}" ${v === sel ? "selected" : ""}>${escHtml(l)}</option>`;
  const mo = mg
    ? `<optgroup label="Schon eingetragen">${o("merge|" + mg.id, "= " + mg.note + " (" + shortDate(mg.date) + ") verknüpfen")}</optgroup>`
    : "";
  const grp = (label, items) =>
    items.length ? `<optgroup label="${escHtml(label)}">${items.join("")}</optgroup>` : "";
  const inc = grp(
    "Einnahme",
    incCats().map((c) => o("einnahme|" + c.name, c.name))
  );
  const out =
    grp(
      "Ausgabe privat",
      cats("ausgabe").map((c) => o("ausgabe|" + c, c))
    ) +
    (positive
      ? ""
      : grp(
          "Fixkosten abhaken",
          fixedSorted().map((f) => o("fix|" + f.id, f.name + " (" + fmtEur(f.amount) + ")"))
        )) +
    grp(
      "Ausgabe betrieblich",
      cats("betrieb").map((c) => o("betrieb|" + c, c))
    ) +
    grp("Sonstiges", [o("vz|", "Steuer-Vorauszahlung")]);
  return mo + (positive ? inc + out : out + inc) + o("skip|", "Nicht übernehmen");
}
async function readFileText(file) {
  const buf = await file.arrayBuffer();
  let t = new TextDecoder("utf-8").decode(buf);
  if (t.includes("\uFFFD")) {
    try {
      t = new TextDecoder("windows-1252").decode(buf);
    } catch (e) {}
  }
  return t;
}
/* Kontoauszug PDF */
let pdfLoad = null;
function loadPdfJs() {
  const SRI = {
    "pdf.min.js": "__PDFJS_SRI__",
    "pdf.worker.min.js": "__PDFJS_WORKER_SRI__",
  };
  const add = (src) =>
    new Promise((ok, bad) => {
      const sc = document.createElement("script"),
        h = SRI[src.split("/").pop()];
      if (h && h.startsWith("sha384-")) {
        sc.integrity = h;
        sc.crossOrigin = "anonymous";
      }
      sc.src = src;
      sc.onload = ok;
      sc.onerror = bad;
      document.head.appendChild(sc);
    });
  const base = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.2.146/build/";
  return (
    pdfLoad ||
    (pdfLoad = add(base + "pdf.min.js")
      .then(() => add(base + "pdf.worker.min.js"))
      .then(() => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.js";
        return window.pdfjsLib;
      })
      .catch(() => {
        pdfLoad = null;
        throw new Error("Der PDF-Leser konnte nicht geladen werden – bist du online?");
      }))
  );
}
async function pdfLines(buf) {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({
    data: new Uint8Array(buf),
    isEvalSupported: false,
  }).promise;
  const out = [];
  for (let p = 1; p <= Math.min(doc.numPages, 60); p++) {
    const page = await doc.getPage(p),
      vp = page.getViewport({
        scale: 1,
      }),
      tc = await page.getTextContent();
    const its = tc.items
      .filter((i) => i.str && i.str.trim())
      .map((i) => ({
        x: i.transform[4],
        y: i.transform[5],
        w: i.width || 0,
        h: Math.abs(i.transform[3]) || 8,
        s: i.str,
      }));
    its.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    for (const it of its) {
      const ln = lines.find((l) => Math.abs(l.y - it.y) <= Math.max(2, it.h * 0.35));
      if (ln) ln.items.push(it);
      else
        lines.push({
          y: it.y,
          items: [it],
        });
    }
    lines.sort((a, b) => b.y - a.y);
    for (const l of lines) {
      l.items.sort((a, b) => a.x - b.x);
      const cells = [];
      for (const it of l.items) {
        const c = cells[cells.length - 1],
          gap = c ? it.x - c.x2 : 99;
        if (c && gap < it.h * 0.9) {
          c.s += (gap > it.h * 0.15 && !/\s$/.test(c.s) && !/^\s/.test(it.s) ? " " : "") + it.s;
          c.x2 = Math.max(c.x2, it.x + it.w);
        } else
          cells.push({
            x: it.x,
            x2: it.x + it.w,
            s: it.s,
          });
      }
      cells.forEach((c) => (c.s = c.s.replace(/\s+/g, " ").trim()));
      out.push({
        page: p,
        y: l.y,
        w: vp.width,
        cells: cells.filter((c) => c.s),
        text: cells
          .map((c) => c.s)
          .join("  ")
          .trim(),
      });
    }
  }
  return out;
}
const PDF_AMT =
  /^([+\-−–]\s?)?(?:EUR\s?|€\s?)?(\d{1,3}(?:[.\s]\d{3})*|\d+),(\d{2})(?:\s?(?:€|EUR))?(\s?[+\-−–]|\s?[SH])?$/;
function pdfAmount(s) {
  const m = PDF_AMT.exec(String(s).trim());
  if (!m) return null;
  const v = Number(m[2].replace(/[.\s]/g, "") + "." + m[3]);
  const lead = (m[1] || "").trim(),
    trail = (m[4] || "").trim();
  const sign =
    /[\-−–]/.test(lead) || /^[\-−–]$/.test(trail) || trail === "S"
      ? -1
      : lead === "+" || trail === "+" || trail === "H"
        ? 1
        : 0;
  return {
    v,
    sign,
  };
}
const PDF_SKIP =
  /saldo|kontostand|übertrag|uebertrag|zwischensumme|summe\b|gesamtbetrag|gesamtumsatz|alter stand|neuer stand|kreditrahmen|dispo|verfügungsrahmen|seite \d+ (von|\/) \d+|^\s*(eingänge|ausgänge|umsätze)\s*$/i;
const PDF_TYPES =
  /^(sepa[- ])?(basis[- ])?(folge)?(lastschrift|überweisung|ueberweisung|echtzeitüberweisung|echtzeit-überweisung|dauerauftrag|gutschrift|kartenzahlung|kartenumsatz|kartenverfügung|debitkarte|visa|mastercard|girocard|lohn\/gehalt|gehalt\/rente|gehalt|rente|entgelt|abschluss|zinsen|bargeldauszahlung|bargeldeinzahlung|auszahlung|einzahlung|gutschr\.?|lastschr\.?|überw\.?|ueberw\.?|retoure|rücklastschrift|online-überweisung|onlineüberweisung|zahlungseingang|zahlungsausgang|eingang|ausgang|abbuchung|buchung|lastschrifteinzug)\b\.?\s*/i;
const PDF_JUNK =
  /^(iban|bic|mandat|mandatsref|mandatsreferenz|gläubiger|glaeubiger|creditor|end-to-end|e2e|kundenreferenz|referenz|ref\.|wertstellung|valuta|wert|buchungstag|buchungsdatum)\b[:.]?/i;
function pdfStatementRows(lines) {
  const fullDate = /(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?!\d)/,
    shortDate = /(?:^|\s)(\d{1,2})\.(\d{1,2})\.(?!\d)/;
  let lastFull = null;
  for (const l of lines) {
    const m = fullDate.exec(l.text);
    if (m) {
      lastFull = {
        y: m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]),
        m: Number(m[2]),
      };
      break;
    }
  }
  if (!lastFull)
    lastFull = {
      y: new Date().getFullYear(),
      m: new Date().getMonth() + 1,
    };
  const heads = {};
  let cols = null;
  const headWords = [
    ["neg", /^(soll|belastung|belastungen|ausgang|ausgänge|lastschriften|abgang|zu ihren lasten|-|minus)$/i],
    ["pos", /^(haben|gutschrift|gutschriften|eingang|eingänge|zugang|zu ihren gunsten|\+|plus)$/i],
    ["amt", /^(betrag|betrag \(eur\)|betrag in eur|betrag eur|umsatz|umsatz in eur|betrag €)$/i],
    ["bal", /^(saldo|kontostand|stand)$/i],
  ];
  const dateAt = (l) => {
    for (const c of l.cells) {
      let m = fullDate.exec(c.s);
      if (m && m.index <= 2)
        return {
          d: Number(m[1]),
          m: Number(m[2]),
          y: m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]),
          cell: c,
          full: true,
        };
      m = /^(\d{1,2})\.(\d{1,2})\.(?!\d)/.exec(c.s);
      if (m)
        return {
          d: Number(m[1]),
          m: Number(m[2]),
          y: null,
          cell: c,
        };
    }
    return null;
  };
  const txs = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const fm = fullDate.exec(l.text);
    if (fm) {
      const y = fm[3].length === 2 ? 2000 + Number(fm[3]) : Number(fm[3]);
      if (y > 1990 && y < 2100)
        lastFull = {
          y,
          m: Number(fm[2]),
        };
    }
    const hits = [];
    for (const c of l.cells) {
      for (const [k, re] of headWords) if (re.test(c.s.trim())) hits.push([k, (c.x + c.x2) / 2]);
    }
    if (
      hits.length &&
      l.cells.length >= 2 &&
      l.cells.length <= 8 &&
      hits.some((h) => h[0] !== "bal") &&
      !l.cells.some((c) => pdfAmount(c.s)) &&
      !fullDate.test(l.text) &&
      !/^\d{1,2}\.\d{1,2}\./.test(l.text)
    ) {
      cols = {};
      for (const [k, x] of hits) (cols[k] = cols[k] || []).push(x);
      heads[l.page] = cols;
      cur = null;
      continue;
    }
    const amts = [];
    l.cells.forEach((c, ci) => {
      if (c.x < l.w * 0.42) return;
      let a = pdfAmount(c.s),
        x = (c.x + c.x2) / 2;
      if (!a && l.cells[ci + 1] && /^(€|EUR|S|H|-|\+)$/.test(l.cells[ci + 1].s))
        a = pdfAmount(c.s + " " + l.cells[ci + 1].s);
      if (a)
        amts.push({
          ...a,
          x,
          cell: c,
        });
    });
    const skip = PDF_SKIP.test(l.text);
    const dt = dateAt(l);
    if (amts.length && !skip) {
      let a = amts[0];
      if (amts.length > 1) {
        if (cols && (cols.amt || cols.neg || cols.pos)) {
          const xs = [...(cols.amt || []), ...(cols.neg || []), ...(cols.pos || [])];
          a = amts
            .slice()
            .sort(
              (p, q) => Math.min(...xs.map((x) => Math.abs(x - p.x))) - Math.min(...xs.map((x) => Math.abs(x - q.x)))
            )[0];
        } else if (cols && cols.bal) a = amts[0];
        else a = amts[amts.length - 1];
      }
      let sign = a.sign;
      if (!sign && cols && (cols.neg || cols.pos)) {
        const dn = Math.min(...(cols.neg || [1e9]).map((x) => Math.abs(x - a.x))),
          dp = Math.min(...(cols.pos || [1e9]).map((x) => Math.abs(x - a.x)));
        sign = dn < dp ? -1 : 1;
      }
      let date = dt;
      if (!date) {
        for (const k of [-1, 1, -2, 2]) {
          const o = lines[i + k];
          if (!o || o.page !== l.page) continue;
          const d = dateAt(o);
          if (d && !(txs.length && txs[txs.length - 1].li === i + k)) {
            date = d;
            break;
          }
        }
      }
      if (!date) {
        cur = null;
        continue;
      }
      let y = date.y;
      if (!y) {
        y = lastFull.y;
        if (date.m === 12 && lastFull.m <= 2) y--;
        else if (date.m <= 2 && lastFull.m === 12) y++;
      }
      const text = l.cells
        .filter((c) => c !== a.cell && !(dt && c === dt.cell) && !/^(€|EUR|S|H|-|\+)$/.test(c.s) && !pdfAmount(c.s))
        .map((c) =>
          c.s
            .replace(/(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?!\d)/g, "")
            .replace(/(^|\s)\d{1,2}\.\d{1,2}\.(?!\d)/g, " ")
            .trim()
        )
        .filter(Boolean);
      cur = {
        li: i,
        page: l.page,
        date: y + "-" + pad(date.m) + "-" + pad(date.d),
        v: a.v,
        sign,
        first: text.join(" "),
        cont: [],
      };
      txs.push(cur);
      continue;
    }
    if (skip || !cur || l.page !== cur.page || cur.cont.length >= 6) {
      if (skip) cur = null;
      continue;
    }
    if (dt && dt.full && l.cells.length > 2) {
      cur = null;
      continue;
    }
    cur.cont.push(l.cells.map((c) => c.s).join(" "));
  }
  const expNeg = txs.some((t) => t.sign < 0) && !txs.some((t) => t.sign > 0) && txs.some((t) => !t.sign);
  return txs.map((t) => {
    let first = t.first.replace(/\s+/g, " ").trim(),
      type = "";
    const tm = PDF_TYPES.exec(first);
    if (tm) {
      type = tm[0].trim().replace(/\.$/, "");
      first = first.slice(tm[0].length).trim();
    }
    const rest = t.cont
      .map((s) =>
        s
          .replace(/^(\d{1,2}\.\d{1,2}\.(\d{4}|\d{2})?\s*)+/, "")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter((s) => s && !PDF_JUNK.test(s));
    let payee = first;
    if (!payee || /^[\d\s.\/:-]+$/.test(payee)) {
      payee = rest.shift() || "";
      const tm2 = !type && PDF_TYPES.exec(payee);
      if (tm2) {
        type = tm2[0].trim();
        payee = payee.slice(tm2[0].length).trim() || rest.shift() || "";
      }
    }
    let sign = t.sign;
    /* Stehen Abbuchungen ausdrücklich mit „-“ da (und nichts mit „+“), sind Beträge ohne Vorzeichen Eingänge */
    if (!sign && expNeg) sign = 1;
    if (!sign)
      sign = /gutschrift|eingang|gehalt|lohn|rente|einzahlung|erstattung|zinsen haben/i.test(type + " " + t.first)
        ? 1
        : -1;
    const amount = (sign < 0 ? "-" : "") + t.v.toFixed(2);
    return [t.date, payee.replace(/\s+/g, " ").slice(0, 90), rest.join(" ").slice(0, 160), amount, type, t.page];
  });
}
/* Papierauszüge */
function ocrToStmtLines(ocr, page) {
  const L = (ocr || [])
    .filter((l) => l.t && l.y != null)
    .map((l) => ({
      x: l.x || 0,
      y: l.y,
      w: l.w || l.t.length * 8,
      h: l.h || 12,
      t: l.t,
    }));
  if (!L.length) return [];
  const W = Math.max(...L.map((l) => l.x + l.w));
  L.sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const rows = [];
  for (const l of L) {
    const r = rows.find((r) => Math.abs(r.y + r.h / 2 - (l.y + l.h / 2)) < Math.max(r.h, l.h) * 0.55);
    if (r) {
      r.items.push(l);
      r.h = Math.max(r.h, l.h);
    } else
      rows.push({
        y: l.y,
        h: l.h,
        items: [l],
      });
  }
  const AM = /^([+\-−–])?(\d{1,3}(?:\.\d{3})*|\d+),\d{2}([+\-−–]|S|H)?$/;
  return rows.map((r) => {
    r.items.sort((a, b) => a.x - b.x);
    const cells = [];
    for (const it of r.items) {
      const words = it.t.split(/\s+/).filter(Boolean),
        cw = it.w / Math.max(1, it.t.length);
      let pos = 0,
        buf = null;
      for (const wd of words) {
        const at = it.t.indexOf(wd, pos);
        pos = at + wd.length;
        const x = it.x + at * cw,
          x2 = it.x + pos * cw;
        const prev = cells[cells.length - 1];
        if (/^(S|H|[+\-−–])$/.test(wd) && !buf && prev && AM.test(prev.s)) {
          prev.s += " " + wd;
          prev.x2 = x2;
          continue;
        }
        if (/^(EUR|€)$/.test(wd)) continue;
        if (!buf && /^\d{1,2}\.\d{1,2}\.(\d{2,4})?$/.test(wd)) {
          cells.push({
            x,
            x2,
            s: wd,
          });
          continue;
        }
        if (AM.test(wd)) {
          if (buf) {
            cells.push(buf);
            buf = null;
          }
          cells.push({
            x,
            x2,
            s: wd,
          });
        } else if (buf) {
          buf.s += " " + wd;
          buf.x2 = x2;
        } else
          buf = {
            x,
            x2,
            s: wd,
          };
      }
      if (buf) cells.push(buf);
    }
    return {
      page,
      y: -r.y,
      w: W,
      cells,
      text: cells.map((c) => c.s).join("  "),
    };
  });
}
function stmtBalances(lines) {
  let oldB = null,
    newB = null;
  const amt = (l) => {
    for (let i = l.cells.length - 1; i >= 0; i--) {
      let a = pdfAmount(l.cells[i].s);
      if (!a && l.cells[i + 1]) a = pdfAmount(l.cells[i].s + " " + l.cells[i + 1].s);
      if (a) return a.v * (a.sign < 0 ? -1 : 1);
    }
    return null;
  };
  for (const l of lines) {
    const t = l.text.toLowerCase();
    if (
      oldB == null &&
      /(alter|bisheriger|vorheriger)\s+(konto)?stand|kontostand alt|saldo alt|anfangssaldo|saldovortrag|vortrag vom/.test(
        t
      )
    ) {
      const v = amt(l);
      if (v != null) oldB = v;
    }
    if (/(neuer)\s+(konto)?stand|kontostand neu|saldo neu|endsaldo|neuer saldo/.test(t)) {
      const v = amt(l);
      if (v != null) newB = v;
    }
  }
  return {
    oldB,
    newB,
  };
}
async function stmtPhoto() {
  let ocr = null;
  try {
    if (NATIVE_SCAN) {
      const res = await scanNative("camera");
      if (!res) return;
      ocr = Array.isArray(res) ? res : res.lines || [];
      const img = Array.isArray(res) ? null : res.img;
      if (img) {
        const rv = await docReview(img, {
          lines: ocr,
        });
        if (!rv) return;
        if (rv.action === "retake") return stmtPhoto();
      }
    } else {
      const f = await new Promise((r) => {
        const inp = $("scanFile");
        inp.value = "";
        inp.onchange = () => r(inp.files[0] || null);
        inp.click();
      });
      if (!f) return;
      let img = null;
      try {
        img = await shrinkImage(f);
      } catch (e) {}
      if (img) {
        const rv = await docReview(img, {});
        if (!rv) return;
        if (rv.action === "retake") return stmtPhoto();
        img = rv.img;
      }
      ocr = await scanImageFile(img || f);
      scanBusy(false);
    }
  } catch (e) {
    scanBusy(false);
    toast(e.message || "Foto konnte nicht gelesen werden");
    return;
  }
  const prev = ui.imp && ui.imp.photo ? ui.imp : null,
    pages = prev ? prev.pages : [];
  pages.push(ocr || []);
  const lines = pages.flatMap((o, i) => ocrToStmtLines(o, i + 1)),
    rows = pdfStatementRows(lines);
  if (!rows.length) {
    toast(
      prev
        ? "Auf dieser Seite wurden keine Buchungen erkannt"
        : "Keine Buchungen erkannt – gerade, hell und scharf fotografieren"
    );
    if (!prev) return;
  }
  const bal = stmtBalances(lines);
  const headers = ["Datum", "Empfänger", "Verwendungszweck", "Betrag", "Buchungsart"];
  ui.imp = {
    fileName: `Foto-Kontoauszug · ${pages.length} ${pages.length === 1 ? "Seite" : "Seiten"}`,
    headers,
    raw: rows.slice(0, 2000),
    map: {
      date: 0,
      payee: 1,
      payer: -1,
      ref: 2,
      amount: 3,
      type: 4,
      account: -1,
      status: -1,
      sh: -1,
      soll: -1,
      haben: -1,
      paypal: false,
    },
    items: null,
    pdf: true,
    photo: true,
    pages,
    bal,
  };
  buildItems();
  ui.view = "import";
  render();
  window.scrollTo({
    top: 0,
  });
}
/* Dokument */
const DOCT = {
  stmt: ["Kontoauszug", "🏦"],
  inv: ["Rechnung", "📄"],
  rcpt: ["Quittung", "🧾"],
};
const CAM = {};
const ocrWait = {};
window.hbOcrDone = (id, j, e) => {
  const f = ocrWait[id];
  if (f) {
    delete ocrWait[id];
    f(j, e);
  }
};
const canNativeOcr = () => !!(window.AndroidBridge && window.AndroidBridge.ocrImage);
const canLiveCam = () =>
  canNativeOcr() &&
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
  !(window.AndroidBridge && window.AndroidBridge.desktop);
function ocrDataUrl(url) {
  if (canNativeOcr())
    return new Promise((ok, no) => {
      const id = newId();
      ocrWait[id] = (j, e) => (e ? no(new Error(e)) : ok(JSON.parse(j || "[]")));
      window.AndroidBridge.ocrImage(id, url);
    });
  return (async () => {
    await loadTesseract();
    const r = await window.Tesseract.recognize(url, "deu");
    return ((r.data && r.data.lines) || [])
      .map((l) => ({
        t: l.text.trim(),
        x: l.bbox.x0,
        y: l.bbox.y0,
        w: l.bbox.x1 - l.bbox.x0,
        h: l.bbox.y1 - l.bbox.y0,
      }))
      .filter((l) => l.t);
  })();
}
function docClassify(lines, aspect) {
  const T = lines.map((l) => l.t).join("\n"),
    low = T.toLowerCase();
  const dateRows = lines.filter((l) => /^\s*\d{1,2}\.\d{1,2}\.(\d{2,4})?(\s|$)/.test(l.t)).length;
  const s = {
    stmt: 0,
    inv: 0,
    rcpt: 0,
  };
  if (/kontoauszug|kontostand|saldo|alter stand|neuer stand|buchungstag|umsätze|umsatzübersicht|wertstellung/.test(low))
    s.stmt += 3;
  if (dateRows >= 4) s.stmt += 2;
  if (/\bDE\d{2}(\s?\d{4}){4}/.test(T) || /\biban\b/.test(low)) {
    s.stmt += 1;
    s.inv += 1;
  }
  if (/rechnung\s*(nr|nummer|no)|rechnungsnummer|rechnungsdatum|rechnungs-?nr|invoice/.test(low)) s.inv += 3;
  else if (/\brechnung\b/.test(low)) s.inv += 1;
  if (
    /fällig|faellig|zahlbar bis|zahlungsziel|leistungszeitraum|kundennummer|kunden-?nr|ust-?id|steuernummer|bitte überweisen/.test(
      low
    )
  )
    s.inv += 2;
  if (
    /\bsumme\b|zu zahlen|\bbar\b|ec-?karte|girocard|rückgeld|kartenzahlung|beleg-?nr|\bkasse\b|\bbon\b|danke für ihren einkauf|vielen dank/.test(
      low
    )
  )
    s.rcpt += 2;
  if (aspect > 1.85) s.rcpt += 3;
  else if (aspect > 1.25 && aspect < 1.6) {
    s.stmt += 1;
    s.inv += 1;
  }
  const best = Object.entries(s).sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 2
    ? {
        type: best[0],
        rows: dateRows,
        score: s,
      }
    : null;
}
function liveQuad(c) {
  const w = c.width,
    h = c.height,
    d = c
      .getContext("2d", {
        willReadFrequently: true,
      })
      .getImageData(0, 0, w, h).data,
    N = w * h,
    g = new Uint8Array(N),
    hist = new Array(256).fill(0);
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    const v = (0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]) | 0;
    g[i] = v;
    hist[v]++;
  }
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0,
    wB = 0,
    best = 0,
    thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = N - wB;
    if (!wF) break;
    sB += t * hist[t];
    const mB = sB / wB,
      mF = (sum - sB) / wF,
      b = wB * wF * (mB - mF) * (mB - mF);
    if (b > best) {
      best = b;
      thr = t;
    }
  }
  const lab = new Uint8Array(N);
  let bigPix = null,
    bigN = 0;
  for (let i = 0; i < N; i++) {
    if (lab[i] || g[i] <= thr) continue;
    const st = [i],
      pix = [];
    lab[i] = 1;
    while (st.length) {
      const p = st.pop();
      pix.push(p);
      const x = p % w,
        y = (p / w) | 0;
      if (x > 0 && !lab[p - 1] && g[p - 1] > thr) {
        lab[p - 1] = 1;
        st.push(p - 1);
      }
      if (x < w - 1 && !lab[p + 1] && g[p + 1] > thr) {
        lab[p + 1] = 1;
        st.push(p + 1);
      }
      if (y > 0 && !lab[p - w] && g[p - w] > thr) {
        lab[p - w] = 1;
        st.push(p - w);
      }
      if (y < h - 1 && !lab[p + w] && g[p + w] > thr) {
        lab[p + w] = 1;
        st.push(p + w);
      }
    }
    if (pix.length > bigN) {
      bigN = pix.length;
      bigPix = pix;
    }
  }
  const area = bigN / N;
  if (!bigPix || area < 0.07 || area > 0.94) return null;
  let tl = [1e9, 0, 0],
    br = [-1e9, 0, 0],
    tr = [-1e9, 0, 0],
    bl = [1e9, 0, 0],
    edge = 0;
  for (const p of bigPix) {
    const x = p % w,
      y = (p / w) | 0;
    if (x + y < tl[0]) tl = [x + y, x, y];
    if (x + y > br[0]) br = [x + y, x, y];
    if (x - y > tr[0]) tr = [x - y, x, y];
    if (x - y < bl[0]) bl = [x - y, x, y];
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge++;
  }
  if (edge / (2 * (w + h)) > 0.35) return null;
  return [
    [tl[1], tl[2]],
    [tr[1], tr[2]],
    [br[1], br[2]],
    [bl[1], bl[2]],
  ];
}
const qDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const qAspect = (q) => {
  const W = Math.max(qDist(q[0], q[1]), qDist(q[3], q[2])),
    H = Math.max(qDist(q[0], q[3]), qDist(q[1], q[2]));
  return W ? H / W : 1;
};

/* Kamera */
function camEl() {
  let el = $("camLive");
  if (el) return el;
  el = document.createElement("div");
  el.id = "camLive";
  el.className = "camlive";
  el.hidden = true;
  el.innerHTML = `<video id="camVid" playsinline muted autoplay></video><canvas id="camOv"></canvas>
    <button class="camx" data-cam="close" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <div class="camtop"><div class="camchip" id="camChip">Halte ein Dokument ins Bild</div>
      <div class="camtypes">${Object.entries(DOCT)
        .map(([k, [n]]) => `<button data-camtype="${k}">${n}</button>`)
        .join("")}</div></div>
    <div class="cambot"><div class="camhint" id="camHint">Papier auf einen dunklen Untergrund legen</div>
      <div class="camrow"><button class="camside" data-cam="gallery" aria-label="Aus der Galerie">${svgIcon("receipt", 22)}</button><button class="camshut" data-cam="shoot" aria-label="Foto aufnehmen"></button><span class="camside" style="visibility:hidden"></span></div></div>`;
  document.body.appendChild(el);
  return el;
}
async function smartScan(opts) {
  opts = opts || {};
  CAM.opts = opts;
  CAM.forced = opts.type || null;
  CAM.type = null;
  CAM.last = null;
  CAM.info = "";
  if (!canLiveCam() || (NATIVE_SCAN && !window.AndroidBridge.desktop)) return smartScanFallback(opts);
  const el = camEl();
  try {
    CAM.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: "environment",
        },
        width: {
          ideal: 2560,
        },
        height: {
          ideal: 1440,
        },
      },
      audio: false,
    });
  } catch (e) {
    toast("Kamera nicht erlaubt – du kannst sie in den Android-Einstellungen freigeben");
    return smartScanFallback(opts);
  }
  const v = $("camVid");
  v.srcObject = CAM.stream;
  el.hidden = false;
  document.body.classList.add("locked");
  try {
    await v.play();
  } catch (e) {}
  CAM.on = true;
  CAM.quad = null;
  CAM.miss = 0;
  CAM.busy = false;
  CAM.lastOcr = 0;
  CAM.still = 0;
  camChip();
  camLoop();
}
function camStop() {
  CAM.on = false;
  if (CAM.stream) CAM.stream.getTracks().forEach((t) => t.stop());
  CAM.stream = null;
  const el = $("camLive");
  if (el) el.hidden = true;
  document.body.classList.remove("locked");
}
function camMap() {
  const v = $("camVid"),
    W = v.clientWidth,
    H = v.clientHeight,
    vw = v.videoWidth || 1,
    vh = v.videoHeight || 1,
    s = Math.max(W / vw, H / vh);
  return {
    s,
    ox: (W - vw * s) / 2,
    oy: (H - vh * s) / 2,
    W,
    H,
  };
}
function camLoop() {
  if (!CAM.on) return;
  const v = $("camVid");
  if (v.videoWidth) {
    const sm = CAM.sm || (CAM.sm = document.createElement("canvas")),
      k = 160 / Math.max(v.videoWidth, v.videoHeight);
    sm.width = Math.round(v.videoWidth * k);
    sm.height = Math.round(v.videoHeight * k);
    sm.getContext("2d").drawImage(v, 0, 0, sm.width, sm.height);
    const q = liveQuad(sm),
      f = 1 / k;
    if (q) {
      const Q = q.map(([x, y]) => [x * f, y * f]);
      const moved = CAM.quad
        ? Math.max(...Q.map((p, i) => qDist(p, CAM.quad[i]))) / Math.max(v.videoWidth, v.videoHeight)
        : 1;
      CAM.quad = CAM.quad ? CAM.quad.map((p, i) => [p[0] * 0.55 + Q[i][0] * 0.45, p[1] * 0.55 + Q[i][1] * 0.45]) : Q;
      CAM.miss = 0;
      CAM.still = moved < 0.02 ? CAM.still + 1 : 0;
    } else if (++CAM.miss > 8) {
      CAM.quad = null;
      CAM.still = 0;
    }
    camDraw();
    if (CAM.quad && !CAM.busy && Date.now() - CAM.lastOcr > 1300) camRead();
  }
  setTimeout(() => requestAnimationFrame(camLoop), 90);
}
function camDraw() {
  const c = $("camOv"),
    m = camMap();
  if (c.width !== m.W) c.width = m.W;
  if (c.height !== m.H) c.height = m.H;
  const x = c.getContext("2d");
  x.clearRect(0, 0, c.width, c.height);
  if (!CAM.quad) {
    $("camHint").textContent = "Papier auf einen dunklen Untergrund legen";
    return;
  }
  const P = CAM.quad.map(([a, b]) => [a * m.s + m.ox, b * m.s + m.oy]);
  x.save();
  x.fillStyle = "rgba(0,0,0,.35)";
  x.beginPath();
  x.rect(0, 0, c.width, c.height);
  x.moveTo(...P[0]);
  for (const p of [P[3], P[2], P[1]]) x.lineTo(...p);
  x.closePath();
  x.fill("evenodd");
  x.strokeStyle = "#6ee7b7";
  x.lineWidth = 4;
  x.shadowColor = "#6ee7b7";
  x.shadowBlur = 14;
  x.lineJoin = "round";
  x.beginPath();
  x.moveTo(...P[0]);
  for (const p of [P[1], P[2], P[3]]) x.lineTo(...p);
  x.closePath();
  x.stroke();
  x.restore();
  $("camHint").textContent = CAM.still > 4 ? "Ränder gefunden – jetzt auslösen" : "Halt still …";
}
async function camRead() {
  CAM.busy = true;
  CAM.lastOcr = Date.now();
  try {
    const v = $("camVid"),
      q = CAM.quad;
    const xs = q.map((p) => p[0]),
      ys = q.map((p) => p[1]);
    const x0 = Math.max(0, Math.min(...xs)),
      y0 = Math.max(0, Math.min(...ys)),
      w = Math.min(v.videoWidth, Math.max(...xs)) - x0,
      h = Math.min(v.videoHeight, Math.max(...ys)) - y0;
    const k = Math.min(1, 1100 / Math.max(w, h)),
      c = document.createElement("canvas");
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext("2d").drawImage(v, x0, y0, w, h, 0, 0, c.width, c.height);
    const lines = await ocrDataUrl(c.toDataURL("image/jpeg", 0.7)),
      r = docClassify(lines, qAspect(q));
    if (r) {
      if (r.type === CAM.last || !CAM.type) CAM.type = r.type;
      CAM.last = r.type;
      CAM.info =
        r.type === "stmt" && r.rows
          ? `${r.rows} Buchungen sichtbar`
          : r.type === "rcpt"
            ? "Kassenbon"
            : /fällig|zahlbar bis|zahlungsziel/i.test(lines.map((l) => l.t).join(" "))
              ? "mit Fälligkeit"
              : "";
    }
    camChip();
  } catch (e) {
  } finally {
    CAM.busy = false;
  }
}
function camChip() {
  const t = CAM.forced || CAM.type,
    ch = $("camChip");
  if (!ch) return;
  ch.innerHTML = t
    ? `<span>${DOCT[t][1]}</span> <b>${escHtml(DOCT[t][0])} ${CAM.forced ? "gewählt" : "erkannt"}</b>${CAM.info && !CAM.forced ? ` <small>${escHtml(CAM.info)}</small>` : ""}`
    : CAM.quad
      ? `<b>Lese …</b>`
      : `<b>Halte ein Dokument ins Bild</b>`;
  document
    .querySelectorAll("#camLive [data-camtype]")
    .forEach((b) => b.classList.toggle("on", b.dataset.camtype === t));
}
async function camShoot() {
  const v = $("camVid");
  if (!v.videoWidth) return;
  SND.play("shutter");
  const c = document.createElement("canvas");
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext("2d").drawImage(v, 0, 0);
  const q = CAM.quad ? CAM.quad.map((p) => [...p]) : null,
    type = CAM.forced || CAM.type;
  camStop();
  scanWorking(true);
  try {
    const im = await loadImg(c.toDataURL("image/jpeg", 0.92));
    let out = q ? docWarp(im, q, 2000) : c;
    out = docEnhance(out, 25, 25);
    const img = out.toDataURL("image/jpeg", 0.85),
      lines = await ocrDataUrl(img);
    scanWorking(false);
    const r = docClassify(lines, out.height / out.width);
    camReview({
      type: type || (r && r.type) || "rcpt",
      img,
      lines,
      W: out.width,
      H: out.height,
    });
  } catch (e) {
    scanWorking(false);
    toast(e.message || "Foto konnte nicht gelesen werden");
  }
}
function scanWorking(on) {
  let el = $("camWork");
  if (!el) {
    el = document.createElement("div");
    el.id = "camWork";
    el.className = "camwork";
    el.innerHTML = `<div class="camspin"></div><b>Wird gelesen …</b>`;
    document.body.appendChild(el);
  }
  el.hidden = !on;
}
async function smartScanFallback(opts) {
  try {
    let img = null,
      lines = null,
      noBoxes = false;
    if (NATIVE_SCAN && !window.AndroidBridge.desktop) {
      const res = await scanNative("camera");
      if (!res) return;
      lines = Array.isArray(res) ? res : res.lines || [];
      img = Array.isArray(res) ? null : res.img;
      noBoxes = true;
      if (img) {
        const rv = await docReview(img, {
          lines,
        });
        if (!rv) return;
        if (rv.action === "retake") return smartScanFallback(opts);
        img = rv.img;
        if (canNativeOcr()) {
          scanWorking(true);
          try {
            const l2 = await ocrDataUrl(img);
            if (l2 && l2.length) {
              lines = l2;
              noBoxes = false;
            }
          } catch (e) {}
          scanWorking(false);
        }
      }
    } else {
      const f = await new Promise((r) => {
        const inp = $("scanFile");
        inp.value = "";
        inp.onchange = () => r(inp.files[0] || null);
        inp.click();
      });
      if (!f) return;
      try {
        img = await shrinkImage(f);
      } catch (e) {}
      if (img) {
        const rv = await docReview(img, {});
        if (!rv) return;
        if (rv.action === "retake") return smartScanFallback(opts);
        img = rv.img;
      }
      scanWorking(true);
      lines = await ocrDataUrl(img);
      scanWorking(false);
    }
    if (!img) {
      toast("Das Foto konnte nicht übernommen werden");
      return;
    }
    const im = await loadImg(img),
      r = docClassify(lines || [], im.naturalHeight / im.naturalWidth);
    camReview({
      type: opts.type || (r && r.type) || "rcpt",
      img,
      lines: lines || [],
      W: im.naturalWidth,
      H: im.naturalHeight,
      noBoxes,
    });
  } catch (e) {
    scanWorking(false);
    toast(e.message || "Foto konnte nicht gelesen werden");
  }
}
async function camGallery() {
  camStop();
  const f = await new Promise((r) => {
    const inp = $("scanFile");
    inp.value = "";
    inp.onchange = () => r(inp.files[0] || null);
    inp.click();
  });
  if (!f) return;
  try {
    let img = await shrinkImage(f);
    const rv = await docReview(img, {});
    if (!rv) return;
    img = rv.img;
    scanWorking(true);
    const lines = await ocrDataUrl(img);
    scanWorking(false);
    const im = await loadImg(img),
      r = docClassify(lines, im.naturalHeight / im.naturalWidth);
    camReview({
      type: CAM.forced || (r && r.type) || "rcpt",
      img,
      lines,
      W: im.naturalWidth,
      H: im.naturalHeight,
    });
  } catch (e) {
    scanWorking(false);
    toast(e.message || "Foto konnte nicht gelesen werden");
  }
}

/* Erkannt */
const FCOL = ["#16a34a", "#2563eb", "#f59e0b", "#db2777", "#7c3aed", "#0891b2"];
function lineIdx(lines, test) {
  return lines.findIndex((l) => test(l.t));
}
const amtVariants = (v) => {
  const a = Math.abs(v),
    s = a.toFixed(2).replace(".", ","),
    t = a >= 1000 ? Math.floor(a).toLocaleString("de-DE") + "," + s.slice(-2) : s;
  return [s, t, a.toFixed(2)];
};
const isoToDe = (d) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : "");
function dateFrom(s) {
  const m = /(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})/.exec(s || "");
  if (!m) return null;
  let y = +m[3];
  if (y < 100) y += 2000;
  const d = `${y}-${pad(m[2])}-${pad(m[1])}`;
  return +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31 ? d : null;
}
function parseInvoice(lines) {
  const T = lines.map((l) => l.t);
  let amount = null,
    ai = -1;
  const STRONG = /rechnungsbetrag|gesamtbetrag|endbetrag|zu zahlen|zahlbetrag|bitte überweisen|offener betrag/i,
    KW = /gesamt|summe|total|brutto/i;
  T.forEach((t, i) => {
    const strong = STRONG.test(t);
    if (!strong && !KW.test(t)) return;
    if (/netto|mwst|ust\b|umsatzsteuer|zwischen/i.test(t) && !strong) return;
    let a = amountsIn(t),
      at = i;
    if (!a.length && T[i + 1]) {
      a = amountsIn(T[i + 1]);
      at = i + 1;
    }
    if (!a.length) return;
    const v = a[a.length - 1];
    if (amount == null || strong || v > amount) {
      amount = v;
      ai = at;
    }
  });
  if (amount == null) {
    let m = 0;
    T.forEach((t, i) => {
      for (const v of amountsIn(t))
        if (v > m) {
          m = v;
          ai = i;
        }
    });
    if (m) amount = m;
  }
  let nr = "",
    ni = lineIdx(lines, (t) => /rechnungs?\s*-?\s*(nr|nummer|no)\b|rechnungsnummer/i.test(t));
  if (ni >= 0) {
    const m =
      /(?:nr|nummer|no)\.?\s*[:#]?\s*([A-Z0-9][A-Z0-9\-\/]{2,})/i.exec(T[ni]) ||
      (T[ni + 1] && /^\s*([A-Z0-9][A-Z0-9\-\/]{2,})/i.exec(T[ni + 1]));
    if (m) nr = m[1];
    else ni = -1;
  }
  let date = null,
    di = lineIdx(lines, (t) => /rechnungsdatum|datum/i.test(t) && dateFrom(t));
  if (di >= 0) date = dateFrom(T[di]);
  else {
    di = lineIdx(lines, (t) => !!dateFrom(t));
    if (di >= 0) date = dateFrom(T[di]);
  }
  let due = null,
    dui = lineIdx(lines, (t) => /fällig|faellig|zahlbar bis|zahlungsziel|spätestens|bis zum/i.test(t));
  if (dui >= 0) {
    due = dateFrom(T[dui]) || dateFrom(T[dui + 1]);
    if (!due) {
      const m = /(\d{1,3})\s*tage/i.exec(T[dui] + " " + (T[dui + 1] || ""));
      if (m && date) {
        const d = new Date(date + "T12:00");
        d.setDate(d.getDate() + Number(m[1]));
        due = d.toISOString().slice(0, 10);
      }
    }
    if (!due) dui = -1;
  }
  let si = lineIdx(
    lines,
    (t) => /[a-zäöüß]{3,}/i.test(t) && !/rechnung|seite|datum|kunden|tel|fax|www|@|straße|strasse|str\.|\d{5}/i.test(t)
  );
  const sender = si >= 0 ? T[si].replace(/\s+/g, " ").slice(0, 40) : "";
  const r = parseReceipt(lines);
  return {
    amount,
    ai,
    nr,
    ni,
    date: date || isoToday(),
    di,
    due,
    dui,
    sender,
    si,
    cat: r.cat,
  };
}
function stmtRowsFrom(lines) {
  const page = (CAM.pages || []).length + 1,
    rows = pdfStatementRows(ocrToStmtLines(lines, page)),
    used = new Set();
  return rows.map((r) => {
    const v = Number(r[3]) || parseBankAmt(r[3]),
      vars = amtVariants(v);
    let i = lines.findIndex((l, k) => !used.has(k) && vars.some((s) => l.t.includes(s)));
    if (i >= 0) used.add(i);
    const d = parseDate(r[0]),
      dup = store.tx.some((t) => t.date === d && Math.abs(Math.abs(t.amount) - Math.abs(v)) < 0.005);
    return {
      r,
      v,
      d,
      i,
      on: !dup,
      dup,
    };
  });
}

/* Prüfen */
function camRevEl() {
  let el = $("camRev");
  if (el) return el;
  el = document.createElement("div");
  el.id = "camRev";
  el.className = "camrev";
  el.hidden = true;
  document.body.appendChild(el);
  return el;
}
function camReview(R) {
  CAM.R = R;
  R.sel = -1;
  if (R.type === "rcpt") {
    const p = parseReceipt(R.lines);
    const ai = p.amount != null ? lineIdx(R.lines, (t) => amtVariants(p.amount).some((s) => t.includes(s))) : -1;
    R.f = [
      {
        k: "shop",
        l: "Laden",
        v: p.shop || "",
        i: p.shop ? lineIdx(R.lines, (t) => t.replace(/\s+/g, " ").includes(p.shop.slice(0, 12))) : -1,
      },
      {
        k: "date",
        l: "Datum",
        v: p.date || isoToday(),
        i: p.date ? lineIdx(R.lines, (t) => dateFrom(t) === p.date) : -1,
        type: "date",
      },
      {
        k: "amount",
        l: "Betrag",
        v: p.amount != null ? p.amount.toFixed(2).replace(".", ",") : "",
        i: ai,
        type: "amt",
        warn: p.amount == null,
      },
      {
        k: "cat",
        l: "Kategorie",
        v: p.cat || cats("ausgabe")[0] || "",
        i: -1,
        type: "cat",
      },
      {
        k: "pay",
        l: "Bezahlt",
        v:
          /\b(bar|bargeld|gegeben|rückgeld|rueckgeld)\b/i.test(R.lines.map((l) => l.t).join(" ")) &&
          !/ec-?karte|girocard|kartenzahlung|visa|mastercard|kontaktlos/i.test(R.lines.map((l) => l.t).join(" "))
            ? "bar"
            : "karte",
        i: lineIdx(R.lines, (t) =>
          /\b(bar|gegeben|ec-?karte|girocard|kartenzahlung|visa|mastercard|kontaktlos)\b/i.test(t)
        ),
        type: "pay",
      },
    ];
  } else if (R.type === "inv") {
    const p = parseInvoice(R.lines);
    R.f = [
      {
        k: "shop",
        l: "Von",
        v: p.sender,
        i: p.si,
      },
      {
        k: "nr",
        l: "Rechnungsnr.",
        v: p.nr,
        i: p.ni,
      },
      {
        k: "amount",
        l: "Betrag",
        v: p.amount != null ? p.amount.toFixed(2).replace(".", ",") : "",
        i: p.ai,
        type: "amt",
        warn: p.amount == null,
      },
      {
        k: "date",
        l: "Datum",
        v: p.date,
        i: p.di,
        type: "date",
      },
      {
        k: "due",
        l: "Fällig am",
        v: p.due || "",
        i: p.dui,
        type: "date",
      },
      {
        k: "cat",
        l: "Kategorie",
        v: p.cat || cats("ausgabe")[0] || "",
        i: -1,
        type: "cat",
      },
    ];
    R.book = true;
    R.term = true;
  } else R.rows = stmtRowsFrom(R.lines);
  const el = camRevEl();
  el.hidden = false;
  document.body.classList.add("locked");
  camRevRender();
}
function camBoxes() {
  const R = CAM.R,
    boxes = [];
  const box = (i, col, on) => {
    const l = R.lines[i];
    if (i < 0 || !l || R.noBoxes || l.x == null) return "";
    const p = Math.max(4, R.W / 160);
    return `<rect x="${l.x - p}" y="${l.y - p * 0.7}" width="${l.w + p * 2}" height="${l.h + p * 1.4}" rx="${p}" fill="${col}" fill-opacity="${on ? 0.35 : 0.14}" stroke="${col}" stroke-width="${on ? p * 1.4 : p * 0.7}"/>`;
  };
  if (R.f) R.f.forEach((f, n) => boxes.push(box(f.i, FCOL[n % FCOL.length], R.sel === n)));
  else
    R.rows.forEach((r, n) =>
      boxes.push(box(r.i, r.on ? (R.sel === n ? "#f59e0b" : "#16a34a") : "#9ca3af", R.sel === n))
    );
  return boxes.join("");
}
function camHi(n) {
  const R = CAM.R;
  R.sel = n;
  const sv = document.querySelector("#camRev .crpic svg");
  if (sv) sv.innerHTML = camBoxes();
  document
    .querySelectorAll("#camRev [data-crf],#camRev [data-crrow]")
    .forEach((e) => e.classList.toggle("act", +(e.dataset.crf ?? e.dataset.crrow) === n));
  const l = R.lines[(R.f ? R.f[n] : R.rows[n] || {}).i];
  const sh = document.querySelector("#camRev .crshot"),
    pic = document.querySelector("#camRev .crpic");
  if (l && sh && pic && l.y != null) {
    const k = pic.clientHeight / R.H;
    sh.scrollTo({
      top: Math.max(0, l.y * k - sh.clientHeight / 2),
      behavior: "smooth",
    });
  }
}
function camRevRender() {
  const R = CAM.R,
    el = $("camRev");
  const pills = Object.entries(DOCT)
    .map(([k, [n]]) => `<button class="${k === R.type ? "on" : ""}" data-crtype="${k}">${n}</button>`)
    .join("");
  const catOpts = (v) =>
    cats("ausgabe")
      .map((c) => `<option ${c === v ? "selected" : ""}>${escHtml(c)}</option>`)
      .join("");
  let body, btn;
  if (R.f) {
    body = `<div class="crlbl">Das wird übernommen – antippen zum Ändern</div><div class="crf">${R.f
      .map(
        (
          f,
          n
        ) => `<label class="crrow ${R.sel === n ? "act" : ""} ${f.warn ? "warn" : ""}" data-crf="${n}"><i style="background:${f.i >= 0 && !R.noBoxes ? FCOL[n % FCOL.length] : "var(--line)"}"></i><small>${escHtml(f.l)}</small>
      ${f.type === "pay" ? `<select data-crv="${n}"><option value="karte" ${f.v !== "bar" ? "selected" : ""}>Karte</option><option value="bar" ${f.v === "bar" ? "selected" : ""}>Bar</option></select>` : f.type === "cat" ? `<select data-crv="${n}">${catOpts(f.v)}</select>` : f.type === "date" ? `<input type="date" data-crv="${n}" value="${escHtml(f.v)}">` : `<input ${f.type === "amt" ? 'inputmode="decimal"' : ""} data-crv="${n}" value="${escHtml(f.v)}" placeholder="${f.type === "amt" ? "0,00" : "–"}">`}${f.type === "amt" ? "<em>€</em>" : ""}</label>`
      )
      .join("")}</div>
      ${R.type === "inv" ? `<label class="crchk"><input type="checkbox" data-crbook ${R.book ? "checked" : ""}> Als Ausgabe buchen</label><label class="crchk"><input type="checkbox" data-crterm ${R.term ? "checked" : ""}> Termin am Fälligkeitstag eintragen</label>` : ""}`;
    btn = `<button class="btn primary" data-cr="ok">Bestätigen</button>`;
  } else {
    const n = R.rows.filter((r) => r.on).length;
    body = `<div class="crlbl">${R.rows.length ? "Übernehmen – Haken weg = überspringen" : "Keine Buchungen erkannt – gerade, hell und scharf fotografieren"}</div><div class="crf">${R.rows
      .map(
        (
          r,
          i
        ) => `<div class="crtx ${R.sel === i ? "act" : ""} ${r.on ? "" : "off"}" data-crrow="${i}"><input type="checkbox" data-crtog="${i}" ${r.on ? "checked" : ""} aria-label="Übernehmen">
      <span class="d">${escHtml(r.d ? r.d.slice(8, 10) + "." + r.d.slice(5, 7) + "." : "")}</span><span class="n">${escHtml(String(r.r[1] || r.r[2] || "").slice(0, 40))}${r.dup ? `<small class="warnt">schon gebucht</small>` : ""}</span>
      <input class="a ${r.v < 0 ? "neg" : "pos"}" inputmode="decimal" data-cramt="${i}" value="${escHtml((r.v < 0 ? "-" : "") + Math.abs(r.v).toFixed(2).replace(".", ","))}"></div>`
      )
      .join("")}</div>`;
    btn = `<button class="btn" data-cr="more">Weitere Seite</button><button class="btn primary" data-cr="ok" ${n ? "" : "disabled"}>${n} übernehmen</button>`;
  }
  el.innerHTML = `<div class="crin"><div class="crh"><b>${R.f ? "Stimmt das so?" : plural(R.rows.length, "Buchung gefunden", "Buchungen gefunden")}</b><button class="camx2" data-cr="close" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="crtypes">${pills}</div>
    <div class="crshot"><div class="crpic" style="aspect-ratio:${R.W}/${R.H}"><img src="${R.img}" alt="Foto"><svg viewBox="0 0 ${R.W} ${R.H}" preserveAspectRatio="none">${camBoxes()}</svg></div></div>
    ${body}<div class="crbtns"><button class="btn" data-cr="again">Nochmal</button>${btn}</div></div>`;
}
function camRevClose() {
  const el = $("camRev");
  if (el) {
    el.hidden = true;
    el.innerHTML = "";
  }
  document.body.classList.remove("locked");
}
async function camConfirm() {
  const R = CAM.R;
  if (R.f) {
    const g = (k) => (R.f.find((f) => f.k === k) || {}).v || "";
    const amount = parseAmt(g("amount"));
    if (!(amount > 0)) {
      toast("Bitte einen Betrag eintragen");
      return;
    }
    const date = g("date") || isoToday(),
      shop = g("shop").trim(),
      nr = g("nr").trim(),
      due = g("due");
    let id = null;
    if (R.type === "rcpt" || R.book) {
      id = mem ? newId() : db.collection("tx").doc().id;
      const doc = {
        date,
        amount: round2(amount),
        kind: "ausgabe",
        cat: g("cat") || "",
        note: R.type === "inv" ? [shop, nr ? "Rechnung " + nr : "Rechnung"].filter(Boolean).join(" · ") : shop,
        ts: Date.now(),
      };
      if (R.type === "rcpt" && g("pay") === "bar") {
        doc.pay = "bar";
        if (!cashOn()) await cashActivate(date < isoToday() ? date : isoToday(), null);
      }
      if (R.type === "rcpt")
        try {
          const its = receiptItems(R.lines);
          if (its.length) {
            doc.items = its.map((i) => ({
              r: i.n,
              p: i.p,
            }));
            const sid = zaShopId(shop);
            if (sid) doc.ishop = sid;
          }
        } catch (e) {}
      if (!(await safe(() => saveTxDoc(id, doc, null)))) return;
      try {
        await rcptPut(id, R.img);
      } catch (e) {}
      if (R.type === "rcpt")
        try {
          rememberPrices(shop, date, receiptItems(R.lines));
        } catch (e) {}
    }
    if (R.type === "inv" && R.term && due) {
      const j = jlCfg();
      j.terms.push({
        id: newId(),
        n: `Rechnung ${shop || ""} bezahlen`.replace(/\s+/g, " ").trim(),
        d: due,
        t: "",
      });
      await saveSettings();
    }
    camRevClose();
    if (date.slice(0, 7) !== ui.ym) {
      ui.ym = date.slice(0, 7);
    }
    render();
    toast(
      id
        ? `${fmtEur(amount)} gespeichert${R.type === "inv" && R.term && due ? " · Termin eingetragen" : ""}`
        : "Termin eingetragen",
      id ? () => safe(() => delTxDoc(store.tx.find((t) => t.id === id))) : null
    );
    return;
  }
  const rows = R.rows
    .filter((r) => r.on)
    .map((r) => {
      const x = [...r.r];
      x[3] = r.v;
      return x;
    });
  const pages = [...(CAM.pages || []), R.lines],
    prevRaw = CAM.raw || [];
  const raw = [...prevRaw, ...rows],
    allLines = pages.flatMap((o, i) => ocrToStmtLines(o, i + 1));
  ui.imp = {
    fileName: `Foto-Kontoauszug · ${pages.length} ${pages.length === 1 ? "Seite" : "Seiten"}`,
    headers: ["Datum", "Empfänger", "Verwendungszweck", "Betrag", "Buchungsart"],
    raw: raw.slice(0, 2000),
    map: {
      date: 0,
      payee: 1,
      payer: -1,
      ref: 2,
      amount: 3,
      type: 4,
      account: -1,
      status: -1,
      sh: -1,
      soll: -1,
      haben: -1,
      paypal: false,
    },
    items: null,
    pdf: true,
    photo: true,
    pages,
    bal: stmtBalances(allLines),
  };
  CAM.pages = null;
  CAM.raw = null;
  camRevClose();
  buildItems();
  ui.view = "import";
  render();
  window.scrollTo({
    top: 0,
  });
}
document.addEventListener("click", (e) => {
  const t = e.target;
  const c = t.closest("[data-cam]");
  if (c) {
    const a = c.dataset.cam;
    if (a === "close") camStop();
    else if (a === "shoot") camShoot();
    else if (a === "gallery") camGallery();
    return;
  }
  const ct = t.closest("[data-camtype]");
  if (ct) {
    CAM.forced = CAM.forced === ct.dataset.camtype ? null : ct.dataset.camtype;
    camChip();
    return;
  }
  const R = CAM.R;
  if (!R || !t.closest("#camRev")) return;
  const ty = t.closest("[data-crtype]");
  if (ty) {
    if (ty.dataset.crtype !== R.type) {
      R.type = ty.dataset.crtype;
      camReview(R);
    }
    return;
  }
  const cr = t.closest("[data-cr]");
  if (cr) {
    const a = cr.dataset.cr;
    if (a === "close") camRevClose();
    else if (a === "again") {
      camRevClose();
      smartScan(CAM.opts);
    } else if (a === "more") {
      CAM.pages = [...(CAM.pages || []), R.lines];
      CAM.raw = [
        ...(CAM.raw || []),
        ...R.rows
          .filter((r) => r.on)
          .map((r) => {
            const x = [...r.r];
            x[3] = r.v;
            return x;
          }),
      ];
      camRevClose();
      smartScan({
        type: "stmt",
      });
    } else if (a === "ok") camConfirm();
    return;
  }
  const tg = t.closest("[data-crtog]");
  if (tg) {
    const n = +tg.dataset.crtog;
    R.rows[n].on = tg.checked;
    R.sel = n;
    camRevRender();
    return;
  }
  const f = t.closest("[data-crf],[data-crrow]");
  if (f) {
    const n = +(f.dataset.crf ?? f.dataset.crrow);
    if (R.sel !== n) camHi(n);
  }
});
document.addEventListener("change", (e) => {
  const R = CAM.R;
  if (!R || !e.target.closest("#camRev")) return;
  const t = e.target;
  if (t.matches("[data-crbook]")) R.book = t.checked;
  else if (t.matches("[data-crterm]")) R.term = t.checked;
  else if (t.matches("[data-crv]")) R.f[+t.dataset.crv].v = t.value;
  else if (t.matches("[data-cramt]")) {
    const r = R.rows[+t.dataset.cramt],
      s = t.value.trim(),
      v = parseAmt(s.replace(/^[-−]/, ""));
    if (v > 0) r.v = (/^[-−]/.test(s) ? -1 : 1) * v;
    t.value = (r.v < 0 ? "-" : "") + Math.abs(r.v).toFixed(2).replace(".", ",");
  }
});
document.addEventListener("focusin", (e) => {
  const R = CAM.R;
  if (!R) return;
  const f = e.target.closest("#camRev [data-crf],#camRev [data-crrow]");
  if (f) {
    const n = +(f.dataset.crf ?? f.dataset.crrow);
    if (R.sel !== n) camHi(n);
  }
});
document.addEventListener("input", (e) => {
  const R = CAM.R;
  if (!R || !e.target.matches("#camRev [data-crv]")) return;
  R.f[+e.target.dataset.crv].v = e.target.value;
});
function stmtCheck(imp) {
  const b = imp.bal || {};
  if (b.oldB == null || b.newB == null)
    return `<div class="notice info" style="margin-top:14px"><span>Auf dem Foto wurde kein <b>alter und neuer Kontostand</b> gefunden – dann kann die App nicht nachrechnen. Prüf die Liste bitte selbst.</span></div>`;
  const sum = round2((imp.raw || []).reduce((a, r) => a + (Number(r[3]) || 0), 0)),
    diff = round2(b.newB - (b.oldB + sum));
  if (Math.abs(diff) < 0.01)
    return `<div class="notice ok" style="margin-top:14px"><span>✓ <b>Alles erkannt.</b> Alter Stand ${escHtml(fmtEur(b.oldB))} + Buchungen ${escHtml(fmtEur(sum))} = neuer Stand ${escHtml(fmtEur(b.newB))}.</span></div>`;
  return `<div class="notice warn" style="margin-top:14px"><span><b>Es fehlen noch ${escHtml(fmtEur(Math.abs(diff)))}</b> ${diff < 0 ? "(zu viel abgezogen)" : ""}. Alter Stand ${escHtml(fmtEur(b.oldB))} + erkannte Buchungen ${escHtml(fmtEur(sum))} ergibt ${escHtml(fmtEur(b.oldB + sum))}, auf dem Auszug steht ${escHtml(fmtEur(b.newB))}. Vermutlich wurde eine Zeile nicht erkannt oder ein Betrag falsch gelesen – Beträge prüfen oder die fehlende Buchung danach von Hand eintragen. Hat der Auszug mehrere Seiten? Dann die nächste dazu fotografieren.</span></div>`;
}
async function loadPdf(file) {
  toast("PDF wird gelesen …");
  let rows;
  let pp = false;
  let L0 = [];
  try {
    const L = await pdfLines(await file.arrayBuffer());
    L0 = L;
    pp =
      /paypal/i.test(file.name || "") ||
      /transaktionscode|transaktions-id|paypal[- ]?(kontoauszug|konto\b)|paypal \(europe\)[^\n]{0,40}(kontoauszug|aktivit)/i.test(
        L.filter((l) => l.page === 1)
          .slice(0, 14)
          .map((l) => l.text)
          .join("\n")
      );
    rows = pdfStatementRows(L);
  } catch (e) {
    toast(
      e && /PDF-Leser/.test(e.message)
        ? e.message
        : e && e.name === "PasswordException"
          ? "Die PDF ist mit Passwort geschützt"
          : "Die PDF konnte nicht gelesen werden"
    );
    return;
  }
  if (!rows.length) {
    toast("In der PDF wurden keine Buchungen gefunden. Am sichersten ist der CSV-Export deiner Bank.");
    return;
  }
  /* Auszüge mit Unterkonten (z. B. N26-Spaces): jede Seite gehört zu „Space: …“ oder zum Hauptkonto */
  const PA = pdfPageAccts(L0),
    multi = !pp && Object.values(PA).some((a) => a !== "Hauptkonto"),
    acc0 = pp ? "" : pdfAcct(L0);
  for (const r of rows) {
    const pg = r[5];
    r[5] = pp ? "" : multi ? PA[pg] || "Hauptkonto" : acc0;
  }
  const headers = ["Datum", "Empfänger", "Verwendungszweck", "Betrag", "Buchungsart", "Konto"];
  ui.imp = {
    fileName: file.name,
    headers,
    raw: rows.slice(0, 2000),
    map: {
      date: 0,
      payee: 1,
      payer: -1,
      ref: 2,
      amount: 3,
      type: 4,
      account: pp ? -1 : 5,
      status: -1,
      sh: -1,
      soll: -1,
      haben: -1,
      paypal: pp,
    },
    items: null,
    pdf: true,
  };
  buildItems();
  /* Kontostände: Buchungen zählen zum Konto, Endstände aus dem Auszug werden übernommen */
  if (!pp) {
    try {
      for (const it of ui.imp.items || []) if (!it.acct) it.acct = acc0 || "Hauptkonto";
      recordAccounts(ui.imp.items);
      ui.imp.balMsg = pdfBalsApply(pdfBalances(L0, PA, multi ? null : acc0), pdfEndDate(L0), ui.imp.items);
    } catch (e) {
      console.warn("pdf-bal", e);
    }
  }
  ui.view = "import";
  render();
  window.scrollTo({
    top: 0,
  });
  if (ui.imp && ui.imp.balMsg) setTimeout(() => toast(ui.imp.balMsg, null, null, 5200), 900);
}
function pdfPageAccts(L) {
  const out = {};
  for (const l of L || []) {
    const m = String(l.text || "")
      .replace(/\s+/g, " ")
      .trim()
      .match(/^Space:\s*(.{1,40})$/i);
    if (m && !out[l.page]) out[l.page] = m[1].trim();
  }
  const pages = [...new Set((L || []).map((l) => l.page))];
  for (const p of pages) if (!out[p]) out[p] = "Hauptkonto";
  return out;
}
function pdfEndDate(L) {
  const T = (L || [])
      .slice(0, 80)
      .map((l) => String(l.text || ""))
      .join(" "),
    m = T.match(/(?:bis|–|-)\s*(\d{1,2}\.\d{1,2}\.\d{4})/);
  return m ? bsDate(m[1]) : null;
}
/* Endstände je Konto: bei Unterkonten der Stand auf der Seite des jeweiligen Kontos */
function pdfBalances(L, PA, single) {
  if (single) {
    const b = pdfBalance(L);
    return b
      ? [
          {
            acc: single,
            ...b,
          },
        ]
      : [];
  }
  const by = {};
  for (const l of L || []) (by[l.page] = by[l.page] || []).push(l);
  const res = {};
  for (const [pg, ls] of Object.entries(by)) {
    const b = pdfBalance(ls);
    if (b) res[PA[pg] || "Hauptkonto"] = b;
  }
  return Object.entries(res).map(([acc, b]) => ({
    acc,
    ...b,
  }));
}
function pdfBalsApply(list, end, items) {
  if (!list.length) {
    const ds = (items || [])
      .map((i) => i.date)
      .filter(Boolean)
      .sort();
    return ds.length
      ? uiText("pdf_bal_rows", {
          a: [...new Set((items || []).map((i) => i.acct).filter(Boolean))].join(", "),
        })
      : "";
  }
  const ds = (items || [])
      .map((i) => i.date)
      .filter(Boolean)
      .sort(),
    last = ds[ds.length - 1] || null,
    set = [],
    old = [];
  for (const b of list) {
    let date = end || (b.date && (!last || b.date >= last) ? b.date : last || isoToday());
    const AN = {
        ...(store.settings.accountAnchors || {}),
      },
      a = AN[b.acc];
    if (date > isoToday()) date = isoToday();
    if (a && a.date > date) {
      old.push(b.acc);
      continue;
    }
    AN[b.acc] = {
      date,
      balance: round2(b.v),
      ts: Date.now(),
      src: "pdf",
    };
    store.settings.accountAnchors = AN;
    set.push(`${b.acc} ${fmtEur(b.v)}`);
  }
  if (set.length) saveSettings();
  return set.length
    ? uiText("pdf_bals_set", {
        l: set.join(" · "),
        d: shortDate(end || last || isoToday()),
      })
    : old.length
      ? uiText("pdf_bal_old", {
          a: old.join(", "),
          d: shortDate(end || last || isoToday()),
          e: shortDate((store.settings.accountAnchors || {})[old[0]].date),
        })
      : "";
}
/* Endstand („Neuer Kontostand“, „Saldo am …“) aus dem PDF-Text lesen */
function pdfBalance(L) {
  const T = (L || [])
    .map((l) =>
      String(l.text || "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
  let best = null;
  const KEY =
      /(neuer|aktueller|end|schluss)[-\s]*(kontostand|saldo)|(kontostand|saldo)\s*(am|per|zum|vom)\b|endsaldo|schlusssaldo|^\s*kontostand\b|^\s*saldo\b/i,
    OLD =
      /(alter|vorheriger|anfangs|letzter|bisheriger|start)[-\s]*(kontostand|saldo)|(kontostand|saldo)\s*alt\b|übertrag|vortrag/i,
    AM = /(-|−|minus)?\s*(\d{1,3}(?:\.\d{3})+|\d{1,9}),(\d{2})(?!\d)\s*(-(?!\d)|S\b|Soll\b|H\b|Haben\b)?/gi;
  const pick = (t) => {
    let m,
      last = null;
    AM.lastIndex = 0;
    while ((m = AM.exec(t))) last = m;
    if (!last) return null;
    const v = Number(last[2].replace(/\./g, "") + "." + last[3]);
    const neg = !!last[1] || /^(-|s|soll)$/i.test(last[4] || "");
    return (neg ? -1 : 1) * v;
  };
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (!KEY.test(t) || OLD.test(t)) continue;
    const tt = t.replace(/\d{1,2}\.\d{1,2}\.\d{2,4}/g, " ");
    let v = pick(tt);
    if (v === null && T[i + 1]) v = pick(T[i + 1].replace(/\d{1,2}\.\d{1,2}\.\d{2,4}/g, " "));
    if (v === null) continue;
    best = {
      v,
      date: bsDate(t) || null,
    };
  }
  return best;
}
/* Welches Konto? Über die IBAN im Auszug wiedererkennen, sonst Hauptkonto */
function pdfAcct(L) {
  const tx = (L || [])
      .slice(0, 60)
      .map((l) => l.text || "")
      .join(" ")
      .replace(/\s+/g, ""),
    m = tx.match(/DE\d{20}/);
  const map = store.settings.ibanAcct || {};
  if (m && map[m[0]]) return map[m[0]];
  if (m) {
    store.settings.ibanAcct = {
      ...map,
      [m[0]]: "Hauptkonto",
    };
  }
  return "Hauptkonto";
}
function pdfBalApply(acc, b, items) {
  const ds = (items || [])
      .map((i) => i.date)
      .filter(Boolean)
      .sort(),
    last = ds[ds.length - 1] || null;
  if (!b || !isFinite(b.v))
    return last
      ? uiText("pdf_bal_rows", {
          a: acc,
        })
      : "";
  const date = b.date && (!last || b.date >= last) ? b.date : last || isoToday();
  const AN = {
      ...(store.settings.accountAnchors || {}),
    },
    a = AN[acc];
  if (a && a.date > date)
    return uiText("pdf_bal_old", {
      a: acc,
      d: shortDate(date),
      e: shortDate(a.date),
    });
  AN[acc] = {
    date,
    balance: round2(b.v),
    ts: Date.now(),
    src: "pdf",
  };
  store.settings.accountAnchors = AN;
  saveSettings();
  return uiText("pdf_bal_set", {
    a: acc,
    v: fmtEur(b.v),
    d: shortDate(date),
  });
}
async function loadCsv(file) {
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) {
    toast("Die Datei ist zu groß");
    return;
  }
  if (/\.pdf$/i.test(file.name || "") || file.type === "application/pdf") return loadPdf(file);
  if (file.size > 5 * 1024 * 1024) {
    toast("Die Datei ist zu groß");
    return;
  }
  let rows;
  try {
    rows = parseCSV(await readFileText(file));
  } catch (e) {
    toast("Die Datei konnte nicht gelesen werden");
    return;
  }
  if (/^%PDF/.test(String((rows[0] && rows[0][0]) || ""))) return loadPdf(file);
  if (rows.length < 2) {
    toast("In der Datei sind keine Buchungen");
    return;
  }
  const score = (r) => {
    if (r.some((c) => String(c).length > 60)) return -1;
    const h = r.map(normText);
    let n = 0;
    for (const g of Object.values(COLS)) {
      if (g.some((c) => h.includes(c))) n += 2;
      else if (g.some((c) => h.some((x) => x.includes(c)))) n += 1;
    }
    return n;
  };
  let hi = -1,
    best = 0;
  rows.slice(0, 60).forEach((r, i) => {
    if (findCol(r, COLS.date) < 0 || findCol(r, COLS.amount) < 0) return;
    const sc = score(r);
    if (sc > best) {
      best = sc;
      hi = i;
    }
  });
  if (hi < 0) hi = 0;
  const headers = rows[hi];
  const map = {
    date: findCol(headers, COLS.date),
    payee: findCol(headers, COLS.payee),
    payer: findCol(headers, COLS.payer),
    ref: findCol(headers, COLS.ref),
    amount: findCol(headers, COLS.amount),
    type: findCol(headers, COLS.type),
    account: findCol(headers, COLS.account),
    status: findCol(headers, COLS.status),
    sh: findCol(headers, COLS.sh),
  };
  const hn = headers.map(normText);
  map.soll = hn.indexOf("soll");
  map.haben = hn.indexOf("haben");
  if (map.amount < 0 && map.soll >= 0 && map.haben >= 0) map.amount = map.soll;
  if (map.payee < 0) {
    const i = hn.findIndex((h) => h === "beschreibung" || h === "description");
    if (i >= 0 && i !== map.ref) map.payee = i;
  }
  if (
    [map.payee, map.payer, map.ref, map.date].includes(map.account) ||
    (/iban|kontonummer/.test(hn[map.account] || "") && !/inhaber|auftragskonto/.test(hn[map.account] || ""))
  )
    map.account = -1;
  if (map.payer === map.payee) map.payer = -1;
  map.paypal = hn.includes("transaktionscode") || hn.includes("transaction id");
  ui.imp = {
    fileName: file.name,
    headers,
    raw: rows.slice(hi + 1, hi + 1 + 2000),
    map,
    items: null,
  };
  buildItems();
  recordAccounts(ui.imp.items);
  ui.view = "import";
  render();
  window.scrollTo({
    top: 0,
  });
}

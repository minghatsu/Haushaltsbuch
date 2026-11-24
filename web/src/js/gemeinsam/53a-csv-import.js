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

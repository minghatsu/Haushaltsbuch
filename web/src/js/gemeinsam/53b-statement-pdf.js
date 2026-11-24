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
      .map((i) => {
        /* in Seitenkoordinaten umrechnen: so stimmen Zeilenfolge und Spalten auch bei Seiten, deren
           Inhalt intern gespiegelt oder gedreht ist (manche Rechnungsprogramme schreiben PDFs so) */
        const t = lib.Util.transform(vp.transform, i.transform);
        return {
          x: t[4],
          y: vp.height - t[5],
          w: i.width || 0,
          h: Math.hypot(t[2], t[3]) || 8,
          s: i.str,
        };
      });
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

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
        due = isoOf(d);
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

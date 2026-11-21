/* Belege */
function rcptName(t) {
  if (!t) return "beleg.jpg";
  const n =
    String(txPayee(t) || t.cat || "beleg")
      .replace(/[^A-Za-z0-9ÄÖÜäöüß]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || "beleg";
  return `${t.date}_${n}_${String(Number(t.amount).toFixed(2)).replace(".", ",")}.jpg`;
}
function rcptCanShare() {
  return !!(
    (window.AndroidBridge && (window.AndroidBridge.shareImage || window.AndroidBridge.saveFileB64)) ||
    (navigator.canShare && !NATIVE)
  );
}
async function rcptShare(img, name) {
  if (!img) return;
  const b64 = img.split(",")[1] || "";
  if (window.AndroidBridge && window.AndroidBridge.shareImage) {
    try {
      AndroidBridge.shareImage(b64, name);
    } catch (e) {
      toast("Teilen hat nicht geklappt");
    }
    return;
  }
  if (window.AndroidBridge && window.AndroidBridge.saveFileB64) {
    try {
      toast(
        AndroidBridge.saveFileB64(name, "image/jpeg", b64)
          ? "Beleg in Downloads gespeichert"
          : "Speichern hat nicht geklappt"
      );
    } catch (e) {
      toast("Speichern hat nicht geklappt");
    }
    return;
  }
  try {
    const bl = await (await fetch(img)).blob();
    const f = new File([bl], name, {
      type: "image/jpeg",
    });
    if (
      navigator.canShare &&
      navigator.canShare({
        files: [f],
      })
    )
      await navigator.share({
        files: [f],
        title: "Beleg",
      });
  } catch (e) {}
}
const CRC_T = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function makeZip(files) {
  const enc = new TextEncoder(),
    parts = [],
    central = [];
  let off = 0;
  const u16 = (v) => [v & 255, (v >>> 8) & 255],
    u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  const d = new Date(),
    dt = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    dd = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name),
      data = f.data,
      crc = crc32(data);
    const head = new Uint8Array([
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...u16(dt),
      ...u16(dd),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(name.length),
      ...u16(0),
    ]);
    parts.push(head, name, data);
    central.push(
      new Uint8Array([
        ...u32(0x02014b50),
        ...u16(20),
        ...u16(20),
        ...u16(0x0800),
        ...u16(0),
        ...u16(dt),
        ...u16(dd),
        ...u32(crc),
        ...u32(data.length),
        ...u32(data.length),
        ...u16(name.length),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(0),
        ...u32(off),
      ]),
      name
    );
    off += head.length + name.length + data.length;
  }
  const csize = central.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(files.length),
    ...u16(files.length),
    ...u32(csize),
    ...u32(off),
    ...u16(0),
  ]);
  return new Blob([...parts, ...central, end], {
    type: "application/zip",
  });
}
function b64bytes(dataUrl) {
  const s = atob(dataUrl.split(",")[1] || "");
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}
async function saveBinary(name, blob, okMsg) {
  const br = window.AndroidBridge;
  if (br && br.saveFileB64) {
    const b64 = await new Promise((r) => {
      const fr = new FileReader();
      fr.onload = () => r(String(fr.result).split(",")[1] || "");
      fr.readAsDataURL(blob);
    });
    const ok = br.saveFileB64(name, blob.type, b64);
    toast(ok ? okMsg + " (Downloads)" : "Datei konnte nicht gespeichert werden");
    return;
  }
  if (NATIVE) {
    toast("Bitte die App aktualisieren, um ZIP-Dateien zu speichern");
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
  toast(okMsg);
}
async function belegeZip(year) {
  const txs = store.tx
    .filter((t) => t.date && t.date.startsWith(year) && hasReceipt(t.id))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!txs.length) {
    toast(`Für ${year} sind keine Belege gespeichert`);
    return;
  }
  toast(txs.length === 1 ? "1 Beleg wird gepackt …" : `${txs.length} Belege werden gepackt …`);
  const files = [],
    used = new Set(),
    rows = [["Datum", "Art", "Kategorie", "Beschreibung", "Betrag (€)", "Datei"]];
  for (const t of txs) {
    const img = await rcptGet(t.id);
    if (!img) continue;
    let nm = rcptName(t),
      k = 2;
    while (used.has(nm)) nm = nm.replace(/(\(\d+\))?\.jpg$/, `(${k++}).jpg`);
    used.add(nm);
    const folder = t.kind === "betrieb" ? "betrieblich/" : "privat/";
    files.push({
      name: folder + nm,
      data: b64bytes(img),
    });
    rows.push([
      t.date.split("-").reverse().join("."),
      t.kind === "betrieb" ? "betrieblich" : t.kind === "einnahme" ? "Einnahme" : "privat",
      t.cat || "",
      txPayee(t) || "",
      Number(t.amount).toFixed(2).replace(".", ","),
      folder + nm,
    ]);
  }
  const csv =
    "﻿" +
    rows
      .map((r) =>
        r
          .map((v) => {
            v = csvSafe(v);
            return /[";\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v;
          })
          .join(";")
      )
      .join("\r\n");
  files.unshift({
    name: "Belege-Liste.csv",
    data: new TextEncoder().encode(csv),
  });
  await saveBinary(`Belege-${year}.zip`, makeZip(files), `${files.length - 1} Belege gespeichert`);
}
ui.belegF = ui.belegF || "alle";
function renderBelege() {
  ui.view = "list";
  ui.filter = "mitbeleg";
  setTimeout(render, 0);
  return;
}
function renderBelegeOld() {
  const ym = ui.ym,
    y = ym.slice(0, 4);
  const tx = monthCalc(ym).tx.filter((t) => t.kind !== "vorauszahlung");
  const withR = tx.filter((t) => hasReceipt(t.id)),
    betNo = tx.filter((t) => t.kind === "betrieb" && !hasReceipt(t.id));
  const f = ui.belegF;
  const shown = f === "ohne" ? betNo : withR.filter((t) => f !== "betrieb" || t.kind === "betrieb");
  const yearN = store.tx.filter((t) => t.date && t.date.startsWith(y) && hasReceipt(t.id)).length;
  const chips = hasSelf()
    ? [
        ["alle", "Alle"],
        ["betrieb", "Betrieblich"],
        ["ohne", betNo.length ? `Ohne Beleg (${betNo.length})` : "Ohne Beleg"],
      ]
    : [];
  $("v-belege").innerHTML = `
    <div class="belhead"><button class="spback" data-go="list" aria-label="Zurück zu den Buchungen">‹</button><span class="small muted">${escHtml(MONTHS[Number(ym.slice(5, 7)) - 1])} ${y} · ${withR.length} ${withR.length === 1 ? "Beleg" : "Belege"}</span></div>
    ${chips.length ? "" : `<span></span>`}<div class="filters" ${chips.length ? "" : "hidden"}>${chips.map(([k, l]) => `<button class="fchip" data-belf="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
    ${f === "ohne" ? (betNo.length ? `<div class="card">${betNo.map((t) => tlRow(t, shortDate(t.date))).join("")}</div><p class="small muted" style="margin:0 4px">Antippen und unter „Beleg“ ein Foto hinzufügen.</p>` : emptyState("check", "Alles belegt", "Jede betriebliche Ausgabe in diesem Monat hat einen Beleg.")) : shown.length ? `<div class="belgal">${shown.map((t) => `<button class="belg" data-edit="${escHtml(t.id)}"><span class="bimg"><img data-rimg="${escHtml(t.id)}" alt=""></span><b>${escHtml(txPayee(t) || t.cat || "Beleg")}</b><small>${escHtml(fmtEur(t.amount))} · ${escHtml(shortDate(t.date))}${t.kind === "betrieb" ? " · betriebl." : ""}</small></button>`).join("")}</div>` : emptyState("camera", f === "betrieb" ? "Keine betrieblichen Belege" : "Noch keine Belege", "Fotografiere eine Quittung über den Plus-Knopf – das Foto bleibt an der Buchung.")}
    ${hasSelf() && betNo.length && f !== "ohne" ? `<div class="notice warn"><span>${betNo.length} betriebliche ${betNo.length === 1 ? "Ausgabe hat" : "Ausgaben haben"} noch keinen Beleg – für die Steuer am besten nachfotografieren.</span><button class="btn" data-belf="ohne">Anzeigen</button></div>` : ""}
    <div class="card"><div class="card-head"><h2>${svgIcon("doc")} Belege ${y} sichern</h2></div><p class="small muted" style="margin:-4px 0 10px">Alle ${yearN} Belege des Jahres als ZIP${hasSelf() ? ", sortiert nach privat und betrieblich," : ""} mit einer Liste${hasSelf() ? " für den Steuerberater" : ""}.</p><button class="btn primary" id="belZip" ${yearN ? "" : "disabled"}>Als ZIP speichern</button></div>`;
  (async () => {
    for (const im of document.querySelectorAll("#v-belege img[data-rimg]")) {
      const src = await rcptGet(im.dataset.rimg);
      if (src && im.isConnected) im.src = src;
    }
  })();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-belf]");
  if (b) {
    ui.belegF = b.dataset.belf;
    renderBelege();
    return;
  }
  if (e.target.closest("#belZip")) belegeZip(ui.ym.slice(0, 4));
});

/* Gehalt */
const SLIP_F = [
  ["brutto", "Bruttolohn"],
  ["netto", "Auszahlung"],
  ["lst", "Lohnsteuer"],
  ["soli", "Soli"],
  ["kist", "Kirchensteuer"],
  ["kv", "Kranken + Pflege"],
  ["rv", "Rente + Arbeitslos."],
];
const MON_RE = "januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember";
function slipParse(lines, fallbackYm) {
  const txt = lines.map((l) => (l.text || l.t || "").replace(/\s+/g, " ")),
    r = {};
  const amts = (t) =>
    [...t.matchAll(/(-?\d{1,3}(?:\.\d{3})*,\d{2})(?!\s?%)/g)].map((m) =>
      Number(m[1].replace(/\./g, "").replace(",", "."))
    );
  const take = (k, re, not) => {
    if (r[k] != null) return;
    for (let i = 0; i < txt.length; i++) {
      const t = txt[i].toLowerCase();
      if (!re.test(t) || (not && not.test(t))) continue;
      let a = amts(txt[i]);
      if (!a.length && txt[i + 1]) a = amts(txt[i + 1]);
      if (a.length) {
        r[k] = Math.abs(a[a.length - 1]);
        return;
      }
    }
  };
  take("brutto", /gesamt-?\s?brutto|summe brutto|brutto gesamt/);
  take("brutto", /steuer-?\s?brutto|steuerpflichtig/);
  take("brutto", /bruttolohn|bruttoverdienst|brutto-?bez(ü|ue)ge|\bbrutto\b/, /sv-?\s?brutto|netto/);
  take("lst", /lohnsteuer|\blst\b/, /klasse|tabelle|identifikation|brutto|jahres|kirche/);
  take("soli", /solidarit|\bsoli\b|\bsolz\b/);
  take("kist", /kirchensteuer|\bkist\b|kirche (ev|rk|kath)/, /merkmal|konfession/);
  let kv = null,
    pv = null,
    rv = null,
    av = null;
  const one = (re, not) => {
    for (const l of txt) {
      const t = l.toLowerCase();
      if (re.test(t) && !(not && not.test(t))) {
        const a = amts(l);
        if (a.length) return Math.abs(a[a.length - 1]);
      }
    }
    return null;
  };
  kv = one(/krankenvers|\bkv\b|kv-beitrag/, /arbeitgeber|ag-anteil/);
  pv = one(/pflegevers|\bpv\b|pv-beitrag/, /arbeitgeber|ag-anteil/);
  rv = one(/rentenvers|\brv\b|rv-beitrag/, /arbeitgeber|ag-anteil/);
  av = one(/arbeitslosenvers|\bav\b|av-beitrag/, /arbeitgeber|ag-anteil/);
  if (kv != null || pv != null) r.kv = round2((kv || 0) + (pv || 0));
  if (rv != null || av != null) r.rv = round2((rv || 0) + (av || 0));
  take("netto", /auszahlung|überweisung|ueberweisung|zahlbetrag/);
  take("netto", /nettoverdienst|netto-?bez(ü|ue)ge|nettolohn|\bnetto\b/, /brutto/);
  if (r.netto == null && r.brutto != null)
    r.netto = round2(r.brutto - (r.lst || 0) - (r.soli || 0) - (r.kist || 0) - (r.kv || 0) - (r.rv || 0));
  let ym = null;
  const all = txt.join(" \n ").toLowerCase();
  const m1 = all.match(new RegExp("(" + MON_RE + ")\\s*(20\\d\\d)"));
  if (m1) {
    const names = MON_RE.split("|").filter((x) => x !== "maerz");
    let mi = names.indexOf(m1[1] === "maerz" ? "märz" : m1[1]);
    ym = m1[2] + "-" + pad(mi + 1);
  }
  if (!ym) {
    const m2 = all.match(/(?:abrechnung|monat|zeitraum|periode)[^\n\d]{0,25}(0[1-9]|1[0-2])\s?[\/.\-]\s?(20\d\d)/);
    if (m2) ym = m2[2] + "-" + m2[1];
  }
  return {
    ym: ym || fallbackYm,
    v: r,
    found: Object.keys(r).filter((k) => k !== "netto" || true).length,
  };
}
function slipIncomeMatch(ym, netto) {
  if (!(netto > 0)) return null;
  const nx = shiftYm(ym, 1);
  return (
    store.tx
      .filter(
        (t) =>
          t.kind === "einnahme" &&
          (t.date.startsWith(ym) || t.date.startsWith(nx + "-0")) &&
          Math.abs(t.amount - netto) <= 1
      )
      .sort((a, b) => Math.abs(a.amount - netto) - Math.abs(b.amount - netto))[0] || null
  );
}
async function slipFromPdf(file) {
  try {
    toast("Abrechnung wird gelesen …");
    const lines = await pdfLines(await file.arrayBuffer());
    const p = slipParse(lines, ymOf(new Date()));
    ui.slipDraft = {
      ym: p.ym,
      v: p.v,
      file: file.name,
      auto: true,
    };
    ui.ym = p.ym;
    ui.view = "year";
    render();
    anaOpen("lohn");
    toast(
      Object.keys(p.v).length >= 3
        ? "Abrechnung gelesen – bitte kurz prüfen"
        : "Nicht alles erkannt – bitte die Felder ergänzen"
    );
  } catch (e) {
    toast("Die PDF konnte nicht gelesen werden");
  }
}
async function slipSave() {
  const d = ui.slipDraft;
  if (!d) return;
  const v = {};
  for (const [k] of SLIP_F) {
    const el = $("slip-" + k);
    const x = el && el.value.trim() !== "" ? parseAmt(el.value) : null;
    if (x != null && isFinite(x)) v[k] = round2(x);
  }
  const ym = $("slip-ym").value || d.ym;
  if (!(v.brutto > 0)) {
    toast("Bitte mindestens den Bruttolohn eintragen");
    return;
  }
  if (d.file) v.file = d.file;
  store.settings.slips = {
    ...(store.settings.slips || {}),
    [ym]: v,
  };
  const mt =
    $("slip-match") && $("slip-match").checked ? store.tx.find((t) => t.id === $("slip-match").dataset.id) : null;
  if (mt) {
    const lc = incCats().find((c) => c.art === "lohn");
    if (lc && mt.cat !== lc.name) {
      const doc = plainTx(mt);
      doc.cat = lc.name;
      await safe(() => saveTxDoc(mt.id, doc, mt));
    }
  }
  ui.slipDraft = null;
  await saveSettings();
  toast(`Abrechnung ${MONTHS[Number(ym.slice(5, 7)) - 1]} gespeichert`);
}
async function slipDelete(ym) {
  const s2 = {
    ...(store.settings.slips || {}),
  };
  delete s2[ym];
  store.settings.slips = s2;
  ui.slipDraft = null;
  await saveSettings();
  toast("Abrechnung entfernt");
}
function slipEditor() {
  const d = ui.slipDraft;
  if (!d) return "";
  const mt = slipIncomeMatch(d.ym, d.v.netto),
    lc = incCats().find((c) => c.art === "lohn");
  return `<div class="card slipdraft"><div class="card-head"><h2>${d.auto ? "Erkannt – bitte prüfen" : "Abrechnung eintragen"}</h2>${d.file ? `<span class="pill">${escHtml(d.file.length > 22 ? d.file.slice(0, 20) + "…" : d.file)}</span>` : ""}</div>
    <div class="field"><label for="slip-ym">Monat</label><input class="in" type="month" id="slip-ym" value="${escHtml(d.ym)}"></div>
    <div class="grid2 slipg">${SLIP_F.map(([k, l]) => `<div class="field"><label for="slip-${k}">${l} (€)</label><input class="in" id="slip-${k}" inputmode="decimal" value="${d.v[k] != null ? escHtml(numStr(d.v[k])) : ""}" placeholder="${k === "brutto" ? "Pflichtfeld" : "0"}"></div>`).join("")}</div>
    ${mt && lc ? `<div class="switch"><label for="slip-match"><b>Gehaltseingang ${escHtml(fmtEur(mt.amount))} am ${escHtml(shortDate(mt.date))}</b><br><span class="small muted">${mt.cat === lc.name ? "ist schon als Gehalt gebucht" : `„${escHtml(txPayee(mt) || mt.cat)}“ als ${escHtml(lc.name)} markieren`}</span></label><input type="checkbox" id="slip-match" data-id="${escHtml(mt.id)}" ${mt.cat === lc.name ? "checked disabled" : "checked"}></div>` : ""}
    <div class="row-btns" style="justify-content:flex-start"><button class="btn primary" id="slipSave">Übernehmen</button><button class="btn" id="slipCancel">Abbrechen</button>${(store.settings.slips || {})[d.ym] && !d.auto ? `<button class="btn danger" id="slipDel">Entfernen</button>` : ""}</div></div>`;
}
function lohnMonths(y) {
  const cur = ymOf(new Date()),
    sl = slipsOf(y),
    set = new Set(sl.map((x) => x.ym));
  let b = sum(sl, (x) => Number(x.brutto) || 0);
  for (let i = 1; i <= 12; i++) {
    const ym = y + "-" + pad(i);
    if (!set.has(ym) && ym <= cur && mindestYm(ym) > 0) {
      set.add(ym);
      b += mindestYm(ym);
    }
  }
  if (!set.size) {
    const lc = incCats()
      .filter((c) => c.art === "lohn")
      .map((c) => c.name);
    for (const t of store.tx)
      if (t.kind === "einnahme" && lc.includes(t.cat) && (t.date || "").startsWith(y + "-"))
        set.add(t.date.slice(0, 7));
  }
  set.brutto = Math.round(b);
  return set;
}
function lohnSection(y) {
  const sl = slipsOf(y),
    L = lohnYear(y),
    map = Object.fromEntries(sl.map((x) => [x.ym, x])),
    cur = ymOf(new Date());
  const lc = incCats()
      .filter((c) => c.art === "lohn")
      .map((c) => c.name),
    paidIn = store.tx.filter((t) => t.kind === "einnahme" && lc.includes(t.cat) && (t.date || "").startsWith(y + "-"));
  const estYm = Array.from(
      {
        length: 12,
      },
      (_, i) => y + "-" + pad(i + 1)
    ).filter((ym) => !map[ym] && ym <= cur && mindestYm(ym) > 0),
    estB = sum(estYm, (ym) => mindestYm(ym));
  const b = sum(sl, (x) => Number(x.brutto) || 0) + estB,
    l = sum(sl, (x) => (Number(x.lst) || 0) + (Number(x.soli) || 0) + (Number(x.kist) || 0));
  const n = sl.length && !estYm.length ? sum(sl, (x) => Number(x.netto) || 0) : sum(paidIn, (t) => t.amount);
  const months = Array.from(
    {
      length: 12,
    },
    (_, i) => {
      const ym = y + "-" + pad(i + 1),
        has = map[ym],
        past = ym < cur,
        e = !has && ym <= cur ? mindestYm(ym) : 0,
        brk = !has && mindPer().length && ym <= cur && !e;
      return `<button class="sm ${has ? "ok" : e ? "est" : brk ? "fut" : past && sl.length ? "miss" : "fut"}" data-slipm="${ym}" aria-label="${MONTHS[i]}${e ? `: geschätzt ${fmtEur0(e)} brutto` : ""}">${MONTHS[i].slice(0, 3)}${has ? " ✓" : e ? `<small>≈ ${escHtml(fmtEur0(e))}</small>` : brk ? "<small>–</small>" : past && sl.length ? " ?" : ""}</button>`;
    }
  ).join("");
  const missing = Array.from(
    {
      length: 12,
    },
    (_, i) => y + "-" + pad(i + 1)
  ).filter((ym) => ym < cur && !map[ym]);
  const tax = taxCalc(y);
  const md = store.settings.mindest || {},
    v = yearLimits(y),
    nx = YV[Number(y) + 1];
  const mindCard = `<div class="card flat mindc"><div class="switch" style="margin:0"><label for="aMind"><b>Ich bekomme Mindestlohn</b><br><span class="small muted">${md.on && md.h ? `${fmt2(v.ml)} € × ${numStr(md.h)} Std./Woche = <b>${escHtml(fmtEur0(mindestMonat(y)))}</b> brutto im Monat${nx ? ` · ab Januar ${Number(y) + 1}: ${fmt2(nx.ml)} € → ca. ${escHtml(fmtEur0(Math.round((nx.ml * md.h * 13) / 3)))}` : ""}` : `${y}: ${fmt2(v.ml)} € pro Stunde – dein Gehalt steigt dann jedes Jahr automatisch mit`}</span></label><input type="checkbox" id="aMind" ${md.on ? "checked" : ""}></div>
    ${
      md.on
        ? (mindPer().length
            ? `<div style="margin-top:10px"><b class="small">Stunden pro Woche – ab Monat</b>${mindPer()
                .map(
                  (x, i) =>
                    `<div class="mper"><input class="in" type="month" data-mper="${i}|ym" value="${escHtml(x.ym)}" aria-label="ab Monat"><input class="in" data-mper="${i}|h" inputmode="decimal" value="${escHtml(numStr(Number(x.h) || 0))}" aria-label="Stunden pro Woche" placeholder="0 = Pause"><button class="x" data-mperdel="${i}" aria-label="Zeitraum entfernen">×</button></div>`
                )
                .join(
                  ""
                )}<p class="small muted" style="margin:6px 0 0">0 Stunden = Pause. Vor dem ersten Monat zählt die App kein Gehalt.</p></div>`
            : `<div class="field" style="margin:10px 0 0"><label for="aMindH">Stunden pro Woche</label><input class="in" id="aMindH" inputmode="decimal" value="${md.h ? escHtml(numStr(md.h)) : ""}" placeholder="z. B. 40"></div>`) +
          `<button class="link small" data-mperadd="1" style="margin-top:8px">＋ Stunden geändert oder Pause</button>`
        : ""
    }</div>`;
  return `${slipEditor()}${mindCard}
    <div class="kpis k3"><div class="kpi"><small>Brutto bisher</small><b>${escHtml(fmtEur0(b))}</b><span><span>${sl.length} ${sl.length === 1 ? "Abrechnung" : "Abrechnungen"}</span>${estYm.length ? ` · <span>${estYm.length} geschätzt</span>` : ""}</span></div><div class="kpi"><small>Lohnsteuer</small><b>${escHtml(fmtEur0(l))}</b><span>inkl. Soli/KiSt</span></div><div class="kpi"><small>Netto</small><b>${escHtml(fmtEur0(n))}</b><span>${sl.length && !estYm.length ? "ausgezahlt" : `${paidIn.length} Gehaltseingänge`}</span></div></div>
    <div class="card flat"><div class="card-head"><h2>Abrechnungen ${y}</h2><span class="small muted">${sl.length} von 12 hochgeladen</span></div>
      <div class="smgrid">${months}</div>
      ${
        sl.length && missing.length
          ? `<div class="notice warn" style="margin-top:12px"><span>Für ${missing
              .slice(0, 4)
              .map((ym) => MONTHS[Number(ym.slice(5, 7)) - 1])
              .join(
                ", "
              )}${missing.length > 4 ? " …" : ""} fehlt die Abrechnung – die App schätzt ${missing.length === 1 ? "diesen Monat" : "diese Monate"} mit ${escHtml(fmtEur0(L.estMonth || 0))} brutto.</span></div>`
          : ""
      }
      ${!sl.length ? `<p class="small muted" style="margin:10px 0 0">Lade deine Lohnabrechnungen als PDF hoch – dann rechnet die Steuerschätzung mit deinem echten Lohn und der echten Lohnsteuer statt mit Schätzwerten.</p>` : ""}
      <div class="row-btns" style="justify-content:flex-start;margin-top:12px"><button class="btn primary" id="slipPdf">${svgIcon("doc", 16)} PDF hochladen</button><button class="btn" id="slipHand">Von Hand eintragen</button></div>
    </div>
    ${
      sl.length
        ? `<div class="card flat"><div class="card-head"><h2>Hochrechnung ${y}</h2><span class="pill">Schätzung</span></div><div class="kv">
      <span>Bruttolohn ${y}${sl.length < 12 ? " (voraussichtlich)" : ""}</span><span>${escHtml(fmtEur(L.brutto))}</span>
      <span>Lohnsteuer inkl. Soli/KiSt</span><span>${escHtml(fmtEur(L.slipLst + L.slipSoli + L.slipKist))}</span>
      ${hasSelf() ? `<span>+ Gewinn Selbstständigkeit</span><span>${escHtml(fmtEur(tax.gewinn))}</span>` : ""}
      <span class="sum">${tax.due >= 0 ? "Erwartete Nachzahlung" : "Erwartete Erstattung"}</span><span class="sum ${tax.due >= 0 ? "" : "pos"}">${escHtml(fmtEur(Math.abs(tax.due)))}</span></div>
      ${L.slipSv > 0 && Math.abs((Number(store.settings.vorsorge) || 0) - L.slipSv) > 50 ? `<div class="notice info" style="margin-top:12px"><span>Laut Abrechnungen zahlst du ${y} etwa <b>${escHtml(fmtEur0(L.slipSv))}</b> Sozialversicherung (Vorsorge). In den Einstellungen stehen ${escHtml(fmtEur0(Number(store.settings.vorsorge) || 0))}.</span><button class="btn" id="slipVors" data-v="${L.slipSv}">Übernehmen</button></div>` : ""}
    </div>`
        : ""
    }`;
}
/* Werbungskosten */
function wkSection(y) {
  const w = wkCalc(y),
    P = TAX26.anPausch,
    over = w.total - P,
    tax = taxCalc(y);
  const rate = tax.zve > 0 ? Math.min(0.42, Math.max(0.14, ((tax.all.est || 0) / Math.max(1, tax.zve)) * 1.35)) : 0.2;
  const noBeleg = w.txs.filter((t) => !hasReceipt(t.id));
  const L = lohnYear(y);
  return `<div class="card flat"><div class="card-head"><h2>Werbungskosten ${y}</h2>${w.total > P ? `<span class="pill ok">${escHtml(fmtEur0(over))} über Pauschale</span>` : `<span class="pill">Pauschale ${escHtml(fmtEur0(P))}</span>`}</div>
      <div style="font-family:var(--f-display);font-weight:800;font-size:28px;letter-spacing:-.02em">${escHtml(fmtEur(w.total))}</div>
      <div class="progress-big" style="margin:8px 0 4px"><div class="fill" style="width:${Math.min(100, (w.total / P) * 100)}%"></div></div>
      <span class="small muted">${w.total > P ? `Alles über der Pauschale von ${escHtml(fmtEur0(P))} senkt deine Steuer – hier etwa um ${escHtml(fmtEur0(over * rate))}.` : `Bis ${escHtml(fmtEur0(P))} rechnet das Finanzamt sowieso pauschal. Noch ${escHtml(fmtEur0(P - w.total))}, dann lohnt sich das Sammeln.`}</span>
      <div class="wkl">
        ${w.HO.on ? `<button type="button" class="wkr wkho" data-hoopen><span class="ic">${svgIcon("home", 18)}</span><span class="n"><b>Homeoffice</b><small>${w.HO.amt && hasSelf() ? "Zählt bei der Selbstständigkeit" : escHtml(hoLine(w.HO))}</small></span><b>${escHtml(fmtEur0(w.home))} ›</b></button>` : `<div class="wkr"><span class="ic">${svgIcon("home", 18)}</span><span class="n"><b>Homeoffice</b><small>${plural(w.homeDays, "Tag", "Tage")} × 6 € · höchstens 1.260 € · <button type="button" class="linkbtn" data-hoopen>Mehr Möglichkeiten</button></small></span><span class="stp"><button data-wkhome="-1" aria-label="Ein Tag weniger">−</button><b>${escHtml(fmtEur0(w.home))}</b><button class="p" data-wkhome="1" aria-label="Ein Homeoffice-Tag mehr">+</button></span></div>`}
        <div class="wkr"><span class="ic">${svgIcon("car", 18)}</span><span class="n"><b>Fahrten zur Arbeit</b><small>${plural(w.days, "Tag", "Tage")} × ${w.km} km × ${Number(y) >= 2026 ? "0,38 €" : "0,30/0,38 €"}</small></span><b>${escHtml(fmtEur0(w.fahrt))}</b></div>
        <div class="grid2" style="margin:0 0 6px 48px"><div class="field"><label for="wkKm">Entfernung (km, einfach)</label><input class="in" id="wkKm" inputmode="decimal" value="${w.km || ""}" placeholder="0"></div><div class="field"><label for="wkDays">Tage im Betrieb</label><input class="in" id="wkDays" inputmode="numeric" value="${w.days || ""}" placeholder="0"></div></div>
        <div class="wkr"><span class="ic">${svgIcon("tag", 18)}</span><span class="n"><b>Arbeitsmittel aus Buchungen</b><small>${
          w.txs.length
            ? escHtml(
                w.txs
                  .slice(0, 3)
                  .map((t) => txPayee(t) || t.cat)
                  .join(", ")
              ) + (w.txs.length > 3 ? " …" : "")
            : "In einer Ausgabe „Werbungskosten (Job)“ einschalten"
        }</small></span><b>${escHtml(fmtEur0(w.mittel))}</b></div>
        ${w.own.map((x) => `<div class="wkr"><span class="ic">${svgIcon("doc", 18)}</span><span class="n"><b>${escHtml(x.name)}</b><small>eigener Posten</small></span><span class="stp"><b>${escHtml(fmtEur0(Number(x.amount) || 0))}</b><button data-wkdel="${escHtml(x.id)}" aria-label="${escHtml(x.name)} entfernen">×</button></span></div>`).join("")}
        ${ui.wkAdd ? `<div class="grid2" style="margin:6px 0 0 48px"><input class="in" id="wkName" placeholder="z. B. Fortbildung, Gewerkschaft" aria-label="Bezeichnung"><input class="in" id="wkAmt" inputmode="decimal" placeholder="Betrag €" aria-label="Betrag"></div><div class="row-btns" style="justify-content:flex-start;margin:8px 0 0 48px"><button class="btn primary" id="wkAddSave">Hinzufügen</button><button class="btn" id="wkAddCancel">Abbrechen</button></div>` : `<div style="margin:6px 0 0 48px"><button class="chip" id="wkAddBtn">+ Eigener Posten</button></div>`}
      </div>
      <p class="small muted" style="margin:10px 0 0">An einem Tag gilt entweder Homeoffice oder die Fahrt – nicht beides zählen.</p>
    </div>
    <div class="card flat"><div class="card-head"><h2>Steuererklärung ${y}</h2><span class="small muted">zum Abtippen in ELSTER</span></div>
      <div class="ckl">
        ${
          hasJob()
            ? `<div class="ckr"><span class="cdot ${L.brutto > 0 ? "on" : ""}">${L.brutto > 0 ? "✓" : ""}</span><span class="n"><b>Anlage N · Lohn</b><small>${L.slips ? `aus ${L.slips} Abrechnungen` : L.brutto > 0 ? "aus deinen Einstellungen" : "noch kein Lohn eingetragen"}</small></span><b>${escHtml(fmtEur0(L.brutto))}</b></div>
        <div class="ckr"><span class="cdot ${w.total > 0 ? "on" : ""}">${w.total > 0 ? "✓" : ""}</span><span class="n"><b>Anlage N · Werbungskosten</b><small>${w.total > P ? "mehr als die Pauschale – lohnt sich" : "sonst gilt die Pauschale von " + escHtml(fmtEur0(P))}</small></span><b>${escHtml(fmtEur0(Math.max(w.total, P)))}</b></div>`
            : ""
        }
        ${hasSelf() ? `<div class="ckr"><span class="cdot ${tax.self > 0 ? "on" : ""}">${tax.self > 0 ? "✓" : ""}</span><span class="n"><b>Anlage EÜR · Gewinn</b><small>aus deiner Selbstständigkeit</small></span><b>${escHtml(fmtEur0(tax.gewinn))}</b></div>` : ""}
        <div class="ckr"><span class="cdot ${tax.vorsorge > 0 ? "on" : ""}">${tax.vorsorge > 0 ? "✓" : ""}</span><span class="n"><b>Anlage Vorsorgeaufwand</b><small>Kranken-, Pflege-, Rentenversicherung</small></span>${tax.vorsorge > 0 ? `<b>${escHtml(fmtEur0(tax.vorsorge))}</b>` : `<button class="btn" data-go="more" data-scroll="sVors">Eintragen</button>`}</div>
        <div class="ckr"><span class="cdot ${Number(store.settings.abzuege) > 0 ? "on" : ""}">${Number(store.settings.abzuege) > 0 ? "✓" : ""}</span><span class="n"><b>Sonderausgaben</b><small>Spenden, Kirchensteuer, Kinderbetreuung</small></span>${Number(store.settings.abzuege) > 0 ? `<b>${escHtml(fmtEur0(Number(store.settings.abzuege)))}</b>` : `<button class="btn" data-go="more" data-scroll="sAbz">Eintragen</button>`}</div>
        <div class="ckr"><span class="cdot"></span><span class="n"><b>Handwerker & Haushaltshilfe</b><small>20 % der Arbeitskosten von der Steuer ab (Rechnung + Überweisung nötig)</small></span><span class="small muted">Belege sammeln</span></div>
      </div>
      ${noBeleg.length ? `<div class="notice warn" style="margin-top:12px"><span>Für ${noBeleg.length} ${noBeleg.length === 1 ? "Arbeitsmittel fehlt" : "Arbeitsmittel fehlen"} der Beleg – fürs Finanzamt am besten fotografieren.</span></div>` : ""}
      <p class="small muted" style="margin:10px 0 0">Grobe Übersicht, keine Steuerberatung.</p>
    </div>`;
}
async function wkSet(y, patch) {
  const all = {
    ...(store.settings.wk || {}),
  };
  all[y] = {
    ...(all[y] || {}),
    ...patch,
  };
  store.settings.wk = all;
  await saveSettings();
}
document.addEventListener("click", async (e) => {
  const t = e.target,
    y = ui.ym.slice(0, 4);
  if (t.closest("#slipPdf")) {
    const inp = $("slipFile");
    inp.value = "";
    inp.click();
    return;
  }
  if (t.closest("#slipHand")) {
    const cur = ymOf(new Date()),
      have = store.settings.slips || {};
    let ym = y + "-" + pad(Math.min(12, Number(cur.slice(5, 7))));
    if (!ym.startsWith(cur.slice(0, 4))) ym = y + "-12";
    ui.slipDraft = {
      ym,
      v: {},
    };
    renderYear();
    return;
  }
  const sm = t.closest("[data-slipm]");
  if (sm) {
    const ym = sm.dataset.slipm,
      have = (store.settings.slips || {})[ym];
    ui.slipDraft = {
      ym,
      v: have
        ? {
            ...have,
          }
        : {},
      file: have && have.file,
    };
    renderYear();
    setTimeout(() => {
      const el = document.querySelector(".slipdraft");
      if (el)
        el.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
    }, 50);
    return;
  }
  if (t.closest("#slipSave")) {
    await slipSave();
    return;
  }
  if (t.closest("#slipCancel")) {
    ui.slipDraft = null;
    renderYear();
    return;
  }
  if (t.closest("#slipDel")) {
    await slipDelete(ui.slipDraft.ym);
    return;
  }
  if (t.closest("#slipVors")) {
    store.settings.vorsorge = Number(t.closest("#slipVors").dataset.v) || 0;
    await saveSettings();
    toast("Vorsorge übernommen");
    return;
  }
  const wh = t.closest("[data-wkhome]");
  if (wh) {
    const c = wkCfg(y);
    await wkSet(y, {
      home: Math.max(0, Math.min(366, (Number(c.home) || 0) + Number(wh.dataset.wkhome))),
    });
    return;
  }
  if (t.closest("#wkAddBtn")) {
    ui.wkAdd = true;
    renderYear();
    setTimeout(() => $("wkName") && $("wkName").focus(), 30);
    return;
  }
  if (t.closest("#wkAddCancel")) {
    ui.wkAdd = false;
    renderYear();
    return;
  }
  if (t.closest("#wkAddSave")) {
    const n = $("wkName").value.trim(),
      a = parseAmt($("wkAmt").value);
    if (!n || !(a > 0)) {
      toast("Bitte Bezeichnung und Betrag eingeben");
      return;
    }
    ui.wkAdd = false;
    await wkSet(y, {
      items: [
        ...(wkCfg(y).items || []),
        {
          id: newId(),
          name: n,
          amount: round2(a),
        },
      ],
    });
    return;
  }
  const wd = t.closest("[data-wkdel]");
  if (wd) {
    await wkSet(y, {
      items: (wkCfg(y).items || []).filter((x) => x.id !== wd.dataset.wkdel),
    });
    return;
  }
});
document.addEventListener("change", async (e) => {
  const y = ui.ym.slice(0, 4);
  if (e.target.id === "wkKm") {
    const v = parseAmt(e.target.value) || 0;
    await wkSet(y, {
      km: Math.max(0, Math.min(300, v)),
    });
  }
  if (e.target.id === "wkDays") {
    const v = Math.round(parseAmt(e.target.value) || 0);
    await wkSet(y, {
      days: Math.max(0, Math.min(366, v)),
    });
  }
  if (e.target.id === "slipFile" && e.target.files[0]) slipFromPdf(e.target.files[0]);
});

/* automatisches Backup */
const CAN_AUTOBK = !!(window.AndroidBridge && window.AndroidBridge.autoBackup);
function abCfg() {
  let c = {};
  try {
    c = JSON.parse(localStorage.getItem("hb-autobk") || "{}");
  } catch (e) {}
  return {
    on: true,
    keep: 8,
    ...c,
  };
}
function abSave(c) {
  try {
    localStorage.setItem("hb-autobk", JSON.stringify(c));
  } catch (e) {}
}
function autoBackupRun(manual) {
  const c = abCfg();
  if (!CAN_AUTOBK) return false;
  if (!store.tx.length && !store.fixed.length) return false;
  const d = new Date(),
    name = `haushaltsbuch-auto-${isoOf(d)}_${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  const go = (text) => {
    let r = false;
    try {
      r = AndroidBridge.autoBackup(name, text, c.keep);
    } catch (e) {}
    if (r) {
      c.last = Date.now();
      c.where = typeof r === "string" ? r : "Downloads/Haushaltsbuch-Backups";
      abSave(c);
      if (manual) toast(backupEnc() ? "Backup verschlüsselt gespeichert" : "Backup gespeichert");
    } else if (manual) toast("Backup konnte nicht gespeichert werden");
    if (ui.view === "more") renderAutoBk();
    return r;
  };
  if (backupEnc()) {
    backupText()
      .then(go)
      .catch(() => {
        if (manual) toast("Backup konnte nicht verschlüsselt werden");
      });
    return true;
  }
  return go(JSON.stringify(backupData()));
}
function autoBackupCheck() {
  const c = abCfg();
  if (c.on && CAN_AUTOBK && (!c.last || Date.now() - c.last > 7 * 864e5)) autoBackupRun(false);
}
function renderAutoBk() {
  const el = $("autoBk");
  if (!el) return;
  if (!CAN_AUTOBK) {
    el.innerHTML = `<span class="small muted">Automatische Backups gibt es in der Handy- und PC-App.</span>`;
    return;
  }
  const c = abCfg();
  el.innerHTML = `<div class="switch"><label for="abOn"><b>Jede Woche automatisch</b><br><span class="small muted">${c.last ? `Zuletzt am ${escHtml(new Date(c.last).toLocaleDateString("de-DE"))} · ` : ""}die letzten ${Number(c.keep) || 8} bleiben in ${escHtml(c.where || (NATIVE && !(window.AndroidBridge || {}).desktop ? "Downloads/Haushaltsbuch-Backups" : "Dokumente/Haushaltsbuch-Backups"))}</span></label><input type="checkbox" id="abOn" ${c.on ? "checked" : ""}></div>`;
}
document.addEventListener("change", (e) => {
  if (e.target.id === "abOn") {
    const c = abCfg();
    c.on = e.target.checked;
    abSave(c);
    if (c.on) autoBackupCheck();
    renderAutoBk();
  }
});

/* Raten / Schulden */
function rateEnd(open, rate, zinsPct) {
  open = Number(open) || 0;
  rate = Number(rate) || 0;
  const z = (Number(zinsPct) || 0) / 100 / 12;
  if (!(open > 0) || !(rate > 0)) return null;
  let n;
  if (z > 0) {
    if (rate <= open * z)
      return {
        never: true,
      };
    n = Math.ceil(-Math.log(1 - (z * open) / rate) / Math.log(1 + z));
  } else n = Math.ceil(open / rate);
  const ym = shiftYm(ymOf(new Date()), n);
  return {
    n,
    ym,
  };
}
function rateEndTxt(open, rate, zins) {
  const e = rateEnd(open, rate, zins);
  if (!e) return "";
  if (e.never) return "⚠️ Die Rate deckt nicht einmal die Zinsen – so wird die Schuld nie kleiner.";
  return (
    "💡 " +
    trBold(
      e.n === 1
        ? `Noch **1 Rate** – letzte etwa im ${monthName(e.ym)}.`
        : `Noch **${e.n} Raten** – letzte etwa im ${monthName(e.ym)}.`
    )
  );
}
const RATE_CHIPS = [
  ["kredit", "Kredit"],
  ["ratenkauf", "Ratenkauf"],
  ["handy", "Handy"],
  ["privat", "Privat geliehen"],
  ["tax", "Steuerschulden"],
  ["bafoeg", "BAföG / Studium"],
];
function rateFormHtml(day, st) {
  st = st || {};
  const D = daysIn(ui.ym || ymOf(new Date()));
  return `<label class="pf"><span>Wofür?</span><input class="in" data-rf="name" value="${escHtml(st.name || "")}" placeholder="z. B. Autokredit, Handy auf Raten" autocomplete="off"></label>
    <div class="rfchips">${RATE_CHIPS.map(([k, l]) => `<button type="button" class="${st.art === k ? "on" : ""}" data-rfart="${k}">${l}</button>`).join("")}</div>
    <div class="pr2"><label class="pf"><span>Rate pro Monat</span><input class="in" data-rf="rate" inputmode="decimal" value="${escHtml(st.rate || "")}" placeholder="0,00"></label><label class="pf"><span>Noch offen</span><input class="in" data-rf="open" inputmode="decimal" value="${escHtml(st.open || "")}" placeholder="0,00"></label></div>
    <div class="pr2"><label class="pf"><span>Am</span><select class="in" data-rf="day"><option value="0">ohne festen Tag</option>${Array.from(
      {
        length: D,
      },
      (_, i) => `<option value="${i + 1}" ${(st.day || day) === i + 1 ? "selected" : ""}>${i + 1}. des Monats</option>`
    ).join(
      ""
    )}</select></label><label class="pf"><span>Zins pro Jahr (optional)</span><input class="in" data-rf="zins" inputmode="decimal" value="${escHtml(st.zins || "")}" placeholder="0 %"></label></div>
    <div class="rfnote" data-rfnote>${rateEndTxt(parseAmt(st.open || ""), parseAmt(st.rate || ""), parseAmt(st.zins || ""))}</div>`;
}
function rateRead(root) {
  const v = (k) => {
    const el = root.querySelector(`[data-rf="${k}"]`);
    return el ? el.value.trim() : "";
  };
  const a = root.querySelector("[data-rfart].on");
  return {
    name: v("name"),
    rate: v("rate"),
    open: v("open"),
    zins: v("zins"),
    day: +v("day") || 0,
    art: a ? a.dataset.rfart : "",
  };
}
async function rateCreate(r) {
  const ym = ui.ym || ymOf(new Date()),
    rate = round2(parseAmt(r.rate) || 0),
    open = round2(parseAmt(r.open) || 0),
    zins = parseAmt(r.zins) || 0;
  const art =
    r.art === "tax" || r.art === "handy"
      ? r.art === "handy"
        ? "ratenkauf"
        : "sonst"
      : r.art ||
        debtArt({
          name: r.name,
        });
  const name = r.name || (RATE_CHIPS.find((x) => x[0] === r.art) || [, "Rate"])[1];
  const fid = newId(),
    f = {
      name,
      amount: rate,
      kind: "privat",
      order: store.fixed.length,
      from: ym,
    };
  if (r.day)
    f.days = [
      {
        from: ym,
        day: r.day,
      },
    ];
  if (!(await safe(() => saveDoc("fixed", fid, f)))) return false;
  if (
    open > 0 &&
    !(await safe(() =>
      saveDoc("debts", newId(), {
        name,
        art,
        start: open,
        since: shiftYm(ymOf(new Date()), 1),
        zins: isFinite(zins) ? zins : 0,
        fixedId: fid,
        auto: true,
      })
    ))
  )
    return false;
  return name;
}
function rateCheck(r) {
  if (!r.name && !r.art) return "Bitte eintragen, wofür die Rate ist";
  if (!(parseAmt(r.rate) > 0)) return "Bitte die Rate pro Monat eintragen";
  return "";
}
document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-rfart]");
  if (!c) return;
  const root = c.closest(".rfroot") || c.parentElement.parentElement;
  root
    .querySelectorAll("[data-rfart]")
    .forEach((b) => b.classList.toggle("on", b === c && !b.classList.contains("on")));
  const n = root.querySelector('[data-rf="name"]');
  if (n && !n.value.trim()) n.placeholder = (RATE_CHIPS.find((x) => x[0] === c.dataset.rfart) || [, ""])[1];
});
document.addEventListener("input", (e) => {
  if (!e.target.matches("[data-rf]")) return;
  const root = e.target.closest(".rfroot");
  if (!root) return;
  const r = rateRead(root),
    n = root.querySelector("[data-rfnote]");
  if (n) n.innerHTML = rateEndTxt(parseAmt(r.open), parseAmt(r.rate), parseAmt(r.zins));
});
/* Handy: neue Fixkosten oder Rate */
function fxNewOpen(mode) {
  let bg = $("fxNewBg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "fxNewBg";
    bg.className = "backdrop";
    bg.hidden = true;
    document.body.appendChild(bg);
    bg.addEventListener("click", (ev) => {
      if (ev.target === bg || ev.target.closest("[data-fxnx]")) fxNewClose();
    });
  }
  ui.fxNew = mode || "fix";
  fxNewRender();
  bg.hidden = false;
  document.body.classList.add("locked");
  requestAnimationFrame(() => bg.classList.add("show"));
}
function fxNewClose() {
  const bg = $("fxNewBg");
  if (!bg || bg.hidden) return;
  bg.classList.remove("show");
  document.body.classList.remove("locked");
  setTimeout(() => {
    bg.hidden = true;
  }, 220);
}
function fxNewRender() {
  const bg = $("fxNewBg");
  if (!bg) return;
  const m = ui.fxNew,
    D = daysIn(ui.ym || ymOf(new Date()));
  bg.innerHTML = `<div class="sheet fxnsheet rfroot" role="dialog" aria-modal="true" aria-label="Was kommt dazu?"><div class="sheet-head"><h2>Was kommt dazu?</h2><button class="icon-btn" data-fxnx aria-label="Schließen"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="rfseg"><button class="${m === "fix" ? "on" : ""}" data-fxnm="fix">${svgIcon("cal", 15)} Fixkosten</button><button class="${m === "rate" ? "on rate" : ""}" data-fxnm="rate">${svgIcon("bank", 15)} Rate / Schulden</button></div>
    ${
      m === "rate"
        ? rateFormHtml(0)
        : `<label class="pf"><span>Name</span><input class="in" data-fn="name" placeholder="z. B. Miete, Netflix, Versicherung" autocomplete="off"></label>
      <div class="pr2"><label class="pf"><span>Betrag pro Monat</span><input class="in" data-fn="amount" inputmode="decimal" placeholder="0,00"></label><label class="pf"><span>Am</span><select class="in" data-fn="day"><option value="0">ohne festen Tag</option>${Array.from(
        {
          length: D,
        },
        (_, i) => `<option value="${i + 1}">${i + 1}. des Monats</option>`
      ).join("")}</select></label></div>`
    }
    <button class="btn primary block ${m === "rate" ? "rfgo" : ""}" style="justify-content:center;margin-top:10px" data-fxnok>${m === "rate" ? "Rate anlegen" : "Eintragen"}</button></div>`;
  setTimeout(() => {
    const i = bg.querySelector('[data-rf="name"],[data-fn="name"]');
    if (i)
      i.focus({
        preventScroll: true,
      });
  }, 60);
}
document.addEventListener("click", async (e) => {
  const mm = e.target.closest("[data-fxnm]");
  if (mm) {
    ui.fxNew = mm.dataset.fxnm;
    fxNewRender();
    return;
  }
  if (!e.target.closest("[data-fxnok]")) return;
  const bg = $("fxNewBg");
  if (ui.fxNew === "rate") {
    const r = rateRead(bg),
      err = rateCheck(r);
    if (err) {
      toast(err);
      return;
    }
    fxNewClose();
    const n = await rateCreate(r);
    if (n) toast(`${n} als Rate eingetragen`);
    return;
  }
  const v = (k) => (bg.querySelector(`[data-fn="${k}"]`) || {}).value || "",
    name = v("name").trim(),
    amt = parseAmt(v("amount") || "0"),
    day = +v("day") || 0,
    ym = ui.ym || ymOf(new Date());
  if (!name) {
    toast("Bitte einen Namen eintragen");
    return;
  }
  if (!(amt >= 0)) {
    toast("Betrag ungültig");
    return;
  }
  const f = {
    name,
    amount: round2(amt),
    kind: "privat",
    order: store.fixed.length,
    from: ym,
  };
  if (day)
    f.days = [
      {
        from: ym,
        day,
      },
    ];
  fxNewClose();
  if (await safe(() => saveDoc("fixed", newId(), f))) toast(`${name} eingetragen`);
});

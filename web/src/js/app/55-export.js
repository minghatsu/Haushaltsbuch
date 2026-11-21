/* EÜR-Export */
function csvSafe(v) {
  v = String(v == null ? "" : v);
  return /^[=+\-@\t\r]/.test(v) && !/^-?\d+([.,]\d+)?$/.test(v) ? "'" + v : v;
}
function euerCsv(y) {
  const vat = (Number(store.settings.vatRate) || 0) / 100,
    ku = !!store.settings.kleinunternehmer;
  const n2 = (v) => round2(v).toFixed(2).replace(".", ",");
  const q = (v) => {
    v = csvSafe(v);
    return /[;"\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  };
  const de = (d) => d.slice(8, 10) + "." + d.slice(5, 7) + "." + d.slice(0, 4);
  const rows = [],
    inc = [],
    out = [];
  for (const t of store.tx) {
    if ((t.date || "").slice(0, 4) !== y) continue;
    if (t.kind === "einnahme" && incArt(t.cat) === "selbst") {
      const net = t.net != null ? Number(t.net) : ku ? t.amount : t.amount / (1 + vat);
      inc.push({
        d: t.date,
        cat: t.cat,
        note: t.note || "",
        brutto: t.amount,
        ust: t.amount - net,
        netto: net,
        beleg: hasReceipt(t.id),
      });
    } else if (t.kind === "betrieb")
      out.push({
        d: t.date,
        cat: t.cat || "Betriebsausgabe",
        note: t.note || "",
        brutto: t.amount,
        beleg: hasReceipt(t.id),
      });
  }
  for (const [ym, m] of Object.entries(store.months)) {
    if (ym.slice(0, 4) !== y) continue;
    for (const [fid, v] of Object.entries(m.paid || {})) {
      const f = store.fixed.find((x) => x.id === fid);
      if (f && f.kind === "betrieb")
        out.push({
          d: ym + "-" + pad(daysIn(ym)),
          cat: "Fixkosten",
          note: f.name + " (" + MONTHS[Number(ym.slice(5, 7)) - 1] + ")",
          brutto: Number(v) || 0,
          beleg: false,
        });
    }
  }
  inc.sort((a, b) => a.d.localeCompare(b.d));
  out.sort((a, b) => a.d.localeCompare(b.d));
  rows.push(["Einnahmen-Überschuss-Rechnung " + y]);
  rows.push([
    "Erstellt mit Finanz MAMI am " +
      de(isoToday()) +
      (ku ? " · Kleinunternehmer (§19 UStG)" : " · Umsatzsteuer " + vat * 100 + " %"),
  ]);
  rows.push([]);
  rows.push(["Betriebseinnahmen"]);
  rows.push(["Datum", "Kategorie", "Beschreibung", "Brutto (€)", "Umsatzsteuer (€)", "Netto (€)", "Beleg"]);
  for (const r of inc) rows.push([de(r.d), r.cat, r.note, n2(r.brutto), n2(r.ust), n2(r.netto), r.beleg ? "ja" : ""]);
  const si = {
    b: sum(inc, (r) => r.brutto),
    u: sum(inc, (r) => r.ust),
    n: sum(inc, (r) => r.netto),
  };
  rows.push(["Summe Einnahmen", "", "", n2(si.b), n2(si.u), n2(si.n), ""]);
  rows.push([]);
  rows.push(["Betriebsausgaben"]);
  rows.push(["Datum", "Kategorie", "Beschreibung", "Betrag brutto (€)", "", "", "Beleg"]);
  for (const r of out) rows.push([de(r.d), r.cat, r.note, n2(r.brutto), "", "", r.beleg ? "ja" : ""]);
  const so = sum(out, (r) => r.brutto);
  rows.push(["Summe Ausgaben", "", "", n2(so), "", "", ""]);
  rows.push([]);
  rows.push(["Überschuss (Einnahmen netto − Ausgaben brutto)", "", "", n2(si.n - so)]);
  rows.push([
    "Hinweis: Die Ausgaben stehen brutto drin – die darin enthaltene Vorsteuer bitte aus den Belegen übernehmen. Keine Steuerberatung.",
  ]);
  return {
    text: "\uFEFF" + rows.map((r) => r.map(q).join(";")).join("\r\n"),
    inc: inc.length,
    out: out.length,
  };
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("#euerBtn");
  if (!b) return;
  const r = euerCsv(b.dataset.year);
  if (!r.inc && !r.out) {
    toast("In diesem Jahr gibt es keine Buchungen der Selbstständigkeit");
    return;
  }
  saveTextFile(
    "EUeR-" + b.dataset.year + ".csv",
    r.text,
    "text/csv",
    `EÜR mit ${r.inc} Einnahmen und ${r.out} Ausgaben gespeichert`
  );
});
async function saveBackup() {
  const name = "haushaltsbuch-backup-" + isoToday() + ".json";
  let text;
  try {
    text = await backupText();
  } catch (e) {
    toast("Backup konnte nicht verschlüsselt werden");
    return;
  }
  if (LOCAL && !NATIVE) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([text], {
        type: "application/json",
      })
    );
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
    toast("Backup wird heruntergeladen");
    return;
  }
  if (NATIVE) {
    try {
      const r = window.AndroidBridge.saveFile(name, text);
      toast(
        r
          ? backupEnc()
            ? "Backup verschlüsselt in Downloads gespeichert"
            : "Backup in Downloads gespeichert"
          : "Backup konnte nicht gespeichert werden"
      );
    } catch (e) {
      toast("Backup konnte nicht gespeichert werden");
    }
    return;
  }
  let dl = null;
  try {
    dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null;
  } catch (e) {}
  if (!dl) {
    toast("Speichern ist in dieser Ansicht nicht möglich");
    return;
  }
  try {
    const r = await dl.save({
      filename: name,
      data: text,
    });
    if (r && r.status === "saved") toast("Backup gespeichert");
  } catch (e) {
    if (!(e && e.code === "declined")) toast("Backup konnte nicht gespeichert werden");
  }
}
$("backupFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const o = JSON.parse(await f.text());
    if (!mem) {
      toast("Backup laden geht nur in der Handy-App");
      return;
    }
    const use = (d) => {
      loadBackupObj(d, true);
      toast("Backup geladen");
      ui.view = "home";
      render();
    };
    if (o && o.hbPair) {
      if (!cryptoCan()) {
        toast("Verschlüsselte Backups lassen sich nur in der App öffnen");
        return;
      }
      await backupOpenPair(o, use);
      return;
    }
    use(o);
  } catch (err) {
    toast("Diese Datei ist kein gültiges Backup");
  }
});

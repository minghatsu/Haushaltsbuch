/* Steuer-Ansicht: Reiter + Kassenzettel */
function taxView(y, tax, st, self, vat, kuOver, resCover) {
  const E = (v) => escHtml(fmtEur0(v)),
    KL = ["", "I", "II", "III", "IV", "V", "VI"][tax.kl] || "";
  const row = (l, v, info, sub, cls) =>
    `<div class="txrow${info ? " hasi" : ""}"><div class="txl"><span>${l}${info ? `<button type="button" class="txq" data-txq aria-label="Erklärung">i</button>` : ""}</span><b class="${cls || ""}">${v}</b></div>${sub ? `<small class="txsub">${sub}</small>` : ""}${info ? `<div class="txexp">${info}</div>` : ""}</div>`;
  const neg = (v) => (Math.abs(v) < 0.5 ? E(0) : "−" + E(Math.abs(v)));
  const paid = (tax.brutto ? tax.lst + tax.soliL + tax.kistL : 0) + (tax.vz || 0),
    steuer = tax.mine.total + (tax.gewst || 0),
    due = tax.due;
  const est = `<div class="txr">
    ${hasSelf() ? row("Gewinn Selbstständigkeit", E(tax.gewinn + tax.ho + tax.afa), "Deine Einnahmen ohne Umsatzsteuer minus Betriebsausgaben.", `${E(self)} Einnahmen − ${E(tax.betr)} Ausgaben`) : ""}
    ${hasSelf() && tax.afa ? row("📦 Abschreibungen", neg(tax.afa), "Größere Anschaffungen werden über mehrere Jahre verteilt – dieser Teil zählt dieses Jahr.", tax.AF.items.length === 1 ? "1 Anschaffung" : `${tax.AF.items.length} Anschaffungen`, "neg") : ""}
    ${hasSelf() && tax.AF.open.length ? `<button type="button" class="txho" data-afaopen="${escHtml(tax.AF.open[0].id)}">${svgIcon("basket", 15)} ${tax.AF.open.length === 1 ? "1 größere Anschaffung prüfen" : `${tax.AF.open.length} größere Anschaffungen prüfen`} ›</button>` : ""}
    ${hasSelf() && tax.ho ? row("Homeoffice", neg(tax.ho), "Dein Arbeitszimmer bzw. deine Bürotage zu Hause senken den Gewinn.", escHtml(hoLine(tax.HO)), "neg") : ""}
    ${hasSelf() && !tax.HO.on ? `<button type="button" class="txho" data-hoopen>${svgIcon("home", 16)} <span>Homeoffice oder Arbeitszimmer eintragen ›</span></button>` : ""}
    ${tax.rente ? row("Rente (steuerpflichtiger Teil)", E(tax.renteSt), "Nur ein Teil der Rente wird besteuert – wie viel, hängt vom Rentenbeginn ab.", `${E(tax.rente)} Rente · ${String(tax.rAnteil).replace(".", ",")} % steuerpflichtig`) : ""}
    ${tax.brutto ? row("Lohn nach Pauschale", E(tax.lohnEink), "Vom Bruttolohn werden die Werbungskosten abgezogen – das sind Kosten für die Arbeit wie Fahrten oder Arbeitsmittel. Mindestens gibt es 1.230 € Pauschale.", `${E(tax.brutto)} brutto − ${E(tax.wk)} Werbungskosten`) : ""}
    ${row("Abzüge", neg(tax.vorsorge + tax.sonder), "Kranken-, Pflege- und Rentenversicherung, Spenden und ähnliches senken die Steuer.", null, "neg")}
    ${tax.entl ? row("Entlastung Alleinerziehende", neg(tax.entl), "Ein Freibetrag für Alleinerziehende.", null, "neg") : ""}
    <div class="txrow sum"><div class="txl"><span>Davon wird Steuer berechnet</span><b>${E(tax.zve)}</b></div><small class="txsub">„Zu versteuerndes Einkommen“</small></div>
    ${tax.ersatz ? row("Lohnersatz (z. B. Krankengeld)", E(tax.ersatz), "Ist selbst steuerfrei, erhöht aber den Steuersatz auf dein übriges Einkommen.") : ""}
    ${tax.joint ? row("Partner/in (Splitting)", E(tax.partner), "Bei Zusammenveranlagung wird das Einkommen beider zusammengerechnet und halbiert – das senkt meist die Steuer.") : ""}
    ${row(
      tax.joint ? "Deine Steuer (dein Anteil)" : "Deine Steuer",
      E(steuer),
      "So viel Steuer fällt für das ganze Jahr an.",
      [
        `Einkommensteuer ${E(tax.mine.est)}`,
        tax.mine.soli > 0.5 ? `Soli ${E(tax.mine.soli)}` : "",
        tax.mine.kist > 0.5 ? `Kirchensteuer ${E(tax.mine.kist)}` : "",
        tax.gewst ? `Gewerbesteuer ${E(tax.gewst)}` : "",
      ]
        .concat(tax.z ? [tax.all.useFB ? "Kinderfreibetrag günstiger" : "Kindergeld günstiger"] : [])
        .filter(Boolean)
        .map((x) => `<span>${x}</span>`)
        .join("<span> · </span>")
    )}
    ${tax.brutto ? row("Schon vom Lohn abgezogen", neg(tax.lst + tax.soliL + tax.kistL), "Das hat dein Arbeitgeber jeden Monat schon ans Finanzamt gezahlt (Lohnsteuer).", tax.lstEst ? `geschätzt, Steuerklasse ${KL}` : null, "neg") : ""}
    ${hasSelf() || tax.vz ? row("Schon vorausgezahlt", neg(tax.vz), "Steuervorauszahlungen, die du selbst ans Finanzamt überwiesen hast.", null, "neg") : ""}
    <div class="txrow sum"><div class="txl"><span>Ergebnis</span><b class="${Math.abs(due) < 1 ? "" : due < 0 ? "pos" : "neg"}">${Math.abs(due) < 1 ? "± 0 €" : due < 0 ? `+${E(-due)} zurück` : `${E(due)} nachzahlen`}</b></div></div>
  </div>`;
  const mx = Math.max(steuer, paid, 1),
    a = Math.min(steuer, paid);
  const bar = `<div class="sec-mini">Steuer und schon bezahlt</div>
    <div class="txstack">${paid >= steuer ? `<i style="width:${(a / mx) * 100}%;background:#c9a227"></i><i style="width:${((paid - steuer) / mx) * 100}%;background:#7a5bc2"></i>` : `<i style="width:${(a / mx) * 100}%;background:#7a5bc2"></i><i style="width:${((steuer - paid) / mx) * 100}%;background:var(--bad)"></i>`}</div>
    <div class="txlg">${paid >= steuer ? `<span><i style="background:#c9a227"></i>Deine Steuer ${E(steuer)}</span><span><i style="background:#7a5bc2"></i>Zu viel bezahlt ${E(paid - steuer)}</span>` : `<span><i style="background:#7a5bc2"></i>Schon bezahlt ${E(paid)}</span><span><i style="background:var(--bad)"></i>Fehlt noch ${E(steuer - paid)}</span>`}</div>`;
  const warnKl = [3, 4, 5].includes(tax.kl) && !tax.joint;
  const res = `<div class="txres ${due > 0.5 ? "due" : ""}"><span class="e">${svgIcon(Math.abs(due) < 1 ? "check" : due < 0 ? "spark" : "coins", 22)}</span><span><b>${Math.abs(due) < 1 ? "Passt genau" : due < 0 ? `ca. ${E(-due)} zurück` : `ca. ${E(due)} nachzahlen`}</b><small>${Math.abs(due) < 1 ? "Du hast ungefähr so viel bezahlt, wie du musst." : due < 0 ? "Du hast mehr bezahlt, als du musst." : "Du hast weniger bezahlt, als du musst."}</small></span></div>`;
  const notes = [
    hasSelf() && due > 0.5
      ? `<div class="notice ${resCover >= 0 ? "info" : "bad"}"><span>${resCover >= 0 ? `Deine Rücklage (${E(tax.resBal)}) reicht. Puffer: ${E(resCover)}` : `Deine Rücklage (${E(tax.resBal)}) reicht voraussichtlich nicht – es fehlen ${E(-resCover)}.`}</span></div>`
      : "",
    warnKl
      ? `<div class="notice warn"><span>Steuerklasse ${KL} gibt es nur für Verheiratete – schalte unter Einstellungen „Zusammenveranlagung“ ein und trag das Einkommen deines Partners ein.</span></div>`
      : "",
    tax.lstEst
      ? `<div class="notice info"><span>Die Lohnsteuer ist aus Bruttolohn und Steuerklasse grob geschätzt. Genauer wird es mit dem Wert aus deiner Lohnabrechnung (Einstellungen › Steuer).</span></div>`
      : "",
    st.gewerbe && tax.gewst
      ? `<div class="notice info"><span>Die Gewerbesteuer (${E(tax.gewst)}) zahlst du an die Gemeinde.</span></div>`
      : "",
  ].join("");
  const ust = !hasSelf()
    ? ""
    : `<div class="txr">${
        st.kleinunternehmer
          ? `
      <p class="small muted" style="margin:0 0 10px">Als Kleinunternehmer schreibst du keine Umsatzsteuer auf deine Rechnungen – solange du unter der Umsatzgrenze bleibst.</p>
      ${row("Einnahmen", E(self))}
      <div class="meta-row" style="margin-top:8px"><span>Umsatzgrenze</span><span><b>${E(self)}</b> von ${E(st.kuLimit)}</span></div><div class="progress-big"><div class="fill" style="width:${Math.min(100, (self / (st.kuLimit || 1)) * 100)}%;background:${kuOver ? "var(--bad)" : self / (st.kuLimit || 1) > 0.8 ? "var(--warn)" : "var(--accent)"}"></div></div>
      ${kuOver ? `<div class="notice bad" style="margin-top:10px">Grenze überschritten. Klär mit deinem Steuerbüro, ab wann du Umsatzsteuer berechnen musst.</div>` : ""}`
          : `<p class="small muted" style="margin:0 0 10px">Die Umsatzsteuer schlägst du auf deine Rechnungen drauf und gibst sie ans Finanzamt weiter – sie gehört nicht dir.</p>
      ${row("Einnahmen ohne Umsatzsteuer", E(self))}
      ${row(`Umsatzsteuer ${escHtml(st.vatRate)} %`, E(self * vat), "Diesen Teil haben deine Kunden zusätzlich bezahlt – er geht ans Finanzamt.")}
      <div class="txrow sum"><div class="txl"><span>Rechnungsbeträge gesamt</span><b>${E(self * (1 + vat))}</b></div></div>
      <div class="txres due" style="margin-top:12px"><span class="e">${svgIcon("bank", 22)}</span><span><b>${E(self * vat)} ans Finanzamt</b><small>Ohne Vorsteuer gerechnet – die Umsatzsteuer auf deine eigenen Einkäufe darfst du abziehen.</small></span></div>`
      }</div>`;
  const tab = ui.txTab === "ust" && hasSelf() ? "ust" : "est";
  return `<div class="txc" data-txt="${tab}">${hasSelf() ? `<div class="txtabs"><button type="button" data-txtab="est" class="${tab === "est" ? "on" : ""}">Einkommensteuer</button><button type="button" data-txtab="ust" class="${tab === "ust" ? "on" : ""}">${st.kleinunternehmer ? "Kleinunternehmer" : "Umsatzsteuer"}</button></div>` : ""}
    <div class="txp" data-txp="est">${est}${steuer + paid >= 1 ? bar : ""}${res}<div class="txnotes">${notes}</div></div>
    ${hasSelf() ? `<div class="txp" data-txp="ust">${ust}</div>` : ""}
    <p class="small muted txfoot">Schätzung ${y} nach §32a EStG mit Soli, Kirchensteuer, Kinderfreibetrag und Gewerbesteuer-Anrechnung. Ohne Vorsteuer und Sonderfälle – ersetzt keine Steuerberatung.</p></div>`;
}
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-txtab]");
  if (t) {
    ui.txTab = t.dataset.txtab;
    const c = t.closest(".txc");
    c.dataset.txt = ui.txTab;
    c.querySelectorAll("[data-txtab]").forEach((b) => b.classList.toggle("on", b === t));
    return;
  }
  const q = e.target.closest("[data-txq]");
  if (q) {
    q.closest(".txrow").classList.toggle("open");
  }
});
/* Homeoffice & Arbeitszimmer */
const HO_DAY = 6,
  HO_MAX = 1260,
  HO_DMAX = 210;
function hoCfg(y) {
  return ((store.settings && store.settings.ho) || {})[y] || {};
}
async function hoSet(y, patch) {
  const all = {
    ...(store.settings.ho || {}),
  };
  all[y] = {
    ...(all[y] || {}),
    ...patch,
  };
  store.settings.ho = all;
  clearTimeout(hoSet._t);
  hoSet._t = setTimeout(() => saveSettings(), 500);
}
function hoWohn(y) {
  const re = /miete|strom|heiz|gas\b|nebenkost|wasser|müll|grundsteuer|fernwärme|hausgeld/i;
  let s = 0;
  for (let i = 1; i <= 12; i++) {
    const ym = y + "-" + pad(i);
    for (const f of store.fixed)
      if (re.test((f.name || "") + " " + (f.cat || "")) && dueIn(f, ym)) s += Number(f.amount) || 0;
  }
  return Math.round(s / 12);
}
function hoCalc(y) {
  const c = hoCfg(y),
    days = Object.keys(c.days || {}).length,
    tag = Math.min(HO_MAX, Math.min(days, HO_DMAX) * HO_DAY);
  const full = !!(c.on && c.room && c.center),
    cost = Number(c.cost) > 0 ? Number(c.cost) : 0,
    share = Number(c.m2) > 0 && Number(c.m2all) > 0 ? Math.min(1, Number(c.m2) / Number(c.m2all)) : 0;
  const real = full && share && cost ? Math.round(cost * 12 * share) : 0,
    jahr = full ? HO_MAX : 0;
  const opts = [
    {
      k: "real",
      v: real,
      ok: full && real > 0,
    },
    {
      k: "jahr",
      v: jahr,
      ok: full,
    },
    {
      k: "tag",
      v: tag,
      ok: !!c.on,
    },
  ];
  const best = opts.filter((o) => o.ok).sort((a, b) => b.v - a.v)[0];
  let pick = (c.pick && opts.find((o) => o.k === c.pick && o.ok)) || best;
  const amt = c.on && pick ? pick.v : 0;
  return {
    on: !!c.on,
    room: !!c.room,
    center: !!c.center,
    days,
    tag,
    real,
    jahr,
    share,
    cost,
    opts,
    best: best && best.k,
    pick: pick && pick.k,
    amt,
    full,
  };
}
function hoLine(H) {
  return H.pick === "tag"
    ? `Tagespauschale · ${H.days} Tage × 6 €`
    : H.pick === "jahr"
      ? "Jahrespauschale"
      : `Echte Kosten · ${Math.round(H.share * 100)} % der Wohnkosten`;
}
const HOUI = {
  y: null,
  m: null,
};
function hoOpen() {
  const y = Number(ui.ym.slice(0, 4));
  HOUI.y = y;
  const n = new Date();
  HOUI.m = n.getFullYear() === y ? n.getMonth() + 1 : 1;
  let bg = $("hoBg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "hoBg";
    bg.className = "hobg";
    bg.innerHTML = `<div class="hosh" role="dialog" aria-modal="true"><div class="hohd"><b>Homeoffice & Arbeitszimmer</b><button class="hox" data-hoclose aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="hobody" id="hoBody"></div></div>`;
    document.body.appendChild(bg);
  }
  bg.hidden = false;
  HOUI.lk = !document.body.classList.contains("locked");
  document.body.classList.add("locked");
  hoRender();
  requestAnimationFrame(() => bg.classList.add("show"));
}
function hoClose() {
  const bg = $("hoBg");
  if (!bg) return;
  bg.classList.remove("show");
  if (HOUI.lk) document.body.classList.remove("locked");
  setTimeout(() => {
    bg.hidden = true;
  }, 200);
  clearTimeout(hoSet._t);
  saveSettings();
  render();
}
function hoRender() {
  const b = $("hoBody");
  if (!b) return;
  const y = HOUI.y,
    c = hoCfg(y),
    H = hoCalc(y),
    E = (v) => escHtml(fmtEur0(v)),
    self = hasSelf();
  const seg = (k, q) =>
    `<div class="hoqq"><span>${q}</span><div class="hoseg"><button type="button" class="${c[k] ? "on" : ""}" data-hoq="${k}" data-v="1">Ja</button><button type="button" class="${c[k] === false ? "on" : ""}" data-hoq="${k}" data-v="0">Nein</button></div></div>`;
  let h = `<p class="hosub">Steuerjahr ${y}</p><div class="hocard">${seg("on", "Arbeitest du zu Hause?")}${c.on ? seg("room", "Eigenes, abgeschlossenes Zimmer – fast nur zum Arbeiten?") : ""}${c.on && c.room ? seg("center", "Machst du (fast) deine ganze Arbeit dort – kein Job außer Haus?") : ""}</div>`;
  if (!c.on) {
    b.innerHTML =
      h +
      `<p class="small muted" style="margin:10px 4px">Ohne Homeoffice wird nichts abgezogen. Computer, Möbel und Software kannst du trotzdem als Ausgabe eintragen.</p>`;
    return;
  }
  if (H.full) {
    const sug = hoWohn(y);
    h += `<div class="hocard"><div class="hofr"><label for="hoM2">Zimmer (m²)</label><input class="in" id="hoM2" inputmode="decimal" value="${c.m2 || ""}" placeholder="12"></div>
      <div class="hofr"><label for="hoM2all">Wohnung gesamt (m²)</label><input class="in" id="hoM2all" inputmode="decimal" value="${c.m2all || ""}" placeholder="70"></div>
      <div class="hofr"><label for="hoCost">Warmmiete + Strom pro Monat (€)</label><input class="in" id="hoCost" inputmode="decimal" value="${c.cost || ""}" placeholder="${sug || "800"}"></div>
      ${sug && !c.cost ? `<button type="button" class="hosug" data-hosug="${sug}">Aus deinen Fixkosten übernehmen: ${E(sug)}</button>` : ""}</div>`;
  }
  const OL = {
    real: ["🧾", "Echte Kosten"],
    jahr: ["📦", "Jahrespauschale"],
    tag: ["📅", "Tagespauschale"],
  };
  const OS = {
    real: H.real
      ? `${Math.round(H.share * 100)} % von ${E(H.cost * 12)} Wohnkosten im Jahr`
      : "Zimmergröße und Kosten eintragen",
    jahr: "Ohne Belege, 105 € pro Monat",
    tag: `${H.days} Bürotage × 6 € · bis 1.260 €`,
  };
  const why = !c.room
    ? "Nicht erfüllt: kein eigenes Zimmer"
    : "Nicht erfüllt: Zimmer ist nicht der Mittelpunkt deiner Arbeit";
  h +=
    `<div class="hosec">Deine Möglichkeiten</div>` +
    H.opts
      .slice()
      .sort((a, b) => b.ok - a.ok || b.v - a.v)
      .map(
        (o) =>
          `<button type="button" class="homt ${o.k === H.pick ? "best" : ""} ${o.ok ? "" : "no"}" ${o.ok ? `data-hopick="${o.k}"` : "disabled"}><span class="h"><b>${OL[o.k][0]} ${OL[o.k][1]}</b><span class="v">${o.ok || o.v ? E(o.v) : "–"}</span></span><small>${o.ok ? OS[o.k] : why}</small>${o.k === H.best && o.ok ? `<span class="tag">Für dich am besten</span>` : !o.ok ? `<span class="tag g">${o.k === "tag" ? "" : "Nur mit Mittelpunkt"}</span>` : ""}</button>`
      )
      .join("");
  if (H.pick === "tag") {
    const m = HOUI.m,
      first = new Date(y, m - 1, 1),
      dim = new Date(y, m, 0).getDate(),
      off = (first.getDay() + 6) % 7,
      D = c.days || {};
    const mn = new Intl.DateTimeFormat(cLoc(), {
        month: "long",
        year: "numeric",
      }).format(first),
      wd = [...Array(7).keys()].map((i) =>
        new Intl.DateTimeFormat(cLoc(), {
          weekday: "short",
        })
          .format(new Date(2024, 0, 1 + i))
          .replace(/\.$/, "")
      );
    let cells = "";
    for (let i = 0; i < off; i++) cells += `<span class="x"></span>`;
    for (let d = 1; d <= dim; d++) {
      const k = pad(m) + "-" + pad(d),
        we = [0, 6].includes(new Date(y, m - 1, d).getDay());
      cells += `<button type="button" class="${D[k] ? "on" : ""} ${we ? "we" : ""}" data-hoday="${k}">${d}</button>`;
    }
    const mc = Object.keys(D).filter((k) => k.startsWith(pad(m) + "-")).length;
    h += `<div class="hosec">Bürotage</div><div class="hocard"><div class="hocalhd"><button type="button" class="hoar" data-homon="-1" ${m <= 1 ? "disabled" : ""} aria-label="Vorheriger Monat">‹</button><b>${escHtml(cCap(mn))}</b><button type="button" class="hoar" data-homon="1" ${m >= 12 ? "disabled" : ""} aria-label="Nächster Monat">›</button></div>
      <div class="hocal">${wd.map((w) => `<i>${escHtml(w)}</i>`).join("")}${cells}</div>
      <div class="hochips"><button type="button" data-hofill="5">Alle Werktage</button><button type="button" data-hofill="4">Mo–Do</button><button type="button" data-hofill="0">Monat leeren</button></div>
      <div class="hoprog"><i style="width:${Math.min(100, (H.days / HO_DMAX) * 100)}%"></i></div>
      <div class="small muted"><span>Dieser Monat: ${plural(mc, "Tag", "Tage")}</span> · <span>${y}: ${H.days} von ${HO_DMAX} Tagen</span> · <span>${H.days < HO_DMAX ? `noch ${HO_DMAX - H.days} Tage bis zur Grenze` : "Grenze erreicht"}</span></div></div>`;
  }
  h += `<div class="hores"><span><small>${self ? "Wird vom Gewinn abgezogen" : "Wird vom Lohn abgezogen (Werbungskosten)"}</small>${H.pick ? escHtml(OL[H.pick][1]) : ""}</span><b>−${E(H.amt)}</b></div>
    <p class="small muted" style="margin:10px 4px 0">Computer, Möbel und Software trägst du zusätzlich als ${self ? "Betriebsausgabe" : "Werbungskosten"} ein. An einem Tag zählt nur eine Pauschale, auch wenn du mehrere Jobs hast. Schätzung – ersetzt keine Steuerberatung.</p>`;
  b.innerHTML = h;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-hoopen]")) {
    e.preventDefault();
    hoOpen();
    return;
  }
  const bg = $("hoBg");
  if (!bg || bg.hidden) return;
  if (e.target === bg || e.target.closest("[data-hoclose]")) {
    hoClose();
    return;
  }
  const y = HOUI.y,
    c = hoCfg(y);
  const q = e.target.closest("[data-hoq]");
  if (q) {
    const v = q.dataset.v === "1",
      p = {
        [q.dataset.hoq]: v,
      };
    if (!v && q.dataset.hoq === "on") {
    }
    if (!v && q.dataset.hoq === "room") p.center = false;
    hoSet(y, p);
    hoRender();
    return;
  }
  const pk = e.target.closest("[data-hopick]");
  if (pk) {
    hoSet(y, {
      pick: pk.dataset.hopick,
    });
    hoRender();
    return;
  }
  const mo = e.target.closest("[data-homon]");
  if (mo) {
    HOUI.m = Math.max(1, Math.min(12, HOUI.m + Number(mo.dataset.homon)));
    hoRender();
    return;
  }
  const d = e.target.closest("[data-hoday]");
  if (d) {
    const D = {
      ...(c.days || {}),
    };
    if (D[d.dataset.hoday]) delete D[d.dataset.hoday];
    else D[d.dataset.hoday] = 1;
    hoSet(y, {
      days: D,
    });
    hoRender();
    return;
  }
  const f = e.target.closest("[data-hofill]");
  if (f) {
    const n = Number(f.dataset.hofill),
      m = HOUI.m,
      D = {
        ...(c.days || {}),
      },
      dim = new Date(y, m, 0).getDate();
    for (let i = 1; i <= dim; i++) {
      const k = pad(m) + "-" + pad(i),
        wd = (new Date(y, m - 1, i).getDay() + 6) % 7;
      if (n === 0) delete D[k];
      else if (wd < n) D[k] = 1;
      else delete D[k];
    }
    hoSet(y, {
      days: D,
    });
    hoRender();
    return;
  }
  const sg = e.target.closest("[data-hosug]");
  if (sg) {
    hoSet(y, {
      cost: Number(sg.dataset.hosug),
    });
    hoRender();
    return;
  }
});
document.addEventListener("change", (e) => {
  const id = e.target.id;
  if (!["hoM2", "hoM2all", "hoCost"].includes(id)) return;
  const v = Number(String(e.target.value).replace(/\./g, "").replace(",", ".")) || 0;
  hoSet(HOUI.y, {
    [id === "hoM2" ? "m2" : id === "hoM2all" ? "m2all" : "cost"]: v,
  });
  hoRender();
});
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "Escape") {
      const bg = $("hoBg");
      if (bg && !bg.hidden) {
        e.stopPropagation();
        hoClose();
      }
    }
  },
  true
);

/* Abschreibung (AfA) */
const AFA_GWG = 800;
const AFA_ND = [
  [
    /macbook|laptop|notebook|computer|\bpc\b|imac|mac mini|tablet|ipad|monitor|bildschirm|drucker|scanner|software|lizenz|festplatte|ssd|grafiktablett|wacom|tastatur|maus|grafikkarte|server|nas\b/i,
    1,
    "Computer & Software",
  ],
  [/kamera|camera|objektiv|sony α|canon|nikon|fujifilm|gopro|drohne|dji/i, 7, "Kameras"],
  [/smartphone|handy|iphone|galaxy|pixel/i, 5, "Handys"],
  [/schreibtisch|stuhl|regal|möbel|sofa|schrank|tisch|lampe/i, 13, "Büromöbel"],
  [/auto|pkw|fahrzeug|transporter/i, 6, "Autos"],
  [/fahrrad|e-bike|ebike|lastenrad/i, 7, "Fahrräder"],
  [/beamer|projektor|mikrofon|lautsprecher|kopfhörer|licht|leuchte|stativ/i, 5, "Technik"],
];
function afaNet(t) {
  const v = store.settings.kleinunternehmer ? 0 : (Number(store.settings.vatRate) || 0) / 100;
  return t.amount / (1 + v);
}
function afaBig(t) {
  return t.kind === "betrieb" && afaNet(t) > AFA_GWG;
}
function afaGuess(t) {
  const s = (t.note || "") + " " + (t.cat || "");
  for (const [re, y, l] of AFA_ND)
    if (re.test(s))
      return {
        years: y,
        label: l,
      };
  return {
    years: 5,
    label: "",
  };
}
function afaPlan(t) {
  const a = t.afa;
  if (!a || a.use === "p") return {};
  const share = a.use === "m" ? Math.max(10, Math.min(100, Number(a.share) || 50)) / 100 : 1,
    base = round2(t.amount * share);
  const y0 = Number(t.date.slice(0, 4)),
    m0 = Number(t.date.slice(5, 7));
  if (a.mode === "sofort" || !(a.years > 1))
    return {
      [y0]: base,
    };
  const yr = base / a.years,
    out = {};
  let left = base,
    y = y0;
  out[y] = round2((yr * (13 - m0)) / 12);
  left -= out[y];
  while (left > 0.005) {
    y++;
    const v = Math.min(left, round2(yr));
    out[y] = round2(v);
    left = round2(left - v);
    if (y > y0 + 60) break;
  }
  return out;
}
function afaYear(year) {
  let removed = 0,
    afa = 0;
  const items = [],
    open = [];
  for (const t of store.tx) {
    if (t.kind !== "betrieb") continue;
    const ty = Number((t.date || "").slice(0, 4));
    if (t.afa) {
      if (ty === year) removed += t.amount;
      const p = afaPlan(t),
        v = p[year] || 0;
      if (v > 0 || ty === year)
        items.push({
          t,
          v,
          plan: p,
        });
      afa += v;
    } else if (ty === year && afaBig(t)) open.push(t);
  }
  return {
    removed: round2(removed),
    afa: round2(afa),
    items,
    open,
  };
}
const AFAUI = {
  id: null,
  d: null,
};
function afaAsk(id) {
  const t = store.tx.find((x) => x.id === id);
  if (!t) return;
  const g = afaGuess(t);
  AFAUI.id = id;
  AFAUI.d = t.afa
    ? {
        ...t.afa,
      }
    : {
        use: "b",
        share: 70,
        mode: g.years === 1 ? "sofort" : "verteilt",
        years: g.years === 1 ? 3 : g.years,
      };
  let bg = $("afaBg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "afaBg";
    bg.className = "hobg";
    bg.innerHTML = `<div class="hosh" role="dialog" aria-modal="true"><div class="hohd"><b>${svgIcon("basket", 17)} Größere Anschaffung</b><button class="hox" data-afaclose aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="hobody" id="afaBody"></div></div>`;
    document.body.appendChild(bg);
  }
  bg.hidden = false;
  AFAUI.lk = !document.body.classList.contains("locked");
  document.body.classList.add("locked");
  afaRender();
  requestAnimationFrame(() => bg.classList.add("show"));
}
function afaClose() {
  const bg = $("afaBg");
  if (!bg) return;
  bg.classList.remove("show");
  if (AFAUI.lk) document.body.classList.remove("locked");
  setTimeout(() => {
    bg.hidden = true;
  }, 200);
}
function afaRender() {
  const b = $("afaBody"),
    t = store.tx.find((x) => x.id === AFAUI.id);
  if (!b || !t) return;
  const d = AFAUI.d,
    g = afaGuess(t),
    E = (v) => escHtml(fmtEur0(v)),
    y0 = Number(t.date.slice(0, 4));
  const p = afaPlan({
      ...t,
      afa: d,
    }),
    base = Object.values(p).reduce((a, v) => a + v, 0),
    yrs = Object.keys(p);
  const seg = (v, l) => `<button type="button" class="${d.use === v ? "on" : ""}" data-afause="${v}">${l}</button>`;
  b.innerHTML = `<div class="hocard"><div class="hofr"><span><b>${escHtml(txPayee(t) || t.cat || "Ausgabe")}</b><br><span class="small muted"><span>${escHtml(kDate(t.date))}</span> · <span>${escHtml(t.cat || "")}</span></span></span><b>${escHtml(fmtEur(t.amount))}</b></div></div>
    <p class="small muted" style="margin:0 4px 10px">Über ${E(AFA_GWG)} netto muss eine Anschaffung meist über ihre Nutzungsdauer verteilt werden.</p>
    <div class="hosec">Wofür nutzt du sie?</div><div class="hoseg afaseg">${seg("b", "Nur beruflich")}${seg("m", "Gemischt")}${seg("p", "Privat")}</div>
    ${d.use === "m" ? `<div class="hocard" style="margin-top:10px"><div class="hofr"><label for="afaShare">Beruflicher Anteil</label><b>${escHtml(String(d.share))} %</b></div><input type="range" id="afaShare" min="10" max="90" step="5" value="${escHtml(String(d.share))}" class="afarng"><p class="small muted" style="margin:4px 0 6px">Unter 10 % zählt es komplett als privat.</p></div>` : ""}
    ${
      d.use === "p"
        ? `<div class="notice info" style="margin-top:10px"><span>Private Anschaffungen kann man nicht absetzen. Die Ausgabe zählt dann nicht für die Steuer.</span></div>`
        : `
    <div class="hosec">Wie absetzen?</div>
    <button type="button" class="homt ${d.mode === "verteilt" && d.years === g.years && g.years > 1 ? "best" : ""}" data-afamode="verteilt" data-y="${g.years > 1 ? g.years : 3}"><span class="h"><b>Über ${g.years > 1 ? g.years : 3} Jahre verteilen</b></span><small>${g.label && g.years > 1 ? `<span>Üblich für</span> <span>${escHtml(g.label)}</span>` : "Übliche Dauer – bei Bedarf unten ändern"}</small></button>
    <button type="button" class="homt ${d.mode === "sofort" ? "best" : ""}" data-afamode="sofort"><span class="h"><b>Sofort komplett</b></span><small>${g.years === 1 ? `<span>Erlaubt für</span> <span>${escHtml(g.label)}</span> <span>– zählt ganz in ${y0}</span>` : "Nur für Computer, Software und bis 800 € netto"}</small></button>
    <div class="homt ${d.mode === "verteilt" && !(d.years === g.years && g.years > 1) ? "best" : ""}"><span class="h"><b>Andere Dauer</b><span class="afayr"><button type="button" data-afayr="-1" aria-label="Ein Jahr weniger">−</button><b>${escHtml(String(d.years))}</b><button type="button" data-afayr="1" aria-label="Ein Jahr mehr">+</button></span></span><small>Jahre</small></div>
    <div class="hores"><span><small>Wird abgeschrieben</small>${escHtml(fmtEur0(base))}${d.mode === "verteilt" && d.years > 1 ? ` · <span>über ${d.years} Jahre</span>` : ""}</span><b>${y0}: −${E(p[y0] || 0)}</b></div>
    ${yrs.length > 1 ? `<p class="small muted" style="margin:8px 4px 0">${yrs.map((y) => `${y}: ${E(p[y])}`).join(" · ")}</p>` : ""}`
    }
    <div class="afabtns"><button type="button" class="btn" data-afaclose>Später</button><button type="button" class="btn primary" data-afaok>Speichern</button></div>
    <p class="small muted" style="margin:10px 4px 0">Schätzung – ersetzt keine Steuerberatung. Die Nutzungsdauer stammt aus der amtlichen AfA-Tabelle.</p>`;
}
document.addEventListener("click", async (e) => {
  const o = e.target.closest("[data-afaopen]");
  if (o) {
    e.preventDefault();
    afaAsk(o.dataset.afaopen);
    return;
  }
  const bg = $("afaBg");
  if (!bg || bg.hidden) return;
  if (e.target === bg || e.target.closest("[data-afaclose]")) {
    afaClose();
    return;
  }
  const d = AFAUI.d;
  const u = e.target.closest("[data-afause]");
  if (u) {
    d.use = u.dataset.afause;
    afaRender();
    return;
  }
  const m = e.target.closest("[data-afamode]");
  if (m) {
    d.mode = m.dataset.afamode;
    if (m.dataset.y) d.years = Number(m.dataset.y);
    afaRender();
    return;
  }
  const yr = e.target.closest("[data-afayr]");
  if (yr) {
    d.mode = "verteilt";
    d.years = Math.max(2, Math.min(30, (Number(d.years) || 5) + Number(yr.dataset.afayr)));
    afaRender();
    return;
  }
  if (e.target.closest("[data-afaok]")) {
    const t = store.tx.find((x) => x.id === AFAUI.id);
    if (!t) return;
    const doc = {
      ...plainTx(t),
      afa: {
        ...d,
      },
    };
    if (await safe(() => saveTxDoc(t.id, doc, t))) {
      afaClose();
      toast(d.use === "p" ? "Als privat markiert" : "Abschreibung gespeichert");
      render();
    }
    return;
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "afaShare") return;
  AFAUI.d.share = Number(e.target.value);
  const l = e.target.closest(".hocard").querySelector(".hofr b");
  if (l) l.textContent = AFAUI.d.share + " %";
});
document.addEventListener("change", (e) => {
  if (e.target.id === "afaShare") afaRender();
});

/* Kunden-Übersicht */
function kDate(d) {
  try {
    return new Intl.DateTimeFormat(cLoc(), {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(d + "T12:00"));
  } catch (_) {
    return d;
  }
}
const KCOL = ["#147a5b", "#2f7fb8", "#c9a227", "#7a5bc2", "#d14d72", "#0f8a8a", "#e07a2e", "#5b6472"];
function kundenOf(y) {
  const m = new Map();
  for (const t of store.tx) {
    if (t.kind !== "einnahme" || incArt(t.cat) !== "selbst" || !(t.date || "").startsWith(y + "-")) continue;
    const n = (txPayee(t) || t.cat || "?").trim(),
      k = n
        .toLowerCase()
        .replace(/\s+(gmbh|ug|ag|kg|e\.?k\.?|gbr|ltd)\.?$/i, "")
        .replace(/[^\p{L}\p{N}]+/gu, "");
    const v = t.net != null ? Number(t.net) || 0 : t.amount;
    const o = m.get(k) || {
      name: n,
      sum: 0,
      tx: [],
    };
    o.sum += v;
    o.tx.push(t);
    m.set(k, o);
  }
  const list = [...m.values()].sort((a, b) => b.sum - a.sum),
    tot = list.reduce((a, o) => a + o.sum, 0);
  return {
    list,
    tot,
  };
}
function kundenView(y) {
  const { list, tot } = kundenOf(y),
    E = (v) => escHtml(fmtEur0(v));
  if (!list.length)
    return `<p class="small muted">${escHtml(
      uiText("ku_none", {
        y: String(y),
      })
    )}</p>`;
  const top = (list[0].sum / tot) * 100,
    P = (v) => Math.round(v) + " %";
  const warn =
    list.length >= 1 && tot > 0
      ? top >= 83.3
        ? `<div class="notice bad" style="margin-bottom:10px"><span>${P(top)} deiner Einnahmen kommen von einem Kunden. Ab 5/6 (83 %) kann für Selbstständige mit nur einem Auftraggeber Rentenversicherungspflicht entstehen – lass das am besten prüfen.</span></div>`
        : top > 50
          ? `<div class="notice warn" style="margin-bottom:10px"><span>${P(top)} deiner Einnahmen kommen von einem Kunden. Fällt er weg, fehlt dir über die Hälfte – such dir am besten noch weitere Kunden.</span></div>`
          : ""
      : "";
  const show = list.slice(0, 8),
    rest = list.slice(8),
    restSum = rest.reduce((a, o) => a + o.sum, 0);
  return `${warn}<div class="kdl">${show
    .map(
      (
        o,
        i
      ) => `<details class="kdr"><summary><span class="kav" style="background:${KCOL[i % KCOL.length]}">${escHtml((o.name.match(/\p{L}|\p{N}/u) || ["?"])[0].toUpperCase())}</span><span class="kn"><b>${escHtml(o.name)}</b><span class="kbar"><i style="width:${Math.max(2, (o.sum / list[0].sum) * 100)}%;background:${KCOL[i % KCOL.length]}"></i></span><small>${o.tx.length === 1 ? "1 Zahlung" : `${o.tx.length} Zahlungen`}</small></span><span class="kv"><b>${E(o.sum)}</b><small>${P((o.sum / tot) * 100)}</small></span></summary>
      <div class="kdx">${o.tx
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(
          (t) =>
            `<button type="button" class="kdt" data-edit="${escHtml(t.id)}"><span>${escHtml(kDate(t.date))}</span><b>${escHtml(fmtEur(t.net != null ? Number(t.net) || 0 : t.amount))}</b></button>`
        )
        .join("")}</div></details>`
    )
    .join("")}
    ${rest.length ? `<div class="kdr kmore"><span class="kav" style="background:#8a938e">+</span><span class="kn"><b>${rest.length} weitere</b></span><span class="kv"><b>${E(restSum)}</b><small>${P((restSum / tot) * 100)}</small></span></div>` : ""}</div>
    <p class="small muted" style="margin:10px 2px 0">Gesamt ${E(tot)} ohne Umsatzsteuer · Kunden werden am Namen in deinen Einnahmen erkannt.</p>`;
}

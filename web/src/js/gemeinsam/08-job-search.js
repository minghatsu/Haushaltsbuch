/* Arbeitssuche */
const isJobless = () => ["alg", "grusi"].includes(store.settings.work);
const GPROF = {
  alg: {
    amt: "Arbeitslosengeld",
    tile: "Leistung & Amt",
    day: 0,
    pots: 1,
    side: "jl",
    terms: [
      "Agentur für Arbeit",
      "Nachweise abgeben",
      "Bewerbungsgespräch",
      "Maßnahme / Kurs",
      "Weiterbewilligung abgeben",
    ],
  },
  grusi: {
    amt: "Grundsicherung",
    tile: "Leistung & Amt",
    day: 1,
    pots: 1,
    side: "jl",
    terms: [
      "Jobcenter-Termin",
      "Weiterbewilligung abgeben",
      "Nachweise abgeben",
      "Bewerbungsgespräch",
      "Maßnahme / Kurs",
    ],
  },
  studium: {
    amt: "BAföG",
    tile: "Studium & BAföG",
    day: 0,
    side: "bafoeg",
    cd: "BAföG endet",
    cdHint: "Ende der Förderungshöchstdauer laut Bescheid",
    terms: [
      "BAföG-Folgeantrag",
      "Rückmeldung / Semesterbeitrag",
      "Prüfung",
      "Leistungsnachweis abgeben",
      "Wohngeld-Antrag",
    ],
    tip: `Nebenjob: Bis zur Minijob-Grenze von ${MJ_NOW} € im Monat wird dein BAföG in der Regel nicht gekürzt. Den Folgeantrag spätestens 2 Monate vor Ende des Bewilligungszeitraums stellen, sonst kommt das Geld zu spät.`,
    cats: ["Uni & Bücher", "Semesterbeitrag", "Miete & Wohnen"],
  },
  schule: {
    amt: "Taschengeld",
    tile: "Schule & Taschengeld",
    day: 1,
    side: "ferien",
    terms: ["Klassenfahrt bezahlen", "Schüler-BAföG-Antrag", "Prüfung", "Zeugnis"],
    tip: "Ferienjob: Ab 15 darfst du in den Ferien bis zu 4 Wochen im Jahr arbeiten. Schüler-BAföG gibt es meist ab Klasse 10, wenn du nicht bei den Eltern wohnst.",
    cats: ["Schule & Material", "Handy"],
    inc: [["Taschengeld", "sonstige"]],
  },
  azubi: {
    amt: "Ausbildungsgehalt",
    tile: "Ausbildung",
    day: 0,
    cd: "Ausbildung endet",
    cdHint: "Ende laut Ausbildungsvertrag",
    terms: ["Berufsschule", "Zwischenprüfung", "Abschlussprüfung", "BAB-Antrag", "Berichtsheft abgeben"],
    tip: "Wohnst du nicht mehr bei den Eltern? Dann prüf die Berufsausbildungsbeihilfe (BAB) bei der Agentur für Arbeit. Fahrten zur Berufsschule kannst du in der Steuererklärung angeben.",
    cats: ["Berufsschule & Material", "Fahrt zur Arbeit"],
  },
  rente: {
    amt: "Rente",
    tile: "Rente",
    day: 0,
    side: "steuer",
    terms: ["Rentenbescheid prüfen", "Rentenanpassung (Juli)", "Steuererklärung abgeben", "Krankenkasse"],
    tip: "Neben einer Altersrente darfst du seit 2023 unbegrenzt dazuverdienen. Ein Teil der Rente ist steuerpflichtig – die Analyse sagt dir, ob du eine Steuererklärung abgeben musst.",
    cats: ["Gesundheit & Medikamente", "Pflege"],
  },
  eltern: {
    amt: "Elterngeld",
    tile: "Elternzeit",
    day: 0,
    cd: "Elterngeld endet",
    cdHint: "letzter Lebensmonat mit Elterngeld laut Bescheid",
    terms: ["Elterngeld-Nachweis", "U-Untersuchung", "Kita-Anmeldung", "Kindergeld-Antrag"],
    tip: "In der Elternzeit darfst du bis zu 32 Stunden pro Woche arbeiten. ElterngeldPlus: halber Betrag, dafür doppelt so lange. Plane früh, wovon du nach dem Elterngeld lebst.",
    cats: ["Kind & Baby", "Kita"],
    inc: [["Kindergeld", "kindergeld"]],
  },
  krank: {
    amt: "Krankengeld",
    tile: "Krankengeld",
    day: 0,
    since: 1,
    cd: "Krankengeld endet",
    cdHint: "höchstens 78 Wochen ab Beginn der Krankheit",
    terms: ["Arzttermin", "Krankmeldung an die Kasse", "Reha-Antrag", "Gutachten / Medizinischer Dienst"],
    tip: "Krankengeld: 70 % vom Brutto, höchstens 90 % vom Netto – für dieselbe Krankheit höchstens 78 Wochen in 3 Jahren. Die Krankmeldung muss lückenlos sein, sonst stoppt die Zahlung.",
    cats: ["Gesundheit & Medikamente", "Zuzahlungen"],
  },
  beamte: {
    amt: "Besoldung",
    tile: "Besoldung & Beihilfe",
    day: 1,
    side: "beihilfe",
    terms: ["Beihilfe einreichen", "PKV-Rechnung einreichen", "Beurteilung"],
    tip: "Arztrechnungen: Beihilfe und private Krankenversicherung zahlen getrennt – reich beides ein, sonst bleibt Geld liegen.",
    cats: ["Private Krankenversicherung", "Arzt & Rechnungen"],
    inc: [["Beihilfe & PKV-Erstattung", "sonstige"]],
  },
};
const prof = () => GPROF[store.settings.work] || null;
const hasProfile = () => !!prof();
function profEnd() {
  const P = prof(),
    j = jlCfg();
  if (!P || !P.cd) return null;
  if (P.since) {
    if (!j.since) return null;
    const d = new Date(j.since + "T12:00");
    d.setDate(d.getDate() + 546);
    return isoOf(d);
  }
  return j.until || null;
}
const POT_DEF = [
  ["Essen & Trinken", 34.5, "food", /lebensm|essen|haushalt|super|rewe|edeka|aldi|lidl|getränk/],
  ["Strom & Wohnen", 8.4, "bolt", /strom|energie|wohn|gas/],
  ["Handy & Internet", 8.3, "phone", /handy|internet|telefon|mobil|wlan|abo/],
  ["Bus & Bahn", 8.9, "car", /bus|bahn|ticket|tank|auto|park|fahr|verkehr/],
  ["Kleidung", 7.5, "shirt", /kleid|schuh|mode/],
  ["Freizeit", 8.9, "spark", /freizeit|spaß|spass|kino|hobby|sport|urlaub|ausgehen/],
  ["Haushalt & Möbel", 6.3, "home", /möbel|deko|bau|werkzeug/],
  ["Gesundheit", 3.7, "health", /gesund|apothek|arzt|drogerie|pflege/],
  ["Sonstiges", 13.5, "dots", /./],
];
function jlCfg() {
  const st = store.settings,
    j = (st.jl = st.jl || {});
  if (j.amount == null) j.amount = st.work === "grusi" ? 563 : 0;
  if (j.payDay == null)
    j.payDay = (
      GPROF[st.work] || {
        day: 1,
      }
    ).day;
  j.beihilfe = j.beihilfe || [];
  if (!j.pots)
    j.pots = POT_DEF.map(([n, p]) => ({
      n,
      v: Math.round(((j.amount || 563) * p) / 100),
    }));
  j.terms = j.terms || [];
  j.catPot = j.catPot || {};
  return j;
}
function potOfCat(cat) {
  const j = jlCfg();
  if (j.catPot[cat] && j.pots.some((p) => p.n === j.catPot[cat])) return j.catPot[cat];
  const c = normText(cat || "");
  for (const [n, , , re] of POT_DEF) if (n !== "Sonstiges" && re.test(c) && j.pots.some((p) => p.n === n)) return n;
  return j.pots.some((p) => p.n === "Sonstiges") ? "Sonstiges" : (j.pots[0] || {}).n;
}
function nextPay() {
  const j = jlCfg(),
    now = new Date(),
    y = now.getFullYear(),
    m = now.getMonth(),
    d = now.getDate();
  const dayIn = (yy, mm) => {
    const last = new Date(yy, mm + 1, 0).getDate();
    return j.payDay > 0 ? Math.min(j.payDay, last) : last;
  };
  let t = new Date(y, m, dayIn(y, m));
  if (d >= t.getDate()) t = new Date(y, m + 1, dayIn(y, m + 1));
  return {
    date: t,
    days: Math.max(1, Math.round((t - new Date(y, m, d)) / 864e5)),
  };
}
function jlKeep(gross) {
  if (store.settings.work === "alg") return Math.min(gross, 165);
  const kid = Number(store.settings.kinder) > 0,
    top = kid ? 1500 : 1200;
  if (gross <= 0) return 0;
  let k = Math.min(gross, 100);
  if (gross > 100) k += (Math.min(gross, 520) - 100) * 0.2;
  if (gross > 520) k += (Math.min(gross, 1000) - 520) * 0.3;
  if (gross > 1000) k += (Math.min(gross, top) - 1000) * 0.1;
  return Math.round(k);
}
function joblessTop(ym, free, c) {
  const P = prof();
  if (!P) return "";
  const j = jlCfg(),
    np = nextPay(),
    cur = ymOf(new Date()),
    grusi = store.settings.work === "grusi";
  const spent = {};
  for (const t of c.tx)
    if (t.kind === "ausgabe") {
      const p = potOfCat(t.cat);
      spent[p] = (spent[p] || 0) + t.amount;
    }
  const pots = j.pots
      .filter((p) => p.v > 0)
      .map((p) => ({
        ...p,
        s: spent[p.n] || 0,
      })),
    show = ui.potAll ? pots : pots.slice(0, 4);
  const left = ym === cur ? free : null,
    today = isoToday();
  const terms = j.terms
    .filter((t) => t.d >= today)
    .sort((a, b) => (a.d + (a.t || "")).localeCompare(b.d + (b.t || "")))
    .slice(0, 3);
  const mini = Number(j.mini) || 0,
    keep = jlKeep(mini),
    goal = (store.settings.goals || [])[0];
  const potIc = (n) => (POT_DEF.find((x) => x[0] === n) || [, , "dots"])[2];
  const end = profEnd(),
    endDays = end ? Math.round((new Date(end + "T12:00") - new Date(today + "T12:00")) / 864e5) : null;
  const fmtD = (d) =>
    new Date(d + "T12:00").toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const go = `data-go="more" data-sp="amt"`,
    MJ = yearLimits(ym.slice(0, 4)).mj;
  const tiles = [];
  if (P.side === "jl")
    tiles.push(
      `<button class="card" data-zvopen><span class="jli">${svgIcon("cash", 17)}</span><b>Minijob</b><small>${mini ? `${escHtml(fmtEur0(mini))} Lohn<br><b>${escHtml(fmtEur0(keep))} behältst du</b>` : "Rechner öffnen"}</small></button>`
    );
  else if (P.side === "bafoeg")
    tiles.push(
      `<button class="card" ${go}><span class="jli">${svgIcon("case", 17)}</span><b>Nebenjob</b><small>${mini ? `${escHtml(fmtEur0(mini))} im Monat<br><b class="${mini > MJ ? "neg" : ""}">${mini > MJ ? `${escHtml(fmtEur0(mini - MJ))} über der Grenze` : `noch ${escHtml(fmtEur0(MJ - mini))} frei`}</b>` : `bis ${MJ} € ohne Abzug`}</small></button>`
    );
  else if (P.side === "ferien")
    tiles.push(
      `<button class="card" ${go}><span class="jli">${svgIcon("case", 17)}</span><b>Ferienjob</b><small>${mini ? `${escHtml(fmtEur0(mini))} verdient<br><b>bleibt dir ganz</b>` : "eintragen, was du verdienst"}</small></button>`
    );
  else if (P.side === "beihilfe") {
    const open = j.beihilfe.filter((x) => !x.done),
      sumO = sum(open, (x) => Number(x.amt) || 0);
    tiles.push(
      `<button class="card" ${go}><span class="jli">${svgIcon("health", 17)}</span><b>Beihilfe</b><small>${open.length ? `${open.length} offen<br><b>${escHtml(fmtEur0(sumO))} ausstehend</b>` : "keine Rechnung offen"}</small></button>`
    );
  } else if (P.side === "steuer") {
    const y = Number(ym.slice(0, 4)),
      tx = taxCalc(y),
      ts = taxStatus(y, tx);
    tiles.push(
      `<button class="card" data-go="year"><span class="jli">${svgIcon("receipt", 17)}</span><b>Steuer ${y}</b><small>${ts.kind === "pflicht" ? `<b class="neg">Erklärung Pflicht</b><br>ca. ${escHtml(fmtEur0(Math.max(0, tx.due)))}` : ts.kind === "erstattung" ? `<b class="pos">ca. ${escHtml(fmtEur0(-tx.due))} zurück</b>` : "keine Erklärung nötig"}</small></button>`
    );
  }
  if (P.cd)
    tiles.push(
      `<button class="card" ${go}><span class="jli">${svgIcon("cal", 17)}</span><b>${escHtml(P.cd)}</b><small>${end ? `${endDays < 0 ? "seit" : "am"} ${escHtml(new Date(end + "T12:00").toLocaleDateString("de-DE"))}<br><b class="${endDays >= 0 && endDays <= 90 ? "neg" : ""}">${endDays < 0 ? "vorbei" : endDays < 62 ? `noch ${plural(endDays, "Tag", "Tage")}` : `noch ${Math.round(endDays / 30.4)} Monate`}</b>` : P.since ? "Beginn eintragen" : "Datum eintragen"}</small></button>`
    );
  if (tiles.length < 2)
    tiles.push(
      goal
        ? `<button class="card" data-goalsopen="1"><span class="jli">${svgIcon("piggy", 17)}</span><b>${store.settings.work === "schule" ? "Sparziel" : "Rücklage"}</b><small>${escHtml(goal.name)}<br><b>${escHtml(fmtEur0(goalSaved(goal).v))} / ${escHtml(fmtEur0(goal.target))}</b></small></button>`
        : `<button class="card" id="goalFirst"><span class="jli">${svgIcon("piggy", 17)}</span><b>${store.settings.work === "schule" ? "Sparziel" : "Rücklage"}</b><small>${store.settings.work === "schule" ? "auf etwas hin sparen" : "für teure Monate anlegen"}</small></button>`
    );
  return `<div class="jl">
    <div class="jlpay"><small>Nächste Zahlung · ${escHtml(
      np.date.toLocaleDateString("de-DE", {
        day: "numeric",
        month: "long",
      })
    )}</small>
      <div class="jlcd"><div><b>${np.days}</b><span>${np.days === 1 ? "Tag" : "Tage"}</span></div><div><b>${left == null ? "–" : escHtml(fmtEur0(left))}</b><span>übrig</span></div><div><b>${left == null ? "–" : escHtml(fmtEur0(Math.max(0, left) / np.days))}</b><span>pro Tag</span></div></div>
      <span class="jlsub">${escHtml(P.amt)} ${j.amount ? escHtml(fmtEur0(j.amount)) : "– Betrag eintragen"}${grusi && j.rentDirect ? " · Miete zahlt das Amt direkt" : ""}</span></div>
    ${
      P.pots
        ? `<div class="card jlpots"><div class="card-head"><h2>${headIcon("target")}Deine Töpfe</h2><button class="link" ${go}>Anpassen ${svgIcon("right", 16)}</button></div>
      ${show
        .map((p) => {
          const r = p.s / p.v,
            ov = p.s > p.v,
            col = ov ? "var(--bad)" : themeCol("#2e9c74", j.pots.indexOf(j.pots.find((x) => x.n === p.n)));
          return `<div class="bpr"><span class="bpic" style="--bc:${col}">${svgIcon(potIc(p.n), 16)}</span><span class="bpm"><span class="bpl"><b>${escHtml(p.n)}</b><span class="${ov ? "neg" : "muted"}">${ov ? `${escHtml(fmtEur0(p.s - p.v))} drüber` : `${escHtml(fmtEur0(p.v - p.s))} frei`}</span></span><span class="bpbar"><i style="width:${Math.min(100, Math.max(p.s ? 3 : 0, r * 100))}%;background:${col}"></i></span></span></div>`;
        })
        .join("")}
      ${pots.length > 4 ? `<button class="link small bpmore" data-potall="1">${ui.potAll ? "Weniger" : `Alle ${pots.length} Töpfe`}</button>` : ""}</div>`
        : ""
    }
    <div class="jltiles">${tiles.slice(0, 2).join("")}</div>
    ${
      P.side === "jl"
        ? `<button type="button" class="card jlbs" data-bsopen><span class="jli">${svgIcon("doccheck", 18)}</span><span class="grow"><b>Bescheid-Check</b><small>${(() => {
            const B = (jlCfg().bescheide || []).slice().sort((a, c) => (c.from || "").localeCompare(a.from || ""))[0];
            return B && B.wid && daysTo(B.wid) >= 0
              ? escHtml(
                  uiText("bs_w", {
                    d: dLong(B.wid, {
                      day: "numeric",
                      month: "short",
                    }),
                  })
                )
              : "Bescheid fotografieren & prüfen";
          })()}</small></span><span class="fcchev">›</span></button>`
        : ""
    }
    <div class="card jlterms"><div class="card-head"><h2>${headIcon("cal")}Termine & Fristen</h2>${terms.length ? `<span class="pill">${terms.length} offen</span>` : ""}</div>
      ${
        terms.length
          ? terms
              .map(
                (t) =>
                  `<div class="jlt" data-tmopen="${escHtml(t.id)}" role="button" tabindex="0" style="cursor:pointer"><span class="jli">${svgIcon(/bewillig|antrag|nachweis|frist|einreich|bescheid|meldung/i.test(t.n) ? "doc" : "cal", 16)}</span><span class="n"><b>${escHtml(t.n)}</b><small>${escHtml(
                    new Date(t.d + "T12:00").toLocaleDateString(localeTag(), {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                    })
                  )}${t.t ? ` · ${escHtml(t.t)} Uhr` : ""}${t.d === today ? " · heute" : ""}</small></span></div>`
              )
              .join("")
          : `<p class="small muted" style="margin:0">Keine Termine eingetragen.</p>`
      }
      <button class="link small" data-tmopen style="margin-top:8px">+ Termin eintragen</button></div>
    ${P.tip && !(store.settings.tipsOff || {})[store.settings.work] ? `<div class="notice info jltip"><span>${escHtml(P.tip)}</span><button class="icon-btn" data-tipoff="1" aria-label="Tipp ausblenden">×</button></div>` : ""}
  </div>`;
}
document.addEventListener("change", async (e) => {
  const f = e.target.closest("[data-mper]");
  if (!f) return;
  const [i, k] = f.dataset.mper.split("|"),
    p = mindPer();
  if (!p[i]) return;
  if (k === "ym") {
    if (!/^\d{4}-\d{2}$/.test(f.value)) return;
    p[i].ym = f.value;
  } else {
    const v = parseAmt(f.value || "0");
    if (!(v >= 0 && v <= 60)) {
      toast("Stunden ungültig");
      return;
    }
    p[i].h = v;
  }
  const m = (store.settings.mindest = {
    ...(store.settings.mindest || {}),
    p,
  });
  m.h = Number(mindH(ymOf(new Date()))) || m.h;
  await saveSettings();
  toast("Gespeichert");
});
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-mperadd]")) {
    const m = (store.settings.mindest = {
      ...(store.settings.mindest || {}),
    });
    let p = mindPer();
    if (!p.length && Number(m.h) > 0)
      p = [
        {
          ym: (ui.ym || ymOf(new Date())).slice(0, 4) + "-01",
          h: Number(m.h),
        },
      ];
    p.push({
      ym: ymOf(new Date()),
      h: Number(m.h) || 0,
    });
    m.p = p;
    await saveSettings();
    return;
  }
  const d = e.target.closest("[data-mperdel]");
  if (d) {
    const p = mindPer();
    p.splice(Number(d.dataset.mperdel), 1);
    store.settings.mindest = {
      ...(store.settings.mindest || {}),
      p,
    };
    await saveSettings();
  }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "aMind") {
    const m = (store.settings.mindest = {
      ...(store.settings.mindest || {}),
    });
    m.on = t.checked;
    if (m.on && !m.h) m.h = 40;
    saveSettings();
  } else if (t.id === "aMindH") {
    const v = parseAmt(t.value);
    if (isFinite(v)) {
      store.settings.mindest = {
        ...(store.settings.mindest || {}),
        h: Math.min(60, Math.max(0, v)),
      };
      saveSettings();
      toast("Gespeichert");
    }
  }
});
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-tipoff]")) {
    const o = (store.settings.tipsOff = store.settings.tipsOff || {});
    o[store.settings.work] = 1;
    saveSettings();
  }
});
document.addEventListener("click", (e) => {
  if (e.target.closest("#stmtMore")) {
    const im = ui.imp && ui.imp.photo ? ui.imp : null;
    CAM.pages = im ? im.pages : null;
    CAM.raw = im ? im.raw : null;
    smartScan({
      type: "stmt",
    });
  }
});
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-potall]")) {
    ui.potAll = !ui.potAll;
    render();
  }
});
function renderAmtEd() {
  const el = $("amtEd");
  if (!el) return;
  if ((el.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName)) || pdHold(el))
    return;
  const j = jlCfg(),
    w = store.settings.work,
    P = prof() || GPROF.alg,
    mini = Number(j.mini) || 0,
    today = isoToday();
  const ecats = cats("ausgabe"),
    end = profEnd();
  el.innerHTML = `
    <div class="field"><label for="aWork">Wie verdienst du dein Geld?</label><select class="in" id="aWork">${WGROUPS.map(
      ([g, gt]) =>
        `<optgroup label="${gt}">${WORK.filter((x) => x[3] === g)
          .map(([k, t]) => `<option value="${k}" ${k === w ? "selected" : ""}>${t}</option>`)
          .join("")}</optgroup>`
    ).join("")}</select></div>
    <div class="field"><label>Verdienst du noch etwas dazu?</label><div class="exchips">${exChips()}</div></div>
    <div class="grid2"><div class="field"><label for="aAmt">${escHtml(P.amt)} pro Monat (€)</label><input class="in" id="aAmt" inputmode="decimal" value="${j.amount ? escHtml(numStr(j.amount)) : ""}" placeholder="${w === "grusi" ? "563" : w === "schule" ? "z. B. 50" : "laut Bescheid / Abrechnung"}"></div>
      <div class="field"><label for="aDay">Geld kommt am</label><select class="in" id="aDay">${[
        0,
        ...Array.from(
          {
            length: 28,
          },
          (_, i) => i + 1
        ),
      ]
        .map(
          (d) =>
            `<option value="${d}" ${d === j.payDay ? "selected" : ""}>${d ? d + ". des Monats" : "Monatsende"}</option>`
        )
        .join("")}</select></div></div>
    ${w === "grusi" ? `<div class="switch"><label for="aRent"><b>Miete zahlt das Amt direkt</b><br><span class="small muted">an deinen Vermieter</span></label><input type="checkbox" id="aRent" ${j.rentDirect ? "checked" : ""}></div>` : ""}
    ${P.cd ? `<div class="field"><label for="${P.since ? "aSince" : "aUntil"}">${P.since ? "Krank seit" : escHtml(P.cd)}</label><input class="in" type="date" id="${P.since ? "aSince" : "aUntil"}" value="${escHtml((P.since ? j.since : j.until) || "")}"><span class="small muted">${escHtml(P.cdHint || "")}${P.since && end ? ` – endet spätestens am ${escHtml(new Date(end + "T12:00").toLocaleDateString("de-DE"))}` : ""}</span></div>` : ""}
    ${
      P.pots
        ? `<div class="section-title" style="font-size:14px">Töpfe</div>
    <p class="small muted" style="margin:-4px 0 8px">Richtwerte, ungefähr so wie das Amt den Regelsatz aufteilt. Ändere die Beträge, wie es für dich passt.</p>
    <div class="jlpe">${j.pots.map((p, i) => `<div class="jlpr"><input class="in" data-potn="${i}" value="${escHtml(p.n)}" aria-label="Name"><input class="in" data-potv="${i}" inputmode="decimal" value="${escHtml(numStr(p.v))}" aria-label="Betrag"><button class="icon-btn" data-potdel="${i}" aria-label="Topf löschen">×</button></div>`).join("")}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="chip" data-potadd="1">+ Topf</button><button class="chip" data-potsplit="1">Neu aufteilen aus ${escHtml(fmtEur0(j.amount || 563))}</button></div>
    <div class="section-title" style="font-size:14px">Welche Kategorie gehört in welchen Topf?</div>
    ${ecats.map((c) => `<div class="jlmap"><span>${tile("ausgabe", c)}<b>${escHtml(c)}</b></span><select class="in" data-catpot="${escHtml(c)}">${j.pots.map((p) => `<option ${potOfCat(c) === p.n ? "selected" : ""}>${escHtml(p.n)}</option>`).join("")}</select></div>`).join("")}`
        : ""
    }
    ${
      P.side === "beihilfe"
        ? `<div class="section-title" style="font-size:14px">Beihilfe & PKV</div>
    <p class="small muted" style="margin:-4px 0 8px">Trag jede eingereichte Arztrechnung ein und hak sie ab, wenn das Geld da ist.</p>
    ${j.beihilfe
      .slice()
      .sort((a, b) => a.done - b.done || (b.d || "").localeCompare(a.d || ""))
      .map(
        (x) =>
          `<div class="jlt ${x.done ? "past" : ""}"><button class="icon-btn" data-bhdone="${escHtml(x.id)}" aria-label="${x.done ? "Wieder offen" : "Erstattet"}">${x.done ? "✓" : "○"}</button><span class="n"><b>${escHtml(x.n)} · ${escHtml(fmtEur(x.amt))}</b><small>eingereicht ${escHtml(new Date(x.d + "T12:00").toLocaleDateString("de-DE"))}${x.done ? " · erstattet" : ""}</small></span><button class="icon-btn" data-bhdel="${escHtml(x.id)}" aria-label="Löschen">×</button></div>`
      )
      .join("")}
    <div class="jlnew"><input class="in" id="bhN" placeholder="z. B. Zahnarzt"><input class="in" id="bhA" inputmode="decimal" placeholder="Betrag €"><input class="in" type="date" id="bhD" value="${today}"><button class="btn primary" id="bhAdd">Eintragen</button></div>`
        : ""
    }
    <div class="section-title" style="font-size:14px">Termine & Fristen</div>
    <div class="vabtns" style="margin:0 0 10px"><button type="button" class="btn primary" data-tmopen>Termine öffnen</button><button type="button" class="btn" data-bsopen>${svgIcon("doccheck", 16)} Bescheid-Check</button></div>
    ${j.terms
      .slice()
      .sort((a, b) => a.d.localeCompare(b.d))
      .map(
        (t) =>
          `<div class="jlt ${t.d < today ? "past" : ""}"><span class="jli">${svgIcon("cal", 16)}</span><span class="n"><b>${escHtml(t.n)}</b><small>${escHtml(new Date(t.d + "T12:00").toLocaleDateString("de-DE"))}${t.t ? ` · ${escHtml(t.t)} Uhr` : ""}</small></span><button class="icon-btn" data-termdel="${escHtml(t.id)}" aria-label="Termin löschen">×</button></div>`
      )
      .join("")}
    <div class="jlnew"><select class="in" id="tN">${P.terms.map((n) => `<option>${escHtml(n)}</option>`).join("")}<option>Sonstiger Termin</option></select><input class="in" type="date" id="tD" value="${today}"><input class="in" type="time" id="tT"><button class="btn primary" id="tAdd">Eintragen</button></div>
    ${
      P.side === "jl"
        ? `<div class="section-title" style="font-size:14px">Minijob-Rechner</div><button type="button" class="btn primary" data-zvopen style="margin-bottom:10px">Zuverdienst-Rechner öffnen</button>
    <div class="field"><label for="aMini">Lohn pro Monat (€ brutto)</label><input class="in" id="aMini" inputmode="decimal" value="${mini ? escHtml(numStr(mini)) : ""}" placeholder="z. B. 300"></div>
    ${mini ? `<div class="notice info"><span>Von <b>${escHtml(fmtEur(mini))}</b> behältst du ungefähr <b>${escHtml(fmtEur(jlKeep(mini)))}</b> zusätzlich, <b>${escHtml(fmtEur(Math.max(0, mini - jlKeep(mini))))}</b> werden ${w === "alg" ? "vom Arbeitslosengeld" : "von der Grundsicherung"} abgezogen.</span></div>` : ""}
    <p class="small muted" style="margin:8px 0 0">${w === "alg" ? "Arbeitslosengeld: 165 € Nebenverdienst im Monat sind frei, höchstens 15 Stunden pro Woche." : "Grundsicherung: die ersten 100 € sind frei, darüber bleiben 20 % (bis 520 €), 30 % (bis 1.000 €) und 10 % (bis 1.200 €, mit Kind 1.500 €)."} Angaben ohne Gewähr – im Zweifel beim ${w === "alg" ? "Arbeitsamt" : "Jobcenter"} nachfragen.</p>`
        : P.side === "bafoeg" || P.side === "ferien"
          ? `<div class="section-title" style="font-size:14px">${P.side === "bafoeg" ? "Nebenjob" : "Ferienjob"}</div>
    <div class="field"><label for="aMini">${P.side === "bafoeg" ? "Lohn pro Monat (€ brutto)" : "Verdient (€)"}</label><input class="in" id="aMini" inputmode="decimal" value="${mini ? escHtml(numStr(mini)) : ""}" placeholder="z. B. 450"></div>
    ${P.side === "bafoeg" && mini ? `<div class="notice ${mini > yearLimits().mj ? "warn" : "ok"}"><span>${mini > yearLimits().mj ? `Du liegst <b>${escHtml(fmtEur(mini - yearLimits().mj))}</b> über der Minijob-Grenze – das BAföG kann gekürzt werden. Melde den Verdienst dem BAföG-Amt.` : `Passt: noch <b>${escHtml(fmtEur(yearLimits().mj - mini))}</b> bis zur Grenze von ${yearLimits().mj} €.`}</span></div>` : ""}`
          : ""
    }
    ${P.tip ? `<div class="notice info" style="margin-top:14px"><span>${escHtml(P.tip)}</span></div>` : ""}`;
}

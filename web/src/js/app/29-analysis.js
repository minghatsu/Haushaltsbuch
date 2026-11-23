/* Analyse */
const AGRP = {
  angestellt: ["Arbeit &amp; Steuer", ["lohn", "wk", "tax", "hourly"]],
  beamte: ["Besoldung &amp; Steuer", ["lohn", "wk", "tax", "beihilfe"]],
  azubi: ["Ausbildung &amp; Steuer", ["lohn", "wk", "tax", "bab"]],
  minijob: ["Minijob", ["lohn", "mjgrenze", "hourly", "quellen"]],
  selbst: ["Selbstständig &amp; Steuer", ["tax", "wk", "euer", "ruecklage"]],
  beides: ["Arbeit &amp; Steuer", ["lohn", "wk", "tax", "euer"]],
  alg: ["Leistung &amp; Amt", ["pots", "mini", "terms", "nachweis"]],
  grusi: ["Leistung &amp; Amt", ["pots", "mini", "terms", "nachweis"]],
  studium: ["Studium &amp; BAföG", ["bafoeg", "nebenjob", "rueck", "tax"]],
  schule: ["Schule &amp; Taschengeld", ["taschen", "ferien", "wofuer", "tax"]],
  rente: ["Rente &amp; Steuer", ["rente", "tax", "hinzu", "kk"]],
  eltern: ["Elternzeit", ["elend", "kindergeld", "kind", "tax"]],
  krank: ["Krankengeld", ["kgverlauf", "kgende", "zuzahl", "tax"]],
};
const anaGrp = () => {
  const g = AGRP[store.settings.work] || AGRP.beides;
  return hasSelf() && !g[1].includes("kunden") ? [g[0], [...g[1], "kunden"]] : g;
};
const ATL = {
  goal: ["Sparziele", "#2f7fb8", "piggy"],
  fix: ["Fixkosten", "#0f766e", "list"],
  hourly: ["Stundenlohn", "#15803d", "cash"],
  beihilfe: ["Beihilfe", "#0e7490", "health"],
  bab: ["BAB-Check", "#4d7c0f", "book"],
  mjgrenze: ["Grenze", "#c27c0e", "target"],
  quellen: ["Quellen", "#047857", "list"],
  ruecklage: ["Rücklage", "#3f6212", "piggy"],
  pots: ["Töpfe", "#15803d", "target"],
  mini: ["Minijob", "#4d7c0f", "case"],
  terms: ["Termine", "#0e7490", "cal"],
  nachweis: ["Nachweis", "#047857", "doc"],
  bafoeg: ["BAföG", "#15803d", "book"],
  nebenjob: ["Nebenjob", "#4d7c0f", "case"],
  rueck: ["Rückzahlung", "#0e7490", "bank"],
  taschen: ["Taschengeld", "#15803d", "wallet"],
  ferien: ["Ferienjob", "#4d7c0f", "case"],
  wofuer: ["Wofür", "#0e7490", "tag"],
  rente: ["Rente", "#15803d", "heart"],
  hinzu: ["Hinzuverdienst", "#4d7c0f", "case"],
  kk: ["Krankenkasse", "#0e7490", "health"],
  elend: ["Elterngeld", "#15803d", "cal"],
  kindergeld: ["Kindergeld", "#4d7c0f", "heart"],
  kind: ["Kinderkosten", "#0e7490", "gift"],
  kgverlauf: ["Krankengeld", "#15803d", "chart"],
  kgende: ["78 Wochen", "#4d7c0f", "cal"],
  zuzahl: ["Zuzahlungen", "#0e7490", "health"],
};
const aCard = (h, body, extra) =>
  `<div class="card flat">${h ? `<div class="card-head"><h2>${h}</h2>${extra || ""}</div>` : ""}${body}</div>`;
const aBar = (label, v, max, col, right) =>
  `<div class="abr"><span class="abl"><b>${label}</b><span>${right != null ? right : escHtml(fmtEur0(v))}</span></span><span class="bpbar"><i style="width:${max > 0 ? Math.min(100, Math.max(v > 0 ? 2 : 0, (v / max) * 100)) : 0}%;background:${col || "var(--accent)"}"></i></span></div>`;
const yIncByArt = (y, arts) =>
  store.tx.filter((t) => t.kind === "einnahme" && (t.date || "").startsWith(String(y)) && arts.includes(incArt(t.cat)));
const yIncByCat = (y, re) =>
  store.tx.filter(
    (t) => t.kind === "einnahme" && (t.date || "").startsWith(String(y)) && re.test(normText(t.cat || ""))
  );
const yExpByCat = (y, re) =>
  store.tx.filter(
    (t) =>
      (t.kind === "ausgabe" || t.kind === "betrieb") &&
      (t.date || "").startsWith(String(y)) &&
      re.test(normText((t.cat || "") + " " + (t.note || "")))
  );
function monthsRow(txs, y) {
  const m = Array(12).fill(0);
  for (const t of txs) {
    const i = Number((t.date || "").slice(5, 7)) - 1;
    if (i >= 0) m[i] += t.amount;
  }
  const mx = Math.max(1, ...m);
  return `<div class="amr">${m.map((v, i) => `<span title="${MONTHS[i]}: ${escHtml(fmtEur0(v))}"><i style="height:${Math.round((v / mx) * 100)}%"></i><small>${MSHORT[i].slice(0, 1)}</small></span>`).join("")}</div>`;
}
function dLeft(iso) {
  return iso ? Math.round((new Date(iso + "T12:00") - new Date(isoToday() + "T12:00")) / 864e5) : null;
}
function anaGroupTiles(y, ym, mc, tax, TS) {
  const st = store.settings,
    j = jlCfg(),
    out = [],
    L = lohnYear(y),
    mn = MONTHS[ymParts(ym)[1] - 1],
    yvv = yearLimits(y);
  const add = (k, sub, body, short) =>
    out.push({
      k,
      icon: ATL[k][2],
      title: ATL[k][0],
      sub,
      body,
      short,
    });
  {
    const goals = st.goals || [],
      pc = goals.length
        ? Math.round((sum(goals, (g) => Math.min(1, goalSaved(g).v / (Number(g.target) || 1))) / goals.length) * 100)
        : 0;
    add(
      "goal",
      goals.length
        ? `${goals.length} ${goals.length === 1 ? "Ziel" : "Ziele"} · im Schnitt ${pc} %`
        : "Noch kein Sparziel",
      aCard(
        "Sparziele",
        goals.length
          ? goals
              .map((g) => {
                const v = goalSaved(g).v,
                  t = Number(g.target) || 0;
                return aBar(
                  escHtml(g.name),
                  v,
                  t,
                  v >= t ? "var(--good)" : "var(--accent)",
                  `${escHtml(fmtEur0(v))} / ${escHtml(fmtEur0(t))}`
                );
              })
              .join("") +
              `<button class="link small" data-goalsopen="1" data-go="home" style="margin-top:10px">Auf der Startseite bearbeiten</button>`
          : `<p class="small muted" style="margin:0 0 10px">Spar auf etwas hin – Notgroschen, Urlaub, Führerschein – und sieh, wie viel du jeden Monat zurücklegen musst.</p><button class="btn primary" id="goalFirst" data-go="home">Sparziel anlegen</button>`
      ),
      goals.length ? `${pc} %` : "anlegen"
    );
  }
  {
    const fx = fixedForMonth(ym, true),
      tot = sum(fx, (f) => (f.id in (mc.paid || {}) ? Number(mc.paid[f.id]) || 0 : planAmt(f, ym))),
      pct = mc.income > 0 ? Math.round((tot / mc.income) * 100) : null;
    add(
      "fix",
      `${escHtml(fmtEur0(tot))} im ${escHtml(mn)}${pct != null ? ` · ${pct} % der Einnahmen` : ""}`,
      aCard(
        `Fixkosten ${escHtml(mn)}`,
        `<div class="abig"><b>${escHtml(fmtEur0(tot))}</b><span class="small muted">${pct != null ? `${pct} % von dem, was reinkam${pct > 60 ? " – das ist viel, schau nach Abos, die du kündigen kannst" : ""}` : "fest jeden Monat"}</span></div>` +
          fx
            .map((f) => ({
              f,
              v: f.id in (mc.paid || {}) ? Number(mc.paid[f.id]) || 0 : planAmt(f, ym),
            }))
            .sort((a, b) => b.v - a.v)
            .slice(0, 6)
            .map(({ f, v }) => aBar(escHtml(f.name), v, tot))
            .join("") +
          `<button class="link small" data-go="fix" style="margin-top:10px">Alle Fixkosten ${svgIcon("right", 14)}</button>`
      ),
      pct != null ? `${pct} %` : fmtEur0(tot)
    );
  }
  const [, keys] = anaGrp();
  const need = (k) => keys.includes(k) || (k === "ruecklage" && hasSelf() && hasJob());
  if (need("hourly")) {
    const h = Number(st.wochenstd) || Number((st.mindest || {}).h) || 0,
      mon = L.monat || mindestMonat(y) || 0,
      hr = h && mon ? mon / ((h * 13) / 3) : 0;
    add(
      "hourly",
      hr ? `${escHtml(fmtEur(hr))} brutto pro Stunde` : "Stunden eintragen",
      aCard(
        "Stundenlohn",
        `<div class="field" style="margin:0 0 10px"><label for="aStd">Stunden pro Woche</label><input class="in" id="aStd" inputmode="decimal" value="${h ? escHtml(numStr(h)) : ""}" placeholder="z. B. 40"></div>` +
          (hr
            ? `<div class="abig"><b>${escHtml(fmtEur(hr))}</b><span class="small muted">brutto pro Stunde · ${escHtml(fmtEur0(mon))} im Monat</span></div>${hr < yvv.ml - 0.005 ? `<div class="notice bad"><span>Das liegt <b>unter dem Mindestlohn</b> von ${fmt2(yvv.ml)} € (${y}). Sprich deinen Arbeitgeber an – das ist nicht erlaubt.</span></div>` : `<div class="notice ok"><span>${escHtml(fmtEur(hr - yvv.ml))} über dem Mindestlohn von ${fmt2(yvv.ml)} €.</span></div>`}`
            : `<p class="small muted" style="margin:0">${mon ? "Trag deine Wochenstunden ein." : "Trag zuerst dein Bruttogehalt ein (Gehalt-Kachel oder Steuer & Einkommen)."}</p>`)
      ),
      hr ? fmtEur(hr) : "Std. fehlen"
    );
  }
  if (need("beihilfe")) {
    const bh = j.beihilfe || [],
      open = bh.filter((x) => !x.done),
      so = sum(open, (x) => Number(x.amt) || 0);
    add(
      "beihilfe",
      open.length ? `${open.length} offen · ${escHtml(fmtEur0(so))}` : "nichts offen",
      aCard(
        "Beihilfe & PKV",
        (bh.length
          ? bh
              .slice()
              .sort((a, b) => a.done - b.done || (b.d || "").localeCompare(a.d || ""))
              .slice(0, 8)
              .map((x) =>
                aBar(
                  escHtml(x.n) + (x.done ? " ✓" : ""),
                  Number(x.amt) || 0,
                  Math.max(...bh.map((z) => Number(z.amt) || 0)),
                  x.done ? "var(--good)" : "var(--warn)",
                  `${escHtml(fmtEur(x.amt))}${x.done ? "" : " offen"}`
                )
              )
              .join("")
          : `<p class="small muted" style="margin:0">Noch keine Arztrechnung eingetragen.</p>`) +
          `<button class="link small" data-go="more" data-sp="amt" style="margin-top:10px">Rechnungen verwalten ${svgIcon("right", 14)}</button>`
      ),
      open.length ? `${open.length} offen` : "0 offen"
    );
  }
  if (need("bab"))
    add(
      "bab",
      "Berufsausbildungsbeihilfe prüfen",
      aCard(
        "Berufsausbildungsbeihilfe (BAB)",
        `<p class="small" style="margin:0 0 8px;line-height:1.55">BAB gibt es von der Agentur für Arbeit, wenn das Ausbildungsgehalt nicht reicht. Meist gilt:</p><ul class="lgl"><li>du wohnst <b>nicht</b> bei deinen Eltern, weil der Betrieb zu weit weg ist – oder du bist über 18, verheiratet oder hast ein Kind</li><li>es ist deine erste Berufsausbildung</li><li>Gehalt (und ggf. Einkommen der Eltern) liegt unter dem Bedarf</li></ul><p class="small muted" style="margin:0">Dein Ausbildungsgehalt: <b>${escHtml(fmtEur0(L.monat || j.amount || 0))}</b> im Monat. Den genauen Anspruch rechnet die Agentur aus – ein Antrag kostet nichts.</p>`
      ),
      "prüfen"
    );
  if (need("mjgrenze")) {
    const yr = sum(yIncByArt(y, ["lohn", "minijob"]), (t) => t.amount),
      lim = yvv.mj * 12,
      mon = new Date().getFullYear() === Number(y) ? new Date().getMonth() + 1 : 12;
    add(
      "mjgrenze",
      `${escHtml(fmtEur0(yr))} von ${escHtml(fmtEur0(lim))} im Jahr`,
      aCard(
        `Minijob-Grenze ${y}`,
        aBar(
          "Verdient",
          yr,
          lim,
          yr > lim ? "var(--bad)" : "var(--accent)",
          `${escHtml(fmtEur0(yr))} / ${escHtml(fmtEur0(lim))}`
        ) +
          `<p class="small muted" style="margin:10px 0 0">Grenze ${y}: <b>${yvv.mj} €</b> im Monat, im Jahr ${escHtml(fmtEur0(lim))}. Gelegentlich darfst du drüber (höchstens 2 Monate im Jahr). Im Schnitt bisher: <b>${escHtml(fmtEur0(yr / mon))}</b> pro Monat.</p>${yr / mon > yvv.mj ? `<div class="notice warn" style="margin-top:10px"><span>Du liegst im Schnitt über der Grenze – dann wird es ein Midijob mit Abzügen.</span></div>` : ""}`
      ),
      `${Math.round((yr / Math.max(1, lim)) * 100)} %`
    );
  }
  if (need("quellen")) {
    const inc = store.tx.filter((t) => t.kind === "einnahme" && (t.date || "").startsWith(String(y))),
      by = {};
    for (const t of inc) by[t.cat || "Sonstige"] = (by[t.cat || "Sonstige"] || 0) + t.amount;
    const arr = Object.entries(by).sort((a, b) => b[1] - a[1]),
      tot = sum(arr, (x) => x[1]);
    add(
      "quellen",
      `${arr.length} ${arr.length === 1 ? "Quelle" : "Quellen"} · ${escHtml(fmtEur0(tot))} in ${y}`,
      aCard(
        `Woher dein Geld ${y} kam`,
        arr.length
          ? arr
              .map(([k, v]) =>
                aBar(escHtml(k), v, arr[0][1], null, `${escHtml(fmtEur0(v))} · ${Math.round((v / tot) * 100)} %`)
              )
              .join("")
          : `<p class="small muted" style="margin:0">Noch keine Einnahmen in ${y}.</p>`
      ),
      `${arr.length} Arten`
    );
  }
  if (need("ruecklage")) {
    const need2 = Math.max(0, tax.due) + (tax.gewst || 0),
      cov = tax.resBal - need2;
    add(
      "ruecklage",
      `${escHtml(fmtEur0(tax.resBal))} zurückgelegt`,
      aCard(
        `Steuer-Rücklage ${y}`,
        aBar(
          "Rücklage",
          tax.resBal,
          Math.max(tax.resBal, need2),
          cov >= 0 ? "var(--good)" : "var(--warn)",
          escHtml(fmtEur0(tax.resBal))
        ) +
          aBar("Voraussichtlich fällig", need2, Math.max(tax.resBal, need2), "var(--c6)", escHtml(fmtEur0(need2))) +
          `<div class="notice ${cov >= 0 ? "ok" : "warn"}" style="margin-top:10px"><span>${cov >= 0 ? `Reicht – Puffer <b>${escHtml(fmtEur0(cov))}</b>.` : `Es fehlen noch <b>${escHtml(fmtEur0(-cov))}</b>. Erhöhe deine Rücklage-Quote (gerade ${escHtml(numStr(st.reserveRate || 0))} %).`}</span></div>`
      ),
      cov >= 0 ? "reicht" : `− ${fmtEur0(-cov)}`
    );
  }
  if (need("pots")) {
    const spent = {};
    for (const t of mc.tx)
      if (t.kind === "ausgabe") {
        const p = potOfCat(t.cat);
        spent[p] = (spent[p] || 0) + t.amount;
      }
    const pots = j.pots.filter((p) => p.v > 0),
      over = pots.filter((p) => (spent[p.n] || 0) > p.v).length;
    add(
      "pots",
      over ? `${over} ${over === 1 ? "Topf" : "Töpfe"} drüber im ${escHtml(mn)}` : `alle im Rahmen im ${escHtml(mn)}`,
      aCard(
        `Töpfe ${escHtml(mn)}`,
        pots
          .map((p) => {
            const s = spent[p.n] || 0;
            return aBar(
              escHtml(p.n),
              s,
              p.v,
              s > p.v ? "var(--bad)" : "var(--accent)",
              `${escHtml(fmtEur0(s))} / ${escHtml(fmtEur0(p.v))}`
            );
          })
          .join("") +
          `<button class="link small" data-go="more" data-sp="amt" style="margin-top:10px">Töpfe anpassen ${svgIcon("right", 14)}</button>`
      ),
      over ? `${over} drüber` : "im Rahmen"
    );
  }
  if (need("mini")) {
    const m = Number(j.mini) || 0,
      k = jlKeep(m);
    add(
      "mini",
      m ? `${escHtml(fmtEur0(k))} von ${escHtml(fmtEur0(m))} behältst du` : "Rechner",
      aCard(
        "Minijob-Rechner",
        m
          ? `<div class="abig"><b>${escHtml(fmtEur0(k))}</b><span class="small muted">von ${escHtml(fmtEur0(m))} Lohn behältst du zusätzlich</span></div>` +
              aBar("Abzug vom Amt", m - k, m, "var(--c6)")
          : `<p class="small muted" style="margin:0">Rechne aus, wie viel dir von einem Nebenjob bleibt.</p>`,
        `<button class="link" data-go="more" data-sp="amt">Ändern</button>`
      ),
      m ? `+ ${fmtEur0(k)}` : "rechnen"
    );
  }
  if (need("terms")) {
    const td = isoToday(),
      up = (j.terms || []).filter((t) => t.d >= td).sort((a, b) => a.d.localeCompare(b.d));
    add(
      "terms",
      up.length
        ? `${up.length} offen · nächster ${escHtml(new Date(up[0].d + "T12:00").toLocaleDateString("de-DE"))}`
        : "keine offen",
      aCard(
        "Termine & Fristen",
        (up.length
          ? up
              .slice(0, 6)
              .map(
                (t) =>
                  `<div class="jlt"><span class="jli">${svgIcon("cal", 16)}</span><span class="n"><b>${escHtml(t.n)}</b><small>${escHtml(
                    new Date(t.d + "T12:00").toLocaleDateString(localeTag(), {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                    })
                  )}${t.t ? ` · ${escHtml(t.t)} Uhr` : ""}</small></span></div>`
              )
              .join("")
          : `<p class="small muted" style="margin:0">Keine offenen Termine.</p>`) +
          `<button class="link small" data-go="more" data-sp="amt" style="margin-top:8px">+ Termin eintragen</button>`
      ),
      `${up.length} offen`
    );
  }
  if (need("nachweis"))
    add(
      "nachweis",
      "Monatsbericht und Kontoauszüge",
      aCard(
        "Nachweis fürs Amt",
        `<p class="small" style="margin:0 0 10px;line-height:1.55">Für Weiterbewilligung oder Nachfragen vom Amt: ein Monatsbericht mit allen Einnahmen und Ausgaben. Kontoauszüge kannst du unter Buchungen › Import fotografieren.</p><button class="btn primary" data-exp="report">Bericht ${escHtml(mn)} speichern</button>`
      ),
      "Bericht"
    );
  if (need("bafoeg")) {
    const tx = yIncByArt(y, ["bafoeg"]),
      tot = sum(tx, (t) => t.amount),
      end = st.work === "studium" ? profEnd() : null;
    add(
      "bafoeg",
      `${escHtml(fmtEur0(tot))} in ${y}`,
      aCard(
        `BAföG ${y}`,
        `<div class="abig"><b>${escHtml(fmtEur0(tot))}</b><span class="small muted">bisher in ${y}${j.amount ? ` · ${escHtml(fmtEur0(j.amount))} im Monat` : ""}</span></div>${monthsRow(tx, y)}${end ? `<p class="small muted" style="margin:10px 0 0">Förderung endet am <b>${escHtml(new Date(end + "T12:00").toLocaleDateString("de-DE"))}</b>. Folgeantrag spätestens 2 Monate vor Ende des Bewilligungszeitraums.</p>` : ""}`
      ),
      fmtEur0(j.amount || tot / 12) + "/M"
    );
  }
  if (need("nebenjob")) {
    const m = Number(j.mini) || 0;
    add(
      "nebenjob",
      m ? `${escHtml(fmtEur0(m))} von ${yvv.mj} €` : `bis ${yvv.mj} € ohne Abzug`,
      aCard(
        "Nebenjob & BAföG",
        aBar(
          "Verdienst im Monat",
          m,
          yvv.mj,
          m > yvv.mj ? "var(--bad)" : "var(--accent)",
          `${escHtml(fmtEur0(m))} / ${yvv.mj} €`
        ) +
          `<p class="small muted" style="margin:10px 0 0">Bis zur Minijob-Grenze (${y}: ${yvv.mj} €) wird BAföG in der Regel nicht gekürzt.</p>`,
        `<button class="link" data-go="more" data-sp="amt">Ändern</button>`
      ),
      m ? `noch ${fmtEur0(Math.max(0, yvv.mj - m))}` : "eintragen"
    );
  }
  if (need("rueck")) {
    const all = store.tx.filter((t) => t.kind === "einnahme" && incArt(t.cat) === "bafoeg"),
      tot = sum(all, (t) => t.amount),
      loan = Math.min(10010, tot / 2);
    add(
      "rueck",
      `ca. ${escHtml(fmtEur0(loan))} später zurückzahlen`,
      aCard(
        "BAföG-Rückzahlung",
        `<div class="abig"><b>${escHtml(fmtEur0(loan))}</b><span class="small muted">von ${escHtml(fmtEur0(tot))} BAföG bisher (in der App)</span></div>${aBar("Darlehen", loan, 10010, "var(--accent)", `${escHtml(fmtEur0(loan))} / 10.010 €`)}<p class="small muted" style="margin:10px 0 0">Beim Studierenden-BAföG ist die Hälfte ein zinsloses Darlehen, höchstens 10.010 €. Zurückgezahlt wird ab 5 Jahre nach Ende der Förderungshöchstdauer, in Raten ab 130 € im Monat. Wer früher alles auf einmal zahlt, bekommt einen Nachlass.</p>`
      ),
      fmtEur0(loan)
    );
  }
  if (need("taschen")) {
    const tx = yIncByCat(y, /taschen/),
      tot = sum(tx, (t) => t.amount);
    add(
      "taschen",
      `${escHtml(fmtEur0(tot))} in ${y}`,
      aCard(
        `Taschengeld ${y}`,
        `<div class="abig"><b>${escHtml(fmtEur0(tot))}</b><span class="small muted">bekommen in ${y}${j.amount ? ` · ${escHtml(fmtEur0(j.amount))} im Monat` : ""}</span></div>${monthsRow(tx, y)}`
      ),
      fmtEur0(tot)
    );
  }
  if (need("ferien")) {
    const tx = yIncByArt(y, ["lohn", "minijob"]),
      tot = sum(tx, (t) => t.amount) || Number(j.mini) || 0;
    add(
      "ferien",
      tot ? `${escHtml(fmtEur0(tot))} verdient` : "noch nichts",
      aCard(
        "Ferienjob",
        `<div class="abig"><b>${escHtml(fmtEur0(tot))}</b><span class="small muted">verdient in ${y}</span></div><p class="small muted" style="margin:0">Ab 15 darfst du in den Ferien bis zu 4 Wochen im Jahr arbeiten, höchstens 8 Stunden am Tag. Wurde Lohnsteuer abgezogen, bekommst du sie mit einer Steuererklärung meist komplett zurück – siehe Kachel „Steuer“.</p>`
      ),
      tot ? fmtEur0(tot) : "0 €"
    );
  }
  if (need("wofuer")) {
    const by = {};
    for (const t of store.tx)
      if (t.kind === "ausgabe" && (t.date || "").startsWith(String(y)))
        by[t.cat || "Sonstiges"] = (by[t.cat || "Sonstiges"] || 0) + t.amount;
    const arr = Object.entries(by)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6),
      tot = sum(Object.values(by), (v) => v);
    add(
      "wofuer",
      arr.length ? `am meisten: ${escHtml(arr[0][0])}` : "noch keine Ausgaben",
      aCard(
        `Wofür dein Geld ${y} draufging`,
        arr.length
          ? arr
              .map(([k, v]) =>
                aBar(escHtml(k), v, arr[0][1], null, `${escHtml(fmtEur0(v))} · ${Math.round((v / tot) * 100)} %`)
              )
              .join("")
          : `<p class="small muted" style="margin:0">Noch keine Ausgaben in ${y}.</p>`
      ),
      arr.length ? arr[0][0].split(" ")[0] : "–"
    );
  }
  if (need("rente")) {
    const tx = yIncByArt(y, ["rente"]),
      tot = sum(tx, (t) => t.amount);
    add(
      "rente",
      `${escHtml(fmtEur0(tot))} in ${y}`,
      aCard(
        `Rente ${y}`,
        `<div class="abig"><b>${escHtml(fmtEur0(tot))}</b><span class="small muted">bisher in ${y}${j.amount ? ` · ${escHtml(fmtEur0(j.amount))} im Monat` : ""}</span></div>${monthsRow(tx, y)}<p class="small muted" style="margin:10px 0 0">Die Renten werden jedes Jahr zum <b>1. Juli</b> angepasst. Prüf danach deinen Bescheid und trag den neuen Betrag ein.</p>`
      ),
      fmtEur0(j.amount || tot / 12) + "/M"
    );
  }
  if (need("hinzu")) {
    const tx = yIncByArt(y, ["lohn", "minijob", "selbst"]),
      tot = sum(tx, (t) => t.amount);
    add(
      "hinzu",
      tot ? `${escHtml(fmtEur0(tot))} dazuverdient` : "unbegrenzt erlaubt",
      aCard(
        "Hinzuverdienst",
        `<div class="abig"><b>${escHtml(fmtEur0(tot))}</b><span class="small muted">dazuverdient in ${y}</span></div><p class="small muted" style="margin:0">Neben einer <b>Altersrente</b> darfst du seit 2023 unbegrenzt dazuverdienen. Bei einer <b>Erwerbsminderungsrente</b> gelten Grenzen – frag vorher bei der Rentenversicherung nach. Der Verdienst kann die Steuer erhöhen.</p>`
      ),
      tot ? fmtEur0(tot) : "frei"
    );
  }
  if (need("kk")) {
    const r = Number(j.amount) || 0;
    add(
      "kk",
      "Kranken- und Pflegeversicherung",
      aCard(
        "Krankenkasse als Rentner",
        `<p class="small" style="margin:0 0 8px;line-height:1.55">Von der Bruttorente gehen etwa <b>11 bis 12 %</b> für Kranken- und Pflegeversicherung ab (Kinderlose etwas mehr). Die Rentenversicherung zahlt die andere Hälfte der Krankenversicherung.</p>${r ? `<p class="small muted" style="margin:0">Bei ${escHtml(fmtEur0(r))} wären das grob <b>${escHtml(fmtEur0(r * 0.11))} – ${escHtml(fmtEur0(r * 0.12))}</b> im Monat. Steht im Rentenbescheid genau.</p>` : ""}<p class="small muted" style="margin:8px 0 0">Kosten für Arzt, Zahnersatz und Medikamente: Zuzahlungen sammeln – über der Belastungsgrenze gibt es eine Befreiung.</p>`
      ),
      "ca. 11–12 %"
    );
  }
  if (need("elend")) {
    const end = st.work === "eltern" ? profEnd() : null,
      dl = dLeft(end),
      m = dl != null && dl > 0 ? Math.ceil(dl / 30.4) : 0,
      rest = m * (Number(j.amount) || 0);
    add(
      "elend",
      end ? (dl < 0 ? "beendet" : `noch ${m} ${m === 1 ? "Monat" : "Monate"}`) : "Ende eintragen",
      aCard(
        "Elterngeld",
        end
          ? `<div class="abig"><b>${dl < 0 ? "vorbei" : `${m} ${m === 1 ? "Monat" : "Monate"}`}</b><span class="small muted">bis ${escHtml(new Date(end + "T12:00").toLocaleDateString("de-DE"))}${rest ? ` · noch ca. ${escHtml(fmtEur0(rest))}` : ""}</span></div><p class="small muted" style="margin:0">Danach fällt das Elterngeld weg. Rechne früh durch, wovon ihr dann lebt – und leg, wenn es geht, etwas zur Seite.</p>`
          : `<p class="small muted" style="margin:0">Trag ein, bis wann du Elterngeld bekommst.</p>`,
        `<button class="link" data-go="more" data-sp="amt">Ändern</button>`
      ),
      end ? (dl < 0 ? "vorbei" : `${m} Mon.`) : "eintragen"
    );
  }
  if (need("kindergeld")) {
    const tx = yIncByArt(y, ["kindergeld"]),
      tot = sum(tx, (t) => t.amount),
      z = Number(st.kinder) || 0,
      per = TAX26.kindergeld / 12;
    add(
      "kindergeld",
      z ? `${z} × ${escHtml(fmtEur0(per))} im Monat` : `${escHtml(fmtEur0(tot))} in ${y}`,
      aCard(
        `Kindergeld ${y}`,
        `<div class="abig"><b>${escHtml(fmtEur0(tot))}</b><span class="small muted">bekommen in ${y}${z ? ` · erwartet ${escHtml(fmtEur0(z * per))} im Monat` : ""}</span></div>${monthsRow(tx, y)}${!z ? `<p class="small muted" style="margin:10px 0 0">Trag unter Steuer & Einkommen die Zahl deiner Kinder ein.</p>` : ""}`
      ),
      z ? fmtEur0(z * per) : fmtEur0(tot)
    );
  }
  if (need("kind")) {
    const tx = yExpByCat(y, /kind|baby|kita|windel|schule|spielzeug/),
      tot = sum(tx, (t) => t.amount),
      mtx = tx.filter((t) => t.date.startsWith(ym));
    add(
      "kind",
      `${escHtml(fmtEur0(sum(mtx, (t) => t.amount)))} im ${escHtml(mn)}`,
      aCard(
        `Kinderkosten ${y}`,
        `<div class="abig"><b>${escHtml(fmtEur0(tot))}</b><span class="small muted">in ${y} · im ${escHtml(mn)} ${escHtml(fmtEur0(sum(mtx, (t) => t.amount)))}</span></div>${monthsRow(tx, y)}<p class="small muted" style="margin:10px 0 0">Zählt alle Ausgaben in Kategorien wie „Kind & Baby“ oder „Kita“. Kita-Kosten kannst du in der Steuererklärung angeben.</p>`
      ),
      fmtEur0(tot)
    );
  }
  if (need("kgverlauf")) {
    const tx = yIncByArt(y, ["lohnersatz"]),
      tot = sum(tx, (t) => t.amount);
    add(
      "kgverlauf",
      `${escHtml(fmtEur0(tot))} in ${y}`,
      aCard(
        `Krankengeld ${y}`,
        `<div class="abig"><b>${escHtml(fmtEur0(tot))}</b><span class="small muted">bisher in ${y}${j.amount ? ` · ${escHtml(fmtEur0(j.amount))} im Monat` : ""}</span></div>${monthsRow(tx, y)}<p class="small muted" style="margin:10px 0 0">Krankengeld ist steuerfrei, erhöht aber den Steuersatz auf anderes Einkommen.</p>`
      ),
      fmtEur0(tot)
    );
  }
  if (need("kgende")) {
    const end = st.work === "krank" ? profEnd() : null,
      dl = dLeft(end),
      wk = dl != null ? Math.max(0, Math.ceil(dl / 7)) : null;
    add(
      "kgende",
      end ? (dl < 0 ? "Ende erreicht" : `noch ${plural(wk, "Woche", "Wochen")}`) : "Beginn eintragen",
      aCard(
        "78-Wochen-Grenze",
        end
          ? `${aBar("vergangen", 546 - Math.max(0, dl), 546, dl <= 60 ? "var(--bad)" : "var(--accent)", `${Math.round((546 - Math.max(0, dl)) / 7)} von 78 Wochen`)}<p class="small muted" style="margin:10px 0 0">Krankengeld endet spätestens am <b>${escHtml(new Date(end + "T12:00").toLocaleDateString("de-DE"))}</b>. Danach: Arbeitslosengeld (Nahtlosigkeit) oder Erwerbsminderungsrente – rechtzeitig bei Agentur für Arbeit und Rentenversicherung melden.</p>`
          : `<p class="small muted" style="margin:0">Trag ein, seit wann du krank bist.</p>`,
        `<button class="link" data-go="more" data-sp="amt">Ändern</button>`
      ),
      end ? (dl < 0 ? "vorbei" : `${wk} Wo.`) : "eintragen"
    );
  }
  if (need("zuzahl")) {
    const tx = yExpByCat(y, /zuzahl|apothek|medikament|arzt|gesund|physio|zahn/),
      tot = sum(tx, (t) => t.amount),
      incY = sum(
        store.tx.filter((t) => t.kind === "einnahme" && (t.date || "").startsWith(String(y))),
        (t) => t.amount
      ),
      lim = incY * 0.02;
    add(
      "zuzahl",
      `${escHtml(fmtEur0(tot))} von ca. ${escHtml(fmtEur0(lim))}`,
      aCard(
        `Zuzahlungen ${y}`,
        aBar(
          "Gesundheitskosten",
          tot,
          Math.max(lim, tot),
          tot >= lim && lim > 0 ? "var(--good)" : "var(--accent)",
          `${escHtml(fmtEur0(tot))} / ${escHtml(fmtEur0(lim))}`
        ) +
          `<p class="small muted" style="margin:10px 0 0">Belastungsgrenze: <b>2 %</b> deiner Bruttoeinnahmen im Jahr (bei chronischer Krankheit 1 %). Darüber kannst du dich bei der Krankenkasse von Zuzahlungen befreien lassen – Quittungen aufheben! Hier zählen Ausgaben in Kategorien wie Gesundheit, Apotheke, Zuzahlungen.</p>`
      ),
      lim > 0 ? `${Math.round((tot / lim) * 100)} %` : fmtEur0(tot)
    );
  }
  return out;
}
document.addEventListener("change", (e) => {
  if (e.target.id !== "aStd") return;
  const v = parseAmt(e.target.value);
  if (!isFinite(v)) return;
  store.settings.wochenstd = Math.min(80, Math.max(0, v));
  e.target.blur();
  saveSettings();
});
function renderYear() {
  const y = Number(ui.ym.slice(0, 4)),
    cur = ymOf(new Date());
  const rows = [];
  let maxV = 1;
  for (let i = 1; i <= 12; i++) {
    const ym = y + "-" + pad(i),
      c = monthCalc(ym);
    rows.push({
      i,
      ym,
      c,
    });
    maxV = Math.max(maxV, c.income, c.expenses);
  }
  const T = (k) => sum(rows, (r) => r.c[k]);
  const inc = T("income"),
    exp = T("expenses"),
    self = T("selfInc");
  const tax = taxCalc(y),
    st = store.settings,
    TS = taxStatus(y, tax);
  const endBal = yearCum(y + "-12").balance;
  const W = 680,
    H = 200,
    pl = 44,
    pb = 24,
    pt = 8,
    cw = (W - pl - 6) / 12,
    nice = niceMax(maxV),
    sy = (v) => pt + (H - pt - pb) * (1 - v / nice);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Einnahmen und Ausgaben pro Monat ${y}">`;
  for (let k = 0; k <= 4; k++) {
    const v = (nice * k) / 4,
      yy = sy(v);
    svg += `<line x1="${pl}" x2="${W - 6}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 8}" y="${yy + 4}" text-anchor="end" font-size="12.5" fill="var(--muted)" font-family="Inter, sans-serif">${escHtml(shortK(v))}</text>`;
  }
  rows.forEach((r, idx) => {
    const x = pl + idx * cw,
      bw = Math.min(13, (cw - 8) / 2),
      cx = x + cw / 2;
    if (r.ym === cur)
      svg += `<rect x="${x + 2}" y="${pt}" width="${cw - 4}" height="${H - pt - pb}" fill="var(--accent-soft)" rx="8"/>`;
    svg += `<rect x="${cx - bw - 1.5}" y="${sy(r.c.income)}" width="${bw}" height="${Math.max(0, H - pb - sy(r.c.income))}" fill="var(--good)" rx="3"/>`;
    svg += `<rect x="${cx + 1.5}" y="${sy(r.c.expenses)}" width="${bw}" height="${Math.max(0, H - pb - sy(r.c.expenses))}" fill="var(--c6)" rx="3"/>`;
    svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--muted)" font-family="Inter, sans-serif">${MSHORT[idx]}</text>`;
  });
  svg += `</svg>`;
  const kuOver = self > (Number(st.kuLimit) || 0),
    resCover = tax.resBal - Math.max(0, tax.due) - tax.gewst;
  const incSum = (name) =>
    sum(
      store.tx.filter((t) => t.kind === "einnahme" && t.cat === name && (t.date || "").startsWith(String(y))),
      (t) => t.amount
    );
  const ym = ui.ym,
    mc = monthCalc(ym),
    prevYm = shiftYm(ym, -1),
    dayNow = new Date().getDate();
  const prevExp =
    sum(
      monthCalc(prevYm).tx.filter(
        (t) => (t.kind === "ausgabe" || t.kind === "betrieb") && (ym !== cur || Number(t.date.slice(8, 10)) <= dayNow)
      ),
      (t) => t.amount
    ) + (ym !== cur ? monthCalc(prevYm).fixPaid : 0);
  const curExp =
    ym === cur
      ? sum(
          mc.tx.filter((t) => t.kind === "ausgabe" || t.kind === "betrieb"),
          (t) => t.amount
        )
      : mc.expenses;
  const delta = prevExp > 0 ? (curExp / prevExp - 1) * 100 : null,
    shopM = shopSum(ym + "-01", ym === cur ? isoToday() : lastDayOf(ym)).v,
    perDay = dayAvg(ym + "-01", ym === cur ? isoToday() : lastDayOf(ym), ym === cur ? dayNow : daysIn(ym)),
    shopDay = shopM / Math.max(1, ym === cur ? dayNow : daysIn(ym));
  const mode = ui.anaChart || "cat",
    tiles = [];
  const nice2 = niceMax(Math.max(1, ...rows.map((r) => r.c.expenses))),
    sy2 = (v) => pt + (H - pt - pb) * (1 - v / nice2),
    avgExp = exp / Math.max(1, rows.filter((r) => r.c.expenses > 0).length);
  let svg2 = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ausgaben pro Monat ${y}">`;
  for (let g = 0; g <= 4; g++) {
    const v = (nice2 * g) / 4,
      yy = sy2(v);
    svg2 += `<line x1="${pl}" x2="${W - 4}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${pl - 8}" y="${yy + 4}" text-anchor="end" font-size="12.5" fill="var(--faint)">${
      v >= 1000
        ? (v / 1000).toLocaleString("de-DE", {
            maximumFractionDigits: 1,
          }) + "k"
        : Math.round(v)
    }</text>`;
  }
  rows.forEach((r) => {
    const x = pl + (r.i - 1) * cw,
      bw = Math.min(28, cw * 0.6),
      on = r.ym === ym;
    svg2 += `<rect x="${x + (cw - bw) / 2}" y="${sy2(r.c.expenses)}" width="${bw}" height="${Math.max(0, H - pb - sy2(r.c.expenses))}" rx="5" fill="${on ? "var(--accent)" : "var(--c5)"}" data-open="${r.ym}" style="cursor:pointer"/><text x="${x + cw / 2}" y="${H - 6}" text-anchor="middle" font-size="12.5" font-weight="${on ? 800 : 500}" fill="${on ? "var(--fg)" : "var(--faint)"}">${MSHORT[r.i - 1].slice(0, 1)}</text>`;
  });
  svg2 += `</svg>`;
  const ins = insightLine(ym);
  const chartFor = (k) =>
    k === "cat"
      ? `${ins ? `<div class="small" style="margin:-2px 0 12px;line-height:1.45">${ins}</div>` : ""}${moneyFlowCard(ym).replace('<div class="card">', '<div class="card flat">')}`
      : k === "trend"
        ? `<div class="card-head" style="margin-bottom:6px"><h2>Ausgaben ${y}</h2><span class="small muted">Ø ${escHtml(fmtEur0(avgExp))} / Monat</span></div>${svg2}`
        : `<div class="card-head" style="margin-bottom:6px"><h2>Ein &amp; Aus ${y}</h2><div class="legend"><span><i style="background:var(--good)"></i>Ein</span><span><i style="background:var(--c6)"></i>Aus</span></div></div>${svg}
       <div class="meta-row small" style="margin-top:8px"><span class="muted">Jahr: ein <b class="pos">${escHtml(fmtEur0(inc))}</b> · aus <b>${escHtml(fmtEur0(exp))}</b></span><span class="muted">31.12.: <b>${escHtml(fmtEur0(endBal))}</b></span></div>`;
  const need = Math.max(0, tax.due) + (tax.gewst || 0);
  const TL = {
    kpi: ["Überblick", "#1a7a5c"],
    cat: ["Kategorien", "#d14d72"],
    trend: ["Verlauf", "#0e7490"],
    io: ["Ein / Aus", "#4d7c0f"],
    calc: ["Berechnung", "#2f6fd0"],
    plan: ["Jahresplan", "#c27c0e"],
    lohn: ["Gehalt", "#0f8a8a"],
    wk: ["Arbeitskosten", "#7a5bc2"],
    tax: ["Steuer", "#c2410c"],
    euer: ["EÜR", "#4b5563"],
    kunden: ["Kunden", "#2f7fb8"],
  };
  const accRow = (k, icon, title, sub, body, short) => {
    tiles.push({
      k,
      icon,
      title,
      sub,
      body,
      short,
    });
    return "";
  };
  const kpisHtml = `    <div class="kpis">
      <div class="kpi"><small>${mc.net >= 0 ? "Übrig" : "Mehr ausgegeben"}</small><b class="${mc.net < 0 ? "neg" : "pos"}">${mc.net >= 0 ? "+" : "−"} ${escHtml(fmtEur0(Math.abs(mc.net)))}</b><span>${mc.income ? `${Math.round((Math.max(0, mc.net) / mc.income) * 100)} % gespart` : escHtml(MONTHS[ymParts(ym)[1] - 1])}</span></div>
      <div class="kpi"><small>Ø pro Tag</small><b>${escHtml(fmtEur0(perDay))}</b><span>im Alltag${shopM > 0 ? ` · Einkauf Ø ${escHtml(fmtEur0(shopDay))}` : ""}</span></div>
      <div class="kpi"><small>vs. ${escHtml(MONTHS[ymParts(prevYm)[1] - 1])}</small>${delta === null ? `<b>–</b><span>keine Daten</span>` : `<b class="${delta > 0 ? "neg" : "pos"}">${delta > 0 ? "+" : "−"} ${Math.abs(Math.round(delta))} %</b><span>${ym === cur ? "bis heute " : ""}${delta > 0 ? "mehr" : "weniger"} ausgegeben</span>`}</div>
      ${!hasSelf() && !TS.show ? `<div class="kpi"><small>Einnahmen</small><b class="pos">+ ${escHtml(fmtEur0(mc.income))}</b><span>im ${escHtml(MONTHS[ymParts(ym)[1] - 1])}</span></div>` : `<div class="kpi"><small>Steuer ${y}</small>${!hasSelf() ? (Math.abs(tax.due) < 1 ? `<b>–</b><span>ausgeglichen</span>` : tax.due < 0 ? `<b class="pos">+ ${escHtml(fmtEur0(-tax.due))}</b><span>Erstattung (Schätzung)</span>` : `<b class="neg">− ${escHtml(fmtEur0(tax.due))}</b><span>Nachzahlung (Schätzung)</span>`) : need <= 0 && !tax.resBal ? `<b>–</b><span>keine Nachzahlung</span>` : resCover >= 0 ? `<b class="pos">✓ reicht</b><span>Rücklage ${escHtml(fmtEur0(tax.resBal))}</span>` : `<b class="neg">− ${escHtml(fmtEur0(-resCover))}</b><span>fehlen noch</span>`}</div>`}
    </div>`;
  const ycum = yearCum(ym),
    yknown = new Set(accountNames());
  const ymain =
    ym <= cur &&
    Object.keys(store.settings.accountAnchors || {}).some((n) => n === "Hauptkonto" && (yknown.has(n) || ym === cur))
      ? "Hauptkonto"
      : "";
  $("v-year").innerHTML = `
    ${accRow("kpi", "insight", "Auf einen Blick", `${mc.net >= 0 ? "Übrig" : "Mehr ausgegeben"} ${mc.net >= 0 ? "+" : "−"} ${escHtml(fmtEur0(Math.abs(mc.net)))} · Ø ${escHtml(fmtEur0(perDay))} pro Tag`, kpisHtml, `${mc.net >= 0 ? "+" : "−"} ${fmtEur0(Math.abs(mc.net))}`)}
    ${accRow("calc", "cash", "So berechnet", `Stand heute ${escHtml(fmtEur0(ycum.balance))} · frei ${escHtml(fmtEur0(ycum.balance - ycum.reserveAcc - (ym >= ymOf(new Date()) ? mc.fixOpen || 0 : 0)))}`, waterfall(ym, ycum, mc, ymain), `frei ${fmtEur0(ycum.balance - ycum.reserveAcc - (ym >= ymOf(new Date()) ? mc.fixOpen || 0 : 0))}`)}
    ${accRow("plan", "cal", "Jahresplan", `${escHtml(fmtEur0(inc))} rein · ${escHtml(fmtEur0(exp))} raus`, planQuarters(rows, cur), `${inc - exp >= 0 ? "+" : "−"} ${fmtEur0(Math.abs(inc - exp))}`)}
    ${
      true
        ? accRow(
            "lohn",
            "wallet",
            "Gehalt &amp; Abrechnungen",
            (() => {
              const sl = slipsOf(y),
                lm = lohnMonths(y),
                L = lohnYear(y);
              return lm.size
                ? `${sl.length ? `${sl.length} ${sl.length === 1 ? "Abrechnung" : "Abrechnungen"} · ` : ""}≈ ${escHtml(fmtEur0(lm.brutto))} brutto bisher`
                : "Lohnabrechnungen hochladen";
            })(),
            lohnSection(y),
            (() => {
              const n = lohnMonths(y).size;
              return n ? `${n} ${n === 1 ? "Monat" : "Monate"}` : "0 von 12";
            })()
          )
        : ""
    }
    ${
      hasJob() || TS.sal || !hasSelf()
        ? accRow(
            "wk",
            "doc",
            "Werbungskosten &amp; Steuererklärung",
            (() => {
              const w = wkCalc(y);
              return w.total
                ? `${escHtml(fmtEur0(w.total))} gesammelt${w.total > TAX26.anPausch ? " · über der Pauschale" : ""}`
                : "Homeoffice, Fahrten, Arbeitsmittel";
            })(),
            wkSection(y),
            fmtEur0(wkCalc(y).total)
          )
        : !hasSelf()
          ? ""
          : accRow("wk", "doc", "Steuererklärung", "Was du angeben kannst", wkSection(y), "Angaben")
    }
    ${accRow("tax", "receipt", hasSelf() ? "Steuer &amp; Selbstständig" : "Steuer", `${hasSelf() ? `Gewinn ${escHtml(fmtEur0(tax.gewinn))} · ` : ""}${tax.due >= 0 ? `Nachzahlung ca. ${escHtml(fmtEur0(tax.due))}` : `Erstattung ca. ${escHtml(fmtEur0(-tax.due))}`}`, taxView(y, tax, st, self, kuOver, resCover), Math.abs(tax.due) < 1 ? "± 0 €" : tax.due < 0 ? `+ ${fmtEur0(-tax.due)}` : `− ${fmtEur0(tax.due)}`)}
    ${
      !hasSelf()
        ? ""
        : (() => {
            const K = kundenOf(y);
            return accRow(
              "kunden",
              "user",
              "Kunden",
              K.list.length
                ? `${K.list.length === 1 ? "1 Kunde" : `${K.list.length} Kunden`} · ${escHtml(fmtEur0(K.tot))}`
                : "Wer bringt wie viel",
              kundenView(y),
              K.list.length ? `${K.list.length}` : "–"
            );
          })()
    }
    ${
      !hasSelf()
        ? ""
        : accRow(
            "euer",
            "arrowDown",
            "EÜR exportieren",
            "Gewinn fürs Finanzamt (Anlage EÜR)",
            `<div class="card flat"><div class="card-head"><h2>Für die Steuer</h2></div>
      <p class="small muted" style="margin:-6px 0 12px">Alle Einnahmen und Ausgaben deiner Selbstständigkeit ${y} als Liste für Steuerbüro oder ELSTER (Anlage EÜR) – mit Brutto, Umsatzsteuer und Netto, betrieblichen Fixkosten und Summen. Öffnet sich in Excel.</p>
      <button class="btn primary" id="euerBtn" data-year="${y}">EÜR ${y} exportieren</button></div>`,
            "Gewinn fürs Finanzamt"
          )
    }`;
  for (const [k, [n, c]] of Object.entries(ATL)) TL[k] = [n, c];
  const GRP = [["Auswertung", ["kpi", "cat", "trend", "io"]], ["Planung", ["calc", "plan", "goal", "fix"]], anaGrp()];
  const ord = GRP.flatMap((g) => g[1]);
  tiles.push(
    {
      k: "cat",
      icon: "tag",
      title: "Kategorien",
      sub: `Wohin dein Geld im ${escHtml(MONTHS[ymParts(ym)[1] - 1])} fließt`,
      body: chartFor("cat"),
      short: fmtEur0(mc.expenses),
    },
    {
      k: "trend",
      icon: "chart",
      title: `Verlauf ${y}`,
      sub: `Ausgaben pro Monat · Ø ${escHtml(fmtEur0(avgExp))}`,
      body: chartFor("trend"),
      short: `Ø ${fmtEur0(avgExp)}`,
    },
    {
      k: "io",
      icon: "repeat",
      title: `Ein &amp; Aus ${y}`,
      sub: `${escHtml(fmtEur0(inc))} rein · ${escHtml(fmtEur0(exp))} raus`,
      body: chartFor("io"),
      short: `${inc - exp >= 0 ? "+" : "−"} ${fmtEur0(Math.abs(inc - exp))}`,
    }
  );
  tiles.push(...anaGroupTiles(y, ym, mc, tax, TS));
  if (!hasSelf()) {
    const i = tiles.findIndex((t) => t.k === "tax"),
      t = tiles[i];
    if (t) {
      const rIn =
        tax.rente > 0
          ? `<div class="field" style="margin:0 0 12px"><label>Rentenbeginn (Jahr) – bestimmt, wie viel der Rente steuerpflichtig ist</label><input class="in" type="number" inputmode="numeric" min="1960" max="2060" data-rentstart value="${escHtml(tax.rStart)}"></div>`
          : "";
      let n = "";
      if (TS.kind === "pflicht") {
        t.title = "Steuer";
        t.short = "Erklärung Pflicht";
        t.sub = tax.due >= 1 ? `ca. ${escHtml(fmtEur0(tax.due))} Nachzahlung möglich` : "Steuererklärung abgeben";
        n =
          TS.why === "rente"
            ? `<div class="notice warn" style="margin-bottom:12px"><span><b>Steuererklärung ist Pflicht.</b> Deine Rente ist zu ${String(tax.rAnteil).replace(".", ",")} % steuerpflichtig (Rentenbeginn ${escHtml(tax.rStart)}). Damit liegst du über dem Grundfreibetrag – ca. <b>${escHtml(fmtEur0(tax.due))}</b> Steuer für ${y}. Abgabe bis 31. Juli des Folgejahres.</span></div>`
            : `<div class="notice warn" style="margin-bottom:12px"><span><b>Steuererklärung ist Pflicht.</b> Du hattest ${y} Gehalt und ${escHtml(TS.why)} (über 410 €). Das ist zwar steuerfrei, erhöht aber den Steuersatz auf dein Gehalt (Progressionsvorbehalt) – ${tax.due >= 1 ? `es droht eine <b>Nachzahlung von ca. ${escHtml(fmtEur0(tax.due))}</b>. Leg dir das Geld am besten schon zurück.` : tax.due <= -1 ? `nach dieser Schätzung bekommst du sogar ca. <b>${escHtml(fmtEur0(-tax.due))}</b> zurück.` : "nach dieser Schätzung bleibt es ungefähr ausgeglichen."} Abgabe bis 31. Juli des Folgejahres.</span></div>`;
      } else if (TS.kind === "erstattung") {
        t.short = `+ ${fmtEur0(-tax.due)}`;
        t.sub = `Erstattung möglich ca. ${escHtml(fmtEur0(-tax.due))}`;
        n = `<div class="notice ok" style="margin-bottom:12px"><span><b>Eine Steuererklärung lohnt sich.</b> Du bekommst voraussichtlich ca. <b>${escHtml(fmtEur0(-tax.due))}</b> Lohnsteuer zurück. Sie ist freiwillig und geht bis zu 4 Jahre rückwirkend.</span></div>`;
      } else if (TS.kind === "none" && (!TS.jobMain || !TS.show)) {
        t.short = "Nicht nötig";
        t.sub = "Keine Steuererklärung nötig";
        n = `<div class="notice info" style="margin-bottom:12px"><span>Nach dieser Schätzung musst du für ${y} keine Steuererklärung abgeben und bekommst auch nichts zurück.</span></div>`;
      }
      t.body = n + rIn + t.body;
    }
  }
  if ((ui.anaMode || "m") === "y") {
    const yNet = inc - exp,
      sg = (v) => (v >= 0 ? "+ " : "− ") + fmtEur0(Math.abs(v));
    for (const t of tiles) {
      if (t.k === "kpi" || t.k === "io") t.short = sg(yNet);
      else if (t.k === "cat") t.short = fmtEur0(exp);
      else if (t.k === "trend") t.short = "Ø " + fmtEur0(avgExp);
      else if (t.k === "fix") t.short = fmtEur0(sum(rows, (r) => r.c.fixPaid));
    }
  }
  tiles.sort((a, b) => ord.indexOf(a.k) - ord.indexOf(b.k));
  const sel = tiles.find((t) => t.k === ui.anaSel);
  const tileBtn = (t) =>
    `<button data-anaopen="${t.k}" data-tk="${t.k}" aria-pressed="${t.k === ui.anaSel}" style="--tc:${userCol("ana", t.k) || themeCol(TL[t.k][1], ord.indexOf(t.k))}"><span>${svgIcon(t.icon, 20)}</span>${t.k === "wk" && !hasJob() ? "Steuererkl." : TL[t.k][0]}<small>${escHtml(t.short || "")}</small></button>`;
  TED.year = {};
  for (const t of tiles) TED.year[t.k] = [TL[t.k][0], themeCol(TL[t.k][1], ord.indexOf(t.k)), t.icon];
  $("v-year").innerHTML = anaTabsHtml({
    tiles,
    GRP,
    TL,
    ord,
    rows,
    ym,
    mc,
    y,
    inc,
    exp,
  });
  ui.anaTiles = tiles;
  TL_ = TL;
  if (!$("anaBg").hidden && sel) anaFill(sel, false);
  function PANEL_() {
    return sel
      ? `<div class="card anapanel" style="--tc:${TL[sel.k][1]}"><div class="aph"><span class="ic">${svgIcon(sel.icon, 18)}</span><span class="n"><b>${sel.title}</b><span class="small muted">${sel.sub}</span></span><button class="aphx" data-anaopen="${sel.k}" aria-label="Zuklappen">${svgIcon("up", 18)}</button></div><div class="anab">${sel.body}</div></div>`
      : "";
  }
}
/* Analyse */
function anaTabsHtml({ tiles, GRP, TL, ord, rows, ym, mc, y, inc, exp }) {
  if (ui.anaTab === "plan") ui.anaTab = "aus";
  const mode = ui.anaMode || "m",
    tab = ui.anaTab || "aus",
    mn = MONTHS[ymParts(ym)[1] - 1],
    cur = ymOf(new Date());
  const g3 = GRP[2] || ["Steuer", []],
    g3n = /steuer/i.test(g3[0]) ? "Steuer" : String(g3[0]).replace(/&amp;/g, "&").split(/[ &]/)[0];
  const row = (t) =>
    `<button class="arw" data-anaopen="${t.k}" style="--tc:${userCol("ana", t.k) || themeCol(TL[t.k][1], ord.indexOf(t.k))}"><span class="ai">${svgIcon(t.icon, 18)}</span><span class="an"><b>${t.k === "wk" && !hasJob() ? "Steuererklärung" : TL[t.k][0]}</b><small>${t.sub || ""}</small></span><span class="av">${escHtml(t.short || "")}<span class="ch">›</span></span></button>`;
  const rowsFor = (ks) => {
    const ts = tiles.filter((t) => ks.includes(t.k)).sort((a, b) => ks.indexOf(a.k) - ks.indexOf(b.k));
    return ts.length ? `<div class="arl">${ts.map(row).join("")}</div>` : "";
  };
  const sg = (v) => (v >= 0 ? "+ " : "− ") + fmtEur0(Math.abs(v));
  let body = "";
  if (tab === "aus") {
    const pts =
      mode === "m"
        ? Array.from(
            {
              length: 6,
            },
            (_, k) => {
              const m = shiftYm(ym, k - 5);
              return {
                l: MSHORT[ymParts(m)[1] - 1],
                v: monthCalc(m).net,
              };
            }
          )
        : rows.map((r) => ({
            l: MSHORT[r.i - 1].slice(0, 1),
            v: r.c.net,
            fut: r.ym > cur,
          }));
    const vals = pts.filter((p) => !p.fut).map((p) => p.v),
      mx = Math.max(1, ...vals.map(Math.abs)),
      W = 330,
      H = 90,
      n = pts.length;
    const X = (i) => (n > 1 ? (i * (W - 8)) / (n - 1) + 4 : W / 2),
      Y = (v) => H / 2 - (v / mx) * (H / 2 - 8);
    const shown = pts
        .map((p, i) => ({
          x: X(i),
          y: Y(p.v),
          fut: p.fut,
        }))
        .filter((p) => !p.fut),
      line = shown.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const net = mode === "m" ? mc.net : inc - exp;
    const chart = shown.length
      ? `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="var(--line)" stroke-dasharray="3 4"/>
      <polygon points="${shown[0].x.toFixed(1)},${H / 2} ${line} ${shown[shown.length - 1].x.toFixed(1)},${H / 2}" fill="var(--accent-soft)" opacity=".9"/>
      <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${shown[shown.length - 1].x.toFixed(1)}" cy="${shown[shown.length - 1].y.toFixed(1)}" r="5" fill="var(--accent)"/></svg>`
      : "";
    const txs = mode === "m" ? mc.tx : rows.flatMap((r) => r.c.tx),
      fixP = mode === "m" ? mc.fixPaid : sum(rows, (r) => r.c.fixPaid);
    const ct = catTotals(txs, fixP),
      tot = sum(ct, (x) => x[1]);
    const zins = mode === "m" && ym === cur ? sum(store.debts, (d) => debtState(d).zinsNow || 0) : 0;
    body = `<div class="card anet" data-anaopen="io"><small>${net >= 0 ? "Übrig" : "Mehr ausgegeben"} ${mode === "m" ? "im " + escHtml(mn) : escHtml(String(y))}</small><div class="big ${net >= 0 ? "pos" : "neg"}">${escHtml(sg(net))}</div>${chart}<div class="ml">${pts.map((p) => `<span>${escHtml(p.l)}</span>`).join("")}</div></div>
      <div class="akg"><div><small>Einnahmen</small><b class="pos">${escHtml(fmtEur0(mode === "m" ? mc.income : inc))}</b></div><div><small>Ausgaben</small><b>${escHtml(fmtEur0(mode === "m" ? mc.expenses : exp))}</b></div>
        <div><small>Fixkosten</small><b>${escHtml(fmtEur0(fixP))}</b></div>${zins > 0 ? `<div><small>Zinsen</small><b class="neg">${escHtml(fmtEur0(zins))}</b></div>` : `<div><small>Ø pro Tag <span class="muted">im Alltag</span></small><b>${escHtml(fmtEur0(mode === "m" ? dayAvg(ym + "-01", ym === cur ? isoToday() : lastDayOf(ym), ym === cur ? new Date().getDate() : daysIn(ym)) : dayAvg(ymParts(ym)[0] + "-01-01", ymParts(ym)[0] + "-12-31", 365)))}</b></div>`}</div>
      ${
        ct.length
          ? `<div class="sgl">Top-Kategorien</div><div class="arl">${ct
              .slice(0, 5)
              .map(
                ([c, v]) =>
                  `<button class="arw" data-anaopen="cat" style="--tc:${catColor("ausgabe", c)}"><span class="ai">${escHtml(String(c).trim().slice(0, 1).toUpperCase())}</span><span class="an"><b>${escHtml(c)}</b><small>${tot > 0 ? Math.round((v / tot) * 100) : 0} %</small></span><span class="av">${escHtml(fmtEur0(v))}</span></button>`
              )
              .join(
                ""
              )}<button class="arw" data-anaopen="cat"><span class="an"><b style="color:var(--accent);font-size:14px">Alle Kategorien</b></span><span class="av"><span class="ch">›</span></span></button></div>`
          : ""
      }
      <div class="sgl">Mehr</div>${rowsFor(["kpi", "trend", "io", "calc", "plan"])}`;
  } else if (tab === "plan") body = rowsFor(GRP[1][1]);
  else {
    const tx = tiles.find((t) => t.k === "tax");
    body =
      (tx
        ? `<div class="card anet" data-anaopen="tax"><small>Steuer ${escHtml(String(y))}</small><div class="big">${escHtml(tx.short || "")}</div><div class="small muted">${tx.sub || ""}</div></div>`
        : "") + rowsFor(g3[1]);
  }
  return `<div class="atabs" role="tablist" aria-label="Bereich">${[
    ["aus", "Auswertung"],
    ["st", g3n],
  ]
    .map(
      ([k, l]) =>
        `<button role="tab" data-anatab="${k}" class="${tab === k ? "on" : ""}" aria-selected="${tab === k}">${escHtml(l)}</button>`
    )
    .join("")}</div>
    ${tab === "st" ? "" : `<div class="anahead2"><div class="anaseg" role="group" aria-label="Zeitraum"><button data-anamode="m" class="${mode === "m" ? "on" : ""}">Monat</button><button data-anamode="y" class="${mode === "y" ? "on" : ""}">Jahr</button></div></div>`}
    ${body}`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-anatab]");
  if (!b) return;
  ui.anaTab = b.dataset.anatab;
  renderYear();
  window.scrollTo({
    top: 0,
  });
});
/* Analyse */
const ASTORY = {
  i: 0,
  key: "",
  t: null,
};
function catTotals(txs, fixPaid) {
  const o = {};
  for (const t of txs) {
    if (t.kind !== "ausgabe" && t.kind !== "betrieb") continue;
    const k = t.cat || "Sonstiges";
    o[k] = (o[k] || 0) + t.amount;
  }
  if (fixPaid > 0) o["Fixkosten"] = (o["Fixkosten"] || 0) + fixPaid;
  return Object.entries(o).sort((a, b) => b[1] - a[1]);
}
const scmp = (a, av, b, bv) =>
  `<div class="scmp"><div><small>${escHtml(a)}</small><b>${escHtml(av)}</b></div><div><small>${escHtml(b)}</small><b>${escHtml(bv)}</b></div></div>`;
function sring(p) {
  return `<svg class="sring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,.25)"/><circle class="fg" cx="60" cy="60" r="50" stroke="#fff" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="${314 * (1 - p)}" transform="rotate(-90 60 60)"/></svg>`;
}
function anaStoryRun() {
  clearTimeout(ASTORY.t);
  const el = $("aStory");
  if (!el) return;
  const ss = [...el.querySelectorAll(".sto")],
    bs = [...el.querySelectorAll(".sbars b")];
  if (!ss.length) return;
  ss.forEach((s, k) => s.classList.toggle("on", k === ASTORY.i));
  bs.forEach((b, k) => {
    b.style.transition = "none";
    b.style.width = k < ASTORY.i ? "100%" : "0";
  });
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const b = bs[ASTORY.i];
      if (b) {
        b.style.transition = "width 5s linear";
        b.style.width = "100%";
      }
    })
  );
  ASTORY.t = setTimeout(() => {
    if (ui.view !== "year" || !$("aStory")) return;
    ASTORY.i = (ASTORY.i + 1) % ss.length;
    anaStoryRun();
  }, 5000);
}
document.addEventListener("click", (e) => {
  const md = e.target.closest("[data-anamode]");
  if (md) {
    ui.anaMode = md.dataset.anamode;
    ASTORY.key = "";
    renderYear();
    return;
  }
  const tp = e.target.closest("[data-stap]");
  if (tp) {
    const n = document.querySelectorAll("#aStory .sto").length;
    if (!n) return;
    ASTORY.i = (ASTORY.i + +tp.dataset.stap + n) % n;
    anaStoryRun();
  }
});
function niceMax(v) {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v))),
    n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
function shortK(v) {
  return v >= 1000 ? (Math.round(v / 100) / 10).toString().replace(".", ",") + "k" : String(Math.round(v));
}
const DEBT_ART = [
  ["kredit", "Kredit", "🏦", "bank"],
  ["ratenkauf", "Ratenkauf", "🛍️", "basket"],
  ["dispo", "Dispo", "💳", "card"],
  ["privat", "Privat geliehen", "🤝", "user"],
  ["bafoeg", "BAföG / Studium", "🎓", "book"],
  ["sonst", "Sonstige", "📄", "doc"],
];
const debtArt = (d) =>
  (DEBT_ART.find((x) => x[0] === d.art) || [])[0] ||
  (/dispo|überzieh/i.test(d.name || "")
    ? "dispo"
    : /bafög|bafoeg|studienkredit|bildungskredit/i.test(d.name || "")
      ? "bafoeg"
      : /kredit|darlehen|finanzierung|bank/i.test(d.name || "")
        ? "kredit"
        : "sonst");
const debtArtName = (d) => (DEBT_ART.find((x) => x[0] === debtArt(d)) || DEBT_ART.find((x) => x[0] === "sonst"))[1];
const debtArtIcon = (d) => (DEBT_ART.find((x) => x[0] === debtArt(d)) || DEBT_ART.find((x) => x[0] === "sonst"))[2];

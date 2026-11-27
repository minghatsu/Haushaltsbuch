/* ===== Arbeitsvertrag hochladen: Mami liest die PDF auf dem Gerät und schlägt vor, was sie einträgt =====
   Nichts verlässt das Gerät. Gespeichert werden nur die Angaben (nicht die PDF):
   store.settings.vt = { file, at, f: { firma, beginn, ende, probe, kfrist, soll, url, brutto, lohn, ort, ex:[…] } } */

const VT_MON = { jan: 1, feb: 2, mär: 3, mar: 3, apr: 4, mai: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dez: 12 };
const VT_EX = [
  ["vl", /verm[öo]genswirksam/i],
  ["jt", /job-?ticket|deutschland-?ticket|fahrkarte|[öo]pnv-?zuschuss/i],
  ["sb", /sachbezug|gutscheinkarte|tankgutschein|tankkarte/i],
  ["bav", /betriebliche[n]? altersversorgung|betriebsrente|direktversicherung|pensionskasse/i],
  ["rad", /dienst-?rad|job-?rad|fahrrad-?leasing|bike-?leasing/i],
  ["ess", /essenszuschuss|essensmarke|kantine|verpflegungszuschuss/i],
  ["tel", /diensthandy|dienst-?telefon|mobiltelefon zur.{0,20}nutzung/i],
];
/* „01.03.2026“, „1.3.26“ oder „1. März 2026“ → JJJJ-MM-TT */
function vtDate(s) {
  let m = /(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    if (+m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return y + "-" + pad(+m[2]) + "-" + pad(+m[1]);
  }
  m = /(\d{1,2})\.?\s+(jan|feb|m[äa]r|apr|mai|jun|jul|aug|sep|okt|nov|dez)[a-zä]*\.?\s+(\d{4})/i.exec(s);
  if (m) return m[3] + "-" + pad(VT_MON[m[2].toLowerCase()]) + "-" + pad(+m[1]);
  return "";
}
const VT_DATE = "(\\d{1,2}\\.\\s?\\d{1,2}\\.\\s?\\d{2,4}|\\d{1,2}\\.?\\s+[A-Za-zäÄ]{3,9}\\.?\\s+\\d{4})";
const vtNum = (s) => Number(String(s).replace(/\./g, "").replace(",", "."));
/* Den Vertragstext auswerten. Gibt nur zurück, was sicher genug gefunden wurde. */
function vtParse(lines) {
  const L = lines.map((l) => (typeof l === "string" ? l : l.text || "")).filter(Boolean),
    T = L.join("\n"),
    F = T.replace(/\s+/g, " "),
    f = {};
  let m;
  /* Wochenstunden: „30 Stunden pro Woche“, „wöchentliche Arbeitszeit beträgt 30 Std.“ */
  m =
    /(?:w[öo]chentliche|regelm[äa][ßs]ige)[^.]{0,60}?arbeitszeit[^.\d]{0,50}?(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:std|stunden|h\b)/i.exec(F) ||
    /(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:std\.?|stunden|h)\s*(?:pro|je|in der|\/)\s*(?:kalender)?woche/i.exec(F) ||
    /(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:wochenstunden|std\.?\/woche)/i.exec(F);
  if (m) {
    const v = vtNum(m[1]);
    if (v >= 1 && v <= 60) f.soll = v;
  }
  /* Urlaub: „Urlaubsanspruch beträgt 28 Arbeitstage“, „28 Tage Erholungsurlaub“ */
  m =
    /urlaub(?:sanspruch)?[^.\d]{0,70}?(\d{1,2})\s*(?:arbeits|werk)?tage/i.exec(F) ||
    /(\d{1,2})\s*(?:arbeits|werk)?tage[n]?\s*(?:bezahlten\s*)?(?:erholungs)?urlaub/i.exec(F);
  if (m) {
    const v = Number(m[1]);
    if (v >= 1 && v <= 50) f.url = v;
  }
  /* Gehalt: Monatsbrutto oder Stundenlohn */
  const AMT = "(\\d{1,3}(?:\\.\\d{3})*(?:,\\d{1,2})?|\\d+(?:,\\d{1,2})?)\\s*(?:€|eur(?:o)?\\b)";
  m = new RegExp("(?:stundenlohn|je (?:arbeits)?stunde|pro (?:arbeits)?stunde|stündlich)[^.€]{0,50}?" + AMT, "i").exec(F) || new RegExp(AMT + "[^.]{0,25}?(?:brutto\\s*)?(?:pro|je) (?:arbeits)?stunde", "i").exec(F);
  if (m) {
    const v = vtNum(m[1]);
    if (v >= 5 && v <= 150) f.lohn = v;
  }
  m =
    new RegExp("(?:monatlich|monats|brutto|gehalt|vergütung|entgelt)[^.€]{0,70}?" + AMT, "i").exec(F) ||
    /(?:monatlich|monats|brutto|gehalt|vergütung|entgelt)[^.€]{0,70}?(?:€|eur(?:o)?)\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/i.exec(F);
  if (m) {
    const v = vtNum(m[1]);
    if (v >= 300 && v <= 30000) f.brutto = v;
  }
  if (!f.brutto && f.lohn && f.soll) f.brutto = round2(f.lohn * f.soll * 4.33);
  /* Beginn und Befristung */
  m = new RegExp("(?:beginnt|beginn|mit wirkung (?:vom|zum)|eingestellt (?:ab|zum)|ab dem)[^.\\d]{0,40}?" + VT_DATE, "i").exec(F);
  if (m && vtDate(m[1])) f.beginn = vtDate(m[1]);
  if (!/unbefristet|auf unbestimmte zeit/i.test(F)) {
    m = new RegExp("befristet[^.]{0,80}?(?:bis (?:zum|einschließlich)?|endet (?:am|mit ablauf des)|zum)\\s*" + VT_DATE, "i").exec(F) || new RegExp("endet[^.]{0,40}?(?:am|mit ablauf des)\\s*" + VT_DATE, "i").exec(F);
    if (m) f.ende = vtDate(m[1]);
  }
  /* Probezeit und Kündigungsfrist als kurze Angabe („6 Monate“, „4 Wochen“) */
  m = /(\d{1,2})\s*(monat|woche)[a-z]*[^.]{0,40}?probezeit/i.exec(F) || /probezeit[^.\d]{0,40}?(\d{1,2})\s*(monat|woche)/i.exec(F);
  if (m && !/k[üu]ndigung/i.test(m[0])) f.probe = { n: Number(m[1]), u: /monat/i.test(m[2]) ? "m" : "w" };
  m = /k[üu]ndigungsfrist[^.\d]{0,70}?(\d{1,2})\s*(monat|woche)/i.exec(F);
  if (m) f.kfrist = { n: Number(m[1]), u: /monat/i.test(m[2]) ? "m" : "w" };
  /* Arbeitgeber: erste Zeile mit Rechtsform */
  const fl = L.find((l) => /\b(GmbH|AG|KG|OHG|UG|GbR|e\.\s?K\.|e\.\s?V\.|mbH|SE)\b/.test(l) && l.length < 90);
  if (fl) {
    const c = fl.replace(/^(zwischen|der|die|firma|arbeitgeber(in)?)[:\s]+/i, "");
    const r = /^(.*?\b(?:GmbH(?:\s*&\s*Co\.?\s*KG)?|mbH|AG|KG|OHG|UG(?:\s*\(haftungsbeschränkt\))?|GbR|e\.\s?K\.|e\.\s?V\.|SE))/.exec(c);
    f.firma = (r ? r[1] : c).trim().slice(0, 60);
  }
  /* Arbeitsort – nur als Hinweis für den Arbeitsweg */
  m = /(?:arbeitsort|t[äa]tigkeitsort|einsatzort|dienstort)[ \t]*(?:ist|:)[ \t]*(?:in[ \t]+)?([^.\n]{3,60})/i.exec(T);
  if (m) f.ort = m[1].replace(/\s{2,}.*$/, "").trim();
  f.ex = VT_EX.filter(([, re]) => re.test(F)).map(([k]) => k);
  if (!f.ex.length) delete f.ex;
  return f;
}

/* ---------- Prüfliste ---------- */
const VT = { f: null, on: {}, file: "", none: false, view: false };
function vtFmtFr(x) {
  return x ? uiText(x.u === "m" ? "vt_mon" : "vt_wo", { n: String(x.n) }) : "";
}
/* Immer TT.MM.JJJJ – so kann man das Datum auch wieder eintippen (und im Arabischen dreht es sich nicht um) */
const vtDe = (iso) => (iso ? iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4) : "");
/* Welche Zeilen zeigt die Liste – mit Ziel-Schild und ob sie etwas einträgt */
function vtRows(f) {
  const R = [];
  if (f.soll) R.push({ k: "soll", ed: "num", v: numStr(f.soll), t: uiText("vt_r_soll"), s: uiText("vt_r_soll_s"), tag: uiText("ag_az") });
  if (f.url) R.push({ k: "url", ed: "int", v: String(f.url), t: uiText("vt_r_url"), s: uiText("vt_r_url_s"), tag: uiText("ag_az_u") });
  if (f.brutto) R.push({ k: "brutto", ed: "num", v: numStr(f.brutto), vd: fmtEur0(f.brutto), t: uiText("vt_r_brutto"), s: f.lohn ? uiText("vt_r_lohn", { a: fmtEur(f.lohn) }) : uiText("vt_r_brutto_s"), tag: uiText("ag_lohn_t") });
  if (f.ende) R.push({ k: "ende", ed: "date", v: vtDe(f.ende), t: uiText("vt_r_ende"), s: uiText("vt_r_ende_s"), tag: uiText("vt_tag_rem") });
  if (f.ex)
    R.push({
      k: "ex",
      t: f.ex.map((k) => uiText("ag_x_" + k)).join(", "),
      s: uiText("vt_r_ex_s"),
      tag: uiText("ag_ex"),
    });
  if (f.beginn) R.push({ k: "beginn", ed: "date", v: vtDe(f.beginn), t: uiText("vt_r_beginn"), s: f.probe ? uiText("vt_r_probe", { p: vtFmtFr(f.probe) }) : "", tag: uiText("vt_tag_info") });
  if (f.kfrist) R.push({ k: "kfrist", info: 1, t: uiText("vt_r_kfrist", { p: vtFmtFr(f.kfrist) }), s: "", tag: uiText("vt_tag_info") });
  if (f.ort) R.push({ k: "ort", info: 1, off: 1, t: f.ort, s: uiText("vt_r_ort_s"), tag: uiText("ag_aw") });
  return R;
}
function vtOpen(view) {
  const S = store.settings.vt;
  VT.view = !!view;
  if (view && S) {
    VT.f = S.f;
    VT.file = S.file;
    VT.none = false;
  }
  vtRender(true);
}
function vtRender(first) {
  const E = escHtml,
    b = hbSheet("agVtBg", uiText(VT.view ? "vt_h_view" : "vt_h"));
  if (VT.none) {
    b.innerHTML = `<div class="card agcard"><b class="agct">${E(uiText("vt_none_t"))}</b><p class="small muted" style="margin:0 0 12px">${E(uiText("vt_none_p"))}</p><button type="button" class="btn primary block agj" data-agaz>${E(uiText("vt_none_b"))}</button></div>`;
    return;
  }
  const f = VT.f || {},
    R = vtRows(f),
    act = R.filter((r) => !r.info);
  if (!VT.view) R.forEach((r) => VT.on[r.k] == null && (VT.on[r.k] = !r.info && !r.off));
  const head = `<div class="card agcard vthd"><span class="agci">${svgIcon("doc", 22)}</span><span class="grow"><b>${E(VT.file || uiText("ag_vt"))}</b><small class="vtok">${E(
    VT.view ? uiText("vt_saved", { d: vtDe(String((store.settings.vt || {}).at || "").slice(0, 10)) }) : uiText("vt_found", { n: String(R.length) })
  )} · ${E(uiText("vt_local"))}</small></span></div>`;
  const rows = R.map((r) => {
    const on = !!VT.on[r.k],
      chk = r.info
        ? `<span class="vtck info" aria-hidden="true">${svgIcon("insight", 14)}</span>`
        : VT.view
          ? `<span class="vtck on" aria-hidden="true">${svgIcon("tick", 15)}</span>`
          : `<button type="button" class="vtck ${on ? "on" : ""}" role="checkbox" aria-checked="${on}" aria-label="${E(r.t)}" data-vtk="${r.k}">${svgIcon("tick", 15)}</button>`,
      val = r.ed && !VT.view ? `<input class="vtin" dir="ltr" data-vtv="${r.k}" value="${E(r.v)}" inputmode="${r.ed === "date" ? "text" : r.ed === "int" ? "numeric" : "decimal"}" aria-label="${E(r.t)}">` : r.v ? `<b class="vtv" dir="ltr">${E(r.vd || r.v)}</b>` : "";
    return `<div class="vtrow ${on || r.info || VT.view ? "" : "off"}">${chk}<span class="grow"><b>${E(r.t)}</b>${r.s ? `<small>${E(r.s)}</small>` : ""}<span class="vttag">${E(r.tag)}</span></span>${val}</div>`;
  }).join("");
  const n = act.filter((r) => VT.on[r.k]).length;
  b.innerHTML = `${head}<div class="card agcard vtlist">${rows || `<p class="small muted" style="margin:0">${E(uiText("vt_empty"))}</p>`}</div>
    ${
      VT.view
        ? `<button type="button" class="btn block vtre" data-vtnew>${svgIcon("docin", 17)} ${E(uiText("vt_again"))}</button><button type="button" class="link agsetl" data-vtdel>${E(uiText("vt_del"))}</button>`
        : `<button type="button" class="btn primary block agj vtgo" data-vtgo ${n ? "" : "disabled"}>${E(n ? uiText("vt_go", { n: String(n) }) : uiText("vt_go0"))}</button><p class="small muted agnote">${E(uiText("vt_hint"))}</p>`
    }`;
  if (first && !reducedMotion())
    try {
      stbAnim(b, ".agcard,.vtrow");
    } catch (_) {}
}
async function vtFromPdf(file) {
  try {
    toast(uiText("vt_reading"));
    const lines = await pdfLines(await file.arrayBuffer());
    const txt = lines.map((l) => l.text || "").join(" ");
    VT.file = file.name;
    VT.on = {};
    VT.view = false;
    VT.none = txt.replace(/\s/g, "").length < 80;
    VT.f = VT.none ? null : vtParse(lines);
    if (VT.f && !vtRows(VT.f).length) VT.none = true;
    vtRender(true);
  } catch (e) {
    toast(uiText("vt_err"));
  }
}
/* Übernehmen: Arbeitszeit, Urlaub, Gehalt (nur als Angabe), Befristung (Erinnerung), Extras */
function vtApply() {
  const f = { ...(VT.f || {}) },
    q = (k) => document.querySelector(`#agVtBg [data-vtv="${k}"]`),
    A = agAz(),
    X = agExState().a,
    done = [],
    cnt = vtRows(f).filter((r) => !r.info && VT.on[r.k]).length;
  const num = (k) => {
    const i = q(k);
    return i ? parseAmt(i.value) : f[k];
  };
  const dt = (k) => {
    const i = q(k);
    return i ? vtDate(i.value) : f[k];
  };
  if (VT.on.soll) {
    const v = num("soll");
    if (v > 0 && v <= 80) {
      A.soll = round2(v);
      f.soll = A.soll;
      done.push("az");
    }
  }
  if (VT.on.url) {
    const v = Math.round(num("url"));
    if (v >= 0 && v <= 60) {
      A.url = v;
      f.url = v;
      done.push("az");
    }
  }
  if (VT.on.brutto) {
    const v = num("brutto");
    if (v > 0) {
      f.brutto = round2(v);
      done.push("lohn");
    }
  } else delete f.brutto;
  if (VT.on.ende) {
    const v = dt("ende");
    if (v) f.ende = v;
    else delete f.ende;
  } else delete f.ende;
  if (q("beginn")) f.beginn = dt("beginn") || f.beginn;
  if (VT.on.ex && f.ex) {
    f.ex.forEach((k) => {
      if (!X[k]) X[k] = "ja";
    });
    done.push("ex");
  }
  store.settings.vt = { file: VT.file, at: new Date().toISOString(), f };
  saveSettings();
  hbSheetClose("agVtBg");
  AGF.keys = new Set(done);
  toast(uiText("vt_done", { n: String(cnt) }));
  try {
    SND.play("done");
  } catch (_) {}
  agRefresh();
  clearTimeout(AGF.t);
  AGF.t = setTimeout(() => (AGF.keys = new Set()), 2600);
}
/* Kacheln, die gerade von Mami ausgefüllt wurden, leuchten kurz auf */
const AGF = { keys: new Set(), t: 0 };

/* ---------- Auf der Seite: Knopf und Erinnerung an die Befristung ---------- */
function vtBtn() {
  const S = store.settings.vt;
  return `<button type="button" class="agvt" data-vtopen="${S ? "view" : ""}">${svgIcon("doc", 18)}<span class="grow"><b>${escHtml(S ? uiText("ag_vt_have") : uiText("ag_vt"))}</b>${
    S && S.f && S.f.firma ? `<small>${escHtml(S.f.firma)}</small>` : `<small>${escHtml(uiText("ag_vt_s"))}</small>`
  }</span>${svgIcon(S ? "right" : "plus", 17)}</button>`;
}
function vtHint() {
  const S = store.settings.vt,
    f = S && S.f;
  if (!f) return "";
  const today = isoToday(),
    days = (iso) => Math.round((new Date(iso + "T12:00") - new Date(today + "T12:00")) / 864e5);
  if (f.ende) {
    const d = days(f.ende);
    if (d >= 0 && d <= 120) return `<button type="button" class="ahint agask vtend" data-vtopen="view">${svgIcon("clock", 16)} <span data-noi18n>${escHtml(uiText("vt_end_h", { n: String(d), d: vtDe(f.ende) }))}</span></button>`;
  }
  if (f.beginn && f.probe) {
    const e = new Date(f.beginn + "T12:00");
    /* 6 Monate ab 1. März enden am 31. August (letzter Tag der Probezeit) */
    if (f.probe.u === "m") {
      const d0 = e.getDate();
      e.setDate(1);
      e.setMonth(e.getMonth() + f.probe.n);
      e.setDate(Math.min(d0, new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate()));
    } else e.setDate(e.getDate() + f.probe.n * 7);
    e.setDate(e.getDate() - 1);
    const d = days(isoOf(e));
    if (d >= 0 && d <= 30) return `<button type="button" class="ahint agask" data-vtopen="view">${svgIcon("clock", 16)} <span data-noi18n>${escHtml(uiText("vt_probe_h", { n: String(d) }))}</span></button>`;
  }
  return "";
}
document.addEventListener("click", (e) => {
  if (e.target.closest && e.target.closest("#agVtBg [data-agaz]")) hbSheetClose("agVtBg");
  const t = e.target.closest && e.target.closest("[data-vtopen],[data-vtk],[data-vtgo],[data-vtnew],[data-vtdel]");
  if (!t) return;
  if (t.hasAttribute("data-vtopen")) {
    if (t.dataset.vtopen === "view" && store.settings.vt) vtOpen(true);
    else vtPick();
  } else if (t.hasAttribute("data-vtk")) {
    VT.on[t.dataset.vtk] = !VT.on[t.dataset.vtk];
    /* Eingaben behalten, wenn neu gezeichnet wird */
    document.querySelectorAll("#agVtBg [data-vtv]").forEach((i) => {
      const k = i.dataset.vtv,
        r = vtRows(VT.f).find((x) => x.k === k);
      if (r && i.value !== r.v) VT.f[k] = r.ed === "date" ? vtDate(i.value) || VT.f[k] : parseAmt(i.value) || VT.f[k];
    });
    vtRender();
    try {
      SND.play("tick");
    } catch (_) {}
  } else if (t.hasAttribute("data-vtgo")) vtApply();
  else if (t.hasAttribute("data-vtnew")) vtPick();
  else if (t.hasAttribute("data-vtdel")) {
    delete store.settings.vt;
    saveSettings();
    hbSheetClose("agVtBg");
    toast(uiText("vt_deleted"));
    agRefresh();
  }
});
function vtPick() {
  const i = $("vtFile");
  if (i) {
    i.value = "";
    i.click();
  }
}
document.addEventListener("change", (e) => {
  if (e.target.id === "vtFile" && e.target.files[0]) vtFromPdf(e.target.files[0]);
});

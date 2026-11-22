/* Einrichtung */
const WIZ_FIX = [
  ["Miete", ""],
  ["Strom", ""],
  ["Internet", ""],
  ["Handy", ""],
  ["Versicherungen", ""],
  ["Rundfunkbeitrag", "18,36"],
  ["Streaming", ""],
  ["Fitnessstudio", ""],
  ["Auto", ""],
  ["Deutschlandticket", "63"],
  ["Sparen / ETF", ""],
];
/* Bank */
const BANKS = [
  [
    "sparkasse",
    "Sparkasse",
    "S",
    "#e30613",
    "filiale",
    "im Online-Banking deiner Sparkasse (über sparkasse.de)",
    "<b>Umsätze</b> › <b>Exportieren</b> und das Format <b>CSV-CAMT V2</b>",
    "csv",
    "sparkasse.de",
  ],
  [
    "volksbank",
    "Volksbank / Raiffeisen",
    "VR",
    "#0066b3",
    "filiale",
    "im Online-Banking deiner Volksbank oder Raiffeisenbank",
    "<b>Umsätze</b> › <b>Exportieren</b> › <b>CSV</b>",
    "csv",
    "vr.de",
  ],
  [
    "commerzbank",
    "Commerzbank",
    "C",
    "#ffcc00",
    "filiale",
    "im Online-Banking auf commerzbank.de",
    "<b>Umsätze</b> › <b>Export</b> › <b>CSV</b>",
    "csv",
    "commerzbank.de",
  ],
  [
    "deutschebank",
    "Deutsche Bank",
    "DB",
    "#0018a8",
    "filiale",
    "im Online-Banking auf deutsche-bank.de",
    "<b>Umsätze</b> › <b>Exportieren</b> als <b>CSV</b>",
    "csv",
    "deutsche-bank.de",
  ],
  [
    "postbank",
    "Postbank",
    "P",
    "#f2c300",
    "filiale",
    "im Online-Banking auf postbank.de",
    "<b>Umsätze</b> › <b>Export</b> › <b>CSV</b>",
    "csv",
    "postbank.de",
  ],
  [
    "hvb",
    "HypoVereinsbank",
    "HVB",
    "#c8102e",
    "filiale",
    "im Online-Banking auf hvb.de",
    "<b>Umsätze</b> › <b>Exportieren</b> › <b>CSV</b>",
    "csv",
    "hvb.de",
  ],
  [
    "targobank",
    "Targobank",
    "T",
    "#123a7c",
    "filiale",
    "im Online-Banking auf targobank.de",
    "<b>Umsätze</b> › <b>Export</b> (CSV) – oder den <b>PDF-Kontoauszug</b>",
    "csv",
    "targobank.de",
  ],
  [
    "santander",
    "Santander",
    "St",
    "#ec0000",
    "filiale",
    "im Online-Banking auf santander.de",
    "<b>Umsätze</b> › <b>Export</b> (CSV) – oder den <b>PDF-Kontoauszug</b>",
    "csv",
    "santander.de",
  ],
  [
    "sparda",
    "Sparda-Bank",
    "Sp",
    "#0055a5",
    "filiale",
    "im Online-Banking deiner Sparda-Bank",
    "<b>Umsätze</b> › <b>Exportieren</b> › <b>CSV</b>",
    "csv",
    "sparda.de",
  ],
  [
    "psd",
    "PSD Bank",
    "PSD",
    "#00695c",
    "filiale",
    "im Online-Banking deiner PSD Bank",
    "<b>Umsätze</b> › <b>Exportieren</b> › <b>CSV</b>",
    "csv",
    "psd-bank.de",
  ],
  [
    "ing",
    "ING",
    "ING",
    "#ff6200",
    "online",
    "im Banking auf ing.de (am besten im Browser)",
    "<b>Girokonto</b> › <b>Umsätze</b> › <b>Exportieren</b> (CSV)",
    "csv",
    "ing.de",
  ],
  [
    "dkb",
    "DKB",
    "DKB",
    "#148dea",
    "online",
    "im Banking auf dkb.de",
    "<b>Konto</b> › <b>Umsätze</b> › <b>Exportieren</b> (CSV)",
    "csv",
    "dkb.de",
  ],
  [
    "comdirect",
    "comdirect",
    "cd",
    "#f8d600",
    "online",
    "im Online-Banking auf comdirect.de",
    "<b>Umsätze</b> › <b>Export</b> › <b>CSV</b>",
    "csv",
    "comdirect.de",
  ],
  [
    "consorsbank",
    "Consorsbank",
    "Co",
    "#0c3c78",
    "online",
    "im Online-Banking auf consorsbank.de",
    "<b>Umsätze</b> › <b>Export</b> (CSV)",
    "csv",
    "consorsbank.de",
  ],
  [
    "1822direkt",
    "1822direkt",
    "1822",
    "#e30613",
    "online",
    "im Online-Banking auf 1822direkt.de",
    "<b>Umsätze</b> › <b>Exportieren</b> und das Format <b>CSV-CAMT V2</b>",
    "csv",
    "1822direkt.de",
  ],
  [
    "norisbank",
    "norisbank",
    "nb",
    "#5c2d91",
    "online",
    "im Online-Banking auf norisbank.de",
    "<b>Umsätze</b> › <b>Exportieren</b> als <b>CSV</b>",
    "csv",
    "norisbank.de",
  ],
  [
    "n26",
    "N26",
    "N26",
    "#2a2a2a",
    "online",
    "im Browser auf app.n26.com",
    "<b>Kontoauszüge</b> bzw. <b>Umsätze herunterladen</b> › Format <b>CSV</b>",
    "csv",
    "n26.com",
  ],
  [
    "c24",
    "C24",
    "C24",
    "#0a2540",
    "online",
    "in der C24-App",
    "<b>Konto</b> › <b>Kontoauszüge</b> (PDF)",
    "pdf",
    "c24.de",
  ],
  [
    "tomorrow",
    "Tomorrow",
    "To",
    "#1d1d1b",
    "online",
    "in der Tomorrow-App",
    "<b>Konto</b> › <b>Kontoauszüge</b> (PDF)",
    "pdf",
    "tomorrow.one",
  ],
  [
    "vivid",
    "Vivid",
    "Vi",
    "#6c2bd9",
    "online",
    "in der Vivid-App",
    "<b>Konto</b> › <b>Kontoauszüge</b> (PDF)",
    "pdf",
    "vivid.money",
  ],
  [
    "revolut",
    "Revolut",
    "R",
    "#191c1f",
    "online",
    "in der Revolut-App",
    "<b>Konto</b> › <b>⋯</b> › <b>Kontoauszug</b> › Format <b>Excel/CSV</b>",
    "csv",
    "revolut.com",
  ],
  [
    "bunq",
    "bunq",
    "bq",
    "#2ecc71",
    "online",
    "in der bunq-App",
    "<b>Konto</b> › <b>Kontoauszug exportieren</b> › <b>CSV</b>",
    "csv",
    "bunq.com",
  ],
  [
    "traderepublic",
    "Trade Republic",
    "TR",
    "#111111",
    "online",
    "in der Trade-Republic-App",
    "<b>Profil</b> › <b>Aktivität</b> bzw. <b>Dokumente</b> › <b>Kontoauszug</b> (PDF)",
    "pdf",
    "traderepublic.com",
  ],
  [
    "openbank",
    "Openbank",
    "Ob",
    "#e5004b",
    "online",
    "im Online-Banking auf openbank.de",
    "<b>Umsätze</b> › <b>Export</b> – oder den <b>PDF-Kontoauszug</b>",
    "csv",
    "openbank.de",
  ],
  [
    "wise",
    "Wise",
    "W",
    "#9fe870",
    "online",
    "auf wise.com oder in der Wise-App",
    "<b>Konto</b> › <b>Kontoauszüge</b> › Format <b>CSV</b>",
    "csv",
    "wise.com",
  ],
  [
    "paypal",
    "PayPal",
    "PP",
    "#003087",
    "online",
    "auf paypal.com im Browser",
    "<b>Aktivitäten</b> › <b>Kontoauszüge</b> › <b>CSV</b>",
    "csv",
    "paypal.com",
  ],
];
const bankOf = (id) => BANKS.find((b) => b[0] === id);
const BANKSI = {
  sparkasse: [
    "#FF0000",
    "M7.0602 12.3061v1.8455h14.175v6.7773c.0296 1.6615-1.4064 3.1066-3.0705 3.0705H5.8352c-1.6582.0306-3.1011-1.4121-3.0705-3.0705v-1.225H16.908v-1.8455H2.7648v-6.7773c-.0307-1.6579 1.4123-3.1012 3.0704-3.0704h12.3295c1.6641-.0363 3.1 1.4095 3.0705 3.0705v1.225H7.0602zm4.9241-6.1486c1.7003 0 3.0787-1.3784 3.0787-3.0787S13.6847 0 11.9843 0 8.9055 1.3784 8.9055 3.0788s1.3785 3.0787 3.0788 3.0787z",
  ],
  commerzbank: [
    "#FFCC33",
    "M6.277 1.538a.018.018 0 0 0-.012.007l-4.74 8.21-1.398 2.418c.446.774.794 1.353 1.22 2.09.671 1.164 1.548 1.597 3.13 1.889a12.9 12.9 0 0 1 .697-1.392l2.783-4.824 2.786-4.826c.404-.702 1.296-2.143 2.57-2.965-.04.025-.07.059-.109.085.07-.047.137-.094.209-.136.46-.278.98-.467 1.413-.515.339-.038 1.465-.041 2.74-.041zm11.59.505c-1.048-.008-1.462.007-2.545.008-1.39 0-2.381.887-3.083 1.773.372.493.68.971.863 1.288a13357.605 13357.605 0 0 0 5.571 9.648c.404.7 1.209 2.196 1.284 3.71.029.574-.079 1.165-.265 1.592-.131.3-.652 1.207-1.256 2.253L24 12.678v-.008a.013.013 0 0 0-.002-.005zM.001 8.163l.095 4.946L0 8.163zm.093 4.946 1.132 1.964 4.264 7.384a.015.015 0 0 0 .012.005h12.265c.446-.779.664-1.147 1.311-2.282.709-1.242.278-2.681-.037-3.472-.618.076-1.18.093-1.547.093H6.35c-.809 0-2.505-.05-3.853-.741-.513-.263-.972-.65-1.248-1.027-.176-.238-.625-1.003-1.156-1.924z",
  ],
  deutschebank: [
    "#0018A8",
    "M3.375 3.375v17.25h17.25V3.375H3.375zM0 0h24v24H0V0zm5.25 18.225 9.15-12.45h4.35L9.6 18.225H5.25z",
  ],
  n26: [
    "#48AC98",
    "M0 3.803v1.195h7.436V3.803H0zM12.69 7.29c-2.034 0-3.038 1.252-3.038 2.684 0 .234.027.468.092.728l1.393.135a3.697 3.697 0 0 1-.09-.793c0-1.072.71-1.586 1.598-1.586.866 0 1.507.485 1.507 1.652 0 1.186-.58 1.995-1.464 2.88-.925.923-2.4 2.027-3.112 2.534v1.092h6.135v-1.195h-4.168c.695-.48 1.69-1.279 2.133-1.72.502-.503 1.931-1.794 1.931-3.636 0-1.903-1.24-2.775-2.918-2.775zm8.34 0c-1.976 0-3.454 1.517-3.454 4.916 0 3.017 1.233 4.508 3.356 4.508 1.754 0 3.068-1.198 3.068-3.172 0-1.542-.823-3.066-2.793-3.066-1.1 0-1.884.51-2.281 1.263 0-1.78.62-3.33 2.094-3.33.937 0 1.309.538 1.507 1.422l1.366-.271c-.321-1.527-1.292-2.27-2.864-2.27zM.075 7.389v9.228h1.33v-6.312c0-.56-.013-.898-.039-1.223h.026c.136.372.298.699.539 1.123l3.732 6.412h1.69V7.39H6.04v6.31c0 .56.013.898.04 1.223h-.028a7.252 7.252 0 0 0-.537-1.123L1.783 7.389H.076zm20.817 4.185c1.114 0 1.744.822 1.744 1.992 0 1.256-.717 2.034-1.701 2.034-1.09 0-1.843-1.001-1.973-2.329.33-1.133 1.063-1.697 1.93-1.697zM0 19.008v1.19h7.436v-1.19H0z",
  ],
  revolut: [
    "#191C1F",
    "M20.9133 6.9566C20.9133 3.1208 17.7898 0 13.9503 0H2.424v3.8605h10.9782c1.7376 0 3.177 1.3651 3.2087 3.043.016.84-.2994 1.633-.8878 2.2324-.5886.5998-1.375.9303-2.2144.9303H9.2322a.2756.2756 0 0 0-.2755.2752v3.431c0 .0585.018.1142.052.1612L16.2646 24h5.3114l-7.2727-10.094c3.6625-.1838 6.61-3.2612 6.61-6.9494zM6.8943 5.9229H2.424V24h4.4704z",
  ],
  bunq: [
    "#3394D7",
    "M16.414 14.62h1.103v-2.896a2.484 2.484 0 0 0-2.483-2.483 2.484 2.484 0 0 0-2.482 2.483v2.897h1.103v-2.897c0-.837.618-1.517 1.38-1.517.76 0 1.379.68 1.379 1.517zm-6.07-5.24h1.104v2.896a2.484 2.484 0 0 1-2.482 2.483 2.484 2.484 0 0 1-2.483-2.483V9.379h1.103v2.897c0 .837.618 1.517 1.38 1.517.76 0 1.379-.68 1.379-1.517zM0 7.034V12c0 .046.001.093.004.139H0v2.482h.965l.055-.48A2.76 2.76 0 0 0 5.518 12a2.76 2.76 0 0 0-4.414-2.208V7.035zm2.69 3.172c.951 0 1.724.803 1.724 1.793 0 .99-.773 1.793-1.725 1.793-.951 0-1.724-.803-1.724-1.793 0-.99.773-1.793 1.724-1.793zm18.552-.965A2.76 2.76 0 0 0 18.482 12a2.76 2.76 0 0 0 4.414 2.207v2.758H24V12a2.15 2.15 0 0 0-.004-.139H24V9.38h-.965l-.055.48a2.741 2.741 0 0 0-1.738-.617zm.069.965c.951 0 1.724.803 1.724 1.793 0 .99-.773 1.793-1.724 1.793-.952 0-1.725-.803-1.725-1.793 0-.99.773-1.793 1.725-1.793Z",
  ],
  wise: [
    "#9FE870",
    "M6.488 7.469 0 15.05h11.585l1.301-3.576H7.922l3.033-3.507.01-.092L8.993 4.48h8.873l-6.878 18.925h4.706L24 .595H2.543l3.945 6.874Z",
  ],
  paypal: [
    "#002991",
    "M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z",
  ],
};
function bankName() {
  const b = store.settings.bank;
  if (!b) return "";
  return b.id === "andere" ? b.name || "Andere Bank" : (bankOf(b.id) || [])[1] || "";
}
function bankLogo(b, size) {
  const st = size ? `width:${size}px;height:${size}px;` : "",
    si = BANKSI[b[0]];
  const lum = (h) => {
    const n = parseInt(h.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  };
  if (si)
    return `<span class="bklg bksi" style="${st}background:${si[0]}"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="${lum(si[0]) > 0.65 ? "#1a1a1a" : "#fff"}" d="${si[1]}"/></svg></span>`;
  const d = b[8],
    v = d && LOGO.map.get(d);
  if (d && store.settings.logos === true) {
    if (!v) queueLogo(d);
    else if (v.data) return `<span class="bklg bkimg" style="${st}"><img src="${escHtml(v.data)}" alt=""></span>`;
  }
  return `<span class="bklg" style="${st}background:${b[3]};color:${lum(b[3]) > 0.65 ? "#1f2a24" : "#fff"}">${escHtml(b[2])}</span>`;
}
function bankPicker(sel, other) {
  const tile = (b) =>
    `<button class="bkt ${sel === b[0] ? "on" : ""}" data-bank="${b[0]}">${bankLogo(b)}<span>${escHtml(b[1])}</span></button>`;
  return `<div class="bkhd">Filialbanken</div><div class="bkgrid">${BANKS.filter((b) => b[4] === "filiale")
    .map(tile)
    .join("")}</div>
    <div class="bkhd">Online-Banken</div><div class="bkgrid">${BANKS.filter((b) => b[4] === "online")
      .map(tile)
      .join("")}
    <button class="bkt ${sel === "andere" ? "on" : ""}" data-bank="andere"><span class="bklg" style="background:var(--line);color:var(--muted)">…</span><span>Andere Bank</span></button></div>
    ${sel === "andere" ? `<input class="in bkother" id="bankOther" placeholder="Name deiner Bank" value="${escHtml(other || "")}" autocomplete="off">` : ""}
    ${store.settings.logos === true ? "" : `<label class="bklogos"><input type="checkbox" data-banklogos> Fehlende Logos online laden (Banken und Läden)</label>`}`;
}
function bankGuide() {
  const b = store.settings.bank,
    B = b && bankOf(b.id),
    name = bankName();
  if (!B)
    return `<div class="card"><div class="card-head"><h2>So bekommst du die Datei</h2>${b ? `<button class="link small" data-bankchange="1">Bank ändern</button>` : ""}</div>
      <ol class="steps"><li data-noi18n>${uiText(name ? "imp_s1b" : "imp_s1", {
        b: escHtml(name || ""),
      })}</li>
      <li data-noi18n>${uiText("imp_s2")}</li>
      <li data-noi18n>${uiText("imp_s3")}</li>
      <li>Lade die Datei hier hoch. Schon importierte Buchungen werden erkannt und übersprungen.</li></ol>
      ${b ? "" : `<button class="btn" data-bankchange="1" style="margin-top:12px">Meine Bank auswählen</button>`}</div>`;
  const pdf = B[7] === "pdf";
  return `<div class="card"><div class="card-head"><h2 class="bkgh">${bankLogo(B, 30)} So geht's bei ${escHtml(B[1])}</h2><button class="link small" data-bankchange="1">Bank ändern</button></div>
    <ol class="steps"><li><span>Anmelden:</span> <span>${B[5]}</span></li>
      <li><span>Geh zu deinem Konto:</span> ${B[6]}</li>
      <li>${pdf ? "Wähle den Monat bzw. Zeitraum und speichere die <b>PDF</b>." : "Wähle den Zeitraum, z. B. seit deinem letzten Import."}</li>
      <li>Lade die Datei hier hoch. Schon importierte Buchungen werden erkannt und übersprungen.</li></ol>
    <p class="small muted" style="margin:12px 0 0">${pdf ? "Die App liest Datum, Empfänger und Betrag aus dem PDF – kurz drüberschauen, ob alles stimmt." : "Je nach App- oder Browser-Version heißen die Punkte leicht anders. Klappt es nicht, geht auch der <b>PDF-Kontoauszug</b> – oder fotografier ihn über Plus › Foto."} Die Datei bleibt nur in deiner App.</p></div>`;
}
function bankAskOpen(manual) {
  ui.bankManual = !!manual;
  let el = $("bankBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "bankBg";
    el.className = "wizbg";
    document.body.appendChild(el);
  }
  ui.bankSel = (store.settings.bank && store.settings.bank.id) || "";
  ui.bankOther = (store.settings.bank && store.settings.bank.name) || "";
  el.hidden = false;
  document.body.classList.add("locked");
  bankAskRender();
}
function bankAskRender() {
  const el = $("bankBg");
  if (!el) return;
  el.innerHTML = `<div class="wiz" role="dialog" aria-label="Bank"><h2 class="wt">Bei welcher Bank ist dein Konto?</h2><p class="ws">Dann zeigt dir die App genau, wie du deine Umsätze von dort holst.</p>${bankPicker(ui.bankSel, ui.bankOther)}
    <div class="wfoot ${store.settings.bank || ui.bankManual ? "" : "solo"}">${store.settings.bank || ui.bankManual ? `<button class="btn" data-bankx>${escHtml(uiText("sh_cancel"))}</button>` : ""}<button class="btn primary" id="bankSave" ${ui.bankSel && (ui.bankSel !== "andere" || (ui.bankOther || "").trim()) ? "" : "disabled"}>Speichern</button></div></div>`;
}
function bankAskShould() {
  return (
    store.settings &&
    store.settings.wizDone &&
    !store.settings.bank &&
    !ui.wiz &&
    (!$("legalBg") || $("legalBg").hidden) &&
    (!$("bankBg") || $("bankBg").hidden) &&
    (!$("loginBg") || $("loginBg").hidden)
  );
}
document.addEventListener("click", async (e) => {
  const t = e.target,
    bb = t.closest("#bankBg");
  if (t.closest("[data-bankchange]")) {
    bankAskOpen(true);
    return;
  }
  if (t.closest("[data-bankx]")) {
    const b = $("bankBg");
    if (b) b.hidden = true;
    document.body.classList.remove("locked");
    return;
  }
  const k = t.closest("[data-bank]");
  if (k) {
    if (bb) {
      ui.bankSel = k.dataset.bank;
      bankAskRender();
      if (ui.bankSel === "andere") setTimeout(() => $("bankOther") && $("bankOther").focus(), 30);
      return;
    }
    if (t.closest("#wizBg") && ui.wiz) {
      ui.wiz.bank = k.dataset.bank;
      wizRender();
      if (ui.wiz.bank === "andere") setTimeout(() => $("bankOther") && $("bankOther").focus(), 30);
      return;
    }
  }
  if (t.closest("#bankSave")) {
    const id = ui.bankSel;
    if (!id) return;
    const name = id === "andere" ? (($("bankOther") || {}).value || "").trim() : "";
    if (id === "andere" && !name) return;
    store.settings.bank = {
      id,
      ...(name
        ? {
            name,
          }
        : {}),
    };
    await saveSettings();
    $("bankBg").hidden = true;
    document.body.classList.remove("locked");
    toast(`Gespeichert: ${bankName()}`);
    render();
  }
});
document.addEventListener("change", async (e) => {
  if (!e.target.matches("[data-banklogos]")) return;
  store.settings.logos = e.target.checked;
  await saveSettings();
  if (ui.wiz) wizRender();
  else bankAskRender();
  setTimeout(() => {
    if (ui.wiz) wizRender();
    else if ($("bankBg") && !$("bankBg").hidden) bankAskRender();
  }, 2500);
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "bankOther") return;
  const v = e.target.value;
  if (e.target.closest("#bankBg")) {
    ui.bankOther = v;
    const b = $("bankSave");
    if (b) b.disabled = !v.trim();
  } else if (ui.wiz) {
    ui.wiz.bankName = v;
    const b = $("wzNext");
    if (b) b.disabled = !v.trim();
  }
});
setTimeout(function bankAskLater() {
  if (bankAskShould()) bankAskOpen();
  else if (!(store.settings && store.settings.bank)) setTimeout(bankAskLater, 4000);
}, 2500);
function wizShould() {
  if (BG_RUN || store.settings.wizDone || ui.wiz || $("dankeBg") || TOUR.page === "danke" || dankeShould())
    return false;
  try {
    if (localStorage.getItem("hb-wiz-skip")) return false;
  } catch (e) {}
  if (store.tx.length || store.fixed.length) return false;
  if ($("loginBg") && !$("loginBg").hidden) return false;
  if (typeof SYNC !== "undefined" && SYNC.token && !SYNC.last) return false;
  return true;
}
function wizOpen() {
  ui.wiz = {
    step: 0,
    forced: !store.settings.wizDone,
    name: store.settings.name || "",
    work: store.settings.work || "",
    extra: [...(store.settings.extra || [])],
    exAsk: false,
    bal: "",
    bank: (store.settings.bank || {}).id || "",
    bankName: (store.settings.bank || {}).name || "",
    fix: {},
    own: [],
    bud: {},
    debts: [],
  };
  let el = $("wizBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "wizBg";
    el.className = "wizbg";
    document.body.appendChild(el);
  }
  el.hidden = false;
  document.body.classList.add("locked");
  wizRender();
  wizAnimIn(1);
}
function wizItems() {
  const root = $("wizBg") && $("wizBg").querySelector(".wiz");
  if (!root) return [];
  const it = [];
  for (const ch of root.children) {
    if (ch.matches(".wsteps,.wfoot")) continue;
    if (ch.matches(".wopts,.wgrid,.wchips,.wfix")) it.push(...ch.children);
    else it.push(ch);
  }
  return it;
}
function wizAnimIn(dir) {
  wizItems().forEach((x, i) => {
    x.style.animation = `${dir < 0 ? "wzInB" : "wzInF"} .4s cubic-bezier(.2,.8,.2,1) ${Math.min(i, 10) * 45}ms both`;
  });
}
function wizNav(fn, dir) {
  const w = ui.wiz;
  if (!w || w.anim) return;
  w.anim = true;
  const it = wizItems();
  it.forEach((x, i) => {
    x.style.animation = `${dir < 0 ? "wzOutB" : "wzOutF"} .17s ease-in ${Math.min(i, 8) * 18}ms both`;
  });
  setTimeout(
    () => {
      w.anim = false;
      fn();
      if (!ui.wiz) return;
      wizRender();
      $("wizBg").scrollTop = 0;
      wizAnimIn(dir);
    },
    170 + Math.min(it.length, 8) * 18
  );
}
function wizBackOne() {
  const w = ui.wiz;
  if (!w) return false;
  wizRead();
  if (w.step === 1) {
    const grp = w.grp === undefined ? workGroup(w.work) : w.grp;
    if (w.exAsk) {
      wizNav(() => {
        w.exAsk = false;
        w.grp = grp;
      }, -1);
      return true;
    }
    if (grp) {
      wizNav(() => {
        w.grp = "";
      }, -1);
      return true;
    }
  }
  if (w.step === 0) return false;
  wizNav(() => {
    w.step--;
    if (w.step === 1 && w.work) w.exAsk = true;
  }, -1);
  return true;
}
function wizClose() {
  ui.wiz = null;
  const el = $("wizBg");
  if (el) el.hidden = true;
  document.body.classList.remove("locked");
}
function wizRender() {
  const w = ui.wiz,
    el = $("wizBg");
  if (!w || !el) return;
  const N = 7,
    st = w.step,
    y = ymOf(new Date()).slice(0, 4);
  const g1 = st === 1 ? (w.grp === undefined ? workGroup(w.work) : w.grp) : "";
  const crumb =
    st === 1 && (g1 || w.exAsk)
      ? `<div class="wcrumb"><button data-wzcrumb="0">Schritt 2</button>${g1 ? `<i>›</i><button data-wzcrumb="1">${escHtml((WGROUPS.find((x) => x[0] === g1) || [, ""])[1])}</button>` : ""}${w.exAsk && w.work ? `<i>›</i><span>${escHtml((WORK.find((x) => x[0] === w.work) || [, ""])[1])}</span>` : ""}</div>`
      : `<small class="wk">Schritt ${st + 1} von ${N}</small>`;
  const head = (t, sub) =>
    `<div class="wsteps">${Array.from(
      {
        length: N,
      },
      (_, i) => `<i class="${i <= st ? "on" : ""}"></i>`
    ).join("")}</div>${crumb}<h2 class="wt">${t}</h2><p class="ws">${sub}</p>`;
  let body = "";
  if (st === 0)
    body =
      head("Willkommen! Wie heißt du?", "Name und Foto sind freiwillig – für die Begrüßung oben links.") +
      `<div class="wname"><button class="wav" id="wzAv" aria-label="Profilfoto">${store.settings.photo ? `<img src="${escHtml(store.settings.photo)}" alt="">` : `<span>${escHtml(((w.name || "").trim()[0] || "?").toUpperCase())}</span>`}</button><input class="in wbig" id="wzName" value="${escHtml(w.name)}" placeholder="Dein Vorname" maxlength="30" autocomplete="given-name"></div>
    <div class="wphoto">${phoneCam() ? `<button class="btn" id="wzCam">${svgIcon("camera", 18)} Foto machen</button>` : ""}<button class="btn" id="wzPick">${svgIcon("user", 18)} ${phoneCam() ? "Aus Galerie" : "Foto wählen"}</button>${store.settings.photo ? `<button class="btn" id="wzPhDel" aria-label="Foto entfernen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button>` : ""}</div>`;
  if (st === 1)
    body =
      w.exAsk && w.work
        ? head(
            "Was gehört noch zu deinem Leben?",
            "Nebenjob, Kinder, Partner … Du kannst mehreres anhaken – oder „Nein“. Jederzeit änderbar."
          ) + extraPicker(w.work, w.extra || [], "wzextra")
        : head("Wie verdienst du dein Geld?", "Dann zeigt die App nur, was zu dir passt.") +
          workPicker(w.work, w.grp === undefined ? workGroup(w.work) : w.grp, "wzwork");
  if (st === 2)
    body =
      head(
        "Wie viel ist heute auf deinem Konto?",
        "Der aktuelle Stand deines Girokontos. Ab hier rechnet die App weiter."
      ) +
      `<div class="wamt"><input class="in wbig" id="wzBal" inputmode="decimal" value="${escHtml(w.bal)}" placeholder="0,00"><span>€</span></div>`;
  if (st === 3)
    body =
      head("Bei welcher Bank ist dein Konto?", "Dann zeigt dir die App genau, wie du deine Umsätze von dort holst.") +
      bankPicker(w.bank, w.bankName);
  if (st === 4) {
    const tot = sum(Object.values(w.fix), (v) => parseAmt(v) || 0) + sum(w.own, (x) => parseAmt(x.a) || 0);
    body =
      head("Was zahlst du jeden Monat?", "Antippen und Betrag eintragen – ändern kannst du alles später.") +
      `<div class="wchips">${WIZ_FIX.map(([n, def]) => {
        const on = n in w.fix;
        return `<button class="wchip ${on ? "on" : ""}" data-wzfix="${escHtml(n)}" data-def="${escHtml(def)}">${on ? "✓ " : "+ "}${escHtml(n)}</button>`;
      }).join("")}</div>
      <div class="wfix">${Object.keys(w.fix)
        .map(
          (n) =>
            `<label class="wrow"><span>${escHtml(n)}</span><input class="in" data-wzfixamt="${escHtml(n)}" inputmode="decimal" value="${escHtml(w.fix[n])}" placeholder="Betrag €"></label>`
        )
        .join("")}
      ${w.own.map((x, i) => `<div class="wrow"><input class="in" data-wzownn="${i}" value="${escHtml(x.n)}" placeholder="Name"><input class="in" data-wzowna="${i}" inputmode="decimal" value="${escHtml(x.a)}" placeholder="Betrag €"></div>`).join("")}
      <button class="chip" id="wzOwn">+ Eigene Fixkosten</button></div>
      ${tot > 0 ? `<div class="wsum"><span>${Object.keys(w.fix).length + w.own.filter((x) => x.n).length} Fixkosten</span><b>${escHtml(fmtEur(tot))} im Monat</b></div>` : ""}`;
  }
  if (st === 5) {
    const tot = sum(w.debts, (x) => parseAmt(x.o) || 0);
    body =
      head(
        "Zahlst du etwas ab?",
        "Kredite, Ratenkäufe oder Geld, das du jemandem schuldest. Die App rechnet dir aus, wann alles weg ist."
      ) +
      `<div class="wfix wdebts">${w.debts
        .map((x, i) => {
          const en = rateEnd(parseAmt(x.o), parseAmt(x.r), 0);
          return `<div class="wdebt"><div class="wdh"><input class="in" data-wzdn="${i}" value="${escHtml(x.n)}" placeholder="z. B. Autokredit, Handy auf Raten"><button class="wdx" data-wzddel="${i}" aria-label="Entfernen">×</button></div><div class="wdr"><label><span>Rate pro Monat</span><input class="in" data-wzdr="${i}" inputmode="decimal" value="${escHtml(x.r)}" placeholder="0,00 €"></label><label><span>Noch offen</span><input class="in" data-wzdo="${i}" inputmode="decimal" value="${escHtml(x.o)}" placeholder="0,00 €"></label></div>${en && !en.never ? `<small class="wdend">bis ca. ${escHtml(monthName(en.ym))} · noch ${en.n} Raten</small>` : ""}</div>`;
        })
        .join("")}
      <button class="chip wdadd" id="wzDebt">＋ ${w.debts.length ? "Weitere Rate oder Schuld" : "Rate oder Schuld hinzufügen"}</button></div>
      ${tot > 0 ? `<div class="wsum"><span>${w.debts.length} ${w.debts.length === 1 ? "Schuld" : "Schulden"}</span><b>${escHtml(fmtEur(tot))} offen</b></div>` : ""}`;
  }
  if (st === 6)
    body =
      head("Fast fertig: Budgets", "Wie viel willst du im Monat höchstens ausgeben? Leer lassen = kein Budget.") +
      `<div class="wfix">${cats("ausgabe")
        .filter((c) => !/bargeld/i.test(c))
        .map(
          (c) =>
            `<label class="wrow"><span>${escHtml(c)}</span><input class="in" data-wzbud="${escHtml(c)}" inputmode="decimal" value="${escHtml(w.bud[c] || "")}" placeholder="kein Budget"></label>`
        )
        .join("")}</div>
      ${SYNCABLE && !(SYNC && SYNC.token) ? `<div class="notice info" style="margin-top:14px"><span>Handy und PC abgleichen? Das geht jederzeit unter Einstellungen › Abgleich & Backup.</span></div>` : ""}`;
  el.innerHTML = `<div class="wiz" role="dialog" aria-label="Einrichtung">${body}
    <div class="wfoot ${!st && w.forced ? "solo" : ""}">${st ? `<button class="btn" id="wzBack">Zurück</button>` : w.forced ? "" : `<button class="btn" id="wzSkipAll">Später</button>`}<button class="btn primary" id="wzNext" ${st === 3 && (!w.bank || (w.bank === "andere" && !(w.bankName || "").trim())) ? "disabled" : ""}>${st === N - 1 ? "Fertig" : (st === 4 && !Object.keys(w.fix).length && !w.own.length) || (st === 5 && !w.debts.some((x) => x.n || parseAmt(x.r) > 0)) ? "Überspringen" : "Weiter"}</button></div></div>`;
  const f = el.querySelector("input");
  if (f && st !== 3 && st !== 4 && st !== 5 && st !== 6)
    setTimeout(
      () =>
        f.focus({
          preventScroll: true,
        }),
      50
    );
}
function wizRead() {
  const w = ui.wiz;
  if (!w) return;
  if ($("wzName")) w.name = $("wzName").value.trim();
  if ($("wzBal")) w.bal = $("wzBal").value.trim();
  document.querySelectorAll("[data-wzfixamt]").forEach((i) => (w.fix[i.dataset.wzfixamt] = i.value.trim()));
  document.querySelectorAll("[data-wzownn]").forEach((i) => (w.own[Number(i.dataset.wzownn)].n = i.value.trim()));
  document.querySelectorAll("[data-wzowna]").forEach((i) => (w.own[Number(i.dataset.wzowna)].a = i.value.trim()));
  document.querySelectorAll("[data-wzdn]").forEach((i) => {
    const d = w.debts[Number(i.dataset.wzdn)];
    if (d) d.n = i.value.trim();
  });
  document.querySelectorAll("[data-wzdr]").forEach((i) => {
    const d = w.debts[Number(i.dataset.wzdr)];
    if (d) d.r = i.value.trim();
  });
  document.querySelectorAll("[data-wzdo]").forEach((i) => {
    const d = w.debts[Number(i.dataset.wzdo)];
    if (d) d.o = i.value.trim();
  });
  document.querySelectorAll("[data-wzbud]").forEach((i) => {
    if (i.value.trim()) w.bud[i.dataset.wzbud] = i.value.trim();
    else delete w.bud[i.dataset.wzbud];
  });
}
async function wizFinish() {
  const w = ui.wiz;
  wizRead();
  const st = store.settings,
    y = ymOf(new Date()).slice(0, 4),
    today = isoToday();
  if (w.name) st.name = w.name;
  if (w.bank)
    st.bank = {
      id: w.bank,
      ...(w.bank === "andere" && w.bankName
        ? {
            name: w.bankName.trim(),
          }
        : {}),
    };
  const prevW = st.work;
  st.work = w.work || st.work || "beides";
  st.extra = extraFor(st.work)
    .map((x) => x[0])
    .filter((k) => (w.extra || []).includes(k));
  addWorkInc(st, st.work);
  addProfCats(st, st.work);
  if (prevW !== st.work && GPROF[st.work]) {
    const j = (st.jl = st.jl || {});
    j.payDay = GPROF[st.work].day;
  }
  addExtraInc(st);
  const bal = parseAmt(w.bal);
  if (w.bal !== "" && isFinite(bal)) {
    st.accountAnchors = {
      ...(st.accountAnchors || {}),
      Hauptkonto: {
        date: today,
        balance: round2(bal),
        ts: Date.now(),
      },
    };
    st.startBalance = {
      ...(st.startBalance || {}),
      [y]: round2(bal),
    };
  }
  const bud = {
    ...(st.budgets || {}),
  };
  for (const [c, v] of Object.entries(w.bud)) {
    const a = parseAmt(v);
    if (a > 0) bud[c] = round2(a);
  }
  st.budgets = bud;
  const used = new Set(store.tx.map((t) => t.cat)),
    c2 = clone(st.cats || DEFAULT_SETTINGS.cats);
  c2.einnahme = c2.einnahme.filter((x) => {
    const o =
      typeof x === "string"
        ? {
            name: x,
            art: "sonstige",
          }
        : x;
    if (used.has(o.name)) return true;
    if (!["selbst", "beides"].includes(st.work) && !(st.extra || []).includes("selbst") && o.art === "selbst")
      return false;
    if (
      !["angestellt", "beides", "azubi"].includes(st.work) &&
      !(st.extra || []).includes("angestellt") &&
      (o.art === "lohn" || o.art === "sonderzahlung")
    )
      return false;
    return true;
  });
  st.cats = c2;
  st.wizDone = 1;
  await saveSettings();
  let k = store.fixed.length;
  const items = [...Object.entries(w.fix).map(([n, v]) => [n, v]), ...w.own.map((x) => [x.n, x.a])].filter(
    ([n, v]) => n && parseAmt(v) > 0
  );
  for (const [n, v] of items)
    await safe(() =>
      saveDoc("fixed", newId(), {
        name: n,
        amount: round2(parseAmt(v)),
        kind: "privat",
        order: k++,
      })
    );
  for (const d of w.debts || [])
    if ((d.n || "").trim() && parseAmt(d.r) > 0)
      await rateCreate({
        name: d.n.trim(),
        rate: d.r,
        open: d.o,
        zins: "",
        day: 0,
        art: "",
      });
  wizClose();
  ui.view = "home";
  render();
  setTimeout(() => {
    if (!$("tourBg").hidden) return;
    if (!mCfg()) {
      MAMI.after = "tour";
      mamiOpen();
    } else tourOpen();
  }, 500);
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#wizAgain")) wizOpen();
});
document.addEventListener("click", async (e) => {
  const w = ui.wiz;
  if (!w || !e.target.closest("#wizBg")) return;
  const t = e.target;
  if (t.closest("#wzCam")) {
    wizRead();
    avatarNative("camera");
    return;
  }
  if (t.closest("#wzPick") || t.closest("#wzAv")) {
    wizRead();
    if (store.settings.photoSrc && t.closest("#wzAv")) pfeOpen(store.settings.photoSrc, store.settings.photoCrop);
    else $("pfPick").click();
    return;
  }
  if (t.closest("#wzPhDel")) {
    wizRead();
    store.settings.photo = "";
    store.settings.photoSrc = "";
    store.settings.photoCrop = null;
    saveSettings();
    renderAvatar();
    wizRender();
    return;
  }
  const wc = t.closest("[data-wzcrumb]");
  if (wc) {
    const lv = +wc.dataset.wzcrumb;
    wizNav(() => {
      if (lv === 0) {
        w.grp = "";
        w.exAsk = false;
      } else {
        w.grp = w.grp === undefined ? workGroup(w.work) : w.grp;
        w.exAsk = false;
      }
    }, -1);
    return;
  }
  const wg = t.closest("[data-wzworkgrp]");
  if (wg) {
    const g = wg.dataset.wzworkgrp;
    if (!g) {
      wizBackOne();
      return;
    }
    wizNav(() => {
      w.grp = g;
    }, 1);
    return;
  }
  const wk = t.closest("[data-wzwork]");
  if (wk) {
    const k = wk.dataset.wzwork;
    wk.classList.add("on");
    wizNav(() => {
      if (w.work !== k) w.extra = [];
      w.work = k;
      w.exAsk = true;
    }, 1);
    return;
  }
  const we = t.closest("[data-wzextra]");
  if (we) {
    const k = we.dataset.wzextra;
    w.extra = w.extra || [];
    w.extra = !k ? [] : w.extra.includes(k) ? w.extra.filter((x) => x !== k) : [...w.extra, k];
    wizRender();
    return;
  }
  if (t.closest("[data-wzexback]")) {
    wizBackOne();
    return;
  }
  const fx = t.closest("[data-wzfix]");
  if (fx) {
    wizRead();
    const n = fx.dataset.wzfix;
    if (n in w.fix) delete w.fix[n];
    else w.fix[n] = fx.dataset.def || "";
    wizRender();
    const i = document.querySelector(`[data-wzfixamt="${CSS.escape(n)}"]`);
    if (i && !i.value) i.focus();
    return;
  }
  if (t.closest("#wzDebt")) {
    wizRead();
    w.debts.push({
      n: "",
      r: "",
      o: "",
    });
    wizRender();
    const i = document.querySelector(`[data-wzdn="${w.debts.length - 1}"]`);
    if (i) i.focus();
    return;
  }
  const wdd = t.closest("[data-wzddel]");
  if (wdd) {
    wizRead();
    w.debts.splice(Number(wdd.dataset.wzddel), 1);
    wizRender();
    return;
  }
  if (t.closest("#wzOwn")) {
    wizRead();
    w.own.push({
      n: "",
      a: "",
    });
    wizRender();
    const i = document.querySelector(`[data-wzownn="${w.own.length - 1}"]`);
    if (i) i.focus();
    return;
  }
  if (t.closest("#wzBack")) {
    wizBackOne();
    return;
  }
  if (t.closest("#wzSkipAll")) {
    try {
      localStorage.setItem("hb-wiz-skip", "1");
    } catch (_) {}
    wizClose();
    toast("Die Einrichtung findest du unter Einstellungen › Startseite");
    return;
  }
  if (t.closest("#wzNext")) {
    wizRead();
    if (w.step === 1 && !w.work) {
      toast("Bitte eine Möglichkeit wählen");
      return;
    }
    if (w.step === 1 && !w.exAsk) {
      wizNav(() => {
        w.exAsk = true;
      }, 1);
      return;
    }
    if (w.step === 2 && w.bal !== "" && !isFinite(parseAmt(w.bal))) {
      toast("Bitte eine Zahl eingeben");
      return;
    }
    if (w.step === 3 && !w.bank) {
      toast("Bitte deine Bank auswählen");
      return;
    }
    if (w.step === 3 && w.bank === "andere" && !(w.bankName || "").trim()) {
      toast("Bitte den Namen deiner Bank eintragen");
      return;
    }
    if (w.step < 6) {
      wizNav(() => {
        w.step++;
      }, 1);
    } else await wizFinish();
  }
});
document.addEventListener("keydown", (e) => {
  if (
    ui.wiz &&
    e.key === "Enter" &&
    e.target.closest &&
    e.target.closest("#wizBg") &&
    e.target.tagName === "INPUT" &&
    ui.wiz.step !== 4 &&
    ui.wiz.step !== 5 &&
    ui.wiz.step !== 6
  ) {
    e.preventDefault();
    $("wzNext").click();
  }
});

/* Sicherheit des Abgleichs */

document.addEventListener("change", async (e) => {
  if (e.target.id !== "srvAlt") return;
  const raw = e.target.value.trim(),
    u = raw ? normServer(raw) : "";
  if (raw && !u) {
    toast("Das ist keine gültige Adresse");
    return;
  }
  try {
    if (u) localStorage.setItem(SERVER_ALT_KEY, u);
    else localStorage.removeItem(SERVER_ALT_KEY);
  } catch (_) {}
  if (!u) {
    VIA_ALT = false;
    toast("Adresse für unterwegs entfernt");
    renderSyncSec();
    return;
  }
  try {
    const r = await request(apiUrl(u, "status"));
    toast(
      r.status === 200
        ? "Adresse für unterwegs gespeichert – erreichbar ✓"
        : "Gespeichert, aber der Server antwortet dort gerade nicht"
    );
  } catch (_) {
    toast("Gespeichert – gerade nicht erreichbar (läuft Tailscale auf diesem Gerät?)");
  }
  renderSyncSec();
});
function hostSafe(u) {
  if (!u || !/^http:\/\//i.test(u)) return true;
  const h = (u.match(/^http:\/\/([^/:]+)/i) || [])[1] || "";
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|localhost$)|\.local$|\.fritz\.box$|\.ts\.net$/i.test(
    h
  );
}
function serverInsecure() {
  return !hostSafe(SERVER) || !hostSafe(serverAlt());
}
function renderSyncSec() {
  const el = $("syncSec");
  if (!el) return;
  if (el.contains(document.activeElement) && typingNow()) return;
  if (!SYNC.token) {
    el.innerHTML = "";
    return;
  }
  if (MODE === "pair") {
    el.innerHTML = "";
    return;
  }
  const cloud = MODE === "cloud";
  el.innerHTML = `${cloud && SYNC.email ? `<div class="acct"><svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5a7 7 0 0 1 14 0"/></svg><span class="acn"><span class="small muted">Angemeldet als</span><b>${escHtml(SYNC.email)}</b></span></div>` : ""}${NATIVE && !cloud ? `<div class="field"><label for="srvAlt">Adresse für unterwegs (z. B. Tailscale)</label><input class="in" id="srvAlt" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="z. B. 100.101.102.103" value="${escHtml(serverAlt())}"><span class="small muted">${serverAlt() ? (VIA_ALT ? "Gerade verbunden über die Adresse für unterwegs." : "Gerade verbunden über das Heimnetz.") : "Zu Hause nutzt die App die normale Adresse. Ist sie nicht erreichbar, nimmt sie diese hier."}</span></div>` : ""}
    ${serverInsecure() ? `<div class="notice bad"><span>Die Verbindung zum Server ist <b>unverschlüsselt</b> (http) und geht übers Internet. Bitte eine Adresse mit https verwenden.</span></div>` : NET_LAST === "plain" && isLanHttp(SERVER) ? `<div class="notice bad"><span>Zu Hause läuft der Abgleich gerade unverschlüsselt (http), weil der Server über https nicht erreichbar war. Prüf auf dem Server, ob das Zertifikat für deine Internet-Adresse gilt und Web Station über https erreichbar ist.</span></div>` : ""}${NET_LAST && !serverInsecure() && !(NET_LAST === "plain" && isLanHttp(SERVER)) ? `<div class="notice ok" style="margin-bottom:12px"><span>${svgIcon("shield", 15)} ${NET_LAST === "lan-https" ? "Verschlüsselt verbunden (https, im WLAN zu Hause)." : "Verschlüsselt verbunden (https)."}</span></div>` : ""}
    ${
      ui.pwForm
        ? `<div class="pwform"><div class="field"><label for="pwOld">Bisheriges Passwort</label><input class="in" type="password" id="pwOld" autocomplete="current-password"></div>
      <div class="field"><label for="pwNew">Neues Passwort (mind. 10 Zeichen)</label><input class="in" type="password" id="pwNew" autocomplete="new-password"></div>
      <div class="field"><label for="pwNew2">Neues Passwort wiederholen</label><input class="in" type="password" id="pwNew2" autocomplete="new-password"></div>
      <span class="small muted" id="pwErr" role="alert"></span>
      <div class="bkb"><button class="btn primary" id="pwSave">Passwort ändern</button><button class="btn" id="pwCancel">Abbrechen</button></div></div>`
        : `<div class="bkb"><button class="btn" id="pwOpen">Passwort ändern</button><button class="btn" id="logoutAll">Alle Geräte abmelden</button></div>
      <span class="small muted">Handy verloren? „Alle Geräte abmelden“ – danach muss sich jedes Gerät neu mit dem Passwort anmelden.</span>`
    }
    <div class="tfa" id="tfaBox">${tfaHtml()}</div>
    ${
      cloud
        ? ui.delForm
          ? `<div class="pwform"><div class="notice bad"><span><b>Konto endgültig löschen?</b> Alle Daten auf dem Server werden sofort gelöscht und lassen sich nicht wiederherstellen. Auf diesem Gerät bleibt alles erhalten.</span></div>
      <div class="field"><label for="delPw">Passwort zur Bestätigung</label><input class="in" type="password" id="delPw" autocomplete="current-password"></div><span class="small" id="delErr" style="color:var(--bad)"></span>
      <div class="bkb"><button class="btn danger" id="delGo">Konto löschen</button><button class="btn" id="delCancel">Abbrechen</button></div></div>`
          : `<div class="bkb"><button class="btn danger" id="delOpen">Konto löschen</button></div>`
        : ""
    }`;
  if (ui.tfa === undefined) {
    ui.tfa = null;
    api("twofa")
      .then((r) => {
        ui.tfa = r;
        const b = $("tfaBox");
        if (b) b.innerHTML = tfaHtml();
      })
      .catch((x) => {
        ui.tfa =
          x.status === 404
            ? {
                old: true,
              }
            : null;
        const b = $("tfaBox");
        if (b) b.innerHTML = tfaHtml();
      });
  }
}
function tfaHtml() {
  const t = ui.tfa,
    st = ui.tfaStep || "";
  const head = `<div class="bkh"><span class="bki"><svg class="i" viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 18h4M9.5 10.5l2 2 3.5-4"/></svg></span><span class="n"><b>Zwei-Faktor-Anmeldung</b><span>${!t ? "wird geprüft …" : t.old ? "braucht eine neuere Server-Version" : t.on ? `an · ${t.recovery} Wiederherstellungscodes übrig` : "aus"}</span></span></div>`;
  if (!t || t.old) return head;
  if (st === "pw")
    return (
      head +
      `<span class="small muted">Beim Anmelden eines Geräts brauchst du dann zusätzlich einen 6-stelligen Code aus einer App wie Google Authenticator oder Microsoft Authenticator.</span>
    <div class="field"><label for="tfaPw">Dein Passwort für den Abgleich</label><input class="in" type="password" id="tfaPw" autocomplete="current-password"></div><span class="small" id="tfaErr" style="color:var(--bad)"></span>
    <div class="bkb"><button class="btn primary" id="tfaGo">Weiter</button><button class="btn" id="tfaCancel">Abbrechen</button></div>`
    );
  if (st === "scan")
    return (
      head +
      `<span class="small">1. Öffne deine Authenticator-App und scanne diesen Code${IS_DESK ? " mit dem Handy" : ""}:</span>
    <div class="tfaqr">${qrSvg(ui.tfaUri, 200)}</div>
    ${!IS_DESK && NATIVE ? `<a class="btn" href="${escHtml(ui.tfaUri)}">Direkt in der Authenticator-App öffnen</a>` : ""}
    <span class="small muted">Oder den Schlüssel von Hand eintragen: <b class="tfakey">${escHtml(ui.tfaSecret.replace(/(.{4})/g, "$1 ").trim())}</b></span>
    <div class="field"><label for="tfaCode">2. Den 6-stelligen Code aus der App eingeben</label><input class="in" id="tfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" style="letter-spacing:.2em;text-align:center"></div><span class="small" id="tfaErr" style="color:var(--bad)"></span>
    <div class="bkb"><button class="btn primary" id="tfaOn">Einschalten</button><button class="btn" id="tfaCancel">Abbrechen</button></div>`
    );
  if (st === "codes")
    return (
      head +
      `<div class="notice warn"><span><b>Wiederherstellungscodes aufschreiben!</b> Falls dein Handy mit der Authenticator-App verloren geht, meldest du dich mit einem dieser Codes an. Jeder gilt nur einmal. Sie werden nur jetzt angezeigt.</span></div>
    <div class="tfacodes">${(ui.tfaCodes || []).map((c) => `<span>${escHtml(c)}</span>`).join("")}</div>
    <div class="bkb"><button class="btn" id="tfaCopy">Kopieren</button><button class="btn primary" id="tfaDone">Aufgeschrieben</button></div>`
    );
  if (st === "off")
    return (
      head +
      `<div class="field"><label for="tfaPw">Passwort</label><input class="in" type="password" id="tfaPw" autocomplete="current-password"></div>
    <div class="field"><label for="tfaCode">Code aus der App</label><input class="in" id="tfaCode" inputmode="numeric" autocomplete="one-time-code" placeholder="6 Ziffern oder Wiederherstellungscode"></div><span class="small" id="tfaErr" style="color:var(--bad)"></span>
    <div class="bkb"><button class="btn danger" id="tfaOffGo">Ausschalten</button><button class="btn" id="tfaCancel">Abbrechen</button></div>`
    );
  return (
    head +
    (t.on
      ? `<div class="bkb"><button class="btn" id="tfaOffBtn">Ausschalten</button></div>`
      : `<span class="small muted">Schützt den Abgleich zusätzlich: Selbst mit deinem Passwort kommt niemand ohne dein Handy an deine Daten.</span><div class="bkb"><button class="btn primary" id="tfaStart">Einrichten</button></div>`)
  );
}
function tfaRender() {
  const b = $("tfaBox");
  if (b) b.innerHTML = tfaHtml();
}
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (!t.closest("#tfaBox")) return;
  const err = (m) => {
    const x = $("tfaErr");
    if (x) x.textContent = m;
  };
  if (t.closest("#tfaStart")) {
    ui.tfaStep = "pw";
    tfaRender();
    setTimeout(() => $("tfaPw") && $("tfaPw").focus(), 30);
    return;
  }
  if (t.closest("#tfaOffBtn")) {
    ui.tfaStep = "off";
    tfaRender();
    return;
  }
  if (t.closest("#tfaCancel")) {
    ui.tfaStep = "";
    tfaRender();
    return;
  }
  if (t.closest("#tfaGo")) {
    try {
      const r = await api("twofaStart", {
        body: {
          password: $("tfaPw").value,
        },
      });
      ui.tfaSecret = r.secret;
      ui.tfaUri = r.uri;
      ui.tfaStep = "scan";
      tfaRender();
    } catch (x) {
      err(x.message || "Hat nicht geklappt");
    }
    return;
  }
  if (t.closest("#tfaOn")) {
    try {
      const r = await api("twofaEnable", {
        body: {
          code: $("tfaCode").value.trim(),
        },
      });
      ui.tfaCodes = r.recovery;
      ui.tfa = {
        on: true,
        recovery: r.recovery.length,
      };
      ui.tfaStep = "codes";
      ui.tfaSecret = ui.tfaUri = null;
      tfaRender();
    } catch (x) {
      err(x.message || "Hat nicht geklappt");
    }
    return;
  }
  if (t.closest("#tfaCopy")) {
    try {
      await copySecret((ui.tfaCodes || []).join("\n"));
      toast("Kopiert – nach einer Minute wird es aus der Zwischenablage gelöscht");
    } catch (_) {
      toast("Kopieren ging nicht – bitte abschreiben");
    }
    return;
  }
  if (t.closest("#tfaDone")) {
    ui.tfaCodes = null;
    ui.tfaStep = "";
    tfaRender();
    toast("Zwei-Faktor-Anmeldung ist an");
    return;
  }
  if (t.closest("#tfaOffGo")) {
    try {
      await api("twofaDisable", {
        body: {
          password: $("tfaPw").value,
          code: $("tfaCode").value.trim(),
        },
      });
      ui.tfa = {
        on: false,
        recovery: 0,
      };
      ui.tfaStep = "";
      tfaRender();
      toast("Zwei-Faktor-Anmeldung ist aus");
    } catch (x) {
      err(x.message || "Hat nicht geklappt");
    }
  }
});
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("#delOpen")) {
    ui.delForm = true;
    renderSyncSec();
    setTimeout(() => $("delPw") && $("delPw").focus(), 30);
    return;
  }
  if (t.closest("#delCancel")) {
    ui.delForm = false;
    renderSyncSec();
    return;
  }
  if (t.closest("#delGo")) {
    try {
      await api("deleteAccount", {
        body: {
          password: $("delPw").value,
        },
      });
      ui.delForm = false;
      SYNC.token = "";
      SYNC.queue = [];
      SYNC.rq = [];
      SYNC.state = "off";
      SYNC.email = "";
      saveSync();
      renderSyncInfo();
      renderSyncDot();
      toast("Konto gelöscht – deine Daten sind nur noch auf diesem Gerät");
    } catch (x) {
      const e2 = $("delErr");
      if (e2) e2.textContent = x.message || "Hat nicht geklappt";
    }
    return;
  }
  if (t.closest("#pwOpen")) {
    ui.pwForm = true;
    renderSyncSec();
    setTimeout(() => $("pwOld") && $("pwOld").focus(), 30);
    return;
  }
  if (t.closest("#pwCancel")) {
    ui.pwForm = false;
    renderSyncSec();
    return;
  }
  if (t.closest("#pwSave")) {
    const o = $("pwOld").value,
      n = $("pwNew").value,
      n2 = $("pwNew2").value,
      err = $("pwErr");
    if (n.length < 10) {
      err.textContent = "Das neue Passwort braucht mindestens 10 Zeichen.";
      return;
    }
    if (n !== n2) {
      err.textContent = "Die beiden neuen Passwörter sind nicht gleich.";
      return;
    }
    try {
      const r = await api("password", {
        body: {
          old: o,
          new: n,
        },
      });
      SYNC.token = r.token;
      saveSync();
      ui.pwForm = false;
      renderSyncSec();
      toast("Passwort geändert – andere Geräte müssen sich neu anmelden");
    } catch (x) {
      err.textContent =
        x.status === 404 ? "Dafür braucht der Server eine neuere Version." : x.message || "Hat nicht geklappt";
    }
    return;
  }
  if (t.closest("#logoutAll")) {
    if (!ui.logoutAllAsk) {
      ui.logoutAllAsk = true;
      t.closest("#logoutAll").textContent = "Wirklich? Nochmal tippen";
      setTimeout(() => {
        ui.logoutAllAsk = false;
        renderSyncSec();
      }, 4000);
      return;
    }
    ui.logoutAllAsk = false;
    try {
      await api("logoutAll", {
        body: {},
      });
      toast("Alle Geräte abgemeldet – bitte hier neu anmelden");
      SYNC.token = null;
      saveSync();
      renderSyncInfo();
      showLogin();
    } catch (x) {
      toast(x.status === 404 ? "Dafür braucht der Server eine neuere Version" : "Hat nicht geklappt");
    }
  }
});

/* QR klein */
function qrMatrix(text) {
  const data = [...new TextEncoder().encode(text)];
  const ECC = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
    BLK = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  const raw = (v) => {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const n = Math.floor(v / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (v >= 7) r -= 36;
    }
    return Math.floor(r / 8);
  };
  let ver = 0;
  for (let v = 1; v <= 10; v++) {
    const cap = raw(v) - ECC[v - 1] * BLK[v - 1];
    if (4 + (v < 10 ? 8 : 16) + data.length * 8 <= cap * 8) {
      ver = v;
      break;
    }
  }
  if (!ver) throw new Error("Text zu lang für den QR-Code");
  const size = ver * 4 + 17,
    M = Array.from(
      {
        length: size,
      },
      () => Array(size).fill(false)
    ),
    F = Array.from(
      {
        length: size,
      },
      () => Array(size).fill(false)
    );
  const set = (x, y, d) => {
    M[y][x] = d;
    F[y][x] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ])
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx,
          y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          set(x, y, d !== 2 && d !== 4);
        }
      }
  const AL = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]][
    ver - 1
  ];
  AL.forEach((a, i) =>
    AL.forEach((b, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === AL.length - 1) || (i === AL.length - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    })
  );
  const fmt = (mask) => {
    const d = (0 << 3) | mask;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412,
      g = (i) => ((b >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, g(i));
    set(8, 7, g(6));
    set(8, 8, g(7));
    set(7, 8, g(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, g(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, g(i));
    set(8, size - 8, true);
  };
  fmt(0);
  if (ver >= 7) {
    let r = ver;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (ver << 12) | r;
    for (let i = 0; i < 18; i++) {
      const bit = ((b >>> i) & 1) !== 0,
        a = size - 11 + (i % 3),
        c = Math.floor(i / 3);
      set(a, c, bit);
      set(c, a, bit);
    }
  }
  const bits = [],
    push = (v, n) => {
      for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
    };
  push(4, 4);
  push(data.length, ver < 10 ? 8 : 16);
  data.forEach((b) => push(b, 8));
  const rawCw = raw(ver),
    ecc = ECC[ver - 1],
    nb = BLK[ver - 1],
    dataCw = rawCw - ecc * nb;
  push(0, Math.min(4, dataCw * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const cw = [];
  for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let p = 0xec; cw.length < dataCw; p ^= 0xec ^ 0x11) cw.push(p);
  const mul = (x, y) => {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  };
  const div = Array(ecc).fill(0);
  div[ecc - 1] = 1;
  let root = 1;
  for (let i = 0; i < ecc; i++) {
    for (let j = 0; j < ecc; j++) {
      div[j] = mul(div[j], root);
      if (j + 1 < ecc) div[j] ^= div[j + 1];
    }
    root = mul(root, 2);
  }
  const rem = (d) => {
    const r = Array(ecc).fill(0);
    for (const b of d) {
      const f = b ^ r.shift();
      r.push(0);
      for (let i = 0; i < ecc; i++) r[i] ^= mul(div[i], f);
    }
    return r;
  };
  const nShort = nb - (rawCw % nb),
    shortLen = Math.floor(rawCw / nb),
    blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const len = shortLen - ecc + (i < nShort ? 0 : 1),
      d = cw.slice(k, k + len);
    k += len;
    const e = rem(d);
    if (i < nShort) d.push(0);
    blocks.push(d.concat(e));
  }
  const out = [];
  for (let i = 0; i < blocks[0].length; i++)
    blocks.forEach((b, j) => {
      if (i !== shortLen - ecc || j >= nShort) out.push(b[i]);
    });
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++)
      for (let j = 0; j < 2; j++) {
        const x = right - j,
          up = ((right + 1) & 2) === 0,
          y = up ? size - 1 - v : v;
        if (!F[y][x] && i < out.length * 8) {
          M[y][x] = ((out[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
  }
  const MASK = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x, y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const apply = (m) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && MASK[m](x, y)) M[y][x] = !M[y][x];
  };
  const penalty = () => {
    let p = 0,
      dark = 0;
    for (let a = 0; a < 2; a++)
      for (let y = 0; y < size; y++) {
        let run = 1;
        for (let x = 1; x <= size; x++) {
          const c = x < size && (a ? M[x][y] : M[y][x]) === (a ? M[x - 1][y] : M[y][x - 1]);
          if (c) run++;
          else {
            if (run >= 5) p += run - 2;
            run = 1;
          }
        }
      }
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) {
        const c = M[y][x];
        if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3;
      }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (M[y][x]) dark++;
    return p + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  };
  let best = 0,
    bp = Infinity;
  for (let m = 0; m < 8; m++) {
    apply(m);
    fmt(m);
    const p = penalty();
    if (p < bp) {
      bp = p;
      best = m;
    }
    apply(m);
  }
  apply(best);
  fmt(best);
  return M;
}
function qrSvg(text, px) {
  const M = qrMatrix(text),
    n = M.length,
    q = 4;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (M[y][x]) d += `M${x + q},${y + q}h1v1h-1z`;
  return `<svg class="qr" viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" width="${px || 200}" height="${px || 200}" shape-rendering="crispEdges" role="img" aria-label="QR-Code"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
const SP_PAGES = {
  konten: ["Konten & Spaces", "wallet"],
  budgets: ["Monatsbudgets", "target"],
  schulden: ["Kredite & Schulden", "bank"],
  backup: ["Backup", "save"],
  profil: ["Profil", "user"],
  sync: ["Abgleich & Updates", "cloud"],
  notify: ["Benachrichtigungen", "bell"],
  steuer: ["Steuer & Einkommen", "receipt"],
  start: ["Startseite", "home"],
  toene: ["Töne", "sound"],
  laeden: ["Deine Läden", "cart"],
  sicherheit: ["Sicherheit", "shield"],
  kategorien: ["Kategorien", "tag"],
  farben: ["Farben", "palette"],
  recht: ["Rechtliches", "doc"],
  abos: ["Abos & Verträge", "repeat"],
  invest: ["Sparen & Anlegen", "piggy"],
  export: ["Export", "arrowDown"],
  sprache: ["Sprache & Währung", "book"],
  neu: ["Was ist neu", "spark"],
  hilfe: ["Hilfe", "insight"],
  feedback: ["Feedback", "heart"],
  speicher: ["Belege & Speicher", "camera"],
  geraete: ["Geräte", "phone"],
  get amt() {
    return [(GPROF[store.settings && store.settings.work] || {}).tile || "Leistung & Amt", "cash"];
  },
};
function spSummary(k) {
  const st = store.settings,
    y = ui.ym.slice(0, 4);
  if (k === "konten") {
    const n = (st.spaces || []).length;
    return n ? `${n} Spaces` : "Stand";
  }
  if (k === "budgets") {
    const n = Object.values(st.budgets || {}).filter((v) => +v > 0).length;
    return n ? `${n} aktiv` : "keine";
  }
  if (k === "schulden") {
    return store.debts.length ? fmtEur0(sum(store.debts, (d) => debtState(d).remaining)) : "keine";
  }
  if (k === "backup") {
    return "Datei";
  }
  if (k === "sync") {
    const a = !SYNCABLE ? "" : !SYNC.token ? "Abgleich aus" : SYNC.state === "ok" ? "abgeglichen" : "wartet";
    const u = updKey() ? "Updates an" : "Updates aus";
    return [a, u].filter(Boolean).join(" · ");
  }
  if (k === "profil") {
    return (st.name ? st.name : "Name") + (st.photo ? " · mit Foto" : " & Foto");
  }
  if (k === "steuer") {
    const L = (LAENDER.find((x) => x[0] === (st.land || "NW")) || [, ""])[1];
    return [
      (WORK.find((x) => x[0] === (st.work || "beides")) || [, "Job + selbstständig"])[1],
      `Klasse ${["I", "II", "III", "IV", "V", "VI"][(st.steuerklasse || 1) - 1]}`,
      L,
      ...(st.reserveRate && hasSelf() ? [`${numStr(st.reserveRate)} % Rücklage`] : []),
    ]
      .map((x) => I18N.tr(x))
      .join(" · ");
  }
  if (k === "start") {
    return "Blöcke sortieren";
  }
  if (k === "toene") {
    return SND.on() ? SND_ST.find((x) => x[0] === SND.style())[1] + (SND.vol() < 1 ? " · leise" : "") : "aus";
  }
  if (k === "laeden") {
    const n = (st.shops || []).length;
    return n ? `${n} ausgewählt` : "keine";
  }
  if (k === "sicherheit") {
    return lockCfg() ? "App-Sperre an" : "App-Sperre aus";
  }
  if (k === "amt") {
    const j = st.jl || {},
      P = GPROF[st.work];
    return (
      (P ? P.amt : "Leistung") +
      (j.amount ? " · " + fmtEur0(j.amount) : "") +
      (P && P.side === "beihilfe" && (j.beihilfe || []).some((x) => !x.done)
        ? ` · ${(j.beihilfe || []).filter((x) => !x.done).length} Beihilfe offen`
        : "")
    );
  }
  if (k === "farben") {
    const c = st.colors || {},
      n = Object.values(c).reduce((a, o) => a + Object.keys(o || {}).length, 0);
    return n ? `${n} eigene` : "Standard";
  }
  if (k === "notify") {
    const c = notifyCfg();
    return !CAN_NOTIFY ? "nur in der App" : c.on && notifyPerm() === "granted" ? "an" : "aus";
  }
  if (k === "kategorien") {
    return `${cats("ausgabe").length + cats("betrieb").length + incCats().length} Kategorien`;
  }
  return "";
}

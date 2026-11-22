/* Kategorien */
function cats(kind) {
  const c = store.settings.cats || DEFAULT_SETTINGS.cats;
  return c[kind] || [];
}
const INC_ARTS = [
  [
    "Arbeit",
    [
      ["selbst", "Selbstständigkeit"],
      ["lohn", "Gehalt / Lohn (angestellt)"],
      ["sonderzahlung", "13. Gehalt, Urlaubsgeld, Bonus"],
      ["minijob", "Minijob"],
    ],
  ],
  [
    "Vom Staat",
    [
      ["lohnersatz", "Arbeitslosengeld (ALG 1)"],
      ["buergergeld", "Bürgergeld"],
      ["kindergeld", "Kindergeld"],
      ["elterngeld", "Elterngeld"],
      ["rente", "Rente / Pension"],
      ["wohngeld", "Wohngeld"],
      ["bafoeg", "BAföG"],
    ],
  ],
  [
    "Vermögen",
    [
      ["kapital", "Zinsen & Dividenden"],
      ["miete", "Mieteinnahmen"],
    ],
  ],
  [
    "Sonstiges",
    [
      ["unterhalt", "Unterhalt"],
      ["erstattung", "Erstattung / Rückzahlung"],
      ["verkauf", "Verkauf (z. B. Kleinanzeigen)"],
      ["geschenk", "Geschenk"],
      ["sonstige", "Sonstige"],
    ],
  ],
];
const ART_INFO = {
  selbst: ["case", "Eigene Rechnungen – Steuer, Rücklage & EÜR"],
  lohn: ["wallet", "Angestellt mit Lohnsteuer"],
  sonderzahlung: ["gift", "Urlaubs-/Weihnachtsgeld, Bonus – mit Lohnsteuer"],
  minijob: ["cash", "bis 603 € im Monat steuerfrei"],
  lohnersatz: ["list", "Arbeitslosen-/Krankengeld – steuerfrei, zählt aber beim Steuersatz mit"],
  buergergeld: ["bank", "Grundsicherung – steuerfrei"],
  kindergeld: ["heart", "steuerfrei"],
  elterngeld: ["heart", "steuerfrei, zählt beim Steuersatz mit"],
  rente: ["spark", "teilweise steuerpflichtig"],
  wohngeld: ["home", "steuerfrei"],
  bafoeg: ["book", "steuerfrei"],
  kapital: ["chart", "Abgeltungsteuer, Sparerpauschbetrag 1.000 €"],
  miete: ["home", "steuerpflichtig (Anlage V)"],
  unterhalt: ["heart", "meist steuerfrei für dich"],
  erstattung: ["repeat", "zählt nicht als Einkommen"],
  verkauf: ["tag", "privat meist steuerfrei"],
  geschenk: ["gift", "steuerfrei"],
  sonstige: ["dots", "wird nicht besteuert gerechnet"],
};
function artLabel(v) {
  for (const [, os] of INC_ARTS) for (const [k, l] of os) if (k === v) return l;
  return "Sonstige";
}
function artOpen(name) {
  const c = incCats().find((x) => x.name === name),
    sel = c ? c.art : "sonstige";
  const hide = (v) =>
    v !== sel && ((v === "selbst" && !hasSelf()) || ((v === "lohn" || v === "sonderzahlung") && !hasJob()));
  $("artTitle").textContent = `Art von „${name}“`;
  $("artList").innerHTML = INC_ARTS.map(([g, os]) => {
    const list = os.filter(([v]) => !hide(v));
    if (!list.length) return "";
    return `<div class="sgl">${g}</div>${list
      .map(([v, l]) => {
        const [i, d] = ART_INFO[v] || ["dots", ""];
        return `<button class="artrow ${v === sel ? "on" : ""}" data-artset="${v}" data-artname="${escHtml(name)}"><span class="ari">${svgIcon(i in ICON_PATHS ? i : "dots", 18)}</span><span class="art"><b>${escHtml(l)}</b><small>${escHtml(d)}</small></span><span class="arr"></span></button>`;
      })
      .join("")}`;
  }).join("");
  const bg = $("artBg");
  bg.querySelector(".sheet").scrollTop = 0;
  bg.hidden = false;
  requestAnimationFrame(() => bg.classList.add("show"));
}
function artClose() {
  const bg = $("artBg");
  bg.classList.remove("show");
  setTimeout(() => {
    bg.hidden = true;
  }, 200);
}
document.addEventListener("click", (e) => {
  const o = e.target.closest("[data-artpick]");
  if (o) {
    artOpen(o.dataset.artpick);
    return;
  }
  if (e.target === $("artBg") || e.target.closest("[data-artclose]")) {
    artClose();
    return;
  }
  const s = e.target.closest("[data-artset]");
  if (!s) return;
  const name = s.dataset.artname,
    v = s.dataset.artset,
    c = clone(store.settings.cats || DEFAULT_SETTINGS.cats);
  c.einnahme = c.einnahme.map((x) => {
    const o2 =
      typeof x === "string"
        ? {
            name: x,
            art: "sonstige",
          }
        : x;
    return o2.name === name
      ? {
          ...o2,
          art: v,
        }
      : o2;
  });
  store.settings.cats = c;
  saveSettings();
  render();
  artClose();
  toast(`${name}: ${artLabel(v)}`);
});
const YV = {
  2025: {
    ml: 12.82,
    mj: 556,
  },
  2026: {
    ml: 13.9,
    mj: 603,
  },
  2027: {
    ml: 14.6,
    mj: 633,
  },
};
function yearLimits(y) {
  y = Number(y) || new Date().getFullYear();
  const ks = Object.keys(YV)
    .map(Number)
    .sort((a, b) => a - b);
  let k = ks[0];
  for (const x of ks) if (x <= y) k = x;
  return {
    ...YV[k],
    y: k,
  };
}
const MJ_NOW = yearLimits().mj;
const fmt2 = (v) =>
  Number(v).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const mindPer = () => {
  const m = store.settings.mindest || {};
  return (Array.isArray(m.p) ? m.p : [])
    .filter((x) => /^\d{4}-\d{2}$/.test(x.ym || ""))
    .slice()
    .sort((a, b) => a.ym.localeCompare(b.ym));
};
function mindH(ym) {
  const m = store.settings.mindest || {};
  if (!m.on) return 0;
  const p = mindPer();
  if (!p.length) return Number(m.h) || 0;
  let h = 0;
  for (const x of p) if (x.ym <= ym) h = Number(x.h) || 0;
  return h;
}
function mindestYm(ym) {
  const h = mindH(ym);
  return h > 0 ? round2((yearLimits(ym.slice(0, 4)).ml * h * 13) / 3) : 0;
}
function mindestMonat(y) {
  const m = store.settings.mindest;
  if (!m || !m.on) return 0;
  if (mindPer().length) {
    const cur = ymOf(new Date());
    return mindestYm(String(y) === cur.slice(0, 4) ? cur : y + "-12");
  }
  if (!(Number(m.h) > 0)) return 0;
  return round2((yearLimits(y).ml * Number(m.h) * 13) / 3);
}
const mindYear = (y) =>
  mindPer().length
    ? round2(
        Array.from(
          {
            length: 12,
          },
          (_, i) => mindestYm(y + "-" + pad(i + 1))
        ).reduce((a, b) => a + b, 0)
      )
    : 0;
const WORK = [
  ["angestellt", "Angestellt", "Voll- oder Teilzeit, Gehalt mit Lohnsteuer", "job"],
  ["beamte", "Beamte", "Besoldung mit Lohnsteuer, keine Sozialabgaben", "job"],
  ["minijob", "Minijob / Midijob", `bis ${MJ_NOW} € im Monat bzw. Übergangsbereich`, "job"],
  ["selbst", "Selbstständig", "Eigene Rechnungen, kein Job daneben", "job"],
  ["beides", "Angestellt und selbstständig", "Job plus Selbstständigkeit nebenbei", "job"],
  ["azubi", "Ausbildung", "Ausbildungsgehalt, evtl. Berufsausbildungsbeihilfe", "edu"],
  ["studium", "Studium", "BAföG, Nebenjob, Unterstützung der Eltern", "edu"],
  ["schule", "Schule", "Schüler-BAföG, Taschengeld, Ferienjob", "edu"],
  ["alg", "Arbeitslosengeld (ALG I)", "Arbeit suchen, Geld von der Agentur für Arbeit", "staat"],
  ["grusi", "Grundsicherung (Bürgergeld)", "Geld vom Jobcenter", "staat"],
  ["eltern", "Elternzeit", "Elterngeld, Kindergeld", "staat"],
  ["krank", "Krank / Erwerbsminderung", "Krankengeld oder Erwerbsminderungsrente", "staat"],
  ["rente", "Rente / Pension", "Altersrente, Pension, Betriebsrente", "rente"],
];
const WGROUPS = [
  ["job", "Ich arbeite", "case"],
  ["edu", "Ausbildung, Studium, Schule", "book"],
  ["staat", "Geld vom Staat", "bank"],
  ["rente", "Rente / Pension", "heart"],
];
const EXTRA = [
  ["minijob", "Minijob / Nebenjob", `z. B. bis ${MJ_NOW} € im Monat`, "cash"],
  ["selbst", "Selbstständig nebenbei", "eigene Rechnungen", "case"],
  ["angestellt", "Angestellt nebenbei", "Teilzeit mit Lohnsteuer", "wallet"],
  ["kinder", "Kinder", "Kindergeld, Kita, Taschengeld", "heart"],
  ["partner", "Partner / WG", "gemeinsame Kosten und Einkaufsliste", "user"],
];
const extraFor = (w) =>
  EXTRA.filter(([k]) => !(k === w || (k === "selbst" && w === "beides") || (k === "angestellt" && w === "beides")));
const hasExtra = (k) => (store.settings.extra || []).includes(k);
function extraPicker(main, sel, attr) {
  const ex = extraFor(main),
    none = !sel.length;
  return `<div class="wopts">${ex.map(([k, t, d, i]) => `<button class="wopt wck ${sel.includes(k) ? "on" : ""}" data-${attr}="${k}"><span class="wci">${svgIcon(i, 18)}</span><span class="wct"><b>${t}</b><small>${d}</small></span><span class="wbox">${sel.includes(k) ? "✓" : ""}</span></button>`).join("")}
    <button class="wopt wck ${none ? "on" : ""}" data-${attr}=""><span class="wci">${svgIcon("check", 18)}</span><span class="wct"><b>Nein, nichts dazu</b></span><span class="wbox">${none ? "✓" : ""}</span></button></div>`;
}
const workGroup = (w) => (WORK.find((x) => x[0] === w) || [])[3] || "";
const WORK_INC = {
  angestellt: ["Gehalt", "lohn"],
  beamte: ["Besoldung", "lohn"],
  minijob: ["Minijob", "minijob"],
  azubi: ["Ausbildungsgehalt", "lohn"],
  studium: ["BAföG", "bafoeg"],
  schule: ["Schüler-BAföG", "bafoeg"],
  alg: ["Arbeitslosengeld", "lohnersatz"],
  grusi: ["Grundsicherung", "buergergeld"],
  eltern: ["Elterngeld", "elterngeld"],
  krank: ["Krankengeld", "lohnersatz"],
  rente: ["Rente", "rente"],
};
function workPicker(sel, grp, attr) {
  if (!grp)
    return `<div class="wgrid">${WGROUPS.map(([g, t, i]) => `<button class="wgt ${workGroup(sel) === g ? "on" : ""}" data-${attr}grp="${g}"><span>${svgIcon(i in ICON_PATHS ? i : "dots", 22)}</span><b>${t}</b></button>`).join("")}</div>`;
  return `${attr === "wzwork" ? "" : `<button class="link small wback" data-${attr}grp="">‹ ${escHtml((WGROUPS.find((x) => x[0] === grp) || [, ""])[1])} – andere Auswahl</button>`}<div class="wopts">${WORK.filter(
    (x) => x[3] === grp
  )
    .map(
      ([k, t, d]) =>
        `<button class="wopt ${sel === k ? "on" : ""}" data-${attr}="${k}"><b>${t}</b><small>${d}</small></button>`
    )
    .join("")}</div>`;
}
const hasSelf = () => {
  const w = store.settings.work;
  return w === undefined || w === "selbst" || w === "beides" || hasExtra("selbst");
};
const hasJob = () => {
  const w = store.settings.work;
  return (
    w === undefined ||
    ["angestellt", "beamte", "beides", "azubi", "minijob"].includes(w) ||
    hasExtra("angestellt") ||
    hasExtra("minijob")
  );
};
const EXTRA_INC = {
  minijob: ["Minijob", "minijob"],
  selbst: ["Selbstständigkeit", "selbst"],
  angestellt: ["Gehalt", "lohn"],
};
function addExtraInc(st) {
  for (const k of st.extra || []) {
    const e = EXTRA_INC[k];
    if (!e) continue;
    const c = (st.cats = clone(st.cats || DEFAULT_SETTINGS.cats));
    c.einnahme = c.einnahme || [];
    if (
      !c.einnahme.some(
        (x) => (typeof x === "string" ? x : x.name) === e[0] || (typeof x !== "string" && x.art === e[1])
      )
    )
      c.einnahme.push({
        name: e[0],
        art: e[1],
      });
  }
}
async function setExtra(list) {
  store.settings.extra = list;
  addExtraInc(store.settings);
  await saveSettings();
  render();
}
function addProfCats(st, w) {
  const P = GPROF[w];
  if (!P) return;
  const c = (st.cats = clone(st.cats || DEFAULT_SETTINGS.cats));
  c.ausgabe = c.ausgabe || [];
  for (const n of P.cats || []) if (!c.ausgabe.includes(n)) c.ausgabe.push(n);
  c.einnahme = c.einnahme || [];
  for (const [n, a] of P.inc || [])
    if (!c.einnahme.some((x) => (typeof x === "string" ? x : x.name) === n))
      c.einnahme.push({
        name: n,
        art: a,
      });
}
function addWorkInc(st, w) {
  const ic2 = WORK_INC[w];
  if (!ic2) return;
  const c = (st.cats = clone(st.cats || DEFAULT_SETTINGS.cats));
  c.einnahme = c.einnahme || [];
  if (!c.einnahme.some((x) => (typeof x === "string" ? x : x.name) === ic2[0]))
    c.einnahme.unshift({
      name: ic2[0],
      art: ic2[1],
    });
}
async function setWork(w) {
  const prev = store.settings.work;
  store.settings.work = w;
  addProfCats(store.settings, w);
  if (prev !== w && GPROF[w]) {
    const j = (store.settings.jl = store.settings.jl || {});
    j.payDay = GPROF[w].day;
    if (prev !== undefined) j.amount = w === "grusi" ? 563 : 0;
    if (!GPROF[w].pots) delete j.pots;
  }
  if (store.settings.extra)
    store.settings.extra = store.settings.extra.filter((k) => extraFor(w).some((x) => x[0] === k));
  addWorkInc(store.settings, w);
  if (["alg", "grusi"].includes(w)) {
    const j = (store.settings.jl = store.settings.jl || {});
    if (!j.amount && w === "grusi") j.amount = 563;
    if (j.payDay == null) j.payDay = w === "alg" ? 0 : 1;
  }
  await saveSettings();
  render();
}
document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-setworkgrp]");
  if (g) {
    ui.workGrp = g.dataset.setworkgrp;
    render();
    return;
  }
  const he = e.target.closest("[data-homeextra]");
  if (he) {
    const k = he.dataset.homeextra,
      cur = ui.exSel || [];
    ui.exSel = !k ? [] : cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
    render();
    return;
  }
  if (e.target.closest("[data-homeexok]")) {
    ui.askExtra = false;
    setExtra(ui.exSel || []);
    toast("Gespeichert – änderbar unter Steuer & Einkommen");
    return;
  }
  const b = e.target.closest("[data-setwork]");
  if (b) {
    ui.askExtra = true;
    ui.exSel = [];
    setWork(b.dataset.setwork);
    toast("Gespeichert – änderbar unter Steuer & Einkommen");
  }
});
function incCats() {
  return cats("einnahme").map((c) =>
    typeof c === "string"
      ? {
          name: c,
          art: "sonstige",
        }
      : c
  );
}
function incArt(name) {
  const c = incCats().find((c) => c.name === name);
  return c ? c.art : "sonstige";
}
const PALETTE = ["--c1", "--c2", "--c3", "--c4", "--c5", "--c6"];
const GREENS = [
  "#2e9c74",
  "#1a7a5c",
  "#0f766e",
  "#4d7c0f",
  "#15803d",
  "#3f6212",
  "#0e7490",
  "#166534",
  "#65a30d",
  "#047857",
  "#34b285",
  "#14532d",
];
const PACKS = {
  gruen: ["Grün", GREENS],
  bunt: ["Bunt", null],
  ozean: [
    "Ozean",
    [
      "#0e7490",
      "#0369a1",
      "#0891b2",
      "#1d4ed8",
      "#0f766e",
      "#2563eb",
      "#155e75",
      "#0284c7",
      "#1e40af",
      "#0d9488",
      "#3b82f6",
      "#164e63",
    ],
  ],
  sonne: [
    "Sonnenuntergang",
    [
      "#ea580c",
      "#db2777",
      "#d97706",
      "#dc2626",
      "#c2410c",
      "#be185d",
      "#b45309",
      "#e11d48",
      "#9a3412",
      "#f59e0b",
      "#9d174d",
      "#f97316",
    ],
  ],
  beere: [
    "Beere",
    [
      "#7c3aed",
      "#be185d",
      "#a21caf",
      "#6d28d9",
      "#db2777",
      "#86198f",
      "#9333ea",
      "#9d174d",
      "#c026d3",
      "#5b21b6",
      "#e11d48",
      "#701a75",
    ],
  ],
  erde: [
    "Erde",
    [
      "#8a5a3a",
      "#a16207",
      "#65a30d",
      "#78350f",
      "#92400e",
      "#4d7c0f",
      "#b45309",
      "#57534e",
      "#a3622a",
      "#3f6212",
      "#854d0e",
      "#6b4f3a",
    ],
  ],
  wald: [
    "Wald",
    [
      "#14532d",
      "#166534",
      "#3f6212",
      "#365314",
      "#15803d",
      "#064e3b",
      "#4d7c0f",
      "#047857",
      "#52643a",
      "#2f4f2f",
      "#0f5132",
      "#1a7a5c",
    ],
  ],
  nacht: [
    "Nacht",
    [
      "#1e293b",
      "#334155",
      "#4338ca",
      "#312e81",
      "#475569",
      "#3730a3",
      "#0f172a",
      "#6366f1",
      "#1e3a8a",
      "#4f46e5",
      "#374151",
      "#5b21b6",
    ],
  ],
  pastell: [
    "Pastell",
    [
      "#6b9bd1",
      "#d17ba6",
      "#c9a24a",
      "#7fb08f",
      "#9d8bd1",
      "#d1907b",
      "#5fa8a8",
      "#b38fc9",
      "#8fae5f",
      "#d1a07b",
      "#7b9fd1",
      "#c97b8f",
    ],
  ],
  mono: [
    "Grau",
    [
      "#374151",
      "#4b5563",
      "#6b7280",
      "#1f2937",
      "#525252",
      "#404040",
      "#57534e",
      "#44403c",
      "#71717a",
      "#3f3f46",
      "#27272a",
      "#52525b",
    ],
  ],
};
const packCols = () => (PACKS[(store.settings && store.settings.theme) || "gruen"] || PACKS.gruen)[1] || GREENS;
function isGreen() {
  return !(store.settings && store.settings.theme === "bunt");
}
function themeCol(hex, i) {
  if (!isGreen() || !hex || hex[0] !== "#") return hex;
  if (i == null) {
    let h = 0;
    for (const ch of hex) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    i = h;
  }
  const P = packCols();
  return P[i % P.length];
}
const ACG = ["#0f766e", "#3f6212", "#166534", "#0e7490", "#14532d", "#4d7c0f", "#047857"];
const acgCol = (i) => {
  const t = (store.settings && store.settings.theme) || "gruen";
  if (t === "gruen") return ACG[i % ACG.length];
  const P = packCols();
  return P[(i * 5 + 2) % P.length];
};
function acctColor(name, i) {
  return userCol("acct", name) || (isGreen() && i > 0 ? acgCol(i - 1) : null);
}
function userCol(group, key) {
  const c = (store.settings && store.settings.colors) || {};
  return (c[group] || {})[key] || null;
}

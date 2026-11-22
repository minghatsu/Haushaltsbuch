/* ===== Rechnung schreiben – Schritt für Schritt ===== */
Object.assign(ICON_PATHS, {
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  qrc: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
});
const RV = {
  d: null,
  st: 0,
  dir: 1,
  pv: 0,
};
const RV_HW = {
  Helvetica: [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
    556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
    722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
    556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
    260, 334, 584, 761, 556, 0, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 222, 222, 333,
    333, 350, 556, 1000, 333, 1000, 500, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370,
    556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667,
    667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778,
    722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500,
  ],
  "Helvetica-Bold": [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
    556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833,
    722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611,
    556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389,
    280, 389, 584, 761, 556, 0, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 278, 278, 500,
    500, 350, 556, 1000, 333, 1000, 556, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370,
    556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722,
    722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778,
    722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278,
    611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556,
  ],
};
const RV_CP = {
  8722: 45,
  8201: 32,
  8239: 32,
  8364: 128,
  8218: 130,
  402: 131,
  8222: 132,
  8230: 133,
  8224: 134,
  8225: 135,
  710: 136,
  8240: 137,
  352: 138,
  8249: 139,
  338: 140,
  381: 142,
  8216: 145,
  8217: 146,
  8220: 147,
  8221: 148,
  8226: 149,
  8211: 150,
  8212: 151,
  732: 152,
  8482: 153,
  353: 154,
  8250: 155,
  339: 156,
  382: 158,
  376: 159,
};
const RV_COL = ["#147A5B", "#2c63b8", "#7a3fb0", "#b8432c", "#1f2a26", "#b07a12"];
function rvBiz() {
  return (store.settings.biz = store.settings.biz || {});
}
function rvKunden() {
  return (store.settings.bizKunden = store.settings.bizKunden || []);
}
function rvItems() {
  return (store.settings.bizItems = store.settings.bizItems || []);
}
/* Kundennummer wie in Buchhaltungsprogrammen: fortlaufend ab 1001, frei änderbar */
function rvKnrNext() {
  let mx = 1000;
  for (const c of rvKunden()) {
    const m = String(c.nr || "").match(/(\d+)\D*$/);
    if (m && m[1].length < 9) mx = Math.max(mx, parseInt(m[1], 10));
  }
  return String(mx + 1);
}
function rvKnrDup(nr, id) {
  const n = String(nr || "")
    .trim()
    .toLowerCase();
  return (
    !!n &&
    rvKunden().some(
      (c) =>
        c.id !== id &&
        String(c.nr || "")
          .trim()
          .toLowerCase() === n
    )
  );
}
/* Firmenlogo: Webseite → E-Mail-Domain → bekannte Marke → aus dem Firmennamen geraten */
const RV_FREEMAIL =
  /^(gmail|googlemail|gmx|web|yahoo|ymail|outlook|hotmail|live|msn|icloud|me|mac|t-online|aol|freenet|posteo|mail|email|protonmail|proton|arcor|online|1und1|mailbox|vodafone|kabelmail|unitybox)\.[a-z.]+$/i;
function rvKDoms(c) {
  const out = [],
    add = (d) => {
      d = String(d || "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split(/[\/?#\s]/)[0];
      if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) && !out.includes(d)) out.push(d);
    };
  add(c.web);
  const em = String(c.email || "").split("@")[1];
  if (em && !RV_FREEMAIL.test(em)) add(em);
  try {
    const br = brandFor(c.name);
    if (br && br.domain) add(br.domain);
  } catch (_) {}
  const um = {
      ä: "ae",
      ö: "oe",
      ü: "ue",
      ß: "ss",
      é: "e",
      è: "e",
      á: "a",
      à: "a",
    },
    base = String(c.name || "")
      .toLowerCase()
      .replace(/[äöüßéèáà]/g, (x) => um[x])
      .replace(/&\s*co\.?\s*(kg|ohg)?/g, " ")
      .replace(
        /\b(gmbh|mbh|ag|ug|kg|ohg|gbr|ek|e\.\s?k\.?|ev|e\.\s?v\.?|ltd|inc|llc|haftungsbeschr\S*|inh\.?.*|und|and)\b/g,
        " "
      )
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);
  if (base.length && base.length <= 3) {
    const j = base.join("");
    if (j.length >= 3 && j.length <= 30) {
      add(j + ".de");
      if (base.length > 1) add(base.join("-") + ".de");
      add(j + ".com");
    }
  }
  return out.slice(0, 5);
}
function rvKLogoData(c) {
  const v = c && c.ld && LOGO.map.get(c.ld);
  return (v && v.data) || "";
}
function rvKIni(n) {
  const w = String(n || "?")
    .replace(/\b(GmbH|mbH|AG|UG|KG|OHG|GbR|e\.?\s?K\.?|e\.?\s?V\.?)\b/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((w[0] || "?")[0] + (w[1] ? w[1][0] : "")).toUpperCase();
}
function rvKCol(n) {
  let h = 0;
  for (const ch of String(n || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ["#2F5DA8", "#E0663A", "#5B4BB7", "#0F8A8A", "#B4572E", "#3D7A3A", "#A23B72", "#4A6572"][h % 8];
}
function rvKAv(c, big) {
  const lg = rvKLogoData(c);
  return lg
    ? `<span class="rvav rvlg ${big ? "big" : ""}"><img src="${lg}" alt=""></span>`
    : `<span class="rvav rvin ${big ? "big" : ""}" style="background:${rvKCol(c && c.name)}" data-noi18n>${escHtml(rvKIni(c && c.name))}</span>`;
}
const RVK = {
  busy: new Set(),
};
async function rvKLogo(c, force) {
  if (!c || store.settings.logos !== true || !c.name) return false;
  const key = rvKDoms(c).join("|");
  if (!key) return false;
  if (!force && c.lk === key && (c.ld || Date.now() - (c.lt || 0) < 30 * 864e5)) return !!c.ld;
  if (RVK.busy.has(key)) return false;
  RVK.busy.add(key);
  try {
    let hit = "";
    for (const dm of key.split("|")) {
      if (!LOGO.map.has(dm)) await fetchLogo(dm);
      const v = LOGO.map.get(dm);
      if (v && v.data) {
        hit = dm;
        break;
      }
    }
    c.ld = hit;
    c.lk = key;
    c.lt = Date.now();
    return !!hit;
  } finally {
    RVK.busy.delete(key);
  }
}
function rvKAvUpd() {
  const d = RV.d;
  if (!d) return;
  const a = document.getElementById("rvKAv");
  if (a) a.outerHTML = rvKAv(d.k, 1).replace('<span class="rvav', '<span id="rvKAv" class="rvav');
  document.querySelectorAll("[data-rvk]").forEach((b) => {
    const c = rvKunden().find((x) => x.id === b.dataset.rvk),
      av = b.querySelector(".rvav");
    if (c && av) av.outerHTML = rvKAv(c);
  });
}
function rvKLogoSoon() {
  clearTimeout(RVK.t);
  const st = $("rvKLs");
  RVK.t = setTimeout(async () => {
    const d = RV.d;
    if (!d || store.settings.logos !== true || !d.k.name) return;
    if (st) {
      st.className = "rvkls busy";
      st.textContent = uiText("rv_k_logo_find");
    }
    const ok = await rvKLogo(d.k);
    const s2 = $("rvKLs");
    if (s2) {
      s2.className = "rvkls " + (ok ? "ok" : "");
      s2.textContent = uiText(ok ? "rv_k_logo_ok" : "rv_k_logo_none");
    }
    rvKAvUpd();
    const av = $("rvKAv");
    if (ok && av && !reducedMotion())
      av.animate(
        [
          {
            transform: "scale(.6)",
            opacity: 0.3,
          },
          {
            transform: "scale(1.12)",
          },
          {
            transform: "none",
            opacity: 1,
          },
        ],
        {
          duration: 460,
          easing: "cubic-bezier(.3,1.6,.5,1)",
        }
      );
  }, 700);
}
function rvItemsSave(d, use) {
  for (const p of d.pos) {
    const n = String(p.n || "").trim();
    if (!n || !(Number(p.p) || 0)) continue;
    let it = rvItems().find((i) => i.n.toLowerCase() === n.toLowerCase());
    if (!it) {
      it = {
        n,
      };
      rvItems().push(it);
    }
    Object.assign(it, {
      p: Number(p.p) || 0,
      u: p.u || "",
      v: p.v,
    });
    if (use) {
      it.c = (it.c || 0) + 1;
      it.t = isoToday();
    }
  }
}
/* Aus vorhandenen Rechnungen lernen: Leistungen und Kunden (mit Adresse) */
const RV_POS_UNIT = /\b(std|stunden?|h|stk|stück|pauschal|pausch|psch|tage?|minuten|min|monate?|lfm|qm)\b\.?/i,
  RV_POS_QU =
    /\b\d{1,4}(?:[,.]\d{1,2})?\s*(?:x\s*)?(?:std|stunden?|h|stk|stück|pauschal|pausch|psch|tage?|minuten|min|monate?|lfm|qm)\b\.?/gi;
function rvUnitNorm(u) {
  u = String(u || "")
    .toLowerCase()
    .replace(/\.$/, "");
  return /^(std|stunden?|h)$/.test(u)
    ? "Std."
    : /^(stk|stück)$/.test(u)
      ? "Stk."
      : /^(pauschal|pausch|psch)$/.test(u)
        ? "pauschal"
        : /^tage?$/.test(u)
          ? "Tag"
          : /^(min|minuten)$/.test(u)
            ? "Min."
            : /^monate?$/.test(u)
              ? "Monat"
              : u;
}
const RV_POS_STOP =
  /zwischensumme|nettobetrag|netto\b|summe|gesamtbetrag|rechnungsbetrag|endbetrag|zu zahlen|umsatzsteuer|mwst|ust\.|bankverbindung|iban|zahlbar|übertrag|skonto|brutto/i;
const RV_POS_SKIP =
  /rechnungs|datum|kunden-?nr|kundennummer|steuer-?nr|steuernummer|ust-?id|telefon|tel\.|e-?mail|www\.|seite \d|leistungszeitraum|lieferdatum|fällig|^\s*pos\b/i;
function rvPosParse(lines) {
  const rows = (lines || [])
    .map((l) => (typeof l === "string" ? l : (l && l.t) || ""))
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let a = rows.findIndex((t) =>
    /(pos|beschreibung|bezeichnung|leistung|artikel|tätigkeit).{0,40}(menge|anzahl|preis|betrag|gesamt|summe)|einzelpreis|e-?preis/i.test(
      t
    )
  );
  const out = [];
  const from = a >= 0 ? a + 1 : 0;
  for (let i = from; i < rows.length; i++) {
    const t = rows[i];
    if (RV_POS_STOP.test(t)) {
      if (a >= 0 || out.length) break;
      else continue;
    }
    if (RV_POS_SKIP.test(t)) continue;
    const am = amountsIn(" " + t + " ");
    if (!am.length) continue;
    let desc = t
      .replace(RV_POS_QU, " ")
      .replace(/(\d{1,4}(?:\.\d{3})*|\d{1,6})\s?[,.]\s?\d{2}(?!\d)\s*(€|eur)?/gi, " ")
      .replace(/€|eur\b/gi, " ")
      .replace(/\b\d{1,2}\s?%/g, " ")
      .replace(RV_POS_UNIT, " ")
      .replace(/^\s*\d{1,3}[.)]?\s+/, "")
      .replace(/\s\d+([,.]\d+)?\s*$/, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (desc.length < 3 || !/[a-zäöüß]{3}/i.test(desc) || desc.length > 80) continue;
    const um = t.match(RV_POS_UNIT),
      qm = t.match(/(?:^|\s)(\d{1,4}(?:[,.]\d{1,2})?)\s*(?:x\s|×|std|stunden|h\b|stk|stück|pausch|tag|min)/i),
      q = qm ? Number(qm[1].replace(",", ".")) : 1;
    let p = am.length >= 2 ? am[am.length - 2] : am[0];
    if (am.length === 1 && q > 1) p = round2(am[0] / q);
    if (!(p > 0)) continue;
    const u = um ? rvUnitNorm(um[1]) : "";
    out.push({
      n: desc.slice(0, 60),
      p,
      u,
    });
    if (out.length >= 15) break;
  }
  return out;
}
function rvAddrParse(lines, name) {
  const T = (lines || [])
      .map((l) => (typeof l === "string" ? l : (l && l.t) || ""))
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter(Boolean),
    n = String(name || "")
      .toLowerCase()
      .trim();
  if (!n) return {};
  const key = n
    .replace(/\b(gmbh|mbh|ag|ug|kg|ohg|gbr|e\.?\s?k\.?)\b/g, "")
    .trim()
    .split(" ")[0];
  let i = T.findIndex((t) => t.toLowerCase().includes(n) && t.length < n.length + 40);
  if (i < 0 && key.length > 3) i = T.findIndex((t) => t.toLowerCase().includes(key) && t.length < 60);
  if (i < 0) return {};
  const o = {};
  const PERS =
      /^(?:z\.?\s?hd\.?|zu händen|inh(?:aber(?:in)?)?\.?:?|ansprechpartner(?:in)?:?|herrn?|frau)\s+(.{3,50})$/i,
    NAME =
      /^(?:herrn?\s+|frau\s+)?([A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?\s+(?:(?:von|van|de|zu)\s+)?[A-ZÄÖÜ][a-zäöüß-]+)$/;
  const im = T[i].match(/(?:inh(?:aber(?:in)?)?\.?:?)\s+(.{3,50})$/i);
  if (im) o.person = im[1].trim();
  for (let k = i + 1; k < Math.min(T.length, i + 7); k++) {
    const t = T[k];
    if (!o.city && /^(?:D-)?\d{5}\s+[A-ZÄÖÜ][\wäöüß .()-]{1,40}$/.test(t)) {
      o.city = t.replace(/^D-/, "");
      continue;
    }
    if (
      !o.street &&
      /(stra(ß|ss)e|str\.|weg|allee|platz|gasse|ring|damm|ufer|chaussee|markt|hof)\s*\d/i.test(t) &&
      t.length < 60
    ) {
      const m = t.match(/^(.*?\d+\s?[a-z]?)(?:,\s*(\d{5}\s+.+))?$/i);
      o.street = m ? m[1].trim() : t;
      if (m && m[2] && !o.city) o.city = m[2].trim();
      continue;
    }
    if (!o.email) {
      const em = t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      if (em) {
        o.email = em[0];
        continue;
      }
    }
    if (!o.person && !o.street) {
      const pm = t.match(PERS) || t.match(NAME);
      if (pm && !/rechnung|datum|nummer|kunde/i.test(t)) o.person = pm[1].trim();
    }
    if (o.city && k > i + 2) break;
  }
  if (o.person) o.person = o.person.replace(/^(herrn?|frau)\s+/i, "").trim();
  if (!o.email) {
    const nk = key.replace(/[^a-z0-9]/g, "");
    for (const t of T) {
      const em = t.match(/[\w.+-]+@([\w-]+)\.[\w.-]+/);
      if (
        em &&
        nk.length > 3 &&
        em[1]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .includes(nk)
      ) {
        o.email = em[0];
        break;
      }
    }
  }
  return o;
}
function rvLearnAdd(items, kunde, addr) {
  let ni = 0,
    nk = 0;
  const now = isoToday();
  for (const p of items || []) {
    const n = String(p.n || "").trim();
    if (!n || !(Number(p.p) > 0)) continue;
    let it = rvItems().find((i) => i.n.toLowerCase() === n.toLowerCase());
    if (!it) {
      it = {
        n,
        p: Number(p.p),
        u: p.u || "",
        src: "rch",
      };
      if (p.v !== undefined) it.v = p.v;
      rvItems().push(it);
      ni++;
    }
    it.c = (it.c || 0) + 1;
    if (p.d && (!it.t || p.d > it.t)) it.t = p.d;
  }
  const k = String(kunde || "").trim();
  if (k) {
    let c = rvKunden().find((x) => x.name.toLowerCase() === k.toLowerCase());
    if (!c) {
      c = {
        id: "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name: k,
        nr: rvKnrNext(),
        src: "rch",
      };
      rvKunden().push(c);
      nk++;
    }
    for (const f of ["person", "street", "city", "email"]) if (addr && addr[f] && !c[f]) c[f] = addr[f];
  }
  return {
    ni,
    nk,
  };
}
function rvLearnTodo() {
  return rchList().filter(
    (i) =>
      (i.learned || 0) < 2 &&
      !i.storno &&
      i.typ !== "s" &&
      (i.doc || i.img || i.kunde) &&
      !(i.learned === 1 && !i.img && !i.doc)
  );
}
const RVL = {
  run: false,
  i: 0,
  n: 0,
};
function rvLearnUi() {
  const n = rvLearnTodo().length;
  if (!n && !RVL.run) return "";
  return `<div class="rvlearn" id="rvLearn">${
    RVL.run
      ? `<span class="rvkls busy">${escHtml(
          uiText("rv_learn_busy", {
            a: String(RVL.i),
            b: String(RVL.n),
          })
        )}</span>`
      : `<span class="grow">${svgIcon("doc", 16)} ${escHtml(
          uiText("rv_learn_t", {
            n: String(n),
          })
        )}</span><button type="button" class="btn" data-rvlearn>${escHtml(uiText("rv_learn_go"))}</button>`
  }</div>`;
}
function rvLearnUpd() {
  document.querySelectorAll("#rvLearn").forEach((e) => {
    const h = rvLearnUi();
    if (h) e.outerHTML = h;
    else e.remove();
  });
}
async function rvLearn() {
  if (RVL.run) return;
  const L = rvLearnTodo();
  if (!L.length) return;
  RVL.run = true;
  RVL.i = 0;
  RVL.n = L.length;
  rvLearnUpd();
  let ni = 0,
    nk = 0;
  try {
    for (const i of L) {
      RVL.i++;
      rvLearnUpd();
      let r = {
        ni: 0,
        nk: 0,
      };
      const again = i.learned === 1;
      if (i.doc) {
        r = rvLearnAdd(
          again
            ? []
            : (i.doc.pos || []).map((p) => ({
                ...p,
                d: i.date,
              })),
          (i.doc.k && i.doc.k.name) || i.kunde,
          i.doc.k
        );
      } else {
        let lines = [];
        if (i.img) {
          try {
            const im = await rcptGet("rch-" + i.id);
            if (im) {
              const raw = await ocrDataUrl(im);
              lines = ocrRows(raw).concat(raw || []);
            }
          } catch (_) {}
        }
        r = rvLearnAdd(
          again
            ? []
            : rvPosParse(lines).map((p) => ({
                ...p,
                d: i.date,
              })),
          i.kunde,
          rvAddrParse(lines, i.kunde)
        );
      }
      ni += r.ni;
      nk += r.nk;
      i.learned = 2;
    }
  } finally {
    RVL.run = false;
  }
  await saveSettings();
  rvLearnUpd();
  toast(
    uiText("rv_learn_done", {
      a: String(ni),
      b: String(nk),
    })
  );
  if (RV.d && $("rvBg") && !$("rvBg").hidden && ["kunde", "pos"].includes(rvSteps()[RV.st])) {
    rvSync();
    rvRender();
  }
  if (store.settings.logos === true)
    for (const c of rvKunden())
      if (c.src === "rch" && !c.lt)
        rvKLogo(c).then((ok) => {
          if (ok) rvKAvUpd();
        });
}
function rvItemsSorted() {
  return rvItems()
    .slice()
    .sort(
      (a, b) => (b.c || 0) - (a.c || 0) || String(b.t || "").localeCompare(String(a.t || "")) || a.n.localeCompare(b.n)
    );
}
function rvRecs() {
  return (store.settings.rvRec = store.settings.rvRec || []);
}
function rvAddM(iso, m) {
  const d = new Date(iso + "T12:00"),
    day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + m);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return isoOf(d);
}
function rvRecDue() {
  const lim = addDays(isoToday(), 3);
  return rvRecs().filter((r) => r.next <= lim && rchList().some((i) => i.id === r.src && i.doc));
}
function rvRecOpen(id) {
  const r = rvRecs().find((x) => x.id === id),
    i = r && rchList().find((x) => x.id === r.src);
  if (!i || !i.doc) return;
  const d = JSON.parse(JSON.stringify(i.doc));
  Object.assign(d, {
    nr: rchNextNr(),
    date: isoToday(),
    id: undefined,
    recId: r.id,
    rep: 0,
    lz: "",
    abz: [],
  });
  try {
    hbSheetClose("rchBg");
  } catch (_) {}
  rvOpen(d);
}
const RV_EV = {
  1: "rv_rep_1",
  3: "rv_rep_3",
  12: "rv_rep_12",
};
function rvBizOk() {
  const b = rvBiz();
  return !!(b.name && b.street && b.city && (b.taxNo || b.vatId) && b.iban);
}
function rvCp(s) {
  let o = "";
  for (const ch of String(s ?? "")) {
    const c = ch.codePointAt(0);
    o +=
      c < 128 || (c >= 160 && c < 256)
        ? String.fromCharCode(c)
        : RV_CP[c]
          ? String.fromCharCode(RV_CP[c])
          : c === 8239 || c === 8201
            ? " "
            : "?";
  }
  return o;
}
function rvTextWidth(s, sz, b) {
  const W = RV_HW[b ? "Helvetica-Bold" : "Helvetica"],
    t = rvCp(s);
  let w = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    w += (c >= 32 ? W[c - 32] : 0) || 556;
  }
  return (w * sz) / 1000;
}
function rvWrap(s, sz, b, max) {
  const out = [];
  for (const para of String(s || "").split(/\n/)) {
    let line = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const t = line ? line + " " + w : w;
      if (rvTextWidth(t, sz, b) <= max) line = t;
      else {
        if (line) out.push(line);
        line = w;
        while (rvTextWidth(line, sz, b) > max && line.length > 1) {
          let k = line.length;
          while (k > 1 && rvTextWidth(line.slice(0, k), sz, b) > max) k--;
          out.push(line.slice(0, k));
          line = line.slice(k);
        }
      }
    }
    out.push(line);
  }
  return out;
}
function rvFit(s, sz, b, max) {
  s = String(s || "");
  if (rvTextWidth(s, sz, b) <= max) return s;
  while (s.length > 1 && rvTextWidth(s + "…", sz, b) > max) s = s.slice(0, -1);
  return s + "…";
}
const rvEuro = (v) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(round2(v || 0) || 0);
const rvDate = (iso) =>
  iso
    ? new Date(iso + "T12:00").toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";
function rvNew() {
  const b = rvBiz();
  return {
    nr: rchNextNr(),
    date: isoToday(),
    z: b.z || 14,
    lz: "",
    kid: "",
    k: {
      name: "",
      person: "",
      street: "",
      city: "",
      email: "",
    },
    pos: [],
    vat: 19,
    typ: "r",
    abz: [],
    rep: 0,
    title: "",
    intro: b.intro || "Vielen Dank für Ihren Auftrag. Hiermit stelle ich Ihnen folgende Leistungen in Rechnung:",
    note: b.outro || "",
  };
}
function rvEpc(d, sum) {
  const b = rvBiz(),
    iban = String(b.iban || "")
      .replace(/\s+/g, "")
      .toUpperCase();
  if (!iban || !(sum.gross > 0)) return "";
  return [
    "BCD",
    "002",
    "1",
    "SCT",
    String(b.bic || "")
      .replace(/\s+/g, "")
      .toUpperCase(),
    String(b.name || "").slice(0, 70),
    iban,
    "EUR" + sum.gross.toFixed(2),
    "",
    "",
    ("Rechnung " + (d.nr || "")).slice(0, 140),
  ].join("\n");
}
/* Ein Layout für Vorschau und PDF – beides sieht dadurch exakt gleich aus */
function rvDark(h) {
  const n = parseInt(String(h).slice(1), 16),
    f = (v) =>
      Math.round(v * 0.5)
        .toString(16)
        .padStart(2, "0");
  return "#" + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255);
}
function rvOn(h) {
  const n = parseInt(String(h).slice(1), 16),
    l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.62 ? "#1d1d1d" : "#ffffff";
}
function rvSum(d) {
  const kl = rvBiz().klein,
    def = kl ? 0 : Number(d.vat) || 0,
    sg = d.typ === "s" ? -1 : 1,
    rab = Math.max(0, Math.min(100, Number(d.rab) || 0)),
    G = {};
  let sub = 0;
  for (const p of d.pos || []) {
    const n = (Number(p.q) || 0) * (Number(p.p) || 0),
      r = kl ? 0 : p.v === undefined || p.v === null || p.v === "" ? def : Number(p.v);
    sub += n;
    G[r] = (G[r] || 0) + n;
  }
  sub = round2(sub);
  const disc = Math.round(sub * rab) / 100,
    groups = Object.keys(G)
      .map(Number)
      .sort((a, b) => b - a)
      .map((r) => {
        const net = round2(G[r] * (1 - rab / 100));
        return {
          rate: r,
          net,
          vat: Math.round(net * r) / 100,
        };
      });
  const net = round2(sub - disc),
    vat = round2(groups.reduce((s, g) => s + g.vat, 0)),
    gross = round2(net + vat),
    ded = d.typ === "r" || !d.typ ? round2((d.abz || []).reduce((s, a) => s + (Number(a.amt) || 0), 0)) : 0;
  const rates = groups.filter((g) => g.net || g.rate).map((g) => g.rate),
    rate = rates.length === 1 ? rates[0] : rates.length ? -1 : 0;
  return {
    sub: sg * sub,
    disc: sg * disc,
    rab,
    net: sg * net,
    rate,
    groups: groups.map((g) => ({
      rate: g.rate,
      net: sg * g.net,
      vat: sg * g.vat,
    })),
    mixed: groups.length > 1,
    vat: sg * vat,
    gross: sg * gross,
    ded,
    pay: round2(sg * gross - ded),
  };
}
const RV_TX = {
  de: {
    r: "RECHNUNG",
    a: "ABSCHLAGSRECHNUNG",
    g: "GUTSCHRIFT",
    s: "STORNORECHNUNG",
    tr: "Rechnung",
    ta: "Abschlagsrechnung",
    tg: "Gutschrift",
    ts: "Stornorechnung",
    nr: "Nr.",
    date: "Rechnungsdatum",
    lz: "Leistungszeitraum",
    ld: "Leistungsdatum",
    kn: "Kundennummer",
    due: "Zahlbar bis",
    pos: "Pos.",
    desc: "Beschreibung",
    qty: "Menge",
    vat: "USt",
    unit: "Einzelpreis",
    tot: "Gesamt",
    page: "Seite",
    sub: "Zwischensumme",
    rab: "abzgl. Rabatt",
    net: "Summe netto",
    vatl: "Umsatzsteuer",
    gross: "Gesamtbetrag",
    abz: "abzgl. Abschlag Nr.",
    rest: "Noch zu zahlen",
    gs: "Gutschriftbetrag",
    st: "Stornobetrag",
    klein: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    ref: "zur Rechnung Nr.",
    vom: "vom",
    pay: (a, d) => `Bitte überweisen Sie ${a} bis zum ${d}.`,
    qr: "Einfach den Code mit der Banking-App scannen – Empfänger, IBAN, Betrag und Rechnungsnummer sind schon ausgefüllt.",
    noqr: (n) => `Bitte geben Sie bei der Überweisung die Rechnungsnummer ${n} an.`,
    gpay: (a) => `Den Betrag von ${a} überweise ich Ihnen in den nächsten Tagen.`,
    gq: "Bitte prüfen Sie Ihre Kontoverbindung – bei Fragen melden Sie sich gern.",
    spay: (n) => `Die Rechnung Nr. ${n} ist damit aufgehoben.`,
    sq: "Bereits gezahlte Beträge erstatte ich Ihnen – Sie brauchen nichts weiter zu tun.",
    owner: "Inhaber/in",
    tel: "Tel.",
    tax: "Steuer-Nr.",
    vatid: "USt-IdNr.",
  },
  en: {
    r: "INVOICE",
    a: "DEPOSIT INVOICE",
    g: "CREDIT NOTE",
    s: "CANCELLATION",
    tr: "Invoice",
    ta: "Deposit invoice",
    tg: "Credit note",
    ts: "Cancellation invoice",
    nr: "No.",
    date: "Invoice date",
    lz: "Service period",
    ld: "Service date",
    kn: "Customer no.",
    due: "Due date",
    pos: "No.",
    desc: "Description",
    qty: "Qty",
    vat: "VAT",
    unit: "Unit price",
    tot: "Total",
    page: "Page",
    sub: "Subtotal",
    rab: "less discount",
    net: "Net total",
    vatl: "VAT",
    gross: "Total amount",
    abz: "less deposit no.",
    rest: "Amount due",
    gs: "Credit amount",
    st: "Cancelled amount",
    klein: "No VAT is charged according to § 19 UStG (small business).",
    ref: "for invoice no.",
    vom: "dated",
    pay: (a, d) => `Please transfer ${a} by ${d}.`,
    qr: "Just scan the code with your banking app – recipient, IBAN, amount and invoice number are already filled in.",
    noqr: (n) => `Please quote invoice number ${n} with your payment.`,
    gpay: (a) => `I will transfer ${a} to you within the next few days.`,
    gq: "Please check your bank details – feel free to get in touch if you have any questions.",
    spay: (n) => `Invoice no. ${n} is hereby cancelled.`,
    sq: "Any amounts already paid will be refunded – there is nothing else you need to do.",
    owner: "Owner",
    tel: "Phone",
    tax: "Tax no.",
    vatid: "VAT ID",
  },
};
const rvEL = (v, lg) =>
  new Intl.NumberFormat(lg === "en" ? "en-IE" : "de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(round2(v || 0));
const rvDL = (iso, lg) =>
  iso
    ? lg === "en"
      ? new Date(iso + "T12:00").toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : rvDate(iso)
    : "";
function rvLayout(d) {
  const b = rvBiz(),
    lg = d.lang === "en" ? "en" : "de",
    X = RV_TX[lg],
    E = (v) => rvEL(v, lg),
    DD = (iso) => rvDL(iso, lg),
    NN = (v) =>
      new Intl.NumberFormat(lg === "en" ? "en-IE" : "de-DE", {
        maximumFractionDigits: 2,
      }).format(v || 0);
  const none = b.color === "none",
    pc = none ? "#222222" : /^#[0-9a-f]{6}$/i.test(b.color || "") ? b.color : RV_COL[0],
    onC = none ? "#222222" : rvOn(pc),
    thBg = none ? "#ececec" : pc,
    thC = none ? "#222222" : onC,
    tc = onC === "#ffffff" || none ? pc : rvDark(pc),
    sum = rvSum(d),
    L = 46,
    R = 549,
    pages = [[]];
  let pg = pages[0];
  const sg = d.typ === "s" ? -1 : 1,
    T = (x, y, txt, sz, o) => {
      o = o || {};
      const w = rvTextWidth(txt, sz, o.b);
      pg.push({
        t: "text",
        x: o.al === "r" ? x - w : o.al === "c" ? x - w / 2 : x,
        y,
        s: sz,
        b: !!o.b,
        c: o.c || "#222222",
        txt: String(txt),
      });
    };
  const Rc = (x, y, w, h, c, r) =>
      pg.push({
        t: "rect",
        x,
        y,
        w,
        h,
        c,
        r: r || 0,
      }),
    Ln = (x1, y1, x2, y2, c, w) =>
      pg.push({
        t: "line",
        x1,
        y1,
        x2,
        y2,
        c,
        w: w || 0.6,
      });
  const due = addDays(d.date || isoToday(), Number(d.z) || 14),
    sender = [b.name, b.street, b.city].filter(Boolean).join(" · ");
  const foot = () => {
    const cols = [
      [b.name, b.owner ? X.owner + " " + b.owner : "", b.street, b.city],
      [b.tel ? X.tel + " " + b.tel : "", b.email, b.web],
      [b.taxNo ? X.tax + " " + b.taxNo : "", b.vatId ? X.vatid + " " + b.vatId : ""],
      [b.bank, b.iban ? "IBAN " + b.iban : "", b.bic ? "BIC " + b.bic : ""],
    ];
    Ln(L, 782, R, 782, "#dddddd", 0.6);
    cols.forEach((c, i) => {
      let y = 794;
      c.filter(Boolean).forEach((t, j) => {
        T(L + i * 126.5, y, rvFit(t, 6.8, j === 0 && i === 0, 120), 6.8, {
          b: j === 0 && i === 0,
          c: "#666666",
        });
        y += 9.4;
      });
    });
  };
  const typ = d.typ || "r";
  if (!none) Rc(0, 0, 595, 96, pc);
  else Ln(L, 96, R, 96, "#222222", 1.2);
  T(L, 40, X[typ], 8.5, {
    b: 1,
    c: onC,
  });
  T(L, 68, X.nr + " " + (d.nr || ""), 24, {
    b: 1,
    c: onC,
  });
  if (b.logo && b.logoW && b.logoH) {
    const ar = b.logoW / b.logoH;
    if (b.logoA || none) {
      const iw0 = Math.min(200, 60 * ar),
        ih0 = iw0 / ar;
      pg.push({
        t: "img",
        x: R - iw0,
        y: 18 + (60 - ih0) / 2,
        w: iw0,
        h: ih0,
        src: b.logo,
        svg: b.logoPng || b.logo,
        alpha: b.logoA,
        pw: b.logoW,
        ph: b.logoH,
      });
    } else {
      const th = 62,
        iw0 = Math.min(176, Math.max(44, (th - 14) * ar)),
        ih0 = Math.min(th - 14, iw0 / ar),
        tw = iw0 + 14;
      Rc(R - tw, 17, tw, th, "#ffffff", 9);
      pg.push({
        t: "img",
        x: R - tw + (tw - iw0) / 2,
        y: 17 + (th - ih0) / 2,
        w: iw0,
        h: ih0,
        src: b.logo,
        pw: b.logoW,
        ph: b.logoH,
      });
    }
  } else {
    const bn = rvWrap(b.name || store.settings.name || "Dein Name", 13, 1, 220);
    bn.slice(0, 2).forEach((t, i) =>
      T(R, 44 + i * 16, t, 13, {
        b: 1,
        c: onC,
        al: "r",
      })
    );
    if (b.owner && b.owner !== b.name)
      T(R, 44 + Math.min(2, bn.length) * 16, b.owner, 8.5, {
        c: onC,
        al: "r",
      });
  }
  if (sender)
    T(L, 126, rvFit(sender, 7, 0, 260), 7, {
      c: "#777777",
    });
  const to = [d.k.name, d.k.person, d.k.street, d.k.city].filter(Boolean);
  to.forEach((t, i) =>
    T(L, 146 + i * 14, rvFit(t, 10, i === 0, 250), 10, {
      b: i === 0,
    })
  );
  const meta = [
    [X.date, DD(d.date)],
    [d.lz ? X.lz : X.ld, d.lz || DD(d.date)],
  ];
  if (d.k.nr) meta.push([X.kn, d.k.nr]);
  if (typ === "r" || typ === "a") meta.push([X.due, DD(due), 1]);
  meta.forEach((m, i) => {
    T(349, 134 + i * 16, m[0], 8.5, {
      c: "#666666",
    });
    T(R, 134 + i * 16, rvFit(m[1], 8.5, !!m[2], 110), 8.5, {
      b: !!m[2],
      al: "r",
    });
  });
  let y = Math.max(232, 146 + to.length * 14 + 28);
  T(L, y, rvFit(d.title || X["t" + typ], 16, 1, R - L), 16, {
    b: 1,
    c: tc,
  });
  y += 22;
  if ((typ === "g" || typ === "s") && d.ref) {
    const o = rchList().find((i) => i.nr === d.ref);
    T(L, y, rvFit(X.ref + " " + d.ref + (o ? " " + X.vom + " " + DD(o.date) : ""), 9.5, 1, R - L), 9.5, {
      b: 1,
    });
    y += 16;
  }
  for (const t of rvWrap(d.intro, 9, 0, R - L)) {
    T(L, y, t, 9);
    y += 13;
  }
  y += 6;
  const mx = sum.mixed,
    cx = mx ? [L + 6, L + 30, 352, 392, 462, R - 6] : [L + 6, L + 30, 380, 0, 455, R - 6];
  const head = () => {
    Rc(L, y, R - L, 20, thBg);
    T(cx[0], y + 13.5, X.pos, 8.5, {
      b: 1,
      c: thC,
    });
    T(cx[1], y + 13.5, X.desc, 8.5, {
      b: 1,
      c: thC,
    });
    T(cx[2], y + 13.5, X.qty, 8.5, {
      b: 1,
      c: thC,
      al: "r",
    });
    if (mx)
      T(cx[3], y + 13.5, X.vat, 8.5, {
        b: 1,
        c: thC,
        al: "r",
      });
    T(cx[4], y + 13.5, X.unit, 8.5, {
      b: 1,
      c: thC,
      al: "r",
    });
    T(cx[5], y + 13.5, X.tot, 8.5, {
      b: 1,
      c: thC,
      al: "r",
    });
    y += 20;
  };
  const newPage = () => {
    foot();
    pg = [];
    pages.push(pg);
    y = 60;
    T(L, 40, X.tr + " " + (d.nr || "") + " · " + X.page + " " + pages.length, 8.5, {
      c: "#777777",
    });
    head();
  };
  const kl = b.klein,
    def = kl ? 0 : Number(d.vat) || 0;
  head();
  (d.pos || []).forEach((p, i) => {
    const ds = rvWrap(p.n || "–", 9, 1, cx[2] - cx[1] - (mx ? 50 : 60)),
      h = Math.max(20, 9 + ds.length * 12);
    if (y + h > 700) newPage();
    T(cx[0], y + 13, i + 1 + ".", 9);
    ds.forEach((t, j) =>
      T(cx[1], y + 13 + j * 12, t, 9, {
        b: 1,
      })
    );
    T(cx[2], y + 13, NN(p.q) + " " + (p.u || ""), 9, {
      al: "r",
    });
    if (mx)
      T(cx[3], y + 13, (p.v === undefined || p.v === null || p.v === "" ? def : Number(p.v)) + " %", 9, {
        al: "r",
        c: "#555555",
      });
    T(cx[4], y + 13, E(sg * (Number(p.p) || 0)), 9, {
      al: "r",
    });
    T(cx[5], y + 13, E(sg * (Number(p.q) || 0) * (Number(p.p) || 0)), 9, {
      al: "r",
    });
    y += h;
    Ln(L, y, R, y, "#eeeeee", 0.6);
  });
  const extra =
    (sum.rab ? 30 : 0) + (sum.groups.length > 1 ? 15 * (sum.groups.length - 1) : 0) + (d.abz || []).length * 15;
  if (y + 150 + extra > 772) newPage();
  y += 12;
  const sx = 319;
  if (sum.rab) {
    T(sx + 6, y, X.sub, 9);
    T(R - 6, y, E(sum.sub), 9, {
      al: "r",
    });
    y += 15;
    T(sx + 6, y, X.rab + " " + NN(sum.rab) + " %", 9);
    T(R - 6, y, E(-sum.disc), 9, {
      al: "r",
    });
    y += 15;
  }
  if (!kl && sum.groups.some((g) => g.rate)) {
    T(sx + 6, y, X.net, 9);
    T(R - 6, y, E(sum.net), 9, {
      al: "r",
    });
    y += 15;
    for (const g of sum.groups) {
      if (!g.rate) continue;
      T(sx + 6, y, X.vatl + " " + g.rate + " %" + (sum.mixed ? " (" + E(g.net) + ")" : ""), 9);
      T(R - 6, y, E(g.vat), 9, {
        al: "r",
      });
      y += 15;
    }
    y -= 5;
  }
  Ln(sx, y, R, y, tc, 1.4);
  y += 15;
  if (sum.ded) {
    T(sx + 6, y, X.gross, 9, {
      b: 1,
    });
    T(R - 6, y, E(sum.gross), 9, {
      b: 1,
      al: "r",
    });
    y += 15;
    for (const a of d.abz || []) {
      T(sx + 6, y, rvFit(X.abz + " " + a.nr, 9, 0, 150), 9);
      T(R - 6, y, "– " + E(a.amt), 9, {
        al: "r",
      });
      y += 15;
    }
    y -= 4;
    Ln(sx, y, R, y, tc, 1.4);
    y += 15;
  }
  T(sx + 6, y, typ === "g" ? X.gs : typ === "s" ? X.st : sum.ded ? X.rest : X.gross, 11, {
    b: 1,
    c: tc,
  });
  T(R - 6, y, E(sum.pay), 11, {
    b: 1,
    c: tc,
    al: "r",
  });
  y += 12;
  if (kl) {
    y += 8;
    T(L, y, X.klein, 8.5, {
      c: "#444444",
    });
    y += 4;
  }
  y += 16;
  const epc =
      typ === "g" || typ === "s" || !(sum.pay > 0)
        ? ""
        : rvEpc(d, {
            ...sum,
            gross: sum.pay,
          }),
    ph = epc ? 78 : 44;
  Rc(L, y, R - L, ph, "#f3f5f4", 8);
  if (epc) {
    pg.push({
      t: "qr",
      x: L + 8,
      y: y + 7,
      s: 64,
      m: qrMatrix(epc),
    });
  }
  const px = epc ? L + 84 : L + 12;
  T(
    px,
    y + (epc ? 26 : 20),
    rvFit(
      typ === "g" ? X.gpay(E(sum.pay)) : typ === "s" ? X.spay(d.ref || "") : X.pay(E(sum.pay), DD(due)),
      9.5,
      1,
      R - px - 10
    ),
    9.5,
    {
      b: 1,
    }
  );
  rvWrap(typ === "g" ? X.gq : typ === "s" ? X.sq : epc ? X.qr : X.noqr(d.nr || ""), 8.5, 0, R - px - 10)
    .slice(0, 3)
    .forEach((t, i) =>
      T(px, y + (epc ? 41 : 34) + i * 11.5, t, 8.5, {
        c: "#444444",
      })
    );
  y += ph + 18;
  for (const t of rvWrap(d.note, 9, 0, R - L).slice(0, 6)) {
    if (t) {
      if (y > 770) {
        break;
      }
      T(L, y, t, 9);
    }
    y += 13;
  }
  foot();
  return {
    pages,
    sum,
    due,
  };
}
function rvSvg(d, cls) {
  const { pages } = rvLayout(d);
  const one = (ops) =>
    `<svg class="rvpaper ${cls || ""}" data-noi18n translate="no" viewBox="0 0 595 842" role="img" aria-label="Rechnung ${escHtml(d.nr || "")}"><rect width="595" height="842" fill="#fff"/>${ops
      .map((o) => {
        if (o.t === "rect")
          return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="${o.r}" fill="${o.c}"/>`;
        if (o.t === "line")
          return `<line x1="${o.x1}" y1="${o.y1}" x2="${o.x2}" y2="${o.y2}" stroke="${o.c}" stroke-width="${o.w}"/>`;
        if (o.t === "img")
          return `<image href="${o.svg || o.src}" x="${o.x.toFixed(2)}" y="${o.y.toFixed(2)}" width="${o.w.toFixed(2)}" height="${o.h.toFixed(2)}" preserveAspectRatio="xMidYMid meet"/>`;
        if (o.t === "qr") {
          const n = o.m.length,
            s = o.s / n;
          let p = "";
          for (let r = 0; r < n; r++)
            for (let c = 0; c < n; c++)
              if (o.m[r][c])
                p += `M${(o.x + c * s).toFixed(2)} ${(o.y + r * s).toFixed(2)}h${s.toFixed(2)}v${s.toFixed(2)}h-${s.toFixed(2)}z`;
          return `<rect x="${o.x - 3}" y="${o.y - 3}" width="${o.s + 6}" height="${o.s + 6}" fill="#fff"/><path d="${p}" fill="#000"/>`;
        }
        return `<text x="${o.x.toFixed(2)}" y="${o.y}" font-size="${o.s}" font-weight="${o.b ? 700 : 400}" fill="${o.c}" xml:space="preserve">${escHtml(o.txt)}</text>`;
      })
      .join("")}</svg>`;
  return pages.map(one).join("");
}
/* Kleiner PDF-Schreiber: Standard-Schrift Helvetica, Vektoren, GiroCode */
function rvPdf(d) {
  const { pages } = rvLayout(d),
    H = 842,
    col = (h) => {
      const n = parseInt(String(h).slice(1), 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) => v.toFixed(3)).join(" ");
    };
  const es = (s) => rvCp(s).replace(/[\\()]/g, (m) => "\\" + m),
    objs = [],
    IM = [];
  const streams = pages.map((ops) =>
    ops
      .map((o) => {
        if (o.t === "rect")
          return `${col(o.c)} rg ${o.x.toFixed(2)} ${(H - o.y - o.h).toFixed(2)} ${o.w.toFixed(2)} ${o.h.toFixed(2)} re f`;
        if (o.t === "line")
          return `${col(o.c)} RG ${o.w} w ${o.x1.toFixed(2)} ${(H - o.y1).toFixed(2)} m ${o.x2.toFixed(2)} ${(H - o.y2).toFixed(2)} l S`;
        if (o.t === "img") {
          let k = IM.findIndex((m) => m.src === o.src);
          if (k < 0) {
            IM.push(o);
            k = IM.length - 1;
          }
          return `q ${o.w.toFixed(2)} 0 0 ${o.h.toFixed(2)} ${o.x.toFixed(2)} ${(H - o.y - o.h).toFixed(2)} cm /Im${k + 1} Do Q`;
        }
        if (o.t === "qr") {
          const n = o.m.length,
            s = o.s / n;
          let p = `1 1 1 rg ${o.x - 3} ${H - o.y - o.s - 3} ${o.s + 6} ${o.s + 6} re f 0 0 0 rg `;
          for (let r = 0; r < n; r++)
            for (let c = 0; c < n; c++)
              if (o.m[r][c])
                p += `${(o.x + c * s).toFixed(2)} ${(H - o.y - (r + 1) * s).toFixed(2)} ${s.toFixed(2)} ${s.toFixed(2)} re `;
          return p + "f";
        }
        return `BT /${o.b ? "F2" : "F1"} ${o.s} Tf ${col(o.c)} rg ${o.x.toFixed(2)} ${(H - o.y).toFixed(2)} Td (${es(o.txt)}) Tj ET`;
      })
      .join("\n")
  );
  const np = pages.length,
    kids = pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ");
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${np} >>`;
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  const im0 = 5 + np * 2,
    xo = IM.length ? ` /XObject << ${IM.map((_, k) => `/Im${k + 1} ${im0 + k} 0 R`).join(" ")} >>` : "";
  let mk = im0 + IM.length;
  IM.forEach((m, k) => {
    const bin = atob(String(m.src).split(",")[1] || "");
    let sm = "";
    if (m.alpha) {
      const ab = atob(m.alpha);
      objs[mk] =
        `<< /Type /XObject /Subtype /Image /Width ${m.pw} /Height ${m.ph} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${ab.length} >>\nstream\n${ab}\nendstream`;
      sm = ` /SMask ${mk} 0 R`;
      mk++;
    }
    objs[im0 + k] =
      `<< /Type /XObject /Subtype /Image /Width ${m.pw} /Height ${m.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode${sm} /Length ${bin.length} >>\nstream\n${bin}\nendstream`;
  });
  streams.forEach((s, i) => {
    objs[5 + i * 2] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xo} >> /Contents ${6 + i * 2} 0 R >>`;
    objs[6 + i * 2] = `<< /Length ${s.length} >>\nstream\n${s}\nendstream`;
  });
  const info = objs.length;
  objs[info] =
    `<< /Title (${es("Rechnung " + (d.nr || ""))}) /Author (${es(rvBiz().name || "")}) /Producer (Finanz MAMI) >>`;
  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const off = [];
  for (let i = 1; i < objs.length; i++) {
    off[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const x = out.length;
  out +=
    `xref\n0 ${objs.length}\n0000000000 65535 f \n` +
    off
      .slice(1)
      .map((o) => String(o).padStart(10, "0") + " 00000 n \n")
      .join("") +
    `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${x}\n%%EOF`;
  const u = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) u[i] = out.charCodeAt(i) & 255;
  return new Blob([u], {
    type: "application/pdf",
  });
}
/* Editor */
function rvSteps() {
  const s = [];
  if (!RV.meDone) s.push("me");
  s.push("kunde", "pos", "det", "chk");
  return s;
}
function rvOpen(d) {
  RV.itq = "";
  RV.itAll = 0;
  if ((store.settings.rvLearnAuto || 0) < 2 && rvLearnTodo().length) {
    store.settings.rvLearnAuto = 2;
    setTimeout(() => rvLearn(), 900);
  }
  RV.d = d || rvNew();
  RV.nrTouched = 0;
  RV.meDone = rvBizOk();
  RV.st = 0;
  RV.dir = 1;
  RV.pv = 0;
  let bg = $("rvBg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "rvBg";
    bg.className = "rvbg";
    document.body.appendChild(bg);
  }
  bg.innerHTML = `<div class="rvwin" role="dialog" aria-modal="true" aria-labelledby="rvTt"><header class="rvhd"><button type="button" class="rvx" data-rvclose aria-label="${escHtml(uiText("rv_close"))}">${svgIcon("x", 20)}</button><div class="grow"><small id="rvSub"></small><b id="rvTt">${escHtml(uiText("rv_title"))}</b></div><button type="button" class="rvpvb" data-rvpv>${svgIcon("eye", 17)}<span>${escHtml(uiText("rv_preview"))}</span></button></header>
    <nav class="rvnav" id="rvNav" aria-label="${escHtml(uiText("rv_steps"))}"></nav><main class="rvbody" id="rvBody"></main><aside class="rvprev rvzc" id="rvPrev" tabindex="0" aria-label="${escHtml(uiText("rv_preview"))}"><span class="rvpl">${svgIcon("eye", 14)} ${escHtml(uiText("rv_live"))} · <span class="rvzh">${escHtml(uiText(matchMedia("(pointer:coarse)").matches ? "rv_zoom_touch" : "rv_zoom_pc"))}</span></span>${rvzBar()}<div class="rvpp rvzi" id="rvPP" data-noi18n translate="no"></div></aside></div>`;
  bg.hidden = false;
  document.body.classList.add("locked");
  requestAnimationFrame(() => bg.classList.add("on"));
  rvRender();
  SND.play("whoosh");
  if (!reducedMotion())
    bg.querySelector(".rvwin").animate(
      [
        {
          transform: "translateY(28px) scale(.98)",
          opacity: 0,
        },
        {
          transform: "none",
          opacity: 1,
        },
      ],
      {
        duration: 380,
        easing: "cubic-bezier(.2,.9,.2,1)",
      }
    );
}
function rvClose() {
  const bg = $("rvBg");
  if (!bg || bg.hidden) return;
  if (rvSteps()[RV.st] !== "me") rvSync();
  try {
    localStorage.setItem("hb-rvdraft", JSON.stringify(RV.d));
  } catch (_) {}
  bg.classList.remove("on");
  SND.play("whooshin");
  setTimeout(
    () => {
      bg.hidden = true;
      bg.innerHTML = "";
      document.body.classList.remove("locked");
    },
    reducedMotion() ? 0 : 220
  );
}
function rvTip(k) {
  return `<div class="rvtip">${mamiAvatar ? mamiAvatar(null) : "👩"}<span>${escHtml(mFill ? mFill(uiText(k)) : uiText(k))}</span></div>`;
}
function rvField(id, lbl, val, o) {
  o = o || {};
  return `<label class="hlf ${o.cls || ""}"><span>${escHtml(lbl)}</span><input class="in" id="${id}" value="${escHtml(val ?? "")}" ${o.ph ? `placeholder="${escHtml(o.ph)}"` : ""} ${o.type ? `type="${o.type}"` : ""} ${o.im ? `inputmode="${o.im}"` : ""} ${o.ac ? `autocomplete="${o.ac}"` : ""}></label>`;
}
function rvStepHtml(k) {
  const d = RV.d,
    b = rvBiz(),
    sum = rvSum(d);
  if (k === "me")
    return `${rvTip("rv_tip_me")}<div class="vacard rvgrid">${rvField(
      "rvBn",
      uiText("rv_b_name"),
      b.name || store.settings.name || "",
      {
        cls: "w2",
        ac: "organization",
      }
    )}${rvField("rvBo", uiText("rv_b_owner"), b.owner || "", {
      ac: "name",
    })}${rvField("rvBe", uiText("rv_b_mail"), b.email || "", {
      type: "email",
      ac: "email",
    })}${rvField("rvBs", uiText("rv_b_street"), b.street || "", {
      cls: "w2",
      ac: "street-address",
    })}${rvField("rvBc", uiText("rv_b_city"), b.city || "", {
      cls: "w2",
      ph: "50667 Köln",
    })}${rvField("rvBt", uiText("rv_b_tel"), b.tel || "", {
      type: "tel",
    })}${rvField("rvBw", uiText("rv_b_web"), b.web || "")}</div>
    <div class="vacard rvgrid"><b class="rvsub w2">${escHtml(uiText("rv_b_tax"))}</b>${rvField(
      "rvBx",
      uiText("rv_b_taxno"),
      b.taxNo || "",
      {
        ph: "215/5000/1234",
      }
    )}${rvField("rvBv", uiText("rv_b_vat"), b.vatId || "", {
      ph: "DE123456789",
    })}
      <label class="rvtog w2"><input type="checkbox" id="rvBk" ${b.klein ? "checked" : ""}><span class="sw"></span><span><b>${escHtml(uiText("rv_b_klein"))}</b><small>${escHtml(uiText("rv_b_klein_s"))}</small></span></label></div>
    <div class="vacard rvgrid"><b class="rvsub w2">${escHtml(uiText("rv_b_bank"))}</b>${rvField(
      "rvBi",
      uiText("rv_b_iban"),
      b.iban || "",
      {
        cls: "w2",
        ph: "DE00 0000 0000 0000 0000 00",
      }
    )}${rvField("rvBb", uiText("rv_b_bic"), b.bic || "")}${rvField("rvBn2", uiText("rv_b_bankn"), b.bank || "")}
      </div>
    <div class="vacard rvgrid"><b class="rvsub w2">${escHtml(uiText("rv_nr_h"))}</b>${rvField(
      "rvBst",
      uiText("rv_nr_start"),
      b.nrStart || "",
      {
        im: "numeric",
        ph: "1",
      }
    )}${rvField("rvBsf", uiText("rv_nr_suf"), b.nrSuf || "", {
      ph: "z. B. -MF",
    })}${rvField("rvBp", uiText("rv_nr_pre"), b.nrPre || "", {
      ph: "RE-",
    })}<label class="kidedu rvnry"><input type="checkbox" id="rvBy" ${b.nrYear ? "checked" : ""}> <span>${escHtml(uiText("rv_nr_year"))}</span></label><small class="rvhint w2" id="rvNrN">${escHtml(
      uiText("rv_nr_next", {
        n: rchNextNr(b),
      })
    )}</small>
      <div class="hlf w2"><span>${escHtml(uiText("rv_b_logo"))}</span><div class="rvlogo"><span class="rvlimg ${b.logoA ? "tr" : ""}" style="${b.logoA ? `--lbg:${b.color === "none" ? "#ffffff" : b.color || RV_COL[0]}` : ""}">${b.logo ? `<img src="${b.logoPng || b.logo}" alt="">` : svgIcon("image", 26)}</span><span class="rvlbt"><button type="button" class="btn" data-rvlogo>${svgIcon("plusIn", 16)} ${escHtml(uiText(b.logo ? "rv_b_logo_chg" : "rv_b_logo_add"))}</button>${b.logo ? `<button type="button" class="btn ghost" data-rvlogodel>${svgIcon("trash", 15)} ${escHtml(uiText("rv_b_logo_del"))}</button>` : ""}</span><input type="file" id="rvLogoF" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></div><small class="rvhint">${escHtml(uiText("rv_b_logo_s"))}</small></div>
      <div class="hlf w2"><span>${escHtml(uiText("rv_b_color"))}</span><div class="rvcols">${RV_COL.map((c) => `<button type="button" class="rvcol ${(b.color || RV_COL[0]) === c ? "on" : ""}" style="--c:${c}" data-rvcol="${c}" aria-label="${c}"></button>`).join("")}<label class="rvcol rvcust ${b.color && b.color !== "none" && !RV_COL.includes(b.color) ? "on" : ""}" style="--c:${b.color && b.color !== "none" && !RV_COL.includes(b.color) ? b.color : "#ffffff"}" title="${escHtml(uiText("rv_col_own"))}"><input type="color" id="rvColC" value="${/^#[0-9a-f]{6}$/i.test(b.color || "") ? b.color : "#147a5b"}" aria-label="${escHtml(uiText("rv_col_own"))}">${svgIcon("palette", 15)}</label><button type="button" class="rvcol rvnone ${b.color === "none" ? "on" : ""}" data-rvcol="none" title="${escHtml(uiText("rv_col_none"))}" aria-label="${escHtml(uiText("rv_col_none"))}"></button></div></div></div>`;
  if (k === "kunde") {
    const ks = rvKunden(),
      y = new Date().getFullYear();
    let tx = [];
    try {
      tx = (kundenOf(y).list || [])
        .map((x) => x.name || x)
        .filter((n) => n && !ks.some((k) => k.name === n))
        .slice(0, 6);
    } catch (_) {}
    if (!d.kid && !d.k.nr) d.k.nr = rvKnrNext();
    const dup = rvKnrDup(d.k.nr, d.kid),
      lon = store.settings.logos === true;
    if (lon)
      setTimeout(() => {
        for (const c of ks)
          if (!c.lt || (!c.ld && Date.now() - (c.lt || 0) > 30 * 864e5))
            rvKLogo(c).then((ok) => {
              if (ok) rvKAvUpd();
            });
      }, 200);
    return `${rvTip("rv_tip_k")}${rvLearnUi()}<div class="vacard rvks">${ks.map((c) => `<button type="button" class="rvk ${d.kid === c.id ? "on" : ""}" data-rvk="${escHtml(c.id)}">${rvKAv(c)}<span class="grow"><b>${escHtml(c.name)}</b><small>${escHtml([c.person, c.city].filter(Boolean).join(" · ") || " ")}</small></span>${c.nr ? `<span class="rvknr" data-noi18n>${escHtml(c.nr)}</span>` : ""}</button>`).join("")}${tx
      .map(
        (n) =>
          `<button type="button" class="rvk" data-rvkn="${escHtml(n)}">${rvKAv({
            name: n,
          })}<span class="grow"><b>${escHtml(n)}</b><small>${escHtml(uiText("rv_k_from_tx"))}</small></span>${svgIcon("plus", 16)}</button>`
      )
      .join("")}
      <button type="button" class="rvk ${!d.kid && !d.k.name ? "on" : ""}" data-rvknew><span class="rvav rvplus">${svgIcon("plus", 18)}</span><span class="grow"><b>${escHtml(uiText("rv_k_newrow"))}</b><small>${escHtml(
        uiText("rv_k_newrow_s", {
          n: d.kid ? rvKnrNext() : d.k.nr || rvKnrNext(),
        })
      )}</small></span></button></div>
      <div class="vacard rvgrid"><div class="rvkhd w2">${rvKAv(d.k, 1).replace('<span class="rvav', '<span id="rvKAv" class="rvav')}<b class="rvsub grow">${escHtml(d.kid ? uiText("rv_k_edit") : uiText("rv_k_new"))}</b>${d.kid ? `<button type="button" class="rvkdel" data-rvkdel>${svgIcon("trash", 15)} ${escHtml(uiText("rv_k_del"))}</button>` : ""}</div>${rvField(
        "rvKn",
        uiText("rv_k_name"),
        d.k.name,
        {
          cls: "w2",
          ph: "z. B. Studio Nord GmbH",
        }
      )}${rvField("rvKnr", uiText("rv_k_nr"), d.k.nr || "", {
        ph: rvKnrNext(),
      })}${rvField("rvKp", uiText("rv_k_person"), d.k.person, {
        ph: "z. B. Jana Peters",
      })}<small class="rvhint w2 rvbad" id="rvKnrD"${dup ? "" : " hidden"}>${escHtml(uiText("rv_k_nr_dup"))}</small>${rvField(
        "rvKe",
        uiText("rv_b_mail"),
        d.k.email,
        {
          type: "email",
        }
      )}${rvField("rvKw", uiText("rv_k_web"), d.k.web || "", {
        ph: "z. B. firma.de",
        im: "url",
      })}${rvField("rvKs", uiText("rv_b_street"), d.k.street, {
        cls: "w2",
      })}${rvField("rvKc", uiText("rv_b_city"), d.k.city, {
        cls: "w2",
        ph: "z. B. 20457 Hamburg",
      })}
      ${lon ? `<div class="rvklw w2"><small class="rvkls ${d.k.ld ? "ok" : ""}" id="rvKLs">${d.k.ld ? escHtml(uiText("rv_k_logo_ok")) : d.k.name ? escHtml(uiText("rv_k_logo_hint")) : escHtml(uiText("rv_k_logo_hint"))}</small>${d.k.ld ? `<button type="button" class="rvklx" data-rvkldel>${escHtml(uiText("rv_k_logo_del"))}</button>` : ""}</div>` : `<div class="rvkoff w2">${svgIcon("image", 18)}<span class="grow">${escHtml(uiText("rv_k_logo_off"))}</span><button type="button" class="btn" data-rvklon>${escHtml(uiText("rv_k_logo_on"))}</button></div>`}</div>`;
  }
  if (k === "pos") {
    const its = rvItemsSorted().filter((i) => !d.pos.some((p) => p.n === i.n));
    return `${rvTip("rv_tip_pos")}<div class="vacard rvpos">${
      d.pos
        .map(
          (
            p,
            i
          ) => `<div class="rvp" data-rvi="${i}"><div class="rvpn"><input class="in" data-rvpf="n" value="${escHtml(p.n)}" placeholder="${escHtml(uiText("rv_p_name"))}" aria-label="${escHtml(uiText("rv_p_name"))}"><div class="rvpm"><label><input class="in" data-rvpf="p" inputmode="decimal" value="${escHtml(numStr(p.p))}" placeholder="0,00" aria-label="${escHtml(uiText("rv_p_price"))}"><span>€ ${escHtml(uiText("rv_p_per"))}</span></label><input class="in rvu" data-rvpf="u" value="${escHtml(p.u || "")}" placeholder="${escHtml(uiText("rv_p_unit"))}" aria-label="${escHtml(uiText("rv_p_unit"))}">${b.klein ? "" : `<select class="in rvvs" data-rvpf="v" aria-label="${escHtml(uiText("rv_d_vat"))}">${[19, 7, 0].map((n) => `<option value="${n}" ${Number(p.v === undefined || p.v === null || p.v === "" ? d.vat : p.v) === n ? "selected" : ""}>${n} %</option>`).join("")}</select>`}</div></div>
        <div class="rvq"><button type="button" data-rvq="-1" aria-label="${escHtml(uiText("rv_less"))}">${svgIcon("minus", 15)}</button><input class="in" data-rvpf="q" inputmode="decimal" value="${escHtml(numStr(p.q))}" aria-label="${escHtml(uiText("rv_p_qty"))}"><button type="button" class="pl" data-rvq="1" aria-label="${escHtml(uiText("rv_more"))}">${svgIcon("plus", 15)}</button></div>
        <b class="rvpt" data-noi18n>${escHtml(rvEuro((Number(p.q) || 0) * (Number(p.p) || 0)))}</b><button type="button" class="rvpd" data-rvpdel aria-label="${escHtml(uiText("tm_del"))}">${svgIcon("x", 15)}</button></div>`
        )
        .join("") || `<p class="rvempty">${escHtml(uiText("rv_p_empty"))}</p>`
    }
      <div class="rvchips"><button type="button" class="chip on" data-rvadd>${svgIcon("plus", 14)} ${escHtml(uiText("rv_p_new"))}</button></div></div>
      ${rvLearnUi()}${rvItems().length ? `<div class="vacard rvitb"><div class="rvithd"><b class="rvsub">${escHtml(uiText("rv_it_h"))}</b><button type="button" class="rvklx" data-rvitall>${escHtml(uiText("rv_it_edit"))}</button></div><input class="in" id="rvItQ2" type="search" value="${escHtml(RV.itq || "")}" placeholder="${escHtml(uiText("rv_it_search"))}" aria-label="${escHtml(uiText("rv_it_search"))}"><div id="rvItL2">${rvItRows(its)}</div></div>` : ""}
      <div class="vacard rvsumc"><span>${escHtml(uiText("rv_sub"))}<small>${
        sum.rate === -1
          ? escHtml(uiText("rv_plus_vat_mix"))
          : sum.rate
            ? escHtml(
                uiText("rv_plus_vat", {
                  n: String(sum.rate),
                })
              )
            : b.klein
              ? escHtml(uiText("rv_klein_s"))
              : ""
      }</small></span><b id="rvSumB" data-noi18n>${escHtml(rvEuro(sum.net))}</b></div>`;
  }
  if (k === "det") {
    const zs = [7, 14, 30];
    if (!zs.includes(Number(d.z))) zs.push(Number(d.z));
    zs.sort((a, c) => a - c);
    const typ = d.typ || "r",
      own = rchList().filter((i) => i.doc && i.kunde === d.k.name && i.id !== d.id),
      abs = own.filter((i) => i.typ === "a"),
      refs = rchList()
        .filter((i) => !i.gs && i.id !== d.id && (!d.k.name || i.kunde === d.k.name))
        .slice(-12)
        .reverse();
    return `${rvTip("rv_tip_det")}<div class="vacard rvgrid"><div class="hlf w2"><span>${escHtml(uiText("rv_typ"))}</span><div class="seg rvseg">${["r", "a", "g"].map((t) => `<button type="button" class="${typ === t ? "on" : ""}" data-rvtyp="${t}">${escHtml(uiText("rv_typ_" + t))}</button>`).join("")}</div><small class="rvhint">${escHtml(uiText("rv_typ_" + typ + "_s"))}</small></div>
      ${typ === "g" ? `<label class="hlf w2"><span>${escHtml(uiText("rv_ref"))}</span><select class="in" id="rvDr"><option value="">${escHtml(uiText("rv_ref_none"))}</option>${refs.map((i) => `<option value="${escHtml(i.nr)}" ${d.ref === i.nr ? "selected" : ""}>${escHtml(i.nr)} · ${escHtml(i.kunde || "")} · ${escHtml(rvEuro(i.amt))}</option>`).join("")}</select></label>` : ""}
      ${
        typ === "r" && abs.length
          ? `<div class="hlf w2"><span>${escHtml(uiText("rv_abz_h"))}</span>${abs
              .map(
                (i) =>
                  `<label class="rvtog"><input type="checkbox" data-rvabz="${escHtml(i.id)}" ${(d.abz || []).some((a) => a.nr === i.nr) ? "checked" : ""}><span class="sw"></span><span><b data-noi18n>${escHtml(i.nr)} · ${escHtml(rvEuro(i.amt))}</b><small data-noi18n>${escHtml(
                    fxDate(i.date, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  )}</small></span></label>`
              )
              .join("")}</div>`
          : ""
      }</div>
      <div class="vacard rvgrid">${rvField("rvDn", uiText("rch_nr"), d.nr)}${rvField(
        "rvDd",
        uiText("rch_date"),
        d.date,
        {
          type: "date",
        }
      )}${rvField("rvDl", uiText("rv_d_lz"), d.lz, {
        cls: "w2",
        ph: uiText("rv_d_lz_ph"),
      })}
      ${
        typ === "g"
          ? ""
          : `<div class="hlf w2"><span>${escHtml(uiText("rch_days"))}</span><div class="seg rvseg">${zs.map((n) => `<button type="button" class="${Number(d.z) === n ? "on" : ""}" data-rvz="${n}">${n} ${escHtml(uiText("rch_tage"))}</button>`).join("")}</div><small class="rvhint">${escHtml(
              uiText("rv_d_due", {
                d: fxDate(addDays(d.date, Number(d.z) || 14), {
                  day: "numeric",
                  month: "long",
                }),
              })
            )}</small></div>`
      }
      ${b.klein ? `<div class="hlf w2"><span>${escHtml(uiText("rv_d_vat"))}</span><div class="rvinfo">${escHtml(uiText("rv_klein_s"))}</div></div>` : `<div class="hlf w2"><span>${escHtml(uiText("rv_d_vat"))}</span><div class="seg rvseg">${[19, 7, 0].map((n) => `<button type="button" class="${Number(d.vat) === n ? "on" : ""}" data-rvvat="${n}">${n} %</button>`).join("")}</div></div>`}</div>
      <div class="vacard rvgrid"><div class="hlf"><span>${escHtml(uiText("rv_d_lang"))}</span><div class="seg rvseg"><button type="button" class="${d.lang !== "en" ? "on" : ""}" data-rvlang="de">Deutsch</button><button type="button" class="${d.lang === "en" ? "on" : ""}" data-rvlang="en">English</button></div></div>${rvField(
        "rvDrb",
        uiText("rv_d_rab"),
        d.rab ? numStr(d.rab) : "",
        {
          im: "decimal",
          ph: "0",
        }
      )}</div>
      <div class="vacard rvgrid">${rvField("rvDt", uiText("rv_d_title"), d.title, {
        cls: "w2",
        ph: "Logo & Visitenkarten",
      })}<label class="hlf w2"><span>${escHtml(uiText("rv_d_intro"))}</span><textarea class="in" id="rvDi" rows="3">${escHtml(d.intro)}</textarea></label><label class="hlf w2"><span>${escHtml(uiText("rv_d_note"))}</span><textarea class="in" id="rvDo" rows="2" placeholder="${escHtml(uiText("rv_d_note_ph"))}">${escHtml(d.note)}</textarea></label></div>`;
  }
  const C = rvCheck();
  return `${rvTip(C.every((c) => c.ok) ? "rv_tip_ok" : "rv_tip_miss")}<div class="vacard rvtot"><small>${escHtml(uiText("rv_total"))}</small><b data-noi18n id="rvTot">${escHtml(rvEuro(sum.gross))}</b><span data-noi18n>${escHtml(d.k.name || "–")} · ${escHtml(d.nr)} · ${escHtml(
    uiText("rv_d_due", {
      d: fxDate(addDays(d.date, Number(d.z) || 14), {
        day: "numeric",
        month: "long",
      }),
    })
  )}</span></div>
    <div class="vacard rvchk"><b class="rvsub">${escHtml(uiText("rv_chk_h"))}</b>${C.map((c) => `<button type="button" class="rvc ${c.ok ? "ok" : "no"}" ${c.ok ? "" : `data-rvgo="${c.go}"`}><i>${svgIcon(c.ok ? "check" : "alert", 14)}</i><span>${escHtml(uiText(c.k))}</span>${c.ok ? "" : svgIcon("right", 15)}</button>`).join("")}</div>
    ${
      (d.typ || "r") === "r" && !d.recId
        ? `<div class="vacard rvgrid"><div class="hlf w2"><span>${escHtml(uiText("rv_rep"))}</span><div class="seg rvseg">${[0, 1, 3, 12].map((n) => `<button type="button" class="${Number(d.rep || 0) === n ? "on" : ""}" data-rvrep="${n}">${escHtml(uiText("rv_rep_" + n))}</button>`).join("")}</div><small class="rvhint">${escHtml(
            Number(d.rep) > 0
              ? uiText("rv_rep_s", {
                  d: fxDate(rvAddM(d.date, Number(d.rep)), {
                    day: "numeric",
                    month: "long",
                  }),
                })
              : uiText("rv_rep_s0")
          )}</small></div></div>`
        : ""
    }
    <div class="rvzc rvzm" tabindex="0"><span class="rvpl rvplm">${escHtml(uiText("rv_zoom_touch"))}</span>${rvzBar()}<div class="rvpaperm rvzi" id="rvPM" data-noi18n translate="no">${rvSvg(d)}</div></div>
    <div class="rvlockh">${svgIcon("lock", 15)}<span>${escHtml(uiText("rv_lock_h"))}</span></div>
    <div class="rvacts"><button type="button" class="btn" data-rvpdf>${svgIcon("dl", 17)} ${escHtml(uiText("rv_pdf"))}</button><button type="button" class="btn" data-rvmail>${svgIcon("mail", 17)} ${escHtml(uiText("rv_mail"))}</button></div>`;
}
function rvCheck() {
  const d = RV.d,
    b = rvBiz(),
    st = rvSteps();
  const go = (k) => Math.max(0, st.indexOf(k));
  return [
    {
      k: "rv_c_me",
      ok: !!(b.name && b.street && b.city),
      go: "me",
    },
    {
      k: "rv_c_tax",
      ok: !!(b.taxNo || b.vatId),
      go: "me",
    },
    {
      k: "rv_c_k",
      ok: !!(d.k.name && (d.k.street || d.k.city)),
      go: "kunde",
    },
    {
      k: "rv_c_pos",
      ok: d.pos.length > 0 && d.pos.every((p) => p.n && Number(p.q) > 0),
      go: "pos",
    },
    {
      k: "rv_c_date",
      ok: !!d.date,
      go: "det",
    },
    {
      k: "rv_c_nr",
      ok: !!d.nr && !rchList().some((i) => i.nr === d.nr && i.id !== d.id),
      go: "det",
    },
    {
      k: "rv_c_iban",
      ok: !!b.iban,
      go: "me",
    },
    ...(rvSum(d).pay < 0
      ? [
          {
            k: "rv_c_pay",
            ok: false,
            go: "det",
          },
        ]
      : []),
  ].map((c) => ({
    ...c,
    go: c.go === "me" && !st.includes("me") ? "me" : c.go,
  }));
}
function rvRender() {
  const d = RV.d,
    st = rvSteps(),
    k = st[RV.st] || "chk",
    nav = $("rvNav"),
    body = $("rvBody");
  if (!body) return;
  const sum = rvSum(d);
  $("rvSub").textContent = uiText("rch_nr") + " " + (d.nr || "");
  const lab = {
    me: ["rv_s_me", rvBiz().name || uiText("rv_s_me_s")],
    kunde: ["rv_s_k", d.k.name || uiText("rv_s_k_s")],
    pos: [
      "rv_s_pos",
      d.pos.length
        ? uiText("rv_s_pos_n", {
            n: String(d.pos.length),
            a: rvEuro(sum.net),
          })
        : uiText("rv_s_pos_s"),
    ],
    det: ["rv_s_det", rvDate(d.date) + " · " + d.z + " " + uiText("rch_tage")],
    chk: ["rv_s_chk", rvEuro(sum.gross)],
  };
  nav.innerHTML = `<div class="rvbar" aria-hidden="true"><i style="--p:${(RV.st + 1) / st.length}"></i></div>${st.map((s, i) => `<button type="button" class="rvst ${i === RV.st ? "on" : i < RV.st ? "done" : ""}" data-rvst="${i}" ${i === RV.st ? 'aria-current="step"' : ""}><span class="rvsn">${i < RV.st ? svgIcon("check", 14) : i + 1}</span><span class="rvstt"><b>${escHtml(uiText(lab[s][0]))}</b><small data-noi18n>${escHtml(lab[s][1])}</small></span></button>`).join("")}`;
  const last = RV.st === st.length - 1;
  body.innerHTML = `<div class="rvstep" data-k="${k}"><small class="rvcount">${escHtml(
    uiText("rv_step_n", {
      i: String(RV.st + 1),
      m: String(st.length),
    })
  )}</small><h2 class="rvh">${escHtml(uiText(lab[k][0] + "_q"))}</h2>${rvStepHtml(k)}</div>
    <div class="rvfoot">${RV.st > 0 ? `<button type="button" class="btn" data-rvback>${escHtml(uiText("rv_back"))}</button>` : ""}${
      last
        ? `<button type="button" class="btn primary" data-rvfin>${svgIcon("check", 17)} ${escHtml(uiText(d.id ? "rv_fin_upd" : "rv_fin"))}</button>`
        : `<button type="button" class="btn primary" data-rvnext>${escHtml(
            uiText("rv_next", {
              s: uiText(lab[st[RV.st + 1]][0]),
            })
          )} ${svgIcon("right", 16)}</button>`
    }</div>`;
  rvPrev();
  if (!reducedMotion()) {
    const s = body.querySelector(".rvstep");
    s.animate(
      [
        {
          transform: `translateX(${RV.dir * 34}px)`,
          opacity: 0,
        },
        {
          transform: "none",
          opacity: 1,
        },
      ],
      {
        duration: 340,
        easing: "cubic-bezier(.2,.9,.2,1)",
      }
    );
    [...s.querySelectorAll(".vacard,.rvtip,.rvks,.rvpaperm,.rvacts")].forEach((e, i) =>
      e.animate(
        [
          {
            transform: "translateY(10px)",
            opacity: 0,
          },
          {
            transform: "none",
            opacity: 1,
          },
        ],
        {
          duration: 320,
          delay: 60 + i * 45,
          easing: "ease-out",
          fill: "backwards",
        }
      )
    );
  }
}
/* Vorschau zoomen: Mausrad (PC), zwei Finger (Tablet/Handy), Doppelklick/-tipp, Ziehen zum Verschieben */
const RVZ = {
  p: new Map(),
};
function rvItSub(i) {
  const p = [];
  if (i.t)
    p.push(
      uiText("rv_it_last", {
        d: fxDate(i.t, {
          day: "2-digit",
          month: "2-digit",
        }),
      })
    );
  else if (i.c)
    p.push(
      uiText("rv_it_used", {
        n: String(i.c),
      })
    );
  else p.push(uiText("rv_it_new"));
  if (i.c && i.t)
    p.push(
      uiText("rv_it_used", {
        n: String(i.c),
      })
    );
  if (i.v !== undefined && i.v !== null && i.v !== "") p.push(i.v + " %");
  return p.join(" · ");
}
function rvItRows(its) {
  const f = String(RV.itq || "")
      .toLowerCase()
      .trim(),
    L = its.filter((i) => !f || i.n.toLowerCase().includes(f)),
    more = !f && !RV.itAll && L.length > 5,
    S2 = more ? L.slice(0, 5) : L;
  return (
    (S2.map(
      (i) =>
        `<button type="button" class="rvitr" data-rvitem="${escHtml(i.n)}"><span class="grow"><b data-noi18n>${escHtml(i.n)}</b><small>${escHtml(rvItSub(i))}</small></span><b class="rvitpr" data-noi18n>${escHtml(rvEuro(i.p))}${i.u ? `<small>/ ${escHtml(i.u)}</small>` : ""}</b><span class="rvitad">${svgIcon("plus", 16)}</span></button>`
    ).join("") || `<p class="rvempty">${escHtml(uiText(its.length ? "rv_it_nohit" : "rv_it_alladded"))}</p>`) +
    (more
      ? `<button type="button" class="rvitmore" data-rvitmore>${escHtml(
          uiText("rv_it_all", {
            n: String(L.length),
          })
        )} ›</button>`
      : "")
  );
}
const KD = {
  id: null,
  q: "",
  nw: 0,
};
function kdOpen(id) {
  KD.id = id === undefined ? null : id;
  KD.q = "";
  KD.nw = 0;
  hbSheet("kdBg", uiText("kd_h"));
  kdRender(true);
}
function kdRow(c) {
  const sub = [c.person, c.city].filter(Boolean).join(" · ");
  return `<button type="button" class="kdr ${KD.id === c.id ? "on" : ""}" data-kdsel="${escHtml(c.id)}">${rvKAv(c)}<span class="grow"><b data-noi18n>${escHtml(c.name || "–")}</b><small data-noi18n>${escHtml(sub || c.email || uiText("kd_nodata"))}</small></span>${c.nr ? `<span class="rvknr" data-noi18n>${escHtml(c.nr)}</span>` : ""}${svgIcon(KD.id === c.id ? "up" : "down", 16)}</button>`;
}
function kdForm(c) {
  const F = (id, l, v, o) => rvField(id, l, v, o);
  const dup = rvKnrDup(c.nr, c.id);
  return `<div class="kdf rvgrid" data-kdid="${escHtml(c.id || "")}">${F("kdN", uiText("rv_k_name"), c.name || "", {
    cls: "w2",
    ph: "z. B. Studio Nord GmbH",
  })}${F("kdNr", uiText("rv_k_nr"), c.nr || "", {
    ph: rvKnrNext(),
  })}${F("kdP", uiText("rv_k_person"), c.person || "", {
    ph: "z. B. Jana Peters",
  })}<small class="rvhint w2 rvbad" id="kdNrD"${dup ? "" : " hidden"}>${escHtml(uiText("rv_k_nr_dup"))}</small>${F(
    "kdE",
    uiText("rv_b_mail"),
    c.email || "",
    {
      type: "email",
    }
  )}${F("kdW", uiText("rv_k_web"), c.web || "", {
    ph: "z. B. firma.de",
    im: "url",
  })}${F("kdS", uiText("rv_b_street"), c.street || "", {
    cls: "w2",
  })}${F("kdC", uiText("rv_b_city"), c.city || "", {
    cls: "w2",
    ph: "z. B. 20457 Hamburg",
  })}
    <div class="kdbtns w2">${c.id ? `<button type="button" class="rvkdel" data-kddel>${svgIcon("trash", 15)} ${escHtml(uiText("rv_k_del"))}</button>` : ""}<span class="grow"></span>${c.id ? `<button type="button" class="btn" data-kdinv>${svgIcon("pen", 15)} ${escHtml(uiText("kd_inv"))}</button>` : ""}<button type="button" class="btn primary" data-kdsave>${escHtml(uiText("ra_save"))}</button></div></div>`;
}
function kdRender(first) {
  const bg = $("kdBg");
  if (!bg || bg.hidden) return;
  const b = bg.querySelector(".hobody"),
    f = KD.q.toLowerCase().trim(),
    L = rvKunden()
      .slice()
      .sort((a, c) => String(a.name || "").localeCompare(String(c.name || ""), "de")),
    F = L.filter((c) => !f || [c.name, c.nr, c.person, c.city, c.email].join(" ").toLowerCase().includes(f));
  const nw = {
    id: "",
    name: "",
    nr: rvKnrNext(),
  };
  b.innerHTML = `${rvLearnUi()}<div class="kdtop"><input class="in" id="kdQ" type="search" value="${escHtml(KD.q)}" placeholder="${escHtml(uiText("kd_search"))}" aria-label="${escHtml(uiText("kd_search"))}"><button type="button" class="btn primary" data-kdnew>${svgIcon("plus", 16)} ${escHtml(uiText("rv_k_newrow"))}</button></div>
    ${KD.nw ? `<div class="vacard kdnew"><b class="rvsub">${escHtml(uiText("rv_k_new"))}</b>${kdForm(nw)}</div>` : ""}
    <div class="vacard kdl" id="kdL">${F.map((c) => kdRow(c) + (KD.id === c.id ? kdForm(c) : "")).join("") || `<p class="rvempty">${escHtml(uiText(L.length ? "rv_it_nohit" : "kd_empty"))}</p>`}</div>`;
  if (first && !reducedMotion())
    b.querySelectorAll(".kdr").forEach((r, i) =>
      r.animate(
        [
          {
            opacity: 0,
            transform: "translateY(10px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 360,
          delay: Math.min(i, 10) * 40,
          easing: "cubic-bezier(.2,1.2,.35,1)",
          fill: "backwards",
        }
      )
    );
  const fm = b.querySelector(".kdf");
  if (fm && !first && !reducedMotion())
    fm.animate(
      [
        {
          opacity: 0,
          transform: "translateY(-6px)",
        },
        {
          opacity: 1,
          transform: "none",
        },
      ],
      {
        duration: 280,
        easing: "cubic-bezier(.2,.9,.3,1)",
      }
    );
  if (store.settings.logos === true)
    for (const c of L)
      if (!c.lt)
        rvKLogo(c).then((ok) => {
          if (ok) {
            const r = document.querySelector(`#kdBg [data-kdsel="${CSS.escape(c.id)}"] .rvav`);
            if (r) r.outerHTML = rvKAv(c);
          }
        });
}
function kdVals() {
  const v = (id) => {
    const e = $(id);
    return e ? e.value.trim() : "";
  };
  return {
    name: v("kdN"),
    nr: v("kdNr"),
    person: v("kdP"),
    email: v("kdE"),
    web: v("kdW"),
    street: v("kdS"),
    city: v("kdC"),
  };
}
document.addEventListener("input", (e) => {
  if (!e.target.closest || !e.target.closest("#kdBg")) return;
  if (e.target.id === "kdQ") {
    KD.q = e.target.value;
    const l = $("kdL"),
      p = e.target.selectionStart;
    kdRender();
    const q = $("kdQ");
    if (q) {
      q.focus();
      try {
        q.setSelectionRange(p, p);
      } catch (_) {}
    }
    return;
  }
  if (e.target.id === "kdNr") {
    const fm = e.target.closest(".kdf"),
      d = $("kdNrD");
    if (d) d.hidden = !rvKnrDup(e.target.value, fm.dataset.kdid || "");
  }
});
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("[data-kdopen]")) {
    kdOpen();
    return;
  }
  if (!t.closest || !t.closest("#kdBg")) return;
  const sel = t.closest("[data-kdsel]");
  if (sel) {
    KD.id = KD.id === sel.dataset.kdsel ? null : sel.dataset.kdsel;
    KD.nw = 0;
    kdRender();
    SND.play("tick");
    return;
  }
  if (t.closest("[data-kdnew]")) {
    KD.nw = 1;
    KD.id = null;
    kdRender();
    setTimeout(() => {
      const n = $("kdN");
      n && n.focus();
    }, 60);
    return;
  }
  if (t.closest("[data-kdsave]")) {
    const fm = t.closest(".kdf"),
      id = fm.dataset.kdid || "",
      v = kdVals();
    if (!v.name) {
      toast(uiText("kd_need_name"));
      return;
    }
    if (rvKnrDup(v.nr, id)) {
      toast(uiText("rv_k_nr_dup"));
      return;
    }
    let c = rvKunden().find((x) => x.id === id);
    if (!c) {
      c = {
        id: "k" + Date.now().toString(36),
      };
      rvKunden().push(c);
    }
    const oldKey = rvKDoms(c).join("|");
    Object.assign(c, v, {
      nr: v.nr || c.nr || rvKnrNext(),
    });
    if (rvKDoms(c).join("|") !== oldKey) {
      delete c.lt;
    }
    await saveSettings();
    KD.id = null;
    KD.nw = 0;
    kdRender();
    toast(uiText("kd_saved"));
    if (store.settings.logos === true)
      rvKLogo(c).then((ok) => {
        if (ok) kdRender();
      });
    try {
      render();
    } catch (_) {}
    return;
  }
  if (t.closest("[data-kddel]")) {
    const id = t.closest(".kdf").dataset.kdid,
      L = rvKunden(),
      ix = L.findIndex((x) => x.id === id);
    if (ix < 0) return;
    const c = L[ix];
    L.splice(ix, 1);
    KD.id = null;
    await saveSettings();
    kdRender();
    try {
      render();
    } catch (_) {}
    toast(
      uiText("rv_k_deleted", {
        n: c.name,
      }),
      async () => {
        if (!rvKunden().some((x) => x.id === c.id)) rvKunden().splice(Math.min(ix, rvKunden().length), 0, c);
        await saveSettings();
        kdRender();
        try {
          render();
        } catch (_) {}
      }
    );
    return;
  }
  if (t.closest("[data-kdinv]")) {
    const c = rvKunden().find((x) => x.id === t.closest(".kdf").dataset.kdid);
    if (!c) return;
    hbSheetClose("kdBg");
    const d = rvNew();
    d.kid = c.id;
    d.k = {
      name: c.name,
      person: c.person || "",
      street: c.street || "",
      city: c.city || "",
      email: c.email || "",
      nr: c.nr || "",
      web: c.web || "",
      ld: c.ld || "",
      lk: c.lk,
      lt: c.lt,
    };
    setTimeout(() => {
      rvOpen(d);
      try {
        const i = rvSteps().indexOf("pos");
        if (i > 0 && RV.meDone) {
          RV.st = i;
          rvRender();
        }
      } catch (_) {}
    }, 230);
    return;
  }
  if (t.closest("[data-rvlearn]")) {
    await rvLearn();
    kdRender();
    return;
  }
});
function rvItOpen(q) {
  const b = hbSheet("rvItBg", uiText("rv_it_h"));
  const bg = $("rvItBg");
  if (bg) bg.style.zIndex = 260;
  const L = rvItemsSorted(),
    f = String(q || "").toLowerCase(),
    F = L.filter((i) => !f || i.n.toLowerCase().includes(f));
  b.innerHTML = `<div class="rvits"><input class="in" id="rvItQ" type="search" value="${escHtml(q || "")}" placeholder="${escHtml(uiText("rv_it_search"))}" aria-label="${escHtml(uiText("rv_it_search"))}"></div>
    <div class="vacard rvitl" id="rvItL">${
      F.map(
        (i) =>
          `<div class="rvit" data-rvitn="${escHtml(i.n)}"><span class="grow"><b data-noi18n>${escHtml(i.n)}</b><small>${escHtml(
            i.c
              ? uiText("rv_it_used", {
                  n: String(i.c),
                })
              : uiText("rv_it_new")
          )}${i.v !== undefined && i.v !== null && i.v !== "" ? " · " + escHtml(String(i.v)) + " %" : ""}</small></span><label class="rvitp"><input class="in" data-rvitp inputmode="decimal" value="${escHtml(numStr(i.p))}" aria-label="${escHtml(uiText("rv_p_price"))}"><span>€${i.u ? " / " + escHtml(i.u) : ""}</span></label><button type="button" class="rvitx" data-rvitdel aria-label="${escHtml(uiText("rv_it_del"))}">${svgIcon("x", 15)}</button><button type="button" class="rvitad" data-rvitadd aria-label="${escHtml(uiText("rv_it_add"))}">${svgIcon("plus", 16)}</button></div>`
      ).join("") || `<p class="rvempty">${escHtml(uiText(L.length ? "rv_it_nohit" : "rv_it_none"))}</p>`
    }</div>`;
  if (!q && !reducedMotion())
    b.querySelectorAll(".rvit").forEach((r, i) =>
      r.animate(
        [
          {
            opacity: 0,
            transform: "translateY(10px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 360,
          delay: Math.min(i, 10) * 40,
          easing: "cubic-bezier(.2,1.2,.35,1)",
          fill: "backwards",
        }
      )
    );
}
document.addEventListener("input", (e) => {
  if (e.target.id === "rvItQ2") {
    RV.itq = e.target.value;
    const l = $("rvItL2");
    if (l && RV.d) l.innerHTML = rvItRows(rvItemsSorted().filter((i) => !RV.d.pos.some((p) => p.n === i.n)));
    return;
  }
  if (e.target.id === "rvItQ") {
    const v = e.target.value,
      p = e.target.selectionStart;
    rvItOpen(v);
    const n = $("rvItQ");
    if (n) {
      n.focus();
      try {
        n.setSelectionRange(p, p);
      } catch (_) {}
    }
    return;
  }
  if (e.target.matches && e.target.matches("[data-rvitp]")) {
    const r = e.target.closest("[data-rvitn]"),
      it = rvItems().find((i) => i.n === r.dataset.rvitn);
    if (it) {
      it.p = parseAmt(e.target.value) || 0;
      clearTimeout(RVK.ts);
      RVK.ts = setTimeout(() => saveSettings(), 500);
    }
  }
});
document.addEventListener("click", (e) => {
  const r = e.target.closest && e.target.closest("#rvItBg [data-rvitn]");
  if (!r) return;
  const n = r.dataset.rvitn;
  if (e.target.closest("[data-rvitdel]")) {
    const go = () => {
      const L = rvItems(),
        i = L.findIndex((x) => x.n === n);
      if (i >= 0) L.splice(i, 1);
      saveSettings();
      rvItOpen(($("rvItQ") || {}).value || "");
      if (RV.d && rvSteps()[RV.st] === "pos") {
        rvSync();
        rvRender();
      }
    };
    if (reducedMotion()) go();
    else
      r.animate(
        [
          {
            opacity: 1,
            transform: "none",
          },
          {
            opacity: 0,
            transform: "translateX(-50px)",
          },
        ],
        {
          duration: 220,
          easing: "ease-in",
        }
      ).finished.then(go, go);
    return;
  }
  if (e.target.closest("[data-rvitadd]")) {
    const it = rvItems().find((x) => x.n === n);
    if (it && RV.d) {
      rvSync();
      RV.d.pos.push({
        n: it.n,
        q: 1,
        u: it.u || "",
        p: it.p,
        ...(it.v !== undefined && it.v !== null && it.v !== ""
          ? {
              v: it.v,
            }
          : {}),
      });
      hbSheetClose("rvItBg");
      rvRender();
      SND.play("tick");
    }
  }
});
function rvzSt(c) {
  return (
    c._z ||
    (c._z = {
      s: 1,
      tx: 0,
      ty: 0,
    })
  );
}
function rvzApply(c, anim) {
  const z = rvzSt(c),
    i = c.querySelector(".rvzi");
  if (!i) return;
  if (z.s <= 1.001) {
    z.s = 1;
    z.tx = 0;
    z.ty = 0;
  } else {
    const W = i.offsetWidth * z.s,
      H = i.offsetHeight * z.s,
      cw = c.clientWidth,
      ch = c.clientHeight,
      ox = i.offsetLeft,
      oy = i.offsetTop;
    z.tx = W + ox * 2 <= cw ? 0 : Math.min(-ox + 8, Math.max(cw - W - ox - 8, z.tx));
    z.ty = H + oy <= ch ? 0 : Math.min(-oy + 8, Math.max(ch - H - oy - 8, z.ty));
  }
  const zoomed = z.s > 1;
  if (zoomed && !c.classList.contains("zoomed")) {
    z.ty -= c.scrollTop;
    c.scrollTop = 0;
  }
  const back = !zoomed && c.classList.contains("zoomed") ? c._sy || 0 : null;
  c.classList.toggle("zoomed", zoomed);
  i.style.transition = anim && !reducedMotion() ? "transform .28s cubic-bezier(.2,.9,.2,1)" : "none";
  i.style.transform = zoomed ? `translate(${z.tx}px,${z.ty}px) scale(${z.s})` : "";
  if (back !== null) c.scrollTop = back;
  const b = c.querySelector(".rvzp");
  if (b) b.textContent = Math.round(z.s * 100) + " %";
}
function rvzAt(c, s, cx, cy, anim) {
  const z = rvzSt(c),
    i = c.querySelector(".rvzi");
  if (!i) return;
  const r = c.getBoundingClientRect(),
    ns = Math.max(1, Math.min(5, s));
  if (z.s <= 1) {
    c._sy = c.scrollTop;
    z.ty = -c.scrollTop;
    c.scrollTop = 0;
    c.classList.add("zoomed");
  }
  const px = cx - r.left - i.offsetLeft,
    py = cy - r.top - i.offsetTop,
    ux = (px - z.tx) / z.s,
    uy = (py - z.ty) / z.s;
  z.tx = px - ux * ns;
  z.ty = py - uy * ns;
  z.s = ns;
  rvzApply(c, anim);
}
document.addEventListener(
  "wheel",
  (e) => {
    const c = e.target.closest && e.target.closest("#rvBg .rvzc");
    if (!c) return;
    e.preventDefault();
    const z = rvzSt(c);
    rvzAt(
      c,
      z.s * Math.exp(-Math.max(-60, Math.min(60, e.deltaY * (e.deltaMode === 1 ? 16 : 1))) * 0.004),
      e.clientX,
      e.clientY,
      false
    );
  },
  {
    passive: false,
  }
);
document.addEventListener("dblclick", (e) => {
  const c = e.target.closest && e.target.closest("#rvBg .rvzc");
  if (!c || e.target.closest(".rvzb")) return;
  const z = rvzSt(c);
  try {
    getSelection().removeAllRanges();
  } catch (_) {}
  rvzAt(c, z.s > 1.2 ? 1 : 2.2, e.clientX, e.clientY, true);
});
document.addEventListener("pointerdown", (e) => {
  const c = e.target.closest && e.target.closest("#rvBg .rvzc");
  if (!c || e.target.closest(".rvzb")) return;
  const z = rvzSt(c);
  RVZ.p.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
  });
  RVZ.c = c;
  if (RVZ.p.size === 2) {
    const [a, b] = [...RVZ.p.values()];
    RVZ.d0 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    RVZ.s0 = z.s;
    RVZ.m0 = {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
    RVZ.pan = null;
  } else if (z.s > 1) {
    RVZ.pan = {
      x: e.clientX,
      y: e.clientY,
      tx: z.tx,
      ty: z.ty,
    };
    try {
      c.setPointerCapture(e.pointerId);
    } catch (_) {}
    if (e.pointerType === "mouse") e.preventDefault();
  }
  if (e.pointerType !== "mouse") {
    const t = Date.now();
    if (
      RVZ.p.size === 1 &&
      t - (RVZ.tap || 0) < 300 &&
      Math.hypot(e.clientX - (RVZ.tx0 || 0), e.clientY - (RVZ.ty0 || 0)) < 30
    ) {
      rvzAt(c, z.s > 1.2 ? 1 : 2.2, e.clientX, e.clientY, true);
      RVZ.tap = 0;
    } else {
      RVZ.tap = t;
      RVZ.tx0 = e.clientX;
      RVZ.ty0 = e.clientY;
    }
  }
});
document.addEventListener(
  "pointermove",
  (e) => {
    if (!RVZ.p.has(e.pointerId)) return;
    const c = RVZ.c,
      z = rvzSt(c);
    RVZ.p.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });
    if (RVZ.p.size === 2) {
      e.preventDefault();
      const [a, b] = [...RVZ.p.values()],
        d = Math.hypot(a.x - b.x, a.y - b.y),
        m = {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        };
      rvzAt(c, (RVZ.s0 * d) / RVZ.d0, m.x, m.y, false);
      z.tx += m.x - RVZ.m0.x;
      z.ty += m.y - RVZ.m0.y;
      RVZ.m0 = m;
      RVZ.s0 = z.s;
      RVZ.d0 = d;
      rvzApply(c, false);
      return;
    }
    if (RVZ.pan && z.s > 1) {
      z.tx = RVZ.pan.tx + (e.clientX - RVZ.pan.x);
      z.ty = RVZ.pan.ty + (e.clientY - RVZ.pan.y);
      rvzApply(c, false);
    }
  },
  {
    passive: false,
  }
);
const rvzUp = (e) => {
  RVZ.p.delete(e.pointerId);
  if (RVZ.p.size < 2) {
    RVZ.d0 = null;
  }
  if (!RVZ.p.size) RVZ.pan = null;
};
document.addEventListener("pointerup", rvzUp);
document.addEventListener("pointercancel", rvzUp);
document.addEventListener("click", (e) => {
  const r = e.target.closest && e.target.closest("#rvBg [data-rvzr]");
  if (r) {
    const c = r.closest(".rvzc");
    rvzSt(c).s = 1;
    rvzApply(c, true);
  }
  const p = e.target.closest && e.target.closest("#rvBg [data-rvzp]");
  if (p) {
    const c = p.closest(".rvzc"),
      q = c.getBoundingClientRect();
    rvzAt(c, rvzSt(c).s * (p.dataset.rvzp === "1" ? 1.4 : 1 / 1.4), q.left + q.width / 2, q.top + q.height / 2, true);
  }
});
document.addEventListener("keydown", (e) => {
  const c = document.activeElement && document.activeElement.closest && document.activeElement.closest("#rvBg .rvzc");
  if (!c) return;
  const q = c.getBoundingClientRect(),
    z = rvzSt(c);
  if (e.key === "+" || e.key === "=") {
    e.preventDefault();
    rvzAt(c, z.s * 1.4, q.left + q.width / 2, q.top + q.height / 2, true);
  } else if (e.key === "-") {
    e.preventDefault();
    rvzAt(c, z.s / 1.4, q.left + q.width / 2, q.top + q.height / 2, true);
  } else if (e.key === "0") {
    z.s = 1;
    rvzApply(c, true);
  }
});
function rvzBar() {
  return `<div class="rvzb" data-noi18n><button type="button" data-rvzp="0" aria-label="${escHtml(uiText("rv_zoom_out"))}">${svgIcon("minus", 14)}</button><button type="button" class="rvzp" data-rvzr title="${escHtml(uiText("rv_zoom_reset"))}">100 %</button><button type="button" data-rvzp="1" aria-label="${escHtml(uiText("rv_zoom_in"))}">${svgIcon("plus", 14)}</button></div>`;
}
function rvPrev() {
  const p = $("rvPP");
  if (p) p.innerHTML = rvSvg(RV.d);
  const m = $("rvPM");
  if (m) m.innerHTML = rvSvg(RV.d);
}
function rvSync() {
  const d = RV.d;
  if (!d) return;
  const v = (id) => {
      const e = $(id);
      return e ? e.value : null;
    },
    b = rvBiz(),
    st = rvSteps(),
    k = st[RV.st];
  if (k === "me" && $("rvBn")) {
    const nrWas = rchNextNr(b);
    Object.assign(b, {
      name: v("rvBn").trim(),
      owner: v("rvBo").trim(),
      email: v("rvBe").trim(),
      street: v("rvBs").trim(),
      city: v("rvBc").trim(),
      tel: v("rvBt").trim(),
      web: v("rvBw").trim(),
      taxNo: v("rvBx").trim(),
      vatId: v("rvBv").trim().toUpperCase(),
      iban: v("rvBi").replace(/\s+/g, " ").trim().toUpperCase(),
      bic: v("rvBb").trim().toUpperCase(),
      bank: v("rvBn2").trim(),
      klein: $("rvBk").checked,
      nrPre: v("rvBp").trim(),
      nrSuf: $("rvBsf") ? v("rvBsf").trim() : b.nrSuf || "",
      nrYear: $("rvBy") ? $("rvBy").checked : !!b.nrYear,
      nrStart: Math.max(0, Math.floor(Number(v("rvBst")) || 0)) || "",
    });
    const nn = $("rvNrN"),
      nrNow = rchNextNr(b);
    if (nn)
      nn.textContent = uiText("rv_nr_next", {
        n: nrNow,
      });
    if (d.nr === nrWas && nrNow !== nrWas) {
      d.nr = nrNow;
      const sb = $("rvSub");
      if (sb) sb.textContent = uiText("rch_nr") + " " + nrNow;
    }
    if (!RV.d.id && !RV.d.recId && !RV.nrTouched) RV.d.nr = rchNextNr(b);
  }
  if (k === "kunde" && $("rvKn")) {
    Object.assign(d.k, {
      name: v("rvKn").trim(),
      person: v("rvKp").trim(),
      email: v("rvKe").trim(),
      street: v("rvKs").trim(),
      city: v("rvKc").trim(),
      nr: $("rvKnr") ? v("rvKnr").trim() : d.k.nr,
      web: $("rvKw") ? v("rvKw").trim() : d.k.web || "",
    });
    const dd = $("rvKnrD");
    if (dd) dd.hidden = !rvKnrDup(d.k.nr, d.kid);
  }
  if (k === "pos")
    document.querySelectorAll("#rvBody .rvp").forEach((r) => {
      const p = d.pos[+r.dataset.rvi];
      if (!p) return;
      r.querySelectorAll("[data-rvpf]").forEach((i) => {
        const f = i.dataset.rvpf;
        p[f] = f === "n" || f === "u" ? i.value : f === "v" ? Number(i.value) : parseAmt(i.value) || 0;
      });
    });
  if (k === "det" && $("rvDn")) {
    if ($("rvDr")) d.ref = v("rvDr");
  }
  if (k === "det" && $("rvDrb")) d.rab = Math.max(0, Math.min(100, parseAmt(v("rvDrb")) || 0));
  if (k === "det" && $("rvDn"))
    Object.assign(d, {
      nr: v("rvDn").trim(),
      date: v("rvDd") || isoToday(),
      lz: v("rvDl").trim(),
      title: v("rvDt").trim(),
      intro: v("rvDi"),
      note: v("rvDo"),
    });
}
function rvGo(i) {
  const st = rvSteps();
  rvSync();
  i = Math.max(0, Math.min(st.length - 1, i));
  if (i === RV.st) return;
  if (st[RV.st] === "me" && i > RV.st) {
    if (!rvBiz().name) {
      toast(uiText("rv_need_name"));
      return;
    }
    saveSettings();
  }
  if (st[RV.st] === "pos") {
    rvItemsSave(RV.d, false);
    saveSettings();
  }
  RV.dir = i > RV.st ? 1 : -1;
  RV.st = i;
  rvRender();
  SND.play("tick");
  try {
    $("rvBody").scrollTop = 0;
  } catch (_) {}
}
async function rvFinish() {
  rvSync();
  const d = RV.d,
    C = rvCheck(),
    bad = C.find((c) => !c.ok);
  if (bad) {
    toast(uiText(bad.k) + " – " + uiText("rv_fix"));
    rvGo(rvSteps().indexOf(bad.go));
    return;
  }
  const sum = rvSum(d),
    b = rvBiz();
  let c =
    rvKunden().find((x) => x.id === d.kid) || rvKunden().find((x) => x.name.toLowerCase() === d.k.name.toLowerCase());
  if (rvKnrDup(d.k.nr, c ? c.id : "")) {
    toast(uiText("rv_k_nr_dup"));
    rvGo(rvSteps().indexOf("kunde"));
    return;
  }
  if (!c) {
    c = {
      id: "k" + Date.now().toString(36),
    };
    rvKunden().push(c);
  }
  Object.assign(c, {
    name: d.k.name,
    person: d.k.person,
    street: d.k.street,
    city: d.k.city,
    email: d.k.email,
    nr: String(d.k.nr || c.nr || rvKnrNext()).trim(),
    web: d.k.web || "",
  });
  if (d.k.lk !== undefined) {
    c.ld = d.k.ld || "";
    c.lk = d.k.lk;
    c.lt = d.k.lt;
  }
  d.kid = c.id;
  d.k.nr = c.nr;
  rvItemsSave(d, true);
  const due = addDays(d.date, Number(d.z) || 14),
    typ = d.typ || "r",
    rec = {
      kunde: d.k.name,
      amt: typ === "g" ? -sum.pay : sum.pay,
      nr: d.nr,
      date: d.date,
      z: Number(d.z) || 14,
      due,
      made: 1,
      typ,
      doc: JSON.parse(
        JSON.stringify({
          ...d,
          id: undefined,
        })
      ),
    };
  if (typ === "g") {
    rec.paid = d.date;
    rec.gs = 1;
  }
  let id = d.id,
    tgt = null;
  if (id) {
    tgt = rchList().find((x) => x.id === id);
    if (tgt && tgt.locked) {
      toast(uiText("rch_locked"));
      return;
    }
    if (tgt) Object.assign(tgt, rec);
  }
  if (!tgt) {
    id = "i" + Date.now().toString(36);
    tgt = {
      id,
      ...rec,
    };
    rchList().push(tgt);
  }
  b.z = Number(d.z) || 14;
  tgt.locked = new Date().toISOString();
  await rvSeal(tgt);
  rvLog("create", tgt.nr, (typ !== "r" ? typ + " · " : "") + fmtEur(tgt.amt) + " · " + (tgt.kunde || ""));
  if (d.recId) {
    const r = rvRecs().find((x) => x.id === d.recId);
    if (r) {
      r.next = rvAddM(r.next, r.every);
      r.src = id;
    }
  } else if (!d.id && typ === "r" && Number(d.rep) > 0) {
    rvRecs().push({
      id: "r" + Date.now().toString(36),
      src: id,
      every: Number(d.rep),
      next: rvAddM(d.date, Number(d.rep)),
      kunde: d.k.name,
    });
  }
  try {
    localStorage.removeItem("hb-rvdraft");
  } catch (_) {}
  await saveSettings();
  SND.play("done");
  try {
    navigator.vibrate && navigator.vibrate([10, 40, 14]);
  } catch (_) {}
  const w = document.querySelector("#rvBg .rvwin");
  if (w && !reducedMotion()) {
    try {
      hbConfetti(document.body, 46);
    } catch (_) {}
    await w
      .animate(
        [
          {
            transform: "none",
            opacity: 1,
          },
          {
            transform: "translateY(-14px) scale(.96)",
            opacity: 0,
          },
        ],
        {
          duration: 360,
          easing: "cubic-bezier(.5,0,.8,.3)",
          fill: "forwards",
        }
      )
      .finished.catch(() => {});
  }
  $("rvBg").hidden = true;
  $("rvBg").innerHTML = "";
  document.body.classList.remove("locked");
  RCHU.edit = null;
  rchOpen2(id);
  toast(
    uiText("rv_saved", {
      n: d.nr,
    })
  );
}
async function rvStorno(id) {
  const o = rchList().find((x) => x.id === id);
  if (!o || !o.doc || o.storno) return;
  const lg = o.doc.lang === "en" ? "en" : "de",
    nr = rchNextNr();
  const d = JSON.parse(JSON.stringify(o.doc));
  Object.assign(d, {
    typ: "s",
    ref: o.nr,
    nr,
    date: isoToday(),
    title: "",
    abz: [],
    rep: 0,
    intro:
      lg === "en"
        ? `I hereby cancel invoice no. ${o.nr} in full:`
        : `Hiermit storniere ich die Rechnung Nr. ${o.nr} vollständig:`,
    note: "",
  });
  delete d.id;
  delete d.recId;
  const sum = rvSum(d),
    rec = {
      id: "i" + Date.now().toString(36),
      kunde: o.kunde,
      amt: sum.pay,
      nr,
      date: d.date,
      z: 0,
      due: d.date,
      made: 1,
      typ: "s",
      paid: d.date,
      doc: d,
      locked: new Date().toISOString(),
    };
  await rvSeal(rec);
  rchList().push(rec);
  o.storno = nr;
  if (!o.paid) o.paid = d.date;
  o.stornoAt = d.date;
  rvLog("storno", o.nr, "→ " + nr);
  rvLog("create", nr, "s · " + fmtEur(rec.amt) + " · " + (rec.kunde || ""));
  store.settings.rvRec = rvRecs().filter((r) => r.src !== o.id);
  await saveSettings();
  SND.play("done");
  rchOpen2(rec.id);
  toast(
    uiText("rch_storno_ok", {
      n: nr,
    }),
    () => rvSavePdf(d),
    uiText("rv_pdf"),
    8000
  );
}
function rchPartOpen(id) {
  const i = rchList().find((x) => x.id === id);
  if (!i) return;
  RCHU.part = id;
  const b = hbSheet("rchPBg", uiText("rch_part_h"));
  b.innerHTML = `<p class="hosub" data-noi18n>${escHtml(i.kunde || "")} · #${escHtml(i.nr || "")} · ${escHtml(
    uiText("rch_part_rest", {
      a: fmtEur(rchRest(i)),
      b: fmtEur(i.amt),
    })
  )}</p><div class="vacard" style="padding:14px 16px"><div class="hlr"><label class="hlf grow"><span>${escHtml(uiText("rch_part_amt"))}</span><input class="in" id="rchPA" inputmode="decimal" value="${escHtml(numStr(rchRest(i)))}"></label><label class="hlf grow"><span>${escHtml(uiText("rch_date"))}</span><input class="in" type="date" id="rchPD" value="${escHtml(isoToday())}"></label></div>
  ${
    (i.parts || []).length
      ? `<div class="rchpl">${i.parts
          .map(
            (x) =>
              `<div><span>${escHtml(
                fxDate(x.d, {
                  day: "numeric",
                  month: "short",
                })
              )}</span><b>${escHtml(fmtEur(x.a))}</b></div>`
          )
          .join("")}</div>`
      : ""
  }
  <div class="vabtns" style="margin-top:12px"><button class="btn primary" data-rchpartsave>${escHtml(uiText("rch_part_save"))}</button></div></div>`;
  setTimeout(() => {
    const e = $("rchPA");
    e && e.select();
  }, 120);
}
async function rchPartSave() {
  const i = rchList().find((x) => x.id === RCHU.part);
  if (!i) return;
  const a = parseAmt($("rchPA").value),
    d = $("rchPD").value || isoToday();
  if (!(a > 0)) {
    toast(uiText("rch_need_amt"));
    return;
  }
  (i.parts = i.parts || []).push({
    d,
    a,
  });
  rvLog("part", i.nr, fmtEur(a));
  if (rchRest(i) <= 0.005) {
    i.paid = d;
    rvLog("paid", i.nr, "");
  }
  await saveSettings();
  hbSheetClose("rchPBg");
  SND.play("done");
  rchOpen2(i.id);
}
async function rvArchive() {
  const L = rchList()
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date))),
    files = [],
    enc = new TextEncoder(),
    q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"',
    n2 = (v) =>
      round2(Number(v) || 0)
        .toFixed(2)
        .replace(".", ",");
  const ver = await rvVerify(),
    rows = [
      [
        "Nr",
        "Art",
        "Datum",
        "Leistung",
        "Kunde",
        "Netto",
        "USt",
        "Brutto",
        "Zahlbar bis",
        "Status",
        "Bezahlt am",
        "Teilzahlungen",
        "Storniert durch",
        "Bezug",
        "Festgeschrieben",
        "Pruefsiegel SHA-256",
      ]
        .map(q)
        .join(";"),
    ];
  for (const i of L) {
    let net = "",
      vat = "";
    if (i.doc) {
      try {
        const sm = rvSum(i.doc);
        net = n2(sm.net);
        vat = n2(sm.vat);
      } catch (_) {}
      try {
        const u = new Uint8Array(await rvPdf(i.doc).arrayBuffer());
        files.push({
          name: "Rechnungen/" + String(i.nr || i.id).replace(/[\\/:*?"<>|]+/g, "-") + ".pdf",
          data: u,
        });
      } catch (_) {}
    } else if (i.img) {
      try {
        const im = await rcptGet("rch-" + i.id);
        if (im)
          files.push({
            name: "Rechnungen-Scans/" + String(i.nr || i.id).replace(/[\\/:*?"<>|]+/g, "-") + ".jpg",
            data: b64bytes(im),
          });
      } catch (_) {}
    }
    rows.push(
      [
        i.nr,
        {
          a: "Abschlag",
          g: "Gutschrift",
          s: "Storno",
        }[i.typ] || "Rechnung",
        i.date,
        (i.doc && i.doc.lz) || i.date,
        i.kunde,
        net,
        vat,
        n2(i.amt),
        i.due || "",
        i.typ === "s" ? "Storno" : i.storno ? "storniert" : i.gs ? "Gutschrift" : i.paid ? "bezahlt" : "offen",
        i.paid || "",
        (i.parts || []).map((x) => x.d + " " + n2(x.a)).join(" | "),
        i.storno || "",
        (i.doc && i.doc.ref) || "",
        i.locked || "",
        i.h || "",
      ]
        .map(q)
        .join(";")
    );
  }
  files.push({
    name: "Rechnungsausgangsbuch.csv",
    data: enc.encode("\ufeff" + rows.join("\r\n")),
  });
  const lg = [["Zeit", "Aktion", "Rechnung", "Info"].map(q).join(";")].concat(
    (store.settings.rvLog || []).map((x) => [x.t, x.a, x.nr, x.x].map(q).join(";"))
  );
  files.push({
    name: "Aenderungsprotokoll.csv",
    data: enc.encode("\ufeff" + lg.join("\r\n")),
  });
  const b = rvBiz();
  files.push({
    name: "LIESMICH.txt",
    data: enc.encode(
      `Rechnungsarchiv ${b.name || ""}\r\nErstellt am ${new Date().toLocaleString("de-DE")} mit Finanz MAMI\r\n\r\nRechnungen/ – alle geschriebenen Rechnungen als PDF\r\nRechnungen-Scans/ – fotografierte oder importierte Rechnungen\r\nRechnungsausgangsbuch.csv – alle Rechnungen mit Beträgen, Status und Prüfsiegel (für Excel oder Prüfsoftware)\r\nAenderungsprotokoll.csv – wann was erstellt, storniert oder bezahlt wurde\r\n\r\nFestgeschriebene Rechnungen sind mit einem Prüfsiegel (SHA-256-Kette) gesichert.\r\nPrüfung beim Export: ${ver.bad.length ? "ABWEICHUNG bei " + ver.bad.join(", ") : "alle " + ver.n + " Rechnungen unverändert"}.\r\nRechnungen bitte 8 Jahre aufbewahren (seit 2025; vorher 10 Jahre).\r\n`
    ),
  });
  rvLog("export", "", files.length + " Dateien");
  await saveSettings();
  {
    const zb = makeZip(files),
      zn = "Rechnungsarchiv-" + isoToday() + ".zip",
      r = await rvSaveAs(
        zb instanceof Blob
          ? zb
          : new Blob([zb], {
              type: "application/zip",
            }),
        zn,
        "application/zip"
      );
    if (r === "ok" || r === "cancel") return;
    await saveBinary(zn, zb, uiText("rch_arch_ok"));
  }
}
async function rvSaveAs(blob, name, mime) {
  const br = window.AndroidBridge;
  if (br && br.saveFileAs) {
    const b64 = await new Promise((r) => {
      const fr = new FileReader();
      fr.onload = () => r(String(fr.result).split(",")[1] || "");
      fr.readAsDataURL(blob);
    });
    if (IS_DESK) {
      try {
        const r = br.saveFileAs(name, b64, uiText("rv_save_as"));
        if (r === "cancel") return "cancel";
        if (r && String(r).startsWith("ok:")) {
          toast(
            uiText("rv_saved_at", {
              p: String(r).slice(3),
            })
          );
          return "ok";
        }
      } catch (_) {}
    } else {
      const r = await new Promise((res) => {
        window.hbSaveAsDone = (ok) => {
          window.hbSaveAsDone = null;
          res(ok === true ? "ok" : ok === null ? "cancel" : "");
        };
        try {
          if (!br.saveFileAs(name, mime, b64)) {
            window.hbSaveAsDone = null;
            res("");
          }
        } catch (_) {
          window.hbSaveAsDone = null;
          res("");
        }
      });
      if (r === "ok") toast(uiText("rv_pdf_ok"));
      if (r) return r;
    }
  }
  if (!NATIVE && window.showSaveFilePicker) {
    try {
      const ext = name.split(".").pop(),
        h = await window.showSaveFilePicker({
          suggestedName: name,
          types: [
            {
              description: ext.toUpperCase(),
              accept: {
                [mime]: ["." + ext],
              },
            },
          ],
        });
      const w = await h.createWritable();
      await w.write(blob);
      await w.close();
      toast(uiText("rv_pdf_ok"));
      return "ok";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancel";
    }
  }
  return "";
}
async function rvSavePdf(d) {
  d = d || (rvSync(), RV.d);
  const blob = rvPdf(d),
    name =
      ("Rechnung " + (d.nr || "") + " " + ((d.k && d.k.name) || "")).trim().replace(/[\\/:*?"<>|]+/g, "-") + ".pdf";
  {
    const r = await rvSaveAs(blob, name, "application/pdf");
    if (r === "cancel") return;
    if (r === "ok") {
      try {
        if (d.nr && rchList().some((i) => i.nr === d.nr)) rvLog("pdf", d.nr, "");
        await saveSettings();
      } catch (_) {}
      return;
    }
  }
  if (!NATIVE && navigator.canShare && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      const f = new File([blob], name, {
        type: "application/pdf",
      });
      if (
        navigator.canShare({
          files: [f],
        })
      ) {
        await navigator.share({
          files: [f],
          title: name,
        });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  try {
    if (d.nr && rchList().some((i) => i.nr === d.nr)) rvLog("pdf", d.nr, "");
  } catch (_) {}
  await saveBinary(name, blob, uiText("rv_pdf_ok"));
}
function rvMail(d) {
  d = d || (rvSync(), RV.d);
  const sum = rvSum(d),
    nm = rvBiz().owner || rvBiz().name || "",
    due = addDays(d.date, Number(d.z) || 14);
  const txt = `${d.k.person ? "Hallo " + d.k.person : "Sehr geehrte Damen und Herren"},\n\nanbei erhalten Sie meine Rechnung Nr. ${d.nr} über ${rvEuro(sum.gross)}.\nBitte überweisen Sie den Betrag bis zum ${rvDate(due)}.\n\nVielen Dank für die gute Zusammenarbeit!\n\nViele Grüße\n${nm}`;
  rvMailGo(d, txt);
}
async function rvMailGo(d, txt) {
  const blob = rvPdf(d),
    name =
      ("Rechnung " + (d.nr || "") + " " + ((d.k && d.k.name) || "")).trim().replace(/[\\/:*?"<>|]+/g, "-") + ".pdf",
    subj = "Rechnung " + d.nr,
    to = d.k.email || "",
    br = window.AndroidBridge;
  const b64 = await new Promise((r) => {
    const fr = new FileReader();
    fr.onload = () => r(String(fr.result).split(",")[1] || "");
    fr.readAsDataURL(blob);
  });
  try {
    if (rchList().some((i) => i.nr === d.nr)) rvLog("mail", d.nr, to);
  } catch (_) {}
  if (br && br.mailFile) {
    try {
      const r = br.mailFile(to, subj, txt, name, b64);
      if (r) {
        toast(uiText(r === "tb" ? "rv_mail_tb" : "rv_mail_hint"));
        return;
      }
    } catch (_) {}
  }
  if (br && br.sendFile) {
    try {
      if (br.sendFile(to, subj, txt, name, "application/pdf", b64)) return;
    } catch (_) {}
  }
  if (!NATIVE && navigator.canShare) {
    try {
      const f = new File([blob], name, {
        type: "application/pdf",
      });
      if (
        navigator.canShare({
          files: [f],
        })
      ) {
        await navigator.share({
          files: [f],
          title: subj,
          text: txt,
        });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  await saveBinary(name, blob, uiText("rv_pdf_ok"));
  setTimeout(() => {
    location.href =
      "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(txt);
  }, 500);
  toast(uiText("rv_mail_hint"));
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("[data-rvnew]")) {
    e.preventDefault();
    let dr = null;
    try {
      dr = JSON.parse(localStorage.getItem("hb-rvdraft") || "null");
    } catch (_) {}
    if (dr && (dr.pos || []).length && !rchList().some((i) => i.nr === dr.nr)) {
      hbSheetClose && hbSheetClose("rchBg");
      rvOpen(dr);
      toast(uiText("rv_draft_back"));
      return;
    }
    try {
      hbSheetClose("rchBg");
    } catch (_) {}
    rvOpen();
    return;
  }
  const rr = t.closest("[data-rvrec]");
  if (rr) {
    rvRecOpen(rr.dataset.rvrec);
    return;
  }
  const rs = t.closest("[data-rvrecstop]");
  if (rs) {
    store.settings.rvRec = rvRecs().filter((x) => x.id !== rs.dataset.rvrecstop);
    saveSettings();
    try {
      rchOpen2();
    } catch (_) {}
    toast(uiText("rv_rec_stopped"));
    return;
  }
  const sto = t.closest("[data-rvstorno]");
  if (sto) {
    if (!sto.dataset.armed) {
      sto.dataset.armed = 1;
      sto.classList.add("danger");
      sto.textContent = uiText("rch_storno_sure");
      setTimeout(() => {
        if (sto.isConnected) {
          delete sto.dataset.armed;
          sto.classList.remove("danger");
          sto.textContent = uiText("rch_storno");
        }
      }, 3500);
      return;
    }
    rvStorno(sto.dataset.rvstorno);
    return;
  }
  const pa = t.closest("[data-rchpart]");
  if (pa) {
    rchPartOpen(pa.dataset.rchpart);
    return;
  }
  if (t.closest("[data-rchpartsave]")) {
    rchPartSave();
    return;
  }
  if (t.closest("[data-rvarch]")) {
    rvArchive();
    return;
  }
  if (t.closest("[data-rvlogv]")) {
    const l = $("rcLog");
    if (!l) return;
    l.hidden = !l.hidden;
    if (!l.hidden) {
      const L = (store.settings.rvLog || []).slice(-60).reverse();
      l.innerHTML =
        L.map(
          (x) =>
            `<div class="rclr"><span>${escHtml(
              new Date(x.t).toLocaleString(LANG === "de" ? "de-DE" : undefined, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            )}</span><b>${escHtml(uiText("rlog_" + x.a))}</b><span data-noi18n>${escHtml(x.nr)} ${escHtml(x.x)}</span></div>`
        ).join("") || `<p class="small muted">–</p>`;
      if (!reducedMotion())
        l.animate(
          [
            {
              opacity: 0,
              transform: "translateY(-6px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 260,
          }
        );
    }
    return;
  }
  const rc = t.closest("[data-rvcopy]");
  if (rc) {
    const i = rchList().find((x) => x.id === rc.dataset.rvcopy);
    if (i && i.doc) {
      const d = JSON.parse(JSON.stringify(i.doc));
      Object.assign(d, {
        nr: rchNextNr(),
        date: isoToday(),
        id: undefined,
      });
      try {
        hbSheetClose("rchBg");
      } catch (_) {}
      rvOpen(d);
      toast(uiText("rv_copy_t"));
    }
    return;
  }
  const re = t.closest("[data-rvedit]");
  if (re) {
    const i = rchList().find((x) => x.id === re.dataset.rvedit);
    if (i && i.doc) {
      const d = JSON.parse(JSON.stringify(i.doc));
      d.id = i.id;
      try {
        hbSheetClose("rchBg");
      } catch (_) {}
      rvOpen(d);
    }
    return;
  }
  const rp = t.closest("[data-rvpdfid]");
  if (rp) {
    const i = rchList().find((x) => x.id === rp.dataset.rvpdfid);
    if (i && i.doc) rvSavePdf(i.doc);
    return;
  }
  if (!t.closest("#rvBg")) return;
  if (t.closest("[data-rvclose]")) {
    rvClose();
    return;
  }
  if (e.target.id === "rvDn") RV.nrTouched = 1;
  if (t.closest("[data-rvnext]")) {
    rvGo(RV.st + 1);
    return;
  }
  if (t.closest("[data-rvback]")) {
    rvGo(RV.st - 1);
    return;
  }
  const s = t.closest("[data-rvst]");
  if (s) {
    rvGo(+s.dataset.rvst);
    return;
  }
  const g = t.closest("[data-rvgo]");
  if (g) {
    rvGo(rvSteps().indexOf(g.dataset.rvgo));
    return;
  }
  if (t.closest("[data-rvfin]")) {
    rvFinish();
    return;
  }
  if (t.closest("[data-rvpdf]")) {
    rvSavePdf();
    return;
  }
  if (t.closest("[data-rvmail]")) {
    rvMail();
    return;
  }
  if (t.closest("[data-rvpv]")) {
    const w = $("rvBg").querySelector(".rvwin");
    RV.pv = !RV.pv;
    w.classList.toggle("pv", !!RV.pv);
    rvSync();
    rvPrev();
    SND.play(RV.pv ? "whoosh" : "whooshin");
    return;
  }
  if (t.closest("[data-rvlogo]")) {
    rvSync();
    $("rvLogoF").click();
    return;
  }
  if (t.closest("[data-rvlogodel]")) {
    rvSync();
    const b = rvBiz();
    delete b.logo;
    delete b.logoW;
    delete b.logoH;
    delete b.logoA;
    delete b.logoPng;
    rvRender();
    SND.play("tick");
    return;
  }
  const col = t.closest("[data-rvcol]");
  if (col) {
    rvSync();
    rvBiz().color = col.dataset.rvcol;
    document.querySelectorAll(".rvcol").forEach((x) => x.classList.toggle("on", x === col));
    rvPrev();
    if (!reducedMotion())
      col.animate(
        [
          {
            transform: "scale(.7)",
          },
          {
            transform: "scale(1.15)",
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 380,
          easing: "cubic-bezier(.3,1.6,.5,1)",
        }
      );
    return;
  }
  const k = t.closest("[data-rvk]");
  if (k) {
    const c = rvKunden().find((x) => x.id === k.dataset.rvk);
    if (c) {
      RV.d.kid = c.id;
      RV.d.k = {
        name: c.name,
        person: c.person || "",
        street: c.street || "",
        city: c.city || "",
        email: c.email || "",
        nr: c.nr || "",
        web: c.web || "",
        ld: c.ld || "",
        lk: c.lk,
        lt: c.lt,
      };
      rvRender();
      SND.play("tick");
    }
    return;
  }
  const kn = t.closest("[data-rvkn]");
  if (kn) {
    RV.d.kid = "";
    RV.d.k = {
      name: kn.dataset.rvkn,
      person: "",
      street: "",
      city: "",
      email: "",
      nr: rvKnrNext(),
    };
    rvRender();
    rvKLogoSoon();
    setTimeout(() => {
      const i = $("rvKs");
      i && i.focus();
    }, 360);
    return;
  }
  if (t.closest("[data-rvkdel]")) {
    const L = rvKunden(),
      ix = L.findIndex((x) => x.id === RV.d.kid);
    if (ix < 0) return;
    const c = L[ix],
      row = document.querySelector(`[data-rvk="${CSS.escape(c.id)}"]`);
    const go = () => {
      L.splice(ix, 1);
      RV.d.kid = "";
      RV.d.k = {
        name: "",
        person: "",
        street: "",
        city: "",
        email: "",
        nr: rvKnrNext(),
      };
      saveSettings();
      rvRender();
      SND.play("tick");
      toast(
        uiText("rv_k_deleted", {
          n: c.name,
        }),
        () => {
          if (!rvKunden().some((x) => x.id === c.id)) rvKunden().splice(Math.min(ix, rvKunden().length), 0, c);
          if (RV.d) {
            RV.d.kid = c.id;
            RV.d.k = {
              name: c.name,
              person: c.person || "",
              street: c.street || "",
              city: c.city || "",
              email: c.email || "",
              nr: c.nr || "",
              web: c.web || "",
              ld: c.ld || "",
              lk: c.lk,
              lt: c.lt,
            };
          }
          saveSettings();
          if ($("rvBg") && !$("rvBg").hidden) rvRender();
        }
      );
    };
    if (row && !reducedMotion())
      row
        .animate(
          [
            {
              opacity: 1,
              transform: "none",
            },
            {
              opacity: 0,
              transform: "translateX(-60px)",
            },
          ],
          {
            duration: 240,
            easing: "ease-in",
            fill: "forwards",
          }
        )
        .finished.then(go, go);
    else go();
    return;
  }
  if (t.closest("[data-rvknew]")) {
    RV.d.kid = "";
    RV.d.k = {
      name: "",
      person: "",
      street: "",
      city: "",
      email: "",
      nr: rvKnrNext(),
    };
    rvRender();
    SND.play("tick");
    setTimeout(() => {
      const i = $("rvKn");
      i && i.focus();
    }, 360);
    return;
  }
  if (t.closest("[data-rvklon]")) {
    rvSync();
    store.settings.logos = true;
    saveSettings();
    rvRender();
    rvKLogoSoon();
    try {
      prefetchLogos();
    } catch (_) {}
    return;
  }
  if (t.closest("[data-rvkldel]")) {
    rvSync();
    const d = RV.d;
    d.k.ld = "";
    d.k.lk = rvKDoms(d.k).join("|");
    d.k.lt = Date.now();
    rvRender();
    SND.play("tick");
    return;
  }
  if (t.closest("[data-rvitall]")) {
    rvSync();
    rvItOpen();
    return;
  }
  if (t.closest("[data-rvlearn]")) {
    rvSync();
    rvLearn();
    return;
  }
  if (t.closest("[data-rvitmore]")) {
    RV.itAll = 1;
    const l = $("rvItL2");
    if (l && RV.d) {
      l.innerHTML = rvItRows(rvItemsSorted().filter((i) => !RV.d.pos.some((p) => p.n === i.n)));
      if (!reducedMotion())
        [...l.querySelectorAll(".rvitr")].slice(5).forEach((r, i) =>
          r.animate(
            [
              {
                opacity: 0,
                transform: "translateY(8px)",
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 320,
              delay: i * 40,
              easing: "cubic-bezier(.2,1.2,.35,1)",
              fill: "backwards",
            }
          )
        );
    }
    return;
  }
  if (t.closest("[data-rvadd]")) {
    rvSync();
    RV.d.pos.push({
      n: "",
      q: 1,
      u: "",
      p: 0,
    });
    rvRender();
    setTimeout(() => {
      const r = [...document.querySelectorAll("#rvBody .rvp")].pop();
      if (r) {
        r.querySelector("input").focus();
        if (!reducedMotion())
          r.animate(
            [
              {
                transform: "translateX(40px)",
                opacity: 0,
              },
              {
                transform: "none",
                opacity: 1,
              },
            ],
            {
              duration: 340,
              easing: "cubic-bezier(.2,.9,.2,1)",
            }
          );
      }
    }, 40);
    return;
  }
  const it = t.closest("[data-rvitem]");
  if (it) {
    if (it.closest("#rvItBg")) return;
    rvSync();
    const i = rvItems().find((x) => x.n === it.dataset.rvitem);
    if (i) {
      RV.d.pos.push({
        n: i.n,
        q: 1,
        u: i.u || "",
        p: i.p,
        ...(i.v !== undefined && i.v !== null && i.v !== ""
          ? {
              v: i.v,
            }
          : {}),
      });
      rvRender();
      SND.play("tick");
    }
    return;
  }
  const q = t.closest("[data-rvq]");
  if (q) {
    rvSync();
    const r = q.closest(".rvp"),
      p = RV.d.pos[+r.dataset.rvi];
    p.q = Math.max(0, round2((Number(p.q) || 0) + Number(q.dataset.rvq)));
    r.querySelector('[data-rvpf="q"]').value = numStr(p.q);
    rvPosUpd(r);
    SND.play("tick");
    if (!reducedMotion())
      r.querySelector('[data-rvpf="q"]').animate(
        [
          {
            transform: "scale(1.25)",
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 240,
          easing: "ease-out",
        }
      );
    return;
  }
  if (t.closest("[data-rvpdel]")) {
    rvSync();
    const r = t.closest(".rvp"),
      i = +r.dataset.rvi;
    const go = () => {
      RV.d.pos.splice(i, 1);
      rvRender();
    };
    if (reducedMotion()) go();
    else
      r.animate(
        [
          {
            transform: "none",
            opacity: 1,
          },
          {
            transform: "translateX(-60px)",
            opacity: 0,
          },
        ],
        {
          duration: 220,
          easing: "ease-in",
        }
      ).finished.then(go, go);
    return;
  }
  const ty = t.closest("[data-rvtyp]");
  if (ty) {
    rvSync();
    const d = RV.d,
      o = d.typ || "r";
    d.typ = ty.dataset.rvtyp;
    const df = {
      r: "",
      a: "Abschlagsrechnung",
      g: "Gutschrift",
    };
    if (!d.title || Object.values(df).includes(d.title)) d.title = df[d.typ];
    const di = {
      r: "Vielen Dank für Ihren Auftrag. Hiermit stelle ich Ihnen folgende Leistungen in Rechnung:",
      a: "Wie vereinbart berechne ich Ihnen folgende Abschlagszahlung:",
      g: "Hiermit schreibe ich Ihnen folgende Beträge gut:",
    };
    if (!d.intro || Object.values(di).includes(d.intro)) d.intro = di[d.typ];
    if (d.typ !== "r") d.abz = [];
    if (o !== d.typ) {
      rvRender();
      SND.play("tick");
    }
    return;
  }
  const lgb = t.closest("[data-rvlang]");
  if (lgb) {
    rvSync();
    const d = RV.d,
      nl = lgb.dataset.rvlang;
    if ((d.lang || "de") === nl) return;
    const DI = {
      de: [
        "Vielen Dank für Ihren Auftrag. Hiermit stelle ich Ihnen folgende Leistungen in Rechnung:",
        "Wie vereinbart berechne ich Ihnen folgende Abschlagszahlung:",
        "Hiermit schreibe ich Ihnen folgende Beträge gut:",
      ],
      en: [
        "Thank you for your order. I hereby invoice you for the following services:",
        "As agreed, I am invoicing you for the following deposit:",
        "I hereby credit you with the following amounts:",
      ],
    };
    const ix = DI[d.lang === "en" ? "en" : "de"].indexOf(d.intro);
    if (!d.intro || ix >= 0) d.intro = DI[nl][Math.max(0, ix)];
    d.lang = nl;
    rvRender();
    SND.play("tick");
    return;
  }
  const rp2 = t.closest("[data-rvrep]");
  if (rp2) {
    rvSync();
    RV.d.rep = +rp2.dataset.rvrep;
    rvRender();
    SND.play("tick");
    return;
  }
  const z = t.closest("[data-rvz]");
  if (z) {
    rvSync();
    RV.d.z = +z.dataset.rvz;
    rvRender();
    return;
  }
  const vt = t.closest("[data-rvvat]");
  if (vt) {
    rvSync();
    RV.d.vat = +vt.dataset.rvvat;
    rvRender();
    return;
  }
});
async function rvLogoSet(f) {
  try {
    const url = await new Promise((ok, no) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result);
      fr.onerror = no;
      fr.readAsDataURL(f);
    });
    const im = await new Promise((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = no;
      i.src = url;
    });
    let w = im.naturalWidth || im.width || 400,
      h = im.naturalHeight || im.height || 200;
    const sc = Math.min(1, 700 / w, 300 / h);
    w = Math.max(1, Math.round(w * sc));
    h = Math.max(1, Math.round(h * sc));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.drawImage(im, 0, 0, w, h);
    const px = x.getImageData(0, 0, w, h).data,
      al = new Uint8Array(w * h);
    let tr = false;
    for (let i = 0; i < w * h; i++) {
      al[i] = px[i * 4 + 3];
      if (al[i] < 250) tr = true;
    }
    const b = rvBiz();
    delete b.logoA;
    delete b.logoPng;
    if (tr) {
      b.logoPng = c.toDataURL("image/png");
      const z = new Uint8Array(
        await new Response(new Blob([al]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer()
      );
      let bs = "";
      for (let i = 0; i < z.length; i += 8192) bs += String.fromCharCode.apply(null, z.subarray(i, i + 8192));
      b.logoA = btoa(bs);
    }
    x.globalCompositeOperation = "destination-over";
    x.fillStyle = "#fff";
    x.fillRect(0, 0, w, h);
    b.logo = c.toDataURL("image/jpeg", 0.92);
    b.logoW = w;
    b.logoH = h;
    rvRender();
    SND.play("done");
    const li = document.querySelector(".rvlimg img");
    if (li && !reducedMotion())
      li.animate(
        [
          {
            transform: "scale(.6) rotate(-4deg)",
            opacity: 0,
          },
          {
            transform: "scale(1.06)",
            offset: 0.7,
          },
          {
            transform: "none",
            opacity: 1,
          },
        ],
        {
          duration: 480,
          easing: "cubic-bezier(.3,1.4,.5,1)",
        }
      );
  } catch (_) {
    toast(uiText("rv_b_logo_err"));
  }
}
function rvPosUpd(r) {
  const p = RV.d.pos[+r.dataset.rvi];
  if (p) {
    const b = r.querySelector(".rvpt");
    if (b) b.textContent = rvEuro((Number(p.q) || 0) * (Number(p.p) || 0));
  }
  const s = $("rvSumB"),
    sm = rvSum(RV.d);
  if (s) s.textContent = rvEuro(sm.net);
  const sl = document.querySelector("#rvBg .rvsumc small");
  if (sl && !rvBiz().klein)
    sl.textContent =
      sm.rate === -1
        ? uiText("rv_plus_vat_mix")
        : sm.rate
          ? uiText("rv_plus_vat", {
              n: String(sm.rate),
            })
          : "";
  clearTimeout(RV.pt);
  RV.pt = setTimeout(rvPrev, 180);
}
document.addEventListener("input", (e) => {
  if (!e.target.closest("#rvBg")) return;
  if (e.target.id === "rvDn") RV.nrTouched = 1;
  rvSync();
  if (["rvKn", "rvKe", "rvKw"].includes(e.target.id)) rvKLogoSoon();
  const r = e.target.closest(".rvp");
  if (r) rvPosUpd(r);
  else {
    clearTimeout(RV.pt);
    RV.pt = setTimeout(rvPrev, 220);
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "rvColC") {
    const b = rvBiz();
    b.color = e.target.value;
    document.querySelectorAll(".rvcol").forEach((x) => x.classList.toggle("on", x.classList.contains("rvcust")));
    const l = e.target.closest(".rvcust");
    if (l) l.style.setProperty("--c", e.target.value);
    clearTimeout(RV.ct);
    RV.ct = setTimeout(rvPrev, 120);
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "rvLogoF") {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) await rvLogoSet(f);
    return;
  }
  if (e.target.id === "rvBk" || e.target.id === "rvDd" || e.target.id === "rvDr") {
    rvSync();
    rvPrev();
    return;
  }
  const a = e.target.closest && e.target.closest("[data-rvabz]");
  if (a) {
    rvSync();
    const i = rchList().find((x) => x.id === a.dataset.rvabz);
    if (!i) return;
    const d = RV.d;
    d.abz = (d.abz || []).filter((x) => x.nr !== i.nr);
    if (a.checked)
      d.abz.push({
        nr: i.nr,
        amt: i.amt,
      });
    rvPrev();
    SND.play("tick");
  }
});
document.addEventListener("keydown", (e) => {
  const bg = $("rvBg");
  if (!bg || bg.hidden) return;
  if (e.key === "Escape") {
    e.preventDefault();
    rvClose();
  }
});

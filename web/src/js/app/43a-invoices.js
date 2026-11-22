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

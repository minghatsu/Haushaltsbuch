/* Sprache */
const LANGS = [
  ["de", "Deutsch", "de-DE"],
  ["en", "English", "en-GB"],
  ["tr", "Türkçe", "tr-TR"],
  ["ru", "Русский", "ru-RU"],
  ["uk", "Українська", "uk-UA"],
  ["pl", "Polski", "pl-PL"],
  ["ar", "العربية", "ar-u-nu-latn"],
  ["ro", "Română", "ro-RO"],
];
let LANG = "de";
try {
  const l = localStorage.getItem("hb-lang");
  if (l && LANGS.some((x) => x[0] === l)) LANG = l;
} catch (e) {}
function localeTag() {
  const l = LANGS.find((x) => x[0] === LANG);
  return l ? l[2] : "de-DE";
}

const MNAME = {
  en: "Mommy",
  tr: "Anne",
  ru: "Мама",
  uk: "Мама",
  pl: "Mama",
  ar: "ماما",
  ro: "Mami",
};
function mamiName(v) {
  const n = MNAME[LANG];
  if (!n || typeof v !== "string") return v;
  return v.replace(/\bMami\b(?!-Studio)/g, n).replace(/Мами|Мамі/g, n);
}
/* Eigener Name für Unterkonten (Spaces) – nur Anzeige, in Deutsch und Englisch */
const SPN_OPT = {
  de: [
    ["", "Spaces"],
    ["spartopf", "Spartöpfe"],
    ["topf", "Töpfe"],
  ],
  en: [
    ["", "Spaces"],
    ["pot", "Pots"],
    ["jar", "Jars"],
  ],
};
const SPN_FORMS = {
  spartopf: ["Spartopf", "Spartöpfe", "Spartöpfen"],
  topf: ["Topf", "Töpfe", "Töpfen"],
  pot: ["Pot", "Pots", "Pots"],
  jar: ["Jar", "Jars", "Jars"],
};
let SPN = "";
try {
  SPN = localStorage.getItem("hb-spname") || "";
} catch (e) {}
function spaceActive() {
  return !!(SPN_FORMS[SPN] && (SPN_OPT[LANG] || []).some((o) => o[0] === SPN));
}
function spaceWord(v) {
  if (!spaceActive() || typeof v !== "string" || !/Space/.test(v)) return v;
  const [one, many, dat] = SPN_FORMS[SPN];
  return v
    .replace(/\b(mit|von|aus|zu|bei|nach|in|auf|den|allen|deinen|meinen|seinen|beiden|\d+)(\s+)Spaces\b/gi, `$1$2${dat}`)
    .replace(/\bSpaces\b/g, many)
    .replace(/\bSpace\b/g, one);
}
const I18N = (() => {
  const NUM = /\d[\d.,]*/g,
    MRE = new RegExp("\\b(" + MONTHS.join("|") + ")\\b", "g");
  let D = null,
    RX = [],
    cache = new Map();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function load() {
    D = new Map();
    RX = [];
    cache = new Map();
    if (LANG === "de") return;
    const arr = I18N_T[LANG] || [];
    I18N_K.forEach((k, i) => {
      let v = arr[i];
      if (!v) return;
      v = mamiName(v);
      D.set(k, v);
      if (k.includes("{x}")) RX.push([new RegExp("^" + esc(k).replace(/\\\{x\\\}/g, "(.+?)") + "$"), v]);
    });
  }
  function fill(t, ns, ms, xs) {
    let a = 0,
      b = 0,
      c = 0;
    return t.replace(/\{([nmx])\}/g, (_, k) =>
      k === "n" ? (ns[a++] ?? "") : k === "m" ? tr(ms[b++] ?? "") : (xs[c++] ?? "")
    );
  }
  function tr(s) {
    return spaceWord(trLang(s));
  }
  function trLang(s) {
    if (LANG === "de" || !s) return s;
    if (!D) load();
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s),
      core = m[2].replace(/ /g, " ");
    if (!core || !/\p{L}{2}/u.test(core)) return s;
    if (cache.has(core)) return m[1] + cache.get(core) + m[3];
    let out = D.get(core);
    if (out === undefined) {
      const ns = [],
        ms = [];
      const key = core
        .replace(MRE, (w) => {
          ms.push(w);
          return "{m}";
        })
        .replace(NUM, (w) => {
          ns.push(w);
          return "{n}";
        });
      const t = D.get(key);
      if (t !== undefined) out = fill(t, ns, ms, []);
      else
        for (const [re, v] of RX) {
          if (re.test(key)) {
            out = fillX(v, key, re, ns, ms);
            break;
          }
        }
    }
    if (out === undefined) {
      const ar = /^(.*?\S)\s*([›»])$/.exec(core);
      if (ar) {
        const t = tr(ar[1]);
        if (t !== ar[1]) out = t + " " + ar[2];
      }
    }
    if (out === undefined && core.includes(" · ")) {
      const parts = core.split(" · "),
        tp = parts.map((x) => tr(x));
      if (tp.some((x, j) => x !== parts[j])) out = tp.join(" · ");
    }
    if (out === undefined) out = core;
    if (cache.size > 4000) cache.clear();
    cache.set(core, out);
    return m[1] + out + m[3];
  }
  function fillX(v, key, re, ns, ms) {
    const r = re.exec(key);
    let ni = 0,
      mi = 0;
    const tok = [];
    key.replace(/\{([nm])\}/g, (w, k, off) => {
      tok.push([off, k]);
      return w;
    });
    const groups = [];
    let pos = 0;
    for (let g = 1; g < r.length; g++) {
      const s = key.indexOf(r[g], pos);
      groups.push([s, r[g]]);
      pos = s + r[g].length;
    }
    const outsideN = [],
      outsideM = [],
      xs = [],
      items = [];
    tok.forEach(([off, k]) => {
      if (!groups.some(([s, txt]) => off >= s && off < s + txt.length))
        items.push({
          at: off,
          k,
        });
    });
    groups.forEach(([s, txt]) =>
      items.push({
        at: s,
        txt,
      })
    );
    items.sort((a, b) => a.at - b.at);
    for (const it of items) {
      if (it.txt !== undefined) xs.push(tr(it.txt.replace(/\{([nm])\}/g, (w, k) => (k === "n" ? ns[ni++] : ms[mi++]))));
      else if (it.k === "n") outsideN.push(ns[ni++]);
      else outsideM.push(ms[mi++]);
    }
    return fill(v, outsideN, outsideM, xs);
  }
  const SKIP = "SCRIPT,STYLE,TEXTAREA,[data-noi18n],.legal,[contenteditable]";
  const ATTRS = ["placeholder", "title", "aria-label"];
  const orig = new WeakMap(),
    last = new WeakMap(),
    aorig = new WeakMap();
  function doText(n) {
    const cur = n.nodeValue;
    let src = cur;
    if (last.get(n) === cur) src = orig.get(n);
    else orig.set(n, cur);
    const o = tr(src);
    if (o !== cur) n.nodeValue = o;
    last.set(n, o);
  }
  function doAttrs(el) {
    if (!el.hasAttribute) return;
    let st = aorig.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a);
      if (!st) {
        st = {};
        aorig.set(el, st);
      }
      let src = cur;
      if (st[a] && st[a][1] === cur) src = st[a][0];
      const o = tr(src);
      st[a] = [src, o];
      if (o !== cur) el.setAttribute(a, o);
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      const p = root.parentElement;
      if (p && !p.closest(SKIP)) doText(root);
      return;
    }
    if (root.nodeType !== 1 || root.closest(SKIP)) return;
    doAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else doAttrs(n);
    }
  }
  let obs = null,
    busy = false;
  function onMut(list) {
    if (busy || (LANG === "de" && !spaceActive())) return;
    busy = true;
    try {
      for (const m of list) {
        if (m.type === "childList") m.addedNodes.forEach(walk);
        else if (m.type === "characterData") walk(m.target);
        else if (m.type === "attributes") doAttrs(m.target);
      }
    } finally {
      obs.takeRecords();
      busy = false;
    }
  }
  function applyDoc() {
    const h = document.documentElement;
    h.lang = LANG;
    h.dir = "ltr";
    h.classList.remove("rtl");
  }
  function start() {
    applyDoc();
    if (LANG !== "de" || spaceActive()) {
      walk(document.body);
    }
    if (!obs) {
      obs = new MutationObserver(onMut);
      obs.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ATTRS,
      });
    }
  }
  function set(l) {
    if (!LANGS.some((x) => x[0] === l)) return;
    LANG = l;
    try {
      localStorage.setItem("hb-lang", l);
    } catch (e) {}
    D = null;
    load();
    applyDoc();
    busy = true;
    try {
      walk(document.body);
    } finally {
      if (obs) obs.takeRecords();
      busy = false;
    }
  }
  function setSpace(k) {
    SPN = k || "";
    try {
      if (SPN) localStorage.setItem("hb-spname", SPN);
      else localStorage.removeItem("hb-spname");
    } catch (e) {}
    cache.clear();
    busy = true;
    try {
      walk(document.body);
    } finally {
      if (obs) obs.takeRecords();
      busy = false;
    }
  }
  return {
    tr,
    start,
    set,
    setSpace,
    walk,
  };
})();
const tr = (s) => I18N.tr(s);
const trBold = (s) =>
  tr(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\[\[(.+?)\]\]/g, '<b class="bad">$1</b>');
I18N.start();
const DEFAULT_SETTINGS = {
  migHauptkonto: 1,
  startBalance: {},
  reserveRate: 30,
  kleinunternehmer: false,
  kuLimit: 25000,
  vatRate: 19,
  vorsorge: 0,
  abzuege: 0,
  splitting: false,
  partnerZvE: 0,
  spaces: [],
  cats: {
    ausgabe: ["Haushalt & Pflichten", "Spaß & Freizeit", "Tanken & Parken", "Bargeldabhebung"],
    betrieb: ["Büro & Material", "Sonstiges"],
    einnahme: [
      {
        name: "Gehalt",
        art: "lohn",
      },
      {
        name: "Sonderzahlung",
        art: "sonderzahlung",
      },
      {
        name: "Selbstständigkeit",
        art: "selbst",
      },
      {
        name: "Sonstige Einnahme",
        art: "sonstige",
      },
      {
        name: "Erstattungen & Sonstiges",
        art: "sonstige",
      },
    ],
  },
};
const KIND_LABEL = {
  ausgabe: "Ausgabe",
  betrieb: "Betrieblich",
  einnahme: "Einnahme",
  vorauszahlung: "Steuer-Vorauszahlung",
  abhebung: "Abgehoben",
  umbuchung: "Umschuldung",
};
const TITLES = {
  beruf: "Beruf",
  zukunft: "Sparen",
  home: "Haushalt",
  list: "Buchungen",
  fix: "Fixkosten",
  year: "Analyse",
  ziele: "Sparen",
  shop: "Einkauf",
  more: "Einstellungen",
  import: "Import",
  belege: "Belege",
  gemeinsam: "Gemeinsam",
};

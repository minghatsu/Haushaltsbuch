/* Sparen */
/* Einkauf */
function renderShop() {
  const a = document.activeElement;
  if (BG_RENDER && a && a.tagName === "INPUT" && a.closest && a.closest(".zcard,.zmini")) return;
  const keep = a && a.id === "zIn" ? a.value : null;
  $("v-shop").innerHTML = `<div class="zstack">${zettelCard()}${shopAvgCard()}${offersCard()}</div>`;
  initShopRail();
  if (keep !== null) {
    const i = $("zIn");
    if (i) {
      i.value = keep;
      i.focus();
    }
  }
}
/* Einkaufszettel */
const ZDEPTS = [
  [
    "Obst & Gemüse",
    "🥬",
    /apfel|äpfel|birne|banane|orange|mandarine|clementine|zitrone|limette|traube|beere|kiwi|ananas|mango|melone|pfirsich|nektarine|pflaume|kirsch|obst|salat|tomate|gurke|paprika|zucchini|aubergine|möhre|moehre|karotte|kartoffel|zwiebel|knoblauch|lauch|porree|brokkoli|blumenkohl|kohl|spinat|champignon|pilz|radieschen|sellerie|spargel|avocado|ingwer|kräuter|kraeuter|petersilie|basilikum|schnittlauch|rucola|feldsalat|gemüse|gemuese|kürbis|kuerbis|mais(?!mehl)|fenchel|rote bete/,
  ],
  [
    "Brot & Backwaren",
    "🥖",
    /brot|brötchen|broetchen|toast|baguette|croissant|semmel|laugen|brezel|kuchen|zwieback|knäcke|knaecke|wraps?|tortilla|ciabatta|bagel|muffin|backwaren/,
  ],
  [
    "Fleisch & Fisch",
    "🥩",
    /fleisch|hack|hähnchen|haehnchen|huhn|hühner|pute|schwein|rind|steak|schnitzel|wurst|würstchen|wuerstchen|salami|schinken|speck|bacon|leberkäse|frikadelle|bratwurst|fisch|lachs|thunfisch|forelle|garnele|shrimp|hering|aufschnitt|gyros|geschnetzelt|filet/,
  ],
  [
    "Kühlregal",
    "🧀",
    /milch|butter|joghurt|jogurt|quark|käse|kaese|gouda|mozzarella|feta|parmesan|frischkäse|sahne|schmand|creme fraiche|crème|eier\b|ei\b|eier |margarine|pudding|skyr|kefir|buttermilch|tofu|hefe|teig|kühl|aufstrich|hummus/,
  ],
  [
    "Tiefkühl",
    "❄",
    /tiefkühl|tiefkuehl|tk |tk-|pizza|eis\b|eiscreme|fischstäbchen|fischstaebchen|pommes|erbsen|spinat tk|gefroren|frost|kroketten|rahmspinat/,
  ],
  [
    "Vorrat",
    "🥫",
    /nudel|spaghetti|penne|pasta|reis|mehl|zucker|salz|pfeffer|gewürz|gewuerz|öl\b|oel\b|olivenöl|essig|soße|sosse|sauce|ketchup|senf|mayo|konserve|dose|bohnen|linsen|kichererbsen|mais|tomatenmark|passata|brühe|bruehe|suppe|müsli|muesli|cornflakes|haferflocken|marmelade|honig|nutella|nuss|nüsse|mandeln|kaffee|tee\b|kakao|schoko|milka|keks|chips|snack|bonbon|gummi|haribo|riegel|süß|suess|backpulver|vanille/,
  ],
  [
    "Getränke",
    "🥤",
    /wasser|sprudel|saft|cola|fanta|sprite|limo|eistee|bier|pils|wein|sekt|schnaps|vodka|whisky|getränk|getraenk|energy|red bull|mineral|smoothie|kasten/,
  ],
  [
    "Drogerie",
    "🧴",
    /zahnpasta|zahnbürste|zahnbuerste|zahnseide|shampoo|spülung|duschgel|seife|deo|creme|lotion|rasier|binden|tampon|windel|feuchttücher|wattepads|wattestäbchen|taschentücher|toilettenpapier|klopapier|küchenrolle|kuechenrolle|make-?up|wimpern|nagel|haar|sonnencreme|pflaster|medikament|vitamin|kosmetik|parfum|mundspül/,
  ],
  [
    "Haushalt",
    "🧽",
    /wasch|spülmittel|spuelmittel|spülmaschine|tabs|reiniger|putz|schwamm|lappen|müllbeutel|muellbeutel|alufolie|frischhaltefolie|backpapier|gefrierbeutel|kerze|batterie|glühbirne|gluehbirne|lampe|leuchtmittel|serviette|teelicht|weichspüler|entkalker|klarspüler|besen|eimer/,
  ],
  ["Tierbedarf", "🐾", /katze|hund|futter|leckerli|streu|kauknochen|nager/],
];
const ZSONST = ["Sonstiges", "📦"];
const ZMATCH = [
  "Drogerie",
  "Haushalt",
  "Tierbedarf",
  "Getränke",
  "Tiefkühl",
  "Fleisch & Fisch",
  "Kühlregal",
  "Brot & Backwaren",
  "Vorrat",
  "Obst & Gemüse",
].map((k) => ZDEPTS.find((x) => x[0] === k));
function zDept(name) {
  const n = normText(name);
  for (const [d, ic, re] of ZMATCH) if (re.test(n)) return [d, ic];
  return ZSONST;
}
const zShopBy = (id) => SHOPS.find((x) => x.id === id);
function zBestFor(name) {
  const tk = priceToks(name);
  if (!tk.length) return null;
  const mine = new Set(store.settings.shops || []),
    by = {};
  for (const e of store.settings.pricebook || [])
    if (sameProduct(tk, priceToks(e.n))) {
      if (!by[e.s] || by[e.s].d <= e.d) by[e.s] = e;
    }
  const td = isoToday();
  for (const d of store.settings.deals || [])
    if ((!d.until || d.until >= td) && d.price && sameProduct(tk, priceToks(d.text))) {
      if (!by[d.shop] || d.price < by[d.shop].p)
        by[d.shop] = {
          s: d.shop,
          p: d.price,
          deal: true,
        };
    }
  const all = Object.values(by).filter((x) => zShopBy(x.s));
  if (!all.length) return null;
  const pool = all.filter((x) => mine.has(x.s)).length ? all.filter((x) => mine.has(x.s)) : all,
    best = pool.slice().sort((a, b) => a.p - b.p)[0],
    worst = pool.slice().sort((a, b) => b.p - a.p)[0];
  return {
    s: best.s,
    p: best.p,
    save: worst.p - best.p,
    deal: !!best.deal,
  };
}
function zWhere(it) {
  if (it.s)
    return {
      s: it.s,
      p: it.p != null ? it.p : null,
      manual: true,
    };
  return zBestFor(it.n);
}
function zLogo(sh, px) {
  px = px || 22;
  if (!sh)
    return `<span style="display:inline-grid;place-items:center;width:${px}px;height:${px}px;border-radius:50%;background:#c7ccc9;color:#fff;font:800 ${Math.round(px * 0.5)}px sans-serif;flex:none">?</span>`;
  const dom = SHOP_DOMAINS[sh.id] || "",
    pk = dom && LOGOPACK[dom],
    v = dom && LOGO.map.get(dom),
    img = v && v.data;
  if (sh.id === "apotheke")
    return `<span class="zlg" style="display:inline-grid;place-items:center;width:${px}px;height:${px}px;border-radius:50%;flex:none;overflow:hidden;box-shadow:0 0 0 1.5px #fff;background:var(--accent)">${apoIcon(Math.round(px * 0.64))}</span>`;
  const box = `display:inline-grid;place-items:center;width:${px}px;height:${px}px;border-radius:50%;flex:none;overflow:hidden;box-shadow:0 0 0 1.5px #fff`;
  if (pk) {
    const n = parseInt(pk[0].slice(1), 16),
      lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return `<span class="zlg" style="${box};background:${pk[0]}"><svg viewBox="0 0 24 24" width="${Math.round(px * 0.64)}" height="${Math.round(px * 0.64)}" aria-hidden="true"><path fill="${lum > 0.7 ? "#1a1a1a" : "#fff"}" d="${pk[1]}"/></svg></span>`;
  }
  if (img)
    return `<span class="zlg" style="${box};background:#fff"><img src="${escHtml(img)}" alt="" style="width:100%;height:100%;object-fit:cover"></span>`;
  return `<span class="zlg" style="${box};background:${sh.color};color:${sh.ink || "#fff"};font:800 ${Math.round(px * 0.46)}px sans-serif">${escHtml(sh.name.slice(0, 1))}</span>`;
}
function zList() {
  return store.settings.shoplist || [];
}
const shopQty = (it) => Math.max(1, Math.min(99, Math.round(Number(it && it.q) || 1)));
function zAddTo(list, item) {
  const k = normText(item.n),
    same = !item.done && list.find((x) => !x.done && normText(x.n) === k && (!item.s || !x.s || x.s === item.s));
  if (same)
    return {
      list: list.map((x) =>
        x === same
          ? {
              ...x,
              q: shopQty(x) + shopQty(item),
              ...(item.p > 0 && x.p == null
                ? {
                    p: item.p,
                  }
                : {}),
              ...(item.s && !x.s
                ? {
                    s: item.s,
                  }
                : {}),
            }
          : x
      ),
      id: same.id,
      more: true,
    };
  return {
    list: [
      ...list,
      {
        ...item,
        c: item.c || Date.now(),
      },
    ],
    id: item.id,
    more: false,
  };
}
function zSetQ(id, q) {
  zSave(
    zList().map((x) =>
      x.id === id
        ? {
            ...x,
            q: Math.max(1, Math.min(99, Math.round(Number(q) || 1))),
          }
        : x
    )
  );
}
function zSave(l) {
  const old = new Map(zList().map((x) => [x.id, x])),
    now = Date.now(),
    strip = (x) =>
      JSON.stringify({
        ...x,
        t: 0,
      });
  const out = l.map((x) => {
    const o = old.get(x.id);
    if (!o)
      return {
        ...x,
        c: x.c || now,
        t: now,
      };
    return strip(o) !== strip(x)
      ? {
          ...x,
          t: now,
        }
      : x;
  });
  const keep = new Set(out.map((x) => x.id)),
    del = {
      ...(store.settings.zdel || {}),
    };
  for (const id of old.keys()) if (!keep.has(id)) del[id] = now;
  for (const k in del) if (now - del[k] > 30 * 864e5) delete del[k];
  store.settings.shoplist = out;
  store.settings.zdel = del;
  saveSettings();
}
const ZSYNC = {
  push: false,
};
function zMerge(loc, rem) {
  if (!loc) return false;
  const before = JSON.stringify([rem.shoplist || [], rem.zdel || {}, rem.shopTrip || null]);
  const del = {
    ...(rem.zdel || {}),
  };
  for (const [k, v] of Object.entries(loc.zdel || {})) if (!(del[k] >= v)) del[k] = v;
  const by = new Map();
  for (const it of rem.shoplist || []) by.set(it.id, it);
  for (const it of loc.shoplist || []) {
    const r = by.get(it.id);
    if (!r || (it.t || 0) > (r.t || 0)) by.set(it.id, it);
  }
  rem.shoplist = [...by.values()].filter((it) => !(del[it.id] >= (it.t || 0))).sort((a, b) => (a.c || 0) - (b.c || 0));
  rem.zdel = del;
  const a = loc.shopTrip,
    b = rem.shopTrip;
  if (a && b && a.id === b.id) {
    const n = (a.t || 0) > (b.t || 0) ? a : b;
    rem.shopTrip = n.end
      ? n
      : {
          ...n,
          fin: {
            ...(b.fin || {}),
            ...(a.fin || {}),
          },
        };
  } else if (a || b) rem.shopTrip = ((a && a.t) || 0) > ((b && b.t) || 0) ? a : b;
  return JSON.stringify([rem.shoplist, rem.zdel, rem.shopTrip || null]) !== before;
}
function zGroups(items, mode) {
  const W = items.map((it) => ({
    it,
    w: zWhere(it),
    d: zDept(it.n),
  }));
  const byName = (a, b) => a.it.n.localeCompare(b.it.n, "de"),
    dOrder = (d) => {
      const i = ZDEPTS.findIndex((x) => x[0] === d[0]);
      return i < 0 ? 99 : i;
    };
  if (mode === "preis")
    return [
      {
        k: "",
        rows: W.sort((a, b) => ((b.w && b.w.p) || -1) - ((a.w && a.w.p) || -1) || byName(a, b)),
      },
    ];
  if (mode === "az")
    return [
      {
        k: "",
        rows: W.sort(byName),
      },
    ];
  if (mode === "abt") {
    const g = {};
    for (const x of W)
      (g[x.d[0]] = g[x.d[0]] || {
        k: x.d[0],
        ic: x.d[1],
        o: dOrder(x.d),
        rows: [],
      }).rows.push(x);
    return Object.values(g)
      .sort((a, b) => a.o - b.o)
      .map((x) => ({
        ...x,
        rows: x.rows.sort(byName),
      }));
  }
  const g = {};
  for (const x of W) {
    const k = x.w ? x.w.s : "";
    (g[k] = g[k] || {
      k,
      shop: zShopBy(k) || null,
      rows: [],
    }).rows.push(x);
  }
  return Object.values(g)
    .sort((a, b) => (a.k === "") - (b.k === "") || b.rows.length - a.rows.length)
    .map((x) => ({
      ...x,
      rows: x.rows.sort((a, b) => dOrder(a.d) - dOrder(b.d) || byName(a, b)),
    }));
}
/* PDF / Drucken */
function zPrintHtml() {
  const open = zList().filter((x) => !x.done),
    gs = zGroups(open, "laden"),
    d = new Date(),
    ds = d.toLocaleDateString("de-DE", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const est = sum(open, (it) => {
      const w = zWhere(it);
      return w && w.p ? w.p * shopQty(it) : 0;
    }),
    e = escHtml;
  const money = (v) =>
    v.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €";
  const block = (g) => {
    const by = {};
    for (const x of g.rows)
      (by[x.d[0]] = by[x.d[0]] || {
        ic: x.d[1],
        rows: [],
      }).rows.push(x);
    return `<section class="sh">${g.shop ? `<div class="bar" style="background:${g.shop.color};color:${g.shop.ink || "#fff"}"><b class="ln">${zLogo(g.shop, 22)}${e(g.shop.name)}</b><span>${g.rows.length} ${g.rows.length === 1 ? "Sache" : "Sachen"}</span></div>` : `<div class="bar open"><b class="ln">${zLogo(null, 22)}Laden noch offen</b><span>${g.rows.length}</span></div>`}
      ${Object.entries(by)
        .map(
          ([dn, v]) =>
            `<div class="dh">${v.ic} ${e(dn)}</div>${v.rows.map((x) => `<div class="it"><i></i><em>${shopQty(x.it)}×</em><span>${e(x.it.n)}</span><b>${x.w && x.w.p ? money(x.w.p * shopQty(x.it)) : ""}</b></div>`).join("")}`
        )
        .join("")}</section>`;
  };
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Einkaufszettel</title><style>
@page{size:A4;margin:16mm 15mm 18mm;@top-left{content:"Einkaufszettel – Fortsetzung";font:13pt Georgia,serif;color:#66746E}@bottom-left{content:"Finanz MAMI · Einkaufszettel ${e(d.toLocaleDateString("de-DE"))}";font:8pt "Segoe UI",Arial,sans-serif;color:#9AA6A0}@bottom-right{content:"Seite " counter(page) " von " counter(pages);font:8pt "Segoe UI",Arial,sans-serif;color:#9AA6A0}}
@page:first{@top-left{content:none}}
*{box-sizing:border-box}body{margin:0;font:10.5pt "Segoe UI",Inter,Arial,sans-serif;color:#14201B;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5pt solid #147A5B;padding-bottom:8pt;margin-bottom:4pt}.hd h1{font:400 24pt Georgia,serif;margin:0}.hd small{color:#66746E;font-size:9.5pt}.hd .r{text-align:right;color:#66746E;font-size:9pt}.hd .r b{display:block;color:#14201B;font-size:13pt}
.sh{break-inside:avoid;page-break-inside:avoid;margin-top:12pt}.bar{display:flex;justify-content:space-between;align-items:center;border-radius:6pt;padding:5pt 9pt;font-size:11pt}.bar span{font-size:8.5pt;opacity:.9}.bar .ln{display:flex;align-items:center;gap:7pt}.bar .zlg{box-shadow:0 0 0 1.5pt #fff!important}.bar.open{background:#EDEAE3;color:#14201B}
.dh{font-weight:800;font-size:8.5pt;letter-spacing:.06em;text-transform:uppercase;color:#147A5B;margin:7pt 0 2pt}
.it{display:flex;align-items:center;gap:7pt;padding:3pt 0;border-bottom:.6pt solid #eee}.it i{width:9pt;height:9pt;border:1.2pt solid #8a9690;border-radius:2pt;flex:none}.it b{margin-left:auto}.it .zlg{margin-left:6pt}.it em{font-style:normal;font-weight:800;min-width:18pt;color:#147A5B}
.sum{display:flex;justify-content:space-between;margin-top:12pt;padding-top:6pt;border-top:1.8pt solid #14201B;font-weight:800;font-size:12pt;break-inside:avoid}
</style></head><body><div class="hd"><div><h1>Einkaufszettel</h1><small>${e(ds)} · Laden für Laden</small></div><div class="r">${open.length} ${open.length === 1 ? "Sache" : "Sachen"}${est ? `<b>ca. ${money(est)}</b>` : ""}</div></div>
${gs.map(block).join("")}${est ? `<div class="sum"><span>Zusammen ca.</span><span>${money(est)}</span></div>` : ""}</body></html>`;
}
const PRINTW = {};
window.hbPrintDone = (id, ok, msg) => {
  const f = PRINTW[id];
  if (f) {
    delete PRINTW[id];
    f(ok, msg);
  }
};
function zPrint(mode) {
  if (!zList().some((x) => !x.done)) {
    toast("Auf dem Zettel steht nichts Offenes");
    return;
  }
  const acc =
      (getComputedStyle(document.documentElement).getPropertyValue("--accent") || "#1a7a5c").trim() || "#1a7a5c",
    html = zPrintHtml().split("var(--accent)").join(acc),
    B = window.AndroidBridge;
  if (B && B.printHtml) {
    const id = newId();
    PRINTW[id] = (ok, msg) => {
      if (ok) toast(mode === "pdf" ? "PDF gespeichert" : "An den Drucker geschickt");
      else if (msg && msg !== "cancel" && !/cancel/i.test(msg))
        toast((mode === "pdf" ? "PDF" : "Drucken") + " ging nicht: " + msg);
    };
    B.printHtml(id, html, mode);
    return;
  }
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  f.srcdoc = html;
  f.onload = () => {
    try {
      f.contentWindow.focus();
      f.contentWindow.print();
    } catch (e) {
      toast("Drucken ging nicht");
    }
    setTimeout(() => f.remove(), 60000);
  };
  if (mode === "pdf")
    toast("Wähle im Druckfenster „Als PDF speichern“ bzw. „Microsoft Print to PDF“", null, null, 6000);
}
/* Einkaufstour */
function zDevs() {
  const out = store.settings.devOut || {};
  return Object.entries(devList()).filter(([id, d]) => d && !out[id]);
}
function zPhones() {
  return zDevs().filter(([id, d]) => id !== devId() && d.type === "phone");
}
function zDevName(id) {
  if (id === devId()) return devShown(devMe()) || "Dieses Gerät";
  const d = devList()[id],
    pn = profileName();
  return pn ? `${pn} (${devShown(d)})` : devShown(d);
}
const ZCOL = ["#2f6fd0", "#c2410c", "#7a5bc2", "#0f8a8a", "#b5473a", "#4d7c0f"];
function zDevCol(id) {
  const ids = Object.keys(devList()).sort();
  const i = ids.indexOf(id);
  return ZCOL[(i < 0 ? 0 : i) % ZCOL.length];
}
function profileName() {
  return String((store.settings && store.settings.name) || "").trim();
}
function zWho(id, px) {
  px = px || 16;
  if (!id) return "";
  const n = zDevName(id),
    ph = store.settings && store.settings.photo;
  if (ph)
    return `<span class="zwho" title="${escHtml(n)}" style="display:inline-block;width:${px}px;height:${px}px;border-radius:50%;flex:none;box-shadow:0 0 0 2px ${zDevCol(id)};overflow:hidden;background:var(--sunk)"><img src="${escHtml(ph)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></span>`;
  return `<span class="zwho" title="${escHtml(n)}" style="display:inline-grid;place-items:center;width:${px}px;height:${px}px;border-radius:50%;background:${zDevCol(id)};color:#fff;font:900 ${Math.round(px * 0.56)}px sans-serif;flex:none">${escHtml(n.trim().slice(0, 1).toUpperCase() || "?")}</span>`;
}
const zTrip = () => {
  const t = store.settings.shopTrip;
  return t && !t.end ? t : null;
};
function zMyTrip() {
  const t = zTrip(),
    me = devId();
  if (!t || (t.fin && t.fin[me])) return null;
  return !t.devs || !t.devs.length || t.devs.some((d) => d.id === me) ? t : null;
}
function zStart(devs, assign) {
  const t = Date.now();
  store.settings.shopTrip = {
    id: newId(),
    t,
    at: t,
    from: devMe().name || "",
    by: devId(),
    devs: devs || [],
    assign: assign || {},
    fin: {},
  };
  saveSettings();
}
function zEnd() {
  const t = store.settings.shopTrip;
  if (!t) return;
  store.settings.shopTrip = {
    id: t.id,
    t: Date.now(),
    end: true,
  };
  saveSettings();
}
function zMineShop(t, shopId, me) {
  const a = (t && t.assign) || {};
  return !a[shopId] || a[shopId] === me;
}
function zStartFromPC() {
  const open = zList().filter((x) => !x.done).length;
  if (!open) {
    toast("Auf dem Zettel steht nichts Offenes");
    return;
  }
  const ph = zPhones();
  if (!SYNCABLE || !SYNC.token || !ph.length) {
    toast("Kein Handy gekoppelt – unter Einstellungen › Geräte kannst du eins koppeln", null, null, 6000);
    return;
  }
  if (ph.length === 1) {
    zStart(
      [
        {
          id: ph[0][0],
          name: ph[0][1].name || "Handy",
        },
      ],
      {}
    );
    toast(`Einkauf an ${ph[0][1].name || "dein Handy"} geschickt`);
    return;
  }
  zDlgOpen();
}
function zDlgOpen() {
  const ph = zPhones(),
    gs = zGroups(
      zList().filter((x) => !x.done),
      "laden"
    ).filter((g) => g.shop);
  let el = $("zDlg");
  if (!el) {
    el = document.createElement("div");
    el.id = "zDlg";
    el.className = "backdrop zdlgbg";
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="zdlg" role="dialog" aria-label="Einkauf starten"><h2>Einkauf starten</h2><div class="small muted">An welche Handys?</div>
    ${ph.map(([id, d]) => `<label class="zdo"><input type="checkbox" data-zdph="${escHtml(id)}" checked>${zWho(id, 32)}<span class="zdn"><b>${escHtml(profileName() || devShown(d))}</b>${profileName() ? `<small>${escHtml(devShown(d))}</small>` : ""}</span></label>`).join("")}
    ${gs.length ? `<div class="zdl">Wer geht wohin? <span class="muted">(optional)</span></div>${gs.map((g) => `<div class="zds">${zLogo(g.shop, 22)}<b>${escHtml(g.shop.name)}</b><span class="muted">${g.rows.length} ${g.rows.length === 1 ? "Sache" : "Sachen"}</span><select data-zdas="${escHtml(g.k)}"><option value="">alle</option>${ph.map(([id, d]) => `<option value="${escHtml(id)}">${escHtml(profileName() ? profileName() + " · " + devShown(d) : devShown(d))}</option>`).join("")}</select></div>`).join("")}` : ""}
    <div class="small muted" style="margin-top:8px">Ohne Aufteilen sehen alle alles – wer zuerst abhakt, hakt für alle ab.</div>
    <div class="zdb"><button class="btn" data-zdx>Abbrechen</button><button class="btn primary" data-zdgo>Schicken</button></div></div>`;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
}
function zDlgClose() {
  const el = $("zDlg");
  if (!el) return;
  el.classList.remove("show");
  setTimeout(() => {
    el.hidden = true;
    el.innerHTML = "";
  }, 180);
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-zdx]") || e.target.id === "zDlg") {
    zDlgClose();
    return;
  }
  if (e.target.closest("[data-zdgo]")) {
    const ids = [...document.querySelectorAll("[data-zdph]")].filter((x) => x.checked).map((x) => x.dataset.zdph);
    if (!ids.length) {
      toast("Wähl mindestens ein Handy");
      return;
    }
    const assign = {};
    for (const s of document.querySelectorAll("[data-zdas]"))
      if (s.value && ids.includes(s.value)) assign[s.dataset.zdas] = s.value;
    zStart(
      ids.map((id) => ({
        id,
        name: zDevName(id),
      })),
      assign
    );
    zDlgClose();
    toast(ids.length === 1 ? `Einkauf an ${zDevName(ids[0])} geschickt` : `Einkauf an ${ids.length} Handys geschickt`);
  }
});
function zTripCheck() {
  if (IS_PC) return;
  const t = zMyTrip();
  if (!t || t.by === devId()) return;
  let seen = "";
  try {
    seen = localStorage.getItem("hb-ztrip") || "";
  } catch (_) {}
  if (seen === t.id) return;
  try {
    localStorage.setItem("hb-ztrip", t.id);
  } catch (_) {}
  if (Date.now() - t.at > 2 * 864e5) return;
  const me = devId(),
    mine = zGroups(
      zList().filter((x) => !x.done),
      "laden"
    ).filter((g) => !g.shop || zMineShop(t, g.k, me)),
    n = sum(mine, (g) => g.rows.length);
  const shops = mine.filter((g) => g.shop).map((g) => g.shop.name),
    split = t.assign && Object.keys(t.assign).length;
  const ti = "🛒 Einkauf gestartet",
    b = `${split && shops.length ? shops.join(" & ") + " – " : ""}${n} ${n === 1 ? "Sache" : "Sachen"} · von ${t.from || "PC"}`;
  try {
    if (window.AndroidBridge && AndroidBridge.notifyNow) AndroidBridge.notifyNow(900001, ti, b, "einkauf");
  } catch (_) {}
  toast(
    `${ti}: ${b}`,
    () => {
      ui.view = "shop";
      render();
      window.scrollTo({
        top: 0,
      });
    },
    "Öffnen",
    8000
  );
}
function zDevOutCheck() {
  const out = store.settings.devOut || {};
  if (!out[devId()] || !SYNC.token) return;
  try {
    pairSave(null);
  } catch (_) {}
  SYNC.token = "";
  SYNC.queue = [];
  SYNC.state = "off";
  saveSync();
  try {
    localStorage.removeItem("hb-devid");
    localStorage.removeItem("hb-devs");
  } catch (_) {}
  toast("Dieses Gerät wurde aus der Kopplung entfernt – die Daten hier bleiben erhalten", null, null, 9000);
  try {
    renderSyncDot();
  } catch (_) {}
}
/* Wischen */
const ZTRASH =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';
function zDel(id) {
  const before = zList(),
    it = before.find((x) => x.id === id);
  if (!it) return;
  zSave(before.filter((x) => x.id !== id));
  toast(`${it.n} gelöscht`, () => zSave([...zList(), it].sort((a, b) => (a.c || 0) - (b.c || 0))), "Rückgängig", 5000);
}
(() => {
  let st = null;
  const W = 84;
  const closeAll = (ex) =>
    document.querySelectorAll(".zrw.open").forEach((r) => {
      if (r !== ex) {
        r.classList.remove("open");
        r.querySelector(".zr").style.transform = "";
      }
    });
  document.addEventListener(
    "touchstart",
    (e) => {
      const w = e.target.closest(".zrw");
      if (!w || e.target.closest(".zdel")) {
        if (!w) closeAll();
        return;
      }
      const t = e.touches[0];
      st = {
        w,
        x: t.clientX,
        y: t.clientY,
        dx: 0,
        on: false,
        base: w.classList.contains("open") ? -W : 0,
      };
    },
    {
      passive: true,
    }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (!st) return;
      const t = e.touches[0],
        dx = t.clientX - st.x,
        dy = t.clientY - st.y;
      if (!st.on) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          st = null;
          return;
        }
        st.on = true;
        closeAll(st.w);
        st.w.classList.add("drag");
      }
      st.dx = dx;
      const x = Math.min(0, st.base + dx);
      st.w.querySelector(".zr").style.transform = `translateX(${x}px)`;
      st.w.classList.toggle("far", x < -180);
    },
    {
      passive: true,
    }
  );
  document.addEventListener("touchend", () => {
    if (!st) return;
    const s0 = st;
    st = null;
    if (!s0.on) return;
    const r = s0.w.querySelector(".zr"),
      x = Math.min(0, s0.base + s0.dx);
    s0.w.classList.remove("drag", "far");
    if (x < -180) {
      r.style.transform = "translateX(-110%)";
      setTimeout(() => zDel(s0.w.dataset.zrow), 160);
      return;
    }
    if (x < -W / 2) {
      s0.w.classList.add("open");
      r.style.transform = `translateX(${-W}px)`;
    } else {
      s0.w.classList.remove("open");
      r.style.transform = "";
    }
    const stop = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
    };
    document.addEventListener("click", stop, {
      capture: true,
      once: true,
    });
    setTimeout(
      () =>
        document.removeEventListener("click", stop, {
          capture: true,
        }),
      350
    );
  });
  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-zdel]");
    if (d) {
      zDel(d.dataset.zdel);
      return;
    }
    if (!e.target.closest(".zrw.open")) closeAll();
  });
})();
/* Laden wählen */
function zPickOpen(id) {
  const it = zList().find((x) => x.id === id);
  if (!it) return;
  const w = zBestFor(it.n),
    auto = w && zShopBy(w.s),
    mine = (store.settings.shops || []).map(zShopBy).filter(Boolean),
    cur = it.s || "";
  if (cur && !mine.some((o) => o.id === cur) && zShopBy(cur)) mine.push(zShopBy(cur));
  let el = $("zPick");
  if (!el) {
    el = document.createElement("div");
    el.id = "zPick";
    el.className = "backdrop zdlgbg";
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="zdlg zpk" role="dialog" aria-label="Laden wählen"><h2>Wo kaufst du ${escHtml(it.n)}?</h2>
    <div class="zpkg"><button class="zpko ${cur ? "" : "on"}" data-zpk="">${auto ? zLogo(auto, 44) : `<span class="zpkq">${svgIcon("spark", 22)}</span>`}<b>Automatisch</b><small>${auto ? "am günstigsten: " + escHtml(auto.name) : "wo es am günstigsten ist"}</small></button>
    ${mine.map((o) => `<button class="zpko ${o.id === cur ? "on" : ""}" data-zpk="${o.id}">${zLogo(o, 44)}<b>${escHtml(o.name)}</b></button>`).join("")}</div>
    <div class="zdb"><button class="btn" data-zpkx>Abbrechen</button></div></div>`;
  el.dataset.item = id;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
}
function zPickClose() {
  const el = $("zPick");
  if (!el) return;
  el.classList.remove("show");
  setTimeout(() => {
    el.hidden = true;
    el.innerHTML = "";
  }, 180);
}
document.addEventListener(
  "click",
  (e) => {
    const o = e.target.closest("[data-zpick]");
    if (o) {
      e.preventDefault();
      e.stopPropagation();
      zPickOpen(o.dataset.zpick);
      return;
    }
    if (e.target.closest("[data-zpkx]") || e.target.id === "zPick") {
      zPickClose();
      return;
    }
    const k = e.target.closest("[data-zpk]");
    if (k) {
      const id = $("zPick").dataset.item,
        v = k.dataset.zpk;
      zSave(
        zList().map((x) =>
          x.id === id
            ? v
              ? {
                  ...x,
                  s: v,
                }
              : (({ s: _, ...r }) => r)(x)
            : x
        )
      );
      zPickClose();
      return;
    }
  },
  true
);
/* Liste */
const ZB = {
  bons: {},
  busy: "",
  x: null,
};
function zSort() {
  try {
    return localStorage.getItem("hb-zsort") || "laden";
  } catch (_) {
    return "laden";
  }
}
function zCatFor(sh) {
  const w =
    {
      super: "lebensmittel",
      disc: "lebensmittel",
      drog: "drogerie",
      kleid: "kleid",
      elek: "elektr",
      bau: "haushalt",
      moebel: "wohn",
      tier: "tier",
      online: "sonst",
    }[sh && sh.cat] || "sonst";
  return (
    catByWord("ausgabe", w) ||
    catByWord("ausgabe", w === "lebensmittel" ? "haushalt" : w === "drogerie" ? "haushalt" : "sonst") ||
    catByWord("ausgabe", "haushalt") ||
    cats("ausgabe")[0] ||
    ""
  );
}
function zPayOf(lines) {
  const t = normText((lines || []).map((l) => l.t).join(" "));
  if (
    /girocard|ec[- ]?karte|ec-cash|kartenzahlung|karte\b|visa|mastercard|maestro|v pay|vpay|kontaktlos|debit|apple pay|google pay|amex/.test(
      t
    )
  )
    return "karte";
  if (/\bbar\b|bargeld|rückgeld|rueckgeld|gegeben|zurück/.test(t)) return "bar";
  return "";
}
function zExtras(lines, rows) {
  const toks = rows.map((x) => priceToks(x.it.n));
  return receiptItems(lines || [])
    .filter((r) => {
      const tk = priceToks(r.n);
      return tk.length && !toks.some((t) => sameProduct(t, tk));
    })
    .slice(0, 8);
}
function zMiniCard(T) {
  const L = zList(),
    open = L.filter((x) => !x.done).length,
    done = L.filter((x) => x.done).length;
  const zi = T ? "cart" : "list";
  const txt = T
    ? `Einkauf läuft${
        T.devs && T.devs.length
          ? " auf " +
            T.devs
              .filter((d) => !(T.fin || {})[d.id])
              .map((d) => escHtml(zDevName(d.id)))
              .join(" & ")
          : ""
      }`
    : L.length
      ? "Einkaufszettel wird geplant"
      : "Einkaufszettel";
  const sub = T
    ? `${done} von ${open + done} abgehakt`
    : L.length
      ? `${open} ${open === 1 ? "Sache" : "Sachen"} · tippen zum Ansehen`
      : "noch leer – schreib etwas drauf";
  return `<div class="card zmini"><button class="zmh" data-zopen><span class="zmt">${svgIcon(zi, 18)}<span>${escHtml(txt).replace(/&amp;/g, "&")}</span></span><small>${sub}</small></button>
    <div class="zadd"><input class="in" id="zIn" placeholder="Was brauchst du?" autocomplete="off" aria-label="Was brauchst du?"><button class="btn primary" data-zadd aria-label="Hinzufügen">+</button></div></div>`;
}

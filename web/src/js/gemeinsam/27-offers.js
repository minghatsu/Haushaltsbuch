/* Wochenangebote */
const SHOPS = [
  {
    cat: "disc",
    id: "penny",
    name: "Penny",
    re: /\bpenny\b/,
    color: "#CD1414",
    url: "https://www.penny.de/angebote",
  },
  {
    cat: "super",
    id: "rewe",
    name: "REWE",
    re: /\brewe\b/,
    color: "#CC071E",
    url: "https://www.rewe.de/angebote/",
  },
  {
    cat: "super",
    id: "edeka",
    name: "EDEKA",
    re: /\bedeka\b/,
    color: "#1F4B9C",
    url: "https://www.edeka.de/angebote/",
  },
  {
    cat: "disc",
    id: "aldinord",
    name: "Aldi Nord",
    re: /\baldi ?nord\b/,
    color: "#00549F",
    url: "https://www.aldi-nord.de/angebote.html",
  },
  {
    cat: "disc",
    id: "aldi",
    name: "Aldi Süd",
    re: /\baldi\b/,
    color: "#00005F",
    url: "https://www.aldi-sued.de/angebote",
  },
  {
    cat: "disc",
    id: "lidl",
    name: "Lidl",
    re: /\blidl\b/,
    color: "#0050AA",
    url: "https://www.lidl.de/c/online-prospekte/s10005610",
  },
  {
    cat: "super",
    id: "kaufland",
    name: "Kaufland",
    re: /\bkaufland\b/,
    color: "#E10915",
    url: "https://filiale.kaufland.de/angebote/uebersicht.html",
  },
  {
    cat: "disc",
    id: "netto",
    name: "Netto",
    re: /\bnetto marken|\bnetto\b/,
    color: "#FFD400",
    ink: "#1A1A1A",
    url: "https://www.netto-online.de/filialangebote",
  },
  {
    cat: "drog",
    id: "rossmann",
    name: "Rossmann",
    re: /\brossmann\b/,
    color: "#C3002D",
    url: "https://www.rossmann.de/de/angebote/m/angebote",
  },
  {
    cat: "drog",
    id: "dm",
    name: "dm",
    re: /\bdm\b(?!\s*[0-9])|dm-drogerie|dm drogerie/,
    color: "#002878",
    url: "https://www.dm.de/",
  },
  {
    cat: "disc",
    id: "norma",
    name: "Norma",
    re: /\bnorma\b/,
    color: "#E3000F",
    url: "https://www.norma-online.de/de/angebote/",
  },
  {
    cat: "super",
    id: "globus",
    name: "Globus",
    re: /\bglobus\b/,
    color: "#00843D",
    url: "https://www.globus.de/angebote/",
  },
  {
    cat: "super",
    id: "hit",
    name: "HIT",
    re: /\bhit markt|\bhit\b/,
    color: "#E2001A",
    url: "https://www.hit.de/angebote",
  },
  {
    cat: "super",
    id: "tegut",
    name: "tegut",
    re: /\btegut\b/,
    color: "#E2001A",
    url: "https://www.tegut.com/angebote-produkte/angebote.html",
  },
  {
    cat: "drog",
    id: "apotheke",
    name: "Apotheke",
    re: /apothek/,
    color: "var(--accent)",
    url: "https://www.aponet.de/apotheke/apothekensuche",
  },
  {
    cat: "drog",
    id: "mueller",
    name: "Müller",
    re: /\bmüller\b|\bmueller\b/,
    color: "#F07D00",
    url: "https://www.mueller.de/prospekte/",
  },
  {
    cat: "kleid",
    id: "hm",
    name: "H&M",
    re: /\bh ?& ?m\b|\bh und m\b|hennes/,
    color: "#E50010",
    url: "https://www2.hm.com/de_de/index.html",
  },
  {
    cat: "kleid",
    id: "zara",
    name: "Zara",
    re: /\bzara\b/,
    color: "#111111",
    url: "https://www.zara.com/de/",
  },
  {
    cat: "kleid",
    id: "cunda",
    name: "C&A",
    re: /\bc ?& ?a\b|\bc und a\b/,
    color: "#004B93",
    url: "https://www.c-and-a.com/de/de/shop/sale",
  },
  {
    cat: "kleid",
    id: "primark",
    name: "Primark",
    re: /\bprimark\b/,
    color: "#0DB2E3",
    url: "https://www.primark.com/de-de",
  },
  {
    cat: "kleid",
    id: "kik",
    name: "KiK",
    re: /\bkik\b/,
    color: "#E30613",
    url: "https://www.kik.de/c/s/sale",
  },
  {
    cat: "kleid",
    id: "takko",
    name: "Takko",
    re: /\btakko\b/,
    color: "#C8102E",
    url: "https://www.takko.com/de-de/sale/",
  },
  {
    cat: "kleid",
    id: "newyorker",
    name: "New Yorker",
    re: /\bnew yorker\b/,
    color: "#1A1A1A",
    url: "https://www.newyorker.de/",
  },
  {
    cat: "kleid",
    id: "tkmaxx",
    name: "TK Maxx",
    re: /\btk ?maxx\b/,
    color: "#C8102E",
    url: "https://www.tkmaxx.com/de/de/sale/c/35000000",
  },
  {
    cat: "kleid",
    id: "deichmann",
    name: "Deichmann",
    re: /\bdeichmann\b/,
    color: "#00843D",
    url: "https://www.deichmann.com/de-de/c/sale-477",
  },
  {
    cat: "elek",
    id: "mediamarkt",
    name: "MediaMarkt",
    re: /media ?markt/,
    color: "#DF0000",
    url: "https://www.mediamarkt.de/de/campaign/angebote-aktionen",
  },
  {
    cat: "elek",
    id: "saturn",
    name: "Saturn",
    re: /\bsaturn\b/,
    color: "#F28B00",
    url: "https://www.saturn.de/de/campaign/angebote-aktionen",
  },
  {
    cat: "elek",
    id: "expert",
    name: "expert",
    re: /\bexpert\b/,
    color: "#E2001A",
    url: "https://www.expert.de/",
  },
  {
    cat: "bau",
    id: "obi",
    name: "OBI",
    re: /\bobi\b/,
    color: "#FF7E21",
    url: "https://www.obi.de/angebote",
  },
  {
    cat: "bau",
    id: "hornbach",
    name: "Hornbach",
    re: /\bhornbach\b/,
    color: "#F7A600",
    ink: "#1A1A1A",
    url: "https://www.hornbach.de/aktuelles/prospekte-und-kataloge/",
  },
  {
    cat: "bau",
    id: "bauhaus",
    name: "Bauhaus",
    re: /\bbauhaus\b/,
    color: "#E30613",
    url: "https://www.bauhaus.info/ad/angebote",
  },
  {
    cat: "bau",
    id: "toom",
    name: "toom",
    re: /\btoom\b/,
    color: "#C7003C",
    url: "https://toom.de/angebote-aktionen/",
  },
  {
    cat: "moebel",
    id: "ikea",
    name: "IKEA",
    re: /\bikea\b/,
    color: "#0058A3",
    url: "https://www.ikea.com/de/de/offers/",
  },
  {
    cat: "moebel",
    id: "jysk",
    name: "JYSK",
    re: /\bjysk\b/,
    color: "#1B4F9C",
    url: "https://jysk.de/aktion",
  },
  {
    cat: "moebel",
    id: "poco",
    name: "POCO",
    re: /\bpoco\b/,
    color: "#E3000F",
    url: "https://www.poco.de/k/sale",
  },
  {
    cat: "moebel",
    id: "action",
    name: "Action",
    re: /\baction\b/,
    color: "#0E4C92",
    url: "https://www.action.com/de-de/wochenangebote/",
  },
  {
    cat: "moebel",
    id: "tedi",
    name: "TEDi",
    re: /\btedi\b/,
    color: "#E2001A",
    url: "https://www.tedi.com/prospekt",
  },
  {
    cat: "tier",
    id: "fressnapf",
    name: "Fressnapf",
    re: /\bfressnapf\b/,
    color: "#00843D",
    url: "https://www.fressnapf.de/aktionen-angebote/",
  },
  {
    cat: "online",
    id: "amazon",
    name: "Amazon",
    re: /\bamazon\b|amzn/,
    color: "#232F3E",
    url: "https://www.amazon.de/deals",
  },
  {
    cat: "online",
    id: "zalando",
    name: "Zalando",
    re: /\bzalando\b/,
    color: "#FF6900",
    url: "https://www.zalando.de/outlet/",
  },
  {
    cat: "online",
    id: "otto",
    name: "OTTO",
    re: /\botto\b/,
    color: "#D52B1E",
    url: "https://www.otto.de/sale/",
  },
  {
    cat: "online",
    id: "temu",
    name: "Temu",
    re: /\btemu\b/,
    color: "#FB7701",
    url: "https://www.temu.com/de",
  },
];
function shopKind(sh) {
  if (sh.id === "apotheke") return "apo";
  const u = sh.url || "";
  if (sh.cat === "super" || sh.cat === "disc" || /prospekt/i.test(u)) return "leaf";
  if (/angebot|sale|deals|aktion|offers|outlet/i.test(u)) return "deal";
  return "web";
}
function shopBtnLbl(sh) {
  const k = shopKind(sh);
  return {
    apo: svgIcon("pin", 16) + " " + escHtml(uiText("apo_find_s")),
    leaf: svgIcon("cart", 16) + " " + escHtml(uiText("sh_leaf")),
    deal: svgIcon("tag", 16) + " " + escHtml(uiText("sh_deal")),
    web:
      `<svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M7 17 17 7M9 7h8v8"/></svg>` +
      " " +
      escHtml(uiText("sh_web")),
  }[k];
}
function shopOpenTxt(sh) {
  return uiText(shopKind(sh) === "leaf" ? "sh_leaf_open" : "sh_page_open");
}
const SHOP_CATS = [
  ["super", "Supermarkt", "cart"],
  ["disc", "Discounter", "tag"],
  ["drog", "Drogerie & Apotheke", "health"],
  ["kleid", "Kleidung & Schuhe", "shirt"],
  ["elek", "Elektronik", "tv"],
  ["bau", "Baumarkt", "home"],
  ["moebel", "Möbel & Haushalt", "home"],
  ["tier", "Tierbedarf", "paw"],
  ["online", "Online", "cloud"],
];
const SHOP_TAB = {
  super: "Supermarkt",
  disc: "Discounter",
  drog: "Drogerie & Apotheke",
  kleid: "Kleidung",
  elek: "Elektronik",
  bau: "Baumarkt",
  moebel: "Möbel",
  tier: "Tier",
  online: "Online",
};
function shopStats() {
  const from = shiftYm(ymOf(new Date()), -5),
    out = {};
  for (const t of store.tx) {
    if (t.kind !== "ausgabe" || (t.date || "").slice(0, 7) < from) continue;
    const n = normText(t.note),
      sh = SHOPS.find((x) => x.re.test(n));
    if (!sh) continue;
    const o =
      out[sh.id] ||
      (out[sh.id] = {
        shop: sh,
        sum: 0,
        count: 0,
        last: "",
      });
    o.sum += t.amount;
    o.count++;
    if (t.date > o.last) o.last = t.date;
  }
  return Object.values(out).sort((a, b) => b.sum - a.sum);
}
function offersCard() {
  let chosen = (store.settings.shops || []).map((id) => SHOPS.find((x) => x.id === id)).filter(Boolean);
  const stats = Object.fromEntries(shopStats().map((o) => [o.shop.id, o]));
  if (!chosen.length)
    return `<div class="card" style="order:9"><div class="card-head"><h2>${headIcon("cart")}Angebote deiner Läden</h2></div>
    <div class="notice info"><span>Wähl aus, von welchen Läden du die Wochenangebote hier sehen willst.</span><button class="btn primary" data-go="more" data-scroll="shopEd">Läden auswählen</button></div></div>`;
  const tabsHere = SHOP_CATS.map((c) => [c, chosen.filter((sh) => sh.cat === c[0]).length]).filter((x) => x[1] > 0);
  if (ui.shopCat && !tabsHere.some((x) => x[0][0] === ui.shopCat)) ui.shopCat = "";
  const tabs =
    tabsHere.length >= 2
      ? `<div class="stabs" data-noswipe="1" role="group" aria-label="Kategorie">${[[["", "Alle"], chosen.length], ...tabsHere].map(([c, n]) => `<button class="stab ${(ui.shopCat || "") === c[0] ? "on" : ""}" data-shoptab="${c[0]}" aria-pressed="${(ui.shopCat || "") === c[0]}">${escHtml(SHOP_TAB[c[0]] || c[1])}<small>${n}</small></button>`).join("")}</div>`
      : "";
  chosen = ui.shopCat ? chosen.filter((sh) => sh.cat === ui.shopCat) : chosen;
  if (!chosen.some((sh) => sh.id === ui.shopSel)) ui.shopSel = chosen[0].id;
  return `<div class="card" style="order:9" id="offersCard">
    <div class="card-head"><h2>${headIcon("cart")}Angebote deiner Läden</h2><button class="link" data-go="more" data-scroll="shopEd">Läden ${svgIcon("right", 16)}</button></div>
    ${tabs}<div class="srail ${ui.shopFresh ? "fresh" : ""}" id="srail">${chosen
      .map(
        (sh) =>
          `<button class="sbtn ${sh.id === ui.shopSel ? "on" : ""}" data-shopsel="${sh.id}" aria-pressed="${sh.id === ui.shopSel}">${brandBadge(
            {
              t: sh.name.replace(/ .*/, "").slice(0, 1),
              bg: sh.color,
              ink: sh.ink || "#fff",
              domain: SHOP_DOMAINS[sh.id] || "",
            }
          )}<span>${escHtml(sh.name)}</span></button>`
      )
      .join("")}
</div>
    <div id="shopPanel">${shopPanel(
      chosen.find((x) => x.id === ui.shopSel),
      stats
    )}</div>
  </div>`;
}
function nextSat() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return isoOf(d);
}
function shopDeals(id) {
  const t = isoToday();
  return (store.settings.deals || [])
    .filter((x) => x.shop === id && (!x.until || x.until >= t))
    .sort((a, b) => String(a.until).localeCompare(String(b.until)));
}
function priceToks(name) {
  return normText(name)
    .replace(/[^a-zäöüß ]/g, " ")
    .split(/\s+/)
    .filter(
      (x) =>
        x.length >= 4 &&
        !/^(stück|stck|gramm|liter|packung|frisch|deutsche|beutel|dose|flasche|klasse|natur|extra|super|classic)$/.test(
          x
        )
    );
}
function sameProduct(a, b) {
  for (const x of a)
    for (const y of b) {
      if (x === y) return x;
      if (x.length >= 5 && y.length >= 5 && (x.includes(y) || y.includes(x))) return x.length < y.length ? x : y;
    }
  return "";
}
function shopPrices(id) {
  const book = store.settings.pricebook || [],
    here = {};
  for (const e of book)
    if (e.s === id) {
      const k = normText(e.n);
      if (!here[k] || here[k].d <= e.d) here[k] = e;
    }
  return Object.values(here)
    .sort((a, b) => b.d.localeCompare(a.d))
    .slice(0, 5)
    .map((e) => {
      const te = priceToks(e.n),
        other = {};
      let label = "";
      for (const o of book) {
        if (o.s === id) continue;
        const w = sameProduct(te, priceToks(o.n));
        if (!w) continue;
        if (!other[o.s] || other[o.s].d <= o.d) other[o.s] = o;
        label = label || w;
      }
      const os = Object.values(other).sort((a, b) => a.p - b.p),
        best = os[0];
      return {
        w: label || te.sort((a, b) => b.length - a.length)[0] || normText(e.n),
        e,
        best: best && best.p < e.p - 0.004 ? best : null,
        cheapest: os.length > 0 && os.every((o) => o.p >= e.p),
      };
    });
}
function shopPanel(sh, stats) {
  if (!sh) return "";
  const o = stats[sh.id] || {
    sum: 0,
    count: 0,
    last: "",
  };
  const recent = store.tx
    .filter((t) => t.kind === "ausgabe" && sh.re.test(normText(t.note)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const deals = shopDeals(sh.id),
    prices = shopPrices(sh.id),
    name = (n) => n.charAt(0).toUpperCase() + n.slice(1);
  const shopName = (id) =>
    (
      SHOPS.find((x) => x.id === id) || {
        name: id,
      }
    ).name;
  return `<div class="spanel">
    <div class="spt"><div class="grow"><b>${escHtml(sh.name)}</b><span class="small muted">${escHtml(
      o.count
        ? uiText(o.count === 1 ? "sh_stat1" : "sh_stat", {
            a: fmtEur0(o.sum / 6),
            n: String(o.count),
          })
        : uiText("sh_none")
    )}</span></div>
      <button class="btn primary" data-openshop="${escHtml(sh.url)}">${shopBtnLbl(sh)}</button></div>
    <div class="ssec"><span>${escHtml(uiText("sh_saved"))}</span></div>
    ${
      deals
        .map(
          (d) =>
            `<div class="deal2"><span class="grow"><b>${escHtml(d.text)}</b><span class="small muted">${escHtml(
              d.until
                ? uiText("sh_until", {
                    d: shortDate(d.until),
                  })
                : uiText("sh_nodate")
            )}</span></span>${d.price ? `<b class="pos">${escHtml(fmtEur(d.price))}</b>` : ""}<button class="icon-btn" data-dealdel="${escHtml(d.id)}" aria-label="${escHtml(uiText("sh_del"))}">×</button></div>`
        )
        .join("") ||
      (ui.dealAdd === sh.id
        ? ""
        : `<div class="small muted" style="padding:4px 0 2px">${escHtml(uiText(shopKind(sh) === "leaf" ? "sh_hint_leaf" : "sh_hint_page"))}</div>`)
    }
    ${ui.dealAdd === sh.id ? `<div class="dealform"><input class="in" id="dealText" placeholder="${escHtml(uiText("sh_what_ph"))}" aria-label="${escHtml(uiText("sh_what"))}"><div class="grid2"><input class="in" id="dealPrice" inputmode="decimal" placeholder="${escHtml(uiText("sh_price"))}" aria-label="${escHtml(uiText("sh_price"))}"><input class="in" type="date" id="dealUntil" value="${escHtml(nextSat())}" aria-label="${escHtml(uiText("sh_valid"))}"></div><div class="row-btns"><button class="btn" data-dealcancel="1">${escHtml(uiText("sh_cancel"))}</button><button class="btn primary" data-dealsave="${escHtml(sh.id)}">${escHtml(uiText("sh_keep"))}</button></div></div>` : `<button class="chip" data-dealadd="${escHtml(sh.id)}" style="margin-top:6px">+ ${escHtml(uiText("sh_add"))}</button>`}
    ${
      prices.length
        ? `<div class="ssec"><span>${escHtml(uiText("sh_prices"))}</span><span class="small muted">${escHtml(uiText("sh_from_rc"))}</span></div>
      ${prices
        .map(
          (x) =>
            `<div class="meta-row" style="padding:5px 0"><span>${escHtml(name(x.w))}${
              x.best
                ? `<br><span class="small" style="color:var(--warn)">${escHtml(
                    uiText("sh_at", {
                      x: shopName(x.best.s),
                      p: fmtEur(x.best.p),
                    })
                  )}</span>`
                : x.cheapest
                  ? `<br><span class="small pos">${escHtml(uiText("sh_cheapest"))}</span>`
                  : ""
            }</span><b>${escHtml(fmtEur(x.e.p))}</b></div>`
        )
        .join("")}`
        : ""
    }
    ${
      recent.length
        ? `<div class="ssec"><span>${escHtml(
            uiText("sh_lastat", {
              x: sh.name,
            })
          )}</span></div>${recent.map((t) => `<div class="meta-row" style="padding:5px 0"><span>${escHtml(shortDate(t.date))}${hasReceipt(t.id) ? " · " + escHtml(uiText("sh_rc")) : ""}</span><b>${escHtml(fmtEur(t.amount))}</b></div>`).join("")}`
        : ""
    }
  </div>`;
}
function rerenderShopPanel() {
  const el = $("shopPanel");
  if (!el || !ui.shopSel) return;
  const stats = Object.fromEntries(shopStats().map((o) => [o.shop.id, o]));
  el.innerHTML = shopPanel(
    SHOPS.find((x) => x.id === ui.shopSel),
    stats
  );
}
function openPage(url) {
  if (window.AndroidBridge && window.AndroidBridge.openInApp) {
    try {
      window.AndroidBridge.openInApp(url);
      return;
    } catch (e) {}
  }
  window.open(url, "_blank", "noopener");
}
document.addEventListener("click", (e) => {
  const t = e.target;
  const op = t.closest("[data-openshop]");
  if (op) {
    openPage(op.dataset.openshop);
    return;
  }
  const da = t.closest("[data-dealadd]");
  if (da) {
    ui.dealAdd = da.dataset.dealadd;
    rerenderShopPanel();
    setTimeout(() => {
      const el = $("dealText");
      if (el) el.focus();
    }, 30);
    return;
  }
  if (t.closest("[data-dealcancel]")) {
    ui.dealAdd = null;
    rerenderShopPanel();
    return;
  }
  const ds = t.closest("[data-dealsave]");
  if (ds) {
    const text = ($("dealText") || {}).value.trim(),
      pr = parseAmt(($("dealPrice") || {}).value || ""),
      until = ($("dealUntil") || {}).value || "";
    if (!text) {
      toast("Was ist im Angebot?");
      return;
    }
    const keep = (store.settings.deals || []).filter(
      (x) => !x.until || x.until >= isoOf(new Date(Date.now() - 14 * 864e5))
    );
    store.settings.deals = [
      ...keep,
      {
        id: newId(),
        shop: ds.dataset.dealsave,
        text: text.slice(0, 60),
        price: pr > 0 ? round2(pr) : null,
        until,
      },
    ];
    ui.dealAdd = null;
    if (document.activeElement) document.activeElement.blur();
    saveSettings();
    rerenderShopPanel();
    toast("Angebot gemerkt");
    return;
  }
  const dd = t.closest("[data-dealdel]");
  if (dd) {
    const old = store.settings.deals || [];
    store.settings.deals = old.filter((x) => x.id !== dd.dataset.dealdel);
    saveSettings();
    rerenderShopPanel();
    toast("Gelöscht", () => {
      store.settings.deals = old;
      saveSettings();
      rerenderShopPanel();
    });
    return;
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.target.id === "dealText" || e.target.id === "dealPrice")) {
    const b = document.querySelector("[data-dealsave]");
    if (b) b.click();
  }
});
function initShopRail() {
  const st = $("srail");
  if (!st) return;
  const items = [...st.querySelectorAll("[data-shopsel]")],
    n = items.length;
  if (!n) return;
  items.forEach((b) => {
    b.querySelectorAll("img").forEach((im) => {
      im.draggable = false;
    });
  });
  let pos = Math.max(
    0,
    items.findIndex((b) => b.dataset.shopsel === ui.shopSel)
  );
  const step = () => Math.min(78, (st.clientWidth || window.innerWidth - 32) / 4.6);
  const rel = (i, p) => {
    let d = (((i - p) % n) + n) % n;
    if (d > n / 2) d -= n;
    return d;
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  let last = items.map((_, i) => rel(i, pos));
  const place = (anim) => {
    const maxD = n >= 5 ? 2.4 : 1.4,
      cur = ((Math.round(pos) % n) + n) % n;
    items.forEach((b, i) => {
      const d = rel(i, pos),
        a = Math.abs(d),
        jump = Math.abs(d - last[i]) > 1.5;
      b.style.transition = !anim || jump ? "none" : "";
      const sc = a < 1 ? lerp(1.18, 0.92, a) : a < 2 ? lerp(0.92, 0.76, a - 1) : 0.76;
      b.style.transform = `translateX(calc(-50% + ${d * step()}px)) scale(${sc.toFixed(3)})`;
      b.style.opacity = String(
        a > maxD
          ? 0
          : a < 1
            ? lerp(1, 0.75, a)
            : a < 2
              ? lerp(0.75, 0.45, a - 1)
              : 0.45 * Math.max(0, (maxD - a) / (maxD - 2))
      );
      b.style.filter = `brightness(${(a < 1 ? lerp(1, 0.6, a) : 0.6).toFixed(2)}) saturate(${(a < 1 ? lerp(1, 0.7, a) : 0.7).toFixed(2)})`;
      b.style.zIndex = String(20 - Math.round(a * 4));
      b.style.pointerEvents = a > maxD ? "none" : "";
      const on = i === cur;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    last = items.map((_, i) => rel(i, pos));
  };
  try {
    if (st._ro) st._ro.disconnect();
    let w0 = st.clientWidth;
    st._ro = new ResizeObserver(() => {
      const w = st.clientWidth;
      if (w && w !== w0) {
        w0 = w;
        place(false);
      }
    });
    st._ro.observe(st);
  } catch (_) {}
  const settle = () => {
    pos = Math.round(pos);
    place(true);
    const id = items[((pos % n) + n) % n].dataset.shopsel;
    if (id !== ui.shopSel) selectShop(id, false);
  };
  place(false);
  if (n < 2) return;
  let x0 = null,
    y0 = 0,
    p0 = 0,
    lock = null,
    moved = false,
    vx = 0,
    lt = 0,
    lx = 0;
  st.addEventListener("contextmenu", (e) => e.preventDefault());
  st.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    x0 = e.clientX;
    y0 = e.clientY;
    p0 = pos;
    lock = null;
    moved = false;
    vx = 0;
    lt = Date.now();
    lx = e.clientX;
  });
  st.addEventListener("pointermove", (e) => {
    if (x0 === null) return;
    const mx = e.clientX - x0,
      my = e.clientY - y0;
    if (lock === null && (Math.abs(mx) > 5 || Math.abs(my) > 8)) {
      lock = Math.abs(mx) >= Math.abs(my) ? "x" : "y";
      if (lock === "x") {
        moved = true;
        try {
          st.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    }
    if (lock !== "x") return;
    e.preventDefault();
    const now = Date.now();
    if (now > lt) {
      vx = (e.clientX - lx) / (now - lt);
      lt = now;
      lx = e.clientX;
    }
    pos = p0 - mx / step();
    place(false);
  });
  const end = () => {
    if (x0 === null) return;
    if (lock === "x") {
      if (Date.now() - lt > 120) vx = 0;
      if (Math.abs(vx) > 0.4) pos -= Math.max(-2, Math.min(2, (vx * 70) / step()));
      settle();
    }
    x0 = null;
    lock = null;
  };
  st.addEventListener("pointerup", end);
  st.addEventListener("pointercancel", end);
  st.addEventListener(
    "click",
    (e) => {
      const b = e.target.closest("[data-shopsel]");
      if (!b) return;
      e.stopPropagation();
      if (moved) {
        moved = false;
        return;
      }
      const d = rel(items.indexOf(b), pos);
      if (Math.round(d)) {
        pos += Math.round(d);
        settle();
      }
    },
    true
  );
  st.tabIndex = 0;
  st.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      pos += 1;
      settle();
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      pos -= 1;
      settle();
      e.preventDefault();
    }
  });
}
function selectShop(id, center) {
  ui.shopSel = id;
  const r = $("srail");
  if (!r) return;
  if (!center) {
    const stats = Object.fromEntries(shopStats().map((o) => [o.shop.id, o]));
    $("shopPanel").innerHTML = shopPanel(
      SHOPS.find((x) => x.id === id),
      stats
    );
    return;
  }
  r.querySelectorAll("[data-shopsel]").forEach((b) => {
    const on = b.dataset.shopsel === id;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
    if (on && center)
      r.scrollTo({
        left: b.offsetLeft - (r.clientWidth - b.offsetWidth) / 2,
        behavior: "smooth",
      });
  });
  const stats = Object.fromEntries(shopStats().map((o) => [o.shop.id, o]));
  $("shopPanel").innerHTML = shopPanel(
    SHOPS.find((x) => x.id === id),
    stats
  );
}
document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-anachart]");
  if (c) {
    ui.anaChart = c.dataset.anachart;
    renderYear();
    return;
  }
  const o = e.target.closest("[data-anaopen]");
  if (o) {
    anaOpen(o.dataset.anaopen);
    return;
  }
});
let TL_ = {};
function anaFill(t, force) {
  const body = $("anaBody");
  if (
    !force &&
    ((body.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) ||
      pdHold(body))
  )
    return;
  const col =
    userCol("ana", t.k) ||
    themeCol(
      (TL_[t.k] || [])[1],
      ["kpi", "cat", "trend", "io", "calc", "plan", "lohn", "wk", "tax", "euer"].indexOf(t.k)
    ) ||
    "var(--accent)";
  $("anaBg").querySelector(".sheet").style.setProperty("--tc", col);
  $("anaHead").innerHTML =
    `<span class="ic">${svgIcon(t.icon, 18)}</span><span class="n"><b>${t.title}</b><span class="small muted">${t.sub}</span></span>`;
  if (force || body.innerHTML !== t.body) body.innerHTML = t.body;
}
function anaOpen(k) {
  ui.anaSel = k;
  renderYear();
  const t = (ui.anaTiles || []).find((x) => x.k === k);
  if (!t) return;
  anaFill(t, true);
  const bg = $("anaBg");
  bg.querySelector(".sheet").scrollTop = 0;
  bg.hidden = false;
  requestAnimationFrame(() => bg.classList.add("show"));
}
function anaClose() {
  const bg = $("anaBg");
  bg.classList.remove("show");
  ui.anaSel = "";
  if (ui.view === "year") renderYear();
  setTimeout(() => {
    bg.hidden = true;
    $("anaBody").innerHTML = "";
  }, 200);
}
$("anaBg").addEventListener("click", (e) => {
  if (e.target === $("anaBg") || e.target.closest("[data-anaclose]")) anaClose();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("anaBg").hidden) anaClose();
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-shopsel]");
  if (b) selectShop(b.dataset.shopsel, true);
  const f = e.target.closest("[data-recentf]");
  if (f) {
    ui.recentF = f.dataset.recentf;
    renderHome();
  }
});
function renderBudgetEd() {
  const el = $("budgetEd");
  if (!el || el.contains(document.activeElement)) return;
  const b = store.settings.budgets || {};
  const row = (c, sub) =>
    `<div class="edit-row acct-row budrow ${sub ? "cgbsub" : ""}"><span class="budn">${tile("ausgabe", c)}<b>${escHtml(c)}</b></span><input class="in" data-budget="${escHtml(c)}" inputmode="decimal" placeholder="kein Budget" aria-label="Monatsbudget ${escHtml(c)}" value="${b[c] ? escHtml(numStr(b[c])) : ""}"></div>`;
  /* Mit Gruppen: Budget für die ganze Gruppe oder je Unterkategorie */
  if (cgOn("ausgabe")) {
    el.innerHTML = cgList("ausgabe")
      .map((g) =>
        cgSolo(g)
          ? row(g.s[0] || g.n)
          : `<div class="edit-row acct-row budrow cgbgrp"><span class="budn">${cgIcon("ausgabe", g)}<b>${escHtml(g.n)}</b> <small class="muted" data-noi18n>${escHtml(uiText("cg_bud_all"))}</small></span><input class="in" data-budget="${escHtml(g.n)}" inputmode="decimal" placeholder="kein Budget" aria-label="Monatsbudget ${escHtml(g.n)}" value="${b[g.n] ? escHtml(numStr(b[g.n])) : ""}"></div>${cgSubs(g)
              .map((c) => row(c, 1))
              .join("")}`
      )
      .join("");
    return;
  }
  el.innerHTML = cats("ausgabe")
    .map(
      (c) =>
        `<div class="edit-row acct-row budrow"><span class="budn">${tile("ausgabe", c)}<b>${escHtml(c)}</b></span><input class="in" data-budget="${escHtml(c)}" inputmode="decimal" placeholder="kein Budget" aria-label="Monatsbudget ${escHtml(c)}" value="${b[c] ? escHtml(numStr(b[c])) : ""}"></div>`
    )
    .join("");
}
document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-budget]");
  if (!el) return;
  const raw = el.value.trim(),
    b = {
      ...(store.settings.budgets || {}),
    };
  if (raw === "") {
    delete b[el.dataset.budget];
  } else {
    const v = parseAmt(raw);
    if (!(v > 0)) {
      toast("Bitte einen Betrag eingeben");
      return;
    }
    b[el.dataset.budget] = round2(v);
  }
  store.settings.budgets = b;
  el.blur();
  saveSettings();
  toast("Budget gespeichert");
  render();
});
function renderDarkBtn() {
  const b = $("darkBtn");
  if (!b) return;
  const d = document.documentElement.dataset.theme === "dark";
  b.innerHTML = d
    ? `<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>`
    : `<svg class="i" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>`;
  b.setAttribute("aria-pressed", String(d));
}
if ($("darkBtn"))
  $("darkBtn").onclick = () => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("hb-theme", t);
    } catch (_) {}
    renderDarkBtn();
    try {
      render();
    } catch (_) {}
  };
setTimeout(renderDarkBtn, 0);
function renderShopEd() {
  const el = $("shopEd");
  if (!el) return;
  const sel = store.settings.shops || [],
    q = normText(ui.shopQ || ""),
    open = ui.shopOpen || (ui.shopOpen = {});
  const badge = (sh) =>
    brandBadge({
      t: sh.name.replace(/ .*/, "").slice(0, 1),
      bg: sh.color,
      ink: sh.ink || "#fff",
      domain: SHOP_DOMAINS[sh.id] || "",
    });
  const row = (sh) => {
    const i = sel.indexOf(sh.id);
    return `<button class="shrow" data-shop="${sh.id}" aria-pressed="${i >= 0}">${badge(sh)}<b>${escHtml(sh.name)}</b>${i >= 0 ? `<em>${i + 1}</em>` : ""}<span class="shck">${i >= 0 ? "✓" : ""}</span></button>`;
  };
  const search = `<div class="shsearch"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input class="in" id="shopQ" placeholder="Laden suchen …" value="${escHtml(ui.shopQ || "")}" autocomplete="off"></div>`;
  if (q) {
    const hits = SHOPS.filter((sh) => normText(sh.name).includes(q));
    if (document.activeElement && document.activeElement.id === "shopQ") {
      const l = el.querySelector(".shhits");
      if (l) {
        l.innerHTML = hits.length ? hits.map(row).join("") : `<p class="small muted">Kein Laden gefunden.</p>`;
        return;
      }
    }
    el.innerHTML =
      search +
      `<div class="shacc open shhits">${hits.length ? hits.map(row).join("") : `<p class="small muted">Kein Laden gefunden.</p>`}</div>`;
    return;
  }
  const tri = (n, of) => (n === 0 ? "none" : n === of ? "all" : "part"),
    mark = (st) => (st === "all" ? "✓" : st === "part" ? "–" : "");
  const nAll = SHOPS.filter((x) => sel.includes(x.id)).length,
    stA = tri(nAll, SHOPS.length);
  el.innerHTML =
    search +
    `<button class="shmaster" data-shopall="*" aria-pressed="${stA === "all"}"><span class="shtri" data-st="${stA}">${mark(stA)}</span><b>Alle Läden</b><small>${nAll} von ${SHOPS.length}</small></button>` +
    `<div style="display:flex;flex-direction:column;gap:10px">` +
    SHOP_CATS.map(([c, t, icn]) => {
      const list = SHOPS.filter((x) => x.cat === c);
      if (!list.length) return "";
      const n = list.filter((x) => sel.includes(x.id)).length,
        o = !!open[c],
        st = tri(n, list.length);
      return `<div class="shacc ${o ? "open" : ""}"><div class="shhwrap"><button class="shtri" data-shopall="${c}" data-st="${st}" aria-label="Alle ${escHtml(t)} ${st === "all" ? "abwählen" : "wählen"}">${mark(st)}</button><button class="shhead" data-shopcat="${c}" aria-expanded="${o}"><span class="shci">${svgIcon(icn, 18)}</span><b>${t}</b><small>${n} von ${list.length}</small>${svgIcon(o ? "up" : "down", 18)}</button></div>${o ? `<div class="shlist">${list.map(row).join("")}</div>` : ""}</div>`;
    }).join("") +
    `</div>` +
    (sel.length
      ? `<p class="small muted" style="margin:10px 4px 0">Die Nummer ist die Reihenfolge auf der Einkauf-Seite.</p>`
      : "");
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-shopall]");
  if (a) {
    const c = a.dataset.shopall,
      ids = SHOPS.filter((x) => c === "*" || x.cat === c).map((x) => x.id),
      sel = [...(store.settings.shops || [])],
      on = ids.every((id) => sel.includes(id));
    store.settings.shops = on
      ? sel.filter((id) => !ids.includes(id))
      : [...sel, ...ids.filter((id) => !sel.includes(id))];
    saveSettings();
    renderShopEd();
    return;
  }
  const tb = e.target.closest("[data-shoptab]");
  if (tb) {
    const card = $("offersCard");
    if (!card) return;
    ui.shopCat = tb.dataset.shoptab;
    ui.shopSel = "";
    ui.shopFresh = true;
    const x = document.createElement("div");
    x.innerHTML = offersCard();
    card.replaceWith(x.firstElementChild);
    ui.shopFresh = false;
    initShopRail();
    return;
  }
});
document.addEventListener("click", (e) => {
  const h = e.target.closest("[data-shopcat]");
  if (!h) return;
  const o = ui.shopOpen || (ui.shopOpen = {});
  o[h.dataset.shopcat] = !o[h.dataset.shopcat];
  renderShopEd();
});
document.addEventListener("input", (e) => {
  if (e.target.id === "shopQ") {
    const had = !!ui.shopQ;
    ui.shopQ = e.target.value;
    if (!ui.shopQ || !had) {
      renderShopEd();
      const i = $("shopQ");
      if (i) {
        i.focus();
        i.setSelectionRange(i.value.length, i.value.length);
      }
    } else renderShopEd();
  }
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-shop]");
  if (!b) return;
  const id = b.dataset.shop,
    sel = [...(store.settings.shops || [])],
    i = sel.indexOf(id);
  if (i >= 0) sel.splice(i, 1);
  else sel.push(id);
  store.settings.shops = sel;
  saveSettings();
  renderShopEd();
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-scroll]");
  if (!b) return;
  setTimeout(() => {
    const el = $(b.dataset.scroll);
    if (el)
      el.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
  }, 60);
});
function txFilter(l) {
  const f = ui.filter;
  if (f === "alle") return l;
  if (f === "mitbeleg") return l.filter((t) => hasReceipt(t.id));
  if (f === "ohnebeleg") return l.filter((t) => (t.kind === "ausgabe" || t.kind === "betrieb") && !hasReceipt(t.id));
  return l.filter((t) => t.kind === f);
}
function renderList() {
  try {
    dupRender();
  } catch (_) {}
  const filters = [
    ["alle", "Alle"],
    ["ausgabe", "Ausgaben"],
    ["einnahme", "Einnahmen"],
    ["betrieb", "Betrieblich"],
    ["vorauszahlung", "Steuer"],
  ].filter(([k]) => hasSelf() || (k !== "betrieb" && k !== "vorauszahlung") || ui.filter === k);
  $("filters").innerHTML =
    filters
      .map(([k, l]) => `<button class="fchip" data-filter="${k}" aria-pressed="${ui.filter === k}">${l}</button>`)
      .join("") +
    [
      ["mitbeleg", "Mit Beleg"],
      ["ohnebeleg", "Ohne Beleg"],
    ]
      .map(([k, l]) => `<button class="fchip" data-filter="${k}" aria-pressed="${ui.filter === k}">${l}</button>`)
      .join("");
  let list = monthCalc(ui.ym).tx;
  const cal = true;
  document
    .querySelectorAll("[data-lmode]")
    .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lmode === (cal ? "cal" : "list"))));
  $("calCard").hidden = !cal;
  if (cal) {
    if (ui.calDay && !ui.calDay.startsWith(ui.ym)) ui.calDay = null;
    const D = daysIn(ui.ym),
      per = new Array(D + 1).fill(0),
      today = isoToday();
    for (const t of list)
      if (t.kind === "ausgabe" || t.kind === "betrieb") per[Number(t.date.slice(8, 10))] += t.amount;
    const mx = Math.max(1, ...per),
      first = (new Date(ui.ym + "-01T12:00:00").getDay() + 6) % 7;
    $("calCard").innerHTML =
      `<div class="calg">${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => `<span class="w">${w}</span>`).join("")}${"<span></span>".repeat(first)}${Array.from(
        {
          length: D,
        },
        (_, k) => {
          const d = k + 1,
            iso = ui.ym + "-" + pad(d),
            v = per[d],
            a = v > 0 ? 0.15 + 0.85 * Math.sqrt(v / mx) : 0;
          return `<button data-calday="${iso}" class="${a > 0.78 ? "hot mid" : a > 0.66 ? "mid" : ""} ${ui.calDay === iso ? "sel" : ""} ${iso === today ? "today" : ""}" style="${v > 0 ? `background:color-mix(in srgb, var(--accent) ${Math.round(a * 100)}%, var(--sunk))` : ""}" aria-label="${d}. ${escHtml(MONTHS[ymParts(ui.ym)[1] - 1])}: ${escHtml(fmtEur(v))} ausgegeben">${d}${v > 0 ? `<small>${escHtml(shortK(v))}</small>` : ""}</button>`;
        }
      ).join("")}</div>
      <div class="calleg"><span>wenig</span><i></i><span>viel ausgegeben</span></div>`;
    if (ui.calDay) list = list.filter((t) => t.date === ui.calDay);
  }
  list = txFilter(list);
  const q = ui.q.trim().toLowerCase();
  if (q)
    list = list.filter((t) =>
      ((t.note || "") + " " + (t.cat || "") + " " + KIND_LABEL[t.kind]).toLowerCase().includes(q)
    );
  if (!list.length && cal && ui.calDay) {
    $("listCard").innerHTML = emptyState(
      "receipt",
      "An diesem Tag nichts gebucht",
      "Tipp auf einen anderen Tag oder noch einmal auf den Tag, um alle zu sehen."
    );
    return;
  }
  if (!list.length) {
    $("listCard").innerHTML = emptyState(
      "receipt",
      q || ui.filter !== "alle" ? "Nichts gefunden" : "Noch keine Buchungen",
      q || ui.filter !== "alle"
        ? "Probier einen anderen Suchbegriff oder Filter."
        : `In ${escHtml(monthName(ui.ym))} ist noch nichts eingetragen.`,
      q || ui.filter !== "alle" ? "" : `<button class="btn primary" data-add="ausgabe">Buchung eintragen</button>`
    );
    return;
  }
  const days = {};
  for (const t of sortTx(splGroup(list))) (days[t.date] = days[t.date] || []).push(t);
  $("listCard").innerHTML = Object.entries(days)
    .map(([d, ts]) => {
      const net = sum(ts, (t) => (t.kind === "umbuchung" ? 0 : t.kind === "einnahme" ? t.amount : -t.amount));
      return `<div class="dayhead"><span>${escHtml(dayLabel(d))}</span><span class="${net >= 0 ? "pos" : ""}">${net >= 0 ? "+" : "−"} ${escHtml(fmtEur(Math.abs(net)))}</span></div><div class="tline">${ts.map((t) => tlRow(t)).join("")}</div>`;
    })
    .join("");
}
function renderFix() {
  if (
    ($("v-fix").contains(document.activeElement) && /^(INPUT|SELECT)$/.test(document.activeElement.tagName)) ||
    pdHold($("v-fix"))
  )
    return;
  const c = monthCalc(ui.ym),
    paid = c.paid,
    past = ui.ym < ymOf(new Date());
  const shown = new Set(fixedForMonth(ui.ym, ui.fixShowAll).map((f) => f.id));
  const fx = ui.fixEdit ? fixedSorted() : fixedSorted().filter((f) => shown.has(f.id));
  const priv = fx.filter((f) => f.kind !== "betrieb"),
    bet = fx.filter((f) => f.kind === "betrieb");
  const done = fx.filter((f) => f.id in paid).length;
  if (ui.fixEdit) {
    $("v-fix").innerHTML =
      `<div class="card"><div class="card-head"><h2>Liste bearbeiten</h2><button class="btn primary" id="fixDone">Fertig</button></div>
      <p class="small muted" style="margin:-4px 0 10px">Trag am besten am Jahresanfang alle Fixkosten ein. Ändert sich ein Preis, gilt der neue Betrag <b>ab ${escHtml(monthName(ui.ym))}</b> für alle folgenden Monate – frühere Monate und schon abgehakte Beträge bleiben, wie sie waren. Ab einem anderen Monat ändern: oben erst den Monat wechseln. Bei „Vierteljährlich“, „Halbjährlich“, „Jährlich“ oder „Bestimmte Monate“ tippst du an, in welchen Monaten der Posten fällig ist.</p>
      ${fx
        .map(
          (
            f
          ) => `<div class="edit-row" data-fid="${escHtml(f.id)}"><input class="in" id="fxn-${escHtml(f.id)}" data-fxf="name" value="${escHtml(f.name)}" aria-label="Name"><input class="in" id="fxa-${escHtml(f.id)}" data-fxf="amount" inputmode="decimal" value="${escHtml(numStr(listAmt(f, ui.ym)))}" aria-label="Betrag ab ${escHtml(monthName(ui.ym))}"><select class="in" id="fxr-${escHtml(f.id)}" data-fxf="rhythm" aria-label="Rhythmus">${RHYTHMS.map(([k, l]) => `<option value="${k}" ${(f.rhythm || "monatlich") === k ? "selected" : ""}>${l}</option>`).join("")}</select><select class="in" id="fxk-${escHtml(f.id)}" data-fxf="kind" aria-label="Art"><option value="privat" ${f.kind !== "betrieb" ? "selected" : ""}>Privat</option><option value="betrieb" ${f.kind === "betrieb" ? "selected" : ""}>Betrieblich</option></select><button class="icon-btn" data-fxdel="${escHtml(f.id)}" aria-label="${escHtml(f.name)} löschen"><svg class="i" viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6.5 7l1 12.5h9L17.5 7M9.5 7V4.5h5V7"/></svg></button>
        ${priceNote(f) ? `<div class="small muted" style="grid-column:1/-1;margin:-2px 0 6px">${escHtml(priceNote(f))}</div>` : ""}
        ${(f.rhythm || "monatlich") !== "monatlich" ? `<div class="mchips" role="group" aria-label="Monate für ${escHtml(f.name)}">${MSHORT.map((n, i) => `<button class="mchip" data-fxmon="${escHtml(f.id)}|${i + 1}" aria-pressed="${(f.months || []).includes(i + 1)}">${n}</button>`).join("")}</div>` : ""}
        ${fxContract(f)}</div>`
        )
        .join("")}
      <button class="btn" id="fixAdd" style="margin-top:12px">+ Fixkosten hinzufügen</button></div>`;
    return;
  }
  const ov = monthAmounts(ui.ym),
    mName = MONTHS[Number(ui.ym.slice(5, 7)) - 1];
  const row = (f) => {
    const isPaid = f.id in paid,
      amt = isPaid ? Number(paid[f.id]) || 0 : planAmt(f, ui.ym);
    const subs = [
      debtFor(f.id) ? `Rate ${escHtml(debtFor(f.id).name)}` : "",
      rhythmText(f) ? escHtml(rhythmText(f)) : "",
      (f.id in ov && !isPaid) || (isPaid && Math.abs(amt - listAmt(f, ui.ym)) > 0.004)
        ? `nur im ${escHtml(mName)} · sonst ${escHtml(fmtEur(listAmt(f, ui.ym)))}${!isPaid ? ` · <span class="link small" role="button" tabindex="0" data-fxreset="${escHtml(f.id)}">zurücksetzen</span>` : ""}`
        : "",
    ].filter(Boolean);
    const editing = ui.amtEdit === f.id;
    return (
      `<div class="fx" aria-checked="${isPaid}"><button class="fxhit" data-pay="${escHtml(f.id)}" tabindex="-1">${brandFor(f.name) ? brandBadge(brandFor(f.name)) : tile(f.kind === "betrieb" ? "betrieb" : "fix", f.name, f.kind === "betrieb" ? "var(--c3)" : "var(--c1)")}<span class="grow"><div class="t">${escHtml(f.name)}</div>${subs.length ? `<div class="s">${subs.join(" · ")}</div>` : ""}</span></button>` +
      (editing
        ? `<input class="in fxamt-in" id="fxAmtIn" data-fxamtin="${escHtml(f.id)}" inputmode="decimal" value="${escHtml(numStr(amt))}" aria-label="Betrag für ${escHtml(f.name)} im ${escHtml(mName)}">`
        : `<button class="amt fxamt" data-fxamt="${escHtml(f.id)}" title="Betrag nur für ${escHtml(mName)} ändern" aria-label="${escHtml(f.name)}: ${escHtml(fmtEur(amt))}, Betrag für ${escHtml(mName)} ändern">${escHtml(fmtEur(amt))}</button>`) +
      `<button class="check" role="checkbox" aria-checked="${isPaid}" data-pay="${escHtml(f.id)}" aria-label="${escHtml(f.name)} ${isPaid ? "bezahlt" : "als bezahlt abhaken"}"></button></div>`
    );
  };
  const all = fixedSorted().filter((f) => dueIn(f, ui.ym) || f.id in paid);
  const total = sum(all, (f) => (f.id in paid ? Number(paid[f.id]) || 0 : planAmt(f, ui.ym))),
    nPaid = all.filter((f) => f.id in paid).length;
  const AREA_IC = {
    Wohnen: "home",
    Schulden: "bank",
    Auto: "car",
    Versicherung: "shield",
    "Sparen & Vorsorge": "piggy",
    "Abos & Handy": "phone",
    Betrieb: "case",
    Sonstiges: "dots",
  };
  const groups = {};
  for (const f of all) (groups[fixArea(f)] = groups[fixArea(f)] || []).push(f);
  const gsum = (fs) => sum(fs, (f) => (f.id in paid ? Number(paid[f.id]) || 0 : planAmt(f, ui.ym)));
  const order = Object.entries(groups).sort(
    (a, b) => (a[0] === "Sonstiges") - (b[0] === "Sonstiges") || gsum(b[1]) - gsum(a[1])
  );
  ui.fxOpen = ui.fxOpen || {};
  const tileHtml = (f) => {
    const isPaid = f.id in paid,
      amt = isPaid ? Number(paid[f.id]) || 0 : planAmt(f, ui.ym),
      d = debtFor(f.id);
    const only = (f.id in ov && !isPaid) || (isPaid && Math.abs(amt - listAmt(f, ui.ym)) > 0.004);
    const editing = ui.amtEdit === f.id;
    return `<div class="ftile ${isPaid ? "on" : ""}" role="checkbox" tabindex="0" aria-checked="${isPaid}" data-pay="${escHtml(f.id)}" aria-label="${escHtml(f.name)} ${escHtml(fmtEur(amt))} ${isPaid ? "bezahlt" : "abhaken"}">
      <span class="fc">${isPaid ? `<svg class="i" viewBox="0 0 24 24" style="width:13px;height:13px;stroke-width:3"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>` : ""}</span>
      ${brandFor(f.name) ? brandBadge(brandFor(f.name)) : tile(f.kind === "betrieb" ? "betrieb" : "fix", f.name)}
      <b lang="de">${escHtml(f.name)}</b>${fxAcctOn() ? `<span class="fxachip" style="--c:${fxCol(fxAcct(f))}">${escHtml(fxAcct(f))}</span>` : ""}
      ${editing ? `<input class="in fxamt-in" id="fxAmtIn" data-fxamtin="${escHtml(f.id)}" inputmode="decimal" value="${escHtml(numStr(amt))}" aria-label="Betrag für ${escHtml(f.name)} im ${escHtml(mName)}">` : `<button class="famt" data-fxamt="${escHtml(f.id)}" aria-label="Betrag für ${escHtml(mName)} ändern">${escHtml(fmtEur(amt))}</button>`}
      ${only ? `<span class="fbdg">nur ${escHtml(MSHORT[ymParts(ui.ym)[1] - 1])}.${!isPaid ? ` · <span role="button" tabindex="0" data-fxreset="${escHtml(f.id)}">zurück</span>` : ""}</span>` : d ? `<span class="fsub">noch ${escHtml(shortK(debtState(d).remaining))} €</span>` : rhythmText(f) ? `<span class="fsub">${escHtml(rhythmText(f))}</span>` : ""}
    </div>`;
  };
  $("v-fix").innerHTML = `
    <div class="card fsum"><div class="meta-row"><span class="small muted">Im ${escHtml(mName)} fest verplant</span><b class="big">${escHtml(fmtEur0(total))}</b></div>
      <div class="pbar"><i style="width:${total ? Math.round((c.fixPaid / total) * 100) : 0}%"></i></div>
      <div class="meta-row small muted"><span>${escHtml(fmtEur(c.fixPaid))} bezahlt</span><span>${nPaid} von ${all.length} abgehakt</span></div>
      <div class="small muted" style="margin-top:8px">Kachel antippen = abhaken. Betrag antippen = nur für ${escHtml(mName)} ändern. Nur Abgehaktes zählt in deinen Zahlen.</div></div>
    ${fxAcctCard(ui.ym)}
    ${
      order
        .map(([a, fs]) => {
          const open = a in ui.fxOpen ? ui.fxOpen[a] : fs.some((f) => !(f.id in paid));
          const sp = fs.filter((f) => f.id in paid).length,
            gs = sum(fs, (f) => (f.id in paid ? Number(paid[f.id]) || 0 : planAmt(f, ui.ym)));
          return `<div class="card fgroup">
        <button class="fgh" data-fxgroup="${escHtml(a)}" aria-expanded="${open}"><span class="gi">${svgIcon(AREA_IC[a] || "dots", 19)}</span><span class="n"><b>${escHtml(a)}</b><span class="small muted">${escHtml(
          fs
            .map((f) => f.name)
            .slice(0, 3)
            .join(", ")
        )}${fs.length > 3 ? " …" : ""}</span></span><span class="a"><b>${escHtml(fmtEur0(gs))}</b><span class="small muted">${sp} von ${fs.length}</span></span>${svgIcon(open ? "up" : "down", 18)}</button>
        <div class="pbar sm"><i style="width:${fs.length ? Math.round((sp / fs.length) * 100) : 0}%"></i></div>
        ${open ? `<div class="fgrid">${fs.map(tileHtml).join("")}</div>` : ""}
      </div>`;
        })
        .join("") ||
      `<div class="card">${emptyState("list", "Noch keine Fixkosten", "Trag Miete, Versicherungen und Abos einmal ein.")}</div>`
    }
    <div class="row-btns">${nPaid < all.length ? `<button class="btn" id="payAll">Alle abhaken</button>` : ""}<button class="btn" id="fixEditBtn">Liste bearbeiten</button></div>`;
}
function debtFor(fid) {
  return store.debts.find((d) => d.fixedId === fid);
}

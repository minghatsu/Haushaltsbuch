/* Einkauf */
if (IS_PC) {
  const root = $("v-shop"),
    E = "cubic-bezier(.2,.8,.2,1)",
    BO = "cubic-bezier(.3,1.5,.5,1)";
  const CATN = {
    super: "Supermarkt",
    disc: "Discounter",
    drog: "Drogerie & Apotheke",
    kleid: "Kleidung",
    elek: "Elektronik",
    bau: "Baumarkt",
    moebel: "Möbel",
    tier: "Tierbedarf",
    online: "Online",
  };
  const badge = (sh) =>
    brandBadge({
      t: sh.name.replace(/ .*/, "").slice(0, 1),
      bg: sh.color,
      ink: sh.ink || "#fff",
      domain: SHOP_DOMAINS[sh.id] || "",
    });
  const shopBy = (id) => SHOPS.find((x) => x.id === id);
  const list = () => store.settings.shoplist || [];
  const chosen = () => (store.settings.shops || []).map(shopBy).filter(Boolean);
  const K = {
    fresh: null,
    gone: null,
    swap: false,
    prev: "",
  };
  function bestFor(name) {
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
    const all = Object.values(by).filter((x) => shopBy(x.s));
    if (!all.length) return null;
    all.sort((a, b) => mine.has(b.s) - mine.has(a.s) || a.p - b.p);
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
  const where = (it) => {
    if (it.s)
      return {
        s: it.s,
        p: it.p != null ? it.p : null,
        manual: true,
      };
    return bestFor(it.n);
  };
  function saveList(l) {
    zSave(l);
  }
  function renderShopPC() {
    const ch = chosen();
    if (!ch.length) {
      root.classList.remove("pcshop");
      root.innerHTML = `<div class="pcsnone">${zettelCard()}${typeof shopAvgCard === "function" ? shopAvgCard() : ""}${offersCard()}</div>`;
      return;
    }
    const cats = [...new Set(ch.map((x) => x.cat))];
    if (ui.shopCat && !cats.includes(ui.shopCat)) ui.shopCat = "";
    const shown = ui.shopCat ? ch.filter((x) => x.cat === ui.shopCat) : ch;
    if (!ch.some((x) => x.id === ui.shopSel)) ui.shopSel = ch[0].id;
    const stats = Object.fromEntries(shopStats().map((o) => [o.shop.id, o])),
      mx = Math.max(1, ...ch.map((x) => (stats[x.id] || {}).sum || 0));
    const L = list(),
      W = L.map((it) => ({
        it,
        w: where(it),
      }));
    const left = `<div class="card pcsl"><div class="pcslh"><b>Deine Läden</b><span class="small muted">Ø im Monat</span></div>
      ${cats.length > 1 ? `<div class="pcscats">${[["", "Alle"], ...cats.map((c) => [c, CATN[c] || c])].map(([c, l]) => `<button class="${(ui.shopCat || "") === c ? "on" : ""}" data-pcscat="${c}">${escHtml(l)}</button>`).join("")}</div>` : ""}
      <div class="pcsls">${shown
        .map((sh) => {
          const st = stats[sh.id] || {
              sum: 0,
              count: 0,
            },
            nd = shopDeals(sh.id).length,
            nz = W.filter((x) => !x.it.done && x.w && x.w.s === sh.id).length;
          return `<button class="pcsli ${sh.id === ui.shopSel ? "on" : ""}" data-pcshop="${sh.id}" style="--c:${sh.color}">${badge(sh)}<span class="pcstx"><b>${escHtml(sh.name)}</b><small>${escHtml(CATN[sh.cat] || "")}</small><i class="bar"><i style="width:${Math.round((st.sum / mx) * 100)}%"></i></i></span><span class="r"><b>${escHtml(fmtEur0(st.sum / 6))}</b>${nd || nz ? `<small>${nd ? `${svgIcon("tag", 12)}${nd}` : ""}${nz ? `${svgIcon("list", 12)}${nz}` : ""}</small>` : ""}</span></button>`;
        })
        .join("")}</div>
      <button class="pcsadd" data-go="more" data-scroll="shopEd">+ Läden auswählen</button></div>`;
    const sh = shopBy(ui.shopSel),
      st = stats[sh.id] || {
        sum: 0,
        count: 0,
        last: "",
      };
    const deals = shopDeals(sh.id),
      prices = shopPrices(sh.id),
      name = (n) => n.charAt(0).toUpperCase() + n.slice(1);
    const recent = store.tx
      .filter((t) => t.kind === "ausgabe" && sh.re.test(normText(t.note)))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
    const rmax = Math.max(1, ...recent.map((t) => t.amount)),
      mine = W.filter((x) => x.w && x.w.s === sh.id);
    const canWeb = !!((window.AndroidBridge && window.AndroidBridge.pageOpen) || window.pcPageDemo),
      web = canWeb || !!(K.pg && K.PG.open && K.PG.embed);
    const det = web
      ? `<div class="card pcsweb" id="pcsWeb" style="--c:${sh.color}"></div>`
      : `<div class="card pcsd" style="--c:${sh.color};--k:${sh.ink || "#fff"}">
      <div class="pcsdh"><div class="lg">${badge(sh)}</div><div class="grow"><h2>${escHtml(sh.name)}</h2><span class="small muted">${escHtml(CATN[sh.cat] || "")} · ${escHtml(
        st.count
          ? uiText(st.count === 1 ? "sh_stat1" : "sh_stat", {
              a: fmtEur0(st.sum / 6),
              n: String(st.count),
            }) +
              (st.last
                ? " · " +
                  uiText("sh_last", {
                    d: fxDate(st.last, {
                      day: "numeric",
                      month: "short",
                    }),
                  })
                : "")
          : uiText("sh_none")
      )}</span></div>
        <button class="btn primary" data-openshop="${escHtml(sh.url)}">${shopBtnLbl(sh)}</button></div>
      <div class="pcsdc"><div>
        <div class="ssh">Gemerkte Angebote</div>
        ${deals.map((d) => `<div class="pccp"><div class="grow"><b>${escHtml(d.text)}</b><small class="muted">${d.until ? `bis ${escHtml(shortDate(d.until))}` : "ohne Datum"}</small></div>${d.price ? `<b class="pp">${escHtml(fmtEur(d.price))}</b>` : ""}<button class="x" data-dealdel="${escHtml(d.id)}" aria-label="Angebot löschen">×</button></div>`).join("")}
        ${ui.dealAdd === sh.id ? `<div class="pccp form"><input class="in" id="dealText" placeholder="Was? z. B. Kaffee 500 g" aria-label="Was"><div class="pr2"><input class="in" id="dealPrice" inputmode="decimal" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="dealUntil" value="${escHtml(nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn" data-dealcancel>Abbrechen</button><button class="btn primary" data-dealsave="${escHtml(sh.id)}">Merken</button></div></div>` : `<button class="pccp add" data-dealadd="${escHtml(sh.id)}">+ Angebot merken</button>`}
        ${
          mine.length
            ? `<div class="ssh" style="margin-top:20px">Auf deinem Zettel</div>${mine
                .map(
                  ({ it, w }) =>
                    `<div class="pczr ${it.done ? "done" : ""}"><span>${escHtml(it.n)}</span>${w.p != null ? `<b>${escHtml(fmtEur(w.p))}</b>` : ""}</div>`
                )
                .join("")}`
            : ""
        }
      </div><div>
        ${
          prices.length
            ? `<div class="ssh">Deine Preise hier <span class="muted">· aus Quittungen</span></div>
          ${prices
            .map(
              (x) =>
                `<div class="pcpr"><span class="grow"><b>${escHtml(name(x.w))}</b>${
                  x.best
                    ? `<small class="warn">bei ${escHtml(
                        (
                          shopBy(x.best.s) || {
                            name: x.best.s,
                          }
                        ).name
                      )} ${escHtml(fmtEur(x.best.p))}</small>`
                    : x.cheapest
                      ? `<small class="pos">hier am günstigsten</small>`
                      : ""
                }</span><b>${escHtml(fmtEur(x.e.p))}</b></div>`
            )
            .join("")}`
            : ""
        }
        <div class="ssh" ${prices.length ? 'style="margin-top:20px"' : ""}>Letzte Einkäufe</div>
        ${
          recent.length
            ? `<div class="pcbars">${recent
                .slice()
                .reverse()
                .map(
                  (t) =>
                    `<div><span class="v">${escHtml(fmtEur0(t.amount))}</span><i style="height:${Math.max(6, Math.round((t.amount / rmax) * 100))}%"></i><small>${escHtml(shortDate(t.date))}</small></div>`
                )
                .join("")}</div>`
            : `<div class="small muted">Hier hast du in letzter Zeit nichts gekauft.</div>`
        }
      </div></div></div>`;
    const open = W.filter((x) => !x.it.done),
      done = W.filter((x) => x.it.done),
      groups = {};
    for (const x of open) {
      const k = x.w ? x.w.s : "";
      (groups[k] = groups[k] || []).push(x);
    }
    const save = sum(open, (x) => (x.w && x.w.save > 0 ? x.w.save * shopQty(x.it) : 0)),
      est = sum(open, (x) => (x.w && x.w.p ? x.w.p * shopQty(x.it) : 0));
    const opts = (id) =>
      `<option value="">automatisch</option>${ch.map((o) => `<option value="${o.id}" ${o.id === id ? "selected" : ""}>${escHtml(o.name)}</option>`).join("")}`;
    const row = ({ it, w }) => {
      const so = w && shopBy(w.s);
      return `<div class="pczi ${it.done ? "done" : ""}" data-pczi="${escHtml(it.id)}"><button class="cb" data-pczck="${escHtml(it.id)}" aria-label="${escHtml(it.n)} ${it.done ? "wieder offen" : "erledigt"}"></button><label class="pczq" title="Menge ändern"><input type="number" min="1" max="99" value="${shopQty(it)}" data-pczq="${escHtml(it.id)}" aria-label="Menge ${escHtml(it.n)}"><span>x</span></label><span class="n">${escHtml(it.n)}</span>
        <button class="ws" data-zpick="${escHtml(it.id)}" title="Laden ändern" aria-label="Laden für ${escHtml(it.n)} wählen">${so ? badge(so) : `<span class="q">?</span>`}</button>
        <b class="p">${w && w.p != null ? escHtml(fmtEur(w.p * shopQty(it))) : ""}</b>${it.done && it.by && zTrip() ? zWho(it.by, 18) : ""}${it.extra ? `<span class="zdaz">DAZU</span>` : ""}<button class="del" data-pczdel="${escHtml(it.id)}" aria-label="${escHtml(it.n)} löschen">×</button></div>`;
    };
    const tab = ui.pczTab || "zettel",
      nd = deals.length;
    const pickCard = `${web && K.pick ? (K.pick.busy ? `<div class="pcwpick busy"><i class="sp"></i><span>Text wird erkannt …</span></div>` : `<div class="pcwpick"><div class="ssh">Erkannt – stimmt das?</div>${K.pick.raw ? `<div class="small muted pkraw">Gelesen: ${escHtml(K.pick.raw)}</div>` : ""}<input class="in" id="pkN" value="${escHtml(K.pick.n || "")}" placeholder="Was?" aria-label="Was"><div class="pr2"><input class="in" id="pkP" inputmode="decimal" value="${K.pick.p != null ? escHtml(Number(K.pick.p).toFixed(2).replace(".", ",")) : ""}" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="pkU" value="${escHtml(K.pick.u || nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn" data-pkx>Verwerfen</button><button class="btn" data-pkok="deal">Als Angebot</button><button class="btn primary" data-pkok="zettel">Auf den Zettel</button></div></div>`) : ""}`;
    const tabs = `<div class="pcztabs" role="tablist">${[
      ["zettel", "Zettel"],
      ["deals", `Angebote${nd ? ` (${nd})` : ""}`],
      ["buys", "Einkäufe"],
    ]
      .map(
        ([k, l]) =>
          `<button role="tab" data-pcztab="${k}" class="${tab === k ? "on" : ""}" aria-selected="${tab === k}">${l}</button>`
      )
      .join("")}</div>`;
    const T = zTrip(),
      tripBox = T
        ? (() => {
            const devs = T.devs || [],
              all = list();
            const part = (d) => {
              const mine = all.filter((it) => {
                  const s0 = (where(it) || {}).s || "";
                  return (T.assign || {})[s0] === d.id || !(T.assign || {})[s0] || it.by === d.id;
                }),
                dn = mine.filter((it) => it.done && (it.by === d.id || devs.length <= 1)).length;
              return `<div class="pcztd">${zWho(d.id, 20)}<b>${escHtml(zDevName(d.id))}</b><i class="pcztp"><i style="width:${mine.length ? Math.round((dn / mine.length) * 100) : 0}%;background:${zDevCol(d.id)}"></i></i><small>${(T.fin || {})[d.id] ? "fertig ✓" : `${dn}/${mine.length}`}</small></div>`;
            };
            return `<div class="pcztrip"><div class="pczth"><b>🛒 Einkauf läuft …</b><button class="btn" data-pcztripx>Abbrechen</button></div>${devs.map(part).join("")}<div class="small muted">Was du jetzt dazuschreibst, erscheint auf dem Handy oben mit „NEU“.</div></div>`;
          })()
        : "";
    const zBody = `${tripBox}<div class="pczact">${T ? "" : `<button class="btn primary" data-pczsend title="Der Zettel geht auf deine gekoppelten Handys – dort wird eingekauft">${svgIcon("phone", 16)} Einkauf starten</button>`}<button class="btn" data-pczpdf title="Als PDF speichern">📄 PDF</button><button class="btn" data-pczprint title="Drucken">🖨 Drucken</button></div>
      <div class="pczadd"><input class="in" id="pczIn" placeholder="Was brauchst du?" autocomplete="off" aria-label="Was brauchst du?"><button class="btn primary" data-pczadd aria-label="Hinzufügen">+</button></div>
      <div class="pczl">${open.map(row).join("") || `<div class="small muted pcze">Schreib auf, was du brauchst – die App sagt dir, wo es am günstigsten ist.</div>`}${done.length ? `<div class="pczdone">${done.map(row).join("")}</div>` : ""}</div>
      ${
        Object.keys(groups).length
          ? `<div class="pcroute"><div class="ssh">So kaufst du am günstigsten${save > 0.004 ? ` <span class="pos">· spart ca. ${escHtml(fmtEur(save))}</span>` : ""}</div>
        ${Object.entries(groups)
          .sort((a, b) => (a[0] === "") - (b[0] === "") || b[1].length - a[1].length)
          .map(([k, xs]) => {
            const so = shopBy(k);
            return `<button class="pcstop" ${so ? `data-pcshop="${k}"` : ""} style="--c:${so ? so.color : "#9aa"}">${so ? badge(so) : `<span class="q">?</span>`}<span class="grow"><b>${so ? escHtml(so.name) : "Laden offen"}</b><small class="muted">${xs.map((x) => (shopQty(x.it) > 1 ? shopQty(x.it) + "x " : "") + escHtml(x.it.n)).join(", ")}</small></span>${sum(xs, (x) => ((x.w && x.w.p) || 0) * shopQty(x.it)) ? `<b>${escHtml(fmtEur(sum(xs, (x) => ((x.w && x.w.p) || 0) * shopQty(x.it))))}</b>` : ""}</button>`;
          })
          .join("")}</div>`
          : ""
      }
      ${done.length ? `<button class="pczclr" data-pczclr>Erledigte löschen (${done.length})</button>` : ""}
`;
    const dBody = `<div class="pcwdeal"><div class="ssh">Angebot merken <span class="muted">· ${escHtml(sh.name)}</span></div><div class="pccp form"><input class="in" id="pcpDT" placeholder="Was? z. B. ${sh.cat === "kleid" ? "Pullover" : sh.cat === "elek" ? "Kopfhörer" : sh.cat === "moebel" ? "Regal" : "Kaffee 500 g"}" aria-label="Was"><div class="pr2"><input class="in" id="pcpDP" inputmode="decimal" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="pcpDU" value="${escHtml(nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn primary" data-pcpdeal>Merken</button></div></div></div>
      <div class="ssh" style="margin-top:16px">Gemerkt bei ${escHtml(sh.name)}</div>
      ${deals.map((d) => `<div class="pccp"><div class="grow"><b>${escHtml(d.text)}</b><small class="muted">${d.until ? `bis ${escHtml(shortDate(d.until))}` : "ohne Datum"}</small></div>${d.price ? `<b class="pp">${escHtml(fmtEur(d.price))}</b>` : ""}<button class="x" data-dealdel="${escHtml(d.id)}" aria-label="Angebot löschen">×</button></div>`).join("") || `<div class="small muted">${escHtml(uiText(shopKind(sh) === "leaf" ? "sh_none_leaf" : "sh_none_page"))}</div>`}
      ${
        mine.length
          ? `<div class="ssh" style="margin-top:16px">Auf deinem Zettel</div>${mine
              .map(
                ({ it, w }) =>
                  `<div class="pczr ${it.done ? "done" : ""}"><span>${escHtml(it.n)}</span>${w.p != null ? `<b>${escHtml(fmtEur(w.p))}</b>` : ""}</div>`
              )
              .join("")}`
          : ""
      }
      ${
        prices.length
          ? `<div class="ssh" style="margin-top:16px">Deine Preise hier <span class="muted">· aus Quittungen</span></div>
        ${prices
          .map(
            (x) =>
              `<div class="pcpr"><span class="grow"><b>${escHtml(name(x.w))}</b>${
                x.best
                  ? `<small class="warn">bei ${escHtml(
                      (
                        shopBy(x.best.s) || {
                          name: x.best.s,
                        }
                      ).name
                    )} ${escHtml(fmtEur(x.best.p))}</small>`
                  : x.cheapest
                    ? `<small class="pos">hier am günstigsten</small>`
                    : ""
              }</span><b>${escHtml(fmtEur(x.e.p))}</b></div>`
          )
          .join("")}`
          : ""
      }`;
    const bBody = `<div class="pczst">${badge(sh)}<span><b>${escHtml(sh.name)}</b><small class="muted">${escHtml(
      st.count
        ? uiText(st.count === 1 ? "sh_stat1" : "sh_stat", {
            a: fmtEur0(st.sum / 6),
            n: String(st.count),
          }) +
            (st.last
              ? " · " +
                uiText("sh_last", {
                  d: fxDate(st.last, {
                    day: "numeric",
                    month: "short",
                  }),
                })
              : "")
        : uiText("sh_none")
    )}</small></span></div>
      ${
        recent.length
          ? `<div class="pcbars">${recent
              .slice()
              .reverse()
              .map(
                (t) =>
                  `<div><span class="v">${escHtml(fmtEur0(t.amount))}</span><i style="height:${Math.max(6, Math.round((t.amount / rmax) * 100))}%"></i><small>${escHtml(shortDate(t.date))}</small></div>`
              )
              .join("")}</div>
        <div class="pczrl">${recent.map((t) => `<div class="pcpr"><span class="grow"><b>${escHtml(shortDate(t.date))}</b><small class="muted">${escHtml(t.cat || "")}${hasReceipt(t.id) ? " · 📎 Bon" : ""}</small></span><b>${escHtml(fmtEur(t.amount))}</b></div>`).join("")}</div>`
          : `<div class="small muted">Hier hast du in letzter Zeit nichts gekauft.</div>`
      }`;
    const zet = `<div class="card pcz">${pickCard}${tabs}<div class="pczh"><b>${tab === "zettel" ? "Einkaufszettel" : tab === "deals" ? "Angebote" : "Einkäufe"}</b><span class="small muted">${tab === "zettel" ? `${open.length} offen${est ? ` · ca. ${escHtml(fmtEur(est))}` : ""}` : escHtml(sh.name)}</span></div>${tab === "zettel" ? zBody : tab === "deals" ? dBody : bBody}</div>`;
    root.classList.add("pcshop");
    const keep = document.activeElement && document.activeElement.id === "pczIn",
      val = keep ? document.activeElement.value : "";
    const kept = {};
    ["pcpDT", "pcpDP", "pcpDU"].forEach((k) => {
      const el = $(k);
      if (el) kept[k] = el.value;
    });
    const fid = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : "";
    if (K.pg && root.contains(K.pg)) document.body.append(K.pg);
    root.innerHTML =
      `<div class="pcscol">${typeof shopAvgCard === "function" ? shopAvgCard() : ""}${left}</div>` + det + zet;
    for (const k in kept) {
      const el = $(k);
      if (el && kept[k]) el.value = kept[k];
    }
    if (fid && /^pcpD/.test(fid) && $(fid)) $(fid).focus();
    if (web) {
      $("pcsWeb").appendChild(K.pg);
      requestAnimationFrame(() => K.place());
    }
    if (
      canWeb &&
      ui.view === "shop" &&
      !root.hidden &&
      document.visibilityState !== "hidden" &&
      !(K.PG.open && K.PG.embed && K.PG.shop && K.PG.shop.id === sh.id)
    )
      requestAnimationFrame(() => {
        if (ui.view === "shop" && !(K.PG.open && K.PG.shop && K.PG.shop.id === sh.id)) K.open(sh.url, sh);
      });
    if (keep) {
      const i = $("pczIn");
      i.value = val;
      i.focus();
    }
    const calm = pcCalm();
    requestAnimationFrame(() => {
      if (calm) {
        K.fresh = null;
        K.swap = false;
        return;
      }
      if (K.swap) {
        const d = root.querySelector(".pcsd");
        d.animate(
          [
            {
              opacity: 0,
              transform: "translateY(10px) scale(.985)",
              filter: "blur(4px)",
            },
            {
              opacity: 1,
              transform: "none",
              filter: "blur(0)",
            },
          ],
          {
            duration: 380,
            easing: E,
          }
        );
        const h = d.querySelector(".pcsdh .lg");
        if (h)
          h.animate(
            [
              {
                transform: "scale(.4) rotate(-20deg)",
              },
              {
                transform: "scale(1.1) rotate(4deg)",
                offset: 0.7,
              },
              {
                transform: "none",
              },
            ],
            {
              duration: 560,
              easing: E,
            }
          );
        d.querySelectorAll(".pccp,.pcpr,.pczr").forEach((el, i) =>
          el.animate(
            [
              {
                opacity: 0,
                transform: "translateX(-10px)",
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 320,
              delay: 80 + i * 40,
              easing: E,
              fill: "backwards",
            }
          )
        );
        d.querySelectorAll(".pcbars i").forEach((el, i) =>
          el.animate(
            [
              {
                transform: "scaleY(0)",
              },
              {
                transform: "none",
              },
            ],
            {
              duration: 600,
              delay: 150 + i * 60,
              easing: BO,
              fill: "backwards",
            }
          )
        );
      }
      if (K.fresh) {
        const el = root.querySelector(`[data-pczi="${CSS.escape(K.fresh)}"]`);
        if (el)
          el.animate(
            [
              {
                opacity: 0,
                transform: "translateY(-16px) rotate(-2deg)",
              },
              {
                opacity: 1,
                transform: "translateY(2px)",
                offset: 0.7,
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 420,
              easing: E,
            }
          );
      }
      K.fresh = null;
      K.swap = false;
    });
  }
  renderShop = renderShopPC;
  rerenderShopPanel = renderShopPC;
  function enter() {
    if (pcCalm() || !root.classList.contains("pcshop")) return;
    root.querySelectorAll(".pcsli,.pcsadd,.pcscats").forEach((el, i) =>
      el.animate(
        [
          {
            opacity: 0,
            transform: "translateX(-40px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 460,
          delay: i * 45,
          easing: E,
          fill: "backwards",
        }
      )
    );
    const d = root.querySelector(".pcsd");
    if (d) {
      d.animate(
        [
          {
            opacity: 0,
            transform: "translateY(30px) scale(.97)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 560,
          delay: 120,
          easing: E,
          fill: "backwards",
        }
      );
      d.querySelectorAll(".pcbars i").forEach((el, i) =>
        el.animate(
          [
            {
              transform: "scaleY(0)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 700,
            delay: 450 + i * 70,
            easing: BO,
            fill: "backwards",
          }
        )
      );
    }
    const z = root.querySelector(".pcz");
    if (z) {
      z.animate(
        [
          {
            opacity: 0,
            transform: "translateX(60px) rotate(2deg)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 560,
          delay: 200,
          easing: E,
          fill: "backwards",
        }
      );
      z.querySelectorAll(".pczi").forEach((el, i) =>
        el.animate(
          [
            {
              opacity: 0,
              clipPath: "inset(0 100% 0 0)",
            },
            {
              opacity: 1,
              clipPath: "inset(0 0 0 0)",
            },
          ],
          {
            duration: 420,
            delay: 450 + i * 60,
            easing: "ease-out",
            fill: "backwards",
          }
        )
      );
    }
  }
  new MutationObserver(() => {
    if (!root.hidden) {
      requestAnimationFrame(enter);
      if (K.PG && !K.PG.open) renderShopPC();
    }
  }).observe(root, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ui.view === "shop" && K.PG && !K.PG.open) renderShopPC();
  });
  async function addItem() {
    const i = $("pczIn");
    const n = ((i && i.value) || "").trim();
    if (!n) return;
    const r = zAddTo(list(), {
      id: newId(),
      n: n.slice(0, 60),
      done: false,
    });
    K.fresh = r.more ? null : r.id;
    i.value = "";
    saveList(r.list);
    if (r.more) toast(`${n}: jetzt ${shopQty(r.list.find((x) => x.id === r.id))}x`);
  }
  root.addEventListener("click", (e) => {
    const c = e.target.closest("[data-pcscat]");
    if (c) {
      ui.shopCat = c.dataset.pcscat;
      renderShopPC();
      return;
    }
    const tb = e.target.closest("[data-pcztab]");
    if (tb) {
      ui.pczTab = tb.dataset.pcztab;
      renderShopPC();
      return;
    }
    if (e.target.closest("[data-pczsend]")) {
      zStartFromPC();
      return;
    }
    if (e.target.closest("[data-pcztripx]")) {
      zEnd();
      toast("Einkauf abgebrochen – der Zettel bleibt");
      return;
    }
    if (e.target.closest("[data-pczpdf]")) {
      zPrint("pdf");
      return;
    }
    if (e.target.closest("[data-pczprint]")) {
      zPrint("print");
      return;
    }
    const s = e.target.closest("[data-pcshop]");
    if (s) {
      if (K.pg && K.PG.open && K.PG.embed) {
        const o = shopBy(s.dataset.pcshop);
        if (o && o.id !== ui.shopSel) K.open(o.url, o);
        return;
      }
      if (ui.shopSel !== s.dataset.pcshop) {
        ui.shopSel = s.dataset.pcshop;
        ui.dealAdd = null;
        K.swap = true;
        renderShopPC();
      }
      return;
    }
    if (e.target.closest("[data-pczadd]")) {
      addItem();
      return;
    }
    const ck = e.target.closest("[data-pczck]");
    if (ck) {
      const id = ck.dataset.pczck,
        row = ck.closest(".pczi");
      const go = () =>
        saveList(
          list().map((x) =>
            x.id === id
              ? x.done
                ? {
                    ...x,
                    done: false,
                    by: undefined,
                  }
                : {
                    ...x,
                    done: true,
                    by: devId(),
                  }
              : x
          )
        );
      if (row && !pcCalm() && !row.classList.contains("done")) {
        row.classList.add("striking");
        setTimeout(go, 420);
      } else go();
      return;
    }
    const dl = e.target.closest("[data-pczdel]");
    if (dl) {
      const id = dl.dataset.pczdel,
        row = dl.closest(".pczi"),
        old = list();
      const go = () => {
        saveList(old.filter((x) => x.id !== id));
        toast("Gelöscht", () => saveList(old), "Rückgängig");
      };
      if (row && !pcCalm())
        row.animate(
          [
            {
              opacity: 1,
              transform: "none",
            },
            {
              opacity: 0,
              transform: "translateX(60px)",
            },
          ],
          {
            duration: 240,
            easing: "ease-in",
          }
        ).onfinish = go;
      else go();
      return;
    }
    if (e.target.closest("[data-pczclr]")) {
      const old = list(),
        n = old.filter((x) => x.done).length;
      saveList(old.filter((x) => !x.done));
      toast(`${n} erledigte gelöscht`, () => saveList(old), "Rückgängig");
      return;
    }
  });
  function webDeal() {
    const t = $("pcpDT"),
      wsh = (K.PG && K.PG.shop) || shopBy(ui.shopSel);
    if (!t || !wsh) return;
    const text = (t.value || "").trim(),
      pr = parseAmt($("pcpDP").value || ""),
      until = $("pcpDU").value || "";
    if (!text) {
      t.focus();
      return;
    }
    const keep = (store.settings.deals || []).filter(
      (x) => !x.until || x.until >= isoOf(new Date(Date.now() - 14 * 864e5))
    );
    store.settings.deals = [
      ...keep,
      {
        id: newId(),
        shop: wsh.id,
        text: text.slice(0, 60),
        price: pr > 0 ? round2(pr) : null,
        until,
      },
    ];
    t.value = "";
    $("pcpDP").value = "";
    saveSettings();
    toast("Angebot gemerkt");
  }
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-pcpdeal]")) webDeal();
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && /^pcpD/.test(e.target.id || "")) {
      e.preventDefault();
      webDeal();
    }
  });
  root.addEventListener("change", (e) => {
    const s = e.target.closest("[data-pczshop]");
    if (!s) return;
    const id = s.dataset.pczshop,
      v = s.value;
    saveList(
      list().map((x) =>
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
  });
  root.addEventListener("keydown", (e) => {
    if (e.target.id === "pczIn" && e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  });
  root.addEventListener("change", (e) => {
    const q = e.target.closest("[data-pczq]");
    if (q) zSetQ(q.dataset.pczq, q.value);
  });
  root.addEventListener("focusin", (e) => {
    if (e.target.matches("[data-pczq]")) e.target.select();
  });
  /* Webseite im Fenster */
  const NB = () => (window.AndroidBridge && window.AndroidBridge.pageOpen ? window.AndroidBridge : null);
  const PG = {
    open: false,
    url: "",
    shop: null,
    st: {},
    ro: null,
    embed: false,
  };
  let lastView = ui.view;
  const pg = document.createElement("div");
  pg.id = "pcPage";
  pg.className = "pcpage";
  pg.hidden = true;
  pg.innerHTML = `<div class="pcpbar"><button data-pcpnav="back" title="Zurück" aria-label="Zurück">‹</button><button data-pcpnav="fwd" title="Vor" aria-label="Vor">›</button><button data-pcpnav="reload" class="rl" title="Neu laden" aria-label="Neu laden">⟳</button><button data-pcpnav="pick" class="wide pick" title="Angebot anklicken – es kommt auf den Einkaufszettel">🛒 Angebote picken</button>
    <div class="url" title="Gesperrt: hier geht nur diese eine Webseite"><span class="lk">🔒</span><span class="u"></span><small class="t"></small><em class="only"></em></div><button data-pcpnav="close" class="x" title="Schließen (Esc)" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="pcphole" id="pcpHole"><div class="pcpload"><i></i><span>Seite wird geladen …</span></div></div>`;
  const side = document.createElement("aside");
  side.id = "pcpSide";
  side.className = "pcpside";
  side.hidden = true;
  document.body.append(pg, side);
  const host = (u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch (_) {
      return "";
    }
  };
  const shopOf = (u) => {
    const h = host(u);
    if (!h) return null;
    return (
      SHOPS.find((sh) => sh.url === u) ||
      SHOPS.find((sh) => {
        const d = SHOP_DOMAINS[sh.id] || host(sh.url);
        return d && (h === d || h.endsWith("." + d));
      }) ||
      null
    );
  };
  const holeRect = () => {
    const r = $("pcpHole").getBoundingClientRect();
    return {
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
    };
  };
  function bar() {
    const st = PG.st || {},
      u = st.url || PG.url;
    if (st.loading && pg.classList.contains("failed")) {
      pg.classList.remove("failed");
      const l = pg.querySelector(".pcpload");
      if (l) l.innerHTML = `<i></i><span>Seite wird geladen …</span>`;
    }
    pg.querySelector(".u").textContent =
      host(u) +
      (() => {
        try {
          const x = new URL(u);
          return (x.pathname + x.search).replace(/\/$/, "");
        } catch (_) {
          return "";
        }
      })();
    pg.querySelector(".t").textContent = st.title || "";
    pg.querySelector(".only").textContent = (() => {
      const h = host(PG.url).split(".");
      return h.length > 1 ? "nur " + h.slice(-2).join(".") : "";
    })();
    pg.querySelector('[data-pcpnav="back"]').disabled = !st.back;
    pg.querySelector('[data-pcpnav="fwd"]').disabled = !st.fwd;
    pg.querySelector(".rl").classList.toggle("spin", !!st.loading);
    pg.classList.toggle("ready", st.loading === false);
  }
  window.hbPageState = (st) => {
    PG.st = st || {};
    bar();
  };
  window.hbPageError = (msg) => {
    const l = pg.querySelector(".pcpload");
    if (!l) return;
    pg.classList.remove("ready");
    pg.classList.add("failed");
    l.innerHTML = `<b>Die Seite lädt gerade nicht</b><span class="small muted">${escHtml(msg || "")}</span><button class="btn" data-pcpnav="reload">Noch einmal versuchen</button>`;
  };
  function sideHtml() {
    const sh = PG.shop;
    if (!sh) return "";
    const deals = shopDeals(sh.id),
      mine = list()
        .map((it) => ({
          it,
          w: where(it),
        }))
        .filter((x) => x.w && x.w.s === sh.id);
    return `<div class="sh" style="--c:${sh.color}">${badge(sh)}<div><b>${escHtml(sh.name)}</b><small class="muted">${escHtml(shopOpenTxt(sh))}</small></div></div>
      <div class="ssh">${escHtml(uiText(shopKind(sh) === "leaf" ? "sh_save_leaf" : "sh_save_page"))}</div>
      <div class="pccp form"><input class="in" id="pcpDT" placeholder="Was? z. B. ${sh.cat === "kleid" ? "Pullover" : sh.cat === "elek" ? "Kopfhörer" : sh.cat === "moebel" ? "Regal" : "Kaffee 500 g"}" aria-label="Was"><div class="pr2"><input class="in" id="pcpDP" inputmode="decimal" placeholder="Preis €" aria-label="Preis"><input class="in" type="date" id="pcpDU" value="${escHtml(nextSat())}" aria-label="Bis wann"></div><div class="pa"><button class="btn primary" data-pcpdeal>Merken</button></div></div>
      <div class="ssh">Einkaufszettel <span class="muted">· für ${escHtml(sh.name)}</span></div>
      <div class="pczl">${mine
        .map(
          ({ it, w }) =>
            `<div class="pczi ${it.done ? "done" : ""}" data-pczi="${escHtml(it.id)}"><button class="cb" data-pczck="${escHtml(it.id)}" aria-label="${escHtml(it.n)}"></button><span class="n">${escHtml(it.n)}</span><b class="p">${w.p != null ? escHtml(fmtEur(w.p)) : ""}</b><button class="del" data-pczdel="${escHtml(it.id)}" aria-label="${escHtml(it.n)} löschen">×</button></div>`
        )
        .join("")}</div>
      <div class="pczadd"><input class="in" id="pcpZ" placeholder="Was brauchst du bei ${escHtml(sh.name)}?" autocomplete="off" aria-label="Was brauchst du?"><button class="btn primary" data-pcpzadd aria-label="Hinzufügen">+</button></div>
      <div class="ssh">Schon gemerkt bei ${escHtml(sh.name)}</div>
      ${deals.length ? deals.map((d) => `<div class="pccp"><div class="grow"><b>${escHtml(d.text)}</b><small class="muted">${d.until ? `bis ${escHtml(shortDate(d.until))}` : "ohne Datum"}</small></div>${d.price ? `<b class="pp">${escHtml(fmtEur(d.price))}</b>` : ""}<button class="x" data-dealdel="${escHtml(d.id)}" aria-label="Angebot löschen">×</button></div>`).join("") : `<div class="small muted">Noch nichts gemerkt.</div>`}`;
  }
  function sideRender() {
    if (!PG.open || !PG.shop) return;
    const a = document.activeElement,
      id = a && side.contains(a) ? a.id : "",
      v = id ? a.value : "",
      keep = {};
    ["pcpDT", "pcpDP", "pcpDU", "pcpZ"].forEach((k) => {
      const el = $(k);
      if (el) keep[k] = el.value;
    });
    side.innerHTML = sideHtml();
    for (const k in keep) {
      const el = $(k);
      if (el) el.value = keep[k];
    }
    if (id) {
      const el = $(id);
      if (el) {
        el.focus();
        el.value = v;
      }
    }
  }
  const E2 = "cubic-bezier(.2,.8,.2,1)";
  function place() {
    const b = NB();
    if (b && PG.open) b.pageBounds(holeRect());
  }
  function pageOpen(url, shop) {
    if (!NB() && !window.pcPageDemo) {
      window.open(url, "_blank", "noopener");
      return;
    }
    const sh = shop !== undefined ? shop : shopOf(url),
      was = PG.open,
      wasEmbed = PG.embed;
    PG.url = url;
    PG.shop = sh;
    PG.st = {
      url,
    };
    PG.open = true;
    bar();
    pg.classList.remove("ready", "withside");
    side.hidden = true;
    const go = () => {
      const b = NB();
      if (b) b.pageOpen(url, holeRect());
      else if (window.pcPageDemo) window.pcPageDemo(url, holeRect());
    };
    if (sh) {
      PG.embed = true;
      pg.classList.add("embed");
      pg.hidden = false;
      if (PG.pick && !wasEmbed) pickToggle(false);
      document.documentElement.classList.remove("pcpageon");
      ui.shopSel = sh.id;
      ui.dealAdd = null;
      if (!(store.settings.shops || []).includes(sh.id)) ui.shopCat = "";
      if (ui.view !== "shop") {
        ui.view = "shop";
        lastView = "shop";
        render();
        window.scrollTo({
          top: 0,
        });
      } else renderShopPC();
      if (wasEmbed || pcCalm()) {
        requestAnimationFrame(go);
        if (wasEmbed && !pcCalm())
          pg.querySelector(".pcphole").animate(
            [
              {
                opacity: 0.3,
              },
              {
                opacity: 1,
              },
            ],
            {
              duration: 300,
            }
          );
        return;
      }
      const w = $("pcsWeb");
      if (w)
        w.animate(
          [
            {
              opacity: 0,
              transform: "translateY(14px) scale(.98)",
              filter: "blur(3px)",
            },
            {
              opacity: 1,
              transform: "none",
              filter: "blur(0)",
            },
          ],
          {
            duration: 340,
            easing: E2,
          }
        );
      setTimeout(go, 320);
      return;
    }
    if (PG.pick) pickToggle(false);
    PG.embed = false;
    pg.classList.remove("embed");
    document.body.append(pg);
    pg.hidden = false;
    document.documentElement.classList.add("pcpageon");
    if (wasEmbed) renderShopPC();
    if (was || pcCalm()) {
      requestAnimationFrame(go);
      return;
    }
    pg.animate(
      [
        {
          opacity: 0,
          transform: "translateY(30px) scale(.97)",
        },
        {
          opacity: 1,
          transform: "none",
        },
      ],
      {
        duration: 340,
        easing: E2,
      }
    );
    setTimeout(go, 330);
  }
  function pageClose() {
    if (!PG.open) return;
    if (PG.pick) pickToggle(false);
    K.pick = null;
    PG.open = false;
    const b = NB();
    if (b) b.pageNav("close");
    else if (window.pcPageDemo) window.pcPageDemo(null);
    if (PG.embed) {
      PG.embed = false;
      pg.hidden = true;
      document.body.append(pg);
      pg.classList.remove("embed");
      if (ui.view === "shop") {
        K.swap = true;
        renderShopPC();
      }
      return;
    }
    const done = () => {
      pg.hidden = true;
      side.hidden = true;
      side.innerHTML = "";
      document.documentElement.classList.remove("pcpageon");
    };
    if (pcCalm()) return done();
    pg.animate(
      [
        {
          opacity: 1,
          transform: "none",
        },
        {
          opacity: 0,
          transform: "translateY(24px) scale(.97)",
        },
      ],
      {
        duration: 240,
        easing: "ease-in",
      }
    ).onfinish = done;
    if (!side.hidden)
      side.animate(
        [
          {
            opacity: 1,
            transform: "none",
          },
          {
            opacity: 0,
            transform: "translateX(50px)",
          },
        ],
        {
          duration: 220,
          easing: "ease-in",
          fill: "forwards",
        }
      );
  }
  const PICK_SRC =
    '(() => {\n  const W = window; if (W.__hbPick) return W.__hbPick;\n  const TOP = W === W.top;\n  const PR = /(\\d{1,4})\\s*[.,]\\s*(\\d{2})(?![\\d.]\\d|\\.(?!\\d)|\\d|\\s?(?:gbit|mbit|gb|tb|mb|mah|ghz|mhz|hz|zoll|cm|mm|kg|ml|kw|w|v|l|m|g)\\b|\\s?%)|[-–]\\s*[.,]\\s*(\\d{2})(?!\\d)|(\\d{1,4})\\s*[.,]\\s*[-–]/i;\n  const BAD = /^(uvp|statt|je |grundpreis|1 ?kg|100 ?g|1 ?l |\\d+ ?%|-?\\d+ ?%|ab |nur |aktion|angebot|knaller|neu|online|in den warenkorb|merken|details|zum angebot|mehr|versch\\.|verschiedene|auch |inkl|versand|lieferung|markt ausw|jetzt |spare |bewert|\\d+ bewertung)|:$/i;\n  const txt = (e) => (e && (e.innerText || e.textContent) || "").replace(/ /g, " ").trim();\n  const PRG = new RegExp(PR.source, "g");\n  const UNIT = /(=|zzgl|pfand|uvp|statt|grundpreis|sparst|ersparnis|spare |rabatt|vorher|bisher|ursprüngl|\\bje\\b|\\(1|pro\\s|€\\s?\\/|\\/\\s?(kg|l|st|stk|stück|m|m²|qm|lfm|100 ?g|100 ?ml)\\b)/i;\n  const FILL = /\\b(aktion|knaller|angebot|angebote|preis|statt|uvp|nur|ab|je|neu|top|deal|super|sale|rabatt|bonus|coupon|app|payback|auch|alkoholfrei)\\b|€/gi;\n  const nameish = (t) => /[a-zäöüß]{4}/i.test(String(t).replace(PRG, " ").replace(FILL, " "));\n  const fs = (e) => { try { return parseFloat(getComputedStyle(e).fontSize) || 0; } catch (x) { return 0; } };\n  const maxFs = (e) => { let m = fs(e); for (const k of e.querySelectorAll("*")) m = Math.max(m, fs(k)); return m; };\n  function hasPrice(e) { return PR.test(txt(e)) || !!e.querySelector("[itemprop=price],[class*=price i],[class*=preis i],[data-price]"); }\n  function valOf(e) {\n    const it = e.matches && e.matches("[itemprop=price]") ? e : null; if (it) { const v = parseFloat(String(it.getAttribute("content") || txt(it)).replace(",", ".")); if (v > 0) return v; }\n    const t = txt(e).replace(/\\s+/g, " "); const m = price(t); if (m != null) return m;\n    const CENT = /(^|[-_\\s])(cents?|decimals?|fraction(al)?|nachkomma)([-_\\s]|$)/i;\n    const sup = [...e.querySelectorAll("*")].find((k) => k.matches("sup,small") || CENT.test(String(k.className || "")) || CENT.test(k.getAttribute("data-testid") || ""));\n    if (sup && /^\\d{2}$/.test(txt(sup).replace(/[^\\d]/g, ""))) { const w = t.replace(txt(sup), "").replace(/[^\\d]/g, ""); if (w.length <= 4 && (w || /[-–.,]/.test(t))) return Number((w || "0") + "." + txt(sup).replace(/[^\\d]/g, "")); }\n    return null;\n  }\n  function cardPrice(c) {\n    const it = c.querySelector("[itemprop=price]"); if (it) { const v = valOf(it); if (v) return v; }\n    const own = (p) => p ? [...p.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(" ") : "";\n    const els = [c, ...c.querySelectorAll("*")].filter((e) => { const t = txt(e); return t && t.length <= 24 && !UNIT.test(t) && !UNIT.test(own(e.parentElement)); });\n    let best = null;\n    const app = (e) => { for (let x = e, i = 0; x && x !== c && i < 3; i++, x = x.parentElement) if (/\\bapp\\b/i.test(txt(x)) && txt(x).length < 30) return true; return false; };\n    const struck = (e) => { for (let x = e, i = 0; x && i < 4; i++, x = x.parentElement) { if (x.matches("s,del,strike")) return true; try { if (/line-through/.test(getComputedStyle(x).textDecorationLine)) return true; } catch (z) {} if (x === c) break; } return false; };\n    for (const e of els) { if (struck(e)) continue; const v = valOf(e); if (!(v > 0 && v < 100000)) continue; const f = maxFs(e), r = e.getBoundingClientRect(), a = app(e) ? 1 : 0;\n      if (!best || a < best.app || (a === best.app && (f > best.f + 0.5 || (Math.abs(f - best.f) <= 0.5 && r.width * r.height < best.a)))) best = { v, f, a: r.width * r.height, app: a }; }\n    if (best) return best.v;\n    const all = txt(c).split(/\\n+/).filter((l) => !UNIT.test(l)).join("\\n"); return price(all);\n  }\n  function cardName(c) {\n    let best = null;\n    const clean = (t) => String(t || "").replace(/\\s+/g, " ").trim().replace(/[:\\s,(*¹⁴⁵⁶⁷⁸⁹⁰†]+$/, "").replace(/^[^A-Za-zÄÖÜäöü0-9"„]+/, "");\n    const ok = (t) => !(t.length < 3 || t.length > 90 || PR.test(t) || UNIT.test(t) || BAD.test(t) || /bewertung|rezension|sternen?\\b|bitte w(ä|ae)hle|entdecken|alle anzeigen|mehr erfahren|zum produkt/i.test(t) || !nameish(t));\n    const consider = (t, f) => { t = clean(t); if (!ok(t)) return; if (!best || f > best.f + 0.5) best = { t, f }; };\n    const all = [];\n    const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);\n    for (let n = tw.nextNode(); n; n = tw.nextNode()) { const pe = n.parentElement; if (!pe) continue; const st = getComputedStyle(pe); if (st.display === "none" || st.visibility === "hidden") continue;\n      const pr = pe.getBoundingClientRect(); if (pr.width < 3 || pr.height < 3) continue;\n      const t = clean(n.nodeValue); if (!t) continue; all.push({ t, f: fs(pe) }); consider(t, fs(pe)); }\n    if (best && best.t.length <= 24) { const i = all.findIndex((a) => a.t === best.t && Math.abs(a.f - best.f) < 0.01), nx = all[i + 1];\n      if (nx && Math.abs(nx.f - best.f) <= 0.5 && ok(nx.t) && best.t.length + nx.t.length < 90) best = { t: best.t + " " + nx.t, f: best.f }; }\n    if (!best) { let e = c; for (let i = 0; e && i < 3 && !best; i++, e = e.parentElement) { const img = e.querySelector("img[alt]"); if (img) consider(img.alt, 0); } }\n    return best ? best.t.replace(/\\s+,/g, ",").replace(/(\\.\\.\\.|…)$/, "").trim() : "";\n  }\n  const alike = (a, b) => { if (a.tagName !== b.tagName) return false; const ca = String(a.className || "").split(/\\s+/).filter(Boolean), cb = String(b.className || "").split(/\\s+/).filter(Boolean);\n    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), sim = (x, y) => Math.abs(x - y) <= Math.max(x, y) * 0.3 + 2;\n    if ((ca.length || cb.length) && !ca.some((x) => cb.includes(x))) return false;\n    return sim(ra.height, rb.height) && (sim(ra.width, rb.width) || (Math.abs(ra.top - rb.top) < 12 && Math.abs(ra.left - rb.left) > 20)); };\n  const isList = (e) => { const ks = [...e.children].filter((k) => { const kt = txt(k); return kt.length > 12 && hasPrice(k) && nameish(kt); });\n    if (ks.length >= 3) return ks.filter((k) => k.querySelector("img,picture")).length >= 3 || ks.some((k) => ks.some((o) => o !== k && alike(k, o)));\n    return ks.length === 2 && alike(ks[0], ks[1]) && ks.every((k) => k.querySelector("img,picture,canvas,svg") || hasBg(k)); };\n  function whole(e) {\n    const vw = innerWidth * innerHeight;\n    while (e.parentElement && e.parentElement !== document.body && e.parentElement !== document.documentElement) {\n      const p = e.parentElement, r = p.getBoundingClientRect();\n      if (isList(p) || txt(p).length > 900 || r.width * r.height > vw * 0.6) break;\n      e = p;\n    }\n    return e;\n  }\n  const hasBg = (e) => { try { const b = getComputedStyle(e).backgroundImage; return b && b !== "none" && /url\\(/.test(b); } catch (x) { return false; } };\n  const pics = (e) => e.querySelectorAll("img,picture,canvas,svg image").length + (hasBg(e) ? 1 : 0);\n  function imgBox(el) {\n    let e = el && el.nodeType === 1 ? el : el && el.parentElement;\n    for (let i = 0; e && i < 6 && !(e.matches("img,picture,canvas") || hasBg(e)); i++) e = e.parentElement;\n    if (!e || e === document.body || e === document.documentElement) return null;\n    const vw = innerWidth * innerHeight, r0 = e.getBoundingClientRect(); if (r0.width < 60 || r0.height < 40 || r0.width * r0.height > vw * 0.7) return null;\n    while (e.parentElement && e.parentElement !== document.body && e.parentElement !== document.documentElement) {\n      const p = e.parentElement, r = p.getBoundingClientRect();\n      if (pics(p) > Math.max(1, pics(e)) || r.width * r.height > vw * 0.6 || txt(p).length > 300) break;\n      e = p;\n    }\n    return e;\n  }\n  function cand(el) {\n    let e = el && el.nodeType === 1 ? el : el && el.parentElement, priceOnly = null;\n    for (let i = 0; e && e !== document.body && e !== document.documentElement && i < 14; i++, e = e.parentElement) {\n      const t = txt(e); if (t.length > 900) break;\n      if (isList(e)) break;\n      if (!hasPrice(e)) continue;\n      const r = e.getBoundingClientRect(); if (r.width < 50 || r.height < 24) continue;\n      if (nameish(t)) return whole(e);\n      if (!priceOnly) priceOnly = e;\n    }\n    return priceOnly;\n  }\n  function price(t) { const m = String(t).match(PR); if (!m) return null; if (m[1]) return Number(m[1] + "." + m[2]); if (m[3]) return Number("0." + m[3]); if (m[4]) return Number(m[4]); return null; }\n  function read(c) {\n    const t = txt(c);\n    const u = t.match(/(?:bis|gültig bis)\\s*(?:[a-z]{2,10}\\.?,?\\s*)?(\\d{1,2})\\.(\\d{1,2})\\.?(\\d{2,4})?/i);\n    const r = c.getBoundingClientRect();\n    return { name: cardName(c).slice(0, 60), price: cardPrice(c), until: u ? { d: +u[1], m: +u[2], y: u[3] ? +u[3] : 0 } : null, rect: TOP ? { x: r.left, y: r.top, w: r.width, h: r.height } : null };\n  }\n  let hov = null, hovOld = "", mode = "", box = null, layer = null, sx = 0, sy = 0, skip = false;\n  const send = (o) => console.log("__HBPICK__" + JSON.stringify(o));\n  function mark(c) { if (hov === c) return; if (hov) hov.style.cssText = hovOld; hov = c; if (c) { hovOld = c.style.cssText; c.style.setProperty("outline", "3px solid #1a7a5c", "important"); c.style.setProperty("outline-offset", "2px", "important"); c.style.setProperty("box-shadow", "0 10px 30px rgba(26,122,92,.35)", "important"); } }\n  function over(e) { if (mode === "pick") mark(cand(e.target) || (TOP ? imgBox(e.target) : null)); }\n  function stop(e) { if (!mode) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }\n  function click(e) {\n    if (mode !== "pick") return; stop(e);\n    if (skip) { skip = false; return; }\n    const c = cand(e.target);\n    const photo = (b) => { mark(null); const r = b.getBoundingClientRect(); if (b.animate) b.animate([{ transform: "scale(1)" }, { transform: "scale(.95)" }, { transform: "scale(1)" }], { duration: 420 });\n      setTimeout(() => send({ lasso: { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, innerWidth - Math.max(0, r.left)), h: Math.min(r.height, innerHeight - Math.max(0, r.top)) } }), 450); };\n    if (!c) { const b = TOP ? imgBox(e.target) : null; if (b) return photo(b); return send({ fail: true, why: "nocard", tag: e.target && e.target.tagName }); }\n    const r = read(c);\n    if (!r.price || !r.name) { const b = TOP ? (imgBox(e.target) || c) : null; if (b && !r.price) return photo(b); }\n    if (c.animate) c.animate([{ transform: "scale(1)" }, { transform: "scale(.95)" }, { transform: "scale(1)" }], { duration: 420 });\n    if (!r.price || !r.name) return send({ fail: true, why: "noprice", partial: r });\n    send(r);\n  }\n  function cursor(on) { document.documentElement.style.setProperty("cursor", on ? "copy" : "", on ? "important" : ""); if (document.body) document.body.style.setProperty("cursor", on ? "copy" : "", on ? "important" : ""); }\n  function lassoOn() {\n    if (!TOP || layer) return;\n    layer = document.createElement("div");\n    layer.style.cssText = "position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:rgba(194,124,14,.06)";\n    const tip = document.createElement("div"); tip.textContent = "Zieh einen Rahmen um das Angebot";\n    tip.style.cssText = "position:fixed;left:50%;top:14px;transform:translateX(-50%);background:#c27c0e;color:#fff;font:700 14px system-ui,sans-serif;padding:8px 16px;border-radius:12px;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.2)";\n    layer.appendChild(tip);\n    layer.addEventListener("pointerdown", (e) => { e.preventDefault(); tip.style.display = "none"; sx = e.clientX; sy = e.clientY; box = document.createElement("div");\n      box.style.cssText = "position:fixed;z-index:2147483647;border:2.5px dashed var(--accent);background:rgba(26,122,92,.10);border-radius:10px;pointer-events:none";\n      document.documentElement.appendChild(box); layer.setPointerCapture(e.pointerId); move(e); });\n    layer.addEventListener("pointermove", move);\n    layer.addEventListener("pointerup", (e) => { if (!box) return; const r = box.getBoundingClientRect(); box.remove(); box = null; skip = true; setTimeout(() => { skip = false; }, 400);\n      if (r.width < 20 || r.height < 14) return; set("pick"); send({ lasso: { x: r.left, y: r.top, w: r.width, h: r.height } }); });\n    document.documentElement.appendChild(layer);\n  }\n  function move(e) { if (!box) return; const x = Math.min(sx, e.clientX), y = Math.min(sy, e.clientY); Object.assign(box.style, { left: x + "px", top: y + "px", width: Math.abs(e.clientX - sx) + "px", height: Math.abs(e.clientY - sy) + "px" }); }\n  function set(m) { mode = m; cursor(m === "pick"); if (m !== "pick") mark(null); if (m === "lasso") lassoOn(); else if (layer) { layer.remove(); layer = null; } }\n  ["click", "auxclick", "dblclick", "contextmenu"].forEach((t) => W.addEventListener(t, t === "click" ? click : stop, true));\n  W.addEventListener("mouseover", over, true);\n  ["pointerdown", "mousedown", "touchstart"].forEach((t) => W.addEventListener(t, (e) => { if (mode === "pick") stop(e); }, { capture: true, passive: false }));\n  W.__hbPick = { set, test: { cand, read, imgBox } };\n  return W.__hbPick;\n})()';
  /* Angebot picken */
  PG.pick = false;
  function pickToggle(on) {
    const b = NB();
    PG.pick = !!on && !!(b && b.pagePick);
    if (on && !PG.pick) {
      toast("Dafür braucht es die neue PC-App – kommt mit dem nächsten Update");
      return;
    }
    if (b && b.pagePick) b.pagePick(PG.pick ? "pick" : "", PICK_SRC);
    pg.classList.toggle("picking", PG.pick);
    pg.classList.remove("lassoing");
    const pb = pg.querySelector(".pick");
    if (pb) {
      pb.textContent = PG.pick ? "✓ Picken an – Esc zum Beenden" : "🛒 Angebote picken";
      if (!pcCalm())
        pb.animate(
          [
            {
              transform: "scale(.9)",
            },
            {
              transform: "scale(1.06)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 320,
          }
        );
    }
    if (PG.pick) toast("Klick auf ein Angebot – es kommt auf den Einkaufszettel");
  }
  function lassoStart() {
    const b = NB();
    if (!b || !b.pagePick) {
      toast("Dafür braucht es die neue PC-App – kommt mit dem nächsten Update");
      return;
    }
    if (pg.classList.contains("lassoing")) {
      pickToggle(false);
      return;
    }
    PG.pick = true;
    b.pagePick("lasso", PICK_SRC);
    pg.classList.add("picking", "lassoing");
    const pb = pg.querySelector(".pick");
    if (pb) pb.textContent = "✓ Picken an – Esc zum Beenden";
    toast("Zieh einen Rahmen um das Angebot");
  }
  window.hbPagePickOff = () => pickToggle(false);
  const untilIso = (u) => {
    if (!u || !u.d || !u.m) return "";
    const now = new Date();
    let y = u.y ? (u.y < 100 ? 2000 + u.y : u.y) : now.getFullYear();
    if (!u.y && u.m < now.getMonth() + 1 - 6) y++;
    return `${y}-${pad(u.m)}-${pad(u.d)}`;
  };
  function fly(text, r) {
    if (pcCalm()) return;
    const h = $("pcpHole"),
      z = $("pczIn");
    if (!h || !z) return;
    const hr = h.getBoundingClientRect(),
      zr = z.getBoundingClientRect();
    const x0 = Math.min(r ? hr.left + r.x + r.w / 2 : hr.right - 60, hr.right - 40),
      y0 = r ? hr.top + r.y + r.h / 2 : hr.top + 80,
      x1 = zr.left + 40,
      y1 = zr.top + zr.height / 2;
    const f = document.createElement("div");
    f.className = "pcfly2";
    f.textContent = text;
    document.body.appendChild(f);
    f.animate(
      [
        {
          left: x0 + "px",
          top: y0 + "px",
          transform: "translate(-50%,-50%) scale(1)",
          opacity: 1,
        },
        {
          left: (x0 + x1) / 2 + "px",
          top: Math.min(y0, y1) - 90 + "px",
          transform: "translate(-50%,-50%) scale(.9) rotate(-6deg)",
          offset: 0.5,
        },
        {
          left: x1 + "px",
          top: y1 + "px",
          transform: "translate(-50%,-50%) scale(.55)",
          opacity: 0.3,
        },
      ],
      {
        duration: 850,
        easing: "cubic-bezier(.5,0,.3,1)",
        fill: "forwards",
      }
    ).onfinish = () => f.remove();
  }
  function addPicked(n, p, until, rect, asDeal) {
    if (!PG.shop) return;
    n = String(n || "")
      .trim()
      .slice(0, 60);
    if (!n) return;
    if (asDeal) {
      const keep = (store.settings.deals || []).filter(
        (x) => !x.until || x.until >= isoOf(new Date(Date.now() - 14 * 864e5))
      );
      store.settings.deals = [
        ...keep,
        {
          id: newId(),
          shop: PG.shop.id,
          text: n,
          price: p > 0 ? round2(p) : null,
          until: until || nextSat(),
        },
      ];
      saveSettings();
      toast(`Angebot gemerkt: ${n}`);
      return;
    }
    const id = newId();
    K.fresh = id;
    fly(n + (p ? " · " + fmtEur(p) : ""), rect);
    setTimeout(
      () => {
        const before = list(),
          r = zAddTo(before, {
            id,
            n,
            done: false,
            s: PG.shop.id,
            ...(p > 0
              ? {
                  p: round2(p),
                }
              : {}),
            ...(until
              ? {
                  u: until,
                }
              : {}),
          });
        saveList(r.list);
        toast(
          r.more
            ? `${n}: jetzt ${shopQty(r.list.find((x) => x.id === r.id))}x auf dem Zettel`
            : `Auf dem Zettel: ${n}${p ? " · " + fmtEur(p) : ""}`,
          () => saveList(before),
          "Rückgängig"
        );
      },
      pcCalm() ? 0 : 700
    );
  }
  function readOcr(lines) {
    const L = (lines || [])
        .map((l) => ({
          t: String(l.t || "")
            .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰*]+/g, "")
            .trim(),
          h: +l.h || 0,
          w: !!l.w,
        }))
        .filter((l) => l.t),
      all = L.map((l) => l.t).join("\n");
    const shopN = PG.shop ? normText(PG.shop.name) : "";
    const BAD =
      /^(uvp|statt|je|grundpreis|ab|nur|aktion|angebot|angebote|preis|kg|1 ?kg|1 ?l|100 ?g|\d+ ?%|wochen|deal|knaller|kauf \d|super|top|neu|sale|tipp)\b/i;
    const pr = (t) => {
      let m = t.match(/(\d{1,4})\s*[.,]\s*(\d{2})(?!\d)/);
      if (m) return +(m[1] + "." + m[2]);
      m = t.match(/[-–]\s*[.,]\s*(\d{2})(?!\d)/);
      if (m) return +("0." + m[1]);
      m = t.match(/(\d{1,4})\s*[.,]\s*[-–]/);
      if (m) return +m[1];
      m = t.replace(/\s+/g, " ").match(/^\D{0,3}(\d{1,3})\s(\d{2})\D{0,3}$/);
      if (m) return +(m[1] + "." + m[2]);
      return null;
    };
    const prW = (t) => {
      const v = pr(t);
      if (v != null) return v;
      const m = t.replace(/[oO]/g, "0").match(/^\D{0,2}(\d{3,4})\D{0,8}$/);
      return m ? +m[1] / 100 : null;
    };
    const UNIT = /(=|zzgl|pfand|uvp|statt|grundpreis|\(1|je\s*\d|\bkg\b|\bl\b|100\s*g|%)/i;
    let cands = L.map((l, i) => ({
      v: l.w ? prW(l.t) : pr(l.t),
      h: l.h,
      i,
      t: l.t,
      w: l.w,
    })).filter((x) => x.v > 0 && x.v < 10000 && !UNIT.test(x.t));
    const mh = Math.max(0, ...cands.map((x) => x.h)),
      big = cands.filter((x) => !mh || x.h >= mh * 0.6),
      pick = (big.length ? big : cands).slice(-1)[0];
    const price = pick ? pick.v : null;
    const clean = (t) =>
      t
        .replace(/^[^A-Za-zÄÖÜäöü0-9]+/, "")
        .replace(/[\s,(.…]+$/, "")
        .trim();
    const noShop = (t) =>
      shopN ? t.replace(new RegExp("^" + shopN.replace(/[^a-z0-9]/g, "") + "[\\s.…:-]*", "i"), "") : t;
    const names = L.map((l, i) => ({
      t: clean(noShop(clean(l.t))),
      h: l.h,
      i,
      raw: noShop(l.t),
      w: l.w,
    })).filter(
      (l) =>
        !l.w &&
        /[a-zäöüß]{3}/.test(l.raw) &&
        pr(l.raw) == null &&
        !BAD.test(l.raw) &&
        !/^(bis|gültig)/i.test(l.raw) &&
        !UNIT.test(l.raw) &&
        l.t.length >= 4
    );
    const top = names.slice().sort((a, b) => b.h - a.h || b.t.length - a.t.length)[0];
    const name = top ? [top.t] : [];
    if (top && top.h) {
      const nx = names.find((l) => l.i === top.i + 1 && Math.abs(l.h - top.h) <= top.h * 0.15);
      if (nx) name.push(nx.t);
    }
    const u = all.match(/bis\s*(?:[a-z]{2,10}\.?,?\s*)?(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/i);
    return {
      n: name.join(" ").replace(/\s+/g, " ").slice(0, 60),
      p: price,
      u: u
        ? untilIso({
            d: +u[1],
            m: +u[2],
            y: u[3] ? +u[3] : 0,
          })
        : "",
    };
  }
  window.hbPagePick = async (res) => {
    if (!res || !PG.open) return;
    if (res.fail && res.partial && (res.partial.name || res.partial.price)) {
      K.pick = {
        n: res.partial.name || "",
        p: res.partial.price || null,
        u: untilIso(res.partial.until),
        rect: res.partial.rect,
      };
      renderShopPC();
      const el = $(K.pick.n ? "pkP" : "pkN");
      if (el) el.focus();
      toast("Nicht alles erkannt – bitte kurz ergänzen");
      return;
    }
    if (res.fail) {
      if (res.lassoFailed) {
        toast("Das hat nicht geklappt – bitte noch einmal");
        return;
      }
      toast("Hier ist kein Angebot zu erkennen – klick direkt auf den Kasten des Angebots");
      return;
    }
    if (res.reading) {
      pg.classList.remove("lassoing");
      const pb = pg.querySelector(".pick");
      if (pb) pb.textContent = "✓ Picken an – Esc zum Beenden";
      K.pick = {
        busy: true,
      };
      renderShopPC();
      return;
    }
    if (res.img) {
      pg.classList.remove("lassoing");
      const pb = pg.querySelector(".pick");
      if (pb) pb.textContent = "✓ Picken an – Esc zum Beenden";
      K.pick = {
        busy: true,
      };
      renderShopPC();
      try {
        let lines = Array.isArray(res.lines) && res.lines.length ? res.lines : null;
        if (!lines) {
          await loadTesseract();
          const r = await window.Tesseract.recognize(res.img, "deu");
          lines = ((r.data && r.data.lines) || []).map((l) => ({
            t: l.text.trim(),
            h: l.bbox ? l.bbox.y1 - l.bbox.y0 : 0,
          }));
        }
        K.pick = readOcr(lines);
        K.pick.raw = lines
          .map((l) => l.t)
          .join(" · ")
          .slice(0, 160);
        if (!lines.length) K.pick.raw = "(kein Text erkannt)" + (res.ocrErr ? " – " + res.ocrErr : "");
        for (const t of res.badges || []) {
          const c = String(t).replace(/[oO]/g, "0").replace(/\s+/g, ""),
            m = c.match(/(\d{1,4})[.,](\d{2})/) || c.match(/^\D*(\d{1,3})(\d{2})\D*$/);
          if (m) {
            K.pick.p = +(m[1] + "." + m[2]);
            K.pick.raw = "Preis-Kreis: " + m[1] + "," + m[2] + " · " + K.pick.raw;
            break;
          }
        }
      } catch (e) {
        K.pick = {
          n: "",
          p: null,
          u: "",
          raw: "(Texterkennung nicht erreichbar" + (res.ocrErr ? " – " + res.ocrErr : "") + ")",
        };
        toast("Texterkennung ging nicht – bitte selbst eintragen");
      }
      K.pick.rect = res.rect;
      renderShopPC();
      const el = $(K.pick.n ? "pkP" : "pkN");
      if (el) el.focus();
      return;
    }
    if (res.name) addPicked(res.name, res.price, untilIso(res.until), res.rect);
  };
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-pkx]")) {
      K.pick = null;
      renderShopPC();
      return;
    }
    const ok = e.target.closest("[data-pkok]");
    if (ok && K.pick) {
      const n = ($("pkN").value || "").trim(),
        p = parseAmt($("pkP").value || ""),
        u = $("pkU").value || "",
        r = K.pick.rect;
      if (!n) {
        $("pkN").focus();
        return;
      }
      K.pick = null;
      renderShopPC();
      addPicked(n, p > 0 ? p : null, u, r, ok.dataset.pkok === "deal");
    }
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && /^pk[NPU]$/.test(e.target.id || "")) {
      e.preventDefault();
      const b = root.querySelector('[data-pkok="zettel"]');
      if (b) b.click();
    }
  });
  K.PG = PG;
  K.pg = pg;
  K.place = place;
  K.open = pageOpen;
  try {
    const b = NB();
    if (b) b.pageNav("close");
  } catch (_) {}
  window.hbPageRequest = (url) => pageOpen(url);
  window.hbPageBlocked = () => {
    toast("Andere Webseiten sind hier gesperrt");
    const u = pg.querySelector(".url");
    if (u && !pcCalm())
      u.animate(
        [
          {
            transform: "none",
          },
          {
            transform: "translateX(-6px)",
          },
          {
            transform: "translateX(6px)",
          },
          {
            transform: "translateX(-3px)",
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 320,
        }
      );
  };
  window.hbPageClose = pageClose;
  openPage = (url) => pageOpen(url);
  pg.addEventListener("click", (e) => {
    const n = e.target.closest("[data-pcpnav]");
    if (!n) return;
    const c = n.dataset.pcpnav;
    if (c === "close") return pageClose();
    if (c === "pick") return pickToggle(!PG.pick);
    if (c === "lasso") return lassoStart();
    const b = NB();
    if (b) b.pageNav(c);
  });
  side.addEventListener("click", (e) => {
    if (e.target.closest("[data-pcpdeal]")) {
      const text = ($("pcpDT").value || "").trim(),
        pr = parseAmt($("pcpDP").value || ""),
        until = $("pcpDU").value || "";
      if (!text) {
        $("pcpDT").focus();
        return;
      }
      const keep = (store.settings.deals || []).filter(
        (x) => !x.until || x.until >= isoOf(new Date(Date.now() - 14 * 864e5))
      );
      store.settings.deals = [
        ...keep,
        {
          id: newId(),
          shop: PG.shop.id,
          text: text.slice(0, 60),
          price: pr > 0 ? round2(pr) : null,
          until,
        },
      ];
      $("pcpDT").value = "";
      $("pcpDP").value = "";
      saveSettings();
      sideRender();
      toast("Angebot gemerkt");
      return;
    }
    if (e.target.closest("[data-pcpzadd]")) return sideAdd();
    const ck = e.target.closest("[data-pczck]");
    if (ck) {
      const id = ck.dataset.pczck;
      saveList(
        list().map((x) =>
          x.id === id
            ? {
                ...x,
                done: !x.done,
              }
            : x
        )
      );
      return;
    }
    const dl = e.target.closest("[data-pczdel]");
    if (dl) {
      const id = dl.dataset.pczdel,
        old = list();
      saveList(old.filter((x) => x.id !== id));
      toast("Gelöscht", () => saveList(old), "Rückgängig");
      return;
    }
  });
  function sideAdd() {
    const i = $("pcpZ"),
      n = ((i && i.value) || "").trim();
    if (!n) return;
    i.value = "";
    saveList(
      zAddTo(list(), {
        id: newId(),
        n: n.slice(0, 60),
        done: false,
        s: PG.shop.id,
      }).list
    );
  }
  side.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (e.target.id === "pcpZ") {
        e.preventDefault();
        sideAdd();
      } else if (/^pcpD/.test(e.target.id)) {
        e.preventDefault();
        side.querySelector("[data-pcpdeal]").click();
      }
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && PG.open && !document.querySelector(".backdrop.show:not([hidden])")) {
      e.preventDefault();
      if (PG.pick) pickToggle(false);
      else if (!PG.embed) pageClose();
    }
  });
  addEventListener("resize", () => place());
  new ResizeObserver(() => place()).observe($("pcpHole"));
  let pgVis = null;
  new MutationObserver(() => {
    const b = NB();
    if (!b || !PG.open) {
      pgVis = null;
      return;
    }
    const v = !document.querySelector(
      ".backdrop.show:not([hidden]),#pcFbBg:not([hidden]),#moBg:not([hidden]),#mbBg:not([hidden]),#tourBg:not([hidden]),.hobg:not([hidden]),#hlBg:not([hidden]),#mamiPop:not([hidden]),#fanBg.wheel:not([hidden]),#fanBg.show"
    );
    if (v !== pgVis) {
      pgVis = v;
      b.pageShow(v);
    }
  }).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden"],
    childList: true,
  });
  const _r6 = render;
  render = (...a) => {
    const x = _r6(...a);
    if (PG.open) {
      if (ui.view !== lastView) pageClose();
      else if (!PG.embed) sideRender();
    }
    lastView = ui.view;
    return x;
  };
}

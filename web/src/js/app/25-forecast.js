/* Einkäufe (Läden, Einkaufszettel) getrennt vom übrigen Alltag rechnen */
function isShopTx(t) {
  if (!t || t.kind !== "ausgabe") return false;
  if (t.src === "zettel") return true;
  const n = normText((t.note || "") + " " + (t.bank || ""));
  return !!n && SHOPS.some((x) => x.re.test(n));
}
function shopSum(from, to) {
  let v = 0,
    n = 0;
  for (const t of store.tx) {
    if (!t.date || t.date < from || t.date > to || !isShopTx(t)) continue;
    v += Math.abs(Number(t.amount) || 0);
    n++;
  }
  return {
    v,
    n,
  };
}
/* Ø pro Tag „Alltag“: nur normale Ausgaben – ohne Einkäufe, Fixkosten, Betriebsausgaben und Steuer-Vorauszahlungen */
/* Anlegen (Investieren): Geld geht vom Konto ins Depot – keine Alltags-Ausgabe */
const INV_CAT = "Anlegen";
function isInvTx(t) {
  return !!t && t.kind === "ausgabe" && (!!t.inv || t.cat === INV_CAT);
}
function invGoalNames() {
  return ((store.settings.inv && store.settings.inv.goals) || []).map((g) => g.name).filter(Boolean);
}
function invTxSum(gid, after) {
  let v = 0;
  for (const t of store.tx || [])
    if (isInvTx(t) && t.inv === gid && (!after || t.date > after)) v += Number(t.amount) || 0;
  return round2(v);
}
function dayAvg(from, to, days) {
  let v = 0;
  for (const t of store.tx) {
    if (t.kind !== "ausgabe" || !t.date || t.date < from || t.date > to || isShopTx(t) || (isInvTx(t) && !fcCfg().inv))
      continue;
    v += Math.abs(Number(t.amount) || 0);
  }
  return v / Math.max(1, days);
}
/* „Noch pro Tag“: Hauptkonto minus offene Fixkosten und Steuer-Rücklage, geteilt durch die restlichen Tage (inkl. heute) */
function freePerDay(ym, mainBal, c) {
  const left = Math.max(1, daysIn(ym) - new Date().getDate() + 1);
  let res = 0;
  try {
    res = yearCum(ym).reserveAcc || 0;
  } catch (_) {}
  let fo = c ? c.fixOpen : 0;
  try {
    if (fxAcctOn()) fo = fxOpenMain(ym);
  } catch (_) {}
  return {
    left,
    v: Math.max(0, (Number(mainBal) || 0) - fo - res) / left,
  };
}
function shopAvg() {
  const td = isoToday(),
    d0 = new Date(td + "T12:00");
  d0.setDate(d0.getDate() - 89);
  let first = td;
  for (const t of store.tx) if (t.date && t.date < first) first = t.date;
  const from = first > isoOf(d0) ? first : isoOf(d0),
    span = Math.max(14, Math.round((new Date(td + "T12:00") - new Date(from + "T12:00")) / 864e5) + 1),
    A = shopSum(from, td),
    M = shopSum(td.slice(0, 7) + "-01", td),
    day = A.v / span;
  return {
    day,
    week: day * 7,
    month: day * 30.44,
    n: A.n,
    span,
    mon: M.v,
    monN: M.n,
  };
}
function shopAvgCard() {
  const a = shopAvg();
  if (!a.n) return "";
  const E = (v) => escHtml(fmtEur(v));
  return `<div class="card sacard"><div class="sahd">${svgIcon("cart", 18)}<b>${escHtml(uiText("sa_h"))}</b></div><div class="sagrid" data-noi18n>
    <div><small>${escHtml(uiText("sa_day"))}</small><b>${E(a.day)}</b></div><div><small>${escHtml(uiText("sa_week"))}</small><b>${E(a.week)}</b></div><div><small>${escHtml(uiText("sa_month"))}</small><b>${E(a.month)}</b></div></div>
    <p class="small muted sas">${escHtml(
      uiText("sa_sub", {
        d: String(a.span),
        n: String(a.n),
        m: fmtEur0(a.mon),
      })
    )}</p></div>`;
}
function zettelCard() {
  const T = zTrip(),
    M = zMyTrip(),
    me = devId();
  if (!M && !zList().length) return zMiniCard(T);
  const L = zList(),
    mode = zSort();
  const mineIt = (it) => !M || zMineShop(M, (zWhere(it) || {}).s || "", me) || it.by === me;
  const shown = M ? L.filter(mineIt) : L,
    others = M ? L.filter((x) => !mineIt(x)) : [];
  const open = shown.filter((x) => !x.done),
    done = shown.filter((x) => x.done);
  const est = sum(open, (it) => {
    const w = zWhere(it);
    return w && w.p ? w.p * shopQty(it) : 0;
  });
  const dot = (w, it) => {
    const sh = w && zShopBy(w.s);
    return `<button class="zsh" data-zpick="${escHtml(it.id)}" title="${sh ? escHtml(sh.name) : "Laden wählen"}" aria-label="Laden für ${escHtml(it.n)} wählen">${zLogo(sh, 24)}</button>`;
  };
  const isNew = (it) => M && !it.done && !it.extra && (it.c || 0) > M.at;
  const row = (x) =>
    `<div class="zrw" data-zrow="${escHtml(x.it.id)}"><button class="zdel" data-zdel="${escHtml(x.it.id)}" aria-label="${escHtml(x.it.n)} löschen" tabindex="-1">${ZTRASH}</button><div class="zr ${x.it.done ? "done" : ""} ${isNew(x.it) ? "isnew" : ""}"><button class="zb" data-zck="${escHtml(x.it.id)}" aria-label="${escHtml(x.it.n)} abhaken"></button><input class="zq" type="number" inputmode="numeric" min="1" max="99" value="${shopQty(x.it)}" data-zq="${escHtml(x.it.id)}" aria-label="Menge ${escHtml(x.it.n)}"><span class="zx">x</span><button class="zn" data-zck="${escHtml(x.it.id)}">${escHtml(x.it.n)}${isNew(x.it) ? ` <span class="znew">NEU</span>` : ""}${x.it.extra ? ` <span class="zdaz">DAZU</span>` : ""}</button><b>${x.w && x.w.p ? escHtml(fmtEur(x.w.p * shopQty(x.it))) : ""}</b>${x.it.done && x.it.by && M && (M.devs || []).length > 1 ? zWho(x.it.by, 16) : ""}${dot(x.w, x.it)}</div></div>`;
  let gs = zGroups(shown, mode);
  if (M && mode !== "laden")
    gs = gs.map((g) => ({
      ...g,
      rows: g.rows.slice().sort((a, b) => isNew(b.it) - isNew(a.it)),
    }));
  if (M && mode === "laden") gs = gs.sort((a, b) => b.rows.some((x) => isNew(x.it)) - a.rows.some((x) => isNew(x.it)));
  const head = (g) =>
    mode === "laden"
      ? `<div class="zgh">${zLogo(g.shop, 26)}${g.shop ? escHtml(g.shop.name) : "Laden offen"}${M && M.assign && g.shop && M.assign[g.k] === me ? `<span class="zfor">für dich</span>` : ""}<small>${g.rows.filter((x) => x.it.done).length} von ${g.rows.length}</small></div>`
      : mode === "abt"
        ? `<div class="zgh"><span>${g.ic}</span>${escHtml(g.k)}<small>${g.rows.length}</small></div>`
        : "";
  let fold = "";
  if (M && others.length) {
    const byDev = {};
    for (const it of others) {
      const s = (zWhere(it) || {}).s || "",
        d = (M.assign || {})[s] || "";
      (byDev[d] = byDev[d] || []).push(it);
    }
    fold = Object.entries(byDev)
      .map(([d, its]) => {
        const sh = [
            ...new Set(
              its
                .map((it) => {
                  const s = zShopBy((zWhere(it) || {}).s);
                  return s ? s.name : "";
                })
                .filter(Boolean)
            ),
          ],
          dn = its.filter((x) => x.done).length,
          fin = d && (M.fin || {})[d];
        return `<div class="zfold">${zWho(d, 18)}<span>${escHtml(sh.join(" & ") || "Rest")} macht ${escHtml(zDevName(d))} · ${fin ? "fertig ✓" : `${dn} von ${its.length} erledigt`}</span></div>`;
      })
      .join("");
  }
  let fin = "";
  const myDone = M
    ? shown.filter((x) => x.done && (x.by === me || (!x.by && (!(M.devs || []).length || (M.devs || []).length === 1))))
    : [];
  if (M && myDone.length && (!open.length || ui.zFinNow)) {
    const shops = zGroups(myDone, "laden");
    const ok = shops.every((g) => {
      const b = ZB.bons[g.k || "?"];
      return b && (b.img || b.none) && b.pay;
    });
    fin = `<div class="zfin"><b>${open.length ? "Einkauf beenden" : "Alles abgehakt ✓"}</b><span class="small muted">${open.length ? `${open.length} ${open.length === 1 ? "Sache bleibt" : "Sachen bleiben"} auf dem Zettel. ` : ""}Fotografier die Kassenbons – einer pro Laden. Den Betrag und ob bar oder Karte liest die App vom Bon.</span>
      ${shops
        .map((g) => {
          const k = g.k || "?",
            b = ZB.bons[k],
            sh = g.shop,
            guess = sum(g.rows, (x) => (x.w && x.w.p ? x.w.p * shopQty(x.it) : 0)),
            v = b && (b.v != null ? b.v : b.amount != null ? b.amount : guess);
          const pay = b && b.pay,
            ex = b && b.img ? zExtras(b.lines, g.rows) : [];
          return `<div class="zbon ${b ? "ok" : ""} ${b && b.none ? "none" : ""}">
          <div class="zbr">${b && b.img ? `<img src="${b.img}" alt="">` : b && b.none ? `<span class="zno">✎</span>` : `<button class="zcam" data-zbon="${escHtml(k)}" aria-label="Kassenbon fotografieren">${ZB.busy === k ? "…" : svgIcon("camera", 18)}</button>`}
          <span class="zbt"><b>${zLogo(sh, 20)}${escHtml(sh ? sh.name : (b && b.shop) || "Laden offen")}</b><small>${!b ? "Kassenbon fotografieren" : b.none ? "ohne Bon – Betrag selbst eintragen" : b.amount != null ? "vom Bon gelesen" : "Betrag bitte prüfen"}</small></span>
          ${b ? `<input class="in zamt" inputmode="decimal" data-zamt="${escHtml(k)}" value="${v ? escHtml(Number(v).toFixed(2).replace(".", ",")) : ""}" placeholder="0,00" aria-label="Betrag">` : ""}</div>
          ${b ? `<div class="zpay" role="group" aria-label="Bezahlt mit"><button data-zpay="${escHtml(k)}|karte" class="${pay === "karte" ? "on" : ""}">${svgIcon("card", 16)} Karte</button><button data-zpay="${escHtml(k)}|bar" class="${pay === "bar" ? "on" : ""}">${svgIcon("cash", 16)} Bar</button>${b.img ? `<button class="zre" data-zbon="${escHtml(k)}">↻ neu</button>` : `<button class="zre" data-zbon="${escHtml(k)}">${svgIcon("camera", 14)} doch fotografieren</button>`}</div>` : `<button class="zlnk" data-znobon="${escHtml(k)}">Bon vergessen? → Betrag selbst eintragen</button>`}
          ${ex.length ? `<div class="zex"><b>Nicht auf dem Zettel:</b> ${ex.map((x) => escHtml(x.n) + " " + escHtml(fmtEur(x.p))).join(" · ")}<br><span class="muted">Zählt mit – der ganze Bon ist die Ausgabe.</span></div>` : ""}</div>`;
        })
        .join("")}
      <button class="btn primary zgo" data-zfin ${ok ? "" : "disabled"}>Einkauf fertig</button>${ok ? "" : `<div class="small muted" style="text-align:center">geht, wenn bei jedem Laden Bon (oder Betrag) und Karte/Bar da sind</div>`}</div>`;
  } else if (M && myDone.length && open.length)
    fin = `<button class="btn zend" data-zfinnow>Einkauf beenden (${open.length} offen lassen)</button>`;
  const xf = M
    ? ZB.x
      ? `<div class="zxf"><b>Noch etwas gekauft?</b><div class="zadd"><input class="in" id="zxN" placeholder="z. B. Chips" value="${escHtml(ZB.x.n || "")}" aria-label="Was"><input class="in zxp" id="zxP" inputmode="decimal" placeholder="€" value="${escHtml(ZB.x.p || "")}" aria-label="Preis"></div>
      <select class="in" id="zxS" aria-label="Laden">${[
        ...new Set(shown.map((it) => (zWhere(it) || {}).s).filter(Boolean)),
      ]
        .map(
          (s) =>
            `<option value="${escHtml(s)}" ${ZB.x.s === s ? "selected" : ""}>${escHtml(
              (
                zShopBy(s) || {
                  name: s,
                }
              ).name
            )}</option>`
        )
        .join("")}<option value="" ${ZB.x.s === "" ? "selected" : ""}>Anderer Laden</option></select>
      <div class="zdb"><button class="btn" data-zxx>Abbrechen</button><button class="btn primary" data-zxok>Dazu – schon abgehakt</button></div></div>`
      : `<button class="zlnk" data-zxopen>+ Noch etwas gekauft, was nicht auf dem Zettel stand?</button>`
    : "";
  const title = M ? "Einkaufszettel" : "Einkaufszettel",
    stat = `${open.length} offen${est ? ` · ca. ${escHtml(fmtEur(est))}` : ""}`;
  const away =
    T && !M
      ? `<div class="zaway">${svgIcon("cart", 14)} Einkauf läuft${
          T.devs && T.devs.length
            ? " auf " +
              T.devs
                .filter((d) => !(T.fin || {})[d.id])
                .map((d) => escHtml(zDevName(d.id)))
                .join(" & ")
            : ""
        } · ${L.filter((x) => x.done).length} von ${L.length} abgehakt</div>`
      : "";
  return `<div class="card zcard ${M ? "trip" : ""}"><div class="card-head"><h2>${M ? svgIcon("cart", 18) + " " : ""}${title}</h2><span class="small muted">${stat}</span></div>${away}
    <div class="zsort" role="group" aria-label="Sortieren">${[
      ["laden", "Laden"],
      ["abt", "Abteilung"],
      ["preis", "Preis"],
      ["az", "A–Z"],
    ]
      .map(([k, l]) => `<button data-zsort="${k}" class="${mode === k ? "on" : ""}">${l}</button>`)
      .join("")}</div>
    <div class="zadd"><input class="in" id="zIn" placeholder="Was brauchst du?" autocomplete="off" aria-label="Was brauchst du?"><button class="btn primary" data-zadd aria-label="Hinzufügen">+</button></div>
    ${gs.map((g) => `${head(g)}<div class="zgl" data-noswipe>${g.rows.map(row).join("")}</div>`).join("") || `<div class="small muted" style="padding:12px 2px">Noch nichts auf dem Zettel.</div>`}
    ${xf}${fold}${fin}
    ${M || T ? "" : L.some((x) => !x.done) ? `<div class="zdb" style="margin-top:12px"><button class="btn primary" data-zstart>${svgIcon("cart", 16)} Einkauf starten</button></div>` : ""}</div>`;
}
async function zBon(k) {
  ZB.busy = k;
  renderShop();
  try {
    let lines = [],
      img = null;
    if (NATIVE_SCAN) {
      const res = await scanNative("camera");
      if (!res) return;
      if (Array.isArray(res)) lines = res;
      else {
        lines = res.lines || [];
        img = res.img || null;
      }
      if (img) {
        const rv = await docReview(img, {
          lines,
        });
        if (!rv) return;
        if (rv.action === "retake") {
          ZB.busy = "";
          return zBon(k);
        }
        img = rv.img;
      }
    } else {
      const f = await new Promise((r) => {
        const inp = $("scanFile");
        inp.value = "";
        inp.onchange = () => r(inp.files[0] || null);
        inp.click();
      });
      if (!f) return;
      img = await shrinkImage(f);
      try {
        lines = await scanImageFile(img || f);
      } catch (_) {
        lines = [];
      }
    }
    if (!img) {
      toast("Das Foto konnte nicht übernommen werden");
      return;
    }
    const r = parseReceipt(lines || []),
      old = ZB.bons[k] || {};
    ZB.bons[k] = {
      img,
      lines,
      amount: r.amount != null ? r.amount : null,
      v: r.amount != null ? r.amount : old.v,
      date: r.date || "",
      shop: r.shop || "",
      pay: zPayOf(lines) || old.pay || "",
    };
    toast(
      r.amount != null
        ? `Bon gelesen: ${fmtEur(r.amount)}${ZB.bons[k].pay ? " · " + (ZB.bons[k].pay === "bar" ? "bar" : "Karte") : ""}`
        : "Betrag nicht erkannt – bitte eintragen"
    );
  } catch (e) {
    toast(e.message || "Foto ging nicht");
  } finally {
    ZB.busy = "";
    renderShop();
  }
}
async function zFinish() {
  const M = zMyTrip();
  if (!M) return;
  const me = devId();
  const shown = zList().filter((it) => zMineShop(M, (zWhere(it) || {}).s || "", me) || it.by === me);
  const myDone = shown.filter((x) => x.done && (x.by === me || (!x.by && (M.devs || []).length <= 1))),
    shops = zGroups(myDone, "laden");
  if (!shops.length) return;
  for (const g of shops) {
    const k = g.k || "?",
      b = ZB.bons[k],
      inp = document.querySelector(`[data-zamt="${CSS.escape(k)}"]`),
      v = parseAmt(inp ? inp.value : "");
    if (!b || !(b.img || b.none)) {
      toast("Bitte bei jedem Laden den Bon fotografieren oder „Bon vergessen“ wählen");
      return;
    }
    if (!(v > 0)) {
      toast("Bitte bei jedem Laden den Betrag eintragen");
      if (inp) inp.focus();
      return;
    }
    if (!b.pay) {
      toast("Bitte bei jedem Laden Karte oder Bar wählen");
      return;
    }
    b.v = v;
  }
  let n = 0;
  for (const g of shops) {
    const k = g.k || "?",
      b = ZB.bons[k];
    let sh = g.shop;
    if (!sh && b.shop) sh = SHOPS.find((x) => x.re.test(normText(b.shop))) || null;
    const date =
      b.date && b.date <= isoToday() && b.date >= isoOf(new Date(Date.now() - 7 * 864e5)) ? b.date : isoToday();
    const doc = {
      date,
      amount: round2(b.v),
      kind: "ausgabe",
      cat: zCatFor(sh),
      note: sh ? sh.name : b.shop || "Einkauf",
      ts: Date.now(),
      src: "zettel",
    };
    if (b.pay === "bar") {
      doc.pay = "bar";
      if (!cashOn()) {
        try {
          await cashActivate(date, null);
        } catch (_) {}
      }
    } else if (kaOn()) {
      const ac = kaFor(doc.cat);
      if (ac !== "Hauptkonto") doc.acct = ac;
    }
    if (!b.img) doc.nobon = true;
    try {
      const its = receiptItems(b.lines || []);
      if (its.length) {
        doc.items = its.map((i) => ({
          r: i.n,
          p: i.p,
        }));
        const sid = sh ? sh.id : zaShopId(b.shop);
        if (sid) doc.ishop = sid;
      }
    } catch (_) {}
    const id = mem ? newId() : db.collection("tx").doc().id;
    if (await safe(() => saveTxDoc(id, doc, null))) {
      n++;
      if (b.img) {
        try {
          await rcptPut(id, b.img);
        } catch (_) {}
        try {
          rememberPrices(sh ? sh.name : b.shop, date, receiptItems(b.lines || []));
        } catch (_) {}
      }
    }
  }
  const ids = new Set(myDone.map((x) => x.id));
  ZB.bons = {};
  ZB.x = null;
  ui.zFinNow = false;
  const t = store.settings.shopTrip,
    fin = {
      ...(t.fin || {}),
      [me]: Date.now(),
    },
    devs = (t.devs || []).map((d) => d.id),
    all = !devs.length || devs.every((d) => fin[d]);
  store.settings.shopTrip = all
    ? {
        id: t.id,
        t: Date.now(),
        end: true,
      }
    : {
        ...t,
        fin,
        t: Date.now(),
      };
  zSave(zList().filter((x) => !ids.has(x.id)));
  toast(n === 1 ? "Einkauf eingetragen" : `${n} Einkäufe eingetragen`, null, null, 5000);
}
document.addEventListener("click", (e) => {
  const s = e.target.closest("[data-zsort]");
  if (s) {
    try {
      localStorage.setItem("hb-zsort", s.dataset.zsort);
    } catch (_) {}
    renderShop();
    return;
  }
  const c = e.target.closest("[data-zck]");
  if (c) {
    const id = c.dataset.zck,
      me = devId();
    try {
      const it = zList().find((x) => x.id === id);
      SND.play(it && it.done ? "untick" : "tick");
      motAdd(`[data-zck="${id}"]`, it && it.done ? "uncheck" : "check");
    } catch (_) {}
    zSave(
      zList().map((x) =>
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
                by: me,
              }
          : x
      )
    );
    return;
  }
  if (e.target.closest("[data-zadd]")) {
    const i = $("zIn"),
      n = ((i && i.value) || "").trim();
    if (!n) return;
    i.value = "";
    const r = zAddTo(zList(), {
      id: newId(),
      n: n.slice(0, 60),
      done: false,
    });
    zSave(r.list);
    motAdd(`[data-zck="${r.id}"]`, "add");
    toast(r.more ? `${n}: jetzt ${shopQty(r.list.find((x) => x.id === r.id))}x` : `Auf dem Zettel: ${n}`);
    return;
  }
  if (e.target.closest("[data-zopen]")) {
    ui.zOpen = true;
    renderShop();
    return;
  }
  if (e.target.closest("[data-zclose]")) {
    ui.zOpen = false;
    renderShop();
    return;
  }
  if (e.target.closest("[data-zstart]")) {
    zStart(
      [
        {
          id: devId(),
          name: devMe().name || "Handy",
        },
      ],
      {}
    );
    ui.zOpen = true;
    toast("Einkauf gestartet – viel Spaß");
    return;
  }
  if (e.target.closest("[data-zfinnow]")) {
    ui.zFinNow = true;
    renderShop();
    return;
  }
  const b = e.target.closest("[data-zbon]");
  if (b) {
    zBon(b.dataset.zbon);
    return;
  }
  const nb = e.target.closest("[data-znobon]");
  if (nb) {
    const k = nb.dataset.znobon;
    ZB.bons[k] = {
      none: true,
      pay: "",
      v: null,
    };
    renderShop();
    setTimeout(() => {
      const i = document.querySelector(`[data-zamt="${CSS.escape(k)}"]`);
      if (i) i.focus();
    }, 50);
    return;
  }
  const py = e.target.closest("[data-zpay]");
  if (py) {
    const [k, p] = py.dataset.zpay.split("|");
    if (ZB.bons[k]) {
      ZB.bons[k].pay = p;
      renderShop();
    }
    return;
  }
  if (e.target.closest("[data-zxopen]")) {
    ZB.x = {
      n: "",
      p: "",
      s: undefined,
    };
    renderShop();
    setTimeout(() => {
      const i = $("zxN");
      if (i) i.focus();
    }, 50);
    return;
  }
  if (e.target.closest("[data-zxx]")) {
    ZB.x = null;
    renderShop();
    return;
  }
  if (e.target.closest("[data-zxok]")) {
    const n = ($("zxN").value || "").trim(),
      p = parseAmt($("zxP").value || ""),
      sh = $("zxS").value || "";
    if (!n) {
      $("zxN").focus();
      return;
    }
    ZB.x = null;
    zSave([
      ...zList(),
      {
        id: newId(),
        n: n.slice(0, 60),
        done: true,
        by: devId(),
        extra: true,
        c: Date.now(),
        ...(sh
          ? {
              s: sh,
            }
          : {}),
        ...(p > 0
          ? {
              p: round2(p),
            }
          : {}),
      },
    ]);
    toast(`Dazu: ${n}`);
    return;
  }
  if (e.target.closest("[data-zfin]")) {
    zFinish();
    return;
  }
});
document.addEventListener("change", (e) => {
  const q = e.target.closest && e.target.closest("[data-zq]");
  if (q) zSetQ(q.dataset.zq, q.value);
  const sh = e.target.closest && e.target.closest("[data-zshop]");
  if (sh) {
    const id = sh.dataset.zshop,
      v = sh.value;
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
  }
});
document.addEventListener("input", (e) => {
  const a = e.target.closest && e.target.closest("[data-zamt]");
  if (a && ZB.bons[a.dataset.zamt]) ZB.bons[a.dataset.zamt].v = parseAmt(a.value) || null;
  if (ZB.x && /^zx[NPS]$/.test(e.target.id || ""))
    ZB.x[
      {
        zxN: "n",
        zxP: "p",
        zxS: "s",
      }[e.target.id]
    ] = e.target.value;
});
document.addEventListener("keydown", (e) => {
  if (e.target && e.target.id === "zIn" && e.key === "Enter") {
    e.preventDefault();
    const b = e.target.parentElement.querySelector("[data-zadd]");
    if (b) b.click();
  }
});
function renderZiele() {
  const ym = ui.ym,
    goals = store.settings.goals || [];
  $("v-ziele").innerHTML =
    `<div class="zstack">${goalsRings()}${goals.length || ui.goalEdit ? goalsCard() : ""}${debtRings()}${taxGauge(ym)}</div>`;
}
function debtRings() {
  if (!store.debts.length)
    return `<div class="card rcard"><div class="card-head"><h2>${headIcon("bank")}Schulden</h2></div>
    <div class="small muted" style="margin:-4px 0 10px">Noch keine Kredite oder Schulden eingetragen.</div>
    <div class="rings"><button class="rbtn" data-debtnew="1" aria-label="Schuld hinzufügen"><span class="ring add">${svgIcon("plusIn", 22)}</span><b>Neu</b><small>&nbsp;</small></button></div></div>`;
  const st = store.debts.map((d) => [d, debtState(d)]),
    total = sum(st, (x) => x[1].remaining);
  return `<div class="card rcard" style="order:7"><div class="card-head"><h2>${headIcon("bank")}Schulden</h2><button class="link" data-go="more" data-sp="schulden">Alle anzeigen ${svgIcon("right", 16)}</button></div>
    <div class="small muted" style="margin:-4px 0 10px">Noch offen: <b style="color:var(--fg)">${escHtml(fmtEur(total))}</b></div>
    <div class="rings">${st.map(([d, s]) => `<button class="rbtn" data-go="more" data-sp="schulden" aria-label="${escHtml(d.name)}: noch ${escHtml(fmtEur(s.remaining))} offen, ${Math.round(s.pct * 100)} % getilgt">${ring(s.pct, s.remaining <= 0.005 ? "check" : "bank", s.remaining <= 0.005 ? "done" : "")}<b>${escHtml(d.name)}</b><small>${s.remaining <= 0.005 ? "abbezahlt ✓" : escHtml(fmtEur0(s.remaining))}</small></button>`).join("")}
      <button class="rbtn" data-debtnew="1" aria-label="Schuld hinzufügen"><span class="ring add">${svgIcon("plusIn", 22)}</span><b>Neu</b><small>&nbsp;</small></button>
    </div></div>`;
}

/* ===== Kategorie-Gruppen: Ober- und Unterkategorien für private Ausgaben =====
   store.settings.cgrp = { ausgabe: [ { id, n: Name, ic: Symbol, s: [Kategorien in Reihenfolge] } ] }
   Die bisherigen Kategorien bleiben die echten Kategorien der Buchungen (Unterkategorien).
   Wird nur die Gruppe gewählt, ist der Gruppenname selbst die Kategorie (wird dann angelegt).
   Ohne gespeicherte Gruppen sortiert Mami die Kategorien automatisch vor. */

const CG_KINDS = ["ausgabe"];
const CG_SEED = [
  ["wohnen", "home", /miete|wohn|strom|gas\b|heiz|internet|nebenkost|rundfunk|gez|möbel|haushalt|garten|reinig/i],
  ["essen", "food", /lebensm|essen|trink|getränk|restaurant|café|cafe|bäck|liefer|kantine|supermarkt|einkauf/i],
  ["mobil", "car", /tank|auto|kfz|park|öpnv|bahn|bus\b|taxi|fahrrad|werkstatt|mobil|ticket|maut/i],
  ["freizeit", "music", /spaß|spass|freizeit|kino|stream|sport|hobby|ausgeh|spiel|konzert|verein|bücher|buch/i],
  ["urlaub", "plane", /urlaub|reise|hotel|flug/i],
  ["gesund", "health", /gesund|apothek|arzt|drogerie|pflege(?! &)|friseur|kosmetik|brille|zahn/i],
  ["kleid", "shirt", /kleid|schuh|mode|textil/i],
  ["familie", "kids", /kind|kita|schule|spielzeug|famil|baby/i],
  ["tier", "paw", /tier|hund|katze|futter/i],
  ["vertrag", "shield", /versich|vertrag|handy|mobilfunk|abo\b|abos|mitglied|beitrag/i],
  ["geschenk", "gift", /geschenk|spende|feier/i],
];
const cgOn = (kind) => CG_KINDS.includes(kind);
const cgId = () => "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
/* Vorschlag aus den vorhandenen Kategorien */
function cgSeed(kind) {
  const out = [],
    by = {};
  for (const c of cats(kind)) {
    if (isWithdrawCat(c)) {
      out.push({ id: "solo-" + c, n: c, ic: "", s: [c], solo: 1 });
      continue;
    }
    const m = CG_SEED.find(([, , re]) => re.test(c));
    if (!m) {
      out.push({ id: "solo-" + c, n: c, ic: "", s: [c], solo: 1 });
      continue;
    }
    if (!by[m[0]]) {
      by[m[0]] = { id: "seed-" + m[0], n: uiText("cg_g_" + m[0]), ic: m[1], s: [] };
      out.push(by[m[0]]);
    }
    by[m[0]].s.push(c);
  }
  return out;
}
/* Gruppen + alle Kategorien genau einmal (neue Kategorien landen als eigene Kachel hinten) */
function cgList(kind) {
  if (!cgOn(kind)) return [];
  const saved = ((store.settings.cgrp || {})[kind] || []).map((g) => ({ ...g, s: [...(g.s || [])] })),
    G = saved.length ? saved : cgSeed(kind),
    all = cats(kind),
    seen = new Set();
  for (const g of G) {
    g.s = g.s.filter((c) => all.includes(c) && !seen.has(c));
    g.s.forEach((c) => seen.add(c));
    if (all.includes(g.n)) seen.add(g.n);
  }
  for (const c of all) if (!seen.has(c)) G.push({ id: "solo-" + c, n: c, ic: "", s: [c], solo: 1 });
  /* leere Einzel-Kacheln weg, leere echte Gruppen bleiben (zum Befüllen) */
  return G.filter((g) => !g.solo || g.s.length);
}
function cgOf(kind, cat) {
  return cgList(kind).find((g) => g.n === cat || g.s.includes(cat)) || null;
}
const cgSubs = (g) => g.s.filter((c) => c !== g.n);
/* Budgets: ein Schlüssel ist eine Kategorie ODER eine Gruppe (dann zählen alle Unterkategorien mit) */
function budCats(k) {
  const g = cgOn("ausgabe") ? cgList("ausgabe").find((x) => x.n === k && !cgSolo(x)) : null;
  return g ? [...new Set([g.n, ...g.s])] : [k];
}
function budValid(k) {
  return cats("ausgabe").includes(k) || budCats(k).length > 1;
}
function budSpent(txs, k) {
  const C = new Set(budCats(k));
  return round2(sum(txs.filter((t) => t.kind === "ausgabe" && C.has(t.cat)), (t) => t.amount));
}
/* Hat diese neue Ausgabe ein Budget (Kategorie oder Gruppe) gerade überschritten? */
function budCrossed(doc) {
  if (!doc || doc.kind !== "ausgabe") return false;
  return budRows(monthCalc(String(doc.date).slice(0, 7)).tx).some((x) => budCats(x.cat).includes(doc.cat) && x.v > x.budget && x.v - doc.amount <= x.budget);
}
/* alle aktiven Budgets mit Verbrauch: [{cat, v, budget}] */
function budRows(txs) {
  return Object.entries(store.settings.budgets || {})
    .filter(([k, b]) => Number(b) > 0 && budValid(k))
    .map(([k, b]) => ({ cat: k, kind: "ausgabe", v: budSpent(txs, k), budget: Number(b) }));
}
const cgSolo = (g) => g.solo || (g.s.length === 1 && g.s[0] === g.n);
function cgIcon(kind, g, size) {
  if (g.ic) {
    const c = catColor(kind, g.s[0] || g.n);
    return `<span class="ictile" style="background:color-mix(in srgb, ${c} 16%, transparent);color:${c}">${svgIcon(g.ic, size || 20)}</span>`;
  }
  return tile(kind, g.s[0] || g.n);
}
/* Gruppen speichern und Kategorie-Reihenfolge danach ausrichten */
function cgSave(kind, G) {
  store.settings.cgrp = { ...(store.settings.cgrp || {}), [kind]: G.filter((g) => !g.solo || g.s.length).map((g) => ({ id: g.id, n: g.n, ic: g.ic || "", s: g.s, ...(g.solo ? { solo: 1 } : {}) })) };
  const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats),
    all = c[kind] || [],
    order = [];
  for (const g of G) {
    if (all.includes(g.n) && !order.includes(g.n)) order.push(g.n);
    for (const s of g.s) if (!order.includes(s)) order.push(s);
  }
  for (const x of all) if (!order.includes(x)) order.push(x);
  c[kind] = order;
  store.settings.cats = c;
  saveSettings();
}
/* Gruppen-Kategorie anlegen, wenn eine Buchung nur der Gruppe zugeordnet wird */
function cgEnsureCat(kind, cat) {
  if (!cgOn(kind) || !cat || cats(kind).includes(cat)) return;
  const G = cgList(kind),
    g = G.find((x) => x.n === cat);
  if (!g) return;
  const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats);
  c[kind] = [...(c[kind] || []), cat];
  store.settings.cats = c;
  cgSave(kind, G);
}
/* Zuletzt benutzte Kategorien */
function cgRecent(kind, n) {
  const out = [];
  for (const t of sortTx(store.tx.filter((x) => x.kind === kind && x.cat)).slice(0, 60)) {
    if (!out.includes(t.cat) && !isWithdrawCat(t.cat)) out.push(t.cat);
    if (out.length >= n) break;
  }
  return out;
}

/* ---------- Buchungs-Fenster: erst Gruppe, dann (optional) Unterkategorie ---------- */
function cgSheetGrid(kind) {
  const E = escHtml,
    G = cgList(kind),
    cur = cgOf(kind, ui.cat);
  const tiles = G.map((g) => {
    const on = cur && cur.id === g.id;
    return `<button class="cat cgt ${on ? "on" : ""}" data-cgg="${E(g.id)}" aria-pressed="${!!on}">${cgIcon(kind, g)}${E(g.n)}</button>`;
  }).join("");
  let subs = "";
  if (cur && !cgSolo(cur)) {
    subs = `<div class="cgsubs" role="group" aria-label="${E(uiText("cg_sub"))}">${cgSubs(cur)
      .map((s) => `<button type="button" class="cgs ${ui.cat === s ? "on" : ""}" data-cgs="${E(s)}" aria-pressed="${ui.cat === s}">${E(s)}</button>`)
      .join("")}<button type="button" class="cgs add" data-cgnew="${E(cur.id)}">${svgIcon("plus", 13)} ${E(uiText("cg_new"))}</button></div><p class="small muted cghint">${E(uiText("cg_opt", { g: cur.n }))}</p>`;
  }
  const rec = ui.editId ? [] : cgRecent(kind, 3).filter((c) => c !== ui.cat);
  const recent = rec.length
    ? `<div class="cgrec"><span>${svgIcon("spark", 14)} ${E(uiText("cg_recent"))}</span>${rec.map((c) => `<button type="button" class="cgs" data-cgs="${E(c)}">${E(c)}</button>`).join("")}</div>`
    : "";
  return { tiles, after: recent + subs };
}
document.addEventListener("click", (e) => {
  const t = e.target.closest && e.target.closest("#catWrap [data-cgg],#catWrap [data-cgs],#catWrap [data-cgnew]");
  if (!t) return;
  const kind = ui.kind;
  if (t.dataset.cgg) {
    const g = cgList(kind).find((x) => x.id === t.dataset.cgg);
    if (!g) return;
    const was = cgOf(kind, ui.cat);
    /* Gruppe gewählt: Einzelkachel = ihre Kategorie, sonst erst einmal die Gruppe selbst */
    if (!was || was.id !== g.id) ui.cat = cgSolo(g) ? g.s[0] : g.n;
  } else if (t.dataset.cgs) {
    const s = t.dataset.cgs,
      g = cgOf(kind, s);
    ui.cat = ui.cat === s && g && !cgSolo(g) ? g.n : s;
  } else if (t.dataset.cgnew) {
    const inp = document.createElement("input");
    inp.className = "in cgin";
    inp.placeholder = uiText("cg_new_ph");
    t.replaceWith(inp);
    inp.focus();
    const gid = t.dataset.cgnew;
    const done = () => {
      const n = inp.value.trim();
      if (n) cgAddSub(kind, gid, n, true);
      renderSheet();
    };
    inp.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        inp.blur();
      }
      if (ev.key === "Escape") {
        inp.value = "";
        inp.blur();
      }
    });
    inp.addEventListener("blur", done, { once: true });
    return;
  }
  if (!ui.kaManual && !ui.editId) ui.acct = kaFor(ui.cat);
  renderSheet();
  try {
    SND.play("tick");
  } catch (_) {}
});
function cgAddSub(kind, gid, n, select) {
  const G = cgList(kind),
    g = G.find((x) => x.id === gid);
  if (!g) return;
  const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats);
  if (!(c[kind] || []).includes(n)) c[kind] = [...(c[kind] || []), n];
  store.settings.cats = c;
  for (const x of G) x.s = x.s.filter((s) => s !== n);
  if (g.solo) {
    /* Einzelkachel wird zur echten Gruppe */
    delete g.solo;
    g.id = cgId();
  }
  g.s.push(n);
  if (select) ui.cat = n;
  cgSave(kind, G);
}

/* ---------- Auswertung: Gruppen mit aufklappbaren Unterkategorien ---------- */
const CG_OPEN = new Set();
/* Ring-Diagramm: Teile einer Gruppe zusammenfassen */
function cgDonut(list) {
  const o = [],
    by = {};
  for (const x of list) {
    const g = x.kind === "ausgabe" ? cgOf("ausgabe", x.cat) : null;
    if (!g || cgSolo(g)) {
      o.push(x);
      continue;
    }
    if (!by[g.id]) o.push((by[g.id] = { kind: "ausgabe", cat: g.n, label: g.n, v: 0 }));
    by[g.id].v += x.v;
  }
  return o.sort((a, b) => b.v - a.v);
}
function cgFlowRows(list, rowHtml, gTot) {
  const kind = "ausgabe",
    G = cgList(kind),
    budgets = store.settings.budgets || {},
    rest = [],
    agg = {};
  for (const x of list) {
    const g = x.kind === kind ? cgOf(kind, x.cat) : null;
    if (!g || cgSolo(g)) {
      rest.push(x);
      continue;
    }
    (agg[g.id] = agg[g.id] || { g, v: 0, items: [] }).v += x.v;
    agg[g.id].items.push(x);
  }
  const groups = G.map((g) => agg[g.id]).filter(Boolean);
  if (!groups.length) return null;
  const all = [...groups.map((a) => ({ t: "g", v: a.v, a })), ...rest.map((x) => ({ t: "x", v: x.v, x }))].sort((p, q) => q.v - p.v || 0);
  const gMax = Math.max(1, ...all.map((r) => r.v));
  return all
    .map((r) => {
      if (r.t === "x") return rowHtml(r.x);
      const { g, v, items } = r.a,
        b = Number(budgets[g.n]) || 0,
        open = CG_OPEN.has(g.id),
        col = catColor(kind, g.s[0] || g.n),
        pill = b > 0 ? `<span class="cgbud ${v > b ? "over" : ""}">${escHtml(v > b ? uiText("cg_bud_over", { a: fmtEur0(v - b) }) : uiText("cg_bud", { b: fmtEur0(b), a: fmtEur0(b - v) }))}</span>` : "";
      return `<details class="cgrow" data-cgopen="${escHtml(g.id)}" ${open ? "open" : ""}><summary class="catrow">${cgIcon(kind, g)}<div class="grow"><div class="top-l"><span>${escHtml(g.n)} ${pill}</span><span>${escHtml(fmtEur(v))}</span></div><div class="sub"><div class="track"><div class="fill" style="width:${Math.max(3, (v / gMax) * 100)}%;background:${col}"></div></div><span class="pct">${Math.round((v / (gTot || 1)) * 100)} %</span></div></div>${svgIcon("chevron", 16)}</summary><div class="cgin2">${items
        .sort((p, q) => q.v - p.v)
        .map((x) => rowHtml(x.cat === g.n ? { ...x, label: uiText("cg_general"), budget: 0 } : x))
        .join("")}</div></details>`;
    })
    .join("");
}
document.addEventListener(
  "toggle",
  (e) => {
    const d = e.target;
    if (!d.dataset || !d.dataset.cgopen) return;
    if (d.open) CG_OPEN.add(d.dataset.cgopen);
    else CG_OPEN.delete(d.dataset.cgopen);
  },
  true
);

/* ---------- Einstellungen: Gruppen und Kategorien per Ziehen sortieren ---------- */
function cgManager(kind, rowExtra) {
  const E = escHtml,
    G = cgList(kind),
    seeded = !((store.settings.cgrp || {})[kind] || []).length;
  const chip = (c) =>
    `<span class="cgchip" data-cgc="${E(c)}"><span class="cghd" data-cgh="c" aria-hidden="true">${svgIcon("dots", 13)}</span><span class="cgcn">${E(c)}</span>${rowExtra ? rowExtra(c) : ""}<button type="button" class="cgx" data-catdel="${kind}|${E(c)}" aria-label="${E(uiText("cg_del", { c }))}">${svgIcon("x", 12)}</button></span>`;
  return `${seeded ? `<div class="cgnote">${mamiAvatar ? mamiAvatar(null) : ""}<span><b>${E(uiText("cg_seed_t"))}</b><small>${E(uiText("cg_seed_p"))}</small></span></div>` : ""}<div class="cgman" data-cgkind="${kind}" data-noswipe>${G.map(
    (g) =>
      `<div class="cgcard ${cgSolo(g) && g.solo ? "solo" : ""}" data-cgid="${E(g.id)}"><div class="cghead"><span class="cghd big" data-cgh="g" role="button" tabindex="0" aria-label="${E(uiText("cg_move", { g: g.n }))}">${svgIcon("dots", 16)}</span>${cgIcon(kind, g, 18)}<b class="cgname" data-cgren="${E(g.id)}" tabindex="0">${E(g.n)}</b>${
        g.solo ? `<small class="muted">${E(uiText("cg_solo"))}</small>` : `<button type="button" class="cgpen" data-cgren="${E(g.id)}" aria-label="${E(uiText("cg_ren"))}">${svgIcon("pen", 14)}</button>`
      }${!g.solo && !g.s.length && !cats(kind).includes(g.n) ? `<button type="button" class="cgx" data-cgdelg="${E(g.id)}" aria-label="${E(uiText("cg_delg"))}">${svgIcon("x", 13)}</button>` : ""}</div><div class="cgchips">${(g.solo ? g.s : cgSubs(g)).map(chip).join("")}${g.solo ? "" : `<button type="button" class="cgadd" data-cgaddsub="${E(g.id)}">${svgIcon("plus", 13)} ${E(uiText("cg_new"))}</button>`}</div></div>`
  ).join("")}<button type="button" class="cgnewg" data-cgaddg="${kind}">${svgIcon("plus", 15)} ${E(uiText("cg_newg"))}</button></div><p class="small muted cghelp">${E(uiText("cg_help"))}</p>`;
}
/* Aus der DOM-Reihenfolge die neuen Gruppen bauen */
function cgFromDom(man) {
  const kind = man.dataset.cgkind,
    old = cgList(kind);
  return [...man.querySelectorAll(":scope > .cgcard")].map((card) => {
    const o = old.find((g) => g.id === card.dataset.cgid) || { id: card.dataset.cgid, n: "", ic: "" },
      subs = [...card.querySelectorAll(".cgchip")].map((c) => c.dataset.cgc);
    if (o.solo) return { ...o, s: subs };
    return { ...o, s: [...(cats(kind).includes(o.n) ? [o.n] : []), ...subs.filter((x) => x !== o.n)] };
  });
}
function cgRerenderMan(man) {
  const kind = man.dataset.cgkind,
    host = man.parentElement;
  if (!host) return;
  host.innerHTML = cgManager(kind, host._cgExtra);
}
document.addEventListener("click", (e) => {
  const t = e.target.closest && e.target.closest("[data-cgaddsub],[data-cgaddg],[data-cgren],[data-cgdelg]");
  if (!t || !t.closest(".cgman")) return;
  const man = t.closest(".cgman"),
    kind = man.dataset.cgkind;
  const ask = (ph, val, done, el) => {
    const inp = document.createElement("input");
    inp.className = "in cgin";
    inp.placeholder = ph;
    inp.value = val || "";
    el.replaceWith(inp);
    inp.focus();
    inp.select();
    inp.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        inp.blur();
      }
      if (ev.key === "Escape") {
        inp.value = val || "";
        inp.blur();
      }
    });
    inp.addEventListener("blur", () => done(inp.value.trim()), { once: true });
  };
  if (t.dataset.cgaddsub)
    ask(
      uiText("cg_new_ph"),
      "",
      (n) => {
        if (n) cgAddSub(kind, t.dataset.cgaddsub, n);
        setTimeout(() => cgRerenderMan(man), 0);
      },
      t
    );
  else if (t.dataset.cgaddg)
    ask(
      uiText("cg_newg_ph"),
      "",
      (n) => {
        if (n) {
          const G = cgList(kind);
          if (!G.some((g) => g.n === n)) {
            G.push({ id: cgId(), n, ic: "tag", s: [] });
            cgSave(kind, G);
          }
        }
        setTimeout(() => cgRerenderMan(man), 0);
      },
      t
    );
  else if (t.dataset.cgren) {
    const G = cgList(kind),
      g = G.find((x) => x.id === t.dataset.cgren);
    if (!g || g.solo) return;
    const nameEl = t.closest(".cghead").querySelector(".cgname");
    ask(
      uiText("cg_newg_ph"),
      g.n,
      async (n) => {
        if (n && n !== g.n && !G.some((x) => x.n === n) && !cats(kind).includes(n)) await cgRename(kind, g, n, G);
        setTimeout(() => cgRerenderMan(man), 0);
      },
      nameEl
    );
  } else if (t.dataset.cgdelg) {
    const G = cgList(kind).filter((g) => g.id !== t.dataset.cgdelg);
    cgSave(kind, G);
    cgRerenderMan(man);
  }
});
/* Gruppe umbenennen – war der Gruppenname schon eine Kategorie, ziehen Buchungen und Budget mit */
async function cgRename(kind, g, n, G) {
  const old = g.n;
  g.n = n;
  if (cats(kind).includes(old)) {
    const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats);
    c[kind] = c[kind].map((x) => (x === old ? n : x));
    store.settings.cats = c;
    g.s = g.s.map((x) => (x === old ? n : x));
    for (const t of store.tx.filter((x) => x.kind === kind && x.cat === old)) {
      const d = plainTx(t);
      d.cat = n;
      await safe(() => saveTxDoc(t.id, d, t));
    }
    for (const f of (store.fixed || []).filter((x) => x.cat === old)) {
      const d = { ...f, cat: n };
      delete d.id;
      await safe(() => saveDoc("fixed", f.id, d));
    }
  }
  /* Budget (auch reines Gruppen-Budget) und Schnell-Knöpfe ziehen mit um */
  const b = store.settings.budgets || {};
  if (b[old] != null) {
    store.settings.budgets = { ...b, [n]: b[old] };
    delete store.settings.budgets[old];
  }
  if ((store.settings.favs || []).some((f) => f.cat === old && (f.kind || "ausgabe") === kind))
    store.settings.favs = store.settings.favs.map((f) => (f.cat === old && (f.kind || "ausgabe") === kind ? { ...f, cat: n, n: f.n === old ? n : f.n } : f));
  cgSave(kind, G);
}

/* Ziehen & Ablegen: Maus sofort (Gruppe am Griff, Kategorie überall), Finger nach kurzem Halten.
   Finger laufen über Touch-Ereignisse – sonst bricht der Browser das Ziehen als Scrollen ab. */
const CGD = { on: false };
function cgCand(target, x, y) {
  const man = target.closest && target.closest(".cgman");
  if (!man || target.closest("button:not([data-cgh]),input")) return null;
  const h = target.closest("[data-cgh]"),
    chipEl = target.closest(".cgchip"),
    el = h && h.dataset.cgh === "g" ? h.closest(".cgcard") : chipEl;
  return el ? { el, man, x, y, type: el.classList.contains("cgcard") ? "g" : "c" } : null;
}
document.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" || e.button > 0) return;
  CGD.cand = cgCand(e.target, e.clientX, e.clientY);
});
document.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse" || !CGD.cand) return;
  if (!CGD.on && Math.hypot(e.clientX - CGD.cand.x, e.clientY - CGD.cand.y) > 5) cgDragStart(e.clientX, e.clientY);
  if (CGD.on) {
    e.preventDefault();
    cgDragMove(e.clientX, e.clientY);
  }
});
document.addEventListener("pointerup", (e) => {
  if (e.pointerType !== "mouse") return;
  if (CGD.on) cgDragEnd();
  CGD.cand = null;
});
document.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    CGD.cand = cgCand(e.target, t.clientX, t.clientY);
    clearTimeout(CGD.hold);
    if (CGD.cand) CGD.hold = setTimeout(() => CGD.cand && cgDragStart(CGD.cand.x, CGD.cand.y), 260);
  },
  { passive: true }
);
document.addEventListener(
  "touchmove",
  (e) => {
    const t = e.touches[0];
    if (CGD.on) {
      e.preventDefault();
      cgDragMove(t.clientX, t.clientY);
    } else if (CGD.cand && Math.hypot(t.clientX - CGD.cand.x, t.clientY - CGD.cand.y) > 10) {
      clearTimeout(CGD.hold);
      CGD.cand = null;
    }
  },
  { passive: false }
);
["touchend", "touchcancel"].forEach((ev) =>
  document.addEventListener(ev, () => {
    clearTimeout(CGD.hold);
    if (CGD.on) cgDragEnd();
    CGD.cand = null;
  })
);
/* langes Drücken soll kein Menü öffnen */
document.addEventListener("contextmenu", (e) => {
  if (e.target.closest && e.target.closest(".cgman .cgchip,.cgman [data-cgh]")) e.preventDefault();
});
/* Tastatur: Griff fokussieren, dann Pfeil hoch/runter */
document.addEventListener("keydown", (e) => {
  const h = e.target.closest && e.target.closest('.cgman [data-cgh="g"]');
  if (!h || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
  e.preventDefault();
  const card = h.closest(".cgcard"),
    man = card.parentElement,
    sib = e.key === "ArrowUp" ? card.previousElementSibling : card.nextElementSibling;
  if (!sib || !sib.classList.contains("cgcard")) return;
  const cards = [...man.querySelectorAll(":scope > .cgcard")];
  cgFlip(cards, () => (e.key === "ArrowUp" ? man.insertBefore(card, sib) : man.insertBefore(sib, card)));
  cgSave(man.dataset.cgkind, cgFromDom(man));
  h.focus();
});
function cgDragStart(x, y) {
  const c = CGD.cand;
  if (!c || !c.el.isConnected) return;
  const r = c.el.getBoundingClientRect(),
    gh = c.el.cloneNode(true);
  gh.classList.add("cgghost");
  Object.assign(gh.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  document.body.appendChild(gh);
  c.el.classList.add("cgph");
  Object.assign(CGD, { on: true, gh, dx: x - r.left, dy: y - r.top, el: c.el, man: c.man, type: c.type });
  document.body.classList.add("cgdragging");
  try {
    navigator.vibrate && navigator.vibrate(10);
    SND.play("tick");
  } catch (_) {}
}
function cgFlip(nodes, fn) {
  const before = new Map(nodes.map((n) => [n, n.getBoundingClientRect()]));
  fn();
  if (reducedMotion()) return;
  for (const n of nodes) {
    const a = before.get(n),
      b = n.getBoundingClientRect();
    const dx = a.left - b.left,
      dy = a.top - b.top;
    if (Math.abs(dx) + Math.abs(dy) > 1) n.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 200, easing: "cubic-bezier(.2,.8,.2,1)" });
  }
}
function cgDragMove(x, y) {
  const { gh, dx, dy, el, man, type } = CGD;
  gh.style.left = x - dx + "px";
  gh.style.top = y - dy + "px";
  /* am Rand des Fensters mitscrollen */
  const sc = man.closest(".hobody,.content,main") || document.scrollingElement;
  if (y < 70) sc.scrollBy(0, -8);
  else if (y > innerHeight - 70) sc.scrollBy(0, 8);
  if (type === "g") {
    const cards = [...man.querySelectorAll(":scope > .cgcard")].filter((n) => n !== el);
    let before = null;
    for (const n of cards) {
      const r = n.getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        before = n;
        break;
      }
    }
    const ref = before || man.querySelector(":scope > .cgnewg");
    if (el.nextElementSibling !== ref) cgFlip(cards, () => man.insertBefore(el, ref));
  } else {
    gh.style.visibility = "hidden";
    const under = document.elementFromPoint(x, y);
    gh.style.visibility = "";
    const card = under && under.closest(".cgcard:not(.solo)");
    if (!card || !man.contains(card)) return;
    const box = card.querySelector(".cgchips"),
      chips = [...box.querySelectorAll(".cgchip")].filter((n) => n !== el);
    let before = null;
    for (const n of chips) {
      const r = n.getBoundingClientRect();
      if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) {
        before = n;
        break;
      }
    }
    const ref = before || box.querySelector(".cgadd");
    if (el.parentElement !== box || el.nextElementSibling !== ref) cgFlip([...man.querySelectorAll(".cgchip")].filter((n) => n !== el), () => box.insertBefore(el, ref));
  }
}
function cgDragEnd() {
  const { gh, el, man } = CGD;
  const r = el.getBoundingClientRect();
  const fin = () => {
    gh.remove();
    el.classList.remove("cgph");
  };
  if (reducedMotion()) fin();
  else gh.animate([{ left: gh.style.left, top: gh.style.top }, { left: r.left + "px", top: r.top + "px" }], { duration: 160, easing: "ease-out" }).finished.then(fin, fin);
  CGD.on = false;
  document.body.classList.remove("cgdragging");
  const kind = man.dataset.cgkind,
    G = cgFromDom(man);
  cgSave(kind, G);
  try {
    SND.play("save");
  } catch (_) {}
}

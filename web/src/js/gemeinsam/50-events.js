/* Events */
document.addEventListener("click", async (e) => {
  const t = e.target;
  const add = t.closest("[data-add]");
  if (add) {
    openSheet(add.dataset.add);
    return;
  }
  const lm = t.closest("[data-lmode]");
  if (lm) {
    ui.listMode = lm.dataset.lmode;
    ui.calDay = null;
    renderList();
    return;
  }
  const cd = t.closest("[data-calday]");
  if (cd) {
    ui.calDay = ui.calDay === cd.dataset.calday ? null : cd.dataset.calday;
    renderList();
    return;
  }
  if (t.closest("[data-scanquick]")) {
    openSheet("ausgabe");
    setTimeout(() => runScan("camera"), 250);
    return;
  }
  const go = t.closest("[data-go]");
  if (go && go.dataset.go === "gemeinsam") {
    const sl = t.closest("[data-gmsel]");
    if (sl) {
      ui.gmSel = sl.dataset.gmsel;
      ui.gmStep = "";
    }
    gmSheetOpen();
    return;
  }
  if (go) {
    ui.view = go.dataset.go;
    if (ui.view === "more") {
      const tg = go.dataset.scroll && $(go.dataset.scroll);
      ui.sp = go.dataset.sp || (tg && tg.closest("[data-sp]") ? tg.closest("[data-sp]").dataset.sp : null);
    }
    render();
    window.scrollTo({
      top: 0,
    });
    return;
  }
  const open = t.closest("[data-open]");
  if (open) {
    ui.ym = open.dataset.open;
    ui.view = "home";
    render();
    window.scrollTo({
      top: 0,
    });
    return;
  }
  const ed = t.closest("[data-edit]");
  if (ed) {
    const tx = store.tx.find((x) => x.id === ed.dataset.edit);
    if (tx) openSheet(null, tx);
    return;
  }
  const kb = t.closest("#kindSeg button");
  if (kb) {
    ui.kind = kb.dataset.kind;
    ui.cat = null;
    renderSheet();
    try {
      motSheet();
    } catch (_) {}
    return;
  }
  const cb = t.closest("#catGrid [data-cat]");
  if (cb) {
    ui.cat = cb.dataset.cat;
    if (!ui.kaManual && !ui.editId) ui.acct = kaFor(ui.cat);
    renderSheet();
    return;
  }
  const dc = t.closest("#dateChips .dchip");
  if (dc) {
    $("fDate").value = isoDaysAgo(Number(dc.dataset.day));
    renderSheet();
    return;
  }
  const fl = t.closest("[data-filter]");
  if (fl) {
    ui.filter = fl.dataset.filter;
    renderList();
    return;
  }
  const fr = t.closest("[data-fxreset]");
  if (fr) {
    const f = store.fixed.find((x) => x.id === fr.dataset.fxreset);
    if (f) await setMonthAmount(f.id, listAmt(f, ui.ym));
    return;
  }
  const fa = t.closest("[data-fxamt]");
  if (fa) {
    ui.amtEdit = fa.dataset.fxamt;
    renderFix();
    const el = $("fxAmtIn");
    if (el) {
      el.focus();
      el.select();
    }
    return;
  }
  const mc = t.closest("[data-fxmon]");
  if (mc) {
    await toggleFixMonth(...mc.dataset.fxmon.split("|"));
    return;
  }
  const pq = t.closest("[data-planq]");
  if (pq) {
    const q = pq.dataset.planq,
      el = pq.parentElement;
    ui.planQ = ui.planQ || {};
    ui.planQ[q] = !el.classList.contains("open");
    renderYear();
    return;
  }
  const fg = t.closest("[data-fxgroup]");
  if (fg) {
    const a = fg.dataset.fxgroup;
    ui.fxOpen = ui.fxOpen || {};
    ui.fxOpen[a] = fg.getAttribute("aria-expanded") !== "true";
    renderFix();
    return;
  }
  if (t.closest("#fxAmtIn")) return;
  const pay = t.closest("[data-pay]");
  if (pay) {
    await togglePaid(pay.dataset.pay);
    return;
  }
  if (t.closest("#payAll")) {
    await payAll();
    return;
  }
  if (t.closest("#fixShowAll")) {
    ui.fixShowAll = !ui.fixShowAll;
    renderFix();
    return;
  }
  if (t.closest("#fixEditBtn")) {
    ui.fixEdit = true;
    renderFix();
    return;
  }
  if (t.closest("#fixDone")) {
    ui.fixEdit = false;
    renderFix();
    return;
  }
  if (t.closest("#fixAdd")) {
    fxNewOpen("fix");
    return;
  }
  const fxd = t.closest("[data-fxdel]");
  if (fxd) {
    const f = store.fixed.find((x) => x.id === fxd.dataset.fxdel);
    const prev = f ? (({ id: _, ...r }) => r)(f) : null;
    if (await safe(() => deleteDoc("fixed", fxd.dataset.fxdel)))
      toast("Gelöscht", prev ? () => safe(() => saveDoc("fixed", f.id, prev)) : null);
    return;
  }
  if (t.closest("#debtEditBtn")) {
    ui.debtEdit = true;
    renderMore();
    return;
  }
  if (t.closest("#debtDone")) {
    ui.debtEdit = false;
    renderMore();
    return;
  }
  const dx = t.closest("[data-dexadd]");
  if (dx) {
    ui.extraAdd = dx.dataset.dexadd;
    renderMore();
    const a = $("dxa-" + ui.extraAdd);
    if (a) a.focus();
    return;
  }
  if (t.closest("[data-dexcancel]")) {
    ui.extraAdd = null;
    renderMore();
    return;
  }
  const dxs = t.closest("[data-dexsave]");
  if (dxs) {
    const id = dxs.dataset.dexsave,
      o = store.debts.find((x) => x.id === id);
    if (!o) return;
    const v = parseAmt(($("dxa-" + id) || {}).value || ""),
      dt = ($("dxd-" + id) || {}).value || isoOf(new Date());
    if (!(v > 0)) {
      toast("Bitte einen Betrag eingeben");
      return;
    }
    const d = {
      ...o,
    };
    delete d.id;
    d.extra = [
      ...debtExtras(o),
      {
        d: dt,
        a: round2(v),
      },
    ].sort((a, b) => String(a.d).localeCompare(String(b.d)));
    ui.extraAdd = null;
    if (await safe(() => saveDoc("debts", id, d))) toast(`Sondertilgung ${fmtEur(v)} eingetragen`);
    return;
  }
  const dxd = t.closest("[data-dexdel]");
  if (dxd) {
    const [id, i] = dxd.dataset.dexdel.split("|"),
      o = store.debts.find((x) => x.id === id);
    if (!o) return;
    const d = {
      ...o,
    };
    delete d.id;
    const prev = clone(d);
    d.extra = debtExtras(o).filter((_, j) => j !== Number(i));
    if (await safe(() => saveDoc("debts", id, d))) toast("Gelöscht", () => safe(() => saveDoc("debts", id, prev)));
    return;
  }
  const pl = t.closest("[data-dplanload]");
  if (pl) {
    ui.planFor = pl.dataset.dplanload;
    $("planFile").click();
    return;
  }
  if (t.closest("[data-prall]")) {
    ui.planAll = !ui.planAll;
    renderMore();
    return;
  }
  const pe = t.closest("[data-dplanedit]");
  if (pe) {
    ui.planEdit = ui.planEdit === pe.dataset.dplanedit ? null : pe.dataset.dplanedit;
    renderMore();
    return;
  }
  const pm = t.closest("[data-dplanmake]");
  if (pm) {
    const id = pm.dataset.dplanmake,
      o = store.debts.find((x) => x.id === id);
    if (!o) return;
    let plan = makePlan(o);
    if (!plan.length)
      plan = [
        {
          ym: o.since || ymOf(new Date()),
          rate: null,
          zins: null,
          tilg: null,
          rest: Number(o.start) || null,
        },
      ];
    const d = {
      ...o,
    };
    delete d.id;
    d.plan = plan;
    ui.planEdit = id;
    if (await safe(() => saveDoc("debts", id, d)))
      toast(
        plan.length > 1
          ? `Plan mit ${plan.length} Raten vorgerechnet – jetzt nach Bedarf anpassen`
          : "Trag die Raten aus deinem Vertrag ein"
      );
    return;
  }
  const pdl = t.closest("[data-dplandel]");
  if (pdl) {
    const id = pdl.dataset.dplandel,
      o = store.debts.find((x) => x.id === id);
    if (!o) return;
    const d = {
      ...o,
    };
    delete d.id;
    const prev = clone(d);
    delete d.plan;
    ui.planEdit = null;
    if (await safe(() => saveDoc("debts", id, d))) toast("Plan gelöscht", () => safe(() => saveDoc("debts", id, prev)));
    return;
  }
  const pa = t.closest("[data-pradd]");
  if (pa) {
    const id = pa.dataset.pradd,
      o = store.debts.find((x) => x.id === id);
    if (!o) return;
    const plan = debtPlan(o),
      last = plan[plan.length - 1];
    const z = (Number(o.zins) || 0) / 100 / 12;
    const row = last
      ? (() => {
          const rate = last.rate || 0,
            zi = round2((Number(last.rest) || 0) * z),
            tilg = round2(Math.min(rate - zi, Number(last.rest) || 0));
          return {
            ym: shiftYm(last.ym, 1),
            rate,
            zins: zi,
            tilg,
            rest: round2(Math.max(0, (Number(last.rest) || 0) - tilg)),
          };
        })()
      : {
          ym: ymOf(new Date()),
          rate: null,
          zins: null,
          tilg: null,
          rest: null,
        };
    const d = {
      ...o,
    };
    delete d.id;
    d.plan = [...plan, row];
    await safe(() => saveDoc("debts", id, d));
    return;
  }
  const prd = t.closest("[data-prdel]");
  if (prd) {
    const id = prd.closest("[data-did]").dataset.did,
      o = store.debts.find((x) => x.id === id);
    if (!o) return;
    const d = {
      ...o,
    };
    delete d.id;
    d.plan = debtPlan(o).filter((_, j) => j !== Number(prd.dataset.prdel));
    if (!d.plan.length) delete d.plan;
    await safe(() => saveDoc("debts", id, d));
    return;
  }
  if (t.closest("#debtAdd")) {
    await safe(() =>
      saveDoc("debts", newId(), {
        name: "Neuer Kredit",
        art: "kredit",
        start: 0,
        since: ymOf(new Date()),
        fixedId: "",
      })
    );
    return;
  }
  const dd = t.closest("[data-ddel]");
  if (dd) {
    const d = store.debts.find((x) => x.id === dd.dataset.ddel);
    const prev = d ? (({ id: _, ...r }) => r)(d) : null;
    if (await safe(() => deleteDoc("debts", dd.dataset.ddel)))
      toast("Gelöscht", prev ? () => safe(() => saveDoc("debts", d.id, prev)) : null);
    return;
  }
  const cdel = t.closest("[data-catdel]");
  if (cdel) {
    const [k, n] = cdel.dataset.catdel.split("|");
    const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats);
    c[k] = c[k].filter((x) => (typeof x === "string" ? x : x.name) !== n);
    store.settings.cats = c;
    render();
    saveSettings();
    return;
  }
  const cadd = t.closest("[data-catadd]");
  if (cadd) {
    const k = cadd.dataset.catadd;
    const inp = document.createElement("input");
    inp.className = "in";
    inp.style.width = "190px";
    inp.id = "newcat-" + k;
    inp.placeholder = "Name, dann Enter";
    cadd.replaceWith(inp);
    inp.focus();
    const commit = () => {
      const n = inp.value.trim();
      if (n) {
        const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats);
        const names = c[k].map((x) => (typeof x === "string" ? x : x.name));
        if (!names.includes(n))
          c[k].push(
            k === "einnahme"
              ? {
                  name: n,
                  art: "sonstige",
                }
              : n
          );
        store.settings.cats = c;
        saveSettings();
      }
      setTimeout(renderMore, 0); /* nicht während eines anderen Neuzeichnens (Blur beim Entfernen) */
    };
    inp.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") inp.blur();
      if (ev.key === "Escape") {
        inp.value = "";
        inp.blur();
      }
    });
    inp.addEventListener("blur", commit, {
      once: true,
    });
    return;
  }
});
$("settingsBtn").onclick = () => {
  ui.view = ui.view === "more" ? "home" : "more";
  ui.sp = null;
  render();
  window.scrollTo({
    top: 0,
  });
};
$("prevM").onclick = () => {
  ui.ym = shiftYm(ui.ym, -1);
  render();
};
$("nextM").onclick = () => {
  ui.ym = shiftYm(ui.ym, 1);
  render();
};
$("q").addEventListener("input", (e) => {
  ui.q = e.target.value;
  renderList();
});
$("sheetClose").onclick = closeSheet;
$("sheetImport").onclick = () => {
  $("csvFile").click();
  closeSheet();
};

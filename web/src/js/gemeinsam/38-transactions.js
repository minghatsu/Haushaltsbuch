function renderPay() {
  try {
    kaRender();
  } catch (_) {}
  const el = $("paySeg");
  if (!el) return;
  const show =
    ["ausgabe", "einnahme", "betrieb"].includes(ui.kind) && !(ui.kind === "ausgabe" && isWithdrawCat(ui.cat));
  el.hidden = !show;
  if (!show) return;
  el.querySelectorAll("[data-pay]").forEach((b) => {
    b.classList.toggle("on", b.dataset.pay === ui.pay);
    b.setAttribute("aria-pressed", String(b.dataset.pay === ui.pay));
  });
  const k = el.querySelector('[data-pay="karte"] span');
  if (k) k.textContent = ui.kind === "einnahme" ? "Konto" : "Karte";
  const ki = el.querySelector('[data-pay="karte"] i');
  if (ki) ki.textContent = ui.kind === "einnahme" ? "🏦" : "💳";
}
function rebuildTx() {
  DREV++;
  const out = store.txSingle.slice();
  for (const [b, items] of Object.entries(store.txb))
    for (const [id, d] of Object.entries(items || {}))
      out.push({
        ...d,
        id,
        _b: b,
      });
  for (const t of out)
    if (t.um && t.kind !== "umbuchung") {
      t._k0 = t.kind;
      t.kind = "umbuchung";
    }
  markWithdrawals(out);
  store.tx = out;
  clearTimeout(rebuildTx.lt);
  rebuildTx.lt = setTimeout(() => {
    if (typeof loanCheck === "function") loanCheck();
    if (typeof recurCheck === "function" && !ui.recur && !ui.loan) setTimeout(recurCheck, 4000);
  }, 2500);
}
function plainTx(t) {
  const r = {
    ...t,
  };
  delete r.id;
  delete r._b;
  if (r.kind === "abhebung") r.kind = "ausgabe";
  if (r.kind === "umbuchung") r.kind = r._k0 || "ausgabe";
  delete r._k0;
  return r;
}
async function saveTxDoc(id, doc, old) {
  if (old && old._b) {
    const b = old._b,
      nb = doc.date.slice(0, 7);
    const items = clone(store.txb[b] || {});
    if (b.slice(0, 7) === nb) {
      items[id] = doc;
      await saveDoc("txb", b, {
        items,
      });
      return;
    }
    delete items[id];
    await saveDoc("txb", b, {
      items,
    });
    const it2 = clone(store.txb[nb] || {});
    it2[id] = doc;
    await saveDoc("txb", nb, {
      items: it2,
    });
    return;
  }
  await saveDoc("tx", id, doc);
}
async function delTxDoc(t) {
  if (t && t._b) {
    const items = clone(store.txb[t._b] || {});
    delete items[t.id];
    await saveDoc("txb", t._b, {
      items,
    });
  } else if (t) await deleteDoc("tx", t.id);
}
async function restoreTx(t) {
  if (t._b) {
    const items = clone(store.txb[t._b] || {});
    items[t.id] = plainTx(t);
    await saveDoc("txb", t._b, {
      items,
    });
  } else await saveDoc("tx", t.id, plainTx(t));
}
async function saveTx() {
  let amount = parseAmt($("fAmount").value);
  if (!(amount > 0)) {
    toast("Bitte einen Betrag eingeben");
    $("fAmount").focus();
    return;
  }
  const date = $("fDate").value || isoToday();
  let note = $("fNote").value.trim();
  const fcur = $("fCur").value;
  if (fcur && fcur !== "EUR" && !ui.editId) {
    const x = fxConv(amount, fcur, "EUR");
    if (x != null) {
      note = (note ? note + " · " : "") + fxFmt(amount, fcur);
      amount = x;
    }
  }
  const payable =
    ["ausgabe", "einnahme", "betrieb"].includes(ui.kind) && !(ui.kind === "ausgabe" && isWithdrawCat(ui.cat));
  if (payable && !ui.pay) {
    toast(ui.kind === "einnahme" ? "Aufs Konto oder bar?" : "Mit Karte oder bar bezahlt?");
    const ps = $("paySeg");
    if (ps) {
      ps.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      ps.classList.remove("need");
      void ps.offsetWidth;
      ps.classList.add("need");
    }
    return;
  }
  const doc = {
    date,
    amount: round2(amount),
    kind: ui.kind,
    cat: ui.kind === "vorauszahlung" ? "Steuer-Vorauszahlung" : ui.cat || "",
    note,
    ts: Date.now(),
  };
  if (ui.kind === "anlage") {
    const g = ((store.settings.inv && store.settings.inv.goals) || []).find((x) => x.name === ui.cat);
    doc.kind = "ausgabe";
    doc.cat = INV_CAT;
    doc.inv = g ? g.id : true;
    if (g && !note) doc.note = g.name;
  }
  if (payable && ui.pay === "bar") doc.pay = "bar";
  if (payable && ui.pay !== "bar" && kaOn() && ui.acct) {
    if (ui.acct !== "Hauptkonto") doc.acct = ui.acct;
    if (ui.cat) {
      store.settings.acctByCat = {
        ...(store.settings.acctByCat || {}),
        [ui.cat]: ui.acct,
      };
      try {
        saveSettings();
      } catch (_) {}
    }
  }
  if (doc.pay === "bar" && !cashOn()) await cashActivate(date < isoToday() ? date : isoToday(), null);
  const editing = ui.editId,
    id = editing || (mem ? newId() : db.collection("tx").doc().id);
  const old = editing ? store.tx.find((t) => t.id === id) : null;
  if (old) {
    if (old.ts) doc.ts = old.ts;
    if (old.importKey) doc.importKey = old.importKey;
    if (old.source) doc.source = old.source;
    if (old.um) doc.um = old.um;
    if (old.items) doc.items = old.items;
    if (old.ishop) doc.ishop = old.ishop;
    if (old.afa && old.kind === doc.kind) doc.afa = old.afa;
  }
  if (ui.scanItems && ui.scanItems.cleared) {
    delete doc.items;
    delete doc.ishop;
  } else if (ui.scanItems && ui.scanItems.items) {
    doc.items = ui.scanItems.items;
    if (ui.scanItems.shop) doc.ishop = ui.scanItems.shop;
  }
  if (doc.kind === "ausgabe" && hasJob() && $("fWk").checked) doc.wk = true;
  if (doc.kind === "einnahme" && incArt(doc.cat) === "selbst" && !store.settings.kleinunternehmer) {
    if (old && old.net != null && Math.abs(old.amount - doc.amount) < 0.005 && old.cat === doc.cat) doc.net = old.net;
    else if (!old || old.net != null) doc.net = round2(doc.amount / (1 + (Number(store.settings.vatRate) || 0) / 100));
  }
  try {
    cgEnsureCat(doc.kind, doc.cat);
  } catch (_) {}
  const btn = $("saveBtn");
  btn.disabled = true;
  const ok = await safe(() => saveTxDoc(id, doc, old));
  btn.disabled = false;
  if (!ok) return;
  await rcptSaveFor(id);
  erAfterSave(id);
  closeSheet();
  if (date.slice(0, 7) !== ui.ym) {
    ui.ym = date.slice(0, 7);
    render();
  }
  {
    let k = !editing && doc.kind === "einnahme" ? "income" : "save";
    try {
      /* Budget der Kategorie oder ihrer Gruppe gerade überschritten? */
      if (!editing && budCrossed({ ...doc, date })) k = "warn";
    } catch (_) {}
    SND.play(k);
  }
  if (editing) {
    toast(
      "Geändert",
      old
        ? () =>
            safe(() =>
              saveTxDoc(
                id,
                plainTx(old),
                store.tx.find((t) => t.id === id)
              )
            )
        : null
    );
  } else
    toast(
      `${fmtEur(doc.amount)} gespeichert${doc.pay === "bar" ? " · Bargeld" : doc.acct ? " · " + doc.acct : ""}`,
      () => safe(() => delTxDoc(store.tx.find((t) => t.id === id)))
    );
  if (!editing)
    try {
      srAfterSave(doc);
    } catch (_) {}
  if (!editing) motAdd(`[data-edit="${id}"]`, "add");
  if (afaBig(doc) && !doc.afa && (!old || !afaBig(old))) setTimeout(() => afaAsk(id), 450);
}
async function deleteTx() {
  const id = ui.editId;
  if (!id) return;
  const btn = $("delBtn");
  if (btn.dataset.armed !== "1") {
    btn.dataset.armed = "1";
    btn.textContent = "Wirklich löschen?";
    setTimeout(() => {
      btn.dataset.armed = "";
      btn.textContent = "Löschen";
    }, 3000);
    return;
  }
  btn.dataset.armed = "";
  const old = store.tx.find((t) => t.id === id);
  if (!old) return;
  const img = hasReceipt(id) ? await rcptGet(id) : null;
  if (await safe(() => delTxDoc(old))) {
    if (img) await rcptDel(id);
    closeSheet();
    toast("Gelöscht", async () => {
      await safe(() => restoreTx(old));
      if (img) await rcptPut(id, img);
      render();
    });
  }
}

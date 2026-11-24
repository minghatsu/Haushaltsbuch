/* Belegfotos */
const RCPT = {
  db: null,
  ids: new Set(),
  v: {},
};
function rcptDb() {
  if (!RCPT.db)
    RCPT.db = new Promise((ok, bad) => {
      try {
        const r = indexedDB.open("haushaltsbuch-belege", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("r");
        r.onsuccess = () => ok(r.result);
        r.onerror = () => bad(r.error);
      } catch (e) {
        bad(e);
      }
    });
  return RCPT.db;
}
async function rcptOp(mode, fn) {
  const d = await rcptDb();
  return new Promise((ok, bad) => {
    const tx = d.transaction("r", mode);
    const req = fn(tx.objectStore("r"));
    tx.oncomplete = () => ok(req ? req.result : undefined);
    tx.onerror = () => bad(tx.error);
    tx.onabort = () => bad(tx.error);
  });
}
const rcptSeal = (img) => {
  if (!SEAL_ON || !img)
    return {
      img,
    };
  const e = window.AndroidBridge.seal(String(img));
  return e && e.slice(0, 3) === "v1:"
    ? {
        img: e,
        s: 1,
      }
    : {
        img,
      };
};
const rcptOpen = (v) => {
  if (!v || !v.img) return null;
  if (!v.s) return v.img;
  const r = window.AndroidBridge && window.AndroidBridge.unseal ? window.AndroidBridge.unseal(v.img) : "\u0000fail";
  return r === "\u0000fail" ? null : r;
};
async function rcptGet(id) {
  try {
    return rcptOpen(await rcptOp("readonly", (st) => st.get(id)));
  } catch (e) {
    return null;
  }
}
async function rcptPut(id, img, fromSync) {
  await rcptOp("readwrite", (st) =>
    st.put(
      {
        ...rcptSeal(img),
        ts: Date.now(),
      },
      id
    )
  );
  RCPT.ids.add(id);
  RCPT.v[id] = (RCPT.v[id] || 0) + 1;
  if (!fromSync) rqAdd(id);
}
async function rcptSealOld() {
  if (!SEAL_ON) return;
  for (const id of [...RCPT.ids]) {
    try {
      const v = await rcptOp("readonly", (st) => st.get(id));
      if (!v || v.s || !v.img) continue;
      await rcptOp("readwrite", (st) =>
        st.put(
          {
            ...rcptSeal(v.img),
            ts: v.ts || Date.now(),
          },
          id
        )
      );
      await new Promise((r) => setTimeout(r, 30));
    } catch (e) {}
  }
}
async function rcptDel(id, fromSync) {
  await rcptOp("readwrite", (st) => st.delete(id));
  const had = RCPT.ids.delete(id);
  RCPT.v[id] = (RCPT.v[id] || 0) + 1;
  if (!fromSync && had) rqAdd(id);
}
function hasReceipt(id) {
  return RCPT.ids.has(id);
}
rcptOp("readonly", (st) => st.getAllKeys())
  .then((k) => {
    (k || []).forEach((x) => RCPT.ids.add(x));
    if ((k || []).length) {
      render();
      setTimeout(rcptSealOld, 4000);
    }
  })
  .catch(() => {});
async function shrinkImage(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)),
    c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.72);
}
ui.rcpt = {
  state: "none",
  img: null,
};
async function rcptSheetInit() {
  const id = ui.editId;
  ui.rcpt = {
    state: "none",
    img: null,
  };
  if (id && hasReceipt(id)) {
    ui.rcpt.state = "stored";
    renderRcptRow();
    const img = await rcptGet(id);
    if (ui.editId === id && ui.rcpt.state === "stored") {
      ui.rcpt.img = img;
      renderRcptRow();
      zBonFromStored(id, img);
    }
  } else renderRcptRow();
}
document.addEventListener("click", async (e) => {
  if (!e.target.closest("#rcptNone")) return;
  const t = ui.editId && store.tx.find((x) => x.id === ui.editId);
  if (!t) return;
  const d = plainTx(t);
  delete d.nobon;
  if (await safe(() => saveTxDoc(t.id, d, t))) {
    toast("Ohne Bon gespeichert");
    $("rcptNone").hidden = true;
  }
});
function renderRcptRow() {
  const r = ui.rcpt,
    has = r.state === "stored" || r.state === "new";
  $("rcptRow").hidden = !has && !ui.editId;
  $("rcptHave").hidden = !has;
  $("rcptAddWrap").hidden = has;
  $("rcptGallery").hidden = !NATIVE_SCAN;
  {
    const ct = ui.editId && store.tx.find((t) => t.id === ui.editId);
    $("rcptNone").hidden = !(ct && ct.nobon && !has);
  }
  $("rcptShare").hidden = !(has && r.img && rcptCanShare());
  $("rcptShare").textContent =
    window.AndroidBridge && !window.AndroidBridge.shareImage && window.AndroidBridge.saveFileB64
      ? "Speichern"
      : "Teilen";
  if (has) {
    $("rcptThumb").src = r.img || "";
    $("rcptInfo").textContent = r.state === "new" ? "wird mit der Buchung gespeichert" : "gespeichert";
  }
  try {
    zBonRender();
  } catch (e) {}
}
/* der Kassenzettel in der Buchung */
const ZB_TRIED = new Set();
function ocrScore(L) {
  try {
    const its = receiptItems(L || []);
    if (!its.length) return 0;
    let tot = null;
    try {
      tot = parseReceipt(L).amount;
    } catch (_) {}
    const sm = its.reduce((a, i) => a + i.p, 0);
    return (tot != null && Math.abs(sm - tot) < 0.02 ? 1000 : 0) + its.length;
  } catch (e) {
    return 0;
  }
}
function ocrPick(cands) {
  let best = null,
    bs = -1;
  for (const L of cands) {
    if (!L || !L.length) continue;
    const sc = ocrScore(L);
    if (sc > bs) {
      bs = sc;
      best = L;
    }
  }
  return best || [];
}
async function ocrUpscale(img, f) {
  const im = await loadImg(img),
    k = Math.min(f, 4000 / Math.max(im.naturalWidth, im.naturalHeight));
  if (k <= 1.05) return null;
  const c = document.createElement("canvas");
  c.width = Math.round(im.naturalWidth * k);
  c.height = Math.round(im.naturalHeight * k);
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.9);
}
async function ocrBest(img, first) {
  const ocr = (u) => (canNativeOcr() ? ocrDataUrl(u) : scanImageFile(u));
  let err = null,
    tries = 0;
  const c = [first || null];
  if (!first || ocrScore(first) < 1000) {
    tries++;
    try {
      c.push(await ocr(img));
    } catch (e) {
      err = e;
    }
  }
  if (!err && ocrScore(ocrPick(c)) < 1000) {
    for (const f of [2, 3]) {
      try {
        const up = await ocrUpscale(img, f);
        if (!up) break;
        tries++;
        const L = await ocr(up);
        c.push(L);
        if (ocrScore(L) >= 1000) break;
      } catch (e) {
        err = e;
        break;
      }
    }
  }
  try {
    const im = await loadImg(img);
    window.HB_OCRINFO = {
      w: im.naturalWidth,
      h: im.naturalHeight,
      tries,
      err: err ? String(err.message || err) : "",
      native: canNativeOcr(),
    };
  } catch (_) {}
  const best = ocrPick(c);
  if (!best.length && err) throw err;
  return best;
}
async function zBonFromStored(id, img) {
  const t = store.tx.find((x) => x.id === id);
  if (!t || !img || (t.items && t.items.length) || t.kind !== "ausgabe" || ZB_TRIED.has(id)) return;
  ZB_TRIED.add(id);
  const v0 = RCPT.v[id] || 0;
  try {
    scanWorking(true);
    const L = await ocrBest(img);
    window.HB_OCR = L;
    scanWorking(false);
    try {
      scanBusy(false);
    } catch (_) {}
    const its = receiptItems(L || []);
    if (!its.length) {
      if (ui.editId === id) toast("Auf dem gespeicherten Bon wurden keine Artikel erkannt", null, null, 4000);
      return;
    }
    const t2 = store.tx.find((x) => x.id === id);
    if (
      !t2 ||
      (RCPT.v[id] || 0) !== v0 ||
      (t2.items && t2.items.length) ||
      (ui.editId === id && (ui.scanItems || ui.rcpt.state !== "stored"))
    )
      return;
    const doc = {
        ...plainTx(t2),
        items: its.map((i) => ({
          r: i.n,
          p: i.p,
        })),
      },
      sid = zaShopId(parseReceipt(L).shop || t2.note);
    if (sid) doc.ishop = sid;
    await saveTxDoc(id, doc, t2);
    if (ui.editId === id && !ui.scanItems) {
      ui.zbOpen = true;
      zBonRender();
    }
    toast(`${its.length} Artikel aus dem gespeicherten Bon gelesen`, null, null, 4000);
  } catch (e) {
    scanWorking(false);
    try {
      scanBusy(false);
    } catch (_) {}
  }
}
async function zBonBackfill() {
  if (BG_RUN || zBonBackfill.on) return;
  zBonBackfill.on = true;
  let done = {};
  try {
    done = JSON.parse(localStorage.getItem("hb-zbtried") || "{}");
  } catch (_) {}
  const isum = (t) => (t.items || []).reduce((a, i) => a + (Number(i.p) || 0), 0),
    bad = (t) => t.items && t.items.length && Math.abs(isum(t) - t.amount) > Math.max(0.05, t.amount * 0.03);
  const todo = store.tx
    .filter(
      (t) =>
        t.kind === "ausgabe" &&
        hasReceipt(t.id) &&
        (!(t.items && t.items.length) ? !done[t.id] : bad(t) && !done[t.id + "~2"]) &&
        !ZB_TRIED.has(t.id)
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40);
  let n = 0;
  for (const t of todo) {
    if (document.hidden) await new Promise((r) => setTimeout(r, 5000));
    ZB_TRIED.add(t.id);
    done[t.items && t.items.length ? t.id + "~2" : t.id] = 1;
    try {
      localStorage.setItem("hb-zbtried", JSON.stringify(done));
    } catch (_) {}
    try {
      const v0 = RCPT.v[t.id] || 0,
        img = await rcptGet(t.id);
      if (!img) continue;
      const L = canNativeOcr()
        ? await ocrBest(img)
        : await (async () => {
            await loadTesseract();
            const r = await window.Tesseract.recognize(img, "deu");
            return ((r.data && r.data.lines) || [])
              .map((l) => ({
                t: l.text.trim(),
                x: l.bbox.x0,
                y: l.bbox.y0,
                w: l.bbox.x1 - l.bbox.x0,
                h: l.bbox.y1 - l.bbox.y0,
              }))
              .filter((l) => l.t);
          })();
      const its = receiptItems(L || []);
      if (!its.length) continue;
      const t2 = store.tx.find((x) => x.id === t.id);
      if (!t2 || (RCPT.v[t.id] || 0) !== v0 || ui.editId === t.id) continue;
      if (t2.items && t2.items.length) {
        const ns = its.reduce((a, i) => a + i.p, 0);
        if (!bad(t2) || Math.abs(ns - t2.amount) >= Math.abs(isum(t2) - t2.amount)) continue;
      }
      const doc = {
          ...plainTx(t2),
          items: its.map((i) => ({
            r: i.n,
            p: i.p,
          })),
        },
        sid = zaShopId(parseReceipt(L).shop || t2.note);
      if (sid) doc.ishop = sid;
      if (
        await saveTxDoc(t.id, doc, t2).then(
          () => true,
          () => false
        )
      )
        n++;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 400));
  }
  zBonBackfill.on = false;
  if (n)
    toast(
      `${n} ${n === 1 ? "alter Kassenzettel wurde" : "alte Kassenzettel wurden"} digital angelegt`,
      null,
      null,
      5000
    );
}
setTimeout(() => {
  try {
    zBonBackfill();
  } catch (_) {}
}, 25000);
function zBonSrc() {
  if (ui.scanItems && ui.scanItems.cleared) return null;
  if (ui.scanItems && ui.scanItems.items && ui.scanItems.items.length) return ui.scanItems;
  const t = ui.editId && store.tx.find((x) => x.id === ui.editId);
  return t && t.items && t.items.length
    ? {
        items: t.items,
        shop: t.ishop || zaShopId(t.note),
      }
    : null;
}
const zbEur = (v) => round2(v).toFixed(2).replace(".", ",");
function zBonRender(keepBub) {
  const el = $("zBonBox");
  if (!el) return;
  const src = zBonSrc();
  if (!src) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const sh = SHOPS.find((x) => x.id === src.shop),
    its = src.items.map((i) => ({
      ...i,
      ...zaName(i.r, src.shop),
    })),
    unk = its.filter((i) => !i.sure).length,
    open = !!ui.zbOpen;
  el.hidden = false;
  el.innerHTML = `<button class="zbh" data-zbtg="1" aria-expanded="${open}"><span class="zbic">${svgIcon("receipt", 18)}</span><span class="grow"><b>Kassenzettel</b>${(() => {
    const hd = (w) =>
      trBold(
        unk
          ? `${its.length} Artikel · **${unk} unklar** · antippen zum ${w}`
          : `${its.length} Artikel · antippen zum ${w}`
      )
        .replace(/<b>/g, "<em>")
        .replace(/<\/b>/g, "</em>");
    const a = hd("Ausrollen"),
      e = hd("Einrollen");
    return `<small data-zba="${escHtml(a)}" data-zbe="${escHtml(e)}">${open ? e : a}</small>`;
  })()}</span><span class="zbch">▾</span></button>
    <div class="zbpaper${open ? " on" : ""}"><div class="zbhd">${escHtml(sh ? sh.name : "Kassenzettel")}</div>${its.map((i, k) => `<div class="zbit"><button class="${i.sure ? "" : "u"}" data-zbi="${k}" aria-label="${escHtml(i.n)} – Namen ändern">${escHtml(i.n)}</button><span>${zbEur(i.p)}</span></div>`).join("")}<div class="zbit zbsum"><span>SUMME</span><span>${zbEur(its.reduce((a, i) => a + i.p, 0))}</span></div><small class="zbtip">${unk ? "Unterstrichenes antippen und richtig benennen – gilt dann immer." : "Namen antippen, um ihn zu ändern."}</small><div class="zbact"><button class="btn small" data-zbre="1">↻ Bon neu lesen</button>${updKey() ? `<button class="btn small" data-zbraw="1">Lesedaten kopieren</button>` : ""}</div></div>
    <div class="zbbub" id="zbBub" hidden></div>`;
}
function zBonAsk(k) {
  const src = zBonSrc(),
    it = src && src.items[k];
  if (!it) return;
  const b = $("zbBub"),
    row = document.querySelector(`#zBonBox [data-zbi="${k}"]`);
  const sh = SHOPS.find((x) => x.id === src.shop),
    cur = zaName(it.r, src.shop);
  b.innerHTML = `<small>Auf dem Bon: <b>${escHtml(it.r)}</b></small><input class="in" id="zbIn" value="${escHtml(cur.n)}" autocomplete="off" enterkeyhint="done" aria-label="Richtiger Name"><div class="zbbr"><small>${sh ? `Für ${escHtml(sh.name)} merken` : "Für alle Läden merken"} ✓</small><span><button class="btn small" data-zbno="1">Abbrechen</button><button class="btn small primary" data-zbok="${k}">Merken</button></span></div>`;
  b.hidden = false;
  const box = $("zBonBox").getBoundingClientRect(),
    rr = row.getBoundingClientRect();
  b.style.top = rr.bottom - box.top + 6 + "px";
  requestAnimationFrame(() => b.classList.add("on"));
  const inp = $("zbIn");
  setTimeout(() => {
    inp.focus();
    inp.select();
  }, 60);
}
function zBonSave(k) {
  const src = zBonSrc(),
    it = src && src.items[k],
    v = ($("zbIn") || {}).value;
  if (!it) return;
  zaTeach(it.r, src.shop, (v || "").trim());
  toast("Gemerkt – gilt ab jetzt auf allen Geräten");
  zBonRender();
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-zbtg]")) {
    ui.zbOpen = !ui.zbOpen;
    const p = document.querySelector("#zBonBox .zbpaper"),
      h = document.querySelector("#zBonBox .zbh");
    if (p) {
      p.classList.toggle("on", ui.zbOpen);
      h.setAttribute("aria-expanded", ui.zbOpen);
      const sm = h.querySelector("small");
      if (sm && sm.dataset.zba) sm.innerHTML = ui.zbOpen ? sm.dataset.zbe : sm.dataset.zba;
    }
    return;
  }
  if (e.target.closest("[data-zbre]")) {
    zBonReread();
    return;
  }
  if (e.target.closest("[data-zbraw]")) {
    const L = window.HB_OCR;
    if (!L) {
      toast("Erst „Bon neu lesen“ tippen");
      return;
    }
    const txt = JSON.stringify({
      info: window.HB_OCRINFO || null,
      lines: L.map((l) => ({
        t: l.t,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
      })),
    });
    (async () => {
      try {
        await navigator.clipboard.writeText(txt);
        toast("Lesedaten kopiert – einfach im Chat einfügen");
      } catch (_) {
        toast("Kopieren ging nicht");
      }
    })();
    return;
  }
  const i = e.target.closest("[data-zbi]");
  if (i) {
    zBonAsk(+i.dataset.zbi);
    return;
  }
  const ok = e.target.closest("[data-zbok]");
  if (ok) {
    zBonSave(+ok.dataset.zbok);
    return;
  }
  if (e.target.closest("[data-zbno]")) {
    const b = $("zbBub");
    if (b) {
      b.hidden = true;
      b.classList.remove("on");
    }
    return;
  }
});
document.addEventListener(
  "keydown",
  (e) => {
    if (e.target.id === "zbIn" && e.key === "Enter") {
      e.preventDefault();
      const ok = document.querySelector("[data-zbok]");
      if (ok) ok.click();
    }
    if (e.target.id === "zbIn" && e.key === "Escape") {
      e.stopPropagation();
      const b = $("zbBub");
      if (b) b.hidden = true;
    }
  },
  true
);
async function zBonReread() {
  const id = ui.editId;
  let img = ui.rcpt && ui.rcpt.img;
  if (!img && id && hasReceipt(id)) img = await rcptGet(id);
  if (!img) {
    toast("Kein Belegfoto da");
    return;
  }
  try {
    scanWorking(true);
    const L = await ocrBest(img);
    scanWorking(false);
    try {
      scanBusy(false);
    } catch (_) {}
    window.HB_OCR = L;
    const its = receiptItems(L || []);
    let tot = null;
    try {
      tot = parseReceipt(L).amount;
    } catch (_) {}
    if (!its.length) {
      toast("Auf dem Foto wurden keine Artikel erkannt", null, null, 4000);
      return;
    }
    ui.scanItems = {
      items: its.map((i) => ({
        r: i.n,
        p: i.p,
      })),
      shop: zaShopId(parseReceipt(L).shop || $("fNote").value),
    };
    ui.zbOpen = true;
    zBonRender();
    const t = id && store.tx.find((x) => x.id === id);
    if (t) {
      const d = plainTx(t);
      d.items = ui.scanItems.items;
      if (ui.scanItems.shop) d.ishop = ui.scanItems.shop;
      await safe(() => saveTxDoc(id, d, t));
    }
    const sm = its.reduce((a, i) => a + i.p, 0);
    toast(
      `${its.length} Artikel gelesen · zusammen ${fmtEur(sm)}${tot != null && Math.abs(sm - tot) > 0.02 ? ` – auf dem Bon steht ${fmtEur(tot)}` : ""}`,
      null,
      null,
      5000
    );
  } catch (e) {
    scanWorking(false);
    try {
      scanBusy(false);
    } catch (_) {}
    toast("Bon konnte nicht gelesen werden" + (e && e.message ? ": " + e.message : ""), null, null, 6000);
  }
}
async function rcptSwapNow(id, img) {
  const t = store.tx.find((x) => x.id === id);
  if (!t || !img) return;
  try {
    await rcptPut(id, img);
  } catch (e) {
    toast("Beleg konnte nicht gespeichert werden");
    return;
  }
  ZB_TRIED.add(id);
  const si = ui.scanItems,
    d = plainTx(t);
  if (si && si.cleared) {
    delete d.items;
    delete d.ishop;
  } else if (si && si.items && si.items.length) {
    d.items = si.items;
    if (si.shop) d.ishop = si.shop;
    else delete d.ishop;
  }
  if (si && (si.cleared || (si.items && si.items.length))) await safe(() => saveTxDoc(id, d, t));
  if (ui.editId === id) {
    ui.rcpt = {
      state: "stored",
      img,
    };
    renderRcptRow();
  }
  render();
  const n = si && si.items ? si.items.length : 0;
  toast(
    n
      ? `Beleg ersetzt · ${n} Artikel gelesen`
      : si && si.cleared
        ? "Beleg ersetzt · keine Artikel erkannt"
        : "Beleg ersetzt",
    null,
    null,
    4000
  );
}
async function rcptSaveFor(id) {
  const r = ui.rcpt;
  try {
    if (r.state === "new" && r.img) {
      await rcptPut(id, r.img);
      render();
    } else if (r.state === "removed" && hasReceipt(id)) {
      await rcptDel(id);
      render();
    }
  } catch (e) {
    toast("Beleg konnte nicht gespeichert werden");
  }
}
function rcptView(img) {
  if (!img) return;
  $("rcptBig").src = img;
  $("rcptViewer").hidden = false;
}
$("rcptView").onclick = () => rcptView(ui.rcpt.img);
$("rcptThumb").onclick = () => rcptView(ui.rcpt.img);
$("rcptViewerClose").onclick = () => {
  $("rcptViewer").hidden = true;
  $("rcptBig").src = "";
};
$("rcptRemove").onclick = () => {
  ui.rcpt = {
    state: "removed",
    img: null,
  };
  renderRcptRow();
};
$("rcptReplace").onclick = () => runScan("camera", true);
$("rcptShare").onclick = () => rcptShare(ui.rcpt.img, rcptName(store.tx.find((x) => x.id === ui.editId)));
$("rcptAdd").onclick = () => runScan("camera", true);
$("rcptGallery").onclick = () => runScan("gallery", true);

/* Beleg scannen */
const NATIVE_SCAN = !!(window.AndroidBridge && window.AndroidBridge.scanReceipt);
const scanWaiting = {};
window.hbScanDone = (id, json, err) => {
  const f = scanWaiting[id];
  if (f) {
    delete scanWaiting[id];
    f(json, err);
  }
};
function scanBusy(on, text) {
  $("scanRow").classList.toggle("busy", on);
  $("scanSub").textContent = on ? text || "Quittung wird gelesen …" : "Betrag, Datum und Geschäft werden ausgefüllt";
}
async function scanNative(source) {
  const id = newId();
  const res = await new Promise((r) => {
    scanWaiting[id] = (json, err) =>
      r({
        json,
        err,
      });
    window.AndroidBridge.scanReceipt(id, source);
  });
  if (res.err === "cancel" || (!res.json && !res.err)) return null;
  if (res.err) throw new Error(res.err);
  return JSON.parse(res.json);
}
let tessLoad = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  return (
    tessLoad ||
    (tessLoad = new Promise((ok, bad) => {
      const sc = document.createElement("script"),
        h = "__TESS_SRI__";
      if (h.startsWith("sha384-")) {
        sc.integrity = h;
        sc.crossOrigin = "anonymous";
      }
      sc.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      sc.onload = ok;
      sc.onerror = () => {
        tessLoad = null;
        bad(new Error("Texterkennung konnte nicht geladen werden – bist du online?"));
      };
      document.head.appendChild(sc);
    }))
  );
}
async function scanImageFile(file) {
  scanBusy(true, "Texterkennung wird geladen …");
  await loadTesseract();
  scanBusy(true, "Quittung wird gelesen …");
  const r = await window.Tesseract.recognize(file, "deu");
  return ((r.data && r.data.lines) || [])
    .map((l) => ({
      t: l.text.trim(),
      x: l.bbox.x0,
      y: l.bbox.y0,
      w: l.bbox.x1 - l.bbox.x0,
      h: l.bbox.y1 - l.bbox.y0,
    }))
    .filter((l) => l.t);
}
const AMT_RE = /(^|[^\d,.])(\d{1,4}(?:\.\d{3})*|\d{1,6})\s?[,.]\s?(\d{2})(?!\d)/g;
function amountsIn(t) {
  const out = [];
  let m;
  AMT_RE.lastIndex = 0;
  while ((m = AMT_RE.exec(t))) {
    const v = Number(m[2].replace(/\./g, "") + "." + m[3]);
    if (v > 0 && v < 100000) out.push(v);
  }
  return out;
}
function receiptItems(lines) {
  const a = receiptItemsRows(lines);
  let b = [];
  try {
    b = receiptItemsCols(lines);
  } catch (e) {}
  if (!b.length) return a;
  if (!a.length) return b;
  let tot = null;
  try {
    tot = parseReceipt(lines).amount;
  } catch (e) {}
  const ok = (x) => tot != null && Math.abs(x.reduce((s, i) => s + i.p, 0) - tot) < 0.02;
  if (ok(a)) return a;
  if (ok(b)) return b;
  return b.length > a.length ? b : a;
}
function receiptItemsCols(lines) {
  const L = lines
    .filter((l) => l && l.t && l.y != null && l.x != null)
    .map((l) => ({
      ...l,
      t: String(l.t).replace(/\s+/g, " ").trim(),
      h: l.h || 20,
      w: l.w || 0,
    }));
  if (L.length < 4) return [];
  const cy = (l) => l.y + l.h / 2;
  const sum = L.filter(
    (l) => /summe|zu zahlen|zahlbetrag|gesamtbetrag|\btotal\b/.test(normText(l.t)) && !/zwischen/.test(normText(l.t))
  ).sort((a, b) => a.y - b.y)[0];
  if (!sum) return [];
  const sY = cy(sum) - sum.h * 0.4,
    xs = L.map((l) => l.x + l.w).sort((a, b) => a - b),
    right = xs[Math.floor(xs.length * 0.5)];
  const PO = /^(-?\d{1,3}\s?[,.]\s?\d{2})\s*(?:€|eur)?\s*[A-Za-z*]?\s*\*?$/i,
    PE = /\s(-?\d{1,3}\s?[,.]\s?\d{2})\s*(?:€|eur)?\s*[A-Za-z*]?\s*\*?$/i;
  const QTY =
    /^\s*-?\d+(?:[,.]\d+)?\s*(?:kg|g|x|stk\.?|st\.?|×)\b|\d\s*[xX×]\s*\d+\s?[,.]\s?\d{2}|(?:eur|€)\s*\/\s*\w{1,3}\b/i;
  const BAD =
    /summe|gesamt|\bmwst|\bust\b|netto|brutto|steuer|datum|uhrzeit|kasse|\bbon\b|beleg|\buid\b|str\.|strasse|straße|\bnr\b|tel|www|filiale|^eur$|^\d{5}\s/;
  const prices = [],
    names = [];
  for (const l of L) {
    if (cy(l) >= sY) continue;
    const m = l.t.match(PO);
    if (m && l.x + l.w >= right - 4) {
      prices.push({
        y: cy(l),
        h: l.h,
        p: Number(m[1].replace(/\s/g, "").replace(",", ".")),
      });
      continue;
    }
    const pe = (" " + l.t).match(PE),
      n = normText(l.t);
    if (/[a-zäöüß]{3,}/.test(n) && !QTY.test(l.t) && !BAD.test(n)) {
      if (pe) {
        const nm = (" " + l.t).slice(0, pe.index).trim();
        if (/[A-Za-zÄÖÜäöüß]{3,}/.test(nm)) {
          names.push({
            y: cy(l),
            h: l.h,
            n: nm,
          });
          prices.push({
            y: cy(l),
            h: l.h,
            p: Number(pe[1].replace(/\s/g, "").replace(",", ".")),
          });
        }
      } else
        names.push({
          y: cy(l),
          h: l.h,
          n: l.t.replace(/(\s+[^\s%]*\d[^\s%]*)+\s*$/, "").trim(),
        });
    }
  }
  if (!prices.length) return [];
  prices.sort((a, b) => a.y - b.y);
  const p0 = prices[0].y - prices[0].h * 1.6;
  const nm = names.filter((n) => n.y >= p0).sort((a, b) => a.y - b.y);
  if (!nm.length) return [];
  let pairs = [];
  if (nm.length === prices.length) pairs = nm.map((n, i) => [n, prices[i]]);
  else {
    const used = new Set();
    for (const p of prices) {
      let best = null,
        bd = 1e9;
      for (const n of nm) {
        if (used.has(n)) continue;
        const d = Math.abs(n.y - p.y);
        if (d < bd) {
          bd = d;
          best = n;
        }
      }
      if (best && bd < Math.max(best.h, p.h) * 1.6) {
        used.add(best);
        pairs.push([best, p]);
      }
    }
  }
  return pairs
    .filter(([n, p]) => n.n.length >= 3 && Math.abs(p.p) > 0 && p.p < 200)
    .map(([n, p]) => ({
      n: n.n.slice(0, 40),
      p: p.p,
    }))
    .slice(0, 80);
}
function receiptItemsRows(lines) {
  const rows = [];
  const L = lines.map((l) => ({
    ...l,
  }));
  if (L.some((l) => l.y != null)) {
    L.sort((a, b) => (a.y || 0) - (b.y || 0));
    const apart = (r, l) =>
      r.parts.every((p) => (l.x || 0) >= (p.x || 0) + (p.w || 0) - 4 || (l.x || 0) + (l.w || 0) <= (p.x || 0) + 4);
    for (const l of L) {
      const r = rows.find(
        (r) => Math.abs(r.y + r.h / 2 - ((l.y || 0) + (l.h || 0) / 2)) < Math.min(r.h, l.h || r.h) * 0.55 && apart(r, l)
      );
      if (r) {
        r.parts.push(l);
      } else
        rows.push({
          y: l.y || 0,
          h: l.h || 10,
          parts: [l],
        });
    }
    rows.forEach((r) => {
      r.parts.sort((a, b) => (a.x || 0) - (b.x || 0));
      r.t = r.parts.map((p) => p.t).join("  ");
    });
  } else
    L.forEach((l) =>
      rows.push({
        t: l.t,
      })
    );
  const out = [],
    STOP =
      /summe|gesamt|zu zahlen|total|zahlbetrag|\bbar\b|\bkarte\b|kartenzahlung|girocard|\bec\b|\bec-|mwst|\bust\b|netto|brutto|rückgeld|rueckgeld|\bpfand|leergut|rabatt|coupon|\bbonus|punkte|payback|steuer|datum|uhrzeit|\bkasse\b|kassenbon|\bbon\b|bon-nr|\bbeleg|\btse\b|signatur|vielen dank|www|tel\.|filiale|\beur\s*$|^\s*eur\b|posten|artikel\s*:|anzahl artikel|transaktion|terminal|kundenbeleg|\buid\b|ust-id|st\.?-?nr|steuernr/;
  const PRICE = /\s(-?\d{1,3}\s?[,.]\s?\d{2})\s*(?:€|eur)?\s*(?:[A-Za-z*]|\d)?\s*[*‘'`]?\s*$/i;
  const QTY =
    /^\s*-?\d+(?:[,.]\d+)?\s*(?:kg|g|x|stk\.?|st\.?|×)\b|^\s*\d*\s*st\w{0,2}\.?\s*[xX×]|^\s*\d+\s*\w{0,4}\.?\s*[xX×]\s|^\s*\d+\s*[xX×]\s*\d|\b(?:eur|€)\s*\/\s*kg\b|\d\s*[xX×]\s*\d+\s?[,.]\s?\d{2}/i;
  let pend = "";
  for (let ri = 0; ri < rows.length; ri++) {
    const r = rows[ri];
    const t = r.t.replace(/\s+/g, " ").trim(),
      n = normText(t);
    if (
      STOP.test(n) ||
      (out.length && /kundenbeleg|^geg\b|gegeben|bezahlung|mastercard|visa|^datum|gesa\w*betrag/.test(n))
    ) {
      pend = "";
      if (
        /summe|zu zahlen|total|gesamt|zahlbetrag/.test(n) ||
        (out.length && /kundenbeleg|^geg\b|gegeben|bezahlung|^datum|gesa\w*betrag/.test(n))
      )
        break;
      continue;
    }
    const pm = (" " + t).match(PRICE);
    if (!pm) {
      if (/[A-Za-zÄÖÜäöüß]{3,}/.test(t) && !QTY.test(t)) pend = t.replace(/(\s+[^\s%]*\d[^\s%]*)+\s*$/, "").trim();
      continue;
    }
    let p = Number(pm[1].replace(/\s/g, "").replace(",", "."));
    const head = (" " + t).slice(0, pm.index).trim();
    if (/^[^A-Za-z0-9]*(?:summe\s*)?eur[^A-Za-z0-9]*$/i.test(head)) {
      if (out.length) break;
      continue;
    }
    if (/\b(?:eur|€)\s*\/\s*\w{1,3}\b/i.test(head) && !pend) {
      continue;
    }
    {
      const q = t.match(/^\s*(\d{1,2})\s*\w{0,4}\.?\s*[xX×]\s*(\d{1,3}\s?[,.]\s?\d{2})\s*[A-Za-z*]?\s*$/);
      if (q) {
        const u = Number(q[2].replace(/\s/g, "").replace(",", "."));
        if (Math.abs(u - p) < 0.005) p = round2(Number(q[1]) * u);
      }
    }
    let name;
    if (QTY.test(head) || !/[A-Za-zÄÖÜäöüß]{3,}/.test(head)) {
      if (!pend && !QTY.test(head)) {
        const nx = rows[ri + 1],
          nt = nx ? nx.t.replace(/\s+/g, " ").trim() : "";
        if (
          nt &&
          /[A-Za-zÄÖÜäöüß]{3,}/.test(nt) &&
          !(" " + nt).match(PRICE) &&
          !QTY.test(nt) &&
          !STOP.test(normText(nt))
        ) {
          pend = nt;
          ri++;
        }
      }
      if (!pend) continue;
      name = pend;
    } else
      name = head
        .replace(/\b\d+\s*[xX×]\s*\d+[,.]\d{2}\b/, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    pend = "";
    if (!(Math.abs(p) > 0 && p < 200) || name.length < 3) continue;
    out.push({
      n: name.slice(0, 40),
      p,
    });
  }
  return out.slice(0, 80);
}
/* Kassenbon */
const ZAB = (() => {
  const o = {};
  `
SCHWARZW Schwarzwälder|SCHWARZWAELD Schwarzwälder|SCHINK Schinken|SCHINKN Schinken|KOCHSCH Kochschinken|KOCHSCHINK Kochschinken|SALAMI Salami|LEBERW Leberwurst|LEBERWU Leberwurst|TEEW Teewurst|BIERSCH Bierschinken|WIENER Wiener|WUERSTCH Würstchen|WUERST Würstchen|BRATW Bratwurst|BRATWU Bratwurst|BRATWURST Bratwurst|HAEHNCH Hähnchen|HAEHN Hähnchen|HAEHNCHENBR Hähnchenbrust|HAEHNCHBR Hähnchenbrust|HAEHNBR Hähnchenbrust|PUTENBR Putenbrust|PUTENBRU Putenbrust|PUTE Pute|SCHNITZ Schnitzel|HACKFL Hackfleisch|HACKFLEI Hackfleisch|GEMISCHT gemischt|RIND Rind|RINDERHACK Rinderhack|SCHWEIN Schwein|SCHWEINEFL Schweinefleisch|AUFSCHN Aufschnitt|AUFSCHNITT Aufschnitt|FLEISCHW Fleischwurst|GEFL Geflügel|GEFLUEG Geflügel|
PROTEINK Proteinkäse|KAESE Käse|KAES Käse|KSE Käse|SCHEIB Scheiben|SCHB Scheiben|SCHEIBEN Scheiben|GOUDA Gouda|EMMENT Emmentaler|EMMENTAL Emmentaler|MOZZAR Mozzarella|MOZZ Mozzarella|PARMES Parmesan|FRISCHK Frischkäse|FRISCHKAE Frischkäse|SCHMELZK Schmelzkäse|HUETTENK Hüttenkäse|QUARK Quark|MAGERQ Magerquark|MAGERQU Magerquark|SPEISEQ Speisequark|JOGH Joghurt|JOGHU Joghurt|JOGHURT Joghurt|NAT Natur|NATUR Natur|SAHNE Sahne|SCHLAGS Schlagsahne|SCHLAGSAH Schlagsahne|SCHMAND Schmand|CREME Crème|FRAICHE fraîche|MILCH Milch|H-MILCH H-Milch|HMILCH H-Milch|VOLLM Vollmilch|VOLLMI Vollmilch|FETTARM fettarm|FETTA fettarm|BUTT Butter|BUTTER Butter|MARGAR Margarine|PFLANZ pflanzlich|PFLANZL pflanzlich|EIER Eier|FREIL Freiland|FREILAND Freiland|BODENH Bodenhaltung|
BROETCH Brötchen|BROETCHEN Brötchen|BROETCHE Brötchen|SONNTAGSBROETCHE Sonntagsbrötchen|SONNTAGSBR Sonntagsbrötchen|BROT Brot|VOLLKORNBR Vollkornbrot|VOLLK Vollkorn|VOLLKORN Vollkorn|TOAST Toast|TOASTBR Toastbrot|LAUGENBR Laugenbrezel|BREZ Brezel|CROISS Croissant|BAGUET Baguette|DINKEL Dinkel|ROGGEN Roggen|WEIZEN Weizen|MEHL Mehl|DINKELMEHL Dinkelmehl|HAFERFL Haferflocken|HAFERFLO Haferflocken|HAFERFLOCK Haferflocken|ZART zart|KERN kernig|KERNIG kernig|MUESLI Müsli|MUSLI Müsli|CORNFL Cornflakes|NUDELN Nudeln|SPAGH Spaghetti|SPAGHET Spaghetti|PENNE Penne|REIS Reis|BASMATIR Basmatireis|ZUCK Zucker|ZUCKER Zucker|
APFELMUS Apfelmus|APF Apfel|AEPFEL Äpfel|BANAN Bananen|BANANE Bananen|BIRN Birnen|TRAUB Trauben|TRAUBEN Trauben|ERDBEER Erdbeeren|HEIDELB Heidelbeeren|ZITRON Zitronen|ORANG Orangen|MANDAR Mandarinen|KARTOFF Kartoffeln|KART Kartoffeln|SPEISEKART Speisekartoffeln|MEHLIGK mehligkochend|FESTK festkochend|ZWIEB Zwiebeln|ZWIEBEL Zwiebeln|KNOBL Knoblauch|TOMAT Tomaten|TOM Tomaten|STRAUCHTOM Strauchtomaten|CHERRYTOM Cherrytomaten|GURK Gurke|SALATGURKE Salatgurke|PAPRIK Paprika|ZUCCHINI Zucchini|KAROTT Karotten|MOEHR Möhren|MOEHREN Möhren|SALAT Salat|EISBERGS Eisbergsalat|BROKK Brokkoli|CHAMP Champignons|CHAMPIGN Champignons|GRUEN grün|GRU grün|ROT rot|GELB gelb|BIO Bio|
CASHEWK Cashewkerne|CASHEWKERNE Cashewkerne|ERDN Erdnüsse|ERDNUESSE Erdnüsse|WALN Walnüsse|MANDELN Mandeln|GEMUESECHIPS Gemüsechips|CHIPS Chips|PAPRCHIPS Paprika-Chips|SCHOKO Schoko|SCHOKOL Schokolade|SCHOKOTROEPFCHEN Schokotröpfchen|VOLLMILCHSCH Vollmilchschokolade|ZARTB Zartbitter|ZARTBITT Zartbitter|KEKS Kekse|GUMMIB Gummibärchen|RAMA Rama|REIN rein|MILD mild|
MINERALW Mineralwasser|MINERALWAS Mineralwasser|MIN Mineral|WASS Wasser|WASSER Wasser|SPRUDEL Sprudel|STILL still|MEDIUM medium|APFELSCH Apfelschorle|SCHORLE Schorle|ORANGENS Orangensaft|ORANGENSAFT Orangensaft|APFELS Apfelsaft|SAFT Saft|DIREKTS Direktsaft|COLA Cola|LIMO Limonade|BIER Bier|PILS Pils|KAFFEE Kaffee|KAFF Kaffee|BOHNE Bohnen|BOHN Bohnen|GEMAHL gemahlen|TEE Tee|
TOILETTENP Toilettenpapier|TOILPAP Toilettenpapier|KUECHENR Küchenrolle|KUECHENROL Küchenrolle|TASCHENT Taschentücher|SPUELM Spülmittel|SPUELMITT Spülmittel|WASCHM Waschmittel|WASCHMITT Waschmittel|WEICHSP Weichspüler|DUSCHG Duschgel|DUSCHGEL Duschgel|SHAMP Shampoo|ZAHNP Zahnpasta|ZAHNCR Zahncreme|ZAHNBUER Zahnbürste|DEO Deo|MUELLB Müllbeutel|MUELLBEUT Müllbeutel|
TK Tiefkühl|TIEFK Tiefkühl|PIZZA Pizza|PIZ Pizza|FISCHST Fischstäbchen|LACHS Lachs|THUNF Thunfisch|THUNFISCH Thunfisch|HERING Hering|POMMES Pommes|PFANDFL Pfandflasche|
JA ja!|GUT gut|GUENSTIG günstig|KNUSPR Knusper|KNUSP Knusper|K-CLASSIC K-Classic|STK Stück|ST Stück|PCK Packung|PKG Packung|PACK Packung|FL Flasche|FLA Flasche|DS Dose|GL Glas|BTL Beutel|KG kg|G g|L l|ML ml|GR groß|KL klein|FR frisch|FRI frisch|GEW gewürfelt|GER gerieben|GESCHN geschnitten|GERAEUCH geräuchert|GEKOCHT gekocht|LEICHT leicht|LIGHT light|ORIG Original|ORIGINAL Original|KLASS klassisch|NATURTR naturtrüb|`
    .split("|")
    .forEach((e) => {
      const m = e.trim().match(/^(\S+)\s+(.+)$/);
      if (m) o[m[1]] = m[2];
    });
  return o;
})();
const zaUml = (w) =>
  w
    .replace(/(?<![EQ])UE(?!$)/g, "Ü")
    .replace(/(?<!E)AE/g, "Ä")
    .replace(/OE(?!N\b)/g, "Ö");
function zaWord(tok, first) {
  const t = tok.replace(/[^A-ZÄÖÜ0-9\-%]/gi, "").toUpperCase();
  if (!t)
    return {
      w: tok,
      ok: true,
    };
  if (/^\d/.test(t))
    return {
      w: tok.toLowerCase(),
      ok: true,
    };
  const a = t.replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE");
  if (ZAB[a]) {
    const v = ZAB[a];
    return {
      w: first ? v[0].toUpperCase() + v.slice(1) : v,
      ok: true,
      hit: true,
    };
  }
  const u = zaUml(a);
  const w = u[0] + u.slice(1).toLowerCase();
  return {
    w,
    ok: false,
  };
}
function zaName(raw, shopId) {
  const r = String(raw || "")
      .replace(/\s+/g, " ")
      .trim(),
    L = store.settings.zabbr || {};
  const k = r.toUpperCase();
  if (shopId && L[shopId + "|" + k])
    return {
      n: L[shopId + "|" + k],
      sure: true,
      taught: true,
    };
  if (L["*|" + k])
    return {
      n: L["*|" + k],
      sure: true,
      taught: true,
    };
  const toks = r.split(" "),
    long = r.length >= 15;
  let sure = true;
  const out = toks.map((tk, i) => {
    const z = zaWord(tk, i === 0);
    const cut = /\.$/.test(tk) || (long && i === toks.length - 1 && tk.length >= 4);
    if (!z.ok && cut) sure = false;
    if (!z.ok && tk.replace(/\W/g, "").length <= 3 && /[A-Z]/i.test(tk)) sure = false;
    return z.w;
  });
  return {
    n: out.join(" ").replace(/\s+-\s+/g, "-"),
    sure,
  };
}
function zaTeach(raw, shopId, full) {
  const k = String(raw || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase(),
    v = String(full || "").trim();
  if (!k) return;
  const L = {
    ...(store.settings.zabbr || {}),
  };
  if (v) L[(shopId || "*") + "|" + k] = v.slice(0, 60);
  else delete L[(shopId || "*") + "|" + k];
  store.settings.zabbr = L;
  saveSettings();
}
const zaShopId = (text) => {
  const sh = SHOPS.find((x) => x.re.test(normText(text || "")));
  return sh ? sh.id : "";
};
function rememberPrices(shopText, date, items) {
  const sh = SHOPS.find((x) => x.re.test(normText(shopText || "")));
  if (!sh || !items.length) return 0;
  const d = date || isoToday(),
    book = (store.settings.pricebook || []).filter((e) => !(e.s === sh.id && e.d === d));
  for (const it of items)
    book.push({
      n: zaName(it.n, sh.id).n,
      p: it.p,
      s: sh.id,
      d,
    });
  store.settings.pricebook = book.sort((a, b) => a.d.localeCompare(b.d)).slice(-400);
  saveSettings();
  return items.length;
}
function parseReceipt(lines) {
  lines = lines.map((l, i) => ({
    ...l,
    i,
    n: normText(l.t),
  }));
  const TOTAL = [
    /zu zahlen|zahlbetrag|gesamtbetrag|endbetrag|gesamtsumme|summe|gesamt|total|betrag eur|\beur\b.*summe/,
    /ec[- ]?karte|girocard|kartenzahlung|karte|visa|mastercard|maestro|bar\b|zahlung/,
  ];
  const SKIP =
    /zwischensumme|mwst|ust|netto|steuer|rückgeld|rueckgeld|zurück|rabatt|pfand|bonus|punkte|tip|trinkgeld|kunden/;
  const near = (a, b) =>
    a.y != null && b.y != null && Math.abs(a.y + a.h / 2 - (b.y + b.h / 2)) < Math.max(a.h, b.h) * 0.7;
  let best = null;
  TOTAL.forEach((re, prio) => {
    for (const l of lines) {
      if (!re.test(l.n) || SKIP.test(l.n)) continue;
      let vals = amountsIn(l.t);
      if (!vals.length) {
        const row = lines.filter((o) => o !== l && near(o, l) && (o.x == null || l.x == null || o.x > l.x));
        vals = row.flatMap((o) => amountsIn(o.t));
      }
      if (!vals.length && l.y == null) {
        const nx = lines[l.i + 1];
        if (nx) vals = amountsIn(nx.t);
      }
      for (const v of vals) {
        const c = {
          v,
          prio,
          i: l.i,
        };
        if (!best || c.prio < best.prio || (c.prio === best.prio && (prio === 0 ? c.v > best.v : c.v < best.v)))
          best = c;
      }
    }
  });
  let amount = best ? best.v : null;
  if (amount == null) {
    const all = lines.filter((l) => !SKIP.test(l.n)).flatMap((l) => amountsIn(l.t));
    if (all.length) amount = Math.max(...all);
  }
  let date = null;
  const today = isoToday();
  for (const l of lines) {
    const m = l.t.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (!m) continue;
    const y = m[3].length === 2 ? "20" + m[3] : m[3],
      d = y + "-" + pad(m[2]) + "-" + pad(m[1]);
    if (
      Number(m[2]) >= 1 &&
      Number(m[2]) <= 12 &&
      Number(m[1]) >= 1 &&
      Number(m[1]) <= 31 &&
      d <= today &&
      d > "2000"
    ) {
      date = d;
      break;
    }
  }
  const all = lines.map((l) => l.n).join(" ");
  const chain = all.match(
    /\b(rewe|edeka|aldi(?: süd| nord)?|lidl|netto|penny|kaufland|rossmann|dm|norma|globus|real|famila|hit|tegut|denns|alnatura|ikea|obi|hornbach|bauhaus|toom|action|tedi|müller|mueller|saturn|media ?markt|aral|shell|esso|jet|total|agip|star|avia|mcdonalds|burger king|kfc|subway|bäckerei \w+|apotheke)\b/
  );
  let shop = chain ? chain[1].replace(/\b\w/g, (c) => c.toUpperCase()) : "";
  if (!shop) {
    const top = lines
      .slice(0, 6)
      .find(
        (l) =>
          /[a-zäöüß]{3,}/i.test(l.t) &&
          !/beleg|kasse|bon|tel|fax|www|@|str\.|straße|strasse|\d{5}|uhrzeit|datum/i.test(l.t)
      );
    if (top) shop = top.t.replace(/\s+/g, " ").slice(0, 40);
  }
  let cat = null;
  for (const [re, kind, word] of KW) {
    if (kind === "ausgabe" && re.test(all + " " + normText(shop))) {
      cat = catByWord("ausgabe", word);
      if (cat) break;
    }
  }
  return {
    amount,
    date,
    shop,
    cat,
  };
}
/* Belegfoto prüfen */
function loadImg(src) {
  return new Promise((ok, bad) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = bad;
    im.src = src;
  });
}
function grayOf(im, maxW) {
  const k = Math.min(1, maxW / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height)),
    w = Math.max(1, Math.round((im.naturalWidth || im.width) * k)),
    h = Math.max(1, Math.round((im.naturalHeight || im.height) * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d", {
    willReadFrequently: true,
  });
  x.drawImage(im, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data,
    g = new Float32Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
  return {
    g,
    w,
    h,
    k,
  };
}
function docAnalyze(im) {
  const W = im.naturalWidth,
    H = im.naturalHeight;
  const s = grayOf(im, 260),
    { g, w, h } = s,
    hist = new Array(256).fill(0);
  for (const v of g) hist[Math.min(255, v | 0)]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0,
    wB = 0,
    best = 0,
    thr = 128;
  const N = g.length;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = N - wB;
    if (!wF) break;
    sB += t * hist[t];
    const mB = sB / wB,
      mF = (sum - sB) / wF,
      b = wB * wF * (mB - mF) * (mB - mF);
    if (b > best) {
      best = b;
      thr = t;
    }
  }
  const lab = new Int32Array(N).fill(-1);
  let bigId = -1,
    bigN = 0,
    bigPix = null;
  for (let i = 0; i < N; i++) {
    if (lab[i] !== -1 || g[i] <= thr) continue;
    const st = [i],
      pix = [];
    lab[i] = i;
    while (st.length) {
      const p = st.pop();
      pix.push(p);
      const x = p % w,
        y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1])
        if (q >= 0 && lab[q] === -1 && g[q] > thr) {
          lab[q] = i;
          st.push(q);
        }
    }
    if (pix.length > bigN) {
      bigN = pix.length;
      bigId = i;
      bigPix = pix;
    }
  }
  let quad = null,
    cut = 0,
    found = false;
  const area = bigN / N;
  if (bigPix && area > 0.06) {
    let tl = [1e9, 0, 0],
      br = [-1e9, 0, 0],
      tr = [-1e9, 0, 0],
      bl = [1e9, 0, 0],
      border = 0;
    for (const p of bigPix) {
      const x = p % w,
        y = (p / w) | 0;
      if (x + y < tl[0]) tl = [x + y, x, y];
      if (x + y > br[0]) br = [x + y, x, y];
      if (x - y > tr[0]) tr = [x - y, x, y];
      if (x - y < bl[0]) bl = [x - y, x, y];
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border++;
    }
    const f = W / w;
    quad = [
      [tl[1], tl[2]],
      [tr[1], tr[2]],
      [br[1], br[2]],
      [bl[1], bl[2]],
    ].map(([x, y]) => [x * f, y * f]);
    cut = border / (2 * (w + h));
    found = area < 0.93;
  }
  if (!quad) {
    const m = 0.04;
    quad = [
      [W * m, H * m],
      [W * (1 - m), H * m],
      [W * (1 - m), H * (1 - m)],
      [W * m, H * (1 - m)],
    ];
  }
  const q = docQuality(im, quad);
  return {
    quad,
    found,
    cut,
    area,
    ...q,
  };
}
function docQuality(im, quad) {
  const s = grayOf(im, 700),
    { g, w, h, k } = s;
  const xs = quad.map((p) => p[0] * k),
    ys = quad.map((p) => p[1] * k);
  const x0 = Math.max(1, Math.floor(Math.min(...xs))),
    x1 = Math.min(w - 2, Math.ceil(Math.max(...xs))),
    y0 = Math.max(1, Math.floor(Math.min(...ys))),
    y1 = Math.min(h - 2, Math.ceil(Math.max(...ys)));
  let n = 0,
    m = 0,
    m2 = 0,
    lum = 0,
    glare = 0;
  for (let y = y0; y <= y1; y += 1)
    for (let x = x0; x <= x1; x += 1) {
      const i = y * w + x,
        v = g[i],
        L = 4 * v - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
      n++;
      m += L;
      m2 += L * L;
      lum += v;
      if (v > 250) glare++;
    }
  if (!n)
    return {
      sharp: 0,
      light: 128,
      glare: 0,
    };
  const varL = m2 / n - (m / n) * (m / n);
  return {
    sharp: Math.max(0, Math.min(100, Math.round(Math.sqrt(varL) * 3.2))),
    light: lum / n,
    glare: glare / n,
  };
}
function homography(src, dst) {
  const A = [],
    b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i],
      [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const hh = b.map((v, i) => v / A[i][i]);
  return [...hh, 1];
}
function docWarp(im, quad, maxSide) {
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let W = Math.max(d(quad[0], quad[1]), d(quad[3], quad[2])),
    H = Math.max(d(quad[0], quad[3]), d(quad[1], quad[2]));
  const k = Math.min(1, maxSide / Math.max(W, H));
  W = Math.max(8, Math.round(W * k));
  H = Math.max(8, Math.round(H * k));
  const sc = document.createElement("canvas");
  sc.width = im.naturalWidth;
  sc.height = im.naturalHeight;
  const sx = sc.getContext("2d", {
    willReadFrequently: true,
  });
  sx.drawImage(im, 0, 0);
  const S = sx.getImageData(0, 0, sc.width, sc.height),
    sd = S.data,
    SW = sc.width,
    SH = sc.height;
  const M = homography(
    [
      [0, 0],
      [W, 0],
      [W, H],
      [0, H],
    ],
    quad
  );
  const oc = document.createElement("canvas");
  oc.width = W;
  oc.height = H;
  const ox = oc.getContext("2d"),
    O = ox.createImageData(W, H),
    od = O.data;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const z = M[6] * x + M[7] * y + 1,
        u = (M[0] * x + M[1] * y + M[2]) / z,
        v = (M[3] * x + M[4] * y + M[5]) / z;
      const ui = u | 0,
        vi = v | 0,
        o = (y * W + x) * 4;
      if (ui < 0 || vi < 0 || ui >= SW - 1 || vi >= SH - 1) {
        od[o] = od[o + 1] = od[o + 2] = 255;
        od[o + 3] = 255;
        continue;
      }
      const fu = u - ui,
        fv = v - vi,
        i = (vi * SW + ui) * 4,
        j = i + SW * 4;
      for (let c = 0; c < 3; c++)
        od[o + c] =
          (sd[i + c] * (1 - fu) + sd[i + 4 + c] * fu) * (1 - fv) + (sd[j + c] * (1 - fu) + sd[j + 4 + c] * fu) * fv;
      od[o + 3] = 255;
    }
  ox.putImageData(O, 0, 0);
  return oc;
}
function docEnhance(src, contrast, sharpen) {
  const W = src.width,
    H = src.height,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d", {
    willReadFrequently: true,
  });
  x.drawImage(src, 0, 0);
  const I = x.getImageData(0, 0, W, H),
    d = I.data;
  if (contrast > 0) {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < d.length; i += 4) hist[(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0]++;
    const tot = W * H,
      cut = tot * 0.01 * (contrast / 50);
    let lo = 0,
      hi = 255,
      a = 0;
    while (lo < 254 && (a += hist[lo]) < cut) lo++;
    a = 0;
    while (hi > 1 && (a += hist[hi]) < cut) hi--;
    const span = Math.max(30, hi - lo),
      mix = contrast / 100;
    for (let i = 0; i < d.length; i += 4)
      for (let k = 0; k < 3; k++) {
        const v = ((d[i + k] - lo) * 255) / span;
        d[i + k] = d[i + k] * (1 - mix) + Math.max(0, Math.min(255, v)) * mix;
      }
  }
  if (sharpen > 0) {
    const amt = sharpen / 40,
      src2 = new Uint8ClampedArray(d);
    for (let y = 1; y < H - 1; y++)
      for (let xx = 1; xx < W - 1; xx++) {
        const i = (y * W + xx) * 4;
        for (let k = 0; k < 3; k++) {
          const v = src2[i + k],
            bl = (src2[i - 4 + k] + src2[i + 4 + k] + src2[i - W * 4 + k] + src2[i + W * 4 + k]) / 4;
          d[i + k] = v + (v - bl) * amt;
        }
      }
  }
  x.putImageData(I, 0, 0);
  return c;
}
const DR = {};
window.hbDocReview = (a, b) => docReview(a, b);
function docReview(imgSrc, info) {
  return new Promise(async (done) => {
    let im;
    try {
      im = await loadImg(imgSrc);
    } catch (e) {
      done({
        action: "ok",
        img: imgSrc,
      });
      return;
    }
    const A = docAnalyze(im);
    DR.im = im;
    DR.quad = A.quad.map((p) => [...p]);
    DR.mode = "frame";
    DR.contrast = 35;
    DR.sharpen = 35;
    DR.info = info || {};
    DR.A = A;
    DR.done = done;
    const el = $("docRev");
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("show"));
    $("drImg").src = imgSrc;
    await new Promise((r) => {
      if ($("drImg").complete) r();
      else $("drImg").onload = r;
    });
    $("drCon").value = DR.contrast;
    $("drSha").value = DR.sharpen;
    drChecks();
    drMode("frame");
    drLayout();
    requestAnimationFrame(() => {
      drLayout();
      setTimeout(drLayout, 120);
    });
  });
}
function drFinish(res) {
  const el = $("docRev");
  el.classList.remove("show");
  setTimeout(() => {
    el.hidden = true;
  }, 200);
  const d = DR.done;
  DR.done = null;
  if (d) d(res);
}
function drLayout() {
  const st = $("drStage"),
    im = DR.im,
    r = st.getBoundingClientRect(),
    k = Math.min(r.width / im.naturalWidth, r.height / im.naturalHeight);
  const w = im.naturalWidth * k,
    h = im.naturalHeight * k,
    ox = (r.width - w) / 2,
    oy = (r.height - h) / 2;
  DR.k = k;
  DR.ox = ox;
  DR.oy = oy;
  Object.assign($("drImg").style, {
    left: ox + "px",
    top: oy + "px",
    width: w + "px",
    height: h + "px",
  });
  drDraw();
}
function drDraw() {
  const P = DR.quad.map(([x, y]) => [DR.ox + x * DR.k, DR.oy + y * DR.k]),
    svg = $("drSvg");
  const ok = DR.A.sharp >= 45 && DR.A.found && DR.A.cut < 0.12,
    col = ok ? "#34d399" : "#fbbf24";
  svg.innerHTML = `<defs><mask id="drm"><rect width="100%" height="100%" fill="#fff"/><polygon points="${P.map((p) => p.join(",")).join(" ")}" fill="#000"/></mask></defs>
    <rect width="100%" height="100%" fill="rgba(0,0,0,.45)" mask="url(#drm)"/>
    <polygon points="${P.map((p) => p.join(",")).join(" ")}" fill="${col}22" stroke="${col}" stroke-width="2.5" stroke-linejoin="round"/>
    ${P.map((p, i) => `<circle data-drc="${i}" cx="${p[0]}" cy="${p[1]}" r="15" fill="#fff" fill-opacity=".25" stroke="${col}" stroke-width="3"/><circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${col}" pointer-events="none"/>`).join("")}`;
}
function drChecks() {
  const A = DR.A,
    info = DR.info,
    R = [];
  const sh =
    A.sharp >= 45
      ? ["good", "Scharf", `${A.sharp} %`]
      : A.sharp >= 28
        ? ["warn", "Etwas unscharf", `${A.sharp} %`]
        : ["bad", "Unscharf", `${A.sharp} %`];
  const li =
    A.light < 70
      ? ["bad", "Zu dunkel", ""]
      : A.glare > 0.05
        ? ["warn", "Spiegelt", ""]
        : A.light > 238
          ? ["warn", "Sehr hell", ""]
          : ["good", "Licht gut", ""];
  const ed = !A.found
    ? ["warn", "Rand nicht erkannt", "Ecken selbst setzen"]
    : A.cut >= 0.12
      ? ["warn", "Abgeschnitten", "Rand fehlt"]
      : ["good", "Alles drauf", "4 Ecken"];
  let tx = null;
  if (info.lines) {
    const n = info.lines.length,
      r = n ? parseReceipt(info.lines) : {};
    tx = !n
      ? ["bad", "Kein Text", ""]
      : r.amount == null
        ? ["warn", `${n} Zeilen`, "kein Betrag"]
        : ["good", `${n} Zeilen`, "Betrag gefunden"];
  }
  R.push(["Schärfe", ...sh], ["Licht", ...li], ["Kanten", ...ed]);
  if (tx) R.push(["Text", ...tx]);
  $("drChecks").innerHTML = R.map(
    ([t, lv, a, b]) =>
      `<div class="drc ${lv}"><i></i><span><small>${t}</small><b>${a}</b>${b ? `<em>${b}</em>` : ""}</span></div>`
  ).join("");
  const tips = [];
  if (A.sharp < 45)
    tips.push("Halte das Handy ruhig und tippe vor dem Auslösen auf die Quittung, dann stellt die Kamera scharf.");
  if (A.light < 70) tips.push("Mehr Licht – z. B. näher ans Fenster.");
  if (A.glare > 0.05) tips.push("Etwas schräg halten, damit nichts spiegelt.");
  if (A.found && A.cut >= 0.12) tips.push("Etwas weiter weg, damit die ganze Quittung drauf ist.");
  if (!A.found)
    tips.push("Am besten auf einem dunklen Untergrund fotografieren – oder zieh die Ecken selbst an den Rand.");
  $("drTip").textContent = tips.join(" ");
  $("drTip").hidden = !tips.length;
}
function drMode(m) {
  DR.mode = m;
  document
    .querySelectorAll("[data-drmode]")
    .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.drmode === m)));
  $("drSvg").style.display = m === "frame" ? "" : "none";
  $("drImg").style.display = m === "frame" ? "" : "none";
  $("drOut").hidden = m !== "result";
  $("drTune").hidden = m !== "result";
  if (m === "result") drPreview();
}
let drT = null;
function drPreview() {
  clearTimeout(drT);
  drT = setTimeout(() => {
    if (!DR.warped || DR.warpKey !== JSON.stringify(DR.quad)) {
      DR.warped = docWarp(DR.im, DR.quad, 900);
      DR.warpKey = JSON.stringify(DR.quad);
    }
    const c = docEnhance(DR.warped, DR.contrast, DR.sharpen),
      o = $("drOut"),
      st = $("drStage").getBoundingClientRect(),
      k = Math.min(st.width / c.width, st.height / c.height);
    o.width = c.width;
    o.height = c.height;
    o.getContext("2d").drawImage(c, 0, 0);
    o.style.width = c.width * k + "px";
    o.style.height = c.height * k + "px";
  }, 30);
}
(function () {
  const st = $("drStage");
  let drag = -1;
  st.addEventListener("pointerdown", (e) => {
    const c = e.target.closest("[data-drc]");
    if (!c || DR.mode !== "frame") return;
    drag = Number(c.dataset.drc);
    st.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  st.addEventListener("pointermove", (e) => {
    if (drag < 0) return;
    const r = st.getBoundingClientRect(),
      im = DR.im;
    const x = Math.max(0, Math.min(im.naturalWidth, (e.clientX - r.left - DR.ox) / DR.k)),
      y = Math.max(0, Math.min(im.naturalHeight, (e.clientY - r.top - DR.oy) / DR.k));
    DR.quad[drag] = [x, y];
    drDraw();
  });
  const up = () => {
    if (drag < 0) return;
    drag = -1;
    const q = docQuality(DR.im, DR.quad);
    Object.assign(DR.A, q, {
      found: true,
      cut: 0,
    });
    drChecks();
    drDraw();
  };
  st.addEventListener("pointerup", up);
  st.addEventListener("pointercancel", up);
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-drmode]");
    if (b) drMode(b.dataset.drmode);
  });
  $("drCon").addEventListener("input", (e) => {
    DR.contrast = Number(e.target.value);
    drPreview();
  });
  $("drSha").addEventListener("input", (e) => {
    DR.sharpen = Number(e.target.value);
    drPreview();
  });
  $("drRetake").onclick = () =>
    drFinish({
      action: "retake",
    });
  $("drClose").onclick = () => drFinish(null);
  $("drUse").onclick = () => {
    $("drUse").disabled = true;
    setTimeout(() => {
      try {
        const w = docWarp(DR.im, DR.quad, 1600),
          c = docEnhance(w, DR.contrast, DR.sharpen);
        drFinish({
          action: "ok",
          img: c.toDataURL("image/jpeg", 0.8),
        });
      } catch (e) {
        drFinish({
          action: "ok",
          img: DR.im.src,
        });
      }
      $("drUse").disabled = false;
    }, 20);
  };
  addEventListener("resize", () => {
    if (!$("docRev").hidden) {
      drLayout();
      if (DR.mode === "result") drPreview();
    }
  });
  try {
    new ResizeObserver(() => {
      if (!$("docRev").hidden && DR.im) drLayout();
    }).observe(st);
  } catch (_) {}
})();
async function runScan(source, attachOnly, fresh, fileIn) {
  const busy = fresh
    ? (on) => {
        if (on) toast("Quittung wird gelesen …", null, null, 8000);
      }
    : scanBusy;
  try {
    let lines,
      img = null;
    if (NATIVE_SCAN && !fileIn) {
      busy(true);
      const res = await scanNative(source);
      if (!res) {
        busy(false);
        return;
      }
      if (Array.isArray(res)) lines = res;
      else {
        lines = res.lines || [];
        img = res.img || null;
      }
      busy(false);
      if (img) {
        const rv = await docReview(img, {
          lines: attachOnly ? null : lines,
        });
        if (!rv) return;
        if (rv.action === "retake") return runScan(source, attachOnly, fresh);
        img = rv.img;
      }
    } else {
      const f =
        fileIn ||
        (await new Promise((r) => {
          const inp = $("scanFile");
          inp.value = "";
          inp.onchange = () => {
            const fs = [...(inp.files || [])];
            if (fs.length > 1 && !attachOnly) {
              inbOpen(fs, {
                type: "bon",
                mode: "single",
              });
              r(null);
            } else r(fs[0] || null);
          };
          inp.click();
        }));
      if (!f) return;
      try {
        img = await shrinkImage(f);
      } catch (e) {}
      if (img) {
        const rv = await docReview(img, {});
        if (!rv) return;
        if (rv.action === "retake") return runScan(source, attachOnly, fresh);
        img = rv.img;
      }
      if (attachOnly) {
        lines = [];
      } else lines = await scanImageFile(img || f);
    }
    busy(false);
    if (!attachOnly && img && typeof camReview === "function") {
      try {
        let L = lines || [],
          nb = true;
        if (canNativeOcr()) {
          scanWorking(true);
          try {
            const l2 = await ocrDataUrl(img);
            if (l2 && l2.length) {
              L = l2;
              nb = false;
            }
          } catch (e) {}
          scanWorking(false);
        }
        const im = await loadImg(img),
          r = docClassify(L, im.naturalHeight / im.naturalWidth);
        if (r && r.type && r.type !== "rcpt") {
          if (!$("sheetBg").hidden) closeSheet();
          camReview({
            type: r.type,
            img,
            lines: L,
            W: im.naturalWidth,
            H: im.naturalHeight,
            noBoxes: nb,
          });
          return;
        }
      } catch (e) {
        scanWorking(false);
      }
    }
    if (fresh) openSheet("ausgabe");
    if (img) {
      ui.rcpt = {
        state: "new",
        img,
      };
      renderRcptRow();
    }
    if (attachOnly) {
      if (!img) {
        toast("Das Foto konnte nicht übernommen werden");
        return;
      }
      try {
        let L = lines || [];
        if (canNativeOcr()) {
          scanWorking(true);
          try {
            L = await ocrBest(img, L.length ? L : null);
          } catch (e) {}
          scanWorking(false);
        } else if (!L.length) L = await scanImageFile(img);
        window.HB_OCR = L;
        const its = receiptItems(L || []);
        if (its.length) {
          const pr = parseReceipt(L);
          ui.scanItems = {
            items: its.map((i) => ({
              r: i.n,
              p: i.p,
            })),
            shop: zaShopId(pr.shop || $("fNote").value),
          };
          ui.zbOpen = true;
          zBonRender();
          if (!ui.editId)
            toast(`${its.length} Artikel vom Bon gelesen – wird mit der Buchung gespeichert`, null, null, 4000);
        } else {
          const ct = ui.editId && store.tx.find((x) => x.id === ui.editId);
          if (ct && ct.items && ct.items.length) {
            ui.scanItems = {
              items: [],
              shop: null,
              cleared: true,
            };
            zBonRender();
          }
        }
      } catch (e) {
        scanWorking(false);
        scanBusy(false);
      }
      if (ui.editId) await rcptSwapNow(ui.editId, img);
      return;
    }
    const r = parseReceipt(lines || []);
    if (r.amount == null) {
      toast("Auf der Quittung wurde kein Betrag gefunden");
      return;
    }
    ui.kind = "ausgabe";
    if (r.cat) ui.cat = r.cat;
    $("fAmount").value = r.amount.toFixed(2).replace(".", ",");
    if (r.date) $("fDate").value = r.date;
    if (r.shop && !$("fNote").value.trim()) $("fNote").value = r.shop;
    renderSheet();
    let nItems = 0;
    try {
      const its = receiptItems(lines || []);
      nItems = rememberPrices(r.shop, r.date, its);
      ui.scanItems = its.length
        ? {
            items: its.map((i) => ({
              r: i.n,
              p: i.p,
            })),
            shop: zaShopId(r.shop),
          }
        : null;
      zBonRender();
    } catch (e) {}
    toast(
      `Erkannt: ${fmtEur(r.amount)}${r.date ? " am " + shortDate(r.date) : ""}${nItems ? ` · ${nItems} Preise gemerkt` : ""} – bitte kurz prüfen`,
      null,
      null,
      4000
    );
  } catch (e) {
    busy(false);
    toast(e.message || "Quittung konnte nicht gelesen werden");
  }
}
$("scanCam").onclick = () => runScan("camera");
$("scanPick").onclick = () => runScan("gallery");
$("sheetBg").addEventListener("click", (e) => {
  if (e.target === $("sheetBg")) closeSheet();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("sheetBg").hidden) closeSheet();
});
$("saveBtn").onclick = saveTx;
$("delBtn").onclick = deleteTx;
const TOUCH =
  (NATIVE && !(window.AndroidBridge && window.AndroidBridge.desktop)) || matchMedia("(pointer:coarse)").matches;
if (TOUCH) {
  document.documentElement.classList.add("touch");
  $("fAmount").setAttribute("inputmode", "none");
}
$("fAmount").addEventListener("input", fxSheetHint);
$("kpad").addEventListener("click", (e) => {
  const b = e.target.closest("[data-kp]");
  if (!b) return;
  e.preventDefault();
  const el = $("fAmount");
  let v = el.value.replace(/[^\d,]/g, "");
  const k = b.dataset.kp;
  if (k === "back") v = v.slice(0, -1);
  else if (k === ",") {
    if (!v.includes(",")) v = (v || "0") + ",";
  } else {
    const dec = v.split(",")[1];
    if (dec !== undefined && dec.length >= 2) return;
    if (v === "0") v = "";
    if (v.replace(",", "").length >= 8) return;
    v += k;
  }
  el.value = v;
  el.dispatchEvent(
    new Event("input", {
      bubbles: true,
    })
  );
  if (navigator.vibrate)
    try {
      navigator.vibrate(8);
    } catch (_) {}
});
["fAmount", "fNote"].forEach((id) =>
  $(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveTx();
  })
);
async function togglePaid(fid) {
  const ym = ui.ym,
    f = store.fixed.find((x) => x.id === fid);
  if (!f) return;
  const m = clone(
    store.months[ym] || {
      paid: {},
    }
  );
  m.paid = m.paid || {};
  motAdd(`[data-pay="${fid}"]`, fid in m.paid ? "uncheck" : "check");
  const wasPaid = fid in m.paid;
  if (wasPaid) {
    delete m.paid[fid];
    if (m.man) delete m.man[fid];
  } else {
    m.paid[fid] = planAmt(f, ym);
    (m.man = m.man || {})[fid] = {
      d: isoToday(),
      ts: Date.now(),
    };
  }
  try {
    const all = fixedForMonth(ym, true);
    SND.play(wasPaid ? "untick" : all.length > 1 && all.every((x) => x.id in m.paid) ? "done" : "tick");
  } catch (_) {}
  await safe(() => saveDoc("months", ym, m));
}
async function payAll() {
  const ym = ui.ym,
    before = clone(
      store.months[ym] || {
        paid: {},
      }
    ),
    m = clone(before);
  m.paid = m.paid || {};
  for (const f of fixedForMonth(ym, true))
    if (!(f.id in m.paid)) {
      m.paid[f.id] = planAmt(f, ym);
      (m.man = m.man || {})[f.id] = {
        d: isoToday(),
        ts: Date.now(),
      };
    }
  if (await safe(() => saveDoc("months", ym, m))) {
    SND.play("done");
    toast("Alle abgehakt", () => safe(() => saveDoc("months", ym, before)));
  }
}
async function setMonthAmount(fid, v) {
  const ym = ui.ym,
    f = store.fixed.find((x) => x.id === fid);
  if (!f) return;
  const before = clone(
      store.months[ym] || {
        paid: {},
      }
    ),
    m = clone(before);
  m.paid = m.paid || {};
  v = round2(v);
  if (fid in m.paid) m.paid[fid] = v;
  else {
    m.amounts = m.amounts || {};
    if (Math.abs(v - listAmt(f, ym)) < 0.005) delete m.amounts[fid];
    else m.amounts[fid] = v;
  }
  ui.amtEdit = null;
  const changed = Math.abs(v - listAmt(f, ym)) > 0.004;
  if (await safe(() => saveDoc("months", ym, m))) {
    if (changed)
      toast(
        `${f.name}: ${fmtEur(v)} im ${MONTHS[Number(ym.slice(5, 7)) - 1]}`,
        () => priceFrom(fid, ym, v),
        "Ab jetzt immer",
        7000
      );
    else
      toast(`${f.name}: ${fmtEur(v)} im ${MONTHS[Number(ym.slice(5, 7)) - 1]}`, () =>
        safe(() => saveDoc("months", ym, before))
      );
  }
  renderFix();
}
async function priceFrom(fid, ym, v) {
  const f = store.fixed.find((x) => x.id === fid);
  if (!f) return;
  const d = {
    ...f,
  };
  delete d.id;
  const np = withPrice(f, ym, v);
  d.amount = np.amount;
  if (np.prices) d.prices = np.prices;
  else delete d.prices;
  if (!(await safe(() => saveDoc("fixed", fid, d)))) return;
  const m = store.months[ym];
  if (m && m.amounts && fid in m.amounts) {
    const c = clone(m);
    delete c.amounts[fid];
    await safe(() => saveDoc("months", ym, c));
  }
  toast(`${f.name}: ${fmtEur(v)} ab ${monthName(ym)}`);
  renderFix();
}
async function toggleFixMonth(fid, mo) {
  const f = store.fixed.find((x) => x.id === fid);
  if (!f) return;
  const d = {
    ...f,
  };
  delete d.id;
  const ms = new Set(f.months || []),
    n = Number(mo);
  if (ms.has(n)) ms.delete(n);
  else ms.add(n);
  if (!ms.size) {
    toast("Mindestens ein Monat muss ausgewählt sein");
    return;
  }
  d.months = [...ms].sort((a, b) => a - b);
  const preset = rhythmMonths(d.rhythm, d.months[0]);
  if (!preset || preset.join() !== d.months.join()) d.rhythm = "monate";
  await safe(() => saveDoc("fixed", fid, d));
}
$("v-fix").addEventListener("keydown", (e) => {
  if (e.target.id !== "fxAmtIn") return;
  if (e.key === "Enter") e.target.blur();
  if (e.key === "Escape") {
    ui.amtEdit = null;
    e.target.dataset.cancel = "1";
    e.target.blur();
  }
});
$("v-fix").addEventListener("focusout", (e) => {
  const el = e.target;
  if (el.id !== "fxAmtIn") return;
  if (el.dataset.cancel === "1") {
    ui.amtEdit = null;
    setTimeout(renderFix, 0);
    return;
  }
  const v = parseAmt(el.value);
  if (!(v >= 0)) {
    toast("Betrag ungültig");
    ui.amtEdit = null;
    setTimeout(renderFix, 0);
    return;
  }
  setMonthAmount(el.dataset.fxamtin, v);
});
$("v-fix").addEventListener("change", async (e) => {
  const el = e.target.closest("[data-fxf]");
  if (!el) return;
  const id = el.closest("[data-fid]").dataset.fid,
    f = store.fixed.find((x) => x.id === id);
  if (!f) return;
  const d = {
    ...f,
  };
  delete d.id;
  const k = el.dataset.fxf;
  if (k === "amount") {
    const v = parseAmt(el.value);
    if (!(v >= 0)) {
      toast("Betrag ungültig");
      return;
    }
    const nv = round2(v),
      old = listAmt(f, ui.ym);
    if (Math.abs(nv - old) < 0.005) return;
    const np = withPrice(f, ui.ym, nv);
    d.amount = np.amount;
    if (np.prices) d.prices = np.prices;
    else delete d.prices;
    if (await safe(() => saveDoc("fixed", id, d))) toast(`${f.name}: ${fmtEur(nv)} ab ${monthName(ui.ym)}`);
    return;
  } else if (k === "name") {
    const v = el.value.trim();
    if (!v) return;
    d.name = v;
  } else if (k === "rhythm") {
    const cur = Number(ui.ym.slice(5, 7)),
      had = Array.isArray(f.months) && f.months.length;
    d.rhythm = el.value;
    if (el.value === "monatlich") delete d.months;
    else if (el.value === "monate") d.months = had ? f.months.slice() : [cur];
    else d.months = rhythmMonths(el.value, had ? Math.min(...f.months) : cur);
    await safe(() => saveDoc("fixed", id, d));
    el.blur();
    renderFix();
    return;
  } else d.kind = el.value;
  await safe(() => saveDoc("fixed", id, d));
});
$("debtCard").addEventListener("change", async (e) => {
  const pc = e.target.closest("[data-pf]");
  if (pc) {
    const id = pc.closest("[data-did]").dataset.did,
      o = store.debts.find((x) => x.id === id);
    if (!o) return;
    const plan = debtPlan(o).map((r) => ({
        ...r,
      })),
      i = Number(pc.closest("[data-prow]").dataset.prow),
      k = pc.dataset.pf;
    if (k === "ym") {
      const ym = planYm(pc.value);
      if (!ym) {
        toast("Monat bitte als MM/JJJJ, z. B. 03/2027");
        return;
      }
      plan[i].ym = ym;
    } else {
      const raw = pc.value.trim();
      if (raw === "") {
        plan[i][k] = null;
      } else {
        const v = parseAmt(raw);
        if (!(v >= 0)) {
          toast("Betrag ungültig");
          return;
        }
        plan[i][k] = round2(v);
      }
    }
    const d = {
      ...o,
    };
    delete d.id;
    d.plan = plan;
    await safe(() => saveDoc("debts", id, d));
    return;
  }
  const el = e.target.closest("[data-df]");
  if (!el) return;
  const id = el.closest("[data-did]").dataset.did,
    o = store.debts.find((x) => x.id === id);
  if (!o) return;
  const d = {
    ...o,
  };
  delete d.id;
  const k = el.dataset.df;
  if (k === "start") {
    const v = parseAmt(el.value);
    if (!(v >= 0)) {
      toast("Betrag ungültig");
      return;
    }
    d.start = round2(v);
  } else if (k === "zins") {
    const raw = el.value.trim();
    const v = raw === "" ? 0 : parseAmt(raw);
    if (!(v >= 0 && v < 100)) {
      toast("Zinssatz ungültig");
      return;
    }
    d.zins = v;
  } else if (k === "auto") d.auto = el.checked;
  else if (k === "orig") {
    const raw = el.value.trim();
    const v = raw === "" ? 0 : parseAmt(raw);
    if (!(v >= 0)) {
      toast("Betrag ungültig");
      return;
    }
    if (v) d.orig = round2(v);
    else delete d.orig;
  } else d[k] = el.value.trim();
  await safe(() => saveDoc("debts", id, d));
});
function bindNum(id, apply) {
  $(id).addEventListener("change", () => {
    const raw = $(id).value.trim();
    const v = raw === "" ? 0 : parseAmt(raw);
    if (!isFinite(v)) {
      toast("Bitte eine Zahl eingeben");
      return;
    }
    apply(v, raw);
    render();
    saveSettings();
    toast("Gespeichert");
  });
}
bindNum("sStart", (v, raw) => {
  const y = ui.ym.slice(0, 4);
  store.settings.startBalance = {
    ...(store.settings.startBalance || {}),
  };
  if (raw === "") delete store.settings.startBalance[y];
  else store.settings.startBalance[y] = round2(v);
});
bindNum("sRate", (v) => (store.settings.reserveRate = Math.min(100, Math.max(0, v))));
bindNum("sKUlimit", (v) => (store.settings.kuLimit = v));
bindNum("sVat", (v) => (store.settings.vatRate = v));
bindNum("sVors", (v) => (store.settings.vorsorge = v));
bindNum("sAbz", (v) => (store.settings.abzuege = v));
bindNum("sPartner", (v) => (store.settings.partnerZvE = v));
bindNum("sWK", (v) => (store.settings.werbungskosten = v));
bindNum("sHebe", (v) => (store.settings.hebesatz = v));
function setLohn(field, v) {
  const y = ui.ym.slice(0, 4),
    l = {
      ...(store.settings.lohn || {}),
    },
    cur = lohnYear(y);
  const o = {
    ...(l[y] || {}),
  };
  if (o.monat == null) o.monat = cur.monat;
  o[field] = v;
  l[y] = o;
  store.settings.lohn = l;
  o.brutto = lohnYear(y).brutto;
}
bindNum("sLohnM", (v, raw) => setLohn("monat", raw === "" ? 0 : round2(v)));
$("sMind").addEventListener("change", (e) => {
  const m = (store.settings.mindest = {
    ...(store.settings.mindest || {}),
  });
  m.on = e.target.checked;
  if (m.on && !m.h) m.h = 40;
  render();
  saveSettings();
  toast("Gespeichert");
});
bindNum("sMindH", (v) => {
  store.settings.mindest = {
    ...(store.settings.mindest || {}),
    h: Math.min(60, Math.max(0, v)),
  };
});
bindNum("sUrlaub", (v) => setLohn("urlaub", round2(v)));
bindNum("sWeih", (v) => setLohn("weihnacht", round2(v)));
bindNum("sBonus", (v) => setLohn("bonus", round2(v)));
$("sLohnN").addEventListener("change", () => {
  setLohn("n", Number($("sLohnN").value) || 12);
  render();
  saveSettings();
  toast("Gespeichert");
});
bindNum("sLSt", (v, raw) => {
  const y = ui.ym.slice(0, 4),
    l = {
      ...(store.settings.lohn || {}),
    };
  l[y] = {
    ...(l[y] || {}),
  };
  if (raw === "") delete l[y].lst;
  else l[y].lst = round2(v);
  store.settings.lohn = l;
});
for (const [id, key, num] of [
  ["sKlasse", "steuerklasse", true],
  ["sKinder", "kinder", true],
  ["sLand", "land", false],
])
  $(id).addEventListener("change", (e) => {
    store.settings[key] = num ? Number(e.target.value) : e.target.value;
    render();
    saveSettings();
    toast("Gespeichert");
  });
$("sLogos").addEventListener("change", (e) => {
  store.settings.logos = e.target.checked;
  render();
  saveSettings();
});
$("sKirche").addEventListener("change", (e) => {
  store.settings.kirche = e.target.checked;
  render();
  saveSettings();
});
$("sGew").addEventListener("change", (e) => {
  store.settings.gewerbe = e.target.checked;
  render();
  saveSettings();
});
$("sKU").addEventListener("change", (e) => {
  store.settings.kleinunternehmer = e.target.checked;
  render();
  saveSettings();
});
$("sSplit").addEventListener("change", (e) => {
  store.settings.splitting = e.target.checked;
  render();
  saveSettings();
});
$("sWork").addEventListener("change", (e) => setWork(e.target.value));
document.addEventListener("change", (e) => {
  const r = e.target.closest && e.target.closest("[data-rentstart]");
  if (!r) return;
  const v = Number(r.value);
  if (v >= 1960 && v <= 2060) {
    store.settings.rentStart = v;
    saveSettings();
  }
});
$("catEd-einnahme").addEventListener("change", (e) => {
  const el = e.target.closest("[data-incart]");
  if (!el) return;
  const c = clone(store.settings.cats || DEFAULT_SETTINGS.cats);
  c.einnahme = c.einnahme.map((x) => {
    const o =
      typeof x === "string"
        ? {
            name: x,
            art: "sonstige",
          }
        : x;
    return o.name === el.dataset.incart
      ? {
          ...o,
          art: el.value,
        }
      : o;
  });
  store.settings.cats = c;
  render();
  saveSettings();
});

/* ===== Mehrere Seiten lesen ===== */
const isPdfF = (f) => /pdf/i.test(f.type || "") || /\.pdf$/i.test(f.name || "");
async function stitchImgs(urls) {
  if (urls.length < 2) return urls[0] || null;
  const ims = [];
  for (const u of urls) {
    try {
      ims.push(await loadImg(u));
    } catch (_) {}
  }
  if (!ims.length) return urls[0];
  const W = Math.min(1100, Math.max(...ims.map((i) => i.naturalWidth))),
    gap = 18;
  let H = ims.reduce((a, i) => a + Math.round((i.naturalHeight * W) / i.naturalWidth), 0) + gap * (ims.length - 1);
  const k = H > 14000 ? 14000 / H : 1;
  const c = document.createElement("canvas");
  c.width = Math.round(W * k);
  c.height = Math.round(H * k);
  const g = c.getContext("2d");
  g.fillStyle = "#d9dcd9";
  g.fillRect(0, 0, c.width, c.height);
  let y = 0;
  for (const i of ims) {
    const h = Math.round(((i.naturalHeight * W) / i.naturalWidth) * k);
    g.drawImage(i, 0, y, c.width, h);
    y += h + Math.round(gap * k);
  }
  return c.toDataURL("image/jpeg", 0.8);
}
async function readPages(fs, onFirst) {
  const lines = [],
    imgs = [],
    txt = [];
  let err = false;
  for (let k = 0; k < fs.length; k++) {
    const f = fs[k];
    let L = [],
      img = null;
    try {
      if (isPdfF(f)) {
        const r = await stbPdf(f);
        L = ocrPlus(r.lines);
        img = r.img;
      } else {
        img = await tmShrink(f);
        if (!k && onFirst) onFirst(img);
        L = await ocrImgFile(f);
      }
    } catch (_) {
      if (isPdfF(f)) err = true;
    }
    txt.push(window.HB_OCRTXT || "");
    const off = k * 100000;
    for (const l of L || [])
      lines.push(
        l && typeof l === "object" && typeof l.y === "number"
          ? {
              ...l,
              y: l.y + off,
            }
          : l
      );
    if (img) imgs.push(img);
  }
  window.HB_OCRTXT = txt.filter(Boolean).join("\n\n");
  let img = null;
  try {
    img = await stitchImgs(imgs);
  } catch (_) {
    img = imgs[0] || null;
  }
  return {
    lines,
    img,
    pages: imgs.length,
    err,
  };
}

/* ===== Ablage: mehrere Bilder, Seiten oder geteilte Dateien ===== */
const INB = {
  files: [],
  type: null,
  mode: "pages",
  q: [],
  qt: null,
  urls: [],
};
const INB_T = [
  ["br", "mail", "in_br"],
  ["stb", "doctax", "in_stb"],
  ["bs", "doccheck", "in_bs"],
  ["rch", "docout", "in_rch"],
  ["bon", "receipt", "in_bon"],
  ["beleg", "clip", "in_beleg"],
  ["konto", "bank", "in_konto"],
];
const INB_PAGES = ["br", "stb", "bs", "rch"];
function inbKinds() {
  const fs = INB.files,
    img = fs.some(
      (f) =>
        /^image\//.test(f.type || "") || (!isPdfF(f) && !/csv|text/.test(f.type || "") && !/\.csv$/i.test(f.name || ""))
    ),
    pdf = fs.some(isPdfF),
    csv = fs.some((f) => /csv/i.test(f.type || "") || /\.csv$/i.test(f.name || ""));
  if (csv) return ["konto"];
  return INB_T.map((t) => t[0]).filter((k) =>
    k === "konto" ? pdf && !img : k === "bon" || k === "beleg" || k === "bs" ? !pdf : true
  );
}
/* Geteilt, hereingezogen oder eingefügt: Die App erkennt selbst, was es ist (Dokumenten-Ablage).
   CSV-Umsätze und E-Rechnungen (XML) gehen weiter den bekannten Weg. */
function inbAuto(fs) {
  const a = [...fs];
  if (a.some((f) => /csv|xml/i.test(f.type || "") || /\.(csv|xml)$/i.test(f.name || ""))) return inbOpen(a);
  return dokUpload(a);
}
function inbOpen(files, o) {
  o = o || {};
  if (!o.checked && hasSelf() && [...files].some((f) => isXmlF(f) || isPdfF(f))) {
    erTake([...files]).then((rest) => rest.length && inbOpen(rest, { ...o, checked: 1 }));
    return;
  }
  INB.urls.forEach((u) => {
    try {
      URL.revokeObjectURL(u);
    } catch (_) {}
  });
  INB.files = [...files].slice(0, 20);
  INB.urls = INB.files.map((f) => (isPdfF(f) ? "" : URL.createObjectURL(f)));
  const K = inbKinds();
  if (K.length === 1 && K[0] === "konto" && INB.files.length === 1) {
    inbClose();
    return loadCsv(INB.files[0]);
  }
  INB.type = o.type && K.includes(o.type) ? o.type : K.length === 1 ? K[0] : null;
  INB.mode = o.mode || "pages";
  hbSheet("inBg", "");
  inbRender(true);
}
function inbClose() {
  try {
    hbSheetClose("inBg");
  } catch (_) {}
}
function inbRender(first) {
  const bg = $("inBg");
  if (!bg || bg.hidden) return;
  const b = bg.querySelector(".hobody"),
    n = INB.files.length,
    K = inbKinds(),
    T = INB.type;
  if (!n) {
    inbClose();
    return;
  }
  bg.querySelector(".hbst").textContent = uiText(n === 1 ? "in_t1" : "in_t", {
    n: String(n),
  });
  const pg = T && INB_PAGES.includes(T) && n > 1,
    single = (!pg && n > 1) || (pg && INB.mode === "single");
  const lbl = !T
    ? uiText("in_pick")
    : uiText("in_go_" + T + (single && n > 1 && T !== "konto" ? "_n" : ""), {
        n: String(n),
      });
  b.innerHTML = `<p class="small muted" style="margin:-4px 2px 10px">${escHtml(uiText("in_s"))}</p>
    <div class="inth">${INB.files.map((f, i) => `<div class="inpg" style="--d:${i * 55}ms">${INB.urls[i] ? `<img src="${INB.urls[i]}" alt="">` : `<span class="inpdf">${svgIcon("doc", 30)}<small>PDF</small></span>`}<b>${i + 1}</b><button type="button" class="inrm" data-inrm="${i}" aria-label="${escHtml(uiText("in_rm"))}">${svgIcon("x", 12)}</button></div>`).join("")}<label class="inpg inadd" style="--d:${n * 55}ms" aria-label="${escHtml(uiText("in_more"))}">${svgIcon("plus", 26)}<input type="file" id="inMore" accept="image/*,application/pdf,.pdf" multiple hidden></label></div>
    ${
      pg
        ? `<div class="inseg" role="radiogroup"><button type="button" class="${INB.mode === "pages" ? "on" : ""}" data-inmode="pages">${escHtml(uiText("in_pages"))}</button><button type="button" class="${INB.mode === "single" ? "on" : ""}" data-inmode="single">${escHtml(
            uiText("in_single", {
              n: String(n),
            })
          )}</button></div>`
        : ""
    }
    <div class="ingrid">${INB_T.filter((t) => K.includes(t[0]))
      .map(
        ([k, icn, l], i) =>
          `<button type="button" class="${T === k ? "on" : ""}" data-intype="${k}" style="--d:${i * 40}ms"><i>${svgIcon(icn, 22)}</i><span>${escHtml(uiText(l))}</span></button>`
      )
      .join("")}</div>
    <button type="button" class="btn primary block ingo" style="justify-content:center" data-ingo ${T ? "" : "disabled"}>${escHtml(lbl)}</button>`;
  if (first && !reducedMotion()) b.querySelectorAll(".inpg,.ingrid button").forEach((x) => x.classList.add("inap"));
}
function inbBusy() {
  return !!document.querySelector(
    "#sheetBg:not([hidden]), #camRev:not([hidden]), #docRev:not([hidden]), .hobg:not([hidden]):not(#inBg), #importBg:not([hidden])"
  );
}
function inbPump() {
  clearInterval(INB.qt);
  if (!INB.q.length) return;
  INB.qt = setInterval(() => {
    if (inbBusy()) return;
    const it = INB.q.shift();
    if (!INB.q.length) clearInterval(INB.qt);
    if (it) inbRun(it.t, it.f, it.i, it.n);
  }, 700);
}
async function inbRun(t, f, i, n) {
  if (n > 1)
    toast(
      uiText("in_next", {
        i: String(i + 1),
        n: String(n),
      })
    );
  if (t === "br") {
    brOpen();
    return brScan(f);
  }
  if (t === "stb") {
    stbOpen();
    return stbScan(f);
  }
  if (t === "bs") {
    bsOpen();
    return bsScan(f);
  }
  if (t === "rch") return rchScan(f);
  if (t === "bon") return runScan("gallery", false, true, Array.isArray(f) ? f[0] : f);
  if (t === "beleg") return inbBeleg(Array.isArray(f) ? f[0] : f, i, n);
  if (t === "konto") return loadCsv(Array.isArray(f) ? f[0] : f);
}
function inbGo() {
  const T = INB.type,
    fs = INB.files.slice(),
    n = fs.length;
  if (!T || !n) return;
  const pages = INB_PAGES.includes(T) && INB.mode === "pages";
  inbClose();
  INB.files = [];
  if (T === "konto" && n > 1) toast(uiText("in_konto1"));
  const jobs = pages
    ? [
        {
          t: T,
          f: fs.length > 1 ? fs : fs[0],
          i: 0,
          n: 1,
        },
      ]
    : (T === "konto" ? [fs[0]] : fs).map((f, i, a) => ({
        t: T,
        f,
        i,
        n: a.length,
      }));
  const first = jobs.shift();
  INB.q = jobs;
  setTimeout(() => {
    inbRun(first.t, first.f, first.i, first.n);
    inbPump();
  }, 260);
}
async function inbBeleg(f, i, n) {
  let img;
  try {
    img = await tmShrink(f);
  } catch (_) {
    toast(uiText("bs_err_img"));
    return;
  }
  const td = isoToday(),
    lim = addDays(td, -60),
    L = store.tx
      .filter(
        (t) => t.date >= lim && t.kind !== "einnahme" && t.kind !== "umbuchung" && !(RCPT.ids && RCPT.ids.has(t.id))
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 40);
  const b = hbSheet(
    "inBelBg",
    uiText(n > 1 ? "in_bel_tn" : "in_bel_t", {
      i: String(i + 1),
      n: String(n),
    })
  );
  b.innerHTML = `<div class="inbel"><img src="${img}" alt=""><p class="small muted">${escHtml(uiText("in_bel_s"))}</p></div>
    ${L.length ? `<div class="inbl">${L.map((t, k) => `<button type="button" data-inbel="${escHtml(t.id)}" style="--d:${Math.min(k, 12) * 30}ms"><span class="grow"><b>${escHtml(t.note || t.cat || "–")}</b><small>${escHtml(shortDate(t.date))} · ${escHtml(t.cat || "")}</small></span><b class="amt">${escHtml(fmtEur(t.amount))}</b></button>`).join("")}</div>` : `<p class="small muted">${escHtml(uiText("in_bel_none"))}</p>`}`;
  INB.belImg = img;
}
document.addEventListener("click", async (e) => {
  const t = e.target;
  const rm = t.closest("[data-inrm]");
  if (rm) {
    e.preventDefault();
    const k = +rm.dataset.inrm;
    const pg = rm.closest(".inpg");
    const go = () => {
      INB.files.splice(k, 1);
      const u = INB.urls.splice(k, 1)[0];
      try {
        u && URL.revokeObjectURL(u);
      } catch (_) {}
      if (INB.type && !inbKinds().includes(INB.type)) INB.type = null;
      inbRender();
    };
    if (pg && !reducedMotion()) {
      pg.classList.add("out");
      setTimeout(go, 220);
    } else go();
    return;
  }
  const md = t.closest("[data-inmode]");
  if (md) {
    INB.mode = md.dataset.inmode;
    inbRender();
    return;
  }
  const ty = t.closest("[data-intype]");
  if (ty) {
    INB.type = ty.dataset.intype;
    inbRender();
    const nb = $("inBg") && $("inBg").querySelector(`[data-intype="${INB.type}"]`);
    if (nb && !reducedMotion())
      nb.animate(
        [
          {
            transform: "scale(.92)",
          },
          {
            transform: "scale(1.04)",
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 320,
          easing: "ease-out",
        }
      );
    return;
  }
  if (t.closest("[data-ingo]")) {
    inbGo();
    return;
  }
  const bl = t.closest("[data-inbel]");
  if (bl) {
    const id = bl.dataset.inbel;
    try {
      await rcptPut(id, INB.belImg);
      toast(uiText("in_bel_ok"));
    } catch (err) {
      reportErr(err);
    }
    hbSheetClose("inBelBg");
    render();
    return;
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id !== "inMore") return;
  const fs = [...(e.target.files || [])];
  e.target.value = "";
  if (!fs.length) return;
  INB.files = INB.files.concat(fs).slice(0, 20);
  INB.urls = INB.urls.concat(fs.map((f) => (isPdfF(f) ? "" : URL.createObjectURL(f)))).slice(0, 20);
  if (INB.type && !inbKinds().includes(INB.type)) INB.type = null;
  inbRender(true);
});
/* Geteilt aus anderen Apps (Android) */
window.hbShared = async () => {
  const B = window.AndroidBridge;
  if (!B || !B.sharedList) return;
  let L = [];
  try {
    L = JSON.parse(B.sharedList() || "[]");
  } catch (_) {
    L = [];
  }
  if (!L.length) return;
  const fs = [];
  for (let k = 0; k < L.length; k++) {
    try {
      const b64 = B.sharedData(k);
      if (!b64) continue;
      const bin = atob(b64),
        u8 = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) u8[j] = bin.charCodeAt(j);
      fs.push(
        new File([u8], L[k].name || "datei" + k, {
          type: L[k].type || "",
        })
      );
    } catch (_) {}
  }
  try {
    B.sharedClear();
  } catch (_) {}
  if (fs.length) inbAuto(fs);
};
setTimeout(() => {
  try {
    window.hbShared();
  } catch (_) {}
}, 1800);
/* PC: Dateien ins Fenster ziehen oder einfügen */
(function () {
  let dc = 0;
  const ov = () => {
    let o = $("inDrop");
    if (!o) {
      o = document.createElement("div");
      o.id = "inDrop";
      o.hidden = true;
      o.innerHTML = `<div>${svgIcon("docout", 44)}<b></b></div>`;
      document.body.appendChild(o);
    }
    o.querySelector("b").textContent = uiText("in_drop");
    return o;
  };
  /* Zieht man etwas innerhalb der App (z. B. eine Fixkosten-Kachel mit Logo), legt der Browser das
     Logo-Bild als „Datei“ mit in den Zug. Solche Züge sind keine Dateien von außen. */
  let inside = false;
  document.addEventListener("dragstart", () => (inside = true), true);
  document.addEventListener("dragend", () => (inside = false), true);
  document.addEventListener("pointerdown", () => (inside = false), true);
  const hasF = (e) => !inside && e.dataTransfer && [...(e.dataTransfer.types || [])].includes("Files");
  window.addEventListener("dragenter", (e) => {
    if (!hasF(e)) return;
    e.preventDefault();
    dc++;
    const o = ov();
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("show"));
  });
  window.addEventListener("dragover", (e) => {
    if (hasF(e)) e.preventDefault();
  });
  window.addEventListener("dragleave", (e) => {
    if (!hasF(e)) return;
    dc = Math.max(0, dc - 1);
    if (!dc) {
      const o = ov();
      o.classList.remove("show");
      setTimeout(() => {
        if (!dc) o.hidden = true;
      }, 180);
    }
  });
  window.addEventListener("drop", (e) => {
    if (!hasF(e)) {
      inside = false;
      return;
    }
    e.preventDefault();
    dc = 0;
    const o = ov();
    o.classList.remove("show");
    o.hidden = true;
    const fs = [...(e.dataTransfer.files || [])].filter(
      (f) => /^image\/|pdf|csv/i.test(f.type || "") || /\.(pdf|csv|jpe?g|png|heic|webp)$/i.test(f.name || "")
    );
    if (fs.length) inbAuto(fs);
  });
  window.addEventListener("paste", (e) => {
    const a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable)) return;
    const fs = [...((e.clipboardData && e.clipboardData.files) || [])].filter((f) =>
      /^image\/|pdf/i.test(f.type || "")
    );
    if (fs.length) {
      e.preventDefault();
      inbAuto(fs);
    }
  });
})();
async function brScan(file) {
  const fs = Array.isArray(file) ? file : [file];
  let lines = [];
  BR.img = null;
  BR.st = 1;
  brRender();
  const t0 = performance.now();
  {
    const R = await readPages(fs, (im) => {
      BR.img = im;
      brRender();
    });
    lines = R.lines;
    BR.img = R.img || BR.img;
    if (R.err) toast(uiText("stb_pdf_err"));
  }
  const wait = Math.max(0, 2000 - (performance.now() - t0));
  await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : wait));
  const { d, F } = brParse(lines || []);
  BR.txt = ocrText(lines || []);
  BR.aiDone = 0;
  BR.bot = null;
  try {
    await aiCheck();
  } catch (_) {}
  if (aiOn() && BR.txt.length > 40 && $("brBg") && !$("brBg").hidden) {
    BR.bot = {
      d: {
        ...d,
      },
      F: {
        ...F,
      },
    };
    BR.d = {};
    BR.F = {};
    BR.edit = null;
    BR.act = {
      due: 1,
      term: 1,
      pay: 1,
      wid: 1,
    };
    BR.aiOffer = 0;
    return brAiGo();
  }
  BR.aiOffer = aiOn() && BR.txt.length > 40 && aiUnsure(d, F);
  BR.d = d;
  BR.F = F;
  BR.edit = null;
  BR.act = {
    due: 1,
    term: 1,
    pay: 1,
    wid: 1,
  };
  BR.st = 2;
  BR.scanned = true;
  brRender();
  if (!Object.keys(F || {}).length) toast(uiText("bs_nothing"));
}
function brReadForm() {
  const bg = $("brBg"),
    d = {
      ...(BR.d || {}),
    };
  bg.querySelectorAll("[data-brf]").forEach((i) => {
    const k = i.dataset.brf,
      v = (i.value || "").trim();
    if (k === "docs") {
      const old = d.docs || [];
      d.docs = v
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((t) => ({
          t,
          ok: !!(old.find((o) => o.t === t) || {}).ok,
        }));
    } else if (k === "amt") d[k] = v === "" ? 0 : parseAmt(v) || 0;
    else d[k] = v;
  });
  const w = $("brWarn");
  if (w) d.warn = w.checked;
  if (d.date && ["bes", "abl", "rueck", "bew", "mahn"].includes(d.kind))
    d.wid = d.wid || addMonths(addDays(d.date, 4), 1);
  return d;
}
async function brApply(rec, old) {
  const ym = (s) => s.slice(0, 7);
  if (old && old.fixPay && !(BR.act.pay && rec.money === "pay")) {
    try {
      await deleteDoc("fixed", old.fixPay);
    } catch (_) {}
    delete rec.fixPay;
  }
  if (BR.act.pay && rec.money === "pay" && rec.amt > 0) {
    const dd = rec.due || isoToday(),
      id = rec.fixPay || newId();
    await saveDoc("fixed", id, {
      name: (rec.from || uiText("br_k_info")) + (rec.az ? " " + rec.az : ""),
      amount: rec.amt,
      kind: "privat",
      cat: "Behörden",
      order: store.fixed.length,
      from: ym(dd),
      until: ym(dd),
      months: [Number(dd.slice(5, 7))],
      days: [
        {
          from: ym(dd),
          day: Number(dd.slice(8, 10)),
        },
      ],
      br: rec.id,
    });
    rec.fixPay = id;
  }
  rec.remind = {
    due: !!BR.act.due,
    term: !!BR.act.term,
    wid: !!BR.act.wid,
  };
}
function brHints(hints) {
  for (const x of brList()) {
    if (x.done) continue;
    const R = x.remind || {
        due: 1,
        term: 1,
        wid: 1,
      },
      s = x.from || uiText("br_k_info");
    if (x.due && R.due) {
      const n = dLeft(x.due);
      if (n >= 0 && n <= 7)
        hints.push({
          k: "br",
          lvl: n <= 2 ? "bad" : "warn",
          t: uiText("br_h_due", {
            s,
            d: fxDate(x.due, {
              day: "numeric",
              month: "long",
            }),
            n: String(n),
          }),
          s: uiText("br_h_due_s"),
          id: x.id,
        });
    }
    if (x.term && R.term) {
      const n = dLeft(x.term);
      if (n >= 0 && n <= 2)
        hints.push({
          k: "br",
          lvl: "warn",
          t: uiText("br_h_term", {
            s,
            d:
              n === 0
                ? uiText("tm_today")
                : n === 1
                  ? uiText("tm_tom")
                  : fxDate(x.term, {
                      day: "numeric",
                      month: "long",
                    }),
            t: x.time ? " · " + x.time : "",
          }),
          s: uiText("br_h_due_s"),
          id: x.id,
        });
    }
    if (x.wid && R.wid) {
      const n = dLeft(x.wid);
      if (n >= 0 && n <= 5)
        hints.push({
          k: "br",
          lvl: "warn",
          t:
            s +
            ": " +
            uiText("br_s_wid", {
              d: fxDate(x.wid, {
                day: "numeric",
                month: "long",
              }),
            }),
          s: uiText("br_h_due_s"),
          id: x.id,
        });
    }
  }
}
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-bropen]")) {
    e.preventDefault();
    brOpen();
    return;
  }
  const bg = $("brBg");
  if (!bg || bg.hidden || !bg.contains(e.target)) return;
  const pk = e.target.closest("[data-brpick]");
  if (pk) {
    $(pk.dataset.brpick === "cam" ? "brCam" : "brFile").click();
    return;
  }
  if (e.target.closest("[data-brmanual]")) {
    BR.d = {
      money: "none",
      kind: "info",
      docs: [],
      date: isoToday(),
    };
    BR.F = {};
    BR.img = null;
    BR.edit = null;
    BR.act = {
      due: 1,
      term: 1,
      pay: 1,
      wid: 1,
    };
    BR.st = 2;
    brRender(true);
    return;
  }
  const sl = e.target.closest("[data-brsel]");
  if (sl) {
    BR.sel = sl.dataset.brsel;
    BR.st = 3;
    brRender(true);
    return;
  }
  if (e.target.closest("[data-brhome]") || e.target.closest("[data-brback]")) {
    BR.st = 0;
    BR.img = null;
    brRender(true);
    return;
  }
  const mo = e.target.closest("[data-brmoney]");
  if (mo) {
    BR.d = brReadForm();
    BR.d.money = mo.dataset.brmoney;
    brRender();
    return;
  }
  if (e.target.closest("[data-brzoom]")) {
    tmShow(BR.img);
    return;
  }
  const vw = e.target.closest("[data-brview]");
  if (vw) {
    const img = await rcptGet("br-" + vw.dataset.brview);
    if (img) tmShow(img);
    return;
  }
  if (e.target.closest("[data-bredit]")) {
    const x = brList().find((y) => y.id === BR.sel);
    if (x) {
      BR.d = JSON.parse(JSON.stringify(x));
      BR.edit = x.id;
      BR.F = {};
      BR.img = null;
      const R = x.remind || {};
      BR.act = {
        due: R.due !== false ? 1 : 0,
        term: R.term !== false ? 1 : 0,
        pay: x.fixPay ? 1 : 0,
        wid: R.wid !== false ? 1 : 0,
      };
      BR.st = 2;
      brRender(true);
    }
    return;
  }
  const dc = e.target.closest("[data-brdoc]");
  if (dc) {
    const x = brList().find((y) => y.id === BR.sel);
    if (x) {
      const it = x.docs[Number(dc.dataset.brdoc)];
      it.ok = !it.ok;
      await saveSettings();
      const ck = dc.querySelector(".tmck");
      dc.classList.toggle("ok", it.ok);
      ck.textContent = it.ok ? "✓" : "";
      if (!reducedMotion()) {
        ck.animate(
          [
            {
              transform: "scale(.4) rotate(-25deg)",
            },
            {
              transform: "scale(1.25)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 460,
            easing: "cubic-bezier(.3,1.6,.5,1)",
          }
        );
        if (it.ok) {
          const r = ck.getBoundingClientRect();
          hbBurst(document.body, r.left + r.width / 2, r.top + r.height / 2, 12);
        }
      }
      if (x.docs.length && x.docs.every((z) => z.ok) && !x.done) {
        setTimeout(async () => {
          x.done = true;
          await saveSettings();
          const h = bg.querySelector(".brhero");
          if (h) hbConfetti(h, 40);
          BR.anim = 1;
          brRender();
        }, 500);
      }
    }
    return;
  }
  if (e.target.closest("[data-brdone]")) {
    const x = brList().find((y) => y.id === BR.sel);
    if (x) {
      x.done = !x.done;
      await saveSettings();
      if (x.done) {
        const r = e.target.closest("[data-brdone]").getBoundingClientRect();
        hbBurst(document.body, r.left + r.width / 2, r.top, 26);
        const h = bg.querySelector(".brhero");
        if (h) hbConfetti(h, 40);
      }
      BR.anim = 1;
      brRender();
    }
    return;
  }
  const dl = e.target.closest("[data-brdel]");
  if (dl) {
    if (dl.dataset.ask) {
      if (!dl.dataset.armed) {
        dl.dataset.armed = 1;
        dl.innerHTML = svgIcon("trash", 15) + " " + escHtml(uiText("del_sure"));
        dl.classList.add("armed");
        setTimeout(() => {
          if (dl.isConnected) {
            delete dl.dataset.armed;
            dl.textContent = "🗑️ " + uiText("tm_del");
            dl.classList.remove("armed");
          }
        }, 3500);
        return;
      }
    }
    try {
      await rcptDel("br-" + dl.dataset.brdel);
    } catch (_) {}
    const id = dl.dataset.brdel,
      x = brList().find((y) => y.id === id);
    if (x && x.fixPay) {
      try {
        await deleteDoc("fixed", x.fixPay);
      } catch (_) {}
    }
    store.settings.briefe = brList().filter((y) => y.id !== id);
    await saveSettings();
    BR.st = 0;
    BR.edit = null;
    brRender(true);
    return;
  }
  if (e.target.closest("[data-brsave]")) {
    const d = brReadForm();
    if (!(d.from || "").trim()) {
      toast(uiText("br_need"));
      return;
    }
    const old = BR.edit ? brList().find((y) => y.id === BR.edit) : null,
      id = BR.edit || newId();
    const rec = {
      ...(old || {}),
      id,
      from: d.from.trim(),
      kind: d.kind || "info",
      date: d.date || "",
      due: d.due || "",
      term: d.term || "",
      time: d.time || "",
      money: d.money || "none",
      amt: Number(d.amt) || 0,
      az: d.az || "",
      docs: d.docs || [],
      warn: !!d.warn,
      wid: d.wid || "",
    };
    if (BR.img) {
      try {
        await rcptPut("br-" + id, BR.img);
        rec.img = 1;
      } catch (_) {}
    }
    try {
      await brApply(rec, old);
    } catch (err) {
      console.warn("br", err);
    }
    store.settings.briefe = [...brList().filter((y) => y.id !== id), rec];
    await saveSettings();
    const sb = e.target.closest("[data-brsave]").getBoundingClientRect();
    hbBurst(document.body, sb.left + sb.width / 2, sb.top, 28);
    toast(uiText("br_saved"));
    BR.img = null;
    BR.edit = null;
    BR.sel = id;
    BR.st = 3;
    brRender(true);
    return;
  }
});
document.addEventListener("change", (e) => {
  const id = e.target.id;
  if (id === "brCam" || id === "brFile") {
    const fs = [...(e.target.files || [])];
    e.target.value = "";
    if (fs.length > 1 && id === "brFile")
      inbOpen(fs, {
        type: "br",
      });
    else if (fs.length) brScan(fs.length > 1 ? fs : fs[0]);
    return;
  }
  const a = e.target.dataset && e.target.dataset.bract;
  if (a) {
    BR.act[a] = e.target.checked ? 1 : 0;
    const l = e.target.closest(".stbact");
    if (l) {
      l.classList.toggle("on", e.target.checked);
      if (!reducedMotion())
        l.querySelector(".stbck").animate(
          [
            {
              transform: "scale(.4) rotate(-20deg)",
            },
            {
              transform: "scale(1.2)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 420,
            easing: "cubic-bezier(.3,1.6,.5,1)",
          }
        );
    }
    return;
  }
  if (e.target.dataset && e.target.dataset.brf && $("brBg") && !$("brBg").hidden && BR.st === 2) {
    BR.d = brReadForm();
    const s = $("brBg").querySelector(".brsum");
    if (s)
      s.innerHTML = brSum(BR.d)
        .map((t) => `<p>${escHtml(t)}</p>`)
        .join("");
  }
});

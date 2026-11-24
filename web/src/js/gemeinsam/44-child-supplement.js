/* --- Kinderzuschlag-Check --- */
const KIZ = {
  a: {},
};
function kizOpen() {
  const st = store.settings;
  st.kizAt = isoToday();
  saveSettings();
  const k = kidsList().length,
    sl = Object.values(st.slips || {}).filter((x) => Number(x.brutto) > 0),
    br = sl.length ? Math.round(sl.reduce((s, x) => s + Number(x.brutto), 0) / sl.length) : "";
  KIZ.a = {
    single: KIZ.a.single || "",
    br: KIZ.a.br || br,
    warm: KIZ.a.warm || "",
    kids: k,
  };
  const b = hbSheet("kizBg", uiText("kiz_h"));
  kizRender(b);
}
function kizRender(b) {
  b = b || $("kizBg").querySelector(".hobody");
  const a = KIZ.a,
    r = kizCalc();
  b.innerHTML = `<div class="fcmami on stbma">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub">${escHtml(mFill(uiText("kiz_m")))}</div></div>
    <div class="vacard kizq"><div class="hlf"><span>${escHtml(uiText("kiz_q1"))}</span><div class="seg" role="group" style="grid-template-columns:1fr 1fr"><button class="${a.single === "1" ? "on" : ""}" data-kizs="1">${escHtml(uiText("kiz_yes"))}</button><button class="${a.single === "0" ? "on" : ""}" data-kizs="0">${escHtml(uiText("kiz_no"))}</button></div></div>
    <label class="hlf"><span>${escHtml(uiText("kiz_q2"))}</span><input class="in" inputmode="decimal" id="kizB" value="${escHtml(String(a.br || ""))}" placeholder="z. B. 2.400"></label>
    <label class="hlf"><span>${escHtml(uiText("kiz_q3"))}</span><input class="in" inputmode="decimal" id="kizW" value="${escHtml(String(a.warm || ""))}" placeholder="z. B. 750"></label>
    <label class="hlf"><span>${escHtml(uiText("kiz_q4"))}</span><input class="in" inputmode="numeric" id="kizK" value="${escHtml(String(a.kids || ""))}"></label></div>
    ${
      r
        ? `<div class="kizres ${r.c}"><b>${escHtml(
            uiText(r.t, {
              n: fmtEur0(r.max),
            })
          )}</b><p>${escHtml(uiText(r.s))}</p></div>`
        : ""
    }
    <a class="btn primary" style="margin-top:12px;display:block;text-align:center" href="https://www.arbeitsagentur.de/familie-und-kinder/kiz-lotse" target="_blank" rel="noopener">${escHtml(uiText("kiz_lotse"))} ↗</a>
    <button type="button" class="btn" style="margin-top:8px;width:100%" data-kizdone>${escHtml(uiText("kiz_have"))}</button>
    <p class="small muted" style="margin-top:10px">${escHtml(uiText("kiz_note"))}</p>`;
}
function kizCalc() {
  const a = KIZ.a,
    br = parseAmt(a.br),
    w = parseAmt(a.warm),
    k = Number(a.kids) || 0;
  if (!(a.single === "1" || a.single === "0") || !(br > 0) || !(k > 0)) return null;
  const single = a.single === "1",
    min = single ? 600 : 900,
    net = br * 0.78,
    need = (single ? 563 : 1012) + k * 420 + (w > 0 ? w : 0),
    max = k * 297;
  if (br < min)
    return {
      c: "w",
      t: "kiz_r_low",
      s: "kiz_r_low_s",
      max,
    };
  if (net < need + max * 0.95)
    return {
      c: "g",
      t: "kiz_r_yes",
      s: "kiz_r_yes_s",
      max,
    };
  return {
    c: "i",
    t: "kiz_r_no",
    s: "kiz_r_no_s",
    max,
  };
}
document.addEventListener("click", async (e) => {
  const c = e.target.closest("[data-hlcancel]");
  if (c) {
    hbSheetClose("hlpBg");
    setTimeout(() => {
      try {
        vaLetter(c.dataset.hlcancel);
      } catch (_) {}
    }, 260);
    return;
  }
  const o = e.target.closest("[data-hlok]");
  if (o) {
    hlDismiss(o.dataset.hlok);
    hbSheetClose("hlpBg");
    toast(uiText("hl_noted"));
    return;
  }
  if (e.target.closest("[data-wbdone]")) {
    const j = jlCfg();
    j.wbDone = j.bwzEnd;
    j.wbChk = {};
    await saveSettings();
    hbSheetClose("wbBg");
    try {
      hbConfetti(document.body, 40);
    } catch (_) {}
    toast(uiText("wb_done_t"));
    return;
  }
  if (e.target.closest("[data-rchopen]")) {
    RCHU.edit = null;
    rchOpen2();
    return;
  }
  if (e.target.closest("[data-wbopen]")) {
    wbOpen();
    return;
  }
  if (e.target.closest("[data-rchnew]")) {
    RCHU.edit = {};
    rchOpen2();
    return;
  }
  if (e.target.closest("[data-rchcancel]")) {
    RCHU.edit = null;
    rchOpen2();
    return;
  }
  if (e.target.closest("[data-rchsave]")) {
    const amt = parseAmt($("rchA").value),
      d = $("rchD").value || isoToday(),
      z = Number($("rchZ").value) || 14;
    if (!(amt > 0)) {
      toast(uiText("rch_need_amt"));
      return;
    }
    const nid = "i" + Date.now().toString(36),
      img = RCHU.edit && RCHU.edit.img;
    if (img) {
      try {
        await rcptPut("rch-" + nid, img);
      } catch (_) {}
    }
    const kd = $("rchK").value.trim();
    rchList().push({
      id: nid,
      kunde: kd,
      amt,
      nr: $("rchN").value.trim() || rchNextNr(),
      date: d,
      z,
      due: addDays(d, z),
      img: img ? 1 : 0,
      learned: 2,
    });
    try {
      const E = RCHU.edit || {};
      rvLearnAdd(
        (E._pos || []).map((p) => ({
          ...p,
          d,
        })),
        kd,
        rvAddrParse(E._lines || [], kd)
      );
    } catch (_) {}
    RCHU.edit = null;
    await saveSettings();
    rchOpen2(nid);
    try {
      hbConfetti(document.body, 26);
    } catch (_) {}
    return;
  }
  const pk = e.target.closest("[data-rchpick]");
  if (pk) {
    $(pk.dataset.rchpick === "cam" ? "rchCam" : "rchFile").click();
    return;
  }
  const rv = e.target.closest("[data-rchview]");
  if (rv) {
    const img = await rcptGet("rch-" + rv.dataset.rchview);
    if (img) tmShow(img);
    return;
  }
  if (e.target.closest("[data-rchimg]")) {
    if (RCHU.edit && RCHU.edit.img) tmShow(RCHU.edit.img);
    return;
  }
  const p = e.target.closest("[data-rchpaid]");
  if (p) {
    const i = rchList().find((x) => x.id === p.dataset.rchpaid);
    if (i) {
      i.paid = isoToday();
      rvLog("paid", i.nr, "");
      await saveSettings();
      try {
        const r = p.getBoundingClientRect();
        hbBurst(document.body, r.left + r.width / 2, r.top, 24);
      } catch (_) {}
      rchOpen2();
    }
    return;
  }
  const dl = e.target.closest("[data-rchdel]");
  if (dl) {
    if (!dl.dataset.armed) {
      dl.dataset.armed = 1;
      dl.classList.add("danger");
      setTimeout(() => {
        if (dl.isConnected) {
          delete dl.dataset.armed;
          dl.classList.remove("danger");
        }
      }, 3000);
      toast(uiText("del_sure"));
      return;
    }
    {
      const di = rchList().find((x) => x.id === dl.dataset.rchdel);
      if (di && di.locked) {
        toast(uiText("rch_locked"));
        return;
      }
      if (di) rvLog("del", di.nr, di.kunde || "");
    }
    try {
      await rcptDel("rch-" + dl.dataset.rchdel);
    } catch (_) {}
    store.settings.rchs = rchList().filter((x) => x.id !== dl.dataset.rchdel);
    await saveSettings();
    rchOpen2();
    return;
  }
  const ks = e.target.closest("[data-kizs]");
  if (ks) {
    kizSync();
    KIZ.a.single = ks.dataset.kizs;
    kizRender();
    return;
  }
  if (e.target.closest("[data-kizdone]")) {
    store.settings.kizDone = isoToday();
    await saveSettings();
    hbSheetClose("kizBg");
    toast(uiText("hl_noted"));
    return;
  }
});
function kizSync() {
  const g = (id) => ($(id) || {}).value;
  if ($("kizB")) {
    KIZ.a.br = g("kizB");
    KIZ.a.warm = g("kizW");
    KIZ.a.kids = g("kizK");
  }
}
document.addEventListener("input", (e) => {
  if (e.target.closest("#kizBg") && /^kiz[BWK]$/.test(e.target.id)) {
    kizSync();
    clearTimeout(KIZ.t);
    KIZ.t = setTimeout(() => {
      const f = document.activeElement && document.activeElement.id;
      kizRender();
      const el = f && $(f);
      if (el) {
        el.focus();
        try {
          el.setSelectionRange(el.value.length, el.value.length);
        } catch (_) {}
      }
    }, 700);
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "rchCam" || e.target.id === "rchFile") {
    const fs = [...(e.target.files || [])];
    const fl = e.target.id === "rchFile";
    e.target.value = "";
    /* mehrere PDFs: jede Datei ist eine eigene Rechnung */
    if (fs.length > 1 && fl && fs.every(isPdfF)) rchBatch(fs);
    else if (fs.length > 1 && fl)
      inbOpen(fs, {
        type: "rch",
      });
    else if (fs.length) rchScan(fs.length > 1 ? fs : fs[0]);
    return;
  }
  if (e.target.id === "wbEnd") {
    const j = jlCfg();
    j.bwzEnd = e.target.value || null;
    await saveSettings();
    wbOpen();
    return;
  }
  const c = e.target.closest("[data-wbc]");
  if (c) {
    const j = jlCfg();
    j.wbChk = {
      ...(j.wbChk || {}),
      [c.dataset.wbc]: c.checked,
    };
    c.closest(".wbi").classList.toggle("on", c.checked);
    if (c.checked && !reducedMotion())
      c.closest(".wbi").animate(
        [
          {
            transform: "scale(1)",
          },
          {
            transform: "scale(1.04)",
          },
          {
            transform: "none",
          },
        ],
        {
          duration: 300,
        }
      );
    await saveSettings();
    return;
  }
});

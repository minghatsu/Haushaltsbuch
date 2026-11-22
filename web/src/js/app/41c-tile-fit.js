/* Kachel-Namen und Beträge in kleinen Kästen: zu lange Wörter etwas kleiner statt abschneiden oder mitten im Wort trennen.
   Jede Kachel wird nur neu gemessen, wenn sich Text oder Breite geändert haben – sonst
   würden die Mess-Stile ständig neue Änderungen auslösen (und das Wischen ausbremsen). */
function fitTiles(root) {
  (root || document).querySelectorAll(".atile b, .sagrid b").forEach((b) => {
    if (b.closest(".cubestage") || !b.getClientRects().length) return;
    const t = b.parentElement,
      key = b.textContent + "|" + t.clientWidth;
    if (b.dataset.fit === key) return;
    b.dataset.fit = key;
    b.style.fontSize = "";
    b.style.overflowWrap = "normal";
    b.style.hyphens = "manual";
    let f = parseFloat(getComputedStyle(b).fontSize) || 12.5,
      n = 0;
    const ts = getComputedStyle(t),
      av = t.clientWidth - parseFloat(ts.paddingLeft) - parseFloat(ts.paddingRight);
    b.style.width = "min-content";
    while (b.scrollWidth > av - 2 && f > 10.5 && n++ < 14) {
      f -= 0.5;
      b.style.fontSize = f + "px";
    }
    b.style.width = "";
    b.style.overflowWrap = "";
    b.style.hyphens = "";
  });
}
{
  let fq = 0;
  const hasTile = (n) => {
    const e = n.nodeType === 1 ? n : n.parentElement;
    return (
      !!e &&
      !e.closest(".cubestage") &&
      (e.matches(".atile, .atile *, .sagrid, .sagrid *") || !!e.querySelector(".atile, .sagrid"))
    );
  };
  new MutationObserver((list) => {
    if (fq || !list.some((m) => hasTile(m.target) || [...m.addedNodes].some(hasTile))) return;
    fq = requestAnimationFrame(() => {
      fq = 0;
      fitTiles();
    });
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  addEventListener("resize", () => fitTiles());
  try {
    document.fonts.ready.then(() => fitTiles());
  } catch (_) {}
}
async function ocrImgFile(file) {
  let L = [];
  try {
    L = await ocrDataUrl(await tmShrink(file, 2600));
  } catch (_) {
    L = [];
  }
  if (!L.length) {
    try {
      L = await ocrDataUrl(await tmShrink(file, 1600));
    } catch (_) {
      L = [];
    }
  }
  return ocrPlus(L);
}
document.addEventListener("click", async (e) => {
  const op = e.target.closest("[data-tmopen]");
  if (op) {
    e.preventDefault();
    tmOpen(op.dataset.tmopen || null);
    return;
  }
  const bg = $("tmBg");
  if (!bg || bg.hidden || !bg.contains(e.target)) return;
  const L = tmList();
  const sel = e.target.closest("[data-tmsel]");
  if (sel) {
    TM2.sel = sel.dataset.tmsel;
    tmRender(true);
    bg.querySelector(".hobody").scrollTop = 0;
    return;
  }
  const br = e.target.closest("[data-tmbr]");
  if (br) {
    const [id, i] = br.dataset.tmbr.split("|"),
      t = L.find((x) => x.id === id);
    if (!t) return;
    t.bring =
      t.bring ||
      tmBringDef(t).map((x) => ({
        n: x,
        ok: false,
      }));
    t.bring[+i].ok = !t.bring[+i].ok;
    await tmSaveAll();
    tmRender();
    if (t.bring[+i].ok && !reducedMotion()) {
      const r = bg.querySelectorAll(".tmbi")[+i];
      if (r) {
        const bb = r.querySelector(".tmck").getBoundingClientRect();
        hbBurst(document.body, bb.left + bb.width / 2, bb.top + bb.height / 2, 10);
      }
    }
    return;
  }
  const ba = e.target.closest("[data-tmbradd]");
  if (ba) {
    const v = ($("tmBrN").value || "").trim();
    if (!v) return;
    const t = L.find((x) => x.id === ba.dataset.tmbradd);
    t.bring = [
      ...(t.bring || []),
      {
        n: v,
        ok: false,
      },
    ];
    await tmSaveAll();
    tmRender();
    return;
  }
  const dn = e.target.closest("[data-tmdone]");
  if (dn) {
    const t = L.find((x) => x.id === dn.dataset.tmdone);
    if (!t) return;
    t.done = {
      ts: Date.now(),
    };
    const bb = dn.getBoundingClientRect();
    hbBurst(document.body, bb.left + bb.width / 2, bb.top, 26);
    await tmSaveAll();
    TM2.sel = null;
    tmRender();
    toast(
      uiText("tm_saved"),
      () => {
        TM2.photo = t.id;
        $("tmFile").click();
      },
      "📸 " + uiText("tm_photo"),
      8000
    );
    return;
  }
  const ph = e.target.closest("[data-tmphoto]");
  if (ph) {
    TM2.photo = ph.dataset.tmphoto;
    $("tmFile").click();
    return;
  }
  const vw = e.target.closest("[data-tmview]");
  if (vw) {
    const img = await rcptGet("tm-" + vw.dataset.tmview);
    if (img) tmShow(img);
    return;
  }
  const un = e.target.closest("[data-tmundo]");
  if (un) {
    const t = L.find((x) => x.id === un.dataset.tmundo);
    if (t) {
      delete t.done;
      await tmSaveAll();
      tmRender();
    }
    return;
  }
  if (e.target.closest("[data-tmnew]")) {
    TM2.add = true;
    TM2.edit = null;
    TM2.k = null;
    tmRender();
    setTimeout(() => {
      const f = $("tmFN");
      if (f) {
        f.focus();
        f.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      }
    }, 60);
    return;
  }
  const ed = e.target.closest("[data-tmedit]");
  if (ed) {
    TM2.edit = ed.dataset.tmedit;
    TM2.add = false;
    TM2.k = null;
    tmRender();
    setTimeout(() => {
      const f = bg.querySelector(".tmform");
      if (f)
        f.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
    }, 60);
    return;
  }
  const k = e.target.closest("[data-tmk]");
  if (k) {
    TM2.k = k.dataset.tmk;
    k.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === k));
    return;
  }
  if (e.target.closest("[data-tmcancel]")) {
    TM2.add = false;
    TM2.edit = null;
    tmRender();
    return;
  }
  const dl = e.target.closest("[data-tmdel]");
  if (dl) {
    const j = jlCfg();
    j.terms = j.terms.filter((x) => x.id !== dl.dataset.tmdel);
    TM2.edit = null;
    await tmSaveAll();
    tmRender();
    return;
  }
  if (e.target.closest("[data-tmsave]")) {
    const n = ($("tmFN").value || "").trim(),
      d = $("tmFD").value;
    if (!n || !d) {
      toast(uiText("tm_need"));
      return;
    }
    const j = jlCfg(),
      kk = TM2.k || (bg.querySelector("[data-tmk].on") || {}).dataset?.tmk || "termin";
    if (TM2.edit) {
      const t = j.terms.find((x) => x.id === TM2.edit);
      if (t) {
        Object.assign(t, {
          n,
          d,
          t: $("tmFT").value || "",
          o: ($("tmFO").value || "").trim(),
          k: kk,
        });
      }
    } else {
      const t = {
        id: newId(),
        n,
        d,
        t: $("tmFT").value || "",
        o: ($("tmFO").value || "").trim(),
        k: kk,
      };
      t.bring = tmBringDef(t).map((x) => ({
        n: x,
        ok: false,
      }));
      j.terms.push(t);
      TM2.sel = t.id;
    }
    TM2.add = false;
    TM2.edit = null;
    await tmSaveAll();
    tmRender(true);
    toast(uiText("tm_ok"));
    return;
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "tmFile") return;
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f || !TM2.photo) return;
  try {
    const img = await tmShrink(f);
    await rcptPut("tm-" + TM2.photo, img);
    const t = tmList().find((x) => x.id === TM2.photo);
    if (t) {
      t.done = {
        ...(t.done || {
          ts: Date.now(),
        }),
        img: 1,
      };
      await tmSaveAll();
    }
    tmRender();
    toast(uiText("tm_proof_ok"));
  } catch (_) {
    toast(uiText("tm_proof_err"));
  }
});
function tmShow(img) {
  const o = document.createElement("div");
  o.className = "tmview";
  o.innerHTML = `<img src="${img}" alt=""><button type="button" class="hlx" aria-label="${escHtml(uiText("hl_close"))}"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
  o.onclick = () => o.remove();
  document.body.appendChild(o);
}
function tmHints(hints) {
  if (!prof || !prof()) return;
  const today = isoToday();
  for (const t of jlCfg().terms || []) {
    if (t.done) continue;
    const n = daysTo(t.d);
    if (n < 0 || n > 2) continue;
    hints.push({
      k: "term",
      lvl: n <= 1 ? "warn" : "info",
      t: `${tr(t.n)}: ${
        n === 0
          ? uiText("tm_today")
          : n === 1
            ? uiText("tm_tom")
            : uiText("tm_days", {
                n: "2",
              })
      }${t.t ? ` · ${t.t}` : ""}`,
      s: tmIsFrist(t) ? uiText("tm_h_f") : uiText("tm_h_t"),
    });
  }
}

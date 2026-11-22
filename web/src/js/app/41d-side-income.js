/* ---------- Zuverdienst-Rechner ---------- */
function zvParts(g) {
  const alg = store.settings.work === "alg",
    kid = Number(store.settings.kinder) > 0 || (store.settings.kids || []).length > 0,
    top = kid ? 1500 : 1200,
    P = [];
  if (alg) {
    P.push(
      uiText("zv_alg_free", {
        n: "165 €",
      })
    );
    return {
      keep: Math.min(g, 165),
      P,
    };
  }
  if (g <= 0)
    return {
      keep: 0,
      P,
    };
  let k = Math.min(g, 100);
  P.push(
    uiText("zv_p_free", {
      n: fmtEur0(Math.min(g, 100)),
    })
  );
  if (g > 100) {
    const a = Math.min(g, 520) - 100;
    k += a * 0.2;
    P.push(
      uiText("zv_p_pct", {
        p: "20",
        n: fmtEur0(a),
      })
    );
  }
  if (g > 520) {
    const a = Math.min(g, 1000) - 520;
    k += a * 0.3;
    P.push(
      uiText("zv_p_pct", {
        p: "30",
        n: fmtEur0(a),
      })
    );
  }
  if (g > 1000) {
    const a = Math.min(g, top) - 1000;
    if (a > 0) {
      k += a * 0.1;
      P.push(
        uiText("zv_p_pct", {
          p: "10",
          n: fmtEur0(a),
        })
      );
    }
  }
  return {
    keep: Math.round(k),
    P,
    top,
  };
}
const ZV = {};
function zvOpen() {
  const j = jlCfg();
  ZV.g = Number(j.mini) || 0;
  ZV.h = Number(j.miniH) || 0;
  hbSheet("zvBg", uiText("zv_title"));
  zvRender(true);
}
function zvRender(first) {
  const bg = $("zvBg");
  if (!bg || bg.hidden) return;
  const b = bg.querySelector(".hobody"),
    j = jlCfg(),
    MJ = yearLimits().mj,
    max = 1500,
    alg = store.settings.work === "alg";
  b.innerHTML = `<div class="vacard zvc"><small>${escHtml(uiText("zv_gross"))}</small><div class="zvbig"><span id="zvN">${escHtml(fmtEur0(first && !reducedMotion() ? 0 : ZV.g))}</span></div>
      <div class="zvsl"><input type="range" id="zvR" min="0" max="${max}" step="10" value="${ZV.g}" aria-label="${escHtml(uiText("zv_gross"))}"><i class="zvmj" style="left:${((MJ / max) * 100).toFixed(1)}%"></i></div>
      <div class="zvax"><span>0</span><span style="left:${((MJ / max) * 100).toFixed(1)}%">${escHtml(
        uiText("zv_mj", {
          n: fmtEur0(MJ),
        })
      )}</span><span>${escHtml(fmtEur0(max))}</span></div>
      <div class="grid2" style="margin-top:12px"><div class="field"><label>${escHtml(uiText("zv_exact"))}</label><input class="in" id="zvG" inputmode="decimal" value="${ZV.g || ""}" placeholder="520"></div>
      <div class="field"><label>${escHtml(uiText("zv_hours"))}</label><input class="in" id="zvH" inputmode="decimal" value="${ZV.h || ""}" placeholder="${escHtml(uiText("zv_hours_p"))}"></div></div></div>
    <div class="vacard zvc"><div class="zvbar"><i class="k" id="zvBK"><span id="zvBKt"></span></i><i class="a" id="zvBA"><span id="zvBAt"></span></i></div>
      <div class="fcr zvrow"><span class="tmico">${svgIcon("check", 18)}</span><span class="grow"><b>${escHtml(uiText("zv_keep"))}</b><small id="zvWhy"></small></span><b class="pos" id="zvK"></b></div>
      <div class="fcr zvrow"><span class="tmico">${svgIcon("bank", 18)}</span><span class="grow"><b>${escHtml(
        uiText("zv_after", {
          a: alg ? uiText("am_alg") : uiText("am_gs"),
        })
      )}</b><small id="zvBefore"></small></span><b id="zvL"></b></div></div>
    <div class="srhero zvhero"><small>${escHtml(uiText("zv_total"))}</small><div class="srbig"><span id="zvT">0 €</span></div><span id="zvTs"></span><i class="srsh"></i></div>
    ${j.amount ? "" : `<div class="notice info"><span>${escHtml(uiText("zv_noamt"))}</span><button class="btn primary" data-go="more" data-sp="amt" data-hbclose="zvBg">${escHtml(uiText("zv_set"))}</button></div>`}
    <div id="zvWarn"></div>
    <p class="small muted" style="margin:10px 4px 0">${escHtml(alg ? uiText("zv_note_alg") : uiText("zv_note_gs"))}</p>`;
  zvCalc(first);
}
function zvCalc(first) {
  const j = jlCfg(),
    g = Math.max(0, Number(ZV.g) || 0),
    { keep, P } = zvParts(g),
    ded = Math.max(0, g - keep),
    base = Number(j.amount) || 0,
    after = Math.max(0, base - ded),
    tot = after + g,
    alg = store.settings.work === "alg";
  const hrs = Number(ZV.h) > 0 ? (Number(ZV.h) * 52) / 12 : g > 0 ? g / (yearLimits().ml || 13.9) : 0,
    ph = hrs > 0 ? keep / hrs : 0;
  hbOdo($("zvN"), fmtEur0(g));
  {
    const r = $("zvR");
    if (r) r.style.setProperty("--p", Math.min(100, g / 15) + "%");
  }
  const kw = g > 0 ? Math.max((keep / g) * 100, keep ? 8 : 0) : 0;
  $("zvBK").style.width = (g > 0 ? kw : 0) + "%";
  $("zvBA").style.width = (g > 0 ? 100 - kw : 100) + "%";
  $("zvBA").classList.toggle("empty", g <= 0);
  $("zvBKt").textContent = g > 0 && keep ? fmtEur0(keep) : "";
  $("zvBAt").textContent =
    g <= 0
      ? uiText("zv_move")
      : ded
        ? uiText("zv_ded", {
            n: fmtEur0(ded),
          })
        : "";
  $("zvK").textContent = "+" + fmtEur0(keep);
  $("zvWhy").textContent = P.join(" + ") || uiText("zv_none");
  $("zvL").textContent = fmtEur0(after);
  $("zvBefore").textContent = uiText("zv_before", {
    n: fmtEur0(base),
  });
  hbOdo($("zvT"), fmtEur0(tot), first ? 1400 : 700);
  $("zvTs").textContent =
    g > 0
      ? uiText("zv_tot_s", {
          n: fmtEur0(base),
          h: ph ? fmtEur(ph) : "–",
        })
      : uiText("zv_tot_0");
  const w = $("zvWarn");
  w.innerHTML =
    alg && Number(ZV.h) >= 15
      ? `<div class="fcwarn on"><b>⚠ ${escHtml(uiText("zv_15"))}</b><span>${escHtml(uiText("zv_15_s"))}</span></div>`
      : g > yearLimits().mj && !alg
        ? `<div class="fcgood on"><b>ℹ️ ${escHtml(uiText("zv_svp"))}</b><span>${escHtml(uiText("zv_svp_s"))}</span></div>`
        : "";
}
let zvT0 = 0;
function zvStore() {
  clearTimeout(zvT0);
  zvT0 = setTimeout(() => {
    const j = jlCfg();
    j.mini = Number(ZV.g) || 0;
    j.miniH = Number(ZV.h) || 0;
    saveSettings();
  }, 700);
}
document.addEventListener("input", (e) => {
  const id = e.target.id;
  if (id === "zvR") {
    ZV.g = Number(e.target.value) || 0;
    const gi = $("zvG");
    if (gi) gi.value = ZV.g || "";
    zvCalc();
    zvStore();
  } else if (id === "zvG") {
    ZV.g = Math.max(0, parseAmt(e.target.value || "0") || 0);
    const r = $("zvR");
    if (r) r.value = Math.min(1500, ZV.g);
    zvCalc();
    zvStore();
  } else if (id === "zvH") {
    ZV.h = Math.max(0, parseAmt(e.target.value || "0") || 0);
    zvCalc();
    zvStore();
  }
});
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-zvopen]")) {
    e.preventDefault();
    zvOpen();
  }
});

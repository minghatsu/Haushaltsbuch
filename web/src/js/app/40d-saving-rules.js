/* ---------- Sparregeln ---------- */
const SR_DEF = [
  ["round", "coins"],
  ["rest", "cal"],
  ["pay", "case"],
  ["skip", "ban"],
];
function srCfg() {
  return store.settings.srules || {};
}
function srGoals() {
  return (store.settings.goals || []).filter((g) => !g.account);
}
function srAmt(k, r, onlyYm) {
  r = r || {};
  if (!r.on || !r.from) return 0;
  const from = r.from,
    inYm = (d) => !onlyYm || d.startsWith(onlyYm);
  if (k === "round")
    return sum(
      store.tx.filter((t) => t.kind === "ausgabe" && t.date >= from && inYm(t.date) && !isWithdrawCat(t.cat)),
      (t) => {
        const a = Math.round(t.amount * 100),
          u = Math.ceil(a / 100) * 100;
        return (u - a) / 100;
      }
    );
  if (k === "pay")
    return sum(
      store.tx.filter((t) => t.kind === "einnahme" && t.date >= from && inYm(t.date) && incArt(t.cat) !== "sonstige"),
      (t) => (t.amount * (Number(r.pct) || 5)) / 100
    );
  if (k === "skip")
    return sum(
      (r.log || []).filter((x) => x.d >= from && inYm(x.d)),
      (x) => Number(x.v) || 0
    );
  if (k === "rest") {
    const cur = ymOf(new Date());
    let s = 0;
    for (let ym = shiftYm(from.slice(0, 7), 1); ym < cur; ym = shiftYm(ym, 1)) {
      if (onlyYm && ym !== onlyYm) continue;
      const n = monthCalc(ym).net;
      if (n > 0) s += (n * (Number(r.pct) || 100)) / 100;
    }
    return s;
  }
  return 0;
}
function srTotal() {
  const C = srCfg();
  return sum(SR_DEF, ([k]) => srAmt(k, C[k]));
}
function srForGoal(gid) {
  const C = srCfg(),
    G = srGoals();
  return sum(SR_DEF, ([k]) => {
    const r = C[k];
    if (!r || !r.on) return 0;
    const g = r.goal || (G[0] && G[0].id);
    return g === gid ? srAmt(k, r) : 0;
  });
}
function srGain(k, r) {
  const ym = ymOf(new Date());
  if (k === "rest") {
    const p = shiftYm(ym, -1),
      v = srAmt("rest", r, p);
    return v > 0
      ? uiText("sr_g_last", {
          n: fmtEur(v),
        })
      : uiText("sr_g_rest");
  }
  const v = srAmt(k, r, ym);
  return v > 0
    ? uiText("sr_g_month", {
        n: fmtEur(v),
      })
    : uiText("sr_g_wait");
}
function srOpen() {
  const b = hbSheet("srBg", uiText("sr_title"));
  srRender(true);
}
function srRender(first) {
  const bg = $("srBg");
  if (!bg || bg.hidden) return;
  const b = bg.querySelector(".hobody"),
    C = srCfg(),
    G = srGoals(),
    tot = srTotal();
  b.innerHTML = `<div class="srhero ${first ? "" : "still"}" id="srH"><small>${escHtml(uiText("sr_saved"))}</small><div class="srbig"><span id="srN">${escHtml(fmtEur(first && !reducedMotion() ? 0 : tot))}</span></div><span>${escHtml(uiText("sr_hero_s"))}</span><i class="srsh"></i></div>
    ${G.length ? "" : `<div class="notice info"><span>${escHtml(uiText("sr_nogoal"))}</span><button class="btn primary" data-go="ziele" data-hbclose="srBg">${escHtml(uiText("sr_goal_btn"))}</button></div>`}
    ${SR_DEF.map(([k, icn]) => {
      const r = C[k] || {},
        on = !!r.on,
        gid = r.goal || (G[0] && G[0].id) || "";
      return `<div class="srcard ${on ? "act" : ""}" data-srk="${k}"><div class="srrow"><span class="ic">${svgIcon(icn, 22)}</span><span class="grow"><b>${escHtml(uiText("sr_" + k))}</b><small>${escHtml(
        uiText("sr_" + k + "_s", {
          n: k === "pay" ? String(r.pct || 5) : k === "skip" ? fmtEur(Number(r.amt) || 3) : "",
        })
      )}</small></span>
        <button type="button" class="srtog ${on ? "on" : ""}" role="switch" aria-checked="${on}" data-srtog="${k}" aria-label="${escHtml(uiText("sr_" + k))}"></button></div>
        <div class="srmore ${on ? "on" : ""}"><div class="srgain">✓ ${escHtml(srGain(k, r))}</div>
          ${G.length > 1 ? `<label class="srsel"><span>→</span><select class="in" data-srgoal="${k}">${G.map((g) => `<option value="${escHtml(g.id)}" ${g.id === gid ? "selected" : ""}>${escHtml(g.name)}</option>`).join("")}</select></label>` : G.length ? `<div class="srsel"><span>→ ${escHtml(G[0].name)}</span></div>` : ""}
          ${k === "pay" ? `<div class="srseg">${[3, 5, 10].map((p) => `<button type="button" class="${(r.pct || 5) === p ? "on" : ""}" data-srpct="${p}">${p} %</button>`).join("")}</div>` : ""}
          ${
            k === "skip"
              ? `<button type="button" class="srskip" data-srskip>🙅 ${escHtml(
                  uiText("sr_skip_btn", {
                    n: fmtEur(Number(r.amt) || 3),
                  })
                )}</button>`
              : ""
          }</div></div>`;
    }).join("")}
    <p class="small muted" style="margin:10px 4px 0">${escHtml(uiText("sr_how"))}</p>`;
  if (first && !reducedMotion()) {
    b.querySelectorAll(".srcard").forEach((c, i) =>
      c.animate(
        [
          {
            opacity: 0,
            transform: "translateY(16px)",
          },
          {
            opacity: 1,
            transform: "none",
            filter: "none",
          },
        ],
        {
          duration: 600,
          delay: 120 + i * 90,
          easing: "cubic-bezier(.2,1.2,.35,1)",
          fill: "backwards",
        }
      )
    );
    setTimeout(() => hbOdo($("srN"), fmtEur(tot), 1400), 300);
  }
}
async function srSet(k, patch) {
  const C = (store.settings.srules = {
    ...(store.settings.srules || {}),
  });
  C[k] = {
    ...(C[k] || {}),
    ...patch,
  };
  await saveSettings();
}
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-sropen]")) {
    e.preventDefault();
    srOpen();
    return;
  }
  const tg = e.target.closest("[data-srtog]");
  if (tg) {
    const k = tg.dataset.srtog,
      r = srCfg()[k] || {},
      on = !r.on;
    tg.classList.toggle("on", on);
    const card = tg.closest(".srcard");
    card.classList.toggle("act", on);
    card.querySelector(".srmore").classList.toggle("on", on);
    if (on && !reducedMotion()) {
      const bb = tg.getBoundingClientRect();
      hbBurst(document.body, bb.left + bb.width / 2, bb.top + bb.height / 2, 14);
    }
    await srSet(
      k,
      on
        ? {
            on: true,
            from: r.from || isoToday(),
            goal: r.goal || (srGoals()[0] && srGoals()[0].id) || "",
          }
        : {
            on: false,
          }
    );
    setTimeout(() => {
      srRender();
      hbOdo($("srN"), fmtEur(srTotal()));
    }, 420);
    return;
  }
  const pc = e.target.closest("[data-srpct]");
  if (pc) {
    await srSet("pay", {
      pct: Number(pc.dataset.srpct),
    });
    srRender();
    return;
  }
  if (e.target.closest("[data-srskip]")) {
    const r = srCfg().skip || {},
      v = Number(r.amt) || 3;
    await srSet("skip", {
      log: [
        ...(r.log || []),
        {
          d: isoToday(),
          v,
        },
      ],
    });
    const btn = e.target.closest("[data-srskip]");
    srCoin(btn, $("srH"), () => {
      hbOdo($("srN"), fmtEur(srTotal()));
      const h = $("srH");
      if (h) {
        h.classList.remove("glow");
        void h.offsetWidth;
        h.classList.add("glow");
      }
    });
    setTimeout(() => srRender(), 1300);
    return;
  }
});
document.addEventListener("change", async (e) => {
  const g = e.target.dataset && e.target.dataset.srgoal;
  if (g) {
    await srSet(g, {
      goal: e.target.value,
    });
    srRender();
  }
});
function srCoin(from, to, done, label) {
  if (!from || !to || reducedMotion()) {
    if (done) done();
    return;
  }
  const a = from.getBoundingClientRect(),
    b = to.getBoundingClientRect(),
    x0 = a.left + a.width / 2,
    y0 = a.top + a.height / 2,
    x1 = b.left + b.width / 2,
    y1 = b.top + b.height / 2;
  const c = document.createElement("div");
  c.className = "hbcoin";
  c.textContent = "€";
  document.body.appendChild(c);
  const cx = (x0 + x1) / 2 + 40,
    cy = Math.min(y0, y1) - 140,
    K = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28,
      u = 1 - t;
    K.push({
      offset: t,
      transform: `translate(${u * u * x0 + 2 * u * t * cx + t * t * x1}px,${u * u * y0 + 2 * u * t * cy + t * t * y1}px) rotateY(${t * 720}deg) scale(${1 + 0.35 * Math.sin(Math.PI * t)})`,
    });
  }
  c.animate(K, {
    duration: 950,
    easing: "cubic-bezier(.5,0,.3,1)",
  })
    .finished.then(() => {
      c.remove();
      hbBurst(document.body, x1, y1, 10);
      if (done) done();
    })
    .catch(() => c.remove());
}
function srAfterSave(doc) {
  const r = srCfg().round;
  if (!r || !r.on || doc.kind !== "ausgabe" || isWithdrawCat(doc.cat)) return;
  const a = Math.round(doc.amount * 100),
    u = Math.ceil(a / 100) * 100,
    d = (u - a) / 100;
  if (d <= 0) return;
  let p = $("srPill");
  if (!p) {
    p = document.createElement("div");
    p.id = "srPill";
    p.setAttribute("data-noi18n", "");
    document.body.appendChild(p);
  }
  p.innerHTML = `<span class="sri">${svgIcon("coins", 22)}</span><span class="grow"><b>${escHtml(uiText("sr_pill"))}</b><span class="sra" id="srPA">${escHtml(fmtEur(doc.amount))}</span></span><span class="srp" id="srPP">+${escHtml(fmtEur(d))}</span>`;
  p.className = "";
  void p.offsetWidth;
  p.classList.add("on");
  setTimeout(() => hbOdo($("srPA"), fmtEur(u / 100)), 700);
  setTimeout(() => {
    $("srPP").classList.add("on");
  }, 1500);
  setTimeout(() => {
    const tab = document.querySelector('.tabs .tab[data-go="zukunft"]');
    srCoin($("srPP"), tab || document.body, () => {
      if (tab) {
        tab.classList.remove("srbump");
        void tab.offsetWidth;
        tab.classList.add("srbump");
      }
    });
  }, 2000);
  setTimeout(() => p.classList.remove("on"), 3300);
}

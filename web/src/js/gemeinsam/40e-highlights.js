/* ---------- Monats-Highlights ---------- */
const HL_EMO = [
  [/lebensm|essen|super|rewe|aldi|lidl|edeka|food|grocer/i, "🛒"],
  [/wohn|miete|haus|pflicht|nebenk|strom|rent/i, "🏠"],
  [/spaß|freizeit|fun|kino|hobby|urlaub|reise/i, "🎉"],
  [/tank|park|auto|kfz|bahn|ticket|fahr/i, "⛽"],
  [/restaurant|café|cafe|bäcker|liefer|imbiss/i, "🍕"],
  [/kleid|mode|shopping|kauf/i, "🛍️"],
  [/gesund|apothe|arzt|drog/i, "💊"],
  [/kind|baby|schule/i, "🧸"],
  [/abo|handy|internet|netflix|spotify|stream/i, "📱"],
  [/büro|material|betrieb/i, "💼"],
  [/versich/i, "🛡️"],
];
function hlEmo(c) {
  for (const [re, e] of HL_EMO) if (re.test(c || "")) return e;
  return "💸";
}
function hlData(ym) {
  const c = monthCalc(ym),
    pc = monthCalc(shiftYm(ym, -1)),
    dim = daysIn(ym),
    out = c.tx.filter((t) => t.kind === "ausgabe" || t.kind === "betrieb"),
    paid = (store.months[ym] && store.months[ym].paid) || {};
  const by = {};
  for (const t of out) by[t.cat || "Sonstiges"] = (by[t.cat || "Sonstiges"] || 0) + t.amount;
  for (const [fid, a] of Object.entries(paid)) {
    const f = store.fixed.find((x) => x.id === fid);
    const k = (f && (fixArea(f) || f.cat)) || "Fixkosten";
    by[k] = (by[k] || 0) + (Number(a) || 0);
  }
  const top = Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => ({
      k,
      v,
      e: hlEmo(k),
    }));
  const days = Array(dim + 1).fill(0);
  for (const t of out) days[Number(t.date.slice(8, 10))] += t.amount;
  let hot = 1,
    calm = 1;
  for (let d = 1; d <= dim; d++) {
    if (days[d] > days[hot]) hot = d;
    if (days[d] < days[calm]) calm = d;
  }
  const delta = pc.expenses > 0 ? Math.round((c.expenses / pc.expenses - 1) * 100) : null,
    net = c.income - c.expenses,
    rate = c.income > 0 ? net / c.income : 0;
  const n = out.length,
    avgBuy = n ? sum(out, (t) => t.amount) / n : 0,
    wkend = sum(
      out.filter((t) => [0, 6].includes(new Date(t.date + "T12:00").getDay())),
      (t) => t.amount
    ),
    wd = {};
  for (const t of out) {
    const k = new Date(t.date + "T12:00").getDay();
    wd[k] = (wd[k] || 0) + 1;
  }
  const busy = Object.entries(wd).sort((a, b) => b[1] - a[1])[0];
  let type = "pro";
  if (rate >= 0.2) type = "owl";
  else if (delta != null && delta <= -10) type = "fox";
  else if (n >= 40 && avgBuy < 15) type = "squirrel";
  else if (wkend > sum(out, (t) => t.amount) * 0.45) type = "party";
  else if (top[0] && /lebensm|essen|restaurant|café|bäcker/i.test(top[0].k)) type = "foodie";
  const traits = [];
  if (busy)
    traits.push(
      uiText("hl_tr_day", {
        d: new Intl.DateTimeFormat(cLoc(), {
          weekday: "long",
        }).format(new Date(2024, 0, 7 + Number(busy[0]))),
      })
    );
  traits.push(
    uiText("hl_tr_buys", {
      n: String(n),
    })
  );
  if (avgBuy)
    traits.push(
      uiText("hl_tr_avg", {
        n: fmtEur0(avgBuy),
      })
    );
  const bud = store.settings.budgets || {},
    budOk = budRows(c.tx),
    budHeld = budOk.length && budOk.every((x) => x.v <= x.budget);
  const tDays = new Set(c.tx.map((t) => t.date)).size,
    rc = c.tx.filter((t) => hasReceipt(t.id)).length,
    badges = [];
  if (budHeld) badges.push(["🏆", "hl_b_budget", "gold"]);
  if (delta != null && delta < 0) badges.push(["📉", "hl_b_less", "silver"]);
  if (net > 0) badges.push(["🐷", "hl_b_saved", "gold"]);
  if (tDays >= 12)
    badges.push([
      "🔥",
      "hl_b_streak",
      "silver",
      {
        n: String(tDays),
      },
    ]);
  if (rc >= 5)
    badges.push([
      "📸",
      "hl_b_bons",
      "bronze",
      {
        n: String(rc),
      },
    ]);
  if (c.fixOpen <= 0.01 && fixedForMonth(ym, true).length) badges.push(["✅", "hl_b_fix", "bronze"]);
  if (!badges.length) badges.push(["🌱", "hl_b_start", "bronze"]);
  const goal = (store.settings.goals || [])[0],
    gp = goal && Number(goal.target) > 0 ? Math.min(1, goalSaved(goal).v / Number(goal.target)) : null;
  return {
    ym,
    c,
    pc,
    top,
    days,
    dim,
    hot,
    calm,
    delta,
    net,
    rate,
    type,
    traits,
    badges: badges.slice(0, 3),
    goal,
    gp,
    n,
  };
}
function hlShould() {
  const cur = ymOf(new Date()),
    p = shiftYm(cur, -1);
  const n = store.tx.filter((t) => (t.date || "").startsWith(p)).length;
  return n >= 5 ? p : null;
}
function hlCard() {
  const p = hlShould();
  if (!p) return "";
  const seen = store.settings.hlSeen === p;
  return `<button type="button" class="hlcard ${seen ? "seen" : ""}" data-hlopen="${p}" data-noi18n><span class="hlsp">✨</span><span class="grow"><b>${escHtml(
    uiText(seen ? "hl_card_again" : "hl_card", {
      m: monName(p),
    })
  )}</b>${seen ? "" : `<small>${escHtml(uiText("hl_card_s"))}</small>`}</span><span class="hlgo">›</span></button>`;
}
const HL = {
  i: 0,
  t: 0,
  paused: false,
};
const HL_MESH = [
  ["#1fae7a", "#0b4a37", "#4cc9a0"],
  ["#3d63a8", "#1a2f5c", "#7f9cf5"],
  ["#e8a200", "#9a3d00", "#ffcf5c"],
  ["#d0457f", "#3a1053", "#ff8fb1"],
  ["#1d9a6c", "#0b3b4a", "#5ee0b0"],
  ["#ff8a3d", "#7a2a00", "#ffd29a"],
  ["#7a3b8f", "#2e1440", "#d06bd4"],
  ["#147a5b", "#0b2f40", "#3d63a8"],
];
const HL_DUR = [5200, 6500, 6800, 6800, 6500, 7200, 6800, 0];
function hlOpen(ym) {
  SND.play("fanfare");
  const D = hlData(ym);
  HL.D = D;
  HL.i = 0;
  HL.paused = false;
  if (store.settings.hlSeen !== ym) {
    store.settings.hlSeen = ym;
    saveSettings();
  }
  let o = $("hlBg");
  if (o) o.remove();
  o = document.createElement("div");
  o.id = "hlBg";
  o.setAttribute("data-noi18n", "");
  o.setAttribute("role", "dialog");
  o.setAttribute("aria-modal", "true");
  o.setAttribute(
    "aria-label",
    uiText("hl_title", {
      m: monName(ym),
    })
  );
  const M = monName(ym).toUpperCase(),
    c = D.c,
    T3 = D.top,
    prevM = monName(shiftYm(ym, -1)),
    first = new Date(ym + "-01T12:00").getDay(),
    off = (first + 6) % 7,
    mx = Math.max(1, ...D.days);
  const TY = {
    owl: ["🦉", "hl_t_owl"],
    fox: ["🦊", "hl_t_fox"],
    squirrel: ["🐿️", "hl_t_sq"],
    party: ["🎉", "hl_t_party"],
    foodie: ["🍝", "hl_t_food"],
    pro: ["🧭", "hl_t_pro"],
  }[D.type];
  const podH = [150, 210, 110],
    podOrder = [1, 0, 2],
    podC = [
      ["#ffe08a", "#e8a200"],
      ["#7fc8ff", "#3d7fd0"],
      ["#ffb3c8", "#e0577f"],
    ];
  o.innerHTML = `<div class="hlph"><div class="hlmesh" id="hlMesh"><i></i><i></i><i></i></div><div class="hlgrain"></div><div class="hlparts">${[...Array(22)].map(() => `<i style="left:${(Math.random() * 100).toFixed(1)}%;animation-duration:${(8 + Math.random() * 10).toFixed(1)}s;animation-delay:${(-Math.random() * 10).toFixed(1)}s;width:${(2 + Math.random() * 3).toFixed(1)}px;height:${(2 + Math.random() * 3).toFixed(1)}px"></i>`).join("")}</div>
   <div class="hlbars">${HL_DUR.map(() => "<i><u></u></i>").join("")}</div>
   <div class="hlhead"><b>M</b><span>${escHtml(
     uiText("hl_title", {
       m: monName(ym),
     })
   )}</span><button type="button" class="hlx" data-hlclose aria-label="${escHtml(uiText("hl_close"))}"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
   <div class="hlsl" data-i="0"><div class="hlk hlw">${escHtml(uiText("hl_your"))}</div><div class="hllet">${[...M].map((ch) => `<span>${escHtml(ch)}</span>`).join("")}</div><div class="hlh2"><span class="hlw">${escHtml(uiText("hl_ready"))}</span> <span class="hlw">👀</span></div></div>
   <div class="hlsl c" data-i="1"><div class="hlk hlw">${escHtml(
     uiText("hl_spent", {
       m: M,
     })
   )}</div><svg class="hlring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fg" id="hlRing"/></svg>
     <div class="hlbig" style="margin-top:150px"><span id="hlN1">0 €</span></div>${
       c.income > 0
         ? `<div class="hlw hlsub">${escHtml(
             uiText("hl_of", {
               n: fmtEur0(c.income),
             })
           )}</div>`
         : ""
     }
     ${
       D.delta != null
         ? `<div style="margin-top:140px"><span class="hlstamp ${D.delta > 0 ? "up" : ""}" id="hlSt">${escHtml(
             uiText(D.delta > 0 ? "hl_more" : "hl_less", {
               n: String(Math.abs(D.delta)),
               m: prevM,
             })
           )}</span></div>`
         : ""
     }</div>
   <div class="hlsl" data-i="2"><div class="hlk hlw">${escHtml(uiText("hl_pod"))}</div><div class="hlh2 hlw">${escHtml(uiText("hl_pod_s"))}</div>
     <div class="hlpod">${podOrder
       .map((j) => {
         const x = T3[j];
         if (!x) return `<div></div>`;
         return `<div><span class="em">${x.e}</span><div class="bl" style="background:linear-gradient(${podC[j][0]},${podC[j][1]})" data-h="${podH[j]}">${j + 1}<small>${escHtml(fmtEur0(x.v))}</small></div><span class="nm">${escHtml(tr(x.k))}</span></div>`;
       })
       .join("")}</div></div>
   <div class="hlsl" data-i="3"><div class="hlk hlw">${escHtml(uiText("hl_heat"))}</div><div class="hlh2 hlw">${escHtml(uiText("hl_heat_s"))}</div>
     <div class="hlhm">${[...Array(7).keys()]
       .map(
         (i) =>
           `<b>${escHtml(
             new Intl.DateTimeFormat(cLoc(), {
               weekday: "narrow",
             }).format(new Date(2024, 0, 1 + i))
           )}</b>`
       )
       .join("")}${"<i class='x'></i>".repeat(off)}${[...Array(D.dim).keys()]
       .map((i) => {
         const d = i + 1,
           v = D.days[d] / mx;
         return `<i data-d="${d}" style="--v:${v.toFixed(3)}" class="${d === D.hot ? "hot" : ""}">${d}</i>`;
       })
       .join("")}</div>
     <div class="hlcall" id="hlCall">${escHtml(
       new Intl.DateTimeFormat(cLoc(), {
         weekday: "short",
         day: "numeric",
       }).format(new Date(ym + "-" + pad(D.hot) + "T12:00"))
     )} · ${escHtml(fmtEur0(D.days[D.hot]))}</div>
     <div class="hlw hlsub" style="margin-top:16px">${escHtml(
       uiText("hl_calm", {
         d: new Intl.DateTimeFormat(cLoc(), {
           weekday: "short",
           day: "numeric",
         }).format(new Date(ym + "-" + pad(D.calm) + "T12:00")),
         n: fmtEur0(D.days[D.calm]),
       })
     )}</div></div>
   <div class="hlsl c" data-i="4"><div class="hlk hlw">${escHtml(uiText(D.net > 0 ? "hl_saved" : "hl_tight"))}</div><div class="hlbig"><span id="hlN4">0 €</span></div>
     <div class="hljar"><svg viewBox="0 0 200 250"><defs><clipPath id="hlJc"><path d="M50 30h100v18c22 10 30 30 30 52v120a24 24 0 0 1-24 24H44a24 24 0 0 1-24-24V100c0-22 8-42 30-52z"/></clipPath></defs><path d="M50 30h100v18c22 10 30 30 30 52v120a24 24 0 0 1-24 24H44a24 24 0 0 1-24-24V100c0-22 8-42 30-52z" fill="rgba(255,255,255,.12)" stroke="#fff" stroke-width="5"/>
       <g clip-path="url(#hlJc)"><g id="hlWv" style="transform:translateY(250px);transition:transform 2.2s cubic-bezier(.3,1,.3,1)"><path class="w1" d="M-200 10 q25 -12 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V300 H-200z" fill="#3cc28d"/><path class="w2" d="M-200 18 q25 -10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V300 H-200z" fill="#1d9a6c"/></g></g><rect x="44" y="16" width="112" height="20" rx="7" fill="#fff"/></svg></div>
     <div class="hlw hlsub">${
       D.net > 0 && c.income > 0
         ? escHtml(
             uiText("hl_rate", {
               n: String(Math.round(D.rate * 100)),
             })
           )
         : escHtml(uiText("hl_tight_s"))
     }</div>${
       D.goal && D.gp != null
         ? `<div class="hlw hlsub" style="opacity:1;font-weight:800">🎯 ${escHtml(
             uiText("hl_goal", {
               g: D.goal.name,
               n: String(Math.round(D.gp * 100)),
             })
           )}</div>`
         : ""
     }</div>
   <div class="hlsl c" data-i="5"><div class="hlk hlw">${escHtml(uiText("hl_type"))}</div><div class="hlflip" id="hlFl"><div class="fr">?</div><div class="bk"><div style="font-size:78px">${TY[0]}</div><div class="hlh2" style="margin:2px 0 6px">${escHtml(uiText(TY[1]))}</div><p>${escHtml(uiText(TY[1] + "_s"))}</p><div>${D.traits.map((t) => `<span class="tr">${escHtml(t)}</span>`).join("")}</div></div></div></div>
   <div class="hlsl c" data-i="6"><div class="hlrays"></div><div class="hlk hlw" style="position:relative">${escHtml(uiText("hl_badges"))}</div><div class="hlmed">${D.badges.map(([e, k, m, v]) => `<div class="md ${m}"><div class="rb"></div><div class="co">${e}</div><b>${escHtml(uiText(k, v))}</b></div>`).join("")}</div>
     <div class="hlh2 hlw" style="margin-top:22px;position:relative">${escHtml(
       uiText(D.badges.length === 1 ? "hl_b_one" : "hl_b_n", {
         n: String(D.badges.length),
       })
     )} 🎉</div></div>
   <div class="hlsl" data-i="7"><div class="hlk hlw">${escHtml(uiText("hl_your"))} ${escHtml(M)}</div><div class="hlh2 hlw">${escHtml(uiText("hl_sum"))}</div>
     <div class="hlcoll"><div class="t a"><small>${escHtml(uiText("hl_c_spent"))}</small><b>${D.delta != null ? (D.delta > 0 ? "+" : "−") + Math.abs(D.delta) + " %" : escHtml(fmtEur0(c.expenses))}</b><small>${
       D.delta != null
         ? escHtml(
             uiText("hl_c_vs", {
               m: prevM,
             })
           )
         : ""
     }</small></div>
      <div class="t b"><small>${escHtml(uiText("hl_c_top"))}</small><div style="font-size:44px;margin:8px 0">${T3[0] ? T3[0].e : "💸"}</div><b>${escHtml(T3[0] ? tr(T3[0].k) : "–")}</b></div>
      <div class="t c"><small>${escHtml(uiText("hl_c_saved"))}</small><b>${D.net > 0 ? Math.round(D.rate * 100) + " %" : "–"}</b><small>🐷</small></div>
      <div class="t d"><small>${escHtml(uiText("hl_c_type"))}</small><b style="font-size:19px">${TY[0]} ${escHtml(uiText(TY[1]))}</b></div>
      <div class="t e"><small>${escHtml(uiText("hl_c_badges"))}</small><div style="font-size:28px;margin-top:6px">${D.badges.map((b) => b[0]).join("")}</div></div>
      <button type="button" class="t f" data-hlshare>${escHtml(uiText("hl_share"))} ↗</button></div></div>
   <div class="hlmami" id="hlMa">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub" id="hlMt"></div></div>
   <div class="hltap l" data-hlprev></div><div class="hltap r" data-hlnext></div></div>`;
  document.body.appendChild(o);
  document.body.classList.add("locked");
  requestAnimationFrame(() => o.classList.add("on"));
  hlGo(0);
}
function hlMami(t) {
  const m = $("hlMa");
  if (!m) return;
  m.classList.remove("on");
  clearTimeout(HL.mt);
  HL.mt = setTimeout(() => {
    $("hlMt").textContent = mFill(t);
    m.classList.add("on");
  }, 260);
}
function hlGo(i) {
  const o = $("hlBg");
  if (!o) return;
  const D = HL.D,
    N = HL_DUR.length;
  if (i < 0) i = 0;
  if (i >= N) {
    hlClose();
    return;
  }
  HL.i = i;
  clearTimeout(HL.t);
  clearTimeout(HL.mt);
  $("hlMa").classList.remove("on");
  [...$("hlMesh").children].forEach((b, j) => (b.style.background = HL_MESH[i][j]));
  [...o.querySelectorAll(".hlbars u")].forEach((u, j) => {
    u.style.transition = "none";
    u.style.width = j < i ? "100%" : "0";
  });
  o.querySelectorAll(".hlsl").forEach((s) => s.classList.toggle("on", Number(s.dataset.i) === i));
  const sl = o.querySelector(`.hlsl[data-i="${i}"]`),
    R = reducedMotion();
  sl.querySelectorAll(".hlw").forEach((e) => e.classList.remove("on"));
  if (!R)
    sl.animate(
      [
        {
          opacity: 0,
          transform: "scale(1.06)",
        },
        {
          opacity: 1,
          transform: "none",
          filter: "none",
        },
      ],
      {
        duration: 650,
        easing: "cubic-bezier(.2,1,.3,1)",
      }
    );
  sl.querySelectorAll(".hlw").forEach((e, k) => setTimeout(() => e.classList.add("on"), R ? 0 : 120 + k * 120));
  const dur = HL_DUR[i];
  if (dur) {
    const u = o.querySelectorAll(".hlbars u")[i];
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        u.style.transition = `width ${dur}ms linear`;
        u.style.width = "100%";
      })
    );
    HL.t = setTimeout(() => {
      if (!HL.paused) hlGo(i + 1);
    }, dur);
    HL.end = performance.now() + dur;
  } else o.querySelectorAll(".hlbars u")[i].style.width = "100%";
  const S2 = (f, ms) =>
      setTimeout(
        () => {
          if (HL.i === i && $("hlBg")) f();
        },
        R ? 0 : ms
      ),
    ph = o.querySelector(".hlph");
  if (i === 0) {
    sl.querySelectorAll(".hllet span").forEach((s, k) => S2(() => s.classList.add("on"), 250 + k * 100));
    S2(() => hbConfetti(ph, 44), 1200);
    S2(() => hlMami(uiText("hl_m0")), 1800);
  }
  if (i === 1) {
    S2(() => hbOdo($("hlN1"), fmtEur0(D.c.expenses), 1700), 250);
    const rg = $("hlRing");
    rg.style.transition = "none";
    rg.style.strokeDasharray = "0 277";
    S2(() => {
      rg.style.transition = "stroke-dasharray 2.2s cubic-bezier(.2,1,.3,1)";
      rg.style.strokeDasharray = `${(277 * Math.min(1, D.c.income > 0 ? D.c.expenses / D.c.income : 0.75)).toFixed(1)} 277`;
    }, 300);
    const st = $("hlSt");
    if (st) {
      st.classList.remove("on");
      S2(() => {
        st.classList.add("on");
        S2(() => {
          ph.classList.remove("shake");
          void ph.offsetWidth;
          ph.classList.add("shake");
          const r = st.getBoundingClientRect(),
            p = ph.getBoundingClientRect();
          hbBurst(ph, r.left - p.left + r.width / 2, r.top - p.top + r.height / 2, 20);
        }, 420);
      }, 2400);
    }
    S2(
      () =>
        hlMami(
          D.delta != null && D.delta < 0
            ? uiText("hl_m1_good", {
                n: String(Math.abs(D.delta)),
              })
            : uiText("hl_m1")
        ),
      3300
    );
  }
  if (i === 2) {
    const cols = [...sl.querySelectorAll(".hlpod>div")];
    cols.forEach((cl) => {
      const b = cl.querySelector(".bl");
      if (b) {
        b.style.transition = "none";
        b.style.height = "0";
      }
      const em = cl.querySelector(".em");
      if (em) em.classList.remove("on");
      const nm = cl.querySelector(".nm");
      if (nm) nm.classList.remove("on");
    });
    [2, 0, 1].forEach((j, k) =>
      S2(
        () => {
          const b = cols[j] && cols[j].querySelector(".bl");
          if (b) {
            b.style.transition = "";
            b.style.height = b.dataset.h + "px";
          }
        },
        500 + k * 330
      )
    );
    [2, 0, 1].forEach((j, k) =>
      S2(
        () => {
          const cl = cols[j];
          if (!cl) return;
          const em = cl.querySelector(".em"),
            nm = cl.querySelector(".nm");
          if (em) em.classList.add("on");
          if (nm) nm.classList.add("on");
          if (j === 1 && em) {
            setTimeout(() => {
              const r = em.getBoundingClientRect(),
                p = ph.getBoundingClientRect();
              hbBurst(ph, r.left - p.left + r.width / 2, r.top - p.top + r.height / 2, 24);
            }, 500);
          }
        },
        1700 + k * 260
      )
    );
    const t0 = D.top[0],
      bu = t0 && (store.settings.budgets || {})[t0.k];
    S2(
      () =>
        hlMami(
          t0
            ? bu && t0.v <= +bu
              ? uiText("hl_m2_bud", {
                  c: tr(t0.k),
                  n: fmtEur0(+bu - t0.v),
                })
              : uiText("hl_m2", {
                  c: tr(t0.k),
                })
            : uiText("hl_m2_none")
        ),
      3300
    );
  }
  if (i === 3) {
    const cells = [...sl.querySelectorAll(".hlhm i[data-d]")];
    cells.forEach((c) => c.classList.remove("on"));
    $("hlCall").classList.remove("on");
    cells.forEach((c, k) => {
      const idx = k + hlOff(D.ym),
        r = Math.floor(idx / 7),
        col = idx % 7;
      S2(() => c.classList.add("on"), 300 + (r + col) * 85);
    });
    S2(() => {
      const h = sl.querySelector(".hlhm i.hot"),
        cl = $("hlCall");
      if (h) {
        const r = h.getBoundingClientRect(),
          p = sl.getBoundingClientRect();
        cl.style.left = r.left - p.left + r.width / 2 + "px";
        cl.style.top = r.top - p.top - 10 + "px";
        cl.classList.add("on");
      }
    }, 1900);
  }
  if (i === 4) {
    const wv = $("hlWv");
    wv.style.transition = "none";
    wv.style.transform = "translateY(250px)";
    S2(() => hbOdo($("hlN4"), fmtEur0(Math.abs(D.net)), 2000), 300);
    const lvl = D.net > 0 ? Math.max(0.15, Math.min(0.9, D.rate * 2.2)) : 0.08;
    S2(() => {
      wv.style.transition = "";
      wv.style.transform = `translateY(${(240 - 200 * lvl).toFixed(0)}px)`;
    }, 900);
    if (!R) {
      const jar = sl.querySelector(".hljar");
      for (let k = 0; k < (D.net > 0 ? 12 : 3); k++)
        S2(
          () => {
            const r = jar.getBoundingClientRect(),
              p = ph.getBoundingClientRect(),
              x1 = r.left - p.left + r.width / 2,
              y1 = r.top - p.top + 50,
              cn = document.createElement("div");
            cn.className = "hbcoin";
            cn.style.position = "absolute";
            cn.textContent = "€";
            ph.appendChild(cn);
            const x0 = 30 + Math.random() * (p.width - 60);
            cn.animate(
              [
                {
                  transform: `translate(${x0}px,40px) rotate(0)`,
                },
                {
                  transform: `translate(${x1 + (Math.random() - 0.5) * 60}px,${y1}px) rotate(540deg)`,
                  opacity: 1,
                },
                {
                  transform: `translate(${x1}px,${y1 + 60}px) scale(.4)`,
                  opacity: 0,
                },
              ],
              {
                duration: 1000,
                easing: "cubic-bezier(.5,0,.6,1)",
                fill: "forwards",
              }
            )
              .finished.then(() => cn.remove())
              .catch(() => cn.remove());
          },
          350 + k * 110
        );
    }
    S2(() => hlMami(D.net > 0 ? uiText("hl_m4") : uiText("hl_m4_t")), 3400);
  }
  if (i === 5) {
    const fl = $("hlFl");
    fl.classList.remove("on");
    sl.querySelectorAll(".tr").forEach((t) => t.classList.remove("on"));
    S2(() => {
      if (!R)
        fl.animate(
          [
            {
              transform: "rotateZ(0)",
            },
            {
              transform: "rotateZ(-4deg)",
            },
            {
              transform: "rotateZ(4deg)",
            },
            {
              transform: "rotateZ(0)",
            },
          ],
          {
            duration: 500,
          }
        );
    }, 900);
    S2(() => {
      fl.classList.add("on");
    }, 1500);
    S2(() => {
      const r = fl.getBoundingClientRect(),
        p = ph.getBoundingClientRect();
      hbBurst(ph, r.left - p.left + r.width / 2, r.top - p.top + r.height / 2, 30);
    }, 2500);
    sl.querySelectorAll(".tr").forEach((t, k) => S2(() => t.classList.add("on"), 2800 + k * 160));
  }
  if (i === 6) {
    const ms = [...sl.querySelectorAll(".md")];
    ms.forEach((m) => m.classList.remove("on"));
    ms.forEach((m, k) => S2(() => m.classList.add("on"), 400 + k * 380));
    S2(() => hbConfetti(ph, 60), 1900);
    S2(() => hlMami(uiText("hl_m6")), 2600);
  }
  if (i === 7) {
    const ts = [...sl.querySelectorAll(".hlcoll .t")];
    ts.forEach((t, k) => {
      if (R) return;
      const dx = (Math.random() - 0.5) * 600,
        dy = 400 + Math.random() * 200,
        r = (Math.random() - 0.5) * 60;
      t.animate(
        [
          {
            opacity: 0,
            transform: `translate(${dx}px,${dy}px) rotate(${r}deg) scale(.6)`,
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 900,
          delay: 250 + k * 150,
          easing: "cubic-bezier(.2,1.25,.35,1)",
          fill: "backwards",
        }
      );
    });
  }
}
function hlOff(ym) {
  return (new Date(ym + "-01T12:00").getDay() + 6) % 7;
}
function hlClose() {
  const o = $("hlBg");
  clearTimeout(HL.t);
  clearTimeout(HL.mt);
  if (!o) return;
  o.classList.remove("on");
  document.body.classList.remove("locked");
  setTimeout(() => {
    o.remove();
    render();
  }, 320);
}
async function hlShare() {
  const D = HL.D;
  if (!D) return;
  const cv = document.createElement("canvas");
  cv.width = 1080;
  cv.height = 1350;
  const g = cv.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 1080, 1350);
  gr.addColorStop(0, "#147a5b");
  gr.addColorStop(1, "#0b2f40");
  g.fillStyle = gr;
  g.fillRect(0, 0, 1080, 1350);
  const TY = {
    owl: ["🦉", "hl_t_owl"],
    fox: ["🦊", "hl_t_fox"],
    squirrel: ["🐿️", "hl_t_sq"],
    party: ["🎉", "hl_t_party"],
    foodie: ["🍝", "hl_t_food"],
    pro: ["🧭", "hl_t_pro"],
  }[D.type];
  g.fillStyle = "#7ff0c2";
  g.font = "800 40px Inter, system-ui, sans-serif";
  g.fillText(
    uiText("hl_title", {
      m: monName(D.ym),
    }).toUpperCase(),
    80,
    140
  );
  g.fillStyle = "#fff";
  g.font = "900 96px Inter, system-ui, sans-serif";
  g.fillText(monName(D.ym), 80, 250);
  const box = (x, y, w, h, c1, c2, lines) => {
    const gg = g.createLinearGradient(x, y, x + w, y + h);
    gg.addColorStop(0, c1);
    gg.addColorStop(1, c2);
    g.fillStyle = gg;
    g.beginPath();
    g.roundRect(x, y, w, h, 40);
    g.fill();
    let yy = y + 70;
    for (const [t, f, col] of lines) {
      g.fillStyle = col || "#fff";
      g.font = f;
      g.fillText(t, x + 40, yy);
      yy += parseInt(f.split(" ")[1]) + 22;
    }
  };
  box(80, 320, 440, 300, "#3d63a8", "#1a2f5c", [
    [uiText("hl_c_spent"), "700 34px Inter"],
    [D.delta != null ? (D.delta > 0 ? "+" : "−") + Math.abs(D.delta) + " %" : "–", "900 96px Inter"],
    [
      D.delta != null
        ? uiText("hl_c_vs", {
            m: monName(shiftYm(D.ym, -1)),
          })
        : "",
      "600 30px Inter",
    ],
  ]);
  box(560, 320, 440, 300, "#e8a200", "#9a5a00", [
    [uiText("hl_c_top"), "700 34px Inter"],
    [D.top[0] ? D.top[0].e : "💸", "400 96px Inter"],
    [D.top[0] ? tr(D.top[0].k) : "–", "900 44px Inter"],
  ]);
  box(80, 660, 440, 300, "#1fae7a", "#0b4a37", [
    [uiText("hl_c_saved"), "700 34px Inter"],
    [D.net > 0 ? Math.round(D.rate * 100) + " %" : "–", "900 96px Inter"],
    ["🐷", "400 50px Inter"],
  ]);
  box(560, 660, 440, 300, "#ffd9a0", "#e0a060", [
    [uiText("hl_c_type"), "700 34px Inter", "#5a3200"],
    [TY[0], "400 96px Inter", "#5a3200"],
    [uiText(TY[1]), "900 40px Inter", "#5a3200"],
  ]);
  box(80, 1000, 920, 200, "#7a3b8f", "#2e1440", [
    [uiText("hl_c_badges"), "700 34px Inter"],
    [D.badges.map((b) => b[0]).join("  "), "400 80px Inter"],
  ]);
  g.fillStyle = "rgba(255,255,255,.75)";
  g.font = "700 32px Inter";
  g.fillText("Finanz MAMI", 80, 1290);
  const url = cv.toDataURL("image/jpeg", 0.9),
    name = `finanz-mami-${D.ym}.jpg`;
  if (window.AndroidBridge && (AndroidBridge.shareImage || AndroidBridge.saveFileB64)) return rcptShare(url, name);
  try {
    const bl = await (await fetch(url)).blob(),
      f = new File([bl], name, {
        type: "image/jpeg",
      });
    if (
      navigator.canShare &&
      navigator.canShare({
        files: [f],
      })
    ) {
      await navigator.share({
        files: [f],
        title: "Finanz MAMI",
      });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast(uiText("hl_saved_img"));
}
document.addEventListener("click", (e) => {
  const op = e.target.closest("[data-hlopen]");
  if (op) {
    e.preventDefault();
    hlOpen(op.dataset.hlopen);
    return;
  }
  if (!$("hlBg")) return;
  if (e.target.closest("[data-hlclose]")) {
    hlClose();
    return;
  }
  if (e.target.closest("[data-hlshare]")) {
    hlShare();
    return;
  }
  if (e.target.closest("[data-hlnext]")) {
    hlGo(HL.i + 1);
    return;
  }
  if (e.target.closest("[data-hlprev]")) {
    hlGo(HL.i - 1);
    return;
  }
});
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest || !e.target.closest(".hltap")) return;
  HL.paused = true;
  HL.pd = performance.now();
  clearTimeout(HL.t);
  const u = document.querySelectorAll("#hlBg .hlbars u")[HL.i];
  if (u) {
    const w = getComputedStyle(u).width;
    u.style.transition = "none";
    u.style.width = w;
  }
});
document.addEventListener("pointerup", (e) => {
  if (!HL.paused) return;
  const held = performance.now() - (HL.pd || 0);
  HL.paused = false;
  if (held > 350) {
    e.preventDefault();
    const i = HL.i,
      rest = Math.max(800, (HL.end || 0) - (HL.pd || 0));
    HL.end = performance.now() + rest;
    const u = document.querySelectorAll("#hlBg .hlbars u")[i];
    if (u && HL_DUR[i]) {
      u.style.transition = `width ${rest}ms linear`;
      u.style.width = "100%";
      HL.t = setTimeout(() => {
        if (HL.i === i) hlGo(i + 1);
      }, rest);
    }
    HL.skipClick = true;
    setTimeout(() => (HL.skipClick = false), 50);
  }
});
document.addEventListener(
  "click",
  (e) => {
    if (HL.skipClick && e.target.closest(".hltap")) {
      e.stopImmediatePropagation();
    }
  },
  true
);
document.addEventListener("keydown", (e) => {
  if (!$("hlBg")) return;
  if (e.key === "Escape") hlClose();
  else if (e.key === "ArrowRight") hlGo(HL.i + 1);
  else if (e.key === "ArrowLeft") hlGo(HL.i - 1);
});
Object.assign(TEXTS, {
  am_aa: [
    "Arbeitsamt",
    "employment agency",
    "İş Ajansı",
    "агентство занятости",
    "агентство зайнятості",
    "urząd pracy",
    "وكالة العمل",
    "agenția de muncă",
  ],
  am_jc: ["Jobcenter", "job centre", "Jobcenter", "Jobcenter", "Jobcenter", "Jobcenter", "مركز العمل", "Jobcenter"],
  am_alg: [
    "Arbeitslosengeld",
    "unemployment benefit",
    "işsizlik parası",
    "пособие по безработице",
    "допомога з безробіття",
    "zasiłek",
    "إعانة البطالة",
    "ajutor de șomaj",
  ],
  am_gs: [
    "Grundsicherung",
    "basic income support",
    "temel güvence",
    "базовое пособие",
    "базова допомога",
    "zasiłek podstawowy",
    "الإعانة الأساسية",
    "ajutor social de bază",
  ],
  tm_title: [
    "Termine & Fristen",
    "Appointments & deadlines",
    "Randevular ve süreler",
    "Встречи и сроки",
    "Зустрічі та терміни",
    "Terminy i wizyty",
    "المواعيد والمهل",
    "Programări și termene",
  ],
  tm_nextt: [
    "Nächster Termin",
    "Next appointment",
    "Sonraki randevu",
    "Следующая встреча",
    "Наступна зустріч",
    "Następna wizyta",
    "الموعد التالي",
    "Următoarea programare",
  ],
  tm_nextf: [
    "Nächste Frist",
    "Next deadline",
    "Sonraki süre",
    "Следующий срок",
    "Наступний термін",
    "Następny termin",
    "المهلة التالية",
    "Următorul termen",
  ],
  tm_today: ["heute", "today", "bugün", "сегодня", "сьогодні", "dziś", "اليوم", "azi"],
  tm_tom: ["morgen", "tomorrow", "yarın", "завтра", "завтра", "jutro", "غدًا", "mâine"],
  tm_past: ["vorbei", "past", "geçti", "прошло", "минуло", "minęło", "انتهى", "trecut"],
  tm_days: [
    "in {n} Tagen",
    "in {n} days",
    "{n} gün sonra",
    "через {n} дн.",
    "через {n} дн.",
    "za {n} dni",
    "بعد {n} أيام",
    "în {n} zile",
  ],
  tm_day1: ["Tag", "day", "gün", "день", "день", "dzień", "يوم", "zi"],
  tm_daysw: ["Tage", "days", "gün", "дн.", "дн.", "dni", "أيام", "zile"],
  tm_edit: ["Bearbeiten", "Edit", "Düzenle", "Изменить", "Редагувати", "Edytuj", "تعديل", "Editează"],
  tm_mami0: [
    "Heute ist dein Termin{t} – du schaffst das, {a}! Hast du alles dabei? 💚",
    "Your appointment is today{t} – you’ve got this, {a}! Got everything? 💚",
    "Randevun bugün{t} – başaracaksın {a}! Her şey yanında mı? 💚",
    "Сегодня твоя встреча{t} – ты справишься, {a}! Всё взял? 💚",
    "Сьогодні твоя зустріч{t} – ти впораєшся, {a}! Усе взяв? 💚",
    "Dziś twoja wizyta{t} – dasz radę, {a}! Masz wszystko? 💚",
    "موعدك اليوم{t} – ستنجح يا {a}! هل معك كل شيء؟ 💚",
    "Azi ai programarea{t} – reușești, {a}! Ai tot ce trebuie? 💚",
  ],
  tm_mami1: [
    "Morgen ist dein Termin{t}, {a}. Pack heute schon alles ein! 🎒",
    "Your appointment is tomorrow{t}, {a}. Pack everything today! 🎒",
    "Randevun yarın{t}, {a}. Her şeyi bugünden hazırla! 🎒",
    "Завтра твоя встреча{t}, {a}. Собери всё уже сегодня! 🎒",
    "Завтра твоя зустріч{t}, {a}. Збери все вже сьогодні! 🎒",
    "Jutro twoja wizyta{t}, {a}. Spakuj wszystko już dziś! 🎒",
    "موعدك غدًا{t} يا {a}. جهّز كل شيء اليوم! 🎒",
    "Mâine ai programarea{t}, {a}. Pregătește totul de azi! 🎒",
  ],
  tm_bring: [
    "Mitnehmen",
    "Bring along",
    "Yanına al",
    "Взять с собой",
    "Взяти з собою",
    "Zabierz ze sobą",
    "أحضر معك",
    "De luat",
  ],
  tm_b_id: [
    "Personalausweis",
    "ID card",
    "Kimlik kartı",
    "Удостоверение личности",
    "Посвідчення особи",
    "Dowód osobisty",
    "بطاقة الهوية",
    "Buletin",
  ],
  tm_b_inv: [
    "Einladungsschreiben",
    "Invitation letter",
    "Davet mektubu",
    "Письмо-приглашение",
    "Лист-запрошення",
    "Zaproszenie",
    "خطاب الدعوة",
    "Scrisoarea de invitație",
  ],
  tm_b_bw: [
    "Bewerbungsnachweise",
    "Proof of applications",
    "Başvuru kanıtları",
    "Подтверждения заявок",
    "Підтвердження заявок",
    "Potwierdzenia aplikacji",
    "إثباتات التقديم",
    "Dovezi ale candidaturilor",
  ],
  tm_b_docs: [
    "Unterlagen vollständig",
    "Documents complete",
    "Belgeler tamam",
    "Документы готовы",
    "Документи готові",
    "Dokumenty kompletne",
    "المستندات مكتملة",
    "Documente complete",
  ],
  tm_b_more: [
    "Noch etwas mitnehmen …",
    "Something else …",
    "Başka bir şey …",
    "Что-то ещё …",
    "Ще щось …",
    "Coś jeszcze …",
    "شيء آخر …",
    "Altceva …",
  ],
  tm_was: [
    "Ich war da – Nachweis speichern",
    "I was there – save proof",
    "Oradaydım – kanıtı kaydet",
    "Я был там – сохранить подтверждение",
    "Я був там – зберегти підтвердження",
    "Byłem – zapisz potwierdzenie",
    "حضرت – احفظ الإثبات",
    "Am fost – salvează dovada",
  ],
  tm_donef: [
    "Erledigt – abhaken",
    "Done – tick off",
    "Tamam – işaretle",
    "Готово – отметить",
    "Готово – відмітити",
    "Zrobione – odhacz",
    "تم – علّم",
    "Gata – bifează",
  ],
  tm_later: [
    "Am Termin-Tag kannst du hier abhaken, dass du da warst.",
    "On the day you can tick off here that you were there.",
    "Randevu günü burada orada olduğunu işaretleyebilirsin.",
    "В день встречи здесь можно отметить, что ты был.",
    "У день зустрічі тут можна відмітити, що ти був.",
    "W dniu wizyty możesz tu odhaczyć, że byłeś.",
    "في يوم الموعد يمكنك هنا تأكيد حضورك.",
    "În ziua programării poți bifa aici că ai fost.",
  ],
  tm_none: [
    "Kein Termin offen",
    "No open appointments",
    "Açık randevu yok",
    "Нет открытых встреч",
    "Немає відкритих зустрічей",
    "Brak otwartych terminów",
    "لا مواعيد مفتوحة",
    "Nicio programare deschisă",
  ],
  tm_none_s: [
    "Alles erledigt",
    "All done",
    "Hepsi tamam",
    "Всё сделано",
    "Усе зроблено",
    "Wszystko załatwione",
    "تم كل شيء",
    "Totul e gata",
  ],
  tm_after: ["Danach", "Coming up", "Sonra", "Далее", "Далі", "Potem", "لاحقًا", "Urmează"],
  tm_new: [
    "Termin oder Frist",
    "Appointment or deadline",
    "Randevu veya süre",
    "Встреча или срок",
    "Зустріч або термін",
    "Termin lub wizyta",
    "موعد أو مهلة",
    "Programare sau termen",
  ],
  tm_done: ["Erledigt", "Done", "Tamamlandı", "Выполнено", "Виконано", "Załatwione", "منجز", "Gata"],
  tm_at: ["um {t}", "at {t}", "saat {t}", "в {t}", "о {t}", "o {t}", "الساعة {t}", "la {t}"],
  tm_proof: [
    "Nachweis ansehen",
    "View proof",
    "Kanıtı gör",
    "Посмотреть подтверждение",
    "Переглянути підтвердження",
    "Zobacz potwierdzenie",
    "عرض الإثبات",
    "Vezi dovada",
  ],
  tm_photo: ["Foto", "Photo", "Fotoğraf", "Фото", "Фото", "Zdjęcie", "صورة", "Fotografie"],
  tm_undo: [
    "Wieder öffnen",
    "Reopen",
    "Yeniden aç",
    "Открыть снова",
    "Відкрити знову",
    "Otwórz ponownie",
    "إعادة فتح",
    "Redeschide",
  ],
  tm_hint: [
    "Tipp: Wer einen Termin beim {a} verpasst, dem kann die Leistung gekürzt werden. Kannst du nicht kommen, sag vorher Bescheid.",
    "Tip: missing an appointment with the {a} can lead to cuts. If you can’t come, let them know beforehand.",
    "İpucu: {a} randevusunu kaçırırsan ödemen kesilebilir. Gelemezsen önceden haber ver.",
    "Совет: за пропущенную встречу в {a} пособие могут урезать. Если не можешь прийти, предупреди заранее.",
    "Порада: за пропущену зустріч у {a} допомогу можуть урізати. Якщо не можеш прийти, попередь заздалегідь.",
    "Wskazówka: za opuszczoną wizytę w {a} świadczenie może zostać obniżone. Jeśli nie możesz przyjść, uprzedź wcześniej.",
    "نصيحة: قد تُخفَّض الإعانة إذا فاتك موعد في {a}. إن لم تستطع الحضور فأبلغهم مسبقًا.",
    "Sfat: dacă ratezi o programare la {a}, ți se poate tăia ajutorul. Dacă nu poți veni, anunță dinainte.",
  ],
  tm_what: ["Was?", "What?", "Ne?", "Что?", "Що?", "Co?", "ماذا؟", "Ce?"],
  tm_date: ["Datum", "Date", "Tarih", "Дата", "Дата", "Data", "التاريخ", "Data"],
  tm_time: ["Uhrzeit", "Time", "Saat", "Время", "Час", "Godzina", "الوقت", "Ora"],
  tm_place: [
    "Wo? (optional)",
    "Where? (optional)",
    "Nerede? (isteğe bağlı)",
    "Где? (необязательно)",
    "Де? (необов’язково)",
    "Gdzie? (opcjonalnie)",
    "أين؟ (اختياري)",
    "Unde? (opțional)",
  ],
  tm_place_p: [
    "z. B. Zimmer 214",
    "e.g. room 214",
    "ör. oda 214",
    "напр. кабинет 214",
    "напр. кабінет 214",
    "np. pokój 214",
    "مثلًا غرفة 214",
    "ex. camera 214",
  ],
  tm_k_t: ["Termin", "Appointment", "Randevu", "Встреча", "Зустріч", "Wizyta", "موعد", "Programare"],
  tm_k_f: ["Frist", "Deadline", "Süre", "Срок", "Термін", "Termin", "مهلة", "Termen"],
  tm_del: ["Löschen", "Delete", "Sil", "Удалить", "Видалити", "Usuń", "حذف", "Șterge"],
  tm_cancel: ["Abbrechen", "Cancel", "İptal", "Отмена", "Скасувати", "Anuluj", "إلغاء", "Anulează"],
  tm_save: ["Speichern", "Save", "Kaydet", "Сохранить", "Зберегти", "Zapisz", "حفظ", "Salvează"],
  tm_need: [
    "Bitte Name und Datum eintragen",
    "Please enter name and date",
    "Lütfen ad ve tarih gir",
    "Укажи название и дату",
    "Вкажи назву й дату",
    "Wpisz nazwę i datę",
    "أدخل الاسم والتاريخ",
    "Introdu numele și data",
  ],
  tm_ok: [
    "Eingetragen – ich erinnere dich",
    "Saved – I’ll remind you",
    "Kaydedildi – sana hatırlatırım",
    "Сохранено – я напомню",
    "Збережено – я нагадаю",
    "Zapisane – przypomnę ci",
    "تم الحفظ – سأذكّرك",
    "Salvat – îți amintesc",
  ],
  tm_saved: [
    "Abgehakt! Willst du ein Foto als Nachweis?",
    "Ticked off! Want a photo as proof?",
    "İşaretlendi! Kanıt olarak fotoğraf ister misin?",
    "Отмечено! Сделать фото как подтверждение?",
    "Відмічено! Зробити фото як підтвердження?",
    "Odhaczone! Zrobić zdjęcie jako dowód?",
    "تم! هل تريد صورة كإثبات؟",
    "Bifat! Vrei o fotografie ca dovadă?",
  ],
  tm_proof_ok: [
    "Nachweis gespeichert",
    "Proof saved",
    "Kanıt kaydedildi",
    "Подтверждение сохранено",
    "Підтвердження збережено",
    "Dowód zapisany",
    "تم حفظ الإثبات",
    "Dovada a fost salvată",
  ],
  tm_proof_err: [
    "Foto konnte nicht gespeichert werden",
    "Couldn’t save photo",
    "Fotoğraf kaydedilemedi",
    "Не удалось сохранить фото",
    "Не вдалося зберегти фото",
    "Nie udało się zapisać zdjęcia",
    "تعذّر حفظ الصورة",
    "Fotografia nu a putut fi salvată",
  ],
  tm_h_t: [
    "Pack Ausweis und Einladung ein – und sei pünktlich.",
    "Pack ID and invitation – and be on time.",
    "Kimliğini ve davetini al – ve dakik ol.",
    "Возьми удостоверение и приглашение – и приходи вовремя.",
    "Візьми посвідчення й запрошення – і прийди вчасно.",
    "Weź dowód i zaproszenie – i bądź punktualnie.",
    "خذ الهوية والدعوة – وكن في الموعد.",
    "Ia buletinul și invitația – și fii punctual.",
  ],
  tm_h_f: [
    "Gib die Unterlagen rechtzeitig ab.",
    "Hand in the documents on time.",
    "Belgeleri zamanında teslim et.",
    "Сдай документы вовремя.",
    "Здай документи вчасно.",
    "Złóż dokumenty na czas.",
    "سلّم المستندات في الوقت.",
    "Predă documentele la timp.",
  ],
  zv_title: [
    "Zuverdienst-Rechner",
    "Side income calculator",
    "Ek gelir hesaplayıcı",
    "Калькулятор подработки",
    "Калькулятор підробітку",
    "Kalkulator dorabiania",
    "حاسبة الدخل الإضافي",
    "Calculator venit suplimentar",
  ],
  zv_gross: [
    "Dein Brutto-Lohn im Monat",
    "Your gross pay per month",
    "Aylık brüt maaşın",
    "Твоя зарплата брутто в месяц",
    "Твоя зарплата брутто на місяць",
    "Twoja pensja brutto miesięcznie",
    "راتبك الإجمالي شهريًا",
    "Salariul tău brut lunar",
  ],
  zv_mj: [
    "Minijob {n}",
    "Mini-job {n}",
    "Mini iş {n}",
    "Миниджоб {n}",
    "Мініджоб {n}",
    "Minijob {n}",
    "وظيفة صغيرة {n}",
    "Minijob {n}",
  ],
  zv_exact: ["Genau (€)", "Exact (€)", "Tam (€)", "Точно (€)", "Точно (€)", "Dokładnie (€)", "بالضبط (€)", "Exact (€)"],
  zv_hours: [
    "Std. pro Woche",
    "Hours per week",
    "Haftalık saat",
    "Часов в неделю",
    "Годин на тиждень",
    "Godzin tygodniowo",
    "ساعات أسبوعيًا",
    "Ore pe săptămână",
  ],
  zv_hours_p: [
    "optional",
    "optional",
    "isteğe bağlı",
    "необязательно",
    "необов’язково",
    "opcjonalnie",
    "اختياري",
    "opțional",
  ],
  zv_keep: [
    "Du behältst",
    "You keep",
    "Sende kalan",
    "Тебе остаётся",
    "Тобі залишається",
    "Zostaje ci",
    "يبقى لك",
    "Îți rămân",
  ],
  zv_after: [
    "{a} danach",
    "{a} afterwards",
    "Sonrasında {a}",
    "{a} после",
    "{a} після",
    "{a} potem",
    "{a} بعد ذلك",
    "{a} după",
  ],
  zv_before: [
    "vorher {n}",
    "before {n}",
    "önce {n}",
    "до этого {n}",
    "до цього {n}",
    "wcześniej {n}",
    "قبل ذلك {n}",
    "înainte {n}",
  ],
  zv_total: [
    "Insgesamt im Monat",
    "Total per month",
    "Aylık toplam",
    "Всего в месяц",
    "Усього на місяць",
    "Łącznie miesięcznie",
    "المجموع شهريًا",
    "Total pe lună",
  ],
  zv_tot_s: [
    "statt {n} ohne Job · ≈ {h} pro Stunde extra",
    "instead of {n} without a job · ≈ {h} extra per hour",
    "işsiz {n} yerine · saat başı ≈ {h} ekstra",
    "вместо {n} без работы · ≈ {h} в час сверху",
    "замість {n} без роботи · ≈ {h} на годину зверху",
    "zamiast {n} bez pracy · ≈ {h} więcej za godzinę",
    "بدل {n} بدون عمل · ≈ {h} إضافية بالساعة",
    "în loc de {n} fără job · ≈ {h} în plus pe oră",
  ],
  zv_tot_0: [
    "Schieb den Regler – ich rechne mit",
    "Move the slider – I’ll calculate",
    "Kaydırıcıyı oynat – ben hesaplarım",
    "Двигай ползунок – я посчитаю",
    "Рухай повзунок – я порахую",
    "Przesuń suwak – policzę",
    "حرّك المؤشر – وسأحسب",
    "Mută cursorul – calculez eu",
  ],
  zv_move: [
    "Regler schieben",
    "Move the slider",
    "Kaydırıcıyı oynat",
    "Двигай ползунок",
    "Рухай повзунок",
    "Przesuń suwak",
    "حرّك المؤشر",
    "Mută cursorul",
  ],
  zv_ded: [
    "{n} angerechnet",
    "{n} deducted",
    "{n} mahsup edilir",
    "{n} засчитывается",
    "{n} зараховується",
    "{n} odliczone",
    "يُخصم {n}",
    "{n} se scad",
  ],
  zv_none: [
    "noch kein Lohn",
    "no pay yet",
    "henüz maaş yok",
    "пока нет зарплаты",
    "поки немає зарплати",
    "brak pensji",
    "لا راتب بعد",
    "încă niciun salariu",
  ],
  zv_p_free: ["{n} frei", "{n} free", "{n} muaf", "{n} свободно", "{n} вільно", "{n} wolne", "{n} معفاة", "{n} liberi"],
  zv_p_pct: [
    "{p} % von {n}",
    "{p} % of {n}",
    "{n} tutarının %{p}'i",
    "{p} % от {n}",
    "{p} % від {n}",
    "{p} % z {n}",
    "{p} ٪ من {n}",
    "{p} % din {n}",
  ],
  zv_alg_free: [
    "{n} im Monat frei",
    "{n} per month free",
    "Ayda {n} muaf",
    "{n} в месяц свободно",
    "{n} на місяць вільно",
    "{n} miesięcznie wolne",
    "{n} شهريًا معفاة",
    "{n} pe lună liberi",
  ],
  zv_noamt: [
    "Trag ein, wie viel du vom Amt bekommst – dann stimmt die Summe.",
    "Enter how much you get from the office – then the total is right.",
    "Dairenden ne kadar aldığını gir – toplam doğru olsun.",
    "Укажи, сколько получаешь от ведомства – тогда сумма будет точной.",
    "Вкажи, скільки отримуєш від установи – тоді сума буде точною.",
    "Wpisz, ile dostajesz z urzędu – wtedy suma się zgodzi.",
    "أدخل ما تحصل عليه من الجهة – ليصح المجموع.",
    "Introdu cât primești de la instituție – ca totalul să fie corect.",
  ],
  zv_set: ["Eintragen", "Enter", "Gir", "Указать", "Вказати", "Wpisz", "أدخل", "Introdu"],
  zv_15: [
    "15 Stunden pro Woche erreicht",
    "15 hours a week reached",
    "Haftada 15 saate ulaşıldı",
    "Достигнуто 15 часов в неделю",
    "Досягнуто 15 годин на тиждень",
    "Osiągnięto 15 godzin tygodniowo",
    "تم بلوغ 15 ساعة أسبوعيًا",
    "15 ore pe săptămână atinse",
  ],
  zv_15_s: [
    "Ab 15 Stunden gilt man nicht mehr als arbeitslos – das Arbeitslosengeld kann ganz wegfallen.",
    "From 15 hours you no longer count as unemployed – the benefit may stop completely.",
    "15 saatten itibaren işsiz sayılmazsın – işsizlik parası tamamen kesilebilir.",
    "С 15 часов ты больше не считаешься безработным – пособие может полностью прекратиться.",
    "Від 15 годин ти вже не вважаєшся безробітним – допомога може повністю припинитися.",
    "Od 15 godzin nie jesteś już bezrobotny – zasiłek może zostać wstrzymany.",
    "من 15 ساعة لا تُعتبر عاطلًا – وقد تتوقف الإعانة كليًا.",
    "De la 15 ore nu mai ești considerat șomer – ajutorul poate înceta complet.",
  ],
  zv_svp: [
    "Über der Minijob-Grenze",
    "Above the mini-job limit",
    "Mini iş sınırının üzerinde",
    "Выше лимита миниджоба",
    "Вище ліміту мініджоба",
    "Powyżej limitu minijobu",
    "فوق حد الوظيفة الصغيرة",
    "Peste limita de minijob",
  ],
  zv_svp_s: [
    "Ab hier zahlst du Sozialabgaben – rechne mit etwas weniger Netto.",
    "From here you pay social contributions – expect a bit less net.",
    "Buradan itibaren sosyal kesinti ödersin – neti biraz daha az hesapla.",
    "Отсюда платятся соцвзносы – нетто будет чуть меньше.",
    "Звідси сплачуються соцвнески – нетто буде трохи менше.",
    "Od tego progu płacisz składki – netto będzie trochę mniej.",
    "من هنا تدفع اشتراكات اجتماعية – توقع صافيًا أقل قليلًا.",
    "De aici plătești contribuții – net vei avea puțin mai puțin.",
  ],
  zv_note_gs: [
    "Grundsicherung: 100 € sind frei, darüber bleiben 20 % (bis 520 €), 30 % (bis 1.000 €) und 10 % (bis 1.200 €, mit Kind 1.500 €). Ohne Gewähr – im Zweifel beim Jobcenter fragen.",
    "Basic income support: 100 € free, then 20 % (up to 520 €), 30 % (up to 1,000 €) and 10 % (up to 1,200 €, with child 1,500 €). No guarantee – ask the job centre if unsure.",
    "Temel güvence: 100 € muaf, sonra %20 (520 €'ya kadar), %30 (1.000 €'ya kadar), %10 (1.200 €'ya kadar, çocukla 1.500 €). Garanti yok – emin değilsen Jobcenter'a sor.",
    "Базовое пособие: 100 € свободны, далее 20 % (до 520 €), 30 % (до 1000 €) и 10 % (до 1200 €, с ребёнком 1500 €). Без гарантии – уточни в Jobcenter.",
    "Базова допомога: 100 € вільні, далі 20 % (до 520 €), 30 % (до 1000 €) і 10 % (до 1200 €, з дитиною 1500 €). Без гарантії – уточни в Jobcenter.",
    "Zasiłek podstawowy: 100 € wolne, potem 20 % (do 520 €), 30 % (do 1000 €) i 10 % (do 1200 €, z dzieckiem 1500 €). Bez gwarancji – w razie wątpliwości zapytaj w Jobcenter.",
    "الإعانة الأساسية: 100 € معفاة، ثم 20 ٪ (حتى 520 €) و30 ٪ (حتى 1000 €) و10 ٪ (حتى 1200 €، مع طفل 1500 €). دون ضمان – اسأل مركز العمل عند الشك.",
    "Ajutor de bază: 100 € liberi, apoi 20 % (până la 520 €), 30 % (până la 1.000 €) și 10 % (până la 1.200 €, cu copil 1.500 €). Fără garanție – întreabă la Jobcenter.",
  ],
  zv_note_alg: [
    "Arbeitslosengeld: 165 € Nebenverdienst im Monat sind frei, höchstens unter 15 Stunden pro Woche. Ohne Gewähr – im Zweifel beim Arbeitsamt fragen.",
    "Unemployment benefit: 165 € side income per month is free, under 15 hours a week. No guarantee – ask the agency if unsure.",
    "İşsizlik parası: ayda 165 € ek gelir muaf, haftada 15 saatin altında. Garanti yok – emin değilsen İş Ajansı'na sor.",
    "Пособие по безработице: 165 € подработки в месяц свободны, меньше 15 часов в неделю. Без гарантии – уточни в агентстве.",
    "Допомога з безробіття: 165 € підробітку на місяць вільні, менше 15 годин на тиждень. Без гарантії – уточни в агентстві.",
    "Zasiłek: 165 € dorobku miesięcznie wolne, poniżej 15 godzin tygodniowo. Bez gwarancji – zapytaj w urzędzie.",
    "إعانة البطالة: 165 € دخل إضافي شهريًا معفاة، أقل من 15 ساعة أسبوعيًا. دون ضمان – اسأل الوكالة عند الشك.",
    "Ajutor de șomaj: 165 € venit suplimentar pe lună liberi, sub 15 ore pe săptămână. Fără garanție – întreabă la agenție.",
  ],
  bs_title: [
    "Bescheid-Check",
    "Notice check",
    "Karar kontrolü",
    "Проверка решения",
    "Перевірка рішення",
    "Sprawdzenie decyzji",
    "فحص القرار",
    "Verificare decizie",
  ],
  bs_cur: [
    "Aktuell bewilligt",
    "Currently granted",
    "Şu an onaylı",
    "Сейчас назначено",
    "Зараз призначено",
    "Obecnie przyznane",
    "المعتمد حاليًا",
    "Aprobat acum",
  ],
  bs_month: ["Monat", "month", "ay", "мес.", "міс.", "mies.", "شهر", "lună"],
  bs_until: ["bis {d}", "until {d}", "{d} tarihine kadar", "до {d}", "до {d}", "do {d}", "حتى {d}", "până la {d}"],
  bs_intro: [
    "Bescheid bekommen?",
    "Got a notice?",
    "Karar mı geldi?",
    "Пришло решение?",
    "Прийшло рішення?",
    "Dostałeś decyzję?",
    "وصلك قرار؟",
    "Ai primit o decizie?",
  ],
  bs_intro_s: [
    "Fotografier ihn – ich lese die Zahlen, prüfe sie und merke mir die Fristen.",
    "Take a photo – I’ll read the numbers, check them and remember the deadlines.",
    "Fotoğrafını çek – rakamları okur, kontrol eder ve süreleri hatırlarım.",
    "Сфотографируй – я прочитаю цифры, проверю их и запомню сроки.",
    "Сфотографуй – я прочитаю цифри, перевірю їх і запам’ятаю терміни.",
    "Zrób zdjęcie – odczytam liczby, sprawdzę je i zapamiętam terminy.",
    "صوّره – سأقرأ الأرقام وأتحقق منها وأتذكر المهل.",
    "Fotografiaz-o – citesc cifrele, le verific și rețin termenele.",
  ],
  bs_photo: [
    "Fotografieren",
    "Take photo",
    "Fotoğraf çek",
    "Сфотографировать",
    "Сфотографувати",
    "Zrób zdjęcie",
    "التقاط صورة",
    "Fotografiază",
  ],
  bs_file: [
    "Bild wählen",
    "Choose image",
    "Görsel seç",
    "Выбрать фото",
    "Вибрати фото",
    "Wybierz obraz",
    "اختر صورة",
    "Alege imagine",
  ],
  bs_manual: [
    "Ohne Foto eintragen",
    "Enter without photo",
    "Fotoğrafsız gir",
    "Ввести без фото",
    "Ввести без фото",
    "Wpisz bez zdjęcia",
    "أدخل دون صورة",
    "Introdu fără foto",
  ],
  bs_all: [
    "Deine Bescheide",
    "Your notices",
    "Kararların",
    "Твои решения",
    "Твої рішення",
    "Twoje decyzje",
    "قراراتك",
    "Deciziile tale",
  ],
  bs_w_badge: [
    "Widerspruch {n} T.",
    "Appeal {n} d",
    "İtiraz {n} g",
    "Возражение {n} дн.",
    "Заперечення {n} дн.",
    "Odwołanie {n} dni",
    "اعتراض {n} ي",
    "Contestație {n} z",
  ],
  bs_priv: [
    "Das Foto wird nur auf deinem Gerät gelesen und gespeichert.",
    "The photo is read and stored only on your device.",
    "Fotoğraf yalnızca cihazında okunur ve saklanır.",
    "Фото читается и хранится только на твоём устройстве.",
    "Фото читається й зберігається лише на твоєму пристрої.",
    "Zdjęcie jest odczytywane i zapisywane tylko na twoim urządzeniu.",
    "تُقرأ الصورة وتُحفظ على جهازك فقط.",
    "Fotografia e citită și salvată doar pe dispozitivul tău.",
  ],
  bs_reading: [
    "Ich lese deinen Bescheid …",
    "Reading your notice …",
    "Kararını okuyorum …",
    "Читаю твоё решение …",
    "Читаю твоє рішення …",
    "Czytam twoją decyzję …",
    "أقرأ قرارك …",
    "Citesc decizia ta …",
  ],
  bs_found: [
    "Erkannt – bitte prüfen",
    "Recognized – please check",
    "Tanındı – lütfen kontrol et",
    "Распознано – проверь",
    "Розпізнано – перевір",
    "Rozpoznano – sprawdź",
    "تم التعرف – يرجى التحقق",
    "Recunoscut – verifică te rog",
  ],
  bs_nothing: [
    "Ich konnte nichts sicher lesen",
    "I couldn’t read anything reliably",
    "Hiçbir şeyi net okuyamadım",
    "Не удалось уверенно ничего прочитать",
    "Не вдалося впевнено нічого прочитати",
    "Nie udało się nic pewnie odczytać",
    "لم أتمكن من قراءة شيء بوضوح",
    "N-am putut citi nimic sigur",
  ],
  bs_nothing_s: [
    "Kein Problem – trag die Werte unten einfach selbst ein.",
    "No problem – just enter the values below yourself.",
    "Sorun değil – değerleri aşağıya kendin gir.",
    "Не страшно – просто введи значения ниже сам.",
    "Не страшно – просто введи значення нижче сам.",
    "Nie szkodzi – wpisz wartości poniżej samodzielnie.",
    "لا مشكلة – أدخل القيم أدناه بنفسك.",
    "Nicio problemă – introdu valorile mai jos.",
  ],
  bs_check: [
    "Werte prüfen & bearbeiten",
    "Check & edit values",
    "Değerleri kontrol et ve düzenle",
    "Проверить и изменить",
    "Перевірити та змінити",
    "Sprawdź i edytuj",
    "تحقق وعدّل القيم",
    "Verifică și editează",
  ],
  bs_kind: ["Art", "Type", "Tür", "Вид", "Вид", "Rodzaj", "النوع", "Tip"],
  bs_k_b: ["Bewilligung", "Approval", "Onay", "Назначение", "Призначення", "Przyznanie", "موافقة", "Aprobare"],
  bs_k_a: [
    "Änderungsbescheid",
    "Change notice",
    "Değişiklik kararı",
    "Изменение",
    "Зміна",
    "Decyzja zmieniająca",
    "قرار تعديل",
    "Decizie de modificare",
  ],
  bs_k_ab: ["Ablehnung", "Rejection", "Ret", "Отказ", "Відмова", "Odmowa", "رفض", "Respingere"],
  bs_f_from: [
    "Zeitraum von",
    "Period from",
    "Dönem başı",
    "Период с",
    "Період з",
    "Okres od",
    "الفترة من",
    "Perioada de la",
  ],
  bs_f_to: ["bis", "to", "bitiş", "по", "по", "do", "إلى", "până la"],
  bs_f_regel: [
    "Regelbedarf",
    "Standard rate",
    "Standart ihtiyaç",
    "Стандартная ставка",
    "Стандартна ставка",
    "Stawka podstawowa",
    "الاحتياج الأساسي",
    "Necesar standard",
  ],
  bs_f_kdu: [
    "Miete / Unterkunft",
    "Rent / housing",
    "Kira / konut",
    "Аренда / жильё",
    "Оренда / житло",
    "Czynsz / mieszkanie",
    "الإيجار / السكن",
    "Chirie / locuință",
  ],
  bs_f_heiz: ["Heizung", "Heating", "Isınma", "Отопление", "Опалення", "Ogrzewanie", "التدفئة", "Încălzire"],
  bs_f_mehr: [
    "Mehrbedarf",
    "Additional needs",
    "Ek ihtiyaç",
    "Доп. потребность",
    "Дод. потреба",
    "Dodatkowe potrzeby",
    "احتياج إضافي",
    "Necesar suplimentar",
  ],
  bs_f_ek: [
    "Einkommen angerechnet",
    "Income deducted",
    "Mahsup edilen gelir",
    "Засчитанный доход",
    "Зарахований дохід",
    "Odliczony dochód",
    "الدخل المخصوم",
    "Venit scăzut",
  ],
  bs_f_total: [
    "Zahlbetrag pro Monat",
    "Payment per month",
    "Aylık ödeme",
    "Выплата в месяц",
    "Виплата на місяць",
    "Wypłata miesięcznie",
    "المبلغ الشهري",
    "Plată pe lună",
  ],
  bs_f_date: [
    "Bescheid vom",
    "Notice dated",
    "Karar tarihi",
    "Решение от",
    "Рішення від",
    "Decyzja z dnia",
    "تاريخ القرار",
    "Decizie din",
  ],
  bs_date_s: [
    "Daraus rechne ich die Widerspruchsfrist aus.",
    "I use this to work out the appeal deadline.",
    "İtiraz süresini buradan hesaplarım.",
    "По ней я посчитаю срок возражения.",
    "За нею я порахую строк заперечення.",
    "Na tej podstawie policzę termin odwołania.",
    "منه أحسب مهلة الاعتراض.",
    "Din ea calculez termenul de contestație.",
  ],
  bs_use: [
    "Als meinen monatlichen Betrag übernehmen",
    "Use as my monthly amount",
    "Aylık tutarım olarak kullan",
    "Взять как ежемесячную сумму",
    "Взяти як щомісячну суму",
    "Ustaw jako moją miesięczną kwotę",
    "استخدمه كمبلغي الشهري",
    "Folosește ca suma mea lunară",
  ],
  bs_terms: [
    "Fristen in meine Termine eintragen",
    "Add deadlines to my appointments",
    "Süreleri randevularıma ekle",
    "Добавить сроки в мои встречи",
    "Додати терміни до моїх зустрічей",
    "Dodaj terminy do moich wizyt",
    "أضف المهل إلى مواعيدي",
    "Adaugă termenele în programări",
  ],
  bs_checks: [
    "Mein Check",
    "My check",
    "Kontrolüm",
    "Моя проверка",
    "Моя перевірка",
    "Moje sprawdzenie",
    "فحصي",
    "Verificarea mea",
  ],
  bs_w: [
    "Widerspruch möglich bis {d}",
    "Appeal possible until {d}",
    "{d} tarihine kadar itiraz edilebilir",
    "Возражение возможно до {d}",
    "Заперечення можливе до {d}",
    "Odwołanie możliwe do {d}",
    "يمكن الاعتراض حتى {d}",
    "Contestație posibilă până la {d}",
  ],
  bs_w_s: [
    "noch {n} Tage · 1 Monat nach Zugang",
    "{n} days left · 1 month after receipt",
    "{n} gün kaldı · tebliğden 1 ay sonra",
    "ещё {n} дн. · 1 месяц после получения",
    "ще {n} дн. · 1 місяць після отримання",
    "jeszcze {n} dni · 1 miesiąc od doręczenia",
    "باقي {n} يوم · شهر بعد الاستلام",
    "mai sunt {n} zile · 1 lună de la primire",
  ],
  bs_w_over: [
    "Widerspruchsfrist ist vorbei",
    "Appeal period is over",
    "İtiraz süresi geçti",
    "Срок возражения истёк",
    "Строк заперечення минув",
    "Termin odwołania minął",
    "انتهت مهلة الاعتراض",
    "Termenul de contestație a expirat",
  ],
  bs_rent: [
    "Miete {a} angesetzt – du zahlst {b}",
    "Rent set at {a} – you pay {b}",
    "Kira {a} olarak alınmış – sen {b} ödüyorsun",
    "Аренда учтена как {a} – ты платишь {b}",
    "Оренду враховано як {a} – ти платиш {b}",
    "Czynsz przyjęto {a} – płacisz {b}",
    "احتُسب الإيجار {a} – وأنت تدفع {b}",
    "Chiria luată în calcul {a} – plătești {b}",
  ],
  bs_rent_s: [
    "Vielleicht lohnt sich eine Nachfrage beim Amt.",
    "Maybe ask the office about it.",
    "Belki daireye sormaya değer.",
    "Возможно, стоит уточнить в ведомстве.",
    "Можливо, варто уточнити в установі.",
    "Może warto zapytać w urzędzie.",
    "ربما يستحق الأمر السؤال لدى الجهة.",
    "Poate merită să întrebi la instituție.",
  ],
  bs_ek_ok: [
    "Einkommen {n} angerechnet – passt zum Zuverdienst-Rechner",
    "Income {n} deducted – matches the calculator",
    "Gelir {n} mahsup – hesaplayıcıyla uyumlu",
    "Засчитано {n} дохода – совпадает с калькулятором",
    "Зараховано {n} доходу – збігається з калькулятором",
    "Odliczono {n} – zgadza się z kalkulatorem",
    "خُصم دخل {n} – يطابق الحاسبة",
    "Venit {n} scăzut – se potrivește cu calculatorul",
  ],
  bs_ek_diff: [
    "{a} angerechnet – laut Rechner wären es {b}",
    "{a} deducted – calculator says {b}",
    "{a} mahsup – hesaplayıcıya göre {b}",
    "Засчитано {a} – по калькулятору {b}",
    "Зараховано {a} – за калькулятором {b}",
    "Odliczono {a} – według kalkulatora {b}",
    "خُصم {a} – والحاسبة تقول {b}",
    "{a} scăzut – calculatorul zice {b}",
  ],
  bs_ek_s: [
    "Das kann an Fahrtkosten oder anderen Freibeträgen liegen.",
    "This can be due to travel costs or other allowances.",
    "Bu yol masrafları veya başka muafiyetlerden olabilir.",
    "Это может быть из-за проезда или других вычетов.",
    "Це може бути через проїзд чи інші пільги.",
    "Może to wynikać z kosztów dojazdu lub innych ulg.",
    "قد يكون ذلك بسبب تكاليف التنقل أو إعفاءات أخرى.",
    "Poate fi din cauza transportului sau altor deduceri.",
  ],
  bs_sum: [
    "Summe {a} ≠ Zahlbetrag {b}",
    "Sum {a} ≠ payment {b}",
    "Toplam {a} ≠ ödeme {b}",
    "Сумма {a} ≠ выплата {b}",
    "Сума {a} ≠ виплата {b}",
    "Suma {a} ≠ wypłata {b}",
    "المجموع {a} ≠ المبلغ {b}",
    "Suma {a} ≠ plata {b}",
  ],
  bs_sum_s: [
    "Prüf die Werte – vielleicht wurde etwas falsch gelesen.",
    "Check the values – something may have been misread.",
    "Değerleri kontrol et – bir şey yanlış okunmuş olabilir.",
    "Проверь значения – возможно, что-то прочитано неверно.",
    "Перевір значення – можливо, щось прочитано неправильно.",
    "Sprawdź wartości – coś mogło zostać źle odczytane.",
    "تحقق من القيم – ربما قُرئ شيء خطأ.",
    "Verifică valorile – poate ceva a fost citit greșit.",
  ],
  bs_wb: [
    "Weiterbewilligung ab {d} beantragen",
    "Apply for continuation from {d}",
    "{d} tarihinden itibaren devam başvurusu yap",
    "Подать на продление с {d}",
    "Подати на продовження з {d}",
    "Złóż wniosek o kontynuację od {d}",
    "قدّم طلب التمديد من {d}",
    "Cere prelungirea de la {d}",
  ],
  bs_wb_s: [
    "Bewilligung endet am {d}",
    "Approval ends on {d}",
    "Onay {d} tarihinde biter",
    "Назначение заканчивается {d}",
    "Призначення закінчується {d}",
    "Przyznanie kończy się {d}",
    "تنتهي الموافقة في {d}",
    "Aprobarea expiră pe {d}",
  ],
  bs_save: ["Speichern", "Save", "Kaydet", "Сохранить", "Зберегти", "Zapisz", "حفظ", "Salvează"],
  bs_saved: [
    "Bescheid gespeichert – Fristen eingetragen",
    "Notice saved – deadlines added",
    "Karar kaydedildi – süreler eklendi",
    "Решение сохранено – сроки добавлены",
    "Рішення збережено – терміни додано",
    "Decyzja zapisana – terminy dodane",
    "تم حفظ القرار – وأضيفت المهل",
    "Decizie salvată – termene adăugate",
  ],
  bs_need: [
    "Bitte mindestens den Zahlbetrag eintragen",
    "Please enter at least the payment",
    "Lütfen en az ödeme tutarını gir",
    "Укажи хотя бы сумму выплаты",
    "Вкажи хоча б суму виплати",
    "Wpisz przynajmniej kwotę wypłaty",
    "أدخل المبلغ على الأقل",
    "Introdu cel puțin suma de plată",
  ],
  bs_showimg: [
    "Foto ansehen",
    "View photo",
    "Fotoğrafı gör",
    "Посмотреть фото",
    "Переглянути фото",
    "Zobacz zdjęcie",
    "عرض الصورة",
    "Vezi fotografia",
  ],
  bs_err_img: [
    "Bild konnte nicht geladen werden",
    "Couldn’t load image",
    "Görsel yüklenemedi",
    "Не удалось загрузить фото",
    "Не вдалося завантажити фото",
    "Nie udało się wczytać obrazu",
    "تعذّر تحميل الصورة",
    "Imaginea nu a putut fi încărcată",
  ],
  bs_t_w: [
    "Widerspruchsfrist Bescheid",
    "Appeal deadline notice",
    "Karar itiraz süresi",
    "Срок возражения на решение",
    "Строк заперечення на рішення",
    "Termin odwołania od decyzji",
    "مهلة الاعتراض على القرار",
    "Termen contestație decizie",
  ],
  bs_t_w_b: [
    "Bescheid geprüft",
    "Notice checked",
    "Karar kontrol edildi",
    "Решение проверено",
    "Рішення перевірено",
    "Decyzja sprawdzona",
    "تم فحص القرار",
    "Decizie verificată",
  ],
  bs_t_wb: [
    "Weiterbewilligung beantragen",
    "Apply for continuation",
    "Devam başvurusu yap",
    "Подать на продление",
    "Подати на продовження",
    "Złóż wniosek o kontynuację",
    "قدّم طلب التمديد",
    "Cere prelungirea",
  ],
  bs_t_wb_b: [
    "Antrag ausgefüllt",
    "Form filled in",
    "Başvuru dolduruldu",
    "Заявление заполнено",
    "Заяву заповнено",
    "Wniosek wypełniony",
    "تم ملء الطلب",
    "Cerere completată",
  ],
});

/* ===== Mami-Start-Briefing: wichtige Dinge beim Start ===== */
const MB = {
  i: 0,
  L: [],
  on: false,
  shown: false,
};
const MB_K = {
  pot: "🔁",
  price: "🔺",
  wb: "📆",
  lohn: "💶",
  rch: "💸",
  kiz: "👶",
  br: "✉️",
  upd: "⬇️",
  goal: "🎉",
  info: "💡",
  minus: "🚨",
  budget: "🎯",
  abo: "📺",
  term: "📅",
  stb: "🧾",
  reserve: "🛡️",
  beihilfe: "🏥",
  fc: "📉",
  bs: "📄",
};
function resAwayOpen() {
  const b = hbSheet("raBg", uiText("ra_h")),
    A = resAway();
  let rb = 0;
  try {
    rb = yearCum(ymOf(new Date())).reserveBal;
  } catch (_) {}
  b.innerHTML = `<div class="raviz"><div class="rabox"><i>${svgIcon("shield", 22)}</i><small>${escHtml(uiText("ra_res"))}</small><b data-noi18n>${escHtml(fmtEur0(rb))}</b></div><svg class="raar" viewBox="0 0 40 24" aria-hidden="true"><path d="M2 12h32M26 4l8 8-8 8"/></svg><div class="rabox away"><i>${svgIcon("piggy", 22)}</i><small>${escHtml(uiText("ra_away"))}</small><b data-noi18n id="raVal">${escHtml(fmtEur0(A.amt || rb))}</b></div></div>
    <p style="margin:14px 2px 10px">${escHtml(uiText("ra_p"))}</p>
    <div class="field"><label for="raAmt">${escHtml(uiText("ra_amt"))}</label><input class="in" id="raAmt" inputmode="decimal" value="${escHtml(numStr(A.amt || rb))}"></div>
    <div class="field"><label for="raWhere">${escHtml(uiText("ra_where"))}</label><input class="in" id="raWhere" maxlength="40" value="${escHtml(A.where)}" placeholder="${escHtml(uiText("ra_ph"))}"></div>
    <div class="vabtns" style="margin-top:6px">${A.amt ? `<button type="button" class="btn" data-raclear>${escHtml(uiText("ra_clear"))}</button>` : ""}<button type="button" class="btn primary" data-rasave>${escHtml(uiText("ra_save"))}</button></div>`;
  if (!reducedMotion())
    b.querySelectorAll(".rabox,.raar,p,.field,.vabtns").forEach((e, i) =>
      e.animate(
        [
          {
            opacity: 0,
            transform: "translateY(12px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 460,
          delay: i * 70,
          easing: "cubic-bezier(.2,1.2,.35,1)",
          fill: "backwards",
        }
      )
    );
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-raopen]")) resAwayOpen();
});
document.addEventListener("input", (e) => {
  if (e.target && e.target.id === "raAmt") {
    const v = $("raVal");
    if (v) v.textContent = fmtEur0(Math.max(0, parseAmt(e.target.value) || 0));
  }
});
document.addEventListener("click", async (e) => {
  const sv = e.target.closest("[data-rasave]"),
    cl = e.target.closest("[data-raclear]");
  if (!sv && !cl) return;
  if (cl) delete store.settings.reserveAway;
  else {
    const raw = $("raAmt").value,
      v = Math.max(0, parseAmt(raw) || 0);
    store.settings.reserveAway = {
      amt: round2(v),
      where: $("raWhere").value.trim().slice(0, 40),
    };
  }
  try {
    await saveSettings();
  } catch (_) {}
  hbSheetClose("raBg");
  toast(uiText(cl ? "ra_cleared" : "ra_saved"));
  try {
    render();
  } catch (_) {}
});
function potInfo(P) {
  const x = potList().find((o) => o.p === P);
  if (!x) return;
  const b = hbSheet("potBg", uiText("pot_h"));
  b.innerHTML = `<div class="potv"><div class="potf"><i style="background:${kaCol(x.p)}">${kaIcon(x.p)}</i><b data-noi18n>${escHtml(x.p)}</b></div><div class="potar"><span>${escHtml(fmtEur(x.v))}</span><svg class="i" viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6"/></svg></div><div class="potf"><i style="background:${kaCol(x.bank)}">${kaIcon(x.bank)}</i><b data-noi18n>${escHtml(x.bank)}</b></div></div>
    <p style="margin:14px 2px 6px">${escHtml(
      uiText("pot_p1", {
        a: fmtEur(x.v),
        p: x.p,
        b: x.bank,
      })
    )}</p><p class="small muted" style="margin:0 2px 14px">${escHtml(uiText("pot_p2"))}</p>
    <div class="vabtns"><button type="button" class="btn" data-potdone="${escHtml(x.p)}">${svgIcon("check", 16)} ${escHtml(uiText("pot_done"))}</button><button type="button" class="btn primary" style="justify-content:center" data-potok>${escHtml(uiText("pot_ok"))}</button></div>`;
}
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-potok]")) hbSheetClose("potBg");
  const d = e.target.closest("[data-potdone]");
  if (d) {
    potSettle(d.dataset.potdone);
    await saveSettings();
    hbSheetClose("potBg");
    try {
      MB.L = (MB.L || []).filter((x) => !(x.k === "pot" && x.id === d.dataset.potdone));
    } catch (_) {}
    toast(uiText("pot_done_t"));
    try {
      render();
    } catch (_) {}
  }
});
function mbItems() {
  const H = (ui.hints || []).filter(
    (h) =>
      h &&
      (h.lvl === "bad" || h.lvl === "warn" || h.k === "stb" || h.k === "term") &&
      ["minus", "budget", "abo", "term", "stb", "reserve", "beihilfe", "br"].includes(h.k)
  );
  const L = H.map((h) => ({
    k: h.k,
    lvl: h.lvl === "bad" ? "r" : h.lvl === "warn" ? "w" : "i",
    t: h.t,
    s: h.s || "",
    id: h.id,
    raw: h.k === "br" ? 1 : 0,
  }));
  try {
    const F = fcCalc();
    if (F && F.warn && F.min && !L.some((x) => x.k === "minus"))
      L.push({
        k: "fc",
        lvl: F.min.v < 0 ? "r" : "w",
        t: uiText("mb_fc", {
          d: fxDate(F.ym + "-" + pad(F.min.d), {
            day: "numeric",
            month: "long",
          }),
        }),
        s: uiText("mb_fc_s", {
          n: fmtEur0(F.min.v),
        }),
        raw: 1,
      });
  } catch (_) {}
  try {
    const j = jlCfg();
    for (const b of j.bescheide || []) {
      const n = b.wid ? daysTo(b.wid) : null;
      if (n != null && n >= 0 && n <= 7)
        L.push({
          k: "bs",
          lvl: n <= 3 ? "r" : "w",
          t: uiText("bs_w", {
            d: dLong(b.wid, {
              day: "numeric",
              month: "long",
            }),
          }),
          s: uiText("bs_w_s", {
            n: String(n),
          }),
          raw: 1,
        });
    }
  } catch (_) {}
  try {
    for (const x of hlItems()) L.push(x);
  } catch (_) {}
  try {
    for (const x of potList())
      L.push({
        k: "pot",
        lvl: "w",
        t: uiText("pot_t", {
          a: fmtEur(x.v),
          p: x.p,
          b: x.bank,
        }),
        s: uiText("pot_s"),
        id: x.p,
        raw: 1,
      });
  } catch (_) {}
  const rk = {
    r: 0,
    w: 1,
    i: 2,
  };
  return L.sort((a, b) => rk[a.lvl] - rk[b.lvl]).slice(0, 7);
}
function mbSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem("hb-mb-seen") || "[]"));
  } catch (_) {
    return new Set();
  }
}
function mbUnseen() {
  const seen = mbSeen();
  return mbAll().filter((x) => x.lvl !== "g" && !seen.has(x.t));
}
function mbBadge(q) {
  q = q || $("ptourQ");
  if (!q) return;
  const bd = q.querySelector(".badge");
  if (!bd) return;
  const n = mbUnseen().length;
  bd.textContent = n;
  bd.hidden = !n;
  q.classList.toggle("mhas", n > 0);
}
function mbAll() {
  const L = mbItems(),
    have = new Set(L.map((x) => x.t));
  for (const h of allHints()) {
    if (have.has(h.t)) continue;
    L.push({
      k: h.act === "upd" ? "upd" : h.k || "info",
      lvl: h.lvl === "bad" ? "r" : h.lvl === "warn" ? "w" : h.lvl === "good" ? "g" : "i",
      t: h.t,
      s: h.s || "",
      act: h.act,
    });
  }
  const rk = {
    r: 0,
    w: 1,
    i: 2,
    g: 3,
  };
  return L.sort((a, b) => (a.k === "upd" ? -1 : 0) - (b.k === "upd" ? -1 : 0) || rk[a.lvl] - rk[b.lvl]).slice(0, 10);
}
function mbManual() {
  const L = mbAll();
  try {
    localStorage.setItem("hb-hints-seen", JSON.stringify(allHints().map(hintKey)));
  } catch (_) {}
  mbOpen(L);
}
function mbKey() {
  return "hb-mb-" + isoToday();
}
function mbAuto() {
  if (MB.shown || BG_RUN) return;
  MB.shown = true;
  clearTimeout(mbAuto.t);
  mbAuto.t = setTimeout(() => {
    try {
      if (localStorage.getItem(mbKey())) return;
    } catch (_) {}
    if (
      TOUR.i >= 0 ||
      $("dankeBg") ||
      dankeShould() ||
      wizShould() ||
      document.querySelector(
        ".backdrop:not([hidden]),#tourBg:not([hidden]),.hobg:not([hidden]),#legalBg:not([hidden]),#mamiPop:not([hidden])"
      )
    ) {
      MB.shown = false;
      return;
    }
    if (ui.view === "home" && PTOUR.home && !ptSeen().home && store.tx.length) return;
    const L = mbItems();
    if (!L.length) return;
    mbOpen(L);
  }, 2600);
}
function mbOpen(L) {
  MB.L = L || mbItems();
  if (!MB.L.length) return;
  MB.i = 0;
  MB.on = true;
  try {
    const sn = mbSeen();
    MB.L.forEach((x) => sn.add(x.t));
    localStorage.setItem("hb-mb-seen", JSON.stringify([...sn].slice(-200)));
  } catch (_) {}
  try {
    mbBadge();
  } catch (_) {}
  let bg = $("mbBg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "mbBg";
    bg.className = "mbbg";
    document.body.appendChild(bg);
  }
  bg.innerHTML = `<div class="mbdim" data-mbx></div><div class="mbstack"><div class="mbchips">${MB.L.map((x, i) => `<button type="button" class="mbchip ${x.lvl}" data-mbgo="${i}" style="--i:${i}">${MB_K[x.k] || "•"} <span${x.raw ? " data-noi18n" : ""}>${escHtml(x.t.length > 30 ? x.t.slice(0, 29) + "…" : x.t)}</span></button>`).join("")}</div>
    <div class="mbbub" role="dialog" aria-live="polite"><div class="mbh"><span data-noi18n>${escHtml(mamiText("name"))}</span><i data-noi18n id="mbN"></i></div><b class="mbt" data-noi18n id="mbT" dir="auto"></b><div class="mbx" id="mbX"></div>
      <div class="mbb"><button type="button" class="mbask" data-mbask aria-label="${escHtml(mamiText("btn"))}" title="${escHtml(mamiText("btn"))}">💬</button><button type="button" class="mblater" data-mblater data-noi18n>${escHtml(uiText("mb_later"))}</button><button type="button" class="mbgo" data-mbshow data-noi18n>${escHtml(uiText("mb_show"))}</button></div><div class="mbdots">${MB.L.map((_, i) => `<i data-mbgo="${i}"></i>`).join("")}</div></div></div>
    <div class="mbmami">${mamiAvatar ? mamiAvatar(null) : "👩"}<span class="mbwave">👋</span></div>`;
  bg.hidden = false;
  document.body.classList.add("locked");
  requestAnimationFrame(() => bg.classList.add("show"));
  mbShow(0, true);
  mbSwipe(bg.querySelector(".mbbub"));
  const FR = MB.fromRect;
  MB.fromRect = null;
  const F = FR
      ? {
          q: $("ptourQ"),
          r: FR,
        }
      : mbFrom(),
    m = bg.querySelector(".mbmami");
  if (F && m && !reducedMotion()) {
    m.classList.add("fly");
    const mr = m.getBoundingClientRect(),
      sz = mr.width || 92,
      fr = F.r;
    const from = {
        x: fr.left + fr.width / 2 - sz / 2,
        y: fr.top + fr.height / 2 - sz / 2,
      },
      to = {
        x: mr.left,
        y: mr.top,
      },
      s0 = Math.max(0.3, Math.min(fr.width, fr.height) / sz);
    if (F.q) mHeadOut(F.q);
    mbArc(m, from, to, s0, 1, FR ? 700 : 950, FR ? 40 : 260);
  }
  bg.classList.toggle("quick", !!FR);
  if (FR) {
    const mm = $("moMe");
    if (mm) mm.style.visibility = "hidden";
    const mb = $("moBg");
    if (mb) mb.classList.remove("show");
    clearTimeout(MO.hideT);
    MO.hideT = setTimeout(() => {
      try {
        moHide();
      } catch (_) {}
    }, 520);
  }
}
function mbShow(i, first) {
  const bg = $("mbBg");
  if (!bg) return;
  MB.i = Math.max(0, Math.min(MB.L.length - 1, i));
  const x = MB.L[MB.i],
    n = MB.L.length;
  $("mbN").textContent = `${MB.i + 1} / ${n}`;
  const head =
    MB.i === 0
      ? mFill(
          n > 1
            ? uiText("mb_hin", {
                n: String(n),
              })
            : uiText("mb_hi1")
        )
      : uiText("mb_next");
  const T = $("mbT");
  const xs = $("mbX");
  xs.className = "mbx " + x.lvl;
  xs.innerHTML = `<p class="mbi"><span>${MB_K[x.k] || "•"}</span><b dir="auto"${x.raw ? " data-noi18n" : ""}>${escHtml(x.t)}</b></p>${x.s ? `<p class="mbs" dir="auto"${x.raw ? " data-noi18n" : ""}>${escHtml(x.s)}</p>` : ""}`;
  bg.querySelectorAll(".mbdots i").forEach((d, k) => d.classList.toggle("on", k === MB.i));
  bg.querySelectorAll(".mbchip").forEach((c, k) => c.classList.toggle("on", k === MB.i));
  const go = bg.querySelector("[data-mbshow]");
  go.textContent = MB.i < n - 1 ? uiText("mb_show") : uiText("mb_show");
  bg.querySelector("[data-mblater]").textContent = MB.i < n - 1 ? uiText("mb_later") : uiText("mb_ok");
  if (reducedMotion()) {
    T.textContent = head;
    return;
  }
  const d0 = first ? ($("mbBg").classList.contains("quick") ? 0.55 : 1.45) : 0.1;
  T.innerHTML = (LANG === "ar" ? [head] : head.split(/(\s+)/))
    .map((w, k) =>
      /^\s+$/.test(w)
        ? w
        : `<span class="mbw" style="animation-delay:${(d0 + k * 0.045).toFixed(2)}s">${escHtml(w)}</span>`
    )
    .join("");
  xs.animate(
    [
      {
        opacity: 0,
        transform: "translateY(10px)",
      },
      {
        opacity: 1,
        transform: "none",
      },
    ],
    {
      duration: 420,
      delay: first ? ($("mbBg").classList.contains("quick") ? 800 : 1700) : 220,
      easing: "cubic-bezier(.2,1.2,.35,1)",
      fill: "backwards",
    }
  );
  if (!first) {
    const m = bg.querySelector(".mbmami");
    m.animate(
      [
        {
          transform: "none",
        },
        {
          transform: "translateY(-12px) rotate(-6deg)",
        },
        {
          transform: "none",
        },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(.3,1.5,.5,1)",
      }
    );
  }
}
function mbArc(el, from, to, s0, s1, dur, delay, back) {
  const N = 26,
    K = [],
    cx = (from.x + to.x) / 2 + (back ? -40 : 40),
    cy = Math.min(from.y, to.y) - (back ? 60 : -140);
  for (let i = 0; i <= N; i++) {
    const t = i / N,
      u = 1 - t,
      x = u * u * from.x + 2 * u * t * cx + t * t * to.x,
      y = u * u * from.y + 2 * u * t * cy + t * t * to.y,
      sc = s0 + (s1 - s0) * (back ? t * t : 1 - Math.pow(1 - t, 2)),
      r = Math.sin(t * Math.PI) * (back ? -14 : 16);
    K.push({
      transform: `translate(${(x - to.x).toFixed(1)}px,${(y - to.y).toFixed(1)}px) scale(${sc.toFixed(3)}) rotate(${r.toFixed(1)}deg)`,
      offset: back ? t : t * 0.9,
    });
  }
  if (!back) {
    K[N].transform = "translate(0,0) scale(1.08) rotate(0deg)";
    K.push({
      transform: "none",
      offset: 1,
    });
  }
  return el.animate(K, {
    duration: dur,
    delay: delay || 0,
    easing: "cubic-bezier(.45,.05,.3,1)",
    fill: "both",
  });
}
function mbFrom() {
  const q = $("ptourQ");
  if (!q || !(q._mout || tourVis(q))) return null;
  const r = q.getBoundingClientRect();
  return {
    q,
    r,
  };
}
function mbClose(later) {
  const bg = $("mbBg");
  if (!bg) return;
  MB.on = false;
  clearInterval(MB.ty);
  try {
    localStorage.setItem(mbKey(), "1");
  } catch (_) {}
  if (reducedMotion()) {
    bg.hidden = true;
    document.body.classList.remove("locked");
    return;
  }
  bg.classList.remove("show");
  const m = bg.querySelector(".mbmami"),
    F =
      mbFrom() ||
      (() => {
        const q = $("ptourQ");
        return q
          ? {
              q,
              r: q.getBoundingClientRect(),
            }
          : null;
      })(),
    st = bg.querySelector(".mbstack");
  if (st)
    st.animate(
      [
        {
          opacity: 1,
          transform: "none",
        },
        {
          opacity: 0,
          transform: "translateY(-20px) scale(.92)",
        },
      ],
      {
        duration: 280,
        easing: "ease-in",
        fill: "forwards",
      }
    );
  let dn = 0;
  const done = () => {
    if (dn++) return;
    bg.hidden = true;
    document.body.classList.remove("locked");
    mHeadIn(F && F.q);
  };
  if (m && F && F.r.width) {
    m.getAnimations().forEach((a) => a.cancel());
    const mr = m.getBoundingClientRect(),
      sz = mr.width || 92,
      to = {
        x: F.r.left + F.r.width / 2 - sz / 2,
        y: F.r.top + F.r.height / 2 - sz / 2,
      };
    const K = [];
    const N = 22,
      from = {
        x: mr.left,
        y: mr.top,
      },
      cx = (from.x + to.x) / 2 - 30,
      cy = Math.min(from.y, to.y) - 50;
    for (let i = 0; i <= N; i++) {
      const t = i / N,
        u = 1 - t,
        x = u * u * from.x + 2 * u * t * cx + t * t * to.x,
        y = u * u * from.y + 2 * u * t * cy + t * t * to.y,
        sc = 1 + (Math.max(0.3, F.r.height / sz) - 1) * t * t;
      K.push({
        transform: `translate(${(x - from.x).toFixed(1)}px,${(y - from.y).toFixed(1)}px) scale(${sc.toFixed(3)}) rotate(${(-Math.sin(t * Math.PI) * 14).toFixed(1)}deg)`,
        opacity: t > 0.92 ? 0 : 1,
        offset: t,
      });
    }
    m.animate(K, {
      duration: 720,
      delay: 120,
      easing: "cubic-bezier(.5,0,.3,1)",
      fill: "forwards",
    })
      .finished.then(done)
      .catch(done);
    setTimeout(done, 1300);
  } else {
    if (m)
      m.animate(
        [
          {
            opacity: 1,
          },
          {
            opacity: 0,
          },
        ],
        {
          duration: 300,
          fill: "forwards",
        }
      );
    setTimeout(done, 320);
  }
}
function mbAct(x) {
  const k = x.k;
  if (["price", "wb", "lohn", "rch", "kiz"].includes(k)) return hlAct(x);
  if (k === "upd") {
    try {
      UPD.avail && UPD.avail.go();
    } catch (_) {}
    return;
  }
  if (k === "br") return brOpen(x.id);
  if (k === "stb") return stbOpen();
  if (k === "term") return tmOpen();
  if (k === "bs") return bsOpen();
  if (k === "fc") return fcOpen();
  if (k === "pot") return potInfo(x.id);
  if (k === "abo") return spSheetOpen("abos");
  if (k === "beihilfe") return accGo("amt");
  if (k === "budget") {
    ui.view = "year";
    render();
    return;
  }
  if (k === "reserve") {
    return resAwayOpen();
  }
  ui.view = "home";
  render();
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}
function mbSwipe(el) {
  let x0 = null;
  el.addEventListener(
    "touchstart",
    (e) => {
      x0 = e.touches[0].clientX;
    },
    {
      passive: true,
    }
  );
  el.addEventListener(
    "touchend",
    (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) < 45) return;
      const rtl = LANG === "ar";
      mbStep(dx < 0 !== rtl ? 1 : -1);
    },
    {
      passive: true,
    }
  );
}
function mbStep(d) {
  const n = MB.i + d;
  if (n < 0 || n >= MB.L.length) return;
  const b = $("mbBg").querySelector(".mbbub");
  if (!reducedMotion())
    b.animate(
      [
        {
          transform: "none",
        },
        {
          transform: `translateX(${-d * 26}px)`,
          opacity: 0.6,
          offset: 0.4,
        },
        {
          transform: "none",
          opacity: 1,
        },
      ],
      {
        duration: 380,
        easing: "cubic-bezier(.2,1.2,.35,1)",
      }
    );
  mbShow(n);
}
document.addEventListener("click", (e) => {
  const bg = $("mbBg");
  if (!bg || bg.hidden || !bg.contains(e.target)) return;
  const g = e.target.closest("[data-mbgo]");
  if (g) {
    const n = Number(g.dataset.mbgo);
    if (n !== MB.i) {
      const b = bg.querySelector(".mbbub");
      if (!reducedMotion())
        b.animate(
          [
            {
              transform: "scale(.97)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 300,
            easing: "cubic-bezier(.3,1.5,.5,1)",
          }
        );
      mbShow(n);
    }
    return;
  }
  if (e.target.closest("[data-mblater]")) {
    if (MB.i < MB.L.length - 1 && e.target.textContent === uiText("mb_later")) return mbClose(true);
    return mbClose();
  }
  if (e.target.closest("[data-mbask]")) {
    mbClose();
    setTimeout(() => {
      try {
        mamiOpen();
      } catch (_) {}
    }, 950);
    return;
  }
  if (e.target.closest("[data-mbshow]")) {
    const x = MB.L[MB.i];
    mbClose();
    setTimeout(() => {
      try {
        mbAct(x);
      } catch (_) {}
    }, 500);
    return;
  }
  if (e.target.closest("[data-mbx]")) mbClose(true);
});
document.addEventListener("keydown", (e) => {
  if (!MB.on) return;
  if (e.key === "Escape") mbClose(true);
  else if (e.key === "ArrowRight") mbStep(1);
  else if (e.key === "ArrowLeft") mbStep(-1);
});

/* ===== Konten aufklappen und Geld per Ziehen umbuchen ===== */
const MV = {
  drag: null,
  from: null,
  to: null,
};
function mvList() {
  return (ui.acctEd || [])
    .map((m, i) =>
      m
        ? {
            ...m,
            i,
          }
        : null
    )
    .filter(Boolean);
}
function mvCol(m) {
  const c = acctColor(m.label, m.i);
  return c || (m.cash ? "#8a5a12" : m.i === 0 ? "var(--accent)" : themeCol("#3d63a8", m.i));
}
function mvHas(m) {
  return m.cash || !!(store.settings.accountAnchors || {})[m.name];
}
function mvEl() {
  let el = $("mvBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "mvBg";
    el.className = "mvbg";
    el.hidden = true;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "mvT");
    document.body.appendChild(el);
  }
  return el;
}
function mvOpen() {
  const el = mvEl();
  if (mvFxOk() && mvPullStart()) {
    requestAnimationFrame(() => mvPullEnd(true));
    return;
  }
  MV.home = null;
  el.hidden = false;
  document.body.classList.add("locked");
  mvRender(true);
  SND.play("whoosh");
  try {
    navigator.vibrate && navigator.vibrate(8);
  } catch (_) {}
  requestAnimationFrame(() => el.classList.add("show"));
  let n = 0;
  try {
    n = Number(localStorage.getItem("hb-mvhint")) || 0;
    localStorage.setItem("hb-mvhint", String(n + 1));
  } catch (_) {}
  el.classList.toggle("hint", n < 3);
}
function mvClosed() {
  const el = $("mvBg");
  el._closing = 0;
  el.hidden = true;
  el.classList.remove("pull");
  el.style.removeProperty("--mvp");
  document.body.classList.remove("locked");
  document.querySelectorAll("#astack .acard,.pchero .pcaccs button").forEach((c) => {
    c.style.visibility = "";
  });
  render();
  if (MV.home) mvUnstack();
}
function mvClose() {
  const el = $("mvBg");
  if (!el || el.hidden || el._closing) return;
  SND.play("whooshin");
  if (!mvFxOk() || !MV.home) {
    el.classList.remove("show");
    document.body.classList.remove("locked");
    setTimeout(() => {
      el.hidden = true;
    }, 320);
    render();
    return;
  }
  el._closing = 1;
  const F = mvFoldPrep(el);
  if (!F) {
    el.classList.remove("show");
    setTimeout(mvClosed, 320);
    return;
  }
  mvFoldRun(F, 1, 520, () => mvFoldHandover(F));
}
function mvFxOk() {
  try {
    return !!document.body.animate && !matchMedia("(prefers-reduced-motion: reduce)").matches && !IS_DESK;
  } catch (_) {
    return false;
  }
}
function mvFront() {
  const st = $("astack");
  if (st && st.offsetParent) {
    const c = [...st.querySelectorAll(".acard")].find((x) => !x.classList.contains("side"));
    if (c)
      return {
        st,
        c,
        side: [...st.querySelectorAll(".acard.side")],
        to: () => "translate(0,0) scale(.9)",
      };
  }
  // Tablet: die kleinen Konto-Kacheln in der grünen Karte ziehen sich auf die Hauptkonto-Kachel zusammen
  const t = [...document.querySelectorAll(".pchero .pcaccs button:not(.add)")];
  if (t.length) {
    const c = t.find((x) => x.classList.contains("main")) || t[0],
      r = c.getBoundingClientRect();
    return {
      st: null,
      c,
      side: t.filter((x) => x !== c),
      to: (x) => {
        const q = x.getBoundingClientRect();
        return `translate(${r.left - q.left}px,${r.top - q.top}px) scale(.9)`;
      },
    };
  }
  return null;
}
/* Aufklappen, das dem Finger folgt: Die Konten liegen zuerst als Stapel unter der Hauptkarte
   und fächern sich beim Ziehen nach unten auf. Beim Loslassen federn sie an ihren Platz.
   Ein Tipp auf „Alle Konten“ spielt dasselbe ohne Finger ab. */
const MVP = {
  on: false,
  p: 0,
  cards: [],
  start: [],
};
const MVP_FULL = 210;
const mvLerp = (a, b, t) => a + (b - a) * t;
function mvPullStart() {
  const H = mvFront(),
    el = mvEl();
  if (!H) return false;
  const fr = H.c.getBoundingClientRect();
  MV.home = {
    top: fr.top,
    left: fr.left,
    width: fr.width,
    height: fr.height,
  };
  el.hidden = false;
  el.classList.add("pull");
  el.classList.remove("show");
  document.body.classList.add("locked");
  mvRender(false);
  const cards = [...el.querySelectorAll(".mvc")];
  if (!cards.length) {
    el.classList.remove("pull");
    return false;
  }
  MVP.on = true;
  MVP.p = 0;
  MVP.cards = cards;
  MVP.start = cards.map((c, k) => {
    const r = c.getBoundingClientRect(),
      sc = Math.min(1, MV.home.width / r.width) * (k ? 0.94 - Math.min(k, 4) * 0.02 : 1);
    return {
      x: MV.home.left + (MV.home.width - r.width * sc) / 2 - r.left,
      y: MV.home.top - r.top + Math.min(k, 4) * 12,
      s: sc,
    };
  });
  cards.forEach((c, k) => {
    c.style.transition = "none";
    c.style.transformOrigin = "0 0";
    c.style.zIndex = String(20 - k);
  });
  [H.c, ...H.side].forEach((c) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" }));
  mvPullMove(0);
  return true;
}
function mvPullMove(dy) {
  if (!MVP.on) return;
  const el = $("mvBg"),
    p = Math.max(0, Math.min(1, dy / MVP_FULL)),
    lift = Math.max(0, dy) * 0.2;
  MVP.p = p;
  el.style.setProperty("--mvp", p.toFixed(3));
  MVP.cards.forEach((c, k) => {
    const S = MVP.start[k],
      t = k ? Math.max(0, Math.min(1, p * 0.85 - k * 0.025)) : p * 0.35,
      x = mvLerp(S.x, 0, t),
      y = mvLerp(S.y + lift, 0, t),
      sc = mvLerp(S.s, 1, t);
    c.style.transform = `translate(${x}px,${y}px) scale(${sc})`;
    c.style.opacity = k ? String(Math.min(1, 0.25 + p * 2)) : "1";
    if (k) c.style.setProperty("--mvci", String(Math.min(1, Math.max(0, (t - 0.15) * 2.5))));
  });
}
function mvPullEnd(go) {
  if (!MVP.on) return;
  MVP.on = false;
  const el = $("mvBg"),
    H = mvFront(),
    cards = MVP.cards;
  if (go) {
    /* Hintergrund vom Stand beim Loslassen weich auf voll */
    const bg = el.animate([{ "--mvp": MVP.p }, { "--mvp": 1 }], {
      duration: 260,
      easing: "ease-out",
      fill: "forwards",
    });
    bg.onfinish = () => {
      el.classList.add("show");
      el.classList.remove("pull");
      bg.cancel();
      el.style.removeProperty("--mvp");
    };
    SND.play("whoosh");
    try {
      navigator.vibrate && navigator.vibrate(8);
    } catch (_) {}
    let n = 0;
    try {
      n = Number(localStorage.getItem("hb-mvhint")) || 0;
      localStorage.setItem("hb-mvhint", String(n + 1));
    } catch (_) {}
    el.classList.toggle("hint", n < 3);
    cards.forEach((c, k) => {
      const from = c.style.transform;
      c.style.opacity = "";
      c.style.removeProperty("--mvci");
      c.style.transform = "";
      const a = c.animate(
        [
          { transform: from, opacity: k ? Math.min(1, 0.25 + MVP.p * 2) : 1 },
          { transform: "none", opacity: 1 },
        ],
        {
          duration: 520,
          delay: k * 35,
          easing: "cubic-bezier(.2,1.25,.35,1)",
          fill: "backwards",
        }
      );
      a.onfinish = () => {
        c.style.transition = c.style.transformOrigin = c.style.zIndex = "";
      };
      if (k) setTimeout(() => !el.hidden && SND.play("tick"), 140 + k * 35);
    });
    setTimeout(() => {
      if (H && !el.hidden)
        [H.c, ...H.side].forEach((c) => {
          c.getAnimations().forEach((a) => a.cancel());
          c.style.visibility = "hidden";
        });
    }, 160);
    return;
  }
  /* nicht weit genug gezogen: alles zurück auf den Stapel */
  cards.forEach((c, k) => {
    const S = MVP.start[k];
    c.animate([{ transform: c.style.transform }, { transform: `translate(${S.x}px,${S.y}px) scale(${S.s})` }], {
      duration: 220,
      easing: "cubic-bezier(.3,0,.2,1)",
      fill: "forwards",
    });
  });
  el.style.setProperty("--mvp", "0");
  if (H) [H.c, ...H.side].forEach((c) => c.getAnimations().forEach((a) => a.reverse()));
  setTimeout(() => {
    el.hidden = true;
    el.classList.remove("pull");
    el.style.removeProperty("--mvp");
    document.body.classList.remove("locked");
    if (H) [H.c, ...H.side].forEach((c) => c.getAnimations().forEach((a) => a.cancel()));
    MV.home = null;
  }, 230);
}
/* Zuklappen als Umkehrung vom Aufklappen: Die Konten wandern unter die Hauptkarte (die bleibt
   obenauf), dann gleitet der Stapel zurück an seinen Platz auf der Startseite. Derselbe Ablauf
   folgt beim Hochwischen dem Finger (p = 0 offen … 1 zu). */
function mvFoldPrep(el) {
  const cards = [...el.querySelectorAll(".mvc")],
    H = mvFront();
  if (!cards.length || !H) return null;
  const fr = H.c.getBoundingClientRect();
  MV.home = { top: fr.top, left: fr.left, width: fr.width, height: fr.height };
  const S = cards.map((c, k) => {
    const r = c.getBoundingClientRect(),
      sc = Math.min(1, MV.home.width / r.width) * (k ? 0.94 - Math.min(k, 4) * 0.02 : 1);
    return {
      x: MV.home.left + (MV.home.width - r.width * sc) / 2 - r.left,
      y: MV.home.top - r.top + Math.min(k, 4) * 12,
      s: sc,
    };
  });
  const h0 = cards[0].getBoundingClientRect().height;
  cards.forEach((c, k) => {
    c.getAnimations().forEach((a) => a.cancel());
    c.style.transition = "none";
    c.style.transformOrigin = "0 0";
    c.style.zIndex = String(20 - k);
  });
  el.classList.add("pull");
  el.classList.remove("show");
  return { el, H, cards, S, h0, h1: MV.home.height / S[0].s, p: 0 };
}
function mvFoldSet(F, p) {
  F.p = p;
  F.el.style.setProperty("--mvp", (1 - p).toFixed(3));
  F.cards.forEach((c, k) => {
    const S = F.S[k],
      t = k
        ? Math.max(0, Math.min(1, p * 1.25 - (F.cards.length - 1 - k) * 0.03))
        : Math.max(0, Math.min(1, (p - 0.2) / 0.8)),
      e = t * t * (3 - 2 * t);
    c.style.transform = `translate(${S.x * e}px,${S.y * e}px) scale(${mvLerp(1, S.s, e)})`;
    if (!k) c.style.height = mvLerp(F.h0, F.h1, e) + "px";
    else {
      c.style.opacity = String(1 - Math.max(0, (e - 0.6) / 0.4));
      /* unter der Hauptkarte keine durchscheinenden Beträge */
      c.style.setProperty("--mvci", String(Math.max(0, 1 - e * 2)));
    }
  });
}
/* von F.p nach „to“ laufen lassen, dann then() */
function mvFoldRun(F, to, ms, then) {
  const from = F.p,
    t0 = performance.now(),
    dur = Math.max(120, ms * Math.abs(to - from));
  (function step(now) {
    const k = Math.min(1, (now - t0) / dur),
      e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    mvFoldSet(F, mvLerp(from, to, e));
    if (k < 1) requestAnimationFrame(step);
    else then && then();
  })(t0);
}
/* am Ziel: die echte Hauptkarte übernimmt, ohne Lücke und ohne Doppelbild */
function mvFoldHandover(F) {
  const { H, cards } = F;
  H.c.getAnimations().forEach((a) => a.cancel());
  H.c.style.visibility = "";
  H.c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 110 });
  cards[0].animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110, fill: "forwards" });
  setTimeout(mvClosed, 110);
}
/* nicht weit genug hochgewischt: Liste wieder auf */
function mvFoldBack(F) {
  mvFoldRun(F, 0, 420, () => {
    F.cards.forEach((c) => {
      c.style.transform =
        c.style.height =
        c.style.opacity =
        c.style.transition =
        c.style.transformOrigin =
        c.style.zIndex =
          "";
    });
    F.el.classList.add("show");
    F.el.classList.remove("pull");
    F.el.style.removeProperty("--mvp");
  });
}
/* Liste nach oben wischen klappt die Konten wieder zusammen */
(function () {
  let F = null,
    y0 = null,
    x0 = 0,
    ly = 0,
    t0 = 0;
  const atEnd = (el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
  document.addEventListener(
    "touchstart",
    (e) => {
      const el = $("mvBg");
      F = null;
      y0 = null;
      if (!el || el.hidden || el._closing || !mvFxOk() || e.touches.length !== 1) return;
      if (!el.contains(e.target) || e.target.closest("#mvSheet,button,input")) return;
      y0 = ly = e.touches[0].clientY;
      x0 = e.touches[0].clientX;
      t0 = performance.now();
    },
    { passive: true }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (y0 == null) return;
      const el = $("mvBg"),
        y = e.touches[0].clientY,
        dy = y - y0,
        dx = Math.abs(e.touches[0].clientX - x0);
      ly = y;
      if (!F) {
        if (Math.abs(dy) < 10 && dx < 10) return;
        if (dy >= 0 || dx * 1.2 > -dy || !atEnd(el) || document.body.classList.contains("mvdragging")) {
          y0 = null;
          return;
        }
        el._closing = 1;
        F = mvFoldPrep(el);
        if (!F) {
          el._closing = 0;
          y0 = null;
          return;
        }
        y0 = y;
      }
      if (e.cancelable) e.preventDefault();
      mvFoldSet(F, Math.max(0, Math.min(1, (y0 - y) / MVP_FULL)));
    },
    { passive: false }
  );
  const end = () => {
    if (!F) {
      y0 = null;
      return;
    }
    const f = F,
      v = (y0 - ly) / Math.max(1, performance.now() - t0);
    F = null;
    y0 = null;
    if (f.p > 0.3 || (v > 0.5 && f.p > 0.08)) {
      SND.play("whooshin");
      mvFoldRun(f, 1, 420, () => mvFoldHandover(f));
    } else {
      f.el._closing = 0;
      mvFoldBack(f);
    }
  };
  document.addEventListener("touchend", end);
  document.addEventListener("touchcancel", end);
})();
function mvUnstack() {
  const H = mvFront();
  if (!H) return;
  H.side.forEach((c, k) =>
    c.animate(
      [
        {
          transform: H.to(c),
          opacity: 0,
        },
      ],
      {
        duration: 420,
        delay: 40 + k * 40,
        easing: "cubic-bezier(.3,1.3,.5,1)",
        fill: "backwards",
      }
    )
  );
}
function mvRender(anim) {
  const el = $("mvBg");
  if (!el) return;
  const L = mvList();
  el.innerHTML = `<div class="mvtop"><b id="mvT">${escHtml(uiText("mv_t"))}</b><button class="iconbtn" data-mvclose aria-label="Schließen">${svgIcon("x", 20)}</button></div>
  <p class="mvhint">${escHtml(uiText("mv_hint"))}</p>
  <div class="mvlist">${L.map(
    (
      m,
      k
    ) => `<div class="mvc ${mvHas(m) ? "" : "nostand"} ${anim ? "in" : ""}" data-mvc="${m.i}" style="--i:${k};--c:${mvCol(m)}" role="button" tabindex="0" aria-label="${escHtml(m.label)}: ${escHtml(fmtEur(m.bal))}">
    <span class="mvl">${escHtml(m.label)}${m.cash ? "" : m.name === "Hauptkonto" || m.i === 0 ? "" : ` · ${escHtml(uiText("mv_space"))}`}</span>
    <b class="mvv" data-noi18n>${escHtml(fmtEur(m.bal))}</b>${mvHas(m) ? "" : `<small>${escHtml(uiText("mv_nostand"))}</small>`}<i class="mvgrip" aria-hidden="true"></i></div>`
  ).join("")}</div>
  <div class="mvsheet" id="mvSheet" hidden></div>`;
}
function mvSheet(from, to) {
  const sh = $("mvSheet"),
    L = mvList(),
    a = L.find((x) => x.i === from),
    b = L.find((x) => x.i === to);
  if (!sh || !a || !b) return;
  MV.from = a;
  MV.to = b;
  const q = [10, 25, 50].filter((v) => v <= Math.max(0, a.bal) || a.bal <= 0),
    all = Math.max(0, round2(a.bal));
  sh.innerHTML = `<div class="mvsh"><h3>${escHtml(uiText("mv_sheet"))}</h3>
    <div class="mvflow"><span class="mvchip" style="--c:${mvCol(a)}">${escHtml(a.label)}<small data-noi18n>${escHtml(fmtEur(a.bal))}</small></span><span class="mvarr" aria-hidden="true">${svgIcon("right", 18)}</span><span class="mvchip" style="--c:${mvCol(b)}">${escHtml(b.label)}<small data-noi18n>${escHtml(fmtEur(b.bal))}</small></span></div>
    <label class="mvamt"><input id="mvAmt" class="in" inputmode="decimal" enterkeyhint="send" placeholder="0,00" aria-label="${escHtml(uiText("mv_amt"))}"><span>€</span></label>
    <div class="mvq">${q.map((v) => `<button type="button" data-mvq="${v}">${v} €</button>`).join("")}${all > 0 ? `<button type="button" data-mvq="${all}">${escHtml(uiText("mv_all"))}</button>` : ""}</div>
    <div class="mvbt"><button type="button" class="btn" data-mvcancel>${escHtml(uiText("sh_cancel"))}</button><button type="button" class="btn primary" data-mvsend disabled>${escHtml(uiText("mv_send0"))}</button></div>
    <p class="small muted mvnote">${escHtml(uiText("mv_note"))}</p></div>`;
  sh.hidden = false;
  requestAnimationFrame(() => sh.classList.add("show"));
  setTimeout(() => {
    const i = $("mvAmt");
    i &&
      i.focus({
        preventScroll: true,
      });
  }, 260);
}
function mvSheetClose() {
  const sh = $("mvSheet");
  if (!sh || sh.hidden) return;
  sh.classList.remove("show");
  setTimeout(() => {
    sh.hidden = true;
  }, 260);
  document.querySelectorAll("#mvBg .mvc").forEach((c) => c.classList.remove("src", "tgt"));
}
function mvBtn() {
  const i = $("mvAmt"),
    bt = document.querySelector("[data-mvsend]");
  if (!i || !bt) return;
  const v = parseAmt(i.value || "");
  const ok = isFinite(v) && v > 0;
  bt.disabled = !ok;
  bt.textContent = ok
    ? uiText("mv_send", {
        v: fmtEur(v),
        n: MV.to.label,
      })
    : uiText("mv_send0");
}
async function mvDo() {
  const i = $("mvAmt");
  const v = round2(parseAmt(i.value || ""));
  if (!(v > 0)) return;
  const a = MV.from,
    b = MV.to,
    td = isoToday(),
    ts = Date.now();
  if (a.cash || b.cash) {
    const cs = store.settings.cash;
    if (cs)
      store.settings.cash = {
        ...cs,
        start: round2((Number(cs.start) || 0) + (b.cash ? v : -v)),
      };
  }
  const mv = {
    id: newId(),
    from: a.name,
    to: b.name,
    amt: v,
    date: td,
    ts,
  };
  const AN = store.settings.accountAnchors || {},
    aft = (m, n) => {
      const a = AN[n];
      return n !== "Bargeld" && (!a || m.date > a.date || (m.date === a.date && (m.ts || 0) > (a.ts || 0)));
    };
  store.settings.moves = [
    ...(store.settings.moves || []).filter(
      (m) => m.date >= isoOf(new Date(Date.now() - 120 * 864e5)) || aft(m, m.from) || aft(m, m.to)
    ),
    mv,
  ];
  await saveSettings();
  SND.play("pair");
  try {
    navigator.vibrate && navigator.vibrate([10, 40, 18]);
  } catch (_) {}
  const before = {
    [a.i]: a.bal,
    [b.i]: b.bal,
  };
  mvSheetClose();
  render();
  mvRender(false);
  for (const k of [a.i, b.i]) {
    const c = document.querySelector(`#mvBg [data-mvc="${k}"]`),
      m = mvList().find((x) => x.i === k);
    if (!c || !m) continue;
    c.classList.add(k === b.i ? "got" : "gave");
    const out = c.querySelector(".mvv"),
      s0 = before[k],
      s1 = m.bal,
      t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 700),
        e = 1 - Math.pow(1 - p, 3);
      out.textContent = fmtEur(s0 + (s1 - s0) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    if (reducedMotion()) out.textContent = fmtEur(s1);
    else requestAnimationFrame(step);
    setTimeout(() => c.classList.remove("got", "gave"), 1200);
  }
  toast(
    uiText("mv_done", {
      v: fmtEur(v),
      a: a.label,
      b: b.label,
    }),
    async () => {
      store.settings.moves = (store.settings.moves || []).filter((m) => m.id !== mv.id);
      if (a.cash || b.cash) {
        const cs = store.settings.cash;
        if (cs)
          store.settings.cash = {
            ...cs,
            start: round2((Number(cs.start) || 0) - (b.cash ? v : -v)),
          };
      }
      await saveSettings();
      render();
      if ($("mvBg") && !$("mvBg").hidden) mvRender(false);
    }
  );
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-mvopen]")) {
    mvOpen();
    return;
  }
  if (!e.target.closest("#mvBg, #mvSheet")) return;
  if (e.target.id === "mvSheet" && !$("mvBg")) {
    mvSheetClose();
    return;
  }
  if (e.target.closest("[data-mvclose]")) {
    mvClose();
    return;
  }
  if (e.target.closest("[data-mvcancel]")) {
    mvSheetClose();
    return;
  }
  const q = e.target.closest("[data-mvq]");
  if (q) {
    const i = $("mvAmt");
    i.value = String(q.dataset.mvq).replace(".", ",");
    mvBtn();
    SND.play("tick");
    return;
  }
  if (e.target.closest("[data-mvsend]")) {
    mvDo();
    return;
  }
  if (e.target.id === "mvBg" && $("mvSheet") && !$("mvSheet").hidden) {
    mvSheetClose();
    return;
  }
  const c = e.target.closest("[data-mvc].nostand");
  if (c && !MV.moved) {
    toast(uiText("mv_nostand_t"));
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "mvAmt") mvBtn();
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-newtour]");
  if (!b) return;
  const x = NEWTOUR.find((n) => n.v === b.dataset.newtour);
  if (!x) return;
  try {
    spSheetClose();
  } catch (_) {}
  try {
    mamiClose();
  } catch (_) {}
  ui.view = "home";
  render();
  setTimeout(() => ntOpen([x], true), 380);
});
document.addEventListener("keydown", (e) => {
  if (e.target.id === "mvAmt" && e.key === "Enter") {
    e.preventDefault();
    mvDo();
  }
});
/* Ziehen: kurz gedrückt halten, dann auf eine andere Karte ziehen */
(function () {
  let st = null,
    busy = 0;
  const end = () => {
    if (!st) return;
    clearTimeout(st.t);
    const d = st;
    st = null;
    if (!d.on) return;
    if (d.ghost) d.ghost.remove();
    d.src.classList.remove("src");
    document.body.classList.remove("mvdragging");
    const tg = document.querySelector("#mvBg .mvc.tgt");
    if (tg) {
      const to = +tg.dataset.mvc;
      if (!mvHas(mvList().find((x) => x.i === to))) {
        tg.classList.remove("tgt");
        MVFX.drop(null);
        toast(uiText("mv_nostand_t"));
        return;
      }
      d.src.classList.add("src");
      if (d.fx) {
        /* erst landen die Scheine, dann kommt das Betrag-Fenster */
        MVFX.drop(tg);
        busy = setTimeout(() => {
          busy = 0;
          mvSheet(d.from, to);
        }, 380);
      } else {
        SND.play("pop");
        mvSheet(d.from, to);
      }
    } else {
      MVFX.drop(null);
      SND.play("whooshin");
    }
    setTimeout(() => {
      MV.moved = false;
    }, 50);
  };
  document.addEventListener(
    "pointerdown",
    (e) => {
      const c = e.target.closest("#mvBg .mvc");
      if (!c || busy || (e.pointerType === "mouse" && e.button !== 0) || !$("mvSheet").hidden) return;
      if (!mvHas(mvList().find((x) => x.i === +c.dataset.mvc))) return;
      st = {
        src: c,
        from: +c.dataset.mvc,
        x0: e.clientX,
        y0: e.clientY,
        on: false,
        id: e.pointerId,
      };
      st.t = setTimeout(
        () => {
          if (!st) return;
          st.fx = MVFX.on();
          if (st.fx) MVFX.start(c, "#mvBg .mvc", st.x0, st.y0, e.pointerType !== "mouse");
          else {
            const r = c.getBoundingClientRect();
            const g = c.cloneNode(true);
            g.classList.add("mvghost");
            g.classList.remove("in");
            g.style.width = r.width + "px";
            g.style.height = r.height + "px";
            g.style.left = r.left + "px";
            g.style.top = r.top + "px";
            document.body.appendChild(g);
            st.ghost = g;
            st.dx = st.x0 - r.left;
            st.dy = st.y0 - r.top;
          }
          st.on = true;
          MV.moved = true;
          c.classList.add("src");
          document.body.classList.add("mvdragging");
          try {
            navigator.vibrate && navigator.vibrate(12);
          } catch (_) {}
          if (!st.fx) SND.play("detent");
        },
        e.pointerType === "mouse" ? 120 : 260
      );
    },
    true
  );
  document.addEventListener(
    "pointermove",
    (e) => {
      if (!st) return;
      if (!st.on) {
        if (Math.hypot(e.clientX - st.x0, e.clientY - st.y0) > 10) {
          clearTimeout(st.t);
          st = null;
        }
        return;
      }
      e.preventDefault();
      const g = st.ghost;
      if (g) {
        g.style.left = e.clientX - st.dx + "px";
        g.style.top = e.clientY - st.dy + "px";
        g.style.visibility = "hidden";
      } else MVFX.move(e.clientX, e.clientY);
      const under = document.elementFromPoint(e.clientX, e.clientY);
      if (g) g.style.visibility = "";
      const t = under && under.closest("#mvBg .mvc");
      document.querySelectorAll("#mvBg .mvc.tgt").forEach((x) => {
        if (x !== t) x.classList.remove("tgt");
      });
      if (t && t !== st.src && !t.classList.contains("tgt")) {
        t.classList.add("tgt");
        SND.play("detent");
        try {
          navigator.vibrate && navigator.vibrate(6);
        } catch (_) {}
      }
      const lst = document.querySelector("#mvBg");
      if (lst) {
        if (e.clientY < 90) lst.scrollTop -= 8;
        else if (e.clientY > innerHeight - 90) lst.scrollTop += 8;
      }
    },
    {
      passive: false,
    }
  );
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);
  document.addEventListener(
    "touchmove",
    (e) => {
      if (st && st.on) e.preventDefault();
    },
    {
      passive: false,
    }
  );
})();
/* Kartenstapel nach unten ziehen: Konten fächern sich unter dem Finger auf */
(function () {
  let y0 = null,
    x0 = 0,
    t0 = 0,
    ly = 0,
    pulling = false;
  document.addEventListener(
    "touchstart",
    (e) => {
      const s = e.target.closest("#astack");
      pulling = false;
      if (!s || e.touches.length !== 1 || window.scrollY > 4 || !document.querySelector("[data-mvopen]")) {
        y0 = null;
        return;
      }
      y0 = ly = e.touches[0].clientY;
      x0 = e.touches[0].clientX;
      t0 = performance.now();
    },
    {
      passive: true,
    }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (y0 == null) return;
      const y = e.touches[0].clientY,
        dy = y - y0,
        dx = Math.abs(e.touches[0].clientX - x0);
      ly = y;
      if (!pulling) {
        if (dy < 10 && dx < 10) return;
        if (dx > dy || dy <= 0) {
          y0 = null;
          return;
        }
        if (!mvFxOk()) {
          if (dy > 70) {
            y0 = null;
            mvOpen();
          }
          return;
        }
        pulling = mvPullStart();
        if (!pulling) {
          y0 = null;
          return;
        }
        y0 = y - dy;
      }
      if (e.cancelable) e.preventDefault();
      mvPullMove(dy);
    },
    {
      passive: false,
    }
  );
  const end = () => {
    if (!pulling) {
      y0 = null;
      return;
    }
    const dy = ly - y0,
      v = dy / Math.max(1, performance.now() - t0);
    pulling = false;
    y0 = null;
    mvPullEnd(dy > 70 || (v > 0.5 && dy > 30));
  };
  document.addEventListener("touchend", end);
  document.addEventListener("touchcancel", end);
})();

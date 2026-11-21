/* ===== Mami-Orbit: Mami in der Mitte, Blasen kreisen ===== */
const MO = {
  on: false,
  lvl: 0,
  a: 0,
  v: 0,
  drag: null,
  raf: 0,
  last: 0,
};
const MO_PG = [
  ["home", "🏠"],
  ["beruf", "💼"],
  ["zukunft", "🐷"],
  ["shop", "🛒"],
  ["list", "🧾"],
  ["fix", "📋"],
  ["year", "📊"],
  ["more", "⚙️"],
];
function moGeo() {
  const pc = document.documentElement.classList.contains("pc"),
    w = innerWidth,
    h = innerHeight;
  return {
    cx: w / 2,
    cy: h * (pc ? 0.5 : 0.47),
    r: Math.min(pc ? 240 : 150, w * (pc ? 0.3 : 0.37)),
    tilt: 0.42,
  };
}
function moItems() {
  if (MO.lvl === 0) {
    const n = (() => {
      try {
        return mbUnseen().length;
      } catch (_) {
        return 0;
      }
    })();
    return [
      {
        id: "ask",
        e: "💬",
        t: uiText("mo_ask"),
      },
      {
        id: "rem",
        e: "🔔",
        t: uiText("mo_rem"),
        n,
      },
      {
        id: "brief",
        e: "✉️",
        t: uiText("mo_brief"),
      },
      {
        id: "tour",
        e: "🧭",
        t: uiText("mo_tour"),
      },
    ];
  }
  return [
    {
      id: "all",
      e: "✨",
      t: uiText("mo_all"),
      all: 1,
    },
    ...MO_PG.filter(([k]) => PTOUR[k]).map(([k, e]) => ({
      id: "pg:" + k,
      e,
      t: TABDEF[k] ? TABDEF[k][0] : PTOUR[k].t,
    })),
  ];
}
function moOpen() {
  if (MO.on) return;
  try {
    if ($("mamiPop") && !$("mamiPop").hidden) mamiClose();
  } catch (_) {}
  MO.on = true;
  MO.lvl = 0;
  MO.a = 0;
  MO.v = 0;
  let bg = $("moBg");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "moBg";
    bg.className = "mobg";
    document.body.appendChild(bg);
  }
  bg.innerHTML = `<div class="modim"></div><div class="mosay" data-noi18n>${escHtml(mFill(uiText("mo_hi")))}</div><button type="button" class="moback" data-moback hidden data-noi18n>‹ 🧭 ${escHtml(uiText("mo_tour"))}</button><div class="moorb" id="moOrb"></div><div class="mome" id="moMe"><span class="mohalo"></span>${mamiAvatar ? mamiAvatar(null) : "👩"}</div><div class="mohint" data-noi18n>↔ ${escHtml(uiText("mo_spin"))}</div>`;
  bg.hidden = false;
  document.body.classList.add("locked");
  requestAnimationFrame(() => bg.classList.add("show"));
  const g = moGeo(),
    me = $("moMe");
  me.style.left = g.cx + "px";
  me.style.top = g.cy + "px";
  const q = $("ptourQ");
  if (q && !reducedMotion()) {
    const r = q.getBoundingClientRect(),
      sz = 128;
    mHeadOut(q);
    const from = {
        x: r.left + r.width / 2 - sz / 2,
        y: r.top + r.height / 2 - sz / 2,
      },
      to = {
        x: g.cx - sz / 2,
        y: g.cy - sz / 2,
      };
    mbArc(me, from, to, Math.max(0.3, r.height / sz), 1, 950, 120);
  } else if (q) mHeadOut(q);
  moBuild(true);
  MO.last = performance.now();
  cancelAnimationFrame(MO.raf);
  MO.raf = requestAnimationFrame(moTick);
}
function moBuild(first) {
  const o = $("moOrb");
  if (!o) return;
  const L = moItems(),
    base = first ? 1.05 : 0.05;
  o.className = "moorb lvl" + MO.lvl;
  o.innerHTML = L.map(
    (x, i) =>
      `<button type="button" class="monode${x.all ? " all" : ""}" data-mo="${escHtml(x.id)}" style="--d:${(base + i * (MO.lvl ? 0.07 : 0.15)).toFixed(2)}s"><span class="mob">${x.all ? `<b data-noi18n>${escHtml(x.t)}</b>` : x.e}${x.n ? `<i class="mobadge" data-noi18n>${x.n}</i>` : ""}</span>${x.all ? "" : `<span class="mol"${x.id.startsWith("pg:") ? "" : " data-noi18n"}>${escHtml(x.t)}</span>`}</button>`
  ).join("");
  MO.nodes = [...o.children];
  const bk = $("moBg").querySelector("[data-moback]");
  bk.hidden = MO.lvl === 0;
  const say = $("moBg").querySelector(".mosay");
  say.textContent = MO.lvl ? uiText("mo_pick") : mFill(uiText("mo_hi"));
  if (!reducedMotion())
    say.animate(
      [
        {
          opacity: 0,
          transform: "translate(-50%,8px)",
        },
        {
          opacity: 1,
          transform: "translate(-50%,0)",
        },
      ],
      {
        duration: 400,
        delay: first ? 900 : 0,
        fill: "backwards",
        easing: "cubic-bezier(.2,1.2,.35,1)",
      }
    );
  moPlace();
}
function moPlace() {
  const g = moGeo(),
    N = MO.nodes || [];
  N.forEach((nd, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N.length + MO.a,
      d = Math.sin(a),
      x = g.cx + Math.cos(a) * g.r * (MO.lvl ? 1.2 : 1),
      y = g.cy + d * g.r * (MO.lvl ? 0.6 : g.tilt) * (MO.lvl ? 1.2 : 1),
      s = 0.7 + (0.34 * (d + 1)) / 2;
    nd.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${s.toFixed(3)})`;
    nd.style.zIndex = d > 0 ? 30 : 5;
    nd.style.setProperty("--o", (0.5 + (0.5 * (d + 1)) / 2).toFixed(2));
  });
}
function moTick(now) {
  if (!MO.on) return;
  const dt = Math.min(0.05, (now - MO.last) / 1000);
  MO.last = now;
  if (!MO.drag) {
    const base = reducedMotion() ? 0 : MO.lvl ? -0.1 : 0.16;
    MO.v += (base - MO.v) * Math.min(1, dt * 1.6);
    MO.a += MO.v * dt;
  }
  moPlace();
  MO.raf = requestAnimationFrame(moTick);
}
function moClose(then) {
  const bg = $("moBg");
  if (!bg || !MO.on) return;
  MO.on = false;
  cancelAnimationFrame(MO.raf);
  bg.classList.remove("show");
  const me = $("moMe"),
    q = $("ptourQ"),
    N = MO.nodes || [];
  if (!reducedMotion())
    N.forEach((n, i) =>
      n.animate(
        [
          {
            opacity: 1,
          },
          {
            opacity: 0,
            transform: n.style.transform.replace(/scale\([^)]*\)/, "scale(0)"),
          },
        ],
        {
          duration: 300,
          delay: i * 30,
          easing: "ease-in",
          fill: "forwards",
        }
      )
    );
  let dn = 0;
  const done = () => {
    if (dn++) return;
    bg.hidden = true;
    document.body.classList.remove("locked");
    mHeadIn(q);
    if (typeof then === "function") then();
  };
  if (then === "keep") {
    const sy = bg.querySelector(".mosay"),
      bk = bg.querySelector(".moback"),
      hi = bg.querySelector(".mohint");
    [sy, bk, hi].forEach((x) => {
      if (x) x.style.visibility = "hidden";
    });
    bg.classList.add("show");
    clearTimeout(MO.hideT);
    MO.hideT = setTimeout(moHide, 3000);
    return;
  }
  if (me && q && !reducedMotion()) {
    const r = q.getBoundingClientRect(),
      mr = me.getBoundingClientRect(),
      sz = mr.width || 128;
    me.getAnimations().forEach((a) => a.cancel());
    const from = {
        x: mr.left,
        y: mr.top,
      },
      to = {
        x: r.left + r.width / 2 - sz / 2,
        y: r.top + r.height / 2 - sz / 2,
      },
      K = [],
      N2 = 22,
      cx = (from.x + to.x) / 2 - 40,
      cy = Math.min(from.y, to.y) - 60;
    for (let i = 0; i <= N2; i++) {
      const t = i / N2,
        u = 1 - t,
        x = u * u * from.x + 2 * u * t * cx + t * t * to.x,
        y = u * u * from.y + 2 * u * t * cy + t * t * to.y,
        sc = 1 + (Math.max(0.3, r.height / sz) - 1) * t * t;
      K.push({
        transform: `translate(${(x - from.x).toFixed(1)}px,${(y - from.y).toFixed(1)}px) scale(${sc.toFixed(3)}) rotate(${(-Math.sin(t * Math.PI) * 14).toFixed(1)}deg)`,
        opacity: t > 0.92 ? 0 : 1,
        offset: t,
      });
    }
    me.animate(K, {
      duration: 760,
      delay: 150,
      easing: "cubic-bezier(.5,0,.3,1)",
      fill: "forwards",
    })
      .finished.then(done)
      .catch(done);
    setTimeout(done, 1350);
  } else setTimeout(done, 250);
}
function moHide() {
  clearTimeout(MO.hideT);
  const bg = $("moBg");
  if (!bg || bg.hidden || MO.on) return;
  bg.hidden = true;
  if (!document.querySelector("#mbBg:not([hidden]),#tourBg:not([hidden])")) document.body.classList.remove("locked");
  if (!MB.on && TOUR.i < 0) mHeadIn();
}
function moLevel(l) {
  const N = MO.nodes || [];
  if (reducedMotion()) {
    MO.lvl = l;
    moBuild();
    return;
  }
  N.forEach((n, i) =>
    n.animate(
      [
        {
          opacity: 1,
        },
        {
          opacity: 0,
          transform: n.style.transform.replace(/scale\([^)]*\)/, "scale(0)"),
        },
      ],
      {
        duration: 280,
        delay: i * 25,
        easing: "ease-in",
        fill: "forwards",
      }
    )
  );
  const me = $("moMe");
  if (me) {
    const mv = me.querySelector(".mav");
    (mv || me).animate(
      [
        {
          transform: "none",
        },
        {
          transform: "scale(1.12)",
        },
        {
          transform: "none",
        },
      ],
      {
        duration: 500,
        delay: 200,
        easing: "cubic-bezier(.3,1.5,.5,1)",
      }
    );
  }
  setTimeout(() => {
    MO.lvl = l;
    MO.a = 0;
    MO.v = 0;
    moBuild();
  }, 330);
}
function moPick(id, el) {
  if (MO.lvl === 0) {
    if (id === "ask") {
      moClose(() =>
        setTimeout(() => {
          try {
            mamiOpen();
          } catch (_) {}
        }, 60)
      );
      return;
    }
    if (id === "rem") {
      const me = $("moMe"),
        r = me ? me.getBoundingClientRect() : null;
      const L = mbAll();
      if (!L.length) {
        moClose();
        setTimeout(() => {
          try {
            toast(mFill(uiText("mb_none")));
          } catch (_) {}
        }, 900);
        return;
      }
      MO.keep = true;
      moClose("keep");
      setTimeout(() => {
        MO.keep = false;
        try {
          localStorage.setItem("hb-hints-seen", JSON.stringify(allHints().map(hintKey)));
        } catch (_) {}
        MB.fromRect = r;
        mbOpen(L);
      }, 260);
      return;
    }
    if (id === "brief") {
      moClose(() =>
        setTimeout(() => {
          try {
            brOpen();
          } catch (_) {}
        }, 60)
      );
      return;
    }
    if (id === "tour") {
      if (el && !reducedMotion())
        el.animate(
          [
            {
              transform: el.style.transform,
            },
            {
              transform: el.style.transform.replace(/scale\([^)]*\)/, "scale(1.25)"),
            },
            {
              transform: el.style.transform,
            },
          ],
          {
            duration: 300,
          }
        );
      moLevel(1);
      return;
    }
  } else {
    const me = $("moMe"),
      r = me ? me.getBoundingClientRect() : null;
    MO.keep = true;
    moClose("keep");
    const go = (fn) =>
      setTimeout(() => {
        TOUR_MAMI.fromRect = r;
        try {
          fn();
        } catch (_) {}
        MO.keep = false;
        if (TOUR.i < 0) {
          TOUR_MAMI.fromRect = null;
          moHide();
        }
      }, 300);
    if (id === "all") {
      go(() => tourOpen());
      return;
    }
    const v = id.slice(3);
    ui.view = v;
    ui.sp = null;
    render();
    window.scrollTo({
      top: 0,
    });
    go(() => ptourOpen(v));
  }
}
document.addEventListener(
  "pointerdown",
  (e) => {
    const bg = $("moBg");
    if (!MO.on || !bg || !bg.contains(e.target)) return;
    const g0 = moGeo();
    MO.drag = {
      x: e.clientX,
      x0: e.clientX,
      y0: e.clientY,
      t: performance.now(),
      moved: false,
      v: 0,
      ang: moAng(e.clientX, e.clientY, g0),
    };
  },
  true
);
function moAng(x, y, g) {
  const dx = x - g.cx,
    dy = (y - g.cy) / ((MO.lvl ? 0.6 : g.tilt) || 1);
  return Math.hypot(dx, dy) < g.r * 0.22 ? null : Math.atan2(dy, dx);
}
document.addEventListener(
  "pointermove",
  (e) => {
    if (!MO.on || !MO.drag) return;
    const d = MO.drag,
      dx = e.clientX - d.x,
      now = performance.now(),
      g = moGeo();
    if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6) d.moved = true;
    if (!d.moved) return;
    e.preventDefault();
    const an = moAng(e.clientX, e.clientY, g);
    let da;
    if (an != null && d.ang != null) {
      da = an - d.ang;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
    } else da = (dx / (g.r * (MO.lvl ? 1.2 : 1))) * (e.clientY > g.cy ? -1 : 1);
    d.ang = an;
    MO.a += da;
    d.v = da / Math.max(0.008, (now - d.t) / 1000);
    d.x = e.clientX;
    d.t = now;
    moPlace();
    const h = $("moBg").querySelector(".mohint");
    if (h) h.classList.add("off");
  },
  true
);
document.addEventListener(
  "pointerup",
  (e) => {
    if (!MO.on || !MO.drag) return;
    const d = MO.drag;
    MO.drag = null;
    if (d.moved) {
      MO.v = Math.max(-6, Math.min(6, d.v));
      MO.skipClick = performance.now();
    }
  },
  true
);
document.addEventListener("click", (e) => {
  const bg = $("moBg");
  if (!MO.on || !bg || !bg.contains(e.target)) return;
  if (MO.skipClick && performance.now() - MO.skipClick < 350) return;
  const n = e.target.closest("[data-mo]");
  if (n) {
    moPick(n.dataset.mo, n);
    return;
  }
  if (e.target.closest("[data-moback]")) {
    moLevel(0);
    return;
  }
  if (e.target.closest("#moMe") || e.target.closest(".modim")) moClose();
});
document.addEventListener("keydown", (e) => {
  if (!MO.on) return;
  if (e.key === "Escape") {
    if (MO.lvl) moLevel(0);
    else moClose();
  } else if (e.key === "ArrowRight") MO.v = 2.4;
  else if (e.key === "ArrowLeft") MO.v = -2.4;
});
addEventListener("resize", () => {
  if (!MO.on) return;
  const g = moGeo(),
    me = $("moMe");
  if (me) {
    me.style.left = g.cx + "px";
    me.style.top = g.cy + "px";
  }
  moPlace();
});

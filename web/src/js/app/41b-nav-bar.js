/* Untere Leiste: Pille mit aufklappendem Namen, Plus bleibt fest */
var NAVX = {
  k: null,
  L: null,
  W: 0,
};
/* Spalten der Leiste und Lage der Pille, wenn act der aktive Reiter ist */
function navLayout(nav, act) {
  const kids = [...nav.children].filter((e) => e.classList.contains("tab") && getComputedStyle(e).display !== "none"),
    pi = kids.findIndex((e) => e.classList.contains("plus"));
  const left = kids.slice(0, pi < 0 ? Math.ceil(kids.length / 2) : pi),
    right = pi < 0 ? kids.slice(left.length) : kids.slice(pi + 1);
  const cs = getComputedStyle(nav),
    inner = nav.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    PW = pi < 0 ? 0 : 64,
    H = (inner - PW) / 2;
  /* Symbol über dem Namen: alle Spalten gleich breit, die Pille umschließt nur den gewählten Reiter */
  const stacked = !!act && getComputedStyle(act).flexDirection === "column";
  const tw = (t) => {
    const n = t.querySelector(".tname");
    if (stacked) return Math.max(24, n ? Math.min(96, n.scrollWidth) : 0) + 20;
    return 26 + 24 + (n ? Math.min(112, n.scrollWidth) + 7 : 0);
  };
  const cols = (g) => {
    if (!g.length) return [];
    if (!act || stacked || !g.includes(act)) return g.map(() => H / g.length);
    const w = Math.min(H - 34 * (g.length - 1), tw(act)),
      r = (H - w) / Math.max(1, g.length - 1);
    return g.map((t) => (t === act ? w : r));
  };
  const cl = cols(left),
    cr = cols(right),
    all = [...cl, ...(pi < 0 ? [] : [PW]), ...cr];
  if (!(inner > 200) || all.some((v) => !(v > 0))) return null;
  const L = { cl, cr, all, PW, pi, inner, x: 0, w: 0 };
  if (!act) return L;
  const idx = kids.indexOf(act);
  let x = parseFloat(cs.paddingLeft);
  for (let i = 0; i < idx; i++) x += all[i];
  L.w = Math.min(all[idx], tw(act));
  L.x = x + (all[idx] - L.w) / 2;
  return L;
}
function navPill(anim) {
  const nav = document.querySelector("nav.tabs");
  if (!nav) return;
  nav.classList.add("navx");
  const ind = nav.querySelector(".tabind");
  if (!ind || IS_PC || getComputedStyle(ind).display === "none") {
    nav.style.removeProperty("--nc");
    return;
  }
  const act = [...nav.querySelectorAll(".tab")].find(
      (e) =>
        e.getAttribute("aria-selected") === "true" &&
        !e.classList.contains("plus") &&
        getComputedStyle(e).display !== "none"
    ),
    L = navLayout(nav, act);
  if (!L) {
    nav.style.removeProperty("--nc");
    return;
  }
  const fr = (v) => `calc((100% - ${L.PW}px) * ${(v / (L.inner - L.PW)).toFixed(4)})`;
  nav.style.setProperty("--nc", [...L.cl.map(fr), ...(L.pi < 0 ? [] : [L.PW + "px"]), ...L.cr.map(fr)].join(" "));
  nav.classList.toggle("nosel", !act);
  /* Keine Hauptseite offen (z. B. Einstellungen): die alte Stelle vergessen, damit der Knopf beim
     nächsten Antippen direkt dort aufgeht und nicht vom vorigen Bereich herüberfließt */
  if (!act) {
    NAVX.k = null;
    NAVX.L = null;
    return;
  }
  const { x, w } = L,
    y = (nav.clientHeight - 48) / 2,
    col =
      getComputedStyle(act).getPropertyValue("--tcol").trim() ||
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  ind.style.setProperty("--ic", col);
  ind.style.top = y + "px";
  /* Beim Wischen übernimmt navFlow die Bewegung – hier nur den Endstand setzen */
  /* Antippen oder jeder andere Wechsel zwischen den Hauptseiten: dieselbe Flüssigkeit wie beim Wischen */
  const key = act.dataset.go,
    fresh = !NAVX.k;
  if (anim && NAVX.k && NAVX.k !== key && !navFlow.on() && navFlow.start(NAVX.k, key)) navFlow.finish(true);
  if (anim && fresh && !reducedMotion() && !navFlow.on()) {
    ind.animate(
      [
        { opacity: 0, transform: `translateX(${x}px) scale(.6)` },
        { opacity: 1, transform: `translateX(${x}px)` },
      ],
      { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
    act.querySelector("svg")?.animate([{ transform: "scale(.8)" }, { transform: "none" }], {
      duration: 320,
      easing: "cubic-bezier(.2,.8,.2,1)",
    });
  }
  NAVX.k = key;
  if (anim && NAVX.L != null && !reducedMotion() && !navFlow.on()) {
    ind.animate(
      [
        {
          transform: `translateX(${NAVX.L}px)`,
          width: NAVX.W + "px",
        },
        {
          transform: `translateX(${x}px)`,
          width: w + "px",
        },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(.3,1.2,.4,1)",
      }
    );
    act.querySelector("svg")?.animate(
      [
        {
          transform: "translateY(5px) scale(.85)",
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
  ind.style.transform = `translateX(${x}px)`;
  ind.style.width = w + "px";
  NAVX.L = x;
  NAVX.W = w;
}

/* Wischen zwischen den Hauptseiten: Die Pille zieht ihren Namen ein und wird zum Kreis, eine Spitze
   wandert zum neuen Symbol und baut dort den Kreis auf. Dazwischen hält eine Verbindung mit nach innen
   gewölbten Übergängen beide zusammen. Das Plus ist eine Wand – die Verbindung taucht darunter durch. */
const navFlow = (() => {
  let st = null,
    cv = null;
  const lerp = (a, b, t) => a + (b - a) * t,
    clamp = (v) => Math.min(1, Math.max(0, v)),
    smooth = (t) => t * t * (3 - 2 * t),
    nav = () => document.querySelector("nav.tabs"),
    tab = (k) => nav().querySelector(`.tab[data-go="${k}"]`),
    tcol = (t) =>
      getComputedStyle(t).getPropertyValue("--tcol").trim() ||
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  /* Gezeichnet wird auf eine Canvas statt in SVG: ständig wechselnde SVG-Füllungen und Verläufe haben die Grafik
     älterer Android-WebViews zum Absturz gebracht. Die Pfade bleiben SVG-Pfadtexte (Path2D). */
  function layer(n) {
    if (!cv || cv.parentNode !== n) {
      cv = document.createElement("canvas");
      cv.className = "navflow";
      cv.setAttribute("aria-hidden", "true");
      n.insertBefore(cv, n.firstChild);
    }
    const dpr = Math.min(2, devicePixelRatio || 1),
      w = Math.round(n.clientWidth * dpr),
      h = Math.round(n.clientHeight * dpr);
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    cv.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    return cv;
  }
  const circle = (cx, cy, r) =>
    r < 0.5 ? "" : `M${(cx - r).toFixed(2)} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  function capsule(c, w, cy, h) {
    const r = h / 2,
      x = c - w / 2,
      f = (v) => v.toFixed(2);
    return `M${f(x + r)} ${f(cy - r)}H${f(x + w - r)}A${r} ${r} 0 0 1 ${f(x + w - r)} ${f(cy + r)}H${f(x + r)}A${r} ${r} 0 0 1 ${f(x + r)} ${f(cy - r)}Z`;
  }
  /* Verbindung zwischen zwei Kreisen auf einer Höhe: Hohlkehlen vom Radius rf berühren beide Kreise,
     rf wird so gewählt, dass die schmalste Stelle n halb dick ist */
  function bridge(x1, r1, x2, r2, y, n, tipDy) {
    const d = Math.abs(x2 - x1);
    if (r1 < 1 || r2 < 1 || d < 1 || d <= Math.abs(r1 - r2)) return "";
    const fit = (rf) => {
      const xf = (d * d + (r1 + rf) ** 2 - (r2 + rf) ** 2) / (2 * d),
        h2 = (r1 + rf) ** 2 - xf * xf;
      return h2 > 0 ? [xf, Math.sqrt(h2)] : null;
    };
    let lo = 0.5,
      hi = 400,
      best = null;
    for (let k = 0; k < 40; k++) {
      const m = (lo + hi) / 2,
        s = fit(m);
      if (!s) {
        lo = m;
        continue;
      }
      if (s[1] - m > n) hi = m;
      else lo = m;
      best = [m, s];
    }
    let rf = 900,
      xf = d / 2,
      hf = rf + n;
    if (best && best[1][1] - best[0] > 0.2 && best[1][0] > 0 && best[1][0] < d) [rf, [xf, hf]] = best;
    const dir = x2 > x1 ? 1 : -1,
      fx = x1 + dir * xf;
    const touch = (cx, r) => {
      const vx = fx - cx,
        vy = -hf,
        l = Math.hypot(vx, vy);
      return cx + (vx / l) * r;
    };
    const xa = Math.min(touch(x1, r1), touch(x2, r2)),
      xb = Math.max(touch(x1, r1), touch(x2, r2)),
      N = 90,
      X = [],
      half = [];
    for (let i = 0; i <= N; i++) {
      const x = lerp(xa, xb, i / N),
        u = Math.min(rf, Math.abs(x - fx));
      X.push(x);
      half.push(Math.max(0.6, hf - Math.sqrt(Math.max(0, rf * rf - u * u))));
    }
    /* unter dem Plus nach unten wegdrücken und den Knick weich verteilen */
    const R = st.pr + 5,
      floor = st.nh + 3,
      push = X.map((x, i) => {
        const dx = Math.abs(x - st.px),
          need = dx < R ? Math.max(0, st.pc + Math.sqrt(R * R - dx * dx) - (y - half[i])) : 0;
        return Math.max(need, tipDy * Math.exp(-(((x - x2) / (r2 + 10)) ** 2)));
      }),
      W = 12,
      soft = push.map((v, i) => {
        let s = 0,
          w = 0;
        for (let k = -W; k <= W; k++) {
          const j = i + k;
          if (j < 0 || j > N) continue;
          const g = Math.exp(-(k * k) / ((W * W) / 2));
          s += push[j] * g;
          w += g;
        }
        return Math.max(v, (s / w) * 1.15);
      });
    const top = [],
      bot = [];
    for (let i = 0; i <= N; i++) {
      const t = y - half[i] + soft[i];
      top.push([X[i], t]);
      bot.push([X[i], Math.max(t + 2.4, Math.min(y + half[i] + soft[i], floor))]);
    }
    const f = (p) => p[0].toFixed(2) + " " + p[1].toFixed(2);
    return "M" + top.map(f).join("L") + "L" + bot.reverse().map(f).join("L") + "Z";
  }
  function paint(q, wob = 0) {
    const S = st,
      n = nav(),
      nr = n.getBoundingClientRect();
    n.style.setProperty("--nc", S.A.all.map((v, i) => lerp(v, S.B.all[i], q).toFixed(1) + "px").join(" "));
    const iconX = (t) => {
      const r = t.querySelector("svg").getBoundingClientRect();
      return r.left + r.width / 2 - nr.left;
    };
    const oc = iconX(S.ta),
      tc = iconX(S.tb),
      side = tc > oc ? 1 : -1,
      y = S.y + 24,
      Ac = S.A.x + S.A.w / 2,
      Bc = S.B.x + S.B.w / 2;
    /* alt: Name rein, Pille wird zum Kreis, später läuft der Kreis leer */
    const k1 = smooth(clamp(q / 0.3)),
      oW = lerp(S.A.w, 48, k1),
      oX = lerp(Ac, oc, k1),
      r1 = 24 * (1 - smooth(clamp((q - 0.55) / 0.37)));
    /* neu: Spitze wandert zum Symbol, dort baut sich der Kreis auf und wird am Ende zur Pille */
    const go = smooth(clamp((q - 0.06) / 0.34)),
      g = clamp((q - 0.34) / 0.22),
      pop = g <= 0 ? 0 : 1 + 2.2 * (g - 1) ** 3 + 1.2 * (g - 1) ** 2,
      r2 = q < 0.06 ? 0 : lerp(9, 24, pop),
      nX = lerp(oX + side * (oW / 2 - 9), tc, go),
      k2 = smooth(clamp((q - 0.82) / 0.18));
    const R = S.pr + 5,
      dx = Math.abs(nX - S.px),
      dip =
        dx < R + r2
          ? Math.min(
              Math.max(0, S.pc + Math.sqrt(Math.max(0, (R + r2) ** 2 - dx * dx)) - y) * clamp(1 - (r2 - 9) / 8),
              S.nh + 2 - y - r2
            )
          : 0;
    const D = [
      k1 < 1 ? capsule(oX, oW, y, 48) : circle(oc, y, r1),
      k2 > 0
        ? capsule(lerp(nX, Bc, k2), Math.max(lerp(2 * r2, S.B.w, k2), 2 * r2), y, 2 * r2 * (1 - 0.06 * wob))
        : circle(nX, y + dip, r2 * (1 + 0.05 * wob)),
      "",
    ];
    const ra = k1 < 1 ? 24 : r1,
      neck = Math.max(1.8, Math.min(ra, r2) * 0.42 - Math.abs(nX - oc) * 0.07) * (1 - smooth(clamp((q - 0.78) / 0.2)));
    if (r2 > 1 && ra > 1 && neck > 0.4)
      D[2] = bridge(k1 < 1 ? oX + side * (oW / 2 - 24) : oc, ra, nX, r2, y, neck, dip);
    /* alte Form in ihrer Farbe, neue Pille in ihrer – nur Verbindung und wandernde Spitze wechseln in der Mitte */
    const cx = cv.getContext("2d"),
      grad = cx.createLinearGradient(oc, 0, Math.abs(tc - oc) < 1 ? oc + 1 : tc, 0);
    grad.addColorStop(0.42, S.ca);
    grad.addColorStop(0.58, S.cb);
    cx.clearRect(0, 0, cv.width, cv.height);
    [S.ca, k2 > 0 ? S.cb : grad, grad].forEach((f, i) => {
      if (!D[i]) return;
      cx.fillStyle = f;
      cx.fill(new Path2D(D[i]));
    });
    /* Namen und Symbolfarben: weiß nur, solange Farbe dahinter ist */
    const na = S.ta.querySelector(".tname"),
      nb = S.tb.querySelector(".tname");
    if (!S.stk) {
      na.style.maxWidth = lerp(S.nA, 0, clamp(q / 0.3)).toFixed(1) + "px";
      na.style.marginLeft = lerp(7, 0, clamp(q / 0.3)).toFixed(1) + "px";
      na.style.opacity = String(clamp(1 - q / 0.2));
      nb.style.maxWidth = lerp(0, S.nB, clamp((q - 0.8) / 0.2)).toFixed(1) + "px";
      nb.style.marginLeft = lerp(0, 7, clamp((q - 0.8) / 0.2)).toFixed(1) + "px";
      nb.style.opacity = String(clamp((q - 0.86) / 0.14));
    }
    const white = (t, v) =>
      t.style.setProperty("color", `color-mix(in srgb, #fff ${Math.round(100 * v)}%, var(--muted))`, "important");
    white(S.ta, k1 < 1 ? 1 : clamp((r1 - 8) / 12));
    white(S.tb, clamp((r2 - 12) / 10));
  }
  function cleanup(done) {
    if (!st) return;
    const S = st,
      n = nav();
    st = null;
    cancelAnimationFrame(S.raf);
    for (const t of [S.ta, S.tb]) {
      t.style.removeProperty("color");
      const nm = t.querySelector(".tname");
      nm.style.maxWidth = nm.style.marginLeft = nm.style.opacity = nm.style.transition = nm.style.textOverflow = "";
    }
    if (cv) cv.style.display = "none";
    n.querySelector(".tabind").style.opacity = "";
    n.style.transition = "";
    if (!done) n.style.setProperty("--nc", S.nc);
    navPill(false);
  }
  return {
    on: () => !!st,
    start(from, to) {
      this.stop(true);
      const n = nav(),
        ind = n && n.querySelector(".tabind");
      if (!n || IS_PC || reducedMotion() || !ind || getComputedStyle(ind).display === "none") return;
      const ta = tab(from),
        tb = tab(to);
      if (!ta || !tb) return;
      const A = navLayout(n, ta),
        B = navLayout(n, tb),
        plus = n.querySelector(".tab.plus");
      if (!A || !B || !plus) return;
      const nr = n.getBoundingClientRect(),
        pr = plus.getBoundingClientRect();
      st = {
        ta,
        tb,
        A,
        B,
        q: 0,
        nc: n.style.getPropertyValue("--nc"),
        ca: tcol(ta),
        cb: tcol(tb),
        y: (n.clientHeight - 48) / 2,
        nh: n.clientHeight,
        px: pr.left + pr.width / 2 - nr.left,
        pc: pr.top + pr.height / 2 - nr.top,
        pr: pr.width / 2,
        nA: Math.min(112, ta.querySelector(".tname").scrollWidth),
        nB: Math.min(112, tb.querySelector(".tname").scrollWidth),
        stk: getComputedStyle(ta).flexDirection === "column",
      };
      layer(n).style.display = "";
      ind.style.opacity = "0";
      n.style.transition = "none";
      for (const t of [ta, tb]) {
        const nm = t.querySelector(".tname");
        nm.style.transition = "none";
        nm.style.textOverflow = "clip";
      }
      paint(0);
      return true;
    },
    /* folgt dem Finger mit leichter Federung */
    move(p) {
      if (!st || st.ending) return;
      const now = performance.now(),
        dt = Math.min(50, now - (st.t || now - 16)) / 1000;
      st.t = now;
      st.q += (p - st.q) * (1 - Math.exp(-dt * 22));
      paint(st.q);
    },
    /* nach dem Loslassen zu Ende laufen (oder zurück) */
    finish(done) {
      if (!st) return;
      const S = st,
        q0 = S.q,
        to = done ? 1 : 0,
        t0 = performance.now(),
        len = 700 * Math.max(0.4, Math.abs(to - q0));
      S.ending = true;
      S.done = done;
      const run = () => {
        if (st !== S) return;
        const t = (performance.now() - t0) / len,
          k = clamp(t),
          e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2,
          wob = done && t > 1 ? Math.sin(((t - 1) / 0.45) * Math.PI * 2) * Math.exp(-(t - 1) * 6) * 0.8 : 0;
        S.q = lerp(q0, to, e);
        paint(S.q, wob);
        if (t < (done ? 1.45 : 1)) S.raf = requestAnimationFrame(run);
        else cleanup(done);
      };
      S.raf = requestAnimationFrame(run);
    },
    /* abbrechen – eine auslaufende Bewegung nur, wenn ausdrücklich gewollt */
    stop(force) {
      if (!st || (st.ending && !force)) return;
      cleanup(st.ending && st.done);
    },
  };
})();
addEventListener("resize", () => navPill(false));
try {
  let rw = 0;
  new ResizeObserver((es) => {
    const w = Math.round(es[0].contentRect.width);
    if (w !== rw) {
      rw = w;
      navPill(false);
    }
  }).observe(document.querySelector("nav.tabs"));
} catch (_) {}
try {
  document.fonts.ready.then(() => navPill(false));
} catch (_) {}
setTimeout(() => {
  try {
    navPill(false);
  } catch (_) {}
}, 600);

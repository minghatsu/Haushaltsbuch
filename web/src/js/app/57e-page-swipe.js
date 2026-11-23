/* Hauptseiten wischen: 3D-Würfel zwischen Haushalt, Beruf, Sparen und Einkauf */
(function () {
  const ORDER = ["home", "beruf", "zukunft", "shop"],
    RENDER = {
      beruf: () => renderBeruf(),
      zukunft: () => {
        renderZukunft();
        if (!IS_PC) initStack("zstack", "zkIdx", "zdots");
      },
      shop: () => renderShop(),
      home: () => renderHome(),
      list: () => renderList(),
      fix: () => renderFix(),
      year: () => renderYear(),
      ziele: () => renderZiele(),
      more: () => {
        renderMore();
        renderSpPages();
      },
    };
  const main = document.querySelector("main.wrap");
  const hScroll = (t) => {
    for (let n = t; n && n !== document.body; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 2) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === "auto" || ox === "scroll") return true;
      }
    }
    return false;
  };
  const blocked = (t) =>
    t.closest(
      "#moBg,#mbBg,#tourBg,.hobg,.sheet,.backdrop,.fan,.docrev,.pfed,#lockBg,#loginBg,#astack,#zstack,.srail,.bt3,.bubbles,.fxchips,input[type=range],input:focus,select:focus,textarea:focus,.wiz,[data-noswipe]"
    ) ||
    hScroll(t) ||
    document.querySelector(".backdrop:not([hidden])");
  const sec = (k) => document.querySelector(`[data-view="${k}"]`);
  let x0 = 0,
    y0 = 0,
    t0 = 0,
    on = false,
    lock = null,
    dir = 0,
    cur = null,
    nbKey = null,
    W = 1,
    p = 0,
    busy = false,
    /* Fingerspur mit den Zeitstempeln der Ereignisse – Date.now() im Handler wäre auf langsamen Geräten
       verzerrt, weil das Zeichnen die Ereignisse verzögert */
    trail = [],
    xL = 0,
    tL = 0;
  let stage = null,
    fC = null,
    fN = null,
    shC = null,
    shN = null,
    sY = 0,
    nY = 0;
  const MEM = {};
  /* Welle: Kacheln und Schrift blenden von oben nach unten aus und auf der neuen Seite
     genauso ein – unscharf und etwas kleiner, solange sie im Übergang sind */
  const WAVE = new WeakMap(),
    WBAND = 0.35,
    calm = { get matches() { return motionOff(); } };
  function waveItems(f, c, top, H) {
    const pick = new Set(c.querySelectorAll(".atile,.hbodo"));
    c.querySelectorAll("*").forEach((e) => {
      if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || e.matches("svg,canvas,img,button"))
        pick.add(e);
    });
    const cTop = c.getBoundingClientRect().top,
      list = [];
    pick.forEach((e) => {
      for (let p = e.parentElement; p && p !== c; p = p.parentElement) if (pick.has(p)) return;
      const r = e.getBoundingClientRect();
      if (!r.height) return;
      const y = top + r.top - cTop + r.height / 2;
      if (y < -40 || y > H + 40) return;
      list.push([e, Math.min(1, Math.max(0, y / H)), e.style.transform]);
    });
    WAVE.set(f, list);
  }
  function wave(f, q, entering) {
    const list = WAVE.get(f);
    if (!list || calm.matches) return;
    for (const [e, y, base] of list) {
      const t = Math.min(1, Math.max(0, (q * (1 + WBAND) - y) / WBAND)),
        o = entering ? t : 1 - t,
        s = e.style;
      if (o >= 1) {
        if (s.opacity) {
          s.opacity = s.filter = "";
          s.transform = base;
        }
        continue;
      }
      const k = 1 - o;
      s.opacity = o.toFixed(3);
      s.transform = `${base} scale(${(1 - 0.06 * k).toFixed(3)})`;
      s.filter = `blur(${(4 * k).toFixed(1)}px)`;
    }
  }
  function waveAll(a) {
    if (fC) wave(fC, a, false);
    if (fN) wave(fN, a, true);
  }
  function face(srcSec, top, trim = true) {
    const f = document.createElement("div");
    f.className = "cubeface";
    const c = srcSec.cloneNode(true);
    c.hidden = false;
    /* data-view bleibt an der Kopie: viele Regeln hängen daran (Spalten der Kacheln,
       grüner Kartenrand) – ohne sie sähe die Seite im Würfel anders aus als danach */
    c.removeAttribute("id");
    c.querySelectorAll("[id],[data-view]").forEach((e) => {
      e.removeAttribute("id");
      e.removeAttribute("data-view");
    });
    c.classList.add("cubing");
    /* Zählwerke drehen ihre Ziffern erst zwei Bilder nach dem Zeichnen – in der Kopie gleich den Endstand zeigen */
    const so = [...srcSec.querySelectorAll(".hbodo")],
      co = [...c.querySelectorAll(".hbodo")];
    so.forEach((e, i) => {
      const str = e._s,
        x = co[i];
      if (!str || !x) return;
      [...str].forEach((ch, j) => {
        const st = x.children[j] && x.children[j].querySelector(".hs");
        if (st) {
          st.style.transition = "none";
          st.style.transform = `translateY(${-Number(ch)}em)`;
        }
      });
    });
    const r = cur.getBoundingClientRect();
    Object.assign(c.style, {
      position: "absolute",
      left: r.left + "px",
      width: r.width + "px",
      top: top + "px",
      margin: "0",
    });
    const SC = ".srail,.stabs,.acards,.filters,.rings,.jars,.bubbles,.table-wrap,.tlchips",
      a = srcSec.querySelectorAll(SC),
      b = c.querySelectorAll(SC);
    for (let i = 0; i < a.length && i < b.length; i++)
      if (a[i].scrollLeft)
        [...b[i].children].forEach((ch) => (ch.style.transform = `translateX(${-a[i].scrollLeft}px)`));
    const sr = srcSec.getBoundingClientRect(),
      H = stage.clientHeight || innerHeight,
      kids = [...srcSec.children],
      ck = [...c.children];
    if (trim)
      kids.forEach((k, i) => {
        const r = k.getBoundingClientRect(),
          y = top + (r.top - sr.top);
        if (ck[i] && (y + r.height < -40 || y > H + 40)) {
          ck[i].style.height = r.height + "px";
          ck[i].style.overflow = "hidden";
          ck[i].style.contentVisibility = "hidden";
        }
      });
    const sh = document.createElement("div");
    sh.className = "cubeshade";
    f.appendChild(c);
    f.appendChild(sh);
    stage.appendChild(f);
    if (!calm.matches) waveItems(f, c, top, H);
    return [f, sh];
  }
  let PREP = null,
    prepT = 0,
    dirty = true;
  const neighbour = (v, d) => {
    const i = ORDER.indexOf(v),
      n = ORDER.length;
    return ORDER[(i + (d < 0 ? 1 : -1) + n) % n];
  };
  function headTop() {
    const hb = document.querySelector("header.top") || document.querySelector(".top"),
      hr = hb
        ? hb.getBoundingClientRect()
        : {
            bottom: 0,
          };
    return Math.max(0, Math.round(hr.bottom));
  }
  function build(dirs, full) {
    const sTop = headTop(),
      H = innerHeight - sTop;
    W = innerWidth;
    stage = document.createElement("div");
    stage.className = "cubestage";
    Object.assign(stage.style, {
      top: sTop + "px",
      height: H + "px",
      perspective: Math.round(W * 2.6) + "px",
      perspectiveOrigin: `50% ${H / 2}px`,
    });
    if (full) stage.style.visibility = "hidden";
    document.body.appendChild(stage);
    const c0 = sec(ui.view),
      top0 = c0.getBoundingClientRect().top + scrollY;
    cur = c0;
    const fc = face(c0, c0.getBoundingClientRect().top - sTop, !full);
    const out = {
      view: ui.view,
      key: freshKey(),
      sTop,
      W,
      stage,
      cur: fc,
      nb: {},
    };
    for (const d of dirs) {
      const k = neighbour(ui.view, d);
      if (!k || out.nb[k]) continue;
      const nb = sec(k);
      nb.hidden = false;
      try {
        if (FRESH[k] !== freshKey()) {
          try {
            RENDER[k]();
            FRESH[k] = freshKey();
          } catch (e) {}
        }
        /* Kachel-Schriftgrößen sofort anpassen – sonst passiert das erst nach dem Ankommen */
        try {
          fitTiles(nb);
        } catch (e) {}
        const maxY = Math.max(
            0,
            Math.round(document.documentElement.scrollHeight - c0.offsetHeight + nb.offsetHeight - innerHeight)
          ),
          y = Math.min(MEM[k] || 0, maxY);
        const fn = face(nb, top0 - sTop - y);
        if (full) fn[0].style.visibility = "hidden";
        out.nb[k] = {
          f: fn,
          nY: y,
        };
      } finally {
        nb.hidden = k !== ui.view;
      }
    }
    return out;
  }
  function prep() {
    prepT = 0;
    if (IS_PC || !ORDER.includes(ui.view)) return;
    /* Gerade offen oder in Bewegung: später nochmal versuchen, sonst baut erst das nächste Wischen
       die Seiten zusammen – und das ruckelt */
    if (on || busy || stage || document.querySelector(".backdrop:not([hidden])")) {
      prepT = setTimeout(prep, 800);
      return;
    }
    if (PREP) {
      PREP.stage.remove();
      PREP = null;
    }
    try {
      PREP = build([-1, 1], true);
    } catch (e) {
      console.warn("cube prep", e);
      if (stage) stage.remove();
      PREP = null;
    }
    stage = null;
    cur = null;
    dirty = false;
    mo.takeRecords();
  }
  function schedule() {
    dirty = true;
    if (PREP) {
      PREP.stage.remove();
      PREP = null;
    }
    clearTimeout(prepT);
    prepT = setTimeout(() => {
      (window.requestIdleCallback || setTimeout)(prep, {
        timeout: 1500,
      });
    }, 500);
  }
  const mo = new MutationObserver((list) => {
    if (on || busy) return;
    if (list.some((m) => !m.target.closest || !m.target.closest(".cubestage"))) schedule();
  });
  if (main)
    mo.observe(main, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden"],
    });
  addEventListener("resize", schedule);
  schedule();
  function setup(d) {
    dir = d;
    nbKey = neighbour(ui.view, d);
    W = innerWidth;
    const ok =
      PREP &&
      !dirty &&
      PREP.view === ui.view &&
      PREP.key === freshKey() &&
      PREP.sTop === headTop() &&
      PREP.W === W &&
      PREP.nb[nbKey];
    if (ok) {
      stage = PREP.stage;
      cur = sec(ui.view);
      [fC, shC] = PREP.cur;
      fC.firstChild.style.top = cur.getBoundingClientRect().top - PREP.sTop + "px";
      for (const [k, v] of Object.entries(PREP.nb)) v.f[0].style.visibility = k === nbKey ? "" : "hidden";
      [fN, shN] = PREP.nb[nbKey].f;
      nY = PREP.nb[nbKey].nY;
      stage.style.visibility = "";
    } else {
      if (PREP) {
        PREP.stage.remove();
        PREP = null;
      }
      const b = build([d], false);
      mo.takeRecords();
      [fC, shC] = b.cur;
      [fN, shN] = b.nb[nbKey].f;
      nY = b.nb[nbKey].nY;
    }
    PREP = null;
    cur.style.opacity = "0";
    sY = scrollY;
    if (nbKey) navFlow.start(ui.view, nbKey);
    draw();
  }
  function draw() {
    const a = Math.min(1, Math.abs(p));
    if (!nbKey) {
      fC.style.transform = `translateX(${p * W * 0.25}px)`;
      return;
    }
    const s = dir < 0 ? -1 : 1,
      h = W / 2,
      th = s * a * 90;
    fC.style.transform = `translateZ(${-h}px) rotateY(${th}deg) translateZ(${h}px)`;
    shC.style.opacity = String(a * 0.6);
    fN.style.transform = `translateZ(${-h}px) rotateY(${th - s * 90}deg) translateZ(${h}px)`;
    shN.style.opacity = String((1 - a) * 0.6);
    /* Ganz am Anfang zeigt die Nachbarseite nur ihre Kante – ausblenden statt backface-visibility, das auf
       Android-WebViews alte Würfelbilder auf dem Bildschirm stehen ließ */
    fN.style.visibility = !busy && a < 0.03 ? "hidden" : "";
    if (!busy) {
      waveAll(a);
      navFlow.move(a);
    }
  }
  function reset() {
    if (!busy) navFlow.stop();
    if (stage) {
      /* erst unsichtbar machen, dann entfernen – sonst bleibt auf manchen Android-Geräten das letzte Bild stehen */
      stage.style.display = "none";
      void stage.offsetHeight;
      stage.remove();
    }
    if (cur) {
      cur.style.opacity = "";
      if (Math.abs(scrollY - sY) > 1)
        window.scrollTo({
          top: sY,
        });
    }
    stage = fC = fN = shC = shN = cur = nbKey = null;
    p = 0;
    dir = 0;
    schedule();
  }
  function settle(go) {
    busy = true;
    [fC, fN].filter(Boolean).forEach((el) => (el.style.transition = "transform .3s cubic-bezier(.2,.8,.2,1)"));
    [shC, shN].filter(Boolean).forEach((el) => (el.style.transition = "opacity .3s"));
    const target = go && nbKey;
    p = target ? (dir < 0 ? -1 : 1) : 0;
    draw();
    /* Der Würfel dreht per CSS zu Ende – die Welle liest den Winkel bei jedem Bild mit */
    const f0 = fC,
      t0w = performance.now();
    if (nbKey)
      (function follow() {
        if (fC !== f0) return;
        const m = new DOMMatrix(getComputedStyle(f0).transform);
        waveAll(Math.acos(Math.max(-1, Math.min(1, m.m11))) / (Math.PI / 2));
        if (performance.now() - t0w < 340) requestAnimationFrame(follow);
      })();
    /* Titel und Leiste schon jetzt mitnehmen – nicht erst, wenn der Würfel steht */
    if (target)
      try {
        $("viewTitle").textContent = nbKey === "beruf" ? berufLbl() : TITLES[nbKey];
        document
          .querySelectorAll(".tab[data-go]")
          .forEach((b) => b.setAttribute("aria-selected", String(b.dataset.go === nbKey)));
        navPill(true);
      } catch (_) {}
    navFlow.finish(!!target);
    setTimeout(() => {
      const k = nbKey;
      if (target) {
        MEM[ui.view] = sY;
        ui.view = k;
        if (window.ANIM) ANIM.skip = true;
        UX.quiet = true;
        render.keep = true;
        render();
        sY = nY;
        window.scrollTo({
          top: nY,
        });
      }
      requestAnimationFrame(() => {
        reset();
        busy = false;
      });
    }, 310);
  }
  window.hbCubeGo = (d) => {
    if (
      busy ||
      on ||
      stage ||
      !ORDER.includes(ui.view) ||
      (ui.view === "more" && ui.sp && !spsOpen()) ||
      document.querySelector(".backdrop:not([hidden])")
    )
      return false;
    try {
      setup(d > 0 ? -1 : 1);
    } catch (e) {
      reset();
      return false;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => settle(true)));
    return true;
  };
  document.addEventListener(
    "touchstart",
    (e) => {
      on = false;
      if (
        IS_PC ||
        busy ||
        e.touches.length !== 1 ||
        !ORDER.includes(ui.view) ||
        (ui.view === "more" && ui.sp && !spsOpen()) ||
        blocked(e.target)
      )
        return;
      const x = e.touches[0].clientX;
      if (x < 18 || x > innerWidth - 18) return;
      x0 = x;
      trail = [[e.timeStamp, x]];
      y0 = e.touches[0].clientY;
      t0 = Date.now();
      lock = null;
      on = true;
    },
    {
      passive: true,
    }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (!on) return;
      if (e.touches.length !== 1) {
        if (lock === "x" && cur) settle(false);
        on = false;
        return;
      }
      const cx = e.touches[0].clientX,
        dx = cx - x0,
        dy = e.touches[0].clientY - y0;
      trail.push([e.timeStamp, cx]);
      if (trail.length > 10) trail.shift();
      if (lock === null) {
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
        lock = Math.abs(dx) > Math.abs(dy) * 1.3 && window.scrollX === 0 ? "x" : "y";
        if (lock === "x") {
          /* nur die Totzone abziehen – war das Ereignis verzögert, ist der Finger schon weit gewandert */
          x0 += Math.sign(dx) * 14;
          [tL, xL] = trail[0];
          setup(dx < 0 ? -1 : 1);
        }
      }
      if (lock !== "x") return;
      if (e.cancelable) e.preventDefault();
      const ddx = cx - x0;
      if (ddx !== 0 && (ddx < 0 ? -1 : 1) !== dir) {
        reset();
        setup(ddx < 0 ? -1 : 1);
      }
      p = Math.max(-1, Math.min(1, (ddx / W) * (nbKey ? 1 : 0.5)));
      if (!draw.q) {
        draw.q = requestAnimationFrame(() => {
          draw.q = 0;
          if (fC) draw();
        });
      }
    },
    {
      passive: false,
    }
  );
  const end = (e) => {
    if (!on) return;
    on = false;
    if (lock !== "x" || !cur) return;
    /* Auf langsamen Geräten gehen Zwischen-Bewegungen verloren – die Stelle, an der der Finger loslässt, zählt mit */
    const ct = e && e.type === "touchend" && e.changedTouches && e.changedTouches[0];
    if (ct) {
      const cx = ct.clientX,
        ddx = cx - x0;
      trail.push([e.timeStamp, cx]);
      if (ddx !== 0 && (ddx < 0 ? -1 : 1) === dir) {
        const np = Math.max(-1, Math.min(1, (ddx / W) * (nbKey ? 1 : 0.5)));
        if (Math.abs(np) > Math.abs(p)) p = np;
      }
    }
    /* Schwung: Tempo der letzten ~80 ms und Durchschnitt seit Beginn des Wischens (px/ms) */
    const [tE, xE] = trail[trail.length - 1],
      old = trail.find((s) => tE - s[0] <= 80) || trail[0],
      recent = tE > old[0] ? (xE - old[1]) / (tE - old[0]) : 0,
      avg = tE > tL ? (xE - xL) / (tE - tL) : 0,
      fast = (v) => Math.abs(v) > 0.45 && (v < 0 ? -1 : 1) === dir;
    const fling = Math.abs(p) > 0.12 && (fast(recent) || (fast(avg) && Math.abs(avg) > 0.5));
    settle(Math.abs(p) > 0.35 || fling);
  };
  document.addEventListener("touchend", end);
  document.addEventListener("touchcancel", end);
})();

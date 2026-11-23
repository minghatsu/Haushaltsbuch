/* Tutorial */
function tourSteps() {
  const w = store.settings.work,
    g = workGroup(w);
  const inc =
    g === "job"
      ? "Wiederkehrende Einnahmen wie dein Gehalt rechnet die App gleich mit ein."
      : g === "edu"
        ? "Ausbildungsgeld, BAföG oder Taschengeld rechnet die App gleich mit ein."
        : g === "staat"
          ? "Dein Geld vom Amt rechnet die App ab dem Zahltag gleich mit ein."
          : g === "rente"
            ? "Deine Rente rechnet die App ab dem Zahltag gleich mit ein."
            : "Wiederkehrende Einnahmen rechnet die App gleich mit ein.";
  const fix =
    g === "staat"
      ? "Auch Termine beim Amt stehen hier – z. B. die Weiterbewilligung."
      : g === "edu"
        ? "Auch Termine wie Prüfungen oder Anträge stehen hier."
        : g === "rente"
          ? "Auch dein Rentenzahltag und Termine stehen hier."
          : "Auch Termine wie Steuererklärung oder Vertragsende stehen hier.";
  const ana =
    w === "selbst" || w === "beides" || hasExtra("selbst")
      ? "Wohin dein Geld geht – mit Steuer-Rücklage und Umsatzsteuer für deine Selbstständigkeit."
      : g === "job"
        ? "Wohin dein Geld geht – mit Schätzung, was dir vom Finanzamt zurückkommt."
        : "Wohin dein Geld geht – Monat für Monat und aufs Jahr gesehen.";
  const set =
    g === "job"
      ? "Unter „Steuer & Einkommen“ stellst du Gehalt und Steuerklasse ein."
      : GPROF[w]
        ? "Dein Bereich für Betrag, Zahltag und Termine ist hier – passend zu deiner Auswahl."
        : "Hier stellst du alles ein, was zu dir passt.";
  const st = [
    {
      sel: "#astack,.pchero",
      ic: "cash",
      t: "Dein Kontostand",
      p: [
        IS_PC
          ? "Was heute auf deinen Konten ist – darunter Hauptkonto und Spaces einzeln."
          : "Was heute auf dem Konto ist. Wischen zeigt deine Spaces, Antippen trägt den echten Stand ein.",
        inc,
      ],
    },
    {
      sel: "[data-mvopen]",
      raw: 1,
      ic: "repeat",
      t: uiText("mv_sheet"),
      p: [uiText("trh_mv")],
    },
    {
      sel: "#pcHero .pcaccs:has(.mvd)",
      raw: 1,
      ic: "repeat",
      t: uiText("mv_sheet"),
      p: [uiText("trh_mvpc")],
    },
    {
      sel: ".hkpi,.pcring,.hsay",
      ic: "cal",
      t: "Noch pro Tag",
      p: [
        "So viel kannst du bis Monatsende jeden Tag ausgeben – dein Hauptkonto minus offene Fixkosten und Steuer-Rücklage, geteilt durch die restlichen Tage.",
      ],
    },
    {
      sel: "#monthpill",
      ic: "cal",
      t: "Monat wechseln",
      p: ["Mit den Pfeilen blätterst du durch die Monate – alle Seiten zeigen dann diesen Monat."],
    },
    {
      sel: '[data-hb="debts"]',
      ic: "bank",
      t: "Kredite & Schulden",
      p: ["Was noch offen ist und wann du schuldenfrei bist. Raten aus den Fixkosten werden automatisch abgezogen."],
    },
    {
      sel: ".tabs .tab.plus",
      ic: "receipt",
      t: "Eintragen",
      p: ["Tippe auf Plus für eine Ausgabe oder Einnahme."],
    },
    {
      sel: ".tabs .tab.plus",
      ic: "camera",
      t: "Kassenbon & Kontoauszug",
      p: [
        "Im Plus-Menü kannst du einen Kassenbon fotografieren oder deinen Kontoauszug (CSV) importieren – die App sortiert alles ein.",
        ...(canShare() ? [uiText("trh_fanqr")] : []),
      ],
    },
    {
      sel: ".areacard",
      ic: "list",
      t: "Alles im Haushalt",
      p: ["Fixkosten, Buchungen, Auswertung, Budgets und Abos findest du hier als Kacheln.", fix],
    },
    {
      sel: '.tabs .tab[data-go="beruf"]',
      ic: "insight",
      t: "Beruf & Steuer",
      p: ["Gehalt, Selbstständigkeit, Steuer und alles rund um deine Arbeit – passend zu deinem Profil."],
    },
    {
      sel: '.tabs .tab[data-go="zukunft"]',
      ic: "insight",
      t: "Sparen & Schulden",
      p: ["Deine Sparziele, Anlegen und was du noch abzahlen musst."],
    },
    {
      sel: '.tabs .tab[data-go="shop"]',
      ic: "cart",
      t: "Einkaufen",
      p: ["Deine Einkaufsliste mit Läden und Preisen – auch zum Teilen mit anderen."],
    },
    {
      sel: ".tabs .tab.plus,.pcfab,[data-addmenu]",
      raw: 1,
      ic: "repeat",
      t: uiText("trh_pot_t"),
      p: [uiText("trh_pot_p")],
    },
    {
      sel: ".tabs .tab.plus,.pcfab,[data-addmenu]",
      raw: 1,
      ic: "docout",
      t: uiText("trh_in_t"),
      p: [uiText(IS_PC ? "trh_in_p_pc" : "trh_in_p")],
    },
    {
      sel: "#ptourQ",
      raw: 1,
      ic: "bell",
      t: uiText("trh_bell_t"),
      p: [uiText("trh_bell_p")],
    },
    {
      sel: "#ptourQ",
      raw: 1,
      ic: "insight",
      t: uiText("trh_help_t"),
      p: [uiText("trh_help_p")],
    },
    {
      sel: "#fbQuick",
      ic: "insight",
      t: "Fehler gefunden? Hier tippen!",
      p: [
        "Mit diesem Knopf schickst du mir jederzeit Fehler, Ideen oder Fragen – von jeder Seite aus.",
        uiText("trh_fbrec"),
      ],
    },
    {
      sel: "#topAv",
      ic: "sliders",
      t: "Ich & Einstellungen",
      p: [
        "Tippe auf dein Profilbild – dort findest du alle Einstellungen. In jedem Bereich gibt es außerdem eigene Einstellungen.",
        "Diese Tour findest du hier jederzeit wieder unter Hilfe.",
      ],
    },
  ];
  return st.filter((x) => [...document.querySelectorAll(x.sel)].some(tourVis));
}
const TOUR = {
  i: -1,
  steps: [],
};
function tourOpen() {
  TOUR.page = null;
  if (ui.view !== "home") {
    ui.view = "home";
    render();
  }
  if (typeof spSheetClose === "function")
    try {
      spSheetClose();
    } catch (e) {}
  try {
    mamiClose();
  } catch (_) {}
  TOUR.steps = tourSteps();
  const nm = String(store.settings.name || "")
    .trim()
    .split(/\s+/)[0];
  TOUR.steps.unshift({
    sel: "#ptourQ",
    raw: 1,
    t: mFill(nm ? mamiText("tr_hi").replace("{n}", nm) : mamiText("tr_hi0")),
    p: [mamiText("tr_hi2").replace("{n}", TOUR.steps.length + 1)],
  });
  TOUR.steps.push({
    sel: "#ptourQ",
    raw: 1,
    t: mamiText("tr_end_t"),
    p: [mFill(mamiText("tr_end_p"))],
  });
  TOUR.i = -1;
  tourGo(0);
}
function tourCloseNow() {
  try {
    mHeadIn();
  } catch (_) {}
  const el = $("tourBg");
  el.hidden = true;
  el.innerHTML = "";
  TOUR.i = -1;
  TOUR_MAMI.x = null;
  TOUR_MAMI.anim = null;
  if (TOUR.page === "mami" || TOUR.page === "neu") {
    TOUR.page = null;
    document.body.classList.remove("locked");
    return;
  }
  if (TOUR.page === "danke") {
    TOUR.page = null;
    document.body.classList.remove("locked");
    if (DANKE.preview) {
      DANKE.preview = false;
      fbQuickBtn();
    }
    if (wizShould())
      setTimeout(() => {
        if (wizShould()) wizOpen();
      }, 400);
    return;
  }
  if (TOUR.page) {
    TOUR.page = null;
    toast(mamiText("again"), null, null, 3500);
  }
  document.body.classList.remove("locked");
}
function tourClose() {
  if (TOUR_MAMI.closing) return;
  const el = $("tourBg");
  if (!el || el.hidden || !el.querySelector(".tmami")) {
    tourCloseNow();
    return;
  }
  TOUR_MAMI.closing = 1;
  TOUR_MAMI.tok++;
  tmHome().then(() => {
    TOUR_MAMI.closing = 0;
    tourCloseNow();
  });
}
function tourVis(n) {
  return n.offsetParent !== null || (n.getClientRects().length > 0 && getComputedStyle(n).visibility !== "hidden");
}
/* Mami fliegt mit */
const TOUR_MAMI = {
  x: null,
  y: null,
  anim: null,
  tok: 0,
  M: 58,
};
const tmReduce = () => motionOff();
function tmEls() {
  const el = $("tourBg");
  if (!el.querySelector(".tmami")) {
    el.innerHTML = `<div class="tring"></div><div class="tbub tmb" role="dialog" aria-live="polite"></div><div class="tmami" aria-hidden="true"><span class="tmbob">${mamiAvatar(null)}</span></div>`;
    TOUR_MAMI.x = null;
    TOUR_MAMI.anim = null;
  }
  return {
    el,
    ring: el.querySelector(".tring"),
    bub: el.querySelector(".tbub"),
    mami: el.querySelector(".tmami"),
  };
}
function tmTarget(s) {
  return s ? [...document.querySelectorAll(s.sel)].find((n) => tourVis(n) && !n.closest(".cubestage")) : null;
}
function tmFixed(t) {
  for (let n = t; n && n !== document.body; n = n.parentElement) {
    const p = getComputedStyle(n).position;
    if (p === "fixed" || p === "sticky") return true;
  }
  return false;
}
function tourGo(i) {
  const el = $("tourBg");
  if (i >= TOUR.steps.length) {
    tourClose();
    return;
  }
  const tv =
    TOUR.steps[i].view ||
    (TOUR.page === "danke" || TOUR.page === "mami" || TOUR.page === "neu" ? ui.view : TOUR.page || "home");
  if (ui.view !== tv) {
    ui.view = tv;
    render();
  }
  const first = TOUR.i < 0 || !el.querySelector(".tmami");
  TOUR.i = i;
  const s = TOUR.steps[i],
    n = TOUR.steps.length;
  el.className = "tourbg spot mt";
  el.hidden = false;
  document.body.classList.add("locked");
  const { ring, bub, mami } = tmEls();
  const tok = ++TOUR_MAMI.tok;
  const T = (x) => (s.raw ? `<span data-noi18n>${escHtml(x)}</span>` : escHtml(x));
  const lab =
    TOUR.page === "danke"
      ? "Feedback"
      : TOUR.page === "mami"
        ? ""
        : TOUR.page === "neu"
          ? `<span data-noi18n>${escHtml(uiText("nw_lab"))}</span> · <span data-noi18n dir="ltr">${i + 1} / ${n}</span>`
          : `${TOUR.page && PTOUR[TOUR.page] ? "<span>" + escHtml(PTOUR[TOUR.page].t) + "</span> · " : ""}<span data-noi18n dir="ltr">${i + 1} / ${n}</span>`;
  bub.classList.remove("on", "typing");
  const fill = () => {
    bub.innerHTML = `<div class="tmhd"><span data-noi18n>${escHtml(mamiText("name"))}</span>${lab ? `<small>${lab}</small>` : ""}</div><b class="tmt">${T(s.t)}</b>
    <div class="tin">${s.p.map((x) => `<p>${T(x)}</p>`).join("")}${s.demo || ""}<div class="trow"><button class="tskip" data-tour="close">${TOUR.page ? "Überspringen" : "Beenden"}</button>
    <span class="tnav">${i > 0 ? `<button class="tback" data-tour="back" aria-label="Zurück">‹</button>` : ""}<button class="tnext" data-tour="next">${i === n - 1 ? "Fertig" : "Weiter"}</button></span></div></div>`;
  };
  const t = tmTarget(s);
  let dy = 0;
  if (t && !tmFixed(t) && !t.closest(".tabs,.pchero,.top")) {
    const r = t.getBoundingClientRect(),
      nav = document.querySelector(".tabs"),
      nb = nav ? nav.getBoundingClientRect().height : 0;
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight),
      want =
        scrollY +
        r.top -
        Math.max(IS_PC ? (innerWidth <= 1420 ? 190 : 112) : 80, (innerHeight - nb - r.height) / 2 - 90);
    const ns = Math.round(Math.max(0, Math.min(max, want)));
    dy = ns - scrollY;
    if (Math.abs(dy) > 2)
      window.scrollTo({
        top: ns,
        behavior: tmReduce() ? "auto" : "smooth",
      });
    else dy = 0;
  }
  const go = () => {
    if (tok !== TOUR_MAMI.tok) return;
    if (dy) {
      dy = 0;
      tmSettle().then(go);
      return;
    }
    fill();
    const L = tmLayout(t, 0, bub);
    tmRing(ring, L.ring, first);
    const fly = first && TOUR_MAMI.x == null ? tmStart(mami, L.m) : tmFly(mami, L.m.x, L.m.y);
    fly.then(() => {
      if (tok !== TOUR_MAMI.tok) return;
      tmBub(bub, L);
    });
  };
  setTimeout(go, first ? 60 : 150);
}
function tmSettle() {
  return new Promise((res) => {
    let last = scrollY,
      same = 0,
      n = 0;
    const f = () => {
      n++;
      if (Math.abs(scrollY - last) < 0.5) same++;
      else same = 0;
      last = scrollY;
      if (same >= 3 || n > 60) res();
      else requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}
function tmLayout(t, dy, bub) {
  const W = innerWidth,
    H = innerHeight,
    M = TOUR_MAMI.M,
    gap = 10,
    pad = 8,
    sb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sab")) || 0;
  const bw = Math.min(W >= 700 ? 340 : 320, W - 32 - M - gap);
  bub.style.width = bw + "px";
  const bh = bub.offsetHeight;
  if (!t) {
    const gx = (W - (M + gap + bw)) / 2,
      gy = Math.max(16, (H - bh) / 2);
    return {
      ring: null,
      m: {
        x: gx,
        y: gy + bh / 2 - M / 2,
      },
      b: {
        x: gx + M + gap,
        y: gy,
        side: "l",
        ty: bh / 2,
      },
    };
  }
  const R = t.getBoundingClientRect(),
    r = {
      left: R.left,
      top: R.top - dy,
      width: R.width,
      height: R.height,
      right: R.right,
      bottom: R.bottom - dy,
    };
  const small = r.width < 90 && r.height < 90,
    rad = small ? Math.max(r.width, r.height) / 2 + pad : Math.min(24, r.height / 2 + pad);
  const ring = {
    x: r.left - pad,
    y: r.top - pad,
    w: r.width + pad * 2,
    h: r.height + pad * 2,
    r: rad,
  };
  const cx = r.left + r.width / 2,
    gw = M + gap + bw,
    gh = Math.max(M, bh);
  if (W >= 1000 && r.width < 140 && r.left < 220) {
    const gx = r.right + pad + 18,
      gy = Math.max(16, Math.min(H - 16 - gh, r.top + r.height / 2 - M / 2 - 8));
    return {
      ring,
      m: {
        x: gx,
        y: gy,
      },
      b: {
        x: gx + M + gap,
        y: gy,
        side: "l",
        ty: M / 2,
      },
    };
  }
  if (W >= 700 && r.height > H * 0.45) {
    const right = W - r.right,
      left = r.left;
    if (Math.max(right, left) >= gw + 40) {
      const onR = right >= left,
        gy = Math.max(16, Math.min(H - 16 - gh, r.top + Math.min(r.height / 2, 160) - M / 2));
      if (onR) {
        const gx = r.right + pad + 18;
        return {
          ring,
          m: {
            x: gx,
            y: gy,
          },
          b: {
            x: gx + M + gap,
            y: gy,
            side: "l",
            ty: M / 2,
          },
        };
      }
      const gx = r.left - pad - 18 - gw;
      return {
        ring,
        m: {
          x: gx + bw + gap,
          y: gy,
        },
        b: {
          x: gx,
          y: gy,
          side: "r",
          ty: M / 2,
        },
      };
    }
  }
  const side = cx > W / 2 ? "r" : "l";
  let gx = side === "l" ? cx - M / 2 : cx - gw + M / 2;
  gx = Math.max(16, Math.min(W - 16 - gw, gx));
  const below = r.top + r.height / 2 < H / 2;
  let my, by;
  if (below) {
    my = r.bottom + pad + 10;
    by = my + 6;
    if (by + bh > H - 16) {
      by = Math.max(16, H - 16 - bh);
      my = Math.min(my, by);
    }
  } else {
    my = r.top - pad - 10 - M;
    by = my + M - 6 - bh;
    if (by < 16) {
      by = 16;
    }
    if (my < 16) my = 16;
  }
  if (r.height > H * 0.55) {
    by = H - 24 - bh - sb - (document.querySelector(".tabs") ? 80 : 0);
    my = by + bh - M;
  }
  const mx = side === "l" ? gx : gx + bw + gap,
    bx = side === "l" ? gx + M + gap : gx;
  return {
    ring,
    m: {
      x: mx,
      y: my,
    },
    b: {
      x: bx,
      y: by,
      side,
      ty: Math.max(18, Math.min(bh - 18, my + M / 2 - by)),
    },
  };
}
function tmRing(ring, g, first) {
  ring.classList.toggle("none", !g);
  if (!g)
    g = {
      x: innerWidth / 2,
      y: innerHeight / 2,
      w: 0,
      h: 0,
      r: 0,
    };
  if (first) ring.style.transition = "none";
  Object.assign(ring.style, {
    transform: `translate3d(${g.x}px,${g.y}px,0)`,
    width: g.w + "px",
    height: g.h + "px",
    borderRadius: g.r + "px",
  });
  if (first) {
    ring.animate(
      [
        {
          opacity: 0,
        },
        {
          opacity: 1,
        },
      ],
      {
        duration: 350,
      }
    );
    requestAnimationFrame(() => requestAnimationFrame(() => (ring.style.transition = "")));
  }
}
function tmPos(m) {
  return `translate3d(${m.x}px,${m.y}px,0)`;
}
function mHeadOut(q) {
  q = q || $("ptourQ");
  if (!q || q._mout) return;
  try {
    const L = JSON.parse(localStorage.getItem("hb-mdiag") || "[]");
    L.push(
      new Date().toTimeString().slice(0, 8) +
        " " +
        String(new Error().stack || "")
          .split("\n")
          .slice(2, 5)
          .map((x) =>
            x
              .trim()
              .replace(/^at /, "")
              .replace(/\(.*?:(\d+):\d+\)/, "@$1")
          )
          .join(" < ")
    );
    localStorage.setItem("hb-mdiag", JSON.stringify(L.slice(-15)));
  } catch (_) {}
  q._mout = 1;
  if (reducedMotion()) {
    q.style.visibility = "hidden";
    return;
  }
  q.getAnimations().forEach((a) => a.cancel());
  const an = q.animate(
    [
      {
        transform: "none",
        opacity: 1,
      },
      {
        transform: "scale(1.25)",
        opacity: 1,
        offset: 0.4,
      },
      {
        transform: "scale(.2)",
        opacity: 0,
      },
    ],
    {
      duration: 300,
      easing: "ease-in",
    }
  );
  q._outA = an;
  const fin = () => {
    if (q._mout) {
      q.style.visibility = "hidden";
    }
  };
  an.finished.then(fin).catch(() => {});
  setTimeout(fin, 320);
}
function mVis(el) {
  if (!el || !el.isConnected) return false;
  for (let x = el; x && x !== document.body; x = x.parentElement) {
    if (x.hidden) return false;
    const c = getComputedStyle(x);
    if (c.display === "none" || c.visibility === "hidden" || Number(c.opacity) < 0.05) return false;
  }
  const r = el.getBoundingClientRect();
  return r.width > 4 && r.height > 4 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
}
function mAway() {
  if (MO.keep) return true;
  const L = [...document.querySelectorAll("#tourBg .tmami, #mbBg .mbmami, #moBg #moMe")];
  const any = L.some(mVis);
  if (!any) {
    const mb = $("mbBg"),
      mo = $("moBg");
    if (mb && !mb.hidden && !mVis(mb.querySelector(".mbbub"))) {
      mb.hidden = true;
      MB.on = false;
    }
    if (mo && !mo.hidden) {
      mo.hidden = true;
      MO.on = false;
    }
    if (
      !document.querySelector(
        "#mbBg:not([hidden]),#moBg:not([hidden]),#tourBg:not([hidden]),.hobg:not([hidden]),.backdrop:not([hidden])"
      )
    )
      document.body.classList.remove("locked");
  }
  return any;
}
function mHeadFix() {
  try {
    const q = $("ptourQ");
    if (!q || !q.isConnected) return;
    if (Date.now() - (q._inT || 0) < 900) return;
    const cs = getComputedStyle(q),
      r = q.getBoundingClientRect(),
      gone =
        q._mout ||
        cs.visibility === "hidden" ||
        Number(cs.opacity) < 0.5 ||
        r.width < 20 ||
        r.height < 12 ||
        !mVis(q.querySelector(".mav") || q);
    if (!gone || mAway()) return;
    if (MB.on && !($("mbBg") && !$("mbBg").hidden)) MB.on = false;
    if (MO.on && !($("moBg") && !$("moBg").hidden)) MO.on = false;
    try {
      if (q._outA) {
        q._outA.cancel();
        q._outA = null;
      }
      q.getAnimations().forEach((x) => x.cancel());
    } catch (_) {}
    q.style.opacity = "";
    q.style.transform = "";
    q._mout = 1;
    mHeadIn(q);
  } catch (_) {}
}
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey && e.altKey && (e.key === "d" || e.key === "D"))) return;
  let d = $("mDiag");
  if (d) {
    d.remove();
    return;
  }
  d = document.createElement("pre");
  d.id = "mDiag";
  d.style.cssText =
    "position:fixed;left:12px;bottom:12px;z-index:99999;max-width:90vw;max-height:60vh;overflow:auto;background:#111;color:#7ff0c2;font:11px/1.4 monospace;padding:10px;border-radius:10px;white-space:pre-wrap";
  const q = $("ptourQ"),
    cs = q ? getComputedStyle(q) : {},
    rr = q ? q.getBoundingClientRect() : {},
    mv = q && q.querySelector(".mav"),
    mc = mv ? getComputedStyle(mv) : {};
  d.textContent = [
    "op=" +
      cs.opacity +
      " tf=" +
      cs.transform +
      " w=" +
      Math.round(rr.width) +
      " anims=" +
      (q
        ? q
            .getAnimations()
            .map((a) => a.playState + ":" + (a.animationName || a.id || "waapi"))
            .join(",")
        : "") +
      " mav=" +
      (mv
        ? mc.opacity +
          "/" +
          mc.visibility +
          "/" +
          mc.display +
          "/" +
          mv.tagName +
          "/" +
          mv
            .getAnimations()
            .map((a) => a.playState)
            .join(",")
        : "none") +
      " html=" +
      (q ? q.innerHTML.length : 0),
    "mout=" +
      (q && q._mout) +
      " vis=" +
      (q && q.style.visibility) +
      " MB.on=" +
      MB.on +
      " MO.on=" +
      MO.on +
      " MO.keep=" +
      MO.keep +
      " TOUR.i=" +
      TOUR.i +
      " away=" +
      mAway(),
    ...JSON.parse(localStorage.getItem("hb-mdiag") || "[]"),
  ].join("\n");
  document.body.appendChild(d);
});
setInterval(mHeadFix, 1200);
document.addEventListener("pointerup", () => setTimeout(mHeadFix, 900), true);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) setTimeout(mHeadFix, 300);
});
function mHeadIn(q) {
  q = q || $("ptourQ");
  if (!q || !q._mout) return;
  q._mout = 0;
  try {
    if (q._outA) {
      q._outA.cancel();
      q._outA = null;
    }
  } catch (_) {}
  q._inT = Date.now();
  q.style.opacity = "";
  q.style.transform = "";
  setTimeout(() => {
    try {
      if (!q._mout)
        q.getAnimations().forEach((x) => {
          try {
            x.finish();
          } catch (_) {
            x.cancel();
          }
        });
    } catch (_) {}
  }, 700);
  q.style.visibility = "";
  q.getAnimations().forEach((a) => a.cancel());
  if (!reducedMotion())
    q.animate(
      [
        {
          transform: "scale(.3)",
          opacity: 0,
        },
        {
          transform: "scale(1.25)",
          opacity: 1,
          offset: 0.6,
        },
        {
          transform: "none",
        },
      ],
      {
        duration: 480,
        easing: "cubic-bezier(.3,1.6,.5,1)",
      }
    );
}
function tmStart(mami, to) {
  const q = $("ptourQ"),
    FR = TOUR_MAMI.fromRect;
  TOUR_MAMI.fromRect = null;
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
  const qr = FR || (q && (q._mout || tourVis(q)) ? q.getBoundingClientRect() : null),
    M = TOUR_MAMI.M;
  TOUR_MAMI.x = to.x;
  TOUR_MAMI.y = to.y;
  mami.style.transform = tmPos(to);
  if (!qr || tmReduce()) {
    return mami
      .animate(
        [
          {
            transform: tmPos(to) + " scale(.2)",
            opacity: 0,
          },
          {
            transform: tmPos(to) + " scale(1)",
            opacity: 1,
          },
        ],
        {
          duration: tmReduce() ? 1 : 420,
          easing: "cubic-bezier(.3,1.5,.5,1)",
        }
      )
      .finished.catch(() => {});
  }
  const from = {
    x: qr.left + qr.width / 2 - M / 2,
    y: qr.top + qr.height / 2 - M / 2,
  };
  TOUR_MAMI.x = from.x;
  TOUR_MAMI.y = from.y;
  mHeadOut(q);
  const s0 = FR ? Math.max(0.4, Math.min(2.2, FR.height / M)) : 0.6;
  mami.style.transform = tmPos(from) + ` scale(${s0})`;
  mami.animate(
    [
      {
        opacity: FR ? 1 : 0,
        transform: tmPos(from) + ` scale(${s0})`,
      },
      {
        opacity: 1,
        transform: tmPos(from) + ` scale(${s0})`,
      },
    ],
    {
      duration: FR ? 1 : 160,
    }
  );
  return new Promise((res) => setTimeout(() => tmFly(mami, to.x, to.y, s0).then(res), FR ? 20 : 160));
}
function tmFly(mami, x, y, s0) {
  const M = TOUR_MAMI.M;
  let x0 = TOUR_MAMI.x,
    y0 = TOUR_MAMI.y,
    sc0 = s0 || 1;
  if (TOUR_MAMI.anim) {
    try {
      const m = new DOMMatrixReadOnly(getComputedStyle(mami).transform);
      x0 = m.m41;
      y0 = m.m42;
      sc0 = Math.hypot(m.a, m.b) || 1;
    } catch (_) {}
    TOUR_MAMI.anim.cancel();
    TOUR_MAMI.anim = null;
  }
  TOUR_MAMI.x = x;
  TOUR_MAMI.y = y;
  mami.style.transform = tmPos({
    x,
    y,
  });
  const dx = x - x0,
    dy = y - y0,
    d = Math.hypot(dx, dy);
  if (x0 == null || tmReduce() || d < 3) {
    return Promise.resolve();
  }
  const lift = Math.min(120, 26 + d * 0.22),
    cxp = (x0 + x) / 2,
    cyp = Math.min(y0, y) - lift,
    N = 28,
    dir = Math.sign(dx) || 1,
    K = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N,
      u = 1 - t,
      px = u * u * x0 + 2 * u * t * cxp + t * t * x,
      py = u * u * y0 + 2 * u * t * cyp + t * t * y,
      sn = Math.sin(Math.PI * t);
    const tilt = dir * 13 * sn * (Math.abs(dx) / Math.max(1, d));
    const sc = (sc0 + (1 - sc0) * t) * (1 + 0.1 * sn);
    K.push({
      offset: t,
      transform: `translate3d(${px.toFixed(2)}px,${py.toFixed(2)}px,0) rotate(${tilt.toFixed(2)}deg) scale(${sc.toFixed(3)})`,
    });
  }
  const dur = Math.round(Math.max(520, Math.min(860, 440 + d * 0.42)));
  const a = mami.animate(K, {
    duration: dur,
    easing: "cubic-bezier(.45,.05,.25,1)",
  });
  TOUR_MAMI.anim = a;
  return a.finished
    .then(() => {
      if (TOUR_MAMI.anim === a) TOUR_MAMI.anim = null;
      const v = mami.querySelector(".mav");
      if (v)
        v.animate(
          [
            {
              transform: "scale(1)",
            },
            {
              transform: "scale(1.1,.9)",
              offset: 0.3,
            },
            {
              transform: "scale(.96,1.05)",
              offset: 0.65,
            },
            {
              transform: "scale(1)",
            },
          ],
          {
            duration: 380,
            easing: "ease-out",
          }
        );
    })
    .catch(() => {});
}
function tmBub(bub, L, quiet) {
  const b = L.b;
  bub.classList.toggle("tl", b.side === "l");
  bub.classList.toggle("tr", b.side !== "l");
  bub.style.transform = `translate3d(${b.x}px,${b.y}px,0)`;
  bub.style.setProperty("--ty", b.ty + "px");
  bub.style.transformOrigin = "";
  if (quiet) return;
  bub.classList.add("typing");
  requestAnimationFrame(() => {
    bub.classList.add("on");
    setTimeout(() => bub.classList.remove("typing"), tmReduce() ? 0 : 320);
  });
  const nx = bub.querySelector(".tnext");
  if (nx && !IS_TOUCH_ONLY())
    setTimeout(() => {
      try {
        nx.focus({
          preventScroll: true,
        });
      } catch (_) {}
    }, 450);
}
function tmHome() {
  const el = $("tourBg"),
    mami = el && el.querySelector(".tmami"),
    bub = el && el.querySelector(".tbub"),
    ring = el && el.querySelector(".tring");
  if (!mami) return Promise.resolve();
  if (bub) bub.classList.remove("on");
  if (ring)
    ring.animate(
      [
        {
          opacity: 1,
        },
        {
          opacity: 0,
        },
      ],
      {
        duration: 400,
        fill: "forwards",
      }
    );
  el.classList.add("leaving");
  const q = $("ptourQ"),
    M = TOUR_MAMI.M;
  if (!q || !(q._mout || tourVis(q)) || tmReduce()) {
    return mami
      .animate(
        [
          {
            opacity: 1,
          },
          {
            opacity: 0,
          },
        ],
        {
          duration: 200,
          fill: "forwards",
        }
      )
      .finished.then(() => mHeadIn(q))
      .catch(() => mHeadIn(q));
  }
  const r = q.getBoundingClientRect();
  return tmFly(mami, r.left + r.width / 2 - M / 2, r.top + r.height / 2 - M / 2)
    .then(
      () =>
        mami.animate(
          [
            {
              transform: mami.style.transform + " scale(1)",
              opacity: 1,
            },
            {
              transform: mami.style.transform + " scale(.5)",
              opacity: 0,
            },
          ],
          {
            duration: 220,
            fill: "forwards",
          }
        ).finished
    )
    .then(() => mHeadIn(q))
    .catch(() => mHeadIn(q));
}
function tourPlace() {
  if (TOUR.i < 0) return;
  const el = $("tourBg"),
    s = TOUR.steps[TOUR.i];
  if (!el.querySelector(".tmami")) return;
  const { ring, bub, mami } = tmEls();
  const L = tmLayout(tmTarget(s), 0, bub);
  tmRing(ring, L.ring, false);
  if (TOUR_MAMI.anim) {
    TOUR_MAMI.anim.cancel();
    TOUR_MAMI.anim = null;
  }
  TOUR_MAMI.x = L.m.x;
  TOUR_MAMI.y = L.m.y;
  mami.style.transform = tmPos(L.m);
  if (bub.classList.contains("on")) tmBub(bub, L, 1);
}
/* kurze Tour für jede Seite */
const PTOUR_FN = () => ({
  home: {
    t: "Übersicht",
    s: [
      {
        sel: "#astack,.pcbal,.cashcard,.hkpi,.hsay",
        ic: "wallet",
        t: "Dein Geld auf einen Blick",
        p: [
          "Hier steht, was heute auf deinen Konten ist – mit Spaces zusammengerechnet.",
          IS_PC
            ? "Darunter siehst du, wie viel du bis Monatsende noch pro Tag ausgeben kannst."
            : "Wisch die Karte zur Seite, um einzelne Konten und Spaces zu sehen.",
          uiText("trh_acedit"),
        ],
      },
      {
        sel: "#v-home .hlcard",
        raw: 1,
        ic: "spark",
        t: uiText("trh_hl_t"),
        p: [uiText("trh_hl_p")],
      },
      {
        sel: "#v-home .fcmini,#v-home .hsay",
        raw: 1,
        ic: "chart",
        t: uiText("trh_fc_t"),
        p: IS_PC ? [uiText("trh_fc_p")] : [uiText("hs_tour"), uiText("trh_fc_p")],
      },
      {
        sel: "#v-home .areacard .agrid",
        raw: 1,
        ic: "home",
        t: uiText("trh_area_t"),
        p: [uiText("trh_area_p")],
      },
      {
        sel: '#v-home .atile[data-spopen="abos"]',
        raw: 1,
        ic: "repeat",
        t: uiText("trh_abo_t"),
        p: [uiText("trh_abo_p")],
      },
      {
        sel: "#monthpill,.pcmonth",
        ic: "cal",
        t: "Monat wechseln",
        p: [
          "Mit den Pfeilen blätterst du in frühere Monate.",
          "Alle Seiten zeigen dann diesen Monat – Buchungen, Fixkosten und Analyse.",
        ],
      },
      {
        sel: '#v-home .hblock[data-hb="budgets"]',
        ic: "target",
        t: "Budgets",
        p: [
          "Zeigt, wie viel von deinem Monatsbudget noch frei ist.",
          "Budgets legst du unter Einstellungen › Monatsbudgets fest.",
        ],
      },
      {
        sel: '#v-home .hblock[data-hb="fix"]',
        ic: "list",
        t: "Fixkosten",
        p: ["Was diesen Monat fest abgeht – Miete, Abos, Raten.", "Antippen führt zur Fixkosten-Seite zum Abhaken."],
      },
      {
        sel: '#v-home .hblock[data-hb="invest"]',
        ic: "piggy",
        t: "Sparen & Anlegen",
        p: [
          "Zinseszins-Rechner, Vergleich und deine Anlage-Ziele.",
          "Oben in der Kachel umschalten, „Öffnen“ für alle Einstellungen.",
        ],
      },
      {
        sel: IS_PC ? "#v-home .pctl,#pcDock" : '[data-scroll="homeEd"]',
        ic: "sliders",
        t: "Startseite anpassen",
        raw: IS_PC ? 1 : 0,
        p: IS_PC ? [uiText("trh_dock_p")] : ["Hier blendest du Kacheln ein oder aus und sortierst sie, wie du willst."],
      },
      {
        sel: ".tabs .tab.plus,.pcfab,[data-addmenu]",
        ic: "plus",
        t: "Neu eintragen",
        p: [
          "Das Plus öffnet: von Hand eintragen, Beleg fotografieren (Quittung, Rechnung oder Kontoauszug) oder Kontoauszug importieren.",
        ],
      },
      {
        sel: ".tabs .tab.plus,.pcfab,[data-addmenu]",
        raw: 1,
        ic: "repeat",
        t: uiText("trh_pot_t"),
        p: [uiText("trh_pot_p")],
      },
      {
        sel: ".tabs .tab.plus,.pcfab,[data-addmenu]",
        raw: 1,
        ic: "docout",
        t: uiText("trh_in_t"),
        p: [uiText(IS_PC ? "trh_in_p_pc" : "trh_in_p")],
      },
      {
        sel: "#ptourQ",
        raw: 1,
        ic: "bell",
        t: uiText("trh_bell_t"),
        p: [uiText("trh_bell_p")],
      },
      {
        sel: "#ptourQ",
        raw: 1,
        ic: "insight",
        t: uiText("trh_help_t"),
        p: [uiText("trh_help_p")],
      },
    ],
  },
  list: {
    t: "Buchungen",
    s: [
      {
        sel: "#v-list .search",
        ic: "insight",
        t: "Suchen",
        p: [
          "Tipp einen Laden, einen Betrag oder ein Wort aus dem Verwendungszweck.",
          "Die Liste filtert sofort beim Tippen.",
        ],
      },
      {
        sel: "#lseg",
        ic: "cal",
        t: "Liste oder Kalender",
        p: [
          "Im Kalender siehst du, an welchen Tagen viel ausgegeben wurde – je dunkler, desto mehr.",
          "Einen Tag antippen zeigt nur dessen Buchungen.",
        ],
      },
      {
        sel: "#filters",
        ic: "tag",
        t: "Filter",
        p: [
          "Nur Ausgaben, Einnahmen, Betriebliches oder Steuer anzeigen.",
          "„Belege“ zeigt Buchungen mit Foto – oder die, bei denen eins fehlt.",
        ],
      },
      {
        sel: "#listCard",
        ic: "receipt",
        t: "Buchung öffnen",
        p: [
          IS_PC
            ? "Klick öffnet die Buchung rechts daneben – mit Beleg, Kassenzettel, Kopieren und Löschen."
            : "Eine Buchung antippen zum Ändern oder Löschen.",
          "Bei Einkäufen mit Kassenbon steht dort auch der Kassenzettel mit allen Artikeln.",
        ],
      },
      {
        sel: "#listCard",
        ic: "repeat",
        t: "Nichts doppelt",
        p: [
          "Trägst du etwas selbst ein und es kommt später aus dem Kontoauszug, führe ich beides automatisch zusammen – dein Text und dein Beleg bleiben.",
          "Bin ich mir nicht sicher, frage ich oben in der Liste nach.",
        ],
      },
      {
        sel: "#pcDet",
        ic: "camera",
        t: "Details & Beleg",
        p: ["Hier erscheint die gewählte Buchung groß – mit Belegfoto, das du ersetzen oder hinzufügen kannst."],
      },
    ],
  },
  fix: {
    t: "Fixkosten",
    s: [
      {
        sel: ".pcfsum,.fsum",
        ic: "list",
        t: "Fest verplant",
        p: [
          "Was diesen Monat sicher abgeht und wie viel davon schon bezahlt ist.",
          "Nur Abgehaktes zählt in deinen Zahlen – so ist nichts doppelt.",
        ],
      },
      {
        sel: ".pcfcalc,.fgroup",
        ic: "check",
        t: "Abhaken",
        p: [
          IS_PC
            ? "Posten anklicken = bezahlt. Am Rand ziehen = anderer Tag. Das + in einem Tag legt dort einen neuen Posten an."
            : "Kachel antippen = bezahlt. Betrag antippen = nur für diesen Monat ändern.",
          "Beim Kontoauszug-Import hakt die App passende Posten selbst ab.",
        ],
      },
      {
        sel: ".pcfgr,.fgroup:nth-of-type(2)",
        ic: "tag",
        t: "Gruppen",
        p: [
          "Wohnen, Auto, Abos, Sparen … – die App sortiert deine Posten automatisch ein und zeigt, wie viel je Gruppe abgeht.",
        ],
      },
      {
        sel: "#payAll",
        ic: "check",
        t: "Alle abhaken",
        p: ["Wenn alles bezahlt ist: ein Klick hakt den ganzen Monat ab."],
      },
      {
        sel: ".fxacc,.pcfleg",
        ic: "bank",
        t: "Wo wird abgebucht?",
        p: [
          IS_PC
            ? "Oben im Kalender: „Farbe: Konto“ färbt jeden Posten nach dem Konto, von dem er abgeht. Welches Konto, stellst du beim Bearbeiten (Stift) unter „Abgebucht von“ ein."
            : "Hier siehst du, wie viel von welchem Konto abgeht – und ob auf dem Space genug liegt. Über „Konten-Plan“ ziehst du Posten von einem Konto ins andere.",
        ],
      },
      {
        sel: "#fixEditBtn",
        ic: "sliders",
        t: "Liste bearbeiten",
        p: [
          "Neue Fixkosten anlegen, Beträge, Tag und Rhythmus ändern.",
          "Ein neuer Betrag gilt ab dem gewählten Monat – frühere Monate bleiben, wie sie waren.",
        ],
      },
    ],
  },
  shop: {
    t: "Einkauf",
    s: [
      {
        sel: "#zIn",
        ic: "cart",
        t: "Einkaufszettel",
        p: [
          "Eintippen, was du brauchst. Zweimal dasselbe wird zu „2x“ – die Menge kannst du auch selbst ändern.",
          "Der Zettel ist auf allen gekoppelten Geräten gleich.",
        ],
      },
      {
        sel: ".zsort,.pcztabs",
        ic: "tag",
        t: "Sortieren",
        p: [
          "Nach Laden (wo es am günstigsten ist), Abteilung, Preis oder A–Z.",
          "Das Laden-Logo neben einem Eintrag antippen, um den Laden selbst zu wählen.",
        ],
      },
      {
        sel: "[data-zstart],.pczact",
        ic: "phone",
        t: "Einkauf starten",
        p: [
          IS_PC
            ? "Schickt den Zettel aufs Handy – oder als PDF speichern bzw. drucken."
            : "Startet den Einkauf: abhaken im Laden, am Ende den Kassenbon fotografieren und Karte oder Bar wählen.",
          "Daraus wird automatisch eine Buchung mit allen Artikeln.",
        ],
      },
      {
        sel: "#v-shop .card:not(.zmini):not(.zcard)",
        ic: "cart",
        t: "Angebote",
        p: [
          "Wähl deine Läden – dann siehst du hier ihre Wochenangebote.",
          IS_PC
            ? "Am PC kannst du Angebote direkt auf der Ladenseite anklicken und auf den Zettel picken."
            : "Gemerkte Angebote landen mit einem Tipp auf dem Zettel.",
        ],
      },
    ],
  },
  year: {
    t: "Analyse",
    s: IS_PC
      ? [
          {
            sel: ".pcac",
            ic: "chart",
            t: "Verlauf",
            p: [
              "Deine Ausgaben der letzten 12 Monate mit Durchschnitt.",
              "Mit der Maus über Punkte und Balken fahren zeigt die genauen Zahlen, Klick springt in den Monat.",
            ],
          },
          {
            sel: ".pcac:nth-child(2)",
            ic: "insight",
            t: "Kategorien im Vergleich",
            p: [
              "Wo du diesen Monat mehr (rot) oder weniger (grün) als in den 6 Monaten davor ausgibst.",
              "Darunter: dieses Jahr gegen letztes Jahr.",
            ],
          },
          {
            sel: ".pcac:nth-child(2) .pcarl:last-child",
            ic: "cash",
            t: "Berechnung & Jahresplan",
            p: ["Wie dein Kontostand zustande kommt und was im ganzen Jahr rein und raus geht."],
          },
          {
            sel: ".pcac:nth-child(3)",
            ic: "receipt",
            t: "Steuer",
            p: [
              "Die Schätzung für dieses Jahr: wie viel du nachzahlen musst und was du zurücklegen solltest.",
              "Darunter Gehalt, Werbungskosten und der EÜR-Export fürs Steuerbüro.",
            ],
          },
        ]
      : [
          {
            sel: ".atabs",
            ic: "chart",
            t: "Drei Bereiche",
            p: ["Auswertung (wie lief es), Planung (was kommt) und Steuer (was du zahlen musst)."],
          },
          {
            sel: ".anaseg",
            ic: "cal",
            t: "Monat oder Jahr",
            p: ["Zwischen dem gewählten Monat und dem ganzen Jahr wechseln."],
          },
          {
            sel: ".anet",
            ic: "insight",
            t: "Übrig im Monat",
            p: ["Was am Ende übrig bleibt – mit Verlauf der letzten Monate.", "Antippen öffnet die Details."],
          },
          {
            sel: ".kpis,.akpi,.anet+*",
            ic: "wallet",
            t: "Kennzahlen",
            p: ["Einnahmen, Ausgaben, Fixkosten und Ausgaben pro Tag – jede Kachel antippbar."],
          },
        ],
  },
  zukunft: {
    t: uiText("trz_t"),
    s: [
      {
        sel: '[data-view="zukunft"] .zhero',
        raw: 1,
        ic: "piggy",
        t: uiText("trz_hero_t"),
        p: [uiText("trz_hero_p")],
      },
      {
        sel: '[data-view="zukunft"] .areacard .agrid',
        raw: 1,
        ic: "target",
        t: uiText("trz_tiles_t"),
        p: [uiText("trz_tiles_p")],
      },
      {
        sel: '[data-view="zukunft"] [data-sropen].atile',
        raw: 1,
        ic: "spark",
        t: uiText("trz_sr_t"),
        p: [uiText("trz_sr_p")],
      },
      {
        sel: '[data-view="zukunft"] .invtile',
        raw: 1,
        ic: "up",
        t: uiText("trz_inv_t"),
        p: [uiText("trz_inv_p")],
      },
    ],
  },
  beruf: {
    t: uiText("trb_t"),
    s: [
      {
        sel: "#bfsw .bfbands",
        raw: 1,
        ic: "case",
        t: uiText("nw_bf_t"),
        p: [uiText("nw_bf_p")],
      },
      {
        sel: '[data-view="beruf"] .ahero',
        raw: 1,
        ic: "receipt",
        t: uiText("trb_hero_t"),
        p: [uiText("trb_hero_p")],
      },
      {
        sel: '[data-view="beruf"] .areacard .agrid',
        raw: 1,
        ic: "case",
        t: uiText("trb_tiles_t"),
        p: [uiText("trb_tiles_p")],
      },
      {
        sel: '[data-view="beruf"] [data-stbopen].atile',
        raw: 1,
        ic: "doc",
        t: uiText("trb_stb_t"),
        p: [uiText("trb_stb_p")],
      },
      ...(aiOnSafe()
        ? [
            {
              sel: '[data-view="beruf"] [data-bropen].atile',
              raw: 1,
              ic: "mail",
              t: uiText("trb_br_t"),
              p: [uiText("trb_br_p"), uiText("trb_br_p2")],
            },
            {
              sel: '[data-view="beruf"] [data-bropen].atile',
              raw: 1,
              ic: "mail",
              t: uiText("trb_red_t"),
              p: [uiText("trb_red_p")],
              demo: redDemo(),
            },
          ]
        : [
            {
              sel: '[data-view="beruf"] [data-bropen].atile',
              raw: 1,
              ic: "mail",
              t: uiText("trb_br_t"),
              p: [uiText("trb_br_p")],
            },
          ]),
      {
        sel: '[data-view="beruf"] .bfnext',
        raw: 1,
        ic: "bell",
        t: uiText("nw_bn_t"),
        p: [uiText("nw_bn_p")],
      },
      {
        sel: '[data-view="beruf"] .bflist',
        raw: 1,
        ic: "bank",
        t: uiText("bn_tax"),
        p: [uiText("nw_bn_p2")],
      },
      {
        sel: '[data-view="beruf"] [data-rchopen].atile',
        raw: 1,
        ic: "docout",
        t: uiText("trb_rch_t"),
        p: [uiText("trb_rch_p")],
      },
      {
        sel: '[data-view="beruf"] [data-eropen].atile',
        raw: 1,
        ic: "docin",
        t: uiText("trb_er_t"),
        p: [uiText("trb_er_p")],
      },
      {
        sel: '[data-view="beruf"] [data-wbopen].atile',
        raw: 1,
        ic: "repeat",
        t: uiText("trb_wb_t"),
        p: [uiText("trb_wb_p")],
      },
      {
        sel: '[data-view="beruf"] [data-tmopen].atile',
        raw: 1,
        ic: "cal",
        t: uiText("trb_tm_t"),
        p: [uiText("trb_tm_p")],
      },
      {
        sel: '[data-view="beruf"] [data-zvopen].atile',
        raw: 1,
        ic: "cash",
        t: uiText("trb_zv_t"),
        p: [uiText("trb_zv_p")],
      },
      {
        sel: '[data-view="beruf"] [data-bsopen].atile',
        raw: 1,
        ic: "doc",
        t: uiText("trb_bs_t"),
        p: [uiText("trb_bs_p")],
      },
    ],
  },
  more: {
    t: "Einstellungen",
    s: [
      {
        sel: "#setQ",
        ic: "insight",
        t: "Suchen",
        p: ["Schneller als blättern: eintippen, was du suchst – z. B. „Backup“ oder „Budget“."],
      },
      {
        sel: "#pcsL,#setTabs",
        ic: "sliders",
        t: "Bereiche",
        p: [
          IS_PC
            ? "Links wählen, rechts erscheint der Inhalt."
            : "Geld, Anpassen, Sicherheit und Hilfe – darunter klappen die Punkte auf.",
          "Geld: Konten, Budgets, Abos, Sparen & Anlegen. Anpassen: Farben, Sprache, Kategorien.",
        ],
      },
      {
        sel: '[data-pcset="konten"],[data-accgo="konten"],[data-acc="konten"]',
        raw: 1,
        ic: "bank",
        t: uiText("ay_t"),
        p: [uiText("tr_ay")],
      },
      {
        sel: '[data-phsw="sound"],[data-acc="toene"],[data-accgo="toene"]',
        raw: 1,
        ic: "sound",
        t: uiText("snd_t"),
        p: [uiText("trh_snd")],
      },
      ...(canShare()
        ? [
            {
              sel: '[data-invopen="1"],[data-accgo="weiter"]',
              raw: 1,
              ic: "user",
              t: canInvite() ? uiText("inv_t") : uiText("inv_share_t"),
              p: [canInvite() ? uiText("trh_inv") : uiText("trh_inv_t")],
            },
          ]
        : []),
      {
        sel: '[data-pcset="geraete"],[data-acctab="sicherheit"]',
        ic: "phone",
        t: "Geräte & Sicherheit",
        p: ["Handy und PC koppeln (bis zu 5 Geräte), App-Sperre und Backup findest du hier."],
      },
      {
        sel: IS_PC ? "#ptourQ" : '[data-acctab="hilfe"]',
        ic: "insight",
        t: "Hilfe",
        p: [
          IS_PC
            ? "Das „?“ oben rechts: Tour zu jeder Seite, Fragen und Antworten, Feedback und was neu ist."
            : "Fragen und Antworten, die große Tour und diese kurzen Seiten-Touren zum erneuten Ansehen.",
        ],
      },
    ],
  },
});
function aiOnSafe() {
  try {
    return aiOn();
  } catch (_) {
    return false;
  }
}
function redDemo() {
  const X = (t) => `<span class="trx">${escHtml(t)}</span>`;
  return `<div class="trdemo" data-noi18n aria-hidden="true">
  <div class="trl">Herrn ${X("Max Mustermann")}</div><div class="trl">${X("Musterstraße 12")}</div><div class="trl">${X("42657 Solingen")}</div>
  <div class="trl">Steuer-ID ${X("12 345 678 901")}</div><div class="trl ok">Zahlen Sie <b>312,00 €</b> bis <b>28.11.</b></div><div class="trl">IBAN ${X("DE12 3456 7890 1234 5678 90")}</div></div>
  <p class="trleg" data-noi18n><i></i> ${escHtml(uiText("trb_red_l"))}</p>`;
}
let PTOUR_C = null,
  PTOUR_L = null;
const pageTourCache = () => {
  const key = LANG + (aiOnSafe() ? "+ai" : "");
  if (!PTOUR_C || PTOUR_L !== key) {
    PTOUR_C = PTOUR_FN();
    PTOUR_L = key;
  }
  return PTOUR_C;
};
const PTOUR = new Proxy(
  {},
  {
    get: (_, k) => pageTourCache()[k],
    ownKeys: () => Reflect.ownKeys(pageTourCache()),
    getOwnPropertyDescriptor: (_, k) => ({
      enumerable: true,
      configurable: true,
      value: pageTourCache()[k],
    }),
  }
);
const ptSeen = () => {
  try {
    return JSON.parse(localStorage.getItem("hb-ptour") || "{}");
  } catch (_) {
    return {};
  }
};
function ptourOpen(v) {
  const P = PTOUR[v];
  if (!P) return;
  const steps = P.s.filter((s) =>
    [...document.querySelectorAll(s.sel)].some((n) => tourVis(n) && !n.closest(".cubestage"))
  );
  if (!steps.length) return;
  try {
    const o = ptSeen();
    o[v] = 1;
    localStorage.setItem("hb-ptour", JSON.stringify(o));
  } catch (_) {}
  TOUR.page = v;
  TOUR.steps = steps;
  tourGo(0);
}
/* Große Updates: Mami zeigt Neues einmal von selbst (kleine Updates nur unter „Neu in dieser Version“) */
const NEWTOUR = [
  {
    v: "0.49.0",
    s: () =>
      IS_PC
        ? []
        : [
            {
              sel: "#v-home .hsay",
              raw: 1,
              ic: "home",
              t: uiText("nw_hs_t"),
              p: [uiText("nw_hs_p")],
            },
          ],
  },
  {
    v: "0.48.9",
    s: () => [
      {
        sel: "#topAv",
        ic: "palette",
        t: uiText("nw_mo_t"),
        p: [uiText("nw_mo_p")],
      },
    ],
  },
  {
    v: "0.48.8",
    s: () =>
      hasSelf()
        ? [
            {
              sel: '[data-view="beruf"] .bfnext, [data-view="beruf"] .bflist',
              ic: "bell",
              t: uiText("nw_bn_t"),
              p: [uiText("nw_bn_p"), uiText("nw_bn_p2")],
            },
          ]
        : [],
  },
  {
    v: "0.48.7",
    s: () => [
      {
        sel: "#astack",
        ic: "wallet",
        t: uiText("nw_spn_t"),
        p: [uiText("nw_spn_p")],
      },
    ],
  },
  {
    v: "0.48.6",
    s: () => [
      {
        sel: "#fbQuick",
        ic: "insight",
        t: uiText("nw_fb_t"),
        p: [uiText("nw_fb_p")],
      },
    ],
  },
  {
    v: "0.48.3",
    s: () =>
      hasSelf()
        ? [
            {
              sel: '[data-view="beruf"] [data-kdopen].atile',
              ic: "user",
              t: uiText("nw_kf_t"),
              p: [uiText("nw_kf_p")],
            },
          ]
        : [],
  },
  {
    v: "0.48.2",
    s: () =>
      hasSelf()
        ? [
            {
              sel: '[data-view="beruf"] [data-dvopen]',
              ic: "bank",
              t: uiText("nw_dv_t"),
              p: [uiText("nw_dv_p")],
            },
          ]
        : [],
  },
  {
    v: "0.48.1",
    s: () =>
      hasSelf()
        ? [
            {
              sel: '[data-view="beruf"] [data-rchopen].atile',
              ic: "repeat",
              t: uiText("nw_rs_t"),
              p: [uiText("nw_rs_p")],
            },
          ]
        : [],
  },
  {
    v: "0.48.0",
    s: () =>
      hasSelf()
        ? [
            {
              sel: '[data-view="beruf"] [data-anopen].atile',
              ic: "doc",
              t: uiText("nw_an_t"),
              p: [uiText("nw_an_p")],
            },
          ]
        : [],
  },
  {
    v: "0.47.9",
    s: () =>
      hasSelf() && !store.settings.kleinunternehmer
        ? [
            {
              sel: '[data-view="beruf"] [data-ustopen]',
              ic: "doctax",
              t: uiText("nw_ust_t"),
              p: [uiText("nw_ust_p")],
            },
          ]
        : [],
  },
  {
    v: "0.47.8",
    s: () =>
      hasSelf()
        ? [
            {
              sel: '[data-view="beruf"] [data-rchopen].atile',
              ic: "alert",
              t: uiText("nw_dn_t"),
              p: [uiText("nw_dn_p")],
            },
          ]
        : [],
  },
  {
    v: "0.47.7",
    s: () =>
      hasSelf()
        ? [
            {
              sel: '[data-view="beruf"] [data-rchopen].atile',
              ic: "bank",
              t: uiText("nw_pm_t"),
              p: [uiText("nw_pm_p")],
            },
          ]
        : [],
  },
  {
    v: "0.47.6",
    s: () =>
      hasSelf()
        ? [
            {
              sel: '[data-view="beruf"] [data-rchopen].atile',
              ic: "doccheck",
              t: uiText("nw_eo_t"),
              p: [uiText("nw_eo_p")],
            },
          ]
        : [],
  },
  {
    v: "0.47.5",
    s: () =>
      hasSelf()
        ? [
            {
              sel: '[data-view="beruf"] [data-eropen].atile',
              ic: "docin",
              t: uiText("trb_er_t"),
              p: [uiText("trb_er_p")],
            },
          ]
        : [],
  },
  {
    v: "0.45.1",
    s: () => [
      {
        sel: IS_DESK ? "#pcHero .pcaccs:has(.mvd)" : "[data-mvopen]",
        ic: "repeat",
        t: uiText("nw_mfx_t"),
        p: [uiText("nw_mfx_p")],
      },
    ],
  },
  {
    v: "0.41.7",
    s: () =>
      hasSelf()
        ? [
            {
              sel: '[data-view="beruf"] [data-rchopen].atile',
              ic: "pen",
              t: uiText("nw_rk_t"),
              p: [uiText("nw_rk_p")],
            },
          ]
        : [],
  },
  {
    v: "0.41.6",
    s: () =>
      hasSelf()
        ? [
            {
              sel: "#ntNone",
              center: 1,
              ic: "piggy",
              t: uiText("nw_ra_t"),
              p: [uiText("nw_ra_p")],
            },
          ]
        : [],
  },
  {
    v: "0.40.8",
    s: () =>
      hasSelf()
        ? [
            {
              sel: '[data-view="beruf"] [data-rchopen].atile',
              ic: "pen",
              t: uiText("nw_rv_t"),
              p: [uiText("nw_rv_p")],
            },
          ]
        : [],
  },
  {
    v: "0.40.6",
    s: () =>
      hasJob() && hasSelf()
        ? [
            {
              sel: "#ntNone",
              center: 1,
              ic: "store",
              t: uiText("nw_bf_t"),
              p: [uiText("nw_bf_p")],
            },
          ]
        : [],
  },
  {
    v: "0.40.3",
    s: () =>
      updKey()
        ? [
            {
              sel: "#ntNone",
              center: 1,
              ic: "link",
              t: uiText("nw_pl_t"),
              p: [uiText("nw_pl_p")],
            },
          ]
        : [],
  },
  {
    v: "0.40.1",
    s: () =>
      updKey()
        ? [
            {
              sel: "#ntNone",
              center: 1,
              ic: "bell",
              t: uiText("nw_nu_t"),
              p: [uiText("nw_nu_p")],
            },
          ]
        : [],
  },
  {
    v: "0.39.9",
    s: () =>
      IS_DESK
        ? [
            {
              sel: ".tab.plus",
              ic: "plus",
              t: uiText("nw_fan_t"),
              p: [uiText("nw_fan_p")],
            },
          ]
        : [],
  },
  {
    v: "0.39.7",
    s: () =>
      IS_DESK
        ? [
            {
              sel: "#pcHero .pcaccs:has(.mvd)",
              ic: "repeat",
              t: uiText("mv_sheet"),
              p: [uiText("trh_mvpc")],
            },
          ]
        : [],
  },
  {
    v: "0.39.6",
    s: () =>
      IS_DESK
        ? []
        : [
            {
              sel: "[data-mvopen]",
              ic: "repeat",
              t: uiText("mv_sheet"),
              p: [uiText("trh_mv")],
            },
          ],
  },
  {
    v: "0.39.4",
    s: () =>
      IS_DESK && !IS_TAB
        ? [
            {
              sel: "nav.tabs.navx",
              ic: "list",
              t: uiText("nw_nav_t"),
              p: [uiText("nw_nav_p")],
            },
          ]
        : [],
  },
  {
    v: "0.39.3",
    s: () => [
      {
        sel: "#topAv",
        center: 1,
        ic: "bell",
        t: uiText("nw_snd_t"),
        p: [uiText("nw_snd_p")],
      },
    ],
  },
  {
    v: "0.39.1",
    s: () =>
      canShare()
        ? [
            {
              sel: ".tabs .tab.plus,.pcfab,[data-addmenu]",
              center: 1,
              ic: "insight",
              t: uiText("nw_inv_t"),
              p: [uiText("nw_inv_p")],
            },
          ]
        : [],
  },
];
const vCmp = (a, b) => {
  const A = String(a).split(".").map(Number),
    B = String(b).split(".").map(Number);
  for (let k = 0; k < 3; k++) {
    const d = (A[k] || 0) - (B[k] || 0);
    if (d) return d;
  }
  return 0;
};
function ntBase() {
  const cur = CHANGELOG[0][0];
  try {
    let b = localStorage.getItem("hb-newtour");
    if (b) return b;
    const seen = localStorage.getItem("hb-seenlog");
    b = seen && /^\d/.test(seen) ? seen : store.tx.length ? "0.39.5" : cur;
    localStorage.setItem("hb-newtour", b);
    return b;
  } catch (_) {
    return cur;
  }
}
function ntPending(base) {
  const cur = CHANGELOG[0][0];
  return NEWTOUR.filter((x) => vCmp(x.v, base) > 0 && vCmp(x.v, cur) <= 0).slice(0, 4);
}
function ntOpen(list, manual) {
  list = list.filter((x) => x.s().length);
  const vis = (s) => [...document.querySelectorAll(s.sel)].some((n) => tourVis(n) && !n.closest(".cubestage"));
  list = list
    .map((x) => ({
      v: x.v,
      b: x.s().filter((s) => s.center || vis(s)),
    }))
    .filter((x) => x.b.length);
  const body = list
    .flatMap((x) => x.b)
    .map((s) => ({
      raw: 1,
      ...s,
      sel: vis(s) ? s.sel : "#ntNone",
    }));
  try {
    localStorage.setItem("hb-newtour", CHANGELOG[0][0]);
  } catch (_) {}
  ntAuto.off = 1;
  if (!body.length) {
    if (manual) toast(uiText("nw_end_p"));
    return;
  }
  const v = list.length === 1 ? "v" + list[0].v : "v" + list[list.length - 1].v + " – v" + list[0].v;
  TOUR.page = "neu";
  TOUR.steps = [
    {
      sel: "#ptourQ",
      raw: 1,
      t: uiText("nw_hi"),
      p: [
        uiText("nw_hi_p", {
          v,
        }),
      ],
    },
    ...body,
    {
      sel: "#ptourQ",
      raw: 1,
      t: uiText("nw_end_t"),
      p: [uiText("nw_end_p")],
    },
  ];
  try {
    SND.play("bell");
  } catch (_) {}
  TOUR.i = -1;
  tourGo(0);
}
const ntBlocked = () =>
  BG_RUN ||
  TOUR.i >= 0 ||
  ui.view !== "home" ||
  !!$("dankeBg") ||
  dankeShould() ||
  wizShould() ||
  ui.wiz ||
  !!document.querySelector(
    ".backdrop:not([hidden]),#tourBg:not([hidden]),.hobg:not([hidden]),#actBg:not([hidden]),#mvBg:not([hidden]),#loginBg:not([hidden]),#langBg,#mvSheet:not([hidden])"
  );
function ntAuto() {
  if (ntAuto.off) return false;
  if (BG_RUN || wizShould() || ui.wiz || $("dankeBg") || dankeShould()) return false;
  const L = ntPending(ntBase());
  if (!L.length) {
    ntAuto.off = 1;
    return false;
  }
  if (ntBlocked()) {
    clearTimeout(ntAuto.r);
    ntAuto.r = setTimeout(() => {
      try {
        ntAuto();
      } catch (_) {}
    }, 2500);
    return TOUR.i < 0 && ui.view === "home";
  }
  clearTimeout(ntAuto.t);
  ntAuto.t = setTimeout(() => {
    if (ntBlocked()) {
      ntAuto();
      return;
    }
    const P = ntPending(ntBase());
    if (P.length) ntOpen(P);
  }, 1400);
  return true;
}
function ptourAuto() {
  if (ntAuto()) return;
  if (
    BG_RUN ||
    TOUR.i >= 0 ||
    $("dankeBg") ||
    dankeShould() ||
    wizShould() ||
    !PTOUR[ui.view] ||
    ptSeen()[ui.view] ||
    document.querySelector(".backdrop:not([hidden]),#tourBg:not([hidden]),.hobg:not([hidden])")
  )
    return;
  if (ui.view === "home" && !store.tx.length) return;
  clearTimeout(ptourAuto.t);
  const v = ui.view;
  ptourAuto.t = setTimeout(() => {
    if (ui.view === v && TOUR.i < 0 && !document.querySelector(".backdrop:not([hidden]),.hobg:not([hidden])"))
      ptourOpen(v);
  }, 900);
}
function ptourBtn() {
  const t = $("viewTitle");
  if (!t) return;
  let b = $("ptourQ");
  const on = !!PTOUR[ui.view];
  if (!b) {
    b = document.createElement("button");
    b.id = "ptourQ";
    b.className = "ptq";
    b.type = "button";
    b.innerHTML = '?<i class="badge" hidden></i>';
    b.setAttribute("aria-label", "Hilfe");
    b.title = "Hilfe: Tour, Fragen & Antworten, Feedback";
    t.after(b);
  }
  {
    const g = document.documentElement.classList.contains("pc") && $("pcActs"),
      bl = $("bellBtn");
    if (g) {
      if (b.parentElement !== g || b.nextElementSibling !== bl)
        bl && bl.parentElement === g ? bl.before(b) : g.appendChild(b);
      b.classList.add("roundbtn");
    } else if (bl && b.nextElementSibling !== bl) {
      bl.before(b);
      b.classList.add("roundbtn", "ptqph");
    }
  }
  mamiBtn(b);
  b.hidden = false;
  if (b._mout && !MB.on && TOUR.i < 0)
    setTimeout(() => {
      if (b._mout && !MB.on && !MO.on && !MO.keep && TOUR.i < 0) mHeadIn(b);
    }, 900);
  const ib = $("pcInbox"),
    n = ib ? Number((ib.querySelector(".badge") || {}).textContent) || 0 : 0,
    bd = b.querySelector(".badge");
  try {
    mbBadge(b);
  } catch (_) {
    if (bd) bd.hidden = true;
  }
  fbQuickBtn();
}

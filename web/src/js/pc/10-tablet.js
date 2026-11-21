/* Tablet */
if (IS_TAB) {
  const H = document.documentElement,
    calm = () => pcCalm();
  /* Dock */
  const dock = document.querySelector(".tabs"),
    plus = dock && dock.querySelector(".tab.plus");
  let bub = null;
  function dockPlace() {
    if (!dock) return;
    if (!bub) {
      bub = document.createElement("i");
      bub.className = "tabbub";
      dock.prepend(bub);
    }
    const on = dock.querySelector('.tab[aria-selected="true"]');
    if (on) {
      bub.style.left = on.offsetLeft + "px";
      bub.style.top = on.offsetTop + "px";
      bub.style.width = on.offsetWidth + "px";
      bub.style.height = on.offsetHeight + "px";
      bub.style.setProperty("--bubc", getComputedStyle(on).getPropertyValue("--tc") || "#1a7a5c");
      bub.style.opacity = 1;
    } else bub.style.opacity = 0;
  }
  const _rd = render;
  render = (...a) => {
    const x = _rd(...a);
    if (ui.view !== "more") ui.tabOpen = 0;
    requestAnimationFrame(dockPlace);
    return x;
  };
  addEventListener("resize", () => requestAnimationFrame(dockPlace));
  setTimeout(dockPlace, 60);
  setTimeout(dockPlace, 600);

  /* Wischen */
  {
    let x0 = null,
      y0 = 0,
      t0 = 0,
      dx = 0,
      sec = null,
      horiz = null;
    const blocked = (t) =>
      t.closest(
        "input,textarea,select,.sheet,.backdrop,.astack,.srail,.table-wrap,.fxchips,.tabs,.pcfcalc,[draggable=true],.pcsweb,.leaflet-container"
      );
    document.addEventListener(
      "touchstart",
      (e) => {
        if (
          e.touches.length !== 1 ||
          blocked(e.target) ||
          PC_ANIM.busy ||
          (ui.view === "more" && ui.tabOpen) ||
          document.querySelector(".backdrop:not([hidden])")
        ) {
          x0 = null;
          return;
        }
        x0 = e.touches[0].clientX;
        y0 = e.touches[0].clientY;
        t0 = Date.now();
        dx = 0;
        horiz = null;
        sec = document.querySelector(`[data-view="${ui.view}"]`);
      },
      {
        passive: true,
        capture: true,
      }
    );
    document.addEventListener(
      "touchmove",
      (e) => {
        if (x0 === null || !sec) return;
        const t = e.touches[0];
        dx = t.clientX - x0;
        const dy = t.clientY - y0;
        if (horiz === null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) horiz = Math.abs(dx) > Math.abs(dy) * 1.4;
        if (horiz && !calm()) {
          const k = dx / innerWidth;
          sec.style.transition = "none";
          sec.style.transform = `translateX(${dx * 0.55}px) rotate(${k * 3}deg) scale(${1 - Math.abs(k) * 0.06})`;
          sec.style.opacity = String(1 - Math.abs(k) * 0.5);
        }
      },
      {
        passive: true,
        capture: true,
      }
    );
    document.addEventListener(
      "touchend",
      (e) => {
        if (x0 === null || !sec) return;
        const s = sec,
          go = horiz && Math.abs(dx) > 80 && Date.now() - t0 < 1200;
        x0 = null;
        if (horiz && !calm()) {
          s.style.transition = "transform .45s cubic-bezier(.3,1.5,.5,1), opacity .3s";
          s.style.transform = "";
          s.style.opacity = "";
          setTimeout(() => {
            s.style.transition = "";
          }, 460);
        }
        if (go) {
          e.stopImmediatePropagation();
          pcStep(dx < 0 ? 1 : -1);
        }
      },
      {
        passive: true,
        capture: true,
      }
    );
  }
}
/* Einstellungen-Übersicht wie am Handy (PC und Tablet) */
if (IS_PC) {
  const calm = () => pcCalm();
  /* Einstellungen */
  const GROUPS = () => [
    [
      "Geld",
      "#6b8e23",
      [
        "konten",
        "budgets",
        "schulden",
        ...(isJobless() ? ["amt"] : hasProfile() ? ["amt", "steuer"] : ["steuer"]),
        "invest",
        "export",
      ],
    ],
    ["Anpassen", "#1a7a5c", ["toene", "farben", "sprache", "kategorien", "start", "laeden"]],
    [
      "Sicherheit",
      "#3d63a8",
      [
        "sicherheit",
        ...(SYNCABLE || window.AndroidBridge ? ["geraete"] : []),
        "backup",
        ...(CAN_NOTIFY ? ["notify"] : []),
        "speicher",
      ],
    ],
    ["Hilfe", "#c27c0e", ["neu", "hilfe", ...(canShare() ? ["weiter"] : []), "recht"]],
  ];
  const tTitle = (k) => (k === "geraete" && (SYNCABLE || window.AndroidBridge) ? "Geräte & Abgleich" : accTitle(k));
  function tabSetHTML() {
    const n = String(store.settings.name || "").trim(),
      p = store.settings.photo,
      f = devForm(),
      badge = `<span class="avdev">${devIc(f, 11)}</span>`;
    const av = p
      ? `<img src="${escHtml(p)}" alt="">${badge}`
      : n
        ? `<span class="avl">${escHtml(n[0].toUpperCase())}</span>${badge}`
        : devIc(f, 24);
    return `<div class="card tsprof"><button class="topav ${!p && !n ? "devav" : ""}" data-tsprof="1" aria-label="Profil">${av}</button><div style="min-width:0"><b>${escHtml(n || devModel())}</b><small>${escHtml([n ? devModel() : "", SYNC.token ? "Abgleich an" : "Abgleich aus", verFull()].filter(Boolean).join(" · "))}</small></div><span style="flex:1"></span><button class="btn" data-tsprof="1">Profil bearbeiten</button></div>
      <div class="tsqs">${quickSw().map(qsTile).join("")}</div>
      <div class="tsgr">${GROUPS()
        .map(
          ([g, c, ks]) =>
            `<div class="card tsg" style="--gc:${c}"><h3><span class="saic" style="background:${c}">${svgIcon(accIcon(ks[0]), 16)}</span>${escHtml(I18N.tr ? I18N.tr(g) : g)}</h3>${ks
              .filter((k) => SP_PAGES[k] || k === "weiter")
              .map(
                (k) =>
                  `<button data-tsgo="${k}"><span class="saic" style="background:${themeCol(ACC_COL[k] || c)};width:28px;height:28px;border-radius:9px">${svgIcon(accIcon(k), 14)}</span>${escHtml(tTitle(k))}<small>${escHtml(accSub(k) || "")} ›</small></button>`
              )
              .join("")}</div>`
        )
        .join("")}</div>`;
  }
  const _rsh = renderSetHome;
  renderSetHome = function (...a) {
    const r = _rsh.apply(this, a),
      el = $("setHome");
    if (!el) return r;
    const ps = el.querySelector(".pcset");
    if (!ps) return r;
    let mix = $("tabSet");
    if (!mix) {
      ps.insertAdjacentHTML("beforebegin", `<div id="tabSet"></div>`);
      mix = $("tabSet");
    }
    const open = !!ui.tabOpen;
    mix.hidden = open;
    ps.hidden = !open;
    if (!open) {
      const h = tabSetHTML();
      if (mix.dataset.h !== h) {
        mix.dataset.h = h;
        mix.innerHTML = h;
      }
    } else {
      const ph = ps.querySelector(".pcsph");
      if (ph && !ps.querySelector("[data-tsback]"))
        ph.insertAdjacentHTML(
          "beforebegin",
          `<button class="tsback" data-tsback="1"><svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="m15 6-6 6 6 6"/></svg> Einstellungen</button>`
        );
    }
    return r;
  };
  const _ag = accGo;
  accGo = function (k) {
    if (k !== "profil") ui.tabOpen = 1;
    return _ag(k);
  };
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-tsgo]");
    if (g) {
      const k = g.dataset.tsgo;
      if (k === "weiter") {
        invOpen();
        return;
      }
      ui.tabOpen = 1;
      ui.pcset = k;
      renderSetHome();
      window.scrollTo({
        top: 0,
      });
      const pn = document.querySelector("#setHome .pcsr");
      if (pn && !calm())
        pn.animate(
          [
            {
              opacity: 0,
              transform: "translateX(60px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 420,
            easing: "cubic-bezier(.2,.9,.3,1.2)",
          }
        );
      return;
    }
    if (e.target.closest("[data-tsback]")) {
      ui.tabOpen = 0;
      renderSetHome();
      window.scrollTo({
        top: 0,
      });
      const m = $("tabSet");
      if (m && !calm())
        [...m.querySelectorAll(".card,.tssw>button")].forEach((x, i) =>
          x.animate(
            [
              {
                opacity: 0,
                transform: "translateY(26px) scale(.97)",
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 480,
              delay: i * 35,
              easing: "cubic-bezier(.3,1.3,.5,1)",
              fill: "backwards",
            }
          )
        );
      return;
    }
    if (e.target.closest("[data-tsprof]")) {
      accGo("profil");
      return;
    }
    const w = e.target.closest("[data-tssw]");
    if (w) {
      const k = w.dataset.tssw;
      if (k === "dark") {
        const t = $("pcTheme");
        if (t) t.click();
        setTimeout(renderSetHome, 50);
        return;
      }
      ui.tabOpen = 1;
      ui.pcset = k;
      renderSetHome();
      window.scrollTo({
        top: 0,
      });
    }
  });
}

/* Start */
if (IS_PC) {
  const PCH = () => {
    const h = store.settings.pcHome || (store.settings.pcHome = {});
    h.order = Array.isArray(h.order) ? h.order : [];
    h.min = Array.isArray(h.min) ? h.min : [];
    return h;
  };
  const BIC = {
    cash: "cash",
    budgets: "target",
    fix: "list",
    tax: "shield",
    goals: "piggy",
    debts: "bank",
    recent: "receipt",
    gemeinsam: "heart",
    offers: "cart",
    ...HX_IC,
  };
  const name = (k) => (HOME_BLOCKS.find((b) => b[0] === k) || [k, k])[1];
  const _k2 = accTabKeys;
  accTabKeys = (t) => _k2(t).filter((k) => k !== "start");
  homeOrder = () => {
    const o = [...new Set(PCH().order)].filter((k) => HOME_BLOCKS.some((b) => b[0] === k));
    for (const [k] of HOME_BLOCKS) if (!o.includes(k)) o.push(k);
    return o;
  };
  const _hb = homeBlocks;
  homeBlocks = (html) => {
    const keep = store.settings.homeHidden;
    store.settings.homeHidden = [...PCH().min];
    try {
      return _hb(html);
    } finally {
      store.settings.homeHidden = keep;
    }
  };
  const save = () => {
    try {
      saveSettings();
    } catch (e) {}
  };
  function dock() {
    let d = $("pcDock");
    const on = ui.view === "home",
      m = PCH().min.filter((k) => HOME_BLOCKS.some((b) => b[0] === k));
    document.documentElement.classList.remove("pcdocked");
    const hv = document.querySelector("#v-home");
    if (!hv) return;
    if (!d) {
      d = document.createElement("div");
      d.className = "pcdock";
      d.id = "pcDock";
    }
    const ag = hv.querySelector(".agrid"),
      anc = ag && ag.closest(".areacard");
    if (anc) {
      if (anc.nextElementSibling !== d) anc.after(d);
    } else if (d.parentElement !== hv) hv.appendChild(d);
    d.hidden = !on || !m.length;
    const g = d.querySelector(".pcdkg"),
      have = g ? [...g.children].map((x) => x.dataset.pcrest).join(",") : null;
    if (have === m.join(",")) return;
    d.innerHTML =
      `<div class="pcdkh"><b>Ausgeblendet</b><small>Antippen zum Einblenden</small></div><div class="pcdkg">` +
      m
        .map(
          (k) =>
            `<button class="pcdi" data-pcrest="${k}" aria-label="${escHtml(name(k))} wieder anzeigen"><span>${svgIcon(BIC[k] || "tag", 18)}</span><em>${escHtml(name(k))}</em></button>`
        )
        .join("") +
      `</div>`;
  }
  function decorate() {
    dock();
    if (ui.view !== "home") return;
    document.querySelectorAll("#v-home .hblock").forEach((b) => {
      if (b.closest(".cubestage") || b.querySelector(":scope > .pctl")) return;
      b.insertAdjacentHTML(
        "afterbegin",
        `<div class="pctl"><button class="pcgrip" data-pcgrip="1" aria-label="Kachel verschieben" title="Ziehen zum Verschieben"><svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/></svg></button><button class="pcmin" data-pcmin="${b.dataset.hb}" aria-label="Kachel minimieren" title="Minimieren">${svgIcon("minus", 16)}</button></div>`
      );
    });
  }
  const _ph = pcHome;
  pcHome = (o) => {
    _ph(o);
    decorate();
  };
  setInterval(dock, 1000);
  const _render = render;
  render = (...a) => {
    const x = _render(...a);
    try {
      dock();
    } catch (e) {}
    return x;
  };
  window.pcDockEls = () =>
    ui.view === "home" && $("pcDock") && !$("pcDock").hidden ? [...$("pcDock").querySelectorAll(".pcdi")] : [];
  const dockSpot = (k) => {
    const el = document.querySelector(`#pcDock [data-pcrest="${k}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      };
    }
    return {
      x: innerWidth - 50,
      y: innerHeight / 2,
    };
  };
  const snap = () =>
    new Map([...document.querySelectorAll("#v-home .hblock")].map((t) => [t.dataset.hb, t.getBoundingClientRect()]));
  function glide(before, skip) {
    document.querySelectorAll("#v-home .hblock").forEach((t) => {
      if (t.dataset.hb === skip) return;
      const a = before.get(t.dataset.hb);
      if (!a) return;
      const r = t.getBoundingClientRect(),
        dx = a.left - r.left,
        dy = a.top - r.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1)
        t.animate(
          [
            {
              transform: `translate(${dx}px,${dy}px)`,
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 420,
            easing: "cubic-bezier(.2,.8,.2,1)",
          }
        );
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pcmin]");
    if (!b) return;
    const k = b.dataset.pcmin,
      tile = b.closest(".hblock");
    if (!tile || PC_ANIM.busy) return;
    const r = tile.getBoundingClientRect(),
      h = PCH(),
      before = snap();
    if (!h.min.includes(k)) h.min.push(k);
    const fly = tile.cloneNode(true);
    fly.classList.add("pcfly");
    Object.assign(fly.style, {
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
      height: r.height + "px",
    });
    document.body.appendChild(fly);
    tile.remove();
    save();
    glide(before, k);
    const di = document.querySelector(`#pcDock [data-pcrest="${k}"]`);
    if (di) di.style.opacity = "0";
    const t = dockSpot(k),
      dx = t.x - (r.left + r.width / 2),
      dy = t.y - (r.top + r.height / 2),
      sc = Math.max(0.06, 52 / Math.max(r.width, r.height));
    fly
      .animate(
        [
          {
            transform: "none",
            opacity: 1,
            borderRadius: "24px",
          },
          {
            transform: "translateY(-18px) scale(1.04) rotate(-3deg)",
            opacity: 1,
            offset: 0.18,
          },
          {
            transform: `translate(${dx * 0.4}px,${dy * 0.4 - 40}px) scale(.55) rotate(-8deg)`,
            opacity: 1,
            offset: 0.55,
          },
          {
            transform: `translate(${dx}px,${dy}px) scale(${sc}) rotate(10deg)`,
            opacity: 0.15,
            borderRadius: "50%",
          },
        ],
        {
          duration: 680,
          easing: "cubic-bezier(.45,0,.2,1)",
          fill: "forwards",
        }
      )
      .finished.then(() => {
        fly.remove();
        const d2 = document.querySelector(`#pcDock [data-pcrest="${k}"]`);
        if (d2) {
          d2.style.opacity = "";
          d2.animate(
            [
              {
                transform: "scale(.3)",
              },
              {
                transform: "scale(1.25)",
                offset: 0.6,
              },
              {
                transform: "none",
              },
            ],
            {
              duration: 420,
              easing: "cubic-bezier(.3,.7,.3,1)",
            }
          );
        }
      });
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pcrest]");
    if (!b || PC_ANIM.busy) return;
    const k = b.dataset.pcrest,
      from = b.getBoundingClientRect(),
      h = PCH(),
      before = snap();
    h.min = h.min.filter((x) => x !== k);
    save();
    glide(before, k);
    const tile = document.querySelector(`#v-home .hblock[data-hb="${k}"]`);
    if (!tile) return;
    const r = tile.getBoundingClientRect();
    if (r.bottom > innerHeight - 50 || r.top < 120) {
      tile.scrollIntoView({
        block: "center",
      });
    }
    const r2 = tile.getBoundingClientRect(),
      dx = from.left + from.width / 2 - (r2.left + r2.width / 2),
      dy = from.top + from.height / 2 - (r2.top + r2.height / 2),
      sc = Math.max(0.06, 52 / Math.max(r2.width, r2.height));
    tile.animate(
      [
        {
          transform: `translate(${dx}px,${dy}px) scale(${sc}) rotate(10deg)`,
          opacity: 0.3,
          borderRadius: "50%",
        },
        {
          transform: "translate(0,-14px) scale(1.03) rotate(-1.5deg)",
          opacity: 1,
          offset: 0.7,
        },
        {
          transform: "none",
          opacity: 1,
        },
      ],
      {
        duration: 700,
        easing: "cubic-bezier(.3,.7,.3,1)",
      }
    );
  });
  let D = null;
  const tiles = () => [...document.querySelectorAll("#v-home .hcol > .hblock, #v-home .hlist > .hblock")];
  function flip(move) {
    const els = tiles().filter((t) => t !== D.ph),
      before = new Map(els.map((t) => [t, t.getBoundingClientRect()]));
    move();
    for (const t of els) {
      const a = before.get(t),
        b = t.getBoundingClientRect();
      const dx = a.left - b.left,
        dy = a.top - b.top;
      if (dx || dy)
        t.animate(
          [
            {
              transform: `translate(${dx}px,${dy}px)`,
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 260,
            easing: "cubic-bezier(.2,.8,.2,1)",
          }
        );
    }
  }
  document.addEventListener("pointerdown", (e) => {
    const g = e.target.closest("[data-pcgrip]");
    if (!g || e.button > 0) return;
    const tile = g.closest(".hblock");
    if (!tile) return;
    e.preventDefault();
    const r = tile.getBoundingClientRect();
    const ph = document.createElement("div");
    ph.className = "hblock pcph";
    ph.style.height = r.height + "px";
    const fly = tile.cloneNode(true);
    fly.classList.add("pcfly", "pclift");
    Object.assign(fly.style, {
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
      height: r.height + "px",
    });
    document.body.appendChild(fly);
    tile.replaceWith(ph);
    D = {
      tile,
      ph,
      fly,
      ox: e.clientX - r.left,
      oy: e.clientY - r.top,
      id: e.pointerId,
      last: 0,
    };
    fly.animate(
      [
        {
          transform: "none",
        },
        {
          transform: "rotate(-2deg) scale(1.03)",
        },
      ],
      {
        duration: 180,
        fill: "forwards",
        easing: "ease-out",
      }
    );
    document.documentElement.classList.add("pcdragging");
  });
  document.addEventListener("pointermove", (e) => {
    if (!D || e.pointerId !== D.id) return;
    D.fly.style.left = e.clientX - D.ox + "px";
    D.fly.style.top = e.clientY - D.oy + "px";
    if (e.clientY > innerHeight - 70) scrollBy(0, 14);
    else if (e.clientY < 130) scrollBy(0, -14);
    const now = Date.now();
    if (now - D.last < 60) return;
    D.last = now;
    const over = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((x) => x.matches && x.matches("#v-home .hcol > .hblock, #v-home .hlist > .hblock") && x !== D.ph);
    if (!over) return;
    const ro = over.getBoundingClientRect(),
      after = e.clientY > ro.top + ro.height / 2;
    if ((after && over.nextElementSibling === D.ph) || (!after && over.previousElementSibling === D.ph)) return;
    flip(() => over.insertAdjacentElement(after ? "afterend" : "beforebegin", D.ph));
  });
  const drop = (e) => {
    if (!D || (e && e.pointerId !== D.id)) return;
    const { tile, ph, fly } = D;
    D = null;
    document.documentElement.classList.remove("pcdragging");
    const r = ph.getBoundingClientRect(),
      f = fly.getBoundingClientRect();
    fly.getAnimations().forEach((a) => a.cancel());
    fly
      .animate(
        [
          {
            transform: "rotate(-2deg) scale(1.03)",
          },
          {
            transform: `translate(${r.left - f.left}px,${r.top - f.top}px) rotate(1deg) scale(.99)`,
            offset: 0.8,
          },
          {
            transform: `translate(${r.left - f.left}px,${r.top - f.top}px)`,
          },
        ],
        {
          duration: 280,
          easing: "cubic-bezier(.2,.8,.2,1)",
          fill: "forwards",
        }
      )
      .finished.then(() => {
        ph.replaceWith(tile);
        fly.remove();
        tile.animate(
          [
            {
              transform: "scale(.98)",
            },
            {
              transform: "scale(1.01)",
              offset: 0.5,
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 260,
          }
        );
        const dom = tiles().map((t) => t.dataset.hb),
          min = PCH().min,
          it = dom[Symbol.iterator]();
        PCH().order = homeOrder().map((k) => (min.includes(k) || !dom.includes(k) ? k : it.next().value));
        save();
      });
  };
  document.addEventListener("pointerup", drop);
  document.addEventListener("pointercancel", drop);
  addEventListener("blur", () => drop());
  decorate();
}
/* Hell / Dunkel */
if (IS_PC) {
  const _k3 = accTabKeys;
  accTabKeys = (t) => _k3(t).filter((k) => k !== "dark");
  const bell = $("bellBtn");
  if (bell && !$("pcTheme"))
    bell.insertAdjacentHTML(
      "beforebegin",
      `<button class="roundbtn pctheme" id="pcTheme" aria-label="Hell oder dunkel" title="Hell / Dunkel">
    <svg viewBox="0 0 24 24" class="pcsm"><mask id="pcMoonCut"><rect x="0" y="0" width="24" height="24" fill="#fff"/><circle class="pccut" cx="24" cy="4" r="7" fill="#000"/></mask>
      <circle class="pcorb" cx="12" cy="12" r="5" mask="url(#pcMoonCut)"/>
      <g class="pcrays"><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></g></svg></button>`
    );
  const isDark = () => document.documentElement.dataset.theme === "dark";
  const sync = () => {
    const b = $("pcTheme");
    if (b) {
      b.setAttribute("aria-pressed", String(isDark()));
      b.title = isDark() ? "Hell schalten" : "Dunkel schalten";
    }
  };
  sync();
  document.addEventListener("click", (e) => {
    const b = e.target.closest("#pcTheme");
    if (!b) return;
    const t = isDark() ? "light" : "dark",
      r = b.getBoundingClientRect(),
      x = r.left + r.width / 2,
      y = r.top + r.height / 2;
    try {
      SND.play("glide");
    } catch (_) {}
    const apply = () => {
      document.documentElement.dataset.theme = t;
      try {
        localStorage.setItem("hb-theme", t);
      } catch (_) {}
      sync();
      try {
        render();
      } catch (_) {}
    };
    b.animate(
      [
        {
          transform: "rotate(0) scale(1)",
        },
        {
          transform: "rotate(-25deg) scale(.86)",
          offset: 0.4,
        },
        {
          transform: "rotate(0) scale(1)",
        },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(.3,.7,.3,1)",
      }
    );
    if (document.startViewTransition && !pcCalm()) {
      const vt = document.startViewTransition(apply);
      vt.ready
        .then(() => {
          const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
          document.documentElement.animate(
            {
              clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`],
            },
            {
              duration: 650,
              easing: "cubic-bezier(.4,0,.2,1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {});
    } else apply();
  });
}
/* + Knopf */
if (IS_PC) {
  const fan = $("fanBg"),
    rc = fan && fan.querySelector('[data-addpick="receipt"]');
  if (rc && IS_DESK) {
    rc.dataset.addpick = "pcscan";
    rc.innerHTML = `<svg class="i" viewBox="0 0 24 24"><path d="M4 14h16v4.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M6 14 8.5 5.5h7L18 14"/><path d="M7.5 17h3"/></svg><span>Scannen</span>`;
  }
  openAddMenu = () => {
    if (!fan.hidden) {
      fanClose();
      return;
    }
    if (IS_DESK && window.pcFanOpen) {
      window.pcFanOpen();
      return;
    }
    fanOpen();
    if (IS_TAB) return;
    const R = 140;
    [180, 135, 90].forEach((a, i) => {
      const t = (a * Math.PI) / 180,
        b = fan.children[i];
      b.style.setProperty("--dx", Math.round(Math.cos(t) * R) + "px");
      b.style.setProperty("--dy", Math.round(-Math.sin(t) * R - 14) + "px");
    });
  };
  const SCANW = {};
  window.hbScanDone = (id, data, err) => {
    const f = SCANW[id];
    if (f) {
      delete SCANW[id];
      f(data, err);
    }
  };
  const scanNow = () =>
    new Promise((ok) => {
      const id = newId();
      SCANW[id] = (d, e) =>
        ok({
          d,
          e,
        });
      window.AndroidBridge.scan(id);
    });
  const PCSCAN = {
    on: false,
  };
  function pcScanTexts(on) {
    PCSCAN.on = on;
    const t = document.querySelector("#docRev .drtop b"),
      r = $("drRetake"),
      d = $("docRev");
    if (t) t.textContent = on ? "Scan prüfen" : "Foto prüfen";
    if (r) r.textContent = on ? "Neu scannen" : "Neu aufnehmen";
    if (d) d.setAttribute("aria-label", on ? "Scan prüfen" : "Foto prüfen");
  }
  const _dc = drChecks;
  drChecks = () => {
    if (!PCSCAN.on) return _dc();
    const A = DR.A,
      info = DR.info,
      blank = A.sharp < 8 && A.light > 190,
      R = [];
    R.push(["Scanner", ...(blank ? ["bad", "Seite leer", "nichts erkannt"] : ["good", "Gescannt", "300 dpi"])]);
    R.push([
      "Beleg",
      ...(A.found ? ["good", "Gefunden", "4 Ecken"] : ["warn", "Nicht gefunden", "Ecken an den Beleg ziehen"]),
    ]);
    if (info.lines) {
      const n = info.lines.length,
        r = n ? parseReceipt(info.lines) : {};
      R.push([
        "Text",
        ...(!n
          ? ["bad", "Kein Text", ""]
          : r.amount == null
            ? ["warn", `${n} Zeilen`, "kein Betrag"]
            : ["good", `${n} Zeilen`, "Betrag gefunden"]),
      ]);
    }
    $("drChecks").innerHTML = R.map(
      ([t, lv, a, b]) =>
        `<div class="drc ${lv}"><i></i><span><small>${t}</small><b>${a}</b>${b ? `<em>${b}</em>` : ""}</span></div>`
    ).join("");
    const tips = [];
    if (blank)
      tips.push(
        "Die Seite ist leer – leg den Beleg mit der Schrift nach unten auf die Glasscheibe und klicke auf „Neu scannen“."
      );
    else if (!A.found) tips.push("Zieh die gelben Ecken an den Rand des Belegs, dann wird nur der Beleg übernommen.");
    $("drTip").textContent = tips.join(" ");
    $("drTip").hidden = !tips.length;
  };
  async function pcScan() {
    if (!window.AndroidBridge || !window.AndroidBridge.scan) {
      toast(
        "Für den Scanner einmal die neue PC-App installieren – bis dahin kannst du ein Bild auswählen",
        null,
        null,
        7000
      );
      return smartScanFallback({});
    }
    toast("Scanner läuft … Beleg bitte auflegen", null, null, 60000);
    const { d, e } = await scanNow();
    if (!d) {
      toast(
        e === "noscanner"
          ? "Kein Scanner gefunden – ist er eingeschaltet und angeschlossen?"
          : "Scannen hat nicht geklappt: " + e,
        e === "noscanner" ? () => smartScanFallback({}) : null,
        e === "noscanner" ? "Bild wählen" : null,
        9000
      );
      return;
    }
    toast("Gescannt", null, null, 1200);
    try {
      let img = d;
      try {
        const blob = await (await fetch(d)).blob();
        img = await shrinkImage(
          new File([blob], "scan.jpg", {
            type: "image/jpeg",
          })
        );
      } catch (_) {}
      pcScanTexts(true);
      let rv;
      try {
        rv = await docReview(img, {});
      } finally {
        pcScanTexts(false);
      }
      if (!rv) return;
      if (rv.action === "retake") return pcScan();
      img = rv.img;
      scanWorking(true);
      const lines = await ocrDataUrl(img);
      scanWorking(false);
      const im = await loadImg(img),
        r = docClassify(lines || [], im.naturalHeight / im.naturalWidth);
      camReview({
        type: (r && r.type) || "rcpt",
        img,
        lines: lines || [],
        W: im.naturalWidth,
        H: im.naturalHeight,
        noBoxes: false,
      });
    } catch (x) {
      scanWorking(false);
      toast(x.message || "Der Scan konnte nicht gelesen werden");
    }
  }
  document.addEventListener(
    "click",
    (e) => {
      const b = e.target.closest('[data-addpick="pcscan"]');
      if (!b) return;
      e.stopImmediatePropagation();
      closeAddMenu();
      setTimeout(pcScan, 120);
    },
    true
  );
}
if (IS_PC) {
  const av = () => {
    try {
      renderAvatar();
    } catch (_) {}
  };
  const _r2 = render;
  render = (...a) => {
    const x = _r2(...a);
    try {
      av();
    } catch (e) {}
    return x;
  };
  av();
}

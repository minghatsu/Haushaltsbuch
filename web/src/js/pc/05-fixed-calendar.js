/* Fixkosten-Kalender */
if (IS_PC) {
  const F = {
    pop: null,
    ring: 0,
    drag: null,
    fresh: null,
    gone: null,
    first: true,
  };
  const FCOL = {
    Wohnen: "#2f7d5b",
    Schulden: "#b5473a",
    Auto: "#c27c0e",
    Versicherung: "#5b7f95",
    "Sparen & Vorsorge": "#3d63a8",
    "Abos & Handy": "#d14d72",
    Betrieb: "#6b5bb0",
    Sonstiges: "#0e8aa0",
  };
  const FIC = {
    Wohnen: "home",
    Schulden: "bank",
    Auto: "car",
    Versicherung: "shield",
    "Sparen & Vorsorge": "piggy",
    "Abos & Handy": "phone",
    Betrieb: "case",
    Sonstiges: "dots",
  };
  const SV = {
    pen: `<svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></svg>`,
    bin: `<svg class="i" viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6.5 7l1 12.5h9L17.5 7M9.5 7V4.5h5V7"/></svg>`,
    x: `<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
    plus: `<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  };
  const col = (a) => FCOL[a] || "#0e8aa0";
  const E = "cubic-bezier(.2,.8,.2,1)",
    BO = "cubic-bezier(.3,1.5,.5,1)";
  const dayOf = (f, ym) => {
    const D = daysIn(ym);
    let d = null;
    if (Array.isArray(f.days) && f.days.length) {
      for (const e of f.days) if (e.from <= ym) d = e.day;
    }
    if (d == null && f.day >= 1) d = f.day;
    if (d == null) d = fixDay(f, ym);
    return d >= 1 ? Math.min(D, d | 0) : null;
  };
  const withDay = (f, ym, day) => {
    const base =
      Array.isArray(f.days) && f.days.length
        ? f.days
        : f.day >= 1
          ? [
              {
                from: "0000-00",
                day: f.day | 0,
              },
            ]
          : [];
    const p = base.filter((e) => e.from < ym);
    p.push({
      from: ym,
      day: day || 0,
    });
    return p;
  };
  const clean = (f) => {
    const d = {
      ...f,
    };
    delete d.id;
    return d;
  };
  const _rf = renderFix;
  renderFix = function () {
    if (ui.fixEdit) {
      $("v-fix").classList.remove("pcfcal");
      return _rf();
    }
    if (($("v-fix").contains(document.activeElement) && document.activeElement.id === "fxAmtIn") || pdHold($("v-fix")))
      return;
    const ym = ui.ym,
      c = monthCalc(ym),
      paid = c.paid || {},
      cur = ymOf(new Date()),
      today = ym === cur ? new Date().getDate() : ym < cur ? 99 : 0;
    const mName = MONTHS[ymParts(ym)[1] - 1],
      D = daysIn(ym),
      [y, m] = ymParts(ym),
      first = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const all = fixedSorted().filter((f) => dueIn(f, ym) || f.id in paid);
    const amtOf = (f) => (f.id in paid ? Number(paid[f.id]) || 0 : planAmt(f, ym));
    const total = sum(all, amtOf),
      pSum = sum(
        all.filter((f) => f.id in paid),
        amtOf
      ),
      nPaid = all.filter((f) => f.id in paid).length;
    const by = {},
      none = [];
    for (const f of all) {
      const d = dayOf(f, ym);
      if (d) (by[d] = by[d] || []).push(f);
      else none.push(f);
    }
    const byAcc = fxAcctOn() && store.settings.fxColBy === "konto";
    const chip = (f) => {
      const on = f.id in paid,
        a = fixArea(f),
        d = dayOf(f, ym),
        late = !on && d && d < today,
        ed = ui.amtEdit === f.id;
      return `<div class="pcfc ${on ? "on" : ""} ${late ? "late" : ""} ${byAcc ? "acc" : ""}" style="--c:${byAcc ? fxCol(fxAcct(f)) : col(a)}" data-pay="${escHtml(f.id)}" data-pcfid="${escHtml(f.id)}" draggable="${ed ? "false" : "true"}" role="checkbox" tabindex="0" aria-checked="${on}" title="${escHtml(f.name)} · ${escHtml(a)}${fxAcctOn() ? " · " + escHtml(fxAcct(f)) : ""}${late ? " · überfällig" : ""}">
        ${brandFor(f.name) ? brandBadge(brandFor(f.name)) : tile(f.kind === "betrieb" ? "betrieb" : "fix", f.name)}<span class="n" lang="de">${escHtml(f.name)}</span>
        ${ed ? `<input class="in fxamt-in" id="fxAmtIn" data-fxamtin="${escHtml(f.id)}" inputmode="decimal" value="${escHtml(numStr(amtOf(f)))}" aria-label="Betrag für ${escHtml(f.name)} im ${escHtml(mName)}">` : `<button class="a" data-fxamt="${escHtml(f.id)}" title="Betrag nur für ${escHtml(mName)} ändern">${escHtml(fmtEur(amtOf(f)))}</button>`}
        <i class="ck"></i><button class="pe" data-pcfedit="${escHtml(f.id)}" title="Bearbeiten" aria-label="${escHtml(f.name)} bearbeiten">${SV.pen}</button></div>`;
    };
    let cells = "";
    for (let i = 0; i < first; i++) cells += `<div class="pcfd x"></div>`;
    for (let d = 1; d <= D; d++) {
      const fs = by[d] || [],
        s = sum(fs, amtOf),
        wd = (first + d - 1) % 7;
      cells += `<div class="pcfd ${d === today ? "today" : ""} ${wd > 4 ? "we" : ""}" data-pcfday="${d}"><div class="dh"><b>${pad(d)}</b>${s ? `<span>${escHtml(fmtEur0(s))}</span>` : ""}</div>${fs.map(chip).join("")}<button class="pcfadd" data-pcfnew="${d}" title="Fixkosten am ${d}. eintragen" aria-label="Fixkosten am ${d}. eintragen">${SV.plus}</button></div>`;
    }
    const wk = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => `<span>${w}</span>`).join("");
    const soon =
      ym === cur
        ? all
            .filter((f) => !(f.id in paid))
            .map((f) => ({
              f,
              d: dayOf(f, ym),
            }))
            .filter((x) => x.d && x.d >= today && x.d <= today + 6)
        : [];
    const groups = {};
    for (const f of all) (groups[fixArea(f)] = groups[fixArea(f)] || []).push(f);
    const gl = Object.entries(groups)
      .sort((a, b) => sum(b[1], amtOf) - sum(a[1], amtOf))
      .map(([a, fs]) => {
        const p = fs.filter((f) => f.id in paid).length;
        return `<div class="gl" style="--c:${col(a)}"><span class="gi">${svgIcon(FIC[a] || "dots", 17)}</span><span class="gn"><span>${escHtml(a)}</span><i class="gb"><i style="width:${Math.round((p / fs.length) * 100)}%"></i></i></span><small>${p}/${fs.length}</small><b>${escHtml(fmtEur0(sum(fs, amtOf)))}</b></div>`;
      })
      .join("");
    const R = 50,
      C = 2 * Math.PI * R,
      pct = total ? pSum / total : 0;
    $("v-fix").classList.add("pcfcal");
    $("v-fix").innerHTML = `
      <div class="card pcfcalc">${
        fxAcctOn()
          ? `<div class="pcfleg"><span class="pcfseg" role="group" aria-label="${escHtml(uiText("fxa_col"))}"><button data-fxcol="bereich" aria-pressed="${!byAcc}">${escHtml(uiText("fxa_col"))}: ${escHtml(uiText("fxa_area"))}</button><button data-fxcol="konto" aria-pressed="${byAcc}">${escHtml(uiText("fxa_col"))}: ${escHtml(uiText("fxa_acct"))}</button></span>${
              byAcc
                ? fxAcctStats(ym)
                    .filter((x) => x.items.length || x.n === "Hauptkonto")
                    .map(
                      (x) =>
                        `<span class="pcfacc"><i style="background:${fxCol(x.n)}"></i>${escHtml(x.n)} · <b>${escHtml(fmtEur0(x.total))}</b></span>`
                    )
                    .join("")
                : ""
            }</div>`
          : ""
      }<div class="wd">${wk}</div><div class="grid">${cells}</div></div>
      <div class="pcfside">
        <div class="card pcfsum"><span class="small muted">Im ${escHtml(mName)} fest verplant</span><div class="big" data-v="${total}">${escHtml(fmtEur0(total))}</div>
          <div class="pcfring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" class="bg"/><circle cx="60" cy="60" r="${R}" class="fg" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - F.ring)).toFixed(1)}" data-to="${(C * (1 - pct)).toFixed(1)}"/></svg>
            <div><b>${escHtml(fmtEur0(pSum))}</b><span class="small muted">bezahlt · ${nPaid} von ${all.length}</span></div></div>
          <div class="kv"><span>Noch offen</span><b>${escHtml(fmtEur0(total - pSum))}</b></div>
          ${ym === cur ? `<div class="kv"><span>In den nächsten 7 Tagen</span><b>${soon.length ? `${soon.length} <span>Posten</span> · ${escHtml(fmtEur0(sum(soon, (x) => amtOf(x.f))))}` : "nichts"}</b></div>` : ""}
          <div class="row-btns">${all.length && nPaid < all.length ? `<button class="btn" id="payAll">Alle abhaken</button>` : ""}<button class="btn" id="fixEditBtn">Liste bearbeiten</button></div></div>
        ${gl ? `<div class="card pcfgr"><div class="small muted" style="margin-bottom:6px">Gruppen</div>${gl}</div>` : ""}
        <div class="card pcfnone" data-pcfday="0"><div class="small muted"><b>Ohne festen Tag</b> · <span>${none.length ? "auf einen Tag im Kalender ziehen" : "hierher ziehen, um den Tag zu entfernen"}</span></div>${none.map(chip).join("")}<button class="pcfadd wide" data-pcfnew="0">${SV.plus}<span>Neue Fixkosten</span></button></div>
        <div class="small muted pcfhint">Klick = abhaken · Stift = bearbeiten · Ziehen = Tag ändern · + im Tag = neu eintragen</div>
      </div>`;
    const calm = pcCalm(),
      root = $("v-fix");
    requestAnimationFrame(() => {
      const r = root.querySelector(".pcfring .fg");
      if (r) r.style.strokeDashoffset = r.dataset.to;
      F.ring = pct;
      if (!calm) {
        const q = (id) => root.querySelector(`[data-pcfid="${CSS.escape(id)}"]`);
        if (F.pop) {
          const el = q(F.pop);
          if (el) {
            el.animate(
              el.classList.contains("on")
                ? [
                    {
                      transform: "scale(1)",
                    },
                    {
                      transform: "scale(1.09)",
                    },
                    {
                      transform: "scale(1)",
                    },
                  ]
                : [
                    {
                      transform: "scale(.93)",
                    },
                    {
                      transform: "scale(1)",
                    },
                  ],
              {
                duration: 380,
                easing: BO,
              }
            );
            const k = el.querySelector(".ck");
            if (k && el.classList.contains("on"))
              k.animate(
                [
                  {
                    transform: "scale(0) rotate(-90deg)",
                  },
                  {
                    transform: "scale(1.25)",
                  },
                  {
                    transform: "none",
                  },
                ],
                {
                  duration: 420,
                  easing: BO,
                }
              );
          }
        }
        if (F.fresh) {
          const el = q(F.fresh);
          if (el) {
            el.animate(
              [
                {
                  opacity: 0,
                  transform: "translateY(-26px) scale(.7)",
                },
                {
                  opacity: 1,
                  transform: "translateY(3px) scale(1.03)",
                  offset: 0.7,
                },
                {
                  opacity: 1,
                  transform: "none",
                },
              ],
              {
                duration: 520,
                easing: E,
              }
            );
            const cell = el.closest(".pcfd,.pcfnone");
            if (cell)
              cell.animate(
                [
                  {
                    boxShadow: "inset 0 0 0 2px var(--accent)",
                  },
                  {
                    boxShadow: "inset 0 0 0 2px #1a7a5c00",
                  },
                ],
                {
                  duration: 900,
                  easing: "ease-out",
                }
              );
          }
        }
      }
      F.pop = null;
      F.fresh = null;
    });
  };
  const root = $("v-fix");
  // Intro
  function enter() {
    if (pcCalm() || !root.classList.contains("pcfcal")) return;
    const cells = [...root.querySelectorAll(".pcfd")],
      chips = [...root.querySelectorAll(".pcfcalc .pcfc")],
      side = [...root.querySelectorAll(".pcfside>*")];
    const cal = root.querySelector(".pcfcalc"),
      cols = 7;
    const ring = root.querySelector(".pcfring .fg"),
      bars = [...root.querySelectorAll(".pcfgr .gb>i")],
      big = root.querySelector(".pcfsum .big");
    if (cal)
      cal.animate(
        [
          {
            opacity: 0,
          },
          {
            opacity: 1,
          },
        ],
        {
          duration: 260,
          easing: "ease-out",
          fill: "backwards",
        }
      );
    {
      cells.forEach((el, i) => {
        const r = Math.floor(i / cols),
          c = i % cols;
        el.style.transformOrigin = "50% 0";
        el.animate(
          [
            {
              opacity: 0,
              transform: "perspective(700px) rotateX(-88deg)",
            },
            {
              opacity: 1,
              transform: "perspective(700px) rotateX(8deg)",
              offset: 0.7,
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 560,
            delay: 80 + r * 90 + c * 28,
            easing: E,
            fill: "backwards",
          }
        );
      });
      chips.forEach((el) => {
        const i = cells.indexOf(el.closest(".pcfd")),
          r = Math.floor(i / cols),
          c = i % cols;
        el.animate(
          [
            {
              opacity: 0,
              transform: "translateY(-14px) scale(.85)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 380,
            delay: 420 + r * 90 + c * 28,
            easing: BO,
            fill: "backwards",
          }
        );
      });
    }
    side.forEach((el, i) =>
      el.animate(
        [
          {
            opacity: 0,
            transform: "translateX(70px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 520,
          delay: 120 + i * 90,
          easing: E,
          fill: "backwards",
        }
      )
    );
    if (ring) {
      const C = ring.style.strokeDasharray;
      ring.animate(
        [
          {
            strokeDashoffset: C,
          },
          {
            strokeDashoffset: ring.dataset.to,
          },
        ],
        {
          duration: 1100,
          delay: 350,
          easing: E,
          fill: "backwards",
        }
      );
    }
    bars.forEach((el, i) =>
      el.animate(
        [
          {
            width: "0%",
          },
          {
            width: el.style.width,
          },
        ],
        {
          duration: 800,
          delay: 450 + i * 70,
          easing: E,
          fill: "backwards",
        }
      )
    );
    if (big) {
      const to = Number(big.dataset.v) || 0,
        t0 = performance.now() + 250,
        txt = big.textContent;
      const step = (t) => {
        const k = Math.min(1, Math.max(0, (t - t0) / 900)),
          e = 1 - Math.pow(1 - k, 3);
        big.textContent = fmtEur0(to * e);
        if (k < 1) requestAnimationFrame(step);
        else big.textContent = txt;
      };
      requestAnimationFrame(step);
    }
  }
  new MutationObserver(() => {
    if (!root.hidden) requestAnimationFrame(enter);
  }).observe(root, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
  // Abhaken
  root.addEventListener(
    "click",
    (e) => {
      const ed = e.target.closest("[data-pcfedit]");
      if (ed) {
        e.stopPropagation();
        e.preventDefault();
        popEdit(ed.dataset.pcfedit, ed.closest(".pcfc"));
        return;
      }
      const nw = e.target.closest("[data-pcfnew]");
      if (nw) {
        e.stopPropagation();
        e.preventDefault();
        popNew(+nw.dataset.pcfnew, nw);
        return;
      }
      const p = e.target.closest("[data-pay]");
      if (p && !e.target.closest("[data-fxamt],#fxAmtIn")) F.pop = p.dataset.pay;
    },
    true
  );
  root.addEventListener("contextmenu", (e) => {
    const c = e.target.closest(".pcfc");
    if (c) {
      e.preventDefault();
      popEdit(c.dataset.pcfid, c);
    }
  });
  root.addEventListener("keydown", (e) => {
    const p = e.target.closest && e.target.closest(".pcfc");
    if (!p || e.target !== p) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      p.click();
    } else if (e.key === "F2" || e.key === "e") {
      e.preventDefault();
      popEdit(p.dataset.pcfid, p);
    } else if (e.key === "Delete") {
      e.preventDefault();
      popEdit(p.dataset.pcfid, p, true);
    }
  });
  // Ziehen
  let ghost = null;
  root.addEventListener("dragstart", (e) => {
    const c = e.target.closest && e.target.closest(".pcfc");
    if (!c) return;
    if (e.target.closest("input,textarea,select") || c.querySelector("#fxAmtIn")) {
      e.preventDefault();
      return;
    }
    popClose();
    F.drag = c.dataset.pcfid;
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", F.drag);
    } catch (_) {}
    ghost = c.cloneNode(true);
    ghost.classList.add("pcfghost");
    ghost.style.width = c.offsetWidth + "px";
    document.body.appendChild(ghost);
    try {
      e.dataTransfer.setDragImage(ghost, 24, 18);
    } catch (_) {}
    const id = F.drag;
    setTimeout(() => {
      if (F.drag !== id) return;
      c.classList.add("drag");
      root.classList.add("dragging");
    }, 0);
  });
  const unDrag = () => {
    F.drag = null;
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
    document.querySelectorAll(".pcfghost").forEach((x) => x.remove());
    root.classList.remove("dragging");
    root.querySelectorAll(".drag,.over").forEach((x) => x.classList.remove("drag", "over"));
    root.querySelectorAll(".pcfc,.pcfadd").forEach((x) => {
      if (x.style.pointerEvents === "none" && !x.getAnimations().length) x.style.pointerEvents = "";
    });
  };
  root.addEventListener("dragend", unDrag);
  document.addEventListener(
    "mousedown",
    () => {
      if (F.drag || root.classList.contains("dragging")) unDrag();
    },
    true
  );
  const wake = () => {
    if (document.visibilityState === "hidden") return;
    unDrag();
    if (!pop.hidden) {
      const a = document.activeElement;
      if (!a || a === document.body || !pop.contains(a)) {
        const i = pop.querySelector("input,select");
        if (i)
          i.focus({
            preventScroll: true,
          });
      }
    }
  };
  addEventListener("focus", wake);
  document.addEventListener("visibilitychange", wake);
  root.addEventListener("dragover", (e) => {
    if (!F.drag) return;
    const d = e.target.closest("[data-pcfday]");
    if (!d || d.classList.contains("x")) return;
    e.preventDefault();
    root.querySelectorAll(".over").forEach((x) => x !== d && x.classList.remove("over"));
    d.classList.add("over");
  });
  root.addEventListener("dragleave", (e) => {
    const d = e.target.closest("[data-pcfday]");
    if (d && !d.contains(e.relatedTarget)) d.classList.remove("over");
  });
  root.addEventListener("drop", async (e) => {
    const d = e.target.closest("[data-pcfday]"),
      id = F.drag;
    if (!d || !id) return;
    e.preventDefault();
    F.drag = null;
    const f = store.fixed.find((x) => x.id === id);
    if (!f) return;
    const n = +d.dataset.pcfday,
      ym = ui.ym;
    if ((dayOf(f, ym) || 0) === n) {
      renderFix();
      return;
    }
    const before = clean(f),
      data = clean(f);
    data.days = withDay(f, ym, n);
    delete data.day;
    F.fresh = id;
    if (await safe(() => saveDoc("fixed", id, data)))
      toast(
        n ? `${f.name}: ab ${monthName(ym)} am ${n}.` : `${f.name}: ohne festen Tag`,
        () => safe(() => saveDoc("fixed", id, before)),
        "Rückgängig"
      );
  });
  // Editor
  const pop = document.createElement("div");
  pop.id = "pcfPop";
  pop.className = "pcfpop";
  pop.hidden = true;
  document.body.appendChild(pop);
  let popFor = null;
  function place(anchor) {
    const r = anchor.getBoundingClientRect(),
      w = pop.offsetWidth,
      h = pop.offsetHeight;
    let x = r.left + r.width / 2 - w / 2,
      yy = r.bottom + 10,
      up = false;
    x = Math.max(12, Math.min(innerWidth - w - 12, x));
    if (yy + h > innerHeight - 50) {
      yy = r.top - h - 10;
      up = true;
    }
    pop.style.left = x + "px";
    pop.style.top = Math.max(12, yy) + "px";
    pop.style.setProperty("--ax", r.left + r.width / 2 - x + "px");
    pop.classList.toggle("up", up);
    if (!pcCalm())
      pop.animate(
        [
          {
            opacity: 0,
            transform: `translateY(${up ? 8 : -8}px) scale(.92)`,
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 260,
          easing: BO,
        }
      );
  }
  let popGen = 0;
  function popClose() {
    if (pop.hidden) return;
    const g = ++popGen,
      done = () => {
        if (g !== popGen) return;
        pop.hidden = true;
        pop.innerHTML = "";
        popFor = null;
      };
    if (pcCalm()) return done();
    pop.animate(
      [
        {
          opacity: 1,
          transform: "none",
        },
        {
          opacity: 0,
          transform: "scale(.94)",
        },
      ],
      {
        duration: 150,
        easing: "ease-in",
      }
    ).onfinish = done;
  }
  const field = (lbl, inner) => `<label class="pf"><span>${lbl}</span>${inner}</label>`;
  function form(f, day) {
    const ym = ui.ym,
      mon = monthName(ym),
      D = daysIn(ym);
    return `<div class="ph"><b>${f ? escHtml(f.name) : "Neue Fixkosten"}</b><button class="px" data-pfx aria-label="Schließen">${SV.x}</button></div>
      ${field("Name", `<input class="in" data-pf="name" value="${f ? escHtml(f.name) : ""}" placeholder="z. B. Miete, Netflix, Versicherung" autocomplete="off">`)}
      <div class="pr2">${field(`Betrag ab ${escHtml(mon)}`, `<input class="in" data-pf="amount" inputmode="decimal" value="${f ? escHtml(numStr(listAmt(f, ym))) : ""}" placeholder="0,00">`)}
        ${field(
          "Tag",
          `<select class="in" data-pf="day"><option value="0">ohne</option>${Array.from(
            {
              length: D,
            },
            (_, i) => `<option value="${i + 1}" ${day === i + 1 ? "selected" : ""}>${i + 1}.</option>`
          ).join("")}</select>`
        )}</div>
      <div class="pr2">${field(
        "Rhythmus",
        `<select class="in" data-pf="rhythm">${RHYTHMS.filter((r) => r[0] !== "monate")
          .map(
            ([k, l]) => `<option value="${k}" ${((f && f.rhythm) || "monatlich") === k ? "selected" : ""}>${l}</option>`
          )
          .join(
            ""
          )}${f && f.rhythm === "monate" ? `<option value="monate" selected>Bestimmte Monate</option>` : ""}</select>`
      )}
        ${field("Art", `<select class="in" data-pf="kind"><option value="privat" ${!f || f.kind !== "betrieb" ? "selected" : ""}>Privat</option><option value="betrieb" ${f && f.kind === "betrieb" ? "selected" : ""}>Betrieblich</option></select>`)}</div>
      ${field(escHtml(uiText("fxa_from")), `<select class="in" data-pf="acct">${[...new Set([...(kaNames().length ? kaNames() : ["Hauptkonto"]), f ? fxAcct(f) : "Hauptkonto"])].map((n) => `<option value="${escHtml(n)}" ${(f ? fxAcct(f) : "Hauptkonto") === n ? "selected" : ""}>${escHtml(n)}</option>`).join("")}<option value="__new">+ ${escHtml(uiText("fxa_new"))} …</option></select><input class="in" data-pf="acctnew" placeholder="${escHtml(uiText("fxa_new_ph"))}" maxlength="40" hidden style="margin-top:6px">`)}
      ${(() => {
        const a = (f && aboCfg()[f.id]) || {};
        return `<div class="pfsec">Vertrag <small>(optional – Erinnerung 30 Tage vor der Frist)</small></div><div class="pr2">${field("Läuft bis", `<input class="in" type="date" data-pf="aboend" value="${escHtml(a.end || "")}">`)}${field("Kündigungsfrist", `<select class="in" data-pf="abonot">${ABO_NOT.map(([v, l]) => `<option value="${v}" ${Number(a.notice || 0) === v ? "selected" : ""}>${l}</option>`).join("")}</select>`)}</div>`;
      })()}
      <div class="small muted pnote">${f ? `Änderungen gelten ab ${escHtml(mon)} – frühere Monate bleiben, wie sie waren.` : `Gilt ab ${escHtml(mon)} für alle folgenden Monate.`}</div>
      <div class="pa">${f ? `<button class="btn pdel" data-pfdel>${SV.bin}<span>Löschen</span></button>` : ""}<span style="flex:1"></span><button class="btn" data-pfx>Abbrechen</button><button class="btn primary" data-pfok>${f ? "Speichern" : "Eintragen"}</button></div>`;
  }
  function popEdit(id, anchor, del) {
    const f = store.fixed.find((x) => x.id === id);
    if (!f || !anchor) return;
    popGen++;
    pop.getAnimations().forEach((a) => a.cancel());
    popFor = {
      id,
      anchor,
    };
    pop.innerHTML = form(f, dayOf(f, ui.ym));
    pop.hidden = false;
    place(anchor);
    const el = pop.querySelector(del ? "[data-pfdel]" : "[data-pf=name]");
    if (el) {
      el.focus();
      if (el.select) el.select();
    }
  }
  const seg = (m) =>
    `<div class="rfseg"><button class="${m === "fix" ? "on" : ""}" data-pfmode="fix">📅 Fixkosten</button><button class="${m === "rate" ? "on rate" : ""}" data-pfmode="rate">🏦 Rate / Schulden</button></div>`;
  function newHtml(day, m) {
    if (m === "rate")
      return `<div class="ph"><b>Neue Rate</b><button class="px" data-pfx aria-label="Schließen">${SV.x}</button></div>${seg(m)}<div class="rfroot">${rateFormHtml(day)}</div>
      <div class="pa"><span style="flex:1"></span><button class="btn" data-pfx>Abbrechen</button><button class="btn primary rfgo" data-pfok>Rate anlegen</button></div>`;
    return form(null, day).replace("</div>", "</div>" + seg(m));
  }
  function popNew(day, anchor, m) {
    if (!anchor) return;
    popGen++;
    pop.getAnimations().forEach((a) => a.cancel());
    popFor = {
      id: null,
      day,
      anchor,
      mode: m || "fix",
    };
    pop.innerHTML = newHtml(day, popFor.mode);
    pop.hidden = false;
    place(anchor);
    const i = pop.querySelector("[data-pf=name],[data-rf=name]");
    if (i) i.focus();
  }
  const val = (k) => {
    const el = pop.querySelector(`[data-pf="${k}"]`);
    return el ? el.value : "";
  };
  function fxAcctPick() {
    const ac = pop.querySelector("[data-pf=acct]");
    if (!ac) return null;
    if (ac.value !== "__new") return ac.value || "Hauptkonto";
    const n = (pop.querySelector("[data-pf=acctnew]").value || "").trim();
    if (!n) return "Hauptkonto";
    const ex = kaAll().find((x) => normText(x) === normText(n));
    if (ex) return ex;
    store.settings.spaces = [...(store.settings.spaces || []), n];
    saveSettings();
    return n;
  }
  async function popSave() {
    if (popFor && !popFor.id && popFor.mode === "rate") {
      const r = rateRead(pop),
        err = rateCheck(r);
      if (err) {
        toast(err);
        return;
      }
      popClose();
      const n = await rateCreate(r);
      if (n) toast(`${n} als Rate eingetragen`);
      return;
    }
    const ym = ui.ym,
      name = val("name").trim(),
      v = parseAmt(val("amount") || "0"),
      day = +val("day") || 0,
      rh = val("rhythm"),
      kind = val("kind");
    if (!name) {
      const n = pop.querySelector("[data-pf=name]");
      n.focus();
      if (!pcCalm())
        n.animate(
          [
            {
              transform: "translateX(0)",
            },
            {
              transform: "translateX(-6px)",
            },
            {
              transform: "translateX(6px)",
            },
            {
              transform: "translateX(-3px)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 300,
          }
        );
      return;
    }
    if (!(v >= 0)) {
      toast("Betrag ungültig");
      return;
    }
    const nv = round2(v),
      cm = Number(ym.slice(5, 7));
    if (!popFor.id) {
      const id = newId(),
        d = {
          name,
          amount: nv,
          kind,
          order: store.fixed.length,
          from: ym,
          days: [
            {
              from: ym,
              day,
            },
          ],
        };
      {
        const ac = fxAcctPick();
        if (ac && ac !== "Hauptkonto") d.acct = ac;
      }
      if (rh !== "monatlich") {
        d.rhythm = rh;
        d.months = rhythmMonths(rh, cm);
      }
      F.fresh = id;
      const ae = val("aboend"),
        an = Number(val("abonot")) || 0;
      popClose();
      if (ae || an) {
        store.settings.abos = {
          ...(store.settings.abos || {}),
          [id]: {
            end: ae,
            notice: an,
          },
        };
        saveSettings();
      }
      if (await safe(() => saveDoc("fixed", id, d)))
        toast(`${name} eingetragen`, () => safe(() => deleteDoc("fixed", id)), "Rückgängig");
      return;
    }
    const f = store.fixed.find((x) => x.id === popFor.id);
    if (!f) {
      popClose();
      return;
    }
    {
      const ae = val("aboend"),
        an = Number(val("abonot")) || 0,
        A = {
          ...(store.settings.abos || {}),
        },
        o = A[f.id] || {};
      if ((o.end || "") !== ae || Number(o.notice || 0) !== an) {
        if (ae || an || o.abo)
          A[f.id] = {
            ...o,
            end: ae,
            notice: an,
          };
        else delete A[f.id];
        store.settings.abos = A;
        saveSettings();
      }
    }
    const before = clean(f),
      d = clean(f);
    d.name = name;
    d.kind = kind;
    {
      const ac = fxAcctPick();
      if (ac) {
        if (ac !== "Hauptkonto") d.acct = ac;
        else delete d.acct;
      }
    }
    if (Math.abs(nv - listAmt(f, ym)) > 0.004) {
      const np = withPrice(f, ym, nv);
      d.amount = np.amount;
      if (np.prices) d.prices = np.prices;
      else delete d.prices;
    }
    if ((dayOf(f, ym) || 0) !== day) {
      d.days = withDay(f, ym, day);
      delete d.day;
    }
    if (rh !== (f.rhythm || "monatlich")) {
      if (rh === "monatlich") {
        delete d.rhythm;
        delete d.months;
      } else if (rh !== "monate") {
        d.rhythm = rh;
        d.months = rhythmMonths(rh, Array.isArray(f.months) && f.months.length ? Math.min(...f.months) : cm);
      }
    }
    F.fresh = f.id;
    popClose();
    if (await safe(() => saveDoc("fixed", f.id, d)))
      toast(`${name} gespeichert`, () => safe(() => saveDoc("fixed", f.id, before)), "Rückgängig");
  }
  async function popDelete() {
    const f = store.fixed.find((x) => x.id === popFor.id);
    if (!f) return popClose();
    const ym = ui.ym,
      before = clean(f),
      anchor = popFor.anchor;
    const used =
      Object.keys(store.months).some(
        (k) => k < ym && store.months[k] && store.months[k].paid && f.id in store.months[k].paid
      ) ||
      (f.from && f.from < ym);
    popClose();
    const ticks = Object.keys(store.months)
      .filter((k) => k >= ym && store.months[k] && store.months[k].paid && f.id in store.months[k].paid)
      .map((k) => [k, clone(store.months[k])]);
    const unTick = async () => {
      for (const [k, mo] of ticks) {
        const n = clone(mo);
        delete n.paid[f.id];
        await saveDoc("months", k, n);
      }
    };
    const reTick = async () => {
      for (const [k, mo] of ticks) await saveDoc("months", k, mo);
    };
    const go = async () => {
      if (used) {
        const d = clean(f);
        d.until = shiftYm(ym, -1);
        if (
          await safe(async () => {
            await unTick();
            await saveDoc("fixed", f.id, d);
          })
        )
          toast(
            `${f.name} ab ${monthName(ym)} gelöscht`,
            () =>
              safe(async () => {
                await saveDoc("fixed", f.id, before);
                await reTick();
              }),
            "Rückgängig"
          );
      } else if (
        await safe(async () => {
          await unTick();
          await deleteDoc("fixed", f.id);
        })
      )
        toast(
          `${f.name} gelöscht`,
          () =>
            safe(async () => {
              await saveDoc("fixed", f.id, before);
              await reTick();
            }),
          "Rückgängig"
        );
    };
    if (anchor && anchor.isConnected && !pcCalm()) {
      anchor.style.pointerEvents = "none";
      const a = anchor.animate(
        [
          {
            opacity: 1,
            transform: "none",
            filter: "blur(0)",
          },
          {
            opacity: 0.9,
            transform: "scale(1.06)",
            offset: 0.25,
          },
          {
            opacity: 0,
            transform: "scale(.3) rotate(-8deg)",
            filter: "blur(3px)",
          },
        ],
        {
          duration: 380,
          easing: "cubic-bezier(.5,0,.75,0)",
          fill: "forwards",
        }
      );
      a.onfinish = go;
    } else go();
  }
  pop.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target.closest("[data-pfx]")) return popClose();
    const pm = e.target.closest("[data-pfmode]");
    if (pm && popFor && !popFor.id) {
      popFor.mode = pm.dataset.pfmode;
      pop.innerHTML = newHtml(popFor.day, popFor.mode);
      place(popFor.anchor);
      const i = pop.querySelector("[data-pf=name],[data-rf=name]");
      if (i) i.focus();
      return;
    }
    if (e.target.closest("[data-pfok]")) return popSave();
    const db = e.target.closest("[data-pfdel]");
    if (db) {
      if (db.classList.contains("arm")) return popDelete();
      db.classList.add("arm");
      db.querySelector("span").textContent = "Wirklich löschen?";
      setTimeout(() => {
        if (db.isConnected) {
          db.classList.remove("arm");
          db.querySelector("span").textContent = "Löschen";
        }
      }, 3500);
    }
  });
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      popClose();
    } else if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
      popSave();
    }
  });
  document.addEventListener(
    "mousedown",
    (e) => {
      if (!pop.hidden && !pop.contains(e.target) && !e.target.closest("[data-pcfedit],[data-pcfnew]")) popClose();
    },
    true
  );
  addEventListener("resize", () => popClose());
  document.addEventListener(
    "scroll",
    () => {
      if (!pop.hidden && popFor && popFor.anchor && popFor.anchor.isConnected) {
        const r = popFor.anchor.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) popClose();
      }
    },
    true
  );
}

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
function mvOpen() {
  let el = $("mvBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "mvBg";
    el.className = "mvbg";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "mvT");
    document.body.appendChild(el);
  }
  const fx = mvFxOk();
  el.hidden = false;
  document.body.classList.add("locked");
  mvRender(!fx);
  SND.play("whoosh");
  try {
    navigator.vibrate && navigator.vibrate(8);
  } catch (_) {}
  if (fx) mvDeal(el);
  else requestAnimationFrame(() => el.classList.add("show"));
  let n = 0;
  try {
    n = Number(localStorage.getItem("hb-mvhint")) || 0;
    localStorage.setItem("hb-mvhint", String(n + 1));
  } catch (_) {}
  el.classList.toggle("hint", n < 3);
}
function mvClose() {
  const el = $("mvBg");
  if (!el || el.hidden || el._closing) return;
  SND.play("whooshin");
  const done = () => {
    el._closing = 0;
    el.hidden = true;
    document.body.classList.remove("locked");
    document.querySelectorAll("#astack .acard,.pchero .pcaccs button").forEach((c) => {
      c.style.visibility = "";
    });
    render();
    if (MV.home) mvUnstack();
  };
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
  mvGather(el, done);
}
/* Aufklappen wie ein Kartenstapel: erst ziehen sich die Karten hinter der Hauptkarte zusammen,
     dann wird eine nach der anderen darunter ausgeteilt. Zuklappen läuft rückwärts. */
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
function mvDeal(el) {
  const H = mvFront(),
    cards = [...el.querySelectorAll(".mvc")];
  MV.home = null;
  if (!H || !cards.length) {
    requestAnimationFrame(() => el.classList.add("show"));
    return;
  }
  const fr = H.c.getBoundingClientRect();
  MV.home = {
    top: fr.top,
    left: fr.left,
    width: fr.width,
    height: fr.height,
  };
  const E1 = "cubic-bezier(.45,0,.2,1)";
  // 1) Spaces ziehen sich hinter der Hauptkarte zusammen
  H.side.forEach((c) => {
    c.animate(
      [
        {
          transform: H.to(c),
          opacity: 0.9,
        },
      ],
      {
        duration: 260,
        easing: E1,
        fill: "forwards",
      }
    );
  });
  H.c.animate(
    [
      {
        transform: "none",
      },
      {
        transform: "scale(.965)",
      },
      {
        transform: "none",
      },
    ],
    {
      duration: 300,
      easing: "ease-in-out",
    }
  );
  cards.forEach((c) => {
    c.style.opacity = "0";
  });
  const first = cards[0].getBoundingClientRect();
  setTimeout(() => {
    el.classList.add("show");
    setTimeout(() => {
      if (!el.hidden)
        [H.c, ...H.side].forEach((c) => {
          c.style.visibility = "hidden";
        });
    }, 170);
    const fl = (r, sc = 1) =>
      `translate(${MV.home.left - r.left}px,${MV.home.top - r.top}px) scale(${(MV.home.width / r.width) * sc},${(MV.home.height / r.height) * sc})`;
    cards.forEach((c, k) => {
      const r = c.getBoundingClientRect();
      c.style.opacity = "";
      c.style.transformOrigin = "0 0";
      c.style.zIndex = String(20 - k);
      const end = (a) => {
        a.onfinish = () => {
          c.style.transformOrigin = "";
          c.style.zIndex = "";
        };
      };
      if (k === 0) {
        end(
          c.animate(
            [
              {
                transform: fl(r),
              },
              {
                transform: "none",
              },
            ],
            {
              duration: 380,
              easing: "cubic-bezier(.2,.9,.3,1)",
            }
          )
        );
        return;
      }
      // hinter der ersten Karte warten, dann austeilen
      const up = `translate(${first.left - r.left + 6}px,${first.top - r.top + k * 4}px) scale(${(first.width - 12) / r.width},${Math.min(1, (first.height - 8) / r.height)})`,
        d = 380 + (k - 1) * 105,
        tot = d + 420;
      const w = (k % 2 ? -1 : 1) * 2.2;
      c.animate(
        [
          {
            transform: fl(r, 0.94),
            offset: 0,
          },
          {
            transform: up,
            offset: d / tot,
            easing: "cubic-bezier(.3,1.35,.5,1)",
          },
          {
            transform: `rotate(${w}deg)`,
            offset: (d + 260) / tot,
          },
          {
            transform: `rotate(${-w * 0.4}deg)`,
            offset: (d + 350) / tot,
          },
          {
            transform: "none",
            offset: 1,
          },
        ],
        {
          duration: tot,
          easing: "cubic-bezier(.2,.9,.3,1)",
        }
      );
      end(c.getAnimations()[0]);
      setTimeout(() => {
        if (!el.hidden) SND.play("tick");
      }, d + 180);
    });
    H.side.forEach((c) => c.getAnimations().forEach((a) => a.cancel()));
  }, 200);
}
function mvGather(el, done) {
  const cards = [...el.querySelectorAll(".mvc")],
    H = MV.home;
  if (!cards.length) {
    el.classList.remove("show");
    setTimeout(done, 320);
    return;
  }
  const first = cards[0].getBoundingClientRect(),
    n = cards.length;
  cards.forEach((c, k) => {
    if (!k) return;
    const r = c.getBoundingClientRect();
    c.style.transformOrigin = "0 0";
    c.animate(
      [
        {
          transform: "none",
        },
        {
          transform: `translate(${first.left - r.left + 6}px,${first.top - r.top + k * 4}px) scale(${(first.width - 12) / r.width},${Math.min(1, (first.height - 8) / r.height)})`,
        },
      ],
      {
        duration: 240,
        delay: (n - 1 - k) * 45,
        easing: "cubic-bezier(.5,0,.75,0)",
        fill: "forwards",
      }
    );
  });
  const wait = 240 + (n - 2) * 45;
  setTimeout(
    () => {
      const c = cards[0];
      c.style.transformOrigin = "0 0";
      el.classList.remove("show");
      c.animate(
        [
          {
            transform: "none",
          },
          {
            transform: `translate(${H.left - first.left}px,${H.top - first.top}px) scale(${H.width / first.width},${H.height / first.height})`,
          },
        ],
        {
          duration: 300,
          easing: "cubic-bezier(.2,.8,.3,1)",
          fill: "forwards",
        }
      );
      cards.slice(1).forEach((x) =>
        x.animate(
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
      );
      setTimeout(done, 300);
    },
    Math.max(0, wait)
  );
}
function mvUnstack() {
  const H = mvFront();
  if (!H) return;
  H.side.forEach((c, k) =>
    c.animate(
      [
        {
          transform: H.to(c),
          opacity: 0.9,
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
  let st = null;
  const end = () => {
    if (!st) return;
    clearTimeout(st.t);
    const d = st;
    st = null;
    if (!d.on) return;
    d.ghost.remove();
    d.src.classList.remove("src");
    document.body.classList.remove("mvdragging");
    const tg = document.querySelector("#mvBg .mvc.tgt");
    if (tg) {
      const to = +tg.dataset.mvc;
      if (!mvHas(mvList().find((x) => x.i === to))) {
        tg.classList.remove("tgt");
        toast(uiText("mv_nostand_t"));
        return;
      }
      d.src.classList.add("src");
      SND.play("pop");
      mvSheet(d.from, to);
    } else SND.play("whooshin");
    setTimeout(() => {
      MV.moved = false;
    }, 50);
  };
  document.addEventListener(
    "pointerdown",
    (e) => {
      const c = e.target.closest("#mvBg .mvc");
      if (!c || (e.pointerType === "mouse" && e.button !== 0) || !$("mvSheet").hidden) return;
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
          st.on = true;
          MV.moved = true;
          c.classList.add("src");
          document.body.classList.add("mvdragging");
          try {
            navigator.vibrate && navigator.vibrate(12);
          } catch (_) {}
          SND.play("detent");
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
      g.style.left = e.clientX - st.dx + "px";
      g.style.top = e.clientY - st.dy + "px";
      g.style.visibility = "hidden";
      const under = document.elementFromPoint(e.clientX, e.clientY);
      g.style.visibility = "";
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
/* Kartenstapel nach unten ziehen öffnet alle Konten */
(function () {
  let y0 = null,
    x0 = 0;
  document.addEventListener(
    "touchstart",
    (e) => {
      const s = e.target.closest("#astack");
      if (!s || window.scrollY > 4 || !document.querySelector("[data-mvopen]")) {
        y0 = null;
        return;
      }
      y0 = e.touches[0].clientY;
      x0 = e.touches[0].clientX;
    },
    {
      passive: true,
    }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (y0 == null) return;
      const dy = e.touches[0].clientY - y0,
        dx = Math.abs(e.touches[0].clientX - x0);
      if (dx > dy) {
        y0 = null;
        return;
      }
      if (dy > 70) {
        y0 = null;
        mvOpen();
      }
    },
    {
      passive: true,
    }
  );
})();

/* ===== Mikro-Animationen nach Aktionen ===== */
const MOT = {
  q: [],
};
function motAdd(sel, k) {
  MOT.q.push({
    sel,
    k,
    t: performance.now(),
  });
  clearTimeout(MOT.to);
  MOT.to = setTimeout(motRun, 380);
}
function motRun() {
  if (!MOT.q.length) return;
  const now = performance.now(),
    left = [];
  for (const m of MOT.q) {
    const el = document.querySelector(m.sel);
    if (!el) {
      if (now - m.t < 1600) left.push(m);
      continue;
    }
    if (el._motT === m.t) continue;
    el._motT = m.t;
    if (!reducedMotion())
      try {
        motDo(el, m.k);
      } catch (_) {}
  }
  MOT.q = left;
  if (left.length) {
    clearTimeout(MOT.to);
    MOT.to = setTimeout(motRun, 250);
  }
}
function motRow(el) {
  return el.closest(".zit,.zrow,li,.txrow,.trow,.fitem,.ftile,.fcard,.pcfc,.row,[data-edit]") || el;
}
function motDo(el, k) {
  const row = motRow(el),
    glow = "color-mix(in srgb,var(--accent) 45%,transparent)";
  if (k === "add") {
    row.animate(
      [
        {
          opacity: 0,
          transform: "translateY(-16px) scale(.96)",
          boxShadow: `0 0 0 3px ${glow}`,
        },
        {
          opacity: 1,
          transform: "translateY(2px) scale(1.01)",
          offset: 0.55,
          boxShadow: `0 0 0 3px ${glow}`,
        },
        {
          opacity: 1,
          transform: "none",
          boxShadow: "0 0 0 0 transparent",
        },
      ],
      {
        duration: 1100,
        easing: "cubic-bezier(.2,1.2,.35,1)",
      }
    );
    return;
  }
  if (k === "check") {
    row.animate(
      [
        {
          transform: "none",
        },
        {
          transform: "scale(.95)",
          offset: 0.25,
        },
        {
          transform: "scale(1.035)",
          offset: 0.6,
        },
        {
          transform: "none",
        },
      ],
      {
        duration: 460,
        easing: "cubic-bezier(.3,1.5,.5,1)",
      }
    );
    const ic = el.matches("button,[role=checkbox]") ? el : row.querySelector(".ck,.zck,.cb,.fchk,input") || el;
    ic.animate(
      [
        {
          transform: "scale(.4) rotate(-25deg)",
        },
        {
          transform: "scale(1.25) rotate(6deg)",
          offset: 0.6,
        },
        {
          transform: "none",
        },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(.3,1.6,.5,1)",
      }
    );
    const r = ic.getBoundingClientRect();
    if (r.width) hbBurst(document.body, r.left + r.width / 2, r.top + r.height / 2, 12);
    return;
  }
  if (k === "uncheck") {
    row.animate(
      [
        {
          transform: "none",
        },
        {
          transform: "translateX(-6px)",
        },
        {
          transform: "translateX(5px)",
        },
        {
          transform: "translateX(-2px)",
        },
        {
          transform: "none",
        },
      ],
      {
        duration: 380,
        easing: "ease-out",
      }
    );
  }
}
function motSheet() {
  if (reducedMotion()) return;
  const g = $("catGrid");
  if (g)
    [...g.children].forEach((c, i) =>
      c.animate(
        [
          {
            opacity: 0,
            transform: "scale(.6) translateY(10px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 420,
          delay: 60 + i * 28,
          easing: "cubic-bezier(.3,1.5,.5,1)",
          fill: "backwards",
        }
      )
    );
  const a = $("fAmount");
  if (a)
    a.animate(
      [
        {
          boxShadow: "0 0 0 0 transparent",
        },
        {
          boxShadow: "0 0 0 6px color-mix(in srgb,var(--accent) 30%,transparent)",
        },
        {
          boxShadow: "0 0 0 0 transparent",
        },
      ],
      {
        duration: 900,
        delay: 250,
        easing: "ease-out",
      }
    );
}

/* ===== Bewegung: Seiten-Einstieg, Kacheln, Balken, Zahlen ===== */
const UX = {
  v: null,
  ym: null,
  quiet: false,
};
/* Seite kommt an: Karten federn von unten nach, Kacheln atmen kurz, Ziffern großer Beträge rollen ein.
   Nichts wird dabei unsichtbar – so blinkt auch nichts, falls die Animation unterbrochen wird. */
const UX_MONEY = /^[-−]?\s?\d{1,3}(\.\d{3})*(,\d{2})?\s*€$/;
function uxArrive(el) {
  [...el.children]
    .filter((c) => c.offsetParent)
    .slice(0, 8)
    .forEach((c, k) =>
      c.animate(
        [
          { transform: "translateY(26px) scale(.97)" },
          { transform: "translateY(-4px) scale(1.005)", offset: 0.55 },
          { transform: "none" },
        ],
        { duration: 620, delay: k * 65, easing: "cubic-bezier(.25,.9,.3,1)", fill: "backwards" }
      )
    );
  [...el.querySelectorAll(".atile")]
    .filter((t) => t.offsetParent)
    .forEach((t, i) =>
      t.animate(
        [
          { borderRadius: "28px", transform: "scale(.9)" },
          { borderRadius: "12px", offset: 0.6 },
          { borderRadius: "16px", transform: "none" },
        ],
        { duration: 600, delay: 180 + i * 40, easing: "cubic-bezier(.3,1.3,.5,1)", fill: "backwards" }
      )
    );
  el.querySelectorAll("b, strong, span, div").forEach((e) => {
    if (e.children.length || !e.offsetParent || e.closest(".hbodo")) return;
    const t = e.textContent.trim();
    if (!UX_MONEY.test(t) || parseFloat(getComputedStyle(e).fontSize) < 20) return;
    const token = String(Math.random());
    e.dataset.roll = token;
    e.textContent = "";
    [...t].forEach((ch, i) => {
      const s = document.createElement("span");
      s.textContent = ch;
      s.style.display = "inline-block";
      e.appendChild(s);
      if (/\d/.test(ch))
        s.animate(
          [
            { transform: "translateY(.6em)", opacity: 0.2, filter: "blur(3px)" },
            { transform: "none", opacity: 1, filter: "blur(0)" },
          ],
          { duration: 420, delay: 120 + i * 35, easing: "cubic-bezier(.2,1.2,.4,1)", fill: "backwards" }
        );
    });
    /* danach wieder normaler Text (falls die Seite nicht inzwischen neu gezeichnet wurde) */
    setTimeout(
      () => {
        if (e.dataset.roll === token) {
          e.textContent = t;
          delete e.dataset.roll;
        }
      },
      120 + t.length * 35 + 480
    );
  });
}
function uxEnter() {
  try {
    motRun();
  } catch (_) {}
  const v = ui.view,
    ym = ui.ym,
    el = document.querySelector(`[data-view="${v}"]:not([hidden])`);
  if (!el) return;
  const spc = v === "more" && UX.sp !== ui.sp;
  UX.sp = ui.sp;
  const first = UX.v === null,
    vc = UX.v !== v || spc,
    mc = !vc && UX.ym !== ym;
  const prevYm = UX.ym;
  UX.v = v;
  UX.ym = ym;
  /* nach dem Wisch-Würfel steht die Seite schon fertig da – sie federt nur noch an */
  const quiet = UX.quiet;
  UX.quiet = false;
  if (!(quiet || first || vc || mc) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (quiet || (vc && !first)) {
    uxArrive(el);
    return;
  }
  const kids = [...el.children].filter((c) => c.offsetParent !== null && c.offsetHeight > 0).slice(0, 10),
    dir = mc ? (ym > prevYm ? 1 : -1) : 0;
  kids.forEach((c, i) =>
    c.animate(
      dir
        ? [
            {
              opacity: 0,
              transform: `translateX(${dir * 28}px)`,
            },
            {
              opacity: 1,
              transform: "none",
            },
          ]
        : [
            {
              opacity: 0,
              transform: "translateY(16px) scale(.985)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
      {
        duration: dir ? 380 : 520,
        delay: i * 55,
        easing: "cubic-bezier(.2,1.1,.35,1)",
        fill: "backwards",
      }
    )
  );
  el.querySelectorAll(".agrid").forEach((g) => {
    const cols = getComputedStyle(g).gridTemplateColumns.split(" ").length || 3;
    [...g.children].forEach((t, i) =>
      t.animate(
        [
          {
            opacity: 0,
            transform: "scale(.82)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 480,
          delay: 140 + (Math.floor(i / cols) + (i % cols)) * 60,
          easing: "cubic-bezier(.3,1.5,.5,1)",
          fill: "backwards",
        }
      )
    );
  });
  el.querySelectorAll(".ahint").forEach((h, i) =>
    h.animate(
      [
        {
          opacity: 0,
          transform: "translateX(40px)",
        },
        {
          opacity: 1,
          transform: "none",
        },
      ],
      {
        duration: 520,
        delay: 200 + i * 90,
        easing: "cubic-bezier(.2,1.2,.35,1)",
        fill: "backwards",
      }
    )
  );
  el.querySelectorAll(".bpbar i,.track .fill,.hoprog i,.fxbar>*,.bar>i,.stackbar>*").forEach((b, i) => {
    const w = b.style.width || getComputedStyle(b).width;
    if (!w || w === "0px") return;
    b.animate(
      [
        {
          width: "0",
        },
        {
          width: w,
        },
      ],
      {
        duration: 900,
        delay: 250 + i * 40,
        easing: "cubic-bezier(.3,0,.2,1)",
      }
    );
  });
  el.querySelectorAll(".ahero b").forEach((b) => {
    const t = b.textContent.trim();
    if (/^[−+\-±]?\s?[\d.,]+\s?€$/.test(t) && typeof hbOdo === "function") {
      b._s = "";
      b.textContent = t.replace(/\d/g, "0");
      hbOdo(b, t, 1300);
    }
  });
}
document.addEventListener(
  "click",
  (e) => {
    const t = e.target.closest(".atile");
    if (t) {
      t.classList.remove("pop");
      void t.offsetWidth;
      t.classList.add("pop");
    }
  },
  true
);
addEventListener(
  "scroll",
  () => {
    document.body.classList.toggle("scrolled", scrollY > 6);
  },
  {
    passive: true,
  }
);

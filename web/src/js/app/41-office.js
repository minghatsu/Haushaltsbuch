/* ===== Amt: Termin-Wecker · Zuverdienst-Rechner · Bescheid-Check ===== */
["tmBg", "zvBg", "bsBg"].forEach(() => {});
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.classList && t.classList.contains("hobg") && ["tmBg", "zvBg", "bsBg"].includes(t.id)) hbSheetClose(t.id);
});
const daysTo = (d) => Math.round((new Date(d + "T12:00") - new Date(isoToday() + "T12:00")) / 864e5);
const dLong = (d, o) =>
  new Date(d + "T12:00").toLocaleDateString(
    cLoc(),
    o || {
      weekday: "short",
      day: "numeric",
      month: "short",
    }
  );
function addDays(iso, n) {
  const d = new Date(iso + "T12:00");
  d.setDate(d.getDate() + n);
  return isoOf(d);
}
function addMonths(iso, n) {
  const d = new Date(iso + "T12:00"),
    y = d.getFullYear(),
    m = d.getMonth() + n,
    last = new Date(y, m + 1, 0).getDate();
  return isoOf(new Date(y, m, Math.min(d.getDate(), last), 12));
}
function amtWord() {
  return store.settings.work === "alg" ? uiText("am_aa") : uiText("am_jc");
}

/* ---------- Termin-Wecker ---------- */
const TM2 = {
  sel: null,
  add: false,
  edit: null,
};
function tmIsFrist(t) {
  return (
    t.k === "frist" ||
    /frist|einreich|abgeb|antrag|nachweis|bescheid|weiterbewill|unterlag|widerspruch|bezahlen/i.test(t.n || "")
  );
}
function tmBringDef(t) {
  return tmIsFrist(t) ? [uiText("tm_b_docs")] : [uiText("tm_b_id"), uiText("tm_b_inv"), uiText("tm_b_bw")];
}
function tmList() {
  const j = jlCfg();
  return j.terms;
}
function tmOpen(sel) {
  TM2.sel = sel || null;
  TM2.add = false;
  TM2.edit = null;
  hbSheet("tmBg", uiText("tm_title"));
  tmRender(true);
}
function tmBadge(d) {
  const n = daysTo(d);
  return n < 0
    ? `<span class="vab b-free">${escHtml(uiText("tm_past"))}</span>`
    : n === 0
      ? `<span class="vab b-red">${escHtml(uiText("tm_today"))}</span>`
      : n === 1
        ? `<span class="vab b-red">${escHtml(uiText("tm_tom"))}</span>`
        : `<span class="vab ${n <= 3 ? "b-red" : n <= 14 ? "b-amb" : "b-grn"}">${escHtml(
            uiText("tm_days", {
              n: String(n),
            })
          )}</span>`;
}
function tmRender(first) {
  const bg = $("tmBg");
  if (!bg || bg.hidden) return;
  const b = bg.querySelector(".hobody"),
    L = tmList(),
    today = isoToday();
  const open = L.filter((t) => !t.done && t.d >= today).sort((a, c) =>
      (a.d + (a.t || "")).localeCompare(c.d + (c.t || ""))
    ),
    late = L.filter((t) => !t.done && t.d < today),
    done = L.filter((t) => t.done).sort((a, c) => c.d.localeCompare(a.d));
  const cur = (TM2.sel && L.find((t) => t.id === TM2.sel && !t.done)) || open[0] || late[0] || null;
  let h = "";
  if (cur) {
    const n = daysTo(cur.d),
      C = 2 * Math.PI * 31,
      frac = n <= 0 ? 1 : Math.max(0.06, 1 - Math.min(n, 21) / 21),
      bring =
        cur.bring ||
        (cur.bring = tmBringDef(cur).map((x) => ({
          n: x,
          ok: false,
        }))),
      fr = tmIsFrist(cur);
    h += `<div class="tmhero ${n <= 1 ? "hot" : ""}"><svg class="tmring" viewBox="0 0 74 74"><circle cx="37" cy="37" r="31" class="bg"/><circle cx="37" cy="37" r="31" class="fg" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${first && !reducedMotion() ? C.toFixed(1) : (C * (1 - frac)).toFixed(1)}" data-off="${(C * (1 - frac)).toFixed(1)}"/></svg>
      <span class="tmn"><b id="tmN">${n <= 0 ? "!" : escHtml(String(n))}</b><small>${escHtml(n <= 0 ? (n === 0 ? uiText("tm_today") : uiText("tm_past")) : n === 1 ? uiText("tm_day1") : uiText("tm_daysw"))}</small></span>
      <div class="tmht"><small>${escHtml(fr ? uiText("tm_nextf") : uiText("tm_nextt"))}</small><b>${escHtml(tr(cur.n))}</b><span>${escHtml(
        dLong(cur.d, {
          weekday: "short",
          day: "numeric",
          month: "long",
        })
      )}${cur.t ? ` · ${escHtml(cur.t)}` : ""}${cur.o ? ` · ${escHtml(cur.o)}` : ""}</span></div>
      <button type="button" class="tmed" data-tmedit="${escHtml(cur.id)}" aria-label="${escHtml(uiText("tm_edit"))}">✎</button></div>`;
    if (n <= 1 && n >= 0)
      h += `<div class="fcmami on" style="margin:0 0 10px">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub">${escHtml(
        mFill(
          n === 0
            ? uiText("tm_mami0", {
                t: cur.t ? ` (${cur.t})` : "",
              })
            : uiText("tm_mami1", {
                t: cur.t ? ` (${cur.t})` : "",
              })
        )
      )}</div></div>`;
    h += `<div class="vak">${escHtml(uiText("tm_bring"))}</div><div class="vacard tmbr">${bring.map((x, i) => `<button type="button" class="tmbi ${x.ok ? "ok" : ""}" data-tmbr="${escHtml(cur.id)}|${i}"><span class="tmck">${x.ok ? "✓" : ""}</span><span class="grow">${escHtml(x.n)}</span>${x.ok ? `<span class="vab b-grn">✓</span>` : ""}</button>`).join("")}
      <div class="tmadd"><input class="in" id="tmBrN" placeholder="${escHtml(uiText("tm_b_more"))}"><button type="button" class="btn" data-tmbradd="${escHtml(cur.id)}">+</button></div></div>`;
    h +=
      n <= 0 || fr
        ? `<button type="button" class="tmdone" data-tmdone="${escHtml(cur.id)}">✓ ${escHtml(fr ? uiText("tm_donef") : uiText("tm_was"))}</button>`
        : `<p class="small muted tmnote">${escHtml(uiText("tm_later"))}</p>`;
  } else
    h += `<div class="tmhero calm"><span class="tmn"><b>${svgIcon("sun", 26)}</b></span><div class="tmht"><small>${escHtml(uiText("tm_none_s"))}</small><b>${escHtml(uiText("tm_none"))}</b></div></div>`;
  const rest = [...late.filter((t) => !cur || t.id !== cur.id), ...open.filter((t) => !cur || t.id !== cur.id)];
  if (rest.length)
    h += `<div class="vak">${escHtml(uiText("tm_after"))}</div><div class="vacard">${rest.map((t) => `<button type="button" class="fcr tmrow" data-tmsel="${escHtml(t.id)}"><span class="tmico">${svgIcon(tmIsFrist(t) ? "doc" : "pin", 18)}</span><span class="grow"><b>${escHtml(tr(t.n))}</b><small>${escHtml(dLong(t.d))}${t.t ? ` · ${escHtml(t.t)}` : ""}</small></span>${tmBadge(t.d)}</button>`).join("")}</div>`;
  h +=
    TM2.add || TM2.edit
      ? tmForm()
      : `<button type="button" class="btn tmnew" data-tmnew>+ ${escHtml(uiText("tm_new"))}</button>`;
  if (done.length)
    h += `<div class="vak">${escHtml(uiText("tm_done"))}</div><div class="vacard tmdn">${done
      .slice(0, 12)
      .map(
        (
          t
        ) => `<div class="fcr"><span class="tmico">${svgIcon("check", 18)}</span><span class="grow"><b>${escHtml(tr(t.n))}</b><small>${escHtml(dLong(t.d))}${
          t.done.ts
            ? ` · ${escHtml(
                uiText("tm_at", {
                  t: new Date(t.done.ts).toLocaleTimeString(cLoc(), {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })
              )}`
            : ""
        }</small></span>
    ${t.done.img ? `<button type="button" class="tmph" data-tmview="${escHtml(t.id)}" aria-label="${escHtml(uiText("tm_proof"))}">${svgIcon("clip", 16)}</button>` : `<button type="button" class="tmph add" data-tmphoto="${escHtml(t.id)}" aria-label="${escHtml(uiText("tm_photo"))}">${svgIcon("camera", 16)}</button>`}<button type="button" class="tmph" data-tmundo="${escHtml(t.id)}" aria-label="${escHtml(uiText("tm_undo"))}">↺</button></div>`
      )
      .join("")}</div>`;
  h += `<p class="small muted" style="margin:12px 4px 0">${escHtml(
    uiText("tm_hint", {
      a: amtWord(),
    })
  )}</p><input type="file" id="tmFile" accept="image/*" capture="environment" hidden>`;
  b.innerHTML = h;
  if (first && !reducedMotion()) {
    const fg = b.querySelector(".tmring .fg");
    if (fg)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          fg.style.transition = "stroke-dashoffset 1.3s cubic-bezier(.3,0,.2,1)";
          fg.style.strokeDashoffset = fg.dataset.off;
        })
      );
    b.querySelectorAll(".tmhero,.vacard,.tmdone,.tmnew").forEach((e, i) =>
      e.animate(
        [
          {
            opacity: 0,
            transform: "translateY(14px)",
          },
          {
            opacity: 1,
            transform: "none",
            filter: "none",
          },
        ],
        {
          duration: 550,
          delay: i * 80,
          easing: "cubic-bezier(.2,1.2,.35,1)",
          fill: "backwards",
        }
      )
    );
  }
}
function tmForm() {
  const t = TM2.edit ? tmList().find((x) => x.id === TM2.edit) || {} : {},
    P = prof() || GPROF.alg;
  return `<div class="vacard tmform"><b>${escHtml(TM2.edit ? uiText("tm_edit") : uiText("tm_new"))}</b>
    <div class="field"><label>${escHtml(uiText("tm_what"))}</label><input class="in" id="tmFN" list="tmDL" value="${escHtml(t.n || "")}" placeholder="${escHtml(tr((P.terms || [])[0] || "Termin"))}"><datalist id="tmDL">${(P.terms || []).map((n) => `<option value="${escHtml(tr(n))}">`).join("")}</datalist></div>
    <div class="grid2"><div class="field"><label>${escHtml(uiText("tm_date"))}</label><input class="in" type="date" id="tmFD" value="${escHtml(t.d || isoToday())}"></div><div class="field"><label>${escHtml(uiText("tm_time"))}</label><input class="in" type="time" id="tmFT" value="${escHtml(t.t || "")}"></div></div>
    <div class="field"><label>${escHtml(uiText("tm_place"))}</label><input class="in" id="tmFO" value="${escHtml(t.o || "")}" placeholder="${escHtml(uiText("tm_place_p"))}"></div>
    <div class="srseg" style="padding:0;margin:4px 0 10px"><button type="button" class="${!tmIsFrist(t) || t.k === "termin" ? "on" : ""}" data-tmk="termin">${svgIcon("pin", 16)} ${escHtml(uiText("tm_k_t"))}</button><button type="button" class="${t.k === "frist" || (t.n && tmIsFrist(t) && t.k !== "termin") ? "on" : ""}" data-tmk="frist">${svgIcon("doc", 15)} ${escHtml(uiText("tm_k_f"))}</button></div>
    <div class="vabtns">${TM2.edit ? `<button type="button" class="btn danger" data-tmdel="${escHtml(TM2.edit)}">${escHtml(uiText("tm_del"))}</button>` : ""}<button type="button" class="btn" data-tmcancel>${escHtml(uiText("tm_cancel"))}</button><button type="button" class="btn primary" data-tmsave>${escHtml(uiText("tm_save"))}</button></div></div>`;
}
async function tmSaveAll() {
  await saveSettings();
}
async function tmShrink(file, mx = 1600) {
  const url = await new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = no;
    r.readAsDataURL(file);
  });
  const im = await loadImg(url),
    k = Math.min(1, mx / Math.max(im.naturalWidth, im.naturalHeight)),
    c = document.createElement("canvas");
  c.width = Math.round(im.naturalWidth * k);
  c.height = Math.round(im.naturalHeight * k);
  c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}
function ocrRows(L) {
  const b = (L || []).filter((l) => l && typeof l === "object" && l.t && l.h > 0 && l.w > 0);
  if (b.length < 3) return [];
  const it = b
      .map((l) => ({
        t: String(l.t).trim(),
        x: l.x,
        cy: l.y + l.h / 2,
        h: l.h,
      }))
      .sort((a, b) => a.cy - b.cy),
    rows = [];
  for (const l of it) {
    const r = rows.find((r) => Math.abs(r.cy - l.cy) < Math.min(r.h, l.h) * 0.6);
    if (r) {
      r.a.push(l);
      r.cy = (r.cy * (r.a.length - 1) + l.cy) / r.a.length;
    } else
      rows.push({
        cy: l.cy,
        h: l.h,
        a: [l],
      });
  }
  return rows
    .sort((a, b) => a.cy - b.cy)
    .map((r) => ({
      t: r.a
        .sort((a, b) => a.x - b.x)
        .map((x) => x.t)
        .join("  "),
      row: 1,
    }))
    .filter((r) => /\s{2}/.test(r.t));
}
function ocrPlus(L) {
  L = L || [];
  const R = ocrRows(L);
  window.HB_OCRTXT = (R.length ? R : L).map((l) => (typeof l === "string" ? l : l.t)).join("\n");
  return R.concat(L);
}
async function dsThumbs(root) {
  for (const im of (root || document).querySelectorAll("img[data-dsimg]:not([src])")) {
    try {
      const u = await rcptGet(im.dataset.dsimg);
      if (u) {
        im.src = u;
        im.closest(".docscan") && im.closest(".docscan").classList.add("on");
      }
    } catch (_) {}
  }
}
new MutationObserver(() => {
  if (document.querySelector("img[data-dsimg]:not([src])")) dsThumbs();
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

/* Untere Leiste: Pille mit aufklappendem Namen, Plus bleibt fest */
var NAVX = {
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
  const tw = (t) => {
    const n = t.querySelector(".tname");
    return 26 + 24 + (n ? Math.min(112, n.scrollWidth) + 7 : 0);
  };
  const cols = (g) => {
    if (!g.length) return [];
    if (!act || !g.includes(act)) return g.map(() => H / g.length);
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
      (e) => e.getAttribute("aria-selected") === "true" && !e.classList.contains("plus") && getComputedStyle(e).display !== "none"
    ),
    L = navLayout(nav, act);
  if (!L) {
    nav.style.removeProperty("--nc");
    return;
  }
  const fr = (v) => `calc((100% - ${L.PW}px) * ${(v / (L.inner - L.PW)).toFixed(4)})`;
  nav.style.setProperty("--nc", [...L.cl.map(fr), ...(L.pi < 0 ? [] : [L.PW + "px"]), ...L.cr.map(fr)].join(" "));
  nav.classList.toggle("nosel", !act);
  if (!act) return;
  const { x, w } = L,
    y = (nav.clientHeight - 48) / 2,
    col =
      getComputedStyle(act).getPropertyValue("--tcol").trim() ||
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  ind.style.setProperty("--ic", col);
  ind.style.top = y + "px";
  /* Beim Wischen übernimmt navFlow die Bewegung – hier nur den Endstand setzen */
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
  const NS = "http://www.w3.org/2000/svg";
  let st = null,
    svg = null;
  const lerp = (a, b, t) => a + (b - a) * t,
    clamp = (v) => Math.min(1, Math.max(0, v)),
    smooth = (t) => t * t * (3 - 2 * t),
    nav = () => document.querySelector("nav.tabs"),
    tab = (k) => nav().querySelector(`.tab[data-go="${k}"]`),
    tcol = (t) =>
      getComputedStyle(t).getPropertyValue("--tcol").trim() ||
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  function layer(n) {
    if (svg && svg.parentNode === n) return svg;
    svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "navflow");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      /* Farbwechsel nur in der Mitte zwischen den beiden Symbolen – die Kreise selbst bleiben in ihrer Farbe */
      '<defs><linearGradient id="nfFill" gradientUnits="userSpaceOnUse"><stop offset=".42"/><stop offset=".58"/></linearGradient></defs>' +
      "<g><path/><path/><path/></g>";
    n.insertBefore(svg, n.firstChild);
    return svg;
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
          const g = Math.exp(-(k * k) / (W * W / 2));
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
    if (r2 > 1 && ra > 1 && neck > 0.4) D[2] = bridge(k1 < 1 ? oX + side * (oW / 2 - 24) : oc, ra, nX, r2, y, neck, dip);
    const shapes = svg.querySelectorAll("g path");
    D.forEach((d, i) => shapes[i].setAttribute("d", d));
    /* alte Form in ihrer Farbe, neue Pille in ihrer – nur Verbindung und wandernde Spitze tragen den Übergang */
    shapes[0].setAttribute("fill", S.ca);
    shapes[1].setAttribute("fill", k2 > 0 ? S.cb : "url(#nfFill)");
    shapes[2].setAttribute("fill", "url(#nfFill)");
    const grad = svg.querySelector("#nfFill");
    grad.setAttribute("x1", oc.toFixed(1));
    grad.setAttribute("x2", (Math.abs(tc - oc) < 1 ? oc + 1 : tc).toFixed(1));
    grad.children[0].setAttribute("stop-color", S.ca);
    grad.children[1].setAttribute("stop-color", S.cb);
    /* Namen und Symbolfarben: weiß nur, solange Farbe dahinter ist */
    const na = S.ta.querySelector(".tname"),
      nb = S.tb.querySelector(".tname");
    na.style.maxWidth = lerp(S.nA, 0, clamp(q / 0.3)).toFixed(1) + "px";
    na.style.marginLeft = lerp(7, 0, clamp(q / 0.3)).toFixed(1) + "px";
    na.style.opacity = String(clamp(1 - q / 0.2));
    nb.style.maxWidth = lerp(0, S.nB, clamp((q - 0.8) / 0.2)).toFixed(1) + "px";
    nb.style.marginLeft = lerp(0, 7, clamp((q - 0.8) / 0.2)).toFixed(1) + "px";
    nb.style.opacity = String(clamp((q - 0.86) / 0.14));
    const white = (t, v) => t.style.setProperty("color", `color-mix(in srgb, #fff ${Math.round(100 * v)}%, var(--muted))`, "important");
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
    if (svg) svg.style.display = "none";
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

/* Kachel-Namen und Beträge in kleinen Kästen: zu lange Wörter etwas kleiner statt abschneiden oder mitten im Wort trennen.
   Jede Kachel wird nur neu gemessen, wenn sich Text oder Breite geändert haben – sonst
   würden die Mess-Stile ständig neue Änderungen auslösen (und das Wischen ausbremsen). */
function fitTiles(root) {
  (root || document).querySelectorAll(".atile b, .sagrid b").forEach((b) => {
    if (b.closest(".cubestage") || !b.getClientRects().length) return;
    const t = b.parentElement,
      key = b.textContent + "|" + t.clientWidth;
    if (b.dataset.fit === key) return;
    b.dataset.fit = key;
    b.style.fontSize = "";
    b.style.overflowWrap = "normal";
    b.style.hyphens = "manual";
    let f = parseFloat(getComputedStyle(b).fontSize) || 12.5,
      n = 0;
    const ts = getComputedStyle(t),
      av = t.clientWidth - parseFloat(ts.paddingLeft) - parseFloat(ts.paddingRight);
    b.style.width = "min-content";
    while (b.scrollWidth > av - 2 && f > 10.5 && n++ < 14) {
      f -= 0.5;
      b.style.fontSize = f + "px";
    }
    b.style.width = "";
    b.style.overflowWrap = "";
    b.style.hyphens = "";
  });
}
{
  let fq = 0;
  const hasTile = (n) => {
    const e = n.nodeType === 1 ? n : n.parentElement;
    return (
      !!e &&
      !e.closest(".cubestage") &&
      (e.matches(".atile, .atile *, .sagrid, .sagrid *") || !!e.querySelector(".atile, .sagrid"))
    );
  };
  new MutationObserver((list) => {
    if (fq || !list.some((m) => hasTile(m.target) || [...m.addedNodes].some(hasTile))) return;
    fq = requestAnimationFrame(() => {
      fq = 0;
      fitTiles();
    });
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  addEventListener("resize", () => fitTiles());
  try {
    document.fonts.ready.then(() => fitTiles());
  } catch (_) {}
}
async function ocrImgFile(file) {
  let L = [];
  try {
    L = await ocrDataUrl(await tmShrink(file, 2600));
  } catch (_) {
    L = [];
  }
  if (!L.length) {
    try {
      L = await ocrDataUrl(await tmShrink(file, 1600));
    } catch (_) {
      L = [];
    }
  }
  return ocrPlus(L);
}
document.addEventListener("click", async (e) => {
  const op = e.target.closest("[data-tmopen]");
  if (op) {
    e.preventDefault();
    tmOpen(op.dataset.tmopen || null);
    return;
  }
  const bg = $("tmBg");
  if (!bg || bg.hidden || !bg.contains(e.target)) return;
  const L = tmList();
  const sel = e.target.closest("[data-tmsel]");
  if (sel) {
    TM2.sel = sel.dataset.tmsel;
    tmRender(true);
    bg.querySelector(".hobody").scrollTop = 0;
    return;
  }
  const br = e.target.closest("[data-tmbr]");
  if (br) {
    const [id, i] = br.dataset.tmbr.split("|"),
      t = L.find((x) => x.id === id);
    if (!t) return;
    t.bring =
      t.bring ||
      tmBringDef(t).map((x) => ({
        n: x,
        ok: false,
      }));
    t.bring[+i].ok = !t.bring[+i].ok;
    await tmSaveAll();
    tmRender();
    if (t.bring[+i].ok && !reducedMotion()) {
      const r = bg.querySelectorAll(".tmbi")[+i];
      if (r) {
        const bb = r.querySelector(".tmck").getBoundingClientRect();
        hbBurst(document.body, bb.left + bb.width / 2, bb.top + bb.height / 2, 10);
      }
    }
    return;
  }
  const ba = e.target.closest("[data-tmbradd]");
  if (ba) {
    const v = ($("tmBrN").value || "").trim();
    if (!v) return;
    const t = L.find((x) => x.id === ba.dataset.tmbradd);
    t.bring = [
      ...(t.bring || []),
      {
        n: v,
        ok: false,
      },
    ];
    await tmSaveAll();
    tmRender();
    return;
  }
  const dn = e.target.closest("[data-tmdone]");
  if (dn) {
    const t = L.find((x) => x.id === dn.dataset.tmdone);
    if (!t) return;
    t.done = {
      ts: Date.now(),
    };
    const bb = dn.getBoundingClientRect();
    hbBurst(document.body, bb.left + bb.width / 2, bb.top, 26);
    await tmSaveAll();
    TM2.sel = null;
    tmRender();
    toast(
      uiText("tm_saved"),
      () => {
        TM2.photo = t.id;
        $("tmFile").click();
      },
      "📸 " + uiText("tm_photo"),
      8000
    );
    return;
  }
  const ph = e.target.closest("[data-tmphoto]");
  if (ph) {
    TM2.photo = ph.dataset.tmphoto;
    $("tmFile").click();
    return;
  }
  const vw = e.target.closest("[data-tmview]");
  if (vw) {
    const img = await rcptGet("tm-" + vw.dataset.tmview);
    if (img) tmShow(img);
    return;
  }
  const un = e.target.closest("[data-tmundo]");
  if (un) {
    const t = L.find((x) => x.id === un.dataset.tmundo);
    if (t) {
      delete t.done;
      await tmSaveAll();
      tmRender();
    }
    return;
  }
  if (e.target.closest("[data-tmnew]")) {
    TM2.add = true;
    TM2.edit = null;
    TM2.k = null;
    tmRender();
    setTimeout(() => {
      const f = $("tmFN");
      if (f) {
        f.focus();
        f.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      }
    }, 60);
    return;
  }
  const ed = e.target.closest("[data-tmedit]");
  if (ed) {
    TM2.edit = ed.dataset.tmedit;
    TM2.add = false;
    TM2.k = null;
    tmRender();
    setTimeout(() => {
      const f = bg.querySelector(".tmform");
      if (f)
        f.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
    }, 60);
    return;
  }
  const k = e.target.closest("[data-tmk]");
  if (k) {
    TM2.k = k.dataset.tmk;
    k.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === k));
    return;
  }
  if (e.target.closest("[data-tmcancel]")) {
    TM2.add = false;
    TM2.edit = null;
    tmRender();
    return;
  }
  const dl = e.target.closest("[data-tmdel]");
  if (dl) {
    const j = jlCfg();
    j.terms = j.terms.filter((x) => x.id !== dl.dataset.tmdel);
    TM2.edit = null;
    await tmSaveAll();
    tmRender();
    return;
  }
  if (e.target.closest("[data-tmsave]")) {
    const n = ($("tmFN").value || "").trim(),
      d = $("tmFD").value;
    if (!n || !d) {
      toast(uiText("tm_need"));
      return;
    }
    const j = jlCfg(),
      kk = TM2.k || (bg.querySelector("[data-tmk].on") || {}).dataset?.tmk || "termin";
    if (TM2.edit) {
      const t = j.terms.find((x) => x.id === TM2.edit);
      if (t) {
        Object.assign(t, {
          n,
          d,
          t: $("tmFT").value || "",
          o: ($("tmFO").value || "").trim(),
          k: kk,
        });
      }
    } else {
      const t = {
        id: newId(),
        n,
        d,
        t: $("tmFT").value || "",
        o: ($("tmFO").value || "").trim(),
        k: kk,
      };
      t.bring = tmBringDef(t).map((x) => ({
        n: x,
        ok: false,
      }));
      j.terms.push(t);
      TM2.sel = t.id;
    }
    TM2.add = false;
    TM2.edit = null;
    await tmSaveAll();
    tmRender(true);
    toast(uiText("tm_ok"));
    return;
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "tmFile") return;
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f || !TM2.photo) return;
  try {
    const img = await tmShrink(f);
    await rcptPut("tm-" + TM2.photo, img);
    const t = tmList().find((x) => x.id === TM2.photo);
    if (t) {
      t.done = {
        ...(t.done || {
          ts: Date.now(),
        }),
        img: 1,
      };
      await tmSaveAll();
    }
    tmRender();
    toast(uiText("tm_proof_ok"));
  } catch (_) {
    toast(uiText("tm_proof_err"));
  }
});
function tmShow(img) {
  const o = document.createElement("div");
  o.className = "tmview";
  o.innerHTML = `<img src="${img}" alt=""><button type="button" class="hlx" aria-label="${escHtml(uiText("hl_close"))}"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
  o.onclick = () => o.remove();
  document.body.appendChild(o);
}
function tmHints(hints) {
  if (!prof || !prof()) return;
  const today = isoToday();
  for (const t of jlCfg().terms || []) {
    if (t.done) continue;
    const n = daysTo(t.d);
    if (n < 0 || n > 2) continue;
    hints.push({
      k: "term",
      lvl: n <= 1 ? "warn" : "info",
      t: `${tr(t.n)}: ${
        n === 0
          ? uiText("tm_today")
          : n === 1
            ? uiText("tm_tom")
            : uiText("tm_days", {
                n: "2",
              })
      }${t.t ? ` · ${t.t}` : ""}`,
      s: tmIsFrist(t) ? uiText("tm_h_f") : uiText("tm_h_t"),
    });
  }
}

/* ---------- Zuverdienst-Rechner ---------- */
function zvParts(g) {
  const alg = store.settings.work === "alg",
    kid = Number(store.settings.kinder) > 0 || (store.settings.kids || []).length > 0,
    top = kid ? 1500 : 1200,
    P = [];
  if (alg) {
    P.push(
      uiText("zv_alg_free", {
        n: "165 €",
      })
    );
    return {
      keep: Math.min(g, 165),
      P,
    };
  }
  if (g <= 0)
    return {
      keep: 0,
      P,
    };
  let k = Math.min(g, 100);
  P.push(
    uiText("zv_p_free", {
      n: fmtEur0(Math.min(g, 100)),
    })
  );
  if (g > 100) {
    const a = Math.min(g, 520) - 100;
    k += a * 0.2;
    P.push(
      uiText("zv_p_pct", {
        p: "20",
        n: fmtEur0(a),
      })
    );
  }
  if (g > 520) {
    const a = Math.min(g, 1000) - 520;
    k += a * 0.3;
    P.push(
      uiText("zv_p_pct", {
        p: "30",
        n: fmtEur0(a),
      })
    );
  }
  if (g > 1000) {
    const a = Math.min(g, top) - 1000;
    if (a > 0) {
      k += a * 0.1;
      P.push(
        uiText("zv_p_pct", {
          p: "10",
          n: fmtEur0(a),
        })
      );
    }
  }
  return {
    keep: Math.round(k),
    P,
    top,
  };
}
const ZV = {};
function zvOpen() {
  const j = jlCfg();
  ZV.g = Number(j.mini) || 0;
  ZV.h = Number(j.miniH) || 0;
  hbSheet("zvBg", uiText("zv_title"));
  zvRender(true);
}
function zvRender(first) {
  const bg = $("zvBg");
  if (!bg || bg.hidden) return;
  const b = bg.querySelector(".hobody"),
    j = jlCfg(),
    MJ = yearLimits().mj,
    max = 1500,
    alg = store.settings.work === "alg";
  b.innerHTML = `<div class="vacard zvc"><small>${escHtml(uiText("zv_gross"))}</small><div class="zvbig"><span id="zvN">${escHtml(fmtEur0(first && !reducedMotion() ? 0 : ZV.g))}</span></div>
      <div class="zvsl"><input type="range" id="zvR" min="0" max="${max}" step="10" value="${ZV.g}" aria-label="${escHtml(uiText("zv_gross"))}"><i class="zvmj" style="left:${((MJ / max) * 100).toFixed(1)}%"></i></div>
      <div class="zvax"><span>0</span><span style="left:${((MJ / max) * 100).toFixed(1)}%">${escHtml(
        uiText("zv_mj", {
          n: fmtEur0(MJ),
        })
      )}</span><span>${escHtml(fmtEur0(max))}</span></div>
      <div class="grid2" style="margin-top:12px"><div class="field"><label>${escHtml(uiText("zv_exact"))}</label><input class="in" id="zvG" inputmode="decimal" value="${ZV.g || ""}" placeholder="520"></div>
      <div class="field"><label>${escHtml(uiText("zv_hours"))}</label><input class="in" id="zvH" inputmode="decimal" value="${ZV.h || ""}" placeholder="${escHtml(uiText("zv_hours_p"))}"></div></div></div>
    <div class="vacard zvc"><div class="zvbar"><i class="k" id="zvBK"><span id="zvBKt"></span></i><i class="a" id="zvBA"><span id="zvBAt"></span></i></div>
      <div class="fcr zvrow"><span class="tmico">${svgIcon("check", 18)}</span><span class="grow"><b>${escHtml(uiText("zv_keep"))}</b><small id="zvWhy"></small></span><b class="pos" id="zvK"></b></div>
      <div class="fcr zvrow"><span class="tmico">${svgIcon("bank", 18)}</span><span class="grow"><b>${escHtml(
        uiText("zv_after", {
          a: alg ? uiText("am_alg") : uiText("am_gs"),
        })
      )}</b><small id="zvBefore"></small></span><b id="zvL"></b></div></div>
    <div class="srhero zvhero"><small>${escHtml(uiText("zv_total"))}</small><div class="srbig"><span id="zvT">0 €</span></div><span id="zvTs"></span><i class="srsh"></i></div>
    ${j.amount ? "" : `<div class="notice info"><span>${escHtml(uiText("zv_noamt"))}</span><button class="btn primary" data-go="more" data-sp="amt" data-hbclose="zvBg">${escHtml(uiText("zv_set"))}</button></div>`}
    <div id="zvWarn"></div>
    <p class="small muted" style="margin:10px 4px 0">${escHtml(alg ? uiText("zv_note_alg") : uiText("zv_note_gs"))}</p>`;
  zvCalc(first);
}
function zvCalc(first) {
  const j = jlCfg(),
    g = Math.max(0, Number(ZV.g) || 0),
    { keep, P } = zvParts(g),
    ded = Math.max(0, g - keep),
    base = Number(j.amount) || 0,
    after = Math.max(0, base - ded),
    tot = after + g,
    alg = store.settings.work === "alg";
  const hrs = Number(ZV.h) > 0 ? (Number(ZV.h) * 52) / 12 : g > 0 ? g / (yearLimits().ml || 13.9) : 0,
    ph = hrs > 0 ? keep / hrs : 0;
  hbOdo($("zvN"), fmtEur0(g));
  {
    const r = $("zvR");
    if (r) r.style.setProperty("--p", Math.min(100, g / 15) + "%");
  }
  const kw = g > 0 ? Math.max((keep / g) * 100, keep ? 8 : 0) : 0;
  $("zvBK").style.width = (g > 0 ? kw : 0) + "%";
  $("zvBA").style.width = (g > 0 ? 100 - kw : 100) + "%";
  $("zvBA").classList.toggle("empty", g <= 0);
  $("zvBKt").textContent = g > 0 && keep ? fmtEur0(keep) : "";
  $("zvBAt").textContent =
    g <= 0
      ? uiText("zv_move")
      : ded
        ? uiText("zv_ded", {
            n: fmtEur0(ded),
          })
        : "";
  $("zvK").textContent = "+" + fmtEur0(keep);
  $("zvWhy").textContent = P.join(" + ") || uiText("zv_none");
  $("zvL").textContent = fmtEur0(after);
  $("zvBefore").textContent = uiText("zv_before", {
    n: fmtEur0(base),
  });
  hbOdo($("zvT"), fmtEur0(tot), first ? 1400 : 700);
  $("zvTs").textContent =
    g > 0
      ? uiText("zv_tot_s", {
          n: fmtEur0(base),
          h: ph ? fmtEur(ph) : "–",
        })
      : uiText("zv_tot_0");
  const w = $("zvWarn");
  w.innerHTML =
    alg && Number(ZV.h) >= 15
      ? `<div class="fcwarn on"><b>⚠ ${escHtml(uiText("zv_15"))}</b><span>${escHtml(uiText("zv_15_s"))}</span></div>`
      : g > yearLimits().mj && !alg
        ? `<div class="fcgood on"><b>ℹ️ ${escHtml(uiText("zv_svp"))}</b><span>${escHtml(uiText("zv_svp_s"))}</span></div>`
        : "";
}
let zvT0 = 0;
function zvStore() {
  clearTimeout(zvT0);
  zvT0 = setTimeout(() => {
    const j = jlCfg();
    j.mini = Number(ZV.g) || 0;
    j.miniH = Number(ZV.h) || 0;
    saveSettings();
  }, 700);
}
document.addEventListener("input", (e) => {
  const id = e.target.id;
  if (id === "zvR") {
    ZV.g = Number(e.target.value) || 0;
    const gi = $("zvG");
    if (gi) gi.value = ZV.g || "";
    zvCalc();
    zvStore();
  } else if (id === "zvG") {
    ZV.g = Math.max(0, parseAmt(e.target.value || "0") || 0);
    const r = $("zvR");
    if (r) r.value = Math.min(1500, ZV.g);
    zvCalc();
    zvStore();
  } else if (id === "zvH") {
    ZV.h = Math.max(0, parseAmt(e.target.value || "0") || 0);
    zvCalc();
    zvStore();
  }
});
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-zvopen]")) {
    e.preventDefault();
    zvOpen();
  }
});

/* ---------- Bescheid-Check ---------- */
const BS = {
  st: 0,
  img: null,
  d: null,
  found: {},
};
function bsList() {
  const j = jlCfg();
  return (j.bescheide = j.bescheide || []);
}
function bsOpen(id) {
  BS.st = 0;
  BS.img = null;
  BS.d = null;
  BS.found = {};
  BS.edit = null;
  hbSheet("bsBg", uiText("bs_title"));
  if (id) {
    const x = bsList().find((b) => b.id === id);
    if (x) {
      BS.d = {
        ...x,
      };
      BS.edit = id;
      BS.st = 2;
    }
  }
  bsRender(true);
}
function bsRender(first) {
  const bg = $("bsBg");
  if (!bg || bg.hidden) return;
  const b = bg.querySelector(".hobody"),
    L = bsList()
      .slice()
      .sort((a, c) => (c.from || "").localeCompare(a.from || ""));
  if (BS.st === 0) {
    const cur = L[0];
    b.innerHTML = `${
      cur
        ? `<div class="srhero bshero"><small>${escHtml(uiText("bs_cur"))}</small><div class="srbig">${escHtml(fmtEur(cur.total || 0))} <span style="font-size:16px;opacity:.8">/ ${escHtml(uiText("bs_month"))}</span></div><span>${
            cur.to
              ? escHtml(
                  uiText("bs_until", {
                    d: dLong(cur.to, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }),
                  })
                )
              : ""
          }</span><i class="srsh"></i></div>`
        : `<div class="bsintro"><div class="bsdoc">${svgIcon("doc", 54)}<i></i></div><b>${escHtml(uiText("bs_intro"))}</b><span>${escHtml(uiText("bs_intro_s"))}</span></div>`
    }
      <div class="bsbtns"><button type="button" class="vakb" data-bspick="cam">${svgIcon("camera", 18)} ${escHtml(uiText("bs_photo"))}</button><button type="button" class="vadone" data-bspick="file">${svgIcon("image", 15)} ${escHtml(uiText("bs_file"))}</button></div>
      <button type="button" class="btn tmnew" data-bsmanual>${svgIcon("pen", 18)} ${escHtml(uiText("bs_manual"))}</button>
      ${
        L.length
          ? `<div class="vak">${escHtml(uiText("bs_all"))}</div><div class="vacard">${L.map((x) => {
              const wd = x.wid ? daysTo(x.wid) : null;
              return `<button type="button" class="fcr tmrow" data-bsedit="${escHtml(x.id)}"><span class="tmico">${svgIcon("doccheck", 18)}</span><span class="grow"><b>${escHtml(x.kind === "aend" ? uiText("bs_k_a") : x.kind === "ab" ? uiText("bs_k_ab") : uiText("bs_k_b"))}${
                x.from
                  ? ` · ${escHtml(
                      fxDate(x.from, {
                        month: "short",
                        year: "2-digit",
                      })
                    )}–${escHtml(
                      fxDate(x.to || x.from, {
                        month: "short",
                        year: "2-digit",
                      })
                    )}`
                  : ""
              }</b><small>${escHtml(fmtEur(x.total || 0))}${x.img ? " · " + svgIcon("clip", 12) : ""}</small></span>${
                wd != null && wd >= 0
                  ? `<span class="vab ${wd <= 7 ? "b-red" : "b-amb"}">${escHtml(
                      uiText("bs_w_badge", {
                        n: String(wd),
                      })
                    )}</span>`
                  : ""
              }</button>`;
            }).join("")}</div>`
          : ""
      }
      <input type="file" id="bsCam" accept="image/*" capture="environment" multiple hidden><input type="file" id="bsFile" accept="image/*" multiple hidden>
      <p class="small muted" style="margin:12px 4px 0">${escHtml(uiText("bs_priv"))}</p>`;
    if (first && !reducedMotion())
      b.querySelectorAll(".srhero,.bsintro,.bsbtns,.tmnew,.vacard").forEach((e, i) =>
        e.animate(
          [
            {
              opacity: 0,
              transform: "translateY(14px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 500,
            delay: i * 80,
            easing: "cubic-bezier(.2,1.2,.35,1)",
            fill: "backwards",
          }
        )
      );
    return;
  }
  if (BS.st === 1) {
    b.innerHTML = `<div class="bsscan"><img src="${BS.img}" alt=""><i class="bsbeam"></i><span class="bscorner"></span></div><p class="bsstat"><span class="dots3"><i></i><i></i><i></i></span> ${escHtml(uiText("bs_reading"))}</p>`;
    return;
  }
  const d = BS.d || {},
    F = BS.found || {},
    keys = [
      ["from", "bs_f_from", "date"],
      ["to", "bs_f_to", "date"],
      ["regel", "bs_f_regel", "num"],
      ["kdu", "bs_f_kdu", "num"],
      ["heiz", "bs_f_heiz", "num"],
      ["mehr", "bs_f_mehr", "num"],
      ["ek", "bs_f_ek", "num"],
      ["total", "bs_f_total", "num"],
      ["date", "bs_f_date", "date"],
    ];
  const chips = Object.keys(F)
    .filter((k) => F[k])
    .map((k) => {
      const def = keys.find((x) => x[0] === k);
      if (!def) return "";
      return `<span class="bschip">${escHtml(uiText(def[1]))}: <b>${escHtml(
        def[2] === "num"
          ? fmtEur(d[k] || 0)
          : fxDate(d[k], {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
      )}</b></span>`;
    })
    .join("");
  const sumP =
    (Number(d.regel) || 0) + (Number(d.kdu) || 0) + (Number(d.heiz) || 0) + (Number(d.mehr) || 0) - (Number(d.ek) || 0);
  b.innerHTML = `${BS.img || d.img ? `<div class="bsthumb">${BS.img ? `<img src="${BS.img}" alt="" data-bszoom>` : `<button type="button" class="vadone" data-bsview="${escHtml(BS.edit || "")}">${svgIcon("clip", 15)} ${escHtml(uiText("bs_showimg"))}</button>`}</div>` : ""}
    ${BS.scanned ? (chips ? `<div class="vak">${escHtml(uiText("bs_found"))}</div><div class="bschips">${chips}</div>` : `<div class="fcwarn on"><b>${escHtml(uiText("bs_nothing"))}</b><span>${escHtml(uiText("bs_nothing_s"))}</span></div>`) : ""}
    <div class="vak">${escHtml(uiText("bs_check"))}</div>
    <div class="vacard bsform">
      <div class="field"><label>${escHtml(uiText("bs_kind"))}</label><select class="in" data-bsf="kind"><option value="bew" ${d.kind !== "aend" && d.kind !== "ab" ? "selected" : ""}>${escHtml(uiText("bs_k_b"))}</option><option value="aend" ${d.kind === "aend" ? "selected" : ""}>${escHtml(uiText("bs_k_a"))}</option><option value="ab" ${d.kind === "ab" ? "selected" : ""}>${escHtml(uiText("bs_k_ab"))}</option></select></div>
      <div class="grid2">${keys
        .filter((k) => k[2] === "date" && k[0] !== "date")
        .map(
          ([k, l]) =>
            `<div class="field ${F[k] ? "bsok" : ""}"><label>${escHtml(uiText(l))}</label><input class="in" type="date" data-bsf="${k}" value="${escHtml(d[k] || "")}"></div>`
        )
        .join("")}</div>
      <div class="grid2">${keys
        .filter((k) => k[2] === "num" && k[0] !== "total")
        .map(
          ([k, l]) =>
            `<div class="field ${F[k] ? "bsok" : ""}"><label>${escHtml(uiText(l))}</label><input class="in" inputmode="decimal" data-bsf="${k}" value="${d[k] != null && d[k] !== "" ? escHtml(numStr(d[k])) : ""}" placeholder="0,00"></div>`
        )
        .join("")}</div>
      <div class="field ${F.total ? "bsok" : ""}"><label>${escHtml(uiText("bs_f_total"))}</label><div class="bstot"><input class="in" inputmode="decimal" data-bsf="total" value="${d.total != null && d.total !== "" ? escHtml(numStr(d.total)) : ""}" placeholder="0,00"><button type="button" class="vadone" data-bssum>= ${escHtml(fmtEur(sumP))}</button></div></div>
      <div class="field ${F.date ? "bsok" : ""}"><label>${escHtml(uiText("bs_f_date"))}</label><input class="in" type="date" data-bsf="date" value="${escHtml(d.date || "")}"><span class="small muted">${escHtml(uiText("bs_date_s"))}</span></div>
      <label class="kidedu"><input type="checkbox" id="bsUse" ${d.use !== false ? "checked" : ""}> <span>${escHtml(uiText("bs_use"))}</span></label>
      <label class="kidedu"><input type="checkbox" id="bsTerms" ${d.terms !== false ? "checked" : ""}> <span>${escHtml(uiText("bs_terms"))}</span></label></div>
    ${bsChecks(d)}
    <div class="vabtns" style="margin-top:12px">${BS.edit ? `<button type="button" class="btn danger" data-bsdel="${escHtml(BS.edit)}">${escHtml(uiText("tm_del"))}</button>` : `<button type="button" class="btn" data-bsback>${escHtml(uiText("tm_cancel"))}</button>`}<button type="button" class="btn primary" data-bssave>✓ ${escHtml(uiText("bs_save"))}</button></div>`;
  if (BS.scanned && !reducedMotion()) {
    b.querySelectorAll(".bschip").forEach((c, i) =>
      c.animate(
        [
          {
            opacity: 0,
            transform: "scale(.5) translateY(10px)",
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 450,
          delay: 150 + i * 110,
          easing: "cubic-bezier(.3,1.7,.5,1)",
          fill: "backwards",
        }
      )
    );
    BS.scanned = false;
  }
}
function bsChecks(d) {
  const out = [],
    wid = d.date ? addMonths(addDays(d.date, 4), 1) : null;
  if (wid) {
    const n = daysTo(wid);
    out.push(
      n >= 0
        ? `<div class="bsck ${n <= 7 ? "bad" : "warn"}"><span>⏳</span><span class="grow"><b>${escHtml(
            uiText("bs_w", {
              d: dLong(wid, {
                day: "numeric",
                month: "long",
              }),
            })
          )}</b><small>${escHtml(
            uiText("bs_w_s", {
              n: String(n),
            })
          )}</small></span></div>`
        : `<div class="bsck"><span>${svgIcon("check", 18)}</span><span class="grow"><b>${escHtml(uiText("bs_w_over"))}</b></span></div>`
    );
  }
  const rent = sum(
    store.fixed.filter((f) => /miete|warmmiete|kaltmiete|wohnung/i.test(f.name || "")),
    (f) => Number(f.amount) || 0
  );
  if (Number(d.kdu) > 0 && rent > 0 && rent - (Number(d.kdu) + (Number(d.heiz) || 0)) > 15 && !jlCfg().rentDirect)
    out.push(
      `<div class="bsck bad"><span>${svgIcon("alert", 18)}</span><span class="grow"><b>${escHtml(
        uiText("bs_rent", {
          a: fmtEur0(Number(d.kdu) + (Number(d.heiz) || 0)),
          b: fmtEur0(rent),
        })
      )}</b><small>${escHtml(uiText("bs_rent_s"))}</small></span></div>`
    );
  const ek = Number(d.ek) || 0,
    mini = Number(jlCfg().mini) || 0;
  if (ek > 0 && mini > 0) {
    const exp = Math.max(0, mini - jlKeep(mini));
    out.push(
      Math.abs(exp - ek) <= 10
        ? `<div class="bsck ok"><span>${svgIcon("check", 18)}</span><span class="grow"><b>${escHtml(
            uiText("bs_ek_ok", {
              n: fmtEur0(ek),
            })
          )}</b></span></div>`
        : `<div class="bsck warn"><span>ℹ️</span><span class="grow"><b>${escHtml(
            uiText("bs_ek_diff", {
              a: fmtEur0(ek),
              b: fmtEur0(exp),
            })
          )}</b><small>${escHtml(uiText("bs_ek_s"))}</small></span></div>`
    );
  }
  const sumP =
    (Number(d.regel) || 0) + (Number(d.kdu) || 0) + (Number(d.heiz) || 0) + (Number(d.mehr) || 0) - (Number(d.ek) || 0);
  if (Number(d.total) > 0 && sumP > 0 && Math.abs(sumP - Number(d.total)) > 1)
    out.push(
      `<div class="bsck warn"><span>🧮</span><span class="grow"><b>${escHtml(
        uiText("bs_sum", {
          a: fmtEur(sumP),
          b: fmtEur(Number(d.total)),
        })
      )}</b><small>${escHtml(uiText("bs_sum_s"))}</small></span></div>`
    );
  if (d.to) {
    const wb = addMonths(d.to, -1),
      n = daysTo(wb);
    if (n >= -31)
      out.push(
        `<div class="bsck ${n <= 14 ? "warn" : ""}"><span>${svgIcon("repeat", 18)}</span><span class="grow"><b>${escHtml(
          uiText("bs_wb", {
            d: dLong(wb, {
              day: "numeric",
              month: "long",
            }),
          })
        )}</b><small>${escHtml(
          uiText("bs_wb_s", {
            d: dLong(d.to, {
              day: "numeric",
              month: "long",
            }),
          })
        )}</small></span></div>`
      );
  }
  return out.length
    ? `<div class="vak">${escHtml(uiText("bs_checks"))}</div><div class="vacard bscks">${out.join("")}</div>`
    : "";
}
function bsNum(s) {
  const a = amountsIn(" " + s + " ");
  return a.length ? a[a.length - 1] : null;
}
function bsDate(s) {
  const m = String(s).match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!m) return null;
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  const mo = Number(m[2]),
    da = Number(m[1]);
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || y < 2015 || y > 2040) return null;
  return `${y}-${pad(mo)}-${pad(da)}`;
}
function bsParse(lines) {
  const T0 = lines.map((l) => (typeof l === "string" ? l : l.t)).filter(Boolean),
    d = {},
    F = {},
    low = T0.map((t) => t.toLowerCase());
  const RX = /(\d{1,2}\.\d{1,2}\.\d{2,4})\s*(?:-|–|—|bis(?:\s+zum)?|to)\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i;
  for (const t of T0) {
    const m = t.match(RX);
    if (m) {
      const a = bsDate(m[1]),
        b = bsDate(m[2]);
      if (a && b && b > a) {
        d.from = a;
        d.to = b;
        F.from = F.to = 1;
        break;
      }
    }
  }
  const pick = (re, not) => {
    for (let i = 0; i < T0.length; i++) {
      if (re.test(low[i]) && !(not && not.test(low[i]))) {
        let v = bsNum(T0[i]);
        if (v == null && T0[i + 1]) v = bsNum(T0[i + 1]);
        if (v != null) return v;
      }
    }
    return null;
  };
  const set = (k, v) => {
    if (v != null && v > 0 && v < 20000) {
      d[k] = v;
      F[k] = 1;
    }
  };
  set("regel", pick(/regelbedarf|regelsatz|regelleistung/));
  set("kdu", pick(/unterkunft|grundmiete|kaltmiete|miete|wohnkosten|kosten der unterkunft/, /heiz/));
  set("heiz", pick(/heiz/));
  set("mehr", pick(/mehrbedarf/));
  set("ek", pick(/anzurechnend|anrechenbar|einkommen|erwerbs/, /freibetrag|ohne/));
  let tot = null;
  for (let i = 0; i < T0.length; i++)
    if (/gesamt|insgesamt|zahlbetrag|auszahlungsbetrag|leistungsanspruch|monatlich|zu zahlen|summe/.test(low[i])) {
      const a = amountsIn(" " + T0[i] + " ").concat(T0[i + 1] ? amountsIn(" " + T0[i + 1] + " ") : []);
      for (const v of a) if (v > (tot || 0) && v < 20000) tot = v;
    }
  set("total", tot);
  for (let i = 0; i < Math.min(T0.length, 25); i++) {
    if (RX.test(T0[i])) continue;
    if (/datum|vom|den/.test(low[i]) || i < 12) {
      const x = bsDate(T0[i]);
      if (x && x <= isoToday()) {
        d.date = x;
        F.date = 1;
        break;
      }
    }
  }
  if (/änderungsbescheid|aenderungsbescheid/.test(low.join(" "))) d.kind = "aend";
  else if (/ablehnung|abgelehnt/.test(low.join(" "))) d.kind = "ab";
  return {
    d,
    F,
  };
}
async function bsScan(file) {
  const fs = Array.isArray(file) ? file : [file];
  let img;
  try {
    img = await tmShrink(fs[0]);
  } catch (_) {
    toast(uiText("bs_err_img"));
    return;
  }
  BS.img = img;
  BS.st = 1;
  bsRender();
  const t0 = performance.now();
  let lines = [];
  {
    const R = await readPages(fs);
    lines = R.lines;
    if (R.img) BS.img = R.img;
  }
  const wait = Math.max(0, 1800 - (performance.now() - t0));
  await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : wait));
  const { d, F } = bsParse(lines || []);
  BS.d = {
    kind: "bew",
    use: true,
    terms: true,
    ...d,
  };
  BS.found = F;
  BS.st = 2;
  BS.scanned = true;
  bsRender();
  if (!Object.keys(F).length) toast(uiText("bs_nothing"));
}
function bsReadForm() {
  const bg = $("bsBg"),
    d = {
      ...(BS.d || {}),
    };
  bg.querySelectorAll("[data-bsf]").forEach((i) => {
    const k = i.dataset.bsf;
    if (i.type === "date" || i.dataset.cal || i.tagName === "SELECT") d[k] = i.value || "";
    else {
      const v = (i.value || "").trim();
      d[k] = v === "" ? "" : parseAmt(v) || 0;
    }
  });
  d.use = $("bsUse").checked;
  d.terms = $("bsTerms").checked;
  return d;
}
document.addEventListener("click", async (e) => {
  const op = e.target.closest("[data-bsopen]");
  if (op) {
    e.preventDefault();
    bsOpen();
    return;
  }
  const bg = $("bsBg");
  if (!bg || bg.hidden || !bg.contains(e.target)) return;
  const pk = e.target.closest("[data-bspick]");
  if (pk) {
    $(pk.dataset.bspick === "cam" ? "bsCam" : "bsFile").click();
    return;
  }
  if (e.target.closest("[data-bsmanual]")) {
    BS.d = {
      kind: "bew",
      use: true,
      terms: true,
    };
    BS.found = {};
    BS.img = null;
    BS.edit = null;
    BS.st = 2;
    bsRender();
    return;
  }
  const ed = e.target.closest("[data-bsedit]");
  if (ed) {
    const x = bsList().find((b) => b.id === ed.dataset.bsedit);
    if (x) {
      BS.d = {
        ...x,
      };
      BS.edit = x.id;
      BS.img = null;
      BS.found = {};
      BS.st = 2;
      bsRender();
    }
    return;
  }
  if (e.target.closest("[data-bsback]")) {
    BS.st = 0;
    BS.img = null;
    bsRender();
    return;
  }
  if (e.target.closest("[data-bszoom]")) {
    tmShow(BS.img);
    return;
  }
  const vw = e.target.closest("[data-bsview]");
  if (vw) {
    const img = await rcptGet("bs-" + vw.dataset.bsview);
    if (img) tmShow(img);
    return;
  }
  if (e.target.closest("[data-bssum]")) {
    const d = bsReadForm(),
      s =
        (Number(d.regel) || 0) +
        (Number(d.kdu) || 0) +
        (Number(d.heiz) || 0) +
        (Number(d.mehr) || 0) -
        (Number(d.ek) || 0);
    d.total = round2(s);
    BS.d = d;
    bsRender();
    return;
  }
  const dl = e.target.closest("[data-bsdel]");
  if (dl) {
    const j = jlCfg();
    j.bescheide = bsList().filter((x) => x.id !== dl.dataset.bsdel);
    j.terms = j.terms.filter((t) => t.bs !== dl.dataset.bsdel);
    await saveSettings();
    BS.st = 0;
    bsRender();
    return;
  }
  if (e.target.closest("[data-bssave]")) {
    const d = bsReadForm();
    if (!(Number(d.total) > 0) && !(Number(d.regel) > 0)) {
      toast(uiText("bs_need"));
      return;
    }
    const j = jlCfg(),
      id = BS.edit || newId(),
      rec = {
        id,
        kind: d.kind || "bew",
        from: d.from || "",
        to: d.to || "",
        regel: Number(d.regel) || 0,
        kdu: Number(d.kdu) || 0,
        heiz: Number(d.heiz) || 0,
        mehr: Number(d.mehr) || 0,
        ek: Number(d.ek) || 0,
        total: Number(d.total) || 0,
        date: d.date || "",
        use: d.use,
        terms: d.terms,
      };
    rec.wid = rec.date ? addMonths(addDays(rec.date, 4), 1) : "";
    if (BS.img) {
      try {
        await rcptPut("bs-" + id, BS.img);
        rec.img = 1;
      } catch (_) {}
    } else if ((bsList().find((x) => x.id === id) || {}).img) rec.img = 1;
    j.bescheide = [...bsList().filter((x) => x.id !== id), rec];
    j.terms = j.terms.filter((t) => t.bs !== id);
    if (rec.terms) {
      if (rec.wid && daysTo(rec.wid) >= 0)
        j.terms.push({
          id: newId(),
          bs: id,
          k: "frist",
          n: uiText("bs_t_w"),
          d: rec.wid,
          t: "",
          bring: [
            {
              n: uiText("bs_t_w_b"),
              ok: false,
            },
          ],
        });
      if (rec.to) {
        const wb = addMonths(rec.to, -1);
        if (daysTo(rec.to) >= 0)
          j.terms.push({
            id: newId(),
            bs: id,
            k: "frist",
            n: uiText("bs_t_wb"),
            d: daysTo(wb) >= 0 ? wb : isoToday(),
            t: "",
            bring: [
              {
                n: uiText("bs_t_wb_b"),
                ok: false,
              },
            ],
          });
      }
    }
    if (rec.use && rec.total > 0 && (!rec.to || rec.to >= isoToday())) j.amount = rec.total;
    await saveSettings();
    const sb = e.target.closest("[data-bssave]").getBoundingClientRect();
    hbBurst(document.body, sb.left + sb.width / 2, sb.top, 24);
    toast(uiText("bs_saved"));
    BS.st = 0;
    BS.img = null;
    bsRender(true);
    return;
  }
});
document.addEventListener("change", (e) => {
  const id = e.target.id;
  if (id === "bsCam" || id === "bsFile") {
    const fs = [...(e.target.files || [])];
    e.target.value = "";
    if (fs.length > 1 && id === "bsFile")
      inbOpen(fs, {
        type: "bs",
      });
    else if (fs.length) bsScan(fs.length > 1 ? fs : fs[0]);
  } else if (e.target.dataset && e.target.dataset.bsf && $("bsBg") && !$("bsBg").hidden) {
    BS.d = bsReadForm();
    const ck = $("bsBg").querySelector(".bscks");
    const html = bsChecks(BS.d);
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const prev = ck ? ck.previousElementSibling : null;
    if (ck) {
      ck.remove();
      if (prev && prev.classList.contains("vak")) prev.remove();
    }
    const form = $("bsBg").querySelector(".bsform");
    if (form) form.after(...tmp.childNodes);
    const sm = $("bsBg").querySelector("[data-bssum]");
    if (sm) {
      const d = BS.d;
      sm.textContent =
        "= " +
        fmtEur(
          (Number(d.regel) || 0) +
            (Number(d.kdu) || 0) +
            (Number(d.heiz) || 0) +
            (Number(d.mehr) || 0) -
            (Number(d.ek) || 0)
        );
    }
  }
});

/* ---------- Steuerbescheide: Scan · Akte · Cockpit ---------- */
const STB = {
  st: 0,
  img: null,
  d: null,
  F: {},
  sel: null,
  edit: null,
  act: {
    pay: 1,
    ein: 1,
    vz: 1,
    pot: 1,
  },
};
function stbList() {
  return (store.settings.stb = store.settings.stb || []);
}
function stbSorted() {
  return stbList()
    .slice()
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || (b.date || "").localeCompare(a.date || ""));
}
function stbWid(x) {
  return x && x.date ? addMonths(addDays(x.date, 4), 1) : "";
}
function stbVzDates(x) {
  if (!(Number(x.vz) > 0) || !x.vzFrom) return [];
  const out = [];
  let d = x.vzFrom;
  for (let i = 0; i < 4; i++) {
    out.push(d);
    d = addMonths(d, 3);
  }
  return out;
}
function stbRate(x) {
  const e = Number(x && x.est) || 0,
    z = Number(x && x.zve) || 0;
  if (!(e > 0 && z > 0)) return 0;
  return Math.max(5, Math.min(45, Math.ceil((e / z) * 100) + 2));
}
function stbSign(x) {
  return x.res === "ref" ? 1 : x.res === "due" ? -1 : 0;
}
function stbAmt(x) {
  return stbSign(x) * (Number(x.amt) || 0);
}
function stbPot() {
  let bal = 0,
    need = 0;
  try {
    const t = taxCalc(new Date().getFullYear());
    bal = Math.max(0, t.resBal || 0);
  } catch (_) {}
  const td = isoToday();
  for (const x of stbList()) {
    if (x.res === "due" && !x.paid) need += Number(x.amt) || 0;
    for (const d of stbVzDates(x)) if (d >= td && d.slice(0, 4) === td.slice(0, 4)) need += Number(x.vz) || 0;
  }
  return {
    bal,
    need,
  };
}
function stbOpen(id) {
  STB.st = 0;
  STB.img = null;
  STB.d = null;
  STB.F = {};
  STB.edit = null;
  STB.sel = null;
  hbSheet("stbBg", uiText("stb_title"));
  if (id && stbList().some((x) => x.id === id)) {
    STB.sel = id;
    STB.st = 3;
  }
  stbRender(true);
}
function stbAnim(b, sel, base) {
  if (reducedMotion()) return;
  b.querySelectorAll(sel).forEach((e, i) =>
    e.animate(
      [
        {
          opacity: 0,
          transform: "translateY(16px) scale(.98)",
        },
        {
          opacity: 1,
          transform: "none",
        },
      ],
      {
        duration: 520,
        delay: (base || 0) + i * 80,
        easing: "cubic-bezier(.2,1.2,.35,1)",
        fill: "backwards",
      }
    )
  );
}
function stbRender(first) {
  const bg = $("stbBg");
  if (!bg || bg.hidden) return;
  const b = bg.querySelector(".hobody"),
    L = stbSorted(),
    E = (v) => escHtml(fmtEur0(v)),
    D = (d, o) =>
      escHtml(
        dLong(
          d,
          o || {
            day: "numeric",
            month: "long",
          }
        )
      );
  /* ---- Cockpit ---- */
  if (STB.st === 0) {
    const yrs = L.slice()
        .filter((x, i, a) => a.findIndex((y) => y.year === x.year) === i)
        .slice(0, 5)
        .reverse(),
      mx = Math.max(1, ...yrs.map((x) => Math.abs(stbAmt(x))));
    const rate = Number(store.settings.reserveRate) || 0,
      P = stbPot(),
      pct = P.need > 0 ? Math.min(100, (P.bal / P.need) * 100) : rate ? 100 : 0;
    b.innerHTML = `${
      L.length
        ? `<div class="vacard stbbars"><div class="vak" style="margin:0 0 6px">${escHtml(uiText("stb_bars"))}</div><div class="stbb">${yrs
            .map((x) => {
              const v = stbAmt(x),
                h = Math.max(8, (Math.abs(v) / mx) * 100);
              return `<button type="button" data-stbsel="${escHtml(x.id)}"><em>${v > 0 ? "+" : v < 0 ? "−" : ""}${E(Math.abs(v))}</em><i class="${v < 0 ? "neg" : ""}" style="--h:${h}%"></i><small>${escHtml(String(x.year || ""))}</small></button>`;
            })
            .join("")}</div></div>`
        : `<div class="bsintro"><div class="bsdoc">${svgIcon("doctax", 56)}<i></i></div><b>${escHtml(uiText("stb_intro"))}</b><span>${escHtml(uiText("stb_intro_s"))}</span></div>`
    }
      ${
        hasSelf()
          ? `<div class="vacard stbpot"><div class="stbring" style="--p:${pct}"><b data-noi18n>${rate ? rate + " %" : "–"}</b></div><div class="grow"><div class="vak" style="margin:0 0 3px">${escHtml(uiText("stb_pot"))}</div>${
              rate
                ? `<b>${escHtml(
                    uiText("stb_pot_t", {
                      n: String(rate),
                    })
                  )}</b>${
                    P.need > 0
                      ? `<small>${escHtml(
                          uiText("stb_pot_s", {
                            a: fmtEur0(P.bal),
                            b: fmtEur0(P.need),
                          })
                        )}</small>`
                      : ""
                  }${
                    resAway().amt
                      ? `<button type="button" class="rawl" data-raopen>${svgIcon("piggy", 14)} ${escHtml(
                          resAway().where
                            ? uiText("ra_line_w", {
                                a: fmtEur0(resAway().amt),
                                w: resAway().where,
                              })
                            : uiText("ra_line", {
                                a: fmtEur0(resAway().amt),
                              })
                        )}</button>`
                      : `<button type="button" class="rawl" data-raopen>${escHtml(uiText("ra_btn"))} ›</button>`
                  }`
                : `<small>${escHtml(uiText("stb_pot_none"))}</small>`
            }</div></div>`
          : ""
      }
      <div class="bsbtns"><button type="button" class="vakb" data-stbpick="cam">${svgIcon("camera", 18)} ${escHtml(uiText("bs_photo"))}</button><button type="button" class="vadone" data-stbpick="file">${svgIcon("doc", 18)} ${escHtml(uiText("stb_import"))}</button></div>
      <button type="button" class="btn tmnew" data-stbmanual>${svgIcon("pen", 18)} ${escHtml(uiText("stb_manual"))}</button>
      ${
        L.length
          ? `<div class="vak">${escHtml(uiText("stb_list"))}</div><div class="vacard">${L.map((x) => {
              const v = stbAmt(x),
                wd = dLeft(stbWid(x)),
                open = (x.res === "due" && !x.paid) || (wd != null && wd >= 0);
              return `<button type="button" class="fcr tmrow" data-stbsel="${escHtml(x.id)}"><span class="tmico">${svgIcon("doctax", 18)}</span><span class="grow"><b>${escHtml(String(x.year || "–"))} · <span class="${v < 0 ? "stbneg" : "stbpos"}">${v > 0 ? "+" : v < 0 ? "−" : "±"}${E(Math.abs(v))}</span></b><small>${
                x.date
                  ? escHtml(
                      uiText("stb_from", {
                        d: fxDate(x.date, {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }),
                      })
                    )
                  : ""
              }${
                wd != null && wd >= 0
                  ? ` · ${escHtml(
                      uiText("stb_ein", {
                        d: fxDate(stbWid(x), {
                          day: "numeric",
                          month: "short",
                        }),
                      })
                    )}`
                  : ""
              }${x.img ? " · " + svgIcon("clip", 12) : ""}</small></span><span class="vab ${open ? (wd != null && wd >= 0 && wd <= 7 ? "b-red" : "b-amb") : "b-grn"}">${escHtml(open ? uiText("stb_open") : uiText("stb_done"))}</span></button>`;
            }).join("")}</div>`
          : ""
      }
      <input type="file" id="stbCam" accept="image/*" capture="environment" multiple hidden><input type="file" id="stbFile" accept="image/*,application/pdf,.pdf" multiple hidden>
      <p class="small muted" style="margin:12px 4px 0">${escHtml(uiText("stb_priv"))}</p>`;
    if (first || STB.anim) {
      STB.anim = 0;
      stbAnim(b, ".stbbars,.bsintro,.stbpot,.bsbtns,.tmnew,.vak,.vacard:last-of-type");
      if (!reducedMotion()) {
        b.querySelectorAll(".stbb i").forEach((i, k) =>
          i.animate(
            [
              {
                transform: "scaleY(0)",
              },
              {
                transform: "scaleY(1.06)",
                offset: 0.75,
              },
              {
                transform: "scaleY(1)",
              },
            ],
            {
              duration: 800,
              delay: 250 + k * 110,
              easing: "cubic-bezier(.3,1.3,.5,1)",
              fill: "backwards",
            }
          )
        );
        b.querySelectorAll(".stbb em").forEach((e, k) => {
          e.animate(
            [
              {
                opacity: 0,
                transform: "translateY(8px)",
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 400,
              delay: 650 + k * 110,
              fill: "backwards",
            }
          );
        });
        const r = b.querySelector(".stbring");
        if (r) {
          const p = Number(r.style.getPropertyValue("--p")) || 0,
            t0 = performance.now();
          const tick = (now) => {
            const k = Math.min(1, (now - t0 - 300) / 1100);
            if (k > 0) r.style.setProperty("--p", (p * (1 - Math.pow(1 - k, 3))).toFixed(1));
            if (k < 1) requestAnimationFrame(tick);
          };
          r.style.setProperty("--p", 0);
          requestAnimationFrame(tick);
        }
      }
    }
    return;
  }
  /* ---- Scan läuft ---- */
  if (STB.st === 1) {
    b.innerHTML = `<div class="bsscan">${STB.img ? `<img src="${STB.img}" alt="">` : `<div class="stbpdf">${svgIcon("doctax", 70)}</div>`}<i class="bsbeam"></i><span class="bscorner"></span></div><p class="bsstat"><span class="dots3"><i></i><i></i><i></i></span> ${escHtml(uiText("bs_reading"))}</p>`;
    return;
  }
  /* ---- Prüfen & übernehmen ---- */
  if (STB.st === 2) {
    const d = STB.d || {},
      F = STB.F || {},
      A = STB.act,
      found = Object.keys(F).length;
    const chip = (k, txt) => (F[k] ? `<span class="bschip">${txt}</span>` : "");
    const chips = [
      chip(
        "year",
        escHtml(
          uiText("stb_c_year", {
            y: String(d.year),
          })
        )
      ),
      chip("amt", `${escHtml(d.res === "ref" ? uiText("stb_ref") : uiText("stb_due"))} <b>${E(d.amt)}</b>`),
      chip(
        "due",
        escHtml(
          uiText("stb_due_by", {
            d: fxDate(d.due, {
              day: "numeric",
              month: "short",
            }),
          })
        )
      ),
      chip("vz", `${escHtml(uiText("stb_f_vz"))} <b>${E(d.vz)}</b>`),
      chip("est", `${escHtml(uiText("stb_f_est"))} <b>${E(d.est)}</b>`),
      chip("zve", `${escHtml(uiText("stb_f_zve"))} <b>${E(d.zve)}</b>`),
      chip(
        "date",
        escHtml(
          uiText("stb_from", {
            d: fxDate(d.date, {
              day: "numeric",
              month: "short",
            }),
          })
        )
      ),
    ].join("");
    const wid = stbWid(d),
      rate = stbRate(d);
    const acts = [
      d.res === "due" && Number(d.amt) > 0 && d.due
        ? [
            "pay",
            uiText("stb_a_pay", {
              d: fxDate(d.due, {
                day: "numeric",
                month: "long",
              }),
            }),
          ]
        : null,
      wid && dLeft(wid) >= 0
        ? [
            "ein",
            uiText("stb_a_ein", {
              d: fxDate(wid, {
                day: "numeric",
                month: "long",
              }),
            }),
          ]
        : null,
      Number(d.vz) > 0 && d.vzFrom
        ? [
            "vz",
            uiText("stb_a_vz", {
              n: fmtEur0(d.vz),
            }),
          ]
        : null,
      hasSelf() && rate
        ? [
            "pot",
            uiText("stb_a_pot", {
              n: String(rate),
            }),
          ]
        : null,
    ].filter(Boolean);
    const fld = (k, l, type) =>
      `<div class="field ${F[k] ? "bsok" : ""}"><label>${escHtml(uiText(l))}</label><input class="in" ${type === "date" ? 'type="date"' : type === "year" ? 'inputmode="numeric" maxlength="4"' : 'inputmode="decimal" placeholder="0,00"'} data-stbf="${k}" value="${type === "num" ? (d[k] != null && d[k] !== "" ? escHtml(numStr(d[k])) : "") : escHtml(String(d[k] || ""))}"></div>`;
    b.innerHTML = `${STB.img || (STB.edit && d.img) ? `<div class="bsthumb">${STB.img ? `<img src="${STB.img}" alt="" data-stbzoom>` : `<button type="button" class="vadone" data-stbview="${escHtml(STB.edit)}">${svgIcon("clip", 15)} ${escHtml(uiText("bs_showimg"))}</button>`}</div>` : ""}
      ${STB.scanned ? `${found ? `<div class="bschips">${chips}</div>` : ""}<div class="fcmami on stbma">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub">${escHtml(mFill(Object.keys(F).some((k) => !["vorb", "vorl", "abw"].includes(k)) ? uiText("stb_mami") : uiText("stb_mami0")))}</div></div>${window.HB_OCRTXT ? `<details class="ocrraw"><summary>${escHtml(uiText("ocr_raw"))}</summary><pre>${escHtml(window.HB_OCRTXT)}</pre></details>` : ""}` : ""}
      ${acts.length ? `<div class="vak">${escHtml(uiText("stb_do"))}</div><div class="vacard stbacts">${acts.map(([k, t]) => `<label class="stbact ${A[k] ? "on" : ""}"><input type="checkbox" data-stbact="${k}" ${A[k] ? "checked" : ""}><span class="stbck">✓</span><span>${escHtml(t)}</span></label>`).join("")}</div>` : ""}
      <div class="vak">${escHtml(uiText("bs_check"))}</div>
      <div class="vacard bsform">
        <div class="grid2">${fld("year", "stb_f_year", "year")}${fld("date", "stb_f_date", "date")}</div>
        <div class="field"><label>${escHtml(uiText("stb_f_res"))}</label><div class="stbseg">${[
          ["due", "stb_due"],
          ["ref", "stb_ref"],
          ["zero", "stb_zero"],
        ]
          .map(
            ([v, l]) =>
              `<button type="button" class="${(d.res || "due") === v ? "on" : ""}" data-stbres="${v}">${escHtml(uiText(l))}</button>`
          )
          .join("")}</div></div>
        <div class="grid2">${fld("amt", "stb_f_amt", "num")}${fld("due", "stb_f_due", "date")}</div>
        <div class="grid2">${fld("vz", "stb_f_vz", "num")}${fld("vzFrom", "stb_f_vzfrom", "date")}</div>
        <div class="grid2">${fld("est", "stb_f_est", "num")}${fld("zve", "stb_f_zve", "num")}</div>
        <label class="kidedu"><input type="checkbox" id="stbVorb" ${d.vorb ? "checked" : ""}> <span>${escHtml(uiText("stb_vorb"))}</span></label>
        <label class="kidedu"><input type="checkbox" id="stbVorl" ${d.vorl ? "checked" : ""}> <span>${escHtml(uiText("stb_vorl"))}</span></label></div>
      <div class="vabtns" style="margin-top:12px">${STB.edit ? `<button type="button" class="btn danger" data-stbdel="${escHtml(STB.edit)}">${escHtml(uiText("tm_del"))}</button>` : `<button type="button" class="btn" data-stbback>${escHtml(uiText("tm_cancel"))}</button>`}<button type="button" class="btn primary stbgo" data-stbsave>✓ ${escHtml(uiText("stb_save"))}</button></div>`;
    if (STB.scanned && !reducedMotion()) {
      b.querySelectorAll(".bschip").forEach((c, i) =>
        c.animate(
          [
            {
              opacity: 0,
              transform: "scale(.5) translateY(10px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 450,
            delay: 150 + i * 110,
            easing: "cubic-bezier(.3,1.7,.5,1)",
            fill: "backwards",
          }
        )
      );
      const ma = b.querySelector(".stbma");
      if (ma)
        ma.animate(
          [
            {
              opacity: 0,
              transform: "translateY(14px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 520,
            delay: 300 + b.querySelectorAll(".bschip").length * 110,
            easing: "cubic-bezier(.2,1.3,.4,1)",
            fill: "backwards",
          }
        );
      b.querySelectorAll(".stbact").forEach((c, i) =>
        c.animate(
          [
            {
              opacity: 0,
              transform: "translateX(-18px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 420,
            delay: 700 + i * 140,
            easing: "cubic-bezier(.2,1.2,.35,1)",
            fill: "backwards",
          }
        )
      );
    } else if (first) stbAnim(b, ".vak,.vacard,.vabtns");
    STB.scanned = false;
    return;
  }
  /* ---- Akte ---- */
  const x = stbList().find((y) => y.id === STB.sel);
  if (!x) {
    STB.st = 0;
    return stbRender(true);
  }
  const v = stbAmt(x),
    wid = stbWid(x),
    wd = dLeft(wid),
    vzd = stbVzDates(x).filter((d) => d >= isoToday()),
    td = isoToday();
  const tl = [];
  if (wid)
    tl.push(
      wd >= 0
        ? `<div class="stbp ${wd <= 7 ? "r" : "w"}"><b>${escHtml(
            uiText("stb_ein", {
              d: fxDate(wid, {
                day: "numeric",
                month: "long",
              }),
            })
          )}</b><small>${escHtml(
            uiText("stb_ein_s", {
              n: String(wd),
            })
          )}</small></div>`
        : `<div class="stbp g"><b>${escHtml(uiText("stb_ein_over"))}</b></div>`
    );
  if (x.res === "due" && x.due)
    tl.push(
      `<div class="stbp ${x.paid ? "g" : dLeft(x.due) <= 7 ? "r" : ""}"><b>${escHtml(
        uiText("stb_pay", {
          d: fxDate(x.due, {
            day: "numeric",
            month: "long",
          }),
        })
      )}</b><small>${escHtml(x.paid ? uiText("stb_paid_ok") : x.fixPay ? uiText("stb_pay_s") : uiText("stb_pay_s0"))}</small></div>`
    );
  if (x.res === "ref")
    tl.push(
      `<div class="stbp g"><b>${escHtml(uiText("stb_refin"))}</b><small>${escHtml(uiText("stb_refin_s"))}</small></div>`
    );
  if (vzd.length)
    tl.push(
      `<div class="stbp"><b>${escHtml(
        uiText("stb_vz", {
          d: fxDate(vzd[0], {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        })
      )}</b><small>${escHtml(
        uiText("stb_vz_s", {
          n: fmtEur0(x.vz),
        })
      )}</small></div>`
    );
  const ab = x.abw || [];
  b.innerHTML = `<div class="srhero stbhero ${v < 0 && !x.paid ? "neg" : ""}"><small>${escHtml(
    uiText("stb_year", {
      y: String(x.year),
    })
  )}${
    x.res === "due" && x.due
      ? " · " +
        escHtml(
          uiText("stb_due_by", {
            d: fxDate(x.due, {
              day: "numeric",
              month: "short",
            }),
          })
        )
      : ""
  }</small><div class="srbig"><span id="stbN">${v > 0 ? "+" : v < 0 ? "−" : "±"}${E(Math.abs(v))}</span></div><span>${escHtml(x.res === "ref" ? uiText("stb_ref") : x.res === "due" ? uiText("stb_due") : uiText("stb_zero"))}${
    x.date
      ? " · " +
        escHtml(
          uiText("stb_from", {
            d: fxDate(x.date, {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          })
        )
      : ""
  }${x.paid ? " · ✓ " + escHtml(uiText("stb_paid_ok")) : ""}</span><i class="srsh"></i></div>
    ${tl.length ? `<div class="vak">${escHtml(uiText("stb_fr"))}</div><div class="vacard stbtl">${tl.join("")}</div>` : ""}
    <div class="vak">${escHtml(uiText("stb_abw"))}</div><div class="vacard">
      ${ab.map((a, i) => `<div class="fcr stbab"><span class="tmico">${svgIcon(a.ok ? "check" : "insight", 18)}</span><span class="grow"><b data-noi18n>${escHtml(a.t)}</b></span><button type="button" class="vab ${a.ok ? "b-grn" : "b-red"}" data-stbabw="${i}">${escHtml(a.ok ? uiText("stb_ok") : uiText("stb_chk"))}</button></div>`).join("")}
      ${x.vorb ? `<div class="fcr"><span class="tmico">${svgIcon("pin", 18)}</span><span class="grow"><b>${escHtml(uiText("stb_vorb"))}</b><small style="display:block;color:var(--muted);font-size:12px">${escHtml(uiText("stb_vorb_s"))}</small></span><span class="vab b-amb">${escHtml(uiText("stb_hint"))}</span></div>` : ""}
      ${x.vorl ? `<div class="fcr"><span class="tmico">${svgIcon("clock", 18)}</span><span class="grow"><b>${escHtml(uiText("stb_vorl"))}</b></span><span class="vab b-amb">${escHtml(uiText("stb_hint"))}</span></div>` : ""}
      <div class="tmadd"><input class="in" id="stbAbwIn" placeholder="${escHtml(uiText("stb_abw_ph"))}"><button type="button" class="btn primary" data-stbabwadd aria-label="${escHtml(uiText("stb_abw_add"))}">+</button></div></div>
    <div class="vabtns" style="margin-top:12px">${x.res === "due" && !x.paid ? `<button type="button" class="btn primary" data-stbpaid>✓ ${escHtml(uiText("stb_paid"))}</button>` : ""}${x.res === "ref" && !x.got ? `<button type="button" class="btn primary" data-stbgot>✓ ${escHtml(uiText("stb_got"))}</button>` : ""}<button type="button" class="btn" data-stbedit>${svgIcon("pen", 15)} ${escHtml(uiText("stb_edit"))}</button></div>${x.img ? `<button type="button" class="docscan" data-stbview="${escHtml(x.id)}"><span class="dsimg"><img alt="" data-dsimg="stb-${escHtml(x.id)}"></span><span class="grow"><b>${escHtml(uiText("scan_view"))}</b><small>${escHtml(uiText("scan_view_s"))}</small></span><span class="dsgo">›</span></button>` : ""}<button type="button" class="btn danger dsdel" data-stbdel="${escHtml(x.id)}" data-ask="1">${svgIcon("trash", 15)} ${escHtml(uiText("tm_del"))}</button>
    <button type="button" class="btn tmnew" data-stbhome>‹ ${escHtml(uiText("stb_title"))}</button>`;
  if (first || STB.anim) {
    STB.anim = 0;
    stbAnim(b, ".srhero,.vak,.vacard,.vabtns,.tmnew");
    if (!reducedMotion()) {
      b.querySelectorAll(".stbp").forEach((p, i) =>
        p.animate(
          [
            {
              opacity: 0,
              transform: "translateX(-14px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 450,
            delay: 300 + i * 130,
            easing: "cubic-bezier(.2,1.2,.35,1)",
            fill: "backwards",
          }
        )
      );
      const n = $("stbN");
      if (n && typeof hbOdo === "function") {
        const t = n.textContent;
        n.textContent = t.replace(/\d/g, "0");
        hbOdo(n, t, 1200);
      }
    }
  }
}
function stbNum(s) {
  const a = amountsIn(" " + s + " ");
  return a.length ? a[0] : null;
}
function stbInt(s) {
  const m = String(s).match(/(\d{1,3}(?:\.\d{3})+|\d{4,6})(?:,\d{2})?(?!\d)/);
  return m ? Number(m[1].replace(/\./g, "")) : null;
}
function stbParse(lines) {
  const T0 = lines.map((l) => (typeof l === "string" ? l : l.t || l.text || "")).filter(Boolean),
    low = T0.map((t) => t.toLowerCase()),
    all = low.join("\n"),
    d = {
      res: "due",
    },
    F = {};
  const next = (i, n) => T0.slice(i, i + (n || 2)).join("  ");
  let m =
    all.match(/bescheid\s+(?:für|fuer|über das jahr)\s+(20\d\d)/) ||
    all.match(/\bf\S{0,2}r\s+(20\d\d)\s+\S{0,2}ber\b/) ||
    all.match(/^\s*f\S{0,2}r\s+(20\d\d)\b/m) ||
    all.match(/bescheid\D{0,40}(20\d\d)/) ||
    all.match(/(?:veranlagungszeitraum|kalenderjahr|steuerjahr)\s*:?\s*(20\d\d)/) ||
    all.match(/einkommensteuer\D{0,20}(20\d\d)/);
  if (m) {
    d.year = Number(m[1]);
    F.year = 1;
  }
  for (let i = 0; i < T0.length; i++) {
    if (/zu versteuernde[sn]?\s+einkommen/.test(low[i])) {
      const v = stbInt(T0[i].replace(/^[^\d]*/, "")) || stbInt(T0[i + 1] || "");
      if (v) {
        d.zve = v;
        F.zve = 1;
        break;
      }
    }
  }
  for (let i = 0; i < T0.length; i++) {
    if (/festgesetzt/.test(low[i])) {
      for (let k = i; k < Math.min(T0.length, i + 5); k++) {
        if (/einkommensteuer|festgesetzt/.test(low[k])) {
          const a = amountsIn(" " + T0[k] + " ");
          if (a.length) {
            d.est = Math.max(...a);
            F.est = 1;
            break;
          }
        }
      }
      if (d.est) break;
    }
  }
  if (!d.est)
    for (let i = 0; i < T0.length; i++)
      if (/^\s*einkommensteuer\b/.test(low[i])) {
        const a = amountsIn(" " + T0[i] + " ");
        if (a.length) {
          d.est = a[0];
          F.est = 1;
          break;
        }
      }
  let due = null,
    ref = null;
  const tot = /insgesamt/.test(all);
  for (let i = 0; i < T0.length; i++) {
    const l = low[i],
      a = amountsIn(" " + T0[i] + " ");
    if (!a.length) continue;
    const v = round2(tot || a.length === 1 ? Math.max(...a) : a.slice(0, 4).reduce((p, c) => p + c, 0));
    if (!(v > 0)) continue;
    if (/zu\s*viel\s*gezahlt|zuviel gezahlt/.test(l)) {
      ref = v;
      break;
    }
    if (/zu\s*wenig\s*gezahlt|nachzuzahlen|noch zu zahlen/.test(l)) {
      due = v;
      break;
    }
  }
  if (due == null && ref == null)
    for (let i = 0; i < T0.length; i++) {
      const l = low[i];
      if (
        due == null &&
        /(nachzahlung|noch zu zahlen|zu wenig|bitte zahlen|abschlusszahlung|verbleibende beträge|verbleibender betrag|zu zahlen)/.test(
          l
        ) &&
        !/vorauszahl/.test(l)
      ) {
        const a = amountsIn(" " + T0[i] + " ").concat(amountsIn(" " + (T0[i + 1] || "") + " ").slice(0, 0));
        const s = a.slice(0, 4).reduce((p, c) => p + c, 0);
        if (s > 0) due = round2(s);
      }
      if (ref == null && /(erstattung|wird erstattet|zu viel|guthaben|erstattet)/.test(l)) {
        const a = amountsIn(" " + T0[i] + " ");
        const s = a.slice(0, 4).reduce((p, c) => p + c, 0);
        if (s > 0) ref = round2(s);
      }
    }
  if (due != null) {
    d.res = "due";
    d.amt = due;
    F.amt = 1;
  } else if (ref != null) {
    d.res = "ref";
    d.amt = ref;
    F.amt = 1;
  }
  for (let i = 0; i < T0.length; i++) {
    if (/(spätestens|zahlen sie bis|bis zum|fällig am|fällig)/.test(low[i]) && !/vorauszahl/.test(low[i])) {
      const x = bsDate(next(i, 2));
      if (x && x >= (d.date || "2015")) {
        d.due = x;
        F.due = 1;
        break;
      }
    }
  }
  const vz = {};
  for (let i = 0; i < T0.length; i++) {
    const r = T0[i].match(/10\.(03|06|09|12)\.(20\d\d|\d\d)/);
    if (r && /vorauszahl/.test(all)) {
      const a = amountsIn(" " + T0[i].replace(r[0], " ") + " ");
      if (a.length) {
        const dt = bsDate(r[0]);
        if (dt) vz[dt] = a[a.length - 1];
      }
    }
  }
  const vd = Object.keys(vz).sort(),
    fut = vd.filter((x) => x >= isoToday());
  if (vd.length) {
    const cnt = {};
    for (const k of vd) cnt[vz[k]] = (cnt[vz[k]] || 0) + 1;
    const q = Number(Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0]);
    if (q > 0) {
      d.vz = q;
      d.vzFrom = fut[0] || vd[vd.length - 1];
      F.vz = 1;
    }
  }
  for (let i = 0; i < Math.min(T0.length, 25); i++) {
    if (/(datum|^den\b|vom)/.test(low[i]) || i < 10) {
      const x = bsDate(T0[i]);
      if (x && x <= isoToday() && !/10\.(03|06|09|12)\./.test(T0[i])) {
        d.date = x;
        F.date = 1;
        break;
      }
    }
  }
  if (/vorbehalt der nachpr\S{0,3}fung|§\s*164/.test(all) && !/vorbehalt[\s\S]{0,40}aufgehoben/.test(all)) {
    d.vorb = true;
    F.vorb = 1;
  }
  if (/vorläufig|§\s*165/.test(all)) {
    d.vorl = true;
    F.vorl = 1;
  }
  const abw = [];
  for (const t of T0) {
    if (
      /(abweich|nicht anerkannt|nicht berücksichtigt|nicht abziehbar|gekürzt|konnten? nicht|nur in höhe|nicht als)/i.test(
        t
      ) &&
      t.length > 12
    )
      abw.push({
        t: t.trim().slice(0, 160),
        ok: false,
      });
    if (abw.length >= 6) break;
  }
  if (abw.length) {
    d.abw = abw;
    F.abw = 1;
  }
  if (!d.date) {
    for (let i = 0; i < T0.length; i++) {
      const x = bsDate(T0[i]);
      if (x && x <= isoToday() && x >= "2015" && !/10\.(03|06|09|12)\./.test(T0[i]) && !/geb|geburt/.test(low[i])) {
        d.date = x;
        F.date = 1;
        break;
      }
    }
  }
  if (!d.year && d.date) {
    d.year = Number(d.date.slice(0, 4)) - 1;
    F.year = 1;
  }
  return {
    d,
    F,
  };
}
async function stbPdf(file) {
  const buf = await file.arrayBuffer();
  const L = await pdfLines(buf);
  let img = null;
  try {
    const lib = await loadPdfJs(),
      doc = await lib.getDocument({
        data: new Uint8Array(buf),
        isEvalSupported: false,
      }).promise,
      pg = await doc.getPage(1),
      vp = pg.getViewport({
        scale: 1.4,
      }),
      c = document.createElement("canvas");
    c.width = vp.width;
    c.height = vp.height;
    await pg.render({
      canvasContext: c.getContext("2d"),
      viewport: vp,
    }).promise;
    img = c.toDataURL("image/jpeg", 0.72);
  } catch (_) {}
  return {
    lines: L.map((l) => l.text),
    img,
  };
}
async function stbScan(file) {
  const fs = Array.isArray(file) ? file : [file];
  let lines = [];
  STB.img = null;
  window.HB_OCRTXT = "";
  STB.st = 1;
  stbRender();
  const t0 = performance.now();
  {
    const R = await readPages(fs, (im) => {
      STB.img = im;
      stbRender();
    });
    lines = R.lines;
    STB.img = R.img || STB.img;
    if (R.err) toast(uiText("stb_pdf_err"));
  }
  const wait = Math.max(0, 2000 - (performance.now() - t0));
  await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : wait));
  const { d, F } = stbParse(lines || []);
  STB.d = d;
  STB.F = F;
  STB.edit = null;
  STB.act = {
    pay: 1,
    ein: 1,
    vz: 1,
    pot: 1,
  };
  STB.st = 2;
  STB.scanned = true;
  stbRender();
  if (!Object.keys(F || {}).length) toast(uiText("bs_nothing"));
}
function stbReadForm() {
  const bg = $("stbBg"),
    d = {
      ...(STB.d || {}),
    };
  bg.querySelectorAll("[data-stbf]").forEach((i) => {
    const k = i.dataset.stbf,
      v = (i.value || "").trim();
    if (i.type === "date" || i.dataset.cal) d[k] = v;
    else if (k === "year") d[k] = Number(v.replace(/\D/g, "")) || "";
    else d[k] = v === "" ? "" : parseAmt(v) || 0;
  });
  const a = $("stbVorb"),
    b = $("stbVorl");
  if (a) d.vorb = a.checked;
  if (b) d.vorl = b.checked;
  return d;
}
async function stbApply(rec, old) {
  const ym = (d) => d.slice(0, 7);
  for (const fid of [old && old.fixPay, old && old.fixVz].filter(Boolean)) {
    const f = store.fixed.find((y) => y.id === fid);
    if (f && !(rec.fixPay === fid || rec.fixVz === fid)) {
      try {
        await deleteDoc("fixed", fid);
      } catch (_) {}
    }
  }
  if (STB.act.pay && rec.res === "due" && rec.amt > 0 && rec.due && !rec.paid) {
    const id = rec.fixPay || newId(),
      m = Number(rec.due.slice(5, 7));
    await saveDoc("fixed", id, {
      name: uiText("stb_due") + " " + rec.year,
      amount: rec.amt,
      kind: "privat",
      cat: "Steuern",
      order: store.fixed.length,
      from: ym(rec.due),
      until: ym(rec.due),
      months: [m],
      days: [
        {
          from: ym(rec.due),
          day: Number(rec.due.slice(8, 10)),
        },
      ],
      stb: rec.id,
    });
    rec.fixPay = id;
  } else if (rec.fixPay && !STB.act.pay) {
    try {
      await deleteDoc("fixed", rec.fixPay);
    } catch (_) {}
    delete rec.fixPay;
  }
  if (STB.act.vz && rec.vz > 0 && rec.vzFrom) {
    for (const f of store.fixed)
      if (f.stbVz && f.id !== rec.fixVz && !f.until) {
        const { id: _, ...r } = f;
        r.until = ym(addMonths(rec.vzFrom, -1));
        await saveDoc("fixed", f.id, r);
      }
    const id = rec.fixVz || newId(),
      st = Number(rec.vzFrom.slice(5, 7));
    await saveDoc("fixed", id, {
      name:
        "ESt-" +
        uiText("stb_vz", {
          d: "",
        }).trim(),
      amount: rec.vz,
      kind: "privat",
      cat: "Steuern",
      order: store.fixed.length,
      from: ym(rec.vzFrom),
      rhythm: "quartal",
      months: rhythmMonths("quartal", st),
      days: [
        {
          from: ym(rec.vzFrom),
          day: 10,
        },
      ],
      stb: rec.id,
      stbVz: true,
    });
    rec.fixVz = id;
  }
  if (STB.act.pot && hasSelf()) {
    const r = stbRate(rec);
    if (r) store.settings.reserveRate = r;
  }
}
function stbHints(hints) {
  for (const x of stbList()) {
    const w = dLeft(stbWid(x));
    if (w != null && w >= 0 && w <= 7)
      hints.push({
        k: "stb",
        lvl: w <= 2 ? "warn" : "info",
        t: uiText("stb_h_ein", {
          y: String(x.year),
          n: String(w),
        }),
        s: uiText("stb_h_ein_s"),
      });
    if (x.res === "due" && !x.paid && x.due) {
      const n = dLeft(x.due);
      if (n >= 0 && n <= 7)
        hints.push({
          k: "stb",
          lvl: "warn",
          t: uiText("stb_h_pay", {
            n: fmtEur0(x.amt),
            d: fxDate(x.due, {
              day: "numeric",
              month: "long",
            }),
          }),
          s: uiText("stb_h_pay_s"),
        });
    }
  }
}
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-stbopen]")) {
    e.preventDefault();
    stbOpen();
    return;
  }
  const bg = $("stbBg");
  if (!bg || bg.hidden || !bg.contains(e.target)) return;
  const pk = e.target.closest("[data-stbpick]");
  if (pk) {
    $(pk.dataset.stbpick === "cam" ? "stbCam" : "stbFile").click();
    return;
  }
  if (e.target.closest("[data-stbmanual]")) {
    STB.d = {
      res: "due",
      year: new Date().getFullYear() - 1,
    };
    STB.F = {};
    STB.img = null;
    STB.edit = null;
    STB.act = {
      pay: 1,
      ein: 1,
      vz: 1,
      pot: 1,
    };
    STB.st = 2;
    stbRender(true);
    return;
  }
  const sl = e.target.closest("[data-stbsel]");
  if (sl) {
    STB.sel = sl.dataset.stbsel;
    STB.st = 3;
    stbRender(true);
    bg.querySelector(".hosh") &&
      bg.querySelector(".hosh").scrollTo &&
      bg.querySelector(".hosh").scrollTo({
        top: 0,
      });
    return;
  }
  if (e.target.closest("[data-stbhome]") || e.target.closest("[data-stbback]")) {
    STB.st = 0;
    STB.img = null;
    stbRender(true);
    return;
  }
  const rs = e.target.closest("[data-stbres]");
  if (rs) {
    STB.d = stbReadForm();
    STB.d.res = rs.dataset.stbres;
    stbRender();
    return;
  }
  if (e.target.closest("[data-stbzoom]")) {
    tmShow(STB.img);
    return;
  }
  const vw = e.target.closest("[data-stbview]");
  if (vw) {
    const img = await rcptGet("stb-" + vw.dataset.stbview);
    if (img) tmShow(img);
    return;
  }
  if (e.target.closest("[data-stbedit]")) {
    const x = stbList().find((y) => y.id === STB.sel);
    if (x) {
      STB.d = {
        ...x,
      };
      STB.edit = x.id;
      STB.F = {};
      STB.img = null;
      STB.act = {
        pay: x.fixPay ? 1 : 0,
        ein: 1,
        vz: x.fixVz ? 1 : 0,
        pot: 0,
      };
      STB.st = 2;
      stbRender(true);
    }
    return;
  }
  const ab = e.target.closest("[data-stbabw]");
  if (ab) {
    const x = stbList().find((y) => y.id === STB.sel);
    if (x && x.abw) {
      const a = x.abw[Number(ab.dataset.stbabw)];
      a.ok = !a.ok;
      await saveSettings();
      stbRender();
      const nb = bg.querySelectorAll("[data-stbabw]")[Number(ab.dataset.stbabw)];
      if (nb && !reducedMotion())
        nb.animate(
          [
            {
              transform: "scale(.6)",
            },
            {
              transform: "scale(1.15)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 380,
            easing: "cubic-bezier(.3,1.6,.5,1)",
          }
        );
    }
    return;
  }
  if (e.target.closest("[data-stbabwadd]")) {
    const i = $("stbAbwIn"),
      t = ((i && i.value) || "").trim(),
      x = stbList().find((y) => y.id === STB.sel);
    if (t && x) {
      (x.abw = x.abw || []).push({
        t,
        ok: false,
      });
      await saveSettings();
      stbRender();
    }
    return;
  }
  if (e.target.closest("[data-stbgot]")) {
    const x = stbList().find((y) => y.id === STB.sel);
    if (x) {
      x.got = true;
      await saveSettings();
      const r = e.target.closest("[data-stbgot]").getBoundingClientRect();
      try {
        hbBurst(document.body, r.left + r.width / 2, r.top, 30);
      } catch (_) {}
      STB.anim = 1;
      stbRender();
      try {
        render();
      } catch (_) {}
    }
    return;
  }
  if (e.target.closest("[data-stbpaid]")) {
    const x = stbList().find((y) => y.id === STB.sel);
    if (x) {
      x.paid = true;
      if (x.fixPay && x.due) {
        const k = ui.ym;
        ui.ym = x.due.slice(0, 7);
        try {
          await setMonthAmount(x.fixPay, Number(x.amt) || 0);
        } catch (_) {}
        ui.ym = k;
      }
      await saveSettings();
      const r = e.target.closest("[data-stbpaid]").getBoundingClientRect();
      hbBurst(document.body, r.left + r.width / 2, r.top, 30);
      const hh = bg.querySelector(".stbhero");
      if (hh) hbConfetti(hh, 40);
      STB.anim = 1;
      stbRender();
    }
    return;
  }
  const dl = e.target.closest("[data-stbdel]");
  if (dl) {
    if (dl.dataset.ask) {
      if (!dl.dataset.armed) {
        dl.dataset.armed = 1;
        dl.innerHTML = svgIcon("trash", 15) + " " + escHtml(uiText("del_sure"));
        dl.classList.add("armed");
        setTimeout(() => {
          if (dl.isConnected) {
            delete dl.dataset.armed;
            dl.textContent = "🗑️ " + uiText("tm_del");
            dl.classList.remove("armed");
          }
        }, 3500);
        return;
      }
    }
    try {
      await rcptDel("stb-" + dl.dataset.stbdel);
    } catch (_) {}
    const id = dl.dataset.stbdel,
      x = stbList().find((y) => y.id === id);
    if (x) {
      for (const fid of [x.fixPay, x.fixVz].filter(Boolean)) {
        try {
          await deleteDoc("fixed", fid);
        } catch (_) {}
      }
    }
    store.settings.stb = stbList().filter((y) => y.id !== id);
    await saveSettings();
    STB.st = 0;
    STB.edit = null;
    stbRender(true);
    return;
  }
  if (e.target.closest("[data-stbsave]")) {
    const d = stbReadForm();
    if (!(Number(d.year) > 2000) || (d.res !== "zero" && !(Number(d.amt) > 0) && !(Number(d.est) > 0))) {
      toast(uiText("stb_need"));
      return;
    }
    const old = STB.edit ? stbList().find((y) => y.id === STB.edit) : null,
      id = STB.edit || newId();
    const rec = {
      ...(old || {}),
      id,
      year: Number(d.year),
      date: d.date || "",
      res: d.res || "due",
      amt: Number(d.amt) || 0,
      due: d.due || "",
      vz: Number(d.vz) || 0,
      vzFrom: d.vzFrom || "",
      est: Number(d.est) || 0,
      zve: Number(d.zve) || 0,
      vorb: !!d.vorb,
      vorl: !!d.vorl,
      abw: d.abw || (old && old.abw) || [],
    };
    if (STB.img) {
      try {
        await rcptPut("stb-" + id, STB.img);
        rec.img = 1;
      } catch (_) {}
    }
    try {
      await stbApply(rec, old);
    } catch (err) {
      console.warn("stb", err);
    }
    store.settings.stb = [...stbList().filter((y) => y.id !== id), rec];
    await saveSettings();
    const sb = e.target.closest("[data-stbsave]").getBoundingClientRect();
    hbBurst(document.body, sb.left + sb.width / 2, sb.top, 28);
    toast(uiText("stb_saved"));
    STB.img = null;
    STB.edit = null;
    STB.sel = id;
    STB.st = 3;
    stbRender(true);
    return;
  }
});
document.addEventListener("change", (e) => {
  const id = e.target.id;
  if (id === "stbCam" || id === "stbFile") {
    const fs = [...(e.target.files || [])];
    e.target.value = "";
    if (fs.length > 1 && id === "stbFile")
      inbOpen(fs, {
        type: "stb",
      });
    else if (fs.length) stbScan(fs.length > 1 ? fs : fs[0]);
    return;
  }
  const a = e.target.dataset && e.target.dataset.stbact;
  if (a) {
    STB.act[a] = e.target.checked ? 1 : 0;
    const l = e.target.closest(".stbact");
    if (l) {
      l.classList.toggle("on", e.target.checked);
      if (!reducedMotion())
        l.querySelector(".stbck").animate(
          [
            {
              transform: "scale(.4) rotate(-20deg)",
            },
            {
              transform: "scale(1.2)",
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
  }
});

/* ---------- Briefe vom Amt verstehen: Scan · Akte · Übersicht ---------- */
const BR = {
  st: 0,
  img: null,
  d: null,
  F: {},
  sel: null,
  edit: null,
  act: {
    due: 1,
    term: 1,
    pay: 1,
    wid: 1,
  },
};
const BR_SND = [
  [/jobcenter/, "Jobcenter", "💼"],
  [/agentur f(ü|ue)r arbeit|arbeitsagentur/, "Agentur für Arbeit", "💼"],
  [/finanzamt/, "Finanzamt", "🧾"],
  [/familienkasse|kindergeld/, "Familienkasse", "👶"],
  [/elterngeld/, "Elterngeldstelle", "👶"],
  [/wohngeld/, "Wohngeldstelle", "🏠"],
  [/rentenversicherung/, "Rentenversicherung", "👵"],
  [/beitragsservice|rundfunk/, "Beitragsservice", "📺"],
  [/krankenkasse|\baok\b|techniker|barmer|\bdak\b|\bikk\b|\bbkk\b|knappschaft/, "Krankenkasse", "🏥"],
  [/bafög|bafoeg|studierendenwerk/, "BAföG-Amt", "🎓"],
  [/sozialamt|grundsicherung/, "Sozialamt", "🏛️"],
  [/ausländerbehörde|auslaenderbehoerde|ausländeramt/, "Ausländerbehörde", "🛂"],
  [
    /bürgeramt|buergeramt|stadtverwaltung|stadt [a-zäöü]+ |gemeinde|landkreis|kreisverwaltung/,
    "Stadt / Gemeinde",
    "🏛️",
  ],
  [/amtsgericht|landgericht|gericht/, "Gericht", "⚖️"],
  [/inkasso/, "Inkasso", "⚠️"],
  [/hauptzollamt|zollamt/, "Zoll", "🛃"],
  [/bußgeld|bussgeld|ordnungsamt/, "Ordnungsamt", "🚔"],
  [/versorgungsamt|landschaftsverband/, "Versorgungsamt", "🏛️"],
];
function brList() {
  return (store.settings.briefe = store.settings.briefe || []);
}
function brSorted() {
  return brList()
    .slice()
    .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || (b.date || "").localeCompare(a.date || ""));
}
function brIcon(x) {
  const s = (x.from || "").toLowerCase();
  for (const [re, , e] of BR_SND) if (re.test(s)) return e;
  return "📄";
}
function brKindT(k) {
  return uiText("br_k_" + (k || "info"));
}
function brNext(x) {
  const td = isoToday(),
    L = [x.due && !x.done ? x.due : null, x.term && !x.done ? x.term : null, x.wid && !x.done ? x.wid : null]
      .filter((d) => d && d >= td)
      .sort();
  return L[0] || null;
}
function brSum(x) {
  if ((x.aisum || []).length) return x.aisum.slice();
  const s = x.from || uiText("br_k_info"),
    out = [],
    D = (d) =>
      fxDate(d, {
        day: "numeric",
        month: "long",
      }),
    U = (d) =>
      d
        ? uiText("br_until", {
            d: D(d),
          })
        : "";
  out.push(
    uiText(
      {
        mit: "br_s_mit",
        rueck: "br_s_rueck",
        mahn: "br_s_mahn",
        ein: "br_s_ein",
        anh: "br_s_anh",
        abl: "br_s_abl",
        bew: "br_s_bew",
        bes: "br_s_bes",
      }[x.kind] || "br_s_info",
      {
        s,
      }
    )
  );
  if (x.money === "pay" && x.amt > 0)
    out.push(
      uiText("br_s_pay", {
        n: fmtEur(x.amt),
        d: U(x.due),
      })
    );
  else if (x.money === "back" && x.amt > 0)
    out.push(
      uiText("br_s_back", {
        n: fmtEur(x.amt),
      })
    );
  else if (x.money === "month" && x.amt > 0)
    out.push(
      uiText("br_s_month", {
        n: fmtEur(x.amt),
      })
    );
  if ((x.docs || []).length)
    out.push(
      uiText("br_s_docs", {
        n: String(x.docs.length),
        d: U(x.due),
      })
    );
  if (x.term)
    out.push(
      uiText("br_s_term", {
        d: D(x.term),
        t: x.time
          ? uiText("br_at", {
              t: x.time,
            })
          : "",
      })
    );
  if (x.money !== "pay") out.push(uiText("br_s_nopay"));
  if (x.wid && dLeft(x.wid) >= 0)
    out.push(
      uiText("br_s_wid", {
        d: D(x.wid),
      })
    );
  if (x.warn) out.push(uiText("br_s_warn"));
  return out;
}
function brOpen(id) {
  aiCheck();
  BR.st = 0;
  BR.img = null;
  BR.d = null;
  BR.F = {};
  BR.edit = null;
  BR.sel = null;
  hbSheet("brBg", uiText("br_title"));
  if (id && brList().some((x) => x.id === id)) {
    BR.sel = id;
    BR.st = 3;
  }
  brRender(true);
}
function brRender(first) {
  const bg = $("brBg");
  if (!bg || bg.hidden) return;
  const b = bg.querySelector(".hobody"),
    L = brSorted(),
    D = (d, o) =>
      escHtml(
        fxDate(
          d,
          o || {
            day: "numeric",
            month: "short",
          }
        )
      );
  if (BR.st === 0) {
    b.innerHTML = `<div class="bsintro"><div class="bsdoc">${svgIcon("mail", 56)}<i></i></div><b>${escHtml(uiText("br_intro"))}</b><span>${escHtml(uiText("br_intro_s"))}</span></div>
      <div class="bsbtns"><button type="button" class="vakb" data-brpick="cam">${svgIcon("camera", 18)} ${escHtml(uiText("bs_photo"))}</button><button type="button" class="vadone" data-brpick="file">${svgIcon("doc", 18)} ${escHtml(uiText("stb_import"))}</button></div>
      <button type="button" class="btn tmnew" data-brmanual>${svgIcon("pen", 18)} ${escHtml(uiText("stb_manual"))}</button>
      ${
        L.length
          ? `<div class="vak">${escHtml(uiText("br_list"))}</div><div class="vacard">${L.map((x) => {
              const nx = brNext(x),
                n = nx ? dLeft(nx) : null;
              return `<button type="button" class="fcr tmrow" data-brsel="${escHtml(x.id)}"><span class="tmico">${brIcon(x)}</span><span class="grow"><b><span data-noi18n>${escHtml(x.from || "–")}</span> · ${escHtml(brKindT(x.kind))}</b><small>${
                x.date
                  ? D(x.date, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : ""
              }${x.money === "pay" && x.amt ? ` · −${escHtml(fmtEur0(x.amt))}` : x.money === "back" && x.amt ? ` · +${escHtml(fmtEur0(x.amt))}` : ""}${nx ? ` · ${escHtml(uiText("br_f_due"))} ${D(nx)}` : ""}${x.img ? " · " + svgIcon("clip", 12) : ""}</small></span><span class="vab ${x.done ? "b-grn" : n != null && n <= 7 ? "b-red" : "b-amb"}">${escHtml(x.done ? uiText("br_done") : uiText("br_open"))}</span></button>`;
            }).join("")}</div>`
          : ""
      }
      <input type="file" id="brCam" accept="image/*" capture="environment" multiple hidden><input type="file" id="brFile" accept="image/*,application/pdf,.pdf" multiple hidden>
      <p class="small muted" style="margin:12px 4px 0">${escHtml(uiText("br_priv"))}</p>`;
    if (first || BR.anim) {
      BR.anim = 0;
      stbAnim(b, ".bsintro,.bsbtns,.tmnew,.vak,.vacard");
      if (!reducedMotion())
        b.querySelectorAll(".vacard .fcr").forEach((r, i) =>
          r.animate(
            [
              {
                opacity: 0,
                transform: "translateX(-16px)",
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 420,
              delay: 300 + i * 70,
              easing: "cubic-bezier(.2,1.2,.35,1)",
              fill: "backwards",
            }
          )
        );
    }
    return;
  }
  if (BR.st === 5) return brAiPrev(b, first);
  if (BR.st === 6) return brAiBusy(b);
  if (BR.st === 1) {
    b.innerHTML = `<div class="bsscan">${BR.img ? `<img src="${BR.img}" alt="">` : `<div class="stbpdf">${svgIcon("mail", 70)}</div>`}<i class="bsbeam"></i><span class="bscorner"></span></div><p class="bsstat"><span class="dots3"><i></i><i></i><i></i></span> ${escHtml(uiText("br_reading"))}</p>`;
    return;
  }
  if (BR.st === 2) {
    const d = BR.d || {},
      F = BR.F || {},
      A = BR.act,
      found = Object.keys(F).length,
      sum = brSum(d);
    const chips = [
      F.from ? `<span class="bschip">${brIcon(d)} <b data-noi18n>${escHtml(d.from)}</b></span>` : "",
      F.kind ? `<span class="bschip">${escHtml(brKindT(d.kind))}</span>` : "",
      F.amt
        ? `<span class="bschip">${escHtml(d.money === "back" ? uiText("stb_ref") : d.money === "month" ? uiText("br_m_month") : uiText("stb_due"))} <b>${escHtml(fmtEur(d.amt))}</b></span>`
        : "",
      F.due ? `<span class="bschip">${svgIcon("clock", 13)} <b>${D(d.due)}</b></span>` : "",
      F.term
        ? `<span class="bschip">${svgIcon("cal", 13)} <b>${D(d.term)}${d.time ? " " + escHtml(d.time) : ""}</b></span>`
        : "",
      F.docs ? `<span class="bschip">${svgIcon("clip", 13)} <b>${(d.docs || []).length}</b></span>` : "",
      F.az ? `<span class="bschip">#️⃣ <b data-noi18n>${escHtml(d.az)}</b></span>` : "",
    ].join("");
    const acts = [
      d.due
        ? [
            "due",
            uiText("br_a_due", {
              d: fxDate(d.due, {
                day: "numeric",
                month: "long",
              }),
            }),
          ]
        : null,
      d.term
        ? [
            "term",
            uiText("br_a_term", {
              d:
                fxDate(d.term, {
                  day: "numeric",
                  month: "long",
                }) + (d.time ? " " + d.time : ""),
            }),
          ]
        : null,
      d.money === "pay" && d.amt > 0
        ? [
            "pay",
            uiText("br_a_pay", {
              n: fmtEur(d.amt),
            }),
          ]
        : null,
      d.wid && dLeft(d.wid) >= 0
        ? [
            "wid",
            uiText("br_a_wid", {
              d: fxDate(d.wid, {
                day: "numeric",
                month: "long",
              }),
            }),
          ]
        : null,
    ].filter(Boolean);
    const fld = (k, l, type, ph) =>
      `<div class="field ${F[k] ? "bsok" : ""}"><label>${escHtml(uiText(l))}</label><input class="in" ${type === "date" ? 'type="date"' : type === "num" ? 'inputmode="decimal" placeholder="0,00"' : type === "time" ? 'type="time"' : `placeholder="${escHtml(ph || "")}"`} data-brf="${k}" value="${type === "num" ? (d[k] ? escHtml(numStr(d[k])) : "") : escHtml(String(d[k] || ""))}"></div>`;
    b.innerHTML = `${BR.img || (BR.edit && d.img) ? `<div class="bsthumb">${BR.img ? `<img src="${BR.img}" alt="" data-brzoom>` : `<button type="button" class="vadone" data-brview="${escHtml(BR.edit)}">${svgIcon("clip", 15)} ${escHtml(uiText("bs_showimg"))}</button>`}</div>` : ""}
      ${BR.scanned ? `${found ? `<div class="vak">${escHtml(uiText("br_found"))}</div><div class="bschips">${chips}</div>` : ""}<div class="fcmami on stbma">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub">${escHtml(mFill(d.ai && BR.aiDone ? uiText("ai_done") : BR.aiOffer && !d.ai ? uiText("ai_offer") : found ? uiText("br_mami") : uiText("br_mami0")))}</div></div>` : ""}
      ${aiOn() && BR.txt && !d.ai && !BR.edit ? (BR.aiOffer ? `<button type="button" class="aioffer" data-aigo><span class="aistar">${svgIcon("spark", 20)}</span><span class="grow"><b>${escHtml(uiText("ai_btn"))}</b><small>${escHtml(uiText("ai_btn_s"))}</small></span><span class="dsgo">›</span></button>` : `<button type="button" class="ailink" data-aigo>${svgIcon("spark", 15)} ${escHtml(uiText("ai_more"))}</button>`) : ""}
      ${d.from || (d.aisum || []).length ? `<div class="vak">${escHtml(uiText("br_short"))}${d.ai ? ` <span class="aitag">${svgIcon("spark", 12)} ${escHtml(uiText("ai_tag"))}</span>` : ""}</div><div class="vacard brsum ${d.ai ? "aisays" : ""}">${sum.map((t) => `<p>${escHtml(t)}</p>`).join("")}${(d.aitodo || []).length ? `<ul class="aitodo">${d.aitodo.map((t) => `<li>${escHtml(t)}</li>`).join("")}</ul>` : ""}</div>` : ""}
      ${acts.length ? `<div class="vak">${escHtml(uiText("stb_do"))}</div><div class="vacard stbacts">${acts.map(([k, t]) => `<label class="stbact ${A[k] ? "on" : ""}"><input type="checkbox" data-bract="${k}" ${A[k] ? "checked" : ""}><span class="stbck">✓</span><span>${escHtml(t)}</span></label>`).join("")}</div>` : ""}
      <div class="vak">${escHtml(uiText("bs_check"))}</div>
      <div class="vacard bsform">
        <div class="grid2">${fld("from", "br_f_from", "text", "Jobcenter")}<div class="field ${F.kind ? "bsok" : ""}"><label>${escHtml(uiText("br_f_kind"))}</label><select class="in" data-brf="kind">${["mit", "bes", "bew", "abl", "rueck", "mahn", "ein", "anh", "info"].map((k) => `<option value="${k}" ${(d.kind || "info") === k ? "selected" : ""}>${escHtml(brKindT(k))}</option>`).join("")}</select></div></div>
        <div class="grid2">${fld("date", "br_f_date", "date")}${fld("due", "br_f_due", "date")}</div>
        <div class="grid2">${fld("term", "br_f_term", "date")}${fld("time", "br_f_time", "time")}</div>
        <div class="field"><label>${escHtml(uiText("br_f_money"))}</label><div class="stbseg">${[
          ["none", "br_m_none"],
          ["pay", "br_m_pay"],
          ["back", "br_m_back"],
          ["month", "br_m_month"],
        ]
          .map(
            ([v, l]) =>
              `<button type="button" class="${(d.money || "none") === v ? "on" : ""}" data-brmoney="${v}">${escHtml(uiText(l))}</button>`
          )
          .join("")}</div></div>
        <div class="grid2">${fld("amt", "br_f_amt", "num")}${fld("az", "br_f_az", "text")}</div>
        <div class="field ${F.docs ? "bsok" : ""}"><label>${escHtml(uiText("br_f_docs"))}</label><textarea class="in brdocs" rows="3" data-brf="docs" data-noi18n>${escHtml((d.docs || []).map((x) => x.t || x).join("\n"))}</textarea></div>
        <label class="kidedu"><input type="checkbox" id="brWarn" ${d.warn ? "checked" : ""}> <span>${escHtml(uiText("br_warnck"))}</span></label></div>
      <div class="vabtns" style="margin-top:12px">${BR.edit ? `<button type="button" class="btn danger" data-brdel="${escHtml(BR.edit)}">${escHtml(uiText("tm_del"))}</button>` : `<button type="button" class="btn" data-brback>${escHtml(uiText("tm_cancel"))}</button>`}<button type="button" class="btn primary stbgo" data-brsave>✓ ${escHtml(uiText("br_save"))}</button></div>`;
    if (BR.scanned && !reducedMotion()) {
      b.querySelectorAll(".bschip").forEach((c, i) =>
        c.animate(
          [
            {
              opacity: 0,
              transform: "scale(.5) translateY(10px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 450,
            delay: 150 + i * 110,
            easing: "cubic-bezier(.3,1.7,.5,1)",
            fill: "backwards",
          }
        )
      );
      const k0 = b.querySelectorAll(".bschip").length * 110,
        ma = b.querySelector(".stbma");
      if (ma)
        ma.animate(
          [
            {
              opacity: 0,
              transform: "translateY(14px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 520,
            delay: 300 + k0,
            easing: "cubic-bezier(.2,1.3,.4,1)",
            fill: "backwards",
          }
        );
      b.querySelectorAll(".brsum p").forEach((p, i) =>
        p.animate(
          [
            {
              opacity: 0,
              transform: "translateY(8px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 420,
            delay: 650 + k0 + i * 160,
            easing: "cubic-bezier(.2,1.2,.35,1)",
            fill: "backwards",
          }
        )
      );
      b.querySelectorAll(".stbact").forEach((c, i) =>
        c.animate(
          [
            {
              opacity: 0,
              transform: "translateX(-18px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 420,
            delay: 1000 + k0 + i * 140,
            easing: "cubic-bezier(.2,1.2,.35,1)",
            fill: "backwards",
          }
        )
      );
    } else if (first) stbAnim(b, ".vak,.vacard,.vabtns");
    BR.scanned = false;
    return;
  }
  const x = brList().find((y) => y.id === BR.sel);
  if (!x) {
    BR.st = 0;
    return brRender(true);
  }
  const sum = brSum(x),
    tl = [],
    td = isoToday(),
    P = (d, lbl, sub) => {
      const n = dLeft(d);
      tl.push(
        `<div class="stbp ${x.done || n < 0 ? "g" : n <= 3 ? "r" : n <= 10 ? "w" : ""}"><b>${escHtml(lbl)}</b><small>${escHtml(
          n < 0
            ? fxDate(d, {
                day: "numeric",
                month: "long",
              })
            : sub ||
                uiText("stb_ein_s", {
                  n: String(n),
                })
        )}</small></div>`
      );
    };
  if (x.due)
    P(
      x.due,
      uiText("br_f_due") +
        " " +
        fxDate(x.due, {
          day: "numeric",
          month: "long",
        })
    );
  if (x.term)
    P(
      x.term,
      uiText("br_f_term") +
        " " +
        fxDate(x.term, {
          day: "numeric",
          month: "long",
        }) +
        (x.time ? " · " + x.time : "")
    );
  if (x.wid)
    P(
      x.wid,
      uiText("br_s_wid", {
        d: fxDate(x.wid, {
          day: "numeric",
          month: "long",
        }),
      })
    );
  const v = x.money === "pay" ? -(x.amt || 0) : x.money === "back" ? x.amt || 0 : 0;
  b.innerHTML = `<div class="srhero brhero ${x.money === "pay" && !x.done ? "neg" : ""}"><small><span data-noi18n>${escHtml(x.from || "")}</span> · ${escHtml(brKindT(x.kind))}</small><div class="srbig" style="font-size:${x.amt ? 32 : 26}px"><span id="brN">${x.amt ? (v > 0 ? "+" : v < 0 ? "−" : "") + escHtml(fmtEur(Math.abs(v) || x.amt)) : brIcon(x)}</span></div><span>${
    x.date
      ? escHtml(
          uiText("br_from", {
            d: fxDate(x.date, {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          })
        )
      : ""
  }${x.az ? ` · <span data-noi18n>${escHtml(x.az)}</span>` : ""}${x.done ? " · ✓ " + escHtml(uiText("br_done")) : ""}</span><i class="srsh"></i></div>
    <div class="vak">${escHtml(uiText("br_short"))}</div><div class="vacard brsum">${sum.map((t) => `<p>${escHtml(t)}</p>`).join("")}</div>
    ${tl.length ? `<div class="vak">${escHtml(uiText("br_fr"))}</div><div class="vacard stbtl">${tl.join("")}</div>` : ""}
    ${(x.docs || []).length ? `<div class="vak">${escHtml(uiText("br_todo"))}</div><div class="vacard tmbr">${x.docs.map((dc, i) => `<button type="button" class="tmbi ${dc.ok ? "ok" : ""}" data-brdoc="${i}"><span class="tmck">${dc.ok ? "✓" : ""}</span><span class="grow" data-noi18n>${escHtml(dc.t)}</span></button>`).join("")}</div><p class="small muted" style="margin:6px 4px 0">${escHtml(uiText("br_orig"))}</p>` : ""}
    <div class="vabtns" style="margin-top:12px"><button type="button" class="btn ${x.done ? "" : "primary"}" data-brdone>${x.done ? "↺ " + escHtml(uiText("br_reopen")) : "✓ " + escHtml(uiText("br_done_btn"))}</button><button type="button" class="btn" data-bredit>${svgIcon("pen", 15)} ${escHtml(uiText("stb_edit"))}</button></div>${x.img ? `<button type="button" class="docscan" data-brview="${escHtml(x.id)}"><span class="dsimg"><img alt="" data-dsimg="br-${escHtml(x.id)}"></span><span class="grow"><b>${escHtml(uiText("scan_view"))}</b><small>${escHtml(uiText("scan_view_s"))}</small></span><span class="dsgo">›</span></button>` : ""}<button type="button" class="btn danger dsdel" data-brdel="${escHtml(x.id)}" data-ask="1">${svgIcon("trash", 15)} ${escHtml(uiText("tm_del"))}</button>
    <button type="button" class="btn tmnew" data-brhome>‹ ${escHtml(uiText("br_title"))}</button>`;
  if (first || BR.anim) {
    BR.anim = 0;
    stbAnim(b, ".srhero,.vak,.vacard,.vabtns,.tmnew");
    if (!reducedMotion()) {
      b.querySelectorAll(".brsum p").forEach((p, i) =>
        p.animate(
          [
            {
              opacity: 0,
              transform: "translateY(8px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 420,
            delay: 280 + i * 140,
            easing: "cubic-bezier(.2,1.2,.35,1)",
            fill: "backwards",
          }
        )
      );
      b.querySelectorAll(".stbp").forEach((p, i) =>
        p.animate(
          [
            {
              opacity: 0,
              transform: "translateX(-14px)",
            },
            {
              opacity: 1,
              transform: "none",
            },
          ],
          {
            duration: 450,
            delay: 500 + i * 130,
            easing: "cubic-bezier(.2,1.2,.35,1)",
            fill: "backwards",
          }
        )
      );
      const n = $("brN");
      if (n && x.amt && typeof hbOdo === "function") {
        const t = n.textContent;
        n.textContent = t.replace(/\d/g, "0");
        hbOdo(n, t, 1200);
      }
    }
  }
}
function brTime(s) {
  const m =
    String(s).match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\s*uhr\b/i) ||
    String(s).match(/\bum\s+([01]?\d|2[0-3])[:.]([0-5]\d)\b/i);
  return m ? `${pad(Number(m[1]))}:${m[2]}` : null;
}
function brParse(lines) {
  const T0 = lines
      .map((l) => (typeof l === "string" ? l : l.t || l.text || ""))
      .map((t) => String(t).trim())
      .filter(Boolean),
    low = T0.map((t) => t.toLowerCase()),
    all = low.join("\n"),
    d = {
      money: "none",
      docs: [],
    },
    F = {};
  for (const [re, nm] of BR_SND)
    if (re.test(all)) {
      d.from = nm;
      F.from = 1;
      break;
    }
  const K = [
    ["mahn", /mahnung|zahlungserinnerung|säumniszuschlag|mahngebühr|letzte aufforderung/],
    ["rueck", /erstattungsbescheid|rückforderung|rueckforderung|zu erstatten haben|überzahlung|ueberzahlung/],
    ["anh", /anhörung|anhoerung/],
    ["ein", /einladung|laden sie .{0,30}ein|bitte kommen sie|meldetermin|persönlich vorzusprechen/],
    [
      "mit",
      /mitwirkung|bitte reichen sie|reichen sie .{0,60}ein|fehlende unterlagen|benötigen wir .{0,40}unterlagen|nachweise? .{0,40}vorzulegen/,
    ],
    ["abl", /abgelehnt|ablehnung|ablehnungsbescheid/],
    ["bew", /bewilligt|bewilligungsbescheid|wird .{0,20}gewährt|weiterbewilligung/],
    ["bes", /bescheid|festgesetzt/],
  ];
  for (const [k, re] of K)
    if (re.test(all)) {
      d.kind = k;
      F.kind = 1;
      break;
    }
  if (!d.kind) d.kind = "info";
  for (let i = 0; i < Math.min(T0.length, 25); i++) {
    if (/(datum|^den\b|vom\b)/.test(low[i]) || i < 12) {
      const x = bsDate(T0[i]);
      if (x && x <= isoToday() && !/(bis|spätestens|zum)/.test(low[i])) {
        d.date = x;
        F.date = 1;
        break;
      }
    }
  }
  for (let i = 0; i < T0.length; i++) {
    if (
      /(spätestens|spaetestens|bis zum|bis spätestens|innerhalb|bis\s+\d{1,2}\.)/.test(low[i]) &&
      !/(zeitraum|bewilligungszeitraum|vom .{0,12}bis)/.test(low[i])
    ) {
      const x = bsDate(T0[i] + " " + (T0[i + 1] || ""));
      if (x && x >= (d.date || "2015-01-01")) {
        d.due = x;
        F.due = 1;
        break;
      }
    }
  }
  if (d.kind === "ein" || /termin|einladung|vorsprache/.test(all)) {
    for (let i = 0; i < T0.length; i++) {
      const tm = brTime(T0[i]);
      if (tm) {
        const x = bsDate(T0[i]) || bsDate(T0[i - 1] || "") || bsDate(T0[i + 1] || "");
        if (x && x >= (d.date || "2015-01-01")) {
          d.term = x;
          d.time = tm;
          F.term = 1;
          break;
        }
      }
    }
  }
  const pick = (re) => {
    for (let i = 0; i < T0.length; i++)
      if (re.test(low[i])) {
        const a = amountsIn(" " + T0[i] + " ").concat(amountsIn(" " + (T0[i + 1] || "") + " ").slice(0, 1));
        if (a.length) return Math.max(...a);
      }
    return null;
  };
  let v = pick(
    /(zu zahlen|bitte (überweisen|zahlen)|zahlen sie|offener betrag|gesamtbetrag|forderung|rückforderung|erstattungsbetrag|zu erstatten|mahngebühr|fälliger betrag|beitragsrückstand|nachzahlung von ihnen)/
  );
  if (v) {
    d.money = "pay";
    d.amt = v;
    F.amt = 1;
  }
  if (!v) {
    v = pick(
      /(wird (ihnen )?erstattet|erstattung|gutschrift|überwiesen wir|zahlen wir (ihnen)?|nachzahlung an sie|erhalten sie eine nachzahlung)/
    );
    if (v) {
      d.money = "back";
      d.amt = v;
      F.amt = 1;
    }
  }
  if (!v && d.kind === "bew") {
    v = pick(/(monatlich|gesamtanspruch|zahlbetrag|leistungsanspruch|auszahlungsbetrag)/);
    if (v) {
      d.money = "month";
      d.amt = v;
      F.amt = 1;
    }
  }
  for (let i = 0; i < T0.length; i++) {
    const m = T0[i].match(
      /(aktenzeichen|az\.?|geschäftszeichen|bg-nummer|bg-nr\.?|kundennummer|kunden-nr\.?|steuernummer|beitragsnummer|vorgangsnummer)\s*:?\s*([A-Za-z0-9][A-Za-z0-9\/\-. ]{3,24})/i
    );
    if (m) {
      d.az = m[2].trim();
      F.az = 1;
      break;
    }
  }
  let inList = false;
  for (let i = 0; i < T0.length; i++) {
    const l = low[i],
      t = T0[i];
    if (
      /(folgende unterlagen|folgenden unterlagen|folgende nachweise|bitte reichen sie|fehlen noch|benötigen wir|vorzulegen)/.test(
        l
      )
    ) {
      inList = true;
      const m = t.match(/(?:reichen sie|benötigen wir|vorlegen?)\s+(.{6,80}?)\s+(?:ein|bis|vor)\b/i);
      if (m && !/folgende/i.test(m[1]))
        d.docs.push({
          t: m[1].trim(),
          ok: false,
        });
      continue;
    }
    if (inList) {
      if (
        /^\s*([-–•·*▪]|\d{1,2}[.)])\s*/.test(t) ||
        (/(kontoauszug|nachweis|bescheinigung|kopie|abrechnung|vertrag|lohn|gehalt|ausweis|bescheid|formular|anlage|antrag|mietbescheinigung|zeugnis|attest)/.test(
          l
        ) &&
          t.length < 110)
      ) {
        d.docs.push({
          t: t
            .replace(/^\s*([-–•·*▪]|\d{1,2}[.)])\s*/, "")
            .replace(/[;,.]\s*$/, "")
            .trim(),
          ok: false,
        });
        if (d.docs.length >= 8) break;
        continue;
      }
      if (d.docs.length) inList = false;
    }
  }
  d.docs = d.docs.filter(
    (x, i, a) =>
      x.t.length > 3 &&
      !/^(die|diese|alle|ihre|folgende|fehlende|weitere)?\s*(unterlagen|nachweise|dokumente)$/i.test(x.t.trim()) &&
      a.findIndex((y) => y.t === x.t) === i
  );
  if (d.docs.length) {
    F.docs = 1;
    if (d.kind === "info" || d.kind === "bes") d.kind = "mit";
  }
  if (
    /(rechtsbehelfsbelehrung|widerspruch|einspruch)/.test(all) &&
    d.date &&
    ["bes", "abl", "rueck", "bew", "mahn"].includes(d.kind)
  )
    d.wid = addMonths(addDays(d.date, 4), 1);
  if (
    /(versagt|entzogen|gekürzt|gekuerzt|minderung|sanktion|säumniszuschlag|mahngebühr|zwangsvollstreckung|vollstreckung|bußgeld|leistungen .{0,20}einstellen)/.test(
      all
    )
  )
    d.warn = true;
  return {
    d,
    F,
  };
}
/* ---- Amtsbriefe genauer lesen (KI) ---- */
function ocrText(L) {
  L = (L || []).filter((l) => l && (typeof l === "string" || l.t));
  const b = L.filter((l) => typeof l === "object" && !l.row && l.h > 0 && l.w > 0);
  if (b.length < 3)
    return L.filter((l) => !(l && l.row))
      .map((l) => (typeof l === "string" ? l : l.t))
      .join("\n");
  const it = b
      .map((l) => ({
        t: String(l.t).trim(),
        x: l.x,
        cy: l.y + l.h / 2,
        h: l.h,
      }))
      .sort((a, c) => a.cy - c.cy),
    rows = [];
  for (const l of it) {
    const r = rows.find((r) => Math.abs(r.cy - l.cy) < Math.min(r.h, l.h) * 0.6);
    if (r) {
      r.a.push(l);
      r.cy = (r.cy * (r.a.length - 1) + l.cy) / r.a.length;
    } else
      rows.push({
        cy: l.cy,
        h: l.h,
        a: [l],
      });
  }
  return rows
    .sort((a, c) => a.cy - c.cy)
    .map((r) =>
      r.a
        .sort((a, c) => a.x - c.x)
        .map((x) => x.t)
        .join("  ")
    )
    .join("\n");
}
function aiUrl() {
  try {
    return pairUrl() || "";
  } catch (_) {
    return "";
  }
}
const AIOK = {
  on: (() => {
    try {
      return localStorage.getItem("hb-aiok") === "1";
    } catch (_) {
      return false;
    }
  })(),
  t: 0,
};
async function aiCheck() {
  if (!aiUrl() || Date.now() - AIOK.t < 60e3) return AIOK.on;
  AIOK.t = Date.now();
  try {
    const r = await pairCall(
      "aiok",
      "",
      {
        dev: devId(),
      },
      true
    );
    const was = AIOK.on;
    AIOK.on = !!r.on;
    try {
      localStorage.setItem("hb-aiok", AIOK.on ? "1" : "0");
    } catch (_) {}
    if (was !== AIOK.on && $("brBg") && !$("brBg").hidden && BR.st === 2) brRender();
  } catch (_) {}
  return AIOK.on;
}
function aiOn() {
  return !!aiUrl() && AIOK.on;
}
function aiUnsure(d, F) {
  const core = ["from", "kind", "date", "due", "amt", "term", "docs"].filter((k) => F[k]).length;
  return core < 3 || d.kind === "info" || (!F.due && !F.term && !F.amt);
}
function brRedact(text) {
  const T = String(text || ""),
    mark = new Uint8Array(T.length),
    M = (a, b) => {
      for (let i = Math.max(0, a); i < Math.min(T.length, b); i++) mark[i] = 1;
    };
  const re = (r, g) => {
    r.lastIndex = 0;
    let m;
    while ((m = r.exec(T))) {
      if (g && m[g] != null) {
        const s = m.index + m[0].indexOf(m[g]);
        M(s, s + m[g].length);
      } else M(m.index, m.index + m[0].length);
      if (!m[0].length) r.lastIndex++;
    }
  };
  re(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9X]{4}){2,7}(?:[ ]?[A-Z0-9X]{1,4})?\b/g);
  re(/\b(?:BIC|SWIFT)\b[ :]*([A-Z0-9]{8,11})\b/g, 1);
  re(/\b\d{2,3}\/\d{3,4}\/\d{4,5}\b/g);
  re(/(?<![\d.,])\d(?:[ ]?\d){6,}(?![\d,])/g);
  re(
    /\b(?:aktenzeichen|az\.?|gesch[äa]ftszeichen|kunden-?(?:nr\.?|nummer)|bg-?(?:nr\.?|nummer)|nummer der bedarfsgemeinschaft|steuer-?(?:nr\.?|nummer|-?id)|idnr\.?|identifikationsnummer|(?:renten)?versicherungs-?(?:nr\.?|nummer)|vorgangs-?(?:nr\.?|nummer)|beitrags-?(?:nr\.?|nummer)|mitglieds-?(?:nr\.?|nummer)|personal-?(?:nr\.?|nummer)|vertrags-?(?:nr\.?|nummer)|zeichen|ihr zeichen|unser zeichen)\b[ \t.:]*((?:(?! {2})[^\n]){3,40})/gi,
    1
  );
  re(/\b(?:tel\.?|telefon|fax|mobil|durchwahl)\b[ \t.:]*([+\d][\d \/()+-]{5,})/gi, 1);
  re(/[\w.+-]+@[\w-]+\.[\w.-]+/g);
  re(/\b(?:geb\.?|geboren(?: am)?|geburtsdatum)\b[ \t.:]*(\d{1,2}\.\d{1,2}\.\d{2,4})/gi, 1);
  re(
    /\b[A-ZÄÖÜ][a-zäöüß-]+(?:stra(?:ß|ss)e|str\.|weg|allee|platz|gasse|ring|damm|ufer|chaussee)[ \t]*\d{1,4}[ ]?[a-z]?\b/g
  );
  re(/\b\d{5}[ \t]+[A-ZÄÖÜ][a-zäöüß-]+(?:[ \t]+(?:am|an der|bei)[ \t]+[A-ZÄÖÜ][\wäöüß-]+)?/g);
  re(/\b(?:herrn?|frau|familie|eheleute)\b(?:[ \t]+und[ \t]+(?:herrn?|frau))?[ \t]+((?:(?! {2})[^\n,]){2,50})/gi, 1);
  re(/^(?:herrn?|frau|herrn und frau|eheleute|familie)[ \t]*$\n([^\n]*)\n([^\n]*)/gim, 1);
  re(/^(?:herrn?|frau|herrn und frau|eheleute|familie)[ \t]*$\n[^\n]*\n([^\n]*)/gim, 1);
  const names = [store.settings.name, ...(store.settings.kids || []).map((k) => k && k.name)]
    .concat((store.settings.members || []).map((m) => m && m.name))
    .filter(Boolean)
    .join(" ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  for (const w of new Set(names))
    re(new RegExp("(?<![\\p{L}])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\p{L}])", "giu"));
  const out = [];
  const rx = /(\s+)|([^\s]+)/g;
  let m;
  while ((m = rx.exec(T))) {
    if (m[1])
      out.push({
        s: m[1],
        sp: 1,
      });
    else {
      let red = 0;
      for (let i = m.index; i < m.index + m[2].length; i++)
        if (mark[i]) {
          red = 1;
          break;
        }
      out.push({
        s: m[2],
        red,
      });
    }
  }
  return out;
}
function aiTextOf(tok) {
  return tok.map((t) => (t.sp ? t.s : t.red ? "█".repeat(Math.min(8, Math.max(3, t.s.length))) : t.s)).join("");
}
async function aiCall(text) {
  const base = aiUrl();
  if (!base) throw new Error("off");
  const url = window.__AIURL || apiUrl(base, "mami", ""),
    auth = updKey() ? "Dev " + updKey() : "",
    js = JSON.stringify({
      dev: devId(),
      lang: LANG,
      text,
    });
  let r;
  if (NATIVE && window.AndroidBridge && window.AndroidBridge.http) {
    r = await new Promise((res) => {
      const id = newId();
      httpWaiting[id] = res;
      setTimeout(() => {
        if (httpWaiting[id]) {
          delete httpWaiting[id];
          res({
            status: 0,
          });
        }
      }, 70000);
      window.AndroidBridge.http(id, "POST", url, auth, js);
    });
  } else {
    try {
      const f = await fetch(url, {
        method: "POST",
        headers: Object.assign(
          {
            "Content-Type": "application/json",
          },
          auth
            ? {
                Authorization: auth,
              }
            : {}
        ),
        body: js,
        cache: "no-store",
      });
      r = {
        status: f.status,
        text: await f.text(),
      };
    } catch (_) {
      r = {
        status: 0,
      };
    }
  }
  let j = {};
  try {
    j = JSON.parse(r.text || "{}");
  } catch (_) {}
  if (!r.status) throw new Error("net");
  if (r.status === 429 || j.error === "limit") throw new Error("limit");
  if (["nokey", "notyet", "pause", "budget"].includes(j.error) || r.status === 404) {
    AIOK.on = false;
    AIOK.t = 0;
    try {
      localStorage.setItem("hb-aiok", "0");
    } catch (_) {}
    throw new Error("off");
  }
  if (!j.ok || !j.r) throw new Error("ai");
  return j.r;
}
function aiMerge(r) {
  const d = BR.d || {},
    F = BR.F || {};
  for (const k of ["from", "kind", "date", "due", "term", "time", "money"])
    if (r[k]) {
      d[k] = r[k];
      F[k] = 1;
    }
  if (r.amt > 0) {
    d.amt = r.amt;
    F.amt = 1;
    if (!r.money && (!d.money || d.money === "none")) d.money = "pay";
  }
  if ((r.docs || []).length) {
    d.docs = r.docs.map((t) => ({
      t,
      ok: false,
    }));
    F.docs = 1;
  }
  if (r.warn) d.warn = true;
  if (d.date && ["bes", "abl", "rueck", "bew", "mahn"].includes(d.kind) && !d.wid)
    d.wid = addMonths(addDays(d.date, 4), 1);
  if ((r.sum || []).length) d.aisum = r.sum.slice(0, 4);
  if ((r.todo || []).length) d.aitodo = r.todo.slice(0, 4);
  d.ai = 1;
  BR.d = d;
  BR.F = F;
  BR.act = {
    due: 1,
    term: 1,
    pay: 1,
    wid: 1,
  };
}
function brAiPrev(b, first) {
  const tok = BR.aiTok || [],
    cons = !store.settings.aiOk;
  b.innerHTML = `<div class="fcmami on stbma">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub">${escHtml(mFill(uiText("ai_prev_m")))}</div></div>
    <div class="vak">${svgIcon("spark", 14)} ${escHtml(uiText("ai_prev_t"))}</div>
    <div class="vacard aiprev" data-noi18n>${tok.map((t, i) => (t.sp ? escHtml(t.s) : `<span class="aiw ${t.red ? "red" : ""}" data-aiw="${i}">${escHtml(t.s)}</span>`)).join("")}</div>
    <p class="small muted aihint">👆 ${escHtml(uiText("ai_prev_s"))}</p>
    ${cons ? `<div class="vacard aicons">${svgIcon("lock", 15)} ${escHtml(uiText("ai_consent"))}</div>` : `<label class="kidedu"><input type="checkbox" id="aiNoPrev" ${store.settings.aiNoPrev ? "checked" : ""}> <span>${escHtml(uiText("ai_noprev"))}</span></label>`}
    <div class="vabtns" style="margin-top:12px"><button type="button" class="btn" data-aicancel>${escHtml(uiText("tm_cancel"))}</button><button type="button" class="btn primary aisend" data-aisend>${svgIcon("spark", 16)} ${escHtml(uiText(cons ? "ai_agree" : "ai_send"))}</button></div>`;
  if (first && !reducedMotion()) {
    stbAnim(b, ".fcmami,.vak,.vacard,.aihint,.kidedu,.vabtns");
    b.querySelectorAll(".aiw.red").forEach((w, i) =>
      w.animate(
        [
          {
            backgroundSize: "0% 100%",
          },
          {
            backgroundSize: "100% 100%",
          },
        ],
        {
          duration: 380,
          delay: 350 + Math.min(i, 30) * 35,
          easing: "cubic-bezier(.3,1.2,.5,1)",
          fill: "backwards",
        }
      )
    );
  }
}
function brAiBusy(b) {
  b.innerHTML = `<div class="bsscan aiscan">${BR.img ? `<img src="${BR.img}" alt="">` : `<div class="stbpdf">${svgIcon("mail", 70)}</div>`}<i class="bsbeam"></i><span class="bscorner"></span><span class="aispark"><i></i><i></i><i></i><i></i><i></i></span></div><p class="bsstat"><span class="dots3"><i></i><i></i><i></i></span> ${escHtml(uiText("ai_busy"))}</p>`;
}
async function brAiGo() {
  if (!BR.txt) {
    toast(uiText("ai_err"));
    return;
  }
  BR.aiTok = brRedact(BR.txt);
  if (BR.st === 2 && !BR.bot) BR.d = brReadForm();
  if (store.settings.aiOk && store.settings.aiNoPrev) return brAiSend();
  BR.st = 5;
  brRender(true);
}
async function brAiSend() {
  const text = aiTextOf(BR.aiTok || []);
  BR.st = 6;
  brRender(true);
  const t0 = performance.now();
  let r = null,
    err = null;
  try {
    r = await aiCall(text);
  } catch (e) {
    err = String(e.message || e);
  }
  const w = Math.max(0, 1600 - (performance.now() - t0));
  await new Promise((z) => setTimeout(z, reducedMotion() ? 0 : w));
  if (!$("brBg") || $("brBg").hidden) return;
  BR.st = 2;
  if (r) {
    if (BR.bot) {
      BR.d = {};
      BR.F = {};
      BR.bot = null;
    }
    aiMerge(r);
    BR.aiDone = 1;
    BR.aiOffer = 0;
    BR.scanned = true;
    brRender();
    const c = $("brBg").querySelector(".aisays");
    if (c) {
      try {
        const q = c.getBoundingClientRect();
        hbBurst(document.body, q.left + q.width / 2, q.top + 20, 26);
      } catch (_) {}
    }
  } else {
    if (BR.bot) {
      BR.d = BR.bot.d;
      BR.F = BR.bot.F;
      BR.bot = null;
      BR.aiOffer = aiOn();
      BR.scanned = true;
    }
    brRender();
    toast(uiText(err === "limit" ? "ai_limit" : err === "off" ? "ai_off" : "ai_err"));
  }
}
document.addEventListener("click", async (e) => {
  const bg = $("brBg");
  if (!bg || bg.hidden || !bg.contains(e.target)) return;
  if (e.target.closest("[data-aigo]")) {
    e.preventDefault();
    brAiGo();
    return;
  }
  const w = e.target.closest("[data-aiw]");
  if (w) {
    const t = (BR.aiTok || [])[Number(w.dataset.aiw)];
    if (t) {
      t.red = t.red ? 0 : 1;
      w.classList.toggle("red", !!t.red);
      if (!reducedMotion())
        w.animate(
          [
            {
              transform: "scale(1.25)",
            },
            {
              transform: "none",
            },
          ],
          {
            duration: 260,
            easing: "cubic-bezier(.3,1.6,.5,1)",
          }
        );
    }
    return;
  }
  if (e.target.closest("[data-aicancel]")) {
    if (BR.bot && !BR.aiDone) {
      BR.bot = null;
      BR.st = 0;
      brRender(true);
      return;
    }
    BR.st = 2;
    brRender(true);
    return;
  }
  if (e.target.closest("[data-aisend]")) {
    if (!store.settings.aiOk) store.settings.aiOk = Date.now();
    const np = $("aiNoPrev");
    if (np) store.settings.aiNoPrev = np.checked;
    try {
      await saveSettings();
    } catch (_) {}
    brAiSend();
    return;
  }
});

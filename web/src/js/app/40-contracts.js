/* ===== Vertrags-Ampel · Vorschau · Sparregeln · Monats-Highlights ===== */
function uiText(k, v) {
  const a = TEXTS[k];
  let s = a ? mamiName(a[Math.max(0, LANG_ORDER.indexOf(LANG))] || a[0]) : k;
  if (v) for (const [x, y] of Object.entries(v)) s = s.split("{" + x + "}").join(y);
  return s;
}
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function fxDate(iso, o) {
  if (!iso) return "";
  const dt = new Date(String(iso).length === 7 ? iso + "-01T12:00" : iso + "T12:00");
  if (isNaN(dt)) return "";
  return dt.toLocaleDateString(
    cLoc(),
    o || {
      day: "numeric",
      month: "short",
    }
  );
}
function monName(ym, o) {
  const [y, m] = ymParts(ym);
  return new Intl.DateTimeFormat(cLoc(), {
    month: o || "long",
  }).format(new Date(y, m - 1, 1));
}
/* Zählwerk */
function hbOdo(el, str, dur) {
  if (!el) return;
  if (reducedMotion()) {
    el.textContent = str;
    el._s = str;
    return;
  }
  const prev = el._s || "";
  el.classList.add("hbodo");
  const shape = (x) => [...x].map((ch) => (/\d/.test(ch) ? "d" : ch)).join("");
  /* neu aufbauen, wenn sich Länge, Vorzeichen oder Trennzeichen ändern – sonst bleiben alte Zeichen stehen (z. B. fehlendes Minus) */
  if (shape(prev) !== shape(str) || !el.querySelector(".hc")) {
    el.innerHTML = [...str]
      .map((ch) =>
        /\d/.test(ch)
          ? `<span class="hc"><span class="hs">${"0123456789"
              .split("")
              .map((d) => `<span>${d}</span>`)
              .join("")}</span></span>`
          : `<span class="hc"><span>${ch === " " || ch === " " ? "&nbsp;" : escHtml(ch)}</span></span>`
      )
      .join("");
  }
  el._s = str;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      /* auf einer gerade versteckten Seite (vorbereitet für den Würfel) sofort den Endstand –
         sonst rollen die Ziffern erst los, wenn die Seite sichtbar wird, und sind so lange leer */
      const hid = !el.getClientRects().length;
      [...str].forEach((ch, i) => {
        const c = el.children[i],
          st = c && c.querySelector(".hs");
        if (st) {
          if (hid) st.style.transition = "none";
          else st.style.transition = "";
          if (dur) st.style.transitionDuration = dur + "ms";
          st.style.transitionDelay = i * 45 + "ms";
          st.style.transform = `translateY(${-Number(ch)}em)`;
        }
      });
    })
  );
}
function hbConfetti(root, n, y0) {
  if (reducedMotion() || !root) return;
  const C = ["#ffd36b", "#ff9db8", "#7fc8ff", "#b6f0c9", "#ffffff", "#c4a5ff"],
    W = root.clientWidth || 360,
    H = root.clientHeight || 800;
  for (let i = 0; i < (n || 36); i++) {
    const c = document.createElement("i");
    c.className = "hbconf";
    c.style.left = Math.random() * W + "px";
    c.style.top = (y0 || -20) + "px";
    c.style.background = C[i % C.length];
    root.appendChild(c);
    c.animate(
      [
        {
          transform: "translateY(0) rotate(0)",
        },
        {
          transform: `translate(${(Math.random() - 0.5) * 140}px,${H + 60}px) rotate(${Math.random() * 900}deg)`,
        },
      ],
      {
        duration: 2000 + Math.random() * 1500,
        delay: Math.random() * 300,
        easing: "cubic-bezier(.2,.6,.4,1)",
        fill: "forwards",
      }
    )
      .finished.then(() => c.remove())
      .catch(() => c.remove());
  }
}
function hbBurst(root, x, y, n) {
  if (reducedMotion() || !root) return;
  for (let i = 0; i < (n || 22); i++) {
    const c = document.createElement("i");
    c.className = "hbconf";
    c.style.left = "0";
    c.style.top = "0";
    c.style.background = ["#ffd36b", "#fff", "#ff9db8", "#7fc8ff"][i % 4];
    root.appendChild(c);
    const a = Math.random() * Math.PI * 2,
      d = 70 + Math.random() * 110;
    c.animate(
      [
        {
          transform: `translate(${x}px,${y}px) scale(1)`,
          opacity: 1,
        },
        {
          transform: `translate(${x + Math.cos(a) * d}px,${y + Math.sin(a) * d + 50}px) rotate(${Math.random() * 600}deg) scale(.6)`,
          opacity: 0,
        },
      ],
      {
        duration: 1000 + Math.random() * 500,
        easing: "cubic-bezier(.1,.7,.3,1)",
        fill: "forwards",
      }
    )
      .finished.then(() => c.remove())
      .catch(() => c.remove());
  }
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const o = [...document.querySelectorAll(".hobg:not([hidden])")].pop();
  if (!o || !o.id) return;
  if (document.querySelector("#tmView,.tmview")) return;
  e.preventDefault();
  try {
    hbSheetClose(o.id);
  } catch (_) {}
});
function hbSheet(id, title) {
  let bg = $(id);
  if (!bg) {
    bg = document.createElement("div");
    bg.id = id;
    bg.className = "hobg";
    bg.innerHTML = `<div class="hosh" role="dialog" aria-modal="true"><div class="hohd"><b data-noi18n class="hbst"></b><button class="hox" data-hbclose="${id}" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="hobody" data-noi18n></div></div>`;
    document.body.appendChild(bg);
  }
  bg.querySelector(".hbst").textContent = title;
  bg.hidden = false;
  bg._lk = !document.body.classList.contains("locked");
  document.body.classList.add("locked");
  requestAnimationFrame(() => bg.classList.add("show"));
  return bg.querySelector(".hobody");
}
function hbSheetClose(id) {
  const bg = $(id);
  if (!bg || bg.hidden) return;
  bg.classList.remove("show");
  if (bg._lk) document.body.classList.remove("locked");
  setTimeout(() => {
    bg.hidden = true;
  }, 220);
}
document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-hbclose]");
  if (c) {
    hbSheetClose(c.dataset.hbclose);
    return;
  }
  const bg =
    e.target.classList &&
    e.target.classList.contains("hobg") &&
    e.target.id &&
    ["vaBg", "fcBg", "srBg"].includes(e.target.id)
      ? e.target
      : null;
  if (bg) hbSheetClose(bg.id);
});

/* ---------- Vertrags-Ampel ---------- */
function vaEff(a) {
  if (!a || !a.end) return null;
  let end = new Date(a.end + "T12:00"),
    today = new Date(isoToday() + "T12:00"),
    n = 0;
  const nn = Number(a.notice) || 0,
    dlOf = (en) => {
      const d = new Date(en);
      if (nn === 0.5) {
        d.setDate(d.getDate() - 14);
        return d;
      }
      const y = d.getFullYear(),
        m = d.getMonth() - nn,
        last = new Date(y, m + 1, 0).getDate();
      return new Date(y, m, Math.min(d.getDate(), last), 12);
    };
  while (dlOf(end) < today && n < 20) {
    end.setFullYear(end.getFullYear() + 1);
    n++;
  }
  return {
    end: isoOf(end),
    dl: isoOf(dlOf(end)),
    rolled: n > 0,
  };
}
function vaStat(f, a) {
  a = a || {};
  if (a.cancelled)
    return {
      k: "done",
    };
  const e = vaEff(a);
  if (!e)
    return {
      k: (Number(a.notice) || 0) > 0 ? "nodate" : "free",
    };
  const days = Math.round((new Date(e.dl + "T12:00") - new Date(isoToday() + "T12:00")) / 864e5);
  return {
    k: days <= 30 ? "red" : days <= 90 ? "amb" : "grn",
    days,
    ...e,
  };
}
function vaBadge(s) {
  if (s.k === "red")
    return uiText("va_left", {
      n: `<span class="vad" data-to="${s.days}">${s.days}</span>`,
    });
  if (s.k === "amb")
    return s.days > 60
      ? uiText("va_inm", {
          n: String(Math.round(s.days / 30)),
        })
      : uiText("va_ind", {
          n: `<span class="vad" data-to="${s.days}">${s.days}</span>`,
        });
  return {
    grn: uiText("va_run"),
    free: uiText("va_free"),
    nodate: uiText("va_nodate"),
    done: uiText("va_done"),
  }[s.k];
}
const VA = {
  open: null,
  anim: false,
};
function renderAbos() {
  const el = $("abosEd");
  if (!el) return;
  {
    const sp = ui.view + "|" + ui.sp;
    if (VA.sp !== sp) {
      VA.sp = sp;
      if (ui.sp === "abos") VA.anim = true;
    }
  }
  if (el.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  el.setAttribute("data-noi18n", "");
  const A = aboCfg(),
    ym = ymOf(new Date());
  const all = store.fixed
    .filter((f) => !debtFor(f.id) && (fixArea(f) === "Abos & Handy" || A[f.id]))
    .map((f) => ({
      f,
      a: A[f.id] || {},
      s: vaStat(f, A[f.id]),
    }));
  if (!all.length) {
    el.innerHTML = aboPick() + `<p class="small muted" style="margin:6px 4px 0">${escHtml(uiText("va_empty"))}</p>`;
    return;
  }
  const ord = {
    red: 0,
    amb: 1,
    nodate: 2,
    grn: 3,
    done: 4,
    free: 5,
  };
  all.sort(
    (x, y) =>
      ord[x.s.k] - ord[y.s.k] ||
      (x.s.days ?? 9e9) - (y.s.days ?? 9e9) ||
      String(x.f.name).localeCompare(String(y.f.name))
  );
  const con = all.filter((x) => x.s.k !== "free"),
    ab = all.filter((x) => x.s.k === "free"),
    reds = con.filter((x) => x.s.k === "red");
  const row = ({ f, a, s }) => {
    const op = VA.open === f.id,
      amt = listAmt(f, ym);
    return `<div class="varow k-${s.k} ${op ? "open" : ""} ${VA.flash === f.id ? "vanew" : ""}" data-vaid="${escHtml(f.id)}"><button type="button" class="vahead" data-vatog="${escHtml(f.id)}" aria-expanded="${op}">
      ${vaIcon(f, s)}
      <span class="van"><b>${escHtml(tr(f.name))}</b><small>${escHtml(fmtEur(amt))}${
        s.end
          ? ` · ${escHtml(
              uiText("va_until", {
                d: fxDate(s.end, {
                  day: "2-digit",
                  month: "2-digit",
                }),
              })
            )}`
          : ""
      }</small></span>
      <span class="vab b-${s.k}">${vaBadge(s)}</span></button>
      ${op ? vaDetail(f, a, s, amt) : ""}</div>`;
  };
  el.innerHTML = `${aboPick()}${
    reds.length
      ? `<div class="vaalert ${VA.anim ? "in" : ""}"><span class="vabell ${VA.anim ? "ring" : ""}">${svgIcon("bell", 20)}</span><div><b>${escHtml(
          reds.length === 1
            ? uiText("va_al1")
            : uiText("va_aln", {
                n: reds.length,
              })
        )}</b><small>${escHtml(uiText("va_al_s"))}</small></div></div>`
      : ""
  }
    ${con.length ? `<div class="vak">${escHtml(uiText("va_con"))}</div><div class="vacard">${con.map(row).join("")}</div>` : ""}
    ${ab.length ? `<div class="vak">${escHtml(uiText("va_abo"))}</div><div class="vacard">${ab.map(row).join("")}</div>` : ""}
    <p class="small muted" style="margin:10px 4px 0">${escHtml(uiText("va_tip"))}</p>`;
  if (VA.flash) {
    const r = el.querySelector(".vanew");
    VA.flash = null;
    if (r)
      setTimeout(
        () =>
          r.scrollIntoView({
            block: "nearest",
            behavior: reducedMotion() ? "auto" : "smooth",
          }),
        60
      );
  }
  if (VA.anim) {
    VA.anim = false;
    vaAnimate(el);
  }
}
/* Abos selbst hinzufügen */
const ABO_PRE = [
  ["Netflix", "Netflix", 0],
  ["Spotify", "Spotify", 0],
  ["Disney+", "Disney+", 0],
  ["Amazon Prime", "Amazon Prime", 0],
  ["ab_handy", "", 3],
  ["ab_inet", "", 3],
  ["ab_strom", "", 1],
  ["ab_fit", "", 1],
  ["ab_vers", "", 3],
];
function aboPreName(p) {
  return p[1] || uiText(p[0]);
}
function aboPick() {
  return `<div class="abopick"><div class="vak">${escHtml(uiText("ab_quick"))}</div><div class="abochips">${ABO_PRE.map(
    (p, i) => {
      const n = aboPreName(p),
        b = brandFor(n);
      return `<button type="button" data-abonew="${i}" style="--d:${i * 35}ms"><i class="abci">${b ? brandBadge(b) : tile("ausgabe", n)}</i>${escHtml(n)}</button>`;
    }
  ).join(
    ""
  )}<button type="button" class="own" data-abonew="-1" style="--d:${ABO_PRE.length * 35}ms"><i class="abci"><svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M12 5v14M5 12h14"/></svg></i>${escHtml(uiText("ab_own"))}</button></div></div>`;
}
function aboNewOpen(i) {
  const p = ABO_PRE[i],
    name = p ? aboPreName(p) : "",
    not = p ? p[2] : 0;
  const b = hbSheet("aboNewBg", uiText("ab_new_t"));
  b.innerHTML = `<div class="abonf"><label class="pf"><span>${escHtml(uiText("ab_name"))}</span><input class="in" data-an="name" value="${escHtml(name)}" placeholder="${escHtml(uiText("ab_name_ph"))}" autocomplete="off"></label>
    <div class="pr2"><label class="pf"><span>${escHtml(uiText("ab_amt"))}</span><input class="in" data-an="amt" inputmode="decimal" placeholder="0,00"></label>
      <label class="pf"><span>${escHtml(uiText("ab_rh"))}</span><select class="in" data-an="rh">${[
        ["monatlich", "ab_rh_m"],
        ["quartal", "ab_rh_q"],
        ["halbjahr", "ab_rh_h"],
        ["jahr", "ab_rh_j"],
      ]
        .map(([v, l]) => `<option value="${v}">${escHtml(uiText(l))}</option>`)
        .join("")}</select></label></div>
    <div class="pr2"><label class="pf"><span>${escHtml(uiText("va_end"))}</span><input class="in" type="date" data-an="end"></label>
      <label class="pf"><span>${escHtml(uiText("va_notice"))}</span><select class="in" data-an="not">${[
        [0, "va_n0"],
        [0.5, "va_n05"],
        [1, "va_n1"],
        [2, "va_n2"],
        [3, "va_n3"],
        [6, "va_n6"],
      ]
        .map(([v, l]) => `<option value="${v}" ${v === not ? "selected" : ""}>${escHtml(uiText(l))}</option>`)
        .join("")}</select></label></div>
    <p class="small muted" style="margin:2px 4px 12px">${escHtml(uiText("ab_hint"))}</p>
    <button type="button" class="btn primary block" style="justify-content:center" data-abook>${escHtml(uiText("ab_add"))}</button></div>`;
  setTimeout(() => {
    const x = b.querySelector(name ? '[data-an="amt"]' : '[data-an="name"]');
    if (x)
      x.focus({
        preventScroll: true,
      });
  }, 80);
}
async function aboNewSave() {
  const bg = $("aboNewBg"),
    v = (k) => (bg.querySelector(`[data-an="${k}"]`) || {}).value || "";
  const name = v("name").trim(),
    amt = parseAmt(v("amt") || ""),
    rh = v("rh") || "monatlich",
    end = v("end"),
    not = Number(v("not")) || 0,
    ym = ymOf(new Date());
  if (!name) {
    toast(uiText("ab_err_name"));
    return;
  }
  if (!(amt > 0)) {
    toast(uiText("ab_err_amt"));
    return;
  }
  const f = {
    name,
    amount: round2(amt),
    kind: "privat",
    order: store.fixed.length,
    from: ym,
  };
  if (rh !== "monatlich") {
    f.rhythm = rh;
    f.months = rhythmMonths(rh, Number(ym.slice(5)));
  }
  const id = newId();
  if (!(await safe(() => saveDoc("fixed", id, f)))) return;
  const A = (store.settings.abos = {
    ...(store.settings.abos || {}),
  });
  A[id] = {
    ...(end
      ? {
          end,
        }
      : {}),
    notice: not,
  };
  saveSettings();
  hbSheetClose("aboNewBg");
  VA.flash = id;
  renderAbos();
  toast(
    uiText("ab_done", {
      x: name,
    })
  );
}
document.addEventListener("click", (e) => {
  const n = e.target.closest("[data-abonew]");
  if (n) {
    aboNewOpen(Number(n.dataset.abonew));
    return;
  }
  if (e.target.closest("[data-abook]")) aboNewSave();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.closest && e.target.closest("#aboNewBg input")) {
    e.preventDefault();
    aboNewSave();
  }
});
function vaIcon(f, s) {
  const frac = s.days != null ? Math.max(0.04, Math.min(1, s.days / 120)) : s.k === "done" ? 1 : 0,
    C = 2 * Math.PI * 21,
    b = brandFor(f.name),
    icn = b ? brandBadge(b) : tile("ausgabe", f.cat || f.name);
  return `<span class="vaic">${icn}${s.days != null || s.k === "done" ? `<svg class="varing" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" class="bg"/><circle cx="24" cy="24" r="21" class="fg" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - frac)).toFixed(1)}" data-off="${(C * (1 - frac)).toFixed(1)}" data-c="${C.toFixed(1)}"/></svg>` : ""}</span>`;
}
function vaAlert(n, anim) {
  return n
    ? `<div class="vaalert ${anim ? "in" : ""}" data-noi18n><span class="vabell ${anim ? "ring" : ""}">🔔</span><div><b>${escHtml(
        n === 1
          ? uiText("va_al1")
          : uiText("va_aln", {
              n,
            })
      )}</b><small>${escHtml(uiText("va_al_s"))}</small></div></div>`
    : "";
}
function vaDetail(f, a, s, amt) {
  const pos = s.days != null ? Math.max(0.04, Math.min(0.96, 1 - s.days / 365)) : 0.5,
    yr = (f.rhythm || "monatlich") === "monatlich" ? amt * 12 : amt;
  return `<div class="vadet">${
    s.dl
      ? `<div class="vatl"><div class="vatl-l"><i style="--w:${(pos * 100).toFixed(1)}%"></i></div><div class="vatl-m" style="--x:${(pos * 100).toFixed(1)}%"><b>${escHtml(uiText("va_today"))}</b></div><div class="vatl-f"><b>${escHtml(
          uiText("va_dl", {
            d: fxDate(s.dl, {
              day: "2-digit",
              month: "2-digit",
            }),
          })
        )}</b></div></div>
      <div class="vainfo"><span>${escHtml(
        s.days === 0
          ? uiText("va_lastday")
          : uiText("va_daysleft", {
              n: s.days,
            })
      )}</span><span>${escHtml(
        uiText("va_renew", {
          n: fmtEur0(yr),
        })
      )}</span></div>`
      : ""
  }
    <div class="grid2"><div class="field"><label>${escHtml(uiText("va_end"))}</label><input class="in" type="date" data-aboend="${escHtml(f.id)}" value="${escHtml(a.end || "")}"></div>
      <div class="field"><label>${escHtml(uiText("va_notice"))}</label><select class="in" data-abonot="${escHtml(f.id)}">${[
        [0, "va_n0"],
        [0.5, "va_n05"],
        [1, "va_n1"],
        [2, "va_n2"],
        [3, "va_n3"],
        [6, "va_n6"],
      ]
        .map(
          ([v, l]) =>
            `<option value="${v}" ${Number(a.notice || 0) === v ? "selected" : ""}>${escHtml(uiText(l))}</option>`
        )
        .join("")}</select></div></div>
    <div class="vabtns">${s.k !== "done" && a.end ? `<button type="button" class="vakb ${s.k === "red" ? "hot" : ""}" data-valetter="${escHtml(f.id)}">${svgIcon("mail", 15)} ${escHtml(uiText("va_write"))}</button>` : ""}
      <button type="button" class="vadone ${s.k === "done" ? "on" : ""}" data-vadone="${escHtml(f.id)}">${s.k === "done" ? "✓ " + escHtml(uiText("va_isdone")) : escHtml(uiText("va_mark"))}</button></div></div>`;
}
function vaAnimate(el) {
  if (reducedMotion()) return;
  const t0 = performance.now(),
    D = 1300;
  el.querySelectorAll(".varing .fg").forEach((c) => {
    const off = Number(c.dataset.off),
      C = Number(c.dataset.c);
    c.style.transition = "none";
    c.style.strokeDashoffset = C * 0.02;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        c.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.3,0,.2,1)";
        c.style.strokeDashoffset = off;
      })
    );
  });
  const ds = [...el.querySelectorAll(".vad")];
  ds.forEach((d) => {
    d._to = Number(d.dataset.to);
    d._fr = d._to + 15;
    d.textContent = d._fr;
  });
  el.querySelectorAll(".vab.b-red,.vab.b-amb").forEach((b) => {
    b.classList.add("cnt");
  });
  const f = (t) => {
    const k = Math.min(1, (t - t0) / D),
      e = 1 - Math.pow(1 - k, 3);
    ds.forEach((d) => {
      d.textContent = Math.round(d._fr + (d._to - d._fr) * e);
    });
    if (k < 1) requestAnimationFrame(f);
    else
      el.querySelectorAll(".vab.cnt").forEach((b) => {
        b.classList.remove("cnt");
        b.classList.add("pop");
      });
  };
  requestAnimationFrame(f);
}
function vaLetter(id) {
  const f = store.fixed.find((x) => x.id === id);
  if (!f) return;
  const a = aboCfg()[id] || {},
    s = vaStat(f, a),
    nm = String(store.settings.name || "").trim();
  const end = s.end ? new Date(s.end + "T12:00").toLocaleDateString("de-DE") : "";
  const txt = `${nm || "[Vorname Nachname]"}\n[Straße Hausnummer]\n[PLZ Ort]\n\nAn: ${f.name}\n\n${new Date().toLocaleDateString("de-DE")}\n\nKündigung meines Vertrags „${f.name}“\nKunden-/Vertragsnummer: [bitte eintragen]\n\nSehr geehrte Damen und Herren,\n\nhiermit kündige ich meinen Vertrag fristgerecht${end ? ` zum ${end}` : ""}, hilfsweise zum nächstmöglichen Zeitpunkt.\n\nBitte bestätigen Sie mir die Kündigung und das genaue Vertragsende schriftlich.\n\nMit freundlichen Grüßen\n${nm || "[Vorname Nachname]"}`;
  const b = hbSheet(
    "vaBg",
    "✉️ " +
      uiText("va_lt_t", {
        x: tr(f.name),
      })
  );
  b.innerHTML = `<p class="hosub">${escHtml(uiText("va_lt_de"))}</p><textarea class="in valt" id="vaTxt" rows="16" spellcheck="false">${escHtml(txt)}</textarea>
    <div class="vabtns" style="margin-top:12px"><button type="button" class="btn" data-vacopy>${escHtml(uiText("va_copy"))}</button><button type="button" class="btn primary" data-vasend="${escHtml(id)}">${escHtml(uiText("va_send"))}</button></div>
    <p class="small muted" style="margin:10px 4px 0">${escHtml(uiText("va_lt_tip"))}</p>`;
}
document.addEventListener("click", async (e) => {
  const tg = e.target.closest("[data-vatog]");
  if (tg) {
    const id = tg.dataset.vatog;
    VA.open = VA.open === id ? null : id;
    renderAbos();
    if (VA.open) {
      const r = document.querySelector(`.varow[data-vaid="${CSS.escape(id)}"]`);
      if (r && !reducedMotion()) {
        const d = r.querySelector(".vadet");
        if (d)
          d.animate(
            [
              {
                opacity: 0,
                transform: "translateY(-8px)",
              },
              {
                opacity: 1,
                transform: "none",
              },
            ],
            {
              duration: 380,
              easing: "cubic-bezier(.2,1,.3,1)",
            }
          );
      }
    }
    return;
  }
  const lt = e.target.closest("[data-valetter]");
  if (lt) {
    vaLetter(lt.dataset.valetter);
    return;
  }
  const dn = e.target.closest("[data-vadone]");
  if (dn) {
    const id = dn.dataset.vadone,
      A = (store.settings.abos = {
        ...(store.settings.abos || {}),
      }),
      a = (A[id] = {
        ...(A[id] || {}),
      });
    if (a.cancelled) delete a.cancelled;
    else {
      a.cancelled = isoToday();
      setTimeout(() => {
        const r = document.querySelector(`.varow[data-vaid="${CSS.escape(id)}"] .vadone`);
        if (r) {
          const bb = r.getBoundingClientRect();
          hbBurst(document.body, bb.left + bb.width / 2, bb.top, 18);
        }
      }, 60);
    }
    await saveSettings();
    renderAbos();
    return;
  }
  if (e.target.closest("[data-vacopy]")) {
    const t = $("vaTxt");
    try {
      await navigator.clipboard.writeText(t.value);
      toast(uiText("va_copied"));
    } catch (_) {
      t.select();
    }
    return;
  }
  const sd = e.target.closest("[data-vasend]");
  if (sd) {
    const t = $("vaTxt").value,
      f = store.fixed.find((x) => x.id === sd.dataset.vasend),
      subj = "Kündigung " + (f ? f.name : "");
    try {
      if (navigator.share && !NATIVE) {
        await navigator.share({
          title: subj,
          text: t,
        });
      } else {
        const u = `mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(t)}`;
        try {
          window.open(u, "_blank");
        } catch (_) {
          location.href = u;
        }
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    hbSheetClose("vaBg");
    toast(
      uiText("va_after"),
      async () => {
        const A = (store.settings.abos = {
          ...(store.settings.abos || {}),
        });
        A[sd.dataset.vasend] = {
          ...(A[sd.dataset.vasend] || {}),
          cancelled: isoToday(),
        };
        await saveSettings();
        renderAbos();
      },
      uiText("va_mark"),
      9000
    );
    return;
  }
});
function aboHints(hints) {
  const A = aboCfg();
  for (const f of store.fixed) {
    const s = vaStat(f, A[f.id]);
    if (s.k !== "red") continue;
    hints.push({
      k: "abo",
      lvl: "warn",
      t: `${f.name}: ${uiText("va_hint", {
        d: fxDate(s.dl, {
          day: "numeric",
          month: "long",
        }),
      })}`,
      s:
        s.days === 0
          ? uiText("va_lastday")
          : uiText("va_hint_s", {
              n: s.days,
            }),
    });
  }
}

/* ---------- Vorschau / Kontostand-Kurve ---------- */
function fcMainBal() {
  const has = (store.settings.accountAnchors || {})["Hauptkonto"];
  if (has) {
    const b = accountBalance("Hauptkonto", isoToday());
    if (b != null) return b;
  }
  return yearCum(ymOf(new Date())).balance;
}
/* Was in die Vorschau einfließt – selbst wählbar (Standard: alles außer Spaces) */
function fcCfg() {
  return Object.assign(
    {
      spaces: false,
      fix: true,
      inc: true,
      alltag: true,
      shop: true,
      biz: true,
      stb: true,
      inv: false,
    },
    store.settings.fcCfg || {}
  );
}
function fcSpaces() {
  const td = isoToday(),
    L = [];
  for (const n of Object.keys(store.settings.accountAnchors || {})) {
    if (n === "Hauptkonto") continue;
    const b = accountBalance(n, td);
    if (b != null)
      L.push({
        n,
        v: b,
      });
  }
  return L;
}
function fcCalc() {
  const ym = ymOf(new Date()),
    dim = daysIn(ym),
    d0 = new Date().getDate(),
    CF = fcCfg(),
    SP = fcSpaces(),
    spSum = sum(SP, (x) => x.v),
    bal0 = fcMainBal() + (CF.spaces ? spSum : 0),
    c = monthCalc(ym),
    paid = (store.months[ym] && store.months[ym].paid) || {};
  const sg = (t) =>
    t.kind === "einnahme" || (t.kind === "umbuchung" && t._k0 === "einnahme")
      ? t.amount
      : ["ausgabe", "betrieb", "vorauszahlung"].includes(t.kind)
        ? -t.amount
        : 0;
  const delta = Array(dim + 2).fill(0);
  for (const t of c.tx) {
    const d = Number(t.date.slice(8, 10));
    if (d <= d0) delta[d] += sg(t);
  }
  for (const [fid, amt] of Object.entries(paid)) {
    const f = store.fixed.find((x) => x.id === fid);
    const d = Math.min(d0, (f && payDay(f, ym)) || 1);
    delta[d] -= Number(amt) || 0;
  }
  const pts = [];
  let b = bal0;
  const past = [];
  for (let d = d0; d >= 1; d--) {
    past[d] = b;
    b -= delta[d];
  }
  for (let d = 1; d <= d0; d++)
    pts.push({
      d,
      v: past[d],
      f: false,
    });
  const typ = (L) => {
    const a = L.map((t) => t.amount)
      .filter((v) => v > 0)
      .sort((x, y) => x - y);
    if (!a.length) return 0;
    const med = a[Math.floor(a.length / 2)],
      cap = Math.max(60, med * 4);
    return sum(
      a.filter((v) => v <= cap),
      (v) => v
    );
  };
  const upto = (t) => Number(t.date.slice(8, 10)) <= d0,
    isA = (t) => t.kind === "ausgabe" && !t.fixId && !isShopTx(t) && !isInvTx(t),
    isI = (t) => isInvTx(t) && !t.fixId,
    isS = (t) => t.kind === "ausgabe" && !t.fixId && isShopTx(t),
    isB = (t) => t.kind === "betrieb" && !t.fixId;
  let aA = typ(c.tx.filter((t) => isA(t) && upto(t))) / Math.max(1, d0),
    sA =
      sum(
        c.tx.filter((t) => isS(t) && upto(t)),
        (t) => t.amount
      ) / Math.max(1, d0),
    bA = typ(c.tx.filter((t) => isB(t) && upto(t))) / Math.max(1, d0);
  if (d0 < 6) {
    const pm = shiftYm(ym, -1),
      p = monthCalc(pm),
      dp = daysIn(pm);
    aA = Math.max(aA, typ(p.tx.filter(isA)) / dp);
    sA = Math.max(sA, sum(p.tx.filter(isS), (t) => t.amount) / dp);
    bA = Math.max(bA, typ(p.tx.filter(isB)) / dp);
  }
  const iSum = sum(
      c.tx.filter((t) => isI(t) && upto(t)),
      (t) => t.amount
    ),
    iA = iSum / Math.max(1, d0);
  const avg = (CF.alltag ? aA : 0) + (CF.shop ? sA : 0) + (CF.biz ? bA : 0) + (CF.inv ? iA : 0);
  const fut = Array(dim + 2).fill(0),
    fixL = [];
  for (const f of fixedForMonth(ym, true)) {
    if (f.id in paid) continue;
    if (!CF.spaces && fxAcct(f) !== "Hauptkonto") continue;
    let d = payDay(f, ym) || d0 + 1;
    if (d <= d0) d = Math.min(dim, d0 + 1);
    const a = planAmt(f, ym);
    if (CF.fix) fut[d] -= a;
    fixL.push({
      d,
      a,
      n: f.name,
    });
  }
  const inc = [];
  const prev = monthCalc(shiftYm(ym, -1)).tx.filter((t) => t.kind === "einnahme" && t.amount >= 50);
  for (const t of prev) {
    const got = c.tx.some(
      (x) => x.kind === "einnahme" && x.cat === t.cat && Math.abs(x.amount - t.amount) < t.amount * 0.3
    );
    if (got) continue;
    let d = Math.min(dim, Number(t.date.slice(8, 10)));
    if (d <= d0) {
      if (d0 - d > 10 || d0 >= dim) continue;
      d = d0 + 1;
    }
    if (CF.inc) fut[d] += t.amount;
    inc.push({
      d,
      v: t.amount,
      n: t.cat || "",
      k: "inc",
    });
  }
  try {
    for (const x of store.settings.stb || []) {
      if (x.res !== "ref" || !(Number(x.amt) > 0) || !x.date || x.got) continue;
      const exp = addDays(x.date, 21),
        last = addDays(x.date, 70),
        td = isoToday();
      if (td > last) continue;
      const arrived = store.tx.some(
        (t) => t.kind === "einnahme" && t.date >= x.date && Math.abs(t.amount - x.amt) <= Math.max(2, x.amt * 0.02)
      );
      if (arrived) continue;
      let d;
      if (exp <= td) d = d0 + 1;
      else if (exp.slice(0, 7) === ym) d = Number(exp.slice(8, 10));
      else continue;
      if (d > dim) continue;
      if (CF.stb) fut[d] += Number(x.amt);
      inc.push({
        d,
        v: Number(x.amt),
        n: uiText("stb_ref") + " " + (x.year || ""),
        k: "stb",
      });
    }
  } catch (_) {}
  b = bal0;
  for (let d = d0 + 1; d <= dim; d++) {
    b += fut[d] - avg;
    pts.push({
      d,
      v: b,
      f: true,
    });
  }
  const future = pts.filter((p) => p.f);
  let min = null;
  for (const p of future) if (!min || p.v < min.v) min = p;
  const thr = 100,
    warn = !!(min && min.v < thr),
    end = pts[pts.length - 1].v;
  let allow = null;
  if (warn) {
    const before = CF.fix
        ? sum(
            fixL.filter((x) => x.d <= min.d),
            (x) => x.a
          )
        : 0,
      daysTo = Math.max(1, min.d - d0);
    allow = Math.max(0, (bal0 - before - thr) / daysTo);
  }
  const incI = inc.filter((x) => x.k !== "stb"),
    stbI = inc.filter((x) => x.k === "stb"),
    left = dim - d0;
  const parts = {
    main: fcMainBal(),
    sp: SP,
    spSum,
    fix: sum(fixL, (x) => x.a),
    fixN: fixL.length,
    inc: sum(incI, (x) => x.v),
    incN: incI.length,
    stb: sum(stbI, (x) => x.v),
    stbN: stbI.length,
    aA,
    sA,
    bA,
    iA,
    iSum,
    left,
  };
  return {
    ym,
    dim,
    d0,
    bal0,
    pts,
    end,
    min,
    inc: inc.filter((x) => (x.k === "stb" ? CF.stb : CF.inc)).sort((a, b) => b.v - a.v),
    thr,
    warn,
    allow,
    avg,
    cf: CF,
    parts,
    fixL,
    has: store.tx.length > 0,
  };
}
function fcParts(F) {
  const P = F.parts,
    CF = F.cf,
    E = (v) => fmtEur0(v),
    row = (k, t, sub, v, cls, sw) =>
      `<div class="fcpr ${sw && !CF[k] ? "off" : ""}"><span class="grow"><b>${escHtml(t)}</b><small>${escHtml(sub)}</small></span>${v != null ? `<span class="fcpv ${cls}" data-noi18n>${escHtml(v)}</span>` : ""}${sw ? `<button type="button" class="fcsw ${CF[k] ? "on" : ""}" role="switch" aria-checked="${!!CF[k]}" aria-label="${escHtml(t)}" data-fcsw="${k}"><i></i></button>` : `<span class="fcsw fix" aria-hidden="true"></span>`}</div>`;
  const L = [
    row(
      "main",
      uiText("fcp_start"),
      uiText("fcp_start_s", {
        v: E(P.main),
      }),
      null,
      "",
      false
    ),
  ];
  if (P.sp.length)
    L.push(
      row(
        "spaces",
        uiText("fcp_sp"),
        P.sp.map((x) => `${x.n} ${E(x.v)}`).join(" · "),
        (P.spSum >= 0 ? "+" : "−") + E(Math.abs(P.spSum)),
        P.spSum < 0 ? "n" : "p",
        true
      )
    );
  L.push(
    row(
      "fix",
      uiText("fcp_fix"),
      uiText(P.fixN === 1 ? "fcp_n1" : "fcp_n", {
        n: String(P.fixN),
      }),
      "−" + E(P.fix),
      "n",
      true
    )
  );
  L.push(row("inc", uiText("fcp_inc"), P.incN ? uiText("fcp_inc_s") : uiText("fcp_none"), "+" + E(P.inc), "p", true));
  L.push(
    row(
      "alltag",
      uiText("fcp_day"),
      uiText("fcp_pd", {
        v: E(P.aA),
        n: String(P.left),
      }),
      "−" + E(P.aA * P.left),
      "n",
      true
    )
  );
  if (P.sA > 0)
    L.push(
      row(
        "shop",
        uiText("fcp_shop"),
        uiText("fcp_pd", {
          v: E(P.sA),
          n: String(P.left),
        }),
        "−" + E(P.sA * P.left),
        "n",
        true
      )
    );
  if (P.bA > 0)
    L.push(
      row(
        "biz",
        uiText("fcp_biz"),
        uiText("fcp_pd", {
          v: E(P.bA),
          n: String(P.left),
        }),
        "−" + E(P.bA * P.left),
        "n",
        true
      )
    );
  if (P.iSum > 0)
    L.push(
      row(
        "inv",
        uiText("fcp_inv"),
        uiText("fcp_inv_s", {
          v: E(P.iSum),
        }),
        "−" + E(P.iA * P.left),
        "n",
        true
      )
    );
  if (P.stbN) L.push(row("stb", uiText("fcp_stb"), uiText("fcp_stb_s"), "+" + E(P.stb), "p", true));
  return `<div class="vak">${escHtml(uiText("fcp_h"))}</div><div class="vacard fcparts">${L.join("")}</div>`;
}
function fcPath(pts, X, Y) {
  if (!pts.length) return "";
  let s = `M${X(pts[0].d).toFixed(1)} ${Y(pts[0].v).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)],
      p1 = pts[i - 1],
      p2 = pts[i],
      p3 = pts[Math.min(pts.length - 1, i + 1)];
    const c1x = X(p1.d) + (X(p2.d) - X(p0.d)) / 6,
      c1y = Y(p1.v) + (Y(p2.v) - Y(p0.v)) / 6,
      c2x = X(p2.d) - (X(p3.d) - X(p1.d)) / 6,
      c2y = Y(p2.v) - (Y(p3.v) - Y(p1.v)) / 6;
    s += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${X(p2.d).toFixed(1)} ${Y(p2.v).toFixed(1)}`;
  }
  return s;
}
function fcScale(F, W, H, pad) {
  const vs = F.pts.map((p) => p.v).concat([F.thr * 0.5]);
  let lo = Math.min(...vs),
    hi = Math.max(...vs);
  if (hi - lo < 50) hi = lo + 50;
  const r = hi - lo;
  lo -= r * 0.1;
  hi += r * 0.12;
  pad = pad || 0;
  return {
    X: (d) => pad + ((d - 1) / (F.dim - 1)) * (W - pad * 2),
    Y: (v) => H - ((v - lo) / (hi - lo)) * H,
    lo,
    hi,
  };
}
function fcMini() {
  if (!store.tx.length) return "";
  const F = fcCalc();
  if (!F.pts.length) return "";
  const W = 120,
    H = 40,
    { X, Y } = fcScale(F, W, H, 2),
    pa = F.pts.filter((p) => !p.f),
    fu = F.pts.filter((p) => p.f || p.d === F.d0);
  return `<button type="button" class="fcmini ${F.warn ? "warn" : ""}" data-fcopen data-noi18n><span class="fct"><small>${escHtml(
    uiText("fc_end", {
      d: fxDate(lastDayOf(F.ym)),
    })
  )}</small><b>${escHtml(fmtEur0(F.end))}</b>${
    F.warn
      ? `<em>${svgIcon("alert", 13)} ${escHtml(
          uiText("fc_tight", {
            d: fxDate(F.ym + "-" + pad(F.min.d)),
          })
        )}</em>`
      : `<em class="ok">${escHtml(uiText("fc_ok"))}</em>`
  }</span>
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path d="${fcPath(pa, X, Y)}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/><path d="${fcPath(fu, X, Y)}" fill="none" stroke="${F.warn ? "var(--bad)" : "var(--accent)"}" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>${F.warn ? `<circle cx="${X(F.min.d).toFixed(1)}" cy="${Y(F.min.v).toFixed(1)}" r="3.2" fill="var(--bad)"/>` : ""}</svg><span class="fcchev">›</span></button>`;
}
const FC = {};
function fcOpen(quick) {
  FC.quick = !!quick;
  const F = fcCalc();
  FC.F = F;
  const b = hbSheet("fcBg", uiText("fc_title")),
    keepY = quick ? b.scrollTop : 0;
  const W = 330,
    H = 190,
    { X, Y, lo, hi } = fcScale(F, W, H, 0);
  const pa = F.pts.filter((p) => !p.f),
    fu = F.pts.filter((p) => p.f || p.d === F.d0),
    thrY = Math.min(H, Math.max(0, Y(F.thr))),
    today = F.pts.find((p) => p.d === F.d0),
    x0 = X(F.d0);
  const pc = (v) => ((v / W) * 100).toFixed(2) + "%",
    pv = (v) => ((v / H) * 100).toFixed(2) + "%",
    I = F.inc[0];
  b.innerHTML = `<div class="fccard"><small>${escHtml(
    uiText("fc_end", {
      d: fxDate(lastDayOf(F.ym), {
        day: "numeric",
        month: "long",
      }),
    })
  )}</small><div class="fcbig"><span id="fcN">${escHtml(fmtEur0(F.end))}</span></div>
    <div class="fcwrap" id="fcW"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="fcsvg">
      <defs><linearGradient id="fcga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient>
      <linearGradient id="fcgz" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--bad)" stop-opacity=".35"/><stop offset="1" stop-color="var(--bad)" stop-opacity=".08"/></linearGradient>
      <clipPath id="fcca"><rect id="fcCA" x="0" y="0" width="${reducedMotion() || quick ? x0 + 2 : 0}" height="${H}"/></clipPath><clipPath id="fccf"><rect id="fcCF" x="${x0}" y="0" width="${reducedMotion() || quick ? W : 0}" height="${H}"/></clipPath></defs>
      ${F.warn || (F.min && F.min.v < F.thr * 3) ? `<rect id="fcZ" x="0" y="${reducedMotion() || quick ? thrY : H}" width="${W}" height="${reducedMotion() || quick ? Math.max(0, H - thrY) : 0}" fill="url(#fcgz)"/>` : ""}
      <g clip-path="url(#fcca)"><path d="${fcPath(pa, X, Y)} L${X(F.d0)} ${H} L0 ${H}Z" fill="url(#fcga)"/><path id="fcP" d="${fcPath(pa, X, Y)}" fill="none" stroke="var(--accent)" stroke-width="3.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></g>
      <g clip-path="url(#fccf)"><path id="fcF" d="${fcPath(fu, X, Y)}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" vector-effect="non-scaling-stroke"/></g>
      <line x1="${x0}" x2="${x0}" y1="0" y2="${H}" class="fctl" vector-effect="non-scaling-stroke"/></svg>
      ${
        F.warn || (F.min && F.min.v < F.thr * 3)
          ? `<span class="fczl" style="top:${pv(thrY)}">${escHtml(
              uiText("fc_under", {
                n: fmtEur0(F.thr),
              })
            )}</span>`
          : ""
      }
      <span class="fchead" id="fcH" style="left:0;top:${pv(Y(F.pts[0].v))}"></span>
      <span class="fcchip dk" id="fcT" style="left:${pc(x0)};top:0">${escHtml(uiText("fc_today"))}</span>
      ${I ? `<span class="fcchip gn" id="fcI" style="left:${pc(X(I.d))};top:${pv(Math.max(18, Y(Math.max(...F.pts.filter((p) => p.d >= I.d).map((p) => p.v)))))}">${svgIcon("case", 12)} +${escHtml(fmtEur0(I.v))}</span>` : ""}
      ${F.warn ? `<span class="fcmin" id="fcM" style="left:${pc(X(F.min.d))};top:${pv(Y(F.min.v))}"><i></i></span>` : ""}
      <div class="fcscr" id="fcS"><span class="fctip" id="fcTip"></span></div></div>
    <div class="fcax"><span>${escHtml(fxDate(F.ym + "-01"))}</span><span>${escHtml(uiText("fc_today"))}</span><span>${escHtml(fxDate(lastDayOf(F.ym)))}</span></div>
    <p class="fchint"><svg class="i" viewBox="0 0 24 24" style="width:15px;height:15px;vertical-align:-3px"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-.6a5 5 0 0 1-4-2L4.6 14.6a1.5 1.5 0 0 1 2.2-2L9 14.5"/></svg> ${escHtml(uiText(IS_PC ? "fc_scrub_pc" : "fc_scrub"))}</p></div>
    ${
      F.warn
        ? `<div class="fcwarn" id="fcWarn"><b>${svgIcon("alert", 15)} ${escHtml(
            uiText("fc_tight", {
              d: fxDate(F.ym + "-" + pad(F.min.d), {
                day: "numeric",
                month: "long",
              }),
            })
          )}</b><span>${escHtml(
            F.min.v < 0
              ? uiText("fc_tight_neg", {
                  n: fmtEur0(Math.abs(F.min.v)),
                })
              : uiText("fc_tight_s", {
                  n: fmtEur0(F.min.v),
                })
          )}</span></div>`
        : `<div class="fcgood" id="fcWarn"><b>✓ ${escHtml(uiText("fc_good"))}</b><span>${escHtml(
            uiText("fc_good_s", {
              n: fmtEur0(F.end),
            })
          )}</span></div>`
    }
    <div class="fcmami" id="fcMa">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub"><span id="fcMt"></span></div></div>
    ${fcParts(F)}
    <div class="fcrows"><div class="vak">${escHtml(uiText("fc_next"))}</div>${fcNextRows(F)}</div>
    <p class="small muted" style="margin:10px 4px 0">${escHtml(
      uiText("fc_how2", {
        n: fmtEur0(F.avg),
      })
    )}</p>`;
  if (quick) b.scrollTop = keepY;
  fcAnim(F, X, Y, W, H);
  fcScrub(F, X, Y, W);
}
document.addEventListener("click", async (e) => {
  const t = e.target.closest && e.target.closest("[data-fcsw]");
  if (!t) return;
  const k = t.dataset.fcsw,
    cf = fcCfg();
  cf[k] = !cf[k];
  store.settings.fcCfg = cf;
  SND.play("tick");
  const old = FC.F ? FC.F.end : 0;
  t.classList.toggle("on", cf[k]);
  t.setAttribute("aria-checked", String(cf[k]));
  await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 180));
  fcOpen(true);
  const n = $("fcN");
  if (n && !reducedMotion()) {
    n._s = fmtEur0(old);
    n.textContent = fmtEur0(old);
    hbOdo(n, fmtEur0(FC.F.end), 600);
  }
  saveSettings();
  try {
    render();
  } catch (_) {}
});
function fcNextRows(F) {
  const ym = F.ym,
    paid = (store.months[ym] && store.months[ym].paid) || {},
    L = [];
  if (!F.cf || F.cf.fix)
    for (const f of fixedForMonth(ym, true)) {
      if (f.id in paid) continue;
      let d = payDay(f, ym) || F.d0 + 1;
      if (d <= F.d0) d = Math.min(F.dim, F.d0 + 1);
      L.push({
        d,
        n: tr(f.name),
        v: -planAmt(f, ym),
      });
    }
  for (const i of F.inc)
    L.push({
      d: i.d,
      n: tr(i.n || "Einnahme"),
      v: i.v,
    });
  L.sort((a, b) => a.d - b.d);
  if (!L.length) return `<p class="small muted">${escHtml(uiText("fc_none"))}</p>`;
  return `<div class="vacard">${L.slice(0, 8)
    .map(
      (x) =>
        `<div class="fcr"><span class="fcd">${escHtml(
          fxDate(ym + "-" + pad(x.d), {
            day: "numeric",
            month: "short",
          })
        )}</span><span class="grow">${escHtml(x.n)}</span><b class="${x.v < 0 ? "neg" : "pos"}">${x.v < 0 ? "−" : "+"}${escHtml(fmtEur(Math.abs(x.v)))}</b></div>`
    )
    .join("")}</div>`;
}
async function fcAnim(F, X, Y, W, H) {
  const tok = (FC.tok = (FC.tok || 0) + 1),
    live = () => FC.tok === tok && !$("fcBg").hidden,
    w = (ms) => new Promise((r) => setTimeout(r, ms));
  const tip = F.warn
    ? (F.allow || 0) < 5
      ? uiText("fc_mami_w0")
      : uiText("fc_mami_w", {
          n: fmtEur0(F.allow || 0),
          d: fxDate(F.ym + "-" + pad(F.min.d), {
            day: "numeric",
            month: "long",
          }),
        })
    : uiText("fc_mami_ok", {
        n: fmtEur0(F.end),
      });
  if (reducedMotion() || FC.quick) {
    $("fcMt").textContent = mFill(tip);
    if (FC.quick && !reducedMotion()) $("fcN").textContent = fmtEur0(F.end);
    ["fcT", "fcI", "fcM", "fcWarn", "fcMa"].forEach((i) => {
      const e = $(i);
      if (e) e.classList.add("on");
    });
    return;
  }
  hbOdo($("fcN"), fmtEur0(F.pts.find((p) => p.d === F.d0).v));
  await w(350);
  const P = $("fcP"),
    H0 = $("fcH"),
    pa = F.pts.filter((p) => !p.f),
    fu = F.pts.filter((p) => p.f || p.d === F.d0),
    x0 = X(F.d0);
  const along = (arr, k) => {
    const tx = X(arr[0].d) + (X(arr[arr.length - 1].d) - X(arr[0].d)) * k;
    let i = 1;
    while (i < arr.length - 1 && X(arr[i].d) < tx) i++;
    const a = arr[i - 1],
      b = arr[i] || a,
      q = b === a ? 0 : (tx - X(a.d)) / (X(b.d) - X(a.d));
    return [tx, Y(a.v + (b.v - a.v) * q)];
  };
  const run = (ms, f) =>
    new Promise((r) => {
      const t0 = performance.now(),
        g = (t) => {
          if (!live()) return r();
          const k = Math.min(1, (t - t0) / ms);
          f(k);
          if (k < 1) requestAnimationFrame(g);
          else r();
        };
      requestAnimationFrame(g);
    });
  H0.classList.add("on");
  await run(1100, (k) => {
    const e = 1 - Math.pow(1 - k, 3),
      [x, y] = along(pa.length > 1 ? pa : [pa[0], pa[0]], e);
    $("fcCA").setAttribute("width", Math.max(0, x + 2));
    H0.style.left = (x / W) * 100 + "%";
    H0.style.top = (y / H) * 100 + "%";
  });
  if (!live()) return;
  $("fcT").classList.add("on");
  await w(300);
  hbOdo($("fcN"), fmtEur0(F.end));
  await run(1500, (k) => {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2,
      [x, y] = along(fu.length > 1 ? fu : [fu[0], fu[0]], e);
    $("fcCF").setAttribute("width", Math.max(0, x - x0 + 2));
    H0.style.left = (x / W) * 100 + "%";
    H0.style.top = (y / H) * 100 + "%";
  });
  if (!live()) return;
  H0.classList.remove("on");
  const Z = $("fcZ");
  if (Z) {
    const thrY = Math.min(H, Math.max(0, Y(F.thr)));
    await run(650, (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      Z.setAttribute("y", H - (H - thrY) * e);
      Z.setAttribute("height", (H - thrY) * e);
    });
  }
  if ($("fcM")) $("fcM").classList.add("on");
  await w(F.warn ? 650 : 100);
  if ($("fcI")) $("fcI").classList.add("on");
  await w(400);
  const wn = $("fcWarn");
  if (wn) {
    wn.classList.add("on");
    if (F.warn) {
      await w(450);
      wn.classList.add("shake");
    }
  }
  await w(500);
  if (!live()) return;
  $("fcMa").classList.add("on");
  await w(350);
  const mt = $("fcMt"),
    s = mFill(tip);
  mt.classList.add("typ");
  for (const ch of s) {
    if (!live()) return;
    mt.textContent += ch;
    await w(18);
  }
  mt.classList.remove("typ");
}
function fcScrub(F, X, Y, W) {
  const wr = $("fcW"),
    sc = $("fcS"),
    tp = $("fcTip");
  if (!wr) return;
  const show = (cx) => {
    const r = wr.getBoundingClientRect(),
      k = Math.max(0, Math.min(1, (cx - r.left) / r.width)),
      d = Math.max(1, Math.min(F.dim, Math.round(1 + k * (F.dim - 1)))),
      p = F.pts.find((x) => x.d === d) || F.pts[F.pts.length - 1];
    sc.style.left = (X(d) / W) * 100 + "%";
    sc.classList.add("on");
    tp.textContent = `${fmtEur0(p.v)} · ${fxDate(F.ym + "-" + pad(d))}`;
    tp.className = "fctip" + (p.v < F.thr ? " bad" : p.f ? "" : " past");
  };
  wr.addEventListener("pointerdown", (e) => {
    wr.setPointerCapture(e.pointerId);
    show(e.clientX);
  });
  wr.addEventListener("pointermove", (e) => {
    if (e.buttons || e.pointerType === "mouse") show(e.clientX);
  });
  wr.addEventListener("pointerleave", () => sc.classList.remove("on"));
  wr.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") setTimeout(() => sc.classList.remove("on"), 1200);
  });
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-fcopen]")) {
    e.preventDefault();
    fcOpen();
  }
});

/* ---------- Sparregeln ---------- */
const SR_DEF = [
  ["round", "coins"],
  ["rest", "cal"],
  ["pay", "case"],
  ["skip", "ban"],
];
function srCfg() {
  return store.settings.srules || {};
}
function srGoals() {
  return (store.settings.goals || []).filter((g) => !g.account);
}
function srAmt(k, r, onlyYm) {
  r = r || {};
  if (!r.on || !r.from) return 0;
  const from = r.from,
    inYm = (d) => !onlyYm || d.startsWith(onlyYm);
  if (k === "round")
    return sum(
      store.tx.filter((t) => t.kind === "ausgabe" && t.date >= from && inYm(t.date) && !isWithdrawCat(t.cat)),
      (t) => {
        const a = Math.round(t.amount * 100),
          u = Math.ceil(a / 100) * 100;
        return (u - a) / 100;
      }
    );
  if (k === "pay")
    return sum(
      store.tx.filter((t) => t.kind === "einnahme" && t.date >= from && inYm(t.date) && incArt(t.cat) !== "sonstige"),
      (t) => (t.amount * (Number(r.pct) || 5)) / 100
    );
  if (k === "skip")
    return sum(
      (r.log || []).filter((x) => x.d >= from && inYm(x.d)),
      (x) => Number(x.v) || 0
    );
  if (k === "rest") {
    const cur = ymOf(new Date());
    let s = 0;
    for (let ym = shiftYm(from.slice(0, 7), 1); ym < cur; ym = shiftYm(ym, 1)) {
      if (onlyYm && ym !== onlyYm) continue;
      const n = monthCalc(ym).net;
      if (n > 0) s += (n * (Number(r.pct) || 100)) / 100;
    }
    return s;
  }
  return 0;
}
function srTotal() {
  const C = srCfg();
  return sum(SR_DEF, ([k]) => srAmt(k, C[k]));
}
function srForGoal(gid) {
  const C = srCfg(),
    G = srGoals();
  return sum(SR_DEF, ([k]) => {
    const r = C[k];
    if (!r || !r.on) return 0;
    const g = r.goal || (G[0] && G[0].id);
    return g === gid ? srAmt(k, r) : 0;
  });
}
function srGain(k, r) {
  const ym = ymOf(new Date());
  if (k === "rest") {
    const p = shiftYm(ym, -1),
      v = srAmt("rest", r, p);
    return v > 0
      ? uiText("sr_g_last", {
          n: fmtEur(v),
        })
      : uiText("sr_g_rest");
  }
  const v = srAmt(k, r, ym);
  return v > 0
    ? uiText("sr_g_month", {
        n: fmtEur(v),
      })
    : uiText("sr_g_wait");
}
function srOpen() {
  const b = hbSheet("srBg", uiText("sr_title"));
  srRender(true);
}
function srRender(first) {
  const bg = $("srBg");
  if (!bg || bg.hidden) return;
  const b = bg.querySelector(".hobody"),
    C = srCfg(),
    G = srGoals(),
    tot = srTotal();
  b.innerHTML = `<div class="srhero ${first ? "" : "still"}" id="srH"><small>${escHtml(uiText("sr_saved"))}</small><div class="srbig"><span id="srN">${escHtml(fmtEur(first && !reducedMotion() ? 0 : tot))}</span></div><span>${escHtml(uiText("sr_hero_s"))}</span><i class="srsh"></i></div>
    ${G.length ? "" : `<div class="notice info"><span>${escHtml(uiText("sr_nogoal"))}</span><button class="btn primary" data-go="ziele" data-hbclose="srBg">${escHtml(uiText("sr_goal_btn"))}</button></div>`}
    ${SR_DEF.map(([k, icn]) => {
      const r = C[k] || {},
        on = !!r.on,
        gid = r.goal || (G[0] && G[0].id) || "";
      return `<div class="srcard ${on ? "act" : ""}" data-srk="${k}"><div class="srrow"><span class="ic">${svgIcon(icn, 22)}</span><span class="grow"><b>${escHtml(uiText("sr_" + k))}</b><small>${escHtml(
        uiText("sr_" + k + "_s", {
          n: k === "pay" ? String(r.pct || 5) : k === "skip" ? fmtEur(Number(r.amt) || 3) : "",
        })
      )}</small></span>
        <button type="button" class="srtog ${on ? "on" : ""}" role="switch" aria-checked="${on}" data-srtog="${k}" aria-label="${escHtml(uiText("sr_" + k))}"></button></div>
        <div class="srmore ${on ? "on" : ""}"><div class="srgain">✓ ${escHtml(srGain(k, r))}</div>
          ${G.length > 1 ? `<label class="srsel"><span>→</span><select class="in" data-srgoal="${k}">${G.map((g) => `<option value="${escHtml(g.id)}" ${g.id === gid ? "selected" : ""}>${escHtml(g.name)}</option>`).join("")}</select></label>` : G.length ? `<div class="srsel"><span>→ ${escHtml(G[0].name)}</span></div>` : ""}
          ${k === "pay" ? `<div class="srseg">${[3, 5, 10].map((p) => `<button type="button" class="${(r.pct || 5) === p ? "on" : ""}" data-srpct="${p}">${p} %</button>`).join("")}</div>` : ""}
          ${
            k === "skip"
              ? `<button type="button" class="srskip" data-srskip>🙅 ${escHtml(
                  uiText("sr_skip_btn", {
                    n: fmtEur(Number(r.amt) || 3),
                  })
                )}</button>`
              : ""
          }</div></div>`;
    }).join("")}
    <p class="small muted" style="margin:10px 4px 0">${escHtml(uiText("sr_how"))}</p>`;
  if (first && !reducedMotion()) {
    b.querySelectorAll(".srcard").forEach((c, i) =>
      c.animate(
        [
          {
            opacity: 0,
            transform: "translateY(16px)",
          },
          {
            opacity: 1,
            transform: "none",
            filter: "none",
          },
        ],
        {
          duration: 600,
          delay: 120 + i * 90,
          easing: "cubic-bezier(.2,1.2,.35,1)",
          fill: "backwards",
        }
      )
    );
    setTimeout(() => hbOdo($("srN"), fmtEur(tot), 1400), 300);
  }
}
async function srSet(k, patch) {
  const C = (store.settings.srules = {
    ...(store.settings.srules || {}),
  });
  C[k] = {
    ...(C[k] || {}),
    ...patch,
  };
  await saveSettings();
}
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-sropen]")) {
    e.preventDefault();
    srOpen();
    return;
  }
  const tg = e.target.closest("[data-srtog]");
  if (tg) {
    const k = tg.dataset.srtog,
      r = srCfg()[k] || {},
      on = !r.on;
    tg.classList.toggle("on", on);
    const card = tg.closest(".srcard");
    card.classList.toggle("act", on);
    card.querySelector(".srmore").classList.toggle("on", on);
    if (on && !reducedMotion()) {
      const bb = tg.getBoundingClientRect();
      hbBurst(document.body, bb.left + bb.width / 2, bb.top + bb.height / 2, 14);
    }
    await srSet(
      k,
      on
        ? {
            on: true,
            from: r.from || isoToday(),
            goal: r.goal || (srGoals()[0] && srGoals()[0].id) || "",
          }
        : {
            on: false,
          }
    );
    setTimeout(() => {
      srRender();
      hbOdo($("srN"), fmtEur(srTotal()));
    }, 420);
    return;
  }
  const pc = e.target.closest("[data-srpct]");
  if (pc) {
    await srSet("pay", {
      pct: Number(pc.dataset.srpct),
    });
    srRender();
    return;
  }
  if (e.target.closest("[data-srskip]")) {
    const r = srCfg().skip || {},
      v = Number(r.amt) || 3;
    await srSet("skip", {
      log: [
        ...(r.log || []),
        {
          d: isoToday(),
          v,
        },
      ],
    });
    const btn = e.target.closest("[data-srskip]");
    srCoin(btn, $("srH"), () => {
      hbOdo($("srN"), fmtEur(srTotal()));
      const h = $("srH");
      if (h) {
        h.classList.remove("glow");
        void h.offsetWidth;
        h.classList.add("glow");
      }
    });
    setTimeout(() => srRender(), 1300);
    return;
  }
});
document.addEventListener("change", async (e) => {
  const g = e.target.dataset && e.target.dataset.srgoal;
  if (g) {
    await srSet(g, {
      goal: e.target.value,
    });
    srRender();
  }
});
function srCoin(from, to, done, label) {
  if (!from || !to || reducedMotion()) {
    if (done) done();
    return;
  }
  const a = from.getBoundingClientRect(),
    b = to.getBoundingClientRect(),
    x0 = a.left + a.width / 2,
    y0 = a.top + a.height / 2,
    x1 = b.left + b.width / 2,
    y1 = b.top + b.height / 2;
  const c = document.createElement("div");
  c.className = "hbcoin";
  c.textContent = "€";
  document.body.appendChild(c);
  const cx = (x0 + x1) / 2 + 40,
    cy = Math.min(y0, y1) - 140,
    K = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28,
      u = 1 - t;
    K.push({
      offset: t,
      transform: `translate(${u * u * x0 + 2 * u * t * cx + t * t * x1}px,${u * u * y0 + 2 * u * t * cy + t * t * y1}px) rotateY(${t * 720}deg) scale(${1 + 0.35 * Math.sin(Math.PI * t)})`,
    });
  }
  c.animate(K, {
    duration: 950,
    easing: "cubic-bezier(.5,0,.3,1)",
  })
    .finished.then(() => {
      c.remove();
      hbBurst(document.body, x1, y1, 10);
      if (done) done();
    })
    .catch(() => c.remove());
}
function srAfterSave(doc) {
  const r = srCfg().round;
  if (!r || !r.on || doc.kind !== "ausgabe" || isWithdrawCat(doc.cat)) return;
  const a = Math.round(doc.amount * 100),
    u = Math.ceil(a / 100) * 100,
    d = (u - a) / 100;
  if (d <= 0) return;
  let p = $("srPill");
  if (!p) {
    p = document.createElement("div");
    p.id = "srPill";
    p.setAttribute("data-noi18n", "");
    document.body.appendChild(p);
  }
  p.innerHTML = `<span class="sri">${svgIcon("coins", 22)}</span><span class="grow"><b>${escHtml(uiText("sr_pill"))}</b><span class="sra" id="srPA">${escHtml(fmtEur(doc.amount))}</span></span><span class="srp" id="srPP">+${escHtml(fmtEur(d))}</span>`;
  p.className = "";
  void p.offsetWidth;
  p.classList.add("on");
  setTimeout(() => hbOdo($("srPA"), fmtEur(u / 100)), 700);
  setTimeout(() => {
    $("srPP").classList.add("on");
  }, 1500);
  setTimeout(() => {
    const tab = document.querySelector('.tabs .tab[data-go="zukunft"]');
    srCoin($("srPP"), tab || document.body, () => {
      if (tab) {
        tab.classList.remove("srbump");
        void tab.offsetWidth;
        tab.classList.add("srbump");
      }
    });
  }, 2000);
  setTimeout(() => p.classList.remove("on"), 3300);
}

/* ---------- Monats-Highlights ---------- */
const HL_EMO = [
  [/lebensm|essen|super|rewe|aldi|lidl|edeka|food|grocer/i, "🛒"],
  [/wohn|miete|haus|pflicht|nebenk|strom|rent/i, "🏠"],
  [/spaß|freizeit|fun|kino|hobby|urlaub|reise/i, "🎉"],
  [/tank|park|auto|kfz|bahn|ticket|fahr/i, "⛽"],
  [/restaurant|café|cafe|bäcker|liefer|imbiss/i, "🍕"],
  [/kleid|mode|shopping|kauf/i, "🛍️"],
  [/gesund|apothe|arzt|drog/i, "💊"],
  [/kind|baby|schule/i, "🧸"],
  [/abo|handy|internet|netflix|spotify|stream/i, "📱"],
  [/büro|material|betrieb/i, "💼"],
  [/versich/i, "🛡️"],
];
function hlEmo(c) {
  for (const [re, e] of HL_EMO) if (re.test(c || "")) return e;
  return "💸";
}
function hlData(ym) {
  const c = monthCalc(ym),
    pc = monthCalc(shiftYm(ym, -1)),
    dim = daysIn(ym),
    out = c.tx.filter((t) => t.kind === "ausgabe" || t.kind === "betrieb"),
    paid = (store.months[ym] && store.months[ym].paid) || {};
  const by = {};
  for (const t of out) by[t.cat || "Sonstiges"] = (by[t.cat || "Sonstiges"] || 0) + t.amount;
  for (const [fid, a] of Object.entries(paid)) {
    const f = store.fixed.find((x) => x.id === fid);
    const k = (f && (fixArea(f) || f.cat)) || "Fixkosten";
    by[k] = (by[k] || 0) + (Number(a) || 0);
  }
  const top = Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => ({
      k,
      v,
      e: hlEmo(k),
    }));
  const days = Array(dim + 1).fill(0);
  for (const t of out) days[Number(t.date.slice(8, 10))] += t.amount;
  let hot = 1,
    calm = 1;
  for (let d = 1; d <= dim; d++) {
    if (days[d] > days[hot]) hot = d;
    if (days[d] < days[calm]) calm = d;
  }
  const delta = pc.expenses > 0 ? Math.round((c.expenses / pc.expenses - 1) * 100) : null,
    net = c.income - c.expenses,
    rate = c.income > 0 ? net / c.income : 0;
  const n = out.length,
    avgBuy = n ? sum(out, (t) => t.amount) / n : 0,
    wkend = sum(
      out.filter((t) => [0, 6].includes(new Date(t.date + "T12:00").getDay())),
      (t) => t.amount
    ),
    wd = {};
  for (const t of out) {
    const k = new Date(t.date + "T12:00").getDay();
    wd[k] = (wd[k] || 0) + 1;
  }
  const busy = Object.entries(wd).sort((a, b) => b[1] - a[1])[0];
  let type = "pro";
  if (rate >= 0.2) type = "owl";
  else if (delta != null && delta <= -10) type = "fox";
  else if (n >= 40 && avgBuy < 15) type = "squirrel";
  else if (wkend > sum(out, (t) => t.amount) * 0.45) type = "party";
  else if (top[0] && /lebensm|essen|restaurant|café|bäcker/i.test(top[0].k)) type = "foodie";
  const traits = [];
  if (busy)
    traits.push(
      uiText("hl_tr_day", {
        d: new Intl.DateTimeFormat(cLoc(), {
          weekday: "long",
        }).format(new Date(2024, 0, 7 + Number(busy[0]))),
      })
    );
  traits.push(
    uiText("hl_tr_buys", {
      n: String(n),
    })
  );
  if (avgBuy)
    traits.push(
      uiText("hl_tr_avg", {
        n: fmtEur0(avgBuy),
      })
    );
  const bud = store.settings.budgets || {},
    budOk = Object.entries(bud).filter(([, v]) => +v > 0),
    budHeld = budOk.length && budOk.every(([k, v]) => (by[k] || 0) <= +v);
  const tDays = new Set(c.tx.map((t) => t.date)).size,
    rc = c.tx.filter((t) => hasReceipt(t.id)).length,
    badges = [];
  if (budHeld) badges.push(["🏆", "hl_b_budget", "gold"]);
  if (delta != null && delta < 0) badges.push(["📉", "hl_b_less", "silver"]);
  if (net > 0) badges.push(["🐷", "hl_b_saved", "gold"]);
  if (tDays >= 12)
    badges.push([
      "🔥",
      "hl_b_streak",
      "silver",
      {
        n: String(tDays),
      },
    ]);
  if (rc >= 5)
    badges.push([
      "📸",
      "hl_b_bons",
      "bronze",
      {
        n: String(rc),
      },
    ]);
  if (c.fixOpen <= 0.01 && fixedForMonth(ym, true).length) badges.push(["✅", "hl_b_fix", "bronze"]);
  if (!badges.length) badges.push(["🌱", "hl_b_start", "bronze"]);
  const goal = (store.settings.goals || [])[0],
    gp = goal && Number(goal.target) > 0 ? Math.min(1, goalSaved(goal).v / Number(goal.target)) : null;
  return {
    ym,
    c,
    pc,
    top,
    days,
    dim,
    hot,
    calm,
    delta,
    net,
    rate,
    type,
    traits,
    badges: badges.slice(0, 3),
    goal,
    gp,
    n,
  };
}
function hlShould() {
  const cur = ymOf(new Date()),
    p = shiftYm(cur, -1);
  const n = store.tx.filter((t) => (t.date || "").startsWith(p)).length;
  return n >= 5 ? p : null;
}
function hlCard() {
  const p = hlShould();
  if (!p) return "";
  const seen = store.settings.hlSeen === p;
  return `<button type="button" class="hlcard ${seen ? "seen" : ""}" data-hlopen="${p}" data-noi18n><span class="hlsp">✨</span><span class="grow"><b>${escHtml(
    uiText(seen ? "hl_card_again" : "hl_card", {
      m: monName(p),
    })
  )}</b>${seen ? "" : `<small>${escHtml(uiText("hl_card_s"))}</small>`}</span><span class="hlgo">›</span></button>`;
}
const HL = {
  i: 0,
  t: 0,
  paused: false,
};
const HL_MESH = [
  ["#1fae7a", "#0b4a37", "#4cc9a0"],
  ["#3d63a8", "#1a2f5c", "#7f9cf5"],
  ["#e8a200", "#9a3d00", "#ffcf5c"],
  ["#d0457f", "#3a1053", "#ff8fb1"],
  ["#1d9a6c", "#0b3b4a", "#5ee0b0"],
  ["#ff8a3d", "#7a2a00", "#ffd29a"],
  ["#7a3b8f", "#2e1440", "#d06bd4"],
  ["#147a5b", "#0b2f40", "#3d63a8"],
];
const HL_DUR = [5200, 6500, 6800, 6800, 6500, 7200, 6800, 0];
function hlOpen(ym) {
  SND.play("fanfare");
  const D = hlData(ym);
  HL.D = D;
  HL.i = 0;
  HL.paused = false;
  if (store.settings.hlSeen !== ym) {
    store.settings.hlSeen = ym;
    saveSettings();
  }
  let o = $("hlBg");
  if (o) o.remove();
  o = document.createElement("div");
  o.id = "hlBg";
  o.setAttribute("data-noi18n", "");
  o.setAttribute("role", "dialog");
  o.setAttribute("aria-modal", "true");
  o.setAttribute(
    "aria-label",
    uiText("hl_title", {
      m: monName(ym),
    })
  );
  const M = monName(ym).toUpperCase(),
    c = D.c,
    T3 = D.top,
    prevM = monName(shiftYm(ym, -1)),
    first = new Date(ym + "-01T12:00").getDay(),
    off = (first + 6) % 7,
    mx = Math.max(1, ...D.days);
  const TY = {
    owl: ["🦉", "hl_t_owl"],
    fox: ["🦊", "hl_t_fox"],
    squirrel: ["🐿️", "hl_t_sq"],
    party: ["🎉", "hl_t_party"],
    foodie: ["🍝", "hl_t_food"],
    pro: ["🧭", "hl_t_pro"],
  }[D.type];
  const podH = [150, 210, 110],
    podOrder = [1, 0, 2],
    podC = [
      ["#ffe08a", "#e8a200"],
      ["#7fc8ff", "#3d7fd0"],
      ["#ffb3c8", "#e0577f"],
    ];
  o.innerHTML = `<div class="hlph"><div class="hlmesh" id="hlMesh"><i></i><i></i><i></i></div><div class="hlgrain"></div><div class="hlparts">${[...Array(22)].map(() => `<i style="left:${(Math.random() * 100).toFixed(1)}%;animation-duration:${(8 + Math.random() * 10).toFixed(1)}s;animation-delay:${(-Math.random() * 10).toFixed(1)}s;width:${(2 + Math.random() * 3).toFixed(1)}px;height:${(2 + Math.random() * 3).toFixed(1)}px"></i>`).join("")}</div>
   <div class="hlbars">${HL_DUR.map(() => "<i><u></u></i>").join("")}</div>
   <div class="hlhead"><b>M</b><span>${escHtml(
     uiText("hl_title", {
       m: monName(ym),
     })
   )}</span><button type="button" class="hlx" data-hlclose aria-label="${escHtml(uiText("hl_close"))}"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
   <div class="hlsl" data-i="0"><div class="hlk hlw">${escHtml(uiText("hl_your"))}</div><div class="hllet">${[...M].map((ch) => `<span>${escHtml(ch)}</span>`).join("")}</div><div class="hlh2"><span class="hlw">${escHtml(uiText("hl_ready"))}</span> <span class="hlw">👀</span></div></div>
   <div class="hlsl c" data-i="1"><div class="hlk hlw">${escHtml(
     uiText("hl_spent", {
       m: M,
     })
   )}</div><svg class="hlring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fg" id="hlRing"/></svg>
     <div class="hlbig" style="margin-top:150px"><span id="hlN1">0 €</span></div>${
       c.income > 0
         ? `<div class="hlw hlsub">${escHtml(
             uiText("hl_of", {
               n: fmtEur0(c.income),
             })
           )}</div>`
         : ""
     }
     ${
       D.delta != null
         ? `<div style="margin-top:140px"><span class="hlstamp ${D.delta > 0 ? "up" : ""}" id="hlSt">${escHtml(
             uiText(D.delta > 0 ? "hl_more" : "hl_less", {
               n: String(Math.abs(D.delta)),
               m: prevM,
             })
           )}</span></div>`
         : ""
     }</div>
   <div class="hlsl" data-i="2"><div class="hlk hlw">${escHtml(uiText("hl_pod"))}</div><div class="hlh2 hlw">${escHtml(uiText("hl_pod_s"))}</div>
     <div class="hlpod">${podOrder
       .map((j) => {
         const x = T3[j];
         if (!x) return `<div></div>`;
         return `<div><span class="em">${x.e}</span><div class="bl" style="background:linear-gradient(${podC[j][0]},${podC[j][1]})" data-h="${podH[j]}">${j + 1}<small>${escHtml(fmtEur0(x.v))}</small></div><span class="nm">${escHtml(tr(x.k))}</span></div>`;
       })
       .join("")}</div></div>
   <div class="hlsl" data-i="3"><div class="hlk hlw">${escHtml(uiText("hl_heat"))}</div><div class="hlh2 hlw">${escHtml(uiText("hl_heat_s"))}</div>
     <div class="hlhm">${[...Array(7).keys()]
       .map(
         (i) =>
           `<b>${escHtml(
             new Intl.DateTimeFormat(cLoc(), {
               weekday: "narrow",
             }).format(new Date(2024, 0, 1 + i))
           )}</b>`
       )
       .join("")}${"<i class='x'></i>".repeat(off)}${[...Array(D.dim).keys()]
       .map((i) => {
         const d = i + 1,
           v = D.days[d] / mx;
         return `<i data-d="${d}" style="--v:${v.toFixed(3)}" class="${d === D.hot ? "hot" : ""}">${d}</i>`;
       })
       .join("")}</div>
     <div class="hlcall" id="hlCall">${escHtml(
       new Intl.DateTimeFormat(cLoc(), {
         weekday: "short",
         day: "numeric",
       }).format(new Date(ym + "-" + pad(D.hot) + "T12:00"))
     )} · ${escHtml(fmtEur0(D.days[D.hot]))}</div>
     <div class="hlw hlsub" style="margin-top:16px">${escHtml(
       uiText("hl_calm", {
         d: new Intl.DateTimeFormat(cLoc(), {
           weekday: "short",
           day: "numeric",
         }).format(new Date(ym + "-" + pad(D.calm) + "T12:00")),
         n: fmtEur0(D.days[D.calm]),
       })
     )}</div></div>
   <div class="hlsl c" data-i="4"><div class="hlk hlw">${escHtml(uiText(D.net > 0 ? "hl_saved" : "hl_tight"))}</div><div class="hlbig"><span id="hlN4">0 €</span></div>
     <div class="hljar"><svg viewBox="0 0 200 250"><defs><clipPath id="hlJc"><path d="M50 30h100v18c22 10 30 30 30 52v120a24 24 0 0 1-24 24H44a24 24 0 0 1-24-24V100c0-22 8-42 30-52z"/></clipPath></defs><path d="M50 30h100v18c22 10 30 30 30 52v120a24 24 0 0 1-24 24H44a24 24 0 0 1-24-24V100c0-22 8-42 30-52z" fill="rgba(255,255,255,.12)" stroke="#fff" stroke-width="5"/>
       <g clip-path="url(#hlJc)"><g id="hlWv" style="transform:translateY(250px);transition:transform 2.2s cubic-bezier(.3,1,.3,1)"><path class="w1" d="M-200 10 q25 -12 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V300 H-200z" fill="#3cc28d"/><path class="w2" d="M-200 18 q25 -10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V300 H-200z" fill="#1d9a6c"/></g></g><rect x="44" y="16" width="112" height="20" rx="7" fill="#fff"/></svg></div>
     <div class="hlw hlsub">${
       D.net > 0 && c.income > 0
         ? escHtml(
             uiText("hl_rate", {
               n: String(Math.round(D.rate * 100)),
             })
           )
         : escHtml(uiText("hl_tight_s"))
     }</div>${
       D.goal && D.gp != null
         ? `<div class="hlw hlsub" style="opacity:1;font-weight:800">🎯 ${escHtml(
             uiText("hl_goal", {
               g: D.goal.name,
               n: String(Math.round(D.gp * 100)),
             })
           )}</div>`
         : ""
     }</div>
   <div class="hlsl c" data-i="5"><div class="hlk hlw">${escHtml(uiText("hl_type"))}</div><div class="hlflip" id="hlFl"><div class="fr">?</div><div class="bk"><div style="font-size:78px">${TY[0]}</div><div class="hlh2" style="margin:2px 0 6px">${escHtml(uiText(TY[1]))}</div><p>${escHtml(uiText(TY[1] + "_s"))}</p><div>${D.traits.map((t) => `<span class="tr">${escHtml(t)}</span>`).join("")}</div></div></div></div>
   <div class="hlsl c" data-i="6"><div class="hlrays"></div><div class="hlk hlw" style="position:relative">${escHtml(uiText("hl_badges"))}</div><div class="hlmed">${D.badges.map(([e, k, m, v]) => `<div class="md ${m}"><div class="rb"></div><div class="co">${e}</div><b>${escHtml(uiText(k, v))}</b></div>`).join("")}</div>
     <div class="hlh2 hlw" style="margin-top:22px;position:relative">${escHtml(
       uiText(D.badges.length === 1 ? "hl_b_one" : "hl_b_n", {
         n: String(D.badges.length),
       })
     )} 🎉</div></div>
   <div class="hlsl" data-i="7"><div class="hlk hlw">${escHtml(uiText("hl_your"))} ${escHtml(M)}</div><div class="hlh2 hlw">${escHtml(uiText("hl_sum"))}</div>
     <div class="hlcoll"><div class="t a"><small>${escHtml(uiText("hl_c_spent"))}</small><b>${D.delta != null ? (D.delta > 0 ? "+" : "−") + Math.abs(D.delta) + " %" : escHtml(fmtEur0(c.expenses))}</b><small>${
       D.delta != null
         ? escHtml(
             uiText("hl_c_vs", {
               m: prevM,
             })
           )
         : ""
     }</small></div>
      <div class="t b"><small>${escHtml(uiText("hl_c_top"))}</small><div style="font-size:44px;margin:8px 0">${T3[0] ? T3[0].e : "💸"}</div><b>${escHtml(T3[0] ? tr(T3[0].k) : "–")}</b></div>
      <div class="t c"><small>${escHtml(uiText("hl_c_saved"))}</small><b>${D.net > 0 ? Math.round(D.rate * 100) + " %" : "–"}</b><small>🐷</small></div>
      <div class="t d"><small>${escHtml(uiText("hl_c_type"))}</small><b style="font-size:19px">${TY[0]} ${escHtml(uiText(TY[1]))}</b></div>
      <div class="t e"><small>${escHtml(uiText("hl_c_badges"))}</small><div style="font-size:28px;margin-top:6px">${D.badges.map((b) => b[0]).join("")}</div></div>
      <button type="button" class="t f" data-hlshare>${escHtml(uiText("hl_share"))} ↗</button></div></div>
   <div class="hlmami" id="hlMa">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub" id="hlMt"></div></div>
   <div class="hltap l" data-hlprev></div><div class="hltap r" data-hlnext></div></div>`;
  document.body.appendChild(o);
  document.body.classList.add("locked");
  requestAnimationFrame(() => o.classList.add("on"));
  hlGo(0);
}
function hlMami(t) {
  const m = $("hlMa");
  if (!m) return;
  m.classList.remove("on");
  clearTimeout(HL.mt);
  HL.mt = setTimeout(() => {
    $("hlMt").textContent = mFill(t);
    m.classList.add("on");
  }, 260);
}
function hlGo(i) {
  const o = $("hlBg");
  if (!o) return;
  const D = HL.D,
    N = HL_DUR.length;
  if (i < 0) i = 0;
  if (i >= N) {
    hlClose();
    return;
  }
  HL.i = i;
  clearTimeout(HL.t);
  clearTimeout(HL.mt);
  $("hlMa").classList.remove("on");
  [...$("hlMesh").children].forEach((b, j) => (b.style.background = HL_MESH[i][j]));
  [...o.querySelectorAll(".hlbars u")].forEach((u, j) => {
    u.style.transition = "none";
    u.style.width = j < i ? "100%" : "0";
  });
  o.querySelectorAll(".hlsl").forEach((s) => s.classList.toggle("on", Number(s.dataset.i) === i));
  const sl = o.querySelector(`.hlsl[data-i="${i}"]`),
    R = reducedMotion();
  sl.querySelectorAll(".hlw").forEach((e) => e.classList.remove("on"));
  if (!R)
    sl.animate(
      [
        {
          opacity: 0,
          transform: "scale(1.06)",
        },
        {
          opacity: 1,
          transform: "none",
          filter: "none",
        },
      ],
      {
        duration: 650,
        easing: "cubic-bezier(.2,1,.3,1)",
      }
    );
  sl.querySelectorAll(".hlw").forEach((e, k) => setTimeout(() => e.classList.add("on"), R ? 0 : 120 + k * 120));
  const dur = HL_DUR[i];
  if (dur) {
    const u = o.querySelectorAll(".hlbars u")[i];
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        u.style.transition = `width ${dur}ms linear`;
        u.style.width = "100%";
      })
    );
    HL.t = setTimeout(() => {
      if (!HL.paused) hlGo(i + 1);
    }, dur);
    HL.end = performance.now() + dur;
  } else o.querySelectorAll(".hlbars u")[i].style.width = "100%";
  const S2 = (f, ms) =>
      setTimeout(
        () => {
          if (HL.i === i && $("hlBg")) f();
        },
        R ? 0 : ms
      ),
    ph = o.querySelector(".hlph");
  if (i === 0) {
    sl.querySelectorAll(".hllet span").forEach((s, k) => S2(() => s.classList.add("on"), 250 + k * 100));
    S2(() => hbConfetti(ph, 44), 1200);
    S2(() => hlMami(uiText("hl_m0")), 1800);
  }
  if (i === 1) {
    S2(() => hbOdo($("hlN1"), fmtEur0(D.c.expenses), 1700), 250);
    const rg = $("hlRing");
    rg.style.transition = "none";
    rg.style.strokeDasharray = "0 277";
    S2(() => {
      rg.style.transition = "stroke-dasharray 2.2s cubic-bezier(.2,1,.3,1)";
      rg.style.strokeDasharray = `${(277 * Math.min(1, D.c.income > 0 ? D.c.expenses / D.c.income : 0.75)).toFixed(1)} 277`;
    }, 300);
    const st = $("hlSt");
    if (st) {
      st.classList.remove("on");
      S2(() => {
        st.classList.add("on");
        S2(() => {
          ph.classList.remove("shake");
          void ph.offsetWidth;
          ph.classList.add("shake");
          const r = st.getBoundingClientRect(),
            p = ph.getBoundingClientRect();
          hbBurst(ph, r.left - p.left + r.width / 2, r.top - p.top + r.height / 2, 20);
        }, 420);
      }, 2400);
    }
    S2(
      () =>
        hlMami(
          D.delta != null && D.delta < 0
            ? uiText("hl_m1_good", {
                n: String(Math.abs(D.delta)),
              })
            : uiText("hl_m1")
        ),
      3300
    );
  }
  if (i === 2) {
    const cols = [...sl.querySelectorAll(".hlpod>div")];
    cols.forEach((cl) => {
      const b = cl.querySelector(".bl");
      if (b) {
        b.style.transition = "none";
        b.style.height = "0";
      }
      const em = cl.querySelector(".em");
      if (em) em.classList.remove("on");
      const nm = cl.querySelector(".nm");
      if (nm) nm.classList.remove("on");
    });
    [2, 0, 1].forEach((j, k) =>
      S2(
        () => {
          const b = cols[j] && cols[j].querySelector(".bl");
          if (b) {
            b.style.transition = "";
            b.style.height = b.dataset.h + "px";
          }
        },
        500 + k * 330
      )
    );
    [2, 0, 1].forEach((j, k) =>
      S2(
        () => {
          const cl = cols[j];
          if (!cl) return;
          const em = cl.querySelector(".em"),
            nm = cl.querySelector(".nm");
          if (em) em.classList.add("on");
          if (nm) nm.classList.add("on");
          if (j === 1 && em) {
            setTimeout(() => {
              const r = em.getBoundingClientRect(),
                p = ph.getBoundingClientRect();
              hbBurst(ph, r.left - p.left + r.width / 2, r.top - p.top + r.height / 2, 24);
            }, 500);
          }
        },
        1700 + k * 260
      )
    );
    const t0 = D.top[0],
      bu = t0 && (store.settings.budgets || {})[t0.k];
    S2(
      () =>
        hlMami(
          t0
            ? bu && t0.v <= +bu
              ? uiText("hl_m2_bud", {
                  c: tr(t0.k),
                  n: fmtEur0(+bu - t0.v),
                })
              : uiText("hl_m2", {
                  c: tr(t0.k),
                })
            : uiText("hl_m2_none")
        ),
      3300
    );
  }
  if (i === 3) {
    const cells = [...sl.querySelectorAll(".hlhm i[data-d]")];
    cells.forEach((c) => c.classList.remove("on"));
    $("hlCall").classList.remove("on");
    cells.forEach((c, k) => {
      const idx = k + hlOff(D.ym),
        r = Math.floor(idx / 7),
        col = idx % 7;
      S2(() => c.classList.add("on"), 300 + (r + col) * 85);
    });
    S2(() => {
      const h = sl.querySelector(".hlhm i.hot"),
        cl = $("hlCall");
      if (h) {
        const r = h.getBoundingClientRect(),
          p = sl.getBoundingClientRect();
        cl.style.left = r.left - p.left + r.width / 2 + "px";
        cl.style.top = r.top - p.top - 10 + "px";
        cl.classList.add("on");
      }
    }, 1900);
  }
  if (i === 4) {
    const wv = $("hlWv");
    wv.style.transition = "none";
    wv.style.transform = "translateY(250px)";
    S2(() => hbOdo($("hlN4"), fmtEur0(Math.abs(D.net)), 2000), 300);
    const lvl = D.net > 0 ? Math.max(0.15, Math.min(0.9, D.rate * 2.2)) : 0.08;
    S2(() => {
      wv.style.transition = "";
      wv.style.transform = `translateY(${(240 - 200 * lvl).toFixed(0)}px)`;
    }, 900);
    if (!R) {
      const jar = sl.querySelector(".hljar");
      for (let k = 0; k < (D.net > 0 ? 12 : 3); k++)
        S2(
          () => {
            const r = jar.getBoundingClientRect(),
              p = ph.getBoundingClientRect(),
              x1 = r.left - p.left + r.width / 2,
              y1 = r.top - p.top + 50,
              cn = document.createElement("div");
            cn.className = "hbcoin";
            cn.style.position = "absolute";
            cn.textContent = "€";
            ph.appendChild(cn);
            const x0 = 30 + Math.random() * (p.width - 60);
            cn.animate(
              [
                {
                  transform: `translate(${x0}px,40px) rotate(0)`,
                },
                {
                  transform: `translate(${x1 + (Math.random() - 0.5) * 60}px,${y1}px) rotate(540deg)`,
                  opacity: 1,
                },
                {
                  transform: `translate(${x1}px,${y1 + 60}px) scale(.4)`,
                  opacity: 0,
                },
              ],
              {
                duration: 1000,
                easing: "cubic-bezier(.5,0,.6,1)",
                fill: "forwards",
              }
            )
              .finished.then(() => cn.remove())
              .catch(() => cn.remove());
          },
          350 + k * 110
        );
    }
    S2(() => hlMami(D.net > 0 ? uiText("hl_m4") : uiText("hl_m4_t")), 3400);
  }
  if (i === 5) {
    const fl = $("hlFl");
    fl.classList.remove("on");
    sl.querySelectorAll(".tr").forEach((t) => t.classList.remove("on"));
    S2(() => {
      if (!R)
        fl.animate(
          [
            {
              transform: "rotateZ(0)",
            },
            {
              transform: "rotateZ(-4deg)",
            },
            {
              transform: "rotateZ(4deg)",
            },
            {
              transform: "rotateZ(0)",
            },
          ],
          {
            duration: 500,
          }
        );
    }, 900);
    S2(() => {
      fl.classList.add("on");
    }, 1500);
    S2(() => {
      const r = fl.getBoundingClientRect(),
        p = ph.getBoundingClientRect();
      hbBurst(ph, r.left - p.left + r.width / 2, r.top - p.top + r.height / 2, 30);
    }, 2500);
    sl.querySelectorAll(".tr").forEach((t, k) => S2(() => t.classList.add("on"), 2800 + k * 160));
  }
  if (i === 6) {
    const ms = [...sl.querySelectorAll(".md")];
    ms.forEach((m) => m.classList.remove("on"));
    ms.forEach((m, k) => S2(() => m.classList.add("on"), 400 + k * 380));
    S2(() => hbConfetti(ph, 60), 1900);
    S2(() => hlMami(uiText("hl_m6")), 2600);
  }
  if (i === 7) {
    const ts = [...sl.querySelectorAll(".hlcoll .t")];
    ts.forEach((t, k) => {
      if (R) return;
      const dx = (Math.random() - 0.5) * 600,
        dy = 400 + Math.random() * 200,
        r = (Math.random() - 0.5) * 60;
      t.animate(
        [
          {
            opacity: 0,
            transform: `translate(${dx}px,${dy}px) rotate(${r}deg) scale(.6)`,
          },
          {
            opacity: 1,
            transform: "none",
          },
        ],
        {
          duration: 900,
          delay: 250 + k * 150,
          easing: "cubic-bezier(.2,1.25,.35,1)",
          fill: "backwards",
        }
      );
    });
  }
}
function hlOff(ym) {
  return (new Date(ym + "-01T12:00").getDay() + 6) % 7;
}
function hlClose() {
  const o = $("hlBg");
  clearTimeout(HL.t);
  clearTimeout(HL.mt);
  if (!o) return;
  o.classList.remove("on");
  document.body.classList.remove("locked");
  setTimeout(() => {
    o.remove();
    render();
  }, 320);
}
async function hlShare() {
  const D = HL.D;
  if (!D) return;
  const cv = document.createElement("canvas");
  cv.width = 1080;
  cv.height = 1350;
  const g = cv.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 1080, 1350);
  gr.addColorStop(0, "#147a5b");
  gr.addColorStop(1, "#0b2f40");
  g.fillStyle = gr;
  g.fillRect(0, 0, 1080, 1350);
  const TY = {
    owl: ["🦉", "hl_t_owl"],
    fox: ["🦊", "hl_t_fox"],
    squirrel: ["🐿️", "hl_t_sq"],
    party: ["🎉", "hl_t_party"],
    foodie: ["🍝", "hl_t_food"],
    pro: ["🧭", "hl_t_pro"],
  }[D.type];
  g.fillStyle = "#7ff0c2";
  g.font = "800 40px Inter, system-ui, sans-serif";
  g.fillText(
    uiText("hl_title", {
      m: monName(D.ym),
    }).toUpperCase(),
    80,
    140
  );
  g.fillStyle = "#fff";
  g.font = "900 96px Inter, system-ui, sans-serif";
  g.fillText(monName(D.ym), 80, 250);
  const box = (x, y, w, h, c1, c2, lines) => {
    const gg = g.createLinearGradient(x, y, x + w, y + h);
    gg.addColorStop(0, c1);
    gg.addColorStop(1, c2);
    g.fillStyle = gg;
    g.beginPath();
    g.roundRect(x, y, w, h, 40);
    g.fill();
    let yy = y + 70;
    for (const [t, f, col] of lines) {
      g.fillStyle = col || "#fff";
      g.font = f;
      g.fillText(t, x + 40, yy);
      yy += parseInt(f.split(" ")[1]) + 22;
    }
  };
  box(80, 320, 440, 300, "#3d63a8", "#1a2f5c", [
    [uiText("hl_c_spent"), "700 34px Inter"],
    [D.delta != null ? (D.delta > 0 ? "+" : "−") + Math.abs(D.delta) + " %" : "–", "900 96px Inter"],
    [
      D.delta != null
        ? uiText("hl_c_vs", {
            m: monName(shiftYm(D.ym, -1)),
          })
        : "",
      "600 30px Inter",
    ],
  ]);
  box(560, 320, 440, 300, "#e8a200", "#9a5a00", [
    [uiText("hl_c_top"), "700 34px Inter"],
    [D.top[0] ? D.top[0].e : "💸", "400 96px Inter"],
    [D.top[0] ? tr(D.top[0].k) : "–", "900 44px Inter"],
  ]);
  box(80, 660, 440, 300, "#1fae7a", "#0b4a37", [
    [uiText("hl_c_saved"), "700 34px Inter"],
    [D.net > 0 ? Math.round(D.rate * 100) + " %" : "–", "900 96px Inter"],
    ["🐷", "400 50px Inter"],
  ]);
  box(560, 660, 440, 300, "#ffd9a0", "#e0a060", [
    [uiText("hl_c_type"), "700 34px Inter", "#5a3200"],
    [TY[0], "400 96px Inter", "#5a3200"],
    [uiText(TY[1]), "900 40px Inter", "#5a3200"],
  ]);
  box(80, 1000, 920, 200, "#7a3b8f", "#2e1440", [
    [uiText("hl_c_badges"), "700 34px Inter"],
    [D.badges.map((b) => b[0]).join("  "), "400 80px Inter"],
  ]);
  g.fillStyle = "rgba(255,255,255,.75)";
  g.font = "700 32px Inter";
  g.fillText("Finanz MAMI", 80, 1290);
  const url = cv.toDataURL("image/jpeg", 0.9),
    name = `finanz-mami-${D.ym}.jpg`;
  if (window.AndroidBridge && (AndroidBridge.shareImage || AndroidBridge.saveFileB64)) return rcptShare(url, name);
  try {
    const bl = await (await fetch(url)).blob(),
      f = new File([bl], name, {
        type: "image/jpeg",
      });
    if (
      navigator.canShare &&
      navigator.canShare({
        files: [f],
      })
    ) {
      await navigator.share({
        files: [f],
        title: "Finanz MAMI",
      });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast(uiText("hl_saved_img"));
}
document.addEventListener("click", (e) => {
  const op = e.target.closest("[data-hlopen]");
  if (op) {
    e.preventDefault();
    hlOpen(op.dataset.hlopen);
    return;
  }
  if (!$("hlBg")) return;
  if (e.target.closest("[data-hlclose]")) {
    hlClose();
    return;
  }
  if (e.target.closest("[data-hlshare]")) {
    hlShare();
    return;
  }
  if (e.target.closest("[data-hlnext]")) {
    hlGo(HL.i + 1);
    return;
  }
  if (e.target.closest("[data-hlprev]")) {
    hlGo(HL.i - 1);
    return;
  }
});
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest || !e.target.closest(".hltap")) return;
  HL.paused = true;
  HL.pd = performance.now();
  clearTimeout(HL.t);
  const u = document.querySelectorAll("#hlBg .hlbars u")[HL.i];
  if (u) {
    const w = getComputedStyle(u).width;
    u.style.transition = "none";
    u.style.width = w;
  }
});
document.addEventListener("pointerup", (e) => {
  if (!HL.paused) return;
  const held = performance.now() - (HL.pd || 0);
  HL.paused = false;
  if (held > 350) {
    e.preventDefault();
    const i = HL.i,
      rest = Math.max(800, (HL.end || 0) - (HL.pd || 0));
    HL.end = performance.now() + rest;
    const u = document.querySelectorAll("#hlBg .hlbars u")[i];
    if (u && HL_DUR[i]) {
      u.style.transition = `width ${rest}ms linear`;
      u.style.width = "100%";
      HL.t = setTimeout(() => {
        if (HL.i === i) hlGo(i + 1);
      }, rest);
    }
    HL.skipClick = true;
    setTimeout(() => (HL.skipClick = false), 50);
  }
});
document.addEventListener(
  "click",
  (e) => {
    if (HL.skipClick && e.target.closest(".hltap")) {
      e.stopImmediatePropagation();
    }
  },
  true
);
document.addEventListener("keydown", (e) => {
  if (!$("hlBg")) return;
  if (e.key === "Escape") hlClose();
  else if (e.key === "ArrowRight") hlGo(HL.i + 1);
  else if (e.key === "ArrowLeft") hlGo(HL.i - 1);
});
Object.assign(TEXTS, {
  am_aa: [
    "Arbeitsamt",
    "employment agency",
    "İş Ajansı",
    "агентство занятости",
    "агентство зайнятості",
    "urząd pracy",
    "وكالة العمل",
    "agenția de muncă",
  ],
  am_jc: ["Jobcenter", "job centre", "Jobcenter", "Jobcenter", "Jobcenter", "Jobcenter", "مركز العمل", "Jobcenter"],
  am_alg: [
    "Arbeitslosengeld",
    "unemployment benefit",
    "işsizlik parası",
    "пособие по безработице",
    "допомога з безробіття",
    "zasiłek",
    "إعانة البطالة",
    "ajutor de șomaj",
  ],
  am_gs: [
    "Grundsicherung",
    "basic income support",
    "temel güvence",
    "базовое пособие",
    "базова допомога",
    "zasiłek podstawowy",
    "الإعانة الأساسية",
    "ajutor social de bază",
  ],
  tm_title: [
    "Termine & Fristen",
    "Appointments & deadlines",
    "Randevular ve süreler",
    "Встречи и сроки",
    "Зустрічі та терміни",
    "Terminy i wizyty",
    "المواعيد والمهل",
    "Programări și termene",
  ],
  tm_nextt: [
    "Nächster Termin",
    "Next appointment",
    "Sonraki randevu",
    "Следующая встреча",
    "Наступна зустріч",
    "Następna wizyta",
    "الموعد التالي",
    "Următoarea programare",
  ],
  tm_nextf: [
    "Nächste Frist",
    "Next deadline",
    "Sonraki süre",
    "Следующий срок",
    "Наступний термін",
    "Następny termin",
    "المهلة التالية",
    "Următorul termen",
  ],
  tm_today: ["heute", "today", "bugün", "сегодня", "сьогодні", "dziś", "اليوم", "azi"],
  tm_tom: ["morgen", "tomorrow", "yarın", "завтра", "завтра", "jutro", "غدًا", "mâine"],
  tm_past: ["vorbei", "past", "geçti", "прошло", "минуло", "minęło", "انتهى", "trecut"],
  tm_days: [
    "in {n} Tagen",
    "in {n} days",
    "{n} gün sonra",
    "через {n} дн.",
    "через {n} дн.",
    "za {n} dni",
    "بعد {n} أيام",
    "în {n} zile",
  ],
  tm_day1: ["Tag", "day", "gün", "день", "день", "dzień", "يوم", "zi"],
  tm_daysw: ["Tage", "days", "gün", "дн.", "дн.", "dni", "أيام", "zile"],
  tm_edit: ["Bearbeiten", "Edit", "Düzenle", "Изменить", "Редагувати", "Edytuj", "تعديل", "Editează"],
  tm_mami0: [
    "Heute ist dein Termin{t} – du schaffst das, {a}! Hast du alles dabei? 💚",
    "Your appointment is today{t} – you’ve got this, {a}! Got everything? 💚",
    "Randevun bugün{t} – başaracaksın {a}! Her şey yanında mı? 💚",
    "Сегодня твоя встреча{t} – ты справишься, {a}! Всё взял? 💚",
    "Сьогодні твоя зустріч{t} – ти впораєшся, {a}! Усе взяв? 💚",
    "Dziś twoja wizyta{t} – dasz radę, {a}! Masz wszystko? 💚",
    "موعدك اليوم{t} – ستنجح يا {a}! هل معك كل شيء؟ 💚",
    "Azi ai programarea{t} – reușești, {a}! Ai tot ce trebuie? 💚",
  ],
  tm_mami1: [
    "Morgen ist dein Termin{t}, {a}. Pack heute schon alles ein! 🎒",
    "Your appointment is tomorrow{t}, {a}. Pack everything today! 🎒",
    "Randevun yarın{t}, {a}. Her şeyi bugünden hazırla! 🎒",
    "Завтра твоя встреча{t}, {a}. Собери всё уже сегодня! 🎒",
    "Завтра твоя зустріч{t}, {a}. Збери все вже сьогодні! 🎒",
    "Jutro twoja wizyta{t}, {a}. Spakuj wszystko już dziś! 🎒",
    "موعدك غدًا{t} يا {a}. جهّز كل شيء اليوم! 🎒",
    "Mâine ai programarea{t}, {a}. Pregătește totul de azi! 🎒",
  ],
  tm_bring: [
    "Mitnehmen",
    "Bring along",
    "Yanına al",
    "Взять с собой",
    "Взяти з собою",
    "Zabierz ze sobą",
    "أحضر معك",
    "De luat",
  ],
  tm_b_id: [
    "Personalausweis",
    "ID card",
    "Kimlik kartı",
    "Удостоверение личности",
    "Посвідчення особи",
    "Dowód osobisty",
    "بطاقة الهوية",
    "Buletin",
  ],
  tm_b_inv: [
    "Einladungsschreiben",
    "Invitation letter",
    "Davet mektubu",
    "Письмо-приглашение",
    "Лист-запрошення",
    "Zaproszenie",
    "خطاب الدعوة",
    "Scrisoarea de invitație",
  ],
  tm_b_bw: [
    "Bewerbungsnachweise",
    "Proof of applications",
    "Başvuru kanıtları",
    "Подтверждения заявок",
    "Підтвердження заявок",
    "Potwierdzenia aplikacji",
    "إثباتات التقديم",
    "Dovezi ale candidaturilor",
  ],
  tm_b_docs: [
    "Unterlagen vollständig",
    "Documents complete",
    "Belgeler tamam",
    "Документы готовы",
    "Документи готові",
    "Dokumenty kompletne",
    "المستندات مكتملة",
    "Documente complete",
  ],
  tm_b_more: [
    "Noch etwas mitnehmen …",
    "Something else …",
    "Başka bir şey …",
    "Что-то ещё …",
    "Ще щось …",
    "Coś jeszcze …",
    "شيء آخر …",
    "Altceva …",
  ],
  tm_was: [
    "Ich war da – Nachweis speichern",
    "I was there – save proof",
    "Oradaydım – kanıtı kaydet",
    "Я был там – сохранить подтверждение",
    "Я був там – зберегти підтвердження",
    "Byłem – zapisz potwierdzenie",
    "حضرت – احفظ الإثبات",
    "Am fost – salvează dovada",
  ],
  tm_donef: [
    "Erledigt – abhaken",
    "Done – tick off",
    "Tamam – işaretle",
    "Готово – отметить",
    "Готово – відмітити",
    "Zrobione – odhacz",
    "تم – علّم",
    "Gata – bifează",
  ],
  tm_later: [
    "Am Termin-Tag kannst du hier abhaken, dass du da warst.",
    "On the day you can tick off here that you were there.",
    "Randevu günü burada orada olduğunu işaretleyebilirsin.",
    "В день встречи здесь можно отметить, что ты был.",
    "У день зустрічі тут можна відмітити, що ти був.",
    "W dniu wizyty możesz tu odhaczyć, że byłeś.",
    "في يوم الموعد يمكنك هنا تأكيد حضورك.",
    "În ziua programării poți bifa aici că ai fost.",
  ],
  tm_none: [
    "Kein Termin offen",
    "No open appointments",
    "Açık randevu yok",
    "Нет открытых встреч",
    "Немає відкритих зустрічей",
    "Brak otwartych terminów",
    "لا مواعيد مفتوحة",
    "Nicio programare deschisă",
  ],
  tm_none_s: [
    "Alles erledigt",
    "All done",
    "Hepsi tamam",
    "Всё сделано",
    "Усе зроблено",
    "Wszystko załatwione",
    "تم كل شيء",
    "Totul e gata",
  ],
  tm_after: ["Danach", "Coming up", "Sonra", "Далее", "Далі", "Potem", "لاحقًا", "Urmează"],
  tm_new: [
    "Termin oder Frist",
    "Appointment or deadline",
    "Randevu veya süre",
    "Встреча или срок",
    "Зустріч або термін",
    "Termin lub wizyta",
    "موعد أو مهلة",
    "Programare sau termen",
  ],
  tm_done: ["Erledigt", "Done", "Tamamlandı", "Выполнено", "Виконано", "Załatwione", "منجز", "Gata"],
  tm_at: ["um {t}", "at {t}", "saat {t}", "в {t}", "о {t}", "o {t}", "الساعة {t}", "la {t}"],
  tm_proof: [
    "Nachweis ansehen",
    "View proof",
    "Kanıtı gör",
    "Посмотреть подтверждение",
    "Переглянути підтвердження",
    "Zobacz potwierdzenie",
    "عرض الإثبات",
    "Vezi dovada",
  ],
  tm_photo: ["Foto", "Photo", "Fotoğraf", "Фото", "Фото", "Zdjęcie", "صورة", "Fotografie"],
  tm_undo: [
    "Wieder öffnen",
    "Reopen",
    "Yeniden aç",
    "Открыть снова",
    "Відкрити знову",
    "Otwórz ponownie",
    "إعادة فتح",
    "Redeschide",
  ],
  tm_hint: [
    "Tipp: Wer einen Termin beim {a} verpasst, dem kann die Leistung gekürzt werden. Kannst du nicht kommen, sag vorher Bescheid.",
    "Tip: missing an appointment with the {a} can lead to cuts. If you can’t come, let them know beforehand.",
    "İpucu: {a} randevusunu kaçırırsan ödemen kesilebilir. Gelemezsen önceden haber ver.",
    "Совет: за пропущенную встречу в {a} пособие могут урезать. Если не можешь прийти, предупреди заранее.",
    "Порада: за пропущену зустріч у {a} допомогу можуть урізати. Якщо не можеш прийти, попередь заздалегідь.",
    "Wskazówka: za opuszczoną wizytę w {a} świadczenie może zostać obniżone. Jeśli nie możesz przyjść, uprzedź wcześniej.",
    "نصيحة: قد تُخفَّض الإعانة إذا فاتك موعد في {a}. إن لم تستطع الحضور فأبلغهم مسبقًا.",
    "Sfat: dacă ratezi o programare la {a}, ți se poate tăia ajutorul. Dacă nu poți veni, anunță dinainte.",
  ],
  tm_what: ["Was?", "What?", "Ne?", "Что?", "Що?", "Co?", "ماذا؟", "Ce?"],
  tm_date: ["Datum", "Date", "Tarih", "Дата", "Дата", "Data", "التاريخ", "Data"],
  tm_time: ["Uhrzeit", "Time", "Saat", "Время", "Час", "Godzina", "الوقت", "Ora"],
  tm_place: [
    "Wo? (optional)",
    "Where? (optional)",
    "Nerede? (isteğe bağlı)",
    "Где? (необязательно)",
    "Де? (необов’язково)",
    "Gdzie? (opcjonalnie)",
    "أين؟ (اختياري)",
    "Unde? (opțional)",
  ],
  tm_place_p: [
    "z. B. Zimmer 214",
    "e.g. room 214",
    "ör. oda 214",
    "напр. кабинет 214",
    "напр. кабінет 214",
    "np. pokój 214",
    "مثلًا غرفة 214",
    "ex. camera 214",
  ],
  tm_k_t: ["Termin", "Appointment", "Randevu", "Встреча", "Зустріч", "Wizyta", "موعد", "Programare"],
  tm_k_f: ["Frist", "Deadline", "Süre", "Срок", "Термін", "Termin", "مهلة", "Termen"],
  tm_del: ["Löschen", "Delete", "Sil", "Удалить", "Видалити", "Usuń", "حذف", "Șterge"],
  tm_cancel: ["Abbrechen", "Cancel", "İptal", "Отмена", "Скасувати", "Anuluj", "إلغاء", "Anulează"],
  tm_save: ["Speichern", "Save", "Kaydet", "Сохранить", "Зберегти", "Zapisz", "حفظ", "Salvează"],
  tm_need: [
    "Bitte Name und Datum eintragen",
    "Please enter name and date",
    "Lütfen ad ve tarih gir",
    "Укажи название и дату",
    "Вкажи назву й дату",
    "Wpisz nazwę i datę",
    "أدخل الاسم والتاريخ",
    "Introdu numele și data",
  ],
  tm_ok: [
    "Eingetragen – ich erinnere dich",
    "Saved – I’ll remind you",
    "Kaydedildi – sana hatırlatırım",
    "Сохранено – я напомню",
    "Збережено – я нагадаю",
    "Zapisane – przypomnę ci",
    "تم الحفظ – سأذكّرك",
    "Salvat – îți amintesc",
  ],
  tm_saved: [
    "Abgehakt! Willst du ein Foto als Nachweis?",
    "Ticked off! Want a photo as proof?",
    "İşaretlendi! Kanıt olarak fotoğraf ister misin?",
    "Отмечено! Сделать фото как подтверждение?",
    "Відмічено! Зробити фото як підтвердження?",
    "Odhaczone! Zrobić zdjęcie jako dowód?",
    "تم! هل تريد صورة كإثبات؟",
    "Bifat! Vrei o fotografie ca dovadă?",
  ],
  tm_proof_ok: [
    "Nachweis gespeichert",
    "Proof saved",
    "Kanıt kaydedildi",
    "Подтверждение сохранено",
    "Підтвердження збережено",
    "Dowód zapisany",
    "تم حفظ الإثبات",
    "Dovada a fost salvată",
  ],
  tm_proof_err: [
    "Foto konnte nicht gespeichert werden",
    "Couldn’t save photo",
    "Fotoğraf kaydedilemedi",
    "Не удалось сохранить фото",
    "Не вдалося зберегти фото",
    "Nie udało się zapisać zdjęcia",
    "تعذّر حفظ الصورة",
    "Fotografia nu a putut fi salvată",
  ],
  tm_h_t: [
    "Pack Ausweis und Einladung ein – und sei pünktlich.",
    "Pack ID and invitation – and be on time.",
    "Kimliğini ve davetini al – ve dakik ol.",
    "Возьми удостоверение и приглашение – и приходи вовремя.",
    "Візьми посвідчення й запрошення – і прийди вчасно.",
    "Weź dowód i zaproszenie – i bądź punktualnie.",
    "خذ الهوية والدعوة – وكن في الموعد.",
    "Ia buletinul și invitația – și fii punctual.",
  ],
  tm_h_f: [
    "Gib die Unterlagen rechtzeitig ab.",
    "Hand in the documents on time.",
    "Belgeleri zamanında teslim et.",
    "Сдай документы вовремя.",
    "Здай документи вчасно.",
    "Złóż dokumenty na czas.",
    "سلّم المستندات في الوقت.",
    "Predă documentele la timp.",
  ],
  zv_title: [
    "Zuverdienst-Rechner",
    "Side income calculator",
    "Ek gelir hesaplayıcı",
    "Калькулятор подработки",
    "Калькулятор підробітку",
    "Kalkulator dorabiania",
    "حاسبة الدخل الإضافي",
    "Calculator venit suplimentar",
  ],
  zv_gross: [
    "Dein Brutto-Lohn im Monat",
    "Your gross pay per month",
    "Aylık brüt maaşın",
    "Твоя зарплата брутто в месяц",
    "Твоя зарплата брутто на місяць",
    "Twoja pensja brutto miesięcznie",
    "راتبك الإجمالي شهريًا",
    "Salariul tău brut lunar",
  ],
  zv_mj: [
    "Minijob {n}",
    "Mini-job {n}",
    "Mini iş {n}",
    "Миниджоб {n}",
    "Мініджоб {n}",
    "Minijob {n}",
    "وظيفة صغيرة {n}",
    "Minijob {n}",
  ],
  zv_exact: ["Genau (€)", "Exact (€)", "Tam (€)", "Точно (€)", "Точно (€)", "Dokładnie (€)", "بالضبط (€)", "Exact (€)"],
  zv_hours: [
    "Std. pro Woche",
    "Hours per week",
    "Haftalık saat",
    "Часов в неделю",
    "Годин на тиждень",
    "Godzin tygodniowo",
    "ساعات أسبوعيًا",
    "Ore pe săptămână",
  ],
  zv_hours_p: [
    "optional",
    "optional",
    "isteğe bağlı",
    "необязательно",
    "необов’язково",
    "opcjonalnie",
    "اختياري",
    "opțional",
  ],
  zv_keep: [
    "Du behältst",
    "You keep",
    "Sende kalan",
    "Тебе остаётся",
    "Тобі залишається",
    "Zostaje ci",
    "يبقى لك",
    "Îți rămân",
  ],
  zv_after: [
    "{a} danach",
    "{a} afterwards",
    "Sonrasında {a}",
    "{a} после",
    "{a} після",
    "{a} potem",
    "{a} بعد ذلك",
    "{a} după",
  ],
  zv_before: [
    "vorher {n}",
    "before {n}",
    "önce {n}",
    "до этого {n}",
    "до цього {n}",
    "wcześniej {n}",
    "قبل ذلك {n}",
    "înainte {n}",
  ],
  zv_total: [
    "Insgesamt im Monat",
    "Total per month",
    "Aylık toplam",
    "Всего в месяц",
    "Усього на місяць",
    "Łącznie miesięcznie",
    "المجموع شهريًا",
    "Total pe lună",
  ],
  zv_tot_s: [
    "statt {n} ohne Job · ≈ {h} pro Stunde extra",
    "instead of {n} without a job · ≈ {h} extra per hour",
    "işsiz {n} yerine · saat başı ≈ {h} ekstra",
    "вместо {n} без работы · ≈ {h} в час сверху",
    "замість {n} без роботи · ≈ {h} на годину зверху",
    "zamiast {n} bez pracy · ≈ {h} więcej za godzinę",
    "بدل {n} بدون عمل · ≈ {h} إضافية بالساعة",
    "în loc de {n} fără job · ≈ {h} în plus pe oră",
  ],
  zv_tot_0: [
    "Schieb den Regler – ich rechne mit",
    "Move the slider – I’ll calculate",
    "Kaydırıcıyı oynat – ben hesaplarım",
    "Двигай ползунок – я посчитаю",
    "Рухай повзунок – я порахую",
    "Przesuń suwak – policzę",
    "حرّك المؤشر – وسأحسب",
    "Mută cursorul – calculez eu",
  ],
  zv_move: [
    "Regler schieben",
    "Move the slider",
    "Kaydırıcıyı oynat",
    "Двигай ползунок",
    "Рухай повзунок",
    "Przesuń suwak",
    "حرّك المؤشر",
    "Mută cursorul",
  ],
  zv_ded: [
    "{n} angerechnet",
    "{n} deducted",
    "{n} mahsup edilir",
    "{n} засчитывается",
    "{n} зараховується",
    "{n} odliczone",
    "يُخصم {n}",
    "{n} se scad",
  ],
  zv_none: [
    "noch kein Lohn",
    "no pay yet",
    "henüz maaş yok",
    "пока нет зарплаты",
    "поки немає зарплати",
    "brak pensji",
    "لا راتب بعد",
    "încă niciun salariu",
  ],
  zv_p_free: ["{n} frei", "{n} free", "{n} muaf", "{n} свободно", "{n} вільно", "{n} wolne", "{n} معفاة", "{n} liberi"],
  zv_p_pct: [
    "{p} % von {n}",
    "{p} % of {n}",
    "{n} tutarının %{p}'i",
    "{p} % от {n}",
    "{p} % від {n}",
    "{p} % z {n}",
    "{p} ٪ من {n}",
    "{p} % din {n}",
  ],
  zv_alg_free: [
    "{n} im Monat frei",
    "{n} per month free",
    "Ayda {n} muaf",
    "{n} в месяц свободно",
    "{n} на місяць вільно",
    "{n} miesięcznie wolne",
    "{n} شهريًا معفاة",
    "{n} pe lună liberi",
  ],
  zv_noamt: [
    "Trag ein, wie viel du vom Amt bekommst – dann stimmt die Summe.",
    "Enter how much you get from the office – then the total is right.",
    "Dairenden ne kadar aldığını gir – toplam doğru olsun.",
    "Укажи, сколько получаешь от ведомства – тогда сумма будет точной.",
    "Вкажи, скільки отримуєш від установи – тоді сума буде точною.",
    "Wpisz, ile dostajesz z urzędu – wtedy suma się zgodzi.",
    "أدخل ما تحصل عليه من الجهة – ليصح المجموع.",
    "Introdu cât primești de la instituție – ca totalul să fie corect.",
  ],
  zv_set: ["Eintragen", "Enter", "Gir", "Указать", "Вказати", "Wpisz", "أدخل", "Introdu"],
  zv_15: [
    "15 Stunden pro Woche erreicht",
    "15 hours a week reached",
    "Haftada 15 saate ulaşıldı",
    "Достигнуто 15 часов в неделю",
    "Досягнуто 15 годин на тиждень",
    "Osiągnięto 15 godzin tygodniowo",
    "تم بلوغ 15 ساعة أسبوعيًا",
    "15 ore pe săptămână atinse",
  ],
  zv_15_s: [
    "Ab 15 Stunden gilt man nicht mehr als arbeitslos – das Arbeitslosengeld kann ganz wegfallen.",
    "From 15 hours you no longer count as unemployed – the benefit may stop completely.",
    "15 saatten itibaren işsiz sayılmazsın – işsizlik parası tamamen kesilebilir.",
    "С 15 часов ты больше не считаешься безработным – пособие может полностью прекратиться.",
    "Від 15 годин ти вже не вважаєшся безробітним – допомога може повністю припинитися.",
    "Od 15 godzin nie jesteś już bezrobotny – zasiłek może zostać wstrzymany.",
    "من 15 ساعة لا تُعتبر عاطلًا – وقد تتوقف الإعانة كليًا.",
    "De la 15 ore nu mai ești considerat șomer – ajutorul poate înceta complet.",
  ],
  zv_svp: [
    "Über der Minijob-Grenze",
    "Above the mini-job limit",
    "Mini iş sınırının üzerinde",
    "Выше лимита миниджоба",
    "Вище ліміту мініджоба",
    "Powyżej limitu minijobu",
    "فوق حد الوظيفة الصغيرة",
    "Peste limita de minijob",
  ],
  zv_svp_s: [
    "Ab hier zahlst du Sozialabgaben – rechne mit etwas weniger Netto.",
    "From here you pay social contributions – expect a bit less net.",
    "Buradan itibaren sosyal kesinti ödersin – neti biraz daha az hesapla.",
    "Отсюда платятся соцвзносы – нетто будет чуть меньше.",
    "Звідси сплачуються соцвнески – нетто буде трохи менше.",
    "Od tego progu płacisz składki – netto będzie trochę mniej.",
    "من هنا تدفع اشتراكات اجتماعية – توقع صافيًا أقل قليلًا.",
    "De aici plătești contribuții – net vei avea puțin mai puțin.",
  ],
  zv_note_gs: [
    "Grundsicherung: 100 € sind frei, darüber bleiben 20 % (bis 520 €), 30 % (bis 1.000 €) und 10 % (bis 1.200 €, mit Kind 1.500 €). Ohne Gewähr – im Zweifel beim Jobcenter fragen.",
    "Basic income support: 100 € free, then 20 % (up to 520 €), 30 % (up to 1,000 €) and 10 % (up to 1,200 €, with child 1,500 €). No guarantee – ask the job centre if unsure.",
    "Temel güvence: 100 € muaf, sonra %20 (520 €'ya kadar), %30 (1.000 €'ya kadar), %10 (1.200 €'ya kadar, çocukla 1.500 €). Garanti yok – emin değilsen Jobcenter'a sor.",
    "Базовое пособие: 100 € свободны, далее 20 % (до 520 €), 30 % (до 1000 €) и 10 % (до 1200 €, с ребёнком 1500 €). Без гарантии – уточни в Jobcenter.",
    "Базова допомога: 100 € вільні, далі 20 % (до 520 €), 30 % (до 1000 €) і 10 % (до 1200 €, з дитиною 1500 €). Без гарантії – уточни в Jobcenter.",
    "Zasiłek podstawowy: 100 € wolne, potem 20 % (do 520 €), 30 % (do 1000 €) i 10 % (do 1200 €, z dzieckiem 1500 €). Bez gwarancji – w razie wątpliwości zapytaj w Jobcenter.",
    "الإعانة الأساسية: 100 € معفاة، ثم 20 ٪ (حتى 520 €) و30 ٪ (حتى 1000 €) و10 ٪ (حتى 1200 €، مع طفل 1500 €). دون ضمان – اسأل مركز العمل عند الشك.",
    "Ajutor de bază: 100 € liberi, apoi 20 % (până la 520 €), 30 % (până la 1.000 €) și 10 % (până la 1.200 €, cu copil 1.500 €). Fără garanție – întreabă la Jobcenter.",
  ],
  zv_note_alg: [
    "Arbeitslosengeld: 165 € Nebenverdienst im Monat sind frei, höchstens unter 15 Stunden pro Woche. Ohne Gewähr – im Zweifel beim Arbeitsamt fragen.",
    "Unemployment benefit: 165 € side income per month is free, under 15 hours a week. No guarantee – ask the agency if unsure.",
    "İşsizlik parası: ayda 165 € ek gelir muaf, haftada 15 saatin altında. Garanti yok – emin değilsen İş Ajansı'na sor.",
    "Пособие по безработице: 165 € подработки в месяц свободны, меньше 15 часов в неделю. Без гарантии – уточни в агентстве.",
    "Допомога з безробіття: 165 € підробітку на місяць вільні, менше 15 годин на тиждень. Без гарантії – уточни в агентстві.",
    "Zasiłek: 165 € dorobku miesięcznie wolne, poniżej 15 godzin tygodniowo. Bez gwarancji – zapytaj w urzędzie.",
    "إعانة البطالة: 165 € دخل إضافي شهريًا معفاة، أقل من 15 ساعة أسبوعيًا. دون ضمان – اسأل الوكالة عند الشك.",
    "Ajutor de șomaj: 165 € venit suplimentar pe lună liberi, sub 15 ore pe săptămână. Fără garanție – întreabă la agenție.",
  ],
  bs_title: [
    "Bescheid-Check",
    "Notice check",
    "Karar kontrolü",
    "Проверка решения",
    "Перевірка рішення",
    "Sprawdzenie decyzji",
    "فحص القرار",
    "Verificare decizie",
  ],
  bs_cur: [
    "Aktuell bewilligt",
    "Currently granted",
    "Şu an onaylı",
    "Сейчас назначено",
    "Зараз призначено",
    "Obecnie przyznane",
    "المعتمد حاليًا",
    "Aprobat acum",
  ],
  bs_month: ["Monat", "month", "ay", "мес.", "міс.", "mies.", "شهر", "lună"],
  bs_until: ["bis {d}", "until {d}", "{d} tarihine kadar", "до {d}", "до {d}", "do {d}", "حتى {d}", "până la {d}"],
  bs_intro: [
    "Bescheid bekommen?",
    "Got a notice?",
    "Karar mı geldi?",
    "Пришло решение?",
    "Прийшло рішення?",
    "Dostałeś decyzję?",
    "وصلك قرار؟",
    "Ai primit o decizie?",
  ],
  bs_intro_s: [
    "Fotografier ihn – ich lese die Zahlen, prüfe sie und merke mir die Fristen.",
    "Take a photo – I’ll read the numbers, check them and remember the deadlines.",
    "Fotoğrafını çek – rakamları okur, kontrol eder ve süreleri hatırlarım.",
    "Сфотографируй – я прочитаю цифры, проверю их и запомню сроки.",
    "Сфотографуй – я прочитаю цифри, перевірю їх і запам’ятаю терміни.",
    "Zrób zdjęcie – odczytam liczby, sprawdzę je i zapamiętam terminy.",
    "صوّره – سأقرأ الأرقام وأتحقق منها وأتذكر المهل.",
    "Fotografiaz-o – citesc cifrele, le verific și rețin termenele.",
  ],
  bs_photo: [
    "Fotografieren",
    "Take photo",
    "Fotoğraf çek",
    "Сфотографировать",
    "Сфотографувати",
    "Zrób zdjęcie",
    "التقاط صورة",
    "Fotografiază",
  ],
  bs_file: [
    "Bild wählen",
    "Choose image",
    "Görsel seç",
    "Выбрать фото",
    "Вибрати фото",
    "Wybierz obraz",
    "اختر صورة",
    "Alege imagine",
  ],
  bs_manual: [
    "Ohne Foto eintragen",
    "Enter without photo",
    "Fotoğrafsız gir",
    "Ввести без фото",
    "Ввести без фото",
    "Wpisz bez zdjęcia",
    "أدخل دون صورة",
    "Introdu fără foto",
  ],
  bs_all: [
    "Deine Bescheide",
    "Your notices",
    "Kararların",
    "Твои решения",
    "Твої рішення",
    "Twoje decyzje",
    "قراراتك",
    "Deciziile tale",
  ],
  bs_w_badge: [
    "Widerspruch {n} T.",
    "Appeal {n} d",
    "İtiraz {n} g",
    "Возражение {n} дн.",
    "Заперечення {n} дн.",
    "Odwołanie {n} dni",
    "اعتراض {n} ي",
    "Contestație {n} z",
  ],
  bs_priv: [
    "Das Foto wird nur auf deinem Gerät gelesen und gespeichert.",
    "The photo is read and stored only on your device.",
    "Fotoğraf yalnızca cihazında okunur ve saklanır.",
    "Фото читается и хранится только на твоём устройстве.",
    "Фото читається й зберігається лише на твоєму пристрої.",
    "Zdjęcie jest odczytywane i zapisywane tylko na twoim urządzeniu.",
    "تُقرأ الصورة وتُحفظ على جهازك فقط.",
    "Fotografia e citită și salvată doar pe dispozitivul tău.",
  ],
  bs_reading: [
    "Ich lese deinen Bescheid …",
    "Reading your notice …",
    "Kararını okuyorum …",
    "Читаю твоё решение …",
    "Читаю твоє рішення …",
    "Czytam twoją decyzję …",
    "أقرأ قرارك …",
    "Citesc decizia ta …",
  ],
  bs_found: [
    "Erkannt – bitte prüfen",
    "Recognized – please check",
    "Tanındı – lütfen kontrol et",
    "Распознано – проверь",
    "Розпізнано – перевір",
    "Rozpoznano – sprawdź",
    "تم التعرف – يرجى التحقق",
    "Recunoscut – verifică te rog",
  ],
  bs_nothing: [
    "Ich konnte nichts sicher lesen",
    "I couldn’t read anything reliably",
    "Hiçbir şeyi net okuyamadım",
    "Не удалось уверенно ничего прочитать",
    "Не вдалося впевнено нічого прочитати",
    "Nie udało się nic pewnie odczytać",
    "لم أتمكن من قراءة شيء بوضوح",
    "N-am putut citi nimic sigur",
  ],
  bs_nothing_s: [
    "Kein Problem – trag die Werte unten einfach selbst ein.",
    "No problem – just enter the values below yourself.",
    "Sorun değil – değerleri aşağıya kendin gir.",
    "Не страшно – просто введи значения ниже сам.",
    "Не страшно – просто введи значення нижче сам.",
    "Nie szkodzi – wpisz wartości poniżej samodzielnie.",
    "لا مشكلة – أدخل القيم أدناه بنفسك.",
    "Nicio problemă – introdu valorile mai jos.",
  ],
  bs_check: [
    "Werte prüfen & bearbeiten",
    "Check & edit values",
    "Değerleri kontrol et ve düzenle",
    "Проверить и изменить",
    "Перевірити та змінити",
    "Sprawdź i edytuj",
    "تحقق وعدّل القيم",
    "Verifică și editează",
  ],
  bs_kind: ["Art", "Type", "Tür", "Вид", "Вид", "Rodzaj", "النوع", "Tip"],
  bs_k_b: ["Bewilligung", "Approval", "Onay", "Назначение", "Призначення", "Przyznanie", "موافقة", "Aprobare"],
  bs_k_a: [
    "Änderungsbescheid",
    "Change notice",
    "Değişiklik kararı",
    "Изменение",
    "Зміна",
    "Decyzja zmieniająca",
    "قرار تعديل",
    "Decizie de modificare",
  ],
  bs_k_ab: ["Ablehnung", "Rejection", "Ret", "Отказ", "Відмова", "Odmowa", "رفض", "Respingere"],
  bs_f_from: [
    "Zeitraum von",
    "Period from",
    "Dönem başı",
    "Период с",
    "Період з",
    "Okres od",
    "الفترة من",
    "Perioada de la",
  ],
  bs_f_to: ["bis", "to", "bitiş", "по", "по", "do", "إلى", "până la"],
  bs_f_regel: [
    "Regelbedarf",
    "Standard rate",
    "Standart ihtiyaç",
    "Стандартная ставка",
    "Стандартна ставка",
    "Stawka podstawowa",
    "الاحتياج الأساسي",
    "Necesar standard",
  ],
  bs_f_kdu: [
    "Miete / Unterkunft",
    "Rent / housing",
    "Kira / konut",
    "Аренда / жильё",
    "Оренда / житло",
    "Czynsz / mieszkanie",
    "الإيجار / السكن",
    "Chirie / locuință",
  ],
  bs_f_heiz: ["Heizung", "Heating", "Isınma", "Отопление", "Опалення", "Ogrzewanie", "التدفئة", "Încălzire"],
  bs_f_mehr: [
    "Mehrbedarf",
    "Additional needs",
    "Ek ihtiyaç",
    "Доп. потребность",
    "Дод. потреба",
    "Dodatkowe potrzeby",
    "احتياج إضافي",
    "Necesar suplimentar",
  ],
  bs_f_ek: [
    "Einkommen angerechnet",
    "Income deducted",
    "Mahsup edilen gelir",
    "Засчитанный доход",
    "Зарахований дохід",
    "Odliczony dochód",
    "الدخل المخصوم",
    "Venit scăzut",
  ],
  bs_f_total: [
    "Zahlbetrag pro Monat",
    "Payment per month",
    "Aylık ödeme",
    "Выплата в месяц",
    "Виплата на місяць",
    "Wypłata miesięcznie",
    "المبلغ الشهري",
    "Plată pe lună",
  ],
  bs_f_date: [
    "Bescheid vom",
    "Notice dated",
    "Karar tarihi",
    "Решение от",
    "Рішення від",
    "Decyzja z dnia",
    "تاريخ القرار",
    "Decizie din",
  ],
  bs_date_s: [
    "Daraus rechne ich die Widerspruchsfrist aus.",
    "I use this to work out the appeal deadline.",
    "İtiraz süresini buradan hesaplarım.",
    "По ней я посчитаю срок возражения.",
    "За нею я порахую строк заперечення.",
    "Na tej podstawie policzę termin odwołania.",
    "منه أحسب مهلة الاعتراض.",
    "Din ea calculez termenul de contestație.",
  ],
  bs_use: [
    "Als meinen monatlichen Betrag übernehmen",
    "Use as my monthly amount",
    "Aylık tutarım olarak kullan",
    "Взять как ежемесячную сумму",
    "Взяти як щомісячну суму",
    "Ustaw jako moją miesięczną kwotę",
    "استخدمه كمبلغي الشهري",
    "Folosește ca suma mea lunară",
  ],
  bs_terms: [
    "Fristen in meine Termine eintragen",
    "Add deadlines to my appointments",
    "Süreleri randevularıma ekle",
    "Добавить сроки в мои встречи",
    "Додати терміни до моїх зустрічей",
    "Dodaj terminy do moich wizyt",
    "أضف المهل إلى مواعيدي",
    "Adaugă termenele în programări",
  ],
  bs_checks: [
    "Mein Check",
    "My check",
    "Kontrolüm",
    "Моя проверка",
    "Моя перевірка",
    "Moje sprawdzenie",
    "فحصي",
    "Verificarea mea",
  ],
  bs_w: [
    "Widerspruch möglich bis {d}",
    "Appeal possible until {d}",
    "{d} tarihine kadar itiraz edilebilir",
    "Возражение возможно до {d}",
    "Заперечення можливе до {d}",
    "Odwołanie możliwe do {d}",
    "يمكن الاعتراض حتى {d}",
    "Contestație posibilă până la {d}",
  ],
  bs_w_s: [
    "noch {n} Tage · 1 Monat nach Zugang",
    "{n} days left · 1 month after receipt",
    "{n} gün kaldı · tebliğden 1 ay sonra",
    "ещё {n} дн. · 1 месяц после получения",
    "ще {n} дн. · 1 місяць після отримання",
    "jeszcze {n} dni · 1 miesiąc od doręczenia",
    "باقي {n} يوم · شهر بعد الاستلام",
    "mai sunt {n} zile · 1 lună de la primire",
  ],
  bs_w_over: [
    "Widerspruchsfrist ist vorbei",
    "Appeal period is over",
    "İtiraz süresi geçti",
    "Срок возражения истёк",
    "Строк заперечення минув",
    "Termin odwołania minął",
    "انتهت مهلة الاعتراض",
    "Termenul de contestație a expirat",
  ],
  bs_rent: [
    "Miete {a} angesetzt – du zahlst {b}",
    "Rent set at {a} – you pay {b}",
    "Kira {a} olarak alınmış – sen {b} ödüyorsun",
    "Аренда учтена как {a} – ты платишь {b}",
    "Оренду враховано як {a} – ти платиш {b}",
    "Czynsz przyjęto {a} – płacisz {b}",
    "احتُسب الإيجار {a} – وأنت تدفع {b}",
    "Chiria luată în calcul {a} – plătești {b}",
  ],
  bs_rent_s: [
    "Vielleicht lohnt sich eine Nachfrage beim Amt.",
    "Maybe ask the office about it.",
    "Belki daireye sormaya değer.",
    "Возможно, стоит уточнить в ведомстве.",
    "Можливо, варто уточнити в установі.",
    "Może warto zapytać w urzędzie.",
    "ربما يستحق الأمر السؤال لدى الجهة.",
    "Poate merită să întrebi la instituție.",
  ],
  bs_ek_ok: [
    "Einkommen {n} angerechnet – passt zum Zuverdienst-Rechner",
    "Income {n} deducted – matches the calculator",
    "Gelir {n} mahsup – hesaplayıcıyla uyumlu",
    "Засчитано {n} дохода – совпадает с калькулятором",
    "Зараховано {n} доходу – збігається з калькулятором",
    "Odliczono {n} – zgadza się z kalkulatorem",
    "خُصم دخل {n} – يطابق الحاسبة",
    "Venit {n} scăzut – se potrivește cu calculatorul",
  ],
  bs_ek_diff: [
    "{a} angerechnet – laut Rechner wären es {b}",
    "{a} deducted – calculator says {b}",
    "{a} mahsup – hesaplayıcıya göre {b}",
    "Засчитано {a} – по калькулятору {b}",
    "Зараховано {a} – за калькулятором {b}",
    "Odliczono {a} – według kalkulatora {b}",
    "خُصم {a} – والحاسبة تقول {b}",
    "{a} scăzut – calculatorul zice {b}",
  ],
  bs_ek_s: [
    "Das kann an Fahrtkosten oder anderen Freibeträgen liegen.",
    "This can be due to travel costs or other allowances.",
    "Bu yol masrafları veya başka muafiyetlerden olabilir.",
    "Это может быть из-за проезда или других вычетов.",
    "Це може бути через проїзд чи інші пільги.",
    "Może to wynikać z kosztów dojazdu lub innych ulg.",
    "قد يكون ذلك بسبب تكاليف التنقل أو إعفاءات أخرى.",
    "Poate fi din cauza transportului sau altor deduceri.",
  ],
  bs_sum: [
    "Summe {a} ≠ Zahlbetrag {b}",
    "Sum {a} ≠ payment {b}",
    "Toplam {a} ≠ ödeme {b}",
    "Сумма {a} ≠ выплата {b}",
    "Сума {a} ≠ виплата {b}",
    "Suma {a} ≠ wypłata {b}",
    "المجموع {a} ≠ المبلغ {b}",
    "Suma {a} ≠ plata {b}",
  ],
  bs_sum_s: [
    "Prüf die Werte – vielleicht wurde etwas falsch gelesen.",
    "Check the values – something may have been misread.",
    "Değerleri kontrol et – bir şey yanlış okunmuş olabilir.",
    "Проверь значения – возможно, что-то прочитано неверно.",
    "Перевір значення – можливо, щось прочитано неправильно.",
    "Sprawdź wartości – coś mogło zostać źle odczytane.",
    "تحقق من القيم – ربما قُرئ شيء خطأ.",
    "Verifică valorile – poate ceva a fost citit greșit.",
  ],
  bs_wb: [
    "Weiterbewilligung ab {d} beantragen",
    "Apply for continuation from {d}",
    "{d} tarihinden itibaren devam başvurusu yap",
    "Подать на продление с {d}",
    "Подати на продовження з {d}",
    "Złóż wniosek o kontynuację od {d}",
    "قدّم طلب التمديد من {d}",
    "Cere prelungirea de la {d}",
  ],
  bs_wb_s: [
    "Bewilligung endet am {d}",
    "Approval ends on {d}",
    "Onay {d} tarihinde biter",
    "Назначение заканчивается {d}",
    "Призначення закінчується {d}",
    "Przyznanie kończy się {d}",
    "تنتهي الموافقة في {d}",
    "Aprobarea expiră pe {d}",
  ],
  bs_save: ["Speichern", "Save", "Kaydet", "Сохранить", "Зберегти", "Zapisz", "حفظ", "Salvează"],
  bs_saved: [
    "Bescheid gespeichert – Fristen eingetragen",
    "Notice saved – deadlines added",
    "Karar kaydedildi – süreler eklendi",
    "Решение сохранено – сроки добавлены",
    "Рішення збережено – терміни додано",
    "Decyzja zapisana – terminy dodane",
    "تم حفظ القرار – وأضيفت المهل",
    "Decizie salvată – termene adăugate",
  ],
  bs_need: [
    "Bitte mindestens den Zahlbetrag eintragen",
    "Please enter at least the payment",
    "Lütfen en az ödeme tutarını gir",
    "Укажи хотя бы сумму выплаты",
    "Вкажи хоча б суму виплати",
    "Wpisz przynajmniej kwotę wypłaty",
    "أدخل المبلغ على الأقل",
    "Introdu cel puțin suma de plată",
  ],
  bs_showimg: [
    "Foto ansehen",
    "View photo",
    "Fotoğrafı gör",
    "Посмотреть фото",
    "Переглянути фото",
    "Zobacz zdjęcie",
    "عرض الصورة",
    "Vezi fotografia",
  ],
  bs_err_img: [
    "Bild konnte nicht geladen werden",
    "Couldn’t load image",
    "Görsel yüklenemedi",
    "Не удалось загрузить фото",
    "Не вдалося завантажити фото",
    "Nie udało się wczytać obrazu",
    "تعذّر تحميل الصورة",
    "Imaginea nu a putut fi încărcată",
  ],
  bs_t_w: [
    "Widerspruchsfrist Bescheid",
    "Appeal deadline notice",
    "Karar itiraz süresi",
    "Срок возражения на решение",
    "Строк заперечення на рішення",
    "Termin odwołania od decyzji",
    "مهلة الاعتراض على القرار",
    "Termen contestație decizie",
  ],
  bs_t_w_b: [
    "Bescheid geprüft",
    "Notice checked",
    "Karar kontrol edildi",
    "Решение проверено",
    "Рішення перевірено",
    "Decyzja sprawdzona",
    "تم فحص القرار",
    "Decizie verificată",
  ],
  bs_t_wb: [
    "Weiterbewilligung beantragen",
    "Apply for continuation",
    "Devam başvurusu yap",
    "Подать на продление",
    "Подати на продовження",
    "Złóż wniosek o kontynuację",
    "قدّم طلب التمديد",
    "Cere prelungirea",
  ],
  bs_t_wb_b: [
    "Antrag ausgefüllt",
    "Form filled in",
    "Başvuru dolduruldu",
    "Заявление заполнено",
    "Заяву заповнено",
    "Wniosek wypełniony",
    "تم ملء الطلب",
    "Cerere completată",
  ],
});

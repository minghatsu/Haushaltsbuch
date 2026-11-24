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

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

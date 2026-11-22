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

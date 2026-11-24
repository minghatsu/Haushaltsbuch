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

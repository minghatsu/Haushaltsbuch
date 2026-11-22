/* ===== Mamis Helfer (erscheinen im Start-Brief) ===== */
function hlDis() {
  return store.settings.hlDis || {};
}
function hlDismiss(k) {
  store.settings.hlDis = {
    ...hlDis(),
    [k]: isoToday(),
  };
  saveSettings();
}
/* 1) Preis-Wecker */
function hlPrices() {
  const out = [],
    dis = hlDis(),
    cur = ymOf(new Date()),
    since = shiftYm(cur, -3),
    seen = new Set();
  const chk = (key, name, vals, fid) => {
    vals = vals.filter((v) => v.v > 0).sort((a, b) => a.ym.localeCompare(b.ym));
    if (vals.length < 2) return;
    const last = vals[vals.length - 1];
    if (last.ym < since) return;
    let prev = null,
      first = last;
    for (let i = vals.length - 2; i >= 0; i--) {
      if (Math.abs(vals[i].v - last.v) > 0.009) {
        prev = vals[i];
        break;
      }
      first = vals[i];
    }
    if (!prev) return;
    const d = round2(last.v - prev.v);
    if (d < Math.max(0.5, prev.v * 0.02)) return;
    const k = "pr:" + key + ":" + last.v;
    if (dis[k] || seen.has(normText(name))) return;
    seen.add(normText(name));
    out.push({
      k,
      name,
      from: prev.v,
      to: last.v,
      since: first.ym,
      fid,
    });
  };
  for (const f of store.fixed || []) {
    if (f.kind && f.kind !== "ausgabe") continue;
    const vals = [];
    for (const [ym, m] of Object.entries(store.months || {})) {
      if (m && m.paid && f.id in m.paid)
        vals.push({
          ym,
          v: Number(m.paid[f.id]) || 0,
        });
    }
    chk(f.id, f.name, vals, f.id);
  }
  const G = {};
  for (const t of store.tx || []) {
    if (t.kind !== "ausgabe" || !t.payee || !t.date) continue;
    const n = normText(t.payee);
    if (n.length < 3) continue;
    const ym = t.date.slice(0, 7);
    (G[n] = G[n] || {
      name: t.payee,
      m: {},
    }).m[ym] = t.amount;
  }
  for (const [n, g] of Object.entries(G)) {
    const ms = Object.keys(g.m);
    if (ms.length < 3) continue;
    chk(
      "p:" + n,
      g.name,
      ms.map((ym) => ({
        ym,
        v: g.m[ym],
      })),
      null
    );
  }
  return out.sort((a, b) => b.to - b.from - (a.to - a.from)).slice(0, 3);
}
/* 2) Weiterbewilligung */
function hlWb() {
  const W = store.settings.work;
  if (!(W === "alg" || W === "grusi")) return null;
  const j = jlCfg();
  if (!j.bwzEnd)
    return {
      ask: 1,
    };
  if (j.wbDone === j.bwzEnd) return null;
  const n = daysTo(j.bwzEnd);
  if (n > 42 || n < -30) return null;
  return {
    n,
    end: j.bwzEnd,
  };
}
const WB_CHK = ["wb_c_antrag", "wb_c_konto", "wb_c_eink", "wb_c_miete", "wb_c_vm", "wb_c_change"];
/* 3) Lohn-Check */
function hlLohn() {
  const out = [],
    dis = hlDis(),
    cur = ymOf(new Date()),
    lc = incCats()
      .filter((c) => c.art === "lohn")
      .map((c) => c.name),
    sl = Object.entries(store.settings.slips || {})
      .map(([ym, v]) => ({
        ym,
        ...v,
      }))
      .filter((x) => Number(x.netto) > 0)
      .sort((a, b) => a.ym.localeCompare(b.ym));
  for (const s of sl.filter((x) => x.ym >= shiftYm(cur, -3))) {
    const a = s.ym + "-01",
      z = addDays(shiftYm(s.ym, 1) + "-01", 14),
      net = Number(s.netto);
    const pays = (store.tx || []).filter(
      (t) => t.kind === "einnahme" && lc.includes(t.cat) && t.date >= addDays(a, -5) && t.date <= z
    );
    if (!pays.length) continue;
    if (pays.some((t) => Math.abs(t.amount - net) <= 0.5)) continue;
    const best = pays.reduce((p, t) => (Math.abs(t.amount - net) < Math.abs(p.amount - net) ? t : p)),
      d = round2(best.amount - net);
    const k = "lo:" + s.ym + ":" + best.amount;
    if (!dis[k] && Math.abs(d) >= 1)
      out.push({
        k,
        typ: "diff",
        ym: s.ym,
        net,
        paid: best.amount,
        d,
      });
  }
  if (sl.length >= 2) {
    const a = sl[sl.length - 2],
      b = sl[sl.length - 1],
      d = round2(Number(b.netto) - Number(a.netto)),
      k = "lc:" + b.ym;
    if (b.ym >= shiftYm(cur, -2) && Math.abs(d) >= Math.max(15, Number(a.netto) * 0.03) && !dis[k])
      out.push({
        k,
        typ: "chg",
        ym: b.ym,
        from: Number(a.netto),
        to: Number(b.netto),
        d,
      });
  }
  return out.slice(0, 2);
}
/* 4) Rechnungen (Selbstständige) */
function rchList() {
  return (store.settings.rchs = store.settings.rchs || []);
}
function rchOver() {
  return rchList().filter((i) => !i.paid && !i.storno && i.due && daysTo(i.due) < 0);
}
function rchRest(i) {
  return round2((Number(i.amt) || 0) - (i.parts || []).reduce((s, x) => s + (Number(x.a) || 0), 0));
}
function rvLog(a, nr, x) {
  const L = (store.settings.rvLog = store.settings.rvLog || []);
  L.push({
    t: new Date().toISOString(),
    a,
    nr: nr || "",
    x: x || "",
  });
  if (L.length > 3000) L.splice(0, L.length - 3000);
}
async function rvHash(rec, ph) {
  try {
    const data = JSON.stringify({
      nr: rec.nr,
      date: rec.date,
      amt: rec.amt,
      typ: rec.typ || "r",
      doc: rec.doc,
      locked: rec.locked,
      ph: ph || "",
    });
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (_) {
    return "";
  }
}
function rvChain() {
  return rchList()
    .filter((i) => i.locked && i.h)
    .sort((a, b) => String(a.locked).localeCompare(String(b.locked)));
}
async function rvSeal(rec) {
  const c = rvChain(),
    last = c[c.length - 1];
  rec.ph = last ? last.h : "";
  rec.h = await rvHash(rec, rec.ph);
}
async function rvVerify() {
  const c = rvChain();
  let prev = "",
    bad = [];
  for (const i of c) {
    const h = await rvHash(i, i.ph);
    if (h !== i.h || (i.ph || "") !== prev) bad.push(i.nr);
    prev = i.h;
  }
  return {
    n: c.length,
    bad,
  };
}
/* Rechnungsnummer: [Text vorne][Jahr-][laufende Nummer][Text hinten] – ohne Jahr zählt sie durchgehend weiter */
function rchNextNr(o) {
  const y = new Date().getFullYear(),
    b = o || store.settings.biz || {},
    yr = !!b.nrYear,
    pre = String(b.nrPre || "").trim() + (yr ? y + "-" : ""),
    suf = String(b.nrSuf || "").trim(),
    st = Math.max(1, Math.floor(Number(b.nrStart) || 1)),
    esc2 = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("^" + esc2(pre) + "(\\d+)" + esc2(suf) + "$", "i"),
    all = rchList().map((i) => String(i.nr || ""));
  let mx = st - 1,
    hit = false;
  for (const n of all) {
    const m = n.match(re);
    if (m) {
      hit = true;
      mx = Math.max(mx, parseInt(m[1], 10));
    }
  }
  if (!hit && !yr)
    for (const n of all) {
      const m = n.match(/(\d+)\D*$/);
      if (m && m[1].length < 6) mx = Math.max(mx, parseInt(m[1], 10));
    }
  const used = new Set(all.map((n) => n.toLowerCase()));
  let n = mx + 1,
    r;
  do {
    r = pre + String(n).padStart(3, "0") + suf;
    n++;
  } while (used.has(r.toLowerCase()));
  return r;
}
/* 5) Kinderzuschlag */
function hlKiz() {
  if (!kidsList().length) return null;
  const st = store.settings;
  if (st.kizDone) return null;
  const W = st.work;
  if (W === "alg" || W === "grusi") return null;
  if (st.kizAt && daysTo(st.kizAt) > -30) return null;
  return {};
}
function hlItems() {
  const L = [];
  try {
    for (const p of hlPrices())
      L.push({
        k: "price",
        lvl: "w",
        t: uiText("hl_pr_t", {
          n: p.name,
          d: fmtEur(p.to - p.from),
        }),
        s: uiText("hl_pr_s", {
          a: fmtEur(p.from),
          b: fmtEur(p.to),
          y: fmtEur0((p.to - p.from) * 12),
        }),
        raw: 1,
        hl: p,
      });
  } catch (_) {}
  try {
    const w = hlWb();
    if (w && w.ask)
      L.push({
        k: "wb",
        lvl: "i",
        t: uiText("hl_wb_ask"),
        s: uiText("hl_wb_ask_s"),
        raw: 1,
        hl: w,
      });
    else if (w)
      L.push({
        k: "wb",
        lvl: w.n <= 14 ? "r" : "w",
        t:
          w.n >= 0
            ? uiText("hl_wb_t", {
                n: String(w.n),
              })
            : uiText("hl_wb_late"),
        s: uiText("hl_wb_s", {
          d: fxDate(w.end, {
            day: "numeric",
            month: "long",
          }),
        }),
        raw: 1,
        hl: w,
      });
  } catch (_) {}
  try {
    for (const x of hlLohn())
      L.push(
        x.typ === "diff"
          ? {
              k: "lohn",
              lvl: "w",
              t: uiText(x.d < 0 ? "hl_lo_less" : "hl_lo_more", {
                m: fxDate(x.ym + "-01", {
                  month: "long",
                }),
                d: fmtEur(Math.abs(x.d)),
              }),
              s: uiText("hl_lo_s", {
                a: fmtEur(x.net),
                b: fmtEur(x.paid),
              }),
              raw: 1,
              hl: x,
            }
          : {
              k: "lohn",
              lvl: "i",
              t: uiText(x.d > 0 ? "hl_lc_up" : "hl_lc_down", {
                d: fmtEur(Math.abs(x.d)),
              }),
              s: uiText("hl_lc_s", {
                a: fmtEur(x.from),
                b: fmtEur(x.to),
              }),
              raw: 1,
              hl: x,
            }
      );
  } catch (_) {}
  try {
    if (hasSelf()) {
      const pm = pmFind().length;
      if (pm)
        L.push({
          k: "pm",
          lvl: "w",
          t: uiText(pm === 1 ? "pm_ban1" : "pm_ban", { n: String(pm) }),
          s: uiText("pm_hint"),
          raw: 1,
          hl: {},
        });
      for (const i of rchOver().slice(0, 2))
        L.push({
          k: "rch",
          lvl: daysTo(i.due) < -14 ? "r" : "w",
          t: uiText("hl_rch_t", {
            n: i.kunde || "–",
            d: String(-daysTo(i.due)),
          }),
          s: uiText("hl_rch_s", {
            a: fmtEur(i.amt),
            r: i.nr || "",
          }),
          raw: 1,
          hl: {
            id: i.id,
          },
        });
    }
  } catch (_) {}
  try {
    if (hasSelf())
      for (const r of rvRecDue().slice(0, 2))
        L.push({
          k: "rvrec",
          lvl: "i",
          t: uiText("rv_rec_due", {
            n: r.kunde || "–",
          }),
          s: uiText("rv_rec_due_s", {
            d: fxDate(r.next, {
              day: "numeric",
              month: "long",
            }),
          }),
          raw: 1,
          hl: {
            id: r.id,
          },
        });
  } catch (_) {}
  try {
    if (hlKiz())
      L.push({
        k: "kiz",
        lvl: "i",
        t: uiText("hl_kiz_t"),
        s: uiText("hl_kiz_s"),
        raw: 1,
        hl: {},
      });
  } catch (_) {}
  return L;
}
function hlAct(x) {
  const h = x.hl || {};
  if (x.k === "price") return hlPriceOpen(h);
  if (x.k === "wb") return wbOpen();
  if (x.k === "lohn") {
    if (h.k) hlDismiss(h.k);
    ui.view = "beruf";
    render();
    setTimeout(() => {
      try {
        anaOpen("lohn");
      } catch (_) {}
    }, 300);
    return;
  }
  if (x.k === "rch") return rchOpen2(h.id);
  if (x.k === "pm") return pmOpen();
  if (x.k === "rvrec") return rvRecOpen(h.id);
  if (x.k === "kiz") return kizOpen();
}

/* --- Preis-Wecker Fenster --- */
function hlPriceOpen(p) {
  const b = hbSheet("hlpBg", uiText("hl_pr_h"));
  const d = p.to - p.from;
  b.innerHTML = `<div class="fcmami on stbma">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub">${escHtml(
    mFill(
      uiText("hl_pr_m", {
        n: p.name,
      })
    )
  )}</div></div>
    <div class="hlprice"><div class="hlpv"><small>${escHtml(uiText("hl_before"))}</small><b>${escHtml(fmtEur(p.from))}</b></div><span class="hlparr">→</span><div class="hlpv up"><small>${escHtml(
      fxDate(p.since + "-01", {
        month: "long",
        year: "numeric",
      })
    )}</small><b>${escHtml(fmtEur(p.to))}</b></div></div>
    <div class="hlpy"><b data-noi18n>+${escHtml(fmtEur0(d * 12))}</b> <span>${escHtml(uiText("hl_per_year"))}</span></div>
    <div class="vabtns" style="margin-top:14px;flex-direction:column">${p.fid ? `<button type="button" class="btn primary" data-hlcancel="${escHtml(p.fid)}">${svgIcon("pen", 16)} ${escHtml(uiText("hl_pr_letter"))}</button>` : ""}
    <button type="button" class="btn" data-hlok="${escHtml(p.k)}">${escHtml(uiText("hl_pr_ok"))}</button></div>`;
  if (!reducedMotion()) {
    const u = b.querySelector(".hlpv.up");
    u &&
      u.animate(
        [
          {
            transform: "scale(.6)",
            opacity: 0,
          },
          {
            transform: "scale(1.08)",
            offset: 0.7,
          },
          {
            transform: "none",
            opacity: 1,
          },
        ],
        {
          duration: 600,
          delay: 250,
          easing: "cubic-bezier(.3,1.4,.5,1)",
          fill: "backwards",
        }
      );
    stbAnim(b, ".fcmami,.hlprice,.hlpy,.vabtns");
  }
}
/* --- Weiterbewilligung Fenster --- */
function wbOpen() {
  const j = jlCfg();
  const b = hbSheet("wbBg", uiText("wb_h"));
  const n = j.bwzEnd ? daysTo(j.bwzEnd) : null,
    chk = j.wbChk || {};
  b.innerHTML = `<div class="fcmami on stbma">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub">${escHtml(
    mFill(
      j.bwzEnd
        ? n >= 0
          ? uiText("wb_m", {
              n: String(n),
            })
          : uiText("wb_m_late")
        : uiText("wb_m0")
    )
  )}</div></div>
    <label class="hlf"><span>${escHtml(uiText("wb_end"))}</span><input class="in" type="date" id="wbEnd" value="${escHtml(j.bwzEnd || "")}"></label>
    ${
      j.bwzEnd
        ? `<div class="vak">${escHtml(uiText("wb_list"))}</div><div class="vacard wbl">${WB_CHK.map((k) => `<label class="wbi ${chk[k] ? "on" : ""}"><input type="checkbox" data-wbc="${k}" ${chk[k] ? "checked" : ""}><span>${escHtml(uiText(k))}</span></label>`).join("")}</div>
    <a class="btn" style="margin-top:10px;display:block;text-align:center" href="https://www.jobcenter.digital" target="_blank" rel="noopener">${escHtml(uiText("wb_online"))} ↗</a>
    <button type="button" class="btn primary" style="margin-top:10px;width:100%" data-wbdone>✓ ${escHtml(uiText("wb_done"))}</button>`
        : ""
    }
    <p class="small muted" style="margin-top:12px">${escHtml(uiText("wb_hint"))}</p>`;
  if (!reducedMotion()) stbAnim(b, ".fcmami,.hlf,.vak,.wbi,.btn,p");
}
/* --- Rechnungen Fenster --- */
const RCHU = {
  edit: null,
};
function rchOpen2(focus) {
  const b = hbSheet("rchBg", uiText("rch_h"));
  if (RCHU.scan) {
    b.innerHTML = `<div class="bsscan">${RCHU.scan.img ? `<img src="${RCHU.scan.img}" alt="">` : `<div class="stbpdf">${svgIcon("docout", 70)}</div>`}<i class="bsbeam"></i><span class="bscorner"></span></div><p class="bsstat"><span class="dots3"><i></i><i></i><i></i></span> ${escHtml(uiText("rch_reading"))}</p>`;
    return;
  }
  const L = rchList()
    .slice()
    .sort((a, c) => (a.paid ? 1 : 0) - (c.paid ? 1 : 0) || (a.due || "").localeCompare(c.due || ""));
  const open = L.filter((i) => !i.paid && !i.storno),
    sumO = open.reduce((s, i) => s + rchRest(i), 0);
  b.innerHTML = `${pmBanner()}<div class="ahero beruf" style="margin-bottom:10px"><small>${escHtml(uiText("rch_open"))}</small><b>${escHtml(fmtEur(sumO))}</b><span>${open.length} ${escHtml(uiText("br_open"))}${
    rchOver().length
      ? " · " +
        escHtml(
          uiText("rch_over_n", {
            n: String(rchOver().length),
          })
        )
      : ""
  }</span></div>
    ${RCHU.edit ? rchForm() : `<button type="button" class="rvwrite" data-rvnew><span class="rwi">${svgIcon("docout", 24)}</span><span class="rwt"><b>${escHtml(uiText("rv_write"))}</b><small>${escHtml(uiText("rch_w_s"))}</small></span><span class="rwgo">${svgIcon("right", 18)}</span></button><div class="rchacts"><button type="button" class="rcha cam" data-rchpick="cam"><span class="rai">${svgIcon("camera", 20)}</span><b>${escHtml(uiText("bs_photo"))}</b><small>${escHtml(uiText("rch_a_cam"))}</small></button><button type="button" class="rcha" data-rchpick="file"><span class="rai">${svgIcon("doc", 20)}</span><b>${escHtml(uiText("stb_import"))}</b><small>${escHtml(uiText("rch_a_imp"))}</small></button><button type="button" class="rcha" data-rchnew><span class="rai">${svgIcon("pen", 20)}</span><b>${escHtml(uiText("stb_manual"))}</b><small>${escHtml(uiText("rch_a_man"))}</small></button></div>${rchList().length ? `<div class="rchsec">${escHtml(uiText("rch_list_h"))}</div>` : ""}`}
    <input type="file" id="rchCam" accept="image/*" capture="environment" multiple hidden><input type="file" id="rchFile" accept="image/*,application/pdf,.pdf" multiple hidden>
    <div class="rchl">${
      L.map((i) => {
        const st = !!i.storno,
          od = !i.paid && !st && i.due && daysTo(i.due) < 0,
          rest = rchRest(i),
          part = (i.parts || []).length && !i.paid,
          lk = !!i.locked,
          TYP = {
            a: "rch_t_a",
            g: "rch_t_g",
            s: "rch_t_s",
          }[i.typ];
        const stat = st
          ? escHtml(
              uiText("rch_storno_by", {
                n: i.storno,
              })
            )
          : i.paid
            ? escHtml(
                uiText(i.typ === "s" || i.gs ? "rch_done" : "rch_paid_on", {
                  d: fxDate(i.paid, {
                    day: "numeric",
                    month: "short",
                  }),
                })
              )
            : od
              ? escHtml(
                  uiText("rch_over", {
                    n: String(-daysTo(i.due)),
                  })
                )
              : escHtml(
                  uiText("rch_due", {
                    d: fxDate(i.due, {
                      day: "numeric",
                      month: "short",
                    }),
                  })
                );
        return `<div class="rchr ${i.paid || st ? "paid" : od ? "over" : ""} ${st ? "storno" : ""} ${focus === i.id ? "focus" : ""}"><div class="grow"><b>${escHtml(i.kunde || "–")}${TYP ? ` <span class="rchtag">${escHtml(uiText(TYP))}</span>` : ""}${lk ? ` <span class="rchlock" title="${escHtml(uiText("rch_locked"))}">${svgIcon("lock", 11)}</span>` : ""}</b><small>#${escHtml(i.nr || "")} · ${escHtml(
          fxDate(i.date, {
            day: "numeric",
            month: "short",
          })
        )} · ${stat}</small>${
          part
            ? `<small class="rchpart">${escHtml(
                uiText("rch_part_rest", {
                  a: fmtEur(rest),
                  b: fmtEur(i.amt),
                })
              )}</small>`
            : ""
        }</div><b class="amt">${escHtml(fmtEur(part ? rest : i.amt))}</b>
      <div class="rchb">${!i.paid && !st ? `${od ? `<button class="btn sm primary" data-rchrem="${escHtml(i.id)}">${escHtml(uiText("rch_rem"))}</button>` : ""}<button class="btn sm" data-rchpaid="${escHtml(i.id)}">✓ ${escHtml(uiText("rch_mark"))}</button><button class="btn sm" data-rchpart="${escHtml(i.id)}">${escHtml(uiText("rch_part"))}</button>` : ""}${i.doc ? `<button class="btn sm" data-rvpdfid="${escHtml(i.id)}" aria-label="PDF">${svgIcon("dl", 14)}</button><button class="btn sm" data-rvcopy="${escHtml(i.id)}">${escHtml(uiText("rv_copy"))}</button>${!lk && !i.paid ? `<button class="btn sm" data-rvedit="${escHtml(i.id)}" aria-label="${escHtml(uiText("rv_edit"))}">${svgIcon("pen", 14)}</button>` : ""}${lk && !st && i.typ !== "s" && i.typ !== "g" ? `<button class="btn sm ghost" data-rvstorno="${escHtml(i.id)}">${escHtml(uiText("rch_storno"))}</button>` : ""}` : ""}${i.img ? `<button class="btn sm" data-rchview="${escHtml(i.id)}" aria-label="${escHtml(uiText("scan_view"))}">${svgIcon("doc", 14)}</button>` : ""}${lk ? "" : `<button class="btn sm ghost" data-rchdel="${escHtml(i.id)}" aria-label="${escHtml(uiText("tm_del"))}">${svgIcon("ban", 14)}</button>`}</div></div>`;
      }).join("") ||
      `<p class="small muted" style="text-align:center;margin:16px 0">${escHtml(uiText("rch_empty"))}</p>`
    }</div>
    ${
      rvRecs().length
        ? `<div class="rvrecs"><b class="rvsub">${svgIcon("repeat", 16)} ${escHtml(uiText("rv_rec_h"))}</b>${rvRecs()
            .map(
              (r) =>
                `<div class="rvrecr"><span class="grow"><b data-noi18n>${escHtml(r.kunde || "–")}</b><small>${escHtml(uiText(RV_EV[r.every] || "rv_rep_1"))} · ${escHtml(
                  uiText("rv_rec_next", {
                    d: fxDate(r.next, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  })
                )}</small></span><button class="btn sm" data-rvrec="${escHtml(r.id)}">${escHtml(uiText("rv_rec_now"))}</button><button class="btn sm ghost" data-rvrecstop="${escHtml(r.id)}" aria-label="${escHtml(uiText("rv_rec_stop"))}">${svgIcon("pause", 14)}</button></div>`
            )
            .join("")}</div>`
        : ""
    }
    ${rchList().some((i) => i.locked) ? `<div class="rchsec">${escHtml(uiText("rch_gobd_h"))}</div><div class="rcharch"><div class="rcseal" id="rcSeal">${svgIcon("shield", 18)}<span>${escHtml(uiText("rch_seal_chk"))}</span></div><div class="rcab"><button type="button" class="btn" data-rvarch>${svgIcon("dl", 16)} ${escHtml(uiText("rch_arch"))}</button><button type="button" class="btn ghost" data-rvlogv>${svgIcon("list", 16)} ${escHtml(uiText("rch_log"))}</button></div><div class="rclog" id="rcLog" hidden></div><small class="rvhint">${escHtml(uiText("rch_gobd_s"))}</small></div>` : ""}
    <p class="small muted" style="margin-top:10px">${escHtml(uiText("rch_auto"))}</p>`;
  if (!reducedMotion()) stbAnim(b, ".ahero,.rvwrite,.rcha,.rchsec,.rchr,.rvrecr,.rcharch");
  if (rchList().some((i) => i.locked))
    rvVerify().then((r) => {
      const e = $("rcSeal");
      if (!e) return;
      e.classList.add(r.bad.length ? "bad" : "ok");
      e.innerHTML = `${svgIcon(r.bad.length ? "alert" : "shield", 18)}<span>${escHtml(
        r.bad.length
          ? uiText("rch_seal_bad", {
              n: r.bad.join(", "),
            })
          : uiText("rch_seal_ok", {
              n: String(r.n),
            })
      )}</span>`;
    });
}
function rchForm() {
  const e = RCHU.edit,
    F = e.F || {},
    ok = (k) => (F[k] ? ` <i class="rchok">✓</i>` : "");
  const zs = [7, 14, 30];
  if (e.z && !zs.includes(e.z)) zs.push(e.z);
  zs.sort((a, b) => a - b);
  return `${e.scanned ? `<div class="fcmami on stbma">${mamiAvatar ? mamiAvatar(null) : "👩"}<div class="bub">${escHtml(mFill(Object.keys(F).length ? uiText("rch_got") : uiText("rch_got0")))}</div></div>` : ""}${e.img ? `<button type="button" class="docscan on" data-rchimg><span class="dsimg"><img alt="" src="${e.img}"></span><span class="grow"><b>${escHtml(uiText("scan_view"))}</b><small>${escHtml(uiText("scan_view_s"))}</small></span><span class="dsgo">›</span></button>` : ""}<div class="vacard rchf"><label class="hlf"><span>${escHtml(uiText("rch_kunde"))}${ok("kunde")}</span><input class="in" id="rchK" value="${escHtml(e.kunde || "")}" list="rchKL"><datalist id="rchKL">${[
    ...new Set(
      rchList()
        .map((i) => i.kunde)
        .filter(Boolean)
    ),
  ]
    .map((k) => `<option value="${escHtml(k)}">`)
    .join("")}</datalist></label>
  <div class="hlr"><label class="hlf grow"><span>${escHtml(uiText("rch_amt"))}${ok("amt")}</span><input class="in" id="rchA" inputmode="decimal" value="${e.amt ? escHtml(numStr(e.amt)) : ""}" placeholder="0,00"></label><label class="hlf grow"><span>${escHtml(uiText("rch_nr"))}${ok("nr")}</span><input class="in" id="rchN" value="${escHtml(e.nr || rchNextNr())}"></label></div>
  <div class="hlr"><label class="hlf grow"><span>${escHtml(uiText("rch_date"))}${ok("date")}</span><input class="in" type="date" id="rchD" value="${escHtml(e.date || isoToday())}"></label><label class="hlf grow"><span>${escHtml(uiText("rch_days"))}${ok("z")}</span><select class="in" id="rchZ">${zs.map((n) => `<option value="${n}" ${(e.z || 14) === n ? "selected" : ""}>${n} ${escHtml(uiText("rch_tage"))}</option>`).join("")}</select></label></div>
  <div class="vabtns"><button class="btn" data-rchcancel>${escHtml(uiText("tm_cancel"))}</button><button class="btn primary" data-rchsave>${escHtml(uiText("rch_save"))}</button></div></div>`;
}
function rchRemind(id) {
  const i = rchList().find((x) => x.id === id);
  if (!i) return;
  const nm = String(store.settings.name || "").trim() || "[Dein Name]";
  const txt = `Hallo ${i.kunde || ""},\n\nich hoffe, es geht Ihnen gut! Mir ist aufgefallen, dass meine Rechnung Nr. ${i.nr || ""} vom ${new Date(i.date + "T12:00").toLocaleDateString("de-DE")} über ${fmtEur(i.amt)} noch offen ist (fällig am ${new Date(i.due + "T12:00").toLocaleDateString("de-DE")}).\n\nVielleicht ist sie einfach untergegangen – das passiert. Ich wäre Ihnen dankbar, wenn Sie den Betrag in den nächsten 7 Tagen überweisen. Falls Sie schon bezahlt haben, betrachten Sie diese Nachricht bitte als gegenstandslos.\n\nViele Grüße\n${nm}`;
  const b = hbSheet("rchRBg", uiText("rch_rem_h"));
  b.innerHTML = `<p class="hosub">${escHtml(uiText("rch_rem_s"))}</p><textarea class="in valt" id="rchTxt" rows="14" spellcheck="false">${escHtml(txt)}</textarea>
    <div class="vabtns" style="margin-top:12px"><button class="btn" data-rchcopy>${escHtml(uiText("va_copy"))}</button><button class="btn primary" data-rchshare="${escHtml(id)}">${escHtml(uiText("va_send"))}</button></div>`;
}
/* Rechnung fotografieren / importieren */
function rchParse(L) {
  const T0 = (L || []).map((l) => (typeof l === "string" ? l : (l && l.t) || "")).filter(Boolean),
    low = T0.map((t) => t.toLowerCase()),
    all = low.join("\n"),
    d = {},
    F = {};
  let m =
    all.match(/rechnungs?[\s-]*(?:nr|nummer|no)\.?\s*[:#]?\s*([a-z0-9][a-z0-9\-\/\.]{1,19})/i) ||
    all.match(/\brechnung\s*[:#]\s*([a-z0-9][a-z0-9\-\/]{1,19})/i);
  if (m) {
    const i = low.findIndex((t) => t.includes(m[1]));
    const raw = i >= 0 ? T0[i].match(new RegExp(m[1].replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"), "i")) : null;
    d.nr = (raw ? raw[0] : m[1]).toUpperCase().replace(/^[:#]/, "");
    F.nr = 1;
  }
  for (let i = 0; i < T0.length; i++) {
    if (/rechnungsdatum|datum|date/.test(low[i])) {
      const x = bsDate(T0[i]) || (T0[i + 1] && bsDate(T0[i + 1]));
      if (x) {
        d.date = x;
        F.date = 1;
        break;
      }
    }
  }
  if (!d.date) {
    for (const t of T0.slice(0, 25)) {
      const x = bsDate(t);
      if (x && x <= addDays(isoToday(), 30)) {
        d.date = x;
        F.date = 1;
        break;
      }
    }
  }
  let best = 0;
  for (let i = 0; i < T0.length; i++) {
    if (/gesamt|rechnungsbetrag|endbetrag|zu zahlen|zahlbetrag|summe brutto|bruttobetrag|total/.test(low[i])) {
      const a = amountsIn(" " + T0[i] + " ").concat(T0[i + 1] ? amountsIn(" " + T0[i + 1] + " ") : []);
      if (a.length) {
        const v = Math.max(...a);
        if (v > best) best = v;
      }
    }
  }
  if (!best) {
    for (const t of T0) {
      for (const v of amountsIn(" " + t + " ")) if (v > best && v < 1e6) best = v;
    }
  }
  if (best > 0) {
    d.amt = best;
    F.amt = 1;
  }
  m = all.match(/(?:innerhalb|binnen)\s+(?:von\s+)?(\d{1,2})\s+tage/);
  if (m) {
    d.z = Number(m[1]);
    F.z = 1;
  }
  for (let i = 0; i < T0.length; i++) {
    if (/zahlbar bis|fällig am|faellig am|zahlungsziel|bitte .*bis/.test(low[i])) {
      const x = bsDate(T0[i]);
      if (x) {
        d.due = x;
        F.due = 1;
        break;
      }
    }
  }
  const known = [
    ...new Set(
      rchList()
        .map((i) => i.kunde)
        .filter(Boolean)
    ),
  ];
  try {
    for (const k of kundenOf(new Date().getFullYear()).list || []) known.push(k.name || k);
  } catch (_) {}
  const kn = known.find((k) => k && k.length > 2 && all.includes(String(k).toLowerCase()));
  if (kn) {
    d.kunde = kn;
    F.kunde = 1;
  }
  if (!d.kunde) {
    const me = normText(store.settings.name || "");
    for (let i = 0; i < Math.min(T0.length, 30); i++) {
      if (/^(an|rechnungsempfänger|kunde|empfänger)\s*:?\s*$/i.test(T0[i].trim()) && T0[i + 1]) {
        d.kunde = T0[i + 1].trim();
        F.kunde = 1;
        break;
      }
      if (/stra(ß|ss)e|str\.|weg\s+\d|platz\s+\d|allee/i.test(T0[i]) && i > 0) {
        const c = T0[i - 1].trim();
        if (c && !/rechnung|tel|mail|www|@|\d{5}/i.test(c) && (!me || !normText(c).includes(me))) {
          d.kunde = c.replace(/^(herrn?|frau|firma)\s+/i, "");
          F.kunde = 1;
          break;
        }
      }
    }
  }
  if (d.date && d.due && !d.z) {
    d.z = Math.max(1, Math.round((new Date(d.due) - new Date(d.date)) / 864e5));
  }
  try {
    const rw = (L || []).filter((l) => l && l.row);
    d._pos = rvPosParse(rw.length ? rw : L);
    d._lines = T0.slice(0, 80);
  } catch (_) {}
  return {
    d,
    F,
  };
}
async function rchScan(file) {
  const fs = Array.isArray(file) ? file : [file];
  RCHU.scan = {
    img: null,
  };
  rchOpen2();
  let lines = [];
  {
    const R = await readPages(fs, (im) => {
      if (RCHU.scan) {
        RCHU.scan.img = im;
        rchOpen2();
      }
    });
    lines = R.lines;
    if (RCHU.scan) RCHU.scan.img = R.img || RCHU.scan.img;
  }
  const t0 = performance.now(),
    { d, F } = rchParse(lines);
  await new Promise((z) => setTimeout(z, reducedMotion() ? 0 : Math.max(0, 1200 - (performance.now() - t0))));
  RCHU.edit = {
    ...d,
    img: RCHU.scan.img,
    F,
    scanned: 1,
  };
  RCHU.scan = null;
  rchOpen2();
  if (!Object.keys(F).length) toast(uiText("bs_nothing"));
}

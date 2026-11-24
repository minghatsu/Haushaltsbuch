/* Wiederkehrende Rechnungen: Serien verwalten (Pause, Ende, Preise) und fällige Rechnungen mit einem Tipp senden */
const RS = { id: "", end: "0" };

const rvEvery = (v) => (v === "w" ? "w" : [1, 3, 6, 12].includes(Number(v)) ? Number(v) : 0);
const rvStep = (iso, e) => (e === "w" ? addDays(iso, 7) : rvAddM(iso, Number(e) || 1));
const rvRecLive = (r) => !r.paused && !r.done;
const rvRecPerM = (r) => (Number(r.amt) || 0) * (r.every === "w" ? 52 / 12 : 1 / (Number(r.every) || 1));

function rvRecDoc(r) {
  if (r.tpl) return r.tpl;
  const i = rchList().find((x) => x.id === r.src);
  return i && i.doc && !i.storno ? i.doc : null;
}

/* Leistungszeitraum der nächsten Rechnung, z. B. „Dezember 2026“ oder „Januar – März 2027“ */
function rvRecLz(r, lg) {
  const loc = lg === "en" ? "en-GB" : "de-DE",
    D = (iso) => new Date(iso + "T12:00"),
    num = (iso, y) =>
      D(iso).toLocaleDateString(loc, y ? { day: "2-digit", month: "2-digit", year: "numeric" } : { day: "2-digit", month: "2-digit" }),
    mon = (dt) => dt.toLocaleDateString(loc, { month: "long" }),
    s = D(r.next),
    endIso = addDays(rvStep(r.next, r.every), -1),
    e = D(endIso);
  if (r.every === "w") return `${num(r.next)} – ${num(endIso, 1)}`;
  if (s.getDate() !== 1) return `${num(r.next, 1)} – ${num(endIso, 1)}`;
  if (r.every === 1) return `${mon(s)} ${s.getFullYear()}`;
  if (r.every === 12 && s.getMonth() === 0) return String(s.getFullYear());
  return `${mon(s)}${s.getFullYear() !== e.getFullYear() ? " " + s.getFullYear() : ""} – ${mon(e)} ${e.getFullYear()}`;
}

function rvRecMake(r) {
  const src = r && rvRecDoc(r);
  if (!src) return null;
  const d = JSON.parse(JSON.stringify(src));
  delete d.fromOffer;
  delete d.ref;
  Object.assign(d, {
    typ: "r",
    nr: rchNextNr(),
    date: isoToday(),
    id: undefined,
    recId: r.id,
    rep: 0,
    lz: rvRecLz(r, d.lang === "en" ? "en" : "de"),
    abz: [],
  });
  return d;
}

/* Nach dem Versiegeln: Serie weiterschalten und ggf. beenden */
function rvRecAfter(r, id, amt) {
  if (!r) return;
  r.src = id;
  r.amt = amt;
  delete r.tpl;
  r.next = rvStep(r.next, r.every);
  if (r.left !== undefined) r.left = Math.max(0, r.left - 1);
  if (r.left === 0 || (r.until && r.next > r.until)) r.done = isoToday();
}

function rsRefresh() {
  if ($("rchBg") && !$("rchBg").hidden) rchOpen2();
  render();
}
const rsDay = (iso) => fxDate(iso, { day: "numeric", month: "short" });
function rvRecState(r) {
  if (r.done) return ["", uiText("rs_done", { d: rsDay(r.done) })];
  if (r.paused) return ["", uiText("rs_paused", { d: rsDay(r.paused) })];
  const n = daysTo(r.next),
    bits = [uiText(n < 0 ? "rs_late" : "rs_next_d", { d: rsDay(r.next) })];
  if (r.left !== undefined) bits.push(uiText("rs_left", { n: String(r.left) }));
  else if (r.until) bits.push(uiText("rs_until", { d: rsDay(r.until) }));
  return [n <= 3 ? (n < 0 ? "od" : "due") : "", bits.join(" · ")];
}

/* Abschnitt im Rechnungsfenster */
function rvRecList() {
  const L = rvRecs();
  if (!L.length) return "";
  const live = L.filter(rvRecLive),
    perM = live.reduce((s, r) => s + rvRecPerM(r), 0),
    ord = (r) => (r.done ? 2 : r.paused ? 1 : 0);
  return `<div class="rvrecs"><div class="rsh"><b class="rvsub">${svgIcon("repeat", 16)} ${escHtml(uiText("rv_rec_h"))}</b><small>${escHtml(uiText("rs_sum", { n: String(live.length), b: fmtEur0(perM) }))}</small></div>${L.slice()
    .sort((a, b) => ord(a) - ord(b) || String(a.next).localeCompare(String(b.next)))
    .map((r) => {
      const [c, s] = rvRecState(r),
        id = escHtml(r.id),
        due = rvRecLive(r) && daysTo(r.next) <= 3 && rvRecDoc(r);
      return `<div class="rvrecr${rvRecLive(r) ? "" : " off"}" data-rvser="${id}" role="button" tabindex="0"><span class="rsic">${svgIcon(r.paused ? "pause" : r.done ? "check" : "repeat", 17)}</span><span class="grow"><b data-noi18n>${escHtml(r.kunde || "–")}</b><small>${escHtml(uiText(RV_EV[r.every] || "rv_rep_1"))} · <span class="${c}">${escHtml(s)}</span></small></span><span class="rsamt">${r.amt ? escHtml(fmtEur(r.amt)) : ""}</span>${due ? `<button type="button" class="btn sm primary" data-rvrec="${id}">${escHtml(uiText("rq_go"))}</button>` : ""}</div>`;
    })
    .join("")}</div>`;
}

/* Fenster einer Serie */
function rvSerOpen(id, keep) {
  const r = rvRecs().find((x) => x.id === id);
  if (!r) return;
  if (!keep) {
    RS.id = id;
    RS.end = r.left !== undefined ? "n" : r.until ? "d" : "0";
    RS.every = r.every;
  }
  const doc = rvRecDoc(r),
    [c, s] = rvRecState(r),
    b = hbSheet("rsBg", r.kunde || uiText("rv_rec_h")),
    chip = (k) =>
      `<button type="button" class="${RS.every === k ? "on" : ""}" data-rsev="${k}">${escHtml(uiText(RV_EV[k]))}</button>`,
    endB = (k, t) => `<button type="button" class="${RS.end === k ? "on" : ""}" data-rsend="${k}">${escHtml(uiText(t))}</button>`;
  b.innerHTML = `<div class="rshero"><span class="rsic">${svgIcon("repeat", 22)}</span><span class="grow"><b>${r.amt ? escHtml(fmtEur(r.amt)) : "–"}</b><small><span class="${c}">${escHtml(s)}</span></small></span></div>
    <div class="rsact">${
      r.done
        ? ""
        : `<button type="button" class="btn" data-rspause>${svgIcon(r.paused ? "play" : "pause", 16)} ${escHtml(uiText(r.paused ? "rs_resume" : "rs_pause"))}</button>`
    }${rvRecLive(r) && doc ? `<button type="button" class="btn primary" data-rvrec="${escHtml(r.id)}">${escHtml(uiText("rv_rec_now"))}</button>` : ""}</div>
    <div class="rsf"><span>${escHtml(uiText("rs_every"))}</span><div class="erseg rsev">${["w", 1, 3, 6, 12].map(chip).join("")}</div></div>
    <label class="rsf"><span>${escHtml(uiText("rs_next_l"))}</span><input class="in" type="date" id="rsNext" value="${escHtml(r.next)}"></label>
    <div class="rsf"><span>${escHtml(uiText("rs_end"))}</span><div class="erseg">${endB("0", "rs_end_0")}${endB("n", "rs_end_n")}${endB("d", "rs_end_d")}</div>${
      RS.end === "n"
        ? `<label class="rsin"><input class="in" type="number" inputmode="numeric" min="1" max="999" id="rsCnt" value="${escHtml(String(r.left || 12))}"><small>${escHtml(uiText("rs_cnt"))}</small></label>`
        : RS.end === "d"
          ? `<label class="rsin"><input class="in" type="date" id="rsUntil" value="${escHtml(r.until || addDays(r.next, 365))}"></label>`
          : ""
    }</div>
    ${
      doc && doc.pos && doc.pos.length
        ? `<div class="rsf"><span>${escHtml(uiText("rs_price"))}</span><div class="rspos">${doc.pos
            .map(
              (p, k) =>
                `<label class="rsp"><span data-noi18n>${escHtml(p.n || "–")}${Number(p.q) !== 1 ? ` <small>× ${escHtml(String(p.q))}</small>` : ""}</span><input class="in" type="number" inputmode="decimal" step="0.01" data-rsp="${k}" value="${escHtml(String(round2(Number(p.p) || 0)))}" aria-label="${escHtml(p.n || "")}"><em>€</em></label>`
            )
            .join("")}</div><small class="rvhint">${escHtml(uiText("rs_price_s"))}</small></div>`
        : ""
    }
    <button type="button" class="btn primary block" data-rssave>${escHtml(uiText("rs_save"))}</button>
    <button type="button" class="btn ghost block rsdel" data-rsdel>${svgIcon("trash", 15)} ${escHtml(uiText("rs_del"))}</button>`;
  if (!keep && !reducedMotion()) stbAnim(b, ".rshero,.rsact,.rsf,.btn.block");
}

async function rvSerSave(r) {
  const b = $("rsBg");
  if (!b) return;
  const nx = (b.querySelector("#rsNext") || {}).value;
  if (nx) r.next = nx;
  r.every = RS.every;
  delete r.left;
  delete r.until;
  if (RS.end === "n") r.left = Math.max(1, Math.round(Number((b.querySelector("#rsCnt") || {}).value) || 1));
  if (RS.end === "d") r.until = (b.querySelector("#rsUntil") || {}).value || addDays(r.next, 365);
  const doc = rvRecDoc(r),
    inp = [...b.querySelectorAll("[data-rsp]")];
  if (doc && inp.length) {
    const t = JSON.parse(JSON.stringify(doc));
    let ch = 0;
    for (const e of inp) {
      const p = t.pos[Number(e.dataset.rsp)],
        v = round2(Number(String(e.value).replace(",", ".")));
      if (p && isFinite(v) && v >= 0 && v !== round2(Number(p.p) || 0)) {
        p.p = v;
        ch = 1;
      }
    }
    if (ch) {
      r.tpl = t;
      r.amt = rvSum(t).pay;
    }
  }
  if (r.done && (!r.until || r.next <= r.until) && r.left !== 0) delete r.done;
  else if (!r.done && r.until && r.next > r.until) r.done = isoToday();
  await saveSettings();
  SND.play("done");
  hbSheetClose("rsBg");
  rsRefresh();
  toast(uiText("rs_saved"));
}

async function rvSerPause(r) {
  if (r.paused) {
    delete r.paused;
    const t = isoToday();
    while (r.next < t) r.next = rvStep(r.next, r.every);
    toast(uiText("rs_resumed", { d: rsDay(r.next) }));
  } else {
    r.paused = isoToday();
    toast(uiText("rs_paused_t"));
  }
  await saveSettings();
  SND.play(r.paused ? "untick" : "tick");
  rvSerOpen(r.id, 1);
  rsRefresh();
}

/* Fällige Rechnung: fertig vorbereitet, ein Tipp zum Senden */
const RQ = { d: null };
function rvRecQuick(id) {
  const r = rvRecs().find((x) => x.id === id),
    d = r && rvRecMake(r);
  if (!d) return;
  RQ.d = d;
  const sum = rvSum(d),
    pos = d.pos || [],
    b = hbSheet("rqBg", uiText("rq_h"));
  b.innerHTML = `<div class="rqcard"><div class="rqtop"><b data-noi18n>${escHtml(d.nr)} · ${escHtml(d.k.name || "–")}</b><b class="rqamt">${escHtml(fmtEur(sum.pay))}</b></div>
    <div class="rqpos" data-noi18n>${pos
      .slice(0, 3)
      .map((p) => `<span>${escHtml(p.n || "–")}</span>`)
      .join("")}${pos.length > 3 ? `<small>${escHtml(uiText("rq_more", { n: String(pos.length - 3) }))}</small>` : ""}</div>
    <div class="rqmeta"><span>${escHtml(uiText("rq_lz"))} <mark data-noi18n>${escHtml(d.lz)}</mark></span><span>${escHtml(uiText("rq_date"))} <mark>${escHtml(fxDate(d.date, { day: "2-digit", month: "2-digit", year: "numeric" }))}</mark></span></div>
    <small class="rqnote">${escHtml(uiText("rq_filled"))}</small></div>
    <div class="rqto"><small>${escHtml(uiText("rq_to"))}</small><span data-noi18n>${escHtml(d.k.email || uiText("rq_noto"))}</span></div>
    <div class="rqbtn"><button type="button" class="btn" data-rqview>${escHtml(uiText("rq_view"))}</button><button type="button" class="btn primary" data-rqsend>${svgIcon("send", 16)} ${escHtml(uiText("rq_send"))}</button></div>`;
  if (!reducedMotion()) stbAnim(b, ".rqcard,.rqto,.rqbtn");
}

async function rvRecSend(btn) {
  const d = RQ.d;
  if (!d) return;
  RV.d = d;
  const bad = rvCheck().find((c) => !c.ok);
  if (bad) {
    hbSheetClose("rqBg");
    toast(uiText(bad.k) + " – " + uiText("rv_fix"));
    setTimeout(() => rvOpen(d), 240);
    return;
  }
  btn.disabled = true;
  const id = await rvCommit(d);
  if (!id) {
    btn.disabled = false;
    return;
  }
  RQ.d = null;
  SND.play("done");
  const card = $("rqBg") && $("rqBg").querySelector(".rqcard");
  if (card && !reducedMotion())
    await card
      .animate(
        [
          { transform: "none", opacity: 1 },
          { transform: "translateY(-18px) scale(.97)", opacity: 0 },
        ],
        { duration: 300, easing: "cubic-bezier(.5,0,.8,.3)", fill: "forwards" }
      )
      .finished.catch(() => {});
  hbSheetClose("rqBg");
  rchOpen2(id);
  render();
  toast(uiText("rv_saved", { n: d.nr }));
  const c = rvKundeOf(d),
    fmt = c && c.fmt;
  if (fmt && !rvEinvMissing(d, fmt, c.lw || "").length) rvMail(d, rvOutFile(d, fmt, c.lw || ""));
  else rvFmtAsk(d, "mail");
}

document.addEventListener("click", async (e) => {
  const t = e.target,
    rq = t.closest("[data-rvrec]");
  if (rq) {
    e.stopPropagation();
    hbSheetClose("rsBg");
    rvRecQuick(rq.dataset.rvrec);
    return;
  }
  if (t.closest("[data-rqview]")) {
    const d = RQ.d;
    hbSheetClose("rqBg");
    hbSheetClose("rchBg");
    if (d) setTimeout(() => rvOpen(d), 240);
    return;
  }
  const qs = t.closest("[data-rqsend]");
  if (qs) {
    rvRecSend(qs);
    return;
  }
  const sr = t.closest("[data-rvser]");
  if (sr) {
    rvSerOpen(sr.dataset.rvser);
    SND.play("tick");
    return;
  }
  if (!t.closest("#rsBg")) return;
  const r = rvRecs().find((x) => x.id === RS.id);
  if (!r) return;
  const ev = t.closest("[data-rsev]"),
    en = t.closest("[data-rsend]");
  if (ev || en) {
    if (ev) RS.every = rvEvery(ev.dataset.rsev);
    if (en) RS.end = en.dataset.rsend;
    const b = $("rsBg"),
      keep = {};
    b.querySelectorAll("input[id],input[data-rsp]").forEach((i) => (keep[i.id || "p" + i.dataset.rsp] = i.value));
    rvSerOpen(r.id, 1);
    b.querySelectorAll("input[id],input[data-rsp]").forEach((i) => {
      const k = i.id || "p" + i.dataset.rsp;
      if (keep[k] !== undefined) i.value = keep[k];
    });
    SND.play("tick");
  } else if (t.closest("[data-rspause]")) rvSerPause(r);
  else if (t.closest("[data-rssave]")) rvSerSave(r);
  else if (t.closest("[data-rsdel]")) {
    const L = rvRecs(),
      k = L.indexOf(r);
    L.splice(k, 1);
    await saveSettings();
    hbSheetClose("rsBg");
    rsRefresh();
    toast(uiText("rs_deleted"), async () => {
      L.splice(k, 0, r);
      await saveSettings();
      rsRefresh();
    });
  }
});
document.addEventListener("keydown", (e) => {
  const sr = (e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-rvser]");
  if (sr && e.target === sr) {
    e.preventDefault();
    rvSerOpen(sr.dataset.rvser);
  }
});

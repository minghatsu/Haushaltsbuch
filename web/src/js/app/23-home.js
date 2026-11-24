/* Start */
/* Mami fasst „pro Tag“ und Prognose in einem Satz zusammen */
function homeSay(ym, mainBal) {
  const { left, v } = freePerDay(ym, mainBal);
  let F = null;
  try {
    F = store.tx.length ? fcCalc() : null;
  } catch (_) {}
  const fc = F && F.pts && F.pts.length,
    end = fc
      ? F.warn
        ? uiText("hs_tight", { d: fxDate(F.ym + "-" + pad(F.min.d)) })
        : uiText("hs_end", { d: fxDate(lastDayOf(F.ym)), v: fmtEur0(F.end) })
      : uiText(left === 1 ? "hs_left1" : "hs_left", { n: left });
  return `<button type="button" class="hsay ${fc && F.warn ? "warn" : ""}" ${fc ? "data-fcopen" : 'data-go="year"'} data-noi18n><span class="hsm">${mamiAvatar(null)}</span><span class="hst"><b>${escHtml(uiText("hs_day", { v: fmtEur0(v) }))}</b><span>${escHtml(end)}</span></span>${svgIcon("right", 18)}</button>`;
}
/* Auf der Startseite bleibt nur, was es sonst nirgends gibt: Bargeld */
function homeBlocks(html) {
  return store.settings.cashHide || !html.cash
    ? ""
    : `<div class="hlist"><div class="hblock" data-hb="cash">${html.cash}</div></div>`;
}
function renderHomeEd() {
  const el = $("homeEd");
  if (!el) return;
  el.innerHTML = `<div class="card" data-noi18n><div class="switch"><label for="sCashHome"><b>${escHtml(uiText("hc_sw"))}</b><br><span class="small muted">${escHtml(uiText("hc_sw_s"))}</span></label><input type="checkbox" id="sCashHome" ${store.settings.cashHide ? "" : "checked"}></div></div>`;
}
function renderAvatar() {
  const p = store.settings && store.settings.photo,
    n = String((store.settings && store.settings.name) || "").trim();
  const ta = $("topAv"),
    badge = `<span class="avdev">${devIc(devForm(), 11)}</span>`;
  ta.hidden = false;
  ta.classList.toggle("devav", !p && !n);
  ta.innerHTML = p
    ? `<img src="${escHtml(p)}" alt="">${badge}`
    : n
      ? `<span class="avl">${escHtml(n[0].toUpperCase())}</span>${badge}`
      : devIc(devForm(), 22);
  $("pfAv").innerHTML = p ? `<img src="${escHtml(p)}" alt="Profilfoto">` : escHtml((n[0] || "?").toUpperCase());
  $("pfDel").hidden = !p;
  $("pfEdit").hidden = !(p && store.settings.photoSrc);
  $("pfCam").hidden = !phoneCam();
  $("pfPickLbl").textContent = phoneCam() ? "Galerie" : "Foto wählen";
  $("pfHeroName").textContent = n || "Dein Profil";
  let mail = "";
  try {
    mail = SYNC.email || "";
  } catch (e) {}
  $("pfHeroSub").textContent = mail || (p ? "Tippe aufs Foto zum Zuschneiden" : "Füge ein Foto hinzu");
}
const PFE = {
  img: null,
  w: 0,
  h: 0,
  z: 1,
  x: 0,
  y: 0,
  src: "",
};
function pfeSize() {
  return $("pfStage").clientWidth;
}
function pfeClamp() {
  const S0 = pfeSize(),
    base = S0 / Math.min(PFE.w, PFE.h),
    dw = PFE.w * base * PFE.z,
    dh = PFE.h * base * PFE.z;
  PFE.z = Math.min(4, Math.max(1, PFE.z));
  PFE.x = Math.max(-(dw - S0) / 2, Math.min((dw - S0) / 2, PFE.x));
  PFE.y = Math.max(-(dh - S0) / 2, Math.min((dh - S0) / 2, PFE.y));
  const im = $("pfImg");
  im.style.width = dw + "px";
  im.style.height = dh + "px";
  im.style.transform = `translate(calc(-50% + ${PFE.x}px), calc(-50% + ${PFE.y}px))`;
  $("pfZoom").value = PFE.z;
}
async function pfeOpen(src, crop) {
  const im = $("pfImg");
  im.src = src;
  await im.decode();
  PFE.src = src;
  PFE.w = im.naturalWidth;
  PFE.h = im.naturalHeight;
  $("pfEd").hidden = false;
  const S0 = pfeSize();
  if (crop) {
    PFE.z = crop.z;
    PFE.x = crop.x * S0;
    PFE.y = crop.y * S0;
  } else {
    PFE.z = 1;
    PFE.x = 0;
    PFE.y = 0;
  }
  pfeClamp();
}
async function setAvatar(blob) {
  try {
    const bmp = await createImageBitmap(blob),
      k = Math.min(1, 900 / Math.max(bmp.width, bmp.height)),
      c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    await pfeOpen(c.toDataURL("image/jpeg", 0.8), null);
  } catch (e) {
    toast("Das Foto konnte nicht geöffnet werden");
  }
}
async function pfeSave() {
  const S0 = pfeSize(),
    sc = (S0 / Math.min(PFE.w, PFE.h)) * PFE.z,
    side = S0 / sc;
  const cx = PFE.w / 2 - PFE.x / sc,
    cy = PFE.h / 2 - PFE.y / sc,
    c = document.createElement("canvas");
  c.width = c.height = 256;
  c.getContext("2d").drawImage($("pfImg"), cx - side / 2, cy - side / 2, side, side, 0, 0, 256, 256);
  store.settings.photo = c.toDataURL("image/jpeg", 0.85);
  store.settings.photoSrc = PFE.src;
  store.settings.photoCrop = {
    z: +PFE.z.toFixed(3),
    x: +(PFE.x / S0).toFixed(4),
    y: +(PFE.y / S0).toFixed(4),
  };
  $("pfEd").hidden = true;
  await saveSettings();
  renderAvatar();
  renderSetHome();
  if (ui.wiz && ui.wiz.step === 0) wizRender();
  toast("Profilfoto gespeichert");
}
(function () {
  const st = $("pfStage"),
    pts = new Map();
  let last = null;
  st.addEventListener("pointerdown", (e) => {
    st.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });
    last = null;
  });
  st.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId),
      nx = e.clientX,
      ny = e.clientY;
    if (pts.size === 1) {
      PFE.x += nx - p.x;
      PFE.y += ny - p.y;
    } else {
      const o = [...pts.entries()].find(([id]) => id !== e.pointerId)[1],
        d = Math.hypot(nx - o.x, ny - o.y);
      if (last) PFE.z *= d / last;
      last = d;
    }
    pts.set(e.pointerId, {
      x: nx,
      y: ny,
    });
    pfeClamp();
  });
  const up = (e) => {
    pts.delete(e.pointerId);
    last = null;
  };
  st.addEventListener("pointerup", up);
  st.addEventListener("pointercancel", up);
  st.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      PFE.z *= e.deltaY < 0 ? 1.08 : 1 / 1.08;
      pfeClamp();
    },
    {
      passive: false,
    }
  );
  $("pfZoom").addEventListener("input", () => {
    PFE.z = +$("pfZoom").value;
    pfeClamp();
  });
  $("pfEdOk").onclick = pfeSave;
  $("pfEdCancel").onclick = () => {
    $("pfEd").hidden = true;
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("pfEd").hidden) $("pfEd").hidden = true;
  });
})();
function phoneCam() {
  return !!(window.AndroidBridge && window.AndroidBridge.scanReceipt && !window.AndroidBridge.desktop);
}
async function avatarNative(source) {
  try {
    const res = await scanNative(source === "camera" ? "photo" : source);
    if (!res || !res.img) return;
    setAvatar(await (await fetch(res.img)).blob());
  } catch (e) {
    toast(e.message || "Das Foto konnte nicht geöffnet werden");
  }
}
$("pfPick").onclick = () => {
  if (phoneCam()) return avatarNative("gallery");
  const i = $("pfFile");
  i.value = "";
  i.click();
};
$("pfFile").onchange = () => {
  const f = $("pfFile").files[0];
  if (f) setAvatar(f);
};
$("pfCam").onclick = () => avatarNative("camera");
$("pfAv").onclick = () => {
  if (store.settings.photoSrc) pfeOpen(store.settings.photoSrc, store.settings.photoCrop);
  else $("pfPick").click();
};
$("pfEdit").onclick = () => {
  const s0 = store.settings.photoSrc;
  if (s0) pfeOpen(s0, store.settings.photoCrop);
};
$("pfDel").onclick = async () => {
  delete store.settings.photo;
  delete store.settings.photoSrc;
  delete store.settings.photoCrop;
  await saveSettings();
  renderAvatar();
  renderSetHome();
  toast("Profilfoto entfernt");
};
$("topAv").onclick = () => {
  ui.view = "more";
  ui.sp = null;
  render();
  renderSpPages();
  window.scrollTo({
    top: 0,
  });
};
$("backBtn").onclick = () => {
  ui.view = AREA_PARENT[ui.view] || "home";
  render();
  window.scrollTo({
    top: 0,
  });
};
$("sName").addEventListener("change", () => {
  store.settings.name = $("sName").value.trim().slice(0, 30);
  saveSettings();
  $("greet").innerHTML = greetHTML();
  renderAvatar();
  toast("Gespeichert");
});
/* Steuerrücklage */
function taxGauge(ym) {
  const y = ym.slice(0, 4),
    tax = taxCalc(y);
  const need = Math.max(0, tax.due) + (tax.gewst || 0),
    have = tax.resBal;
  if (!(need > 0 || have > 0 || tax.self > 0)) return "";
  const pct = need > 0 ? Math.min(1, have / need) : 1;
  const nowY = ymOf(new Date()).slice(0, 4),
    monthsLeft = y === nowY ? 12 - new Date().getMonth() : y > nowY ? 12 : 0;
  const perM = need > have && monthsLeft ? (need - have) / monthsLeft : 0;
  const R = 100,
    cx = 125,
    cy = 128,
    a = Math.PI * (1 - pct),
    ex = cx + R * Math.cos(a),
    ey = cy - R * Math.sin(a),
    large = 0;
  const col = pct >= 1 ? "var(--good)" : pct >= 0.6 ? "var(--accent)" : "var(--warn)";
  return `<div class="card" style="order:6"><div class="card-head"><h2>${headIcon("receipt")}Steuer-Rücklage ${escHtml(y)}</h2><button class="link" data-go="year">Details ${svgIcon("right", 16)}</button></div>
    <div class="gauge"><svg viewBox="0 0 250 140" aria-hidden="true"><path d="M25 128 A100 100 0 0 1 225 128" fill="none" stroke="var(--line)" stroke-width="18" stroke-linecap="round"/>${pct > 0.005 ? `<path d="M25 128 A100 100 0 ${large} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${col}" stroke-width="18" stroke-linecap="round"/>` : ""}</svg>
      <div class="gv"><b>${need > 0 ? Math.round(pct * 100) + " %" : "✓"}</b></div></div>
    <div class="gsub">${need > 0 ? (pct >= 1 ? "Die Rücklage reicht für die geschätzte Steuer" : "der geschätzten Steuer schon zurückgelegt") : "Laut Schätzung keine Nachzahlung"}</div>
    <div class="kv3"><div><small>Zurückgelegt</small><b>${escHtml(fmtEur0(have))}</b></div><div><small>Steuer ca.</small><b>${escHtml(fmtEur0(need))}</b></div><div><small>${perM ? "Pro Monat noch" : "Übrig"}</small><b class="pos">${escHtml(fmtEur0(perM || Math.max(0, have - need)))}</b></div></div>
  </div>`;
}
/* Fixkosten */
const FIX_AREAS = [
  [
    "Wohnen",
    /miete|wohnung|nebenkosten|strom|gas\b|wasser|heiz|rundfunk|gez|grundsteuer|müll|hausgeld|garage|stellplatz/,
  ],
  ["Schulden", null],
  ["Auto", /auto|kfz|tank|leasing|werkstatt|tüv|parken|stellplatz|adac|car/],
  ["Versicherung", /versicher|haftpflicht|allianz|huk|ergo|axa|debeka|signal|devk|r\+v|kranken|bu\b/],
  [
    "Sparen & Vorsorge",
    /\betf\b|spar|depot|rente|altersvorsorge|ksk|künstlersozial|kuenstlersozial|bausparen|vwl|fonds/,
  ],
  [
    "Abos & Handy",
    /handy|mobil|telekom|vodafone|o2|1&1|internet|dsl|netflix|spotify|disney|prime|amazon|apple|google|youtube|abo|zeitung|fitness|gym|icloud|dazn|sky/,
  ],
];
function fixArea(f) {
  if (debtFor(f.id)) return "Schulden";
  const n = normText(f.name);
  for (const [a, re] of FIX_AREAS) if (re && re.test(n)) return a;
  return f.kind === "betrieb" ? "Betrieb" : "Sonstiges";
}
const ABO_NOT = [
  [0, "jederzeit"],
  [0.5, "2 Wochen"],
  [1, "1 Monat"],
  [2, "2 Monate"],
  [3, "3 Monate"],
  [6, "6 Monate"],
];
function fxContract(f) {
  if (debtFor(f.id)) return "";
  const a = aboCfg()[f.id] || {},
    isAbo = fixArea(f) === "Abos & Handy" || !!aboCfg()[f.id] || ui.fxCon === f.id;
  if (!isAbo) return `<button class="fxconadd" data-fxcon="${escHtml(f.id)}">+ Laufzeit / Kündigungsfrist</button>`;
  const dl = aboDeadline(a);
  return `<div class="fxcon"><label><span>Läuft bis</span><input class="in" type="date" data-aboend="${escHtml(f.id)}" value="${escHtml(a.end || "")}"></label><label><span>Frist</span><select class="in" data-abonot="${escHtml(f.id)}">${ABO_NOT.map(([v, l]) => `<option value="${v}" ${Number(a.notice || 0) === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>${dl ? `<small class="muted">kündigen bis ${escHtml(new Date(dl + "T12:00").toLocaleDateString("de-DE"))}</small>` : ""}</div>`;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-goalnew]")) {
    ui.goalNew = !ui.goalNew;
    render();
    return;
  }
  if (e.target.closest("#goalAddRing,#goalFirst,[data-anlopen]")) ui.goalNew = false;
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-fxcon]");
  if (!b) return;
  ui.fxCon = b.dataset.fxcon;
  render();
});
function fixedAreas(ym) {
  if (!store.fixed.length)
    return `<div class="card" style="order:5"><div class="card-head"><h2>${headIcon("list")}Fixkosten</h2><button class="link" data-go="fix">Eintragen ${svgIcon("right", 16)}</button></div><span class="small muted">Trag Miete, Versicherungen und Abos einmal ein – dann siehst du hier, wohin dein festes Geld geht.</span></div>`;
  const c = monthCalc(ym),
    list = store.fixed.filter((f) => dueIn(f, ym)),
    total = sum(list, (f) => planAmt(f, ym));
  const by = {};
  for (const f of list) by[fixArea(f)] = (by[fixArea(f)] || 0) + planAmt(f, ym);
  const areas = Object.entries(by)
    .filter((x) => x[1] > 0)
    .sort((a, b) => b[1] - a[1]);
  const cols = ["var(--c5)", "var(--c1)", "var(--c2)", "var(--c4)", "var(--c3)", "var(--c6)", "var(--line)"];
  const paidN = list.filter((f) => f.id in c.paid).length,
    inc = c.income;
  return `<div class="card" style="order:5"><div class="card-head"><h2>${headIcon("list")}Fixkosten</h2><button class="link" data-go="fix">Abhaken ${svgIcon("right", 16)}</button></div>
    <div class="meta-row" style="margin-bottom:8px"><span class="small muted">Im ${escHtml(MONTHS[ymParts(ym)[1] - 1])} fest verplant</span><b style="font-family:var(--f-display);font-size:22px;font-weight:800;letter-spacing:-.02em">${escHtml(fmtEur0(total))}</b></div>
    <div class="fstack">${areas.map(([a, v], i) => `<div style="flex:${v};background:${cols[i % cols.length]}" title="${escHtml(a)}: ${escHtml(fmtEur(v))}">${v / total > 0.16 ? escHtml(a) : ""}</div>`).join("")}</div>
    <div class="fleg">${areas.map(([a, v], i) => `<div><i style="background:${cols[i % cols.length]}"></i><span>${escHtml(a)}</span><b>${escHtml(fmtEur0(v))}</b></div>`).join("")}</div>
    ${(() => {
      const cur = ymOf(new Date()),
        today = new Date().getDate(),
        open = list
          .filter((f) => !(f.id in c.paid))
          .map((f) => ({
            f,
            d: fixDay(f, ym),
            v: planAmt(f, ym),
          }));
      const next = (ym === cur ? open.filter((x) => x.d != null && x.d >= today) : open)
        .sort((a, b) => (a.d || 99) - (b.d || 99))
        .slice(0, 3);
      const when = (d) =>
        ym !== cur || d == null ? "" : d === today ? "heute" : d === today + 1 ? "morgen" : `in ${d - today} Tagen`;
      const A = aboCfg(),
        per = {
          monatlich: 1,
          quartal: 1 / 3,
          halbjahr: 1 / 6,
          jahr: 1 / 12,
        };
      const ab = store.fixed.filter((f) => !debtFor(f.id) && (fixArea(f) === "Abos & Handy" || A[f.id])),
        abM = sum(ab, (f) => planAmt(f, cur) * (per[f.rhythm || "monatlich"] ?? 1));
      const dl = ab
        .map((f) => ({
          f,
          d: aboDeadline(A[f.id]),
        }))
        .filter((x) => x.d && x.d >= isoToday())
        .sort((a, b) => a.d.localeCompare(b.d))[0];
      return `${next.length ? `<div class="fxsec">Als Nächstes fällig</div><div class="hxlist">${next.map((x) => `<div class="hxrow"><span class="hxd">${x.d ? `<b>${x.d}.</b>` : "–"}</span><span class="grow"><b>${escHtml(x.f.name)}</b>${when(x.d) ? `<small class="muted">${when(x.d)}</small>` : ""}</span><b>${escHtml(fmtEur(x.v))}</b></div>`).join("")}</div>` : ""}
        ${
          ab.length
            ? `<div class="fxsec">Abos</div><div class="hxrow"><span class="grow"><b>${ab.length} ${ab.length === 1 ? "Abo" : "Abos"}</b><small class="muted">${escHtml(
                ab
                  .slice(0, 3)
                  .map((f) => f.name)
                  .join(", ")
              )}${ab.length > 3 ? " …" : ""}${dl ? ` · kündigen bis ${escHtml(new Date(dl.d + "T12:00").toLocaleDateString("de-DE"))} (${escHtml(dl.f.name)})` : ""}</small></span><span style="text-align:right"><b>${escHtml(fmtEur0(abM))} / Monat</b><small class="muted" style="display:block">${escHtml(fmtEur0(abM * 12))} / Jahr</small></span></div>`
            : ""
        }`;
    })()}
    <div class="tipline" style="margin-top:12px;padding:10px 12px"><span class="e" style="width:30px;height:30px">${svgIcon("spark", 17)}</span><span>${inc > 0 ? `<b>${Math.round((total / inc) * 100)} % deiner Einnahmen</b> sind fest verplant – ` : ""}${paidN} von ${list.length} ${list.length === 1 ? "ist" : "sind"} abgehakt.</span></div>
  </div>`;
}
/* Letzte Buchungen */
function recentTimeline(c) {
  const f = ui.recentF || "alle";
  let tx = sortTx(c.tx);
  if (f === "aus") tx = tx.filter((t) => t.kind !== "einnahme");
  else if (f === "ein") tx = tx.filter((t) => t.kind === "einnahme");
  tx = tx.slice(0, ui.wide ? 8 : 6);
  const today = isoToday(),
    yest = isoOf(new Date(Date.now() - 864e5));
  const when = (d) => (d === today ? "Heute" : d === yest ? "Gestern" : shortDate(d));
  return `<div class="card" style="order:8"><div class="card-head"><h2>${headIcon("check")}Letzte Buchungen</h2>${c.tx.length ? `<button class="link" data-go="list">Alle ${svgIcon("right", 16)}</button>` : ""}</div>
    ${
      c.tx.length
        ? `<div class="tlchips">${[
            ["alle", "Alle"],
            ["aus", "Ausgaben"],
            ["ein", "Einnahmen"],
          ]
            .map(([k, l]) => `<button class="fchip" data-recentf="${k}" aria-pressed="${f === k}">${l}</button>`)
            .join("")}</div>`
        : ""
    }
    ${c.tx.length ? (tx.length ? `<div class="tline">${tx.map((t) => tlRow(t, when(t.date))).join("")}</div>` : `<span class="small muted">Keine ${f === "ein" ? "Einnahmen" : "Ausgaben"} in diesem Monat.</span>`) : emptyState("receipt", "Noch keine Buchungen", "Alles, was du einträgst, erscheint hier.", `<button class="btn primary" data-add="ausgabe">Erste Buchung eintragen</button>`)}
  </div>`;
}
/* Weitere Kacheln */
const HX_IC = {
  perday: "wallet",
  week: "cal",
  topcat: "chart",
  compare: "insight",
  trend: "spark",
  abos: "tv",
  biggest: "flame",
  todo: "check",
};
function hxHead(k, title, link) {
  return `<div class="card-head"><h2>${headIcon(HX_IC[k])}<span>${escHtml(title)}</span></h2>${link || ""}</div>`;
}
const hxGo = (v, l) =>
  `<button class="link" data-go="${v}"><span>${escHtml(l)}</span> ${svgIcon("right", 16)}</button>`;
const hxOut = (t) => t.kind === "ausgabe" || t.kind === "betrieb";
function fixDay(f, ym) {
  const words = normText(f.name)
    .split(/[^a-z0-9äöüß]+/)
    .filter((w) => w.length >= 3);
  if (!words.length) return null;
  const amt = planAmt(f, ym),
    days = [];
  for (let i = 1; i <= 4; i++) {
    const pm = shiftYm(ym, -i);
    for (const t of store.tx)
      if (hxOut(t) && (t.date || "").startsWith(pm)) {
        const n = normText(t.note);
        if (words.some((w) => n.includes(w)) && (!amt || Math.abs(t.amount - amt) <= Math.max(2, amt * 0.2))) {
          days.push(Number(t.date.slice(8, 10)));
          break;
        }
      }
  }
  if (!days.length) return null;
  days.sort((a, b) => a - b);
  return Math.min(daysIn(ym), days[Math.floor(days.length / 2)]);
}
function homeExtra({ ym, cur, c, g, mainName, mainBal, asOf }) {
  const out = {},
    mon = MONTHS[ymParts(ym)[1] - 1],
    today = new Date().getDate();
  const spentList = c.tx.filter(hxOut),
    spent = sum(spentList, (t) => t.amount);
  {
    const D = daysIn(ym),
      left = ym === cur ? Math.max(1, D - today + 1) : ym > cur ? D : 0,
      past = ym === cur ? today : ym < cur ? D : 0;
    const per = left ? (ym === cur ? freePerDay(ym, mainBal).v : Math.max(0, mainBal / left)) : 0,
      avg = past ? dayAvg(ym + "-01", ym === cur ? isoToday() : lastDayOf(ym), past) : 0,
      pct = Math.round((past / D) * 100);
    out.perday = `<div class="card">${hxHead("perday", "Noch pro Tag")}
      ${left ? `<div class="hxbig">${escHtml(fmtEur0(per))}</div><div class="small muted"><span>noch ${left} ${left === 1 ? "Tag" : "Tage"} bis Monatsende</span></div>` : `<div class="hxbig">${escHtml(fmtEur0(avg))}</div><div class="small muted"><span>Ø pro Tag im Alltag</span></div>`}
      <div class="hxbar" style="margin-top:12px"><i style="width:${pct}%"></i></div>
      <div class="meta-row small" style="margin-top:6px"><span class="muted">${pct} % des Monats vorbei</span></div></div>`;
  }
  {
    const paid = c.paid || {},
      open = fixedForMonth(ym, true)
        .filter((f) => !(f.id in paid))
        .map((f) => ({
          f,
          d: fixDay(f, ym),
          v: planAmt(f, ym),
        }));
    const soon =
      ym === cur
        ? open.filter((x) => x.d != null && x.d >= today && x.d <= today + 6).sort((a, b) => a.d - b.d)
        : open.sort((a, b) => (a.d || 99) - (b.d || 99)).slice(0, 5);
    const rest = open.length - soon.length,
      when = (d) => (d === today ? "heute" : d === today + 1 ? "morgen" : `in ${d - today} Tagen`);
    out.week = `<div class="card">${hxHead("week", ym === cur ? "Diese Woche fällig" : "Noch offen im " + mon, hxGo("fix", "Fixkosten"))}
      ${!open.length ? `<div class="hxok">${svgIcon("check", 18)}<span>Alle Fixkosten bezahlt</span></div>` : soon.length ? `<div class="hxlist">${soon.map((x) => `<div class="hxrow"><span class="hxd">${x.d ? `<b>${x.d}.</b>` : "–"}</span><span class="grow"><b>${escHtml(x.f.name)}</b>${ym === cur ? `<small class="muted">${when(x.d)}</small>` : ""}</span><b>${escHtml(fmtEur(x.v))}</b></div>`).join("")}</div>` : `<div class="hxok">${svgIcon("check", 18)}<span>Nichts fällig in den nächsten 7 Tagen</span></div>`}
      ${
        rest > 0
          ? `<div class="small muted" style="margin-top:8px"><span>${rest} weitere noch offen</span> · <b>${escHtml(
              fmtEur(
                sum(
                  open.filter((x) => !soon.includes(x)),
                  (x) => x.v
                )
              )
            )}</b></div>`
          : ""
      }</div>`;
  }
  {
    const top = g.filter((x) => x.v > 0).slice(0, 5),
      tot = sum(g, (x) => x.v),
      restV = tot - sum(top, (x) => x.v),
      R = 42,
      C = 2 * Math.PI * R;
    let off = 0;
    const segs = [
      ...top.map((x) => ({
        l: x.label || x.cat,
        v: x.v,
        col: catColor(x.kind, x.cat),
      })),
      ...(restV > 0.5
        ? [
            {
              l: "Rest",
              v: restV,
              col: "var(--line)",
            },
          ]
        : []),
    ];
    out.topcat = `<div class="card">${hxHead("topcat", "Top-Kategorien", hxGo("year", "Analyse"))}
      ${
        !tot
          ? `<span class="small muted">Noch keine Ausgaben</span>`
          : `<div class="hxdonut"><svg viewBox="0 0 100 100" aria-hidden="true">${segs
              .map((x) => {
                const len = (x.v / tot) * C,
                  el = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${x.col}" stroke-width="13" stroke-dasharray="${Math.max(0, len - 1.2)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 50 50)"/>`;
                off += len;
                return el;
              })
              .join("")}
        <text x="50" y="47" text-anchor="middle" class="hxdt">${escHtml(fmtEur0(tot))}</text><text x="50" y="60" text-anchor="middle" class="hxds">${escHtml(mon)}</text></svg>
        <div class="hxleg">${segs.map((x) => `<div><i style="background:${x.col}"></i><span>${escHtml(x.l)}</span><b>${escHtml(fmtEur0(x.v))}</b><small class="muted">${Math.round((x.v / tot) * 100)} %</small></div>`).join("")}</div></div>`
      }</div>`;
  }
  {
    const pc = monthCalc(shiftYm(ym, -1)),
      pm = MONTHS[ymParts(shiftYm(ym, -1))[1] - 1],
      run = ym === cur;
    const upTo = (l) => (run ? l.filter((t) => Number((t.date || "").slice(8, 10)) <= today) : l);
    const cI = run
        ? sum(
            c.tx.filter((t) => t.kind === "einnahme"),
            (t) => t.amount
          )
        : c.income,
      cE = run ? spent : c.expenses;
    const pI = run ? sum(upTo(pc.tx.filter((t) => t.kind === "einnahme")), (t) => t.amount) : pc.income,
      pE = run ? sum(upTo(pc.tx.filter(hxOut)), (t) => t.amount) : pc.expenses;
    const mx = Math.max(1, cI, pI, cE, pE);
    const row = (l, a, b, col, good) => {
      const d = b > 0 ? Math.round((a / b - 1) * 100) : 0,
        up = d > 0,
        ok = good ? up : !up;
      return `<div class="hxcmp"><div class="meta-row"><span><b>${escHtml(l)}</b></span>${b > 0 && d ? `<span class="hxchip ${ok ? "good" : "bad"}">${up ? "↑" : "↓"} ${Math.abs(d)} %</span>` : ""}</div>
        <div class="hxpair"><small class="muted">${escHtml(mon)}</small><div class="hxbar"><i style="width:${(a / mx) * 100}%;background:${col}"></i></div><b>${escHtml(fmtEur0(a))}</b></div>
        <div class="hxpair"><small class="muted">${escHtml(pm)}</small><div class="hxbar"><i style="width:${(b / mx) * 100}%;background:${col};opacity:.4"></i></div><b class="muted">${escHtml(fmtEur0(b))}</b></div></div>`;
    };
    out.compare = `<div class="card">${hxHead("compare", "Vergleich zum Vormonat")}${row("Einnahmen", cI, pI, "var(--accent)", true)}${row("Ausgaben", cE, pE, "var(--bad)", false)}
      ${run ? `<div class="small muted" style="margin-top:4px"><span>Verglichen mit den gleichen Tagen im Vormonat</span></div>` : ""}</div>`;
  }
  {
    const end = new Date(asOf + "T12:00:00"),
      pts = [];
    let est = false;
    if (mainName)
      for (let i = 29; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(d.getDate() - i);
        const v = accountBalance(mainName, isoOf(d));
        if (v === null) {
          pts.length = 0;
          break;
        }
        pts.push(v);
      }
    if (!pts.length) {
      est = true;
      const sg = (t) =>
        t.kind === "einnahme" ? t.amount : ["ausgabe", "betrieb", "vorauszahlung"].includes(t.kind) ? -t.amount : 0;
      let b = mainBal;
      const by = {};
      for (const t of store.tx) by[t.date] = (by[t.date] || 0) + sg(t);
      for (let i = 0; i < 30; i++) {
        const d = new Date(end);
        d.setDate(d.getDate() - i);
        pts.unshift(b);
        b -= by[isoOf(d)] || 0;
      }
    }
    const mn = Math.min(...pts),
      mx = Math.max(...pts),
      rg = mx - mn || 1,
      W = 300,
      H = 90;
    const xy = pts.map((v, i) => [((i / 29) * W).toFixed(1), (H - 6 - ((v - mn) / rg) * (H - 14)).toFixed(1)]),
      line = xy.map((p, i) => (i ? "L" : "M") + p.join(" ")).join(" ");
    const delta = pts[29] - pts[0];
    out.trend = `<div class="card">${hxHead("trend", "Kontoverlauf")}
      <div class="meta-row"><span class="hxbig" style="font-size:26px">${escHtml(fmtEur(pts[29]))}</span><span class="hxchip ${delta >= 0 ? "good" : "bad"}">${delta >= 0 ? "+" : "−"} ${escHtml(fmtEur0(Math.abs(delta)))}</span></div>
      <svg class="hxspark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${line} L${W} ${H} L0 ${H}Z" fill="var(--accent)" opacity=".12"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>
      <div class="meta-row small"><span class="muted">Letzte 30 Tage</span><span><span class="muted">Tiefster Stand</span> <b>${escHtml(fmtEur0(mn))}</b> · <span class="muted">Höchster Stand</span> <b>${escHtml(fmtEur0(mx))}</b></span></div>
      ${est ? `<div class="small muted" style="margin-top:4px">geschätzt aus deinen Buchungen</div>` : ""}</div>`;
  }
  {
    const A = aboCfg(),
      per = {
        monatlich: 1,
        quartal: 1 / 3,
        halbjahr: 1 / 6,
        jahr: 1 / 12,
      };
    const list = store.fixed
      .filter((f) => !debtFor(f.id) && (fixArea(f) === "Abos & Handy" || A[f.id]))
      .map((f) => ({
        f,
        m: planAmt(f, ymOf(new Date())) * (per[f.rhythm || "monatlich"] ?? 1),
        dl: aboDeadline(A[f.id]),
      }))
      .sort((a, b) => b.m - a.m);
    const tot = sum(list, (x) => x.m);
    out.abos = `<div class="card">${hxHead("abos", "Abos", hxGo("fix", "Fixkosten"))}
      ${
        !list.length
          ? `<span class="small muted">Keine Abos gefunden</span>`
          : `<div class="meta-row"><span><b class="hxbig" style="font-size:26px">${escHtml(fmtEur(tot))}</b> <span class="muted small">pro Monat</span></span><span class="small"><b>${escHtml(fmtEur0(tot * 12))}</b> <span class="muted">pro Jahr</span></span></div>
      <div class="hxlist" style="margin-top:10px">${list
        .slice(0, 6)
        .map(
          (x) =>
            `<div class="hxrow"><span class="grow"><b>${escHtml(x.f.name)}</b>${x.dl ? `<small class="muted"><span>Kündigen bis</span> ${escHtml(new Date(x.dl + "T12:00").toLocaleDateString("de-DE"))}</small>` : ""}</span><b>${escHtml(fmtEur(x.m))}</b></div>`
        )
        .join("")}</div>
      ${list.length > 6 ? `<div class="small muted" style="margin-top:6px"><span>${list.length - 6} weitere</span></div>` : ""}`
      }</div>`;
  }
  {
    const top = spentList
      .slice()
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    out.biggest = `<div class="card">${hxHead("biggest", "Größte Ausgaben", top.length ? hxGo("list", "Alle") : "")}
      ${top.length ? `<div class="tline">${top.map((t) => tlRow(t, shortDate(t.date))).join("")}</div>` : `<span class="small muted">Keine Ausgaben in diesem Monat</span>`}</div>`;
  }
  {
    const noCat = c.tx.filter((t) => hxOut(t) && (!t.cat || t.cat === "Sonstiges")).length,
      noRc = spentList.filter((t) => t.amount >= 50 && !hasReceipt(t.id)).length;
    const A = aboCfg(),
      td = isoToday(),
      dl = store.fixed.filter((f) => {
        const d = aboDeadline(A[f.id]);
        return d && d >= td && (new Date(d + "T12:00") - new Date(td + "T12:00")) / 864e5 <= 30;
      }).length;
    const items = [
      [noCat, "Buchungen ohne Kategorie", "list", "tag"],
      [ym <= cur ? c.openCount : 0, "Fixkosten noch nicht abgehakt", "fix", "list"],
      [noRc, "Ausgaben ab 50 € ohne Beleg", "list", "receipt"],
      [dl, "Abo-Kündigungsfrist läuft bald ab", "fix", "alert"],
    ].filter((x) => x[0] > 0);
    out.todo = `<div class="card">${hxHead("todo", "Zu erledigen")}
      ${items.length ? `<div class="hxlist">${items.map(([n, l, go, i]) => `<button class="hxrow hxbtn" data-go="${go}"><span class="hxn">${n}</span><span class="grow">${svgIcon(i, 16)} <span>${escHtml(l)}</span></span>${svgIcon("right", 16)}</button>`).join("")}</div>` : `<div class="hxok">${svgIcon("check", 18)}<span>Alles erledigt</span></div>`}</div>`;
  }
  return out;
}
/* Ringe */
function ring(pct, icon, cls) {
  const R = 25,
    C = 2 * Math.PI * R,
    p = Math.max(0, Math.min(1, pct));
  return `<span class="ring ${cls || ""}"><svg class="rs" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="${R}" fill="none" stroke="var(--line)" stroke-width="4.5"/>${p > 0 ? `<circle cx="30" cy="30" r="${R}" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${Math.max(0.01, p * C - 0.01)} ${C}" transform="rotate(-90 30 30)"/>` : ""}</svg><span class="ri">${svgIcon(icon, 22)}</span></span>`;
}
function goalIcon(n) {
  n = normText(n);
  return /urlaub|reise|flug|ferien/.test(n)
    ? "plane"
    : /auto|wagen|motorrad|führerschein/.test(n)
      ? "car"
      : /hochzeit|liebe|geschenk|geburtstag|weihnacht/.test(n)
        ? "gift"
        : /haus|wohnung|umzug|möbel|kaution/.test(n)
          ? "home"
          : /not|reserve|puffer|sicher/.test(n)
            ? "shield"
            : "piggy";
}
function goalsRings() {
  const goals = store.settings.goals || [];
  const ig = (store.settings.inv && store.settings.inv.goals) || [];
  return `<div class="card rcard" style="order:7"><div class="card-head"><h2>${headIcon("piggy")}Ziele</h2>${goals.length ? `<button class="link" data-goalsopen="1">${ui.goalsOpen || ui.goalEdit ? "Weniger" : "Alle anzeigen"} ${svgIcon(ui.goalsOpen || ui.goalEdit ? "chevron" : "right", 16)}</button>` : ""}</div>
    <div class="jars">${goals
      .map((g) => {
        const sv = goalSaved(g),
          t = Number(g.target) || 0,
          pct = t ? Math.max(0, Math.min(1, sv.v / t)) : 0,
          done = t > 0 && sv.v >= t;
        return `<button class="jarb" data-goalsopen="1" aria-label="${escHtml(g.name)}: ${escHtml(fmtEur(sv.v))} von ${escHtml(fmtEur(t))}"><span class="jar ${done ? "done" : ""}"><span class="w" style="height:${Math.round(pct * 82)}%"></span><span class="goal"></span><span class="ji">${svgIcon(goalIcon(g.name), 18)}</span><span class="jp ${pct < 0.3 ? "low" : ""}">${done ? "✓" : Math.round(pct * 100) + " %"}</span></span><b>${escHtml(g.name)}</b><small>${escHtml(fmtEur0(sv.v).replace(/\s?€/, ""))} / ${escHtml(fmtEur0(t))}</small></button>`;
      })
      .join("")}
      ${ig
        .map((g) => {
          const R = invGoal(g),
            pct = Math.max(0, Math.min(1, R.last / (g.T || 1))),
            done = R.last >= g.T;
          return `<button class="jarb" data-anlopen="goals" aria-label="${escHtml(g.name)}: ${escHtml(fmtEur(R.last))} von ${escHtml(fmtEur(g.T))}, ${invPct(g.r)} % Zins"><span class="jar inv ${done ? "done" : ""}"><span class="w" style="height:${Math.round(pct * 82)}%"></span><span class="goal"></span><span class="ji">${svgIcon("chart", 18)}</span><span class="jp ${pct < 0.3 ? "low" : ""}">${Math.round(pct * 100)} %</span></span><b>${escHtml(g.name)}</b><small><span class="jz">${invPct(g.r)} %</span> ${escHtml(fmtEur0(R.last))} / ${escHtml(fmtEur0(g.T))}</small></button>`;
        })
        .join("")}
      <button class="jarb" data-goalnew="1" aria-label="Ziel hinzufügen"><span class="jar add">${svgIcon("plusIn", 24)}</span><b>${goals.length || ig.length ? "Neu" : "Ziel anlegen"}</b><small>&nbsp;</small></button>
    </div>${ui.goalNew ? `<div class="goalnew"><button class="btn" id="${goals.length ? "goalAddRing" : "goalFirst"}">${svgIcon("piggy", 16)} Sparziel<small>Geld zur Seite legen</small></button><button class="btn" data-anlopen="goals">${svgIcon("chart", 16)} Mit Zinsen<small>Anlage, z. B. ETF</small></button></div>` : ""}</div>`;
}

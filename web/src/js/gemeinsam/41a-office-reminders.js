/* ===== Amt: gemeinsame Helfer und Termin-Wecker ===== */
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

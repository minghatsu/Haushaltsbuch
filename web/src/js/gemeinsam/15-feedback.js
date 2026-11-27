/* Dankeskarte + Feedback-Knopf für Tester */
const TESTPHASE = true;
const DANKE = {
  preview: false,
};
function fbQuickOn() {
  return true;
}
function fbQuickBtn() {
  let b = $("fbQuick");
  const q = $("ptourQ");
  if (!fbQuickOn() || !q) {
    if (b) b.remove();
    return;
  }
  if (!b) {
    b = document.createElement("button");
    b.id = "fbQuick";
    b.type = "button";
    b.className = "ptq fbq roundbtn";
    b.setAttribute("aria-label", "Feedback geben");
    b.title = "Feedback geben – Fehler, Ideen, Fragen";
    b.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M12 8v4M12 15.5v.01"/></svg>`;
    b.onclick = () => fbQuickGo();
  }
  if (q.classList.contains("ptqph")) b.classList.add("ptqph");
  else b.classList.remove("ptqph");
  if (b.nextElementSibling !== q) q.before(b);
}
function dankeShould() {
  try {
    if (localStorage.getItem("hb-danke")) return false;
  } catch (_) {
    return false;
  }
  if ($("langBg")) return false;
  return (
    TESTPHASE &&
    !BG_RUN &&
    !updKey() &&
    !(typeof actNeed === "function" && actNeed()) &&
    !($("loginBg") && !$("loginBg").hidden) &&
    !$("dankeBg")
  );
}
function dankeOpen(preview) {
  if ($("dankeBg")) return;
  DANKE.preview = !!preview;
  try {
    if (!preview) localStorage.setItem("hb-danke", "1");
  } catch (_) {}
  const el = document.createElement("div");
  el.id = "dankeBg";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Danke fürs Testen");
  const sp = [
    [18, "-20deg", 2.1],
    [78, "15deg", 2.3],
    [48, "5deg", 2.5],
    [30, "25deg", 2.8],
    [66, "-10deg", 2.9],
  ]
    .map(([x, r, d]) => `<span class="dkspark" style="left:${x}%;top:66%;--r:${r};animation-delay:${d}s">✨</span>`)
    .join("");
  el.innerHTML = `<div class="dkenv" style="z-index:1"><div class="bk"></div><div class="fl"></div></div><div class="dkenv" style="z-index:3"><div class="fr"></div></div>
    <div class="dkcard"><div class="dkbadge"><svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.8 7 8.2 6 8.2-6"/></svg></div>
      <h2 class="dkin" style="animation-delay:2.15s">Danke dir!</h2>
      <p class="dkin" style="animation-delay:2.35s">Du bist einer der Ersten, die Finanz MAMI testen. Das bedeutet mir viel.</p>
      <p class="dkin" style="animation-delay:2.55s">${trBold("Es ist noch eine Testversion – manches kann noch verbuggt sein. Sag mir bitte über den **Feedback-Knopf** Bescheid, wenn dir etwas auffällt.")}</p>
      <div class="dksig">Sascha</div>
      <button class="btn primary dkin" style="animation-delay:3.7s" data-dkok>Alles klar</button></div>${sp}`;
  document.body.appendChild(el);
  document.body.classList.add("locked");
  el.querySelector("[data-dkok]").onclick = () => {
    el.classList.add("out");
    setTimeout(() => {
      el.remove();
      document.body.classList.remove("locked");
      dankeSpot();
    }, 280);
  };
}
function dankeSpot() {
  fbQuickBtn();
  if (!DANKE.preview && (ui.wiz || wizShould())) {
    const wb = $("wizBg");
    if (!ui.wiz || !wb || wb.hidden) wizOpen();
    return;
  }
  if (!$("fbQuick")) {
    DANKE.preview = false;
    return;
  }
  TOUR.page = "danke";
  TOUR.steps = [
    {
      sel: "#fbQuick",
      ic: "insight",
      t: "Fehler gefunden? Hier tippen!",
      p: [
        "Mit diesem Knopf schickst du mir jederzeit Fehler, Ideen oder Fragen – von jeder Seite aus.",
        uiText("trh_fbrec"),
      ],
    },
  ];
  tourGo(0);
}
function helpMenu() {
  let m = $("helpMenu");
  if (m && !m.hidden) {
    m.hidden = true;
    return;
  }
  if (!m) {
    m = document.createElement("div");
    m.id = "helpMenu";
    m.className = "helpmenu";
    m.setAttribute("role", "menu");
    document.body.appendChild(m);
  }
  const inbox = $("pcInbox"),
    nIn = inbox ? Number((inbox.querySelector(".badge") || {}).textContent) || 0 : 0;
  m.innerHTML = [
    PTOUR[ui.view] ? ["tour", "🧭", "Tour zu dieser Seite"] : null,
    ["faq", "❓", "Fragen & Antworten"],
    ["neu", "✨", "Neu in dieser Version"],
    ["big", "🎓", "Große Tour durch die App"],
    canShare() ? ["weiter", "📲", "App weitergeben (QR-Code)"] : null,
    updKey() ? ["danke", "💌", "Dankeskarte (Tester) ansehen"] : null,
  ]
    .filter(Boolean)
    .map(([k, i, l]) => `<button role="menuitem" data-help="${k}"><span>${i}</span>${l}</button>`)
    .join("");
  const b = $("ptourQ").getBoundingClientRect();
  m.hidden = false;
  m.style.top = b.bottom + 8 + "px";
  m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, b.left - 8)) + "px";
}
document.addEventListener("click", (e) => {
  const h = e.target.closest("[data-help]"),
    m = $("helpMenu");
  if (!h) {
    if (m && !m.hidden && !e.target.closest("#helpMenu,#ptourQ")) m.hidden = true;
    return;
  }
  m.hidden = true;
  const k = h.dataset.help;
  if (k === "tour") ptourOpen(ui.view);
  else if (k === "faq") accGo("hilfe");
  else if (k === "fb") accGo("feedback");
  else if (k === "neu") accGo("neu");
  else if (k === "big") tourOpen();
  else if (k === "danke") dankeOpen(true);
  else if (k === "weiter") invOpen();
  else if (k === "inbox") {
    const ib = $("pcInbox");
    if (ib) ib.click();
  }
});
document.addEventListener("keydown", (e) => {
  const m = $("helpMenu");
  if (e.key === "Escape" && m && !m.hidden) m.hidden = true;
});
document.addEventListener("click", (e) => {
  const pg = e.target.closest("[data-ptgo]");
  if (pg) {
    const v = pg.dataset.ptgo;
    try {
      if (spsOpen()) spSheetClose();
    } catch (_) {}
    ui.view = v;
    render();
    window.scrollTo({
      top: 0,
    });
    setTimeout(() => ptourOpen(v), 500);
    return;
  }
  if (e.target.closest("#ptourQ")) {
    e.preventDefault();
    helpMenu();
  }
});
addEventListener("resize", () => {
  if (TOUR.i < 0) return;
  tourPlace();
  /* Nach dem Drehen ordnen sich Leiste und Karten noch kurz neu – dann den Ring nachziehen */
  (tourPlace.t || []).forEach(clearTimeout);
  tourPlace.t = [450, 1000].map((ms) => setTimeout(() => TOUR.i >= 0 && tourPlace(), ms));
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tour]");
  if (!b) return;
  const a = b.dataset.tour;
  if (a === "open") {
    tourOpen();
    return;
  }
  if (a === "go") tourGo(0);
  else if (a === "next") tourGo(TOUR.i + 1);
  else if (a === "back") tourGo(Math.max(0, TOUR.i - 1));
  else tourClose();
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-faq]");
  if (!b) return;
  const i = +b.dataset.faq;
  ui.faqOpen = ui.faqOpen === i ? null : i;
  renderHilfe();
});
async function fbQuickGo() {
  if (FB_PAGES.some((p) => p[0] === ui.view) && !(ui.fbDraft || "").trim()) ui.fbPages = [ui.view];
  ui.fbRecLog = typeof dbgSince === "function" ? dbgSince(30000) : "";
  ui.fbShot = null;
  ui.fbShotOn = false;
  const shot = hbShot();
  ui.fbShot = await Promise.race([shot, new Promise((r) => setTimeout(() => r(null), 700))]);
  fbFloatOpen();
  if (!ui.fbShot)
    shot.then((u) => {
      if (u) {
        ui.fbShot = u;
        renderFeedback();
      }
    });
}
function fbFloatEl() {
  let bg = $("fbFloatBg");
  if (bg) return bg;
  bg = document.createElement("div");
  bg.id = "fbFloatBg";
  bg.className = "backdrop fbfloat";
  bg.hidden = true;
  bg.innerHTML = `<div class="sheet fbsheet" role="dialog" aria-modal="true" aria-label="Feedback"><div class="sheet-head"><h2>Feedback</h2><button class="icon-btn" data-fbx="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>`;
  document.body.appendChild(bg);
  const ed = $("fbEd");
  if (ed) {
    ed.removeAttribute("data-sp");
    ed.classList.remove("sp", "card");
    ed.hidden = false;
    bg.querySelector(".sheet").appendChild(ed);
  }
  bg.addEventListener("click", (e) => {
    if (e.target === bg || e.target.closest("[data-fbx]")) fbFloatClose();
  });
  return bg;
}
function fbFloatOpen() {
  const bg = fbFloatEl();
  bg.hidden = false;
  document.body.classList.add("locked");
  renderFeedback();
  requestAnimationFrame(() => bg.classList.add("show"));
}
function fbFloatClose() {
  const bg = $("fbFloatBg");
  if (!bg || bg.hidden) return;
  bg.classList.remove("show");
  document.body.classList.remove("locked");
  setTimeout(() => {
    bg.hidden = true;
  }, 220);
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const bg = $("fbFloatBg");
    if (bg && !bg.hidden) fbFloatClose();
  }
});
const FB_PAGES = [
  ["home", "Start"],
  ["beruf", "Beruf"],
  ["zukunft", "Sparen"],
  ["shop", "Einkauf"],
  ["list", "Buchungen"],
  ["fix", "Fixkosten"],
  ["year", "Analyse"],
  ["more", "Einstellungen"],
];
function fbText() {
  const t = ($("fbTxt") || {}).value || "";
  const info = ($("fbInfo") || {}).checked;
  const pg = (ui.fbPages || []).map((k) => (FB_PAGES.find((p) => p[0] === k) || [, k])[1]);
  return (
    (t.trim() ? "📍 " + (pg.length ? pg.join(", ") : "allgemein") + "\n" : "") +
    t.trim() +
    (info
      ? `\n\n---\nFinanz MAMI ${verFull()} · ${window.AndroidBridge ? GERAET_NAME : "Browser"} · ${(WORK.find((x) => x[0] === store.settings.work) || [, "–"])[1]}`
      : "")
  );
}
const FB_MAX_IMG = 4;
async function fbShrink(file) {
  const bmp = await createImageBitmap(file),
    k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)),
    c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}
function renderFeedback() {
  const el = $("fbEd");
  if (!el) return;
  if (document.activeElement && document.activeElement.id === "fbTxt" && el.contains(document.activeElement)) return;
  const imgs = ui.fbImgs || (ui.fbImgs = []);
  const kind = ui.fbKind || "idee",
    mail = IMPRESSUM.mail || FEEDBACK_MAIL;
  const pgs = ui.fbPages || (ui.fbPages = []);
  const KD = [
      ["fehler", "Fehler", "🐞", "#c2410c"],
      ["idee", "Idee", "💡", "#3d63a8"],
      ["lob", "Lob", "💚", "#1a7a5c"],
    ],
    kc = (KD.find((x) => x[0] === kind) || KD[1])[3];
  const dev = window.AndroidBridge ? GERAET_NAME : "Browser",
    grp = (WORK.find((x) => x[0] === store.settings.work) || [, "–"])[1],
    info = ui.fbInfo !== false;
  el.innerHTML = `<div class="fbwrap" style="--kc:${kc}"><div class="fbcol">
    <div class="fbpgh">Was möchtest du melden?</div>
    <div class="fbk">${KD.map(([k, l, e, c]) => `<button class="${kind === k ? "on" : ""}" data-fbk="${k}" aria-pressed="${kind === k}" style="--c:${c}"><span>${e}</span>${l}</button>`).join("")}</div>
    <div class="fbpgh">Wo ist es? <span>(mehrere möglich)</span></div>
    <div class="fbpg">${FB_PAGES.map(([k, l]) => {
      const on = pgs.includes(k),
        sv = document.querySelector(`.tabs .tab[data-go="${k}"] svg`);
      return `<button type="button" class="${on ? "on" : ""}" data-fbpg="${k}" aria-pressed="${on}">${sv ? sv.outerHTML : ""}<span>${l}</span></button>`;
    }).join("")}</div>
    </div><div class="fbcol fbmsg">
    <div class="fbmh"><span class="fbkb">${(KD.find((x) => x[0] === kind) || KD[1])[2]} <span>${(KD.find((x) => x[0] === kind) || KD[1])[1]}</span></span>${pgs.map((k) => `<span class="fbpb">${escHtml((FB_PAGES.find((p) => p[0] === k) || [, k])[1])}</span>`).join("")}</div>
    <textarea class="in fbta" id="fbTxt" rows="6" aria-label="Deine Nachricht" placeholder="${escHtml(tr(kind === "fehler" ? "Was ist passiert? Was hast du davor gemacht?" : kind === "lob" ? "Was gefällt dir?" : "Was wünschst du dir?"))}">${escHtml(ui.fbDraft || "")}</textarea>
    <div class="fbimgs">${imgs.map((u, i) => `<div class="t"><img src="${u}" alt="Bild ${i + 1}"><button data-fbimgdel="${i}" aria-label="Bild ${i + 1} entfernen">×</button></div>`).join("")}${imgs.length < FB_MAX_IMG ? `<button class="add" id="fbImgAdd"><b>＋</b>Bild</button>` : ""}</div>
    <input type="file" id="fbImgFile" accept="image/*" multiple hidden>
    ${
      kind === "fehler"
        ? `<div class="fbrec">
      <label class="lgchk fbinfo"><input type="checkbox" id="fbRec" ${ui.fbRec !== false ? "checked" : ""}><span>${uiText("fb_rec")} <small>${uiText("fb_rec_s")}</small></span></label>
      ${
        ui.fbRecLog
          ? `<div class="fbrecn">${svgIcon("clock", 13)}${uiText("fb_rec_n", {
              n: ui.fbRecLog.split("\n").length,
            })}</div>`
          : ""
      }
      ${ui.fbShot ? `<label class="lgchk fbinfo fbshot"><input type="checkbox" id="fbShotOn" ${ui.fbShotOn ? "checked" : ""}><span>${uiText("fb_shot")} <small>${uiText("fb_shot_s")}</small></span><img src="${ui.fbShot}" alt="" class="${ui.fbShotOn ? "on" : ""}"></label>` : ""}</div>`
        : ""
    }
    <label class="lgchk fbinfo"><input type="checkbox" id="fbInfo" ${info ? "checked" : ""}><span>Diese Infos mitschicken <small>(keine Finanzdaten)</small></span></label>
    <div class="fbkv ${info ? "" : "off"}"><div><small>Version</small><b>${escHtml(curVerShort())}</b></div><div><small>Rolle</small><b>${escHtml(verRole())}</b></div><div><small>Gerät</small><b>${escHtml(dev)}</b></div><div><small>Gruppe</small><b>${escHtml(grp)}</b></div></div>
    <div class="row-btns fbbtns"><button class="btn primary" id="fbSend" ${ui.fbBusy ? "disabled" : ""}>${ui.fbBusy ? "Wird gesendet …" : "Senden"}</button><button class="btn" id="fbCopy">Text kopieren</button></div>
    <p class="small muted" style="margin:10px 0 0">Geht direkt aus der App an den Entwickler – ohne E-Mail-Programm.${mail ? ` Klappt das nicht, geht es auch <button class="link small" id="fbMail">per E-Mail</button>.` : ""}</p>
    </div></div>`;
}
async function fbPost(body) {
  const base = pairUrl();
  if (!base) throw new Error("Kein Server eingestellt");
  const url = apiUrl(base, "feedback", ""),
    js = JSON.stringify(body);
  let r;
  if (NATIVE && window.AndroidBridge && window.AndroidBridge.http) {
    r = await new Promise((res) => {
      const id = newId();
      httpWaiting[id] = res;
      window.AndroidBridge.http(id, "POST", url, "", js);
    });
    if (!r.status) throw new Error("Keine Verbindung");
  } else {
    const f = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: js,
      cache: "no-store",
    });
    r = {
      status: f.status,
      text: await f.text(),
    };
  }
  let j = {};
  try {
    j = JSON.parse(r.text);
  } catch (e) {}
  if (r.status < 200 || r.status >= 300) {
    throw new Error(j.error || "Server antwortet mit " + r.status);
  }
  return j;
}

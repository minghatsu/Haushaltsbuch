/* Einladungen */
const INV_PAGE = "https://miracleframe.synology.me/haushaltsbuch/i.html";
function actGet() {
  try {
    return JSON.parse(localStorage.getItem("hb-act") || "null");
  } catch (e) {
    return {
      k: "root",
    };
  }
}
function actSet(o) {
  try {
    localStorage.setItem("hb-act", JSON.stringify(o));
  } catch (e) {}
}
(function () {
  try {
    if (!localStorage.getItem("hb-act") && localStorage.getItem("hb-legal"))
      actSet({
        k: "root",
      });
  } catch (e) {}
})();
const actNeed = () => !actGet() && !window.claude && !!pairUrl();
const canInvite = () => !!pairUrl() && !!updKey();
/* Weitergeben dürfen alle freigeschalteten Tester – gemeinsame Testplätze, siehe Server */
const canShare = () => !!pairUrl() && (canInvite() || !!actGet());
const invCode = (s) => {
  const m =
    String(s || "")
      .toUpperCase()
      .match(/[?&](?:I=)?([A-Z0-9]{6})\b/) ||
    String(s || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .match(/^([A-Z0-9]{6})$/);
  return m ? m[1] : "";
};
const invLink = (c) => INV_PAGE + "?" + c;
async function pairCall(action, qs, body, devAuth) {
  const base = pairUrl();
  if (!base) throw new Error("Kein Server eingestellt");
  const url = apiUrl(base, action, qs || ""),
    js = body ? JSON.stringify(body) : "",
    auth = devAuth && updKey() ? "Dev " + updKey() : "";
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
      }, 30000);
      window.AndroidBridge.http(id, body ? "POST" : "GET", url, auth, js);
    });
    if (!r.status) throw new Error("Keine Verbindung – bist du online?");
  } else {
    let f;
    try {
      f = await fetch(url, {
        method: body ? "POST" : "GET",
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
        body: body ? js : undefined,
        cache: "no-store",
      });
    } catch (_) {
      throw new Error("Keine Verbindung – bist du online?");
    }
    r = {
      status: f.status,
      text: await f.text(),
    };
  }
  let j = {};
  try {
    j = JSON.parse(r.text);
  } catch (e) {}
  if (r.status < 200 || r.status >= 300) throw new Error(j.error || "Server antwortet mit " + r.status);
  return j;
}
const LANG_PICKER = [
  ["de", "🇩🇪", "Hallo!", "Wähle deine Sprache", "Weiter"],
  ["en", "🇬🇧", "Hello!", "Choose your language", "Continue"],
  ["tr", "🇹🇷", "Merhaba!", "Dilini seç", "Devam"],
  ["ru", "🇷🇺", "Привет!", "Выбери язык", "Далее"],
  ["uk", "🇺🇦", "Привіт!", "Обери мову", "Далі"],
  ["pl", "🇵🇱", "Cześć!", "Wybierz język", "Dalej"],
  ["ar", "🇸🇦", "مرحبا!", "اختر لغتك", "متابعة"],
  ["ro", "🇷🇴", "Salut!", "Alege limba", "Continuă"],
];
function langGate(next) {
  let need = false;
  try {
    need = !localStorage.getItem("hb-lang") && !localStorage.getItem("hb-legal") && !BG_RUN && !window.claude;
  } catch (e) {}
  if (!need) {
    next();
    return;
  }
  const el = document.createElement("div");
  el.id = "langBg";
  el.className = "langbg";
  el.setAttribute("data-noi18n", "");
  document.body.appendChild(el);
  document.body.classList.add("locked");
  el.innerHTML = `<div class="langbox" role="dialog" aria-modal="true" aria-labelledby="lgGr"><div class="lglogo">${svgIcon("wallet", 28)}</div><div class="lggr" id="lgGr" aria-live="polite"></div><div class="lgsub" id="lgSub">${LANG_PICKER[0][3]}</div>
    <div class="lggrid">${LANG_PICKER.map((l, k) => `<button class="lgtile" data-lg="${k}" lang="${l[0]}"><i>${l[1]}</i>${escHtml((LANGS.find((x) => x[0] === l[0]) || [])[1] || l[0])}</button>`).join("")}</div>
    <button class="btn primary lggo" id="lgGo" disabled>${LANG_PICKER[0][4]}</button></div>`;
  const gr = $("lgGr"),
    calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cur = null,
    i = 0,
    sel = -1;
  const show = (k) => {
    const sp = document.createElement("span");
    sp.textContent = LANG_PICKER[k][2];
    sp.dir = "auto";
    sp.className = calm ? "gi" : "gd";
    gr.appendChild(sp);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        sp.className = "gi";
        if (cur) {
          const c = cur;
          c.className = "gu";
          setTimeout(() => c.remove(), 600);
        }
        cur = sp;
      })
    );
    el.querySelectorAll(".lgtile").forEach((t, j) => t.classList.toggle("hi", j === k && sel < 0));
    if (sel < 0 && $("lgSub")) {
      $("lgSub").textContent = LANG_PICKER[k][3];
      $("lgGo").textContent = LANG_PICKER[k][4];
    }
  };
  show(0);
  const tm = setInterval(() => {
    if (!document.body.contains(el)) {
      clearInterval(tm);
      return;
    }
    if (sel >= 0) return;
    i = (i + 1) % LANG_PICKER.length;
    show(i);
  }, 1500);
  el.addEventListener("click", (e) => {
    const t = e.target.closest("[data-lg]");
    if (t) {
      sel = +t.dataset.lg;
      el.querySelectorAll(".lgtile").forEach((x, j) => {
        x.classList.toggle("on", j === sel);
        x.classList.remove("hi");
      });
      show(sel);
      $("lgSub").textContent = LANG_PICKER[sel][3];
      const g = $("lgGo");
      g.textContent = LANG_PICKER[sel][4];
      g.disabled = false;
      const rtl = LANG_PICKER[sel][0] === "ar" ? "rtl" : "ltr";
      $("lgSub").dir = rtl;
      g.dir = rtl;
      return;
    }
    if (e.target.closest("#lgGo") && sel >= 0) {
      clearInterval(tm);
      I18N.set(LANG_PICKER[sel][0]);
      try {
        render();
      } catch (_) {}
      el.classList.add("out");
      setTimeout(
        () => {
          el.remove();
          document.body.classList.remove("locked");
          next();
        },
        calm ? 0 : 280
      );
    }
  });
}
const GW_LOGO =
  "data:image/webp;base64,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";
function actGate() {
  let el = $("actBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "actBg";
    el.className = "legalbg";
    document.body.appendChild(el);
  }
  el.hidden = false;
  document.body.classList.add("locked");
  const A =
    ui.act ||
    (ui.act = {
      c: "",
      err: "",
      busy: false,
    });
  el.classList.add("gwon");
  el.innerHTML = `<div class="gwel${A.seen ? " seen" : ""}" aria-hidden="true"><div class="gwin">
      <div class="gwlg"><img src="${GW_LOGO}" alt="" width="52" height="52"><b>Finanz MAMI</b></div>
      <h3 class="gwh"><span>${escHtml(uiText("gw_h1"))}</span><span>${escHtml(uiText("gw_h2"))}</span></h3>
      <div class="gwch"><span>${escHtml(uiText("gw_c1"))}</span><span>${escHtml(uiText("gw_c2"))}</span><span>${escHtml(uiText("gw_c3"))}</span></div>
    </div></div><div class="legalbox actbox${A.seen ? " seen" : ""}" role="dialog" aria-modal="true" aria-labelledby="actT">
    <span class="lgic">${svgIcon("user", 26)}</span>
    <h2 id="actT">Willkommen bei Finanz MAMI</h2>
    <p class="small muted" style="margin:0 0 14px">Die App ist gerade nur auf Einladung nutzbar. Gib den Code ein, den du bekommen hast – er steht auch auf der Download-Seite.</p>
    <div class="otp${A.err ? " bad" : ""}" id="actOtp" aria-hidden="false"><input id="actCode" class="otpin" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" aria-label="Einladungscode, 6 Zeichen" value="${escHtml(A.c)}" data-noi18n>${"<i><b></b></i>".repeat(6)}</div>
    ${canQrLive() ? `<button class="btn block" style="justify-content:center;gap:8px;margin-top:10px" data-actscan>${svgIcon("camera", 18)} QR-Code der Einladung scannen</button>` : ""}
    ${A.found && A.c ? `<p class="small actfound">${svgIcon("check", 14)} ${uiText("act_found")}</p>` : ""}
    <p class="small" id="actErr" style="color:var(--bad);min-height:1.2em;margin:10px 0 6px">${escHtml(A.err)}</p>
    <button class="btn primary" id="actOk" ${A.busy ? "disabled" : ""}>${A.busy ? "Wird geprüft …" : "Freischalten"}</button>
    <div class="actor"><span>oder</span></div>
    <button class="btn block" style="justify-content:center;gap:8px" data-actpair>${svgIcon("phone", 18)} Ich habe die App schon – Gerät koppeln</button>
    <p class="small muted" style="margin:8px 2px 0;text-align:center">Für dein eigenes zweites Gerät brauchst du keinen Code.</p>
  </div>`;
  A.seen = true;
  otpPaint(false);
  if (!A.waited) {
    A.waited = true;
    pairCall("actwait", "", {
      dev: devId(),
    })
      .then((r) => {
        if (r && r.c && ui.act && !ui.act.c) {
          ui.act.c = r.c;
          ui.act.found = true;
          if (!$("actBg").hidden) actGate();
        }
      })
      .catch(() => {});
    try {
      if (CAN_NOTIFY && notifyPerm() !== "granted" && !localStorage.getItem("hb-actnask") && AndroidBridge.notifyAsk) {
        localStorage.setItem("hb-actnask", "1");
        setTimeout(() => {
          try {
            AndroidBridge.notifyAsk();
          } catch (_) {}
        }, 1500);
      }
    } catch (_) {}
    notifyPlanSoon();
  }
}
async function actTry() {
  const A = ui.act;
  const c = invCode(A.c);
  if (!c) {
    A.err = "Der Code hat 6 Zeichen, z. B. K7P2QX.";
    actGate();
    return;
  }
  A.busy = true;
  A.err = "";
  actGate();
  try {
    const r = await pairCall("activate", "", {
      c,
      dev: devId(),
    });
    actSet({
      k: r.invite ? "tester" : "inv",
      c,
    });
    ui.act = null;
    notifyPlanSoon();
    const w = $("actOtp"),
      okb = $("actOk");
    if (w && !reducedMotion()) {
      w.classList.add("ok");
      if (okb) {
        okb.disabled = false;
        okb.innerHTML = `${svgIcon("check", 18)} Freigeschaltet`;
      }
      await new Promise((r) => setTimeout(r, 900));
    }
    const el = $("actBg");
    if (el) el.hidden = true;
    document.body.classList.remove("locked");
    legalGate();
    SND.play("done");
    toast("Freigeschaltet – willkommen!");
  } catch (e) {
    A.busy = false;
    A.err = e.message || "Das hat nicht geklappt.";
    actGate();
  }
}
/* Code-Kästchen: jedes füllt sich von unten mit Farbe, sobald sein Zeichen landet */
function otpPaint(anim) {
  const w = $("actOtp"),
    inp = $("actCode");
  if (!w || !inp) return;
  const v = inp.value,
    on = document.activeElement === inp;
  [...w.querySelectorAll("i")].forEach((box, k) => {
    const ch = v[k] || "",
      was = box.firstChild.textContent;
    box.firstChild.textContent = ch;
    box.classList.toggle("on", !!ch);
    box.classList.toggle("cur", on && k === Math.min(v.length, 5) && v.length < 6);
    if (anim && ch && ch !== was && !reducedMotion()) {
      box.classList.remove("rise");
      void box.offsetWidth;
      box.classList.add("rise");
    }
  });
  w.classList.toggle("full", v.length === 6);
  const ok = $("actOk");
  if (ok) ok.classList.toggle("ready", v.length === 6);
}
document.addEventListener("input", (e) => {
  if (e.target.id === "actCode" && ui.act) {
    const raw = e.target.value,
      v = invCode(raw) || raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (v !== raw) e.target.value = v;
    ui.act.c = v;
    if (ui.act.err) {
      ui.act.err = "";
      const er = $("actErr");
      if (er) er.textContent = "";
      $("actOtp").classList.remove("bad");
    }
    otpPaint(true);
  }
});
for (const t of ["focusin", "focusout"])
  document.addEventListener(t, (e) => {
    if (e.target.id === "actCode") otpPaint(false);
  });
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "actCode") actTry();
});
document.addEventListener("click", async (e) => {
  if (e.target.closest("#actOk")) {
    actTry();
    return;
  }
  if (e.target.closest("[data-actpair]")) {
    const g = $("actBg");
    if (g) g.hidden = true;
    document.body.classList.remove("locked");
    pairShow("join");
    return;
  }
  if (e.target.closest("[data-actscan]")) {
    try {
      const t = await qrLive(/[?&](?:i=)?[A-Za-z0-9]{6}\b|^\s*[A-Za-z0-9]{6}\s*$/);
      if (!t) return;
      ui.act.c = invCode(t);
      actTry();
    } catch (x) {
      toast(x.message);
    }
    return;
  }
  if (e.target.closest("[data-invopen]")) {
    invOpen();
    return;
  }
  if (e.target.closest("[data-invcap]")) {
    ui.invCapEd = ui.invCapEd ? 0 : (ui.invSlots || {}).cap || 50;
    invRender();
    return;
  }
  const icd = e.target.closest("[data-invcapd]");
  if (icd) {
    ui.invCapEd = Math.max(
      Math.max(1, (ui.invSlots || {}).slots || 0),
      (ui.invCapEd || 50) + Number(icd.dataset.invcapd)
    );
    invRender();
    return;
  }
  if (e.target.closest("[data-invcapsave]")) {
    try {
      const r = await pairCall(
        "invcap",
        "",
        {
          cap: ui.invCapEd,
        },
        true
      );
      ui.invSlots = {
        slots: r.slots,
        cap: r.cap,
      };
      ui.invCapEd = 0;
      toast(
        uiText("inv_cap_ok", {
          n: r.cap,
        })
      );
    } catch (x) {
      toast(x.message);
    }
    invRender();
    return;
  }
  if (e.target.closest("[data-invnew]")) {
    try {
      const r = await pairCall(
        "invmake",
        "",
        {
          dev: devId(),
          fresh: 1,
        },
        true
      );
      ui.inv = invFrom(r);
      ui.invText = null;
      invRender();
      toast("Neuer Code – gilt für eine Person");
    } catch (err) {
      toast(err.message || "Server nicht erreichbar");
    }
    return;
  }
  if (e.target.closest("[data-invrenew]")) {
    if (!ui.invArm) {
      ui.invArm = true;
      invRender();
      clearTimeout(ui.invArmT);
      ui.invArmT = setTimeout(() => {
        ui.invArm = false;
        invRender();
      }, 5000);
      return;
    }
    ui.invArm = false;
    try {
      const r = await pairCall(
        "invrenew",
        "",
        {
          dev: devId(),
        },
        true
      );
      ui.inv = invFrom(r);
      invRender();
      toast("Neuer Code – der alte gilt nicht mehr");
    } catch (err) {
      toast(
        /Unbekannte Aktion/i.test(err.message || "")
          ? "Dafür bitte die neue pair.php auf den Server laden"
          : "Ging nicht: " + (err.message || "")
      );
    }
    return;
  }
  if (e.target.closest("[data-invsharego]")) {
    ui.invShare = true;
    ui.invText = null;
    if (ui.invTone === "rem") ui.invTone = "pers";
    invRender();
    return;
  }
  if (e.target.closest("[data-invqr]")) {
    ui.invQr = !ui.invQr;
    invRender();
    return;
  }
  if (e.target.closest("[data-invreload]")) {
    const b = e.target.closest("[data-invreload]");
    if (!reducedMotion())
      b.animate(
        [
          {
            transform: "rotate(0)",
          },
          {
            transform: "rotate(360deg)",
          },
        ],
        {
          duration: 600,
          easing: "ease-out",
        }
      );
    invLoad();
    return;
  }
  {
    const r = e.target.closest("[data-invremind]");
    if (r) {
      const x = (ui.invL || []).find((i) => i.code === r.dataset.invremind);
      if (!x) return;
      ui.invSaved = ui.inv;
      ui.inv = {
        code: x.code,
        name: x.name,
        reminder: true,
      };
      ui.invTone = "rem";
      ui.invText = null;
      ui.invShare = true;
      invRender();
      return;
    }
  }
  if (e.target.closest("[data-invback]")) {
    ui.invShare = false;
    if (ui.invPending) {
      ui.inv = ui.invPending;
      ui.invPending = null;
      ui.invText = null;
    }
    if (ui.inv && ui.inv.reminder) {
      ui.inv = ui.invSaved || {};
      ui.invSaved = null;
      ui.invTone = "pers";
    }
    invRender();
    return;
  }
  {
    const t = e.target.closest("[data-invtone]");
    if (t) {
      ui.invTone = t.dataset.invtone;
      ui.invText = null;
      invRender();
      return;
    }
  }
  if (e.target.closest("[data-invcopytxt]") || e.target.closest("[data-invapp]")) invAfterSend();
  if (e.target.closest("[data-invcopytxt]")) {
    const t = ($("invTxt") || {}).value || "";
    try {
      await navigator.clipboard.writeText(t);
      toast("Text kopiert – einfach einfügen");
    } catch (_) {
      toast("Kopieren ging nicht");
    }
    return;
  }
  {
    const a = e.target.closest("[data-invapp]");
    if (a) {
      const t = ($("invTxt") || {}).value || "",
        k = a.dataset.invapp,
        E = encodeURIComponent(t),
        I = ui.inv || {};
      const go = (u) => {
        if (window.AndroidBridge && window.AndroidBridge.desktop) {
          window.open(u, "_blank");
        } else location.href = u;
      };
      if (k === "wa") return go("https://wa.me/?text=" + E);
      if (k === "tg")
        return go(
          "https://t.me/share/url?url=" +
            encodeURIComponent(invLink(I.code)) +
            "&text=" +
            encodeURIComponent(t.replace(invLink(I.code), "").trim())
        );
      if (k === "sms") return go("sms:?body=" + E);
      if (k === "mail") return go("mailto:?subject=" + encodeURIComponent("Einladung zu Finanz MAMI") + "&body=" + E);
      try {
        if (navigator.share && !NATIVE) {
          await navigator.share({
            text: t,
          });
          return;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
      try {
        await navigator.clipboard.writeText(t);
        toast("Text kopiert – füg ihn in jede beliebige App ein");
      } catch (_) {
        toast("Kopieren ging nicht");
      }
      return;
    }
  }
  if (e.target.closest("[data-invclose]")) {
    const el = $("invBg");
    if (el) el.remove();
    return;
  }
  if (e.target.closest("[data-invcopy]")) {
    const I = ui.inv;
    if (!I || !I.code) return;
    const l = invLink(I.code);
    try {
      if (navigator.share && !NATIVE && !IS_DESK) {
        await navigator.share({
          title: "Finanz MAMI",
          text: "Hol dir Finanz MAMI – Einladungscode " + I.code,
          url: l,
        });
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(l);
      toast("Link kopiert – füg ihn z. B. in WhatsApp ein");
    } catch (_) {
      toast(l);
    }
    return;
  }
});
/* Testplätze: wie viele der gemeinsamen Plätze schon belegt sind */
function invSlotsBox(I) {
  if (!I || !I.cap) return "";
  const n = Math.min(I.slots || 0, I.cap),
    full = I.full || n >= I.cap,
    pc = Math.round((n / I.cap) * 100);
  return `<div class="invslots${full ? " full" : ""}"><div class="invslh"><span>${escHtml(uiText("inv_slots"))}</span><b data-noi18n>${n} <small>/ ${I.cap}</small></b></div><i><em style="--w:${pc}%"></em></i><p>${escHtml(
    full
      ? uiText("inv_full")
      : uiText("inv_free", {
          n: I.cap - n,
        })
  )}</p></div>`;
}
function invRender() {
  const el = $("invBg");
  if (!el) return;
  const I = ui.inv || {};
  const body = I.err
    ? `<p class="small" style="color:var(--bad);margin:30px 0">${escHtml(I.err)}</p><button class="btn" data-invopen>Nochmal versuchen</button>`
    : I.full
      ? `<div class="invqr invqroff" aria-hidden="true">${qrSvg(INV_PAGE, 236)}</div>${invSlotsBox(I)}`
      : !I.code
        ? `<p class="muted" style="margin:60px 0">Einladung wird geladen …</p>`
        : `<p class="muted" style="margin:0 0 12px">Lass das scannen</p>
       <div class="invqr">${qrSvg(invLink(I.code), 236)}</div>
       <div class="invurl" data-noi18n>${escHtml(INV_PAGE.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</div>
       <div class="invcode${I.fresh ? " invfresh" : ""}">Code <b data-noi18n>${escHtml(I.code)}</b></div>
       <p class="small muted" style="margin:8px 0 0">${I.used ? `Dieser Code wurde schon benutzt` : `Gilt für <b>eine Person</b> · nach dem Scannen kommt sofort ein neuer Code`}</p>${invSlotsBox(I)}`;
  if (I.code && ui.invShare) {
    const tone = ui.invTone || "pers",
      txt = ui.invText != null ? ui.invText : invMsg(tone, I.code);
    const apps = [
      ["wa", "WhatsApp", "#25D366", "💬"],
      ["tg", "Telegram", "#229ED9", "✈️"],
      ...(IS_DESK ? [] : [["sms", "SMS", "#0b8a5f", "✉️"]]),
      ["mail", "E-Mail", "#c27c0e", "📧"],
      ["more", "Mehr", "#8a958f", "⋯"],
    ];
    el.innerHTML = `<div class="invbox" role="dialog" aria-modal="true" aria-labelledby="invT">
      <div class="invhd"><button class="iconbtn" data-invback aria-label="Zurück">‹</button><b id="invT">Einladung verschicken</b></div>
      <div class="invsh"><p class="muted" style="margin:4px 0 10px">Wie soll die Nachricht klingen?</p>
      <div class="invseg">${[
        ["kurz", "Kurz"],
        ["pers", "Persönlich"],
        ["anl", "Mit Anleitung"],
      ]
        .map(([k, l]) => `<button class="${tone === k ? "on" : ""}" data-invtone="${k}">${l}</button>`)
        .join("")}</div>
      <textarea class="in invtxt" id="invTxt" rows="8" aria-label="Nachricht">${escHtml(txt)}</textarea>
      <p class="small muted" style="margin:6px 2px 14px">✏️ Den Text kannst du noch ändern.</p>
      <div class="invapps">${apps.map(([k, l, c, e]) => `<button data-invapp="${k}">${k === "wa" ? `<i style="background:#25D366"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="#fff" d="${INV_WA}"/></svg></i>` : k === "tg" ? `<i style="background:#fff"><svg viewBox="0 0 24 24" width="46" height="46" aria-hidden="true"><path fill="#26A5E4" d="${INV_TG}"/></svg></i>` : `<i style="background:${c}">${e}</i>`}<span>${l}</span></button>`).join("")}</div>
      <button class="btn primary block" style="justify-content:center;margin-top:14px" data-invcopytxt>Text kopieren</button></div>
    </div>`;
    invGrow();
    return;
  }
  if (canInvite()) {
    el.innerHTML = invBoard();
    return;
  }
  el.innerHTML = `<div class="invbox" role="dialog" aria-modal="true" aria-labelledby="invT">
    <div class="invhd"><button class="iconbtn" data-invclose aria-label="Zurück">‹</button><b id="invT">App weitergeben</b></div>
    <div class="invmid">${body}</div>
    ${I.code || I.full ? `<button class="btn primary block" style="justify-content:center;gap:8px" data-invsharego ${I.full ? "disabled" : ""}>${svgIcon("arrowUp", 18)} Einladung verschicken</button>` : ""}
  </div>`;
}
/* Einladungs-Pinnwand für den Entwickler: nächster Code + drei Spalten */
function invAgo(t) {
  if (!t) return "";
  const s = Date.now() / 1000 - t;
  if (s < 90) return uiText("ago_now");
  if (s < 3600)
    return uiText("ago_m", {
      n: Math.round(s / 60),
    });
  if (s < 86400)
    return uiText("ago_h", {
      n: Math.round(s / 3600),
    });
  return uiText("ago_d", {
    n: Math.round(s / 86400),
  });
}
function invStage(x) {
  return x.act ? 2 : x.dl || x.app ? 1 : 0;
}
/* Update-Erinnerung: welche Version ist für Handy, Tablet und PC freigegeben? */
const vNum = (v) => {
  const m = String(v || "").match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? +m[1] * 1e6 + +m[2] * 1e3 + +m[3] : 0;
};
function invFormKey(f) {
  return f === "pc" || f === "laptop" ? "pc" : f === "tablet" ? "tablet" : "phone";
}
function invNewest(L) {
  try {
    relLoad();
  } catch (_) {}
  const ow = relNum(REL.allBody, "web"),
    R = {
      phone: ow,
      tablet: relNum(REL.allBody, "webt") || ow,
      pc: relNum(REL.allBody, "webp") || ow,
    },
    out = {};
  const any =
    (L || [])
      .map((x) => x.ver)
      .filter(Boolean)
      .sort((a, b) => vNum(b) - vNum(a))[0] || "";
  for (const k of ["phone", "tablet", "pc"]) {
    const own = R[k] ? verName(R[k]).replace(/^v/, "") : "",
      seen = R[k]
        ? (L || [])
            .filter((x) => invFormKey(x.form) === k)
            .map((x) => x.ver)
            .sort((a, b) => vNum(b) - vNum(a))[0] || ""
        : any;
    out[k] = vNum(own) >= vNum(seen) ? own : seen;
  }
  return out;
}
function invOld(x, N) {
  if (invStage(x) !== 2 || !x.ver) return false;
  const n = N[invFormKey(x.form)];
  return !!n && vNum(x.ver) < vNum(n);
}
const invToday = (t) => t && new Date(t * 1000).toDateString() === new Date().toDateString();
function invVerRow(x) {
  const N = ui.invNew || {},
    n = N[invFormKey(x.form)];
  if (!x.ver) return "";
  if (!invOld(x, N))
    return `<span class="invvc ok" data-noi18n>✓ v${escHtml(x.ver)} · ${escHtml(uiText("nu_cur"))}</span>`;
  const done = invToday(x.nudge);
  return `<div class="invvr"><span class="invvc old" data-noi18n>v${escHtml(x.ver)} · ${escHtml(uiText("nu_old"))}</span>${done ? `<span class="invvdone" data-noi18n>✓ ${escHtml(uiText("nu_done"))}</span>` : `<button class="invbell" data-invnudge="${escHtml(x.code)}" data-noi18n>${svgIcon("bell", 12)}${escHtml(uiText("nu_btn"))}</button>`}</div>`;
}
function invUpdBox(L) {
  if (!L.length || ui.invLerr) return "";
  const N = (ui.invNew = invNewest(L)),
    act = L.filter((x) => invStage(x) === 2),
    old = act.filter((x) => invOld(x, N));
  if (!act.length) return "";
  const nv = [...new Set(old.map((x) => N[invFormKey(x.form)]))]
    .filter(Boolean)
    .map((v) => "v" + v)
    .join(" / ");
  if (!old.length)
    return `<div class="invupd ok"><b><span class="invok" aria-hidden="true">✓</span><span data-noi18n>${escHtml(uiText("nu_all_ok"))}</span></b></div>`;
  const todo = old.filter((x) => !invToday(x.nudge));
  return `<div class="invupd"><span class="invupr" aria-hidden="true"></span><b>${svgIcon("bell", 15)}<span data-noi18n>${escHtml(
    uiText(old.length === 1 ? "nu_n1" : "nu_n", {
      n: old.length,
    })
  )}</span></b>
    <p data-noi18n>${escHtml(
      uiText("nu_box", {
        v: nv,
      })
    )}</p>${todo.length ? `<button class="invbell big" data-invnudge="*" data-noi18n>${svgIcon("bell", 14)}${escHtml(uiText("nu_all"))}</button>` : `<span class="invvdone" data-noi18n>✓ ${escHtml(uiText("nu_all_done"))}</span>`}</div>`;
}
async function invNudge(codes, btn) {
  const N = ui.invNew || {},
    L = ui.invL || [],
    vers = {};
  codes.forEach((c) => {
    const x = L.find((i) => i.code === c);
    if (x) vers[c] = N[invFormKey(x.form)] || "";
  });
  const NOT = {
      pc: /^(Neu (am|auf dem) )?(Tablet|Handy)\b/i,
      phone: /^(Neu (am|auf dem) )?(PC|Tablet)\b/i,
      tablet: /^(Neu (am|auf dem) )?(PC|Handy)\b/i,
    },
    itemsBy = {};
  codes.forEach((c) => {
    const x = L.find((i) => i.code === c);
    if (!x) return;
    const k = invFormKey(x.form),
      out = [];
    for (const [v, , it] of CHANGELOG) {
      if (!v || vNum(v) <= vNum(x.ver)) continue;
      for (const t of it || []) {
        const tt = String(t).split(" – ")[0].trim();
        if (out.length < 3 && !NOT[k].test(tt)) out.push(tt.slice(0, 80));
      }
    }
    itemsBy[c] = out;
  });
  if (btn) {
    btn.disabled = true;
    btn.classList.add("busy");
  }
  try {
    const r = await pairCall(
      "nudge",
      "",
      {
        codes,
        vers,
        itemsBy,
        from: (store.settings.name || "").trim(),
      },
      true
    );
    const now = Math.floor(Date.now() / 1000);
    L.forEach((x) => {
      if (codes.includes(x.code)) x.nudge = now;
    });
    SND.play("bell");
    toast(
      uiText(codes.length === 1 ? "nu_sent1" : "nu_sent", {
        n: codes.length,
      })
    );
    invRender();
  } catch (e) {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("busy");
    }
    toast(/Unbekannte Aktion/i.test(e.message || "") ? uiText("inv_oldsrv") : e.message || "Server nicht erreichbar");
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-invnudge]");
  if (!b) return;
  e.preventDefault();
  const N = ui.invNew || {},
    L = ui.invL || [],
    codes =
      b.dataset.invnudge === "*"
        ? L.filter((x) => invOld(x, N) && !invToday(x.nudge)).map((x) => x.code)
        : [b.dataset.invnudge];
  if (codes.length) invNudge(codes, b);
});
/* Tester-Seite: Erinnerung abholen – in der App als Mami-Fenster, sonst als Benachrichtigung */
async function nudgeCheck(bg) {
  try {
    if (window.claude || !window.AndroidBridge || !pairUrl() || updKey() || !actGet()) return;
    const r = await pairCall("nudgeget", "", {
      dev: devId(),
    });
    if (!r || !r.t || !r.ver || vNum(r.ver) <= vNum(curVerShort())) return;
    const day = new Date().toDateString(),
      nm = (store.settings.name || "").trim(),
      who = (r.from || "").trim();
    const title = uiText(nm ? "nu_t_n" : "nu_t", {
        n: nm,
      }),
      body = uiText(who ? "nu_b_w" : "nu_b", {
        w: who,
        v: "v" + r.ver,
        o: "v" + curVerShort(),
      });
    const hidden = bg || BG_RUN || document.hidden;
    if (hidden) {
      if (localStorage.getItem("hb-nudge-n") === day) return;
      localStorage.setItem("hb-nudge-n", day);
      try {
        AndroidBridge.notifyNow(900002, title, body, "hinweise");
      } catch (_) {}
      return;
    }
    if (localStorage.getItem("hb-nudge-s") === day) return;
    if (
      document.querySelector(
        "#nudgeBg,.backdrop:not([hidden]),#tourBg:not([hidden]),#actBg:not([hidden]),#mvBg:not([hidden])"
      ) ||
      TOUR.i >= 0 ||
      wizShould() ||
      ui.wiz
    ) {
      clearTimeout(nudgeCheck.t);
      nudgeCheck.t = setTimeout(() => nudgeCheck(), 20000);
      return;
    }
    localStorage.setItem("hb-nudge-s", day);
    nudgeShow(r, title, who);
  } catch (_) {}
}
function nudgeShow(r, title, who) {
  const el = document.createElement("div");
  el.id = "nudgeBg";
  el.className = "nudgebg";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "nudgeT");
  const items = typeof LANG === "string" && LANG !== "de" ? [] : (r.items || []).slice(0, 3);
  el.innerHTML = `<div class="nudgesh" data-noi18n><img class="nudgemami" src="${mImg()}" alt=""><h3 id="nudgeT">${escHtml(title)}</h3><p>${escHtml(
    uiText(who ? "nu_p_w" : "nu_p", {
      w: who,
    })
  )}</p>
    <div class="nudgev"><span class="old">${escHtml(
      uiText("nu_yours", {
        v: "v" + curVerShort(),
      })
    )}</span><span class="arr" aria-hidden="true">→</span><span class="new">${escHtml(
      uiText("nu_new", {
        v: "v" + r.ver,
      })
    )}</span></div>
    ${items.length ? `<ul>${items.map((t) => `<li>${escHtml(t)}</li>`).join("")}</ul>` : ""}
    <button class="btn primary block" data-nudgego>${escHtml(uiText("nu_go"))}</button><button class="link nudgelater" data-nudgelater>${escHtml(uiText("nu_later"))}</button></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  SND.play("bell");
  try {
    el.querySelector("[data-nudgego]").focus({
      preventScroll: true,
    });
  } catch (_) {}
}
function nudgeClose() {
  const el = $("nudgeBg");
  if (!el) return false;
  el.classList.remove("show");
  setTimeout(() => el.remove(), 260);
  return true;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-nudgego]")) {
    nudgeClose();
    try {
      ghCheck(true, true);
    } catch (_) {}
    toast(uiText("nu_loading"));
    return;
  }
  if (e.target.closest("[data-nudgelater]") || e.target.id === "nudgeBg") {
    nudgeClose();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("nudgeBg")) nudgeClose();
});
if (!BG_RUN) {
  setTimeout(() => nudgeCheck(), 25000);
  setInterval(() => nudgeCheck(), 15 * 60e3);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) setTimeout(() => nudgeCheck(true), 60e3);
  });
}
/* Link für Posts: ein Link, jeder Besucher bekommt automatisch seinen eigenen Code */
const pubUrl = (t) => INV_PAGE + "?l=" + t;
function invPubGroup(g) {
  const last = Math.max(...g.map((x) => x.seen || x.given || 0));
  return `<div class="invmini invpg" style="--i:0"><span class="invpgi" aria-hidden="true">${svgIcon("link", 16)}</span><b data-noi18n>${escHtml(
    uiText(g.length === 1 ? "pl_grp1" : "pl_grp", {
      n: g.length,
    })
  )}</b><small data-noi18n>${escHtml(uiText("pl_grp_s"))} · ${invAgo(last)}</small>
    <span class="invpgc" data-noi18n>${g
      .slice(0, 8)
      .map((x) => `<i>${escHtml(x.code)}</i>`)
      .join("")}${g.length > 8 ? `<i>+${g.length - 8}</i>` : ""}</span></div>`;
}
function invPubBox() {
  const P = ui.invPub;
  if (!P || ui.invLerr) return "";
  const busy = ui.invPubBusy ? " busy" : "";
  if (!P.tok)
    return `<div class="invpub new${busy}"><b>${svgIcon("link", 15)}<span data-noi18n>${escHtml(uiText("pl_t"))}</span></b><p data-noi18n>${escHtml(uiText("pl_none_p"))}</p><button class="btn primary" data-invpub="on" data-noi18n>${svgIcon("link", 15)}${escHtml(uiText("pl_make"))}</button></div>`;
  const on = !!P.on,
    pct = Math.min(100, Math.round((100 * (P.today || 0)) / (P.day || 20)));
  return `<div class="invpub ${on ? "on" : "off"}${busy}"><b>${svgIcon("link", 15)}<span data-noi18n>${escHtml(uiText("pl_t"))}</span><span class="invpst" data-noi18n>${on ? `<i class="invpdot"></i>` : ""}${escHtml(uiText(on ? "pl_on" : "pl_off"))}</span></b>
    <p data-noi18n>${escHtml(uiText(on ? "pl_p" : "pl_paused_p"))}</p>
    <div class="invpurl" data-noi18n><span title="${escHtml(pubUrl(P.tok))}">…/i.html?l=<em>${escHtml(P.tok)}</em></span><button class="invpcp" data-invpub="copy" aria-label="${escHtml(uiText("pl_copy"))}">${svgIcon("copy", 15)}<span>${escHtml(uiText("pl_copy"))}</span></button></div>
    <div class="invpbar" role="img" aria-label="${escHtml(
      uiText("pl_stats", {
        t: P.today || 0,
        d: P.day || 20,
        n: P.total || 0,
        a: P.act || 0,
      })
    )}"><i style="--w:${pct}%"></i></div>
    <small class="invpstat" data-noi18n>${escHtml(
      uiText("pl_stats", {
        t: P.today || 0,
        d: P.day || 20,
        n: P.total || 0,
        a: P.act || 0,
      })
    )}</small>
    <div class="invpbtn">${ui.invPubAsk ? `<span class="invpask" data-noi18n>${escHtml(uiText("pl_new_q"))}</span><button class="link small" data-invpub="newok" data-noi18n>${escHtml(uiText("pl_new_yes"))}</button><button class="link small muted" data-invpub="newno" data-noi18n>${escHtml(uiText("pl_new_no"))}</button>` : `<button class="link small" data-invpub="${on ? "off" : "on"}" data-noi18n>${svgIcon(on ? "pause" : "play", 13)}${escHtml(uiText(on ? "pl_pause" : "pl_resume"))}</button><button class="link small" data-invpub="new" data-noi18n>${svgIcon("repeat", 13)}${escHtml(uiText("pl_new"))}</button>`}</div></div>`;
}
async function invPubDo(op) {
  const P = ui.invPub || {};
  if (op === "copy") {
    const u = pubUrl(P.tok);
    try {
      await navigator.clipboard.writeText(u);
      toast(uiText("pl_copied"));
    } catch (_) {
      prompt(uiText("pl_copy"), u);
    }
    SND.play("copy");
    return;
  }
  if (op === "new") {
    ui.invPubAsk = 1;
    invRender();
    return;
  }
  if (op === "newno") {
    ui.invPubAsk = 0;
    invRender();
    return;
  }
  ui.invPubAsk = 0;
  ui.invPubBusy = 1;
  invRender();
  try {
    ui.invPub = await pairCall(
      "publink",
      "",
      {
        op: op === "newok" ? "new" : op,
      },
      true
    );
    toast(uiText(op === "newok" ? "pl_new_ok" : op === "off" ? "pl_paused" : "pl_started"));
    SND.play(op === "off" ? "tick" : "done");
  } catch (e) {
    toast(/Unbekannte Aktion/i.test(e.message || "") ? uiText("inv_oldsrv") : e.message || "Server nicht erreichbar");
  }
  ui.invPubBusy = 0;
  invRender();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-invpub]");
  if (!b || b.closest(".busy")) return;
  e.preventDefault();
  invPubDo(b.dataset.invpub);
});
function invBoard() {
  const I = ui.inv || {},
    L = ui.invL || [],
    calm = reducedMotion();
  const cols = [
    [0, uiText("inv_c0"), "var(--sunk)", "no"],
    [1, uiText("inv_c1"), "var(--warn-soft)", "wa"],
    [2, uiText("inv_c2"), "var(--accent-soft)", "ok"],
  ];
  const card = (x, i) => {
    const st = invStage(x),
      nm = x.name || x.code;
    const sub =
      st === 2
        ? [
            x.form === "pc" || x.form === "laptop"
              ? "PC"
              : x.form === "tab" || x.form === "tablet"
                ? "Tablet"
                : x.form
                  ? "Android"
                  : "",
            x.ver ? "v" + x.ver : "",
            invAgo(x.act),
          ]
            .filter(Boolean)
            .join(" · ")
        : st === 1
          ? (x.app
              ? uiText("inv_s_app")
              : uiText("inv_s_dl", {
                  f: x.dlform === "zip" ? "PC" : "Android",
                })) +
            " · " +
            invAgo(x.app || x.dl)
          : (x.seen ? uiText("inv_s_seen") : uiText("inv_s_sent")) + " · " + invAgo(x.seen || x.given);
    return `<div class="invmini" style="--i:${i}" data-invcard="${escHtml(x.code)}"><b>${escHtml(nm)}</b>${
      x.via
        ? `<span class="invvia">${escHtml(
            uiText("inv_via", {
              n: x.via,
            })
          )}</span>`
        : ""
    }${x.src === "link" ? `<span class="invlnk">${svgIcon("link", 11)}${escHtml(uiText("pl_via"))}</span>` : ""}${x.ios && !x.act ? `<span class="invios"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>${escHtml(uiText("inv_ios"))}</span>` : ""}<small>${escHtml(sub)}</small>${x.name ? `<small class="invmc" data-noi18n>${escHtml(x.code)}</small>` : ""}
      ${st === 1 && x.app ? `<span class="chip wa invrem">${svgIcon("bell", 12)}${uiText("inv_auto")}</span>` : ""}
      ${st < 2 ? `<button class="link small" data-invremind="${escHtml(x.code)}">${uiText("inv_remind")}${x.remind ? ` <span class="muted">· ${invAgo(x.remind)}</span>` : ""}</button>` : ""}${st === 2 ? invVerRow(x) : ""}</div>`;
  };
  const colH = cols
    .map(([k, t, bg, cl]) => {
      const all = L.filter((x) => invStage(x) === k),
        grp = k === 0 ? all.filter((x) => x.src === "link" && !x.name) : [],
        items = all.filter((x) => !grp.includes(x));
      return `<div class="invcol" style="--cb:${bg};--i:${k}"><h4><span>${t}</span><span class="chip ${cl}">${all.length}</span></h4>${grp.length ? invPubGroup(grp) : ""}${items.length ? items.map(card).join("") : grp.length ? "" : `<p class="invempty">${uiText("inv_none")}</p>`}</div>`;
    })
    .join("");
  return `<div class="invbox invboardbox" role="dialog" aria-modal="true" aria-labelledby="invT">
    <div class="invhd"><button class="iconbtn" data-invclose aria-label="Zurück">‹</button><b id="invT">${uiText("inv_t")}</b>${
      IS_PC && ui.invIos
        ? `<span class="invioschip" title="${escHtml(
            uiText("inv_ios_n", {
              n: ui.invIos,
            })
          )}" aria-label="${escHtml(
            uiText("inv_ios_n", {
              n: ui.invIos,
            })
          )}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg><span data-noi18n>${ui.invIos}</span></span>`
        : ""
    }${IS_PC && ui.invSlots ? `<button class="invcapb${ui.invSlots.slots >= ui.invSlots.cap ? " full" : ""}" data-invcap aria-expanded="${!!ui.invCapEd}" aria-label="${escHtml(uiText("inv_slots"))}" data-noi18n>${ui.invSlots.slots} / ${ui.invSlots.cap}</button>` : ""}${IS_PC ? `<button class="iconbtn invrl" data-invreload aria-label="${escHtml(uiText("inv_reload"))}">${svgIcon("repeat", 18)}</button>` : ""}</div>
    ${IS_PC && ui.invCapEd && ui.invSlots ? `<div class="invcapx"><span>${escHtml(uiText("inv_cap_t"))}</span><div class="invcapst"><button class="iconbtn" data-invcapd="-5" aria-label="−5">−</button><b data-noi18n>${ui.invCapEd}</b><button class="iconbtn" data-invcapd="5" aria-label="+5">+</button></div><button class="btn primary" data-invcapsave>${escHtml(uiText("inv_cap_save"))}</button></div>` : ""}
    <div class="invside"><div class="invnext ${calm ? "" : "anim"}">${
      I.err
        ? `<p class="small" style="color:var(--bad);margin:0">${escHtml(I.err)}</p><button class="btn" data-invopen>${uiText("inv_retry")}</button>`
        : !I.code
          ? `<p class="muted small" style="margin:0">${uiText("inv_load")}</p>`
          : `
      <div class="invnl"><small>${uiText("inv_next")}</small><div class="invnc" data-noi18n>${escHtml(I.code)}</div>
      <input class="in invname" id="invName" maxlength="40" placeholder="${escHtml(uiText("inv_for"))}" value="${escHtml(ui.invName || "")}" autocomplete="off"></div>
      <div class="invnb"><button class="btn primary" data-invsharego>${svgIcon("plus", 16)}${uiText("inv_go")}</button><button class="link small" data-invqr>${ui.invQr ? uiText("inv_qr_off") : uiText("inv_qr")}</button></div>
      ${ui.invQr ? `<div class="invqr invqrs">${qrSvg(invLink(I.code), 200)}</div>` : ""}`
    }</div>
    ${IS_PC ? invPubBox() + invUpdBox(L) : ""}</div>
    ${
      IS_PC
        ? `<div class="invcols">${ui.invLerr ? `<p class="small" style="color:var(--bad)">${escHtml(ui.invLerr)}</p>` : colH}</div>
    <p class="small muted invfoot">${uiText("inv_hint")}</p>`
        : ""
    }
  </div>`;
}
const invFrom = (r) =>
  r.full
    ? {
        full: true,
        slots: r.slots,
        cap: r.cap,
      }
    : {
        code: r.code,
        max: r.max,
        used: r.used,
        left: Math.max(0, r.max - r.used),
        slots: r.slots,
        cap: r.cap,
      };
async function invLoad() {
  try {
    const j = await pairCall("devinv", "", {}, true);
    ui.invL = j.items || [];
    ui.invPub = j.pub || null;
    ui.invLerr = "";
    if (j.cap)
      ui.invSlots = {
        slots: j.slots,
        cap: j.cap,
      };
    ui.invIos = Number(j.ios) || 0;
  } catch (e) {
    ui.invLerr = /Unbekannte Aktion/i.test(e.message || "")
      ? uiText("inv_oldsrv")
      : e.message || "Server nicht erreichbar";
  }
  invRender();
}
async function invNext() {
  try {
    const r = await pairCall(
      "invmake",
      "",
      {
        dev: devId(),
      },
      true
    );
    ui.inv = invFrom(r);
  } catch (e) {
    ui.inv = {
      err: e.message || "Server nicht erreichbar",
    };
  }
  invRender();
}
function invAfterSend() {
  const I = ui.inv || {};
  if (!canShare() || !I.code) return;
  if (I.reminder) {
    pairCall(
      "invremind",
      "",
      {
        c: I.code,
        dev: devId(),
      },
      true
    )
      .then(() => {
        if (canInvite()) invLoad();
      })
      .catch(() => {});
    return;
  }
  invGiven();
}
/* Beim Verschicken: Code als „vergeben“ merken, sofort den nächsten holen */
async function invGiven() {
  const I = ui.inv || {};
  if (!I.code || I.given || !canShare()) return;
  I.given = true;
  const name = (ui.invName || "").trim();
  try {
    await pairCall(
      "invgive",
      "",
      {
        c: I.code,
        name,
        dev: devId(),
      },
      true
    );
    ui.invName = "";
    const r = await pairCall(
      "invmake",
      "",
      {
        dev: devId(),
      },
      true
    );
    ui.invPending = invFrom(r);
    if (canInvite()) invLoad();
  } catch (_) {
    I.given = false;
  }
}
function invGrow() {
  const ta = $("invTxt");
  if (!ta) return;
  ta.style.height = "auto";
  ta.style.height = ta.scrollHeight + 4 + "px";
}
const INV_WA =
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
  INV_TG =
    "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z";
function invMsg(tone, c) {
  const I = ui.inv || {},
    nm = ((I.reminder ? I.name : ui.invName) || "").trim(),
    out = invMsg0(tone, c, nm);
  return nm && tone !== "rem" ? out.replace(/^Hey\b/, "Hey " + nm) : out;
}
function invMsg0(tone, c, nm) {
  const l = INV_PAGE,
    dev = !!updKey();
  if (tone === "rem")
    return `Hey${nm ? " " + nm : ""} 😊 kleine Erinnerung: Finanz MAMI wartet noch auf dich. Beim ersten Start einfach deinen Code ${c} eingeben – oder hier nochmal laden: ${l}?${c}`;
  if (tone === "kurz") return `Finanz MAMI testen? Hier laden: ${l}\nDein persönlicher Code: ${c}`;
  if (tone === "anl")
    return `Hey! ${dev ? "Ich suche Tester für meine App" : "Ich teste gerade die App"} Finanz MAMI – ein Haushaltsbuch fürs Handy und den PC 📊\n\nSo geht's:\n1. Link öffnen: ${l}\n2. Deinen Code ${c} eingeben\n3. App für Android oder Windows laden und installieren\n4. Beim ersten Start nochmal den Code eingeben\n\nFehler oder Ideen bitte über den Feedback-Knopf in der App melden. Danke! 🙏`;
  return dev
    ? `Hey 😊 ich hab eine eigene Haushaltsbuch-App gebaut und suche Tester. Du bekommst sie kostenlos – Fehler und Ideen einfach über den Feedback-Knopf melden.\n\nDownload: ${l}\nDein persönlicher Code: ${c}`
    : `Hey 😊 ich teste gerade die Haushaltsbuch-App Finanz MAMI – magst du auch? Sie ist kostenlos, Fehler und Ideen meldest du einfach über den Feedback-Knopf.\n\nDownload: ${l}\nDein persönlicher Code: ${c}`;
}
async function invOpen() {
  let el = $("invBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "invBg";
    el.className = "invbg";
    document.body.appendChild(el);
  }
  ui.inv = {};
  ui.invShare = false;
  ui.invText = null;
  invRender();
  if (canInvite()) invLoad();
  try {
    const r = await pairCall(
      "invmake",
      "",
      {
        dev: devId(),
      },
      true
    );
    ui.inv = invFrom(r);
  } catch (e) {
    ui.inv = {
      err: e.message || "Server nicht erreichbar",
    };
  }
  invRender();
  invPoll();
}
/* Sobald jemand den QR-Code scannt, liegt sofort der nächste Code bereit */
function invPoll() {
  clearInterval(ui.invPollT);
  ui.invPollT = setInterval(async () => {
    if (!$("invBg")) {
      clearInterval(ui.invPollT);
      return;
    }
    const I = ui.inv || {};
    if (!I.code || ui.invShare || I.given || document.hidden) return;
    try {
      const r = await pairCall(
        "invmake",
        "",
        {
          dev: devId(),
        },
        true
      );
      if (!$("invBg")) return;
      const n = invFrom(r);
      if (n.code !== I.code || !!n.full !== !!I.full || n.slots !== I.slots) {
        const scanned = n.code !== I.code;
        ui.inv = Object.assign(
          n,
          scanned
            ? {
                fresh: true,
              }
            : {}
        );
        invRender();
        if (scanned) {
          SND.play("ping");
          toast(uiText("inv_scanned"));
          if (canInvite()) invLoad();
          setTimeout(() => {
            if (ui.inv) ui.inv.fresh = false;
          }, 1500);
        }
      }
    } catch (_) {}
  }, 4000);
}
document.addEventListener("input", (e) => {
  if (e.target.id === "invName") {
    ui.invName = e.target.value;
    return;
  }
  if (e.target.id === "fbTxt") ui.fbDraft = e.target.value;
  if (e.target.id === "invTxt") {
    ui.invText = e.target.value;
    invGrow();
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "fbInfo") {
    ui.fbInfo = e.target.checked;
    const kv = document.querySelector(".fbkv");
    if (kv) kv.classList.toggle("off", !ui.fbInfo);
    return;
  }
  if (e.target.id !== "fbImgFile") return;
  const files = [...e.target.files].slice(0, FB_MAX_IMG - (ui.fbImgs || []).length);
  e.target.value = "";
  for (const f of files) {
    try {
      (ui.fbImgs || (ui.fbImgs = [])).push(await fbShrink(f));
    } catch (_) {
      toast("Bild konnte nicht gelesen werden");
    }
  }
  renderFeedback();
});
document.addEventListener("click", async (e) => {
  const k = e.target.closest("[data-fbk]");
  if (k) {
    ui.fbKind = k.dataset.fbk;
    renderFeedback();
    return;
  }
  const pgb = e.target.closest("[data-fbpg]");
  if (pgb) {
    const a = ui.fbPages || (ui.fbPages = []),
      k2 = pgb.dataset.fbpg,
      i = a.indexOf(k2);
    if (i < 0) a.push(k2);
    else a.splice(i, 1);
    a.sort((x, y) => FB_PAGES.findIndex((p) => p[0] === x) - FB_PAGES.findIndex((p) => p[0] === y));
    renderFeedback();
    return;
  }
  if (e.target.closest("#fbImgAdd")) {
    const f = $("fbImgFile");
    if (f) f.click();
    return;
  }
  const di = e.target.closest("[data-fbimgdel]");
  if (di) {
    ui.fbImgs.splice(Number(di.dataset.fbimgdel), 1);
    renderFeedback();
    return;
  }
  if (e.target.closest("#fbCopy")) {
    const t = fbText();
    if (!t.trim()) {
      toast("Bitte erst etwas schreiben");
      return;
    }
    try {
      await navigator.clipboard.writeText(t);
      toast("Kopiert");
    } catch (_) {
      toast("Kopieren ging nicht – Text bitte markieren");
    }
    return;
  }
  if (e.target.closest("#fbSend")) {
    const t = fbText();
    if (!(ui.fbDraft || "").trim()) {
      toast("Bitte erst etwas schreiben");
      return;
    }
    if (ui.fbBusy) return;
    ui.fbBusy = true;
    renderFeedback();
    const fk = ui.fbKind || "idee",
      rec =
        fk === "fehler" && ui.fbRec !== false && ui.fbRecLog
          ? `\n\nAufzeichnung (letzte 30 s vor dem Feedback-Knopf):\n${ui.fbRecLog.slice(-3500)}`
          : "";
    const imgs = (ui.fbImgs || []).concat(fk === "fehler" && ui.fbShotOn && ui.fbShot ? [ui.fbShot] : []).slice(0, 5);
    try {
      await fbPost({
        kind: fk,
        text: t + rec,
        images: imgs,
      });
      ui.fbDraft = "";
      ui.fbImgs = [];
      ui.fbPages = [];
      ui.fbShot = null;
      ui.fbRecLog = "";
      fbFloatClose();
      toast("Danke! Dein Feedback ist angekommen", null, null, 5000);
    } catch (err) {
      toast(
        "Senden hat nicht geklappt" + (err && err.message ? " – " + err.message : ""),
        () => {
          const b = $("fbMail");
          if (b) b.click();
        },
        "Per E-Mail",
        9000
      );
    } finally {
      ui.fbBusy = false;
      renderFeedback();
    }
    return;
  }
  if (e.target.closest("#fbMail")) {
    const t = fbText();
    if (!t.trim()) {
      toast("Bitte erst etwas schreiben");
      return;
    }
    const subj =
      {
        fehler: "Fehler",
        idee: "Idee",
        lob: "Lob",
      }[ui.fbKind || "idee"] + " – Finanz MAMI";
    const to = IMPRESSUM.mail || FEEDBACK_MAIL,
      imgs = ui.fbImgs || [];
    if (imgs.length && window.AndroidBridge && window.AndroidBridge.sendMail) {
      try {
        if (AndroidBridge.sendMail(to, subj, t, JSON.stringify(imgs.map((u) => u.split(",")[1])))) return;
      } catch (_) {}
    }
    if (imgs.length && navigator.canShare && !NATIVE) {
      try {
        const files = await Promise.all(
          imgs.map(
            async (u, i) =>
              new File([await (await fetch(u)).blob()], `bild-${i + 1}.jpg`, {
                type: "image/jpeg",
              })
          )
        );
        if (
          navigator.canShare({
            files,
          })
        ) {
          await navigator.share({
            files,
            title: subj,
            text: `An: ${to}\n\n${t}`,
          });
          return;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    if (imgs.length)
      toast(
        `Dein Mail-Programm öffnet sich – hänge die ${imgs.length === 1 ? "Bild-Datei" : imgs.length + " Bilder"} dort bitte selbst an`,
        null,
        null,
        8000
      );
    const u = `mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(t)}`;
    try {
      window.open(u, "_blank");
    } catch (_) {
      location.href = u;
    }
  }
});
function aboCfg() {
  return store.settings.abos || {};
}
function aboDeadline(a) {
  if (!a || !a.end) return null;
  const d = new Date(a.end + "T12:00");
  d.setMonth(d.getMonth() - (Number(a.notice) || 0));
  return isoOf(d);
}
document.addEventListener("change", (e) => {
  const t = e.target;
  const id = t.dataset && (t.dataset.aboend || t.dataset.abonot);
  if (!id) return;
  const A = (store.settings.abos = {
    ...(store.settings.abos || {}),
  });
  const a = (A[id] = {
    ...(A[id] || {}),
  });
  if (t.dataset.aboend != null) a.end = t.value || "";
  else a.notice = Number(t.value) || 0;
  if (!a.end && !a.notice && !a.abo) delete A[id];
  t.blur();
  saveSettings();
  renderAbos();
  if (ui.view === "fix") render();
});
function exportCsv(from, to) {
  const rows = [["Datum", "Art", "Kategorie", "Text", "Betrag"]];
  for (const t of store.tx.filter((t) => t.date >= from && t.date <= to).sort((a, b) => a.date.localeCompare(b.date)))
    rows.push([
      t.date,
      {
        ausgabe: "Ausgabe",
        einnahme: "Einnahme",
        betrieb: "Betrieblich",
        vorauszahlung: "Steuer-Vorauszahlung",
        umbuchung: "Umschuldung",
      }[t.kind] || t.kind,
      t.cat || "",
      txPayee(t),
      (t.kind === "einnahme" || (t.kind === "umbuchung" && t._k0 === "einnahme") ? "" : "-") +
        Number(t.amount).toFixed(2).replace(".", ","),
    ]);
  return {
    n: rows.length - 1,
    text:
      "﻿" +
      rows
        .map((r) =>
          r
            .map((v) => {
              v = csvSafe(v);
              return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
            })
            .join(";")
        )
        .join("\r\n"),
  };
}
function reportHtml(ym) {
  const c = monthCalc(ym),
    [y, m] = ymParts(ym),
    by = {};
  for (const t of c.tx)
    if (t.kind === "ausgabe" || t.kind === "betrieb")
      by[t.cat || "Sonstiges"] = (by[t.cat || "Sonstiges"] || 0) + t.amount;
  const cats = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const fx = fixedForMonth(ym, true);
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Monatsbericht ${MONTHS[m - 1]} ${y}</title>
<style>body{font-family:system-ui,sans-serif;color:#14251c;max-width:760px;margin:24px auto;padding:0 16px}h1{margin:0}h2{margin:26px 0 8px;font-size:17px;color:#1a7a5c}table{width:100%;border-collapse:collapse;font-size:14px}td{padding:6px 4px;border-bottom:1px solid #e3e8e5}td:last-child{text-align:right;white-space:nowrap}.k{display:flex;gap:10px;margin-top:14px}.k div{flex:1;background:#eef5f0;border-radius:12px;padding:10px}.k b{display:block;font-size:20px}small{color:#5d7466}@media print{body{margin:0}}</style></head><body>
<small>Finanz MAMI · Monatsbericht</small><h1>${MONTHS[m - 1]} ${y}</h1>${store.settings.name ? `<small>${escHtml(store.settings.name)}</small>` : ""}
<div class="k"><div><small>Einnahmen</small><b>${escHtml(fmtEur(c.income))}</b></div><div><small>Ausgaben</small><b>${escHtml(fmtEur(c.expenses))}</b></div><div><small>${c.net >= 0 ? "Übrig" : "Minus"}</small><b>${escHtml(fmtEur(c.net))}</b></div></div>
<h2>Ausgaben nach Kategorie</h2><table>${cats.map(([k, v]) => `<tr><td>${escHtml(k)}</td><td>${escHtml(fmtEur(v))}</td></tr>`).join("") || "<tr><td>keine</td><td></td></tr>"}</table>
<h2>Fixkosten</h2><table>${fx.map((f) => `<tr><td>${escHtml(f.name)}</td><td>${escHtml(fmtEur(c.paid[f.id] != null ? c.paid[f.id] : planAmt(f, ym)))}</td></tr>`).join("") || "<tr><td>keine</td><td></td></tr>"}</table>
<h2>Alle Buchungen</h2><table>${c.tx
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (t) =>
        `<tr><td>${escHtml(new Date(t.date + "T12:00").toLocaleDateString("de-DE"))} · ${escHtml(txPayee(t) || t.cat || "")}</td><td>${t.kind === "einnahme" || (t.kind === "umbuchung" && t._k0 === "einnahme") ? "+" : "−"} ${escHtml(fmtEur(t.amount))}</td></tr>`
    )
    .join("")}</table>
<p><small>Erstellt am ${new Date().toLocaleDateString("de-DE")}. Zum Speichern als PDF: Teilen › Drucken › Als PDF speichern.</small></p></body></html>`;
}
function renderExport() {
  const el = $("exportEd");
  if (!el) return;
  const ym = ui.ym,
    [y, m] = ymParts(ym);
  el.innerHTML = `<div class="exr"><span class="exi">${svgIcon("doc", 20)}</span><span class="n"><b>Monatsbericht ${escHtml(MONTHS[m - 1])} ${y}</b><small>Einnahmen, Ausgaben, Kategorien und alle Buchungen – z. B. fürs Jobcenter oder BAföG-Amt. Lässt sich als PDF drucken.</small></span><button class="btn primary" data-exp="report">Speichern</button></div>
    <div class="exr"><span class="exi">${svgIcon("chart", 20)}</span><span class="n"><b>Buchungen ${escHtml(MONTHS[m - 1])} ${y}</b><small>Als Tabelle für Excel (CSV)</small></span><button class="btn" data-exp="month">Speichern</button></div>
    <div class="exr"><span class="exi">${svgIcon("cal", 20)}</span><span class="n"><b>Buchungen ganzes Jahr ${y}</b><small>Als Tabelle für Excel (CSV)</small></span><button class="btn" data-exp="year">Speichern</button></div>
    ${hasSelf() ? `<div class="exr"><span class="exi">${svgIcon("receipt", 20)}</span><span class="n"><b>EÜR ${y}</b><small>Für Steuerbüro oder ELSTER</small></span><button class="btn" id="euerBtn" data-year="${y}">Speichern</button></div>` : ""}
    <div class="exr"><span class="exi">${svgIcon("camera", 20)}</span><span class="n"><b>Belege ${y} als ZIP</b>${(() => {
      const nB = store.tx.filter((t) => t.date && t.date.startsWith(String(y)) && hasReceipt(t.id)).length;
      return nB
        ? `<small>Alle ${nB} Belegfotos des Jahres${hasSelf() ? ", sortiert nach privat und betrieblich," : ""} mit einer Liste${hasSelf() ? " für den Steuerberater" : ""}</small></span><button class="btn" id="belZip">Speichern</button>`
        : `<small>Noch keine Belegfotos in ${y} – fotografiere einen Kassenbon beim Eintragen</small></span><button class="btn" id="belZip" disabled>Speichern</button>`;
    })()}</div>
    <p class="small muted" style="margin:10px 0 0">Monat und Jahr richten sich nach dem Monat oben in der App. Ein komplettes Backup gibt es unter „Backup“.</p>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-exp]");
  if (!b) return;
  const ym = ui.ym,
    y = ym.slice(0, 4),
    k = b.dataset.exp;
  if (k === "report") {
    saveTextFile(`Monatsbericht-${ym}.html`, reportHtml(ym), "text/html", "Monatsbericht gespeichert");
    return;
  }
  const r = k === "month" ? exportCsv(ym + "-01", ym + "-31") : exportCsv(y + "-01-01", y + "-12-31");
  if (!r.n) {
    toast("Keine Buchungen in diesem Zeitraum");
    return;
  }
  saveTextFile(
    `Buchungen-${k === "month" ? ym : y}.csv`,
    r.text,
    "text/csv",
    plural(r.n, "Buchung gespeichert", "Buchungen gespeichert")
  );
});

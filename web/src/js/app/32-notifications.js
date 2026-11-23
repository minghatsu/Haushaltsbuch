/* Benachrichtigungen */
const NOTIFY_DEF = {
  on: false,
  budget: true,
  minus: true,
  reserve: true,
  debt: true,
  goal: true,
  fix: "3,25",
  daily: "",
  imp: "14",
  tax: true,
  br: true,
  rch: true,
  week: false,
  month: true,
  hour: "9",
};
const CAN_NOTIFY = !!(window.AndroidBridge && window.AndroidBridge.notifySchedule);
/* Beim Klick in ein Auswahlfeld nicht neu zeichnen: sonst verschwindet z. B. die Liste „Monatlich/Vierteljährlich…“,
     weil das Speichern des vorigen Feldes genau in diesem Moment die Seite neu aufbaut (am PC besonders schnell). */
var PD = {
  t: null,
  skip: 0,
};
function pdHold(el) {
  const t = PD && PD.t;
  if (t && el && el.contains(t) && t.closest && t.closest("select,input,textarea")) {
    PD.skip = 1;
    return true;
  }
  return false;
}
(function () {
  const end = () => {
    const t = PD.t;
    setTimeout(() => {
      if (PD.t !== t) return;
      PD.t = null;
      if (PD.skip) {
        PD.skip = 0;
        try {
          render();
        } catch (_) {}
      }
    }, 350);
  };
  document.addEventListener(
    "pointerdown",
    (e) => {
      PD.t = e.target;
    },
    true
  );
  document.addEventListener("pointerup", end, true);
  document.addEventListener("pointercancel", end, true);
})();
const IS_DESK = !!(window.AndroidBridge && window.AndroidBridge.desktop);
const IS_TAB =
  !IS_DESK &&
  (() => {
    try {
      if (localStorage.getItem("hb-forcetab") === "1") return true;
    } catch (_) {}
    return !!window.AndroidBridge && Math.min(screen.width || 0, screen.height || 0) >= 600;
  })();
const IS_PC = IS_DESK || IS_TAB;
document.addEventListener("change", (e) => {
  if ((e.target.id === "pcTray" || e.target.id === "pcAuto") && IS_PC) {
    try {
      AndroidBridge.pcPrefs(
        JSON.stringify(
          e.target.id === "pcTray"
            ? {
                tray: e.target.checked,
              }
            : {
                autostart: e.target.checked,
              }
        )
      );
    } catch (_) {}
    toast("Gespeichert");
  }
});
function notifyCfg() {
  let c = {};
  try {
    c = JSON.parse(localStorage.getItem("hb-notify") || "{}");
  } catch (e) {}
  return {
    ...NOTIFY_DEF,
    ...c,
  };
}
function notifySave(c) {
  try {
    localStorage.setItem("hb-notify", JSON.stringify(c));
  } catch (e) {}
  notifyPlanSoon();
}
function notifyPerm() {
  try {
    return CAN_NOTIFY ? AndroidBridge.notifyState() : "denied";
  } catch (e) {
    return "denied";
  }
}
function notifyId(key) {
  let h = 7;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(h) % 2000000000) + 1;
}
function notifySent() {
  try {
    return JSON.parse(localStorage.getItem("hb-notified") || "{}");
  } catch (e) {
    return {};
  }
}
function notifyAlerts(hints) {
  const c = notifyCfg();
  if (!CAN_NOTIFY || !c.on || notifyPerm() !== "granted") return;
  const sent = notifySent(),
    ym = ymOf(new Date()),
    day = isoOf(new Date());
  for (const h of hints) {
    if (!h.k || !c[h.k]) continue;
    const key =
      h.k === "minus"
        ? "minus:" + day
        : h.k + ":" + h.t.replace(/\d[\d.,]*\s?€?|%/g, "#") + ":" + ym + (h.lvl === "bad" ? ":bad" : "");
    if (sent[key]) continue;
    sent[key] = Date.now();
    try {
      AndroidBridge.notifyNow(notifyId(key), h.t, h.s || "Tippe, um Finanz MAMI zu öffnen.", "hinweise");
    } catch (e) {}
  }
  const old = Date.now() - 120 * 864e5;
  for (const k in sent) if (sent[k] < old) delete sent[k];
  try {
    localStorage.setItem("hb-notified", JSON.stringify(sent));
  } catch (e) {}
}
function notifyPlan() {
  if (!CAN_NOTIFY) return;
  const c = notifyCfg(),
    list = [];
  if (c.on && notifyPerm() === "granted") {
    const now = new Date(),
      H = Number(c.hour) || 9;
    const at = (d, h, m) => {
      const x = new Date(d);
      x.setHours(h, m || 0, 0, 0);
      return x.getTime();
    };
    const add = (key, t, title, text) => {
      if (t > Date.now() + 30000)
        list.push({
          id: notifyId(key),
          at: t,
          title,
          text,
          ch: "erinnerungen",
        });
    };
    const cur = ymOf(now),
      nxt = shiftYm(cur, 1);
    if (c.fix) {
      for (const ym of [cur, nxt]) {
        const [y, m] = ymParts(ym);
        for (const dd of c.fix.split(",").map(Number)) {
          const due = fixedForMonth(ym, true),
            paid = (store.months[ym] && store.months[ym].paid) || {},
            open = due.filter((f) => !(f.id in paid));
          if (!open.length) continue;
          const sumO = sum(open, (f) => listAmt(f, ym));
          add(
            "fix:" + ym + ":" + dd,
            at(new Date(y, m - 1, dd), H),
            dd > 20 ? `Noch ${open.length} Fixkosten offen` : `Fixkosten im ${MONTHS[m - 1]}`,
            `${open.length} Posten über ${fmtEur0(sumO)} noch nicht abgehakt${open.length <= 3 ? ": " + open.map((f) => f.name).join(", ") : ""}.`
          );
        }
      }
    }
    if (c.daily) {
      const [hh, mm] = c.daily.split(":").map(Number);
      for (let k = 0; k < 14; k++) {
        const d = new Date(now);
        d.setDate(d.getDate() + k);
        add(
          "daily:" + isoOf(d),
          at(d, hh, mm),
          "Schon alles eingetragen?",
          "Kurz die Ausgaben von heute nachtragen – dann stimmen deine Budgets."
        );
      }
    }
    if (c.imp) {
      const last = store.tx.filter((t) => t.source || t._b).reduce((a, t) => (t.date > a ? t.date : a), "");
      if (last) {
        const d = new Date(last + "T12:00:00");
        d.setDate(d.getDate() + Number(c.imp));
        let t = at(d, H);
        if (t < Date.now()) {
          const tm = new Date(now);
          tm.setDate(tm.getDate() + 1);
          t = at(tm, H);
        }
        const days = Math.round((t - new Date(last + "T12:00:00").getTime()) / 864e5);
        add(
          "imp:" + last,
          t,
          "Kontoauszug importieren",
          `Seit ${days} Tagen kein neuer Auszug – importieren hält Kontostand und Budgets aktuell.`
        );
      }
    }
    if (c.tax && hasSelf() && incCats().some((x) => x.art === "selbst")) {
      for (const ym of [cur, nxt, shiftYm(cur, 2)]) {
        const [y, m] = ymParts(ym);
        if ([3, 6, 9, 12].includes(m))
          add(
            "tax:" + ym,
            at(new Date(y, m - 1, 8), H),
            "Steuertermin am 10.",
            `Einkommensteuer-Vorauszahlung fällig am 10. ${MONTHS[m - 1]}.`
          );
      }
      if (!store.settings.kleinunternehmer)
        for (const k of ustPeriods(3)) {
          if (ustCfg().done[k]) continue;
          const due = ustDue(k),
            [y, m, d] = due.split("-").map(Number);
          add(
            "ust:" + k,
            at(new Date(y, m - 1, d - 2), H),
            uiText("nf_ust_t"),
            uiText("nf_ust_s", {
              p: ustLabel(k, true),
              a: fmtEur(Math.max(0, ustCalc(k).kz83)),
              d: fxDate(due, { day: "numeric", month: "long" }),
            })
          );
        }
    }
    if (c.br) {
      try {
        for (const x of brList()) {
          if (x.done) continue;
          for (const [k, dt] of [
            ["due", x.due],
            ["term", x.term],
            ["wid", x.wid],
          ]) {
            if (!dt) continue;
            const [y, m, dd] = dt.split("-").map(Number),
              from = x.from || uiText("br_title");
            add(
              "br:" + x.id + ":" + k + ":3",
              at(new Date(y, m - 1, dd - 3), H),
              uiText("nf_br_soon", {
                n: from,
              }),
              uiText("nf_br_" + k, {
                d: fxDate(dt, {
                  day: "numeric",
                  month: "long",
                }),
              })
            );
            add(
              "br:" + x.id + ":" + k + ":0",
              at(new Date(y, m - 1, dd), k === "term" ? Math.max(7, H - 2) : H),
              uiText("nf_br_today", {
                n: from,
              }),
              uiText("nf_br_" + k, {
                d: fxDate(dt, {
                  day: "numeric",
                  month: "long",
                }),
              })
            );
          }
        }
      } catch (_) {}
    }
    if (c.rch && hasSelf()) {
      try {
        for (const i of rchList()) {
          if (i.paid || i.gs || i.storno || !i.due) continue;
          const [y, m, dd] = i.due.split("-").map(Number);
          add(
            "rch:" + i.id,
            at(new Date(y, m - 1, dd + 1), H),
            uiText("nf_rch_over", {
              n: i.kunde || "–",
            }),
            uiText("nf_rch_over_s", {
              a: fmtEur(rchRest(i)),
              r: i.nr || "",
            })
          );
        }
        for (const i of erOpenList()) {
          if (!i.due) continue;
          const [y, m, dd] = i.due.split("-").map(Number);
          add(
            "er:" + i.id,
            at(new Date(y, m - 1, dd - 2), H),
            uiText("nf_er_due", {
              n: i.from || "–",
            }),
            uiText("nf_er_due_s", {
              a: fmtEur(i.pay),
              d: fxDate(i.due, {
                day: "numeric",
                month: "long",
              }),
            })
          );
        }
        for (const r of rvRecs().filter(rvRecLive)) {
          const [y, m, dd] = String(r.next).split("-").map(Number);
          if (y)
            add(
              "rvrec:" + r.id + ":" + r.next,
              at(new Date(y, m - 1, dd), H),
              uiText("rv_rec_due", {
                n: r.kunde || "–",
              }),
              uiText("nf_rec_s")
            );
        }
      } catch (_) {}
    }
    if (c.week) {
      for (let k = 0; k < 3; k++) {
        const d = new Date(now);
        d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + 7 * k);
        add("week:" + isoOf(d), at(d, 18), "Dein Wochenrückblick", "Schau dir an, wie deine Woche gelaufen ist.");
      }
    }
    if (c.month) {
      const [y, m] = ymParts(nxt);
      add(
        "month:" + nxt,
        at(new Date(y, m - 1, 1), H),
        `Dein ${MONTHS[(m + 10) % 12]} ist abgeschlossen`,
        "Sieh dir an, wie viel übrig geblieben ist."
      );
    }
  }
  // Noch nicht freigeschaltet: sanft erinnern (nach 1, 3 und 7 Tagen um 18 Uhr)
  if (typeof actNeed === "function" && actNeed() && notifyPerm() === "granted") {
    let t0 = 0;
    try {
      t0 = Number(localStorage.getItem("hb-actfirst")) || 0;
      if (!t0) {
        t0 = Date.now();
        localStorage.setItem("hb-actfirst", String(t0));
      }
    } catch (_) {
      t0 = Date.now();
    }
    for (const k of [1, 3, 7]) {
      const d = new Date(t0);
      d.setDate(d.getDate() + k);
      d.setHours(18, 0, 0, 0);
      if (d.getTime() > Date.now() + 30000)
        list.push({
          id: notifyId("act" + k),
          at: d.getTime(),
          title: uiText("act_rem_t"),
          text: uiText("act_rem_p"),
          ch: "hinweise",
        });
    }
  }
  {
    let t = 0;
    try {
      t = Number(localStorage.getItem("hb-nftest")) || 0;
    } catch (_) {}
    if (t > Date.now())
      list.push({
        id: notifyId("bgtest"),
        at: t,
        title: "Test geklappt ✓",
        text: "Benachrichtigungen kommen auch bei geschlossener App.",
        ch: "hinweise",
      });
  }
  list.sort((a, b) => a.at - b.at);
  try {
    AndroidBridge.notifySchedule(JSON.stringify(list.slice(0, 60)));
  } catch (e) {}
}
window.hbBg = async () => {
  const done = () => {
    try {
      AndroidBridge.bgDone();
    } catch (_) {}
  };
  try {
    if (SYNC.token) {
      for (let i = 0; i < 60 && SYNC.busy; i++) await new Promise((r) => setTimeout(r, 250));
      try {
        await syncNow();
      } catch (_) {}
    }
    try {
      zTripCheck();
      zDevOutCheck();
    } catch (_) {}
    try {
      const v = ui.ym;
      ui.ym = ymOf(new Date());
      renderHome();
      ui.ym = v;
    } catch (_) {}
    try {
      notifyPlan();
    } catch (_) {}
    try {
      await nudgeCheck(true);
    } catch (_) {}
  } finally {
    setTimeout(done, 400);
  }
};
let notifyT = null;
function notifyPlanSoon() {
  clearTimeout(notifyT);
  notifyT = setTimeout(notifyPlan, 1500);
}
window.hbNotifyPerm = (ok) => {
  const c = notifyCfg();
  c.on = !!ok;
  notifySave(c);
  if (!ok) toast("Ohne Erlaubnis kann die App keine Benachrichtigungen zeigen");
  if (ui.view === "more") renderMore();
};
function renderNotifyEd() {
  const el = $("notifyEd");
  if (!el) return;
  if (!CAN_NOTIFY) {
    el.innerHTML = `<div class="notice info"><span>Benachrichtigungen gibt es in der Handy- und PC-App. Dort kannst du hier einstellen, worüber sie dich informiert – auch wenn die App geschlossen ist.</span></div>`;
    return;
  }
  const c = notifyCfg(),
    perm = notifyPerm(),
    on = c.on && perm === "granted";
  const NI = {
    budget: ["target", "#c27c0e"],
    minus: ["minus", "#b23a3a"],
    reserve: ["shield", "#3d63a8"],
    debt: ["bank", "#7a5bc2"],
    goal: ["piggy", "#2e9c74"],
    fix: ["list", "#1a7a5c"],
    daily: ["plus", "#d4813a"],
    imp: ["arrowDown", "#3d63a8"],
    tax: ["receipt", "#c27c0e"],
    month: ["chart", "#7a5bc2"],
    week: ["chart", "#2e9c74"],
    hour: ["bell", "#6b7a72"],
    br: ["mail", "#3d63a8"],
    rch: ["docout", "#147a5b"],
  };
  const nic = (k) => {
    const [i, col] = NI[k] || ["bell", "var(--accent)"];
    return `<span class="nic" style="--tc:${themeCol(col)}">${svgIcon(i, 18)}</span>`;
  };
  const sw = (k, t, d) =>
    `<div class="switch nrow">${nic(k)}<label for="nf-${k}"><b>${t}</b><br><span class="small muted">${d}</span></label><input type="checkbox" id="nf-${k}" data-nf="${k}" ${c[k] ? "checked" : ""} ${on ? "" : "disabled"}></div>`;
  const sel = (k, t, d, opts) =>
    `<div class="nrow nsel">${nic(k)}<div class="nsl"><label for="nf-${k}"><b>${t}</b></label>${d ? `<span class="small muted">${d}</span>` : ""}<select class="in" id="nf-${k}" data-nf="${k}" ${on ? "" : "disabled"}>${opts.map(([v, l]) => `<option value="${v}" ${String(c[k]) === v ? "selected" : ""}>${l}</option>`).join("")}</select></div></div>`;
  el.innerHTML = `
    <div class="card nmaster"><div class="switch nrow"><span class="nic big" style="--tc:var(--accent)">${svgIcon("bell", 22)}</span><label for="nf-on"><b>Benachrichtigungen</b><br><span class="small muted">${IS_PC ? "Kommen als Windows-Meldung unten rechts – auch wenn das Fenster zu ist, solange Finanz MAMI unten in der Taskleiste läuft." : perm === "granted" ? "Kommen als Popup aufs Handy, auch wenn die App geschlossen ist." : "Die App fragt einmal nach der Erlaubnis von Android."}</span></label><input type="checkbox" id="nf-on" ${on ? "checked" : ""}></div>
    ${c.on && perm !== "granted" ? `<div class="notice warn"><span>${IS_DESK ? "Windows blockiert die Benachrichtigungen gerade." : "Android blockiert die Benachrichtigungen gerade."}</span><button class="btn" id="nfSys">Erlauben</button></div>` : ""}
    </div>
    <div class="pc-sect">Warnungen <span>Kommen sofort, sobald die App es bemerkt – jede nur einmal.</span></div>
    <div class="card ngrp">
    ${sw("budget", "Budget", "Bei 80 % verbraucht und wenn es überschritten ist")}
    ${sw("minus", "Konto im Minus", "Höchstens einmal am Tag")}
    ${hasSelf() ? sw("reserve", "Steuer-Rücklage", "Wenn die Rücklage dein Guthaben übersteigt") : ""}
    ${sw("debt", "Schulden", "Wenn eine Rate die Zinsen nicht deckt")}
    ${sw("goal", "Sparziele", "Wenn ein Sparziel erreicht ist")}
    </div>
    <div class="pc-sect">Erinnerungen <span>Kommen zur eingestellten Uhrzeit, auch wenn die App zu ist.</span></div>
    <div class="card ngrp">
    ${sel("fix", "Offene Fixkosten", "Nur wenn noch etwas nicht abgehakt ist.", [
      ["", "Aus"],
      ["3", "Am 3. des Monats"],
      ["25", "Am 25. des Monats"],
      ["3,25", "Am 3. und am 25."],
    ])}
    ${sel("daily", "Ausgaben eintragen", "Jeden Tag eine kurze Erinnerung.", [
      ["", "Aus"],
      ["18:00", "Täglich um 18 Uhr"],
      ["19:00", "Täglich um 19 Uhr"],
      ["20:00", "Täglich um 20 Uhr"],
      ["21:00", "Täglich um 21 Uhr"],
      ["22:00", "Täglich um 22 Uhr"],
    ])}
    ${sel("imp", "Kontoauszug importieren", "Wenn so lange kein neuer Auszug importiert wurde.", [
      ["", "Aus"],
      ["7", "Nach 7 Tagen"],
      ["14", "Nach 14 Tagen"],
      ["30", "Nach 30 Tagen"],
    ])}
    ${!hasSelf() ? "" : sw("tax", "Steuertermine", "Umsatzsteuer-Voranmeldung und Vorauszahlungen, 2 Tage vorher")}
    ${sw("br", escHtml(uiText("nf_br_t")), escHtml(uiText("nf_br_s")))}
    ${!hasSelf() ? "" : sw("rch", escHtml(uiText("nf_rch_t")), escHtml(uiText("nf_rch_s")))}
    ${sw("month", "Monatsrückblick", "Am 1. für den vergangenen Monat")}
    ${sw("week", "Wochenrückblick", "Sonntags um 18 Uhr")}
    ${sel("hour", "Uhrzeit für Erinnerungen", "Gilt für Fixkosten, Kontoauszug, Steuer und Monatsrückblick.", [
      ["8", "8 Uhr"],
      ["9", "9 Uhr"],
      ["10", "10 Uhr"],
      ["12", "12 Uhr"],
      ["17", "17 Uhr"],
      ["19", "19 Uhr"],
    ])}
    </div>
    ${!IS_DESK && !AndroidBridge.batteryState ? `<div class="notice warn"><span><b>Für Benachrichtigungen bei geschlossener App</b> einmal die neue App installieren (Einstellungen › Geräte & Abgleich › Updates).</span></div>` : ""}
    ${
      !IS_DESK && AndroidBridge.batteryState
        ? (() => {
            const bs = AndroidBridge.batteryState(),
              last = Number(AndroidBridge.bgLast && AndroidBridge.bgLast()) || 0,
              ago = last ? Math.round((Date.now() - last) / 60000) : null;
            return `<div class="pc-sect">Bei geschlossener App</div><div class="card ngrp">
      <div class="nrow">${nic("hour")}<div class="nsl"><b>Hintergrund-Prüfung</b><span class="small muted">${last ? `Zuletzt vor ${ago < 60 ? ago + " Min." : Math.round(ago / 60) + " Std."}` : "Lief noch nie – Android hat sie bisher nicht gestartet."}</span></div></div>
      ${bs === "free" ? `<div class="notice ok"><span>Android lässt Finanz MAMI im Hintergrund laufen ✓</span></div>` : `<div class="notice warn"><span><b>Android bremst Finanz MAMI im Hintergrund.</b> Dann kommen Benachrichtigungen erst, wenn du die App öffnest. Tippe auf „Erlauben“ und wähle „Zulassen“.</span><button class="btn" id="nfBat">Erlauben</button></div>`}
      <div class="row-btns" style="justify-content:flex-start"><button class="btn" id="nfSoon" ${on ? "" : "disabled"}>Test mit geschlossener App</button></div>
      <span class="small muted">Tippe auf Test, schließ die App (nach oben wegwischen) und warte 1–2 Minuten.</span></div>`;
          })()
        : ""
    }
    <div class="row-btns" style="justify-content:flex-start"><button class="btn" id="nfTest" ${on ? "" : "disabled"}>Test-Benachrichtigung</button><button class="btn" id="nfSys2">${IS_PC ? "Windows-Einstellungen" : "Android-Einstellungen"}</button></div>
    ${
      IS_DESK && AndroidBridge.pcPrefs
        ? (() => {
            let p = {};
            try {
              p = JSON.parse(AndroidBridge.pcPrefs(""));
            } catch (_) {}
            return `<div class="pc-sect">PC</div><div class="card ngrp">
    <div class="switch"><label for="pcTray"><b>Im Hintergrund weiterlaufen</b><br><span class="small muted">Schließen legt Finanz MAMI unten rechts in die Taskleiste – nötig für Erinnerungen. Ganz beenden: Rechtsklick aufs Symbol › Beenden.</span></label><input type="checkbox" id="pcTray" ${p.tray !== false ? "checked" : ""}></div>
    <div class="switch"><label for="pcAuto"><b>Mit Windows starten</b><br><span class="small muted">Startet unsichtbar im Hintergrund, damit Erinnerungen auch nach einem Neustart kommen.</span></label><input type="checkbox" id="pcAuto" ${p.autostart ? "checked" : ""}></div></div>`;
          })()
        : ""
    }`;
}
document.addEventListener("change", (e) => {
  if (e.target.id === "nf-on") {
    const c = notifyCfg();
    if (e.target.checked) {
      c.on = true;
      notifySave(c);
      try {
        AndroidBridge.notifyAsk();
        if (AndroidBridge.desktop) window.hbNotifyPerm(true);
      } catch (_) {}
    } else {
      c.on = false;
      notifySave(c);
      renderNotifyEd();
    }
    return;
  }
  const k = e.target.dataset && e.target.dataset.nf;
  if (!k) return;
  const c = notifyCfg();
  c[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
  notifySave(c);
});
document.addEventListener("click", (e) => {
  if (e.target.closest("#nfTest")) {
    try {
      AndroidBridge.notifyNow(
        notifyId("test" + Date.now()),
        "So sieht eine Benachrichtigung aus",
        "Finanz MAMI meldet sich hier, auch wenn die App geschlossen ist.",
        "hinweise"
      );
    } catch (_) {}
  }
  if (e.target.closest("#nfBat")) {
    try {
      AndroidBridge.batteryAsk();
    } catch (_) {}
    return;
  }
  if (e.target.closest("#nfSoon")) {
    try {
      localStorage.setItem("hb-nftest", String(Date.now() + 70000));
    } catch (_) {}
    notifyPlan();
    try {
      AndroidBridge.bgSoon && AndroidBridge.bgSoon();
    } catch (_) {}
    toast("Jetzt die App schließen – in ca. 1 Minute kommt eine Test-Meldung", null, null, 6000);
    return;
  }
  if (e.target.closest("#nfSys,#nfSys2")) {
    try {
      AndroidBridge.notifySettings();
    } catch (_) {}
  }
});

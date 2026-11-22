/* Anfrage statt Sofort-Kopplung */
const isMain = () => {
  try {
    return localStorage.getItem("hb-main") === "1";
  } catch (e) {
    return false;
  }
};
async function boxH(K, id) {
  return b64u((await crypto.subtle.sign("HMAC", K.mac, new TextEncoder().encode("sp\u0000" + id))).slice(0, 24));
}
async function boxPut(box, id, d) {
  const K = await spKeys(box);
  await spRequest(box, "push", "", {
    ops: [
      {
        h: await boxH(K, id),
        b: await spEnc(K, {
          i: id,
          d,
        }),
      },
    ],
  });
}
async function boxAll(box) {
  const K = await spKeys(box),
    res = await spRequest(box, "pull", "&since=0"),
    out = {};
  for (const x of res.docs || []) {
    if (!x.b) continue;
    try {
      const o = await spDec(K, x.b);
      if (o && o.i) out[o.i] = o.d;
    } catch (_) {}
  }
  return out;
}
async function myCard(name) {
  const st = store.settings || {};
  let ph = "";
  if (st.photo)
    ph = await new Promise((ok) => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = c.height = 96;
          c.getContext("2d").drawImage(im, 0, 0, 96, 96);
          ok(c.toDataURL("image/jpeg", 0.8));
        } catch (_) {
          ok("");
        }
      };
      im.onerror = () => ok("");
      im.src = st.photo;
    });
  return {
    n: String(name != null ? name : st.name || "")
      .trim()
      .slice(0, 40),
    m: devModel(),
    f: devForm(),
    p: ph,
    main: isMain(),
  };
}
const cardName = (c) => (c && c.n) || (c && c.m) || "Neues Gerät";
function cardAv(c, cls) {
  c = c || {};
  const f = ["phone", "tablet", "pc", "laptop"].includes(c.f) ? c.f : "phone";
  const inner =
    c.p && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(c.p)
      ? `<img src="${c.p}" alt="">`
      : c.n
        ? `<b>${escHtml(String(c.n)[0].toUpperCase())}</b>`
        : devIc(f, 30);
  return `<span class="pav ${cls || ""}">${inner}<i>${devIc(f, 13)}</i>${c.main ? `<em class="pcrown">${svgIcon("crown", 12)}</em>` : ""}</span>`;
}
const NOCODE =
  "Diesen Code gibt es nicht (mehr) – er gilt 10 Minuten. Lass dir auf dem anderen Gerät einen neuen zeigen.";
async function reqAsk(kind, sc, card) {
  const box = await shortBox(sc);
  let all;
  try {
    all = await boxAll(box);
  } catch (e) {
    throw new Error(e.status === 401 ? NOCODE : "Server nicht erreichbar – bist du online?");
  }
  if (all.code && all.code.code && !all.host) {
    spRequest(box, "wipe", "", {}).catch(() => {});
    return all.code.code;
  }
  if (!all.host) throw new Error(NOCODE);
  if ((all.host.k || "pair") !== kind)
    throw new Error(
      kind === "gm"
        ? "Das ist ein Code zum Koppeln eigener Geräte, nicht für „Gemeinsam“."
        : "Das ist ein Code für „Gemeinsam“ – den gibst du unter Gemeinsam › Beitreten ein."
    );
  const W = {
    kind,
    host: all.host,
    box,
    id: b64u(crypto.getRandomValues(new Uint8Array(9))),
    t0: Date.now(),
  };
  ui.rwait = W;
  reqWaitUi();
  try {
    await boxPut(box, "req", {
      id: W.id,
      k: kind,
      card,
      t: Date.now(),
    });
  } catch (e) {
    ui.rwait = null;
    throw new Error("Server nicht erreichbar – bist du online?");
  }
  while (ui.rwait === W) {
    await new Promise((r) => setTimeout(r, 2000));
    if (ui.rwait !== W) break;
    if (Date.now() - W.t0 > 3 * 60e3) {
      ui.rwait = null;
      throw new Error("Keine Antwort bekommen – bitte noch einmal versuchen.");
    }
    let a;
    try {
      a = await boxAll(box);
    } catch (e) {
      if (e.status === 401) {
        ui.rwait = null;
        throw new Error("Die Anfrage ist abgelaufen – bitte noch einmal versuchen.");
      }
      continue;
    }
    if (a.code && a.code.id === W.id) {
      W.ok = true;
      reqWaitUi();
      spRequest(box, "wipe", "", {}).catch(() => {});
      await new Promise((r) => setTimeout(r, 1300));
      ui.rwait = null;
      return a.code.code;
    }
    if (a.deny && a.deny.id === W.id) {
      ui.rwait = null;
      throw new Error(
        a.deny.why === "voll"
          ? kind === "gm"
            ? "Dieser Bereich hat schon 10 Mitglieder."
            : "Dort sind schon 10 Geräte gekoppelt – eins muss erst entfernt werden."
          : "Die Anfrage wurde abgelehnt."
      );
    }
  }
  const e = new Error("");
  e.cancel = true;
  throw e;
}
function reqCancel() {
  const W = ui.rwait;
  ui.rwait = null;
  if (W)
    boxPut(W.box, "req", {
      id: W.id,
      cancel: true,
    }).catch(() => {});
}
function reqWaitUi() {
  if (ui.rwait && ui.rwait.kind === "gm") {
    if (ui.view === "gemeinsam" || SPS.open === "gemeinsam") renderGemeinsam();
  } else pairUi();
}
function reqWaitHtml(W) {
  const h = W.host.card || {},
    gm = W.kind === "gm";
  return `<div class="pwait ${W.ok ? "ok" : ""}">
    <div class="plink">${cardAv(h, "big")}<span class="pline"><i></i><b>✓</b></span>${
      gm
        ? `<span class="pav big gmav"><b>${escHtml(String(W.host.a || "G")[0].toUpperCase())}</b></span>`
        : cardAv(
            {
              f: devForm(),
              m: devModel(),
            },
            "big"
          )
    }</div>
    <b class="pwt">${W.ok ? (gm ? "Du bist dabei!" : "Bestätigt – Daten werden geladen …") : "Warte auf Bestätigung …"}</b>
    <p class="small muted">${W.ok ? "" : gm ? `<b>${escHtml(cardName(h))}</b> muss auf dem eigenen Gerät „Zulassen“ tippen – dann bist du in „${escHtml(W.host.a || "Gemeinsam")}“.` : `Tippe auf <b>${escHtml(cardName(h))}</b>${h.m && h.n ? ` (${escHtml(h.m)})` : ""} auf „Zulassen“.`}</p>
    ${W.ok ? "" : `<button class="btn" data-reqx="1">Abbrechen</button>`}</div>`;
}
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-reqx]")) return;
  reqCancel();
  if (ui.pstep === "wait") {
    ui.pstep = "join";
    pairUi();
  } else if (ui.view === "gemeinsam") {
    ui.gmStep = "join";
    renderGemeinsam();
  }
});
const RQH = {};
async function reqHostOpen(kind, box, extra) {
  reqHostStop(kind);
  const H = Object.assign(
    {
      kind,
      box,
      seen: {},
    },
    extra || {}
  );
  RQH[kind] = H;
  await boxPut(box, "host", {
    k: kind,
    card: await myCard(kind === "gm" ? currentMember().name : undefined),
    a: H.sp ? H.sp.n || "Gemeinsam" : "",
  });
  reqHostPoll(H);
  return H;
}
function reqHostStop(kind) {
  const H = RQH[kind];
  if (H) {
    H.stop = true;
    delete RQH[kind];
  }
}
function reqHostPoll(H) {
  setTimeout(async () => {
    if (H.stop) return;
    try {
      const a = await boxAll(H.box),
        q = a.req;
      if (q && q.id) {
        if (q.cancel) {
          if (ui.preq && ui.preq.q.id === q.id) {
            ui.preq = null;
            preqRender();
            toast("Die Anfrage wurde zurückgezogen");
          }
        } else if (!H.seen[q.id]) {
          H.seen[q.id] = 1;
          ui.preq = {
            H,
            q,
          };
          preqRender();
          try {
            navigator.vibrate && navigator.vibrate([30, 60, 30]);
          } catch (_) {}
        }
      }
    } catch (e) {
      if (e.status === 401) {
        H.stop = true;
        if (H.kind === "pair") {
          SHORT = null;
          try {
            if (ui.pstep === "show" && !$("loginBg").hidden) pairUi();
          } catch (_) {}
        }
        return;
      }
    }
    reqHostPoll(H);
  }, 2000);
}
const spMembers = (sp) => Object.keys(spLocal(sp.v).docs).filter((k) => k.startsWith("m-")).length;
function preqRender() {
  let bg = $("preqBg");
  const R = ui.preq;
  if (!R) {
    if (bg) bg.remove();
    return;
  }
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "preqBg";
    bg.className = "preqbg";
    document.body.appendChild(bg);
  }
  const c = R.q.card || {},
    gm = R.H.kind === "gm",
    area = gm ? R.H.sp.n || "Gemeinsam" : "";
  const mine = {
    n: String((gm ? currentMember().name : store.settings.name) || "").trim(),
    f: devForm(),
    p: store.settings.photo || "",
    main: isMain(),
  };
  bg.innerHTML = `<div class="preqbox ${R.done ? "ok" : ""}" role="dialog" aria-modal="true" aria-labelledby="preqT">
    <div class="plink">${cardAv(c, "big")}<span class="pline"><i></i><b>✓</b></span>${gm ? `<span class="pav big gmav"><b>${escHtml(area[0].toUpperCase())}</b></span>` : cardAv(mine, "big")}</div>
    <h2 id="preqT">${R.done ? (gm ? `${escHtml(cardName(c))} ist jetzt dabei` : "Gekoppelt!") : gm ? `${escHtml(cardName(c))} möchte „${escHtml(area)}“ beitreten` : `${escHtml(cardName(c))} möchte sich koppeln`}</h2>
    <p class="small muted">${escHtml(c.m || "")}${c.m ? " · " : ""}gerade eben<br>${gm ? "Sieht danach nur diesen gemeinsamen Bereich – nichts von deinen anderen Daten." : "Bekommt danach alle deine Buchungen und wird mit diesem Gerät abgeglichen."}</p>
    ${R.err ? `<p class="small" style="color:var(--bad);margin:0 0 8px">${escHtml(R.err)}</p>` : ""}
    ${R.done ? "" : `<button class="btn primary block" data-preq="1" ${R.busy ? "disabled" : ""}>Zulassen</button><button class="btn block preqno" data-preq="0" ${R.busy ? "disabled" : ""}>Ablehnen</button>`}</div>`;
}
async function preqAnswer(yes) {
  const R = ui.preq;
  if (!R || R.busy) return;
  R.busy = true;
  R.err = "";
  preqRender();
  const H = R.H;
  try {
    if (yes) {
      const full = H.kind === "gm" ? spMembers(H.sp) >= 10 : zDevs().length >= 10;
      if (full) {
        await boxPut(H.box, "deny", {
          id: R.q.id,
          why: "voll",
        });
        R.busy = false;
        R.err =
          H.kind === "gm"
            ? "Dieser Bereich hat schon 10 Mitglieder."
            : "Es sind schon 10 Geräte gekoppelt – entferne erst eins unter Geräte & Abgleich.";
        preqRender();
        return;
      }
      await boxPut(H.box, "code", {
        id: R.q.id,
        code: H.kind === "gm" ? spCode(H.sp) : pairCode(),
      });
      R.done = true;
      R.busy = false;
      SND.play("pair");
      preqRender();
      setTimeout(() => {
        if (ui.preq === R) {
          ui.preq = null;
          preqRender();
        }
      }, 2200);
      if (H.kind === "pair")
        setTimeout(() => {
          try {
            devPing(true);
            renderGeraete();
          } catch (_) {}
        }, 8000);
    } else {
      await boxPut(H.box, "deny", {
        id: R.q.id,
      });
      ui.preq = null;
      preqRender();
    }
  } catch (e) {
    R.busy = false;
    R.err = "Server nicht erreichbar – bist du online?";
    preqRender();
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-preq]");
  if (b) preqAnswer(b.dataset.preq === "1");
});
async function pairJoin(code) {
  if (!pairParse(code)) {
    const q = String(code || "").match(/HBQ1\.([0-9A-Za-z]{10})/),
      sc = q ? q[1] : code;
    if (/HBG1\./.test(String(code)))
      throw new Error("Das ist ein Code für „Gemeinsam“ – den gibst du unter Gemeinsam › Beitreten ein.");
    if (!shortOk(sc)) throw new Error("Das ist kein gültiger Kopplungs-Code – er hat 10 Zeichen, z. B. 7KF2-QX9M-3T.");
    ui.pstep = "wait";
    try {
      code = await reqAsk("pair", sc, await myCard());
    } catch (e) {
      if (ui.pstep === "wait") {
        ui.pstep = "join";
        pairUi();
      }
      throw e;
    }
  }
  const p = pairParse(code);
  if (!p) throw new Error("Das ist kein gültiger Kopplungs-Code.");
  pairSave(p);
  MODE = "pair";
  SERVER = pairUrl();
  SYNC.token = await pairToken();
  try {
    await api("pull", {
      qs: "&since=999999999",
    });
  } catch (e) {
    SYNC.token = "";
    pairSave(null);
    throw new Error(
      e.status === 401 ? "Dieser Code gehört zu keiner Kopplung (mehr)." : "Server nicht erreichbar – bist du online?"
    );
  }
  try {
    localStorage.removeItem("hb-main");
  } catch (_) {}
  loginDone(SYNC.token, false, "Gekoppelt – Daten werden geladen");
  if (!actGet()) {
    actSet({
      k: "pair",
    });
    const g = $("actBg");
    if (g) g.hidden = true;
    document.body.classList.remove("locked");
    legalGate();
  }
}
async function qrFromFile(file) {
  const bmp = await new Promise((ok, bad) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = bad;
    im.src = URL.createObjectURL(file);
  });
  try {
    if ("BarcodeDetector" in window) {
      const r = await new BarcodeDetector({
        formats: ["qr_code"],
      }).detect(bmp);
      if (r && r[0]) return r[0].rawValue;
    }
  } catch (e) {}
  for (const max of [1200, 800, 1800]) {
    const sc = Math.min(1, max / Math.max(bmp.naturalWidth, bmp.naturalHeight)),
      w = Math.round(bmp.naturalWidth * sc),
      h = Math.round(bmp.naturalHeight * sc);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.drawImage(bmp, 0, 0, w, h);
    const r = jsQR(x.getImageData(0, 0, w, h).data, w, h, {
      inversionAttempts: "attemptBoth",
    });
    if (r && r.data) return r.data;
  }
  return null;
}
function pairUi() {
  const el = $("loginPair");
  if (!el) return;
  const st = ui.pstep || "start",
    hasData = store.tx.length > 0 || store.fixed.length > 0;
  const code = pairCode();
  const meC = {
    n: String(store.settings.name || "").trim(),
    f: devForm(),
    m: devModel(),
    p: store.settings.photo || "",
    main: isMain(),
  };
  const roles = (left, lsub, right, rsub, lc, rc, back) =>
    `<div class="proles ${back ? "back" : ""}"><div>${lc}<b>${left}</b><small>${lsub}</small></div><button class="parr" data-pflip="1" title="Umdrehen" aria-label="Richtung umdrehen"><span>Daten</span>${svgIcon("right", 22)}<small>⇄ umdrehen</small></button><div>${rc}<b>${right}</b><small>${rsub}</small></div></div>`;
  const unknownAv = `<span class="pav big unk"><b>?</b></span>`,
    mainAv = `<span class="pav big"><b>${svgIcon("phone", 26)}</b><em class="pcrown">${svgIcon("crown", 12)}</em></span>`;
  el.innerHTML =
    st === "start"
      ? `<p class="pq">Wo sind deine Daten gerade?</p><div class="pchoice">
      <button class="pbig" data-pstep="first"><span class="pbi">${svgIcon("crown", 24)}</span><span><b>Hier – das wird mein Hauptgerät</b><small>Deine Daten bleiben auf diesem Gerät. Weitere Geräte fragen später hier an und du bestätigst sie.</small></span></button>
      <button class="pbig" data-pstep="join"><span class="pbi">${svgIcon("camera", 22)}</span><span><b>Auf einem anderen Gerät – ich komme dazu</b><small>Dieses Gerät holt sich die Daten von deinem Hauptgerät. Dort zeigst du dafür einen QR-Code an.</small></span></button></div>
      <div class="notice info"><span>${svgIcon("shield", 15)} <b>Kein Konto, keine E-Mail.</b> Deine Daten werden auf dem Gerät verschlüsselt – der Server sieht nur Zahlensalat und kann nichts lesen.</span></div>`
      : st === "first"
        ? `<p class="small" style="margin:0;line-height:1.5">Die App legt einen geheimen Schlüssel an, verschlüsselt deine Daten damit und lädt sie hoch. Danach koppelst du dein zweites Gerät mit dem QR-Code.</p>
      <div class="row-btns"><button class="btn" data-pstep="start">Zurück</button><button class="btn primary" id="pairFirst">Los geht's</button></div>`
        : st === "wait" && ui.rwait
          ? reqWaitHtml(ui.rwait)
          : st === "join"
            ? `${roles(
                "Dieses Gerät",
                "kommt dazu",
                "Hauptgerät",
                "hat deine Daten",
                cardAv(
                  {
                    ...meC,
                    main: false,
                  },
                  "big"
                ),
                mainAv,
                true
              )}
      <ol class="psteps"><li>${trBold("Öffne auf dem Hauptgerät **Einstellungen › Geräte › Gerät hinzufügen**.")}</li><li>Scanne hier den QR-Code von dort – oder tippe den Code ein.</li><li>Bestätige auf dem Hauptgerät die Anfrage.</li></ol>
      ${qrBtn("join", true)}
      <div class="field" style="margin:0"><label for="pairCode">… oder den Code vom Hauptgerät eintippen</label><input class="in" id="pairCode" placeholder="z. B. 7KF2-QX9M-3T" autocapitalize="characters" autocomplete="off" spellcheck="false" style="font:700 20px var(--f-display);letter-spacing:.08em;text-align:center"></div>
      ${hasData ? `<div class="notice warn"><span>${trBold("Auf **diesem** Gerät sind schon Daten. Sie werden durch die vom Hauptgerät ersetzt. Mach vorher ein Backup, wenn du unsicher bist.")}</span></div>` : ""}
      <button class="link small" id="pairRecv" style="margin:2px auto 0;display:block">Scannen klappt nicht? Andersherum: hier einen QR-Code zeigen und mit dem Hauptgerät scannen</button>
      <div class="row-btns"><button class="btn" data-pstep="start">Zurück</button><button class="btn primary" id="pairJoin">Anfrage senden</button></div>
      <p class="small muted" style="text-align:center;margin:0"><button class="link small" data-pstep="${SYNC.token && pairState() ? "show" : "first"}">${trBold("Moment – meine Daten sind auf **diesem** Gerät")}</button></p>`
            : st === "recv"
              ? `<p class="small" style="margin:0;line-height:1.5">Öffne auf dem Handy <b>Einstellungen › Abgleich › Weiteres Gerät koppeln</b>, tippe auf <b>„QR-Code vom anderen Gerät scannen“</b> und fotografiere diesen Code:</p>
      <div class="pqr">${ui.precv && ui.precv.v ? qrSvg("HBR1." + ui.precv.v + "." + ui.precv.k, 300) : `<div class="small muted" style="padding:90px 0">Wird vorbereitet …</div>`}</div>
      <p class="small" style="margin:0;text-align:center">… oder am Handy diesen Code eintippen:</p>
      <div class="pshort">${ui.precv ? escHtml(shortFmt(ui.precv.code)) : "…"}</div>
      <div class="notice info"><span id="pairRecvSt">Warte auf das Handy …</span></div>
      <div class="row-btns"><button class="btn" data-pstep="join">Zurück</button></div>`
              : `${roles("Dieses Gerät", isMain() ? "Hauptgerät · hat deine Daten" : "hat deine Daten", "Neues Gerät", "kommt dazu", cardAv(meC, "big"), unknownAv)}
      <ol class="psteps"><li>${trBold("Öffne Finanz MAMI auf dem **neuen** Gerät.")}</li><li>${trBold("Wähle dort **„Auf einem anderen Gerät – ich komme dazu“**.")}</li><li>Scanne diesen QR-Code oder tippe den Code darunter ein.</li><li>${trBold("Hier erscheint die Anfrage – tippe auf **Zulassen**.")}</li></ol>
      <div class="pqr" id="pairQr">${SHORT ? qrSvg("HBQ1." + SHORT.code, 230) : `<div class="small muted" style="padding:80px 0">Wird vorbereitet …</div>`}</div>
      <div class="pshort" id="pairShort">${SHORT ? escHtml(shortFmt(SHORT.code)) : "…"}</div>
      <div id="pairCtd">${ctdHtml(SHORT ? SHORT.t0 : 0, "pair")}</div>
      <p class="small muted" style="margin:0;text-align:center"><button class="link small" id="pairShortNew">Neuer Code</button></p>
      <details class="pmore"><summary>Das neue Gerät zeigt selbst einen QR-Code?</summary>${qrBtn("send", false)}
        <div class="field" style="margin:8px 0 0"><label for="pairSendCode">… oder dessen Code eingeben</label><div style="display:flex;gap:8px"><input class="in" id="pairSendCode" placeholder="z. B. 7KF2-QX9M-3T" autocapitalize="characters" autocomplete="off" spellcheck="false" style="font:700 18px var(--f-display);letter-spacing:.06em;text-align:center;flex:1;min-width:0"><button class="btn primary" id="pairSendGo">Koppeln</button></div></div></details>
      <details class="pmore" ${ui.pmoreOpen ? "open" : ""}><summary>QR-Code und Wiederherstellungs-Code</summary>
      <div class="pqr">${code ? qrSvg(code, 230) : ""}</div>
      <div class="pcode">${escHtml(code.replace(/(.{5})/g, "$1 ").trim())}</div>
      <div class="notice warn"><span><b>Halte diesen Code geheim</b> – wer ihn hat, sieht deine Finanzen. Heb ihn trotzdem gut auf (ausdrucken oder im Passwort-Manager): Gehen alle Geräte verloren, kommst du nur damit wieder an deine Daten.</span></div>
      </details>
      <div class="row-btns"><button class="btn" id="pairCopy">Langen Code kopieren</button><button class="btn primary" id="pairDone">Fertig</button></div>`;
  const t = $("loginTitle");
  if (t)
    t.textContent =
      st === "show"
        ? "Gerät hinzufügen"
        : st === "wait"
          ? "Anfrage gesendet"
          : st === "join" || st === "recv"
            ? "Zum Hauptgerät dazukommen"
            : "Geräte koppeln";
  const sk = $("loginSkip");
  if (sk) sk.hidden = !!SYNC.token;
  if (st === "recv") pairRecvRun();
  else pairRecvStop();
  if (st === "show" && !SHORT && !ui.pshortBusy) {
    ui.pshortBusy = true;
    shortMake()
      .then(() => {
        const e = $("pairShort");
        if (e && SHORT) e.textContent = shortFmt(SHORT.code);
        const q = $("pairQr");
        if (q && SHORT) q.innerHTML = qrSvg("HBQ1." + SHORT.code, 230);
        const c = document.querySelector("#pairCtd [data-ctd]");
        if (c && SHORT) {
          c.dataset.ctd = SHORT.t0;
          delete c.dataset.done;
          ctdTick();
        }
      })
      .catch(() => {
        const e = $("pairShort");
        if (e) e.textContent = "Server nicht erreichbar";
      })
      .finally(() => {
        ui.pshortBusy = false;
      });
  }
}
let PRECV_T = 0;
const canQrLive = () =>
  !IS_DESK &&
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
  (!!window.AndroidBridge || /Android|iPhone|iPad/i.test(navigator.userAgent));
function qrBtn(kind, primary) {
  const cls = `btn ${primary ? "primary " : ""}block`,
    st = 'style="justify-content:center;gap:8px"';
  if (canQrLive())
    return `<button class="${cls}" ${st} data-qrlive="${kind}">${svgIcon("camera", 18)} QR-Code vom anderen Gerät scannen</button>`;
  return `<label class="${cls}" ${st}>${svgIcon("camera", 18)} Bild mit QR-Code auswählen<input type="file" accept="image/*" id="${kind === "send" ? "pairSendCam" : "pairCam"}" hidden></label>`;
}
async function qrLive(want) {
  const bg = document.createElement("div");
  bg.className = "qrlive";
  bg.innerHTML = `<video playsinline muted autoplay></video><div class="qrframe"></div><p>Halte die Kamera auf den QR-Code</p><button class="btn" data-qrstop>Abbrechen</button>`;
  document.body.appendChild(bg);
  const v = bg.querySelector("video");
  let stream = null,
    done = false,
    det = null;
  const stop = () => {
    done = true;
    try {
      stream && stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    bg.remove();
  };
  bg.querySelector("[data-qrstop]").onclick = () => {
    stop();
    bg.res && bg.res(null);
  };
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: "environment",
        },
        width: {
          ideal: 1920,
        },
        height: {
          ideal: 1080,
        },
      },
      audio: false,
    });
    try {
      const tr = stream.getVideoTracks()[0],
        cap = tr.getCapabilities ? tr.getCapabilities() : {};
      if ((cap.focusMode || []).includes("continuous"))
        await tr.applyConstraints({
          advanced: [
            {
              focusMode: "continuous",
            },
          ],
        });
    } catch (_) {}
  } catch (e) {
    stop();
    throw new Error("Die Kamera konnte nicht geöffnet werden. Erlaube den Kamera-Zugriff für Finanz MAMI.");
  }
  v.srcObject = stream;
  try {
    await v.play();
  } catch (_) {}
  try {
    if ("BarcodeDetector" in window)
      det = new BarcodeDetector({
        formats: ["qr_code"],
      });
  } catch (_) {}
  const c = document.createElement("canvas"),
    x = c.getContext("2d", {
      willReadFrequently: true,
    });
  let pass = 0;
  return await new Promise((res) => {
    bg.res = res;
    const tick = async () => {
      if (done) return;
      if (v.videoWidth) {
        let t = null;
        try {
          if (det) {
            const r = await det.detect(v);
            if (r && r[0]) t = r[0].rawValue;
          }
        } catch (_) {
          det = null;
        }
        if (!t) {
          const W = v.videoWidth,
            H = v.videoHeight,
            mid = pass++ % 2 === 1;
          const sw = mid ? Math.round(Math.min(W, H) * 0.6) : W,
            sh = mid ? sw : H,
            sx = (W - sw) / 2,
            sy = (H - sh) / 2,
            k = Math.min(1, (mid ? 900 : 800) / Math.max(sw, sh));
          c.width = Math.round(sw * k);
          c.height = Math.round(sh * k);
          x.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
          const r = jsQR(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height, {
            inversionAttempts: "attemptBoth",
          });
          if (r && r.data) t = r.data;
        }
        if (t && want.test(t)) {
          try {
            navigator.vibrate && navigator.vibrate(30);
          } catch (_) {}
          stop();
          res(t);
          return;
        }
      }
      setTimeout(tick, 120);
    };
    tick();
  });
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-qrlive]");
  if (!b) return;
  const kind = b.dataset.qrlive;
  $("loginErr").textContent = "";
  if (kind === "gm" || kind === "code") {
    try {
      const t = await qrLive(kind === "gm" ? /HBS1\.|HBG1\./ : /\S/);
      if (!t) return;
      if (kind === "gm") {
        const c = $("gmCode");
        if (c) c.value = t;
        const g = $("gmJoinGo");
        if (g) g.click();
      } else if (ui.code) {
        ui.code.val = t.trim();
        ui.code.err = "";
        codeRender();
      }
    } catch (x) {
      toast(x.message);
    }
    return;
  }
  try {
    const t = await qrLive(kind === "send" ? /HBR1\./ : /HBP1\.|HBQ1\./);
    if (!t) return;
    if (kind === "send") {
      await pairSendTo(t);
      toast("Gesendet – das andere Gerät koppelt sich jetzt");
      $("loginBg").hidden = true;
      ui.pstep = "start";
    } else {
      $("pairCode").value = t;
      await pairJoin(t);
      ui.pstep = "start";
    }
  } catch (x) {
    if (!x.cancel) $("loginErr").textContent = x.message || "Das hat nicht geklappt.";
  }
});
function pairRecvStop() {
  clearTimeout(PRECV_T);
  PRECV_T = 0;
  const m = ui.precv;
  ui.precv = null;
  if (m && m.made) spRequest(m, "wipe", "", {}).catch(() => {});
}
async function pairRecvRun() {
  if (ui.precv) return;
  const r = crypto.getRandomValues(new Uint8Array(10)),
    code = [...r].map((x) => SC_ABC[x & 31]).join("");
  const m = {
    code,
    t0: Date.now(),
  };
  ui.precv = m;
  Object.assign(m, await shortBox(code));
  try {
    const K = await spKeys(m);
    await spRequest(m, "create", "", {
      vault: K.vault,
      auth: K.auth,
    });
    m.made = true;
  } catch (e) {
    ui.precv = null;
    $("loginErr").textContent = "Server nicht erreichbar – bist du online?";
    return;
  }
  if (ui.precv !== m) return;
  pairUi();
  const poll = async () => {
    if (ui.precv !== m || $("loginBg").hidden) return pairRecvStop();
    if (Date.now() - m.t0 > 10 * 60 * 1000) {
      const st = $("pairRecvSt");
      if (st) st.textContent = "Zeit abgelaufen – tippe auf Zurück und versuch es nochmal.";
      return pairRecvStop();
    }
    try {
      const K = await spKeys(m),
        res = await spRequest(m, "pull", "&since=0");
      for (const d of res.docs || []) {
        if (!d.b) continue;
        let o = null;
        try {
          o = await spDec(K, d.b);
        } catch (_) {}
        const code = o && o.d && o.d.code;
        if (code && pairParse(code)) {
          const st = $("pairRecvSt");
          if (st)
            st.textContent =
              (o.d.card ? cardName(o.d.card) + " gefunden" : "Handy gefunden") + " – Daten werden geladen …";
          pairRecvStop();
          try {
            await pairJoin(code);
            ui.pstep = "start";
          } catch (x) {
            $("loginErr").textContent = x.message;
            ui.pstep = "join";
            pairUi();
          }
          return;
        }
      }
    } catch (_) {}
    PRECV_T = setTimeout(poll, 2000);
  };
  PRECV_T = setTimeout(poll, 1500);
}
async function pairSendTo(t) {
  const m = String(t || "")
    .replace(/\s+/g, "")
    .match(/HBR1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})/);
  if (!m && !shortOk(t)) throw new Error("Das ist kein gültiger Code – er hat 10 Zeichen, z. B. 7KF2-QX9M-3T.");
  const code = pairCode();
  if (!code) throw new Error("Dieses Gerät ist noch nicht gekoppelt.");
  const box = m
      ? {
          v: m[1],
          k: m[2],
          s: "",
        }
      : await shortBox(t),
    K = await spKeys(box);
  const op = {
    h: b64u((await crypto.subtle.sign("HMAC", K.mac, new TextEncoder().encode("sp\u0000code"))).slice(0, 24)),
    b: await spEnc(K, {
      i: "code",
      d: {
        code,
        card: await myCard(),
      },
    }),
  };
  if (zDevs().length >= 10)
    throw new Error("Es sind schon 10 Geräte gekoppelt – entferne erst eins unter Geräte & Abgleich.");
  try {
    await spRequest(box, "push", "", {
      ops: [op],
    });
  } catch (e) {
    throw new Error(
      e.status === 401
        ? "Dieser Code ist abgelaufen – lass dir am anderen Gerät einen neuen zeigen."
        : "Server nicht erreichbar – bist du online?"
    );
  }
  return true;
}
function pairShow(step) {
  ui.pstep = step || ui.pstep || "start";
  const bg = $("loginBg");
  bg.hidden = false;
  $("loginErr").textContent = "";
  loginModeUi();
  pairUi();
}
document.addEventListener("click", async (e) => {
  const s = e.target.closest("[data-pstep]");
  if (s) {
    ui.pstep = s.dataset.pstep;
    $("loginErr").textContent = "";
    pairUi();
    return;
  }
  const fl = e.target.closest("[data-pflip]");
  if (fl) {
    const box = fl.closest(".proles");
    if (box) box.classList.add("flip");
    setTimeout(() => {
      const st = ui.pstep;
      $("loginErr").textContent = "";
      ui.pstep = st === "show" ? "join" : SYNC.token && pairState() ? "show" : "first";
      if (ui.pstep === "join") shortDrop();
      pairUi();
      const nb = document.querySelector("#loginPair .proles");
      if (nb) {
        nb.classList.add("flipin");
        setTimeout(() => nb.classList.remove("flipin"), 450);
      }
    }, 320);
    return;
  }
  if (e.target.closest("#pairFirst")) {
    const b = e.target.closest("#pairFirst");
    b.disabled = true;
    b.textContent = "Wird eingerichtet …";
    if (actNeed()) {
      $("loginBg").hidden = true;
      actGate();
      return;
    }
    try {
      await pairStart();
      $("loginBg").hidden = false;
      ui.pstep = "show";
      loginModeUi();
      pairUi();
    } catch (x) {
      console.warn("pair", x);
      pairSave(null);
      SYNC.token = "";
      $("loginErr").textContent = !(window.crypto && crypto.subtle)
        ? "Koppeln geht nur in der Handy- oder PC-App."
        : x.status === 429
          ? x.message
          : "Server nicht erreichbar – bist du online?";
      b.disabled = false;
      b.textContent = "Los geht's";
    }
    return;
  }
  if (e.target.closest("#pairJoin")) {
    const b = e.target.closest("#pairJoin");
    b.disabled = true;
    try {
      await pairJoin($("pairCode").value);
      ui.pstep = "start";
    } catch (x) {
      if (!x.cancel) $("loginErr").textContent = x.message;
    } finally {
      b.disabled = false;
    }
    return;
  }
  if (e.target.closest("#pairCopy")) {
    try {
      await copySecret(pairCode());
      toast("Code kopiert – nach einer Minute wird er aus der Zwischenablage gelöscht");
    } catch (_) {
      toast("Bitte den Code markieren und kopieren");
    }
    return;
  }
  if (e.target.closest("#pairDone")) {
    ui.pmoreOpen = false;
    $("loginBg").hidden = true;
    ui.pstep = "start";
    renderSyncInfo();
    return;
  }
  if (e.target.closest("#pairShortNew")) {
    shortDrop();
    pairUi();
    return;
  }
  if (e.target.closest("#pairMore")) {
    if (zDevs().length >= 10) {
      toast(
        "Es sind schon 10 Geräte gekoppelt – entferne erst ein altes unter Einstellungen › Geräte",
        null,
        null,
        7000
      );
      return;
    }
    if (SYNC.token && pairState()) pairShow("show");
    else showLogin();
    return;
  }
  if (e.target.closest("#pairOther")) {
    if (!ui.pairOtherArm) {
      ui.pairOtherArm = true;
      renderGeraete();
      setTimeout(() => {
        ui.pairOtherArm = false;
        renderGeraete();
      }, 6000);
      return;
    }
    ui.pairOtherArm = false;
    renderGeraete();
    pairShow("join");
    return;
  }
  if (e.target.closest("#syncCode")) {
    ui.pmoreOpen = true;
    pairShow("show");
    return;
  }
  if (e.target.closest("#pairWipe")) {
    const b = e.target.closest("#pairWipe");
    if (b.dataset.armed !== "1") {
      b.dataset.armed = "1";
      b.textContent = "Wirklich? Alle gekoppelten Daten auf dem Server löschen";
      setTimeout(() => {
        b.dataset.armed = "";
        renderSyncSec();
      }, 5000);
      return;
    }
    try {
      await api("wipe", {
        body: {},
      });
    } catch (_) {}
    pairSave(null);
    SYNC.token = "";
    SYNC.queue = [];
    SYNC.rq = [];
    SYNC.state = "off";
    saveSync();
    toast("Kopplung gelöscht – deine Daten bleiben auf diesem Gerät");
    renderSyncInfo();
    renderSyncDot();
    renderGeraete();
    return;
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "pairSendCam") return;
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  $("loginErr").textContent = "QR-Code wird gelesen …";
  try {
    const t = await qrFromFile(f);
    if (!t || !/HBR1\./.test(t)) {
      $("loginErr").textContent = "Kein Kopplungs-Code erkannt. Halte das Handy ruhig und näher an den Bildschirm.";
      return;
    }
    await pairSendTo(t);
    $("loginErr").textContent = "";
    toast("Gesendet – das andere Gerät koppelt sich jetzt");
    $("loginBg").hidden = true;
    ui.pstep = "start";
  } catch (x) {
    $("loginErr").textContent = x.message || "Server nicht erreichbar – bist du online?";
  }
});
document.addEventListener("click", async (e) => {
  const b = e.target.closest("#pairSendGo");
  if (!b) return;
  b.disabled = true;
  $("loginErr").textContent = "";
  try {
    await pairSendTo($("pairSendCode").value);
    toast("Gesendet – das andere Gerät koppelt sich jetzt");
    $("loginBg").hidden = true;
    ui.pstep = "start";
  } catch (x) {
    $("loginErr").textContent =
      x.status === 401
        ? "Diesen Code gibt es nicht (mehr) – er gilt 10 Minuten."
        : x.message || "Das hat nicht geklappt.";
  } finally {
    b.disabled = false;
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "pairSendCode") {
    const b = $("pairSendGo");
    if (b) b.click();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "pairCode") {
    const b = $("pairJoin");
    if (b) b.click();
  }
});
document.addEventListener("click", (e) => {
  if (e.target.closest("#pairRecv")) {
    ui.pstep = "recv";
    $("loginErr").textContent = "";
    pairUi();
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "pairCam") return;
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  $("loginErr").textContent = "QR-Code wird gelesen …";
  try {
    const t = await qrFromFile(f);
    if (!t || !(pairParse(t) || /HBQ1\./.test(t))) {
      $("loginErr").textContent =
        "Kein Kopplungs-Code erkannt. Halte das Handy ruhig und näher an den Bildschirm – oder füge den Code ein.";
      return;
    }
    $("pairCode").value = t;
    $("loginErr").textContent = "";
    await pairJoin(t);
    ui.pstep = "start";
  } catch (x) {
    $("loginErr").textContent = x.message || "Das hat nicht geklappt.";
  }
});

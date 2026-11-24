/* App-Sperre */
async function copySecret(text) {
  const B = window.AndroidBridge;
  if (B && typeof B.copySecret === "function") {
    B.copySecret(String(text), 60);
    return true;
  }
  await navigator.clipboard.writeText(String(text));
  setTimeout(async () => {
    try {
      if (document.hasFocus() && (await navigator.clipboard.readText()) === String(text))
        await navigator.clipboard.writeText("");
    } catch (_) {}
  }, 60000);
  return true;
}
function sha256hex(str) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
    0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
    0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2,
  ];
  const b = new TextEncoder().encode(str),
    l = b.length,
    n = ((l + 9 + 63) >> 6) << 6,
    m = new Uint8Array(n);
  m.set(b);
  m[l] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(n - 4, l * 8);
  dv.setUint32(n - 8, Math.floor(l / 0x20000000));
  let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array(64),
    r = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3),
        s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b2, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0,
        t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b2) ^ (a & c) ^ (b2 & c))) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b2;
      b2 = a;
      a = (t1 + t2) | 0;
    }
    h = h.map((v, i) => (v + [a, b2, c, d, e, f, g, hh][i]) | 0);
  }
  return h.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
}
const LOCK_KEY = "haushaltsbuch-lock";
function lockTriesSave() {
  try {
    localStorage.setItem(
      "hb-lock-tries",
      JSON.stringify({
        f: LOCK.fails || 0,
        u: LOCK.until || 0,
        r: LOCK.rounds || 0,
      })
    );
  } catch (e) {}
}
function lockTriesLoad() {
  try {
    const t = JSON.parse(localStorage.getItem("hb-lock-tries") || "{}");
    LOCK.fails = Number(t.f) || 0;
    LOCK.until = Number(t.u) || 0;
    LOCK.rounds = Number(t.r) || 0;
  } catch (e) {}
}
function lockCfg() {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || "null");
  } catch (e) {
    return null;
  }
}
function pinHashOld(pin, salt) {
  let h = salt + ":" + pin;
  for (let i = 0; i < 2000; i++) h = sha256hex(h + pin);
  return h;
}
const PIN_ITER = 310000,
  pinV2 = () => !!(window.AndroidBridge && typeof window.AndroidBridge.pbkdf2 === "function");
function pinHash(pin, salt, v) {
  if ((v === undefined || v === 2) && pinV2()) {
    const h = String(window.AndroidBridge.pbkdf2(String(pin), String(salt), PIN_ITER) || "");
    if (h) return "v2:" + h;
  }
  return pinHashOld(pin, salt);
}
const pinVer = (h) => (String(h || "").startsWith("v2:") ? 2 : 1);
function pinCheck(pin, salt, hash) {
  return pinHash(pin, salt, pinVer(hash)) === hash;
}
const BIO = !!(
  window.AndroidBridge &&
  window.AndroidBridge.biometricAvailable &&
  window.AndroidBridge.biometricAvailable()
);
const LOCK = {
  mode: null,
  pin: "",
  first: "",
  fails: 0,
  until: 0,
  hiddenAt: 0,
  done: null,
};
lockTriesLoad();

/* PIN vergessen */
function recoveryCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
    r = crypto.getRandomValues(new Uint8Array(12));
  let c = "";
  for (let i = 0; i < 12; i++) {
    c += A[r[i] % A.length];
    if (i === 3 || i === 7) c += "-";
  }
  return c;
}
function recNorm(c) {
  return String(c || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/I/g, "1");
}
function lockPanel(html) {
  const on = !!html;
  $("lockAlt").innerHTML = html || "";
  $("lockAlt").hidden = !on;
  ["pinDots", "keypad", "lockForgot"].forEach((id) => ($(id).hidden = on));
  if (!on) $("lockForgot").hidden = LOCK.mode !== "unlock";
}
function bioOffer(done) {
  $("lockTitle").textContent = "Auch mit Fingerabdruck entsperren?";
  $("lockText").textContent = "Dann reicht zum Öffnen dein Finger – die PIN bleibt als Ersatz.";
  lockPanel(
    `<button class="btn primary block" id="bioYes">Ja, Fingerabdruck verwenden</button><button class="btn block" id="bioNo">Nein, nur PIN</button>`
  );
  $("lockNext").hidden = true;
  $("lockCancel").hidden = true;
  $("bioNo").onclick = () => {
    lockPanel("");
    done();
  };
  $("bioYes").onclick = () => {
    const id = newId();
    bioWaiting[id] = (ok) => {
      if (!ok) {
        $("lockErr").textContent = "Fingerabdruck nicht erkannt – du kannst es später unter Sicherheit einschalten.";
        return;
      }
      const c = lockCfg();
      if (c) {
        c.bio = true;
        try {
          localStorage.setItem(LOCK_KEY, JSON.stringify(c));
        } catch (_) {}
      }
      lockPanel("");
      done();
      toast("Fingerabdruck ist eingerichtet");
    };
    try {
      window.AndroidBridge.biometric(id);
    } catch (_) {
      lockPanel("");
      done();
    }
  };
}
function showRecovery(code, done) {
  $("lockTitle").textContent = "Dein Wiederherstellungscode";
  $("lockText").textContent =
    "Schreib ihn auf und bewahr ihn sicher auf. Damit entsperrst du die App, falls du die PIN vergisst.";
  lockPanel(
    `<div class="reccode">${escHtml(code)}</div><span class="small muted">Er wird nur dieses eine Mal angezeigt.</span><button class="btn primary" id="recDone">Ich habe ihn aufgeschrieben</button>`
  );
  $("lockNext").hidden = true;
  $("lockCancel").hidden = true;
  $("recDone").onclick = () => {
    lockPanel("");
    done();
  };
}
const CAN_DEVICE = !!(
  window.AndroidBridge &&
  window.AndroidBridge.deviceCredential &&
  window.AndroidBridge.deviceSecure &&
  (() => {
    try {
      return window.AndroidBridge.deviceSecure();
    } catch (e) {
      return false;
    }
  })()
);
function lockForgotShow() {
  const cfg = lockCfg() || {};
  const opts = [];
  if (CAN_DEVICE) opts.push(`<button class="btn block" id="lfDevice">Mit der Displaysperre des Handys</button>`);
  if (SYNC.token) opts.push(`<button class="btn block" id="lfPw">Mit dem Passwort vom Abgleich</button>`);
  if (cfg.rec) opts.push(`<button class="btn block" id="lfRec">Mit dem Wiederherstellungscode</button>`);
  $("lockText").textContent = opts.length
    ? "So kannst du die App trotzdem entsperren und eine neue PIN festlegen:"
    : "";
  lockPanel(
    `${opts.join("")}${!opts.length ? `<span class="small">Die PIN lässt sich auf diesem Gerät nicht zurücksetzen. Lösch die App-Daten (bzw. installier das Programm neu) und melde dich mit deinem Server an – dann kommen deine Daten zurück.</span>` : ""}<button class="link small" id="lfBack">Zurück zur PIN</button>`
  );
}
function lockForgotOk() {
  LOCK.fails = 0;
  LOCK.rounds = 0;
  LOCK.until = 0;
  lockTriesSave();
  LOCK.recUsed = true;
  lockPanel("");
  toast("Entsperrt – leg jetzt eine neue PIN fest");
  lockShow("set", () => renderLockEd());
}
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (!t.closest("#lockAlt")) return;
  if (t.closest("#lfBack")) {
    lockPanel("");
    $("lockText").textContent = "Gib deine PIN ein.";
    return;
  }
  if (t.closest("#lfDevice")) {
    const id = newId();
    bioWaiting[id] = (ok) => {
      if (ok) {
        LOCK.recUsed = false;
        lockForgotOk();
      } else $("lockErr").textContent = "Nicht entsperrt.";
    };
    try {
      AndroidBridge.deviceCredential(id);
    } catch (_) {}
    return;
  }
  if (t.closest("#lfPw")) {
    lockPanel(
      `<input class="in" type="password" id="lfPwIn" placeholder="Passwort für den Abgleich" autocomplete="current-password"><button class="btn primary block" id="lfPwGo">Entsperren</button><button class="link small" id="lfBack">Zurück zur PIN</button>`
    );
    setTimeout(() => $("lfPwIn").focus(), 30);
    return;
  }
  if (t.closest("#lfPwGo")) {
    const pw = $("lfPwIn").value;
    if (!pw) return;
    $("lfPwGo").disabled = true;
    $("lockErr").textContent = "";
    try {
      await api("verify", {
        body: {
          password: pw,
        },
      });
      LOCK.recUsed = false;
      lockForgotOk();
    } catch (x) {
      $("lockErr").textContent =
        x.status === 403
          ? "Das Passwort stimmt nicht."
          : x.status === 429
            ? x.message
            : x.status === 404
              ? "Dafür braucht der Server eine neuere Version."
              : "Server gerade nicht erreichbar.";
    } finally {
      const b = $("lfPwGo");
      if (b) b.disabled = false;
    }
    return;
  }
  if (t.closest("#lfRec")) {
    lockPanel(
      `<input class="in" id="lfRecIn" placeholder="z. B. K7QM-4XPA-9TRE" autocomplete="off" autocapitalize="characters" spellcheck="false" style="text-align:center;letter-spacing:.08em"><button class="btn primary block" id="lfRecGo">Entsperren</button><button class="link small" id="lfBack">Zurück zur PIN</button>`
    );
    setTimeout(() => $("lfRecIn").focus(), 30);
    return;
  }
  if (t.closest("#lfRecGo")) {
    const cfg = lockCfg() || {};
    if (Date.now() < LOCK.until) {
      $("lockErr").textContent = `Zu viele Versuche – warte ${Math.ceil((LOCK.until - Date.now()) / 1000)} Sekunden.`;
      return;
    }
    if (cfg.rec && pinCheck(recNorm($("lfRecIn").value), cfg.rec.salt, cfg.rec.hash)) lockForgotOk();
    else {
      LOCK.fails++;
      if (LOCK.fails >= 5) {
        LOCK.rounds = (LOCK.rounds || 0) + 1;
        LOCK.until = Date.now() + [30, 120, 600, 3600][Math.min(3, LOCK.rounds - 1)] * 1000;
        LOCK.fails = 0;
      }
      lockTriesSave();
      $("lockErr").textContent = "Der Code stimmt nicht.";
    }
  }
});
function lockShow(mode, done) {
  LOCK.mode = mode;
  LOCK.pin = "";
  LOCK.first = "";
  LOCK.done = done || null;
  const cfg = lockCfg();
  $("lockTitle").textContent =
    mode === "unlock" ? "Finanz MAMI gesperrt" : mode === "check" ? "PIN bestätigen" : "Neue PIN festlegen";
  $("lockText").textContent = mode === "set" ? "Wähl eine PIN mit 4 bis 6 Ziffern." : "Gib deine PIN ein.";
  $("lockCancel").hidden = mode === "unlock";
  $("lockNext").hidden = mode !== "set";
  $("lockForgot").hidden = mode !== "unlock";
  $("bioKey").classList.toggle("off", !(mode === "unlock" && BIO && cfg && cfg.bio));
  lockPanel("");
  $("lockErr").textContent = "";
  lockDots();
  $("lockBg").hidden = false;
  if (mode === "unlock" && BIO && cfg && cfg.bio) setTimeout(lockBio, 300);
}
function lockDots() {
  const cfg = lockCfg(),
    len = LOCK.mode === "set" ? Math.max(4, LOCK.pin.length) : cfg ? cfg.len : 4;
  $("pinDots").innerHTML = Array.from(
    {
      length: Math.min(6, len),
    },
    (_, i) => `<span class="${i < LOCK.pin.length ? "on" : ""}"></span>`
  ).join("");
}
function lockClose(ok) {
  $("lockBg").hidden = true;
  const d = LOCK.done;
  LOCK.mode = null;
  LOCK.pin = "";
  if (d) d(ok);
}
function lockWrong(msg) {
  LOCK.pin = "";
  lockDots();
  $("lockErr").textContent = msg;
  const el = $("pinDots");
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
}
function lockKey(k) {
  if (!LOCK.mode) return;
  if (k === "bio") {
    lockBio();
    return;
  }
  if (k === "del") {
    LOCK.pin = LOCK.pin.slice(0, -1);
    lockDots();
    return;
  }
  if (Date.now() < LOCK.until) {
    $("lockErr").textContent = `Zu viele Versuche – warte ${Math.ceil((LOCK.until - Date.now()) / 1000)} Sekunden.`;
    return;
  }
  if (LOCK.pin.length >= 6) return;
  LOCK.pin += k;
  lockDots();
  $("lockErr").textContent = "";
  const cfg = lockCfg();
  if (LOCK.mode === "set") {
    if (!LOCK.first && LOCK.pin.length >= 4 && LOCK.pin.length < 6)
      $("lockText").textContent = "Tipp auf „Weiter“ oder gib bis zu 6 Ziffern ein.";
    if (LOCK.first && LOCK.pin.length === LOCK.first.length) {
      if (LOCK.pin !== LOCK.first) {
        LOCK.first = "";
        $("lockNext").hidden = false;
        $("lockText").textContent = "Wähl eine PIN mit 4 bis 6 Ziffern.";
        lockWrong("Die PINs stimmen nicht überein. Nochmal von vorn.");
        return;
      }
      const salt = newId();
      const old = lockCfg();
      const keepRec = old && old.rec && !LOCK.recUsed,
        code = keepRec ? null : recoveryCode();
      const rec = keepRec
        ? old.rec
        : (() => {
            const s2 = newId();
            return {
              salt: s2,
              hash: pinHash(recNorm(code), s2),
            };
          })();
      try {
        localStorage.setItem(
          LOCK_KEY,
          JSON.stringify({
            salt,
            hash: pinHash(LOCK.pin, salt),
            len: LOCK.pin.length,
            bio: old ? !!old.bio : false,
            rec,
          })
        );
      } catch (e) {
        lockWrong("PIN konnte nicht gespeichert werden.");
        return;
      }
      LOCK.recUsed = false;
      const finish = () => {
        lockClose(true);
        toast("App-Sperre ist an");
      };
      const askBio = () => {
        if (BIO && !(old && old.bio)) bioOffer(finish);
        else finish();
      };
      if (code) {
        showRecovery(code, askBio);
        return;
      }
      askBio();
      return;
    }
    if (!LOCK.first && LOCK.pin.length === 6) lockSetNext();
    return;
  }
  if (cfg && LOCK.pin.length === cfg.len) {
    if (pinCheck(LOCK.pin, cfg.salt, cfg.hash)) {
      if (pinVer(cfg.hash) < 2 && pinV2()) {
        const h = pinHash(LOCK.pin, cfg.salt);
        if (pinVer(h) === 2) {
          cfg.hash = h;
          try {
            localStorage.setItem(LOCK_KEY, JSON.stringify(cfg));
          } catch (_) {}
        }
      }
      LOCK.fails = 0;
      LOCK.rounds = 0;
      LOCK.until = 0;
      lockTriesSave();
      lockClose(true);
    } else {
      LOCK.fails++;
      if (LOCK.fails >= 5) {
        LOCK.rounds = (LOCK.rounds || 0) + 1;
        const w = [30, 120, 600, 3600][Math.min(3, LOCK.rounds - 1)];
        LOCK.until = Date.now() + w * 1000;
        LOCK.fails = 0;
      }
      lockTriesSave();
      lockWrong(
        LOCK.until > Date.now()
          ? `Zu viele Versuche – warte ${Math.ceil((LOCK.until - Date.now()) / 1000)} Sekunden.`
          : "Falsche PIN"
      );
    }
  }
}
function lockSetNext() {
  if (LOCK.pin.length < 4) {
    lockWrong("Mindestens 4 Ziffern");
    return;
  }
  LOCK.first = LOCK.pin;
  LOCK.pin = "";
  $("lockText").textContent = "Gib die PIN zur Bestätigung noch einmal ein.";
  $("lockNext").hidden = true;
  lockDots();
}
$("lockNext").onclick = () => lockSetNext();
function lockBio() {
  if (!BIO || LOCK.mode !== "unlock") return;
  const id = newId();
  bioWaiting[id] = (ok) => {
    if (ok && LOCK.mode === "unlock") lockClose(true);
  };
  window.AndroidBridge.biometric(id);
}
const bioWaiting = {};
window.hbBioDone = (id, ok) => {
  const f = bioWaiting[id];
  if (f) {
    delete bioWaiting[id];
    f(!!ok);
  }
};
$("keypad").addEventListener("click", (e) => {
  const b = e.target.closest("[data-k]");
  if (b) lockKey(b.dataset.k);
});
document.addEventListener("keydown", (e) => {
  if (!LOCK.mode) return;
  if (/^\d$/.test(e.key)) lockKey(e.key);
  else if (e.key === "Backspace") lockKey("del");
  else if (e.key === "Enter" && LOCK.mode === "set" && !LOCK.first) lockSetNext();
  else if (e.key === "Escape" && LOCK.mode !== "unlock") lockClose(false);
});
$("lockCancel").onclick = () => lockClose(false);
$("lockForgot").onclick = () => {
  lockForgotShow();
};
$("pinDots").addEventListener("click", () => {
  if (LOCK.mode === "set" && !LOCK.first) lockSetNext();
});
function lockIfNeeded() {
  if (lockCfg() && !LOCK.mode && LOCK.hiddenAt && Date.now() - LOCK.hiddenAt > 60000) lockShow("unlock");
  LOCK.hiddenAt = 0;
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") LOCK.hiddenAt = Date.now();
  else lockIfNeeded();
});
window.hbPaused = () => {
  LOCK.hiddenAt = Date.now();
  try {
    notifyPlan();
  } catch (e) {}
};
window.hbResumed = () => {
  lockIfNeeded();
  try {
    if ($("notifyEd") && $("notifyEd").offsetParent) renderNotifyEd();
  } catch (_) {}
};
if (lockCfg()) lockShow("unlock");
function renderLockEd() {
  const el = $("lockEd");
  if (!el) return;
  const cfg = lockCfg();
  el.innerHTML = cfg
    ? `<div class="meta-row"><span>App-Sperre ist <b>an</b> (PIN mit ${Number(cfg.len) || 0} Ziffern)</span></div>
       ${BIO ? `<div class="switch"><label for="lockBioChk"><b>Fingerabdruck</b><br><span class="small muted">Statt PIN mit Fingerabdruck entsperren</span></label><input type="checkbox" id="lockBioChk" ${cfg.bio ? "checked" : ""}></div>` : ""}
       <div class="row-btns"><button class="btn" id="lockChange">PIN ändern</button><button class="btn" id="lockOff">Sperre ausschalten</button></div>
       <div class="meta-row"><span class="small muted">${cfg.rec ? "Wiederherstellungscode ist eingerichtet – damit entsperrst du die App, falls du die PIN vergisst." : "Noch kein Wiederherstellungscode – leg einen an, falls du die PIN mal vergisst."}</span></div>
       <div class="row-btns" style="justify-content:flex-start"><button class="btn" id="lockRecNew">${cfg.rec ? "Neuen Wiederherstellungscode" : "Wiederherstellungscode anlegen"}</button></div>`
    : `<div class="meta-row"><span>Schützt deine Finanzen mit einer PIN${BIO ? " oder deinem Fingerabdruck" : ""}, wenn jemand anderes dein ${NATIVE && !(window.AndroidBridge || {}).desktop ? (IS_TAB ? "Tablet" : "Handy") : "Gerät"} benutzt.</span></div><div class="row-btns"><button class="btn primary" id="lockOn">App-Sperre einrichten</button></div>`;
  if (window.AndroidBridge && typeof window.AndroidBridge.setSecure === "function")
    el.innerHTML += `<div class="switch" style="margin-top:12px"><label for="scrSecChk"><b>Bildschirmschutz</b><br><span class="small muted">Keine Screenshots, keine Bildschirmaufnahmen und kein Vorschaubild in der App-Übersicht. Für einen Screenshot kurz ausschalten.</span></label><input type="checkbox" id="scrSecChk" ${lsGet("hb-scrsec") === "0" ? "" : "checked"}></div>`;
}
document.addEventListener("change", (e) => {
  if (e.target.id !== "scrSecChk") return;
  const on = e.target.checked;
  try {
    localStorage.setItem("hb-scrsec", on ? "1" : "0");
  } catch (_) {}
  try {
    window.AndroidBridge.setSecure(on);
  } catch (_) {}
  toast(on ? "Bildschirmschutz an" : "Bildschirmschutz aus – Screenshots sind jetzt möglich");
});
document.addEventListener("click", (e) => {
  if (e.target.closest("#lockOn"))
    lockShow("set", (ok) => {
      renderLockEd();
    });
  else if (e.target.closest("#lockChange"))
    lockShow("check", (ok) => {
      if (ok) lockShow("set", () => renderLockEd());
    });
  else if (e.target.closest("#lockRecNew"))
    lockShow("check", (ok) => {
      if (!ok) return;
      const cfg = lockCfg();
      if (!cfg) return;
      const code = recoveryCode(),
        s2 = newId();
      cfg.rec = {
        salt: s2,
        hash: pinHash(recNorm(code), s2),
      };
      try {
        localStorage.setItem(LOCK_KEY, JSON.stringify(cfg));
      } catch (_) {}
      $("lockBg").hidden = false;
      LOCK.mode = "info";
      showRecovery(code, () => {
        $("lockBg").hidden = true;
        LOCK.mode = null;
        renderLockEd();
        toast("Wiederherstellungscode gespeichert");
      });
    });
  else if (e.target.closest("#lockOff"))
    lockShow("check", (ok) => {
      if (ok) {
        try {
          localStorage.removeItem(LOCK_KEY);
        } catch (err) {}
        toast("App-Sperre ist aus");
      }
      renderLockEd();
    });
});
document.addEventListener("change", (e) => {
  if (e.target.id !== "lockBioChk") return;
  const cfg = lockCfg();
  if (!cfg) return;
  cfg.bio = e.target.checked;
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(cfg));
  } catch (err) {}
});

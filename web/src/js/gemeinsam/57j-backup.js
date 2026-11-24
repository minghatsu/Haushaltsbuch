/* Backup */
const cryptoCan = () => !!(window.crypto && crypto.subtle);
async function secEnc(K, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    K.enc,
    new TextEncoder().encode(JSON.stringify(obj))
  );
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), 12);
  return "hbv1:" + b64u(out);
}
async function secDec(K, s) {
  const u = fromB64u(String(s).slice(5));
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: u.slice(0, 12),
        },
        K.enc,
        u.slice(12)
      )
    )
  );
}
function syncQueueAll() {
  for (const k of ["tx", "txb", "fixed", "months", "debts"])
    for (const [id, d] of Object.entries(memStore[k]))
      SYNC.queue.push({
        col: k,
        id,
        data: d,
      });
  for (const [id, d] of Object.entries(memStore.acct))
    SYNC.queue.push({
      col: "app",
      id: "acct-" + id,
      data: d,
    });
  SYNC.rq = [...new Set([...(SYNC.rq || []), ...RCPT.ids])];
  SYNC.queue.push({
    col: "app",
    id: "settings",
    data: clone(store.settings),
  });
}
const backupEnc = () => MODE === "pair" && !!pairState() && cryptoCan();
async function pairBackupKey(k) {
  const base = await crypto.subtle.importKey("raw", fromB64u(k), "HKDF", false, ["deriveKey", "deriveBits"]);
  const prm = (info) => ({
    name: "HKDF",
    hash: "SHA-256",
    salt: new TextEncoder().encode("finanz-mami-v1"),
    info: new TextEncoder().encode(info),
  });
  return {
    enc: await crypto.subtle.deriveKey(
      prm("backup"),
      base,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    ),
    check: toHex(await crypto.subtle.deriveBits(prm("backup-check"), base, 128)),
  };
}
async function backupText() {
  const p = backupEnc() && pairState();
  if (p) {
    const P = await pairBackupKey(p.k);
    return JSON.stringify({
      hbPair: 1,
      check: P.check,
      d: await secEnc(P, backupData()),
    });
  }
  return JSON.stringify(backupData());
}
async function backupOpenPair(o, then) {
  const p = pairState();
  if (p) {
    const P = await pairBackupKey(p.k);
    if (P.check === o.check) {
      then(await secDec(P, o.d));
      return;
    }
  }
  codeSheet(async (raw) => {
    const q = pairParse(raw);
    if (!q) throw new Error("Das ist kein gültiger Wiederherstellungs-Code.");
    const P = await pairBackupKey(q.k);
    if (P.check !== o.check) throw new Error("Dieser Code passt nicht zu diesem Backup.");
    then(await secDec(P, o.d));
  });
}
function codeSheet(done) {
  let el = $("codeBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "codeBg";
    el.className = "backdrop";
    el.innerHTML = `<div class="sheet" role="dialog" aria-label="Wiederherstellungs-Code"></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-cclose]")) codeClose();
    });
  }
  ui.code = {
    done,
    err: "",
    val: "",
  };
  codeRender();
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
}
function codeClose() {
  const el = $("codeBg");
  if (!el) return;
  el.classList.remove("show");
  setTimeout(() => {
    el.hidden = true;
    el.querySelector(".sheet").innerHTML = "";
    ui.code = null;
  }, 200);
}
function codeRender() {
  const el = $("codeBg"),
    C = ui.code;
  if (!el || !C) return;
  el.querySelector(".sheet").innerHTML =
    `<div class="sheet-head"><h2>Wiederherstellungs-Code eingeben</h2><button class="iconbtn" data-cclose="1" aria-label="Schließen"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <p class="small muted" style="margin:0 0 12px">Dieses Backup ist verschlüsselt. Gib den Wiederherstellungs-Code deiner Kopplung ein (oder fotografier seinen QR-Code).</p>
    ${canQrLive() ? `<button class="btn primary block" style="justify-content:center;gap:8px" data-qrlive="code">${svgIcon("camera", 18)} QR-Code scannen</button>` : `<label class="btn primary block" style="justify-content:center;gap:8px">${svgIcon("camera", 18)} Bild mit QR-Code auswählen<input type="file" accept="image/*" id="codeCam" hidden></label>`}
    <label class="lbl" for="codeIn" style="display:block;margin-top:14px">Oder den Code eintippen</label>
    <input class="in" id="codeIn" placeholder="HBP1.…" autocomplete="off" autocapitalize="off" spellcheck="false" value="${escHtml(C.val)}">
    <div class="small" id="codeErr" role="alert" style="color:var(--bad);min-height:18px;margin-top:6px">${escHtml(C.err)}</div>
    <button class="btn primary block" id="codeGo" style="margin-top:8px">Öffnen</button>`;
}
document.addEventListener("click", async (e) => {
  if (!e.target.closest("#codeGo") || !ui.code) return;
  const C = ui.code,
    b = e.target.closest("#codeGo");
  b.disabled = true;
  try {
    const v = (($("codeIn") || {}).value || "").trim();
    if (!v) throw new Error("Bitte den Code eingeben.");
    await C.done(v);
    codeClose();
  } catch (x) {
    C.err = x.message || "Das hat nicht geklappt.";
    C.val = ($("codeIn") || {}).value || "";
    codeRender();
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "codeCam" || !ui.code) return;
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const c = await qrFromFile(f);
    if (!c) {
      ui.code.err = "Kein Code erkannt – näher ran oder den Code eintippen.";
      codeRender();
      return;
    }
    ui.code.val = c.trim();
    ui.code.err = "";
    codeRender();
  } catch (_) {
    ui.code.err = "Das Foto ließ sich nicht lesen.";
    codeRender();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "codeIn") {
    const b = $("codeGo");
    if (b) b.click();
  }
});
async function pairStart() {
  const p = {
    v: b64u(crypto.getRandomValues(new Uint8Array(16))),
    k: b64u(crypto.getRandomValues(new Uint8Array(32))),
    s: "",
  };
  if (!META_PAIR) p.s = pairUrl();
  pairSave(p);
  MODE = "pair";
  SERVER = pairUrl();
  SYNC.token = "";
  const K = await pairKeys();
  await api("create", {
    body: {
      vault: K.vault,
      auth: K.auth,
    },
  });
  try {
    localStorage.setItem("hb-main", "1");
  } catch (_) {}
  loginDone(await pairToken(), true, "Gekoppelt – Daten werden verschlüsselt hochgeladen");
}
const SC_ABC = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const shortNorm = (t) =>
  String(t || "")
    .toUpperCase()
    .replace(/[\s\-–]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
const shortOk = (t) => new RegExp("^[" + SC_ABC + "]{10}$").test(shortNorm(t));
const shortFmt = (c) => c.slice(0, 4) + "-" + c.slice(4, 8) + "-" + c.slice(8);
async function shortBox(code) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(shortNorm(code)), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: new TextEncoder().encode("finanz-mami-short-v1"),
        iterations: 150000,
      },
      base,
      384
    )
  );
  return {
    v: b64u(bits.slice(0, 16)),
    k: b64u(bits.slice(16, 48)),
    s: "",
  };
}
let SHORT = null,
  SHORT_T = 0;
async function shortMake() {
  shortDrop();
  const long = pairCode();
  if (!long) return null;
  const r = crypto.getRandomValues(new Uint8Array(10)),
    code = [...r].map((x) => SC_ABC[x & 31]).join("");
  const box = await shortBox(code),
    K = await spKeys(box);
  await spRequest(box, "create", "", {
    vault: K.vault,
    auth: K.auth,
  });
  await reqHostOpen("pair", box);
  SHORT = {
    code,
    box,
    t0: Date.now(),
  };
  SHORT_T = setTimeout(shortDrop, 10 * 60 * 1000);
  return SHORT;
}
const CTD_LEN = 10 * 60 * 1000;
const ctdHtml = (t0, kind) =>
  `<div class="ctd" data-ctd="${t0 || ""}" data-ctdk="${kind}" ${t0 ? "" : "hidden"}><div class="ctdt"><span>gilt noch</span><b>10:00</b></div><div class="ctdb"><i></i></div></div>`;
function ctdTick() {
  for (const el of document.querySelectorAll("[data-ctd]")) {
    const t0 = +el.dataset.ctd;
    if (!t0) {
      el.hidden = true;
      continue;
    }
    el.hidden = false;
    const left = Math.max(0, CTD_LEN - (Date.now() - t0)),
      m = Math.floor(left / 60000),
      sec = Math.floor(left / 1000) % 60;
    el.querySelector("b").textContent = `${m}:${String(sec).padStart(2, "0")}`;
    el.querySelector(".ctdb i").style.width = `${Math.min(100, (1 - left / CTD_LEN) * 100).toFixed(2)}%`;
    el.classList.toggle("late", left < 60000);
    if (!left && !el.dataset.done) {
      el.dataset.done = "1";
      el.querySelector("span").textContent = "abgelaufen – neuer Code kommt";
      el.querySelector("b").textContent = "";
      if (el.dataset.ctdk === "gm") {
        Object.assign(GMS, {
          code: "",
          v: "",
          box: null,
        });
        if (ui.view === "gemeinsam" || SPS.open === "gemeinsam") renderGemeinsam();
      } else if (el.dataset.ctdk === "pair") {
        shortDrop();
        try {
          pairUi();
        } catch (_) {}
      }
    }
  }
}
setInterval(() => {
  if (document.querySelector("[data-ctd]")) ctdTick();
}, 1000);
const GMS = {
  code: "",
  v: "",
  box: null,
  t0: 0,
  tm: 0,
};
async function gmShortMake(sp) {
  reqHostStop("gm");
  if (GMS.box) spRequest(GMS.box, "wipe", "", {}).catch(() => {});
  clearTimeout(GMS.tm);
  const r = crypto.getRandomValues(new Uint8Array(10)),
    code = [...r].map((x) => SC_ABC[x & 31]).join("");
  const box = await shortBox(code),
    K = await spKeys(box);
  await spRequest(box, "create", "", {
    vault: K.vault,
    auth: K.auth,
  });
  await reqHostOpen("gm", box, {
    sp,
  });
  Object.assign(GMS, {
    code,
    v: sp.v,
    box,
    t0: Date.now(),
  });
  GMS.tm = setTimeout(
    () => {
      reqHostStop("gm");
      if (GMS.box) spRequest(GMS.box, "wipe", "", {}).catch(() => {});
    },
    10 * 60 * 1000
  );
}
function shortDrop() {
  clearTimeout(SHORT_T);
  reqHostStop("pair");
  const s0 = SHORT;
  SHORT = null;
  if (s0) spRequest(s0.box, "wipe", "", {}).catch(() => {});
}

/* ===== Tresor =====
   Auf PC, iPhone und im Browser verschlüsselt die App-Sperre die Daten mit einem Schlüssel, der aus der PIN entsteht.
   Ohne PIN (oder Wiederherstellungscode) sind die gespeicherten Daten nur Datensalat – auch wenn jemand die Festplatte ausliest
   oder den Eintrag für die App-Sperre löscht. Android braucht das nicht: dort schützt der Schlüsselspeicher des Handys.

   Aufbau: Ein zufälliger Datenschlüssel (AES-256-GCM) verschlüsselt die Daten. Er liegt in „hb-tresor“ zweimal verpackt:
   mit einem Schlüssel aus der PIN und mit einem aus dem Wiederherstellungscode (beide PBKDF2-SHA-256, 310.000 Runden).
   Eine PIN-Prüfsumme gibt es nicht mehr – ob die PIN stimmt, zeigt nur das Auspacken.

   Diese Datei läuft vor allem anderen. Ist ein Tresor da, wartet die App, bis er geöffnet ist (das „await“ unten). */
const TRESOR_META = "hb-tresor",
  TRESOR_ITER = 310000,
  TRESOR_TRIES = "hb-lock-tries",
  TRESOR = { on: false, key: null, raw: null, meta: null, cache: new Map(), pend: new Set(), busy: false, opened: false, recUsed: false, err: false };
const TR_P = Storage.prototype,
  TR_G = TR_P.getItem,
  TR_S = TR_P.setItem,
  TR_R = TR_P.removeItem,
  TR_C = TR_P.clear;
const tresorKey = (k) =>
  k === "haushaltsbuch-v1" || k === "haushaltsbuch-sync-v1" || k === "hb-pair" || k === "haushaltsbuch-cloud" || String(k).startsWith("hb-sp-");
/* Android hat den Schlüsselspeicher; der Tresor ist für PC, iPhone und Browser */
const TRESOR_CAN = !!(window.crypto && crypto.subtle) && !(window.AndroidBridge && !window.AndroidBridge.desktop);

const trEnc8 = (s) => new TextEncoder().encode(s),
  trDec8 = (b) => new TextDecoder().decode(b);
function trB64(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function trUnB64(s) {
  const b = atob(s),
    u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}
const trRand = (n) => crypto.getRandomValues(new Uint8Array(n));
async function trPipe(u8, Stream) {
  const r = new Blob([u8]).stream().pipeThrough(new Stream("deflate-raw"));
  return new Uint8Array(await new Response(r).arrayBuffer());
}
const TR_ZIP = typeof CompressionStream === "function" && typeof DecompressionStream === "function";

/* Schlüssel aus PIN oder Code */
async function trKek(secret, salt, iter) {
  const base = await crypto.subtle.importKey("raw", trEnc8(String(secret)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: trUnB64(salt), iterations: iter || TRESOR_ITER },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
async function trWrap(secret) {
  const salt = trB64(trRand(16)),
    kek = await trKek(secret, salt),
    iv = trRand(12),
    ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: trEnc8("hb-tresor") }, kek, TRESOR.raw));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return { s: salt, w: trB64(out) };
}
async function trUnwrap(secret, box, iter) {
  if (!box || !box.s || !box.w) return null;
  try {
    const kek = await trKek(secret, box.s, iter),
      u = trUnB64(box.w);
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u.subarray(0, 12), additionalData: trEnc8("hb-tresor") }, kek, u.subarray(12)));
  } catch (_) {
    return null;
  }
}
async function trUse(raw) {
  TRESOR.raw = raw;
  TRESOR.key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
/* Werte ver- und entschlüsseln; der Name des Eintrags ist mit eingebunden, damit niemand Einträge vertauschen kann */
async function trSealVal(k, v) {
  let data = trEnc8(String(v)),
    tag = "w1:";
  if (TR_ZIP && data.length > 512) {
    data = await trPipe(data, CompressionStream);
    tag = "w2:";
  }
  const iv = trRand(12),
    ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: trEnc8(k) }, TRESOR.key, data));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return tag + trB64(out);
}
async function trOpenVal(k, s) {
  const tag = String(s).slice(0, 3),
    u = trUnB64(String(s).slice(3));
  let pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u.subarray(0, 12), additionalData: trEnc8(k) }, TRESOR.key, u.subarray(12)));
  if (tag === "w2:") pt = await trPipe(pt, DecompressionStream);
  return trDec8(pt);
}
const trSealed = (v) => typeof v === "string" && (v.startsWith("w1:") || v.startsWith("w2:"));

/* localStorage: Tresor-Einträge liegen entschlüsselt nur im Speicher, auf der Platte verschlüsselt */
function trRawKeys() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (tresorKey(k)) out.push(k);
    }
  } catch (_) {}
  return out;
}
TR_P.getItem = function (k) {
  if (!TRESOR.on || this !== window.localStorage || !tresorKey(k)) return TR_G.call(this, k);
  return TRESOR.cache.has(k) ? TRESOR.cache.get(k) : null;
};
TR_P.setItem = function (k, v) {
  if (!TRESOR.on || this !== window.localStorage || !tresorKey(k)) return TR_S.call(this, k, v);
  TRESOR.cache.set(k, String(v));
  trQueue(k);
};
TR_P.removeItem = function (k) {
  if (TRESOR.on && this === window.localStorage && tresorKey(k)) {
    TRESOR.cache.delete(k);
    TRESOR.pend.delete(k);
  }
  return TR_R.call(this, k);
};
TR_P.clear = function () {
  if (this === window.localStorage) {
    TRESOR.cache.clear();
    TRESOR.pend.clear();
    TRESOR.on = false;
  }
  return TR_C.call(this);
};
function trQueue(k) {
  TRESOR.pend.add(k);
  if (!TRESOR.busy) trFlush();
}
async function trFlush() {
  TRESOR.busy = true;
  try {
    while (TRESOR.pend.size) {
      const k = TRESOR.pend.values().next().value;
      TRESOR.pend.delete(k);
      if (!TRESOR.on || !TRESOR.cache.has(k)) continue;
      const v = TRESOR.cache.get(k);
      let e;
      try {
        e = await trSealVal(k, v);
      } catch (_) {
        TRESOR.err = true;
        continue;
      }
      if (!TRESOR.on || !TRESOR.cache.has(k)) continue;
      try {
        TR_S.call(window.localStorage, k, e);
        TRESOR.err = false;
      } catch (_) {
        TRESOR.err = true;
        try {
          toast(uiText("tr_save_fail"));
        } catch (__) {}
      }
    }
  } finally {
    TRESOR.busy = false;
  }
}
/* Wartet, bis alles verschlüsselt auf der Platte liegt (vor dem Neuladen, Abschalten usw.) */
async function tresorFlushed() {
  for (let i = 0; i < 200 && (TRESOR.busy || TRESOR.pend.size); i++) {
    if (!TRESOR.busy && TRESOR.pend.size) trFlush();
    await new Promise((r) => setTimeout(r, 15));
  }
}
const trMetaSave = () => TR_S.call(window.localStorage, TRESOR_META, JSON.stringify(TRESOR.meta));

/* Tresor einrichten: alle Einträge verschlüsseln */
async function tresorEnable(pin, code, opts) {
  if (!TRESOR_CAN) return false;
  if (!TRESOR.key) await trUse(trRand(32));
  const meta = { v: 1, iter: TRESOR_ITER, len: String(pin).length, p: await trWrap(pin), wipe: (opts && opts.wipe) || 0 };
  if (code) meta.r = await trWrap(recNormT(code));
  else if (TRESOR.meta && TRESOR.meta.r) meta.r = TRESOR.meta.r;
  const vals = new Map();
  for (const k of trRawKeys()) {
    const v = TRESOR.on ? TRESOR.cache.get(k) : TR_G.call(window.localStorage, k);
    if (v != null) vals.set(k, v);
  }
  /* erst alles verschlüsseln, dann schreiben – so bleibt bei einem Fehler der alte Stand */
  const enc = new Map();
  for (const [k, v] of vals) enc.set(k, await trSealVal(k, v));
  TRESOR.meta = meta;
  trMetaSave();
  for (const [k, e] of enc) TR_S.call(window.localStorage, k, e);
  for (const [k, v] of vals) TRESOR.cache.set(k, v);
  TRESOR.on = true;
  trRcptMigrate();
  return true;
}
async function tresorSetPin(pin) {
  TRESOR.meta.p = await trWrap(pin);
  TRESOR.meta.len = String(pin).length;
  trMetaSave();
}
async function tresorSetRec(code) {
  TRESOR.meta.r = await trWrap(recNormT(code));
  trMetaSave();
}
async function tresorCheckPin(pin) {
  if (!TRESOR.meta) return false;
  return !!(await trUnwrap(pin, TRESOR.meta.p, TRESOR.meta.iter));
}
async function tresorCheckRec(code) {
  if (!TRESOR.meta || !TRESOR.meta.r) return false;
  return !!(await trUnwrap(recNormT(code), TRESOR.meta.r, TRESOR.meta.iter));
}
/* Sperre aus: alles wieder unverschlüsselt (bzw. nur mit dem Geräteschlüssel) ablegen */
async function tresorDisable() {
  if (!TRESOR.on) return;
  await tresorFlushed();
  const vals = [...TRESOR.cache];
  TRESOR.on = false;
  for (const [k, v] of vals) TR_S.call(window.localStorage, k, v);
  TR_R.call(window.localStorage, TRESOR_META);
  TRESOR.cache.clear();
  TRESOR.meta = null;
  await trRcptMigrate(true);
  TRESOR.key = null;
  TRESOR.raw = null;
}
function tresorSetWipe(n) {
  if (!TRESOR.meta) return;
  TRESOR.meta.wipe = n || 0;
  trMetaSave();
}
const recNormT = (c) =>
  String(c || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/I/g, "1");

/* Belegfotos (IndexedDB) */
async function tresorImgSeal(img) {
  return TRESOR.on && TRESOR.key ? await trSealVal("rcpt", img) : null;
}
async function tresorImgOpen(s) {
  try {
    return await trOpenVal("rcpt", s);
  } catch (_) {
    return null;
  }
}
async function trRcptMigrate(back) {
  try {
    if (typeof rcptOp !== "function") return;
    const ids = await rcptOp("readonly", (st) => st.getAllKeys());
    for (const id of ids || []) {
      const v = await rcptOp("readonly", (st) => st.get(id));
      if (!v || !v.img) continue;
      if (!back && v.s) continue;
      if (back && v.s !== 2) continue;
      const img = back ? await tresorImgOpen(v.img) : v.img;
      if (!img) continue;
      const nv = back ? { ...rcptSeal(img), ts: v.ts } : { img: await trSealVal("rcpt", img), s: 2, ts: v.ts };
      await rcptOp("readwrite", (st) => st.put(nv, id));
      await new Promise((r) => setTimeout(r, 10));
    }
  } catch (_) {}
}

/* Fehlversuche – auf dem PC liegen sie mit dem Geräteschlüssel versiegelt */
function trTries() {
  try {
    let v = TR_G.call(window.localStorage, TRESOR_TRIES) || "{}";
    if (v.startsWith("v1:") && window.AndroidBridge && window.AndroidBridge.unseal) v = window.AndroidBridge.unseal(v);
    const t = JSON.parse(v) || {};
    return { f: +t.f || 0, u: +t.u || 0, r: +t.r || 0, t: +t.t || 0 };
  } catch (_) {
    return { f: 0, u: 0, r: 0, t: 0 };
  }
}
function trTriesSet(t) {
  try {
    let v = JSON.stringify(t);
    const B = window.AndroidBridge;
    if (B && B.seal) {
      const e = B.seal(v);
      if (e && e.startsWith("v1:")) v = e;
    }
    TR_S.call(window.localStorage, TRESOR_TRIES, v);
  } catch (_) {}
}
/* Nach zu vielen Fehlversuchen alles auf diesem Gerät löschen (nur wenn eingeschaltet) */
async function tresorWipeAll() {
  try {
    TR_C.call(window.localStorage);
  } catch (_) {}
  try {
    sessionStorage.clear();
  } catch (_) {}
  for (const n of ["haushaltsbuch-belege", "haushaltsbuch-logos"]) {
    try {
      await new Promise((ok) => {
        const r = indexedDB.deleteDatabase(n);
        r.onsuccess = r.onerror = r.onblocked = () => ok();
      });
    } catch (_) {}
  }
}

/* ---------- Beim Start: Tresor öffnen ---------- */
const TR_T = {
  de: ["Finanz MAMI gesperrt", "Gib deine PIN ein.", "Falsche PIN", "Zu viele Versuche – warte {s} Sekunden.", "PIN vergessen?", "Wiederherstellungscode", "Entsperren", "Der Code stimmt nicht.", "Zurück zur PIN", "Alles auf diesem Gerät löschen", "Wirklich alles löschen? Was nicht abgeglichen oder gesichert ist, ist dann weg.", "Ja, löschen", "Öffne den Tresor …", "Noch {n} Versuche, dann werden alle Daten auf diesem Gerät gelöscht.", "Öffne die App über HTTPS, um deine verschlüsselten Daten zu entsperren."],
  en: ["Finanz MAMI locked", "Enter your PIN.", "Wrong PIN", "Too many attempts – wait {s} seconds.", "Forgot PIN?", "Recovery code", "Unlock", "That code is wrong.", "Back to PIN", "Delete everything on this device", "Really delete everything? Anything not synced or backed up will be gone.", "Yes, delete", "Opening the vault …", "{n} attempts left, then all data on this device is deleted.", "Open the app over HTTPS to unlock your encrypted data."],
  tr: ["Finanz MAMI kilitli", "PIN'ini gir.", "Yanlış PIN", "Çok fazla deneme – {s} saniye bekle.", "PIN'i mi unuttun?", "Kurtarma kodu", "Kilidi aç", "Kod yanlış.", "PIN'e dön", "Bu cihazdaki her şeyi sil", "Gerçekten her şey silinsin mi? Eşitlenmemiş veya yedeklenmemiş her şey gider.", "Evet, sil", "Kasa açılıyor …", "{n} deneme kaldı, sonra bu cihazdaki tüm veriler silinir.", "Şifreli verilerinin kilidini açmak için uygulamayı HTTPS üzerinden aç."],
  ru: ["Finanz MAMI заблокирован", "Введи PIN.", "Неверный PIN", "Слишком много попыток – подожди {s} с.", "Забыл PIN?", "Код восстановления", "Разблокировать", "Код неверный.", "Назад к PIN", "Удалить всё на этом устройстве", "Точно удалить всё? Всё, что не синхронизировано и не сохранено, пропадёт.", "Да, удалить", "Открываю сейф …", "Осталось попыток: {n}, затем все данные на устройстве удалятся.", "Открой приложение через HTTPS, чтобы разблокировать зашифрованные данные."],
  uk: ["Finanz MAMI заблоковано", "Введи PIN.", "Неправильний PIN", "Забагато спроб – зачекай {s} с.", "Забув PIN?", "Код відновлення", "Розблокувати", "Код неправильний.", "Назад до PIN", "Видалити все на цьому пристрої", "Справді видалити все? Усе, що не синхронізовано й не збережено, зникне.", "Так, видалити", "Відкриваю сейф …", "Залишилось спроб: {n}, потім усі дані на пристрої видаляться.", "Відкрий застосунок через HTTPS, щоб розблокувати зашифровані дані."],
  pl: ["Finanz MAMI zablokowane", "Wpisz PIN.", "Zły PIN", "Za dużo prób – odczekaj {s} s.", "Nie pamiętasz PIN-u?", "Kod odzyskiwania", "Odblokuj", "Kod jest błędny.", "Wróć do PIN-u", "Usuń wszystko na tym urządzeniu", "Na pewno usunąć wszystko? Co nie jest zsynchronizowane ani zapisane, zniknie.", "Tak, usuń", "Otwieram sejf …", "Zostało prób: {n}, potem wszystkie dane na tym urządzeniu zostaną usunięte.", "Otwórz aplikację przez HTTPS, aby odblokować zaszyfrowane dane."],
  ar: ["Finanz MAMI مقفل", "أدخل رمز PIN.", "رمز PIN خاطئ", "محاولات كثيرة – انتظر {s} ثانية.", "نسيت رمز PIN؟", "رمز الاسترداد", "فتح القفل", "الرمز غير صحيح.", "العودة إلى PIN", "حذف كل شيء على هذا الجهاز", "هل تريد حذف كل شيء فعلًا؟ ما لم تتم مزامنته أو نسخه احتياطيًا سيضيع.", "نعم، احذف", "جارٍ فتح الخزنة …", "تبقّى {n} محاولات، ثم تُحذف كل البيانات على هذا الجهاز.", "افتح التطبيق عبر HTTPS لفتح بياناتك المشفّرة."],
  ro: ["Finanz MAMI blocat", "Introdu PIN-ul.", "PIN greșit", "Prea multe încercări – așteaptă {s} secunde.", "Ai uitat PIN-ul?", "Cod de recuperare", "Deblochează", "Codul este greșit.", "Înapoi la PIN", "Șterge tot de pe acest dispozitiv", "Sigur ștergi tot? Ce nu e sincronizat sau salvat se pierde.", "Da, șterge", "Deschid seiful …", "Mai ai {n} încercări, apoi toate datele de pe dispozitiv se șterg.", "Deschide aplicația prin HTTPS ca să-ți deblochezi datele criptate."],
};
function trT(i, o) {
  let l = "de";
  try {
    l = TR_G.call(window.localStorage, "hb-lang") || "de";
  } catch (_) {}
  let s = (TR_T[l] || TR_T.de)[i];
  for (const k in o || {}) s = s.replace("{" + k + "}", o[k]);
  return s;
}
function tresorAsk() {
  return new Promise((done) => {
    const $t = (id) => document.getElementById(id),
      m = TRESOR.meta,
      len = Math.min(6, Math.max(4, +m.len || 4));
    let pin = "",
      busy = false;
    const T = trTries();
    $t("lockTitle").textContent = trT(0);
    $t("lockText").textContent = trT(1);
    ["lockCancel", "lockNext"].forEach((id) => ($t(id).hidden = true));
    $t("bioKey").classList.add("off");
    $t("lockForgot").hidden = false;
    $t("lockForgot").textContent = trT(4);
    $t("lockAlt").hidden = true;
    const dots = () =>
      ($t("pinDots").innerHTML = Array.from({ length: len }, (_, i) => `<span class="${i < pin.length ? "on" : ""}"></span>`).join(""));
    const err = (s) => ($t("lockErr").textContent = s || "");
    const shake = () => {
      const el = $t("pinDots");
      el.classList.remove("shake");
      void el.offsetWidth;
      el.classList.add("shake");
    };
    const waitMsg = () => (Date.now() < T.u ? trT(3, { s: Math.ceil((T.u - Date.now()) / 1000) }) : "");
    const fail = async (msg) => {
      T.f++;
      T.t++;
      if (m.wipe && T.t >= m.wipe) {
        await tresorWipeAll();
        location.reload();
        return;
      }
      if (T.f >= 5) {
        T.r++;
        T.u = Date.now() + [30, 120, 600, 3600][Math.min(3, T.r - 1)] * 1000;
        T.f = 0;
      }
      trTriesSet(T);
      err(waitMsg() || (m.wipe && m.wipe - T.t <= 5 ? msg + " · " + trT(13, { n: m.wipe - T.t }) : msg));
    };
    const ok = async (raw, viaRec) => {
      await trUse(raw);
      for (const k of trRawKeys()) {
        const v = TR_G.call(window.localStorage, k);
        if (trSealed(v)) {
          try {
            TRESOR.cache.set(k, await trOpenVal(k, v));
          } catch (_) {
            /* Eintrag lässt sich nicht öffnen (beschädigt): Kopie beiseitelegen, bevor die App ihn neu schreibt */
            try {
              TR_S.call(window.localStorage, "hb-tr-bad:" + k, v);
            } catch (__) {}
          }
        } else if (v != null) {
          TRESOR.cache.set(k, v);
          TRESOR.pend.add(k);
        }
      }
      TRESOR.on = true;
      TRESOR.opened = true;
      TRESOR.recUsed = !!viaRec;
      trTriesSet({ f: 0, u: 0, r: 0, t: 0 });
      document.removeEventListener("keydown", onKey, true);
      $t("keypad").removeEventListener("click", onPad, true);
      $t("lockForgot").removeEventListener("click", onForgot, true);
      $t("lockAlt").removeEventListener("click", onAlt, true);
      $t("lockAlt").hidden = true;
      ["pinDots", "keypad"].forEach((id) => ($t(id).hidden = false));
      if (!viaRec) $t("lockBg").hidden = true;
      if (TRESOR.pend.size) trFlush();
      done();
    };
    const tryPin = async () => {
      busy = true;
      err(trT(12));
      const raw = await trUnwrap(pin, m.p, m.iter);
      busy = false;
      if (raw) return ok(raw, false);
      pin = "";
      dots();
      shake();
      await fail(trT(2));
    };
    const key = (k) => {
      if (busy) return;
      if (k === "del") {
        pin = pin.slice(0, -1);
        return dots();
      }
      if (!/^\d$/.test(k)) return;
      const w = waitMsg();
      if (w) return err(w);
      if (pin.length >= len) return;
      pin += k;
      err("");
      dots();
      if (pin.length === len) tryPin();
    };
    const onPad = (e) => {
      const b = e.target.closest("[data-k]");
      if (!b) return;
      e.stopImmediatePropagation();
      key(b.dataset.k);
    };
    const onKey = (e) => {
      if (!$t("lockAlt").hidden) return;
      if (/^\d$/.test(e.key)) key(e.key);
      else if (e.key === "Backspace") key("del");
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const E = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const panel = (html) => {
      $t("lockAlt").innerHTML = html || "";
      $t("lockAlt").hidden = !html;
      ["pinDots", "keypad", "lockForgot"].forEach((id) => ($t(id).hidden = !!html));
      err("");
    };
    const onForgot = (e) => {
      e.stopImmediatePropagation();
      panel(
        `${m.r ? `<input class="in" id="trRecIn" placeholder="${E(trT(5))}" autocomplete="off" autocapitalize="characters" spellcheck="false" style="text-align:center;letter-spacing:.08em"><button class="btn primary block" id="trRecGo">${E(trT(6))}</button>` : ""}<button class="btn block" id="trWipe">${E(trT(9))}</button><button class="link small" id="trBack">${E(trT(8))}</button>`
      );
      setTimeout(() => $t("trRecIn") && $t("trRecIn").focus(), 30);
    };
    const onAlt = async (e) => {
      const t = e.target;
      if (t.closest("#trBack")) {
        e.stopImmediatePropagation();
        panel("");
        $t("lockForgot").hidden = false;
        return;
      }
      if (t.closest("#trRecGo")) {
        e.stopImmediatePropagation();
        const w = waitMsg();
        if (w) return err(w);
        t.disabled = true;
        err(trT(12));
        const raw = await trUnwrap(recNormT($t("trRecIn").value), m.r, m.iter);
        t.disabled = false;
        if (raw) return ok(raw, true);
        await fail(trT(7));
        return;
      }
      if (t.closest("#trWipe")) {
        e.stopImmediatePropagation();
        panel(`<span class="small">${E(trT(10))}</span><button class="btn block" id="trWipeYes" style="color:var(--bad,#c0392b)">${E(trT(11))}</button><button class="link small" id="trBack">${E(trT(8))}</button>`);
        return;
      }
      if (t.closest("#trWipeYes")) {
        e.stopImmediatePropagation();
        await tresorWipeAll();
        location.reload();
      }
    };
    document.addEventListener("keydown", onKey, true);
    $t("keypad").addEventListener("click", onPad, true);
    $t("lockForgot").addEventListener("click", onForgot, true);
    $t("lockAlt").addEventListener("click", onAlt, true);
    dots();
    err(waitMsg());
    $t("lockBg").hidden = false;
  });
}
async function tresorGate() {
  let m = null;
  try {
    m = JSON.parse(TR_G.call(window.localStorage, TRESOR_META) || "null");
  } catch (_) {}
  if (!m || !m.p) return;
  /* Tresor da, aber dieses Fenster kann nicht entschlüsseln (z. B. ohne HTTPS): nicht starten, sonst würde die App
     die verschlüsselten Daten für leer halten und überschreiben */
  if (!TRESOR_CAN) {
    document.getElementById("lockTitle").textContent = trT(0);
    document.getElementById("lockText").textContent = trT(14);
    ["pinDots", "keypad", "lockForgot", "lockNext", "lockCancel"].forEach((id) => (document.getElementById(id).hidden = true));
    document.getElementById("lockBg").hidden = false;
    await new Promise(() => {});
  }
  TRESOR.meta = m;
  await tresorAsk();
}
await tresorGate();

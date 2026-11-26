/* ===== Gerät aus dem Abgleich entfernen – mit Schlüsselwechsel =====
   Bisher hat „Entfernen“ das Gerät nur gebeten, nicht mehr mitzumachen; es kannte den Schlüssel aber weiter.
   Jetzt bekommt die Kopplung einen neuen Schlüssel und einen neuen Speicherplatz auf dem Server:
   1. Jedes Gerät hat ein eigenes Schlüsselpaar (ECDH P-256); den öffentlichen Teil kennen die anderen Geräte.
   2. Das entfernende Gerät legt eine neue Kopplung an, verschlüsselt den neuen Code einzeln für jedes Gerät, das bleiben
      soll, legt ihn im alten Speicher ab und friert den alten Speicher in derselben Anfrage ein (der Server nimmt danach
      nichts mehr an). Das entfernte Gerät kann diese Nachrichten nicht lesen.
   3. Die anderen Geräte merken beim nächsten Abgleich, dass der alte Speicher eingefroren ist, holen sich ihren Code und
      ziehen um. Das entfernte Gerät findet stattdessen „kick-…“ und löscht seine Daten.
   Der alte Speicher wird nach 30 Tagen vom Server gelöscht. */

function pairPub() {
  const p = pairState();
  return p && p.dk && p.dk.pub ? p.dk.pub : null;
}
/* eigenes Schlüsselpaar anlegen (einmal je Gerät und Kopplung) */
async function pairDevKeys() {
  const p = pairState();
  if (!p || !cryptoCan()) return null;
  if (p.dk && p.dk.pub && p.dk.priv) return p.dk;
  const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const pub = await crypto.subtle.exportKey("jwk", kp.publicKey),
    priv = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const dk = { pub: { x: pub.x, y: pub.y }, priv };
  pairSave({ ...pairState(), dk });
  return dk;
}
async function pairBoxKey(privKey, pub, salt) {
  const pk = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: pub.x, y: pub.y, ext: true }, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: pk }, privKey, 256);
  const base = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("finanz-mami-umzug") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
/* Text nur für ein bestimmtes Gerät verschlüsseln */
async function pairSealFor(pub, text, to) {
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await pairBoxKey(eph.privateKey, pub, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode("umzug:" + to) }, key, new TextEncoder().encode(text));
  const e = await crypto.subtle.exportKey("jwk", eph.publicKey);
  return { e: { x: e.x, y: e.y }, s: b64u(salt), iv: b64u(iv), c: b64u(new Uint8Array(ct)) };
}
async function pairOpenMine(box) {
  const dk = pairState() && pairState().dk;
  if (!dk || !dk.priv || !box || !box.e) return null;
  try {
    const priv = await crypto.subtle.importKey("jwk", dk.priv, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
    const key = await pairBoxKey(priv, box.e, fromB64u(box.s));
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64u(box.iv), additionalData: new TextEncoder().encode("umzug:" + devId()) }, key, fromB64u(box.c));
    return new TextDecoder().decode(pt);
  } catch (_) {
    return null;
  }
}
const pairCodeOf = (p) => "HBP1." + p.v + "." + p.k + (p.s && p.s !== META_PAIR ? "." + b64u(new TextEncoder().encode(p.s)) : "");

/* Gerät entfernen. Gibt zurück: { ok, soft, left: [Geräte ohne Schlüssel, die neu gekoppelt werden müssen] } */
async function pairRemoveDev(rid) {
  const p = pairState();
  if (MODE !== "pair" || !p || !SYNC.token || !cryptoCan()) return { ok: false, soft: true };
  await pairDevKeys();
  const me = devId(),
    out = store.settings.devOut || {};
  const stay = Object.entries(devList()).filter(([id]) => id !== me && id !== rid && !out[id]);
  const left = stay.filter(([, d]) => !(d && d.pk && d.pk.x)).map(([id]) => zDevName(id));
  /* 1. neue Kopplung auf dem Server anlegen */
  const np = { v: b64u(crypto.getRandomValues(new Uint8Array(16))), k: b64u(crypto.getRandomValues(new Uint8Array(32))), s: p.s || "", dk: p.dk };
  const NK = await pairKeysOf(np);
  await api("create", { body: { vault: NK.vault, auth: NK.auth } });
  /* 2. neuen Code für jedes bleibende Gerät einzeln verschlüsseln, entferntes Gerät rauswerfen – und den alten Speicher einfrieren */
  const code = pairCodeOf(np),
    ops = [];
  for (const [id, d] of stay)
    if (d && d.pk && d.pk.x) ops.push({ col: "app", id: "move-" + id, data: { box: await pairSealFor(d.pk, code, id), by: me, t: Date.now() } });
  ops.push({ col: "app", id: "kick-" + rid, data: { by: me, t: Date.now(), wipe: true } });
  try {
    await api("freeze", { body: { ops: await pairEncOps(ops) } });
  } catch (e) {
    /* Server kennt das noch nicht (alte pair.php): neue Kopplung wieder verwerfen und nur wie bisher abmelden */
    if (e.status === 404 || e.status === 400) {
      try {
        const keep = SYNC.token;
        SYNC.token = NK.vault + "." + NK.auth;
        await api("wipe", { body: {} });
        SYNC.token = keep;
      } catch (_) {}
      return { ok: false, soft: true, old: true };
    }
    throw e;
  }
  /* 3. selbst umziehen und alles in den neuen Speicher laden */
  pairSave(np);
  SYNC.token = await pairToken();
  SYNC.rev = 0;
  syncQueueAll();
  SYNC.state = "pending";
  saveSync();
  flushSoon(300);
  return { ok: true, left };
}

/* Alter Speicher eingefroren: Gehöre ich noch dazu? Dann umziehen, sonst Daten löschen. */
let PAIR_MOVING = false;
async function pairMovedCheck() {
  if (PAIR_MOVING || MODE !== "pair" || !pairState()) return;
  PAIR_MOVING = true;
  try {
    const res = await api("pull", { qs: "&since=0" });
    const me = devId(),
      wantMove = await pairHid("app", "move-" + me),
      wantKick = await pairHid("app", "kick-" + me);
    let move = null,
      kick = null;
    for (const d of res.docs || []) {
      if (!d.b || (d.h !== wantMove && d.h !== wantKick)) continue;
      try {
        const o = await pairDec(d.b);
        if (o.c === "app" && o.i === "move-" + me && d.h === wantMove) move = o.d;
        if (o.c === "app" && o.i === "kick-" + me && d.h === wantKick) kick = o.d;
      } catch (_) {}
    }
    if (move && move.box) {
      const code = await pairOpenMine(move.box),
        np = code && pairParse(code);
      if (np) {
        const dk = pairState().dk;
        pairSave({ ...np, dk });
        SYNC.token = await pairToken();
        SYNC.rev = 0;
        syncQueueAll();
        SYNC.state = "pending";
        saveSync();
        flushSoon(300);
        toast(uiText("rm_moved"), null, null, 6000);
        setTimeout(() => devPing(true), 3000);
        return;
      }
    }
    if (kick) {
      pairSave(null);
      SYNC.token = "";
      SYNC.queue = [];
      SYNC.state = "off";
      saveSync();
      if (kick.wipe) {
        await tresorWipeAll();
        location.reload();
        return;
      }
      toast(uiText("rm_kicked"), null, null, 10000);
      return;
    }
    /* weder noch: dieses Gerät hatte noch keinen Schlüssel – muss neu gekoppelt werden */
    pairSave(null);
    SYNC.token = "";
    SYNC.state = "login";
    saveSync();
    toast(uiText("rm_repair"), () => showLogin(), uiText("rm_repair_b"), 12000);
  } catch (_) {
  } finally {
    PAIR_MOVING = false;
    try {
      renderSyncDot();
      renderGeraete();
    } catch (_) {}
  }
}
/* Schlüsselpaar beim Start sicherstellen und den anderen Geräten mitteilen */
async function pairKeysEnsure() {
  try {
    if (MODE === "pair" && pairState() && !pairPub()) {
      await pairDevKeys();
      devPing(true);
    }
  } catch (_) {}
}
setTimeout(pairKeysEnsure, 6000);
setInterval(pairKeysEnsure, 10 * 60e3);

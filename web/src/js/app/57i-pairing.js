/* Koppeln */
const PAIR_KEY = "hb-pair";
function pairState() {
  try {
    return JSON.parse(localStorage.getItem(PAIR_KEY) || "null");
  } catch (e) {
    return null;
  }
}
function pairSave(p) {
  try {
    if (p) localStorage.setItem(PAIR_KEY, JSON.stringify(p));
    else localStorage.removeItem(PAIR_KEY);
  } catch (e) {}
  PAIR_K = null;
}
function pairUrl() {
  const p = pairState();
  return (p && p.s) || META_PAIR || (META_SERVER ? META_SERVER.replace(/api\.php.*$/, "pair.php") : "");
}
const b64u = (bytes) => {
  let s = "";
  const u = new Uint8Array(bytes);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64u = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const b = atob(s),
    u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
};
const toHex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
let PAIR_K = null;
async function pairKeys() {
  if (PAIR_K) return PAIR_K;
  const p = pairState();
  if (!p) throw new Error("nicht gekoppelt");
  const base = await crypto.subtle.importKey("raw", fromB64u(p.k), "HKDF", false, ["deriveKey", "deriveBits"]);
  const prm = (info) => ({
    name: "HKDF",
    hash: "SHA-256",
    salt: new TextEncoder().encode("finanz-mami-v1"),
    info: new TextEncoder().encode(info),
  });
  const enc = await crypto.subtle.deriveKey(
    prm("enc"),
    base,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
  const mac = await crypto.subtle.deriveKey(
    prm("id"),
    base,
    {
      name: "HMAC",
      hash: "SHA-256",
      length: 256,
    },
    false,
    ["sign"]
  );
  const auth = toHex(await crypto.subtle.deriveBits(prm("auth"), base, 256));
  return (PAIR_K = {
    enc,
    mac,
    auth,
    vault: toHex(fromB64u(p.v)),
  });
}
async function pairHid(col, id) {
  const K = await pairKeys();
  return b64u((await crypto.subtle.sign("HMAC", K.mac, new TextEncoder().encode(col + "\u0000" + id))).slice(0, 24));
}
async function pairEnc(obj) {
  const K = await pairKeys(),
    iv = crypto.getRandomValues(new Uint8Array(12));
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
  return b64u(out);
}
async function pairDec(b) {
  const K = await pairKeys(),
    u = fromB64u(b);
  const pt = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: u.slice(0, 12),
    },
    K.enc,
    u.slice(12)
  );
  return JSON.parse(new TextDecoder().decode(pt));
}
async function pairEncOps(ops) {
  const out = [];
  for (const o of ops)
    out.push({
      h: await pairHid(o.col, o.id),
      b: await pairEnc({
        c: o.col,
        i: o.id,
        d: o.data === undefined ? null : o.data,
      }),
    });
  return out;
}
async function pairDecDocs(docs) {
  const out = [];
  for (const d of docs || []) {
    if (!d.b) continue;
    try {
      const o = await pairDec(d.b);
      out.push({
        col: o.c,
        id: o.i,
        data: o.d,
        rev: d.rev,
      });
    } catch (e) {}
  }
  return out;
}
function pairCode() {
  const p = pairState();
  if (!p) return "";
  return "HBP1." + p.v + "." + p.k + (p.s && p.s !== META_PAIR ? "." + b64u(new TextEncoder().encode(p.s)) : "");
}
function pairParse(t) {
  const m = String(t || "")
    .replace(/\s+/g, "")
    .match(/HBP1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})(?:\.([A-Za-z0-9_-]+))?/);
  if (!m) return null;
  let s = "";
  if (m[3])
    try {
      s = new TextDecoder().decode(fromB64u(m[3]));
    } catch (e) {
      return null;
    }
  return {
    v: m[1],
    k: m[2],
    s: s || "",
  };
}
const pairToken = async () => {
  const K = await pairKeys();
  return K.vault + "." + K.auth;
};

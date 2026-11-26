// Angriffstest gegen eine lokale Kopie der Server-Skripte (nie gegen den echten Server).
// Aufruf: node tools/test/angriff.cjs http://127.0.0.1:8099/haushaltsbuch   (pair.php und api.php liegen dort)
// Prüft: Anmeldung umgehen, SQL-Einschleusung, Pfade, Riesen-Anfragen, Raten-Bremse, Sicherheits-Header,
// eingefrorene Kopplung, fremde Speicher lesen/schreiben. Gibt [] aus, wenn nichts durchkommt.
const base = (process.argv[2] || "http://127.0.0.1:8099/haushaltsbuch").replace(/\/$/, "");
const crypto = require("crypto");
const R = [];
const bad = (m) => R.push(m);
const hex = (n) => crypto.randomBytes(n).toString("hex");
async function req(file, a, { method = "GET", qs = "", body, auth, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (auth) h.Authorization = auth;
  if (body !== undefined || raw !== undefined) h["Content-Type"] = "application/json";
  const r = await fetch(`${base}/${file}?a=${encodeURIComponent(a)}${qs}`, { method, headers: h, body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined });
  let j = null;
  const t = await r.text();
  try { j = JSON.parse(t); } catch (_) {}
  return { s: r.status, j, t, h: r.headers };
}
(async () => {
  /* 1. Sicherheits-Header */
  for (const f of ["pair.php", "api.php"]) {
    const r = await req(f, "status");
    for (const [k, want] of [["x-frame-options", /deny/i], ["x-content-type-options", /nosniff/], ["content-security-policy", /default-src 'none'/], ["referrer-policy", /no-referrer/], ["cache-control", /no-store/]])
      if (!want.test(r.h.get(k) || "")) bad(`${f}: Header ${k} fehlt/falsch (${r.h.get(k)})`);
    if (/x-powered-by/i.test([...r.h.keys()].join(","))) bad(`${f}: verrät PHP-Version (X-Powered-By)`);
  }
  /* 2. Kopplung: zwei Speicher anlegen */
  const mk = async () => { const v = hex(16), a = hex(32); const r = await req("pair.php", "create", { method: "POST", body: { vault: v, auth: a } }); if (r.s !== 200) bad("create geht nicht: " + r.s); return { v, a, tok: `Bearer ${v}.${a}` }; };
  const A = await mk(), B = await mk();
  const op = (h, b) => ({ h, b });
  let r = await req("pair.php", "push", { method: "POST", auth: A.tok, body: { ops: [op("x".repeat(24), "geheimA")] } });
  if (r.s !== 200) bad("push A geht nicht " + r.s);
  /* ohne/mit falscher Anmeldung */
  for (const tok of ["", "Bearer x", `Bearer ${A.v}.${hex(32)}`, `Bearer ${A.v}.${A.a.toUpperCase()}x`, `Bearer ${A.v}.' OR '1'='1`, `Basic ${Buffer.from("a:b").toString("base64")}`]) {
    r = await req("pair.php", "pull", { qs: "&since=0", auth: tok });
    if (r.s === 200) bad("pull ohne gültige Anmeldung: " + tok);
  }
  /* B darf A nicht lesen */
  r = await req("pair.php", "pull", { qs: "&since=0", auth: B.tok });
  if ((r.t || "").includes("geheimA")) bad("B liest Daten von A");
  /* SQL-Einschleusung über since / h / vault */
  r = await req("pair.php", "pull", { qs: "&since=0%20OR%201=1", auth: B.tok });
  if ((r.t || "").includes("geheimA")) bad("SQL über since");
  r = await req("pair.php", "push", { method: "POST", auth: B.tok, body: { ops: [op("' OR 1=1 --aaaaaaaaaaaa", "x"), op("y".repeat(24), "'); DROP TABLE docs; --")] } });
  r = await req("pair.php", "pull", { qs: "&since=0", auth: A.tok });
  if (!(r.t || "").includes("geheimA")) bad("Daten von A nach SQL-Versuch weg");
  r = await req("pair.php", "create", { method: "POST", body: { vault: A.v, auth: hex(32) } });
  if (r.s === 200) bad("fremden Speicher übernommen (create mit gleicher Nummer)");
  r = await req("pair.php", "create", { method: "POST", body: { vault: "../../etc/passwd", auth: hex(32) } });
  if (r.s === 200) bad("Pfad in vault angenommen");
  /* Riesen-Anfrage / kaputtes JSON */
  r = await req("pair.php", "push", { method: "POST", auth: A.tok, raw: "{" + "x".repeat(1000) });
  if (r.s === 500) bad("kaputtes JSON → Serverfehler");
  r = await req("pair.php", "push", { method: "POST", auth: A.tok, body: { ops: Array.from({ length: 6000 }, (_, i) => op("z" + String(i).padStart(23, "0"), "a")) } });
  if (r.s === 200) bad("6000 Einträge auf einmal angenommen");
  r = await req("pair.php", "push", { method: "POST", auth: A.tok, body: { ops: [op("b".repeat(24), "<script>alert(1)</script>")] } });
  r = await req("pair.php", "pull", { qs: "&since=0", auth: A.tok });
  if ((r.t || "").includes("<script>")) bad("Skript-Text im Speicher angenommen");
  /* unbekannte Aktion */
  r = await req("pair.php", "phpinfo");
  if (r.s === 200) bad("unbekannte Aktion beantwortet");
  /* Einfrieren: danach nimmt der Speicher nichts mehr an */
  r = await req("pair.php", "freeze", { method: "POST", auth: A.tok, body: { ops: [op("m".repeat(24), "umzug")] } });
  if (r.s !== 200) bad("freeze geht nicht " + r.s);
  r = await req("pair.php", "push", { method: "POST", auth: A.tok, body: { ops: [op("m".repeat(24), "boese")] } });
  if (r.s !== 409 || !(r.j && r.j.moved)) bad("eingefrorener Speicher nimmt noch an: " + r.s);
  r = await req("pair.php", "freeze", { method: "POST", auth: A.tok, body: { ops: [op("m".repeat(24), "boese")] } });
  if (r.s !== 409) bad("zweites Einfrieren überschreibt");
  r = await req("pair.php", "pull", { qs: "&since=0", auth: A.tok });
  if (!(r.j && r.j.moved) || (r.t || "").includes("boese")) bad("pull meldet Umzug nicht / Inhalt überschrieben");
  /* Raten-Bremse: viele falsche Anmeldungen → 429 */
  let got429 = false;
  for (let i = 0; i < 70 && !got429; i++) { r = await req("pair.php", "pull", { qs: "&since=0", auth: `Bearer ${hex(16)}.${hex(32)}` }); if (r.s === 429) got429 = true; }
  if (!got429) bad("keine Bremse bei vielen falschen Anmeldungen");
  /* eigener Server (api.php): ohne Passwort nichts lesen */
  r = await req("api.php", "pull", { qs: "&since=0" });
  if (r.s === 200 && r.j && Array.isArray(r.j.docs)) bad("api.php: pull ohne Anmeldung");
  r = await req("api.php", "pull", { qs: "&since=0", auth: "Bearer ' OR '1'='1" });
  if (r.s === 200 && r.j && Array.isArray(r.j.docs)) bad("api.php: SQL in Token");
  console.log(JSON.stringify(R));
  process.exit(R.length ? 1 : 0);
})().catch((e) => { console.log(JSON.stringify(["Absturz: " + e.message])); process.exit(1); });

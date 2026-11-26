/* ===== Sicherheits-Hinweise =====
   Meldet sich ein neues Gerät im Abgleich an oder gab es falsche Passwort-Versuche am Server,
   sagt die App Bescheid – als Hinweis in der App und, wo möglich, als Benachrichtigung. */
function secAlert(msg) {
  try {
    toast(msg, null, null, 10000);
  } catch (_) {}
  try {
    const B = window.AndroidBridge;
    if (B && B.notifyNow) B.notifyNow(900077, uiText("sec_title"), msg, "hinweise");
  } catch (_) {}
}
/* Neues Gerät: nur melden, wenn wir die Liste schon kannten (nicht beim ersten Abgleich) */
function secDevSeen(id, d) {
  if (!d || id === devId()) return;
  let known = null;
  try {
    known = JSON.parse(localStorage.getItem("hb-devs-known") || "null");
  } catch (_) {}
  const first = !known;
  known = known || {};
  if (known[id]) return;
  known[id] = Date.now();
  try {
    localStorage.setItem("hb-devs-known", JSON.stringify(known));
  } catch (_) {}
  if (!first && SYNC.rev > 0) secAlert(uiText("sec_newdev", { n: devShown(d) }));
}
/* Falsche Anmeldeversuche am Server (eigener Server oder Konto) */
function secBadSeen(res) {
  if (!res || typeof res.bad !== "number") return;
  if (typeof SYNC.bad !== "number") {
    SYNC.bad = res.bad;
    return;
  }
  if (res.bad > SYNC.bad) {
    const n = res.bad - SYNC.bad,
      when = res.bad_t ? fxDate(new Date(res.bad_t * 1000).toISOString().slice(0, 10), { day: "numeric", month: "short" }) : "";
    secAlert(uiText(n === 1 ? "sec_bad1" : "sec_bad", { n: String(n), d: when }));
  }
  SYNC.bad = res.bad;
}
/* Beim ersten Start mit dieser Version: alle schon bekannten Geräte merken, damit nichts Altes gemeldet wird */
(() => {
  try {
    if (!localStorage.getItem("hb-devs-known")) {
      const k = {};
      for (const id of Object.keys(devList())) k[id] = Date.now();
      if (Object.keys(k).length) localStorage.setItem("hb-devs-known", JSON.stringify(k));
    }
  } catch (_) {}
})();

/* Welches Gerät? – einmal hier entschieden, überall gleich.
     handy   Android-Handy oder Browser
     tablet  Android mit kurzer Bildschirmseite ab 600 px (oder hb-forcetab=1 zum Testen)
     pc      Windows/Mac/Linux-App
   IS_PC heißt „breite Ansicht“ und gilt für PC und Tablet; der Tablet-Ordner baut auf dem PC-Ordner auf.

   Geräte-Haken: Wo sich Aufbau oder Verhalten je Gerät unterscheiden, fragt der gemeinsame Code an einer
   festen Stelle nach, statt selbst „wenn PC …“ zu entscheiden:
     geraetHaken("handy" | "pc" | "tablet", "name", fn)   im Geräte-Ordner: eigene Fassung anmelden
     geraetRuf("name", ...args)                           im gemeinsamen Code: aufrufen (sonst undefined)
   Eine Anmeldung gilt nur auf ihrem Gerät. „pc“ gilt auch fürs Tablet, solange js/tablet für denselben
   Haken nichts Eigenes anmeldet. So trifft eine Änderung im Geräte-Ordner nur dieses Gerät.
   Beschriftungen und Fähigkeiten (Gerätename, Teilen, SMS, Datei-Namen beim Update) fragen GERAET direkt. */
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
const GERAET = IS_DESK ? "pc" : IS_TAB ? "tablet" : "handy";
const GERAET_NAME = { handy: "Android", tablet: "Tablet", pc: "PC" }[GERAET];
const GERAET_HAKEN = {};
function geraetHaken(geraet, name, fn) {
  const rang = { handy: !IS_PC ? 1 : 0, pc: IS_PC ? 1 : 0, tablet: IS_TAB ? 2 : 0 }[geraet];
  if (!rang) return;
  const alt = GERAET_HAKEN[name];
  if (alt && alt.rang > rang) return;
  GERAET_HAKEN[name] = { fn, rang };
}
function geraetRuf(name, ...args) {
  const h = GERAET_HAKEN[name];
  return h ? h.fn(...args) : undefined;
}

/* Handy: eigene Fassungen an den Geräte-Haken (siehe gemeinsam/00-geraet.js) */
/* Sparen: Karten als Stapel zum Wischen, darunter Punkte */
geraetHaken("handy", "sparenKarten", (cards) => ({
  cls: "",
  html: `<div class="astack" id="zstack" tabindex="0" aria-label="${escHtml(uiText("zk_swipe"))}">${cards.join("")}</div><div class="adots" id="zdots">${cards.map((_, i) => `<button data-cdot="${i}" aria-label="${i + 1}"><i></i></button>`).join("")}</div>`,
}));
geraetHaken("handy", "sparenGezeichnet", () => initStack("zstack", "zkIdx", "zdots"));
/* Haushalt: Mami fasst „pro Tag“ und Prognose in einem Satz zusammen */
geraetHaken("handy", "haushaltSatz", (ym, mainBal) => homeSay(ym, mainBal));
/* Einkauf: Hinweis, wenn jemand anderes gerade einkaufen ist */
geraetHaken("handy", "einkaufTourHinweis", () => true);
/* Währungsauswahl mit Flagge */
geraetHaken("handy", "waehrungFlagge", (c) => CUR_FLAG[c] || "");

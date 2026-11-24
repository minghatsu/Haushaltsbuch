/* Tablet: weicht hier vom PC ab (Haken, siehe gemeinsam/00-geraet.js) */
/* Konten falten sich wie am Handy */
geraetHaken("tablet", "ohneKontoFalten", () => false);
/* Hell/Dunkel sitzt oben im Kopf, kein zweiter Schalter in den Einstellungen */
geraetHaken("tablet", "ohneHellDunkelSchalter", () => true);
/* Plus-Menü: als Rad wie am Handy */
geraetHaken("tablet", "plusAlsListe", () => false);

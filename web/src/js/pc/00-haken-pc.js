/* PC (und Tablet, solange js/tablet nichts Eigenes anmeldet): eigene Fassungen an den Geräte-Haken */
/* Sparen: alle Karten nebeneinander */
geraetHaken("pc", "sparenKarten", (cards) => ({ cls: "pc", html: `<div class="zgrid">${cards.join("")}</div>` }));
/* Anlegen: Zinseszins, Vergleich und Ziele gleichzeitig statt Reiter */
geraetHaken("pc", "anlegenAllesZeigen", () => true);
/* Haushalt: Kopfbereich mit Konten und Kennzahlen links (01-shell.js) */
geraetHaken("pc", "haushaltGezeichnet", (o) => pcHome(o));
/* Seitenwechsel: die PC-Ansichten bringen ihre eigene Bewegung mit */
geraetHaken("pc", "eigenerSeitenwechsel", (view, prev) => view !== prev && !["list", "fix", "shop"].includes(view));
/* Vorschau-Kurve: Hinweis „mit der Maus darüberfahren“ */
geraetHaken("pc", "vorschauTipp", () => "fc_scrub_pc");
/* Konten: am PC kein Falt-Effekt beim Aufklappen */
geraetHaken("pc", "ohneKontoFalten", () => true);
/* Plus-Menü: als Liste statt als Rad (Maus statt Daumen) */
geraetHaken("pc", "plusAlsListe", () => true);

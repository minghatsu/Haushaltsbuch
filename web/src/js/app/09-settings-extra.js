/* Rechtliches */
const LEGAL_VER = "2026-11-20";
/* Test-App „MAMI Test“: Ersteinrichtung überspringen, damit automatische Tests direkt starten können */
try {
  if (window.AndroidBridge && AndroidBridge.isTest && AndroidBridge.isTest() && !localStorage.getItem("hb-testinit")) {
    const L = localStorage;
    L.setItem("hb-testinit", "1");
    L.setItem("hb-lang", "de");
    L.setItem("hb-legal", LEGAL_VER);
    L.setItem("hb-wiz-skip", "1");
    L.setItem("hb-danke", "1");
    const t = {};
    [
      "home",
      "beruf",
      "zukunft",
      "shop",
      "list",
      "fix",
      "year",
      "ziele",
      "more",
      "import",
      "belege",
      "gemeinsam",
    ].forEach((k) => (t[k] = 1));
    L.setItem("hb-ptour", JSON.stringify(t));
    L.setItem("hb-testseed", "1");
  }
} catch (_) {}
const LEGAL_PAID = false;
const IMPRESSUM = {
  name: "Sascha Georg Küpper",
  street: "Brühler Straße 144",
  city: "42657 Solingen",
  mail: "kontakt@miracleframe.de",
};
const FEEDBACK_MAIL = "kontakt@miracleframe.de";
function impLines() {
  const i = IMPRESSUM,
    miss = '<i class="muted">[wird vor der Veröffentlichung ergänzt]</i>';
  return `${i.name ? escHtml(i.name) : miss}<br>${i.street ? escHtml(i.street) : miss}<br>${i.city ? escHtml(i.city) : miss}<br>E-Mail: ${i.mail ? escHtml(i.mail) : miss}`;
}
const LEGAL = {
  datenschutz: [
    "Datenschutzerklärung",
    () => `
<p><b>Kurz gesagt:</b> Deine Finanz- und Geschäftsdaten bleiben auf deinem Gerät. Du brauchst kein Konto, es gibt keine Werbung, kein Tracking und keine Analyse-Dienste. Daten verlassen dein Gerät nur in den Fällen, die unten stehen – vieles davon nur, wenn du es selbst einschaltest. Wir verkaufen keine Daten.</p>
<h3>1. Verantwortlich</h3><p>${impLines()}</p><p>Einen Datenschutzbeauftragten müssen wir nicht benennen. Für alle Fragen zum Datenschutz genügt eine E-Mail an die Adresse oben.</p>
<h3>2. Überblick: Wann Daten dein Gerät verlassen</h3>
<ul>
<li><b>Nie automatisch:</b> Buchungen, Konten, Kontostände, Rechnungen, Kunden, Briefe, Fotos und Backups.</li>
<li><b>Nur wenn du es einschaltest oder auslöst:</b> Abgleich zwischen Geräten (Ende-zu-Ende verschlüsselt), Briefe mit KI lesen, Händler-Logos online laden, Wechselkurse aktualisieren, Feedback senden, Rechnung per E-Mail verschicken.</li>
<li><b>Technisch nötig:</b> Update-Prüfung, eine tägliche Versionsmeldung ohne Namen und Absturzberichte ohne Finanzdaten (Abschnitt 9).</li>
</ul>
<h3>3. Daten auf deinem Gerät</h3>
<p>Alles, was du einträgst, speichert die App nur im Speicher der App auf deinem Gerät: Buchungen, Konten, Fixkosten, Schulden, Sparziele, Budgets, Termine, Briefe von Ämtern, Profil (Name, Foto), Belegfotos, Lohnabrechnungen und Angaben zu Einkommen, Steuer und Sozialleistungen. In der Handy- und PC-App sind diese Daten verschlüsselt gespeichert (der Schlüssel liegt im Android-Keystore bzw. ist durch Windows geschützt). Der Anbieter hat darauf keinen Zugriff.</p>
<p>Einige Angaben können besonders geschützt sein (Art. 9 DSGVO), z. B. die Kirchensteuer (Religion), Krankengeld, Gesundheitskosten oder Briefe der Krankenkasse. Du entscheidest selbst, ob du sie einträgst; sie werden nur für die Funktionen der App verwendet.</p>
<h3>4. Geschäft: Rechnungen, Kunden und Archiv</h3>
<p>Schreibst du mit der App Rechnungen, speichert sie auf deinem Gerät deine Firmendaten (z. B. Name, Anschrift, Steuernummer, USt-IdNr., Bankverbindung, Logo), deine Kunden und Artikel, die Rechnungen selbst, Zahlungseingänge, Serienrechnungen und Rechnungsfotos.</p>
<p><b>Für die Daten deiner Kunden bist du selbst verantwortlich</b> – die App ist dafür nur dein Werkzeug, der Anbieter sieht diese Daten nicht. Bitte trag nur ein, was du für die Rechnung brauchst.</p>
<p>Damit deine Rechnungen den Regeln für ordnungsgemäße Buchführung (GoBD) entsprechen, werden sie beim Speichern festgeschrieben: Die App bildet eine Prüfsumme (SHA-256) über jede Rechnung, verkettet sie miteinander und führt ein Änderungsprotokoll. Korrigieren kannst du eine festgeschriebene Rechnung nur mit einer Storno-Rechnung. Das alles passiert nur auf deinem Gerät. Das Archiv (ZIP mit PDFs, Rechnungsausgangsbuch und Protokoll) erstellst und speicherst du selbst. Beachte die gesetzlichen Aufbewahrungsfristen (z. B. § 147 AO, § 14b UStG) – sichere deine Rechnungen deshalb regelmäßig.</p>
<h3>5. Rechnungen verschicken und speichern</h3>
<p>„Per E-Mail“ übergibt die Rechnung als PDF an dein eigenes E-Mail-Programm (am PC z. B. Thunderbird, am Handy deine Mail-App). Verschickt wird sie erst, wenn du dort auf Senden tippst – über deinen E-Mail-Anbieter, für den dessen Datenschutzerklärung gilt. Die App selbst schickt keine E-Mails. „Speichern unter“ legt die Datei an dem Ort ab, den du auswählst. Der Anbieter erhält dabei nichts.</p>
<h3>6. Abgleich zwischen Geräten (freiwillig)</h3>
<p><b>Geräte koppeln (ohne Konto):</b> Koppelst du Geräte per QR-Code, werden deine Daten schon auf dem Gerät mit einem Schlüssel verschlüsselt (AES-256, Ende-zu-Ende), den nur deine gekoppelten Geräte kennen. Der Abgleich-Server des Anbieters speichert nur eine Zufallsnummer, die Prüfsumme eines Zugangsschlüssels und verschlüsselte Datenpakete – weder Name noch E-Mail, und der Anbieter kann die Inhalte nicht lesen. Das gilt auch für Rechnungen und Kundendaten. Ungenutzte Kopplungen werden nach zwei Jahren gelöscht, Kopplungen ganz ohne Daten nach einer Woche; du kannst sie jederzeit selbst löschen. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (du nutzt eine Funktion der App).</p>
<p><b>Gemeinsame Bereiche:</b> Teilst du einen Bereich mit anderen (z. B. Partner oder WG), gilt dasselbe Prinzip mit einem eigenen Schlüssel für diesen Bereich. Die anderen Mitglieder sehen nur, was du dort einträgst oder ausdrücklich freigibst (z. B. ein Budget, ein Sparziel, die Summe deiner Fixkosten) – nie deine Konten, Kontostände oder Buchungen.</p>
<h3>7. Briefe mit KI lesen (nur mit deiner Einwilligung)</h3>
<p>Briefe von Ämtern liest die App zuerst auf deinem Gerät. Wenn du möchtest, kann „Mami“ einen Brief zusätzlich mit KI genauer lesen. Die App schwärzt vorher automatisch Namen, Anschriften, Geburtsdaten, Telefonnummern, E-Mail-Adressen sowie Kunden-, Akten-, Steuer- und Kontonummern und zeigt dir den Text; du kannst weitere Stellen antippen, um sie zu schwärzen. Erst wenn du auf „Senden“ tippst (oder wenn du die Vorschau selbst ausgeschaltet hast), geht <b>nur dieser Text</b> (kein Foto) über unseren Server an den Dienst Claude von Anthropic (Anthropic PBC, USA). Die Antwort – Absender, Fristen, Beträge, eine kurze Zusammenfassung – kommt zurück und wird nur auf deinem Gerät gespeichert. Unser Server speichert den Brieftext nicht, sondern nur, wie oft die Funktion genutzt wurde (für die Kostengrenze).</p>
<p>Anthropic verarbeitet den Text nur, um die Antwort zu erzeugen, nutzt ihn nach eigenen Angaben nicht zum Training und löscht ihn nach kurzer Zeit. Weil Anthropic in den USA sitzt, ist eine Übermittlung in ein Drittland möglich; sie erfolgt auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO). Rechtsgrundlage ist deine ausdrückliche Einwilligung (Art. 6 Abs. 1 lit. a und – falls der Brief Gesundheitsdaten enthält – Art. 9 Abs. 2 lit. a DSGVO). Du kannst sie jederzeit widerrufen, indem du die Funktion einfach nicht mehr benutzt – ohne deinen Tipp auf „Senden“ geht nichts an die KI. Ohne KI funktioniert die App genauso, nur ohne die zusätzliche Auswertung.</p>
<h3>8. Texterkennung bei Fotos und PDFs</h3>
<p>Belege, Kontoauszüge, Briefe und Lohnabrechnungen werden <b>auf deinem Gerät</b> gelesen – die Bilder und PDFs verlassen es nicht. In der Android-App übernimmt das die eingebaute Texterkennung ML Kit von Google direkt auf dem Gerät; Google erhält dabei keine Bilder, ML Kit kann aber technische Nutzungs- und Diagnosedaten an Google senden. Auf dem PC und im Browser werden das Erkennungsprogramm (Tesseract.js, pdf.js) und die Sprachdaten beim ersten Benutzen vom Dienst jsDelivr geladen und per Prüfsumme kontrolliert. Dabei erfährt jsDelivr (und dessen Netzwerk-Partner) deine IP-Adresse. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
<h3>9. Updates, Versionsmeldung und Absturzberichte</h3>
<p>Die App fragt regelmäßig nach einer neuen Version und lädt sie herunter – bei GitHub (GitHub Inc., USA; Übermittlung in die USA möglich, EU-US Data Privacy Framework). Dabei wird technisch bedingt deine IP-Adresse übertragen; deine Daten nicht. Jede neue Version ist digital signiert, die App nimmt nur echte Versionen des Anbieters an.</p>
<p>Damit wir sehen, ob ein Update angekommen ist, meldet die App einmal am Tag eine zufällige Gerätenummer (auf dem Server nur als Prüfsumme gespeichert), die Versionsnummer und die Geräteart (Handy, Tablet oder PC) an unseren Server. Stürzt die App ab, schickt sie eine technische Fehlermeldung (Fehlertext, Version, Geräteart) dorthin. Namen, Finanz- und Geschäftsdaten sind in beidem nicht enthalten. Rechtsgrundlage ist unser berechtigtes Interesse, Fehler und Sicherheitslücken schnell zu beheben (Art. 6 Abs. 1 lit. f DSGVO).</p>
<h3>10. Feedback</h3>
<p>Schickst du uns Feedback, gehen dein Text und bis zu fünf Bilder, die du anhängst, an unseren Server und per E-Mail an den Anbieter. Schreib bitte keine Kontodaten oder Daten anderer Personen hinein und schwärze sie auf Bildschirmfotos. Wir nutzen das Feedback nur, um dir zu antworten und die App zu verbessern, und löschen es, sobald es erledigt ist. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
<h3>11. Einladungen während der Testphase</h3>
<p>Während der Testphase wird die App mit Einladungscodes freigeschaltet. Dafür speichert der Server zu jedem Code, welche zufälligen Gerätenummern ihn benutzt haben, wann die Einladungsseite geöffnet, die App geladen und freigeschaltet wurde, und – wenn du es einträgst – einen Namen, den du der eingeladenen Person gibst (höchstens 40 Zeichen, z. B. ein Vorname). Die IP-Adresse wird dabei nur als Prüfsumme gespeichert. Die Angaben werden gelöscht, wenn der Code gelöscht wird, spätestens mit dem Ende der Testphase. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO.</p>
<h3>12. Schutz vor Missbrauch</h3>
<p>Bei jedem Aufruf unseres Servers wird technisch bedingt deine IP-Adresse verarbeitet. Damit niemand den Server mit Anfragen überflutet oder Zugangsschlüssel errät, zählt der Server Anfragen je Anschluss – gespeichert wird dafür nur eine Prüfsumme der IP-Adresse, die nach spätestens einem Tag gelöscht wird. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
<h3>13. Händler- und Kundenlogos (nur wenn du es einschaltest)</h3>
<p>Bekannte Läden haben ihr Logo in der App eingebaut. Schaltest du „Logos online laden“ ein, fragt die App für andere Händler und für deine Rechnungskunden bei Google (Google Ireland Ltd.) und DuckDuckGo nach dem Logo. Bei Kunden nutzt sie dafür die eingetragene Webseite, die Domain einer geschäftlichen E-Mail-Adresse oder eine aus dem Firmennamen abgeleitete Webseite. Übertragen werden nur dieser Webseiten-Name und deine IP-Adresse – keine weiteren Kundendaten; bei Google ist eine Übermittlung in die USA möglich (EU-US Data Privacy Framework). Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du jederzeit mit dem Schalter widerrufen kannst. Geladene Logos werden auf deinem Gerät gespeichert.</p>
<h3>14. Wechselkurse und Prospekte</h3>
<p>Die App enthält Tageskurse der Europäischen Zentralbank. Tippst du im Währungsrechner auf „Aktualisieren“, lädt sie neue Kurse vom Dienst Frankfurter (api.frankfurter.dev bzw. api.frankfurter.app); dabei wird deine IP-Adresse übertragen. Öffnest du bei einem Laden das Prospekt, wird die Webseite des Händlers aufgerufen – dafür gilt dessen Datenschutzerklärung.</p>
<h3>15. Kamera, Fotos, Erinnerungen</h3>
<p>Die App fragt nur dann nach Zugriff auf Kamera, Fotos, Dateien oder Benachrichtigungen, wenn du eine Funktion benutzt, die das braucht. Erinnerungen (z. B. an Fristen aus Briefen, fällige oder überfällige Rechnungen, Fixkosten) werden auf deinem Gerät geplant und angezeigt – es gibt keinen Push-Dienst, über den sie laufen.</p>
<h3>16. Backups und Löschen</h3>
<p>Backup-Dateien erstellst du selbst. Sind deine Geräte gekoppelt, werden Backups verschlüsselt und lassen sich nur mit deinem Code öffnen. Wo du sie speicherst oder an wen du sie weitergibst, entscheidest du. Unter Einstellungen › Backup › „Alle Daten löschen“ löschst du alles auf diesem Gerät und – bei eingeschaltetem Abgleich – auf dem Server. Deinstallierst du die App, sind die Daten auf dem Gerät ebenfalls weg. Denk vorher an deine Aufbewahrungspflichten für Rechnungen (Abschnitt 4).</p>
<h3>17. Empfänger auf einen Blick</h3>
<ul>
<li><b>Unser Server</b> (betrieben vom Anbieter selbst in Deutschland): Abgleich (verschlüsselt), Versionsmeldung, Absturzberichte, Feedback, Einladungen, Weiterleitung an die KI.</li>
<li><b>Anthropic PBC</b> (USA): nur Brieftexte, wenn du „Mit KI lesen“ benutzt.</li>
<li><b>GitHub Inc.</b> (USA): Update-Prüfung und Download.</li>
<li><b>jsDelivr</b>: Texterkennung auf PC und im Browser.</li>
<li><b>Google, DuckDuckGo</b>: nur bei eingeschalteten Händler- und Kundenlogos; <b>Google ML Kit</b> in der Android-App.</li>
<li><b>Frankfurter</b>: nur beim Aktualisieren der Wechselkurse.</li>
</ul>
<p>Darüber hinaus geben wir keine Daten weiter, außer wir sind gesetzlich dazu verpflichtet.</p>
<h3>18. Keine Profile, keine automatischen Entscheidungen</h3>
<p>Wir bilden keine Nutzerprofile und treffen keine automatisierten Entscheidungen im Sinne von Art. 22 DSGVO. Alle Berechnungen und Hinweise der App sind Vorschläge für dich und laufen auf deinem Gerät.</p>
<h3>19. Deine Rechte</h3>
<p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20 – z. B. über die Backup-Datei), Widerspruch gegen Verarbeitungen aus berechtigtem Interesse (Art. 21) und Widerruf einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3). Da wir die meisten Daten nicht kennen und nicht lesen können, liegen sie in deiner Hand: Du siehst, änderst und löschst sie direkt in der App. Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), z. B. in deinem Bundesland oder bei der für uns zuständigen Landesbeauftragten für Datenschutz und Informationsfreiheit Nordrhein-Westfalen.</p>
<h3>20. Änderungen</h3>
<p>Kommen neue Funktionen hinzu, passen wir diese Erklärung an. Ändert sich etwas Wesentliches, zeigt dir die App die neue Fassung beim nächsten Start.</p>
<p class="small muted">Stand: ${new Date(LEGAL_VER).toLocaleDateString("de-DE")}</p>`,
  ],
  agb: [
    "Nutzungsbedingungen",
    () => `
<h3>1. Geltungsbereich</h3><p>Diese Bedingungen gelten für die Nutzung der App „Finanz MAMI“ (Handy, PC und Web) zwischen dir und dem im Impressum genannten Anbieter.</p>
<h3>2. Was die App macht</h3><p>Die App hilft dir, Einnahmen, Ausgaben, Budgets, Schulden und Sparziele zu überblicken. Die Nutzung ist derzeit kostenlos. Sollte es später kostenpflichtige Funktionen geben, wird vorher deutlich darauf hingewiesen; dafür gelten dann zusätzliche Bedingungen und ein Widerrufsrecht.</p>
<h3>3. Keine Beratung</h3><p>Steuer-, Lohn-, Renten- und Leistungsberechnungen (z. B. BAföG, Bürgergeld, Arbeitslosengeld, Elterngeld) sind <b>Schätzungen ohne Gewähr</b>. Sie ersetzen keine Steuer-, Rechts- oder Finanzberatung und keine Auskunft der zuständigen Behörde. Maßgeblich sind immer deine Bescheide und die geltenden Gesetze.</p>
<h3>4. Deine Daten und Sicherungen</h3><p>Du bist für die Richtigkeit deiner Eingaben verantwortlich. Da die Daten auf deinem Gerät liegen, sichere sie regelmäßig über die Backup-Funktion.</p>
<h3>5. Verfügbarkeit und Änderungen</h3><p>Der Anbieter entwickelt die App weiter und kann Funktionen ändern, ergänzen oder entfernen. Ein Anspruch auf ständige Verfügbarkeit von Abgleich- oder Update-Server besteht nicht.</p>
<h3>6. Haftung</h3><p>Solange die App kostenlos ist, haftet der Anbieter nur für Vorsatz und grobe Fahrlässigkeit. Unberührt bleibt die Haftung für Schäden an Leben, Körper und Gesundheit sowie nach dem Produkthaftungsgesetz. Bei Datenverlust haftet der Anbieter nur für den Aufwand, der bei regelmäßiger Sicherung zur Wiederherstellung nötig gewesen wäre.</p>
<h3>7. Ende der Nutzung</h3><p>Du kannst die Nutzung jederzeit beenden, indem du deine Daten löschst und die App deinstallierst.</p>
<h3>8. Änderungen dieser Bedingungen</h3><p>Ändern sich diese Bedingungen, zeigt dir die App die neue Fassung beim nächsten Start und fragt dich erneut um Zustimmung.</p>
<h3>9. Recht und Streitbeilegung</h3><p>Es gilt deutsches Recht. Zwingende Verbraucherschutzvorschriften des Landes, in dem du lebst, bleiben unberührt. Der Anbieter ist nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<p class="small muted">Stand: ${new Date(LEGAL_VER).toLocaleDateString("de-DE")}</p>`,
  ],
  widerruf: [
    "Widerrufsbelehrung",
    () => `
<h3>Widerrufsrecht</h3><p>Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen einen Vertrag über kostenpflichtige Funktionen zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.</p>
<p>Um dein Widerrufsrecht auszuüben, musst du uns (${impLines().replace(/<br>/g, ", ")}) mittels einer eindeutigen Erklärung (z. B. per E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das unten stehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung vor Ablauf der Frist absendest.</p>
<h3>Folgen des Widerrufs</h3><p>Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet.</p>
<h3>Vorzeitiges Erlöschen</h3><p>Bei digitalen Inhalten erlischt das Widerrufsrecht, wenn wir mit der Ausführung des Vertrags begonnen haben, nachdem du ausdrücklich zugestimmt hast, dass wir vor Ablauf der Widerrufsfrist beginnen, und du bestätigt hast, dass du dadurch dein Widerrufsrecht verlierst.</p>
<h3>Muster-Widerrufsformular</h3><p>An: ${impLines().replace(/<br>/g, ", ")}<br>Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über folgende digitale Inhalte/Dienstleistung: ______<br>Bestellt am: ______<br>Name: ______<br>Anschrift: ______<br>Datum: ______</p>`,
  ],
  impressum: [
    "Impressum",
    () =>
      `<h3>Angaben gemäß § 5 DDG</h3><p>${impLines()}</p><p class="small muted">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: siehe oben.</p>`,
  ],
};
LEGAL.lizenzen = [
  "Lizenzen",
  () => `<p>Finanz MAMI verwendet diese freien Bausteine – danke an alle, die sie bauen:</p>
<h3>Caveat (Schrift der Unterschrift)</h3><p>© The Caveat Project Authors (Impallari Type). SIL Open Font License 1.1.</p><h3>Inter (Schrift)</h3><p>© The Inter Project Authors (Rasmus Andersson). SIL Open Font License 1.1 – die Schrift darf frei genutzt und weitergegeben werden, aber nicht allein verkauft werden.</p>
<h3>Simple Icons (Laden-Logos)</h3><p>CC0 1.0 – gemeinfrei. Die Logos sind Marken der jeweiligen Unternehmen und dienen nur zur Erkennung; es besteht keine Verbindung zu diesen Unternehmen.</p>
<h3>Geldscheine und Münzen (Umbuchen)</h3><p>Grafik von Freepik (Magnific), genutzt mit Namensnennung.</p>
<h3>Tesseract.js (Texterkennung)</h3><p>© Tesseract.js-Autoren, Apache License 2.0.</p>
<h3>jsQR (QR-Codes lesen)</h3><p>© Cosmo Wolfe, Apache License 2.0.</p>
<h3>pdf.js (PDF lesen)</h3><p>© Mozilla Foundation, Apache License 2.0.</p>`,
];
const legalKeys = () => ["datenschutz", "agb", ...(LEGAL_PAID ? ["widerruf"] : []), "impressum", "lizenzen"];
function renderRecht() {
  const el = $("rechtEd");
  if (!el) return;
  const open = ui.legalOpen || "";
  el.innerHTML =
    (LANG !== "de"
      ? `<p class="small muted" style="margin:0 0 8px">Rechtstexte gibt es nur auf Deutsch – sie sind maßgeblich.</p>`
      : "") +
    legalKeys()
      .map(
        (k) =>
          `<div class="lgsec ${open === k ? "on" : ""}"><button class="lghd" data-legal="${k}"><b>${LEGAL[k][0]}</b>${svgIcon(open === k ? "up" : "down", 18)}</button>${open === k ? `<div class="legal">${LEGAL[k][1]()}</div>` : ""}</div>`
      )
      .join("") +
    `<p class="small muted" style="margin:12px 0 0">${(() => {
      let v = null;
      try {
        v = localStorage.getItem("hb-legal");
      } catch (e) {}
      return v ? `Zugestimmt auf diesem Gerät (Fassung vom ${new Date(v).toLocaleDateString("de-DE")}).` : "";
    })()}</p>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-legal]");
  if (!b) return;
  const k = b.dataset.legal;
  if (b.closest("#legalBg")) {
    ui.legalRead = ui.legalRead === k ? "" : k;
    legalGate(true);
    return;
  }
  ui.legalOpen = ui.legalOpen === k ? "" : k;
  renderRecht();
});
function legalOk() {
  try {
    return localStorage.getItem("hb-legal") === LEGAL_VER;
  } catch (e) {
    return true;
  }
}
function legalGate(force) {
  if (legalOk() && !force) return;
  let el = $("legalBg");
  if (!el) {
    el = document.createElement("div");
    el.id = "legalBg";
    el.className = "legalbg";
    document.body.appendChild(el);
  }
  let again = false;
  try {
    again = !!localStorage.getItem("hb-legal");
  } catch (e) {}
  const r = ui.legalRead || "",
    chk = !!ui.legalChk;
  el.hidden = false;
  document.body.classList.add("locked");
  el.innerHTML = `<div class="legalbox" role="dialog" aria-modal="true" aria-labelledby="lgT">
    <span class="lgic">${svgIcon("shield", 26)}</span>
    <h2 id="lgT">${again ? "Neue Rechtstexte" : "Bevor es losgeht"}</h2>
    <p class="small muted" style="margin:0 0 12px">${again ? "Wir haben die Texte überarbeitet. Bitte lies sie kurz und stimme erneut zu." : "Kurz, worauf du dich verlassen kannst:"}</p>
    <ul class="lgl"><li>Deine Finanzdaten bleiben auf deinem Gerät.</li><li>Kein Konto nötig, keine Werbung, kein Tracking.</li><li>Abgleich mit dem PC nur, wenn du ihn einschaltest.</li><li>Berechnungen sind Schätzungen – keine Steuer- oder Rechtsberatung.</li></ul>
    ${LANG !== "de" ? `<p class="small muted" style="margin:0 0 8px">Rechtstexte gibt es nur auf Deutsch – sie sind maßgeblich.</p>` : ""}
    ${["datenschutz", "agb"].map((k) => `<div class="lgsec ${r === k ? "on" : ""}"><button class="lghd" data-legal="${k}"><b>${LEGAL[k][0]} lesen</b>${svgIcon(r === k ? "up" : "down", 18)}</button>${r === k ? `<div class="legal">${LEGAL[k][1]()}</div>` : ""}</div>`).join("")}
    <label class="lgchk"><input type="checkbox" id="lgChk" ${chk ? "checked" : ""}><span>Ich habe die Nutzungsbedingungen und die Datenschutzerklärung gelesen und stimme zu. Ich bin mindestens 16 Jahre alt – oder meine Eltern sind einverstanden.</span></label>
    <button class="btn primary" id="lgOk" ${chk ? "" : "disabled"}>Zustimmen &amp; weiter</button>
  </div>`;
}
document.addEventListener("change", (e) => {
  if (e.target.id === "lgChk") {
    ui.legalChk = e.target.checked;
    const b = $("lgOk");
    if (b) b.disabled = !e.target.checked;
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#lgOk")) return;
  if (!ui.legalChk) return;
  try {
    localStorage.setItem("hb-legal", LEGAL_VER);
  } catch (_) {}
  store.settings.legalOk = {
    v: LEGAL_VER,
    d: isoToday(),
  };
  saveSettings();
  const el = $("legalBg");
  if (el) el.hidden = true;
  if (!ui.wiz) document.body.classList.remove("locked");
});

/* Einstellungen extra */
const CHANGELOG = [
  [
    "0.46.6",
    "22. November 2026",
    [
      "Auch beim Antippen der Leiste fließt die Markierung jetzt als Kreis mit Verbindung zum neuen Bereich – egal wie weit entfernt.",
    ],
  ],
  [
    "0.46.5",
    "22. November 2026",
    [
      "Leiste beim Wischen läuft auf älteren Android-Geräten wieder stabil.",
    ],
  ],
  [
    "0.46.4",
    "22. November 2026",
    [
      "Leiste beim Wischen: Die Farbe wechselt jetzt genau in der Mitte zwischen den Symbolen – die Kreise selbst bleiben in ihrer Farbe.",
      "Der weiße Glanz auf der Markierung ist weg.",
    ],
  ],
  [
    "0.46.3",
    "22. November 2026",
    [
      "Kurzes, schnelles Wischen wechselt die Seite jetzt zuverlässig – auch auf langsameren Handys.",
    ],
  ],
  [
    "0.46.2",
    "22. November 2026",
    [
      "Beim Umschalten zwischen „Mein Job“ und „Mein Geschäft“ rutscht die Leiste unten nicht mehr kurz aus dem Bild, und die Feedback-Lasche bleibt stehen.",
    ],
  ],
  [
    "0.46.1",
    "22. November 2026",
    [
      "Neue Leiste beim Wischen: Die Markierung zieht ihren Namen ein, wird zum Kreis und zieht eine Verbindung zum nächsten Symbol – dort baut sich der Kreis auf und fährt den Namen aus.",
      "Zwischen Beruf und Sparen taucht die Verbindung unter dem Plus durch, statt dahinter zu verschwinden.",
      "Die Bewegung folgt dem Finger weich gefedert, auch rückwärts und von Einkauf zurück zu Haushalt.",
    ],
  ],
  [
    "0.46.0",
    "21. November 2026",
    [
      "Beim Wischen auf die nächste Seite legt sich die Nachbarseite nicht mehr schon beim ersten Zucken über den Rand der Hauptseite – sie erscheint erst, wenn der Würfel sie wirklich zeigt.",
    ],
  ],
  [
    "0.45.9",
    "21. November 2026",
    [
      "Beim Wischen auf die nächste Seite blenden Kacheln und Schrift wie eine Welle von oben nach unten aus – und auf der neuen Seite genauso ein, kurz unscharf und dann gestochen scharf.",
    ],
  ],
  [
    "0.45.8",
    "21. November 2026",
    [
      "Nach dem Wischen federn die Karten nacheinander von unten in ihre Position, die Kacheln atmen kurz und die Ziffern großer Beträge rollen ein.",
      "Die Untertitel der Kacheln dürfen zwei Zeilen haben und werden nicht mehr mitten im Wort abgeschnitten.",
    ],
  ],
  [
    "0.45.7",
    "21. November 2026",
    [
      "Einkauf: „Ø pro Tag / Woche / Monat“ blinken beim Wischen nicht mehr weg, und die Beträge stehen ganz da statt „112,0…“.",
      "Beim Seitenwechsel springen Überschrift und Leiste unten jetzt gleichzeitig um, schon während der Würfel ausdreht.",
    ],
  ],
  [
    "0.45.6",
    "21. November 2026",
    [
      "Seitenwechsel per Wischen: Die Seite im Würfel sieht jetzt genau so aus wie danach – Kacheln springen nicht mehr um, Karten behalten ihren Rand, nichts rutscht nach dem Ankommen nach.",
      "Einkauf: Die Beträge „pro Tag/Woche/Monat“ sind nach dem Wischen sofort da statt erst nach ein paar Sekunden.",
      "Vier Kacheln stehen am Handy in einer Reihe statt drei plus einer einzelnen darunter.",
    ],
  ],
  [
    "0.45.5",
    "21. November 2026",
    [
      "Konten: Nach oben wischen klappt sie wieder zusammen – die Karten folgen dem Finger zurück unter das Hauptkonto. Kurz gewischt und losgelassen, gehen sie wieder auf.",
      "Behoben: Beim Zuklappen blitzten die Beträge der Karten hinter dem Hauptkonto kurz auf.",
    ],
  ],
  [
    "0.45.4",
    "21. November 2026",
    [
      "Kartenstapel auf der Startseite: Die Karten, die links und rechts hinter dem Hauptkonto hervorschauen, zeigen nur noch ihre Farbe statt abgeschnittener Beträge. Nach dem Zuklappen gleiten sie sanft eingeblendet heraus.",
    ],
  ],
  [
    "0.45.3",
    "21. November 2026",
    [
      "Konten zuklappen: Die Konten schieben sich unter die Hauptkarte, die obenauf bleibt, und gleiten zusammen zurück auf die Startseite – ohne Doppelbild und ohne Lücke. Der Hintergrund blendet dabei weich aus.",
    ],
  ],
  [
    "0.45.2",
    "21. November 2026",
    [
      "Konten aufklappen: Ziehst du den Kartenstapel nach unten, fächern sich die Konten schon unter deinem Finger auf und federn beim Loslassen an ihren Platz. Kurz angezogen und losgelassen, rutschen sie zurück.",
      "Behoben: Das Ziehen am Kartenstapel hat zusätzlich „Aktualisieren“ ausgelöst.",
    ],
  ],
  [
    "0.45.1",
    "21. November 2026",
    [
      "Umbuchen: Beim Ziehen fliegen jetzt Geldscheine von Konto zu Konto und verlieren unterwegs ein paar Münzen – mit leisen Tönen. Abschalten kannst du das in den Einstellungen unter „Startseite“.",
      "Startseite: „Noch pro Tag“ – dein Hauptkonto geteilt durch die restlichen Tage im Monat",
    ],
  ],
  [
    "0.45.0",
    "21. November 2026",
    ["Wischen: Nach dem Seitenwechsel blinkt die neue Seite nicht mehr kurz weg und wieder ein."],
  ],
  [
    "0.44.9",
    "21. November 2026",
    ["Konten & Spaces: Wählst du unten ein früheres Jahr, zeigen die Kacheln oben die Stände am 31.12. dieses Jahres – nur mit den Konten, die es damals gab."],
  ],
  [
    "0.44.8",
    "21. November 2026",
    ["Behoben (PC): Bei den Einladungen rutschte der QR-Code aus der linken Spalte und war abgeschnitten."],
  ],
  [
    "0.44.7",
    "21. November 2026",
    [
      "Neu: Konten je Jahr. Unter Einstellungen › Konten wählst du ein Jahr und schaltest aus, welche Konten es damals nicht gab. Startseite, Buchen und Fixkosten zeigen dann nur die Konten des jeweiligen Jahres.",
      "PC: Das Entwickler-Menü ist übersichtlicher – mit Bereichen und klaren Beschreibungen. Neu darin: „Tester & Einladungen“ mit Pinnwand, Link für Posts und Update-Erinnerung.",
    ],
  ],
  [
    "0.44.6",
    "21. November 2026",
    [
      "Behoben (PC): Beim Verschieben einer Fixkosten-Kachel im Kalender ging das Fenster „Datei angekommen“ mit dem Logo auf.",
    ],
  ],
  [
    "0.44.5",
    "21. November 2026",
    [
      "Wischen zwischen den Seiten ist deutlich flüssiger: die Nachbarseiten liegen jetzt schon bereit, statt erst beim Wischen gebaut zu werden.",
      "Behoben: Die App hat im Hintergrund ständig Kachel-Namen neu vermessen – das hat Wischen und Scrollen ausgebremst.",
      "Schräge Wischer wechseln jetzt die Seite, statt aus Versehen „Aktualisieren“ auszulösen; über dem Einkaufszettel-Feld lässt sich ebenfalls wischen.",
      "Konto-Karten folgen dem Finger ruhiger.",
    ],
  ],
  [
    "0.44.4",
    "21. November 2026",
    ["Unter der Haube aufgeräumt: der Programmcode ist neu sortiert und lesbarer. An der Bedienung ändert sich nichts."],
  ],
  [
    "0.44.3",
    "21. November 2026",
    [
      "Bessere Lesbarkeit: graue Untertitel auf den Kacheln und „Alle Konten · umbuchen“ etwas kräftiger; Kalendertage im Dunkelmodus gut lesbar.",
    ],
  ],
  [
    "0.44.2",
    "21. November 2026",
    [
      "Selbst angelegte Konten/Spaces (Einstellungen › Spaces) erscheinen jetzt überall zur Auswahl – bei Fixkosten, im Konten-Plan und beim Buchen.",
      "Neues Konto direkt anlegen: im Konten-Plan („+ Konto hinzufügen“) und am PC unter „Abgebucht von“.",
    ],
  ],
  [
    "0.44.1",
    "21. November 2026",
    [
      "Fixkosten: Du kannst jetzt einstellen, von welchem Konto sie abgehen – z. B. Hauptkonto oder dein Space „Monatliche Kosten“. Abhaken senkt dann genau dieses Konto.",
      "Handy: neue Karte „Wo wird abgebucht?“ mit Aufteilung je Konto und Warnung, wenn auf einem Space zu wenig für die offenen Fixkosten liegt – mit „Jetzt umbuchen“.",
      "Handy: „Konten-Plan“ – Posten gedrückt halten und ins andere Konto ziehen, oder antippen und das Konto wählen.",
      "PC: Im Kalender „Farbe: Konto“ färbt jeden Posten nach seinem Konto; im Bearbeiten-Fenster gibt es „Abgebucht von“.",
      "„Noch pro Tag“ und die Vorschau ziehen Fixkosten, die von einem Space abgehen, nicht mehr vom Hauptkonto ab.",
    ],
  ],
  [
    "0.44.0",
    "21. November 2026",
    [
      "Neu: „Anlegen“ im Buchungsfenster – für Geld, das du investierst (z. B. ETF). Es geht vom Hauptkonto ab, zählt aber nicht als Ausgabe im Ø pro Tag. Wählst du ein Anlage-Ziel, wächst dessen Stand automatisch mit.",
      "In der Vorschau bis Monatsende gibt es dafür den Schalter „Anlegen“: Wenn du willst, rechnet Mami deine Investitionen doch im Tagesschnitt mit.",
    ],
  ],
  [
    "0.43.9",
    "21. November 2026",
    [
      "Einladungen am Handy: nur noch Code, Name, Einladen und QR-Code – die Übersicht mit Spalten, Post-Link und Tester-Erinnerung gibt es nur am PC.",
    ],
  ],
  [
    "0.43.8",
    "21. November 2026",
    [
      "Nach dem Speichern einer Buchung steht jetzt dabei, auf welches Konto sie ging (z. B. „· Bargeld“ oder „· Einkauf“) – wenn nicht aufs Hauptkonto.",
      "Kontostand aus PDF mit Datum in der Zukunft (z. B. „bis 30.11.“) hat eingetippte Buchungen von heute verschluckt – behoben.",
      "Kontostand am PC eintragen: Buchungen, die vorher am selben Tag eingetippt wurden, werden nicht mehr doppelt abgezogen.",
      "Sparen & Anlegen: „Öffnen“ öffnete am Handy die Einladungen statt des Zinseszins-Rechners – behoben. Auch „Mit Zinsen“ beim neuen Ziel und die Anlage-Gläser öffnen jetzt wieder den Rechner.",
    ],
  ],
  [
    "0.43.2",
    "21. November 2026",
    [
      "PC-Fixkosten: Tippfehler „Fixkoste“ im Hinweis an den Kalendertagen korrigiert.",
      "Kontoauszug als CSV: Bei der DKB wurde „2.350“ als 2,35 € gelesen – jetzt richtig 2.350 €. Deutsche Bank/Postbank mit getrennten Soll-/Haben-Spalten und Revolut (Namen) funktionieren jetzt auch.",
      "Android-Zurück-Taste und Esc schließen jetzt auch Rechnung, Analyse, Bargeld, Kredit, Bank-Auswahl und weitere Fenster – statt dahinter die Seite zu wechseln.",
      "Bank-Auswahl lässt sich abbrechen, wenn du sie selbst geöffnet hast.",
      "Seitenwechsel per Wischen: Auf langsamen Handys zählt jetzt auch die Stelle, an der der Finger loslässt.",
      "Summen-Karte im Kontostapel antippen zeigt jetzt einen Hinweis statt nichts zu tun.",
      "Kein „-0,00 €“ mehr bei winzigen Rundungsresten.",
      "Einzahl richtig: „1 Buchung übernommen“, „1 Tag“, „noch 1 Woche“, „1 Beleg“ – und diese Meldungen sind jetzt auch übersetzt.",
      "Kalender in den Buchungen: Wochentage besser lesbar, Tageszahlen im Dunkelmodus gut lesbar.",
      "Neue Kategorie oder neuen Space anlegen und dabei woanders hintippen löste einen Fehler aus – behoben.",
    ],
  ],
  [
    "0.43.1",
    "21. November 2026",
    [
      "Fehlersuche auf Handy, Tablet und PC: Beträge wie „3,-“, „1.234“, „+20“ oder „10 EUR“ werden jetzt richtig gelesen.",
      "„Noch pro Tag“ rechnet überall gleich: Hauptkonto minus offene Fixkosten und Steuer-Rücklage, verteilt auf die restlichen Tage inklusive heute.",
      "Von Hand abgehakte Fixkosten senken jetzt sofort den Kontostand – „Noch pro Tag“ springt dabei nicht mehr.",
      "Umbuchen ins Bargeld ohne eingetragenen Kontostand: Das Geld wurde doppelt gezählt – jetzt fehlt es richtig auf dem Konto.",
      "Feedback-Lasche am Handy sitzt jetzt unten rechts und liegt nicht mehr über den Karten oben.",
      "„Gestern“ und „Morgen“ stimmen jetzt auch kurz nach Mitternacht.",
      "Fehlende Übersetzungen ergänzt (Buchung ändern, Homeoffice-Tage, Ziele, Kalender-Hinweis, Backup, Quartale im Jahresplan, Löschen am PC).",
      "Gemeinsam: Abstand zwischen Namensfeld und Knöpfen.",
    ],
  ],
  [
    "0.43.0",
    "21. November 2026",
    ["„bisher Ø pro Tag“ ist überall entfernt – am PC im Ring, auf der Startseite und in der Karte „Noch pro Tag“."],
  ],
  [
    "0.42.9",
    "21. November 2026",
    [
      "Vorschau bis Monatsende: Unter „Das rechne ich mit ein“ schaltest du selbst an und aus, was zählt – Spaces, offene Fixkosten, erwartete Einnahmen, Alltag, Einkauf, Betriebsausgaben, Steuer-Erstattung. Die Kurve rechnet sofort neu.",
      "Vorschau: Die große Zahl zeigte manchmal einen alten Wert ohne Minus (z. B. „862 €“ statt „−62 €“) – behoben.",
    ],
  ],
  [
    "0.42.8",
    "21. November 2026",
    [
      "PC-Startseite: Groß oben steht jetzt dein Hauptkonto, „Auf allen Konten“ findest du als Kachel daneben.",
      "Der Ring „noch pro Tag“ zeigt bei „bisher Ø“ jetzt auch nur die Alltags-Ausgaben.",
    ],
  ],
  [
    "0.42.7",
    "21. November 2026",
    [
      "„Ø pro Tag“ zeigt jetzt nur noch deine Alltags-Ausgaben: ohne Einkäufe, Fixkosten, Betriebsausgaben und Steuer-Vorauszahlungen.",
    ],
  ],
  [
    "0.42.6",
    "21. November 2026",
    [
      "Feedback-Eingang (PC): Meldungen mit Häkchen auswählen – auch mehrere mit Umschalt-Klick oder Strg+A – und dann gemeinsam als gelesen/ungelesen markieren, für Claude kopieren oder löschen. Dazu Filter: Ungelesen, Abstürze, Fehler, Ideen, Lob.",
    ],
  ],
  [
    "0.42.5",
    "21. November 2026",
    [
      "Fehlermeldungen: Kurze, langsame Wischer, die absichtlich keine Seite wechseln, werden nicht mehr als Absturz gemeldet.",
    ],
  ],
  [
    "0.42.4",
    "21. November 2026",
    [
      "Kontoauszug als PDF mit Spaces (z. B. N26): Jede Buchung landet jetzt im richtigen Space, und für Hauptkonto und jeden Space wird der Endstand aus dem Auszug übernommen. Vorher wurde der Stand des letzten Spaces fälschlich beim Hauptkonto eingetragen.",
    ],
  ],
  [
    "0.42.3",
    "21. November 2026",
    [
      "Fehlermeldungen: Ein Seitenwechsel per Wischen wurde fälschlich als „Wischgeste ohne Wirkung“ gemeldet – behoben.",
    ],
  ],
  [
    "0.42.2",
    "21. November 2026",
    [
      "Space-Hinweis („… schuldet dem Hauptkonto …“): Mit „Erledigt – weg damit“ ist er verschwunden und verschiebt nichts mehr zwischen den Konten.",
      "Einkauf: neue Karte „Was du beim Einkaufen ausgibst“ – Durchschnitt pro Tag, Woche und Monat. In der Analyse zählt „Ø pro Tag“ jetzt ohne Einkäufe.",
    ],
  ],
  [
    "0.42.1",
    "21. November 2026",
    ["Beruf am PC: Die Steuer-Kästen unten sind weg – alles dazu findest du in der Kachel „Steuer“."],
  ],
  [
    "0.42.0",
    "20. November 2026",
    [
      "Beruf am PC: Einkommensteuer und Umsatzsteuer stehen jetzt nebeneinander statt in Reitern; der Kasten mit den Kunden-Einnahmen ist weg.",
      "Die Kachel „Kunden“ öffnet jetzt deine Kundendaten: Suche, Kundennummer, Logo, Adresse, Ansprechpartner – bearbeiten, neu anlegen, entfernen oder direkt eine Rechnung schreiben.",
    ],
  ],
  [
    "0.41.9",
    "20. November 2026",
    [
      "Kontoauszug als PDF: Die Buchungen zählen jetzt zum Kontostand, und der Endstand aus dem Auszug („Neuer Kontostand“) wird übernommen – bisher blieb der Kontostand nach einem PDF-Import gleich.",
      "PDF-Auszüge: Eingänge ohne Plus-Zeichen werden nicht mehr als Ausgabe gelesen.",
    ],
  ],
  [
    "0.41.8",
    "20. November 2026",
    [
      "Rechnung: Kunden kannst du jetzt entfernen (Kunde antippen → „Entfernen“, mit Rückgängig). Fertige Rechnungen bleiben dabei unverändert.",
      "Aus hochgeladenen Rechnungen (Fotos und PDFs) übernimmt die App jetzt auch Adresse, Ansprechpartner/Inhaber und E-Mail deiner Kunden – auch nachträglich für schon gelesene Rechnungen.",
    ],
  ],
  [
    "0.41.7",
    "20. November 2026",
    [
      "Rechnung: Kunden haben jetzt eine Kundennummer (fortlaufend ab 1001, änderbar) und bekommen ihr Firmenlogo automatisch aus dem Internet (wenn „Logos online laden“ an ist).",
      "Leistungen werden sofort gespeichert und stehen als Liste mit Suche, Preis und Plus bereit – oft benutzte oben. Unter „Bearbeiten“ änderst du Preise oder löschst sie.",
      "Kunden und Leistungen holt die App sich aus deinen schon hochgeladenen und geschriebenen Rechnungen – auch aus neuen Fotos/PDFs.",
      "Herangezoomte Rechnungs-Vorschau: Beim Verschieben wird nichts mehr markiert.",
    ],
  ],
  [
    "0.41.6",
    "20. November 2026",
    [
      "Rechnungsnummer frei gestalten: laufende Nummer vorne, fester Text dahinter (auch Buchstaben, z. B. 001-MF). Sie zählt durchgehend weiter; das Jahr kannst du optional einbauen.",
      "Steuer-Rücklage: Liegt sie woanders (z. B. bei deinem Partner), trägst du das jetzt ein – dann zählt sie nicht mehr gegen dein Guthaben.",
      "Space-Hinweis verständlicher: „Einkauf schuldet dem Hauptkonto 6,58 €“ statt „Schieb …“.",
      "Neue Datenschutzerklärung: übersichtlicher und jetzt auch mit Rechnungen, Kundendaten, Archiv, Briefe mit KI, Feedback und Einladungen. Du wirst einmal neu um Zustimmung gebeten.",
    ],
  ],
  [
    "0.41.5",
    "20. November 2026",
    [
      "Rechnung als PDF speichern: Du wählst jetzt selbst, wo und unter welchem Namen die PDF (und das Archiv) gespeichert wird – am PC und am Handy (neue App-Version nötig).",
    ],
  ],
  [
    "0.41.4",
    "20. November 2026",
    [
      "GoBD: Gespeicherte Rechnungen sind festgeschrieben und mit Prüfsiegel gesichert – Änderungen nur per Storno (eigene Stornorechnung).",
      "Änderungsprotokoll und Archiv für die Betriebsprüfung (alle PDFs, Rechnungsausgangsbuch, Protokoll als ZIP).",
      "Rechnungen: Umsatzsteuer pro Leistung (19 %, 7 %, 0 %), Rabatt, Teilzahlungen und Rechnungen auf Englisch.",
      "Erinnerungen für Fristen und Termine aus Briefen vom Amt und für überfällige Rechnungen.",
    ],
  ],
  [
    "0.41.3",
    "20. November 2026",
    [
      "Rechnungen: eigenes Logo hochladen – PNGs ohne Hintergrund stehen frei im Kopf, andere Bilder in einem weißen Feld.",
      "Rechnungsfarbe frei wählbar (Farbwähler) oder ganz ohne Farbe in Schwarz-Weiß; bei hellen Farben wird die Schrift automatisch dunkel.",
      "Rechnungen-Fenster neu gestaltet: großer Knopf „Rechnung schreiben“, darunter Fotografieren, Importieren und Selbst eintragen als Kacheln.",
      "Beruf: die Knöpfe „Alle“ und „+ Rechnung“ in den Leisten sind weg – neue Rechnungen über die Kachel „Rechnungen“.",
    ],
  ],
  [
    "0.41.2",
    "20. November 2026",
    [
      "Rechnung „Per E-Mail“: Am PC öffnet Thunderbird mit der Rechnung schon im Anhang, am Handy die Mail-App mit PDF (neue App-Version nötig).",
    ],
  ],
  [
    "0.41.1",
    "20. November 2026",
    [
      "Rechnungs-Vorschau zoomen: am PC mit dem Mausrad, an Tablet und Handy mit zwei Fingern – Doppelklick/-tipp zoomt hinein, Ziehen verschiebt.",
      "Beruf: „Mein Job“ und „Mein Geschäft“ teilen sich den Bildschirm genau zur Hälfte und nutzen die ganze Breite – darunter Steuer und Kunden.",
      "„Jetzt zu tun“ steht jetzt dezent oben in der Einkommenskarte, lange Hinweise brechen in eine zweite Zeile um.",
    ],
  ],
  [
    "0.40.9",
    "20. November 2026",
    [
      "Rechnungen: Abschlagsrechnungen (und in der Schlussrechnung abziehen), Gutschriften und wiederkehrende Rechnungen – Mami erinnert dich und legt die nächste fertig an.",
      "Eigene Rechnungsnummern: Vorsilbe (z. B. RE-) und Startnummer, falls du schon Rechnungen woanders geschrieben hast.",
    ],
  ],
  [
    "0.40.8",
    "20. November 2026",
    [
      "Neu: Rechnungen schreiben – in 4 kleinen Schritten mit Mami-Tipps: Kunde, Leistungen, Details, Prüfen.",
      "Fertige PDF mit farbigem Kopf, „Bitte überweisen bis …“ und QR-Code (GiroCode) zum Bezahlen per Banking-App.",
      "Pflichtangaben-Check, Kleinunternehmer-Hinweis nach § 19, Kunden und Leistungen merkt sich die App.",
      "Jede Rechnung landet in „Rechnungen im Blick“ – mit PDF, Bearbeiten und „Als Vorlage“ für die nächste.",
    ],
  ],
  [
    "0.40.7",
    "20. November 2026",
    [
      "Beruf am PC und Tablet: Unter „Mein Job“ und „Mein Geschäft“ stehen wieder die großen Karten für Steuer und Kunden.",
      "Mein Geschäft zeigt jetzt auch die Steuer-Rücklage.",
    ],
  ],
  [
    "0.40.6",
    "20. November 2026",
    [
      "Beruf: Wer angestellt und selbstständig ist, sieht „Mein Job“ und „Mein Geschäft“ jetzt getrennt – oben dein Einkommen aus beidem und was zu tun ist",
      "Handy und Tablet hochkant: das Geschäft liegt hinter dem Job – nach unten wischen oder antippen, die Kacheln fliegen nach links raus und die anderen kommen von rechts",
    ],
  ],
  [
    "0.40.5",
    "20. November 2026",
    [
      "PC: Bei den Fixkosten verschwand die Auswahl „Monatlich / Vierteljährlich / Jährlich …“, wenn man vorher einen Namen oder Betrag eingetippt hatte – behoben, auch in anderen Listen mit Auswahlfeldern",
    ],
  ],
  [
    "0.40.4",
    "19. November 2026",
    [
      "„Alle Konten“ klappt jetzt wie ein Kartenstapel auf: die Spaces ziehen sich hinter der Hauptkarte zusammen und werden dann nacheinander darunter ausgeteilt – beim Schließen läuft es rückwärts",
    ],
  ],
  [
    "0.40.3",
    "19. November 2026",
    [
      "Neu in den Einladungen: „Link für Posts“ – ein Link für Facebook & Co., jeder Besucher bekommt automatisch seinen eigenen Code",
      "Wer den Link nochmal öffnet, sieht wieder seinen Code von vorhin – höchstens 20 neue Codes am Tag",
      "Link pausieren oder erneuern; die Pinnwand zeigt, wie viele über den Link kamen",
    ],
  ],
  [
    "0.40.1",
    "19. November 2026",
    [
      "Einladungen am PC: breite Pinnwand mit Code links und den drei Spalten rechts",
      "Tester ans Update erinnern: jeder Tester zeigt seine Version – „aktuell“ oder „alt“ – mit Knopf „Erinnern“ oder „Alle ans Update erinnern“",
      "Wer erinnert wird, bekommt einmal am Tag ein Mami-Fenster mit „Jetzt updaten“ und eine Meldung, auch wenn die App zu ist",
      "Einladungen: Tablet-Tester stehen nicht mehr fälschlich als „Android“ da",
    ],
  ],
  [
    "0.40.0",
    "19. November 2026",
    [
      "PC: Plus-Rad dreht beim Ziehen jetzt in die richtige Richtung – der Knopf bleibt unter der Maus und rastet sanft ein",
    ],
  ],
  [
    "0.39.9",
    "19. November 2026",
    [
      "Neu am PC: das Plus-Menü wie am Handy – alle Knöpfe auf einem Viertelkreis um das +, drehen mit Mausrad, Ziehen oder Pfeiltasten, vorne groß mit kurzer Erklärung",
      "Neu am PC: ein Entwickler-Knopf in der Kopfzeile mit Freigabe & Tester, Feedback-Eingang und Werkzeugen",
      "Tablet: im Plus-Rad fehlten Einstellungen, Profil und Hilfe – jetzt sind alle da",
      "Backup laden behält jetzt den Entwickler-Schlüssel",
      "Werkzeuge: Speicher-Anzeige zeigt wieder einen Wert",
    ],
  ],
  [
    "0.39.8",
    "19. November 2026",
    [
      "Tablet: „Alle Konten · umbuchen“ jetzt auch in der grünen Karte – vorher ging Umbuchen am Tablet gar nicht",
      "Umbuchungen bleiben auch nach Monaten richtig im Kontostand",
      "Übersetzungen ergänzt: Einstellungen-Übersicht, Import-Anleitung, Geräte, Speicher, Benachrichtigungen, Analyse",
      "Export: ohne Belegfotos kein leerer ZIP-Knopf mehr",
    ],
  ],
  [
    "0.39.7",
    "19. November 2026",
    [
      "Neu am PC: Geld umbuchen per Ziehen – ein Konto in der grünen Karte mit der Maus auf ein anderes ziehen, Betrag wählen, senden",
      "Nach großen Updates zeigt dir Mami einmal kurz von selbst, was neu ist – mit „Überspringen“. Kleine Verbesserungen stehen nur hier",
      "Hier unter „Neu in dieser Version“: „Mami zeigt's dir“ startet den kurzen Rundgang jederzeit wieder",
    ],
  ],
  [
    "0.39.6",
    "19. November 2026",
    [
      "Neu: Geld umbuchen wie bei N26 – unter dem Kontostand „Alle Konten“ antippen oder die Karte nach unten ziehen, eine Karte auf eine andere ziehen, Betrag wählen, senden",
      "Kontostand: ein eingetragener Stand wird jetzt genau so angezeigt (Spaces und Hauptkonto)",
      "Neu: leise Töne – beim Speichern, Abhaken, Ziele, Löschen und Rückgängig, Seitenwechsel, Plus-Menü, Karten wischen, Kopieren, Kassenbon, Import, Koppeln, Monats-Rückblick, neuen Hinweisen, Budget überschritten, Fehlern und bei Mami. Drei Klänge zur Wahl (Sanft, Glas, Holz), zwei Lautstärken, mit Schalter in den Einstellungen. Ist das Handy lautlos, bleibt die App still",
      "Tester können die App selbst weitergeben: QR-Code im Plus-Menü, gemeinsame Testplätze mit Zähler, nach dem Scannen kommt sofort der nächste Code",
      "Hell/Dunkel am Handy wie am PC: sofort, mit Kreis-Übergang vom Schalter aus",
      "Neues Logo überall – App-Symbol, Statusleiste, Windows und Einladungsseite",
      "Willkommens-Band beim ersten Start",
      "Viele kleine Verbesserungen für Tablet, Dunkelmodus und lange Wörter in anderen Sprachen",
    ],
  ],
  [
    "0.26.5",
    "14. November 2026",
    [
      "Feedback-Knopf: am Handy als Lasche am rechten Rand, an Tablet und PC oben – von jeder Seite aus Fehler, Ideen und Fragen schicken",
      "Einstellungen am Handy neu: Profil oben, Schnellschalter mit lebenden Symbolen (Sonne/Mond, Glocke, Schild, Laden), Bereiche als Kästen mit eigenen Seiten",
      "Koppeln mit Anfrage: der andere sieht dein Profilbild und muss bestätigen, das Hauptgerät hat eine Krone 👑, bis zu 10 Geräte",
      "Beim Koppeln zeigt ein Pfeil, in welche Richtung die Daten gehen – antippen dreht ihn um",
      "Gekoppelte Geräte zeigen ihr Profilbild",
      "Tablet neu aufgeteilt: grüner Kasten als schmale Spalte, Fixkosten-Kalender und Seitenspalte scrollen getrennt, „Ohne festen Tag“ ganz oben",
      "Tablet: kein Entwickler-Kram mehr in der Kopfzeile, neu laden durch Herunterziehen",
      "Einkaufszettel im Dunkelmodus angenehm dunkel",
      "Handy: Kopfzeile aufgeräumt, „?“ neben der Glocke, kleinere Knöpfe",
      "Hilfe-Menü ohne doppelte Einträge",
      "Behoben: Filter bei den Buchungen abgeschnitten, Seitenwechsel am Tablet hochkant, Glocken-Schalter am Tablet",
    ],
  ],
  [
    "0.24.1",
    "13. November 2026",
    [
      "Eine Versionsnummer für Handy, Tablet und PC – mit „Tester“ oder „Entwickler“ dahinter",
      "App weitergeben: eigener QR-Code zum Einladen, Freischalten beim ersten Start",
      "Farbpakete färben jetzt alles ein – Handy, Tablet und PC",
      "Tablet-Version: Dock unten, Wischen zum Blättern, Drehen mit Animation",
      "Neues App-Symbol: Mama mit Sparschwein",
      "Kurze Tour für jede Seite – beim ersten Besuch von selbst, später über das „?“",
      "Animationen: Karten kommen nacheinander, Häkchen ploppen, Balken füllen sich",
      "Zusammengelegt: Sparziele und Anlage-Ziele, Belege als Filter in den Buchungen, ein Hilfe-Menü",
      "Handy: Erinnerungen auch bei geschlossener App",
    ],
  ],
  [
    "",
    "11. November 2026",
    [
      "QR-Codes scannen: auf dem Handy öffnet sich direkt die Kamera und liest den Code sofort – am PC wählst du ein Bild",
      "Koppeln in beide Richtungen: auch der PC zeigt einen kurzen Code, den du am Handy unter „Gerät koppeln“ eintippst",
      "Abgleich-Seite neu: große Statusanzeige, die mit Animation zeigt, was gerade passiert – Abgleich, Update oder Koppeln",
      "Update da, aber nicht automatisch geladen? Dann steht es in der Glocke – mit Knopf zum Installieren",
      "Die Glocke wackelt, wenn es etwas Neues gibt",
      "Koppeln mit dem PC: der PC zeigt den QR-Code, das Handy scannt ihn – kein Abtippen mehr",
      "Kurzer Kopplungs-Code mit 10 Zeichen statt des langen Codes – gilt 10 Minuten",
      "Kopplungs-Fenster lässt sich nach unten wischen und mit × schließen",
      "Tutorial-Tour ausführlicher: bis zu 12 kurze Schritte – Noch pro Tag, Monat wechseln, Schulden, Kassenbon & Kontoauszug, Buchungen, Einkaufen, Hinweise",
      "Alle Sprachen überarbeitet: neue Texte übersetzt, auch Diagramm-Beschriftungen",
      "Gehalt: zeigt die Monate mit Gehalt (Abrechnung, Mindestlohn-Schätzung oder Gehaltseingang) statt „0 von 12“",
      "Analyse neu: drei Reiter Auswertung, Planung und Steuer – Übrig mit Verlauf, Kennzahlen und Top-Kategorien direkt sichtbar",
      "Feedback: bis zu 4 Bilder (z. B. Screenshots) mitschicken",
      "Sprache & Währung neu gestaltet: Sprachen mit Flaggen, zweite Währung per Antippen, grüner Umrechner, Kursliste mit Flaggen",
      "Wischen in seitlich scrollbaren Leisten wechselt nicht mehr versehentlich die Seite",
      "Wischen zwischen den Hauptseiten läuft flüssiger",
    ],
  ],
  [
    "",
    "10. November 2026",
    [
      "Neu: 8 Sprachen – Deutsch, English, Türkçe, Русский, Українська, Polski, العربية, Română",
      "Währungsrechner mit EZB-Kursen, Kontostand zusätzlich in einer zweiten Währung, Buchungen in Fremdwährung",
      "Neu: Gemeinsam – mit Partner oder WG Ausgaben teilen und ausgleichen, gemeinsame Sparziele, Einkaufsliste",
      "Budgets, Sparziele und Fixkosten einzeln freigeben – alles andere bleibt privat",
      "Geräte koppeln ohne Konto: QR-Code scannen, Daten Ende-zu-Ende verschlüsselt",
      "Bargeld als eigene Karte und als Block auf der Startseite – mit „Abgehoben“ und Kassensturz",
      "Karte oder bar? Beim Eintragen wählst du jetzt, wie du bezahlt hast",
      "Neue Kamera: grüner Rahmen ums Papier, erkennt Kontoauszug, Rechnung oder Quittung",
      "Danach Foto und erkannte Werte im Vergleich – alles änderbar, erst dann bestätigen",
      "Jahr-Ansicht mit allen Monaten, teuerstem Monat, Kategorien und Vergleich zum Vorjahr",
      "Einstellungen neu geordnet: vier Reiter oben, Bereiche klappen direkt auf – keine Unterseiten mehr",
      "Suche in den Einstellungen findet jede Einstellung",
      "Fixkosten erkennen: regelmäßige Zahlungen aus deinen Kontoauszügen werden als Fixkosten vorgeschlagen – auch für schon importierte Daten",
      "Kreditraten und Steuer-Ratenzahlungen erkennt die App dabei und legt sie unter „Kredite & Schulden“ an",
      "Umschuldung erkennen: Kredit-Auszahlung und z. B. Zahlung ans Finanzamt zählen nicht mehr als Einnahme/Ausgabe – die App legt den Kredit mit Rate selbst an",
      "„Kredite & Schulden“: Art wählbar (Kredit, Ratenkauf, Dispo, privat)",
      "Jede Rate zeigt Zinsen und Tilgung getrennt – auch in der Analyse",
      "Regelmäßige Überweisungen an Personen kannst du als „Privat geliehen“ markieren – die App legt die Schuld dann an",
      "Neue Schuld-Art „BAföG / Studium“ 🎓",
      "Kredite & Schulden: neues Feld „Ursprünglich geliehen“ – der Balken zeigt, wie viel du schon abbezahlt hast",
      "Mindestlohn: Stunden pro Woche können sich ändern – mit „ab Monat“ und Pausen",
      "Gehalt & Abrechnungen: Monate ohne Abrechnung werden mit dem Mindestlohn geschätzt, Netto aus deinen Gehaltseingängen",
      "Mehr Sicherheit: deine Daten sind jetzt auch auf dem Gerät verschlüsselt (Schlüssel im Android-Keystore bzw. von Windows geschützt)",
      "Bildschirmschutz: keine Screenshots und kein Vorschaubild in der App-Übersicht (unter Sicherheit abschaltbar)",
      "Benachrichtigungen zeigen auf dem Sperrbildschirm keine Beträge mehr",
      "PIN wird mit einem langsamen Verfahren geprüft – Durchprobieren dauert jetzt sehr lange",
      "Backups bei gekoppelten Geräten jetzt verschlüsselt – öffnen mit dem Wiederherstellungs-Code",
      "Kontoauszug nochmal importieren: bei schon vorhandenen Buchungen ergänzt die App den Verwendungszweck – so werden auch alte Kreditraten erkannt",
      "Buchungen eines Tages stehen in der Reihenfolge, in der sie gebucht wurden – die neueste oben. Für schon importierte Buchungen: Kontoauszug einmal neu importieren",
      "Startseite: „Noch pro Tag“ – dein Hauptkonto geteilt durch die restlichen Tage im Monat",
      "„Gesamt mit Spaces“ ist jetzt einfach die Summe aller Konto-Karten",
      "Feedback per E-Mail an kontakt@miracleframe.de",
    ],
  ],
  [
    "",
    "9. November 2026",
    [
      "Analyse: überall 4 Kacheln pro Bereich – neu Sparziele und Fixkosten",
      "Eigene Kacheln für jede Gruppe, z. B. BAföG-Rückzahlung, Töpfe, Stundenlohn, 78-Wochen-Grenze, Zuzahlungen",
      "Einstellungen neu: Profil mit Zahlen, Schnell-Schalter, Abos & Verträge, Export, Hilfe, Feedback, Belege & Speicher, Geräte",
      "Datenschutz, Nutzungsbedingungen und Impressum",
      "Schrift und Laden-Logos eingebaut – nichts mehr an Google",
      "Mindestlohn-Automatik: Gehalt steigt jedes Jahr mit",
      "Werte pro Jahr (Mindestlohn, Minijob-Grenze)",
      "Eigene Startseite für Studium, Schule, Ausbildung, Rente, Elternzeit, Krankengeld und Beamte",
      "Steuer-Kachel passend zu jeder Gruppe",
      "Neu: Beamte",
      "Keine Steuer-Kacheln mehr bei Grundsicherung",
    ],
  ],
];
const verNum = (x) => "0." + Math.floor(x / 10) + "." + (x % 10);
function curVerShort() {
  const n = +((document.querySelector('meta[name="hb-version"]') || {}).content || 0);
  return n ? verName(n).replace(/^v/, "") : CHANGELOG[0][0];
}
const verRole = () => (typeof updKey === "function" && updKey() ? "Entwickler" : "Tester");
const verFull = () => "v" + curVerShort() + " · " + verRole();
function neuUnseen() {
  try {
    return localStorage.getItem("hb-seenlog") !== CHANGELOG[0][0];
  } catch (e) {
    return false;
  }
}
function renderNeu() {
  const el = $("neuEd");
  if (!el) return;
  try {
    localStorage.setItem("hb-seenlog", CHANGELOG[0][0]);
  } catch (e) {}
  el.innerHTML = CHANGELOG.map(
    ([v, d, items], i) =>
      `<div class="clog ${i ? "" : "top"}"><div class="clh"><b>${v ? "v" + escHtml(v) : escHtml(d)}</b><span class="small muted">${v ? escHtml(d) : ""}</span>${v && NEWTOUR.some((x) => x.v === v && x.s().length) ? `<button type="button" class="ntgo" data-newtour="${escHtml(v)}" data-noi18n>${svgIcon("insight", 15)}<span>${escHtml(uiText("nw_show"))}</span></button>` : ""}</div><ul>${items.map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul></div>`
  ).join("");
}
const FAQ = [
  [
    "Wie trage ich etwas ein?",
    "Tippe unten auf das große Plus. Du kannst selbst eintippen, einen Beleg fotografieren oder Kontoauszüge importieren.",
  ],
  [
    "Wo finde ich meine Belegfotos?",
    "Einstellungen › Belege & Speicher › „Belege ansehen“ – oder in den Buchungen oben auf „Belege“.",
  ],
  [
    "Wie fotografiere ich einen Kontoauszug?",
    "Plus › Foto. Leg das Blatt flach auf einen dunklen Untergrund, gutes Licht, alle vier Ecken im Bild. Die Kamera zeigt einen grünen Rahmen und erkennt selbst, ob es ein Kontoauszug, eine Rechnung oder eine Quittung ist. Danach siehst du Foto und erkannte Werte nebeneinander und kannst alles ändern, bevor du bestätigst.",
  ],
  [
    "Warum stimmt mein Kontostand nicht?",
    "Trag einmal den Stand vom 1. Januar ein (Einstellungen › Konten). Danach rechnet die App jeden Monat weiter.",
  ],
  [
    "Was ist „pro Tag frei“?",
    "Geld auf dem Konto minus alles, was diesen Monat noch fest abgeht (Fixkosten, Rücklage), geteilt durch die restlichen Tage.",
  ],
  [
    "Sind meine Daten sicher?",
    "Sie bleiben verschlüsselt auf deinem Gerät. Koppelst du Geräte, gehen sie nur Ende-zu-Ende verschlüsselt an den Abgleich-Server – lesen kann sie dort niemand. Unter Sicherheit kannst du eine PIN oder den Fingerabdruck einschalten.",
  ],
  [
    "Wie mache ich ein Backup?",
    "Einstellungen › Backup. Auf dem Handy und PC macht die App das auch automatisch jede Woche.",
  ],
  [
    "Wie stimmt die Steuer-Schätzung besser?",
    "Lade deine Lohnabrechnungen hoch (Analyse › Gehalt) und trag Vorsorge und Werbungskosten ein. Es bleibt eine Schätzung.",
  ],
  [
    "Ich habe eine neue Arbeit / bin arbeitslos geworden",
    "Einstellungen › Steuer & Einkommen (oder die Kachel deiner Gruppe) › „Wie verdienst du dein Geld?“. Die App baut sich danach um.",
  ],
  ["Wie lösche ich alles?", "Einstellungen › Backup › „Alle Daten löschen“."],
];
function renderHilfe() {
  const el = $("hilfeEd");
  if (!el) return;
  const o = ui.faqOpen;
  el.innerHTML =
    `<button class="tourstart" data-tour="open"><span class="tico">${svgIcon("spark", 20)}</span><span><b>Tutorial ansehen</b><small>Kurze Tour durch die App – ca. 1 Minute</small></span></button>` +
    `<div class="ptlist"><small class="muted">Kurze Touren zu jeder Seite</small><div>${Object.entries(PTOUR)
      .map(([k, o]) => `<button class="chip" data-ptgo="${k}">${escHtml(o.t)}</button>`)
      .join("")}</div></div>` +
    FAQ.map(
      ([q, a], i) =>
        `<div class="lgsec ${o === i ? "on" : ""}"><button class="lghd" data-faq="${i}"><b>${escHtml(q)}</b>${svgIcon(o === i ? "up" : "down", 18)}</button>${o === i ? `<p class="small" style="margin:0 0 12px;line-height:1.55">${escHtml(a)}</p>` : ""}</div>`
    ).join("") +
    `<button class="btn" data-spgo="feedback" style="margin-top:14px">Frage nicht dabei? Schreib uns</button>`;
}

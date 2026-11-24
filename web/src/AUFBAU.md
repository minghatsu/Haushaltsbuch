# Aufbau der App-Quellen

Die App wird mit `python3 tools/build-web.py` aus diesen Ordnern zusammengebaut. Es entsteht weiterhin
**eine** App für alle Geräte; beim Start entscheidet `js/gemeinsam/00-geraet.js`, welches Gerät es ist.

| Ordner | Inhalt |
|---|---|
| `js/gemeinsam/`, `css/gemeinsam/` | alles, was auf jedem Gerät gleich ist: rechnen, speichern, Abgleich, Texte (8 Sprachen), Fenster |
| `js/handy/`, `css/handy/` | nur Handy: untere Leiste, Wischen zwischen den Hauptseiten, Einstellungen als Liste, Mamis Satz im Haushalt |
| `js/pc/`, `css/pc/` | PC – und die Grundlage fürs Tablet |
| `js/tablet/`, `css/tablet/` | nur Tablet: was vom PC abweicht |

## Wo ändere ich was?

- **Nur ein Gerät soll anders aussehen oder sich anders verhalten:** in dessen Ordner.
- **Gilt für alle Geräte (Rechnen, Daten, Texte):** in `gemeinsam/`.
- CSS in `css/handy/` beginnt mit `html:not(.pc)`, in `css/pc/` mit `html.pc`, in `css/tablet/` mit `html.pc.istab`.

## Geräte-Haken

Wo sich der Aufbau je Gerät unterscheidet, fragt der gemeinsame Code an einer festen Stelle nach:

```js
// im Geräte-Ordner
geraetHaken("pc", "sparenKarten", (cards) => ({ cls: "pc", html: `<div class="zgrid">${cards.join("")}</div>` }));
// im gemeinsamen Code
const zk = geraetRuf("sparenKarten", cards) || { cls: "", html: cards.join("") };
```

Eine Anmeldung gilt nur auf ihrem Gerät. `pc` gilt auch fürs Tablet, solange `tablet` für denselben Haken
nichts Eigenes anmeldet. Die Haken stehen gesammelt in `00-haken-handy.js`, `00-haken-pc.js` und
`00-haken-tablet.js`.

Bewusst im gemeinsamen Code geblieben sind Gerätenamen und Fähigkeiten (Benachrichtigungen unter Windows,
SMS, Teilen, Update-Dateien) sowie die Mami-Tour, die für jedes Gerät die passenden Stellen zeigt.

## Reihenfolge

Alle JS-Dateien teilen sich einen Gültigkeitsbereich. Die Dateien aller Ordner einer Ausgabe werden
zusammen nach Dateinamen sortiert – die Nummer vorne bestimmt die Reihenfolge, egal in welchem Ordner die
Datei liegt. Dateinamen müssen deshalb über alle Ordner einer Ausgabe eindeutig sein (der Bau prüft das).

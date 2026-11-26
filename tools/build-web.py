"""Baut web/index.html, web/pc.js und web/pc.css aus den Quellen in web/src.

    python3 tools/build-web.py          schreibt die Dateien
    python3 tools/build-web.py --check  prüft nur, ob sie zu den Quellen passen

Aufbau von web/src – getrennt nach Geräten:
    index.html          HTML-Gerüst mit Platzhaltern
    js/vendor/          fremde Bibliotheken, unverändert
    js/theme.js         setzt Hell/Dunkel, bevor die Seite gezeichnet wird

    js/gemeinsam/       rechnen, speichern, Abgleich, Texte, Fenster – für alle Geräte
    js/handy/           nur Handy: untere Leiste, Wischen zwischen den Hauptseiten …
    js/pc/              PC (und die Grundlage fürs Tablet)
    js/tablet/          nur Tablet: was vom PC abweicht

    css/gemeinsam/      Aussehen für alle Geräte
    css/handy/          nur Handy (html:not(.pc))
    css/pc/             PC (html.pc)
    css/tablet/         nur Tablet (html.pc.istab)

    Alle JS-Dateien teilen sich einen Gültigkeitsbereich. Innerhalb einer Ausgabe werden die Dateien
    aller beteiligten Ordner gemeinsam nach Dateinamen sortiert – die Nummer vorne bestimmt also die
    Reihenfolge, egal in welchem Geräte-Ordner eine Datei liegt.

Ausgaben:
    index.html  js/gemeinsam + js/handy, css/gemeinsam + css/handy
    pc.js       js/pc + js/tablet   (wird in index.html bei /*PC-JS*/ eingesetzt)
    pc.css      css/pc + css/tablet (wird bei /*PC-CSS*/ eingesetzt, wirkt nur auf PC und Tablet)
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "web" / "src"
OUT = ROOT / "web"


def read(path):
    return path.read_text(encoding="utf-8")


def concat(folders, ext="js"):
    """Liest alle Dateien der Ordner (durch Leerzeichen getrennt), sortiert nach Dateinamen."""
    files = []
    for folder in folders.split():
        d = SRC / folder
        if not d.is_dir():
            sys.exit(f"Ordner fehlt: {folder}")
        files += d.glob("*." + ext)
    names = [f.name for f in files]
    dup = {n for n in names if names.count(n) > 1}
    if dup:
        sys.exit("Doppelte Dateinamen in " + folders + ": " + ", ".join(sorted(dup)))
    files.sort(key=lambda f: f.name)
    if not files:
        sys.exit(f"Keine Dateien in {folders}")
    return "\n".join(read(f).rstrip("\n") + "\n" for f in files)


def build_index():
    out = []
    for line in read(SRC / "index.html").split("\n"):
        m = re.fullmatch(r"<!-- (include|app|css): (\S+(?: \S+)*) -->", line.strip())
        if not m:
            out.append(line)
        elif m.group(1) == "include":
            out.append(read(SRC / m.group(2)).rstrip("\n"))
        elif m.group(1) == "css":
            out.append(concat(m.group(2), "css").rstrip("\n"))
        else:
            # async: der Tresor (00-0-tresor.js) wartet vor allem anderen, bis die Daten entschlüsselt sind
            out.append('(async () => {\n"use strict";\n\n' + concat(m.group(2)) + "/*PC-JS*/\n})();")
    return "\n".join(out)


def main():
    files = {
        "index.html": build_index(),
        "pc.js": concat("js/pc js/tablet"),
        "pc.css": concat("css/pc css/tablet", "css"),
    }
    if "--check" in sys.argv:
        stale = [n for n, s in files.items() if not (OUT / n).exists() or read(OUT / n) != s]
        if stale:
            sys.exit("Nicht aktuell (bitte tools/build-web.py ausführen): " + ", ".join(stale))
        print("web/ passt zu web/src")
        return
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8", newline="\n")
    print("gebaut:", ", ".join(files))


if __name__ == "__main__":
    main()

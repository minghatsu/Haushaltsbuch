"""Baut web/index.html, web/pc.js und web/pc.css aus den Quellen in web/src.

    python3 tools/build-web.py          schreibt die Dateien
    python3 tools/build-web.py --check  prüft nur, ob sie zu den Quellen passen

Aufbau von web/src:
    index.html      HTML-Gerüst mit Platzhaltern
    css/            fonts.css und app.css (Handy), pc.css (PC und Tablet)
    js/vendor/      fremde Bibliotheken, unverändert
    js/theme.js     setzt Hell/Dunkel, bevor die Seite gezeichnet wird
    js/app/         die App; alle Dateien teilen sich einen Gültigkeitsbereich
    js/pc/          Zusätze für PC und Tablet, landen am Ende dieses Bereichs
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "web" / "src"
OUT = ROOT / "web"


def read(path):
    return path.read_text(encoding="utf-8")


def concat(folder):
    files = sorted((SRC / folder).glob("*.js"))
    if not files:
        sys.exit(f"Keine Dateien in {folder}")
    return "\n".join(read(f).rstrip("\n") + "\n" for f in files)


def build_index():
    out = []
    for line in read(SRC / "index.html").split("\n"):
        m = re.fullmatch(r"<!-- (include|app): (\S+) -->", line.strip())
        if not m:
            out.append(line)
        elif m.group(1) == "include":
            out.append(read(SRC / m.group(2)).rstrip("\n"))
        else:
            out.append('(() => {\n"use strict";\n\n' + concat(m.group(2)) + "/*PC-JS*/\n})();")
    return "\n".join(out)


def main():
    files = {
        "index.html": build_index(),
        "pc.js": concat("js/pc"),
        "pc.css": read(SRC / "css" / "pc.css"),
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

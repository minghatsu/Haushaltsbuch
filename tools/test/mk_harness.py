# Baut aus web/ eine Test-Version der App mit Test-Haken (window.__T).
import os
import re
import sys

root = sys.argv[1] if len(sys.argv) > 1 else "."
out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/hbtest"
os.makedirs(out, exist_ok=True)


def read(p):
    return open(os.path.join(root, p), encoding="utf-8").read()


s = read("web/index.html").replace("/*PC-JS*/", read("web/pc.js"), 1).replace("/*PC-CSS*/", read("web/pc.css"), 1)

hook = "window.__T=()=>({S:store,UI:ui,render,initStack,IS_PC,...(window.__X||{})});"
m = re.search(r"function initStack\(id, ?key, ?dotsId\) ?\{", s)
if not m:
    sys.exit("Testhaken-Stelle fehlt (initStack)")
s = s[: m.start()] + hook + s[m.start() :]

if "--debug" in sys.argv:
    s, n = re.subn(r"(place\(0, ?false\);\s*\n\s*st\.style\.height)", r"st._cards=cards; st._key=key; \1", s, count=1)
    if n != 1:
        sys.exit("Debug-Stelle fehlt (place)")

head = (
    '<!doctype html><html lang="de"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    "<style>body{margin:0;font:14px system-ui,sans-serif}[hidden]{display:none!important}</style></head><body>"
)
open(os.path.join(out, "app.html"), "w", encoding="utf-8").write(head + s + "</body></html>")
print("Test-App:", os.path.join(out, "app.html"))

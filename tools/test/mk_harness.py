# Baut aus web/ eine Test-Version der App mit Test-Haken (window.__T).
import sys, os
root = sys.argv[1] if len(sys.argv) > 1 else "."
out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/hbtest"
os.makedirs(out, exist_ok=True)
r = lambda p: open(os.path.join(root, p), encoding="utf-8").read()
s = r("web/index.html").replace("/*PC-JS*/", r("web/pc.js"), 1).replace("/*PC-CSS*/", r("web/pc.css"), 1)
H = "window.__T=()=>({S,UI,render,initStack,IS_PC,...(window.__X||{})});"
A = "function initStack(id, key, dotsId){"
if A not in s: sys.exit("Testhaken-Stelle fehlt (initStack)")
s = s.replace(A, H + A, 1)
if "--debug" in sys.argv: s = s.replace("  place(0,false);\n  st.style.height", "  st._cards=cards; st._key=key; place(0,false);\n  st.style.height", 1)
head = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:14px system-ui,sans-serif}[hidden]{display:none!important}</style></head><body>'
open(os.path.join(out, "app.html"), "w", encoding="utf-8").write(head + s + "</body></html>")
print("Test-App:", os.path.join(out, "app.html"))

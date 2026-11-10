# Setzt eine strenge Content-Security-Policy in app.html: nur genau das eingebaute Skript (per Prüfsumme) und pdf.js dürfen laufen.
import re, hashlib, base64, sys
p = sys.argv[1] if len(sys.argv) > 1 else "app.html"
s = open(p, encoding="utf-8").read()
scripts = re.findall(r"<script>(.*?)</script>", s, re.S)
if len(scripts) != 1:
    sys.exit("erwartet genau ein <script>, gefunden: %d" % len(scripts))
h = base64.b64encode(hashlib.sha256(scripts[0].encode("utf-8")).digest()).decode()
csp = ("default-src 'self'; script-src 'sha256-%s' https://cdn.jsdelivr.net; "
       "style-src 'self' 'unsafe-inline'; font-src 'self' data:; "
       "img-src 'self' data: blob: https:; connect-src 'self' data: blob: https:; "
       "object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'") % h
tag = '<meta http-equiv="Content-Security-Policy" content="%s">' % csp
if '<meta charset="utf-8">' not in s:
    sys.exit("kein <meta charset> gefunden")
s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + tag, 1)
open(p, "w", encoding="utf-8").write(s)
print("CSP gesetzt, Skript-Prüfsumme sha256-" + h)

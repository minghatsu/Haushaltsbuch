# Strenge Content-Security-Policy für die statischen Server-Seiten (Einladung, Download-Seite):
# Nur genau das eingebaute Skript (per Prüfsumme) darf laufen, Anfragen nur an den eigenen Server.
# Aufruf: python3 tools/csp-static.py [--check] server/einladung.html server/i.html
import re, hashlib, base64, sys
check = "--check" in sys.argv
files = [a for a in sys.argv[1:] if not a.startswith("--")] or ["server/einladung.html", "server/i.html"]
bad = []
for p in files:
    s = open(p, encoding="utf-8").read()
    scripts = re.findall(r"<script>(.*?)</script>", s, re.S)
    hs = " ".join("'sha256-%s'" % base64.b64encode(hashlib.sha256(x.encode("utf-8")).digest()).decode() for x in scripts)
    csp = ("default-src 'self'; script-src %s; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
           "font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'") % hs
    tag = '<meta http-equiv="Content-Security-Policy" content="%s">' % csp
    s2 = re.sub(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">\n?', "", s)
    s2 = s2.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + tag, 1)
    if s2 != s:
        if check: bad.append(p)
        else: open(p, "w", encoding="utf-8").write(s2)
if bad: sys.exit("CSP nicht aktuell (python3 tools/csp-static.py ausführen): " + ", ".join(bad))
print("CSP ok" if check else "CSP gesetzt")

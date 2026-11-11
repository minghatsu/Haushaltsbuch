# Verkleinert den App-Code für die Auslieferung (kleiner, lädt schneller).
import re, subprocess, sys, tempfile, os
path, terser = sys.argv[1], sys.argv[2]
s = open(path, encoding="utf-8").read()
def rep(m):
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(m.group(2)); tmp = f.name
    try:
        out = subprocess.run(["node", terser, tmp, "-c", "-m", "--comments", "false"], capture_output=True, text=True, check=True, encoding="utf-8").stdout
    finally:
        os.unlink(tmp)
    return m.group(1) + out.replace("</script", "<\\/script") + "</script>"
s2 = re.sub(r"(<script(?:\s[^>]*)?>)(.*?)</script>", rep, s, flags=re.S)
s2 = re.sub(r"<!--(?!hb-).*?-->", "", s2, flags=re.S)
s2 = re.sub(r"(<style[^>]*>)(.*?)</style>", lambda m: m.group(1) + re.sub(r"/\*.*?\*/", "", m.group(2), flags=re.S) + "</style>", s2, flags=re.S)
open(path, "w", encoding="utf-8").write(s2)
print(len(s), "->", len(s2))

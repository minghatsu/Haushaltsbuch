const { app, BrowserWindow, WebContentsView, protocol, ipcMain, shell, Menu, Tray, Notification, nativeImage, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

const APP_URL = "app://haushaltsbuch/index.html";
const BUNDLED = path.join(__dirname, "app.html");
const SMOKE = process.argv.includes("--smoke");
if (SMOKE) app.setPath("userData", path.join(app.getPath("temp"), "haushaltsbuch-smoke-" + process.pid));
else app.setPath("userData", path.join(app.getPath("appData"), "Haushaltsbuch"));

const cachedFile = () => path.join(app.getPath("userData"), "app.html");
const windowFile = () => path.join(app.getPath("userData"), "fenster.json");

const crypto = require("crypto");
const UPDATE_KEY = crypto.createPublicKey({ key: Buffer.from("MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWc6eJAgFbzrfP4Smmawd8Iv5ApsSFtZXDcZ4odJm/NDemZmJ1c6KQt4h+Jn6e+5KhGaXm6EIuf0jWIHZUtHptQ==", "base64"), format: "der", type: "spki" });
function signedByBuild(html) {
  try {
    const s = String(html), at = s.lastIndexOf("\n<!--hb-sig:");
    if (at < 0 || s.length - at > 400) return false;
    const end = s.indexOf("-->", at);
    const sig = Buffer.from(s.slice(at + 12, end).trim(), "base64");
    return crypto.verify("sha256", Buffer.from(s.slice(0, at), "utf8"), UPDATE_KEY, sig);
  } catch (e) { return false; }
}
function versionOf(html) {
  const m = /name="hb-version" content="(\d+)"/.exec(String(html).slice(0, 4000));
  return m ? Number(m[1]) : 0;
}
function newestApp() {
  const bundled = fs.readFileSync(BUNDLED, "utf8");
  try {
    const cached = fs.readFileSync(cachedFile(), "utf8");
    if (!signedByBuild(cached)) { try { fs.unlinkSync(cachedFile()); } catch (e) {} return bundled; }
    if (versionOf(cached) > versionOf(bundled)) return cached;
  } catch (e) {}
  return bundled;
}

let win = null;
let tray = null, quitting = false;
const HIDDEN = process.argv.includes("--hidden");
const prefsFile = () => path.join(app.getPath("userData"), "pc.json");
function prefs() { try { return { tray: true, autostart: false, ...JSON.parse(fs.readFileSync(prefsFile(), "utf8")) }; } catch (e) { return { tray: true, autostart: false }; } }
function savePrefs(p) { try { fs.writeFileSync(prefsFile(), JSON.stringify(p)); } catch (e) {} applyPrefs(p); }
function applyPrefs(p) {
  if (SMOKE) return;
  try { app.setLoginItemSettings({ openAtLogin: !!p.autostart, args: ["--hidden"] }); } catch (e) {}
  if (p.tray && !tray) makeTray();
  if (!p.tray && tray) { tray.destroy(); tray = null; }
}
function showWin() { if (!win) createWindow(); else { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } }
function makeTray() {
  try {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "icon.png")).resize({ width: 16, height: 16 }));
    tray.setToolTip("Finanz MAMI");
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: "Finanz MAMI öffnen", click: showWin },
      { type: "separator" },
      { label: "Beenden", click: () => { quitting = true; app.quit(); } },
    ]));
    tray.on("click", showWin);
  } catch (e) { tray = null; }
}

/* Benachrichtigungen */
const notifyFile = () => path.join(app.getPath("userData"), "erinnerungen.json");
let planned = [];
function loadPlanned() { try { planned = JSON.parse(fs.readFileSync(notifyFile(), "utf8")) || []; } catch (e) { planned = []; } }
function savePlanned() { try { fs.writeFileSync(notifyFile(), JSON.stringify(planned)); } catch (e) {} }
function showNote(title, text) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: String(title || "Finanz MAMI"), body: String(text || ""), icon: path.join(__dirname, "icon.png") });
  n.on("click", showWin);
  n.show();
}
function checkPlanned() {
  const now = Date.now(), due = planned.filter((x) => x.at <= now);
  if (!due.length) return;
  planned = planned.filter((x) => x.at > now); savePlanned();
  for (const x of due.slice(-3)) if (now - x.at < 6 * 3600e3) showNote(x.title, x.text);
}

function loadBounds() {
  try {
    const b = JSON.parse(fs.readFileSync(windowFile(), "utf8"));
    if (b && b.width > 300 && b.height > 300) return b;
  } catch (e) {}
  return { width: 1280, height: 860 };
}
function saveBounds() {
  if (!win || SMOKE) return;
  try {
    fs.writeFileSync(windowFile(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() }));
  } catch (e) {}
}

const secureFile = () => path.join(app.getPath("userData"), "bildschirmschutz.json");
function secureOn() { try { return JSON.parse(fs.readFileSync(secureFile(), "utf8")).on !== false; } catch (e) { return true; } }
ipcMain.on("setSecure", (e, on) => { try { fs.writeFileSync(secureFile(), JSON.stringify({ on: !!on })); } catch (err) {} if (win) win.setContentProtection(!!on); });

function createWindow() {
  const b = loadBounds();
  win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    minWidth: 360, minHeight: 520,
    title: "Finanz MAMI",
    backgroundColor: "#F2F5F3",
    icon: path.join(__dirname, "icon.png"),
    show: !SMOKE && !HIDDEN,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  if (b.maximized) win.maximize();
  win.setContentProtection(secureOn());
  win.on("close", (e) => {
    saveBounds();
    if (pageView) { pageDestroy(); win.webContents.executeJavaScript("window.hbPageClose && window.hbPageClose()").catch(() => {}); }
    if (!quitting && !SMOKE && prefs().tray) { e.preventDefault(); win.hide(); }
  });
  win.on("closed", () => { pageDestroy(); win = null; });
  win.on("show", () => { if (!pageView) win.webContents.executeJavaScript("window.hbPageClose && window.hbPageClose()").catch(() => {}); });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|t\.me)\//i.test(url)) shell.openExternal(url);
    else if (/^https?:\/\//i.test(url)) pageRequest(url); else if (/^(mailto|tel):/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("app://")) { e.preventDefault(); if (/^https?:\/\//i.test(url)) pageRequest(url); else if (/^(mailto|tel):/i.test(url)) shell.openExternal(url); }
  });

  win.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    const ctrl = input.control || input.meta;
    if (input.key === "F5" || (ctrl && input.key.toLowerCase() === "r")) { win.webContents.reload(); e.preventDefault(); }
    else if (ctrl && (input.key === "+" || input.key === "=")) { win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5); e.preventDefault(); }
    else if (ctrl && input.key === "-") { win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5); e.preventDefault(); }
    else if (ctrl && input.key === "0") { win.webContents.setZoomLevel(0); e.preventDefault(); }
    else if (input.alt && input.key === "ArrowLeft") { goBack(); e.preventDefault(); }
  });
  win.on("app-command", (e, cmd) => { if (cmd === "browser-backward") goBack(); });
  win.webContents.on("focus", () => { lastFocus = "app"; });
  win.on("restore", () => { setTimeout(() => { try { if (lastFocus !== "page") win.webContents.focus(); } catch (err) {} }, 0); });
  win.on("focus", () => { setTimeout(() => { try {
    if (lastFocus === "page" && pageView && pageShown && pageView.getVisible() && !pageView.webContents.isDestroyed()) pageView.webContents.focus();
    else win.webContents.focus();
  } catch (err) {} }, 0); });

  win.webContents.on("did-start-navigation", (e) => { if (e.isMainFrame !== false && pageView && pageShown && !e.isSameDocument) { try { win.contentView.removeChildView(pageView); } catch (err) {} pageShown = false; pickOn = false; } });
  win.loadURL(APP_URL);
  if (SMOKE) runSmokeTest();
}

function goBack() {
  if (win) win.webContents.executeJavaScript("window.hbBack && window.hbBack()").catch(() => {});
}

/* Bridge (wie Android) */
ipcMain.on("saveFile", (e, name, text) => {
  try {
    const safe = String(name).replace(/[\\/:*?"<>|]/g, "_") || "haushaltsbuch.json";
    fs.writeFileSync(path.join(app.getPath("downloads"), safe), String(text), "utf8");
    e.returnValue = true;
  } catch (err) {
    e.returnValue = false;
  }
});

ipcMain.on("saveFileB64", (e, name, b64) => {
  try {
    const safe = String(name).replace(/[\\/:*?"<>|]/g, "_") || "datei.bin";
    fs.writeFileSync(path.join(app.getPath("downloads"), safe), Buffer.from(String(b64), "base64"));
    e.returnValue = true;
  } catch (err) {
    e.returnValue = false;
  }
});

ipcMain.on("printHtml", async (e, id, html, mode) => {
  const done = (ok, msg) => { if (!e.sender.isDestroyed()) e.sender.executeJavaScript(`window.hbPrintDone && window.hbPrintDone(${JSON.stringify(String(id))}, ${ok ? "true" : "false"}, ${JSON.stringify(String(msg || ""))})`).catch(() => {}); };
  let pw = null, file = "";
  try {
    pw = new BrowserWindow({ show: false, width: 900, height: 1200, webPreferences: { javascript: false, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    pw.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    pw.webContents.on("will-navigate", (ev) => ev.preventDefault());
    file = path.join(app.getPath("temp"), "finanz-mami-zettel-" + Date.now() + ".html");
    fs.writeFileSync(file, String(html), "utf8");
    await pw.loadFile(file);
    if (mode === "pdf") {
      const pdf = await pw.webContents.printToPDF({ pageSize: "A4", printBackground: true, margins: { marginType: "none" }, preferCSSPageSize: true });
      const d = new Date(), name = `Einkaufszettel-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.pdf`;
      const r = await dialog.showSaveDialog(win, { title: "Einkaufszettel als PDF speichern", defaultPath: path.join(app.getPath("downloads"), name), filters: [{ name: "PDF", extensions: ["pdf"] }] });
      if (r.canceled || !r.filePath) return done(false, "cancel");
      fs.writeFileSync(r.filePath, pdf);
      shell.openPath(r.filePath).catch(() => {});
      done(true, r.filePath);
    } else {
      await new Promise((res) => pw.webContents.print({ silent: false, printBackground: true }, (ok, why) => { done(ok, ok ? "" : (why === "cancelled" ? "cancel" : why || "")); res(); }));
    }
  } catch (err) { done(false, String((err && err.message) || err)); }
  finally { if (pw && !pw.isDestroyed()) pw.destroy(); if (file) { try { fs.unlinkSync(file); } catch (err) {} } }
});

ipcMain.on("autoBackup", (e, name, text, keep) => {
  try {
    const dir = path.join(app.getPath("documents"), "Haushaltsbuch-Backups");
    fs.mkdirSync(dir, { recursive: true });
    const safe = String(name).replace(/[\\/:*?"<>|]/g, "_");
    fs.writeFileSync(path.join(dir, safe), String(text), "utf8");
    const old = fs.readdirSync(dir).filter(f => /^haushaltsbuch-auto-.*\.json$/.test(f)).sort().reverse().slice(Math.max(1, keep || 8));
    for (const f of old) { try { fs.unlinkSync(path.join(dir, f)); } catch (err) {} }
    e.returnValue = dir;
  } catch (err) {
    e.returnValue = false;
  }
});

ipcMain.on("notifyNow", (e, title, text) => { showNote(title, text); });
ipcMain.on("notifySchedule", (e, json) => { try { const l = JSON.parse(String(json)); planned = Array.isArray(l) ? l.slice(0, 60) : []; savePlanned(); } catch (err) {} });
ipcMain.on("notifySettings", () => { shell.openExternal("ms-settings:notifications").catch(() => {}); });
ipcMain.on("pcPrefs", (e, json) => {
  if (json) { try { savePrefs({ ...prefs(), ...JSON.parse(String(json)) }); } catch (err) {} }
  e.returnValue = JSON.stringify(prefs());
});

ipcMain.on("saveApp", (e, html) => {
  try {
    html = String(html);
    if (!html.includes('id="loginBg"') || versionOf(html) <= versionOf(newestApp()) || !signedByBuild(html)) { e.returnValue = false; return; }
    const tmp = cachedFile() + ".tmp";
    fs.writeFileSync(tmp, html, "utf8");
    fs.renameSync(tmp, cachedFile());
    e.returnValue = true;
  } catch (err) {
    e.returnValue = false;
  }
});

ipcMain.on("reloadApp", () => { if (win) win.loadURL(APP_URL); });

/* Verschlüsselter Speicher */
let VAULT_KEY = null;
function vaultKey() {
  if (VAULT_KEY) return VAULT_KEY;
  const { safeStorage } = require("electron");
  if (!safeStorage.isEncryptionAvailable()) throw new Error("no safeStorage");
  const f = path.join(app.getPath("userData"), "tresor.bin");
  if (fs.existsSync(f)) VAULT_KEY = Buffer.from(safeStorage.decryptString(fs.readFileSync(f)), "base64");
  else { VAULT_KEY = crypto.randomBytes(32); fs.writeFileSync(f, safeStorage.encryptString(VAULT_KEY.toString("base64"))); }
  return VAULT_KEY;
}
ipcMain.on("seal", (e, text) => {
  try { const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", vaultKey(), iv);
    const ct = Buffer.concat([c.update(String(text), "utf8"), c.final(), c.getAuthTag()]);
    e.returnValue = "v1:" + Buffer.concat([iv, ct]).toString("base64"); } catch (err) { e.returnValue = ""; }
});
ipcMain.on("unseal", (e, sealed) => {
  try { const s = String(sealed); if (!s.startsWith("v1:")) throw new Error("fmt");
    const u = Buffer.from(s.slice(3), "base64"), d = crypto.createDecipheriv("aes-256-gcm", vaultKey(), u.subarray(0, 12));
    d.setAuthTag(u.subarray(u.length - 16));
    e.returnValue = Buffer.concat([d.update(u.subarray(12, u.length - 16)), d.final()]).toString("utf8"); } catch (err) { e.returnValue = "\u0000fail"; }
});
ipcMain.on("pbkdf2", (e, pin, salt, iter) => {
  try { e.returnValue = crypto.pbkdf2Sync(String(pin), String(salt), Math.max(1000, Math.min(Number(iter) || 0, 2000000)), 32, "sha256").toString("hex"); } catch (err) { e.returnValue = ""; }
});
function httpsPinned(req) {
  return new Promise((ok, bad) => {
    const u = new URL(req.url), tls = require("tls");
    if (u.protocol !== "https:" || !/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)[0-9.]+$/.test(u.hostname) || !/^[a-z0-9.-]+$/.test(req.certHost)) return bad(new Error("bad"));
    const headers = { "Content-Type": "application/json" }; if (req.auth) headers.Authorization = req.auth;
    const post = req.method === "POST", body = post ? Buffer.from(req.body || "", "utf8") : null; if (body) headers["Content-Length"] = body.length;
    const r = require("https").request(u, { method: post ? "POST" : "GET", headers, timeout: 30000, servername: req.certHost,
      checkServerIdentity: (h, cert) => tls.checkServerIdentity(req.certHost, cert) }, res => {
      const chunks = []; res.on("data", c => chunks.push(c)); res.on("end", () => ok({ status: res.statusCode, text: Buffer.concat(chunks).toString("utf8") }));
    });
    r.on("timeout", () => r.destroy(new Error("timeout"))); r.on("error", bad); if (body) r.write(body); r.end();
  });
}
function homeHost(h) { return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)[0-9.]+$/.test(h) || /^localhost$|\.local$|\.fritz\.box$|\.ts\.net$/i.test(h); }
ipcMain.on("copySecret", (e, text, sec) => {
  const { clipboard } = require("electron"); const t = String(text); clipboard.writeText(t);
  setTimeout(() => { try { if (clipboard.readText() === t) clipboard.writeText(""); } catch (err) {} }, Math.max(10, Math.min(Number(sec) || 60, 600)) * 1000);
});
ipcMain.on("http", async (e, req) => {
  let status = 0, text = "";
  try {
    if (!/^https?:\/\//i.test(req.url)) throw new Error("bad url");
    if (/^http:/i.test(req.url) && !homeHost(new URL(req.url).hostname)) throw new Error("http only at home");
    const headers = { "Content-Type": "application/json" };
    if (req.auth) headers.Authorization = req.auth;
    const post = req.method === "POST";
    if (req.certHost) { const p = await httpsPinned(req); status = p.status; text = p.text; }
    else {
      const r = await fetch(req.url, { method: post ? "POST" : "GET", headers, body: post ? req.body : undefined, signal: AbortSignal.timeout(30000) });
      status = r.status;
      text = await r.text();
    }
  } catch (err) {
    status = 0; text = "";
  }
  if (e.sender.isDestroyed()) return;
  e.sender.executeJavaScript(`window.hbHttpDone && window.hbHttpDone(${JSON.stringify(req.id)}, ${status}, ${JSON.stringify(text)})`).catch(() => {});
});

/* Selbst-Update */
function nativeRev() { try { return String(JSON.parse(fs.readFileSync(path.join(__dirname, "native.json"), "utf8")).rev || 0); } catch (e) { return "0"; } }
ipcMain.on("nativeRev", (e) => { e.returnValue = nativeRev(); });
ipcMain.on("ghFetch", async (e, req) => {
  let result = "", err = "";
  try {
    if (!String(req.url).startsWith("https://api.github.com/repos/minghatsu/")) throw new Error("Adresse nicht erlaubt");
    const json = req.kind === "json";
    const headers = { "User-Agent": "FinanzMAMI", Accept: json ? "application/vnd.github+json" : "application/octet-stream" };
    if (req.token) headers.Authorization = "Bearer " + req.token;
    let r = await fetch(req.url, { redirect: "manual", signal: AbortSignal.timeout(300000), headers });
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location");
      if (!loc || !loc.startsWith("https://")) throw new Error("Weiterleitung fehlt");
      r = await fetch(loc, { signal: AbortSignal.timeout(300000) });
    }
    if (r.status === 401 || r.status === 403) throw new Error("Update-Schlüssel ungültig oder abgelaufen");
    if (r.status !== 200) throw new Error("GitHub antwortet mit " + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (json) result = buf.toString("utf8");
    else if (req.kind === "app") {
      const html = buf.toString("utf8");
      if (!signedByBuild(html)) throw new Error("Signatur stimmt nicht");
      if (html.includes('id="loginBg"') && versionOf(html) > versionOf(newestApp())) {
        const tmp = cachedFile() + ".tmp"; fs.writeFileSync(tmp, html, "utf8"); fs.renameSync(tmp, cachedFile()); result = "saved";
      } else result = "same";
    } else if (req.kind === "exe") {
      if (buf.length < 1000000 || buf.subarray(0, 2).toString() !== "MZ") throw new Error("Download unvollständig");
      const f = path.join(app.getPath("temp"), "FinanzMAMI-Update.exe");
      fs.writeFileSync(f, buf);
      require("child_process").spawn(f, ["/S", "--force-run"], { detached: true, stdio: "ignore" }).unref();
      result = "installing";
      setTimeout(() => { quitting = true; app.quit(); }, 800);
    }
  } catch (x) { err = String((x && x.message) || x); }
  if (e.sender.isDestroyed()) return;
  e.sender.executeJavaScript(`window.hbGhDone && window.hbGhDone(${JSON.stringify(req.id)}, ${JSON.stringify(result)}, ${JSON.stringify(err)})`).catch(() => {});
});

ipcMain.on("fetchImage", async (e, req) => {
  let data = null;
  try {
    if (!/^https:\/\//i.test(req.url)) throw new Error("bad url");
    const r = await fetch(req.url, { signal: AbortSignal.timeout(15000) });
    const ct = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (r.ok && /^image\/[a-z0-9.+-]+$/.test(ct)) { const b = Buffer.from(await r.arrayBuffer()); if (b.length && b.length < 300000) data = "data:" + ct + ";base64," + b.toString("base64"); }
  } catch (err) { data = null; }
  if (e.sender.isDestroyed()) return;
  e.sender.executeJavaScript(`window.hbImgDone && window.hbImgDone(${JSON.stringify(req.id)}, ${JSON.stringify(data)})`).catch(() => {});
});

const WIA_JPEG = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}";
const SCAN_PS = `
$ErrorActionPreference = "Stop"
try {
  $dm = New-Object -ComObject WIA.DeviceManager
  $dev = $null
  foreach ($i in $dm.DeviceInfos) { if ($i.Type -eq 1) { $dev = $i.Connect(); break } }
  if (-not $dev) { Write-Output "ERR:noscanner"; exit }
  $item = $dev.Items.Item(1)
  foreach ($p in $item.Properties) {
    if ($p.PropertyID -eq 6147 -or $p.PropertyID -eq 6148) { try { $p.Value = 300 } catch {} }
    if ($p.PropertyID -eq 6146) { try { $p.Value = 1 } catch {} }
  }
  $img = $item.Transfer("${WIA_JPEG}")
  if ($img.FormatID -ne "${WIA_JPEG}") {
    $ip = New-Object -ComObject WIA.ImageProcess
    $ip.Filters.Add($ip.FilterInfos.Item("Convert").FilterID)
    $ip.Filters.Item(1).Properties.Item("FormatID").Value = "${WIA_JPEG}"
    $ip.Filters.Item(1).Properties.Item("Quality").Value = 90
    $img = $ip.Apply($img)
  }
  $f = Join-Path $env:TEMP ("fm-scan-" + [guid]::NewGuid().ToString() + ".jpg")
  $img.SaveFile($f)
  Write-Output ("OK:" + $f)
} catch { Write-Output ("ERR:" + $_.Exception.Message) }
`;
let scanBusy = false;
ipcMain.on("scan", (e, id) => {
  const done = (data, err) => { if (!e.sender.isDestroyed()) e.sender.executeJavaScript(`window.hbScanDone && window.hbScanDone(${JSON.stringify(String(id))}, ${JSON.stringify(data)}, ${JSON.stringify(err)})`).catch(() => {}); };
  if (process.platform !== "win32") return done(null, "Scannen geht nur unter Windows");
  if (scanBusy) return done(null, "Der Scanner arbeitet schon");
  scanBusy = true;
  const enc = Buffer.from(SCAN_PS, "utf16le").toString("base64");
  require("child_process").execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-ExecutionPolicy", "Bypass", "-EncodedCommand", enc],
    { timeout: 180000, windowsHide: true, maxBuffer: 1024 * 1024 }, (err, stdout) => {
      scanBusy = false;
      const out = String(stdout || "").trim().split(/\r?\n/).pop() || "";
      if (out.startsWith("OK:")) {
        const f = out.slice(3).trim();
        try { const b = fs.readFileSync(f); fs.unlink(f, () => {}); return done("data:image/jpeg;base64," + b.toString("base64"), ""); }
        catch (x) { return done(null, "Der Scan konnte nicht gelesen werden"); }
      }
      if (out === "ERR:noscanner") return done(null, "noscanner");
      done(null, out.startsWith("ERR:") ? out.slice(4) : (err ? String(err.message || err) : "Scannen hat nicht geklappt"));
    });
});

let pageView = null, pageShown = false, pageBase = "", pageFirst = false;
let pageEditing = false;
function pageDestroy() {
  const v = pageView; pageView = null; pageShown = false; pickOn = false; pageBase = ""; pickCssKey = null;
  if (!v) return;
  try { if (win && !win.isDestroyed()) win.contentView.removeChildView(v); } catch (e) {}
  try { if (!v.webContents.isDestroyed()) v.webContents.close(); } catch (e) {}
}
let pickOn = false, pickMode = "", lastFocus = "app";
const PICK_JS = String.raw`(() => {
  const W = window; if (W.__hbPick) return W.__hbPick;
  const TOP = W === W.top;
  const PR = /(\d{1,4})\s*[.,]\s*(\d{2})(?![\d.]\d|\.(?!\d)|\d|\s?(?:gbit|mbit|gb|tb|mb|mah|ghz|mhz|hz|zoll|cm|mm|kg|ml|kw|w|v|l|m|g)\b|\s?%)|[-–]\s*[.,]\s*(\d{2})(?!\d)|(\d{1,4})\s*[.,]\s*[-–]/i;
  const BAD = /^(uvp|statt|je |grundpreis|1 ?kg|100 ?g|1 ?l |\d+ ?%|-?\d+ ?%|ab |nur |aktion|angebot|knaller|neu|online|in den warenkorb|merken|details|zum angebot|mehr|versch\.|verschiedene|auch |inkl|versand|lieferung|markt ausw|jetzt |spare |bewert|\d+ bewertung)|:$/i;
  const txt = (e) => (e && (e.innerText || e.textContent) || "").replace(/ /g, " ").trim();
  const PRG = new RegExp(PR.source, "g");
  const UNIT = /(=|zzgl|pfand|uvp|statt|grundpreis|sparst|ersparnis|spare |rabatt|vorher|bisher|ursprüngl|\bje\b|\(1|pro\s|€\s?\/|\/\s?(kg|l|st|stk|stück|m|m²|qm|lfm|100 ?g|100 ?ml)\b)/i;
  const FILL = /\b(aktion|knaller|angebot|angebote|preis|statt|uvp|nur|ab|je|neu|top|deal|super|sale|rabatt|bonus|coupon|app|payback|auch|alkoholfrei)\b|€/gi;
  const nameish = (t) => /[a-zäöüß]{4}/i.test(String(t).replace(PRG, " ").replace(FILL, " "));
  const fs = (e) => { try { return parseFloat(getComputedStyle(e).fontSize) || 0; } catch (x) { return 0; } };
  const maxFs = (e) => { let m = fs(e); for (const k of e.querySelectorAll("*")) m = Math.max(m, fs(k)); return m; };
  function hasPrice(e) { return PR.test(txt(e)) || !!e.querySelector("[itemprop=price],[class*=price i],[class*=preis i],[data-price]"); }
  function valOf(e) {
    const it = e.matches && e.matches("[itemprop=price]") ? e : null; if (it) { const v = parseFloat(String(it.getAttribute("content") || txt(it)).replace(",", ".")); if (v > 0) return v; }
    const t = txt(e).replace(/\s+/g, " "); const m = price(t); if (m != null) return m;
    const CENT = /(^|[-_\s])(cents?|decimals?|fraction(al)?|nachkomma)([-_\s]|$)/i;
    const sup = [...e.querySelectorAll("*")].find((k) => k.matches("sup,small") || CENT.test(String(k.className || "")) || CENT.test(k.getAttribute("data-testid") || ""));
    if (sup && /^\d{2}$/.test(txt(sup).replace(/[^\d]/g, ""))) { const w = t.replace(txt(sup), "").replace(/[^\d]/g, ""); if (w.length <= 4 && (w || /[-–.,]/.test(t))) return Number((w || "0") + "." + txt(sup).replace(/[^\d]/g, "")); }
    return null;
  }
  function cardPrice(c) {
    const it = c.querySelector("[itemprop=price]"); if (it) { const v = valOf(it); if (v) return v; }
    const own = (p) => p ? [...p.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(" ") : "";
    const els = [c, ...c.querySelectorAll("*")].filter((e) => { const t = txt(e); return t && t.length <= 24 && !UNIT.test(t) && !UNIT.test(own(e.parentElement)); });
    let best = null;
    const app = (e) => { for (let x = e, i = 0; x && x !== c && i < 3; i++, x = x.parentElement) if (/\bapp\b/i.test(txt(x)) && txt(x).length < 30) return true; return false; };
    const struck = (e) => { for (let x = e, i = 0; x && i < 4; i++, x = x.parentElement) { if (x.matches("s,del,strike")) return true; try { if (/line-through/.test(getComputedStyle(x).textDecorationLine)) return true; } catch (z) {} if (x === c) break; } return false; };
    for (const e of els) { if (struck(e)) continue; const v = valOf(e); if (!(v > 0 && v < 100000)) continue; const f = maxFs(e), r = e.getBoundingClientRect(), a = app(e) ? 1 : 0;
      if (!best || a < best.app || (a === best.app && (f > best.f + 0.5 || (Math.abs(f - best.f) <= 0.5 && r.width * r.height < best.a)))) best = { v, f, a: r.width * r.height, app: a }; }
    if (best) return best.v;
    const all = txt(c).split(/\n+/).filter((l) => !UNIT.test(l)).join("\n"); return price(all);
  }
  function cardName(c) {
    let best = null;
    const clean = (t) => String(t || "").replace(/\s+/g, " ").trim().replace(/[:\s,(*¹⁴⁵⁶⁷⁸⁹⁰†]+$/, "").replace(/^[^A-Za-zÄÖÜäöü0-9"„]+/, "");
    const ok = (t) => !(t.length < 3 || t.length > 90 || PR.test(t) || UNIT.test(t) || BAD.test(t) || /bewertung|rezension|sternen?\b|bitte w(ä|ae)hle|entdecken|alle anzeigen|mehr erfahren|zum produkt/i.test(t) || !nameish(t));
    const consider = (t, f) => { t = clean(t); if (!ok(t)) return; if (!best || f > best.f + 0.5) best = { t, f }; };
    const all = [];
    const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) { const pe = n.parentElement; if (!pe) continue; const st = getComputedStyle(pe); if (st.display === "none" || st.visibility === "hidden") continue;
      const pr = pe.getBoundingClientRect(); if (pr.width < 3 || pr.height < 3) continue;
      const t = clean(n.nodeValue); if (!t) continue; all.push({ t, f: fs(pe) }); consider(t, fs(pe)); }
    if (best && best.t.length <= 24) { const i = all.findIndex((a) => a.t === best.t && Math.abs(a.f - best.f) < 0.01), nx = all[i + 1];
      if (nx && Math.abs(nx.f - best.f) <= 0.5 && ok(nx.t) && best.t.length + nx.t.length < 90) best = { t: best.t + " " + nx.t, f: best.f }; }
    if (!best) { let e = c; for (let i = 0; e && i < 3 && !best; i++, e = e.parentElement) { const img = e.querySelector("img[alt]"); if (img) consider(img.alt, 0); } }
    return best ? best.t.replace(/\s+,/g, ",").replace(/(\.\.\.|…)$/, "").trim() : "";
  }
  const alike = (a, b) => { if (a.tagName !== b.tagName) return false; const ca = String(a.className || "").split(/\s+/).filter(Boolean), cb = String(b.className || "").split(/\s+/).filter(Boolean);
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), sim = (x, y) => Math.abs(x - y) <= Math.max(x, y) * 0.3 + 2;
    if ((ca.length || cb.length) && !ca.some((x) => cb.includes(x))) return false;
    return sim(ra.height, rb.height) && (sim(ra.width, rb.width) || (Math.abs(ra.top - rb.top) < 12 && Math.abs(ra.left - rb.left) > 20)); };
  const isList = (e) => { const ks = [...e.children].filter((k) => { const kt = txt(k); return kt.length > 12 && hasPrice(k) && nameish(kt); });
    if (ks.length >= 3) return ks.filter((k) => k.querySelector("img,picture")).length >= 3 || ks.some((k) => ks.some((o) => o !== k && alike(k, o)));
    return ks.length === 2 && alike(ks[0], ks[1]) && ks.every((k) => k.querySelector("img,picture,canvas,svg") || hasBg(k)); };
  function whole(e) {
    const vw = innerWidth * innerHeight;
    while (e.parentElement && e.parentElement !== document.body && e.parentElement !== document.documentElement) {
      const p = e.parentElement, r = p.getBoundingClientRect();
      if (isList(p) || txt(p).length > 900 || r.width * r.height > vw * 0.6) break;
      e = p;
    }
    return e;
  }
  const hasBg = (e) => { try { const b = getComputedStyle(e).backgroundImage; return b && b !== "none" && /url\(/.test(b); } catch (x) { return false; } };
  const pics = (e) => e.querySelectorAll("img,picture,canvas,svg image").length + (hasBg(e) ? 1 : 0);
  function imgBox(el) {
    let e = el && el.nodeType === 1 ? el : el && el.parentElement;
    for (let i = 0; e && i < 6 && !(e.matches("img,picture,canvas") || hasBg(e)); i++) e = e.parentElement;
    if (!e || e === document.body || e === document.documentElement) return null;
    const vw = innerWidth * innerHeight, r0 = e.getBoundingClientRect(); if (r0.width < 60 || r0.height < 40 || r0.width * r0.height > vw * 0.7) return null;
    while (e.parentElement && e.parentElement !== document.body && e.parentElement !== document.documentElement) {
      const p = e.parentElement, r = p.getBoundingClientRect();
      if (pics(p) > Math.max(1, pics(e)) || r.width * r.height > vw * 0.6 || txt(p).length > 300) break;
      e = p;
    }
    return e;
  }
  function cand(el) {
    let e = el && el.nodeType === 1 ? el : el && el.parentElement, priceOnly = null;
    for (let i = 0; e && e !== document.body && e !== document.documentElement && i < 14; i++, e = e.parentElement) {
      const t = txt(e); if (t.length > 900) break;
      if (isList(e)) break;
      if (!hasPrice(e)) continue;
      const r = e.getBoundingClientRect(); if (r.width < 50 || r.height < 24) continue;
      if (nameish(t)) return whole(e);
      if (!priceOnly) priceOnly = e;
    }
    return priceOnly;
  }
  function price(t) { const m = String(t).match(PR); if (!m) return null; if (m[1]) return Number(m[1] + "." + m[2]); if (m[3]) return Number("0." + m[3]); if (m[4]) return Number(m[4]); return null; }
  function read(c) {
    const t = txt(c);
    const u = t.match(/(?:bis|gültig bis)\s*(?:[a-z]{2,10}\.?,?\s*)?(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/i);
    const r = c.getBoundingClientRect();
    return { name: cardName(c).slice(0, 60), price: cardPrice(c), until: u ? { d: +u[1], m: +u[2], y: u[3] ? +u[3] : 0 } : null, rect: TOP ? { x: r.left, y: r.top, w: r.width, h: r.height } : null };
  }
  let hov = null, hovOld = "", mode = "", box = null, layer = null, sx = 0, sy = 0, skip = false;
  const send = (o) => console.log("__HBPICK__" + JSON.stringify(o));
  function mark(c) { if (hov === c) return; if (hov) hov.style.cssText = hovOld; hov = c; if (c) { hovOld = c.style.cssText; c.style.setProperty("outline", "3px solid #1a7a5c", "important"); c.style.setProperty("outline-offset", "2px", "important"); c.style.setProperty("box-shadow", "0 10px 30px rgba(26,122,92,.35)", "important"); } }
  function over(e) { if (mode === "pick") mark(cand(e.target) || (TOP ? imgBox(e.target) : null)); }
  function stop(e) { if (!mode) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
  function click(e) {
    if (mode !== "pick") return; stop(e);
    if (skip) { skip = false; return; }
    const c = cand(e.target);
    const photo = (b) => { mark(null); const r = b.getBoundingClientRect(); if (b.animate) b.animate([{ transform: "scale(1)" }, { transform: "scale(.95)" }, { transform: "scale(1)" }], { duration: 420 });
      setTimeout(() => send({ lasso: { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, innerWidth - Math.max(0, r.left)), h: Math.min(r.height, innerHeight - Math.max(0, r.top)) } }), 450); };
    if (!c) { const b = TOP ? imgBox(e.target) : null; if (b) return photo(b); return send({ fail: true, why: "nocard", tag: e.target && e.target.tagName }); }
    const r = read(c);
    if (!r.price || !r.name) { const b = TOP ? (imgBox(e.target) || c) : null; if (b && !r.price) return photo(b); }
    if (c.animate) c.animate([{ transform: "scale(1)" }, { transform: "scale(.95)" }, { transform: "scale(1)" }], { duration: 420 });
    if (!r.price || !r.name) return send({ fail: true, why: "noprice", partial: r });
    send(r);
  }
  function cursor(on) { document.documentElement.style.setProperty("cursor", on ? "copy" : "", on ? "important" : ""); if (document.body) document.body.style.setProperty("cursor", on ? "copy" : "", on ? "important" : ""); }
  function lassoOn() {
    if (!TOP || layer) return;
    layer = document.createElement("div");
    layer.style.cssText = "position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:rgba(194,124,14,.06)";
    const tip = document.createElement("div"); tip.textContent = "Zieh einen Rahmen um das Angebot";
    tip.style.cssText = "position:fixed;left:50%;top:14px;transform:translateX(-50%);background:#c27c0e;color:#fff;font:700 14px system-ui,sans-serif;padding:8px 16px;border-radius:12px;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.2)";
    layer.appendChild(tip);
    layer.addEventListener("pointerdown", (e) => { e.preventDefault(); tip.style.display = "none"; sx = e.clientX; sy = e.clientY; box = document.createElement("div");
      box.style.cssText = "position:fixed;z-index:2147483647;border:2.5px dashed #1a7a5c;background:rgba(26,122,92,.10);border-radius:10px;pointer-events:none";
      document.documentElement.appendChild(box); layer.setPointerCapture(e.pointerId); move(e); });
    layer.addEventListener("pointermove", move);
    layer.addEventListener("pointerup", (e) => { if (!box) return; const r = box.getBoundingClientRect(); box.remove(); box = null; skip = true; setTimeout(() => { skip = false; }, 400);
      if (r.width < 20 || r.height < 14) return; set("pick"); send({ lasso: { x: r.left, y: r.top, w: r.width, h: r.height } }); });
    document.documentElement.appendChild(layer);
  }
  function move(e) { if (!box) return; const x = Math.min(sx, e.clientX), y = Math.min(sy, e.clientY); Object.assign(box.style, { left: x + "px", top: y + "px", width: Math.abs(e.clientX - sx) + "px", height: Math.abs(e.clientY - sy) + "px" }); }
  function set(m) { mode = m; cursor(m === "pick"); if (m !== "pick") mark(null); if (m === "lasso") lassoOn(); else if (layer) { layer.remove(); layer = null; } }
  ["click", "auxclick", "dblclick", "contextmenu"].forEach((t) => W.addEventListener(t, t === "click" ? click : stop, true));
  W.addEventListener("mouseover", over, true);
  ["pointerdown", "mousedown", "touchstart"].forEach((t) => W.addEventListener(t, (e) => { if (mode === "pick") stop(e); }, { capture: true, passive: false }));
  W.__hbPick = { set, test: { cand, read, imgBox } };
  return W.__hbPick;
})()`;
const PICK_CSS = "html,html *{cursor:copy!important}";
let pickCssKey = null;
let pickSrc = "";
let pickOffAt = 0;
async function pickSet(mode) {
  if (!pageView) return; if (pickOn && !mode) pickOffAt = Date.now(); pickOn = !!mode; pickMode = mode || "";
  const wc = pageView.webContents, call = (pickSrc || PICK_JS) + `.set(${JSON.stringify(mode || "")})`;
  try { if (pickCssKey) { await wc.removeInsertedCSS(pickCssKey); pickCssKey = null; } if (mode === "pick") pickCssKey = await wc.insertCSS(PICK_CSS); } catch (e) {}
  wc.executeJavaScriptInIsolatedWorld(1999, [{ code: call }]).catch(() => {});
  try { for (const f of wc.mainFrame.framesInSubtree) if (f !== wc.mainFrame) f.executeJavaScript(call).catch(() => {}); } catch (e) {}
}
ipcMain.on("pagePick", (e, mode, src) => { if (typeof src === "string" && src.length > 200 && src.length < 200000 && /^\(\(\) => \{/.test(src.trim())) pickSrc = src.trim(); pickSet(mode === "pick" || mode === "lasso" ? mode : ""); });
const OCR_PS = String.raw`
$ErrorActionPreference = "Stop"
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
  $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics, ContentType = WindowsRuntime]
  $null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
  $null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` + "`" + String.raw`1' })[0]
  function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait() | Out-Null; $task.Result }
  $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($env:HB_OCR_FILE)) ([Windows.Storage.StorageFile])
  $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bmp = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $eng = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if ($eng -eq $null) { try { $eng = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new("de-DE")) } catch {} }
  if ($eng -eq $null) { throw "Keine Texterkennung in Windows installiert" }
  $res = Await ($eng.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
  $out = @()
  foreach ($l in $res.Lines) { $h = 0; foreach ($w in $l.Words) { if ($w.BoundingRect.Height -gt $h) { $h = $w.BoundingRect.Height } }; $out += @{ t = $l.Text; h = [math]::Round($h) } }
  $stream.Dispose()
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Write-Output ("OK:" + (ConvertTo-Json -Compress -InputObject @($out)))
} catch { Write-Output ("ERR:" + $_.Exception.Message) }
`;
let lastOcrErr = "";
function winOcr(png) {
  return new Promise((ok) => {
    if (process.platform !== "win32") return ok(null);
    const f = path.join(app.getPath("temp"), "hb-pick-" + Date.now() + ".png");
    try { fs.writeFileSync(f, png); } catch (e) { return ok(null); }
    const enc = Buffer.from(OCR_PS, "utf16le").toString("base64");
    require("child_process").execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", enc],
      { timeout: 30000, windowsHide: true, maxBuffer: 1024 * 1024, env: { ...process.env, HB_OCR_FILE: f } }, (err, stdout) => {
        fs.unlink(f, () => {});
        const out = String(stdout || "").trim().split(/\r?\n/).pop() || "";
        if (out.startsWith("OK:")) { try { const a = JSON.parse(out.slice(3)); return ok(Array.isArray(a) ? a : [a]); } catch (e) {} }
        lastOcrErr = out.startsWith("ERR:") ? out.slice(4) : String(err && err.message || "keine Antwort");
        ok(null);
      });
  });
}
function badgeLines(b, W, H) {
  const N = W * H, col = new Uint8Array(N), wht = new Uint8Array(N);
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    const B = b[p], G = b[p + 1], R = b[p + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B), lum = 0.299 * R + 0.587 * G + 0.114 * B;
    if (mx - mn > 90 && mx > 120) col[i] = 1; else if (lum > 200 && mx - mn < 45) wht[i] = 1;
  }
  function comps(mask, x0, y0, w, h, minA) {
    const seen = new Uint8Array(w * h), out = [], st = [];
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const k = yy * w + xx; if (seen[k] || !mask[(y0 + yy) * W + x0 + xx]) continue;
      let minx = xx, maxx = xx, miny = yy, maxy = yy, a = 0; const px = []; seen[k] = 1; st.push(k);
      while (st.length) { const q = st.pop(), qx = q % w, qy = (q - qx) / w; a++; px.push(q);
        if (qx < minx) minx = qx; if (qx > maxx) maxx = qx; if (qy < miny) miny = qy; if (qy > maxy) maxy = qy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const nk = ny * w + nx; if (!seen[nk] && mask[(y0 + ny) * W + x0 + nx]) { seen[nk] = 1; st.push(nk); } } }
      if (a >= minA) out.push({ x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1, a, px });
    }
    return out;
  }
  const res = [];
  for (const c of comps(col, 0, 0, W, H, Math.max(60, N * 0.004))) {
    if (c.a > N * 0.25 || c.w / c.h < 0.5 || c.w / c.h > 2) continue;
    const ink = comps(wht, c.x, c.y, c.w, c.h, 20).filter((g) => g.x > 0 && g.y > 0 && g.x + g.w < c.w && g.y + g.h < c.h);
    if (!ink.length) continue;
    const Hm = Math.max(...ink.map((g) => g.h)); if (Hm < 10) continue;
    const big = ink.filter((g) => g.h >= 0.75 * Hm).sort((p, q) => p.x - q.x); if (!big.length) continue;
    const top = Math.min(...big.map((g) => g.y)), bot = Math.max(...big.map((g) => g.y + g.h));
    const small = ink.filter((g) => g.h >= 0.35 * Hm && g.h < 0.75 * Hm && g.y < top + 0.5 * Hm && g.y + g.h <= bot && g.x > big[0].x).sort((p, q) => p.x - q.x);
    const parts = [...big.map((g) => ({ g, s: 1 })), ...(small.length ? [{ dot: 1 }] : []), ...small.map((g) => ({ g, s: Hm / g.h }))];
    const gap = Math.round(Hm * 0.12), pad = Math.round(Hm * 0.4);
    let Wd = pad * 2; for (const p of parts) Wd += (p.dot ? Math.round(Hm * 0.25) : Math.round(p.g.w * p.s)) + gap;
    const Hd = Hm + pad * 2, d = Buffer.alloc(Wd * Hd * 4, 255); let x = pad;
    for (const p of parts) {
      if (p.dot) { const r = Math.max(2, Math.round(Hm * 0.09)); for (let yy = Hd - pad - 2 * r; yy < Hd - pad; yy++) for (let xx = x; xx < x + 2 * r; xx++) { const o = (yy * Wd + xx) * 4; d[o] = d[o + 1] = d[o + 2] = 0; } x += Math.round(Hm * 0.25) + gap; continue; }
      const g = p.g, gw = Math.round(g.w * p.s), gh = Math.round(g.h * p.s), set = new Uint8Array(g.w * g.h);
      for (const q of g.px) { const qx = q % c.w - g.x, qy = (q - q % c.w) / c.w - g.y; set[qy * g.w + qx] = 1; }
      for (let yy = 0; yy < gh; yy++) for (let xx = 0; xx < gw; xx++) {
        if (!set[Math.min(g.h - 1, Math.floor(yy / p.s)) * g.w + Math.min(g.w - 1, Math.floor(xx / p.s))]) continue;
        const o = ((pad + Hm - gh + yy) * Wd + x + xx) * 4; d[o] = d[o + 1] = d[o + 2] = 0; }
      x += gw + gap;
    }
    res.push({ w: Wd, h: Hd, data: d, cents: small.length, euros: big.length, size: Hm });
  }
  return res;
}
function badgePicture(img) {
  const { width, height } = img.getSize(), list = badgeLines(img.toBitmap(), width, height).sort((p, q) => q.size - p.size).slice(0, 5);
  if (!list.length) return null;
  const W = Math.max(...list.map((x) => x.w)), sp = 30, H = list.reduce((a, x) => a + x.h + sp, sp), o = Buffer.alloc(W * H * 4, 255);
  let y = sp; for (const x of list) { for (let r = 0; r < x.h; r++) x.data.copy(o, ((y + r) * W) * 4, r * x.w * 4, (r + 1) * x.w * 4); y += x.h + sp; }
  return nativeImage.createFromBitmap(o, { width: W, height: H }).toPNG();
}
function whiteToBlack(img) {
  const { width, height } = img.getSize(), b = img.toBitmap(), o = Buffer.alloc(b.length);
  for (let i = 0; i < b.length; i += 4) {
    const B = b[i], G = b[i + 1], R = b[i + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B), lum = 0.299 * R + 0.587 * G + 0.114 * B;
    const v = lum > 200 && mx - mn < 45 ? 0 : 255; o[i] = o[i + 1] = o[i + 2] = v; o[i + 3] = 255;
  }
  return nativeImage.createFromBitmap(o, { width, height }).toPNG();
}
function pickResult(o) {
  if (!win || win.isDestroyed()) return;
  const out = (x) => win.webContents.executeJavaScript(`window.hbPagePick && window.hbPagePick(${JSON.stringify(x)})`).catch(() => {});
  if (o && o.lasso && pageView) {
    const r = o.lasso, z = pageView.webContents.getZoomFactor();
    out({ reading: true });
    pageView.webContents.capturePage({ x: Math.max(0, Math.round(r.x * z)), y: Math.max(0, Math.round(r.y * z)), width: Math.max(1, Math.round(r.w * z)), height: Math.max(1, Math.round(r.h * z)) })
      .then(async (img) => {
        const sz = img.getSize(), big = sz.width < 900 ? img.resize({ width: sz.width * 2, quality: "best" }) : img;
        const lines = await winOcr(big.toPNG());
        let white = null; try { white = await winOcr(whiteToBlack(big)); } catch (err) {}
        let badges = null; try { const bp = badgePicture(img); if (bp) badges = await winOcr(bp); } catch (err) {}
        const all = (lines || []).concat((white || []).map((l) => ({ ...l, w: 1 })));
        out({ img: img.toDataURL(), badges: (badges || []).map((l) => l.t), lines: (lines || white) ? all : null, ocrErr: (lines || white) ? "" : lastOcrErr, rect: r });
      }).catch(() => out({ fail: true, lassoFailed: true }));
    return;
  }
  out(o);
}

function baseOf(u) {
  try { const h = new URL(u).hostname.toLowerCase().replace(/\.$/, ""), p = h.split(".");
    const two = /^(co|com|org|net|gov|ac)\.[a-z]{2}$/.test(p.slice(-2).join(".")); return p.slice(two ? -3 : -2).join("."); } catch (e) { return ""; }
}
function pageAllowed(u) {
  if (/^about:blank$/i.test(u)) return true;
  if (!/^https:\/\//i.test(u)) return false;
  return !!pageBase && baseOf(u) === pageBase;
}
let blockedAt = 0;
function pageBlocked() { if (Date.now() - blockedAt < 1500 || !win || win.isDestroyed()) return; blockedAt = Date.now(); win.webContents.executeJavaScript("window.hbPageBlocked && window.hbPageBlocked()").catch(() => {}); }
function pageRequest(url) { if (win && !win.isDestroyed()) win.webContents.executeJavaScript(`window.hbPageRequest && window.hbPageRequest(${JSON.stringify(String(url))})`).catch(() => shell.openExternal(url)); }
function pageSend() {
  if (!win || win.isDestroyed() || !pageView) return;
  const wc = pageView.webContents, nh = wc.navigationHistory;
  const st = { url: wc.getURL(), title: wc.getTitle(), back: nh ? nh.canGoBack() : wc.canGoBack(), fwd: nh ? nh.canGoForward() : wc.canGoForward(), loading: wc.isLoading() };
  win.webContents.executeJavaScript(`window.hbPageState && window.hbPageState(${JSON.stringify(st)})`).catch(() => {});
}
function pageMake() {
  if (pageView) return pageView;
  pageEditing = false;
  pageView = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: "persist:seiten" } });
  pageView.webContents.on("focus", () => { lastFocus = "page"; });
  pageView.setBorderRadius && pageView.setBorderRadius(0);
  const wc = pageView.webContents;
  wc.setWindowOpenHandler(({ url }) => { if (pageAllowed(url)) wc.loadURL(url); else pageBlocked(); return { action: "deny" }; });
  wc.on("will-navigate", (e, url) => { if (!pageAllowed(url)) { e.preventDefault(); pageBlocked(); } });
  wc.on("will-redirect", (e, url) => { if (pageAllowed(url)) return; if (pageFirst && /^https:\/\//i.test(url)) { pageBase = baseOf(url); return; } e.preventDefault(); pageBlocked(); });
  wc.on("did-stop-loading", () => { pageFirst = false; });
  wc.on("did-fail-load", (e, code, desc, url, isMain) => {
    if (!isMain || code === -3 || !win || win.isDestroyed()) return;
    pageView.setVisible(false);
    win.webContents.executeJavaScript(`window.hbPageError && window.hbPageError(${JSON.stringify(String(desc || code))})`).catch(() => {});
  });
  wc.on("did-start-loading", () => { if (pageShown) pageView.setVisible(true); });
  wc.on("will-frame-navigate", (e) => { if (e.isMainFrame && !pageAllowed(e.url)) { e.preventDefault(); pageBlocked(); } });
  ["did-start-loading", "did-stop-loading", "did-navigate", "did-navigate-in-page", "page-title-updated"].forEach((ev) => wc.on(ev, pageSend));
  wc.on("did-navigate", () => { if (pickOn) setTimeout(() => pickSet(pickMode || "pick"), 400); });
  wc.on("did-frame-finish-load", (e, isMain) => { if (pickOn && !isMain) pickSet(pickMode || "pick"); });
  wc.on("console-message", (...a) => { const ev = a[0], msg = ev && typeof ev.message === "string" ? ev.message : a[2];
    if (typeof msg === "string" && msg.startsWith("__HBEDIT__")) { pageEditing = msg.slice(10) === "1"; return; }
    if ((pickOn || Date.now() - pickOffAt < 3000) && typeof msg === "string" && msg.startsWith("__HBPICK__")) { try { pickResult(JSON.parse(msg.slice(10))); } catch (err) {} } });
  wc.on("dom-ready", () => { pageEditing = false; wc.executeJavaScript(`(()=>{ const f=()=>{ const a=document.activeElement; console.log("__HBEDIT__"+(a&&(a.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))?"1":"0")); }; addEventListener("focusin",f,true); addEventListener("focusout",()=>setTimeout(f,0),true); })()`).catch(() => {}); });
  wc.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "Escape") { e.preventDefault(); win.webContents.executeJavaScript(pickOn ? "window.hbPagePickOff && window.hbPagePickOff()" : "window.hbPageClose && window.hbPageClose()").catch(() => {}); }
    else if (input.alt && input.key === "ArrowLeft") { e.preventDefault(); if (wc.canGoBack()) wc.goBack(); }
    else if ((input.key === "ArrowLeft" || input.key === "ArrowRight") && !input.alt && !input.control && !input.meta && !input.shift && !pageEditing) {
      e.preventDefault(); win.webContents.executeJavaScript(`window.pcStep && window.pcStep(${input.key === "ArrowRight" ? 1 : -1})`).catch(() => {}); }
    else if (input.key === "F5") { e.preventDefault(); wc.reload(); }
  });
  wc.on("render-process-gone", () => { try { win.contentView.removeChildView(pageView); } catch (e) {} pageView = null; pageShown = false; });
  return pageView;
}
function pageRect(r) { const z = win.webContents.getZoomFactor(); return { x: Math.round(r.x * z), y: Math.round(r.y * z), width: Math.max(1, Math.round(r.w * z)), height: Math.max(1, Math.round(r.h * z)) }; }
ipcMain.on("pageOpen", (e, url, r) => {
  if (!win || !/^https:\/\//i.test(url)) return;
  pageBase = baseOf(url); pageFirst = true;
  const v = pageMake();
  if (!pageShown) { win.contentView.addChildView(v); pageShown = true; }
  if (r) v.setBounds(pageRect(r));
  v.setVisible(true);
  if (v.webContents.getURL() !== url) v.webContents.loadURL(url).catch(() => {});
  pageSend();
});
ipcMain.on("pageBounds", (e, r) => { if (pageView && pageShown && r) pageView.setBounds(pageRect(r)); });
ipcMain.on("pageShow", (e, on) => { if (pageView && pageShown) pageView.setVisible(!!on); if (!on && win){ lastFocus = "app"; win.webContents.focus(); } });
ipcMain.on("pageNav", (e, cmd) => {
  if (!pageView) return; const wc = pageView.webContents;
  if (cmd === "back" && wc.canGoBack()) wc.goBack();
  else if (cmd === "fwd" && wc.canGoForward()) wc.goForward();
  else if (cmd === "reload") wc.reload();
  else if (cmd === "external") { const u = wc.getURL(); if (/^https?:\/\//i.test(u)) shell.openExternal(u); }
  else if (cmd === "close") { pickOn = false; try { win.contentView.removeChildView(pageView); } catch (err) {} pageShown = false; pageBase = ""; wc.loadURL("about:blank").catch(() => {}); lastFocus = "app"; try { win.webContents.focus(); } catch (err) {} }
});
ipcMain.on("openInApp", (e, url) => { if (/^https:\/\//i.test(url)) pageRequest(url); });

/* Smoke-Test */
function runSmokeTest() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const js = (code) => win.webContents.executeJavaScript(code);
  const result = {};
  const done = (ok) => { console.log("SMOKE " + JSON.stringify(result)); app.exit(ok ? 0 : 1); };
  setTimeout(() => { result.timeout = true; done(false); }, 60000);
  win.webContents.once("did-finish-load", async () => {
    try {
      await wait(1500);
      result.page = await js(`({login: !!document.getElementById("loginBg"), bridge: typeof window.AndroidBridge, version: (document.querySelector('meta[name="hb-version"]')||{}).content, urlField: !!(document.getElementById("loginUrlRow") && !document.getElementById("loginUrlRow").hidden)})`);
      const server = process.env.SMOKE_SERVER;
      if (server) {
        await js(`localStorage.setItem("haushaltsbuch-server", ${JSON.stringify(server)}); localStorage.removeItem("haushaltsbuch-sync-v1")`);
        win.webContents.reload();
        await new Promise((r) => win.webContents.once("did-finish-load", r));
        await wait(3000);
        result.title = await js(`document.getElementById("loginTitle").textContent`);
      }
      const ok = result.page.login && result.page.bridge === "object" && !!result.page.version && (!server || ["Geräte koppeln","Passwort festlegen"].includes(result.title));
      done(ok);
    } catch (err) {
      result.error = String(err);
      done(false);
    }
  });
}

/* Start */
if (!SMOKE && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showWin());
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    protocol.handle("app", (request) => {
      const u = new URL(request.url);
      if (u.pathname === "/" || u.pathname === "/index.html") {
        return new Response(newestApp(), { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      return new Response("", { status: 404 });
    });
    if (process.platform === "win32") app.setAppUserModelId("de.sascha.haushaltsbuch");
    require("electron").session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === "notifications" || perm === "clipboard-sanitized-write"));
    const shops = require("electron").session.fromPartition("persist:seiten");
    shops.setPermissionRequestHandler((wc, perm, cb) => cb(false));
    shops.setPermissionCheckHandler(() => false);
    shops.on("will-download", (ev) => ev.preventDefault());
    loadPlanned();
    applyPrefs(prefs());
    createWindow();
    if (!SMOKE) setInterval(checkPlanned, 30000);
  });
  app.on("before-quit", () => { quitting = true; pageDestroy(); });
  app.on("window-all-closed", () => { if (!prefs().tray || SMOKE) app.quit(); });
}

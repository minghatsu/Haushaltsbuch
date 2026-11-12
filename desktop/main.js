// Haushaltsbuch für Windows.
// Zeigt dieselbe App wie auf dem Handy. Die Daten liegen auf dem PC und werden mit der Synology abgeglichen.
// Neue App-Versionen holt sich die App selbst von der Synology (wie die Handy-App).
const { app, BrowserWindow, WebContentsView, protocol, ipcMain, shell, Menu, Tray, Notification, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

const APP_URL = "app://haushaltsbuch/index.html";
const BUNDLED = path.join(__dirname, "app.html");
const SMOKE = process.argv.includes("--smoke");
// keep the data folder of earlier versions (named "Haushaltsbuch") although the app is now called Finanz MAMI
if (SMOKE) app.setPath("userData", path.join(app.getPath("temp"), "haushaltsbuch-smoke-" + process.pid));
else app.setPath("userData", path.join(app.getPath("appData"), "Haushaltsbuch"));

const cachedFile = () => path.join(app.getPath("userData"), "app.html");
const windowFile = () => path.join(app.getPath("userData"), "fenster.json");

/* Updates from the Synology are only used if the GitHub build signed them (ECDSA P-256, key below). */
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
/** The downloaded version if it is newer than the one inside this program, otherwise the built-in one. */
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

/* ---------- notifications (Windows): the app hands over the planned reminders, the PC shows them while the program runs (also in the background) ---------- */
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
  for (const x of due.slice(-3)) if (now - x.at < 6 * 3600e3) showNote(x.title, x.text);   // older than 6 h (PC was off): skip
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
  win.setContentProtection(secureOn());   // screenshots and screen sharing show a black window (switch in Sicherheit)
  win.on("close", (e) => {
    saveBounds();
    if (!quitting && !SMOKE && prefs().tray) { e.preventDefault(); win.hide(); }   // keep running in the tray for reminders
  });
  win.on("closed", () => { win = null; });

  // web links open inside the app window (the app shows them with its own bar); other schemes (mailto …) go to Windows
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) pageRequest(url); else if (/^(mailto|tel):/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("app://")) { e.preventDefault(); if (/^https?:\/\//i.test(url)) pageRequest(url); else if (/^(mailto|tel):/i.test(url)) shell.openExternal(url); }
  });

  // keyboard: F5 reload, Ctrl +/-/0 zoom, Alt+Left / mouse back = back
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

  win.loadURL(APP_URL);
  if (SMOKE) runSmokeTest();
}

function goBack() {
  if (win) win.webContents.executeJavaScript("window.hbBack && window.hbBack()").catch(() => {});
}

/* ---------- bridge for the app (same functions as in the Android app) ---------- */
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

// Requests to the Synology are made here (not in the page), so browser rules for the home network never block them.
/* ---------- encrypted storage of the app data: a random key, itself locked by Windows (DPAPI via safeStorage) ---------- */
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
// https to the Synology's local address: the certificate must be valid for its internet name (certHost)
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
    // unencrypted only inside the home network or Tailscale – never across the internet
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

/* ---------- self-update from the GitHub release (private repo: read-only key the user entered) ---------- */
function nativeRev() { try { return String(JSON.parse(fs.readFileSync(path.join(__dirname, "native.json"), "utf8")).rev || 0); } catch (e) { return "0"; } }
ipcMain.on("nativeRev", (e) => { e.returnValue = nativeRev(); });
ipcMain.on("ghFetch", async (e, req) => {
  let result = "", err = "";
  try {
    if (!String(req.url).startsWith("https://api.github.com/repos/minghatsu/")) throw new Error("Adresse nicht erlaubt");
    const json = req.kind === "json";
    const headers = { "User-Agent": "FinanzMAMI", Accept: json ? "application/vnd.github+json" : "application/octet-stream" };
    if (req.token) headers.Authorization = "Bearer " + req.token;     // public download repo: no key
    let r = await fetch(req.url, { redirect: "manual", signal: AbortSignal.timeout(300000), headers });
    if (r.status >= 300 && r.status < 400) {     // download link of the file: fetched without the key
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
      // silent install; the installer starts the app again afterwards
      require("child_process").spawn(f, ["/S", "--force-run"], { detached: true, stdio: "ignore" }).unref();
      result = "installing";
      setTimeout(() => { quitting = true; app.quit(); }, 800);
    }
  } catch (x) { err = String((x && x.message) || x); }
  if (e.sender.isDestroyed()) return;
  e.sender.executeJavaScript(`window.hbGhDone && window.hbGhDone(${JSON.stringify(req.id)}, ${JSON.stringify(result)}, ${JSON.stringify(err)})`).catch(() => {});
});

// merchant logos: downloaded here and handed to the app as data URL (the app keeps them for offline use)
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

// scanner: Windows Image Acquisition (WIA) – the first scanner found scans one page without any dialog,
// the picture comes back to the app as JPEG (data URL) and goes into the same check window as a photo
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

// web pages (shop leaflets, help, imprint …) open INSIDE the app window: a web view placed where the app leaves room for it
let pageView = null, pageShown = false;
function pageRequest(url) { if (win && !win.isDestroyed()) win.webContents.executeJavaScript(`window.hbPageRequest && window.hbPageRequest(${JSON.stringify(String(url))})`).catch(() => shell.openExternal(url)); }
function pageSend() {
  if (!win || win.isDestroyed() || !pageView) return;
  const wc = pageView.webContents, nh = wc.navigationHistory;
  const st = { url: wc.getURL(), title: wc.getTitle(), back: nh ? nh.canGoBack() : wc.canGoBack(), fwd: nh ? nh.canGoForward() : wc.canGoForward(), loading: wc.isLoading() };
  win.webContents.executeJavaScript(`window.hbPageState && window.hbPageState(${JSON.stringify(st)})`).catch(() => {});
}
function pageMake() {
  if (pageView) return pageView;
  pageView = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: "persist:seiten" } });
  pageView.setBorderRadius && pageView.setBorderRadius(0);
  const wc = pageView.webContents;
  wc.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) wc.loadURL(url); return { action: "deny" }; });
  wc.on("will-navigate", (e, url) => { if (!/^https?:\/\//i.test(url)) e.preventDefault(); });
  ["did-start-loading", "did-stop-loading", "did-navigate", "did-navigate-in-page", "page-title-updated"].forEach((ev) => wc.on(ev, pageSend));
  wc.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "Escape") { e.preventDefault(); win.webContents.executeJavaScript("window.hbPageClose && window.hbPageClose()").catch(() => {}); }
    else if (input.alt && input.key === "ArrowLeft") { e.preventDefault(); if (wc.canGoBack()) wc.goBack(); }
    else if (input.key === "F5") { e.preventDefault(); wc.reload(); }
  });
  wc.on("render-process-gone", () => { try { win.contentView.removeChildView(pageView); } catch (e) {} pageView = null; pageShown = false; });
  return pageView;
}
// the page tells us where (css pixels of the app) – converted with the app's zoom
function pageRect(r) { const z = win.webContents.getZoomFactor(); return { x: Math.round(r.x * z), y: Math.round(r.y * z), width: Math.max(1, Math.round(r.w * z)), height: Math.max(1, Math.round(r.h * z)) }; }
ipcMain.on("pageOpen", (e, url, r) => {
  if (!win || !/^https?:\/\//i.test(url)) return;
  const v = pageMake();
  if (!pageShown) { win.contentView.addChildView(v); pageShown = true; }
  if (r) v.setBounds(pageRect(r));
  v.setVisible(true);
  if (v.webContents.getURL() !== url) v.webContents.loadURL(url).catch(() => {});
  pageSend();
});
ipcMain.on("pageBounds", (e, r) => { if (pageView && pageShown && r) pageView.setBounds(pageRect(r)); });
ipcMain.on("pageShow", (e, on) => { if (pageView && pageShown) pageView.setVisible(!!on); });
ipcMain.on("pageNav", (e, cmd) => {
  if (!pageView) return; const wc = pageView.webContents;
  if (cmd === "back" && wc.canGoBack()) wc.goBack();
  else if (cmd === "fwd" && wc.canGoForward()) wc.goForward();
  else if (cmd === "reload") wc.reload();
  else if (cmd === "external") { const u = wc.getURL(); if (/^https?:\/\//i.test(u)) shell.openExternal(u); }
  else if (cmd === "close") { try { win.contentView.removeChildView(pageView); } catch (err) {} pageShown = false; wc.loadURL("about:blank").catch(() => {}); }
});
// older app versions still ask for "openInApp": same place
ipcMain.on("openInApp", (e, url) => { if (/^https:\/\//i.test(url)) pageRequest(url); });

/* ---------- automatic start test for the build (npm run smoke) ---------- */
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
        await js(`localStorage.setItem("haushaltsbuch-server", ${JSON.stringify(server)}); localStorage.removeItem("haushaltsbuch-sync-v1")`);   // like a first start: the sign-in window opens
        win.webContents.reload();
        await new Promise((r) => win.webContents.once("did-finish-load", r));
        await wait(3000);
        result.title = await js(`document.getElementById("loginTitle").textContent`);
      }
      // since pairing without an account the first window is "Geräte koppeln" (the server address field is gone)
      const ok = result.page.login && result.page.bridge === "object" && !!result.page.version && (!server || ["Geräte koppeln","Passwort festlegen"].includes(result.title));
      done(ok);
    } catch (err) {
      result.error = String(err);
      done(false);
    }
  });
}

/* ---------- start ---------- */
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
    // the app never needs camera, microphone, location etc. in the PC version
    require("electron").session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === "notifications" || perm === "clipboard-sanitized-write"));
    loadPlanned();
    applyPrefs(prefs());
    createWindow();
    if (!SMOKE) setInterval(checkPlanned, 30000);
  });
  app.on("before-quit", () => { quitting = true; });
  app.on("window-all-closed", () => { if (!prefs().tray || SMOKE) app.quit(); });
}

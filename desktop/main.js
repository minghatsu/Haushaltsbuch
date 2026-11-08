// Haushaltsbuch für Windows.
// Zeigt dieselbe App wie auf dem Handy. Die Daten liegen auf dem PC und werden mit der Synology abgeglichen.
// Neue App-Versionen holt sich die App selbst von der Synology (wie die Handy-App).
const { app, BrowserWindow, protocol, ipcMain, shell, Menu, Tray, Notification, nativeImage } = require("electron");
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
  win.on("close", (e) => {
    saveBounds();
    if (!quitting && !SMOKE && prefs().tray) { e.preventDefault(); win.hide(); }   // keep running in the tray for reminders
  });
  win.on("closed", () => { win = null; });

  // links in the app open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("app://")) { e.preventDefault(); if (/^https?:\/\//i.test(url)) shell.openExternal(url); }
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
ipcMain.on("http", async (e, req) => {
  let status = 0, text = "";
  try {
    if (!/^https?:\/\//i.test(req.url)) throw new Error("bad url");
    const headers = { "Content-Type": "application/json" };
    if (req.auth) headers.Authorization = req.auth;
    const post = req.method === "POST";
    const r = await fetch(req.url, { method: post ? "POST" : "GET", headers, body: post ? req.body : undefined, signal: AbortSignal.timeout(30000) });
    status = r.status;
    text = await r.text();
  } catch (err) {
    status = 0; text = "";
  }
  if (e.sender.isDestroyed()) return;
  e.sender.executeJavaScript(`window.hbHttpDone && window.hbHttpDone(${JSON.stringify(req.id)}, ${status}, ${JSON.stringify(text)})`).catch(() => {});
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

// shop offers etc.: a window of its own on top of the app (closes with Esc), instead of the normal browser
let pageWin = null;
ipcMain.on("openInApp", (e, url) => {
  if (!/^https:\/\//i.test(url)) return;
  if (pageWin && !pageWin.isDestroyed()) { pageWin.loadURL(url); pageWin.focus(); return; }
  const b = win ? win.getBounds() : { x: undefined, y: undefined, width: 1100, height: 800 };
  pageWin = new BrowserWindow({ parent: win, x: b.x + 40, y: b.y + 40, width: Math.max(800, b.width - 80), height: Math.max(600, b.height - 80),
    title: "Angebote", autoHideMenuBar: true, backgroundColor: "#ffffff", webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  pageWin.webContents.setWindowOpenHandler(({ url: u }) => { if (/^https?:\/\//i.test(u)) pageWin.loadURL(u); return { action: "deny" }; });
  pageWin.webContents.on("before-input-event", (ev, input) => { if (input.type === "keyDown" && input.key === "Escape") pageWin.close(); });
  pageWin.on("closed", () => { pageWin = null; });
  pageWin.loadURL(url);
});

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
      result.page = await js(`({login: !!document.getElementById("loginBg"), bridge: typeof window.AndroidBridge, version: (document.querySelector('meta[name="hb-version"]')||{}).content, urlField: !document.getElementById("loginUrlRow").hidden})`);
      const server = process.env.SMOKE_SERVER;
      if (server) {
        await js(`localStorage.setItem("haushaltsbuch-server", ${JSON.stringify(server)}); localStorage.removeItem("haushaltsbuch-sync-v1")`);   // like a first start: the sign-in window opens
        win.webContents.reload();
        await new Promise((r) => win.webContents.once("did-finish-load", r));
        await wait(3000);
        result.title = await js(`document.getElementById("loginTitle").textContent`);
      }
      const ok = result.page.login && result.page.bridge === "object" && result.page.urlField && (!server || result.title === "Passwort festlegen");
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

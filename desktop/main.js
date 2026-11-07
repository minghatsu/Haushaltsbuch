// Haushaltsbuch für Windows.
// Zeigt dieselbe App wie auf dem Handy. Die Daten liegen auf dem PC und werden mit der Synology abgeglichen.
// Neue App-Versionen holt sich die App selbst von der Synology (wie die Handy-App).
const { app, BrowserWindow, protocol, ipcMain, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

const APP_URL = "app://haushaltsbuch/index.html";
const BUNDLED = path.join(__dirname, "app.html");
const SMOKE = process.argv.includes("--smoke");
if (SMOKE) app.setPath("userData", path.join(app.getPath("temp"), "haushaltsbuch-smoke-" + process.pid));

const cachedFile = () => path.join(app.getPath("userData"), "app.html");
const windowFile = () => path.join(app.getPath("userData"), "fenster.json");

function versionOf(html) {
  const m = /name="hb-version" content="(\d+)"/.exec(String(html).slice(0, 4000));
  return m ? Number(m[1]) : 0;
}
/** The downloaded version if it is newer than the one inside this program, otherwise the built-in one. */
function newestApp() {
  const bundled = fs.readFileSync(BUNDLED, "utf8");
  try {
    const cached = fs.readFileSync(cachedFile(), "utf8");
    if (versionOf(cached) > versionOf(bundled)) return cached;
  } catch (e) {}
  return bundled;
}

let win = null;

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
    title: "Haushaltsbuch",
    backgroundColor: "#F2F5F3",
    icon: path.join(__dirname, "icon.png"),
    show: !SMOKE,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  if (b.maximized) win.maximize();
  win.on("close", saveBounds);

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

ipcMain.on("saveApp", (e, html) => {
  try {
    html = String(html);
    if (!html.includes('id="loginBg"') || versionOf(html) <= versionOf(newestApp())) { e.returnValue = false; return; }
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
    const ct = (r.headers.get("content-type") || "").split(";")[0];
    if (r.ok && ct.startsWith("image/")) { const b = Buffer.from(await r.arrayBuffer()); if (b.length && b.length < 300000) data = "data:" + ct + ";base64," + b.toString("base64"); }
  } catch (err) { data = null; }
  if (e.sender.isDestroyed()) return;
  e.sender.executeJavaScript(`window.hbImgDone && window.hbImgDone(${JSON.stringify(req.id)}, ${JSON.stringify(data)})`).catch(() => {});
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
        await js(`localStorage.setItem("haushaltsbuch-server", ${JSON.stringify(server)})`);
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
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    protocol.handle("app", (request) => {
      const u = new URL(request.url);
      if (u.pathname === "/" || u.pathname === "/index.html") {
        return new Response(newestApp(), { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      return new Response("", { status: 404 });
    });
    createWindow();
  });
  app.on("window-all-closed", () => app.quit());
}

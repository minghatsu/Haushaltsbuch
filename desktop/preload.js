// Stellt der App dieselben Funktionen bereit wie die Android-App (window.AndroidBridge).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("AndroidBridge", {
  saveFile: (name, text) => ipcRenderer.sendSync("saveFile", String(name), String(text)),
  saveFileB64: (name, mime, b64) => ipcRenderer.sendSync("saveFileB64", String(name), String(b64)),
  autoBackup: (name, text, keep) => ipcRenderer.sendSync("autoBackup", String(name), String(text), Number(keep) || 8),
  saveApp: (html) => ipcRenderer.sendSync("saveApp", String(html)),
  reloadApp: () => ipcRenderer.send("reloadApp"),
  fetchImage: (id, url) => ipcRenderer.send("fetchImage", { id: String(id), url: String(url) }),
  http: (id, method, url, auth, body) =>
    ipcRenderer.send("http", { id: String(id), method: String(method), url: String(url), auth: String(auth || ""), body: String(body || "") }),
  httpAs: (id, method, url, auth, body, certHost) =>
    ipcRenderer.send("http", { id: String(id), method: String(method), url: String(url), auth: String(auth || ""), body: String(body || ""), certHost: String(certHost || "") }),
  copySecret: (text, sec) => ipcRenderer.send("copySecret", String(text), Number(sec) || 60),
  setSecure: (on) => ipcRenderer.send("setSecure", !!on),
  seal: (text) => ipcRenderer.sendSync("seal", String(text)),
  unseal: (sealed) => ipcRenderer.sendSync("unseal", String(sealed)),
  pbkdf2: (pin, salt, iter) => ipcRenderer.sendSync("pbkdf2", String(pin), String(salt), Number(iter)),
  openInApp: (url) => ipcRenderer.send("openInApp", String(url)),
  pageOpen: (url, r) => ipcRenderer.send("pageOpen", String(url), r ? { x: +r.x || 0, y: +r.y || 0, w: +r.w || 0, h: +r.h || 0 } : null),
  pageBounds: (r) => ipcRenderer.send("pageBounds", { x: +r.x || 0, y: +r.y || 0, w: +r.w || 0, h: +r.h || 0 }),
  pageShow: (on) => ipcRenderer.send("pageShow", !!on),
  pageNav: (cmd) => ipcRenderer.send("pageNav", String(cmd)),
  pagePick: (mode, src) => ipcRenderer.send("pagePick", String(mode || ""), src ? String(src) : ""),
  notifyState: () => "granted",
  notifyAsk: () => true,
  notifyNow: (id, title, text) => ipcRenderer.send("notifyNow", String(title), String(text)),
  notifySchedule: (json) => ipcRenderer.send("notifySchedule", String(json)),
  notifySettings: () => ipcRenderer.send("notifySettings"),
  pcPrefs: (json) => ipcRenderer.sendSync("pcPrefs", json ? String(json) : ""),
  nativeRev: () => ipcRenderer.sendSync("nativeRev"),
  ghFetch: (id, url, token, kind) => ipcRenderer.send("ghFetch", { id: String(id), url: String(url), token: String(token), kind: String(kind) }),
  scan: (id) => ipcRenderer.send("scan", String(id)),
  desktop: true,
});

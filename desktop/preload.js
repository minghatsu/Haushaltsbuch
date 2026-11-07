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
  openInApp: (url) => ipcRenderer.send("openInApp", String(url)),
  notifyState: () => "granted",
  notifyAsk: () => true,
  notifyNow: (id, title, text) => ipcRenderer.send("notifyNow", String(title), String(text)),
  notifySchedule: (json) => ipcRenderer.send("notifySchedule", String(json)),
  notifySettings: () => ipcRenderer.send("notifySettings"),
  pcPrefs: (json) => ipcRenderer.sendSync("pcPrefs", json ? String(json) : ""),
  desktop: true,
});

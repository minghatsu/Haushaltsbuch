// Stellt der App dieselben Funktionen bereit wie die Android-App (window.AndroidBridge).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("AndroidBridge", {
  saveFile: (name, text) => ipcRenderer.sendSync("saveFile", String(name), String(text)),
  saveApp: (html) => ipcRenderer.sendSync("saveApp", String(html)),
  reloadApp: () => ipcRenderer.send("reloadApp"),
  fetchImage: (id, url) => ipcRenderer.send("fetchImage", { id: String(id), url: String(url) }),
  http: (id, method, url, auth, body) =>
    ipcRenderer.send("http", { id: String(id), method: String(method), url: String(url), auth: String(auth || ""), body: String(body || "") }),
  desktop: true,
});

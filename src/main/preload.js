const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("azaan", {
  getConfig: () => ipcRenderer.invoke("app:getConfig"),
  saveConfig: (config) => ipcRenderer.invoke("app:saveConfig", config),
  getPrayerTimes: () => ipcRenderer.invoke("app:getPrayerTimes"),
  resolveLocation: (locationInput) => ipcRenderer.invoke("app:resolveLocation", locationInput),
  detectLocation: () => ipcRenderer.invoke("app:detectLocation"),
  getAzaanAudioUrl: () => ipcRenderer.invoke("app:getAzaanAudioUrl"),
  getDiagnostics: () => ipcRenderer.invoke("app:getDiagnostics"),
  openPath: (targetPath) => ipcRenderer.invoke("app:openPath", targetPath),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url)
});
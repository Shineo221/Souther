const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("souther", {
  version: "0.1.0",

  importBookmarks: () =>
    ipcRenderer.invoke("souther:import-bookmarks"),

  importPasswords: () =>
    ipcRenderer.invoke("souther:import-passwords")
});
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  toggleDevTools: () => ipcRenderer.send('toggle-dev-tools'),
  minimize: () => ipcRenderer.send('win-minimize'),
  close: () => ipcRenderer.send('win-close'),
  toggleFullscreen: () => ipcRenderer.send('toggle-fs')
});

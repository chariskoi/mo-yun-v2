const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
  ipcMain.on('toggle-dev-tools', (e) => { BrowserWindow.fromWebContents(e.sender).webContents.toggleDevTools() });
  ipcMain.on('win-minimize', (e) => { BrowserWindow.fromWebContents(e.sender).minimize() });
  ipcMain.on('win-close', (e) => { BrowserWindow.fromWebContents(e.sender).close() });
  ipcMain.on('toggle-fs', (e) => { var w = BrowserWindow.fromWebContents(e.sender); if (w._isFs) { w._isFs = false; w.setSize(1400, 900); w.center(); w.webContents.executeJavaScript('document.body.classList.remove("is-fullscreen")') } else { w._isFs = true; var b = screen.getPrimaryDisplay().bounds; w.setPosition(b.x, b.y); w.setSize(b.width, b.height); w.webContents.executeJavaScript('document.body.classList.add("is-fullscreen")') } });
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    fullscreen: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on('context-menu', function(e) { e.preventDefault() });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setTitle('墨韵');
  mainWindow.once('ready-to-show', () => {
    var b = screen.getPrimaryDisplay().bounds;
    mainWindow._isFs = true;
    mainWindow.setPosition(b.x, b.y);
    mainWindow.setSize(b.width, b.height);
    mainWindow.webContents.executeJavaScript('document.body.classList.add("is-fullscreen")');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

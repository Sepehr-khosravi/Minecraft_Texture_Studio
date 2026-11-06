import { app, BrowserWindow, shell, nativeTheme, Menu, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !!process.env.VITE_DEV_SERVER_URL;

// Force X11 on Linux — Wayland's frameless-window resize support is unreliable.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'x11');
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#00000000',   // fully transparent window
    transparent: true,               // required for rounded corners on Linux
    frame: false,                    // no OS chrome at all
    resizable: true,
    hasShadow: false,                // we draw the shadow in CSS
    titleBarStyle: 'hidden',         // fixes resize edges on some WMs
    show: false,
    darkTheme: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const emitMaximized = () => win.webContents.send('window:maximized-changed', win.isMaximized());
win.on('maximize', emitMaximized);
win.on('unmaximize', emitMaximized);
win.webContents.on('did-finish-load', emitMaximized);

ipcMain.handle('window:is-maximized', () => win.isMaximized());

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function registerWindowControls(): void {
  ipcMain.on('window:minimize', () => BrowserWindow.getFocusedWindow()?.minimize());
  ipcMain.on('window:maximize-toggle', () => {
    const w = BrowserWindow.getFocusedWindow();
    if (!w) return;
    w.isMaximized() ? w.unmaximize() : w.maximize();
  });
  ipcMain.on('window:close', () => BrowserWindow.getFocusedWindow()?.close());
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  Menu.setApplicationMenu(null);
  registerIpcHandlers();
  registerWindowControls();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
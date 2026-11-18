import { ipcMain, app } from 'electron';
import { registerFsHandlers } from './fs.js';
import { registerSkinHandlers } from './skin.js';

export function registerIpcHandlers(): void {
  ipcMain.handle('app:version', () => app.getVersion());
  registerFsHandlers();
  registerSkinHandlers();
}
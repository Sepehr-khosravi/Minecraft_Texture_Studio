import { ipcMain, app } from 'electron';
import { registerFsHandlers } from './fs.js';

export function registerIpcHandlers(): void {
  ipcMain.handle('app:version', () => app.getVersion());
  registerFsHandlers();
}

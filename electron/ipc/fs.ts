import { ipcMain, dialog, BrowserWindow } from 'electron';
import type {
  ApiResponse,
  AnimationMeta,
  ImportTextureInput,
  ImportTextureResult,
  OpenPack,
  PackMeta,
  PackNode,
  TextureAnimationInfo,
  TextureEntry,
} from '@shared/types/pack';
import {
  createPack,
  openPack,
  readMeta,
  writeMeta,
  resolveInside,
  createEmptyTexture,
  createAnimatedTexture,
  createFolder,
} from '../services/packService.js';
import {
  inspectTextureAnimation,
  writeAnimationMeta,
} from '../services/animationService.js';
import { validateTextureFile, readPngDimensions } from '../services/textureValidator.js';
import {
  listLibraryPacks,
  importExternalPack,
  deleteLibraryPack,
  getLibraryRoot,
  type LibraryEntry,
} from '../services/library.js';
import { exportPackAsZip, importPackFromZip } from '../services/zipService.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

function fail(err: unknown): ApiResponse<never> {
  const message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
  return { ok: false, error: message };
}

async function wrap<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return fail(err);
  }
}

export function registerFsHandlers(): void {
  ipcMain.handle('pack:pickOpenDir', async (): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Open resource pack folder',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    'pack:create',
    async (_evt, input: { name: string; description: string; pack_format: number }) =>
      wrap<OpenPack>(() => createPack(input))
  );

  ipcMain.handle('pack:open', async (_evt, root: string) =>
    wrap<OpenPack>(() => openPack(root))
  );

  ipcMain.handle('pack:readMeta', async (_evt, root: string) =>
    wrap<PackMeta>(() => readMeta(root))
  );

  ipcMain.handle(
    'pack:writeMeta',
    async (_evt, payload: { root: string; meta: PackMeta }) =>
      wrap<void>(() => writeMeta(payload.root, payload.meta))
  );

  ipcMain.handle('pack:pickTextureFile', async (): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Import texture',
      properties: ['openFile'],
      filters: [{ name: 'PNG texture', extensions: ['png'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    'pack:importTexture',
    async (_evt, input: ImportTextureInput): Promise<ApiResponse<ImportTextureResult>> =>
      wrap<ImportTextureResult>(async () => {
        const dest = resolveInside(input.root, input.relPath);
        const validation = await validateTextureFile(input.sourcePath, input.relPath);
        if (!validation.ok) {
          throw new Error(validation.message ?? 'Invalid texture.');
        }
        if (!input.overwrite) {
          try {
            await fs.access(dest);
            throw new Error('A texture already exists at that path.');
          } catch (err) {
            const e = err as NodeJS.ErrnoException;
            if (e.code !== 'ENOENT') throw err;
          }
        }
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(input.sourcePath, dest);
        const stat = await fs.stat(dest);
        const dims = validation.dimensions!;
        return {
          relPath: input.relPath.replace(/\\/g, '/'),
          width: dims.width,
          height: dims.height,
          sizeBytes: stat.size,
        };
      })
  );

  ipcMain.handle('pack:listTextures', async (_evt, root: string, tree: PackNode) =>
    wrap<TextureEntry[]>(async () => {
      const entries: TextureEntry[] = [];
      const walk = async (n: PackNode) => {
        if (n.type === 'file' && n.ext === 'png') {
          const abs = resolveInside(root, n.path);
          try {
            const dims = await readPngDimensions(abs);
            const category = deriveCategory(n.path);
            entries.push({
              path: n.path,
              name: n.name,
              width: dims.width,
              height: dims.height,
              sizeBytes: n.size,
              category,
            });
          } catch {
            /* ignore */
          }
        }
        if (n.children) {
          for (const child of n.children) await walk(child);
        }
      };
      await walk(tree);
      entries.sort((a, b) => a.path.localeCompare(b.path));
      return entries;
    })
  );

  ipcMain.handle('pack:readTexture', async (_evt, root: string, relPath: string) =>
    wrap<Uint8Array>(async () => {
      const abs = resolveInside(root, relPath);
      const buf = await fs.readFile(abs);
      return new Uint8Array(buf);
    })
  );

  ipcMain.handle(
    'pack:writeTexture',
    async (
      _evt,
      payload: { root: string; relPath: string; bytes: Uint8Array }
    ): Promise<ApiResponse<void>> =>
      wrap<void>(async () => {
        const dest = resolveInside(payload.root, payload.relPath);
        await fs.writeFile(dest, Buffer.from(payload.bytes));
      })
  );

  ipcMain.handle(
    'pack:createTexture',
    async (
      _evt,
      payload: {
        root: string;
        relPath: string;
        width: number;
        height: number;
        fill: 'transparent' | 'white' | 'black';
      }
    ): Promise<ApiResponse<OpenPack>> =>
      wrap<OpenPack>(async () => {
        await createEmptyTexture(
          payload.root,
          payload.relPath,
          payload.width,
          payload.height,
          payload.fill
        );
        return openPack(payload.root);
      })
  );

  ipcMain.handle(
    'pack:createAnimatedTexture',
    async (
      _evt,
      payload: {
        root: string;
        relPath: string;
        frameWidth: number;
        frameHeight: number;
        frameCount: number;
        frametime: number;
        interpolate: boolean;
      }
    ): Promise<ApiResponse<OpenPack>> =>
      wrap<OpenPack>(async () => {
        await createAnimatedTexture(
          payload.root,
          payload.relPath,
          payload.frameWidth,
          payload.frameHeight,
          payload.frameCount,
          { frametime: payload.frametime, interpolate: payload.interpolate }
        );
        return openPack(payload.root);
      })
  );

  ipcMain.handle(
    'pack:createFolder',
    async (_evt, payload: { root: string; relPath: string }): Promise<ApiResponse<OpenPack>> =>
      wrap<OpenPack>(async () => {
        await createFolder(payload.root, payload.relPath);
        return openPack(payload.root);
      })
  );

  ipcMain.handle(
    'pack:inspectAnimation',
    async (_evt, payload: { root: string; relPath: string }) =>
      wrap<TextureAnimationInfo>(() =>
        inspectTextureAnimation(payload.root, payload.relPath)
      )
  );

  ipcMain.handle(
    'pack:writeAnimation',
    async (
      _evt,
      payload: { root: string; relPath: string; meta: AnimationMeta | null }
    ): Promise<ApiResponse<OpenPack>> =>
      wrap<OpenPack>(async () => {
        await writeAnimationMeta(payload.root, payload.relPath, payload.meta);
        return openPack(payload.root);
      })
  );

  ipcMain.handle('library:list', async (): Promise<ApiResponse<LibraryEntry[]>> =>
    wrap<LibraryEntry[]>(() => listLibraryPacks())
  );

  ipcMain.handle('library:root', async (): Promise<string> => getLibraryRoot());

  ipcMain.handle(
    'library:import',
    async (_evt, payload: { sourcePath: string; name: string }): Promise<ApiResponse<string>> =>
      wrap<string>(() => importExternalPack(payload.sourcePath, payload.name))
  );

  ipcMain.handle(
    'library:delete',
    async (_evt, name: string): Promise<ApiResponse<void>> =>
      wrap<void>(() => deleteLibraryPack(name))
  );

  ipcMain.handle('library:pickImportDir', async (): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Import resource pack',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    'pack:exportZip',
    async (_evt, root: string): Promise<ApiResponse<{ bytes: number; files: number } | null>> =>
      wrap<{ bytes: number; files: number } | null>(async () => {
        const win = BrowserWindow.getFocusedWindow();
        const result = await dialog.showSaveDialog(win ?? undefined!, {
          title: 'Export resource pack as .zip',
          defaultPath: `${path.basename(root)}.zip`,
          filters: [{ name: 'Minecraft resource pack', extensions: ['zip'] }],
        });
        if (result.canceled || !result.filePath) return null;
        return exportPackAsZip(root, result.filePath);
      })
  );

  ipcMain.handle(
    'pack:importZip',
    async (_evt, payload: { zipPath: string; name: string }): Promise<ApiResponse<OpenPack>> =>
      wrap<OpenPack>(() => importPackFromZip(payload.zipPath, payload.name))
  );

  ipcMain.handle('pack:pickZipFile', async (): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Import resource pack (.zip)',
      properties: ['openFile'],
      filters: [{ name: 'Minecraft resource pack', extensions: ['zip'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}

function deriveCategory(relPath: string): TextureEntry['category'] {
  const p = relPath.replace(/\\/g, '/');
  if (p.includes('/textures/block/')) return 'block';
  if (p.includes('/textures/item/')) return 'item';
  if (p.includes('/textures/entity/')) return 'entity';
  if (p.includes('/textures/gui/')) return 'gui';
  if (p.includes('/textures/particle/')) return 'particle';
  if (p.includes('/textures/painting/')) return 'painting';
  if (p.includes('/textures/environment/')) return 'environment';
  if (p.includes('/textures/font/')) return 'font';
  if (p.includes('/textures/colormap/')) return 'colormap';
  return 'misc';
}
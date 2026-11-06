import { contextBridge, ipcRenderer } from 'electron';

const api = {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
    platform: (): string => process.platform,
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:maximize-toggle'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChanged: (cb: (max: boolean) => void) => {
      const handler = (_: unknown, max: boolean) => cb(max);
      ipcRenderer.on('window:maximized-changed', handler);
      return () => ipcRenderer.removeListener('window:maximized-changed', handler);
    },
  },
  library: {
    list: () => ipcRenderer.invoke('library:list'),
    root: (): Promise<string> => ipcRenderer.invoke('library:root'),
    import: (payload: { sourcePath: string; name: string }) =>
      ipcRenderer.invoke('library:import', payload),
    delete: (name: string) => ipcRenderer.invoke('library:delete', name),
    pickImportDir: (): Promise<string | null> =>
      ipcRenderer.invoke('library:pickImportDir'),
  },
  pack: {
    pickOpenDir: (): Promise<string | null> => ipcRenderer.invoke('pack:pickOpenDir'),
    create: (input: unknown) => ipcRenderer.invoke('pack:create', input),
    open: (root: string) => ipcRenderer.invoke('pack:open', root),
    readMeta: (root: string) => ipcRenderer.invoke('pack:readMeta', root),
    writeMeta: (root: string, meta: unknown) =>
      ipcRenderer.invoke('pack:writeMeta', { root, meta }),
    pickTextureFile: (): Promise<string | null> =>
      ipcRenderer.invoke('pack:pickTextureFile'),
    importTexture: (input: unknown) =>
      ipcRenderer.invoke('pack:importTexture', input),
    listTextures: (root: string, tree: unknown) =>
      ipcRenderer.invoke('pack:listTextures', root, tree),
    readTexture: (root: string, relPath: string) =>
      ipcRenderer.invoke('pack:readTexture', root, relPath),
    writeTexture: (root: string, relPath: string, bytes: Uint8Array) =>
      ipcRenderer.invoke('pack:writeTexture', { root, relPath, bytes }),
    createTexture: (payload: unknown) => ipcRenderer.invoke('pack:createTexture', payload),
    createAnimatedTexture: (payload: unknown) =>
      ipcRenderer.invoke('pack:createAnimatedTexture', payload),
    createFolder: (payload: unknown) => ipcRenderer.invoke('pack:createFolder', payload),
    inspectAnimation: (payload: { root: string; relPath: string }) =>
      ipcRenderer.invoke('pack:inspectAnimation', payload),
    writeAnimation: (payload: unknown) => ipcRenderer.invoke('pack:writeAnimation', payload),
    exportZip: (root: string) => ipcRenderer.invoke('pack:exportZip', root),
    importZip: (payload: { zipPath: string; name: string }) =>
      ipcRenderer.invoke('pack:importZip', payload),
    pickZipFile: (): Promise<string | null> => ipcRenderer.invoke('pack:pickZipFile'),
  },
} as const;

contextBridge.exposeInMainWorld('api', api);
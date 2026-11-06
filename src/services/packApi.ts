import type {
  AnimationMeta,
  ApiResponse,
  CreatePackInput,
  ImportTextureInput,
  ImportTextureResult,
  OpenPack,
  PackMeta,
  PackNode,
  TextureAnimationInfo,
  TextureEntry,
} from '@shared/types/pack';

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export const packApi = {
  pickOpenDir: () => window.api.pack.pickOpenDir(),
  pickTextureFile: () => window.api.pack.pickTextureFile(),
  pickZipFile: () => window.api.pack.pickZipFile(),

  async create(input: CreatePackInput): Promise<OpenPack> {
    return unwrap(await window.api.pack.create(input));
  },
  async open(root: string): Promise<OpenPack> {
    return unwrap(await window.api.pack.open(root));
  },
  async readMeta(root: string): Promise<PackMeta> {
    return unwrap(await window.api.pack.readMeta(root));
  },
  async writeMeta(root: string, meta: PackMeta): Promise<void> {
    unwrap(await window.api.pack.writeMeta(root, meta));
  },
  async importTexture(input: ImportTextureInput): Promise<ImportTextureResult> {
    return unwrap(await window.api.pack.importTexture(input));
  },
  async listTextures(root: string, tree: PackNode): Promise<TextureEntry[]> {
    return unwrap(await window.api.pack.listTextures(root, tree));
  },
  async readTexture(root: string, relPath: string): Promise<Uint8Array> {
    return unwrap(await window.api.pack.readTexture(root, relPath));
  },
  async writeTexture(root: string, relPath: string, bytes: Uint8Array): Promise<void> {
    unwrap(await window.api.pack.writeTexture(root, relPath, bytes));
  },
  async createTexture(payload: {
    root: string;
    relPath: string;
    width: number;
    height: number;
    fill: 'transparent' | 'white' | 'black';
  }): Promise<OpenPack> {
    return unwrap(await window.api.pack.createTexture(payload));
  },
  async createAnimatedTexture(payload: {
    root: string;
    relPath: string;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    frametime: number;
    interpolate: boolean;
  }): Promise<OpenPack> {
    return unwrap(await window.api.pack.createAnimatedTexture(payload));
  },
  async createFolder(root: string, relPath: string): Promise<OpenPack> {
    return unwrap(await window.api.pack.createFolder({ root, relPath }));
  },
  async inspectAnimation(root: string, relPath: string): Promise<TextureAnimationInfo> {
    return unwrap(await window.api.pack.inspectAnimation({ root, relPath }));
  },
  async writeAnimation(
    root: string,
    relPath: string,
    meta: AnimationMeta | null
  ): Promise<OpenPack> {
    return unwrap(await window.api.pack.writeAnimation({ root, relPath, meta }));
  },
  async exportZip(root: string): Promise<{ bytes: number; files: number } | null> {
    return unwrap(await window.api.pack.exportZip(root));
  },
  async importZip(zipPath: string, name: string): Promise<OpenPack> {
    return unwrap(await window.api.pack.importZip({ zipPath, name }));
  },
};
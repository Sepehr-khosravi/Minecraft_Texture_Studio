import type {
  AnimationMeta,
  ApiResponse,
  CreatePackInput,
  ImportTextureInput,
  ImportTextureResult,
  LibraryEntry,
  OpenPack,
  PackMeta,
  PackNode,
  TextureAnimationInfo,
  TextureEntry,
} from '@shared/types/pack';

export interface RendererApi {
  app: {
    getVersion(): Promise<string>;
    platform(): string;
  };
  window: {
    minimize(): void;
    toggleMaximize(): void;
    close(): void;
    isMaximized(): Promise<boolean>;
    onMaximizedChanged(cb: (max: boolean) => void): () => void;
  };
  library: {
    list(): Promise<ApiResponse<LibraryEntry[]>>;
    root(): Promise<string>;
    import(payload: { sourcePath: string; name: string }): Promise<ApiResponse<string>>;
    delete(name: string): Promise<ApiResponse<void>>;
    pickImportDir(): Promise<string | null>;
  };
  pack: {
    pickOpenDir(): Promise<string | null>;
    create(input: CreatePackInput): Promise<ApiResponse<OpenPack>>;
    open(root: string): Promise<ApiResponse<OpenPack>>;
    readMeta(root: string): Promise<ApiResponse<PackMeta>>;
    writeMeta(root: string, meta: PackMeta): Promise<ApiResponse<void>>;
    pickTextureFile(): Promise<string | null>;
    importTexture(input: ImportTextureInput): Promise<ApiResponse<ImportTextureResult>>;
    listTextures(root: string, tree: PackNode): Promise<ApiResponse<TextureEntry[]>>;
    readTexture(root: string, relPath: string): Promise<ApiResponse<Uint8Array>>;
    writeTexture(root: string, relPath: string, bytes: Uint8Array): Promise<ApiResponse<void>>;
    createTexture(payload: {
      root: string;
      relPath: string;
      width: number;
      height: number;
      fill: 'transparent' | 'white' | 'black';
    }): Promise<ApiResponse<OpenPack>>;
    createAnimatedTexture(payload: {
      root: string;
      relPath: string;
      frameWidth: number;
      frameHeight: number;
      frameCount: number;
      frametime: number;
      interpolate: boolean;
    }): Promise<ApiResponse<OpenPack>>;
    createFolder(payload: { root: string; relPath: string }): Promise<ApiResponse<OpenPack>>;
    inspectAnimation(payload: {
      root: string;
      relPath: string;
    }): Promise<ApiResponse<TextureAnimationInfo>>;
    writeAnimation(payload: {
      root: string;
      relPath: string;
      meta: AnimationMeta | null;
    }): Promise<ApiResponse<OpenPack>>;
    exportZip(root: string): Promise<ApiResponse<{ bytes: number; files: number } | null>>;
    importZip(payload: { zipPath: string; name: string }): Promise<ApiResponse<OpenPack>>;
    pickZipFile(): Promise<string | null>;
  };
}

declare global {
  interface Window {
    api: RendererApi;
  }
}
export interface PackNode {
  name: string;
  path: string;
  type: 'dir' | 'file';
  size: number;
  ext: string;
  children?: PackNode[];
}

export interface PackMeta {
  pack_format: number;
  description: string;
  supported_formats?: number | [number, number];
  _raw?: Record<string, unknown>;
}

export interface TextureWarning {
  path: string;
  width: number;
  height: number;
  reason: 'not-power-of-two' | 'not-square';
  message: string;
}

export type TextureCategory =
  | 'block'
  | 'item'
  | 'entity'
  | 'gui'
  | 'particle'
  | 'painting'
  | 'environment'
  | 'font'
  | 'colormap'
  | 'misc';

export interface TextureEntry {
  path: string;
  name: string;
  width: number;
  height: number;
  sizeBytes: number;
  category: TextureCategory;
}

/** Parsed Minecraft .png.mcmeta animation data. */
export interface AnimationMeta {
  frametime: number;
  interpolate: boolean;
  frames?: number[];
  width?: number;
  height?: number;
}

/** Result of inspecting a texture: does it have a .mcmeta sibling? */
export interface TextureAnimationInfo {
  hasAnimation: boolean;
  /** Number of frames implied by (height / frameHeight). */
  frameCount: number;
  /** Height of one frame in pixels. */
  frameHeight: number;
  meta: AnimationMeta | null;
  /** Raw .mcmeta text (for advanced editing later). */
  rawMeta: string | null;
}

export interface OpenPack {
  root: string;
  name: string;
  meta: PackMeta;
  tree: PackNode;
  stats: {
    fileCount: number;
    textureCount: number;
    totalBytes: number;
  };
  warnings: TextureWarning[];
}

export interface CreatePackInput {
  name: string;
  description: string;
  pack_format: number;
}

export interface ImportTextureInput {
  root: string;
  relPath: string;
  sourcePath: string;
  overwrite: boolean;
}

export interface ImportTextureResult {
  relPath: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface ApiResult<T> {
  ok: true;
  data: T;
}
export interface ApiError {
  ok: false;
  error: string;
}
export type ApiResponse<T> = ApiResult<T> | ApiError;

export interface PackFormatPreset {
  label: string;
  pack_format: number;
  hint?: string;
}

export const PACK_FORMAT_PRESETS: PackFormatPreset[] = [
  { label: '1.8.9 (Bedwars / Legacy)', pack_format: 1, hint: 'Most minigame PvP servers' },
  { label: '1.12.2', pack_format: 3 },
  { label: '1.16.5', pack_format: 6 },
  { label: '1.18.2', pack_format: 8 },
  { label: '1.20 – 1.20.1', pack_format: 15 },
  { label: '1.20.2', pack_format: 18 },
  { label: '1.21 – 1.21.1', pack_format: 48 },
];

export interface LibraryEntry {
  name: string;
  path: string;
  modifiedAt: string;
  valid: boolean;
}
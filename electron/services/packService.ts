import { promises as fs } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import type {
  OpenPack,
  PackMeta,
  PackNode,
  TextureWarning,
} from '@shared/types/pack';
import { validateTextureFile } from './textureValidator.js';
import { getLibraryRoot, validateNewPackName } from './library.js';

const DEFAULT_SKELETON = [
  'assets',
  'assets/minecraft',
  'assets/minecraft/textures',
  'assets/minecraft/textures/block',
  'assets/minecraft/textures/item',
  'assets/minecraft/textures/gui',
  'assets/minecraft/textures/entity',
];

const TEXTURE_EXTS = new Set(['png']);
const HIDDEN_NAMES = new Set(['.DS_Store', 'Thumbs.db']);

export function resolveInside(root: string, rel: string): string {
  const rootAbs = path.resolve(root);
  const target = path.resolve(rootAbs, rel);
  if (target !== rootAbs && !target.startsWith(rootAbs + path.sep)) {
    throw new Error(`Refusing to access path outside pack: ${rel}`);
  }
  return target;
}

function normaliseRel(p: string): string {
  return p.split(path.sep).join('/');
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function sortNodes(a: PackNode, b: PackNode): number {
  if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

async function scanDir(root: string, relDir: string): Promise<PackNode> {
  const absDir = relDir === '' ? root : resolveInside(root, relDir);
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  const children: PackNode[] = [];

  for (const entry of entries) {
    if (HIDDEN_NAMES.has(entry.name)) continue;
    const rel = relDir === '' ? entry.name : `${relDir}/${entry.name}`;
    const abs = resolveInside(root, rel);

    if (entry.isDirectory()) {
      children.push(await scanDir(root, rel));
    } else if (entry.isFile()) {
      const stat = await fs.stat(abs);
      children.push({
        name: entry.name,
        path: normaliseRel(rel),
        type: 'file',
        size: stat.size,
        ext: extOf(entry.name),
      });
    }
  }

  children.sort(sortNodes);
  return {
    name: relDir === '' ? path.basename(root) : path.basename(absDir),
    path: normaliseRel(relDir),
    type: 'dir',
    size: 0,
    ext: '',
    children,
  };
}

function summarise(root: PackNode): OpenPack['stats'] {
  let fileCount = 0;
  let textureCount = 0;
  let totalBytes = 0;
  const walk = (n: PackNode) => {
    if (n.type === 'file') {
      fileCount++;
      totalBytes += n.size;
      if (TEXTURE_EXTS.has(n.ext)) textureCount++;
    }
    n.children?.forEach(walk);
  };
  walk(root);
  return { fileCount, textureCount, totalBytes };
}

export async function readMeta(root: string): Promise<PackMeta> {
  const metaPath = resolveInside(root, 'pack.mcmeta');
  const raw = await fs.readFile(metaPath, 'utf-8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const pack = parsed.pack as Record<string, unknown> | undefined;
  if (!pack || typeof pack !== 'object') {
    throw new Error('pack.mcmeta is missing a "pack" object.');
  }
  const packFormat = pack.pack_format;
  if (typeof packFormat !== 'number') {
    throw new Error('pack.mcmeta is missing "pack.pack_format".');
  }
  let description = '';
  const d = pack.description;
  if (typeof d === 'string') description = d;
  else if (d && typeof d === 'object' && 'text' in (d as object)) {
    description = String((d as { text: unknown }).text ?? '');
  } else if (d) description = String(d);

  let supported: number | [number, number] | undefined;
  const sf = pack.supported_formats;
  if (typeof sf === 'number') supported = sf;
  else if (Array.isArray(sf) && sf.length === 2 && sf.every((x) => typeof x === 'number')) {
    supported = [sf[0], sf[1]];
  }

  return {
    pack_format: packFormat,
    description,
    supported_formats: supported,
    _raw: parsed,
  };
}

export async function writeMeta(root: string, meta: PackMeta): Promise<void> {
  const metaPath = resolveInside(root, 'pack.mcmeta');
  const base: Record<string, unknown> = { ...(meta._raw ?? {}) };
  const pack: Record<string, unknown> = {
    ...((base.pack as Record<string, unknown> | undefined) ?? {}),
    pack_format: meta.pack_format,
    description: meta.description,
  };
  if (meta.supported_formats !== undefined) pack.supported_formats = meta.supported_formats;
  else delete pack.supported_formats;
  base.pack = pack;
  await fs.writeFile(metaPath, JSON.stringify(base, null, 2) + '\n', 'utf-8');
}

async function validateAllTextures(
  root: string,
  tree: PackNode
): Promise<TextureWarning[]> {
  const warnings: TextureWarning[] = [];
  async function walk(n: PackNode) {
    if (n.type === 'file' && n.ext === 'png') {
      const rel = n.path;
      const abs = resolveInside(root, rel);
      const v = await validateTextureFile(abs, rel);
      if (!v.ok && v.dimensions) {
        warnings.push({
          path: rel,
          width: v.dimensions.width,
          height: v.dimensions.height,
          reason: v.code === 'not-square' ? 'not-square' : 'not-power-of-two',
          message: v.message ?? 'Invalid texture.',
        });
      }
    }
    n.children?.forEach((c) => walk(c));
  }
  await walk(tree);
  return warnings;
}

export async function openPack(root: string): Promise<OpenPack> {
  const abs = path.resolve(root);
  const stat = await fs.stat(abs);
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${abs}`);
  const meta = await readMeta(abs);
  const tree = await scanDir(abs, '');
  const stats = summarise(tree);
  const warnings = await validateAllTextures(abs, tree);
  return {
    root: abs,
    name: path.basename(abs),
    meta,
    tree,
    stats,
    warnings,
  };
}

export async function createPack(input: {
  name: string;
  description: string;
  pack_format: number;
}): Promise<OpenPack> {
  const name = input.name.trim();
  await validateNewPackName(name);
  const root = path.join(getLibraryRoot(), name);
  await fs.mkdir(root, { recursive: true });
  for (const dir of DEFAULT_SKELETON) {
    await fs.mkdir(resolveInside(root, dir), { recursive: true });
  }
  const meta: PackMeta = {
    pack_format: input.pack_format,
    description: input.description,
    _raw: {
      pack: {
        pack_format: input.pack_format,
        description: input.description,
      },
    },
  };
  await writeMeta(root, meta);
  return openPack(root);
}

export async function createEmptyTexture(
  root: string,
  relPath: string,
  width: number,
  height: number,
  fill: 'transparent' | 'white' | 'black' = 'transparent'
): Promise<void> {
  if (!relPath.endsWith('.png')) {
    throw new Error('Texture path must end in .png');
  }
  const dest = resolveInside(root, relPath);
  try {
    await fs.access(dest);
    throw new Error(`A file already exists at ${relPath}`);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') throw err;
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const bytes = buildEmptyPngBytes(width, height, fill);
  await fs.writeFile(dest, bytes);
}

/**
 * Create an animated texture: a tall PNG plus a matching .png.mcmeta.
 * `frameWidth` × `frameCount * frameHeight` is the final PNG size.
 * All frames start as fully transparent.
 * If `meta` is provided, it is written to the .mcmeta file; otherwise a
 * minimal one (`frametime: 1`) is generated.
 */
export async function createAnimatedTexture(
  root: string,
  relPath: string,
  frameWidth: number,
  frameHeight: number,
  frameCount: number,
  meta?: { frametime?: number; interpolate?: boolean }
): Promise<void> {
  if (!relPath.endsWith('.png')) {
    throw new Error('Texture path must end in .png');
  }
  if (frameCount < 2) throw new Error('Animation requires at least 2 frames.');
  if (frameCount > 128) throw new Error('Animation is limited to 128 frames.');
  const totalHeight = frameHeight * frameCount;
  if (totalHeight > 2048) {
    throw new Error(`Total height ${totalHeight}px exceeds 2048px. Reduce frame count or size.`);
  }

  const pngAbs = resolveInside(root, relPath);
  const mcmetaAbs = resolveInside(root, `${relPath}.mcmeta`);
  try {
    await fs.access(pngAbs);
    throw new Error(`A file already exists at ${relPath}`);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') throw err;
  }
  try {
    await fs.access(mcmetaAbs);
    throw new Error(`Animation metadata already exists at ${relPath}.mcmeta`);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') throw err;
  }

  await fs.mkdir(path.dirname(pngAbs), { recursive: true });

  const pngBytes = buildEmptyPngBytes(frameWidth, totalHeight, 'transparent');
  const mcmeta: Record<string, unknown> = {
    animation: {
      frametime: meta?.frametime ?? 1,
      ...(meta?.interpolate ? { interpolate: true } : {}),
    },
  };

  await fs.writeFile(pngAbs, pngBytes);
  await fs.writeFile(mcmetaAbs, JSON.stringify(mcmeta, null, 2) + '\n', 'utf-8');
}

export async function createFolder(root: string, relPath: string): Promise<void> {
  if (!relPath || relPath.trim() === '') throw new Error('Folder path is empty.');
  const dest = resolveInside(root, relPath);
  await fs.mkdir(dest, { recursive: true });
}

function buildEmptyPngBytes(
  width: number,
  height: number,
  fill: 'transparent' | 'white' | 'black'
): Buffer {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Texture dimensions must be positive integers.');
  }
  if (width > 2048 || height > 2048) {
    throw new Error('Texture dimensions must not exceed 2048.');
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(6, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdr = makeChunk('IHDR', ihdrData);

  const rowLen = 1 + width * 4;
  const raw = Buffer.alloc(rowLen * height);
  const [r, g, b, a] =
    fill === 'transparent' ? [0, 0, 0, 0]
    : fill === 'white'     ? [255, 255, 255, 255]
    :                        [0, 0, 0, 255];
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowLen;
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 4;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b; raw[p + 3] = a;
    }
  }
  const idatData = zlib.deflateSync(raw);
  const idat = makeChunk('IDAT', idatData);
  const iend = makeChunk('IEND', Buffer.alloc(0));
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}
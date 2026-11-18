import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export interface SkinEntry {
  /** Filename without extension, e.g. "my_steve_skin". */
  id: string;
  /** Filename with extension. */
  fileName: string;
  /** Absolute path on disk. */
  path: string;
  /** ISO timestamp of last modification. */
  modifiedAt: string;
  /** Size in bytes. */
  sizeBytes: number;
}

/** The folder where all standalone skins live. Separate from packs. */
export function getSkinsRoot(): string {
  return path.join(app.getPath('userData'), 'skins');
}

export async function ensureSkinsRoot(): Promise<string> {
  const root = getSkinsRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

function validateFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Skin name cannot be empty.');
  if (/[\\/:*?"<>|]/.test(trimmed)) {
    throw new Error('Skin name cannot contain \\ / : * ? " < > |');
  }
  if (trimmed.startsWith('.')) throw new Error('Skin name cannot start with a dot.');
  const clean = trimmed.toLowerCase().endsWith('.png')
    ? trimmed.slice(0, -4)
    : trimmed;
  return clean;
}

/** List every .png file in the skins folder. */
export async function listSkins(): Promise<SkinEntry[]> {
  const root = await ensureSkinsRoot();
  const dirents = await fs.readdir(root, { withFileTypes: true });
  const entries: SkinEntry[] = [];
  for (const d of dirents) {
    if (!d.isFile()) continue;
    if (!d.name.toLowerCase().endsWith('.png')) continue;
    const full = path.join(root, d.name);
    try {
      const stat = await fs.stat(full);
      entries.push({
        id: d.name.replace(/\.png$/i, ''),
        fileName: d.name,
        path: full,
        modifiedAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
      });
    } catch {
      // skip unreadable
    }
  }
  entries.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  return entries;
}

/** Build a minimal 64x64 RGBA PNG with transparent base (placeholder skin). */
function buildBlankSkinPng(): Buffer {
  const width = 64;
  const height = 64;

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Transparent base — user paints over it.
  const rowLen = 1 + width * 4;
  const raw = Buffer.alloc(rowLen * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0; // filter None
    // rest of the row is already 0 (transparent)
  }
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(raw));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Create a new blank skin file. */
export async function createSkin(name: string): Promise<SkinEntry> {
  const clean = validateFileName(name);
  const root = await ensureSkinsRoot();
  const fileName = `${clean}.png`;
  const full = path.join(root, fileName);
  try {
    await fs.access(full);
    throw new Error(`A skin named "${clean}" already exists.`);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') throw err;
  }
  const png = buildBlankSkinPng();
  await fs.writeFile(full, png);
  const stat = await fs.stat(full);
  return {
    id: clean,
    fileName,
    path: full,
    modifiedAt: stat.mtime.toISOString(),
    sizeBytes: stat.size,
  };
}

/** Import an existing PNG from disk into the skins folder. */
export async function importSkin(sourcePath: string, name: string): Promise<SkinEntry> {
  const clean = validateFileName(name);
  const root = await ensureSkinsRoot();
  const fileName = `${clean}.png`;
  const full = path.join(root, fileName);
  try {
    await fs.access(full);
    throw new Error(`A skin named "${clean}" already exists.`);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') throw err;
  }
  await fs.copyFile(sourcePath, full);
  const stat = await fs.stat(full);
  return {
    id: clean,
    fileName,
    path: full,
    modifiedAt: stat.mtime.toISOString(),
    sizeBytes: stat.size,
  };
}

/** Delete a skin by filename. */
export async function deleteSkin(fileName: string): Promise<void> {
  const root = getSkinsRoot();
  const target = path.resolve(root, fileName);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Refusing to delete outside skins folder.');
  }
  await fs.rm(target, { force: true });
}
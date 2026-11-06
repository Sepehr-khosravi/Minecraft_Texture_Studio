import { promises as fs } from 'node:fs';

export interface TextureDimensions {
  width: number;
  height: number;
}

export interface ValidationResult {
  ok: boolean;
  /** Machine-readable reason code for the UI to map to a friendly message. */
  code?: 'not-png' | 'truncated' | 'bad-signature' | 'not-power-of-two' | 'not-square';
  message?: string;
  dimensions?: TextureDimensions;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Read width/height from a PNG's IHDR chunk (bytes 16–23). */
export async function readPngDimensions(absPath: string): Promise<TextureDimensions> {
  const handle = await fs.open(absPath, 'r');
  try {
    const buf = Buffer.alloc(24);
    await handle.read(buf, 0, 24, 0);

    for (let i = 0; i < PNG_SIGNATURE.length; i++) {
      if (buf[i] !== PNG_SIGNATURE[i]) {
        throw Object.assign(new Error('Not a PNG file.'), { code: 'bad-signature' });
      }
    }
    // IHDR length (4) + "IHDR" (4) + width (4) + height (4) = offsets 8..24
    // Byte 8..11 length, 12..15 "IHDR", 16..19 width, 20..23 height — big endian.
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } finally {
    await handle.close();
  }
}

/** true iff n is a positive integer power of two. */
export function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

/** Directories where Minecraft requires square, power-of-two textures. */
const SQUARE_REQUIRED_PREFIXES = [
  'assets/minecraft/textures/block/',
  'assets/minecraft/textures/item/',
  'assets/minecraft/textures/entity/',
  'assets/minecraft/textures/particle/',
  'assets/minecraft/textures/painting/',
];

function requiresSquare(relPath: string): boolean {
  const p = relPath.replace(/\\/g, '/').toLowerCase();
  return SQUARE_REQUIRED_PREFIXES.some((prefix) => p.startsWith(prefix));
}

/**
 * Validate a texture file at `absPath` given its path relative to the pack root
 * (`relPath`, e.g. "assets/minecraft/textures/block/stone.png").
 * Non-PNG files are rejected here — the caller should only invoke for `.png`.
 */
export async function validateTextureFile(
  absPath: string,
  relPath: string
): Promise<ValidationResult> {
  let dims: TextureDimensions;
  try {
    dims = await readPngDimensions(absPath);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'bad-signature') {
      return { ok: false, code: 'not-png', message: 'File is not a valid PNG.' };
    }
    if (e.code === 'ENOENT') {
      return { ok: false, code: 'truncated', message: 'File does not exist.' };
    }
    return {
      ok: false,
      code: 'truncated',
      message: `Could not read PNG header: ${e.message}`,
    };
  }

  const { width, height } = dims;

  if (!isPowerOfTwo(width) || !isPowerOfTwo(height)) {
    return {
      ok: false,
      code: 'not-power-of-two',
      message:
        `Texture is ${width}×${height}. Minecraft requires width and height to be powers of two ` +
        `(1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048). Nearest valid: ` +
        `${nearestPowerOfTwo(width)}×${nearestPowerOfTwo(height)}.`,
      dimensions: dims,
    };
  }

  if (requiresSquare(relPath) && width !== height) {
    return {
      ok: false,
      code: 'not-square',
      message:
        `Texture is ${width}×${height}. Textures under block/, item/, entity/, ` +
        `particle/, and painting/ must be square.`,
      dimensions: dims,
    };
  }

  return { ok: true, dimensions: dims };
}

/** Snap to the nearest power of two — used only for the suggestion in the error. */
export function nearestPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  const lower = 1 << Math.floor(Math.log2(n));
  const upper = lower * 2;
  return n - lower <= upper - n ? lower : upper;
}

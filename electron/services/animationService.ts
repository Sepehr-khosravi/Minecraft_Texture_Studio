import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  AnimationMeta,
  TextureAnimationInfo,
} from '@shared/types/pack';
import { resolveInside } from './packService.js';
import { readPngDimensions } from './textureValidator.js';

/**
 * Inspect a texture's animation state:
 * - reads the .png.mcmeta sibling if present
 * - parses frametime / interpolate / frames
 * - infers frameCount and frameHeight from the PNG dimensions
 */
export async function inspectTextureAnimation(
  root: string,
  relPath: string
): Promise<TextureAnimationInfo> {
  const pngAbs = resolveInside(root, relPath);
  const mcmetaRel = `${relPath}.mcmeta`;
  const mcmetaAbs = resolveInside(root, mcmetaRel);

  const dims = await readPngDimensions(pngAbs);

  let rawMeta: string | null = null;
  try {
    rawMeta = await fs.readFile(mcmetaAbs, 'utf-8');
  } catch {
    // No .mcmeta — not animated.
    return {
      hasAnimation: false,
      frameCount: 1,
      frameHeight: dims.height,
      meta: null,
      rawMeta: null,
    };
  }

  let parsed: AnimationMeta;
  try {
    const j = JSON.parse(rawMeta) as { animation?: Record<string, unknown> };
    const a = j.animation ?? {};
    parsed = {
      frametime: typeof a.frametime === 'number' ? a.frametime : 1,
      interpolate: typeof a.interpolate === 'boolean' ? a.interpolate : false,
      frames: Array.isArray(a.frames) ? (a.frames as number[]) : undefined,
      width: typeof a.width === 'number' ? a.width : undefined,
      height: typeof a.height === 'number' ? a.height : undefined,
    };
  } catch {
    // Corrupt .mcmeta — report the file exists but data is unknown.
    return {
      hasAnimation: true,
      frameCount: 1,
      frameHeight: dims.height,
      meta: null,
      rawMeta,
    };
  }

  // frameHeight is either explicitly declared (rare) or height / frameCount.
  // MC convention: single frame height = the texture width for square anims.
  // For a pack editor, the reliable way is: frameHeight = width (most MC anims
  // are square-framed). Fall back gracefully if height isn't a multiple.
  const frameHeight =
    parsed.height && parsed.height > 0 && dims.height % parsed.height === 0
      ? parsed.height
      : dims.width > 0 && dims.height % dims.width === 0
      ? dims.width
      : dims.height;

  const frameCount = Math.max(1, Math.floor(dims.height / frameHeight));

  return {
    hasAnimation: true,
    frameCount,
    frameHeight,
    meta: parsed,
    rawMeta,
  };
}

/**
 * Write a .png.mcmeta file next to the texture. If `meta` is null, deletes the
 * file (un-animates the texture).
 */
export async function writeAnimationMeta(
  root: string,
  textureRelPath: string,
  meta: AnimationMeta | null
): Promise<void> {
  const mcmetaAbs = resolveInside(root, `${textureRelPath}.mcmeta`);
  if (meta === null) {
    await fs.rm(mcmetaAbs, { force: true });
    return;
  }
  const animation: Record<string, unknown> = {
    frametime: meta.frametime,
  };
  if (meta.interpolate) animation.interpolate = true;
  if (meta.frames && meta.frames.length > 0) animation.frames = meta.frames;
  if (meta.width && meta.width > 0) animation.width = meta.width;
  if (meta.height && meta.height > 0) animation.height = meta.height;
  const payload = { animation };
  await fs.mkdir(path.dirname(mcmetaAbs), { recursive: true });
  await fs.writeFile(mcmetaAbs, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
}
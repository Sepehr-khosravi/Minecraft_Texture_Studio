import type { SkinModel } from '@shared/types/skin';

/**
 * Detect Steve (4px arms) or Alex (3px arms) from a loaded skin's ImageData.
 * Slim skins have a fully transparent 4th column on each arm face.
 * Samples the left-arm back column at x=47..50, y=52..63.
 */
export function detectModelFromImageData(data: ImageData): SkinModel {
  if (data.width !== 64 || data.height !== 64) return 'steve';
  let transparentCount = 0;
  for (let y = 52; y < 64; y++) {
    const i = (y * 64 + 51) * 4;
    if (data.data[i + 3] === 0) transparentCount++;
  }
  return transparentCount === 12 ? 'alex' : 'steve';
}

/** Read a PNG from disk via the skin IPC bridge and decode it to ImageData. */
export async function loadSkinImageData(absPath: string): Promise<ImageData> {
  const res = await window.api.skin.readFile(absPath);
  if (!res.ok) throw new Error(res.error);
  const bytes = res.data;

  const blob = new Blob([bytes as BlobPart], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  await img.decode();

  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error('Canvas not available.');
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  return ctx.getImageData(0, 0, c.width, c.height);
}
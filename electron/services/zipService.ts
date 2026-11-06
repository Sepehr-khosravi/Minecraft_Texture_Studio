import AdmZip from 'adm-zip';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  getLibraryRoot,
  validateNewPackName,
} from './library.js';
import { openPack, resolveInside } from './packService.js';
import type { OpenPack } from '@shared/types/pack';

/**
 * Recursively add files from a folder to a zip, skipping hidden files and
 * our own metadata. Paths in the zip are stored relative to `root`.
 */
async function addFolderToZip(
  zip: AdmZip,
  root: string,
  relDir: string,
  skip: Set<string>
): Promise<void> {
  const absDir = relDir === '' ? root : resolveInside(root, relDir);
  const entries = await fs.readdir(absDir, { withFileTypes: true });

  for (const entry of entries) {
    if (skip.has(entry.name)) continue;
    const rel = relDir === '' ? entry.name : `${relDir}/${entry.name}`;
    const abs = resolveInside(root, rel);
    if (entry.isDirectory()) {
      await addFolderToZip(zip, root, rel, skip);
    } else if (entry.isFile()) {
      const data = await fs.readFile(abs);
      zip.addFile(rel, data);
    }
  }
}

/** Export a pack as a .zip and write it to `destZipPath`. */
export async function exportPackAsZip(
  packRoot: string,
  destZipPath: string
): Promise<{ bytes: number; files: number }> {
  // Sanity: pack must be valid.
  await openPack(packRoot);

  const zip = new AdmZip();
  const skip = new Set(['.DS_Store', 'Thumbs.db']);
  await addFolderToZip(zip, packRoot, '', skip);

  const buffer = zip.toBuffer();
  await fs.writeFile(destZipPath, buffer);
  return { bytes: buffer.length, files: zip.getEntries().length };
}

/**
 * Extract a .zip into the library as a new pack named `name`.
 * Rejects dangerous paths (traversal), rejects non-packs (missing pack.mcmeta),
 * and never overwrites an existing pack.
 */
export async function importPackFromZip(
  zipPath: string,
  name: string
): Promise<OpenPack> {
  await validateNewPackName(name);
  const dest = path.join(getLibraryRoot(), name.trim());

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  // Detect a "wrapper folder" pattern: many zips contain one top-level folder
  // with everything inside. If so, strip it. Minecraft accepts both shapes,
  // but users expect the pack to open with files at the root.
  const topLevelNames = new Set(entries.map((e) => e.entryName.split('/')[0]));
  const hasPackMcmetaAtRoot = entries.some(
    (e) => e.entryName === 'pack.mcmeta'
  );
  const hasPackMcmetaInSingleFolder =
    topLevelNames.size === 1 &&
    entries.some(
      (e) =>
        e.entryName.startsWith([...topLevelNames][0] + '/') &&
        e.entryName === `${[...topLevelNames][0]}/pack.mcmeta`
    );
  const stripPrefix = hasPackMcmetaAtRoot
    ? ''
    : hasPackMcmetaInSingleFolder
    ? [...topLevelNames][0] + '/'
    : '';

  if (!hasPackMcmetaAtRoot && !hasPackMcmetaInSingleFolder) {
    throw new Error('Zip does not contain a pack.mcmeta file at its root.');
  }

  await fs.mkdir(dest, { recursive: true });

  try {
    for (const entry of entries) {
      let entryName = entry.entryName;
      if (stripPrefix && entryName.startsWith(stripPrefix)) {
        entryName = entryName.slice(stripPrefix.length);
      } else if (stripPrefix) {
        // Skip entries outside the wrapper folder.
        continue;
      }
      if (!entryName || entryName.endsWith('/')) continue;

      // Normalise and protect against traversal.
      const normalised = entryName.replace(/\\/g, '/');
      if (normalised.includes('..') || normalised.startsWith('/')) {
        throw new Error(`Unsafe path in zip: ${entryName}`);
      }

      const target = resolveInside(dest, normalised);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const data = entry.getData();
      await fs.writeFile(target, data);
    }

    // Validate after extraction — this catches corrupt packs too.
    return await openPack(dest);
  } catch (err) {
    // Clean up partial extraction so the library stays consistent.
    await fs.rm(dest, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}
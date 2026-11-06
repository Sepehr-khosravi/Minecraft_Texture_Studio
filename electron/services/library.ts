import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * The single folder where all managed packs live.
 * Path is per-OS via app.getPath('userData').
 */
export function getLibraryRoot(): string {
  return path.join(app.getPath('userData'), 'packs');
}

/** Ensure the library folder exists on disk. */
export async function ensureLibraryRoot(): Promise<string> {
  const root = getLibraryRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

/** A pack entry as it appears in the library list (before opening). */
export interface LibraryEntry {
  /** Folder name — used as the pack "id". */
  name: string;
  /** Absolute path to the pack folder. */
  path: string;
  /** ISO string of last modification, from fs.stat. */
  modifiedAt: string;
  /** True if a valid pack.mcmeta exists inside. */
  valid: boolean;
}

/**
 * List every pack folder in the library.
 * A folder is considered a pack if it contains `pack.mcmeta`.
 * Folders without one are still listed (valid: false) so the user can see
 * and delete them — but not open them.
 */
export async function listLibraryPacks(): Promise<LibraryEntry[]> {
  const root = await ensureLibraryRoot();
  const dirents = await fs.readdir(root, { withFileTypes: true });
  const entries: LibraryEntry[] = [];

  for (const d of dirents) {
    if (!d.isDirectory()) continue;
    const full = path.join(root, d.name);
    let modifiedAt = new Date(0).toISOString();
    let valid = false;
    try {
      const st = await fs.stat(full);
      modifiedAt = st.mtime.toISOString();
    } catch {
      // skip
    }
    try {
      await fs.access(path.join(full, 'pack.mcmeta'));
      valid = true;
    } catch {
      valid = false;
    }
    entries.push({ name: d.name, path: full, modifiedAt, valid });
  }

  entries.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  return entries;
}

/**
 * Validate a folder name for a new pack. Rejects path traversal, slashes,
 * empty strings, and names that already exist in the library.
 */
export async function validateNewPackName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Pack name cannot be empty.');
  if (/[\\/:*?"<>|]/.test(trimmed)) {
    throw new Error('Pack name cannot contain \\ / : * ? " < > |');
  }
  if (trimmed.startsWith('.')) {
    throw new Error('Pack name cannot start with a dot.');
  }

  const target = path.join(getLibraryRoot(), trimmed);
  try {
    await fs.access(target);
    throw new Error(`A pack named "${trimmed}" already exists.`);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') throw err;
  }
}

/**
 * Copy an external folder into the library.
 * Returns the destination path. Fails if destination already exists.
 */
export async function importExternalPack(
  sourcePath: string,
  name: string
): Promise<string> {
  await validateNewPackName(name);
  const dest = path.join(getLibraryRoot(), name.trim());

  // Sanity check: source must contain pack.mcmeta.
  try {
    await fs.access(path.join(sourcePath, 'pack.mcmeta'));
  } catch {
    throw new Error('Selected folder is not a valid resource pack (missing pack.mcmeta).');
  }

  await fs.cp(sourcePath, dest, { recursive: true });
  return dest;
}

/** Delete a pack folder. Refuses anything outside the library root. */
export async function deleteLibraryPack(name: string): Promise<void> {
  const root = getLibraryRoot();
  const target = path.resolve(root, name);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Refusing to delete outside library.');
  }
  if (target === root) throw new Error('Refusing to delete the library itself.');

  await fs.rm(target, { recursive: true, force: true });
}

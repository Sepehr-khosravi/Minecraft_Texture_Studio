import type { OpenPack } from '@shared/types/pack';

export interface CatalogEntry {
  id: string;
  name: string;
  path: string;
  size: number;
  category: string;
  frames?: number;
}

export interface CatalogPresence {
  entry: CatalogEntry;
  present: boolean;
}

let cache: Record<string, CatalogEntry[]> = {};

/** Load a catalog file bundled with the app (in public/catalogs/). */
export async function loadCatalog(name: string): Promise<CatalogEntry[]> {
  if (cache[name]) return cache[name];
  const res = await fetch(`/catalogs/${name}.json`);
  if (!res.ok) throw new Error(`Failed to load catalog: ${name}`);
  const data = (await res.json()) as CatalogEntry[];
  cache[name] = data;
  return data;
}

/** Set of existing paths in the pack, for quick "present" checks. */
export function buildPresentSet(pack: OpenPack): Set<string> {
  const set = new Set<string>();
  const walk = (node: OpenPack['tree']) => {
    if (node.type === 'file') set.add(node.path);
    node.children?.forEach(walk);
  };
  walk(pack.tree);
  return set;
}

/** Annotate catalog entries with presence in the pack. */
export function annotate(
  entries: CatalogEntry[],
  presentSet: Set<string>
): CatalogPresence[] {
  return entries.map((entry) => ({
    entry,
    present: presentSet.has(entry.path),
  }));
}
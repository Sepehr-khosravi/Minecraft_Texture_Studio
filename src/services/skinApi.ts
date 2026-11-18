import type { ApiResponse } from '@shared/types/pack';
import type { SkinEntry } from '../types/global';

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export const skinApi = {
  async list(): Promise<SkinEntry[]> {
    return unwrap(await window.api.skin.list());
  },
  root: () => window.api.skin.root(),
  async create(name: string): Promise<SkinEntry> {
    return unwrap(await window.api.skin.create(name));
  },
  async delete(fileName: string): Promise<void> {
    unwrap(await window.api.skin.delete(fileName));
  },
  pickImportFile: () => window.api.skin.pickImportFile(),
  async import(sourcePath: string, name: string): Promise<SkinEntry> {
    return unwrap(await window.api.skin.import({ sourcePath, name }));
  },
  async export(sourcePath: string, suggestedName: string): Promise<string | null> {
    return unwrap(await window.api.skin.export({ sourcePath, suggestedName }));
  },
  async readFile(absPath: string): Promise<Uint8Array> {
    return unwrap(await window.api.skin.readFile(absPath));
  },
  async writeFile(absPath: string, bytes: Uint8Array): Promise<void> {
    unwrap(await window.api.skin.writeFile({ absPath, bytes }));
  },
};
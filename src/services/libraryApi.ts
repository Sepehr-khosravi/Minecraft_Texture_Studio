import type { ApiResponse, LibraryEntry } from '@shared/types/pack';

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export const libraryApi = {
  async list(): Promise<LibraryEntry[]> {
    return unwrap(await window.api.library.list());
  },
  root: () => window.api.library.root(),
  async import(sourcePath: string, name: string): Promise<string> {
    return unwrap(await window.api.library.import({ sourcePath, name }));
  },
  async delete(name: string): Promise<void> {
    unwrap(await window.api.library.delete(name));
  },
  pickImportDir: () => window.api.library.pickImportDir(),
};

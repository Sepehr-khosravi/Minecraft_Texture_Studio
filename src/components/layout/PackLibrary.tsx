import { useEffect, useState } from 'react';
import { FolderPlus, FolderSearch, Package, RefreshCw, Trash2 } from 'lucide-react';
import type { LibraryEntry } from '@shared/types/pack';
import { libraryApi } from '../../services/libraryApi';
import '../../styles/library.css';

interface PackLibraryProps {
  onOpenPack(entry: LibraryEntry): void;
  onCreate(): void;
  busy: boolean;
}

export function PackLibrary({ onOpenPack, onCreate, busy }: PackLibraryProps) {
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [root, setRoot] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [list, rootPath] = await Promise.all([libraryApi.list(), libraryApi.root()]);
      setEntries(list);
      setRoot(rootPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library.');
      setEntries([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (entry: LibraryEntry) => {
    if (!confirm(`Delete "${entry.name}"? This removes the folder and cannot be undone.`)) {
      return;
    }
    try {
      await libraryApi.delete(entry.name);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleImport = async () => {
    const dir = await libraryApi.pickImportDir();
    if (!dir) return;
    const name = dir.split('/').pop() ?? 'Imported Pack';
    const chosenName = prompt('Name for the imported pack:', name);
    if (!chosenName) return;
    try {
      await libraryApi.import(dir, chosenName);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  if (entries === null) {
    return (
      <div className="library-loading">
        <span className="spinner" />
        <span>Loading packs…</span>
      </div>
    );
  }

  return (
    <div className="library">
      <div className="library-header">
        <div>
          <h1>Your packs</h1>
          <p>
            All packs are saved in <code>{root || '…'}</code>
          </p>
        </div>
        <div className="library-actions">
          <button className="toolbar-btn" onClick={load} title="Refresh">
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="toolbar-btn" onClick={handleImport}>
            <FolderSearch size={14} /> Import…
          </button>
          <button className="toolbar-btn primary" onClick={onCreate} disabled={busy}>
            <FolderPlus size={14} /> New Pack
          </button>
        </div>
      </div>

      {error && <div className="library-error">{error}</div>}

      {entries.length === 0 ? (
        <div className="library-empty">
          <Package size={48} />
          <h2>No packs yet</h2>
          <p>Create your first resource pack to get started.</p>
          <button className="toolbar-btn primary" onClick={onCreate} disabled={busy}>
            <FolderPlus size={15} /> Create pack
          </button>
        </div>
      ) : (
        <div className="library-grid">
          {entries.map((entry) => (
            <div key={entry.name} className="library-card">
              <button
                className="library-card-main"
                onClick={() => entry.valid && onOpenPack(entry)}
                disabled={!entry.valid}
                title={entry.valid ? entry.path : 'Missing pack.mcmeta'}
              >
                <div className="library-card-icon">
                  <Package size={22} />
                </div>
                <div className="library-card-info">
                  <span className="library-card-name">{entry.name}</span>
                  <span className="library-card-date">
                    {entry.valid ? 'Valid pack' : 'Missing pack.mcmeta'}
                  </span>
                </div>
              </button>
              <button
                className="icon-btn library-card-delete"
                onClick={() => handleDelete(entry)}
                title="Delete pack"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

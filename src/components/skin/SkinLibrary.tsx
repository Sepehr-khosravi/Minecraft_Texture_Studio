import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Upload, User } from 'lucide-react';
import { skinApi } from '../../services/skinApi';
import type { SkinEntry } from '../../types/global';
import '../../styles/skin.css';

interface SkinLibraryProps {
  onOpenSkin(entry: SkinEntry): void;
}

export function SkinLibrary({ onOpenSkin }: SkinLibraryProps) {
  const [entries, setEntries] = useState<SkinEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [root, setRoot] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [list, r] = await Promise.all([skinApi.list(), skinApi.root()]);
      setEntries(list);
      setRoot(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skins.');
      setEntries([]);
    }
  };

  useEffect(() => { load(); }, []);

  const handleNew = async () => {
    const name = prompt('Name for your new skin:', 'my_skin');
    if (!name) return;
    setBusy(true);
    try {
      const created = await skinApi.create(name);
      await load();
      onOpenSkin(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create skin.');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    const file = await skinApi.pickImportFile();
    if (!file) return;
    const suggested = file.split('/').pop()?.replace(/\.png$/i, '') ?? 'imported_skin';
    const name = prompt('Name for the imported skin:', suggested);
    if (!name) return;
    setBusy(true);
    try {
      await skinApi.import(file, name);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (entry: SkinEntry) => {
    if (!confirm(`Delete "${entry.id}"?`)) return;
    try {
      await skinApi.delete(entry.fileName);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleExport = async (entry: SkinEntry) => {
    try {
      const result = await skinApi.export(entry.path, entry.id);
      if (result) alert(`Exported to ${result}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  if (entries === null) {
    return <div className="skin-loading"><span className="spinner" />Loading skins…</div>;
  }

  return (
    <div className="skin-library">
      <div className="skin-library-header">
        <div>
          <h2>Skins</h2>
          <p className="skin-library-root">
            Saved in <code>{root || '…'}</code>
          </p>
        </div>
        <div className="skin-library-actions">
          <button className="toolbar-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
          <button className="toolbar-btn" onClick={handleImport} disabled={busy}>
            <Upload size={14} /> Import PNG
          </button>
          <button className="toolbar-btn primary" onClick={handleNew} disabled={busy}>
            <Plus size={14} /> New skin
          </button>
        </div>
      </div>

      {error && <div className="skin-error">{error}</div>}

      {entries.length === 0 ? (
        <div className="skin-empty">
          <User size={48} />
          <h3>No skins yet</h3>
          <p>Create a blank skin or import an existing one to get started.</p>
          <button className="toolbar-btn primary" onClick={handleNew}><Plus size={14} /> Create a skin</button>
        </div>
      ) : (
        <div className="skin-grid">
          {entries.map((entry) => (
            <div key={entry.id} className="skin-card">
              <button className="skin-card-main" onClick={() => onOpenSkin(entry)}>
                <div className="skin-card-preview">
                  <SkinPreview path={entry.path} />
                </div>
                <div className="skin-card-info">
                  <span className="skin-card-name">{entry.id}</span>
                  <span className="skin-card-meta">
                    {(entry.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              </button>
              <div className="skin-card-actions">
                <button className="skin-card-action" onClick={() => handleExport(entry)} title="Export as PNG">⬇</button>
                <button className="skin-card-action skin-card-action-danger" onClick={() => handleDelete(entry)} title="Delete">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Small inline preview: load PNG bytes, render as img. */
function SkinPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    skinApi.readFile(path).then((bytes) => {
      if (cancelled) return;
      const blob = new Blob([bytes as BlobPart], { type: 'image/png' });
      created = URL.createObjectURL(blob);
      setUrl(created);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [path]);

  return (
    <div className="skin-card-thumb">
      {url ? <img src={url} alt="" /> : <span className="skin-card-loading" />}
    </div>
  );
}
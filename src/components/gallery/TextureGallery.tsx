import { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Plus, Upload } from 'lucide-react';
import type { OpenPack, TextureCategory, TextureEntry } from '@shared/types/pack';
import { packApi } from '../../services/packApi';
import { TextureThumb } from './TextureThumb';
import '../../styles/gallery.css';

interface TextureGalleryProps {
  pack: OpenPack;
  onSelectionChange(entry: TextureEntry | null): void;
  onOpen(entry: TextureEntry): void;
  onPackChanged(): void;
  onNewTexture(): void;
}

const CATEGORIES: Array<{ id: TextureCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'block', label: 'Blocks' },
  { id: 'item', label: 'Items' },
  { id: 'entity', label: 'Entities' },
  { id: 'gui', label: 'GUI' },
  { id: 'particle', label: 'Particles' },
  { id: 'painting', label: 'Paintings' },
  { id: 'environment', label: 'Environment' },
  { id: 'misc', label: 'Misc' },
];

export function TextureGallery({
  pack,
  onSelectionChange,
  onOpen,
  onPackChanged,
  onNewTexture,
}: TextureGalleryProps) {
  const [entries, setEntries] = useState<TextureEntry[] | null>(null);
  const [category, setCategory] = useState<TextureCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<TextureEntry | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const dropTargetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    packApi
      .listTextures(pack.root, pack.tree)
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pack.root, pack.tree]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (category !== 'all' && e.category !== category) return false;
      if (q && !e.path.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, category, query]);

  const handleSelect = (entry: TextureEntry) => {
    setSelected(entry);
    onSelectionChange(entry);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    setImportError(null);

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith('.png')
    );
    if (files.length === 0) {
      setImportError('Drop one or more .png files.');
      return;
    }

    setImporting(true);
    try {
      for (const file of files) {
        const sourcePath = (file as File & { path?: string }).path;
        if (!sourcePath) {
          setImportError('Could not determine file path from drag.');
          continue;
        }
        const targetCategory = category === 'all' ? 'block' : category;
        const relPath = `assets/minecraft/textures/${targetCategory}/${file.name}`;
        await packApi.importTexture({
          root: pack.root,
          relPath,
          sourcePath,
          overwrite: false,
        });
      }
      onPackChanged();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  if (entries === null) {
    return (
      <div className="gallery-loading">
        <span className="spinner" />
        <span>Loading textures…</span>
      </div>
    );
  }

  return (
    <div
      ref={dropTargetRef}
      className={`gallery${dropActive ? ' drop-active' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDropActive(true);
        }
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={handleDrop}
    >
      <div className="gallery-toolbar">
        <div className="gallery-filters">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`gallery-filter${category === c.id ? ' active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          className="gallery-search field-input"
          placeholder="Search textures…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="toolbar-btn primary"
          onClick={onNewTexture}
          title="Create an empty texture"
        >
          <Plus size={14} /> New texture
        </button>
      </div>

      {importing && <div className="form-hint">Importing files…</div>}
      {importError && <div className="gallery-error">{importError}</div>}

      {filtered.length === 0 ? (
        <div className="gallery-empty">
          <ImageIcon size={36} />
          <p>
            {query
              ? 'No textures match your search.'
              : category !== 'all'
              ? `No textures in the ${category} category yet.`
              : 'This pack has no textures yet.'}
          </p>
          <button className="toolbar-btn primary" onClick={onNewTexture}>
            <Plus size={14} /> Create a texture
          </button>
          <span>Or drag PNG files here to import.</span>
        </div>
      ) : (
        <div className="gallery-grid">
          {filtered.map((entry) => (
            <TextureThumb
              key={entry.path}
              entry={entry}
              root={pack.root}
              selected={selected?.path === entry.path}
              onSelect={handleSelect}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}

      {dropActive && (
        <div className="gallery-drop-overlay">
          <Upload size={36} />
          <p>Drop PNG files to import</p>
        </div>
      )}
    </div>
  );
}
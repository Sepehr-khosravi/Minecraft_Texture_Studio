import { useEffect, useMemo, useState } from 'react';
import { Check, Image as ImageIcon, Plus, Search } from 'lucide-react';
import type { OpenPack } from '@shared/types/pack';
import { annotate, buildPresentSet, loadCatalog, type CatalogPresence } from '../../services/catalogService';
import '../../styles/catalog.css';

type Filter = 'all' | 'missing' | 'present';

interface CatalogBrowserProps {
  pack: OpenPack;
  disabled: boolean;
  onCreate(entry: { id: string; name: string; path: string; size: number; frames?: number }): void;
}

export function CatalogBrowser({ pack, disabled, onCreate }: CatalogBrowserProps) {
  const [entries, setEntries] = useState<CatalogPresence[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('missing');

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setError(null);
    loadCatalog('blocks')
      .then((catalog) => {
        if (cancelled) return;
        const presentSet = buildPresentSet(pack);
        setEntries(annotate(catalog, presentSet));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load catalog.');
      });
    return () => {
      cancelled = true;
    };
  }, [pack]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    return entries.filter((p) => {
      if (filter === 'missing' && p.present) return false;
      if (filter === 'present' && !p.present) return false;
      if (q && !p.entry.name.toLowerCase().includes(q) && !p.entry.id.includes(q)) return false;
      return true;
    });
  }, [entries, filter, query]);

  if (entries === null && !error) {
    return (
      <div className="catalog-loading">
        <span className="spinner" />
        <span>Loading catalog…</span>
      </div>
    );
  }

  if (error) {
    return <div className="catalog-error">{error}</div>;
  }

  const total = entries?.length ?? 0;
  const present = entries?.filter((e) => e.present).length ?? 0;
  const missing = total - present;

  return (
    <div className="catalog">
      <div className="catalog-toolbar">
        <div className="catalog-filters">
          <button
            className={`gallery-filter${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({total})
          </button>
          <button
            className={`gallery-filter${filter === 'missing' ? ' active' : ''}`}
            onClick={() => setFilter('missing')}
          >
            Not in pack ({missing})
          </button>
          <button
            className={`gallery-filter${filter === 'present' ? ' active' : ''}`}
            onClick={() => setFilter('present')}
          >
            In pack ({present})
          </button>
        </div>
        <div className="catalog-search-wrap">
          <Search size={14} className="catalog-search-icon" />
          <input
            className="gallery-search field-input catalog-search"
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="catalog-empty">
          <ImageIcon size={36} />
          <p>{query ? 'No blocks match your search.' : 'Nothing in this filter.'}</p>
        </div>
      ) : (
        <div className="catalog-grid">
          {filtered.map(({ entry, present }) => (
            <div
              key={entry.id}
              className={`catalog-card${present ? ' catalog-card-present' : ''}`}
            >
              <div className="catalog-card-icon">
                {present ? <Check size={18} /> : <ImageIcon size={18} />}
              </div>
              <div className="catalog-card-info">
                <span className="catalog-card-name">{entry.name}</span>
                <span className="catalog-card-meta">
                  {entry.size}×{entry.size}
                  {entry.frames ? ` · ${entry.frames} frames` : ''}
                </span>
              </div>
              {present ? (
                <span className="catalog-card-badge">In pack</span>
              ) : (
                <button
                  className="toolbar-btn primary catalog-card-btn"
                  disabled={disabled}
                  onClick={() => onCreate(entry)}
                  title="Create this texture and open it in the editor"
                >
                  <Plus size={12} /> Create
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
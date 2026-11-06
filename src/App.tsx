import { useEffect, useState } from 'react';
import {
  Blocks, Download, Files, Home, LayoutGrid, Plus, Settings2,
} from 'lucide-react';
import { WindowControls } from './components/layout/WindowControls';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { NewPackDialog } from './components/layout/NewPackDialog';
import { PackWarnings } from './components/layout/PackWarnings';
import { PackLibrary } from './components/layout/PackLibrary';
import { TextureGallery } from './components/gallery/TextureGallery';
import { TextureEditor } from './components/editor/TextureEditor';
import { NewTextureDialog, type NewTextureOptions } from './components/gallery/NewTextureDialog';
import { CatalogBrowser } from './components/catalog/CatalogBrowser';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { usePack } from './hooks/usePack';
import { packApi } from './services/packApi';
import type { LibraryEntry, PackNode, TextureEntry } from '@shared/types/pack';
import './styles/app-shell.css';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

type View = 'files' | 'catalog';

export default function App() {
  const [version, setVersion] = useState<string>('');
  const [maximized, setMaximized] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showNewTexture, setShowNewTexture] = useState(false);
  const [newTextureError, setNewTextureError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<TextureEntry | null>(null);
  const [galleryKey, setGalleryKey] = useState(0);
  const [libraryKey, setLibraryKey] = useState(0);
  const [view, setView] = useState<View>('files');

  const { pack, status, error, createNew, openExisting, closePack, clearError, applyPack } = usePack();
  const busy = status === 'busy';

  useEffect(() => {
    if (!window.api) return;
    window.api.app.getVersion().then(setVersion).catch(() => setVersion('?'));
    window.api.window.isMaximized().then(setMaximized);
    return window.api.window.onMaximizedChanged(setMaximized);
  }, []);

  useEffect(() => {
    if (showCreate && pack) setShowCreate(false);
  }, [pack, showCreate]);

  const handleCreate = async (input: Parameters<typeof createNew>[0]) => {
    await createNew(input);
  };

  const handleOpenFromLibrary = async (entry: LibraryEntry) => {
    await openExisting(entry.path);
    setView('files');
  };

  const handleClosePack = () => {
    setSelectedPath(null);
    setEditingEntry(null);
    closePack();
    setLibraryKey((k) => k + 1);
    setView('files');
  };

  const handleFileSelect = (node: PackNode) => setSelectedPath(node.path);

  const handleCreateTexture = async (opts: NewTextureOptions) => {
    if (!pack) return;
    setNewTextureError(null);
    try {
      const relPath = `assets/minecraft/textures/${opts.category}/${opts.fileName}.png`;
      let updated;
      if (opts.animated) {
        updated = await packApi.createAnimatedTexture({
          root: pack.root,
          relPath,
          frameWidth: opts.frameWidth,
          frameHeight: opts.frameHeight,
          frameCount: opts.frameCount,
          frametime: opts.frametime,
          interpolate: opts.interpolate,
        });
      } else {
        updated = await packApi.createTexture({
          root: pack.root,
          relPath,
          width: opts.width,
          height: opts.height,
          fill: opts.fill,
        });
      }
      applyPack(updated);
      setShowNewTexture(false);
      setGalleryKey((k) => k + 1);
    } catch (err) {
      setNewTextureError(err instanceof Error ? err.message : 'Failed to create texture.');
    }
  };

  const handleCatalogCreate = async (entry: {
    id: string;
    name: string;
    path: string;
    size: number;
    frames?: number;
  }) => {
    if (!pack) return;
    try {
      let updated;
      if (entry.frames && entry.frames > 1) {
        updated = await packApi.createAnimatedTexture({
          root: pack.root,
          relPath: entry.path,
          frameWidth: entry.size,
          frameHeight: entry.size,
          frameCount: entry.frames,
          frametime: 1,
          interpolate: false,
        });
      } else {
        updated = await packApi.createTexture({
          root: pack.root,
          relPath: entry.path,
          width: entry.size,
          height: entry.size,
          fill: 'transparent',
        });
      }
      applyPack(updated);
      setGalleryKey((k) => k + 1);

      // ⚠ FIX: query the real dimensions from disk — do not trust `entry.size`
      // or compute height from `entry.frames`. The file on disk is authoritative.
      let real: TextureEntry | null = null;
      try {
        const list = await packApi.listTextures(updated.root, updated.tree);
        const hit = list.find((e) => e.path === entry.path);
        if (hit) real = hit;
      } catch {
        // fall through to the fallback below
      }
      if (!real) {
        // Fallback: read the tree node; we still cannot read dims from tree,
        // so use the pack's declared size only if no better option exists.
        real = {
          path: entry.path,
          name: entry.path.split('/').pop() ?? entry.id,
          width: entry.size,
          height: entry.frames ? entry.size * entry.frames : entry.size,
          sizeBytes: 0,
          category: 'block',
        };
      }
      setView('files');
      setEditingEntry(real);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create texture.');
    }
  };

  const handleExport = async () => {
    if (!pack) return;
    try {
      const result = await packApi.exportZip(pack.root);
      if (!result) return;
      alert(`Exported ${result.files} files (${formatBytes(result.bytes)}).`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  return (
    <div className={`app-shell${maximized ? ' maximized' : ''}`}>
      <header className="app-toolbar">
        <div className="brand">
          <span className="brand-logo"><Blocks size={16} /></span>
          <span>Resource Pack Studio</span>
        </div>

        {!pack ? (
          <button
            className="toolbar-btn primary"
            disabled={busy}
            onClick={() => { clearError(); setShowCreate(true); }}
          >
            <Plus size={15} /> New Pack
          </button>
        ) : (
          <button className="toolbar-btn" onClick={handleClosePack} title="Back to library">
            <Home size={15} /> Back to library
          </button>
        )}

        <div className="toolbar-spacer" />

        <button className="toolbar-btn" disabled>
          <Settings2 size={15} /> Settings
        </button>

        <WindowControls />
      </header>

      <div className={`app-body${pack ? ' has-pack' : ' no-pack'}`}>
        {pack && (
          <LeftSidebar
            pack={pack}
            onFileSelect={handleFileSelect}
            selectedPath={selectedPath}
          />
        )}

        <main className="workspace">
          {!pack ? (
            <PackLibrary
              key={libraryKey}
              onOpenPack={handleOpenFromLibrary}
              onCreate={() => { clearError(); setShowCreate(true); }}
              busy={busy}
            />
          ) : (
            <div className="workspace-inner">
              <div className="workspace-topbar">
                <div className="workspace-title">
                  <h1>{pack.name}</h1>
                  <p>{pack.meta.description || 'No description.'}</p>
                </div>
                <div className="workspace-topbar-actions">
                  <button
                    className="toolbar-btn"
                    onClick={handleExport}
                    title="Export this pack as a .zip file"
                  >
                    <Download size={14} /> Export .zip
                  </button>
                  <button
                    className="toolbar-btn"
                    onClick={handleClosePack}
                    title="Close this pack and return to the library"
                  >
                    <Home size={15} /> Close Pack
                  </button>
                </div>
              </div>

              <div className="view-tabs">
                <button
                  className={`view-tab${view === 'files' ? ' active' : ''}`}
                  onClick={() => { setView('files'); setEditingEntry(null); }}
                >
                  <Files size={14} /> My files
                </button>
                <button
                  className={`view-tab${view === 'catalog' ? ' active' : ''}`}
                  onClick={() => { setView('catalog'); setEditingEntry(null); }}
                >
                  <LayoutGrid size={14} /> Catalog
                </button>
              </div>

              <PackWarnings
                warnings={pack.warnings}
                onInspect={(path) => setSelectedPath(path)}
              />

              {editingEntry ? (
                <ErrorBoundary fallbackLabel="Texture editor">
                  <TextureEditor
                    pack={pack}
                    entry={editingEntry}
                    onClose={() => setEditingEntry(null)}
                    onSaved={() => setGalleryKey((k) => k + 1)}
                  />
                </ErrorBoundary>
              ) : view === 'catalog' ? (
                <ErrorBoundary fallbackLabel="Catalog">
                  <CatalogBrowser
                    pack={pack}
                    disabled={busy}
                    onCreate={handleCatalogCreate}
                  />
                </ErrorBoundary>
              ) : (
                <ErrorBoundary fallbackLabel="Texture gallery">
                  <TextureGallery
                    key={galleryKey}
                    pack={pack}
                    onSelectionChange={(entry) => setSelectedPath(entry?.path ?? null)}
                    onOpen={(entry) => setEditingEntry(entry)}
                    onPackChanged={() => setGalleryKey((k) => k + 1)}
                    onNewTexture={() => {
                      setNewTextureError(null);
                      setShowNewTexture(true);
                    }}
                  />
                </ErrorBoundary>
              )}
            </div>
          )}
        </main>
      </div>

      <footer className="statusbar">
        <span>
          <span className="dot" /> {busy ? 'Working…' : pack ? 'Pack open' : 'Library'}
        </span>
        {pack && (
          <>
            <span>{pack.stats.fileCount} files</span>
            <span>{pack.stats.textureCount} textures</span>
            {pack.warnings.length > 0 && (
              <span style={{ color: 'var(--warning)' }}>
                {pack.warnings.length} invalid texture{pack.warnings.length === 1 ? '' : 's'}
              </span>
            )}
            <span>{formatBytes(pack.stats.totalBytes)}</span>
            <span className="statusbar-pack-name" title={pack.root}>{pack.name}</span>
          </>
        )}
        <span className="statusbar-spacer" />
        <span>v{version}</span>
      </footer>

      <NewPackDialog
        open={showCreate}
        onCancel={() => setShowCreate(false)}
        onCreate={handleCreate}
        busy={busy}
        error={error}
      />

      {pack && (
        <NewTextureDialog
          open={showNewTexture}
          busy={busy}
          error={newTextureError}
          onCancel={() => setShowNewTexture(false)}
          onCreate={handleCreateTexture}
        />
      )}
    </div>
  );
}
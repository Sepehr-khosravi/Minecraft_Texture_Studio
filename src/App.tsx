import { useEffect, useState } from 'react';
import {
  Blocks, ChevronLeft, Download, Files, Home, LayoutGrid, Plus, Settings2, User,
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
import { HomeScreen } from './components/home/HomeScreen';
import { SkinEditor } from './components/skin/SkinEditor';
import { SkinTemplatePicker } from './components/skin/SkinTemplatePicker';
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

type Mode = 'home' | 'pack' | 'skin';
type View = 'files' | 'catalog';
type SkinModel = 'steve' | 'alex';

export default function App() {
  const [version, setVersion] = useState<string>('');
  const [maximized, setMaximized] = useState(false);
  const [mode, setMode] = useState<Mode>('home');

  const [showCreate, setShowCreate] = useState(false);
  const [showNewTexture, setShowNewTexture] = useState(false);
  const [newTextureError, setNewTextureError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<TextureEntry | null>(null);
  const [galleryKey, setGalleryKey] = useState(0);
  const [libraryKey, setLibraryKey] = useState(0);
  const [view, setView] = useState<View>('files');
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Skin state
  const [skinEditorOpen, setSkinEditorOpen] = useState(false);
  const [showSkinTemplate, setShowSkinTemplate] = useState(false);
  const [skinModel, setSkinModel] = useState<SkinModel>('steve');

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

  const handleOpenHome = () => {
    setSelectedPath(null);
    setEditingEntry(null);
    setSkinEditorOpen(false);
    setShowSkinTemplate(false);
    closePack();
    setMode('home');
  };

  const handlePickPacks = () => setMode('pack');

  const handlePickSkins = () => {
    setMode('skin');
    setShowSkinTemplate(true);
  };

  const handleSkinTemplatePicked = (model: SkinModel) => {
    setSkinModel(model);
    setShowSkinTemplate(false);
    setSkinEditorOpen(true);
  };

  const handleSkinTemplateCancel = () => {
    setShowSkinTemplate(false);
    setMode('home');
  };

  const handleCreate = async (input: Parameters<typeof createNew>[0]) => await createNew(input);
  const handleOpenFromLibrary = async (entry: LibraryEntry) => { await openExisting(entry.path); setView('files'); };
  const handleClosePack = () => { setSelectedPath(null); setEditingEntry(null); closePack(); setLibraryKey((k) => k + 1); setView('files'); };
  const handleFileSelect = (node: PackNode) => setSelectedPath(node.path);

  const handleCreateTexture = async (opts: NewTextureOptions) => {
    if (!pack) return;
    setNewTextureError(null);
    try {
      const relPath = `assets/minecraft/textures/${opts.category}/${opts.fileName}.png`;
      let updated;
      if (opts.animated) {
        updated = await packApi.createAnimatedTexture({ root: pack.root, relPath, frameWidth: opts.frameWidth, frameHeight: opts.frameHeight, frameCount: opts.frameCount, frametime: opts.frametime, interpolate: opts.interpolate });
      } else {
        updated = await packApi.createTexture({ root: pack.root, relPath, width: opts.width, height: opts.height, fill: opts.fill });
      }
      applyPack(updated); setShowNewTexture(false); setGalleryKey((k) => k + 1);
    } catch (err) { setNewTextureError(err instanceof Error ? err.message : 'Failed to create texture.'); }
  };
  const handleCatalogCreate = async (entry: {
    id: string;
    name: string;
    path: string;
    size: number;
    frames?: number;
    imageUrl?: string;
    downloadUrl?: string;
  }) => {
    if (!pack) return;
    try {
      // 1. ساخت مسیر کامل لوکال با BASE_URL
      const baseUrl = import.meta.env.BASE_URL;
      const localUrl = entry.downloadUrl || entry.imageUrl || '';
      const fullUrl = `${baseUrl}${localUrl.replace(/^\//, '')}`;
      
      // 2. خواندن فایل از مسیر لوکال
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error('Could not fetch texture file.');
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
  
      // 3. نوشتن فایل در پک
      await packApi.writeTexture(pack.root, entry.path, bytes);
      
      // 4. رفرش کردن پک
      const updated = await packApi.open(pack.root);
      applyPack(updated);
      setGalleryKey((k) => k + 1);
  
      // 5. باز کردن در ادیتور
      let real: TextureEntry | null = null;
      try {
        const list = await packApi.listTextures(updated.root, updated.tree);
        const hit = list.find((e) => e.path === entry.path);
        if (hit) real = hit;
      } catch { /* ignore */ }
      
      if (!real) {
        real = {
          path: entry.path,
          name: entry.path.split('/').pop() ?? entry.id,
          width: entry.size,
          height: entry.size,
          sizeBytes: 0,
          category: 'block',
        };
      }
      
      setView('files');
      setEditingEntry(real);
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to copy texture from local assets.');
    }
  };

  const handleRequestDelete = (path: string) => { if (!pack) return; const name = path.split('/').pop() ?? path; setDeleteError(null); setDeleteTarget({ path, name }); };

  const handleConfirmDelete = async () => {
    if (!pack || !deleteTarget) return;
    setDeleteBusy(true); setDeleteError(null);
    try {
      const updated = await packApi.deleteEntry(pack.root, deleteTarget.path);
      applyPack(updated);
      if (editingEntry?.path === deleteTarget.path) setEditingEntry(null);
      if (selectedPath === deleteTarget.path) setSelectedPath(null);
      setGalleryKey((k) => k + 1); setDeleteTarget(null);
    } catch (err) { setDeleteError(err instanceof Error ? err.message : 'Failed to delete.'); }
    finally { setDeleteBusy(false); }
  };

  const handleExport = async () => {
    if (!pack) return;
    try { const result = await packApi.exportZip(pack.root); if (!result) return; alert(`Exported ${result.files} files (${formatBytes(result.bytes)}).`); }
    catch (err) { alert(err instanceof Error ? err.message : 'Export failed.'); }
  };

  // ── Skin mode: full-screen editor ──
  if (mode === 'skin' && skinEditorOpen) {
    return (
      <div className={`app-shell${maximized ? ' maximized' : ''}`} style={{ gridTemplateRows: '1fr' }}>
        <ErrorBoundary fallbackLabel="Skin editor">
<SkinEditor initialModel={skinModel} onClose={() => setSkinEditorOpen(false)} />
        </ErrorBoundary>
      </div>
    );
  }

  const renderTopbar = () => {
    if (mode === 'home') {
      return (
        <header className="app-toolbar">
          <div className="brand"><span className="brand-logo"><Blocks size={16} /></span><span>Resource Pack Studio</span></div>
          <div className="toolbar-spacer" />
          <WindowControls />
        </header>
      );
    }
    if (mode === 'pack') {
      return (
        <header className="app-toolbar">
          <button className="toolbar-btn" onClick={handleOpenHome}><ChevronLeft size={15} /> Home</button>
          <div className="brand"><span className="brand-logo"><Blocks size={16} /></span><span>Pack Studio</span></div>
          {!pack ? (
            <button className="toolbar-btn primary" disabled={busy} onClick={() => { clearError(); setShowCreate(true); }}><Plus size={15} /> New Pack</button>
          ) : (
            <button className="toolbar-btn" onClick={handleClosePack}><Home size={15} /> Library</button>
          )}
          <div className="toolbar-spacer" />
          <button className="toolbar-btn" disabled><Settings2 size={15} /> Settings</button>
          <WindowControls />
        </header>
      );
    }
    return (
      <header className="app-toolbar" style={{ borderBottomColor: 'rgba(224, 165, 38, 0.3)' }}>
        <button className="toolbar-btn" onClick={handleOpenHome}><ChevronLeft size={15} /> Home</button>
        <div className="brand">
          <span className="brand-logo" style={{ background: 'linear-gradient(140deg, #e0a526, #f0b637)', color: '#1a1d21' }}><User size={15} /></span>
          <span>Skin Studio</span>
        </div>
        <div className="toolbar-spacer" />
        <WindowControls />
      </header>
    );
  };

  return (
    <div className={`app-shell${maximized ? ' maximized' : ''}`}>
      {renderTopbar()}
      <div className={`app-body${mode === 'pack' && pack ? ' has-pack' : ' no-pack'}`}>
        {mode === 'pack' && pack && <LeftSidebar pack={pack} onFileSelect={handleFileSelect} selectedPath={selectedPath} onRequestDelete={handleRequestDelete} />}
        <main className="workspace">
          {mode === 'home' && <HomeScreen onPickPacks={handlePickPacks} onPickSkins={handlePickSkins} />}
          {mode === 'skin' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, flex: 1 }}>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Skin editor closed.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="toolbar-btn primary" onClick={() => setShowSkinTemplate(true)}>
                  <Plus size={14} /> New skin
                </button>
                <button className="toolbar-btn" onClick={handleOpenHome}>
                  <Home size={14} /> Home
                </button>
              </div>
            </div>
          )}
          {mode === 'pack' && (
            <>
              {!pack ? (
                <PackLibrary key={libraryKey} onOpenPack={handleOpenFromLibrary} onCreate={() => { clearError(); setShowCreate(true); }} busy={busy} />
              ) : (
                <div className="workspace-inner">
                  <div className="workspace-topbar">
                    <div className="workspace-title"><h1>{pack.name}</h1><p>{pack.meta.description || 'No description.'}</p></div>
                    <div className="workspace-topbar-actions">
                      <button className="toolbar-btn" onClick={handleExport}><Download size={14} /> Export .zip</button>
                      <button className="toolbar-btn" onClick={handleClosePack}><Home size={15} /> Close Pack</button>
                    </div>
                  </div>
                  <div className="view-tabs">
                    <button className={`view-tab${view === 'files' ? ' active' : ''}`} onClick={() => { setView('files'); setEditingEntry(null); }}><Files size={14} /> My files</button>
                    <button className={`view-tab${view === 'catalog' ? ' active' : ''}`} onClick={() => { setView('catalog'); setEditingEntry(null); }}><LayoutGrid size={14} /> Catalog</button>
                  </div>
                  <PackWarnings warnings={pack.warnings} onInspect={(path) => setSelectedPath(path)} />
                  {editingEntry ? (
                    <ErrorBoundary fallbackLabel="Texture editor"><TextureEditor pack={pack} entry={editingEntry} onClose={() => setEditingEntry(null)} onSaved={() => setGalleryKey((k) => k + 1)} /></ErrorBoundary>
                  ) : view === 'catalog' ? (
                    <ErrorBoundary fallbackLabel="Catalog"><CatalogBrowser pack={pack} disabled={busy} onCreate={handleCatalogCreate} /></ErrorBoundary>
                  ) : (
                    <ErrorBoundary fallbackLabel="Texture gallery"><TextureGallery key={galleryKey} pack={pack} onSelectionChange={(entry) => setSelectedPath(entry?.path ?? null)} onOpen={(entry) => setEditingEntry(entry)} onPackChanged={() => setGalleryKey((k) => k + 1)} onNewTexture={() => { setNewTextureError(null); setShowNewTexture(true); }} onRequestDelete={handleRequestDelete} /></ErrorBoundary>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <footer className="statusbar">
        <span><span className="dot" /> {busy ? 'Working…' : mode === 'home' ? 'Ready' : mode === 'skin' ? 'Skin Studio' : pack ? 'Pack open' : 'Pack Library'}</span>
        {mode === 'pack' && pack && (<><span>{pack.stats.fileCount} files</span><span>{pack.stats.textureCount} textures</span><span>{formatBytes(pack.stats.totalBytes)}</span><span className="statusbar-pack-name" title={pack.root}>{pack.name}</span></>)}
        <span className="statusbar-spacer" /><span>v{version}</span>
      </footer>
      <NewPackDialog open={showCreate} onCancel={() => setShowCreate(false)} onCreate={handleCreate} busy={busy} error={error} />
      {mode === 'pack' && pack && (<NewTextureDialog open={showNewTexture} busy={busy} error={newTextureError} onCancel={() => setShowNewTexture(false)} onCreate={handleCreateTexture} />)}
      <SkinTemplatePicker
        open={showSkinTemplate}
        onPick={handleSkinTemplatePicked}
        onCancel={handleSkinTemplateCancel}
      />
      {deleteTarget && (
        <div className="modal-backdrop" onMouseDown={() => !deleteBusy && setDeleteTarget(null)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <header className="modal-header"><h3>Delete "{deleteTarget.name}"</h3></header>
            <div className="modal-body">
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>This will permanently remove <code>{deleteTarget.path}</code>.</p>
              {deleteError && <div className="form-error">{deleteError}</div>}
            </div>
            <footer className="modal-footer">
              <button className="toolbar-btn" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>Cancel</button>
              <button className="toolbar-btn" style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' }} onClick={handleConfirmDelete} disabled={deleteBusy}>{deleteBusy ? 'Deleting…' : 'Delete'}</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
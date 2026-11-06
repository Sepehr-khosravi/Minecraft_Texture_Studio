import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, Maximize, Minus, Plus, Redo2, Save, Undo2, Eye, EyeOff, Film,
} from 'lucide-react';
import type {
  AnimationMeta,
  OpenPack,
  TextureAnimationInfo,
  TextureEntry,
} from '@shared/types/pack';
import { packApi } from '../../services/packApi';
import { useEditorHistory } from '../../hooks/useEditorHistory';
import { useAnimationPreview } from '../../hooks/useAnimationPreview';
import { ToolRail, type EditorTool } from './ToolRail';
import { AnimationPanel } from './AnimationPanel';
import '../../styles/editor.css';

interface TextureEditorProps {
  pack: OpenPack;
  entry: TextureEntry;
  onClose(): void;
  onSaved(): void;
}

const ZOOM_STEPS = [1, 2, 4, 8, 12, 16, 24, 32, 48, 64];

function nearestZoomStep(z: number): number {
  return ZOOM_STEPS.reduce(
    (best, step) => (Math.abs(step - z) < Math.abs(best - z) ? step : best),
    ZOOM_STEPS[0]
  );
}

function insertFrame(src: ImageData, frameHeight: number, atFrame: number): ImageData {
  const frameCount = Math.max(1, Math.floor(src.height / frameHeight));
  const insertAt = Math.max(0, Math.min(frameCount, atFrame));
  const newHeight = src.height + frameHeight;
  const out = new ImageData(src.width, newHeight);
  out.data.set(src.data.subarray(0, insertAt * frameHeight * src.width * 4), 0);
  const sourceFrame = Math.max(0, Math.min(frameCount - 1, insertAt - 1));
  const startSrc = sourceFrame * frameHeight * src.width * 4;
  const sliceLen = frameHeight * src.width * 4;
  const startDst = insertAt * sliceLen;
  out.data.set(src.data.subarray(startSrc, startSrc + sliceLen), startDst);
  const startSrcAfter = insertAt * sliceLen;
  const startDstAfter = (insertAt + 1) * sliceLen;
  out.data.set(src.data.subarray(startSrcAfter), startDstAfter);
  return out;
}

function removeFrame(src: ImageData, frameHeight: number, frameIndex: number): ImageData {
  const frameCount = Math.max(1, Math.floor(src.height / frameHeight));
  if (frameCount <= 1) return src;
  const removeAt = Math.max(0, Math.min(frameCount - 1, frameIndex));
  const sliceLen = frameHeight * src.width * 4;
  const out = new ImageData(src.width, src.height - frameHeight);
  out.data.set(src.data.subarray(0, removeAt * sliceLen), 0);
  out.data.set(src.data.subarray((removeAt + 1) * sliceLen), removeAt * sliceLen);
  return out;
}

export function TextureEditor({ pack, entry, onClose, onSaved }: TextureEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [tool, setTool] = useState<EditorTool>('pencil');
  const [brushSize, setBrushSize] = useState(1);
  const [color, setColor] = useState('#ffffff');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [canvasDims, setCanvasDims] = useState({ w: 0, h: 0 });

  const [animationInfo, setAnimationInfo] = useState<TextureAnimationInfo | null>(null);
  const [pendingMeta, setPendingMeta] = useState<AnimationMeta | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [animPanelOpen, setAnimPanelOpen] = useState(false);

  const history = useEditorHistory();
  const preview = useAnimationPreview(animationInfo, previewMode);
  const drawingRef = useRef(false);
  const lastPixelRef = useRef<{ x: number; y: number } | null>(null);
  const panStateRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const sourceCanvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 0;
    c.height = 0;
    return c;
  }, []);
  sourceCanvasRef.current = sourceCanvas;

  const uploadToSource = useCallback(() => {
    const data = imageDataRef.current;
    if (!data) return;
    if (sourceCanvas.width !== data.width) sourceCanvas.width = data.width;
    if (sourceCanvas.height !== data.height) sourceCanvas.height = data.height;
    const sctx = sourceCanvas.getContext('2d');
    if (!sctx) return;
    sctx.putImageData(data, 0, 0);
  }, [sourceCanvas]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const data = imageDataRef.current;
    if (!canvas || !data) return;

    if (!previewMode || !animationInfo?.hasAnimation) {
      if (canvas.width !== data.width) canvas.width = data.width;
      if (canvas.height !== data.height) canvas.height = data.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(data, 0, 0);
      return;
    }

    const frameHeight = animationInfo.frameHeight;
    const frameWidth = data.width;
    if (canvas.width !== frameWidth) canvas.width = frameWidth;
    if (canvas.height !== frameHeight) canvas.height = frameHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, frameWidth, frameHeight);
    uploadToSource();
    ctx.drawImage(
      sourceCanvas,
      0,
      preview.frameIndex * frameHeight,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth,
      frameHeight
    );
  }, [animationInfo, preview.frameIndex, previewMode, sourceCanvas, uploadToSource]);

  const refreshBlobUrl = useCallback(async () => {
    const data = imageDataRef.current;
    if (!data) return;
    const tmp = document.createElement('canvas');
    tmp.width = data.width;
    tmp.height = data.height;
    tmp.getContext('2d')?.putImageData(data, 0, 0);
    const blob: Blob | null = await new Promise((resolve) =>
      tmp.toBlob((b) => resolve(b), 'image/png')
    );
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const reload = useCallback(async () => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setDirty(false);
    imageDataRef.current = null;
    setCanvasDims({ w: 0, h: 0 });
    setAnimationInfo(null);
    setPreviewMode(false);
    setAnimPanelOpen(false);
    history.reset(null);

    try {
      const bytes = await packApi.readTexture(pack.root, entry.path);
      if (cancelled) return;

      const blob = new Blob([bytes as BlobPart], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      await img.decode();

      const realWidth = img.naturalWidth;
      const realHeight = img.naturalHeight;
      if (realWidth === 0 || realHeight === 0) {
        URL.revokeObjectURL(url);
        throw new Error('Texture has no dimensions.');
      }

      const off = document.createElement('canvas');
      off.width = realWidth;
      off.height = realHeight;
      const ctx = off.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas 2D context not available.');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);

      const data = ctx.getImageData(0, 0, realWidth, realHeight);
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }

      imageDataRef.current = data;
      setCanvasDims({ w: realWidth, h: realHeight });
      history.reset(data);

      const info = await packApi.inspectAnimation(pack.root, entry.path);
      if (!cancelled) {
        setAnimationInfo(info);
        setPendingMeta(info.meta);
        setAnimPanelOpen(info.hasAnimation);
      }

      const container = containerRef.current;
      if (container && container.clientWidth > 0) {
        const pad = 96;
        const fit = Math.min(
          (container.clientWidth - pad) / realWidth,
          (container.clientHeight - pad) / realHeight
        );
        setZoom(nearestZoomStep(Math.max(1, fit)));
      } else {
        setZoom(nearestZoomStep(16));
      }
      setOffset({ x: 0, y: 0 });

      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setLoading(false);
    } catch (err) {
      if (cancelled) return;
      setLoadError(err instanceof Error ? err.message : 'Failed to load texture.');
      setLoading(false);
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.root, entry.path]);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.root, entry.path]);

  useEffect(() => {
    render();
  }, [render, canvasDims, previewMode, preview.frameIndex]);

  // -------- Drawing --------
  const screenToPixel = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = Math.floor(((clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((clientY - rect.top) / rect.height) * canvas.height);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;

    if (previewMode && animationInfo?.hasAnimation) {
      return { x, y: y + preview.frameIndex * animationInfo.frameHeight };
    }
    return { x, y };
  };

  const paintAt = useCallback((px: number, py: number, erase: boolean) => {
    const data = imageDataRef.current;
    if (!data) return;

    const hex = color.replace('#', '').padEnd(6, '0');
    const r = parseInt(hex.slice(0, 2), 16) || 0;
    const g = parseInt(hex.slice(2, 4), 16) || 0;
    const b = parseInt(hex.slice(4, 6), 16) || 0;

    const half = Math.floor(brushSize / 2);
    for (let dy = 0; dy < brushSize; dy++) {
      for (let dx = 0; dx < brushSize; dx++) {
        const x = px - half + dx;
        const y = py - half + dy;
        if (x < 0 || y < 0 || x >= data.width || y >= data.height) continue;
        const i = (y * data.width + x) * 4;
        if (erase) {
          data.data[i] = 0; data.data[i + 1] = 0;
          data.data[i + 2] = 0; data.data[i + 3] = 0;
        } else {
          data.data[i] = r; data.data[i + 1] = g;
          data.data[i + 2] = b; data.data[i + 3] = 255;
        }
      }
    }
    render();
  }, [brushSize, color, render]);

  const lineAt = useCallback((from: { x: number; y: number }, to: { x: number; y: number }, erase: boolean) => {
    let x0 = from.x, y0 = from.y;
    const x1 = to.x, y1 = to.y;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let guard = 10000;
    while (guard-- > 0) {
      paintAt(x0, y0, erase);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }, [paintAt]);

  const eyedropAt = useCallback((px: number, py: number) => {
    const data = imageDataRef.current;
    if (!data) return;
    const i = (py * data.width + px) * 4;
    const a = data.data[i + 3];
    if (a === 0) return;
    const hex = '#' + [data.data[i], data.data[i + 1], data.data[i + 2]]
      .map((n) => n.toString(16).padStart(2, '0')).join('');
    setColor(hex);
    setTool('pencil');
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (spacePressed || e.button === 1) {
      panStateRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    const p = screenToPixel(e.clientX, e.clientY);
    if (!p) return;
    if (tool === 'eyedropper') { eyedropAt(p.x, p.y); return; }
    const data = imageDataRef.current;
    if (!data) return;
    history.push(data);
    drawingRef.current = true;
    lastPixelRef.current = p;
    paintAt(p.x, p.y, tool === 'eraser');
    setDirty(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panStateRef.current) {
      const s = panStateRef.current;
      setOffset({ x: s.ox + (e.clientX - s.x), y: s.oy + (e.clientY - s.y) });
      return;
    }
    if (!drawingRef.current) return;
    const p = screenToPixel(e.clientX, e.clientY);
    if (!p) return;
    if (lastPixelRef.current) lineAt(lastPixelRef.current, p, tool === 'eraser');
    else paintAt(p.x, p.y, tool === 'eraser');
    lastPixelRef.current = p;
  };

  const endPointer = () => {
    drawingRef.current = false;
    lastPixelRef.current = null;
    panStateRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const idx = ZOOM_STEPS.indexOf(zoom);
    setZoom(ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx + (e.deltaY < 0 ? 1 : -1)))]);
  };

  const fitToView = () => {
    const data = imageDataRef.current;
    const container = containerRef.current;
    if (!data || !container) return;
    const pad = 96;
    const fit = Math.min(
      (container.clientWidth - pad) / data.width,
      (container.clientHeight - pad) / (previewMode ? animationInfo?.frameHeight ?? data.height : data.height)
    );
    setZoom(nearestZoomStep(Math.max(1, fit)));
    setOffset({ x: 0, y: 0 });
  };

  const doUndo = useCallback(() => {
    const data = imageDataRef.current;
    if (!data) return;
    const prev = history.undo(data);
    if (!prev) return;
    imageDataRef.current = prev;
    setCanvasDims({ w: prev.width, h: prev.height });
    render();
    setDirty(true);
  }, [history, render]);

  const doRedo = useCallback(() => {
    const data = imageDataRef.current;
    if (!data) return;
    const next = history.redo(data);
    if (!next) return;
    imageDataRef.current = next;
    setCanvasDims({ w: next.width, h: next.height });
    render();
    setDirty(true);
  }, [history, render]);

  const doSave = useCallback(async () => {
    if (saving) return;
    const data = imageDataRef.current;
    if (!data) return;
    setSaving(true);
    setSaveError(null);
    try {
      const tmp = document.createElement('canvas');
      tmp.width = data.width;
      tmp.height = data.height;
      tmp.getContext('2d')?.putImageData(data, 0, 0);
      const blob: Blob = await new Promise((resolve, reject) => {
        tmp.toBlob((b) => { if (b) resolve(b); else reject(new Error('Failed to encode PNG.')); }, 'image/png');
      });
      const buf = new Uint8Array(await blob.arrayBuffer());
      await packApi.writeTexture(pack.root, entry.path, buf);
      setDirty(false);
      await refreshBlobUrl();
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save texture.');
    } finally {
      setSaving(false);
    }
  }, [entry.path, onSaved, pack.root, refreshBlobUrl, saving]);

  const handleAddFrame = useCallback(() => {
    const data = imageDataRef.current;
    if (!data) return;
    const frameHeight = animationInfo?.frameHeight ?? data.width;
    if (data.height % frameHeight !== 0) {
      setSaveError('Cannot add a frame: texture height is not a multiple of frame height.');
      return;
    }
    const frameCount = Math.max(1, Math.floor(data.height / frameHeight));
    const next = insertFrame(data, frameHeight, frameCount);
    history.push(data);
    imageDataRef.current = next;
    setCanvasDims({ w: next.width, h: next.height });
    render();
    setDirty(true);

    const meta = pendingMeta ?? { frametime: 1, interpolate: false };
    setPendingMeta(meta);
    setAnimationInfo({
      hasAnimation: true,
      frameCount: frameCount + 1,
      frameHeight,
      meta,
      rawMeta: null,
    });
    setAnimPanelOpen(true);
  }, [animationInfo, history, pendingMeta, render]);

  const handleDuplicateFrame = useCallback((index: number) => {
    const data = imageDataRef.current;
    if (!data) return;
    const frameHeight = animationInfo?.frameHeight ?? data.width;
    const next = insertFrame(data, frameHeight, index + 1);
    history.push(data);
    imageDataRef.current = next;
    setCanvasDims({ w: next.width, h: next.height });
    render();
    setDirty(true);
    if (animationInfo) {
      setAnimationInfo({ ...animationInfo, frameCount: animationInfo.frameCount + 1 });
    }
  }, [animationInfo, history, render]);

  const handleDeleteFrame = useCallback((index: number) => {
    const data = imageDataRef.current;
    if (!data) return;
    const frameHeight = animationInfo?.frameHeight ?? data.width;
    if (Math.floor(data.height / frameHeight) <= 1) return;
    const next = removeFrame(data, frameHeight, index);
    history.push(data);
    imageDataRef.current = next;
    setCanvasDims({ w: next.width, h: next.height });
    render();
    setDirty(true);
    if (animationInfo) {
      setAnimationInfo({
        ...animationInfo,
        frameCount: Math.max(1, animationInfo.frameCount - 1),
      });
    }
  }, [animationInfo, history, render]);

  const handleMetaChange = useCallback((meta: AnimationMeta | null) => {
    setPendingMeta(meta);
    if (animationInfo && meta) {
      setAnimationInfo({ ...animationInfo, meta });
    }
  }, [animationInfo]);

  const handleSaveAnimation = useCallback(async (meta: AnimationMeta) => {
    if (saving) return;
    const data = imageDataRef.current;
    if (!data) return;
    setSaving(true);
    setSaveError(null);
    try {
      const tmp = document.createElement('canvas');
      tmp.width = data.width;
      tmp.height = data.height;
      tmp.getContext('2d')?.putImageData(data, 0, 0);
      const blob: Blob = await new Promise((resolve, reject) => {
        tmp.toBlob((b) => { if (b) resolve(b); else reject(new Error('Failed to encode PNG.')); }, 'image/png');
      });
      const buf = new Uint8Array(await blob.arrayBuffer());
      await packApi.writeTexture(pack.root, entry.path, buf);
      await packApi.writeAnimation(pack.root, entry.path, {
        frametime: meta.frametime,
        interpolate: meta.interpolate,
        frames: meta.frames,
      });
      setDirty(false);
      setPendingMeta(meta);
      setAnimationInfo((prev) =>
        prev ? { ...prev, hasAnimation: true, meta } : prev
      );
      await refreshBlobUrl();
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save animation.');
    } finally {
      setSaving(false);
    }
  }, [entry.path, onSaved, pack.root, refreshBlobUrl, saving]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); setSpacePressed(true); return; }
      if (e.key.toLowerCase() === 'b') setTool('pencil');
      if (e.key.toLowerCase() === 'e') setTool('eraser');
      if (e.key.toLowerCase() === 'i') setTool('eyedropper');
      if (e.key.toLowerCase() === 'p') setPreviewMode((v) => !v);
      if (e.key === '+' || e.key === '=') setZoom((z) => ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, ZOOM_STEPS.indexOf(z) + 1)]);
      if (e.key === '-') setZoom((z) => ZOOM_STEPS[Math.max(0, ZOOM_STEPS.indexOf(z) - 1)]);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) doRedo(); else doUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        doSave();
      }
    };
    const up = (e: KeyboardEvent) => { if (e.key === ' ') setSpacePressed(false); };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', up);
    };
  }, [doRedo, doSave, doUndo]);

  const tryClose = () => {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    onClose();
  };

  const isAnimated = animationInfo?.hasAnimation === true;
  const displayDims = previewMode && isAnimated && animationInfo
    ? { w: canvasDims.w, h: animationInfo.frameHeight }
    : canvasDims;

  return (
    <div className="editor">
      {/* ─── Top action bar ─── */}
      <div className="editor-actions">
        <button className="editor-back" onClick={tryClose} title="Back to gallery">
          <ChevronLeft size={16} />
          <span>Gallery</span>
        </button>

        <div className="editor-actions-divider" />

        <span className="editor-file-label" title={entry.path}>{entry.name}</span>

        <div className="editor-actions-spacer" />

        {isAnimated && (
          <button
            className={`editor-action-btn${previewMode ? ' active' : ''}`}
            onClick={() => setPreviewMode((v) => !v)}
            title="Toggle live animation preview (P)"
          >
            {previewMode ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{previewMode ? 'Stop preview' : 'Preview'}</span>
          </button>
        )}

        <button
          className={`editor-action-btn${animPanelOpen ? ' active' : ''}`}
          onClick={() => setAnimPanelOpen((v) => !v)}
          title="Toggle animation panel"
        >
          <Film size={14} />
          <span>Animation</span>
        </button>

        <button className="editor-action-btn" onClick={doUndo} disabled={!history.canUndo} title="Undo (Ctrl+Z)">
          <Undo2 size={14} />
        </button>
        <button className="editor-action-btn" onClick={doRedo} disabled={!history.canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={14} />
        </button>

        <button
          className={`editor-save-btn${dirty ? ' dirty' : ''}`}
          onClick={doSave}
          disabled={saving}
          title="Save (Ctrl+S)"
        >
          <Save size={14} />
          <span>{saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}</span>
        </button>
      </div>

      {/* ─── Main working area ─── */}
      <div className="editor-body">
        <ToolRail
          tool={tool}
          brushSize={brushSize}
          color={color}
          disabled={loading || !!loadError}
          onChangeTool={setTool}
          onChangeBrush={setBrushSize}
          onChangeColor={setColor}
        />

        <div className="editor-canvas-col">
          <div
            ref={containerRef}
            className="editor-canvas-area"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerLeave={endPointer}
            onWheel={onWheel}
          >
            {loading && <div className="editor-loading"><span className="spinner" /><span>Loading…</span></div>}
            {loadError && <div className="editor-error">{loadError}</div>}
            {saveError && <div className="editor-error">{saveError}</div>}
            {!loading && !loadError && (
              <>
                <div className="editor-canvas-frame">
                  <canvas
                    ref={canvasRef}
                    className="editor-canvas"
                    style={{
                      width: displayDims.w * zoom,
                      height: displayDims.h * zoom,
                      transform: `translate(${offset.x}px, ${offset.y}px)`,
                      imageRendering: 'pixelated',
                      cursor: tool === 'eyedropper' ? 'crosshair' : spacePressed ? 'grab' : tool === 'eraser' ? 'cell' : 'crosshair',
                      visibility: canvasDims.w === 0 ? 'hidden' : 'visible',
                    }}
                  />
                </div>

                <div className="editor-canvas-hud">
                  <div className="editor-hud-group">
                    <button className="editor-hud-btn" onClick={() => setZoom((z) => ZOOM_STEPS[Math.max(0, ZOOM_STEPS.indexOf(z) - 1)])} title="Zoom out (−)"><Minus size={12} /></button>
                    <span className="editor-hud-zoom">{zoom}×</span>
                    <button className="editor-hud-btn" onClick={() => setZoom((z) => ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, ZOOM_STEPS.indexOf(z) + 1)])} title="Zoom in (+)"><Plus size={12} /></button>
                    <button className="editor-hud-btn" onClick={fitToView} title="Fit"><Maximize size={12} /></button>
                  </div>
                  <div className="editor-hud-group editor-hud-info">
                    <span>{displayDims.w} × {displayDims.h}</span>
                    {previewMode && isAnimated && animationInfo && (
                      <>
                        <span className="editor-hud-sep">·</span>
                        <span>Frame {preview.frameIndex + 1}/{animationInfo.frameCount}</span>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {animPanelOpen && animationInfo && (
            <AnimationPanel
              info={animationInfo}
              imageSrc={blobUrl}
              width={canvasDims.w}
              height={canvasDims.h}
              disabled={saving || loading}
              onAddFrame={handleAddFrame}
              onDeleteFrame={handleDeleteFrame}
              onDuplicateFrame={handleDuplicateFrame}
              onMetaChange={handleMetaChange}
              onSaveAnimation={handleSaveAnimation}
            />
          )}
        </div>
      </div>

      {/* ─── Status bar ─── */}
      <div className="editor-statusbar">
        <span className="editor-statusbar-path">{entry.path}</span>
        <span className="editor-statusbar-spacer" />
        <span>B pencil · E eraser · I eyedropper · Space pan</span>
        {dirty && <span className="editor-dirty">● Unsaved</span>}
      </div>
    </div>
  );
}
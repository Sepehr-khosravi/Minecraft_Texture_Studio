import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { TextureCategory } from '@shared/types/pack';
import '../../styles/modal.css';

export interface NewTextureOptions {
  category: TextureCategory;
  fileName: string;
  fill: 'transparent' | 'white' | 'black';
  // Static:
  width: number;
  height: number;
  // Animated:
  animated: boolean;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frametime: number;
  interpolate: boolean;
}

interface NewTextureDialogProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  onCancel(): void;
  onCreate(opts: NewTextureOptions): void;
}

const CATEGORIES: TextureCategory[] = [
  'block',
  'item',
  'entity',
  'gui',
  'particle',
  'painting',
  'environment',
  'misc',
];

const STATIC_SIZES = [16, 32, 64, 128, 256];
const FRAME_SIZES = [16, 32, 64, 128];
const FRAME_COUNTS = [2, 4, 8, 16, 32, 64];

export function NewTextureDialog({
  open,
  busy,
  error,
  onCancel,
  onCreate,
}: NewTextureDialogProps) {
  const [category, setCategory] = useState<TextureCategory>('block');
  const [fileName, setFileName] = useState('my_texture');
  const [fill, setFill] = useState<'transparent' | 'white' | 'black'>('transparent');
  const [animated, setAnimated] = useState(false);
  const [staticWidth, setStaticWidth] = useState(16);
  const [staticHeight, setStaticHeight] = useState(16);
  const [frameSize, setFrameSize] = useState(16);
  const [frameCount, setFrameCount] = useState(8);
  const [frametime, setFrametime] = useState(1);
  const [interpolate, setInterpolate] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory('block');
      setFileName('my_texture');
      setFill('transparent');
      setAnimated(false);
      setStaticWidth(16);
      setStaticHeight(16);
      setFrameSize(16);
      setFrameCount(8);
      setFrametime(1);
      setInterpolate(false);
    }
  }, [open]);

  const cleanedName = fileName.trim().replace(/\.png$/i, '');

  const totalHeight = frameSize * frameCount;
  const animatedTooBig = totalHeight > 2048;
  const animatedTooShort = frameCount < 2;

  const finalPath = `assets/minecraft/textures/${category}/${cleanedName}.png`;

  const canSubmit = useMemo(() => {
    if (busy || cleanedName.length === 0) return false;
    if (animated) {
      if (animatedTooBig || animatedTooShort) return false;
    }
    return true;
  }, [busy, cleanedName, animated, animatedTooBig, animatedTooShort]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal-card modal-card-wide" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>New texture</h3>
          <button className="icon-btn" onClick={onCancel} title="Close">
            <X size={16} />
          </button>
        </header>

        <div className="modal-body">
          <div className="field-row">
            <label className="field field-grow">
              <span className="field-label">Category</span>
              <select
                className="field-input"
                value={category}
                onChange={(e) => setCategory(e.target.value as TextureCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field field-grow">
              <span className="field-label">File name</span>
              <input
                className="field-input"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="my_texture"
                autoFocus
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field field-grow">
              <span className="field-label">Initial fill</span>
              <select
                className="field-input"
                value={fill}
                onChange={(e) => setFill(e.target.value as 'transparent' | 'white' | 'black')}
              >
                <option value="transparent">Transparent</option>
                <option value="white">Solid white</option>
                <option value="black">Solid black</option>
              </select>
            </label>
            <label className="checkbox-row field-grow">
              <input
                type="checkbox"
                checked={animated}
                onChange={(e) => setAnimated(e.target.checked)}
              />
              <span>Animated texture</span>
            </label>
          </div>

          {!animated && (
            <div className="field-row">
              <label className="field field-grow">
                <span className="field-label">Width</span>
                <select
                  className="field-input"
                  value={staticWidth}
                  onChange={(e) => setStaticWidth(Number(e.target.value))}
                >
                  {STATIC_SIZES.map((s) => (
                    <option key={s} value={s}>{s} px</option>
                  ))}
                </select>
              </label>
              <label className="field field-grow">
                <span className="field-label">Height</span>
                <select
                  className="field-input"
                  value={staticHeight}
                  onChange={(e) => setStaticHeight(Number(e.target.value))}
                >
                  {STATIC_SIZES.map((s) => (
                    <option key={s} value={s}>{s} px</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {animated && (
            <>
              <div className="field-row">
                <label className="field field-grow">
                  <span className="field-label">Frame size</span>
                  <select
                    className="field-input"
                    value={frameSize}
                    onChange={(e) => setFrameSize(Number(e.target.value))}
                  >
                    {FRAME_SIZES.map((s) => (
                      <option key={s} value={s}>{s} × {s}</option>
                    ))}
                  </select>
                </label>
                <label className="field field-grow">
                  <span className="field-label">Frame count</span>
                  <select
                    className="field-input"
                    value={frameCount}
                    onChange={(e) => setFrameCount(Number(e.target.value))}
                  >
                    {FRAME_COUNTS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="field-row">
                <label className="field field-grow">
                  <span className="field-label">frametime (ticks)</span>
                  <input
                    type="number"
                    min={1}
                    max={255}
                    className="field-input"
                    value={frametime}
                    onChange={(e) => setFrametime(Math.max(1, Math.min(255, Number(e.target.value) || 1)))}
                  />
                </label>
                <label className="checkbox-row field-grow">
                  <input
                    type="checkbox"
                    checked={interpolate}
                    onChange={(e) => setInterpolate(e.target.checked)}
                  />
                  <span>Interpolate frames</span>
                </label>
              </div>

              {animatedTooBig ? (
                <div className="form-error">
                  Total height {totalHeight}px exceeds 2048px. Reduce frame size or count.
                </div>
              ) : (
                <div className="form-hint">
                  Will create a <strong>{frameSize}×{totalHeight}</strong> PNG
                  {' '}({frameCount} frames of {frameSize}×{frameSize}) plus a matching{' '}
                  <code>.png.mcmeta</code>.
                  Animation runs {((frameCount * frametime * 50) / 1000).toFixed(2)}s at {frametime} tick
                  {frametime === 1 ? '' : 's'} per frame.
                </div>
              )}
            </>
          )}

          <div className="form-hint">
            Path: <code>{finalPath}</code>
            {animated && <code>{'.mcmeta'}</code>}
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <footer className="modal-footer">
          <button className="toolbar-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className="toolbar-btn primary"
            disabled={!canSubmit}
            onClick={() =>
              onCreate({
                category,
                fileName: cleanedName,
                fill,
                width: staticWidth,
                height: staticHeight,
                animated,
                frameWidth: frameSize,
                frameHeight: frameSize,
                frameCount,
                frametime,
                interpolate,
              })
            }
          >
            {busy ? 'Creating…' : 'Create & open'}
          </button>
        </footer>
      </div>
    </div>
  );
}
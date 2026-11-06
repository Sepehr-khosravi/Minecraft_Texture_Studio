import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Plus, Trash2, ArrowUp, ArrowDown, Film } from 'lucide-react';
import type { AnimationMeta, TextureAnimationInfo } from '@shared/types/pack';
import '../../styles/animation.css';

interface AnimationPanelProps {
  info: TextureAnimationInfo | null;
  /** PNG bytes as a blob URL — the whole strip. */
  imageSrc: string | null;
  width: number;
  height: number;
  /** Disable edit buttons while a save or load is in progress. */
  disabled: boolean;
  /** Called when the user requests a new frame to be appended. */
  onAddFrame(): void;
  /** Delete the currently-previewed frame from the strip. */
  onDeleteFrame(index: number): void;
  /** Duplicate a specific frame and insert it after itself. */
  onDuplicateFrame(index: number): void;
  /** Apply a new meta (frametime, interpolate, frames) — does not write to disk. */
  onMetaChange(meta: AnimationMeta | null): void;
  /** Persist PNG + meta. Called by "Save animation" only. */
  onSaveAnimation(meta: AnimationMeta): void;
}

export function AnimationPanel({
  info,
  imageSrc,
  width,
  height,
  disabled,
  onAddFrame,
  onDeleteFrame,
  onDuplicateFrame,
  onMetaChange,
  onSaveAnimation,
}: AnimationPanelProps) {
  const [playing, setPlaying] = useState(true);
  const [frameIndex, setFrameIndex] = useState(0);
  const [frametime, setFrametime] = useState(1);
  const [interpolate, setInterpolate] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const frameCount = info?.frameCount ?? 1;
  const frameHeight = info?.frameHeight ?? height;
  const frameOrder = useMemo(() => {
    if (!info?.meta?.frames || info.meta.frames.length === 0) {
      return Array.from({ length: frameCount }, (_, i) => i);
    }
    return info.meta.frames;
  }, [info, frameCount]);

  // Sync local inputs from info when it changes.
  useEffect(() => {
    setFrametime(info?.meta?.frametime ?? 1);
    setInterpolate(info?.meta?.interpolate ?? false);
    setFrameIndex(0);
    setPlaying(true);
  }, [info]);

  // Animation ticker.
  useEffect(() => {
    if (!info?.hasAnimation || !playing) return;
    lastTickRef.current = performance.now();
    const frameMs = Math.max(20, frametime * 50);
    const tick = (now: number) => {
      if (now - lastTickRef.current >= frameMs) {
        lastTickRef.current = now;
        setFrameIndex((prev) => (prev + 1) % Math.max(1, frameOrder.length));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, frametime, frameOrder.length, info?.hasAnimation]);

  if (!info) return null;

  const realFrame = frameOrder[frameIndex] ?? 0;
  const currentMeta: AnimationMeta = {
    frametime,
    interpolate,
    frames: info.meta?.frames,
    width: info.meta?.width,
    height: info.meta?.height,
  };

  const applyMetaField = (patch: Partial<AnimationMeta>) => {
    onMetaChange({ ...currentMeta, ...patch });
  };

  if (!info.hasAnimation) {
    return (
      <div className="anim-panel anim-panel-static">
        <div className="anim-panel-header">
          <Film size={14} />
          <span className="anim-panel-title">Animation</span>
          <span className="anim-panel-badge">Static</span>
          <button
            className="toolbar-btn anim-panel-primary"
            onClick={onAddFrame}
            disabled={disabled}
          >
            <Plus size={13} /> Make animated
          </button>
        </div>
        <p className="anim-panel-hint">
          No animation metadata yet. Click <strong>Make animated</strong> to double the texture
          height (2 frames) and add the companion <code>.png.mcmeta</code>. This requires an
          even height — if the texture is 16×16, it becomes 16×32 with two 16×16 frames.
        </p>
      </div>
    );
  }

  return (
    <div className="anim-panel">
      <div className="anim-panel-header">
        <Film size={14} />
        <span className="anim-panel-title">Animation</span>
        <span className="anim-panel-badge anim-panel-badge-live">
          {frameCount} frame{frameCount === 1 ? '' : 's'}
        </span>

        <label className="anim-input-wrap">
          <span className="anim-input-label">frametime</span>
          <input
            className="anim-input"
            type="number"
            min={1}
            max={255}
            value={frametime}
            disabled={disabled}
            onChange={(e) => {
              const n = Math.max(1, Math.min(255, Number(e.target.value) || 1));
              setFrametime(n);
              applyMetaField({ frametime: n });
            }}
          />
          <span className="anim-input-label">t</span>
        </label>

        <label className="anim-checkbox-wrap">
          <input
            type="checkbox"
            checked={interpolate}
            disabled={disabled}
            onChange={(e) => {
              setInterpolate(e.target.checked);
              applyMetaField({ interpolate: e.target.checked });
            }}
          />
          <span>interpolate</span>
        </label>

        <div className="anim-panel-actions">
          <button
            className="toolbar-btn"
            onClick={() => setPlaying((p) => !p)}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            className="toolbar-btn"
            onClick={onAddFrame}
            disabled={disabled}
            title="Duplicate current frame and append it"
          >
            <Plus size={12} /> Add frame
          </button>
          <button
            className="toolbar-btn"
            onClick={() => onSaveAnimation(currentMeta)}
            disabled={disabled}
            title="Save PNG and .png.mcmeta"
          >
            Save animation
          </button>
        </div>
      </div>

      <div className="anim-panel-body">
        <div className="anim-preview">
          {imageSrc ? (
            <div
              className="anim-preview-crop"
              style={{
                width,
                height: frameHeight,
                backgroundImage: `url(${imageSrc})`,
                backgroundPosition: `0 -${realFrame * frameHeight}px`,
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
              }}
            />
          ) : (
            <div className="anim-preview-crop placeholder" style={{ width, height: frameHeight }} />
          )}
          <span className="anim-preview-label">
            Frame {realFrame + 1} / {frameCount}
          </span>
        </div>

        <div className="anim-frames">
          {frameOrder.map((f, i) => (
            <div
              key={i}
              className={`anim-frame${i === frameIndex ? ' active' : ''}`}
              onClick={() => {
                setPlaying(false);
                setFrameIndex(i);
              }}
              title={`Go to frame ${f + 1}`}
            >
              {f + 1}
              <button
                className="anim-frame-action"
                title="Duplicate this frame"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateFrame(f);
                }}
              >
                <Plus size={9} />
              </button>
              <button
                className="anim-frame-action anim-frame-delete"
                title="Delete this frame"
                disabled={disabled || frameCount <= 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFrame(f);
                  setFrameIndex(0);
                }}
              >
                <Trash2 size={9} />
              </button>
            </div>
          ))}
          <button
            className="anim-frame anim-frame-add"
            onClick={onAddFrame}
            disabled={disabled}
            title="Append a copy of the last frame"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      <div className="anim-panel-footer">
        <span className="anim-panel-hint-small">
          Frame order (1-indexed, comma separated):{' '}
        </span>
        <input
          className="anim-input anim-input-wide"
          value={(info.meta?.frames ?? []).map((n) => n + 1).join(', ')}
          placeholder="auto"
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (raw === '') {
              applyMetaField({ frames: undefined });
              return;
            }
            const parsed = raw
              .split(',')
              .map((s) => parseInt(s.trim(), 10) - 1)
              .filter((n) => Number.isInteger(n) && n >= 0 && n < frameCount);
            if (parsed.length > 0) applyMetaField({ frames: parsed });
          }}
        />
        <span className="anim-panel-hint-small">
          {frametime} tick{frametime === 1 ? '' : 's'} per frame ({(frametime * 50).toFixed(0)}ms)
          · {((frameCount * frametime * 50) / 1000).toFixed(2)}s total
        </span>
      </div>
    </div>
  );
}
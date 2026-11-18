import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Download,
  Eraser,
  Pipette,
  Redo2,
  Undo2,
} from 'lucide-react';

import { SkinViewer3D } from './SkinViewer3D';
import { useEditorHistory } from '../../hooks/useEditorHistory';

import '../../styles/skin-editor.css';

interface SkinEditorProps {
  initialModel: 'steve' | 'alex';
  onClose(): void;
}

type Tool = 'pencil' | 'eraser' | 'eyedropper';
type PaintLayer = 'inner' | 'outer';

const SKIN_SIZE = 64;

export function SkinEditor({
  initialModel,
  onClose,
}: SkinEditorProps) {
  const [skinUrl, setSkinUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dirty, setDirty] = useState(false);

  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#e0a526');
  const [activeLayer, setActiveLayer] = useState<PaintLayer>('inner');
  const [showGrid, setShowGrid] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<ImageData | null>(null);

  const history = useEditorHistory();

  /**
   * Updates the viewer's skin URL from the original, unmodified canvas.
   * The 3D viewer adds its own temporary grid overlay.
   */
  const refreshSkinPreview = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    setSkinUrl(canvas.toDataURL('image/png'));
  }, []);

  /**
   * Load the transparent blank skin.
   */
  useEffect(() => {
    let cancelled = false;
    let temporaryUrl: string | null = null;

    (async () => {
      try {
        const bytes = await window.api.skin.blank();

        if (cancelled) return;

        const blob = new Blob(
          [bytes as BlobPart],
          { type: 'image/png' },
        );

        temporaryUrl = URL.createObjectURL(blob);

        const image = new Image();
        image.src = temporaryUrl;

        await image.decode();

        if (cancelled) return;

        const canvas = document.createElement('canvas');

        canvas.width = SKIN_SIZE;
        canvas.height = SKIN_SIZE;

        const context = canvas.getContext('2d', {
          willReadFrequently: true,
        });

        if (!context) {
          throw new Error('Could not create skin canvas.');
        }

        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, SKIN_SIZE, SKIN_SIZE);
        context.drawImage(
          image,
          0,
          0,
          SKIN_SIZE,
          SKIN_SIZE,
        );

        const imageData = context.getImageData(
          0,
          0,
          SKIN_SIZE,
          SKIN_SIZE,
        );

        canvasRef.current = canvas;
        imageRef.current = imageData;

        history.reset(imageData);

        setSkinUrl(canvas.toDataURL('image/png'));
        setLoading(false);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to create blank skin.',
        );

        setLoading(false);
      } finally {
        if (temporaryUrl) {
          URL.revokeObjectURL(temporaryUrl);
        }
      }
    })();

    return () => {
      cancelled = true;

      if (temporaryUrl) {
        URL.revokeObjectURL(temporaryUrl);
      }
    };
    // The blank skin is loaded only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Paint one pixel or sample a pixel color.
   */
  const handlePaint = useCallback(
    (
      x: number,
      y: number,
      strokeStart = false,
    ) => {
      const data = imageRef.current;
      const canvas = canvasRef.current;

      if (!data || !canvas) return;

      if (
        x < 0 ||
        x >= SKIN_SIZE ||
        y < 0 ||
        y >= SKIN_SIZE
      ) {
        return;
      }

      const pixelIndex = (y * SKIN_SIZE + x) * 4;

      // Eyedropper
      if (tool === 'eyedropper') {
        if (data.data[pixelIndex + 3] === 0) return;

        const hex =
          '#' +
          [
            data.data[pixelIndex],
            data.data[pixelIndex + 1],
            data.data[pixelIndex + 2],
          ]
            .map((value) =>
              value.toString(16).padStart(2, '0'),
            )
            .join('');

        setColor(hex);
        setTool('pencil');

        return;
      }

      const context = canvas.getContext('2d');

      if (!context) return;

      // Save one snapshot at the beginning of each stroke.
      // Clone the ImageData so later mutations cannot change history.
      if (strokeStart) {
        const snapshot = new ImageData(
          new Uint8ClampedArray(data.data),
          SKIN_SIZE,
          SKIN_SIZE,
        );

        history.push(snapshot);
      }

      const oldR = data.data[pixelIndex];
      const oldG = data.data[pixelIndex + 1];
      const oldB = data.data[pixelIndex + 2];
      const oldA = data.data[pixelIndex + 3];

      let newR = 0;
      let newG = 0;
      let newB = 0;
      let newA = 255;

      if (tool === 'eraser') {
        newA = 0;
      } else {
        const hex = color.replace('#', '').padEnd(6, '0');

        newR = parseInt(hex.slice(0, 2), 16) || 0;
        newG = parseInt(hex.slice(2, 4), 16) || 0;
        newB = parseInt(hex.slice(4, 6), 16) || 0;
      }

      // Avoid refreshing the texture if the pixel did not change.
      if (
        oldR === newR &&
        oldG === newG &&
        oldB === newB &&
        oldA === newA
      ) {
        return;
      }

      data.data[pixelIndex] = newR;
      data.data[pixelIndex + 1] = newG;
      data.data[pixelIndex + 2] = newB;
      data.data[pixelIndex + 3] = newA;

      context.putImageData(data, 0, 0);

      setDirty(true);
      refreshSkinPreview();
    },
    [color, history, refreshSkinPreview, tool],
  );

  /**
   * Undo.
   */
  const doUndo = useCallback(() => {
    const current = imageRef.current;

    if (!current) return;

    const previous = history.undo(current);

    if (!previous) return;

    imageRef.current = previous;

    const context = canvasRef.current?.getContext('2d');

    if (!context) return;

    context.putImageData(previous, 0, 0);

    setDirty(true);
    refreshSkinPreview();
  }, [history, refreshSkinPreview]);

  /**
   * Redo.
   */
  const doRedo = useCallback(() => {
    const current = imageRef.current;

    if (!current) return;

    const next = history.redo(current);

    if (!next) return;

    imageRef.current = next;

    const context = canvasRef.current?.getContext('2d');

    if (!context) return;

    context.putImageData(next, 0, 0);

    setDirty(true);
    refreshSkinPreview();
  }, [history, refreshSkinPreview]);

  /**
   * Close editor.
   */
  const tryClose = useCallback(() => {
    if (
      dirty &&
      !confirm(
        "Discard this skin? It hasn't been downloaded yet.",
      )
    ) {
      return;
    }

    onClose();
  }, [dirty, onClose]);

  /**
   * Export the original 64x64 skin.
   *
   * Important: this canvas never receives the 3D grid overlay.
   */
  const doDownload = useCallback(async () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    try {
      const blob: Blob = await new Promise(
        (resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(new Error('PNG encoding failed.'));
              }
            },
            'image/png',
          );
        },
      );

      const bytes = new Uint8Array(
        await blob.arrayBuffer(),
      );

      const saved = await window.api.skin.download({
        bytes,
        suggestedName: 'my_skin',
      });

      if (saved) {
        setDirty(false);
        alert(`Saved to ${saved}`);
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Download failed.',
      );
    }
  }, []);

  return (
    <div className="skin-editor">
      <div className="skin-editor-topbar">
        <button
          className="skin-editor-back"
          onClick={tryClose}
        >
          <ChevronLeft size={15} />
          Back
        </button>

        <div className="skin-editor-title">
          <span className="skin-editor-title-name">
            New Skin
          </span>

          <span
            className={`skin-model-badge skin-model-badge-${initialModel}`}
          >
            {initialModel === 'steve'
              ? 'Steve · Classic'
              : 'Alex · Slim'}
          </span>
        </div>

        <div className="skin-layer-switch" role="group" aria-label="Skin layer">
          <button
            className={`skin-layer-btn${activeLayer === 'inner' ? ' active' : ''}`}
            onClick={() => setActiveLayer('inner')}
            title="Paint on the base skin layer"
          >
            Base
          </button>
          <button
            className={`skin-layer-btn${activeLayer === 'outer' ? ' active' : ''}`}
            onClick={() => setActiveLayer('outer')}
            title="Paint on the overlay layer"
          >
            Overlay
          </button>
          <button
            className={`skin-layer-btn grid${showGrid ? ' active' : ''}`}
            onClick={() => setShowGrid((value) => !value)}
            title="Show or hide the pixel grid"
          >
            Grid
          </button>
        </div>

        <div className="skin-editor-spacer" />

        <button
          className="skin-icon-btn"
          onClick={doUndo}
          disabled={!history.canUndo}
          title="Undo"
        >
          <Undo2 size={15} />
        </button>

        <button
          className="skin-icon-btn"
          onClick={doRedo}
          disabled={!history.canRedo}
          title="Redo"
        >
          <Redo2 size={15} />
        </button>

        <button
          className={`skin-save-btn${dirty ? ' dirty' : ''}`}
          onClick={doDownload}
        >
          <Download size={14} />
          Download
        </button>
      </div>

      <div className="skin-editor-body">
        <aside className="skin-tool-rail">
          <button
            className={`skin-tool-btn${tool === 'pencil' ? ' active' : ''}`}
            onClick={() => setTool('pencil')}
            title="Pencil"
          >
            <PencilIcon />
          </button>

          <button
            className={`skin-tool-btn${tool === 'eraser' ? ' active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Eraser"
          >
            <Eraser size={18} />
          </button>

          <button
            className={`skin-tool-btn${tool === 'eyedropper' ? ' active' : ''}`}
            onClick={() => setTool('eyedropper')}
            title="Eyedropper"
          >
            <Pipette size={18} />
          </button>

          <div className="skin-tool-divider" />

          <label
            className="skin-color-pick"
            title={color}
          >
            <input
              type="color"
              value={color}
              onChange={(event) =>
                setColor(event.target.value)
              }
            />

            <span style={{ background: color }} />
          </label>
        </aside>

        <div className="skin-editor-viewer">
          {loading && (
            <div className="skin-editor-loading">
              <span className="spinner" />
              Preparing 3D model…
            </div>
          )}

          {error && (
            <div className="skin-editor-error">
              {error}
            </div>
          )}

          {!loading && !error && skinUrl && (
            <SkinViewer3D
              skinUrl={skinUrl}
              model={initialModel}
              activeLayer={activeLayer}
              showGrid={showGrid}
              onPaint={handlePaint}
            />
          )}
        </div>
      </div>

      <div className="skin-editor-statusbar">
        <span>
          64 × 64 · PNG ·{' '}
          {initialModel === 'steve' ? 'Classic' : 'Slim'}
        </span>

        <span className="skin-editor-status-spacer" />

        <span className="skin-editor-hint">
          Left click: Paint · Right drag: Rotate · {activeLayer === 'inner' ? 'Base layer' : 'Overlay layer'}
        </span>

        {dirty && (
          <span className="skin-editor-dirty">
            ● Unsaved
          </span>
        )}
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}
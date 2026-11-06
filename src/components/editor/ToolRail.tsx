import { Eraser, Pipette, Pencil } from 'lucide-react';
import '../../styles/editor.css';

export type EditorTool = 'pencil' | 'eraser' | 'eyedropper';

interface ToolRailProps {
  tool: EditorTool;
  brushSize: number;
  color: string;
  disabled: boolean;
  onChangeTool(t: EditorTool): void;
  onChangeBrush(n: number): void;
  onChangeColor(c: string): void;
}

const TOOLS: Array<{ id: EditorTool; icon: typeof Pencil; label: string; key: string }> = [
  { id: 'pencil', icon: Pencil, label: 'Pencil', key: 'B' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', key: 'E' },
  { id: 'eyedropper', icon: Pipette, label: 'Eyedropper', key: 'I' },
];

export function ToolRail({
  tool,
  brushSize,
  color,
  disabled,
  onChangeTool,
  onChangeBrush,
  onChangeColor,
}: ToolRailProps) {
  return (
    <div className="tool-rail">
      <div className="tool-rail-section">
        {TOOLS.map(({ id, icon: Icon, label, key }) => (
          <button
            key={id}
            className={`tool-rail-btn${tool === id ? ' active' : ''}`}
            onClick={() => onChangeTool(id)}
            disabled={disabled}
            title={`${label} (${key})`}
          >
            <Icon size={18} />
            <span className="tool-rail-tip">{label} · {key}</span>
          </button>
        ))}
      </div>

      <div className="tool-rail-divider" />

      <div className="tool-rail-section">
        {[1, 2, 4].map((n) => (
          <button
            key={n}
            className={`tool-rail-btn tool-rail-brush${brushSize === n ? ' active' : ''}`}
            onClick={() => onChangeBrush(n)}
            disabled={disabled}
            title={`Brush ${n}px`}
          >
            <span className="tool-rail-brush-dot" style={{ width: 4 + n * 3, height: 4 + n * 3 }} />
            <span className="tool-rail-tip">Brush {n}px</span>
          </button>
        ))}
      </div>

      <div className="tool-rail-divider" />

      <div className="tool-rail-section">
        <label className="tool-rail-color" title="Current color">
          <input
            type="color"
            value={color}
            onChange={(e) => onChangeColor(e.target.value)}
            disabled={disabled}
          />
          <span className="tool-rail-color-preview" style={{ background: color }} />
          <span className="tool-rail-tip">{color}</span>
        </label>
      </div>
    </div>
  );
}
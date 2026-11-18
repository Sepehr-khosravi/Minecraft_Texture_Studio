import type { SkinModel } from '@shared/types/skin';
import '../../styles/skin.css';

interface SkinTemplatePickerProps {
  open: boolean;
  onPick(model: SkinModel): void;
  onCancel(): void;
}

export function SkinTemplatePicker({ open, onPick, onCancel }: SkinTemplatePickerProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal-card modal-card-wide" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>Choose your skin model</h3>
        </header>
        <div className="modal-body">
          <p className="skin-template-intro">
            The model determines arm width. Steve has 4-pixel arms, Alex has 3-pixel arms.
            The rest of the body is identical.
          </p>
          <div className="skin-template-grid">
            <button className="skin-template-card" onClick={() => onPick('steve')}>
              <div className="skin-template-icon skin-template-steve" />
              <span className="skin-template-title">Steve (Classic)</span>
              <span className="skin-template-hint">4px arms · wider shoulders</span>
            </button>
            <button className="skin-template-card" onClick={() => onPick('alex')}>
              <div className="skin-template-icon skin-template-alex" />
              <span className="skin-template-title">Alex (Slim)</span>
              <span className="skin-template-hint">3px arms · slimmer shoulders</span>
            </button>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="toolbar-btn" onClick={onCancel}>Cancel</button>
        </footer>
      </div>
    </div>
  );
}
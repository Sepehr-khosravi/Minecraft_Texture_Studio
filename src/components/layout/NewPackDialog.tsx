import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { CreatePackInput } from '@shared/types/pack';
import { PACK_FORMAT_PRESETS } from '@shared/types/pack';
import '../../styles/modal.css';

interface NewPackDialogProps {
  open: boolean;
  onCancel(): void;
  onCreate(input: CreatePackInput): void;
  busy: boolean;
  error: string | null;
}

export function NewPackDialog({ open, onCancel, onCreate, busy, error }: NewPackDialogProps) {
  const [name, setName] = useState('My Pack');
  const [description, setDescription] = useState('A resource pack made with Resource Pack Studio.');
  const [presetIndex, setPresetIndex] = useState(0);
  const [customFormat, setCustomFormat] = useState(15);
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (open) {
      setName('My Pack');
      setDescription('A resource pack made with Resource Pack Studio.');
      setPresetIndex(0);
      setCustomFormat(15);
      setUseCustom(false);
    }
  }, [open]);

  if (!open) return null;

  const selectedPreset = PACK_FORMAT_PRESETS[presetIndex];
  const packFormat = useCustom ? customFormat : selectedPreset.pack_format;
  const canSubmit = !busy && name.trim() !== '';

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>Create resource pack</h3>
          <button className="icon-btn" onClick={onCancel} title="Close">
            <X size={16} />
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span className="field-label">Name</span>
            <input
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              className="field-input field-textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Target Minecraft version</span>
            <select
              className="field-input"
              value={useCustom ? 'custom' : String(presetIndex)}
              onChange={(e) => {
                if (e.target.value === 'custom') setUseCustom(true);
                else {
                  setUseCustom(false);
                  setPresetIndex(Number(e.target.value));
                }
              }}
            >
              {PACK_FORMAT_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                  {p.hint ? ` — ${p.hint}` : ''}
                </option>
              ))}
              <option value="custom">Custom pack_format…</option>
            </select>
          </label>

          {useCustom && (
            <label className="field">
              <span className="field-label">pack_format (advanced)</span>
              <input
                className="field-input"
                type="number"
                min={1}
                value={customFormat}
                onChange={(e) => setCustomFormat(Number(e.target.value) || 1)}
              />
            </label>
          )}

          {!useCustom && selectedPreset.pack_format === 1 && (
            <div className="form-hint">
              1.8.9 packs use <code>pack_format: 1</code>. They will show as
              incompatible on newer Minecraft versions.
            </div>
          )}

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
                name: name.trim(),
                description,
                pack_format: packFormat,
              })
            }
          >
            {busy ? 'Creating…' : 'Create pack'}
          </button>
        </footer>
      </div>
    </div>
  );
}

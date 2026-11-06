import { AlertTriangle } from 'lucide-react';
import type { TextureWarning } from '@shared/types/pack';
import '../../styles/warnings.css';

interface PackWarningsProps {
  warnings: TextureWarning[];
  onInspect?: (path: string) => void;
}

export function PackWarnings({ warnings, onInspect }: PackWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="warnings-banner">
      <div className="warnings-header">
        <AlertTriangle size={14} />
        <span>
          {warnings.length} texture{warnings.length === 1 ? '' : 's'} with invalid dimensions
        </span>
      </div>
      <ul className="warnings-list">
        {warnings.slice(0, 5).map((w) => (
          <li key={w.path}>
            <button className="warnings-link" onClick={() => onInspect?.(w.path)}>
              {w.path}
            </button>
            <span className="warnings-detail">
              {w.width}×{w.height}
            </span>
          </li>
        ))}
        {warnings.length > 5 && (
          <li className="warnings-more">…and {warnings.length - 5} more</li>
        )}
      </ul>
    </div>
  );
}

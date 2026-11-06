import '../../styles/toolbar.css';
import { Minus, Square, X } from 'lucide-react';

export function WindowControls() {
  // macOS gets the OS traffic lights (via titleBarStyle: 'hidden').
  if (window.api?.app.platform() === 'darwin') return null;

  return (
    <div className="window-controls no-drag">
      <button title="Minimize" onClick={() => window.api.window.minimize()}>
        <Minus size={14} />
      </button>
      <button title="Maximize" onClick={() => window.api.window.toggleMaximize()}>
        <Square size={12} />
      </button>
      <button
        className="close"
        title="Close"
        onClick={() => window.api.window.close()}
      >
        <X size={15} />
      </button>
    </div>
  );
}

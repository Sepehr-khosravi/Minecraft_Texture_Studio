import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { TextureEntry } from '@shared/types/pack';
import { useTexture } from '../../hooks/useTexture';
import '../../styles/gallery.css';

interface TextureThumbProps {
  entry: TextureEntry;
  root: string;
  selected: boolean;
  onSelect(entry: TextureEntry): void;
  onOpen(entry: TextureEntry): void;
  onRequestDelete?: (path: string) => void;
}

export function TextureThumb({ entry, root, selected, onSelect, onOpen, onRequestDelete }: TextureThumbProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  const { url, loading, error } = useTexture(root, entry.path, visible);

  return (
    <div className="texture-thumb-wrap">
      <button
        ref={ref}
        className={`texture-thumb${selected ? ' selected' : ''}`}
        onClick={() => onSelect(entry)}
        onDoubleClick={() => onOpen(entry)}
        title={`${entry.path}\n${entry.width}×${entry.height}\nDouble-click to edit`}
      >
        <div className="texture-thumb-img">
          {url && <img src={url} alt={entry.name} loading="lazy" />}
          {!url && loading && <span className="texture-thumb-placeholder" />}
          {!url && !loading && error && (
            <span className="texture-thumb-error" title={error}>!</span>
          )}
        </div>
        <span className="texture-thumb-name">{entry.name}</span>
        <span className="texture-thumb-size">{entry.width}×{entry.height}</span>
      </button>
      {onRequestDelete && (
        <button
          className="texture-thumb-delete"
          title={`Delete ${entry.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(entry.path);
          }}
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}
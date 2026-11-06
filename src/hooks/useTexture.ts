import { useEffect, useState } from 'react';
import { packApi } from '../services/packApi';

interface TextureState {
  url: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Load a single texture's bytes from disk and expose them as a blob URL.
 * The URL is revoked automatically on unmount or when the source changes.
 */
export function useTexture(root: string | null, relPath: string | null, enabled: boolean): TextureState {
  const [state, setState] = useState<TextureState>({
    url: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !root || !relPath) {
      setState({ url: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    let url: string | null = null;

    setState({ url: null, loading: true, error: null });

    packApi
      .readTexture(root, relPath)
      .then((bytes) => {
        if (cancelled) return;
        const blob = new Blob([bytes as BlobPart], { type: 'image/png' });
        url = URL.createObjectURL(blob);
        setState({ url, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          url: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load texture.',
        });
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [root, relPath, enabled]);

  return state;
}

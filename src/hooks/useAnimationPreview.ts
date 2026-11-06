import { useEffect, useRef, useState } from 'react';
import type { TextureAnimationInfo } from '@shared/types/pack';

interface PreviewState {
  frameIndex: number;
  playing: boolean;
  setPlaying(v: boolean): void;
  reset(): void;
}

/**
 * Drives a live frame index for the animation preview.
 * When `enabled` is false, always returns frame 0 and does not schedule RAF.
 */
export function useAnimationPreview(
  info: TextureAnimationInfo | null,
  enabled: boolean
): PreviewState {
  const [playing, setPlaying] = useState(true);
  const [frameIndex, setFrameIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const frameCount = info?.frameCount ?? 1;
  const frameOrder = info?.meta?.frames?.length
    ? info.meta.frames
    : Array.from({ length: frameCount }, (_, i) => i);
  const frameMs = Math.max(20, (info?.meta?.frametime ?? 1) * 50);

  useEffect(() => {
    if (!enabled || !info?.hasAnimation || !playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    lastTickRef.current = performance.now();
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
      rafRef.current = null;
    };
  }, [enabled, info?.hasAnimation, playing, frameMs, frameOrder.length]);

  useEffect(() => {
    if (!enabled) setFrameIndex(0);
  }, [enabled]);

  const reset = () => {
    setFrameIndex(0);
    setPlaying(true);
  };

  const realFrame = frameOrder[frameIndex] ?? 0;

  return {
    frameIndex: realFrame,
    playing,
    setPlaying,
    reset,
  };
}
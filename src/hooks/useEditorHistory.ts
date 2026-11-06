import { useCallback, useRef, useState } from 'react';

interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  push(data: ImageData): void;
  undo(current: ImageData): ImageData | null;
  redo(current: ImageData): ImageData | null;
  reset(initial: ImageData | null): void;
}

const MAX_STACK = 50;

function cloneImageData(src: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
}

export function useEditorHistory(): HistoryState {
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const [flags, setFlags] = useState({ canUndo: false, canRedo: false });

  const refresh = useCallback(() => {
    setFlags({
      canUndo: undoStack.current.length > 0,
      canRedo: redoStack.current.length > 0,
    });
  }, []);

  const push = useCallback((data: ImageData) => {
    undoStack.current.push(cloneImageData(data));
    if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
    redoStack.current = [];
    refresh();
  }, [refresh]);

  const undo = useCallback((current: ImageData): ImageData | null => {
    const prev = undoStack.current.pop();
    if (!prev) return null;
    redoStack.current.push(cloneImageData(current));
    refresh();
    return prev;
  }, [refresh]);

  const redo = useCallback((current: ImageData): ImageData | null => {
    const next = redoStack.current.pop();
    if (!next) return null;
    undoStack.current.push(cloneImageData(current));
    refresh();
    return next;
  }, [refresh]);

  const reset = useCallback((initial: ImageData | null) => {
    undoStack.current = [];
    redoStack.current = [];
    if (initial) undoStack.current.push(cloneImageData(initial));
    refresh();
  }, [refresh]);

  return { ...flags, push, undo, redo, reset };
}
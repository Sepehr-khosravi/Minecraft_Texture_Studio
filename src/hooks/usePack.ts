import { useCallback, useState } from 'react';
import type { CreatePackInput, OpenPack } from '@shared/types/pack';
import { packApi } from '../services/packApi';

export type PackStatus = 'idle' | 'busy';

export interface UsePack {
  pack: OpenPack | null;
  status: PackStatus;
  error: string | null;
  createNew(input: CreatePackInput): Promise<void>;
  openExisting(root: string): Promise<void>;
  closePack(): void;
  clearError(): void;
  applyPack(next: OpenPack | null): void;
}

export function usePack(): UsePack {
  const [pack, setPack] = useState<OpenPack | null>(null);
  const [status, setStatus] = useState<PackStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const createNew = useCallback(async (input: CreatePackInput) => {
    setStatus('busy');
    setError(null);
    try {
      const opened = await packApi.create(input);
      setPack(opened);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pack.');
    } finally {
      setStatus('idle');
    }
  }, []);

  const openExisting = useCallback(async (root: string) => {
    setStatus('busy');
    setError(null);
    try {
      const opened = await packApi.open(root);
      setPack(opened);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open pack.');
    } finally {
      setStatus('idle');
    }
  }, []);

  const closePack = useCallback(() => setPack(null), []);
  const clearError = useCallback(() => setError(null), []);
  const applyPack = useCallback((next: OpenPack | null) => setPack(next), []);

  return { pack, status, error, createNew, openExisting, closePack, clearError, applyPack };
}
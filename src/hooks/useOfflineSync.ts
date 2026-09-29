'use client';

// ينسّق الـ sync بين الـ cache + الـ pending queue + الـ Firestore.
// - يستمع لحدث `online` ويبدّل الـ sync.
// - يستمع لحدث الـ read success من useMarketEntries ويبدّل sync لو في pending.
// - يعرض `triggerSync()` للـ manual "Sync now" button.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getPendingCount } from '@/lib/offlineQueue';
import { syncPendingEntries } from '@/lib/market';
import { useNetworkStatus } from './useNetworkStatus';
import { logger } from '@/lib/logger';

export interface UseOfflineSyncOptions {
  /**
   * بنمرّر الـ trigger من الـ read layer (useMarketEntries) عشان
   * يعمل sync بعد كل Firestore snapshot ناجح (لو في pending).
   */
  registerReadSuccess?: (callback: () => void) => () => void;
}

export interface UseOfflineSyncResult {
  pendingCount: number;
  isSyncing: boolean;
  /** آخر نتيجة sync ({ synced, failed, remaining }) أو null. */
  lastSync: { synced: number; failed: number; remaining: number } | null;
  triggerSync: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

export function useOfflineSync(opts: UseOfflineSyncOptions = {}): UseOfflineSyncResult {
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<UseOfflineSyncResult['lastSync']>(null);
  // نمنع الـ concurrent syncs — لو واحد شغّال، الـ trigger التاني بيـ drop.
  const isSyncingRef = useRef<boolean>(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const c = await getPendingCount();
      setPendingCount(c);
    } catch (err) {
      logger.warn('[useOfflineSync] refreshPendingCount failed:', err);
    }
  }, []);

  const runSync = useCallback(async (): Promise<void> => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const result = await syncPendingEntries();
      setLastSync(result);
      setPendingCount(result.remaining);
    } catch (err) {
      logger.warn('[useOfflineSync] sync run failed:', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // بنـ refresh الـ count على الـ mount + كل ما الـ online state يتغير.
  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  // بنـ sync لما الـ network يرجع.
  useEffect(() => {
    if (isOnline) {
      void runSync();
    }
  }, [isOnline, runSync]);

  // بنـ sync لما الـ read layer يبعت notification إنه fetch بنجاح.
  useEffect(() => {
    if (!opts.registerReadSuccess) return;
    const unregister = opts.registerReadSuccess(() => {
      // نتحقق من الـ pendingCount قبل ما نطلق sync.
      void (async () => {
        await refreshPendingCount();
        setPendingCount((prev) => {
          if (prev > 0 && !isSyncingRef.current) {
            void runSync();
          }
          return prev;
        });
      })();
    });
    return unregister;
    // registerReadSuccess ممكن يكون unstable — بنعتمد على شكل الـ caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.registerReadSuccess]);

  const triggerSync = useCallback(async () => {
    await runSync();
  }, [runSync]);

  return {
    pendingCount,
    isSyncing,
    lastSync,
    triggerSync,
    refreshPendingCount,
  };
}
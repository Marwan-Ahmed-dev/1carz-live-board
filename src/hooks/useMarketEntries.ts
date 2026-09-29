'use client';

// hook لإدارة الـ market entries مع offline-first sync.
// 1. بنقرأ الـ IndexedDB cache فوراً (offline read).
// 2. بنعمل subscribe لـ Firestore live updates.
// 3. بعد كل read success، بنـ notify الـ useOfflineSync عشان يدفع pending.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCachedMarketEntries,
  subscribeToMarketEntries,
} from '@/lib/market';
import type { MarketEntry } from '@/lib/types';
import { logger } from '@/lib/logger';

export interface UseMarketEntriesResult {
  entries: MarketEntry[];
  /** true لحد ما الـ cache الأولي يرجع. */
  loading: boolean;
  /** الـ Firestore snapshot فشل — الـ entries المعروضة من الـ cache. */
  error: string | null;
  /** source الـ entries المعروضة. */
  source: 'cache' | 'firestore' | 'empty';
  /** اعمل re-subscribe + re-fetch من الـ cache. */
  refresh: () => void;
  /** إشعار useOfflineSync إن في entries وصلت من Firestore. */
  notifyReadSuccess: () => void;
  /** إشتراك في الـ notifyReadSuccess event (يرجع unsubscribe). */
  onReadSuccess: (cb: () => void) => () => void;
}

export function useMarketEntries(): UseMarketEntriesResult {
  const [entries, setEntries] = useState<MarketEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'firestore' | 'empty'>('empty');
  // نخزّن listeners لـ onReadSuccess
  const listenersRef = useRef<Set<() => void>>(new Set());
  // refresh token — لما يتغير بنعمل unsubscribe + subscribe من جديد
  const [reloadToken, setReloadToken] = useState<number>(0);

  // 1. cache-first read
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const cached = await getCachedMarketEntries();
        if (cancelled) return;
        if (cached.length > 0) {
          setEntries(cached);
          setSource('cache');
          // بنوقف loading — البيانات ظاهرة فوراً حتى لو الـ Firestore لسه
          // ما وصلش (offline).
          setLoading(false);
        }
      } catch (err) {
        logger.warn('[useMarketEntries] cache read failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  // 2. Firestore live subscription
  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeToMarketEntries(
      (live) => {
        if (cancelled) return;
        setEntries(live);
        setSource('firestore');
        setError(null);
        setLoading(false);
        // نطلق onReadSuccess listeners
        listenersRef.current.forEach((cb) => {
          try {
            cb();
          } catch (err) {
            logger.warn('[useMarketEntries] read listener threw:', err);
          }
        });
      },
      {
        onError: (err) => {
          if (cancelled) return;
          // لو في cache entries بالفعل، الـ error مش حاجب الـ UI.
          setError(err.message || 'فشل تحميل البيانات من السيرفر');
          setLoading(false);
        },
      }
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [reloadToken]);

  const refresh = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  const notifyReadSuccess = useCallback(() => {
    listenersRef.current.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        logger.warn('[useMarketEntries] read listener threw:', err);
      }
    });
  }, []);

  const onReadSuccess = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  return {
    entries,
    loading,
    error,
    source,
    refresh,
    notifyReadSuccess,
    onReadSuccess,
  };
}
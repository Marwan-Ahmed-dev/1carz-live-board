'use client';

// /market/pending — عرض الـ entries المعلّقة + Sync now.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CloudUpload, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { MarketNav } from '@/components/market/MarketNav';
import { PendingSyncBanner } from '@/components/market/PendingSyncBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  getPendingEntries,
  removePendingEntry,
  updatePendingEntryError,
} from '@/lib/offlineQueue';
import type { PendingMarketEntry } from '@/lib/types';
import { LoadingState } from '@/components/LoadingState';
import {
  ConfirmDialog,
  useConfirm,
} from '@/components/ConfirmDialog';
import { logger } from '@/lib/logger';

export default function MarketPendingPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { confirm, dialogProps } = useConfirm();
  const { isOnline } = useNetworkStatus();
  const { pendingCount, isSyncing, triggerSync, refreshPendingCount } = useOfflineSync();

  const [entries, setEntries] = useState<PendingMarketEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadPending = async () => {
    setLoading(true);
    try {
      const list = await getPendingEntries();
      setEntries(list);
    } catch (err) {
      logger.warn('[market/pending] load failed:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPending();
  }, []);

  // بعد أي sync بنعيد تحميل القائمة.
  useEffect(() => {
    void refreshPendingCount().then(loadPending);
  }, [isSyncing, refreshPendingCount]);

  const handleSyncAll = async () => {
    await triggerSync();
    await loadPending();
  };

  const handleDiscard = async (entry: PendingMarketEntry) => {
    const ok = await confirm({
      title: 'تجاهل الـ entry',
      message: `هل تريد تجاهل "${entry.brand} ${entry.model}"؟ مش هيتحفظ في السجل السعري.`,
      confirmLabel: 'تجاهل',
      cancelLabel: 'إلغاء',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await removePendingEntry(entry.client_id);
      showToast('تم تجاهل الـ entry', 'success');
      await loadPending();
    } catch (err) {
      logger.error('[market/pending] discard failed:', err);
      showToast('فشل التجاهل', 'error');
    }
  };

  return (
    <>
      <MarketNav pendingCount={pendingCount} isSyncing={isSyncing} onSync={triggerSync} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push('/market')}
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowRight size={14} />
            رجوع للسجل السعري
          </button>
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncing || !isOnline || entries.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
            Sync now
          </button>
        </div>

        <PendingSyncBanner
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          isOnline={isOnline}
          onSync={handleSyncAll}
        />

        <div className="bg-bg-card border border-border-soft rounded-2xl shadow-soft">
          <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary">الـ entries المعلّقة</h3>
            <button
              type="button"
              onClick={() => void loadPending()}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
              aria-label="تحديث القائمة"
            >
              <RefreshCw size={12} />
              تحديث
            </button>
          </div>
          {loading ? (
            <div className="px-5 py-8">
              <LoadingState variant="list" count={3} />
            </div>
          ) : entries.length === 0 ? (
            <div className="px-5 py-12 text-center text-text-muted text-sm">
              لا توجد entries معلّقة — كل البيانات متزامنة مع السيرفر.
            </div>
          ) : (
            <ul className="divide-y divide-border-soft">
              {entries.map((entry) => (
                <PendingRow
                  key={entry.client_id}
                  entry={entry}
                  canDiscard={entry.recorded_by_uid === user?.uid || isAdmin}
                  onDiscard={() => handleDiscard(entry)}
                />
              ))}
            </ul>
          )}
        </div>
      </main>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  );
}

function PendingRow({
  entry,
  canDiscard,
  onDiscard,
}: {
  entry: PendingMarketEntry;
  canDiscard: boolean;
  onDiscard: () => void;
}) {
  return (
    <li className="px-5 py-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-text-primary">
            {entry.brand} {entry.model}
          </span>
          <span className="text-xs text-text-muted" dir="ltr">
            {entry.year} · {entry.trim}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-accent-soft text-text-primary text-[10px] font-bold">
            في الانتظار
          </span>
        </div>
        <p className="text-xs text-text-muted mt-1" dir="ltr">
          {entry.price_egp.toLocaleString('en-US')} EGP ·{' '}
          {entry.mileage_km.toLocaleString('en-US')} km
        </p>
        {entry.last_error && (
          <p className="text-xs text-red-600 mt-1 truncate" title={entry.last_error}>
            ⚠ {entry.last_error}
          </p>
        )}
        <p className="text-[10px] text-text-muted mt-1">
          أُضيف في {new Date(entry.queued_at).toLocaleString('en-GB')}
        </p>
      </div>
      {canDiscard && (
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-bg-primary hover:bg-red-50 text-text-muted hover:text-red-700 transition-colors flex-shrink-0"
          aria-label="تجاهل"
        >
          <Trash2 size={14} />
        </button>
      )}
    </li>
  );
}
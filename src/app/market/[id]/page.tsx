'use client';

// /market/[id] — عرض + تعديل entry موجود.

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { MarketNav } from '@/components/market/MarketNav';
import { MarketEntryForm } from '@/components/market/MarketEntryForm';
import { PendingSyncBanner } from '@/components/market/PendingSyncBanner';
import { useAuth } from '@/hooks/useAuth';
import { useMarketEntries } from '@/hooks/useMarketEntries';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  deleteMarketEntry,
  getMarketEntry,
} from '@/lib/market';
import { useToast } from '@/hooks/useToast';
import type { MarketEntry } from '@/lib/types';
import { LoadingState } from '@/components/LoadingState';
import { logger } from '@/lib/logger';
import {
  ConfirmDialog,
  useConfirm,
} from '@/components/ConfirmDialog';

export default function MarketEntryDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { confirm, dialogProps } = useConfirm();
  const { isOnline } = useNetworkStatus();
  const { pendingCount, isSyncing, triggerSync } = useOfflineSync();
  const { entries } = useMarketEntries();

  const [entry, setEntry] = useState<MarketEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // suggestions — نفس اللي بنمرره في /market/new عشان الـ edit يكمّل بسهولة.
  const suggestions = useMemo(() => {
    const brandSet = new Set<string>();
    const modelSet = new Set<string>();
    const yearSet = new Set<number>();
    const mileageSet = new Set<number>();
    for (const e of entries) {
      if (e.brand) brandSet.add(e.brand);
      if (e.model) modelSet.add(e.model);
      yearSet.add(e.year);
      if (e.mileage_km) mileageSet.add(e.mileage_km);
    }
    return {
      brands: Array.from(brandSet).sort(),
      models: Array.from(modelSet).sort(),
      years: Array.from(yearSet).sort((a, b) => b - a),
      mileages: Array.from(mileageSet).sort((a, b) => a - b),
    };
  }, [entries]);

  const isOwner = entry && user ? entry.recorded_by_uid === user.uid : false;
  const canEdit = isOwner || isAdmin;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const found = await getMarketEntry(id);
        if (cancelled) return;
        if (!found) {
          setError('لم يتم العثور على الـ entry');
        } else {
          setEntry(found);
        }
      } catch (err) {
        logger.error('[MarketDetail] load failed:', err);
        if (!cancelled) setError('فشل تحميل الـ entry');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!entry) return;
    const ok = await confirm({
      title: 'حذف الـ entry',
      message: 'هل تريد حذف هذا الـ entry؟ هذا الإجراء لا يمكن التراجع عنه.',
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteMarketEntry(entry.id);
      showToast('تم حذف الـ entry', 'success');
      router.push('/market');
    } catch (err) {
      logger.error('[MarketDetail] delete failed:', err);
      showToast(
        err instanceof Error ? err.message : 'فشل الحذف',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <MarketNav pendingCount={pendingCount} isSyncing={isSyncing} onSync={triggerSync} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push('/market')}
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowRight size={14} />
            رجوع للسجل السعري
          </button>
          {canEdit && entry && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-sm font-semibold disabled:opacity-60"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              حذف
            </button>
          )}
        </div>

        <PendingSyncBanner
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          isOnline={isOnline}
          onSync={triggerSync}
        />

        {loading ? (
          <div className="bg-bg-card border border-border-soft rounded-2xl p-6 shadow-soft">
            <LoadingState variant="detail" />
          </div>
        ) : error || !entry ? (
          <div className="bg-bg-card border border-border-soft rounded-2xl p-6 text-center text-text-muted text-sm shadow-soft">
            {error || 'لم يتم العثور على الـ entry.'}
          </div>
        ) : (
          <div className="bg-bg-card border border-border-soft rounded-2xl p-5 sm:p-6 shadow-soft">
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-text-primary">
                {entry.brand} {entry.model}
              </h1>
              <p className="text-sm text-text-muted mt-1">
                {entry.year} · {entry.trim} · {entry.price_egp.toLocaleString('en-US')} EGP
              </p>
            </div>

            {canEdit ? (
              <MarketEntryForm
                initial={entry}
                onSaved={(result) => {
                  if (result.synced) {
                    router.refresh();
                  }
                }}
                suggestions={suggestions}
              />
            ) : (
              <ReadOnlyView entry={entry} />
            )}
          </div>
        )}
      </main>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  );
}

function ReadOnlyView({ entry }: { entry: MarketEntry }) {
  const isZero = entry.is_zero === true;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ReadOnlyRow label="Type" value={isZero ? 'عربية زيرو' : 'عربية مستعملة'} />
      <ReadOnlyRow label="Brand" value={entry.brand} />
      <ReadOnlyRow label="Model" value={entry.model} />
      <ReadOnlyRow label="Year" value={String(entry.year)} dir="ltr" />
      <ReadOnlyRow label="Trim" value={entry.trim} />
      {!isZero && (
        <>
          <ReadOnlyRow label="Paint / Condition" value={entry.paint_condition} />
          <ReadOnlyRow
            label="Mileage (KM)"
            value={entry.mileage_km.toLocaleString('en-US')}
            dir="ltr"
          />
          <ReadOnlyRow label="Maintenance" value={entry.maintenance} />
        </>
      )}
      <ReadOnlyRow
        label="Price (EGP)"
        value={`${entry.price_egp.toLocaleString('en-US')} EGP`}
        dir="ltr"
      />
      {entry.notes && <ReadOnlyRow label="Notes" value={entry.notes} full />}
      {entry.recorded_by_name && (
        <ReadOnlyRow label="Recorded by" value={entry.recorded_by_name} />
      )}
    </dl>
  );
}

function ReadOnlyRow({
  label,
  value,
  dir,
  full,
}: {
  label: string;
  value: string;
  dir?: 'ltr' | 'rtl';
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
        {label}
      </dt>
      <dd className="text-sm text-text-primary" dir={dir}>
        {value || '—'}
      </dd>
    </div>
  );
}
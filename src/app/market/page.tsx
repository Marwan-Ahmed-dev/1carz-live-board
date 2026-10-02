'use client';

// /market — السجل السعري.
// - Top nav (MarketNav).
// - Pending sync banner (لو في pending).
// - Search form + Results table في العمود الشمال.
// - Split-view responsive:
//   • < lg (1024px) — Mobile + Tablet: detail panel = full-screen overlay
//     يـ slide-in من الـ start side (right في الـ RTL). خلفية معتمة + close button.
//     × الموبايل (< sm 640px): full-screen overlay بـ margins صغيرة.
//     × التابلت (sm - lg): نفس السلوك، overlay بنفس التصميم.
//   • ≥ lg (1024px) — Desktop: 2-column grid مع sticky panel بعرض 400px
//     (العمود اليمين في الـ LTR = الشمال بصرياً في الـ RTL).
// - ممنوع أي horizontal scroll على أي breakpoint.
// - الـ close button على الموبايل بيكبر لـ 44px (touch target).

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarketNav } from '@/components/market/MarketNav';
import {
  MarketSearchForm,
  MarketFilters,
  DEFAULT_MARKET_FILTERS,
} from '@/components/market/MarketSearchForm';
import { MarketResultsTable } from '@/components/market/MarketResultsTable';
import { PendingSyncBanner } from '@/components/market/PendingSyncBanner';
import { CarDetailPanel } from '@/components/market/CarDetailPanel';
import { ConfirmDialog, useConfirm } from '@/components/ConfirmDialog';
import { useMarketEntries } from '@/hooks/useMarketEntries';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { deleteMarketEntry } from '@/lib/market';
import { logger } from '@/lib/logger';
import type { MarketEntry } from '@/lib/types';

export default function MarketPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { confirm, dialogProps } = useConfirm();
  const { entries, loading, source, error, onReadSuccess } = useMarketEntries();
  const { isOnline } = useNetworkStatus();

  // نربط الـ useOfflineSync بالـ read success notification.
  const { pendingCount, isSyncing, triggerSync } = useOfflineSync({
    registerReadSuccess: (cb) => onReadSuccess(cb),
  });

  const [filters, setFilters] = useState<MarketFilters>(DEFAULT_MARKET_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<MarketFilters>(DEFAULT_MARKET_FILTERS);

  // الـ entry المختار + الـ panel مفتوح
  const [selectedEntry, setSelectedEntry] = useState<MarketEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManageSelected = Boolean(
    selectedEntry &&
      user &&
      (isAdmin || selectedEntry.recorded_by_uid === user.uid)
  );

  // بنطبّق الفلاتر على الـ entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (appliedFilters.brand && e.brand !== appliedFilters.brand) return false;
      if (appliedFilters.model && e.model !== appliedFilters.model) return false;
      if (appliedFilters.year && String(e.year) !== appliedFilters.year) return false;
      if (appliedFilters.trim && e.trim !== appliedFilters.trim) return false;
      if (appliedFilters.paint && e.paint_condition !== appliedFilters.paint) return false;
      // mileage كـ نص حر — لو اليوزر كتب "120000" بنطابق == أو <= لو فيه إشارة.
      if (appliedFilters.mileage) {
        const raw = appliedFilters.mileage.trim();
        const numMatch = raw.match(/(\d[\d,]*)/);
        if (numMatch) {
          const target = Number(numMatch[1].replace(/,/g, ''));
          if (raw.includes('<=') || raw.includes('أقل')) {
            if (!(e.mileage_km <= target)) return false;
          } else if (raw.includes('>=') || raw.includes('أكثر')) {
            if (!(e.mileage_km >= target)) return false;
          } else if (raw.includes('<')) {
            if (!(e.mileage_km < target)) return false;
          } else if (raw.includes('>')) {
            if (!(e.mileage_km > target)) return false;
          } else {
            if (e.mileage_km !== target) return false;
          }
        }
      }
      return true;
    });
  }, [entries, appliedFilters]);

  // الـ entries المستخدمة للـ aggregations في الـ panel: بنتضمّن الـ entry المختار
  // لو مش موجود في الـ filteredEntries (مثلاً لو اليوزر مسح فلتر).
  const panelMatchingEntries = useMemo(() => {
    if (!selectedEntry) return [];
    // نضم الكلمة الكاملة (brand + model + year + trim) للـ matching.
    const matches = filteredEntries.filter(
      (e) =>
        e.brand === selectedEntry.brand &&
        e.model === selectedEntry.model &&
        e.year === selectedEntry.year &&
        e.trim === selectedEntry.trim
    );
    // نتأكد إن الـ entry المختار موجود في النتيجة (fallback لو ما لقيناش تطابق).
    if (!matches.find((e) => e.id === selectedEntry.id)) {
      matches.push(selectedEntry);
    }
    return matches;
  }, [filteredEntries, selectedEntry]);

  // Auto-clear selected entry لو اختفى من القائمة بعد الفلاتر
  useEffect(() => {
    if (selectedEntry && !entries.find((e) => e.id === selectedEntry.id)) {
      setSelectedEntry(null);
    }
  }, [entries, selectedEntry]);

  const panelOpen = !!selectedEntry;
  const closePanel = () => setSelectedEntry(null);

  const handleEditSelected = () => {
    if (!selectedEntry) return;
    router.push(`/market/${selectedEntry.id}`);
  };

  const handleDeleteSelected = async () => {
    if (!selectedEntry) return;
    const ok = await confirm({
      title: 'حذف الـ entry',
      message: `هل تريد حذف "${selectedEntry.brand} ${selectedEntry.model}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteMarketEntry(selectedEntry.id);
      showToast('تم حذف الـ entry', 'success');
      setSelectedEntry(null);
    } catch (err) {
      logger.error('[MarketPage] delete failed:', err);
      showToast(err instanceof Error ? err.message : 'فشل الحذف', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const panelProps = selectedEntry
    ? {
        brand: selectedEntry.brand,
        model: selectedEntry.model,
        year: selectedEntry.year,
        trim: selectedEntry.trim,
        matchingEntries: panelMatchingEntries,
        onClose: closePanel,
        selectedEntry,
        canManageSelected,
        onEditSelected: handleEditSelected,
        onDeleteSelected: () => void handleDeleteSelected(),
        deletingSelected: deleting,
      }
    : null;

  return (
    <>
      <MarketNav pendingCount={pendingCount} isSyncing={isSyncing} onSync={triggerSync} />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 space-y-4">
        <PendingSyncBanner
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          isOnline={isOnline}
          onSync={triggerSync}
        />

        {/* Layout container:
            • < lg: single column — الـ panel يطلع كـ overlay.
            • ≥ lg: 2 columns — الجدول في العمود الأول والـ panel sticky في الـ column التاني. */}
        <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-4 lg:items-start">
          {/* العمود الشمال: search + results */}
          <div className="space-y-4 min-w-0">
            <MarketSearchForm
              filters={filters}
              onChange={setFilters}
              onSearch={() => setAppliedFilters(filters)}
              onReset={() => {
                setFilters(DEFAULT_MARKET_FILTERS);
                setAppliedFilters(DEFAULT_MARKET_FILTERS);
              }}
              entries={entries}
            />

            <MarketResultsTable
              entries={filteredEntries}
              loading={loading}
              selectedId={selectedEntry?.id ?? null}
              onSelect={(entry) => setSelectedEntry(entry)}
            />

            {/* info bar: source + error */}
            <div className="text-xs text-text-muted px-1 flex items-center justify-between">
              <span>
                {source === 'cache' && 'عرض من الكاش — الاتصال قد يكون محدوداً'}
                {source === 'firestore' && 'متصل — البيانات محدّثة'}
                {source === 'empty' && !loading && 'لا توجد بيانات'}
              </span>
              {error && <span className="text-amber-600">⚠ {error}</span>}
            </div>
          </div>

          {/* Desktop panel — sticky على يمين الـ grid (شمال بصرياً في RTL). */}
          {panelOpen && panelProps && (
            <div
              className="hidden lg:block sticky top-20 self-start min-w-0"
              // For narrow desktop widths, allow the panel itself to scroll internally
              // rather than overflowing the viewport horizontally.
              style={{ maxHeight: 'calc(100vh - 6rem)' }}
            >
              <CarDetailPanel {...panelProps} />
            </div>
          )}
        </div>

        {/* Mobile + Tablet overlay (< lg).
            • positioned at the start side via inset-inline-start (right في الـ RTL).
            • الـ panel slides in من الـ start side باستخدام الـ animation class.
            • الـ backdrop click بيكسر الـ panel.
            • body scroll محجوب طول ما الـ panel مفتوح عشان مفيش double-scroll. */}
        {panelOpen && panelProps && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={closePanel}
            aria-hidden="true"
          >
            <div
              className="absolute inset-y-0 inset-inline-start-0 w-full sm:w-[28rem] sm:max-w-[90vw] panel-slide-in-from-start bg-bg-primary overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="تفاصيل السيارة"
            >
              <CarDetailPanel {...panelProps} />
            </div>
          </div>
        )}
      </main>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  );
}
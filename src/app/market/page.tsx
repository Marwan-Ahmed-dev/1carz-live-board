'use client';

// /market — السجل السعري.
// - Top nav (MarketNav).
// - Pending sync banner (لو في pending).
// - Search form + Results table في العمود الشمال.
// - Split-view: لو اليوزر اختار entry → CarDetailPanel يفتح في العمود اليمين
//   (sticky, ~400px wide). على الموبايل بيتحول لـ full-screen overlay.

import { useEffect, useMemo, useState } from 'react';
import { MarketNav } from '@/components/market/MarketNav';
import {
  MarketSearchForm,
  MarketFilters,
  DEFAULT_MARKET_FILTERS,
} from '@/components/market/MarketSearchForm';
import { MarketResultsTable } from '@/components/market/MarketResultsTable';
import { PendingSyncBanner } from '@/components/market/PendingSyncBanner';
import { CarDetailPanel } from '@/components/market/CarDetailPanel';
import { useMarketEntries } from '@/hooks/useMarketEntries';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { MarketEntry } from '@/lib/types';

export default function MarketPage() {
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

  // بنطبّق الفلاتر على الـ entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (appliedFilters.brand && e.brand !== appliedFilters.brand) return false;
      if (appliedFilters.model && e.model !== appliedFilters.model) return false;
      if (appliedFilters.year && String(e.year) !== appliedFilters.year) return false;
      if (appliedFilters.trim && e.trim !== appliedFilters.trim) return false;
      if (appliedFilters.paint && e.paint_condition !== appliedFilters.paint) return false;
      if (appliedFilters.minPrice) {
        const min = Number(appliedFilters.minPrice);
        if (Number.isFinite(min) && e.price_egp < min) return false;
      }
      if (appliedFilters.maxPrice) {
        const max = Number(appliedFilters.maxPrice);
        if (Number.isFinite(max) && e.price_egp > max) return false;
      }
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

  return (
    <>
      <MarketNav pendingCount={pendingCount} isSyncing={isSyncing} onSync={triggerSync} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <PendingSyncBanner
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          isOnline={isOnline}
          onSync={triggerSync}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 items-start">
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

          {/* العمود اليمين: detail panel (desktop only). على الموبايل بنعرض overlay. */}
          {panelOpen && selectedEntry && (
            <>
              {/* Desktop panel */}
              <div className="hidden lg:block sticky top-20 self-start">
                  <CarDetailPanel
                    brand={selectedEntry.brand}
                    model={selectedEntry.model}
                    year={selectedEntry.year}
                    trim={selectedEntry.trim}
                    matchingEntries={panelMatchingEntries}
                    onClose={() => setSelectedEntry(null)}
                  />
                </div>

              {/* Mobile overlay */}
              <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-stretch justify-end animate-fade-in">
                <div className="w-full max-w-md m-2 sm:m-3 overflow-y-auto">
                  <CarDetailPanel
                    brand={selectedEntry.brand}
                    model={selectedEntry.model}
                    year={selectedEntry.year}
                    trim={selectedEntry.trim}
                    matchingEntries={panelMatchingEntries}
                    onClose={() => setSelectedEntry(null)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
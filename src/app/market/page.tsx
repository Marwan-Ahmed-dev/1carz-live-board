'use client';

// /market — السجل السعري.
// - Top nav (MarketNav).
// - Pending sync banner (لو في pending).
// - Search form.
// - Results table.

import { useEffect, useMemo, useState } from 'react';
import { MarketNav } from '@/components/market/MarketNav';
import {
  MarketSearchForm,
  MarketFilters,
  DEFAULT_MARKET_FILTERS,
} from '@/components/market/MarketSearchForm';
import { MarketResultsTable } from '@/components/market/MarketResultsTable';
import { PendingSyncBanner } from '@/components/market/PendingSyncBanner';
import { useMarketEntries } from '@/hooks/useMarketEntries';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function MarketPage() {
  const { entries, loading, source, error, onReadSuccess } = useMarketEntries();
  const { isOnline } = useNetworkStatus();

  // نربط الـ useOfflineSync بالـ read success notification.
  const { pendingCount, isSyncing, triggerSync } = useOfflineSync({
    registerReadSuccess: (cb) => onReadSuccess(cb),
  });

  const [filters, setFilters] = useState<MarketFilters>(DEFAULT_MARKET_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<MarketFilters>(DEFAULT_MARKET_FILTERS);

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

        <MarketResultsTable entries={filteredEntries} loading={loading} />

        {/* info bar: source + error */}
        <div className="text-xs text-slate-500 px-1 flex items-center justify-between">
          <span>
            {source === 'cache' && 'عرض من الكاش — الاتصال قد يكون محدوداً'}
            {source === 'firestore' && 'متصل — البيانات محدّثة'}
            {source === 'empty' && !loading && 'لا توجد بيانات'}
          </span>
          {error && <span className="text-amber-600">⚠ {error}</span>}
        </div>
      </main>
    </>
  );
}
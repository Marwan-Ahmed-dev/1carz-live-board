'use client';

// /market/new — إضافة entry جديد.

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { MarketNav } from '@/components/market/MarketNav';
import { MarketEntryForm } from '@/components/market/MarketEntryForm';
import { useMarketEntries } from '@/hooks/useMarketEntries';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export default function MarketNewPage() {
  const router = useRouter();
  const { pendingCount, isSyncing, triggerSync } = useOfflineSync();
  const { entries } = useMarketEntries();

  // بنستخرج suggestions مميزة من الـ entries الموجودة (brand/model unique + years + mileages).
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

  return (
    <>
      <MarketNav pendingCount={pendingCount} isSyncing={isSyncing} onSync={triggerSync} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
        <button
          type="button"
          onClick={() => router.push('/market')}
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowRight size={14} />
          رجوع للسجل السعري
        </button>

        <div className="bg-bg-card border border-border-soft rounded-2xl p-5 sm:p-6 shadow-soft">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-text-primary">إضافة entry جديد</h1>
            <p className="text-sm text-text-muted mt-1">
              سجّل بيانات عربية جديدة. لو مش متصل بالإنترنت، الـ entry هيتحفظ في الانتظار
              ويُرسل تلقائياً لما ترجع الـ connection.
            </p>
          </div>

          <MarketEntryForm
            onSavedAndAddAnother={() => {
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            suggestions={suggestions}
          />
        </div>
      </main>
    </>
  );
}

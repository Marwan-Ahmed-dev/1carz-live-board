'use client';

// /market/new — إضافة entry جديد.

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { MarketNav } from '@/components/market/MarketNav';
import { MarketEntryForm } from '@/components/market/MarketEntryForm';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export default function MarketNewPage() {
  const router = useRouter();
  const { pendingCount, isSyncing, triggerSync } = useOfflineSync();

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
            onSaved={(result) => {
              if (result.synced) {
                router.push(`/market/${result.id}`);
              }
            }}
            onSavedAndAddAnother={() => {
              // النموذج بيتفرّغ داخلياً — بنعمل scroll للـ top عشان اليوزر يشوف الفورم الفاضي.
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          />
        </div>
      </main>
    </>
  );
}
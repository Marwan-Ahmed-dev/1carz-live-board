'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCars, groupByPriority } from '@/hooks/useCars';
import { Header } from '@/components/Header';
import { PriorityButtons } from '@/components/PriorityButtons';
import { CarCard } from '@/components/CarCard';
import { PriceFilter } from '@/components/PriceFilter';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { PriorityFilter } from '@/lib/types';
import { PRIORITY_ACCENTS, PRIORITY_LABELS, PRIORITY_ORDER, PRIORITY_SECTION_LABELS } from '@/lib/priority';

export default function HomePage() {
  const router = useRouter();
  const { user, userData, loading: authLoading, needsOnboarding, error: authError } = useAuth();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [user, authLoading, needsOnboarding, router]);

  const { cars, loading, error } = useCars({
    priority: priorityFilter,
    uid: user?.uid,
    minPrice,
    maxPrice,
  });

  const groups = useMemo(() => groupByPriority(cars), [cars]);
  const totalCount = cars.length;

  // حماية من عرض الصفحة قبل استقرار الـ auth
  if (authLoading || !user || needsOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState variant="page" />
      </div>
    );
  }

  if (authError && !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          title="تعذر تحميل الحساب"
          description={authError}
        />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState variant="page" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* شريط أزرار الأولوية */}
        <PriorityButtons current={priorityFilter} onChange={setPriorityFilter} />

        {/* فلتر السعر */}
        <PriceFilter
          onApply={(min, max) => {
            setMinPrice(min);
            setMaxPrice(max);
          }}
          initialMin={minPrice}
          initialMax={maxPrice}
        />

        {/* حالة التحميل */}
        {loading && <LoadingState count={6} />}

        {!loading && error && (
          <EmptyState
            title="تعذر تحميل العربيات"
            description="حصل خطأ أثناء جلب العربيات. حاول تحديث الصفحة."
          />
        )}

        {!loading && !error && totalCount === 0 && (
          <EmptyState
            title="لا توجد عربيات حالياً"
            description={
              priorityFilter === 'all'
                ? 'سيتم إضافة عربيات جديدة قريباً. تابعنا!'
                : `لا توجد عربيات بمستوى ${PRIORITY_LABELS[priorityFilter]} حالياً`
            }
          />
        )}

        {/* الأقسام حسب الأولوية */}
        {!loading && !error && totalCount > 0 && (
          <div className="space-y-6">
            {PRIORITY_ORDER.map((p) => {
              const list = groups[p];
              if (!list || list.length === 0) return null;
              return (
                <section key={p} className="space-y-3">
                  {/* الشريط العلوي بألوان الأولوية */}
                  <div className={`h-1 rounded-full ${PRIORITY_ACCENTS[p]}`} />
                  <div className="flex items-center justify-between gap-2 px-1">
                    <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                      {PRIORITY_SECTION_LABELS[p]}
                    </h2>
                    <span className="badge-number text-xs px-2.5 py-1 rounded-full bg-bg-card text-text-secondary font-bold">
                      {list.length}
                    </span>
                  </div>

                  {/* شبكة العربيات */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                    {list.map((car) => (
                      <CarCard key={car.id} car={car} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
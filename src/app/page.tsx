'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCars, groupByPriority } from '@/hooks/useCars';
import { Header } from '@/components/Header';
import { PriorityButtons } from '@/components/PriorityButtons';
import { CarCard } from '@/components/CarCard';
import { PriceFilter } from '@/components/PriceFilter';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { PriorityFilter, Priority } from '@/lib/types';

const PRIORITY_META: Record<Priority, { label: string; accent: string }> = {
  top: { label: 'أولوية قصوى', accent: 'bg-accent-yellow' },
  high: { label: 'أولوية عالية', accent: 'bg-accent-soft' },
  medium: { label: 'أولوية متوسطة', accent: 'bg-bg-card' },
  low: { label: 'أولوية منخفضة', accent: 'bg-bg-card-hover' },
};

export default function HomePage() {
  const router = useRouter();
  const { user, userData, loading: authLoading, needsOnboarding } = useAuth();
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

  const { cars, loading } = useCars({
    priority: priorityFilter,
    uid: user?.uid,
    minPrice,
    maxPrice,
  });

  const groups = useMemo(() => groupByPriority(cars), [cars]);
  const totalCount = cars.length;

  // حماية من عرض الصفحة قبل استقرار الـ auth
  if (authLoading || !user || !userData || needsOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState count={6} />
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

        {/* حالة فارغة */}
        {!loading && totalCount === 0 && (
          <EmptyState
            title="لا توجد عربيات حالياً"
            description="سيتم إضافة عربيات جديدة قريباً. تابعنا!"
          />
        )}

        {/* الأقسام حسب الأولوية */}
        {!loading && totalCount > 0 && (
          <div className="space-y-6">
            {(['top', 'high', 'medium', 'low'] as Priority[]).map((p) => {
              const list = groups[p];
              if (!list || list.length === 0) return null;
              const meta = PRIORITY_META[p];
              return (
                <section key={p} className="space-y-3">
                  {/* الشريط العلوي بألوان الأولوية */}
                  <div className={`h-1 rounded-full ${meta.accent}`} />
                  <div className="flex items-center justify-between gap-2 px-1">
                    <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                      {meta.label}
                    </h2>
                    <span className="badge-number text-xs px-2.5 py-1 rounded-full bg-bg-card text-text-secondary font-bold">
                      {list.length}
                    </span>
                  </div>

                  {/* شبكة العربيات */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {list.map((car) => (
                      <CarCard key={car.id} car={car} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* زر سريع لـ 3arabyatna */}
        {!loading && totalCount > 0 && (
          <div className="pt-4 flex justify-center">
            <button
              onClick={() => router.push('/3arabyatna')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bg-card hover:bg-bg-card-hover border border-border-soft text-text-secondary text-sm font-medium transition-colors"
            >
              <Heart size={16} className="text-accent-yellow-hover" />
              <span>عربياتي فقط</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
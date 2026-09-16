'use client';

import { useEffect, useState } from 'react';
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

export default function MyCarsPage() {
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
    username: userData?.username,
    minPrice,
    maxPrice,
  });

  // Auth not ready
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
        {/* Page Title */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center">
            <Heart size={20} className="text-accent-yellow-hover" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">عربياتي</h1>
            <p className="text-xs text-text-muted">العربيات المخصصة لك</p>
          </div>
        </div>

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
        {!loading && cars.length === 0 && (
          <EmptyState
            icon={<Heart size={40} className="text-text-muted" strokeWidth={1.5} />}
            title="لا توجد عربيات مخصصة لك"
            description="ستظهر هنا العربيات المخصصة لك من قِبل الإدارة"
          />
        )}

        {/* عرض العربيات بنفس الـ grouping بالـ priority */}
        {!loading && cars.length > 0 && (
          <div className="space-y-6">
            {(['top', 'high', 'medium', 'low'] as Priority[]).map((p) => {
              const list = groupByPriority(cars)[p];
              if (!list || list.length === 0) return null;
              const meta = PRIORITY_META[p];
              return (
                <section key={p} className="space-y-3">
                  <div className={`h-1 rounded-full ${meta.accent}`} />
                  <div className="flex items-center justify-between gap-2 px-1">
                    <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                      {meta.label}
                    </h2>
                    <span className="badge-number text-xs px-2.5 py-1 rounded-full bg-bg-card text-text-secondary font-bold">
                      {list.length}
                    </span>
                  </div>
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
      </main>
    </div>
  );
}
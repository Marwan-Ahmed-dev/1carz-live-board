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
import { subscribeToGroups } from '@/lib/groups';

/**
 * المسوّق = أي حساب مسجّل مش أدمن ومش معاين.
 * الفلتر على assigned_to لازم يشتغل لكل المسوّقين، حتى لو is_marketer
 * أو daily_buyer_limit مش متعيّنين في الـ doc (حسابات قديمة).
 */
function isMarketerAccount(isStaff: boolean, hasUser: boolean): boolean {
  return hasUser && !isStaff;
}

export default function CarsBoardPage() {
  const router = useRouter();
  const { user, userData, isAdmin, isInspector, loading: authLoading, needsOnboarding, error: authError } = useAuth();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  // المجموعات اللي اليوزر عضو فيها (للمسوّق فقط)
  const [marketerGroupUids, setMarketerGroupUids] = useState<string[]>([]);

  const isStaff = isAdmin || isInspector;
  const isGuest = !authLoading && !user;
  const isMarketer = isMarketerAccount(isStaff, !!user);

  useEffect(() => {
    if (authLoading) return;
    if (user && needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [user, authLoading, needsOnboarding, router]);

  useEffect(() => {
    if (!isGuest) return;
    if (priorityFilter !== 'all' && priorityFilter !== 'arabyatna') {
      setPriorityFilter('all');
    }
  }, [isGuest, priorityFilter]);

  // لو مسوّق: اسحب المجموعات اللي هو عضو فيها (query مطابق لقواعد Firestore)
  useEffect(() => {
    if (!isMarketer || !user) {
      setMarketerGroupUids([]);
      return;
    }
    const unsub = subscribeToGroups(
      (groups) => {
        setMarketerGroupUids(groups.map((g) => g.id));
      },
      { memberOfUid: user.uid }
    );
    return () => unsub();
  }, [isMarketer, user]);

  const marketerFilter = useMemo(() => {
    if (!isMarketer || !user) return null;
    return { uid: user.uid, groupUids: marketerGroupUids };
  }, [isMarketer, user, marketerGroupUids]);

  const { cars, loading, error } = useCars({
    priority: priorityFilter,
    uid: user?.uid,
    publicOnly: isGuest,
    marketerFilter,
    createdByUid: isAdmin && user ? user.uid : null,
    minPrice,
    maxPrice,
  });

  const groups = useMemo(() => groupByPriority(cars), [cars]);
  const totalCount = cars.length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState variant="page" />
      </div>
    );
  }

  if (user && needsOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState variant="page" />
      </div>
    );
  }

  if (user && authError && !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState title="تعذر تحميل الحساب" description={authError} />
      </div>
    );
  }

  if (user && !userData) {
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
        <PriorityButtons
          current={priorityFilter}
          onChange={setPriorityFilter}
          guestMode={isGuest}
        />

        <PriceFilter
          onApply={(min, max) => {
            setMinPrice(min);
            setMaxPrice(max);
          }}
          initialMin={minPrice}
          initialMax={maxPrice}
        />

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
              isMarketer
                ? 'لا توجد عربيات مخصصة لك أو لمجموعتك بعد. تواصل مع الأدمن.'
                : priorityFilter === 'all'
                  ? 'سيتم إضافة عربيات جديدة قريباً. تابعنا!'
                  : `لا توجد عربيات بمستوى ${PRIORITY_LABELS[priorityFilter]} حالياً`
            }
          />
        )}

        {!loading && !error && totalCount > 0 && (
          isGuest ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              {cars.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {PRIORITY_ORDER.map((p) => {
                const list = groups[p];
                if (!list || list.length === 0) return null;
                return (
                  <section key={p} className="space-y-3">
                    <div className={`h-1 rounded-full ${PRIORITY_ACCENTS[p]}`} />
                    <div className="flex items-center justify-between gap-2 px-1">
                      <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                        {PRIORITY_SECTION_LABELS[p]}
                      </h2>
                      <span className="badge-number text-xs px-2.5 py-1 rounded-full bg-bg-card text-text-secondary font-bold">
                        {list.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                      {list.map((car) => (
                        <CarCard key={car.id} car={car} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )
        )}
      </main>
    </div>
  );
}

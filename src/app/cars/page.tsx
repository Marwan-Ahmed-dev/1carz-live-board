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
 * تحديد هل المستخدم مسوّق (بيشوف عربيات مخصوصة بس).
 * الترتيب:
 *   1. الـ flag الصريح is_marketer === true (يفوز حتى لو daily_buyer_limit = 0)
 *   2. fallback: daily_buyer_limit > 0 مع role = 'user' (أي حد غير الأدمن والمعاين)
 *
 * ⚠️ السيرفر (Firestore rules) مش بيطبّق الفلتر ده — ده UX personalization بس
 * لأن البيانات نفسها (cars) public للقراءة. مرجع: commit الذي أعاد الـ model.
 */
function detectIsMarketer(
  userData: { is_marketer?: boolean; daily_buyer_limit?: number; role?: 'admin' | 'user' | 'inspector' } | null,
  isStaff: boolean
): boolean {
  if (!userData) return false;
  if (userData.is_marketer === true) return true;
  if (isStaff) return false; // admin/inspector مش مسوّقين حتى لو عندهم daily_limit
  // fallback: user عادي عنده daily_buyer_limit > 0 → اعتبره مسوّق
  return (
    userData.role === 'user' &&
    typeof userData.daily_buyer_limit === 'number' &&
    userData.daily_buyer_limit > 0
  );
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
  const isMarketer = !isGuest && !isStaff && detectIsMarketer(userData, isStaff);

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

  // لو مسوّق: اسحب المجموعات اللي هو عضو فيها وحدّد UIDs بتاعتها
  useEffect(() => {
    if (!isMarketer || !user) {
      setMarketerGroupUids([]);
      return;
    }
    const unsub = subscribeToGroups((groups) => {
      const uids: string[] = [];
      for (const g of groups) {
        if (g.memberUids && g.memberUids.includes(user.uid)) {
          uids.push(g.id);
        }
      }
      setMarketerGroupUids(uids);
    });
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
          guestMode={isGuest || isMarketer}
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

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
import { titleMatchesSearchQuery } from '@/lib/brandAliases';
import { Search } from 'lucide-react';

/**
 * المسوّق = أي حساب مسجّل مش أدمن ومش معاين ومش source.
 * الـ source role عنده تجربة منفصلة (/market/*) — مش مسوّق ومش staff.
 * الفلتر على assigned_to لازم يشتغل لكل المسوّقين، حتى لو is_marketer
 * أو daily_buyer_limit مش متعيّنين في الـ doc (حسابات قديمة).
 */
function isMarketerAccount(isStaff: boolean, hasUser: boolean, isSourceUser: boolean): boolean {
  return hasUser && !isStaff && !isSourceUser;
}

export default function CarsBoardPage() {
  const router = useRouter();
  const { user, userData, isAdmin, isInspector, isSource, loading: authLoading, needsOnboarding, error: authError } = useAuth();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  /** أدمن: سيارات تم فحصها | كل السيارات */
  const [adminScope, setAdminScope] = useState<'inspected' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // المجموعات اللي اليوزر عضو فيها (للمسوّق فقط)
  const [marketerGroupUids, setMarketerGroupUids] = useState<string[]>([]);

  const isStaff = isAdmin || isInspector;
  const isSourceUser = isSource;
  const isGuest = !authLoading && !user;
  const isMarketer = isMarketerAccount(isStaff, !!user, isSourceUser);

  useEffect(() => {
    if (authLoading) return;
    // Source users → /market (separate flow, no access to /cars)
    if (isSourceUser) {
      router.replace('/market');
      return;
    }
    if (user && needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [user, authLoading, needsOnboarding, isSourceUser, router]);

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
    minPrice,
    maxPrice,
  });

  const visibleCars = useMemo(() => {
    let list = cars;
    if (isAdmin && adminScope === 'inspected') {
      list = list.filter((c) => !!c.is_inspected || c.priority === 'arabyatna');
    }
    if (!searchQuery.trim()) return list;
    return list.filter((c) => titleMatchesSearchQuery(c.title, searchQuery));
  }, [cars, searchQuery, isAdmin, adminScope]);

  const groups = useMemo(() => groupByPriority(visibleCars), [visibleCars]);
  const totalCount = visibleCars.length;

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

        {isAdmin && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdminScope('inspected')}
              className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                adminScope === 'inspected'
                  ? 'bg-accent-yellow text-text-primary'
                  : 'bg-bg-card border border-border-soft text-text-secondary hover:text-text-primary'
              }`}
            >
              سيارات تم فحصها
            </button>
            <button
              type="button"
              onClick={() => setAdminScope('all')}
              className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                adminScope === 'all'
                  ? 'bg-accent-yellow text-text-primary'
                  : 'bg-bg-card border border-border-soft text-text-secondary hover:text-text-primary'
              }`}
            >
              كل السيارات
            </button>
          </div>
        )}

        <div className="relative">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالماركة أو الموديل (عربي أو إنجليزي)…"
            className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-bg-card border border-border-soft text-sm text-text-primary placeholder:text-text-muted"
          />
        </div>

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
            title={searchQuery.trim() ? 'لا نتائج لهذا البحث' : 'لا توجد عربيات حالياً'}
            description={
              searchQuery.trim()
                ? 'جرّب اسم الماركة بالعربي أو الإنجليزي (مثل: مرسيدس / Mercedes)'
                : isMarketer
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
              {/* عربيات priority=arabyatna تظهر بدون سكشن «سيارات مفحوصة» */}
              {groups.arabyatna && groups.arabyatna.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                  {groups.arabyatna.map((car) => (
                    <CarCard key={car.id} car={car} />
                  ))}
                </div>
              )}
              {PRIORITY_ORDER.filter((p) => p !== 'arabyatna').map((p) => {
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

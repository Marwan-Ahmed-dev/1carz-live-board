'use client';

// hook لإدارة قائمة العربيات مع real-time sync + فلترة client-side

import { useEffect, useMemo, useState } from 'react';
import { isCarVisibleToUser, subscribeToCars } from '@/lib/cars';
import { Car, Priority, PriorityFilter } from '@/lib/types';
import { PRIORITY_ORDER } from '@/lib/priority';

export interface UseCarsOptions {
  priority?: PriorityFilter;
  uid?: string | null;
  minPrice?: number;
  maxPrice?: number;
  /** فقط العربيات المعيّنة لـ UID (من غير 'all') */
  assignedOnly?: boolean;
}

/**
 * Returns قائمة العربيات المُفلترة + realtime updates
 *
 * ✅ FIX: الـ subscription بيعيد نفسه لما الـ uid يتغير (كان بيستخدم [] فارغ
 * ومرتبط بـ mount بس — ده كان بيسبب إن لو الـ auth اتأخر، الـ snapshot
 * بيتم بـ auth=null وما بيتجددش لما اليوزر يدخل).
 */
export function useCars(opts: UseCarsOptions = {}) {
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ما نعملش query من غير uid — الـ collection-wide query بيت거ّض من قواعد المستخدم.
    if (!opts.uid) {
      setAllCars([]);
      setLoading(true);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const unsub = subscribeToCars(
      (cars) => {
        setAllCars(cars);
        setLoading(false);
        setError(null);
      },
      {
        uid: opts.uid,
        onError: (err) => {
          setError(err.message || 'فشل تحميل العربيات');
          setLoading(false);
        },
      }
    );
    return () => {
      unsub();
    };
  }, [opts.uid]);

  const cars = useMemo(() => {
    let filtered = allCars;
    if (opts.uid) {
      filtered = filtered.filter((c) => isCarVisibleToUser(c, opts.uid!));
    }
    if (opts.priority && opts.priority !== 'all') {
      filtered = filtered.filter((c) => c.priority === opts.priority);
    }
    if (opts.assignedOnly && opts.uid) {
      filtered = filtered.filter((c) => c.assigned_to.includes(opts.uid!));
    }
    if (opts.minPrice != null && Number.isFinite(opts.minPrice)) {
      filtered = filtered.filter((c) => c.price >= opts.minPrice!);
    }
    if (opts.maxPrice != null && Number.isFinite(opts.maxPrice)) {
      filtered = filtered.filter((c) => c.price <= opts.maxPrice!);
    }
    return filtered;
  }, [allCars, opts.priority, opts.uid, opts.minPrice, opts.maxPrice, opts.assignedOnly]);

  return { cars, allCars, loading, error };
}

/**
 * ترتيب العربيات داخل قائمة حسب created_at desc (الأحدث أولاً)
 * تم إزالة display_order — العربيات دلوقت بترتب تلقائياً حسب تاريخ الإضافة.
 */
function sortByCreatedAtDesc(cars: Car[]): Car[] {
  return [...cars].sort((a, b) => {
    const aTime = a.created_at?.seconds || 0;
    const bTime = b.created_at?.seconds || 0;
    return bTime - aTime;
  });
}

/**
 * تجميع العربيات حسب الأولوية مع sort داخل كل مجموعة حسب created_at desc
 *
 * ✅ تم إزالة قسم 'عادي' — كل العربيات دلوقت بتتجميع تحت قسم priority بتاعها.
 */
export function groupCars(cars: Car[]) {
  const priorityGroups = Object.fromEntries(PRIORITY_ORDER.map((p) => [p, [] as Car[]])) as Record<
    Priority,
    Car[]
  >;

  cars.forEach((c) => {
    if (priorityGroups[c.priority]) {
      priorityGroups[c.priority].push(c);
    }
  });

  // sort داخل كل مجموعة priority
  (Object.keys(priorityGroups) as Priority[]).forEach((k) => {
    priorityGroups[k] = sortByCreatedAtDesc(priorityGroups[k]);
  });

  return {
    priority: priorityGroups,
  };
}

/**
 * تجميع العربيات حسب الأولوية فقط (للتوافق الخلفي)
 * كل عربية بتندرج في priority array الخاص بيها — مرتبة حسب created_at desc
 */
export function groupByPriority(cars: Car[]) {
  const groups = Object.fromEntries(PRIORITY_ORDER.map((p) => [p, [] as Car[]])) as Record<
    string,
    Car[]
  >;
  cars.forEach((c) => {
    if (groups[c.priority]) {
      groups[c.priority].push(c);
    }
  });
  (Object.keys(groups) as Priority[]).forEach((k) => {
    groups[k] = sortByCreatedAtDesc(groups[k]);
  });
  return groups;
}
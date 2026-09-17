'use client';

// hook لإدارة قائمة العربيات مع real-time sync + فلترة client-side

import { useEffect, useMemo, useState } from 'react';
import { subscribeToCars } from '@/lib/cars';
import { Car, PriorityFilter } from '@/lib/types';

export interface UseCarsOptions {
  priority?: PriorityFilter; // فلتر الأولوية (all, mine, top, high, medium, low)
  uid?: string | null; // الـ UID للمستخدم الحالي (للـ 'mine' filter)
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Returns قائمة العربيات المُفلترة + realtime updates
 */
export function useCars(opts: UseCarsOptions = {}) {
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // ✅ FIX: مش بنبعت الـ price filter للسيرفر عشان Firestore بيحتاج
    // composite index للـ where + orderBy. الفلتر بيتعمل client-side في useMemo تحت.
    const unsub = subscribeToCars(
      (cars) => {
        setAllCars(cars);
        setLoading(false);
      },
      {
        // priority filter نتعامل معاه client-side بعدين
      }
    );
    return () => unsub();
  }, []);

  // فلترة client-side (security)
  const cars = useMemo(() => {
    let filtered = allCars;
    // فلتر الأولوية
    if (opts.priority && opts.priority !== 'all' && opts.priority !== 'mine') {
      filtered = filtered.filter((c) => c.priority === opts.priority);
    }
    // ✅ FIX: فلتر 'mine' يستخدم الـ UID (مش الـ username) عشان
    // الـ assigned_to مخزّن بـ UIDs
    if (opts.priority === 'mine' && opts.uid) {
      filtered = filtered.filter(
        (c) => c.assigned_to.includes(opts.uid!) || c.assigned_to.includes('all')
      );
    }
    // فلتر السعر (fallback لو ما استخدمتش query في subscribe)
    if (opts.minPrice != null) {
      filtered = filtered.filter((c) => c.price >= opts.minPrice!);
    }
    if (opts.maxPrice != null) {
      filtered = filtered.filter((c) => c.price <= opts.maxPrice!);
    }
    return filtered;
  }, [allCars, opts.priority, opts.uid, opts.minPrice, opts.maxPrice]);

  return { cars, allCars, loading, error };
}

/**
 * تجميع العربيات حسب الأولوية
 */
export function groupByPriority(cars: Car[]) {
  const groups: Record<string, Car[]> = {
    top: [],
    high: [],
    medium: [],
    low: [],
  };
  cars.forEach((c) => {
    if (groups[c.priority]) {
      groups[c.priority].push(c);
    }
  });
  // sort داخل كل مجموعة حسب display_order ثم created_at
  for (const k of Object.keys(groups)) {
    groups[k].sort((a, b) => {
      if (a.display_order !== b.display_order) return a.display_order - b.display_order;
      const aTime = a.created_at?.seconds || 0;
      const bTime = b.created_at?.seconds || 0;
      return bTime - aTime;
    });
  }
  return groups;
}
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
  /** تصفح بدون login — عربيات الكل النشطة */
  publicOnly?: boolean;
}

/**
 * Returns قائمة العربيات المُفلترة + realtime updates
 */
export function useCars(opts: UseCarsOptions = {}) {
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opts.uid && !opts.publicOnly) {
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
        uid: opts.publicOnly ? null : opts.uid,
        publicOnly: opts.publicOnly,
        onError: (err) => {
          setError(err.message || 'فشل تحميل العربيات');
          setLoading(false);
        },
      }
    );
    return () => {
      unsub();
    };
  }, [opts.uid, opts.publicOnly]);

  const cars = useMemo(() => {
    let filtered = allCars;
    if (opts.uid && !opts.publicOnly) {
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
  }, [allCars, opts.priority, opts.uid, opts.minPrice, opts.maxPrice, opts.assignedOnly, opts.publicOnly]);

  return { cars, allCars, loading, error };
}

function sortByCreatedAtDesc(cars: Car[]): Car[] {
  return [...cars].sort((a, b) => {
    const aTime = a.created_at?.seconds || 0;
    const bTime = b.created_at?.seconds || 0;
    return bTime - aTime;
  });
}

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

  (Object.keys(priorityGroups) as Priority[]).forEach((k) => {
    priorityGroups[k] = sortByCreatedAtDesc(priorityGroups[k]);
  });

  return {
    priority: priorityGroups,
  };
}

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

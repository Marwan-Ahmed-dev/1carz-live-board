'use client';

// hook لإدارة قائمة العربيات مع real-time sync + فلترة client-side

import { useEffect, useMemo, useState } from 'react';
import { subscribeToCars } from '@/lib/cars';
import { Car, Priority, PriorityFilter } from '@/lib/types';
import { PRIORITY_ORDER } from '@/lib/priority';

export interface UseCarsOptions {
  priority?: PriorityFilter;
  uid?: string | null;
  minPrice?: number;
  maxPrice?: number;
  /** فقط العربيات المعيّنة لـ UID (من غير 'all') — fallback في الـ memory لو Firestore رجّع أكتر */
  assignedOnly?: boolean;
  /** تصفح بدون login — كل العربيات */
  publicOnly?: boolean;
  /**
   * Marketer filter: لما يكون الـ user مسوّق، يفلتر العربيات على حسب assigned_to
   * (UID الـ user نفسه + UIDs المجموعات + 'all'). بيترجم لـ array-contains-any في Firestore.
   * null/undefined = مفيش فلتر assignment (كل العربيات ظاهرة).
   */
  marketerFilter?: { uid: string; groupUids: string[] } | null;
}

/**
 * Returns قائمة العربيات المُفلترة + realtime updates
 *
 * الـ visibility model:
 * - لو marketerFilter متعيّن → يفلتر بـ assigned_to عبر Firestore
 * - لو مفيش فلتر (ضيف, user عادي, admin) → كل العربيات (status مش visibility gate)
 * - assignedOnly = client-side filter احتياطي (لو Firestore رجّع أكتر مما متوقع)
 */
export function useCars(opts: UseCarsOptions = {}) {
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // الشرط القديم كان بيمنع الـ load لو مفيش uid ولا publicOnly
    // دلوقتي: حتى الأدمن (بدون uid وبـ publicOnly=false) ممكن يستدعي useCars.
    // marketerFilter بيتجاوز الـ guard ده لأنه بيمثّل authenticated context.

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
        marketerFilter: opts.marketerFilter,
        onError: (err) => {
          setError(err.message || 'فشل تحميل العربيات');
          setLoading(false);
        },
      }
    );
    return () => {
      unsub();
    };
  }, [opts.uid, opts.publicOnly, opts.marketerFilter?.uid, opts.marketerFilter?.groupUids.join('|')]);

  const cars = useMemo(() => {
    let filtered = allCars;
    // حزام أمان: لو المسوّق وصلتله عربيات زيادة من الاستعلام، نفلتر على assigned_to
    if (opts.marketerFilter?.uid) {
      const allowed = new Set([
        opts.marketerFilter.uid,
        'all',
        ...(opts.marketerFilter.groupUids || []),
      ]);
      filtered = filtered.filter(
        (c) => Array.isArray(c.assigned_to) && c.assigned_to.some((id) => allowed.has(id))
      );
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
  }, [
    allCars,
    opts.priority,
    opts.uid,
    opts.minPrice,
    opts.maxPrice,
    opts.assignedOnly,
    opts.marketerFilter?.uid,
    opts.marketerFilter?.groupUids,
  ]);

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

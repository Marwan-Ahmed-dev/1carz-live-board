'use client';

import { useEffect, useState } from 'react';

/**
 * Debounce a rapidly-changing value so downstream effects only fire
 * once the user pauses typing.
 *
 * Example:
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebouncedValue(search, 250);
 *   useEffect(() => { fetch(debouncedSearch); }, [debouncedSearch]);
 *
 * الـ default 250ms كافي للبحث في الذاكرة (in-memory filter) — لو البحث
 * كان بيروح لـ Firestore، يفضل 300-500ms لتقليل reads.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
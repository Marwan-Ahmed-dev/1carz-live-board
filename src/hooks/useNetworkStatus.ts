'use client';

// Hook يكشف حالة الـ network (online/offline).
// بنستخدم navigator.onLine + window events 'online'/'offline'.

import { useEffect, useState } from 'react';

export interface UseNetworkStatusResult {
  isOnline: boolean;
}

/**
 * الـ initial value بنحدده من navigator.onLine لو متاح (client-side)؛
 * وإلا نعتبر الـ user online بـ default عشان SSR ما يـ flash الـ "offline"
 * banner على الـ page الأولى.
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
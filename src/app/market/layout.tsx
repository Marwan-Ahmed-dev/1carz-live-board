'use client';

// /market/* layout — حماية الـ source role.
// - لو مش مسجّل → redirect لـ /login.
// - لو مسجّل لكن role !== 'source' (و مش admin) → redirect لـ /.
// - الخلفية cream (bg-primary) زي باقي الموقع.

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingState } from '@/components/LoadingState';

export default function MarketLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, userData, isAdmin, isSource, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // الأدمن يقدر يدخل (للمراجعة / التجريب). الـ source العادي بس.
    if (!isSource && !isAdmin) {
      router.replace('/');
    }
  }, [user, userData, isAdmin, isSource, loading, router]);

  if (loading || !user || (!isSource && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <LoadingState variant="page" />
      </div>
    );
  }

  return <div className="min-h-screen bg-bg-primary">{children}</div>;
}
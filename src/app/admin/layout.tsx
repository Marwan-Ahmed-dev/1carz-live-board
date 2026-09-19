'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { LoadingState } from '@/components/LoadingState';

/**
 * Admin Layout - dark theme shell + auth guard
 * كل الـ admin pages ترث من هذا الـ layout
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, userData, isAdmin, loading, needsOnboarding, error } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (needsOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (!isAdmin) {
      router.replace('/cars');
    }
  }, [user, loading, needsOnboarding, isAdmin, router]);

  if (loading || !user || needsOnboarding || !isAdmin) {
    if (!loading && error && user && !userData) {
      return (
        <div className="min-h-screen bg-admin-bg flex items-center justify-center text-admin-text px-4 text-center">
          {error}
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-admin-bg text-admin-text flex items-center justify-center">
        <LoadingState variant="page" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-admin-bg text-admin-text flex items-center justify-center">
        <LoadingState variant="page" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-admin-bg text-admin-text font-arabic">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
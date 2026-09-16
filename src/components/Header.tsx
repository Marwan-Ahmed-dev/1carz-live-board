'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Settings, Car } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';

interface HeaderProps {
  /** عرض اسم المستخدم في الـ header (في الصفحة الرئيسية) */
  showUsername?: boolean;
}

/**
 * الـ Header الموحد للـ user PWA
 * - يمين: شعار 1CARZ + مؤشر live
 * - وسط: اسم المستخدم (اختياري)
 * - يسار: زر دخول الإدارة (admin فقط) + تسجيل الخروج
 */
export function Header({ showUsername = true }: HeaderProps) {
  const router = useRouter();
  const { user, userData, isAdmin } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    setLoggingOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-bg-primary/95 backdrop-blur-sm border-b border-border-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* الشعار (يمين في RTL) */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-accent-yellow flex items-center justify-center">
            <Car size={20} className="text-text-primary" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold text-text-primary leading-tight">
                1CARZ LIVE BOARD
              </h1>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="مباشر" />
            </div>
            {showUsername && userData?.username && (
              <span className="text-xs text-text-muted">
                مرحباً، <span className="font-medium text-text-secondary">{userData.username}</span>
              </span>
            )}
          </div>
        </div>

        {/* الأزرار (يسار في RTL) */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-medium transition-colors cursor-pointer"
            >
              <Settings size={16} />
              <span>دخول الإدارة</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="sm:hidden w-9 h-9 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover flex items-center justify-center transition-colors cursor-pointer"
              aria-label="دخول الإدارة"
            >
              <Settings size={18} className="text-text-primary" />
            </button>
          )}
          {user && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-9 h-9 rounded-lg bg-bg-card hover:bg-bg-card-hover flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              aria-label="تسجيل الخروج"
            >
              <LogOut size={18} className="text-text-secondary" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
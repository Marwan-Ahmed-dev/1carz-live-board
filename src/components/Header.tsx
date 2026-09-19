'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Settings, Plus, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { BrandLogo } from '@/components/BrandLogo';
import { ConfirmDialog, useConfirm } from '@/components/ConfirmDialog';

interface HeaderProps {
  showUsername?: boolean;
}

export function Header({ showUsername = true }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userData, isAdmin, isInspector, loading: authLoading } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const { confirm, dialogProps } = useConfirm();
  const rolesReady = !authLoading;
  const isMarketer = rolesReady && !!user && !isAdmin && !isInspector;
  const showGuestBack = rolesReady && !user && pathname !== '/';
  const showGuestLogin = rolesReady && !user;

  const handleLogout = async () => {
    if (loggingOut) return;
    const ok = await confirm({
      title: 'تسجيل الخروج',
      message: 'هل تريد تسجيل الخروج من حسابك؟',
      confirmLabel: 'تسجيل الخروج',
      cancelLabel: 'إلغاء',
      variant: 'warning',
    });
    if (!ok) return;
    setLoggingOut(true);
    try {
      await signOut();
      router.replace('/');
    } catch (err) {
      console.error('Logout failed:', err);
      setLoggingOut(false);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-30 bg-bg-primary/95 backdrop-blur-sm border-b border-border-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {showGuestBack && (
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-11 h-11 flex-shrink-0 rounded-xl bg-bg-card hover:bg-bg-card-hover border border-border-soft flex items-center justify-center transition-colors cursor-pointer"
              aria-label="رجوع"
            >
              <ArrowRight size={18} className="text-text-primary" />
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push(user ? '/cars' : '/')}
            className="flex items-center gap-2 cursor-pointer min-w-0"
            aria-label="الصفحة الرئيسية"
          >
            <div className="w-10 h-10 flex-shrink-0 overflow-hidden rounded-xl">
              <BrandLogo size={40} />
            </div>
            <div className="flex flex-col text-right min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-bold text-text-primary leading-tight truncate">
                  1CARZ LIVE BOARD
                </h1>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" title="مباشر" />
              </div>
              {showUsername && userData?.username && (
                <span className="text-xs text-text-muted truncate">
                  مرحباً، <span className="font-medium text-text-secondary">{userData.username}</span>
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {showGuestLogin && (
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-bold transition-colors cursor-pointer"
            >
              <LogIn size={16} />
              <span>دخول</span>
            </button>
          )}
          {isMarketer && (
            <button
              onClick={() => router.push('/buyers/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">إضافة مشتري</span>
            </button>
          )}
          {rolesReady && isInspector && !isAdmin && (
            <button
              onClick={() => router.push('/cars/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">إضافة عربية</span>
            </button>
          )}
          {rolesReady && isAdmin && (
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-medium transition-colors cursor-pointer"
            >
              <Settings size={16} />
              <span>دخول الإدارة</span>
            </button>
          )}
          {rolesReady && isAdmin && (
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="sm:hidden w-11 h-11 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover flex items-center justify-center transition-colors cursor-pointer"
              aria-label="دخول الإدارة"
            >
              <Settings size={18} className="text-text-primary" />
            </button>
          )}
          {rolesReady && user && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-11 h-11 rounded-lg bg-bg-card hover:bg-bg-card-hover flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              aria-label="تسجيل الخروج"
            >
              <LogOut size={18} className="text-text-secondary" />
            </button>
          )}
        </div>
      </div>
    </header>
    {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  );
}
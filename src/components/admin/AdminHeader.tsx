'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Car, LogOut, LayoutDashboard, ListChecks, Users, Plus } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { BrandLogo } from '@/components/BrandLogo';
import { ConfirmDialog, useConfirm } from '@/components/ConfirmDialog';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/admin/cars', label: 'العربيات', icon: ListChecks },
  { href: '/admin/cars/new', label: 'إضافة عربية', icon: Plus },
  { href: '/admin/users', label: 'المستخدمين', icon: Users },
];

/**
 * Admin Header (dark theme)
 * - يمين: شعار
 * - يسار: روابط التنقل + تسجيل الخروج
 */
export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { userData } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'تسجيل الخروج',
      message: 'هل تريد تسجيل الخروج من لوحة التحكم؟',
      confirmLabel: 'تسجيل الخروج',
      cancelLabel: 'إلغاء',
      variant: 'warning',
    });
    if (!ok) return;
    setLoggingOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (err) {
      console.error(err);
      setLoggingOut(false);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-30 bg-admin-card border-b border-admin-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          {/* الشعار */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex-shrink-0 overflow-hidden rounded-xl">
              <BrandLogo size={40} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-base font-bold text-admin-text">1CARZ Admin</h1>
              {userData?.username && (
                <span className="text-xs text-admin-text-muted">
                  {userData.email}
                </span>
              )}
            </div>
          </div>

          {/* أزرار التحكم */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/cars')}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-admin-bg hover:bg-admin-border text-admin-text text-sm font-medium transition-colors"
              title="العودة للتطبيق"
            >
              <Car size={16} />
              <span>التطبيق</span>
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-11 h-11 rounded-lg bg-admin-bg hover:bg-admin-border flex items-center justify-center transition-colors disabled:opacity-50"
              aria-label="تسجيل الخروج"
            >
              <LogOut size={18} className="text-admin-text-muted" />
            </button>
          </div>
        </div>

        {/* روابط التنقل (في الشاشات الكبيرة) */}
        <nav className="hidden sm:flex items-center gap-1 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/admin/cars'
                ? pathname === '/admin/cars' || /^\/admin\/cars\/[^/]+$/.test(pathname)
                : pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-admin-accent text-admin-bg'
                    : 'text-admin-text-muted hover:bg-admin-bg hover:text-admin-text'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* روابط التنقل (mobile - pills) */}
        <nav className="sm:hidden flex items-center gap-1 overflow-x-auto no-scrollbar -mx-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/admin/cars'
                ? pathname === '/admin/cars' || /^\/admin\/cars\/[^/]+$/.test(pathname)
                : pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-admin-accent text-admin-bg'
                    : 'bg-admin-bg text-admin-text-muted'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
    {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  );
}
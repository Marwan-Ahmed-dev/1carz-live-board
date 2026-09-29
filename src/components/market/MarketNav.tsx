'use client';

// Top navigation bar لـ /market/* section.
// بيستخدم نفس الـ design language بتاع الـ Header.tsx (cream/yellow)
// عشان يبقى consistent مع باقي الموقع.

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { OfflineBadge } from './OfflineBadge';

interface MarketNavProps {
  /** Number of pending entries to display in the offline badge. */
  pendingCount?: number;
  /** Whether a sync is currently running. */
  isSyncing?: boolean;
  /** Trigger sync manually. */
  onSync?: () => void;
}

export function MarketNav({ pendingCount = 0, isSyncing = false, onSync }: MarketNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userData } = useAuth();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const isMarketDataActive = pathname === '/market';
  const isAddActive = pathname === '/market/new';

  const avatarLabel = (userData?.username || user?.email || 'U').trim().charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (err) {
      logger.error('Logout failed:', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-bg-primary/95 backdrop-blur-sm border-b border-border-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base sm:text-lg font-bold tracking-tight whitespace-nowrap">
            <span className="text-red-600">1</span>
            <span className="text-text-primary">Carz</span>
            <span className="ml-1 text-xs sm:text-sm font-medium text-text-muted">
              Market Intelligence
            </span>
          </span>
        </div>

        {/* Pill buttons */}
        <nav className="hidden md:flex items-center gap-2" aria-label="Market navigation">
          <button
            type="button"
            onClick={() => router.push('/market')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              isMarketDataActive
                ? 'bg-accent-yellow text-text-primary'
                : 'bg-bg-card text-text-secondary border border-border-soft hover:bg-bg-card-hover'
            }`}
            aria-current={isMarketDataActive ? 'page' : undefined}
          >
            <Search size={15} />
            Market Data
          </button>
          <button
            type="button"
            onClick={() => router.push('/market/new')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              isAddActive
                ? 'bg-accent-yellow text-text-primary'
                : 'bg-bg-card text-text-secondary border border-border-soft hover:bg-bg-card-hover'
            }`}
            aria-current={isAddActive ? 'page' : undefined}
          >
            <Plus size={15} />
            Add Car
          </button>
        </nav>

        {/* Right side: offline badge + avatar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <OfflineBadge pendingCount={pendingCount} />
          {isSyncing && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-text-muted">
              <Loader2 size={12} className="animate-spin" />
              <span>جاري المزامنة...</span>
            </span>
          )}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1 pl-1 pr-2 py-1 rounded-full hover:bg-bg-card-hover transition-colors"
              aria-label="حساب المستخدم"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="w-8 h-8 rounded-full bg-accent-yellow text-text-primary flex items-center justify-center text-sm font-bold">
                {avatarLabel}
              </span>
              <ChevronDown size={14} className="text-text-muted" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute left-0 mt-2 w-56 bg-bg-card rounded-xl shadow-medium border border-border-soft py-2 animate-fade-in"
              >
                <div className="px-3 py-2 border-b border-border-soft">
                  <div className="text-sm font-semibold text-text-primary truncate">
                    {userData?.username || user?.email || 'مستخدم'}
                  </div>
                  <div className="text-xs text-text-muted truncate" dir="ltr">
                    {user?.email}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent-soft text-text-primary text-[10px] font-bold">
                    سجل سعري
                  </div>
                </div>
                {onSync && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onSync();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-card-hover"
                  >
                    {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    مزامنة الآن
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-bg-card-hover"
                >
                  <LogOut size={14} />
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Mobile pill buttons (under the main row) */}
      <nav
        className="md:hidden max-w-7xl mx-auto px-4 pb-3 flex items-center gap-2"
        aria-label="Market navigation mobile"
      >
        <button
          type="button"
          onClick={() => router.push('/market')}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-colors ${
            isMarketDataActive
              ? 'bg-accent-yellow text-text-primary'
              : 'bg-bg-card text-text-secondary border border-border-soft'
          }`}
        >
          <Search size={14} />
          Market Data
        </button>
        <button
          type="button"
          onClick={() => router.push('/market/new')}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-colors ${
            isAddActive
              ? 'bg-accent-yellow text-text-primary'
              : 'bg-bg-card text-text-secondary border border-border-soft'
          }`}
        >
          <Plus size={14} />
          Add Car
        </button>
      </nav>
    </header>
  );
}
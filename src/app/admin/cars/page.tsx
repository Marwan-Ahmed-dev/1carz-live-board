'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Star,
  Flame,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Heart,
  X,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  ListOrdered,
} from 'lucide-react';
import { subscribeToCars, deleteCar } from '@/lib/cars';
import { subscribeToUsers } from '@/lib/users';
import { AppUser, Car, Priority } from '@/lib/types';
import { PRIORITY_LABELS, PRIORITY_ORDER } from '@/lib/priority';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/useToast';
import { formatPrice } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog, useConfirm } from '@/components/ConfirmDialog';
import type { LucideIcon } from 'lucide-react';
import { Users } from 'lucide-react';

const PRIORITY_META: Record<Priority, { label: string; icon: LucideIcon; color: string }> = {
  arabyatna: { label: PRIORITY_LABELS.arabyatna, icon: Heart, color: 'text-rose-400 bg-rose-500/15' },
  top: { label: PRIORITY_LABELS.top, icon: Flame, color: 'text-orange-400 bg-orange-500/15' },
  high: { label: PRIORITY_LABELS.high, icon: Star, color: 'text-amber-400 bg-amber-500/15' },
  medium: { label: PRIORITY_LABELS.medium, icon: ChevronUp, color: 'text-slate-300 bg-slate-500/15' },
  low: { label: PRIORITY_LABELS.low, icon: ChevronDown, color: 'text-slate-500 bg-slate-700/30' },
};

/**
 * M25: ترتيب قائمة العربيات.
 * - newest / oldest: بالـ created_at
 * - priority: ترتيب الـ tiers (arabyatna أولاً) + created_at desc داخل نفس المستوى
 *
 * الافتراضي "newest" لأن ده نفس ترتيب الـ subscription من Firestore —
 * يعني ما بنغيرش حاجة لو الـ user ما اختارش ترتيب.
 */
type SortMode = 'newest' | 'oldest' | 'priority';
const SORT_META: Record<SortMode, { label: string; icon: LucideIcon }> = {
  newest: { label: 'الأحدث أولاً', icon: ArrowDownNarrowWide },
  oldest: { label: 'الأقدم أولاً', icon: ArrowUpNarrowWide },
  priority: { label: 'حسب الأولوية', icon: ListOrdered },
};
const PRIORITY_RANK: Record<Priority, number> = {
  arabyatna: 0,
  top: 1,
  high: 2,
  medium: 3,
  low: 4,
};

function getCreatedAtMs(c: Car): number {
  const ts = c.created_at;
  if (!ts) return 0;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'object' && ts && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    try {
      return (ts as { toDate: () => Date }).toDate().getTime();
    } catch {
      return 0;
    }
  }
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export default function AdminCarsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm, dialogProps } = useConfirm();
  const [cars, setCars] = useState<Car[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToCars(
      (c) => {
        setCars(c);
        setLoading(false);
      },
      { onError: () => setLoading(false) }
    );
    const unsubUsers = subscribeToUsers(setUsers);
    return () => {
      unsub();
      unsubUsers();
    };
  }, []);

  const usersById = useMemo(() => {
    const map = new Map<string, AppUser>();
    users.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  // فلترة + بحث + ترتيب
  const filtered = useMemo(() => {
    let list = cars;
    if (priorityFilter !== 'all') {
      list = list.filter((c) => c.priority === priorityFilter);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(s) ||
          (c.inspector_name || '').toLowerCase().includes(s) ||
          (c.owner_name || '').toLowerCase().includes(s) ||
          (c.owner_phone || '').includes(s) ||
          (c.inspector_phone || '').includes(s) ||
          c.description.toLowerCase().includes(s)
      );
    }

    // M25: ترتيب حسب اختيار الـ user.
    // بنعمل نسخة قبل sort عشان ما نغيّرش ترتيب الـ Firestore source.
    const sorted = [...list];
    if (sortMode === 'newest') {
      sorted.sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a));
    } else if (sortMode === 'oldest') {
      sorted.sort((a, b) => getCreatedAtMs(a) - getCreatedAtMs(b));
    } else {
      // priority: حسب الـ tier، وداخل نفس الـ tier الأحدث أولاً
      sorted.sort((a, b) => {
        const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (rank !== 0) return rank;
        return getCreatedAtMs(b) - getCreatedAtMs(a);
      });
    }
    return sorted;
  }, [cars, priorityFilter, search, sortMode]);

  const carsByAdmin = useMemo(() => {
    const map = new Map<string, Car[]>();
    for (const c of filtered) {
      const key = c.created_by_uid || '_unknown';
      const list = map.get(key) || [];
      list.push(c);
      map.set(key, list);
    }
    const sections: { key: string; label: string; cars: Car[] }[] = [];
    for (const [key, list] of map.entries()) {
      if (key === '_unknown') {
        sections.push({ key, label: 'عربيات قديمة / بدون ناشر', cars: list });
        continue;
      }
      const u = usersById.get(key);
      const label = u?.username || u?.email || 'أدمن';
      sections.push({ key, label: `نازل بواسطة: ${label}`, cars: list });
    }
    sections.sort((a, b) => {
      if (a.key === '_unknown') return 1;
      if (b.key === '_unknown') return -1;
      return a.label.localeCompare(b.label, 'ar');
    });
    return sections;
  }, [filtered, usersById]);

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'حذف عربية',
      message: `هل تريد حذف "${title}"؟\nهذا الإجراء لا يمكن التراجع عنه.`,
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteCar(id);
      showToast('تم حذف العربية بنجاح', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل الحذف';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-admin-text">إدارة العربيات</h1>
          <p className="text-sm text-admin-text-muted mt-1">
            {filtered.length} من {cars.length} عربية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/cars/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-admin-accent hover:bg-yellow-400 text-admin-bg font-bold text-sm transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">عربية جديدة</span>
            <span className="sm:hidden">إضافة</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-admin-card border border-admin-border rounded-2xl p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالعنوان أو المعاين..."
            className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text placeholder:text-admin-text-muted focus:border-admin-accent/50 text-sm"
          />
        </div>

        {/* Priority pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['all', ...PRIORITY_ORDER] as const).map((p) => {
            const active = priorityFilter === p;
            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-admin-accent text-admin-bg'
                    : 'bg-admin-bg text-admin-text-muted border border-admin-border hover:text-admin-text'
                }`}
              >
                {p === 'all' ? 'الكل' : PRIORITY_META[p as Priority].label}
              </button>
            );
          })}
        </div>

        {/* M25: ترتيب — newest / oldest / by priority */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-admin-text-muted">ترتيب:</span>
          {(Object.keys(SORT_META) as SortMode[]).map((mode) => {
            const meta = SORT_META[mode];
            const Icon = meta.icon;
            const active = sortMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  active
                    ? 'bg-admin-card border border-admin-accent text-admin-accent'
                    : 'bg-admin-bg text-admin-text-muted border border-admin-border hover:text-admin-text'
                }`}
              >
                <Icon size={12} />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && <LoadingState count={4} variant="list" />}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          title={cars.length === 0 ? 'لا توجد عربيات' : 'لا توجد نتائج'}
          description={
            cars.length === 0
              ? 'ابدأ بإضافة أول عربية للوحة التحكم'
              : 'جرب تغيير الفلتر أو مصطلح البحث'
          }
        />
      )}

      {/* List — مجمّعة حسب الأدمن الناشر */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-4">
          {carsByAdmin.map((section) => (
            <div
              key={section.key}
              className="bg-admin-card border border-admin-border rounded-2xl overflow-hidden"
            >
              <div className="px-3 py-2.5 border-b border-admin-border bg-admin-bg/60 flex items-center gap-2">
                <Users size={14} className="text-admin-accent" />
                <h3 className="text-sm font-bold text-admin-text">{section.label}</h3>
                <span className="text-xs text-admin-text-muted badge-number">
                  {section.cars.length}
                </span>
              </div>
              <ul className="divide-y divide-admin-border">
                {section.cars.map((c) => {
                  const meta = PRIORITY_META[c.priority] || PRIORITY_META.medium;
                  const Icon = meta.icon;
                  return (
                    <li
                      key={c.id}
                      className="p-3 hover:bg-admin-bg transition-colors cursor-pointer"
                      onClick={() => c.id && router.push(`/car/${c.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-admin-bg overflow-hidden flex-shrink-0 striped-bg">
                          {c.image_url && (
                            <Image
                              src={c.image_url}
                              alt={c.title}
                              fill
                              sizes="(max-width: 640px) 80px, 96px"
                              className="object-cover"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5 mb-1">
                            <h3 className="text-sm sm:text-base font-bold text-admin-text truncate flex-1">
                              {c.title}
                            </h3>
                            {c.is_featured && (
                              <Star size={14} className="text-admin-accent flex-shrink-0" fill="currentColor" />
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-admin-text-muted mb-2">
                            {(c.owner_name || c.inspector_name) && (
                              <span className="badge-number bg-admin-bg px-2 py-0.5 rounded">
                                {c.owner_name || c.inspector_name}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${meta.color}`}
                            >
                              <Icon size={10} />
                              {meta.label}
                            </span>
                            <StatusBadge status={c.status} tone="admin" />
                          </div>

                          <div
                            className="badge-number text-base sm:text-lg font-bold text-admin-accent"
                            dir="ltr"
                          >
                            {formatPrice(c.price)}{' '}
                            <span className="text-xs font-medium text-admin-text-muted">ج.م</span>
                          </div>
                        </div>

                        <div
                          className="flex flex-col gap-1.5 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => c.id && router.push(`/admin/cars/${c.id}`)}
                            className="w-11 h-11 rounded-lg bg-admin-bg hover:bg-admin-border flex items-center justify-center transition-colors"
                            aria-label="تعديل"
                          >
                            <Edit3 size={16} className="text-admin-text-muted" />
                          </button>
                          <button
                            onClick={() => c.id && handleDelete(c.id, c.title)}
                            disabled={deletingId === c.id}
                            className="w-11 h-11 rounded-lg bg-admin-bg hover:bg-red-500/15 flex items-center justify-center transition-colors disabled:opacity-50"
                            aria-label="حذف"
                          >
                            {deletingId === c.id ? (
                              <AlertCircle size={16} className="text-red-400 animate-pulse" />
                            ) : (
                              <Trash2 size={16} className="text-admin-text-muted hover:text-red-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
}
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Star,
  Flame,
  ChevronUp,
  ChevronDown,
  Heart,
  RefreshCw,
  CirclePlus,
  Bookmark,
  BadgeCheck,
} from 'lucide-react';
import { subscribeToCars, subscribeToPriorityCounts } from '@/lib/cars';
import { Car } from '@/lib/types';
import { StatCard } from '@/components/admin/StatCard';
import { LoadingState } from '@/components/LoadingState';
import { formatPrice } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCairoTodayLabel, isTodayInCairo } from '@/lib/cairoDay';
import { BuyersPanel } from '@/components/admin/BuyersPanel';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [cars, setCars] = useState<Car[]>([]);
  const [counts, setCounts] = useState({
    arabyatna: 0,
    top: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCars = subscribeToCars(
      (c) => {
        setCars(c);
        setLoading(false);
      },
      { onError: () => setLoading(false) }
    );
    const unsubCounts = subscribeToPriorityCounts(setCounts);
    return () => {
      unsubCars();
      unsubCounts();
    };
  }, []);

  const recent = cars.slice(0, 10);
  const todayLabel = formatCairoTodayLabel();
  const daily = useMemo(
    () => ({
      added: cars.filter((c) => isTodayInCairo(c.created_at)).length,
      reserved: cars.filter((c) => isTodayInCairo(c.reserved_at)).length,
      sold: cars.filter((c) => isTodayInCairo(c.sold_at)).length,
    }),
    [cars]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-admin-text">لوحة التحكم</h1>
          <p className="text-sm text-admin-text-muted mt-1">
            تقرير اليوم + إحصائيات العربيات
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/cars/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-admin-accent hover:bg-yellow-400 text-admin-bg font-bold text-sm transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">إضافة عربية جديدة</span>
          <span className="sm:hidden">إضافة</span>
        </button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-admin-text">تقرير اليوم</h2>
          <span className="text-xs text-admin-text-muted">{todayLabel}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="اتضافت" value={daily.added} accent="blue" icon={<CirclePlus size={20} />} />
          <StatCard label="اتحجزت" value={daily.reserved} accent="amber" icon={<Bookmark size={20} />} />
          <StatCard label="اتباعت" value={daily.sold} accent="green" icon={<BadgeCheck size={20} />} />
        </div>
        <BuyersPanel />
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="عربياتنا"
          value={counts.arabyatna}
          accent="yellow"
          icon={<Heart size={20} />}
        />
        <StatCard
          label="أولوية قصوى"
          value={counts.top}
          accent="yellow"
          icon={<Flame size={20} />}
        />
        <StatCard
          label="أولوية عالية"
          value={counts.high}
          accent="amber"
          icon={<Star size={20} />}
        />
        <StatCard
          label="أولوية متوسطة"
          value={counts.medium}
          accent="gray"
          icon={<ChevronUp size={20} />}
        />
        <StatCard
          label="أولوية منخفضة"
          value={counts.low}
          accent="muted"
          icon={<ChevronDown size={20} />}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-admin-text">آخر العربيات المضافة</h2>
          <span className="text-sm text-admin-text-muted">
            إجمالي: <span className="badge-number font-bold text-admin-accent">{counts.total}</span>
          </span>
        </div>

        {loading ? (
          <LoadingState count={3} variant="list" />
        ) : recent.length === 0 ? (
          <div className="bg-admin-card border border-admin-border rounded-2xl p-8 text-center">
            <Plus size={40} className="mx-auto text-admin-text-muted mb-3" />
            <h3 className="text-lg font-bold text-admin-text mb-1">لا توجد عربيات بعد</h3>
            <p className="text-sm text-admin-text-muted mb-4">ابدأ بإضافة أول عربية</p>
            <button
              onClick={() => router.push('/admin/cars/new')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-admin-accent hover:bg-yellow-400 text-admin-bg font-bold text-sm"
            >
              <Plus size={16} />
              إضافة عربية
            </button>
          </div>
        ) : (
          <div className="bg-admin-card border border-admin-border rounded-2xl overflow-hidden">
            <ul className="divide-y divide-admin-border">
              {recent.map((c) => (
                <li
                  key={c.id}
                  onClick={() => c.id && router.push(`/admin/cars/${c.id}`)}
                  className="flex items-center gap-3 p-3 hover:bg-admin-bg cursor-pointer transition-colors"
                >
                  <div className="relative w-14 h-14 rounded-lg bg-admin-bg overflow-hidden flex-shrink-0 striped-bg">
                    {c.image_url && (
                      <Image src={c.image_url} alt={c.title} fill sizes="56px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-admin-text truncate">{c.title}</h3>
                      {c.is_featured && (
                        <Star size={12} className="text-admin-accent flex-shrink-0" fill="currentColor" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-admin-text-muted mt-0.5">
                      {c.owner_name || c.inspector_name ? (
                        <span className="badge-number">{c.owner_name || c.inspector_name}</span>
                      ) : null}
                      <StatusBadge status={c.status} tone="admin" />
                    </div>
                  </div>
                  <div className="badge-number text-sm font-bold text-admin-accent flex-shrink-0" dir="ltr">
                    {formatPrice(c.price)}
                  </div>
                </li>
              ))}
            </ul>
            {cars.length > 10 && (
              <button
                onClick={() => router.push('/admin/cars')}
                className="block w-full py-3 text-sm font-medium text-admin-accent hover:bg-admin-bg transition-colors border-t border-admin-border"
              >
                عرض كل العربيات ({cars.length})
              </button>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-admin-text-muted flex items-center justify-center gap-1.5">
        <RefreshCw size={12} className="animate-pulse" />
        <span>البيانات تتحدث تلقائياً</span>
      </div>
    </div>
  );
}

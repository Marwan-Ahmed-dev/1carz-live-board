'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Star, Flame, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { subscribeToCars, subscribeToPriorityCounts } from '@/lib/cars';
import { Car } from '@/lib/types';
import { StatCard } from '@/components/admin/StatCard';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/hooks/useToast';
import { formatPrice } from '@/lib/format';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [cars, setCars] = useState<Car[]>([]);
  const [counts, setCounts] = useState({ top: 0, high: 0, medium: 0, low: 0, total: 0 });
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

  // آخر 10 عربيات مضافة
  const recent = cars.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-admin-text">لوحة التحكم</h1>
          <p className="text-sm text-admin-text-muted mt-1">
            إحصائيات سريعة وآخر العربيات المضافة
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* Total + Recent */}
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
                  {/* صورة مصغرة */}
                  <div className="w-14 h-14 rounded-lg bg-admin-bg overflow-hidden flex-shrink-0 striped-bg">
                    {c.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  {/* معلومات */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-admin-text truncate">{c.title}</h3>
                      {c.is_featured && <Star size={12} className="text-admin-accent flex-shrink-0" fill="currentColor" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-admin-text-muted mt-0.5">
                      <span className="badge-number">{c.code}</span>
                      <span>·</span>
                      <span className="capitalize">
                        {c.priority === 'top' && 'قصوى'}
                        {c.priority === 'high' && 'عالية'}
                        {c.priority === 'medium' && 'متوسطة'}
                        {c.priority === 'low' && 'منخفضة'}
                      </span>
                    </div>
                  </div>
                  {/* السعر */}
                  <div className="badge-number text-sm font-bold text-admin-accent flex-shrink-0">
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

      {/* Refresh indicator */}
      <div className="text-center text-xs text-admin-text-muted flex items-center justify-center gap-1.5">
        <RefreshCw size={12} className="animate-pulse" />
        <span>البيانات تتحدث تلقائياً</span>
      </div>
    </div>
  );
}
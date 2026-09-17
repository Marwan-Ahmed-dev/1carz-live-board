'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Wrench,
  CheckCircle2,
  Heart,
  X,
} from 'lucide-react';
import { subscribeToCars, deleteCar, fixAllCarsAssignment, CarFixReport } from '@/lib/cars';
import { Car, Priority } from '@/lib/types';
import { PRIORITY_LABELS, PRIORITY_ORDER } from '@/lib/priority';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/useToast';
import { formatPrice } from '@/lib/format';

const PRIORITY_META: Record<Priority, { label: string; icon: any; color: string }> = {
  arabyatna: { label: PRIORITY_LABELS.arabyatna, icon: Heart, color: 'text-rose-400 bg-rose-500/15' },
  top: { label: PRIORITY_LABELS.top, icon: Flame, color: 'text-orange-400 bg-orange-500/15' },
  high: { label: PRIORITY_LABELS.high, icon: Star, color: 'text-amber-400 bg-amber-500/15' },
  medium: { label: PRIORITY_LABELS.medium, icon: ChevronUp, color: 'text-slate-300 bg-slate-500/15' },
  low: { label: PRIORITY_LABELS.low, icon: ChevronDown, color: 'text-slate-500 bg-slate-700/30' },
};

export default function AdminCarsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixReport, setFixReport] = useState<CarFixReport | null>(null);

  useEffect(() => {
    const unsub = subscribeToCars(
      (c) => {
        setCars(c);
        setLoading(false);
      },
      { onError: () => setLoading(false) }
    );
    return () => unsub();
  }, []);

  const handleFixCars = async () => {
    if (!confirm(
      'سيتم فحص كل العربيات وإصلاح:\n' +
        '• assigned_to فاضي/ناقص → يتحوّل لـ [\'all\']\n' +
        '• usernames قديمة في assigned_to → تتحوّل لـ UIDs\n' +
        '• status ناقص → يتحوّل لـ \'active\'\n' +
        "• 'sold' و 'reserved' و 'inactive' ما هيتغيروش (متعمد من الأدمن)\n\n" +
        'متأكد؟'
    )) return;
    setFixing(true);
    try {
      const report = await fixAllCarsAssignment();
      setFixReport(report);
      if (report.fixedCount > 0) {
        showToast(`تم إصلاح ${report.fixedCount} عربية`, 'success');
      } else {
        showToast('كل العربيات سليمة بالفعل', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'فشل الفحص', 'error');
    } finally {
      setFixing(false);
    }
  };

  // فلترة + بحث
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
          c.code.toLowerCase().includes(s) ||
          c.description.toLowerCase().includes(s)
      );
    }
    return list;
  }, [cars, priorityFilter, search]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`هل تريد حذف "${title}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) return;
    setDeletingId(id);
    try {
      await deleteCar(id);
      showToast('تم حذف العربية بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل الحذف', 'error');
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
          {/* زر إصلاح العربيات — one-time fix للعربيات اللي assigned_to فاضي أو ناقص */}
          <button
            onClick={handleFixCars}
            disabled={fixing}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-card font-medium text-sm transition-colors disabled:opacity-50"
            title="فحص وإصلاح العربيات القديمة اللي assigned_to فاضي أو ناقص"
          >
            <Wrench size={16} />
            <span className="hidden md:inline">{fixing ? 'جاري الفحص...' : 'إصلاح'}</span>
          </button>
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
            placeholder="ابحث بالعنوان أو الكود..."
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

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="bg-admin-card border border-admin-border rounded-2xl overflow-hidden">
          <ul className="divide-y divide-admin-border">
            {filtered.map((c) => {
              const meta = PRIORITY_META[c.priority] || PRIORITY_META.medium;
              const Icon = meta.icon;
              return (
                <li key={c.id} className="p-3 hover:bg-admin-bg transition-colors">
                  <div className="flex items-start gap-3">
                    {/* صورة */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-admin-bg overflow-hidden flex-shrink-0 striped-bg">
                      {c.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
                      )}
                    </div>

                    {/* معلومات */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5 mb-1">
                        <h3 className="text-sm sm:text-base font-bold text-admin-text truncate flex-1">
                          {c.title}
                        </h3>
                        {c.is_featured && <Star size={14} className="text-admin-accent flex-shrink-0" fill="currentColor" />}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-admin-text-muted mb-2">
                        <span className="badge-number bg-admin-bg px-2 py-0.5 rounded">
                          {c.code}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${meta.color}`}>
                          <Icon size={10} />
                          {meta.label}
                        </span>
                        {c.status !== 'active' && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">
                            {c.status === 'reserved' ? 'محجوزة' : c.status === 'sold' ? 'مباعة' : 'غير معروضة'}
                          </span>
                        )}
                      </div>

                      <div className="badge-number text-base sm:text-lg font-bold text-admin-accent">
                        {formatPrice(c.price)} <span className="text-xs font-medium text-admin-text-muted">ج.م</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => c.id && router.push(`/admin/cars/${c.id}`)}
                        className="w-9 h-9 rounded-lg bg-admin-bg hover:bg-admin-border flex items-center justify-center transition-colors"
                        aria-label="تعديل"
                      >
                        <Edit3 size={16} className="text-admin-text-muted" />
                      </button>
                      <button
                        onClick={() => c.id && handleDelete(c.id, c.title)}
                        disabled={deletingId === c.id}
                        className="w-9 h-9 rounded-lg bg-admin-bg hover:bg-red-500/15 flex items-center justify-center transition-colors disabled:opacity-50"
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
      )}

      {/* Modal: نتيجة فحص وإصلاح العربيات */}
      {fixReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setFixReport(null)}
        >
          <div
            className="bg-admin-card border border-admin-border rounded-2xl w-full max-w-2xl p-5 modal-in max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-admin-text">نتيجة فحص العربيات</h3>
                <p className="text-xs text-admin-text-muted mt-1">
                  {fixReport.fixedCount > 0
                    ? `تم إصلاح ${fixReport.fixedCount} من ${fixReport.totalCars} عربية`
                    : `كل العربيات سليمة (${fixReport.totalCars})`}
                </p>
              </div>
              <button
                onClick={() => setFixReport(null)}
                className="w-8 h-8 rounded-lg bg-admin-bg hover:bg-admin-border flex items-center justify-center text-admin-text-muted"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1">
              {fixReport.cars.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-xl border ${
                    c.changed
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-admin-bg border-admin-border'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {c.changed ? (
                      <CheckCircle2 size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-admin-text truncate">{c.title}</div>
                      <div className="text-xs text-admin-text-muted mt-1 space-y-0.5">
                        <div>
                          <span className="font-bold">assigned_to:</span>{' '}
                          <span className="font-mono">{JSON.stringify(c.assignedToBefore)}</span>
                          {c.changed && (
                            <>
                              {' → '}
                              <span className="font-mono text-amber-400">
                                {JSON.stringify(c.assignedToAfter)}
                              </span>
                            </>
                          )}
                        </div>
                        <div>
                          <span className="font-bold">status:</span> {c.statusBefore}
                          {c.changed && c.statusBefore !== c.statusAfter && (
                            <>
                              {' → '}
                              <span className="text-amber-400">{c.statusAfter}</span>
                            </>
                          )}
                        </div>
                        {c.reason && (
                          <div className="text-amber-400 mt-1">{c.reason}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
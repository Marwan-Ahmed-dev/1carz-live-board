'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, UserRound, Phone, FileText, ArrowRight, Car as CarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { addBuyerLead, countTodaysBuyerLeads } from '@/lib/buyers';
import { fetchCar } from '@/lib/cars';
import { DEFAULT_DAILY_BUYER_LIMIT } from '@/lib/types';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/hooks/useToast';
import { toEnglishDigits } from '@/lib/format';

/**
 * تسجيل مشتري / معاينة — فقط من صفحة عربية (?carId=...).
 */
export default function NewBuyerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const carId = (searchParams.get('carId') || '').trim();
  const { user, userData, isAdmin, isInspector, isSource, loading: authLoading, needsOnboarding } =
    useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [carTitle, setCarTitle] = useState('');
  const [carLoading, setCarLoading] = useState(!!carId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedToday, setUsedToday] = useState(0);
  const [checkingLimit, setCheckingLimit] = useState(true);

  const isMarketer = !!user && !isAdmin && !isInspector && !isSource;
  const dailyLimit =
    typeof userData?.daily_buyer_limit === 'number' && userData.daily_buyer_limit > 0
      ? Math.floor(userData.daily_buyer_limit)
      : DEFAULT_DAILY_BUYER_LIMIT;
  const remaining = Math.max(0, dailyLimit - usedToday);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (needsOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (isSource) {
      router.replace('/market');
      return;
    }
    if (isAdmin || isInspector) {
      router.replace('/cars');
      return;
    }
    if (!carId) {
      showToast('سجّل المشتري من صفحة العربية', 'error');
      router.replace('/cars');
    }
  }, [user, authLoading, needsOnboarding, isAdmin, isInspector, isSource, carId, router, showToast]);

  useEffect(() => {
    if (!carId || !isMarketer) return;
    let cancelled = false;
    setCarLoading(true);
    fetchCar(carId)
      .then((c) => {
        if (cancelled) return;
        if (!c) {
          showToast('العربية غير موجودة', 'error');
          router.replace('/cars');
          return;
        }
        setCarTitle(c.title);
      })
      .catch(() => {
        if (!cancelled) {
          showToast('فشل تحميل العربية', 'error');
          router.replace('/cars');
        }
      })
      .finally(() => {
        if (!cancelled) setCarLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [carId, isMarketer, router, showToast]);

  useEffect(() => {
    if (!user || !isMarketer) return;
    let cancelled = false;
    setCheckingLimit(true);
    countTodaysBuyerLeads(user.uid)
      .then((n) => {
        if (!cancelled) setUsedToday(n);
      })
      .catch(() => {
        if (!cancelled) setUsedToday(0);
      })
      .finally(() => {
        if (!cancelled) setCheckingLimit(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, isMarketer]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || remaining <= 0 || !carId || !carTitle) return;
    setError(null);
    setSubmitting(true);
    try {
      const description = [
        `معاينة / اهتمام: ${carTitle}`,
        notes.trim() ? `ملاحظات: ${notes.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      await addBuyerLead({
        name,
        phone,
        description,
        marketerName: userData?.username || null,
        marketerPhone: userData?.phone || null,
        dailyLimit,
        carId,
        carTitle,
      });

      if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', { content_name: carTitle, content_ids: [carId] });
      }

      showToast('تم تسجيل المشتري / المعاينة', 'success');
      router.push(`/car/${carId}`);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'فشل التسجيل');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user || needsOnboarding || !isMarketer || !carId || carLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState variant="page" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-4 space-y-4">
        <button
          type="button"
          onClick={() => router.push(`/car/${carId}`)}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowRight size={16} />
          رجوع للعربية
        </button>

        <div>
          <h1 className="text-xl font-bold text-text-primary">تسجيل مشتري / معاينة</h1>
          <p className="text-sm text-text-muted mt-1">
            {checkingLimit
              ? 'جاري حساب الحد اليومي…'
              : `متبقي النهاردة: ${remaining} من ${dailyLimit}`}
          </p>
        </div>

        <div className="rounded-2xl border border-border-soft bg-bg-card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-yellow/20 flex items-center justify-center flex-shrink-0">
            <CarIcon size={18} className="text-text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-text-muted mb-0.5">العربية</div>
            <div className="text-sm font-bold text-text-primary">{carTitle}</div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-bg-card border border-border-soft rounded-2xl p-4 sm:p-5 space-y-4 shadow-soft"
        >
          <div>
            <label htmlFor="buyer-name" className="block text-sm font-medium text-text-secondary mb-1.5">
              اسم المشتري
            </label>
            <div className="relative">
              <UserRound
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                id="buyer-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم"
                className="w-full pr-10 pl-3 py-3 rounded-xl bg-white border border-border-medium text-text-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="buyer-phone" className="block text-sm font-medium text-text-secondary mb-1.5">
              رقم المشتري (11 رقم)
            </label>
            <div className="relative">
              <Phone
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                id="buyer-phone"
                type="tel"
                required
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(toEnglishDigits(e.target.value))}
                placeholder="01xxxxxxxxx"
                maxLength={15}
                dir="ltr"
                className="w-full pr-10 pl-3 py-3 rounded-xl bg-white border border-border-medium text-text-primary"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="buyer-notes"
              className="block text-sm font-medium text-text-secondary mb-1.5"
            >
              ملاحظات المعاينة (اختياري)
            </label>
            <div className="relative">
              <FileText size={18} className="absolute right-3 top-3 text-text-muted pointer-events-none" />
              <textarea
                id="buyer-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="موعد مقترح، ميزانية، ملاحظات…"
                rows={3}
                className="w-full pr-10 pl-3 py-3 rounded-xl bg-white border border-border-medium text-text-primary resize-y"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || checkingLimit || remaining <= 0 || !carTitle}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary font-bold disabled:opacity-50"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {remaining <= 0 ? 'وصلت للحد اليومي' : 'حفظ المشتري / المعاينة'}
          </button>
        </form>
      </main>
    </div>
  );
}

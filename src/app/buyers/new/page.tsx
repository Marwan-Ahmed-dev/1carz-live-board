'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserRound, Phone, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { addBuyerLead, countTodaysBuyerLeads } from '@/lib/buyers';
import { DEFAULT_DAILY_BUYER_LIMIT } from '@/lib/types';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/hooks/useToast';

export default function NewBuyerPage() {
  const router = useRouter();
  const { user, userData, isAdmin, isInspector, loading: authLoading, needsOnboarding } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedToday, setUsedToday] = useState(0);
  const [checkingLimit, setCheckingLimit] = useState(true);

  const isMarketer = !!user && !isAdmin && !isInspector;
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
    if (isAdmin || isInspector) {
      router.replace('/cars');
    }
  }, [user, authLoading, needsOnboarding, isAdmin, isInspector, router]);

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
    if (submitting || remaining <= 0) return;
    setError(null);
    setSubmitting(true);
    try {
      await addBuyerLead({
        name,
        phone,
        description,
        marketerName: userData?.username || null,
        marketerPhone: userData?.phone || null,
        dailyLimit,
      });
      showToast('تم تسجيل المشتري', 'success');
      setName('');
      setPhone('');
      setDescription('');
      setUsedToday((n) => n + 1);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'فشل التسجيل');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user || needsOnboarding || !isMarketer) {
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
          onClick={() => router.push('/cars')}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowRight size={16} />
          رجوع
        </button>

        <div>
          <h1 className="text-xl font-bold text-text-primary">تسجيل مشتري</h1>
          <p className="text-sm text-text-muted mt-1">
            {checkingLimit
              ? 'جاري حساب الحد اليومي…'
              : `متبقي النهاردة: ${remaining} من ${dailyLimit}`}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-bg-card border border-border-soft rounded-2xl p-4 sm:p-5 space-y-4 shadow-soft"
        >
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">اسم المشتري</label>
            <div className="relative">
              <UserRound
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
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
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              رقم المشتري (11 رقم)
            </label>
            <div className="relative">
              <Phone
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                type="tel"
                required
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                maxLength={15}
                dir="ltr"
                className="w-full pr-10 pl-3 py-3 rounded-xl bg-white border border-border-medium text-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">الوصف</label>
            <div className="relative">
              <FileText size={18} className="absolute right-3 top-3 text-text-muted pointer-events-none" />
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ملاحظات عن المشتري أو العربية المطلوبة"
                rows={4}
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
            disabled={submitting || checkingLimit || remaining <= 0}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary font-bold disabled:opacity-50"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {remaining <= 0 ? 'وصلت للحد اليومي' : 'حفظ المشتري'}
          </button>
        </form>
      </main>
    </div>
  );
}

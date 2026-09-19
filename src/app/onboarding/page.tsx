'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { saveUsername } from '@/lib/auth';
import { checkUsernameAvailable, validateUsername } from '@/lib/users';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, userData, loading, needsOnboarding } = useAuth();

  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect لو مش في onboarding state
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (userData && userData.username !== null && !needsOnboarding) {
      router.replace('/cars');
    }
  }, [user, userData, loading, needsOnboarding, router]);

  // ✅ H6: استخدم validateUsername من users.ts بدل regex داخلي
  // (يبقى فيه مصدر واحد للتحقق، متطابق مع صفحة الأدمن + signUp)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = username.trim();

    const validationErr = validateUsername(trimmed);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setSubmitting(true);
    try {
      // تحقق من الـ uniqueness
      const available = await checkUsernameAvailable(trimmed);
      if (!available) {
        setError('اسم المستخدم مستخدم بالفعل، جرب اسماً آخر');
        setSubmitting(false);
        return;
      }
      // حفظ في Firestore
      await saveUsername(user!.uid, trimmed);
      setSuccess(true);
      // انتظار قصير ثم التوجيه — اختصار الشاشة يظهر بعد الدخول على الجهاز
      setTimeout(() => {
        router.replace('/cars');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-yellow mb-3">
            <User size={32} className="text-text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1.5">
            مرحباً في 1CARZ
          </h1>
          <p className="text-text-secondary text-sm">
            اختر اسمك عشان نقدر نتعرف عليك
          </p>
        </div>

        <div className="bg-bg-card rounded-2xl p-6 sm:p-8 shadow-medium border border-border-soft">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1.5">
                اسم المستخدم
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: أحمد محمود 12345 أو Ahmed Mostafa 12345"
                  maxLength={20}
                  className="w-full pr-10 pl-3 py-3 rounded-xl bg-white border border-border-medium text-text-primary placeholder:text-text-muted focus:border-accent-yellow focus:ring-2 focus:ring-accent-yellow/20 transition"
                  disabled={submitting || success}
                  autoFocus
                />
              </div>
              <p className="text-xs text-text-muted mt-1.5">
                3-20 حرف، حروف عربية أو إنجليزية وأرقام ومسافات
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
                <CheckCircle2 size={18} />
                <span>تم حفظ اسمك بنجاح! جاري التحويل...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || success || username.trim().length === 0}
              className="w-full py-3 min-h-[44px] rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary font-bold text-base shadow-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  جاري الحفظ...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={20} />
                  تم بنجاح
                </>
              ) : (
                'إكمال'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}